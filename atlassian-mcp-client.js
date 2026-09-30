import dotenv from "dotenv";
import {
  ATLASSIAN_MCP_URL,
  connectAtlassianMcpClient,
  callAtlassianTool,
} from "./atlassian-mcp-connect.js";

dotenv.config();

/**
 * Print tool result content blocks.
 */
function printToolResult(result) {
  for (const content of result.content ?? []) {
    if (content.type === "text") {
      console.log(content.text);
    }
  }
}

async function main() {
  console.log("Starting Atlassian MCP Client...\n");
  console.log("Endpoint:", ATLASSIAN_MCP_URL);
  console.log();

  if (process.env.ATLASSIAN_SITE_URL) {
    console.log("Site resource:", process.env.ATLASSIAN_SITE_URL);
    console.log();
  } else {
    console.log(
      "Tip: set ATLASSIAN_SITE_URL in .env (for example https://yourorg.atlassian.net)"
    );
    console.log("      if your organization has multiple Atlassian sites.");
    console.log();
  }

  console.log(
    "OAuth: on first run, your browser opens for Atlassian login and consent."
  );
  console.log("      Tokens are cached locally for later runs.\n");

  console.log("Connecting to Atlassian MCP Server...\n");

  const client = await connectAtlassianMcpClient(
    "atlassian-mcp-learning-client"
  );

  console.log("Connected to Atlassian MCP Server.\n");

  const toolsResult = await client.listTools();

  console.log("Discovered MCP Tools:\n");

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}`);
    console.log(`  ${tool.description}\n`);
  }

  const resourcesTool = toolsResult.tools.find(
    (tool) => tool.name === "getAccessibleAtlassianResources"
  );

  if (resourcesTool) {
    console.log("Calling getAccessibleAtlassianResources...\n");

    const payload = await callAtlassianTool(
      client,
      "getAccessibleAtlassianResources",
      {}
    );

    console.log("Tool Result (sites / cloud IDs you can use in other tools):\n");
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(
      "getAccessibleAtlassianResources is not in the primary tool list."
    );
    console.log(
      "Review the discovered tools above, or use discover / executeRead for more operations."
    );
  }

  await client.close();

  console.log("\nAtlassian MCP Client finished.");
}

main().catch((error) => {
  console.error("Atlassian MCP Client Error:", error);
  process.exit(1);
});
