# 08 — Context Engineering

> **Domain mapping:** Domain 5 — *Context Management & Reliability* — **15%**. The blueprint names
> **long-context preservation**, **handoff patterns between agents**, and **error propagation**. Context is also
> the dominant failure mode of Domain 1's agents, so treat §08 and §09 as one topic.

---

## 8.1 Fundamentals

### 8.1.1 Context engineering vs prompt engineering

**Prompt engineering** asks: *how do I phrase the instruction?*
**Context engineering** asks: *what information should be in the window at this moment, in what order, at what
cost?*

For single-turn applications, prompting dominates. For agents and long-running systems, **context engineering
dominates** — most agent failures at step 15 are context failures, not reasoning failures.

### 8.1.2 The context budget

Every request has a fixed budget. Spend it deliberately:

```
┌──────────────────── 1,000,000 tokens (Opus 5 / Sonnet 5 / Fable 5) ─────────────────┐
│ tools │ system │ conversation history │ retrieved context │ scratch │ output room   │
└──────┴────────┴──────────────────────┴───────────────────┴─────────┴───────────────┘
   ~2K     ~3K        grows unboundedly       you control      agent      max_tokens
                          ▲                                              (reserve it!)
                    the thing that kills agents
```

Two rules:

1. **Reserve output room.** `max_tokens` must fit. A context filled to 99% leaves no room to answer.
2. **Budget per component.** Give history, retrieval and scratch explicit ceilings, and enforce them. An
   unbudgeted component will consume everything.

A worked budget for a support agent (200K working target, even on a 1M model — see §8.4):

| Component | Budget | Enforcement |
|---|---|---|
| Tools | 3K | Tool search / curated set |
| System prompt + examples | 5K | Reviewed, versioned, capped |
| Retrieved knowledge | 8K | top-k after rerank, hard truncate |
| Account/order data | 4K | Field allowlist in tool output |
| Conversation history | 20K | Compaction at 20K |
| Response | 2K | `max_tokens` |
| **Headroom** | rest | Absorbs surprises |

### 8.1.3 Quality, relevance, density

**Context quality beats context quantity.** Adding a marginally relevant document does not merely cost tokens —
it *actively degrades* the model's ability to attend to the relevant ones (§1.1.5). The metric to optimise is
**signal density**: useful tokens ÷ total tokens.

| Anti-pattern | Density fix |
|---|---|
| Dumping a whole 40-page PDF | Retrieve and rerank the 3 relevant sections |
| Full JSON API responses | Project the 6 fields the model needs |
| Complete file contents | The relevant functions, with line numbers |
| Every prior turn verbatim | Compact resolved turns to decisions |
| All 60 tools | Tool search / per-route tool sets |

---

## 8.2 Context construction

### 8.2.1 What to include, what to exclude

| Include | Exclude |
|---|---|
| Facts the model cannot know (retrieved, real-time, account-specific) | Anything derivable by the model |
| Constraints that change the answer | Restating general knowledge |
| The task and its acceptance criteria | Full history when a summary suffices |
| Evidence that will be cited | Boilerplate, licences, unchanged imports |
| Explicit uncertainty ("we could not verify X") | Fields the model does not need — especially PII |

### 8.2.2 Ordering — a deliberate design decision

Ordering is driven by two independent forces that mostly agree:

**Attention** — the beginning and end of a long context are attended to most reliably.
**Caching** — the prefix must be byte-stable to hit the cache.

```
┌─ stable, cacheable, read first ────────────────────────────┐
│ 1. tools (deterministic order — SORT THEM)                 │
│ 2. system: role, criteria, output contract, few-shot       │
├──────────────── cache breakpoint ──────────────────────────┤
│ 3. conversation history (oldest → newest)                  │
│ 4. retrieved context, best evidence FIRST and LAST         │
│ 5. THE TASK  ← last position: highest attention            │
└────────────────────────────────────────────────────────────┘
```

**Put the task last.** This is the single most reliable ordering heuristic: the instruction the model must
follow sits in the strongest attention position, immediately before generation.

For retrieved chunks, the "**best evidence at the extremes**" trick is a direct mitigation of
lost-in-the-middle: after reranking, place rank 1 first, rank 2 last, and the rest in between.

### 8.2.3 Compression techniques

