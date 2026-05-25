# Spring Boot Troubleshooting & Production Issues

## Before You Start

This file assumes you've completed files 01-05. You should understand:
- Auto-configuration and starters
- Building REST APIs
- Actuator and monitoring
- Spring Boot best practices

This file covers **30 real-world production troubleshooting scenarios** you'll face as a Spring Boot developer, organized by category.

---

## Table of Contents

### Deployment & Environment Issues
- Q1: App works locally but fails after deployment
- Q25: App fails only when deployed in Docker

### Performance & Scaling
- Q2: API slow only in production
- Q4: Service crashes under high traffic
- Q18: Reduce startup time
- Q21: Response time inconsistent

### Configuration Issues
- Q3: application.properties changes not reflecting
- Q6: Different configs for dev, test, prod
- Q13: Secure sensitive values (DB passwords)

### Security & Authentication
- Q7: API returns 401 randomly

### Database Issues
- Q8: Database connection pool exhausted
- Q14: @Transactional fails midway
- Q24: Schema changes without breaking production

### Microservices Communication
- Q9: Handle API failures when calling another microservice
- Q17: One microservice down, others failing
- Q22: Trace request across multiple microservices

### Memory & Resource Management
- Q10: Memory usage keeps increasing
- Q20: Handle long-running background jobs

### Error Handling & Retry
- Q11: Implement retry logic for failed REST calls
- Q27: Exception in filter or interceptor

### Deployment & Versioning
- Q12: New version deployed but users hit old behavior
- Q16: API versioning without breaking clients
- Q29: Zero downtime deployment

### Logging & Monitoring
- Q15: Logs missing in production

### Startup & Lifecycle
- Q19: Execute code once after startup
- Q23: Graceful shutdown

### Testing & Development
- Q28: Test production-like behavior locally

### Bean Management
- Q5: Multiple beans of same type error

### Common Mistakes
- Q30: Common mistakes freshers make

### API Management
- Q26: Implement rate limiting

---

## Deployment & Environment Issues

### Q1: Your Spring Boot app works locally but fails after deployment. What are the first 3 things you check?

**Answer:**

This is one of the most common production issues. Here's the systematic approach:

#### 1. Environment Variables & Configuration

**Problem**: Missing or incorrect environment-specific configuration

**What to check**:
```bash
# Check if environment variables are set
echo $DATABASE_URL
echo $SPRING_PROFILES_ACTIVE

# Check active profile in logs
grep "The following profiles are active" application.log
```

**Common issues**:
- Database URL pointing to localhost instead of actual DB server
- Missing credentials (DB password, API keys)
- Wrong profile activated (`dev` instead of `prod`)

**Example fix**:
```yaml
# application-prod.yml
spring:
  datasource:
    url: ${DATABASE_URL}  # Must be set as environment variable
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

```bash
# Set environment variables
export DATABASE_URL=jdbc:postgresql://prod-db.example.com:5432/invoicedb
export DB_USERNAME=prod_user
export DB_PASSWORD=secret123
export SPRING_PROFILES_ACTIVE=prod
```

---

#### 2. External Dependencies (Database, APIs, Services)

**Problem**: Can't connect to external systems

**What to check**:
```bash
# Test database connectivity from deployment server
telnet prod-db.example.com 5432

# Test API endpoints
curl -X GET https://payment-api.example.com/health

# Check DNS resolution
nslookup prod-db.example.com
```

**Common issues**:
- Firewall blocking connections
- Network security groups not allowing traffic
- Service discovery not configured (in microservices)
- SSL/TLS certificate issues

**Example error**:
```
com.mysql.cj.jdbc.exceptions.CommunicationsException:
Communications link failure
```

**Fix**: Update security groups, firewall rules, or check VPN connectivity

---

#### 3. Resource Limits (Memory, CPU, Disk)

**Problem**: Insufficient resources allocated

**What to check**:
```bash
# Check container/JVM memory limits
java -XX:+PrintFlagsFinal -version | grep MaxHeapSize

# Docker memory limits
docker stats

