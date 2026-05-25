# Spring Boot Best Practices

## Before You Start

This file assumes you've completed files 01-04. You should understand:
- Auto-configuration
- Starters
- Building REST APIs
- Actuator and monitoring

## Configuration Management

### 1. Use Profiles for Different Environments

**Problem**: Different config for dev, test, prod.

**Solution**: Spring Profiles

```
src/main/resources/
├── application.yml              # Common config (all environments)
├── application-dev.yml          # Development overrides
├── application-test.yml         # Test overrides
└── application-prod.yml         # Production overrides
```

**application.yml** (common):
```yaml
spring:
  application:
    name: invoice-manager

  jpa:
    hibernate:
      ddl-auto: validate  # Safe default
    show-sql: false       # Don't show SQL by default

server:
  port: 8080
```

**application-dev.yml**:
```yaml
spring:
  jpa:
    show-sql: true        # Show SQL in dev
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.example: DEBUG    # Detailed logging in dev

# H2 in-memory for dev
spring:
  datasource:
    url: jdbc:h2:mem:invoicedb
    username: sa
    password:
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
      connection-timeout: 30000

logging:
  level:
    root: WARN
    com.example: INFO
```

**Activate profile**:
```bash
# Development
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Production
java -jar app.jar --spring.profiles.active=prod

# Environment variable
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar
```

### 2. Externalize Configuration

**DON'T** hardcode values:
```java
// BAD
public class InvoiceService {
    private static final String CURRENCY = "USD";
    private static final BigDecimal TAX_RATE = new BigDecimal("0.08");
}
```

**DO** use @ConfigurationProperties:

```java
@ConfigurationProperties(prefix = "app.invoice")
@Component
public class InvoiceConfigProperties {
    private String currency = "USD";
    private BigDecimal taxRate = new BigDecimal("0.08");
    private int maxLineItems = 100;
    private boolean autoGenerateNumber = true;

    // Getters and setters
}
```

**application.yml**:
```yaml
app:
  invoice:
    currency: USD
    tax-rate: 0.08
    max-line-items: 100
    auto-generate-number: true
```

**Use in service**:
```java
@Service
public class InvoiceService {
    private final InvoiceConfigProperties config;

    public InvoiceService(InvoiceConfigProperties config) {
        this.config = config;
    }

    public Invoice create(InvoiceRequest request) {
        Invoice invoice = new Invoice();

        if (config.isAutoGenerateNumber()) {
            invoice.setInvoiceNumber(generateNumber());
        }

        BigDecimal total = calculateTotal(request.getItems());
        BigDecimal tax = total.multiply(config.getTaxRate());

        invoice.setTotalAmount(total.add(tax));
        return repository.save(invoice);
    }
}
```

### 3. Validate Configuration Properties

```java
@ConfigurationProperties(prefix = "app.invoice")
@Validated
public class InvoiceConfigProperties {

    @NotBlank
    private String currency;

    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal taxRate;

    @Min(1)
    @Max(1000)
    private int maxLineItems;

    // Getters and setters
}
```

**If configuration is invalid, app won't start** - fail fast!

### 4. Use Environment Variables for Secrets

```yaml
# DON'T
spring:
  datasource:
    password: MySecretPassword123  # ❌ Hard-coded secret

# DO
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}  # ✅ From environment
```

**Set in production**:
```bash
export DATABASE_URL=jdbc:postgresql://db.example.com:5432/invoicedb
export DB_USERNAME=invoiceapp
export DB_PASSWORD=secure-random-password

java -jar app.jar
```

## Testing Best Practices

