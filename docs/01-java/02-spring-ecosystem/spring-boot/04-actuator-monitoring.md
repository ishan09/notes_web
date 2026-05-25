# Spring Boot Actuator and Monitoring

## Before You Start

Can you answer these?
- What is a health check and why is it important?
- What are metrics and why do we need them?
- What does "production-ready" mean?

## What is Spring Boot Actuator?

**Simple explanation**: Actuator adds production-ready features to your application - health checks, metrics, application info - without you writing any code.

**Analogy**: Car dashboard
- **Without Actuator**: Driving without instruments - you don't know speed, fuel, engine temperature
- **With Actuator**: Full dashboard - health, metrics, diagnostics all visible

## Why You Need Actuator

In production, you need to answer:
- Is my application healthy?
- How much memory is it using?
- How many requests per second?
- Which endpoints are slow?
- Are there any errors?

**Without Actuator**: You write custom endpoints, logging, metrics collection.

**With Actuator**: Add one dependency, get 20+ production-ready endpoints.

## Adding Actuator

### Step 1: Add dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Step 2: Run your app

```bash
mvn spring-boot:run
```

### Step 3: Access health endpoint

```bash
curl http://localhost:8080/actuator/health
```

**Output**:
```json
{
  "status": "UP"
}
```

**That's it!** You now have health checks.

## Actuator Endpoints

### Default Endpoints

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/health` | Application health | `{"status": "UP"}` |
| `/info` | Application information | Version, build info |
| `/metrics` | Application metrics | Memory, CPU, HTTP requests |
| `/env` | Environment properties | Configuration values |
| `/loggers` | Logger configuration | Change log levels at runtime |
| `/threaddump` | Thread dump | Debug threading issues |
| `/heapdump` | Heap dump | Memory analysis |
| `/beans` | All Spring beans | See what's configured |
| `/mappings` | All @RequestMapping paths | See all endpoints |
| `/conditions` | Auto-configuration report | What was auto-configured |

### Enabling Endpoints

**By default**: Only `/health` is exposed over HTTP.

**Enable all endpoints** (for development):

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: "*"  # Expose all endpoints
```

**Access**:
```bash
curl http://localhost:8080/actuator
```

**Output** (list of available endpoints):
```json
{
  "_links": {
    "self": {"href": "http://localhost:8080/actuator"},
    "health": {"href": "http://localhost:8080/actuator/health"},
    "info": {"href": "http://localhost:8080/actuator/info"},
    "metrics": {"href": "http://localhost:8080/actuator/metrics"},
    ...
  }
}
```

### Production Configuration (Secure)

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus  # Only expose these
      base-path: /actuator

  endpoint:
    health:
      show-details: when-authorized  # Hide details from public
```

**Stop and think**: Why shouldn't you expose all endpoints in production?

<details>
<summary>Answer</summary>

Security risk! Endpoints like /env show configuration (may include secrets), /heapdump downloads memory dump (may contain sensitive data), /beans shows internal structure. Only expose what's needed.
</details>

## Health Checks

### Basic Health

```bash
curl http://localhost:8080/actuator/health
```

**Output**:
```json
{
  "status": "UP"
}
```

### Detailed Health

```yaml
management:
  endpoint:
    health:
      show-details: always
```

```bash
curl http://localhost:8080/actuator/health
```

**Output**:
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 500000000000,
        "free": 250000000000,
        "threshold": 10485760,
        "path": "/Users/..."
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

**Health Status**:
- `UP`: Everything working
- `DOWN`: Something critical is down
- `OUT_OF_SERVICE`: Temporarily unavailable
- `UNKNOWN`: Can't determine

### Custom Health Indicator

**Use case**: Check if external invoice service is reachable.

```java
package com.example.invoicemanager.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class InvoiceServiceHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        try {
            // Check external service
            boolean isReachable = checkInvoiceService();

            if (isReachable) {
                return Health.up()
                    .withDetail("service", "invoice-service")
                    .withDetail("status", "reachable")
                    .build();
            } else {
                return Health.down()
                    .withDetail("service", "invoice-service")
                    .withDetail("error", "Service unreachable")
                    .build();
            }
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }

    private boolean checkInvoiceService() {
        // Actual check logic (e.g., HTTP ping, database query)
        return true;
    }
}
```

**Result**:
```bash
curl http://localhost:8080/actuator/health
```

```json
{
  "status": "UP",
  "components": {
    "invoiceService": {
      "status": "UP",
      "details": {
        "service": "invoice-service",
        "status": "reachable"
      }
    },
    ...
  }
}
```

### Kubernetes/Docker Health Probes

```yaml
# application.yml
management:
  endpoint:
    health:
      probes:
        enabled: true  # Enable liveness and readiness probes
