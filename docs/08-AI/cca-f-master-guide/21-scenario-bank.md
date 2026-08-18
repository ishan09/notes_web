# 21 — Scenario Bank

> **How to use this.** These are harder than the per-section questions. Each follows the full structure:
> problem → constraints → options → best choice → why each alternative is worse → hidden assumptions →
> security → reliability → cost/performance.
>
> **Work each one before reading the answer.** Run the universal procedure from §16.14: *what is the constraint;
> what is the simplest tier that meets it; what is the blast radius; how would I know it broke.*
>
> Twenty scenarios, covering: agent vs workflow, single vs multi-agent, RAG vs long context, MCP vs direct API,
> tool design, prompt injection, context management, evaluation, reliability, security, cost, latency, and human
> approval.

---

## S1 — Agent vs workflow: the loan pre-qualification engine

**Problem.** A lender wants to pre-qualify applicants: pull credit, verify income documents, apply lending
rules, produce a decision with reasons.

**Constraints.** Regulated (every decision must be explainable and reproducible). 3,000 applications/day. Adverse
decisions must cite specific criteria. Zero tolerance for inconsistent decisions on identical inputs.

**Options.**
A. A single agent with tools for credit, documents and rules.
B. A deterministic workflow: LLM extracts from documents; a rules engine decides.
C. A multi-agent system: Extractor → Verifier → Underwriter → Explainer.
D. An LLM that reads the rules and decides, with a validator checking the decision.

**Best: B.**

**Why the others are worse.**
- **A** — the decision path varies per run, so identical inputs can yield different decisions. In a regulated
  lending context that is a compliance failure, not a quality issue.
- **C** — error compounding (0.95⁴ ≈ 81%), four times the cost, and the underwriting decision is still made by
  a model. Multi-agent adds nothing here because there is no context-isolation or parallelism need.
- **D** — closest to plausible, but a model applying rules will occasionally misapply them, and "the validator
  caught it" is not the same as "the decision was made by the rules". Explainability becomes post-hoc
  rationalisation rather than derivation.

**Hidden assumptions.** That the rules are actually codified (often they live in an underwriter's head — surface
this early); that document extraction is the hard part (it is); that "explainable" means natural language (it
usually means *traceable to a criterion*).

**Security.** Applicant documents are untrusted input — an injected instruction in a payslip PDF must not be able
to influence a decision. Because the *decision* is deterministic, injection can at worst corrupt an extracted
field, which validation catches. That is precisely why B is also the secure choice.

**Reliability.** Extraction gets a bounded repair ladder and a confidence gate; low confidence routes to a human
underwriter. The rules engine is unit-tested exhaustively. Decisions are reproducible by construction.

**Cost/performance.** One or two Haiku/Sonnet extraction calls per application, batched where the SLA allows.
Rules evaluation is free. Roughly an order of magnitude cheaper than A or C.

---

## S2 — Single vs multi-agent: the security audit

**Problem.** Audit a 500-repository estate for hardcoded secrets, vulnerable dependencies and insecure patterns;
produce a prioritised report.

**Constraints.** Must complete overnight (8 hours). Source code must not leave the network. Budget $200/run.

**Options.**
A. One agent iterating over repositories.
B. Coordinator + 20 parallel repository-auditor subagents.
C. Deterministic scanners (secret scanning, SCA, SAST) with an LLM triaging and prioritising findings.
D. One agent per finding category across all repositories.

**Best: C.**

**Why the others are worse.**
- **A** — 500 repositories will not fit one context; serial execution misses the window.
- **B** — the right *shape* if the work needed judgement, but it is 500 agent runs to do what `gitleaks` and a
  dependency scanner do better, faster, deterministically and free. It would blow the budget and produce worse
  recall on the mechanical checks.
- **D** — same objection, organised differently.

**Why C.** Secret detection and dependency vulnerability matching are **deterministic pattern problems with
mature tooling**. The genuinely hard part is triage: which of the 4,000 findings matter, which are false
positives, which are reachable in production. That is judgement, and that is where the model belongs.

**Hidden assumptions.** That existing scanners are not already in place (check first); that the customer's real
problem is detection (it is usually **alert fatigue** — 4,000 findings nobody reads).

**Security.** Code stays local: scanners run in the network, and only **findings metadata** (file, rule, snippet
hash, dependency version) is sent to the model — not the source. If snippets are needed, redact and bound them.

**Reliability.** Scanners are deterministic and reproducible. The LLM triage layer is evaluated against
human-labelled priorities, with disagreement rates tracked.

**Cost/performance.** Scanners are effectively free; triage is one batched call per repository or per finding
cluster. Comfortably inside $200 and inside the window.

**The generalisable lesson.** *Do not use an agent for a problem that has a good deterministic tool. Use the
model where the judgement is.*

---

## S3 — RAG vs long context: the contract review assistant

**Problem.** Lawyers ask questions about a specific 80-page contract they have open.

**Constraints.** p95 < 6s. Answers must quote exact clause text. ~500 queries/day across ~50 active contracts.

