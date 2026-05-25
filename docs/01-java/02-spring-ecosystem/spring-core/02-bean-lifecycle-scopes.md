# Bean Lifecycle and Scopes

> **Before you start**: Can you explain what a singleton pattern is? If not, review: [Singleton Pattern](../../01-core-java/design-patterns/singleton.md)

## What are Bean Scopes?

Imagine a restaurant kitchen:

**Singleton (Default) - One chef for the whole restaurant**:
- One head chef manages all orders
- Everyone uses the same chef
- Efficient (don't need multiple chefs)
- **Use when**: Chef has no personal state (just follows recipes)

**Prototype - New chef for each order**:
- Each customer gets their own personal chef
- Chefs work independently
- More resources (need many chefs)
- **Use when**: Each customer needs personalized attention

**In Spring**: Scope determines how many instances of a bean Spring creates.

**Real-world analogy**:
```java
// Singleton: One calculator shared by everyone
@Bean
@Scope("singleton")  // Default
public Calculator calculator() {
    return new Calculator();  // Created once, shared
}

// Prototype: New shopping cart for each user
@Bean
@Scope("prototype")
public ShoppingCart shoppingCart() {
    return new ShoppingCart();  // Created every time requested
}
```

**Stop and think**: Why would you want ONE calculator for everyone, but SEPARATE shopping carts for each user?

<details>
<summary>Hint</summary>
Calculator is stateless (no personal data), so sharing is fine. ShoppingCart is stateful (contains user's items), so each user needs their own.
</details>

---

## Why This Matters

**You'll use bean scopes when**:
- Deciding if a bean should be shared (singleton) or not (prototype)
- Building web apps (request/session scopes)
- Managing stateful vs stateless components
- Optimizing memory and performance

**Interview context**:
- Common question: "What are bean scopes in Spring?"
- Expected to know: singleton (default) vs prototype
- Often asked: "When would you use prototype scope?"

---

## The Five Bean Scopes

### 1. Singleton Scope ⭐ (Default)

**One instance per Spring container** - created once, shared by all.

```java
@Service  // Singleton by default
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public Invoice createInvoice(CreateInvoiceRequest request) {
        // This method is called by many threads
        // But there's only ONE InvoiceService instance
    }
}
```

**Memory visualization**:
```
Spring Container:
┌─────────────────────────┐
│ invoiceService → [obj]  │ ← ONE instance
│                         │
│ Request 1 uses [obj] ←──┤
│ Request 2 uses [obj] ←──┤
│ Request 3 uses [obj] ←──┤
└─────────────────────────┘
   All requests share same instance
```

**When to use**:
| Use Singleton When | Example |
|-------------------|---------|
| Bean is stateless | Services, repositories, utilities |
| Bean is thread-safe | Controllers, validators |
| Expensive to create | Database connection pool |
| Shared resource | Cache, configuration |

**Example - Stateless service (SAFE)**:
```java
@Service
public class CalculationService {
    // No instance variables = stateless = thread-safe

    public double calculateDiscount(double price, double discountPercent) {
        // Uses only method parameters (thread-safe)
        return price * (discountPercent / 100);
    }

    public double calculateTax(double amount, double taxRate) {
        // No shared state
        return amount * taxRate;
    }
}
```

**Example - Stateful service (DANGEROUS)**:
```java
@Service  // Singleton by default - PROBLEM!
public class OrderProcessor {
    private Order currentOrder;  // ❌ Instance variable = shared state!

    public void processOrder(Order order) {
        this.currentOrder = order;  // ❌ Multiple threads will overwrite!

        // Thread 1: currentOrder = Order A
        // Thread 2: currentOrder = Order B (overwrites Order A!)
        // Thread 1: processes Order B (WRONG!)

        doProcessing();
    }

    private void doProcessing() {
        // Uses this.currentOrder - race condition!
    }
}
```

**Fix - Make it stateless**:
```java
@Service
public class OrderProcessor {
    // No instance variables

    public void processOrder(Order order) {
        // Pass order as parameter (thread-safe)
        doProcessing(order);
    }

    private void doProcessing(Order order) {
        // Uses parameter, not instance variable
    }
}
```

**Try it**: Is this service thread-safe?
```java
@Service
public class UserService {
    private final UserRepository repository;  // Final = set once in constructor
    private int requestCount = 0;             // Mutable instance variable

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User getUser(String id) {
        requestCount++;  // Problem?
        return repository.findById(id);
    }
}
```

<details>
<summary>Answer</summary>
NOT thread-safe! `requestCount++` is not atomic. Multiple threads can read the same value, increment, and write back - losing counts. The `repository` is fine (immutable).
</details>

---

### 2. Prototype Scope

**New instance every time** it's requested.

```java
@Component
@Scope("prototype")  // New instance each time
public class ShoppingCart {
    private List<CartItem> items = new ArrayList<>();
    private String userId;

    public void addItem(CartItem item) {
        items.add(item);  // Each user has their own items
    }

    public double getTotal() {
        return items.stream()
            .mapToDouble(CartItem::getPrice)
            .sum();
    }
}
```

**Memory visualization**:
```
Spring Container:
┌─────────────────────────┐
│                         │
│ Request 1 → [cart1]     │ ← Separate instances
│ Request 2 → [cart2]     │
│ Request 3 → [cart3]     │
└─────────────────────────┘
   Each request gets new instance
```

**When to use**:
| Use Prototype When | Example |
|-------------------|---------|
| Bean has state | Shopping cart, user session data |
| Not thread-safe | Objects with mutable fields |
| Different config per use | Report generator with user-specific settings |

**Example - Prototype bean with state**:
```java
@Component
@Scope("prototype")
public class InvoiceGenerator {
    private Invoice invoice;
    private String templateName;
    private Map<String, Object> customData = new HashMap<>();

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public void setTemplate(String templateName) {
        this.templateName = templateName;
    }

    public void addCustomData(String key, Object value) {
        customData.put(key, value);
    }

    public byte[] generatePDF() {
        // Use instance variables to generate PDF
        // Each user gets their own generator with their data
    }
}
```

**Using prototype beans**:
```java
@Service
public class InvoiceService {
    private final ApplicationContext context;

    public InvoiceService(ApplicationContext context) {
        this.context = context;
    }

    public byte[] generateInvoicePDF(Invoice invoice, String template) {
        // Get new instance each time
        InvoiceGenerator generator = context.getBean(InvoiceGenerator.class);

        generator.setInvoice(invoice);
        generator.setTemplate(template);
        generator.addCustomData("generatedBy", "InvoiceService");

        return generator.generatePDF();
    }
}
```

**Warning - Prototype in Singleton**:
```java
@Service  // Singleton
public class OrderService {
    @Autowired
    private ShoppingCart cart;  // ❌ Injected ONCE (at OrderService creation)

    // All users share the SAME cart instance!
    // Prototype scope is IGNORED in constructor/field injection!
}
```

**Fix - Request prototype each time**:
```java
@Service
public class OrderService {
    private final ApplicationContext context;

    public OrderService(ApplicationContext context) {
        this.context = context;
    }

    public void processOrder(String userId) {
        // Get new cart each time
        ShoppingCart cart = context.getBean(ShoppingCart.class);
        cart.setUserId(userId);
        // Use cart
    }
}
```

**Or use ObjectFactory**:
```java
@Service
public class OrderService {
    @Autowired
    private ObjectFactory<ShoppingCart> cartFactory;

    public void processOrder(String userId) {
        ShoppingCart cart = cartFactory.getObject();  // Gets new instance
        cart.setUserId(userId);
        // Use cart
    }
}
```

**Compare**: Why does injecting a prototype bean into a singleton cause problems?

<details>
<summary>Hint</summary>
The singleton is created once. When it's created, it receives ONE instance of the prototype bean. That same instance is used forever, defeating the purpose of prototype scope.
</details>

---

### 3. Request Scope (Web Applications)

**One instance per HTTP request**.

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext {
    private String requestId;
    private String userId;
    private LocalDateTime requestTime;

    @PostConstruct
    public void init() {
        this.requestId = UUID.randomUUID().toString();
        this.requestTime = LocalDateTime.now();
    }

    // Getters and setters
}
```

**Memory visualization**:
```
HTTP Request 1:
┌─────────────────────────┐
│ RequestContext [obj1]   │ ← Created for this request
│ requestId: req-001      │
│ userId: user-123        │
└─────────────────────────┘

HTTP Request 2:
┌─────────────────────────┐
│ RequestContext [obj2]   │ ← New instance for this request
│ requestId: req-002      │
│ userId: user-456        │
└─────────────────────────┘
```

**Using request-scoped beans**:
```java
@RestController
public class InvoiceController {
    private final RequestContext requestContext;
    private final InvoiceService invoiceService;

    public InvoiceController(RequestContext requestContext,
                            InvoiceService invoiceService) {
        this.requestContext = requestContext;  // Proxied - safe in singleton
        this.invoiceService = invoiceService;
    }

    @PostMapping("/invoices")
    public Invoice createInvoice(@RequestBody CreateInvoiceRequest request,
                                 @AuthenticationPrincipal User user) {
        requestContext.setUserId(user.getId());

        Invoice invoice = invoiceService.createInvoice(request);

        // Log with request context
        log.info("Invoice created: {} by user: {} in request: {}",
                invoice.getId(),
                requestContext.getUserId(),
                requestContext.getRequestId());

        return invoice;
    }
}
```

**Why `proxyMode = TARGET_CLASS`?**

Without proxy:
```java
@Controller  // Singleton
class MyController {
    @Autowired
    private RequestContext context;  // ERROR: Can't inject request-scoped into singleton!
}
```

With proxy:
```java
@Component
@Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
class RequestContext { }

@Controller
class MyController {
    @Autowired
    private RequestContext context;  // OK: Injects a PROXY that delegates to current request's instance
}
```

**The proxy intercepts calls**:
```
controller.method() calls context.getUserId()
         ↓
    [Proxy checks current HTTP request]
         ↓
    [Proxy gets RequestContext for THIS request]
         ↓
    [Proxy delegates to actual instance]
```

---

### 4. Session Scope (Web Applications)

**One instance per HTTP session** - survives multiple requests from same user.

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_SESSION, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserPreferences {
    private String theme = "light";
    private String language = "en";
    private int pageSize = 10;

    // Getters and setters
}
```

**Lifecycle**:
```
User logs in → Session created → UserPreferences instance created
  ↓
User makes requests → Same UserPreferences instance across all requests
  ↓
User logs out / Session timeout → UserPreferences destroyed
```

**Example usage**:
```java
@Service
public class InvoiceService {
    private final UserPreferences preferences;

    public InvoiceService(UserPreferences preferences) {
        this.preferences = preferences;
    }

    public List<Invoice> getInvoices(int page) {
        int pageSize = preferences.getPageSize();  // User's preference
        // Fetch invoices with pagination
    }
}
```

---

### 5. Application Scope (Web Applications)

**One instance for entire application** - like singleton but for servlet context.

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_APPLICATION)
public class ApplicationMetrics {
    private final AtomicLong requestCount = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);

    public void incrementRequests() {
        requestCount.incrementAndGet();
    }

    public void incrementErrors() {
        errorCount.incrementAndGet();
    }

    public Map<String, Long> getMetrics() {
        return Map.of(
            "requests", requestCount.get(),
            "errors", errorCount.get()
        );
    }
}
```

---

## Scope Comparison Table

| Scope | Instances | Lifecycle | Use Case | Web Only? |
|-------|-----------|-----------|----------|-----------|
| **singleton** | 1 per container | App startup → shutdown | Stateless services | No |
| **prototype** | New each time | On-demand → GC | Stateful objects | No |
| **request** | 1 per HTTP request | Request start → end | Request data | Yes |
| **session** | 1 per HTTP session | Session start → timeout | User preferences | Yes |
| **application** | 1 per servlet context | App start → stop | Shared app state | Yes |

---

## Bean Lifecycle

### Lifecycle Phases

```
1. Instantiation → Constructor called
2. Dependency Injection → @Autowired fields/setters called
3. Post-initialization → @PostConstruct called
4. Bean ready to use
5. Pre-destruction → @PreDestroy called
6. Destruction → Bean destroyed
```

### Lifecycle Callbacks

**Using annotations**:
```java
@Component
public class DatabaseConnection {
    private Connection connection;

