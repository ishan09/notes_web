# 20 — FDE-Style Architecture and Customer Problem Solving

> **Domain mapping:** not a published exam domain. CCA-F is aimed at solution architects and forward-deployed
> engineers, so this material is **role knowledge** — the reasoning behind many scenario stems, and directly
> useful in the job the certification targets.
>
> The through-line: **most failed AI projects fail on problem selection, scope and trust — not on model
> capability.**

---

## 20.1 Problem discovery

### 20.1.1 Symptom vs root cause

Customers arrive with a **solution**, not a problem. "We want an AI chatbot for support" is a proposed solution.
Your job is to recover the problem.

| Stated ask | Possible root causes | Right intervention |
|---|---|---|
| "AI chatbot for support" | Ticket volume; slow first response; agents lack information; docs are bad | Deflection may need *better docs*, not a bot |
| "AI to write our code" | Onboarding is slow; too much boilerplate; review is the bottleneck | Codegen for boilerplate; better templates; review tooling |
| "AI to summarise meetings" | Nobody reads notes; decisions get lost | A decision log may beat a summariser |
| "AI to analyse our data" | Analysts are a bottleneck; dashboards do not answer the real questions | Self-serve SQL, or better dashboards |

**The five whys, applied:** "we want AI to answer support tickets" → why? → "agents take 20 minutes per ticket"
→ why? → "they search four systems" → why? → "the information is scattered" → **the problem is federated search,
and the AI question is now much better posed.**

### 20.1.2 Interview questions that surface the real problem

1. **Walk me through the last time this happened.** (Specific beats general, always.)
2. **What do you do today?** (There is always a current process; understand it before replacing it.)
3. **What happens when it goes wrong?** (Reveals blast radius, which determines the whole architecture.)
4. **How do you know it went wrong?** (Reveals whether evaluation is even possible.)
5. **Who is accountable for the outcome?** (Determines whether human approval is negotiable.)
6. **What would you do with the time saved?** (Tests whether the value is real.)
7. **What is the volume, and what does one unit cost you today?** (Gives you the budget ceiling.)
8. **Which part is judgement and which is lookup?** (Draws the LLM/deterministic boundary for you.)

### 20.1.3 Workflow mapping

Map the current process step by step, and label each step:

```
step               who    time   variance   judgement?   verifiable?
─────────────────────────────────────────────────────────────────────
receive ticket     system  0s     none       no           yes
classify           human   2min   high       LOW          yes     ← automate (LLM)
search 4 systems   human  10min   high       none         yes     ← automate (tools/RAG)
decide remedy      human   3min   medium     HIGH         partly  ← assist, don't replace
execute remedy     human   4min   low        none         yes     ← automate (deterministic)
write reply        human   3min   medium     medium       yes     ← draft (LLM) + human send
```

This single table usually produces the architecture. **Time × variance × judgement** tells you where the value
is; **verifiable?** tells you where automation is safe.

---

## 20.2 Translating business problems into AI systems

### The translation chain

```
BUSINESS PROBLEM   "Support costs $2M/year; first response takes 4 hours"
       ▼
BUSINESS REQUIREMENT  "Cut cost 30% without lowering CSAT"
       ▼
TECHNICAL REQUIREMENT "Auto-resolve 40% of tier-1 tickets; ≤3% escalation-after-answer;
                       p95 first response < 30s"
       ▼
AI CAPABILITY         "Classify intent; retrieve policy; look up orders; draft a reply"
       ▼
ARCHITECTURE          Router → RAG/tools → plan-then-execute for refunds → HITL above a threshold
       ▼
SUCCESS METRIC        Containment rate, CSAT delta, cost per ticket, policy-violation rate (=0)
```

**Two rules that prevent most failed projects:**

1. **Every technical requirement must be measurable before you build.** If you cannot state the metric, you
   cannot know whether you succeeded, and the project will end in an argument about vibes.
2. **Every success metric must have a baseline.** "Improve accuracy" is meaningless without today's number.

