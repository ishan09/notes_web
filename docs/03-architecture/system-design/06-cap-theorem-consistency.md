# CAP Theorem & Consistency Models

> **The Fundamental Trade-off**: In distributed systems, you cannot have everything. Understanding consistency trade-offs is essential for making informed architectural decisions.

## Table of Contents
1. [CAP Theorem Explained](#cap-theorem-explained)
2. [Consistency Models](#consistency-models)
3. [PACELC: Beyond CAP](#pacelc-beyond-cap)
4. [Practical Consistency Patterns](#practical-consistency-patterns)
5. [Consensus Algorithms](#consensus-algorithms)
6. [Common Interview Questions](#common-interview-questions)

---

## CAP Theorem Explained

### The Three Properties

```
┌─────────────────────────────────────────────────────────────┐
│                      CAP THEOREM                            │
│                                                             │
│   Choose any TWO (but not all three) during partition:      │
│                                                             │
│                    Consistency                              │
│                       /\                                    │
│                      /  \                                   │
│                     /    \                                  │
│                    / (CP) \                                 │
│                   /________\                                │
│                  /          \                               │
│         Availability ──────── Partition                     │
│                   \   (AP)   /  Tolerance                  │
│                    \_______/                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Definitions

| Property | Definition | Example |
|----------|------------|---------|
| **Consistency** | All nodes see the same data at the same time | Read after write returns latest value |
| **Availability** | Every request receives a response | System never says "service unavailable" |
| **Partition Tolerance** | System operates despite network failures | Nodes can't communicate but system works |

### The Reality: P is Not Optional

```
Network partitions WILL happen:
- Hardware failures
- Network congestion
- Software bugs
- Human error

Since P must be tolerated, you're really choosing between:

CP (Consistent + Partition Tolerant):
  During partition → Refuse to serve (unavailable)
  Example: Banking systems, inventory

AP (Available + Partition Tolerant):
  During partition → Serve potentially stale data
  Example: Social media feeds, DNS
```

### CP vs AP Examples

```
CP System (e.g., ZooKeeper, etcd):

Normal operation:
  Client → Node A: "Write X=5"
  Node A → Node B, C: "Replicate X=5"
  All nodes: X=5 ✓
  Client: "Success"

During partition:
  Client → Node A: "Write X=10"
  Node A: "Can't reach majority, refusing write"
  Client: "Error: Service Unavailable"

Guarantees: Data always consistent
Trade-off: May be unavailable during partition

──────────────────────────────────────────────────

AP System (e.g., Cassandra, DynamoDB):

Normal operation:
  Client → Node A: "Write X=5"
  Node A: X=5, replicates async
  Client: "Success"

During partition:
  Client 1 → Node A: "Write X=10"
  Client 2 → Node B: "Write X=20" (partition, can't sync)
  Both succeed!
  After partition heals: Conflict resolution needed

Guarantees: Always available
Trade-off: May return stale/inconsistent data
```

### Real-World System Classifications

| System | Type | Why |
|--------|------|-----|
| PostgreSQL (single node) | CA* | No partition tolerance |
| MySQL + Replication | CP | Blocks on sync replication |
| Cassandra | AP | Tunable, but designed for availability |
| MongoDB | CP | Primary required for writes |
| DynamoDB | AP | Highly available, eventually consistent |
| Redis Cluster | CP | Requires majority for failover |
| CockroachDB | CP | Serializable transactions |
| Riak | AP | Built for availability |

*CA only possible without network partitions (single node or perfect network)

---

## Consistency Models

### The Consistency Spectrum

```
Strongest ────────────────────────────────────► Weakest

Linearizable → Sequential → Causal → Eventual → None
     │              │          │          │
  Banking      Multi-user   Social    Caching
  Trading       editing      feeds
```

### Linearizability (Strongest)

```
Definition: Operations appear instantaneous and in real-time order

Timeline:
Client A: |--write(X=1)--|
Client B:        |--read(X)--|---> Must return 1

If write completes before read starts, read MUST see write.

Provides: "Recency guarantee"
Cost: High latency (must synchronize)
Use for: Financial transactions, leader election
```

### Sequential Consistency

```
Definition: All operations appear in SOME sequential order,
           consistent across all processes.

Timeline:
Client A: write(X=1) ─── read(Y)
Client B: write(Y=2) ─── read(X)

Valid orderings:
1. A.write → B.write → A.read → B.read
2. A.write → B.write → B.read → A.read
3. B.write → A.write → A.read → B.read
etc.

All clients must see SAME ordering (but not necessarily real-time)
```

### Causal Consistency

```
Definition: Causally related operations seen in same order by all.

Causally related:
- Process writes X, then writes Y
- Process reads X, then writes Y
- Transitive: A→B and B→C means A→C

Example:
Alice posts: "I got the job!"
Bob (sees post): "Congratulations!"

Causal consistency guarantees:
- Anyone who sees Bob's reply also sees Alice's post
- NOT guaranteed: When they see it (could be delayed)
```

### Eventual Consistency

```
Definition: If no new updates, all replicas eventually converge.

Timeline:
t=0:   Node A writes X=5
t=1:   Node A has X=5, Node B has X=0 (old)
t=2:   Node A has X=5, Node B has X=5 (replicated)

Guarantees:
✓ Eventually all nodes agree
✗ No guarantee WHEN
✗ No guarantee what you read during inconsistency

Variants:
- Read-your-writes: You see your own writes immediately
- Monotonic reads: Once you see value, never see older
- Monotonic writes: Your writes applied in order
```

### Read-Your-Writes Consistency

```
Problem: User writes, immediately reads, sees old data

User writes profile update → Redirected to different server
                          → Server doesn't have update yet
                          → User sees old profile 😕

Solutions:
1. Route reads to same server that handled write
2. Wait for replication before acknowledging write
3. Include version token, route to replica with that version
```

### Monotonic Reads

```
Problem: User reads value, refreshes, sees OLDER value

User reads balance: $100 (from Replica A)
User refreshes:     $90  (from Replica B, behind) 😕

Solution:
Track which replica user read from
Route subsequent reads to same or newer replica
```

---

## PACELC: Beyond CAP

### The PACELC Framework

```
CAP only considers behavior during partition.
PACELC adds: What about when there's NO partition?

If Partition:
  Choose Availability or Consistency (A or C)
Else (normal operation):
  Choose Latency or Consistency (L or C)

Full spectrum:
PA/EL: Sacrifice consistency for availability (partition) AND latency (normal)
PA/EC: Sacrifice consistency for availability, but consistent when possible
PC/EL: Consistent during partition, but favor latency normally
PC/EC: Maximum consistency always

Example systems:
DynamoDB: PA/EL (always fast, eventually consistent)
PNUTS:    PC/EL (consistent when partitioned, fast normally)
VoltDB:   PC/EC (maximum consistency)
Cassandra: PA/EL (tunable, but defaults to availability)
```

### Why PACELC Matters

```
Real-world scenario:

Your system spans US-East and US-West (80ms latency)

Option 1: Synchronous replication (PC/EC)
- Every write waits for both coasts
- Latency: 80ms minimum
- Consistency: Always consistent

Option 2: Async replication (PA/EL)
- Writes acknowledge immediately
- Latency: <10ms
- Consistency: Eventual (80ms window of inconsistency)

Option 3: Quorum (PA/EC)
- Write to local, async to remote
- Read from quorum
- Latency: Medium
- Consistency: Read sees recent writes
```

---

## Practical Consistency Patterns

### Quorum Reads/Writes

```
N = Total replicas
W = Write quorum (must acknowledge before success)
R = Read quorum (must query before returning)

Strong consistency: W + R > N

Example with N=3:
W=2, R=2: Overlap guaranteed

Write to nodes: A, B
Read from nodes: B, C

Node B has latest data, read returns it.

Tuning:
W=1, R=3: Fast writes, consistent reads (but slow)
W=3, R=1: Fast reads, consistent writes (but slow)
W=2, R=2: Balanced
```

### Last Write Wins (LWW)

```
Conflict resolution strategy: Most recent timestamp wins

Node A: X=5 at t=100
Node B: X=10 at t=101

After sync: X=10 (t=101 is newer)

Problems:
- Clock skew can cause "old" data to win
- Data loss (X=5 is silently dropped)

Mitigations:
- Vector clocks instead of timestamps
- Application-level conflict resolution
```

### Vector Clocks

```
Track causality, not just time.

Each node maintains: {node: counter}

Initial: A{}, B{}, C{}

Event at A: A{A:1}
Event at B: B{B:1}
A sends to B: B{A:1, B:2}
B sends to C: C{A:1, B:2, C:1}

Comparing vectors:
{A:1, B:2} < {A:1, B:3}     (B:2 < B:3)
{A:2, B:1} || {A:1, B:2}    (Concurrent, neither dominates)

Concurrent = Conflict → Need resolution strategy
```

### CRDTs (Conflict-free Replicated Data Types)

```
Data structures that automatically resolve conflicts.

Example: G-Counter (Grow-only counter)

Node A: {A:5, B:0, C:0}  → Increment → {A:6, B:0, C:0}
Node B: {A:0, B:3, C:0}  → Increment → {A:0, B:4, C:0}

Merge: Take max of each
Result: {A:6, B:4, C:0}
Total count: 10

Works regardless of merge order!

Other CRDTs:
- LWW-Register: Last write wins for values
- OR-Set: Add/remove sets
- G-Set: Grow-only sets
```

### Saga Pattern for Distributed Transactions

```
Problem: Transaction across multiple services

Order → Inventory → Payment → Shipping

If Payment fails, need to undo Inventory and Order.

Saga approach:
Each step has a compensating action:
1. Create Order         ↔ Cancel Order
2. Reserve Inventory    ↔ Release Inventory
3. Charge Payment       ↔ Refund Payment
4. Ship Item           ↔ Cancel Shipment

On failure at step 3:
Execute compensations in reverse:
  Release Inventory → Cancel Order

Types:
- Choreography: Services react to events
- Orchestration: Central coordinator manages flow
```

---

## Consensus Algorithms

### Why Consensus Matters

```
Distributed systems need agreement on:
- Who is the leader?
- What is the current value?
- What is the transaction order?

Without consensus:
Node A thinks: "I am leader"
Node B thinks: "I am leader"
Both accept writes → Data diverges
```

### Paxos (Simplified)

```
Roles:
- Proposers: Propose values
- Acceptors: Accept/reject proposals
- Learners: Learn chosen value

Basic Paxos (single value):

Phase 1: Prepare
Proposer → Acceptors: "Prepare proposal N"
Acceptors → Proposer: "Promise not to accept < N"
                      "Here's highest accepted so far"

Phase 2: Accept
Proposer → Acceptors: "Accept value V with proposal N"
Acceptors → Proposer: "Accepted" (if promise kept)

Consensus reached when majority accept.
```

### Raft (More Understandable)

```
States: Follower → Candidate → Leader

Leader Election:
1. Follower timeout → Becomes Candidate
2. Candidate requests votes from others
3. Majority votes → Becomes Leader
4. Leader sends heartbeats

Log Replication:
1. Client → Leader: "Append X"
2. Leader → Followers: "Append X to log"
3. Majority acknowledge
4. Leader commits X
5. Leader → Client: "Success"
6. Leader → Followers: "Commit X"

Key properties:
- Only one leader at a time (per term)
- Logs are consistent across nodes
- Committed entries are durable
```

### Practical Consensus Systems

| System | Algorithm | Use Case |
|--------|-----------|----------|
| **ZooKeeper** | ZAB (Paxos-like) | Coordination, config |
| **etcd** | Raft | K8s configuration |
| **Consul** | Raft | Service discovery |
| **CockroachDB** | Raft | Distributed SQL |

---

## Common Interview Questions

### Q1: Explain CAP theorem with a real-world example.

**Answer**:
```
CAP states that during a network partition, you must choose
between Consistency and Availability.

Real-world example: E-commerce inventory

Scenario: Two data centers, network partition occurs

CP approach (like a bank):
- User tries to buy last item
- System: "Can't verify inventory across DCs"
- Result: "Service temporarily unavailable"
- Pro: Never oversells
- Con: Lost sales during partition

AP approach (like Amazon):
- User tries to buy last item
- System: "OK!" (based on local view)
- Another user in other DC: "OK!" (same item)
- Result: Oversold! Must handle compensation
- Pro: Never rejects valid customers
- Con: Must handle conflicts

Real Amazon approach:
- AP for cart (always available)
- CP for payment (never double charge)
- Compensation for oversells (refund or backorder)
```

### Q2: What's the difference between strong and eventual consistency?

**Answer**:
```
Strong Consistency:
- All reads see most recent write
- Appears as if single copy of data
- Higher latency (must synchronize)

Timeline:
Write(X=1) completes at t=10
Read(X) at t=11 → Returns 1 (guaranteed)

Eventual Consistency:
- All replicas eventually converge
- Reads may return stale data temporarily
- Lower latency (no synchronization)

Timeline:
Write(X=1) completes at t=10
Read(X) at t=11 → May return old value
Read(X) at t=100 → Returns 1 (eventually)

When to use:

Strong consistency:
- Financial transactions
- Inventory management
- User authentication

Eventual consistency:
- Social media feeds
- Product reviews
- Analytics
- DNS
```

### Q3: How would you design a globally distributed database?

**Answer**:
```
Key decisions:

1. Consistency model
   - Global transactions? → Strong consistency (high latency)
   - Per-region consistency? → Lower latency, conflicts possible

2. Replication strategy
   - Synchronous: Consistent, high latency
   - Asynchronous: Fast, eventual consistency
   - Quorum: Balance

3. Conflict resolution
   - Last write wins (simple, data loss possible)
   - Vector clocks (complex, preserves causality)
   - CRDTs (automatic merge)
   - Application-level (custom logic)

4. Architecture

   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  US-East    │◄──►│  US-West    │◄──►│   Europe    │
   │  Primary    │    │  Primary    │    │  Primary    │
   │  (Region 1) │    │  (Region 2) │    │  (Region 3) │
   └─────────────┘    └─────────────┘    └─────────────┘

Options:
A. Single leader: All writes to one region, sync globally
   Pro: Simple, consistent
   Con: High write latency for remote users

B. Multi-leader: Each region has leader, async sync
   Pro: Low latency writes
   Con: Must handle conflicts

C. Leaderless: Any node accepts writes, quorum
   Pro: Highly available
   Con: Complex, eventual consistency
```

### Q4: What is a split-brain problem and how do you prevent it?

**Answer**:
```
Split-brain: Network partition causes two leaders

Scenario:
┌─────────┐    PARTITION    ┌─────────┐
│ Node A  │ ══════════════ │ Node B  │
│ "I am   │                 │ "I am   │
│ leader" │                 │ leader" │
└─────────┘                 └─────────┘

Both accept writes → Data diverges!

Prevention strategies:

1. Quorum/Majority
   Need majority of nodes to elect leader
   With 5 nodes: Need 3+ to agree
   Partition can only have one majority

2. Fencing tokens
   Leader gets monotonic token
   Old leader's token rejected by storage

3. STONITH (Shoot The Other Node In The Head)
   When partition detected, kill other node
   Brutal but effective

4. Lease-based leadership
   Leader must renew lease periodically
   Partition → Lease expires → No leader
   After partition heals → Re-elect
```

### Q5: How does eventual consistency work in practice?

**Answer**:
```
Mechanisms for eventual consistency:

1. Anti-entropy (background sync)
   Nodes periodically compare and sync
   Uses Merkle trees for efficient comparison

2. Read repair
   On read, compare across replicas
   Fix any inconsistencies found

3. Hinted handoff
   If target node is down, another stores "hint"
   When target recovers, hint is delivered

4. Conflict resolution (when writes conflict)

   Strategies:
   a. Last-write-wins: Timestamp decides
      Pro: Simple
      Con: Clock skew, data loss

   b. Vector clocks: Track causality
      Pro: Detects true conflicts
      Con: Complex, metadata overhead

   c. CRDTs: Mathematically mergeable
      Pro: Automatic resolution
      Con: Limited data types

   d. Application resolution
      Pro: Business logic decides
      Con: Complexity in app

Guarantees you CAN provide:
- Read-your-writes: You see your writes
- Monotonic reads: Never see older data after newer
- Consistent prefix: See causally ordered writes

Example: Cassandra
- Tunable consistency (ONE, QUORUM, ALL)
- Last-write-wins default
- Anti-entropy with Merkle trees
- Read repair on reads
```

---

## Key Takeaways

### Decision Framework

```
Choosing consistency level:

1. What happens if user sees stale data?
   Unacceptable → Strong consistency
   Annoying but OK → Eventual with read-your-writes
   No problem → Eventual

2. What's the write pattern?
   Single region writes → Strong consistency easier
   Multi-region writes → Eventual or conflict resolution

3. What's the latency requirement?
   < 10ms → Must use local replicas (eventual)
   < 100ms → Regional sync possible
   No strict requirement → Strong consistency OK

4. What's the partition tolerance need?
   Must always serve → AP (eventual)
   Can refuse during partition → CP (strong)
```

### The Consistency Checklist

```
For each data type in your system, decide:

□ Can I tolerate stale reads?
□ What's the staleness window I can accept?
□ Do I need read-your-writes?
□ What happens on conflict?
□ What's my latency budget?
□ What's my availability requirement?

Document these decisions explicitly!
```