# Kubernetes pod limits
kubectl describe pod invoice-service-pod
```

**Common issues**:
- Default JVM heap too small for production workload
- Docker container memory limit too restrictive
- Disk full (can't write logs, temp files)

**Example fix**:
```bash
# Increase heap size
java -Xmx2g -Xms512m -jar invoice-service.jar

# Docker with memory limits
docker run -m 2g -e JAVA_OPTS="-Xmx1536m" invoice-service:latest

# Kubernetes deployment
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

---

**Debugging checklist**:
```
✅ Environment variables set correctly?
✅ Active profile is correct (dev/test/prod)?
✅ Can connect to database from deployment server?
✅ Can reach external APIs?
✅ Sufficient memory/CPU allocated?
✅ Disk space available?
✅ Correct JAR/Docker image deployed?
✅ Dependencies (Redis, Kafka) running?
```

---

### Q25: Your Spring Boot app fails only when deployed in Docker. Why?

**Answer:**

Common Docker-specific issues:

#### 1. Environment Variables Not Passed

**Problem**:
```bash
# Running locally
export DATABASE_URL=jdbc:mysql://localhost:3306/db
java -jar app.jar  # ✅ Works

# Docker without env vars
docker run invoice-service:latest  # ❌ Fails - no DATABASE_URL
```

**Fix**:
```bash
# Pass environment variables
docker run -e DATABASE_URL=jdbc:mysql://host.docker.internal:3306/db \
           -e SPRING_PROFILES_ACTIVE=prod \
           invoice-service:latest

# Or use .env file
docker run --env-file .env invoice-service:latest
```

---

#### 2. Localhost References Don't Work

**Problem**:
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/db  # ❌ Doesn't work in Docker
```

**Why**: `localhost` in Docker refers to the container itself, not the host machine

**Fix**:
```yaml
# Use host.docker.internal (Mac/Windows) or host IP
spring:
  datasource:
    url: jdbc:mysql://host.docker.internal:3306/db  # ✅ Mac/Windows

# Or use Docker network
# docker-compose.yml
services:
  app:
    depends_on:
      - mysql
  mysql:
    image: mysql:8

# application.yml (use service name)
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/db  # ✅ Service name from docker-compose
```

---

#### 3. Insufficient Memory

**Problem**:
```
java.lang.OutOfMemoryError: Java heap space
```

**Fix**:
```dockerfile
# Dockerfile
FROM openjdk:17-slim

# Set memory limits
ENV JAVA_OPTS="-Xmx1g -Xms512m"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/invoice-service.jar"]
```

```bash
# Run with explicit memory
docker run -m 2g invoice-service:latest
```

---

#### 4. File Permissions

**Problem**: Can't write logs or temp files

**Fix**:
```dockerfile
# Create user with proper permissions
RUN useradd -m appuser
USER appuser

# Ensure writable directories
VOLUME ["/app/logs", "/tmp"]
```

---

#### 5. Missing Dependencies

**Problem**: Works locally but missing libraries in Docker

**Fix**:
```dockerfile
# Use slim images and install dependencies
FROM openjdk:17-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

---

## Performance & Scaling

### Q2: A REST API is slow only in production, not locally. How do you debug it?

**Answer:**

Systematic approach to diagnose slow APIs in production:

#### 1. Enable Request Logging

**Add timing logs**:
```java
@Component
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        long startTime = System.currentTimeMillis();

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            HttpServletRequest req = (HttpServletRequest) request;
            log.info("Request: {} {} took {}ms",
                req.getMethod(), req.getRequestURI(), duration);
        }
    }
}
```

---

#### 2. Use Actuator Metrics

**Check endpoint timings**:
```bash
# Enable metrics
curl http://localhost:8080/actuator/metrics/http.server.requests

# Filter by URI
curl http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/invoices
```

**Response**:
```json
{
  "name": "http.server.requests",
  "measurements": [
    {
      "statistic": "COUNT",
      "value": 1000
    },
    {
      "statistic": "MAX",
      "value": 2.5  // 2.5 seconds max!
    }
  ]
}
```

---

#### 3. Profile Database Queries

**Problem**: N+1 query problem

**Enable SQL logging**:
```yaml
# application.yml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE

spring:
  jpa:
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true
```

