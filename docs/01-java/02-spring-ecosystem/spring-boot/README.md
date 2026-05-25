# Spring Boot

## What is Spring Boot?

Spring Boot is an **opinionated framework** built on top of Spring Framework that eliminates boilerplate configuration and lets you create production-ready applications quickly.

**Key idea**: Convention over Configuration
- Spring Framework: You configure everything manually
- Spring Boot: Smart defaults + auto-configuration, override only what you need

## Learning Path (Study in this order)

```
01. Auto-Configuration        ← How Spring Boot eliminates XML/Config classes
    ↓
02. Starters                  ← Dependency management made simple
    ↓
03. REST APIs                 ← Building web services (InvoiceManager API)
    ↓
04. Actuator & Monitoring     ← Production-ready features
    ↓
05. Best Practices           ← Testing, profiles, deployment
```

## Files in this Module

1. **[01-auto-configuration.md](./01-auto-configuration.md)** - How Spring Boot configures beans automatically
2. **[02-starters.md](./02-starters.md)** - Starter dependencies and how to create custom starters
3. **[03-rest-api.md](./03-rest-api.md)** - Building RESTful APIs with @RestController
4. **[04-actuator-monitoring.md](./04-actuator-monitoring.md)** - Health checks, metrics, observability
5. **[05-best-practices.md](./05-best-practices.md)** - Testing, profiles, externalized config, deployment

## InvoiceManager Evolution

### Week 2: Spring Core (What you built)
```java
// Lots of configuration classes
@Configuration
@ComponentScan("com.example")
@EnableJpaRepositories
@EnableTransactionManagement
public class AppConfig {
    @Bean
    public DataSource dataSource() { ... }

    @Bean
    public EntityManagerFactory emf() { ... }

    @Bean
    public TransactionManager tm() { ... }
}
```

### Week 3: Spring Boot Transformation

```java
// application.yml - just properties
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: admin
  jpa:
    hibernate:
      ddl-auto: validate

// Main class - that's it!
@SpringBootApplication
public class InvoiceManagerApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApplication.class, args);
    }
}

// REST API - expose Invoice operations
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceService service;

    @PostMapping
    public ResponseEntity<Invoice> create(@RequestBody InvoiceRequest req) {
        return ResponseEntity.ok(service.createInvoice(req));
    }

    @GetMapping("/{id}")
    public Invoice getById(@PathVariable Long id) {
        return service.findById(id);
    }
}
```

**What Spring Boot did for you**:
- Auto-configured DataSource from properties
- Auto-configured JPA EntityManager
- Auto-configured Transaction Manager
- Started embedded Tomcat server
- Set up JSON serialization
- Added error handling

## Quick Reference

### Most Important Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@SpringBootApplication` | Main entry point (combines @Configuration + @ComponentScan + @EnableAutoConfiguration) | On main class |
| `@RestController` | REST endpoint class (combines @Controller + @ResponseBody) | On controller classes |
| `@RequestMapping` | Map HTTP requests | `@RequestMapping("/api/invoices")` |
| `@GetMapping` | HTTP GET | `@GetMapping("/{id}")` |
| `@PostMapping` | HTTP POST | `@PostMapping` |
| `@PutMapping` | HTTP PUT | `@PutMapping("/{id}")` |
| `@DeleteMapping` | HTTP DELETE | `@DeleteMapping("/{id}")` |
| `@RequestBody` | Deserialize JSON to object | `create(@RequestBody Invoice inv)` |
| `@PathVariable` | Extract from URL | `get(@PathVariable Long id)` |
| `@RequestParam` | Extract from query string | `search(@RequestParam String name)` |
| `@ConfigurationProperties` | Type-safe config | `@ConfigurationProperties("app.invoice")` |
| `@Value` | Inject single property | `@Value("${app.name}")` |

### HTTP Status Codes (You'll use these)

| Code | Meaning | When to use |
|------|---------|-------------|
| 200 OK | Success | GET, PUT successful |
| 201 Created | Resource created | POST successful |
| 204 No Content | Success, no body | DELETE successful |
| 400 Bad Request | Invalid input | Validation failed |
| 404 Not Found | Resource not found | Invoice doesn't exist |
| 500 Internal Server Error | Server error | Unexpected exception |

### Starter Dependencies

| Starter | What it brings | Use case |
|---------|----------------|----------|
| `spring-boot-starter-web` | Tomcat + Spring MVC + Jackson | REST APIs |
| `spring-boot-starter-data-jpa` | Hibernate + Spring Data JPA | Database access |
| `spring-boot-starter-security` | Spring Security | Authentication/Authorization |
| `spring-boot-starter-validation` | Hibernate Validator | Input validation |
| `spring-boot-starter-actuator` | Health checks, metrics | Production monitoring |
| `spring-boot-starter-test` | JUnit 5 + Mockito + AssertJ | Testing |

## Common Configuration (application.yml)

```yaml
# Server
server:
  port: 8080
  servlet:
    context-path: /api

# Database
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: admin
    password: secret
  jpa:
    hibernate:
      ddl-auto: validate  # never 'create' or 'update' in prod!
    show-sql: false       # true only for dev
    properties:
      hibernate:
        format_sql: true

# Logging
logging:
  level:
    com.example: DEBUG
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG

# Custom app properties
app:
  invoice:
    currency: USD
    tax-rate: 0.08
```