| Technique | Ratio | Loses | Use for |
|---|---|---|---|
| Field projection | 5–20× | Unused fields | API/tool responses |
| Extractive summarisation | 3–10× | Nuance | Documents |
| Abstractive summarisation (LLM) | 10–50× | Detail, exact quotes | Conversation history |
| Structured extraction | 10–100× | Everything not in the schema | Long documents feeding a decision |
| Reference instead of content | 100×+ | Immediate availability | Large artefacts the agent can re-fetch |
| Deduplication | Varies | Nothing | Overlapping retrieved chunks |

**Reference-instead-of-content** is underused and powerful: return `{"file": "src/auth.py", "lines": "40-120",
"summary": "JWT validation"}` and let the agent read it if it needs to. The agent decides what to pay for.

---

## 8.3 Context management mechanisms **[Claude-specific]**

### 8.3.1 Prompt caching — the highest-leverage optimisation

**Mechanism.** Caching is a **prefix match**. The API hashes the rendered prefix; on a hit, the cached KV state
is reused. Cached reads cost ~10% of normal input; a cache **write** costs ~25% more than normal input.

**Render order is `tools → system → messages`.** Any byte change anywhere in the prefix invalidates everything
after it.

```python
response = client.messages.create(
    model="claude-opus-5", max_tokens=4096,
    system=[{"type": "text", "text": LARGE_STABLE_PROMPT,
             "cache_control": {"type": "ephemeral"}}],       # 5m default; ttl "1h" available
    messages=messages,
)
# Verify:
print(response.usage.cache_creation_input_tokens)   # written (~1.25x cost)
print(response.usage.cache_read_input_tokens)       # served from cache (~0.1x cost)
print(response.usage.input_tokens)                  # uncached (full cost)
```

Facts to memorise:

- **Max 4 cache breakpoints** per request.
- **Minimum cacheable prefix ≈ 1024 tokens** — shorter prefixes silently do not cache.
- Default TTL **5 minutes**; `ttl: "1h"` available.
- **Top-level auto-caching** (`cache_control` on `messages.create()`) caches the last cacheable block — simplest
  option when you do not need fine-grained placement.

**Silent invalidators — the audit checklist:**

| Invalidator | Fix |
|---|---|
| `datetime.now()` / timestamp in the system prompt | Move it to the user turn |
| Per-request UUID or trace ID in the prefix | Move it after the breakpoint |
| Non-deterministic JSON key ordering | Serialise with sorted keys |
| Tool list built from a `set` or per-user filter | Sort; group users into tool **profiles** |
| Editing the system prompt mid-session | **[Claude-specific]** use a mid-conversation system message (§2.3.4) |
| Switching models mid-session | Keep the main loop on one model; use a **subagent** for the cheap sub-task |
| Adding/removing tools mid-session | Use **tool search** (appends schemas, preserves the prefix) |

> **If `cache_read_input_tokens` is 0 across repeated requests, something in your prefix is changing.** That
> single check answers most "why is our bill so high" questions.

**Pre-warming:** a request with `max_tokens: 0` writes the cache without generating output — useful before a
burst.

### 8.3.2 Compaction vs context editing vs memory — the three-way distinction

This distinction is very likely to be tested. They are different features with different beta headers, different
mechanics, and different use cases.

| | **Compaction** | **Context editing** | **Memory** |
|---|---|---|---|
| Action | **Summarises** earlier context | **Deletes** stale blocks | **Persists** facts outside the conversation |
| Beta header | `compact-2026-01-12` | `context-management-2025-06-27` | (memory tool, no beta) |
| Strategy type | `compact_20260112` | `clear_tool_uses_20250919`, `clear_thinking_20251015` | — |
| Scope | Within a session | Within a session | **Across** sessions |
| Keeps | Gist, decisions | Structure and recent results | Whatever you write |
| Loses | Detail, exact wording | Old tool outputs entirely | Nothing |
| Use when | Approaching the window limit | Long tool-heavy runs with stale results | State must survive restarts |

Many long-running agents use **all three**.

```python
# Compaction — summarise near the limit
context_management={"edits": [{"type": "compact_20260112"}]}      # beta compact-2026-01-12

# Context editing — prune stale tool results and thinking
context_management={"edits": [
    {"type": "clear_tool_uses_20250919", "clear_tool_inputs": True},
    {"type": "clear_thinking_20251015"},
]}                                                                 # beta context-management-2025-06-27
```

**The compaction footgun, restated because it matters:** append `response.content` — the *whole list* — back to
`messages`. The `compaction` block is state the API needs next turn. Extracting only the text silently discards
it and the conversation resets.

