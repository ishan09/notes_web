# 11 — Evaluation

> **Domain mapping:** cross-cutting. Evaluation is not a named domain, but "how would you know it works?" is the
> tiebreaker in a large share of scenario questions — and an option that adds an evaluation gate is very often
> the right one. **[Engineering knowledge]** for the metric internals; **[Architecture]** for the decisions.

---

## 11.1 Why evaluation matters

### 11.1.1 Why a demo proves nothing

| Demo | Production |
|---|---|
| You chose the inputs | Users choose the inputs |
| You saw the good runs | Every run counts |
| One sample per case | Non-determinism means a distribution |
| Fixed model and prompt | Both change under you |
| You interpret the output | Downstream code consumes it |

An LLM system's behaviour is a **distribution**, not a function. "It worked when I tried it" is a sample size of
one from a distribution you have not characterised.

### 11.1.2 The four things evaluation buys you

1. **A baseline.** You cannot claim an improvement without one.
2. **A regression gate.** Prompt, model, tool and retrieval changes are all behaviour changes; evaluation is
   the only thing standing between them and production.
3. **A decision instrument.** "Is Haiku good enough here?" is answerable only with data.
4. **A shipping licence.** For regulated or high-stakes systems, measured accuracy is a compliance artefact.

> **Practical rule:** build the eval set *before* you tune the prompt. Otherwise you tune against your
> intuitions and your first measurement is already contaminated.

---

## 11.2 Types of evaluation

| Type | What | Cost | Use for |
|---|---|---|---|
| **Offline / golden set** | Fixed labelled dataset, run in CI | Low | Regression gating, comparisons |
| **Online / production** | Metrics on live traffic | Low marginal | Drift detection, real quality |
| **Human evaluation** | Experts score outputs | High | Ground truth, subjective quality |
| **Automated / programmatic** | Assertions, exact match, schema checks | Very low | Anything mechanically checkable |
| **LLM-as-judge** | A model scores outputs against a rubric | Medium | Subjective quality at scale |
| **A/B test** | Two variants on live traffic | Medium | Business impact |
| **Red teaming** | Adversarial probing | High | Security and safety |

### 11.2.1 The evaluation ladder

Use the cheapest method that can answer the question:

```
1. Programmatic assertions   — is the JSON valid? does the field equal X? did tool Y get called?
2. Deterministic metrics     — exact match, F1, recall@k, latency, cost
3. LLM-as-judge              — is this answer faithful to the context? is the tone right?
4. Human review              — is this actually correct and useful?
```

Most teams jump to 3 and skip 1–2, which are cheaper, deterministic, and catch more real defects.

### 11.2.2 LLM-as-judge — how to do it properly

An LLM scoring outputs against a rubric. Cheap and scalable; also biased, and a source of false confidence if
built carelessly.

**Rules:**

