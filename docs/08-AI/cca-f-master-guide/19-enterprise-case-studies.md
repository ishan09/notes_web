# 19 — Enterprise Case Studies

> **Domain mapping:** Domains 1 and 3 primarily. The blueprint's scenario questions are anchored to a small set
> of realistic contexts — customer support, code generation, multi-agent research, developer tooling, CI/CD, and
> structured extraction. **All six appear below**, plus two more.
>
> Each case study follows the same structure. If you can whiteboard all eight from memory — components, data
> flow, security model, evaluation, failure handling, and *why this architecture and not the alternatives* —
> you are ready for Domain 1.

---

## Case Study 1 — Enterprise Knowledge Assistant

### Requirements
Answer employee questions from ~200K internal documents (policies, runbooks, product docs, Confluence, Google
Drive). 8,000 employees, ~15K questions/day. Answers must be cited. Access must respect existing document
permissions.

### Constraints
Documents change daily. Permissions are per-document and per-group. p95 latency < 5s. Budget < $8K/month. SOC 2;
EU data residency for EU employees.

### Architecture

```
                    ┌─── SSO / IdP (groups, entitlements) ───┐
employee ─▶ gateway ─▶ router ─▶ ┌ ACL-filtered hybrid retrieval ┐
                                 │  vector + BM25 → reranker     │─▶ Claude Sonnet 5
                                 └───────────────────────────────┘   (+ citations)
                                                                        │
        ingestion (incremental, permission-aware) ──▶ index      guardrails → answer
                                                                        │
                                                          traces, evals, cost/dept
```

### Components
Connector-based incremental ingestion carrying **source ACLs** into chunk metadata; contextual chunking
(title > section > date prepended); hybrid retrieval; cross-encoder reranker; Claude Sonnet 5 with the
**[Claude-specific] citations** feature; answer-time authorisation re-check; feedback capture.

### Data flow
Question → resolve the user's groups from the IdP → rewrite the query using conversation context → hybrid
retrieve k=50 **pre-filtered by ACL** → rerank to 5 → assemble with best evidence at the extremes and the task
last → generate with citations → verify every cited document is readable by this user → return.

### Security
**ACL filtering inside the retrieval query, never after** (post-filtering leaks through counts and ranks).
Answer-time re-check as defence in depth. Deletion propagates to index, caches, and traces. `inference_geo`
pinned for EU users. Retrieved content is untrusted — delimited, with an explicit no-instructions rule.
Read-only: no tools, so blast radius is bounded to a wrong answer.

### Evaluation
Retrieval metrics (recall@k, MRR) separately from answer metrics (faithfulness, correctness, **abstention
rate**). A golden set of ~400 questions across departments, refreshed weekly from production. Cross-group
authorisation tests in CI.

### Failure handling
Retrieval below threshold ⇒ "I could not find this" plus a link to raise a ticket. Vector store down ⇒ BM25
fallback. Model 429 ⇒ backoff, then a queued response. Conflicting documents ⇒ prefer the later `effective_date`
and say so.

### Cost
Prompt caching on the system prompt and instructions; ~1.5K retrieved tokens per request; Sonnet 5. Roughly
15K × (2K in + 400 out) ≈ well within budget once caching lands. Cost attributed per department.

### Why this architecture
RAG rather than long context because 200K documents is far past any window, permissions differ per user (which
alone rules out a shared cached prefix), and citations are required. Sonnet rather than Opus because Q&A over
retrieved context is not reasoning-bound — verified on the eval set. No tools, because read-only answers meet
the requirement and eliminate the entire action-security surface.

### Alternatives and trade-offs
*Long context per department*: fails on per-document ACLs. *Fine-tuning on the corpus*: no citations, no access
control, stale within a week. *Agentic RAG*: unnecessary for single-hop questions; adds variable latency.
*Opus*: 1.7× cost for no measured gain.

---

## Case Study 2 — Customer Support Agent **[named exam scenario]**

### Requirements
Handle tier-1 support in chat: answer questions, look up orders, process returns within policy, escalate
otherwise. 30K conversations/day. Must integrate with the CRM and the order system.

### Constraints
p95 TTFT < 1.5s. Refunds are money movements. Multi-turn with memory across a session. 12 languages. Regulatory
requirement: a human must be reachable.

### Architecture

