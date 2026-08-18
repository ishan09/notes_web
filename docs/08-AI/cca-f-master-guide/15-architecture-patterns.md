# 15 — Architecture Patterns

> **Domain mapping:** Domain 1 — *Agentic Architecture & Orchestration* — **27%**. Scenario questions are
> pattern-recognition questions: read the constraints, identify the pattern, name why the alternatives fail.
>
> Each pattern below is given the same treatment: **architecture, components, data flow, when to use, when NOT
> to use, advantages, disadvantages, failure modes, cost, security, scalability.** Learn the *shape* and the
> *disqualifiers*.

---

## Pattern selection at a glance

```
Is the output a single transformation of the input?           → 15.1 Simple LLM app
  ...and it needs private/current knowledge?                  → 15.2 RAG
  ...and it needs to read or act on live systems?             → 15.3 Tool-calling
Is the sequence of steps unknown in advance?                  → 15.4 Single agent
  ...and one context window cannot hold the work?             → 15.5 / 15.6 Multi-agent
  ...and some actions are irreversible?                       → 15.7 Human-in-the-loop
Is the trigger an event rather than a user?                   → 15.11 Event-driven
Is it high-volume and latency-tolerant?                       → 15.12 Batch
Is a human waiting on every token?                            → 15.13 Real-time
Is it a company-wide assistant over many systems?             → 15.14 Enterprise assistant
```

---

## 15.1 Simple LLM Application

**Architecture**

```
request ─▶ [ validate ] ─▶ [ build prompt ] ─▶ [ Claude ] ─▶ [ validate output ] ─▶ response
```

**Components:** input validation, a versioned prompt template, one Messages API call, structured output +
schema validation, error handling.

**Data flow:** synchronous, single hop. No state, no tools, no retrieval.

**When to use:** classification, extraction, summarisation, translation, rewriting, sentiment, routing — any
pure transformation where all needed information is in the input.

**When NOT to use:** the task needs private data (→ RAG), live state (→ tools), or multiple unknown steps
(→ agent).

| | |
|---|---|
| **Advantages** | Simplest possible; predictable cost and latency; trivially testable; easy to cache; easy to evaluate |
| **Disadvantages** | No knowledge beyond the input; no actions |
| **Failure modes** | Schema violation, truncation (`max_tokens`), refusal, prompt injection from the input itself |
| **Cost** | One call. Prompt caching on the stable prefix is the dominant lever; Batch API halves it for offline work |
| **Security** | Input is untrusted; validate output before use; never interpolate user text into the system prompt |
| **Scalability** | Trivially horizontal; the constraint is provider rate limits — client-side limiter, queue, batch |

> **Why choose this over an agent?** Because it is a transformation, not a decision process. If you can name
> the single call, make the single call.

---

## 15.2 RAG Application

**Architecture**

```
INGEST (offline): sources ─▶ parse ─▶ chunk ─▶ embed ─▶ index (vectors + metadata + text)
QUERY  (online):  question ─▶ rewrite ─▶ hybrid retrieve (k≈50) ─▶ rerank (n≈5)
                            ─▶ assemble context ─▶ Claude (+citations) ─▶ grounding check ─▶ answer
```

**Components:** ingestion pipeline, chunker, embedding model, vector store (+ keyword index), reranker, prompt
assembler, generation call, citation/grounding verification, evaluation harness.

**When to use:** answers must come from a private, large, or changing corpus; provenance is required;
per-document access control is required.

**When NOT to use:** the corpus is small and stable (→ long context + caching); the answer lives in a database
(→ SQL/tools); the corpus changes per second (→ tools against the live system).

| | |
|---|---|
| **Advantages** | Grounding and citations; scales past the context window; updates without retraining; ACL-aware |
| **Disadvantages** | Real infrastructure; retrieval quality is a new, dominant failure surface; ingestion quality gates everything |
| **Failure modes** | Retrieval miss, wrong chunks, chunk lacking context, stale/superseded documents, conflicting documents, injection via corpus, lost-in-the-middle |
| **Cost** | Ingestion (one-off + incremental) + embedding + storage + retrieval + generation. Retrieval usually cuts generation cost dramatically vs long context |
| **Security** | **ACL-filter inside the query, never after**; tenant isolation at storage; retrieved text is untrusted; deletion must propagate to index, caches and logs |
| **Scalability** | Index scales horizontally; watch reranker throughput and embedding cost on re-index |