**Look for patterns like this** (N+1 problem):
```
SELECT * FROM invoice WHERE id = 1
SELECT * FROM invoice_item WHERE invoice_id = 1
SELECT * FROM invoice_item WHERE invoice_id = 2
SELECT * FROM invoice_item WHERE invoice_id = 3
... (repeats for every invoice)
```

**Fix with JOIN FETCH**:
```java
// ❌ BAD: Causes N+1 queries
@Query("SELECT i FROM Invoice i")
List<Invoice> findAll();

// ✅ GOOD: Single query with JOIN
@Query("SELECT i FROM Invoice i LEFT JOIN FETCH i.items")
List<Invoice> findAllWithItems();
```

---

#### 4. Check External API Calls

**Problem**: Slow third-party API

**Add timing around external calls**:
```java
@Service
public class PaymentService {

    @Autowired
    private RestTemplate restTemplate;

    public PaymentResponse processPayment(PaymentRequest request) {
        long start = System.currentTimeMillis();

        try {
            ResponseEntity<PaymentResponse> response = restTemplate.postForEntity(
                "https://payment-gateway.com/charge", request, PaymentResponse.class
            );
            return response.getBody();
        } finally {
            long duration = System.currentTimeMillis() - start;
            log.info("Payment API call took {}ms", duration);
        }
    }
}
```

**If external API is slow, add timeout**:
```java
@Bean
public RestTemplate restTemplate() {
    HttpComponentsClientHttpRequestFactory factory =
        new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(5000);  // 5 seconds
    factory.setReadTimeout(10000);    // 10 seconds
    return new RestTemplate(factory);
}
```

---

#### 5. Check Connection Pool Exhaustion

**Problem**: Waiting for available database connections

**Monitor HikariCP**:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10  # Too small?
      connection-timeout: 30000

# Enable HikariCP metrics
management:
  metrics:
    enable:
      hikari: true
```

**Check metrics**:
```bash
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active
curl http://localhost:8080/actuator/metrics/hikaricp.connections.pending
```

**If connections are exhausted, increase pool size**:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20  # Increase based on load
```

---

#### 6. Network Latency

**Problem**: Production database is geographically distant

**Test network latency**:
```bash
# Ping database server
ping prod-db.example.com

# Time a simple query
time mysql -h prod-db.example.com -u user -p -e "SELECT 1"
```

**Solutions**:
- Move database closer to application servers
- Use read replicas in same region
- Enable query caching

---

#### 7. Use APM Tools

**Production-grade monitoring**:

**Micrometer + Prometheus**:
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

**Spring Boot Admin**:
```xml
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-starter-client</artifactId>
</dependency>
```

**Distributed tracing (Spring Cloud Sleuth)**:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
```

---

**Performance debugging checklist**:
```
✅ Request timing logged?
✅ Database queries optimized (no N+1)?
✅ External API calls fast?
✅ Connection pool sized correctly?
✅ Network latency acceptable?
✅ JVM heap sufficient?
✅ Garbage collection not pausing too long?
✅ Indexes on database columns?
```

---

### Q4: Your Spring Boot service crashes under high traffic. What could be the reasons?

**Answer:**

Common causes and solutions:

#### 1. Memory Issues (OutOfMemoryError)

**Symptoms**:
```
java.lang.OutOfMemoryError: Java heap space
```

**Diagnosis**:
```bash
# Enable heap dump on OOM
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/tmp/heapdump.hprof \
     -jar app.jar

# Analyze heap dump with jvisualvm or Eclipse MAT
```

**Solutions**:
- Increase heap size: `-Xmx2g`
- Fix memory leaks (use profiler to find objects not being GC'd)
- Implement pagination for large result sets

```java
// ❌ BAD: Loads all invoices into memory
@GetMapping("/invoices")
public List<Invoice> getAllInvoices() {
    return invoiceRepository.findAll();  // Could be millions!
}

// ✅ GOOD: Pagination
@GetMapping("/invoices")
public Page<Invoice> getAllInvoices(Pageable pageable) {
    return invoiceRepository.findAll(pageable);
}
```

---

#### 2. Thread Pool Exhaustion

**Symptoms**:
```
org.apache.tomcat.util.threads.ThreadPoolExecutor: Pool exhausted
```

**Diagnosis**:
```yaml
# Check Tomcat thread pool metrics
management:
  endpoints:
    web:
      exposure:
        include: metrics