    public DatabaseConnection() {
        System.out.println("1. Constructor called");
    }

    @PostConstruct
    public void init() {
        System.out.println("2. @PostConstruct - Opening database connection");
        // Initialize resources (open connections, load data, etc.)
        connection = DriverManager.getConnection("jdbc:...");
    }

    public void query(String sql) {
        System.out.println("3. Bean in use");
        // Use the connection
    }

    @PreDestroy
    public void cleanup() {
        System.out.println("4. @PreDestroy - Closing database connection");
        // Clean up resources
        if (connection != null) {
            connection.close();
        }
    }
}
```

**Using interfaces**:
```java
@Component
public class CacheManager implements InitializingBean, DisposableBean {

    private Cache cache;

    @Override
    public void afterPropertiesSet() throws Exception {
        // Called after all properties are set
        System.out.println("Initializing cache...");
        cache = new ConcurrentHashMap<>();
    }

    @Override
    public void destroy() throws Exception {
        // Called before bean destruction
        System.out.println("Clearing cache...");
        cache.clear();
    }
}
```

**Using @Bean methods**:
```java
@Configuration
public class AppConfig {

    @Bean(initMethod = "init", destroyMethod = "cleanup")
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}

class HikariDataSource {
    public void init() {
        // Initialization logic
    }

