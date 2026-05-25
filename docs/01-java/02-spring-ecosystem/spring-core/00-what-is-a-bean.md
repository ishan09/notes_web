# What is a Spring Bean?

> **Before you start**: Do you know what a Java object is? If you can create objects with `new MyClass()`, you're ready!

---

## The Simplest Explanation

A **Spring Bean** is simply a **Java object that Spring manages for you**.

That's it! Nothing magical. It's just an object, but instead of you creating it with `new`, Spring creates it and manages its lifecycle.

---

## Why This Matters

**Without Spring (You manage objects)**:
```java
public class Main {
    public static void main(String[] args) {
        // You create objects manually
        CustomerRepository repo = new CustomerRepository();
        CustomerService service = new CustomerService(repo);

        // You use them
        Customer customer = service.findById("123");

        // You're responsible for managing them
    }
}
```

**With Spring (Spring manages objects = beans)**:
```java
public class Main {
    public static void main(String[] args) {
        // Spring creates and manages objects for you
        ApplicationContext context = SpringApplication.run(MyApp.class);

        // Spring gives you the objects when you need them
        CustomerService service = context.getBean(CustomerService.class);

        // You just use them
        Customer customer = service.findById("123");
    }
}
```

---

## Real-World Analogy

### Analogy 1: Restaurant Kitchen

**Without Spring (You do everything)**:
- You buy ingredients
- You cook the food
- You clean the dishes
- You manage everything yourself

**With Spring (Chef manages for you)**:
- Kitchen has all ingredients ready (beans)
- Chef (Spring) prepares dishes when needed
- You just order and eat
- Kitchen handles all the behind-the-scenes work

### Analogy 2: Library System

**Regular Java Object**:
- You buy your own book
- You store it yourself
- You're responsible for it

**Spring Bean**:
- Library (Spring) has the book
- Library manages it (location, condition, availability)
- You just borrow it when needed
- Library handles everything else

---

## From Java Object to Spring Bean

### Step 1: Regular Java Object (NOT a bean)

```java
public class CustomerService {
    private CustomerRepository repository;

    public CustomerService() {
        // You create dependencies yourself
        this.repository = new CustomerRepository();
    }

    public Customer findById(String id) {
        return repository.findById(id);
    }
}

// Usage - YOU create the object
public class Main {
    public static void main(String[] args) {
        CustomerService service = new CustomerService();  // Manual creation
        Customer customer = service.findById("123");
    }
}
```

**Problems**:
- Hard to test (can't easily mock repository)
- Tightly coupled (service knows exactly which repository to use)
- Multiple instances created unnecessarily
- You manage everything manually

---

### Step 2: Convert to Spring Bean (Spring manages it)

```java
@Service  // ← This makes it a Spring Bean!
public class CustomerService {
    private final CustomerRepository repository;

    // Spring calls this constructor and provides repository
    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public Customer findById(String id) {
        return repository.findById(id);
    }
}

@Repository  // ← This is also a Spring Bean!
public class CustomerRepository {
    public Customer findById(String id) {
        // Database logic
    }
}

// Usage - SPRING creates and manages objects
@SpringBootApplication
public class MyApp {
    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(MyApp.class);

        // Spring already created CustomerService and CustomerRepository
        // Just ask Spring for what you need
        CustomerService service = context.getBean(CustomerService.class);

        Customer customer = service.findById("123");
    }
}
```

**Benefits**:
- ✅ Spring creates objects for you
- ✅ Spring manages their lifecycle (when created, when destroyed)
- ✅ Spring injects dependencies automatically
- ✅ Easy to test (you can inject mock objects)
- ✅ Single instance shared across application (by default)

---

## How Does Spring Know What to Create as a Bean?

Spring looks for special **annotations** that mark a class as a bean:

### Common Bean Annotations

```java
// 1. @Component - Generic bean
@Component
public class MyBean {
    // Spring will create this as a bean
}

// 2. @Service - For business logic layer
@Service
public class CustomerService {
    // Spring creates this and recognizes it as a service
}

// 3. @Repository - For data access layer
@Repository
public class CustomerRepository {
    // Spring creates this and adds database exception translation
}

// 4. @Controller - For web controllers (we'll learn later)
@Controller
public class CustomerController {
    // Spring creates this and handles web requests
}
```

**All of these are beans!** The different names just help organize your code:
- `@Service` → Business logic
- `@Repository` → Database access
- `@Controller` → Web layer
- `@Component` → Everything else

---

## Spring Bean Container (The "Spring Context")

Think of Spring's bean container as a **box that holds all your beans**:

```
┌─────────────────────────────────────────────┐
│         Spring Bean Container               │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ CustomerService │  │ OrderService    │  │
│  │ (Bean)          │  │ (Bean)          │  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │CustomerRepo     │  │ OrderRepo       │  │
│  │ (Bean)          │  │ (Bean)          │  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ EmailService    │  │ PaymentService  │  │
│  │ (Bean)          │  │ (Bean)          │  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

When your application starts:
1. Spring scans for classes with `@Component`, `@Service`, `@Repository`, etc.
2. Spring creates instances (objects) of these classes
3. Spring stores them in its container
4. When you need an object, Spring gives it to you from the container

---

## Complete Example: From Object to Bean

Let's build a simple invoice system:

### Version 1: Without Spring (Regular Objects)

```java
// Regular Java classes (NOT beans)
public class InvoiceRepository {
    public Invoice findById(String id) {
        System.out.println("Finding invoice: " + id);
        return new Invoice(id, 1000.0);
    }
}

public class InvoiceService {
    private InvoiceRepository repository;

    public InvoiceService() {
        // Create dependency manually
        this.repository = new InvoiceRepository();
    }

    public Invoice getInvoice(String id) {
        return repository.findById(id);
    }
}

public class Main {
    public static void main(String[] args) {
        // Create objects manually
        InvoiceService service = new InvoiceService();

        // Use the service
        Invoice invoice = service.getInvoice("INV-001");
        System.out.println("Invoice total: $" + invoice.getTotal());
    }
}
```

**Output**:
```
Finding invoice: INV-001
Invoice total: $1000.0
```

---

### Version 2: With Spring (Using Beans)

```java
// Spring Beans (Spring manages these)
@Repository
public class InvoiceRepository {
    public Invoice findById(String id) {
        System.out.println("Finding invoice: " + id);
        return new Invoice(id, 1000.0);
    }
}

@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    // Spring calls this constructor and provides repository
    public InvoiceService(InvoiceRepository repository) {
        System.out.println("Spring created InvoiceService");
        this.repository = repository;
    }

    public Invoice getInvoice(String id) {
        return repository.findById(id);
    }
}

