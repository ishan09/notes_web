# 14 — Performance and Cost

> **Domain mapping:** cross-cutting; heavily present in Domain 5 (context management) and Domain 1 (agent cost).
> Cost and latency are the constraints most scenario stems name explicitly, so being fluent here converts
> directly into marks.

---

## 14.1 Token economics

### 14.1.1 The cost equation

```
cost = (uncached_input × in_rate)
     + (cache_read     × in_rate × 0.10)
     + (cache_write    × in_rate × 1.25)
     + (output         × out_rate)          ← output includes THINKING tokens
```

**Prices (Claude API first-party, per 1M tokens, August 2026 — verify):**

| Model | Input | Output | Ratio to Haiku (input) |
|---|---|---|---|
| `claude-fable-5` | $10.00 | $50.00 | 10× |
| `claude-opus-5` | $5.00 | $25.00 | 5× |
| `claude-sonnet-5` | $3.00 | $15.00 | 3× |
| `claude-haiku-4-5` | $1.00 | $5.00 | 1× |

Three structural facts:

1. **Output costs 5× input** on every tier. Output length is the most expensive dimension.
2. **Cache reads cost ~10% of input.** A stable prefix is nearly free after the first request.
3. **Cache writes cost ~125%.** Caching a prefix used once is a *loss*; it pays from the second use.

### 14.1.2 Where the money actually goes

| Driver | Typical share | First lever |
|---|---|---|
| Repeated system prompt / tools / examples | Often the largest | **Prompt caching** |
| Conversation history resent every turn | Large in chat and agents | Compaction, context editing |
| Retrieved context | Moderate | Rerank; return fewer, better chunks |
| Tool results accumulating | Large in agents | Bounded output, PTC, subagents |
| Output length | Moderate–large | Brevity instructions, `max_tokens`, lower `effort` |
| Thinking tokens | Hidden but real | Right-size `effort` per route |
| Retries and repair loops | Spiky | Bound attempts; fix root causes |

### 14.1.3 The unit that matters

Track **cost per successful task**, not cost per API call. A cheaper model that needs 1.6× the retries is not
cheaper. Report the distribution (p50/p95/p99), because the p99 is what produces the surprise invoice.

---

## 14.2 Latency

### 14.2.1 The budget

```
total = network + queue + input processing + time-to-first-token
      + (output tokens × per-token time)
      + Σ(tool latency, serialised portions)
      + retries
```

Two independent SLOs:

- **Time-to-first-token (TTFT)** — what a user perceives as responsiveness. Driven by input size, cache hits,
  thinking, and queueing.
- **Total completion time** — driven by output length and tool latency.

**Output tokens are generated serially**, so output length is the dominant term in total time. Input is
processed in parallel, so a large *cached* prompt costs surprisingly little TTFT.

### 14.2.2 Levers, ranked

| Lever | Effect | Cost |
|---|---|---|
| **Stream** | Transforms perceived latency | None — do this first |
| **Prompt caching** | Cuts TTFT and cost together | None after setup |
| **Shorter output** | Directly cuts the serial term | Possible quality/completeness trade |
| **Lower `effort`** | Fewer thinking tokens | Quality trade — evaluate |
| **Smaller model** | Faster per token | Quality trade — evaluate |
| **Parallel tool execution** | Removes serialised tool time | Only for independent tools |
| **Parallel agents** | Wall-clock win on independent subtasks | Cost multiplier |
| **Precompute / cache answers** | Removes the call entirely | Staleness |
| **Async** | Removes latency from the user's path | Product change |

### 14.2.3 Sequential vs parallel

```
Sequential:  ──tool A(2s)──▶──tool B(3s)──▶──tool C(1s)──▶   = 6s
Parallel:    ──tool A(2s)──┐
             ──tool B(3s)──┼──▶ merge                        = 3s
             ──tool C(1s)──┘
```

Claude emits multiple `tool_use` blocks in one turn when the calls are independent. **Execute them concurrently
and return all results in one user message** — this is often the single largest latency win available in an
agent, and returning them separately silently suppresses future parallelism.

Multi-step chains are worse than they look: each step is a full model round trip. Four sequential tool calls
means four model calls plus four tool calls. Prefer composite tools, or **[Claude-specific] programmatic tool
calling**, where Claude writes a script that invokes tools as functions inside the code-execution container so
intermediate results never round-trip through the model.

---

## 14.3 Cost optimisation playbook