```
chat ─▶ [ session store ] ─▶ intent router (Haiku, structured output)
   │                              │
   │        ┌─────────────────────┼─────────────────────┐
   │        ▼                     ▼                     ▼
   │   KB answer (RAG)      order lookup (tools)   return/refund
   │        │                     │                     │
   │        │                     │            plan → policy gate → approval?
   │        └──────────┬──────────┴──────────┬──────────┘
   │                   ▼                     ▼
   └────────── Claude Sonnet 5 (streaming) ─▶ guardrails ─▶ reply
                        │
                 escalate_to_human tool  ─▶ agent queue (structured handoff)
```

### Agent design
**Not a free-roaming agent.** A router plus three bounded flows. The refund flow is **plan-then-execute**:
read-only investigation → structured plan with `amount_cents`, `reversible`, `policy_basis` → deterministic
policy gate (within window? within cap? order belongs to this customer? not already refunded?) → auto-execute
below a threshold, human approval above it.

### Tool design
`search_kb`, `get_order`, `get_return_policy`, `create_return_label`, `issue_refund` (idempotency key from
`tool_use_id`, value cap, policy-gated), `escalate_to_human`. Read tools and write tools are separate
allowlists; the write set is only present in the refund route.

### Security
The agent acts **as the authenticated customer** — `get_order` authorises on (customer, order), not just on the
tool. Customer messages are untrusted (direct injection); KB content is untrusted (indirect). Refunds are
capped, idempotent, reversible and audited. Escalation is always available — a regulatory requirement, and also
the loop-breaker.

### Evaluation
Containment rate (resolved without a human), CSAT, escalation rate and reason mix, tool-selection accuracy,
policy-violation rate (must be zero), refund accuracy, cost per conversation, TTFT.

### Failure handling
Order system down ⇒ degrade to KB answers and say the order system is unavailable. Two failed KB searches ⇒
escalate (never loop). Low confidence ⇒ escalate. Any policy-gate rejection ⇒ escalate with the reason.

### Cost
Haiku router + Sonnet 5 main + prompt caching on the persona, policy summary and tool definitions. Compaction on
long conversations. Streaming for TTFT.

### Why this architecture
A router with bounded flows rather than one agent: the flows are known (that is the flowchart), cost and latency
become predictable, and each flow gets exactly the tools it needs. Plan-then-execute on refunds because money
movement is irreversible.

### Alternatives
*One agent with all tools*: worse tool selection, write tools present in every conversation (unnecessary blast
radius), unpredictable cost. *Fully deterministic decision tree*: cannot handle language variation — the reason
an LLM is here at all. *Full autonomy on refunds*: fails the irreversibility test.

---

## Case Study 3 — Software Engineering Agent **[named exam scenario]**

### Requirements
Given a ticket, produce a PR: understand the codebase, implement, write tests, and open a PR for human review.
A 2M-line monorepo, 8 languages.

### Constraints
Must never push to main. Must not leak proprietary code. Cost < $5/PR. Tests must pass before the PR opens.

### Architecture

```
ticket ─▶ [ Explore subagent ]──▶ summary ─▶ [ Plan (plan mode) ] ─▶ human approves plan?
                                                      │
                                          [ Implement agent ]
                                            │  PostToolUse hook: format+lint+typecheck
                                            ▼
                                          [ run tests ]  ◀── Stop hook refuses to stop until green
                                                      │
                                     [ Review subagent, read-only ]
                                                      │
                                   commit to branch ─▶ non-agentic step opens PR ─▶ human
```

### Agent design
**[Claude Code-specific]** Explore subagent for context isolation (reading 40 files stays out of the main
context); plan mode for a reviewable plan before implementation; the implement agent with an externalised
`PLAN.md` task state; a read-only review subagent; hooks as the enforcement layer.

### Tool design
Dedicated tools rather than raw bash: `read_file`, `edit_file` (with a **staleness check** — reject a write if
the file changed since last read), `search_code`, `run_tests`, `git_commit`. A narrow sandboxed `bash` for the
long tail. **No `git_push`** — that is the whole safety design.

### Security
Ticket text is untrusted (indirect injection). Sandbox with an **egress allowlist** — proprietary code cannot
leave. Deny edits to `.github/**`, `.claude/**` and infra paths (persistence prevention). Ephemeral
least-privilege credentials. The agent commits to a branch; a non-agentic step opens the PR; a human merges.

### Evaluation
PR acceptance rate, tests-passing rate at PR time, review-comment density, cost per PR, human edit distance,
regression rate for merged agent PRs.

### Failure handling
Tests fail ⇒ the Stop hook refuses to finish and feeds failures back (bounded to 3 attempts). Cannot complete ⇒
open a **draft** PR with a structured "what I did / what I could not do / why" note. Budget exceeded ⇒ terminate
with a resumable status.

