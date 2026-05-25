# System Design Interview Preparation Guide

> **Goal**: Master the art of designing large-scale distributed systems. This guide covers everything from foundational concepts to hands-on exercises for system design interviews.

## Learning Path

### Foundation (Start Here)
| # | Topic | Description | Time |
|---|-------|-------------|------|
| 1 | [System Design Mindset](./00-system-design-mindset.md) | How architects think, interview framework, communication strategies | 1-2 hrs |
| 2 | [Core Terminology](./01-core-terminology.md) | Essential terms every architect must know | 2-3 hrs |
| 3 | [Storage Fundamentals](./01-storage-fundamentals.md) | SQL vs NoSQL, ACID vs BASE, when to use what | 3-4 hrs |

### Core Patterns
| # | Topic | Description | Time |
|---|-------|-------------|------|
| 4 | [Scalability Patterns](./02-scalability-patterns.md) | Horizontal/vertical scaling, load balancing, sharding | 4-5 hrs |
| 5 | [Reliability & Fault Tolerance](./03-reliability-fault-tolerance.md) | High availability, failover, redundancy, chaos engineering | 3-4 hrs |
| 6 | [Networking Fundamentals](./04-networking-fundamentals.md) | Request flow, DNS, CDN, load balancers, protocols | 3-4 hrs |
| 7 | [Performance & Latency](./05-performance-latency.md) | Optimization techniques, profiling, bottleneck analysis | 2-3 hrs |

### Advanced Topics
| # | Topic | Description | Time |
|---|-------|-------------|------|
| 8 | [CAP Theorem & Consistency](./06-cap-theorem-consistency.md) | Distributed systems trade-offs, eventual consistency | 2-3 hrs |
| 9 | [Rate Limiting & API Design](./07-rate-limiting-api-design.md) | Throttling algorithms, API gateway patterns | 2-3 hrs |
| 10 | [Security in Distributed Systems](./08-security-distributed-systems.md) | Authentication, authorization, encryption at scale | 2-3 hrs |

### Practice
| # | Topic | Description | Time |
|---|-------|-------------|------|
| 11 | [System Design Exercises](./09-system-design-exercises.md) | 10 classic problems with solutions | 10-20 hrs |
| 12 | [Interview Cheat Sheet](./10-interview-cheat-sheet.md) | Quick reference for interviews | 30 min |

---

## Quick Navigation

### By Interview Question Type