> **Why choose RAG over long context?** Large corpus, small relevant fraction, per-user access control,
> citations, or frequent change. **Why choose long context instead?** Small stable corpus where the whole thing
> is relevant — caching makes it cheap and there is no retrieval failure mode.

---

## 15.3 Tool-Calling Application

**Architecture**

```
request ─▶ [ Claude + tools ] ──tool_use──▶ [ guardrail wrapper ] ─▶ [ your APIs ]
              ▲                                                          │
              └──────────── tool_result (is_error?) ─────────────────────┘
                            loop while stop_reason == "tool_use"
```

**Components:** tool registry with JSON schemas, the execution wrapper (validate → authorise → timeout →
idempotency → truncate/redact → audit), the loop with `stop_reason` handling, bounded iterations.

**When to use:** the model needs live data or must take actions; the *set* of possible operations is known but
the *sequence* is not; a small number of steps.

**When NOT to use:** the sequence is fixed (→ deterministic workflow); the operation is a single known call
(→ just call it).

| | |
|---|---|
| **Advantages** | Live data and actions; the model handles the messy mapping from intent to operation |
| **Disadvantages** | Tool-selection and argument errors; latency per round trip; cost grows with steps |
| **Failure modes** | Wrong tool, wrong arguments, tool timeout, partial failure, loops, injection via tool output |
| **Cost** | Each step re-sends history — superlinear in steps. Composite tools, PTC and bounded output are the levers |
| **Security** | Authorise on **arguments**; least privilege; split read/write; idempotency keys; audit every call |
| **Scalability** | Downstream APIs become the bottleneck; parallelise independent calls; rate-limit per tenant |

---

## 15.4 Single-Agent System

**Architecture**

```
goal ─▶ ┌──────────────────────────────────────────────┐
        │  loop (bounded):                             │
        │   observe → decide → act → receive           │
        │   task state externalised to a file/record   │
        └──────────────────────────────────────────────┘ ─▶ verified result
```

**Components:** the loop with full `stop_reason` handling, tool registry, **externalised task state**,
termination conditions (steps, budget, wall clock, no-progress, repeat detection), a **verifier**.

**When to use:** the goal is clear but the path is not; the work fits one context window; one permission profile
suffices.

**When NOT to use:** the sequence is knowable (→ workflow); intermediate data cannot fit one window
(→ multi-agent); different phases need different permissions (→ multi-agent).

| | |
|---|---|
| **Advantages** | Adaptable; one context, so no handoff loss; one trajectory to debug; cheapest agentic option |
| **Disadvantages** | Context saturation; degraded tool selection past ~20 tools; no parallelism; unpredictable cost |
| **Failure modes** | Loops, context explosion, wrong plan, unverified completion, injection→action, runaway cost |
| **Cost** | Superlinear in steps. Cache the prefix; bound tool output; cap steps and budget |
| **Security** | Least privilege; plan-then-execute for writes; deterministic gates; audit |
| **Scalability** | Per-session; concurrency limited by rate limits and downstream tools |

---

## 15.5 Multi-Agent System (general)

**Architecture:** several agents with distinct prompts, tools, permissions or models, coordinated by a topology
(sequential, parallel, hierarchical, hub-and-spoke).

**When to use:** exactly four reasons — **context isolation, parallelism, genuine specialisation (different
tools/permissions/models), security compartmentalisation**.

**When NOT to use:** "specialised personas" with identical tool sets and permissions; a fixed sequence
(that is a pipeline, and probably a workflow); anything a single agent demonstrably handles.

