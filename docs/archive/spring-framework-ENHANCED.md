# Spring Framework Core

> **Before you start**: Do you understand what dependency injection is conceptually? If not, think about it: What happens when a class creates its own dependencies vs. having them provided from outside?

## What is Spring Framework?

Imagine you're building with LEGO blocks. You could:
- **Option 1**: Each block creates and glues together the blocks it needs (rigid, hard to change)
- **Option 2**: A central system hands each block exactly what it needs (flexible, easy to swap)

Spring is Option 2 for Java applications. It's a **container** that creates objects, wires them together, and manages their lifecycle so you don't have to.

**Real-world analogy**: Think of Spring like a restaurant kitchen manager:
- You (the chef) don't go shopping for ingredients yourself
- The manager provides you with exactly what you need, when you need it
- If the supplier changes, the manager handles it - you keep cooking the same way

## Why This Matters

**You'll use Spring when**:
- Building enterprise Java applications (90% of Java jobs use it)
- You need to manage complex dependencies between classes
- You want your code to be testable and loosely coupled

**Interview context**:
- Most common framework question in Java interviews
- Expected to know IoC, DI, Bean lifecycle, and AOP basics
- Often asked: "Why Spring?" or "How does DI work?"

## How It Works

### The IoC (Inversion of Control) Container

```
Traditional Way:                    Spring Way:
┌─────────────┐                    ┌─────────────┐
│ UserService │                    │   Spring    │
│    ↓ new    │                    │  Container  │
│ UserRepo    │                    └──────┬──────┘
└─────────────┘                           ↓
 (You control                       Provides both
  creation)                         UserService + UserRepo
```

**Core Mechanism**:

1. **You define** what objects you need (via annotations or config)
2. **Spring creates** those objects (called "beans")
3. **Spring injects** dependencies automatically
4. **Spring manages** the lifecycle (creation, destruction, etc.)

```java
// WITHOUT Spring - You control everything
public class OrderService {
    private PaymentService paymentService = new PaymentService(); // Tight coupling
    private InventoryService inventoryService = new InventoryService();

    // If PaymentService constructor changes, this breaks!
}
```

```java
// WITH Spring - Spring controls creation and injection
@Component
public class OrderService {
    private final PaymentService paymentService;
    private final InventoryService inventoryService;

    // Spring automatically provides these via constructor
    public OrderService(PaymentService paymentService,
                       InventoryService inventoryService) {
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }

    // If dependencies change, Spring handles it - this code stays the same!
}
```

**Stop and think**: Can you explain why the Spring version is better for testing?

<details>
<summary>Hint (click to expand)</summary>
In tests, you can easily pass mock objects through the constructor. With `new`, you're stuck with real implementations.
</details>

## When to Use Spring

| Use When | Don't Use When |
|----------|----------------|
| ✅ Building enterprise applications | ❌ Simple scripts or utilities |
| ✅ Need database access, web APIs, security | ❌ Performance-critical real-time systems |
| ✅ Team development (consistency matters) | ❌ Learning core Java (Spring hides complexity) |
| ✅ Long-term maintenance (loose coupling helps) | ❌ Serverless functions (cold start penalty) |

**Trade-offs**:
- **Benefit**: Less boilerplate, easier testing, professional ecosystem
- **Cost**: Learning curve, "magic" can be confusing, startup time overhead

## Key Concepts

### 1. Dependency Injection (DI)

Instead of objects creating their dependencies, they **receive** them from outside.

**Three types**:

#### Constructor Injection (✅ Recommended)

```java
@Component
public class OrderService {
    private final PaymentService paymentService; // Can be final (immutable)

    // Spring calls this constructor and provides PaymentService
    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

**Why it's best**:
- Dependencies are clear (all in one place)
- Required dependencies can't be null
- Enables immutability (final fields)
- Easy to test (just call constructor with mocks)

**Try it**: What happens if you add another dependency to the constructor? Does existing code break?

#### Setter Injection

```java
@Component
public class OrderService {
    private InventoryService inventoryService;

    @Autowired  // Spring calls this after creating the object
    public void setInventoryService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }
}
```

**When to use**: Optional dependencies, or when object needs to be reconfigured after creation

#### Field Injection (❌ Avoid)

```java
@Component
public class OrderService {
    @Autowired
    private NotificationService notificationService; // Injected directly
}
```

**Why to avoid**:
- Can't make fields final
- Hard to test (need reflection or Spring test context)
- Hidden dependencies (not obvious what class needs)

**Compare**: If all three work, why do we prefer constructor injection?

### 2. Bean Scopes

Beans can have different lifecycles:

```java
@Configuration
public class AppConfig {