**Options.**
A. RAG over a chunked index of all contracts.
B. Load the full contract into a cached prompt per session.
C. Hybrid: retrieve clauses, but include surrounding sections.
D. Fine-tune on the contract corpus.

**Best: B.**

**Why the others are worse.**
- **A** — 80 pages (~50K tokens) fits comfortably in context. Chunking a legal document is actively harmful:
  cross-references between clauses are the substance of contract interpretation, and chunk boundaries destroy
  them. You would also add a retrieval-failure mode for no benefit.
- **C** — better than A, but still solving a problem you do not have.
- **D** — fine-tuning adds behaviour, not knowledge; no citations; stale immediately; wrong tool entirely.

**Why B.** One contract per session is stable for the session's duration, so **prompt caching** makes the second
and subsequent questions cheap. The model sees the whole document, so cross-clause reasoning works. Use the
**[Claude-specific] citations feature** to get verifiable clause quotes.

**Hidden assumptions.** That questions are about *one* contract at a time (verify — "compare these two
contracts" changes the answer); that 80 pages is representative (a 400-page master agreement with schedules
might not be).

**Security.** Contracts are confidential: check data-residency requirements and pin `inference_geo`; ensure
traces do not persist contract text where privilege could be compromised.

**Reliability.** Citations are verified against the source text before display. If the contract exceeds the
window, fall back to section-level retrieval with generous context — and detect that case explicitly rather
than truncating.

**Cost/performance.** ~50K cached tokens ≈ 10% on follow-up questions; first question pays the write. With
~10 questions per contract session, caching cuts cost by roughly 80%. Latency is dominated by TTFT, which
caching also improves.

**Note the reversal.** If the question were "find the indemnity clause across our 10,000 contracts", the answer
flips to RAG. **Corpus size and relevant fraction decide this, not fashion.**

---

## S4 — MCP vs direct API: the internal platform decision

**Problem.** A platform team is asked to expose the deployment system to AI agents. Two consumers exist today
(a Claude Code workflow and a Slack bot); three more teams are "interested".

**Constraints.** Deployments are irreversible in effect. The system is inside a VPC. The platform team has two
engineers.

**Options.**
A. Direct tool definitions in each consumer.
B. An MCP server, self-hosted inside the VPC, consumed by both clients.
C. The Claude API's MCP connector pointing at the deployment system.
D. Wait until there are five consumers.

**Best: B.**

**Why the others are worse.**
- **A** — with two consumers already and more coming, you get duplicated tool definitions that drift, two
  places to fix a description, and two independent authorisation implementations. This is exactly the N×M
  problem MCP solves.
- **C** — **disqualified on network grounds**: the MCP connector connects from Anthropic's infrastructure, so a
  VPC-internal service is unreachable, and your egress controls would not apply even if it were.
- **D** — the threshold is already met; waiting means paying migration cost later on more consumers.

**Hidden assumptions.** That the three "interested" teams are real (weight the decision on the two that exist);
that the platform team can operate a server (two engineers can, if it is small — curate to ~6 tools).

**Security.** Deployments are irreversible: use `_meta["anthropic/requiresUserInteraction"]` on the deploy tool
so every call prompts a human even in permissive modes and allow rules cannot skip it. Per-user OAuth so the
deployment is attributed to a person. Environment allowlists and change-freeze checks in a deterministic gate.
Pin the server version; review tool descriptions on upgrade.

**Reliability.** Server outage must degrade consumers, not break them. Health checks, reconnect with backoff,
and an explicit "deployments unavailable" message.

**Cost/performance.** Six tool schemas is a negligible context cost. One server to operate instead of two tool
implementations to maintain.

---

## S5 — Tool design: the "one big tool" temptation

**Problem.** A CRM agent needs to read and update accounts, contacts, opportunities and activities — 24
operations in total.

**Constraints.** Sales reps may edit their own accounts only. Managers may edit their team's. Deletion is
admin-only.

**Options.**
A. One `crm_operation(entity, action, payload)` tool.
B. Four tools, one per entity, each with an `action` parameter.
C. 24 tools, one per operation.
D. 10 tools shaped by user intent, with tool sets varying by role.

**Best: D.**

**Why the others are worse.**
- **A** — authorisation cannot be expressed ("may this user call `crm_operation`?" is not a useful question),
  argument accuracy is poor, every action looks identical in audit logs, and the harness cannot distinguish a
  safe read from a destructive delete for parallelism or gating.
- **B** — the same objection at a smaller scale: `crm_operation(entity="account", action="delete")` still hides
  the permission boundary inside a parameter.
- **C** — authorisation is now expressible, but 24 tools degrades selection accuracy and inflates context; many
  of them map to internal shapes rather than to what a rep actually wants to do.

**Why D.** **The tool boundary must align with the permission boundary** — that is the decisive constraint
here. Ten intent-shaped tools (`update_opportunity_stage`, `log_activity`, `reassign_account`) give per-tool
authorisation, per-tool error semantics, meaningful audit lines, and better selection. Vary the set by role, so
a rep never sees `delete_account`.

**Hidden assumptions.** That 24 operations are all needed (audit usage — often a third are never called); that
role sets are stable enough to group into a few **tool profiles** rather than per-user lists.