    public void cleanup() {
        // Cleanup logic
    }
}
```

**Order of execution**:
```
Constructor
  ↓
Dependency Injection (@Autowired)
  ↓
@PostConstruct
  ↓
afterPropertiesSet() (InitializingBean)
  ↓
init-method (from @Bean)
  ↓
BEAN READY TO USE
  ↓
@PreDestroy
  ↓
destroy() (DisposableBean)
  ↓
destroy-method (from @Bean)
```

**Complete example**:
```java
@Component
public class LifecycleDemo implements InitializingBean, DisposableBean {
    private DataService dataService;

    public LifecycleDemo() {
        System.out.println("1. Constructor");
    }

    @Autowired
    public void setDataService(DataService dataService) {
        System.out.println("2. Dependency Injection");
        this.dataService = dataService;
    }

    @PostConstruct
    public void postConstruct() {
        System.out.println("3. @PostConstruct");
    }

    @Override
    public void afterPropertiesSet() {
        System.out.println("4. afterPropertiesSet()");
    }

    @PreDestroy
    public void preDestroy() {
        System.out.println("5. @PreDestroy");
    }

    @Override
    public void destroy() {
        System.out.println("6. destroy()");
    }
}
```

**Output**:
```
1. Constructor
2. Dependency Injection
3. @PostConstruct
4. afterPropertiesSet()
[Bean is used]
5. @PreDestroy
6. destroy()
```

**Try it**: What's the difference between constructor and @PostConstruct?

<details>
<summary>Answer</summary>
Constructor: Dependencies not yet injected. @PostConstruct: All dependencies injected, bean fully initialized. Use @PostConstruct for initialization logic that needs dependencies.
</details>

---

## Practical Example: Resource Management

### Problem: Database Connection Pool

```java
@Component
public class DatabaseConnectionPool {
    private List<Connection> connections;
    private final String jdbcUrl;
    private final int poolSize;