```

**New endpoints**:
- `/actuator/health/liveness` - Is app alive? (restart if DOWN)
- `/actuator/health/readiness` - Is app ready to serve traffic?

**Kubernetes deployment**:
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: invoice-manager
    image: invoice-manager:1.0
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
```

## Metrics

### View Available Metrics

```bash
curl http://localhost:8080/actuator/metrics
```

**Output**:
```json
{
  "names": [
    "jvm.memory.used",
    "jvm.memory.max",
    "jvm.gc.pause",
    "http.server.requests",
    "system.cpu.usage",
    "process.uptime",
    "tomcat.sessions.active.current",
    ...
  ]
}
```

### View Specific Metric

```bash
# JVM memory usage
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# HTTP requests
curl http://localhost:8080/actuator/metrics/http.server.requests

# CPU usage
curl http://localhost:8080/actuator/metrics/system.cpu.usage
```

**Example output**:
```json
{
  "name": "jvm.memory.used",
  "measurements": [
    {
      "statistic": "VALUE",
      "value": 156483584
    }
  ],
  "availableTags": [
    {
      "tag": "area",
      "values": ["heap", "nonheap"]
    },
    {
      "tag": "id",
      "values": ["G1 Eden Space", "G1 Old Gen", ...]
    }
  ]
}
```

### Filter by Tags

```bash
# Only heap memory
curl http://localhost:8080/actuator/metrics/jvm.memory.used?tag=area:heap

# Only requests to /api/invoices
curl "http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/invoices"
```

### Common Metrics

| Metric | Description |
|--------|-------------|
| `jvm.memory.used` | Current memory usage |
| `jvm.memory.max` | Maximum memory available |
| `jvm.gc.pause` | Garbage collection pause times |
| `system.cpu.usage` | System CPU usage |
| `process.cpu.usage` | Process CPU usage |
| `process.uptime` | Application uptime |
| `http.server.requests` | HTTP request metrics (count, duration) |
| `jdbc.connections.active` | Active database connections |
| `tomcat.threads.busy` | Busy Tomcat threads |

### Custom Metrics

**Use case**: Track how many invoices are created.

```java
package com.example.invoicemanager.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class InvoiceService {

    private final InvoiceRepository repository;
    private final Counter invoiceCreatedCounter;
    private final Counter invoiceDeletedCounter;

    public InvoiceService(InvoiceRepository repository,
                         MeterRegistry meterRegistry) {
        this.repository = repository;

        // Create custom counters
        this.invoiceCreatedCounter = Counter.builder("invoices.created")
            .description("Total invoices created")
            .tag("type", "invoice")
            .register(meterRegistry);

        this.invoiceDeletedCounter = Counter.builder("invoices.deleted")
            .description("Total invoices deleted")
            .register(meterRegistry);
    }

    public Invoice create(Invoice invoice) {
        Invoice saved = repository.save(invoice);
        invoiceCreatedCounter.increment();  // Increment counter
        return saved;
    }

    public void delete(Long id) {
        repository.deleteById(id);
        invoiceDeletedCounter.increment();
    }
}
```

**View metric**:
```bash
curl http://localhost:8080/actuator/metrics/invoices.created
```

**Output**:
```json
{
  "name": "invoices.created",
  "measurements": [
    {
      "statistic": "COUNT",
      "value": 42
    }
  ]
}
```

### Timer for Method Execution

```java
@Service
public class InvoiceService {

    private final Timer invoiceCreationTimer;

    public InvoiceService(MeterRegistry meterRegistry) {
        this.invoiceCreationTimer = Timer.builder("invoice.creation.time")
            .description("Time to create invoice")
            .register(meterRegistry);
    }

    public Invoice create(Invoice invoice) {
        return invoiceCreationTimer.record(() -> {
            // This will be timed
            return repository.save(invoice);
        });
    }
}
```

Or use annotation:

```java
@Timed(value = "invoice.creation.time", description = "Time to create invoice")
public Invoice create(Invoice invoice) {
    return repository.save(invoice);
}
```

## Info Endpoint

### Build Information

Add plugin to pom.xml:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>build-info</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

Add info to application.yml:

```yaml
info:
  app:
    name: Invoice Manager
    description: Invoice Management System
    version: 1.0.0
  company:
    name: Example Corp
```

**Access**:
```bash
curl http://localhost:8080/actuator/info
```

**Output**:
```json
{
  "app": {
    "name": "Invoice Manager",
    "description": "Invoice Management System",
    "version": "1.0.0"
  },
  "company": {
    "name": "Example Corp"
  },
  "build": {
    "artifact": "invoice-manager",
    "name": "invoice-manager",
    "version": "0.0.1-SNAPSHOT",
    "group": "com.example"
  }
}
```

