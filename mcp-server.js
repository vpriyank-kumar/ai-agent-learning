import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

import {
  getTicket,
  searchTickets,
  getTicketComments,
} from "./tickets.js";

function createServer() {
  const server = new McpServer({
    name: "ticket-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "get_ticket",
    {
      description:
        "Get complete information about a specific support ticket using its ticket ID.",

      inputSchema: z.object({
        ticketId: z
          .string()
          .describe("The ticket ID, for example SW-123"),
      }),
    },

    async ({ ticketId }) => {
      const result = getTicket(ticketId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "search_tickets",
    {
      description:
        "Search support tickets by topic, title, status, or priority.",

      inputSchema: z.object({
        searchText: z
          .string()
          .describe(
            "Text used to search tickets. Examples: email, Open, High, In Progress."
          ),
      }),
    },

    async ({ searchText }) => {
      const result = searchTickets(searchText);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_ticket_comments",
    {
      description:
        "Get all comments for a specific support ticket using its ticket ID.",

      inputSchema: z.object({
        ticketId: z
          .string()
          .describe("The ticket ID, for example SW-123"),
      }),
    },

    async ({ ticketId }) => {
      const result = getTicketComments(ticketId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

void serveStdio(createServer);

console.error("Ticket MCP Server running on stdio");