# Supervision Trees and Fault Tolerance

Supervision is a core OTP idea: let processes fail, then restart them predictably.

## What Happens on Crash?

- A crashing process exits with a reason.
- If it is linked to a supervisor (common via `start_link`), the supervisor observes the exit.
- The supervisor applies the configured restart policy and strategy to decide what to restart.

## Core Concepts

- **Supervisor** watches child processes
- **Restart strategy** controls how failures are handled
- **Intensity and period** limit crash loops
- **One-for-one** restarts only the failed child
- **One-for-all** restarts the full set of children
- **Child specs** define how to start and restart children
- **DynamicSupervisor** is used for many similar children started at runtime

## Why This Matters

- Fault tolerance becomes a design default instead of an afterthought.
- Each process has a clear lifecycle and recovery policy.
- You can compose resilient systems from small, testable units.

## Example Mental Model

- Database connection worker fails
- Supervisor restarts just that worker
- Other workers continue running

## Practical Notes

- Use `:permanent`, `:transient`, and `:temporary` restart types intentionally.
- Prevent restart storms with sensible intensity/period and by fixing crash loops at the source.
- Use `DynamicSupervisor` for per-request or per-entity workers that you don’t want statically declared.

## Common Questions (With Answers)

1. **Why is `let it crash` considered safe in OTP?**
   Because failures are expected and managed by supervision. Instead of hiding errors, processes fail fast and are restarted into a known good state.

2. **What is the difference between `one_for_one` and `one_for_all`?**
   `one_for_one` restarts only the failing child; `one_for_all` restarts all children if any child fails, useful when children are tightly coupled.

3. **How do you prevent restart storms?**
   Fix the root cause, tune restart intensity/period, use backoff patterns, and choose restart types carefully (for example `:transient`).

4. **What is a child specification?**
   A map describing how to start, stop, and restart a child, including `id`, `start` MFA, `restart`, and `type`.

5. **When should you use `DynamicSupervisor`?**
   When the set of children is dynamic, such as per-user workers, per-connection workers, or sharded partitions created at runtime.

## Advanced Questions (With Answers)

1. **What’s a common mistake with `one_for_all`?**
   Restarting unrelated children on a single failure, creating unnecessary churn and cascading outages. Use it only when children are truly interdependent.

2. **How do you decide `:permanent` vs `:transient`?**
   Use `:permanent` for workers that must always run. Use `:transient` when normal shutdown is expected but crashes should restart.

3. **How can supervision hide bugs?**
   If you restart too aggressively without alerting, a crash loop can quietly degrade service. Pair supervision with observability and alerts.

4. **Why are supervisors usually not responsible for business logic?**
   They should manage lifecycle, not domain behavior. Mixing concerns makes failures harder to reason about.

5. **What is a “crash loop” and why is it operationally dangerous?**
   A worker repeatedly crashes and restarts, consuming CPU, generating logs/noise, and often amplifying load on dependencies.

---

## Phoenix Supervision Tree

### What does a Phoenix app supervision tree look like?

```
MyApp.Application
├── MyApp.Repo                    ← DB connection pool (DBConnection)
├── {Phoenix.PubSub, name: ...}   ← PubSub dispatcher
├── MyAppWeb.Telemetry            ← Telemetry supervisors + handlers
├── MyAppWeb.Endpoint             ← HTTP server (Cowboy/Bandit)
│   ├── Cowboy acceptors          ← listen on port, one per connection
│   └── (WebSocket processes)     ← spawned per upgrade
└── MyApp.Oban (if used)          ← job queue workers
```

Each component is supervised independently. If `Repo` crashes, it restarts without affecting `Endpoint` or `PubSub`.

### What does Endpoint supervise?

`MyAppWeb.Endpoint` supervises the HTTP server (Cowboy or Bandit), its acceptors, and manages the port binding. It also owns the socket configuration, SSL, and static file serving setup. Cowboy acceptors spawn a new process per incoming HTTP connection.

### Where does Cowboy fit?

Cowboy is started as a child of the Endpoint supervisor. It owns the TCP listener and spawns a **process per HTTP connection**. The connection process handles the full HTTP request lifecycle — reading, routing via Plug, and writing the response.

### What process handles an HTTP connection?

```
Cowboy listener (supervisor)
  └── per-connection process (spawned by Cowboy)
        ├── reads TCP data
        ├── parses HTTP
        ├── calls Plug pipeline (Phoenix router → controller)
        └── writes response, then exits
```

Each request runs in its own isolated BEAM process. Crashes in one request don't affect others.

### What process owns a WebSocket?

After a WebSocket upgrade (HTTP → WS), Cowboy transfers the connection to a **channel/LiveView process**. For Phoenix Channels, a `Phoenix.Channel` process is spawned per join. For LiveView, a `Phoenix.LiveView.Channel` process is spawned. That process lives for the duration of the WebSocket connection.

### How are requests isolated?

Each HTTP request gets its own BEAM process. The process owns the `conn` struct, executes the Plug pipeline, calls context functions, and exits when the response is sent. A crash in any request process only affects that request — the acceptor supervisor keeps accepting new connections uninterrupted.

### What happens if a supervisor crashes?

If a supervisor itself crashes, its parent supervisor applies its restart strategy to that supervisor. The crashed supervisor's children are all terminated first (as part of the supervisor shutdown), then the supervisor is restarted and re-initializes its children from scratch. This is why supervision trees are hierarchical — failures bubble up predictably.

### How do you avoid restart loops in a supervision tree?

1. **Set `max_restarts` and `max_seconds`**: defaults are 3 restarts in 5 seconds. Tune based on expected crash patterns.
2. **Fix the root cause**: supervision masks the symptom but the crash recurs. Add logging/telemetry to detect crash patterns quickly.
3. **Use `:transient`** for workers that have expected normal exits — they won't trigger restart counts unnecessarily.
4. **Add backoff**: for workers that depend on external services, use a backoff strategy (e.g., exponential delays in `init/1`) to avoid hammering a down dependency.
5. **Alert on restart rates**: unexpected restart spikes are often the first signal of a systemic issue.

### How does a supervisor track children?

The supervisor keeps an internal list of child specs and maps each running child's PID to its spec. When a child exits, the supervisor matches the PID in its tracking map to determine which spec to restart. Child specs include the `id`, `start` MFA, `restart` type, and `shutdown` strategy. You can inspect a running supervisor's children with `Supervisor.which_children(pid)`.
