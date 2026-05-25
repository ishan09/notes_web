# Claude Code: Hooks & Plugins (Deep Dive)

> Sources: [Hooks docs](https://code.claude.com/docs/en/hooks) · [Plugins docs](https://code.claude.com/docs/en/plugins)

---

## PART 1 — HOOKS

### What Are Hooks?

Hooks are shell commands, HTTP endpoints, LLM prompts, or MCP tool calls that execute **automatically at specific lifecycle points** in a Claude Code session. They let you:

- Enforce policies (block destructive commands)
- Inject context automatically (load branch/issue info at session start)
- Automate post-processing (run linter after every file edit)
- Integrate external systems (call an internal API before tool use)

**Mental model**: Hooks are middleware for Claude's action pipeline.

---

### The 5 Hook Handler Types

| Type | What it does | Use when |
|---|---|---|
| `command` | Runs a shell command; receives event JSON on stdin | Most cases — flexible, scriptable |
| `http` | POSTs event JSON to an HTTP endpoint | Calling internal APIs or services |
| `mcp_tool` | Calls a tool on an already-connected MCP server | MCP-native integrations |
| `prompt` | Asks Claude (a separate model call) to evaluate | Semantic validation (is this safe?) |
| `agent` | Spawns a subagent with tool access | Complex multi-step evaluation logic |

---

### Lifecycle Events — When Hooks Fire

#### Session-level (once per session)
| Event | When | Can Block? |
|---|---|---|
| `SessionStart` | Session begins or resumes | No |
| `SessionEnd` | Session terminates | No |
| `Setup` | `--init-only` or `--maintenance` flag | No |

#### Turn-level (once per user message)
| Event | When | Can Block? |
|---|---|---|
| `UserPromptSubmit` | User submits a message (30s timeout) | Yes |
| `UserPromptExpansion` | Slash command expands | Yes |
| `Stop` | Claude finishes responding | Yes |
| `StopFailure` | Turn ends due to API error | No |

#### Tool-level (per tool call)
| Event | When | Can Block? |
|---|---|---|
| `PreToolUse` | Before a tool executes | Yes — can allow/deny/ask |
| `PostToolUse` | After successful tool call | Yes — blocks next step |
| `PostToolUseFailure` | After tool failure | Yes |
| `PostToolBatch` | After a parallel batch of tools completes | Yes |
| `PermissionRequest` | Permission dialog appears | Yes |
| `PermissionDenied` | Tool denied by auto-mode classifier | No |

#### Other notable events
| Event | When |
|---|---|
| `SubagentStart` / `SubagentStop` | Subagent spawned/finished |
| `PreCompact` / `PostCompact` | Before/after context compaction |
| `WorktreeCreate` / `WorktreeRemove` | Worktree lifecycle |
| `FileChanged` | Watched file changes on disk |
| `CwdChanged` | Working directory changes |
| `ConfigChange` | Config file changes mid-session |
| `TaskCreated` / `TaskCompleted` | Task lifecycle |
| `Elicitation` / `ElicitationResult` | MCP server requests user input |

---

### How to Configure Hooks

Hooks go in `settings.json` (or `settings.local.json` for local-only). Three levels of nesting:

```
Hook event → Matcher group → Handler
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/validate.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

#### Where hooks can live (priority order, highest first)

| Location | Scope | Shared? |
|---|---|---|
| Managed policy settings | Org-wide | Yes (admin) |
| `.claude/settings.json` | Project | Yes (commit to repo) |
| `.claude/settings.local.json` | Project | No (gitignored) |
| `~/.claude/settings.json` | All projects on machine | No |
| Plugin `hooks/hooks.json` | When plugin is enabled | Yes |
| Skill/agent YAML frontmatter | Skill/agent lifetime | Yes |

---

### Matcher Patterns

Matchers filter which tool calls (or events) trigger the hook:

| Matcher value | Evaluated as | Example |
|---|---|---|
| `"*"`, `""`, or omitted | Match all | Always fires |
| Letters/digits/`_`/`\|` | Exact name or `\|`-separated list | `"Bash"` or `"Edit\|Write"` |
| Anything else | JavaScript regex | `"^Notebook"` or `"mcp__memory__.*"` |

For MCP tools, match on `mcp__<server>__<tool>`:
```json
{ "matcher": "mcp__memory__.*" }
```

---

### Input — What Hooks Receive

All hooks receive JSON (via stdin for `command`, via POST body for `http`):

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/dir",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /tmp/old"
  }
}
```

---

### Output — How Hooks Respond

#### Exit codes (for `command` hooks)

| Exit code | Meaning | Behavior |
|---|---|---|
| `0` | Success | Parse JSON stdout for decisions |
| `2` | Blocking error | Show stderr as error, **block the action** |
| Other | Non-blocking error | Show stderr in transcript, continue |

#### JSON stdout structure

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Warning: this file is auto-generated",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked for security"
  }
}
```

#### Decision fields by event

| Event | Field | Values |
|---|---|---|
| `PreToolUse` | `hookSpecificOutput.permissionDecision` | `"allow"` / `"deny"` / `"ask"` / `"defer"` |
| `PermissionRequest` | `hookSpecificOutput.decision.behavior` | `"allow"` / `"deny"` |
| `PostToolUse`, `Stop`, `UserPromptSubmit`, etc. | `decision` | `"block"` (omit = allow) |
| `PermissionDenied` | `hookSpecificOutput.retry` | `true` (tells model it may retry) |

#### Injecting context (most useful pattern)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "This file is generated — edit src/schema.ts instead."
  }
}
```

