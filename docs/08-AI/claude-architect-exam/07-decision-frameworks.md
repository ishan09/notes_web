# Decision Frameworks — Cross-Domain Guide

> **Purpose**: The CCA exam tests decision-making, not knowledge. This file gives you clear "choose X when Y" rules across all domains. When facing an MCQ, map the scenario to one of these frameworks.

---

## How to Use This File

Every exam question is a decision under constraints. The pattern is:

1. Identify the constraint (latency, cost, accuracy, scale, complexity)
2. Match to the relevant framework below
3. Pick the answer that fits the constraint

This file is the highest-ROI study material per page — read it repeatedly.

---

## Framework 1: Single Agent vs Multi-Agent

```
Is the task decomposable into independent subtasks?
├── NO → Single agent with tools
└── YES
    ├── Do subtasks need different expertise/tools?
    │   ├── NO → Single agent, more tools
    │   └── YES → Multi-agent (hierarchical)
    ├── Do subtasks need to run in parallel?
    │   ├── NO → Single agent with loop
    │   └── YES → Multi-agent (fan-out)
    └── Is cost the primary constraint?
        ├── YES → Single agent (orchestration has overhead)
        └── NO → Multi-agent where parallelism helps
```

**Choose single agent when**:
- Task fits in one context window
- Debugging is important
- Cost is constrained
- Steps are strictly sequential

**Choose multi-agent when**:
- Independent subtasks benefit from parallelism
- Different subtasks need specialized prompts/tools
- Scale > 1,000 concurrent tasks

---

## Framework 2: Sequential vs Parallel Execution

| Signal in the question | Answer |
|---|---|
| "Tasks depend on each other's output" | Sequential |
| "Tasks are independent" | Parallel |
| "Reduce latency" + independent tasks | Parallel |
| "Cost concern" | Parallel ≈ same cost (same tokens) |
| "Simple to debug" | Sequential |
| "One failure shouldn't stop others" | Parallel with partial results |

**Key**: Parallelization doesn't reduce cost — it reduces latency. Same tokens, faster wall clock.

---

## Framework 3: Stateless vs Stateful Agents

| Signal | Stateless | Stateful |
|---|---|---|
| "Single-turn task" | ✅ | |
| "Multi-turn conversation" | | ✅ |
| "User returns after days" | | ✅ |
| "Batch processing" | ✅ | |
| "User resumes previous session" | | ✅ |
| "Scale to 10,000+ concurrent" | ✅ (easier) | |
| "Needs context from previous steps" | | ✅ |

---

## Framework 4: When to Use RAG vs Include Directly vs Fine-tuning

```
How big is the knowledge base?
├── < ~5K tokens → Include directly in system prompt
├── 5K-50K tokens → Include with caching
└── > 50K tokens → RAG

Does knowledge change frequently?
├── YES → RAG (not fine-tuning)
└── NO → Include directly or fine-tune

Is citation/traceability required?
├── YES → RAG (tracks source documents)
└── NO → Either

Is latency critical (<500ms)?
├── YES → Avoid RAG (retrieval adds latency)
└── NO → RAG fine

Do you need to teach Claude new reasoning patterns?
├── YES → Fine-tuning
└── NO → RAG or prompt (fine-tuning for facts is rarely worth it)
```