| Rule | Why |
|---|---|
| **Explicit criteria, not "rate 1–10"** | A bare numeric scale is not reproducible. Define what each level means. |
| **Binary or few-valued judgements** | "Is every claim supported? yes/no" is far more reliable than a 7-point scale. |
| **Require evidence** | Make the judge quote the span that justifies its verdict — checkable, and it improves accuracy. |
| **Use a capable model** | A weak judge is noise. |
| **Validate against humans** | Measure judge–human agreement (Cohen's κ) on a sample **before** trusting it. If κ is low, fix the rubric. |
| **Beware self-preference** | A model judging its own output is biased toward it. Prefer a different model, or at least be aware. |
| **Beware position and verbosity bias** | In pairwise comparison, randomise order; longer answers score higher unless the rubric penalises it. |
| **Structured output** | Judge verdicts should be schema-constrained so they aggregate cleanly. |

```python
JUDGE_SCHEMA = {
  "type": "object", "additionalProperties": False,
  "required": ["faithful", "unsupported_claims", "reasoning"],
  "properties": {
    "faithful": {"type": "boolean",
      "description": "True only if EVERY factual claim is supported by <context>."},
    "unsupported_claims": {"type": "array", "items": {"type": "string"},
      "description": "Verbatim claims not supported by the context. Empty if faithful."},
    "reasoning": {"type": "string"}
  }
}
```

---

## 11.3 Metrics

### 11.3.1 Classification and extraction

| Metric | Definition | Use when |
|---|---|---|
| **Accuracy** | correct / total | Balanced classes |
| **Precision** | TP / (TP+FP) | False positives are expensive (flagging a good customer as fraud) |
| **Recall** | TP / (TP+FN) | False negatives are expensive (missing actual fraud) |
| **F1** | Harmonic mean | Balanced view; report per class |
| **Field-level accuracy** | Per field, not per record | Extraction — tells you *which* field regressed |
| **Exact match** | String equality | IDs, enums, dates |

**Never report only accuracy on imbalanced data.** 99% accuracy on a 1%-positive fraud task is achieved by
predicting "no" every time.

**Choosing between precision and recall is a product decision, not a modelling one.** Write down the cost of a
false positive and a false negative before you pick.

### 11.3.2 Generation quality

| Metric | Definition |
|---|---|
| **Faithfulness / groundedness** | Every claim is supported by the provided context |
| **Answer relevance** | The answer addresses the question asked |
| **Completeness** | Nothing material is missing |
| **Hallucination rate** | Share of responses containing an unsupported claim |
| **Abstention rate** | Share where the system correctly says "I don't know" |
| **Citation validity** | Every citation resolves and the quoted span exists |

**Abstention rate is the most under-used metric in RAG systems.** A system that never abstains on a corpus with
real gaps is hallucinating, and no other metric will show it.

### 11.3.3 Calibration **[named in D5 as "confidence calibration"]**

A confidence score is **calibrated** if, among predictions with confidence 0.8, ~80% are correct.

**Self-reported LLM confidence is typically poorly calibrated and usually over-confident.** Before you build
routing thresholds on it:

1. Collect (confidence, correct?) pairs on a labelled set.
2. Bin by confidence and plot a **reliability diagram**; compute Expected Calibration Error.
3. If mis-calibrated, either **recalibrate** (isotonic regression, Platt scaling) or **choose the threshold
   empirically** from the observed curve rather than trusting the number's face value.
4. Re-check after every model or prompt change — calibration does not survive them.

**Better proxies for confidence than asking:** self-consistency (sample N times, measure agreement),
retrieval score, whether the answer cites evidence, and whether a validator passed.

### 11.3.4 Operational metrics

Latency (p50/p95/p99, and **time-to-first-token** separately), cost per request and per successful task, token
usage, cache hit rate, error/refusal/truncation rate, and **task success rate** — the one that actually matters
to the business.

---

## 11.4 RAG evaluation

Evaluate the retriever and the generator **separately**, or you cannot tell which is broken.

### Retrieval

| Metric | Meaning |
|---|---|
| **recall@k** | Is the relevant chunk in the top k? *The ceiling on everything downstream.* |
| **precision@k** | How much of the top k is relevant? |
| **MRR** | Reciprocal rank of the first relevant result |
| **nDCG** | Rank-weighted relevance |
| **Context sufficiency** | Do the retrieved chunks *contain enough* to answer? |

### Generation, given the retrieved context

| Metric | Meaning |
|---|---|
| **Faithfulness** | Is every claim supported by the retrieved context? |
| **Answer relevance** | Does it address the question? |
| **Context utilisation** | Did it use the relevant chunk it was given? |
| **Correct abstention** | Did it say "I don't know" when the context was insufficient? |

**The diagnostic matrix:**

| Retrieval | Generation | Diagnosis |
|---|---|---|
| ✅ | ✅ | Working |
| ✅ | ❌ | Prompt/model problem — the evidence was there and it was not used |
| ❌ | ✅ (from priors) | **Dangerous** — right answer, ungrounded. It will be wrong soon |
| ❌ | ❌ (abstains) | Retrieval problem, honest system — fix retrieval |
| ❌ | ❌ (hallucinates) | Retrieval problem **and** missing abstention |

---

## 11.5 Agent evaluation

Agents need **trajectory** evaluation, not just outcome evaluation. Two agents can both succeed while one took
3 steps and the other took 19.

| Metric | Definition | Why |
|---|---|---|
| **Task success rate** | Goal achieved, **verified** | The headline number |
| **Tool-selection accuracy** | Right tool chosen at each decision point | Localises failures |
| **Tool-argument accuracy** | Arguments correct given the tool | Distinguishes schema problems from selection problems |
| **Steps to completion** | Median and p95 | Efficiency; a rising p95 predicts loops |
| **Loop rate** | Runs hitting repeat/no-progress detection | Direct reliability signal |
| **Termination-reason distribution** | goal / step limit / budget / error / escalation | The single most informative agent dashboard |
| **Cost and latency per successful task** | Per *success*, not per run | Failed runs still cost money |
| **Escalation rate** | Handed to a human | Tracks autonomy in practice |
| **Recovery rate** | Recovered after a tool error | Robustness |

**Trajectory evaluation** compares the actual action sequence to reference trajectories: did it call the
required tools? in a valid order? without forbidden actions? with no more than N steps? Assert on the
*properties* of the trajectory, not on an exact match — there are usually several valid paths.

---

## 11.6 Building the evaluation dataset

### 11.6.1 Composition

| Slice | Share | Purpose |
|---|---|---|
| **Typical cases** | ~50% | The common path |
| **Edge cases** | ~25% | Boundaries, empty inputs, very long inputs, ambiguity |
| **Adversarial** | ~15% | Injection attempts, off-topic, jailbreaks, contradictions |
| **Regression cases** | ~10% | Every past production bug, permanently |

**Every production bug becomes a permanent test case.** This is how the suite earns its keep over time.

### 11.6.2 Sourcing

Production traffic (best — it is the true distribution), historical records with known outcomes, expert-authored
cases for rare-but-critical situations, and synthetic generation (useful for volume, dangerous alone because it
inherits the generating model's blind spots).

**Continuous sampling** is the practice that matters most: label a small random slice of production traffic each
week and fold it in. It keeps the eval set representative and is your primary detector of distribution shift.

### 11.6.3 Data leakage — three distinct forms

1. **Prompt contamination** — eval cases also appear as few-shot examples. Keeps the sets disjoint, permanently.
2. **Development overfitting** — you iterate against the eval set until you fit its noise. Keep a **held-out
   test set** you look at rarely (before release, not during development).
3. **Training contamination** — public benchmarks may be in the model's training data. Prefer private eval sets
   built from your own data.

### 11.6.4 Size

Enough that the confidence interval is narrower than the effect you care about. Rough guidance: 50–100 cases
detect large regressions; 200–500 is a solid gate; 1000+ for fine distinctions or per-class metrics on many
classes. **Report confidence intervals**, not bare percentages — 84% on 50 cases and 84% on 5000 are very
different claims.

---

## 11.7 Regression testing and gates

### 11.7.1 What counts as a change requiring evaluation

Everything that alters behaviour: **prompt** edits (including whitespace, in principle), **model** version,
`effort`/thinking settings, **tool** definitions and descriptions, **retrieval** (chunking, embeddings, k,
reranker), **schemas**, and **guardrail** rules.

### 11.7.2 The CI gate

```yaml
- name: Evaluate
  run: python -m evals.run --suite golden --out results.json

- name: Gate
  run: |
    python -m evals.gate results.json \
      --min-accuracy 0.92 \
      --max-regression 0.02 \
      --max-p95-latency-ms 4000 \
      --max-cost-per-task 0.05 \
      --require-pass critical_safety,pii_redaction,injection_resistance
```

Three tiers of gate:

| Tier | Behaviour |
|---|---|
| **Hard gate** | Safety, PII, injection resistance, schema validity — any failure blocks the merge |
| **Threshold gate** | Aggregate quality must not drop more than X | 
| **Report only** | Cost, latency, distribution shifts — surfaced in the PR, not blocking |

Because outputs are non-deterministic, **run each case N times** (3–5) and gate on the aggregate, or you will
have a flaky pipeline that teams learn to ignore.

### 11.7.3 Progressive rollout

```
offline eval → shadow (run new version, do not serve) → canary 5% →
  monitor online metrics → 50% → 100%, with a config-flag rollback
```

**Shadow mode is underused and cheap:** run the candidate on real traffic without serving its output, and
compare. It catches production-distribution problems your golden set does not contain, with zero user risk.

---

## 11.8 Human-in-the-loop evaluation

- **Expert review** for domains where correctness needs judgement (medical, legal, financial).
- **Annotation guidelines** matter more than annotators: ambiguous guidelines produce low agreement and useless
  labels.
- **Inter-rater agreement** (Cohen's κ / Krippendorff's α) tells you whether the task is even well-defined. Low
  agreement means fix the rubric, not the model.
- **Feedback loops**: thumbs up/down (cheap, biased toward extremes), human edits (excellent signal — the delta
  *is* the correction), escalation reasons, and override rate.

**The override rate is the most honest quality metric you have** in a human-in-the-loop system: it measures
whether experts trust the output enough to ship it unchanged.

---

## Key takeaways

- Behaviour is a distribution. Evaluate statistically; report confidence intervals.
- Build the eval set **before** tuning, and keep example and eval sets disjoint.
- Use the cheapest method that answers the question: assertions → deterministic metrics → LLM-judge → human.
- Validate an LLM judge against humans (κ) before trusting it; use binary criteria and require evidence.
- Evaluate retrieval and generation **separately** — the diagnostic matrix tells you which is broken.
- Agents need **trajectory** metrics: tool-selection/argument accuracy, steps, loop rate, and especially the
  **termination-reason distribution**.
- Gate CI on safety hard-gates plus a quality threshold; run each case several times to survive non-determinism.
- Every production bug becomes a permanent regression case; sample production traffic into the set continuously.
- Self-reported confidence must be **calibrated** before you build thresholds on it.

## Things to memorise

- The evaluation ladder.
- The RAG diagnostic matrix (retrieval × generation).
- The agent metric list, especially termination-reason distribution.
- Eval set composition (50/25/15/10) and the three leakage forms.
- LLM-as-judge rules: binary criteria, require evidence, validate with κ, watch self-preference and position
  bias.

## Common mistakes

- Shipping on a demo.
- Evaluating end-to-end only, so you cannot localise a failure.
- Trusting an unvalidated LLM judge.
- Reporting accuracy on imbalanced data.
- Tuning on the test set.
- Treating a model upgrade as an infrastructure change rather than a behaviour change.
- Never measuring abstention rate.

---

## Scenario questions

**Q1.** A team ships a prompt change on Friday. Monday, support tickets spike. The change "looked better" in
manual testing. What process was missing, and what do you build?

<details><summary>Answer</summary>

Missing: an evaluation gate. A prompt change is a behaviour change and must be treated as a release.

Build:
1. **Golden set** of 200–500 cases from production traffic — typical, edge, adversarial, plus every past bug.
2. **CI evaluation** on every prompt PR, each case run 3–5× to survive non-determinism, with confidence
   intervals reported.
3. **Gates**: hard-fail on safety/PII/injection/schema; threshold-fail on aggregate quality regression >2%;
   report-only on cost and latency.
4. **Prompt versioning** with the version in every trace, plus **config-flag rollback** so recovery is a flag
   flip, not a deploy.
5. **Canary + shadow**: run the new prompt in shadow against live traffic, compare, then canary 5%.
6. **Online metrics with alerts** — user-visible error rate, escalation rate, thumbs-down rate — so Monday's
   spike pages someone on Friday evening.
7. **Post-incident**: the failing cases become permanent regression tests.

The framing to state explicitly: **prompts are production code**. They need review, versioning, tests, staged
rollout and rollback.
</details>

**Q2.** A RAG system scores 0.85 faithfulness by LLM-judge, but users say answers are frequently wrong. What is
likely happening?

<details><summary>Answer</summary>

Faithfulness measures *"is the answer supported by the retrieved context?"* — it says nothing about whether the
retrieved context was **correct, complete or current**. A perfectly faithful answer to the wrong document is
still wrong. Likely causes:

1. **Retrieval failure** — the right chunk was never retrieved, so the answer is faithful to an irrelevant one.
   Measure recall@k and context sufficiency separately.
2. **Stale or superseded documents** in the corpus.
3. **Missing abstention** — with insufficient context the system answers anyway.
4. **An unvalidated judge** — 0.85 may not mean what you think. Measure judge–human agreement (κ) on a sample.
5. **Users are asking questions the corpus does not cover** — a coverage problem, not a quality problem.

What to add: **end-to-end correctness against ground truth** (the metric users care about), retrieval metrics,
context sufficiency, abstention rate, and a human-labelled sample to calibrate the judge. Then use the
diagnostic matrix (§11.4) to localise. Faithfulness is a *necessary* metric, never a sufficient one.
</details>

**Q3.** An agent's task success rate is 78%. Leadership wants 95%. Where do you look first?

<details><summary>Answer</summary>

Do not tune the prompt. **Decompose the 22%** first — the fix depends entirely on the failure mix.

1. **Termination-reason distribution** across failed runs: step limit? budget? tool error? refusal? escalation?
   claimed-complete-but-verification-failed? This one chart usually points straight at the problem.
2. **Tool-selection and tool-argument accuracy** per decision point — if selection is the issue, the fix is
   descriptions and tool-set size, not the model.
3. **Steps-to-completion p95** and **loop rate** — a long tail means missing exits, not missing capability.
4. **Failure taxonomy** on 50 failed trajectories, read by hand. This is the highest-value hour available.

Then match fix to cause:

| Cause | Fix |
|---|---|
| Wrong tool / wrong args | Better descriptions, `strict: true`, enums, fewer tools |
| Context saturation | Context editing, compaction, subagents, tighter tool output |
| Loops | Repeat detection, better empty-result semantics, an explicit escalate tool |
| Unverified completion | Verifier in the loop (tests, Stop hook) |
| Genuine capability gap | Higher tier / higher `effort` — measure the delta |
| Ambiguous goals | Better task decomposition and acceptance criteria |

Also challenge the target: if 95% is required and the residual failures are unrecoverable, the answer may be
**human-in-the-loop for the uncertain tail** rather than a better agent — 78% autonomous plus 22% reviewed can
be 100% correct end to end.
</details>

**Q4.** A team wants to switch from Opus to Haiku to cut cost. Design the evaluation.

<details><summary>Answer</summary>

1. **Baseline the current system** on the golden set: quality metrics per slice, p50/p95 latency, cost per
   successful task. You cannot evaluate a change without this.
2. **Run Haiku on the identical set**, several samples per case, and report deltas **with confidence intervals**
   — a 1.5% drop on 100 cases may be noise.
3. **Slice the comparison.** Aggregate numbers hide the truth: break down by task type, input length, difficulty,
   language, and tenant. Haiku often matches on simple cases and falls off on long tool chains or complex
   reasoning — which tells you the *routing* answer rather than the *replace* answer.
4. **Re-tune before judging.** Prompts written for Opus are frequently over-prescriptive; adjust the prompt and
   `effort` for Haiku, and re-run structured-output and tool schemas (constrained decoding helps smaller models
   most).
5. **Check operational metrics too**: latency (usually better), error/refusal rate, schema-violation rate, and
   tool-selection accuracy specifically.
6. **Compute cost per *successful* task**, not per call. If Haiku needs 1.4× the retries, some of the saving
   evaporates.
7. **Shadow, then canary.** Shadow on live traffic, compare, canary 5%, watch online metrics (escalation rate,
   override rate, thumbs-down), then ramp.
8. **Expected outcome: a routing design**, not a wholesale switch — Haiku for the easy majority, Opus for the
   hard tail, with a confidence or complexity signal choosing between them. That usually captures most of the
   saving with none of the quality loss.
</details>

**Q5.** How do you evaluate whether an agent is resistant to prompt injection?

<details><summary>Answer</summary>

Treat it as **security testing with a measured pass rate**, not a qualitative review.

1. **Build an injection corpus** covering the vectors that apply to your system: direct user injection;
   documents with embedded instructions (visible, white-on-white, HTML comments, unicode tricks); poisoned tool
   output; hostile web pages; hostile email/ticket content; and multi-step injections that only activate at
   step 3.
2. **Define the failure condition precisely and mechanically** — not "did it behave oddly" but "did it call a
   forbidden tool / include the system prompt in output / send data to a non-allowlisted host / exceed its
   authorisation". Assert on the **trajectory**, not on the prose.
3. **Measure attack success rate** per vector and per capability. Track it as a first-class metric over time.
4. **Test the layers independently**: with prompt isolation only; plus least privilege; plus the PreToolUse
   gate; plus egress control. This tells you which control is actually carrying the weight — usually not the
   prompt.
5. **Run it in CI as a hard gate.** Injection resistance is a safety gate, not a threshold gate: a new
   successful attack blocks the merge.
6. **Red team periodically with humans**, who will find classes your corpus does not contain, and fold every
   finding in permanently.
7. **Monitor production**: anomalous tool sequences, egress attempts, and unusual argument patterns.

State the honest conclusion: you are measuring **residual risk and blast radius**, not proving immunity.
Injection cannot be eliminated at the prompt layer, so the metric that matters most is "what could a successful
injection actually *do*?" — and that is reduced by architecture, not by testing.
</details>
