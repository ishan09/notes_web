# Elixir / OTP / Phoenix — Level 2 Interview Sheet

Level 2 assumes Level 1 is solid. These topics probe design judgment, BEAM internals, production reasoning, and trade-off awareness. Expect "why" and "what goes wrong" over "what is".

---

## Topic Map

| # | Topic | File |
|---|-------|------|
| 1 | GenServer Design & Failure Modes | [02-genserver-stateful-services.md](02-beam-otp/02-genserver-stateful-services.md) |
| 2 | Supervision Strategies & Restart Storms | [03-supervision-fault-tolerance.md](02-beam-otp/03-supervision-fault-tolerance.md) |
| 3 | OTP Behaviours & Application Boot | [05-otp-behaviours.md](02-beam-otp/05-otp-behaviours.md) |
| 4 | BEAM Scheduler & GC Internals | [06-beam-runtime.md](02-beam-otp/06-beam-runtime.md) |
| 5 | Concurrency Patterns & Backpressure | [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md) |
| 6 | Ecto: Changesets, Transactions, Multi | [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md) |
| 7 | Contexts: Boundaries, Cross-Context Workflows | [04-contexts-application-boundaries.md](03-phoenix-ecto/04-contexts-application-boundaries.md) |
| 8 | LiveView: State, Events, PubSub Under Load | [02-liveview-real-time-ui.md](03-phoenix-ecto/02-liveview-real-time-ui.md) |
| 9 | PubSub: Clustering, Guarantees, Overload | [08-pubsub-topics-broadcasts.md](03-phoenix-ecto/08-pubsub-topics-broadcasts.md) |
| 10 | Error Handling: Process Crashes, Fallback | [10-phoenix-error-handling-performance.md](03-phoenix-ecto/10-phoenix-error-handling-performance.md) |
| 11 | Testing: OTP, Async, Integration Strategy | [01-exunit-testing.md](04-testing-production/01-exunit-testing.md) |
| 12 | Observability & Production Operations | [04-observability-operations.md](04-testing-production/04-observability-operations.md) |
| 13 | Distributed Nodes & Clustering Pitfalls | [07-distributed-nodes.md](02-beam-otp/07-distributed-nodes.md) |

---

## 1. GenServer Design & Failure Modes

**Questions:**

* When should you use `call` vs `cast`? What are the failure modes of each?
* How does a GenServer deadlock happen? How do you fix it?
* What happens to state when a GenServer crashes and is restarted?
* Why does large GenServer state cause latency spikes?
* How do you handle long-running work inside a GenServer without blocking it?

**Push to internals:**

* How does the BEAM scheduler treat a GenServer with a full mailbox?
* What happens if `handle_call` never returns a reply?
* Why does `GenServer.call` have a 5-second default timeout?
* How does `GenServer.reply/2` enable deferred responses?

**Key answers:**

- `call` is synchronous (caller blocks until reply); `cast` is fire-and-forget. Use `call` when the caller needs a result. `cast` failure: producer outruns consumer, mailbox grows silently, eventually OOM or timeouts.
- Deadlock: process A calls process B, which calls back process A synchronously. Fix: use `cast` for one direction, or `GenServer.reply/2` to respond before doing downstream work.
- On restart, state is reset by `init/1`. Any in-memory state from before the crash is gone. Use persistent storage if state must survive crashes.
- Large state means bigger GC per message cycle. BEAM GC is per-process — more heap = more work = higher per-message latency spikes.
- Delegate to a `Task`, send self a deferred message, or use `handle_continue/2` to sequence work after responding.

---

## 2. Supervision Strategies & Restart Storms

**Questions:**

* What's the difference between `one_for_one`, `one_for_all`, and `rest_for_one`?
* When would you use `DynamicSupervisor` over a static supervisor?
* What is a restart storm and how do you prevent one?
* What do `:permanent`, `:transient`, `:temporary` restart types mean?
* How does `max_restarts` / `max_seconds` work and why does it matter?

**Push to internals:**

* What happens when a supervisor exceeds its `max_restarts` within `max_seconds`?
* What's the signal flow when a supervised child crashes?
* Why is `terminate/2` not always called on a child?
* How does supervision interact with `start_link` vs `start`?

**Key answers:**

