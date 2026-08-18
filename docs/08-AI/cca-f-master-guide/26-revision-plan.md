# 26 — Topic Checklist and 7-Day Revision Plan

---

## 26.1 Complete CCA-F topic checklist

Tick each only when you can **explain it to someone else without notes**. Items marked ★ are the highest-value
per unit of study time.

### Domain 1 — Agentic Architecture & Orchestration (27%)
- [ ] ★ Agent definition; the four-question test (complexity, value, viability, cost of error)
- [ ] ★ The agent loop and all six `stop_reason` values with the required harness action
- [ ] ★ When **not** to build an agent — "if you can draw the flowchart, build the flowchart"
- [ ] Agent state layers; externalised task state; session resumption from state, not transcript
- [ ] Planning strategies: direct, plan-then-execute, dynamic, hierarchical
- [ ] ★ Plan-then-execute with a deterministic gate
- [ ] Task decomposition: static vs dynamic; independent, verifiable, right-sized, uniform, bounded
- [ ] Single-agent architecture and its limits
- [ ] ★ Hub-and-spoke / coordinator–subagent; why not peer-to-peer
- [ ] ★ The four legitimate reasons for multi-agent
- [ ] Multi-agent trade-offs; the 2–10× cost model; forks vs subagents and the prompt cache
- [ ] Error compounding (0.95⁵ ≈ 77%) and verification between stages
- [ ] Model tiering: expensive coordinator, cheap spokes
- [ ] ★ Termination conditions (all nine) and verified completion
- [ ] Agent failure modes and their detection
- [ ] Orchestration-layer safeguards via hooks
- [ ] ★ Structured handoff packages and error/confidence propagation

### Domain 3 — Claude Code Configuration & Workflows (20%)
- [ ] ★ CLAUDE.md is context, not enforcement
- [ ] ★ The four CLAUDE.md scopes, exact paths, load order and concatenation
- [ ] Subdirectory CLAUDE.md loads on demand; `@import` depth 4; external-import approval
- [ ] ★ `.claude/rules/` and `paths:` frontmatter
- [ ] ★ Compaction survival table
- [ ] Auto memory: `MEMORY.md`, 200 lines / 25KB, per repository, not inherited by subagents
- [ ] Skills vs slash commands vs subagents
- [ ] ★ Permission modes (all six)
- [ ] ★ Rule precedence deny → ask → allow; first match; specificity irrelevant
- [ ] Bare-name deny removes the tool from context
- [ ] Path anchors `//abs`, `~/`, `/settings-relative`, `relative`; allow vs deny depth semantics
- [ ] Compound commands, stripped wrappers, and unstripped environment runners
- [ ] ★ Permission rules bind Claude; the sandbox binds the machine
- [ ] ★ Hooks: events, exit codes, `permissionDecision`, timeouts, PreToolUse/Stop as gates
- [ ] ★ Subagents: frontmatter fields, what is and is not inherited, forks
- [ ] Plan mode; the explore → plan → implement → verify → review loop
- [ ] ★ Headless mode and CI/CD safety rules
- [ ] Context commands: `/context`, `/compact`, `/clear`, `/memory`, `/doctor`, `/permissions`, `/mcp`
- [ ] Agent SDK vs Tool Runner vs Managed Agents

### Domain 4 — Prompt Engineering & Structured Output (20%)
- [ ] ★ Explicit criteria
- [ ] Prompt structure; task last; positive framing; instruction hierarchy
- [ ] Few-shot: selection, boundary cases, contamination
- [ ] ★ Extended thinking (`adaptive` + `effort`) vs prompted CoT; thinking billed as output; `display` default
- [ ] Prompt templates as versioned code; escaping interpolated values
- [ ] ★ Cache-aware prompt ordering
- [ ] ★ Prompt injection taxonomy and the layered defence stack
- [ ] ★ `output_config.format`; `messages.parse()`; `output_format` deprecated
- [ ] ★ `strict: true` on the tool definition; `additionalProperties: false` + `required`
- [ ] ★ Unsupported JSON Schema keywords
- [ ] ★ Check `stop_reason` before parsing
- [ ] ★ Bounded validation retry loops with specific feedback
- [ ] Structured output vs tool call; the legacy fake-tool pattern
- [ ] Schema versioning, enum compatibility, the 24-hour schema cache