    public DatabaseConnectionPool(
            @Value("${db.url}") String jdbcUrl,
            @Value("${db.pool.size}") int poolSize) {
        this.jdbcUrl = jdbcUrl;
        this.poolSize = poolSize;
        // Can't create connections here - too early!
    }

    @PostConstruct
    public void initializePool() {
        System.out.println("Creating connection pool with " + poolSize + " connections");
        connections = new ArrayList<>();

        for (int i = 0; i < poolSize; i++) {
            try {
                Connection conn = DriverManager.getConnection(jdbcUrl);
                connections.add(conn);
                System.out.println("Created connection " + (i + 1));
            } catch (SQLException e) {
                throw new RuntimeException("Failed to create connection", e);
            }
        }
    }

    public Connection getConnection() {
        // Return available connection from pool
        return connections.isEmpty() ? null : connections.remove(0);
    }

    public void releaseConnection(Connection connection) {
        connections.add(connection);
    }

    @PreDestroy
    public void destroyPool() {
        System.out.println("Closing all connections");
        for (Connection conn : connections) {
            try {
                conn.close();
            } catch (SQLException e) {
                // Log error
            }
        }
        connections.clear();
    }
}
```

**Why use @PostConstruct here?**
- Constructor is called before dependency injection completes
- `@Value` properties might not be set yet in constructor
- `@PostConstruct` guarantees all dependencies are ready

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** is the default bean scope in Spring?
2. **Why** would you use prototype scope instead of singleton?
3. **When** should you use @PostConstruct instead of a constructor?
4. **How** do you inject a prototype bean into a singleton correctly?
5. **Compare**: Singleton scope vs Application scope - what's the difference?

---

## Practice Exercises

### Standalone Exercises

**Level 1 - Identify the Issue**:
```java
@Service  // Singleton
public class ReportGenerator {
    private Report currentReport;

