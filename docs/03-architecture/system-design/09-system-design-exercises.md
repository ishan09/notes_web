# System Design Exercises

> **Practice Makes Perfect**: Work through these 10 classic system design problems. Each includes requirements, a solution framework, and key discussion points for interviews.

## How to Use This Guide

### The 3-Pass Method

```
Pass 1: Study
- Read through the problem and solution
- Understand the patterns and trade-offs
- Take notes on key concepts

Pass 2: Practice
- Set a 45-minute timer
- Design the system yourself (whiteboard/paper)
- Compare with the solution
- Note what you missed

Pass 3: Teach
- Explain the design out loud
- Pretend you're in an interview
- Practice handling follow-up questions
```

---

## Exercise 1: Design Twitter Feed

### Requirements

```
Functional:
- Post tweets (140 chars)
- Follow/unfollow users
- View home feed (tweets from followed users)
- View user profile/timeline

Non-Functional:
- 500M users, 200M DAU
- Average user follows 200 people
- 500M tweets/day
- Feed latency < 200ms
```

### Back-of-Envelope

```
QPS:
- Tweets: 500M/day = 6K/sec, peak 12K/sec
- Feed reads: 200M × 10 views/day = 2B/day = 23K/sec

Storage:
- Tweet: ~500 bytes (text + metadata)
- Daily: 500M × 500B = 250GB/day
- Yearly: ~90TB
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      API Gateway                            │
│                 (Auth, Rate Limiting)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐      ┌─────────┐
   │  Tweet  │      │   Feed   │      │  User   │
   │ Service │      │  Service │      │ Service │
   └────┬────┘      └────┬─────┘      └────┬────┘
        │                │                  │
        ▼                ▼                  ▼
   ┌─────────┐      ┌──────────┐      ┌─────────┐
   │ Tweet   │      │  Feed    │      │  User   │
   │ Store   │      │  Cache   │      │  Store  │
   │(Cassandra)     │ (Redis)  │      │(MySQL)  │
   └─────────┘      └──────────┘      └─────────┘
```

### Deep Dive: Feed Generation

```
Two approaches:

1. Fan-out on Write (Push):
   User posts tweet → Push to all followers' feeds

   ┌─────────┐
   │  Post   │──▶ Fan-out Service ──▶ Write to N follower feeds
   └─────────┘

   Pros: Fast read (feed pre-computed)
   Cons: Slow write for celebrities (millions of followers)
         Wasted work for inactive users

2. Fan-out on Read (Pull):
   User requests feed → Fetch tweets from all followed users

   ┌─────────┐
   │  Read   │──▶ Fetch N users' tweets ──▶ Merge & Sort
   └─────────┘

   Pros: No wasted writes
   Cons: Slow read (must fetch and merge)

3. Hybrid (Twitter's approach):
   - Regular users: Fan-out on write
   - Celebrities (>10K followers): Fan-out on read

   User feed = Pre-computed feed + Celebrity tweets (fetched on demand)
```

### Key Points for Interview

```
□ Fan-out trade-offs (push vs pull vs hybrid)
□ Handling celebrity accounts (hot spots)
□ Timeline ordering (eventual consistency OK?)
□ Caching strategy for hot users
□ Tweet deletion propagation
```

---

## Exercise 2: Design Dropbox/Google Drive

### Requirements

```
Functional:
- Upload/download files
- Sync across devices
- Share files/folders
- Version history

Non-Functional:
- 500M users, 100M DAU
- Average 200 files/user, 2MB average
- 1M uploads/day
```

### Back-of-Envelope

```
Storage:
- Total files: 500M × 200 = 100B files
- Total storage: 100B × 2MB = 200PB
- Daily uploads: 1M × 2MB = 2TB/day

Bandwidth:
- Upload: 2TB/day = 185 Mbps average
- Download (5x uploads): 10TB/day = 925 Mbps
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Desktop/Mobile)                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│   │ File Watcher│  │Chunker/Sync │  │  Local DB       │   │
│   └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      Block Server                           │
│              (Upload/Download Chunks)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐      ┌─────────┐
   │Metadata │      │  Block   │      │  Sync   │
   │ Service │      │  Storage │      │ Service │
   │(MySQL)  │      │   (S3)   │      │         │
   └─────────┘      └──────────┘      └─────────┘
```

### Deep Dive: File Chunking & Sync

```
Why chunk files?

1. Resume interrupted uploads
2. Deduplicate across files/users
3. Efficient sync (only changed chunks)
4. Parallel upload/download

Chunking process:
┌──────────────────────────────────────┐
│           Large File (100MB)          │
├────────┬────────┬────────┬───────────┤
│Chunk 1 │Chunk 2 │Chunk 3 │ Chunk 4   │
│  4MB   │  4MB   │  4MB   │   4MB     │
├────────┼────────┼────────┼───────────┤
│ hash1  │ hash2  │ hash3  │  hash4    │
└────────┴────────┴────────┴───────────┘

Sync algorithm:
1. Calculate chunk hashes locally
2. Send hashes to server
3. Server returns: "Need chunks 2, 4"
4. Upload only changed chunks
5. Server reconstructs file
```

### Sync Conflict Resolution

```
Scenario: User edits file on Device A and B simultaneously

Timeline:
Device A: Edit → Sync request
Device B: Edit → Sync request (arrives later)

Resolution options:
1. Last write wins (data loss!)
2. Create conflict copy (Dropbox approach)
   - file.txt
   - file (conflicted copy from Device B).txt
3. Operational transform (Google Docs)
   - Merge changes intelligently
```

### Key Points for Interview

```
□ Chunking strategy and benefits
□ Deduplication (content-addressable storage)
□ Sync algorithm (metadata-based)
□ Conflict resolution strategy
□ Efficient bandwidth usage (delta sync)
□ Offline support and reconciliation
```

---

## Exercise 3: Design WhatsApp

### Requirements

```
Functional:
- 1:1 messaging
- Group messaging (up to 256 members)
- Read receipts, online status
- Media sharing

Non-Functional:
- 2B users, 1B DAU
- 100B messages/day
- Message delivery < 100ms
- End-to-end encryption
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket
┌─────────────────────────┴───────────────────────────────────┐
│                   WebSocket Gateway                          │
│              (Maintains persistent connections)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐      ┌─────────┐
   │ Message │      │  Group   │      │  User   │
   │ Service │      │ Service  │      │ Service │
   └────┬────┘      └──────────┘      └────┬────┘
        │                                   │
        ▼                                   ▼
   ┌─────────┐                        ┌─────────┐
   │ Message │                        │  User   │
   │  Queue  │                        │  Store  │
   │ (Kafka) │                        │(Cassandra)
   └────┬────┘                        └─────────┘
        │
        ▼
   ┌─────────┐
   │ Message │
   │  Store  │
   │(Cassandra)
   └─────────┘
```

