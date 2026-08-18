# 18 — Deployment and Operations

> **Domain mapping:** cross-cutting, with a direct link into Domain 3 (Claude Code in CI/CD). The deployment
> *topology* (containers vs serverless vs Kubernetes) is **[Engineering knowledge]** and unlikely to be tested
> directly; the **versioning, evaluation gates and rollback** material is squarely relevant.

---

## 18.1 Application deployment

An LLM application is mostly an ordinary stateless service with three unusual properties:

| Property | Consequence for deployment |
|---|---|
| Requests can take **minutes** | Serverless timeouts; load-balancer idle timeouts; keep-alive tuning |
| Responses **stream** | Buffering proxies break streaming — disable response buffering |
| State lives **outside the process** | Any replica must serve any turn (§2.4, Q2) |

| Topology | Fit | Watch |
|---|---|---|
| **Containers (ECS/Cloud Run/App Service)** | The default for a request/response service | Configure generous idle timeouts; disable proxy buffering for SSE |
| **Serverless functions** | Short, spiky, sync workloads | **Execution time limits** kill long agent runs; cold starts hurt TTFT; streaming support varies |
| **Kubernetes** | Complex systems with workers, queues and batch | Operational overhead; use it if you already have it |
| **Queue + workers** | Agents, batch, event-driven | The right shape for anything long-running |

**Rule of thumb:** user-facing sync path in containers with streaming; agents and batch behind a **queue with
durable workers**, never in a serverless function with a hard timeout.

---

## 18.2 Configuration

| Config | Where | Notes |
|---|---|---|
| **API credentials** | Secret manager; injected as env vars | Never in code, prompts, or committed config |
| **Model ID** | Config, per environment | **Pin it.** Never a floating alias in production |
| **`effort` / thinking** | Config, per route | Different routes deserve different settings |
| **Prompt version** | Config | Enables rollback without a deploy |
| **Feature flags** | Config service | Kill switches for agent autonomy, tools, and HITL thresholds |
| **Tool allowlists** | Config, per route/role | Security boundary |
| **Budgets and limits** | Config | Per tenant, per route |
| **MCP servers** | `.mcp.json` with `${VAR}` expansion | Config committed, secrets not |

**Design so that the following can be changed without a deploy:** prompt version, model ID, `effort`, HITL
thresholds, tool allowlists, and budgets. During an incident, a config flip is minutes; a deploy is an hour.

**[Claude-specific] credential note:** an unset `ANTHROPIC_API_KEY` does not mean there are no credentials — the
SDKs resolve `ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → an OAuth profile → Workload Identity Federation env
vars → the default profile. In cloud environments, **Workload Identity Federation** avoids long-lived keys
entirely; note that a set `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` (even empty) or `ANTHROPIC_PROFILE` will
outrank it.

---

## 18.3 CI/CD

### 18.3.1 The pipeline

```
PR ─▶ lint + unit ─▶ integration (replayed) ─▶ live smoke ─▶ SECURITY GATE (hard)
   ─▶ eval suite (threshold) ─▶ cost report ─▶ merge
   ─▶ deploy canary 5% ─▶ monitor 30-60 min ─▶ ramp 50% ─▶ 100%
   ─▶ rollback = config flag flip (not a redeploy)
```

### 18.3.2 What triggers the full evaluation

Any behaviour change: **prompt** edits, **model** version, `effort`/thinking settings, **tool** definitions and
descriptions, **retrieval** parameters (chunking, embeddings, k, reranker), **schemas**, **guardrail** rules.

Treat a model version bump exactly like a code release. It is the change most likely to be waved through as
"just config" and most likely to shift behaviour.

### 18.3.3 Gate design

| Gate | Type | Example |
|---|---|---|
| Unit / integration | Hard | Any failure blocks |
| **Security** | **Hard** | Injection, cross-tenant, PII redaction, persistence-path denial |
| Schema validity | Hard | 100% valid on the golden set |
| Quality | Threshold | Aggregate accuracy ≥ X; regression ≤ 2% |
| Cost | Report | Comment on the PR if cost/task rises >20% |
| Latency | Report/threshold | p95 within SLO |

### 18.3.4 **[Claude Code-specific]** Claude Code in the pipeline

```bash
claude -p "Review this diff against .claude/rules/security.md and report findings as JSON" \
  --output-format stream-json \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob,Bash(git diff *)"
