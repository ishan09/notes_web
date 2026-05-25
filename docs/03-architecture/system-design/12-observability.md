# Observability: Metrics, Logging, Tracing & SLOs

<!-- TAG: observability, monitoring, metrics, logging, tracing, sli, slo, sla, distributed-tracing, alerting -->

> **Purpose**: You can't reason about a system you can't see. Observability is the practice of understanding internal system state from external outputs — and designing systems that *produce* those outputs intentionally. Every scaling, reliability, and performance decision in this repo depends on observability to know if it worked.

## Table of Contents
1. [The Three Pillars](#1-the-three-pillars)
2. [Metrics](#2-metrics)
3. [Logging](#3-logging)
4. [Distributed Tracing](#4-distributed-tracing)
5. [SLI / SLO / SLA](#5-sli--slo--sla)
6. [Alerting](#6-alerting)
7. [Observability in System Design Interviews](#7-observability-in-system-design-interviews)

---

## 1. The Three Pillars

Observability has three complementary signals. Each answers a different question:

| Pillar | Question it answers | Granularity | Cost |
|---|---|---|---|
| **Metrics** | Is something wrong? | Aggregated (counts, rates) | Low |
| **Logs** | What happened? | Per-event detail | Medium–High |
| **Traces** | Where did time go? | Per-request, cross-service | Medium |

They work together, not in isolation:
```
Alert fires (metric) → "Error rate on checkout service spiked at 14:32"
        ↓
Search logs at 14:32 → "NullPointerException in PaymentProcessor.charge()"
        ↓
Pull trace for a failing request → "DB call in PaymentService took 4.2s,
                                    caused timeout in CheckoutService"
```

**Why all three matter**: Metrics tell you *that* something is broken. Logs tell you *what* broke. Traces tell you *where* the time went and *which service* is the culprit.

---

## 2. Metrics

### Metric Types

There are four fundamental metric types. Choosing the right one matters for both semantics and storage efficiency:

**Counter**
- Always increases (or resets on restart)
- Measures: total requests, total errors, total bytes sent
- Query pattern: `rate(requests_total[5m])` — rate of increase
- Never use for values that go up and down

```
http_requests_total{method="GET", status="200"} 142358
http_requests_total{method="GET", status="500"} 47
```

**Gauge**
- Can go up or down — a snapshot of current state
- Measures: active connections, queue depth, memory usage, CPU %
- Query pattern: current value directly, or `delta()`

```
active_connections 342
queue_depth{topic="payments"} 1204
heap_used_bytes 4294967296
```

**Histogram**
- Samples observations and counts them in configurable buckets
- Measures: request duration, response size — anything you want percentiles for
- Produces: `_bucket`, `_count`, `_sum` — calculate p50/p95/p99 from these
- More expensive than counter/gauge but essential for latency

```
http_request_duration_seconds_bucket{le="0.1"} 24054
http_request_duration_seconds_bucket{le="0.5"} 33444
http_request_duration_seconds_bucket{le="1.0"} 34183
http_request_duration_seconds_bucket{le="+Inf"} 34186
http_request_duration_seconds_count 34186
http_request_duration_seconds_sum 2837.04
```

**Summary**
- Like histogram but pre-computes quantiles client-side
- Cannot be aggregated across instances (each instance computes its own)
- Prefer histogram (server-side aggregation) in most cases

---

### RED Method (For Services)

For any service that receives requests, instrument these three:

```
R — Rate:     How many requests/second is this service handling?
E — Errors:   What fraction of those requests are failing?
D — Duration: How long are requests taking (p50, p95, p99)?
```

**Why RED**: These three metrics tell you almost everything about a service's health from the user's perspective. If rate is normal, errors are low, and duration is within SLO — the service is healthy.

```
# Prometheus examples
rate(http_requests_total[1m])                         # Rate
rate(http_requests_total{status=~"5.."}[1m])          # Error rate
histogram_quantile(0.99, http_request_duration_seconds_bucket)  # p99 Duration
```

---

### USE Method (For Infrastructure/Resources)

For any resource (CPU, memory, disk, network, thread pool):

```
U — Utilization:  What % of the resource is in use?
S — Saturation:   Is work queuing up because the resource is full?
E — Errors:       Are there hardware/driver errors?
```

**Why USE**: Complements RED. RED catches service-level problems; USE catches resource exhaustion before it causes service-level problems.

```
Resource          Utilization          Saturation             Errors
CPU               cpu_usage %          run queue length       machine check errors
Memory            mem_used / mem_total  page faults / swapping OOM kills
Disk              iops_used / iops_max  IO wait time           disk errors
Thread pool       active / max threads  pending tasks queue    rejected tasks
DB connections    used / pool_size      connection wait time   connection errors
```

---

### Cardinality Problem

**What it is**: Each unique combination of label values creates a separate time series. High-cardinality labels explode the number of series and can OOM your metrics store.

```
# LOW cardinality — fine
http_requests_total{method="GET", status="200", service="checkout"}
# ~20 combinations total → 20 time series

# HIGH cardinality — dangerous
http_requests_total{method="GET", user_id="user_8472918"}
# 10M users → 10M time series → Prometheus OOM
```

**Rule**: Never use unbounded values as label dimensions:
- ❌ `user_id`, `order_id`, `request_id`, `IP address`
- ✓ `status_code`, `http_method`, `service_name`, `region`, `environment`

**For per-entity data**: Use logs or traces (designed for high cardinality), not metrics.

---

### Push vs Pull

| | Pull (Prometheus model) | Push (StatsD / Datadog agent) |
|---|---|---|
| **How** | Metrics server scrapes endpoints | Services push to metrics collector |
| **Pros** | Service doesn't need to know where metrics go; easy to detect dead services | Works through firewalls; good for short-lived jobs |
| **Cons** | Pull interval = minimum resolution; firewall issues | Harder to detect if service stops sending |
| **Use when** | Long-running services, Kubernetes | Lambda/batch jobs, legacy systems |

---

## 3. Logging

### Structured vs Unstructured Logging

**Unstructured** (plain text):
```
2024-01-15 14:32:01 ERROR PaymentService - Failed to charge card for order 8472 after 3 retries
```
- Human-readable but machine-unqueryable
- You can grep, but can't aggregate, filter by field, or compute error rates

**Structured** (JSON):
```json
{
  "timestamp": "2024-01-15T14:32:01.234Z",
  "level": "ERROR",
  "service": "payment-service",
  "event": "charge_failed",
  "order_id": "8472",
  "retry_count": 3,
  "error_code": "CARD_DECLINED",
  "trace_id": "4bf92f3577b34da6",
  "duration_ms": 1247
}
```
- Machine-queryable: filter by `error_code`, count `event=charge_failed` per minute, join with traces via `trace_id`

**Rule**: Always emit structured logs in production. Human-readable format is for local development only.

---

### What to Log (and What Not To)

**Log these**:
- All errors and exceptions (with stack trace)
- External calls: outbound HTTP, DB queries, queue publishes (request + response status + duration)
- Authentication events: login, logout, permission denied
- Business events: order placed, payment processed, user created
- State transitions: job started/completed/failed

**Do NOT log**:
- Passwords, tokens, PII, card numbers (compliance + security)
- Every single DB query in production (volume + cost)
- Health check requests (noise — hundreds per minute per service)
- Binary/blob data

---

### Correlation IDs

In a distributed system, a single user action triggers calls across multiple services. Without a shared identifier, you can't reconstruct what happened.

```
User clicks "Buy"
    │
    ├─► API Gateway         [no trace_id — log is an island]
    ├─► Order Service       [no trace_id — log is an island]
    ├─► Payment Service     [no trace_id — log is an island]
    └─► Notification Svc    [no trace_id — log is an island]

With correlation ID (trace_id: 4bf92f3577b34da6):
    ├─► API Gateway         [trace_id: 4bf92f...] ←─┐
    ├─► Order Service       [trace_id: 4bf92f...] ←─┤ grep this ID
    ├─► Payment Service     [trace_id: 4bf92f...] ←─┤ across all services
    └─► Notification Svc    [trace_id: 4bf92f...] ←─┘
```

**Implementation**: Generate a UUID at the entry point (API gateway or first service). Pass it as an HTTP header (`X-Request-ID` or `traceparent`). Every downstream service reads it, includes it in all logs, and passes it further.

---

### Log Sampling & Cost

At 100K rps, logging every request produces ~8.6 billion log lines per day. At $0.50/GB ingested in a managed log service, this is prohibitively expensive.

**Strategies**:

| Strategy | How | When to use |
|---|---|---|
| **Sample by rate** | Log 1 in 100 requests | High-volume, low-value requests (health checks, static assets) |
| **Sample errors always** | Never sample errors — always log | Errors are rare and critical; don't miss them |
| **Tail-based sampling** | Log full trace only if request was slow or errored | Best coverage, requires trace-aware pipeline |
| **Dynamic sampling** | Increase rate during incidents, decrease normally | Adaptive cost control |

**Key rule**: Never sample errors. Only sample successful, normal requests.

---

## 4. Distributed Tracing

### What a Trace Is

A trace represents the full journey of a single request across all services:

```
Trace ID: 4bf92f3577b34da6
│
├── Span: API Gateway (duration: 450ms)
│       │
│       ├── Span: Auth Service (duration: 12ms)
│       │
│       └── Span: Order Service (duration: 430ms)
│               │
│               ├── Span: DB query - SELECT orders (duration: 8ms)
│               │
│               └── Span: Payment Service (duration: 415ms)
│                       │
│                       ├── Span: DB query - SELECT card (duration: 5ms)
│                       └── Span: Stripe API call (duration: 400ms)  ← BOTTLENECK
```

Without tracing, you'd know the request took 450ms. With tracing, you know the Stripe API call consumed 400ms of that — immediately telling you where to focus.

---

### Span Anatomy

Each span records:
```
span_id:      unique ID for this operation
trace_id:     shared across all spans in this request
parent_id:    the span that called this one (null for root span)
service:      which service produced this span
operation:    what was happening ("http GET /orders", "db SELECT", "redis GET")
start_time:   when the operation started
duration:     how long it took
status:       OK / ERROR
tags/attrs:   key-value metadata (http.status_code, db.query, error.message)
```

---

### Context Propagation

The trace context (trace_id + span_id) must travel with the request across every hop:

**HTTP**: W3C TraceContext standard headers
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ^^ trace_id                         ^^ parent_span_id
```

**Message Queues**: Embed trace context in message headers/metadata
```json
{
  "payload": { "order_id": 8472 },
  "tracing": { "trace_id": "4bf92f...", "span_id": "00f067..." }
}
```

**In code (Java / OpenTelemetry)**:
```java
// Incoming request — extract context
Context extractedContext = propagator.extract(Context.current(), request.headers());

// Start a child span
Span span = tracer.spanBuilder("process-order")
    .setParent(extractedContext)
    .startSpan();

// Outgoing call — inject context
propagator.inject(Context.with(span), outboundHeaders);
```

---

### Sampling

Tracing every request at 100K rps produces enormous data volume. Sampling controls what gets recorded:

**Head-based sampling** (decision at request entry):
```
At API Gateway: randomly sample 1% of requests
→ All spans for that request are recorded
→ All spans for unsampled requests are discarded immediately
```
- Pro: Simple, low overhead
- Con: You miss rare errors (if a 1-in-10,000 error isn't sampled, you have no trace for it)

**Tail-based sampling** (decision after request completes):
```
Collect all spans → if request had errors OR latency > 1s → keep
                  → else keep 1%
```
- Pro: Never miss errors or slow requests
- Con: Requires holding spans in memory until the full trace is complete (more complex)
- Used by: Honeycomb, AWS X-Ray, Jaeger (with collector sampling)

**Rule of thumb**: Use tail-based sampling if you can. Always sample errors at 100%.

---

### OpenTelemetry

OpenTelemetry (OTel) is the vendor-neutral standard for instrumenting services. It provides:
- SDKs for all major languages (Java, Go, Python, JS, etc.)
- Auto-instrumentation (HTTP, gRPC, JDBC, Redis — no code changes needed)
- A standard wire format (OTLP) that any backend can consume

```
Your Service (OTel SDK)
        ↓ OTLP
OTel Collector (filter, batch, route)
        ↓
┌────────────────────────────────┐
│  Jaeger (traces)               │
│  Prometheus (metrics)          │
│  Loki / ELK (logs)             │
│  Datadog / Honeycomb (SaaS)    │
└────────────────────────────────┘
```

Instrument once → switch backends without code changes.

---

## 5. SLI / SLO / SLA

### Definitions

**SLI (Service Level Indicator)** — A quantitative measurement of service behavior.
```
"The fraction of HTTP requests that returned a 2xx response in under 200ms"
"The fraction of background jobs that completed without error"
```
An SLI is a *ratio*: (good events) / (total events), expressed as a percentage.

**SLO (Service Level Objective)** — The target value for an SLI.
```
"99.9% of requests must return 2xx in under 200ms, measured over a rolling 30-day window"
```
An SLO is internal — it's a design target, not a customer commitment.

**SLA (Service Level Agreement)** — A contract between you and a customer with defined consequences for breach.
```
"We guarantee 99.9% availability. If we fall below this, customers receive service credits."
```

**The key insight**: SLOs are inputs to design decisions, not just ops outputs.
```
If SLO = 99.9% availability → you have 43.8 minutes downtime budget per month
If SLO = 99.99%            → you have 4.38 minutes downtime budget per month
→ These require fundamentally different architectures (single DC vs multi-region)
```

---

### Error Budgets

The error budget is the allowed amount of unreliability within the SLO window.

```
SLO: 99.9% availability over 30 days
Total requests in 30 days: 10,000,000
Allowed failures: 10,000,000 × 0.001 = 10,000 requests

Day 1–20: 4,000 failures consumed  → 6,000 remaining
Day 21:   Deploy causes 8,000 failures in 1 hour
→ Budget exhausted → freeze non-critical deploys until next window
```

**How teams use error budgets**:
- Budget healthy → team can take risks (deploy frequently, run experiments)
- Budget nearly exhausted → freeze risky changes, focus on reliability
- Budget exhausted → incident review required, no new features until fixed

---

### Common SLIs by System Type

| System | SLI | Typical SLO |
|---|---|---|
| API / web service | % requests with latency < 200ms and status 2xx | 99.9% |
| Background job processor | % jobs completed without error | 99.5% |
| Data pipeline | % records processed within 1 hour of arrival | 99.0% |
| Storage (object store) | % read/write requests that succeed | 99.99% |
| Notification delivery | % notifications delivered within 60 seconds | 95% |
| Search index freshness | % queries returning results < 30s old | 99% |

---

### Burn Rate Alerts

Don't alert when you breach the SLO — alert when you're *burning through* the budget too fast.

```
Monthly error budget: 10,000 failures (0.1%)

Normal burn rate: ~333 failures/day (budget lasts 30 days)

Alert if burn rate means budget runs out in < 2 days:
→ Currently burning 5,000 failures/day
→ Budget exhausted in 2 days → PAGE NOW

Alert if burn rate means budget runs out in < 5 days:
→ Currently burning 2,000 failures/day
→ Budget exhausted in 5 days → TICKET (non-urgent)
```

Two burn rate alerts:
1. **Fast burn** (1-hour window): High threshold — catches acute incidents
2. **Slow burn** (6-hour window): Lower threshold — catches slow degradation that individually looks fine

---

## 6. Alerting

### Symptom-Based vs Cause-Based Alerting

**Cause-based** (what most teams start with):
```
Alert: CPU > 80% for 5 minutes
Alert: Memory > 90%
Alert: Disk write latency > 100ms
Alert: Redis connection pool > 80% utilized
```
Problems: noisy (CPU spikes all the time), doesn't map to user impact, requires responder to know what CPU spike means for this service.

**Symptom-based** (what mature teams do):
```
Alert: Error rate > 1% for 5 minutes          ← user is experiencing errors
Alert: p99 latency > 2s for 10 minutes        ← user requests are slow
Alert: SLO burn rate will exhaust budget in 2 days  ← SLO at risk
```
Directly maps to user impact. Cause is something to investigate *after* you're paged, not the trigger.

**Rule**: Alert on symptoms (SLO burn rate, error rate, latency). Use cause-based metrics on dashboards for investigation, not for paging.

---

### Alert Fatigue

When too many alerts fire, on-call engineers start ignoring them.

**Signs of alert fatigue**:
- Alerts are acknowledged without being investigated
- The same alert has fired > 5 times this month without a fix
- On-call rotation has high churn / nobody wants it

**How to fix**:
1. **Audit all alerts**: For each alert, ask "What action does this require?" If the answer is "nothing" or "I don't know" — delete or convert to a dashboard metric.
2. **Every alert needs a runbook**: The runbook is the documented response. No runbook = the alert isn't well-defined enough.
3. **Remove flapping alerts**: If an alert fires and auto-resolves repeatedly, it either needs a longer evaluation window or needs to be deleted.
4. **Tiered urgency**: Page (wake someone up) vs. ticket (next business day). Fewer things should page.

---

### Runbooks

A runbook is the pre-written response procedure for an alert. It should answer:
```
1. What does this alert mean? (in plain English)
2. What is the user impact?
3. Immediate triage steps (check these dashboards/logs first)
4. Common causes and how to verify each
5. Remediation steps for each cause
6. Escalation path if you can't resolve in 30 minutes
```

Good runbooks reduce mean time to resolution (MTTR) and allow junior engineers to handle on-call.

---

## 7. Observability in System Design Interviews

Most candidates design a system and never mention observability. The 10% who bring it up unprompted signal production experience.

### When to Bring It Up

- After sketching the high-level design: *"Before we go deeper — how do we know this is working? I'd add metrics on the read/write paths."*
- When discussing a specific component: *"For the queue, I'd track consumer lag as a gauge — if it grows, we're falling behind."*
- After a follow-up about failure: *"To detect this failure mode early, we'd set a burn rate alert on the checkout service's error SLO."*

---

### What to Say for Key Components

**Cache layer**:
```
Metrics: cache hit rate, eviction rate, memory utilization
Alert:   hit rate drops below 80% (may indicate hot key problem or cold start)
```

**Database**:
```
Metrics: query latency (p99), connection pool utilization, replication lag
Alert:   p99 query latency > 500ms; replication lag > 10s
```

**Message queue (Kafka)**:
```
Metrics: consumer lag per partition, produce rate, consume rate
Alert:   consumer lag growing for > 5 minutes (consumer can't keep up)
```

**API service (RED)**:
```
Metrics: request rate, error rate, latency (p50/p95/p99)
SLO:     99.9% of requests complete in < 200ms with 2xx
Alert:   burn rate alert on SLO
```

**Async job processor**:
```
Metrics: job queue depth, job success/failure rate, processing duration
Alert:   queue depth > 10,000 (backlog building); failure rate > 1%
```

---

### The "How do you know it's working?" Answer Template

> "I'd instrument the [component] with RED metrics — rate, error rate, and p99 latency. Define an SLO of [X]% of requests completing in under [Y]ms. Set a burn rate alert that pages if we're consuming the error budget too fast. For the database, I'd track connection pool utilization and query latency as leading indicators — those degrade before the service-level metrics do. Traces would let us pinpoint which downstream call is responsible when latency spikes."

---

## Related Topics
- **See also**: `05-performance-latency.md` — what to measure, P99 latency, SLOs
- **See also**: `03-reliability-fault-tolerance.md` — chaos engineering, failure detection
- **See also**: `11-failure-modes-and-problem-patterns.md` — detecting failure modes via metrics
- **See also**: `02-scalability-patterns.md` — knowing when your scaling decision worked
- **See also**: `13-distributed-patterns.md` — correlation IDs in distributed systems
