# 00 — Exam Blueprint, Provenance, and How to Use This Guide

## 0.1 What CCA-F actually is

**Claude Certified Architect – Foundations (CCA-F**, also written **CCAR-F)** is Anthropic's first official
technical certification. It validates that you can *design, deploy and operate production-grade applications
across the Claude ecosystem* — the Claude API, the Claude Agent SDK, Claude Code, and the Model Context
Protocol (MCP).

It is deliberately **not** a "can you write a prompt" exam. Nearly every question is a short scenario with a
constraint (latency, budget, compliance, blast radius) and several plausible architectures. Your job is to pick
the one a competent production architect would pick, and — implicitly — to recognise why the others fail.

---

## 0.2 Format (verify against the official exam guide before booking)

| Property | Value |
|---|---|
| Questions | 60 multiple-choice |
| Time | 120 minutes (≈2 min/question) |
| Delivery | Proctored; no AI assistance permitted |
| Scoring | Scaled score, 100–1000 range |
| Passing score | 720 |
| Launched | 12 March 2026 |
| Scope | Claude API, Claude Agent SDK, Claude Code, MCP |

At ~2 minutes per question with scenario stems, **reading speed and pattern recognition matter**. You will not
have time to derive an answer from first principles for all 60. That is exactly why this guide front-loads
*heuristics* (§22) and *decision trees* (§23) — they compress first-principles reasoning into fast recall.

---

## 0.3 The five domains and their weights

| # | Domain | Weight | What it really tests |
|---|---|---|---|
| 1 | **Agentic Architecture & Orchestration** | **27%** | Agent loop and `stop_reason` handling, coordinator/subagent (hub-and-spoke) patterns, task decomposition, session state, handoffs, orchestration-layer safeguards |
| 2 | **Tool Design & MCP Integration** | **18%** | Tool schemas and descriptions, `is_error` semantics, MCP server configuration, transports, env-var mapping, permissions |
| 3 | **Claude Code Configuration & Workflows** | **20%** | CLAUDE.md hierarchy, `.claude/rules/`, skills, hooks, permissions, slash commands, plan mode, CI/CD and headless integration |
| 4 | **Prompt Engineering & Structured Output** | **20%** | Explicit criteria, few-shot, JSON Schema enforcement, validation and retry loops, extraction patterns |
| 5 | **Context Management & Reliability** | **15%** | Long-context preservation, caching, compaction, agent handoff packages, confidence calibration, escalation, error propagation |

The blueprint is reported as spanning **five domains across ~29 task objectives**.

```
Domain weight, visually:

D1 Agentic Architecture & Orchestration   ███████████████████████████  27%
D3 Claude Code Config & Workflows         ████████████████████         20%
D4 Prompt Engineering & Structured Output ████████████████████         20%
D2 Tool Design & MCP Integration          ██████████████████           18%
D5 Context Management & Reliability       ███████████████              15%
```

**Three consequences for how you study:**

1. **D1 alone is over a quarter of the exam.** Sections 09, 15, 16 and 19 of this guide are your highest-leverage
   reading. If you can only do three things, learn the agent loop cold, learn when *not* to build an agent, and
   learn the supervisor/subagent trade-off table.
2. **D3 (Claude Code) is 20% — as heavy as prompt engineering.** Many candidates under-study it because it feels
   like "tooling". It is not: CLAUDE.md vs rules vs skills vs hooks vs permissions is a *configuration
   architecture* question with a right answer per scenario. See §07.
3. **D1 + D5 = 42%.** Agent design and context/reliability are effectively one continuous topic: an agent's
   dominant failure mode *is* context and error propagation. Study §08, §09 and §12 as a block.

---

## 0.4 Blueprint provenance — read this

I could not reach `anthropic.com` or `anthropic.skilljar.com` from this environment (the network egress proxy
blocks them), so **I did not read the official exam guide PDF directly**. The format and weights above are
triangulated from multiple independent third-party sources that agree exactly on all five domain names, all five
weights (27/20/20/18/15), the 60-question / 120-minute format, and the 720/1000 passing score.

**Action for you:** before you book, download the official
*Claude Certified Architect – Foundations – Exam Guide (PDF)* from Anthropic Academy
(`anthropic.skilljar.com`) and diff it against §0.3. If it differs, the official guide wins.

Consistent with that, this guide marks topics honestly:

- Topics tagged **[Officially tested]** map directly onto a named domain above.
- Topics tagged **[Engineering knowledge]** are not in the published blueprint but are load-bearing for real
  systems and for reasoning about scenario questions. RAG internals, embeddings, vector databases, evaluation
  metrics, and deployment topology fall here — the blueprint mentions RAG only under Context Management &
  Reliability, so do not assume the exam will ask you to compare HNSW to IVF-PQ.