### Domain 2 — Tool Design & MCP Integration (18%)
- [ ] ★ Claude requests; the harness executes
- [ ] ★ Tool descriptions: when to call, when not to, what empty means
- [ ] ★ The `is_error` contract
- [ ] Parallel tool results in one user message; matching `tool_use_id`
- [ ] `tool_choice` values; `disable_parallel_tool_use`
- [ ] Tool Runner vs manual loop; Tool Runner ≠ Agent SDK ≠ Managed Agents
- [ ] Tool granularity; boundary = permission boundary; read/write split
- [ ] ★ Authorise on arguments; idempotency keys
- [ ] Anthropic-defined schema-less tools; client-side vs server-side
- [ ] Bash vs dedicated tools; sandboxing; path safety
- [ ] Tool search vs mid-conversation tool changes
- [ ] ★ MCP is an open protocol; host/client/server; JSON-RPC 2.0
- [ ] ★ Primitives by controller; sampling, roots, elicitation
- [ ] ★ MCP tool failures = successful result with `isError`
- [ ] ★ Transports: stdio, Streamable HTTP; SSE deprecated
- [ ] ★ Scopes, precedence, and `${VAR}` expansion
- [ ] MCP naming and permission globs; output limits; `requiresUserInteraction`
- [ ] MCP connector requires both halves
- [ ] ★ MCP security: poisoning, rug pull, credential scoping, multi-tenancy
- [ ] MCP resilience: reconnect policy, timeouts, backgrounding, graceful degradation
- [ ] ★ MCP vs a plain API — the decision

### Domain 5 — Context Management & Reliability (15%)
- [ ] ★ Context budget; signal density; reserve output room
- [ ] ★ Ordering for attention and cache; task last; best evidence at the extremes
- [ ] ★ Prompt caching mechanics and the silent-invalidator audit
- [ ] ★ Compaction vs context editing vs memory
- [ ] Mid-conversation system messages
- [ ] Lost-in-the-middle and its mitigations
- [ ] ★ Long context vs RAG decision, and the access-control override
- [ ] ★ Handoff packages; error and confidence propagation
- [ ] Scratchpad / task-state files
- [ ] ★ Retryable vs non-retryable; backoff with jitter; idempotency
- [ ] Fallbacks, circuit breakers, the degradation ladder
- [ ] Guardrail layers; fail-open vs fail-closed
- [ ] ★ Confidence calibration and escalation design
- [ ] Observability: what to log, tracing agents, alerts that matter
- [ ] Debugging isolation order

### Cross-cutting (not named domains, but assumed)
- [ ] RAG pipeline, chunking, hybrid retrieval, reranking, citations, ACL filtering
- [ ] Evaluation: golden sets, LLM-as-judge, RAG and agent metrics, CI gates
- [ ] Security: threat model, injection defence ranking, capability separation
- [ ] Cost: the cost equation, optimisation order, agent cost curve
- [ ] Deployment: model pinning, config-flag rollback, versioning
- [ ] FDE: discovery, feasibility, production readiness, communication

---

## 26.2 The 7-day revision plan

Assumes you have already read the guide once. Each day is ~3 hours; adjust proportionally.

### Day 1 — Domain 1, part 1 (agent fundamentals) — 27%
| Time | Activity |
|---|---|
| 45 min | Re-read §09.1–09.5 (agent definition, loop, state, planning, single-agent) |
| 30 min | Write the agent loop from memory, including all six `stop_reason` branches. Diff against §9.2.1 |
| 45 min | §16.1, §16.2 (LLM vs code; agent vs workflow). Do the scenarios |
| 30 min | Scenario bank S1, S19 (agent vs workflow; when not to use AI) |
| 30 min | Practice exam Q1–Q13; read every explanation |

**End-of-day test:** state the four-question agent test, all six `stop_reason` actions, and three situations
where a workflow beats an agent.

### Day 2 — Domain 1, part 2 (multi-agent) — 27%
| Time | Activity |
|---|---|
| 45 min | §09.6–09.11 (multi-agent, trade-offs, orchestration, termination, failure modes) |
| 30 min | Draw hub-and-spoke from memory with handoff and result schemas |
| 45 min | §15 architecture patterns — for each, recall the *disqualifier* |
| 30 min | Scenario bank S2, S7, S14 |
| 30 min | Practice exam Q14–Q27 |

**End-of-day test:** name the four legitimate multi-agent reasons; explain why hub-and-spoke beats
peer-to-peer; compute 0.95⁵ and say what to do about it.