**Security.** Authorise on **arguments**, not just the tool: `update_account(id)` must verify this user owns
that account. Per-role tool sets are defence in depth, not the primary control.

**Reliability.** Idempotency keys on writes; staleness checks on updates (reject if the record changed since the
agent read it).

**Cost/performance.** Per-user tool lists destroy prompt-cache sharing. Group into 3–4 **profiles**
(`rep`, `manager`, `admin`, `readonly`) so the prefix is shared within a profile — this is a real and often
overlooked cost decision.

---

## S6 — Prompt injection: the résumé screener with a twist

**Problem.** An ATS uses an agent to screen résumés and **automatically schedules interviews** with candidates
scoring above a bar, via a calendar tool.

**Constraints.** 2,000 applications/week. Employment-law exposure around consistency and discrimination.

**Options.**
A. Instruct the model to ignore instructions embedded in résumés.
B. Strip non-visible text during extraction, then screen.
C. Remove the scheduling capability; the agent proposes, a recruiter confirms.
D. A second model verifies the score against the extracted text.

**Best: C** (with B as a required supporting control).

**Why the others are worse.**
- **A** — prompt-level only; bypassable by rephrasing. Lowest rank in the defence hierarchy.
- **B** — necessary and cheap, and it removes the most common vector, but it does not cover paraphrased or
  visible-but-adversarial content.
- **D** — the verifier reads the same injected text and can be injected too. Useful in depth, not as the primary
  control.

**Why C.** The severity of an injection is set by **capability**. Screening produces a wrong ranking; screening
*plus autonomous scheduling* produces real-world actions on an attacker's behalf. Removing the action collapses
the risk to a wrong score, which the recruiter sees. This is the "reduce capability" answer, and it is nearly
always the strongest one available.

**Hidden assumptions.** That automatic scheduling is a genuine requirement (it is usually a convenience);
that ranking is the product (the legal exposure suggests the real product is *consistent, documented* screening).

**Security.** Combine C + B + delimited untrusted content + output validation. Note the legal dimension: an
injected résumé that inflates a score is also a **fairness** problem — log every score with its evidence so
decisions are auditable and challengeable.

**Reliability.** Consistency matters legally: use **explicit criteria** and structured evidence
(`{criterion, met, quoted_span}`) so the score is derived from evidence rather than vibes, and identical résumés
score identically.

**Cost/performance.** One call per résumé, batched. Recruiter confirmation costs seconds per candidate and buys
the entire risk reduction.

---

## S7 — Context management: the 12-hour migration agent

**Problem.** An agent migrates a service from one message broker to another across 180 files, running for hours.

**Constraints.** Must be resumable after a crash. Must not leave the repository in a broken intermediate state.
Budget $80.

**Options.**
A. One long-running agent with compaction enabled.
B. Coordinator + per-file subagents in worktrees.
C. A deterministic driver that iterates files and calls a bounded agent per file, tracking state in a file.
D. One agent per module (6 modules), sequential.

**Best: C.**

**Why the others are worse.**
- **A** — even with compaction, a 12-hour single context accumulates noise; a crash loses everything; and
  quality degrades late in the run precisely when the remaining files are the awkward ones.
