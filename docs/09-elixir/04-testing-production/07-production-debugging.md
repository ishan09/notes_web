# Production Debugging in Elixir / BEAM

> The key insight: BEAM ships with a world-class introspection runtime. You can inspect, trace, and diagnose a live production node **without a restart, without a redeploy, and without stopping traffic**.

---

## 1. The Debugging Toolkit at a Glance

| Tool | Type | What it shows | Safe in prod? | Requires display? |
|------|------|---------------|---------------|-------------------|
| `:observer` | OTP built-in | GUI: processes, memory, supervision tree | Yes (read-only) | ✅ Yes |
| `:observer_cli` | External dep | TUI: same as observer, terminal-friendly | Yes (read-only) | ❌ No |
| `:recon` | External dep | CLI one-liners: top processes, mailbox, memory | Yes | ❌ No |
| `:recon_trace` | External dep (via recon) | Sampled function tracing with auto-stop | Yes (auto-limited) | ❌ No |
| `:sys` | OTP built-in | GenServer state, suspend/resume | Careful | ❌ No |
| `:dbg` / `:erlang.trace` | OTP built-in | Raw BEAM tracing | Risky in prod | ❌ No |
| `IEx.pry` | Built-in | Breakpoint in dev/test | Dev/test only | ❌ No |
| `:erlang.process_info/2` | OTP built-in | Deep per-process introspection | Yes | ❌ No |
| `:erlang.memory/0,1` | OTP built-in | VM-wide memory breakdown | Yes | ❌ No |
| `:erlang.system_info/1` | OTP built-in | Scheduler, atoms, ports, etc. | Yes | ❌ No |
| `LiveDashboard` | External dep | Web UI: metrics, processes, ETS | Yes | ❌ No (browser) |
| `remsh` / `IEx remote` | Built-in | Live IEx on a running node | Yes | ❌ No |

### Deps at a glance

```elixir
# mix.exs — all three are safe to include in production images
{:recon, "~> 2.5"},          # recon + recon_trace bundled together
{:observer_cli, "~> 1.7"},   # terminal UI (no display needed)
```

`:observer_cli` vs `:recon` — use `:observer_cli` when you want a **live auto-refreshing dashboard** navigable with arrow keys; use `:recon` when you want **quick scriptable one-liners** or are running commands non-interactively (e.g., `docker exec ... bin/app rpc`).

---

## 2. Connecting to a Running Node

### On a bare host (release binary)

```bash
# Simplest — works when you're already on the same machine
bin/my_app remote

# Explicit remsh from another machine (same LAN / VPN)
iex --name debug@127.0.0.1 --cookie my_cookie \
    --remsh my_app@prod-host
```

Once connected you have a full IEx REPL on the live VM — no restart required.

### Epmd (Erlang Port Mapper Daemon)
Nodes must be running in **distributed mode** (`--name` / `--sname`) for `remsh` to work. Check:

```bash
epmd -names   # list registered node names on this host
```

---

### Connecting inside a Docker container

Docker adds a networking layer between you and the BEAM node. There are two practical approaches:

#### Option A — `docker exec` (simplest, no networking config needed)

```bash
# Get a shell inside the running container
docker exec -it <container_id_or_name> /bin/sh

# Then run the remote console from inside the container
bin/my_app remote
```

This works because `bin/my_app remote` communicates with the running node via a **Unix socket** (or named pipe on the same host) — it does **not** need distributed Erlang / epmd when the binary and node are on the same machine (same container filesystem).

> ✅ This is the easiest and most common approach for Docker deployments.

#### Option B — Distributed Erlang over the network (required for Kubernetes / remote debugging)

This requires the node to be started in **distributed mode** and for ports to be reachable. Steps:

**1. Start the node with a name and cookie**

```elixir
# runtime.exs
config :my_app, release: [
  cookie: System.get_env("RELEASE_COOKIE") || "my_dev_cookie"
]
```

Or set env vars before starting:
```bash
RELEASE_NODE=my_app@10.0.0.5   # must match actual container IP
RELEASE_COOKIE=my_secret_cookie
bin/my_app start
```

**2. Expose the required ports in Docker**

BEAM distributed mode uses two ports:
- **epmd**: `4369` (port mapper — maps node names to ports)
- **Distribution port**: randomly assigned by default — must be pinned!

Pin the distribution port range in `vm.args.eex` (release config):

```
## rel/env.sh.eex  (or vm.args.eex)
-kernel inet_dist_listen_min 9000
-kernel inet_dist_listen_max 9000
```

Then expose both in Docker:

```yaml
# docker-compose.yml
ports:
  - "4369:4369"   # epmd
  - "9000:9000"   # distribution port
```

