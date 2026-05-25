# Process Primitives — Links, Monitors, Signals, Mailbox Mechanics

> This file covers the **low-level process primitives** — the building blocks that GenServer, Supervisors, Tasks, and everything else in OTP are built on top of. The higher-level abstractions are covered in their own files; this is the substrate beneath them.

---

## 1. Spawning Processes — Which Variant to Use

```elixir
spawn(fn -> work() end)          # fire and forget — no link, no monitor
spawn_link(fn -> work() end)     # linked — crash propagates both ways
spawn_monitor(fn -> work() end)  # returns {pid, ref} — monitored, no link
```

| Variant | Linked? | Monitored? | Returns | Use when |
|---------|---------|------------|---------|----------|
| `spawn` | ❌ | ❌ | `pid` | Truly independent, you don't care if it dies |
| `spawn_link` | ✅ | ❌ | `pid` | Lifecycle coupling — die together |
| `spawn_monitor` | ❌ | ✅ | `{pid, ref}` | Observe without coupling |

In practice, raw `spawn*` is rare in application code. You almost always use `Task`, `GenServer.start_link`, or a Supervisor — which use these primitives internally.

---

## 2. Links — Bidirectional Failure Coupling

A link is a **bidirectional bond** between two processes. When either dies with a non-normal reason, the other receives an exit signal.

```elixir
# Two ways to create a link
spawn_link(fn -> work() end)   # atomically spawns + links
Process.link(pid)              # link to an already-running process
Process.unlink(pid)            # remove the link
```

### What "bidirectional" actually means

```
Process A  <──link──>  Process B crashes with :badmatch
                            │
                     exit signal :badmatch
                            │
               ─────────────┘
               ▼
         Process A receives exit signal
         → also crashes (unless trapping exits)
```

And the reverse: if A crashes, B gets the signal. The bond goes both ways.

### The `:normal` exception

`:normal` exit is **special** — it does NOT propagate to linked processes:

```elixir
pid = spawn_link(fn -> :ok end)   # exits with :normal
# current process is NOT killed — :normal is silently ignored by links
```