## Prometheus Integration

Prometheus is the industry standard for metrics collection in Kubernetes/cloud environments.

### Step 1: Add dependency

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Step 2: Enable endpoint

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

### Step 3: Access Prometheus endpoint

```bash
curl http://localhost:8080/actuator/prometheus
```

**Output** (Prometheus format):
```
# HELP jvm_memory_used_bytes The amount of used memory
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",id="G1 Eden Space",} 1.56483584E8
jvm_memory_used_bytes{area="heap",id="G1 Old Gen",} 3.2194568E7

# HELP http_server_requests_seconds
# TYPE http_server_requests_seconds summary
http_server_requests_seconds_count{method="GET",uri="/api/invoices",status="200",} 150.0
http_server_requests_seconds_sum{method="GET",uri="/api/invoices",status="200",} 2.5

# HELP invoices_created_total Total invoices created
# TYPE invoices_created_total counter
invoices_created_total{type="invoice",} 42.0
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'invoice-manager'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['localhost:8080']
```

## Build-Along Project: InvoiceManager Monitoring

### Add Actuator Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Configure application.yml

```yaml
# Server
server:
  port: 8080

# Actuator
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator

  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true

  metrics:
    tags:
      application: invoice-manager
      environment: ${ENVIRONMENT:dev}

# Info
info:
  app:
    name: Invoice Manager
    description: Invoice Management System
    version: @project.version@
  java:
    version: @java.version@
```

### Custom Health Indicator

```java
package com.example.invoicemanager.health;

import com.example.invoicemanager.repository.InvoiceRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final InvoiceRepository repository;

    public DatabaseHealthIndicator(InvoiceRepository repository) {
        this.repository = repository;
    }

    @Override
    public Health health() {
        try {
            long count = repository.count();
            return Health.up()
                .withDetail("database", "PostgreSQL")
                .withDetail("invoiceCount", count)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Custom Metrics

```java
package com.example.invoicemanager.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMetrics {

    private final Counter invoicesCreated;
    private final Counter invoicesDeleted;
    private final Timer invoiceCreationTime;

    public InvoiceMetrics(MeterRegistry registry) {
        this.invoicesCreated = Counter.builder("invoices.created")
            .description("Total invoices created")
            .register(registry);

        this.invoicesDeleted = Counter.builder("invoices.deleted")
            .description("Total invoices deleted")
            .register(registry);

        this.invoiceCreationTime = Timer.builder("invoice.creation.time")
            .description("Time to create invoice")
            .register(registry);
    }

    public void recordInvoiceCreated() {
        invoicesCreated.increment();
    }

    public void recordInvoiceDeleted() {
        invoicesDeleted.increment();
    }

    public <T> T recordCreationTime(Supplier<T> operation) {
        return invoiceCreationTime.record(operation);
    }
}
```

### Use Metrics in Service

```java
@Service
public class InvoiceService {

    private final InvoiceRepository repository;
    private final InvoiceMetrics metrics;

    public InvoiceService(InvoiceRepository repository,
                         InvoiceMetrics metrics) {
        this.repository = repository;
        this.metrics = metrics;
    }

    public Invoice create(Invoice invoice) {
        return metrics.recordCreationTime(() -> {
            Invoice saved = repository.save(invoice);
            metrics.recordInvoiceCreated();
            return saved;
        });
    }

    public void delete(Long id) {
        repository.deleteById(id);
        metrics.recordInvoiceDeleted();
    }
}
```

### Test Monitoring

```bash
# 1. Start app
mvn spring-boot:run

# 2. Health check
curl http://localhost:8080/actuator/health

# 3. Create some invoices
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/invoices \
    -H "Content-Type: application/json" \
    -d "{\"invoiceNumber\": \"INV-$i\", \"customerId\": 1, \"items\": []}"
done

# 4. Check custom metrics
curl http://localhost:8080/actuator/metrics/invoices.created
curl http://localhost:8080/actuator/metrics/invoice.creation.time

# 5. Prometheus format
curl http://localhost:8080/actuator/prometheus | grep invoice
```

## Logging Management

### View Current Loggers

```bash
curl http://localhost:8080/actuator/loggers
```

### View Specific Logger

```bash
curl http://localhost:8080/actuator/loggers/com.example.invoicemanager
```

**Output**:
```json
{
  "configuredLevel": "DEBUG",
  "effectiveLevel": "DEBUG"
}
```

### Change Log Level at Runtime

```bash
# Set to DEBUG
curl -X POST http://localhost:8080/actuator/loggers/com.example.invoicemanager \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": "DEBUG"}'