## Study Tips

### 1. Spring vs Spring Boot - Know the difference
- **Spring Framework**: IoC container, DI, AOP - the foundation
- **Spring Boot**: Auto-configuration layer on top of Spring Framework
- Spring Boot doesn't replace Spring - it simplifies Spring setup

### 2. Understand what's happening behind the scenes
Don't just use Spring Boot magic blindly:
- Know what `@SpringBootApplication` does (see 01-auto-configuration.md)
- Understand which beans are auto-configured
- Use `--debug` flag to see auto-configuration report

### 3. Master REST fundamentals before Spring Boot REST
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes (200, 201, 400, 404, 500)
- Request/Response structure
- JSON serialization

### 4. Practice with InvoiceManager
Don't just read - build the InvoiceManager REST API:
- Start with simple CRUD operations
- Add validation
- Add error handling
- Add tests
- See File 03 for complete guide

### 5. Learn debugging techniques
```bash
# Run with debug logging
mvn spring-boot:run --debug

# See what beans Spring Boot created
# Add this to application.yml:
logging:
  level:
    org.springframework.boot.autoconfigure: DEBUG
```

### 6. Testing is critical
Spring Boot makes testing easy:
```java
@SpringBootTest
@AutoConfigureMockMvc
class InvoiceControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateInvoice() throws Exception {
        mockMvc.perform(post("/api/invoices")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"customerId": 1, "amount": 100.00}
                """))
            .andExpect(status().isCreated());
    }
}
```

## Prerequisites

Before studying Spring Boot, you should know:
- ✅ Spring Core (IoC, DI, Bean Lifecycle) - see Spring Core module
- ✅ Java 8+ features (lambdas, streams, Optional)
- ✅ HTTP basics (methods, status codes)
- ✅ JSON format
- ✅ Maven or Gradle

## Quick Start Commands

```bash
# Create new Spring Boot project
# Go to https://start.spring.io/
# Or use CLI:
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.2.0 \
  -d groupId=com.example \
  -d artifactId=invoice-manager \
  -o invoice-manager.zip

# Run application
mvn spring-boot:run

# Run with profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Package as JAR
mvn clean package

# Run JAR
java -jar target/invoice-manager-0.0.1-SNAPSHOT.jar

# Run with external config
java -jar app.jar --spring.config.location=/path/to/application.yml
```

## Common Questions

**Q: Do I still need to know Spring Framework if I'm using Spring Boot?**
A: YES! Spring Boot is built on top of Spring Framework. You need to understand IoC, DI, and bean lifecycle. Spring Boot just auto-configures these for you.

**Q: When should I use Spring Boot vs plain Spring?**
A: Almost always use Spring Boot for new projects. Use plain Spring only if you need complete control over every configuration (rare).

**Q: How do I know what Spring Boot auto-configured?**
A: Run with `--debug` flag or check `/actuator/conditions` endpoint (see File 04).

**Q: Can I override auto-configuration?**
A: Yes! Define your own bean and Spring Boot backs off. Example:
```java
@Bean
public DataSource dataSource() {
    // Your custom configuration
    // Spring Boot won't auto-configure DataSource now
}
```

**Q: What's the difference between @Controller and @RestController?**
A: `@RestController = @Controller + @ResponseBody`. Use @RestController for REST APIs (returns JSON), @Controller for traditional MVC (returns HTML views).

## InvoiceManager Project Goals

By the end of Spring Boot module, your InvoiceManager will have:

**Week 3 - Spring Boot Features**:
- ✅ REST API endpoints (CRUD operations)
- ✅ Request validation (@Valid, @NotNull, @Size)
- ✅ Global error handling (@RestControllerAdvice)
- ✅ Database integration (Spring Data JPA)
- ✅ Custom configuration properties
- ✅ Profiles (dev, test, prod)
- ✅ Health checks and metrics (Actuator)
- ✅ Integration tests

**Example API you'll build**:
```bash
# Create invoice
POST /api/invoices
{
  "customerId": 1,
  "items": [
    {"productId": 101, "quantity": 2, "price": 50.00}
  ]
}

# Get invoice
GET /api/invoices/1

# List all invoices
GET /api/invoices?status=PAID&page=0&size=10

# Update invoice
PUT /api/invoices/1

# Delete invoice
DELETE /api/invoices/1

# Health check
GET /actuator/health
```

## Next Steps

1. Start with **[01-auto-configuration.md](./01-auto-configuration.md)** - understand the magic
2. Work through files in order (01 → 05)
3. Build InvoiceManager REST API as you learn (Week 3)
4. Complete practice exercises in each file
5. Review Spring Security module next

## How This Connects

**Builds on**:
- Spring Core (IoC, DI, Bean Lifecycle)
- Java 8-21 features (lambdas, streams, records)

**Leads to**:
- Spring Data (advanced database operations)
- Spring Security (authentication, authorization)
- Microservices (Spring Cloud)

---

**Time estimate**: 1 week if you already know Spring Core
**Hands-on project**: InvoiceManager REST API (Week 3)
**Key skill**: Building production-ready REST APIs