# Check active threads
curl http://localhost:8080/actuator/metrics/tomcat.threads.busy
curl http://localhost:8080/actuator/metrics/tomcat.threads.current
```

**Solutions**:
```yaml
# Increase thread pool size
server:
  tomcat:
    threads:
      max: 200  # Default is 200
      min-spare: 10
    max-connections: 10000  # Default is 10000
    accept-count: 100       # Queue size
```

**Or switch to reactive stack** (WebFlux) for non-blocking I/O:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

---

#### 3. Database Connection Pool Exhausted

**Symptoms**:
```
java.sql.SQLTransientConnectionException:
HikariPool-1 - Connection is not available
```

**Solutions**:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50  # Increase from default 10
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

**Ensure connections are released**:
```java
// ✅ GOOD: @Transactional ensures connection is released
@Transactional
public void processInvoice(Invoice invoice) {
    invoiceRepository.save(invoice);
}
```

---

#### 4. Synchronous Blocking Calls

**Problem**: Every request waits for slow external API

```java
// ❌ BAD: Synchronous call blocks thread
@GetMapping("/payment-status/{id}")
public PaymentStatus getStatus(@PathVariable String id) {
    // Blocks thread for 5 seconds!
    return restTemplate.getForObject(
        "https://slow-api.com/status/" + id,
        PaymentStatus.class
    );
}
```

**Solution**: Use async processing

```java
// ✅ GOOD: Async with CompletableFuture
@GetMapping("/payment-status/{id}")
public CompletableFuture<PaymentStatus> getStatus(@PathVariable String id) {
    return CompletableFuture.supplyAsync(() ->
        restTemplate.getForObject(
            "https://slow-api.com/status/" + id,
            PaymentStatus.class
        )
    );
}
```

---

#### 5. No Rate Limiting

**Problem**: Single client floods server with requests

**Solution**: Implement rate limiting

```java
@Component
public class RateLimitingFilter implements Filter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                        FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String clientId = req.getRemoteAddr();

        Bucket bucket = buckets.computeIfAbsent(clientId, k ->
            Bucket.builder()
                .addLimit(Bandwidth.simple(100, Duration.ofMinutes(1)))
                .build()
        );

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            HttpServletResponse resp = (HttpServletResponse) response;
            resp.setStatus(429);  // Too Many Requests
            resp.getWriter().write("Rate limit exceeded");
        }
    }
}
```

---

#### 6. Cascading Failures (No Circuit Breaker)

**Problem**: If payment API is down, all requests fail

**Solution**: Use Resilience4j Circuit Breaker

```java
@Service
public class PaymentService {

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        return restTemplate.postForObject(
            "https://payment-api.com/charge",
            request,
            PaymentResponse.class
        );
    }

    // Fallback when circuit is open
    public PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.error("Payment service unavailable, using fallback", ex);
        return new PaymentResponse("PENDING", "Will retry later");
    }
}
```

---

#### 7. Inefficient Database Queries

**Problem**: Slow queries under load

**Example**: Full table scan
```sql
-- ❌ BAD: No index on customer_email
SELECT * FROM invoices WHERE customer_email = 'john@example.com';
```

**Solution**: Add indexes
```sql
-- ✅ GOOD: Index on frequently queried column
CREATE INDEX idx_customer_email ON invoices(customer_email);
```

---

**High traffic debugging checklist**:
```
✅ JVM heap size sufficient?
✅ Thread pool sized correctly?
✅ Database connection pool not exhausted?
✅ Circuit breakers in place for external services?
✅ Rate limiting implemented?
✅ Queries optimized with indexes?
✅ Async processing for slow operations?
✅ Caching enabled for frequently accessed data?
```

---

### Q18: How do you reduce startup time of a Spring Boot application?

**Answer:**

Strategies to speed up application startup:

#### 1. Lazy Initialization

**Enable lazy bean initialization**:
```yaml
# application.yml
spring:
  main:
    lazy-initialization: true
