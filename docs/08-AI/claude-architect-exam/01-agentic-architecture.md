# Agentic Architecture & Orchestration (Domain 1 — 27%)

> **Before you start**: Do you understand the difference between a single LLM call and an autonomous agent loop? This domain is the heaviest on the exam.

---

## What Is an Agent?

An **agent** is a system where Claude autonomously decides what actions to take, executes them, observes the results, and continues until a goal is achieved — without a human approving each step.

**Analogy**: Think of a single Claude call like asking a consultant one question. An agent is hiring that consultant to run a project — they make decisions, use tools, and report back when done.

---

## The Agent Loop

Every agentic system follows this core loop:

```
[Task Input]
     ↓
[Plan] — Claude decides what to do
     ↓
[Act]  — Claude calls a tool or takes action
     ↓
[Observe] — Claude reads the tool result
     ↓
[Evaluate] — Done? Continue? Escalate?
     ↓
[Loop or Exit]
```

**Key architecture decision**: How many iterations do you allow? Always set a **max_iterations** limit to prevent infinite loops.

```python
MAX_ITERATIONS = 10

for i in range(MAX_ITERATIONS):
    response = claude.messages.create(...)
    if response.stop_reason == "end_turn":
        break
    if i == MAX_ITERATIONS - 1:
        escalate_to_human("Agent reached max iterations without completing task")
```

---

## Multi-Agent Orchestration Patterns

### 1. Sequential Chain
```
Agent A → Agent B → Agent C → Output
```
- Each agent's output becomes the next agent's input
- Use when: tasks have strict order dependency
- Risk: failure in any step fails the whole chain

### 2. Fan-Out / Parallel Workers
```
Orchestrator
├── Worker A → Result A
├── Worker B → Result B
└── Worker C → Result C
     ↓
  Aggregator → Final Output
```
- Use when: subtasks are independent
- Advantage: dramatically faster (parallel, not sequential)
- Risk: partial failures, aggregation complexity

### 3. Hierarchical (Supervisor/Worker)
```
Supervisor Agent
├── Planner Sub-agent
├── Researcher Sub-agent (with web tools)
└── Writer Sub-agent (with formatting tools)
```
- Use when: tasks require different expertise/tools per subtask
- Advantage: separation of concerns, specialized prompts per agent

### 4. Router / Classifier
```
Input → Classifier Agent → [Support Agent | Billing Agent | Tech Agent]
```
- Use when: incoming requests need to be routed to specialized handlers
- Common in customer support architectures

---

## 🧠 Decision Framework: Single vs Multi-Agent

| Situation | Use |
|---|---|
| Task fits in one context window | Single agent |
| Task has strictly sequential steps | Single agent with loop |
| Subtasks are independent | Multi-agent (parallel) |
| Subtasks need different tools/expertise | Multi-agent (hierarchical) |
| Scale: 1,000+ requests/hour | Multi-agent (fan-out) |
| Debugging is critical | Single agent (simpler trace) |
| Cost is primary constraint | Single agent |

**Key rule**: Start with a single agent. Only add agents when you have a specific reason (scale, parallelism, specialized tools).

### Sequential vs Parallel Execution

| Factor | Sequential | Parallel |
|---|---|---|
| Speed | Slower (n × latency) | Faster (max latency) |
| Cost | Same total tokens | Same total tokens |
| Complexity | Lower | Higher (aggregation, partial failure) |
| Debugging | Easier | Harder |
| Use when | Steps depend on each other | Steps are independent |

### Stateless vs Stateful Agents

| Factor | Stateless | Stateful |
|---|---|---|
| Scalability | High (any instance handles) | Lower (sticky sessions) |
| Cost | Lower (no storage) | Higher (persist state) |
| Multi-turn support | No | Yes |
| Recovery after failure | Easy (just restart) | Requires state restore |
| Use when | Single-turn tasks, batch jobs | Conversations, long workflows |

---

## State Management

### What state do agents need?
1. **Conversation history** — what's been said/done
2. **Task state** — progress, partial results, completed steps
3. **External state** — database records, file system changes

### Patterns for state preservation

**Option A: Pass state in context (simple)**
```python
# Include previous steps in the prompt
messages = [
    {"role": "user", "content": f"Task: {task}\nCompleted steps: {json.dumps(completed_steps)}"}
]
```

**Option B: External store (scalable)**
```python
# Store state in Redis/DB between agent turns
state = redis.get(f"agent:{session_id}")
# Agent reads state, updates state, stores back
redis.set(f"agent:{session_id}", updated_state)
```