- `one_for_one`: only the crashed child restarts. `one_for_all`: all children restart. `rest_for_one`: crashed child and all children started after it restart. Use `one_for_all` only when children share state or must start in sync.
- `DynamicSupervisor` when you create children at runtime (per user, per connection). Static supervisor for a fixed known set of children.
- Restart storm: a child keeps crashing fast, supervisor keeps restarting until it hits `max_restarts` in `max_seconds`, then the supervisor itself exits. Fix: find the crash root cause; use `:transient` if some exits are normal; add backoff via circuit-breaker patterns.
- `:permanent` always restarts. `:transient` restarts only on abnormal exit. `:temporary` never restarts.
- When `max_restarts` is exceeded, the supervisor exits with reason `:shutdown`, propagating up the supervision tree.

---

## 3. OTP Behaviours & Application Boot

**Questions:**

* What OTP behaviours exist and when do you use each?
* What is the `Application` behaviour responsible for?
* How does OTP application boot order work?
* Why should callbacks be fast?
* What's the purpose of `init/1` in a supervisor?

**Push to internals:**

* What happens when `Application.start/2` is called?
* How does Mix know which applications to start?
* What's the risk of doing heavy work inside `Application.start/2`?
* How do you initialize state that depends on config available only at runtime?

**Key answers:**

- `GenServer` (stateful process), `Supervisor` (tree management), `Application` (boot/shutdown), `GenStage` (backpressure pipelines), `Task` (short-lived concurrent work).
- `Application` defines the supervision tree root. When the OTP app starts, `start/2` is called, you return `{:ok, pid}` of the root supervisor.
- `init/1` in a Supervisor returns child specs. The supervisor starts children in order. If any child fails to start, the supervisor exits.
- Slow `Application.start/2` blocks the entire VM startup. Offload slow initialization (DB connections, external service warm-up) to supervised workers that start asynchronously.
- Use `config/runtime.exs` for runtime config. For state that depends on it, initialize in the GenServer's `init/1` — it runs after the VM has loaded runtime config.

---

## 4. BEAM Scheduler & GC Internals

**Questions:**

* How does BEAM scheduling work? What is a "reduction"?
* Why doesn't a slow process block the whole VM?
* What is per-process GC and why does it matter?
* When does BEAM GC _not_ help — what still causes global pauses?
* How do dirty schedulers work and when do you need them?

**Push to internals:**

* What happens when a process's mailbox grows to millions of messages?
* How does message passing work for binaries vs small terms?
* What is the "binary heap" and why can binaries cause unexpected memory retention?
* Why can a single CPU-bound process still cause latency issues even with many schedulers?

**Key answers:**

- BEAM runs one scheduler thread per CPU core. Each process gets a budget of ~2000 reductions before being preempted. IO-blocking operations (DB call, socket) yield the scheduler immediately.
- Because the scheduler preempts after reductions. No process can run forever without yielding. But: a pure tight loop (no IO, no function calls as counted) can exhaust reductions slowly — still preempts eventually.
- Per-process GC: each process has its own heap. GC runs for one process at a time — no global stop-the-world. But very large process heaps mean longer individual GC pauses for that process.
- Large shared binaries (>64 bytes) live on a separate "binary heap" shared between processes. A reference in any process prevents GC of the binary. Slicing a 100MB binary and keeping the slice alive keeps the whole 100MB alive.
- Dirty schedulers are for long-running NIFs or blocking OS calls. Without them, a blocking NIF ties up a regular scheduler and starves all processes on that core.

---

## 5. Concurrency Patterns & Backpressure

**Questions:**

* When would you use `Task.async` vs `Task.async_stream`?
* What is backpressure and why does `GenServer.cast` have none?
* How does `Broadway` / `GenStage` solve backpressure?
* What happens when you spawn unbounded processes for a high-volume workload?
* How do you implement a bounded work pool in Elixir?

**Push to internals:**

* How does `Task.async_stream` limit concurrency?
* What's the failure model of `Task.async` — what happens if a task crashes?
* Why is `Agent` rarely the right tool for high-throughput state?
* When does ETS outperform a GenServer for state access?

**Key answers:**

- `Task.async` for a small known set of concurrent tasks with `await`. `Task.async_stream` for processing a collection with bounded concurrency (`max_concurrency` option).
- Backpressure: slowing producers when consumers can't keep up. `cast` has none — producer sends indefinitely, receiver mailbox grows until OOM.
- Broadway/GenStage: producers emit demand signals; consumers pull work at their own rate. Demand flows upstream, data flows downstream. Producers only emit when consumers request.
- Unbounded spawns: you eventually exhaust memory or scheduler capacity. Use `Task.Supervisor` with `async_stream` or a pool (like `Poolboy`) to cap concurrency.
- ETS: concurrent reads from multiple processes without message passing. A GenServer is a single process — serialized access. ETS allows parallel readers. Use ETS for read-heavy shared lookups; GenServer for writes that need consistency.

