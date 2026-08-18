# CCA-F Master Study Guide

A deep, first-principles engineering guide to the **Claude Certified Architect – Foundations (CCA-F)** exam,
written for experienced software / backend / cloud engineers who are new to advanced LLM and agent architecture.

> **This is not exam-cram.** The goal is that you can reason your way through a scenario you have never seen,
> because you understand *why* each architecture behaves the way it does — its failure modes, its cost curve,
> its blast radius, and its evaluation story.

---

## How this guide is labelled

Throughout, every claim is tagged so you always know what kind of knowledge you are holding:

| Tag | Meaning |
|---|---|
| **[General LLM]** | True of transformer LLMs broadly. Portable knowledge. |
| **[Claude-specific]** | Specific to Anthropic's models or the Claude API surface. Do not assume it transfers. |
| **[MCP-specific]** | Defined by the Model Context Protocol, not by Claude. Any MCP client/host behaves this way. |
| **[Claude Code-specific]** | A property of the Claude Code product / Agent SDK harness, not the API. |
| **[Architecture]** | A design pattern or engineering judgement — not a product feature. |

A recurring box, **"Why would an architect choose A instead of B?"**, appears wherever two credible designs compete.

---

## Reading order

| # | File | Covers | Official domain weight |
|---|---|---|---|
| 00 | [Exam blueprint & how to use this guide](./00-exam-blueprint.md) | Verified domains, weights, scoring, provenance | — |
| 01 | [LLM & Claude foundations](./01-llm-and-claude-foundations.md) | Tokens, sampling, model families, model selection, failure modes | Cross-cutting |
| 02 | [Claude API fundamentals](./02-claude-api-fundamentals.md) | Messages API, content blocks, `stop_reason`, streaming, reliability | D4 + D5 |
| 03 | [Prompt engineering](./03-prompt-engineering.md) | Structure, few-shot, reasoning, templates, injection | **D4 (20%)** |
| 04 | [Structured outputs](./04-structured-outputs.md) | Schemas, strict mode, validation loops, versioning | **D4 (20%)** |
| 05 | [Tool use](./05-tool-use.md) | Tool schemas, selection, execution loop, safety, failure handling | **D2 (18%)** |
| 06 | [MCP](./06-mcp.md) | Protocol, primitives, transports, security, topologies | **D2 (18%)** |
| 07 | [Claude Code](./07-claude-code.md) | CLAUDE.md, rules, skills, hooks, permissions, subagents, CI/CD | **D3 (20%)** |
| 08 | [Context engineering](./08-context-engineering.md) | Budgeting, caching, compaction, context editing, memory | **D5 (15%)** |
| 09 | [Agent architecture](./09-agent-architecture.md) | Agent loop, state, planning, multi-agent, termination | **D1 (27%)** |
| 10 | [RAG & knowledge architectures](./10-rag-and-knowledge.md) | Ingestion, chunking, retrieval, reranking, agentic RAG | D5 + D1 |
| 11 | [Evaluation](./11-evaluation.md) | Offline/online, LLM-as-judge, RAG & agent metrics, regression gates | Cross-cutting |
| 12 | [Reliability & production](./12-reliability-and-production.md) | Retries, fallbacks, guardrails, HITL, observability | **D5 (15%)** |
| 13 | [Security](./13-security.md) | Threat model, injection, tool/agent/MCP security, enterprise controls | Cross-cutting |
| 14 | [Performance & cost](./14-performance-and-cost.md) | Token economics, latency budgets, caching, scaling | Cross-cutting |
| 15 | [Architecture patterns](./15-architecture-patterns.md) | 14 reference patterns with full trade-off analysis | **D1 (27%)** |
| 16 | [Architectural decision making](./16-decision-making.md) | 13 explicit decision frameworks | **D1 (27%)** |
| 17 | [Testing](./17-testing.md) | Unit → integration → trajectory → security → load | Cross-cutting |
| 18 | [Deployment & operations](./18-deployment-and-operations.md) | Config, CI/CD, versioning, incident response | Cross-cutting |
| 19 | [Enterprise case studies](./19-enterprise-case-studies.md) | 8 end-to-end architectures | **D1 + D3** |
| 20 | [FDE playbook](./20-fde-playbook.md) | Discovery, feasibility, production readiness, communication | Role knowledge |
| 21 | [Scenario bank](./21-scenario-bank.md) | 40 hard scenario questions with full reasoning | All |
| 22 | [Exam-oriented knowledge](./22-exam-oriented-knowledge.md) | Must/Should/Nice to know, traps, heuristics per domain | All |
| 23 | [Decision trees](./23-decision-trees.md) | 15 compact decision trees | All |
| 24 | [Master cheat sheet](./24-master-cheatsheet.md) | Definitions, trade-off matrix, checklists | All |
| 25 | [100-question practice exam](./25-practice-exam.md) | Exam + answer key + explanation for every answer | All |
| 26 | [Topic checklist & 7-day revision plan](./26-revision-plan.md) | Coverage checklist and a day-by-day plan | All |

---

## Companion material

The [condensed domain notes](../claude-architect-exam/00-exam-overview.md) in the sibling folder are a faster
skim of the same five domains. Use them for final-week revision; use this guide to actually *learn* the material.

---

## A word on model IDs and API versions

Model identifiers, beta headers, and pricing change frequently. Every concrete identifier in this guide is
correct as of **August 2026** and is marked as *verify-before-use*. In production and on the exam, the durable
knowledge is the *shape* of the API and the *reasoning* behind a design — not a version string. Where a topic
has changed across versions (extended thinking budgets, `output_format` → `output_config.format`, MCP's SSE →
Streamable HTTP transport), the guide explains the current approach and flags the historical difference only
where it still bites real systems.