    public void generateReport(ReportRequest request) {
        currentReport = new Report(request);
        // Process report
        return currentReport;
    }
}
```
What's the problem? How would you fix it?

**Level 2 - Choose the Right Scope**:
For each bean, determine the appropriate scope:
1. `UserService` - performs database operations
2. `ShoppingCart` - stores user's items
3. `ConfigurationProperties` - app-wide settings
4. `RequestLogger` - logs info about current HTTP request

**Level 3 - Fix the Lifecycle**:
```java
@Component
public class CacheWarmer {
    @Autowired
    private DataService dataService;

    public CacheWarmer() {
        // Need to warm cache on startup
        warmCache();  // Problem: dataService is null!
    }

    private void warmCache() {
        dataService.loadInitialData();  // NullPointerException
    }
}
```
Fix this using lifecycle callbacks.

---

### Build-Along Project: InvoiceManager App

> **Goal**: Add appropriate scopes and lifecycle management to InvoiceManager

**Step 1: Add Invoice Generator (Prototype Scope)**

```java
@Component
@Scope("prototype")  // New instance for each invoice
public class InvoicePDFGenerator {
    private Invoice invoice;
    private Map<String, Object> customData = new HashMap<>();

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public void addCustomData(String key, Object value) {
        customData.put(key, value);
    }

    public byte[] generatePDF() {
        // Simple PDF generation (or use iText library)
        StringBuilder pdf = new StringBuilder();
        pdf.append("INVOICE\n");
        pdf.append("Invoice ID: ").append(invoice.getId()).append("\n");
        pdf.append("Customer: ").append(invoice.getCustomer().getName()).append("\n");
        pdf.append("Date: ").append(invoice.getDate()).append("\n");
        pdf.append("\nITEMS:\n");

        for (InvoiceLineItem item : invoice.getLineItems()) {
            pdf.append(String.format("- %s x%d: $%.2f\n",
                    item.getProduct().getName(),
                    item.getQuantity(),
                    item.getSubtotal()));
        }

        pdf.append(String.format("\nTOTAL: $%.2f\n", invoice.getTotal()));

        return pdf.toString().getBytes();
    }
}
```

**Step 2: Update InvoiceService to Use Generator**

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ApplicationContext context;  // To get prototype beans

    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository,
                         ApplicationContext context) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.context = context;
    }

    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));

        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        invoice.setDate(LocalDate.now());
        invoice.setLineItems(items);

        double total = items.stream()
            .mapToDouble(InvoiceLineItem::getSubtotal)
            .sum();
        invoice.setTotal(total);

        return invoiceRepository.save(invoice);
    }

    public byte[] generateInvoicePDF(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        // Get new generator instance (prototype)
        InvoicePDFGenerator generator = context.getBean(InvoicePDFGenerator.class);

        generator.setInvoice(invoice);
        generator.addCustomData("generatedAt", LocalDateTime.now());
        generator.addCustomData("generatedBy", "InvoiceManager v1.0");

        return generator.generatePDF();
    }

    // Other methods...
}
```

**Step 3: Add Application Startup Bean**

```java
@Component
public class DataInitializer {

    private final CustomerRepository customerRepository;

    public DataInitializer(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @PostConstruct
    public void initializeData() {
        System.out.println("=== Initializing sample data ===");

        // Create sample customers if repository is empty
        if (customerRepository.findAll().isEmpty()) {
            Customer customer1 = new Customer();
            customer1.setName("Acme Corporation");
            customer1.setEmail("billing@acme.com");
            customer1.setAddress("123 Business St, Tech City, TC 12345");
            customerRepository.save(customer1);

            Customer customer2 = new Customer();
            customer2.setName("Tech Solutions Inc");
            customer2.setEmail("accounts@techsolutions.com");
            customer2.setAddress("456 Innovation Ave, Silicon Valley, SV 67890");
            customerRepository.save(customer2);

            System.out.println("Sample customers created");
        }
    }

    @PreDestroy
    public void cleanup() {
        System.out.println("=== Application shutting down ===");
        // Clean up resources if needed
    }
}
```

