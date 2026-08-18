# 07 — Claude Code

> **Domain mapping:** Domain 3 — *Claude Code Configuration & Workflows* — **20%**, the second-heaviest domain.
> The blueprint names: **CLAUDE.md hierarchy**, **`.claude/rules/`**, **skills**, **hooks**, **permissions**,
> **custom slash commands**, **plan mode**, **CI/CD integration**, **persistent project context**, and
> **iterative refinement**.
>
> Candidates under-study this because it looks like "tooling". It is not: *choosing between CLAUDE.md, rules,
> skills, hooks and permissions for a given requirement is a configuration-architecture decision with a right
> answer.* That decision is the heart of Domain 3.
>
> Everything here is **[Claude Code-specific]** unless stated otherwise.

---

## 7.1 Fundamentals

### 7.1.1 What Claude Code is

Claude Code is an **agentic coding harness**: a client that runs the agent loop (§09.2) with a built-in tool set
over your filesystem, shell and git, plus a configuration system for instructions, permissions and automation.
It runs in the terminal, in IDE extensions, in a desktop app, on the web, and headlessly in CI.

The same harness is available as a library — the **Claude Agent SDK** (`claude-agent-sdk` for Python,
`@anthropic-ai/claude-agent-sdk` for TypeScript): built-in tools, agent loop, context management, hooks,
subagents, permissions, sessions, skills, commands and plugins, driven by `query(prompt, options)`.

**Positioning (this comparison is examinable):**

| Surface | You get | You host | Use when |
|---|---|---|---|
| **Claude Code CLI** | Interactive terminal agent | — | Daily development, one-off tasks |
| **Claude Agent SDK** | Claude Code as a library (harness + built-in tools) | **Yes** | A coding/filesystem agent in your own product |
| **Claude API + Tool Runner** | The loop over *your* tools only — no built-in tools, no sandbox | **Yes** | A custom-tool agent |
| **Claude API — manual loop** | Nothing; you write the loop | **Yes** | You need control the runner does not expose |
| **Managed Agents** | Anthropic runs the loop **and** hosts a per-session sandbox | No | Long-running/scheduled agents without your own infra |

Only Managed Agents supplies **both** harness *and* deployment. The other three are harness-only.

### 7.1.2 The loop and context gathering

Claude Code does not index your repository ahead of time. It **explores on demand** — `Glob` for structure,
`Grep` for symbols, `Read` for the files that matter — and this is deliberate: the context is assembled fresh
for the task rather than retrieved from a stale index.

The practical consequence for you: **the quality of the agent's output is dominated by the quality of the
context it gathers**, which is why plan mode, CLAUDE.md and subagent delegation exist.

### 7.1.3 What loads at session start

| Item | Notes |
|---|---|
| System prompt | Core behaviour; you never see it |
| Auto memory (`MEMORY.md`) | First **200 lines or 25KB**, whichever comes first |
| Environment info | cwd, platform, OS, git status |
| CLAUDE.md hierarchy | Ancestor files in full; subdirectory files on demand |
| `.claude/rules/*.md` | Unscoped rules at launch; path-scoped rules when a matching file is read |
| Skill **descriptions** | Bodies load only when invoked |
| MCP tool **names** | Schemas deferred by default (tool search) |
| Output style / `--append-system-prompt` | Into the system prompt |

Run `/context` in a session to see the live breakdown. This is the single best debugging command for "why is
Claude not following my instructions" — if a file is not listed under **Memory files**, Claude cannot see it.

---

## 7.2 Claude Code context

**Working directories.** Read-only operations are allowed without prompting inside the working directory and
any `additionalDirectories` (added with `--add-dir`, `/add-dir`, or the setting). Everything outside is a
boundary.

**Git.** Claude Code reads branch, status and recent commits at session start. Git is also where verification
lives: `git diff` is how you check what the agent actually did.

**`/compact`, `/clear`, `/context`.** Context management commands — see §7.10.

---

## 7.3 CLAUDE.md and `.claude/rules/` — persistent project context

### 7.3.1 The hierarchy **[explicitly tested]**

Files load **broadest scope first**, so more specific instructions appear later in context:

| Scope | Location | Purpose | Shared with |
|---|---|---|---|
| **Managed policy** | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux/WSL `/etc/claude-code/CLAUDE.md`; Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | Org-wide instructions | Everyone on the machine |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences, all projects | Just you |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions | Team, via version control |
| **Local** | `./CLAUDE.local.md` | Personal project preferences | Just you — **gitignore it** |

**Resolution rules to memorise:**

- Claude Code **walks up the directory tree** from the cwd, collecting `CLAUDE.md` and `CLAUDE.local.md` at each
  level. All discovered files are **concatenated, not overridden**.
- Ordering is **filesystem root → cwd**, so instructions closest to where you launched are read *last*.
- Within a directory, `CLAUDE.local.md` is appended **after** `CLAUDE.md`.
- **Subdirectory** `CLAUDE.md` files are **not** loaded at launch — they load when Claude reads a file in that
  subdirectory. (This is the mechanism monorepos rely on.)
- Managed policy CLAUDE.md **cannot be excluded** by user settings. `claudeMdExcludes` (glob patterns against
  absolute paths, merged across settings layers) skips other teams' files in a monorepo.