### 1. Use @SpringBootTest for Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class InvoiceIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private InvoiceRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void shouldCreateAndRetrieveInvoice() {
        // Create
        InvoiceRequest request = new InvoiceRequest(/*...*/);
        ResponseEntity<Invoice> createResponse = restTemplate.postForEntity(
            "/api/invoices",
            request,
            Invoice.class
        );

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Retrieve
        Long id = createResponse.getBody().getId();
        Invoice invoice = restTemplate.getForObject("/api/invoices/" + id, Invoice.class);

        assertThat(invoice).isNotNull();
        assertThat(invoice.getInvoiceNumber()).isEqualTo(request.getInvoiceNumber());
    }
}
```

### 2. Use @WebMvcTest for Controller Tests

```java
@WebMvcTest(InvoiceController.class)
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService service;

    @Test
    void shouldGetInvoiceById() throws Exception {
        // Given
        Invoice invoice = new Invoice(1L, "INV-001", /*...*/);
        when(service.findById(1L)).thenReturn(invoice);

        // When & Then
        mockMvc.perform(get("/api/invoices/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.invoiceNumber").value("INV-001"));
    }

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        when(service.findById(999L)).thenThrow(new InvoiceNotFoundException(999L));

        mockMvc.perform(get("/api/invoices/999"))
            .andExpect(status().isNotFound());
    }
}
```

### 3. Use @DataJpaTest for Repository Tests

```java
@DataJpaTest
class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldFindByCustomerId() {
        // Given
        Invoice invoice1 = new Invoice(/*customerId=1*/);
        Invoice invoice2 = new Invoice(/*customerId=1*/);
        Invoice invoice3 = new Invoice(/*customerId=2*/);

        entityManager.persist(invoice1);
        entityManager.persist(invoice2);
        entityManager.persist(invoice3);
        entityManager.flush();

        // When
        List<Invoice> invoices = repository.findByCustomerId(1L);

        // Then
        assertThat(invoices).hasSize(2);
        assertThat(invoices).extracting(Invoice::getCustomerId).containsOnly(1L);
    }
}
```

### 4. Use Test Profiles

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: create-drop  # Recreate schema for each test
    show-sql: true

logging:
  level:
    org.hibernate.SQL: DEBUG
```

Activate in tests:
```java
@SpringBootTest
@ActiveProfiles("test")
class InvoiceServiceTest {
    // Tests using H2 database
}
```

### 5. Use Testcontainers for Real Database

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest
@Testcontainers
class InvoiceServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("invoicedb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void testWithRealPostgres() {
        // Test using actual PostgreSQL
    }
}
```

## Logging Best Practices

### 1. Use SLF4J with Logback

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    public Invoice create(InvoiceRequest request) {
        log.debug("Creating invoice for customer: {}", request.getCustomerId());

        try {
            Invoice invoice = repository.save(convertToEntity(request));
            log.info("Invoice created: id={}, number={}", invoice.getId(), invoice.getInvoiceNumber());
            return invoice;
        } catch (DataAccessException e) {
            log.error("Failed to create invoice for customer: {}", request.getCustomerId(), e);
            throw new InvoiceCreationException("Failed to create invoice", e);
        }
    }
}
```

### 2. Use Appropriate Log Levels

| Level | When to use |
|-------|-------------|
| ERROR | Something failed, requires immediate attention |
| WARN  | Something unexpected but not critical |
| INFO  | Important business events (invoice created, payment processed) |
| DEBUG | Detailed flow for debugging |
| TRACE | Very detailed, rarely used |

**Example**:
```java
log.trace("Entering method: createInvoice");  // Too detailed, rarely needed
log.debug("Validating invoice request: {}", request);  // For debugging
log.info("Invoice {} created successfully", invoiceNumber);  // Business event
log.warn("Invoice {} is overdue by {} days", id, days);  // Potential issue
log.error("Failed to send invoice email", exception);  // Failure
```

### 3. Structured Logging

```java
// BAD - String concatenation
log.info("User " + userId + " created invoice " + invoiceId + " with amount " + amount);

// GOOD - Parameterized (faster, safer)
log.info("User {} created invoice {} with amount {}", userId, invoiceId, amount);
```

### 4. Configure Logging Per Environment

```yaml
# application-dev.yml
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG

# application-prod.yml
logging:
  level:
    root: WARN
    com.example: INFO

  file:
    name: /var/log/invoice-manager/application.log

  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

## Exception Handling Best Practices

### 1. Use Custom Exceptions

```java
// Domain exceptions
public class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(Long id) {
        super("Invoice not found with id: " + id);
    }
}

