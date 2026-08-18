# 23 — Final Decision Trees

> Fifteen compact trees for the 2-minutes-per-question reality. Each ends in an action, not a discussion.
> Print this section.

---

## 23.1 Should I use an LLM?

```
Is the input unstructured natural language, images, or documents?
├─ NO ──▶ Is the rule expressible and stable?
│          ├─ YES ──▶ ❌ Use code
│          └─ NO  ──▶ Is there a mature deterministic tool? (scanner, parser, solver)
│                     ├─ YES ──▶ ❌ Use the tool
│                     └─ NO  ──▶ ✅ Consider an LLM
└─ YES ─▶ Must the output be provably correct? (accounting, authz, crypto)
           ├─ YES ──▶ ❌ Code decides; LLM may assist/extract only
           └─ NO  ──▶ Latency budget < ~100ms?
                      ├─ YES ──▶ ❌ Precompute or use code
                      └─ NO  ──▶ Value per call > cost per call?
                                 ├─ NO  ──▶ ❌ Not viable
                                 └─ YES ──▶ ✅ LLM + validation
```

---

## 23.2 Should I use an agent?

```
Can you draw the flowchart of steps in advance?
├─ YES ──▶ ❌ Build the workflow (LLM steps inside it)
└─ NO  ──▶ Does the number/order of steps genuinely vary per input?
            ├─ NO  ──▶ ❌ Workflow
            └─ YES ─▶ Can you verify the result? (tests, checks, human)
                       ├─ NO  ──▶ ❌ Do not automate — assist a human instead
                       └─ YES ─▶ Is the cost of an error recoverable?
                                  ├─ NO  ──▶ ⚠️  Agent + mandatory approval gate
                                  └─ YES ─▶ ✅ Bounded agent
                                            (steps, budget, verified completion,
                                             externalised state)
```

---

## 23.3 Should I use multiple agents?

```
Name the limitation of a single agent that the extra agent removes.
├─ Cannot name one ─────────────▶ ❌ Single agent
├─ "Intermediate data won't fit one context"   ──▶ ✅ Subagents (context isolation)
├─ "Independent subtasks + wall-clock matters" ──▶ ✅ Parallel spokes
├─ "Roles need different tools/permissions/models" ──▶ ✅ Specialised agents
├─ "The untrusted-content reader must not hold write creds" ──▶ ✅ Capability separation
└─ "It feels more sophisticated" ──▶ ❌ Single agent

If YES:  topology = HUB-AND-SPOKE (spokes never talk to each other)
         coordinator = expensive model; spokes = cheap models
         handoffs = structured packages; results = uniform schema
         budget/termination = enforced at the hub
```

---

## 23.4 Should I use RAG?

```
Does the answer require information the model does not have?
├─ NO ──▶ ❌ No retrieval needed
└─ YES ▶ Is it structured data with an exact answer? (revenue, price, status)
          ├─ YES ──▶ ❌ Use SQL / a tool, not RAG
          └─ NO  ─▶ Corpus size?
                     ├─ < ~50K tokens, stable ──▶ Do different users see different parts?
                     │                             ├─ YES ──▶ ✅ RAG (ACL-filtered)
                     │                             └─ NO  ──▶ ❌ Long context + prompt caching
                     └─ Larger, or changing ────▶ ✅ RAG
                                                   (hybrid retrieval + reranker +
                                                    similarity threshold + citations)
```

---

## 23.5 Should I use long context?

```
Is the whole input genuinely relevant to the question?
├─ NO ──▶ ❌ Retrieve instead (dilution + cost + latency)
└─ YES ▶ Does it fit with room for the answer?
          ├─ NO  ──▶ ❌ Chunk + map-reduce
          └─ YES ─▶ Is the content stable enough to cache?
                     ├─ NO  ──▶ ⚠️  Expensive — reconsider retrieval
                     └─ YES ─▶ Do all users see the same content?
                                ├─ NO  ──▶ ❌ RAG (you cannot ACL a shared cached prefix)
                                └─ YES ─▶ ✅ Long context + caching
```

