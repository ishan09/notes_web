# 22 — Exam-Oriented Knowledge

> For each domain: **MUST KNOW** (memorise), **SHOULD KNOW** (likely in scenarios), **NICE TO KNOW** (lower
> priority), **COMMON TRAPS** (typical wrong answers), and **ARCHITECTURE HEURISTICS** (fast rules for the
> 2-minutes-per-question reality).
>
> Study order by weight: **D1 (27%) → D3 (20%) → D4 (20%) → D2 (18%) → D5 (15%)**.

---

## Domain 1 — Agentic Architecture & Orchestration (27%)

### MUST KNOW
- The **agent loop** and how `stop_reason` drives it: `tool_use` → execute and continue; `end_turn` → done;
  `max_tokens` → **truncated, do not parse**; `pause_turn` → resume **without** an extra user message;
  `refusal` → the only value that populates `stop_details`; `stop_sequence`.
- Append the **full `response.content` list** to history; return **all** `tool_result` blocks in **one** user
  message.
- The **four-question agent test**: complexity, value, viability, cost of error.
- **When NOT to build an agent** — if you can draw the flowchart, build the flowchart.
- **Hub-and-spoke / coordinator–subagent**: spokes never talk to each other; O(n) communication; one place for
  budget, policy and termination; expensive coordinator, cheap spokes.
- The **four legitimate reasons for multi-agent**: context isolation, parallelism, genuine specialisation
  (different tools/permissions/models), security compartmentalisation.
- **Multiple termination conditions**: goal (verified), max steps, token/cost budget, wall clock, no-progress,
  repeat detection, confidence floor, unrecoverable error, human stop.
- **Completion must be verified, not claimed.**
- **Plan-then-execute with a deterministic gate** for any agent with side effects.
- **Structured handoff packages** (goal, acceptance criteria, completed results with confidence and provenance,
  artefacts by reference, open questions, constraints, budget, next action) — never a raw transcript.
- **Session resumption reconstructs from task state**, it does not replay the transcript.

### SHOULD KNOW
- Error compounding: 0.95⁵ ≈ 77%. Verify between sequential stages.
- Multi-agent costs **2–10×**; each subagent pays for its own system prompt and cannot share the parent's cache
  (a **fork** can).
- Agent failure modes: loops, context explosion, wrong plan, state corruption, hallucinated action, cascading
  failure, runaway cost, injection→action, approval deadlock.
- Static vs dynamic decomposition — prefer static where the structure is known; a strong hybrid is
  model-proposes / code-validates.
- Orchestration-layer safeguards via PreToolUse/PostToolUse/Stop hooks.
- Termination-reason distribution as the key agent dashboard.

### NICE TO KNOW
- Debate/critic topologies; hierarchical sub-coordinators; Managed Agents multiagent rosters.

### COMMON TRAPS
| Trap | Reality |
|---|---|
| "More agents = better" | 2–10× cost; name the limitation the extra agent removes |
| Specialised "personas" with identical tools | Not specialisation; combine into one agent |
| Only checking `stop_reason == "tool_use"` | Missing `max_tokens` / `pause_turn` handling is the classic defect |
| Sending "Continue." after `pause_turn` | The API detects the trailing `server_tool_use` block |
| Trusting "task complete" | Verify against the world |
| One termination condition | Needs several, independent |
| Peer-to-peer agent chat | O(n²), unbounded, undebuggable |
| Passing the transcript as a handoff | Expensive, stale, re-litigates decisions |

### ARCHITECTURE HEURISTICS
1. Flowchart exists ⇒ workflow, not agent.
2. Single agent until a **named** limitation forces multi.
3. Multi ⇒ hub-and-spoke ⇒ expensive coordinator, cheap spokes.
4. Side effects ⇒ plan-then-execute + deterministic gate + approval for irreversible.
5. Every agent: bounded steps, bounded budget, verified completion, externalised state.
6. Handoffs are structured and lossy on purpose.

---

## Domain 3 — Claude Code Configuration & Workflows (20%)

### MUST KNOW
- **CLAUDE.md is context, not enforcement.** Delivered as a user message after the system prompt; no compliance
  guarantee. **If it must hold, it is a hook or a permission rule.**
- The four scopes and paths: **managed policy** (`/etc/claude-code/CLAUDE.md` on Linux) → **user**
  (`~/.claude/CLAUDE.md`) → **project** (`./CLAUDE.md` or `./.claude/CLAUDE.md`) → **local**
  (`./CLAUDE.local.md`, gitignored). All **concatenated**, ordered root→cwd, `CLAUDE.local.md` last within a
  directory. **Subdirectory CLAUDE.md loads on demand.**
- Target **&lt;200 lines**. Procedures → **skills**; path-specific → `.claude/rules/` with `paths:` frontmatter;
  must-enforce → hooks/permissions.