public class DuplicateInvoiceNumberException extends RuntimeException {
    public DuplicateInvoiceNumberException(String invoiceNumber) {
        super("Invoice number already exists: " + invoiceNumber);
    }
}

public class InvalidInvoiceStateException extends RuntimeException {
    public InvalidInvoiceStateException(String message) {
        super(message);
    }
}
```

### 2. Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvoiceNotFoundException.class)
    public ProblemDetail handleNotFound(InvoiceNotFoundException ex) {
        log.warn("Invoice not found: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problem.setTitle("Invoice Not Found");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation failed: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Validation failed"
        );
        problem.setTitle("Validation Error");

        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                err -> err.getDefaultMessage() != null ? err.getDefaultMessage() : "Invalid value"
            ));

        problem.setProperty("errors", errors);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        log.error("Unexpected error occurred", ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred"
        );
        problem.setTitle("Internal Server Error");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
```

### 3. Don't Swallow Exceptions

```java
// BAD
try {
    sendInvoiceEmail(invoice);
} catch (Exception e) {
    // Ignored - email send failure is silent!
}

// GOOD - Log and handle
try {
    sendInvoiceEmail(invoice);
} catch (EmailException e) {
    log.error("Failed to send invoice email for invoice {}", invoice.getId(), e);
    // Maybe retry, or mark invoice for manual email send
    invoice.setEmailSent(false);
}
```

## Database Best Practices

### 1. Never Use ddl-auto=create or update in Production

```yaml
# DON'T in production
spring:
  jpa:
    hibernate:
      ddl-auto: create  # ❌ Drops and recreates tables!
      ddl-auto: update  # ❌ Alters tables automatically (risky)

# DO in production
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # ✅ Only validates schema matches entities
      ddl-auto: none      # ✅ Or don't use Hibernate schema management at all
```

### 2. Use Database Migration Tools

**Flyway** (recommended):

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

```
src/main/resources/db/migration/
├── V1__create_invoices_table.sql
├── V2__add_customer_id_index.sql
└── V3__add_status_column.sql
```

**V1__create_invoices_table.sql**:
```sql
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**V2__add_customer_id_index.sql**:
```sql
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
```

### 3. Use Connection Pooling

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10  # Adjust based on load
      minimum-idle: 5
      connection-timeout: 30000  # 30 seconds
      idle-timeout: 600000       # 10 minutes
      max-lifetime: 1800000      # 30 minutes
```

### 4. Use Transactions Correctly

```java
@Service
@Transactional(readOnly = true)  // Default: read-only
public class InvoiceService {

    // Read operations inherit readOnly=true
    public Invoice findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new InvoiceNotFoundException(id));
    }

    // Write operations override with readOnly=false
    @Transactional
    public Invoice create(InvoiceRequest request) {
        // Transaction starts
        Invoice invoice = repository.save(convertToEntity(request));
        auditLog.log("Invoice created: " + invoice.getId());
        return invoice;
        // Transaction commits here
    }

    @Transactional
    public void delete(Long id) {
        Invoice invoice = findById(id);  // Uses same transaction
        repository.delete(invoice);
    }
}
```

## Security Best Practices

### 1. Don't Return Sensitive Data

```java
// BAD - Returns password hash
@GetMapping("/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id);  // User entity has password field!
}

// GOOD - Use DTO
@GetMapping("/{id}")
public UserResponse getUser(@PathVariable Long id) {
    User user = userRepository.findById(id);
    return new UserResponse(user.getId(), user.getName(), user.getEmail());
    // Password not included
}
```

### 2. Validate Input

```java
public class InvoiceRequest {
    @NotBlank
    @Size(min = 3, max = 20)
    @Pattern(regexp = "^[A-Z0-9-]+$", message = "Invoice number must be alphanumeric")
    private String invoiceNumber;

    @NotNull
    @Positive
    private Long customerId;

    @NotEmpty
    @Size(max = 100)
    @Valid
    private List<InvoiceItemRequest> items;
}
```