**Step 4: Add Application Metrics (Singleton with Thread-Safety)**

```java
@Component
public class ApplicationMetrics {
    private final AtomicLong invoicesCreated = new AtomicLong(0);
    private final AtomicLong pdfsGenerated = new AtomicLong(0);
    private final AtomicLong totalRevenue = new AtomicDouble(0);

    public void recordInvoiceCreated(double amount) {
        invoicesCreated.incrementAndGet();
        totalRevenue.addAndGet(amount);
    }

    public void recordPDFGenerated() {
        pdfsGenerated.incrementAndGet();
    }

    public Map<String, Object> getMetrics() {
        return Map.of(
            "invoicesCreated", invoicesCreated.get(),
            "pdfsGenerated", pdfsGenerated.get(),
            "totalRevenue", totalRevenue.get()
        );
    }

    @PreDestroy
    public void printFinalMetrics() {
        System.out.println("\n=== Final Metrics ===");
        System.out.println("Invoices Created: " + invoicesCreated.get());
        System.out.println("PDFs Generated: " + pdfsGenerated.get());
        System.out.println("Total Revenue: $" + totalRevenue.get());
    }
}
```

**Step 5: Update InvoiceService with Metrics**

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ApplicationContext context;
    private final ApplicationMetrics metrics;  // Add metrics

    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository,
                         ApplicationContext context,
                         ApplicationMetrics metrics) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.context = context;
        this.metrics = metrics;
    }

    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        // ... create invoice logic ...

        Invoice saved = invoiceRepository.save(invoice);
        metrics.recordInvoiceCreated(invoice.getTotal());  // Track metric

        return saved;
    }

    public byte[] generateInvoicePDF(String invoiceId) {
        // ... generate PDF logic ...

        byte[] pdf = generator.generatePDF();
        metrics.recordPDFGenerated();  // Track metric

        return pdf;
    }
}
```

**Step 6: Test the Lifecycle**

```java
@SpringBootApplication
public class InvoiceManagerApp implements CommandLineRunner {

    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;
    private final ApplicationMetrics metrics;

    public InvoiceManagerApp(InvoiceService invoiceService,
                            CustomerRepository customerRepository,
                            ApplicationMetrics metrics) {
        this.invoiceService = invoiceService;
        this.customerRepository = customerRepository;
        this.metrics = metrics;
    }

    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }

    @Override
    public void run(String... args) {
        System.out.println("\n=== Creating Invoices ===");

        // Get sample customer (created by DataInitializer)
        Customer customer = customerRepository.findAll().get(0);

        // Create multiple invoices
        for (int i = 1; i <= 3; i++) {
            List<InvoiceLineItem> items = Arrays.asList(
                new InvoiceLineItem(new Product("P" + i, "Product " + i, 100.0 * i), 2)
            );

            Invoice invoice = invoiceService.createInvoice(customer.getId(), items);
            System.out.println("Created invoice: " + invoice.getId() + " Total: $" + invoice.getTotal());

            // Generate PDF
            byte[] pdf = invoiceService.generateInvoicePDF(invoice.getId());
            System.out.println("Generated PDF (" + pdf.length + " bytes)");
        }

        // Show metrics
        System.out.println("\n=== Current Metrics ===");
        metrics.getMetrics().forEach((key, value) ->
            System.out.println(key + ": " + value));
    }
}
```

**Expected Output**:
```
=== Initializing sample data ===
Sample customers created

=== Creating Invoices ===
Created invoice: abc-123 Total: $200.0
Generated PDF (245 bytes)
Created invoice: def-456 Total: $400.0
Generated PDF (245 bytes)
Created invoice: ghi-789 Total: $600.0
Generated PDF (245 bytes)

=== Current Metrics ===
invoicesCreated: 3
pdfsGenerated: 3
totalRevenue: 1200.0