Or in Dockerfile / `docker run`:
```bash
docker run -p 4369:4369 -p 9000:9000 my_image
```

**3. Connect from outside the container**

```bash
# On your local machine (must have Elixir installed)
iex --name debug@YOUR_LOCAL_IP \
    --cookie my_secret_cookie \
    --remsh my_app@CONTAINER_IP
```

> ⚠️ The node name used inside the container must resolve correctly from outside. If the container's `RELEASE_NODE` is set to `my_app@10.0.0.5`, your local machine must be able to reach `10.0.0.5:9000`. In Docker Desktop (Mac/Windows) this is tricky — use `docker exec` instead.

#### Option C — `docker exec` + eval (for one-off commands without an interactive session)

```bash
# Run a single Elixir expression against the live node
docker exec <container> bin/my_app eval "IO.inspect(:erlang.memory())"
docker exec <container> bin/my_app eval ":recon.proc_count(:message_queue_len, 10) |> IO.inspect()"
docker exec <container> bin/my_app rpc "IO.puts(node())"
```

`eval` starts a fresh VM just to run the expression.
`rpc` connects to the running node and runs the expression there — **this is what you want for live state inspection**.

```bash
# Examples using rpc (runs in the live running node)
docker exec my_container bin/my_app rpc ":erlang.memory() |> IO.inspect()"
docker exec my_container bin/my_app rpc ":recon.proc_count(:message_queue_len, 5) |> IO.inspect()"
docker exec my_container bin/my_app rpc ":sys.get_state(MyApp.SomeServer) |> IO.inspect()"
```

#### Option D — LiveDashboard (easiest for Kubernetes / remote)

If your Phoenix app has LiveDashboard mounted, just port-forward to the container and open it in a browser:

```bash
# Kubernetes
kubectl port-forward pod/my-pod-xxxx 4000:4000

# Docker
docker run -p 4000:4000 ...
```

Then open `http://localhost:4000/dev/dashboard` — processes, memory, ETS, all there.

---

### Docker networking summary

| Approach | Setup effort | Interactive? | Live node? | Works in K8s? |
|----------|-------------|--------------|------------|---------------|
| `docker exec` + `bin/my_app remote` | Zero | ✅ Yes | ✅ Yes | ✅ (kubectl exec) |
| `docker exec` + `bin/my_app rpc` | Zero | ❌ (one-shot) | ✅ Yes | ✅ |
| Distributed Erlang over network | High (ports, names) | ✅ Yes | ✅ Yes | Possible but complex |
| LiveDashboard + port-forward | Low (if already set up) | Via browser | ✅ Yes | ✅ |

**Rule of thumb**: use `docker exec` + `remote` or `rpc` for Docker. Use LiveDashboard + `kubectl port-forward` for Kubernetes. Only set up distributed Erlang networking if you need cross-node cluster debugging.

---

## 3. Mailbox Inspection

A growing mailbox is the most common BEAM production problem. Processes receive messages faster than they can handle them, memory climbs, and eventually the supervisor's `max_restarts` kicks in.

### Find top offenders

```elixir
# Top 10 processes by message_queue_len (number of unread messages)
:recon.proc_count(:message_queue_len, 10)
# => [{#PID<0.256.0>, 18742, [name: MyApp.Worker, ...], ...}, ...]

# Human-readable alternative (shows registered name if any)
Process.list()
|> Enum.map(fn pid ->
  info = Process.info(pid, [:registered_name, :message_queue_len])
  {pid, info}
end)
|> Enum.sort_by(fn {_pid, info} -> -Keyword.get(info, :message_queue_len, 0) end)
|> Enum.take(10)
```

### Inspect a specific mailbox

```elixir
# How many messages?
Process.info(pid, :message_queue_len)
# => {:message_queue_len, 18742}

# Peek at the actual messages (WARNING: copies the whole mailbox into shell process)
Process.info(pid, :messages)
# Do NOT do this on a huge mailbox in production — use :recon.info instead

# Safe alternative — recon limits what it copies
:recon.info(pid, :messages)
```

### Emergency flush

```elixir
# From inside the GenServer (or via remote eval)
send(pid, :flush)  # only if the server handles it

# Nuclear option: kill and let supervisor restart it
Process.exit(pid, :kill)
```

---

## 4. Memory Diagnostics

### VM-wide memory breakdown

```elixir
:erlang.memory()
# => [
#   total: 134_217_728,
#   processes: 45_000_000,   # total process heap memory
#   processes_used: 40_000_000,
#   system: 89_000_000,
#   atom: 2_000_000,
#   atom_used: 1_800_000,
#   binary: 25_000_000,       # off-heap binary data
#   code: 12_000_000,
#   ets: 5_000_000
# ]

# Single key
:erlang.memory(:binary)    # large binaries are a common culprit
:erlang.memory(:processes)
```

