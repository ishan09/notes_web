# Failure Modes & Problem Patterns

> **Purpose**: Named phenomena and failure modes every system designer must recognize by name, diagnose by symptom, and fix by mechanism. Knowing the name is step one. Understanding *why the fix works* and *how to tell it apart from similar problems* is what separates good engineers from great ones.

## Table of Contents
1. [Resource Contention](#1-resource-contention)
2. [Stampede & Herd Problems](#2-stampede--herd-problems)
3. [Cache Problems](#3-cache-problems) — Cache Stampede · Cache Thrashing · **Hot Key Problem**
4. [Database Problems](#4-database-problems)
5. [Cascading & Propagation Failures](#5-cascading--propagation-failures)
6. [Distributed Consensus Problems](#6-distributed-consensus-problems)
7. [Data Consistency Anomalies](#7-data-consistency-anomalies)
8. [Coordination Problems](#8-coordination-problems)
9. [Latency & Performance Problems](#9-latency--performance-problems)
10. [Network Problems](#10-network-problems)
11. [Streaming & Flow Problems](#11-streaming--flow-problems)
12. [Time & Clock Problems](#12-time--clock-problems)
13. [Quick Reference Card](#quick-reference-card)

---

## 1. Resource Contention

### Noisy Neighbor

**What**: One tenant in a multi-tenant system consumes disproportionate shared resources — CPU, memory, network, disk I/O — degrading performance for every other tenant on the same host.

```
Shared Host / Cluster Node
├── Tenant A  ░░░░          (normal)
├── Tenant B  ░░░           (normal)
├── Tenant C  ████████████  (noisy neighbor — hogs everything)
└── Tenant D  ░░            (slowed down — wasn't doing anything wrong)
```

**Real example**: AWS EC2 "noisy neighbor" was a notorious early-cloud problem. One EC2 instance doing heavy disk I/O on a shared EBS volume would saturate I/O bandwidth for all instances on that physical host. AWS eventually moved to dedicated EBS volumes per instance to eliminate this.

**Why it's hard to detect**: Tenant D's metrics look healthy — low CPU, low memory. The problem shows only as elevated latency. You need host-level visibility to see that Tenant C is the root cause, not Tenant D's code.

**Fix**:
- **Resource quotas + hard limits**: `cgroups` limits per container/tenant — CPU shares, memory limits, I/O weight
- **Shuffle sharding**: Instead of randomly placing N tenants on M hosts, distribute them such that any two tenants sharing a host share no other hosts. Limits blast radius: one noisy neighbor affects only a small slice of tenants
- **Dedicated resources for premium tiers**: High-SLA tenants get their own nodes (shared-nothing)
- **Rate limiting per tenant**: Throttle at the API/queue level before it becomes a resource problem

**Distinguish from**: *Resource Exhaustion* — noisy neighbor is relative (one consumes what others need). Resource exhaustion is absolute (the system runs out entirely).

---

### Head-of-Line (HOL) Blocking

**What**: A slow or blocked request at the front of a queue prevents all subsequent requests from being processed, even though those requests are independent and could complete immediately.

```
Single Queue:
[Slow/Stuck Request 🐢] → [Fast A ⚡] → [Fast B ⚡] → [Fast C ⚡]
         ↑
   All of A, B, C wait here — even though they'd finish in 1ms
```

**Real example**: HTTP/1.1 suffers HOL blocking at the TCP level — each connection processes one request at a time. HTTP/2 solved this with multiplexing (multiple streams per connection). HTTP/3 (QUIC) solved it further — even packet loss on one stream doesn't block others, because QUIC handles each stream independently.

**Why it's hard to detect**: Average latency looks fine (most requests are fast). P99 latency is terrible. The queue depth metric is normal because it drains fast once the slow request finishes.

**Fix**:
- **Multiple independent queues**: Priority queue per tier — fast lane for light requests, slow lane for heavy ones
- **Request multiplexing**: HTTP/2 streams, gRPC multiplexing
- **Timeout and eject**: If a request has been queued > N ms, reject it and let the queue advance
- **Work-stealing**: Worker threads steal from fast-lane queue when slow-lane is blocked

**Distinguish from**: *Deadlock* — HOL blocking has one stuck request holding up others behind it. Deadlock is a circular dependency where two sides each need what the other holds.

---

### Priority Inversion

**What**: A high-priority task can't run because it's waiting for a resource held by a low-priority task. Medium-priority tasks preempt the low-priority task, preventing it from releasing the resource — so the high-priority task is effectively blocked by medium-priority work.

```
Low-P  task holds Mutex M
High-P task needs Mutex M → BLOCKED, waiting

Med-P  task (needs no lock) gets scheduled and preempts Low-P
       → Low-P never runs → Mutex M never released
       → High-P stays blocked
       → Med-P runs freely despite lower priority than High-P
```

**Real example**: **Mars Pathfinder (1997)** — The spacecraft kept resetting. Root cause: a low-priority meteorological data task held a mutex needed by the high-priority communication task. Medium-priority tasks kept the low-priority task from running. The scheduler's watchdog saw the high-priority task not completing and reset the system. Fixed remotely by enabling priority inheritance.

**Fix**:
- **Priority inheritance**: When Low-P holds a lock needed by High-P, temporarily boost Low-P's priority to match High-P's so it can run and release the lock quickly
- **Priority ceiling protocol**: Assign each mutex a ceiling priority = highest priority of any task that will ever lock it; any task locking the mutex runs at that ceiling
- **Lock-free data structures**: Eliminate the lock entirely

---

### Resource Exhaustion

**What**: A finite resource (file descriptors, database connections, threads, memory, ports) is consumed until the system limit is reached. New operations that need the resource are blocked or fail.

**Common resources that get exhausted**:

| Resource | Typical Limit | Symptom when exhausted |
|---|---|---|
| File descriptors | 1,024–65,536 per process | "Too many open files" error |
| DB connections | Pool size (e.g., 100) | Requests queue/timeout |
| Threads | JVM stack memory | `OutOfMemoryError: unable to create thread` |
| Ephemeral ports | ~28,000 per IP:port pair | `EADDRNOTAVAIL` — can't open new connections |
| Memory | RAM + swap | OOM killer terminates processes |

**Real example**: A Spring Boot app with unclosed `HttpClient` connections leaks one connection per request to an external service. After 6 hours, all 1,024 file descriptors are consumed. The app stops accepting new requests. Restart fixes it temporarily; the leak continues.

**Why it's hard to detect**: Resource consumption is gradual. Everything is fine for hours. Then it falls off a cliff. By the time you notice, the process is already broken.

**Fix**:
- **Connection pooling with hard limits**: `HikariCP` max-pool-size, `HttpClient` with connection limit
- **Try-with-resources / finally blocks**: Guarantee cleanup regardless of exception path
- **Leak detection**: HikariCP has a `leak-detection-threshold` that logs when connections aren't returned
- **Circuit breakers**: Stop acquiring new resources when the system is near exhaustion
- **Monitor**: Alert at 80% resource utilization, not 100%

---

## 2. Stampede & Herd Problems

### Thundering Herd

**What**: Many clients or processes that were sleeping/waiting all wake up simultaneously and compete for the same scarce resource, creating a load spike that overwhelms the system — which may then fail, causing them all to go back to sleep and repeat.

```
t=0:  10,000 workers sleeping, waiting for work
t=1:  One item appears in the queue
t=1:  All 10,000 wake up simultaneously
t=1:  All try to acquire the lock / connect to DB
t=1:  System overwhelmed → most fail
t=1:  All 10,000 go back to sleep
t=2:  Repeat
```

**Real example**: Linux's `accept()` thundering herd — before kernel 2.6, all processes `accept()`-ing on the same socket would all wake when a new connection arrived; only one would get it, the rest would block again. Fixed in kernel 2.6 with `EPOLLEXCLUSIVE`.

**Another example**: A mobile app with millions of users. Server goes down for 30 seconds. All clients have a 30-second retry timeout. Server comes back up. All million clients retry at t=30s simultaneously. Server immediately goes down again.

**Fix**:
- **Jitter on retry**: `wait = base + random(0, jitter_cap)` — spreads the retry wave over time
- **Probabilistic cache refresh** (for cache-related thundering herd): Before cache key expires, each request has a small probability of refreshing it early — computed as `random() < exp(-(ttl_remaining) / beta)`
- **Only wake one waiter**: Use `pthread_cond_signal` instead of `pthread_cond_broadcast`; in queues, use exclusive wake-up

---

### Retry Storm

**What**: All clients fail at the same moment due to a transient error. They all apply the same backoff (e.g., wait 1 second) and all retry at exactly the same time — recreating the exact same spike that caused the original failure.

```
t=0:  Server overloads. All 10,000 clients get 503.
t=1:  All clients wait 1 second (identical backoff)
t=1:  All 10,000 retry simultaneously
t=1:  Server overloads again → all get 503
t=2:  All retry again → infinite synchronized storm
```

**Why it's hard to detect**: Looks like a legitimate traffic spike. Logs show clients retrying "correctly." But the retries are perfectly synchronized.

**Fix — Exponential backoff with full jitter (AWS recommendation)**:
```
# Bad — synchronized retries
def retry(attempt):
    time.sleep(1)
    call()

# Bad — exponential but still synchronized
def retry(attempt):
    time.sleep(2 ** attempt)  # 2, 4, 8, 16...
    call()

# Good — exponential + full jitter (random between 0 and cap)
def retry(attempt, base=1, cap=30):
    wait = min(cap, base * 2 ** attempt)
    time.sleep(random.uniform(0, wait))  # spread across 0..wait
    call()
```

**Also**: Circuit breaker at the client — after N consecutive failures, stop retrying and fail fast for a cooldown window. Prevents retry storm from continuing indefinitely.

**Distinguish from**: *Thundering Herd* — in thundering herd, clients were idle and all woke at the same time. In retry storm, clients were actively retrying and their retries synchronized. Same fix (jitter) applies to both.

---

## 3. Cache Problems

### Cache Stampede (Dog-Pile Effect)

**What**: A popular cache key expires. All concurrent requests that were being served from cache simultaneously miss. All attempt to recompute or fetch the value from the backend at the same instant — overwhelming it.

```
t=0:  key "homepage_data" cached, TTL=60s
t=60: TTL expires
t=60: 5,000 concurrent requests all MISS
t=60: All 5,000 query the DB
t=60: DB: normally handles 50 queries/sec → overwhelmed
t=60: DB slows → all 5,000 queries timeout
t=60: Cache still not populated (all failed)
t=60: Next 5,000 requests also miss...
```

**Real example**: Reddit experienced this when "hot" post pages' cache keys expired — sudden DB hammering. Their fix: a mutex pattern where only the first miss triggers a recompute; others serve stale while waiting.

**Three fixes, each with different trade-offs**:

```
Fix 1: Mutex / Lock (most common)
   First miss → acquires lock → recomputes → populates cache
   Other misses → see lock is held → serve stale value OR wait

Fix 2: Probabilistic early refresh (XFetch algorithm)
   Before key expires, compute:
     refresh = -ttl_remaining > (1/beta) * log(random())
   If true → refresh now, even though it hasn't expired yet
   Spreads the refresh work before expiry rather than after

Fix 3: Stale-while-revalidate
   Return the stale value immediately (fast response)
   Asynchronously recompute in background
   Next request gets the fresh value
   Trade-off: accepts briefly stale data
```

**Distinguish from**: *Thundering Herd* — cache stampede is specifically about a cache key expiry causing backend overload. Thundering herd is the general problem of many waiters waking at once. Cache stampede IS a thundering herd, but at the cache layer specifically.

---

### Cache Cold Start

**What**: The cache is empty — after a restart, first deployment, or deliberate flush. All requests miss and hit the backend simultaneously before the cache has time to warm up.

**Real example**: Netflix deploys a new CDN edge node. The local cache is empty. All requests for popular content go to origin servers simultaneously. Origin gets 100× normal load for several minutes until the cache warms. Netflix solved this with "cache warming" — pre-populating the cache with predictable popular content before the node goes live.

**Why it compounds**: If the backend slows under cold-start load, the cache takes even longer to warm, which extends the cold-start period — a feedback loop.

**Fix**:
- **Pre-warming**: Replay recent read traffic against the new cache before it goes live
- **Lazy loading with jitter**: Don't let all cache misses trigger backend calls simultaneously — rate-limit cache population
- **Snapshot-based warm-up**: Dump popular keys to disk before shutdown; reload on startup
- **Traffic ramp**: Gradually shift traffic to the new node (1% → 5% → 25% → 100%) giving it time to warm at each stage

---

### Cache Thrashing

**What**: The cache is too small relative to the working set. Items are evicted before being reused, so the cache hit rate approaches zero. Every request is effectively a cache miss.

```
Working set: 10,000 keys
Cache size:  1,000 keys

Key 1 loaded → Key 2 loaded → ... → Key 1,001 loaded → Key 1 evicted
Next request for Key 1 → MISS → reload → evicts Key 2 → ...
Every key is evicted before it's requested again
```

**Fix**:
- **Increase cache size** (obvious, but verify with hit rate metrics first)
- **Change eviction policy**: LRU works well for recency-biased access. LFU works better when some items are always popular (Pareto distribution). TinyLFU (used by Caffeine) combines both
- **Reduce key diversity**: Are you caching per-user data that could be shared? Per-request timestamps in cache keys?
- **Analyze working set size**: `redis-cli --hotkeys` or `OBJECT FREQ` to understand what's actually being accessed

---

### Hot Key Problem

**What**: A single cache key receives a disproportionate fraction of all traffic — far beyond what a single cache node can handle. Unlike hot shard (a database problem), this specifically targets one key in a distributed cache. The hash function routes all requests for that key to the same node, regardless of how many nodes exist.

```
Normal traffic: 10,000 rps spread across 1M keys
Redis Node 1: ░░░  (key_abc, key_def, ...)
Redis Node 2: ░░   (key_ghi, key_jkl, ...)
Redis Node 3: ░░░  (key_xyz, key_mno, ...)

Viral event: 100,000 rps for key "url:abc123"
hash("url:abc123") % 3 = Node 1

Redis Node 1: ████████████████  ← SATURATED (100K rps)
Redis Node 2: ░                 ← idle
Redis Node 3: ░░                ← idle

Adding nodes doesn't help — the key is still pinned to one node.
```

**Real examples**:
- URL shortener: one viral tweet sends 100K rps to a single short URL key
- Redis session store: a famous user's session key checked on every request
- E-commerce: a flash sale item's stock key queried before every checkout

**Why it's deceptive**: Your Redis cluster health metrics show total cluster load is fine (CPU 10%). But one node is at 100% and dropping requests. You scale out, add nodes — nothing improves.

**Distinguish from**:
- *Hot Shard*: a database partition problem (data distribution). Hot Key is a cache problem (traffic distribution to one key).
- *Cache Stampede*: caused by TTL expiry. Hot Key problem exists even when the key is never expiring — it's about concurrent reads to one live key.

**Fix — pick based on severity**:

1. **Local in-process cache (best first step)**
   Each app server caches the value in its own heap. Zero network, zero coordination. 20 servers = 20 independent caches, each absorbing their local requests.
   ```
   // Java (Caffeine)
   Cache<String, String> localCache = Caffeine.newBuilder()
       .expireAfterWrite(5, TimeUnit.SECONDS)
       .maximumSize(1000)
       .build();

   String resolve(String key) {
       return localCache.get(key, k -> redis.get(k));
   }
   ```
   Downside: stale data window = local TTL. Fine for redirects, not for bank balances.

2. **CDN / edge layer (for read-heavy public data)**
   Push caching to the edge. Each CDN PoP absorbs its own regional traffic independently. No single-node bottleneck. Best for public, cacheable responses.

3. **Key replication (Redis-specific)**
   Store the hot key under N suffixed copies; on read, pick a random one:
   ```
   Write: SET url:viral:0 <val>  SET url:viral:1 <val>  ... SET url:viral:9 <val>
   Read:  GET url:viral:{random(0,9)}
   ```
   Now 10 nodes share the load. Tradeoff: invalidation must update all copies.

4. **Read-through with mutex / single-flight**
   When the key is missing, only one goroutine/thread fetches it; others wait. Prevents stampede but doesn't reduce steady-state hot-key load.

5. **Accept stale data (adjust TTL tolerance)**
   Extending TTL reduces expiry-driven reloads. For redirects, 5–30s staleness is acceptable and dramatically reduces pressure.

**How to detect**:
```bash
# Redis: find hottest keys
redis-cli --hotkeys           # requires maxmemory-policy allkeys-lfu
redis-cli OBJECT FREQ <key>   # per-key frequency (LFU mode)

# CloudWatch / Datadog: look for
# - one Redis node at high CPU while others are idle
# - cache hit rate drop on specific key prefix
# - spike in "connection refused" from one node only
```

**Interview tell**: If asked "how do you scale this cache?" and you say "add more nodes" — interviewers will probe "but what about a single key getting all the traffic?" This is the question.

---

## 4. Database Problems

### N+1 Query Problem

**What**: An ORM or application fetches N parent records in one query, then issues N individual queries — one per parent — to fetch related records. Total: N+1 database round trips instead of 1.

```sql
-- Query 1: fetch all users
SELECT * FROM users;  -- returns 100 users

-- Queries 2-101: for each user, fetch their orders
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
...
SELECT * FROM orders WHERE user_id = 100;
-- 101 queries total. Should have been 1.
```

**Real impact**: 100 users → 101 queries. 10,000 users → 10,001 queries. At 5ms per query: 100 users = 505ms. With a JOIN: ~5ms. The N+1 problem doesn't show up in development (small datasets) but destroys production performance.

**Fix**:
```sql
-- Fix 1: JOIN in one query
SELECT users.*, orders.*
FROM users
JOIN orders ON orders.user_id = users.id;

-- Fix 2: batch fetch with IN (avoids cartesian product risk)
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ..., 100);

-- Fix 3: ORM eager loading (Hibernate)
@OneToMany(fetch = FetchType.EAGER)
-- or
session.createQuery("FROM User u JOIN FETCH u.orders")
```

**How to detect**: Enable query logging in your ORM. If you see the same query repeated N times with different IDs, it's N+1. APM tools (Datadog, New Relic) show query count per request.

---

### Hot Partition (Hot Shard)

**What**: Data partitioned (sharded) unevenly — one partition receives a disproportionate share of reads or writes, becoming a bottleneck while other partitions are underutilized.

```
User data sharded by first letter of last name:
Shard A-D: ████████████████████  (40% of users)
Shard E-H: ████████████          (25% of users)
Shard I-L: ████                  (10% of users)
Shard M-P: ████                  (10% of users)
Shard Q-T: ███                   (8% of users)
Shard U-Z: ███                   (7% of users)
```

**Real example**: Twitter's early sharding by user_id range. When a celebrity with a low user_id posted, that shard got hammered. Their fix: consistent hashing with virtual nodes so popular users are naturally spread.

**Another pattern**: Time-based sharding — sharding by date means yesterday's and today's shards get all writes; historical shards are idle but still consume resources.

**Fix**:
- **Hash-based sharding**: `shard = hash(key) % num_shards` — distributes randomly and evenly
- **Consistent hashing with virtual nodes**: Each physical node owns multiple virtual nodes spread across the hash ring; hot keys are naturally spread
- **Compound shard key**: `shard = hash(user_id + date)` — spreads temporal hotspots
- **Microshard / split hot shard**: Detect hot shards via monitoring; split them into multiple sub-shards
- **Read replicas for the hot shard**: Can't reduce writes, but reads can be served from replicas

---

### Write Amplification

**What**: The actual bytes written to persistent storage are many times more than the bytes the application intended to write. Causes: indexes, write-ahead logs, LSM tree compaction, replication.

**Where it comes from**:
```
Application writes: UPDATE users SET email='new@email.com' WHERE id=1
                         ↓ actual writes to disk:
1. Write-Ahead Log (WAL)           ← +1× amplification
2. Heap/data page (the row itself) ← +1×
3. Email index (B-tree update)     ← +1×
4. Updated_at index (B-tree)       ← +1×
5. Replica 1 receives WAL          ← +1×
6. Replica 2 receives WAL          ← +1×
Total: ~6× amplification for one logical write

LSM trees (Cassandra, RocksDB):
Write goes to memtable → flushed to L0 SSTable → compacted to L1 → L2 → ...
Each compaction level rewrites all data in that level
Write amplification = O(levels × size_ratio) = easily 10-30×
```

**Real impact**: SSDs have a finite write endurance (TBW — terabytes written). High write amplification wears out SSDs prematurely. At 30× amplification, a drive rated for 100TB effective writes is worn out after 3.3TB of logical data.

**Fix**:
- **HOT updates in PostgreSQL**: If you update a column with no index change, PostgreSQL can do a Heap-Only Tuple (HOT) update — no index rewrite needed. Only possible if the new version fits on the same page
- **Minimize indexes**: Every index is multiplied write cost. Only index what you query on
- **LSM tuning**: Smaller size ratios reduce amplification but increase space amplification. Leveled compaction (RocksDB default) trades write amp for better read amp vs. Tiered compaction

---

### Read Amplification

**What**: Fetching a single logical value requires reading many more physical bytes from storage than the value itself. Most pronounced in LSM-tree based systems (Cassandra, RocksDB, LevelDB).

```
B-Tree (PostgreSQL): Read amplification ≈ tree depth (~3-4 page reads)
LSM Tree (RocksDB, Cassandra):
  Key may exist in: MemTable → L0 (multiple SSTables) → L1 → L2 → L3 → ...
  Must check each level → up to 7+ reads per lookup
  Each SSTable file → one random I/O (expensive on HDD)
```

**Fix**:
- **Bloom filters**: Probabilistic data structure — tells you with certainty if a key is *not* in an SSTable (zero false negatives). Eliminates ~99% of unnecessary SSTable reads. Cost: ~10 bits per key of memory
- **Row cache / block cache**: Cache frequently accessed SSTables in memory
- **Compaction**: More aggressive compaction collapses levels, reducing how many SSTables must be checked. Trade-off: more write amplification
- **B-tree instead of LSM**: For read-heavy workloads, B-tree (PostgreSQL, MySQL InnoDB) has much lower read amplification

---

## 5. Cascading & Propagation Failures

### Cascading Failure (Avalanche Effect)

**What**: A failure in one component causes increased load or degraded responses to dependent components, which fail under the extra stress, causing their dependents to fail — a chain reaction that can bring down the entire system.

```
Normal:      A → B → C → D (all healthy)

A starts failing:
  Requests to A timeout → clients retry → 3× the normal load on A
  A is fully down → B's thread pool fills waiting for A responses
  B times out → C's thread pool fills
  C goes down → D's thread pool fills
  D goes down → entire system down
```

**Real example**: Amazon's 2021 US-EAST-1 outage. A networking issue caused increased latency, which caused retry storms from internal services, which overloaded the internal DNS resolution service, which made the networking issue worse — a feedback loop that cascaded into a multi-hour outage affecting S3, EC2, and downstream services.

**Why it's dangerous**: The failure spreads faster than humans can respond. By the time on-call is paged and investigates, multiple services are already down. The root cause (A) may be healthy again, but B, C, D are still overwhelmed.

**The three fixes that actually work together**:

```
1. Circuit Breaker (at the client side of every service call)
   CLOSED → call normally
   Too many failures → OPEN (fail fast, don't call A at all)
   After cooldown → HALF-OPEN (try one call)
   If it succeeds → back to CLOSED

   State machine:
   CLOSED ──(failure threshold exceeded)──→ OPEN
   OPEN   ──(cooldown timer expires)──────→ HALF-OPEN
   HALF-OPEN ──(success)──────────────────→ CLOSED
   HALF-OPEN ──(failure)──────────────────→ OPEN

2. Bulkhead (isolate thread pools per dependency)
   Service B has:
   - Thread pool for calls to A (max 10 threads)
   - Thread pool for calls to C (max 10 threads)
   - Thread pool for user requests (max 50 threads)
   If A is slow and fills its pool, C and user requests still work

3. Timeout (always, everywhere)
   Never make a network call without a timeout.
   timeout = P99 of that call + small buffer
   If A normally responds in 50ms P99, timeout at 200ms.
   Without timeout: threads wait indefinitely → thread pool exhaustion
```

---

### Metastability / Feedback Loop

**What**: A system reaches a state where its own recovery mechanism sustains or amplifies the problem — a self-reinforcing loop that prevents recovery even after the root cause is resolved.

```
Load spike → Service overwhelmed → Requests timeout → Clients retry
→ Retry load > original spike → More timeouts → More retries → ...
Even after the original load spike passes, retry traffic keeps the system overwhelmed
```

**Real example**: Described in the 2021 paper "Metastable Failures in Distributed Systems" (OSDI). Twitter experienced this: a metadata service got slow → clients timed out and retried → retry traffic overwhelmed the metadata service → retries kept it overwhelmed long after the original spike ended.

**The key insight**: The system is stable at low load and stable at high load — but there's an intermediate state where recovery mechanisms (retries) sustain the failure. The system gets *stuck* in the failure state.

**Fix**:
- **Load shedding**: Actively drop excess requests to protect the system. "It's better to serve 60% of users well than to serve 100% of users badly." Use a token bucket at the entry point — drop requests when the bucket is empty
- **Retry budgets**: Each client has a limited number of retries per second globally. Not per-request, but a shared budget across all in-flight requests
- **Backpressure**: Upstream services slow their send rate when downstream signals overload

---

## 6. Distributed Consensus Problems

### Split-Brain

**What**: A network partition divides a cluster into two or more isolated groups. Each group, unable to communicate with the other, independently concludes it is the active/primary partition and continues accepting writes. When the partition heals, data has diverged and conflicts must be resolved.

```
Before partition:
[Node A (Primary)] ←──healthy──→ [Node B (Replica)]

Partition occurs:
[Node A] ←─── X ───→ [Node B]
Node A: "B is dead. I'm still primary. Accepting writes."
Node B: "A is dead. I'm now primary. Accepting writes."

Client writes to A: user.balance = $100
Client writes to B: user.balance = $200
Partition heals: conflict. Which is correct?
```

**Real example**: In 2011, a GitHub MySQL outage caused split-brain. A network issue caused the primary and replica to lose connectivity. The replica promoted itself to primary. When connectivity restored, both were accepting writes. GitHub had to manually reconcile data.

**Why you can't just "pick the most recent write"**: Without a distributed clock, "most recent" is meaningless — both nodes believe their write happened "now."

**Fix**:
- **Quorum-based consensus (Raft/Paxos)**: A leader can only be elected if it has acknowledgment from a majority (>50%) of nodes. If the cluster splits 3/2, only the 3-node side can elect a leader. The 2-node side can't reach quorum → goes read-only or rejects writes
- **Fencing / STONITH (Shoot The Other Node In The Head)**: Force the node that lost the election to stop. Often done by cutting its power or network via a separate control plane. Prevents the losing node from continuing as a "zombie primary"
- **Fencing tokens**: Each leadership epoch has a monotonically increasing token. Storage layer rejects writes from any client presenting a token older than the current epoch

---

### Byzantine Fault

**What**: A node doesn't just crash — it behaves arbitrarily. It may send different messages to different peers, send correct messages some of the time and wrong ones other times, or actively lie about its state. Named after the Byzantine Generals Problem (Lamport, 1982).

**Crash fault vs Byzantine fault**:
```
Crash fault:   Node A sends nothing (it's dead) — easy to detect
Byzantine:     Node A sends "COMMIT" to B and "ABORT" to C for the same tx
               — very hard to detect; other nodes disagree about A's behavior
```

**Why it matters**: Standard consensus algorithms (Raft, Paxos) assume crash-fault tolerance (CFT) — nodes either respond correctly or don't respond. They break if a node sends incorrect data. BFT requires 3f+1 nodes to tolerate f faulty nodes (vs 2f+1 for CFT) because you need enough honest nodes to outvote the liars.

**Real contexts where BFT matters**:
- Blockchain / distributed ledgers (nodes may be adversarial)
- Safety-critical systems (a hardware fault can cause a node to send garbage)
- Multi-organization systems (you don't fully trust other orgs' nodes)

**In practice**: Internal distributed systems (databases, microservices) use CFT algorithms because nodes are trusted. BFT adds significant complexity and performance overhead. Use BFT only when nodes are explicitly untrusted.

---

## 7. Data Consistency Anomalies

> **Context**: These anomalies arise in concurrent database transactions. SQL isolation levels are defined by which of these anomalies they prevent.

### Dirty Read

**What**: Transaction A reads data that Transaction B has modified but not yet committed. If B rolls back, A has processed data that never officially existed.

```
T1: BEGIN
T1: UPDATE accounts SET balance = 0 WHERE id=1  (not committed yet)
T2: BEGIN
T2: SELECT balance FROM accounts WHERE id=1  → reads 0  ← DIRTY READ
T1: ROLLBACK  (oops, this was an error)
T2: sends email "Your balance is $0. Please add funds."  ← wrong!
```

**Fix**: `READ COMMITTED` isolation or higher. At READ COMMITTED, T2 only sees committed data — it would have read the original balance, not T1's uncommitted change.

---

### Non-Repeatable Read

**What**: Within a single transaction, the same row is read twice and returns different values because another transaction committed an update between the two reads.

```
T1: SELECT salary FROM emp WHERE id=1  → $50,000
      (T2 runs: UPDATE emp SET salary=60000 WHERE id=1; COMMIT)
T1: SELECT salary FROM emp WHERE id=1  → $60,000  ← different!
T1 now has inconsistent data within the same transaction
```

**Real impact**: T1 is computing a payroll report. It reads salaries, does some calculations, then reads again for totals. The totals don't match the calculations — audit failure.

**Fix**: `REPEATABLE READ` isolation. The database takes a snapshot at T1's start; all reads within T1 see the snapshot, regardless of external commits.

---

### Phantom Read

**What**: A transaction executes a range query twice. Between the two executions, another transaction inserts or deletes rows matching the query condition — so the result set changes ("phantom" rows appear or disappear).

```
T1: SELECT * FROM orders WHERE amount > 1000  → 5 rows
      (T2 runs: INSERT INTO orders (amount=1500, ...); COMMIT)
T1: SELECT * FROM orders WHERE amount > 1000  → 6 rows  ← phantom!
```

**Subtle difference from non-repeatable read**: Non-repeatable read = same row returns different *values*. Phantom read = the *set of rows* changes (different rows appear/disappear).

**Fix**: `SERIALIZABLE` isolation, which uses predicate locks or range locks — not just row locks — to prevent new rows matching the predicate from being inserted while T1 runs. Significant performance cost.

---

### Read-Your-Writes Violation (Causal Consistency Violation)

**What**: A user writes data, then immediately reads it back — but the read hits a replica that hasn't yet received the write from the primary. The user sees their own stale data — an experience-breaking inconsistency.

```
User action: POST /profile  { name: "Alice" }  → Primary DB (committed)
                                                     ↓ replication lag: 200ms
User action: GET /profile                      → Replica DB (not yet synced)
                                                     → returns { name: "Bob" }
User: "I just changed my name! Why is it still Bob?!"
```

**Real example**: Social media apps — user posts a tweet, refreshes their timeline, tweet isn't there. Facebook, Twitter, Instagram all had to build session-level read-your-writes consistency to prevent this.

**Fix options**:
- **Read from primary after write**: Add a flag to the session — if the user just wrote, route their next read to primary. Cost: primary gets more read traffic
- **Replication-lag-aware routing**: Track the replication position of each write; route reads to replicas that have caught up to at least that position
- **Wait for replica**: After write, poll until the replica has synced (worst for latency)
- **Client-side**: Return the written value from the write response itself; display it client-side without making a read call

---

## 8. Coordination Problems

### Deadlock

**What**: Two or more processes/transactions each hold a resource that another needs. Each waits for the other to release. Neither can proceed. The system is stuck.

```
Transaction T1:          Transaction T2:
LOCK row A               LOCK row B
  (trying to lock B...)    (trying to lock A...)

T1 holds A, wants B
T2 holds B, wants A
→ Both wait forever → Deadlock
```

**Four conditions required for deadlock** (all must be true simultaneously):
1. **Mutual exclusion**: Resources can't be shared
2. **Hold and wait**: Process holds one resource while waiting for another
3. **No preemption**: Resources can't be taken away; only released voluntarily
4. **Circular wait**: A → waits for → B → waits for → A

**Real example**: MySQL deadlock between two transactions inserting rows that trigger foreign key checks in opposite order. MySQL detects it, picks a victim (the "cheaper" transaction), and rolls it back. The other transaction proceeds.

**Fix**:
- **Lock ordering**: Always acquire locks in the same global order (e.g., always lock lower user_id first). Breaks circular wait
- **Timeouts**: If a lock isn't acquired within N ms, abort and retry
- **Deadlock detection**: Database maintains a wait-for graph; detects cycles; picks a victim to rollback (MySQL, PostgreSQL do this automatically)
- **Optimistic locking**: Don't lock on read — check a version number on write. If the version changed, retry. No locks held → no deadlock possible

---

### Livelock

**What**: Processes are not blocked (unlike deadlock) — they are actively running — but are doing so in a way that prevents any progress. They continuously change state in response to each other, going nowhere.

```
Person A and Person B in a corridor:
A moves left → B moves left → collision → A moves right → B moves right → collision → ...
Neither is stuck. Both are moving. Neither gets through.
```

**Software example**:
```
T1 detects conflict with T2 → T1 rolls back immediately
T2 detects conflict with T1 → T2 rolls back immediately
T1 restarts, immediately conflicts with T2 again → T1 rolls back
T2 restarts, immediately conflicts with T1 again → T2 rolls back
→ Both are "doing work" (rolling back and restarting) but never commit
```

**Why it's worse than deadlock in some ways**: Deadlock is visible — threads are blocked, CPU is idle, easy to detect with thread dumps. Livelock looks like high CPU activity — both processes are spinning. May not trigger deadlock detection.

**Fix**:
- **Random backoff**: After rollback, wait a random duration before retrying — breaks the symmetry
- **Priority / tie-breaking**: Give one transaction priority (e.g., the one with the lower transaction ID always wins)

---

### Starvation

**What**: A process or thread is perpetually denied access to a resource it needs because other (higher-priority) processes always get it first. The starved process makes no progress indefinitely.

```
Priority queue with requests:
Continuous stream of HIGH priority requests → always served first
LOW priority batch job → waits forever, never gets a turn
```

**Real examples**:
- Java thread scheduler: A tight loop of high-priority threads can starve lower-priority threads for minutes
- Database: Long-running analytical queries starved by many short OLTP queries
- Kubernetes: A namespace with high resource requests always gets resources; another namespace with lower priority starves

**Distinguish from deadlock**: In deadlock, no one makes progress. In starvation, high-priority tasks make progress — only the low-priority task is stuck.

**Fix**:
- **Aging**: Gradually increase priority of waiting work. After waiting 10 seconds, boost priority by 1. After 60 seconds, boost by 10. Eventually even the lowest-priority job gets through
- **Fair scheduling**: Round-robin ensures every request eventually gets a turn, regardless of priority
- **Separate queues with guaranteed throughput**: Reserve 10% of capacity for batch/low-priority work regardless of high-priority load

---

### Lease Expiration / Dual-Leader

**What**: A distributed lock or leader lease expires before the current holder notices. Another node claims the lease and begins acting as leader. For a brief window, two nodes believe they are the leader — both accept writes, causing split-brain at the application layer.

```
t=0:    Node A holds lease, expiry at t=10
t=10:   Lease expires. Node A has a GC pause and doesn't notice yet.
t=10:   Node B sees lease expired → claims leadership → starts accepting writes
t=10:   Node A resumes from GC pause → still thinks it's leader → accepts writes
t=10 to t=11: Dual-leader. Both A and B accept writes. Data corrupts.
```

**This is subtle**: The problem is usually a GC pause, network delay, or slow clock. The lease holder is "alive" but momentarily unresponsive — enough time for another node to claim leadership.

**Fix — Fencing tokens**:
```
Every time leadership changes, a monotonically increasing token is issued:
  Epoch 1: Node A is leader (token=1)
  Node A's lease expires → Node B claims leadership
  Epoch 2: Node B is leader (token=2)

  Node A wakes from GC pause. Sends write to storage with token=1.
  Storage sees: "current epoch is 2, you have token=1 — REJECTED"
  Node A's write is safely rejected. No split-brain.
```

---

## 9. Latency & Performance Problems

### Tail Latency (P99 / P999 Latency)

**What**: Latency at high percentiles — the response time experienced by the slowest N% of requests. P99 = the latency at the 99th percentile (1 in 100 requests is this slow or slower).

```
Distribution of response times:
P50 (median):    10ms  ← half of users see this or faster
P75:             25ms
P95:            100ms
P99:          1,000ms  ← 1 in 100 requests takes 1 full second
P999:         8,000ms  ← 1 in 1,000 requests takes 8 seconds
```

**Why averages hide the problem**: If 99% of requests take 10ms and 1% take 10,000ms, the average is ~110ms. Looks fine. But 1% of users had a 10-second experience.

**The fan-out problem (why P99 matters more than you think)**:

If a user action triggers calls to 100 microservices in parallel:

```
P(at least one P99 hit) = 1 - (0.99)^100 ≈ 63%
```

63% of users get at least one slow call, even though each service has "only" a 1% slow rate. At 10 microservices: 10% of requests hit P99. At 100: 63%. At 1,000: 99.996%.

**Real example**: Amazon found that 100ms of added latency reduced sales by 1%. Google found 500ms of added latency reduced traffic by 20%. Both companies obsess over P99 latency.

**Fix**:
- **Hedged requests** ("backup requests"): Send the same request to two different replicas simultaneously. Use whichever responds first. Cancel the other. Adds ~2% extra load but can cut P99 by 50%+ (Dean & Barroso, Google)
- **Request deadlines**: Set a deadline on the entire user-facing request (e.g., 200ms). Propagate it to all downstream calls. Stop work and return partial results when deadline is near
- **Identify the cause**: GC pauses? Lock contention? Slow DB query? Each has a different fix

---

### Jitter

**What**: High variance in response time. Average latency is fine; some requests are unpredictably much slower. The latency distribution has a long tail or irregular spikes.

```
Without jitter: 10ms, 11ms, 10ms, 9ms, 10ms → consistent
With jitter:    10ms, 10ms, 2,000ms, 11ms, 10ms → unpredictable spike
```

**Common causes of jitter**:

| Cause | Typical spike duration |
|---|---|
| JVM GC pause (G1GC) | 50ms–500ms |
| JVM GC pause (CMS) | Seconds (full GC) |
| Lock contention | Depends on holder |
| OS context switch / scheduler | <1ms |
| Cold page fault (disk read) | 1ms–10ms |
| Network retry on packet loss | RTT + timeout |

**Fix**: Depends on root cause. For GC: switch to ZGC or Shenandoah (sub-millisecond pauses). For lock contention: use lock-free data structures or reduce lock granularity. For disk: use SSD, pin hot data in memory.

---

### Stop-The-World GC Pause

**What**: JVM garbage collectors periodically pause *all* application threads — including request-processing threads — to safely collect garbage. During the pause, the application appears completely unresponsive. No requests are processed. Health checks time out.

```
JVM application (Java 8 with CMS GC):
t=0:    Processing 10,000 req/sec normally
t=5:    Old generation fills up → Full GC triggered
t=5:    ALL THREADS PAUSED (stop the world)
t=5 to t=15: GC running. Zero requests processed. Zero heartbeats sent.
t=15:   GC completes. Threads resume.
t=15:   Kubernetes sees 10s without heartbeat → kills pod → restarts it
t=15:   Other pods absorb traffic → they also trigger GC → domino effect
```

**The compounding problem**: The GC pause causes health check failures → pod restart → traffic redistributed → other pods now have higher load → they also GC more → cascading GC storms.

**GC algorithm comparison**:

| GC | Pause duration | Throughput | Use case |
|---|---|---|---|
| Serial GC | Seconds | Low | Single-core, small heap |
| Parallel GC | 100ms–1s | High | Batch processing |
| G1GC (Java 9+ default) | 50ms–200ms | High | General purpose |
| ZGC (Java 15+) | <1ms (concurrent) | Medium | Latency-sensitive |
| Shenandoah | <1ms (concurrent) | Medium | Latency-sensitive |

**Fix**: For latency-sensitive services, use `-XX:+UseZGC` (Java 15+) or `-XX:+UseShenandoahGC`. ZGC does most of its work concurrently while application threads run. Pause time stays under 1ms even with multi-terabyte heaps.

---

## 10. Network Problems

### TCP Incast

**What**: Many senders simultaneously transmit data to one receiver. The receiver's network switch buffer overflows. TCP interprets the lost packets as severe congestion and applies its congestion control — reducing the congestion window to 1 MSS (minimum segment size). Recovery takes RTOmin (minimum retransmission timeout, typically 200ms). Throughput collapses to near zero.

```
Scatter-gather read pattern:
Client requests data → sends request to 100 storage shards in parallel
All 100 shards respond simultaneously
Switch port buffer: holds ~100 packets
100 shards × 10 packets each = 1,000 packets arrive simultaneously
Buffer overflows → 900 packets dropped
TCP: "this is catastrophic congestion!" → reduce window to 1 MSS
Must wait 200ms (RTO minimum) per retransmit
Throughput: was 10 GB/s → now 1 MB/s
```

**Real example**: This is endemic to distributed storage systems — HDFS, Ceph, distributed databases. Reading a large file striped across many nodes all respond at once. Microsoft and CMU papers documented it causing up to 90% throughput reduction in datacenter storage.

**Fix**:
- **Stagger responses**: Add small random delays to responses so shards don't all respond simultaneously
- **ECN (Explicit Congestion Notification)**: Switch signals congestion via a bit in the IP header instead of dropping packets. TCP reduces rate without the RTO timeout penalty
- **DCTCP (Data Center TCP)**: Uses ECN continuously to modulate sending rate finely; avoids buffer overflow rather than reacting to it
- **Reduce payload size**: If each shard sends a smaller response, fewer packets, less buffer pressure

---

### Bufferbloat

**What**: Network equipment (routers, switches, home gateways) has oversized buffers. When a link is congested, packets queue in the buffer instead of being dropped. This keeps TCP "happy" (no drops = no congestion signal) while adding massive latency — often seconds — invisibly.

```
Without bufferbloat (small buffer):
  Congestion → buffer fills → packet dropped → TCP detects congestion → reduces rate
  Latency spike: brief (during detection)

With bufferbloat (huge buffer):
  Congestion → buffer fills slowly → TCP never sees drops → never reduces rate
  All packets queued: latency = buffer_size / link_speed
  100MB buffer on 100Mbps link = 8 seconds of queuing delay!
  Latency: 8,000ms — but "no packet loss"
```

**Real example**: Consumer-grade home routers in the 2000s–2010s shipped with 1MB+ buffers. VoIP and gaming suffered terrible jitter while showing "100% connection quality" because no packets were being dropped. Bufferbloat was discovered and named by Jim Gettys in 2010.

**Fix**:
- **AQM (Active Queue Management)**: Instead of drop-when-full, use algorithms that proactively drop/mark packets before the buffer fills completely:
  - **CoDel (Controlled Delay)**: Measures time packets spend in the queue; drops packets that wait too long, even before the buffer fills
  - **FQ-CoDel**: Fair Queuing + CoDel — each flow gets its own queue, preventing any one flow from monopolizing buffer
- **BBR (Bottleneck Bandwidth and RTT)**: Google's TCP congestion control (2016). Doesn't rely on packet loss as a signal; instead models the network path directly. Works well in bufferbloat scenarios

---

## 11. Streaming & Flow Problems

### Slow Consumer / Consumer Lag

**What**: A message producer generates data faster than consumers can process it. The queue between them grows without bound — consuming memory and disk — until the system runs out, drops messages, or crashes.

```
Kafka topic "user-events":
Producer: 100,000 msgs/sec (user activity)
Consumer: 10,000 msgs/sec (analytics processor)

After 1 hour: lag = (100,000 - 10,000) × 3,600 = 324,000,000 unprocessed messages
After 1 day: lag grows until disk fills → Kafka OOMs or broker fails
```

**Why consumer lag is dangerous beyond the obvious**:
- **Reprocessing**: If you restart the consumer, it starts from where it left off — potentially hours behind real-time
- **Data expiry**: Kafka topics have retention policies (e.g., 7 days). If lag exceeds retention, messages are deleted unprocessed — permanent data loss
- **Ordering**: If you scale consumers to catch up, out-of-order processing may corrupt state

**Real example**: A stream processing job at a major e-commerce company fell behind during a flash sale. The consumer couldn't catch up. Orders from the queue were processed 4 hours late. Customer emails about order confirmation were sent 4 hours late. Customers panicked and called support.

**Fix**:
- **Scale consumers horizontally**: Increase partition count + consumer instances (in Kafka, consumers ≤ partitions)
- **Backpressure**: Consumer signals to producer to slow down. In reactive streams (Reactor, Akka), this is built-in
- **Priority lanes**: Create separate topics for critical messages; consumers process critical first
- **Monitor lag**: Alert at 10 minutes of lag, not when you run out of disk

```
# Kafka consumer lag monitoring
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group my-consumer-group --describe
# Shows: LAG column — alert if > threshold
```

---

### Backpressure Failure

**What**: A system has no mechanism for a slow consumer to signal a fast producer to slow down. The producer runs at maximum speed; the consumer falls behind; buffers fill; the system crashes or drops data.

```
Without backpressure:
Producer ──(full speed)──→ [Growing Buffer] ──(slow)──→ Consumer
Buffer grows → OOM → crash (or silent drops)

With backpressure:
Producer ──→ [Buffer] ──→ Consumer
              ↑ Buffer nearly full: signal producer to pause
Producer pauses until buffer drains below threshold
System stays stable
```

**Where backpressure matters**: Anywhere data flows from a fast source to a slow sink — network streams, file processing pipelines, event processing, reactive systems.

**Fix**:
- **Bounded queues with blocking**: Producer blocks (or gets an error) when queue is full — natural backpressure. Trade-off: producer throughput is limited to consumer throughput
- **Reactive Streams (Project Reactor, RxJava, Akka Streams)**: Standardized backpressure protocol built into the API. Consumer requests N items at a time; producer sends at most N
- **Rate limiting at source**: Limit producer output rate based on consumer health signals

---

## 12. Time & Clock Problems

### Clock Skew / Clock Drift

**What**: Clocks on different nodes in a distributed system disagree on the current time. **Skew** = the instantaneous difference between two clocks. **Drift** = the rate at which clocks diverge over time (quartz oscillators drift ~100ms/day without correction).

```
Node A (reference): 12:00:00.000
Node B:             12:00:05.500  ← 5.5s skew (dangerous)
Node C:             11:59:58.200  ← 1.8s behind (also dangerous)
```

**Why this is catastrophically dangerous in distributed systems**:

| What breaks | Why clock skew breaks it |
|---|---|
| Distributed locks (leases) | Node A's lease expires at t=10. Node B's clock says t=12 → steals lease. Node A's clock says t=9 → still thinks it's leader. Dual-leader. |
| Causality / event ordering | Event A at Node A (t=100) may have a *higher* timestamp than Event B at Node B (t=98) — even if B happened after A |
| Cache TTLs | A cached item expires at different times on different nodes |
| Distributed transactions | "Before/after" relationships in a 2PC transaction become ambiguous |

**NTP accuracy**: Typically ±1–10ms on a healthy LAN. Accuracy degrades with network hops, load, and asymmetric routing.

**Google's solution — TrueTime (Spanner)**:
```
TrueTime doesn't return a single timestamp — it returns an interval:
  TT.now() → [earliest, latest]  (typically ±7ms)

To commit a transaction, Spanner:
1. Gets TT.now() → [t_early, t_late]
2. Waits until wall clock > t_late (the "commit wait")
3. Commits with timestamp = t_late
Result: guaranteed that no future transaction on any node
        has a lower timestamp than this commit
```

**Fix for most systems**:
- **NTP + monitoring**: Run NTP; alert when skew exceeds 100ms
- **Logical clocks (Lamport timestamps)**: Don't use wall clock for ordering. Logical clocks capture "happened-before" relationships correctly regardless of physical time:
  ```
  Each node has a counter.
  On send: increment counter, attach to message.
  On receive: counter = max(local, received) + 1
  Guarantees: if A → B (A caused B), then timestamp(A) < timestamp(B)
  ```
- **Vector clocks**: Extension of Lamport clocks. Each node tracks all other nodes' clocks. Can detect concurrent events (neither caused the other). Used by Amazon DynamoDB, Riak.

---

## Quick Reference Card

### By Symptom → Problem

| You observe... | Problem is likely... |
|---|---|
| One tenant slows all others on shared infrastructure | Noisy Neighbor |
| Fast requests stuck behind one slow request | Head-of-Line Blocking |
| High-priority task slower than low-priority tasks | Priority Inversion |
| "Too many open files" / connections hang | Resource Exhaustion |
| Massive spike right after a service recovers | Thundering Herd |
| Retries synchronized, recreating the original overload | Retry Storm |
| Database hammered right after a popular cache key expires | Cache Stampede |
| Database overwhelmed right after cache restart | Cache Cold Start |
| Cache hit rate near zero despite large cache | Cache Thrashing |
| 101 database queries for 100 records | N+1 Query |
| One database shard at 100%, others at 5% | Hot Partition |
| SSDs wearing out faster than expected | Write Amplification |
| Single key lookup requires many disk reads | Read Amplification |
| One service fails → chain of failures across system | Cascading Failure |
| System can't recover even after root cause is fixed | Metastability |
| Two nodes both think they're the primary | Split-Brain |
| Node sends different data to different peers | Byzantine Fault |
| Transaction reads uncommitted data from another transaction | Dirty Read |
| Same row returns different values within one transaction | Non-Repeatable Read |
| Query returns different row counts within one transaction | Phantom Read |
| User sees their own write as if it never happened | Read-Your-Writes Violation |
| Two transactions wait for each other forever | Deadlock |
| Processes are "running" but making no progress | Livelock |
| Low-priority job never gets scheduled | Starvation |
| Two nodes briefly both believe they are leader | Lease Expiration / Dual-Leader |
| 1% of requests are extremely slow | Tail Latency (P99) |
| Latency is mostly fine but has random spikes | Jitter |
| App freezes for seconds, Kubernetes kills the pod | Stop-The-World GC Pause |
| Datacenter storage reads collapse under parallel shard responses | TCP Incast |
| No packet loss but latency is in the seconds | Bufferbloat |
| Queue/topic lag grows unbounded | Slow Consumer |
| Pipeline crashes because producer outpaces consumer | Backpressure Failure |
| Event ordering inconsistent across nodes | Clock Skew / Drift |

---

### By Fix → Problems Solved

| Fix | Problems it addresses |
|---|---|
| Exponential backoff + jitter | Thundering Herd, Retry Storm, Livelock |
| Circuit breaker (closed/open/half-open) | Cascading Failure, Metastability |
| Bulkhead (isolated thread pools per dependency) | Cascading Failure, Noisy Neighbor |
| Quorum consensus (Raft/Paxos) | Split-Brain, Network Partition |
| Fencing tokens (monotonic epoch IDs) | Split-Brain, Lease/Dual-Leader |
| Resource quotas + cgroups limits | Noisy Neighbor, Resource Exhaustion |
| Shuffle sharding | Noisy Neighbor |
| READ COMMITTED isolation | Dirty Read |
| REPEATABLE READ isolation | Dirty Read, Non-Repeatable Read |
| SERIALIZABLE isolation | Dirty Read, Non-Repeatable Read, Phantom Read |
| Optimistic locking (version numbers) | Deadlock |
| Lock ordering (global acquisition order) | Deadlock |
| Randomized backoff after rollback | Livelock |
| Aging (increase priority of waiting work) | Starvation |
| NTP + logical/vector clocks | Clock Skew |
| Backpressure signals | Slow Consumer, Backpressure Failure |
| Bloom filters | Read Amplification |
| Minimize indexes | Write Amplification |
| Hash-based sharding / consistent hashing | Hot Partition |
| JOIN / batch fetch / eager loading | N+1 Query |
| Mutex or probabilistic refresh | Cache Stampede |
| Cache pre-warming + traffic ramp | Cache Cold Start |
| ZGC / Shenandoah GC | Stop-The-World Pause, Jitter |
| Hedged requests | Tail Latency |
| CoDel / AQM | Bufferbloat |
| DCTCP / ECN | TCP Incast |
| Load shedding (token bucket at entry) | Metastability |

---

### Database Isolation Level Cheat Sheet

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|---|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible | Fastest |
| READ COMMITTED | Prevented | Possible | Possible | Fast |
| REPEATABLE READ | Prevented | Prevented | Possible | Medium |
| SERIALIZABLE | Prevented | Prevented | Prevented | Slowest |

> **Default**: Most databases default to READ COMMITTED (PostgreSQL, Oracle) or REPEATABLE READ (MySQL InnoDB).

---

### Circuit Breaker State Machine

```
             failures > threshold
CLOSED ────────────────────────────→ OPEN
  ↑                                    │
  │   success                          │ cooldown timer expires
  │                                    ↓
  └──────────────────────── HALF-OPEN ←┘
         (probe one request)
         failure → back to OPEN
```

- **CLOSED**: Normal operation. Requests pass through. Track failure rate.
- **OPEN**: Fail fast. Don't call the dependency at all. Return error immediately.
- **HALF-OPEN**: Send one test request. If success → CLOSED. If failure → OPEN.

---

## Related Topics
- **See also**: `03-reliability-fault-tolerance.md` — circuit breakers, bulkheads, resilience patterns in depth
- **See also**: `06-cap-theorem-consistency.md` — consistency models, partition handling, CAP trade-offs
- **See also**: `02-scalability-patterns.md` — hot shard mitigation, sharding strategies
- **See also**: `05-performance-latency.md` — tail latency, P99 metrics, latency budgets
- **See also**: `07-rate-limiting-api-design.md` — retry storm prevention, token bucket, load shedding
