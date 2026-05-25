# Phoenix / Elixir — Level 3 Interview Sheet (Staff / System Design)

Level 3 assumes Level 2 is solid. These topics probe system design judgment, failure reasoning, production trade-offs, and architecture decisions. Expect open-ended design questions and "what goes wrong at scale."

---

## Topic Map

| # | Topic | File |
|---|-------|------|
| 1 | Designing a High-Load Phoenix System | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 2 | Real-Time System Design (LiveView / Channels at scale) | [02-liveview-real-time-ui.md](03-phoenix-ecto/02-liveview-real-time-ui.md) |
| 3 | Distributed BEAM (clustering, split-brain, netsplit) | [07-distributed-nodes.md](02-beam-otp/07-distributed-nodes.md) |
| 4 | Data Consistency & Transactions (fintech, saga, outbox) | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 5 | Job Processing & Background Work (Oban, retries, idempotency) | [05-oban-scheduling-cron-pitfalls.md](04-testing-production/05-oban-scheduling-cron-pitfalls.md) |
| 6 | Backpressure & System Stability (load shedding, circuit breaker) | [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md) |
| 7 | API Resilience & External Calls (timeouts, circuit breaker, bulkhead) | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 8 | Caching Strategy (ETS vs Redis, invalidation, per-node) | [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md) |
| 9 | Database Design Under Load (pool tuning, replicas, N+1) | [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md) |
| 10 | Observability at Scale (Telemetry, tracing, memory leaks) | [04-observability-operations.md](04-testing-production/04-observability-operations.md) |
| 11 | Umbrella vs Microservices (architecture decisions, boundaries) | [05-otp-behaviours.md](02-beam-otp/05-otp-behaviours.md) |
| 12 | State Management Strategy (GenServer vs DB vs ETS) | [02-genserver-stateful-services.md](02-beam-otp/02-genserver-stateful-services.md) |
| 13 | Failure Design (DB down, PubSub fails, node crash) | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 14 | Security & Fintech (auth, replay, audit, sensitive data) | [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md) |
| 15 | Deployment & Scaling Strategy (zero-downtime, rolling, blue-green) | [03-deployment-releases.md](04-testing-production/03-deployment-releases.md) |

---

## 1. Designing a High-Load Phoenix System

**Questions:**
- Design a system handling 50k req/s in Phoenix
- How would you scale Phoenix horizontally?
- How do you keep services stateless?
- How do BEAM nodes communicate?
- What happens when a node goes down?

**Key answers:**
- Stateless HTTP handlers + DB/Redis as source of truth. Add nodes behind LB for linear scaling.
- Each node runs the same Phoenix app. LB distributes requests. No shared in-process state between nodes.
- DB connection pool per node (`pool_size` × nodes ≤ DB `max_connections`). Read replicas for read-heavy paths.
- Nodes communicate via distributed Erlang (TCP mesh) or indirectly via DB/Redis. Keep cross-node messaging minimal.
- LB health check removes the crashed node. Clients reconnect. Oban rescues orphaned jobs. State in DB survives.

→ Full walkthrough: [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md)

---

## 2. Real-Time System Design (LiveView / Channels)

**Questions:**
- Design real-time stock/portfolio updates for 100k concurrent users
- How would you handle 100k concurrent WebSocket users?
- Channels vs LiveView — when to use each?
- How does PubSub broadcast across a cluster?
- How do you avoid message storms?
- What happens on reconnect?

**Key answers:**
- 100k LiveView = 100k BEAM processes. Scale horizontally. Coalesce PubSub broadcasts (debounce). Keep `socket.assigns` minimal.
- Channels: use when you need bidirectional client-driven messaging (e.g., chat). LiveView: use when the server drives the UI (dashboards, forms, real-time data).
- PubSub broadcasts to all subscribers on all cluster nodes via the PubSub adapter. Each node delivers to its local subscribers.
- Message storms: throttle broadcasts with debounce, send IDs not full payloads, let clients fetch on demand.
- On reconnect: `mount/2` is called fresh. State is re-initialized from DB. Missed broadcasts are lost — design for re-fetch on mount.

→ Details: [02-liveview-real-time-ui.md](03-phoenix-ecto/02-liveview-real-time-ui.md), [08-pubsub-topics-broadcasts.md](03-phoenix-ecto/08-pubsub-topics-broadcasts.md)

---

## 3. Distributed BEAM (Multi-node Systems)

**Questions:**
- How do you connect multiple Phoenix nodes?
- What is a distributed Erlang cluster?
- How do nodes discover each other?
- What happens during a netsplit?
- How do you handle split-brain scenarios?
- How is message passing handled across nodes?