### Per-process memory

```elixir
# Top 10 memory consumers
:recon.proc_count(:memory, 10)

# Info for one process
Process.info(pid, :memory)         # total bytes including stack + heap
Process.info(pid, :heap_size)      # heap word count
Process.info(pid, :binary)         # list of {Ref, Size, RefCount} for off-heap binaries
Process.info(pid, :garbage_collection)  # GC stats
```

### Binary memory leaks

Large binaries (> 64 bytes) are stored on a shared **binary heap** and reference-counted. A process holding a reference to a 100 MB binary prevents it from being freed even if it only uses 10 bytes.

```elixir
# Binaries kept alive by each process
:recon.proc_count(:binary, 10)

# Force GC on suspect process (diagnostic; don't abuse)
:erlang.garbage_collect(pid)

# To copy a binary slice and drop the reference to the large binary:
# Instead of: binary_part(big_binary, 0, 10)
# Use:        :binary.copy(binary_part(big_binary, 0, 10))
```

---

## 5. Process & Scheduler Introspection

### Process counts and growth

```elixir
# Total live process count
:erlang.system_info(:process_count)
# => 4821

# Max allowed (configured via +P vm arg)
:erlang.system_info(:process_limit)

# Are we close to the limit?
count = :erlang.system_info(:process_count)
limit = :erlang.system_info(:process_limit)
IO.puts("#{count}/#{limit} processes (#{round(count/limit*100)}%)")
```

### Scheduler utilization

```elixir
# Sample scheduler utilization over 1 second
:scheduler.sample_all()
# => needs the :scheduler library from OTP, or use :recon

# With recon (better API)
:recon.scheduler_usage(1000)   # sample for 1000ms
# => [{scheduler_id, utilization_pct}, ...]
```

### Find hot CPU processes (high reductions)

```elixir
# Top 10 by reductions (how much CPU work have they done in total)
:recon.proc_count(:reductions, 10)

# Snapshot-based delta: get reductions now, wait, get again
before = :erlang.process_info(pid, :reductions)
Process.sleep(1000)
after_val = :erlang.process_info(pid, :reductions)
# delta shows work done in that 1 second
```

### Atom table exhaustion

Atoms are never garbage-collected. Dynamically creating atoms (from user input or external data) causes a monotonic leak.

```elixir
:erlang.system_info(:atom_count)   # current atom count
:erlang.system_info(:atom_limit)   # default: 1_048_576

# Safe: use String.to_existing_atom/1 instead of String.to_atom/1
# for atoms that should already exist
```

### Port count (file descriptors, sockets, etc.)

```elixir
:erlang.system_info(:port_count)
:erlang.system_info(:port_limit)

# Inspect individual ports
Port.list() |> Enum.take(10) |> Enum.map(&Port.info/1)
```

---

## 6. GenServer State Inspection

```elixir
# Read current state of a GenServer (live snapshot)
:sys.get_state(MyApp.SomeServer)           # by registered name
:sys.get_state(pid)                        # by pid

# WARNING: this sends a message to the GenServer and waits for reply.
# If the GenServer is overloaded, this call can time out.
# Use carefully; don't call it in a tight loop.

# Full status (more verbose than get_state)
:sys.get_status(MyApp.SomeServer)
# Returns: {status, Pid, {module, Module}, [PDict, SysState, Parent, Dbg, Misc]}
# Misc contains the actual GenServer state and callback module
```

### Suspend and resume a GenServer

```elixir
# Suspend: the process stops handling messages (useful for state surgery)
:sys.suspend(MyApp.SomeServer)

# Change state while suspended
:sys.replace_state(MyApp.SomeServer, fn state ->
  Map.put(state, :debug_mode, true)
end)

# Resume
:sys.resume(MyApp.SomeServer)
```

---

## 7. Function Tracing in Production

### `:recon_trace` — safe production tracing

`:recon_trace` wraps `:dbg` with rate limiting and automatic shutdown to prevent trace storms from killing your node.

```elixir
# Trace all calls to MyModule.my_fun with any args (max 100 calls then auto-stop)
:recon_trace.calls({MyModule, :my_fun, :_}, 100)

# Trace with a specific arity
:recon_trace.calls({MyModule, :my_fun, 2}, 100)

# Trace with match spec (only when first arg is :error)
:recon_trace.calls({MyModule, :my_fun, fn([:error | _]) -> true end}, 50)

# Trace return values as well
:recon_trace.calls({MyModule, :my_fun, :_}, 100, return: true)

# Trace calls from a specific process only
:recon_trace.calls({MyModule, :my_fun, :_}, 100, pid: pid)

# Stop tracing early
:recon_trace.clear()
```

