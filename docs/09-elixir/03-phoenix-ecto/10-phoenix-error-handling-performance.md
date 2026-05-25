# Phoenix Error Handling and Performance

## Error Handling

### How Phoenix Handles Errors

Phoenix has multiple layers for error handling:

```
Request crashes/errors
  │
  ├─ Plug error (halted conn) ──────────────► Returns response immediately
  │
  ├─ Controller exception ──────────────────► Phoenix.ErrorView (renders 500)
  │
  ├─ Route not found ───────────────────────► Phoenix.ErrorView (renders 404)
  │
  └─ Process crash ─────────────────────────► Request process dies, client gets TCP close
                                              Supervisor does NOT restart (one-shot process)
```

### Fallback Controller

```elixir
defmodule MyAppWeb.FallbackController do
  use Phoenix.Controller

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"404")
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"401")
  end
end
```

```elixir
defmodule MyAppWeb.UserController do
  use Phoenix.Controller

  action_fallback MyAppWeb.FallbackController

  def show(conn, %{"id" => id}) do
    with {:ok, user} <- Accounts.get_user(id) do
      render(conn, :show, user: user)
    end
  end
end
```

When a controller action returns `{:error, reason}`, Phoenix calls the fallback controller's `call/2` with that error. This centralizes error rendering and keeps controller actions clean.

### Process Crashes Mid-Request

When a request process crashes:
1. The BEAM terminates that process.
2. The connection is closed — the client receives a TCP reset or incomplete response.
3. Phoenix logs the error via Logger/Telemetry.
4. No other requests are affected — complete isolation.
5. The Cowboy acceptor process continues accepting new connections.

Phoenix maintains system stability through BEAM's process isolation. A buggy request can only kill its own process, not the server.

### 404 and 500 Handling

Phoenix renders `ErrorView` (or `ErrorHTML`/`ErrorJSON` in newer versions) for unhandled errors:

- **404**: Triggered when no route matches. Phoenix calls `ErrorView.render("404.html", ...)`.
- **500**: Triggered on unhandled exceptions in controllers. Phoenix calls `ErrorView.render("500.html", ...)`.

In production (`config :phoenix, debug_errors: false`), error views render clean user-facing pages. In dev, Phoenix shows detailed error pages with stack traces.

## Performance

### Why Is Phoenix Fast?

1. **Lightweight processes**: BEAM processes start in ~1-3μs and use ~2KB memory. You can run millions on a single server.
2. **Preemptive scheduling**: The BEAM scheduler gives each process a fixed number of reductions (operations) before preempting. No process starves others.
3. **Non-blocking IO**: DB calls, HTTP calls, and file IO are non-blocking. Waiting processes are suspended; the scheduler moves to runnable processes.
4. **Compiled plug pipelines**: `Plug.Builder` compiles pipelines at build time — no runtime dispatch overhead.
5. **Process-per-request isolation**: No shared mutable state between requests, so no locks or mutex contention.

### What Limits Throughput?

- **Database connection pool**: Under high load, requests queue waiting for DB connections. Tune `pool_size` to match DB capacity.
- **Slow queries or N+1**: One slow DB call can block a process and starve the pool.
- **External HTTP calls in request path**: Any synchronous external call blocks the request process. Offload to jobs or use async patterns.
- **Blocking operations**: Calling `Process.sleep`, heavy CPU computation, or any blocking FFI in a request process starves the scheduler.
- **LiveView connection count**: Each LiveView client is a persistent process with memory. Connection count is bounded by available memory.

### What Happens If a Process Blocks?

BEAM's scheduler is **preemptive for reductions** but not fully preemptive for CPU-bound work. A process doing a very long pure computation (no IO, no function calls counted by the scheduler) can temporarily starve other processes on that scheduler thread. The solution: break heavy CPU work into smaller chunks or offload to `Task.async/1` with a separate process, or use `:cpu_feedback` dirty NIFs.

For IO-bound blocking (waiting on a port, NIF, or `:timer.sleep`): BEAM suspends the waiting process and runs other processes — no starvation.

### How to Detect Bottlenecks

- **`:observer.start()`** — built-in GUI tool showing process counts, memory, message queues, scheduler utilization.
- **Telemetry + Phoenix.LiveDashboard** — real-time metrics on requests/sec, DB query times, process counts.
- **`Repo` slow query logging** — set `log: :debug` in Repo config to log all queries with timing.
- **`:recon` library** — production-safe introspection without stopping the VM.
- **Long message queues on a process** — a sign that a GenServer or process is a bottleneck.

## Common Questions (With Answers)

1. **How does Phoenix handle errors?**
   Through a layered system: Plug can halt connections early, controllers use action fallback for domain errors, and unhandled exceptions render via `ErrorView`. Process crashes are isolated — no cascading failures.

2. **What is a fallback controller?**
   A module that handles unmatched return values from controller actions (typically `{:error, reason}`). Declared with `action_fallback MyApp.FallbackController`. It centralizes error-to-response translation.

3. **How do you handle 404/500?**
   Define `ErrorView` (or `ErrorHTML`/`ErrorJSON`) templates and handle the relevant error atoms in the fallback controller. Phoenix routes `NoRouteError` to 404 and unhandled exceptions to 500 automatically.

4. **Why is Phoenix fast?**
   Lightweight BEAM processes, preemptive scheduling, non-blocking IO, compile-time plug pipelines, and no shared mutable state between requests.

5. **What limits throughput?**
   DB connection pool exhaustion, slow queries, external HTTP calls in the request path, and large LiveView connection counts.

## Advanced Questions (With Answers)

1. **What happens when a process crashes mid-request?**
   The request process terminates. The client's connection is dropped. No other requests are affected. Phoenix logs the error. The Cowboy acceptor keeps accepting new connections. There is no supervisor that restarts request processes — they are fire-and-forget.

2. **How does Phoenix ensure system stability?**
   BEAM process isolation means a crashing request can't affect other processes. The web server (Cowboy), router, and application supervisors all run in separate processes/supervision trees. A buggy request process dies alone.

3. **What happens if a process blocks?**
   For IO-bound blocking: BEAM suspends the process and schedules others — no starvation. For CPU-bound blocking (tight loop): the process can temporarily monopolize a scheduler thread. Use dirty schedulers or Task for heavy CPU work to avoid this.

4. **How do you detect bottlenecks?**
   Use `:observer.start()` for live process inspection, Phoenix.LiveDashboard for request/DB metrics, slow query logging in Repo, and `:recon` for production-safe introspection. Long message queues on a single GenServer often reveal the bottleneck.

5. **How does BEAM scheduler distribute work?**
   BEAM runs one scheduler thread per CPU core (by default). Each scheduler has a run queue of ready processes. When a process is preempted (uses its reductions) or blocks on IO, it's removed from the run queue and another process runs. Work-stealing between schedulers balances load across cores.