### Sizing the prize honestly

```
value = volume × time_saved × loaded_cost × automation_rate × (1 − error_cost_rate)
```

The two terms teams forget are **automation_rate** (you will not automate 100%) and **error_cost_rate** (wrong
answers cost money and trust). A system that automates 40% of tickets with a 5% error rate that each cost 3× a
normal handling is barely break-even — and that arithmetic is worth doing on day one.

---

## 20.3 AI feasibility

### 20.3.1 The four-part decomposition

For any workflow, sort every step into one of four buckets:

| Bucket | Criterion | Example |
|---|---|---|
| **Deterministic** | Rule is expressible and stable | Validation, routing on structured fields, calculations |
| **LLM (single call)** | Unstructured input → structured judgement, known step | Classify, extract, summarise, draft |
| **Agent (bounded)** | Sequence genuinely unknown | Investigate an anomaly; migrate an unfamiliar module |
| **Human** | Irreversible, regulated, or unverifiable | Approve a refund; sign off a diagnosis |

**Most workflows are 70% deterministic, 25% single LLM calls, 5% agentic, with humans at the irreversible
boundaries.** A proposal that is 90% agent is almost always mis-decomposed.

### 20.3.2 Feasibility red flags

| Red flag | Why it matters |
|---|---|
| **No way to verify correctness** | You cannot evaluate it, so you cannot improve it or defend it |
| **No ground truth data at all** | No eval set, no baseline |
| **100% accuracy required** | Non-negotiable ⇒ human in the loop, or do not automate |
| **Every action is irreversible** | Autonomy is off the table |
| **Sub-100ms latency** | Model calls do not fit |
| **The value is < the cost per call** | Do the arithmetic before building |
| **The customer cannot describe a good output** | Requirements are not ready |
| **"It should handle anything"** | Unscoped ⇒ unevaluable ⇒ unshippable |

### 20.3.3 The honest conversation

Sometimes the right answer is "don't build this". Deliver it as a redirect, not a refusal:

> *"The 40% of tickets that are password resets don't need a model — they need a self-service flow, and that's
> two weeks of work with a deterministic outcome. The remaining 60% split into a chunk we can genuinely
> automate and a chunk that needs a person. Let's do the self-service flow first, then build the assistant for
> the 35% that's actually language work. That gets you most of the saving with a fraction of the risk."*

That conversation builds more trust than shipping an impressive demo that gets switched off in a month.

---

## 20.4 Production readiness

A checklist to run before any AI system goes live. **A "no" is not automatically a blocker — it is a decision
that must be made explicitly and recorded.**

| Area | Question |
|---|---|
| **Security** | Threat model written? Trust boundaries drawn? Least privilege? Injection tested? Blast radius bounded? Egress controlled? |
| **Reliability** | Retries with jitter? Fallbacks *exercised*? Circuit breaker? Degradation ladder defined and visible to users? |
| **Evaluation** | Golden set? Baseline? CI gate? Production sampling? Regression cases from past bugs? |
| **Cost** | Cost per successful task known (p50/p95/p99)? Budgets enforced pre-call? Spend-rate alerting? Attribution per tenant? |
| **Latency** | SLO defined for TTFT *and* total? Measured at p95/p99? Streaming where a human waits? |
| **Scalability** | Rate limits handled client-side? Queue with backpressure? Batch separated from interactive? Per-tenant quotas? |
| **Compliance** | Data residency? Retention? Deletion propagation (store, index, cache, logs)? Audit trail? Human decision where mandated? |
| **Observability** | Traces with `prompt_version` + `model` + `schema_version`? Alerts on quality, not just errors? Replay capability? |
| **Operations** | Runbook? Kill switches? Rollback by config? On-call knows the failure modes? Game day run? |
| **Human factors** | Escalation path? Approval UX that allows a decision in seconds? Users know it is AI and know its limits? |

### The four questions to ask of any design

1. **What is the blast radius of a wrong answer?**
2. **How would we know it broke?**
3. **How do we roll back?**
4. **Who is accountable for the outcome?**

