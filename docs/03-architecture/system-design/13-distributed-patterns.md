# Distributed Systems Patterns

<!-- TAG: distributed-patterns, idempotency, exactly-once, event-driven, outbox, saga, cqrs, event-sourcing, distributed-locking, backpressure -->

> **Purpose**: Patterns that recur across every distributed system — regardless of language, cloud, or framework. These are the building blocks interviewers expect you to reach for when designing at scale.

## Table of Contents
1. [Idempotency & Exactly-Once Delivery](#1-idempotency--exactly-once-delivery)
2. [Event-Driven Architecture](#2-event-driven-architecture)
3. [Backpressure as a Design Tool](#3-backpressure-as-a-design-tool)
4. [Distributed Locking](#4-distributed-locking)
5. [Schema & API Evolution](#5-schema--api-evolution)

---

## 1. Idempotency & Exactly-Once Delivery

<!-- TAG: idempotency, exactly-once, at-least-once, deduplication, idempotency-key -->

> **Core problem**: Networks fail. Clients retry. Without idempotency, retries cause duplicate charges, duplicate emails, double inventory deductions. Every distributed system must be designed for retries from the start — not bolted on later.

### Delivery Semantics

Three guarantees a message/request delivery system can offer. The right choice depends on what the operation does:

| Semantic | What it means | Risk | Use when |
|---|---|---|---|
| **At-most-once** | Delivered 0 or 1 times. No retry on failure. | Data loss | Metrics, analytics events — losing one is acceptable |
| **At-least-once** | Delivered 1 or more times. Retried until acknowledged. | Duplicates | Most systems — handle duplicates at the consumer |
| **Exactly-once** | Delivered exactly 1 time. No loss, no duplicates. | Complexity, cost | Financial transactions, inventory — but true exactly-once is very hard |

**The hard truth about exactly-once**: In a distributed system, exactly-once delivery at the *network* level is mathematically impossible across failures. What systems actually implement is *effectively exactly-once* — at-least-once delivery combined with idempotent processing, so duplicates have no additional effect.

```
Naive at-least-once (dangerous):
Client → POST /charge $100 → Network timeout → Client retries
Server processed first request → Second request charges again = $200 charged

With idempotency:
Client → POST /charge $100 (idempotency-key: "order-8472-charge-1")
Server processes → stores key → responds 200
Client → retry (same key) → Server: "already processed" → returns cached 200
Result: $100 charged exactly once
```

---

### Idempotency Key Pattern

The canonical solution for making non-idempotent operations safe to retry:

**How it works**:
1. Client generates a unique key for the operation (UUID, or a deterministic hash of the inputs)
2. Client sends the key in every request (header or body)
3. Server checks a deduplication store before processing
4. If key is seen: return the stored response — do not re-execute
5. If key is new: execute, store (key → response), return response

```
┌────────────────────────────────────────────────────────────┐
│  Client                                                    │
│  key = UUID()  // generated once, reused on every retry   │
│  POST /payments                                            │
│  Idempotency-Key: a8098c1a-f86e-11da-bd1a-00112444be1e    │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│  Payment Service                                           │
│                                                            │
│  key = request.header["Idempotency-Key"]                   │
│  existing = dedup_store.get(key)                           │
│                                                            │
│  if existing:                                              │
│      return existing.response   // no re-execution        │
│                                                            │
│  result = charge_card(amount)                              │
│  dedup_store.set(key, result, ttl=24h)                     │
│  return result                                             │
└────────────────────────────────────────────────────────────┘
```

**Stripe's implementation** (the canonical real-world example):
- Client sends `Idempotency-Key: <uuid>` header on every mutating request
- Stripe stores the key and full response for 24 hours
- Replaying with the same key returns the original response, even if the charge succeeded
- Different key = new operation, even for the same amount/card

**Dedup store options**:
| Store | Trade-off |
|---|---|
| Redis `SET key response EX 86400 NX` | Fast, eventually consistent — key may be lost on Redis failure |
| Database table (unique index on key) | Durable, consistent — atomic with the operation if same DB |
| Database + Redis | Redis for fast path, DB as source of truth |

**Key design decisions**:
- **Who generates the key?** Always the client — only the client knows if it's a retry of the same logical operation
- **TTL**: 24 hours is standard. After TTL, the same key is treated as a new request
- **Key scope**: Per-user or per-account to prevent one user's key colliding with another's

---

### Natural Idempotency

Some operations are naturally idempotent — executing them N times has the same effect as executing once. Prefer these patterns when possible:

```sql
-- NOT idempotent: running twice charges twice
INSERT INTO charges (order_id, amount) VALUES (8472, 100);

-- Idempotent: second run is a no-op
INSERT INTO charges (order_id, amount) VALUES (8472, 100)
ON CONFLICT (order_id) DO NOTHING;

-- Idempotent: sets to a value rather than incrementing
UPDATE inventory SET stock = 42 WHERE product_id = 'SKU-001';

-- NOT idempotent: decrement twice = wrong result
UPDATE inventory SET stock = stock - 1 WHERE product_id = 'SKU-001';
```

**HTTP methods by idempotency**:
| Method | Idempotent? | Safe? | Notes |
|---|---|---|---|
| GET | Yes | Yes | No side effects |
| PUT | Yes | No | Full replace — same result each time |
| DELETE | Yes | No | Deleting already-deleted = same state |
| POST | No | No | Creates new resource each time — requires idempotency key |
| PATCH | Depends | No | Safe if using absolute values, not relative (set=5 vs increment by 1) |

---

### Deduplication at Message Queue Consumer

When consuming from a message queue (Kafka, SQS, RabbitMQ), at-least-once delivery means you **will** receive duplicates. Design consumers to handle this:

**Strategy 1: Track processed message IDs**
```java
void processMessage(Message msg) {
    if (seenIds.contains(msg.getId())) {
        return; // already processed — skip
    }
    // process...
    seenIds.add(msg.getId());
}
```
Problem: `seenIds` must be durable (Redis or DB) — in-memory loses state on restart.

**Strategy 2: Upsert instead of insert**
```sql
-- Upsert: naturally idempotent, no separate dedup tracking needed
INSERT INTO order_events (event_id, order_id, status, processed_at)
VALUES ('evt-8472', 8472, 'SHIPPED', NOW())
ON CONFLICT (event_id) DO NOTHING;
```
Best approach when using a DB — the unique constraint on `event_id` is the dedup mechanism.

**Strategy 3: Kafka consumer offset management**
```
Kafka guarantees: if you commit the offset after processing,
and your processing is idempotent, you get effectively exactly-once.

Failure scenario:
  1. Consumer reads message, processes it
  2. Consumer crashes before committing offset
  3. Consumer restarts, re-reads and re-processes same message
  → If processing is idempotent (upsert), no harm done
```

---

### Exactly-Once in Kafka (When You Need It)

Kafka provides exactly-once semantics (EOS) for the Kafka-to-Kafka case (read from one topic, transform, write to another):

**Two components**:
1. **Idempotent producer**: Kafka deduplicates messages with the same producer ID + sequence number. Retried sends don't create duplicates.
2. **Transactions**: Atomic read-process-write — offset commit and message publish happen in one transaction. Either both happen or neither does.

```java
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("output-topic", key, value));
    producer.sendOffsetsToTransaction(offsets, consumerGroupMetadata);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

**Critical caveat**: Kafka EOS only covers Kafka-to-Kafka. The moment you write to an external system (database, API, email), you're back to at-least-once and need application-level idempotency. EOS doesn't eliminate the need for idempotency keys or upserts in your business logic.

---

### Where Idempotency Breaks Down

1. **Non-deterministic side effects**: Sending an email, posting a Slack message, triggering a webhook — these are hard to make idempotent. Pattern: use a deduplicated event log and mark events as "notification sent" before sending.

2. **Race conditions in the dedup store**: Two requests with the same key arrive simultaneously. Both check the store, both see "not seen", both execute. Fix: atomic check-and-set (`SET NX` in Redis, database unique index with transaction).

3. **Key reuse by mistake**: Client reuses a key across logically different operations. This is a client bug, but defense-in-depth: scope keys to `(user_id, operation_type, client_generated_uuid)`.

4. **Dedup store TTL too short**: Client retries after 25 hours; key has expired; duplicate charge occurs. Set TTL based on your retry window, not arbitrarily.

---

### Interview Checklist

```
□ Explain at-most-once / at-least-once / exactly-once and their trade-offs
□ State that true exactly-once across failures is impossible at network level
□ Describe idempotency key pattern: client generates, server deduplicates
□ Identify what makes an operation naturally idempotent (upsert, SET vs INCREMENT)
□ Know Kafka EOS scope: Kafka-to-Kafka only, not external systems
□ Identify the race condition in dedup and fix it (atomic SET NX)
□ Apply to payments: "charge_card is not idempotent → always use idempotency keys"
```

---

## 2. Event-Driven Architecture

<!-- TAG: event-driven, pub-sub, kafka, outbox-pattern, consumer-groups, dead-letter-queue, event-schema, event-sourcing, cqrs -->

> **Core idea**: Instead of services calling each other directly (tight coupling), services emit events and other services react to them (loose coupling). The queue is the contract. Neither side needs to know the other exists.

### Events vs Commands vs Queries

These three message types look similar but carry different semantics. Using the wrong one creates hidden coupling:

| Type | Meaning | Direction | Example |
|---|---|---|---|
| **Event** | "Something happened" — past tense, fact | Broadcast (1→many) | `OrderPlaced`, `PaymentFailed`, `UserCreated` |
| **Command** | "Do this thing" — imperative | Directed (1→1) | `SendEmail`, `ChargeCard`, `ReserveInventory` |
| **Query** | "Tell me the state" | Request/reply (1→1) | `GetOrderStatus`, `FetchUserProfile` |

**Why it matters**:
- Events are owned by the producer — they don't know or care who consumes them
- Commands imply the producer knows a specific service should handle it — creates coupling
- Queries over a queue add unnecessary latency; use synchronous RPC instead

```
Good (event):
Order Service emits → OrderPlaced { order_id, user_id, items, total }
  ├── Inventory Service subscribes → reserves stock
  ├── Email Service subscribes     → sends confirmation
  └── Analytics Service subscribes → records sale
Order Service doesn't know any of these services exist.

Bad (command disguised as event):
Order Service emits → SendConfirmationEmailForOrder8472
  └── Email Service subscribes
Order Service now knows Email Service exists and what it should do.
```

---

### Ordering Guarantees

**The wrong assumption**: "I need all events in global order."

**The right question**: "Which events need to be ordered *relative to each other*?"

In Kafka, ordering is guaranteed within a partition, not across partitions:

```
Partition 0 (user_id: 1001):  [UserCreated] → [AddressUpdated] → [OrderPlaced]  ✓ ordered
Partition 1 (user_id: 2847):  [UserCreated] → [OrderPlaced]                      ✓ ordered
Partition 2 (user_id: 5531):  [UserCreated] → [ProfileUpdated] → [OrderPlaced]   ✓ ordered

Cross-partition order: NOT guaranteed — events from different users can interleave
```

**Choosing a partition key**:
- `user_id`: all events for a user go to same partition → ordered per user
- `order_id`: all events for an order go to same partition → ordered per order
- Random/round-robin: maximum throughput, no ordering — use for independent events

**The throughput vs ordering trade-off**:
```
1 partition:   Total ordering guaranteed. Max throughput = 1 consumer.
N partitions:  Ordering per partition. Throughput = N × consumer throughput.
               → Standard choice: pick partition key = entity that needs ordering
```

**What you rarely actually need**: Global ordering across all entities. If you think you need it, question the design — it usually means a synchronous call is more appropriate.

---

### Dual-Write Problem & the Outbox Pattern

**The problem**: You need to update your database AND publish an event. Doing them separately creates a window where one succeeds and the other fails:

```
Option A — DB first, then publish:
  1. UPDATE orders SET status='placed'   ✓ succeeds
  2. kafka.publish("OrderPlaced")        ✗ fails (broker down)
  → Order is placed in DB, but no event emitted
  → Inventory never reserved, email never sent

Option B — Publish first, then DB:
  1. kafka.publish("OrderPlaced")        ✓ succeeds
  2. UPDATE orders SET status='placed'   ✗ fails (DB error)
  → Event published but order doesn't exist in DB
  → Consumers act on a phantom order
```

**The Outbox Pattern** — solves this without distributed transactions:

```
┌──────────────────────────────────────────────────────────────┐
│  Order Service — single DB transaction                       │
│                                                              │
│  BEGIN TRANSACTION                                           │
│    INSERT INTO orders (id, status) VALUES (8472, 'placed')   │
│    INSERT INTO outbox (event_type, payload, sent=false)      │
│           VALUES ('OrderPlaced', '{"order_id":8472}', false) │
│  COMMIT                                                      │
│                                                              │
│  Either both rows are written, or neither. No partial state. │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Outbox Relay (separate process / CDC)                       │
│                                                              │
│  POLL: SELECT * FROM outbox WHERE sent = false               │
│  FOR each row:                                               │
│    kafka.publish(row.event_type, row.payload)                │
│    UPDATE outbox SET sent = true WHERE id = row.id           │
└──────────────────────────────────────────────────────────────┘
```

**Key properties**:
- The business state change and the "intent to publish" are atomic (same DB transaction)
- The relay delivers at-least-once — consumer must be idempotent (see section 1)
- CDC (Change Data Capture via Debezium) can replace the polling relay — reads the DB write-ahead log instead of polling

**When to use**: Any time you need transactional consistency between a DB write and an event publish. Payments, order placement, inventory updates.

---

### Consumer Groups

A consumer group allows multiple consumers to share the work of processing a topic, while ensuring each message is processed by exactly one consumer in the group:

```
Topic: orders (3 partitions)

Consumer Group A (Order Processors) — 3 instances:
  Consumer A1 → Partition 0  (processes those messages)
  Consumer A2 → Partition 1
  Consumer A3 → Partition 2

Consumer Group B (Analytics) — 1 instance:
  Consumer B1 → Partition 0, 1, 2  (gets ALL messages independently)
```

**Rules**:
- Each partition is assigned to exactly one consumer within a group
- Max useful consumers in a group = number of partitions (extra consumers sit idle)
- Multiple groups = multiple independent reads of the same data (fan-out for free)

**Rebalancing**: When a consumer joins or leaves, Kafka triggers a rebalance — partitions are reassigned. During rebalance, consumption pauses briefly. Minimize by using static group membership (`group.instance.id`).

---

### Dead Letter Queue (DLQ)

When a consumer fails to process a message repeatedly, the message goes to a DLQ — a separate topic/queue for messages that couldn't be handled.

```
Normal flow:
  orders topic → Consumer → process → commit offset → done

Failure flow:
  orders topic → Consumer → process fails → retry (3×) → still fails
              → publish to orders-dlq topic
              → commit offset on orders topic (don't block the queue)

DLQ:
  orders-dlq → Alert fires → Engineer investigates → fix + replay or discard
```

**Retry policy before DLQ** (example):
```
Attempt 1: immediate retry
Attempt 2: 1 second delay
Attempt 3: 10 second delay
Attempt 4: 1 minute delay
→ Give up → send to DLQ
```

**DLQ as an observability signal**:
- DLQ depth growing = consumers encountering messages they can't handle
- Alert on `dlq_depth > 0` for payment/critical flows
- DLQ messages should include: original topic, partition, offset, failure reason, timestamp

**Common DLQ causes**:
- Schema change broke deserialization (producer deployed new schema, consumer not updated)
- Poison pill message (malformed data that crashes the consumer)
- Downstream dependency unavailable (consumer calls an API that's down)

---

### CQRS & Event Sourcing

These two patterns are often mentioned together but solve different problems. You can use either without the other.

**CQRS (Command Query Responsibility Segregation)**

Separate the write model (commands) from the read model (queries):

```
Without CQRS:
  Single DB table → handles both writes and complex read queries
  Problem: write optimisation conflicts with read optimisation
           (e.g., normalised for writes → slow joins for reads)

With CQRS:
  Write path:  Command → Write Model (normalised DB) → emits events
  Read path:   Events → Read Model (denormalised, query-optimised views)
               Query → Read Model → fast response

  Example:
  Write: orders table (normalised, ACID)
  Read:  order_summary_view (denormalised: user name + items + total pre-joined)
         populated by consuming OrderPlaced / OrderUpdated events
```

**When CQRS is worth it**: Read and write load patterns are very different (read-heavy system with complex queries); you need multiple read models optimised differently; you're already using event-driven architecture.

**When CQRS is overkill**: Simple CRUD apps; teams without the operational maturity to manage eventual consistency; when a read replica with a couple of indexes would solve the problem.

---

**Event Sourcing**

Instead of storing current state, store the *sequence of events* that produced it. Current state = replay of all events.

```
Traditional (state storage):
  orders table: { id: 8472, status: 'shipped', total: 150, updated_at: ... }
  → You know the current state. You don't know how you got here.

Event Sourcing (event log):
  event_store: [
    { order_id: 8472, type: 'OrderPlaced',   data: { total: 150 }, ts: 10:00 }
    { order_id: 8472, type: 'PaymentTaken',  data: { amount: 150 }, ts: 10:01 }
    { order_id: 8472, type: 'OrderShipped',  data: { tracking: 'XY9' }, ts: 14:30 }
  ]
  Current state = apply all events in sequence
```

**Benefits**:
- Full audit log for free — you know every state transition and when
- Replay events to rebuild state (e.g., populate a new read model)
- Time-travel queries ("what was the state of this order at 11am?")
- Natural fit for event-driven architecture (events are first-class)

**Costs**:
- Query current state = replay all events (mitigated with snapshots)
- Schema evolution is harder — old events must remain processable
- Operational complexity — most teams shouldn't start here

**Snapshots**: Periodically persist a snapshot of current state so you don't replay from the beginning every time:
```
Events 1–1000 → Snapshot at event 1000 (current state)
New events 1001–1050 → apply to snapshot
Current state = snapshot + 50 events (not 1050)
```

---

### Interview Checklist

```
□ Distinguish events / commands / queries — know why events are loosely coupled
□ Explain partition key choice and what ordering guarantee it gives
□ Describe the dual-write problem and solve it with the outbox pattern
□ Know that outbox delivery is at-least-once → consumer must be idempotent
□ Explain consumer groups: partition-per-consumer, multiple groups = multiple reads
□ Know DLQ: purpose, retry policy, what growing DLQ depth means operationally
□ Explain CQRS: separate write/read models, when worth it vs overkill
□ Explain event sourcing: state = log of events, benefits (audit, replay), costs (complexity)
□ Know CDC (Debezium) as an alternative to polling outbox
```

---

## 3. Backpressure as a Design Tool

<!-- TAG: backpressure, flow-control, load-shedding, queue-depth, reactive-streams, bounded-queues -->

> **Core idea**: When a consumer can't keep up with a producer, work piles up. Left unhandled, this becomes a cascading failure — queues fill memory, services crash, the whole system goes down. Backpressure is the *intentional* signal that tells the producer to slow down. The goal is to make overload visible and handle it explicitly, rather than letting it silently corrupt the system.

### The Problem: Unbounded Accumulation

```
Producer: 10,000 msgs/sec
Consumer:  8,000 msgs/sec
Surplus:   2,000 msgs/sec → goes somewhere

Without backpressure:
  In-memory queue grows: 2K → 20K → 200K items
  → JVM heap exhausted → OutOfMemoryError → service crash
  → All queued work lost
  → Producer still running → backs up into upstream systems

This is not a spike problem — it's a sustained 20% overload.
Even a small gap compounds over time.
```

---

### Bounded Queues

A bounded queue has a maximum capacity. When full, it forces an explicit decision instead of silently accumulating:

```
Unbounded queue (default in many frameworks):
  new LinkedBlockingQueue<>()          // no limit — will OOM under load

Bounded queue (explicit capacity):
  new ArrayBlockingQueue<>(1000)       // max 1000 items
  → When full: producer must decide — block, drop, or reject
```

**The three responses to a full queue**:

| Response | What happens | Use when |
|---|---|---|
| **Block** | Producer thread waits until space is available | Internal pipeline between threads; slow producer is acceptable |
| **Drop** | New item discarded; oldest item may be dropped | Real-time data (sensor readings, metrics) where freshness > completeness |
| **Reject (shed)** | Return error to caller immediately (HTTP 429, 503) | User-facing requests; fail fast is better than slow queue |

```java
// Java ThreadPoolExecutor — explicit rejection policy
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    10,                              // core threads
    20,                              // max threads
    60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(500),   // bounded queue
    new ThreadPoolExecutor.CallerRunsPolicy()  // backpressure: caller runs the task
    // alternatives: AbortPolicy (throw), DiscardPolicy (silently drop),
    //               DiscardOldestPolicy (drop oldest, enqueue new)
);
```

**CallerRunsPolicy as natural backpressure**: When the queue is full, the submitting thread executes the task itself. This slows down the producer automatically — no explicit signaling needed. Simple and effective for thread pool scenarios.

---

### Load Shedding vs Queuing vs Blocking

Choosing the right strategy depends on what kind of work it is and who the caller is:

**Load Shedding** — drop work at the boundary, return an error

```
Client → API Gateway → Service (at capacity)
                          ↓
                     Queue full → return HTTP 503 / 429
                                  "Try again later"

Client handles the error: retry with backoff, show user a message
```

Best for:
- User-facing synchronous requests (they can retry)
- Real-time data where stale results are worse than no result
- When you'd rather have partial degradation than total failure

```
Example: Video encoding service
  Normal: 100 upload jobs/hour, processes all
  Spike:  1000 upload jobs/hour
  → Shed 900: "Processing queue full, try again in 10 minutes"
  → Process 100 → service stays healthy
  → vs: accept all 1000, run out of memory, crash, process 0
```

**Queuing** — accept work now, process later

```
Client → API Gateway → Queue → Workers (async processing)
                    ↑
              Bounded queue: if full → shed at this boundary
```

Best for:
- Async, latency-tolerant work (email sending, report generation, batch jobs)
- Work that must not be lost (use a durable queue like Kafka/SQS)
- When the caller doesn't need an immediate result

Danger: unbounded queue hides overload. Always bound the queue and monitor depth. Queue depth growing = you're falling behind = incident forming.

**Blocking** — slow down the producer

```
Producer thread → bounded queue → Consumer thread
                  (full)
                    ↓
              Producer.put() blocks
              Producer slows to consumer's pace
```

Best for:
- Intra-process pipelines (producer and consumer are threads in the same JVM)
- Batch processing where throughput matters more than latency
- When slowing the producer is acceptable (it's not serving users directly)

---

### Propagating Backpressure Upstream

The goal: overload signal travels from the bottleneck back to the source, slowing every stage proportionally.

```
Request flow (left to right):
  Client → Load Balancer → App Service → Queue → Worker → Database

Backpressure flow (right to left — the signal travels back):
  Database slow
      → Worker takes longer per task
      → Queue fills up
      → App Service: queue.put() blocks (or returns 503)
      → Load Balancer sees 503s → stops sending to this instance
      → Client receives 503 / 429 → backs off

Each stage slows the one upstream from it.
Without this: each stage keeps accepting work, all queues fill, cascade crash.
```

**Concrete mechanisms at each layer**:

| Layer | Backpressure mechanism |
|---|---|
| Client → API | HTTP 429 Too Many Requests + `Retry-After` header |
| API → Service | Bounded thread pool + CallerRunsPolicy or 503 |
| Service → Queue | Bounded queue + producer block/reject |
| Queue → Worker | Consumer pull model (worker requests next item only when ready) |
| Worker → DB | Connection pool limit (blocks worker when pool exhausted) |

**Pull vs Push**:
- **Push**: producer sends to consumer without being asked — consumer must have backpressure to resist overload
- **Pull**: consumer asks for the next item when ready — naturally self-regulating, no backpressure needed

Kafka uses pull: consumers poll for messages at their own rate. The broker doesn't push. This is a key reason Kafka handles slow consumers gracefully — they just fall behind (consumer lag), they don't crash the broker.

---

### Reactive Streams

Reactive Streams is a standard (Java 9+ `java.util.concurrent.Flow`, Project Reactor, RxJava) that formalises backpressure between async components:

```
Publisher → produces items
Subscriber → requests N items at a time (demand signal)

Subscriber.request(10)   // "I can handle 10 right now"
Publisher → sends up to 10
Subscriber processes 10
Subscriber.request(10)   // "ready for more"
Publisher → sends next 10

If subscriber is slow: it simply doesn't call request() → publisher stops
No buffer overflow, no dropped items, no crash.
```

```java
// Spring WebFlux (Project Reactor) — backpressure built in
Flux.fromIterable(largeDataset)
    .flatMap(item -> processAsync(item), 10)  // max 10 concurrent
    .subscribe(
        result -> handleResult(result),
        error  -> handleError(error)
    );
// Flux only requests what the downstream can handle
```

**When to use**: Streaming pipelines where producer and consumer run at different speeds and you need non-blocking, memory-safe flow control. Not needed for simple request/response.

---

### Backpressure as a Design Signal

A filled queue or rejected work is not just a problem — it's information:

```
Queue depth growing  → consumer is too slow OR producer spiked
                     → scale consumers OR shed at the boundary

Worker thread pool at max → work is CPU-bound and needs more cores
                          → scale horizontally

DB connection pool exhausted → DB is the bottleneck
                             → read replicas, query optimization, caching
```

**Key operational metrics to monitor** (connect to `12-observability.md`):
```
queue_depth          — growing = falling behind
queue_reject_rate    — shedding = overloaded at boundary
thread_pool_active   — near max = CPU bottleneck
db_connection_wait   — growing = DB bottleneck
consumer_lag (Kafka) — growing = consumers can't keep up
```

---

### Interview Checklist

```
□ Explain why unbounded queues are dangerous (OOM, silent backlog)
□ Name the three responses to a full queue: block, drop, reject/shed
□ Distinguish load shedding (user-facing), queuing (async), blocking (intra-process)
□ Trace backpressure signal from DB → Worker → Queue → Service → Client
□ Explain pull model (Kafka) as natural backpressure
□ Know CallerRunsPolicy as a simple JVM backpressure mechanism
□ Identify queue depth and consumer lag as leading overload indicators
□ State: a full queue is a signal — diagnose the bottleneck, don't just increase the limit
```

---

## 4. Distributed Locking

<!-- TAG: distributed-locking, redlock, fencing-token, lease, mutex -->

> **Core problem**: A `synchronized` block or `ReentrantLock` only works within a single JVM. Across multiple nodes, there is no shared memory. If two nodes must not perform the same operation simultaneously — claiming a job, modifying shared state, running a cron task — you need a lock that spans processes.

### Why Local Locks Don't Work

```
Two instances of the same service, both see an unclaimed job:

Instance A:  if (job.status == UNCLAIMED) { claim(); process(); }
Instance B:  if (job.status == UNCLAIMED) { claim(); process(); }

Both check at the same millisecond → both see UNCLAIMED → both claim
→ Job processed twice (duplicate work, duplicate charges, data corruption)

A local lock on Instance A does nothing to stop Instance B.
```

---

### Redis SET NX PX — the Simple Distributed Lock

```
SET lock:job-8472 "instance-A" NX PX 30000
```

- `NX` — only set if key does Not eXist (atomic check-and-set)
- `PX 30000` — expire after 30,000ms (safety: lock auto-releases if holder crashes)
- Value `"instance-A"` — owner identity (only the owner should release it)

```
Acquire:
  result = redis.SET("lock:job-8472", "instance-A", NX, PX, 30000)
  if result == OK:  lock acquired → proceed
  if result == nil: lock held by someone else → retry or fail

Release (must check owner to avoid releasing someone else's lock):
  // Lua script — atomic check + delete
  if redis.GET("lock:job-8472") == "instance-A":
      redis.DEL("lock:job-8472")
```

**Why Lua for release?** Without it, there's a race: GET returns "instance-A", lock expires, another node acquires it, then DEL deletes the new lock. Lua script runs atomically on Redis — no interleaving.

**Failure modes of the simple lock**:

1. **Lock expiry during slow processing**: Instance A holds the lock, GC pause takes 35 seconds, lock expires at 30s, Instance B acquires it, now both run concurrently. Expiry doesn't guarantee mutual exclusion — it only prevents deadlock.

2. **Redis node failure**: If the single Redis node goes down after granting the lock but before expiry, the lock is lost. Restarting Redis means the lock is gone — another node can acquire it while the first still thinks it holds it.

3. **Redis replication lag**: In a master-replica setup, lock acquired on master, master crashes before replicating, new master has no record of the lock → another node acquires the same lock.

---

### The Process Pause Problem

This is the fundamental reason distributed locks are hard, regardless of implementation:

```
Timeline:
  t=0:   Node A acquires lock (TTL: 30s)
  t=1:   Node A begins writing to shared resource
  t=10:  Node A's JVM triggers stop-the-world GC — process pauses
  t=40:  GC completes — Node A resumes (30 seconds elapsed)
  t=30:  Lock expired — Node B acquired the lock
  t=31:  Node B begins writing to shared resource
  t=40:  Node A resumes, still thinks it holds the lock
  t=40:  BOTH Node A and Node B write concurrently → CORRUPTION
```

A clock pause (GC, VM suspension, OS scheduling) can suspend a process for longer than the lock TTL. The process doesn't know time passed. This is not theoretical — it happens in production JVMs.

**No TTL value prevents this**. Longer TTL just means longer window of dual ownership if the holder crashes.

---

### Fencing Tokens — The Correct Solution

Fencing tokens make the *resource* enforce exclusivity, not the lock holder:

```
Lock service issues a monotonically increasing token on each grant:

  Node A acquires lock → token = 33
  Node A pauses (GC)
  Lock expires
  Node B acquires lock → token = 34
  Node B writes to resource with token 34 → accepted
  Node A resumes, writes to resource with token 33 → REJECTED (stale token)
```

```
┌─────────────┐   acquire()    ┌──────────────┐
│   Node A    │ ─────────────► │ Lock Service │ → returns token=33
└─────────────┘                └──────────────┘
      │ (GC pause — 35 seconds pass)
      │
┌─────────────┐   acquire()    ┌──────────────┐
│   Node B    │ ─────────────► │ Lock Service │ → returns token=34
└─────────────┘                └──────────────┘
      │
      │  write(data, token=34) ┌──────────────────┐
      └───────────────────────►│ Shared Resource  │ → accepts (34 > last_seen=0)
                               └──────────────────┘
      (Node A resumes)
      │  write(data, token=33) ┌──────────────────┐
      └───────────────────────►│ Shared Resource  │ → rejects (33 < last_seen=34)
                               └──────────────────┘
```

**Requirements**:
- Lock service must issue strictly monotonic tokens (ZooKeeper zxid, etcd revision)
- Resource must record the highest token seen and reject anything lower
- Resource enforcement is what makes this safe — not trusting the lock holder

---

### Redlock — and Its Controversy

Redlock is Redis's algorithm for a distributed lock across multiple Redis nodes (to avoid single-node failure):

**Algorithm** (acquire lock on N=5 independent Redis nodes):
1. Get current timestamp T1
2. Try `SET lock NX PX ttl` on all 5 nodes
3. Count successful acquisitions
4. If acquired on majority (≥3) AND elapsed time < TTL → lock held
5. If not → release on all nodes, retry

**The argument for Redlock** (Antirez / Redis author):
- Solves single Redis node failure (majority quorum)
- Good enough for most use cases (leader election, job deduplication)
- Practical and widely used

**The argument against Redlock** (Martin Kleppmann, "How to do distributed locking"):
- Clock drift across nodes can violate the timing assumptions
- Process pauses (GC) invalidate TTL-based safety regardless of quorum
- Fencing tokens are not part of the algorithm — still vulnerable to the process pause problem
- For correctness-critical locks, use a system with actual linearizable semantics

**Practical guidance**:

| Need | Use |
|---|---|
| Prevent duplicate job processing | Redis SETNX (single node) — loss on crash is acceptable |
| Leader election, coarse coordination | Redlock — majority quorum, tolerate one node failure |
| Correctness-critical (financial, inventory) | ZooKeeper or etcd + fencing tokens |
| Kubernetes-native | etcd (already in the cluster) |

---

### Lease-Based Locking

A lease is a time-limited grant of authority. The holder is trusted to act as leader/owner until the lease expires. Used heavily in distributed systems for leader election:

```
Kubernetes: every controller uses a Lease object in etcd
  → Leader renews the lease every 2 seconds
  → If lease not renewed within 10 seconds → new leader elected

HBase RegionServer: holds a lease on each region
  → Renews lease with ZooKeeper every few seconds
  → If ZooKeeper session expires → region is reassigned
```

Key property: the lease holder must stop acting as leader if it can't renew. Well-behaved clients check their lease validity before each critical operation.

---

### Interview Checklist

```
□ Explain why synchronized/ReentrantLock don't work across nodes
□ Describe Redis SET NX PX: atomic acquire, TTL for safety, Lua for release
□ Explain process pause problem — GC can suspend longer than TTL
□ Describe fencing tokens: resource enforces exclusivity, not lock holder
□ Know Redlock: majority quorum across N nodes, and the controversy
□ Give practical guidance: Redis for loose coordination, etcd/ZK for correctness-critical
□ Know lease-based locking (Kubernetes, HBase) as the real-world pattern
```

---

## 5. Schema & API Evolution

<!-- TAG: schema-evolution, backward-compatibility, forward-compatibility, protobuf, avro, expand-contract, rolling-deploy -->

> **Core problem**: In a distributed system, you can never update all services simultaneously. During a rolling deploy, old and new versions of a service run at the same time. They must be able to exchange messages and read data written by each other. Schema evolution is how you manage this without downtime.

### Backward vs Forward Compatibility

These two directions are often confused. Think from the *reader's* perspective:

| Term | Definition | Example |
|---|---|---|
| **Backward compatible** | New code can read data written by old code | Add a new optional field — old data simply won't have it; new reader uses a default |
| **Forward compatible** | Old code can read data written by new code | Old reader ignores unknown fields it doesn't recognise |

```
Producer v1 writes: { "order_id": 8472, "total": 150 }
Producer v2 writes: { "order_id": 8472, "total": 150, "currency": "USD" }

Consumer v1 reading v2 data (forward compat):
  → Must ignore "currency" field it doesn't know about ✓

Consumer v2 reading v1 data (backward compat):
  → "currency" is missing → use default value "USD" ✓
```

**What breaks compatibility**:

| Change | Backward compat? | Forward compat? |
|---|---|---|
| Add optional field with default | ✓ | ✓ |
| Add required field (no default) | ✗ (old data missing it) | ✓ |
| Remove field | ✓ (new reader ignores it) | ✗ (old reader expects it) |
| Rename field | ✗ | ✗ |
| Change field type (int → string) | ✗ | ✗ |
| Change field semantics (USD cents → USD dollars) | ✗ silent | ✗ silent |

**Golden rule**: Only add optional fields (never required). Never remove or rename fields until all consumers have been updated and old data has expired.

---

### Expand-Contract Pattern (Database Migrations)

The safest way to change a database schema while keeping the service running during deploy:

**Scenario**: rename column `user_name` → `full_name`

**Naive approach (dangerous)**:
```sql
ALTER TABLE users RENAME COLUMN user_name TO full_name;
-- Deploy new code simultaneously
-- Problem: old instances still running read user_name → crash
```

**Expand-Contract (safe)**:

```
Phase 1 — Expand (additive, backward compatible):
  ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
  Deploy code that writes BOTH user_name AND full_name
  Backfill: UPDATE users SET full_name = user_name WHERE full_name IS NULL

Phase 2 — Migrate reads:
  Deploy code that reads full_name (writes still go to both columns)
  Run old and new code simultaneously — both work

Phase 3 — Contract (remove old):
  Deploy code that writes ONLY full_name (user_name no longer written)
  Verify no queries touch user_name
  ALTER TABLE users DROP COLUMN user_name;
```

```
Timeline:
  Week 1: Add full_name column, backfill          ← no downtime
  Week 2: Switch reads to full_name               ← no downtime
  Week 3: Stop writing user_name, drop column     ← no downtime
```

**Rule**: Never do a rename or destructive migration in a single step if the service is running. The expand phase must be deployed and stable before the contract phase begins.

---

### Protobuf Field Numbers

Protocol Buffers identify fields by number, not by name. This is what enables schema evolution:

```protobuf
message Order {
  int64  order_id = 1;    // field number 1
  double total    = 2;    // field number 2
  string currency = 3;    // field number 3 — added in v2
}
```

**Wire format**: serialised bytes contain `(field_number, type, value)` — not the field name. A reader that doesn't know field 3 simply skips it (forward compatible). A reader expecting field 3 but not finding it uses the default value (backward compatible).

**Rules that must never be broken**:
- Never reuse a field number (even after removing the field)
- Never change a field's type
- Never change a field number
- Mark removed fields as `reserved` to prevent accidental reuse:

```protobuf
message Order {
  reserved 4, 5;               // field numbers 4 and 5 are retired
  reserved "discount_code";    // field name also reserved
  int64  order_id = 1;
  double total    = 2;
  string currency = 3;
}
```

---

### Avro and Schema Registry

Avro serialises data without embedding field names in every message (unlike JSON). The schema is referenced by ID. This makes messages compact but requires both producer and consumer to agree on schema at read time.

```
Producer:
  schema_id = registry.register(schema_v2)
  bytes = avro.serialize(data, schema_v2)
  message = [schema_id (4 bytes)] + [avro bytes]
  kafka.publish(message)

Consumer:
  schema_id = message[0:4]
  writer_schema = registry.get(schema_id)       // schema that wrote the data
  reader_schema = MyOrder.class.avroSchema()     // schema consumer expects
  data = avro.deserialize(message[4:], writer_schema, reader_schema)
  // Avro performs schema resolution: maps writer fields to reader fields
```

**Schema Registry** (Confluent): Central store of all schema versions. Enforces compatibility rules on registration — you can't register a schema that breaks backward compatibility.

**Compatibility modes**:
| Mode | Rule |
|---|---|
| `BACKWARD` | New schema can read data written by previous schema |
| `FORWARD` | Previous schema can read data written by new schema |
| `FULL` | Both directions — safest for long-lived topics |
| `NONE` | No checks — dangerous for production |

---

### Rolling Deploy Compatibility Checklist

During a rolling deploy, both old and new code versions run simultaneously. Every change must be safe for this window:

```
Step 1: Deploy new consumers first (can read old + new format)
Step 2: Deploy new producers (start writing new format)
Step 3: Decommission old consumers (no longer need old format)

Never deploy producers before consumers — consumers would receive
messages they can't understand.
```

```
Safe changes (deploy any order):
  ✓ Add optional field with default
  ✓ Add new enum value (if consumers handle unknown enums)
  ✓ Increase field size (int32 → int64)

Unsafe without expand-contract:
  ✗ Remove field
  ✗ Rename field
  ✗ Change field type
  ✗ Add required field
  ✗ Change field semantics (same name, different meaning)
```

---

### Interview Checklist

```
□ Define backward vs forward compatibility from the reader's perspective
□ List changes that break each direction (remove = breaks forward, add required = breaks backward)
□ Walk through expand-contract for a column rename: expand → migrate reads → contract
□ Explain Protobuf field numbers: identified by number not name, reserved for removed fields
□ Explain Avro schema registry: schema ID in message header, writer/reader schema resolution
□ State the rolling deploy order: consumers first, then producers
□ Give the golden rule: only add optional fields, never remove/rename without a migration window
```

---

## Related Topics
- **See also**: `07-rate-limiting-api-design.md` — API versioning, idempotency in API design
- **See also**: `06-cap-theorem-consistency.md` — consistency models, saga pattern
- **See also**: `11-failure-modes-and-problem-patterns.md` — retry storm, slow consumer
- **See also**: `02-scalability-patterns.md` — event-driven for write scaling
