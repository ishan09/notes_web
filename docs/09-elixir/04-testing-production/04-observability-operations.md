# Observability and Operations

Operational visibility matters in Elixir just like any other production system.

## Core Concepts

- **Logger** for structured application logs
- **Telemetry** for metrics and instrumentation
- **Tracing** for request and process visibility
- **Error monitoring** for production incident response

## Practical Notes

- Log meaningful context, not noise.
- Instrument key workflows and slow paths.
- Watch process counts, message queues, and supervisor restarts.

## Common Questions (With Answers)

1. **What should you monitor in an OTP application?**
   Process counts, message queue lengths, supervisor restarts, error rates, latency, and dependency health (DB, external APIs).

2. **Why are process metrics important?**
   Many BEAM issues appear as overloaded processes: growing mailboxes, high reductions, large heaps, frequent GC, and restarts.

3. **How do logs and telemetry complement each other?**
   Logs explain discrete events; telemetry provides aggregated, measurable signals (rates, latency, distributions) that drive alerting and dashboards.

4. **What’s a common logging mistake?**
   Logging too much at high volume, which increases costs and hides signal. Prefer structured logs with identifiers and correlation IDs.

5. **What’s a useful metric for backpressure problems?**
   Message queue length and time spent waiting in queues, alongside throughput and latency metrics for the relevant pipeline.

## Advanced Questions (With Answers)

1. **Why is tail latency often the real problem in BEAM services?**
   A few overloaded processes can cause timeouts even when average latency looks fine. Monitor percentiles and identify hot processes.

2. **How do you connect HTTP request traces to background jobs?**
   Propagate correlation IDs into job args/metadata and emit telemetry events with consistent fields across boundaries.

3. **What’s a common reason for “mysterious” memory growth?**
   Mailbox accumulation, retaining large binaries, or leaking processes. Inspect message queues and process heap/binary memory usage.

4. **How do supervisor restarts show up operationally?**
   They can look like intermittent failures. Alert on unusual restart rates and correlate with dependency outages and deploys.

5. **What’s a pragmatic approach to production debugging?**
   Start with metrics to identify hot spots, then use targeted introspection (top processes, queues, errors) rather than trying to read raw logs first.

---

## Observability Deep Dive

### How does Telemetry work in Phoenix and Ecto?

The `:telemetry` library provides a lightweight event bus. Libraries emit named events; you attach handlers to consume them.

```elixir
# Ecto emits this after every query:
[:my_app, :repo, :query]
# with measurements: %{query_time: ..., queue_time: ..., decode_time: ...}

# Phoenix emits this after every request:
[:phoenix, :endpoint, :stop]
# with measurements: %{duration: ...}
# and metadata: %{conn: conn, ...}
```

**Attaching a handler**:
```elixir
:telemetry.attach(
  "log-query-time",
  [:my_app, :repo, :query],
  fn _event, measurements, _meta, _config ->
    ms = System.convert_time_unit(measurements.query_time, :native, :millisecond)
    Logger.debug("Query took #{ms}ms")
  end,
  nil
)
```

**In practice**: use `Telemetry.Metrics` + a reporter (e.g., `TelemetryMetricsPrometheus`) to aggregate events into counters, gauges, and histograms exported to your metrics stack.

### How do you trace a slow request end-to-end?

1. **Attach a request ID** in a plug at the start of the pipeline:
   ```elixir
   plug Plug.RequestId  # sets x-request-id header and Logger metadata
   ```

2. **Propagate via Logger metadata**:
   ```elixir
   Logger.metadata(request_id: conn.assigns[:request_id])
   ```
   All subsequent `Logger.info/warn/error` calls in that process include the request_id.

3. **Emit telemetry spans** at each layer (Ecto query, external HTTP call, context function).

4. **Correlate in your APM** (Datadog, AppSignal, Honeycomb) using the request_id as the trace root.

For production function tracing without a deploy:
```elixir
# Trace MyModule.slow_function for up to 100 calls, auto-stop
:recon_trace.calls({MyModule, :slow_function, :_}, 100, scope: :local)
```

### What metrics matter in production?

**Request layer**:
- Request rate (req/s) per route
- Response time: p50, p95, p99
- Error rate (4xx, 5xx) by endpoint

**Database**:
- Query time: p50, p95, p99
- Pool queue_time (DB pressure signal)
- Connection pool utilization

**BEAM process health**:
- Total process count
- Top processes by message_queue_len, memory, reductions
- Supervisor restart count (spike = systemic issue)

**Memory**:
- Total memory (BEAM + binary heap)
- Per-process top memory hogs
- Binary memory (large binary retention)