If any of these has no answer, the system is not ready — regardless of how well it performs.

---

## 20.5 Architecture communication

### 20.5.1 Diagrams that work

Draw three, not one:

1. **Data flow** — where information comes from and goes, with **trust boundaries** marked. This is the diagram
   security reviewers need.
2. **Control flow** — who decides what, and where the gates are. This is the diagram that shows whether you
   built an agent or a workflow.
3. **Failure modes** — what happens when each component fails. This is the diagram operators need, and the one
   most often missing.

Keep them to one screen. A diagram that needs zooming is a document.

### 20.5.2 Communicating trade-offs

Never present one option. Present two or three with the *decision criterion* made explicit:

> **Option A — RAG.** $8K/month, 3s p95, citations, per-user permissions, 4 weeks to build.
> **Option B — cached long context.** $22K/month, 5s p95, no per-user permissions, 1 week to build.
>
> **Deciding factor: per-user permissions are a compliance requirement, so B is disqualified regardless of
> cost.** If that requirement were dropped, B ships three weeks earlier and is the better first release.

Naming the *deciding factor* is what makes this a recommendation rather than a menu.

### 20.5.3 Decision records

```markdown
# ADR-014: Use classic RAG rather than agentic RAG for the KB assistant

Status: Accepted   Date: 2026-08-18   Deciders: Platform, Security

## Context
15K questions/day over 200K documents. p95 < 5s. Per-document ACLs. Budget $8K/month.

## Decision
Classic RAG: hybrid retrieval → rerank → single generation with citations.

## Alternatives considered
- Agentic RAG (retrieval as a tool): rejected — 95% of questions are single-hop; variable
  latency breaks the p95 SLO; harder to evaluate.
- Cached long context: rejected — per-user ACLs cannot be enforced on a shared cached prefix.

## Consequences
+ Predictable latency and cost; simple to evaluate; citations available.
− Multi-hop questions answer poorly. Mitigation: measure the multi-hop rate; revisit if >5%.

## Revisit when
Multi-hop question rate exceeds 5%, or the corpus gains structured sources needing routing.
```

The **"revisit when"** section is what makes an ADR useful a year later: it converts a decision into a
falsifiable condition.

### 20.5.4 Communicating AI uncertainty

Set expectations in the language of the customer's own domain:

- **Give a number, with an interval.** "92% ± 3% on 400 representative cases" beats "very accurate".
- **Name the failure modes.** "It will occasionally answer from a superseded policy; here is how we detect
  that."
- **Distinguish "wrong" from "unhelpful".** They have different costs and different mitigations.
- **Show the residual risk and the plan.** "5% will need review; here is the queue and the SLA."
- **Never promise determinism.** Promise *bounded* behaviour: caps, gates, approvals, reversibility.

> The most valuable sentence an FDE can say: *"Here's what it will get wrong, here's how you'll know, and here's
> what happens when it does."* Customers forgive errors they were warned about; they do not forgive surprises.

---

## Key takeaways

- Customers bring solutions; recover the problem. Map the workflow step by step and label judgement,
  variance and verifiability.
- Translate business problem → measurable technical requirement → capability → architecture → metric. Every
  requirement measurable, every metric with a baseline.
- Decompose into deterministic / single LLM call / bounded agent / human. Most workflows are ~70% deterministic.
- Feasibility red flags: no verification, no ground truth, 100% accuracy required, everything irreversible,
  value < cost.
- Production readiness is a checklist, and a "no" must be an explicit, recorded decision.
- Communicate with three diagrams, two options and a named deciding factor, and an ADR with a "revisit when".
- Say what it will get wrong, how they will know, and what happens next.

## Common mistakes

- Building the stated solution instead of solving the stated problem.
- No baseline, so success is unprovable.
- Automating the unverifiable.
- Presenting one option with no trade-off.
- Promising accuracy without an interval or a failure-mode list.
- Launching a generic "ask anything" assistant instead of 2–3 measurable capabilities.
