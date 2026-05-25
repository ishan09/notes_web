# Distributed Nodes: Staff-Level Production Notes

Distributed Erlang/Elixir lets multiple BEAM nodes connect and communicate as one logical cluster. This enables some very powerful patterns, but it also introduces failure modes that many teams underestimate (especially partitions and “global singleton” assumptions).

The staff-level bar is:

- You can explain **why** you want distribution (and when you don’t).
- You can explain **how** nodes connect (naming, cookies, ports, discovery).
- You can design for **partial failure** without pretending you have a reliable LAN.
- You can discuss **tradeoffs**, anti-patterns, and operational management (Kubernetes, autoscaling, observability).

## Why Use Distributed Nodes (The Real Reasons)

Good reasons:

- **Real-time fan-out**: PubSub broadcasting to many local subscribers, sometimes across nodes.
- **Stateful concurrency patterns**: “one process per thing” can scale across nodes when ownership is sharded.
- **Locality and throughput**: keep work local to a node (ETS caches, CPU-bound tasks) while coordinating at a higher level.
- **Operational simplicity for some problems**: you can avoid building an external coordination layer for every small cross-node signal.

Bad reasons:

- “Because BEAM can do it, we should.” Distribution adds failure modes. If you do not need cross-node message passing or cluster-wide PubSub, a stateless HTTP cluster is often simpler and more robust.

## How It Works (What You Should Actually Understand)

### Node Identity (Names Matter)

A BEAM node has a name like `myapp@10.0.0.12` and runs with a distributed kernel. Nodes connect to each other based on:

- node name resolution (DNS/IP)
- a shared **cookie** (authentication)
- network reachability (ports)

In production, “node naming” is often the hardest part. Local dev works because everything is `localhost`. Production fails because IPs change and DNS is dynamic.

### Cookies (Authentication, Not Encryption)

Cookies are shared secrets used to authenticate nodes. Key implications:

- Wrong cookie => nodes cannot connect.
- Cookie leakage is a security incident (it grants cluster membership).
- Cookies do not magically make traffic secure; treat network boundaries and TLS as separate concerns.

### Ports and Firewalls (The Classic Prod Failure)

If you want nodes to connect, you must allow:

- the Erlang port mapper daemon (commonly `epmd`) port
- distribution ports used for node-to-node traffic

In container platforms, “it works in dev” often fails because:

- the cluster network blocks those ports
- nodes use ephemeral ports for distribution unless constrained

Production-grade practice:

- pin distribution port ranges using runtime configuration (so networking rules are tractable)
- explicitly document what must be open between pods/VMs

### Connection and Membership (Formation)

There are two problems:

1. **Discovery**: how do nodes find each other (Kubernetes, DNS, tags, etc.)?
2. **Connectivity**: once discovered, can they actually connect (ports/cookies/names)?

Most teams adopt a library for discovery rather than hand-rolling membership logic.

## Communication Primitives (And Their Semantics)

### Message Passing

Once connected, processes can `send(pid, msg)` to processes on other nodes. Staff-level understanding:

- message passing is reliable only while the connection is healthy
- the network is not reliable (partitions happen)
- large messages are expensive (copying/serialization + network)

### RPC

Remote function calls (via Erlang RPC mechanisms) are useful for operational commands and coordination, but they are dangerous in request paths:

- they are synchronous (unless you design around it)
- they can block under partitions
- they couple runtime behavior to network health

Rule of thumb:

- use RPC for admin/ops and controlled workflows, not per-request hot paths

### Registration and Lookup

You need a way to locate “the process that owns X”:

- local registration: cheap and safe (within node)
- distributed registration: tricky under partitions

Your design should treat “global naming” as a coordination system with failure modes, not as a convenience.

## Fundamental Failure Modes (What Staff Engineers Must Internalize)

### 1) Network Partitions (Split Brain)

A cluster can partition into sets of nodes that cannot communicate. Each side may continue operating.

Symptoms:

- duplicated “singleton” work on both sides
- inconsistent caches and inconsistent PubSub delivery
- stalled RPC calls and timeouts

The core mistake:

- assuming “cluster membership implies global consensus”

### 2) Partial Connectivity and Flapping

