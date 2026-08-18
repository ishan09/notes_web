# 25 — 100-Question Practice Exam

> **Format.** 100 multiple-choice questions, weighted like the real blueprint:
> D1 Agentic Architecture 27 · D3 Claude Code 20 · D4 Prompt & Structured Output 20 ·
> D2 Tool Design & MCP 18 · D5 Context & Reliability 15.
>
> **Timing.** The real exam gives 120 minutes for 60 questions (2 min each). For a realistic drill, do
> **60 randomly chosen questions in 120 minutes**, or all 100 in 200 minutes.
>
> **Method.** Answer everything before checking. Then read **every** explanation, including for the questions
> you got right — the explanations carry the reasoning the exam actually tests.
>
> Sections: [Questions](#questions) · [Answer key](#answer-key) · [Explanations](#explanations)

---

## Questions

### Domain 1 — Agentic Architecture & Orchestration (Q1–Q27)

**Q1.** An agent's harness checks `if response.stop_reason == "tool_use"` and otherwise returns the text to the
user. Which defect is most likely to reach production?

A. Parallel tool calls will not execute
B. Truncated responses will be returned to users as if complete
C. Tool results will be sent in the wrong message role
D. Extended thinking blocks will be lost

**Q2.** Which is the strongest justification for splitting a single agent into a coordinator plus subagents?

A. Each subagent can have a specialised persona
B. Intermediate exploration output would exceed one context window
C. It makes the system easier to explain to stakeholders
D. Subagents can share the parent's prompt cache

**Q3.** After a server-side tool loop hits its iteration limit, the response has `stop_reason: "pause_turn"`.
What should the harness do?

A. Append a user message saying "Continue." and re-request
B. Re-send the user query and assistant response unchanged to resume
C. Treat it as an error and retry the whole request
D. Increase `max_tokens` and retry

**Q4.** A five-stage sequential agent pipeline has ~95% accuracy per stage. Approximate end-to-end accuracy?

A. 95%   B. 88%   C. 77%   D. 60%

**Q5.** An agent reports "migration complete" but the build fails. What is the architectural defect?

A. The model is not capable enough
B. Completion is determined by the model's claim rather than by verification
C. `max_tokens` was too low
D. The prompt lacked few-shot examples

**Q6.** Which is NOT one of the four legitimate reasons to adopt a multi-agent architecture?

A. Context isolation
B. Parallelism for wall-clock latency
C. Different tools, permissions or models per role
D. Making the trajectory easier to debug

**Q7.** In a hub-and-spoke system, what should be passed to a spoke?

A. The full conversation transcript
B. A structured handoff package with goal, constraints, output schema and budget
C. Only the original user question
D. The coordinator's chain of thought

**Q8.** An agent loops: search → empty → same search → empty, until the step cap. Which fix addresses the root
cause most directly?

A. Raise the step cap
B. Switch to a larger model
C. Make the tool's empty result state explicitly that retrying will not help, and give the agent an escalation
tool
D. Add extended thinking

**Q9.** Which statement about session resumption is correct?

A. Replay the full transcript so the agent has complete context
B. Reconstruct from externalised task state plus a bounded tail of recent messages
C. Resume by re-sending only the last assistant message
D. Sessions cannot be resumed because the API is stateless

**Q10.** A customer wants an agent to "extract the invoice total from a PDF". Best architecture?

A. A single agent with a PDF tool
B. A single Messages API call with a document block and structured output
C. A coordinator with an extractor and a validator subagent
D. An event-driven agent triggered on upload

**Q11.** Which best describes the purpose of plan-then-execute?

A. It reduces token cost
B. It makes the dangerous step a reviewable artefact before any side effect occurs
C. It allows parallel tool execution
D. It removes the need for termination conditions

**Q12.** An agent has one termination condition: `max_steps = 25`. What is the most important addition?

A. A larger context window
B. A token/cost budget and no-progress detection
C. More tools
D. A higher `effort` setting

**Q13.** Which model-tiering choice is correct for a coordinator/spoke system?

A. Cheap coordinator, expensive spokes
B. Expensive coordinator, cheap spokes
C. Same tier everywhere for consistency
D. Cheapest available everywhere

**Q14.** An agent must migrate 200 files. Files are independent. Which decomposition approach is preferred?

A. Let the model decide the decomposition at runtime
B. Static decomposition in code (one subtask per file)
C. Ask the user to specify the file order
D. Process all 200 files in one context

**Q15.** What does "the agent acts as the user" mean architecturally?

A. The agent uses the user's chat history
B. The agent's tool calls are authorised with the requesting user's permissions, not a superuser service account
C. The agent impersonates the user in logs
D. The agent adopts the user's writing style

**Q16.** Which is the best indicator dashboard for detecting an agent quality regression?

A. Average latency
B. Total token spend
C. Termination-reason distribution
D. Number of tools defined

**Q17.** A team proposes agents named Researcher, Analyst, Writer, all with identical tools and permissions,
running sequentially. What should you recommend?

A. Add a fourth reviewer agent
B. Combine into a single agent with a better prompt, or a workflow
C. Convert to peer-to-peer communication
D. Give each a different model tier

**Q18.** Which is true of subagent context in Claude Code?

A. Subagents inherit the full conversation history
B. Non-fork subagents start fresh: no conversation history, no output style, no parent auto memory
C. Subagents always share the parent's prompt cache
D. Subagents cannot have their own tool restrictions

**Q19.** An agent with write access reads content from an untrusted source. What is the strongest structural
control?

A. Instruct the model to ignore embedded instructions
B. Separate the reader (no credentials) from the actor (never sees raw untrusted content)
C. Use a larger model that resists injection better
D. Log all tool calls for later review

**Q20.** Where should confidence aggregation across multi-agent results be implemented?

A. In the coordinator's prompt
B. In deterministic code, with a stated rule such as `min()` for conjunctive claims
C. In each spoke's prompt
D. It should not be aggregated

**Q21.** Which pattern best fits "react to CI failures and propose fixes, 300 events/day"?

A. Real-time streaming chat
B. Event-driven with dedupe, aggressive pre-filtering, and a circuit breaker
C. Batch processing overnight
D. A supervisor with 10 subagents

**Q22.** An agent's cost per task varies from $0.20 to $14. Which change most reduces the variance?

A. Switch to a cheaper model
B. Bound context growth, cap steps and retries, and route simple tasks away from the agent
C. Add more tools so it finishes faster
D. Increase `max_tokens`

**Q23.** Which best describes when a workflow beats an agent?

A. When the task involves natural language
B. When you can draw the flowchart of steps in advance
C. When cost is not a concern
D. When you have many tools

**Q24.** A spoke fails to reach one of its sources. What should it return?

A. Nothing for that source (omit silently)
B. A failure record with `sources_attempted` vs `sources_succeeded` and a reason
C. A guessed value with high confidence
D. An exception that aborts the whole run

**Q25.** Which is the correct handling of `stop_reason: "refusal"`?

A. Retry the identical request with backoff
B. Read `stop_details` for the category, handle gracefully, optionally use server-side fallbacks
C. Increase `effort` and retry
D. Treat it as a network error

**Q26.** Which is the primary benefit of `isolation: worktree` for parallel Claude Code subagents?

A. Lower token cost
B. Filesystem isolation so parallel agents do not collide on the same repository
C. Automatic merging of results
D. Shared prompt cache

**Q27.** An orchestration-layer safeguard that stops the agentic loop before the next model call is best
implemented as:

A. A CLAUDE.md instruction
B. A `PostToolBatch` hook returning exit code 2
C. A larger `max_tokens`
D. A `SessionStart` hook

---

### Domain 3 — Claude Code Configuration & Workflows (Q28–Q47)

**Q28.** A security requirement must hold regardless of what the model decides. Where does it belong?

A. Root CLAUDE.md, in bold
B. A `.claude/rules/` file with `paths:` frontmatter
C. A PreToolUse hook or a permission deny rule
D. A skill invoked at session start

**Q29.** Settings contain `deny: ["Bash(aws *)"]` and `allow: ["Bash(aws s3 ls)"]`. What happens when Claude
runs `aws s3 ls`?

A. Allowed, because the allow rule is more specific
B. Denied, because deny is evaluated first and specificity does not matter
C. The user is prompted
D. A startup warning is emitted and the command runs

**Q30.** Which items are **lost** after `/compact` until re-triggered?

A. Project-root CLAUDE.md and unscoped rules
B. Path-scoped rules and nested subdirectory CLAUDE.md files
C. The system prompt and output style
D. Hooks

**Q31.** A rule in user settings is written `Read(/secrets/**)`. What does it match?

A. `/secrets/**` at the filesystem root
B. `~/.claude/secrets/**`
C. `<project root>/secrets/**`
D. Any `secrets` directory anywhere

**Q32.** Which mode auto-denies any tool call not pre-approved by an allow rule?

A. `acceptEdits`   B. `plan`   C. `dontAsk`   D. `auto`

**Q33.** A team needs "always run lint before committing" to be enforced. Best implementation?

A. PostToolUse hook on `Bash(git commit *)`
B. PreToolUse hook on `Bash(git commit *)` that exits 2 on lint failure
C. A CLAUDE.md rule
D. A slash command the developer runs manually

**Q34.** In a monorepo, which mechanism keeps team-specific conventions out of every session's context?

A. A longer root CLAUDE.md
B. `.claude/rules/` files with `paths:` frontmatter
C. `CLAUDE.local.md`
D. A managed policy CLAUDE.md

**Q35.** A CI job runs `claude -p` with a GitHub token that can push. Which configuration is safest?

A. `--permission-mode bypassPermissions` for reliability
B. `--permission-mode dontAsk` with an explicit allowlist, no push rights, sandbox with egress allowlist
C. `--permission-mode acceptEdits` with all tools enabled
D. Default mode with a human watching the logs

**Q36.** Which statement about Read/Edit deny rules is correct?

A. They block all processes on the machine from accessing the path
B. They apply to Claude's file tools and recognised file commands in Bash, but not to arbitrary subprocesses
C. They only apply to the Write tool
D. They are advisory and the model may override them

**Q37.** Which is the correct precedence order for MCP server definitions in Claude Code?

A. user → project → local → plugin → connector
B. local → project → user → plugin → connector
C. project → local → user → connector → plugin
D. connector → plugin → user → project → local

**Q38.** A committed `.mcp.json` needs an API key. Correct approach?

A. Put the key in the file; the repo is private
B. `"Authorization": "Bearer ${API_KEY}"` with the variable supplied by the environment
C. Put the key in `CLAUDE.md`
D. Use `--header` on every invocation

**Q39.** Which best distinguishes a skill from a slash command?

A. Skills are faster
B. A slash command is invoked deliberately by you; a skill's body loads when Claude judges it relevant
C. Skills can only be used by subagents
D. Slash commands cannot take arguments

**Q40.** A deny rule `Bash` (bare name) has which effect?

A. Blocks matching Bash calls but leaves the tool available
B. Removes the Bash tool from Claude's context entirely
C. Prompts on every Bash call
D. Is ignored with a warning

**Q41.** Which is true about `Bash(devbox run *)` as an allow rule?

A. It safely restricts commands to devbox
B. It authorises whatever follows `run`, including destructive commands, because environment runners are not
stripped wrappers
C. It is equivalent to `Bash(devbox *)`
D. It is rejected at startup

**Q42.** When should you prefer a subagent over doing the work in the main conversation?

A. For small targeted edits
B. When the task produces verbose output that would pollute the main context
C. When latency is critical
D. When you need frequent back-and-forth

**Q43.** Auto memory's `MEMORY.md` is loaded into each session up to:

A. The whole file, always
B. The first 200 lines or 25KB, whichever comes first
C. 5,000 tokens
D. It is never loaded automatically

**Q44.** Which command shows exactly which instruction files loaded in the current session?

A. `/memory`   B. `/context`   C. `/permissions`   D. `/doctor`

**Q45.** Invoked skill bodies after compaction are:

A. Discarded permanently
B. Re-injected, capped at 5,000 tokens per skill and 25,000 total, oldest dropped first
C. Re-injected in full
D. Converted into CLAUDE.md entries

**Q46.** Which is the correct way to give a subagent read-only database access with a guarantee?

A. A system prompt saying "never write"
B. `tools:` allowlist plus a PreToolUse hook validating the query, plus a read-only DB role
C. `disallowedTools: Write`
D. `permissionMode: plan`

**Q47.** In a non-interactive `claude -p` run, project-scoped `.mcp.json` servers are:

A. Always blocked
B. Loaded without an approval prompt, so `disabledMcpjsonServers` or `--setting-sources` is the control
C. Prompted for approval in the terminal
D. Converted to user scope

---

### Domain 4 — Prompt Engineering & Structured Output (Q48–Q67)

**Q48.** Which change most improves consistency of a subjective classification?

A. Lower the temperature
B. Replace adjectives with explicit, decidable criteria
C. Add more few-shot examples
D. Increase `max_tokens`

**Q49.** Where does `strict: true` belong?

A. On `tool_choice`
B. As a top-level field on the tool definition
C. Inside `input_schema`
D. In `output_config`

**Q50.** A schema uses `"minimum": 0`. In production, negative values appear. Why?

A. The model ignores schemas
B. Numeric constraints are not in the supported subset; they are stripped or validated client-side, not enforced
by constrained decoding
C. `strict` was not set
D. The schema was cached

**Q51.** An extraction call returns `stop_reason: "max_tokens"`. What should the code do?

A. Parse the JSON and repair it
B. Treat it as a hard failure: raise `max_tokens`, stream, or split the input — never parse it as complete
C. Retry with the same parameters
D. Lower `effort`

**Q52.** Which is the current, canonical way to constrain a response to a JSON schema?

A. `output_format` on `messages.create()`
B. `output_config: {format: {...}}`, or `client.messages.parse()`
C. A forced tool call with `tool_choice`
D. A system-prompt instruction

**Q53.** Which combination returns a 400?

A. Structured outputs + streaming
B. Structured outputs + extended thinking
C. Citations + `output_config.format`
D. Structured outputs + Batches API

**Q54.** In a validation retry loop, what most improves the chance the retry succeeds?

A. Raising the temperature
B. Sending the specific validation error and keeping the failed attempt in history
C. Removing the schema
D. Switching to a different prompt entirely

**Q55.** Why prefer `required` + nullable over an optional field?

A. It is shorter
B. It distinguishes "the value is absent from the source" from "the model failed to produce it"
C. Optional fields are unsupported
D. It reduces token cost

**Q56.** Which few-shot example is most valuable?

A. Another typical example of the majority class
B. A boundary case that differs from a near-neighbour only in the deciding feature
C. An example copied from the eval set
D. A very long example showing many features at once

**Q57.** An eval scores 97% but production is 78%. The eval set was built from the same documents used to write
the few-shot examples. Diagnosis?

A. Model drift
B. Example contamination of the eval set — the eval measures recall of in-prompt material
C. Insufficient `effort`
D. Schema too strict

**Q58.** Which prompt ordering is best for a long context?

A. Task first, then data
B. Stable content first, data next, **task last**
C. Random order
D. Task in the middle

**Q59.** A system prompt contains `datetime.now()`. What is the consequence?

A. Nothing significant
B. The prompt cache is invalidated on every request
C. The model rejects the request
D. Thinking is disabled

**Q60.** Which is the recommended way to get reasoning on current Claude models?

A. "Think step by step" in `<scratchpad>` tags
B. `thinking: {type: "adaptive"}` with `output_config.effort`
C. `thinking: {type: "enabled", budget_tokens: 8000}`
D. A higher temperature

**Q61.** Adding a new value to an existing enum is:

A. Always safe
B. Breaking for consumers that switch exhaustively — version the schema and update consumers first
C. Impossible
D. Only a problem for the model

**Q62.** Which is the strongest defence against indirect prompt injection through a retrieved document?

A. Instructing the model to ignore instructions in documents
B. Reducing the agent's capability and adding a deterministic gate on side-effecting actions
C. Using a larger model
D. Increasing `effort`

**Q63.** A tenant-supplied "assistant persona" is concatenated into the system prompt. Risk?

A. Higher token cost only
B. The tenant gains operator authority and can override safety rules and tool policy
C. It breaks streaming
D. None if the tenant is authenticated

**Q64.** Structured outputs guarantee:

A. Correct values
B. Schema-valid shape, not semantic truth
C. That the model will not refuse
D. That the response fits `max_tokens`

**Q65.** Which is the right ladder for a failed extraction?

A. Retry indefinitely with the same prompt
B. Repair once with the specific error → re-ask at a higher tier → human/DLQ
C. Switch models on every failure
D. Return partial data marked as complete

**Q66.** Dynamically generating a JSON schema per request causes:

A. Better accuracy
B. A one-time compilation latency cost on every request, because the 24-hour schema cache never hits
C. A 400 error
D. Nothing measurable

**Q67.** Which improves tool-argument accuracy most on a complex schema?

A. A longer tool description in prose
B. Enums, formats, per-property descriptions, `strict: true`, and tool-use examples
C. Raising `max_tokens`
D. Disabling parallel tool use

---

### Domain 2 — Tool Design & MCP Integration (Q68–Q85)

**Q68.** A tool times out. What must the harness return?

A. Nothing — omit the block
B. A `tool_result` with the matching `tool_use_id`, `is_error: true`, and an informative message
C. An exception to the caller
D. A `tool_use` block with an error field

**Q69.** Three tools were called in parallel. Their results should be returned:

A. In three separate user messages
B. In one user message containing all three `tool_result` blocks
C. In an assistant message
D. In the system prompt

**Q70.** Which best describes MCP resources?

A. Model-controlled actions
B. Application/user-selected contextual data addressed by URI
C. User-invoked prompt templates
D. Server-initiated inference requests

**Q71.** An MCP tool fails to execute. How is that signalled?

A. A JSON-RPC error object
B. A successful JSON-RPC result whose payload carries `isError: true`
C. An HTTP 500
D. A connection close

**Q72.** Which MCP transport is recommended for remote servers?

A. SSE   B. Streamable HTTP   C. stdio   D. WebSocket

**Q73.** The Claude API MCP connector requires:

A. Only `mcp_servers`
B. `mcp_servers` **and** a matching `mcp_toolset` entry in `tools`
C. Only a `mcp_toolset` entry
D. A local stdio process

**Q74.** A tool named `api_call(method, path, body)` exposing your whole REST API is problematic mainly because:

A. It uses too many tokens
B. Authorisation cannot be expressed meaningfully, argument accuracy is poor, and every action looks identical
in audit logs
C. It cannot be described adequately
D. It is incompatible with `strict`

**Q75.** Tool search is preferable to swapping the `tools` array mid-session because:

A. It is faster to implement
B. Discovered schemas are appended rather than swapped, preserving the prompt cache
C. It supports more tools
D. It removes the need for descriptions

**Q76.** Which error would `tools` with every entry marked `defer_loading: true` produce?

A. Silent failure
B. `400 All tools have defer_loading set`
C. A `pause_turn`
D. Tools load normally

**Q77.** A shared multi-tenant MCP server takes `tenant_id` as a tool argument. The flaw is:

A. Extra tokens
B. Tenant isolation depends on a model-supplied value that untrusted content can influence
C. It breaks caching
D. It requires OAuth

**Q78.** `_meta["anthropic/requiresUserInteraction"]` on a tool means:

A. The tool is deprecated
B. Claude Code prompts on every call, even in `acceptEdits`, `auto` and `bypassPermissions`, and allow rules do
not skip it
C. The tool requires OAuth
D. The tool cannot be called by subagents

**Q79.** Which is the correct rule of thumb for bash versus dedicated tools?

A. Always use bash for flexibility
B. Start with bash for breadth; promote to dedicated tools when you need to gate, render, audit or parallelise
C. Never expose bash
D. Dedicated tools are only for read operations

**Q80.** When should a capability be exposed via MCP rather than as a direct tool definition?

A. Always — MCP is the modern approach
B. When multiple AI clients need it, teams should own it independently, or you want runtime discovery
C. When latency matters
D. When there is exactly one consumer

**Q81.** A stdio MCP server is configured as `npx -y some-server@latest`. The risk is:

A. Slow startup
B. Auto-updating third-party code with a channel into your model's context — a supply-chain and tool-poisoning
risk
C. Excess token use
D. No risk if the server is popular

**Q82.** Anthropic-defined tools such as `bash_20250124` should be declared:

A. With a custom `input_schema` you write
B. By `type` and `name` only — they are schema-less
C. As MCP tools
D. Inside `output_config`

**Q83.** Which is the strongest control when a tool result may exceed the context budget?

A. Increase the context window
B. Bound the output in the server: project fields, paginate, signal truncation explicitly
C. Ask the model to summarise it afterwards
D. Disable the tool

**Q84.** Authorising `get_order(order_id)` correctly requires checking:

A. That the user may call `get_order`
B. That the user may call `get_order` **and** may read *that specific order*
C. That the model chose the tool correctly
D. That the order exists

**Q85.** Which MCP primitive lets a server ask the host to perform an LLM completion?

A. Resources   B. Prompts   C. Sampling   D. Roots

---

### Domain 5 — Context Management & Reliability (Q86–Q100)

**Q86.** Prompt caching is a prefix match over:

A. `messages → system → tools`
B. `tools → system → messages`
C. `system → tools → messages`
D. Only the system prompt

**Q87.** `cache_read_input_tokens` is 0 across identical repeated requests. Most likely cause?

A. Caching is disabled account-wide
B. Something in the prefix changes each request (timestamp, request ID, unsorted JSON, per-user tool list)
C. The prompt is too long
D. The model does not support caching

**Q88.** Compaction is enabled and the code does `messages.append({"role":"assistant","content": text})`.
Consequence?

A. Nothing
B. The compaction block is discarded, so history silently resets
C. A 400 error
D. Thinking blocks are duplicated

**Q89.** Which pair is correctly matched?

A. Compaction = prune stale tool results
B. Context editing = summarise earlier context
C. Context editing = clear stale tool results and thinking blocks
D. Memory = summarise within a session

**Q90.** Which error should never be retried?

A. 429   B. 529   C. 400   D. Connection timeout

**Q91.** Exponential backoff without jitter across a fleet causes:

A. Lower cost
B. Synchronised retry storms that sustain the overload
C. Faster recovery
D. No measurable effect

**Q92.** Which makes a side-effecting tool safe to retry?

A. Lowering the timeout
B. A caller-supplied idempotency key derived from `tool_use_id`
C. Disabling parallel tool use
D. Increasing `max_retries`

**Q93.** Best placement of the most relevant retrieved chunk in a long context?

A. In the middle
B. First (and the second-best last), with the task at the very end
C. Immediately after the system prompt only
D. Position does not matter

**Q94.** A structured handoff between agents should include:

A. The full transcript
B. Goal, acceptance criteria, completed results with confidence and provenance, artefacts by reference, open
questions, constraints and budget
C. Only the final answer
D. The coordinator's thinking blocks

**Q95.** Self-reported model confidence should be:

A. Used directly as a probability
B. Calibrated against observed correctness before thresholds are set on it
C. Ignored entirely
D. Averaged across agents

**Q96.** Which change alters instructions mid-conversation **without** invalidating the prompt cache?

A. Editing the top-level `system` field
B. Appending a `{"role": "system", ...}` message to `messages[]` on a supporting model
C. Adding a new tool
D. Switching model

**Q97.** Which metric best predicts a cost incident earliest?

A. Monthly invoice total
B. Cache hit rate
C. Number of tools
D. Average response length

**Q98.** Which is the correct approach to ACL filtering in RAG?

A. Retrieve top-k, then remove documents the user cannot see
B. Filter by ACL inside the retrieval query, and re-check cited documents at answer time
C. Instruct the model not to discuss unauthorised documents
D. Encrypt the index

**Q99.** An MCP server becomes slow. The best resilience response is:

A. Increase the client timeout so calls succeed
B. Set a per-server timeout, return `is_error: true` with guidance, and degrade gracefully with a circuit breaker
C. Remove the server permanently
D. Retry immediately on timeout

**Q100.** Which statement about long context is correct?

A. A 1M-token window removes the need for retrieval
B. It is a capability, not a strategy — cost, latency and context dilution usually favour retrieving less
C. Accuracy always improves with more context
D. Cached long context can be access-controlled per user

---

## Answer key

| # | A | # | A | # | A | # | A | # | A |
|---|---|---|---|---|---|---|---|---|---|
| 1 | B | 21 | B | 41 | B | 61 | B | 81 | B |
| 2 | B | 22 | B | 42 | B | 62 | B | 82 | B |
| 3 | B | 23 | B | 43 | B | 63 | B | 83 | B |
| 4 | C | 24 | B | 44 | B | 64 | B | 84 | B |
| 5 | B | 25 | B | 45 | B | 65 | B | 85 | C |
| 6 | D | 26 | B | 46 | B | 66 | B | 86 | B |
| 7 | B | 27 | B | 47 | B | 67 | B | 87 | B |
| 8 | C | 28 | C | 48 | B | 68 | B | 88 | B |
| 9 | B | 29 | B | 49 | B | 69 | B | 89 | C |
| 10 | B | 30 | B | 50 | B | 70 | B | 90 | C |
| 11 | B | 31 | B | 51 | B | 71 | B | 91 | B |
| 12 | B | 32 | C | 52 | B | 72 | B | 92 | B |
| 13 | B | 33 | B | 53 | C | 73 | B | 93 | B |
| 14 | B | 34 | B | 54 | B | 74 | B | 94 | B |
| 15 | B | 35 | B | 55 | B | 75 | B | 95 | B |
| 16 | C | 36 | B | 56 | B | 76 | B | 96 | B |
| 17 | B | 37 | B | 57 | B | 77 | B | 97 | B |
| 18 | B | 38 | B | 58 | B | 78 | B | 98 | B |
| 19 | B | 39 | B | 59 | B | 79 | B | 99 | B |
| 20 | B | 40 | B | 60 | B | 80 | B | 100 | B |

**Scoring.** 90+ = ready. 80–89 = ready after reviewing your misses. 70–79 = re-read the two weakest domains.
&lt;70 = work through §22 and §23, then retake.

> **Note on option B.** The key is deliberately B-heavy so it is easy to self-mark; the real exam randomises.
> Do not pattern-match on letters — mark yourself on whether your **reasoning** matched the explanation.

---

## Explanations

### Domain 1 — Agentic Architecture (Q1–Q27)

**Q1 — B.** The loop handles `tool_use` and treats everything else as a final answer, so a `max_tokens`
truncation is returned to the user as if it were complete — silently wrong output, the worst failure class.
`pause_turn` is similarly mishandled (the turn ends prematurely). A is wrong: parallel `tool_use` blocks are
still in `content`. C and D describe different bugs. **§2.4.2, §9.2.1**

**Q2 — B.** Context isolation is the strongest and most defensible reason: it is provable ("the intermediate
output does not fit"). A is theatre if the tools and permissions are identical. C is not an engineering
justification. D is false — non-fork subagents have separate contexts and cannot share the parent's cache;
only forks do. **§9.6.1, §7.9.3**

**Q3 — B.** Re-send `[user_query, assistant_response]` and the server resumes automatically because it detects
the trailing `server_tool_use` block. Adding "Continue." is explicitly wrong and pollutes the conversation.
Bound resumption with a `max_continuations` limit. **§2.4.2**

**Q4 — C.** 0.95⁵ ≈ 0.774. Sequential stages multiply. The mitigation is fewer stages or verification between
them. **§9.6.3, §15 Q3**

**Q5 — B.** `stop_reason: "end_turn"` means the model stopped talking, not that the goal was met. The fix is a
verifier in the loop — machine-checkable acceptance criteria, a Stop hook that refuses to finish until tests
pass, and verification outside the agent in CI. **§9.9, §7.6**

**Q6 — D.** Multi-agent makes debugging *harder*, not easier — N trajectories plus handoffs. The four
legitimate reasons are context isolation, parallelism, genuine specialisation, and security
compartmentalisation. **§9.6.1**

**Q7 — B.** A structured handoff package. Transcripts are expensive, stale, and invite the spoke to re-litigate
resolved decisions; handoffs should be lossy on purpose — losing the path, keeping the state. **§8.6.2**

**Q8 — C.** The loop is a symptom of a missing exit. An empty result that does not say what emptiness *means*
invites a retry, and an agent with no escalation tool has nowhere to go. Repeat detection in the harness is the
necessary backstop, but C fixes the cause. A makes it worse; B and D do not address it. **§9.10, §5.6**

**Q9 — B.** Reconstruct from externalised task state plus fresh context. Replaying a stale transcript is
expensive and may reference tool results that no longer reflect reality. D is wrong: statelessness is exactly
why *you* own resumption. **§9.3.2, §2.4.4**

**Q10 — B.** One transformation of one input: a single Messages API call with a `document` block and structured
output. No steps to decide, so no agent. **§9.11, §16.2**

**Q11 — B.** The plan becomes a reviewable artefact before any side effect. An injected or confused agent
produces a bad plan that gets rejected rather than a bad action that already happened. **§9.4.2**

**Q12 — B.** A step cap alone does not bound cost (each step can be huge) and does not detect thrash. Budget
plus no-progress detection are the highest-value additions; repeat detection and a wall clock follow. **§9.9**

**Q13 — B.** Decomposition under ambiguity is where capability compounds — a bad plan wastes every spoke's
tokens. Spokes do bounded, well-specified work and can be cheap. **§9.6.2, §1.3.4**

**Q14 — B.** The structure is known, so code it. Dynamic decomposition spends model calls and can produce
lopsided or overlapping subtasks. A strong hybrid is model-proposes / code-validates, but here nothing needs
proposing. **§9.4.4**

**Q15 — B.** The agent's tool calls carry the requesting user's authorisations. A superuser service account
turns every prompt injection into a privilege-escalation vulnerability. **§13.5**

**Q16 — C.** The termination-reason distribution (goal / step limit / budget / error / escalation) localises a
regression immediately. Latency and spend are lagging and ambiguous. **§11.5, §12.7.3**

**Q17 — B.** Identical tools and permissions plus a fixed sequence means this is a workflow, or one agent with a
better prompt. You would otherwise pay handoff cost, lose shared context, and compound error. **§9.7, §16.3**

**Q18 — B.** Non-fork subagents start fresh: no conversation history, no output style, no parent auto memory,
no previous skill invocations. They do load the CLAUDE.md hierarchy and preloaded skills. Forks inherit
everything and share the cache. **§7.9.3**

**Q19 — B.** Capability separation. The reader can be fully compromised and still cannot act, because it holds
no credentials and can only emit a schema-validated object. A is the weakest layer; C is not a control; D is
detection, not prevention. **§13.2.3**

**Q20 — B.** Aggregation is arithmetic, not judgement. Implement it in code with a stated rule and a validator
that rejects a result whose confidence exceeds the minimum of its inputs. **§8.6.3, §12.6.3**

**Q21 — B.** Event-driven, with idempotent dedupe (at-least-once delivery), aggressive pre-filtering (most CI
failures are known patterns and should never reach a model), and a circuit breaker to prevent cascades where the
agent's own actions trigger more events. **§15.11**

**Q22 — B.** Variance comes from unbounded context growth, unbounded steps and unbounded retries. Bounding them
and routing simple work away from the agent collapses the distribution. A reduces the mean, not the variance.
**§14.4, §9.9**

**Q23 — B.** "If you can draw the flowchart, build the flowchart." **§16.2**

**Q24 — B.** Failures must be first-class in the handoff schema; omission converts a detectable outage into an
undetectable wrong answer. D is too blunt — the coordinator can usually proceed with partial coverage if it
knows about the gap. **§8.6.3, §12 Q4**

**Q25 — B.** A refusal is a policy decision, so the identical request refuses again. Read `stop_details`
(populated only for refusals), handle gracefully, and consider server-side fallbacks where available. **§2.4.2**

**Q26 — B.** A temporary git worktree per subagent gives real filesystem isolation so parallel agents do not
collide; results are merged afterwards. **§7.9.4**

**Q27 — B.** `PostToolBatch` fires after a batch of parallel calls resolves and can exit 2 to stop the agentic
loop before the next model call. A CLAUDE.md instruction is not enforcement. **§7.6.2**

### Domain 3 — Claude Code (Q28–Q47)

**Q28 — C.** CLAUDE.md and rules are context, delivered as a user message after the system prompt, with no
compliance guarantee. Hooks and permission rules are enforced by the harness regardless of what the model
decides. **§7.3.3, §7.5**

**Q29 — B.** Rules evaluate **deny → ask → allow**, first match wins, and specificity does not change the order.
A broad deny cannot carry allowlist exceptions — restructure the deny rule instead. **§7.5.2**

**Q30 — B.** Project-root CLAUDE.md, unscoped rules and auto memory are re-injected from disk. Path-scoped
rules and nested subdirectory CLAUDE.md files are lost until a matching file is read again. This is why
must-survive rules stay unscoped. **§7.3.7**

**Q31 — B.** A single leading slash anchors to the **settings source**, not the filesystem root. In user
settings that is `~/.claude/`. Use `//secrets/**` for a filesystem-absolute path. **§7.5.3**

**Q32 — C.** `dontAsk` auto-denies anything not pre-approved. `auto` auto-approves with background safety
checks; `acceptEdits` auto-accepts edits; `plan` is read-only exploration. **§7.5.1**

**Q33 — B.** PreToolUse fires *before* the commit, so exiting 2 blocks it and surfaces the lint output as the
reason. PostToolUse fires after the commit succeeded — too late. Pair with a PostToolUse lint on `Edit|Write`
for faster feedback. Keep the hook fast: a timed-out command hook does **not** block. **§7.6**

**Q34 — B.** `.claude/rules/` with `paths:` frontmatter loads instructions only when Claude reads matching
files. A longer root CLAUDE.md makes every session pay and reduces adherence for everyone. **§7.3.5**

**Q35 — B.** Deny-by-default with an explicit allowlist, no push rights (the agent commits to a branch; a
non-agentic step opens the PR), and OS-level enforcement via the sandbox with an egress allowlist. `bypassPermissions`
with real credentials is the canonical CI mistake. **§7.8.5, §13.7**

**Q36 — B.** They cover Claude's file tools and recognised file commands in Bash, but not arbitrary
subprocesses — a Python script the agent writes can open any file. OS-level enforcement requires the sandbox.
**§7.5.5**

**Q37 — B.** local → project → user → plugin → connector. The **entire entry** from the winning source is used;
fields are not merged. The three scopes match by name; plugins and connectors match by endpoint. **§6.6.2**

**Q38 — B.** Environment-variable expansion exists precisely so configuration can be committed while secrets
stay in the environment. Note that an unset variable with no default loads the literal `${VAR}` text and fails
later with a confusing auth error — give a default or validate at startup. **§6.6.3**

**Q39 — B.** A slash command is a prompt you invoke deliberately in the main context; a skill's description sits
in context and its body loads when invoked or judged relevant. Subagents are the third option, for work needing
its own context window or tool restrictions. **§7.8.3, §7.8.4**

**Q40 — B.** A bare-name deny removes the tool from Claude's context entirely — it never sees it. A scoped rule
like `Bash(rm *)` leaves the tool available and blocks matching calls. **§7.5.2**

**Q41 — B.** Wrappers like `timeout` and `nice` are stripped before matching, but **environment runners are
not**: `devbox run`, `npx`, `docker exec` execute their arguments, so the rule authorises whatever follows.
Write `Bash(devbox run npm test)` instead. **§7.4**

**Q42 — B.** Context isolation is the primary benefit. Subagents are a poor fit for small edits, chatty
iteration, or latency-critical work — spawning costs a full context setup. **§7.9.4**

**Q43 — B.** First 200 lines or 25KB, whichever comes first. Topic files load on demand. **§7.3.6**

**Q44 — B.** `/context` shows the live breakdown, including which memory files loaded. `/memory` opens them for
editing; an `InstructionsLoaded` hook logs load events for deeper debugging. **§7.10**

**Q45 — B.** Re-injected but truncated: 5,000 tokens per skill, 25,000 total, oldest dropped first, keeping the
start of the file — which is why the most important instructions go at the top of `SKILL.md`. **§7.3.7**

**Q46 — B.** A guarantee needs enforcement in more than one place: the `tools` allowlist limits the surface, a
PreToolUse hook validates the query deterministically, and a read-only database role means even a bypass cannot
write. A is not enforcement; C and D are partial. **§7.9.2, §6.7.3**

**Q47 — B.** Non-interactive contexts (`claude -p`, Agent SDK, cloud sessions) cannot show the approval prompt,
so project-scoped servers load without asking. Control them with `disabledMcpjsonServers` or `--setting-sources`.
This is a genuine CI supply-chain consideration. **§6.6.2, §7.7**

### Domain 4 — Prompt Engineering & Structured Output (Q48–Q67)

**Q48 — B.** Explicit criteria collapse the model's distribution onto one answer and make the behaviour
testable. A is not available on current models anyway (sampling parameters are removed). **§3.1.3**

**Q49 — B.** `strict: true` is a top-level field on the tool definition, alongside `name`/`description`/
`input_schema`, and requires `additionalProperties: false` and `required`. **§4.1.3**

**Q50 — B.** Numeric constraints are outside the supported JSON Schema subset. SDKs strip them and validate
client-side; constrained decoding does not enforce them. State the bound in the property description and
enforce it in a business-rule validator. **§4.2.1**

**Q51 — B.** Truncated output is not a validation error; parsing it produces plausible-but-incomplete objects.
Raise `max_tokens` (streaming is required for large ceilings) or split the input. **§4.3.1**

**Q52 — B.** `output_config: {format: {...}}` is canonical; `messages.parse()` is the recommended client path.
`output_format` is deprecated, and the forced-fake-tool trick is a legacy pattern. **§4.1.3, §4.4.2**

**Q53 — C.** Citations and `output_config.format` are incompatible and return a 400. Split across two calls if
you need both. Structured outputs do work with streaming, thinking and Batches. **§1.2.3, §4.4.3**

**Q54 — B.** Feed back the *specific* error ("`total_cents` must be an integer; you returned `'1,240.50'`") and
keep the failed attempt in history so the model can see what it produced. Bound the loop. **§4.3.2**

**Q55 — B.** `required` + nullable makes "absent from the source" distinguishable from "the model failed",
which you can then measure separately (per-field null rate is an early-warning signal). **§4.2.2, §4.5.2**

**Q56 — B.** Boundary cases teach the judgement boundary — the remaining high-value use of few-shot now that
structured outputs handle format. C is contamination; A adds little; D is hard to generalise from. **§3.3.2**

**Q57 — B.** The eval measures recall of material already in the prompt, so 97% is meaningless. Rebuild the eval
set from a disjoint production sample, hold out a test set, and sample production continuously. **§11.6.3**

**Q58 — B.** Stable content first (for caching), then data, with the **task last** — the strongest attention
position, immediately before generation. **§8.2.2**

**Q59 — B.** Any byte change in the prefix invalidates the cache, and the system prompt renders before
`messages`. Move volatile values into the user turn. Verify with `cache_read_input_tokens`. **§8.3.1**

**Q60 — B.** Adaptive thinking plus `effort`. `budget_tokens` is deprecated on 4.6 and returns a 400 on the
5-series and Opus 4.7/4.8. Prompted CoT is a fallback when you specifically need the reasoning text as output.
**§3.4.2**

**Q61 — B.** Adding an enum value breaks consumers that switch exhaustively. Version the schema, update
consumers first, then the producer. Keep a permanent `"other"`/nullable member as a safety valve and monitor its
rate. **§4.2.4, S15**

**Q62 — B.** Prompt-level instructions reduce success rates but do not eliminate them. The effective controls
are architectural: reduce capability, separate capabilities, restrict egress, and gate side-effecting actions
deterministically. **§13.2.2**

**Q63 — B.** Text in the system prompt carries operator authority. Deliver tenant personas as delimited data in
the user turn, prefer structured persona settings over free text, and enforce tool policy and output contracts
in code. **§3.5.2, §3.7 Q5**

**Q64 — B.** Constrained decoding guarantees shape, not truth. A valid object can contain wrong values, which is
why semantic evaluation and business-rule validation remain necessary. **§4.3.1, §4.5, Q6**

**Q65 — B.** Repair once with the specific error, then re-ask at a higher tier, then escalate to a human or a
DLQ. Three model attempts is almost always the right ceiling — beyond that the failure is systematic. **§4.3.3**

**Q66 — B.** New schemas incur a one-time compilation cost and are then cached for 24 hours. A dynamically
generated schema never hits that cache, so you pay the latency every request. Keep schemas static and versioned.
**§4.2.4**

**Q67 — B.** Constrain the argument space: enums, string formats, per-property descriptions, `strict: true`, and
tool-use examples on the definition. Prose length is not the lever. **§5.2.3, §5.2.4**

### Domain 2 — Tool Design & MCP (Q68–Q85)

**Q68 — B.** Every `tool_use` must be answered by a `tool_result` with a matching `tool_use_id`; omission is a
400. Set `is_error: true` and write a message that tells the model what failed, whether it is transient, and
what to do — that message is recovery context. **§5.6.1**

**Q69 — B.** All results from one assistant turn go back in a **single** user message. Splitting them silently
trains Claude to stop making parallel calls — a quiet performance regression rather than an error. **§2.2.3**

**Q70 — B.** Resources are application/user-controlled contextual data addressed by URI. Tools are
model-controlled; prompts are user-controlled; sampling is the server asking the host for inference. **§6.2**

**Q71 — B.** Protocol errors use JSON-RPC error objects; **tool execution failures return a successful result
with `isError: true`**, because a failed tool is information for the model, not a transport failure. Mirrors the
Claude API's `is_error`. **§6.1.3**

**Q72 — B.** Streamable HTTP is the recommended remote transport; it replaced the older two-endpoint HTTP+SSE
design, which is deprecated. stdio is for local subprocesses; WebSocket is niche and header-auth only. **§6.6.1**

**Q73 — B.** Both halves are required: `mcp_servers` defines the connection and a `mcp_toolset` entry in `tools`
must reference it by name. `mcp_servers` alone is a validation error. **§6.8.5**

**Q74 — B.** "May the model call `api_call`?" is not a useful authorisation question; argument accuracy is poor
because the model must reconstruct paths and bodies from memory; audit lines are indistinguishable; and the
harness cannot tell a safe GET from a destructive DELETE, so it must serialise. **§5.7.1, §5 Q5**

**Q75 — B.** Tool search **appends** discovered schemas rather than swapping the `tools` array, so the cached
prefix survives. Changing `tools` mid-session invalidates the entire cache. **§5.3.3, §8.3.1**

**Q76 — B.** `400 All tools have defer_loading set`. The search tool itself must not be deferred, and at least
one tool must remain loaded. **§5.3.3**

**Q77 — B.** Tenant isolation must never depend on a model-supplied value — untrusted content can influence it.
Derive the tenant from the authenticated token, remove the parameter from the schema, and enforce isolation at
the storage layer. **§6.8.4, §6 Q6**

**Q78 — B.** It forces a permission prompt on every call, even in `acceptEdits`, `auto` and
`bypassPermissions`, and allow rules do not skip it. In `dontAsk` mode the call is denied. Use it for
consent-shaped operations where auto-approval would mean no human ever agreed. **§6.7.3**

**Q79 — B.** Bash gives breadth but hands the harness an opaque string. Promote an action to a dedicated tool
when you need to gate it, enforce an invariant, render it, audit it, or mark it parallel-safe. **§5.5.3**

**Q80 — B.** MCP pays off with multiple consumers, independent team ownership, runtime discovery, and shipping
tools/prompts/resources as one versioned unit. With one consumer it is pure overhead. **§6.10, §16.6**

**Q81 — B.** `@latest` in a committed config is an auto-updating remote-code-execution channel, and tool
descriptions are prompt surface that a new version can poison. Pin versions, mirror packages, re-review
descriptions on upgrade, and alert on capability-set changes. **§6.7.2**

**Q82 — B.** Anthropic-defined tools are schema-less — declare by `type` and `name` only. Defining a custom tool
named `"bash"` creates a different tool without the built-in behaviour. **§5.2.5**

**Q83 — B.** Bound it at the source: project the fields the model needs, paginate, and signal truncation
explicitly so the model does not assert completeness. Claude Code warns above 10K tokens and caps at 25K by
default. **§5.2.3, §6.3.3**

**Q84 — B.** Authorising the tool is not enough. Checking that *this user* may read *that order* is what
prevents IDOR driven by a model that untrusted content can influence. **§5.5.2, §13.4**

**Q85 — C.** Sampling inverts the usual direction: the server asks the host to run an LLM completion. It is
powerful and a trust decision — hosts should require approval, and many do not implement it. **§6.2**

### Domain 5 — Context & Reliability (Q86–Q100)

**Q86 — B.** `tools → system → messages`. Any byte change invalidates everything after it, which is why volatile
content goes after the last breakpoint. **§2.1.2, §8.3.1**

**Q87 — B.** Something in the prefix is changing. Run the silent-invalidator audit: timestamps, per-request IDs,
non-deterministic JSON key ordering, per-user tool lists, mid-session system edits, mid-session model or tool
changes. **§8.3.1**

**Q88 — B.** The response carries a `compaction` block the API needs on the next request to substitute for the
compacted history. Appending only extracted text discards it, so each subsequent request looks like a
conversation with no compaction record. Append the full `content` list. **§2.4.3**

**Q89 — C.** Context editing prunes (`clear_tool_uses_20250919`, `clear_thinking_20251015`, beta
`context-management-2025-06-27`); compaction summarises (`compact_20260112`, beta `compact-2026-01-12`); memory
persists across sessions. **§8.3.2**

**Q90 — C.** 400 is a malformed request — retrying burns quota, multiplies latency and hides the real defect.
429 and 5xx are retryable with backoff; timeouts are retryable but require idempotency for side effects.
**§2.6.1, §12.3.1**

**Q91 — B.** Without jitter, every client that received a 429 at the same instant retries at the same instant,
sustaining the overload. Use full jitter and honour `retry-after`. **§12.3.2**

**Q92 — B.** An idempotency key derived from `tool_use_id` is stable across retries of the same tool call,
converting at-least-once delivery into effectively-once execution. Pair with reconciliation for non-idempotent
downstreams. **§2.6.4, §12.3.3**

**Q93 — B.** Attention is strongest at the extremes of a long context, so place rank 1 first and rank 2 last,
with the task at the very end. This directly mitigates lost-in-the-middle. **§8.2.2, §8.4.3**

**Q94 — B.** Goal, acceptance criteria, completed results with confidence and provenance, artefacts by
reference, open questions, constraints, budget, next action. Never a raw transcript. **§8.6.2**

**Q95 — B.** Self-reported confidence is typically over-confident and poorly calibrated. Collect
(confidence, correct?) pairs, plot the reliability curve, and choose thresholds from the observed data.
Re-check after every model or prompt change. **§11.3.3, §12.6.3**

**Q96 — B.** A mid-conversation `{"role": "system", ...}` message (Opus 5 / Opus 4.8 / Fable 5 / Mythos 5; not
Sonnet 5) carries operator authority without touching the cached prefix. Editing the top-level `system` field
invalidates everything after it. **§2.3.4, §8.3.1**

**Q97 — B.** A cache-hit-rate collapse is typically the earliest signal of a cost incident — it can appear
overnight with no deploy when a prefix invalidator ships. The invoice is the latest possible signal. **§12.7.3,
§18.4.2**

**Q98 — B.** Pre-filter inside the retrieval query so unauthorised vectors are never scored, and re-check cited
documents at answer time as defence in depth. Post-filtering leaks through result counts, ranks and latency.
**§10.11.1**

**Q99 — B.** A per-server timeout plus graceful degradation keeps the agent working with reduced capability;
a circuit breaker stops repeatedly calling a chronically failing server. Raising the timeout makes the user wait
longer for the same failure. **§6.9, S18**

**Q100 — B.** Long context is a capability, not a strategy. Cost, latency and context dilution usually favour
retrieving less, and a shared cached prefix cannot be access-controlled per user. **§8.4.4, §16.4**

---

## After the exam

1. **Score by domain**, not overall. A 78% that is 95% in D4 and 55% in D1 needs very different revision from an
   even 78%.
2. **Re-read only the sections your misses point to** — every explanation cites one.
3. **Redo the scenario bank (§21)** for the weakest domain.
4. **Then re-read §22 and §23**, which compress the reasoning into recall-speed form.