### `:dbg` — lower-level (use with care in prod)

```elixir
# Start tracer (outputs to shell)
:dbg.start()
:dbg.tracer()

# Trace calls on all processes
:dbg.p(:all, :c)   # :c = calls

# Trace a specific function
:dbg.tpl(MyModule, :my_fun, :_)   # tpl = trace pattern local (includes private)
:dbg.tp(MyModule, :my_fun, :_)    # tp  = trace pattern exported only

# Stop
:dbg.stop()
```

### Tracing process messages

```elixir
# Trace all messages sent to/received by a pid
:erlang.trace(pid, true, [:send, :receive, :timestamp])

# Read trace messages from shell (they come as {:trace, ...} messages to tracer pid)
```

---

## 8. ETS Table Inspection

ETS tables that grow without eviction are a common memory leak source.

```elixir
# List all ETS tables
:ets.all()
# => [reference_to_table, ...]

# Get info about a table
:ets.info(MyApp.Cache)
# => [name: MyApp.Cache, size: 50000, memory: 8_200_000, ...]
# :size  = number of entries
# :memory = words (multiply by 8 on 64-bit for bytes)

# Check sizes of all tables
:ets.all()
|> Enum.map(fn tab ->
  info = :ets.info(tab)
  {info[:name], info[:size], info[:memory] * 8}
end)
|> Enum.sort_by(fn {_, _, mem} -> -mem end)
|> Enum.take(10)

# Count entries
:ets.info(MyApp.Cache, :size)

# Peek at entries
:ets.tab2list(MyApp.Cache) |> Enum.take(5)   # careful with large tables
:ets.first(MyApp.Cache)                        # first key
:cts.next(MyApp.Cache, key)                    # iterate
```

---

## 9. IEx.pry and Break in Dev/Test

```elixir
# Insert a breakpoint — execution pauses, you get an IEx shell
# at that point in the code

defmodule MyModule do
  def my_fun(arg) do
    require IEx
    IEx.pry()   # <-- pauses here in dev/test
    arg + 1
  end
end

# Then run: iex -S mix
# When pry hits, you're dropped into a shell with local variables bound
```

```elixir
# break!/2 — set a breakpoint without editing source
# (available in IEx session during mix run)
IEx.break!(MyModule, :my_fun, 2)     # break on MyModule.my_fun/2
IEx.breaks()                          # list active breakpoints
IEx.reset_break(id)                   # remove one
IEx.remove_breaks()                   # remove all
```

---

## 10. Diagnosing Common Production Problems

### Problem: Memory climbing, no obvious cause

**Checklist:**
1. `l:erlang.memory()` — which category is growing? (`:binary`, `:processes`, `:ets`)
2. If `:binary` → `:recon.proc_count(:binary, 10)` → find the holder
3. If `:processes` → `:recon.proc_count(:memory, 10)` → find the bloated process
4. If `:ets` → `:ets.info/1` loop above → find the unbounded table
5. Process leak? → track `:erlang.system_info(:process_count)` over time

### Problem: High latency / timeouts, system otherwise healthy

**Checklist:**
1. `:recon.proc_count(:message_queue_len, 10)` — is any process backed up?
2. `:recon.scheduler_usage(1000)` — is a scheduler saturated?
3. `:recon.proc_count(:reductions, 10)` — which process is burning CPU?
4. DB pool: check `Ecto.Adapters.SQL.Sandbox` or `:ets.info(DBConnection.Pool, :size)` — pool exhausted?
5. External HTTP: any connection pool limits or DNS timeouts?

### Problem: GenServer crashes / supervisor restarts

**Checklist:**
1. Check logs for the crash reason — look for `** (EXIT) ...` or `CRASH REPORT`
2. `:sys.get_state(Server)` — before the next crash, capture the state that causes it
3. `:recon_trace.calls({MyServer, :handle_call, :_}, 50, return: true)` — trace the call sequence
4. Check if the supervisor's `max_restarts` / `max_seconds` is too tight (causing it to give up too soon)

### Problem: Node running out of atoms

```elixir
:erlang.system_info(:atom_count)
# grep codebase for String.to_atom — replace with String.to_existing_atom
```

### Problem: File descriptor exhaustion

```elixir
:erlang.system_info(:port_count)
:erlang.system_info(:port_limit)
# Also check OS: lsof -p <beam_pid> | wc -l
```

---

## 11. Multi-Node Debugging: Catching a Flaky Crash Across a Cluster

> **The problem**: a node dies after a specific request, but with multiple nodes behind a load balancer you don't know which node will receive it. You can't reproduce it locally. You need to catch it in action — on whichever node it lands.

---

### Why this is hard

