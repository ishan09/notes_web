# The 30 System Design Patterns — Master Cheatsheet

<!-- TAG: system-design-patterns, cheatsheet, load-balancing, sharding, caching, cqrs, saga, message-queue, circuit-breaker, service-mesh, sidecar, leader-election, webhook, materialized-view, two-phase-commit -->

> **Purpose**: A single quick-reference map of the 30 patterns that show up in almost every system design interview and every real production architecture. Each entry gives you the one-line trigger ("pick it when...") and the one-line cost ("main trade-off...") first, then either points you to the existing deep-dive in this repo or — for patterns not covered in depth elsewhere — expands into a full explanation with diagrams and code.

## Table of Contents
1. [Quick Reference Table](#quick-reference-table)
2. [Scaling & Data Distribution](#1-scaling--data-distribution) — Load Balancing, Horizontal Scaling, Database Sharding, Read Replicas, Consistent Hashing, Data Partitioning
3. [Caching & Content Delivery](#2-caching--content-delivery) — Cache-Aside, Write-Through, Write-Behind, CDN, Materialized Views
4. [Data Consistency & Transactions](#3-data-consistency--transactions) — Event Sourcing, CQRS, Distributed Transactions (2PC), Saga Pattern
5. [Messaging & Async Processing](#4-messaging--async-processing) — Message Queue, Publish-Subscribe, Event-Driven Architecture, Stream Processing, Webhook Pattern
6. [Resilience & Fault Tolerance](#5-resilience--fault-tolerance) — Circuit Breaker, Retry Pattern, Bulkhead, Rate Limiting, Failover
7. [Coordination & Service Infrastructure](#6-coordination--service-infrastructure) — Leader Election, Service Discovery, API Gateway, Sidecar Pattern, Service Mesh

---

## Quick Reference Table

| # | Pattern | Pick It When | Main Trade-off |
|---|---------|--------------|-----------------|
| 1 | Load Balancing | Traffic exceeds one server | Needs statelessness or session handling |
| 2 | Horizontal Scaling | Load keeps growing | Coordination complexity |
| 3 | Database Sharding | One DB cannot handle writes | Cross-shard queries become hard |
| 4 | Read Replicas | Reads greatly exceed writes | Replication lag |
| 5 | Consistent Hashing | Nodes frequently join/leave | More complex routing |
| 6 | Cache-Aside | Read-heavy workloads | Stale cache risk |
| 7 | Write-Through Cache | Data must stay fresh | Slower writes |
| 8 | Write-Behind Cache | Ultra-fast writes needed | Potential data loss |
| 9 | CDN | Global low-latency delivery | Stale content until refresh |
| 10 | Materialized Views | Expensive queries repeated often | Refresh lag |
| 11 | Event Sourcing | Need complete audit/history | Complex event replay |
| 12 | CQRS | Read and write workloads differ | More components |
| 13 | Data Partitioning | Massive datasets | Rebalancing challenges |
| 14 | Distributed Transactions | Strong consistency required | Performance overhead |
| 15 | Saga Pattern | Distributed business workflows | Eventual consistency |
| 16 | Message Queue | Need asynchronous processing | Increased latency |
| 17 | Publish-Subscribe | Multiple consumers need events | Harder debugging |
| 18 | Event-Driven Architecture | Services react to events | Eventual consistency |
| 19 | Stream Processing | Real-time analytics needed | Operational complexity |
| 20 | Webhook Pattern | External notifications required | Delivery reliability issues |
| 21 | Circuit Breaker | Dependency failures cascade | Recovery tuning required |
| 22 | Retry Pattern | Temporary failures common | Retry storms possible |
| 23 | Bulkhead | Isolate failures between services | Resource fragmentation |
| 24 | Rate Limiting | Protect services from overload | Possible user throttling |
| 25 | Failover | High availability required | Duplicate infrastructure cost |
| 26 | Leader Election | Single coordinator needed | Election overhead |
| 27 | Service Discovery | Dynamic service locations | Additional infrastructure |
| 28 | API Gateway | Many backend services | Central bottleneck risk |
| 29 | Sidecar Pattern | Shared service functionality | Extra resource usage |
| 30 | Service Mesh | Large microservice deployments | Significant operational complexity |

---

## 1. Scaling & Data Distribution

<!-- TAG: load-balancing, horizontal-scaling, sharding, read-replicas, consistent-hashing, data-partitioning -->

These six patterns answer the same question — "traffic/data grew past what one machine can hold" — at different layers of the stack (network, compute, database). All six already have full deep dives in [`02-scalability-patterns.md`](./02-scalability-patterns.md); this section is the fast-recall summary.

### Load Balancing
**Pick it when**: Traffic exceeds one server. **Trade-off**: Needs statelessness or session handling — once requests can land on any instance, per-instance in-memory session state breaks.
```
Client → Load Balancer → [Server A, Server B, Server C]
Algorithms: Round Robin, Least Connections, Weighted, IP Hash, L4 vs L7
```
Deep dive: [`02-scalability-patterns.md#load-balancing`](./02-scalability-patterns.md#load-balancing).

### Horizontal Scaling
**Pick it when**: Load keeps growing past what vertical scaling (bigger box) can absorb. **Trade-off**: Coordination complexity — now you have distributed state, distributed deployment, distributed debugging.
```
Vertical:   1 server,  4 → 8 → 16 cores   (ceiling exists, single point of failure)
Horizontal: 1 → 10 → 100 servers          (near-infinite, but needs LB + stateless design)
```
Deep dive: [`02-scalability-patterns.md#vertical-vs-horizontal-scaling`](./02-scalability-patterns.md#vertical-vs-horizontal-scaling).

### Database Sharding
**Pick it when**: One DB instance cannot handle the write volume (the usual bottleneck — reads scale with replicas, writes don't). **Trade-off**: Cross-shard queries and joins become hard or impossible without a scatter-gather query across every shard.
```
users 1-1M     → Shard A
users 1M-2M    → Shard B
users 2M-3M    → Shard C
Query "top user by signup date across all users" → fan out to A, B, C, merge in app
```
Deep dive: [`02-scalability-patterns.md#sharding`](./02-scalability-patterns.md#sharding).

### Read Replicas
**Pick it when**: Reads greatly exceed writes (the common case — most systems are read-heavy 80/20 or more). **Trade-off**: Replication lag — a replica can serve stale data for milliseconds-to-seconds after a write to the primary.
```
Write → Primary  ─┬─→ Replica 1 (reads)
                   ├─→ Replica 2 (reads)
                   └─→ Replica 3 (reads)
Read-your-own-write problem: user writes, then reads from a replica that hasn't caught up yet
```
Deep dive: [`02-scalability-patterns.md#replication`](./02-scalability-patterns.md#replication).

### Consistent Hashing
**Pick it when**: Nodes frequently join or leave the cluster (caches, sharded stores, load balancer pools) and you can't afford to rehash everything on every membership change. **Trade-off**: More complex routing logic than `hash(key) % N`.
```
Naive hash % N:      adding 1 node reshuffles ~100% of keys
Consistent hashing:  adding 1 node only reshuffles ~1/N of keys (keys move to the new node's ring segment)
```
Deep dive: [`02-scalability-patterns.md#consistent-hashing`](./02-scalability-patterns.md#consistent-hashing).

### Data Partitioning
**Pick it when**: Datasets are too massive for a single node regardless of write volume (analytics warehouses, time-series data, log stores). **Trade-off**: Rebalancing challenges — moving partition boundaries as data grows unevenly (hot partitions).
```
Horizontal partitioning (sharding): split by row  → user_id 1-1M, 1M-2M...
Vertical partitioning:              split by column → profile table vs activity table
Range partitioning:                 split by value range → orders_2024, orders_2025
```
Deep dive: [`02-scalability-patterns.md#sharding`](./02-scalability-patterns.md#sharding) and [`01-storage-fundamentals.md`](./01-storage-fundamentals.md).

---

## 2. Caching & Content Delivery

<!-- TAG: cache-aside, write-through, write-behind, cdn, materialized-views -->

### Cache-Aside
**Pick it when**: Read-heavy workloads where the app can tolerate writing cache logic itself. **Trade-off**: Stale cache risk — cache and DB can drift apart between an update and the next read.
```
Read:  app checks cache → miss → reads DB → app writes result to cache → returns
Write: app writes DB → app invalidates (or deletes) the cache key
```
Deep dive: [`02-scalability-patterns.md#1-cache-aside-lazy-loading`](./02-scalability-patterns.md#1-cache-aside-lazy-loading).

### Write-Through Cache
**Pick it when**: Data must stay fresh — the cache should never be checked before the DB write completes. **Trade-off**: Slower writes — every write pays the cost of both the cache write and the DB write, synchronously.
```
Write: app → cache.write() → DB.write() → both succeed before ack returned to caller
Read:  always a cache hit for previously-written data (cache is never behind)
```
Deep dive: [`02-scalability-patterns.md#2-write-through`](./02-scalability-patterns.md#2-write-through).

### Write-Behind Cache (Write-Back)
**Pick it when**: Ultra-fast writes are needed and the app can tolerate a brief durability gap (metrics, activity logs, non-critical counters). **Trade-off**: Potential data loss — if the cache node crashes before flushing to the DB, buffered writes are gone.
```
Write: app → cache.write() → ack returned immediately
        cache → (async, batched) → DB.write() happens later
Crash before flush = writes since last flush are lost
```
Deep dive: [`02-scalability-patterns.md#3-write-back-write-behind`](./02-scalability-patterns.md#3-write-back-write-behind).

### CDN (Content Delivery Network)
**Pick it when**: You need global low-latency delivery of largely static content (images, video, JS bundles, API responses that vary rarely). **Trade-off**: Stale content until the cache expires or is explicitly purged.
```
User (Mumbai) → nearest edge PoP (Mumbai) → cache hit → served in ~10ms
                                          → cache miss → origin fetch → cache → serve
Invalidation: TTL expiry, or explicit purge/invalidate API call on deploy
```
Deep dive: [`02-scalability-patterns.md#content-delivery-networks-cdn`](./02-scalability-patterns.md#content-delivery-networks-cdn).

### Materialized Views

<!-- TAG: materialized-view, denormalized-read-model, refresh-strategy -->

**Pick it when**: An expensive query (multi-table join, aggregation over millions of rows) is repeated often with the same or similar shape. **Trade-off**: Refresh lag — the view shows the data as of its last refresh, not the live table state.

A materialized view is a **precomputed, stored result** of a query — unlike a regular SQL view (which re-runs the query every time it's read), a materialized view is computed once and persisted, then refreshed on a schedule or trigger.

```
Regular view:        SELECT ... FROM view   → re-executes the underlying join/aggregation every call
Materialized view:   SELECT ... FROM view   → reads pre-computed rows, no join/aggregation cost
```

**Example — dashboard showing "orders per region, last 30 days"**:
```sql
-- Expensive if run live on every dashboard load: joins orders + regions + line_items,
-- aggregates over 30 days of rows, every single request.
CREATE MATERIALIZED VIEW orders_per_region_30d AS
SELECT r.region_name, COUNT(o.id) AS order_count, SUM(o.total) AS revenue
FROM orders o
JOIN regions r ON o.region_id = r.id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY r.region_name;

-- Dashboard reads this instead — O(rows in view), not O(rows in orders)
SELECT * FROM orders_per_region_30d;
```

**Refresh strategies**:
| Strategy | How | Freshness | Cost |
|---|---|---|---|
| Scheduled (cron) | `REFRESH MATERIALIZED VIEW` every N minutes | Up to N minutes stale | Predictable, batched load |
| Event-triggered | Refresh (or incrementally update) on relevant writes | Near-real-time | More refresh operations |
| Incremental | Only recompute rows affected by recent changes | Near-real-time | Most complex to implement correctly |
| On-demand | Refresh when a consumer explicitly requests fresh data | As fresh as last call | Simple, but slow calls when stale |

**Postgres specifics**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` avoids locking readers out during refresh (requires a unique index on the view). Without `CONCURRENTLY`, readers block until the refresh completes.

**Relationship to CQRS**: A materialized view is often *how* the read-side of CQRS is implemented — the read model in [`06-advanced-data-patterns.md#cqrs`](../microservices/06-advanced-data-patterns.md#cqrs-command-query-responsibility-segregation) is frequently a materialized view populated from events, rather than a hand-rolled denormalized table.

**When to reach for it vs. a cache**: Cache-aside caches the *result of one lookup*; a materialized view precomputes the *result of a complex query* so every caller — cache or no cache — reads from cheap, flat, indexed rows.

---

## 3. Data Consistency & Transactions

<!-- TAG: event-sourcing, cqrs, two-phase-commit, saga -->

### Event Sourcing
**Pick it when**: You need a complete, provable audit/history of every state change (financial ledgers, compliance-heavy domains). **Trade-off**: Complex event replay — rebuilding current state means replaying the full event log (mitigated with snapshots).

Full treatment with diagrams and snapshotting strategy: [`13-distributed-patterns.md#cqrs--event-sourcing`](./13-distributed-patterns.md#cqrs--event-sourcing), and implementation sketch in [`06-advanced-data-patterns.md#event-sourcing-pattern`](../microservices/06-advanced-data-patterns.md#event-sourcing-pattern).

### CQRS (Command Query Responsibility Segregation)
**Pick it when**: Read and write workloads have fundamentally different shapes or scale characteristics (normalized writes, denormalized reads). **Trade-off**: More components — separate write model, read model, and the sync mechanism between them (usually events).

Full treatment: [`13-distributed-patterns.md#cqrs--event-sourcing`](./13-distributed-patterns.md#cqrs--event-sourcing) and [`06-advanced-data-patterns.md#cqrs`](../microservices/06-advanced-data-patterns.md#cqrs-command-query-responsibility-segregation).

### Distributed Transactions (Two-Phase Commit)

<!-- TAG: two-phase-commit, 2pc, coordinator, participant, blocking-protocol -->

**Pick it when**: Strong, atomic consistency is required across multiple databases/services in a single logical transaction (rare in modern systems — most reach for Saga instead; see below). **Trade-off**: Performance overhead and a **blocking protocol** — participants hold locks for the full round-trip, and a coordinator crash can leave participants blocked indefinitely.

**The protocol** — a coordinator drives two rounds against every participant:

```
Phase 1 — PREPARE (vote):
  Coordinator → Participant A: "prepare to commit"
  Coordinator → Participant B: "prepare to commit"
  Coordinator → Participant C: "prepare to commit"

  Each participant: writes to a local durable log, locks the affected rows,
                     replies YES ("I can commit") or NO ("I must abort")

Phase 2 — COMMIT or ABORT (decide):
  If ALL replied YES:
    Coordinator → all participants: "COMMIT"
    Each participant commits, releases locks, acks
  If ANY replied NO (or timed out):
    Coordinator → all participants: "ABORT"
    Each participant rolls back, releases locks
```

```
┌─────────────┐  prepare   ┌──────────────┐
│ Coordinator │───────────►│ Participant A │──► locks rows, votes YES
│             │───────────►│ Participant B │──► locks rows, votes YES
│             │───────────►│ Participant C │──► locks rows, votes NO (constraint violation)
└─────────────┘            └──────────────┘
       │  all-YES required, one NO → abort everyone
       ▼
   ABORT to A, B, C → all roll back, release locks
```

**Why it's rarely used at scale**:
- **Blocking**: if the coordinator crashes after participants vote YES but before sending COMMIT/ABORT, participants sit holding locks indefinitely (the "in-doubt" transaction problem) — this is the core reason 2PC doesn't survive coordinator failure gracefully.
- **Synchronous & slow**: every participant is locked for the full two round-trips; one slow participant slows the whole transaction.
- **Doesn't cross technology boundaries well**: works within XA-compliant resource managers, but a call to a third-party payment API or an external microservice can't participate in a distributed lock/vote.

**2PC vs Saga** (the practical decision):
| | 2PC | Saga |
|---|---|---|
| Consistency | Strong (atomic commit/abort) | Eventual (compensating actions) |
| Locking | Yes — held across both phases | No — each local transaction commits immediately |
| Coordinator failure | Can block participants indefinitely | No global lock to get stuck on |
| Crosses service/tech boundaries | Poorly | Well — designed for it |
| Use when | Same transactional resource manager, strong consistency non-negotiable | Distributed business workflow across services (the common modern case) |

Saga full treatment (orchestration vs. choreography, compensating transactions, code): [`05-distributed-transactions.md#saga-pattern`](../microservices/05-distributed-transactions.md#saga-pattern).

### Saga Pattern
**Pick it when**: A business workflow spans multiple services/databases and no single ACID transaction can span all of them (e.g., "place order" → reserve inventory → charge payment → schedule shipping). **Trade-off**: Eventual consistency — intermediate states are visible, and failures require explicit compensating actions rather than an automatic rollback.
```
Orchestration:  central Saga orchestrator calls each step, issues compensations on failure
Choreography:   each service listens for the previous step's event, emits its own event/compensation
```
Full treatment with orchestrator code and compensation-failure handling: [`05-distributed-transactions.md#saga-pattern`](../microservices/05-distributed-transactions.md#saga-pattern).

---

## 4. Messaging & Async Processing

<!-- TAG: message-queue, pub-sub, event-driven, stream-processing, webhook -->

### Message Queue

<!-- TAG: message-queue, point-to-point, sqs, rabbitmq, visibility-timeout, dead-letter-queue -->

**Pick it when**: Work needs asynchronous processing decoupled from the request path — the producer shouldn't block on the consumer being available or fast (order processing, email sending, image/video encoding). **Trade-off**: Increased latency — the work is no longer synchronous, so the caller can't get an immediate result.

A message queue is **point-to-point**: each message is consumed by exactly one consumer, unlike pub-sub where every subscriber gets a copy.

```
Producer → [ Queue ] → Consumer
             │
             one message = one consumer takes it and it's gone from the queue
```

**Core mechanics (SQS/RabbitMQ-style)**:

```
1. Producer sends message → queue stores it durably
2. Consumer polls/receives message → message becomes INVISIBLE to other consumers
   (visibility timeout starts, e.g. 30s)
3. Consumer processes message
4a. Success → consumer deletes/acks message → gone permanently
4b. Failure or timeout expires → message becomes visible again → redelivered
5. After N redelivery attempts → message routed to a Dead Letter Queue (DLQ)
```

**Visibility timeout** — the window a consumer has to finish processing before the message is assumed failed and returned to the queue for another consumer to pick up:
```
Consumer receives message at t=0, visibility timeout = 30s
  Consumer finishes at t=20s, deletes message         → OK, no duplicate delivery
  Consumer crashes at t=25s, never deletes             → message reappears at t=30s for another consumer
  Consumer still processing at t=35s (didn't extend)   → message reappears at t=30s → TWO consumers now processing the same message (design consumers to be idempotent — see 13-distributed-patterns.md#1-idempotency--exactly-once-delivery)
```

**Dead Letter Queue (DLQ)**: after a message fails processing repeatedly (e.g., 5 attempts), it's moved to a separate queue for manual inspection instead of endlessly retrying and blocking the main queue. See the DLQ section in [`13-distributed-patterns.md#dead-letter-queue-dlq`](./13-distributed-patterns.md#dead-letter-queue-dlq) for the retry-policy-before-DLQ pattern and DLQ as an observability signal.

**Queue vs. Topic (Pub-Sub)**:
| | Queue (point-to-point) | Topic (pub-sub) |
|---|---|---|
| Consumers per message | Exactly one | Every subscriber |
| Use when | Distributing work across a worker pool | Broadcasting an event to independent services |
| Examples | SQS, RabbitMQ work queue | SNS, Kafka topic, RabbitMQ fanout exchange |

**Ordering**: standard SQS/RabbitMQ queues don't guarantee strict global ordering under concurrent consumers; use FIFO queue types (SQS FIFO, RabbitMQ single-consumer-per-queue) when order matters, at a throughput cost.

Related deep dives: general messaging concept in [`01-core-terminology.md#message-queue`](./01-core-terminology.md#message-queue), RabbitMQ/AMQP implementation in [`04-communication.md`](../microservices/04-communication.md), Kafka-specific queue semantics in [`kafka-comprehensive-guide.md`](../messaging/kafka-comprehensive-guide.md).

### Publish-Subscribe
**Pick it when**: Multiple independent consumers need to react to the same event without the producer knowing who they are. **Trade-off**: Harder debugging — a single event can trigger a cascade of downstream effects across services that aren't visible from the producer's code.
```
Order Service emits OrderPlaced
  ├── Inventory Service subscribes → reserves stock
  ├── Email Service subscribes     → sends confirmation
  └── Analytics Service subscribes → records sale
```
Full treatment (events vs commands vs queries, why it decouples): [`13-distributed-patterns.md#events-vs-commands-vs-queries`](./13-distributed-patterns.md#events-vs-commands-vs-queries).

### Event-Driven Architecture
**Pick it when**: Services should react to state changes elsewhere in the system rather than being told explicitly what to do (loose coupling at the architecture level, not just the messaging level). **Trade-off**: Eventual consistency — by design, consumers process events some time after they happened.

Full treatment (ordering guarantees, outbox pattern, consumer groups): [`13-distributed-patterns.md#2-event-driven-architecture`](./13-distributed-patterns.md#2-event-driven-architecture).

### Stream Processing
**Pick it when**: You need real-time analytics or transformations over unbounded, continuously arriving data (fraud detection, live dashboards, clickstream aggregation) rather than periodic batch jobs. **Trade-off**: Operational complexity — stateful stream processing requires managing windowing, checkpointing, and exactly-once semantics across a cluster.
```
Batch:   collect data for a window (e.g. 1 hour) → run job → produce result → repeat
Stream:  data arrives continuously → processed record-by-record (or micro-batch) → result updates continuously

Windowing types:
  Tumbling window: fixed, non-overlapping (every 1 minute)
  Sliding window:  fixed size, overlapping (last 5 min, updated every 10s)
  Session window:  groups by activity gaps (user session = events with < 30 min gap)
```
Kafka Streams-specific deep dive (topology, exactly-once, state stores): [`kafka-comprehensive-guide.md#kafka-streams`](../messaging/kafka-comprehensive-guide.md#8-kafka-streams). Engine-agnostic alternatives worth knowing by name for interviews: Apache Flink (true streaming, low latency), Spark Structured Streaming (micro-batch).

### Webhook Pattern

<!-- TAG: webhook, callback-url, http-callback, at-least-once-delivery, signature-verification -->

**Pick it when**: An external system (or an external-facing integration of your own) needs to be notified of an event asynchronously, without polling your API for changes (payment provider notifying you of a charge result, GitHub notifying a CI system of a push). **Trade-off**: Delivery reliability issues — the receiving endpoint might be down, slow, or the network might drop the request, and unlike an internal message queue you don't control the receiver's infrastructure.

**How it works**:
```
1. Consumer registers a callback URL with the producer:
     POST /webhooks { "url": "https://myapp.com/hooks/payment", "events": ["charge.succeeded"] }

2. Event happens in the producer system (e.g., a charge succeeds)

3. Producer sends an HTTP POST to the registered URL:
     POST https://myapp.com/hooks/payment
     { "event": "charge.succeeded", "charge_id": "ch_123", "amount": 500 }

4. Receiver responds 200 OK  → producer considers it delivered
   Receiver times out / 5xx  → producer retries (with backoff)
   Receiver never succeeds   → producer gives up after N attempts, may surface in a dashboard/DLQ
```

```
┌────────────┐   register callback   ┌─────────────┐
│  Your App  │ ─────────────────────►│   Stripe    │
└────────────┘                       └──────┬──────┘
      ▲                                     │ charge.succeeded happens
      │         POST /hooks/payment         │
      └─────────────────────────────────────┘
      Your endpoint must respond fast (< a few sec) and 200 quickly —
      do the actual processing async, after acking receipt.
```

**Design requirements for a robust webhook receiver**:
- **Respond fast, process async**: acknowledge with 200 immediately, enqueue the payload for processing — don't do slow work in the request handler or the sender will time out and retry, causing duplicates.
- **Idempotency**: webhooks are at-least-once delivery — the same event can arrive more than once (sender retry, sender bug). Dedupe on the event ID (see [`13-distributed-patterns.md#1-idempotency--exactly-once-delivery`](./13-distributed-patterns.md#1-idempotency--exactly-once-delivery)).
- **Signature verification**: verify an HMAC signature header (e.g., Stripe's `Stripe-Signature`) against a shared secret to confirm the request actually came from the claimed sender, not a spoofed POST.
- **Ordering is not guaranteed**: a later event can arrive before an earlier one (different retry timings). Include a timestamp/sequence in the payload and let the receiver reorder if it matters.

**Webhook vs polling**:
| | Webhook | Polling |
|---|---|---|
| Latency | Near-instant | Bounded by poll interval |
| Load on producer | Low (push once) | Higher (repeated "anything new?" calls) |
| Receiver must be reachable | Yes (public endpoint) | No |
| Complexity | Signature verification, retry handling, idempotency | Simpler, but wasteful |

**Webhook vs message queue**: a webhook is the pattern for crossing an **organizational/network boundary** you don't operate (an external SaaS calling your endpoint); a message queue is for **internal** async processing where you control both ends and can rely on a shared broker instead of raw HTTP callbacks.

---

## 5. Resilience & Fault Tolerance

<!-- TAG: circuit-breaker, retry, bulkhead, rate-limiting, failover -->

### Circuit Breaker
**Pick it when**: A dependency's failures could cascade and take down the calling service too (slow/failing downstream call exhausts caller's threads/connections). **Trade-off**: Recovery tuning required — thresholds, timeout, and half-open probe interval all need calibration per dependency.
```
CLOSED (normal) → failure rate exceeds threshold → OPEN (fail fast, no calls made)
OPEN → after timeout → HALF-OPEN (allow a few probe calls)
HALF-OPEN → probes succeed → CLOSED | probes fail → OPEN again
```
Deep dive: [`03-resilience.md#circuit-breaker-pattern`](../microservices/03-resilience.md#circuit-breaker-pattern), [`03-reliability-fault-tolerance.md#circuit-breaker`](./03-reliability-fault-tolerance.md#circuit-breaker), state machine detail in [`11-failure-modes-and-problem-patterns.md`](./11-failure-modes-and-problem-patterns.md).

### Retry Pattern
**Pick it when**: Failures are transient/temporary (network blip, momentary overload) rather than permanent (bad request, auth failure — don't retry these). **Trade-off**: Retry storms — many clients retrying simultaneously after a shared dependency recovers can re-overload it right as it comes back up.
```
Naive retry:      retry immediately, N times           → amplifies load during outages
Exponential backoff + jitter: delay = min(cap, base * 2^attempt) ± random jitter
                                                        → spreads retries out, avoids thundering herd
```
Deep dive: [`03-reliability-fault-tolerance.md#retry-with-backoff`](./03-reliability-fault-tolerance.md#retry-with-backoff), retry-storm failure mode in [`11-failure-modes-and-problem-patterns.md`](./11-failure-modes-and-problem-patterns.md).

### Bulkhead
**Pick it when**: One failing dependency shouldn't be able to exhaust resources (threads, connections) needed by unrelated features (named after ship compartments — one flooded compartment doesn't sink the ship). **Trade-off**: Resource fragmentation — resources are partitioned per-dependency, so one pool can be starved while another sits idle.
```
Without bulkhead: 1 shared thread pool → slow payment API exhausts all threads → search also breaks
With bulkhead:    payment calls use pool A (10 threads), search calls use pool B (10 threads)
                  → payment API slowness only starves pool A; search keeps working
```
Deep dive: [`03-resilience.md#bulkhead-pattern-failure-isolation`](../microservices/03-resilience.md#bulkhead-pattern-failure-isolation), [`03-reliability-fault-tolerance.md#bulkhead`](./03-reliability-fault-tolerance.md#bulkhead).

### Rate Limiting
**Pick it when**: Services need protection from overload — either abusive clients or legitimate traffic spikes exceeding capacity. **Trade-off**: Possible user throttling — legitimate users can be rejected/delayed during a spike if limits are too tight.
```
Algorithms: Token Bucket, Leaky Bucket, Fixed Window Counter,
            Sliding Window Log, Sliding Window Counter
```
Full treatment with all five algorithms, diagrams, and a comparison table: [`07-rate-limiting-api-design.md`](./07-rate-limiting-api-design.md).

### Failover
**Pick it when**: High availability is required and a single instance/region failure must not take the system down. **Trade-off**: Duplicate infrastructure cost — standby capacity sits mostly idle until needed.
```
Active-Passive: primary serves all traffic, standby takes over on failure detection
Active-Active:  both serve traffic simultaneously, either can absorb the other's load on failure
```
Deep dive: [`03-reliability-fault-tolerance.md#failover-mechanisms`](./03-reliability-fault-tolerance.md#failover-mechanisms).

---

## 6. Coordination & Service Infrastructure

<!-- TAG: leader-election, service-discovery, api-gateway, sidecar, service-mesh -->

### Leader Election

<!-- TAG: leader-election, bully-algorithm, raft-election, single-coordinator -->

**Pick it when**: Exactly one node must act as coordinator for a task (running a cron job once, being the writer in a primary-replica setup, coordinating a distributed lock) and any node could fail at any time. **Trade-off**: Election overhead — detecting failure and running an election takes time, during which there's no leader (or briefly, more than one).

**Why you need an algorithm, not just "pick one"**: nodes can't simply agree on a leader by fiat — they must handle the leader crashing, network partitions splitting the cluster, and multiple nodes trying to become leader simultaneously without ending up with two leaders at once (split-brain).

**Bully Algorithm** (simple, ID-based):
```
Every node has a unique ID. Highest ID wins.

1. Node notices leader is unresponsive → starts an election
2. Sends "election" message to all nodes with a HIGHER id
3. If no higher node responds within a timeout → this node becomes leader,
   announces "coordinator" to all nodes
4. If a higher node responds → that node takes over running the election
5. Eventually the highest-ID live node wins and announces itself

Example (nodes 1,2,3,4,5 — node 5 was leader, now crashed):
  Node 3 notices timeout → sends election to 4, 5
  Node 4 responds "I'm alive, I'll take it from here" → sends election to 5
  Node 5 doesn't respond (crashed) → Node 4 becomes leader → announces to all
```
Downside: assumes reliable failure detection and can trigger repeated elections under flaky networks; also "highest ID" isn't always the most sensible leader.

**Raft Leader Election** (used in etcd, Consul — the modern production choice):
```
Nodes are Follower, Candidate, or Leader. Elections are term-numbered (like terms of office).

1. Follower doesn't hear from leader within an election timeout (randomized per node, e.g. 150-300ms)
2. Follower becomes Candidate, increments term, votes for itself, requests votes from others
3. Other nodes vote for the first candidate they see in that term (one vote per term)
4. Candidate wins if it gets votes from a MAJORITY of nodes → becomes Leader
5. Leader sends periodic heartbeats to reset followers' election timeouts

Randomized timeouts are the key trick: they make it statistically unlikely
two nodes become candidates simultaneously, avoiding repeated split votes.
```
```
5-node cluster, Leader (Node A) crashes:
  Node B's timeout fires first (randomized) → becomes Candidate, term=5
  Requests votes from C, D, E → gets 3 votes (incl. itself) → majority of 5 → Leader
  Node B sends heartbeats → C, D, E reset their timeouts, stay Followers
```

**Practical guidance**:
| Need | Use |
|---|---|
| Simple, few nodes, tolerate rare split-vote retries | Bully algorithm |
| Production distributed coordination | Raft (etcd, Consul) or ZooKeeper (ZAB — similar idea) |
| Already have Kubernetes | `Lease` objects in etcd (client-go leader election, used by controllers) |

Related: this connects directly to lease-based locking in [`13-distributed-patterns.md#lease-based-locking`](./13-distributed-patterns.md#lease-based-locking) — the elected leader typically operates under a renewable lease so it automatically steps down if it can't prove liveness.

### Service Discovery
**Pick it when**: Service instance locations change dynamically (auto-scaling, container restarts assign new IPs) so hardcoded hostnames/IPs don't work. **Trade-off**: Additional infrastructure — a discovery service (Eureka, Consul) becomes a dependency every service relies on.
```
Client-side discovery: service asks registry directly, then calls the instance
Server-side discovery: service calls a load balancer/gateway, which asks the registry
```
Deep dive: [`02-discovery-and-gateway.md#service-discovery-pattern`](../microservices/02-discovery-and-gateway.md#service-discovery-pattern).

### API Gateway
**Pick it when**: Many backend services exist and clients shouldn't need to know about (or call) each one directly. **Trade-off**: Central bottleneck risk — the gateway becomes a single point of failure and a shared latency cost for every request unless scaled and made highly available itself.
```
Client → API Gateway → routes to: Order Service, User Service, Payment Service
                     → also handles: auth, rate limiting, request/response transformation, logging
```
Deep dive: [`02-discovery-and-gateway.md#api-gateway-pattern`](../microservices/02-discovery-and-gateway.md#api-gateway-pattern), throttling specifics in [`07-rate-limiting-api-design.md#api-gateway-patterns`](./07-rate-limiting-api-design.md#api-gateway-patterns).

### Sidecar Pattern

<!-- TAG: sidecar, sidecar-container, cross-cutting-concerns, kubernetes-pod -->

**Pick it when**: Cross-cutting infrastructure functionality (logging, metrics collection, TLS termination, service-to-service networking) needs to be attached to every service instance without duplicating that code inside every service's codebase or language runtime. **Trade-off**: Extra resource usage — every instance of the main service now runs an additional process alongside it.

A sidecar is a **helper process deployed alongside the main application, sharing its lifecycle and network namespace** — commonly a second container in the same Kubernetes Pod.

```
┌────────────────────────── Pod ───────────────────────────┐
│  ┌──────────────────┐   localhost   ┌──────────────────┐ │
│  │  App Container    │◄─────────────►│ Sidecar Container│ │
│  │  (business logic) │                │ (proxy / logging│ │
│  │                    │                │  / metrics/TLS) │ │
│  └──────────────────┘                └──────────────────┘ │
│  Shared: network namespace (localhost), sometimes volumes  │
│  Same lifecycle: created and destroyed together             │
└──────────────────────────────────────────────────────────────┘
```

**Common sidecar responsibilities**:
- **Networking proxy** (Envoy in Istio): intercepts all inbound/outbound traffic — this is literally how a service mesh is built (see next section)
- **Log/metric shipping**: app writes logs to stdout or a local file; sidecar (Fluentd/Filebeat) tails and forwards to the central logging system — app code never talks to the logging backend
- **Config/secret sync**: sidecar polls a config server or secret store and writes updates to a shared volume the app reads from
- **TLS termination / mTLS**: sidecar handles certificate rotation and encryption, app talks plaintext to `localhost`

**Why not just build it into the app?**
```
Without sidecar: every service (Java, Go, Python, Node) reimplements
                 log shipping, metrics, retry logic, mTLS — in its own language
With sidecar:    one battle-tested sidecar image handles it for every service,
                 regardless of what language the app is written in
```

**Cost**: one more container per instance means more CPU/memory reserved per pod, and one more moving part to deploy/upgrade/monitor.

### Service Mesh

<!-- TAG: service-mesh, istio, envoy, control-plane, data-plane, mtls -->

**Pick it when**: The deployment has grown into a large number of microservices and you need uniform traffic management, security, and observability across all of them without changing application code (typically dozens+ services — for a handful of services, a mesh is overkill). **Trade-off**: Significant operational complexity — you're now running and upgrading an entire additional distributed system whose job is to manage your other distributed system.

A service mesh is the **sidecar pattern applied systematically across every service**, plus a control plane that configures all the sidecars centrally.

```
                     ┌─────────────────────┐
                     │   Control Plane      │   (Istio: istiod)
                     │  (config, certs,      │
                     │   policy, discovery)  │
                     └──────────┬────────────┘
                    configures  │  all sidecars
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                       ▼
┌───────────────┐     ┌───────────────┐       ┌───────────────┐
│ Service A     │     │ Service B     │       │ Service C     │
│ + Envoy proxy │◄───►│ + Envoy proxy │◄─────►│ + Envoy proxy │
└───────────────┘     └───────────────┘       └───────────────┘
   Data plane: every service-to-service call flows through the sidecar proxies,
   not directly — the proxies handle routing, retries, mTLS, and collect telemetry.
```

**What it gives you without touching app code**:
| Capability | How |
|---|---|
| mTLS everywhere | Sidecars automatically encrypt and authenticate every service-to-service call |
| Traffic shifting / canary | Control plane tells sidecars to send 5% of traffic to `v2`, 95% to `v1` |
| Automatic retries & timeouts | Sidecar retries failed calls per centrally configured policy — no app-level retry code |
| Circuit breaking | Sidecar trips per-destination, without the app implementing it |
| Uniform observability | Every sidecar emits the same latency/error/traffic metrics regardless of the app's language |

**Sidecar vs. Service Mesh**: a sidecar is the *building block* (one helper container next to one service); a service mesh is the *system* — every service gets a sidecar, and a control plane configures all of them consistently. You can use a sidecar without a full mesh (e.g., just a logging sidecar); a service mesh implies sidecars everywhere plus centralized control.

**When it's overkill**: a handful of services, a team without dedicated platform/infra engineers to operate the mesh, or a system where library-level solutions (a shared HTTP client with built-in retry/circuit-breaker, like Resilience4j) already give you what you need without a second process per pod.

---

## Related Topics
- **See also**: [`13-distributed-patterns.md`](./13-distributed-patterns.md) — idempotency, event-driven architecture, backpressure, distributed locking, schema evolution (the patterns underlying sections 3-4 above)
- **See also**: [`02-scalability-patterns.md`](./02-scalability-patterns.md) — full depth on section 1-2 scaling and caching patterns
- **See also**: [`03-reliability-fault-tolerance.md`](./03-reliability-fault-tolerance.md) — full depth on section 5 resilience patterns
- **See also**: [`../microservices/`](../microservices/) — service discovery, API gateway, resilience, and distributed transactions with implementation code
- **See also**: [`10-interview-cheat-sheet.md`](./10-interview-cheat-sheet.md) — numbers, framework, and quick facts for the interview itself