- The `claudeMd` key in **managed settings** embeds managed CLAUDE.md content inline; honoured only in managed
  and policy settings.

### 7.3.2 What belongs in CLAUDE.md — and what does not

CLAUDE.md is loaded into context **every session**, so it is a standing token cost and a standing attention cost.

| ✅ Belongs | ❌ Does not belong |
|---|---|
| Build/test/lint commands | Anything Claude can derive by reading the code |
| Project layout ("API handlers live in `src/api/handlers/`") | Full directory listings |
| Conventions that differ from tool defaults | Generic best practices ("write clean code") |
| Pitfalls and non-obvious constraints | Long architecture essays |
| "Always do X" rules | Multi-step procedures → make it a **skill** |
| | Instructions that only matter for one subtree → **path-scoped rule** |
| | Anything that must be *enforced* → **hook or permission rule** |
| | Secrets, credentials, internal hostnames |

**Size target: under 200 lines.** Longer files consume more context and *reduce* adherence. `/doctor` proposes
trims: it cuts content derivable from the codebase (directory layouts, dependency lists) and keeps pitfalls,
rationale and conventions.

### 7.3.3 The critical caveat **[commonly tested]**

> CLAUDE.md content is delivered as a **user message after the system prompt** — it is *context, not enforced
> configuration*. Claude reads it and tries to follow it. There is **no guarantee of compliance**, especially
> for vague or conflicting instructions.

Therefore: **if a rule must hold, it is a hook or a permission rule, not a CLAUDE.md line.** This is the same
instruction-hierarchy argument as §2.3.2, and Anthropic's own documentation states it explicitly:

| Concern | Configure in |
|---|---|
| Block specific tools, commands, or file paths | Managed settings `permissions.deny` |
| Enforce sandbox isolation | `sandbox.enabled` |
| Environment variables, provider routing | Managed settings `env` |
| Code style and quality guidance | CLAUDE.md |
| Behavioural instructions | CLAUDE.md |

### 7.3.4 Imports

`@path/to/file` imports another file into CLAUDE.md. Relative paths resolve **relative to the importing file**.
Recursive imports allowed, **max depth 4**. Import parsing skips code spans and fenced blocks — write
`` `@README` `` to mention a path without importing it.

**Important cost note:** imports help *organisation*, not context size — imported files load in full at launch.

**External imports** (paths resolving outside the working directory, e.g. `@~/.claude/my-notes.md`) trigger a
one-time approval dialog the first time Claude Code sees them in a project — a defence against files other
people commit to a shared repo. Imports in *user-scope* memory files load without the dialog.

**`AGENTS.md`:** Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repo uses `AGENTS.md`, create a
`CLAUDE.md` containing `@AGENTS.md` (plus any Claude-specific additions below it), or symlink.

### 7.3.5 `.claude/rules/` — modular, optionally path-scoped

```
your-project/
├── CLAUDE.md                    # short: build commands, layout, key conventions
└── .claude/
    └── rules/
        ├── testing.md           # no frontmatter → loads every session
        ├── api-design.md
        └── frontend/
            └── react.md
```

Rules are discovered **recursively**. Rules **without** `paths:` frontmatter load at launch with the same
priority as `.claude/CLAUDE.md`. Rules **with** `paths:` load only when Claude reads a matching file:

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---