Only abnormal exits (anything that isn't `:normal`) propagate. This is by design — a process finishing its work shouldn't take down its peers.

### The `:kill` exception

`:kill` is the other special reason — it **cannot be trapped** (more on `trap_exit` below):

```elixir
Process.exit(pid, :kill)   # unconditional termination — no trap possible
```

When a process is killed with `:kill`, the signal that propagates to its links is `:killed` (not `:kill`) — so linked processes receive `:killed` as the reason, and this CAN be trapped.

---

## 3. Monitors — Unidirectional Observation

A monitor is **one-way**: the monitoring process observes another without coupling to its lifecycle.

```elixir
ref = Process.monitor(pid)       # start monitoring
Process.demonitor(ref)           # stop monitoring
Process.demonitor(ref, [:flush]) # stop + flush any pending :DOWN from mailbox
```

When the monitored process dies (for any reason, including `:normal`), the monitor sends a message:

```elixir
{:DOWN, ref, :process, pid, reason}
```

| Field | Meaning |
|-------|---------|
| `:DOWN` | message tag |
| `ref` | the monitor reference — use to match only your monitor |
| `:process` | entity type (always `:process` for process monitors) |
| `pid` | the process that died |
| `reason` | exit reason — `:normal`, `:noproc`, `{:error, ...}`, etc. |

### Key differences from links

| | Link | Monitor |
|--|------|---------|
| Direction | Bidirectional | Unidirectional |
| Observer dies? | Yes (unless trapping) | No |
| Notification | Exit signal | `{:DOWN, ...}` message |
| `:normal` propagates? | ❌ No | ✅ Yes (you still get `:DOWN`) |
| Multiple allowed? | One link per pair | Multiple monitors on same pid |
| Created with | `Process.link/1` | `Process.monitor/1` |

### The `:noproc` reason

If you monitor a pid that **already doesn't exist**, you immediately receive:

```elixir
{:DOWN, ref, :process, pid, :noproc}
```

This makes monitoring safe to set up without a race condition — you always get notified whether the process was alive or not.

### The demonitor flush race

After calling `Process.demonitor(ref)`, a `:DOWN` message may already be sitting in your mailbox (arrived between the process dying and your demonitor call). Use `:flush` to discard it:

```elixir
Process.demonitor(ref, [:flush])
# guarantees no stale {:DOWN, ref, ...} will be processed
```

Without `:flush`, you can accidentally handle a `:DOWN` for a monitor you already cancelled.

---

## 4. Exit Signals — Full Propagation Rules

This is the complete ruleset for how exit signals behave. Knowing this is what separates "knows Elixir" from "understands OTP":

```
Sender calls:                    Receiver has trap_exit?     What happens to receiver
─────────────────────────────────────────────────────────────────────────────────────
Process.exit(pid, :normal)       false                       nothing (ignored)
Process.exit(pid, :normal)       true                        receives {:EXIT, pid, :normal}
Process.exit(pid, :shutdown)     false                       receiver terminates with :shutdown
Process.exit(pid, :shutdown)     true                        receives {:EXIT, pid, :shutdown}
Process.exit(pid, :kill)         false                       receiver terminates with :killed ← NOTE: :killed not :kill
Process.exit(pid, :kill)         true                        receiver terminates with :killed ← trap_exit has NO effect on :kill
Process.exit(pid, other)         false                       receiver terminates with `other`
Process.exit(pid, other)         true                        receives {:EXIT, pid, other}
```

Key rules to memorise:
1. `:normal` is silently ignored unless the receiver is trapping exits
2. `:kill` **cannot be trapped** — it always terminates the receiver
3. When killed by `:kill`, the receiver propagates `:killed` (not `:kill`) to its links
4. Everything else is trappable

### Sending exit signals manually

```elixir
# Graceful — can be trapped
Process.exit(pid, :shutdown)

# Structured graceful — can be trapped, carries payload
Process.exit(pid, {:shutdown, :reason_detail})

# Nuclear — cannot be trapped
Process.exit(pid, :kill)

# "Tell yourself to stop" (useful in tests or controlled shutdown)
Process.exit(self(), :shutdown)
```

---

## 5. `trap_exit` — Converting Signals to Messages

By default, an exit signal kills the receiving process. `trap_exit` changes that: the signal is converted into a regular `{:EXIT, pid, reason}` message that lands in the mailbox and can be handled like any other message.

```elixir
Process.flag(:trap_exit, true)
```

One exception: **`:kill` cannot be trapped** — it always terminates the process regardless.

---

### 5a. Plain Process (no GenServer)

#### Without `trap_exit` — the default behaviour

```elixir
# NO trap_exit set — default behaviour
pid = spawn_link(fn ->
  Process.sleep(200)
  raise "child crashed"
end)

IO.puts("Child spawned: #{inspect(pid)}")

receive do
  msg -> IO.puts("Got: #{inspect(msg)}")
after
  2000 -> IO.puts("Timeout — nothing received")
end

# Output:
# Child spawned: #PID<0.109.0>
# ** (EXIT from #PID<0.109.0>) shell process exited with reason:
#    an exception was raised: %RuntimeError{message: "child crashed"}
#
# ↑ The parent process is KILLED by the exit signal.
#   It never reaches the receive block.
#   In a running application this would crash the caller's process too.
```

The exit signal travels up the link and kills the parent before it can do anything. There's no `{:EXIT, ...}` message — there's no message at all. The process is just gone.

#### With `trap_exit` — signal becomes a message

```elixir
defmodule TrapExitDemo do
  def run do
    # Must set flag BEFORE linking — a fast-crashing child could
    # kill the parent before the flag is set if you do it after
    Process.flag(:trap_exit, true)

    pid = spawn_link(fn ->
      Process.sleep(200)
      raise "child crashed"
    end)

    IO.puts("Child spawned: #{inspect(pid)}")

    receive do
      {:EXIT, ^pid, :normal} ->
        IO.puts("Child exited normally — no action needed")

      {:EXIT, ^pid, reason} ->
        IO.puts("Child crashed: #{inspect(reason)}")
        IO.puts("Parent is still alive — we handled it")

      other ->
        IO.puts("Something else: #{inspect(other)}")
    end
  end
end

TrapExitDemo.run()
# Child spawned: #PID<0.109.0>
# Child crashed: {%RuntimeError{message: "child crashed"}, [...stacktrace...]}
# Parent is still alive — we handled it
```

Same crash, completely different outcome. The exit signal is **intercepted** and converted to a `{:EXIT, pid, reason}` message. The parent survives and decides what to do.

---

### 5b. Plain Process — Watching Multiple Linked Children

When you have several linked children, each `{:EXIT, pid, reason}` tells you exactly which one died:

```elixir
defmodule WorkerPool do
  def run do
    Process.flag(:trap_exit, true)

    workers =
      for i <- 1..3 do
        pid = spawn_link(fn -> do_work(i) end)
        {pid, i}
      end
      |> Map.new()

    monitor_loop(workers)
  end

  defp do_work(1), do: Process.sleep(300)          # exits :normal
  defp do_work(2), do: raise "worker 2 blew up"   # crashes
  defp do_work(3), do: Process.sleep(:infinity)    # stays alive

  defp monitor_loop(workers) when map_size(workers) == 0 do
    IO.puts("All workers done")
  end

  defp monitor_loop(workers) do
    receive do
      {:EXIT, pid, :normal} ->
        IO.puts("Worker #{workers[pid]} finished cleanly")
        monitor_loop(Map.delete(workers, pid))

      {:EXIT, pid, reason} ->
        IO.puts("Worker #{workers[pid]} crashed: #{inspect(reason)}")
        # could restart here, or just remove
        monitor_loop(Map.delete(workers, pid))
    end
  end
end
```

---

### 5c. GenServer — Handling `{:EXIT, ...}` in `handle_info/2`

In a GenServer, exit signals (when trapping) arrive via `handle_info/2` — the same callback used for monitors' `{:DOWN, ...}` messages.

#### Without `trap_exit` — GenServer is collateral damage

```elixir
defmodule MyServerNoTrap do
  use GenServer

  def start_link(_), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  @impl true
  def init(state) do
    # No trap_exit — default behaviour
    worker_pid = spawn_link(fn ->
      Process.sleep(500)
      raise "worker blew up"
    end)

    {:ok, Map.put(state, :worker, worker_pid)}
  end

  @impl true
  def handle_call(:ping, _from, state), do: {:reply, :pong, state}
end

# Timeline:
# t=0ms   — MyServerNoTrap starts, worker spawned and linked
# t=0ms   — GenServer.call(MyServerNoTrap, :ping)  =>  :pong   ✅
# t=500ms — worker raises RuntimeError
# t=500ms — exit signal travels through the link to the GenServer process
# t=500ms — GenServer is KILLED (same reason as the worker)
# t=500ms — supervisor sees MyServerNoTrap as crashed, restarts it
# t=500ms — GenServer.call(MyServerNoTrap, :ping) raises (EXIT) until
#            supervisor finishes restarting it
#
# The GenServer had nothing wrong with it. Its state was fine.
# It was killed purely because it was linked to a crashing worker.
# This is "collateral damage via link".
```

#### With `trap_exit` — GenServer stays alive, handles the crash itself

```elixir
defmodule MyServer do
  use GenServer

  def start_link(_), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  @impl true
  def init(state) do
    # Set BEFORE spawning — a fast crash could kill us before we set it
    Process.flag(:trap_exit, true)

    worker_pid = spawn_link(fn -> worker_loop() end)
    {:ok, Map.put(state, :worker, worker_pid)}
  end

  # ── Worker exited cleanly ──────────────────────────────────────────────────
  @impl true
  def handle_info({:EXIT, pid, :normal}, state) do
    IO.puts("Worker #{inspect(pid)} finished cleanly")
    {:noreply, Map.delete(state, :worker)}
  end

  # ── Worker crashed ─────────────────────────────────────────────────────────
  @impl true
  def handle_info({:EXIT, pid, reason}, state) do
    IO.puts("Worker #{inspect(pid)} crashed: #{inspect(reason)}")
    # Restart the worker — GenServer itself is unaffected
    new_pid = spawn_link(fn -> worker_loop() end)
    {:noreply, Map.put(state, :worker, new_pid)}
  end

  # ── GenServer itself is shutting down ─────────────────────────────────────
  # terminate/2 is called on graceful shutdown (:shutdown, :normal, {:shutdown, _})
  # NOT called on :kill
  @impl true
  def terminate(reason, state) do
    IO.puts("GenServer shutting down: #{inspect(reason)}")
    if worker = state[:worker] do
      Process.exit(worker, :shutdown)  # stop linked worker cleanly too
    end
    :ok
  end

  @impl true
  def handle_call(:ping, _from, state), do: {:reply, :pong, state}

  defp worker_loop do
    receive do
      :stop -> :ok
      msg   -> IO.puts("Worker got: #{inspect(msg)}"); worker_loop()
    end
  end
end

# Timeline:
# t=0ms   — MyServer starts, worker spawned and linked
# t=0ms   — GenServer.call(MyServer, :ping)  =>  :pong   ✅
# t=500ms — worker raises RuntimeError
# t=500ms — exit signal → converted to {:EXIT, pid, reason} in mailbox
# t=500ms — handle_info({:EXIT, ...}) fires, restarts the worker
# t=500ms — GenServer.call(MyServer, :ping)  =>  :pong   ✅  (still works!)
# The supervisor NEVER sees a restart — GenServer handled it internally
```

**Key points:**
- `trap_exit: true` in `init/1` — set before `spawn_link`, not after
- `:normal` and crash clauses are separate — they mean different things
- `terminate/2` — explicitly stop the linked worker there so it doesn't become an orphan
- The GenServer's supervisor **never sees a crash** — entirely transparent recovery

---

### 5d. GenServer — `terminate/2` and when it actually runs

`terminate/2` is only called reliably when `trap_exit: true` is set **or** the GenServer is stopped via its supervisor with a graceful signal:

| Shutdown signal | `trap_exit: false` | `trap_exit: true` |
|----------------|-------------------|-------------------|
| `:normal` | `terminate/2` called | `terminate/2` called |
| `:shutdown` | `terminate/2` called | `terminate/2` called |
| `{:shutdown, reason}` | `terminate/2` called | `terminate/2` called |
| unhandled exception in callback | `terminate/2` called | `terminate/2` called |
| `Process.exit(pid, :kill)` | ❌ NOT called | ❌ NOT called |

> `:kill` is the one case where `terminate/2` is never called — the process is gone before it gets a chance. Don't rely on `terminate/2` for critical cleanup that must survive a `:kill`.

```elixir
@impl true
def terminate(:normal, _state) do
  # clean exit — e.g. GenServer.stop/1 was called
  :ok
end

def terminate(:shutdown, state) do
  # supervisor is shutting down the tree — close DB connections, flush writes
  flush_pending(state)
  :ok
end

def terminate({:shutdown, reason}, state) do
  # structured shutdown with extra context
  Logger.info("Shutting down: #{inspect(reason)}")
  :ok
end

def terminate(reason, state) do
  # unexpected crash — log it, but don't try to do too much
  # the supervisor will restart you
  Logger.error("Unexpected termination: #{inspect(reason)}")
  :ok
end
```

---

### 5e. When to actually use `trap_exit` in a GenServer

Most of the time you **don't need it** — prefer monitors for observation, and let supervisors handle restarts via links. Use `trap_exit` in a GenServer only when:

| Scenario | Why trap_exit helps |
|----------|-------------------|
| GenServer manages linked workers it wants to restart itself (not via a Supervisor) | Gets `{:EXIT, ...}` instead of dying with the worker |
| GenServer must run cleanup code on shutdown | Ensures `terminate/2` is called for `:shutdown` signals from a supervisor |
| GenServer is itself acting as a mini-supervisor | Needs to stay alive and react to child crashes |

If you're reaching for `trap_exit` just to "not crash when a child dies" — use a **monitor** instead. Monitors give you `{:DOWN, ...}` without changing signal semantics or requiring `trap_exit`.

```elixir
# Prefer this (monitor) over trap_exit when you just want notification:
ref = Process.monitor(worker_pid)

def handle_info({:DOWN, ^ref, :process, _pid, reason}, state) do
  # worker died — react without needing trap_exit at all
  {:noreply, restart_worker(state)}
end
```

---

## 6. Mailbox Mechanics — How `receive` Actually Works

Every BEAM process has a mailbox: a linked list of messages, in arrival order. Understanding how `receive` scans it explains several performance traps.

### The scanning algorithm

```
receive do
  pattern_1 -> ...
  pattern_2 -> ...
end
```

BEAM does:
1. Start at the **head** of the mailbox
2. Try each message against each pattern **in order**
3. First match wins — message is removed from mailbox, clause executes
4. If no message matches — process suspends, waits for new message
5. On new message arrival — scanning restarts from where it left off (save point)

### The selective receive performance trap

Selective receive lets you skip non-matching messages:

```elixir
receive do
  {:response, ^ref, result} -> result   # only matches our specific ref
end
```

The trap: if thousands of other messages are sitting in front of `{:response, ref, result}`, BEAM scans past all of them every time a new message arrives. This is **O(n)** per receive attempt on a large mailbox.

```
mailbox: [msg1, msg2, msg3, ..., msg9999, {:response, ref, result}]
                                                     ▲
         BEAM scans all 9999 messages every time → to find this
```

**Mitigation patterns:**

```elixir
# Pattern 1: use a unique ref so you find the right message fast
ref = make_ref()
send(target, {:request, ref, payload})
receive do
  {:reply, ^ref, result} -> result   # ref pinning narrows scope
after
  5_000 -> {:error, :timeout}
end

# Pattern 2: flush unexpected messages periodically in long-running loops
def handle_info(unexpected, state) do
  Logger.warning("Unexpected message: #{inspect(unexpected)}")
  {:noreply, state}
end
# GenServer's catch-all handle_info prevents mailbox accumulation
```

### FIFO but with selective matching

Messages arrive in FIFO order from a single sender, but `receive` can pick any message out of order. The ones not matched stay in the mailbox until something matches them (or until the process dies).

This means: **unhandled messages accumulate**. A GenServer without a catch-all `handle_info` will silently accumulate junk messages, growing memory over time.

---

## 7. Process Hibernation

A process can be put to sleep to reclaim its heap when idle for a long time:

```elixir
:erlang.hibernate(module, function, args)
```

When hibernated:
- The process heap is **garbage collected** and compacted to minimum size
- The process is suspended — it will resume when a message arrives
- On wake, it calls `module.function(args)` to re-enter its loop

### In GenServer

```elixir
def handle_info(:some_msg, state) do
  {:noreply, state, :hibernate}   # hibernate after this callback
end
```

### When to use

- Long-lived processes that are **mostly idle** (e.g. per-user session processes that sit dormant between requests)
- When you have many thousands of idle processes and memory pressure matters

### When NOT to use

- Frequently active processes — hibernate + wake has overhead (heap GC + re-entry)
- If the process handles messages every few seconds, hibernating wastes more time than it saves

---

## 8. Process Dictionary

Every process has a private key-value store:

```elixir
Process.put(:key, value)
Process.get(:key)
Process.delete(:key)
Process.get()          # get entire dictionary as keyword list
```

### Why it exists

It's used internally by some OTP infrastructure (e.g. `Logger` stores metadata here). It provides O(1) access without passing state through function arguments.

### Why you should avoid it in application code

- **Hidden state** — not visible in function signatures, not part of GenServer state, invisible to introspection
- **Implicit coupling** — callers can't see what state a function reads/writes
- **Not inspectable** — `:sys.get_state/1` won't show it; `:recon` won't surface it
- **Inherited by child processes** — `spawn_link` copies the parent's process dictionary, which can cause surprising bugs

**Rule**: Use explicit state (GenServer state, function arguments, ETS). Only use the process dictionary if you're writing OTP infrastructure-level code and have a specific reason.

---

## 9. Registry — Named Process Lookup

`Registry` is a local, process-based key-value store for looking up process PIDs by name. It solves "I have many dynamic processes and need to find a specific one."

```elixir
# In your application supervisor
{Registry, keys: :unique, name: MyApp.Registry}

# Register current process under a key
Registry.register(MyApp.Registry, "user:#{user_id}", metadata)

# Look up a process by key
Registry.lookup(MyApp.Registry, "user:#{user_id}")
# => [{pid, metadata}]   or   []  if not found
```

### `:unique` vs `:duplicate` keys

| Mode | Behaviour | Use case |
|------|-----------|----------|
| `:unique` | One process per key — registering twice returns `{:error, {:already_registered, pid}}` | Per-entity workers (one process per user/session/job) |
| `:duplicate` | Many processes per key — all get returned on lookup | PubSub-style fan-out, multiple subscribers to a topic |

### Registry vs `:global` vs `Horde.Registry`

| | `Registry` | `:global` | `Horde.Registry` |
|--|-----------|-----------|-----------------|
| Scope | Single node | All connected nodes | Cluster (CRDT-based) |
| Dep needed | No (OTP) | No (OTP) | Yes |
| Use case | Local named processes | Simple cluster-wide names | Distributed, fault-tolerant registry |

### Registry is automatically cleaned up

When a registered process dies, its registry entry is automatically removed — no manual cleanup needed. `Registry.lookup/2` will return `[]` immediately after the process dies.

### Via tuples — named process routing

Registry enables the `{:via, Registry, {name, key}}` pattern, which lets you use Registry names anywhere a pid or registered name is accepted:

```elixir
GenServer.start_link(__MODULE__, state,
  name: {:via, Registry, {MyApp.Registry, "worker:#{id}"}}
)

# Send a call to the registered process without knowing its pid
GenServer.call({:via, Registry, {MyApp.Registry, "worker:#{id}"}}, :get_state)
```

---

## 10. Link vs Monitor — Decision Guide

```
Is lifecycle coupling desired?
├── YES (if A dies, B should too)
│   └── Use link / spawn_link
│       └── Are you the supervisor? Set trap_exit to handle {:EXIT, ...}
│           Otherwise let the signal propagate naturally
│
└── NO (A should keep running if B dies)
    └── Use monitor / spawn_monitor
        └── Handle {:DOWN, ref, :process, pid, reason} in handle_info/2
            └── Always match on ^ref to avoid handling wrong monitor
```

### Common real-world patterns

**Pattern: track a one-shot task, clean up on completion or crash**
```elixir
# In a GenServer init or handle_call
{pid, ref} = spawn_monitor(fn -> do_work() end)
# store {ref => pid} in state

def handle_info({:DOWN, ref, :process, _pid, reason}, state) do
  # task finished (reason :normal) or crashed (reason = error)
  {:noreply, Map.delete(state, ref)}
end
```

**Pattern: watch an external dependency, degrade gracefully**
```elixir
ref = Process.monitor(external_service_pid)
# if it dies, you get {:DOWN, ...} — you can switch to fallback mode
# without dying yourself
```

**Pattern: supervision (built into OTP — don't do manually)**
```elixir
# Supervisors use links internally. You use start_link and let the
# Supervisor handle the rest. Don't manually manage links for supervision.
```

---

## 11. Quick Reference

```elixir
# ─── SPAWNING ──────────────────────────────────────────────
spawn(fn -> ... end)                    # no link, no monitor
spawn_link(fn -> ... end)               # linked
{pid, ref} = spawn_monitor(fn -> end)   # monitored

# ─── LINKS ─────────────────────────────────────────────────
Process.link(pid)
Process.unlink(pid)

# ─── MONITORS ──────────────────────────────────────────────
ref = Process.monitor(pid)
Process.demonitor(ref)
Process.demonitor(ref, [:flush])        # also discard pending :DOWN

# ─── EXIT SIGNALS ──────────────────────────────────────────
Process.exit(pid, :shutdown)            # graceful, trappable
Process.exit(pid, {:shutdown, reason})  # structured, trappable
Process.exit(pid, :kill)                # nuclear, NOT trappable

# ─── TRAP EXIT ─────────────────────────────────────────────
Process.flag(:trap_exit, true)
# exit signals → {:EXIT, pid, reason} messages
# :kill still kills regardless

# ─── REGISTRY ──────────────────────────────────────────────
Registry.register(MyApp.Registry, key, meta)
Registry.lookup(MyApp.Registry, key)    # => [{pid, meta}] or []
Registry.unregister(MyApp.Registry, key)

# ─── PROCESS DICT ──────────────────────────────────────────
Process.put(:key, val)
Process.get(:key)
# avoid in application code — use GenServer state instead

# ─── HIBERNATION ───────────────────────────────────────────
# In GenServer callback:
{:noreply, state, :hibernate}
```

---

## 12. Interview Gotchas

**Q: Does `:normal` exit propagate through links?**
No. `:normal` is silently ignored by linked processes (unless they have `trap_exit: true`). Only abnormal exits propagate.

**Q: Can you trap a `:kill` signal?**
No. `Process.exit(pid, :kill)` bypasses `trap_exit` entirely. The process always terminates. The exit reason that propagates to its links is `:killed` (not `:kill`).

**Q: What happens if you monitor a process that's already dead?**
You immediately receive `{:DOWN, ref, :process, pid, :noproc}` — no race condition, no hanging.

**Q: Can multiple processes monitor the same pid?**
Yes — each gets their own `ref` and each receives their own `:DOWN` message when the process dies.

**Q: Can two processes have multiple links to each other?**
No — links are deduplicated. `Process.link(pid)` on an already-linked pid is a no-op. Only monitors can be stacked.

**Q: What's the risk of selective receive in a hot loop?**
O(n) mailbox scanning — if many non-matching messages sit ahead of the one you want, BEAM re-scans them on every new message arrival. Use `make_ref()` pinning and GenServer catch-all `handle_info` to prevent mailbox accumulation.

**Q: What does `Process.demonitor(ref, [:flush])` do that `demonitor(ref)` doesn't?**
It also removes any already-queued `{:DOWN, ref, ...}` from the mailbox. Without `:flush`, you may process a `:DOWN` for a monitor you already cancelled, causing a spurious code path to execute.
