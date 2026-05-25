# IoC and Dependency Injection

> **Before you start**: Can you explain what happens when a class creates its own dependencies using `new`? What problems might this cause?

## What is Inversion of Control (IoC)?

Imagine you're organizing a party:

**Traditional way (You control everything)**:
- You go shopping for food
- You cook the meals
- You set up decorations
- You serve guests
- You clean up
- **Problem**: You're doing EVERYTHING. Exhausting and inflexible.

**IoC way (You delegate control)**:
- You hire a catering service (they handle food)
- You hire a decorator (they handle setup)
- You hire servers (they handle serving)
- **Result**: You just coordinate. Others handle the details.

**In programming**: Instead of your code creating and managing dependencies, you hand that responsibility to a framework (Spring).

**Real-world analogy**:
```java
// Traditional: You control everything
class Party {
    Food food = new Food();           // You cook
    Decorations decor = new Decor();  // You decorate
    Music music = new Music();        // You DJ
    // Exhausting!
}

// IoC: Framework controls creation
class Party {
    @Autowired Food food;        // Caterer provides
    @Autowired Decorations decor; // Decorator provides
    @Autowired Music music;       // DJ provides
    // You just enjoy the party!
}
```

**Stop and think**: Why might delegating object creation to a framework be beneficial?

---

## Why This Matters

**You'll use IoC/DI when**:
- Building any enterprise application (99% of Spring apps)
- You need testable code (inject mocks in tests)
- You want to swap implementations without changing code
- Multiple classes depend on the same services

**Interview context**:
- #1 question: "What is dependency injection?"
- Expected to explain benefits over manual object creation
- Often asked: "How does Spring know what to inject?"

---

## Dependency Injection (DI) - The How

DI is **how** IoC is achieved. Instead of:
```java
class A {
    B b = new B();  // A creates B (tight coupling)
}
```

You do:
```java
class A {
    B b;  // A receives B from outside (loose coupling)

    A(B b) {  // Someone else provides B
        this.b = b;
    }
}
```

**The key insight**: A doesn't know where B comes from. Spring provides it.

---

## Three Types of Dependency Injection

### 1. Constructor Injection ✅ (RECOMMENDED)

Dependencies are provided through the constructor.

```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final CustomerService customerService;
    private final EmailService emailService;

    // Spring calls this constructor and provides all dependencies
    public InvoiceService(InvoiceRepository repository,
                         CustomerService customerService,
                         EmailService emailService) {
        this.repository = repository;
        this.customerService = customerService;
        this.emailService = emailService;
    }

    public Invoice createInvoice(CreateInvoiceRequest request) {
        // Use injected dependencies
        Customer customer = customerService.getById(request.getCustomerId());
        Invoice invoice = new Invoice(customer, request.getItems());
        Invoice saved = repository.save(invoice);
        emailService.sendInvoiceCreated(invoice);
        return saved;
    }
}
```

**Why it's best**:

| Benefit | Explanation |
|---------|-------------|
| **Immutable** | Fields can be `final` - can't be changed after creation |
| **Clear dependencies** | All dependencies visible in one place |
| **Testable** | Just call constructor with mocks |
| **Fails fast** | If dependency missing, app won't start |
| **No Spring needed** | Works in tests without Spring context |

**Try it**: Look at the code above. Can you tell immediately what InvoiceService depends on?

<details>
<summary>Answer</summary>
Yes! All three dependencies are clear in the constructor signature: InvoiceRepository, CustomerService, EmailService.
</details>

**Testing with constructor injection**:
```java
@Test
public void testCreateInvoice() {
    // Easy to create mocks
    InvoiceRepository mockRepo = mock(InvoiceRepository.class);
    CustomerService mockCustomer = mock(CustomerService.class);
    EmailService mockEmail = mock(EmailService.class);

    // Just call constructor - no Spring needed!
    InvoiceService service = new InvoiceService(mockRepo, mockCustomer, mockEmail);

    // Test the service
    Invoice invoice = service.createInvoice(request);

    verify(mockRepo).save(any(Invoice.class));
    verify(mockEmail).sendInvoiceCreated(any(Invoice.class));
}
```