**Option C: Summary compression (long sessions)**
```python
# When context grows large, summarize older steps
if len(messages) > 20:
    summary = summarize_history(messages[:-5])
    messages = [{"role": "user", "content": f"History summary: {summary}"}] + messages[-5:]
```

---

## Task Decomposition

**How to break down tasks for agents:**

1. **Identify atomic operations** — what's the smallest meaningful unit?
2. **Find dependencies** — which steps must happen before others?
3. **Find parallelism** — which steps can run simultaneously?
4. **Define success criteria** — how does the agent know each step is done?

**Example: Research report task**
```
Research "quantum computing market 2026"
├── [Parallel]
│   ├── Search recent news (web tool)
│   ├── Search academic papers (arxiv tool)
│   └── Fetch industry reports (database tool)
├── [Sequential]
│   ├── Synthesize findings
│   ├── Identify gaps / contradictions
│   └── Write executive summary
```

---

## Escalation & Human Handoff

Agents must know when to stop and ask a human. **Never let agents run forever without a handoff condition.**

### When to escalate:
- Max iterations reached
- Confidence below threshold
- Sensitive action required (deleting data, sending emails)
- Ambiguous task that needs clarification
- Repeated tool failures (> 3 retries)

```python
def should_escalate(state):
    return (
        state.iterations >= MAX_ITERATIONS or
        state.confidence < 0.7 or
        state.action_type in SENSITIVE_ACTIONS or
        state.consecutive_failures >= 3
    )
```

**Pattern**: Always surface the agent's work so far when escalating — don't just say "I failed." Give the human a resumption point.

---

## Error Propagation in Multi-Agent Systems

In a chain: `A → B → C`, if B fails:
- ❌ Silent failure: C gets bad input, produces bad output, user gets garbage
- ✅ Explicit failure: B returns structured error, orchestrator decides to retry/escalate

**Best practice**: Use typed error returns, not exceptions swallowed in try/catch.

```python
# Tool/agent returns structured result
{
  "success": false,
  "error_type": "rate_limit",
  "error_message": "Too many requests to search API",
  "retry_after_seconds": 30,
  "partial_results": [...]  # return what you have
}
```

**Orchestrator handles errors explicitly**:
```python
if not result.success:
    if result.error_type == "rate_limit":
        time.sleep(result.retry_after_seconds)
        retry()
    elif result.error_type == "not_found":
        use_fallback_source()
    else:
        escalate_to_human(result)
```

---

## 🔍 Failure Modes & Debugging

### Common agent failures:

| Failure | Root Cause | Fix |
|---|---|---|
| Infinite loop | No termination condition | Add max_iterations |
| Hallucinated tool calls | Vague tool descriptions | Improve tool descriptions |
| Context truncation | History grows too long | Summarize or compress |
| Retry explosion | No backoff on tool errors | Exponential backoff + max retries |
| State corruption | Concurrent writes to shared state | Locking or event sourcing |
| Agent divergence | Workers produce conflicting results | Aggregator with conflict resolution |

### How to debug agent systems:
1. Log every tool call + result with a unique trace ID
2. Log the agent's "reasoning" (what it decided and why)
3. Add iteration count to every log line
4. Alert on: iteration count > 70% of max, retry count > 2

---

## ⚖️ Trade-offs

| Choice | Latency | Cost | Accuracy | Complexity |
|---|---|---|---|---|
| Single agent | Higher (serial) | Lower | Good | Low |
| Parallel agents | Lower | Same | Better (diverse sources) | High |
| Stateful agents | Same | Higher (storage) | Better (memory) | High |
| Max iterations = 5 | Lower | Lower | May not complete | Low |
| Max iterations = 50 | Higher | Higher | More likely complete | Medium |

---

## 📊 Evaluation & Metrics

What to measure in agentic systems:

| Metric | What it tells you |
|---|---|
| Task completion rate | % of tasks fully resolved without escalation |
| Avg iterations per task | Are agents efficient or wandering? |
| Escalation rate | How often do agents fail to self-resolve? |
| Tool call success rate | Are tools reliable? Are descriptions clear? |
| P95 latency | What's worst-case user experience? |
| Cost per task | Average token spend per completed task |

**Target benchmarks:**
- Task completion rate > 85%
- Escalation rate < 10%
- Tool call success rate > 95%

---

## 🔗 Cross-domain Connections

