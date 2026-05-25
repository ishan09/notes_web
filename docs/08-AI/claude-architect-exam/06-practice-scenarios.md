# Practice Scenarios — All 6 Official Scenario Types

> **How to use this file**: Read each scenario fully. Try to answer the MCQ before reading the correct answer. Study the wrong answer analysis — that's what differentiates pass from top-score.

---

## How the Exam Uses Scenarios

The exam presents 4 of these 6 scenarios (randomly selected). Each scenario spawns multiple questions across different domains. The scenario gives you context; questions test specific architectural decisions within that context.

**Time pressure tip**: You have ~2 minutes per question. Eliminate 2 wrong answers in 30 seconds, pick between the remaining 2 in 90 seconds.

---

## Scenario 1: Customer Support Agent

### Setup
A fintech company wants to automate Tier 1 customer support. They receive 5,000 support requests/day. Topics: account issues, transaction disputes, password resets, feature questions. 15% of issues require human intervention (Tier 2).

### Architecture
```
User message
     ↓
[Classifier Agent] → topic + urgency
     ↓
[Support Agent] ← CRM tool, Knowledge Base tool, Account tool
     ↓
[Escalation check] → human if needed
     ↓
Response / Ticket created
```

### Key Architect Decisions
1. **Escalation threshold**: What triggers Tier 2 handoff?
2. **State management**: How to resume if user returns after 2 days?
3. **Tool design**: CRM tool needs to be read-only for Tier 1

### Sample Question 1
**Q**: The support agent escalates 40% of cases to Tier 2 (target is 15%). What's the most likely architectural cause?

A) The system prompt is too long
B) The agent's tools lack sufficient scope to resolve issues autonomously
C) The context window is being exceeded
D) The model is too large for this use case

**✅ Correct: B**
**Why**: The target 15% escalation means 85% of cases should be self-serviceable. A 40% rate means the agent lacks the tools it needs — it can't look up data, take actions, or access the knowledge base to resolve issues.

**❌ Why A is wrong**: System prompt length doesn't cause escalation. It affects quality, not handoff rate.
**❌ Why C is wrong**: Context window issues would cause different symptoms (forgotten context, garbled responses) — not systematic escalation.
**❌ Why D is wrong**: Model size doesn't determine escalation. Tool coverage does.

---

### Sample Question 2
**Q**: A customer's session is interrupted and they return 3 days later. How should the agent handle resumption?

A) Start fresh — stateless agents are simpler and more reliable
B) Load session state from an external store, re-inject key facts into context
C) Ask the user to repeat their issue
D) Keep the session in memory with a very long timeout

**✅ Correct: B**
**Why**: Customer experience requires continuity. External state store (Redis/DB) is the scalable, production-grade solution. Inject the previous session summary into context at resumption.

**❌ Why A is wrong**: Stateless works for single-turn tasks. Multi-day support conversations require state.
**❌ Why C is wrong**: Asking users to repeat creates a poor experience — this is the problem you're solving.
**❌ Why D is wrong**: In-memory sessions with long timeouts consume server resources and are lost on restart.

---

## Scenario 2: Code Generation Pipeline

### Setup
A software company wants to automate feature implementation from JIRA tickets. Engineers write JIRA issues; Claude should read the issue, implement code, write tests, and open a PR. The repo is a Java 21 Spring Boot application with 200k lines of code.

### Architecture
```
JIRA webhook → Issue created
     ↓
[Claude Code (headless)] ← repo via git worktree
     ├── Read JIRA issue
     ├── Understand codebase (relevant files)
     ├── Implement feature
     ├── Write tests
     ├── Run tests (bash tool)
     └── Open PR
     ↓
Engineer reviews PR
```

### Key Architect Decisions
1. **Codebase navigation**: 200k lines — Claude can't read all of it
2. **Test validation**: Must run tests before opening PR
3. **Isolation**: Each feature must not interfere with others

### Sample Question 3
**Q**: The pipeline frequently opens PRs where implemented features break existing tests. What's the most effective fix?

A) Use a more capable Claude model
B) Add a test execution step that feeds failures back to Claude before opening PR
C) Reduce the scope of features assigned to the agent
D) Increase max_iterations to allow more refinement

**✅ Correct: B**
**Why**: This is a feedback loop problem. Claude doesn't know tests are failing because there's no feedback. Adding `run tests → if failures, feed results back → Claude fixes → run tests again → PR` directly solves this.

**❌ Why A is wrong**: Model capability isn't the issue. The pipeline architecture lacks a validation step.
**❌ Why C is wrong**: This avoids the problem, doesn't solve it.
**❌ Why D is wrong**: More iterations doesn't help without test result feedback.

---

### Sample Question 4
**Q**: Two engineers trigger the pipeline simultaneously on different JIRA tickets. The PRs corrupt each other's changes. What's the fix?

A) Serialize pipeline execution — only one job at a time
B) Use git worktrees to give each agent an isolated copy of the repo
C) Use different Claude models for each pipeline
D) Add a mutex lock to the CLAUDE.md file