**Key answers:**
- `Node.connect(:"node@ip")` with shared cookie. Use `libcluster` for automatic discovery in Kubernetes/DNS environments.
- A distributed Erlang cluster is a full-mesh TCP-connected group of BEAM nodes. Processes can send messages to PIDs on any node.
- Discovery: libcluster with Kubernetes API strategy, DNS polling, or Gossip protocol.
- Netsplit: cluster partitions into two halves. Both sides continue operating independently. Global singletons duplicate. PubSub splits.
- Split-brain: use external coordination (DB advisory locks, unique constraints) for strict singletons. Accept eventual consistency for PubSub/caches.
- Cross-node `send/2` works when connected. Messages are serialized and sent over TCP. Disconnection = message loss.

→ Details: [07-distributed-nodes.md](02-beam-otp/07-distributed-nodes.md)

---

## 4. Data Consistency & Transactions

**Questions:**
- How do you ensure consistency in a fintech system?
- How do you handle distributed transactions?
- Why is BEAM not good for distributed transactions?
- How would you design eventual consistency?
- How would you implement the Saga pattern in Elixir?

**Key answers:**
- DB transactions + Ecto.Multi for multi-step operations. DB constraints enforce invariants. Idempotency keys for payment ops.
- Avoid distributed transactions. Use Saga (compensating actions) or Outbox pattern (write intent to DB, process async).
- BEAM has no 2PC. Cross-node messaging is best-effort. Network partitions break global coordination. Use the DB.
- Eventual consistency: write to DB, broadcast events via PubSub/Oban. Readers tolerate brief staleness; consistency converges through the DB.
- Saga: `Step1` succeeds → `Step2` fails → run `compensate_step1`. Implement as Oban jobs with explicit compensation workers.

→ Details: [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md)

---

## 5. Job Processing & Background Work

**Questions:**
- How do you handle background jobs at scale?
- Why use Oban over spawning Tasks?
- What happens if a job crashes?
- How do you ensure idempotency?
- How do you retry safely without amplifying load?

**Key answers:**
- Oban: Postgres-backed, durable, retryable, inspectable. Tasks: in-memory, lost on crash/deploy.
- Job crashes → Oban marks `retryable`, retries with exponential backoff up to `max_attempts`, then `discarded`.
- Idempotency: check-before-act, DB unique constraints, idempotency keys on external APIs, `unique` Oban option.
- Safe retries: return `{:snooze, seconds}` for rate-limited APIs. Separate queue per workload type. Separate Oban Repo from app Repo to isolate DB pressure.

→ Details: [05-oban-scheduling-cron-pitfalls.md](04-testing-production/05-oban-scheduling-cron-pitfalls.md)

---

## 6. Backpressure & System Stability

**Questions:**
- How do you prevent system overload in Phoenix?
- What is backpressure in BEAM?
- How do you control mailbox growth?
- How do you reject requests gracefully?
- How do you design a circuit breaker?

**Key answers:**
- Backpressure: slow producers when consumers can't keep up. BEAM has no automatic backpressure — you design it explicitly.
- Mailbox growth: bounded `Task.async_stream` concurrency, GenStage demand signals, reject new work when queue is too long.
- Reject gracefully: return `503` with `Retry-After` when health metrics exceed threshold. Fail fast, don't let queue build.
- Circuit breaker states: `closed` → (failures) → `open` (fail-fast) → (timeout) → `half-open` (probe) → `closed`. Use `:fuse` library or a GenServer.

→ Details: [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md)

---

## 7. API Resilience & External Calls

**Questions:**
- External payment API is slow — what happens and what do you do?
- How do you handle timeouts properly?
- How do you avoid blocking BEAM schedulers?
- How do you isolate failures from external dependencies?

**Key answers:**
- Slow API → BEAM processes accumulate waiting → DB connections held → request latency climbs → cascade.
- Set explicit timeouts at every layer: HTTP client < job timeout < controller timeout.
- BEAM schedulers: HTTP calls yield immediately (non-blocking IO). The risk is **too many concurrent slow calls** exhausting process/connection pools.
- Isolation: bulkhead — dedicate a bounded concurrency pool (Oban queue with `concurrency: 5`) to each external dependency. Circuit breaker for fast-fail.

→ Details: [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md)

---

## 8. Caching Strategy (ETS vs Redis)

**Questions:**
- When to use ETS vs Redis for caching?
- How do you cache DB queries in Phoenix?
- How is ETS consistency handled across nodes?
- What are cache invalidation strategies?
- What are ETS memory limits?

**Key answers:**
- ETS: per-node, in-process, microsecond reads, no network. Redis: shared across nodes, millisecond reads, durable, supports expiry/pub-sub.
- Use ETS for: per-node config, rate limit counters, session lookups, feature flags. Use Redis for: cross-node shared caches, distributed locks, shared session storage.
- ETS is NOT distributed. Each node has its own copy. Invalidate via PubSub broadcast: one node updates DB → broadcasts invalidation event → all nodes clear their ETS cache.
- Invalidation patterns: TTL (time-based expiry), event-driven (PubSub on write), write-through (update ETS + DB in same operation).
- ETS memory: tables live outside the owning process heap. No automatic GC — you must delete entries explicitly. Monitor with `:ets.info(table, :memory)`.