**"Design a system that..."**
- Social Feed → [Exercises: Twitter/Instagram](./09-system-design-exercises.md#1-design-twitter-feed)
- Messaging → [Exercises: WhatsApp](./09-system-design-exercises.md#3-design-whatsapp)
- File Storage → [Exercises: Dropbox](./09-system-design-exercises.md#2-design-dropbox)
- Video Streaming → [Exercises: YouTube](./09-system-design-exercises.md#10-design-youtube)

**"How would you handle..."**
- High traffic → [Scalability Patterns](./02-scalability-patterns.md)
- Failures → [Reliability & Fault Tolerance](./03-reliability-fault-tolerance.md)
- Slow performance → [Performance & Latency](./05-performance-latency.md)
- Inconsistent data → [CAP Theorem](./06-cap-theorem-consistency.md)

**"What's the difference between..."**
- SQL vs NoSQL → [Storage Fundamentals](./01-storage-fundamentals.md)
- Horizontal vs Vertical scaling → [Scalability Patterns](./02-scalability-patterns.md)
- Consistency vs Availability → [CAP Theorem](./06-cap-theorem-consistency.md)

### By Component

| Component | Primary Reference | Deep Dive |
|-----------|------------------|-----------|
| **Database** | [Storage Fundamentals](./01-storage-fundamentals.md) | Sharding, Replication, Indexing |
| **Cache** | [Scalability Patterns](./02-scalability-patterns.md#caching-strategies) | Write-through, Cache-aside, Invalidation |
| **Load Balancer** | [Networking](./04-networking-fundamentals.md) | Algorithms, L4 vs L7 |
| **Message Queue** | [Reliability](./03-reliability-fault-tolerance.md) | Kafka patterns in [messaging/](../messaging/) |
| **CDN** | [Networking](./04-networking-fundamentals.md) | Edge caching, Invalidation |
| **API Gateway** | [Rate Limiting](./07-rate-limiting-api-design.md) | Throttling, Authentication |

---

## The System Design Interview Framework

Use this framework for EVERY system design question:

### Step 1: Requirements Clarification (3-5 min)
```
Functional Requirements:
- What are the core features? (List 3-5)
- Who are the users?
- What are the use cases?

Non-Functional Requirements:
- Scale: DAU, requests/sec, data volume
- Latency: What's acceptable response time?
- Availability: What's the target uptime?
- Consistency: Strong or eventual?
```

### Step 2: Back-of-Envelope Estimation (2-3 min)
```
Traffic Estimation:
- DAU × actions/user = daily requests
- Daily requests / 86400 = avg QPS
- Peak QPS = avg × 10 (or × 3 for less spiky)

Storage Estimation:
- Size per record × records/day × retention days
- Include metadata overhead (indexes, logs)

Bandwidth Estimation:
- Request size × QPS = incoming bandwidth
- Response size × QPS = outgoing bandwidth
```

### Step 3: High-Level Design (5-10 min)
```
Start simple:
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Clients │────▶│   LB    │────▶│ Servers │
└─────────┘     └─────────┘     └─────────┘
                                     │
                                     ▼
                               ┌─────────┐
                               │   DB    │
                               └─────────┘

Then iterate:
- Add cache if read-heavy
- Add queue if write-heavy or async needed
- Add CDN if serving static content
- Split services if distinct domains
```

### Step 4: Deep Dive (15-20 min)
```
Pick 2-3 critical components based on problem:
- For feed systems: Fan-out strategy, ranking
- For messaging: Message delivery, presence
- For booking: Consistency, preventing double-booking
- For storage: Chunking, deduplication, sync

For each component, discuss:
- Data model and schema
- API design
- Algorithm/approach
- Trade-offs made
```

### Step 5: Address Bottlenecks (5 min)
```
Identify single points of failure
Discuss monitoring and alerting
Consider edge cases and failure modes
Propose scaling strategies
```

---

## Key Principles to Remember

### The 10 System Design Commandments

1. **Start Simple** - Don't prematurely optimize. Begin with monolith, scale when needed.

2. **Clarify Before Designing** - Wrong assumptions lead to wrong designs. Ask questions.

3. **Numbers Matter** - Back-of-envelope calculations drive architecture decisions.

4. **Trade-offs Are Everything** - There's no perfect solution. Know what you're giving up.

5. **Scale Reads First** - Most systems are read-heavy. Cache, replicate, denormalize.

6. **Async When Possible** - Queues decouple components and handle traffic spikes.

7. **Fail Gracefully** - Design for failure. Every component will fail eventually.

8. **Data Consistency Has Cost** - Strong consistency limits scalability and availability.

9. **Monitor Everything** - You can't fix what you can't measure.

10. **Keep It Simple** - Complexity is the enemy. Each component must justify its existence.

---

## Common Interview Mistakes to Avoid

| Mistake | Why It's Bad | What To Do Instead |
|---------|--------------|-------------------|
| Jumping into solution | Shows poor problem-solving skills | Spend 5 min on requirements |
| Over-engineering early | Wastes time, shows lack of judgment | Start simple, iterate |
| Ignoring trade-offs | Shows shallow understanding | Explicitly state pros/cons |
| Not doing estimations | Can't justify architecture choices | Always do back-of-envelope |
| Single technology focus | Real systems use multiple tools | Know when to use what |
| Forgetting failure modes | Systems fail, designs must handle it | Discuss failover, redundancy |
| Poor communication | Interviewer can't follow your thinking | Think out loud, draw diagrams |

---

## Related Resources

### In This Repository
- [Microservices Architecture](../microservices/) - Service decomposition, communication patterns
- [Kafka Deep Dive](../messaging/kafka-interview-questions.md) - Message queue patterns

### External Resources
- [System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
- [Designing Data-Intensive Applications](https://dataintensive.net/) - The definitive book
- [ByteByteGo](https://bytebytego.com/) - Visual system design guides

---

## Study Plan

### Week 1: Foundations
- Day 1-2: [System Design Mindset](./00-system-design-mindset.md) + [Terminology](./01-core-terminology.md)
- Day 3-4: [Storage Fundamentals](./01-storage-fundamentals.md)
- Day 5-7: [Scalability Patterns](./02-scalability-patterns.md)

### Week 2: Core Patterns
- Day 1-2: [Reliability & Fault Tolerance](./03-reliability-fault-tolerance.md)
- Day 3-4: [Networking Fundamentals](./04-networking-fundamentals.md)
- Day 5-6: [Performance & Latency](./05-performance-latency.md)
- Day 7: [CAP Theorem](./06-cap-theorem-consistency.md)

### Week 3: Practice
- Day 1-5: Work through [System Design Exercises](./09-system-design-exercises.md) (2 per day)
- Day 6-7: Review, mock interviews with [Cheat Sheet](./10-interview-cheat-sheet.md)

### Ongoing
- Practice explaining designs out loud
- Time yourself (45 min per problem)
- Review and iterate on weak areas