- **B** — good for parallelism, but 180 parallel worktrees is heavy, and this migration has **shared decisions**
  (the new client wrapper's shape) that must be made once. Parallel agents would invent 180 variants.
- **D** — better, but still large contexts per module and no per-file resumability.

**Why C.** The decomposition is **static and known** ("one subtask per file"), so code it — do not spend model
calls deciding it. A deterministic driver gives you a checkpointed state file, natural resumability, per-file
budget enforcement, and a place to make the shared decisions once and pass them as constraints.

**Hidden assumptions.** That files are independent (they are not fully — the shared wrapper must be designed
first, in a separate up-front step); that "not broken intermediate state" means atomic (it means a branch that
is only merged when the full suite is green).

**Security.** Standard coding-agent controls: sandbox, egress allowlist, deny writes to `.github/`, `.claude/`
and infra paths, no push rights.

**Reliability.** The critical design: **verification per file** (tests for that module) plus **verification
globally** (full suite before merge) — per-file green does not imply the build is green. State file records
per-file status, so a crash resumes. Bounded attempts per file, then a skip-and-report.

**Cost/performance.** Per-file budget × 180 with a global cap; prompt caching on the stable system prompt,
conventions and the agreed wrapper design. Files that fail twice are reported for human handling rather than
retried indefinitely — which is what keeps the $80 cap real.

---

## S8 — Evaluation: the assistant that got worse without changing

**Problem.** A support assistant's containment rate fell from 62% to 48% over six weeks. No deploys occurred.
Offline evals still pass at the same score.

**Constraints.** Must diagnose before the quarterly review.

**Options.**
A. Upgrade the model.
B. Rebuild the eval set from recent production traffic and re-measure.
C. Add more knowledge-base content.
D. Investigate the input distribution and the corpus freshness.

**Best: D, then B.**

**Why the others are worse.**
- **A** — changing a variable before understanding the failure. If the cause is distribution shift or stale
  content, a better model will not help and you will have spent 5×.
- **C** — plausible but unfounded; adding content without knowing the gap can dilute retrieval and make things
  worse.
- **B** — the right *second* step: a passing offline eval on a stale set is exactly the symptom of distribution
  shift, so the eval set is part of the problem. But rebuilding it does not by itself tell you the cause.

**Why D.** The signature — production degradation, offline stability, no deploys — points to something outside
your code changing: a new product launch bringing question types the corpus does not cover; a documentation
migration that broke ingestion; superseded policies not marked; an upstream model or infrastructure change; or a
seasonal shift in the customer mix.

**Hidden assumptions.** That "no deploys" covers everything (check the **retrieval index**, the corpus, upstream
document sources, and config — these change without a deploy); that containment is the right metric (a fall
could also mean *more* honest escalation, which may be an improvement).

**Security.** None directly, but corpus changes are also an injection surface — check *who* changed the corpus.

**Reliability.** The durable fix is **continuous production sampling into the eval set**, which is what would
have caught this in week one, plus alerts on the escalation-reason mix and on ingestion freshness.

**Cost/performance.** Diagnosis is nearly free; a model upgrade is not. Sequence matters.

---

## S9 — Reliability: the agent that half-finished

**Problem.** An agent that provisions cloud resources timed out mid-run. Some resources exist, some do not, and
the state file says "in progress".

**Constraints.** Cannot leave orphaned billable resources. Must be safe to re-run.

**Options.**
A. Re-run from the start.
B. Resume from the state file.
C. Reconcile actual cloud state, then resume.
D. Tear down everything and start over.

**Best: C.**

**Why the others are worse.**
- **A** — creates duplicate resources unless every creation is idempotent (and if it were, you would not have
  this problem).
- **B** — the state file is *your record of intent*, not reality. The timeout may have occurred after a
  resource was created but before the state was written — the classic gap.
- **D** — safe but wasteful, and may not be possible (some resources have deletion protection or dependents).

**Why C.** **Reconcile before resuming.** Query the actual provider state by idempotency key or tag, diff it
against the desired state, and continue from the true position. This is the standard infrastructure pattern and
it generalises to any agent with external side effects.

**Hidden assumptions.** That the state file is trustworthy (it is at best a hint); that "re-runnable" means
idempotent (it means *converging on a desired state*, which is a stronger and better property).

**Security.** Reconciliation reads production state — scope credentials to the run's own resources (tag-based)
so a confused reconcile cannot touch unrelated infrastructure.

**Reliability.** The durable fixes: (1) **idempotency keys on every creation**, derived from `tool_use_id` or a
run ID; (2) **tag every resource with the run ID** so reconciliation is possible at all; (3) write state
*before* acting and confirm *after*; (4) a desired-state/actual-state model rather than a step log; (5) an
orphan sweeper that alerts on tagged resources from failed runs.

**Cost/performance.** Reconciliation is a handful of API calls — trivially cheaper than duplicated
infrastructure or a full teardown.

---

## S10 — Security: the helpful agent and the shared mailbox

**Problem.** An operations agent monitors a shared `alerts@` mailbox, diagnoses incidents, and posts findings to
Slack. It has read access to logs, metrics and the runbook wiki.

**Constraints.** No write access to production. On-call engineers rely on its summaries.

**Options.**
A. It is read-only, so the risk is acceptable.
B. Add prompt-level instructions to ignore embedded instructions.
C. Treat mailbox content as untrusted, restrict egress, and validate Slack output.
D. Require human approval before each Slack post.

**Best: C.**

**Why the others are worse.**
- **A** — false comfort. "Read-only" ignores two real risks: **exfiltration** (the agent can read logs
  containing secrets and post them to a public Slack channel) and **integrity of the summary** (an attacker who
  can email `alerts@` can shape what on-call believes during an incident — a social-engineering channel with
  excellent timing).
- **B** — necessary, insufficient, and the weakest layer.
- **D** — defeats the purpose (the value is speed during an incident) and induces approval fatigue at exactly
  the moment attention is scarcest.

**Why C.** Three concrete controls: (1) delimit mailbox content as untrusted data; (2) **restrict what can be
posted** — validate Slack output against secret patterns, cap length, restrict to specific channels, and never
post raw log excerpts without redaction; (3) **restrict egress** so log content cannot leave via any other path.
Additionally, label every post with its evidence sources so on-call can verify.

**Hidden assumptions.** That anyone can email `alerts@` (usually yes — verify, and restrict the sender domain if
possible, which is a cheap strong control); that Slack channels are private (often not).

**Security.** Note the composition risk: read access to logs + ability to publish = an exfiltration path even
with no write tools. **Capability separation applies to read+publish combinations too**, not just to writes.

**Reliability.** The agent must state uncertainty ("this correlation is weak") rather than asserting causes;
on-call trust is the actual product, and a confident wrong diagnosis during an incident is expensive.

**Cost/performance.** Filter aggressively before invoking the model — most alerts are known patterns and should
be handled by rules. This is both a cost control and a noise control.

---

## S11 — Cost: the demo that cannot ship

**Problem.** A prototype answers questions over 3 years of Slack history. It works well. Cost per question is
$1.40 against a target of $0.05.

**Constraints.** 5,000 questions/day. Cannot lose answer quality.

**Options.**
A. Switch to Haiku.
B. Reduce retrieved context from 40 chunks to 5, with a reranker.
C. Enable prompt caching.
D. Add a semantic cache.

**Best: B + C first, then evaluate A for a routed subset.**

**Why a strict ordering matters.**
- **C (caching)** is free quality-wise. If the system prompt and instructions are stable, this is the first
  move — and the near-certain reason the prototype is expensive is that nothing is cached.
- **B (rerank to 5)** cuts input tokens ~8× **and typically improves accuracy** (dilution and lost-in-the-middle
  work against 40 chunks). This is the rare change that is both cheaper and better.
- **A (Haiku)** trades quality and must be evaluated; do it after the free levers, and expect the answer to be
  *routing* rather than wholesale replacement.
- **D (semantic cache)** carries a correctness risk (similar questions with different answers) and should come
  last, if at all.

**Hidden assumptions.** That 40 chunks were chosen deliberately (they usually were not); that quality is
currently measured (if not, "cannot lose quality" is unfalsifiable — build the eval set first).

**Security.** Slack history is a permissions minefield: private channels and DMs must be ACL-filtered at
retrieval by the asking user's actual channel membership. This constraint alone may dominate the design, and it
rules out any shared cached corpus.

**Reliability.** Add a similarity threshold and measure abstention — three years of Slack contains a lot of
irrelevant noise and a lot of superseded decisions.

**Cost/performance.** Expected trajectory: $1.40 → ~$0.35 (caching) → ~$0.12 (rerank to 5) → ~$0.05 (route 70%
of traffic to a cheaper tier). Every step measured on the eval set.

---

## S12 — Latency: the voice assistant

**Problem.** A voice support assistant must respond within 800ms of the caller finishing speaking, or the pause
feels broken.

**Constraints.** Needs order lookup (250ms) and policy retrieval (150ms).

**Options.**
A. Streaming with Opus and `effort: "max"`.
B. Streaming with Haiku, cached prefix, speculative parallel tool calls.
C. Pre-generate responses for the top 100 intents.
D. Play a filler phrase while generating.

**Best: B + D.**

**Why the others are worse.**
- **A** — `effort: "max"` puts thinking *before* the first token, which is exactly the wrong trade for a latency
  budget measured in hundreds of milliseconds.
- **C** — brittle and unmaintainable at any real intent diversity, though it is a fine *cache* for the top few
  intents.

**Why B + D.** Attack every term of the latency budget: **cached prefix** removes prompt processing;
**Haiku** minimises per-token time; **speculative parallel tool calls** (start the order lookup as soon as the
intent classifier fires, in parallel with generation setup) removes 250ms of serial time; **streaming** starts
audio as soon as the first tokens land. **D** is a UX control that buys ~400ms of real budget honestly — humans
accept "let me check that for you" as natural conversation.

**Hidden assumptions.** That 800ms is a hard perceptual threshold (it is a *design* threshold, and filler speech
legitimately extends it); that tool latency is fixed (a cache on order lookups may cut the 250ms).

**Security.** Voice adds identity risk: authenticate the caller before any account-specific lookup, and never
read back full PII over the phone.

**Reliability.** If the model is slow or unavailable, the filler phrase must be followed by a graceful
fallback ("let me put you through to an agent") — never silence. Time-box hard.

**Cost/performance.** Haiku + caching makes per-call cost small; the expensive resource here is the caller's
patience, so optimise for TTFT above all.

---

## S13 — Human approval: the approval queue that became the bottleneck

**Problem.** An agent proposes marketing-copy changes across a website. All changes require approval. The queue
now has 3,000 pending items and reviewers approve in bulk without reading.

**Constraints.** Brand and legal compliance are genuine requirements.

**Options.**
A. Hire more reviewers.
B. Tiered autonomy: auto-approve low-risk changes, review the rest.
C. Remove approval; rely on post-hoc audit and rollback.
D. Improve the model so approvals are unnecessary.

**Best: B, with elements of C.**

**Why the others are worse.**
- **A** — scales cost linearly with a process problem; does not fix rubber-stamping.
- **C** — too far for legal/brand claims, which have external consequences.
- **D** — no accuracy level removes the *compliance* requirement for certain claim types.

**Why B.** Rubber-stamping is worse than no gate: it manufactures the *appearance* of oversight. Segment by
risk: typo and formatting changes auto-apply with post-hoc audit; tone and phrasing changes get sampled review;
**anything touching a regulated claim, price, or legal term always gets reviewed** — and that queue is small
enough to be read properly.

**Hidden assumptions.** That all changes carry equal risk (they emphatically do not — this is the whole
insight); that reviewers can assess a change in isolation (give them a diff, the page context, and the reason).

**Security.** Website copy is published output: validate against a prohibited-claims list deterministically
before it reaches a human, so the queue contains only genuine judgement calls.

**Reliability.** Everything is versioned and revertible; a bulk-revert by run ID exists; changes are tagged as
AI-originated. Measure the **approval-to-revert rate** as the honest signal of whether the gate is working.

**Cost/performance.** The dominant cost is reviewer time. Cutting the review queue by 90% while *raising* the
quality of review on the remaining 10% is the actual win.

---

## S14 — Multi-agent handoff: the confidence that appeared from nowhere

**Problem.** A three-stage pipeline (Extract → Enrich → Decide) outputs decisions with `confidence: 0.95`.
Auditors find that the extraction stage frequently reports 0.5 on the same records.

**Constraints.** Regulated; confidence drives an automated/manual routing decision.

**Options.**
A. Instruct the final stage to consider upstream confidence.
B. Propagate confidence structurally and compute the final value in code.
C. Remove confidence from the output.
D. Have a fourth agent audit consistency.

**Best: B.**

**Why the others are worse.**
- **A** — asks a model to do arithmetic on values it may not attend to; unverifiable and non-reproducible.
- **C** — throws away a genuinely useful signal that a routing decision depends on.
- **D** — a fourth stage adds cost and another error term to fix an accounting problem that belongs in code.

**Why B.** Confidence aggregation is a **deterministic computation**, not a judgement. Each stage emits
`{value, confidence, provenance}`; the orchestrator computes the final confidence with a stated rule — `min()`
for conjunctive dependencies — and a validator **rejects any output whose confidence exceeds the minimum of its
inputs**. The rule is documented, testable and auditable.

**Hidden assumptions.** That the model's self-reported confidence is calibrated (it usually is not — calibrate
before thresholding, §11.3.3); that `min()` is right for every case (state the rule per dependency type and
justify it).