### Deep Dive: Message Delivery

```
Message flow:

1. User A sends message to User B
2. Message → WebSocket Gateway → Message Service
3. Message stored in DB
4. Check: Is User B online?
   - Yes: Push via WebSocket
   - No: Store for later delivery

┌─────┐                              ┌─────┐
│  A  │                              │  B  │
└──┬──┘                              └──┬──┘
   │                                    │
   │──── "Hello" ───▶│                 │
   │                 │ Store           │
   │                 │ message         │
   │◀─── Sent ✓ ─────│                 │
   │                 │── Push ────────▶│
   │                 │                 │ Display
   │◀── Delivered ✓ ─│◀── Ack ────────│
   │                 │                 │ User reads
   │◀── Read ✓ ──────│◀── Read Ack ───│

Offline delivery:
- Messages queued per user
- On reconnect: Fetch pending messages
- Acknowledge each message
```

### End-to-End Encryption

```
Signal Protocol (simplified):

Key exchange (Diffie-Hellman):
1. A generates key pair (public, private)
2. B generates key pair (public, private)
3. Exchange public keys via server
4. Both compute shared secret

Message encryption:
A → Encrypt(message, shared_secret) → Server → B
B → Decrypt(ciphertext, shared_secret) → message

Server NEVER sees plaintext.
New session key for each message (forward secrecy).
```

### Key Points for Interview

```
□ WebSocket for real-time communication
□ Message delivery guarantees (at-least-once)
□ Handling offline users (message queue)
□ Group messaging (fan-out to members)
□ End-to-end encryption basics
□ Read receipts and presence
□ Media handling (separate storage, thumbnails)
```

---

## Exercise 4: Design a Rate Limiter

### Requirements

```
Functional:
- Limit requests per user/IP
- Different limits per endpoint
- Return rate limit headers

Non-Functional:
- < 1ms latency overhead
- Distributed (multiple servers)
- Accurate (don't significantly exceed limits)
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      Rate Limiter                           │
│   ┌─────────────────────────────────────────────────────┐  │
│   │         Rules Engine                                 │  │
│   │   - User: 100 req/min                               │  │
│   │   - IP: 1000 req/min                                │  │
│   │   - /api/search: 10 req/min                         │  │
│   └─────────────────────────────────────────────────────┘  │
│                          │                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │         Counter Store (Redis)                        │  │
│   │   user:123:minute:1640000 = 45                      │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                     API Servers
```

### Algorithm: Sliding Window Counter

```python
def is_allowed(user_id, limit=100, window=60):
    now = time.time()
    window_start = int(now // window) * window

    # Redis keys
    prev_key = f"rate:{user_id}:{window_start - window}"
    curr_key = f"rate:{user_id}:{window_start}"

    # Get counts
    prev_count = redis.get(prev_key) or 0
    curr_count = redis.get(curr_key) or 0

    # Weighted count
    elapsed_ratio = (now - window_start) / window
    count = prev_count * (1 - elapsed_ratio) + curr_count

    if count >= limit:
        return False, limit - count

    # Increment current window
    redis.incr(curr_key)
    redis.expire(curr_key, window * 2)

    return True, limit - count - 1
```

### Key Points for Interview

```
□ Algorithm trade-offs (token bucket vs sliding window)
□ Distributed counting (Redis vs local + sync)
□ Handling Redis failures (fail open vs closed)
□ Rate limit by multiple dimensions
□ Graceful degradation for legitimate bursts
```

---

## Exercise 5: Design Google Search Autocomplete

### Requirements

```
Functional:
- Return top 5 suggestions for prefix
- Suggestions based on popularity
- Update based on new searches

Non-Functional:
- < 100ms latency
- Suggestions feel real-time
- Handle 100K QPS
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Search Box (Client)                      │
│              Debounce: Wait 100ms after typing             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                  Autocomplete Service                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
   ┌─────────┐                        ┌─────────┐
   │  Trie   │                        │ Search  │
   │  Store  │                        │  Logs   │
   └─────────┘                        └────┬────┘
                                           │
                                      ┌────┴────┐
                                      │ Offline │
                                      │ Builder │
                                      └─────────┘
```

### Deep Dive: Trie Data Structure

```
Trie for "cat", "car", "card", "care":

              (root)
                │
               'c'
                │
               'a'
              / | \
            't' 'r' ...
            |   / \
           (cat) 'd' 'e'
                 |   |
               card care

Each node stores:
- Character
- Is end of word?
- Top K suggestions for this prefix
- Frequency/score

Optimization: Pre-compute top K at each node
Query "ca" → Return pre-stored ["car", "cat", "card", "care", ...]
```

### Data Pipeline

```
Search logs → Aggregate → Build Trie → Deploy

1. Collect searches (Kafka)
   {"query": "how to", "timestamp": ..., "location": ...}

2. Aggregate (hourly/daily)
   MapReduce job:
   "how to" → 1M searches
   "how to cook" → 500K searches

3. Build Trie
   - Create trie from aggregated data
   - Store top K at each node
   - Serialize for distribution

4. Deploy
   - Push to autocomplete servers
   - Gradual rollout
```

### Key Points for Interview

```
□ Trie structure and optimization
□ Pre-computing top K suggestions
□ Offline pipeline for building trie
□ Handling real-time trending (hybrid approach)
□ Personalization (user history)
□ Filtering inappropriate suggestions
```

---

## Exercise 6: Design YouTube/Netflix

### Requirements

```
Functional:
- Upload videos
- Stream videos (adaptive bitrate)
- Search and recommendations

Non-Functional:
- 2B users, 800M DAU
- 500 hours of video uploaded/minute
- 1B video views/day
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Upload Flow                            │
│                                                             │
│  User → Upload Service → Transcoding Queue → Transcoder    │
│                              │                              │
│                              ▼                              │
│                         Object Storage (S3)                 │
│                         (Multiple resolutions)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Streaming Flow                         │
│                                                             │
│  User → CDN → Origin Servers → Object Storage              │
│           ↑                                                 │
│           └── Cache hit (most requests)                    │
└─────────────────────────────────────────────────────────────┘
```