### Day 3 — Domain 3 (Claude Code) — 20%
| Time | Activity |
|---|---|
| 60 min | §07 in full |
| 30 min | Reproduce the CLAUDE.md scope table and the **compaction survival table** from memory |
| 30 min | Write five permission rules and predict the outcome of a deny/allow conflict |
| 30 min | Write a PreToolUse hook that blocks a dangerous command (exit 2 + JSON reason) |
| 30 min | Practice exam Q28–Q47; scenario S17 |

**End-of-day test:** explain why CLAUDE.md cannot enforce a rule; state the precedence order; say what survives
`/compact`.

### Day 4 — Domain 4 (prompting & structured output) — 20%
| Time | Activity |
|---|---|
| 45 min | §03 (prompt engineering) |
| 45 min | §04 (structured outputs) |
| 30 min | Write a production extraction schema from memory, with confidence and unresolved fields |
| 30 min | Write the validation retry loop from memory; check the seven design points |
| 30 min | Practice exam Q48–Q67; scenario S15 |

**End-of-day test:** list the unsupported JSON Schema keywords; explain structured output vs tool call; state
where `strict` goes.

### Day 5 — Domain 2 (tools & MCP) — 18%
| Time | Activity |
|---|---|
| 45 min | §05 (tool use) |
| 60 min | §06 (MCP) |
| 20 min | Reproduce: primitives-by-controller, transports, scopes+precedence, `${VAR}` expansion |
| 25 min | Scenario bank S4, S5, S18 |
| 30 min | Practice exam Q68–Q85 |

**End-of-day test:** explain the `is_error` contract; say how an MCP tool failure differs from a protocol error;
give the MCP-vs-direct-tool decision rule.

### Day 6 — Domain 5 + cross-cutting — 15%
| Time | Activity |
|---|---|
| 45 min | §08 (context engineering) |
| 40 min | §12 (reliability) |
| 25 min | §13 (security) — focus on the defence ranking and capability separation |
| 20 min | §14 (cost) — the optimisation order |
| 30 min | Practice exam Q86–Q100; scenarios S10, S11, S12 |

**End-of-day test:** distinguish compaction / context editing / memory; run the silent-invalidator audit from
memory; rank injection defences.

### Day 7 — Integration and drill
| Time | Activity |
|---|---|
| 60 min | **Full timed drill**: 60 random questions from §25 in 120 minutes (or 60 in 60 if short on time) |
| 45 min | Mark by domain; re-read only the sections your misses cite |
| 30 min | §19 case studies — whiteboard three from memory, including *why not the alternatives* |
| 30 min | §22 (traps and heuristics) and §23 (decision trees) — read straight through |
| 15 min | Memorise §24.9 items 1–15 and 86–100 |

**Final self-test — answer all ten out loud:**
1. The six `stop_reason` values and the harness action for each.
2. Four legitimate reasons for multi-agent.
3. Permission rule precedence, and why specificity does not matter.
4. What survives `/compact` in Claude Code.
5. Where `strict: true` goes and what it requires.
6. Compaction vs context editing vs memory.
7. How an MCP tool failure is signalled.
8. The injection defence ranking, top three.
9. The cost optimisation order.
10. "If you can draw the flowchart, ______."

---

## 26.3 The night before

- **Do not learn anything new.** Read §23 (decision trees) and §24.9 (top 100) only.
- Re-read your own list of missed practice questions.
- Sleep. Two minutes per question is a *reading speed* constraint as much as a knowledge one.

## 26.4 During the exam

1. **Read the constraint first.** Latency, cost, compliance, blast radius, determinism — the stem almost always
   names one, and it usually eliminates two options immediately.
2. **Eliminate by disqualifier**, not by attraction. Which options are ruled out by the stated constraint?
3. **Prefer the simplest tier that meets the constraint.** Options that add autonomy, agents or model calls
   without a named need are usually wrong.
4. **Prefer deterministic guardrails over instructions.** Any option that solves a security or reliability
   problem purely with prompt text is usually wrong.
5. **When two options both look right**, ask "how would I know it broke?" — the one with the better detection
   or verification story usually wins.
6. **Flag and move on.** Two minutes each; a flagged question you return to with a fresh eye is cheaper than a
   five-minute stall.
7. **Answer every question.** There is no penalty for a wrong answer, and elimination usually gets you to a
   coin-flip between two.

Good luck.