- Standard `remsh`/`docker exec` connects you to **one specific node**.
- The crash happens on **whichever node the LB routes to** — could be any of N.
- You can't just trace on one node and wait.

---

### Strategy 1: Activate tracing on ALL nodes simultaneously (the right answer)

Since nodes in a cluster are connected (distributed Erlang), you can run code on every node from a single IEx session.

```elixir
# Connect to any one node
bin/my_app remote   # or docker exec + remote

# From that IEx session, get all connected nodes
Node.list()
# => [:"my_app@10.0.0.2", :"my_app@10.0.0.3", :"my_app@10.0.0.4"]

# Run a command on ALL nodes (including the current one)
for node <- [node() | Node.list()] do
  Node.spawn(node, fn ->
    :recon_trace.calls({MyModule, :suspect_function, :_}, 50,
      return: true,
      scope: :local
    )
  end)
end
```

Now **all nodes are tracing**. Whichever node receives the bad request will emit trace output to its own shell/logs. Combine with structured logging (below) to capture it centrally.

---

### Strategy 2: Log the crash reason on all nodes (passive, no tracing overhead)

Add a telemetry handler or Logger handler that captures and enriches crash reports:

```elixir
# In your application.ex or a dedicated module
:telemetry.attach(
  "catch-crashes",
  [:my_app, :error],
  fn _event, _measurements, %{reason: reason, stacktrace: st}, _cfg ->
    Logger.error("Crash caught",
      reason: inspect(reason),
      stacktrace: Exception.format_stacktrace(st),
      node: node()   # <-- tells you WHICH node crashed
    )
  end,
  nil
)
```

In Logger config, ensure `node()` is always included in metadata:

```elixir
# config/prod.exs
config :logger, :default_formatter,
  metadata: [:request_id, :node, :module, :function, :line]
```

Then in your log aggregator (Datadog, Loki, CloudWatch), filter by the crash and see exactly which node + request triggered it.

---

### Strategy 3: `:rpc.multicall` — query all nodes at once

```elixir
# From any connected node's IEx session
nodes = [node() | Node.list()]

# Get memory from all nodes
:rpc.multicall(nodes, :erlang, :memory, [], 5000)
# => {[results_list], [bad_nodes]}

# Get process count from all nodes
:rpc.multicall(nodes, :erlang, :system_info, [:process_count], 5000)

# Get mailbox stats from all nodes
:rpc.multicall(nodes, :recon, :proc_count, [:message_queue_len, 5], 5000)
```

This is how you compare state **across all nodes in one command** — great for "is the problem on all nodes or just one?"

---

### Strategy 4: Global process registration — find the process regardless of which node it's on

If the crashing process is a named GenServer, use `:global` or `Horde` (if you have it) to find it across the cluster:

```elixir
# If registered with :global
pid = :global.whereis_name(MyApp.SomeWorker)
node(pid)   # tells you which node it lives on
:sys.get_state(pid)   # works cross-node transparently

# Horde.Registry lookup (if using Horde)
Horde.Registry.lookup(MyApp.Registry, "worker-key")
# => [{pid, meta}] — pid may be on any node, :sys.get_state still works
```

Once you have the PID, all the usual tools (`:sys.get_state`, `:recon_trace`, etc.) work **transparently across nodes** — BEAM handles the remote messaging for you.

---

### Strategy 5: Sticky routing during debugging (reduce the search space)

If your LB supports it, **temporarily pin your test traffic to one node**:

```bash
# Nginx: upstream with single server for a specific header/cookie
# HAProxy: stick-table by source IP
# Kubernetes: add a nodeSelector or use a specific pod's ClusterIP directly

# K8s — bypass the Service, hit a specific pod directly
kubectl port-forward pod/my-app-pod-xxxx 4000:4000
# Then send the bad request to localhost:4000 — guaranteed to hit that pod
```

This lets you use `docker exec` / `kubectl exec` + `:recon_trace` on that specific node with certainty.

---

### Strategy 6: Crash dump + `erl_crash.dump` analysis (post-mortem)

If the node **actually dies** (not just a process crash), BEAM writes a crash dump. See **Section 12** for full analysis guide.

---

### Multi-node debugging decision tree

```
Node is dying (actual crash)?
├── YES → check erl_crash.dump for post-mortem analysis
│         + ensure SASL/Logger captures CRASH REPORT before death
└── NO  (process crash, GenServer restart) →
    Can you reproduce it reliably?
    ├── YES → sticky-route to one node (Strategy 5) + recon_trace
    └── NO  →
        Is the cluster connected (distributed Erlang)?
        ├── YES → broadcast recon_trace to all nodes (Strategy 1)
        │         + rpc.multicall to compare state (Strategy 3)
        └── NO  → enrich logs with node() + request_id (Strategy 2)
                  and aggregate centrally
```