# Reset to default
curl -X POST http://localhost:8080/actuator/loggers/com.example.invoicemanager \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": null}'
```

**Use case**: Production issue - enable DEBUG logging temporarily without restart.

## Securing Actuator Endpoints

With Spring Security:

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }
}
```

**Result**:
- `/actuator/health` and `/actuator/info` - public
- All other actuator endpoints - require ADMIN role

## Environment Variables

### View Environment

```bash
curl http://localhost:8080/actuator/env
```

**Shows**:
- System properties
- Environment variables
- Application properties
- Spring Cloud Config (if used)

### Hide Sensitive Values

```yaml
management:
  endpoint:
    env:
      show-values: when-authorized  # Only show to authorized users
```

## Common Mistakes

### Mistake 1: Exposing all endpoints in production

```yaml
# DON'T in production
management:
  endpoints:
    web:
      exposure:
        include: "*"  # Security risk!
```

**Fix**: Only expose what's needed
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

### Mistake 2: Showing health details publicly

```yaml
# DON'T in production
management:
  endpoint:
    health:
      show-details: always  # Exposes internal info
```

**Fix**:
```yaml
management:
  endpoint:
    health:
      show-details: when-authorized
```

### Mistake 3: Not using liveness/readiness probes

In Kubernetes/Docker, always enable probes:

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
```

### Mistake 4: Not adding application tags to metrics

```yaml
# DO - helps filter in Prometheus/Grafana
management:
  metrics:
    tags:
      application: invoice-manager
      environment: production
      region: us-east-1
```

### Mistake 5: Creating too many custom metrics

Metrics have overhead. Don't create metrics for everything:
- ✅ Key business events (invoices created, payments processed)
- ✅ Critical operations (database queries, external API calls)
- ❌ Every method call
- ❌ Every log statement

## Self-Check Questions

Before moving on, can you answer these?

1. What is the purpose of Spring Boot Actuator?
2. Which endpoints are exposed by default?
3. What's the difference between liveness and readiness probes?
4. How do you create a custom health indicator?
5. How do you create a custom metric?
6. Why is Prometheus integration important?

<details>
<summary>Answers</summary>

1. Provides production-ready features: health checks, metrics, monitoring without custom code
2. Only /actuator/health is exposed over HTTP by default
3. Liveness: Is app alive? (restart if down). Readiness: Is app ready for traffic? (don't send requests if not ready)
4. Implement HealthIndicator interface, return Health.up() or Health.down()
5. Inject MeterRegistry, create Counter/Timer/Gauge, record events
6. Prometheus is industry standard for metrics in Kubernetes/cloud, enables dashboards and alerting
</details>

## Practice Exercises

### Exercise 1: Complete Monitoring Setup

Add to InvoiceManager:
1. Actuator with Prometheus
2. Custom health indicator (check database)
3. Custom metrics (invoices created, updated, deleted)
4. Timer for invoice creation
5. Info endpoint with version

### Exercise 2: Dashboard

Set up Prometheus + Grafana:
1. Run Prometheus (scrape your app)
2. Run Grafana (visualize metrics)
3. Create dashboard with:
   - Invoice creation rate
   - Response times
   - Error rates
   - Memory usage

### Exercise 3: Kubernetes Probes

Create Kubernetes deployment with:
- Liveness probe
- Readiness probe
- Proper delays and thresholds

### Exercise 4: Alerting

Create Prometheus alerts for:
- Application down (health check fails)
- High error rate (>5% of requests fail)
- High memory usage (>80%)
- Slow responses (p95 > 1 second)

---

## Navigation

**Prerequisites:**
- [Auto-Configuration](./01-auto-configuration.md) - Actuator auto-configuration
- [Starters](./02-starters.md) - spring-boot-starter-actuator dependency
- [REST API Development](./03-rest-api.md) - Understanding endpoints

**Next Topics:**
- [Best Practices](./05-best-practices.md) - Testing, profiles, deployment strategies
- [Troubleshooting & Q&A](./06-troubleshooting-qa.md) - Debugging production issues

**Related:**
- [Microservices Observability](../../../03-architecture/microservices/08-observability-and-ops.md) - Distributed tracing, metrics
- [Spring Security](../../spring-security/05-best-practices.md) - Securing actuator endpoints
- [AOP](../spring-core/04-aop.md) - Creating custom metrics with aspects

**Interview Focus:**
- Production-ready features Actuator provides
- Difference between liveness and readiness probes
- How to create custom health indicators and metrics
- Why Prometheus format is used for metrics
- Security considerations for /actuator endpoints

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