→ Details: [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md)

---

## 9. Database Design Under Load

**Questions:**
- How do you scale a DB for a Phoenix app?
- Read replicas vs sharding — when to choose each?
- How does Ecto behave with replicas?
- How do you avoid N+1 queries?
- How do you tune connection pool size?

**Key answers:**
- Scale path: optimize queries → tune pool_size → add read replicas → connection pooler (PgBouncer) → sharding (last resort).
- Read replicas: for read-heavy workloads with tolerable replication lag. Sharding: for write-heavy workloads that exceed one primary's capacity (complex, avoid unless necessary).
- Ecto + replicas: create a second `ReadonlyRepo` pointing to the replica. Use it explicitly for queries that tolerate staleness.
- N+1: use `Repo.preload` or join in the initial query. Never load associations in a loop. Use `Ecto.Query` with explicit joins.
- Pool size: `pool_size = DB max_connections / num_nodes`. Monitor `queue_time` telemetry — rising queue_time = pool pressure.

→ Details: [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md)

---

## 10. Observability at Scale

**Questions:**
- How do you debug a production Phoenix system?
- What metrics matter most?
- How do you trace a request end-to-end?
- What signals indicate system overload?
- How do you detect memory leaks?

**Key answers:**
- Debug: metrics first (find the hot spot), then `:recon` for process introspection, then `:recon_trace` for function-level tracing without restart.
- Key metrics: request p95/p99, DB queue_time + query_time, process count, mailbox lengths, supervisor restart rate, memory.
- Overload signals: rising mailbox lengths, DB queue_time spike, supervisor restart bursts, p99 latency growth, 503 rate increase.
- Memory leaks: `:recon.proc_count(:memory, 10)` + `:erlang.memory(:binary)`. Look for mailbox accumulation, large binary references, leaking processes.

→ Details: [04-observability-operations.md](04-testing-production/04-observability-operations.md)

---

## 11. Umbrella vs Microservices

**Questions:**
- When would you choose umbrella apps vs microservices?
- How do you split a fintech system into bounded domains?
- How do you enforce boundaries in a large Elixir codebase?
- When does an umbrella become a problem?
- Migration strategy from monolith to distributed?

**Key answers:**
- Umbrella: same deploy, compile-time boundary enforcement, direct function calls. Good for a team that wants modularity without distributed system complexity.
- Microservices: independent deployment, independent scaling, polyglot. Good when teams/scaling/reliability requirements genuinely differ per service.
- Fintech split example: `Accounts` (users, auth), `Ledger` (balances, transactions), `Payments` (external API integration), `Notifications` (emails, webhooks).
- Enforce boundaries: context public APIs, `mix boundary` library, no cross-context Repo access, no Phoenix types in domain code.
- Umbrella problems: too many apps (management overhead), cross-app transactions (single Repo limitation), apps that need independent deploys (wrong tool).
- Monolith → distributed: extract contexts first (monolith with clear seams), then extract to umbrella apps, then to separate services if needed. Don't skip steps.

→ Details: [05-otp-behaviours.md](02-beam-otp/05-otp-behaviours.md), [04-contexts-application-boundaries.md](03-phoenix-ecto/04-contexts-application-boundaries.md)

---

## 12. State Management Strategy

**Questions:**
- Where should state live in a Phoenix system?
- When to use GenServer vs DB vs ETS?
- What happens if a stateful process dies?
- How do you replicate state across nodes?
- When to persist vs keep in memory?

**Key answers:**

| State type | Where to store |
|---|---|
| User data, orders, transactions | DB (Postgres) — source of truth |
| Session / auth tokens | DB or Redis (shared, survives restart) |
| Per-node cache | ETS (fast reads, lost on restart — rebuild from DB) |
| Rate limit counters | ETS (per-node) or Redis (global) |
| Live connection state (LiveView) | Process memory (rebuilt on reconnect from DB) |
| Background job state | Oban in Postgres (durable) |

- If a stateful GenServer dies: state is lost. Supervisor restarts it with a clean `init/1`. Re-initialize from DB/ETS if needed.
- Don't replicate state across nodes — use the DB as shared source of truth. Cache locally in ETS per-node.
- In-memory state is valid for: temporary coordination, caches with TTL, rate limits. DB is for anything that must survive crashes.

→ Details: [02-genserver-stateful-services.md](02-beam-otp/02-genserver-stateful-services.md), [04-concurrency-patterns-performance.md](02-beam-otp/04-concurrency-patterns-performance.md)

---

