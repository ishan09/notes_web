# Core System Design Terminology

> **Purpose**: A comprehensive glossary of terms every architect must know. Understanding these concepts is fundamental to system design discussions.

## Table of Contents
1. [Scalability Terms](#scalability-terms)
2. [Reliability & Availability](#reliability--availability)
3. [Data & Storage](#data--storage)
4. [Networking & Communication](#networking--communication)
5. [Performance](#performance)
6. [Distributed Systems](#distributed-systems)
7. [Architecture Patterns](#architecture-patterns)
8. [Quick Reference Cards](#quick-reference-cards)

---

## Scalability Terms

### Horizontal Scaling (Scale Out)
Adding more machines to distribute load.

```
Before: [Server A]
After:  [Server A] [Server B] [Server C]
```

**Characteristics**:
- Linear cost increase (more machines = more cost)
- Requires load balancing
- No single point of failure
- Unlimited theoretical scale

### Vertical Scaling (Scale Up)
Adding more resources (CPU, RAM, disk) to existing machine.

```
Before: [4 CPU, 8GB RAM]
After:  [16 CPU, 64GB RAM]
```

**Characteristics**:
- Simpler (no distributed system complexity)
- Has hardware limits
- Single point of failure
- Diminishing returns at high end

### Load Balancing
Distributing incoming requests across multiple servers.

```
                   ┌─────────────┐
                   │   Server 1  │
┌──────────┐       ├─────────────┤
│    LB    │──────▶│   Server 2  │
└──────────┘       ├─────────────┤
                   │   Server 3  │
                   └─────────────┘
```

**Algorithms**:
- **Round Robin**: Rotate through servers
- **Least Connections**: Send to least busy server
- **IP Hash**: Same client always goes to same server
- **Weighted**: Distribute based on server capacity

### Sharding (Horizontal Partitioning)
Splitting data across multiple databases.

```
User IDs 1-1M     → Shard A
User IDs 1M-2M    → Shard B
User IDs 2M-3M    → Shard C
```

**Sharding Strategies**:
- **Range-based**: Split by ID ranges
- **Hash-based**: Hash key to determine shard
- **Geographic**: Split by user location
- **Directory-based**: Lookup table for routing

### Replication
Copying data across multiple nodes.

```
┌─────────────┐
│   Primary   │
│   (Write)   │
└──────┬──────┘
       │ replication
       ▼
┌─────────────┐
│   Replica   │
│   (Read)    │
└─────────────┘
```

**Types**:
- **Synchronous**: Write confirmed after all replicas updated
- **Asynchronous**: Write confirmed immediately, replicas catch up
- **Semi-synchronous**: Confirmed after N replicas updated

### Throughput
Amount of work completed per unit time.

```
Throughput = Requests processed / Time
Example: 10,000 requests per second (10K RPS)
```

### Latency
Time to complete a single operation.

```
Latency = Time from request sent to response received
Example: 50ms average response time
```

**Latency vs Throughput**: You can have high throughput with high latency (batch processing) or low latency with low throughput (real-time but limited capacity).

---

## Reliability & Availability

### Availability
Percentage of time a system is operational.

```
Availability = Uptime / (Uptime + Downtime)
```

**The Nines**:
| Availability | Downtime/Year | Downtime/Month |
|-------------|---------------|----------------|
| 99% (two 9s) | 3.65 days | 7.2 hours |
| 99.9% (three 9s) | 8.76 hours | 43.8 minutes |
| 99.99% (four 9s) | 52.6 minutes | 4.38 minutes |
| 99.999% (five 9s) | 5.26 minutes | 26.3 seconds |

### Reliability
Probability that a system performs correctly over time.

```
Reliability = MTBF / (MTBF + MTTR)

MTBF = Mean Time Between Failures
MTTR = Mean Time To Recovery
```

### Fault Tolerance
Ability to continue operating despite failures.

**Strategies**:
- **Redundancy**: Multiple copies of critical components
- **Failover**: Automatic switch to backup on failure
- **Graceful degradation**: Reduce functionality rather than fail completely

### Single Point of Failure (SPOF)
A component whose failure causes entire system to fail.

```
❌ SPOF:
[Client] → [Single Server] → [Single DB]

✅ No SPOF:
[Client] → [Load Balancer] → [Server Cluster]
                                    ↓
                           [DB with Replicas]
```

### Failover
Process of switching to a backup system on failure.

**Types**:
- **Active-Passive**: Backup on standby, takes over on failure
- **Active-Active**: All nodes serving traffic, load redistributed on failure

### Redundancy
Duplication of critical components for reliability.

```
N+1 Redundancy: One extra component beyond minimum
N+2 Redundancy: Two extra components
2N Redundancy:  Double all components
```

### Circuit Breaker
Pattern to prevent cascading failures.

```
States:
CLOSED → failures → OPEN → timeout → HALF-OPEN
   ↑                                      │
   └──────────── success ─────────────────┘
```

### Disaster Recovery (DR)
Strategies for recovering from catastrophic failures.

**Metrics**:
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss (time)
- **RTO (Recovery Time Objective)**: Maximum acceptable downtime

---

## Data & Storage

### ACID Properties
Guarantees for database transactions.

| Property | Meaning | Example |
|----------|---------|---------|
| **A**tomicity | All or nothing | Transfer succeeds completely or rolls back |
| **C**onsistency | Valid state only | Balance can't go negative |
| **I**solation | Transactions don't interfere | Concurrent reads see consistent data |
| **D**urability | Committed = permanent | Data survives crashes |

### BASE Properties
Alternative to ACID for distributed systems.

| Property | Meaning |
|----------|---------|
| **B**asically **A**vailable | System guarantees availability |
| **S**oft state | State may change over time |
| **E**ventual consistency | System will eventually be consistent |

### Consistency Models

**Strong Consistency**: All nodes see same data at same time.
```
Write to Node A → All reads return new value immediately
```

**Eventual Consistency**: All nodes will eventually converge.
```
Write to Node A → Some reads may return old value temporarily
```

**Read-Your-Writes**: User always sees their own updates.
```
User writes → Same user's reads always see that write
```

### Normalization
Organizing data to reduce redundancy.

```
Normalized (3NF):
Users: (id, name, email)
Orders: (id, user_id, total)  ← References Users

Denormalized:
Orders: (id, user_name, user_email, total)  ← Duplicates user data
```

**Trade-off**: Normalized = less storage, slower reads. Denormalized = more storage, faster reads.

### Indexing
Data structures to speed up queries.

```
Without index: O(n) - scan every row
With index:    O(log n) - binary search

Types:
- B-tree: General purpose, range queries
- Hash: Exact match only, O(1)
- Full-text: Search within text
- Geospatial: Location-based queries
```

### Partitioning
Dividing data into smaller chunks.

**Horizontal Partitioning (Sharding)**: Split rows across tables
**Vertical Partitioning**: Split columns into different tables

### Write-Ahead Log (WAL)
Record changes before applying them.

```
1. Write to WAL (append-only, fast)
2. Acknowledge write to client
3. Apply change to main storage
4. On crash: replay WAL to recover
```

---

## Networking & Communication

### DNS (Domain Name System)
Translates domain names to IP addresses.

```
browser: "api.example.com" → DNS → "93.184.216.34"
```

### CDN (Content Delivery Network)
Distributed servers that cache content closer to users.

```
User in Tokyo → Tokyo CDN edge → Content
                    ↑
         Origin server in US (cache miss only)
```

### API Gateway
Single entry point for all client requests.

```
┌─────────────┐
│ API Gateway │ ← Authentication, rate limiting, routing
└──────┬──────┘
       │
   ┌───┴───┬───────┐
   ▼       ▼       ▼
Service  Service  Service
   A        B        C
```

### REST (Representational State Transfer)
Architectural style for web APIs.

**Principles**:
- Stateless: Each request contains all needed info
- Resource-based: URLs represent resources
- HTTP methods: GET, POST, PUT, DELETE
- Standard status codes

### gRPC
High-performance RPC framework.

```
Characteristics:
- Binary protocol (Protocol Buffers)
- HTTP/2 (multiplexing, streaming)
- Strongly typed contracts
- ~10x faster than REST/JSON
```

### WebSocket
Full-duplex communication over single connection.

```
HTTP: Client ──request──▶ Server
      Client ◀──response── Server

WebSocket: Client ◀─────────▶ Server
           (bidirectional, persistent)
```

### Message Queue
Asynchronous communication between services.

```
Producer → [Queue] → Consumer

Examples: Kafka, RabbitMQ, SQS
Use cases: Decoupling, buffering, async processing
```

### Pub/Sub (Publish-Subscribe)
Pattern where publishers send messages to topics, subscribers receive.

```
Publisher → [Topic] → Subscriber 1
                   → Subscriber 2
                   → Subscriber 3
```

---

## Performance

### Caching
Storing frequently accessed data in fast storage.

```
Request → [Cache Hit?]
              │
         Yes: Return from cache
         No:  Fetch from DB → Store in cache → Return
```

**Caching Strategies**:
- **Cache-aside**: App manages cache
- **Write-through**: Write to cache and DB simultaneously
- **Write-back**: Write to cache, async to DB
- **Read-through**: Cache fetches from DB on miss

### Cache Invalidation
Removing stale data from cache.

**Strategies**:
- **TTL (Time-To-Live)**: Expire after time
- **Event-based**: Invalidate on data change
- **Version-based**: Compare versions

### Hot Spot
When one piece of data receives disproportionate traffic.

```
Problem: Celebrity tweet → millions of reads to one cache key

Solutions:
- Add random suffix to key for distribution
- Replicate hot data
- Rate limiting
```

### Throttling / Rate Limiting
Controlling the rate of requests.

**Algorithms**:
- **Token Bucket**: Tokens refill at fixed rate
- **Leaky Bucket**: Requests drain at fixed rate
- **Fixed Window**: Count requests per time window
- **Sliding Window**: Rolling time window

### Connection Pooling
Reusing database/network connections.

```
Without pooling: Open → Query → Close (repeated)
With pooling:    [Pool of open connections] → Borrow → Query → Return
```

### Lazy Loading
Deferring initialization until needed.

```
// Eager: Load everything upfront
user.profile = fetchProfile()
user.posts = fetchAllPosts()  // Expensive, might not need

// Lazy: Load on demand
user.posts = () => fetchAllPosts()  // Only called when accessed
```

---

## Distributed Systems

### CAP Theorem
In a distributed system, you can only guarantee 2 of 3:

```
        Consistency
           /\
          /  \
         /    \
        /______\
Availability  Partition Tolerance
```

- **C**onsistency: All nodes see same data
- **A**vailability: Every request gets a response
- **P**artition tolerance: System works despite network splits

**Reality**: Network partitions happen, so you're choosing between C and A.

### Consensus
Agreement among distributed nodes.

**Algorithms**:
- **Paxos**: Complex, foundational
- **Raft**: Understandable alternative to Paxos
- **ZAB**: Used by ZooKeeper

### Leader Election
Process of choosing one node to coordinate.

```
Nodes: [A, B, C]
Election: A becomes leader
Leader handles: Writes, coordination
Followers handle: Reads, standby
```

### Quorum
Minimum nodes needed for operation.

```
N = Total nodes
W = Write quorum
R = Read quorum

Strong consistency: W + R > N

Example with 3 nodes:
W=2, R=2: Any 2 must agree → Strong consistency
W=1, R=1: Faster but might read stale data
```

### Vector Clocks
Tracking causality in distributed systems.

```
Event ordering without synchronized clocks:
A: [A:1, B:0, C:0] → Event at A
B: [A:1, B:1, C:0] → Event at B after receiving A's event
```

### Idempotency
Operation that can be applied multiple times with same result.

```
Idempotent: DELETE /user/123 (same result if called twice)
NOT idempotent: POST /user (creates duplicate if called twice)
```

### Distributed Locking
Coordinating access across multiple nodes.

```
Tools: Redis SETNX, ZooKeeper, etcd
Use case: Preventing concurrent modifications
```

---

## Architecture Patterns

### Microservices
Application as collection of small, independent services.

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│  User   │  │  Order  │  │ Payment │
│ Service │  │ Service │  │ Service │
└─────────┘  └─────────┘  └─────────┘
```

### Monolith
Single deployable unit containing all functionality.

```
┌────────────────────────────────┐
│         Application            │
│  ┌──────┬──────┬──────┐       │
│  │ User │Order │Payment│       │
│  └──────┴──────┴──────┘       │
└────────────────────────────────┘
```

### Event-Driven Architecture
Systems communicate through events.

```
Order Placed → [Event Bus] → Inventory Service
                          → Notification Service
                          → Analytics Service
```

### CQRS (Command Query Responsibility Segregation)
Separate read and write models.

```
Writes → [Command Model] → Write DB
Reads  → [Query Model]   → Read DB (optimized for queries)
```

### Event Sourcing
Store state changes as sequence of events.

```
Traditional: User(id=1, balance=100)
Event Sourcing:
  - UserCreated(id=1)
  - MoneyDeposited(id=1, amount=150)
  - MoneyWithdrawn(id=1, amount=50)
  Current state: replay events → balance=100
```

### Saga Pattern
Managing distributed transactions.

```
Order Saga:
1. Create Order → Success
2. Reserve Inventory → Success
3. Process Payment → Failure
4. Compensate: Release Inventory, Cancel Order
```

### Strangler Fig Pattern
Gradually replacing legacy systems.

```
Version 1: [All traffic] → [Legacy]
Version 2: [Traffic] → [Router] → [Legacy + New Service]
Version 3: [All traffic] → [New System]
```

---

## Quick Reference Cards

### Latency Numbers Every Programmer Should Know

```
L1 cache reference:                   0.5 ns
L2 cache reference:                   7 ns
Main memory reference:               100 ns
SSD random read:                     150 μs
HDD seek:                            10 ms
Send packet CA→Netherlands→CA:      150 ms
```

### Storage Sizes

```
1 KB   = 1,000 bytes
1 MB   = 1,000 KB = 1 million bytes
1 GB   = 1,000 MB = 1 billion bytes
1 TB   = 1,000 GB = 1 trillion bytes
1 PB   = 1,000 TB = 1 quadrillion bytes
```

### Time Conversions

```
1 day    = 86,400 seconds ≈ 10^5 seconds
1 month  = 2.6 million seconds ≈ 2.5 × 10^6
1 year   = 31.5 million seconds ≈ 3 × 10^7
```

### Power of Twos

```
2^10 = 1,024 ≈ 1 thousand (KB)
2^20 = 1,048,576 ≈ 1 million (MB)
2^30 = 1,073,741,824 ≈ 1 billion (GB)
2^40 ≈ 1 trillion (TB)
```

### Common System Capacities

| Component | Typical Capacity |
|-----------|-----------------|
| Web server | 1K-10K concurrent connections |
| Redis | 100K+ ops/sec |
| PostgreSQL | 10K-50K queries/sec |
| Kafka | 1M+ messages/sec per broker |
| CDN edge | 100K+ requests/sec |

### Decision Quick Reference

| If you need... | Consider... |
|----------------|------------|
| Fast reads | Cache, read replicas, denormalization |
| Fast writes | Write-back cache, async processing |
| High availability | Redundancy, multiple regions |
| Strong consistency | Single leader, synchronous replication |
| Eventual consistency | Multi-leader, async replication |
| Handle traffic spikes | Message queue, auto-scaling |
| Search | Elasticsearch, dedicated search service |
| Real-time | WebSocket, server-sent events |