---

### Practical setup: always include node identity in logs and telemetry

```elixir
# In application.ex start/2, run this once per node at boot
Logger.metadata(node: node())

# In a Plug (for every request)
plug :tag_node
defp tag_node(conn, _opts) do
  Logger.metadata(node: node(), request_id: get_req_header(conn, "x-request-id"))
  conn
end
```

With `node()` in every log line, you immediately know which node produced each log entry — no guessing.

---

## 12. LiveDashboard (Phoenix apps)

Add to your router (typically behind auth in production):

```elixir
# router.ex
import Phoenix.LiveDashboard.Router

scope "/" do
  pipe_through :browser
  live_dashboard "/dashboard",
    metrics: MyAppWeb.Telemetry,
    ecto_repos: [MyApp.Repo]
end
```

Gives you in-browser:
- **Home**: memory, atoms, ports, processes, uptime
- **Processes**: searchable table with mailbox, memory, reductions
- **Ports**: open file descriptors and sockets
- **ETS**: all tables with sizes
- **Metrics**: Telemetry-powered charts
- **Request Logger**: live log stream

---

## 12. `erl_crash.dump` — Post-Mortem Analysis

> A crash dump is BEAM's black box recorder. When a node dies (OOM, unhandled signal, VM crash), it writes everything it knows about every process, port, and memory region at the moment of death to a single file. It is your **only** source of truth after the node is gone.

---

### What triggers a crash dump?

| Trigger | Example |
|---------|---------|
| Out of memory | Process/atom/binary heap exhausts system RAM |
| Atom table full | `:erlang.system_info(:atom_limit)` exceeded |
| Port table full | Too many open file descriptors/sockets |
| Unhandled signal | `kill -9` does NOT produce a dump — use `SIGTERM` or `SIGUSR1` |
| VM internal error | NIF crash, corrupted heap |
| Explicit from shell | `kill -USR1 <beam_pid>` → forces dump without killing node |

> ⚠️ `kill -9` (SIGKILL) bypasses BEAM entirely — **no dump is written**. Use `SIGTERM` for graceful shutdown, `SIGUSR1` to force a dump while the node keeps running.

---

### Where is the dump written?

```bash
# Default: current working directory of the beam process
ls -la erl_crash.dump

# In a release, typically the release root dir
ls -la /app/erl_crash.dump

# Override via env var (set before starting the node)
ERL_CRASH_DUMP=/var/log/my_app/erl_crash.dump bin/my_app start

# Limit time spent writing (large dumps can take minutes)
ERL_CRASH_DUMP_SECONDS=30   # kill dump writer after 30s
                             # 0 = disable dump entirely (not recommended)
                             # default = unlimited

# In Docker / K8s: mount a volume so the dump survives container death
volumes:
  - /host/logs:/var/log/my_app
```

---

### Forcing a dump without killing the node (diagnostic)

```bash
# Send SIGUSR1 to the BEAM process — writes dump then continues running
kill -USR1 $(pgrep -f beam.smp)

# In Docker
docker exec my_container kill -USR1 1   # pid 1 is usually beam in containers
```

This is useful for capturing a "live snapshot" dump when you notice something wrong but the node hasn't crashed yet.

---

### Tool 1: `crashdump_viewer` — the GUI analyzer (OTP built-in)

```bash
# Start an Erlang shell with the viewer
erl

# Inside the Erlang shell:
crashdump_viewer:start().
# Opens a web-based UI at http://localhost:8080
# (no wx/display needed — it's a browser UI served by the viewer)
```

The viewer gives you:
- **General info**: OTP version, system limits, crash reason
- **Processes**: every process at time of crash — state, mailbox size, heap, stack trace, current function, last calls
- **Ports**: open file descriptors, sockets
- **ETS tables**: contents at time of crash
- **Memory**: breakdown same as `:erlang.memory()`
- **Atoms**: full atom table (useful for atom leak diagnosis)
- **Loaded modules**: what code was loaded

> The viewer is a web UI served locally — works fine in a headless server or Docker if you port-forward port 8080.

---

### Tool 2: `WombatOAM` / `Erlang Ecosystem` tools (alternative)

For very large dumps (GBs), the built-in viewer can be slow. Alternatives:
- **`cdv`** (crash dump viewer CLI) — ships with OTP, `erts/bin/cdv`
- **`recon`** has some dump analysis helpers (less common)

---

### Tool 3: Reading the dump manually — it's a plain text file

The dump format is documented and human-readable. Each section starts with `=tag`:

```bash
# What killed the node?
grep "=erl_crash_dump" erl_crash.dump | head -5
# => =erl_crash_dump:0.5
# => Sun May 25 10:32:01 2026
# => Slogan: Kernel pid terminated (application_controller) ...
# => System version: Erlang/OTP 26

# Crash reason / slogan (first thing to read)
grep "^Slogan:" erl_crash.dump
# => Slogan: Kernel pid terminated (application_controller) ({application_start_failure,...})

# All processes at time of crash
grep "^=proc " erl_crash.dump | wc -l        # how many processes were alive?
grep "^=proc " erl_crash.dump | head -20     # list their PIDs

# Memory at time of crash
grep "^=memory" erl_crash.dump -A 20

# Which process had the biggest mailbox?
grep "^Message queue length:" erl_crash.dump | sort -t: -k2 -rn | head -10

# Find processes with the most memory
grep "^Memory:" erl_crash.dump | sort -t: -k2 -rn | head -10

# Atom count (was atom table exhausted?)
grep "^Number of atoms:" erl_crash.dump
```

---

### Anatomy of a process entry in the dump

```
=proc:<0.256.0>
State: Garbing           ← what it was doing (Garbing = GC, Running, Waiting, etc.)
Registered name: MyApp.Worker
Spawned as: MyApp.Worker:init/1
Spawned by: <0.100.0>
Started: Mon May 25 10:31:55 2026
Message queue length: 18742     ← huge mailbox = likely cause
Number of heap fragments: 3
Heap fragment data: 1204
OldHeap: 174762
Heap: 987654
Arity: 0
Memory: 8342016                 ← bytes
Stack+heap: 987654
OldHeap: 174762
Prog count: ...
Current call: MyApp.Worker:handle_info/2
Last calls:
  MyApp.Worker:handle_info/2
  gen_server:loop/7
  ...
Stack dump:
...
```

**Key fields to check first:**

| Field | What it tells you |
|-------|-------------------|
| `Slogan` | Top-level crash reason — start here |
| `State` | What was the process doing? `Garbing` = in GC, `Running` = on scheduler |
| `Message queue length` | Mailbox size — large = backpressure/overload |
| `Memory` | Per-process bytes — large = state bloat or binary refs |
| `Current call` | Where was the process when it died |
| `Last calls` | Call history — trace the path to the crash |
| `Registered name` | Which named process is this |

---

### Common crash dump patterns and what they mean

#### Pattern 1: `Slogan: out of memory`

```bash
grep "^Slogan:" erl_crash.dump
# => Slogan: out of memory

# Find the memory hogs
grep "^Memory:" erl_crash.dump | sort -t: -k2 -rn | head -10

# Was it binary memory?
grep "^=memory" erl_crash.dump -A 5
# Look for large "binary" value

# Was it mailbox growth?
grep "^Message queue length:" erl_crash.dump | sort -t: -k2 -rn | head -10
```

→ Fix: find the process with the biggest mailbox or memory. Usually a GenServer receiving faster than processing, or a binary reference not being released.

---

#### Pattern 2: `Slogan: Kernel pid terminated`

```bash
grep "^Slogan:" erl_crash.dump
# => Slogan: Kernel pid terminated (application_controller) ({application_start_failure,...})
```

→ An OTP application failed to start. The reason is in the slogan itself. Usually a bad config, missing env var, or a `start/2` callback raising.

---

#### Pattern 3: Atom table exhausted

```bash
grep "^Number of atoms:" erl_crash.dump
# => Number of atoms: 1048576   ← at the limit (default max)

grep "^=atoms" erl_crash.dump -A 100 | grep "user_" | head -20
# Look for suspiciously dynamic atom names (user IDs, request IDs turned into atoms)
```

→ Fix: find where `String.to_atom/1` is called with dynamic values. Replace with `String.to_existing_atom/1` or keep as strings.

---

#### Pattern 4: One process had a massive mailbox

```bash
grep "^Message queue length:" erl_crash.dump | sort -t: -k2 -rn | head -5
# => Message queue length: 2847392

# Find which process and what it does
grep -A 10 "Message queue length: 2847392" erl_crash.dump
# Look at: Registered name, Spawned as, Current call
```

→ Fix: that process can't keep up with its message rate. Add backpressure, shard the work, or use `GenStage`/`Broadway` for demand-driven flow.

---

### Production setup checklist for crash dumps

```bash
# 1. Always set a custom path (so it survives container restarts if volume-mounted)
ERL_CRASH_DUMP=/var/log/my_app/erl_crash.dump

# 2. Set a time limit so a huge dump doesn't hang shutdown
ERL_CRASH_DUMP_SECONDS=60

# 3. In Docker/K8s — mount a persistent volume for the dump dir
#    otherwise the dump dies with the container

# 4. In K8s — copy the dump before the pod is deleted
kubectl cp my-pod:/var/log/my_app/erl_crash.dump ./erl_crash.dump

# 5. Alert when a dump file appears (it means the node died)
# In your monitoring: watch for file creation at the dump path

# 6. SASL reports — ensure they're enabled for crash context in logs
#    See 04-observability-operations.md → SASL section for full config
#    Short version:
#      config :logger, handle_otp_reports: true   # the important one — routes crash reports through Logger
#      config :logger, handle_sasl_reports: false  # keep false in prod (startup noise)
```