**@Autowired is optional** (since Spring 4.3):
```java
// These are equivalent:

// With @Autowired (optional)
@Autowired
public InvoiceService(InvoiceRepository repository) {
    this.repository = repository;
}

// Without @Autowired (Spring auto-detects)
public InvoiceService(InvoiceRepository repository) {
    this.repository = repository;
}
```

**Spring knows to call this constructor automatically!**

---

### 2. Setter Injection

Dependencies provided through setter methods.

```java
@Service
public class NotificationService {
    private EmailService emailService;
    private SmsService smsService;  // Optional dependency

    @Autowired  // Required for setter injection
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }

    @Autowired(required = false)  // Optional dependency
    public void setSmsService(SmsService smsService) {
        this.smsService = smsService;
    }

    public void sendNotification(String message) {
        emailService.send(message);  // Always available

        if (smsService != null) {    // May be null
            smsService.send(message);
        }
    }
}
```

**When to use**:

| Use Case | Example |
|----------|---------|
| **Optional dependencies** | Feature that works without it |
| **Reconfigurable objects** | Bean needs to change dependencies at runtime |
| **Circular dependencies** | (Better: redesign your code!) |

**Problems with setter injection**:

```java
NotificationService service = new NotificationService();
// Oops, forgot to call setEmailService!
service.sendNotification("Hello");  // NullPointerException!
```

❌ Object can be in incomplete state
❌ Can't use `final` fields
❌ Dependencies not obvious

**Compare**: Why is constructor injection safer than setter injection?

<details>
<summary>Hint</summary>
Constructor injection ensures all required dependencies are provided before the object is created. Setter injection allows incomplete objects.
</details>

---

### 3. Field Injection ❌ (AVOID)

Dependencies injected directly into fields.

```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InventoryService inventoryService;

    public void processOrder(Order order) {
        paymentService.charge(order.getTotal());
        inventoryService.reserve(order.getItems());
    }
}
```

**Why it looks tempting**:
- Very concise
- Less boilerplate code
- Popular in older Spring code

**Why you should AVOID it**:

| Problem | Impact |
|---------|--------|
| **Can't make fields final** | Mutable state |
| **Hard to test** | Can't easily inject mocks without Spring |
| **Hidden dependencies** | Not clear what class needs |
| **Reflection-based** | Slower, breaks encapsulation |
| **IDE warnings** | IntelliJ warns against it |

**Testing with field injection (painful)**:
```java
@Test
public void testOrderService() {
    OrderService service = new OrderService();
    // Problem: Can't inject dependencies!
    // paymentService is private - can't set it

    // Options:
    // 1. Use reflection (ugly)
    // 2. Use Spring test context (slow)
    // 3. Make fields package-private (breaks encapsulation)

    // Compare with constructor injection - just call constructor!
}
```

**Modern IDEs warn you**:
```
IntelliJ: "Field injection is not recommended"
SonarQube: "Remove this field injection and use constructor injection"
```

**Try it**: Refactor this field injection to constructor injection:
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepo;

    @Autowired
    private EmailService emailService;
}
```

<details>
<summary>Solution</summary>

```java
@Service
public class UserService {
    private final UserRepository userRepo;
    private final EmailService emailService;

    public UserService(UserRepository userRepo, EmailService emailService) {
        this.userRepo = userRepo;
        this.emailService = emailService;
    }
}
```
</details>

---

## DI Type Comparison Table

| Aspect | Constructor ✅ | Setter | Field ❌ |
|--------|---------------|--------|---------|
| **Immutability** | Yes (`final`) | No | No |
| **Required deps** | All required | Can be optional | All required |
| **Testability** | Easy (no Spring) | Medium | Hard |
| **Clear dependencies** | Yes (constructor params) | No (hidden in methods) | No (hidden in class) |
| **Partial object state** | Impossible | Possible | Possible |
| **Circular deps** | Breaks compilation | Might work | Might work |
| **Recommendation** | **Use this** | Use sparingly | **Avoid** |

---

## How Spring Resolves Dependencies

### Step 1: Component Scanning

Spring scans for classes with stereotype annotations:

```java
@Component  // Generic component
@Service    // Business logic layer
@Repository // Data access layer
@Controller // Presentation layer (covered in Spring MVC)
```

**Example**:
```java
package com.example.invoicemanager;