---

## 6. Ecto: Changesets, Transactions, Multi

**Questions:**

* What is a changeset and what does it separate from a schema?
* How does `Ecto.Multi` differ from wrapping code in `Repo.transaction`?
* How do you handle a DB unique constraint violation in a changeset?
* What's the N+1 problem and how does Ecto surface it?
* How does connection pooling work and what happens under saturation?

**Push to internals:**

* How does `cast/3` differ from `change/2`?
* What does `validate_required` actually check — presence vs nil?
* How are DB constraint errors different from changeset validation errors?
* What happens inside `Repo.transaction` if one step fails halfway through a `Multi`?

**Key answers:**

- Changeset separates validation and data transformation from the schema struct. A schema defines shape; a changeset applies and validates changes without committing to the DB.
- `Ecto.Multi` names each step, runs them atomically, and returns `{:error, step_name, reason, changes_so_far}` on failure — you know which step failed. Raw `Repo.transaction` gives less structured error information.
- Use `unique_constraint/2` in the changeset to map a DB unique index error to a changeset error. Without this, the DB error raises an unhandled exception.
- N+1: fetching 100 users then `Repo.preload`-ing their orders one by one = 101 queries. Ecto surfaces it by not auto-loading associations — you must explicitly `preload`. Use `Repo.preload` or join in the initial query.
- Pool exhausted: calls queue up waiting for a connection. After `queue_timeout` (default 5s) they raise `DBConnection.ConnectionError`. Fix: increase `pool_size`, optimize slow queries, or shed load.

---

## 7. Contexts: Boundaries & Cross-Context Workflows

**Questions:**

* What makes a "leaky" context? How do you detect it?
* How do you handle workflows that span two contexts?
* Should contexts call each other? What are the alternatives?
* Why shouldn't `conn` or controller params flow into context functions?
* What's a "god context" and how do you fix it?

**Push to internals:**

* How do you enforce context boundaries in a large codebase?
* How does boundary crossing in Ecto Multi work across contexts?
* What's the impact of circular context dependencies?
* How do contexts relate to Oban jobs?

**Key answers:**

- Leaky context: controllers need to know changeset field names, schema internals, or raw query results to function. Sign: controllers import internal context modules or call `Repo` directly.
- Cross-context workflows: use a higher-level orchestrator function (sometimes called a "workflow" or "service" module) that composes context APIs. Or use `Ecto.Multi` with steps from multiple contexts.
- Contexts shouldn't freely call each other — it creates coupling. Prefer: (1) one context owns the operation and calls the other as a dependency, (2) an orchestrator module at a higher level composes them.
- Contexts should receive plain data, not `conn`. This keeps them usable from jobs, CLI, and tests without a web context. Never pass Phoenix-specific types into domain code.
- God context: one context that handles everything in a domain. Split by sub-capability. `Accounts` → `Accounts.Users`, `Accounts.Sessions`, `Accounts.Billing`.

---

## 8. LiveView: State, Events, PubSub Under Load

**Questions:**

* How do you handle slow `handle_event` calls in LiveView without blocking the UI?
* What's the capacity cost of LiveView vs stateless HTTP?
* How does LiveView reconnect after a crash? What state is preserved?
* How do you keep `socket.assigns` small in a data-heavy LiveView?
* How does LiveView interact with PubSub for multi-client updates?

**Push to internals:**

* How does the diff algorithm decide what to send to the client?
* What happens to queued events during a LiveView reconnect?
* Why can `phx-debounce` matter for server load?
* What is `handle_async/3` (LiveView 0.20+) and why does it exist?

**Key answers:**

- Slow `handle_event`: use `assign_async/3` or `start_async/3` (LiveView 0.20+) to run work in a separate task. The socket stays responsive; you get a callback when the async work completes.
- Capacity: each LiveView client = one BEAM process + memory for `socket.assigns`. Plan for persistent memory per concurrent user vs stateless HTTP which is fire-and-forget per request.
- On crash: client auto-reconnects, `mount/2` is called again with `connected?: true`. State is re-initialized from scratch. No state persists across reconnects — design for this by deriving state from DB/PubSub on mount.
- Small assigns: store IDs or minimal structs, not large preloaded graphs. Load full data lazily. Use pagination. Pass only what the current render needs.
- PubSub flow: subscribe in `mount/2` → broadcast in context/event handler → `handle_info/2` receives message → update assigns → re-render diff.

---

