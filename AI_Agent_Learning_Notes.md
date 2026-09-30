# AI Agent Learning Notes

## 1. Concepts Learned

### 1.1 AI Agent
**What I learned**
- An AI agent is more than just an LLM responding with text.
- An agent can understand a user request, decide whether it needs a tool, call a tool, read the result, take another action if needed, and generate a final answer.

**Why it is important**
- Real-world AI applications often need to interact with external systems instead of relying only on LLM knowledge.

**What I implemented or practiced**
- **Implemented:** A basic Ticket Support AI Agent.

---

### 1.2 LLM
**What I learned**
- The LLM understands user requests and decides which tool to use.
- The LLM can generate a final response after receiving tool results.
- The LLM should not be trusted blindly for facts that can be retrieved from tools.

**Why it is important**
- The LLM provides the reasoning and language understanding layer of the agent.

**What I implemented or practiced**
- **Implemented:** Used a local LLM through Ollama.

---

### 1.3 Local LLM with Ollama
**What I learned**
- AI agent projects can be built locally without an OpenAI API key.
- Ollama can run models locally and provide an API for applications.
- I used `llama3.2:3b`.

**Why it is important**
- Allows learning AI agents without API costs.
- Useful for experimentation and understanding agent architecture.

**What I implemented or practiced**
- **Implemented:** Installed and ran Ollama locally.
- **Implemented:** Connected the Node.js application to Ollama.

---

### 1.4 Tool Calling
**What I learned**
- Tools allow an LLM to request actions or retrieve external information.
- The LLM does not directly execute JavaScript functions.
- The application receives the requested tool call and executes it.

**Flow**
```text
User
 ↓
LLM
 ↓
Tool request
 ↓
Application executes tool
 ↓
Tool result
 ↓
LLM
 ↓
Final answer
```

**Why it is important**
- Tools connect an AI agent to real systems and data.

**What I implemented or practiced**
- **Implemented:** `get_ticket`
- **Implemented:** `search_tickets`
- **Implemented:** `get_ticket_comments`

---

### 1.5 Agent Loop
**What I learned**
- An agent may need multiple iterations to complete a request.
- The application repeatedly sends messages to the LLM, checks for tool requests, executes tools, sends results back, and allows the LLM to continue.

**Why it is important**
- Multi-step requests cannot always be completed in one LLM response.

**What I implemented or practiced**
- **Implemented:** An agent loop with multiple iterations.
- Used `MAX_ITERATIONS = 5`.

---

### 1.6 Multi-Step Agent Workflow
**What I learned**
- Some requests require multiple tools.

**Example**
```text
Find tickets related to email
and show their comments.

search_tickets
      ↓
Get ticket IDs
      ↓
get_ticket_comments
      ↓
Final answer
```

**Why it is important**
- Real AI agents often need multiple steps and multiple data sources.

**What I implemented or practiced**
- **Implemented:** Search for tickets first and retrieve comments afterward.

---

### 1.7 Agent State
**What I learned**
- The application can maintain structured state separately from the LLM.

**Example**
```javascript
{
  requiresComments: true,
  foundTicketIds: [],
  commentsFetchedFor: []
}
```

**Why it is important**
- Structured application state makes workflows more reliable.
- The application does not have to depend entirely on the LLM remembering what happened.

**What I implemented or practiced**
- **Implemented:** Tracking whether comments are required, ticket IDs found, and comments fetched.

---

### 1.8 LLM Hallucination
**What I learned**
- The LLM can invent information even when instructed not to.
- The model previously generated fictional ticket comments even though comments were not returned by the tool.

**Why it is important**
- Tool instructions alone do not guarantee reliable behavior.
- Important workflows need application-level validation.

**What I implemented or practiced**
- **Implemented:** Application logic that prevents final answers before required comments are fetched.

---

### 1.9 Deterministic Application Control
**What I learned**
- LLM intelligence should be combined with deterministic program logic.

**Pattern**
```text
LLM intelligence
+
Deterministic application control
=
More reliable AI Agent
```

**Example**
```text
User requested comments?
        ↓
Yes
        ↓
Were ticket IDs found?
        ↓
Yes
        ↓
Were comments fetched?
        ↓
No
        ↓
Application forces get_ticket_comments
```

**Why it is important**
- Prevents the LLM from answering before required information is available.