**✅ Correct: B**
**Why**: Worktrees give each agent its own filesystem view of the repo, working on its own branch. They never touch the same files in the same working tree.

**❌ Why A is wrong**: Serialization prevents the corruption but kills the parallelism benefit.
**❌ Why C is wrong**: Model selection has nothing to do with filesystem conflicts.
**❌ Why D is wrong**: CLAUDE.md locking doesn't prevent file conflicts in the working directory.

---

## Scenario 3: Multi-Agent Research System

### Setup
A consulting firm needs to generate research reports on companies. A report requires: recent news (web), financial data (database), competitor analysis (web + db), risk assessment (synthesis). Reports take 45 minutes manually; target is 10 minutes automated.

### Architecture
```
[Orchestrator Agent] receives company + report_type
     ├── [News Agent] → web_search tool → recent news
     ├── [Financial Agent] → db_query tool → financials
     ├── [Competitor Agent] → web + db → competitor landscape
     └── [Risk Agent] ← waits for all above → risk synthesis
     ↓
[Report Writer Agent] → structured report
```

### Sample Question 5
**Q**: The orchestrator is running all agents sequentially, taking 40 minutes. How do you reduce to 10 minutes?

A) Use a faster model
B) Reduce the depth of each agent's research
C) Run news, financial, and competitor agents in parallel; only risk agent waits
D) Cache previous reports and return them for similar queries

**✅ Correct: C**
**Why**: News, financial, and competitor research are independent — they can run in parallel. Risk analysis depends on the others, so it waits. Parallelizing the independent agents brings total time close to the longest single agent's time.

**❌ Why A is wrong**: Faster model reduces per-call latency marginally. Architecture (serial vs parallel) is the dominant factor.
**❌ Why B is wrong**: Reducing depth solves latency by sacrificing quality.
**❌ Why D is wrong**: Caching works for repeated identical queries. New companies/queries won't cache-hit.

---

### Sample Question 6
**Q**: The competitor agent is hallucinating company names that don't exist. What's the correct architectural fix?

A) Switch to a model with more parameters
B) Add grounding: instruct the agent to only cite companies found in the database or web search results
C) Remove the competitor agent and merge its work into the orchestrator
D) Increase the competitor agent's max_tokens

**✅ Correct: B**
**Why**: Hallucination is a grounding problem. The agent is generating company names from parametric memory instead of from actual retrieved data. Fix: require citations from tool results.

**❌ Why A is wrong**: Larger models still hallucinate without grounding constraints.
**❌ Why C is wrong**: Merging doesn't solve hallucination.
**❌ Why D is wrong**: More tokens gives more room to hallucinate, not less.

---

## Scenario 4: Developer Productivity Tooling

### Setup
An engineering team of 50 wants to use Claude Code daily. They need: consistent code style enforcement, PR review automation, documentation generation, and on-call runbook creation. The team uses GitHub + Java + PostgreSQL.

### Sample Question 7
**Q**: How do you ensure all 50 engineers get consistent Claude Code behavior (same code standards, same PR format)?

A) Each engineer configures their own ~/.claude/CLAUDE.md
B) Publish a shared project-level CLAUDE.md in the repo root, committed to version control
C) Use a shared API key with enforced system prompt
D) Train a custom fine-tuned model on company code

**✅ Correct: B**
**Why**: Project-level CLAUDE.md in version control is the standard pattern. Every engineer who clones the repo automatically gets the same configuration. Updates are reviewed via PR like any other config change.

**❌ Why A is wrong**: Per-engineer configs diverge — defeating the consistency goal.
**❌ Why C is wrong**: System prompt enforcement at API level is possible but not the CLAUDE.md pattern; also doesn't solve local engineer workflows.
**❌ Why D is wrong**: Fine-tuning is expensive, slow, and overkill for behavior configuration.

---

### Sample Question 8
**Q**: The team wants Claude Code to automatically generate on-call runbooks from incident tickets. This should run every time a P1 incident is closed. What's the best implementation?

A) Engineers manually invoke `/generate-runbook` after each incident
B) A GitHub Actions workflow triggers Claude Code headless mode when P1 incidents close
C) A cron job checks for new incidents every hour and runs Claude Code
D) An always-on Claude Code instance watches for incident closures

**✅ Correct: B**
**Why**: Event-driven is better than polling. GitHub Actions trigger on the exact event (P1 incident closed), run `claude -p "Generate runbook for incident #..."`, and commit the result.

**❌ Why A is wrong**: Manual process breaks the "automatic" requirement.
**❌ Why C is wrong**: Polling adds latency (up to 1 hour delay) and wastes compute checking when nothing changed.
**❌ Why D is wrong**: Always-on instances waste resources and are harder to scale/debug.

---

## Scenario 5: CI/CD Automation

### Setup
A DevOps team wants to automate code reviews, security scanning, and deployment validation using Claude. They process 200 PRs/day. Some checks are blocking (security issues), others are advisory (style suggestions). Target: <5 min review per PR.

### Sample Question 9
**Q**: 200 PRs/day with real-time review triggers. After 2 weeks, costs are 3× over budget. What's the first optimization?