### 3. Use HTTPS in Production

```yaml
# application-prod.yml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${KEYSTORE_PASSWORD}
    key-store-type: PKCS12
```

Or use reverse proxy (Nginx, cloud load balancer) for SSL termination.

### 4. Enable Security Headers

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'"))
            .frameOptions(frame -> frame.deny())
            .xssProtection(xss -> xss.enable())
        );
    return http.build();
}
```

## Performance Best Practices

### 1. Use Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("invoices", "customers");
    }
}

@Service
public class InvoiceService {

    @Cacheable(value = "invoices", key = "#id")
    public Invoice findById(Long id) {
        return repository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "invoices", key = "#result.id")
    public Invoice create(Invoice invoice) {
        return repository.save(invoice);
    }

    @CacheEvict(value = "invoices", allEntries = true)
    public void clearCache() {
        // Clears all cached invoices
    }
}
```

### 2. Use Pagination

```java
@GetMapping
public Page<Invoice> getInvoices(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    return service.findAll(PageRequest.of(page, size));
}
```

### 3. Use Async for Non-Critical Operations

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
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
public class EmailService {

    @Async
    public CompletableFuture<Void> sendInvoiceEmail(Invoice invoice) {
        // Send email asynchronously
        log.info("Sending email for invoice {}", invoice.getId());
        // Email sending logic
        return CompletableFuture.completedFuture(null);
    }
}
```

## Deployment Best Practices

### 1. Use Executable JAR

```bash
mvn clean package
java -jar target/invoice-manager-0.0.1-SNAPSHOT.jar
```

### 2. Externalize Config

```bash
# External application.yml
java -jar app.jar --spring.config.location=/etc/invoice-manager/application.yml

# Environment variables
export SPRING_DATASOURCE_URL=jdbc:postgresql://...
java -jar app.jar
```

### 3. Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY target/invoice-manager-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 4. Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: invoicedb
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/invoicedb
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: secret
    depends_on:
      - postgres
```

### 5. Health Checks in Production

```yaml
# application-prod.yml
management:
  endpoint:
    health:
      probes:
        enabled: true

  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

## Common Pitfalls and Solutions

### Pitfall 1: N+1 Query Problem

```java
// BAD - N+1 queries
@GetMapping
public List<Invoice> getAll() {
    List<Invoice> invoices = repository.findAll();
    // Each invoice.getCustomer() triggers a query
    return invoices;
}

// GOOD - Fetch join
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    @Query("SELECT i FROM Invoice i LEFT JOIN FETCH i.items")
    List<Invoice> findAllWithItems();
}
```

### Pitfall 2: Not Handling Timezones

```java
// BAD - Uses system timezone
LocalDateTime now = LocalDateTime.now();

// GOOD - Use UTC
Instant now = Instant.now();
ZonedDateTime utcNow = ZonedDateTime.now(ZoneOffset.UTC);
```

### Pitfall 3: Overusing @Autowired

```java
// BAD - Field injection (hard to test)
@Service
public class InvoiceService {
    @Autowired
    private InvoiceRepository repository;
}

// GOOD - Constructor injection
@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }
}
```

### Pitfall 4: Not Setting Timeouts

```yaml
# Set timeouts
spring:
  datasource:
    hikari:
      connection-timeout: 30000

  mvc:
    async:
      request-timeout: 30000