=== Application shutting down ===
=== Final Metrics ===
Invoices Created: 3
PDFs Generated: 3
Total Revenue: $1200.0
```

**Checkpoint**: By now, your app should:
- ✅ Use prototype scope for stateful components (PDF generator)
- ✅ Use singleton scope for stateless services (default)
- ✅ Initialize data on startup (@PostConstruct)
- ✅ Clean up on shutdown (@PreDestroy)
- ✅ Track metrics with thread-safe counters (AtomicLong)

**Next step**: In [Spring Configuration](./03-configuration.md), you'll learn different ways to configure these beans.

---

## Common Mistakes

❌ **Mistake 1**: Storing state in singleton beans
```java
@Service  // Singleton
public class OrderService {
    private Order currentOrder;  // Shared across all threads!

    public void process(Order order) {
        this.currentOrder = order;  // Race condition
        // ...
    }
}
```
✅ **Instead**: Keep singletons stateless
```java
@Service
public class OrderService {
    public void process(Order order) {
        // Use parameter, not instance variable
    }
}
```

❌ **Mistake 2**: Injecting prototype into singleton
```java
@Service  // Singleton
public class MyService {
    @Autowired
    private PrototypeBean bean;  // Injected ONCE, never changes
}
```
✅ **Instead**: Get new instance each time
```java
@Service
public class MyService {
    @Autowired
    private ApplicationContext context;

    public void doSomething() {
        PrototypeBean bean = context.getBean(PrototypeBean.class);
        // Use bean
    }
}
```

❌ **Mistake 3**: Resource initialization in constructor
```java
@Component
public class DatabaseService {
    @Autowired
    private DataSource dataSource;

    public DatabaseService() {
        connect();  // NullPointerException - dataSource not injected yet!
    }

    private void connect() {
        connection = dataSource.getConnection();
    }
}
```
✅ **Instead**: Use @PostConstruct
```java
@Component
public class DatabaseService {
    @Autowired
    private DataSource dataSource;

    @PostConstruct
    public void connect() {
        connection = dataSource.getConnection();  // Safe - dependencies injected
    }
}
```

---

## Interview Questions

### Knowledge Questions
1. "What are the bean scopes in Spring?" → See "The Five Bean Scopes"
2. "What's the default scope?" → Singleton
3. "What's the bean lifecycle?" → See "Bean Lifecycle" section
4. "Difference between @PostConstruct and constructor?" → Constructor: before DI, @PostConstruct: after DI

### Scenario Questions
1. "When would you use prototype scope?"
   → Answer: When bean has mutable state (shopping cart, report generator)

2. "How do you inject a prototype bean into a singleton correctly?"
   → Answer: Use ApplicationContext.getBean() or ObjectFactory

3. "User data is being mixed up between users. What's wrong?"
   → Likely: Singleton bean storing user-specific state

### Debugging Questions
```java
@Service
public class ReportService {
    private Report report;  // Instance variable

    public Report generate(User user) {
        report = new Report(user);
        // Multiple users call this simultaneously
        return report;
    }
}
```
What's the problem? → Race condition - singleton with mutable state

---

## Summary

**In 3 sentences**:
- Bean scope determines how many instances Spring creates (singleton = one, prototype = many).
- Singleton is default and best for stateless beans; prototype for stateful beans that need separate instances.
- Use lifecycle callbacks (@PostConstruct, @PreDestroy) to initialize resources after DI and clean up before destruction.

**Key takeaway**: **Singleton by default, prototype when stateful** - most beans should be singletons (stateless), use prototype only when you need separate instances with their own state.

---

## Navigation

**Prerequisites:**
- [IoC & Dependency Injection](./01-ioc-and-di.md) - Understanding of bean creation and injection
- [Singleton Pattern](../../../01-core-java/design-patterns/singleton.md) - Design pattern basis for singleton scope

**Next Topics:**
- [Configuration Approaches](./03-configuration.md) - How to configure bean scopes and initialization
- [Aspect-Oriented Programming](./04-aop.md) - How AOP works with bean proxies

**Related:**
- [Spring Security](../../spring-security/README.md) - Uses request and session scopes
- [Spring Boot Actuator](../../spring-boot/04-actuator-monitoring.md) - Monitor bean lifecycle events
- [Best Practices](./05-best-practices.md) - Scope selection and lifecycle management patterns

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