| | |
|---|---|
| **Advantages** | Isolated contexts; parallel wall-clock; per-role permissions; contained failures |
| **Disadvantages** | 2–10× cost; orchestration complexity; handoff information loss; N trajectories to debug |
| **Failure modes** | Error compounding (0.95⁵≈77%), handoff loss, confidence laundering, partial failure handling, coordination deadlock |
| **Cost** | Each agent pays for its own system prompt and cannot share the parent's cache (forks can); handoffs and aggregation are overhead |
| **Security** | Cross-agent trust must not be implicit: schema-validate every handoff; a handoff never authorises an action |
| **Scalability** | Parallelism helps wall clock; concurrency caps needed for rate limits |

---

## 15.6 Supervisor / Coordinator Agent (hub-and-spoke) **[the canonical pattern]**

**Architecture**

```
            ┌────────────────────────────────────────────┐
   goal ───▶│ COORDINATOR (expensive model)              │
            │  • decompose  • budget  • aggregate        │
            └───┬──────────┬──────────┬──────────────────┘
   structured   │          │          │   uniform result schema
   handoff ────▶│          │          │◀──────────────
            ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
            │Spoke A│  │Spoke B│  │Spoke C│   own context, own tools,
            └───────┘  └───────┘  └───────┘   own permissions, cheap model
                  (spokes never talk to each other)
```

**Components:** coordinator (planning, budget, aggregation, synthesis), spokes (scoped tools and permissions),
a **structured handoff package**, a **uniform result schema**, an aggregation rule (including confidence),
partial-failure policy, global budget.

**When to use:** decomposable work with verbose subtasks; parallelism helps; roles genuinely differ.

**When NOT to use:** subtasks are interdependent and need continuous negotiation (reconsider the decomposition);
the whole thing fits one context.

| | |
|---|---|
| **Advantages** | O(n) communication; one place for budget/policy/termination; contained failures; comprehensible traces; supports model tiering |
| **Disadvantages** | Coordinator is a bottleneck and a single point of failure; handoff design is real work |
| **Failure modes** | Bad decomposition wastes every spoke; aggregation without defined confidence semantics; a spoke silently omitting a failure; coordinator context blowing up on aggregation |
| **Cost** | Expensive coordinator + cheap spokes is the right tiering: a bad plan wastes all spokes' tokens |
| **Security** | Spokes get minimum tools; the spoke reading untrusted content holds no write credentials |
| **Scalability** | Fan-out with a concurrency cap; return **references**, not content, to keep the coordinator lean |

> **Why hub-and-spoke over peer-to-peer?** O(n) vs O(n²) messages; one enforcement point; contained failures;
> debuggable traces. Peer-to-peer looks more agentic and is far harder to bound. **Hub-and-spoke is the
> expected answer.**

---

## 15.7 Human-in-the-Loop Agent

**Architecture**

```
goal ─▶ [ agent: read-only tools ] ─▶ PLAN (structured)
                                        │
                              [ deterministic policy gate ]
                                        │
                          ┌─── auto-approve (low risk) ───┐
                          │                                ▼
                    [ human approval queue ] ────▶ [ execute writes ] ─▶ verify
                          │  (persists, times out)
                          └─── reject + feedback ──▶ replan (bounded)
```

**Components:** plan generation with `reversible`/`blast_radius`/`risk` per step, a deterministic gate, an
approval queue with persistence and timeouts, an execution engine, verification, audit.

**When to use:** irreversible or high-value actions; regulated decisions; low confidence; novel inputs;
early rollout of any agent with write access.

**When NOT to use:** fully reversible low-stakes actions at high volume (approval becomes the bottleneck) —
use post-hoc audit and sampling review instead.

| | |
|---|---|
| **Advantages** | Bounds blast radius; produces an audit trail; the reviewable plan is also a defence against injection |
| **Disadvantages** | Latency; the human becomes the throughput ceiling; approval fatigue leads to rubber-stamping |
| **Failure modes** | Approval deadlock (no timeout), context-poor requests that cannot be decided quickly, alert fatigue, approvals not persisted across restarts |
| **Cost** | Model cost plus human time — often the dominant term |
| **Security** | The strongest control for irreversible actions; record who approved what, on what evidence |
| **Scalability** | Tier autonomy by risk; batch low-risk approvals; sample rather than review everything |

---

## 15.8 Agent + RAG (agentic RAG)