# API rules
- Every endpoint validates input with the shared Zod schemas in `src/schemas/`.
- Errors use the `ApiError` envelope; never return a bare string.
- Add an OpenAPI comment block above each handler.
```

Details worth knowing: glob patterns support brace expansion with a bounded budget (1,000 expanded patterns /
4 MiB per rule); a `[` that cannot be read as a bracket expression makes that one pattern match nothing (escape
it as `\[`); user-level rules live in `~/.claude/rules/` and load **before** project rules, giving project rules
higher priority; `.claude/rules/` supports symlinks so you can share a rule set across repos.

**Why path-scoped rules are the right answer for monorepos:** they keep the always-on context small while
delivering the right instructions exactly when they matter. The alternative — one giant CLAUDE.md — pays for
every team's conventions on every request and degrades adherence for all of them.

### 7.3.6 Auto memory

Claude writes its own notes across sessions to `~/.claude/projects/<project>/memory/`, with a `MEMORY.md` index
(first **200 lines / 25KB** loaded each session) and topic files loaded on demand.

| | CLAUDE.md | Auto memory |
|---|---|---|
| Written by | You | Claude |
| Contains | Instructions and rules | Learnings and discovered patterns |
| Scope | Project / user / org | Per repository (shared across worktrees) |
| Configure | Files in the repo | `autoMemoryEnabled`, `autoMemoryDirectory` |

It is machine-local and not shared across machines. Subagents do **not** inherit the main conversation's auto
memory (except forks); a subagent can have its own via the `memory` field.

### 7.3.7 What survives `/compact` **[Domain 5 relevant]**

| Mechanism | After compaction |
|---|---|
| System prompt, output style | Unchanged (not in message history) |
| **Project-root CLAUDE.md and unscoped rules** | **Re-injected from disk** |
| Auto memory | Re-injected from disk |
| **Rules with `paths:` frontmatter** | **Lost** until a matching file is read again |
| **Nested CLAUDE.md in subdirectories** | **Lost** until a file there is read again |
| Invoked skill bodies | Re-injected, capped 5,000 tokens/skill, 25,000 total, oldest dropped first |
| Hooks | N/A — hooks are code, not context |

**The design consequence:** *if an instruction must survive a long session, put it in the project-root CLAUDE.md
or an unscoped rule — not in a path-scoped rule or a nested CLAUDE.md.* This is a precise, memorisable fact and
exactly the kind of thing Domain 3 tests.

---

## 7.4 Tools

Built-in: `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `WebFetch`, `WebSearch`, `Agent` (subagents),
`Skill`, `TaskCreate`/`TaskUpdate`, `NotebookEdit`, plus MCP tools as `mcp__server__tool`.

Notes that matter architecturally:

- **Read-only tools within the working directory do not prompt.** Bash prompts except for a built-in read-only
  set (`ls`, `cat`, `grep`, `find`, `head`, `tail`, `wc`, `which`, `diff`, `stat`, `du`, `cd`, read-only `git`
  forms…). That set is **not configurable** — to require a prompt for one of them, add an `ask` or `deny` rule.
- **Compound commands are parsed.** `Bash(safe-cmd *)` does **not** authorise `safe-cmd && rm -rf /`. Separators
  recognised: `&&`, `||`, `;`, `|`, `|&`, `&`, newlines. Each subcommand must match a rule independently.
- **Wrappers are stripped** before matching (`timeout`, `time`, `nice`, `nohup`, `stdbuf`, `command`, `builtin`,
  `noglob`, bare `xargs`), so `Bash(npm test *)` matches `timeout 30 npm test`. But **environment runners are
  not** — `devbox run`, `npx`, `docker exec`, `mise exec` execute their arguments, so `Bash(devbox run *)`
  authorises `devbox run rm -rf .`. Write `Bash(devbox run npm test)` instead.

---

## 7.5 Permissions **[explicitly tested]**

### 7.5.1 Modes

| Mode | Behaviour |
|---|---|
| `default` (a.k.a. *Manual*) | Prompts on first use of each tool |
| `acceptEdits` | Auto-accepts file edits and common fs commands (`mkdir`, `touch`, `mv`, `cp`) in the working directory |
| `plan` | Read-only exploration; does not edit source files |
| `auto` | Auto-approves with **background safety checks** that verify actions align with your request |
| `dontAsk` | **Auto-denies** anything not pre-approved via `permissions.allow` |
| `bypassPermissions` | Skips prompts except for actions no mode auto-approves. **Isolated environments only.** |

Set the starting mode with `defaultMode`. Organisations can forbid the risky ones with
`permissions.disableBypassPermissionsMode` / `disableAutoMode` set to `"disable"` in **managed settings**, where
they cannot be overridden.

### 7.5.2 Rule evaluation — **memorise this**

> Rules are evaluated **deny → ask → allow**. The **first match in that order** wins.
> **Specificity does not change the order.**

Consequences:
- A broad `deny` like `Bash(aws *)` blocks calls that also match a narrower `allow` like `Bash(aws s3 ls)`.
  **A deny rule cannot carry allowlist exceptions.**
- A matching `ask` prompts even when a more specific `allow` also matches.

**Bare tool name vs scoped rule:** a bare `deny` of `Bash` **removes the tool from Claude's context entirely** —
Claude never sees it. A scoped rule like `Bash(rm *)` leaves the tool available and blocks matching calls.

### 7.5.3 Rule syntax

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Bash(git commit *)", "Read(src/**)",
              "WebFetch(domain:docs.internal.example.com)",
              "mcp__github__get_*"],
    "ask":   ["Bash(git push *)"],
    "deny":  ["Bash(curl *)", "Bash(rm -rf *)", "Read(.env)", "Read(**/*.pem)",
              "Edit(/infra/**)", "mcp__*", "Agent(Explore)"]
  }
}
```

Details that decide questions:

- **Bash wildcards** match at any position. A trailing ` *` enforces a word boundary: `Bash(ls *)` matches
  `ls -la` but not `lsof`; `Bash(ls*)` matches both. `Bash(ls:*)` is equivalent to `Bash(ls *)`.
- **Read/Edit** use **gitignore** pattern syntax with four anchors: `//abs`, `~/home`, `/settings-source-relative`,
  and `relative`. **A single leading slash is *not* absolute** — it anchors to the settings source. Use `//` for
  filesystem-absolute.
- A relative single-segment directory pattern behaves differently by rule type: `Edit(src/**)` as an **allow**
  matches only `<cwd>/src`; as a **deny/ask** it matches a `src` directory at **any depth**. (Deny rules are
  deliberately broader.)
- `Edit` rules cover all file-editing tools; `Read` rules are best-effort across Grep/Glob/`@file` mentions. A
  `Read` deny also blocks Edit and Write on that path. Writing a path rule for `Write`, `Glob` or `NotebookEdit`
  is accepted but **never consulted** — use `Edit(...)` and `Read(...)`.
- **Parameter matching**: `Tool(param:value)` for deny/ask only (e.g. `Agent(model:opus)`,
  `Bash(run_in_background:true)`). You cannot match a tool's primary content field this way —
  `Bash(command:rm *)` is ignored with a startup warning because a compound command would bypass it.