Apply in order — the early items are free, the later ones trade quality.

1. **Prompt caching.** Verify with `cache_read_input_tokens`. Usually the largest single win.
2. **Bound tool output.** Project fields; paginate; signal truncation. Verbose tool results are the quiet killer
   in agents.
3. **Reduce context.** Rerank and return 3–8 chunks, not 20. Compaction and context editing for long sessions.
4. **Bound output.** Brevity instructions, realistic `max_tokens`, structured output instead of prose.
5. **Right-size `effort` per route.** `medium` for interactive, `xhigh` for agentic coding, `max` only where
   correctness dominates.
6. **Route by complexity.** A cheap classifier sends most traffic to a cheaper path. Usually recovers most of
   the theoretical saving of a model downgrade without the quality loss.
7. **Batch the non-interactive.** **[Claude-specific]** the Batch API is ~**50% cost**; results return in **any
   order** — key by `custom_id`.
8. **Bound agent loops.** Max steps, budgets, repeat detection. This is what removes the expensive tail.
9. **Then** consider a smaller model — with an evaluation.

### 14.3.1 A worked example

A support assistant: 500K requests/month, 12K-token system prompt, ~1.5K retrieved tokens, ~400-token answers,
Opus 5.

| Stage | Input/req | Output/req | Monthly cost |
|---|---|---|---|
| Naive | 13,500 | 400 | 500K × (13.5K×$5 + 0.4K×$25)/1M ≈ **$38,750** |
| + caching (12K cached) | 1,500 + 12,000 cached | 400 | ≈ 500K × (1.5K×$5 + 12K×$0.5 + 0.4K×$25)/1M ≈ **$13,750** |
| + rerank to 800 retrieved tokens | 800 + 12,000 cached | 400 | ≈ **$12,000** |
| + Sonnet 5 for 80% of traffic (routed) | — | — | ≈ **$6,000** |

Caching alone removes ~64%. Note the ordering: the free changes are made first, and the model downgrade — the
only one that trades quality — is last and applies to a routed subset.

---

## 14.4 Agent cost

Agent cost is **superlinear in steps**, because history is resent every step:

```
step 1: 3K input
step 2: 3K + 0.2K assistant + 2K tool result       = 5.2K
step 3: 5.2K + 0.2K + 2K                           = 7.4K
...
step 10:                                           ≈ 21K
                          cumulative ≈ 120K input tokens for a 10-step task
```

Controls:

| Control | Effect |
|---|---|
| Cache the stable prefix | The fixed component costs ~10% |
| Bound tool output | Attacks the growth term directly |
| Context editing / compaction | Caps growth |
| **[Claude-specific] Programmatic tool calling** | Intermediate results never enter context — the purpose-built fix |
| Subagents | Verbose work in a separate context; only summaries return |
| Fewer, richer tools | Fewer steps |
| Cheap models for spokes | Coordinator expensive, workers cheap |
| Hard step and budget caps | Removes the tail |

**Multi-agent cost model:** each subagent pays for its own system prompt and cannot share the parent's cache (a
**fork** can — that is its main advantage). Handoffs and aggregation are pure overhead. Budget **2–10× a single
agent** and verify against a measured baseline.

**[Claude-specific] task budgets** give the model a token ceiling for an agentic loop so it paces itself and
finishes gracefully instead of being cut off — distinct from `max_tokens`, which is an enforced per-response
ceiling the model is unaware of:

```python
with client.beta.messages.stream(
    model="claude-opus-5", max_tokens=128000,
    output_config={"effort": "high",
                   "task_budget": {"type": "tokens", "total": 64000}},
    betas=["task-budgets-2026-03-13"],
    messages=messages, tools=tools,
) as stream:
    response = stream.get_final_message()
```

Minimum `total` is 20,000. It is **advisory** (the model sees a countdown and paces itself); it is not a hard
platform cap. Do not confuse it with Managed Agents **session budgets**, which are hard, dollar-denominated and
platform-enforced.

---

## 14.5 Scalability

### 14.5.1 The shape

```
clients ─▶ [ API gateway: authn, per-tenant rate limit ]
              │
              ├─▶ [ sync path ]  ─▶ worker pool ─▶ client-side limiter ─▶ Claude API
              │                                        (token bucket, below quota)
              └─▶ [ async path ] ─▶ queue ─▶ batch workers ─▶ Batch API (50% cost)
```

