# System Design & Failure Scenarios

Staff-level interviews ask you to reason through high-load designs and live failures. This file covers the key scenarios with concrete answers and trade-off reasoning.

---

## How to Answer System Design Questions (Staff Level)

1. **Clarify requirements**: scale, consistency, latency budget, stateless vs stateful.
2. **Identify bottlenecks** before proposing solutions.
3. **Propose architecture** with explicit trade-offs.
4. **Handle failure scenarios** — what breaks first, how to recover.
5. **Discuss operational concerns**: deploy, observability, scaling knobs.

---

## Scenario 1: 100k LiveView Users — CPU Spikes

> 100k users connected via LiveView. CPU is spiking. What do you do?

**Where is the bottleneck?**

1. **Each LiveView = one BEAM process** with memory for `socket.assigns`. At 100k, that's ~100k processes.
2. CPU spikes are usually from: heavy `handle_event` callbacks, too-frequent re-renders, or broadcast fan-out.
3. Check: `:recon.proc_count(:reductions, 10)` — find which processes are burning CPU.
4. Check PubSub fan-out: a single broadcast to 100k subscribers sends 100k messages — each subscriber process wakes up.

**How to debug?**

```elixir
# Find hot processes
:recon.proc_count(:reductions, 10)

# Find mailbox growth (subscribers falling behind)
:recon.proc_count(:message_queue_len, 10)

# Check scheduler utilization
:erlang.statistics(:scheduler_wall_time)
```

**How to reduce load?**

- **Throttle events**: use `phx-debounce` or `phx-throttle` in templates to reduce event frequency.
- **Reduce assigns size**: keep `socket.assigns` minimal — don't store large preloaded structs.
- **Coalesce PubSub broadcasts**: instead of broadcasting on every change, batch or debounce broadcasts (one broadcast per 100ms max).
- **Paginate LiveView data**: don't render 1000 rows — render 50, load more on demand.
- **Use `assign_async/3`**: offload slow data fetching to async tasks so the LiveView process stays responsive.
- **Scale horizontally**: add nodes, distribute connections via load balancer. LiveView processes are isolated — they scale with nodes.

---

## Scenario 2: DB Pool Exhausted

> DB connection pool is exhausted. Requests are timing out.

**What happens to requests?**

1. New `Repo` calls queue waiting for a connection.
2. After `queue_timeout` (default 5s), calls raise `DBConnection.ConnectionError`.
3. Web requests return 500 errors.
4. Oban jobs fail and retry, potentially amplifying the problem.
5. If retries increase load: positive feedback loop — system spiral.

**How to mitigate immediately?**

1. **Reduce concurrency**: lower Oban queue `concurrency` to stop background jobs consuming connections.
2. **Identify slow queries**: connect to Postgres directly, run `pg_stat_activity` to find long-running queries. Kill them if safe.
3. **Shed load**: temporarily return 503 on non-critical endpoints to reduce query volume.
4. **Check for leaks**: a process checking out a connection but not returning it (rare, usually a long transaction).

**Long-term fix?**

- Tune `pool_size` to match DB `max_connections` / number of nodes.
- Identify and optimize slow queries (add indexes, avoid N+1).
- Add read replicas for read-heavy queries.
- Give Oban its own separate Repo with its own pool so background job pressure doesn't affect web requests.
- Add a circuit breaker on DB-heavy endpoints.

---

## Scenario 3: One GenServer Becomes a Hotspot

> A GenServer is a bottleneck. p99 latency is climbing. What's happening and how do you fix it?

**Why does this happen?**

- The GenServer serializes all access — one message at a time.
- As traffic grows, the mailbox fills faster than messages are processed.
- `GenServer.call` callers block waiting, eventually hitting the 5s timeout.
- The process's message queue grows → memory pressure → GC pauses → worse latency.

**Detection**:
```elixir
# Find the bottleneck process
:recon.proc_count(:message_queue_len, 10)

# Inspect its state
{:status, pid, _, [_, _, _, _, misc]} = :sys.get_status(pid)
```

**Fixes**:

1. **Shard it**: partition by key, create N GenServers, route by `rem(:erlang.phash2(key), n)`.
2. **Move reads to ETS**: if the hotspot is mostly reads, store state in ETS (concurrent reads, no serialization). GenServer only handles writes.
3. **Use `cast` instead of `call`** where a reply isn't needed — don't block callers unnecessarily.
4. **Offload slow work**: move heavy computation out of callbacks into Tasks.
5. **Remove the GenServer entirely**: if it's a pure lookup with no mutation, ETS or a Registry is always better.