**What I implemented or practiced**
- **Implemented:** Forced comment retrieval when required.

---

## 2. Model Context Protocol (MCP)

### 2.1 What MCP Is
**What I learned**
- MCP provides a standardized way for AI applications to connect to tools and external systems.
- MCP separates the AI agent from the underlying tool implementation.

**Why it is important**
- The agent does not need to directly know how Jira, a database, or another system works.
- The same agent can potentially connect to different MCP servers.

**What I implemented or practiced**
- **Implemented:** A basic Ticket MCP Server.

---

### 2.2 MCP Server
**What I learned**
- An MCP server exposes capabilities as tools.

**My MCP server exposes**
```text
get_ticket
search_tickets
get_ticket_comments
```

**Why it is important**
- Separates business logic and external systems from the AI agent.

**What I implemented or practiced**
- **Implemented:** `mcp-server.js`
- Successfully ran:
```bash
npm run mcp
```

---

### 2.3 MCP Client
**What I learned**
- The MCP client connects to an MCP server.
- It can connect to the server, discover tools, call tools, and receive results.

**Why it is important**
- This is how an AI agent communicates with MCP servers.

**What I implemented or practiced**
- **Implemented:** `mcp-client.js`
- Used:
```javascript
client.connect(transport)
client.listTools()
client.callTool()
```

---

### 2.4 MCP Tool Discovery
**What I learned**
- The client can dynamically ask the server what tools it provides.

**Example**
```javascript
const toolsResult = await client.listTools();
```

**Why it is important**
- Tools do not have to be manually hardcoded into the AI agent.

**What I implemented or practiced**
- **Implemented:** Dynamic discovery of:
  - `get_ticket`
  - `search_tickets`
  - `get_ticket_comments`

---

### 2.5 MCP Tool Execution
**What I learned**
- Tool execution can happen through:
```javascript
mcpClient.callTool()
```
instead of directly calling local JavaScript functions.

**Why it is important**
- The agent becomes independent of the underlying implementation.

**What I implemented or practiced**
- **Implemented:** Ticket tool execution through the MCP client.

---

## 3. Tool Adapter

### MCP Tool Format to Ollama Tool Format
**What I learned**
- MCP and Ollama use different tool definition formats.
- An adapter converts MCP tool definitions into Ollama-compatible tool definitions.

**Flow**
```text
MCP Tool Definition
        ↓
Tool Adapter
        ↓
Ollama Tool Definition
        ↓
LLM
```

**Why it is important**
- Different AI systems and protocols may use different formats.
- Adapters allow components to work together.

**What I implemented or practiced**
- **Implemented:** `convertMcpToolsToOllamaTools(mcpTools)`

---

# Technologies and Tools Used

## Implemented
- JavaScript
- Node.js
- Cursor IDE
- Ollama
- `llama3.2:3b`
- Ollama JavaScript package
- Tool calling
- MCP
- MCP Client
- MCP Server
- `stdio` transport
- `@modelcontextprotocol/client`

---

# Implementation Completed

## `index.js`
**Implemented responsibilities**
- Runs the AI agent.
- Connects to Ollama.
- Connects to the MCP server.
- Discovers MCP tools.
- Converts MCP tools to Ollama format.
- Maintains conversation history.
- Maintains agent state.
- Runs the multi-step agent loop.
- Executes tools through MCP.
- Validates whether comments are required.
- Prevents premature answers when required comments have not been fetched.

## `mcp-server.js`
**Implemented responsibilities**
- Runs as the Ticket MCP Server.
- Exposes ticket-related tools.
- Communicates through stdio.

**Exposed tools**
```text
get_ticket
search_tickets
get_ticket_comments
```

## `mcp-client.js`
**Implemented responsibilities**
- Starts/connects to the MCP server.
- Lists available tools.
- Calls MCP tools.
- Prints tool results.

## `tickets.js`
**Implemented responsibilities**
- Contains ticket-related data and business logic used by the MCP server.

---

# Current Project Architecture

```text
                User
                 │
                 ▼
             index.js
             AI Agent
                 │
                 ▼
            Ollama LLM
                 │
          Tool Request
                 │
                 ▼
             Agent Loop
                 │
                 ▼
             MCP Client
                 │
              stdio
                 │
                 ▼
             MCP Server
                 │
                 ▼
             tickets.js
```

