# System Design Interview Cheat Sheet

> **Quick Reference**: Use this during your final review before interviews. Contains key numbers, patterns, and frameworks you need at your fingertips.

---

## The Interview Framework (5 Steps)

```
┌────────────────────────────────────────────────────────────┐
│  1. REQUIREMENTS (5 min)                                   │
│     • Functional: What must it do? (3-5 features)         │
│     • Non-functional: Scale, latency, consistency         │
├────────────────────────────────────────────────────────────┤
│  2. ESTIMATION (3 min)                                     │
│     • Traffic: DAU × actions = daily requests             │
│     • Storage: records × size × retention                 │
├────────────────────────────────────────────────────────────┤
│  3. HIGH-LEVEL DESIGN (10 min)                            │
│     • Draw simple first: LB → Servers → DB               │
│     • Add components as needed                            │
├────────────────────────────────────────────────────────────┤
│  4. DEEP DIVE (15-20 min)                                 │
│     • Pick 2-3 critical components                        │
│     • Data model, API, algorithm, scaling                 │
├────────────────────────────────────────────────────────────┤
│  5. WRAP-UP (5 min)                                       │
│     • Bottlenecks and solutions                           │
│     • Monitoring, future improvements                     │
└────────────────────────────────────────────────────────────┘
```

---

## Quick Numbers

### Time Conversions
```
1 day    = 86,400 sec ≈ 10^5 sec
1 month  = 2.6M sec   ≈ 2.5 × 10^6 sec
1 year   = 31.5M sec  ≈ 3 × 10^7 sec
```

### Traffic Conversions
```
1M requests/day   ≈ 12 QPS
10M requests/day  ≈ 120 QPS
100M requests/day ≈ 1,200 QPS
1B requests/day   ≈ 12,000 QPS

Peak = Average × 2-10 (typically ×3)
```

### Storage Conversions
```
1 KB × 1M = 1 GB
1 MB × 1M = 1 TB
1 GB × 1M = 1 PB

ASCII char = 1 byte
UTF-8 char = 1-4 bytes
Integer    = 4 bytes
Long/Timestamp = 8 bytes
UUID       = 16 bytes
```

### Latency Numbers
```
L1 cache:           0.5 ns
L2 cache:           7 ns
RAM:                100 ns
SSD read:           150 μs
HDD seek:           10 ms

Network (datacenter): 0.5 ms
Network (same region): 1-5 ms
Network (cross-region): 50-150 ms

Redis GET:          < 1 ms
Simple DB query:    1-10 ms
Complex DB query:   10-100 ms
```

---

## Component Selection Guide

### When to Use What

| Need | Use | Reason |
|------|-----|--------|
| **Relational data** | PostgreSQL, MySQL | ACID, joins |
| **High write throughput** | Cassandra, ScyllaDB | Write-optimized |
| **Document storage** | MongoDB | Flexible schema |
| **Caching** | Redis, Memcached | Sub-ms reads |
| **Search** | Elasticsearch | Full-text, analytics |
| **Message queue** | Kafka | High throughput, persistence |
| **Task queue** | RabbitMQ, SQS | Job processing |
| **Time-series** | InfluxDB, TimescaleDB | Metrics, logs |
| **Graph data** | Neo4j | Relationships |
| **Blob storage** | S3, GCS | Files, images, videos |
| **CDN** | CloudFront, Akamai | Static content |

### Database Decision Tree

```
Need transactions?
├── Yes → Relational (PostgreSQL)
└── No →
    Need flexible schema?
    ├── Yes → Document (MongoDB)
    └── No →
        Need high write throughput?
        ├── Yes → Wide-column (Cassandra)
        └── No →
            Need fast key-value access?
            ├── Yes → Redis/DynamoDB
            └── No → Relational (PostgreSQL)
```

---

## Scaling Strategies

### Read Scaling
```
1. Caching (Redis)
   - Cache-aside pattern
   - TTL-based expiration

2. Read replicas
   - Route reads to replicas
   - Accept eventual consistency

3. CDN
   - Cache at edge
   - For static content

4. Denormalization
   - Pre-compute joins
   - Store redundant data
```

### Write Scaling
```
1. Sharding
   - Hash-based (user_id % N)
   - Range-based (A-M, N-Z)
   - Directory-based (lookup table)

2. Message queues
   - Buffer writes
   - Async processing

3. Write-back cache
   - Write to cache
   - Async persist to DB
```

### Sharding Strategies

```
Hash-based:  hash(key) % num_shards
  ✓ Even distribution
  ✗ Hard to add shards (rehashing)

Range-based: key ranges to shards
  ✓ Easy range queries
  ✗ Can get hot spots

Consistent hashing: hash ring
  ✓ Minimal redistribution
  ✗ More complex

Directory-based: lookup service
  ✓ Flexible
  ✗ Single point of failure
```

---

## Common Patterns

### Caching Patterns

```
Cache-Aside:
  Read: Check cache → miss → query DB → update cache
  Write: Write to DB → invalidate cache

Write-Through:
  Write: Write to cache → cache writes to DB
  Read: Always from cache

Write-Back:
  Write: Write to cache → async to DB
  Risk: Data loss if cache fails
```

