# Elixir / OTP / Phoenix — Senior Interview Sheet (levle-2 → see level-2.md)

> **Note**: This file duplicates level-2 coverage. The canonical Level 2 sheet with full answers is at [level-2.md](level-2.md). This file is kept as a topic index mapping the original question set to deep-dive files.

---

## Topic Map

| # | Topic | File |
|---|-------|------|
| 1 | BEAM Concurrency Model (processes, schedulers, reductions) | [06-beam-runtime.md](02-beam-otp/06-beam-runtime.md) |
| 2 | Process Lifecycle & Fault Tolerance (crash, links, monitors, cascade) | [01-processes-message-passing.md](02-beam-otp/01-processes-message-passing.md) |
| 3 | Supervision Trees (strategies, restart storms, child specs) | [03-supervision-fault-tolerance.md](02-beam-otp/03-supervision-fault-tolerance.md) |
| 4 | Phoenix Supervision Tree (Endpoint, Repo, PubSub, Cowboy) | [03-supervision-fault-tolerance.md](02-beam-otp/03-supervision-fault-tolerance.md) |
| 5 | GenServer Deep Dive (blocking, mailbox growth, backpressure) | [02-genserver-stateful-services.md](02-beam-otp/02-genserver-stateful-services.md) |
| 6 | Task vs GenServer vs Agent | [02-genserver-stateful-services.md](02-beam-otp/02-genserver-stateful-services.md) |
| 7 | Ecto Pooling & DB Pressure (pool tuning, queue_time, replicas) | [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md) |
| 8 | Backpressure & Load Handling (circuit breaker, load shedding) | [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md) |
| 9 | Phoenix Channels / PubSub (lifecycle, adapters, clustering) | [08-pubsub-topics-broadcasts.md](03-phoenix-ecto/08-pubsub-topics-broadcasts.md) |
| 10 | LiveView Internals (state, diff, crash, reconnect, handle_info) | [02-liveview-real-time-ui.md](03-phoenix-ecto/02-liveview-real-time-ui.md) |
| 11 | Umbrella Applications (structure, boundaries, migrations) | [05-otp-behaviours.md](02-beam-otp/05-otp-behaviours.md) |
| 12 | Boundaries & Architecture (PubSub vs direct calls, cyclic deps) | [05-otp-behaviours.md](02-beam-otp/05-otp-behaviours.md) |
| 13 | Migrations & Repos in Umbrella | [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md) |
| 14 | Deployment & Releases (zero-downtime, rolling, blue-green) | [03-deployment-releases.md](04-testing-production/03-deployment-releases.md) |
| 15 | Observability & Debugging (Telemetry, :recon, memory leaks) | [04-observability-operations.md](04-testing-production/04-observability-operations.md) |
| 16 | Failure Scenarios (DB pool, slow API, GenServer hotspot) | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 17 | Performance Optimization (schedulers, dirty schedulers, ETS) | [06-beam-runtime.md](02-beam-otp/06-beam-runtime.md) |
| 18 | ETS / Caching (ETS vs GenServer, concurrency flags, limitations) | [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md) |

---

## Rapid Fire (Senior Filter) — With Answers

| Question | Answer |
|----------|--------|
| What happens if a GenServer mailbox fills up? | Callers block on `call` until timeout; `cast` callers don't notice but messages queue; eventually OOM or cascading timeouts |
| Can a process starve others? | Rarely — reductions prevent starvation for Elixir code; blocking NIFs CAN freeze a scheduler thread |
| How does BEAM ensure fairness? | Reduction-based preemption + work-stealing between scheduler threads |
| What is reduction quota? | ~2000 reductions per scheduler timeslice before preemption |
| Why is blocking dangerous in BEAM? | A blocking NIF (non-dirty) freezes the entire scheduler thread, starving all processes on that core |
| How do you kill a runaway process? | `Process.exit(pid, :kill)` — cannot be trapped. Find pid via `:recon.proc_count` |
| What is `:observer` used for? | GUI tool showing process list, memory, scheduler load, supervision tree, ETS tables |
| How do you inspect a live system? | `:recon.proc_count(:message_queue_len, 10)`, `:recon_trace.calls/3`, `Process.info(pid)`, remote IEx console |
| ETS vs GenServer for reads? | ETS: concurrent reads with no message overhead. GenServer: serialized access, one message at a time |
| What adapter does Phoenix.PubSub use? | `Phoenix.PubSub.PG2` by default (uses Erlang process groups). Redis adapter available for distributed setups |
| How does LiveView reconnect? | `liveview.js` auto-reconnects via WebSocket. Server calls `mount/2` fresh. State re-initialized from DB |
| What is `handle_info/2` in LiveView? | Handles async messages (PubSub events, Task results, timers, monitors) sent to the LiveView process mailbox |
