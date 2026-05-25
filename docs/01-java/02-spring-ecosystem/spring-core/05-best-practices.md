# Spring Core Best Practices and Common Pitfalls

> **Before you start**: Have you completed the previous 4 modules? This file consolidates everything you've learned.

## What This File Covers

This is your **checklist for writing professional Spring code**. It covers:
- ✅ What to do (best practices)
- ❌ What to avoid (common pitfalls)
- 🔧 How to fix problems when they occur
- 🎯 Real interview scenarios

**Think of this as**: The lessons learned from thousands of Spring projects - so you don't make the same mistakes.

---

## Best Practices by Category

### 1. Dependency Injection Best Practices

#### ✅ DO: Use Constructor Injection

```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final EmailService emailService;

    // Constructor injection - recommended
    public InvoiceService(InvoiceRepository repository, EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }
}
```

**Why**:
- Dependencies are clear and explicit
- Enables immutability (`final` fields)
- Easy to test (no Spring needed)
- Fails fast if dependency missing

#### ❌ DON'T: Use Field Injection

```java
@Service
public class InvoiceService {
    @Autowired
    private InvoiceRepository repository;  // Hard to test, mutable

    @Autowired
    private EmailService emailService;     // Hidden dependency
}
```

**Why avoid**:
- Hard to test without Spring
- Can't use `final` (mutable state)
- Dependencies are hidden
- Can create incomplete objects

#### ✅ DO: Inject Interfaces, Not Implementations

```java
@Service
public class InvoiceService {
    private final PaymentService paymentService;  // Interface

    public InvoiceService(PaymentService paymentService) {
        this.paymentService = paymentService;  // Can swap implementations
    }
}
```

**Why**:
- Loose coupling
- Easy to swap implementations
- Easy to mock in tests

#### ❌ DON'T: Inject Concrete Classes When Interface Exists

```java
@Service
public class InvoiceService {
    private final StripePaymentService paymentService;  // Tight coupling!

    public InvoiceService(StripePaymentService paymentService) {
        this.paymentService = paymentService;  // Hard to change
    }
}
```

**Try it**: Your app uses `MySQLUserRepository`. How should other classes depend on it?

<details>
<summary>Answer</summary>

```java
// Create interface
public interface UserRepository {
    User save(User user);
    Optional<User> findById(String id);
}

// Implementation
@Repository
public class MySQLUserRepository implements UserRepository {
    // MySQL-specific logic
}

// Inject interface, not implementation
@Service
public class UserService {
    private final UserRepository repository;  // Interface!

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```
</details>

---

### 2. Bean Scope Best Practices

#### ✅ DO: Keep Singleton Beans Stateless

```java
@Service  // Singleton by default
public class InvoiceService {
    private final InvoiceRepository repository;  // OK - immutable

    // No mutable instance variables!

    public Invoice createInvoice(CreateInvoiceRequest request) {
        // Use only method parameters and local variables
    }
}
```

**Why**:
- Singleton beans are shared across threads
- Mutable state = race conditions
- Stateless = thread-safe

#### ❌ DON'T: Store State in Singleton Beans

```java
@Service  // Singleton
public class InvoiceService {
    private Invoice currentInvoice;  // ❌ Shared state!

    public void process(Invoice invoice) {
        this.currentInvoice = invoice;  // Thread A sets this
        // Thread B overwrites it!
        doSomething();  // Thread A uses wrong invoice!
    }
}
```

**Fix**:
```java
@Service
public class InvoiceService {
    // No instance state

    public void process(Invoice invoice) {
        doSomething(invoice);  // Pass as parameter
    }

    private void doSomething(Invoice invoice) {
        // Use parameter, not instance variable
    }
}
```

#### ✅ DO: Use Prototype Scope for Stateful Beans

```java
@Component
@Scope("prototype")  // New instance each time
public class ReportGenerator {
    private Report report;  // OK - each instance has own state
    private Map<String, Object> context;

    public void setReport(Report report) {
        this.report = report;
    }

    public byte[] generate() {
        // Use instance state
    }
}
```

---

### 3. Configuration Best Practices

#### ✅ DO: Use @ConfigurationProperties for Grouped Properties