---

## Scenario 4: External API Latency Increases

> An external payment API response time goes from 200ms to 5s. What breaks and how do you fix it?

**Impact without protection**:

- Every request that calls the API blocks its BEAM process for 5s.
- BEAM processes accumulate waiting — memory grows.
- DB connections held for the duration of slow requests (if wrapped in a transaction).
- Other endpoints slow down due to resource saturation.
- At scale: cascading failure.

**Solution architecture**:

1. **Set timeouts explicitly**:
   ```elixir
   HTTPoison.get(url, [], timeout: 2000, recv_timeout: 2000)
   ```

2. **Add a circuit breaker**: after N failures, open the breaker and fail-fast without waiting for the API.

3. **Move to async + job queue**:
   ```elixir
   # Instead of synchronous call in controller:
   MyApp.PaymentWorker.new(%{user_id: id, amount: amount}) |> Oban.insert()
   # Return 202 Accepted immediately
   ```

4. **Bulkhead**: isolate external API calls to a bounded pool (e.g., dedicated Oban queue with `concurrency: 5`). Prevents slowness in one integration from consuming all workers.

5. **Timeouts at every layer**: HTTP client timeout < Oban job timeout < controller timeout. Never let a slow dependency propagate unbounded waiting.

---

## Scenario 5: One Node Crashes in Cluster

> One Phoenix node goes down. What breaks and how do you recover?

**What breaks?**

- **HTTP requests on that node**: in-flight requests fail. LB health checks remove the node from rotation automatically.
- **WebSocket connections**: LiveView/Channel clients connected to that node disconnect. `liveview.js` reconnects automatically to another node.
- **Named processes on that node**: any `Registry`-registered or `:global`-registered process on the crashed node is gone. Processes on other nodes are unaffected.
- **PubSub**: subscriptions held by processes on the crashed node are lost. Those clients must reconnect and re-subscribe.
- **Oban**: jobs claimed by the crashed node are unlocked after `rescue_interval` and picked up by other nodes.
- **In-memory state (ETS, GenServer)**: gone. DB is the source of truth; clients re-fetch on reconnect.

**Recovery strategy**:

1. LB removes crashed node automatically via health checks.
2. Clients reconnect to healthy nodes — LiveView re-mounts, channels re-join.
3. Oban rescue job re-queues orphaned jobs.
4. Cluster membership updates via libcluster.
5. If node was a PubSub broadcaster: no impact — PubSub fan-out continues on remaining nodes.

**Design to make this safe**:
- Stateless request handling (state in DB/Redis, not in-process).
- Idempotent operations (safe to re-run on reconnect).
- Short LiveView reconnect windows (clients retry fast).
- Graceful drain before intentional shutdowns (SIGTERM → drain connections → exit).

---

## Designing a High-Load Phoenix System (50k req/s)

**Clarify first**: read-heavy or write-heavy? What's the consistency requirement? Acceptable latency?

**Architecture**:

```
Load Balancer (nginx / AWS ALB)
  │
  ├── Phoenix Node 1
  ├── Phoenix Node 2     ← stateless HTTP, each node handles all routes
  └── Phoenix Node N
       │
       ├── Ecto Pool → Postgres Primary (writes)
       ├── Ecto ReadRepo → Postgres Replica (reads)
       └── Redis / PubSub (if cross-node state needed)
```

**Key design decisions**:

1. **Stateless request handlers**: no in-process state for HTTP — use DB/Redis/cache.
2. **DB read replicas**: offload read queries to replicas for high read volume.
3. **Caching with ETS**: per-node ETS cache for frequently read, rarely changing data (config, feature flags, user sessions).
4. **Connection pool sizing**: `pool_size` = (DB max_connections) / num_nodes.
5. **Oban on its own pool**: separate background job DB connections from web request connections.
6. **Rate limiting at edge**: nginx/API gateway rate limits before hitting Phoenix.
7. **Horizontal scaling**: Phoenix is stateless — add nodes behind LB to scale linearly.

**How do BEAM nodes communicate?**

In a cluster: via distributed Erlang (TCP connections, mesh). For PubSub fan-out across nodes, Phoenix.PubSub propagates broadcasts to all nodes. For state: prefer the DB as source of truth over cross-node state sharing.

**What happens when a node goes down?**

LB health check removes it. In-flight requests fail. Clients reconnect. Oban rescues orphaned jobs. No data loss if state was in DB.

---

## Data Consistency & Transactions

### How do you ensure consistency in a fintech system?