---

## 23.6 Should I use MCP?

```
How many applications will consume this capability?
├─ One ──▶ Is a second consumer imminent and real?
│           ├─ NO  ──▶ ❌ Direct tool definitions
│           └─ YES ──▶ continue
└─ Two or more ──▶ Is the path latency-critical?
                    ├─ YES ──▶ ⚠️  Direct tools on the hot path; MCP elsewhere
                    └─ NO  ─▶ Is the service reachable from the client's network?
                               ├─ NO  ──▶ Self-hosted MCP client, or direct tools
                               │          (the API MCP connector runs from Anthropic's infra)
                               └─ YES ─▶ ✅ MCP
                                         (pin versions, scope credentials, gate side effects)
```

---

## 23.7 Should I expose this as a tool?

```
Does the model need to DECIDE when to invoke it?
├─ NO ──▶ ❌ Call it in your code (deterministic step)
└─ YES ▶ Does it map to a user-visible intent?
          ├─ NO  ──▶ ⚠️  Reshape it — do not wrap an internal endpoint
          └─ YES ─▶ Does authorisation differ per operation?
                     ├─ YES ──▶ ✅ Separate tools (boundary = permission boundary)
                     └─ NO  ─▶ Is the composition fixed and latency-sensitive?
                                ├─ YES ──▶ ✅ One composite tool
                                └─ NO  ──▶ ✅ One tool per intent
```

---

## 23.8 Should the agent have write access?

```
Is the action reversible?
├─ NO ──▶ Is it high value / high blast radius?
│          ├─ YES ──▶ ❌ Human executes; agent proposes only
│          └─ NO  ──▶ ⚠️  Agent proposes + human approves each time
└─ YES ▶ Can you bound the blast radius? (value caps, row caps, rate limits)
          ├─ NO  ──▶ ❌ Read-only
          └─ YES ─▶ Is every write idempotent and audited?
                     ├─ NO  ──▶ ❌ Fix that first
                     └─ YES ─▶ ✅ Tiered autonomy
                               (auto below thresholds, approve above,
                                plan-then-execute, deterministic gate,
                                capability separation from untrusted content)
```

---

## 23.9 Should a human approve?

```
Irreversible?                    ──▶ ✅ YES, always
Regulated decision?              ──▶ ✅ YES (often mandatory)
High blast radius?               ──▶ ✅ YES above a threshold
Confidence below the calibrated floor? ──▶ ✅ YES
Novel / out-of-distribution?     ──▶ ✅ YES
Repeated failure (N attempts)?   ──▶ ✅ Escalate
Reversible + low value + high volume? ──▶ ❌ Post-hoc audit + sampling review

⚠️  If approval volume would cause rubber-stamping,
    you have chosen the wrong gate: segment by risk instead.
```

---

## 23.10 Should I use a larger model?

```
Have you enabled prompt caching?          ──▶ NO: do that first (free)
Have you bounded tool output and context? ──▶ NO: do that first (free)
Have you right-sized `effort` per route?  ──▶ NO: do that first
Have you measured on an eval set?         ──▶ NO: measure first

Then:
Is this the PLANNING/coordination role?   ──▶ ✅ Larger
Long tool chains or complex reasoning?    ──▶ ✅ Larger
Fixed label set / clear criteria?         ──▶ ❌ Smaller + structured output
High volume, latency-sensitive?           ──▶ ❌ Smaller + route the hard tail up
Eval shows a gap that matters?            ──▶ ✅ Larger, for the routed subset only
```

---

## 23.11 Should I retry?

