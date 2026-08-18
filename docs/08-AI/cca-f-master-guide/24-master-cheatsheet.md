# 24 — CCA-F Master Cheat Sheet

> Final-week material. Everything here is a compression of earlier sections — if a line is unfamiliar, go back
> to the section it points to.

---

## 24.1 Important definitions

### Model and API
| Term | One line |
|---|---|
| **Token** | Sub-word unit; ~4 chars of English. Count with `messages.count_tokens`, never a third-party tokenizer |
| **Context window** | Max tokens per request: tools + system + history + output |
| **Adaptive thinking** | `thinking: {type: "adaptive"}` — Claude chooses reasoning depth; replaces `budget_tokens` |
| **Effort** | `output_config: {effort: low\|medium\|high\|xhigh\|max}`; default `high` |
| **`stop_reason`** | `end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `pause_turn`, `refusal` |
| **`stop_details`** | Populated **only** when `stop_reason == "refusal"` |
| **Content block** | Typed element of `content`: text, image, document, thinking, tool_use, tool_result, compaction |
| **Prompt caching** | Prefix-match KV reuse; reads ~10%, writes ~125%; ≤4 breakpoints; ~1024-token minimum |
| **Compaction** | Server-side **summarisation** of old context (`compact_20260112`) |
| **Context editing** | **Pruning** of stale tool results/thinking (`clear_tool_uses_20250919`) |
| **Batch API** | Async, ~50% cost, results in **any order** — key by `custom_id` |
| **Structured outputs** | `output_config.format` constrains the response; `strict: true` constrains tool args |
| **Citations** | `citations: {enabled: true}` on document blocks; incompatible with `output_config.format` |
| **Task budget** | Advisory token ceiling the model paces itself against (≠ `max_tokens`) |

### Tools, MCP, agents
| Term | One line |
|---|---|
| **Tool** | A JSON-Schema function you declare and **you** execute; Claude only requests it |
| **`is_error`** | Structural flag on a `tool_result` marking a failed tool — still returned, never dropped |
| **Tool search** | Defers tool schemas and **appends** discovered ones — preserves the prompt cache |
| **MCP** | Open JSON-RPC 2.0 protocol for AI-tool integration: host / client / server |
| **MCP primitives** | tools (**model**-controlled), resources (**app**-controlled), prompts (**user**-controlled) |
| **Sampling / roots / elicitation** | Client-side MCP features: server asks for inference / scope boundaries / user input |
| **Agent** | A system where **the model decides control flow** in a loop until the goal is met |
| **Hub-and-spoke** | Coordinator + spokes; spokes never talk to each other; O(n) communication |
| **Handoff package** | Structured state passed between agents: goal, criteria, results+confidence, artefacts, open questions, constraints, budget |
| **Plan-then-execute** | Read-only gather → structured plan → deterministic gate → gated writes |

### Claude Code
| Term | One line |
|---|---|
| **CLAUDE.md** | Persistent project instructions — **context, not enforcement** |
| **`.claude/rules/`** | Modular instructions; `paths:` frontmatter scopes them to matching files |
| **Skill** | A folder with `SKILL.md`; description always in context, body loaded on demand |
| **Hook** | Shell command at a lifecycle event; **exit 2 blocks**; the enforcement layer |
| **Subagent** | Separate agent with its **own context window**, tools, model and permissions |
| **Fork** | A subagent inheriting the full conversation and sharing the prompt cache |
| **Permission modes** | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` |
| **Rule precedence** | **deny → ask → allow**, first match wins, specificity irrelevant |
| **Agent SDK** | Claude Code as a library (harness + built-in tools); **you host it** |
| **Managed Agents** | Anthropic runs the loop **and** hosts a per-session sandbox |

### Reliability and evaluation
| Term | One line |
|---|---|
| **Idempotency key** | Caller-supplied key (use `tool_use_id`) making a side-effecting tool safe to retry |
| **Guardrail** | Deterministic check at input / tool / output; decide fail-open vs fail-closed |
| **Calibration** | Confidence is calibrated if 0.8-confidence predictions are right ~80% of the time |
| **LLM-as-judge** | A model scoring outputs against a rubric; validate against humans (κ) before trusting |
| **Faithfulness** | Every claim is supported by the provided context (≠ correctness) |
| **recall@k** | Is the relevant chunk in the top k — the ceiling on RAG quality |
| **Trajectory eval** | Asserting on the agent's action sequence, not just the outcome |