1. **DB transactions are the primary consistency mechanism** — not distributed BEAM coordination.
2. **Ecto.Multi for multi-step operations**: all steps succeed or all roll back atomically.
3. **DB-level constraints**: unique indexes, foreign keys, check constraints — DB enforces invariants even under concurrent writes.
4. **Optimistic concurrency**: add a `version` or `updated_at` field; check it on update to detect concurrent modifications.
5. **Idempotency keys**: for payment operations, store the client-provided idempotency key in DB with a unique constraint — duplicate requests are safe.

### How do you handle distributed transactions?

BEAM does NOT provide distributed transactions across nodes. For cross-service consistency:

1. **Avoid distributed transactions where possible**: keep related data in one DB, use Ecto.Multi.
2. **Saga pattern**: sequence of local transactions with compensating actions on failure.
   ```
   Step 1: reserve funds → success
   Step 2: charge card   → failure
   Compensate: release funds reservation
   ```
3. **Outbox pattern**: write the "intent" to a local DB table in the same transaction as the state change. A worker then processes the outbox and delivers the side effect (email, webhook, event).
4. **At-least-once with idempotency**: accept that side effects may execute more than once; ensure they're idempotent.

### Why isn't BEAM good for distributed transactions?

BEAM has no distributed transaction protocol (no 2PC). Network partitions are possible. Cross-node message passing is best-effort. Correctness under partitions requires external coordination (DB locks, consensus systems). For financial invariants, the DB transaction is far more reliable than distributed process coordination.

---

## Security & API Resilience

### How do you secure Phoenix APIs?

1. **Authentication**: JWT/token verification in a plug at pipeline level. Never skip auth.
2. **Authorization**: in context functions — not in controllers. Controllers call contexts; contexts check permissions.
3. **CSRF**: Phoenix CSRF plug for HTML forms. API pipelines skip CSRF (use token auth instead).
4. **Input validation**: changesets at context boundary. Never trust raw user input.
5. **Rate limiting**: per-user/per-IP via plug or gateway before it reaches business logic.
6. **HTTPS only**: SSL termination at load balancer; redirect HTTP to HTTPS.
7. **Secrets**: in `runtime.exs` from environment variables — never in code or compile-time config.

### How do you prevent replay attacks?

1. **Short-lived tokens**: JWTs with `exp` claim. Expired tokens are rejected.
2. **Nonce / jti claim**: store used token IDs in Redis/DB; reject reuse within validity window.
3. **HMAC signatures with timestamps**: sign requests with timestamp; reject requests older than N seconds.
4. **Idempotency keys with TTL**: payment requests carry client-generated UUID; server stores and deduplicates within time window.

### How do you handle sensitive data?

1. **Encrypt at rest**: use DB-level encryption or application-level field encryption (e.g., `Cloak` library).
2. **Never log sensitive fields**: configure Logger to filter or redact PII.
3. **Audit trail**: write immutable audit records for sensitive operations in same DB transaction.
4. **Access control at context level**: authorization checks inside context functions, not just at controller.

---

## Failure Design: Graceful Degradation

### DB goes down — what happens?

Without protection:
- All `Repo` calls fail with `DBConnection.ConnectionError`.
- Requests return 500.
- Oban jobs fail and retry (amplifying load on recovery).

With protection:
- Circuit breaker opens on DB errors — fail-fast without waiting.
- Return 503 with `Retry-After` header.
- Serve cached responses (ETS) where data is stale-tolerant.
- Queue write operations in Oban — they'll process when DB recovers.
- Alert immediately; DB outage is a P1 incident.

### PubSub fails — what's the impact?

PubSub failure (e.g., a bad adapter, network partition) means:
- LiveView clients don't receive updates — UI becomes stale.
- They don't disconnect — they just stop seeing changes.
- On reconnect, LiveView re-mounts and re-fetches current state from DB.

**Design**: don't rely on PubSub for correctness — only for UI freshness. The DB is always the source of truth. A missed broadcast = user sees stale data for a moment, not corrupted data.

### How do you design graceful degradation?

```
Full service  →  Degraded (cached/slow)  →  Partial (core only)  →  Maintenance mode
```

1. **Feature flags**: disable expensive non-critical features under load.
2. **Circuit breakers**: fail-fast for unhealthy dependencies; serve degraded responses.
3. **Cache fallback**: serve ETS or Redis cache when DB is unavailable (stale-tolerant reads).
4. **Load shedding**: return 503 on non-critical endpoints when health metrics exceed thresholds.
5. **Core path protection**: never let analytics, email, or reporting workloads starve the critical user-facing path.