- **WebFetch** uses `domain:`; `*.example.com` matches subdomains but not the apex; a mid-position `*` matches
  only within one dot-segment.
- **Symlinks**: allow rules require **both** the symlink and its target to match; deny rules fire if **either**
  matches.

### 7.5.4 Settings files and precedence

```
managed policy  >  --settings file  >  local (.claude/settings.local.json)
                >  project (.claude/settings.json)  >  user (~/.claude/settings.json)
```

`.claude/settings.json` is committed and shared; `.claude/settings.local.json` is personal and gitignored, and
is where "Yes, don't ask again" writes Bash rules (saved at the git repository root as of recent versions, so
the approval applies across subdirectories and worktrees).

### 7.5.5 Sandboxing and the enforcement line

**Read/Edit deny rules apply to Claude's file tools and to file commands Claude Code recognises in Bash
(`cat`, `head`, `tail`, `sed`). They do NOT apply to arbitrary subprocesses** — a Python script the agent writes
can open any file. For **OS-level enforcement across all processes**, enable the sandbox
(`sandbox.enabled`).

> **This is the sharpest expression of the whole permission philosophy:** permission rules constrain *Claude*;
> sandboxing constrains *the machine*. If your threat model includes a subprocess the agent writes, you need
> the sandbox.

Bash URL filtering is explicitly documented as fragile: `Bash(curl http://github.com/ *)` misses
`curl -X GET …`, `https://`, redirects, and `URL=… && curl $URL`. The recommended pattern is: **deny `curl` and
`wget`, allow `WebFetch(domain:...)`, and back it with egress control** — plus a PreToolUse hook if you need
custom validation.

---

## 7.6 Hooks — the enforcement layer **[explicitly tested, incl. as D1 "orchestration-layer safeguards"]**

### 7.6.1 What hooks are

Hooks are **shell commands (or HTTP/MCP/agent callbacks) that Claude Code executes at fixed lifecycle events**.
Unlike CLAUDE.md, they run **regardless of what Claude decides**. They are how you turn "please always" into
"always".

### 7.6.2 The events you must know

There are many events; these are the load-bearing ones:

| Event | Fires | Can block? | Typical use |
|---|---|---|---|
| **SessionStart** | Session begins/resumes | No | Inject env context; start services |
| **UserPromptSubmit** | Before Claude sees the prompt | **Yes** | Block secrets in prompts; inject context |
| **PreToolUse** | Before a tool executes | **Yes** | **Policy gate** — validate args, allow/deny/escalate |
| **PostToolUse** | After a tool succeeds | Adds context | Auto-format, lint, run tests after an edit |
| **PostToolUseFailure** | After a tool fails | Adds context | Enrich the error the model sees |
| **PostToolBatch** | After a batch of parallel calls resolves | **Yes** | Stop the agentic loop before the next model call |
| **PermissionRequest** | A call needs a decision | Decides | Programmatic approval routing |
| **Stop** / **SubagentStop** | Turn/subagent finishes | **Yes** | Verification gate — refuse to stop until tests pass |
| **PreCompact** / **PostCompact** | Around compaction | Pre: yes | Persist state before summarisation |
| **SubagentStart** | Subagent spawned | No | Audit/tracing |
| **Elicitation** | MCP server requests input | **Yes** | Auto-respond to elicitation |
| **InstructionsLoaded** | A CLAUDE.md / rule file loads | No | **Debug which instructions actually loaded** |
| **SessionEnd** | Session terminates | No | Cleanup, ship logs |

### 7.6.3 Contract: exit codes and JSON

Input arrives as **JSON on stdin** (`session_id`, `transcript_path`, `cwd`, `permission_mode`,
`hook_event_name`, plus event-specific fields like `tool_name` / `tool_input`).

**Exit codes:**

| Code | Meaning |
|---|---|
| `0` | Success. If stdout starts with `{`, it is parsed as JSON and decision fields are honoured. For `UserPromptSubmit`, `UserPromptExpansion` and `SessionStart`, plain-text stdout is **added as context Claude can see**. For most other events stdout goes to the debug log only. |
| `2` | **Blocking error.** The action is blocked. The message shown comes from the JSON `reason` field, otherwise stderr. |
| other | Non-blocking error; valid JSON decision fields are still honoured. |

**Structured output:**

```json
{
  "continue": true,
  "systemMessage": "Shown to the user",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow" | "deny" | "escalate",
    "permissionDecisionReason": "why",
    "additionalContext": "extra text for Claude"
  }
}
```

`continue: false` stops processing entirely and takes precedence over event-specific decisions.
Timeouts: 600s for `command`/`http`/`mcp_tool`, 30s for `prompt` and for `UserPromptSubmit` hooks, 60s for
`agent`. **A timed-out command hook does not block** — the action proceeds. Design accordingly: a policy gate
that silently times open is a security hole, so keep gates fast and fail-closed inside the script.

### 7.6.4 Worked example: a deterministic policy gate

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",
        "hooks": [{ "type": "command", "command": ".claude/hooks/guard-bash.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": ".claude/hooks/format-and-lint.sh" }] }
    ]
  }
}
```

```bash
#!/usr/bin/env bash
# .claude/hooks/guard-bash.sh — blocks writes to production infrastructure
set -euo pipefail
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