### 8.3.3 The memory tool **[Claude-specific]**

A **client-side** tool giving Claude a `/memories` file directory with `view`, `create`, `str_replace`,
`insert`, `delete`, `rename`. Declared as `{"type": "memory_20250818", "name": "memory"}`; **you implement the
storage backend**, so you own persistence, retention and access control.

Security requirements (these are the exam-relevant part): **never store secrets in memory files**; be careful
with PII (GDPR/CCPA); and in multi-user systems implement **per-user memory directories and authentication in
your handlers** — the reference implementations have no built-in access control.

### 8.3.4 Retrieval as context management

Retrieval is a context mechanism, not just a RAG technique: instead of carrying knowledge in the window, carry a
*retrieval capability* and fetch on demand. Cost scales with what is used, not with what exists. See §10.

---

## 8.4 Long context

### 8.4.1 What long context buys you

- Whole-document reasoning without chunking artefacts.
- Whole-repository reasoning for coding agents.
- Long agent runs without constant compaction.
- Simpler architecture — no retrieval pipeline to build and operate.

### 8.4.2 What it costs

| Cost | Detail |
|---|---|
| **Money** | 500K input tokens at Opus rates ≈ $2.50 **per request** before caching |
| **Latency** | Input processing is parallel but not free; time-to-first-token grows with context |
| **Accuracy** | Context dilution and lost-in-the-middle — more irrelevant material means worse attention on the relevant |
| **Operational** | Harder to trace *why* an answer was given when 500K tokens were in scope |

### 8.4.3 Lost-in-the-middle, precisely

Recall of a specific fact is highest when it sits near the start or end of a long context and lowest in the
middle. This is a robust, well-replicated finding across models.

Mitigations:
1. Retrieve **less**, better (reranking).
2. Place the **best evidence at the extremes**.
3. Put the **task last**.
4. **Chunk and map-reduce**: process sections separately, then synthesise.
5. Ask for **citations** — forcing the model to locate and quote its evidence improves grounding.

### 8.4.4 The practical rule

> **Long context is a capability, not a strategy.** Use it where the whole input is genuinely relevant. Use
> retrieval where a small fraction is relevant. Use *both* — retrieve into a long window when you have many
> moderately relevant documents.

Even on a 1M-token model, most well-engineered production systems operate well under 100K tokens per request,
because signal density, cost and latency all favour it. A useful heuristic: **plan your budget as if the window
were 200K, and treat the extra as headroom for surprises rather than as space to fill.**

---

## 8.5 Context vs RAG — the decision

| Situation | Approach |
|---|---|
| Corpus < ~50K tokens and mostly relevant | **Put it in context** (cache it — it is stable) |
| Corpus large, small fraction relevant per query | **Retrieve** |
| Corpus large, most of it relevant to one question | **Map-reduce**: summarise per chunk, synthesise |
| Corpus changes constantly | **Retrieve** (context would be stale and uncacheable) |
| Need provenance and citations | **Retrieve** (and use the citations feature) |
| Need strict per-user access control | **Retrieve** with ACL filtering — never load a shared corpus into a shared prompt |
| Latency-critical, high-volume, stable corpus | **Context + prompt caching** — often beats retrieval end-to-end |

> **Why would an architect choose long context + caching over RAG for a 30K-token policy manual?**
> Because at 30K tokens the cached prefix costs ~10% on every request, there is no retrieval infrastructure to
> build or operate, no chunking/embedding/reranking quality problem, no retrieval-failure mode, and the model
> sees the whole document so cross-section reasoning works. RAG here would add three services and a new failure
> class to save a few cents.
>
> **Why would an architect choose RAG for a 30K-token manual anyway?**
> If different users may see different sections. Access control is the decisive factor: you cannot ACL a
> shared cached prefix. Also if the manual changes daily (cache churn) or if you need citations with document
> provenance.

---

## 8.6 Agent context **[D1 + D5]**

### 8.6.1 The layers of agent state

```
┌─ Ephemeral (this turn) ───────────────────────────────────┐
│ tool results just returned, thinking blocks               │
├─ Session (this conversation) ─────────────────────────────┤
│ message history, plan, completed steps, budget spent      │
├─ Task (survives compaction — YOU maintain it) ────────────┤
│ goal, acceptance criteria, decisions, open questions,     │
│ blockers, artefacts produced                              │
├─ Durable (survives sessions) ─────────────────────────────┤
│ memory files, database records, user preferences          │
└───────────────────────────────────────────────────────────┘
```