## 9. PubSub: Clustering, Guarantees, Overload

**Questions:**

* What delivery guarantees does Phoenix.PubSub provide?
* How does PubSub behave during a network partition in a cluster?
* What happens if a subscriber process is overloaded?
* How do you prevent a single broadcast from overwhelming all subscribers?
* When should you replace PubSub with Kafka or RabbitMQ?

**Push to internals:**

* How does PubSub route messages across cluster nodes?
* What is the difference between local and distributed PubSub adapters?
* How does Presence use PubSub to track connected clients?
* What's the memory impact of many PubSub subscribers on the same topic?

**Key answers:**

- PubSub is **best-effort, in-process, no durability**. No retries, no persistence. A message broadcast while a subscriber is dead is lost.
- Partition: PubSub (using Phoenix.PubSub.PG2 or Gossip adapter) may not deliver to nodes on the other side of the partition. Clients on the partitioned node miss broadcasts until reconnect.
- Overloaded subscriber: messages queue in its mailbox. If not consumed fast enough, memory grows. Eventually the process may crash or cause GC pressure.
- Throttle: coalesce rapid events into a single broadcast, or debounce at the source. Have subscribers fetch on demand rather than receiving full payloads.
- Replace with Kafka/RabbitMQ when: you need durable delivery, replay, cross-service integration, strong ordering, or delivery guarantees beyond best-effort.

---

## 10. Error Handling: Process Crashes, Fallback, Supervision

**Questions:**

* What is the fallback controller pattern and when should you use it?
* How do you handle `{:error, :not_found}` consistently across many controllers?
* What is the `with` pattern and when does it help with error flow?
* What's the difference between a Phoenix error and a process crash?
* How does `Plug.ErrorHandler` differ from a fallback controller?

**Push to internals:**

* What happens step-by-step when a controller raises an unhandled exception?
* How does `action_fallback` hook into the Phoenix controller lifecycle?
* Why does Phoenix not restart request processes after a crash?
* What's the role of telemetry in error observability?

**Key answers:**

- Fallback controller: `action_fallback MyModule` declares a module that handles unmatched return values from controller actions. When an action returns `{:error, reason}`, Phoenix calls `FallbackController.call(conn, {:error, reason})`.
- Centralize error-to-HTTP translation in one fallback module. All controllers use it. Result: consistent error shapes, no copy-paste error rendering.
- `with` chains: `with {:ok, user} <- get_user(id), {:ok, order} <- get_order(user)` — on first mismatch, falls through to the `else` clause. Clean sequential happy-path with unified error handling at the end.
- Phoenix error: expected domain error returned as `{:error, reason}`, handled by fallback or `rescue`. Process crash: unhandled exception kills the process, Cowboy closes the connection, Phoenix logs it.
- Request processes are not supervised for restart — they are fire-and-forget by design. A crashed request just fails. The server stays up.

---

## 11. Testing: OTP, Async, Integration Strategy

**Questions:**

* How do you test a GenServer without exposing internal state?
* Why can `async: true` tests cause flakiness?
* How do you test supervision behavior — restarts, failures?
* What's the right balance between unit and integration tests in Elixir?
* How do you test LiveView interactions?

**Push to internals:**

* How does `Ecto.Adapters.SQL.Sandbox` enable async DB tests?
* What is `assert_receive` and when does it beat polling?
* How do you test OTP message ordering?
* What's a `Mox` mock and how does it enforce compile-time behaviour contracts?

**Key answers:**

- Test GenServer via its public API (client functions). Assert responses, side effects, messages. Don't reach into state via `:sys.get_state` unless debugging — it makes tests brittle.
- `async: true` is safe only when tests are fully isolated (no shared DB writes, no global config, no named processes with clashing names). Use `Ecto.Sandbox` for DB; use unique process names per test for OTP.
- Supervision tests: start a supervision tree in the test, use `Process.exit(pid, :kill)` to induce a crash, then `assert_receive` or poll for the restarted child. Use `:sys.get_state` to verify restarted state.
- Unit tests: pure functions, context functions, changeset logic. Integration tests: full request path (Phoenix.ConnTest), Ecto DB operations, Oban jobs. More unit, fewer integration — but integration for boundary contracts.
- LiveView tests: `Phoenix.LiveViewTest` module. `live/2` mounts the LiveView, `render_click/2`, `render_submit/2`, `assert_html` to assert DOM state. No browser needed.

---

## 12. Observability & Production Operations

**Questions:**