- **Compaction survival:** project-root CLAUDE.md, unscoped rules and auto memory are **re-injected**;
  **path-scoped rules and nested CLAUDE.md are lost** until re-triggered; skill bodies re-injected but truncated
  (5K/skill, 25K total, start of file kept).
- **Permissions evaluate deny → ask → allow; first match wins; specificity is irrelevant.** A deny rule cannot
  carry allowlist exceptions.
- A **bare-name deny removes the tool from Claude's context**; a scoped rule leaves it available.
- **Permission modes**: `default`(Manual), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`.
- **Hooks**: shell commands at lifecycle events; **exit 2 blocks**; PreToolUse is the policy gate
  (`permissionDecision: allow|deny|escalate`); Stop can refuse to finish; PostToolUse adds context.
- **Subagents** exist primarily for **context isolation**; they inherit **no conversation history** (forks do);
  frontmatter: `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`,
  `hooks`, `memory`, `effort`, `isolation`.
- **CI**: `dontAsk` + explicit allows; never `bypassPermissions` with real credentials; PR content is untrusted;
  the agent commits to a branch, a non-agentic step opens the PR.

### SHOULD KNOW
- Permission rules constrain **Claude**; **sandboxing constrains the machine** (subprocesses bypass Read/Edit
  rules).
- Path anchors: `//abs`, `~/home`, `/settings-source-relative`, `relative`. A single leading `/` is **not**
  filesystem-absolute.
- Relative single-segment directory patterns: allow ⇒ anchored; deny/ask ⇒ **any depth**.
- Compound commands are parsed per subcommand; wrappers (`timeout`, `nice`, `xargs`…) are stripped, but
  **environment runners (`devbox run`, `npx`, `docker exec`) are not**.
- Slash command vs skill vs subagent: invoked-by-you vs loaded-when-relevant vs own-context.
- `/context`, `/compact [focus]`, `/clear`, `/memory`, `/doctor`, `/permissions`, `/mcp`.
- Auto memory: `MEMORY.md` first 200 lines / 25KB; per-repository; not inherited by subagents.

### NICE TO KNOW
- `claudeMdExcludes`, `claudeMd` in managed settings, `@import` depth limit of 4, `AGENTS.md` via import,
  worktree isolation, plugins.

### COMMON TRAPS
| Trap | Reality |
|---|---|
| "Put the security rule in CLAUDE.md" | Not enforced — use a hook or permission rule |
| A narrow allow overrides a broad deny | No — deny wins, first match, specificity irrelevant |
| `Edit(/src/**)` means `/src` on disk | It anchors to the settings source; use `//src/**` |
| Path-scoped rules survive compaction | They do not |
| More CLAUDE.md = better adherence | Longer files reduce adherence |
| `bypassPermissions` is fine in CI | Only in isolated environments without real credentials |
| Read/Edit deny rules stop everything | Not subprocesses — that needs the sandbox |

### ARCHITECTURE HEURISTICS
1. Guidance → CLAUDE.md / rules. Guarantee → hook / permission / sandbox.
2. Scope instructions as narrowly as possible, but keep must-survive rules unscoped.
3. Verbose or restricted work → subagent.
4. CI is deny-by-default with an explicit allowlist.
5. Add a verifier (tests, lint, types) before adding model capability.

---

## Domain 4 — Prompt Engineering & Structured Output (20%)

### MUST KNOW
- **Explicit criteria** convert sampling into lookup and make behaviour testable — the highest-leverage
  technique, and named in the blueprint.
- Prompt structure: role, context, criteria, constraints, output contract, examples, **task last**.
- **Positive framing beats negative constraints**; few prioritised rules beat many.
- **Few-shot**: 3–8 examples, diverse, include **boundary cases**, correct, consistent, balanced; keep the
  example pool **disjoint from the eval set**.
- **Structured outputs**: `output_config: {format: {...}}` is canonical; `output_format` is deprecated;
  `messages.parse()` is the recommended client path.
- **`strict: true` goes on the tool definition** (not `tool_choice`) and requires `additionalProperties: false`
  and `required`.
- **Unsupported JSON Schema**: recursion, `minimum`/`maximum`/`multipleOf`, `minLength`/`maxLength`/`pattern`,
  complex array constraints, `additionalProperties` other than `false`.
- **Check `stop_reason` before parsing** — truncation and refusal are not schema errors.
- **Validation retry loops** must be bounded, feed back the **specific** error, keep the failed attempt in
  history, and **fail loudly**.
- **Structured output = the answer; tool call = a request to act.** The forced-fake-tool pattern is legacy.
- **Citations are incompatible with `output_config.format`** (400).