## Important Achievement
`index.js` no longer needs to directly call ticket functions.

```text
LLM
 ↓
Tool Request
 ↓
executeMcpTool()
 ↓
mcpClient.callTool()
 ↓
MCP Server
 ↓
Ticket Logic
```

---

# Important Code and Technical Concepts

## Conversation History
The application maintains:
```text
System message
User message
Assistant message
Tool result
Assistant message
```

This allows the LLM to see previous tool results before generating the final response.

## Tool Result Feedback
```text
Tool
 ↓
Returns data
 ↓
Application adds result to messages
 ↓
LLM sees actual data
 ↓
LLM generates answer
```

## Agent Iterations
```text
Iteration 1
 ↓
LLM requests tool

Iteration 2
 ↓
LLM receives tool result

Iteration 3
 ↓
Additional tool if required

Final Answer
```

## Structured State vs Conversation

### Conversation
Used by the LLM:
```text
User message
Assistant message
Tool results
```

### Agent State
Used by the application:
```javascript
{
  requiresComments,
  foundTicketIds,
  commentsFetchedFor
}
```

This improves reliability.

## MCP Tool Discovery
```javascript
await mcpClient.listTools();
```

## MCP Tool Execution
```javascript
await mcpClient.callTool({
  name: toolName,
  arguments: toolArguments,
});
```

---

# Problems/Errors I Faced and What I Learned

## 1. Incorrect Tool Arguments from the LLM
**Problem**
- The LLM sometimes returned malformed tool arguments, including parts of the tool schema instead of actual values.

**What I learned**
- Small models can be unreliable with tool calling.
- Tool output should be validated.
- Prompt instructions alone may not guarantee correct structured output.

---

## 2. Search Variations Did Not Always Work
**Problem**
- Searching `email` worked, while `emails` did not find the ticket.

**What I learned**
- Basic search implementations may perform exact or simple matching.
- User language variations need better search logic.

**Status**
- Basic search: **Implemented**
- Better search behavior: **Learned but not implemented yet**

---

## 3. Open Ticket Query Failed
**Problem**
- Queries such as "Show me all Open tickets" did not initially work correctly.

**What I learned**
- The LLM may misunderstand ambiguous requests.
- Tool descriptions and schemas matter.
- Application-level validation may be required.

---

## 4. Hallucinated Comments
**Problem**
- The LLM generated comments even though the tool had not returned comments.

**What I learned**
- LLMs can invent plausible information.
- Strong prompts alone are not enough for reliable workflows.
- Important requirements should be enforced in application code.

**Solution Implemented**
```text
requiresComments
foundTicketIds
commentsFetchedFor
```

---

## 5. LLM Tried to Answer Before Calling Required Tool
**Problem**
- After finding a ticket, the LLM attempted to provide comments before calling `get_ticket_comments`.

**What I learned**
- The LLM may know what it should do but still skip steps.
- Agent workflows should validate completion criteria.

**Solution Implemented**
```text
Are comments required?
Have comments been fetched?
```

If not:
```text
Force MCP get_ticket_comments call
```

---

## 6. Small Model Limitations
**Problem**
- Smaller local models showed inconsistent behavior with multi-step tool calling and structured arguments.

**What I learned**
- Model size and capability affect agent reliability.
- Tool calling quality varies between models.

**Action Taken**
- **Implemented:** Moved to `llama3.2:3b`.

---

## 7. Initial MCP Integration Was Incomplete
**Problems Found**
- A stray `await mcpClient.callTool(...)`.
- Old `executeTool()` calls.
- Missing chat loop.
- Missing `ollamaTools` initialization.
- Missing MCP connection cleanup.

**What I learned**
- When migrating architecture incrementally, old and new code paths can accidentally remain together.
- Full end-to-end integration needs verification.

**Solution Implemented**
- Replaced local tool execution with `executeMcpTool()`.
- Uses `mcpClient.callTool()`.

---

# Current Project Progress

## Phase 1
**Implemented**
- Basic local AI setup.
- Ollama.
- Local LLM.
- Basic Node.js AI application.

## Phase 2
**Implemented**
- Tool calling.
- Ticket tools.
- Tool execution.
- Agent loop.
- Multi-step workflow.
- Agent state.
- Basic hallucination prevention.

