# Concurrency Patterns and Performance

Elixir is strong at concurrency, but good design still matters. The runtime helps, but you still need to choose the right patterns.

## Core Concepts

- **Task** for short-lived concurrent work
- **Agent** for simple mutable state
- **GenStage / Broadway** for backpressure and pipelines
- **Parallel work** for independent jobs
- **Backpressure** to avoid overwhelming downstream systems
- **Messaging** as the core coordination mechanism

## Practical Notes

- Use concurrency when tasks are independent.
- Avoid spawning work without bounds.
- Measure message queue growth and process counts in production.
- Prefer clear ownership of state over clever sharing.

## Common Questions (With Answers)

1. **When would you use `Task` instead of `GenServer`?**
   Use `Task` for short-lived work you want to run concurrently. Use `GenServer` for long-lived stateful services and serialized access to state.

2. **What problem does backpressure solve?**
   It prevents producers from overwhelming consumers, limiting in-flight work so the system degrades gracefully instead of failing catastrophically.

3. **Why can too much concurrency hurt performance?**
   Excess processes can increase scheduling overhead, contention on shared resources (DB, network), mailbox growth, and GC pressure, increasing latency.

4. **What is a common safe concurrency pattern for external I/O?**
   Use bounded concurrency (for example a pool or limited `Task.async_stream`) and timeouts, and fail fast on dependency issues.

5. **When is messaging preferable to shared state?**
   Almost always on BEAM: message passing keeps ownership clear and avoids lock-based concurrency complexity.

## Advanced Questions (With Answers)

1. **How does `Task.async_stream` help with safety?**
   It supports bounded concurrency and ordering control, making it harder to spawn unbounded work while still using parallelism.

2. **Why do “fire-and-forget” casts sometimes cause outages?**
   They can flood a mailbox when producers outpace consumers. Without backpressure, you often only notice when latency or memory spikes.

3. **How do you decide between GenStage/Broadway and a simple Task approach?**
   Use GenStage/Broadway when you need a pipeline with backpressure, acknowledgements, and robust throughput control. Use Tasks for simpler parallel work.

4. **What are operational signals of concurrency problems?**
   Growing process message queues, frequent timeouts, increased GC time, rising DB connection saturation, and repeated restarts from supervision.

5. **What’s a pragmatic approach to backpressure in OTP services?**
   Bound in-flight work, reject or shed load early when overloaded, and expose metrics so you can tune concurrency limits over time.

---

## ETS: In-Memory Storage

### What is ETS?

ETS (Erlang Term Storage) is an in-process, in-memory key-value store built into the BEAM. It is **not a process** — it’s a VM-level table that any process can read from or write to concurrently (with proper flags).

```elixir
# Create a table (usually in a GenServer init or Application start)
table = :ets.new(:my_cache, [:set, :named_table, :public, read_concurrency: true])

# Write
:ets.insert(:my_cache, {:key, "value"})

# Read (returns list of matching tuples)
:ets.lookup(:my_cache, :key)  # → [{:key, "value"}]

# Delete
:ets.delete(:my_cache, :key)
```

### When to use ETS?

Use ETS when:
- You need **fast concurrent reads** from many processes — no message passing overhead.
- You need a **shared lookup table** (config, feature flags, rate limit counters, caches).
- You want to **avoid making a GenServer a bottleneck** for read-heavy access.

Don’t use ETS when:
- You need durability (ETS is in-memory only — lost on process/node crash).
- You need cross-node shared state (ETS is per-node).
- You need complex transactions (ETS has no multi-key atomicity).

### ETS vs GenServer state?

| | ETS | GenServer state |
|---|---|---|
| Access | Concurrent reads from any process | Serialized — one message at a time |
| Speed | O(1) lookup, no message overhead | Adds message send + receive per access |
| Ownership | Table owned by one process, but readable/writable by many | Owned entirely by GenServer |
| Crash behavior | If owning process dies, table is deleted (unless `:heir` set) | State lost on crash, reinit from `init/1` |
| Best for | Read-heavy shared lookups | Writes that need serialized consistency |

### How does ETS scale across processes?

Multiple processes can read from ETS simultaneously with `read_concurrency: true`. Writes can be made concurrent with `write_concurrency: true` (uses internal sharding). This makes ETS much more scalable than a GenServer for read-heavy patterns — no mailbox, no serialization, just a memory lookup.

### What are ETS limitations?

- **Per-node**: not distributed. Each node has its own ETS tables.
- **No persistence**: data lost on process crash or node restart.
- **No cross-key transactions**: `:ets.update_counter/4` is atomic per entry, but not across keys.
- **Memory**: ETS tables live in the process memory space but outside the owning process heap — they are not GC’d by the owner’s GC. You must manually delete entries to reclaim memory.
- **Table ownership**: when the owning process dies, the table is deleted unless you configure an `:heir` process to inherit it.

### Circuit Breaker Design in Elixir

A circuit breaker prevents cascading failures when a downstream dependency (DB, external API) is unhealthy.

**States**: `closed` (normal) → `open` (failing, reject calls) → `half_open` (probe recovery)

```
Closed: requests pass through normally
  → if failures exceed threshold → Open

Open: requests immediately rejected (fail-fast)
  → after timeout → Half-Open

Half-Open: allow one probe request
  → if success → Closed
  → if failure → Open again
```

**Implementation pattern with GenServer**:
- GenServer holds the state: `{:closed, 0}`, `{:open, opened_at}`, `{:half_open}`
- Each call checks state; failures increment counter
- A timer resets from open to half-open

**Elixir libraries**: `:fuse` (Erlang), `ExBreak`, or roll your own with a GenServer + ETS for performance.

**Why it matters**: without a circuit breaker, a slow external API causes requests to pile up waiting, threads/processes exhaust, the queue backs up, and your whole system degrades. A circuit breaker **fails fast** and lets you degrade gracefully.

### Backpressure: Practical Patterns

**1. Bounded mailbox check** (poor man’s backpressure):
```elixir
def allow_request?(pid) do
  {:message_queue_len, len} = Process.info(pid, :message_queue_len)
  len < 1000
end
```

**2. `Task.async_stream` with `max_concurrency`**:
```elixir
Task.async_stream(items, &process/1, max_concurrency: 20, on_timeout: :kill_task)
```

**3. GenStage / Broadway** for producer-consumer pipelines with demand-based backpressure.

**4. Oban queue limits**: set `concurrency` per queue to cap in-flight jobs.

**5. Load shedding at the HTTP layer**: return `503` when a health metric (e.g., DB pool queue length, process mailbox) exceeds a threshold. Better to shed 5% of traffic than to let 100% degrade.

### How do you reject requests gracefully?

```elixir
# In a Plug, check system health before proceeding
def call(conn, _opts) do
  if system_overloaded?() do
    conn
    |> put_status(503)
    |> put_resp_header("retry-after", "5")
    |> json(%{error: "service temporarily unavailable"})
    |> halt()
  else
    conn
  end
end

defp system_overloaded? do
  # e.g., check DB pool queue time or a circuit breaker state
  MyApp.HealthCheck.overloaded?()
end
```

Fail fast with a `503` and `Retry-After` header. This keeps your system in a recoverable state rather than letting queue buildup cause cascading timeouts.
