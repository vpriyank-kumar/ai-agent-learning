import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

dotenv.config();

export const ATLASSIAN_MCP_URL = "https://mcp.atlassian.com/v2/mcp";

/**
 * Arguments for npx mcp-remote (OAuth + HTTP bridge to Atlassian MCP).
 */
export function buildMcpRemoteArgs() {
  const args = ["-y", "mcp-remote", ATLASSIAN_MCP_URL];
  const siteUrl = process.env.ATLASSIAN_SITE_URL?.trim();
  if (siteUrl) {
    args.push("--resource", siteUrl);
  }
  return args;
}

/**
 * Connect to Atlassian MCP through a local mcp-remote stdio proxy.
 */
export async function connectAtlassianMcpClient(clientName) {
  const transport = new StdioClientTransport({
    command: "npx",
    args: buildMcpRemoteArgs(),
  });

  const client = new Client({
    name: clientName,
    version: "1.0.0",
  });

  await client.connect(transport);
  return client;
}

/**
 * Parse JSON text returned by Atlassian MCP tools.
 */
export function parseMcpToolText(text) {
  try {
    const outer = JSON.parse(text);
    if (typeof outer === "string") {
      return JSON.parse(outer);
    }
    return outer;
  } catch {
    return { rawText: text };
  }
}

/**
 * Call an MCP tool and return a parsed JavaScript object.
 */
export async function callAtlassianTool(mcpClient, name, args) {
  const result = await mcpClient.callTool({ name, arguments: args });

  const text = (result.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  if (!text) {
    return { error: "MCP tool returned no text content." };
  }

  return parseMcpToolText(text);
}