```java
@ConfigurationProperties(prefix = "app.email")
@Validated
@Component
public class EmailProperties {
    @NotBlank
    private String host;

    @Min(1)
    @Max(65535)
    private int port;

    private boolean tls = true;

    // Getters and setters
}
```

**Why**:
- Type-safe
- Validation support
- IDE autocomplete
- Better organization

#### ❌ DON'T: Use Many @Value Annotations

```java
@Service
public class EmailService {
    @Value("${app.email.host}")
    private String host;

    @Value("${app.email.port}")
    private int port;

    @Value("${app.email.tls}")
    private boolean tls;

    // Gets messy with many properties
}
```

#### ✅ DO: Use Profiles for Environment-Specific Config

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        // Production database
    }
}
```

#### ❌ DON'T: Use If-Statements for Environment Logic

```java
@Bean
public DataSource dataSource() {
    if (System.getenv("ENV").equals("prod")) {
        // Production
    } else {
        // Development
    }
    // Hard to maintain, not Spring-managed
}
```

---

### 4. Exception Handling Best Practices

#### ✅ DO: Use Specific Exception Types

```java
public class CustomerNotFoundException extends RuntimeException {
    public CustomerNotFoundException(String customerId) {
        super("Customer not found: " + customerId);
    }
}

@Service
public class InvoiceService {
    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new CustomerNotFoundException(customerId));
        // ...
    }
}
```

#### ❌ DON'T: Swallow Exceptions

```java
@Service
public class InvoiceService {
    public void sendEmail(Invoice invoice) {
        try {
            emailService.send(invoice);
        } catch (Exception e) {
            // ❌ Silent failure - no one knows email failed!
        }
    }
}
```

**Fix**:
```java
public void sendEmail(Invoice invoice) {
    try {
        emailService.send(invoice);
    } catch (Exception e) {
        log.error("Failed to send email for invoice: {}", invoice.getId(), e);
        // Rethrow or handle appropriately
        throw new EmailSendException("Failed to send invoice email", e);
    }
}
```

---

### 5. Testing Best Practices

#### ✅ DO: Write Unit Tests Without Spring Context

```java
@Test
public void testCreateInvoice() {
    // Create mocks
    InvoiceRepository mockRepo = mock(InvoiceRepository.class);
    CustomerRepository mockCustomerRepo = mock(CustomerRepository.class);

    // Setup
    Customer customer = new Customer("C1", "Test Customer");
    when(mockCustomerRepo.findById("C1")).thenReturn(Optional.of(customer));
    when(mockRepo.save(any())).thenAnswer(i -> i.getArgument(0));

    // Test - no Spring needed!
    InvoiceService service = new InvoiceService(mockRepo, mockCustomerRepo);
    Invoice invoice = service.createInvoice("C1", items);

    // Verify
    assertNotNull(invoice);
    verify(mockRepo).save(any());
}
```

**Why**:
- Fast (no Spring startup)
- Focused on business logic
- Easy to write

#### ✅ DO: Use @SpringBootTest for Integration Tests

```java
@SpringBootTest
@Transactional  // Rollback after each test
public class InvoiceServiceIntegrationTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    public void testCreateInvoiceIntegration() {
        // Test with real Spring context and dependencies
        Customer customer = customerRepository.save(new Customer("Test"));

        Invoice invoice = invoiceService.createInvoice(customer.getId(), items);

        assertNotNull(invoice.getId());
        // Verify in database
    }
}
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Circular Dependencies

#### ❌ The Problem

```java
@Service
public class ServiceA {
    @Autowired
    private ServiceB serviceB;

    public void methodA() {
        serviceB.methodB();
    }
}

@Service
public class ServiceB {
    @Autowired
    private ServiceA serviceA;  // Circular!

    public void methodB() {
        serviceA.methodA();
    }
}
```

**Error**:
```
The dependencies of some beans in the application context form a cycle:
   serviceA
      ↓
   serviceB
      ↓
   serviceA
```

#### ✅ Solution 1: Redesign (Best)

