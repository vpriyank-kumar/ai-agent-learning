import dotenv from "dotenv";
import OpenAI from "openai";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { getGroqApiKey } from "./groq-env.js";

dotenv.config();

const groqApiKey = getGroqApiKey();

const groqClient = new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

const rl = readline.createInterface({
  input,
  output,
});

// llama-3.3-70b-versatile was deprecated Aug 2026; see Groq model docs.
const MODEL = "openai/gpt-oss-120b";

/**
 * Connect to the MCP Server.
 */
async function connectToMcpServer() {
  console.log("Connecting to MCP Server...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server.js"],
  });

  const client = new Client({
    name: "ticket-ai-agent",
    version: "1.0.0",
  });

  await client.connect(transport);

  console.log("Connected to MCP Server.\n");

  return client;
}

/**
 * Get all available tools from the MCP Server.
 */
async function getMcpTools(mcpClient) {
  const toolsResult = await mcpClient.listTools();

  return toolsResult.tools;
}

/**
 * Print discovered MCP tools.
 */
function printMcpTools(mcpTools) {
  console.log("Discovered MCP Tools:\n");

  for (const tool of mcpTools) {
    console.log(`- ${tool.name}`);
    console.log(`  ${tool.description}\n`);
  }
}

/**
 * Convert MCP tool definitions into OpenAI-compatible tool definitions.
 */
function convertMcpToolsToLlmTools(mcpTools) {
  return mcpTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * Execute a tool through the MCP Server.
 */
async function executeMcpTool(
  mcpClient,
  toolName,
  toolArguments
) {
  try {
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArguments,
    });

    // MCP tool results contain content blocks.
    const textContent = result.content.find(
      (content) => content.type === "text"
    );

    if (!textContent) {
      return {
        error: "MCP tool returned no text content.",
      };
    }

    try {
      // Our MCP server returns JSON as text,
      // so convert it back into a JavaScript object.
      return JSON.parse(textContent.text);
    } catch {
      // If a future MCP server returns plain text,
      // still return the result.
      return {
        result: textContent.text,
      };
    }
  } catch (error) {
    return {
      error: `MCP tool execution failed: ${error.message}`,
    };
  }
}

/**
 * Conversation history.
 */
const messages = [
  {
    role: "system",
    content: `
You are a Ticket Support AI Assistant.

You can access ticket information only through the provided tools.

Available tools:

1. get_ticket
Use when the user asks about a specific ticket ID.

2. search_tickets
Use when the user wants to find tickets by topic, title, status, or priority.

3. get_ticket_comments
Use when the user asks for comments on a specific ticket.

Rules:

- Only use information returned by tools when answering ticket-related questions.
- Never invent ticket information.
- Never invent comments.
- Never assume missing information.
- If information is not available from a tool, clearly say it is unavailable.
- You may need to use multiple tools before answering.
- If the user asks for comments, use get_ticket_comments to retrieve them.
- Do not claim that comments are unavailable unless get_ticket_comments has been called and returned no comments.

Example multi-step workflow:

User:
Find tickets related to email and show me their comments.

Step 1:
Call search_tickets with searchText = "email".

Step 2:
Read the returned ticket IDs.

Step 3:
Call get_ticket_comments for every relevant ticket ID.

Step 4:
Use only the actual ticket and comment information returned by the tools.

Never create fictional comments.
`,
  },
];

/**
 * Creates structured state for a single user request.
 */
function createAgentState(userMessage) {
  const normalizedMessage = userMessage.toLowerCase();

  return {
    requiresComments:
      normalizedMessage.includes("comment") ||
      normalizedMessage.includes("comments"),

    foundTicketIds: [],

    commentsFetchedFor: [],
  };
}

/**
 * Returns ticket IDs whose comments are still required
 * but have not been fetched yet.
 */
function getTicketsMissingComments(agentState) {
  if (!agentState.requiresComments) {
    return [];
  }

  return agentState.foundTicketIds.filter(
    (ticketId) =>
      !agentState.commentsFetchedFor.includes(ticketId)
  );
}

/**
 * Updates agent state after a tool has been executed.
 */
function updateAgentState(
  agentState,
  toolName,
  toolResult
) {
  if (
    toolName === "search_tickets" &&
    toolResult.tickets
  ) {
    agentState.foundTicketIds =
      toolResult.tickets.map(
        (ticket) => ticket.id
      );
  }

  if (
    toolName === "get_ticket_comments" &&
    toolResult.found
  ) {
    if (
      !agentState.commentsFetchedFor.includes(
        toolResult.ticketId
      )
    ) {
      agentState.commentsFetchedFor.push(
        toolResult.ticketId
      );
    }
  }
}

/**
 * Runs the AI agent loop.
 */
/**
 * Parse tool arguments returned by the LLM.
 */
function parseToolArguments(toolArguments) {
  if (typeof toolArguments === "string") {
    return JSON.parse(toolArguments);
  }

  return toolArguments;
}