```

Rules (from §7.8.5): never `bypassPermissions` with real credentials; `dontAsk` + explicit allows; scope tools
to the job; treat PR content as untrusted; ephemeral least-privilege tokens; bound turns and cost; the agent
commits to a branch and a **non-agentic** step opens the PR; control MCP loading with `disabledMcpjsonServers` /
`--setting-sources` because non-interactive sessions cannot prompt for project-scope approval; check
`mcp_server_errors` in the `system/init` event.

---

## 18.4 Production operations

### 18.4.1 The dashboard that matters

```
QUALITY            RELIABILITY          COST                 SAFETY
task success %     error rate           $/successful task    guardrail blocks
schema violations  p50/p95 latency      cache hit rate       refusal rate
escalation rate    TTFT                 tokens/request       injection detections
override rate      429 / retry rate     spend rate ($/hr)    approval queue age
                   termination reasons  budget utilisation   PII redaction hits
```

**Two panels earn their place above all others:** the **cache hit rate** (a collapse is the earliest signal of a
cost incident) and the **termination-reason distribution** (the earliest signal of an agent-quality regression).

### 18.4.2 Alerts

| Alert | Why |
|---|---|
| Error rate > 2× baseline | Provider or config incident |
| p95 latency > SLO | Degradation |
| **Spend rate** > 1.5× baseline | Cost incident — alert on rate, not on monthly total |
| Cache hit rate < 50% of baseline | A prefix invalidator shipped |
| Schema violation rate spike | Prompt or model regression |
| Refusal rate rise | Content or prompt change |
| Step-limit / loop rate rise | Agent reliability regression |
| Approval queue age > SLA | The human loop has stalled |
| Guardrail block spike | Attack, or a broken guardrail |

### 18.4.3 Incident response

An AI-specific runbook needs answers to:

1. **Is it quality or availability?** They have completely different playbooks.
2. **What changed?** Prompt version, model, tool, retrieval index, upstream data, a dependency's behaviour.
3. **Can we roll back by config?** Prompt version, model ID, feature flag — should be minutes.
4. **Can we degrade?** Disable agent autonomy, drop to read-only, route to humans.
5. **Can we reproduce?** Requires stored request context and versions (this is why §12.7 logging matters).
6. **What is the blast radius?** Which users, which actions, over what window — and can the actions be reversed?

**Kill switches to have ready before you need them:** disable agent autonomy (proposals only), disable write
tools, force human approval on everything, disable a specific tool or MCP server, freeze a tenant.

### 18.4.4 Cost management

- Attribute cost per **tenant, route and feature**; unattributed spend cannot be controlled.
- Enforce budgets **before** the call, not by reconciling the invoice.
- Alert on spend **rate**.
- Review the top cost drivers monthly; the usual answer is a cache invalidation or a step-count regression.

### 18.4.5 Managing model changes

```
1. Announcement / deprecation notice
2. Run the eval suite on the new model — expect deltas, especially in prompting
3. Re-tune: prompts written for the old model are often over-prescriptive; re-tune `effort`
4. Re-baseline token counts (tokenizers differ across generations) and cost
5. Check API-surface breakage (removed parameters, changed defaults)
6. Shadow on live traffic → compare → canary → ramp
7. Keep the old model pinned and available for rollback until confidence is established
```

**[Claude-specific] breaking-change classes to check on migration:** removed sampling parameters
(`temperature`/`top_p`/`top_k`), removed `budget_tokens`, removed assistant prefill, changed thinking defaults
(`display: "omitted"`, thinking on-by-default on Opus 5), new `stop_reason` values (`refusal`), and tokenizer
changes.

---

## 18.5 Versioning

Everything that affects behaviour is versioned, and every version appears in traces.

| Artefact | Versioning | Rollback |
|---|---|---|
| **Prompts** | Semver, in the repo, pinned in config | Config flip |
| **Models** | Pinned model ID per environment | Config flip |
| **Tool definitions** | Version the schema; additive changes only where possible | Deploy |
| **MCP servers** | **Pin the version** — never `@latest` in a committed config | Config |
| **Output schemas** | Semver; emit `schema_version` inside the payload | Consumer-side compatibility window |
| **Retrieval index** | Version the index; build the new one alongside, evaluate, cut over | Point back to the old index |
| **Eval sets** | Versioned so historical scores stay comparable | — |

**Compatibility rules for output schemas** (§4.2.4): adding an optional field is safe; adding a required field,
removing/renaming a field, or narrowing a type is breaking. Adding an enum value breaks exhaustive consumers.

**Index versioning deserves emphasis:** changing the embedding model requires re-embedding the whole corpus.
Build `index_v2` alongside `index_v1`, evaluate retrieval metrics on both, cut over by config, and keep v1
until confident. An in-place re-index is an outage.

---

## Key takeaways

- Long-running and streaming workloads dictate topology: containers with streaming for sync; **queue + durable
  workers** for agents and batch; beware serverless execution limits.
- **Pin model IDs.** Treat a model change as a release with an evaluation gate.
- Make prompt version, model, `effort`, thresholds, tool allowlists and budgets **config-changeable without a
  deploy** — rollback should be a flag flip.
- Security tests are hard gates; quality is a threshold gate; cost is a report.
- The two highest-value dashboards are cache hit rate and termination-reason distribution.
- Alert on **spend rate**, not on monthly totals.
- Version prompts, models, tools, MCP servers, schemas, indexes and eval sets — and put the versions in traces.
- Have kill switches built before the incident: autonomy off, writes off, force approval, disable a tool.

## Common mistakes

- A floating "latest" model alias in production.
- Rollback that requires a redeploy.
- Serverless functions for long agent runs.
- Buffering proxies silently breaking streaming.
- In-place re-index of a vector store.
- No cost attribution, so no cost control.
- `bypassPermissions` in CI with real credentials.

---

## Scenario questions

**Q1.** A model deprecation notice gives 90 days. Design the migration plan.

<details><summary>Answer</summary>

Treat it as a behaviour-change release, not a config edit.

**Weeks 1–2 — assess.** Inventory every place the model ID appears (services, batch jobs, evals, subagent
configs, Claude Code settings). Confirm the eval suite is representative; if it is thin, extend it now from
production traffic. Baseline current quality, latency, cost and token counts.

**Weeks 3–5 — compare.** Run the eval suite on the new model. Expect deltas. Check **API-surface breakage**
explicitly: removed sampling parameters, removed `budget_tokens`, removed prefill, changed thinking defaults,
new `stop_reason` values. **Re-baseline token counts** — tokenizers differ across generations, so context
budgets and cost models may shift even at identical pricing.

**Weeks 6–8 — re-tune.** Prompts written for the old model are frequently over-prescriptive and *reduce* quality
on newer ones; simplify and re-tune `effort` per route. Re-run structured-output and tool-schema tests. Slice
results by task type — you may find a routing answer rather than a wholesale switch.

**Weeks 9–11 — roll out.** Shadow on live traffic and compare; canary 5% with tight monitoring on quality,
escalation, override and cost; ramp to 50% then 100%. Keep the old model pinned and rollback as a config flip.

**Week 12 — close out.** Remove the old ID, update runbooks, and record what changed so the next migration is
cheaper.

Throughout: watch the human-override rate, which catches quality regressions that schema validity cannot see
(§4.5, Q6).
</details>

**Q2.** A prompt change causes a production incident at 2am. What must be in place for recovery in under 5
minutes?

<details><summary>Answer</summary>

1. **Prompt versions pinned in config**, so recovery is a flag flip rather than a build-and-deploy. This is the
   single most important item.
2. **`prompt_version` in every trace**, so the on-call can confirm which version is serving and correlate the
   incident window to the change.
3. **Alerts that fire on quality, not just errors** — schema violation rate, escalation rate, refusal rate,
   user-visible error rate — because a bad prompt usually returns HTTP 200.
4. **A runbook** naming the flag, the previous known-good version, and the verification step.
5. **Canary + auto-rollback**: the change should have been at 5% with automatic rollback on threshold breach,
   which would have limited blast radius to a twentieth of traffic.
6. **Kill switches**: force human approval, disable agent autonomy, drop to a deterministic fallback — so
   degradation is available even if rollback is not.
7. **A blast-radius query**: which requests, which users, which actions in the window, and can the actions be
   reversed?

Post-incident: the failing cases become permanent eval cases, and the gate that let it through gets tightened.
</details>

**Q3.** A team wants to change the embedding model to improve retrieval. Plan the rollout.

<details><summary>Answer</summary>

The constraint that shapes everything: **query and document embeddings must come from the same model**, so this
is a full corpus re-embedding, not a parameter change. An in-place re-index is an outage.

1. **Measure the baseline** — recall@k, MRR, nDCG on a labelled retrieval set, plus end-to-end answer accuracy
   and cost/latency.
2. **Build `index_v2` alongside `index_v1`.** Re-embed the whole corpus; estimate cost and duration up front
   (this is often the largest single embedding bill you will pay).
3. **Evaluate v2 offline** on the same labelled set. Compare retrieval metrics *and* end-to-end accuracy —
   better retrieval metrics do not automatically mean better answers, because chunk sizes and score
   distributions shift (so re-tune the similarity threshold and k).
4. **Shadow**: run live queries against both indexes, serve v1, log both result sets, and compare on real
   traffic. This catches distribution issues your labelled set does not contain.
5. **Canary by config** — an index-version flag, 5% → 50% → 100%, with rollback as a flag flip.
6. **Keep v1** until confidence is established, and keep the ingestion pipeline dual-writing so both stay
   current during the transition.
7. **Operational details**: re-tune thresholds and k; verify ACL metadata carried over intact (test cross-tenant
   isolation on v2 explicitly); confirm deletion propagation works on the new index.
8. **Decommission v1** and remove dual-writes only after a defined soak period.
</details>