**Security.** In a regulated setting, "confidence laundering" is an audit finding: the system asserted certainty
it did not have. Structural propagation is also a compliance control.

**Reliability.** This is the D5 topic of **error propagation across multi-agent systems** in its purest form:
uncertainty and failures must be first-class in the handoff schema, never omitted.

**Cost/performance.** Free — it is a schema and a function. Consider also whether three stages are needed at
all (§15, Q3): fewer stages means less compounding and less to propagate.

---

## S15 — Structured output: the enum that grew

**Problem.** A ticket classifier uses a 12-value enum. Product adds three new categories. After deployment, 8%
of tickets are misclassified into the old categories, and downstream automation breaks on the new values.

**Constraints.** Downstream consumers switch exhaustively on the enum.

**Options.**
A. Add the values to the enum and redeploy.
B. Version the schema; run both versions during a transition; update consumers first.
C. Add an `"other"` value and map downstream.
D. Remove the enum and use free text.

**Best: B.**

**Why the others are worse.**
- **A** — **adding an enum value is a breaking change for exhaustive consumers**, which is precisely the
  reported failure. Redeploying the producer first guarantees breakage.
- **C** — useful as a permanent safety valve, but it does not solve the ordering problem, and mapping "other"
  downstream re-creates the classification problem in code.
