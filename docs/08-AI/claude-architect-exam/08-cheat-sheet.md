# Last-Day Cheat Sheet — Claude Certified Architect

> **Read this the morning of your exam.** One pass, top to bottom. This is a compressed recall activator, not a learning document.

---

## Exam Fast Facts

```
120 minutes | 60 MCQ | 4 of 6 scenarios randomly selected
5 domains | Scenario-based (not theoretical)
~2 min/question → skip and return if stuck
```

---

## Domain Weights (memorize this)

```
27% — Agentic Architecture & Orchestration  ← most important
20% — Claude Code Configuration & Workflows
20% — Prompt Engineering & Structured Output
18% — Tool Design & MCP Integration
15% — Context Management & Reliability
```

---

## Domain 1: Agentic Architecture (27%)

### The Agent Loop
```
Plan → Act → Observe → Evaluate → Repeat | Exit | Escalate
```

### Orchestration Patterns
```
Sequential    → steps depend on each other
Fan-out       → independent tasks, run parallel
Hierarchical  → different subtasks need different tools/expertise
Router        → classify then route to specialist
```

### Critical Rules
```
ALWAYS set max_iterations (10-20 typical)
ALWAYS escalate when max_iterations hit
ALWAYS return partial results + resumption context on escalation
NEVER let agent run indefinitely
```

### Single vs Multi-Agent
```
Single agent when: cost matters, sequential, debugging critical
Multi-agent when: parallelism, specialization, scale
```

### Stateless vs Stateful
```
Stateless: batch, single-turn, scale
Stateful: conversations, multi-day, long workflows
```

### Escalation Triggers
```
- Max iterations reached
- Confidence < threshold
- Sensitive/irreversible action
- Tool failure ≥ 3 consecutive times
- Context > 90% full
```

### Key Metrics
```
Task completion rate  → target >85%
Escalation rate       → target <10%
Tool success rate     → target >95%
```

---

## Domain 2: Claude Code (20%)

### CLAUDE.md Hierarchy
```
~/.claude/CLAUDE.md          → global (all projects)
/project/CLAUDE.md           → project (team-wide, version controlled)
/project/dir/CLAUDE.md       → directory (service-specific)
More specific = higher priority
```

### Key Commands
```
claude -p "task"              → headless (non-interactive, for CI/CD)
claude -p "task" --output-format json  → structured output
git worktree add /tmp/agent-X branch-X → isolate parallel agents
```

### When to Use What
```
CI/CD automation           → headless mode (-p)
Human review checkpoint    → plan mode
Multiple agents same repo  → worktrees
High-volume overnight work → Batch API (50% cheaper)
Team config consistency    → project CLAUDE.md in version control
```

### Key Metrics
```
PR success rate > 90%
Human intervention < 15%
Pipeline time < 5 min/PR
```

---

## Domain 3: Prompt Engineering (20%)

### Structured Output Reliability (ranked)
```
1. Tool use with JSON schema  ← API-enforced, most reliable
2. XML-wrapped schema in prompt
3. Few-shot JSON examples
4. "Output JSON:" in text     ← least reliable
```

### XML Tags
```
Purpose: Separate instructions from data → prevents injection
Use: <task>, <document>, <output_format>, <rules>, <confidential>
```

### Few-shot
```
Use for: ambiguous edge cases, complex output patterns
Don't use for: simple tasks (wastes tokens)
Structure: examples → edge cases → now process input
```

### Extended Thinking
```
Use: complex reasoning, trade-off analysis, math
Don't use: simple queries, high-volume, latency-sensitive (<2s)
```

### Multi-Pass Review
```
Use: high accuracy, latency OK, safety-critical
Skip: real-time, high-volume, cost-constrained
```

### Batch API
```
When: >100 requests, non-real-time needed
Benefit: 50% cheaper, Anthropic handles parallelism
Trade-off: up to 24h processing window
```

### Token Efficiency
```
Cache stable system prompts (10% of regular token cost)
Summarize old conversation turns
Specify output length
No filler words in prompts
```

### System Prompt Layers
```
System prompt  → persona, rules, format (hidden from user)
User message   → actual request
Tool definition → schema (hidden from user)
```

---

## Domain 4: Tool Design & MCP (18%)

### Tool Description Must Include
```
1. What it does (1 sentence)
2. When to use vs similar tools
3. When NOT to use
4. Side effects (mutations, irreversibility)
5. Response shape
6. Constraints (rate limits, formats)
```

### Structured Error Response
```json
{
  "success": false,
  "error_type": "validation_error",
  "error_message": "specific, actionable message",
  "suggestion": "try X instead",
  "retry_safe": true
}
```

### MCP Primitives
```
Tools     → functions Claude calls
Resources → read-only data (files, DB records)
Prompts   → reusable prompt templates
```

### MCP Transport
```
stdio    → local/CLI tools (simple)
HTTP+SSE → remote/cloud (multi-client, scalable)
```

