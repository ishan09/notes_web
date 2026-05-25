# Scalability Patterns
 
> **Foundation Principle**: Scalability is about handling growth - more users, more data, more requests. Understanding how to scale systems horizontally and vertically is essential for designing production-ready systems.
 
## Table of Contents
1. [What is Scalability?](#what-is-scalability)
2. [Vertical vs Horizontal Scaling](#vertical-vs-horizontal-scaling)
3. [Load Balancing](#load-balancing)
4. [Database Scaling](#database-scaling)
5. [Caching Strategies](#caching-strategies)
6. [Sharding](#sharding)
7. [Replication](#replication)
8. [Consistent Hashing](#consistent-hashing)
9. [Microservices for Scale](#microservices-for-scale)
10. [Content Delivery Networks (CDN)](#content-delivery-networks-cdn)
11. [Traffic Distribution Reality](#traffic-distribution-reality)
12. [Multi-Tenancy Design](#multi-tenancy-design)
13. [Geo-Distribution](#geo-distribution)
14. [Cost as a Design Constraint](#cost-as-a-design-constraint)
15. [Scalability Checklist](#scalability-checklist)
16. [Common Interview Questions](#common-interview-questions)
 
---
 
## What is Scalability?
 
### Definition
**Scalability** is the ability of a system to handle increased load by adding resources.
 
### Types of Scalability
 
#### 1. Vertical Scalability (Scale Up)
Adding more power to existing server (CPU, RAM, disk).
 
```
Before:  [4 CPU, 8GB RAM]  →  After: [16 CPU, 64GB RAM]
```
 
#### 2. Horizontal Scalability (Scale Out)
Adding more servers to distribute load.
 
```
Before:  [Server 1]  →  After: [Server 1, Server 2, Server 3]
```
 
### Key Metrics
 
**Load Metrics**:
- **Requests Per Second (RPS/QPS)**: How many requests per second?
- **Concurrent Users**: How many users simultaneously?
- **Data Volume**: How much data to store/process?
 
**Performance Metrics**:
- **Latency**: Response time (p50, p95, p99)
- **Throughput**: Requests handled per second
- **Availability**: Uptime percentage (99.9%, 99.99%)
 
**Example Calculation**:
```
Daily Active Users (DAU): 1 Million
Requests per user per day: 100
Total daily requests: 100M
 
Peak traffic (assume 10x average):
Average QPS = 100M / 86400 = ~1200 QPS
Peak QPS = 1200 * 10 = 12,000 QPS
```
 
---
 
## Vertical vs Horizontal Scaling
 
### Vertical Scaling (Scale Up)
 
#### Characteristics
```
┌──────────────────┐
│   Single Server  │
│   More Powerful  │
│  4→8→16→32 CPUs  │
│  8→16→32→64 GB   │
└──────────────────┘
```
 
#### Pros
- ✅ Simple - No code changes
- ✅ No network latency between components
- ✅ Easier to maintain consistency
- ✅ Simpler application architecture
 
#### Cons
- ❌ Expensive (exponential cost increase)
- ❌ Hard limit (can't add infinite resources)
- ❌ Single point of failure
- ❌ Downtime during upgrades
- ❌ Limited by hardware technology
 
#### When to Use
- Small to medium scale (< 100k users)
- Prototyping/MVP phase
- Monolithic applications
- When simplicity is priority
 
---
 
### Horizontal Scaling (Scale Out)
 
#### Characteristics
```
        ┌──────────────┐
        │Load Balancer │
        └──────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│Server1│  │Server2│  │Server3│
└───────┘  └───────┘  └───────┘
```
 
#### Pros
- ✅ No hard limit (add servers as needed)
- ✅ Better fault tolerance (no single point of failure)
- ✅ Cost-effective (use commodity hardware)
- ✅ Rolling upgrades (no downtime)
- ✅ Geographic distribution
 
#### Cons
- ❌ Complex architecture
- ❌ Network latency between servers
- ❌ Harder to maintain consistency
- ❌ Requires load balancing
- ❌ More operational overhead
 
#### When to Use
- Large scale (> 100k users)
- High availability requirements
- Stateless services (web servers, APIs)
- Distributed systems
 
---
 
### Comparison Table
 
| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| Cost | High (exponential) | Lower (linear) |
| Limit | Hardware limit | Near infinite |
| Complexity | Low | High |
| Fault Tolerance | Low (SPOF) | High (redundancy) |
| Consistency | Easy (single machine) | Hard (distributed) |
| Downtime | Required for upgrade | Rolling deployment |
| Best For | Databases, stateful | Web servers, APIs |
 
---
 
## Load Balancing
 
### What is Load Balancing?
Distributing incoming requests across multiple servers.
 
```
                  ┌──────────────┐
     Clients ───► │Load Balancer │
                  └──────┬───────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
          ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
          │Server1│  │Server2│  │Server3│
          └───────┘  └───────┘  └───────┘
```
 
### Load Balancing Algorithms
 
#### 1. Round Robin
Distribute requests sequentially to each server.
 
```
Request 1 → Server 1
Request 2 → Server 2
Request 3 → Server 3
Request 4 → Server 1 (cycle repeats)
```
 
**Pros**: Simple, evenly distributed
**Cons**: Doesn't consider server load
 
#### 2. Weighted Round Robin
Servers with higher weight get more requests.
 
```
Server 1 (weight=3): Gets 60% of requests
Server 2 (weight=2): Gets 40% of requests
```
 
**Use Case**: Servers with different capacities
 
#### 3. Least Connections
Send request to server with fewest active connections.
 
```
Server 1: 10 connections
Server 2: 5 connections  ← Choose this
Server 3: 8 connections
```
 
**Pros**: Better load distribution
**Cons**: More overhead to track connections
 
#### 4. IP Hash
Hash client IP to determine server.
 
```
hash(client_ip) % num_servers = server_index
```
 
**Pros**: Same client always goes to same server (session affinity)
**Cons**: Can cause uneven distribution
 
#### 5. Least Response Time
Send to server with lowest response time.
 
**Pros**: Best performance for clients
**Cons**: Complex to implement
 
### Load Balancer Types
 
#### Layer 4 (Transport Layer)
Routes based on IP and port (TCP/UDP).
- Fast (less processing)
- No content inspection
- Examples: HAProxy, AWS NLB
 
#### Layer 7 (Application Layer)
Routes based on HTTP headers, cookies, URL path.
- Slower (more processing)
- Content-based routing
- Examples: Nginx, AWS ALB
 
### Load Balancer Placement
 
#### 1. Between Client and Web Servers
```
Internet → LB → Web Servers
```
 
#### 2. Between Web Servers and App Servers
```
Web Servers → LB → App Servers
```
 
#### 3. Between App Servers and Databases
```
App Servers → LB → Database Replicas (read)
```
 
---
 
## Database Scaling
 
### Read Scaling
 
#### 1. Read Replicas
```
Application
   │
   ├─ Writes ────────► Master DB
   │
   └─ Reads ─────┬───► Replica 1
                 ├───► Replica 2
                 └───► Replica 3
```
 
**Benefits**:
- Distribute read load
- 90% of apps are read-heavy
 
**Challenges**:
- Replication lag (eventual consistency)
- Stale reads possible
 
**Implementation**:
```python
# Write to master
def create_user(data):
    master_db.insert(data)
 
# Read from replica
def get_user(user_id):
    return replica_db.query(user_id)
 
# Read-after-write: use master
def get_current_user(user_id):
    return master_db.query(user_id)  # Ensure consistency
```
 
#### 2. Caching
Add caching layer to reduce DB load.
```
App → Cache (Redis) → Database
```
See [Caching Strategies](#caching-strategies) section.
 
### Write Scaling
 
#### 1. Vertical Scaling
Upgrade master DB server (first option).
 
#### 2. Sharding
Split data across multiple master databases.
See [Sharding](#sharding) section.
 
#### 3. Multi-Master Replication
Multiple masters accept writes (complex conflict resolution).
 
---
 
## Caching Strategies
 
### Why Cache?
- **Reduce latency**: In-memory is 100x faster than disk
- **Reduce load**: Fewer database queries
- **Cost savings**: Less expensive than scaling database
 
### Where to Cache?
 
```
┌──────────────────────────────────────┐
│ Client Side (Browser Cache)          │ ← 0ms latency
├──────────────────────────────────────┤
│ CDN (Edge Cache)                     │ ← ~50ms
├──────────────────────────────────────┤
│ Application Cache (Redis/Memcached) │ ← ~1ms
├──────────────────────────────────────┤
│ Database Query Cache                 │ ← ~10ms
├──────────────────────────────────────┤
│ Database (Disk)                      │ ← ~100ms
└──────────────────────────────────────┘
```
 
### Caching Patterns
 
#### 1. Cache-Aside (Lazy Loading)
Application manages cache manually.
 
```python
def get_user(user_id):
    # 1. Try cache first
    user = cache.get(f"user:{user_id}")
 
    if user is None:
        # 2. Cache miss: query database
        user = db.query("SELECT * FROM users WHERE id = ?", user_id)
 
        # 3. Store in cache for future requests
        cache.set(f"user:{user_id}", user, ttl=3600)
 
    return user
```
 
**Flow**:
```
Read:  App → Cache → (miss) → DB → Cache → App
Write: App → DB → Invalidate Cache
```
 
**Pros**:
- Only caches what's needed
- Cache failure doesn't break system
 
**Cons**:
- Cache miss penalty (3x latency)
- Possible stale data
 
**Use Case**: Read-heavy applications
 
#### 2. Write-Through
Write to cache and database together.
 
```python
def update_user(user_id, data):
    # 1. Write to database
    db.update(user_id, data)
 
    # 2. Write to cache
    cache.set(f"user:{user_id}", data, ttl=3600)
```
 
**Flow**:
```
Read:  App → Cache → (miss) → DB → Cache → App
Write: App → Cache + DB (synchronous)
```
 
**Pros**:
- Cache always consistent with DB
- No stale data
 
**Cons**:
- Slower writes (wait for both)
- Caches data that may not be read
 
**Use Case**: When consistency is critical
 
#### 3. Write-Back (Write-Behind)
Write to cache first, async write to database.
 
```python
def update_user(user_id, data):
    # 1. Write to cache (fast)
    cache.set(f"user:{user_id}", data)
 
    # 2. Queue for async DB write
    queue.enqueue("db_write", user_id, data)
```
 
**Flow**:
```
Read:  App → Cache → App
Write: App → Cache → (async) → DB
```
 
**Pros**:
- Very fast writes
- Reduces database load
 
**Cons**:
- Risk of data loss (if cache fails before DB write)
- Complex to implement
 
**Use Case**: High write throughput needed (analytics, logging)
 
#### 4. Refresh-Ahead
Proactively refresh cache before expiration.
 
```python
def get_user(user_id):
    user = cache.get(f"user:{user_id}")
 
    # If TTL < threshold, refresh in background
    if cache.ttl(f"user:{user_id}") < 300:  # 5 minutes
        background_task.refresh_cache(user_id)
 
    return user
```
 
**Pros**:
- No cache miss penalty for popular items
 
**Cons**:
- Can refresh unused data
- Complex to implement
 
**Use Case**: Predictable access patterns (home page data)
 
### Cache Invalidation Strategies
 
#### 1. TTL (Time-To-Live)
Data expires after fixed duration.
 
```python
cache.set("user:123", data, ttl=3600)  # 1 hour
```
 
**Pros**: Simple, prevents stale data
**Cons**: May cache frequently changing data too long
 
#### 2. Event-Based Invalidation
Invalidate when data changes.
 
```python
def update_user(user_id, data):
    db.update(user_id, data)
    cache.delete(f"user:{user_id}")  # Invalidate cache
```
 
**Pros**: Always fresh data
**Cons**: Complexity increases
 
#### 3. Write-Through Invalidation
Update cache on write (no invalidation needed).
 
### Cache Eviction Policies
 
When cache is full, which item to remove?
 
- **LRU (Least Recently Used)**: Remove oldest accessed item (most common)
- **LFU (Least Frequently Used)**: Remove least accessed item
- **FIFO (First-In-First-Out)**: Remove oldest item
- **Random**: Remove random item
 
---
 
## Sharding
 
### What is Sharding?
Splitting data across multiple databases (horizontal partitioning).
 
```
            ┌─────────────┐
            │ Application │
            └──────┬──────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
   │Shard 1│   │Shard 2│   │Shard 3│
   │Users  │   │Users  │   │Users  │
   │1-1M   │   │1M-2M  │   │2M-3M  │
   └───────┘   └───────┘   └───────┘
```
 
### Sharding Strategies
 
#### 1. Range-Based Sharding
Split by ranges of shard key.
 
```
Shard 1: user_id 1 to 1,000,000
Shard 2: user_id 1,000,001 to 2,000,000
Shard 3: user_id 2,000,001 to 3,000,000
```
 
**Pros**:
- Simple to implement
- Range queries easy (SELECT * WHERE id BETWEEN 100 AND 200)
 
**Cons**:
- Uneven distribution (hotspots)
- New users always go to last shard
 
**Use Case**: Time-series data (shard by date)
 
#### 2. Hash-Based Sharding
Use hash function to determine shard.
 
```python
shard_id = hash(user_id) % num_shards
 
# Example:
hash(123) % 3 = 0 → Shard 0
hash(456) % 3 = 2 → Shard 2
hash(789) % 3 = 1 → Shard 1
```
 
**Pros**:
- Even distribution
- No hotspots
 
**Cons**:
- Range queries hard
- Resharding difficult (changing num_shards changes all mappings)
 
**Use Case**: Most common, user data
 
#### 3. Geographic Sharding
Shard by location.
 
```
Shard US: US users
Shard EU: EU users
Shard APAC: APAC users
```
 
**Pros**:
- Reduced latency (data close to users)
- Regulatory compliance (GDPR, data residency)
 
**Cons**:
- Uneven distribution
- Global features complex
 
**Use Case**: Multi-region applications
 
#### 4. Directory-Based Sharding
Lookup table maps entities to shards.
 
```
Shard Lookup Table:
user_id | shard_id
--------|----------
123     | 1
456     | 2
789     | 1
```
 
**Pros**:
- Flexible (can move users between shards)
- Even distribution control
 
**Cons**:
- Lookup table is bottleneck and SPOF
- Extra query per request
 
### Sharding Challenges
 
#### 1. Cross-Shard Queries
Queries spanning multiple shards are expensive.
 
**Problem**:
```sql
-- If users are sharded, this requires querying all shards
SELECT * FROM users WHERE email = 'john@email.com'
```
 
**Solutions**:
- Denormalize data
- Use global secondary index
- Accept performance hit
 
#### 2. Transactions Across Shards
Distributed transactions are complex and slow.
 
**Solution**:
- Design to avoid cross-shard transactions
- Use Saga pattern
- Use eventual consistency
 
#### 3. Resharding
Adding/removing shards requires data migration.
 
**Solution**:
- Use consistent hashing (see next section)
- Plan for resharding from start
- Use directory-based sharding
 
---
 
## Replication
 
### Master-Slave Replication
 
```
           ┌────────┐
           │ Master │ ← Writes
           └───┬────┘
               │ Replication
        ┌──────┼──────┐
        │      │      │
    ┌───▼──┐ ┌▼───┐ ┌▼───┐
    │Slave1│ │Slv2│ │Slv3│ ← Reads
    └──────┘ └────┘ └────┘
```
 
**Characteristics**:
- One master (writes)
- Multiple slaves (reads)
- Asynchronous replication
 
**Pros**:
- Read scaling
- High availability (promote slave if master fails)
 
**Cons**:
- Replication lag
- Write scaling limited
 
### Master-Master Replication
 
```
    ┌────────┐ ⟷ ┌────────┐
    │Master 1│   │Master 2│
    └────────┘   └────────┘
       ↕            ↕
    Reads/Writes Reads/Writes
```
 
**Characteristics**:
- Multiple masters accept writes
- Bidirectional replication
 
**Pros**:
- Write scaling
- High availability
 
**Cons**:
- Conflict resolution complexity
- Eventual consistency
 
---
 
## Consistent Hashing
 
### Problem with Simple Hashing
When servers are added/removed, most keys need remapping.
 
```
Simple Hash: server = hash(key) % num_servers
 
If num_servers changes from 3 to 4:
- hash(key) % 3 → might give server 2
- hash(key) % 4 → might give server 1
Result: Cache miss for most keys!
```
 
### Consistent Hashing Solution
Only K/n keys need remapping (K = keys, n = servers).
 
```
Hash Ring (0 to 2^32-1):
 
         0
         │
    S3 ──┼── S1
         │
         S2
 
Keys are mapped to ring:
key_x → hash(key_x) → Find nearest server clockwise
```
 
**Example**:
```
Servers on ring:
S1 at position 100
S2 at position 200
S3 at position 300
 
Keys:
key_a (hash=50)  → S1 (nearest clockwise)
key_b (hash=150) → S2
key_c (hash=250) → S3
key_d (hash=350) → S1 (wraps around)
 
Add S4 at position 175:
- key_b now goes to S4 (only 1 key remapped!)
- Others unchanged
```
 
### Virtual Nodes
To handle uneven distribution, each physical server gets multiple positions.
 
```
S1: positions [50, 150, 250]
S2: positions [75, 175, 275]
S3: positions [100, 200, 300]
```
 
**Used By**: Amazon DynamoDB, Cassandra, Redis Cluster
 
---
 
## Microservices for Scale
 
### Decomposition for Scalability
 
Instead of scaling entire monolith, scale only bottleneck services.
 
```
Monolith (all together):
┌──────────────────────┐
│ User Service         │
│ Product Service      │
│ Order Service        │ ← Bottleneck: needs more resources
│ Notification Service │
└──────────────────────┘
Scale everything together (expensive)
 
Microservices (separate):
┌────────┐ ┌──────────┐ ┌───────────────────┐ ┌────────────┐
│User Svc│ │Product   │ │Order Svc (x5)     │ │Notification│
│(x1)    │ │Svc (x2)  │ │Scale only this    │ │Svc (x1)    │
└────────┘ └──────────┘ └───────────────────┘ └────────────┘
```
 
See [Microservices Architecture](../microservices/README.md) for details.
 
---
 
## Content Delivery Networks (CDN)
 
### What is CDN?
Distributed network of servers that cache static content close to users.
 
```
     ┌──────┐
     │Origin│
     │Server│
     └───┬──┘
         │
    ┌────┼────┐
    │    │    │
┌───▼┐ ┌─▼──┐ ┌▼───┐
│Edge│ │Edge│ │Edge│
│ US │ │ EU │ │Asia│
└────┘ └────┘ └────┘
  ↑      ↑      ↑
Users  Users  Users
```
 
### How It Works
1. User requests `example.com/image.jpg`
2. CDN checks nearest edge server
3. If cached, return immediately (HIT)
4. If not cached, fetch from origin, cache, return (MISS)
5. Future requests get cached version
 
### Benefits
- **Reduced latency**: Content closer to users
- **Reduced bandwidth**: Origin serves fewer requests
- **DDoS protection**: Distributed traffic
- **High availability**: Multiple edge locations
 
### What to Cache
- ✅ Static assets (images, CSS, JS)
- ✅ Videos and media
- ✅ API responses (with short TTL)
- ❌ User-specific data
- ❌ Frequently changing data
 
**Examples**: Cloudflare, CloudFront (AWS), Akamai, Fastly
 
---
 
## Scalability Checklist
 
### Before Scaling
- [ ] Profile application to find bottlenecks
- [ ] Add logging and monitoring
- [ ] Optimize database queries
- [ ] Add indexes where needed
- [ ] Implement caching
- [ ] Use connection pooling
 
### Application Tier Scaling
- [ ] Make application stateless
- [ ] Externalize session storage (Redis)
- [ ] Add load balancer
- [ ] Implement health checks
- [ ] Use horizontal pod autoscaling
 
### Database Tier Scaling
- [ ] Add database connection pooling
- [ ] Implement query caching
- [ ] Add read replicas for reads
- [ ] Consider sharding for writes
- [ ] Use appropriate indexes
 
### Caching Strategy
- [ ] Identify cacheable data
- [ ] Choose caching pattern (cache-aside, write-through, etc.)
- [ ] Set appropriate TTLs
- [ ] Implement cache invalidation
- [ ] Monitor cache hit rates
 
### Static Content
- [ ] Use CDN for static assets
- [ ] Enable browser caching
- [ ] Compress images and assets
- [ ] Use lazy loading
 
---
 
## Common Interview Questions
 
### Q1: How would you scale from 1K to 1M users?
 
**Answer**:
```
Stage 1 (1K - 10K users):
- Single server (web + DB)
- Vertical scaling as needed
 
Stage 2 (10K - 100K users):
- Separate web and database servers
- Add load balancer
- Add caching layer (Redis)
- Use CDN for static content
 
Stage 3 (100K - 500K users):
- Multiple web servers (horizontal scaling)
- Database read replicas
- Optimize slow queries
- Add monitoring and alerting
 
Stage 4 (500K - 1M users):
- More web servers (auto-scaling)
- Database sharding if write-heavy
- Microservices for independent scaling
- Multiple data centers for redundancy
```
 
### Q2: When would you use caching vs read replicas?
 
**Answer**:
```
Use Caching when:
- Data doesn't change frequently
- Same data read repeatedly
- Need sub-millisecond latency
- Can tolerate eventual consistency
Example: User profiles, product info
 
Use Read Replicas when:
- Data changes frequently
- Need strong consistency
- Complex queries needed
- Cache hit rate would be low
Example: Real-time inventory, order status
```
 
### Q3: How do you handle hot keys in a distributed cache?
 
**Answer**:
```
Hot Key: A key accessed far more than others (celebrity user, trending post)
 
Problems:
- Single cache server overwhelmed
- Uneven load distribution
- Potential cache server failure
 
Solutions:
1. Client-side caching:
   - Cache hot keys in application memory
   - Reduces load on cache cluster
 
2. Replication:
   - Replicate hot keys across multiple cache servers
   - Load balance reads across replicas
 
3. Local cache:
   - Add L1 cache (in-memory) before L2 (Redis)
   - Hot keys served from L1
 
4. Request coalescing:
   - Batch multiple requests for same key
   - Single request to cache, fan out results
```
 
### Q4: Explain different types of database replication lag.
 
**Answer**:
```
1. Replication Lag:
   - Time for data to propagate from master to replica
   - Usually milliseconds to seconds
   - Can be minutes under heavy load
 
2. Read-After-Write Consistency:
   Problem: User writes data, reads from replica, data not there yet
   Solution: Read from master after write, replica for other reads
 
3. Monotonic Reads:
   Problem: User reads v2, refreshes, sees v1 (read different replicas)
   Solution: Sticky sessions (same user → same replica)
 
4. Consistent Prefix Reads:
   Problem: See effects before causes (out-of-order replication)
   Solution: Use timestamps or vector clocks
```
 
### Q5: How would you design URL shortener sharding strategy?
 
**Answer**:
```
Requirements:
- Billions of URLs
- Read-heavy (100:1 read/write)
 
Sharding Strategy:
1. Shard Key: Hash of short URL
   shard_id = hash(short_url) % num_shards
 
Why:
- Even distribution (hash function)
- Reads go to single shard (no scatter-gather)
- Short URL known for reads (primary access pattern)
 
Implementation:
- 64 shards initially (power of 2 for easy doubling)
- Consistent hashing for easy resharding
- Each shard: 1 master + 2 replicas
 
Alternative: Range-based by creation time
- Pro: Easy to archive old data
- Con: Write hotspot on latest shard
```
 
---

## Traffic Distribution Reality

> **The assumption that breaks most designs**: "Load will distribute evenly across my URLs / users / keys." It never does.

### Power Law Distribution

In virtually every real-world system, a small fraction of items receives a disproportionately large fraction of requests. This is the **power law** (also called Pareto or Zipf distribution).

```
Uniform distribution (what engineers assume):
URL A: ████ (10%)
URL B: ████ (10%)
URL C: ████ (10%)
URL D: ████ (10%)
...each URL gets roughly equal traffic

Power-law distribution (what actually happens):
URL A (viral): ████████████████████████████ (55%)
URL B (popular): ████████████ (20%)
URL C: ██████ (10%)
URL D: ███ (6%)
URL E: ██ (4%)
URL F-Z (long tail): █ (5% combined)
```

The top 1% of content drives 50–80% of traffic. This is not an edge case — it is the normal operating mode of every large internet system.

**Named variants:**
| Name | Context | Rule of thumb |
|---|---|---|
| **Pareto (80/20)** | General | 20% of items → 80% of traffic/revenue |
| **Zipf's Law** | Web/text | The 2nd most popular item gets ½ the traffic of #1, the 3rd gets ⅓, etc. |
| **Long tail** | E-commerce, media | Millions of rarely-accessed items, each with tiny traffic — but combined they matter |

---

### Why It Matters for System Design

Every design decision changes when you account for power law:

#### 1. Caching: Hit Rate is Not Uniform

```
Naive thinking:
"We have 1M URLs, cache 10K = 1% cache ratio, probably bad"

Reality (power law):
Top 10K URLs = 70% of all traffic
Cache 10K URLs → 70% cache hit rate

You don't need to cache everything.
You need to cache the RIGHT things.
```

A 1% cache of your dataset covering 70% of traffic is better than a 100% cache with no eviction policy.

#### 2. Hot Keys: Horizontal Scaling Doesn't Help

When all traffic targets one key, adding more nodes doesn't distribute that key's load:

```
3-node Redis cluster, 100K rps for key "url:viral":

hash("url:viral") % 3 = Node 2

Node 1:  ░░           (other keys, normal load)
Node 2:  ████████████ (url:viral — ALL 100K rps)
Node 3:  ░░           (other keys, normal load)

Add 3 more nodes → still all 100K rps land on one node.
```

The key is pinned to one node by the hash function. **This is the Hot Key Problem** — covered in detail in `11-failure-modes-and-problem-patterns.md`.

#### 3. Database Sharding: Beware Popularity Skew

If you shard by user_id and a celebrity joins, their shard gets crushed:

```
Shard A (user_id 1–1M):    ████████████████ ← celebrity with low ID
Shard B (user_id 1M–2M):   ████
Shard C (user_id 2M–3M):   ███
```

Fix: hash-based sharding + detect and split hot shards proactively.

#### 4. CDN Efficiency: Power Law Makes CDN Extremely Cost-Effective

Because top content is requested so frequently, CDN edge caches achieve very high hit rates even with small cache sizes:

```
Netflix: Top 10% of titles = 95% of streams
→ CDN caches top 10%, serves 95% of traffic from edge
→ Origin (expensive) only serves 5% of requests
```

---

### Layered Defense: Handling Traffic Spikes with Power-Law Awareness

When a single item receives massive traffic (viral URL, trending tweet, celebrity post), defend with layers — each reducing the load reaching the next:

```
100,000 rps (all for one viral URL)
        │
        ▼
┌──────────────────────────────────────────────┐
│  Layer 1: CDN / Edge Cache                   │
│  • Geographically distributed PoPs           │
│  • Each PoP absorbs its own regional traffic │
│  • TTL: 5–30 seconds (short, stale is OK)    │
│  • Effect: ~80% reduction → 20K rps pass     │
└──────────────────┬───────────────────────────┘
                   │ 20,000 rps
                   ▼
┌──────────────────────────────────────────────┐
│  Layer 2: Local In-Process Cache             │
│  • Each app server caches the value in RAM   │
│  • No network call, no coordination          │
│  • 20 servers × independent cache            │
│  • Effect: ~90% reduction → 2K rps pass      │
└──────────────────┬───────────────────────────┘
                   │ 2,000 rps
                   ▼
┌──────────────────────────────────────────────┐
│  Layer 3: Shared Cache (Redis)               │
│  • Now the load is manageable                │
│  • Single hot key isn't a problem at 2K rps  │
│  • Effect: ~95% reduction → 100 rps pass     │
└──────────────────┬───────────────────────────┘
                   │ 100 rps
                   ▼
┌──────────────────────────────────────────────┐
│  Layer 4: Database                           │
│  • Protected; barely touched for hot key     │
└──────────────────────────────────────────────┘
```

**Key insight**: The CDN and local cache eliminate the hot-key problem *before it reaches Redis*. Horizontal scaling of Redis would not have helped at all.

---

### The Stale Data Trade-Off

A common mistake: refusing to serve stale data for fear of incorrectness.

```
Freshness vs Availability trade-off for redirects:

5-second stale redirect URL:
  ✓ Available always
  ✓ Fast (from cache)
  ✗ URL might have changed 3 seconds ago (extremely rare, and fixable)

Always-fresh redirect URL (no cache):
  ✗ 100K rps hits database directly
  ✗ Database falls over
  ✗ Service is down
  ✗ User gets error — not even a stale redirect
```

For most use cases, **a slightly stale response is infinitely better than no response**. This is the core of the availability side of CAP theorem applied to real traffic patterns.

Rule of thumb for TTL selection:
| Content Type | Acceptable Staleness | TTL |
|---|---|---|
| URL redirect | 5–30 seconds | 10s |
| User profile | 1–5 minutes | 2m |
| Product details | 5–15 minutes | 10m |
| Static assets (JS/CSS) | Days–weeks | 7d + cache-busting |
| Real-time stock price | 0 seconds | No cache |

---

### Interview Application

When asked any system design question, as a reflex:
1. Ask: "What does the traffic distribution look like — is there a hot subset?"
2. If yes: design for the hot case explicitly (layered cache, CDN first)
3. State your TTL and justify the stale data trade-off
4. Don't reach for consistent hashing or more nodes when a local cache solves it

---

## Multi-Tenancy Design

<!-- TAG: multi-tenancy, tenant-isolation, silo-model, pool-model, noisy-neighbor, quota -->

> **What it is**: A multi-tenant system serves multiple customers (tenants) from a shared infrastructure. The core tension: shared resources reduce cost, but isolation prevents one tenant from affecting others. Every multi-tenant design is a point on the spectrum between full isolation and full sharing.

### Isolation Models

Three models, ordered from strongest isolation to highest sharing:

**Silo Model** — dedicated infrastructure per tenant

```
Tenant A: [App A] → [DB A] → [Cache A]
Tenant B: [App B] → [DB B] → [Cache B]
Tenant C: [App C] → [DB C] → [Cache C]
```

- Strongest isolation: one tenant's load, bugs, or data never touch another's
- Easiest compliance: data for Tenant A is physically separate (GDPR, HIPAA)
- Highest cost: resources can't be shared, idle capacity multiplied by N tenants
- Operational overhead: N databases to manage, migrate, back up
- **Use when**: enterprise contracts, regulatory requirements, tenants with very different scale or SLAs (e.g., Salesforce's largest customers)

---

**Pool Model** — shared infrastructure, logical separation

```
All tenants → [Shared App] → [Shared DB]
                               └── tenant_id column on every table
                               └── Row-level security / WHERE tenant_id = ?
```

- Lowest cost: full resource sharing, idle capacity is pooled
- Highest noisy-neighbour risk: one tenant's heavy query slows all others
- Easiest to operate: one DB to migrate, one app to deploy
- Compliance harder: data commingled — must rely on application-layer separation
- **Use when**: SMB SaaS, early-stage products, tenants with similar workloads (e.g., Slack workspaces)

---

**Bridge Model** — shared app, isolated DB per tenant

```
All tenants → [Shared App]
                  ├── Tenant A connection → [DB A]
                  ├── Tenant B connection → [DB B]
                  └── Tenant C connection → [DB C]
```

- Middle ground: app is shared (cheap to operate), data is isolated (compliance-friendly)
- Connection pool complexity: N tenants × connection pool per tenant = many connections
- Schema migrations must run against N databases
- **Use when**: product needs data isolation but can share compute — common in SaaS serving regulated industries (e.g., per-customer database in Shopify)

---

**Comparison**:

| | Silo | Bridge | Pool |
|---|---|---|---|
| Isolation | Strongest | Strong | Weakest |
| Cost | Highest | Medium | Lowest |
| Noisy neighbour | None | None (data) | High risk |
| Compliance | Easiest | Easy | Hardest |
| Operational complexity | High (N everything) | Medium | Low |
| Onboarding new tenant | Provision infra | Create DB | Insert rows |

---

### Per-Tenant Rate Limiting & Quotas

Without tenant-level controls, a single high-traffic tenant can consume all shared resources — the noisy neighbour problem at the application layer.

**Two-level rate limiting**:
```
Level 1: Global limit  — protect the system
  All tenants combined: max 100K rps

Level 2: Per-tenant limit — prevent one tenant from consuming all
  Free tier:       100 rps per tenant
  Pro tier:       1,000 rps per tenant
  Enterprise:    10,000 rps per tenant
```

**Implementation** (Redis sliding window per tenant):
```
key = "ratelimit:{tenant_id}:{window_start}"
INCR key
EXPIRE key 60
if value > tenant.limit: return HTTP 429
```

**Quota vs rate limit**:
- **Rate limit**: requests per second — protects real-time throughput
- **Quota**: total requests per month — billing and fair-use enforcement

```
Quota example:
  Free tier:    10,000 API calls/month
  Pro tier:   1,000,000 API calls/month

Track: monthly_usage:{tenant_id}:{YYYY-MM} → INCR on each call
Alert tenant at 80% quota, block at 100%
```

**When a tenant hits their limit**:
- Return `HTTP 429 Too Many Requests` with `Retry-After` and `X-RateLimit-*` headers
- Log the event (billing signal, upgrade trigger)
- Never silently drop — tenant must know they're being limited

---

## Geo-Distribution

<!-- TAG: geo-distribution, multi-region, active-active, latency-routing, data-residency, gdpr, conflict-resolution -->

> **Distinction from HA**: Multi-region in reliability (`03-reliability-fault-tolerance.md`) is about surviving a region failure. Geo-distribution here is about *proactively* serving global users with low latency — even when nothing is broken. The constraint is physics: a request from Tokyo to a US-east server has ~150ms of unavoidable round-trip latency. You eliminate it by putting compute and data closer to the user.

### Active-Active vs Active-Passive (Global)

**Active-Passive** (one region serves traffic, others are standby):
```
Users (all regions) ──────────────────► US-East (primary, serves all)
                                              │
                                         EU-West (replica, standby)
                                         AP-SE   (replica, standby)

Latency: Tokyo user → US-East → ~150ms round trip
Failover: if US-East fails, promote EU-West (minutes of downtime)
```
- Simple writes (single primary, no conflict)
- Poor latency for non-US users (physics is the bottleneck)
- Good for: systems where all users are in one region, or latency isn't critical

**Active-Active** (every region accepts reads and writes):
```
US user  ──► US-East region (read + write)
EU user  ──► EU-West region (read + write)
AP user  ──► AP-SE   region (read + write)

All regions replicate to each other asynchronously
```
- Low latency globally (user writes to nearest region)
- Conflict risk: same record written in two regions simultaneously
- Complex: requires conflict resolution strategy
- Good for: global consumer apps (social, e-commerce, gaming)

---

### Latency-Based Routing

Getting the user to the nearest healthy region:

**DNS-based routing (AWS Route53 Latency Routing)**:
```
User in Tokyo queries api.example.com
→ Route53 measures latency from Tokyo to each region
→ Returns IP of AP-Southeast (lowest latency)
→ User connects to nearest region
```
- Routing decision is made at DNS resolution time
- TTL on DNS records controls how quickly routing updates propagate

**Anycast (CDN / network level)**:
```
All regions advertise the same IP address (e.g., 1.1.1.1)
BGP routing automatically directs the user to the topologically nearest node
→ No DNS tricks — the network itself routes to the nearest PoP
```
Used by: Cloudflare, Google's public DNS, AWS Global Accelerator.

**Health-aware routing**: Route only to healthy regions. If AP-SE is degraded, Route53 health checks detect it and stop routing there — US-East or EU-West absorbs the traffic.

---

### Data Residency & Compliance

**GDPR (EU)**: Personal data of EU residents must not leave the EU without adequate protection. Practically: you cannot store EU user data in a US-only database.

**Design impact**:
```
Without data residency requirement:
  Single global DB (e.g., US-East) ← all users' data

With GDPR:
  EU users   → EU-West DB   (data never leaves EU)
  US users   → US-East DB
  AP users   → AP-SE DB     (may have local laws too — PDPA, PIPL)

Shared app layer reads/writes to the correct regional DB based on user's home region
```

**The "travelling user" problem**: EU user travels to Tokyo. Their data is in EU-West. Do you:
1. Route their request back to EU-West (adds latency — but correct for compliance)
2. Cache non-personal data in AP-SE, keep personal data in EU-West only

Answer depends on data classification: personal data must stay in home region; non-personal data (public content, product catalogue) can be cached anywhere.

**Data classification layers**:
```
Personal (PII):   name, email, address → must respect residency rules
Sensitive:        payment methods, health data → stricter rules
Non-personal:     product listings, public posts → no residency restrictions
Derived/aggregate: analytics, totals → usually non-personal, freely replicable
```

---

### Conflict Resolution

When two regions both accept writes to the same record concurrently, they will diverge. How you reconcile is a fundamental design decision:

**Last-Write-Wins (LWW)**:
```
US-East writes: user.name = "Alice"  at t=100
EU-West writes: user.name = "Alicia" at t=101

LWW: EU-West wins (higher timestamp) → name = "Alicia"
```
- Simple to implement
- Loses data silently — the US-East write is discarded
- Clock skew can cause the wrong write to win
- Acceptable for: user preferences, profile updates (losing one edit is tolerable)

**Operational Transformation / CRDTs** (Conflict-free Replicated Data Types):
```
Both regions increment a counter concurrently:
  US-East: counter += 1  (from 10 → 11)
  EU-West: counter += 1  (from 10 → 11)

Without CRDT: after sync, counter = 11 (lost one increment)
With CRDT (G-Counter): each node tracks its own increments
  US-East: {US: 1, EU: 0} → total = 1
  EU-West: {US: 0, EU: 1} → total = 1
  Merged:  {US: 1, EU: 1} → total = 2  ✓
```
CRDTs work for: counters, sets (add-only), shopping carts, collaborative text (operational transforms). Not suitable for all data types.

**Application-level merge**:
```
Shopping cart: user adds "Shoes" in US, adds "Hat" in EU simultaneously
  US-East cart: [Shoes]
  EU-West cart: [Hat]
  Merged:       [Shoes, Hat]  ← union of both carts (intentional design)
```
Amazon's Dynamo paper famously used this for shopping carts — merging concurrent adds is always safe; concurrent deletes are discarded (better to show an extra item than lose one).

**Avoid conflicts by design** (the best strategy when possible):
```
Assign users a "home region" — all their writes go to that region
Other regions serve reads from replicated data
Conflicts only occur if the home region is unavailable (rare)
```

---

## Cost as a Design Constraint

<!-- TAG: cost-optimization, egress-cost, storage-tiering, hot-warm-cold, cloud-cost -->

> **Why it matters at senior level**: A system that works but costs 10× what it should is a failure. Senior engineers are expected to reason about the cost implications of architectural choices — not just performance and reliability. "Design for $X/month" is a real constraint in interviews and in production.

### Egress Cost

**Egress** = data leaving a cloud provider's network. It is one of the largest and most surprising costs in cloud architectures.

```
AWS pricing (approximate, varies by region):
  Data IN  (ingress): free
  Data OUT (egress to internet): ~$0.09/GB
  Data between AWS regions:      ~$0.02/GB
  Data within same region:       free (or near-free)
```

**Why CDN saves money** (not just latency):
```
Without CDN:
  1M users × 1MB average response = 1TB/day egress from origin
  1TB × $0.09 = $90/day = $2,700/month in egress alone

With CDN (90% cache hit rate):
  10% of requests reach origin = 100GB/day from origin
  CDN egress to users: ~$0.01/GB (CDN bulk pricing << origin pricing)
  Savings: ~$2,400/month — CDN pays for itself many times over
```

**Inter-region transfer trap**: Active-active multi-region setups replicate data between regions. At high data volumes, replication traffic alone can be significant:
```
10GB/hour replication US-East ↔ EU-West × 2 directions × 24h = 480GB/day
480GB × $0.02/GB = ~$9.60/day = ~$290/month just for replication
→ Factor into the cost model when designing active-active
```

**Design decisions driven by egress cost**:
- Compress responses before sending (gzip/brotli): reduces bytes × price per byte
- Cache aggressively at CDN edge: moves expensive origin egress to cheap CDN egress
- Keep hot data processing in the same region as the client: avoid cross-region calls in the hot path
- Batch small cross-region calls: 1 call with 100 items vs 100 calls with 1 item

---

### Storage Tiering (Hot / Warm / Cold)

Not all data is accessed equally. Storing everything on the most expensive, fastest storage is wasteful. Storage tiers trade access speed for cost:

| Tier | Access pattern | Latency | Cost (AWS S3 approx) | Example |
|---|---|---|---|---|
| **Hot** | Accessed frequently (daily) | Milliseconds | ~$0.023/GB/month | Active user data, recent orders |
| **Warm** | Accessed occasionally (monthly) | Milliseconds | ~$0.0125/GB/month | Orders > 90 days old, audit logs |
| **Cold** | Rarely accessed (yearly) | Minutes | ~$0.004/GB/month | Compliance archives, old backups |
| **Archive** | Almost never (audit/legal hold) | Hours | ~$0.00099/GB/month | 7-year financial records |

```
AWS S3 lifecycle policy (automatic tiering):
  Day 0:    Object created → S3 Standard (hot)
  Day 90:   Auto-transition → S3 Standard-IA (warm)
  Day 365:  Auto-transition → S3 Glacier Instant Retrieval (cold)
  Day 2555: Auto-transition → S3 Glacier Deep Archive (archive)
  Day 3650: Auto-delete (if retention policy allows)
```

**Database equivalent — table partitioning by age**:
```sql
-- PostgreSQL: partition orders by year
CREATE TABLE orders_2024 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Move old partitions to cheaper tablespace (slower disk)
ALTER TABLE orders_2022 SET TABLESPACE slow_disk;

-- Or archive to S3 via foreign data wrapper and drop old partition
```

**What drives the decision**:
```
Ask: "How often is data from 2 years ago accessed?"
  Rarely → archive it, save 20× on storage cost
  Frequently → keep it hot (compliance dashboard, analytics)

Ask: "What's the retrieval latency requirement?"
  Milliseconds → hot/warm only (Glacier takes minutes to hours)
  Hours acceptable → cold/archive (legal hold, disaster recovery)
```

**Compute tiering** (same principle, different resource):
```
Hot compute:  Always-on instances (EC2, GKE nodes) — pay 24/7
Warm compute: Auto-scaling groups — spin up in seconds
Cold compute: Spot/preemptible instances — 60-90% cheaper, can be interrupted
Serverless:   Lambda/Cloud Run — pay per invocation, zero idle cost

Match to workload:
  Steady high-traffic API     → Reserved instances (committed discount)
  Variable traffic            → Auto-scaling on-demand
  Batch jobs (can be delayed) → Spot instances
  Rare event handlers         → Serverless
```

---

### Cost-Aware Design in Interviews

When asked to design a system, adding a cost dimension separates senior-level answers:

```
"For the media storage, I'd use S3 with lifecycle policies:
  recent uploads stay in Standard for fast delivery via CDN,
  content older than 90 days moves to Infrequent Access,
  anything older than a year goes to Glacier.
  Given 1PB of content with a typical age distribution,
  this cuts storage costs by roughly 60% vs storing everything in Standard."

"For the cross-region replication in our active-active setup,
  I'd replicate only the write-ahead log deltas, not full snapshots —
  keeps replication traffic minimal and avoids significant egress charges."
```

---
 
## Key Takeaways
 
1. **Start Simple**: Don't over-engineer. Scale when needed, not preemptively.
2. **Measure First**: Profile to find actual bottlenecks before scaling.
3. **Vertical Before Horizontal**: Easier to scale up before scaling out.
4. **Cache Aggressively**: Most systems are read-heavy, caching helps significantly.
5. **Stateless Applications**: Makes horizontal scaling much easier.
6. **Database is Bottleneck**: Usually the hardest part to scale, plan early.
 
---
 
## Next Steps
 
- **Performance**: [Performance Optimization](./04-performance-optimization.md) - Deep dive into caching
- **Reliability**: [Reliability & Fault Tolerance](./05-reliability-fault-tolerance.md) - Handle failures
- **Practice**: [10 Core Design Problems](./13-core-design-problems.md) - Apply scaling knowledge
 
---
 
**Remember**: Premature optimization is the root of all evil. Scale based on metrics, not assumptions.