- **D** — abandons the guarantee that eliminated a whole failure class; free text will drift.

**Why B.** Treat the schema as an API contract: bump the version, emit `schema_version` in the payload, deploy
consumer support first, then switch the producer, then deprecate. The 8% misclassification is a separate
problem — the model had no way to express the new categories, so it forced them into the nearest old ones.
Fix that with the new enum **plus** updated few-shot examples and criteria, and re-evaluate.

**Hidden assumptions.** That the new categories are cleanly separable from the old (check: if "billing" now
splits into "billing-dispute" and "billing-question", the model needs explicit criteria to distinguish them, and
historical labels are now ambiguous).

**Security.** None directly, though a downstream crash on an unknown enum is an availability issue.

**Reliability.** Add a permanent `"other"` (or nullable) member so an unmodelled case is representable rather
than mis-assigned; monitor its rate as a coverage signal. Consumers should handle unknown values defensively
regardless of contract.

**Cost/performance.** Negligible. The real cost is the coordination, which is why the rollout order is the
answer.

---

## S16 — Retrieval: the query nobody could answer

**Problem.** Users ask "what changed in the API last quarter?" The RAG system returns unrelated documents.

**Constraints.** Changelogs, release notes and migration guides are all indexed.

**Options.**
A. Increase k from 5 to 30.
B. Add metadata filtering on date and document type, plus query understanding.
C. Switch to a better embedding model.
D. Use an agent that can search iteratively.

**Best: B.**

**Why the others are worse.**
- **A** — the classic wrong instinct. More chunks dilutes attention and raises cost; if the right documents are
  not being *ranked*, more of the wrong ones does not help.
- **C** — embeddings capture topical similarity; "last quarter" is a **temporal filter**, not a topic. No
  embedding model will fix it.
- **D** — could work, but it is an expensive way to compensate for missing metadata.

**Why B.** This query has two components the vector space cannot express: a **date range** and a **document
type**. The fix is query understanding (parse "last quarter" into an explicit date range relative to today) plus
**metadata pre-filtering** on `effective_date` and `doc_type in (changelog, release_notes)`. Then rank within
the filtered set.

