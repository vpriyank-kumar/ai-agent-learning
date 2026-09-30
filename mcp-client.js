import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function main() {
  console.log("Starting MCP Client...\n");

  // This tells the client how to start the MCP server.
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server.js"],
  });

  // Create the MCP client.
  const client = new Client({
    name: "ticket-mcp-client",
    version: "1.0.0",
  });

  // Connect to the MCP server.
  await client.connect(transport);

  console.log("Connected to MCP Server.\n");

  // Ask the MCP server which tools it provides.
  const toolsResult = await client.listTools();

  console.log("Available MCP Tools:");

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}`);
    console.log(`  ${tool.description}\n`);
  }

  // Call a tool through MCP.
  console.log("Calling search_tickets...\n");

  const result = await client.callTool({
    name: "search_tickets",
    arguments: {
      searchText: "email",
    },
  });

  console.log("Tool Result:");

  for (const content of result.content) {
    if (content.type === "text") {
      console.log(content.text);
    }
  }

  // Close the connection.
  await client.close();

  console.log("\nMCP Client finished.");
}

main().catch((error) => {
  console.error("MCP Client Error:", error);
  process.exit(1);
});