```java
// Extract shared logic to a third service
@Service
public class SharedService {
    public void sharedLogic() {
        // Logic both A and B need
    }
}

@Service
public class ServiceA {
    private final SharedService sharedService;

    public ServiceA(SharedService sharedService) {
        this.sharedService = sharedService;
    }
}

@Service
public class ServiceB {
    private final SharedService sharedService;

    public ServiceB(SharedService sharedService) {
        this.sharedService = sharedService;
    }
}
```

#### ✅ Solution 2: Use @Lazy

```java
@Service
public class ServiceA {
    private final ServiceB serviceB;

    public ServiceA(@Lazy ServiceB serviceB) {  // Lazy initialization
        this.serviceB = serviceB;
    }
}
```

#### ✅ Solution 3: Use Setter Injection (Least Preferred)

```java
@Service
public class ServiceA {
    private ServiceB serviceB;

    @Autowired
    public void setServiceB(ServiceB serviceB) {
        this.serviceB = serviceB;
    }
}
```

---

### Pitfall 2: N+1 Query Problem

#### ❌ The Problem

```java
@Service
public class InvoiceService {
    public List<Invoice> getAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();  // 1 query

        for (Invoice invoice : invoices) {
            invoice.getCustomer().getName();  // N queries (one per invoice)!
        }

        return invoices;
    }
}
```

**Result**: If you have 100 invoices, you execute 101 queries (1 + 100)!

#### ✅ Solution: Use Fetch Join

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer")
    List<Invoice> findAllWithCustomer();  // Single query with JOIN
}

@Service
public class InvoiceService {
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAllWithCustomer();  // 1 query total
    }
}
```

---

### Pitfall 3: Forgetting @Transactional

#### ❌ The Problem

```java
@Service
public class OrderService {
    public void createOrder(Order order) {
        orderRepository.save(order);

        // If this fails, order is still saved!
        inventoryService.reserveItems(order.getItems());

        // If this fails, order is saved but items not reserved!
        paymentService.charge(order.getTotal());
    }
}
```

#### ✅ Solution: Use @Transactional

```java
@Service
public class OrderService {

    @Transactional  // All-or-nothing
    public void createOrder(Order order) {
        orderRepository.save(order);

        inventoryService.reserveItems(order.getItems());

        paymentService.charge(order.getTotal());

        // If ANY step fails, everything rolls back
    }
}
```

---

### Pitfall 4: Injecting Prototype Into Singleton

#### ❌ The Problem

```java
@Component
@Scope("prototype")
public class ShoppingCart {
    private List<Item> items = new ArrayList<>();
}

@Service  // Singleton
public class OrderService {
    @Autowired
    private ShoppingCart cart;  // Injected ONCE!

    // All users share the same cart!
}
```

#### ✅ Solution: Request New Instance

```java
@Service
public class OrderService {
    @Autowired
    private ApplicationContext context;

    public void processOrder(String userId) {
        ShoppingCart cart = context.getBean(ShoppingCart.class);  // New instance
        // Use cart
    }
}
```

---

### Pitfall 5: Not Validating Configuration

#### ❌ The Problem

```java
@ConfigurationProperties(prefix = "app.api")
@Component
public class ApiProperties {
    private String apiKey;  // Could be null!
    private String endpoint;  // Could be null!
}
```

**Application starts successfully** but fails at runtime when trying to use null values.

#### ✅ Solution: Add Validation

```java
@ConfigurationProperties(prefix = "app.api")
@Validated  // Enable validation
@Component
public class ApiProperties {

    @NotBlank(message = "API key is required")
    private String apiKey;

    @NotBlank(message = "API endpoint is required")
    @Pattern(regexp = "https?://.*", message = "Must be a valid URL")
    private String endpoint;

    // Getters and setters
}
```

**Now application fails at startup** with clear error message if properties missing.

---

### Pitfall 6: Overusing @Autowired

#### ❌ The Problem

```java
@Service
public class InvoiceService {
    @Autowired
    private InvoiceRepository invoiceRepo;

    @Autowired
    private CustomerRepository customerRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PDFGenerator pdfGenerator;

    @Autowired
    private AuditService auditService;

    @Autowired
    private MetricsService metricsService;