I have **not** invented any Anthropic feature. Where I describe something Claude-specific (adaptive thinking,
`output_config.format`, context editing, the MCP connector, Claude Code hooks) it is a real, documented surface,
and I say so explicitly.

---

## 0.5 Topics in this guide that the blueprint does *not* explicitly name

Keep these in the "useful engineering knowledge, probably not directly tested" bucket. They still earn their
place because scenario questions assume you know them:

| Topic | Where | Why it still matters |
|---|---|---|
| Embeddings, ANN indexes, rerankers | §10 | You must be able to say *"retrieval quality is the bottleneck, not the model"* |
| Offline/online eval, LLM-as-judge | §11 | "How would you know this works?" is a recurring distractor-killer |
| Fine-tuning vs RAG vs long context | §16 | Classic architecture-decision stem |
| Kubernetes / serverless deployment | §18 | Only as constraint framing |
| FDE discovery method | §20 | Relevant to the role the cert targets, not the blueprint |

---

## 0.6 Additional official topics to confirm

The blueprint's own wording surfaces a handful of specifics that this guide covers and that you should be able
to answer instantly:

- **`stop_reason` drives the agentic loop** (D1). Know all six values and what your harness must do for each. → §02.4, §09.2
- **Structural `isError` / `is_error` flags** (D2). Know that a failed tool returns a `tool_result` *with*
  `is_error: true` — you do not drop the block, and you do not raise to the user. → §05.6
- **Environment variable mapping in MCP config** (D2). `${VAR}` and `${VAR:-default}` expansion in `.mcp.json`. → §06.6
- **Structured handoff packages and session resumption** (D1/D5). → §09.3, §09.6
- **PreToolUse / PostToolUse hooks as orchestration-layer safeguards** (D1/D3). → §07.6
- **Confidence calibration and escalation** (D5). → §12.6
- **Hub-and-spoke orchestration** (D1). → §09.6, §15.6

---

## 0.7 The six recurring exam scenarios

Scenario questions are anchored to a small set of realistic contexts. Expect stems drawn from:

1. **Customer support agent** — multi-turn, escalation, CRM writes
2. **Code generation pipeline** — test generation, PR automation
3. **Multi-agent research system** — fan-out, aggregation
4. **Developer productivity tooling** — Claude Code workflows
5. **CI/CD automation** — headless mode, batch
6. **Structured data extraction / transformation** — schemas, validation, retries

§19 builds a full architecture for each of these (plus two more). If you can whiteboard all eight from memory,
you are ready.

---

## 0.8 How to use this guide

**If you have 6 weeks.** Read 01 → 26 in order, one section per sitting. Do the scenario questions at the end of
each section *before* reading the answers. Build one small project per fortnight: (a) a structured-extraction
service with a validation loop, (b) a tool-using agent with a supervisor and a human approval gate, (c) an MCP
server plus a Claude Code configuration that consumes it.

**If you have 2 weeks.** §09, §15, §16, §07, §05, §06, §04, §08, §12 — in that order (this follows domain
weight). Then §22 (traps and heuristics), then §25 (practice exam), then re-read only what you got wrong.

**If you have 7 days.** Go straight to §26 and follow the plan.

**Answering technique.** For every scenario question, run this loop in your head before looking at the options:

```
1. What is the actual constraint?      (latency / cost / compliance / blast radius / determinism)
2. Is an LLM required at all?          (§16.1)
3. Is an *agent* required at all?      (§16.2 — the single most common trap)
4. What is the blast radius of a wrong answer?  (drives HITL, write access, sandboxing)
5. How would I know it broke?          (drives eval + observability — often the tiebreaker between two
                                        otherwise-equal options)
```

Options that add autonomy, agents, or model calls without a stated need are usually wrong. Options that add a
*deterministic guardrail around* an LLM are usually right.

---

## Key takeaways

- Five domains, weights 27 / 20 / 20 / 18 / 15. D1 (agentic architecture) dominates; D3 (Claude Code) is
  under-studied relative to its 20%.
- 60 questions / 120 minutes / 720 to pass on a 100–1000 scale — pattern recognition beats derivation.
- Verify the blueprint against Anthropic's official exam guide PDF; this guide's weights are triangulated from
  secondary sources, not read from the primary document.
- The exam rewards *restraint*: the simplest architecture that meets the constraint, with a guardrail, wins.

## Things to memorise

- The five domain names and their weights, in order.
- The six `stop_reason` values (§02.4).
- The "is an agent required?" test (§16.2).
- The five-step answering loop in §0.8.