```
What is the error?
├─ 400 / 401 / 403 / 404 / 413 ──▶ ❌ NEVER retry — fix the request
├─ refusal (stop_reason)       ──▶ ❌ Same request refuses again; handle or fall back
├─ max_tokens                  ──▶ ⚠️  Not a retry — raise max_tokens / stream / split
├─ 429                         ──▶ ✅ Backoff + jitter, honour retry-after
├─ 5xx / 529 / timeout / conn  ──▶ ✅ Backoff + jitter, bounded attempts
└─ validation failure          ──▶ ✅ ONE repair with the specific error, then escalate

Before any retry of a side-effecting tool: is it idempotent?
├─ NO  ──▶ ❌ Reconcile actual state first
└─ YES ──▶ ✅ Retry with the same idempotency key
```

---

## 23.12 Should I fall back?

```
Is the primary permanently unavailable for this request?
├─ NO  ──▶ Retry with backoff first
└─ YES ▶ Is a quality-equivalent alternative available?
          ├─ YES ──▶ ✅ Fall back (and evaluate the fallback path too)
          └─ NO  ─▶ Can you degrade meaningfully?
                     ├─ YES ──▶ ✅ Degrade + TELL THE USER what is unavailable
                     └─ NO  ──▶ ✅ Fail honestly (better than a wrong answer)

Have you exercised the fallback path in the last 90 days?
└─ NO ──▶ ⚠️  Assume it does not work. Game-day it.
```

---

## 23.13 Synchronous or asynchronous?

```
Is a human waiting on the response?
├─ YES ─▶ Expected duration?
│          ├─ < 30s ──▶ ✅ Sync + STREAMING
│          └─ > 30s ──▶ ✅ Sync ack + async job + progress + notification
└─ NO  ─▶ Latency-tolerant and high volume?
           ├─ YES ──▶ ✅ Batch API (~50% cost; key results by custom_id)
           └─ NO  ──▶ ✅ Queue + durable workers
                       (never a serverless function with a hard timeout)
```

---

## 23.14 Should I cache?

```
Prompt caching: is any prefix (tools + system) stable and ≥ ~1024 tokens?
└─ YES ──▶ ✅ Always. Verify cache_read_input_tokens > 0.
           Keep volatile content AFTER the breakpoint.

Retrieval cache (query → chunk IDs): ✅ Yes, invalidate on re-index.
Tool result cache (deterministic tools): ✅ Yes, with a TTL.
Exact-match response cache: ✅ Yes for genuinely repeated questions.

Semantic cache (similar question → cached answer):
├─ Personalised / account-specific / time-sensitive? ──▶ ❌ NO
├─ Cannot scope the key by tenant + locale + entitlements? ──▶ ❌ NO
└─ Otherwise ──▶ ⚠️  High threshold, measure the wrong-hit rate, be ready to disable
```

---

## 23.15 Should I use deterministic code instead?

```
For EACH step of the workflow:

Is the input structured?           ──▶ likely CODE
Is the rule expressible?           ──▶ CODE
Must it be exactly correct?        ──▶ CODE
Must it be reproducible/auditable? ──▶ CODE
Is it a calculation or a lookup?   ──▶ CODE
Is it unstructured language?       ──▶ LLM
Is it judgement under ambiguity?   ──▶ LLM
Is it irreversible + high stakes?  ──▶ HUMAN

Expected distribution in a healthy design:
  ~70% code   ~25% single LLM calls   ~5% agentic   humans at irreversible boundaries

If your design is 90% agent, you have mis-decomposed the problem.
```

---

## The master tree (use this when nothing else fits)

```
1. What is the binding CONSTRAINT?
   latency │ cost │ compliance │ blast radius │ determinism │ scale

2. What is the SIMPLEST tier that meets it?
   single call → RAG → tools → single agent → multi-agent
   (step up only when the current tier PROVABLY fails)

3. What is the BLAST RADIUS of a wrong answer?
   → drives write access, human approval, sandboxing, capability separation

4. How would I KNOW it broke?
   → drives evaluation, verification, observability
   → often the tiebreaker between two otherwise-equal options

5. What is each option's FAILURE MODE, and is it DETECTABLE?
   → an undetectable failure mode disqualifies the option
```
