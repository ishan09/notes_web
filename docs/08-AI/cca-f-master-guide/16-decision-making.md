# 16 — Architectural Decision Making

> **Domain mapping:** Domain 1 — **27%** — plus every other domain. This section is the exam's core skill in
> concentrated form. Each decision follows the same template: **problem → options → criteria → trade-offs →
> recommended default → failure cases → example scenario.**
>
> Read this section twice. The recommended defaults are the fastest path to a correct answer under time pressure.

---

## 16.1 LLM vs traditional code

**Problem.** Which parts of the system should be a model call, and which should be ordinary code?

**Options:** (a) deterministic code, (b) LLM, (c) LLM with deterministic validation, (d) code with an LLM
fallback for the long tail.

**Criteria**

| Signal | Points to |
|---|---|
| The rule is expressible and stable | Code |
| Input is unstructured natural language | LLM |
| The output must be provably correct | Code |
| Edge cases are numerous and irregular | LLM |
| Latency budget < ~100ms | Code |
| Auditability is a regulatory requirement | Code (or LLM + recorded evidence) |
| The task requires judgement over ambiguity | LLM |

**Recommended default:** **(c) or (d).** Use the model for the fuzzy edge — understanding messy input, judging
ambiguity — and deterministic code for the guarantees. *Give the model the judgement; give code the invariants.*

**Failure cases:** using an LLM for arithmetic, access-control decisions, or exact retrieval; using rules for
genuinely open-ended language understanding and drowning in exceptions.

**Scenario.** *Route incoming emails to one of 8 departments.* If subject-line rules already achieve 85%, use
the rules and send the 15% residue to an LLM classifier with a confidence gate. You get determinism and cost
control on the bulk and coverage on the tail.

---

## 16.2 Agent vs deterministic workflow **[the single most common exam decision]**

**Problem.** Should the model decide the sequence of steps?

**Options:** (a) fixed workflow, LLM steps inside; (b) workflow with one bounded agentic step; (c) full agent;
(d) agent with a mandatory plan-approval gate.

**Criteria**

| Signal | Points to |
|---|---|
| **You can draw the flowchart** | Workflow |
| The number and order of steps varies per input | Agent |
| You need predictable cost and latency | Workflow |
| Novel situations arise regularly | Agent |
| Auditability and reproducibility matter | Workflow |
| Actions are irreversible | Workflow, or agent + approval gate |

**Recommended default:** **(a), stepping up to (b).** Most production "AI systems" are workflows with LLM steps.

> **The heuristic:** *if you can draw the flowchart, build the flowchart.* Agents are for problems where you
> genuinely cannot.

**Failure cases:** an agent for a fixed pipeline (unpredictable cost, hard to debug, no benefit); a rigid
workflow for genuinely open-ended work (an explosion of special cases).

**Scenario.** *"Process an invoice: extract, validate, categorise, approve, record."* That sentence **is** the
flowchart. Build the workflow — two model calls (extract, categorise) and deterministic code for the rest.

---

## 16.3 Single agent vs multi-agent

**Problem.** Does the work need more than one agent?

**Options:** (a) single agent; (b) single agent + subagents for verbose subtasks; (c) coordinator + spokes;
(d) sequential pipeline of agents.

**Criteria**

| Signal | Points to |
|---|---|
| Intermediate data does not fit one context window | Multi (context isolation) |
| Subtasks are independent and wall-clock matters | Multi (parallelism) |
| Roles need different **tools, permissions or models** | Multi (specialisation) |
| The untrusted-content reader must not hold write credentials | Multi (compartmentalisation) |
| None of the above | **Single** |

**Recommended default:** **(a), then (b).** Add subagents for verbose exploration before adding a full
coordinator topology.

**Failure cases:** multi-agent for "personas" with identical tools and permissions — you pay 2–10× and lose
shared context for nothing; a sequential agent pipeline where error compounds (0.95⁵ ≈ 77%).

**Scenario.** *Analyse 50 log files and find the root cause.* Reading 50 files saturates one context ⇒
subagents for reading (context isolation), a single main agent for the analysis. Not a five-persona committee.

---

## 16.4 RAG vs long context

**Problem.** Retrieve, or put the corpus in the prompt?

**Options:** (a) full corpus in a cached prompt; (b) RAG; (c) hybrid (retrieve into a long window);
(d) map-reduce over chunks.

**Criteria**

