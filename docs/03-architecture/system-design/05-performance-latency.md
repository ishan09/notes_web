# Performance & Latency Optimization

> **Core Truth**: Users perceive performance. A 100ms delay feels instantaneous; 1 second feels slow; 10 seconds means they've left. Every optimization decision trades something for speed.

## Table of Contents
1. [Understanding Performance](#understanding-performance)
2. [Latency Deep Dive](#latency-deep-dive)
3. [Throughput Optimization](#throughput-optimization)
4. [Caching Strategies](#caching-strategies)
5. [Database Optimization](#database-optimization)
6. [Application-Level Optimization](#application-level-optimization)
7. [Profiling & Measurement](#profiling--measurement)
8. [Common Interview Questions](#common-interview-questions)

---

## Understanding Performance

### Key Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                     PERFORMANCE METRICS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LATENCY          Response time for single request          │
│  ────────         p50: 50% of requests faster than this     │
│                   p99: 99% of requests faster than this     │
│                                                             │
│  THROUGHPUT       Requests handled per unit time            │
│  ──────────       RPS (Requests Per Second)                │
│                   QPS (Queries Per Second)                  │
│                                                             │
│  BANDWIDTH        Data transferred per unit time            │
│  ─────────        Mbps, Gbps                               │
│                                                             │
│  UTILIZATION      Resource usage percentage                 │
│  ───────────      CPU, Memory, Disk, Network               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Latency vs Throughput

```
Analogy: Highway Traffic

Latency = Time for one car to travel A → B
Throughput = Cars passing per hour

You can have:
- High latency + High throughput (many slow cars)
- Low latency + Low throughput (one fast car)
- Low latency + High throughput (many fast cars) ← Goal

Increasing throughput often increases latency (congestion)
```

### Percentile Latencies

```
Why p99 matters more than average:

Requests:  [10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 1000ms]

Average:   109ms  (misleading - most requests are fast)
p50:       10ms   (half are faster than this)
p90:       10ms   (90% are faster)
p99:       1000ms (99% are faster - this catches outliers)

For user experience:
- p50: Typical user experience
- p95: Most users' worst experience
- p99: Your slowest users (often most valuable)
- p99.9: Debugging extreme cases
```

### Performance Targets

| Application Type | Target Latency | Notes |
|-----------------|----------------|-------|
| Real-time gaming | < 50ms | Every frame counts |
| Interactive UI | < 100ms | Feels instant |
| Web page load | < 1s | User attention threshold |
| API response | < 200ms | Good user experience |
| Background job | < 30s | Acceptable for async |
| Report generation | < 5min | Batch processing |

---

## Latency Deep Dive

### Where Latency Hides

```
Request lifecycle breakdown:

Client                     Server
  │                          │
  │──── DNS lookup ────────► │  1-50ms
  │                          │
  │──── TCP connect ───────► │  10-30ms (1 RTT)
  │                          │
  │──── TLS handshake ─────► │  20-60ms (1-2 RTT)
  │                          │
  │──── Send request ──────► │  1-10ms (depends on size)
  │                          │
  │     [Server Processing]  │  varies
  │     - Parse request      │  <1ms
  │     - Auth/validation    │  1-10ms
  │     - Business logic     │  1-100ms
  │     - Database query     │  1-100ms
  │     - Serialize response │  1-10ms
  │                          │
  │◄─── Receive response ────│  10-100ms (depends on size)
  │                          │
Total: 50-500ms typical
```

### Latency Numbers Every Developer Should Know

```
Operation                              Latency
─────────────────────────────────────────────────
L1 cache reference                     0.5 ns
L2 cache reference                       7 ns
Main memory reference                  100 ns
SSD random read                        150 μs
HDD seek                                10 ms
─────────────────────────────────────────────────
Network: Same datacenter RTT           500 μs
Network: US East ↔ West                 40 ms
Network: US ↔ Europe                    80 ms
Network: US ↔ Australia                150 ms
─────────────────────────────────────────────────
Redis GET                              0.5-1 ms
Simple DB query                        1-10 ms
Complex DB query                      10-100 ms
External API call                    50-500 ms
```

### Amdahl's Law

```
Speedup = 1 / ((1 - P) + P/S)

Where:
P = Proportion of time spent in optimizable part
S = Speedup factor for that part

Example:
- 80% of time is in database queries
- You make DB 10x faster

Speedup = 1 / ((1 - 0.8) + 0.8/10)
        = 1 / (0.2 + 0.08)
        = 1 / 0.28
        = 3.57x

Lesson: Optimize the bottleneck first
```

### Tail Latency Amplification

```
Problem: When aggregating multiple services, tail latencies compound

Single service p99: 100ms
Aggregating 10 services in parallel:

P(all < 100ms) = 0.99^10 = 90%
P(at least one > 100ms) = 10%

Your p90 becomes 100ms (what was p99)!

Mitigation:
1. Hedged requests: Send to 2 servers, take first response
2. Tied requests: Send to 2, cancel second when first responds
3. Timeouts: Don't wait for slow services
```

---

## Throughput Optimization

### Horizontal Scaling

```
Problem: Single server can handle 1000 RPS, need 10000 RPS

Solution: Add more servers

                    ┌─────────────┐
                    │     LB      │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │Server 1 │       │Server 2 │       │Server 3 │
    │1000 RPS │       │1000 RPS │       │1000 RPS │
    └─────────┘       └─────────┘       └─────────┘
                           │
                     Total: ~3000 RPS
                     (accounting for LB overhead)
```

### Connection Pooling

```
Without pooling:
For each request:
  1. Open connection (10ms)
  2. Query (5ms)
  3. Close connection
  Total: 15ms, 67 RPS per connection

With pooling:
Pool of 10 connections kept open
For each request:
  1. Get connection from pool (<1ms)
  2. Query (5ms)
  3. Return to pool (<1ms)
  Total: ~6ms, 166 RPS per connection

Pool sizing:
connections = (requests_per_second * latency_seconds) + buffer
```

### Async Processing

```
Synchronous:
Request → Process → DB write → Response
Total: 100ms

Asynchronous:
Request → Queue write → Response (10ms)
          ↓
     [Background worker]
          ↓
     DB write (90ms, but user doesn't wait)

Use for:
- Email sending
- Report generation
- Analytics events
- Non-critical updates
```

### Batching

```
Without batching:
INSERT INTO users VALUES (1, 'Alice');  -- 5ms
INSERT INTO users VALUES (2, 'Bob');    -- 5ms
INSERT INTO users VALUES (3, 'Carol');  -- 5ms
Total: 15ms for 3 inserts

With batching:
INSERT INTO users VALUES
  (1, 'Alice'), (2, 'Bob'), (3, 'Carol');  -- 6ms
Total: 6ms for 3 inserts

When to batch:
- Multiple similar operations
- Network latency dominates
- DB can handle bulk operations
```

---

## Caching Strategies

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      Cache Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser Cache         [  ] Fastest, limited size          │
│       │                                                     │
│       ▼                                                     │
│  CDN Cache             [    ] Edge, great for static       │
│       │                                                     │
│       ▼                                                     │
│  API Gateway Cache     [      ] Good for API responses     │
│       │                                                     │
│       ▼                                                     │
│  Application Cache     [        ] Redis/Memcached          │
│       │                                                     │
│       ▼                                                     │
│  Database Cache        [          ] Query cache, buffer    │
│       │                                                     │
│       ▼                                                     │
│  Origin Data           [            ] Disk storage         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Caching Patterns

#### Cache-Aside (Lazy Loading)

```
Read:
1. Check cache
2. Cache miss → Read from DB
3. Store in cache
4. Return data

Write:
1. Write to DB
2. Invalidate cache

def get_user(id):
    user = cache.get(f"user:{id}")
    if user is None:
        user = db.query("SELECT * FROM users WHERE id = ?", id)
        cache.set(f"user:{id}", user, ttl=3600)
    return user
```

**Pros**: Only caches what's needed, handles cache failures gracefully
**Cons**: Cache miss = slow (DB hit), potential stale data

#### Write-Through

```
Write:
1. Write to cache
2. Cache writes to DB (synchronously)
3. Acknowledge to client

def save_user(user):
    cache.set(f"user:{user.id}", user)  # Also persists to DB
    return user
```

**Pros**: Cache always consistent with DB
**Cons**: Higher write latency, cache may hold unused data

#### Write-Back (Write-Behind)

```
Write:
1. Write to cache
2. Acknowledge to client (fast!)
3. Cache writes to DB (asynchronously)

def save_user(user):
    cache.set(f"user:{user.id}", user)  # Queues for DB write
    return user  # Returns immediately
```

**Pros**: Fastest write performance
**Cons**: Risk of data loss if cache crashes before DB write

#### Read-Through

```
Read:
1. Request to cache
2. Cache handles DB fetch on miss
3. Return data

# Cache is configured to auto-fetch from DB on miss
user = cache.get(f"user:{id}")  # Handles miss internally
```

### Cache Invalidation Strategies

```
"There are only two hard things in Computer Science:
 cache invalidation and naming things." - Phil Karlton

Strategies:

1. Time-based (TTL)
   cache.set(key, value, ttl=3600)  # Expire in 1 hour
   Simple, but may serve stale data

2. Event-based
   On user update → delete cache key
   Consistent, but requires tracking dependencies

3. Version-based
   cache.set(f"user:{id}:v{version}", value)
   New version = new key = automatic invalidation

4. Refresh-ahead
   If TTL < 30 seconds remaining, fetch fresh in background
   Users always get fast response
```

### Cache Stampede Prevention

```
Problem: Cache expires → Many requests hit DB simultaneously

                    Cache expires
                         │
    ┌──────────────────┬─┴─┬──────────────────┐
    ▼                  ▼   ▼                  ▼
Request 1          Request 2    ...     Request 1000
    │                  │                      │
    └──────────────────┴──────────────────────┘
                       │
                       ▼
                   [DATABASE]
                   (overwhelmed)

Solutions:

1. Locking
   First request acquires lock, others wait

2. Early expiration
   Refresh before actual expiration

3. Probabilistic early expiration
   Random chance of refresh when TTL is low

4. Warm-up
   Pre-populate cache before peak traffic
```

### What to Cache

```
Good cache candidates:
✅ Expensive to compute
✅ Frequently accessed
✅ Doesn't change often
✅ Same result for same inputs

Poor cache candidates:
❌ Highly personalized
❌ Rapidly changing
❌ Rarely accessed
❌ Security-sensitive

Examples:
✅ User profile (changes infrequently)
✅ Product catalog (read-heavy)
✅ Session data (frequent access)
✅ API responses (expensive to compute)

❌ Real-time stock prices
❌ User's current location
❌ One-time tokens
```

---

## Database Optimization

### Query Optimization

```
EXPLAIN your queries:

EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

Look for:
- Seq Scan (bad for large tables) → Add index
- Nested Loop (can be slow) → Consider different join
- Sort (expensive) → Add index on sort column
- High actual rows vs estimated → Update statistics
```

### Indexing Strategies

```
B-Tree Index (default):
- Good for: =, <, >, BETWEEN, ORDER BY
- Example: CREATE INDEX idx_user_email ON users(email);

Hash Index:
- Good for: = only
- Faster than B-tree for equality
- No range queries

Composite Index:
- Multiple columns
- Order matters! (left-to-right)
- CREATE INDEX idx_user_name ON users(last_name, first_name);
- Works for: WHERE last_name = 'Smith'
- Works for: WHERE last_name = 'Smith' AND first_name = 'John'
- Doesn't help: WHERE first_name = 'John' (wrong order)

Covering Index:
- Includes all columns needed by query
- No table lookup needed
- CREATE INDEX idx_user_cover ON users(email) INCLUDE (name, created_at);
```

### N+1 Query Problem

```
N+1 Problem:
# 1 query to get users
users = User.all()  # SELECT * FROM users

# N queries to get posts (one per user)
for user in users:
    posts = user.posts  # SELECT * FROM posts WHERE user_id = ?

Total: 1 + N queries

Solution: Eager loading
# 2 queries total
users = User.includes(:posts).all()
# SELECT * FROM users
# SELECT * FROM posts WHERE user_id IN (1, 2, 3, ...)
```

### Connection Pooling

```
Pool Configuration:

min_connections: 5       # Always keep this many open
max_connections: 20      # Never exceed this
connection_timeout: 5s   # Wait time for connection
idle_timeout: 300s       # Close idle connections after this

Sizing formula:
max_connections = (cpu_cores * 2) + effective_spindle_count

For SSDs: ~10-20 connections per core is often good
Monitor and adjust based on actual usage
```

### Read Replicas

```
┌─────────────────┐
│    Primary      │ ← All writes
│   (Master)      │
└────────┬────────┘
         │ async replication
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Replica│ │Replica│ ← Reads distributed here
└───────┘ └───────┘

Use when:
- Read-heavy workload (90%+ reads)
- Can tolerate eventual consistency
- Need geographic distribution

Considerations:
- Replication lag (data may be stale)
- Split reads/writes in application
- Failover complexity
```

---

## Application-Level Optimization

### Code-Level Optimizations

```python
# Avoid N+1 in application code
# Bad:
for user_id in user_ids:
    user = get_user(user_id)  # 100 calls

# Good:
users = get_users_batch(user_ids)  # 1 call

# Use generators for large datasets
# Bad:
all_data = [process(item) for item in huge_list]  # Loads all into memory

# Good:
def process_stream(items):
    for item in items:
        yield process(item)  # Processes one at a time

# Avoid repeated computation
# Bad:
for item in items:
    config = load_config()  # Reloads every iteration

# Good:
config = load_config()  # Load once
for item in items:
    process(item, config)
```

### Compression

```
Response compression:

Without:  1MB JSON response → 1MB transferred
With gzip: 1MB JSON → ~100KB transferred (10x smaller!)

Enable in server:
Content-Encoding: gzip

Trade-off:
CPU time for compression vs Network time saved
For most cases, compression wins

Don't compress:
- Already compressed (images, videos)
- Very small responses (<1KB)
- CPU-bound servers
```

### Pagination

```
Offset pagination:
SELECT * FROM posts LIMIT 20 OFFSET 1000;
Problem: DB must scan 1020 rows to return 20

Cursor pagination:
SELECT * FROM posts WHERE id > last_seen_id LIMIT 20;
Better: Uses index, consistent performance

Keyset pagination:
SELECT * FROM posts
WHERE (created_at, id) > ('2024-01-15', 12345)
ORDER BY created_at, id
LIMIT 20;
Best: Handles sorting, still uses index
```

### Lazy Loading

```
Eager loading:
user = {
    "id": 1,
    "name": "Alice",
    "posts": [...100 posts...],      # Always loaded
    "comments": [...1000 comments...] # Always loaded
}

Lazy loading:
user = {
    "id": 1,
    "name": "Alice",
    "posts_url": "/users/1/posts",    # Load when needed
    "comments_url": "/users/1/comments"
}

When to use:
- Large nested data
- Data not always needed
- API responses
```

---

## Profiling & Measurement

### What to Measure

```
Application metrics:
- Request latency (p50, p95, p99)
- Error rate
- Request rate (RPS)
- Active users/connections

Infrastructure metrics:
- CPU utilization
- Memory usage
- Disk I/O
- Network bandwidth

Business metrics:
- Conversion rate
- User engagement
- Revenue per request
```

### Profiling Tools

```
Application Profiling:
- APM tools (New Relic, Datadog, Dynatrace)
- Language-specific (py-spy, async-profiler, pprof)
- Distributed tracing (Jaeger, Zipkin)

Database Profiling:
- EXPLAIN ANALYZE
- Slow query logs
- pg_stat_statements (PostgreSQL)

Network Profiling:
- Wireshark
- tcpdump
- Browser DevTools (Network tab)

Load Testing:
- k6, Gatling, Locust
- Apache JMeter
- wrk, ab
```

### Flame Graphs

```
Reading a flame graph:

        ┌─────────────────────────────────────────┐
        │              main()                      │ 100% of time
        ├────────────────────┬────────────────────┤
        │   process_request()│    do_other()      │ 70% + 30%
        ├────────┬───────────┤                    │
        │ db_call│ serialize │                    │
        │  60%   │   10%     │                    │

Width = time spent
Height = call stack depth
Wide bars at bottom = where to optimize
```

### Setting SLOs

```
SLO (Service Level Objective):

"99% of requests complete in under 200ms"

Components:
- Metric: Request latency
- Target: 200ms
- Percentile: 99th
- Time window: Rolling 30 days

Error budget:
If SLO is 99% availability:
Error budget = 1% of requests can fail
Monthly: 30 days × 1% = 7.2 hours of allowed downtime

When error budget depleted:
- Stop feature releases
- Focus on reliability
```

---

## Common Interview Questions

### Q1: How would you optimize a slow API endpoint?

**Answer Framework**:
```
1. Measure first
   - What's the current latency? (p50, p99)
   - Where is time spent? (profiling)

2. Check the obvious
   - N+1 queries? → Batch/eager load
   - Missing indexes? → Add indexes
   - Large payloads? → Compress, paginate

3. Add caching
   - Cache expensive computations
   - Cache database queries
   - Set appropriate TTLs

4. Async where possible
   - Move non-critical work to background
   - Return early, process later

5. Scale if needed
   - Add read replicas for DB
   - Horizontal scale app servers
   - CDN for static content

6. Optimize code
   - Profile and fix hot paths
   - Reduce allocations
   - Efficient algorithms
```

### Q2: Explain caching strategies and when to use each.

**Answer**:
```
Cache-Aside (Lazy Loading):
- App checks cache, fetches from DB on miss
- Use when: Read-heavy, can tolerate stale data
- Example: User profiles, product catalog

Write-Through:
- Writes go to cache and DB together
- Use when: Need consistency, write volume is manageable
- Example: Session data, shopping cart

Write-Back (Write-Behind):
- Writes to cache, async to DB
- Use when: Write-heavy, can risk some data loss
- Example: Analytics events, logs

Refresh-Ahead:
- Proactively refresh before expiry
- Use when: Critical data, need low latency
- Example: Configuration, frequently accessed data

Key considerations:
- Consistency requirements
- Read vs write ratio
- Acceptable staleness
- Failure handling
```

### Q3: How do you handle hot spots in a distributed cache?

**Answer**:
```
Problem: One key gets disproportionate traffic
Example: Celebrity's profile, viral content

Solutions:

1. Local caching
   Cache hot keys in app memory
   Reduces cache server load

2. Key replication
   Store same data under multiple keys
   user:123:0, user:123:1, user:123:2
   Random suffix distributes load

3. Consistent hashing with virtual nodes
   Better distribution across cache nodes

4. Read-through cache with rate limiting
   Protect origin from thundering herd

5. Dedicated hot key cache
   Separate cache tier for known hot data

Detection:
- Monitor key access patterns
- Alert on skewed distribution
- Use cache analytics
```

### Q4: What's the difference between latency and throughput?

**Answer**:
```
Latency: Time for one operation
- "How long does one request take?"
- Measured in ms
- User-facing metric

Throughput: Operations per time unit
- "How many requests per second?"
- Measured in RPS/QPS
- Capacity metric

Relationship:
- Not inversely proportional
- Can improve one without affecting other
- At high load, latency increases as throughput approaches limit

Example:
Highway analogy:
- Latency = Time for one car A→B
- Throughput = Cars per hour

Database:
- Adding index: Lower latency, same throughput
- Adding replicas: Same latency, higher read throughput
- Bigger instance: Lower latency AND higher throughput
```

### Q5: How would you design a system that needs sub-100ms response times globally?

**Answer**:
```
Challenges:
- Network latency: US→Europe = 80ms
- Can't beat speed of light

Solutions:

1. Edge computing
   Deploy compute at CDN edge
   Process requests close to users

2. Geographic distribution
   Deploy full stack in each region
   Route users to nearest region

3. Aggressive caching
   CDN caching for static content
   Edge caching for API responses
   Browser caching

4. Async where possible
   Optimistic UI updates
   Background sync

5. Data architecture
   Regional data stores
   Async replication between regions
   Accept eventual consistency

6. Pre-computation
   Compute results ahead of time
   Serve pre-computed responses

7. Protocol optimization
   HTTP/3 (QUIC) for faster handshakes
   Connection reuse
   Compression
```