if printf '%s' "$CMD" | grep -qE '\b(terraform apply|kubectl .*(delete|apply).*prod|aws .* --profile prod)\b'; then
  echo "Blocked: production infrastructure changes require the release pipeline." >&2
  exit 2                      # exit 2 = block
fi
exit 0
```

**Why this beats a CLAUDE.md line saying "never touch prod":** it is enforced, it is auditable, it is testable
in CI, and it works no matter what an injected document tells the model.

### 7.6.5 Hooks as orchestration-layer safeguards **[D1]**

The blueprint frames PreToolUse/PostToolUse hooks as *orchestration-layer safeguards*. Concretely, hooks give an
agentic system:

- **A gate the model cannot argue with** (PreToolUse deny).
- **Automatic verification** (PostToolUse runs the formatter/tests, feeding failures back as context).
- **A termination guard** (Stop hook exits 2 to refuse to end until the acceptance criteria pass).
- **A loop breaker** (PostToolBatch exits 2 to stop the loop before the next model call).
- **An audit trail** independent of the model's narration.

### 7.6.6 Hook security

Hooks execute with **your** privileges. Treat `.claude/settings.json` hooks as executable code: they run before
you trust a folder only under the workspace-trust rules, they must be reviewed like any script, they must quote
variables, and they must never `eval` model-supplied strings.

---

## 7.7 MCP integration in Claude Code

Covered in §06.6. The Claude Code-specific essentials:

- Scopes **local / project / user**, precedence local → project → user → plugin → connector.
- `.mcp.json` with `${VAR}` / `${VAR:-default}` expansion.
- Tools appear as `mcp__server__tool`; permissions use that naming.
- **Tool search is on by default** — only names and server instructions load; schemas are fetched on demand.
- Project-scope servers require approval interactively; **non-interactive contexts cannot prompt** — use
  `disabledMcpjsonServers` or `--setting-sources` in CI.
- Output limits: warn >10K tokens, cap 25K (`MAX_MCP_OUTPUT_TOKENS`).

---

## 7.8 Workflows **[explicitly tested: plan mode, slash commands, iterative refinement, CI/CD]**

### 7.8.1 Plan mode

`plan` mode is read-only exploration: Claude investigates and proposes a plan without editing source. You
approve before anything changes.

**Use it when** the change is large, the codebase is unfamiliar, the blast radius is significant, or you want to
review the approach before paying for the implementation. The economic argument is real: a wrong plan wastes an
entire implementation run, and reviewing a plan is far cheaper than reviewing a diff.

### 7.8.2 The canonical workflow

```
1. EXPLORE   (plan mode, or an Explore subagent)  → understand before changing
2. PLAN      → an explicit, reviewable plan
3. IMPLEMENT → small, verifiable increments
4. VERIFY    → tests / lint / typecheck (ideally a PostToolUse hook, not a request)
5. REVIEW    → git diff, then a code-review subagent or a human
6. COMMIT    → conventional message; push only when asked
```

**Iterative refinement** — the blueprint's phrase — is steps 3–4 in a tight loop with *automated verification*.
The insight worth internalising: an agent with a **verifier** (tests, types, linters, a compiler) is dramatically
more reliable than one without, because it can detect and correct its own errors. Providing a fast, reliable
verifier is the highest-leverage thing you can do for an agentic coding system.

### 7.8.3 Custom slash commands

Markdown files that expand into prompts:

```
.claude/commands/            # project, shared via git
~/.claude/commands/          # personal
```

```markdown
---
description: Review the current diff against our security checklist
allowed-tools: Read, Grep, Glob, Bash(git diff *)
---

Review the staged diff for:
1. Input validation on every new endpoint
2. Authorisation checks on every data access
3. Secrets or credentials in code or config
4. SQL built by string concatenation

Report findings as a table: file:line | severity | issue | fix.
If there are no findings, say so explicitly.
```

Invoke with `/security-review`. Arguments are available inside the command body.

**Command vs skill vs subagent — a decision that is very likely to be tested:**

| Use | When |
|---|---|
| **Slash command** | A prompt *you* invoke deliberately, every time, in the main context |
| **Skill** | A capability *Claude* should load when relevant, without you asking |
| **Subagent** | Work that needs its **own context window**, its own tool restrictions, or parallelism |

### 7.8.4 Skills

A skill is a folder with `SKILL.md` (YAML frontmatter: `name`, `description`) plus optional supporting files.
The **description sits in context by default**; the **body loads only when the skill is invoked or Claude judges
it relevant**. That is the whole point: capability without permanent context cost.

Use a skill for a **multi-step procedure** ("how we cut a release", "how we write migrations") rather than
putting it in CLAUDE.md, which pays for it every session.

Remember the compaction behaviour: invoked skill bodies are re-injected after compaction but **truncated to
5,000 tokens per skill / 25,000 total, keeping the start of the file** — so put the most important instructions
at the top of `SKILL.md`.

### 7.8.5 Headless mode and CI/CD **[explicitly tested]**

```bash
claude -p "Review the diff on this PR for security issues and post findings" \
  --output-format stream-json \
  --allowedTools "Read,Grep,Glob,Bash(git diff *)" \
  --permission-mode dontAsk