@SpringBootApplication
public class InvoiceApp implements CommandLineRunner {

    // Spring injects the service
    private final InvoiceService service;

    public InvoiceApp(InvoiceService service) {
        this.service = service;
    }

    public static void main(String[] args) {
        SpringApplication.run(InvoiceApp.class, args);
    }

    @Override
    public void run(String... args) {
        // Use the service that Spring created
        Invoice invoice = service.getInvoice("INV-001");
        System.out.println("Invoice total: $" + invoice.getTotal());
    }
}
```

**Output**:
```
Spring created InvoiceService
Finding invoice: INV-001
Invoice total: $1000.0
```

**What happened?**
1. Spring started and scanned for beans
2. Spring found `@Repository` and created `InvoiceRepository`
3. Spring found `@Service` and created `InvoiceService`
4. Spring saw `InvoiceService` needs `InvoiceRepository` in its constructor
5. Spring automatically injected `InvoiceRepository` into `InvoiceService`
6. Spring gave us the fully-configured `InvoiceService` ready to use!

---

## Key Differences: Object vs Bean

| Aspect | Regular Java Object | Spring Bean |
|--------|-------------------|-------------|
| **Who creates it?** | You (`new MyClass()`) | Spring (automatically) |
| **Who manages it?** | You | Spring |
| **Dependencies** | You wire them manually | Spring injects them |
| **Lifecycle** | You control | Spring controls |
| **Singleton?** | No (new instance each time) | Yes (one instance by default) |
| **Testability** | Hard (tightly coupled) | Easy (inject mocks) |

---

## Why Use Beans Instead of Regular Objects?

### Reason 1: Dependency Injection (No manual wiring)

**Without beans**:
```java
// You create and wire everything manually
InvoiceRepository repo = new InvoiceRepository();
EmailService email = new EmailService();
CustomerService customer = new CustomerService();
InvoiceService service = new InvoiceService(repo, email, customer);
```

**With beans**:
```java
// Spring does all the wiring automatically
@Service
public class InvoiceService {
    // Spring provides all these automatically
    public InvoiceService(
        InvoiceRepository repo,
        EmailService email,
        CustomerService customer
    ) {
        // Just use them!
    }
}
```

### Reason 2: Easy Testing

**Without beans**:
```java
@Test
public void testInvoiceService() {
    InvoiceService service = new InvoiceService();
    // Problem: Can't easily inject mock repository
    // Stuck with real implementation
}
```

**With beans**:
```java
@Test
public void testInvoiceService() {
    // Create mocks
    InvoiceRepository mockRepo = mock(InvoiceRepository.class);
    EmailService mockEmail = mock(EmailService.class);

    // Inject mocks via constructor
    InvoiceService service = new InvoiceService(mockRepo, mockEmail);

    // Test with mocks - easy!
}
```

### Reason 3: Single Instance (Efficient)

**Without beans**:
```java
// New instance every time - wasteful!
InvoiceService service1 = new InvoiceService();
InvoiceService service2 = new InvoiceService();
InvoiceService service3 = new InvoiceService();
// Three separate objects in memory
```

**With beans**:
```java
// Spring creates ONE instance and shares it
@Service
public class InvoiceService { }

// All these get the SAME instance
InvoiceService service1 = context.getBean(InvoiceService.class);
InvoiceService service2 = context.getBean(InvoiceService.class);
InvoiceService service3 = context.getBean(InvoiceService.class);

