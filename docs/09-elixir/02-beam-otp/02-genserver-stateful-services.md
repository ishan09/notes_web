# GenServer and Stateful Services

`GenServer` is the standard OTP abstraction for processes that maintain state and handle requests.

## What Problem Does GenServer Solve?

GenServer solves “I need a single owner of state and a serialized access path to it” without shared mutable memory.

You get:

- A dedicated process that owns state
- A well-defined request protocol (`call` / `cast`)
- Integration with supervision for restart and recovery

## Core Concepts

- `GenServer.start_link/3` starts a supervised server
- `handle_call/3` handles synchronous requests
- `handle_cast/2` handles asynchronous requests
- `handle_info/2` handles unexpected messages and system events
- State is explicit and evolves through callback return values
- `GenServer.call/3` has timeouts and can deadlock if misused
- `GenServer.reply/2` enables deferred replies for longer operations

## Example

```elixir
defmodule Counter do
  use GenServer

  def start_link(_), do: GenServer.start_link(__MODULE__, 0, name: __MODULE__)
  def increment(), do: GenServer.call(__MODULE__, :increment)

  def init(state), do: {:ok, state}

  def handle_call(:increment, _from, state) do
    {:reply, state + 1, state + 1}
  end
end
```

## Design Notes

- Keep GenServers small and focused.
- Avoid turning them into god objects.
- Use them for coordination, caching, rate-limiting, or stateful workflows.
- Avoid long blocking work inside callbacks; offload or split into steps.
- Keep state compact; very large state can cause GC pressure and latency spikes.

## When To Use (And When Not To Use) GenServer

Use GenServer when:

- You need **serialized access** to a piece of mutable state (conceptually mutable, implemented as immutable state transitions).
- You need a **long-lived worker** that coordinates work (timers, retries, caching).
- You need **coordination** around a resource (rate limiting, circuit breaking, deduplication).

Avoid GenServer when:

- The work is purely functional/stateless: use plain functions.
- You need high throughput and a single process becomes a bottleneck: shard state, use multiple workers, or change the design.
- You’re doing CPU-heavy work inside callbacks: offload to Tasks or separate processes.

Alternatives you should consider:

- `Task` for short-lived concurrency
- ETS for fast shared read access (with careful ownership/consistency choices)
- `Registry` for naming and process lookup patterns

See also: [Rate Limiter with GenServer (Demo to Production)](./08-rate-limiter-genserver.md)

## Common Questions (With Answers)

1. **When should you use `handle_call` vs `handle_cast`?**
   Use `call` for request/response when the caller needs a reply. Use `cast` for fire-and-forget where a reply is not needed.

2. **Why is explicit state management valuable?**
   It makes state transitions predictable, testable, and local to one process, avoiding shared mutable state.

3. **What happens if a GenServer crashes?**
   The process exits. If it is supervised, its supervisor restarts it based on the configured strategy and restart setting.

4. **What does `handle_info/2` do?**
   It handles messages that aren’t `call`/`cast` requests, such as timers, monitored process messages, and other custom messages.

5. **Why do `call` timeouts happen?**
   The GenServer is busy, blocked, overloaded, or deadlocked. Timeouts are a signal to examine mailbox growth and callback behavior.

## Advanced Questions (With Answers)

1. **What’s a common GenServer deadlock scenario?**
   Doing a `GenServer.call` to another server that calls back synchronously (directly or indirectly), creating a circular wait.

2. **How do you handle long work while still responding to `call`s?**
   Defer work by sending yourself a message, use `GenServer.reply/2` to respond later, or delegate to supervised Tasks and track results.

3. **Why can large GenServer state cause latency spikes?**
   GC is per-process. Large state increases per-process GC work and copying, which impacts message handling latency.

4. **How do you safely stop a GenServer?**
   Use `GenServer.stop/3` and ensure you handle cleanup in `terminate/2` when appropriate, understanding that `terminate/2` is not guaranteed in all crash cases.