---

## 24.2 Architecture patterns — one page

| Pattern | Shape | Choose when | Disqualifier |
|---|---|---|---|
| **Simple LLM app** | in → call → validate → out | Pure transformation | Needs private data or actions |
| **RAG** | ingest / retrieve → rerank → generate + cite | Large or changing corpus; citations; ACLs | Small stable corpus; exact structured answers |
| **Tool-calling** | loop while `stop_reason == tool_use` | Live data or actions; known operations, unknown sequence | Fixed sequence |
| **Single agent** | bounded loop + task state + verifier | Path unknown; fits one context | You can draw the flowchart |
| **Multi-agent** | several agents, a topology | Context isolation / parallelism / specialisation / compartmentalisation | "Personas" with identical tools |
| **Supervisor (hub-and-spoke)** | coordinator + spokes | Decomposable, verbose, parallel work | Interdependent subtasks |
| **Human-in-the-loop** | plan → gate → approve → execute | Irreversible or regulated actions | High-volume reversible actions |
| **Agent + RAG** | retrieval as a tool | Multi-hop; optional retrieval | Single-hop Q&A |
| **Agent + MCP** | tools from MCP servers | Multiple consumers; team ownership | One consumer; latency-critical |
| **Multi-agent + MCP** | spokes with different servers | Different trust levels per capability | One trust level |
| **Event-driven** | queue → filter → agent → actions | Reacting to system events | Needs sub-second response |
| **Batch** | fan out → Batch API → validate | Volume, latency-tolerant | A user is waiting |
| **Real-time** | streaming, cached prefix, small model | Human waiting on tokens | Long tool chains |
| **Enterprise assistant** | SSO → router → RAG/tools → guardrails | Broad internal assistant | A single well-defined workflow |

---

## 24.3 Trade-off matrix

| | Setup cost | Run cost | Latency | Predictability | Adds knowledge | Adds behaviour | Citations | Access control | Debuggability |
|---|---|---|---|---|---|---|---|---|---|
| **Long context** | Very low | High per call (low if cached) | Med | High | ✅ | ❌ | ✅ (citations) | ❌ shared prefix | High |
| **RAG** | High | Low–med | Med | Med | ✅ | ❌ | ✅ | ✅ per user | Med |
| **Fine-tuning** | Very high | Low | Low | High | ⚠️ stale, uncitable | ✅ | ❌ | ❌ baked in | Low |
| **Tools** | Med | Med (grows with steps) | Med–high | Med | ✅ live | ❌ | ⚠️ via results | ✅ per call | Med |
| **MCP** | Med–high | Same as tools | +1 hop | Med | ✅ | ❌ | ⚠️ | ✅ per user (OAuth) | Med |
| **Workflow** | Med | Low | Low | **Very high** | via steps | via steps | ✅ | ✅ | **Very high** |
| **Agent** | Med | **High, variable** | High | **Low** | ✅ | ❌ | ⚠️ | ✅ per call | **Low** |

**Reading the matrix:** the two columns that decide most real arguments are **predictability** and
**debuggability** — and they move together, in the opposite direction to autonomy.

---

## 24.4 Security checklist

- [ ] Threat model written; **trust boundaries drawn** (what is untrusted: retrieved docs, tool output, web
      pages, email, uploads, PR content, third-party MCP output)
- [ ] **Blast radius named** for every capability: what does one wrong call do? 1,000 wrong calls?
- [ ] **Capability separation**: the component reading untrusted content holds **no** write credentials
- [ ] **Least privilege**: read-only by default; per-route, per-user tool sets
- [ ] Agent acts **as the user**, never as a superuser service account
- [ ] Authorisation on the **(user, action, resource)** triple — arguments, not just the tool
- [ ] Tenant/user scope from the **auth token**, never from a model-supplied argument
- [ ] **Allowlists** (commands, domains, paths, tools) — never blocklists
- [ ] **Network egress allowlist** enforced at the infrastructure layer
- [ ] Untrusted content **delimited** with an explicit no-instructions rule (necessary, not sufficient)
- [ ] **Deterministic gates** (PreToolUse-style) in front of every side-effecting action
- [ ] **Human approval** for irreversible / high-blast-radius actions; approvals persist, time out, and are
      recorded