### Deep Dive: Video Transcoding

```
Upload pipeline:

1. Upload original video
   - Chunked upload for large files
   - Resume capability

2. Transcoding (parallel):
   ┌────────────────────────────────────────────┐
   │              Original Video                 │
   └────────────────────┬───────────────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
   [1080p]           [720p]            [480p]
   H.264             H.264             H.264
      │                 │                 │
      └─────────────────┼─────────────────┘
                        │
                   Segment into
                   10-sec chunks
                        │
                   Generate manifest
                   (HLS/DASH)

3. Storage structure:
   /videos/{video_id}/
     - manifest.m3u8
     - 1080p/
       - segment_001.ts
       - segment_002.ts
     - 720p/
       - segment_001.ts
       - ...
```

### Adaptive Bitrate Streaming

```
Client monitors bandwidth:

Good network → Request 1080p segments
Network drops → Switch to 720p
Network improves → Gradually increase quality

Timeline:
Seg1     Seg2     Seg3     Seg4     Seg5
1080p    1080p    720p     480p     720p
                    ↑                 ↑
              Network drop      Recovery
```

### Key Points for Interview

```
□ Video transcoding pipeline
□ Adaptive bitrate streaming (HLS/DASH)
□ CDN strategy for video content
□ Recommendation system (collaborative filtering)
□ Handling viral videos (hot content)
□ Live streaming differences
```

---

## Exercise 7: Design Uber/Lyft

### Requirements

```
Functional:
- Rider requests ride
- Match with nearby driver
- Real-time location tracking
- Pricing and payments

Non-Functional:
- 100M riders, 5M drivers
- Match within 30 seconds
- Location updates every 3 seconds
```

### High-Level Design

```
┌─────────────┐                    ┌─────────────┐
│   Rider     │                    │   Driver    │
│    App      │                    │    App      │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │                                  │
┌──────┴──────────────────────────────────┴──────┐
│                   API Gateway                   │
└─────────────────────┬──────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
┌───────┐        ┌────────┐       ┌────────┐
│ Trip  │        │Location│       │Matching│
│Service│        │Service │       │Service │
└───────┘        └────┬───┘       └────────┘
                      │
                 ┌────┴────┐
                 │ GeoIndex│
                 │ (Redis) │
                 └─────────┘
```

### Deep Dive: Geospatial Matching

```
Finding nearby drivers:

Option 1: Geohash
- Divide world into grid cells
- Each cell has unique hash
- Nearby locations share prefix

   gh5xr | gh5xs | gh5xt
   ------+-------+------
   gh5xq | gh5xm | gh5xn
   ------+-------+------
   gh5xj | gh5xk | gh5xl

Driver at gh5xm → Store in Redis SET "geo:gh5xm"
Rider at gh5xm → Query gh5xm and neighbors

Option 2: QuadTree
- Recursively divide space into quadrants
- More dynamic, adapts to density

Option 3: S2 Geometry (Google's approach)
- Sphere divided into cells
- Hierarchical cell IDs
```

### Matching Algorithm

```
1. Rider requests ride
2. Find drivers in expanding radius:
   - 1km → No drivers
   - 2km → 3 drivers found
3. Score drivers:
   - Distance to rider
   - Driver rating
   - ETA
   - Direction of travel
4. Send request to top driver
5. Driver accepts/rejects (30 sec timeout)
6. Rejected → Try next driver
```

### Key Points for Interview

```
□ Geospatial indexing (Geohash, QuadTree, S2)
□ Matching algorithm and optimization
□ Real-time location updates (frequency trade-off)
□ Surge pricing logic
□ Handling driver/rider near cell boundaries
□ ETA calculation
```

---

## Exercise 8: Design Ticketmaster

### Requirements

```
Functional:
- Browse events
- Search for tickets
- Book tickets (seat selection)
- Payment processing

Non-Functional:
- Handle 1M concurrent users during popular sales
- No overselling
- Fair queuing during high demand
```

### The Core Challenge

```
Flash sale problem:

T=0: Taylor Swift tickets on sale
     1M users refresh simultaneously
     10K tickets available

Requirements:
1. Don't crash
2. Don't oversell
3. Be fair (first-come-first-served)
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                     Virtual Queue                           │
│              (Rate limit incoming traffic)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ Controlled rate
┌─────────────────────────┴───────────────────────────────────┐
│                   Ticket Service                            │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │   Catalog   │    │ Inventory   │    │  Booking    │   │
│   │   Service   │    │   Service   │    │  Service    │   │
│   └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                             │                              │
│                      ┌──────┴──────┐                      │
│                      │  Inventory  │                      │
│                      │    Lock     │                      │
│                      │   (Redis)   │                      │
│                      └─────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Deep Dive: Preventing Overselling

```
Reservation flow with distributed lock:

1. User selects seat A1
2. Try to acquire lock on A1 (Redis SETNX)
3. Lock acquired → Reserve for 5 minutes
4. User completes payment
5. Confirm reservation, release lock
6. Lock not acquired → "Seat taken, try another"

Redis implementation:
SETNX lock:event:123:seat:A1 user:456
EXPIRE lock:event:123:seat:A1 300  # 5 minute hold

Alternative: Optimistic locking
1. Read seat status (version 1)
2. User selects seat
3. UPDATE ... WHERE version = 1
4. Success → Booked
5. Fail (version changed) → Someone else got it
```

### Virtual Queue

```
Handle 1M users, process 1K/minute:

1. User joins queue
   - Assigned position: 500,000
   - Estimated wait: 8 hours
   - Get queue token

2. Polling:
   - Every 30 seconds: "Am I in yet?"
   - Server: "No, position now 300,000"

3. Turn comes:
   - Server: "You're in! Here's session token"
   - 10-minute window to complete purchase
   - Miss window → Back to queue

Benefits:
- Predictable load on booking system
- Fair ordering
- User knows wait time
```

### Key Points for Interview

```
□ Handling flash sale traffic (queue, rate limit)
□ Preventing overselling (locks, transactions)
□ Seat hold timeout (temporary reservation)
□ Idempotent payment processing
□ Fair queuing mechanism
□ Showing real-time availability
```

---

## Exercise 9: Design URL Shortener (bit.ly)

### Requirements

```
Functional:
- Shorten long URL
- Redirect short URL to original
- Custom aliases (optional)
- Analytics (click counts)