### Cost
Opus 5 at `effort: "xhigh"` for implementation (this is the workload where capability pays), cheaper models for
exploration and review. Prompt caching on the system prompt, tool definitions and CLAUDE.md. Context editing to
prune stale tool results. Bounded steps.

### Why this architecture
Genuinely agentic: the steps cannot be known in advance. The reliability comes from the **verifier in the loop**
(tests + hooks), not from the model. Subagents are justified by context isolation, which is provable here.

### Alternatives
*One agent doing everything in one context*: saturates on a 2M-line repo. *No plan approval*: wastes an entire
implementation run on a wrong plan. *Agent with merge rights*: unacceptable blast radius on any injection.

---

## Case Study 4 — Data Analysis Agent

### Requirements
Answer analytical questions over a warehouse in natural language, producing numbers and charts. 200 analysts.

### Constraints
Must never return wrong numbers silently. Must not run expensive queries. Row-level security by department.

### Architecture

```
question ─▶ [ schema retrieval: relevant tables/columns only ]
         ─▶ Claude generates SQL (structured output)
         ─▶ [ deterministic validator: SELECT-only, allowed views, LIMIT, cost estimate ]
         ─▶ execute on a read replica as the USER's role (RLS applies)
         ─▶ results ─▶ Claude explains + chart spec ─▶ answer with the SQL shown
```

### Why the SQL is shown
**Verifiability.** The analyst can read the query. That single design choice converts an unverifiable answer
into a checkable one, and it is the difference between a tool analysts trust and one they do not.

### Tool design
`get_schema(topic)` (retrieval over table/column documentation — never dump the whole schema), `run_query(sql)`
gated by the validator, `render_chart(spec)`. **No `execute_sql` free-for-all**: the validator enforces
SELECT-only, an allowlist of curated views, a mandatory `LIMIT`, a query-cost ceiling and a statement timeout.

### Security
Execute **as the requesting user's database role**, so row-level security applies at the engine and not in
application logic. Read replica only. No DDL. Results are capped and audited.

### Evaluation
Execution success rate, **numeric correctness** against a golden set of question→known-answer pairs, query cost
distribution, analyst override/edit rate (the honest quality metric).

### Failure handling
Query fails ⇒ return the database error to the model for one bounded repair attempt, then escalate. Cost
estimate exceeded ⇒ refuse and suggest a narrower question. Empty result ⇒ say so; never fabricate.

### Why this architecture
Text-to-SQL rather than RAG, because the questions have **exact** answers in structured data. The critical
insight for the exam: **route by data type** — semantic search over serialised rows gives approximate answers to
exact questions.

### Alternatives
*RAG over serialised rows*: approximate answers to exact questions — wrong tool. *Pre-built dashboards*:
cannot handle novel questions (which is why the LLM is here). *Agent with a raw SQL tool and no validator*:
unbounded cost and unbounded data exposure.

---

## Case Study 5 — Document Processing Pipeline **[named exam scenario]**

### Requirements
Process 50K invoices/day: extract 20 fields, validate against POs, categorise to GL codes, route exceptions.

### Constraints
99.5% field accuracy on critical fields. Cost < $0.02/invoice. 4-hour SLA (batch-friendly). Full audit trail.

### Architecture

```
S3 ─▶ [ pre-checks: size, pages, OCR confidence ] ─▶ chunk into batch jobs
   ─▶ [ Batch API: extract (structured output, custom_id per doc) ]
   ─▶ [ deterministic validation: schema, totals reconcile, vendor exists, PO match ]
   ─▶ [ categorise: GL mapping table first; model only for the residue ]
   ─▶ confidence/validation gate ─┬─ pass ─▶ ERP write (idempotent)
                                  └─ fail ─▶ human review queue ─▶ feedback into evals
                                  └─ error ─▶ DLQ
```

### Why this is a workflow, not an agent
Every step is known. The sentence "extract, validate, categorise, route" **is** the flowchart. Two model calls
(extract, and categorise only for the residue); everything else deterministic.