**Hidden assumptions.** That "last quarter" is unambiguous (calendar or fiscal? relative to when?) — resolve it
explicitly and state the interpretation in the answer; that the changelogs carry dates in metadata (if
ingestion did not capture `effective_date`, that is the actual bug).

**Security.** Date filters must not become an ACL bypass — apply the ACL filter in the same query.

**Reliability.** Aggregate queries ("what changed") are a different shape from lookup queries ("how does X
work"). Route them: an aggregate query may need *all* matching documents in a date range, not top-k semantic
matches. Recognising this class is the durable improvement.

**Cost/performance.** Filtering *reduces* the candidate set, so it is cheaper as well as more accurate.

---

## S17 — Claude Code: the rule that keeps being ignored

**Problem.** A team requires that all database migrations be reviewed by the data team. They put "always ask the
data team before writing a migration" in CLAUDE.md. Agents keep writing migrations anyway.

**Constraints.** The requirement is a real governance control.

**Options.**
A. Make the CLAUDE.md wording stronger and put it at the top.
B. A path-scoped rule on `migrations/**`.
C. A PreToolUse hook denying edits under `migrations/`.
D. A permission deny rule on `Edit(migrations/**)`.

**Best: C or D — and understanding why is the point.**

**Why the others are worse.**
- **A** — CLAUDE.md is **context, not enforced configuration**. It is delivered as a user message after the
  system prompt; there is no compliance guarantee, and a long session or a compaction can weaken it further.
- **B** — better scoping and it loads exactly when relevant, but it is still an instruction. It is also **lost
  after compaction** until a matching file is read again — so it is at its weakest in exactly the long sessions
  where the mistake happens.

**Why C or D.** Both are enforced by the harness regardless of what the model decides. Choose between them:
- **D (`deny: ["Edit(migrations/**)"]`)** is simplest and declarative. Note that as a *deny* rule, a
  single-segment relative pattern matches at **any depth**, which is usually what you want here.
- **C (PreToolUse hook)** is right when the rule is conditional — e.g. allow the edit if an approval ticket ID
  is present, or block only `ALTER`/`DROP` statements. It can also return a helpful reason the model acts on.

Keep a short CLAUDE.md line as well, so the agent anticipates the gate rather than discovering it.

**Hidden assumptions.** That the team wants a hard block (maybe they want *review*, which suggests the agent
should be allowed to draft a migration in a scratch directory and open a PR to the data team).

**Security.** Governance controls implemented as prose are not controls. This generalises to every "we told it
not to" answer.

**Reliability.** Enforce the same rule in CI so it holds for humans and for agents running outside this
configuration — belt and braces.

**Cost/performance.** Free.

---

## S18 — MCP failure: the server that took the agent down

**Problem.** An internal MCP server became slow (30s per call). Agents using it began timing out entirely, and
users saw hard errors rather than degraded service.

**Constraints.** The server owner cannot fix the latency this quarter.

**Options.**
A. Increase the client timeout.
B. Set a per-server timeout, handle the error, and degrade.
C. Remove the server.
D. Cache the server's responses.

**Best: B (with D where semantics allow).**

**Why the others are worse.**
- **A** — makes the symptom worse: the agent now blocks for longer and the user waits longer for the same
  failure.
- **C** — throws away a needed capability.
- **D** — helps only for cacheable, non-volatile data, and does nothing for a cold cache.

**Why B.** Set a per-server `timeout` in `.mcp.json` sized to the SLO, catch the failure, and return a
`tool_result` with `is_error: true` and an informative message ("the inventory service is degraded; you may
answer from the information already gathered or tell the user this check is unavailable"). The agent then
**degrades gracefully** instead of failing. Add a circuit breaker so a chronically failing server is skipped
rather than retried on every request.

**Hidden assumptions.** That the capability is essential to every request (usually it is needed for a subset —
route so only those requests pay).

**Security.** None directly, though an unavailable authoritative source is a moment when models are most likely
to answer from priors — make the "cannot verify" path explicit.

**Reliability.** This is the core MCP resilience principle: **a server outage must degrade the agent, not break
it.** Also relevant: an MCP call still running after two minutes is automatically backgrounded, which changes
the failure shape — design for it rather than being surprised by it.

**Cost/performance.** A 30s hang consumes a worker slot and a user's patience. Timeouts protect throughput as
well as UX.

---

## S19 — When not to use AI at all

**Problem.** A finance team wants an AI agent to reconcile bank transactions against invoices, currently 6
hours/week of manual work.

**Constraints.** Must be exactly correct. Auditable. 4,000 transactions/month.

**Options.**
A. An agent with database tools that reconciles autonomously.
B. Deterministic matching (amount + date + reference), with an LLM only for the unmatched residue.
C. An LLM that reads both lists and produces matches.
D. Do not use AI; improve the matching rules.

**Best: B, and seriously consider D.**

**Why the others are worse.**
- **A** and **C** — reconciliation is an **exact matching problem** with a correct answer. An LLM will
  occasionally match the wrong pair, and in accounting a plausible-but-wrong match is far worse than an
  unmatched item flagged for a human. Auditability also suffers: "the model matched these" is not an audit
  trail.
- **D alone** — probably captures 90–95% of the value, which is why it must be considered first, but a residue
  of genuinely fuzzy cases (typo'd references, partial payments, merged invoices) will remain.

**Why B.** Deterministic rules handle the bulk exactly and auditably. The LLM earns its place only on the
residue, where the input is genuinely fuzzy — and even there it should **propose** matches with evidence and
confidence for human confirmation, not commit them.

**Hidden assumptions.** That the 6 hours are spent matching (much of it is often chasing missing references —
a **data-entry problem**, best solved upstream); that AI is the ask (the customer may simply want the 6 hours
back, and better rules plus a cleaner reference format may deliver it).

**Security.** Financial data: minimise what is sent (amounts, dates, reference strings — not full customer
records), and control residency.

**Reliability.** Every proposed match carries evidence; nothing auto-commits above a value threshold; a full
audit trail records rule-matched vs model-proposed vs human-confirmed.

**Cost/performance.** 4,000 transactions/month is *tiny*. The honest advice is that the engineering effort must
be justified by the 6 hours saved — which strongly favours the cheapest solution that works, and that is
usually better rules.

**The lesson.** *Knowing when not to use an LLM is an architectural skill, and it is the most under-selected
correct answer on this exam.*

---

## S20 — The composite: an incident-response copilot

**Problem.** Design an assistant that helps on-call engineers during incidents: gathers signals, suggests
hypotheses, drafts a status update, and can execute a small set of remediations.

**Constraints.** Incidents are high-stress and time-critical. Remediation actions affect production. Postmortems
require a full record. Logs and alerts contain content from external systems.

**Sketch the architecture, then compare with the answer.**

<details><summary>Answer</summary>

**Shape: a workflow with one bounded agentic investigation step, plan-then-execute for remediation, and tiered
autonomy.**

**Gather (deterministic).** On incident open, a fixed pipeline pulls the standard signals: recent deploys,
error-rate and latency series, dependency health, related alerts, recent incidents on the same service. This is
known and should never be a model decision — it is faster, cheaper and more reliable as code.

**Investigate (bounded agent).** Read-only tools (query logs, query metrics, read runbooks, read the deploy
history). Bounded: step cap, wall-clock deadline (an incident copilot that takes 10 minutes is useless), token
budget. Output is a **structured hypothesis list** — `{hypothesis, supporting_evidence[], confidence,
suggested_next_check}` — not prose. Structure matters here because on-call must scan it in seconds.

**Draft (single call).** A status update from a template, grounded strictly in confirmed facts, with explicit
"what we know / what we don't know / next update at". Never let it assert a cause that is only a hypothesis.

**Remediate (plan-then-execute + tiered autonomy).**
- Read-only diagnosis is autonomous.
- **Reversible, single-instance, low-blast-radius** actions (restart one pod, scale up) may auto-execute inside
  a rate limit.
- Anything **irreversible or multi-instance** (rollback, scale-to-zero, failover, any data operation) requires
  human confirmation with a one-tap approval carrying the plan, the evidence and the blast radius.
- A **circuit breaker** stops after N remediations in a window and pages a human — the anti-cascade control,
  and essential because incidents generate the very alerts that trigger the agent.

**Security.** Logs and alert payloads are **untrusted content** (they contain external input) — delimit them, and
never let their content authorise an action. Capability separation: the component reading logs holds no
remediation credentials. Egress allowlisting so log content cannot leave. The agent acts as the on-call
engineer's identity, not as a superuser.

**Reliability.** Every recommendation states confidence and evidence; the copilot must be comfortable saying "I
don't know". Verify after acting (did the alert clear?) and escalate rather than trying something else. If the
model or a tool is unavailable, degrade to the deterministic signal gather — which is still genuinely useful.

**Observability and postmortem.** Immutable record of alert → signals → hypotheses → actions proposed →
approvals → actions taken → outcome. This is both the audit trail and, conveniently, most of the postmortem
timeline.

**Cost/performance.** Latency dominates value, so: cache the stable prefix, run signal gathering in parallel,
stream the hypothesis list, and time-box the investigation hard. Filter aggressively — most alerts are known
patterns and should never reach the model.

**Why not a free-roaming agent?** Because the gathering steps are known (workflow), the remediation set is small
and known (gated tools), and the blast radius is production. The genuinely open-ended part — hypothesis
generation — is one bounded step, which is exactly where the agent belongs.

**Rollout.** Ship read-only first. Measure hypothesis usefulness (did on-call act on it?) and status-update
acceptance. Graduate individual remediation types to autonomy only where measured accuracy justifies it.
</details>

---

## How to use this bank in the final week

1. Cover the answers. Write your choice and one sentence of justification for each.
2. Score yourself on the *reasoning*, not the letter — the exam rewards knowing why the alternatives fail.
3. For every one you got wrong, find the section it maps to and re-read only that.
4. The recurring correct-answer shapes: **reduce capability**, **add a deterministic gate**, **verify rather
   than trust**, **use the simplest tier that meets the constraint**, and **do not use an LLM where a rule
   works.**