### SHOULD KNOW
- Extended thinking (`adaptive` + `effort`) over prompted CoT; thinking billed as output;
  `display: "omitted"` is the default on the 5-series.
- Cache-aware prompt ordering: stable content first, volatile after the breakpoint.
- Schema versioning and backward compatibility; **adding an enum value breaks exhaustive consumers**.
- New schemas cost a one-time compile, cached 24h — do not generate schemas per request.
- Prompt injection taxonomy and the layered defence stack.
- Structured outputs work with Batches, streaming, token counting and thinking.

### NICE TO KNOW
- HyDE, multi-query, self-consistency; tool-use examples on tool definitions.

### COMMON TRAPS
| Trap | Reality |
|---|---|
| `strict` on `tool_choice` | It belongs on the tool definition |
| `minimum`/`pattern` are enforced | Stripped/validated client-side — enforce in code |
| Parse first, check `stop_reason` later | Truncated output parses into wrong objects |
| Unbounded repair loops | Cost incidents |
| Schema validity = quality | Guarantees shape, not truth |
| Temperature 0 for determinism | Removed on current models; use explicit criteria + schemas |
| "Be concise" | Use "3–5 bullets, ≤20 words each" |

### ARCHITECTURE HEURISTICS
1. Replace every adjective with a decidable test.
2. Enum whenever the value space is closed.
3. `required` + nullable beats optional — it distinguishes "absent" from "failed".
4. Add `confidence` and `unresolved_fields` to make extraction operable.
5. Repair once → re-ask at a higher tier → human. Cap at ~3 model attempts.

---

## Domain 2 — Tool Design & MCP Integration (18%)

### MUST KNOW
- **Claude requests; your harness executes.** Every control lives in that gap.
- Tool descriptions are prompt engineering: be prescriptive about **when to call** and **when not to** (name the
  competing tool).
- **`is_error` contract**: a failed tool still returns a `tool_result`, with `is_error: true`, and an
  informative recovery message.
- All parallel `tool_result` blocks in **one** user message; matching `tool_use_id`s.
- `tool_choice`: `auto` | `any` | `tool` | `none`, plus `disable_parallel_tool_use`.
- **MCP is an open protocol** (JSON-RPC 2.0, stateful, capability-negotiated) — not a Claude feature.
- **Host / client / server**; one client per server; the host owns permissions.
- Primitives by controller: **tools = model, resources = application, prompts = user**; client-side
  **sampling, roots, elicitation**.
- **Protocol errors are JSON-RPC errors; tool failures return a successful result with `isError: true`.**
- Transports: **stdio** (local subprocess), **Streamable HTTP** (recommended remote); SSE deprecated.
- **[Claude Code] scopes**: local (default, `~/.claude.json`), project (`.mcp.json`, committed), user.
  Precedence local → project → user → plugin → connector; the **whole entry** wins, no field merging.
- **`${VAR}` / `${VAR:-default}` expansion** in `command`, `args`, `env`, `url`, `headers` — commit config, not
  secrets.
- **MCP connector** needs **both** `mcp_servers` and a matching `mcp_toolset`.

### SHOULD KNOW
- Tool granularity: one tool per **user-visible intent**; the tool boundary must align with the **permission
  boundary**.
- Authorise on **arguments**, not just the tool.
- Idempotency keys derived from `tool_use_id`.
- Anthropic-defined tools are **schema-less** (`bash_20250124`, `text_editor_20250728`, `code_execution_*`,
  `web_search_*`, `web_fetch_*`, `memory_20250818`) — never pass `input_schema`.
- Client-side vs server-side tools: who executes, and where the data goes.
- **Tool search** defers schemas and **appends** discovered ones (preserves the cache); at least one tool and the
  search tool must stay loaded, else `400 All tools have defer_loading set`.
- Mid-conversation tool changes = **application-driven** control; tool search = **model-driven** discovery.
- Server-tool errors return HTTP 200 with an error object, not an exception.
- MCP resilience: 5 reconnect attempts (HTTP/SSE), stdio not auto-reconnected; per-server `timeout`; idle
  timeouts; automatic backgrounding after 2 minutes.
- Output limits: warn >10K tokens, cap 25K (`MAX_MCP_OUTPUT_TOKENS`); `_meta["anthropic/maxResultSizeChars"]`.
- `_meta["anthropic/requiresUserInteraction"]` forces a prompt even in permissive modes.
- MCP tool naming `mcp__server__tool`; deny globs anywhere, **allow globs only after a literal server prefix**.

### NICE TO KNOW
- Programmatic tool calling; MCP gateways; WebSocket transport; root-level `anyOf` flattening.