---

### Practical Examples

#### 1. Block destructive `rm -rf` commands

`settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh" }]
      }
    ]
  }
}
```

`block-rm.sh`:
```bash
#!/bin/bash
COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

if echo "$COMMAND" | grep -qE 'rm\s+-rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "rm -rf is blocked. Use safer deletion."
    }
  }'
else
  exit 0
fi
```

#### 2. Auto-inject context at session start (branch + open issues)

```bash
#!/bin/bash
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
ISSUES=$(gh issue list -S "assignee:@me" --json title --jq ".[].title" 2>/dev/null || echo "none")

jq -n \
  --arg branch "$BRANCH" \
  --arg issues "$ISSUES" \
  '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "Branch: \($branch)\nYour open issues:\n\($issues)"
    }
  }'
```

#### 3. Auto-lint after every file edit

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier",
            "args": ["${tool_input.file_path}", "--write"]
          }
        ]
      }
    ]
  }
}
```

#### 4. HTTP hook — validate via internal API

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "http",
            "url": "http://internal-api/validate-command",
            "headers": { "Authorization": "Bearer $AUTH_TOKEN" },
            "allowedEnvVars": ["AUTH_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

#### 5. Prompt hook — semantic safety check

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__.*__write.*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Is this MCP write operation safe and appropriate?\n\n$ARGUMENTS",
            "model": "claude-opus-4-6"
          }
        ]
      }
    ]
  }
}
```

---

### Advanced Hook Features

#### Async hooks (fire and forget)
```json
{ "type": "command", "command": "/path/to/slow-task.sh", "async": true }
```

#### Async with rewake (background task can re-engage Claude)
```json
{ "type": "command", "command": "/path/to/task.sh", "asyncRewake": true }
```
Exit code 2 from the background script re-wakes Claude with stderr as a system reminder.

#### Persist env vars across commands
`SessionStart`, `Setup`, `CwdChanged`, `FileChanged` hooks can write to `$CLAUDE_ENV_FILE`:
```bash
echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
```
Variables then persist into all subsequent Bash tool calls in the session.

#### Path placeholders
- `${CLAUDE_PROJECT_DIR}` — project root
- `${CLAUDE_PLUGIN_ROOT}` — plugin install directory
- `${CLAUDE_PLUGIN_DATA}` — plugin persistent data directory

#### View all active hooks
Type `/hooks` in Claude Code — shows a read-only browser of all hooks, matchers, and their source (User / Project / Local / Plugin / Session / Built-in).