# RestTemplate timeouts
@Bean
public RestTemplate restTemplate() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(5000);
    factory.setReadTimeout(5000);
    return new RestTemplate(factory);
}
```

## Production Readiness Checklist

### Configuration
- [ ] Use profiles (dev, test, prod)
- [ ] Externalize secrets (environment variables)
- [ ] Use @ConfigurationProperties with validation
- [ ] Set appropriate timeouts

### Database
- [ ] Use ddl-auto=validate or none
- [ ] Use Flyway/Liquibase for migrations
- [ ] Configure connection pooling
- [ ] Add database indexes
- [ ] Use @Transactional correctly

### Security
- [ ] Enable HTTPS
- [ ] Don't expose sensitive data
- [ ] Validate all input
- [ ] Secure actuator endpoints
- [ ] Use security headers

### Monitoring
- [ ] Enable Actuator health checks
- [ ] Add custom metrics
- [ ] Configure liveness/readiness probes
- [ ] Set up logging (JSON format for prod)
- [ ] Integrate with Prometheus/Grafana

### Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Use test profiles
- [ ] Test with Testcontainers

### Performance
- [ ] Use caching where appropriate
- [ ] Implement pagination
- [ ] Use async for non-critical operations
- [ ] Optimize database queries
- [ ] Set appropriate pool sizes

### Deployment
- [ ] Build executable JAR
- [ ] Create Dockerfile
- [ ] Health checks in orchestrator
- [ ] Graceful shutdown enabled
- [ ] Resource limits set

## Self-Check Questions

1. What's the difference between dev and prod profiles?
2. Why should you never use ddl-auto=create in production?
3. What's the benefit of @ConfigurationProperties over @Value?
4. Why use constructor injection over field injection?
5. What's the N+1 query problem and how to fix it?
6. Why externalize secrets to environment variables?

<details>
<summary>Answers</summary>

1. Dev: detailed logging, show SQL, H2 database. Prod: minimal logging, real database, externalized config
2. It drops and recreates tables, destroying all data!
3. Type-safe, validation support, better testability, IDE autocomplete
4. Makes dependencies explicit, easier to test (no Spring needed), immutable (final fields)
5. Loading parent + N children triggers N+1 queries. Fix: use JOIN FETCH or @EntityGraph
6. Security - avoid committing secrets to version control, different secrets per environment
</details>

## Practice Exercises

### Exercise 1: Complete Production Setup
Configure InvoiceManager for production:
1. Create prod profile
2. Externalize all secrets
3. Add Flyway migrations
4. Configure connection pooling
5. Enable all health checks

### Exercise 2: Add Caching
Add caching to:
- Invoice lookup by ID (30 min TTL)
- Customer lookup (1 hour TTL)
- Cache eviction on updates

### Exercise 3: Performance Testing
1. Load test with 1000 concurrent users
2. Identify bottlenecks
3. Add indexes
4. Optimize queries
5. Compare results

### Exercise 4: Docker Deployment
Create:
1. Multi-stage Dockerfile
2. Docker Compose with PostgreSQL
3. Health checks
4. Volume for database persistence

## How This Connects

**Builds on**:
- All previous Spring Boot files
- Spring Core best practices
- Testing strategies

**Leads to**:
---

## Navigation

**Prerequisites:**
- [Auto-Configuration](./01-auto-configuration.md) - Understanding Spring Boot fundamentals
- [Starters](./02-starters.md) - Dependency management
- [REST API Development](./03-rest-api.md) - Building APIs
- [Actuator & Monitoring](./04-actuator-monitoring.md) - Production monitoring

**Next Topics:**
- [Troubleshooting & Q&A](./06-troubleshooting-qa.md) - Common issues and solutions
- [Spring Security](../../spring-security/01-authentication.md) - Securing your application
- [Microservices](../../../03-architecture/microservices/01-overview.md) - Distributed systems with Spring Boot

**Related:**
- [Spring Core Best Practices](../spring-core/05-best-practices.md) - Core Spring patterns
- [Testing Strategies](../../../05-security-quality/testing-strategies/README.md) - Comprehensive testing
- [Code Quality](../../../05-security-quality/code-quality/README.md) - Clean code practices

**Interview Focus:**
- Profile management strategies (dev, test, prod)
- Why not to use Hibernate DDL in production
- Transaction management best practices
- Caching strategies and when to use them
- Security best practices (@PreAuthorize, secrets management)
- Deployment approaches (JAR vs WAR, containerization)

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)

---

**Congratulations!** You've completed Spring Boot fundamentals. Next: Spring Security or Microservices Architecture.
