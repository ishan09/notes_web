# Claude Code Configuration & Workflows (Domain 2 — 20%)

> **Before you start**: Do you know what CLAUDE.md is and why it exists? This domain covers Claude Code as a platform for automating engineering workflows.

---

## What Is Claude Code?

Claude Code is Anthropic's AI coding assistant that operates as a CLI tool with deep codebase integration. For architects, it's a **platform** for automating engineering workflows, not just a coding helper.

**Analogy**: Think of Claude Code like a senior engineer you can give a GitHub repo and say "implement this feature, write tests, open a PR." The architect's job is to configure the environment so this engineer can work autonomously and safely.

---

## CLAUDE.md — The Configuration System

### What is CLAUDE.md?

`CLAUDE.md` is the configuration file that gives Claude Code persistent instructions. It's like a project's "employee handbook" — Claude reads it at every session start.

### The Hierarchy (3 levels)

```
~/.claude/CLAUDE.md              ← Global (applies to all projects)
/project-root/CLAUDE.md          ← Project-level (applies to this repo)
/project-root/src/CLAUDE.md      ← Directory-level (applies to this subtree)
```

Claude loads all applicable levels and merges them. **More specific overrides more general.**

### What goes in CLAUDE.md?

```markdown
# Project: Payment Service

## Architecture Overview
- Microservices, each service in /services/<name>/
- Java 21 + Spring Boot 3
- PostgreSQL for persistence

## Coding Standards
- Always add tests for new public methods
- Never commit secrets — use environment variables
- Follow existing error handling patterns in ErrorHandler.java

## Workflow Rules
- Run `./scripts/lint.sh` before committing
- PRs must reference a Jira ticket (format: PAY-1234)

## Off-limits
- Never modify migration files directly
- Never push to main branch directly
```

**Key rule**: CLAUDE.md should encode decisions so Claude doesn't have to ask or guess.

### ❌ vs ✅ CLAUDE.md patterns

❌ Vague:
```markdown
Write good tests.
```

✅ Explicit:
```markdown
Write unit tests for all public methods. Use JUnit 5. Mock external dependencies with Mockito. Test names follow pattern: `methodName_scenario_expectedResult`.
```

---

## Custom Slash Commands & Skills

### What are slash commands?

Custom slash commands let you define reusable workflows that Claude executes on demand.

**Location**: `.claude/commands/<command-name>.md`

**Example: `/review-pr` command**
```markdown
# Review PR

Review the current PR diff and:
1. Check for security vulnerabilities
2. Verify test coverage for changed code
3. Check against CLAUDE.md coding standards
4. Summarize findings in a structured comment
```

Invoke with: `/review-pr`

### What are Skills?

Skills are more powerful — they can include tool use, multi-step logic, and agent invocation patterns. They extend what Claude Code can do beyond simple instruction following.

---

## Plan Mode

**Plan mode** separates the planning and execution phases:

1. Claude analyzes the task and writes a detailed plan
2. Human reviews and approves/edits the plan
3. Claude executes the approved plan

**When to use**:
- Non-trivial features that touch multiple files
- Refactors with high blast radius
- Any task where unexpected scope could cause problems

**Architecture pattern**: For autonomous CI/CD pipelines, run plan mode first, then require human approval before execution — this is the "human in the loop" checkpoint.

```bash
# Manual: plan then execute
claude --plan "implement user authentication"
# Review plan...
claude --execute plan.md
```

---

## Headless Mode — CI/CD Integration

Headless mode runs Claude Code non-interactively, making it suitable for automation pipelines.

```bash
# Basic headless execution
claude -p "Review this PR for security issues and output findings as JSON"

# With output format control
claude -p "Generate unit tests for AuthService.java" --output-format json

# In a GitHub Actions workflow
- name: Claude Code Review
  run: |
    claude -p "Review changed files for bugs and security issues. Output as GitHub PR comment format."
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Key headless flags:**
- `-p` / `--print`: Run in print mode (non-interactive, outputs to stdout)
- `--output-format json`: Structured output for pipeline parsing
- `--no-color`: Clean output for logs
- `--max-turns N`: Limit agent iterations

**Architecture pattern for CI/CD**:
```
Code Push
    ↓
GitHub Actions trigger
    ↓
claude -p "Review changes" --output-format json
    ↓
Parse JSON output
    ↓
Post comment to PR / Block merge if critical issues
```

---

## Batch Processing for Parallelization

Batch processing lets you run multiple Claude Code instances in parallel without linear cost scaling.

**Use case**: Run code review on 50 PRs simultaneously, or generate documentation for 200 functions in parallel.

```python
import anthropic

client = anthropic.Anthropic()

# Create batch of review tasks
requests = [
    {
        "custom_id": f"review-pr-{pr_id}",
        "params": {
            "model": "claude-opus-4-6",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": f"Review PR #{pr_id}: {pr_diff}"}]
        }
    }
    for pr_id, pr_diff in pr_list
]

# Submit batch
batch = client.beta.messages.batches.create(requests=requests)

# Poll for results (or use webhook)
while batch.processing_status != "ended":
    batch = client.beta.messages.batches.retrieve(batch.id)