- [ ] **Idempotency keys** on every side-effecting tool
- [ ] Bounded effects: value caps, row caps, rate limits, circuit breaker
- [ ] Writes to `.github/`, `.claude/`, hooks, infra paths **denied** (persistence)
- [ ] No secrets in prompts, tool args, config literals, or logs
- [ ] PII minimised, redacted before send **and** before logging
- [ ] ACL filtering **inside** the retrieval query; re-checked at answer time
- [ ] Deletion propagates: store, index, caches, logs, memory files
- [ ] MCP servers: vetted, **version-pinned**, credential-scoped, re-reviewed on upgrade
- [ ] Injection tests as a **CI hard gate**; cross-tenant tests; game days
- [ ] Immutable audit trail; anomaly alerting on tool patterns and egress attempts
- [ ] Kill switches ready: autonomy off, writes off, force approval, disable a tool/server

---

## 24.5 Reliability checklist

- [ ] `stop_reason` fully handled: `tool_use`, `end_turn`, `max_tokens`, `pause_turn`, `refusal`, `stop_sequence`
- [ ] `stop_details` read only when `stop_reason == "refusal"`
- [ ] Full `response.content` appended to history (never reconstructed from text)
- [ ] All parallel `tool_result`s in **one** user message; failures with `is_error: true` and a recovery message
- [ ] 400s never retried; 429/5xx retried with **exponential backoff + jitter**, honouring `retry-after`
- [ ] Per-request timeouts set; total budgeted as `timeout × (retries + 1)`
- [ ] Idempotency + reconciliation for side effects
- [ ] Circuit breaker per provider/dependency
- [ ] **Degradation ladder** defined, and every degradation visible to the user
- [ ] Fallbacks **exercised** in the last 90 days
- [ ] Agents: bounded steps, token/cost budget, wall clock, no-progress and repeat detection
- [ ] Agents: completion **verified**, not claimed; structured incomplete status with a resume token
- [ ] Task state externalised so compaction/crash/handoff does not lose it
- [ ] Errors and uncertainty propagate across handoffs; confidence aggregation defined **in code**
- [ ] Guardrails at input / tool / output, with fail-open vs fail-closed decided per guardrail
- [ ] Confidence **calibrated** before thresholding; escalations decidable in seconds
- [ ] Session state in shared storage, not process memory

---

## 24.6 Evaluation checklist

- [ ] Golden set built **before** prompt tuning; disjoint from few-shot examples
- [ ] Composition: ~50% typical, ~25% edge, ~15% adversarial, ~10% regression cases from past bugs
- [ ] Held-out test set, looked at rarely
- [ ] Baseline recorded for every metric
- [ ] Retrieval and generation evaluated **separately** (the diagnostic matrix)
- [ ] Agent metrics: task success (verified), tool-selection and argument accuracy, steps p50/p95, loop rate,
      **termination-reason distribution**, cost per success
- [ ] Abstention rate measured
- [ ] LLM judge validated against humans (κ); binary criteria; evidence required; structured verdicts
- [ ] Each case run 3–5× with confidence intervals reported
- [ ] CI gates: **hard** for safety/PII/injection/schema, **threshold** for quality, **report** for cost/latency
- [ ] Every behaviour change gated: prompt, model, `effort`, tools, retrieval, schemas, guardrails
- [ ] Production traffic sampled into the eval set continuously
- [ ] Shadow → canary → ramp, with rollback by config flag

---

## 24.7 Production readiness checklist

- [ ] Model IDs **pinned**; migration runbook exists
- [ ] `prompt_version`, `model`, `schema_version` in every trace; replay possible
- [ ] Rollback is a **config flag flip**, not a deploy
- [ ] Alerts on quality (schema violations, escalation rate, refusals), not just errors
- [ ] **Cache hit rate** and **termination-reason distribution** dashboards
- [ ] Spend-**rate** alerting; budgets enforced pre-call; cost attributed per tenant/route
- [ ] TTFT and total-latency SLOs measured separately at p95/p99
- [ ] Streaming wherever a human waits; buffering disabled in proxies
- [ ] Long-running work on queue + durable workers (not serverless with hard timeouts)
- [ ] Batch traffic segregated from interactive rate-limit budget
- [ ] Per-tenant quotas and fairness
- [ ] Data residency, retention and deletion implemented and tested
- [ ] Runbook + kill switches + on-call familiar with the failure modes
- [ ] Users know it is AI and know its limits; escalation path always available