#### Disable all hooks
```json
{ "disableAllHooks": true }
```

---

### Hooks in Skills/Agents (Scoped Hooks)

Define hooks in YAML frontmatter — they only live while that skill/agent is active:

```yaml
---
name: secure-operations
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

Use `once: true` to run the hook only once per session then remove it.

---

### Security Considerations

| Risk | Mitigation |
|---|---|
| Hook injection via PR | Hooks in version control are subject to code review |
| Leaking env vars to HTTP hooks | Must explicitly opt in with `allowedEnvVars` |
| Org policy bypass | Admins can set `allowManagedHooksOnly` to block project/user hooks |
| Interactive stalls | Hooks run without `/dev/tty` — use `terminalSequence` for notifications |

---

## PART 2 — PLUGINS

### What Are Plugins?

Plugins **bundle skills, agents, hooks, MCP configs, LSP servers, and settings** into a single shareable unit. They let teams distribute consistent Claude Code setups without manual copying.

**Standalone vs Plugin:**

| | Standalone (`.claude/`) | Plugin |
|---|---|---|
| Skill name | `/hello` | `/my-plugin:hello` (namespaced) |
| Sharing | Manual copy | `/plugin install` |
| Best for | Single project, personal | Teams, orgs, community |
| Versioned | No | Yes |

**Rule of thumb**: Start with standalone in `.claude/` for iteration. Convert to plugin when you're ready to share.

---

### Plugin Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          ← manifest (only file inside .claude-plugin/)
├── skills/
│   └── code-review/
│       └── SKILL.md
├── agents/
│   └── security-reviewer.md
├── hooks/
│   └── hooks.json
├── .mcp.json                ← MCP server configs
├── .lsp.json                ← LSP server configs
├── monitors/
│   └── monitors.json
├── bin/                     ← executables added to Bash PATH
├── settings.json            ← default settings when plugin enabled
└── README.md
```

> **Common mistake**: Do NOT put `skills/`, `agents/`, `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes there.

---

### The Plugin Manifest (`plugin.json`)

```json
{
  "name": "my-plugin",
  "description": "Description shown in the plugin manager",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "homepage": "https://github.com/you/my-plugin",
  "repository": "https://github.com/you/my-plugin",
  "license": "MIT"
}
```

| Field | Required | Purpose |
|---|---|---|
| `name` | Yes | Unique ID and skill namespace prefix |
| `description` | Yes | Shown in plugin manager |
| `version` | No | If set, users get updates only on version bumps; if omitted, every git commit is a new version |
| `author` | No | Attribution |

---

### How to Create a Plugin (Step by Step)

**1. Scaffold the directory:**
```bash
mkdir -p my-plugin/.claude-plugin
```

**2. Create the manifest:**
```json
// my-plugin/.claude-plugin/plugin.json
{
  "name": "my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0"
}
```

**3. Add a skill:**
```bash
mkdir -p my-plugin/skills/my-skill
```
```markdown
<!-- my-plugin/skills/my-skill/SKILL.md -->
---
description: What this skill does and when Claude should use it
---

Instructions for Claude to follow when this skill is invoked.
Use $ARGUMENTS to capture anything the user typed after the skill name.
```

**4. Add hooks (optional):**
```json
// my-plugin/hooks/hooks.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "npm run lint:fix -- ${tool_input.file_path}" }]
      }
    ]
  }
}
```

**5. Add MCP servers (optional):**
```json
// my-plugin/.mcp.json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/bin/server.js"]
    }
  }
}
```

**6. Add default settings (optional):**
```json
// my-plugin/settings.json
{
  "agent": "security-reviewer"
}
```
This activates `agents/security-reviewer.md` as the main thread when the plugin is enabled.

**7. Test locally:**
```bash
claude --plugin-dir ./my-plugin
# Then inside Claude Code:
/my-plugin:my-skill
/reload-plugins   # pick up changes without restarting
```

---

### Background Monitors

Monitors watch logs, files, or external state and feed events to Claude in real time:

```json
// monitors/monitors.json
[
  {
    "name": "error-log",
    "command": "tail -F ./logs/error.log",
    "description": "Application error log"
  }
]
```

Each stdout line from `command` is delivered to Claude as a notification. Claude Code starts monitors automatically when the plugin is active.

---

### Converting Standalone Config to Plugin

If you already have hooks/skills in `.claude/`:

```bash
# 1. Create plugin structure
mkdir -p my-plugin/.claude-plugin
echo '{"name":"my-plugin","description":"Migrated","version":"1.0.0"}' > my-plugin/.claude-plugin/plugin.json