```

**Or selectively**:
```java
@Bean
@Lazy
public ExpensiveBean expensiveBean() {
    return new ExpensiveBean();  // Created only when first used
}
```

**Trade-off**: Errors delayed until bean is actually used

---

#### 2. Reduce Classpath Scanning

**Limit component scanning**:
```java
// ❌ BAD: Scans everything
@SpringBootApplication
public class InvoiceApp {
    // Scans entire classpath
}

// ✅ GOOD: Scan only necessary packages
@SpringBootApplication(scanBasePackages = "com.example.invoice")
public class InvoiceApp {
    // Only scans com.example.invoice.*
}
```

---

#### 3. Disable Unnecessary Auto-Configuration

**Find what's auto-configured**:
```bash
java -jar app.jar --debug
```

**Exclude unnecessary auto-configurations**:
```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,  // If not using DB
    SecurityAutoConfiguration.class     // If not using Spring Security
})
public class InvoiceApp {
}
```

---

#### 4. Use Spring Boot 3.x with GraalVM Native Image

**Build native executable** (starts in milliseconds):
```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

```bash
mvn -Pnative native:compile
./target/invoice-service  # Starts in ~50ms!
```

---

#### 5. Optimize Dependencies

**Remove unused dependencies**:
```bash
# Find dependency tree
mvn dependency:tree

# Remove unused starters
```

**Use specific starters instead of parent**:
```xml
<!-- ❌ BAD: Includes everything -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
</dependency>

<!-- ✅ GOOD: Only what you need -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

---

#### 6. Profile-Specific Optimization

**Disable dev tools in production**:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>  <!-- Not included in production JAR -->
</dependency>
```

---

## Configuration Issues

### Q3: You changed application.properties but changes are not reflecting. Why?

**Answer:**

Common reasons configuration changes don't take effect:

#### 1. Profile-Specific File Overrides

**Problem**: Change in `application.properties` but `application-dev.properties` overrides it

**Example**:
```properties
# application.properties
server.port=8080

# application-dev.properties
server.port=9090  # ← This wins when dev profile is active!
```

**Check active profile**:
```bash
# Look for this in logs
INFO --- The following profiles are active: dev

# Or via Actuator
curl http://localhost:8080/actuator/env
```

**Solution**: Edit the correct profile-specific file

---

#### 2. Didn't Restart Application

**Problem**: Spring Boot doesn't hot-reload property changes

**Solution**:
- Restart the application
- OR use Spring Cloud Config with `@RefreshScope`

```java
@Service
@RefreshScope  // Allows runtime property refresh
public class InvoiceService {

    @Value("${invoice.tax-rate}")
    private double taxRate;  // Can be updated without restart
}
```

```bash
# Trigger refresh
curl -X POST http://localhost:8080/actuator/refresh
```

---

#### 3. Cached JAR File

**Problem**: Old JAR still being used

**Solution**:
```bash
# Clean and rebuild
mvn clean package

# Verify JAR timestamp
ls -lh target/invoice-service.jar

# Run the new JAR
java -jar target/invoice-service.jar
```

---

#### 4. Environment Variables Override

**Problem**: Environment variable has higher precedence

**Spring Boot property precedence** (highest to lowest):
1. Command-line arguments (`--server.port=9000`)
2. Environment variables (`SERVER_PORT=9000`)
3. `application-{profile}.properties`
4. `application.properties`

**Example**:
```bash
# This overrides application.properties
export SERVER_PORT=9090
java -jar app.jar  # Will use port 9090, not 8080 from properties
```

**Solution**: Check environment variables
```bash
env | grep SERVER_PORT
```

---

#### 5. External Configuration Overrides

**Problem**: Using Spring Cloud Config Server that overrides local properties

**Check**:
```yaml
# bootstrap.yml (loaded before application.yml)
spring:
  cloud:
    config:
      uri: http://config-server:8888  # Fetches config from here!
```

**Solution**: Update config server or disable it for local testing

---

#### 6. Typographical Error in Property Name

**Problem**: Misspelled property name

```properties
# ❌ WRONG
server.prot=8080  # Typo: should be "port"

# ✅ CORRECT
server.port=8080
```

**Enable warnings for unknown properties**:
```yaml
spring:
  config:
    activate:
      on-profile: dev
  main:
    allow-bean-definition-overriding: false  # Strict mode
```