| Concern | Mechanism |
|---|---|
| **Rate limits** | Client-side token bucket **below** your quota, tracking requests/min *and* tokens/min |
| **Bursts** | Queue with backpressure; shed or defer rather than 429-storming |
| **Tier segregation** | Interactive and batch traffic must not share a bucket, or a backfill starves users |
| **Fairness** | Per-tenant quotas so one tenant cannot consume the pool |
| **Long work** | Async with a job handle; webhooks or polling; never hold an HTTP request for minutes |
| **Statelessness** | Session state in shared storage, not process memory (§2.4, Q2) |
| **Cost control at scale** | Per-tenant budgets and alerts, enforced before the call |

**[Claude-specific] throughput notes:** Priority Tier provides guaranteed throughput but **does not cover Opus 5,
Sonnet 5 or Mythos 5**. Fast mode (Opus 5 / Opus 4.8, research preview) trades premium pricing for up to ~2.5×
output tokens per second and has its **own separate rate limit** — on a 429 you can either wait for
`retry-after` or drop `speed` and fall back to standard, noting that **switching speed invalidates the prompt
cache**.

### 14.5.2 Caching beyond prompt caching

| Layer | Caches | Hit rate | Risk |
|---|---|---|---|
| **Prompt cache** | The prefix's KV state | High if the prefix is stable | None |
| **Exact-match response cache** | Identical request → identical answer | Low for free text | Staleness |
| **Semantic cache** | Similar question → previous answer | Medium | **Wrong answer for a similar-but-different question** |
| **Retrieval cache** | Query → chunk IDs | High | Staleness after re-index |
| **Tool result cache** | Deterministic tool calls | High | Staleness |

**Semantic caching deserves a warning.** "What is the refund policy for EU customers?" and "…for US customers?"
are semantically close and have different answers. If you use it, set a high similarity threshold, scope the key
by user/tenant/locale, and exclude anything personalised or time-sensitive. For most systems, prompt caching
plus a retrieval cache captures the benefit without the correctness risk.

---

## Key takeaways

- Output tokens cost 5× input and dominate latency; thinking tokens are billed as output.
- Cache reads ~10%, cache writes ~125% — caching pays from the second use.
- Optimise in order: caching → bound tool output → reduce context → bound output → right-size `effort` →
  route → batch → bound loops → *then* consider a smaller model.
- Stream first: it is free and it fixes perceived latency.
- Agent cost is superlinear in steps. Attack the growth term (tool output, context) before the model tier.
- Track **cost per successful task** with p50/p95/p99, not the mean per call.
- Batch API ≈ 50% cost, results in any order — key by `custom_id`.
- Segregate interactive and batch traffic; rate-limit client-side below your quota; queue with backpressure.

## Things to memorise

- The cost equation and the four cache-related multipliers.
- The latency lever ranking (stream → cache → shorter output → effort → model).
- Parallel tool execution + single tool-result message.
- Task budgets are advisory and token-denominated; Managed Agents session budgets are hard and dollar-denominated.
- Priority Tier excludes Opus 5 / Sonnet 5; fast mode has its own rate limit and invalidates the cache on switch.

## Common mistakes

- Downgrading the model before enabling caching.
- Measuring cost per call instead of per successful task.
- Sharing a rate-limit bucket between batch and interactive traffic.
- Semantic caching without tenant/locale scoping.
- Ignoring thinking tokens in the cost model.
- Backoff without jitter under 429 pressure.

---

## Scenario questions

**Q1.** An agentic coding product costs $4.20 per task against a $0.50 target. Where do you look, in order?

<details><summary>Answer</summary>

1. **Cache hit rate.** If `cache_read_input_tokens` is low, the system prompt and tool definitions are being
   re-billed at full price on every one of the (many) steps in a task. Stabilise the prefix and add a
   breakpoint. Largest expected win.
2. **Steps per task** (median and p95). A long tail means loops or missing exits — add repeat detection,
   no-progress detection and a step cap. Removing the tail often halves the mean.
3. **Tool output size.** Verbose results are resent on every subsequent step, so they cost O(steps). Project
   fields, paginate, truncate with an explicit signal.
4. **Context growth.** Enable context editing (`clear_tool_uses_20250919`) and compaction; delegate verbose
   exploration to subagents so raw output never enters the main context.