**When NOT to use RAG** (this is tested!):
- Knowledge fits easily in context window
- Task is creative (doesn't need factual retrieval)
- Latency is the primary constraint
- Retrieval quality is uncertain (bad retrieval = bad answers)
- Task is code generation (codebase context ≠ knowledge retrieval)

---

## Framework 5: Prompt Engineering Method Selection

```
What type of output do you need?

JSON / structured data:
├── Will it feed a database or parser? → Tool use with schema (most reliable)
├── One-off, low-stakes → Describe JSON in prompt
└── Complex nested structure → Tool use with schema

Text output:
├── Complex pattern hard to describe? → Few-shot examples
├── Simple, clear task? → Plain instructions
└── High-accuracy requirement? → Multi-pass review

Need deep reasoning?
├── YES, latency OK → Extended thinking
└── NO, or latency critical → Standard mode
```

**Few-shot vs Schema vs Tool calling**:
| Factor | Few-shot | Schema in prompt | Tool use schema |
|---|---|---|---|
| Reliability | Medium | Medium-High | Highest |
| Token cost | Higher | Lower | Medium |
| Flexibility | Highest | High | Lower |
| Parse guarantee | No | No | Yes |

---

## Framework 6: When to Use Extended Thinking

**Use extended thinking when**:
- Multi-step reasoning required (math, logic, analysis)
- Architecture trade-off analysis
- Answer quality >> response time
- Debugging complex agent behavior

**Don't use extended thinking when**:
- Simple factual queries
- High-volume batch processing (expensive at scale)
- Latency-sensitive applications (<2s requirement)
- Routine text generation

---

## Framework 7: Sync API vs Batch API vs Message Batches

```
Is real-time response required?
├── YES → Synchronous API
└── NO
    ├── Volume > 100 requests? → Batch API (50% cheaper)
    └── Volume < 100 requests → Synchronous (simpler)

Is cost the primary constraint?
├── YES → Batch API where latency allows
└── NO → Synchronous

Processing window available?
├── Up to 24 hours OK → Message Batches API
└── Must complete in minutes → Synchronous
```

---

## Framework 8: Prompt Caching Decision

**Cache when**:
- System prompt is large (>1,000 tokens) and stable
- Same large documents sent on every request
- Few-shot examples are reused across many calls

**Don't cache when**:
- Content is dynamic per request
- Very short prompts (caching overhead not worth it)
- Content changes more than every 5 minutes

**Cost model**: Cached tokens = ~10% of regular price. Cache lasts ~5 minutes of inactivity.

---

## Framework 9: MCP vs Direct Tool Definition

```
Will multiple Claude apps use these tools?
├── YES → MCP (build once, use everywhere)
└── NO → Direct tool definition

Is standardization and discoverability important?
├── YES → MCP
└── NO → Direct

Are you prototyping?
├── YES → Direct (faster iteration)
└── NO → MCP for production

Single tool, single app?
├── YES → Direct (MCP overkill)
└── NO → Consider MCP
```

**MCP Pattern Selection**:
| Situation | Pattern |
|---|---|
| Wrapping existing API | Adapter |
| Service-specific tools | Sidecar |
| Many tools in one endpoint | Facade |
| MCP handles workflow logic | Orchestrator |

---

## Framework 10: Error Handling Strategy

```
Did the tool call fail?
├── Is retry_safe = false? → Surface to user/escalate
└── Is retry_safe = true?
    ├── Attempt < max_retries (3)? → Feed error to Claude, retry
    └── At max_retries → Escalate with full context

Is the error transient (rate limit, timeout)?
├── YES → Exponential backoff: 1s, 2s, 4s + jitter
└── NO → Don't retry, escalate immediately

Did agent hit max iterations?
├── YES → Return partial results + resumption context, escalate
└── NO → Continue
```

---

## Framework 11: CLAUDE.md Configuration Hierarchy

```
Is this a personal preference (applies to all my work)?
├── YES → ~/.claude/CLAUDE.md (global)
└── NO

Is this for all team members on this project?
├── YES → /project-root/CLAUDE.md (commit to version control)
└── NO

Is this for a specific directory/service only?
└── YES → /project-root/service/CLAUDE.md (directory-level)
```

**Rule**: More specific overrides more general. Directory > Project > Global.

---

## Framework 12: Context Management Strategy

```
How big is the conversation history?
├── < 50% of context limit → No action needed
├── 50-80% of limit → Monitor, prepare compression
└── > 80% of limit → Compress now

Compression strategy:
├── Keep: first message (original task) + last 5-10 messages
├── Summarize: everything in between
└── Re-inject: key constraints every ~10 iterations

Is the same large document sent every request?
├── YES → Use prompt caching
└── NO → Include in context as needed
```

---

## Framework 13: Escalation Decision

**Always escalate when**:
- Max iterations reached (never exceed without escalation)
- Agent confidence below threshold
- Sensitive/irreversible action required
- Same tool fails 3+ consecutive times
- Context window > 90% full

**Escalation response must include**:
1. What was accomplished (partial results)
2. Current state snapshot
3. Why escalation was triggered
4. Instructions for a human to resume

---

## Framework 14: Tool Description Quality Check

Before shipping a tool, verify the description answers:
- [ ] What does it do? (1 sentence)
- [ ] When should Claude use it vs similar tools?
- [ ] When should Claude NOT use it?
- [ ] Does it mutate data? Is it reversible?
- [ ] What does the response look like?
- [ ] What are the limits/constraints?

If any checkbox is empty → the description is incomplete.

---

## The "Architect vs User" Mental Model

Every exam question can be filtered through: "Is this what a user would do, or what an architect would design?"

| User thinking | Architect thinking |
|---|---|
| "Use a bigger model" | "Redesign the feedback loop" |
| "Add more retries" | "Fix the root cause of failures" |
| "Cache everything" | "Cache stable content, don't cache dynamic" |
| "Make all checks blocking" | "Block on critical, advise on non-critical" |
| "Build one giant agent" | "Decompose into appropriate components" |

---

## Quick Framework Reference Card

```
PARALLELISM:  Independent tasks → parallel. Dependent tasks → sequential.
AGENTS:       1 agent unless parallelism or specialization needed.
STATE:        Stateless for batch/single-turn. Stateful for conversations.
RAG:          Use for large/dynamic KB. Skip for small/stable KB or latency-critical.
OUTPUT:       Tool use schema > prompt schema > few-shot for reliability.
BATCH API:    Non-urgent + high-volume = 50% savings, up to 24h.
CACHING:      Stable large prompts → cache. Dynamic content → don't cache.
MCP:          Multi-app reuse → MCP. Single-app → direct tools.
THINKING:     Complex reasoning → extended. Volume/speed → standard.
ESCALATE:     Max iter | low confidence | sensitive action | repeated failures.
```

---

## Related Topics
- **All domain notes**: `01` through `05`
- **Practice application**: `06-practice-scenarios.md`
- **Last-day review**: `08-cheat-sheet.md`