@SpringBootApplication
@ComponentScan(basePackages = "com.example.invoicemanager")  // Auto-included in @SpringBootApplication
public class InvoiceManagerApp {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }
}
```

Spring scans `com.example.invoicemanager` and finds:
```
✅ InvoiceService (@Service)
✅ InvoiceRepository (@Repository)
✅ CustomerService (@Service)
✅ EmailService (@Service)
```

### Step 2: Bean Creation

Spring creates beans in the right order (dependencies first):

```
1. Create InvoiceRepository (no dependencies)
2. Create EmailService (no dependencies)
3. Create CustomerService (no dependencies)
4. Create InvoiceService (needs repository, customerService, emailService)
   └─> Inject InvoiceRepository
   └─> Inject CustomerService
   └─> Inject EmailService
```

### Step 3: Dependency Injection

Spring calls constructors with required dependencies:

```java
// Spring does this automatically:
InvoiceRepository repo = new InvoiceRepository();
CustomerService customerSvc = new CustomerService();
EmailService emailSvc = new EmailService();

// Then injects them:
InvoiceService service = new InvoiceService(repo, customerSvc, emailSvc);

// Stores in container:
beanContainer.put("invoiceService", service);
```

**Stop and think**: What happens if InvoiceService needs CustomerService, but CustomerService also needs InvoiceService?

<details>
<summary>Answer</summary>
Circular dependency! Spring throws `BeanCurrentlyInCreationException` at startup. This is actually GOOD - it forces you to redesign (usually one should depend on an interface or use an event-driven approach).
</details>

---

## Multiple Implementations - @Qualifier and @Primary

### Problem: Which One to Inject?

```java
// Two implementations of the same interface
public interface PaymentService {
    void processPayment(double amount);
}

@Service
public class CreditCardPayment implements PaymentService {
    public void processPayment(double amount) {
        System.out.println("Processing $" + amount + " via Credit Card");
    }
}

@Service
public class PayPalPayment implements PaymentService {
    public void processPayment(double amount) {
        System.out.println("Processing $" + amount + " via PayPal");
    }
}

@Service
public class OrderService {
    private final PaymentService paymentService;

    public OrderService(PaymentService paymentService) {  // Which one???
        this.paymentService = paymentService;
    }
}
```

**Spring error**:
```
No qualifying bean of type 'PaymentService' available:
expected single matching bean but found 2: creditCardPayment, payPalPayment
```

### Solution 1: @Primary (Default Choice)

```java
@Service
@Primary  // This one is used by default
public class CreditCardPayment implements PaymentService {
    public void processPayment(double amount) {
        System.out.println("Credit Card: $" + amount);
    }
}

@Service
public class PayPalPayment implements PaymentService {
    public void processPayment(double amount) {
        System.out.println("PayPal: $" + amount);
    }
}

@Service
public class OrderService {
    private final PaymentService paymentService;

    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;  // Gets CreditCardPayment (@Primary)
    }
}
```

### Solution 2: @Qualifier (Specific Choice)

```java
@Service
@Qualifier("creditCard")
public class CreditCardPayment implements PaymentService {
    // ...
}

@Service
@Qualifier("paypal")
public class PayPalPayment implements PaymentService {
    // ...
}

@Service
public class OrderService {
    private final PaymentService creditCardPayment;
    private final PaymentService paypalPayment;

    public OrderService(
            @Qualifier("creditCard") PaymentService creditCardPayment,
            @Qualifier("paypal") PaymentService paypalPayment) {
        this.creditCardPayment = creditCardPayment;
        this.paypalPayment = paypalPayment;
    }

    public void processOrder(Order order, String paymentMethod) {
        if ("paypal".equals(paymentMethod)) {
            paypalPayment.processPayment(order.getTotal());
        } else {
            creditCardPayment.processPayment(order.getTotal());
        }
    }
}
```

### Solution 3: Use Bean Name Matching

```java
@Service
public class CreditCardPayment implements PaymentService { }

@Service
public class PayPalPayment implements PaymentService { }

@Service
public class OrderService {
    private final PaymentService creditCardPayment;  // Matches bean name!