**Architecture:** retrieval is exposed as a **tool** the agent may call repeatedly, with different queries,
interleaved with other tools.

**When to use:** multi-hop questions; the agent should decide *whether* to retrieve; multiple corpora requiring
routing.

**When NOT to use:** single-hop Q&A — classic RAG is cheaper, faster and more predictable.

| | |
|---|---|
| **Advantages** | Multi-hop reasoning; can skip retrieval entirely; can reformulate after a poor result |
| **Disadvantages** | Variable latency and cost; harder to evaluate; retrieved content enters an agent that has tools |
| **Failure modes** | Repeated identical searches (needs repeat detection and clear empty-result semantics), context explosion from many results, injection via corpus into an agent with capabilities |
| **Cost** | 0..N retrievals plus model turns; bound both |
| **Security** | ACL filter per call using the *user's* identity; retrieved text is untrusted and this agent can act — capability separation matters more here than in classic RAG |
| **Scalability** | Retrieval QPS multiplies by steps; cache query→chunk-IDs |

---

## 15.9 Agent + MCP

**Architecture:** the agent's tools come from one or more MCP servers via the host's MCP client.

**When to use:** capabilities are shared across multiple AI clients; teams own their own capabilities; you want
runtime discovery and the standard permission/approval UX.

**When NOT to use:** one consumer, few tools, latency-critical, or the server is unreachable from the client's
network (note the **[Claude-specific]** MCP connector connects from Anthropic's infrastructure).

| | |
|---|---|
| **Advantages** | Reusable, independently deployable capabilities; runtime discovery; ships tools+prompts+resources as one versioned unit |
| **Disadvantages** | Protocol and operational overhead; another failure surface; third-party trust |
| **Failure modes** | Server unavailable/slow, oversized output, schema rejection, tool poisoning, rug pull, auth expiry |
| **Cost** | Tool schemas consume context — use tool search; oversized results are the quiet cost |
| **Security** | Supply chain: vet, **pin versions**, scope credentials, gate side effects, audit; `requiresUserInteraction` for consent-shaped tools |
| **Scalability** | An MCP gateway centralises authN/Z, audit, rate limiting and curation above ~a dozen teams |

---

## 15.10 Multi-Agent + MCP

**Architecture:** hub-and-spoke where each spoke connects to a **different subset** of MCP servers.

This is where MCP and multi-agent genuinely reinforce each other: the tool set *is* the permission boundary.

```
Coordinator (no MCP servers, no credentials)
  ├─ Research spoke   → web-search MCP        (read-only, no internal access)
  ├─ Data spoke       → warehouse MCP         (read-only role)
  └─ Action spoke     → ticketing MCP (write) (never sees untrusted web content)
```

**When to use:** heterogeneous capabilities with genuinely different trust levels.

**When NOT to use:** it is one workflow with one trust level — the topology is then pure overhead.

| | |
|---|---|
| **Advantages** | Capability separation is structural: the web-reading spoke *cannot* write, because it has no write server |
| **Disadvantages** | Highest complexity; N MCP connection lifecycles to operate; hardest to debug |
| **Failure modes** | All of §15.5 plus all of §15.9; plus cross-agent trust — a compromised spoke's *output* is untrusted input to the coordinator |
| **Cost** | Multi-agent cost multiplier plus per-spoke tool-schema context |
| **Security** | Best-in-class *if* the coordinator schema-validates every spoke result and never lets a handoff authorise an action |
| **Scalability** | Per-spoke concurrency caps; shared MCP gateway |

---

## 15.11 Event-Driven Agent

**Architecture**

```
event source ─▶ queue ─▶ [ dedupe / filter ] ─▶ worker ─▶ agent ─▶ actions
   (webhook,      │                                          │
    alert,        └── DLQ ◀────── failures ──────────────────┘
    cron, PR)
```

**Components:** event ingestion, idempotent dedupe (events are delivered at-least-once), a filter that decides
whether the agent should run at all, worker pool, agent, DLQ, circuit breaker.

**When to use:** automation reacting to system events — CI failures, alerts, new tickets, inbound documents.

**When NOT to use:** high-volume events where a rule would decide correctly (filter deterministically first);
events requiring sub-second response.

| | |
|---|---|
| **Advantages** | No human in the request path; naturally scalable; retryable |
| **Disadvantages** | Nobody is watching; failures are silent unless you instrument them; feedback loops are easy to create |
| **Failure modes** | **Cascade** (the agent's action triggers the event that triggers the agent), duplicate processing, poison events, unbounded cost, event storms |
| **Cost** | Proportional to event volume — which you do not control. Filter aggressively before invoking the model |
| **Security** | **Event payloads are untrusted** (logs, PR descriptions, ticket bodies); least privilege; no ambient credentials |
| **Scalability** | Queue with backpressure; concurrency caps; **circuit breaker after N actions in a window** — the anti-cascade control |

---

## 15.12 Batch AI Processing

**Architecture**

```
dataset ─▶ chunk into jobs ─▶ [ Batch API, custom_id per item ] ─▶ poll ─▶ results
              │                                                            │
              └── checkpoint ◀──────────── validate ──────────────────┬─── DLQ
```

**When to use:** large volumes, latency-tolerant, offline enrichment, backfills, evaluation runs.

**When NOT to use:** anything a user is waiting for.

| | |
|---|---|
| **Advantages** | **[Claude-specific]** ~50% cost; no rate-limit fight; simple to reason about |
| **Disadvantages** | Latency measured in minutes–hours; no interactivity |
| **Failure modes** | Partial failures, poison records, results correlated by position instead of `custom_id`, no resumability |
| **Cost** | ~50% of synchronous; caching still applies; model tier is the other lever |
| **Security** | Same data controls; watch for PII in bulk exports and in the results store |
| **Scalability** | Excellent. Checkpoint for resumability; DLQ for failures; keep it off the interactive rate-limit budget |

> **Memorise:** batch results return in **any order** — key by `custom_id`, never by position. Structured
> outputs work with the Batches API; server-side refusal fallbacks do not.

---

## 15.13 Real-Time AI Application

**Architecture**

```
client ◀══ SSE / WebSocket ══ server ─▶ [ Claude, streaming ] ─▶ incremental render
                                │
                                └─ cached prefix, small model, bounded output
```

**When to use:** chat, live assistance, anything where a human waits on tokens.

**When NOT to use:** the answer requires long tool chains (make it async with progress, or set expectations).

| | |
|---|---|
| **Advantages** | Best perceived latency; natural progress indication |
| **Disadvantages** | Streaming failure handling is genuinely harder; state must be server-side for reconnects |
| **Failure modes** | Mid-stream failure after partial display; no resumability on the API stream; slow consumers holding upstream connections; ballooning p99 from output length |
| **Cost** | Same per token; TTFT dominated by prefix size — cache it |
| **Security** | Validate output **before** display where policy matters — streaming makes post-hoc filtering hard, so gate what can be streamed |
| **Scalability** | Long-lived connections; bounded server-side buffers; backpressure policy for slow clients |

---

## 15.14 Enterprise AI Assistant

**Architecture**

```
                       ┌──────────── identity / SSO ────────────┐
user ─▶ gateway ─▶ router ─▶ ┌ knowledge (RAG, ACL-filtered) ┐
                            ├ systems (MCP / tools, per-user) ┤─▶ Claude ─▶ guardrails ─▶ answer
                            └ actions (gated, HITL)          ┘        │
                                                                  audit + eval
```

**Components:** SSO and per-user authorisation propagated end to end; a router that classifies intent and
selects corpus/tools; ACL-filtered retrieval; MCP gateway for systems; guardrails; audit; evaluation;
cost attribution per department.

**When to use:** a broad internal assistant spanning several systems and knowledge sources.

**When NOT to use:** a single well-defined workflow — build that workflow instead. The generic-assistant framing
is how these projects become unevaluable.

| | |
|---|---|
| **Advantages** | One surface for many capabilities; central governance |
| **Disadvantages** | Scope sprawl; hardest thing to evaluate (no single task definition); adoption depends on the weakest capability |
| **Failure modes** | Wrong routing, cross-tenant/ACL leakage, stale knowledge, injection via corpus, unmeasurable quality |
| **Cost** | Attribute per department; cache aggressively; route by complexity |
| **Security** | Per-user authorisation everywhere; ACL-filtered retrieval; least-privilege tools; full audit; residency controls |
| **Scalability** | Per-tenant quotas; MCP gateway; async for long work |

> **The most common enterprise mistake:** launching a generic "ask anything" assistant. It cannot be evaluated,
> so it cannot be improved, and it fails visibly on the first out-of-scope question. **Launch 2–3 well-scoped,
> measurable capabilities and expand.**

---

## Key takeaways

- Patterns are chosen by **constraints**, not by sophistication. Read the stem for latency, cost, blast radius,
  determinism and compliance before choosing.
- The ladder is: single call → RAG → tools → single agent → multi-agent. **Step up only when the current tier
  provably fails.**
- Hub-and-spoke is the default multi-agent topology; peer-to-peer is rarely the right answer.
- Plan-then-execute with a deterministic gate is the standard structure for any agent with side effects.
- Event-driven agents need a **circuit breaker** (cascades) and aggressive pre-filtering (cost).
- Batch = ~50% cost, results keyed by `custom_id`.
- Enterprise assistants fail on scope, not on technology.

## Things to memorise

- The pattern-selection tree at the top of this section.
- Hub-and-spoke properties.
- Each pattern's *disqualifier* — the condition that rules it out.
- Event-driven cascade risk; batch ordering; real-time streaming failure handling.

## Common mistakes

- Choosing multi-agent for a fixed pipeline.
- Agentic RAG for single-hop Q&A.
- MCP for a single consumer on a latency-critical path.
- Event-driven agents without dedupe or a circuit breaker.
- Correlating batch results by position.
- A generic enterprise assistant with no measurable task.

---

## Scenario questions

**Q1.** A logistics company wants "an AI that handles shipping exceptions": detect a delayed shipment, determine
the cause, decide on a remedy (reroute, notify, refund), and execute. 5,000 exceptions/day. Which pattern?

<details><summary>Answer</summary>

**Event-driven + workflow with a bounded agentic step and human-in-the-loop for costly remedies.** Not a
free-roaming agent.

Design:
- **Event-driven ingestion** from the tracking system, with idempotent dedupe (at-least-once delivery) and a
  **deterministic pre-filter**: most delays match known patterns (weather hold, customs, carrier scan gap) and
  should be handled by rules, never reaching the model. At 5,000/day, filtering is the difference between a
  viable and an unviable cost model.
- **Classification** (cheap model, structured output with enum causes) for the residue.
- **Remedy selection**: a rules engine for the common cases; a **bounded agent** only for genuinely ambiguous
  exceptions, with read-only tools to investigate.
- **Plan-then-execute**: the agent proposes a remedy with `cost_estimate` and `reversible`; a deterministic gate
  checks policy (refund caps, reroute eligibility, customer tier).
- **Tiered autonomy**: auto-execute notifications and low-cost reroutes; **human approval** for refunds above a
  threshold. Batch the approvals.
- **Circuit breaker**: cap remedies per carrier/lane per hour to prevent a systemic outage triggering 5,000
  refunds.
- **Idempotency keys** on every write; full audit; DLQ for failures.

Why not a single autonomous agent: the sequence is largely known (that is a workflow), the volume makes
per-event agent cost significant, and remedies are irreversible money movements. Why not pure rules: the
ambiguous tail genuinely needs judgement — which is exactly where the bounded agent earns its place.
</details>

**Q2.** An investment bank wants an assistant answering questions over research reports, market data (database),
and news (real-time). Which pattern, and what is the critical design decision?

<details><summary>Answer</summary>

**Query routing over three heterogeneous sources** — the critical design decision is **routing by data type**,
not the choice of agent framework.

- **Research reports** → RAG with citations (unstructured, provenance required, ACL-filtered by entitlement).
- **Market data** → **tools/SQL**, never RAG. Exact numbers live in a database; semantic search over serialised
  rows gives approximate answers to exact questions.
- **News** → a live search/fetch tool with recency filters; do not index it if it must be current.

Architecture: a cheap classifier or an agent with three clearly-described tools. Prefer **classic routing +
tools** over agentic RAG unless multi-hop questions ("how did vendor X's earnings compare to what analyst Y
predicted?") are common — those genuinely need iteration.

Non-negotiables in this domain:
- **Entitlements**: research access is licensed per user and per publisher. ACL-filter inside the retrieval
  query; re-check citations at answer time.
- **Grounding**: every number must trace to a tool result or a cited document; a deterministic post-check
  rejects unsourced figures.
- **Compliance**: no investment advice; disclaimers; full audit of every question and answer; surveillance
  retention.
- **Freshness**: market data must never be cached beyond its validity; label the as-of time in the answer.
- **Injection**: news pages are untrusted content — and if the assistant later gains any action capability,
  capability separation becomes mandatory.
</details>

**Q3.** A team's document-processing pipeline uses 6 sequential agents; end-to-end accuracy is 71% despite each
stage testing at ~94%. Explain and fix.

<details><summary>Answer</summary>

**Error compounding**: 0.94⁶ ≈ 0.69 — the observed 71% is exactly what the per-stage numbers predict. Nothing is
"broken"; the architecture multiplies error.

Fixes, in order of impact:
1. **Reduce the number of LLM stages.** Most of the six are almost certainly deterministic (validation,
   normalisation, routing, persistence). Every stage removed multiplies accuracy back up. Two model calls plus
   deterministic code is the target shape.
2. **Verification between stages.** A cheap deterministic check after each model stage (schema, business rules,
   cross-field reconciliation) converts a silent error into a caught one — this is what breaks the multiplication.
3. **Confidence propagation.** Each stage emits confidence and provenance; the pipeline routes low-confidence
   items to review instead of passing them down.
4. **Combine adjacent stages.** Two stages sharing context often do better as one call than as two with a lossy
   handoff.
5. **Fix the weakest stage first** — measure per-stage accuracy and attack the lowest, since the product is
   dominated by it.
6. **Human review for the uncertain tail.** 71% autonomous with 29% reviewed can be ~100% correct end to end,
   which is usually what the business actually wants.

The generalisable lesson: **sequential LLM stages multiply error. Either shorten the chain or verify between
links.**
</details>

**Q4.** A startup wants to launch "an AI employee" that can do anything across Slack, GitHub, Jira and Google
Drive. Advise.

<details><summary>Answer</summary>

Advise against the framing, and propose a scoped alternative — this is the classic enterprise-assistant failure.

Why it fails:
- **Unevaluable.** "Anything" has no success metric, so it cannot be improved or defended.
- **Unbounded blast radius.** Write access across four systems, driven by content from all four (Slack messages,
  issue bodies, PR descriptions, documents) — a maximal injection surface with maximal capability.
- **Adoption dies on the first bad experience** in the weakest capability.
- **Cost is unpredictable** with no task definition to budget against.

Proposal:
1. **Pick 2–3 concrete, measurable jobs**, e.g. "triage new Jira bugs and propose a priority + component",
   "summarise a Slack thread into a Jira ticket", "review PRs against our checklist". Each has a definition of
   done and an accuracy metric.
2. **Read-only first.** Ship with proposals, not actions; measure acceptance rate. Graduate individual actions
   to autonomy only where the measured accuracy justifies it.
3. **Capability separation.** The component reading untrusted content (Slack, issues, PRs) holds no write
   credentials and emits a validated schema.
4. **Per-user authorisation** propagated end to end — the agent acts *as the requesting user*, never as a
   superuser bot with the union of all permissions.
5. **MCP** for the four systems *if* multiple internal clients will reuse them; direct tools otherwise. Curate
   the tool set per job rather than exposing everything.
6. **Evaluation and observability from day one**, and a cost budget per job.
7. **Expand by evidence.** Each new capability earns its place with an eval set and an adoption metric.

The sentence to deliver: *"An AI employee is a positioning statement, not an architecture. Ship three jobs it
does measurably well, and the positioning takes care of itself."*
</details>
