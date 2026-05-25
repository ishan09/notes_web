# System Design Mindset

> **Key Insight**: System design interviews test how you think, not what you know. This guide covers the mental models and communication strategies that separate great architects from good engineers.

## Table of Contents
1. [How Architects Think](#how-architects-think)
2. [The Interview Framework](#the-interview-framework)
3. [Communication Strategies](#communication-strategies)
4. [Common Pitfalls](#common-pitfalls)
5. [Building Intuition](#building-intuition)

---

## How Architects Think

### The Architect's Mental Model

Great architects think in **layers of abstraction** and **trade-off spaces**.

```
Level 1: Business Requirements
         ↓
Level 2: System Capabilities (what it does)
         ↓
Level 3: Component Architecture (how it's structured)
         ↓
Level 4: Implementation Details (how it's built)
```

**Interview Focus**: Levels 2 and 3. Don't get stuck in Level 4 (code details).

### The Three Questions

For every design decision, ask:

1. **What problem does this solve?**
   - If you can't articulate the problem, you don't need the solution

2. **What does this cost?**
   - Latency, complexity, money, operational burden
   - There's no free lunch in distributed systems

3. **What alternatives exist?**
   - Know at least 2-3 approaches for every pattern
   - Be ready to explain why you chose one over others

### Think in Trade-offs, Not Solutions

```
❌ "We should use Redis for caching"

✅ "We need sub-millisecond reads for user sessions.
    Redis gives us O(1) lookups with persistence options.
    Trade-off: Added infrastructure complexity and cost.
    Alternative: In-memory cache is simpler but loses data on restart."
```

### The Scale Spectrum

Different scales require different architectures:

| Scale | Users | QPS | Typical Architecture |
|-------|-------|-----|---------------------|
| Small | < 1K | < 10 | Single server, SQLite |
| Medium | 1K-100K | 10-1K | Load balancer, replicated DB |
| Large | 100K-10M | 1K-100K | Microservices, sharded DB, caching |
| Massive | 10M+ | 100K+ | Global distribution, custom solutions |

**Key Insight**: Don't design for Google scale when you're building for 10K users.

---

## The Interview Framework

### Phase 1: Requirements Gathering (5 minutes)

**Goal**: Scope the problem correctly

#### Functional Requirements
Ask about:
- Core features (what MUST it do?)
- User actions (what can users do?)
- Data relationships (what connects to what?)

```
Example for Twitter:
- Users can post tweets (140 chars)
- Users can follow other users
- Users can view their feed (tweets from followed users)
- Users can like and retweet
```

#### Non-Functional Requirements
The SCALARM framework:

| Letter | Aspect | Questions to Ask |
|--------|--------|------------------|
| **S** | Scale | How many users? How many requests/sec? |
| **C** | Consistency | Strong or eventual? What's the cost of stale data? |
| **A** | Availability | What's the uptime target? 99.9%? 99.99%? |
| **L** | Latency | What response time is acceptable? |
| **A** | Accuracy | Is data loss acceptable? What about duplicates? |
| **R** | Reliability | What happens during failures? |
| **M** | Maintainability | Who operates this? What's the team size? |

### Phase 2: Estimation (3 minutes)

**Goal**: Ground the design in reality

#### Traffic Estimation Template
```
Given:
- Daily Active Users (DAU): 10M
- Actions per user per day: 5

Calculations:
- Daily requests = 10M × 5 = 50M
- Average QPS = 50M / 86,400 ≈ 580 QPS
- Peak QPS = 580 × 10 = 5,800 QPS (assume 10x peak)
```

#### Storage Estimation Template
```
Given:
- 50M new records per day
- Each record: 1KB average
- Retention: 5 years

Calculations:
- Daily storage = 50M × 1KB = 50GB/day
- Yearly storage = 50GB × 365 = 18TB/year
- 5-year storage = 18TB × 5 = 90TB
- With replication (3x): 270TB
```

#### Quick Reference Numbers

| Metric | Value | Note |
|--------|-------|------|
| Seconds in a day | 86,400 | ≈ 100K for quick math |
| Seconds in a month | 2.6M | ≈ 2.5M for quick math |
| 1 Million requests/day | ~12 QPS | |
| 1 Billion requests/day | ~12K QPS | |
| 1KB × 1M | 1GB | |
| 1MB × 1M | 1TB | |

### Phase 3: High-Level Design (10 minutes)

**Goal**: Draw the big picture

Start with the simplest possible design:

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│                    (Web, Mobile, API)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Servers                       │
│                  (Stateless, Horizontally Scalable)          │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│       Cache         │   │      Database       │
│      (Redis)        │   │    (PostgreSQL)     │
└─────────────────────┘   └─────────────────────┘
```

Then iteratively add components as needed:
1. **Cache** - If read-heavy (read:write > 10:1)
2. **Queue** - If async processing needed
3. **CDN** - If serving static content globally
4. **Search** - If full-text search required
5. **Separate services** - If distinct domains emerge

### Phase 4: Deep Dive (15-20 minutes)

**Goal**: Show depth on critical components

Pick 2-3 components that are:
- Central to the problem (feed algorithm for social, booking logic for reservations)
- Interesting technically (not just CRUD)
- Areas where you have expertise

For each deep dive:
1. **Data Model**: What's the schema?
2. **API Design**: What are the endpoints?
3. **Algorithm**: How does it work?
4. **Scaling Strategy**: How does it handle growth?
5. **Failure Handling**: What happens when it breaks?

### Phase 5: Wrap-up (5 minutes)

**Goal**: Show maturity and foresight

Discuss:
- **Bottlenecks**: "The main bottleneck is X, here's how we'd address it"
- **Monitoring**: "We'd track X, Y, Z metrics"
- **Future improvements**: "With more time, I'd add..."

---

## Communication Strategies

### The STAR Method for Design Decisions

When explaining choices:

- **S**ituation: "Given our requirement for..."
- **T**ask: "We need to achieve..."
- **A**ction: "I chose X because..."
- **R**esult: "This gives us... with the trade-off of..."

### Drawing Diagrams

#### Do's
- Use boxes for components
- Use arrows for data flow
- Label everything
- Show cardinality (1:1, 1:N, N:M)
- Indicate sync vs async

#### Don'ts
- Don't make it too detailed too early
- Don't use unclear abbreviations
- Don't forget to explain as you draw

### Verbal Signposting

Guide the interviewer through your thinking:

```
"Let me start by clarifying the requirements..."
"Before diving in, let me do some quick math..."
"At a high level, the system looks like..."
"Let me deep dive into the most critical component..."
"The main trade-off here is..."
"An alternative approach would be..."
```

### Handling "What About X?" Questions

When challenged:

1. **Acknowledge**: "That's a great point..."
2. **Consider**: "Let me think about how X affects..."
3. **Respond**: Either adapt your design or explain why it's okay

```
Interviewer: "What if the cache goes down?"

You: "Great question. If Redis fails, we have a few options:
1. Fallback to database (increased latency, but works)
2. Use Redis Cluster for HA (preferred for production)
3. Circuit breaker to prevent cascade failures

For this scale, I'd recommend Redis Cluster with automatic failover."
```

---

## Common Pitfalls

### 1. Premature Optimization

**Problem**: Designing for 10M users when you have 1K

**Fix**: Start simple, identify bottlenecks, then optimize

```
❌ "We'll need a sharded database cluster from day one"
✅ "For our current scale, a single primary with read replicas works.
    When we hit X QPS, we'd introduce sharding."
```

### 2. Solution Before Problem

**Problem**: Jumping to "let's use Kafka" without explaining why

**Fix**: Always state the problem first

```
❌ "We should add Kafka here"
✅ "We have spiky write traffic and need to smooth it out.
    A message queue like Kafka would buffer writes and
    let us process at a sustainable rate."
```

### 3. Ignoring Failure Modes

**Problem**: Assuming everything works

**Fix**: For each component, ask "what if this fails?"

```
Component → Failure Mode → Mitigation
Database  → Primary down → Automatic failover to replica
Cache     → Miss storm   → Circuit breaker + rate limiting
Queue     → Backlog      → Alerting + auto-scaling consumers
```

### 4. Over-Complicating

**Problem**: Adding microservices, event sourcing, CQRS for a simple app

**Fix**: Justify every component

```
❌ 15 microservices for a blog platform
✅ Monolith that can be decomposed later if needed
```

### 5. Not Communicating

**Problem**: Thinking silently, then presenting a final design

**Fix**: Think out loud throughout

```
"I'm considering two approaches here..."
"Let me weigh the trade-offs..."
"I'm going to make an assumption that..."
```

---

## Building Intuition

### Study Real Systems

Learn from how these companies solved problems:

| Problem | Company | Key Insight |
|---------|---------|-------------|
| News Feed | Facebook | Fan-out on write vs read |
| Search | Google | Inverted index, PageRank |
| Messaging | WhatsApp | End-to-end encryption, minimal server storage |
| Ride matching | Uber | Geospatial indexing, real-time matching |
| Video streaming | Netflix | CDN, adaptive bitrate |
| Social graph | LinkedIn | Graph database, connection degrees |

### Practice Patterns

Common patterns appear repeatedly:

| Pattern | Use Case | Example |
|---------|----------|---------|
| Fan-out | Distribute to many | Feed updates, notifications |
| Fan-in | Aggregate from many | Analytics, search indexing |
| Scatter-gather | Parallel queries | Distributed search |
| Event sourcing | Audit trail | Banking, order systems |
| CQRS | Different read/write | High-read dashboards |
| Saga | Distributed transactions | Order fulfillment |

### The "What Would Happen If..." Game

Regularly ask yourself:

- What if traffic 10x'd overnight?
- What if the database crashed?
- What if a region went down?
- What if this became viral?
- What if we needed to add feature X?

### Build Mental Benchmarks

Know rough performance characteristics:

```
Memory access:              100 ns
SSD read:                   100 μs
Network round-trip (DC):    500 μs
Network round-trip (coast): 40 ms
Disk seek:                  10 ms

Redis read:                 < 1 ms
Database simple query:      1-10 ms
Database complex query:     10-100 ms
API call:                   50-500 ms
```

---

## Key Takeaways

### The Mindset Checklist

Before your interview, review:

- [ ] I will clarify requirements before designing
- [ ] I will do back-of-envelope math
- [ ] I will start simple and iterate
- [ ] I will explicitly state trade-offs
- [ ] I will think out loud
- [ ] I will consider failure modes
- [ ] I will justify every component

### The Architect's Mantra

```
"Simple systems are easier to understand, debug, and scale.
 Complexity should be earned, not assumed."
```

### Remember

- **It's a conversation**, not an exam
- **There's no single right answer**, only trade-offs
- **Show your thinking process**, not just conclusions
- **Stay calm**, take a breath, structure your thoughts