---

### Crash dump vs CRASH REPORT in logs — what's the difference?

| | `erl_crash.dump` | `CRASH REPORT` in logs |
|--|-----------------|----------------------|
| **When** | Node-level death | Single process crash (supervisor child) |
| **Survives restart?** | Yes (file on disk) | Only if log is shipped externally |
| **Detail level** | Everything — all processes, full memory | Single process — reason + stacktrace |
| **Produced by** | BEAM VM | SASL / Logger |
| **Useful for** | OOM, atom exhaustion, VM crashes | GenServer crashes, bad match, exceptions |

> For most production bugs (GenServer crash, bad pattern match, FunctionClauseError), **CRASH REPORTs in logs are enough** — you don't need a full dump. The dump is for when the entire node dies and you need to understand why.

---

## 13. LiveDashboard (Phoenix apps)

```elixir
# ─── INTERACTIVE DASHBOARDS ────────────────────────────────
:observer.start()                            # GUI (needs display, dev only)
:observer_cli.start()                        # TUI (terminal, works in Docker/K8s)

# ─── MAILBOX ───────────────────────────────────────────────
:recon.proc_count(:message_queue_len, 10)   # top offenders
Process.info(pid, :message_queue_len)        # specific pid
:recon.info(pid, :messages)                 # safe mailbox peek

# ─── MEMORY ────────────────────────────────────────────────
:erlang.memory()                             # VM breakdown
:recon.proc_count(:memory, 10)              # top memory pids
:recon.proc_count(:binary, 10)              # binary holders
:erlang.garbage_collect(pid)                # force GC (diagnostic)

# ─── CPU / SCHEDULING ──────────────────────────────────────
:recon.proc_count(:reductions, 10)          # hot processes
:recon.scheduler_usage(1000)                # scheduler load %

# ─── COUNTS ────────────────────────────────────────────────
:erlang.system_info(:process_count)
:erlang.system_info(:process_limit)
:erlang.system_info(:atom_count)
:erlang.system_info(:port_count)

# ─── GENSERVER ─────────────────────────────────────────────
:sys.get_state(pid_or_name)                 # live state
:sys.get_status(pid_or_name)                # verbose status
:sys.suspend(pid_or_name)                   # pause it
:sys.resume(pid_or_name)                    # unpause it

# ─── TRACING ───────────────────────────────────────────────
:recon_trace.calls({Mod, :fun, :_}, 100)    # safe tracing (single node)
:recon_trace.clear()                         # stop all traces

# ─── MULTI-NODE ────────────────────────────────────────────
Node.list()                                  # all connected nodes
node()                                       # current node name

# Broadcast trace to every node in the cluster
for n <- [node() | Node.list()] do
  Node.spawn(n, fn -> :recon_trace.calls({Mod, :fun, :_}, 50) end)
end

# Query all nodes at once
:rpc.multicall([node() | Node.list()], :erlang, :memory, [], 5000)
:rpc.multicall([node() | Node.list()], :recon, :proc_count, [:message_queue_len, 5], 5000)

# Find a globally registered process (any node)
pid = :global.whereis_name(MyApp.SomeWorker)
node(pid)                                    # which node is it on?
:sys.get_state(pid)                          # works cross-node transparently

# ─── ETS ───────────────────────────────────────────────────
:ets.all()                                   # all tables
:ets.info(TableName)                         # size, memory, etc.

# ─── CRASH DUMP ────────────────────────────────────────────
# Force dump without killing node (diagnostic snapshot)
# kill -USR1 $(pgrep -f beam.smp)

# Env vars (set before starting)
# ERL_CRASH_DUMP=/var/log/my_app/erl_crash.dump
# ERL_CRASH_DUMP_SECONDS=60

# Analyze: start the GUI viewer (serves browser UI on localhost:8080)
# erl -noshell -eval 'crashdump_viewer:start()' -eval 'timer:sleep(infinity)'

# Quick grep analysis
# grep "^Slogan:" erl_crash.dump                                  # crash reason
# grep "^Message queue length:" erl_crash.dump | sort -t: -k2 -rn | head -10
# grep "^Memory:" erl_crash.dump | sort -t: -k2 -rn | head -10
# grep "^Number of atoms:" erl_crash.dump
```
