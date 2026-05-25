# BEAM Runtime: Processes, Schedulers, GC

This note focuses on the BEAM runtime characteristics that matter for performance, latency, and production behavior.

## Core Concepts

- **BEAM processes** are lightweight and isolated; each has its own heap and stack.
- **Schedulers** run processes on CPU cores using reductions (a rough “work unit”).
- **Per-process GC** means garbage collection happens for one process at a time, not as a global stop-the-world heap (in most cases).
- **Message passing** copies most small terms; some data (like binaries) is optimized differently.

## Practical Implications

- A single “hot” process can become a bottleneck even when the VM is otherwise healthy.
- Large process heaps (often from big state or large intermediate allocations) cause longer per-process GC pauses.
- Throughput and tail latency depend on keeping individual processes responsive and avoiding mailbox growth.

## Common Questions (With Answers)

1. **What makes BEAM good for concurrency?**
   Lightweight isolated processes, cheap scheduling, message passing, and supervision primitives that make failures manageable.

2. **What are schedulers in BEAM?**
   Scheduler threads that run Erlang/Elixir processes. Typically you have one scheduler per CPU core (plus variations like dirty schedulers).

3. **Is BEAM garbage collection global?**
   GC is largely per-process. Each process collects its own heap, which helps avoid global pauses but can cause per-process latency spikes.

4. **What is a “reduction”?**
   A unit of work used by BEAM scheduling to decide when to preempt a running process and let others run.

5. **Why does GenServer state size matter?**
   Bigger state means more allocation and potentially more GC work per message, which increases latency under load.

## Advanced Questions (With Answers)

1. **Why can a process with a huge mailbox cause memory pressure?**
   Messages accumulate, increasing memory usage and often retaining larger referenced data, which can lead to GC overhead and eventually VM memory exhaustion.

2. **How does BEAM preemption relate to latency?**
   BEAM preempts after reductions, so long-running pure computation still yields, but heavy CPU work can still raise latency if many processes compete. Consider offloading or optimizing hot code.

3. **What’s a common binary-related pitfall?**
   Holding references to large binaries (for example by slicing without copying in some patterns) can retain large memory even when only a small portion is needed.

4. **What’s a pragmatic way to find runtime bottlenecks?**
   Look for top processes by message queue length, reductions, heap size, and GC counts. Then reduce work per message or shard responsibilities.

5. **Why can “one process per user” be both great and dangerous?**
   Great for isolation and simplicity. Dangerous if it creates unbounded process counts, too many DB connections, or per-user processes that leak and accumulate.

---

## BEAM Scheduler Deep Dive

### How does BEAM achieve concurrency?

BEAM runs **one scheduler thread per CPU core** (by default). Each scheduler maintains a run queue of ready processes. The VM distributes processes across schedulers automatically.

Key properties:
- Processes are **not OS threads** — they are BEAM-level lightweight entities (~2KB initial heap, ~1-3μs to spawn).
- A single node can run **millions of processes** concurrently.
- The scheduler is **preemptive** — no process can monopolize CPU; it is preempted after its reduction budget.
- IO operations (DB calls, sockets, timers) **yield the scheduler immediately** — the waiting process is suspended, and another runs.

### What is reduction counting?

A **reduction** is a unit of work in BEAM — roughly one function call. Each process gets a budget of ~2000 reductions per scheduler timeslice.

When a process exhausts its reductions:
- The scheduler preempts it and moves it to the back of the run queue.
- Another process runs.
- The preempted process resumes later with a fresh reduction budget.

This ensures no single process starves others, even under heavy CPU load.

### How does preemption happen?

```
Process A running
  → uses reduction 1, 2, 3 ... 2000
  → scheduler preempts (reduction budget exhausted)
  → Process A → back of run queue
  → Process B gets CPU time
  → Process A resumes later
```

For **IO-blocking** operations (DB query, socket read, `Process.sleep`):
- The process yields the scheduler immediately on the blocking call.
- The scheduler runs other processes.
- When IO completes, the process is put back on the run queue.

### Dirty Schedulers

Normal schedulers are for Elixir/Erlang code. **Dirty schedulers** handle:
- **Dirty CPU schedulers**: long-running CPU-intensive NIFs that would block a normal scheduler.
- **Dirty IO schedulers**: blocking OS calls (file IO, syscalls).

Without dirty schedulers, a blocking NIF would freeze an entire scheduler thread, starving all processes on that core. Dirty schedulers are separate threads that don’t affect the normal BEAM run queues.

### How do you kill a runaway process?

```elixir
# Graceful exit signal (can be caught if trap_exit: true)
Process.exit(pid, :shutdown)

# Unconditional kill — cannot be trapped
Process.exit(pid, :kill)
```

In production: use `:observer.start()` or `:recon` to find the runaway PID, then `Process.exit(pid, :kill)`. In supervision trees, stopping a supervisor stops all its children.

### Can a process starve others?

**In practice: rarely, by design.** Reductions prevent starvation for Elixir/Erlang code. However:
- A very tight CPU loop (few function calls per reduction cycle, e.g., native number crunching) can burn through reductions slowly — still preempts eventually but with higher latency.
- A **blocking NIF** (non-dirty) CAN freeze a scheduler thread, effectively starving all processes on that core.
- A process with a **huge mailbox** does not starve others directly but consumes memory and GC time.

### How does BEAM ensure fairness?

- **Reduction-based preemption** gives every process a turn.
- **Work stealing** between schedulers: if one scheduler’s queue is empty, it steals work from another to keep cores busy.
- **IO suspension**: waiting processes don’t occupy a scheduler thread.

### What is `:observer` used for?

`:observer.start()` launches a GUI tool (requires a display or remote desktop) showing:
- **Processes tab**: top processes by memory, reductions, message queue length.
- **Load charts**: scheduler utilization, memory usage, IO.
- **Applications tab**: supervision tree visualization.
- **Table viewer**: ETS/Mnesia table inspection.

Use in dev/staging. For production (no display): use `:recon` library for safe, non-intrusive introspection via the shell.

### How do you inspect a live system?

```elixir
# Top 10 processes by message queue length
:recon.proc_count(:message_queue_len, 10)

# Top 10 processes by memory
:recon.proc_count(:memory, 10)

# Top 10 by reductions (CPU activity)
:recon.proc_count(:reductions, 10)

# Get info about a specific process
Process.info(pid)

# Trace function calls in production (sampling, auto-stops)
:recon_trace.calls({MyModule, :my_fun, :_}, 100)
```

`:recon_trace` is safe in production — it uses sampling and automatic shutdown to prevent tracing from overloading the system.