* What metrics should you monitor on an Elixir/Phoenix app?
* How do you diagnose a memory leak in production without restarting?
* What does a growing message queue on a GenServer tell you?
* How do Telemetry events work in Phoenix and Ecto?
* How do you trace a slow request end-to-end?

**Push to internals:**

* What BEAM introspection tools can you use without stopping the VM?
* What is `:recon` and what can it tell you?
* How does `Phoenix.LiveDashboard` surface BEAM internals?
* What's the relationship between `telemetry` library events and metrics?

**Key answers:**

- Monitor: request latency (p50/p95/p99), error rates, DB query times, connection pool utilization, BEAM process count, message queue lengths, memory per process, supervisor restart rates.
- Memory leak diagnosis: use `:observer.start()` or `:recon.proc_count(:memory, 10)` to find top processes by memory. Look for growing mailboxes (unconsumed messages), large binary references, or leaking processes that aren't being terminated.
- Growing GenServer mailbox: the process is slower than producers. Either the `handle_*` callbacks are too slow, or load has increased. Fix: shard the GenServer, make callbacks faster, add backpressure upstream.
- Telemetry events: `:telemetry.execute/3` emits named events. Phoenix and Ecto emit built-in events (`[:phoenix, :endpoint, :stop]`, `[:ecto, :query]`). Attach handlers with `:telemetry.attach/4` to forward to Prometheus, StatsD, etc.
- Slow request tracing: attach correlation ID in a plug, propagate through context calls, emit telemetry at each layer, aggregate in your APM (AppSignal, Datadog, etc.). Use `:recon_trace` for targeted function tracing in production without stopping the VM.

---

## 13. Distributed Nodes & Clustering Pitfalls

**Questions:**

* How do you connect two BEAM nodes?
* What can go wrong with distributed Erlang in production?
* How does Phoenix PubSub handle clustering?
* What is "split brain" and why is it dangerous?
* How do you avoid global singleton traps in a cluster?

**Push to internals:**

* What is the role of the Erlang port mapper daemon (EPMD)?
* How does `libcluster` help with dynamic node discovery?
* What happens to a named GenServer registered globally when a partition heals?
* Why is `:global` module usage considered risky?

**Key answers:**

- Connect nodes: `Node.connect(:"node@host")`. Requires same Erlang cookie (`--cookie` or `~/.erlang.cookie`). EPMD (port mapper daemon) on each host resolves node names to ports.
- Production pitfalls: network partitions split the cluster, netsplits cause inconsistent distributed state, global registration conflicts on reconnect, clock skew causes ordering issues.
- PubSub clustering: Phoenix.PubSub.PG2 uses process groups. On partition: messages only reach nodes in the same partition. Use a distributed adapter (Redis-backed) for strong cross-node delivery.
- Split brain: two cluster halves each believe they are primary. Named process registrations can collide. Fix: don't rely on distributed global state; make services stateless or use external consensus (e.g., PostgreSQL advisory locks, etcd).
- Avoid `:global` registered names — conflicts on partition heal can kill processes. Prefer `Registry` (local) or `Horde` (distributed registry with CRDT-based conflict resolution).

---

## Rapid-Fire Level 2

| Question | Answer |
|----------|--------|
| What's the default `GenServer.call` timeout? | 5000ms |
| How do you make a GenServer respond before finishing work? | `GenServer.reply/2` then continue in `handle_continue/2` |
| What supervision strategy restarts all siblings on one failure? | `one_for_all` |
| What OTP behaviour manages app boot/shutdown? | `Application` |
| What does `:transient` restart mean? | Restart only on abnormal exits, not normal `:normal` shutdown |
| ETS vs GenServer for reads? | ETS for concurrent reads (no message overhead); GenServer for writes that need serialization |
| What does Ecto.Multi return on a step failure? | `{:error, step_name, failed_value, changes_so_far}` |
| How do you cast/validate in Ecto without a DB table? | Use an embedded schema with `embedded_schema` and changesets |
| How does `with` handle errors? | Stops on first non-matching clause, runs `else` block with the non-matching value |
| What library for distributed process registry with CRDT? | `Horde` |
| Where do binaries >64 bytes live in BEAM memory? | Shared binary heap (separate from process heap) |
| What's the risk of `GenServer.cast` under load? | Mailbox grows unbounded — no backpressure |

---

## How to Use This

- **Level 2** → go deep. Give the internal model, not just the surface definition.
- **Expect "what goes wrong"** questions — have a failure story for each topic.
- **Design trade-offs** matter more than syntax — explain *why* you'd choose X over Y.
- Combine with rapid-fire to warm up before interviews.