Nodes can connect/disconnect repeatedly due to:

- autoscaling
- network jitter
- DNS changes
- node upgrades

If your system treats nodeup/nodedown events as rare, it will be fragile.

### 3) N^2 Connectivity Growth

Default distributed Erlang tends toward full mesh connections. As node count grows, you can hit:

- connection scaling limits
- increased churn when nodes join/leave
- operational complexity

Staff-level stance:

- keep clusters modest in size, or use partitioning/subclusters, or use different coordination mechanisms for very large fleets

## Tradeoffs: When BEAM Distribution Helps vs Hurts

Helps when:

- you can tolerate eventual consistency for broadcasts
- you can shard ownership cleanly (each key has an owner node/process)
- you can keep cross-node traffic small and bounded

Hurts when:

- you need strict global invariants without an external coordinator
- you send large payloads frequently across nodes
- your design uses “global singletons” as core correctness mechanisms

## Production Patterns (What To Use)

### 1) Cluster-Wide PubSub (Eventual Consistency)

Pattern:

- broadcast small events (IDs, not payloads)
- each node reacts locally

Why this works:

- broadcasts are naturally “best effort”
- subscribers can refetch state if they miss an event

### 2) Sharded Ownership (“One Owner per Key”)

Pattern:

- choose a key (tenant/user/order)
- route key to an owner using consistent hashing
- owner runs a process (GenServer) that serializes state transitions

Why this works:

- avoids global locks
- isolates hotspots

### 3) Local ETS + Cross-Node Invalidation

Staff-level ETS truth:

- ETS is per node. It is not a distributed cache.

How it is used in clusters:

- keep a local cache in ETS
- propagate invalidations/updates via PubSub or messaging
- design for staleness (eventual consistency) and have a source of truth (DB)

### 4) Leader/Singleton Work (Do Not “Assume a Leader”)

If you need “only one node does X” (cron, periodic sync, compaction):

Option A (recommended often): **external coordination**

- DB advisory locks / row locks
- Redis-based locks (with careful semantics)
- a dedicated consensus system

Option B: “leader” within the cluster

- only safe if you design explicitly for partitions and duplicates
- require idempotency and durable checkpoints

Pragmatic staff advice:

- for business-critical singletons, use external coordination and idempotency
- if duplicates are acceptable, let it run on each node but dedupe at the data layer

Example: job systems that store jobs in a DB can often enforce uniqueness at insert time, which is a safer “singleton” than a global process name.

### 5) Distributed Registry and Supervision

If you need distributed process naming and failover, typical approaches include:

- built-in primitives like `:global` (simple, but risky under partitions and large clusters)
- group membership primitives like `:pg` (good for pubsub-style groups)
- libraries that provide distributed registry + distributed supervisor patterns (commonly used in the Elixir ecosystem)

Important tradeoff:

- “automatic failover of named processes across nodes” is hard. You can get duplicate processes during partitions unless you enforce invariants externally.

## Libraries and Ecosystem Patterns (What You Should Know Exists)

Discovery / auto-clustering:

- **libcluster**: common library used to form clusters in Kubernetes, DNS, and other environments using pluggable strategies.

Distributed registry/supervision patterns:

- **Horde**: commonly used for distributed registries and distributed supervisors (CRDT-inspired approaches). Useful, but still subject to partition semantics; you must reason about duplicates and convergence.

PubSub:

- **Phoenix PubSub**: widely used for topic-based broadcast. Works well when designed as eventual consistency.

Other notes:

- There are additional libraries and strategies in the ecosystem for naming/coordination; the key is understanding the semantics you are buying (eventual vs strict, partition behavior, operational complexity).

## Anti-Patterns (And How To Fix Them)

### Anti-pattern: Treating Distributed Calls as Local Calls

Smell:

- your request path does synchronous RPC to another node “because it’s easy”

Failure mode:

- partitions and jitter become request timeouts and cascading failures

Fix:

- keep request handling local; use async messaging; cache locally; design retries and timeouts explicitly

### Anti-pattern: “Global Singleton GenServer”

Smell:

- a single global named process that “coordinates everything”

Failure mode:

- becomes a bottleneck; partitions create duplicates; correctness collapses

Fix:

- shard by key; use per-node processes; enforce invariants in DB transactions; use external locks if truly needed

### Anti-pattern: Shipping Big Payloads Over the Cluster

Smell:

- sending large structs/maps over node links frequently

Failure mode:

- serialization cost, GC pressure, network amplification, mailbox growth

Fix:

- send IDs and fetch state locally; compress or batch when necessary; design bounded fan-out

### Anti-pattern: Using Distribution as a Replacement for Kafka/Queueing

Smell:

- using PubSub for durable work distribution

Failure mode:

- message loss on restart/partition; no replay; no durability

Fix:

- use a proper durable queue (DB-backed jobs, Kafka, RabbitMQ) when you need at-least-once or replay semantics

## Management and Operations (Prod Details)

### Kubernetes Cluster Formation (Reality)

In Kubernetes:

- pods come and go
- IPs change
- DNS can be slow or eventually consistent

Practical approach:

- use a discovery library (commonly libcluster)
- choose a strategy (DNS polling, Kubernetes API, etc.)
- make node names stable and resolvable (often based on pod IP or a resolvable hostname)
- ensure cookies and distribution ports are configured correctly

### Scaling Strategy

- keep cluster sizes modest when you rely on full mesh distribution
- scale horizontally by running more clusters (partition by tenant/region) if needed
- avoid cross-region clusters unless you fully accept the latency and partition behavior

### Handling Nodeup/Nodedown

You should:

- monitor node joins/leaves
- measure cluster size over time
- design workloads so node churn is routine, not exceptional

### Rolling Deployments and Version Skew

During deploys, you may have multiple versions running.

Staff-level rule:

- don’t ship incompatible cross-node message formats without a versioning story
- keep messages small, explicit, and backward compatible (tagged tuples with version tags, or maps with explicit fields)

## Common Questions (With Answers)

1. **Why distribute BEAM nodes instead of a stateless HTTP cluster?**
   Distribution is most valuable when you need cross-node messaging or cluster-wide PubSub to coordinate stateful processes. If your app is mostly stateless request/response, a standard HTTP cluster is usually simpler and has fewer failure modes.

2. **How do nodes authenticate?**
   Nodes authenticate with a shared cookie. Mismatched cookies prevent connections. Treat cookies as secrets and manage them like credentials.

3. **What is the biggest conceptual risk of distribution?**
   Network partitions. They break “global singleton” assumptions and can cause duplicate work, inconsistent caches, and blocked RPC calls.

4. **How do you send a message to another node?**
   Once nodes are connected, you can `send/2` to a remote PID. In practice you also need a naming/lookup strategy to find the right PID, and you must assume connectivity can fail.

5. **What’s a good first use case for distribution?**
   Cluster-wide PubSub for real-time UI updates where eventual consistency is acceptable and subscribers can refetch source-of-truth state.

## Advanced Questions (With Answers)

1. **What is split brain and why is it dangerous?**
   A partitioned cluster can form multiple independent “clusters.” If both sides perform leader-only work, you get duplicates and violated invariants. The fix is to design for partitions using idempotency and external coordination for strict singletons.

2. **Why is global registration risky?**
   It hides coordination in “naming.” Under partitions, global naming can produce duplicates or block, and your correctness becomes tied to cluster connectivity.

3. **How do you design for partitions pragmatically?**
   Decide which operations require strict global invariants (use DB locks/transactions) vs which can be eventually consistent (PubSub). Keep cross-node calls bounded, use timeouts, and make operations idempotent with durable checkpoints.

4. **What’s a production-safe approach for “one worker globally”?**
   Use external coordination (DB advisory locks, unique constraints, or a consensus system). If duplicates are acceptable, run on every node and dedupe at the data layer. Avoid “one global process name” as a correctness mechanism.

5. **What’s a common “works in dev, fails in prod” issue with nodes?**
   Node naming and connectivity. In dev everything is local; in prod your pods/hosts need stable naming, correct cookies, open ports, and a discovery strategy that handles churn and autoscaling.

6. **How do you scale beyond small clusters safely?**
   Keep clusters small, partition by tenant/region, avoid full mesh at large N, and push durable cross-service coordination to external systems where appropriate.