**The layer that matters most and is most often missing is "Task".** Message history is a *transcript*; it is
verbose, it gets summarised, and it is a poor substitute for a structured record of where the work stands.

### 8.6.2 The structured handoff package **[explicitly named in D1/D5]**

When work moves between agents — or across a compaction boundary, or across a session resume — pass a
**structured package**, not a transcript.

```json
{
  "handoff_id": "ho_01J...",
  "from_agent": "research-coordinator",
  "to_agent": "report-writer",
  "goal": "Produce a 5-page competitive analysis of the EU RTB market",
  "acceptance_criteria": [
    "Covers the top 5 vendors by revenue",
    "Every market-share figure has a cited source from 2025 or later"
  ],
  "completed": [
    {"step": "Identify vendors", "result": ["A", "B", "C", "D", "E"],
     "confidence": 0.9, "sources": ["s1", "s2"]}
  ],
  "artifacts": [
    {"type": "table", "uri": "s3://runs/01J/market_share.csv", "summary": "2025 share by vendor"}
  ],
  "open_questions": ["Vendor D's 2025 revenue is unconfirmed; two sources disagree"],
  "constraints": ["Do not cite sources older than 2024", "No customer names"],
  "budget_remaining": {"tokens": 120000, "usd": 3.10},
  "next_action": "Draft sections 1-3 using artifacts; flag D's figure as uncertain"
}
```

Why every field is there:

| Field | Purpose |
|---|---|
| `goal` + `acceptance_criteria` | The receiver knows what "done" means without re-deriving it |
| `completed` with `confidence` and `sources` | Prevents redoing work; carries **uncertainty forward** |
| `artifacts` as **references** | Large outputs live outside the context window |
| `open_questions` | Uncertainty propagates instead of being silently resolved by a guess |
| `constraints` | Guardrails survive the handoff |
| `budget_remaining` | Termination limits are global, not per-agent |
| `next_action` | Removes ambiguity about who does what next |

**Anti-pattern:** passing the raw transcript. It is huge, it is full of resolved dead ends, and it invites the
receiving agent to re-litigate decisions. **Handoffs should be lossy on purpose** — losing the *path* while
keeping the *state*.

### 8.6.3 Error propagation across handoffs **[D5]**

Errors and uncertainty must survive a handoff, or a downstream agent will assert a confident conclusion built on
a shaky input.

```json
{"step": "Vendor D revenue", "status": "uncertain",
 "value": 412000000, "confidence": 0.45,
 "reason": "Two sources disagree (S3: 412M, S7: 380M); neither is primary",
 "recommendation": "Flag in the report; do not use in derived calculations"}
```

Three rules:
1. **Never let a downstream agent see only the value.** Confidence and provenance travel with it.
2. **Failures are first-class.** A step that failed is recorded as failed with a reason — not omitted.
3. **Define aggregation semantics.** If three subagents return confidences, decide up front whether the parent
   takes the minimum (conservative), a weighted average, or escalates on any low value. Undefined aggregation is
   how a system reports 0.9 confidence built from a 0.4 input.

### 8.6.4 Scratchpad and working memory

For long tasks, give the agent an explicit workspace — a file, or a structured state object it updates via a
tool:

```
## Goal
Migrate 40 endpoints from the v1 auth middleware to v2.

## Done
- [x] users.py (3 endpoints) — tests pass
- [x] orders.py (5 endpoints) — tests pass

## In progress
- [ ] billing.py (2 of 7 done) — blocked: `verify_legacy_token` has no v2 equivalent

## Decisions
- Keep v1 middleware mounted until all endpoints migrate (rollback safety)

## Open questions
- Does the mobile client send the legacy header? (asked #platform, awaiting answer)
```

**Why a file beats the conversation:** it survives compaction, it is reviewable by a human mid-run, it is
diffable, it is resumable after a crash, and it lets a *different* agent pick up the work. This is the single
most effective reliability technique for long-horizon agents.

---

## Key takeaways

- Context engineering, not prompting, dominates agent reliability. Optimise **signal density**.
- Budget every component explicitly and reserve output room.
- Order for attention *and* cache: stable prefix first, **task last**, best evidence at the extremes.
- Prompt caching is the highest-leverage optimisation: prefix match, `tools → system → messages`, 4 breakpoints,
  ~1024-token minimum, verify with `cache_read_input_tokens`.
- **Compaction summarises; context editing prunes; memory persists across sessions.** Different features,
  different headers.
