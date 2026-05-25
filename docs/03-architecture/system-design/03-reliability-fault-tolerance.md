# Reliability & Fault Tolerance

> **Core Principle**: Everything fails. Networks partition, servers crash, disks corrupt. The goal isn't preventing failure—it's designing systems that survive failure gracefully.

## Table of Contents
1. [What is Reliability?](#what-is-reliability)
2. [Fault Tolerance Fundamentals](#fault-tolerance-fundamentals)
3. [High Availability Patterns](#high-availability-patterns)
4. [Redundancy Strategies](#redundancy-strategies)
5. [Failover Mechanisms](#failover-mechanisms)
6. [Resilience Patterns](#resilience-patterns)
7. [Disaster Recovery](#disaster-recovery)
8. [Chaos Engineering](#chaos-engineering)
9. [Common Interview Questions](#common-interview-questions)

---

## What is Reliability?

### Definition
A system is **reliable** if it continues to work correctly even when things go wrong.

**Correct** means:
- Performing the function the user expected
- Tolerating user mistakes or unexpected usage
- Performance is good enough for the use case
- Preventing unauthorized access and abuse

### Reliability vs Availability

| Concept | Definition | Metric |
|---------|------------|--------|
| **Reliability** | System works correctly over time | MTBF, failure rate |
| **Availability** | System is accessible when needed | Uptime percentage |

**Example**: A system with 99.9% availability might still be unreliable if it returns incorrect results 5% of the time.

### Types of Faults

```
┌─────────────────────────────────────────────────────────────┐
│                       FAULT TYPES                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Hardware      │    Software     │       Human             │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Disk failure  │ • Bugs          │ • Configuration errors  │
│ • Memory errors │ • Resource leak │ • Accidental deletion   │
│ • Network cards │ • Deadlocks     │ • Incorrect procedures  │
│ • Power outage  │ • Race conditions│ • Security breaches    │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Failure Metrics

```
MTBF = Mean Time Between Failures
     = Total operational time / Number of failures

MTTR = Mean Time To Recovery
     = Total downtime / Number of failures

Availability = MTBF / (MTBF + MTTR)
```

**Example**:
```
System runs 8,760 hours/year
Fails 4 times with total downtime of 4 hours

MTBF = 8,760 / 4 = 2,190 hours
MTTR = 4 / 4 = 1 hour
Availability = 2,190 / 2,191 = 99.95%
```

---

## Fault Tolerance Fundamentals

### The Fault Tolerance Spectrum

```
No Tolerance          Graceful Degradation          Full Tolerance
     │                        │                           │
     ▼                        ▼                           ▼
[System Crash]    [Reduced Functionality]    [No User Impact]
     │                        │                           │
   Single               Feature flags,              Hot standby,
   server               fallbacks                  auto-failover
```

### Key Principles

#### 1. Design for Failure
```
Ask for every component:
- What happens when this fails?
- How do we detect the failure?
- How do we recover?
- What's the blast radius?
```

#### 2. Fail Fast
```
// Bad: Hide errors, continue with bad state
try {
    result = dangerousOperation()
} catch (e) {
    result = null  // Silent failure
}

// Good: Fail immediately, let caller handle
result = dangerousOperation()  // Throws on failure
```

#### 3. Limit Blast Radius
```
Without isolation:
[Service A fails] → [Cascading failure] → [Entire system down]

With isolation:
[Service A fails] → [Only Service A affected] → [Rest continues]
```

### Failure Modes

| Mode | Description | Example |
|------|-------------|---------|
| **Crash failure** | Server stops responding | Process killed, OOM |
| **Omission failure** | Messages lost | Network drop, queue full |
| **Timing failure** | Response too slow | Overloaded server |
| **Response failure** | Wrong answer | Bug, data corruption |
| **Byzantine failure** | Arbitrary behavior | Hacked server, bugs |

---

## High Availability Patterns

### Active-Passive (Hot Standby)

```
                    ┌─────────────┐
                    │   Active    │ ← Handles all traffic
                    │   Server    │
                    └──────┬──────┘
                           │ health check
                           ▼
                    ┌─────────────┐
                    │  Passive    │ ← Standby, ready to take over
                    │   Server    │
                    └─────────────┘
```

**How it works**:
1. Active server handles all requests
2. Passive server stays synchronized (replication)
3. Health checks monitor active server
4. On failure, passive becomes active

**Trade-offs**:
- ✅ Simple to implement
- ✅ No split-brain risk
- ❌ Wasted resources (passive idle)
- ❌ Failover takes time

### Active-Active

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │   Server 1  │         │   Server 2  │
       │   (Active)  │         │   (Active)  │
       └─────────────┘         └─────────────┘
```

**How it works**:
1. All servers handle traffic
2. Load balancer distributes requests
3. If one fails, others absorb its load
4. No explicit failover needed

**Trade-offs**:
- ✅ Better resource utilization
- ✅ Faster failover (no promotion needed)
- ❌ More complex (need to handle concurrent writes)
- ❌ Risk of data inconsistency

### Multi-Region Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                     Global Load Balancer                    │
│                    (DNS-based routing)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ US-East  │    │ US-West  │    │  Europe  │
    │  Region  │    │  Region  │    │  Region  │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┴───────────────┘
                    Cross-region
                    replication
```

**Trade-offs**:
- ✅ Survives entire region failure
- ✅ Lower latency for global users
- ❌ Very complex to implement
- ❌ Expensive (3x infrastructure)
- ❌ Consistency challenges

### N+1 Redundancy

```
Minimum required for load: N servers
Deployed: N+1 servers

Example:
- Need 3 servers to handle peak load
- Deploy 4 servers
- If 1 fails, remaining 3 still handle load
```

---

## Redundancy Strategies

### Data Redundancy

#### Replication Topologies

**Single Leader (Master-Slave)**:
```
         ┌─────────┐
         │  Leader │ ← All writes
         └────┬────┘
              │ replication
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│Follower│ │Follower│ │Follower│ ← Reads
└───────┘ └───────┘ └───────┘
```

**Multi-Leader**:
```
┌─────────┐         ┌─────────┐
│ Leader  │◄───────►│ Leader  │
│  (DC1)  │         │  (DC2)  │
└────┬────┘         └────┬────┘
     │                   │
   Reads              Reads
```

**Leaderless (Dynamo-style)**:
```
┌─────────┐   ┌─────────┐   ┌─────────┐
│  Node A │◄─►│  Node B │◄─►│  Node C │
└─────────┘   └─────────┘   └─────────┘
    ▲             ▲             ▲
    └─────────────┼─────────────┘
                  │
            Client writes to
            multiple nodes
```

#### Synchronous vs Asynchronous Replication

| Type | Consistency | Performance | Use Case |
|------|-------------|-------------|----------|
| **Synchronous** | Strong | Slower (wait for replicas) | Financial transactions |
| **Asynchronous** | Eventual | Faster | Social media, analytics |
| **Semi-sync** | Middle ground | Medium | Most production systems |

### Compute Redundancy

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                           │
│              (Redundant: Active-Passive pair)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌───────────┐       ┌───────────┐       ┌───────────┐
│  Server 1 │       │  Server 2 │       │  Server 3 │
│  (Zone A) │       │  (Zone B) │       │  (Zone C) │
└───────────┘       └───────────┘       └───────────┘
```

### Network Redundancy

```
┌──────────────────┐
│     Server       │
│  ┌────┐  ┌────┐  │
│  │NIC1│  │NIC2│  │ ← Dual network cards
│  └──┬─┘  └──┬─┘  │
└─────┼───────┼────┘
      │       │
      ▼       ▼
  ┌──────┐ ┌──────┐
  │ ISP1 │ │ ISP2 │ ← Dual ISPs
  └──────┘ └──────┘
```

---

## Failover Mechanisms

### Health Checks

```
┌─────────────────────────────────────────────────────────────┐
│                     Health Check Types                       │
├─────────────────┬───────────────────────────────────────────┤
│ TCP Check       │ Can connect to port?                      │
│ HTTP Check      │ GET /health returns 200?                  │
│ Command Check   │ Script returns exit code 0?               │
│ Deep Check      │ Can query DB, reach dependencies?         │
└─────────────────┴───────────────────────────────────────────┘
```

**Health Endpoint Design**:
```json
GET /health

Response:
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "latency_ms": 5 },
    "cache": { "status": "up", "latency_ms": 1 },
    "queue": { "status": "up", "messages_pending": 142 }
  },
  "version": "1.2.3"
}
```

### Automatic Failover

```
Timeline of automatic failover:

T=0:   Primary healthy, serving traffic
T=10s: Primary becomes unresponsive
T=11s: Health check fails (1st)
T=12s: Health check fails (2nd)
T=13s: Health check fails (3rd) → Threshold reached
T=14s: Failover initiated
T=15s: Secondary promoted to primary
T=16s: DNS/LB updated, traffic redirected
T=17s: New primary serving traffic

Total downtime: ~7 seconds
```

### Split-Brain Problem

**What is it?**
When network partitions cause both nodes to think they're the leader.

```
Network partition:
┌─────────┐    ╳    ┌─────────┐
│ Node A  │◄──────►│ Node B  │
│ "I am   │         │ "I am   │
│ leader" │         │ leader" │
└─────────┘         └─────────┘
     ↑                   ↑
   Writes              Writes
   (diverging data!)
```

**Solutions**:
1. **Quorum**: Require majority to elect leader
2. **STONITH**: "Shoot The Other Node In The Head" - force kill old leader
3. **Fencing tokens**: Monotonic tokens to reject old leader's writes

### Manual Failover Procedures

```
Pre-failover checklist:
□ Verify secondary is in sync (replication lag = 0)
□ Notify on-call team
□ Prepare rollback plan
□ Check maintenance windows

Failover steps:
1. Stop writes to primary
2. Wait for replication to catch up
3. Promote secondary
4. Update routing (DNS, LB)
5. Verify service health
6. Monitor for issues

Rollback (if needed):
1. Route traffic back to old primary
2. Investigate what went wrong
3. Re-sync and retry
```

---

## Resilience Patterns

### Circuit Breaker

Prevents cascading failures by stopping calls to failing services.

```
States:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   CLOSED ──(failures exceed threshold)──► OPEN            │
│      ▲                                       │             │
│      │                                       │             │
│  (success)                             (timeout)           │
│      │                                       │             │
│      └────────── HALF-OPEN ◄─────────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘

CLOSED: Normal operation, requests pass through
OPEN: Fail fast, don't even try calling service
HALF-OPEN: Test with limited requests
```

**Configuration**:
```
failure_threshold: 5       # Failures before opening
success_threshold: 3       # Successes before closing
timeout: 30s               # Time in OPEN before HALF-OPEN
```

### Bulkhead

Isolates failures to prevent system-wide impact.

```
Without bulkhead:
┌─────────────────────────────────────────┐
│            Shared Thread Pool           │
│  [T1] [T2] [T3] ... [T100]              │
│   ↓    ↓    ↓        ↓                  │
│  All threads stuck on slow Service A    │
│  Service B, C can't get threads!        │
└─────────────────────────────────────────┘

With bulkhead:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Service A   │ │ Service B   │ │ Service C   │
│ Pool (20)   │ │ Pool (20)   │ │ Pool (20)   │
│ [........]  │ │ [........]  │ │ [........]  │
│ (can fail)  │ │ (isolated)  │ │ (isolated)  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Retry with Backoff

```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Attempt 5: Wait 8 seconds
Attempt 6: Give up

With jitter (randomization):
Wait time = base_delay * 2^attempt + random(0, 1000ms)

Why jitter? Prevents thundering herd when many clients retry simultaneously.
```

### Timeout Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                    Timeout Hierarchy                        │
├─────────────────────────────────────────────────────────────┤
│ Connection timeout:  Time to establish connection (1-5s)   │
│ Read timeout:        Time to receive response (5-30s)      │
│ Request timeout:     Total time for full request (30-60s)  │
│ Circuit timeout:     Time before retry (30-60s)            │
└─────────────────────────────────────────────────────────────┘

Rule: Inner timeout < Outer timeout

Service A (timeout: 30s)
  └─► Service B (timeout: 10s)
        └─► Service C (timeout: 3s)
```

### Fallback Strategies

```
Primary path fails → Try fallback

Examples:
1. Cache miss → Query database
2. Real-time calculation → Return cached result
3. Third-party API down → Use local default
4. Feature unavailable → Show degraded UI

Fallback chain:
Try primary
  └─► Fallback 1 (cached response)
        └─► Fallback 2 (default value)
              └─► Fallback 3 (error message)
```

### Rate Limiting (as resilience)

```
Protect your system from overload:

                    ┌─────────────┐
 Requests ─────────►│ Rate Limiter│────► Service
 (100K RPS)         │ (10K limit) │      (10K capacity)
                    └──────┬──────┘
                           │
                           ▼
                    Excess rejected
                    with 429 Too Many Requests
```

---

## Disaster Recovery

### Recovery Objectives

```
                    Disaster
                        │
    ◄───────────────────┼───────────────────►
         RPO            │         RTO
    (data you lose)     │    (time to recover)
                        │
◄────────────────────────────────────────────►
Past data              Now              Future uptime
```

**RPO (Recovery Point Objective)**: Maximum acceptable data loss
- RPO = 0: No data loss (synchronous replication)
- RPO = 1 hour: Can lose up to 1 hour of data

**RTO (Recovery Time Objective)**: Maximum acceptable downtime
- RTO = 0: No downtime (hot standby)
- RTO = 4 hours: Can be down up to 4 hours

### DR Strategies

| Strategy | RTO | RPO | Cost |
|----------|-----|-----|------|
| **Backup & Restore** | Hours-Days | Hours | $ |
| **Pilot Light** | Minutes-Hours | Minutes | $$ |
| **Warm Standby** | Minutes | Seconds | $$$ |
| **Hot Standby** | Seconds | Near-zero | $$$$ |
| **Multi-Active** | Zero | Zero | $$$$$ |

### Backup Strategies

```
Full Backup:        [████████████████] Complete copy, slow
Incremental:        [████]            Only changes since last backup
Differential:       [████████]        Changes since last full backup

Schedule example:
Sunday:    Full backup
Mon-Sat:   Incremental backups

Restore: Full + all incrementals since
```

**3-2-1 Rule**:
- 3 copies of data
- 2 different storage media
- 1 offsite location

### DR Testing

```
Test Type           Frequency    Impact
─────────────────────────────────────────
Tabletop exercise   Quarterly    None (discussion only)
Walkthrough         Monthly      None (review procedures)
Simulation          Quarterly    Minimal (test components)
Full failover       Annually     Significant (actual switch)
```

---

## Chaos Engineering

### Principles

```
"The discipline of experimenting on a system to build confidence
in the system's capability to withstand turbulent conditions in
production." - Chaos Engineering Manifesto
```

### The Chaos Engineering Loop

```
1. Define steady state (normal metrics)
        │
        ▼
2. Hypothesize that steady state continues during chaos
        │
        ▼
3. Introduce chaos (kill instance, inject latency)
        │
        ▼
4. Compare steady state vs actual behavior
        │
        ▼
5. Disprove hypothesis = find weakness = improve
```

### Types of Chaos Experiments

| Category | Experiments |
|----------|-------------|
| **Infrastructure** | Kill instance, fill disk, CPU stress |
| **Network** | Latency injection, packet loss, DNS failure |
| **Application** | Memory leak, exception injection, slow queries |
| **Dependencies** | Kill database, slow API, corrupt cache |

### Chaos Tools

```
Chaos Monkey:     Randomly kills instances
Latency Monkey:   Adds artificial latency
Chaos Kong:       Simulates region failure
Gremlin:          Commercial chaos platform
Litmus:           Kubernetes-native chaos
```

### Starting with Chaos Engineering

```
Level 1: Development environment
- Kill single instance
- Inject latency

Level 2: Staging environment
- Kill multiple instances
- Network partitions

Level 3: Production (GameDay)
- Controlled experiments
- Full team prepared

Level 4: Continuous chaos
- Automated random failures
- Always-on resilience testing
```

---

## Common Interview Questions

### Q1: How would you design a system for 99.99% availability?

**Answer Framework**:
```
99.99% = 52 minutes downtime per year

1. Redundancy at every layer:
   - Multiple app servers (N+2)
   - Database replication (primary + 2 replicas)
   - Multi-AZ deployment

2. Fast failover:
   - Health checks every 5 seconds
   - Automatic failover < 30 seconds
   - DNS TTL = 60 seconds

3. Resilience patterns:
   - Circuit breakers on all external calls
   - Bulkheads for isolation
   - Timeouts everywhere

4. Testing:
   - Regular DR drills
   - Chaos engineering in production
   - Runbook testing

5. Monitoring:
   - Real-time alerting
   - Automated remediation
   - On-call rotation
```

### Q2: What's the difference between fault tolerance and high availability?

**Answer**:
```
High Availability: System remains accessible (uptime)
- Focus on availability percentage (99.9%, 99.99%)
- Achieved through redundancy and failover
- May have brief interruption during failover

Fault Tolerance: System continues operating despite failures
- Focus on continuous operation
- No interruption even during failures
- More expensive (requires true redundancy)

Example:
- HA: If server dies, failover to backup in 30 seconds
- FT: If server dies, backup already serving, zero interruption

Most systems target HA. True FT is reserved for critical systems
(medical, aerospace, financial trading).
```

### Q3: How do you handle cascading failures?

**Answer**:
```
Cascading failure: One failure causes others

Service A → Service B → Service C
    │          │          │
    ▼          ▼          ▼
  Slow       Timeout    Timeout
             (queued)   (dead)

Prevention strategies:

1. Timeouts:
   - Set aggressive timeouts
   - Fail fast rather than queue

2. Circuit Breakers:
   - Stop calling failing services
   - Return cached/default response

3. Bulkheads:
   - Isolate thread pools per dependency
   - One service can't exhaust all resources

4. Rate limiting:
   - Shed load when overwhelmed
   - Protect core functionality

5. Fallbacks:
   - Graceful degradation
   - Return cached results

6. Monitoring:
   - Alert on error rate increase
   - Track latency percentiles
```

### Q4: Explain the trade-offs between sync and async replication.

**Answer**:
```
Synchronous Replication:
Write → Primary → Wait for Replica → Acknowledge

Pros:
- Strong consistency (no data loss)
- Read from any replica

Cons:
- Higher latency (wait for replica)
- Reduced availability (replica down = writes blocked)

─────────────────────────────────────────

Asynchronous Replication:
Write → Primary → Acknowledge → (Later) Replica

Pros:
- Lower latency
- Higher availability

Cons:
- Potential data loss (replica may be behind)
- Read from replica may return stale data

─────────────────────────────────────────

When to use:

Sync: Financial transactions, inventory updates
Async: Social media posts, analytics, logs

Hybrid: Semi-synchronous
- Wait for at least one replica
- Balance between consistency and performance
```

### Q5: How would you test disaster recovery?

**Answer**:
```
DR Testing Levels:

1. Documentation Review (Monthly)
   - Are runbooks up to date?
   - Contact lists current?
   - Procedures clear?

2. Tabletop Exercise (Quarterly)
   - Walk through scenarios verbally
   - Identify gaps in procedures
   - No actual systems affected

3. Component Test (Monthly)
   - Test backup restoration
   - Verify replication lag
   - Test individual failovers

4. Full Simulation (Semi-annually)
   - Fail over to DR site
   - Route traffic to secondary
   - Run production workload

5. Actual Disaster (Annually - GameDay)
   - Unannounced drill
   - Full team response
   - Measure actual RTO/RPO

Key metrics to measure:
- Time to detect (TTD)
- Time to respond (TTR)
- Time to recover (MTTR)
- Data loss (actual vs RPO)
```

---

## Key Takeaways

### Reliability Checklist

```
□ No single points of failure
□ Redundancy at every layer
□ Health checks and monitoring
□ Automatic failover configured
□ Circuit breakers on external calls
□ Timeouts on all network calls
□ Graceful degradation implemented
□ DR procedures documented and tested
□ Runbooks for common failures
□ On-call rotation established
```

### The Reliability Mindset

```
"Hope is not a strategy."
"Everything fails, all the time."
"Design for failure, not for success."
"If you haven't tested it, it doesn't work."
```