async function runAgent(
  agentState,
  mcpClient,
  llmTools
) {
  const MAX_ITERATIONS = 5;

  for (
    let iteration = 0;
    iteration < MAX_ITERATIONS;
    iteration++
  ) {
    console.log(
      `\n--- Agent iteration ${iteration + 1} ---`
    );

    // Send the conversation and dynamically discovered
    // MCP tools to Groq.
    const response = await groqClient.chat.completions.create({
      model: MODEL,
      messages,
      tools: llmTools,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;

    // Helpful while learning and debugging.
    console.log("\nRaw assistant message:");

    console.log(
      JSON.stringify(
        assistantMessage,
        null,
        2
      )
    );

    // Store the assistant response in conversation history.
    messages.push(assistantMessage);

    /**
     * CASE 1:
     * The LLM did not request a tool.
     */
    if (!assistantMessage.tool_calls?.length) {
      const ticketsMissingComments =
        getTicketsMissingComments(agentState);

      /**
       * The LLM tried to answer before all
       * required comments were fetched.
       */
      if (ticketsMissingComments.length > 0) {
        console.log(
          "\nThe LLM tried to answer before all required comments were fetched."
        );

        for (const ticketId of ticketsMissingComments) {
          console.log(
            "\nAgent workflow: fetching required comments for:",
            ticketId
          );

          // Execute through MCP.
          const toolResult =
            await executeMcpTool(
              mcpClient,
              "get_ticket_comments",
              { ticketId }
            );

          console.log("\nTool result:");

          console.log(
            JSON.stringify(
              toolResult,
              null,
              2
            )
          );

          // Update agent state.
          updateAgentState(
            agentState,
            "get_ticket_comments",
            toolResult
          );

          // Groq requires tool results tied to a tool_call_id.
          // Inject fetched data as a user message when we force-fetch.
          messages.push({
            role: "user",
            content:
              `System fetched comments for ticket ${ticketId}. ` +
              `Tool result: ${JSON.stringify(toolResult)}. ` +
              `Use this data in your answer.`,
          });
        }

        // Continue the agent loop so the LLM
        // can see the comments and generate
        // the final answer.
        continue;
      }

      // All required work is complete.
      return assistantMessage.content;
    }

    /**
     * CASE 2:
     * The LLM requested one or more tools.
     */
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName =
        toolCall.function.name;

      const toolArguments = parseToolArguments(
        toolCall.function.arguments
      );

      console.log(
        "\nTool requested:",
        toolName
      );

      console.log(
        "Tool arguments:",
        toolArguments
      );

      // Execute the requested tool through MCP.
      const toolResult =
        await executeMcpTool(
          mcpClient,
          toolName,
          toolArguments
        );

      console.log("\nTool result:");

      console.log(
        JSON.stringify(
          toolResult,
          null,
          2
        )
      );

      // Update structured agent state.
      updateAgentState(
        agentState,
        toolName,
        toolResult
      );

      // Give the tool result back to the LLM.
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return "I was unable to complete the request within the allowed number of agent steps.";
}

/**
 * Main application.
 */
async function main() {
  if (!groqApiKey || !groqApiKey.startsWith("gsk_")) {
    console.error(
      "Invalid GROQ_API_KEY. Use GROQ_API_KEY=gsk_... in .env (no quotes or trailing comma)."
    );
    process.exit(1);
  }

  console.log("Ticket Support AI started!");
  console.log("Using Groq model:", MODEL);
  console.log();

  // Connect to MCP Server.
  const mcpClient =
    await connectToMcpServer();

  // Dynamically discover MCP tools.
  const mcpTools =
    await getMcpTools(mcpClient);

  // Print discovered tools.
  printMcpTools(mcpTools);

  // Convert MCP tools into OpenAI/Groq format.
  const llmTools =
    convertMcpToolsToLlmTools(mcpTools);

  console.log(
    "MCP tools converted for Groq.\n"
  );

  console.log(
    "Type 'exit' to quit.\n"
  );

  while (true) {
    const userMessage =
      await rl.question("You: ");

    // Exit application.
    if (
      userMessage.trim().toLowerCase() ===
      "exit"
    ) {
      break;
    }

    // Ignore empty messages.
    if (!userMessage.trim()) {
      continue;
    }

    // Add user message to conversation history.
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Create state for this request.
    const agentState =
      createAgentState(userMessage);

    console.log("\nAgent state:");

    console.log(
      JSON.stringify(
        agentState,
        null,
        2
      )
    );

    // Run the AI agent.
    const finalAnswer =
      await runAgent(
        agentState,
        mcpClient,
        llmTools
      );

    console.log(
      "\nAI:",
      finalAnswer,
      "\n"
    );
  }

  // Close MCP connection.
  await mcpClient.close();

  // Close readline.
  rl.close();

  console.log("Chat ended.");
}

/**
 * Start application.
 */
main().catch((error) => {
  console.error(
    "Application error:",
    error
  );

  process.exit(1);
});