- Append the **full `response.content`** when using compaction.
- Long context is a capability, not a strategy — plan as if the window were 200K.
- Handoffs carry a **structured package** with goal, acceptance criteria, results, **confidence, provenance,
  open questions, constraints and budget** — never a raw transcript.

## Things to memorise

- Render order `tools → system → messages`; 4 breakpoints; ~1024-token minimum; ~10% read / ~125% write.
- The silent-invalidator list.
- Compaction vs context editing vs memory (the three-column table).
- Mid-conversation system message = change instructions without invalidating the cache.
- Tool search appends schemas → preserves the cache; changing `tools` mid-session destroys it.
- The handoff package fields.

## Common mistakes

- Filling a 1M window because it exists.
- A timestamp in the system prompt (silently kills caching).
- Appending only text with compaction enabled.
- Confusing context editing with compaction.
- Passing a raw transcript as a handoff.
- Dropping confidence and provenance between agents.
- No task-state file, so a crash or a compaction loses the plan.

---

## Scenario questions

**Q1.** A chat product's costs are 4× the projection. Every request sends a 12K-token system prompt with product
docs and 20 few-shot examples. `cache_read_input_tokens` is always 0. Diagnose.

<details><summary>Answer</summary>

The prefix is changing every request, so nothing caches. Hunt the invalidator: a timestamp or "today's date" in
the system prompt, a per-request session/trace ID, a user name interpolated into the prefix, non-deterministic
JSON serialisation of the tool list, or a per-user tool filter that reorders tools.

Fix:
1. Make the system prompt **byte-identical** across requests. Move volatile values (date, user, session ID) into
   the **user turn**, after the cache breakpoint.
2. Sort the tool list deterministically; serialise schemas with sorted keys.
3. Place an explicit `cache_control` breakpoint after the examples.
4. Verify `cache_read_input_tokens > 0` on the second identical-prefix request — this is the acceptance test.
5. For high-frequency traffic consider `ttl: "1h"`; pre-warm with `max_tokens: 0` before a burst.

Expected effect: the 12K prefix drops from full price to ~10%, i.e. roughly a 90% reduction on the dominant cost
component. Also ask whether 20 examples beat 8 — long prompts dilute attention as well as costing money.
</details>

**Q2.** A research agent runs 40 steps. By step 25 it repeats earlier searches and contradicts its own findings.
Context is at 180K/200K. Diagnose and give a layered fix.

<details><summary>Answer</summary>

**Context saturation plus lost-in-the-middle.** Early findings are buried mid-context and effectively invisible,
so the agent re-derives them — and because it cannot see its earlier conclusion, it may reach a different one.

Layered fix:
1. **Externalise state.** A `findings.md` scratchpad the agent updates after each step, re-read at the start of
   each step. This alone usually fixes the repetition and the contradiction, because current state is always in
   the high-attention region.
2. **[Claude-specific] Context editing** (`clear_tool_uses_20250919`) to prune stale tool results while keeping
   structure.
3. **[Claude-specific] Compaction** for the conversation once it approaches the limit — remembering to append
   the full `response.content`.
4. **Delegate verbose sub-tasks to subagents** so raw search output never enters the main context; only
   summaries return.
5. **Repeat detection** in the harness: hash tool name + normalised arguments and tell the agent when it repeats
   a call ("you already ran this query; the result is in findings.md").
6. **Bound the run**: max steps, token budget, no-progress detection.

The general principle: *when a long-running agent degrades, add external state before adding context.*
</details>

**Q3.** Compare, for a 500-page employee handbook where each employee may see only their region's sections:
(a) full document in a cached prompt, (b) RAG with ACL filtering, (c) per-region cached prompts.

<details><summary>Answer</summary>

**(b) or (c), depending on the number of regions. (a) is disqualified.**

- **(a)** is a security failure: a single cached prefix cannot be ACL'd per user, so every employee sees every
  region. Non-starter regardless of cost.
- **(c) Per-region cached prompts** works if regions are few (say ≤10) and sections are cleanly partitioned. Each
  region gets a stable, cacheable prefix — cheap, simple, no retrieval infrastructure, and access control is
  enforced by *which prefix you send*. Costs: a 500-page handbook is far more than a region's slice, so verify
  each region's slice is a sensible size; and a handbook edit invalidates that region's cache.
