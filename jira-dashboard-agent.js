import dotenv from "dotenv";
import OpenAI from "openai";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import {
  connectAtlassianMcpClient,
  callAtlassianTool,
} from "./atlassian-mcp-connect.js";
import {
  fetchOpenIssuesSnapshot,
  getOpenIssuesJql,
  isOpenIssuesDashboardQuestion,
} from "./jira-dashboard-context.js";
import { getGroqApiKey } from "./groq-env.js";

dotenv.config();

const MODEL = "openai/gpt-oss-120b";
const MAX_AGENT_ITERATIONS = 8;

const JIRA_TOOL_NAMES = new Set([
  "searchJiraIssuesUsingJql",
  "getJiraIssue",
  "atlassianUserInfo",
  "executeRead",
  "discover",
]);

const groqApiKey = getGroqApiKey();

const groqClient = new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

const rl = readline.createInterface({ input, output });

function buildSystemPrompt() {
  const dashboardName =
    process.env.JIRA_DASHBOARD_NAME?.trim() ||
    "R&D team - Customer reported Open Issues";
  const dashboardUrl =
    process.env.JIRA_DASHBOARD_URL?.trim() ||
    "https://structuredweb.atlassian.net/jira/dashboards/10120";

  return `
You are a Jira assistant for the StructuredWeb R&D team.

Primary dashboard (human bookmark):
- Name: ${dashboardName}
- URL: ${dashboardUrl}

Default JQL for "open P0/P1 customer-reported style issues" (unless snapshot data is already provided):
${getOpenIssuesJql()}

Your job:
1. Answer questions about OPEN issues (especially P0 and P1) with a SHORT executive summary.
2. When the user asks about comments, highlight the latest comment on each issue and call out items assigned to them or that mention them.
3. Use only real data from tools or from the pre-fetched snapshot JSON in the conversation.
4. Never invent issue keys, priorities, or comments.

Tool tips:
- searchJiraIssuesUsingJql: list issues; pass cloudId as ATLASSIAN_SITE_URL value.
- getJiraIssue: use view "evidence" for Last Comment / Last Commenter fields when comments matter.
- atlassianUserInfo: current user's accountId (for "for me" questions).
- executeRead + discover: only when you need an operation not in the primary tool list.

Output format for daily stand-up style questions:
- 2–3 sentence overview (counts by P0 vs P1 if visible).
- Bullet list: KEY | priority | status | assignee | one-line last-comment note.
- End with "Needs your attention" bullets only when assignee is the current user or last comment likely targets them.

Keep the whole answer under ~400 words unless the user asks for detail.
`.trim();
}

function convertMcpToolsToLlmTools(mcpTools) {
  return mcpTools
    .filter((tool) => JIRA_TOOL_NAMES.has(tool.name))
    .map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
}

function parseToolArguments(toolArguments) {
  if (typeof toolArguments === "string") {
    return JSON.parse(toolArguments);
  }
  return toolArguments;
}

async function executeMcpTool(mcpClient, toolName, toolArguments) {
  try {
    const result = await callAtlassianTool(
      mcpClient,
      toolName,
      toolArguments
    );
    return result;
  } catch (error) {
    return { error: `MCP tool execution failed: ${error.message}` };
  }
}

async function runAgent(mcpClient, llmTools, messages) {
  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    console.log(`\n--- Agent iteration ${iteration + 1} ---`);

    const response = await groqClient.chat.completions.create({
      model: MODEL,
      messages,
      tools: llmTools,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArguments = parseToolArguments(toolCall.function.arguments);

      console.log("\nTool requested:", toolName);
      console.log("Tool arguments:", toolArguments);

      const toolResult = await executeMcpTool(
        mcpClient,
        toolName,
        toolArguments
      );

      console.log(
        "\nTool result (truncated):",
        JSON.stringify(toolResult).slice(0, 1200)
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return "I could not finish within the allowed agent steps. Try a narrower question.";
}

async function main() {
  if (!groqApiKey || !groqApiKey.startsWith("gsk_")) {
    console.error(
      "Invalid GROQ_API_KEY in .env. Use: GROQ_API_KEY=gsk_... (no quotes, no comma at end)."
    );
    console.error(
      "Create or rotate a key at https://console.groq.com/keys"
    );
    process.exit(1);
  }

  if (!process.env.ATLASSIAN_SITE_URL?.trim()) {
    console.error("Missing ATLASSIAN_SITE_URL in .env");
    process.exit(1);
  }

  console.log("Jira Dashboard AI (Groq + Atlassian MCP)");
  console.log("Model:", MODEL);
  console.log("\nConnecting to Atlassian MCP (cached OAuth)...\n");

  const mcpClient = await connectAtlassianMcpClient(
    "jira-dashboard-agent"
  );

  const toolsResult = await mcpClient.listTools();
  const llmTools = convertMcpToolsToLlmTools(toolsResult.tools);

  console.log("Jira tools exposed to the LLM:");
  for (const tool of llmTools) {
    console.log(`  - ${tool.function.name}`);
  }

  console.log(
    "\nAsk about open P0/P1 issues, last comments, or your dashboard."
  );
  console.log("Type 'exit' to quit.\n");

  const messages = [{ role: "system", content: buildSystemPrompt() }];

  while (true) {
    const userMessage = await rl.question("You: ");

    if (userMessage.trim().toLowerCase() === "exit") {
      break;
    }

    if (!userMessage.trim()) {
      continue;
    }

    messages.push({ role: "user", content: userMessage });

    if (isOpenIssuesDashboardQuestion(userMessage)) {
      console.log(
        "\nPrefetching open issues from Jira (same data your dashboard gadgets use via JQL)..."
      );
      const snapshot = await fetchOpenIssuesSnapshot(mcpClient);
      messages.push({
        role: "user",
        content:
          "Pre-fetched Jira snapshot (use this as source of truth for your answer):\n" +
          JSON.stringify(snapshot, null, 2),
      });
    }

    const answer = await runAgent(mcpClient, llmTools, messages);
    console.log("\nAI:", answer, "\n");
  }

  await mcpClient.close();
  rl.close();
  console.log("Chat ended.");
}

main().catch((error) => {
  console.error("Application error:", error);
  process.exit(1);
});