```

Design rules for CI:

| Rule | Why |
|---|---|
| **Never `bypassPermissions` in CI with repo credentials** | An injected PR description would run with your token |
| **Prefer `dontAsk` + explicit `allow` rules** | Deny-by-default; nothing unexpected runs |
| **Scope tools to the job** | A review job needs no write tools |
| **Treat PR titles, descriptions, and diffs as untrusted** | They are attacker-controlled on public repos |
| **Bound cost and time** | Max turns, job timeout, budget alerts |
| **Structured output** | `--output-format stream-json` so the pipeline can parse results |
| **Control MCP loading** | Non-interactive sessions cannot prompt for project-scope approval |
| **Ephemeral, least-privilege credentials** | Short-lived tokens, no production access |

The `system/init` event in `stream-json` reports `mcp_server_errors`, so scripts can detect a server that never
loaded — use it rather than assuming your tools are present.

**Common CI applications:** PR review, test generation for uncovered code, changelog/release notes, migration
sweeps ("update this deprecated API across 200 files"), triaging failing tests, documentation generation.

---

## 7.9 Agentic patterns: subagents **[D1 + D3]**

### 7.9.1 What a subagent is

A subagent is a **separate agent with its own context window**, spawned by the main agent for a scoped task,
returning only a summary.

```
main context (yours)
   │  "investigate why checkout is slow"
   ├──▶ Explore subagent ─── reads 40 files, 60K tokens ──▶ returns 800-token summary
   │                          (those 60K tokens never enter your context)
   └──▶ continue with the summary
```

**The primary benefit is context isolation, not parallelism.** Verbose exploration stays out of the main
conversation, so the main agent keeps room for the actual work.

### 7.9.2 Definition

```markdown
---
name: db-reader
description: Runs read-only analytical queries against the reporting database
tools: Read, Grep, Bash
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
maxTurns: 10
effort: medium
memory: project
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You run read-only analytical queries. Never modify data. Return results as a markdown
table plus a one-paragraph interpretation.
```

Discovery precedence: **managed settings → `--agents` CLI flag → `.claude/agents/` → `~/.claude/agents/` →
plugin `agents/`**.

Fields worth knowing: `tools` (allowlist) / `disallowedTools` (denylist), `model`
(`sonnet|opus|haiku|fable|inherit|full-id`), `permissionMode`, `maxTurns`, `skills` (preloaded),
`mcpServers`, `hooks`, `memory` (`user|project|local`), `effort`, `isolation: worktree`, `background`,
`initialPrompt`. You can also restrict which subagents it may spawn: `tools: Agent(worker, researcher), Read`.

### 7.9.3 What a subagent inherits — and what it does not

**Loads:** its own system prompt (not the full Claude Code one), the delegation task message, the CLAUDE.md
hierarchy, a git-status snapshot, preloaded skills, and a roster of sibling agents for messaging.

**Does NOT load:** conversation history, output style, the main conversation's auto memory, previous skill
invocations.

**Forks** (`/subtask`) are the exception: a fork inherits the entire conversation, the same system prompt and
the same tools, and shares the prompt cache — cheaper but less isolated.

| | Fork | Non-fork subagent |
|---|---|---|
| Context | Full conversation | Fresh |
| System prompt | Same as main | From its definition |
| Tools | Same as main | From its definition |
| Cache | Shared | Separate |

### 7.9.4 When to use subagents

**Use** when: output is verbose (logs, test results, wide searches); you want enforced tool restrictions; the
work is self-contained and summarisable; or you want parallel independent investigations.

**Do not use** when: the task needs frequent back-and-forth; phases share substantial context; the change is
small and targeted; or latency is critical (spawning costs a full context setup).

Nested subagents are allowed (default depth 3, configurable via `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`).
`isolation: worktree` gives a subagent a temporary git worktree — genuine filesystem isolation for parallel
work on the same repo.

### 7.9.5 Verification

The pattern that raises reliability most: **a separate agent verifies the first agent's work.** A reviewer
subagent with read-only tools and a different prompt catches errors the author is blind to — the same reason
humans do code review. Pair it with a Stop hook that refuses to finish until tests pass, and you have a
closed loop.

---

## 7.10 Context management commands **[D5]**

| Command | Effect |
|---|---|
| `/context` | Live breakdown of what is in the context window, by category |
| `/compact [focus]` | Summarise now, optionally with a focus (`/compact focus on the auth bug`) |
| `/autocompact <tokens>` | Set how full the window gets before automatic compaction |
| `/clear` | Wipe the conversation — use when switching to unrelated work |
| `/memory` | Browse/edit CLAUDE.md, CLAUDE.local.md and auto memory; toggle auto memory |
| `/doctor` | Configuration checkup, including proposed CLAUDE.md trims |
| `/permissions` | View and edit permission rules, showing which settings file each came from |
| `/mcp` | Server status, auth, enable/disable |

**Practical guidance:** `/clear` between unrelated tasks is the cheapest performance improvement available —
old conversation crowds out the files you need next and is re-billed on every message. Delegate large reads to
subagents. Compact *with a focus* before starting a long new phase rather than letting the automatic pass guess.

---

## Key takeaways

- **CLAUDE.md is context, not enforcement.** Hooks and permission rules are enforcement. This distinction drives
  most Domain 3 answers.
- Hierarchy: managed → user → project → local, concatenated, root→cwd, `CLAUDE.local.md` last within a
  directory. Subdirectory files load **on demand**.
- Target &lt;200 lines. Procedures → skills. Path-specific instructions → `.claude/rules/` with `paths:`.
  Must-enforce → hooks/permissions.
- **After compaction**, project-root CLAUDE.md and unscoped rules are re-injected; **path-scoped rules and
  nested CLAUDE.md are lost** until re-triggered.
- Permissions evaluate **deny → ask → allow**, first match wins, specificity irrelevant. A bare-name deny
  removes the tool from context.
- Permission rules constrain Claude; **sandboxing constrains the machine** (subprocesses bypass Read/Edit rules).
- Hooks are shell commands at lifecycle events; exit 2 blocks; PreToolUse is the policy gate; Stop is the
  verification gate.
- Subagents exist primarily for **context isolation**; forks inherit everything and share the cache.
- CI: `dontAsk` + explicit allows, scoped tools, untrusted PR content, bounded cost — never `bypassPermissions`
  with real credentials.

## Things to memorise

- The four CLAUDE.md scopes and their exact paths.
- The compaction survival table.
- `deny → ask → allow`, first match wins.
- `//abs` vs `/settings-relative` in Read/Edit patterns.
- Hook exit codes 0 / 2 / other, and which events can block.
- Subagent frontmatter fields and what a subagent does *not* inherit.
- MCP scopes and precedence.

