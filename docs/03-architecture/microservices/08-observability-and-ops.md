# Observability & Operations - Complete Guide

> **Before you start**: How do you debug a request that spans 5 different services? How do you know which service is slow? Which is throwing errors? This is where observability becomes critical.

---

## Table of Contents

1. [What is Observability?](#1-what-is-observability)
2. [The Three Pillars of Observability](#2-the-three-pillars-of-observability)
3. [Distributed Tracing Deep Dive](#3-distributed-tracing-deep-dive)
4. [Monitoring & Metrics](#4-monitoring--metrics)
5. [Logging in Distributed Systems](#5-logging-in-distributed-systems)
6. [Framework-Specific Implementations](#6-framework-specific-implementations)
7. [Configuration Management](#7-configuration-management)
8. [Deployment & Performance](#8-deployment--performance)
9. [Best Practices](#9-best-practices)
10. [Interview Questions](#10-interview-questions)

---

## 1. What is Observability?

### Definition

**Observability** is the ability to understand the internal state of your system by examining its outputs (logs, metrics, traces).

### Observability vs Monitoring

| Aspect | Monitoring | Observability |
|--------|-----------|---------------|
| **Question** | "Is the system working?" | "Why is the system not working?" |
| **Approach** | Known-unknowns (predefined metrics) | Unknown-unknowns (exploratory) |
| **Focus** | Dashboards, alerts, thresholds | Root cause analysis, debugging |
| **Tools** | Nagios, Zabbix, CloudWatch | Honeycomb, Datadog, New Relic |
| **Scope** | System health | System behavior |

### Real-World Analogy

**Monitoring**: Dashboard in your car (speed, fuel, engine temp)
- You know when something is wrong (check engine light)

**Observability**: Mechanic's diagnostic tools
- You can investigate WHY the check engine light is on
- Trace the problem to its root cause

### Why Observability Matters in Microservices

```
Monolith:
User Request → Single Application → Database
(Easy to debug: add a log statement, restart, check logs)

Microservices:
User Request → API Gateway → Service A → Service B → Service C → Database
                    ↓           ↓           ↓
                 Cache      Message Queue  External API

(Hard to debug: Which service failed? Where's the bottleneck?)
```

**Problems without observability**:
1. Request fails - which of the 10 services caused it?
2. Response is slow - which service is the bottleneck?
3. Data is inconsistent - where did the state diverge?
4. Memory leak - which service? Which endpoint?

---

## 2. The Three Pillars of Observability

### Pillar 1: Logs (Events)

**What**: Discrete events that happened in the system

**Example**:
```
2024-01-15 10:30:45 INFO  [OrderService] Order created: orderId=12345, userId=789
2024-01-15 10:30:46 ERROR [PaymentService] Payment failed: orderId=12345, reason=Insufficient funds
```

**When to use**: Debugging specific issues, understanding "what happened"

**Characteristics**:
- High cardinality (lots of unique values)
- Detailed context
- Expensive to store long-term
- Good for post-mortem analysis

---

### Pillar 2: Metrics (Aggregated Numbers)

**What**: Numerical measurements aggregated over time

**Example**:
```
http_requests_total{service="order-service", status="200"} = 45000
http_request_duration_seconds{service="order-service", quantile="0.99"} = 0.5
```

**When to use**: Monitoring trends, setting up alerts, capacity planning

**Characteristics**:
- Low cardinality (limited unique values)
- Aggregated data
- Cheap to store
- Good for real-time monitoring

---

### Pillar 3: Traces (Request Flow)

**What**: The journey of a single request through multiple services

**Example**:
```
TraceID: abc123
  Span 1: API Gateway (10ms)
  Span 2: Order Service (50ms)
    Span 3: Inventory Service (200ms) ← Bottleneck!
    Span 4: Payment Service (30ms)
  Span 5: Notification Service (15ms)
Total: 305ms
```

**When to use**: Understanding request flow, finding bottlenecks, latency analysis

**Characteristics**:
- Shows causality (which service called which)
- Visualizes dependencies
- Identifies slow spans
- Good for performance optimization

---

### How They Work Together

**Scenario**: "Checkout is slow for user 789"

1. **Metrics** tell you: "p99 latency for /checkout is 2 seconds (up from 200ms)"
2. **Traces** show you: "Inventory Service span took 1.8 seconds"
3. **Logs** reveal: "Inventory Service: Database query timeout for product SKU=ABC123"

**Root cause**: Specific product query is slow → add database index

---

## 3. Distributed Tracing Deep Dive

### Core Concepts

#### 1. Trace

A **trace** represents the entire journey of a single request through your distributed system.

```
┌─────────────────────────────────────────────────────────┐
│ Trace ID: abc-123-def-456                               │
│ Total Duration: 500ms                                    │
│                                                          │
│ User Request → Service A → Service B → Service C        │
└─────────────────────────────────────────────────────────┘
```

**Key Properties**:
- **Trace ID**: Unique identifier for the entire request (e.g., `abc-123-def-456`)
- **Duration**: Total time from start to finish
- **Status**: Success, error, timeout

---

#### 2. Span

A **span** represents a single unit of work within a trace (e.g., a service call, database query, cache lookup).

```
┌──────────────────────────────────────────────────────────┐
│ Span 1: API Gateway                                      │
│   Span ID: span-001                                      │
│   Parent: null (root span)                               │
│   Duration: 10ms                                         │
│                                                          │
│   ├── Span 2: Order Service                             │
│   │   Span ID: span-002                                 │
│   │   Parent: span-001                                  │
│   │   Duration: 450ms                                   │
│   │                                                     │
│   │   ├── Span 3: Database Query (SELECT orders)      │
│   │   │   Duration: 200ms                              │
│   │   │                                                │
│   │   └── Span 4: Payment Service Call                │
│   │       Duration: 230ms                              │
│   │                                                    │
│   └── Span 5: Log to Analytics                         │
│       Duration: 20ms                                    │
└──────────────────────────────────────────────────────────┘
```

**Span Attributes**:
- **Span ID**: Unique identifier for this span
- **Parent Span ID**: Which span called this one
- **Operation Name**: What this span represents (e.g., "GET /orders", "db.query")
- **Start Time**: When the operation started
- **Duration**: How long it took
- **Tags/Attributes**: Metadata (e.g., `http.method=GET`, `db.statement=SELECT * FROM orders`)
- **Logs/Events**: Events that happened during this span
- **Status**: ok, error, unset

---

### Trace Context Propagation

**Problem**: How does Service B know it's part of the same trace as Service A?

**Solution**: **Context Propagation** - passing trace metadata via HTTP headers

```
Service A (Order Service)
    ↓
HTTP Headers:
    X-Trace-ID: abc-123-def-456
    X-Span-ID: span-002
    X-Parent-Span-ID: span-001
    ↓
Service B (Payment Service)
```

**Common Standards**:
1. **W3C Trace Context** (modern standard)
   - `traceparent: 00-abc123-span002-01`
   - `tracestate: vendor-specific-data`

2. **B3 Propagation** (Zipkin)
   - `X-B3-TraceId: abc123`
   - `X-B3-SpanId: span002`
   - `X-B3-ParentSpanId: span001`

---

### Trace Visualization

**Waterfall View** (Timeline):
```
API Gateway         [========] 10ms
  Order Service            [==================================] 450ms
    DB Query                    [================] 200ms
    Payment Service                              [==================] 230ms
  Analytics                [====] 20ms
──────────────────────────────────────────────────────────>
0ms                   200ms                   400ms        500ms
```

**Dependency Graph** (Service Map):
```
        ┌─────────────┐
        │ API Gateway │
        └─────────────┘
              │
              ↓
        ┌──────────────┐
        │Order Service │
        └──────────────┘
           │         │
           ↓         ↓
    ┌──────────┐  ┌─────────────┐
    │ Database │  │Payment Svc  │
    └──────────┘  └─────────────┘
```

---

### Sampling Strategies

**Problem**: Tracing every request is expensive (storage, bandwidth, performance)

**Solution**: Sample a percentage of traces

#### 1. Head-Based Sampling (Decision at Entry Point)

```java
// Sample 10% of requests
if (Math.random() < 0.1) {
    createTrace();
}
```

**Pros**: Simple, low overhead
**Cons**: Might miss rare errors

#### 2. Tail-Based Sampling (Decision After Completion)

```java
// Keep all errors, sample 1% of successful requests
if (trace.hasError() || Math.random() < 0.01) {
    sendToBackend(trace);
}
```

**Pros**: Keep important traces (errors, slow requests)
**Cons**: Higher memory overhead (must buffer traces)

#### 3. Adaptive Sampling

- Sample more during incidents
- Sample less during normal operation
- Adjust based on traffic volume

---

## 4. Monitoring & Metrics

### What Are Metrics?

**Metrics** are numerical measurements of your system over time, aggregated for efficient storage and querying.

### Types of Metrics

#### 1. Counter (Monotonically Increasing)

**Definition**: A value that only goes up (or resets to zero on restart)

**Use Cases**:
- Total number of requests
- Total errors
- Total bytes sent

**Example**:
```
Time    http_requests_total
10:00   1000
10:01   1025  (+25 requests)
10:02   1060  (+35 requests)
```

**Common Operations**:
- **Rate**: How fast is it increasing? `rate(http_requests_total[5m])`
- **Increase**: How much did it increase? `increase(http_requests_total[1h])`

---

#### 2. Gauge (Can Go Up or Down)

**Definition**: A value that can increase or decrease

**Use Cases**:
- Current memory usage
- Active connections
- Queue depth
- CPU temperature

**Example**:
```
Time    active_connections
10:00   50
10:01   75  (25 new connections)
10:02   60  (15 connections closed)
```

**Common Operations**:
- **Current value**: `active_connections`
- **Average**: `avg_over_time(active_connections[5m])`

---

#### 3. Histogram (Distribution of Values)

**Definition**: Groups observations into configurable buckets

**Use Cases**:
- Request latency distribution
- Response size distribution

**Example**:
```
http_request_duration_bucket{le="0.1"}  = 5000  (5000 requests ≤ 100ms)
http_request_duration_bucket{le="0.5"}  = 8000  (8000 requests ≤ 500ms)
http_request_duration_bucket{le="1.0"}  = 9500  (9500 requests ≤ 1s)
http_request_duration_bucket{le="+Inf"} = 10000 (all requests)
```

**Calculated Metrics**:
- **p50** (median): 50% of requests are faster than this
- **p95**: 95% of requests are faster than this
- **p99**: 99% of requests are faster than this

**Why percentiles matter**:
```
Average latency: 100ms (looks good!)
But p99 latency: 5 seconds (1% of users have terrible experience)
```

---

#### 4. Summary (Similar to Histogram)

**Definition**: Pre-calculates quantiles on the client side

**Difference from Histogram**:
- **Histogram**: Server calculates quantiles (more accurate, can aggregate)
- **Summary**: Client calculates quantiles (less overhead, can't aggregate)

---

### The Four Golden Signals (Google SRE)

#### 1. Latency (How Fast?)

**Definition**: Time to service a request

**Metrics**:
```
http_request_duration_seconds{quantile="0.5"}  = 0.1  (p50: 100ms)
http_request_duration_seconds{quantile="0.95"} = 0.5  (p95: 500ms)
http_request_duration_seconds{quantile="0.99"} = 2.0  (p99: 2 seconds)
```

**Alert Example**:
```
Alert: p99 latency > 1 second for more than 5 minutes
```

---

#### 2. Traffic (How Much?)

**Definition**: How much demand is placed on your system

**Metrics**:
```
http_requests_per_second = 1000
db_queries_per_second = 5000
```

**Use Case**: Capacity planning, scaling decisions

---

#### 3. Errors (How Many Failures?)

**Definition**: Rate of failed requests

**Metrics**:
```
http_requests_total{status="5xx"} = 50
http_requests_total = 10000
Error rate = 50/10000 = 0.5%
```

**Alert Example**:
```
Alert: Error rate > 1% for more than 2 minutes
```

---

#### 4. Saturation (How Full?)

**Definition**: How "full" your service is (utilization of constrained resources)

**Metrics**:
```
cpu_usage_percent = 85%
memory_usage_percent = 70%
disk_io_utilization = 95%
connection_pool_usage = 90%
```

**Alert Example**:
```
Alert: CPU usage > 80% for more than 10 minutes
```

---

### RED Method (Request-Focused)

Simpler alternative to Four Golden Signals:

1. **Rate**: Requests per second
2. **Errors**: Failed requests per second
3. **Duration**: Latency (p50, p95, p99)

---

### USE Method (Resource-Focused)

For infrastructure monitoring:

1. **Utilization**: % time resource is busy
2. **Saturation**: Queue depth (work waiting)
3. **Errors**: Error count

---

### Metric Naming Conventions

#### Prometheus Style (Recommended)

```
<namespace>_<subsystem>_<name>_<unit>

Examples:
http_requests_total              (counter)
http_request_duration_seconds    (histogram)
process_cpu_usage_percent        (gauge)
db_connection_pool_active        (gauge)
```

**Rules**:
- Use snake_case
- Include unit suffix (`_seconds`, `_bytes`, `_percent`)
- Use `_total` suffix for counters
- Be descriptive but concise

---

### Labels (Dimensions)

**Labels** add dimensions to metrics for filtering and aggregation

```java
http_requests_total{
    service="order-service",
    method="POST",
    endpoint="/orders",
    status="200"
} = 5000
```

**Label Best Practices**:
1. **Low cardinality**: Don't use user IDs, order IDs as labels
   - ✅ Good: `service="order-service"`
   - ❌ Bad: `order_id="12345"` (millions of unique values)

2. **Consistent naming**: Use same label names across services
   - ✅ Good: `status="200"`
   - ❌ Bad: `http_status="200"` in one service, `statusCode="200"` in another

3. **Limit label count**: Each label multiplies cardinality
   ```
   2 services × 10 endpoints × 5 methods × 10 status codes = 1000 time series
   ```

---

### Common Metrics to Track

#### Application Metrics

```java
// Request metrics
http_requests_total
http_request_duration_seconds
http_requests_in_flight

// Error metrics
http_errors_total
circuit_breaker_state{state="open|closed|half_open"}

// Business metrics
orders_created_total
payment_processed_total
revenue_usd_total
```

#### JVM Metrics (Spring Boot Actuator)

```java
// Memory
jvm_memory_used_bytes{area="heap"}
jvm_memory_used_bytes{area="nonheap"}
jvm_gc_pause_seconds_sum

// Threads
jvm_threads_live
jvm_threads_daemon

// Classes
jvm_classes_loaded
```

#### Database Metrics

```java
db_connection_pool_active
db_connection_pool_idle
db_query_duration_seconds
db_queries_total
```

#### Cache Metrics

```java
cache_hits_total
cache_misses_total
cache_evictions_total
cache_size_bytes
```

---

### Metric Collection Architecture

```
┌─────────────────┐
│  Application    │
│  (Micrometer)   │  Exposes metrics on /actuator/metrics
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Prometheus     │  Scrapes metrics every 15s
│  (Time Series   │  Stores in time-series database
│   Database)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Grafana       │  Visualizes metrics
│  (Dashboards)   │  Shows graphs, alerts
└─────────────────┘
```

---

## 5. Logging in Distributed Systems

### Structured Logging

**Don't do this** (unstructured):
```java
log.info("User " + userId + " created order " + orderId + " for $" + amount);
```

**Do this** (structured):
```java
log.info("Order created",
    kv("userId", userId),
    kv("orderId", orderId),
    kv("amount", amount),
    kv("currency", "USD")
);

// Output (JSON):
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "INFO",
  "message": "Order created",
  "userId": "789",
  "orderId": "12345",
  "amount": 99.99,
  "currency": "USD",
  "service": "order-service",
  "traceId": "abc-123",
  "spanId": "span-002"
}
```

**Benefits**:
- Easily searchable
- Can aggregate (e.g., "count orders by currency")
- Machine-readable

---

### Log Levels

```
TRACE → DEBUG → INFO → WARN → ERROR → FATAL
```

**When to use each**:

| Level | When to Use | Example |
|-------|-------------|---------|
| **TRACE** | Very detailed, usually disabled | Variable values, method entry/exit |
| **DEBUG** | Troubleshooting information | "Cache hit for key=abc", "SQL query executed" |
| **INFO** | Important business events | "Order created", "User logged in", "Payment processed" |
| **WARN** | Potentially harmful situations | "Retry attempt 3/5", "Deprecated API used" |
| **ERROR** | Error events that might still allow the app to continue | "Failed to send email", "API call failed" |
| **FATAL** | Severe errors that cause application termination | "Database connection pool exhausted" |

---

### Correlation IDs (Trace ID in Logs)

**Include trace ID in every log** so you can correlate logs with traces:

```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "ERROR",
  "message": "Payment failed",
  "traceId": "abc-123-def-456",  ← Same as distributed trace!
  "spanId": "span-004",
  "service": "payment-service",
  "error": "InsufficientFundsException"
}
```

**Workflow**:
1. User reports: "My checkout failed"
2. Find trace ID in monitoring tool
3. Search logs for that trace ID
4. See all logs across all services for that request

---

### Log Aggregation

**Problem**: Logs scattered across 100 service instances

**Solution**: Centralized log aggregation

```
Service A (10 instances)  ──┐
Service B (20 instances)  ──┤
Service C (30 instances)  ──┤──→ Log Aggregator (ELK, Splunk)
Service D (5 instances)   ──┘        ↓
                              Search Interface
                              (Kibana, Splunk UI)
```

**Popular Tools**:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **EFK Stack**: Elasticsearch, Fluentd, Kibana
- **Splunk**: Commercial log management
- **Loki**: Lightweight alternative (Grafana Labs)
- **CloudWatch Logs**: AWS-native

---

## 6. Framework-Specific Implementations

### Spring Boot (Java)

#### Out-of-the-Box Support

**Spring Boot Actuator** provides:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**Endpoints**:
- `/actuator/health` - Health check
- `/actuator/metrics` - JVM, HTTP, custom metrics
- `/actuator/prometheus` - Prometheus-formatted metrics
- `/actuator/info` - Application info

**Metrics (via Micrometer)**:
```java
@RestController
public class OrderController {
    private final MeterRegistry registry;

    public OrderController(MeterRegistry registry) {
        this.registry = registry;
    }

    @PostMapping("/orders")
    public Order createOrder(@RequestBody OrderRequest request) {
        // Counter
        registry.counter("orders.created",
            "currency", request.getCurrency()
        ).increment();

        // Timer (automatically tracks latency)
        return Timer.sample(registry)
            .record(() -> orderService.createOrder(request));
    }
}
```

**Or use annotations**:
```java
@Timed(value = "orders.create", description = "Time to create order")
@PostMapping("/orders")
public Order createOrder(@RequestBody OrderRequest request) {
    return orderService.createOrder(request);
}
```

---

#### Distributed Tracing (Spring Cloud Sleuth + Zipkin)

**Dependencies**:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-sleuth-zipkin</artifactId>
</dependency>
```

**Configuration**:
```yaml
spring:
  sleuth:
    sampler:
      probability: 0.1  # Sample 10% of requests
  zipkin:
    base-url: http://localhost:9411
```

**What Sleuth provides automatically**:
1. ✅ Trace ID and Span ID generation
2. ✅ Propagation via HTTP headers
3. ✅ Logs include trace/span IDs
4. ✅ Integration with Zipkin/Jaeger

**Manual span creation**:
```java
@Service
public class OrderService {
    private final Tracer tracer;

    public Order processOrder(OrderRequest request) {
        // Create custom span
        Span span = tracer.nextSpan().name("process-order").start();
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            span.tag("orderId", request.getOrderId());
            span.tag("amount", String.valueOf(request.getAmount()));

            // Business logic
            Order order = createOrder(request);

            span.event("order-created");
            return order;
        } finally {
            span.end();
        }
    }
}
```

---

#### Logging (Logback/SLF4J)

**What Spring Boot provides**:
- ✅ SLF4J API (facade)
- ✅ Logback as default implementation
- ✅ Automatic trace ID in logs (with Sleuth)

**Configuration** (`application.yml`):
```yaml
logging:
  level:
    root: INFO
    com.example.orderservice: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%X{traceId}/%X{spanId}] %-5level %logger{36} - %msg%n"
```

**Structured logging** (use Logstash encoder):
```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
</dependency>
```

```xml
<!-- logback-spring.xml -->
<appender name="jsonConsole" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
</appender>
```

---

#### What Spring Boot Does NOT Provide Out-of-the-Box

❌ **Metrics Backend**: You need Prometheus, CloudWatch, etc.
❌ **Trace Backend**: You need Zipkin, Jaeger, etc.
❌ **Log Aggregation**: You need ELK, Splunk, etc.
❌ **Visualization**: You need Grafana, Kibana, etc.
❌ **Alerting**: You need Prometheus Alertmanager, PagerDuty, etc.

---

### Python (Flask/Django/FastAPI)

#### Metrics (OpenTelemetry + Prometheus)

**Install**:
```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-instrumentation-flask
pip install prometheus-client
```

**Flask Example**:
```python
from flask import Flask
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
import time

app = Flask(__name__)

# Define metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_latency = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    request_latency.labels(
        method=request.method,
        endpoint=request.endpoint
    ).observe(time.time() - request.start_time)

    request_count.labels(
        method=request.method,
        endpoint=request.endpoint,
        status=response.status_code
    ).inc()

    return response

@app.route('/metrics')
def metrics():
    return generate_latest(REGISTRY)
```

---

#### Distributed Tracing (OpenTelemetry)

**Install**:
```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-exporter-jaeger
pip install opentelemetry-instrumentation-flask
```

**Setup**:
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# Setup tracer
trace.set_tracer_provider(TracerProvider())
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Auto-instrument Flask
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

# Manual span
tracer = trace.get_tracer(__name__)

@app.route('/orders/<order_id>')
def get_order(order_id):
    with tracer.start_as_current_span("get-order") as span:
        span.set_attribute("order_id", order_id)
        order = fetch_order_from_db(order_id)
        span.add_event("order-fetched")
        return jsonify(order)
```

---

#### Logging (structlog)

**Install**:
```bash
pip install structlog
```

**Setup**:
```python
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger()

# Usage
log.info("order.created",
    order_id="12345",
    user_id="789",
    amount=99.99,
    currency="USD"
)

# Output:
# {"event": "order.created", "order_id": "12345", "user_id": "789", "amount": 99.99, "currency": "USD", "level": "info", "timestamp": "2024-01-15T10:30:45Z"}
```

---

#### What Python Does NOT Provide Out-of-the-Box

❌ **Everything** - Python frameworks don't include observability tools by default
- Need to add: OpenTelemetry, Prometheus client, structlog
- Need to configure: Exporters, backends, sampling

**But**: OpenTelemetry auto-instrumentation is very good:
```python
# Automatically instruments Flask, requests, SQLAlchemy, etc.
opentelemetry-bootstrap -a install
opentelemetry-instrument python app.py
```

---

### Phoenix (Elixir)

#### Telemetry (Built-in!)

**Phoenix includes `:telemetry` out-of-the-box**:

```elixir
# Telemetry events are emitted automatically:
[:phoenix, :endpoint, :start]
[:phoenix, :endpoint, :stop]
[:phoenix, :router_dispatch, :start]
[:phoenix, :router_dispatch, :stop]
```

**Attach handlers**:
```elixir
:telemetry.attach(
  "log-handler",
  [:phoenix, :endpoint, :stop],
  fn event, measurements, metadata, _config ->
    duration = measurements.duration
    path = metadata.conn.request_path

    Logger.info("Request to #{path} took #{duration}ms")
  end,
  nil
)
```

---

#### Metrics (TelemetryMetrics + Prometheus)

**Install**:
```elixir
# mix.exs
{:telemetry_metrics, "~> 0.6"},
{:telemetry_poller, "~> 1.0"},
{:telemetry_metrics_prometheus, "~> 1.1"}
```

**Define metrics**:
```elixir
defmodule MyApp.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000},
      {TelemetryMetricsPrometheus, [metrics: metrics()]}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp metrics do
    [
      # Counter
      counter("phoenix.router_dispatch.stop.count",
        tags: [:method, :route]
      ),

      # Histogram
      distribution("phoenix.router_dispatch.stop.duration",
        unit: {:native, :millisecond},
        tags: [:method, :route]
      ),

      # Gauge
      last_value("vm.memory.total", unit: :byte),
      last_value("vm.total_run_queue_lengths.total")
    ]
  end
end
```

**Prometheus endpoint** at `http://localhost:4000/metrics`

---

#### Distributed Tracing (OpenTelemetry)

**Install**:
```elixir
{:opentelemetry, "~> 1.3"},
{:opentelemetry_exporter, "~> 1.6"},
{:opentelemetry_phoenix, "~> 1.1"}
```

**Configure**:
```elixir
# config/runtime.exs
config :opentelemetry,
  span_processor: :batch,
  traces_exporter: {:otlp, endpoint: "http://localhost:4318"}

# lib/my_app/application.ex
def start(_type, _args) do
  OpentelemetryPhoenix.setup()
  # ...
end
```

**Manual spans**:
```elixir
require OpenTelemetry.Tracer

def process_order(order) do
  OpenTelemetry.Tracer.with_span "process_order" do
    OpenTelemetry.Tracer.set_attribute("order.id", order.id)
    OpenTelemetry.Tracer.set_attribute("order.amount", order.amount)

    # Business logic
    result = do_process_order(order)

    OpenTelemetry.Tracer.add_event("order_processed", [])
    result
  end
end
```

---

#### Logging (Logger - Built-in!)

**Phoenix uses Elixir's built-in Logger**:

```elixir
require Logger

Logger.info("Order created",
  order_id: "12345",
  user_id: "789",
  amount: 99.99
)

# Output (default):
# 10:30:45.123 [info] Order created order_id=12345 user_id=789 amount=99.99
```

**JSON logging** (add logger_json):
```elixir
# mix.exs
{:logger_json, "~> 5.1"}

# config/runtime.exs
config :logger, :default_formatter,
  format: {LoggerJSON.Formatters.GoogleCloud, :format}
```

---

#### What Phoenix Provides Out-of-the-Box

✅ **Telemetry events** (automatic instrumentation)
✅ **Logger** (structured logging support)
✅ **Easy metrics integration** (TelemetryMetrics)

❌ **Does NOT provide**:
- Metrics backend (need Prometheus)
- Trace backend (need Jaeger, Zipkin)
- Log aggregation (need ELK, Loki)

---

### Framework Comparison Summary

| Feature | Spring Boot | Python (Flask/FastAPI) | Phoenix (Elixir) |
|---------|-------------|------------------------|------------------|
| **Metrics API** | ✅ Micrometer (built-in) | ❌ Need prometheus-client | ✅ Telemetry (built-in) |
| **Auto HTTP Metrics** | ✅ Yes | ❌ Manual | ✅ Yes |
| **Auto JVM/VM Metrics** | ✅ Yes | N/A | ✅ Yes |
| **Tracing API** | ✅ Sleuth | ❌ Need OpenTelemetry | ❌ Need OpenTelemetry |
| **Auto HTTP Tracing** | ✅ Yes | ✅ With auto-instrument | ✅ With OpentelemetryPhoenix |
| **Context Propagation** | ✅ Automatic | ✅ With instrumentation | ✅ With OpenTelemetry |
| **Structured Logging** | ❌ Need Logstash encoder | ❌ Need structlog | ✅ Built-in support |
| **Log Correlation** | ✅ Automatic (Sleuth) | ❌ Manual | ❌ Manual |
| **Health Endpoints** | ✅ /actuator/health | ❌ Manual | ❌ Manual |
| **Metrics Endpoint** | ✅ /actuator/prometheus | ❌ Manual | ✅ TelemetryMetricsPrometheus |

**Winner for Observability**: **Spring Boot** (most features out-of-the-box)
**Runner-up**: **Phoenix** (excellent Telemetry foundation)
**Needs Work**: **Python** (everything is manual, but OpenTelemetry helps)

---

## 7. Configuration Management

### Spring Cloud Config

**Purpose**: Centralized configuration for all microservices

**Architecture**:
```
┌──────────────────┐
│   Git Repository │
│  (config files)  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Config Server   │  ← @EnableConfigServer
└────────┬─────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    ↓         ↓         ↓          ↓
Service A  Service B  Service C  Service D
```

**Config Server**:
```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

**application.yml** (Config Server):
```yaml
server:
  port: 8888
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/myorg/config-repo
          default-label: main
```

**Client** (Order Service):
```yaml
spring:
  application:
    name: order-service
  config:
    import: "optional:configserver:http://localhost:8888"
  profiles:
    active: dev
```

**Git Repository Structure**:
```
config-repo/
├── order-service.yml           (default)
├── order-service-dev.yml       (dev profile)
├── order-service-prod.yml      (prod profile)
├── application.yml             (shared config)
└── application-prod.yml        (shared prod config)
```

**Benefits**:
- ✅ Centralized configuration
- ✅ Environment-specific configs (dev, staging, prod)
- ✅ Dynamic refresh (change config without restart)
- ✅ Version control (Git history)
- ✅ Encryption support (sensitive data)

---

## 8. Deployment & Performance

### Docker & Kubernetes

#### Health Checks

**Liveness Probe**: "Is the container alive?"
- **Purpose**: Restart container if unhealthy
- **Example**: Application deadlock, out of memory

**Readiness Probe**: "Is the container ready to accept traffic?"
- **Purpose**: Remove from load balancer if not ready
- **Example**: Warming up cache, establishing DB connections

**Startup Probe**: "Has the container started successfully?"
- **Purpose**: Give slow-starting containers more time
- **Example**: JVM applications with long initialization

---

**Kubernetes Configuration**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: order-service
        image: order-service:1.0.0
        ports:
        - containerPort: 8080

        # Startup probe (runs first)
        startupProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 30  # 30 * 10s = 5 minutes max startup time

        # Liveness probe (runs after startup)
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 3  # Restart after 3 failures

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 3  # Remove from LB after 3 failures
```

**Spring Boot Health Endpoints**:
```yaml
# application.yml
management:
  endpoint:
    health:
      probes:
        enabled: true  # Enables /health/liveness and /health/readiness
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

---

### Performance Optimization

#### 1. Caching

**Spring Cache Abstraction**:
```java
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        // Expensive database query
        return productRepository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }

    @CachePut(value = "products", key = "#result.id")
    public Product createProduct(Product product) {
        return productRepository.save(product);
    }
}
```

**Redis Configuration**:
```yaml
spring:
  cache:
    type: redis
  redis:
    host: localhost
    port: 6379
```

---

#### 2. Connection Pooling

**HikariCP** (default in Spring Boot):
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20        # Max connections
      minimum-idle: 5              # Min idle connections
      connection-timeout: 30000    # 30 seconds
      idle-timeout: 600000         # 10 minutes
      max-lifetime: 1800000        # 30 minutes
      leak-detection-threshold: 60000  # Warn if connection held > 1 minute
```

**Sizing Formula**:
```
connections = ((core_count * 2) + effective_spindle_count)

Example:
- 4 CPU cores
- 1 SSD (effective_spindle_count = 1)
connections = (4 * 2) + 1 = 9
```

---

#### 3. Async Processing

**Spring @Async**:
```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

@Service
public class NotificationService {

    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmailAsync(String email, String message) {
        // Send email (slow operation)
        emailClient.send(email, message);
        return CompletableFuture.completedFuture(null);
    }
}

// Usage
@PostMapping("/orders")
public Order createOrder(@RequestBody OrderRequest request) {
    Order order = orderService.createOrder(request);

    // Send email asynchronously (don't block response)
    notificationService.sendEmailAsync(
        request.getEmail(),
        "Order confirmed: " + order.getId()
    );

    return order;  // Returns immediately
}
```

---

## 9. Best Practices

### Metrics Best Practices

#### 1. Measure What Matters

**Don't**:
```java
Counter.builder("method.called").increment();  // Useless
```

**Do**:
```java
Counter.builder("orders.created")
    .tag("status", order.getStatus())
    .tag("payment_method", order.getPaymentMethod())
    .increment();
```

---

#### 2. Use Appropriate Metric Types

| Metric Type | Use For | Don't Use For |
|-------------|---------|---------------|
| **Counter** | Total requests, errors | Current connections (use Gauge) |
| **Gauge** | Current memory, active threads | Request count (use Counter) |
| **Histogram** | Request latency, response size | Business counts (use Counter) |
| **Summary** | Pre-calculated quantiles | When you need aggregation (use Histogram) |

---

#### 3. Keep Cardinality Low

**Bad** (high cardinality):
```java
// Creates millions of unique time series!
registry.counter("orders", "order_id", orderId).increment();
```

**Good** (low cardinality):
```java
// Limited to ~10 unique time series
registry.counter("orders", "status", orderStatus).increment();
```

---

#### 4. Use Percentiles for Latency

**Don't rely on averages**:
```
Average: 100ms (looks good!)
But:
- p50: 50ms  (50% of requests)
- p95: 200ms (95% of requests)
- p99: 5s    (1% of users suffer!)
```

**Monitor p95 and p99**, not just average.

---

### Tracing Best Practices

#### 1. Sample Appropriately

**Production**: 1-10% sampling
```yaml
spring.sleuth.sampler.probability: 0.1  # 10%
```

**Development**: 100% sampling
```yaml
spring.sleuth.sampler.probability: 1.0  # 100%
```

---

#### 2. Add Meaningful Tags

```java
Span span = tracer.nextSpan().name("process-payment").start();
try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
    span.tag("payment.method", "credit_card");
    span.tag("payment.amount", String.valueOf(amount));
    span.tag("customer.id", customerId);
    // ...
}
```

**Benefits**: Filter traces by payment method, amount range, etc.

---

#### 3. Don't Over-Instrument

**Bad** (too many spans):
```java
Span span1 = tracer.nextSpan().name("validate-input").start();
// ...
Span span2 = tracer.nextSpan().name("check-null").start();
// ...
Span span3 = tracer.nextSpan().name("trim-string").start();
```

**Good** (meaningful operations only):
```java
Span span = tracer.nextSpan().name("validate-order").start();
// All validation logic
```

---

### Logging Best Practices

#### 1. Use Structured Logging

**Always output JSON** for machine parsing:
```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "ERROR",
  "message": "Payment failed",
  "orderId": "12345",
  "userId": "789",
  "error": "InsufficientFundsException",
  "traceId": "abc-123"
}
```

---

#### 2. Include Correlation IDs

**Every log should have trace ID**:
```java
log.info("Processing order",
    kv("orderId", orderId),
    kv("traceId", MDC.get("traceId"))  // Automatically added by Sleuth
);
```

---

#### 3. Log at Appropriate Levels

**INFO**: Business events
```java
log.info("Order created", kv("orderId", order.getId()));
```

**WARN**: Recoverable issues
```java
log.warn("Retry attempt", kv("attempt", 3), kv("maxAttempts", 5));
```

**ERROR**: Actual errors
```java
log.error("Payment failed", kv("orderId", orderId), kv("error", e.getMessage()));
```

---

#### 4. Don't Log Sensitive Data

**Never log**:
- Passwords
- Credit card numbers
- Social security numbers
- API keys

**Mask if necessary**:
```java
log.info("Payment processed",
    kv("cardNumber", maskCardNumber(cardNumber))  // "****-****-****-1234"
);
```

---

### Alerting Best Practices

#### 1. Alert on Symptoms, Not Causes

**Bad**:
```
Alert: CPU > 80%
```

**Good**:
```
Alert: p95 latency > 1s for 5 minutes
```

**Why**: High CPU might be fine (batch job). Slow responses directly impact users.

---

#### 2. Avoid Alert Fatigue

**Use proper thresholds and windows**:
```
# Bad: Too sensitive
Alert: Error rate > 0% (alerts on every error)

# Good: Meaningful threshold
Alert: Error rate > 1% for 5 minutes
```

---

#### 3. Include Runbooks

**Every alert should have**:
- What does this alert mean?
- What's the impact?
- How do I investigate?
- How do I fix it?

---

## 10. Interview Questions

### Question 1: Debugging Latency

**Q: A user complains that "Checkout" is slow. You have 10 microservices. How do you find the bottleneck?**

**A**:
1. **Get Trace ID** from the user or from logs
2. **Open Zipkin/Jaeger** and search for that trace ID
3. **Analyze Waterfall View**:
   ```
   API Gateway     [==] 10ms
   Order Service       [================] 200ms
   Inventory Service           [==========================] 500ms  ← BOTTLENECK
   Payment Service                         [========] 100ms
   ```
4. **Investigate Inventory Service**:
   - Check span tags/logs for details
   - Look at database query spans
   - Check for N+1 queries, missing indexes
5. **Correlate with Metrics**:
   - Check p95/p99 latency for Inventory Service
   - Check database connection pool usage
6. **Root Cause**:
   - Found slow database query
   - Added index → latency drops to 50ms

---

### Question 2: Metrics vs Logging

**Q: When should you use Metrics vs Logs vs Traces?**

**A**:

| Use Case | Tool | Why |
|----------|------|-----|
| "Is the system healthy?" | **Metrics** | Aggregated data, trends, alerting |
| "Why did this specific request fail?" | **Logs** | Detailed context, stack traces |
| "Which service is slow?" | **Traces** | Request flow, latency breakdown |
| "How many orders were created today?" | **Metrics** | Counter aggregation |
| "What was the error message for order 12345?" | **Logs** | Specific event details |
| "Where does the checkout flow spend time?" | **Traces** | Span durations |

**Example**:
1. **Metrics alert**: "Error rate > 5%"
2. **Traces show**: "Payment Service has high error rate"
3. **Logs reveal**: "Payment API returns 503 Service Unavailable"

---

### Question 3: Liveness vs Readiness Probes

**Q: What's the difference between Liveness and Readiness probes in Kubernetes?**

**A**:

| Probe | Question | Action on Failure | Use Case |
|-------|----------|-------------------|----------|
| **Liveness** | "Is the app alive?" | **Restart container** | Deadlock, out of memory |
| **Readiness** | "Is the app ready to serve traffic?" | **Remove from load balancer** | Warming up cache, DB connection not ready |
| **Startup** | "Has the app started?" | **Kill container** | Slow startup (give more time) |

**Example**:
```
Startup:   [========] 2 minutes  ← Slow JVM startup
           ✓ Passes
Liveness:  [check every 10s]     ← Container alive?
Readiness: [check every 5s]      ← Ready for traffic?
           ✗ Fails (cache warming)
           → Removed from LB, not killed
           ✓ Passes after 30s
           → Added back to LB
```

---

### Question 4: Trace ID Importance

**Q: Why is a Trace ID important in distributed systems?**

**A**:

**Without Trace ID**:
```
Service A logs: "Request received"
Service B logs: "Processing payment"
Service C logs: "Error occurred"

Which requests are related? Unknown!
```

**With Trace ID**:
```
Service A: [TraceID: abc-123] "Request received"
Service B: [TraceID: abc-123] "Processing payment"
Service C: [TraceID: abc-123] "Error occurred"

All related to the same user request!
```

**Benefits**:
1. **Correlate logs** across services
2. **Visualize request flow** in tracing UI
3. **Debug production issues** (customer reports error, search by trace ID)
4. **Measure latency** per service
5. **Identify dependencies** (service map)

---

### Question 5: High Cardinality Problem

**Q: What's wrong with this metric?**
```java
registry.counter("http_requests", "user_id", userId).increment();
```

**A**:

**Problem**: **High Cardinality**

- 1 million users → 1 million unique time series
- Prometheus/Grafana will run out of memory
- Queries will be slow

**Fix**: Use low-cardinality labels
```java
// Good: Limited unique values
registry.counter("http_requests",
    "method", request.getMethod(),        // ~7 values (GET, POST, etc.)
    "endpoint", request.getEndpoint(),    // ~50 values
    "status", response.getStatus()        // ~20 values (200, 404, 500, etc.)
).increment();
```

**Rule**: Keep cardinality < 1000 per metric

---

### Question 6: Sampling Strategy

**Q: Your application receives 10,000 requests per second. How would you approach distributed tracing?**

**A**:

**Problem**: Tracing every request → 10,000 spans/second → expensive

**Solution**: **Sampling**

**Option 1: Head-Based Sampling (Simple)**
```yaml
spring.sleuth.sampler.probability: 0.01  # 1% = 100 traces/second
```
- ✅ Simple, low overhead
- ❌ Might miss rare errors

**Option 2: Tail-Based Sampling (Better)**
```
Sample:
- 100% of errors
- 100% of slow requests (> 1s)
- 1% of successful requests
```
- ✅ Keep important traces
- ❌ Higher memory usage (must buffer)

**Option 3: Adaptive Sampling (Best)**
```
Normal operation: 1% sampling
Incident detected: 50% sampling (more visibility)
```

**Recommendation**: Start with 10% head-based, move to tail-based if needed.

---

### Question 7: Metric Aggregation

**Q: You have 100 service instances. How do you calculate total requests per second?**

**A**:

**Prometheus Query**:
```promql
# Sum across all instances
sum(rate(http_requests_total[5m]))

# Per instance
sum by (instance) (rate(http_requests_total[5m]))

# Per service
sum by (service) (rate(http_requests_total[5m]))
```

**Explanation**:
- `rate(http_requests_total[5m])`: Requests/second over last 5 minutes
- `sum(...)`: Add up all instances
- `by (instance)`: Group by instance

**Result**:
```
{service="order-service"} 5000   (5000 req/s total across all instances)
```

---

### Question 8: Observability Stack Design

**Q: Design an observability stack for a microservices architecture with 20 services.**

**A**:

**Architecture**:
```
┌──────────────────────────────────────────────────────┐
│                  Applications                        │
│  (Spring Boot services with Actuator + Sleuth)      │
└──────────┬────────────┬────────────┬─────────────────┘
           │            │            │
           ↓            ↓            ↓
    ┌───────────┐ ┌──────────┐ ┌──────────┐
    │Prometheus │ │  Zipkin  │ │   ELK    │
    │ (Metrics) │ │ (Traces) │ │  (Logs)  │
    └─────┬─────┘ └────┬─────┘ └────┬─────┘
          │            │            │
          └────────────┼────────────┘
                       ↓
                 ┌───────────┐
                 │  Grafana  │
                 │(Dashboards│
                 │& Alerts)  │
                 └───────────┘
```

**Components**:

1. **Metrics**: Prometheus + Grafana
   - Each service exposes `/actuator/prometheus`
   - Prometheus scrapes every 15s
   - Grafana dashboards for visualization

2. **Traces**: Zipkin or Jaeger
   - Services send traces via HTTP/gRPC
   - 10% sampling rate
   - Zipkin UI for trace search

3. **Logs**: ELK Stack
   - Services output JSON logs to stdout
   - Filebeat ships logs to Logstash
   - Elasticsearch stores logs
   - Kibana for log search

4. **Alerting**: Prometheus Alertmanager → PagerDuty
   - Alert on: Error rate > 1%, p95 latency > 1s, CPU > 80%

**Cost Optimization**:
- Use sampling (1-10%) for traces
- Retain logs for 7 days (90 days in cheaper storage)
- Aggregate metrics (1m resolution → 5m after 30 days)

---

## Quick Check

1. What are the three pillars of observability?
   <details>
   <summary>Answer</summary>
   Logs, Metrics, Traces
   </details>

2. What's the difference between a Counter and a Gauge?
   <details>
   <summary>Answer</summary>
   Counter: Only increases (e.g., total requests). Gauge: Can go up and down (e.g., active connections).
   </details>

3. What is a Span in distributed tracing?
   <details>
   <summary>Answer</summary>
   A unit of work within a trace (e.g., a service call, database query). Has start time, duration, and metadata.
   </details>

4. Why is high cardinality bad for metrics?
   <details>
   <summary>Answer</summary>
   Creates too many unique time series, exhausts memory in Prometheus/Grafana, slows down queries.
   </details>

5. What should a Liveness probe check?
   <details>
   <summary>Answer</summary>
   Whether the application is alive (not deadlocked, not out of memory). Restart if it fails.
   </details>

---

## Summary

**In 3 sentences**:
- **Observability** (Logs, Metrics, Traces) helps you understand and debug distributed systems by examining their outputs.
- **Metrics** show system health (trends, alerts), **Logs** provide detailed context (debugging), and **Traces** visualize request flow (latency analysis).
- **Spring Boot** provides the best out-of-the-box observability with Actuator, Micrometer, and Sleuth, while **Python** and **Phoenix** require more manual setup but have excellent OpenTelemetry support.

---

**Navigation**: [← Previous: Migration & Database](./07-migration-and-database.md) | [Next: Testing & Security →](./09-testing-and-security.md) | [Microservices Guide](./README.md) | [Main Roadmap](../../README.md)
