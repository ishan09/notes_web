# Claude Certified Architect (CCA) — Exam Overview

> **Before you start**: Do you know the difference between using Claude and architecting production systems with Claude? This exam tests the second.

---

## What Is the CCA Exam?

The **Claude Certified Architect (CCA) Foundations** is Anthropic's first official technical certification for architects building production-grade Claude AI systems. It validates that you can design, deploy, and maintain enterprise-scale AI systems — not just use Claude.

**Key facts:**
- Launched: March 12, 2026
- Format: Proctored, 120 minutes, 60 multiple-choice questions
- Style: Scenario-based (not theoretical knowledge dumps)
- Target: Solution architects with 6+ months Claude API experience
- Cost: $99/attempt (free for first 5,000 Claude Partner Network employees)

---

## The 5 Domains

| # | Domain | Weight | Focus |
|---|---|---|---|
| 1 | Agentic Architecture & Orchestration | **27%** | Multi-agent design, loops, state, task decomp |
| 2 | Claude Code Configuration & Workflows | **20%** | CLAUDE.md, skills, CI/CD, headless mode |
| 3 | Prompt Engineering & Structured Output | **20%** | XML tags, few-shot, JSON schemas, batching |
| 4 | Tool Design & MCP Integration | **18%** | Tool descriptions, MCP server/client, primitives |
| 5 | Context Management & Reliability | **15%** | Context bloat, caching, error handling, RAG |

**Key insight**: Domains 1+2+3 = 67% of the exam. Master these first.

---

## The 6 Official Scenarios

The exam presents 4 of these 6 randomly selected scenarios. All questions are anchored to one of these:

1. **Customer Support Agent** — multi-turn conversations, escalation, CRM integration
2. **Code Generation Pipeline** — developer productivity, test generation, PR automation
3. **Multi-Agent Research System** — orchestration, parallelization, aggregation
4. **Developer Productivity Tooling** — Claude Code workflows, CI/CD, automation
5. **CI/CD Automation** — headless mode, batch processing, pipeline integration
6. **Data Extraction & Transformation** — structured output, validation, retry loops

**Exam mindset**: Every question asks "what would a production architect do?" — not "what does Claude support?"

---

## Study Roadmap

### Phase 1: Foundations (Week 1–2)
- Complete Anthropic Academy courses (anthropic.skilljar.com — free)
- Read official Claude API docs and Claude Code docs
- Build 1 simple agentic project end-to-end

### Phase 2: Domain Mastery (Week 3–6)
- Study each domain file in order (weighted by exam %)
- Do the Quick Checks in each file without looking at answers
- Build 2 more real projects covering RAG + MCP

### Phase 3: Exam Prep (Week 7–8)
- Work through all 6 practice scenarios (`06-practice-scenarios.md`)
- Review the decision frameworks (`07-decision-frameworks.md`)
- Do a full timed pass of the cheat sheet (`08-cheat-sheet.md`)
- Identify weak areas and re-read those domain files

---

## How Questions Are Structured

Each question:
1. Describes a real production situation (1-3 sentences)
2. Asks what an architect **should** do / what went wrong / what's best
3. Offers 4 options — usually 2 obviously wrong, 2 plausible

**Elimination strategy:**
- Eliminate answers that ignore scale/production concerns
- Eliminate answers that describe what's possible, not what's optimal
- Eliminate answers that solve the immediate problem but break reliability
- The correct answer usually trades off something explicitly (cost, latency, complexity)

---

## The Architect Mindset

The exam does NOT test:
- Claude feature exhaustion (knowing every API parameter)
- Theoretical ML/AI knowledge
- Code syntax

The exam DOES test:
- **Trade-off reasoning**: When to use X vs Y given constraints
- **Failure anticipation**: What breaks and why
- **System thinking**: How components interact
- **Production reality**: Cost, latency, observability, scaling

> Think like someone responsible for a system that 10,000 users hit daily — not like someone writing a demo.

---

## Claude Architecture Mental Model

```
[User Request]
      ↓
[System Prompt + Context]
      ↓
[Claude Model] ← tools, resources, memory
      ↓
[Tool Use / Response]
      ↓
[Validation / Retry?]
      ↓
[Final Output]
```

For agentic systems:
```
[Orchestrator Agent]
    ├── [Planner]
    ├── [Worker Agent A] → Tool → Result
    ├── [Worker Agent B] → Tool → Result
    └── [Aggregator] → Final Response
```

---

## Quick Check

Before moving on, answer these from memory:
1. Which domain has the most weight? (answer: Agentic Architecture, 27%)
2. How many scenarios are in the exam? How many appear on your test? (6 total, 4 shown)
3. What does the exam primarily test — knowledge or decision-making? (decision-making)
4. What's the exam length and question count? (120 min, 60 MCQs)

---

## Files in This Folder

| File | Domain | Exam % |
|---|---|---|
| `01-agentic-architecture.md` | Domain 1 | 27% |
| `02-claude-code-workflows.md` | Domain 2 | 20% |
| `03-prompt-engineering.md` | Domain 3 | 20% |
| `04-tool-design-and-mcp.md` | Domain 4 | 18% |
| `05-context-management.md` | Domain 5 | 15% |
| `06-practice-scenarios.md` | All domains | — |
| `07-decision-frameworks.md` | Cross-domain | — |
| `08-cheat-sheet.md` | All domains | — |
| `09-hooks-and-plugins.md` | Domain 2 deep dive | — |

---

## Related Topics
- **Prerequisite**: Claude API basics, REST APIs, async programming concepts
- **Next**: `01-agentic-architecture.md` (heaviest domain, start here)
- **On exam day**: Read `08-cheat-sheet.md` first thing in the morning