    @Bean  // Default: Singleton (one instance for entire app)
    public CacheManager cacheManager() {
        return new CacheManager();
    }

    @Bean
    @Scope("prototype")  // New instance every time it's requested
    public ShoppingCart shoppingCart() {
        return new ShoppingCart();
    }

    @Bean
    @Scope("request")  // New instance per HTTP request (web apps)
    public RequestContext requestContext() {
        return new RequestContext();
    }
}
```

| Scope | Lifecycle | Use Case |
|-------|-----------|----------|
| **singleton** | One instance per container | Services, repositories, utilities |
| **prototype** | New instance each time | Stateful objects, shopping carts |
| **request** | One per HTTP request | Request-scoped data (web) |
| **session** | One per HTTP session | User session data (web) |

**Try it**: What scope would you use for a UserService? For a User object?

### 3. Configuration Methods

#### Annotation-Based (Most Common)

```java
@Configuration
@ComponentScan(basePackages = "com.example")  // Scan for @Component classes
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost/mydb");
        return ds;
    }
}
```

**Component Scanning**:

```java
@Component  // Generic bean
public class EmailService { }

@Service  // Semantic: Business logic layer
public class OrderService { }

@Repository  // Semantic: Data access layer
public class UserRepository { }

@Controller  // Semantic: Web layer
public class HomeController { }
```

**Stop and think**: `@Service`, `@Repository`, and `@Controller` all do the same thing as `@Component`. Why have different annotations?

<details>
<summary>Hint</summary>
Semantics! They make code more readable and allow Spring to apply layer-specific features (like exception translation for @Repository).
</details>

## Common Patterns

### Pattern 1: Multiple Implementations

**Problem**: You have multiple implementations of an interface. How does Spring know which one to inject?

**Solution**: Use `@Primary` or `@Qualifier`

```java
public interface PaymentService {
    void pay(double amount);
}

@Service
@Primary  // This one is used by default
public class CreditCardPayment implements PaymentService {
    public void pay(double amount) { /* ... */ }
}

@Service
@Qualifier("paypal")  // Named qualifier
public class PayPalPayment implements PaymentService {
    public void pay(double amount) { /* ... */ }
}

@Service
public class OrderService {
    private final PaymentService defaultPayment;
    private final PaymentService paypalPayment;

    public OrderService(
        PaymentService defaultPayment,  // Gets @Primary (CreditCard)
        @Qualifier("paypal") PaymentService paypalPayment) {  // Gets PayPal
        this.defaultPayment = defaultPayment;
        this.paypalPayment = paypalPayment;
    }
}
```

**Apply it**: You have `EmailNotifier` and `SmsNotifier` both implementing `Notifier`. How would you configure them?

## Self-Check Questions

> Answer these from memory before looking back

1. **What** is the difference between IoC and DI?
2. **Why** is constructor injection preferred over field injection?
3. **When** would you use prototype scope instead of singleton?
4. **How** does Spring know which classes to create as beans?
5. **Compare**: `@Component` vs `@Service` vs `@Repository` - what's the difference?

## Practice Exercises

### Standalone Exercises

**Level 1 - Understand**:
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepo;
}
```
What's wrong with this code? How would you fix it?

**Level 2 - Apply**:
Create a `BookService` that depends on both `BookRepository` and `NotificationService`. Use constructor injection.

**Level 3 - Create**:
Design a configuration for an application with:
- Multiple database connections (primary and secondary)
- A cache manager (singleton)
- Shopping cart (prototype)

How would you annotate each?

### Build-Along Project: InvoiceManager App

> **Goal**: Refactor your Week 1 console app to use Spring Core with proper dependency injection

**For Spring Core, refactor your InvoiceManager to**:

1. **Convert services to Spring beans**:
   ```java
   @Service
   public class InvoiceService {
       private final InvoiceRepository invoiceRepository;
       private final CustomerRepository customerRepository;

       // Constructor injection (Spring will call this)
       public InvoiceService(InvoiceRepository invoiceRepository,
                            CustomerRepository customerRepository) {
           this.invoiceRepository = invoiceRepository;
           this.customerRepository = customerRepository;
       }
   }
   ```