## Phase 3
**Implemented**
- MCP Server.
- MCP Client.
- MCP tool discovery.
- MCP tool calling.
- Tool adapter from MCP format to Ollama format.
- AI Agent connected to MCP.
- Ticket tools executed through MCP.

---

# Successful Tests Completed

## Test 1: Specific Ticket
**User**
```text
What is the status of SW-123?
```

**Result**
```text
LLM
→ get_ticket
→ MCP
→ Ticket data
→ Final answer
```

**Status:** Implemented and working.

---

## Test 2: Search Tickets
**User**
```text
Find tickets related to email.
```

**Result**
```text
LLM
→ search_tickets
→ MCP
→ Ticket results
→ Final answer
```

**Status:** Implemented and working.

---

## Test 3: Multi-Step Workflow
**User**
```text
Find tickets related to email and show me their comments.
```

**Result**
```text
LLM
→ search_tickets
→ Ticket ID discovered
→ LLM attempted early answer
→ Agent validation detected missing comments
→ get_ticket_comments through MCP
→ Final answer using actual comments
```

**Status:** Implemented and working.

---

# Things Still Left to Learn or Implement

## 1. Multiple MCP Servers
**Learned but not implemented yet.**

Possible architecture:
```text
AI Agent
   │
   ├── Ticket MCP Server
   │
   ├── Documentation MCP Server
   │
   └── Other System MCP Servers
```

---

## 2. Real Jira Integration
**Learned/discussed conceptually but not implemented yet.**

Current:
```text
MCP Server
 ↓
tickets.js
```

Future:
```text
MCP Server
 ↓
Jira / Atlassian APIs
```

---

## 3. Atlassian MCP Integration
**Discussed but not implemented yet.**

The learning approach first focused on building a simple MCP server to understand:
- What an MCP server does.
- How tools are exposed.
- How clients discover tools.
- How an AI agent calls tools through MCP.

---

## 4. Better Search
**Learned from issues but not implemented yet.**

Future improvements:
- Case-insensitive search.
- Singular/plural handling.
- Status filtering.
- Priority filtering.
- Better natural-language search.

---

## 5. Tool Argument Validation
**Partially handled during development but not fully implemented as a general validation system.**

Future improvements:
- Validate tool arguments before calling MCP.
- Handle malformed LLM arguments.
- Add schema validation.
- Add better error messages.

---

## 6. More Reliable Agent Workflows
**Basic version implemented. More advanced version not implemented yet.**

Possible future concepts:
- Workflow planning.
- Retry logic.
- Tool error recovery.
- Dynamic workflow state.
- More complex multi-step tasks.

---

## 7. Real External Data Sources
**Not implemented yet.**

Current:
```text
tickets.js
```

Possible future sources:
- Jira
- Database
- REST APIs
- Documentation systems
- Slack
- Internal services

---

# Learning Progress Summary

## I Have Covered
```text
LLM
  ✅

Local AI with Ollama
  ✅

Tool Calling
  ✅

Agent Loop
  ✅

Multi-Step Tool Workflows
  ✅

Conversation History
  ✅

Agent State
  ✅

LLM Hallucination Handling
  ✅

Deterministic Workflow Control
  ✅

MCP Concepts
  ✅

MCP Server
  ✅

MCP Client
  ✅

MCP Tool Discovery
  ✅

MCP Tool Execution
  ✅

MCP Tool Adapter
  ✅

AI Agent + MCP Integration
  ✅
```

## Current Level
I have successfully built a basic working AI agent that:

```text
Understands user requests
        ↓
Uses a local LLM
        ↓
Selects tools
        ↓
Runs multi-step workflows
        ↓
Maintains agent state
        ↓
Validates required actions
        ↓
Communicates through MCP
        ↓
Receives real tool data
        ↓
Generates a final answer
```

## Current Stopping Point
```text
AI Agent
   +
Local LLM
   +
Tool Calling
   +
Agent Loop
   +
Agent State
   +
MCP Client
   +
MCP Server
   +
Dynamic Tool Discovery
   +
MCP Tool Execution
```

## Recommended Next Learning Step
**Phase 4: Multiple MCP Servers and multiple external capabilities.**

Example:
```text
                    AI Agent
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
         Ticket      Docs      Other
          MCP         MCP       MCP
```

After that, the next major step would be connecting one of these MCP servers to a **real system such as Jira/Atlassian**, rather than the current local `tickets.js` data.
