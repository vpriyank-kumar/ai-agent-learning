✓ Local LLM
✓ Ollama
✓ Node.js → LLM communication
✓ Prompt/message
✓ User role
✓ Assistant role
✓ Conversation history
✓ Context

┌───────────────────────┐
│        AGENT          │
│                       │
│  User Goal            │
│      ↓                │
│     LLM               │
│      ↓                │
│  Decide next action   │
│      ↓                │
│   ┌───────┴───────┐   │
│   │               │   │
│ Tool            Answer│
│   │               │   │
│   ▼               │   │
│ Execute           │   │
│   │               │   │
│   ▼               │   │
│ Result ───────────┘   │
│      ↓                │
│     LLM again         │
└───────────────────────┘

                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                            ▼
                     ┌────────────┐
                     │    LLM     │
                     │ llama 3.2  │
                     └──────┬─────┘
                            │
                     Decides a tool
                            │
                            ▼
                    ┌──────────────┐
                    │ Agent Loop   │
                    └──────┬───────┘
                           │
                    Executes Tool
                           │
                           ▼
                    ┌──────────────┐
                    │ Tool Result  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Agent State  │
                    │              │
                    │ What is done?│
                    │ What remains?│
                    └──────┬───────┘
                           │
                  More work required?
                      │          │
                     Yes         No
                      │          │
                      ▼          ▼
                 More tools   Final answer
				 
AI Agent
    │
    │ MCP
    ▼
Ticket MCP Server
    │
    ▼
Jira API
    │
    ▼
Atlassian Jira
---------------------------------------------------------------------------
After you create and run mcp-server.js, we will build an MCP Client.

The client will:

1. Start the MCP server
2. Connect using stdio
3. Ask for available tools
4. Call search_tickets
5. Print the result

Conceptually:

mcp-client.js
      │
      │ spawns
      ▼
mcp-server.js
      │
      │ MCP protocol
      ▼
listTools()
      │
      ▼
callTool()

Before MCP:

AI Agent
   │
   ├── Knows all tool definitions
   ├── Contains tool execution logic
   └── Directly calls ticket functions

With MCP:

AI Agent
   │
   ▼
MCP Client
   │
   │ "What tools are available?"
   ▼
MCP Server
   │
   ├── get_ticket
   ├── search_tickets
   └── get_ticket_comments
   
----------------------------------
Final flow

                         User
                          │
                          ▼
                   ┌──────────────┐
                   │   AI Agent   │
                   │   index.js   │
                   └──────┬───────┘
                          │
                   discovers tools
                          │
                          ▼
                    MCP Client
                          │
                          │ MCP
                          ▼
                    MCP Server
                          │
                          ▼
                     tickets.js
                     
---------------------------------------
MCP Server
    │
    │ exposes capabilities
    ▼
MCP Client
    │
    │ discovers capabilities
    ▼
AI Agent 
--------------------------------------
User
  │
  ▼
index.js
AI Agent
  │
  ▼
Ollama LLM
  │
  │ decides which tool to use
  ▼
MCP Client
  │
  │ callTool()
  ▼
MCP Server
  │
  ▼
tickets.js

---------------------------------------
Phase 4: Atlassian MCP (OAuth)

Local MCP vs Remote MCP
- Local MCP: spawn mcp-server.js via stdio
- Remote MCP: connect to https://mcp.atlassian.com/v2/mcp via HTTP
- mcp-remote proxy: bridges stdio client + OAuth browser login

OAuth flow (via mcp-remote)
1. Client starts mcp-remote
2. Browser opens for Atlassian login
3. User approves access
4. Tokens cached locally
5. MCP client connects and discovers tools

Files
- atlassian-mcp-client.js  (standalone learning client)
- npm run atlassian:mcp

Atlassian tools (examples, discovered dynamically)
- getVisibleJiraProjects
- getJiraIssue
- searchJiraIssuesUsingJql
- addCommentToJiraIssue

Next
- Run atlassian-mcp-client.js and verify OAuth + tool discovery
- Integrate Atlassian MCP into index.js