**Oban (if used)**:
- Jobs completed/failed/discarded per queue
- Job execution latency
- Queue backlog depth

### How do you debug production issues without restarts?

1. **`:observer.start()`** — GUI tool if you have display access or remote desktop.
2. **`:recon`** — CLI-safe introspection:
   ```elixir
   :recon.proc_count(:message_queue_len, 10)  # find mailbox growth
   :recon.proc_count(:memory, 10)              # find memory hogs
   :recon.info(pid, :messages)                 # inspect mailbox of specific pid
   ```
3. **`:sys.get_state(pid)`** — inspect GenServer state live (careful in prod — copies large state).
4. **Remote console**: connect with `bin/my_app remote` to get an IEx session on the running node.
5. **LiveDashboard**: `/dev/dashboard` for real-time metrics without custom tooling.

### How do you detect memory leaks?

Common causes:
- **Mailbox accumulation**: a GenServer receiving messages faster than it processes them.
- **Large binary references**: keeping a reference to a slice of a large binary keeps the entire binary alive.
- **Leaking processes**: processes spawned but never terminated (missing supervision, `spawn` without cleanup).
- **ETS tables growing**: no eviction logic for old entries.

Detection:
```elixir
# Is binary memory growing?
:erlang.memory(:binary)

# Find top binary-retaining processes
:recon.proc_count(:binary, 10)

# Find total process count trend
length(Process.list())

# Force GC on a suspicious process (diagnostic only)
:erlang.garbage_collect(pid)
```

### How do supervisor restarts show up operationally?

Track the event `[:supervisor, :child, :start_error]` or monitor supervisor restart counts via telemetry or `:sys.get_status(supervisor_pid)`. A restart rate spike that correlates with a deploy, DB slowdown, or external API issue is a strong signal.

Alert: "more than N restarts of process X in Y seconds" → investigate root cause before it escalates to the supervisor’s max_restarts threshold and takes the whole supervisor down.

---

### SASL — System Architecture Support Library

SASL is an OTP application (ships with Erlang, no extra dep) that provides structured **crash, supervisor, and progress reports** for OTP processes. It predates modern Logger — think of it as OTP’s original operational event layer.

#### What SASL emits

| Report type | When it fires |
|-------------|--------------|
| `CRASH REPORT` | A supervised process crashes (reason, stacktrace, mailbox size, neighbours) |
| `SUPERVISOR REPORT` | Supervisor notices a child died / was restarted |
| `PROGRESS REPORT` | Application/supervisor started successfully (startup noise) |
| `ERROR REPORT` | Legacy `error_logger` calls |

A `CRASH REPORT` looks like this in logs:
```
=CRASH REPORT====
  crasher:
    pid: <0.256.0>
    registered_name: MyApp.Worker
    error_info: {error, {badmatch, nil},
                  [{MyApp.Worker, handle_call, 3,
                    [{file,"lib/worker.ex"},{line,42}]}, ...]}
    message_queue_len: 0
    memory: 24112
  neighbours: []
```

#### Enabling SASL reports in Logger (recommended production setup)

Modern Elixir (1.10+) routes SASL reports through Logger. You **don’t** need to start SASL as an OTP app — just configure Logger:

```elixir
# config/prod.exs
config :logger,
  level: :info,
  handle_otp_reports: true,    # ✅ routes CRASH + SUPERVISOR reports through Logger
  handle_sasl_reports: false   # ⛔ PROGRESS reports — too noisy for prod, keep false
```

- **`handle_otp_reports: true`** — the important one. Without it, GenServer crash reports bypass your Logger backends (Datadog, Loki, etc.) entirely and only print to stderr.
- **`handle_sasl_reports: true`** — also captures startup progress reports. Only useful when debugging boot issues; leave `false` in production.

Both default to `false` in Elixir — **you must set `handle_otp_reports: true` explicitly**.

#### Do you need `:sasl` in `extra_applications`?

Only for legacy tools that rely on `error_logger` directly (rare):

```elixir
# mix.exs — only add :sasl if you use legacy error_logger-based tools
def application do
  [
    extra_applications: [:logger, :sasl],
    mod: {MyApp.Application, []}
  ]
end
```

For modern Elixir apps: **skip this**. The Logger config above is sufficient.

#### Recommended production Logger config

```elixir
# config/prod.exs
config :logger,
  level: :info,
  handle_otp_reports: true,
  handle_sasl_reports: false

config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :node, :module, :function, :line]
```

With this setup:
- All GenServer crashes → appear in your structured logs with full reason + stacktrace
- Supervisor restarts → logged automatically
- Startup noise → suppressed
- Every log line → tagged with `node` (critical for multi-node debugging)