A) Switch to a smaller, cheaper Claude model
B) Move non-blocking advisory checks to the Batch API with overnight processing
C) Reduce the number of files reviewed per PR
D) Cache reviews for PRs with no changes

**✅ Correct: B**
**Why**: Blocking (security) checks must be real-time. Advisory (style) checks can wait. Moving advisory checks to Batch API gives 50% cost reduction on that portion. Architectural split by urgency/blocking status is the highest-ROI change.

**❌ Why A is wrong**: A smaller model may miss security issues — unacceptable for blocking checks.
**❌ Why C is wrong**: Partial review means missed issues.
**❌ Why D is wrong**: Very few PRs have truly no changes — cache hit rate would be near zero.

---

### Sample Question 10
**Q**: The security review sometimes returns false positives that block PRs unnecessarily. Engineers are starting to ignore all Claude security warnings. What's the architectural fix?

A) Lower the security check confidence threshold
B) Implement a two-step system: Claude flags candidates, then validates with a second focused pass before blocking
C) Remove blocking behavior and make all findings advisory
D) Use extended thinking mode for security reviews

**✅ Correct: B**
**Why**: Multi-pass review architecture: Pass 1 casts a wide net (high recall, some false positives). Pass 2 focuses on each candidate to confirm. Only confirmed issues block. This maintains security coverage while reducing false positives.

**❌ Why A is wrong**: Lowering threshold increases false positives further.
**❌ Why C is wrong**: Making security advisory defeats the purpose — engineers will ignore it.
**❌ Why D is wrong**: Extended thinking helps reasoning quality but doesn't directly address the classification accuracy problem.

---

## Scenario 6: Data Extraction & Transformation

### Setup
A healthcare company needs to extract structured data from unstructured clinical notes (PDFs). Output: JSON records that feed a compliance reporting database. Volume: 10,000 documents/day. Accuracy requirement: 99.5%.

### Sample Question 11
**Q**: Which output method gives the highest reliability for structured data extraction from clinical notes?

A) Prompt Claude to output JSON with a format description
B) Use few-shot examples showing input note → output JSON
C) Use tool calling with a strict JSON schema matching the database schema
D) Use extended thinking to let Claude reason through extraction

**✅ Correct: C**
**Why**: Tool calling with strict schema enforces the output structure at API level. Clinical data is safety-critical — 99.5% accuracy requires eliminating parse errors. Schema validation at the API level beats prompt-level instructions for reliability.

**❌ Why A is wrong**: Prompt-described JSON has higher variance — Claude can deviate.
**❌ Why B is wrong**: Few-shot improves consistency but doesn't enforce schema at API level.
**❌ Why D is wrong**: Extended thinking helps reasoning but doesn't prevent malformed JSON.

---

### Sample Question 12
**Q**: The system must process 10,000 documents per day. Real-time extraction is not required (end-of-day batch). What's the optimal architecture?

A) Synchronous API calls in a sequential for loop
B) Synchronous API calls with 50 parallel threads
C) Message Batches API with batch submitted nightly, results collected next morning
D) A multi-agent system with 10 worker agents

**✅ Correct: C**
**Why**: 10,000 non-urgent extractions = perfect Batch API use case. 50% cost savings, Anthropic handles parallelization, zero thread management. Submit batch at end of day, retrieve results before morning reporting run.

**❌ Why A is wrong**: Sequential would take hours. 10,000 calls × 1s = ~3 hours. Not production-grade.
**❌ Why B is wrong**: Thread management complexity, rate limit risk, same cost as synchronous.
**❌ Why D is wrong**: Multi-agent coordination overhead for a simple extraction task. Batch API is simpler and cheaper.

---

## Time Pressure Strategy

When unsure, apply this elimination framework:

**Eliminate first**:
1. Answers that add complexity without solving the root cause
2. Answers that sacrifice quality/accuracy for convenience
3. Answers that would be rejected in a production code review

**Choose between remaining**:
- Which answer makes the system more reliable at scale?
- Which answer matches the constraint (latency vs cost vs accuracy)?
- Which answer is the architectural solution, not the workaround?

**The "architect" test**: If a senior engineer saw this decision in a production system, would they approve it or flag it for review?

---

## Cross-Scenario Patterns

These patterns appear across multiple scenarios — learn them well:

| Pattern | Appears In |
|---|---|
| Parallel agents for independent tasks | Research, CI/CD, Data extraction |
| Worktrees for agent isolation | Code generation, any multi-agent |
| Batch API for high-volume, non-urgent | CI/CD advisory, Data extraction, Support |
| External state store for long sessions | Customer support, Code generation |
| Tool use + schema for structured output | Data extraction, Code gen, Support |
| Multi-pass review for accuracy | Security scanning, Data extraction |
| CLAUDE.md for team consistency | Developer productivity, any team |
| Grounding to prevent hallucination | Research, Support KB |

---

## Related Topics
- **Previous**: `05-context-management.md`
- **Next**: `07-decision-frameworks.md`
- **All domain notes**: `01` through `05`
- **Last-day review**: `08-cheat-sheet.md`