5. **When should you avoid GenServer entirely?**
   When you don’t need a single owner of state or serialization of access. Pure functions, ETS, or a different OTP abstraction may fit better.

6. **What’s a “tell” that a GenServer is the wrong choice?**
   If every request becomes synchronous (`call`) and latency grows with load, or the GenServer state keeps growing, you likely need sharding or a different architecture.

---

## Task vs GenServer vs Agent

### When would you use Task?

Use `Task` for **short-lived concurrent work** — work you fire off, wait for, or supervise briefly:

```elixir
# Fire and await
task = Task.async(fn -> do_slow_work() end)
result = Task.await(task)

# Bounded parallel processing
results = Task.async_stream(list, fn item -> process(item) end, max_concurrency: 10)
```

Use `Task.Supervisor` when you want fault isolation — a crashing task won’t crash the caller:
```elixir
Task.Supervisor.async_nolink(MyApp.TaskSupervisor, fn -> risky_work() end)
```

### Difference: Task vs GenServer?

| | Task | GenServer |
|---|---|---|
| Lifetime | Short-lived | Long-lived |
| State | None (returns a value) | Persistent across calls |
| Use case | Concurrent jobs, parallelism | Stateful services, coordination |
| Supervision | Via Task.Supervisor | Via Supervisor |
| Blocking? | `Task.await` blocks caller | `call` blocks caller; `cast` doesn’t |

### What is Agent used for?

`Agent` is a thin wrapper around a GenServer for simple shared state with read/update operations. It’s appropriate for **simple, low-traffic mutable state** where you don’t need custom message handling:

```elixir
{:ok, agent} = Agent.start_link(fn -> %{} end)
Agent.update(agent, fn state -> Map.put(state, :key, “value”) end)
Agent.get(agent, fn state -> state end)
```

**When NOT to use Agent**: high throughput (it serializes all access), complex state transitions, or when you need `handle_info`, timeouts, or custom callbacks. Use GenServer instead.

### What happens to a Task if the parent dies?

If a Task was started with `Task.async` (which links the task to the caller), and the caller dies, the task is also killed. If the task was started with `Task.async_nolink` or via `Task.Supervisor.async_nolink`, the task survives the caller’s death.

Conversely: if an `async` task crashes, it sends an exit signal to the caller. If the caller doesn’t `await` or handle it, the caller crashes too. Always `await` or use `nolink` for tasks you might abandon.

### Why not use GenServer everywhere?

GenServer serializes all access through one process. If you use it for work that could be parallel, you create an unnecessary bottleneck. Plain functions are always preferable for stateless logic. Tasks are better for one-off concurrent work. ETS is better for read-heavy shared state. GenServer is for “I need one owner of this mutable state” — not as a default wrapper for everything.

---

## What happens if GenServer blocks?

If a `handle_call/3` or `handle_cast/2` callback does slow work (DB query, HTTP call, heavy computation):

1. The GenServer process is occupied for the duration.
2. All other messages queue up in the mailbox.
3. Callers waiting on `call` block until the timeout fires (default 5s), then receive `{:exit, :timeout}`.
4. Under sustained load, the mailbox grows, memory climbs, and the process becomes the system bottleneck.

**Fix**: offload slow work:
```elixir
def handle_call(:do_slow_thing, from, state) do
  Task.start(fn ->
    result = do_slow_thing()
    GenServer.reply(from, result)  # reply from the Task
  end)
  {:noreply, state}  # don’t block the GenServer
end
```

## What is the mailbox growth problem?

When message producers send faster than the GenServer can process:
- Messages accumulate in the mailbox (FIFO queue).
- Memory grows — each queued message is a heap allocation.
- GC pressure increases on the GenServer process.
- Latency climbs for all callers.
- Eventually: OOM or timeout cascade.

**Detection**: `:recon.proc_count(:message_queue_len, 10)` — any process with a queue > few hundred is suspicious.

**Fixes**: shard the GenServer, use ETS for reads, apply backpressure upstream (reject new work when queue is large), offload work to Tasks.