### Structured output design
`required` + nullable for every field (so "absent from the document" is distinguishable from "the model
failed"), enums for currency and category, integers for money in minor units, plus `extraction_confidence` and
`unresolved_fields[]`. Bounded retry ladder: repair once with the specific error → re-ask at a higher tier →
DLQ.

### Evaluation
**Field-level** accuracy (not record-level), per-field **null rate** (the early-warning signal for a vendor
template change), validation-failure rate, human-override rate, cost per invoice.

### Cost
**[Claude-specific] Batch API ≈ 50%**, prompt caching on the schema and instructions (identical across all 50K
calls — the largest single saving), Haiku for extraction with escalation to Sonnet on low confidence, GL mapping
by table lookup rather than by model.

### Failure handling
Truncation (`stop_reason == "max_tokens"`) ⇒ split by page range, never parse. Refusal ⇒ DLQ. Validation failure
⇒ bounded repair. Poor OCR ⇒ rejected at pre-check, before any spend.

### Why this architecture
Batch because it is latency-tolerant at volume. Deterministic validation because totals reconciling is a
computation, not a judgement. Human review for the uncertain tail, which is how 99.5% is actually achieved:
~95% autonomous plus ~5% reviewed.

### Alternatives
*Multi-agent pipeline*: error compounding (§15, Q3) and 5× the cost for no benefit. *Synchronous API*: rate-limit
fights and double the cost. *Opus for everything*: cost target missed by an order of magnitude.

---

## Case Study 6 — Multi-Agent Research System **[named exam scenario]**

### Requirements
Given a research question, search across 20+ sources, synthesise, and produce a cited report.

### Constraints
Every claim must be cited. Runs may take 20 minutes. Budget $5/report.

### Architecture — hub-and-spoke

```
question ─▶ COORDINATOR (Opus 5)
              │ decompose → N independent research subtasks
              │ structured handoff per subtask (goal, constraints, schema, budget)
              ├─▶ spoke 1 (Sonnet/Haiku) ─▶ {source, findings[], quotes[], confidence, unresolved[]}
              ├─▶ spoke 2 ...                (artifacts by REFERENCE, not inline)
              ├─▶ spoke N
              │ aggregate (dedupe, conflict detection, min() confidence)
              ▼
          synthesis ─▶ citation validator ─▶ report
```

### Agent design
Coordinator on the expensive model (decomposition under ambiguity is where capability compounds); spokes on
cheap models. Spokes **never talk to each other**. Each spoke gets a **structured handoff package**, not the
transcript, and returns a **uniform schema**. Large artefacts go to object storage and return as URIs so the
coordinator's context does not blow up on aggregation.

### Error propagation
A failed spoke returns a failure record with `sources_attempted` vs `sources_succeeded` — **omission is not a
permitted output**. Confidence aggregates by `min()` for conjunctive claims. The report states coverage gaps
explicitly. A deterministic validator rejects a report whose stated confidence exceeds the minimum of its
sources, or whose citations do not resolve to a returned quote.

### Security
Web content is untrusted and the spokes read it — so spokes hold **no write credentials and no internal data
access** (capability separation). Egress allowlisting. The coordinator schema-validates every spoke result; a
handoff never authorises an action.

### Evaluation
Citation validity (every citation resolves and the quoted span exists), claim coverage, source diversity,
factual accuracy against a golden set, cost and wall clock per report, spoke failure rate.

### Cost
20 spokes × ~$0.15 + coordinator ≈ within $5 if spokes are budget-bounded and return summaries rather than raw
content. Per-spoke and global budgets; concurrency cap for rate limits.

### Why multi-agent here
Two provable reasons: **context isolation** (20 sources × 100 pages cannot fit one window) and **parallelism**
(20 minutes serial becomes ~2 minutes). Not "personas".

### Alternatives
*Single agent*: saturates by source 8 (§9, Q2). *Deterministic map-reduce over single-shot calls*: cheaper and
more predictable — **choose this if the decomposition does not need model judgement**. *Peer-to-peer agents*:
O(n²) messages, unbounded, undebuggable.

---

## Case Study 7 — Enterprise MCP Platform

### Requirements
40 teams want to expose their systems to internal AI agents. Central governance is required.

### Architecture

```
   agents / Claude Code / CI  ──▶ ┌─────────── MCP GATEWAY ───────────┐
                                  │ authN (OAuth), authZ per user     │
                                  │ audit, rate limits, egress policy │
                                  │ version pinning, curated catalogue│
                                  └────┬──────────┬──────────┬────────┘
                                  ┌────▼───┐ ┌────▼────┐ ┌───▼─────┐
                                  │ Jira   │ │ Datadog │ │ internal│
                                  │ server │ │ server  │ │ data API│
                                  └────────┘ └─────────┘ └─────────┘
```

### Governance
A **certification process** for servers: tool descriptions reviewed (they are prompt surface and a poisoning
vector), schemas validated, credential scopes minimised, output size bounded, and a **re-review required on
every version bump**. Versions are pinned centrally; `@latest` is prohibited.

### Why a gateway
Central authN/Z and audit; one place to revoke a compromised server; uniform rate limiting; egress control; and
a **curated catalogue** that prevents the 200-tool context problem. The cost is new infrastructure and a
gatekeeping process — worth it above roughly a dozen teams or in any regulated environment.

### Security
Per-user OAuth so authorisation is per principal rather than per deployment. Tenant/user scope derived from the
token, never from a tool argument. Supply-chain controls: vet, pin, mirror, re-review, and alert on
capability-set changes (`list_changed`). `requiresUserInteraction` for consent-shaped tools.

### Scaling the tool surface
**Tool search** with `defer_loading` so hundreds of tools do not enter every context, plus per-route/per-agent
server enablement (which is also the blast-radius control). Server instructions ≤2KB and written to say *when*
Claude should search for these tools.

### Failure handling
A server outage must **degrade** consuming agents, not break them: with tool search enabled, the failed server
and its error are reported so the agent can tell the user what is unavailable.

### Why this architecture
It only makes sense **because there are 40 teams and many consumers**. With one consumer, direct tool
definitions win (§16.6). The gateway is an organisational answer to an organisational problem.

---

## Case Study 8 — Agent With Write Access (the hardest case)

### Requirements
An operations agent that can modify production configuration and data in response to requests and alerts.

### The governing question
**What is the worst thing one wrong call can do, and can it be undone?** Everything below follows from bounding
that answer.

### Architecture

```
request/alert ─▶ [ READER: read-only tools, NO credentials ]
                     │ emits a validated ChangePlan schema
                     ▼
              [ deterministic policy gate ]
                 allowed tables/actions? row cap? WHERE required?
                 resource belongs to requester? change freeze? rate limit?
                     │
        ┌── low risk & reversible ──┐             ┌── otherwise ──┐
        ▼                            ▼             ▼
   [ execute: narrow, idempotent, transactional ]  [ human approval queue ]
        │                                              │ (persists, times out,
        ▼                                              │  shows a diff preview)
   verify + audit + reversible record ◀────────────────┘
```

### Controls, layered
- **Identity**: the agent acts **as the requesting user**, never as a superuser service account.
- **Capability separation**: the component reading untrusted content holds no write tools.
- **Plan-then-execute**: nothing executes directly from reasoning; the plan is a reviewable artefact.
- **Narrow tools**: `update_customer_email(id, email)`, never `execute_sql`.
- **Idempotency** keyed by `tool_use_id`; **transactional** with a row-count assertion and rollback on mismatch.
- **Reversibility**: soft deletes, versioned writes, a tested undo path, changes tagged for bulk revert.
- **Tiered autonomy**: auto for single-row reversible low-value changes; approval above thresholds; **never**
  automate bulk deletes or schema changes.
- **Rate and volume caps** per session, user and hour; a **circuit breaker** after N actions in a window.
- **Audit**: request → evidence → plan → gate verdict → approval → action → rows affected → outcome, immutable.
- **Kill switch** and a rollback runbook rehearsed in a game day.

### Evaluation and assurance
Injection-resistance tests as a CI hard gate; cross-user authorisation tests; approval-decision quality
sampling; mean time to detect and to revert an incorrect change.

### Why this architecture
Because you cannot make the model safe — you can only bound the consequences. Every element above either
reduces capability, gates an action, or makes it reversible and detectable.

### The rollout that actually works
Ship **read-only** first (the agent proposes, humans execute), measure proposal acceptance rate per action type,
and graduate individual action types to autonomy only where the measured accuracy justifies it. This reaches
near-full autonomy faster than launching autonomous and being switched off after the first bad week.

---

## Cross-case patterns

| Pattern | Appears in |
|---|---|
| **Plan-then-execute with a deterministic gate** | 2, 3, 8 |
| **Capability separation (reader/actor)** | 2, 6, 8 |
| **Verifier in the loop** | 3, 4, 5 |
| **Workflow, not agent** | 2 (routes), 5 |
| **Hub-and-spoke with structured handoffs** | 6 |
| **ACL-filtered retrieval** | 1 |
| **Route by data type** | 4 (SQL), 1 (RAG) |
| **Human review for the uncertain tail** | 1, 2, 5, 8 |
| **Batch + caching for volume** | 5 |
| **Subagents for context isolation** | 3, 6 |

**The single most repeated idea across all eight:** *the model supplies judgement; deterministic code supplies
guarantees; humans supply approval where the action is irreversible.*
