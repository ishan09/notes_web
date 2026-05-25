# Processes and Message Passing

Elixir processes are lightweight and isolated. They do not share memory, so communication happens through messages.

## Core Concepts

- **Process isolation** keeps failures local.
- **Mailbox** stores incoming messages for a process.
- **Asynchronous send** with `send/2`.
- **Receive loop** handles messages in a process.
- **Links and monitors** help processes observe each other.
- **Exit signals** are how failures propagate across links.
- **Selective receive** can match specific messages and leave others in the mailbox.

## What Is a Process in Elixir?

A BEAM process is a lightweight, isolated unit of execution. It has:

- Its own mailbox (message queue)
- Its own heap and GC
- No shared mutable memory with other processes

### OS Thread vs BEAM Process

- **OS thread**: heavier, shared-memory, needs locks and careful synchronization.
- **BEAM process**: much lighter, isolated, message passing, designed to scale to very large counts.

### Scheduling (High Level)

BEAM runs processes on scheduler threads and preempts using reductions, which helps keep the system responsive under load.

## Why This Matters

- You can run many processes without the cost of OS threads.
- Crashes are easier to contain because state is isolated.
- Message passing scales naturally to concurrent workloads.
- You can design for resilience with supervision instead of defensive coding everywhere.

## Example

```elixir
pid =
  spawn(fn ->
    receive do
      {:hello, name} -> IO.puts("Hello, #{name}")
    end
  end)

send(pid, {:hello, "Elixir"})
```

## Message Passing: `send` and `receive`

- `send(pid, msg)` is asynchronous and returns `msg`.
- `receive` is **blocking** for the current process until a matching message arrives.
- If *no matching message* ever arrives, the process blocks forever unless you add an `after` timeout:

```elixir
receive do
  {:ok, value} -> {:ok, value}
  {:error, reason} -> {:error, reason}
after
  1_000 -> {:error, :timeout}
end
```

If messages arrive but don’t match any clause, the process continues waiting and those messages remain in the mailbox (this is why selective receive can be risky).

## Practical Notes

- Processes handle one message at a time; long-running work blocks the mailbox.
- Prefer **links** when you want failures to propagate and be handled by supervision.
- Prefer **monitors** when you want to observe failures without taking them down with you.
- Mailbox growth is a real production risk; watch queue lengths and avoid “firehose” patterns.

## Common Questions (With Answers)

1. **Why does Elixir avoid shared mutable state?**
   BEAM isolates processes. Isolation prevents data races and makes failures local, so concurrency is safer by default.

2. **What is the mailbox and how can it become a bottleneck?**
   It is the queue of pending messages for a process. If message production exceeds consumption (or the process blocks), the mailbox grows and latency increases.

3. **When would you use monitors instead of links?**
   Use monitors when you want to detect that another process went down without coupling lifecycles (no failure propagation).

4. **Does BEAM guarantee message ordering?**
   For messages sent from a single sender to a single receiver, ordering is preserved. Across multiple senders, interleaving is not deterministic.

5. **What is selective receive and why can it be dangerous?**
   It matches only certain messages and leaves others queued. Overuse can reorder effective processing and cause mailbox growth.

## Advanced Questions (With Answers)

1. **What does `Process.flag(:trap_exit, true)` change?**
   It converts exit signals from linked processes into regular messages (`{:EXIT, pid, reason}`), letting the process handle them explicitly.

2. **Why do long `receive` loops cause system-wide issues?**
   They create backpressure at the mailbox boundary, can increase memory usage, and often lead to timeouts and cascading failures upstream.

3. **How do links interact with supervision trees?**
   `start_link` links the child to its parent/supervisor so that crashes are visible and restart policies can be applied.

4. **When is the process dictionary a pitfall?**
   It hides state and makes behavior implicit, harder to test, and harder to reason about. Prefer explicit state in GenServers or function inputs.

5. **What’s a typical pattern for safely doing slow work triggered by messages?**
   Offload slow work to a Task (or a separate worker process) and keep the mailbox consumer responsive, possibly using bounded concurrency.

---

## Process Lifecycle & Fault Tolerance

### What happens when a process crashes?

When a process crashes (unhandled exception or explicit `exit/2`):
1. The process terminates with an exit reason (e.g., `:normal`, `:killed`, `{:error, reason}`).
2. Exit signals propagate to all **linked** processes — by default this kills them too (cascade).
3. Linked **supervisors** trap the exit signal (they have `trap_exit: true`) and apply their restart strategy.
4. **Monitoring** processes receive a `{:DOWN, ref, :process, pid, reason}` message but are NOT killed themselves.

### What is "let it crash" in practice?

"Let it crash" means: don’t write defensive code to catch every possible error inside a process. Instead:
- Let the process crash on unexpected input or state.
- A supervisor restarts it in a clean known state.
- You avoid accumulating corrupt in-process state.

**When NOT to let it crash:**
- When the error is **expected and recoverable** (e.g., a missing record — handle with `{:error, :not_found}`).
- When crashing would kill dependent processes you don’t want restarted (use monitors, not links).
- When the process holds **durable state** that must be cleanly saved before exit.

### How are exit signals propagated?

```
Process A  --[linked]-->  Process B (crashes)
                              │
                         exit signal (:reason)
                              │
            ┌─────────────────┴──────────────────┐
            ▼                                    ▼
   Process A (linked)                   Supervisor (traps exits)
   → also exits (unless                 → receives {:EXIT, pid, reason}
     trap_exit: true)                   → applies restart strategy
```

- Normal exit (`:normal`) does NOT kill linked processes unless they set `trap_exit: true`.
- Abnormal exit propagates as a kill signal to all links.
- `:kill` reason (sent via `Process.exit(pid, :kill)`) cannot be trapped.

### What is linking vs monitoring?

| | Link | Monitor |
|---|---|---|
| Created with | `Process.link/1` or `spawn_link/1` | `Process.monitor/1` |
| Bidirectional? | Yes — both die on either crash | No — observer is unaffected |
| Notification | Exit signal (kills linked process) | `{:DOWN, ref, :process, pid, reason}` message |
| Used for | Supervision (parent/child lifecycle coupling) | Observing without coupling lifecycles |

**Rule of thumb**: use `link` + supervision for "this process must live and die with me." Use `monitor` for "I want to know if that process dies, but I should keep running."

### What happens in a cascading failure?

1. Process A crashes.
2. Because it’s linked to B and C (and neither traps exits), B and C also crash.
3. If B is linked to D, D crashes too.
4. The crash propagates up the link chain until it hits a process with `trap_exit: true` (usually a Supervisor).
5. The supervisor receives the exit signal as a message and applies its restart strategy.

**Prevention**: Keep supervision tree boundaries tight. Don’t link unrelated processes. Supervisors are the firewall — they trap exits and restart predictably.
