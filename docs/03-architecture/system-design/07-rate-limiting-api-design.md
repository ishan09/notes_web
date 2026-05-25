# Rate Limiting & API Design

> **Purpose**: Protect your systems from abuse and ensure fair resource allocation. Good API design makes systems easier to use, scale, and maintain.

## Table of Contents
1. [Rate Limiting Fundamentals](#rate-limiting-fundamentals)
2. [Rate Limiting Algorithms](#rate-limiting-algorithms)
3. [Distributed Rate Limiting](#distributed-rate-limiting)
4. [API Design Principles](#api-design-principles)
5. [API Gateway Patterns](#api-gateway-patterns)
6. [Common Interview Questions](#common-interview-questions)

---

## Rate Limiting Fundamentals

### Why Rate Limit?

```
Without rate limiting:
┌────────────┐     100K req/s    ┌────────────┐
│  Malicious │ ────────────────► │   Your     │ → CRASH!
│   Client   │                   │   Server   │
└────────────┘                   └────────────┘

With rate limiting:
┌────────────┐     100K req/s    ┌───────────┐     100 req/s    ┌────────────┐
│  Malicious │ ────────────────► │   Rate    │ ───────────────► │   Your     │
│   Client   │                   │  Limiter  │                  │   Server   │
└────────────┘                   └───────────┘                  └────────────┘
                                      │
                                 99.9K rejected
                                 with 429 Too Many Requests
```

### Rate Limiting Goals

| Goal | Description | Example |
|------|-------------|---------|
| **Protection** | Prevent resource exhaustion | DDoS mitigation |
| **Fairness** | Equal access for all users | Multi-tenant APIs |
| **Cost Control** | Limit expensive operations | Cloud API calls |
| **Monetization** | Enforce tier limits | Free vs paid plans |
| **Stability** | Prevent cascade failures | Protect downstream services |

### Rate Limit Dimensions

```
What to limit by:

1. User/API Key
   "User X: 1000 requests/hour"
   Most common for authenticated APIs

2. IP Address
   "IP 1.2.3.4: 100 requests/minute"
   Useful for unauthenticated endpoints

3. Endpoint
   "/api/search: 10 requests/second"
   Protect expensive operations

4. Combination
   "User X on /api/export: 5 requests/hour"
   Fine-grained control

5. Global
   "Entire system: 10K requests/second"
   Protect overall capacity
```

### HTTP Response Patterns

```
Standard headers:

HTTP/1.1 200 OK
X-RateLimit-Limit: 1000        # Max requests allowed
X-RateLimit-Remaining: 999     # Requests left in window
X-RateLimit-Reset: 1640000000  # Unix timestamp when limit resets
Retry-After: 60                # Seconds until retry (on 429)

Rate limited response:

HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 30 seconds.",
  "retry_after": 30
}
```

---

## Rate Limiting Algorithms

### Token Bucket

```
Concept: Bucket holds tokens, refills at constant rate

┌──────────────────────────────────────────┐
│    Token Bucket (capacity: 10)           │
│    ┌─────────────────────────────────┐   │
│    │ ● ● ● ● ● ● ○ ○ ○ ○            │   │
│    │ (6 tokens available)            │   │
│    └─────────────────────────────────┘   │
│                                          │
│    Refill rate: 1 token/second          │
│    Request cost: 1 token                 │
└──────────────────────────────────────────┘

Request arrives:
  - Has token? → Allow, remove token
  - No token? → Reject (429)

Tokens accumulate up to bucket capacity (allows bursts)
```

**Implementation**:
```python
class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = time.time()

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(
            self.capacity,
            self.tokens + elapsed * self.refill_rate
        )
        self.last_refill = now
```

**Characteristics**:
- ✅ Allows bursts up to bucket size
- ✅ Smooth rate limiting
- ✅ Memory efficient (just counter + timestamp)
- ❌ Doesn't guarantee even distribution

### Leaky Bucket

```
Concept: Requests enter bucket, processed at constant rate

┌──────────────────────────────────────────┐
│           Leaky Bucket                   │
│                                          │
│    Incoming requests                     │
│         │ │ │                           │
│         ▼ ▼ ▼                           │
│    ┌───────────────┐                    │
│    │ ● ● ● ● ●     │ ← Queue (bucket)   │
│    │ (5 waiting)   │                    │
│    └───────┬───────┘                    │
│            │ (leak)                      │
│            ▼                             │
│    Process at fixed rate: 1/sec         │
└──────────────────────────────────────────┘

Queue full? → Reject new requests
Queue has space? → Add to queue
```

**Characteristics**:
- ✅ Perfectly smooth output rate
- ✅ Good for systems needing constant processing rate
- ❌ Doesn't handle bursts well
- ❌ Requires queue management

### Fixed Window Counter

```
Concept: Count requests in fixed time windows

Timeline:
0:00        1:00        2:00        3:00
|───────────|───────────|───────────|
   Window 1    Window 2    Window 3
   Count: 100  Count: 0    Count: 50

Limit: 100 requests per window

Simple but has boundary problem:
0:59  1:00
  ↓     ↓
 [99 requests][100 requests]
  └────────────────┘
  199 requests in 1-minute span!
```

**Implementation**:
```python
class FixedWindowCounter:
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window_seconds = window_seconds
        self.counts = {}  # {window_key: count}

    def allow_request(self, key):
        window = int(time.time() // self.window_seconds)
        window_key = f"{key}:{window}"

        count = self.counts.get(window_key, 0)
        if count >= self.limit:
            return False

        self.counts[window_key] = count + 1
        return True
```

**Characteristics**:
- ✅ Simple to implement
- ✅ Memory efficient
- ❌ Boundary problem (2x burst at window edges)

### Sliding Window Log

```
Concept: Keep timestamp of each request, count in sliding window

Requests log for user X:
[10:00:01, 10:00:15, 10:00:30, 10:00:45, 10:01:00]

At 10:01:30, sliding window [10:00:30, 10:01:30]:
Count = 3 (requests at 10:00:30, 10:00:45, 10:01:00)

Limit: 5 per minute → Allow (3 < 5)
```

**Characteristics**:
- ✅ Very accurate
- ✅ No boundary problems
- ❌ Memory intensive (store all timestamps)
- ❌ O(n) to count requests

### Sliding Window Counter (Hybrid)

```
Concept: Combine fixed windows with weighted average

Current window: 40% elapsed
Previous window: 100 requests
Current window: 30 requests

Weighted count = (100 × 60%) + (30 × 40%) = 60 + 12 = 72

Limit: 100 → Allow (72 < 100)

Timeline:
|────────────|────────────|
  Prev: 100    Curr: 30
              ↑ (40% in)
```

**Implementation**:
```python
class SlidingWindowCounter:
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window_seconds = window_seconds
        self.prev_count = 0
        self.curr_count = 0
        self.curr_window_start = 0

    def allow_request(self):
        now = time.time()
        window_start = int(now // self.window_seconds) * self.window_seconds

        if window_start != self.curr_window_start:
            self.prev_count = self.curr_count
            self.curr_count = 0
            self.curr_window_start = window_start

        elapsed = now - window_start
        weight = elapsed / self.window_seconds

        count = self.prev_count * (1 - weight) + self.curr_count

        if count >= self.limit:
            return False

        self.curr_count += 1
        return True
```

**Characteristics**:
- ✅ Memory efficient (just 2 counters)
- ✅ Smooth, no boundary spikes
- ✅ Good approximation of true sliding window

### Algorithm Comparison

| Algorithm | Memory | Accuracy | Burst Handling |
|-----------|--------|----------|----------------|
| Token Bucket | Low | Good | Allows controlled bursts |
| Leaky Bucket | Medium | Excellent | Smooths bursts |
| Fixed Window | Very Low | Poor at edges | 2x burst possible |
| Sliding Log | High | Excellent | Accurate |
| Sliding Counter | Low | Good | Smooth |

---

## Distributed Rate Limiting

### The Challenge

```
Problem: Multiple servers, shared limit

Server A: Allows 50 requests for User X
Server B: Allows 50 requests for User X
Total: 100 requests (limit was 50!)

┌─────────────┐         ┌─────────────┐
│  Server A   │         │  Server B   │
│  Count: 50  │         │  Count: 50  │
└─────────────┘         └─────────────┘
       │                       │
       └───────────────────────┘
              User X: 100 total requests
              (Limit: 50)
```

### Solution 1: Centralized Counter (Redis)

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Server A  │     │  Server B  │     │  Server C  │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
                    ┌────┴────┐
                    │  Redis  │
                    │ Counter │
                    └─────────┘

Atomic operations:
INCR user:X:requests
EXPIRE user:X:requests 60
```

**Redis Lua Script** (atomic):
```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end

if current > limit then
    return 0  -- Rejected
end
return 1  -- Allowed
```

**Trade-offs**:
- ✅ Accurate global counting
- ✅ Simple implementation
- ❌ Redis becomes SPOF
- ❌ Network latency for every request

### Solution 2: Local + Sync

```
Each server has local counter
Periodically sync to get global view

┌─────────────┐         ┌─────────────┐
│  Server A   │         │  Server B   │
│  Local: 20  │◄───────►│  Local: 25  │
└─────────────┘  sync   └─────────────┘

Global estimate: 20 + 25 = 45 (limit: 50)
```

**Trade-offs**:
- ✅ Works without central store
- ✅ Low latency decisions
- ❌ Approximate (sync delay)
- ❌ Can exceed limit during sync window

### Solution 3: Sticky Sessions

```
Route same user to same server

┌───────────────────────────────────────┐
│             Load Balancer             │
│     hash(user_id) % num_servers      │
└──────────────┬────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐
│ Srv A │  │ Srv B │  │ Srv C │
│User 1 │  │User 2 │  │User 3 │
│User 4 │  │User 5 │  │User 6 │
└───────┘  └───────┘  └───────┘

Each server tracks its users locally
```

**Trade-offs**:
- ✅ Accurate per-user limits
- ✅ No coordination needed
- ❌ Uneven load distribution
- ❌ Server failure = lost state

### Solution 4: Token Bucket with Central Reservoir

```
Central Redis holds token reservoir
Servers request tokens in batches

Server A: "Give me 100 tokens"
Redis: "Here's 100" (deducts from reservoir)
Server A: Uses tokens locally until exhausted

Reduces Redis calls significantly
```

---

## API Design Principles

### RESTful Design

```
Resources and HTTP Methods:

GET    /users           List users
POST   /users           Create user
GET    /users/{id}      Get user
PUT    /users/{id}      Update user (full)
PATCH  /users/{id}      Update user (partial)
DELETE /users/{id}      Delete user

Nested resources:
GET    /users/{id}/posts        User's posts
POST   /users/{id}/posts        Create post for user
GET    /users/{id}/posts/{pid}  Specific post
```

### API Versioning

```
Option 1: URL Path (Recommended)
GET /v1/users
GET /v2/users

Option 2: Query Parameter
GET /users?version=1

Option 3: Header
GET /users
Api-Version: 1

Option 4: Accept Header
GET /users
Accept: application/vnd.myapi.v1+json
```

### Pagination

```
Offset pagination:
GET /posts?limit=20&offset=40

Response:
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 1000
  }
}

Cursor pagination (better for large datasets):
GET /posts?limit=20&cursor=eyJpZCI6MTAwfQ

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
  }
}
```

### Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "age",
        "message": "Must be a positive integer"
      }
    ],
    "request_id": "req_abc123",
    "documentation_url": "https://api.example.com/docs/errors#VALIDATION_ERROR"
  }
}
```

### Idempotency

```
Problem: Network retry causes duplicate action

Client → Server: "Create order"
Server: Creates order, response lost
Client → Server: "Create order" (retry)
Server: Creates ANOTHER order!

Solution: Idempotency key

POST /orders
Idempotency-Key: abc-123-xyz
{...}

Server:
1. Check if abc-123-xyz was seen before
2. If yes: Return cached response
3. If no: Process, cache response with key
```

### Filtering, Sorting, Field Selection

```
Filtering:
GET /posts?status=published&author=123
GET /posts?created_after=2024-01-01

Sorting:
GET /posts?sort=created_at&order=desc
GET /posts?sort=-created_at  # Prefix - for desc

Field selection (sparse fieldsets):
GET /posts?fields=id,title,summary
GET /users/123?include=posts,comments
```

---

## API Gateway Patterns

### API Gateway Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
├─────────────────────────────────────────────────────────────┤
│  • Authentication & Authorization                           │
│  • Rate Limiting                                            │
│  • Request/Response Transformation                          │
│  • Load Balancing                                          │
│  • Caching                                                  │
│  • Circuit Breaking                                         │
│  • Logging & Monitoring                                     │
│  • SSL Termination                                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  User    │    │  Order   │    │ Product  │
   │ Service  │    │ Service  │    │ Service  │
   └──────────┘    └──────────┘    └──────────┘
```

### Gateway Patterns

**Backend for Frontend (BFF)**:
```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
├──────────────────┬──────────────────┬───────────────────────┤
│    Web App       │   Mobile App     │   Third-Party         │
└────────┬─────────┴────────┬─────────┴─────────┬─────────────┘
         │                  │                   │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │ Web BFF │        │Mobile   │        │Public   │
    │         │        │  BFF    │        │  API    │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
                     Microservices
```

**Edge Functions**:
```
Execute logic at CDN edge for:
- A/B testing
- Personalization
- Bot detection
- Geolocation routing
```

### Request Aggregation

```
Client needs data from multiple services:

Without aggregation (chatty):
Client → GET /users/123
Client → GET /users/123/orders
Client → GET /users/123/preferences

With aggregation:
Client → GET /users/123/profile

Gateway:
1. Parallel fetch from User, Order, Preference services
2. Combine responses
3. Return unified response
```

---

## Common Interview Questions

### Q1: Design a rate limiter for a distributed system.

**Answer**:
```
Requirements:
- 100 requests/minute per user
- Distributed (multiple servers)
- Low latency
- Accurate (don't allow significant over-limit)

Design:

1. Algorithm: Sliding Window Counter
   - Memory efficient
   - Good accuracy
   - Simple implementation

2. Storage: Redis
   - Fast (sub-ms latency)
   - Atomic operations (INCR, EXPIRE)
   - Cluster mode for HA

3. Key structure:
   ratelimit:{user_id}:{window_minute}

4. Flow:
   Request arrives →
   Calculate window key →
   INCR in Redis →
   Check count vs limit →
   Allow or reject (429)

5. Handling Redis failure:
   Option A: Fail open (allow all)
   Option B: Local rate limiting as fallback
   Option C: Fail closed (reject all)

6. Optimization:
   - Local cache of recent decisions
   - Batch token requests
   - Async logging
```

### Q2: How would you handle rate limit bursts?

**Answer**:
```
Problem: User has 100/min limit, sends 100 at once

Options:

1. Token Bucket with larger bucket
   - Bucket size: 50 (allows burst of 50)
   - Refill rate: 100/minute
   - Allows periodic bursts within limit

2. Burst + sustained limits
   - 100/minute sustained
   - 20/second burst
   - Two separate checks

3. Adaptive rate limiting
   - Normal: 100/minute
   - Under load: 50/minute
   - Scale limits based on system health

4. Queueing
   - Accept burst into queue
   - Process at sustainable rate
   - Return later or webhook when done

Implementation with dual limits:
```python
def check_rate_limit(user_id):
    # Check burst limit (20/sec)
    if not check_limit(user_id, "second", 20):
        return False

    # Check sustained limit (100/min)
    if not check_limit(user_id, "minute", 100):
        return False

    return True
```

### Q3: Design an API for a social media feed.

**Answer**:
```
Endpoints:

# Feed
GET /feed
  ?cursor=xyz          # Pagination
  &limit=20            # Items per page
  &filter=following    # Filter type

# Posts
POST /posts
  {content, media_ids, visibility}

GET /posts/{id}
PUT /posts/{id}
DELETE /posts/{id}

# Interactions
POST /posts/{id}/like
DELETE /posts/{id}/like
POST /posts/{id}/comments
  {content, parent_comment_id}

# Users
GET /users/{id}
GET /users/{id}/posts
POST /users/{id}/follow
DELETE /users/{id}/follow

Design decisions:

1. Pagination: Cursor-based
   - Feed changes frequently
   - Offset would miss/duplicate posts

2. Idempotency:
   - Like is idempotent (multiple calls = 1 like)
   - Use Idempotency-Key for posts

3. Response format:
```json
{
  "data": {
    "id": "post_123",
    "content": "Hello world",
    "author": {
      "id": "user_456",
      "name": "Alice"
    },
    "metrics": {
      "likes": 42,
      "comments": 5,
      "shares": 3
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

4. Rate limits:
   - Read: 300/minute
   - Write: 60/minute
   - By endpoint: /search = 30/minute
```

### Q4: What's the difference between token bucket and leaky bucket?

**Answer**:
```
Token Bucket:
- Tokens accumulate at fixed rate
- Tokens consumed per request
- ALLOWS BURSTS (up to bucket size)
- Output rate: variable

Visualization:
        ┌─────────┐
        │ ● ● ● ● │ ← Tokens accumulate
        │ ● ● ●   │
        └────┬────┘
             │ Request takes token
             ▼
        [Request processed immediately]

Use case: APIs where occasional bursts are OK
Example: User batch uploads, then idle

──────────────────────────────────────────

Leaky Bucket:
- Requests queue up in bucket
- Processed at constant rate (leak)
- SMOOTHS BURSTS
- Output rate: constant

Visualization:
     │││ ← Requests arrive (bursty)
     ▼▼▼
   ┌─────────────┐
   │ ○ ○ ○ ○ ○   │ ← Queue (bucket)
   └──────┬──────┘
          │ Constant leak rate
          ▼
   [Requests processed evenly]

Use case: Downstream systems need constant load
Example: Processing pipeline, database writes

──────────────────────────────────────────

Key difference:
- Token bucket: Controls average rate, allows bursts
- Leaky bucket: Controls both average and instantaneous rate
```

### Q5: How do you handle API versioning without breaking clients?

**Answer**:
```
Strategies:

1. URL versioning (most explicit)
   /v1/users → /v2/users

   Pros: Clear, easy routing
   Cons: URL changes, breaks bookmarks

2. Deprecation process:
   a. Announce deprecation (6 months ahead)
   b. Add Deprecation header
   c. Monitor v1 usage
   d. Provide migration guide
   e. Sunset date warning
   f. Remove after grace period

3. Backward compatible changes (when possible):
   - Add new fields (old clients ignore)
   - New endpoints (old endpoints work)
   - Optional parameters

4. Breaking changes that require new version:
   - Removing fields
   - Changing field types
   - Changing semantics

5. Response headers:
   Deprecation: Sun, 01 Jan 2025 00:00:00 GMT
   Sunset: Sun, 01 Jul 2025 00:00:00 GMT
   Link: <https://api.example.com/docs/migration>; rel="deprecation"

6. Client migration support:
   - Provide SDK updates
   - Compatibility shims
   - Detailed changelogs
   - Code examples
```