```

**Cost model**: Batch API offers 50% cost reduction vs synchronous calls. Trade-off: results in up to 24 hours, not real-time.

---

## Worktree Isolation for Parallel Agents

**Problem**: Multiple Claude Code agents working on the same repo simultaneously can conflict on file changes.

**Solution**: Git worktrees — each agent gets its own isolated filesystem copy of the repo.

```bash
# Create isolated worktrees for parallel agents
git worktree add /tmp/agent-feature-a feature-a-branch
git worktree add /tmp/agent-feature-b feature-b-branch
git worktree add /tmp/agent-bugfix-c bugfix-c-branch

# Run agents in parallel, each in their own worktree
claude -p "Implement feature A" --worktree /tmp/agent-feature-a &
claude -p "Implement feature B" --worktree /tmp/agent-feature-b &
claude -p "Fix bug C" --worktree /tmp/agent-bugfix-c &

wait # All complete

# Clean up
git worktree remove /tmp/agent-feature-a
```

**When to use worktrees**:
- Multiple agents working on the same repo simultaneously
- Testing a change without affecting the main workspace
- Parallel feature development

---

## Automated PR Creation Workflows

**Full autonomous workflow**:
```
Issue created in GitHub
    ↓
Webhook triggers CI pipeline
    ↓
Claude Code (headless):
  1. Read issue description
  2. Identify relevant files
  3. Implement changes
  4. Run tests
  5. Commit changes
  6. Open PR with description
    ↓
Human review + merge
```

```bash
# Claude creates PR automatically
claude -p "
Implement the feature described in GitHub issue #${ISSUE_NUMBER}.
After implementation:
1. Run existing tests and fix any failures
2. Commit with message referencing #${ISSUE_NUMBER}
3. Create a PR with title 'feat: [description] (fixes #${ISSUE_NUMBER})'
Include test coverage in the PR
"
```

---

## GitLab / GitHub Actions Integration

### GitHub Actions example:
```yaml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Code Review
        run: |
          claude -p "
          Review the changed files in this PR.
          Check for: security issues, performance problems, missing tests.
          Output as JSON: {issues: [{file, line, severity, description}]}
          " --output-format json > review.json

      - name: Post Review Comment
        run: |
          # Parse and post review.json as PR comment
          python scripts/post_review.py review.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 🧠 Decision Framework

| Situation | Use |
|---|---|
| One-time project config | CLAUDE.md at project root |
| Global personal preferences | CLAUDE.md at `~/.claude/` |
| Reusable workflow | Custom slash command |
| Human approval checkpoint | Plan mode |
| CI/CD automation | Headless mode (`-p`) |
| Multiple agents on same repo | Worktrees |
| Batch non-urgent processing | Batch API (50% cost savings) |
| Real-time response needed | Synchronous API |

### Plan Mode vs Direct Execution

| Factor | Plan Mode | Direct Execution |
|---|---|---|
| Safety | Higher (human approval) | Lower |
| Speed | Slower (review step) | Faster |
| Use when | Risky/broad changes | Safe/scoped changes |
| CI/CD | Include for critical ops | Default for routine |

---

## 🔍 Failure Modes & Debugging

| Failure | Root Cause | Fix |
|---|---|---|
| Agent ignores CLAUDE.md | File not found or malformed | Check hierarchy, validate markdown |
| Headless hangs | Interactive prompt reached | Ensure `-p` flag, avoid interactive tools |
| Worktree conflicts | Race condition on shared files | Enforce one agent per worktree |
| Batch results timeout | Job too large | Split into smaller batches |
| PR has wrong format | CLAUDE.md not explicit enough | Add PR template to CLAUDE.md |
| Agent modifies wrong files | No file scope in CLAUDE.md | Add explicit file boundaries |

---

## ⚖️ Trade-offs

| Choice | Latency | Cost | Control | Complexity |
|---|---|---|---|---|
| Interactive Claude Code | Manual | Per token | High | Low |
| Headless (-p) | Automated | Per token | Medium | Medium |
| Batch API | Hours | 50% less | Low | Medium |
| Worktrees | None added | Storage | Isolation | Medium |
| Plan mode | Slower | Same | Highest | Low |

---

## 📊 Evaluation & Metrics

| Metric | Target |
|---|---|
| PR auto-creation success rate | >90% |
| CI pipeline review time | <5 min per PR |
| CLAUDE.md coverage (% of decisions encoded) | >80% |
| Human intervention rate in autonomous workflows | <15% |
| Worktree merge conflict rate | <5% |

---

## 🔗 Cross-domain Connections

- **→ Agentic Architecture**: Headless mode + worktrees = agentic multi-agent pattern
- **→ Prompt Engineering**: CLAUDE.md is a system prompt at infrastructure level
- **→ Context Management**: Long CI pipelines can hit context limits — use summarization
- **→ Tool Design**: Claude Code integrates tools (bash, file system, git) that follow tool design principles

---

## Claude Code in Large Codebases — The Seven-Layer Harness

> Source: [Anthropic blog — How Claude Code Works in Large Codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start)

