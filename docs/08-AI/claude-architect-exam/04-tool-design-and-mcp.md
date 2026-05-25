# Tool Design & MCP Integration (Domain 4 — 18%)

> **Before you start**: Do you know what happens when Claude misuses a tool? This domain is about designing tools so Claude uses them correctly every time — and connecting them via MCP for standardized integration.

---

## What Are Tools?

Tools extend what Claude can do beyond generating text. A tool is a function that Claude can call, with a defined schema for inputs and outputs.

**Analogy**: Tools are like the APIs you give to a junior developer. If the API docs are vague, they'll use the API wrong. If they're precise, they'll use it correctly every time. Claude is that junior developer at massive scale.

---

## Tool Description Best Practices

The single most important factor in tool use quality is **the description**. A poor description causes:
- Hallucinated arguments (Claude guesses values)
- Wrong tool selection (Claude picks similar but wrong tool)
- Incorrect parameter types
- Unexpected side effects (Claude didn't know the tool deletes data)

### The Anatomy of a Good Tool Description

```python
{
    "name": "search_customer_records",
    "description": """
    Search for customer records by email address or customer ID.

    Use this tool when you need to look up a specific customer's account information,
    order history, or contact details.

    IMPORTANT: This tool returns at most 1 result. If you need multiple customers,
    call this tool multiple times. Never use this to browse all customers — use
    list_customers instead.

    Returns: Customer object with fields: id, email, name, plan, created_at, orders[].
    Returns null if no customer found.
    """,
    "input_schema": {
        "type": "object",
        "properties": {
            "email": {
                "type": "string",
                "description": "Customer email address. Must be exact match, not partial."
            },
            "customer_id": {
                "type": "string",
                "description": "Customer ID in format CUST-XXXXX. Use this if you have it — faster than email lookup."
            }
        },
        "oneOf": [
            {"required": ["email"]},
            {"required": ["customer_id"]}
        ]
    }
}
```

### Key description elements:
1. **What it does** (1 sentence)
2. **When to use it** (vs similar tools)
3. **When NOT to use it** (prevents misuse)
4. **Side effects** (does it mutate data?)
5. **Return shape** (what does the response look like?)
6. **Constraints** (limits, formats, gotchas)

### ❌ vs ✅ Tool Descriptions

❌ Vague:
```
"name": "send_email",
"description": "Sends an email"
```

✅ Precise:
```
"name": "send_email",
"description": """
Send an email to a single recipient.

WARNING: This action is irreversible. Only call this tool after explicit user
confirmation. Do not call this tool to test if it works.

Rate limit: 10 emails per minute per organization.
The email will appear as sent from noreply@company.com.
Returns: {"message_id": "...", "sent_at": "ISO 8601 timestamp"}
"""
```

---

## Structured Error Responses

When tools fail, the error response quality determines whether Claude can self-correct.

### ❌ Bad error (Claude can't recover):
```json
{"error": "failed"}
```

### ✅ Good error (Claude can self-correct):
```json
{
  "success": false,
  "error_type": "validation_error",
  "error_message": "customer_id format invalid. Expected CUST-XXXXX, got 'cust123'.",
  "suggestion": "Try reformatting the customer_id as CUST-followed by 5 digits.",
  "retry_safe": true
}
```

**Key fields:**
- `error_type`: Machine-readable category
- `error_message`: Human-readable explanation Claude can act on
- `suggestion`: What to try next
- `retry_safe`: Boolean — is it safe to retry with adjusted parameters?

### Validation-Retry Loop Pattern

```python
def execute_with_validation(tool_call, max_retries=3):
    for attempt in range(max_retries):
        result = execute_tool(tool_call)

        if result.get("success"):
            return result

        if not result.get("retry_safe"):
            # Unrecoverable error — surface to user
            raise ToolError(result["error_message"])

        if attempt < max_retries - 1:
            # Feed structured error back to Claude for correction
            tool_call = claude.correct_tool_call(
                original_call=tool_call,
                error=result
            )

    raise MaxRetriesExceeded("Tool failed after 3 attempts")
```

---

## Model Context Protocol (MCP) Architecture

### What is MCP?

MCP (Model Context Protocol) is Anthropic's open standard for connecting AI models to tools, data sources, and services. It standardizes the interface between Claude and external systems.

**Without MCP**: Each tool integration is custom-built, hard to share, hard to maintain.
**With MCP**: Tools follow a standard protocol — build once, use anywhere.

### The Client-Server Architecture

```
Claude (MCP Client)
      ↕  MCP Protocol
MCP Server
      ↕
External Service (Database, API, File System)
```

- **MCP Client** (Claude): Discovers and calls tools
- **MCP Server**: Hosts tools, resources, and prompts
- **Transport**: stdio (local) or HTTP+SSE (remote)

---

## MCP Core Primitives

### 1. Tools
Functions Claude can call. Same as standard tool use, but exposed via MCP protocol.

```python
# MCP server exposes a tool
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict):
    if name == "query_database":
        result = await db.execute(arguments["sql"])
        return [TextContent(type="text", text=json.dumps(result))]
```

### 2. Resources
Read-only data sources Claude can access (files, database records, API responses).

```python
# MCP server exposes a resource
@server.list_resources()
async def handle_list_resources():
    return [
        Resource(
            uri="file:///data/config.json",
            name="Application Configuration",
            description="Current production configuration",
            mimeType="application/json"
        )
    ]
```

### 3. Prompts
Reusable prompt templates that Claude can discover and use.

```python
@server.list_prompts()
async def handle_list_prompts():
    return [
        Prompt(
            name="code-review",
            description="Standard code review prompt for this codebase",
            arguments=[
                PromptArgument(name="language", description="Programming language", required=True)
            ]
        )
    ]
```

---

## MCP Transport Layers

| Transport | Use Case | Pros | Cons |
|---|---|---|---|
| stdio | Local development, CLI tools | Simple, no network | Single client |
| HTTP + SSE | Remote/cloud services | Multi-client, scalable | More complex setup |
| WebSocket | Real-time bidirectional | Low latency | Complex lifecycle |

**Production choice**: HTTP+SSE for multi-tenant cloud deployments; stdio for local developer tools.

---

## MCP Design Patterns

### 1. Adapter Pattern
Wrap an existing API with MCP interface — no changes to underlying service.

```
Claude → MCP Server (Adapter) → Legacy REST API
```
Use when: You want to expose an existing service to Claude without modifying it.

### 2. Sidecar Pattern
Deploy MCP server alongside each service instance.

```
Service Instance A + MCP Sidecar A
Service Instance B + MCP Sidecar B
```
Use when: Different service instances have different data/capabilities.

### 3. Facade Pattern
One MCP server aggregates multiple underlying services.

```
Claude → MCP Facade Server → [DB, File System, External API, Cache]
```
Use when: Simplifying Claude's view — it talks to one endpoint, facade handles routing.

### 4. Orchestrator Pattern
MCP server itself orchestrates calls to multiple services.

```
Claude → MCP Orchestrator → [calls Service A, B, C in sequence] → Combined result
```
Use when: Complex multi-service workflows that Claude shouldn't need to understand.

---

## MCP Server Development

### Minimal Python MCP server:

```python
from mcp import Server, Tool
from mcp.server.stdio import stdio_server
import asyncio

server = Server("my-tools")

@server.list_tools()
async def handle_list_tools():
    return [
        Tool(
            name="search_docs",
            description="Search company documentation. Returns top 5 relevant documents.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict):
    if name == "search_docs":
        results = await search_index(arguments["query"])
        return [{"type": "text", "text": json.dumps(results)}]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

asyncio.run(main())
```

---

## MCP Security Implications

MCP servers have direct access to systems Claude operates on. This creates security responsibilities:

**Authentication**: MCP servers should validate who's calling them.
```python
# Validate request origin
if not verify_anthropic_signature(request.headers, request.body):
    return {"error": "Unauthorized"}
```

**Scope limitation**: Each MCP server should only expose what it needs to.
```
❌ One MCP server with full DB access
✅ Separate MCP servers: read-only queries | write operations (with confirmation)
```

**Audit logging**: Log every tool call with actor, timestamp, and arguments.

**Principle of least privilege**: MCP server gets minimum permissions needed.

---

## 🧠 Decision Framework

### When to use MCP vs direct API tools

| Situation | Use |
|---|---|
| Sharing tools across multiple Claude deployments | MCP |
| Quick one-off integration | Direct tool definition |
| Third-party tools you didn't build | MCP (standardized) |
| Team of engineers building on top | MCP (discoverable) |
| Single internal tool | Direct tool in code |
| Production multi-tenant system | MCP with auth |

### When MCP is overkill

❌ Don't use MCP when:
- You have one tool, one deployment
- You're prototyping or in early development
- The overhead of running a server isn't justified
- The tool is extremely simple (e.g., current date/time)

✅ Use MCP when:
- Multiple Claude apps use the same tools
- You want tools to be discoverable without code changes
- You need a standardized security boundary
- You're building a platform others will build on

---

## 🔍 Failure Modes & Debugging

| Failure | Root Cause | Fix |
|---|---|---|
| Claude calls wrong tool | Similar tool names/descriptions | Make names distinct, clarify "when to use" |
| Claude hallucinates arguments | Vague parameter descriptions | Add explicit types, formats, examples |
| Claude ignores tool errors | Error response is opaque | Return structured errors with `suggestion` field |
| MCP server not discovered | Server not in config | Verify MCP server config and transport |
| MCP call times out | Tool runs too long | Add timeout + return partial results |
| Tool called on sensitive data | No scope guard in description | Add explicit "never use this for X" in description |
| Retry loop | Tool errors not `retry_safe` flagged | Return `retry_safe: false` for unrecoverable errors |

---

## ⚖️ Trade-offs

| Choice | Setup Cost | Maintainability | Reusability | Security |
|---|---|---|---|---|
| Direct tool definitions | Low | Medium | Low (per-deployment) | App-level |
| MCP local (stdio) | Medium | High | Medium (same machine) | Process isolation |
| MCP remote (HTTP) | High | High | High (any client) | Network + auth |
| MCP Facade | High | Highest | Highest | Centralized |

---

## 📊 Evaluation & Metrics

| Metric | Target |
|---|---|
| Tool call success rate | >95% |
| Tool argument validation pass rate | >98% |
| Self-correction success rate (after error) | >80% |
| Avg tool calls per task | Minimize (fewer = better reasoning) |
| MCP server uptime | >99.9% for production |

---

## 🔗 Cross-domain Connections

- **→ Agentic Architecture**: Tools are how agents act in the world — quality here determines agent reliability
- **→ Prompt Engineering**: Tool descriptions are prompts — all prompt engineering rules apply
- **→ Context Management**: Tool results consume context window — design responses to be concise
- **→ Claude Code**: Claude Code uses tools (bash, git, file system) internally — same principles

---

## Quick Check

1. What's the most common cause of tool misuse? (Vague tool descriptions)
2. What 3 primitives does MCP expose? (Tools, Resources, Prompts)
3. When is MCP overkill? (Single tool, single deployment, prototyping)
4. What should a structured error response always include? (error_type, message, suggestion, retry_safe)
5. Which MCP pattern aggregates multiple services into one endpoint? (Facade)

---

## Interview / Exam Questions

**Q: Claude keeps calling `delete_record` when it should be calling `archive_record`. What's the fix?**
A: Improve tool descriptions. `delete_record` should say "Permanently deletes data — irreversible. Only call after explicit user confirmation." `archive_record` should say "Soft-deletes by marking inactive. Data recoverable. Use this instead of delete for most cases."

**Q: You're building a platform where 20 different Claude apps need access to the same company knowledge base. What's the best architecture?**
A: Build an MCP server exposing the knowledge base as a Resource and search as a Tool. Each Claude app connects to this MCP server. Changes to the knowledge base are reflected everywhere immediately, and you maintain one security boundary.

**Q: Your agent's tool calls are failing 30% of the time due to validation errors. How do you reduce this?**
A: Implement structured error responses with specific `suggestion` fields. Feed errors back to Claude so it can self-correct. Add a validation-retry loop (max 3 retries). Additionally, improve the tool's parameter descriptions to include format examples.

---

## ⚡ Cheat Sheet

```
TOOL DESCRIPTIONS must include:
  1. What it does (1 sentence)
  2. When to use vs similar tools
  3. When NOT to use
  4. Side effects (mutations, irreversibility)
  5. Return shape
  6. Constraints (rate limits, formats)

STRUCTURED ERRORS:
  {success, error_type, error_message, suggestion, retry_safe}

MCP PRIMITIVES: Tools + Resources + Prompts
MCP TRANSPORTS: stdio (local) | HTTP+SSE (remote)

MCP PATTERNS:
  Adapter  → wrap existing API
  Sidecar  → deploy alongside service
  Facade   → aggregate multiple services
  Orchestrator → MCP handles workflow

MCP vs DIRECT:
  MCP: multi-app, standardized, discoverable
  Direct: single-app, fast, simple

KEY METRICS:
  - Tool call success > 95%
  - Self-correction > 80%
```

---

## Related Topics
- **Previous**: `03-prompt-engineering.md`
- **Next**: `05-context-management.md`
- **Related**: `01-agentic-architecture.md` (tools in agent loops)
- **Decision guide**: `07-decision-frameworks.md`