| Signal | Points to |
|---|---|
| Corpus < ~50K tokens, stable, mostly relevant | Long context + caching |
| Corpus large, small relevant fraction | RAG |
| Per-user access control | **RAG** (you cannot ACL a shared cached prefix) |
| Citations and provenance required | RAG (or the citations feature over documents) |
| Corpus changes constantly | RAG |
| Most of the corpus is relevant to one question | Map-reduce |
| Latency-critical, stable corpus, high volume | Long context + caching often wins |

**Recommended default:** **long context + caching below ~50K tokens; RAG above.** Access control overrides
everything: if different users see different content, retrieve.

**Failure cases:** building a RAG pipeline for a 20K-token document (three services and a new failure class to
save a few cents); loading 400K tokens per request when 3 chunks would do (cost, latency, dilution).

**Scenario.** *200-page manual, 1,000 questions/day.* ~150K tokens per request even cached is substantial —
RAG. *A 15-page policy document, 50 questions/day* — cached long context, no pipeline.

---

## 16.5 RAG vs fine-tuning

**Problem.** Teach the model new *knowledge*, or new *behaviour*?

| | RAG | Fine-tuning |
|---|---|---|
| Adds | **Knowledge** | **Behaviour, format, style, domain vocabulary** |
| Update cost | Re-index (minutes) | Re-train (hours–days) |
| Provenance | Citations available | None |
| Access control | Enforceable per user | Baked in — cannot be ACL'd |
| Data volume needed | Any | Thousands of examples |
| Hallucination | Reduced by grounding | Not reduced |

**Recommended default:** **RAG.** Then prompt engineering and few-shot. Fine-tuning last, and only for
*behaviour* that prompting cannot achieve at acceptable cost.

**Failure cases:** fine-tuning to inject facts (they go stale, cannot be cited, cannot be access-controlled, and
the model still hallucinates around them); fine-tuning before exhausting prompting and retrieval.

**Scenario.** *"The model doesn't know our product."* → RAG. *"The model won't produce our house report format
even with examples."* → consider fine-tuning, after trying structured outputs.

---

## 16.6 Tool vs MCP

**Problem.** Expose a capability as a direct tool definition, or as an MCP server?

**Criteria**

| Signal | Points to |
|---|---|
| One consuming application | **Direct tool** |
| Multiple AI clients need it | MCP |
| Latency-critical path | Direct tool |
| Another team should own and deploy it independently | MCP |
| You want runtime discovery of new capabilities | MCP |
| You want to ship prompts/resources alongside the tools | MCP |
| The service is inside a VPC, unreachable from Anthropic's infrastructure | Direct tool (or self-hosted MCP client) |

**Recommended default:** **direct tools until there is a second consumer.** Migration is cheap because a
well-designed tool definition ports to MCP almost mechanically — so do not pre-build the platform.

**Failure cases:** MCP for a single consumer (protocol overhead, extra failure mode, no reuse); direct tools
duplicated across five agents that all drift.

---

## 16.7 One large tool vs many small tools

**Criteria**

| Signal | Points to |
|---|---|
| Authorisation differs per operation | **Many** (the tool boundary must align with the permission boundary) |
| The composition is fixed and latency matters | **Few** (one round trip instead of three) |
| The model struggles to choose | Few |
| The model constructs wrong arguments | Many (simpler args) |
| Operations are reused in different combinations | Many |

**Recommended default:** **one tool per user-visible intent** — not per HTTP endpoint, not per subsystem.
`get_order_status` (joining order + shipment + carrier internally) is right;
`http_request(method, path, body)` is too coarse; `get_order_row`/`get_shipment_row` is too fine.

**Failure cases:** a god-tool that cannot be authorised, audited, or parallelised; a 40-tool surface where
selection accuracy collapses.

---

## 16.8 Sequential vs parallel agents

**Criteria**

| Signal | Points to |
|---|---|
| Subtasks depend on each other's output | Sequential |
| Subtasks are independent | **Parallel** |
| Wall-clock latency matters | Parallel |
| Rate limits are tight | Sequential, or parallel with a concurrency cap |
| Errors must not compound | Parallel (independent) or sequential **with verification between stages** |

**Recommended default:** **parallel where independent, with a concurrency cap and a defined partial-failure
policy.** Sequential only where there is a genuine data dependency — and then verify between stages, because
error compounds.