---

## 24.8 Common exam traps

| Trap | Correct answer |
|---|---|
| Agent for a known sequence | Workflow with LLM steps |
| Multi-agent for "personas" | Single agent |
| Prompt instruction as a security control | Reduce capability + deterministic gate |
| CLAUDE.md as enforcement | Hook or permission rule |
| A narrow allow beating a broad deny | Deny wins; first match; specificity irrelevant |
| `strict` on `tool_choice` | On the tool definition |
| `minimum`/`pattern` enforced by the schema | Enforce in code; state it in descriptions |
| Parsing before checking `stop_reason` | Truncation produces wrong objects |
| Dropping a failed tool's result | Return it with `is_error: true` |
| Splitting parallel tool results | One user message |
| Retrying a 400 | Never |
| Backoff without jitter | Retry storms |
| Appending only text with compaction on | Append the full content list |
| Confusing compaction with context editing | Summarise vs prune |
| More k instead of a reranker | Ranking, not volume |
| Bigger model before caching | Free levers first |
| Fine-tuning to add facts | RAG |
| MCP for one consumer | Direct tools |
| Trusting a `tenant_id` argument | Derive from the token |
| Post-filtering ACLs | Pre-filter inside the query |
| 1M context ⇒ no retrieval needed | Cost, latency, dilution |
| Trusting "task complete" | Verify |
| Approving everything | Tiered autonomy |
| Semantic cache without scoping | Wrong answers to similar questions |
| `bypassPermissions` in CI with real credentials | `dontAsk` + explicit allowlist |
| Correlating batch results by position | Key by `custom_id` |

---

## 24.9 Top 100 things to know for CCA-F

**Model & API (1–15)**
1. One endpoint: `POST /v1/messages`; tools, structured outputs and thinking are parameters of it.
2. Render order: `tools → system → messages`.
3. `content` is a list of typed blocks; never `content[0].text`.
4. Append the **full** `response.content` to history.
5. Six `stop_reason` values; know the harness action for each.
6. `stop_details` only on `refusal`.
7. `pause_turn` resumes **without** an extra user message.
8. `max_tokens` means truncated — do not parse.
9. `temperature`/`top_p`/`top_k` are **removed** on the 5-series and Opus 4.7/4.8.
10. `budget_tokens` is gone; use `thinking: {type: "adaptive"}` + `effort`.
11. `effort`: `low|medium|high|xhigh|max`, default `high`; `xhigh` suits coding/agentic work.
12. Thinking is billed as output; `display` defaults to `"omitted"` on the 5-series.
13. Output costs ~5× input and is generated serially.
14. Count tokens with `messages.count_tokens`, never a third-party tokenizer.
15. Discover capabilities via the Models API (`max_input_tokens`, `max_tokens`, `capabilities`).

**Prompting & structured output (16–30)**
16. Explicit criteria beat adjectives — the highest-leverage technique.
17. Task last; best evidence at the extremes.
18. Positive framing beats negative constraints.
19. Few, prioritised rules beat many.
20. Few-shot: 3–8, diverse, boundary cases, disjoint from the eval set.
21. XML-style delimiters are a strong Claude convention.
22. Never interpolate user text into the system prompt.
23. `output_config.format` is canonical; `output_format` is deprecated.
24. `messages.parse()` validates against your schema.
25. `strict: true` on the **tool definition**; needs `additionalProperties: false` + `required`.
26. Unsupported schema: recursion, numeric/string constraints, `pattern`.
27. Check `stop_reason` before parsing.
28. Validation retries: bounded, specific feedback, fail loudly.
29. Structured output = the answer; tool call = a request to act.
30. Citations + `output_config.format` = 400.