## 13. Failure Design

**Questions:**
- DB goes down — what happens step by step?
- PubSub fails — what's the user impact?
- One node crashes — what breaks and how do you recover?
- How do you design graceful degradation?
- How do you isolate failures?

**Key answers (summary):**
- DB down: `DBConnection.ConnectionError` on all `Repo` calls → 500s → Oban retries amplify → circuit breaker opens → fail-fast with 503 → alert.
- PubSub failure: LiveView UIs go stale. No data corruption. Clients don't know — they just stop receiving updates. On reconnect, `mount/2` re-fetches from DB.
- Node crash: LB removes it, clients reconnect, Oban rescues orphaned jobs, in-memory state lost. Recovery: stateless design + DB as truth = fast recovery.
- Graceful degradation: feature flags to disable expensive paths, circuit breakers for dependencies, cache fallback for reads, 503 with Retry-After for writes.

→ Full scenarios: [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md)

---

## 14. Security & Fintech

**Questions:**
- How do you secure Phoenix APIs?
- How do you prevent replay attacks?
- How do you audit transactions?
- Where do you enforce validation?
- How do you handle sensitive data?

**Key answers:**
- Auth: JWT plug at pipeline level. Authorization: inside context functions. Never trust raw controller input.
- Replay attacks: short-lived tokens with `exp`, nonce/jti stored and checked, HMAC request signatures with timestamps.
- Audit: write immutable audit records in the same DB transaction as the state change. Never lose the audit log.
- Validation: changesets at context boundary. DB constraints as the last line of defense.
- Sensitive data: encrypt at rest (`Cloak`), never log PII, access control at context level.

→ Details: [06-system-design-failure-scenarios.md](04-testing-production/06-system-design-failure-scenarios.md)

---

## 15. Deployment & Scaling Strategy

**Questions:**
- How do you deploy Phoenix at scale?
- How do you do zero-downtime deploys?
- Rolling deploy vs blue-green — when to choose?
- How do nodes join the cluster during deploy?
- What happens to live WebSocket connections?

**Key answers:**
- Deploy: Mix release → Docker image → Kubernetes rolling update. Migrations as init container before rollout.
- Zero-downtime: backward-compatible migrations, health checks gate traffic, graceful shutdown drains in-flight requests.
- Rolling: lower resource cost, requires migration backward compatibility. Blue-green: instant rollback, higher cost, safer for risky migrations.
- Nodes join: libcluster discovers new pod via DNS/K8s API, `Node.connect` called, node joins mesh. Old pod drains then exits.
- WebSocket clients disconnect on node death, auto-reconnect via `liveview.js`/channel client. `mount/2` re-initializes from DB.

→ Details: [03-deployment-releases.md](04-testing-production/03-deployment-releases.md)

---

## Real Interview Scenarios

### Scenario 1: 100k LiveView users — CPU spikes
1. Find bottleneck: `:recon.proc_count(:reductions, 10)` — identify hot processes.
2. Check PubSub fan-out — coalesce broadcasts.
3. Check `socket.assigns` size — reduce it.
4. Add `phx-debounce` to reduce event frequency.
5. Scale horizontally — add nodes.

### Scenario 2: DB pool exhausted
1. Immediately: lower Oban `concurrency`, shed non-critical traffic with 503.
2. Identify: slow queries via `pg_stat_activity`, `queue_time` metric.
3. Kill offending slow queries if safe.
4. Long-term: optimize queries, tune `pool_size`, add read replica, separate Oban Repo.

### Scenario 3: One GenServer becomes a hotspot
1. Detect: `:recon.proc_count(:message_queue_len, 10)`.
2. Fix immediately: shard by key (`N` GenServers, route by hash).
3. Or: move reads to ETS, keep GenServer for writes only.
4. Or: remove GenServer entirely if stateless (pure function or ETS is enough).

### Scenario 4: External API latency increases
1. Circuit breaker opens → fail-fast, return degraded response.
2. Move calls to Oban job queue → return 202 Accepted immediately.
3. Set explicit timeouts on HTTP client.
4. Bulkhead: cap concurrency of workers calling that API.

### Scenario 5: One node crashes in cluster
1. LB health check removes it (automatic).
2. LiveView/channel clients reconnect to other nodes.
3. Oban rescues orphaned jobs after `rescue_interval`.
4. Cluster membership updates via libcluster.
5. Investigate root cause before restarting — check logs, crash dump.

---

## How to Answer (Staff Level)

Structure every answer:
1. **Clarify assumptions** — scale, consistency requirements, latency budget
2. **Identify the bottleneck** — don't propose solutions before diagnosing
3. **Propose architecture** — with explicit trade-offs
4. **Handle failure scenarios** — what breaks first, how to recover
5. **Discuss operational concerns** — observability, deploy strategy, scaling knobs