    public OrderService(PaymentService creditCardPayment) {
        this.creditCardPayment = creditCardPayment;
    }
}
```

**Spring matches by**:
1. Type first
2. If multiple → try to match by parameter name
3. If still ambiguous → error (unless @Qualifier or @Primary)

**Try it**: You have `EmailNotifier` and `SmsNotifier` both implementing `Notifier`. How would you inject both?

---

## Practical Example: Before and After DI

### Before DI (Tight Coupling)

```java
public class InvoiceService {
    // Creates own dependencies - TIGHT COUPLING
    private InvoiceRepository repository = new InvoiceRepositoryImpl();
    private EmailService emailService = new EmailService();
    private CustomerService customerService = new CustomerService();

    public Invoice createInvoice(String customerId, List<LineItem> items) {
        Customer customer = customerService.getById(customerId);
        Invoice invoice = new Invoice(customer, items);
        invoice.calculateTotal();

        repository.save(invoice);
        emailService.sendInvoiceCreated(invoice);

        return invoice;
    }
}
```

**Problems**:
- ❌ Hard to test (can't mock repository/services)
- ❌ Tightly coupled to specific implementations
- ❌ Can't swap implementations without changing code
- ❌ Creates new instances every time (memory waste)

**Testing is painful**:
```java
@Test
public void testCreateInvoice() {
    InvoiceService service = new InvoiceService();
    // Can't inject mocks - stuck with real implementations!
    // Real repository might need database
    // Real email service might send actual emails!

    Invoice invoice = service.createInvoice("C123", items);
    // How do we verify it saved to repository?
    // How do we verify email was sent?
    // We can't!
}
```

### After DI (Loose Coupling)

```java
@Service
public class InvoiceService {
    // Dependencies injected by Spring
    private final InvoiceRepository repository;
    private final EmailService emailService;
    private final CustomerService customerService;

    // Constructor injection
    public InvoiceService(InvoiceRepository repository,
                         EmailService emailService,
                         CustomerService customerService) {
        this.repository = repository;
        this.emailService = emailService;
        this.customerService = customerService;
    }