**Tools (31–45)**
31. Claude requests; your harness executes.
32. Descriptions must say **when to call** and **when not to**.
33. Say what an **empty result means** in the tool description.
34. `tool_choice`: `auto|any|tool|none` + `disable_parallel_tool_use`.
35. All parallel `tool_result`s in one user message.
36. Failed tools return `tool_result` with `is_error: true`.
37. Infrastructure retries are the harness's job; semantic errors are the model's.
38. Authorise on **arguments**, not just the tool.
39. Idempotency keys from `tool_use_id`.
40. One tool per user-visible intent; boundary = permission boundary.
41. Anthropic-defined tools are schema-less.
42. Bash gives breadth; promote to dedicated tools to gate, render, audit, parallelise.
43. Tool search defers schemas and **appends** them — preserves the cache.
44. `400 All tools have defer_loading set` — keep one tool and the search tool loaded.
45. Server-tool errors return HTTP 200 with an error object.

**MCP (46–58)**
46. MCP is an open protocol, not a Claude feature.
47. Host owns permissions; one client per server.
48. tools = model, resources = app, prompts = user.
49. Sampling, roots, elicitation are client-side features.
50. Tool failures are successful results with `isError: true`.
51. Transports: stdio and Streamable HTTP; SSE deprecated.
52. Scopes: local (default) → project (`.mcp.json`) → user; whole entry wins, no merging.
53. `${VAR}` / `${VAR:-default}` in `command`, `args`, `env`, `url`, `headers`.
54. Naming `mcp__server__tool`; allow globs need a literal server prefix.
55. MCP connector needs **both** `mcp_servers` and `mcp_toolset`.
56. Output warns >10K tokens, capped at 25K by default.
57. `requiresUserInteraction` forces a prompt even in permissive modes.
58. Installing a server is a supply-chain decision: vet, pin, scope, gate, audit.

**Claude Code (59–72)**
59. CLAUDE.md is context, not enforcement.
60. Scopes: managed → user → project → local; concatenated root→cwd.
61. Subdirectory CLAUDE.md loads on demand.
62. Target <200 lines; procedures → skills.
63. `.claude/rules/` with `paths:` for path-scoped instructions.
64. Compaction re-injects root CLAUDE.md and unscoped rules; **path-scoped rules and nested CLAUDE.md are lost**.
65. Permissions: **deny → ask → allow**, first match, specificity irrelevant.
66. Bare-name deny removes the tool from context.
67. `//abs` vs `/settings-relative` path anchors.
68. Permission rules bind Claude; **the sandbox binds the machine**.
69. Hooks: exit 2 blocks; PreToolUse is the policy gate; Stop is the verification gate.
70. Subagents = context isolation; no conversation history (forks inherit everything).
71. CI: `dontAsk` + explicit allows; never `bypassPermissions` with credentials.
72. Agent SDK and Tool Runner are harness-only; Managed Agents adds hosting.

**Context & reliability (73–85)**
73. Prompt caching is a prefix match; ≤4 breakpoints; ~1024-token minimum.
74. Reads ~10%, writes ~125% — caching pays from the second use.
75. Verify with `cache_read_input_tokens`; 0 means an invalidator.
76. Compaction summarises; context editing prunes; memory persists.
77. Append the full content list when compaction is on.
78. Mid-conversation system messages change instructions without breaking the cache.
79. Lost-in-the-middle: fewer chunks, best evidence at the extremes.
80. Long context is a capability, not a strategy — plan as if 200K.
81. Handoffs are structured packages with confidence, provenance and budget.
82. Errors and uncertainty must propagate; omission is not an option.
83. 400s never retryable; jitter is mandatory.
84. Calibrate confidence before thresholding.
85. Log `prompt_version` + `model` + `schema_version` for reproducibility.

**Agents (86–95)**
86. An agent is where the **model decides control flow**.
87. Four-question test: complexity, value, viability, cost of error.
88. If you can draw the flowchart, build the flowchart.
89. Hub-and-spoke; spokes never talk to each other.
90. Expensive coordinator, cheap spokes.
91. Four legitimate multi-agent reasons; nothing else.
92. Multi-agent costs 2–10×; subagents cannot share the parent's cache (forks can).
93. Error compounding: 0.95⁵ ≈ 77%.
94. Multiple termination conditions; verify completion.
95. Plan-then-execute with a deterministic gate for side effects.

**Cross-cutting (96–100)**
96. You cannot make the model safe; you can make the consequences bounded.
97. Injection severity is set by capability — ask what a successful injection could *do*.
98. ACL-filter inside the retrieval query, never after.
99. Cost per **successful task**, at p50/p95/p99 — not per call.
100. "How would I know it broke?" is the tiebreaker between two plausible architectures.