---

#### 7. Using @Value Without Restart

**Problem**: Cached value in @Value annotation

```java
@Service
public class InvoiceService {

    @Value("${invoice.discount}")
    private double discount;  // Cached at startup!
}
```

**Solution**: Use `@ConfigurationProperties` for better reloadability

```java
@ConfigurationProperties(prefix = "invoice")
@Component
public class InvoiceProperties {
    private double discount;
    // Getters and setters
}
```

---

**Configuration troubleshooting checklist**:
```
✅ Restarted application?
✅ Editing correct profile file (dev/test/prod)?
✅ Active profile matches your expectation?
✅ Environment variables not overriding?
✅ Property name spelled correctly?
✅ JAR file rebuilt (mvn clean package)?
✅ External config server checked?
```

---

### Q6: You need different configs for dev, test, and prod. How will you design this?

**Answer:**

Best practices for multi-environment configuration:

#### Strategy 1: Spring Profiles (Recommended)

**File structure**:
```
src/main/resources/
├── application.yml              # Common config
├── application-dev.yml          # Development
├── application-test.yml         # Testing
└── application-prod.yml         # Production
```

**application.yml** (common):
```yaml
spring:
  application:
    name: invoice-manager

server:
  port: 8080

# Common JPA settings
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Safe default
```

**application-dev.yml**:
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb  # In-memory H2
    username: sa
    password:

  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.example: DEBUG
```

**application-test.yml**:
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: create-drop  # Recreate schema for tests

logging:
  level:
    com.example: INFO
```

**application-prod.yml**:
```yaml
spring:
  datasource:
    url: ${DATABASE_URL}  # From environment variable
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20

logging:
  level:
    root: WARN
    com.example: INFO
```

**Activate profile**:
```bash
# Development
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Testing
mvn test -Dspring-boot.run.profiles=test

# Production
java -jar app.jar --spring.profiles.active=prod

# Or via environment variable
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar
```

---

#### Strategy 2: External Configuration

**Use environment variables for sensitive data**:
```yaml
# application-prod.yml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/invoicedb}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD}

payment:
  api-key: ${PAYMENT_API_KEY}
```

**Set in production**:
```bash
# Docker
docker run -e DATABASE_URL=jdbc:postgresql://prod-db:5432/db \
           -e DB_USERNAME=prod_user \
           -e DB_PASSWORD=secret123 \
           -e PAYMENT_API_KEY=sk_live_xyz \
           invoice-service:latest

# Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: invoice-secrets
type: Opaque
stringData:
  database-url: jdbc:postgresql://prod-db:5432/db
  db-username: prod_user
  db-password: secret123

# Use in deployment
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: invoice-secrets
        key: database-url
```

---

#### Strategy 3: Spring Cloud Config Server (Centralized)

**Setup Config Server**:
```yaml
# Config Server (separate application)
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/company/config-repo
```

**Config repo structure**:
```
config-repo/
├── invoice-service-dev.yml
├── invoice-service-test.yml
└── invoice-service-prod.yml
```

**Client application**:
```yaml
# bootstrap.yml (client app)
spring:
  application:
    name: invoice-service
  cloud:
    config:
      uri: http://config-server:8888
      fail-fast: true
```

**Benefits**:
- Centralized configuration
- Can update config without redeploying
- Git-based version control
- Encrypted properties support

---

#### Strategy 4: Conditional Beans by Profile

**Different beans for different environments**:
```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:h2:mem:testdb")
            .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        return DataSourceBuilder.create()
            .url(System.getenv("DATABASE_URL"))
            .username(System.getenv("DB_USERNAME"))
            .password(System.getenv("DB_PASSWORD"))
            .build();
    }
}
```

---

#### Best Practices

**1. Never commit secrets to Git**:
```properties
# ❌ BAD - in application.properties
spring.datasource.password=secret123  # Don't commit this!

# ✅ GOOD - use environment variables
spring.datasource.password=${DB_PASSWORD}
```

**2. Use Vault for secret management**:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```

**3. Document required environment variables**:
```markdown
# README.md

## Required Environment Variables

### Development
- None (uses H2 in-memory)