    // 6 dependencies - class doing too much!
}
```

**Problem**: Violates Single Responsibility Principle (SRP)

#### ✅ Solution: Split Into Multiple Services

```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final CustomerRepository customerRepository;

    // 2 dependencies - focused responsibility
}

@Service
public class InvoiceNotificationService {
    private final EmailService emailService;
    private final InvoiceRepository invoiceRepository;

    // Handles notifications separately
}

@Service
public class InvoiceReportService {
    private final PDFGenerator pdfGenerator;
    private final InvoiceRepository invoiceRepository;

    // Handles reporting separately
}
```

**Rule of thumb**: If a service has more than 5 dependencies, consider splitting it.

---

## Performance Best Practices

### ✅ DO: Use @Lazy for Expensive Beans

```java
@Configuration
public class AppConfig {

    @Bean
    @Lazy  // Only created when first used
    public ExpensiveResource expensiveResource() {
        return new ExpensiveResource();  // Slow initialization
    }
}
```

### ✅ DO: Use Connection Pooling

```java
@Bean
public DataSource dataSource() {
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl("jdbc:postgresql://localhost/mydb");
    config.setMaximumPoolSize(10);  // Pool connections
    config.setMinimumIdle(2);

    return new HikariDataSource(config);
}
```

### ❌ DON'T: Create New Connections Per Request

```java
// Bad - creates new connection every time
public User getUser(String id) {
    Connection conn = DriverManager.getConnection(url);  // Slow!
    // Query user
    conn.close();
}
```

---

## Security Best Practices

### ✅ DO: Externalize Sensitive Configuration

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost/mydb
    username: ${DB_USERNAME}  # From environment variable
    password: ${DB_PASSWORD}  # From environment variable
```

### ❌ DON'T: Hardcode Credentials

```java
@Bean
public DataSource dataSource() {
    HikariDataSource ds = new HikariDataSource();
    ds.setPassword("admin123");  // ❌ Never commit passwords!
    return ds;
}
```

### ✅ DO: Use Spring Security for Authentication

```java
@Service
public class SecureInvoiceService {

    @PreAuthorize("hasRole('ADMIN')")  // Spring Security
    public void deleteAllInvoices() {
        // Only admins can call this
    }
}
```

---

## Debugging Tips

### Tip 1: Enable Debug Logging

```yaml
logging:
  level:
    org.springframework: DEBUG
    com.example: DEBUG
```

### Tip 2: Use Actuator Endpoints

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,beans,env
```

Access: `http://localhost:8080/actuator/beans` to see all beans

### Tip 3: Use @PostConstruct to Debug Bean Creation

```java
@Component
public class MyBean {

    @PostConstruct
    public void init() {
        System.out.println("MyBean created!");  // Debug when bean is created
    }
}
```

---

## Interview Scenarios

### Scenario 1: "Your application is slow to start"

**Diagnosis**:
- Too many beans being created eagerly
- Component scanning too broad
- Expensive initialization in @PostConstruct

**Solutions**:
```java
// 1. Use @Lazy for expensive beans
@Bean
@Lazy
public ExpensiveResource resource() { }

// 2. Narrow component scan
@ComponentScan(basePackages = "com.example.core")  // Not "com.example"

// 3. Use @Async for initialization
@PostConstruct
@Async
public void init() {
    // Initialize in background
}
```

### Scenario 2: "Users see each other's data"

**Diagnosis**: Singleton bean with mutable state

**Solution**:
```java
// Remove instance variables from singleton
@Service
public class UserService {
    // private User currentUser;  ❌ Remove this

    public User getUser(String userId) {
        // Use method parameters and local variables
    }
}
```

### Scenario 3: "NoSuchBeanDefinitionException"

**Error**: `No qualifying bean of type 'UserRepository' available`

**Common causes**:
1. Missing `@Repository`/`@Service`/`@Component`
2. Not in component scan package
3. Bean defined in wrong profile

**Solutions**:
```java
// 1. Add annotation
@Repository  // ✅ Add this
public class UserRepository { }

// 2. Check package structure
@ComponentScan(basePackages = "com.example")  // Must include UserRepository package

// 3. Check profile
@Repository
@Profile("dev")  // Only available in dev profile!
public class UserRepository { }
```