## Common mistakes

- Writing a security rule in CLAUDE.md and believing it is enforced.
- Expecting a deny rule to have allowlist exceptions.
- Using `/path` when you meant filesystem-absolute (`//path`).
- Assuming path-scoped rules survive compaction.
- Putting a long procedure in CLAUDE.md instead of a skill.
- Running CI in `bypassPermissions` with repository write credentials.
- Assuming `Bash(devbox run *)` is safe (environment runners are not stripped wrappers).
- Using a subagent for a small, chatty, iterative change.

---

## Scenario questions

**Q1.** A monorepo has 8 teams. The root CLAUDE.md has grown to 900 lines. Claude ignores many instructions and
each session starts with heavy context use. Redesign.

<details><summary>Answer</summary>

Two problems: **attention dilution** (900 lines reduces adherence) and **standing context cost** paid by every
session in every team.

Redesign:
1. **Root CLAUDE.md ≤200 lines** — only what every team needs every session: build/test commands, repo layout,
   cross-cutting conventions.
2. **`.claude/rules/` with `paths:` frontmatter** per team/area (`services/payments/**`, `web/**`). These load
   only when Claude touches matching files — the mechanism designed for exactly this.
3. **Nested `CLAUDE.md`** in each package for package-specific facts; loaded on demand when Claude reads there.
4. **Multi-step procedures → skills** (release process, migration authoring), which load only when relevant.
5. **Must-enforce rules → hooks/permissions** (e.g. a PreToolUse hook blocking edits to `infra/` from
   non-infra work).
6. `claudeMdExcludes` in `.claude/settings.local.json` so an engineer working in `web/` skips other teams'
   ancestor files.
7. Run `/doctor` to trim content derivable from the codebase, and `/context` to verify what actually loads.

**Critical caveat to state:** path-scoped rules and nested CLAUDE.md are **lost after compaction** until
re-triggered. Anything that must hold for a whole long session stays in the root CLAUDE.md or an unscoped rule.
</details>

**Q2.** A team requires "always run `make lint` before committing". Two proposals: (a) add it to CLAUDE.md,
(b) a PostToolUse hook on `Bash(git commit *)`. Which, and why?

<details><summary>Answer</summary>

Neither is quite right, and the reasoning is the point.

- **(a)** is context, not enforcement — Claude will usually comply and sometimes will not, and an injected
  instruction or a long session can push it out. Fine as *guidance*, insufficient as a *requirement*.
- **(b)** is the right *mechanism* but the wrong *event*: PostToolUse fires **after** the commit succeeded, so
  linting then is too late.

Correct: a **PreToolUse hook matching `Bash(git commit *)`** that runs `make lint` and **exits 2** on failure,
blocking the commit with the lint output as the reason (which Claude then sees and can fix). Complement with a
**PostToolUse hook on `Edit|Write`** that formats and lints incrementally, so problems surface early rather than
at commit time — this is the "iterative refinement with a verifier" pattern.

Keep a one-line CLAUDE.md note too, so Claude anticipates the gate rather than discovering it. And keep the
hook fast: a command hook that times out does **not** block.
</details>

**Q3.** A CI job runs `claude -p "Fix the failing tests and push"` with `--permission-mode bypassPermissions`
and a GitHub token with write access. Identify every risk and propose a safe design.

<details><summary>Answer</summary>

Risks:
1. **Indirect prompt injection** — the test output, source files, and (on public repos) the PR title/description
   are attacker-controlled. In `bypassPermissions` an injected instruction runs with no gate.
2. **Unbounded write authority** — the agent can push to any branch, including main, and edit CI configuration
   (a persistence foothold).
3. **Credential exposure** — a token in the environment can be exfiltrated via any network-capable command.
4. **No cost/time bound** — a loop can burn budget and CI minutes.
5. **No verification** — "fix the tests" can be satisfied by deleting them.
6. **Uncontrolled MCP loading** — non-interactive sessions load project-scope servers without prompting.