System.out.println(service1 == service2);  // true - same object!
```

---

## Common Questions

### Q: Is every Java object a Spring bean?
**A: No!** Only objects that Spring manages are beans. You need to tell Spring to manage them using annotations like `@Component`, `@Service`, `@Repository`.

```java
// NOT a bean - regular object
public class MyClass {
    // Spring doesn't know about this
}

// IS a bean - Spring manages it
@Component
public class MyClass {
    // Spring creates and manages this
}
```

### Q: Can I still use `new` with Spring?
**A: Yes!** You can still create objects with `new` for:
- Simple data objects (DTOs, models)
- Objects that don't need dependency injection
- Objects that need to be created per request (like entities)

```java
// Regular objects (not beans)
Customer customer = new Customer();
Invoice invoice = new Invoice();
InvoiceRequest request = new InvoiceRequest();

// But let Spring manage services and repositories (beans)
@Service
public class InvoiceService {
    // This is a bean
}
```

### Q: How do I know what should be a bean?
**A: Rule of thumb**:
- **Make it a bean if**: It has business logic, accesses database, needs dependencies
  - Services (`@Service`)
  - Repositories (`@Repository`)
  - Controllers (`@Controller`)
  - Configuration classes (`@Configuration`)

- **Don't make it a bean if**: It's just data
  - DTOs (Data Transfer Objects)
  - Entities (database models)
  - Request/Response objects
  - Simple POJOs

### Q: What's the difference between @Component, @Service, @Repository?
**A: Functionally, they're the same!** All make a class a bean. The different names just help organize code:

```java
@Component  // Generic - use when class doesn't fit other categories
@Service    // Business logic layer
@Repository // Database access layer
@Controller // Web layer
```

It's like labeling boxes: all boxes, but labels help you find things.

---

## Visual Summary

```
Regular Java Object              Spring Bean
─────────────────────           ─────────────

You create:                     Spring creates:
new MyClass()                   (automatic)
     ↓                               ↓
You manage lifecycle            Spring manages lifecycle
     ↓                               ↓
You wire dependencies          Spring injects dependencies
     ↓                               ↓
Hard to test                    Easy to test
     ↓                               ↓
Multiple instances             Single instance (shared)


HOW TO MAKE AN OBJECT A BEAN:
───────────────────────────────

public class MyClass { }        →  Regular object (you manage)

@Component                      →  Spring bean (Spring manages)
public class MyClass { }

@Service                        →  Spring bean (Spring manages)
public class MyClass { }
```

---

## Quick Reference

### Making a Class a Bean

```java
// Step 1: Add annotation
@Service  // or @Component, @Repository, @Controller
public class MyService {

    // Step 2: Declare dependencies in constructor
    private final MyRepository repository;

    public MyService(MyRepository repository) {
        this.repository = repository;
    }

    // Step 3: Use dependencies
    public void doSomething() {
        repository.save(...);
    }
}

// Spring handles the rest!
```

### Using a Bean

```java
@SpringBootApplication
public class MyApp {

    // Spring injects the bean
    private final MyService service;

    public MyApp(MyService service) {
        this.service = service;
    }

    // Use it!
    public void doWork() {
        service.doSomething();
    }
}
```

---

## Try It Yourself

Create a simple project with two beans:

```java
// Bean 1: Repository
@Repository
public class MessageRepository {
    public String getMessage() {
        return "Hello from Repository Bean!";
    }
}

// Bean 2: Service (depends on Repository)
@Service
public class MessageService {
    private final MessageRepository repository;

    public MessageService(MessageRepository repository) {
        System.out.println("Spring created MessageService!");
        this.repository = repository;
    }

    public void printMessage() {
        String message = repository.getMessage();
        System.out.println(message);
    }
}

// Main application
@SpringBootApplication
public class MyApp implements CommandLineRunner {

    private final MessageService service;

    public MyApp(MessageService service) {
        this.service = service;
    }

    public static void main(String[] args) {
        SpringApplication.run(MyApp.class, args);
    }

    @Override
    public void run(String... args) {
        service.printMessage();
    }
}
```

**Run this and observe**:
1. Spring creates `MessageRepository` (bean)
2. Spring creates `MessageService` (bean) and injects repository
3. Spring injects `MessageService` into `MyApp`
4. You use the service!

---

## Summary

**In 3 sentences**:
- A **Spring Bean** is just a Java object that Spring creates and manages for you.
- Instead of using `new`, you mark classes with `@Component`, `@Service`, or `@Repository`, and Spring handles everything.
- Beans get their dependencies automatically injected (Dependency Injection), making your code easier to test and maintain.

**Key Takeaway**: **Bean = Object + Spring Management**

Don't overthink it! A bean is just an object that Spring takes care of for you, so you can focus on writing business logic instead of managing objects.

---

## What's Next?

Now that you understand **what a bean is**, you're ready to learn:

1. **[IoC and Dependency Injection](./01-ioc-and-di.md)** - How Spring creates and injects beans
2. **[Bean Lifecycle and Scopes](./02-bean-lifecycle-scopes.md)** - When beans are created/destroyed, singleton vs prototype
3. **[Configuration](./03-configuration.md)** - Different ways to create beans

---

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