- **(b) RAG with ACL filtering** is right when regions are many, overlapping, or per-employee; when the handbook
  is large even per region; when it changes frequently; or when you need citations. **Filter by ACL in the
  retrieval query itself, before ranking** — never post-filter results, which leaks existence through result
  counts and rank positions.

Recommendation: start with (c) if the region count is small and stable — it is dramatically simpler. Move to (b)
when access rules stop being partitionable, and pair it with citations for auditability. Either way, add an
authorisation check at answer time that verifies every cited source is one the user may read.
</details>

**Q4.** A supervisor spawns three research subagents and passes each the full conversation transcript
(45K tokens). Total cost is 4× the estimate and the subagents keep re-answering the supervisor's earlier
questions. Fix.

<details><summary>Answer</summary>

The transcript is being used as a handoff mechanism. Three problems: 45K × 3 = 135K tokens of duplicated input;
the transcript contains resolved dead ends the subagents re-litigate; and the actual *task* is buried mid-context
where attention is weakest.

Fix — send a **structured handoff package** per subagent (§8.6.2), typically 1–3K tokens:
- `goal` and `acceptance_criteria` for *that* subtask only
- `constraints` (sources, recency, exclusions)
- `context` — the minimal facts needed, not the path that produced them
- `artifacts` as **references** (URIs), not inline content
- `budget` (token/step ceiling)
- `output_contract` — the exact schema to return

Expected result: ~90%+ reduction in subagent input tokens, sharper focus, and — importantly — *comparable*
outputs, because every subagent returns the same schema and the supervisor can aggregate deterministically.

Also: have subagents return **references plus a summary**, not full findings, so the supervisor's own context
does not blow up on aggregation.
</details>

**Q5.** A coding agent must run for hours across many files. Design its context strategy end to end.

<details><summary>Answer</summary>

**Static, cached prefix.** System prompt, tool definitions (sorted), project conventions from CLAUDE.md — one
cache breakpoint after it. Do not edit it mid-session; use a mid-conversation system message for mode switches.

**External task state.** A `PLAN.md` in the workspace holding goal, acceptance criteria, a checklist of files
with status, decisions and their rationale, blockers, and open questions. The agent updates it after every
meaningful step and re-reads it at the start of each phase. This survives compaction, crashes, and human
inspection — it is the backbone of the design.

**Per-file working context.** Read only the files needed for the current unit of work; do not carry previous
files forward. Delegate wide exploration to an **Explore subagent** so only summaries return.

**Turn hygiene.** Context editing to prune stale tool results; compaction as the window fills, always appending
the full `response.content`; `/clear`-equivalent between unrelated phases.

**Verification in the loop.** A PostToolUse hook runs formatter/linter/tests after each edit so errors surface
immediately as context rather than accumulating; a Stop hook refuses to finish until the suite passes.

**Bounds.** Max steps, wall-clock deadline, token and dollar budget tracked in the task state so limits survive
resumption.

**Recovery.** On restart, reconstruct from: system prompt (from repo) + `PLAN.md` + `git diff` + a bounded tail
of recent messages. Never replay the full transcript.

The shape to remember: **stable cached prefix + externalised state + narrow working context + automated
verification + hard bounds.**
</details>

**Q6.** Two subagents return `confidence: 0.9` and `confidence: 0.4`. The supervisor's report states a
conclusion with high confidence. What went wrong architecturally?

<details><summary>Answer</summary>

**Undefined confidence-aggregation semantics** — a specific case of failed error propagation. The supervisor
received two numbers with no rule for combining them, so it did what LLMs do with ambiguity: produced the most
fluent answer, which reads as confident.

Fixes:
1. **Define aggregation explicitly in code, not in the prompt.** For a conjunctive conclusion (all inputs must
   hold), the correct default is `min()` — conservative and easy to defend. Weighted schemes need a stated
   justification.
2. **Carry provenance, not just a number.** Each claim in the report references the finding that supports it,
   with that finding's confidence; a low-confidence input must produce a visibly hedged output.
3. **Threshold and route.** Below a configured floor, mark the claim as unverified, escalate to a human, or
   spend more budget verifying it — the decision belongs to the orchestrator, not the model.
4. **Make it structural.** The report schema requires every claim to carry `confidence` and `source_finding_id`;
   a deterministic validator rejects a report whose stated confidence exceeds the minimum of its sources.
5. **Calibrate.** Self-reported confidence is not probability until you have measured it against outcomes
   (§11.3). Validate that "0.9" is actually right ~90% of the time before you build thresholds on it.
</details>