### Production
- `DATABASE_URL` - PostgreSQL connection URL
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `PAYMENT_API_KEY` - Payment gateway API key
```

---

### Q13: How do you secure sensitive values like DB passwords in Spring Boot?

**Answer:**

Multiple strategies for securing sensitive configuration:

#### 1. Environment Variables (Basic)

**Never hardcode secrets**:
```yaml
# ❌ BAD
spring:
  datasource:
    password: mySecretPassword123  # DON'T DO THIS!

# ✅ GOOD
spring:
  datasource:
    password: ${DB_PASSWORD}
```

**Set via environment**:
```bash
export DB_PASSWORD=secret123
java -jar app.jar
```

---

#### 2. Jasypt Encryption

**Encrypt properties in application.yml**:
```xml
<dependency>
    <groupId>com.github.ulisesbocchio</groupId>
    <artifactId>jasypt-spring-boot-starter</artifactId>
    <version>3.0.5</version>
</dependency>
```

**application.yml**:
```yaml
spring:
  datasource:
    password: ENC(encrypted_value_here)  # Encrypted!

jasypt:
  encryptor:
    password: ${JASYPT_ENCRYPTOR_PASSWORD}  # Encryption key from env var
```

**Encrypt a value**:
```bash
java -cp jasypt-1.9.3.jar org.jasypt.intf.cli.JasyptPBEStringEncryptionCLI \
  input="mySecretPassword" \
  password=masterKey \
  algorithm=PBEWithMD5AndDES
```

---

#### 3. HashiCorp Vault (Production-Grade)

**Add dependency**:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```

**bootstrap.yml**:
```yaml
spring:
  cloud:
    vault:
      uri: https://vault.example.com:8200
      token: ${VAULT_TOKEN}
      kv:
        enabled: true
```

**Store secret in Vault**:
```bash
vault kv put secret/invoice-service \
  db.password=secret123 \
  api.key=sk_live_xyz
```

**Use in application**:
```java
@Value("${db.password}")
private String dbPassword;  // Retrieved from Vault!
```

---

#### 4. Kubernetes Secrets

**Create secret**:
```bash
kubectl create secret generic invoice-secrets \
  --from-literal=db-password=secret123 \
  --from-literal=api-key=sk_live_xyz
```

**Use in deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: invoice-service
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: invoice-secrets
              key: db-password
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: invoice-secrets
              key: api-key
```

---

#### 5. AWS Secrets Manager

**Add dependency**:
```xml
<dependency>
    <groupId>com.amazonaws.secretsmanager</groupId>
    <artifactId>aws-secretsmanager-caching-java</artifactId>
</dependency>
```

**Retrieve secret**:
```java
@Service
public class SecretService {

    private final AWSSecretsManager secretsManager;

    public String getDatabasePassword() {
        GetSecretValueRequest request = new GetSecretValueRequest()
            .withSecretId("prod/invoice-service/db-password");

        GetSecretValueResult result = secretsManager.getSecretValue(request);
        return result.getSecretString();
    }
}
```

---

**Security best practices**:
```
✅ Never commit secrets to Git
✅ Use environment variables minimum
✅ Encrypt secrets at rest (Vault, AWS Secrets Manager)
✅ Rotate secrets regularly
✅ Use separate secrets for dev/test/prod
✅ Limit access to production secrets (IAM, RBAC)
✅ Audit secret access
✅ Use managed secrets services (Vault, AWS, Azure Key Vault)
```

---

## Security & Authentication

### Q7: Your API works fine but returns 401 randomly. What could cause this?

**Answer:**

Common causes of random 401 Unauthorized errors:

#### 1. JWT Token Expiration

**Problem**: Token expires during user session

**Check token validity**:
```java
@Component
public class JwtUtil {