Claude Code navigates codebases like a software engineer — traversing the file system, reading files, using grep, and following references. It works on the **live codebase** locally, avoiding the staleness problems of RAG/embedding-based tools. But raw model capability is secondary; the **harness** (configuration infrastructure) determines performance more than the model alone.

### The 7 Layers

| Layer | Purpose | Key Principle |
|---|---|---|
| **CLAUDE.md** | Auto-loaded context every session | Lean & layered (root = big picture, subdirs = local conventions) |
| **Hooks** | Scripts at key lifecycle moments | Use for continuous improvement, not prevention |
| **Skills** | On-demand specialized expertise | Avoid loading everything into CLAUDE.md — causes context bloat |
| **Plugins** | Bundle skills + hooks + MCP configs | Distribute standardized setups across orgs, prevent tribal knowledge |
| **LSP** | Symbol-level precision search | Critical for multi-language codebases; won't auto-configure |
| **MCP Servers** | Connect to internal tools/APIs | Build only after basics (CLAUDE.md, LSP) are working |
| **Subagents** | Separate Claude instances per task | Split exploration from editing — don't do both in same session |

### Three Configuration Patterns

**Pattern 1: Making the Codebase Navigable**
- Initialize Claude in the **relevant subdirectory**, not the repo root
- Scope test/lint commands per subdirectory (avoids timeouts in large monorepos)
- Add `.ignore` files to exclude generated code and build artifacts
- Create codebase maps when directory structure is unclear
- Deploy LSP for typed languages (especially Java, C, C#, C++) — it won't configure itself

**Pattern 2: Active CLAUDE.md Maintenance**
- Review every **3–6 months** or after major model releases
- Instructions written for an older model can actively work against a newer one
- Migrate expertise from CLAUDE.md → Skills as the skill becomes reusable across projects

**Pattern 3: Organizational Ownership**
- Assign a **DRI** (directly responsible individual) before broad rollout
- Establish cross-functional working groups (engineering + security + governance)
- Create curated skill/plugin marketplaces to prevent fragmentation
- Good setups that stay tribal become silos — publish them as plugins

### Common Mistakes

| Component | Mistake | Correct Approach |
|---|---|---|
| CLAUDE.md | Putting reusable expertise directly in it | Move to Skills |
| Hooks | Using prompts for automated tasks | Script it in a hook |
| Skills | Loading everything into CLAUDE.md | Load skills on-demand |
| Plugins | Letting working setups stay tribal | Package and distribute |
| LSP | Assuming it auto-configures | Explicitly set it up |
| MCP | Building connections before basics work | Get CLAUDE.md + LSP right first |
| Subagents | Mixing exploration + editing in one session | Dedicated subagent for mapping, another for editing |

### Key Insight for Architects
> "The ecosystem built around the model — the harness — determines how Claude Code performs more than the model alone."

This reframes the architect's job: less about prompt quality, more about **infrastructure design** — layered CLAUDE.md files, LSP integration, hooks for capture/feedback, and skills for context efficiency.

---

## Quick Check

1. Where does a global CLAUDE.md go? (`~/.claude/CLAUDE.md`)
2. What flag runs Claude Code non-interactively? (`-p`)
3. What's the cost advantage of Batch API? (50% cheaper, but up to 24h delay)
4. Why use worktrees? (Isolate parallel agents on same repo)
5. What does plan mode add? (Human review checkpoint before execution)

---

## Interview / Exam Questions

**Q: You want to run Claude Code reviews on 500 PRs overnight. What's the best approach?**
A: Use the Batch API — 50% cost reduction, async processing. Set up the batch before end of day, poll for results in the morning. Don't use synchronous calls (cost inefficient) or sequential processing (too slow).

**Q: Two Claude Code agents are modifying the same repo and causing conflicts. What should you do?**
A: Use git worktrees to give each agent an isolated filesystem view of the repo. Each agent works on its own branch in its own worktree, then PRs are reviewed and merged independently.

**Q: A developer wants Claude Code to always add Jira ticket references to commits. How do you configure this?**
A: Add it to the project's CLAUDE.md: "All commit messages must include a Jira ticket reference in format PAY-XXXX." Claude reads this at every session start and follows it throughout.

---

## ⚡ Cheat Sheet

```
CLAUDE.md HIERARCHY:
  ~/.claude/CLAUDE.md → global
  /project/CLAUDE.md → project
  /project/dir/CLAUDE.md → directory
  More specific = higher priority

HEADLESS: claude -p "task" --output-format json

BATCH: 50% cost savings, up to 24h delay

WORKTREES: One agent per worktree for isolation

PLAN MODE: Use for risky, broad, or critical changes

KEY METRICS:
  - PR success rate > 90%
  - Human intervention < 15%
  - Pipeline time < 5 min/PR
```

---

## Related Topics
- **Prerequisite**: Git basics, CI/CD concepts, Claude API
- **Previous**: `01-agentic-architecture.md`
- **Next**: `03-prompt-engineering.md`
- **Related**: `07-decision-frameworks.md` (when to use which approach)
- **Deep dive**: `09-hooks-and-plugins.md` (hooks lifecycle, all 5 handler types, plugin creation step-by-step)