### Communication Patterns

```
Synchronous:
  Request → Response
  Use for: User-facing requests

Asynchronous (Queue):
  Producer → Queue → Consumer
  Use for: Background jobs, decoupling

Pub/Sub:
  Publisher → Topic → Subscribers
  Use for: Event broadcasting

Streaming:
  Continuous data flow
  Use for: Real-time analytics
```

### Consistency Patterns

```
Strong:
  All reads see latest write
  Use for: Financial, inventory

Eventual:
  Reads may be stale, eventually consistent
  Use for: Social feeds, analytics

Read-your-writes:
  User sees their own writes immediately
  Use for: User profiles, posts
```

---

## API Design Quick Reference

### REST Endpoints
```
GET    /resources           List
GET    /resources/{id}      Get one
POST   /resources           Create
PUT    /resources/{id}      Full update
PATCH  /resources/{id}      Partial update
DELETE /resources/{id}      Delete
```

### Pagination
```
Offset: ?limit=20&offset=40
Cursor: ?limit=20&cursor=abc123
```

### Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
Retry-After: 60
```

---

## Reliability Checklist

```
□ No single points of failure
□ Database replication configured
□ Health checks on all services
□ Automatic failover enabled
□ Circuit breakers on external calls
□ Timeouts on all network calls
□ Retries with exponential backoff
□ Graceful degradation implemented
□ Monitoring and alerting set up
□ Runbooks for common failures
```

---

## Trade-off Reference

### CAP Theorem
```
Can only have 2 of 3 during partition:
C = Consistency (all see same data)
A = Availability (always respond)
P = Partition tolerance (handle network splits)

CP: Refuse requests during partition
AP: Serve potentially stale data
```

### ACID vs BASE
```
ACID (Strong):              BASE (Eventual):
Atomicity                   Basically Available
Consistency                 Soft state
Isolation                   Eventual consistency
Durability

Use ACID: Transactions, financial
Use BASE: Scale, availability
```

### Latency vs Consistency
```
Strong consistency = Higher latency
  (must sync with replicas)

Eventual consistency = Lower latency
  (acknowledge immediately)
```

---

## Estimation Templates

### Template 1: Social Feed

```
Given: 100M DAU, 5 reads/day, 0.1 posts/day

Reads:
  100M × 5 = 500M/day
  500M / 86400 = 5,800 QPS
  Peak (×3) = 17,400 QPS

Writes:
  100M × 0.1 = 10M/day
  10M / 86400 = 116 QPS
  Peak (×3) = 348 QPS

Storage (1 year):
  10M posts/day × 365 = 3.65B posts
  Average post = 1KB
  Total = 3.65 TB/year
```

### Template 2: URL Shortener

```
Given: 100M URLs/month, 10:1 read:write

Writes:
  100M / 30 / 86400 = 39 QPS
  Peak (×3) = 117 QPS

Reads:
  39 × 10 = 390 QPS
  Peak (×3) = 1,170 QPS

Storage (5 years):
  100M × 12 × 5 = 6B URLs
  Average URL = 500 bytes
  Total = 3 TB
```

---

## Common Interview Problems

| Problem | Key Concepts |
|---------|--------------|
| **Twitter Feed** | Fan-out on write vs read, timeline |
| **Dropbox** | Chunking, sync, deduplication |
| **WhatsApp** | WebSocket, message delivery, E2E encryption |
| **Rate Limiter** | Token bucket, sliding window, distributed |
| **URL Shortener** | ID generation, Base62, caching |
| **YouTube** | Transcoding, CDN, adaptive bitrate |
| **Uber** | Geospatial index, matching, real-time |
| **Ticketmaster** | Inventory lock, queue, no overselling |
| **Search Autocomplete** | Trie, pre-computation, ranking |
| **Notification System** | Multi-channel, retry, rate limiting |

---

## Last-Minute Reminders

### Do's
```
✓ Clarify requirements first
✓ Do back-of-envelope math
✓ Start simple, then iterate
✓ State trade-offs explicitly
✓ Think out loud
✓ Ask if you're going in right direction
✓ Consider failure modes
```

### Don'ts
```
✗ Don't jump to solution
✗ Don't over-engineer early
✗ Don't ignore non-functionals
✗ Don't forget to do math
✗ Don't stay silent
✗ Don't say "I don't know" (say "Let me think...")
✗ Don't forget monitoring/logging
```

---

## Quick Diagrams

### Basic Architecture
```
[Clients] → [CDN] → [LB] → [Servers] → [Cache] → [DB]
```

### Microservices
```
[Gateway] → [Service A] → [DB A]
         → [Service B] → [DB B]
         → [Service C] → [Cache] → [DB C]
```

### Message Queue
```
[Producers] → [Queue/Kafka] → [Consumers] → [DB]
```

### Event-Driven
```
[Service A] → [Event Bus] → [Service B]
                         → [Service C]
                         → [Analytics]
```

---

**Good luck with your interview!**