---

## Checklist for Production-Ready Spring App

### Configuration
- [ ] All sensitive data in environment variables
- [ ] @ConfigurationProperties validated
- [ ] Profile-specific configs (dev, test, prod)
- [ ] Connection pooling configured

### Code Quality
- [ ] Constructor injection (not field injection)
- [ ] Singleton beans are stateless
- [ ] Specific exception types
- [ ] Proper logging (not System.out.println)

### Testing
- [ ] Unit tests without Spring context
- [ ] Integration tests with @SpringBootTest
- [ ] @Transactional on test methods

### Performance
- [ ] @Lazy for expensive beans
- [ ] Appropriate fetch strategies (avoid N+1)
- [ ] Connection pooling
- [ ] Caching for expensive operations

### Security
- [ ] Credentials externalized
- [ ] Input validation
- [ ] Authentication/authorization
- [ ] HTTPS in production

### Monitoring
- [ ] Actuator endpoints
- [ ] Logging configured
- [ ] Metrics collected
- [ ] Health checks

---

## Quick Reference: Common Annotations

| Annotation | Purpose | When to Use |
|------------|---------|-------------|
| `@Component` | Generic bean | Any Spring-managed class |
| `@Service` | Business logic | Service layer |
| `@Repository` | Data access | DAO/Repository layer |
| `@Configuration` | Config class | Define beans programmatically |
| `@Bean` | Define bean | Third-party classes, complex init |
| `@Autowired` | Inject dependency | Constructor/setter (optional on constructor) |
| `@Value` | Inject property | Single properties |
| `@ConfigurationProperties` | Type-safe config | Grouped properties |
| `@Profile` | Environment-specific | Dev vs prod beans |
| `@Lazy` | Lazy initialization | Expensive beans |
| `@Scope` | Bean scope | Prototype, request, session |
| `@Transactional` | Transaction | Database operations |
| `@PostConstruct` | Initialization | After dependency injection |
| `@PreDestroy` | Cleanup | Before bean destruction |

---

## Summary

**Key Takeaways**:

1. **Constructor injection** > Field injection
2. **Singleton beans must be stateless**
3. **Interfaces** > Concrete classes
4. **@ConfigurationProperties** > Many @Value
5. **Profiles** for environment-specific config
6. **@Transactional** for database operations
7. **Validate** configuration at startup
8. **Split** classes with too many dependencies
9. **Test** without Spring when possible
10. **Monitor** with Actuator

**Remember**: Spring is designed to make your life easier, but you need to follow its conventions and best practices. When in doubt:
- Keep it simple
- Follow SOLID principles
- Test your code
- Read the error messages

---

---

## Navigation

**Prerequisites:**
- [IoC & Dependency Injection](./01-ioc-and-di.md) - Core dependency injection concepts
- [Bean Lifecycle & Scopes](./02-bean-lifecycle-scopes.md) - Bean management fundamentals
- [Configuration Approaches](./03-configuration.md) - Different configuration methods
- [Aspect-Oriented Programming](./04-aop.md) - Cross-cutting concerns

**Next Topics:**
- [Spring Boot Auto-Configuration](../../spring-boot/01-auto-configuration.md) - Apply these patterns with Spring Boot
- [Spring Security Best Practices](../../spring-security/05-best-practices.md) - Security-specific patterns
- [Microservices Best Practices](../../../03-architecture/microservices/01-overview.md) - Applying Spring in distributed systems

**Related:**
- [Spring Data JPA](../../spring-data/README.md) - Database access patterns
- [Testing Strategies](../../../05-security-quality/testing-strategies/README.md) - Testing Spring applications
- [Code Quality](../../../05-security-quality/code-quality/README.md) - Clean code practices

**Resources:**
- [Spring Official Docs](https://docs.spring.io/spring-framework/reference/)
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Baeldung Spring Tutorials](https://www.baeldung.com/spring-tutorial)

---

**Congratulations!** You've completed Spring Core fundamentals. You now understand IoC, DI, bean lifecycle, configuration, AOP, and best practices.

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