5. **Programmatic tool calling** if the workload has long chains with large intermediate data.
6. **`effort` per route.** `max` everywhere is a common and expensive default.
7. **Model tiering** — cheap workers, expensive coordinator; evaluate before downgrading the main loop.
8. **Task budgets** so the model paces itself, plus hard caps that terminate with a structured incomplete
   status.

Then instrument: cost per successful task at p50/p95/p99, and a spend-rate alert. Also sanity-check the target:
if a task genuinely requires 30 tool calls over a large repo, $0.50 may be infeasible and the honest answer is
to change the scope or the pricing, not to degrade quality silently.
</details>

**Q2.** A chat product needs p95 TTFT under 1s. Current p95 is 4.5s with a 30K-token system prompt (product
docs) and Opus 5 at `effort: "max"`, non-streaming. What do you change?

<details><summary>Answer</summary>

1. **Stream.** Without streaming, TTFT and total time are the same number, so the SLO is unmeetable by
   construction. This is the prerequisite.
2. **Prompt caching** on the 30K prefix. A cached prefix skips re-processing, which is the dominant TTFT term
   here. Place a breakpoint after the docs; keep anything volatile after it.
3. **Lower `effort`** from `max` to `medium`. Thinking happens *before* the first visible token, so high effort
   directly inflates TTFT. `max` is for correctness-dominant batch work, not interactive chat.
4. **Consider Sonnet 5** for the interactive path — faster per token, with an eval to confirm the quality delta
   is acceptable.
5. **Reconsider the 30K docs.** If only a fraction is relevant per question, retrieval (~2K tokens) plus caching
   of a smaller stable prefix beats a 30K prefix on both TTFT and cost.
6. **Queueing.** Check whether client-side rate limiting or a saturated worker pool contributes to p95 —
   fix that before blaming the model.
7. Measure TTFT as a distinct metric with its own alert, and validate the change on the eval set so the
   `effort`/model reductions are evidence-based.
</details>

**Q3.** A nightly job classifies 2M documents. It runs 400 concurrent synchronous requests and is constantly
rate-limited; it also starves the interactive product during the overlap window. Redesign.

<details><summary>Answer</summary>

Two distinct problems: the wrong API surface, and no tier segregation.

1. **Use the Batch API.** Non-interactive, latency-tolerant work at 2M scale is exactly its purpose: ~**50%
   cost**, no rate-limit fight. Submit with `custom_id` per document, poll `processing_status`, stream results —
   and key results by `custom_id`, since they return in **arbitrary order**.
2. **Segregate the tiers.** Batch and interactive must not share a rate-limit budget or a worker pool. If any
   part must remain synchronous, give it a separate client-side token bucket sized to a reserved slice of quota,
   and shape it so it cannot consume the interactive headroom.
3. **Client-side rate limiting** below quota, tracking requests/min and tokens/min, with exponential backoff and
   full jitter for the residue.
4. **Prompt caching** on the classification prompt and label definitions — identical across all 2M calls, so
   this is a very large win.
5. **Model tier.** Classification into a fixed label set is a Haiku-class task; validate on an eval set. Combine
   with structured output (`enum`) to eliminate parse failures.
6. **Idempotency and checkpointing** so a partial run resumes rather than restarts.
7. **Budget and alerting** on the job's spend rate, and a dead letter queue for failures.
</details>

**Q4.** An architect proposes a semantic cache to cut costs on a support assistant. Evaluate.

<details><summary>Answer</summary>

Cautiously. Semantic caching returns a previous answer when a new question is *similar*, and similarity is not
equivalence — the classic failure is "refund policy for EU customers" served from the cached US answer. In
support, that is a wrong-answer incident, not a cost saving.

If you do it:
- **High similarity threshold**, tuned against a labelled set of near-miss pairs.
- **Scope the cache key** by tenant, user entitlements, locale, product version and language — anything that
  changes the correct answer must be in the key.
- **Exclude** personalised, account-specific and time-sensitive questions entirely.
- **TTL and explicit invalidation** on knowledge-base updates.
- **Measure the harm**: sample cache hits and evaluate correctness against a fresh generation. If the wrong-hit
  rate is non-trivial, turn it off.

Better first: **prompt caching** (no correctness risk, typically a larger saving), **retrieval caching** (query
→ chunk IDs, invalidated on re-index), tool-result caching for deterministic tools, and an **exact-match** cache
for genuinely repeated questions. These capture most of the benefit with none of the risk. Reach for semantic
caching only after those, and only with the guards above.
</details>