### COMMON TRAPS
| Trap | Reality |
|---|---|
| Dropping a failed tool's result | 400 — every `tool_use` needs a `tool_result` |
| Raising a tool exception to the caller | Return `is_error: true` |
| Splitting parallel results across messages | Silently suppresses future parallelism |
| MCP is Claude-only | It is an open standard |
| Tool failure = JSON-RPC error | No — successful result with `isError` |
| Committing a bearer token in `.mcp.json` | Use `${VAR}` |
| Trusting a `tenant_id` argument | Derive scope from the token |
| MCP for one consumer | Protocol overhead with no reuse |

### ARCHITECTURE HEURISTICS
1. One tool per user-visible intent; split read from write.
2. Description = *what* + *when to call* + *when not to* + *what an empty result means*.
3. Retryable infrastructure errors are the harness's job; semantic errors are the model's.
4. Direct tools until a second consumer; then MCP.
5. Installing an MCP server is a supply-chain decision: vet, pin, scope, gate, audit.

---

## Domain 5 — Context Management & Reliability (15%)

### MUST KNOW
- Render order **`tools → system → messages`**; caching is a **prefix match**; 4 breakpoints; ~1024-token
  minimum; reads ~10%, writes ~125%; verify with `cache_read_input_tokens`.
- **Compaction summarises** (`compact_20260112`, beta `compact-2026-01-12`) — **append the full
  `response.content`** or you lose the compaction block.
- **Context editing prunes** (`clear_tool_uses_20250919`, `clear_thinking_20251015`, beta
  `context-management-2025-06-27`).
- **Memory** persists across sessions; you own the backend, so you own access control.
- **Lost-in-the-middle**: best evidence at the extremes, **task last**.
- **Structured handoff packages** and **error propagation** (confidence, provenance, failures as first-class).
- Retryable (429, 5xx, timeouts, connection) vs **non-retryable (400, 401, 403, 404)**; exponential backoff
  **with jitter**; honour `retry-after`.
- **Idempotency keys** make side-effecting tools safe under retry.
- **Confidence calibration** before thresholding; escalation payloads a human can decide from in seconds.

### SHOULD KNOW
- Silent cache invalidators: timestamps, per-request IDs, unsorted JSON, per-user tool lists, mid-session system
  edits, mid-session model or tool changes.
- **Mid-conversation system messages** change instructions without invalidating the cache (Opus 5 / 4.8 /
  Fable 5 / Mythos 5; not Sonnet 5).
- Guardrail layers (input / tool / output) and fail-open vs fail-closed per guardrail.
- The degradation ladder, and making every degradation visible to the user.
- Observability: `prompt_version` + `model` + `schema_version` in every trace; alert on **cache hit rate** and
  **termination-reason distribution**.
- Long context is a capability, not a strategy — plan as if the window were 200K.

### NICE TO KNOW
- Task budgets (advisory, token-denominated) vs Managed Agents session budgets (hard, dollar-denominated);
  cache pre-warming with `max_tokens: 0`.

### COMMON TRAPS
| Trap | Reality |
|---|---|
| Appending only text with compaction on | Loses the compaction block; history resets |
| Compaction and context editing are the same | Summarise vs prune; different betas |
| A 1M window means no retrieval needed | Cost, latency and dilution all say otherwise |
| Retrying 400s | Never retryable |
| Backoff without jitter | Retry storms |
| Thresholding raw model confidence | Calibrate first |
| More context fixes a retrieval miss | It cannot — the chunk was never retrieved |

### ARCHITECTURE HEURISTICS
1. Signal density beats volume.
2. Stable prefix first, task last, best evidence at the extremes.
3. Externalise task state so it survives compaction, crashes and handoffs.
4. Every failure and every uncertainty propagates explicitly.
5. Cache-hit-rate collapse is the earliest cost alarm; termination-reason drift the earliest quality alarm.

---

## The universal traps (any domain)

| Trap | Correct instinct |
|---|---|
| Solving security with a prompt instruction | Reduce capability; add a deterministic gate |
| Adding agents without a named limitation | Simplest tier that meets the constraint |
| Choosing the biggest model with no eval | Start at Sonnet; move by evidence |
| Increasing k instead of adding a reranker | Ranking, not volume |
| Downgrading the model before caching | Free levers first |
| Approving everything | Tiered autonomy; rubber-stamping is worse than no gate |
| Trusting model self-reports (completion, confidence) | Verify and calibrate |
| Ignoring "how would I know it broke?" | Often the tiebreaker between two plausible options |

## The seven sentences worth memorising verbatim

1. **If you can draw the flowchart, build the flowchart.**
2. **Claude requests; your harness executes.**
3. **CLAUDE.md is context; hooks and permissions are enforcement.**
4. **Deny → ask → allow; first match wins; specificity is irrelevant.**
5. **Structured output guarantees shape, not truth.**
6. **Compaction summarises; context editing prunes; memory persists.**
7. **You cannot make the model safe; you can make the consequences bounded.**