**Scenario.** *Research 20 companies then write a report.* The 20 lookups are parallel (fan-out); the report is
sequential (fan-in). Classic map-reduce.

---

## 16.9 Synchronous vs asynchronous

**Criteria**

| Signal | Points to |
|---|---|
| A human is waiting | Sync (+ streaming) |
| Expected duration > ~30s | **Async** |
| Cost sensitivity, latency tolerance | Async + Batch API (~50% cost) |
| Triggered by an event, not a user | Async |
| Needs to survive process restarts | Async with durable state |

**Recommended default:** **sync + streaming for user-facing; async with a job handle for anything longer than
~30s; batch for offline volume.**

**Failure cases:** holding an HTTP request for 4 minutes (timeouts, retries, duplicated work); making an
interactive feature async and destroying the UX.

---

## 16.10 Human approval vs autonomous execution

**Criteria**

| Signal | Points to |
|---|---|
| Irreversible | **Approval** |
| High blast radius (money, many records, production) | Approval |
| Low confidence or novel input | Approval |
| Regulated decision | Approval (often mandatory) |
| Reversible, low value, high volume | Autonomous + post-hoc audit |
| Approval would be the throughput bottleneck | Tiered autonomy + sampling review |

**Recommended default:** **tiered autonomy.** Auto-execute reversible, low-value, high-confidence actions;
require approval above thresholds; never automate the catastrophic class.

**Failure cases:** approving everything (fatigue → rubber-stamping, which is worse than no gate because it
manufactures false assurance); approving nothing (an unbounded agent with write access).

---

## 16.11 Larger model vs smaller model

**Criteria**

| Signal | Points to |
|---|---|
| Complex multi-step reasoning | Larger |
| Long tool chains | Larger |
| Fixed label set, clear criteria | Smaller |
| High volume, cost-sensitive | Smaller (+ routing) |
| Latency-sensitive | Smaller |
| Planning / decomposition role | **Larger** (coordinator) |
| Bulk worker role | **Smaller** (spokes) |

**Recommended default:** **start at Sonnet; move by evidence.** In multi-agent systems, expensive coordinator +
cheap spokes.

**Failure cases:** Opus everywhere "because it's best" (5× cost, no measured benefit); Haiku on a long tool chain
(quality collapse that shows up as retries, so you pay anyway).

**Before downgrading**, exhaust the free levers: caching, bounded context, bounded output, right-sized `effort`.
A downgrade is the only lever that trades quality, so it goes last.

---

## 16.12 More context vs better retrieval

**Criteria**

| Signal | Points to |
|---|---|
| recall@k is low | **Better retrieval** (more context cannot fix a chunk that was never retrieved) |
| recall@50 high but recall@3 low | **Reranking** |
| The right chunk is present but ignored | Ordering (best evidence at the extremes), fewer chunks, task last |
| Chunks lack surrounding context | Contextual chunking / parent–child, not more chunks |

**Recommended default:** **better retrieval, essentially always.** Adding chunks past the point of relevance
*reduces* accuracy through dilution while increasing cost and latency.

**Failure cases:** raising k from 5 to 30 and getting worse answers — a very common and counter-intuitive
outcome that follows directly from lost-in-the-middle.

---

## 16.13 More agents vs simpler architecture

**Criteria**

| Signal | Points to |
|---|---|
| A named limitation of the current design (context, parallelism, permissions) | More agents |
| "It feels more sophisticated" | **Simpler** |
| Debugging is already hard | Simpler |
| Cost is already a concern | Simpler |
| You cannot evaluate the current system | **Simpler** — and build the eval first |

**Recommended default:** **simpler.** Every added agent multiplies cost, latency variance, failure modes and
debugging effort.

> **The test:** *name the specific limitation of the simpler design that the extra agent removes.* If you cannot
> name it in one sentence, you do not need the agent.

---

## 16.14 The universal decision procedure

Run this on any scenario question:

```
1. What is the actual constraint?
   latency / cost / compliance / blast radius / determinism / scale

2. What is the simplest tier that can meet it?
   single call → RAG → tools → single agent → multi-agent

3. What is the blast radius of a wrong answer?
   → drives HITL, write access, sandboxing, capability separation

4. How would I know it broke?
   → drives evaluation and observability; often the tiebreaker between two plausible options

5. What is the failure mode of each option, and is it detectable?
   → an undetectable failure mode disqualifies an option
```