Safe design:
- `--permission-mode dontAsk` with an explicit `allow` list: `Read`, `Grep`, `Glob`, `Edit(src/**)`,
  `Edit(tests/**)`, `Bash(npm test *)`, `Bash(git add *)`, `Bash(git commit *)`.
- **Deny** `Bash(curl *)`, `Bash(wget *)`, `Edit(.github/**)`, `Edit(infra/**)`, `Read(**/*.pem)`, and network
  tools generally; enable the **sandbox** with an egress allowlist so subprocesses cannot bypass the rules.
- **Never push from the agent.** It commits to a branch; a separate, non-agentic step opens the PR. Human review
  is the gate.
- Ephemeral, least-privilege token; no production access; no secrets in the environment beyond what is needed.
- Bound turns, wall-clock and cost; alert on overruns.
- Require the **test suite to pass** as a pipeline step after the agent finishes — verification outside the
  agent, so deleting tests fails the build.
- Control MCP explicitly via `disabledMcpjsonServers` / `--setting-sources`.
- Emit `--output-format stream-json` and check `mcp_server_errors` in `system/init`.
</details>

**Q4.** An engineer wants Claude to "always use our internal HTTP client instead of `fetch`" in `src/api/`, but
not elsewhere. Compare CLAUDE.md, a path-scoped rule, a skill, and a hook.

<details><summary>Answer</summary>

- **Root CLAUDE.md** — works but is wrong scope: every session in every directory pays for it, and it will
  eventually be applied where it does not belong.
- **Path-scoped rule** (`.claude/rules/api-client.md` with `paths: ["src/api/**/*.ts"]`) — **the right primary
  answer.** It loads exactly when Claude reads a matching file, costs nothing otherwise, and lives with the
  code. Caveat: it is **lost after compaction** until a matching file is read again — acceptable here because
  reading such a file is precisely what re-triggers it.
- **Skill** — wrong shape. Skills are for multi-step procedures invoked on demand, not for a passive convention.
- **Hook** — the right answer *if this must be enforced*: a PostToolUse hook on `Edit|Write` that greps changed
  files under `src/api/` for `fetch(` and exits 2 with a fix instruction. Better still, make the linter enforce
  it (an ESLint `no-restricted-globals` rule) and let the existing PostToolUse lint hook catch it — then the
  rule holds for humans too.

Best combined answer: path-scoped rule for guidance **plus** a lint rule enforced by a PostToolUse hook. Prompt
for intent, code for guarantee.
</details>

**Q5.** A developer reports Claude is "ignoring" a rule in `.claude/rules/security.md`. Give a diagnostic
procedure.

<details><summary>Answer</summary>

1. **`/context`** — is the file listed under memory files? If not, Claude cannot see it and everything else is
   moot.
2. **Check for `paths:` frontmatter.** A path-scoped rule loads only when Claude reads a matching file. Verify
   the globs actually match (watch bracket characters — an unescaped `[` that is not a valid bracket expression
   matches nothing).
3. **Did the session compact?** Path-scoped rules and nested CLAUDE.md are dropped by compaction until
   re-triggered. This is the most common cause of "it worked earlier".
4. **`InstructionsLoaded` hook** — log exactly which instruction files load, when, and why. This is the purpose-
   built debugging tool.
5. **Check `--setting-sources` / workspace trust** — project rules are skipped when `project` is excluded, and
   an untrusted folder changes what applies.
6. **Look for conflicts** across user rules, project rules and CLAUDE.md files; when two rules disagree Claude
   may pick either.
7. **Assess specificity.** "Be secure" is unfollowable; "never build SQL by string concatenation — use the
   query builder in `src/db/query.ts`" is.
8. **Then accept the architecture:** if the rule *must* hold, move it to a **PreToolUse hook or a permission
   rule**. Instructions are influence; only code is enforcement.
</details>

**Q6.** A team wants a code-review step after every implementation. Compare: a slash command, a subagent, a
Stop hook, and a CI job.

<details><summary>Answer</summary>

They are complementary, and the right answer names the trade-offs:

- **Slash command** (`/review`) — a human deliberately invokes it, runs in the main context, sees the whole
  conversation. Cheap and immediate, but **it is optional**: if nobody runs it, no review happens. Good for
  interactive use.
- **Subagent** — runs in its **own context** with read-only tools and a reviewer persona. The independent
  context is the point: a fresh reviewer catches what the author is blind to, and the verbose reading stays out
  of the main window. Best *quality* of automated review, but still needs to be triggered.
- **Stop hook** — fires automatically when the turn ends and can **exit 2 to refuse to stop** until checks pass.
  This is enforcement: it makes review non-optional within the session. Best for mechanical gates (tests, lint,
  typecheck); heavier for full semantic review because it blocks the turn.
- **CI job** — runs outside the developer's session on every PR, cannot be skipped, and reviews the *actual
  diff* that will merge. The strongest guarantee, the slowest feedback.

Recommended composition: **PostToolUse hook** for fast mechanical checks during editing → **subagent review**
invoked by the main agent before finishing → **Stop hook** enforcing "tests pass before you stop" →
**CI job** as the non-bypassable gate on the PR. Fast feedback where it is cheap; hard enforcement where it
matters.
</details>