# 2. Copy commands/skills/agents
cp -r .claude/commands my-plugin/
cp -r .claude/skills my-plugin/     # if any
cp -r .claude/agents my-plugin/     # if any

# 3. Migrate hooks — copy the "hooks" object from settings.json into:
# my-plugin/hooks/hooks.json

# 4. Test
claude --plugin-dir ./my-plugin

# 5. Remove originals to avoid duplicates
```

After migration, skill names change from `/hello` → `/my-plugin:hello`.

---

### Distributing Plugins

| Method | How |
|---|---|
| Git repo | Share URL; teammates install via `/plugin install <url>` |
| `.zip` archive | `claude --plugin-dir ./my-plugin.zip` or `--plugin-url https://...` |
| Team marketplace | Host a marketplace repo; configure in org settings |
| Official marketplace | Submit at `claude.ai/settings/plugins/submit` |

---

## Decision Framework: Hooks vs Skills vs Plugins

| Need | Use |
|---|---|
| Run something automatically at a lifecycle point | **Hook** |
| Give Claude reusable expertise/workflow | **Skill** |
| Bundle multiple things for distribution | **Plugin** |
| Call external systems/tools | **MCP server** (often inside a plugin) |
| Block or allow specific tool calls | **PreToolUse hook** |
| Add context from external state | **SessionStart hook** |
| Auto-format after edits | **PostToolUse hook** |
| Share a working setup with the team | **Plugin** |
| Quick personal experiment | **Standalone `.claude/`** |

---

## Common Mistakes

| Mistake | Reality |
|---|---|
| Putting expertise/docs in hooks | Hooks are for automation, not knowledge — use Skills for that |
| Putting `skills/` inside `.claude-plugin/` | Only `plugin.json` goes in `.claude-plugin/` |
| Using hooks for things that need interactive input | Hooks run without `/dev/tty` — they can't prompt the user |
| Not setting `allowedEnvVars` in HTTP hooks | Env vars are blocked by default for security |
| Loading everything in CLAUDE.md | Move reusable expertise to Skills; automation to Hooks |
| Building MCP connections before basics | Get CLAUDE.md + hooks right first, then add MCP |

---

## Quick Reference

```
HOOKS:
  Config:  settings.json → hooks → { EventName: [{ matcher, hooks: [handler] }] }
  Handler types: command | http | mcp_tool | prompt | agent
  Exit codes:    0 = success, 2 = block action, other = non-blocking
  Block a tool:  hookSpecificOutput.permissionDecision = "deny"
  Inject context: hookSpecificOutput.additionalContext = "..."
  Env persist:   write to $CLAUDE_ENV_FILE in SessionStart hook
  View all:      /hooks inside Claude Code

PLUGINS:
  Structure:  my-plugin/.claude-plugin/plugin.json + skills/ + hooks/ + agents/ + .mcp.json
  Test local: claude --plugin-dir ./my-plugin
  Reload:     /reload-plugins inside session
  Skill name: /plugin-name:skill-name (always namespaced)
  Distribute: git URL, .zip, or marketplace
```

---

## Related Topics
- **Previous**: `08-cheat-sheet.md`
- **Related**: `02-claude-code-workflows.md` (seven-layer harness overview)
- **Related**: `04-tool-design-and-mcp.md` (MCP servers used inside plugins)
- **Related**: `01-agentic-architecture.md` (subagents as hook handlers)