    public Invoice createInvoice(String customerId, List<LineItem> items) {
        Customer customer = customerService.getById(customerId);
        Invoice invoice = new Invoice(customer, items);
        invoice.calculateTotal();

        repository.save(invoice);
        emailService.sendInvoiceCreated(invoice);

        return invoice;
    }
}
```

**Benefits**:
- ✅ Easy to test (inject mocks)
- ✅ Loosely coupled to interfaces
- ✅ Can swap implementations via configuration
- ✅ Spring manages single instances (singletons)

**Testing is easy**:
```java
@Test
public void testCreateInvoice() {
    // Create mocks
    InvoiceRepository mockRepo = mock(InvoiceRepository.class);
    EmailService mockEmail = mock(EmailService.class);
    CustomerService mockCustomer = mock(CustomerService.class);

    // Setup mock behavior
    when(mockCustomer.getById("C123")).thenReturn(new Customer("C123", "Alice"));
    when(mockRepo.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

    // Inject mocks via constructor
    InvoiceService service = new InvoiceService(mockRepo, mockEmail, mockCustomer);

    // Test
    Invoice invoice = service.createInvoice("C123", items);

    // Verify interactions
    verify(mockRepo).save(any(Invoice.class));
    verify(mockEmail).sendInvoiceCreated(invoice);
    assertNotNull(invoice);
}
```

**Compare**: How is the "After DI" version better for testing?

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** is the difference between IoC and DI?
2. **Why** is constructor injection preferred over field injection?
3. **When** would you use setter injection instead of constructor injection?
4. **How** does Spring know which bean to inject when there are multiple implementations?
5. **Compare**: What happens when you create dependencies with `new` vs letting Spring inject them?

---

## Practice Exercises

### Standalone Exercises

**Level 1 - Identify the Problem**:
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;
}
```
What's wrong? How would you fix it?

**Level 2 - Refactor**:
```java
public class OrderService {
    private PaymentService payment = new PaymentService();
    private ShippingService shipping = new ShippingService();

    public void processOrder(Order order) {
        payment.charge(order.getTotal());
        shipping.ship(order);
    }
}
```
Refactor to use constructor injection with Spring annotations.

**Level 3 - Multiple Implementations**:
You have `EmailNotifier` and `SmsNotifier` both implementing `Notifier`. Configure them so:
- `EmailNotifier` is the default
- A specific service can choose `SmsNotifier` explicitly

---

### Build-Along Project: InvoiceManager App

> **Goal**: Refactor Week 1 console app to use Spring IoC with constructor injection

**Step 1: Add Spring Dependencies**

`pom.xml`:
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
        <version>3.2.0</version>
    </dependency>
</dependencies>
```

**Step 2: Create Repositories** (Data access layer)

```java
@Repository
public class InvoiceRepository {
    private final Map<String, Invoice> invoices = new ConcurrentHashMap<>();

    public Invoice save(Invoice invoice) {
        if (invoice.getId() == null) {
            invoice.setId(UUID.randomUUID().toString());
        }
        invoices.put(invoice.getId(), invoice);
        return invoice;
    }

    public Optional<Invoice> findById(String id) {
        return Optional.ofNullable(invoices.get(id));
    }

    public List<Invoice> findAll() {
        return new ArrayList<>(invoices.values());
    }

    public List<Invoice> findByCustomerId(String customerId) {
        return invoices.values().stream()
            .filter(inv -> inv.getCustomer().getId().equals(customerId))
            .collect(Collectors.toList());
    }
}
```

```java
@Repository
public class CustomerRepository {
    private final Map<String, Customer> customers = new ConcurrentHashMap<>();

    public Customer save(Customer customer) {
        if (customer.getId() == null) {
            customer.setId(UUID.randomUUID().toString());
        }
        customers.put(customer.getId(), customer);
        return customer;
    }

    public Optional<Customer> findById(String id) {
        return Optional.ofNullable(customers.get(id));
    }

    public List<Customer> findAll() {
        return new ArrayList<>(customers.values());
    }
}
```

**Step 3: Refactor Services** (Use constructor injection)

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;

    // Constructor injection - Spring provides dependencies
    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
    }

    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));

        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        invoice.setDate(LocalDate.now());
        invoice.setLineItems(items);

        // Calculate total using Stream API
        double total = items.stream()
            .mapToDouble(InvoiceLineItem::getSubtotal)
            .sum();
        invoice.setTotal(total);

        return invoiceRepository.save(invoice);
    }

    public Optional<Invoice> getInvoiceById(String id) {
        return invoiceRepository.findById(id);
    }

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public List<Invoice> getInvoicesByCustomer(String customerId) {
        return invoiceRepository.findByCustomerId(customerId);
    }

    public double getTotalRevenue() {
        return invoiceRepository.findAll().stream()
            .mapToDouble(Invoice::getTotal)
            .sum();
    }
}
```

**Step 4: Create Main Application**

```java
@SpringBootApplication
public class InvoiceManagerApp implements CommandLineRunner {

    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;

    // Spring injects these
    public InvoiceManagerApp(InvoiceService invoiceService,
                            CustomerRepository customerRepository) {
        this.invoiceService = invoiceService;
        this.customerRepository = customerRepository;
    }

    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }

    @Override
    public void run(String... args) {
        // Create sample customer
        Customer customer = new Customer();
        customer.setName("Acme Corp");
        customer.setEmail("billing@acme.com");
        customer = customerRepository.save(customer);

        // Create sample products and line items
        Product laptop = new Product("P001", "Laptop", 999.99);
        Product mouse = new Product("P002", "Mouse", 29.99);

        List<InvoiceLineItem> items = Arrays.asList(
            new InvoiceLineItem(laptop, 2),
            new InvoiceLineItem(mouse, 5)
        );

        // Create invoice
        Invoice invoice = invoiceService.createInvoice(customer.getId(), items);

        System.out.println("Invoice created: " + invoice.getId());
        System.out.println("Customer: " + invoice.getCustomer().getName());
        System.out.println("Total: $" + invoice.getTotal());
        System.out.println("Total Revenue: $" + invoiceService.getTotalRevenue());
    }
}
```

**Step 5: Run and Verify**

```bash
./mvnw spring-boot:run
```

Expected output:
```
Invoice created: a1b2c3...
Customer: Acme Corp
Total: $2149.93
Total Revenue: $2149.93
```

**Checkpoint**: By now, your app should:
- ✅ Use Spring to create and inject all beans
- ✅ No manual `new` for services/repositories
- ✅ Use constructor injection (not field injection)
- ✅ Be easy to test (can inject mocks)

**Test it**:
```java
@Test
public void testCreateInvoice() {
    // Create mocks
    InvoiceRepository mockInvoiceRepo = mock(InvoiceRepository.class);
    CustomerRepository mockCustomerRepo = mock(CustomerRepository.class);

    // Setup
    Customer customer = new Customer();
    customer.setId("C1");
    customer.setName("Test Customer");
    when(mockCustomerRepo.findById("C1")).thenReturn(Optional.of(customer));
    when(mockInvoiceRepo.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

    // Create service with mocks
    InvoiceService service = new InvoiceService(mockInvoiceRepo, mockCustomerRepo);

    // Test
    List<InvoiceLineItem> items = Arrays.asList(
        new InvoiceLineItem(new Product("P1", "Item", 100.0), 2)
    );
    Invoice invoice = service.createInvoice("C1", items);

    // Verify
    assertEquals(200.0, invoice.getTotal());
    verify(mockInvoiceRepo).save(any(Invoice.class));
}
```

**Next step**: In [Bean Lifecycle and Scopes](./02-bean-lifecycle-scopes.md), you'll learn about bean lifecycles and when to use singleton vs prototype scope.

---

## Common Mistakes

❌ **Mistake 1**: Using field injection
```java
@Service
public class MyService {
    @Autowired
    private MyRepository repo;  // Hard to test
}
```
✅ **Instead**: Use constructor injection
```java
@Service
public class MyService {
    private final MyRepository repo;

    public MyService(MyRepository repo) {
        this.repo = repo;
    }
}
```

❌ **Mistake 2**: Circular dependencies
```java
@Service
class A {
    @Autowired private B b;
}

@Service
class B {
    @Autowired private A a;
}
```
✅ **Instead**: Redesign - use events, interfaces, or setter injection with @Lazy

❌ **Mistake 3**: Creating dependencies with `new`
```java
@Service
public class OrderService {
    private PaymentService payment = new PaymentService();  // Don't do this!
}
```
✅ **Instead**: Let Spring inject it
```java
@Service
public class OrderService {
    private final PaymentService payment;

    public OrderService(PaymentService payment) {
        this.payment = payment;
    }
}
```

---

## Interview Questions

### Knowledge Questions
1. "What is dependency injection?" → See "What is DI?" section
2. "Name three types of DI" → Constructor, Setter, Field
3. "Why prefer constructor injection?" → See comparison table
4. "How does Spring resolve dependencies?" → See "How Spring Resolves Dependencies"

### Scenario Questions
1. "You have two implementations of PaymentService. How does Spring know which to inject?"
   → Answer: Use @Primary or @Qualifier

2. "Your service has 10 dependencies. Is constructor injection still recommended?"
   → Answer: Yes, but this many dependencies suggests the class is doing too much (SRP violation)

### Debugging Questions
```java
@Service
public class UserService {
    private UserRepository repo;  // Not injected!

    public User getUser(String id) {
        return repo.findById(id);  // NullPointerException!
    }
}
```
What's wrong? → Missing constructor injection or @Autowired on setter

---

## Summary

**In 3 sentences**:
- IoC means delegating object creation and management to Spring instead of doing it yourself.
- DI is how IoC is achieved - dependencies are injected (via constructor, setter, or field) instead of created.
- Constructor injection is strongly preferred because it creates immutable, testable objects with clear dependencies.

**Key takeaway**: **Don't call us, we'll call you** - this is IoC. Your code declares what it needs, Spring provides it.

---

## Navigation

**Prerequisites:**
- [OOP Fundamentals](../../../01-core-java/oop/OOP_Interview_Questions.md) - Interfaces, inheritance, polymorphism
- [Design Patterns](../../../01-core-java/design-patterns/) - Factory, Strategy patterns

**Next Topics:**
- [Bean Lifecycle & Scopes](./02-bean-lifecycle-scopes.md) - How Spring manages bean creation, destruction, singleton vs prototype
- [Configuration Approaches](./03-configuration.md) - Different ways to configure beans (XML, Java, annotations)

**Related:**
- [Spring AOP](./04-aop.md) - Dependency injection enables aspect-oriented programming
- [Spring Boot Auto-Configuration](../../spring-boot/01-auto-configuration.md) - How Spring Boot leverages IoC
- [Best Practices](./05-best-practices.md) - DI patterns and anti-patterns

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