**Answer-shape heuristics for the exam:**

| Option shape | Usually |
|---|---|
| Adds autonomy/agents without a named need | ❌ Wrong |
| Adds a deterministic guardrail around a model | ✅ Right |
| Solves a security problem purely with a prompt instruction | ❌ Wrong |
| Reduces capability / separates capabilities | ✅ Right |
| Adds an evaluation or verification step | ✅ Often right |
| Chooses the biggest model with no evaluation | ❌ Wrong |
| Adds human approval for an irreversible action | ✅ Right |
| Adds human approval for everything | ❌ Wrong (bottleneck, fatigue) |
| Uses the simplest thing that meets the stated constraint | ✅ Right |

---

## Key takeaways

- Every decision reduces to: *what is the constraint, what is the simplest tier that meets it, what is the blast
  radius, and how would I detect failure?*
- Defaults worth memorising: workflow over agent; single agent over multi; long context + caching under ~50K
  tokens, RAG above; direct tools until a second consumer; one tool per user-visible intent; Sonnet first;
  better retrieval over more context; tiered autonomy over all-or-nothing approval.
- Access control overrides the RAG-vs-long-context decision.
- Exhaust the free cost levers before trading quality.
- "Name the limitation" is the test for every added component.

## Common mistakes

- Choosing sophistication over fit.
- Fine-tuning to add facts.
- Multi-agent without a named limitation.
- Increasing k instead of adding a reranker.
- Downgrading the model before enabling caching.
- Prompt-only security controls.

---

## Scenario questions

**Q1.** A team must extract 15 fields from 100K contracts. Options: (a) one Opus call per contract with a large
schema, (b) three Sonnet calls per contract (5 fields each), (c) a Haiku call plus an Opus fallback on low
confidence, (d) fine-tune a small model. Which, and why?

<details><summary>Answer</summary>

**(c), delivered through the Batch API.**

- **(a)** works but is the most expensive option and untested against cheaper tiers.
- **(b)** triples the call count and re-sends the contract three times — usually *more* expensive than (a), not
  less, and it splits a coherent extraction across calls that cannot see each other's decisions.
- **(c)** is the right shape: a cheap model handles the bulk, and the uncertain tail escalates. Requires
  `confidence` and `unresolved_fields` in the schema, and a **calibrated** threshold — measure before choosing
  the cut point. Cascading is only a win if the escalation rate is low (<10–15%), so validate that first.
- **(d)** is premature: it needs thousands of labelled examples, cannot be updated quickly, adds an MLOps
  burden, and structured outputs already give schema conformance. Revisit only if prompting demonstrably
  plateaus.

Additional design points that matter more than the model choice: **Batch API** (~50% cost, key by `custom_id`),
**prompt caching** on the schema and instructions (identical across all 100K calls — likely the single largest
saving), **structured outputs** with enums to eliminate the parse-failure class, per-field null-rate monitoring,
a DLQ, and checkpointing for resumability.
</details>

**Q2.** A customer wants an agent that reads support emails and updates the CRM. They ask for "full autonomy so
agents don't have to do anything". Advise.

<details><summary>Answer</summary>

Push back on the framing while delivering most of the value.

Concerns:
1. **Injection surface.** Inbound email is fully attacker-controlled and the agent has CRM write access — the
   canonical dangerous combination.
2. **Blast radius.** Wrong CRM writes corrupt the system of record and are hard to detect and unwind.
3. **No verification.** Nothing checks that the update reflects the email.

Design:
- **Capability separation.** A reader component processes untrusted email with **no CRM credentials** and emits
  a validated `CrmUpdate` schema. A writer component acts on that object and never sees the raw email.
- **Plan-then-execute** with a deterministic gate: allowed fields only, no free-text into structured fields,
  record must belong to the sender's account, value/row caps.
- **Tiered autonomy.** Auto-apply low-risk, reversible updates (log an interaction, update a status).
  Require review for anything touching contract value, owner, or contact details.
- **Reversibility.** Versioned writes and an undo path; every automated change tagged so it can be bulk-reverted.
- **Confidence gate** with a calibrated threshold, plus sampling review of auto-applied updates.
- **Idempotency** keyed by message ID so redelivery cannot double-apply.
- **Audit** linking email → extraction → gate verdict → write.