Non-Functional:
- 100M URLs created/month
- 10B redirects/month
- Redirect latency < 50ms
```

### Back-of-Envelope

```
URLs:
- 100M/month = 40/second write
- 10B redirects/month = 4000/second read
- Read:Write = 100:1 (read-heavy)

Storage (5 years):
- 100M × 12 × 5 = 6B URLs
- Each URL: ~500 bytes
- Total: 3TB

Short URL length:
- Base62 (a-z, A-Z, 0-9) = 62 characters
- 62^7 = 3.5 trillion combinations
- 7 characters is sufficient
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
   Write Path                          Read Path
   (Create)                            (Redirect)
        │                                   │
        ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│ URL Service  │                    │     CDN      │
│              │                    │   (Cache)    │
└──────┬───────┘                    └──────┬───────┘
       │                                   │ cache miss
       │                                   │
       └───────────────┬───────────────────┘
                       │
                ┌──────┴──────┐
                │  URL Store  │
                │  (NoSQL)    │
                └─────────────┘
```

### Short URL Generation

```
Option 1: Hash + Truncate
MD5("https://example.com/long/url") = "d41d8cd98f00b204..."
Take first 7 chars: "d41d8cd"

Problem: Collisions (check and retry)

Option 2: Counter + Base62
Counter: 1000000000 (incrementing)
Base62(1000000000) = "15ftgG"

Problem: Predictable, need distributed counter

Option 3: Pre-generated Keys
Offline: Generate millions of unique keys
Online: Pop from queue when needed

┌─────────────────────────────────────────┐
│         Key Generation Service          │
│                                         │
│  Available: [abc1234, xyz5678, ...]    │
│  Used:      [def9012, ghi3456, ...]    │
└─────────────────────────────────────────┘