    public boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        return expiration.before(new Date());  // Expired?
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
```

**Solution**: Implement token refresh

```java
@PostMapping("/refresh")
public ResponseEntity<?> refreshToken(@RequestBody RefreshTokenRequest request) {
    String refreshToken = request.getRefreshToken();

    if (jwtUtil.validateToken(refreshToken)) {
        String username = jwtUtil.extractUsername(refreshToken);
        String newAccessToken = jwtUtil.generateToken(username);

        return ResponseEntity.ok(new TokenResponse(newAccessToken));
    }

    return ResponseEntity.status(401).body("Invalid refresh token");
}
```

---

#### 2. Session Timeout

**Problem**: Server-side session expires

**Check session timeout**:
```yaml
server:
  servlet:
    session:
      timeout: 30m  # Sessions expire after 30 minutes
```

**Solution**: Increase timeout or use stateless JWT

---

#### 3. Load Balancer Session Affinity

**Problem**: Requests routed to different servers, session not shared

**Scenario**:
```
Request 1 → Server A (login successful, session created)
Request 2 → Server B (no session, returns 401!)
```

**Solutions**:

**A. Sticky Sessions** (session affinity):
```nginx
# NGINX config
upstream backend {
    ip_hash;  # Route same IP to same server
    server backend1.example.com;
    server backend2.example.com;
}
```

**B. Shared Session Store** (better):
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
```

```yaml
spring:
  session:
    store-type: redis
  redis:
    host: redis.example.com
    port: 6379
```

---

#### 4. Clock Skew Between Servers

**Problem**: JWT validation fails due to time mismatch

**Example**:
```
Server A (issues JWT): Timestamp = 2025-01-06 10:00:00
Server B (validates JWT): Timestamp = 2025-01-06 09:58:00 (2 min behind)
→ Token appears to be issued "in the future", validation fails!
```

**Solution**: Allow clock skew tolerance

```java
@Component
public class JwtUtil {

    private static final long CLOCK_SKEW_SECONDS = 60;  // 1 minute tolerance

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setAllowedClockSkewSeconds(CLOCK_SKEW_SECONDS)  // ✅ Add tolerance
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
```

---

#### 5. Concurrent Logout/Token Revocation

**Problem**: User logs out in one browser, but token still valid in another

**Solution**: Implement token blacklist

```java
@Service
public class TokenBlacklistService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    public void revokeToken(String token) {
        long expirationTime = jwtUtil.getExpirationTime(token);
        long ttl = expirationTime - System.currentTimeMillis();

        redisTemplate.opsForValue().set(
            "blacklist:" + token,
            "revoked",
            ttl,
            TimeUnit.MILLISECONDS
        );
    }

    public boolean isTokenRevoked(String token) {
        return redisTemplate.hasKey("blacklist:" + token);
    }
}
```

**Check in filter**:
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain chain) {
        String token = extractToken(request);

        if (token != null && !tokenBlacklistService.isTokenRevoked(token)) {
            // Validate and authenticate
        } else {
            response.setStatus(401);
            return;
        }

        chain.doFilter(request, response);
    }
}
```

---

#### 6. CORS Preflight Failing

**Problem**: Browser sends OPTIONS request, server returns 401

**Solution**: Allow OPTIONS without authentication

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()  // ✅ Allow preflight
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

---

**401 troubleshooting checklist**:
```
✅ Token expiration time reasonable?
✅ Refresh token mechanism implemented?
✅ Sessions shared across servers (Redis)?
✅ Clock skew tolerance configured?
✅ Token revocation/blacklist working?
✅ CORS preflight allowed?
✅ Load balancer sticky sessions configured?
```

---

## Navigation

**Prerequisites:**
- [Auto-Configuration](./01-auto-configuration.md) - Understanding how Spring Boot wires components
- [Starters](./02-starters.md) - Dependency conflicts and resolution
- [REST API Development](./03-rest-api.md) - HTTP error codes and debugging
- [Actuator & Monitoring](./04-actuator-monitoring.md) - Production debugging tools
- [Best Practices](./05-best-practices.md) - Following patterns to avoid issues

**Related:**
- [Spring Core](../spring-core/README.md) - Core dependency injection issues
- [Spring Security Troubleshooting](../../spring-security/05-best-practices.md) - Authentication/authorization issues
- [Microservices Debugging](../../../03-architecture/microservices/08-observability-and-ops.md) - Distributed system issues

**Common Issue Categories:**
- Auto-configuration conflicts and bean creation
- Dependency version mismatches
- HTTP status code troubleshooting (400, 401, 403, 404, 500)
- Database connection and transaction issues
- Production deployment problems

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)