Deliver the message honestly: *"Full autonomy on day one is the version that gets switched off after the first
bad week. Ship read-only, measure acceptance, and graduate specific field updates to autonomy as the data
supports it."* That usually reaches near-full autonomy in a quarter, with evidence.
</details>

**Q3.** A RAG system is at 82% answer accuracy. The team proposes upgrading Sonnet → Opus. What do you ask
first?

<details><summary>Answer</summary>

**"What is the retrieval recall?"** — and more precisely, "of the failures, how many had the correct evidence in
context?"

If retrieval recall@k is 85%, then ~15% of questions are unanswerable regardless of model, and the model upgrade
can address at most a fraction of the remaining error at 5× cost. The diagnostic matrix (§11.4) tells you where
to spend:

| Retrieval | Generation | Where to invest |
|---|---|---|
| ✅ | ❌ | Prompt, model, or ordering — a model upgrade may genuinely help |
| ❌ | abstains | **Retrieval** — reranking, hybrid search, chunking |
| ❌ | hallucinates | Retrieval **and** abstention behaviour |

Follow-up questions before approving the upgrade: Is there a reranker? (usually the biggest single win.) Is
there a similarity threshold and a measured abstention rate? Is chunking contextual? Is hybrid search enabled?
What is the eval set, and is it contaminated? What is the cost per successful task today?

Only after those, run the model comparison properly: same eval set, multiple samples, sliced by task type, with
confidence intervals — and expect the answer to be a **routing** design rather than a wholesale upgrade.
</details>

**Q4.** An architect proposes putting every internal API behind MCP so "any future agent can use them". Assess.

<details><summary>Answer</summary>

Right instinct, wrong sequencing — this is speculative platform building.

Problems:
- **No consumers yet.** MCP's value is reuse across multiple AI clients. With zero or one consumer you pay
  protocol overhead, operational burden and an extra failure surface for no return.
- **Context budget.** "Every internal API" is hundreds of tools. Even with tool search, an uncurated surface
  degrades selection and inflates cost.
- **Wrong granularity.** Internal APIs are shaped for programmers (resources, endpoints). Agent tools should be
  shaped for **user intents**, with per-tool authorisation and error semantics. A mechanical 1:1 mapping
  produces a bad tool surface.
- **Security.** Broad exposure widens blast radius and makes least privilege harder to express.

Recommendation:
1. **Start with the one agent you are actually building**, using direct tool definitions. Learn what the right
   granularity is from real usage.
2. **Promote to MCP when a second consumer appears** — migration is cheap because good tool definitions port
   almost mechanically.
3. **Curate, do not proxy.** Expose intent-shaped tools, not endpoint wrappers.
4. **Build the gateway when the org needs it** — central authN/Z, audit, version pinning, rate limiting and a
   curated catalogue become worthwhile above roughly a dozen teams or in a regulated environment.
5. Set the standards now (naming, description style, error semantics, versioning) so the eventual platform is
   consistent — that is the cheap part worth doing early.
</details>

**Q5.** Two designs for a nightly report: (a) an agent that decides what to analyse, (b) a fixed pipeline with
LLM summarisation at each stage. The customer says "we want it to be intelligent". Advise.

<details><summary>Answer</summary>

**(b), and reframe "intelligent".**

A nightly report is a recurring, specified deliverable: the sections are known, the data sources are known, the
audience is known. That is a flowchart — so build the flowchart. Choosing (a) buys nondeterministic content
(the report differs each night for no reason), unpredictable cost and latency in a fixed nightly window, no
reproducibility (you cannot explain why Tuesday's report differs from Monday's), and a much harder evaluation
story.

Where intelligence genuinely belongs, and where (b) delivers it:
- **Anomaly detection** — deterministic statistics flag outliers; the model *explains* them in business terms.
- **Narrative synthesis** — turning numbers into prose is exactly what LLMs are good at.
- **Comparative commentary** — "why did EMEA drop?" grounded in retrieved context.
- **A bounded agentic investigation step** for anomalies only: when a metric breaches a threshold, a small
  bounded agent investigates with read-only tools and returns a structured finding. This is (b) with one
  agentic step, and it is the strongest version of the design.

Also: (b) is testable (golden inputs → expected sections), cacheable (the stable prompt is identical nightly),
cheap, and reliably finishes inside the window. Deliver the message as *"intelligence in the analysis, not in
the plumbing"* — customers usually want consistent insight, not a system that surprises them at 3am.
</details>