- **→ Prompt Engineering**: System prompt design determines how agents plan and reason
- **→ Tool Design & MCP**: Tool descriptions directly affect agent decision quality
- **→ Context Management**: Long agent sessions hit context limits — need compression strategies
- **→ Claude Code**: Worktree isolation is the agentic pattern for Claude Code parallel work

---

## Interview / Exam Questions

**Q: When should you use multiple agents instead of one agent with more tools?**
A: When subtasks are truly independent and can run in parallel, or when subtasks need specialized prompts and different tool sets. Single agent is preferred when cost and simplicity matter.

**Q: An agent is not completing tasks and hitting max_iterations frequently. What's the most likely cause?**
A: Task decomposition is too coarse — the agent is trying to do too much in one iteration. Break the task into smaller, verifiable steps.

**Q: How do you handle partial failures in a fan-out pattern?**
A: The orchestrator must treat each worker result as optional with a known failure mode. Aggregate what succeeded, mark what failed, and either retry failed workers or return partial results with clear indication of what's missing.

**Q: A customer support agent escalated 40% of conversations to human agents. What's wrong?**
A: Escalation threshold is too sensitive, task scope is too broad for the agent, or tool coverage doesn't match the support domain. First check if the agent has the right tools; if yes, adjust escalation thresholds or expand agent capabilities.

---

## ⚡ Cheat Sheet

```
AGENT LOOP: Plan → Act → Observe → Evaluate → Repeat
MAX ITERATIONS: Always set one. 10-20 is common.

PATTERNS:
  Sequential → order dependency
  Parallel   → independence + speed
  Hierarchical → specialized subtasks
  Router     → request classification

STATE:
  Stateless  → batch, single-turn
  Stateful   → conversations, long workflows

ESCALATE WHEN:
  - max iterations hit
  - confidence < threshold
  - sensitive action
  - repeated failures (>3)

KEY METRICS:
  - Task completion rate (target >85%)
  - Escalation rate (target <10%)
  - Tool success rate (target >95%)
```

---

## Real-World Lesson: AI Agents for Large-Scale Refactoring (1Password)

> Source: 1Password engineering blog — lessons from using AI agents to break apart a Go monolith.

### The Core Insight
The bottleneck is **not code generation** — agents are great at reading, analysing, and drafting changes. The hard part is **managing sequences of decisions that have ordering constraints or are difficult to reverse** (schema migrations, deployment sequencing, shared state boundaries).

### What Worked

| Technique | Why it worked |
|---|---|
| Build deterministic tools first (analyzers, manifests), then run agents over stable artifacts | Agents reason over a fixed snapshot instead of guessing what the system looks like |
| Go SSA analysis + SQL parsing + runtime coupling data → domain ownership maps | Multiple sources of truth = accurate extraction order |
| Parallel agents in separate git worktrees | Isolated changes can scale; merging isolated worktrees is safe |
| Exhaustive playbooks with explicit templates | 3,000+ call sites migrated in hours with low failure rate |

**Rule of thumb**: Well-specified, bounded work → fast & accurate. Complex service extraction → only 20–30% productivity gain.

### Anti-Patterns Encountered

- **Speculation / gap-filling** — when context is missing, agents hallucinate reasonable-seeming but wrong details (e.g., wrong ULID format propagated across the codebase → full session rollback needed).
- **Ordering violations** — agents backfilled UUID columns *before* updating insertion code → silent data loss.
- **Shared state misclassification** — treating shared tables as independently owned caused deployment-time conflicts.

### Four Rules for Agent-Assisted Refactoring

1. **Sequencing > code quality** — schema changes and deployment order determine success more than how clean the code is.
2. **Contain non-determinism** — produce deterministic intermediate artifacts (manifests, ownership maps) as stable checkpoints before the agent acts.
3. **Exhaustive specs** — include invariants, ordering constraints, and explicit escalation paths for ambiguous cases.
4. **Solve isolation before parallelism** — parallel agents multiply inconsistency without proper structural boundaries.

### Model Strategy
- **Large/slow model** → planning (produce a concrete, ordered plan as an artifact).
- **Small/fast model** → execution (follow the plan step by step).

---

## Related Topics
- **Prerequisite**: Claude API basics, tool use
- **Next**: `02-claude-code-workflows.md`
- **Related**: `04-tool-design-and-mcp.md` (tool calling depth), `05-context-management.md` (long sessions)
- **Decision guide**: `07-decision-frameworks.md`