### MCP Patterns
```
Adapter      → wrap existing API
Sidecar      → per-service MCP server
Facade       → aggregate multiple services
Orchestrator → MCP handles workflow logic
```

### MCP vs Direct Tools
```
Use MCP:    multiple apps, standardization, discoverability, platform
Use direct: single app, prototype, one tool, simple
```

### MCP Security
```
Authenticate: verify request origin
Scope: least privilege — expose minimum needed
Audit: log every tool call (actor, timestamp, args)
Separate: read-only MCP vs write MCP
```

### Key Metrics
```
Tool call success rate  > 95%
Self-correction rate    > 80%
Avg tool calls/task     → minimize
```

---

## Domain 5: Context Management (15%)

### Context Bloat Sources
```
1. Conversation history accumulation
2. Verbose tool responses
3. Redundant system prompt content
4. Full documents instead of chunks
```

### Compression Trigger
```
Compress at 80% of context limit
Keep: first message + last 5-10 turns + summary of middle
```

### Prompt Caching
```
Cache: large stable system prompts, reference docs, few-shot examples
Don't cache: per-request dynamic content
Cost: ~10% of regular token price
Duration: ~5 min of inactivity
```

### RAG Decision
```
Use RAG:     large KB (>10K tokens), dynamic, citations needed
Skip RAG:    small/stable KB, latency critical, creative tasks
```

### RAG Best Practices
```
Hybrid search = BM25 (keyword) + semantic (embedding) — always better
Contextual embeddings: prepend doc title/section → 49% better retrieval
Chunks must be self-contained
```

### Retry Pattern
```
Max 3 retries
Exponential backoff: 1s → 2s → 4s + jitter
Retryable: 5xx, rate limits
Not retryable: 4xx validation errors
```

### Graceful Degradation
```
Primary → Fallback 1 → Fallback 2 → Escalate
Never silently fail
```

### Key Metrics
```
Context utilization  < 80%
RAG precision        > 85%
Cache hit rate       > 60%
Escalation rate      < 5%
```

---

## The 6 Scenarios (remember all)

```
1. Customer Support Agent     → escalation, CRM tools, state management
2. Code Generation Pipeline   → worktrees, test feedback, PR automation
3. Multi-Agent Research       → fan-out parallel, grounding, aggregation
4. Developer Productivity     → CLAUDE.md, slash commands, headless CI
5. CI/CD Automation           → headless, blocking vs advisory, batch for advisory
6. Data Extraction            → tool use schema, batch API, high accuracy
```

---

## Most Common Exam Traps

```
TRAP: "Use a bigger model" → Almost never the answer. Fix the architecture.

TRAP: "Reduce feature scope" → Avoids the problem, doesn't solve it.

TRAP: "Sequential is simpler" → Only if tasks depend on each other.

TRAP: "Cache everything" → Only cache stable content.

TRAP: "Make all checks blocking" → Block critical, advise non-critical.

TRAP: "Add more retries" → Fix root cause. Retries mask, not fix.

TRAP: "Fine-tune for facts" → RAG is better for factual/dynamic knowledge.

TRAP: "Stateless agents scale better" → True, but wrong for multi-turn.

TRAP: "MCP is always better" → MCP is overkill for single-app, single-tool.

TRAP: "More tokens = better output" → Token efficiency is a core principle.
```

---

## Answer Elimination Framework

When you see 4 options, eliminate in this order:

1. **Eliminate** answers that add complexity without solving root cause
2. **Eliminate** answers that sacrifice quality for convenience
3. **Eliminate** answers that would fail at scale
4. **Choose** between remaining: which one is the architectural solution?

The correct answer usually:
- Addresses the root cause, not symptoms
- Has an explicit trade-off (not "free lunch")
- Would survive a senior engineer's code review
- Matches the constraint stated in the question

---

## The Architect's Golden Rules

```
1. Every design decision has a trade-off. Know it.
2. Reliability > features. Design for failure.
3. Measure what matters. Add metrics before you need them.
4. Escalation is not failure. It's good design.
5. Tool description quality = agent behavior quality.
6. Context is expensive. Don't waste it.
7. Parallelism reduces latency, not cost.
8. RAG groundng prevents hallucination. Always cite sources.
9. CLAUDE.md is infrastructure. Treat it like code.
10. Single agents first. Multi-agent only when justified.
```

---

## Good luck. Trust your preparation.

```
Read each question fully.
Identify the constraint (cost | latency | accuracy | scale).
Map to a decision framework.
Eliminate 2, choose between 2.
Move on — don't over-analyze.
```

---

## Files in this folder
```
00-exam-overview.md         ← exam format, roadmap
01-agentic-architecture.md  ← 27%
02-claude-code-workflows.md ← 20%
03-prompt-engineering.md    ← 20%
04-tool-design-and-mcp.md   ← 18%
05-context-management.md    ← 15%
06-practice-scenarios.md    ← 6 scenarios + wrong answer analysis
07-decision-frameworks.md   ← when to use what (highest ROI)
08-cheat-sheet.md           ← this file
```