2. **Create repositories**:
   ```java
   @Repository
   public class InvoiceRepository {
       private Map<String, Invoice> invoices = new ConcurrentHashMap<>();
       // CRUD methods
   }
   ```

3. **Add configuration**:
   ```java
   @Configuration
   @ComponentScan(basePackages = "com.example.invoicemanager")
   public class AppConfig {
       // Define beans if needed
   }
   ```

4. **Main application**:
   ```java
   @SpringBootApplication
   public class InvoiceManagerApp {
       public static void main(String[] args) {
           ApplicationContext context = SpringApplication.run(InvoiceManagerApp.class, args);
           InvoiceService service = context.getBean(InvoiceService.class);
           // Use service
       }
   }
   ```

**Checkpoint**: By now, your app should:
- ✅ Use Spring to create and inject all services
- ✅ No more manual `new` for services/repositories
- ✅ Properly use constructor injection (not field injection)
- ✅ Services are testable (can mock dependencies)

**Next step**: In Spring Boot topic, you'll add REST API endpoints

**See full project guide**: [BUILD_ALONG_PROJECT.md](../../../BUILD_ALONG_PROJECT.md)

## Common Mistakes

❌ **Mistake 1**: Using field injection everywhere
```java
@Autowired
private UserService userService;  // Hard to test, hidden dependency
```
**Why it's wrong**: Can't make final, hard to test, unclear dependencies
✅ **Instead**: Use constructor injection

❌ **Mistake 2**: Circular dependencies
```java
@Service
public class A {
    @Autowired private B b;
}

@Service
public class B {
    @Autowired private A a;  // A needs B, B needs A - deadlock!
}
```
**Why it's wrong**: Spring can't create either bean (chicken and egg)
✅ **Instead**: Redesign - one should depend on an interface, or use setter injection with `@Lazy`

❌ **Mistake 3**: Not understanding bean scope
```java
@Bean
public ShoppingCart cart() {
    return new ShoppingCart();  // Singleton by default!
}
// All users share the same cart - BUG!
```
**Why it's wrong**: Stateful objects shouldn't be singletons
✅ **Instead**: Use `@Scope("prototype")` or `@Scope("session")`

## Interview Questions

### Knowledge Questions
1. "What is the Spring IoC container?" → _Hint: See "How It Works"_
2. "Explain the bean lifecycle" → _Hint: Creation → DI → Init → Use → Destroy_
3. "Difference between `@Component` and `@Bean`?" → _Hint: `@Component` on classes, `@Bean` in config methods_

### Scenario Questions
1. "You have 5 implementations of `NotificationService`. How do you choose which one gets injected?"
2. "Your application is slow to start. What could be the issue with Spring?" → _Hint: Too many beans, classpath scanning_

### Debugging Questions
```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;  // NullPointerException!
}
```
What's likely wrong? → _Hint: Is `PaymentService` annotated? Is component scanning enabled?_

## How This Connects

**Builds on** (review these if shaky):
- [Java OOP Basics](../../01-core-java/oop/OOP_Class_Object_Fundamentals.md) - Interfaces, inheritance
- [Java Annotations](../../01-core-java/oop/OOP_Advanced_Concepts.md) - How annotations work

**Related concepts** (compare/contrast):
- [Spring Boot](../spring-boot/spring-boot.md) - Builds on Spring Core with auto-configuration
- [Guice (Google)](link) - Alternative DI framework, more lightweight

**Next steps** (learn these next):
- [Spring Boot](../spring-boot/spring-boot.md) - Auto-configuration on top of Core
- [Spring AOP](./spring-aop.md) - Cross-cutting concerns (logging, transactions)
- [Spring Data](../spring-data/spring-data.md) - Database access with Spring

## Summary

**In 3 sentences**:
- Spring is an IoC container that creates and wires objects for you
- It uses Dependency Injection to make code loosely coupled and testable
- Core features: DI (3 types), bean scopes, component scanning, and configuration

**Key takeaway**: **Don't call us, we'll call you** - This is IoC. Instead of your code creating dependencies, Spring calls your constructor and provides them.

## Further Reading

- [Official Spring Docs - Core](https://docs.spring.io/spring-framework/reference/core.html)
- [Baeldung Spring Core Tutorial](https://www.baeldung.com/spring-tutorial)
- [Spring Framework Architecture](https://www.javatpoint.com/spring-tutorial)

---

**Next**: [Spring Boot - Auto-Configuration](../spring-boot/spring-boot.md)