Pros: Fast, no collision check
Cons: Need to manage key pool
```

### Key Points for Interview

```
□ Short URL generation strategy
□ Handling collisions
□ Custom alias validation
□ Caching for read-heavy workload
□ Analytics (async, don't block redirect)
□ URL expiration
□ Preventing abuse (spam URLs)
```

---

### The Hard Follow-Up: Viral URL at 100,000 RPS

> This is the question that separates the 10% from the 90%. Once you've designed the basic system, the interviewer says:
> **"One URL goes viral — 100,000 clicks per second, all hitting the same short code. What breaks and how do you fix it?"**

#### Why 90% of Candidates Fail

**Pattern 1 — Design for averages (40%)**
Engineers dimension the system for 4,000 rps (the average) and have no answer for 100K rps on a single key. Traffic is never evenly distributed in production.

**Pattern 2 — Naive horizontal scaling (35%)**
"Just add more Redis nodes." This doesn't help — the hot key still routes to *one* shard. All 100K rps land on the same Redis instance regardless of how many nodes you add. This is the **Hot Key Problem**.

**Pattern 3 — Over-engineering (15%)**
Jumping to consistent hashing, ML-based prediction, or global replication without addressing the root cause first.

#### Root Cause: The Hot Key Problem

```
Normal traffic (4K rps spread across millions of URLs):
Redis Node 1: ░░░  (url_abc)
Redis Node 2: ░░   (url_def)
Redis Node 3: ░░░  (url_xyz)

Viral URL (100K rps on one key):
Redis Node 1: ████████████████  (url_viral — SATURATED)
Redis Node 2: ░                 (idle)
Redis Node 3: ░░                (idle)

Horizontal scaling doesn't help — the hot key is pinned to one node.
```

#### Correct Layered Defense

```
Client Request (100K rps)
        │
        ▼
┌───────────────────┐
│   CDN / Edge      │  ← absorbs ~80% (80K rps)
│ (geo-distributed) │    short TTL (5s) per PoP
└────────┬──────────┘
         │ 20K rps cache miss
         ▼
┌───────────────────┐
│  App Server       │  ← in-process memory cache per instance
│  (local cache)    │    no coordination, no network hop
└────────┬──────────┘
         │ only true misses reach here
         ▼
┌───────────────────┐
│  Redis            │  ← already down to manageable load
│  (shared cache)   │
└────────┬──────────┘
         │ rare misses
         ▼
┌───────────────────┐
│  Database         │  ← protected; almost never hit for hot URL
└───────────────────┘
```

**Why each layer works:**
- **CDN**: Geographically distributed — each PoP absorbs its regional traffic independently. No single-node bottleneck.
- **Local in-memory cache (per app server)**: Zero network overhead, no shared state, no coordination. 10 app servers = 10 independent caches all serving the hot URL from RAM.
- **Stale data acceptance**: A 5-second-old redirect URL is completely fine for business purposes. Optimizing for freshness at the cost of availability is wrong here.

#### The Mindset Shift

| Textbook Approach | Production Approach |
|---|---|
| Assume uniform traffic | Expect power-law distribution (1 URL gets 80% of hits) |
| Optimize for correctness | Optimize for graceful degradation |
| "Add more Redis nodes" | Local cache eliminates the hot-key problem entirely |
| Consistent hashing | Simple CDN + in-memory cache solves 99% of cases |
| Design for theoretical peak | Accept stale data to protect availability |

#### Interview Checklist for This Follow-Up

```
□ Identify the hot-key problem by name
□ Explain why adding Redis nodes doesn't help
□ Propose CDN as the first line of defense
□ Add local in-memory cache per app server
□ Explicitly accept stale data (and give a TTL: 5–30s)
□ State what SLA you're optimizing for (availability > freshness)
□ Ask clarifying questions before designing: "Is this for reads only?
  Is a 5-second stale redirect acceptable?"
```

> **The 10% who pass ask questions before designing.** They identify that traffic is power-law distributed, that the CDN is the right first lever, and that perfect cache consistency is the wrong trade-off to optimize for under viral load.

---

## Exercise 10: Design Notification System

### Requirements

```
Functional:
- Push notifications (iOS, Android)
- SMS notifications
- Email notifications
- In-app notifications

Non-Functional:
- 1B notifications/day
- Delivery within 1 minute
- Handle provider failures
```

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Sources                     │
│   (Order Service, User Service, Marketing, etc.)           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                  Notification Service                       │
│                                                             │
│   ┌───────────────┐    ┌────────────────┐                  │
│   │   Validation  │───▶│  Prioritization │                  │
│   │   & Enrichment│    │   & Routing    │                  │
│   └───────────────┘    └───────┬────────┘                  │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │  Push    │      │   SMS    │      │  Email   │
        │  Queue   │      │  Queue   │      │  Queue   │
        └────┬─────┘      └────┬─────┘      └────┬─────┘
             │                 │                 │
             ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │  APNS    │      │ Twilio   │      │ SendGrid │
        │  FCM     │      │          │      │          │
        └──────────┘      └──────────┘      └──────────┘
```

### Deep Dive: Reliable Delivery

```
Notification lifecycle:

1. Request received
   - Validate payload
   - Store in database (state: PENDING)
   - Enqueue for delivery

2. Worker picks up
   - Call external provider
   - Success → State: SENT
   - Failure → Retry with backoff

3. Delivery confirmation
   - Provider callback (if available)
   - State: DELIVERED

4. Failure handling
   - Retry 3 times with exponential backoff
   - After max retries: State: FAILED
   - Alert on high failure rate

Retry strategy:
Attempt 1: Immediate
Attempt 2: After 1 minute
Attempt 3: After 5 minutes
Attempt 4: After 30 minutes
Give up: Mark as failed, maybe try alternate channel
```

### Rate Limiting & Throttling

```
Problem: Don't overwhelm users or providers

User-level:
- Max 10 notifications/day per user
- Quiet hours (no notifications 10pm-8am)
- Aggregate similar notifications

Provider-level:
- APNS: 100K/sec max
- SMS: Respect carrier limits
- Email: Warm up sending reputation

Implementation:
┌─────────────────────────────────────────┐
│         Rate Limiter per User           │
│                                         │
│  user:123:notifications:today = 5       │
│  Max: 10 → Allow                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        Rate Limiter per Provider        │
│                                         │
│  provider:apns:requests:second = 50K    │
│  Max: 100K → Allow                      │
└─────────────────────────────────────────┘
```

### Key Points for Interview

```
□ Multiple channel support (push, SMS, email)
□ Reliable delivery (retries, acknowledgment)
□ Rate limiting (user and provider level)
□ Prioritization (urgent vs marketing)
□ User preferences and opt-out
□ Template management
□ A/B testing notifications
```

---

## Exercise 11: Preventing Double Assignment — Race Conditions in Real-Time Systems

### The Problem

Two delivery agents try to accept the same food order at the same time. How do you prevent double assignment?

```
Timeline of a race condition:

  Time    Agent A                    Database                   Agent B
  ─────────────────────────────────────────────────────────────────────
  T1      READ order #42             status = PENDING
          status = PENDING                                     READ order #42
                                                               status = PENDING
  T2      UPDATE order #42                                     UPDATE order #42
          SET agent = A              status = ASSIGNED (A)      SET agent = B
          WHERE status = PENDING     ✅ Success
                                     status = ASSIGNED (B)      ✅ Also succeeds!
                                     ❌ DOUBLE ASSIGNMENT
```

Both agents see `PENDING`, both attempt to claim — the system assigns the same order twice. This is a **classic read-then-write race condition** (also called a "lost update" problem).

### Why It Happens

The root cause is a **non-atomic check-then-act** operation:

```
1. READ  → "Is order still available?"    (check)
2. WRITE → "Assign order to me"           (act)
```

Between step 1 and step 2, another thread/process can execute the same sequence. Without coordination, both succeed.

### Requirements

```
Functional:
- Agents see available orders in real time
- An agent can accept an order
- Only ONE agent gets assigned per order
- Rejected agent sees "order already taken" immediately

Non-Functional:
- Assignment latency < 200ms (real-time feel)
- Handle 10K+ concurrent accept requests/second at peak
- Zero double assignments (correctness > availability)
- Fair: first-come-first-served when possible
```

### Solution 1: Row-Level Locking (Pessimistic Locking)

Lock the database row before reading it. Other transactions block until the lock is released.

```sql
-- Agent A's transaction
BEGIN;
  SELECT * FROM orders WHERE id = 42 FOR UPDATE;  -- ← Acquires row lock
  -- Agent B's SELECT FOR UPDATE now BLOCKS here
  UPDATE orders SET status = 'ASSIGNED', agent_id = 'A' WHERE id = 42;
COMMIT;  -- ← Lock released, Agent B can proceed

-- Agent B's transaction (was blocked, now continues)
BEGIN;
  SELECT * FROM orders WHERE id = 42 FOR UPDATE;  -- Now sees status = ASSIGNED
  -- Check: status is no longer PENDING → abort
ROLLBACK;
```

```java
// Spring Data JPA implementation
// For detailed @Lock and @Version usage, see:
//   01-java/02-spring-ecosystem/spring-data/05-best-practices.md
//   → "Pessimistic Locking" and "Optimistic Locking" sections

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
}

@Service
public class OrderAssignmentService {

    @Transactional
    public AssignmentResult acceptOrder(Long orderId, String agentId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            return AssignmentResult.alreadyTaken();
        }

        order.setStatus(OrderStatus.ASSIGNED);
        order.setAgentId(agentId);
        orderRepository.save(order);
        return AssignmentResult.success();
    }
}
```

**How it prevents the race**: The `SELECT ... FOR UPDATE` acquires an exclusive row lock. The second agent's query blocks until the first agent commits. When it resumes, it sees `ASSIGNED` and aborts.

```
✅ Pros                                  ❌ Cons
─────────────────────────────────────    ────────────────────────────────────
Simple to implement                      Blocks threads (reduces throughput)
Strong correctness guarantee             Risk of deadlocks with multiple locks
Works within a single database           Does not work across databases/services
Familiar SQL semantics                   Lock wait = wasted latency for losers
                                         Doesn't scale horizontally well
```

**Best for**: Single database, moderate contention, short transactions (< 100ms).

### Why Database Locks Don't Work Across Services

This is a critical point that interviewers probe. Pessimistic locks (`SELECT ... FOR UPDATE`) and optimistic locks (`@Version`) both rely on the **same database connection/transaction**. They break down in distributed systems:

```
SINGLE DATABASE — Lock works:

  Order Service ──→ PostgreSQL (orders table)
      ↓                   ↓
  SELECT FOR UPDATE   Row lock acquired ✅
  UPDATE ...          Same transaction, same DB connection
  COMMIT              Lock released

  Both agents hit the SAME database → lock coordination works.


MULTIPLE DATABASES / SERVICES — Lock fails:

  Order Service ──→ PostgreSQL (orders table)
      ↓
  "Lock order #42"    Row lock acquired in PostgreSQL ✅
      ...
  Agent Service ──→ MongoDB (agent assignments collection)
      ↓
  "Assign agent B"    MongoDB knows NOTHING about PostgreSQL's lock ❌
                      There is no coordination between the two databases.
```

**Why it fails — the three fundamental reasons**:

```
1. LOCKS ARE SCOPED TO A SINGLE DATABASE ENGINE
   PostgreSQL's row lock is a concept inside PostgreSQL.
   MongoDB, MySQL, DynamoDB — none of them can see or respect it.
   A lock in Database A provides ZERO protection for Database B.

2. TRANSACTIONS DON'T SPAN DATABASES
   @Transactional in Spring opens a transaction on ONE datasource.
   You can't atomically commit across PostgreSQL + MongoDB + Redis.
   If the first DB commits but the second fails, you have inconsistency.

   @Transactional  // This wraps ONE database connection
   public void assign(Long orderId, String agentId) {
       orderRepo.lock(orderId);        // PostgreSQL lock ✅
       agentRepo.markBusy(agentId);    // MongoDB — NOT part of the same transaction ❌
       // If MongoDB write fails AFTER PostgreSQL commits → inconsistent state
   }

3. NETWORK PARTITIONS BREAK ASSUMPTIONS
   Even if two services talk to the same database, they go through
   the network. The lock holder can lose connectivity, leaving the
   lock held indefinitely (until timeout).
```

**What to use instead**:

| Scenario | Problem | Solution |
|----------|---------|----------|
| Two services, one shared DB | Only one DB involved | Pessimistic/Optimistic lock still works (both services use the same DB) |
| Two services, two different DBs | Can't lock across DBs | **Distributed lock** (Redis/Zookeeper) — external coordination |
| Many services, eventual consistency OK | Don't need instant lock | **Saga pattern** — compensating transactions |
| Many services, strict consistency | Need all-or-nothing across DBs | **Queue-based serialization** — avoid concurrent access entirely |

> **See also**: [Distributed Transactions & Saga Pattern](../microservices/05-distributed-transactions.md) for handling multi-service data consistency.

---

### Solution 2: Optimistic Concurrency Control (CAS — Compare And Swap)

Don't lock anything upfront. Instead, let both agents try to update, but include a condition that only succeeds if the state hasn't changed.

```sql
-- Agent A
UPDATE orders
SET status = 'ASSIGNED', agent_id = 'A', version = version + 1
WHERE id = 42 AND status = 'PENDING' AND version = 5;
-- Returns: 1 row affected ✅

-- Agent B (executing at the same time)
UPDATE orders
SET status = 'ASSIGNED', agent_id = 'B', version = version + 1
WHERE id = 42 AND status = 'PENDING' AND version = 5;
-- Returns: 0 rows affected ❌ (status is no longer PENDING, or version changed)
```

```java
@Entity
public class Order {
    @Id
    private Long id;
    private String status;
    private String agentId;

    @Version  // JPA optimistic locking
    private Long version;
}

@Service
public class OrderAssignmentService {

    @Transactional
    public AssignmentResult acceptOrder(Long orderId, String agentId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!"PENDING".equals(order.getStatus())) {
            return AssignmentResult.alreadyTaken();
        }

        order.setStatus("ASSIGNED");
        order.setAgentId(agentId);

        try {
            orderRepository.save(order);  // JPA checks @Version automatically
            return AssignmentResult.success();
        } catch (OptimisticLockException e) {
            return AssignmentResult.alreadyTaken();
        }
    }
}
```

**How it prevents the race**: Both UPDATEs include a `WHERE version = 5` condition. Only one can succeed because the first UPDATE changes the version to 6. The second UPDATE's WHERE clause no longer matches.

```
✅ Pros                                  ❌ Cons
─────────────────────────────────────    ────────────────────────────────────
No locks held → higher throughput        Losers must retry (wasted work)
No deadlock risk                         Under high contention, many retries
Works well for low-moderate contention   Not suitable for hot-spot rows
Database-agnostic (version column)       Requires application-level retry logic
```

**Best for**: Low-moderate contention, read-heavy with occasional writes, user-facing apps.

### Why Optimistic Locking Fails Under High Contention (Hot-Spot Problem)

Optimistic locking assumes **most attempts will succeed** and handles the occasional conflict with a retry. This assumption breaks when many writers target the **same row** simultaneously.

```
LOW CONTENTION — Optimistic works great:

  100 agents, 100 different orders → each order gets ~1 attempt
  Conflict rate: ~0%
  Every agent succeeds on first try ✅

HIGH CONTENTION (hot-spot row) — Optimistic falls apart:

  100 agents, ALL want order #42 → 100 concurrent UPDATEs on SAME row

  Round 1: All 100 read version=5, all 100 try UPDATE WHERE version=5
           → 1 wins, 99 fail (OptimisticLockException)
           → 99 must retry

  Round 2: 99 re-read version=6, all 99 try UPDATE WHERE version=6
           → 1 wins, 98 fail
           → 98 must retry

  Round 3: 98 re-read... 1 wins... 97 fail...

  This continues until all agents have tried.

  Total work done:
    Useful:  1 successful assignment
    Wasted:  100 + 99 + 98 + ... = ~5,000 reads + failed writes
             All that database I/O for ONE assignment.
```

**The math of retry storms**:

```
With N concurrent writers on the same row:
  - Success rate per round:  1/N
  - Expected total attempts: N + (N-1) + (N-2) + ... + 1 = N(N+1)/2
  - For N=100: ~5,050 attempts for 1 useful write
  - For N=1000: ~500,500 attempts 😱

  Each failed attempt = 1 read + 1 failed write + exception handling
  The database is doing massive work for no result.
```

**What makes a "hot-spot row"?**

```
Examples of hot-spot rows:
  - Flash sale: 10,000 users click "buy" on 1 item simultaneously
  - Delivery: 50 agents compete for 1 high-value order
  - Counter: Global "total orders" counter updated on every order
  - Inventory: Decrementing stock for a viral product

Common trait: Many writers, same row, same time.
```

**Why pessimistic locking handles this better**:

```
Pessimistic (SELECT FOR UPDATE):
  Agent 1: Acquires lock → processes → releases    (50ms)
  Agent 2: Waits for lock → acquires → sees ASSIGNED → aborts (55ms)
  Agent 3: Waits → acquires → sees ASSIGNED → aborts (60ms)
  ...

  Total: N sequential lock acquisitions
  Each agent does ONE read + ONE check, then leaves.
  Work: ~N operations (linear)

Optimistic (retry loop):
  All N agents read + write simultaneously, 1 wins, N-1 fail.
  All N-1 retry, 1 wins, N-2 fail. And so on.
  Work: ~N²/2 operations (quadratic)

  For N=100:
    Pessimistic: ~100 operations (sequential but efficient)
    Optimistic:  ~5,000 operations (parallel but wasteful)
```

**When to switch from optimistic to another approach**:

| Contention Level | Typical Scenario | Recommendation |
|-----------------|-----------------|----------------|
| 1-5 writers/row | Normal app usage | Optimistic ✅ (retries are rare) |
| 5-20 writers/row | Popular items, moderate traffic | Optimistic still OK, monitor retry rate |
| 20-100 writers/row | Flash sales, competitive assignment | Switch to **pessimistic lock** or **distributed lock** |
| 100+ writers/row | Viral events, global counters | Switch to **queue-based** (serialize) or **sharding** (split the hot row) |

**Fixing the counter hot-spot** (bonus pattern):

```sql
-- ❌ Hot-spot: single row counter, every order updates it
UPDATE stats SET total_orders = total_orders + 1 WHERE id = 1;
-- 10,000 concurrent updates → massive contention

-- ✅ Fix: Sharded counters — distribute writes across N rows
UPDATE stats SET count = count + 1
WHERE stat_name = 'total_orders'
  AND shard_id = (floor(random() * 16))::int;  -- 16 shards

-- Read: SELECT SUM(count) FROM stats WHERE stat_name = 'total_orders';
-- Writes spread across 16 rows → 16x less contention per row
```

---

### Solution 3: Distributed Lock (Redis / Zookeeper)

Acquire a named lock (keyed by order ID) from an external lock service before processing. Only one holder at a time.

```
  Agent A                     Redis                        Agent B
  ──────────────────────────────────────────────────────────────────
  SET lock:order:42 A         ✅ Lock acquired
  NX EX 5                                                  SET lock:order:42 B
                                                            NX EX 5
                                                            ❌ Lock exists (rejected)
  Process assignment...
  DEL lock:order:42           Lock released
```

```java
@Service
public class OrderAssignmentService {

    private final RedisTemplate<String, String> redis;
    private static final Duration LOCK_TTL = Duration.ofSeconds(5);

    @Transactional
    public AssignmentResult acceptOrder(Long orderId, String agentId) {
        String lockKey = "lock:order:" + orderId;
        String lockValue = agentId + ":" + UUID.randomUUID(); // Unique per attempt

        // Try to acquire lock (SET NX EX = set if not exists, with expiry)
        Boolean acquired = redis.opsForValue()
            .setIfAbsent(lockKey, lockValue, LOCK_TTL);

        if (!Boolean.TRUE.equals(acquired)) {
            return AssignmentResult.alreadyTaken();
        }

        try {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

            if (!"PENDING".equals(order.getStatus())) {
                return AssignmentResult.alreadyTaken();
            }

            order.setStatus("ASSIGNED");
            order.setAgentId(agentId);
            orderRepository.save(order);
            return AssignmentResult.success();
        } finally {
            // Release lock (only if we still own it — prevents deleting someone else's lock)
            String currentValue = redis.opsForValue().get(lockKey);
            if (lockValue.equals(currentValue)) {
                redis.delete(lockKey);
            }
        }
    }
}
```

**How it prevents the race**: Redis `SET NX` (set if not exists) is atomic. Only one agent can hold `lock:order:42` at a time. The TTL ensures the lock is released even if the holder crashes.

```
✅ Pros                                  ❌ Cons
─────────────────────────────────────    ────────────────────────────────────
Works across services/databases          Adds Redis dependency
Fine-grained per-order locking           Clock skew / TTL tuning is tricky
Fast (Redis is in-memory)                Lock can expire before work completes
Familiar pattern (Redlock, Curator)      Not 100% safe without Redlock/fencing
                                         Must handle lock release carefully
```

**Best for**: Microservices (multiple services, multiple databases), high contention hot-spots.

> **Production note**: For safety in distributed environments, use [Redisson's RLock](https://redisson.org/) or Zookeeper's `InterProcessMutex` instead of hand-rolled Redis locks.

---

### Solution 4: Queue-Based Assignment (First-Come-First-Served)

Don't let agents race at all. Put orders into a queue; a single consumer assigns them.

```
  Agent A ─── "accept order 42" ───┐
                                    ├──→ [ Assignment Queue ] ──→ Single Consumer
  Agent B ─── "accept order 42" ───┘         (ordered)           assigns to first
                                                                  rejects second
```

```java
// Producer side: Agent sends accept request to Kafka/RabbitMQ
@RestController
public class OrderController {

    @Autowired
    private KafkaTemplate<String, AcceptRequest> kafkaTemplate;

    @PostMapping("/orders/{id}/accept")
    public ResponseEntity<String> acceptOrder(@PathVariable Long id,
                                               @RequestParam String agentId) {
        AcceptRequest request = new AcceptRequest(id, agentId, Instant.now());

        // Key by orderId → all accepts for same order go to same partition → ordered
        kafkaTemplate.send("order-accept-requests", String.valueOf(id), request);

        return ResponseEntity.accepted().body("Request queued");
    }
}

// Consumer side: Single-threaded per partition → no race condition
@KafkaListener(topics = "order-accept-requests")
public void processAcceptRequest(AcceptRequest request) {
    Order order = orderRepository.findById(request.getOrderId()).orElse(null);
    if (order == null || !"PENDING".equals(order.getStatus())) {
        notifyAgent(request.getAgentId(), "Order no longer available");
        return;
    }

    order.setStatus("ASSIGNED");
    order.setAgentId(request.getAgentId());
    orderRepository.save(order);
    notifyAgent(request.getAgentId(), "Order assigned to you!");
}
```

**How it prevents the race**: All accept requests for the same order are serialized in a single Kafka partition (keyed by order ID). A single consumer processes them one at a time — no concurrent access possible.

```
✅ Pros                                  ❌ Cons
─────────────────────────────────────    ────────────────────────────────────
Zero race conditions by design           Not real-time (queue latency: 50-200ms)
Natural ordering (fairness)              Adds messaging infrastructure (Kafka)
Handles burst traffic (queue absorbs)    Agent gets async response, not instant
Scales by adding partitions              More complex error handling (DLQ)
Auditable (queue is a log)              Harder to reason about for simple cases
```

**Best for**: High throughput, fairness requirements, event-driven architectures, systems already using Kafka/RabbitMQ.

> **For Kafka patterns and internals**, see: [Kafka Interview Questions](../messaging/kafka-interview-questions.md)

---

### Solution 5: Event-Driven Confirmation (Two-Phase Accept)

Split the accept into two steps: a tentative claim and a confirmed assignment. Only confirm after validating no conflicts.

```
  Agent A                     Order Service                    Agent B
  ──────────────────────────────────────────────────────────────────────
  Claim order 42  ──────→     status = CLAIMED_BY_A
                              Start confirmation timer (3s)
                                                     ←──────  Claim order 42
                                                               ❌ Already claimed
  ←──── Confirm within 3s     status = ASSIGNED_A ✅
```

```java
@Service
public class OrderAssignmentService {

    @Transactional
    public ClaimResult claimOrder(Long orderId, String agentId) {
        // Atomic update: only succeeds if still PENDING
        int updated = orderRepository.claimOrder(orderId, agentId, Instant.now().plusSeconds(3));

        if (updated == 0) {
            return ClaimResult.unavailable();
        }

        // Schedule confirmation timeout
        scheduler.schedule(
            () -> expireClaimIfUnconfirmed(orderId, agentId),
            3, TimeUnit.SECONDS
        );

        return ClaimResult.claimed(); // Agent must confirm within 3s
    }

    @Transactional
    public void confirmClaim(Long orderId, String agentId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        if ("CLAIMED".equals(order.getStatus()) && agentId.equals(order.getClaimedBy())) {
            order.setStatus("ASSIGNED");
            order.setAgentId(agentId);
            orderRepository.save(order);
        }
    }

    @Transactional
    public void expireClaimIfUnconfirmed(Long orderId, String agentId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        if ("CLAIMED".equals(order.getStatus()) && agentId.equals(order.getClaimedBy())) {
            order.setStatus("PENDING"); // Release back to pool
            orderRepository.save(order);
        }
    }
}
```

**How it prevents the race**: The initial `claimOrder` is an atomic conditional update (same as optimistic concurrency). The two-phase approach adds resilience: if the winning agent's app crashes or loses connectivity after claiming, the timeout releases the order back to the pool.

```
✅ Pros                                  ❌ Cons
─────────────────────────────────────    ────────────────────────────────────
Resilient to agent failures              More complex state machine
Self-healing (timeouts release claims)   Two round-trips (claim + confirm)
Works well for mobile (unreliable net)   Must handle timeout edge cases
Can combine with other approaches        Slight delay before final assignment
```

**Best for**: Mobile-first systems with unreliable networks, scenarios where the agent must do a second action (e.g., confirm they're nearby) before final assignment.

---

### Comparison: Which Solution When?

| Approach | Correctness | Throughput | Latency | Complexity | Best Scenario |
|----------|:-----------:|:----------:|:-------:|:----------:|---------------|
| **Pessimistic Lock** | Strong | Low-Med | Low | Low | Single DB, moderate load |
| **Optimistic (CAS)** | Strong | High | Low | Low-Med | Low contention, most common choice |
| **Distributed Lock** | Strong* | Med-High | Low | Med | Multi-service, cross-DB |
| **Queue-Based** | Strong | Very High | Med | Med-High | Event-driven, high throughput |
| **Event-Driven 2-Phase** | Strong | Med | Med | High | Mobile/unreliable clients |

*Distributed lock correctness depends on implementation (Redlock debate).

**Interview Decision Framework**:

```
Q: "How would you prevent double assignment?"

1. Start with the PROBLEM: Explain the race condition clearly
2. Propose OPTIMISTIC CONCURRENCY as default (simple, effective)
3. Discuss when you'd UPGRADE:
   - High contention on same row → Pessimistic lock
   - Multiple services/databases  → Distributed lock (Redis)
   - Need fairness + burst handling → Queue-based
   - Unreliable clients          → Event-driven 2-phase
4. Mention MONITORING: Track assignment conflicts, retry rates
```

### Key Points for Interview

```
□ Clearly explain the race condition (read-then-write, lost update)
□ Know at least 2-3 solutions with trade-offs
□ Default to optimistic concurrency for most scenarios
□ Mention that pessimistic locks don't scale across services
□ Discuss how Kafka partition-keying serializes access
□ Relate to real systems: Uber (driver assignment), Swiggy (delivery), booking systems
□ Cross-reference: locking in DB layer vs application layer vs infrastructure
```

### Related Topics in This Repository

- **Database-level locking (JPA @Lock, @Version)**: [Spring Data Best Practices](../../01-java/02-spring-ecosystem/spring-data/05-best-practices.md) → Optimistic & Pessimistic Locking sections
- **Distributed transactions across services**: [Saga Pattern](../microservices/05-distributed-transactions.md)
- **Kafka for queue-based patterns**: [Kafka Interview Questions](../messaging/kafka-interview-questions.md)
- **Circuit breakers for cascading failures**: [Microservices Resilience](../microservices/03-resilience.md)

---

## Summary: Patterns Across Problems

### Common Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **Message Queue** | All | Async processing, decoupling |
| **Cache (Redis)** | All | Fast reads, rate limiting |
| **CDN** | Video, URL | Static content, edge caching |
| **Load Balancer** | All | Distribution, health checks |
| **Database** | All | Persistent storage |

### Common Patterns

| Pattern | Examples | When to Use |
|---------|----------|-------------|
| **Fan-out** | Twitter feed, notifications | Distribute to many recipients |
| **Sharding** | All at scale | Data doesn't fit one node |
| **Caching** | All | Read-heavy workloads |
| **Queuing** | Video, notifications | Async, handle spikes |
| **Geo-indexing** | Uber, search | Location-based queries |

### Interview Tips

```
1. Always clarify requirements first
2. Do back-of-envelope math
3. Start with simple design, then iterate
4. Discuss trade-offs explicitly
5. Deep dive on most interesting component
6. Consider failure modes
7. Think about monitoring and operations
```
