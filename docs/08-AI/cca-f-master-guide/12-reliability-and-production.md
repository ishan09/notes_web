# 12 — Reliability and Production Systems

> **Domain mapping:** Domain 5 — *Context Management & Reliability* — **15%**, and the blueprint explicitly
> names **confidence calibration**, **escalation strategies**, and **error propagation across multi-agent
> systems**. Reliability reasoning also decides many Domain 1 questions.

---

## 12.1 Fundamentals

### 12.1.1 What "reliable" means for an AI system

Classic definitions still apply — availability, fault tolerance, graceful degradation — but LLM systems add a
property most services do not have:

> **A conventional service either returns a correct answer or an error. An LLM service can return a
> *confidently wrong* answer with a 200 status.**

That single difference reorganises reliability engineering:

| Classic concern | AI addition |
|---|---|
| Is it up? | Is it *correct*? |
| Did it error? | Did it hallucinate? |
| Latency | Latency **and** cost per request (variable) |
| Deterministic retries | Retries produce *different* output |
| Schema stability | Behaviour drifts with model versions |

**Therefore: silent failure is the primary risk, and detection is a first-class design requirement.**

### 12.1.2 Graceful degradation ladder

Define, in advance, what happens as capability is lost:

```
FULL      agent + tools + retrieval + writes
  ▼       (tool outage)
DEGRADED  answer from retrieval only; state which capability is unavailable
  ▼       (retrieval outage)
LIMITED   answer from the conversation only; offer to escalate
  ▼       (model outage / budget exhausted)
FALLBACK  deterministic response, cached answer, or a human queue
  ▼
HONEST    "This is unavailable right now" — better than a wrong answer
```

**The design rule: every degradation step must be explicit to the user.** An assistant that silently stops
checking inventory and answers from memory is worse than one that says it cannot check.

---

## 12.2 LLM-specific reliability concerns

| Concern | Consequence | Control |
|---|---|---|
| **Non-determinism** | Same input, different output | Validate + retry; idempotent tools; statistical evals |
| **Model deprecation / change** | Behaviour shifts under you | Pin model IDs; eval gate on upgrade; migration runbook |
| **Rate limits** | 429 under load | Client-side limiter, queue, tier segregation, batch |
| **Variable latency** | p99 ≫ p50, driven by output length | Stream; cap `max_tokens`; time-box; async for long work |
| **Variable cost** | Unpredictable spend | Budgets, caps, alerts, per-task cost tracking |
| **Provider incident** | Total outage | Fallback model/provider/region; circuit breaker; degradation ladder |
| **Refusals** | 200 with `stop_reason: "refusal"` | Detect; handle; server-side fallbacks where available |
| **Silent quality drift** | Metrics green, users unhappy | Continuous production sampling into evals |

---

## 12.3 Retry strategies

### 12.3.1 Retryable vs not

| Retryable | Not retryable |
|---|---|
| 429, 500, 529, timeouts, connection errors | 400 (bad request), 401, 403, 404, 413 |
| Transient downstream tool failures | Schema violations caused by a bad schema |
| Validation failure **with corrective feedback** | Refusals (the same request will refuse again) |

**Retrying a 400 is one of the most common and most expensive bugs**: it burns quota, hides the real defect, and
multiplies latency.

### 12.3.2 Exponential backoff with jitter

```python
def with_retry(fn, attempts=4, base=1.0, cap=30.0):
    for i in range(attempts):
        try:
            return fn()
        except RateLimitError as e:
            if i == attempts - 1: raise
            delay = min(cap, base * 2 ** i)
            sleep(getattr(e, "retry_after", None) or random.uniform(0, delay))  # full jitter
        except APIConnectionError:
            if i == attempts - 1: raise
            sleep(random.uniform(0, min(cap, base * 2 ** i)))
        except (BadRequestError, NotFoundError, AuthenticationError):
            raise                                       # never retry
```

**Jitter is not optional.** Without it, every client that received a 429 at the same instant retries at the same
instant, sustaining the overload. Honour `retry-after` when present.

**Budget the total.** SDK defaults are `timeout` 10 minutes and `max_retries` 2, and **timeouts are retried**, so
worst-case wall clock is `timeout × (max_retries + 1)`. Set an explicit per-request timeout on interactive paths
or your upstream SLO is meaningless.

### 12.3.3 Idempotency

Retries at any layer (SDK, your code, the model) can duplicate side effects. The rule from §2.6.4:

> **Every side-effecting tool accepts a caller-supplied idempotency key derived from `tool_use_id`.**

For non-idempotent downstreams, add a **reconciliation** step: on timeout, query for the operation by key before
retrying, and return the true state to the model.

---

## 12.4 Fallbacks

| Fallback | Trigger | Consideration |
|---|---|---|
| **Model tier** | Rate limit, outage, cost ceiling | Quality changes — evaluate the fallback path too |
| **Provider / region** | Provider incident | **Feature parity differs** (fast mode, MCP connector, batch availability, priority tier) — test both paths |
| **Cached response** | Any failure | Only for stable answers; mark it as cached |
| **Deterministic path** | Model unavailable | Keyword search instead of RAG; templated reply instead of generated |
| **Tool fallback** | Primary tool down | Secondary source, or degrade with an explicit statement |
| **Retrieval fallback** | Vector DB down | BM25/keyword index as a warm standby |
| **Human fallback** | Anything unrecoverable, or low confidence | The universal fallback — always have one |

**[Claude-specific] server-side refusal fallback** handles *policy refusals* only, in the same API call:

```python
client.beta.messages.create(
    model="claude-opus-5", betas=["server-side-fallback-2026-07-01"],
    fallbacks="default", ...)
```

It does **not** cover 429s or 5xx — you still own those. Not available on the Batches API, Bedrock, Vertex or
Foundry (use the SDKs' client-side refusal-fallback middleware there).

**The most common fallback mistake:** an untested fallback path. It is exercised only during an incident, which
is the worst time to discover it does not work. Exercise it deliberately — game days, or a small share of
traffic routed to the fallback continuously.

---

## 12.5 Guardrails

```
        ┌──────────────┐      ┌───────┐      ┌───────────────┐
input ─▶│ INPUT GUARD  │─────▶│ Model │─────▶│ OUTPUT GUARD  │─▶ user
        └──────────────┘      └───┬───┘      └───────────────┘
          PII redaction           │            schema validation
          injection detection     ▼            policy checks
          length/format limits ┌──────────┐    PII scan
          topic/abuse filter   │TOOL GUARD│    grounding check
          authz                └──────────┘    confidence gate
                                allowlist
                                arg validation
                                approval gate
                                rate limits
```

| Layer | Checks |
|---|---|
| **Input** | Authentication/authorisation, PII detection and redaction, injection heuristics, length caps, topic and abuse filters |
| **Tool** | Tool allowlist per route/user, argument validation and authorisation, destructive-action approval, per-session rate and value limits |
| **Output** | Schema validation, business-rule checks, policy checks (no advice outside scope, no competitor mentions), PII scan, grounding/citation verification, confidence gate |

**Guardrails must be deterministic code wherever possible.** A guardrail implemented as a prompt instruction is
influence; a guardrail implemented as a validator is enforcement. Where an LLM guardrail is unavoidable (nuanced
policy judgement), use a small fast model, constrain it with structured output, and **fail closed**.

**Fail-open vs fail-closed** is an explicit decision per guardrail:

| Guardrail | If it errors |
|---|---|
| PII redaction | **Fail closed** — do not send |
| Injection classifier | Fail closed for high-privilege routes; fail open for read-only chat |
| Output policy check | **Fail closed** — do not send |
| Grounding check | Fail closed, or degrade to "unverified" labelling |
| Latency-sensitive relevance check | Fail open, and log |

---

## 12.6 Human-in-the-loop, confidence and escalation **[explicitly named in D5]**

### 12.6.1 When a human must be in the loop

| Signal | Action |
|---|---|
| **Irreversibility** | Approval before execution |
| **Blast radius** | Approval above a threshold (amount, record count, environment) |
| **Low confidence** | Route to review |
| **Novelty** | Out-of-distribution input → review |
| **Policy/regulation** | Mandated human decision (credit, medical, employment) |
| **Repeated failure** | After N failed attempts, escalate rather than retry |
| **Explicit request** | The user asks for a human |

### 12.6.2 Approval patterns

| Pattern | Latency | Use |
|---|---|---|
| **Pre-approval (synchronous)** | Blocks | Irreversible, high-value actions |
| **Batch approval** | Delayed | Many low-risk actions reviewed together |
| **Post-hoc audit + undo** | None | Reversible actions where speed matters |
| **Tiered autonomy** | Mixed | Auto below a threshold, approve above it — **the practical default** |
| **Sampling review** | None | Statistical quality control on a share of outputs |

Design requirements that are routinely missed: approvals must **persist** across process restarts, must **time
out** with a defined outcome, must carry **enough context to decide in seconds**, and must record **who approved
what, when, and on what evidence**.

### 12.6.3 Confidence thresholds — do the work first

A threshold on an **uncalibrated** confidence score is arbitrary. Sequence:

1. Collect (confidence, correct?) pairs on a labelled sample.
2. Plot the reliability curve; compute calibration error (§11.3.3).
3. Choose the threshold from the **observed** curve, using the business cost of a false accept vs a false
   reject — not from the number's face value.
4. Monitor the accept/escalate ratio and the accuracy of accepted decisions; re-derive after every model or
   prompt change.

**Better confidence signals than asking the model:** self-consistency across N samples, retrieval score,
whether the answer carries valid citations, and whether a deterministic validator passed. Combine them.

### 12.6.4 Escalation design

An escalation is a **handoff to a human** and needs the same structure as an agent handoff (§8.6.2):

```json
{
  "reason": "low_confidence",
  "confidence": 0.42,
  "summary": "Customer asks for a refund on an order outside the 30-day window",
  "evidence": [{"tool": "get_order", "result_ref": "..."}],
  "proposed_action": {"tool": "issue_refund", "args": {...}},
  "policy_conflict": "Order is 45 days old; policy allows 30",
  "options": ["approve exception", "deny with template", "escalate to manager"],
  "sla_deadline": "2026-08-18T14:00:00Z"
}
```

A good escalation lets a human decide in **seconds**. A bad one dumps a transcript and makes them re-derive the
situation — which is how human review becomes the bottleneck that kills the product.

---

## 12.7 Observability

### 12.7.1 What to capture per request

| Field | Why |
|---|---|
| `trace_id`, `session_id`, `user_id`, `tenant_id` | Correlation and isolation |
| `model`, `prompt_version`, `schema_version`, `tool_versions` | **Reproducibility** — without these you cannot explain a behaviour change |
| `input_tokens`, `output_tokens`, `cache_read`, `cache_creation` | Cost attribution and cache health |
| `stop_reason`, `stop_details` | Truncation, refusal, pause detection |
| `latency_total`, `time_to_first_token` | Different SLOs |
| Tool calls: name, args (redacted), duration, `is_error` | Trajectory analysis |
| Retrieval: query, chunk IDs, scores | RAG debugging |
| Guardrail decisions | Why something was blocked |
| Confidence / escalation outcome | Calibration data |
| Cost in USD | Budgeting |

### 12.7.2 Tracing an agent

```
trace: session=abc123 task="fix failing test" total=42s cost=$0.31
├─ llm.call step=1     1.2s  in=3,201(cache_read=2,900) out=180  stop=tool_use
├─ tool.grep           0.1s  ok   results=12
├─ llm.call step=2     2.0s  in=3,900 out=240  stop=tool_use
├─ tool.read_file      0.05s ok   1,200 tokens
├─ tool.run_tests     18.0s  ERROR is_error=true "2 failed"
├─ llm.call step=3     3.1s  in=6,100 out=890  stop=tool_use
├─ tool.edit_file      0.2s  ok
├─ tool.run_tests     16.0s  ok
└─ llm.call step=4     1.4s  in=8,000 out=120  stop=end_turn   ✔ verified
```

**The span tree is the primary debugging artefact for agents.** Without it you are reading a transcript and
guessing. Include token counts and cache hits on every model span — that is where cost regressions appear first.

### 12.7.3 Alerts that are worth waking up for

| Alert | Threshold | Signals |
|---|---|---|
| Error rate | > baseline × 2 | Provider or config incident |
| p95 latency | > SLO | Degradation |
| Cost per task | > baseline × 1.5 | Cache invalidation, loops, model change |
| **Cache hit rate collapse** | < 50% of baseline | A prefix invalidator shipped |
| Schema violation rate | > baseline × 2 | Prompt/model regression |
| Refusal rate | sustained increase | Content or prompt change |
| Escalation rate | ± 50% | Quality change in either direction |
| Loop / step-limit rate | rising | Agent reliability regression |
| Guardrail block rate | spike | Attack, or a broken guardrail |

### 12.7.4 Privacy in telemetry

Prompts and responses contain user data. Redact PII before logging, restrict trace access, set retention
policies aligned to your privacy commitments, and be explicit about what leaves your boundary. In regulated
environments, log **references and hashes** rather than content, with a separately access-controlled store for
the content itself.

---

## 12.8 Debugging AI systems

### 12.8.1 The isolation procedure

```
Symptom: "the answer is wrong"

1. Is the OUTPUT malformed?        → check stop_reason first (max_tokens? refusal?)
2. Was the CONTEXT right?          → print exactly what was sent (system+messages+tools)
3. Was RETRIEVAL right?            → inspect chunks and scores; is the answer even in them?
4. Were TOOLS right?               → trajectory: right tool? right args? right result?
5. Was the PROMPT right?           → replay the exact context in isolation
6. Is it the MODEL?                → replay across versions/effort; is it reproducible?
7. Is it DRIFT?                    → compare input distribution to the eval set
```

**Always answer 1–4 before touching the prompt.** Most "prompt problems" are context problems.

### 12.8.2 Techniques

- **Replay** — store enough (prompt version, model, full request) to reproduce a request exactly. This is the
  single most valuable investment in debuggability.
- **Bisect the context** — remove components until the failure disappears.
- **Sample N times** — is it deterministic-wrong (systematic) or sometimes-wrong (sampling)? The fixes differ
  completely.
- **Compare against a known-good** — the previous prompt/model version on the same input.
- **Read failed trajectories by hand** — 50 of them. Nothing substitutes for this.
- **[Claude Code-specific]** use `/context` to see what actually loaded, and an `InstructionsLoaded` hook to log
  which instruction files were applied.

---

## Key takeaways

- The defining AI reliability risk is a **confidently wrong 200 response**. Detection is a design requirement.
- Define an explicit **degradation ladder**, and make every degradation visible to the user.
- 400s are never retryable; 429/5xx are, with backoff **and jitter**, honouring `retry-after`. Timeouts are
  retried, so budget `timeout × (retries+1)`.
- Idempotency keys derived from `tool_use_id` make side-effecting tools safe under retry.
- Guardrails at three layers (input, tool, output); prefer deterministic checks; decide fail-open vs fail-closed
  per guardrail.
- **Calibrate confidence before thresholding on it.** Escalations must be structured so a human decides in
  seconds.
- Log `prompt_version` + `model` + `schema_version` on every request — reproducibility is not optional.
- Cache-hit-rate collapse is an early warning for cost incidents; step-limit/loop rate for agent regressions.
- Untested fallback paths do not work. Exercise them deliberately.

## Things to memorise

- The retryable/non-retryable split.
- Full-jitter backoff, and why jitter matters in a fleet.
- The three guardrail layers and their checks.
- The escalation payload fields.
- The debugging isolation order (stop_reason → context → retrieval → tools → prompt → model → drift).

## Common mistakes

- Retrying 400s.
- Backoff without jitter.
- Guardrails written as prompt instructions.
- Thresholding on uncalibrated confidence.
- Escalating a raw transcript to a human.
- No `prompt_version` in traces, so a regression cannot be attributed.
- A fallback path nobody has ever exercised.

---

## Scenario questions

**Q1.** During a provider incident, an agent retries every failure 5 times with a 1s delay across 200 workers.
The incident lasts 20 minutes; the bill for that window is 6× normal and nothing succeeds. Redesign.

<details><summary>Answer</summary>

Failures compound: fixed-delay retries with no jitter synchronise into a thundering herd; 5 retries × 200
workers sustains load on a degraded provider and on your own budget; and retrying non-retryable errors adds
waste.

Redesign:
1. **Exponential backoff with full jitter**, honouring `retry-after`; cap total attempts (3) and total wall
   clock per request.
2. **Circuit breaker** per provider: after a failure-rate threshold, open the breaker and stop calling entirely
   for a cool-down. This is the control that would have capped the 6×.
3. **Classify errors** — do not retry 400/401/404.
4. **Fallback path** — a secondary model tier or region, exercised regularly so you know it works. Note feature
   parity differences.
5. **Degradation ladder** — when the breaker is open, serve cached/deterministic responses or queue for later;
   tell the user honestly rather than burning retries.
6. **Bounded queue with backpressure** — do not let 200 workers hold retry loops; shed or defer load.
7. **Cost alerting** on spend-rate, not just monthly total, so the 6× pages within minutes.
8. **Idempotency** so the retries that do land cannot double-execute side effects.
</details>

**Q2.** An insurance claims agent auto-approves claims under $500 and escalates above. Post-launch, fraud rises
in the $400–499 band. Diagnose and fix.

<details><summary>Answer</summary>

A **static threshold on a single dimension** is a published attack surface: it tells adversaries exactly how to
stay under the gate, and the threshold encodes only value, not risk.

Fix:
1. **Multi-signal risk scoring** rather than one amount: claimant history, claim frequency, time since policy
   inception, document anomaly signals, device/IP, and network features (same address across claims).
2. **Randomised audit sampling** — review a random share of *auto-approved* claims regardless of amount. This
   both detects the pattern and removes the guarantee that staying under $500 is safe.
3. **Velocity/aggregate limits**: N claims per claimant per period, cumulative value caps — the specific control
   for "many small claims".
4. **Do not publish or leak the threshold**; avoid behaviour that reveals it (identical instant-approval
   latency below the line).
5. **Anomaly detection on the distribution** — a pile-up just under a threshold is a classic, easily monitored
   signal that should have alerted.
6. **Post-hoc reversal path**: auto-approval must be revocable, with a clear recovery process.
7. **Feed confirmed fraud back** into the risk model and into the eval set.

The generalisable lesson: **thresholds become targets.** Prefer multi-factor risk scoring plus randomised
review over a single bright line, and always monitor the distribution around any threshold you do use.
</details>

**Q3.** A support assistant shows p50 latency 1.2s and p99 22s. Users complain about "random freezes". What is
happening and how do you fix it?

<details><summary>Answer</summary>

The long tail is driven by variable **output length** and variable **tool latency**, and possibly by retries.
Diagnose first, from traces: split total latency into time-to-first-token, generation time, tool time and retry
time, and check the correlation with output tokens and with `stop_reason`.

Fixes, in order:
1. **Stream.** Time-to-first-token is what users experience as responsiveness; streaming decouples it from total
   generation. Often resolves the perceived freeze entirely.
2. **Bound output.** Cap `max_tokens`, instruct brevity, and paginate long answers. Output tokens are the serial
   cost.
3. **Bound tools.** Per-tool timeouts, parallel execution of independent calls, and asynchronous handling
   (return a job handle) for anything over ~30s.
4. **Right-size `effort`** — `max` on an interactive path is usually wrong.
5. **Prompt caching** to cut time-to-first-token on a large stable prefix.
6. **Time-box the whole request** with a graceful partial response and an explicit "still working" state rather
   than an indefinite spinner.
7. **Route by complexity** so simple questions take the fast path.
8. **Alert on p99, not p50**, and track time-to-first-token as its own SLO.
</details>

**Q4.** A multi-agent research system produces a report with a confidently-stated conclusion. Investigation
shows one subagent's source returned an error, which the subagent silently omitted. Diagnose architecturally.

<details><summary>Answer</summary>

**Failed error propagation.** The subagent treated a failure as an absence, and absence was indistinguishable
from "nothing relevant found". The coordinator then aggregated a partial result set as if it were complete.

Fixes:
1. **Failures are first-class results.** The subagent's output schema must include `status`, `errors[]` and
   `sources_attempted` vs `sources_succeeded`. Omission is not an option the schema permits.
2. **Completeness is checked by the coordinator**, deterministically: if fewer than N sources succeeded, the
   report is marked provisional or the run is retried/escalated.
3. **Confidence must reflect coverage.** Define aggregation explicitly — for conjunctive conclusions, `min()`;
   and cap confidence when coverage is incomplete.
4. **Report-level provenance**: every claim cites the finding that supports it, and a validator rejects a report
   whose stated confidence exceeds the minimum of its sources.
5. **Surface gaps in the output**: "Note: 2 of 20 sources were unavailable; findings for vendors D and E are
   incomplete." Honest incompleteness beats confident completeness.
6. **Observability**: alert on subagent error rates; a source failing consistently is an infrastructure problem
   masquerading as a quality problem.

The principle to state: **an agent that hides errors is worse than one that fails**, because it converts a
detectable outage into an undetectable wrong answer.
</details>

**Q5.** Cost jumped 3× overnight with no deploy. Give the diagnostic sequence.

<details><summary>Answer</summary>

1. **Cache hit rate first.** If `cache_read_input_tokens` collapsed, a prefix invalidator appeared — a config
   change, a new tool added to the list, a per-user field entering the system prompt, a date rolling over in a
   template, or a model switch. This is by far the most common cause of an overnight step-change without a
   deploy.
2. **Tokens per request**, split input/output/thinking. Rising input ⇒ context growth or retrieval returning
   more; rising output ⇒ longer answers or higher `effort`.
3. **Requests per task.** Rising ⇒ retries, loops, or repair cycles. Check the termination-reason distribution
   and step-limit rate.
4. **Model mix.** Did a fallback path activate and silently route traffic to a more expensive tier? Did an
   `effort` default change?
5. **Traffic mix.** A new customer, a new integration, or a batch job sharing the interactive path.
6. **Upstream changes** you do not own: an MCP server now returning much larger results; a document source
   whose files got bigger; a retriever returning more chunks.
7. **Config drift** — environment variables, feature flags, a changed default.

Then remediate: restore the cacheable prefix, cap context and output, bound retries, segregate batch from
interactive traffic, and add a **spend-rate alert** so the next occurrence pages in minutes rather than
appearing on a monthly invoice.
</details>
