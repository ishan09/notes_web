# Spring Data JPA Best Practices and Common Pitfalls

> **Before you start**: Have you completed the previous modules? This file consolidates everything about performance, transactions, and production readiness.

## What This File Covers

This is your **checklist for writing professional Spring Data JPA code**. It covers:
- ✅ Performance optimization (N+1 problem, query tuning)
- ✅ Transaction management best practices
- ✅ Locking strategies (optimistic and pessimistic)
- ✅ Batch operations and pagination
- ✅ Testing strategies
- ✅ Common pitfalls and how to avoid them
- ✅ Production readiness checklist
- ✅ Interview questions with detailed answers

**Think of this as**: The lessons learned from thousands of production JPA applications - so you don't make the same mistakes.

---

## The N+1 Query Problem

### What Is It?

The **N+1 query problem** is when you execute **1 query** to fetch N entities, then **N additional queries** to load related data for each entity.

**Real-World Analogy**: Imagine you're a teacher taking attendance. You call 30 student names (1 query), then for each student, you ask them individually about their homework status (30 more queries). Instead, you could ask everyone at once: "Who completed their homework?" (1 query total).

### Example: The Problem

```java
// Step 1: Fetch all invoices (1 query)
List<Invoice> invoices = invoiceRepository.findAll();
// SQL: SELECT * FROM invoices
// Returns 100 invoices

// Step 2: Loop through invoices
for (Invoice invoice : invoices) {
    // Access customer (100 additional queries!)
    String customerName = invoice.getCustomer().getName();
    // SQL: SELECT * FROM customers WHERE id = ?
    // Executed 100 times!
}

// Total: 101 queries (1 + 100)
```

**Result**: Application slows to a crawl. Database gets hammered with queries.

### How to Detect It

#### 1. Enable SQL Logging

```yaml
# application.yml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

**What to Look For**:
```sql
-- First query
SELECT * FROM invoices

-- Then many repeated queries (BAD!)
SELECT * FROM customers WHERE id = 1
SELECT * FROM customers WHERE id = 2
SELECT * FROM customers WHERE id = 3
...
SELECT * FROM customers WHERE id = 100
```

#### 2. Use Spring Boot Actuator Metrics

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  metrics:
    enable:
      hibernate: true
```

Access: `http://localhost:8080/actuator/metrics/hibernate.query.executed.count`

### How to Fix It

#### Solution 1: JOIN FETCH (Best for Single Queries)

```java
// ❌ BAD - N+1 queries
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findAll();
}

// ✅ GOOD - Single query with JOIN
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer")
    List<Invoice> findAllWithCustomer();

    // Fetch multiple relationships
    @Query("SELECT DISTINCT i FROM Invoice i " +
           "JOIN FETCH i.customer " +
           "LEFT JOIN FETCH i.items")
    List<Invoice> findAllWithCustomerAndItems();
}

// Usage
List<Invoice> invoices = invoiceRepository.findAllWithCustomer();
// SQL: SELECT * FROM invoices i
//      JOIN customers c ON i.customer_id = c.id
// Single query - no N+1 problem!

for (Invoice invoice : invoices) {
    invoice.getCustomer().getName();  // No additional query
}
```

**When to Use**:
- Loading all data at once
- Small result sets
- Not using pagination

**Limitations**:
- Cannot use with pagination (setFirstResult/setMaxResults)
- Multiple JOIN FETCH on collections creates Cartesian product

#### Solution 2: @EntityGraph (Cleaner Syntax)

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @EntityGraph(attributePaths = {"customer"})
    List<Invoice> findAll();

    @EntityGraph(attributePaths = {"customer", "items"})
    Optional<Invoice> findById(Long id);

    @EntityGraph(attributePaths = {"customer"})
    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);
}

// Works with pagination!
Page<Invoice> page = invoiceRepository.findByStatus(
    InvoiceStatus.PAID,
    PageRequest.of(0, 20)
);
```

**Named Entity Graphs** (Reusable):
```java
@Entity
@NamedEntityGraph(
    name = "Invoice.withCustomer",
    attributeNodes = @NamedAttributeNode("customer")
)
@NamedEntityGraph(
    name = "Invoice.full",
    attributeNodes = {
        @NamedAttributeNode("customer"),
        @NamedAttributeNode(value = "items", subgraph = "items-subgraph")
    },
    subgraphs = @NamedSubgraph(
        name = "items-subgraph",
        attributeNodes = @NamedAttributeNode("product")
    )
)
public class Invoice {
    // ...
}

// Usage
@EntityGraph("Invoice.full")
Optional<Invoice> findById(Long id);
```

**When to Use**:
- Works with pagination
- Cleaner than JOIN FETCH
- Reusable entity graphs

#### Solution 3: @BatchSize (Fallback)

```java
@Entity
public class Invoice {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @BatchSize(size = 25)  // Fetch 25 customers at once
    private Customer customer;
}

// Usage
List<Invoice> invoices = invoiceRepository.findAll();
// Query 1: SELECT * FROM invoices (returns 100)

for (Invoice invoice : invoices) {
    invoice.getCustomer().getName();
}
// Query 2: SELECT * FROM customers WHERE id IN (?, ?, ..., ?)  -- 25 IDs
// Query 3: SELECT * FROM customers WHERE id IN (?, ?, ..., ?)  -- next 25
// Query 4: SELECT * FROM customers WHERE id IN (?, ?, ..., ?)  -- next 25
// Query 5: SELECT * FROM customers WHERE id IN (?, ?, ..., ?)  -- last 25

// Total: 5 queries instead of 101!
```

**When to Use**:
- Can't use JOIN FETCH (pagination, dynamic queries)
- Reduces N+1 but still multiple queries
- Good compromise for complex scenarios

### Comparison

| Solution | Queries | Pagination | Complexity | Best For |
|----------|---------|------------|------------|----------|
| **JOIN FETCH** | 1 | ❌ No | Medium | Simple loads |
| **@EntityGraph** | 1 | ✅ Yes | Low | Most cases |
| **@BatchSize** | ~N/batch_size | ✅ Yes | Low | Fallback |

### N+1 in Service Layer

```java
// ❌ BAD - Service causing N+1
@Service
public class ReportService {

    @Transactional(readOnly = true)
    public List<InvoiceReportDTO> generateReport() {
        List<Invoice> invoices = invoiceRepository.findAll();  // 1 query

        return invoices.stream()
            .map(invoice -> new InvoiceReportDTO(
                invoice.getId(),
                invoice.getCustomer().getName(),  // N queries
                invoice.getItems().size()         // N more queries
            ))
            .collect(Collectors.toList());
    }
}

// ✅ GOOD - Fetch everything upfront
@Service
public class ReportService {

    @Transactional(readOnly = true)
    public List<InvoiceReportDTO> generateReport() {
        // Single query with JOIN FETCH
        List<Invoice> invoices = invoiceRepository.findAllWithCustomerAndItems();

        return invoices.stream()
            .map(invoice -> new InvoiceReportDTO(
                invoice.getId(),
                invoice.getCustomer().getName(),  // Already loaded
                invoice.getItems().size()         // Already loaded
            ))
            .collect(Collectors.toList());
    }
}
```

---

## Transaction Management

### What Are Transactions?

**Transaction**: A group of database operations that either **all succeed** or **all fail** together.

**Real-World Analogy**: Imagine transferring money between bank accounts. You need to:
1. Deduct from Account A
2. Add to Account B

If step 2 fails, step 1 should be **rolled back** (undone). You can't have money disappearing!

### @Transactional Best Practices

#### ✅ DO: Use @Transactional on Service Layer

```java
@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final EmailService emailService;
    private final AuditService auditService;

    @Transactional  // All operations succeed or all fail
    public Invoice createInvoice(CreateInvoiceRequest request) {
        // Step 1: Create invoice
        Invoice invoice = new Invoice();
        invoice.setCustomer(customerRepository.findById(request.getCustomerId()).orElseThrow());

        for (ItemRequest item : request.getItems()) {
            invoice.addItem(new InvoiceLineItem(item.getProduct(), item.getQuantity(), item.getPrice()));
        }

        // Step 2: Save invoice
        invoice = invoiceRepository.save(invoice);

        // Step 3: Send email
        emailService.sendInvoiceEmail(invoice);

        // Step 4: Log audit
        auditService.logInvoiceCreated(invoice);

        // If ANY step fails, ALL steps are rolled back
        return invoice;
    }
}
```

**Why Service Layer?**
- Business logic lives in services
- Repositories should be simple data access
- Service methods define transaction boundaries

#### ❌ DON'T: Use @Transactional on Repository Methods

```java
// ❌ BAD - Transaction too fine-grained
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Transactional  // Don't do this
    Invoice save(Invoice invoice);
}

// Now you can't group multiple repository calls in one transaction
```

#### ✅ DO: Use readOnly = true for Read-Only Operations

```java
@Service
public class InvoiceService {

    @Transactional(readOnly = true)  // Performance optimization
    public Invoice getInvoice(Long id) {
        return invoiceRepository.findById(id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<Invoice> getCustomerInvoices(Long customerId) {
        return invoiceRepository.findByCustomerId(customerId);
    }
}
```

**Benefits**:
- Database optimizes for read operations
- Prevents accidental modifications
- Explicit intent in code

#### ✅ DO: Specify Timeout for Long Operations

```java
@Service
public class ReportService {

    @Transactional(timeout = 60)  // 60 seconds max
    public Report generateAnnualReport(int year) {
        // Long-running operation
        // Automatically rolled back if takes > 60 seconds
    }
}
```

#### ✅ DO: Handle Exceptions Properly

```java
@Service
public class InvoiceService {

    @Transactional(rollbackFor = {InvoiceException.class, EmailException.class})
    public Invoice createAndSendInvoice(CreateInvoiceRequest request) {
        Invoice invoice = createInvoice(request);

        try {
            emailService.send(invoice);
        } catch (EmailException e) {
            // This will rollback the entire transaction
            throw e;
        }

        return invoice;
    }

    @Transactional(noRollbackFor = NotificationException.class)
    public Invoice createInvoice(CreateInvoiceRequest request) {
        Invoice invoice = save(request);

        try {
            notificationService.notify(invoice);
        } catch (NotificationException e) {
            // Don't rollback if notification fails
            // Invoice is still saved
            log.warn("Failed to send notification", e);
        }

        return invoice;
    }
}
```

**Default Rollback Behavior**:
- **Unchecked exceptions** (RuntimeException): Rollback
- **Checked exceptions**: NO rollback (you must specify)

#### ❌ DON'T: Access LAZY Collections Outside Transaction

```java
// ❌ BAD
@Service
public class InvoiceService {

    public List<InvoiceLineItem> getInvoiceItems(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();
        // Transaction ends here

        return invoice.getItems();  // LazyInitializationException!
    }
}

// ✅ GOOD
@Service
public class InvoiceService {

    @Transactional(readOnly = true)  // Keep transaction open
    public List<InvoiceLineItem> getInvoiceItems(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();

        return new ArrayList<>(invoice.getItems());  // Load within transaction
    }
}

// ✅ BETTER - Use fetch join
@Service
public class InvoiceService {

    @Transactional(readOnly = true)
    public List<InvoiceLineItem> getInvoiceItems(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithItems(invoiceId).orElseThrow();
        return invoice.getItems();
    }
}
```

### Transaction Propagation

**Propagation** defines how transactions behave when one transactional method calls another.

```java
@Service
public class OrderService {

    @Autowired
    private InventoryService inventoryService;

    @Transactional
    public void placeOrder(Order order) {
        orderRepository.save(order);

        // How does this transaction interact with the outer transaction?
        inventoryService.reserveItems(order.getItems());
    }
}

@Service
public class InventoryService {

    @Transactional(propagation = Propagation.REQUIRED)  // Default
    public void reserveItems(List<Item> items) {
        // Joins the existing transaction from placeOrder()
        // If this fails, BOTH placeOrder and reserveItems are rolled back
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logInventoryChange(Item item) {
        // Creates a NEW transaction (independent)
        // If placeOrder() fails, this is still committed
        // Useful for logging/audit that should persist regardless
    }
}
```

**Common Propagation Types**:

| Type | Behavior |
|------|----------|
| `REQUIRED` (default) | Join existing transaction, or create new |
| `REQUIRES_NEW` | Always create new transaction (suspend existing) |
| `SUPPORTS` | Join transaction if exists, otherwise non-transactional |
| `NOT_SUPPORTED` | Always non-transactional (suspend existing) |
| `NEVER` | Throw exception if transaction exists |
| `MANDATORY` | Throw exception if no transaction exists |

---

## Optimistic Locking

### What Is It?

**Optimistic locking** assumes conflicts are **rare**. Instead of locking the row, it checks if data changed before updating.

**Real-World Analogy**: Google Docs. Multiple people can edit simultaneously. When you save, it checks if someone else changed it. If yes, you're warned and can merge changes.

### How It Works

```java
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal price;

    @Version  // Optimistic locking
    private Long version;

    // Getters, setters
}
```

**Database Schema**:
```sql
CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10, 2),
    version BIGINT NOT NULL DEFAULT 0  -- Auto-incremented by JPA
);
```

### How It Works (Step-by-Step)

```java
// User A loads product
Product product = productRepository.findById(1L).orElseThrow();
// SELECT id, name, price, version FROM products WHERE id = 1
// Result: version = 5

// User B also loads the same product
Product product2 = productRepository.findById(1L).orElseThrow();
// version = 5 for both users

// User A updates and saves
product.setPrice(new BigDecimal("99.99"));
productRepository.save(product);
// UPDATE products
// SET name = ?, price = ?, version = 6
// WHERE id = 1 AND version = 5
// Success! version incremented to 6

// User B tries to save (with stale version = 5)
product2.setPrice(new BigDecimal("89.99"));
productRepository.save(product2);
// UPDATE products
// SET name = ?, price = ?, version = 6
// WHERE id = 1 AND version = 5
// NO ROWS UPDATED (version is now 6, not 5)
// Throws OptimisticLockException!
```

### Handling OptimisticLockException

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional
    public void updatePrice(Long productId, BigDecimal newPrice) {
        try {
            Product product = productRepository.findById(productId).orElseThrow();
            product.setPrice(newPrice);
            productRepository.save(product);
        } catch (OptimisticLockException e) {
            // Someone else updated the product
            throw new ConcurrentUpdateException("Product was modified by another user");
        }
    }

    // With retry logic
    @Transactional
    @Retryable(
        value = OptimisticLockException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 100)
    )
    public void updatePriceWithRetry(Long productId, BigDecimal newPrice) {
        Product product = productRepository.findById(productId).orElseThrow();
        product.setPrice(newPrice);
        productRepository.save(product);
        // Automatically retries up to 3 times if OptimisticLockException occurs
    }
}
```

### When to Use Optimistic Locking

**✅ Use When**:
- Updates are **rare**
- Read-heavy workload
- Low contention
- User-facing applications (shopping carts, forms)

**❌ Don't Use When**:
- High update frequency
- High contention (many users updating same data)
- Need guaranteed locking (use pessimistic locking instead)

---

## Pessimistic Locking

### What Is It?

**Pessimistic locking** assumes conflicts are **common**. It locks the database row, preventing others from reading or writing.

**Real-World Analogy**: Using a bathroom. When someone enters, they lock the door. Others must wait until they're done.

### Types of Pessimistic Locks

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Read lock (others can read, but not write)
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithReadLock(@Param("id") Long id);

    // Write lock (others can't read or write)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithWriteLock(@Param("id") Long id);

    // Force increment (automatically increments version)
    @Lock(LockModeType.PESSIMISTIC_FORCE_INCREMENT)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithForceIncrement(@Param("id") Long id);
}
```

### Example: Bank Transfer

```java
@Service
public class BankService {

    @Transactional
    public void transfer(Long fromAccountId, Long toAccountId, BigDecimal amount) {
        // Lock both accounts (prevents concurrent transfers)
        Account fromAccount = accountRepository.findByIdWithWriteLock(fromAccountId)
            .orElseThrow();
        Account toAccount = accountRepository.findByIdWithWriteLock(toAccountId)
            .orElseThrow();

        // Perform transfer
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        // Locks released when transaction commits
    }
}
```

**Generated SQL**:
```sql
-- PostgreSQL
SELECT * FROM accounts WHERE id = ? FOR UPDATE;

-- MySQL
SELECT * FROM accounts WHERE id = ? FOR UPDATE;

-- Oracle
SELECT * FROM accounts WHERE id = ? FOR UPDATE;
```

### Lock Timeout

```java
@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "javax.persistence.lock.timeout", value = "5000")})
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdWithWriteLock(@Param("id") Long id);
    // If lock not acquired in 5 seconds, throw LockTimeoutException
}
```

### When to Use Pessimistic Locking

**✅ Use When**:
- High contention (many concurrent updates)
- Critical operations (financial transactions)
- Short transactions
- Must prevent conflicts

**❌ Don't Use When**:
- Long-running transactions (holds lock too long)
- Read-heavy workload
- Low contention
- Can handle conflicts after the fact

### Optimistic vs Pessimistic

| Aspect | Optimistic | Pessimistic |
|--------|------------|-------------|
| **Philosophy** | Assume no conflicts | Assume conflicts |
| **Performance** | Better (no locking) | Worse (database locks) |
| **Concurrency** | Higher | Lower |
| **Use Case** | Low contention | High contention |
| **Failure Handling** | Handle exception | Prevent at database |
| **Deadlocks** | No | Possible |

---

## Batch Operations

### Problem: Saving Many Entities

```java
// ❌ BAD - N separate INSERT statements
for (int i = 0; i < 1000; i++) {
    Customer customer = new Customer("Customer " + i, "customer" + i + "@example.com");
    customerRepository.save(customer);
    // 1000 separate database calls!
}
```

### Solution 1: saveAll()

```java
// ✅ GOOD - Batch INSERT
List<Customer> customers = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    customers.add(new Customer("Customer " + i, "customer" + i + "@example.com"));
}

customerRepository.saveAll(customers);
// Still 1000 INSERTs, but fewer round-trips to database
```

### Solution 2: Configure Batch Size

```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50  # Batch 50 statements together
        order_inserts: true  # Group INSERT statements
        order_updates: true  # Group UPDATE statements
```

```java
// Now saveAll() executes in batches of 50
customerRepository.saveAll(customers);
// Executes 20 batches (1000 / 50) instead of 1000 individual statements
```

### Solution 3: Use SEQUENCE for IDs (Better Batch Performance)

```java
// ❌ BAD for batching - IDENTITY requires immediate DB call for ID
@Entity
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Each insert needs DB
    private Long id;
}

// ✅ GOOD for batching - SEQUENCE can pre-allocate IDs
@Entity
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "customer_seq")
    @SequenceGenerator(name = "customer_seq", sequenceName = "customer_sequence", allocationSize = 50)
    private Long id;
}
```

**Why SEQUENCE is better**:
- IDENTITY: Must insert each row to get generated ID (disables batching)
- SEQUENCE: Pre-allocates IDs in batches (enables true batching)

### Batch Updates

```java
@Service
public class BulkUpdateService {

    @Transactional
    public void updateAllPrices(BigDecimal multiplier) {
        List<Product> products = productRepository.findAll();

        for (Product product : products) {
            BigDecimal newPrice = product.getPrice().multiply(multiplier);
            product.setPrice(newPrice);
        }

        productRepository.saveAll(products);  // Batched updates
    }

    // Better - Use bulk UPDATE query
    @Transactional
    public void updateAllPricesBulk(BigDecimal multiplier) {
        productRepository.updateAllPrices(multiplier);
        // Single UPDATE query instead of N
    }
}

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Modifying
    @Query("UPDATE Product p SET p.price = p.price * :multiplier")
    int updateAllPrices(@Param("multiplier") BigDecimal multiplier);
}
```

### Flush and Clear for Large Batches

```java
@Service
public class ImportService {

    @Autowired
    private EntityManager entityManager;

    @Transactional
    public void importCustomers(List<CustomerDTO> dtos) {
        int batchSize = 50;

        for (int i = 0; i < dtos.size(); i++) {
            Customer customer = new Customer(dtos.get(i).getName(), dtos.get(i).getEmail());
            entityManager.persist(customer);

            if (i % batchSize == 0 && i > 0) {
                entityManager.flush();  // Execute batched statements
                entityManager.clear();  // Clear persistence context (free memory)
            }
        }

        entityManager.flush();  // Flush remaining
    }
}
```

**Why flush() and clear()?**
- `flush()`: Sends changes to database
- `clear()`: Clears persistence context, freeing memory
- Without clear(), all entities stay in memory (OutOfMemoryError for large imports)

---

## Pagination Best Practices

### Basic Pagination

```java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceRepository invoiceRepository;

    @GetMapping
    public Page<Invoice> getInvoices(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "id") String sortBy,
        @RequestParam(defaultValue = "ASC") String direction
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        return invoiceRepository.findAll(pageable);
    }
}
```

**Request**:
```
GET /api/invoices?page=0&size=20&sortBy=invoiceDate&direction=DESC
```

**Response**:
```json
{
  "content": [ /* 20 invoices */ ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": { "sorted": true, "orders": [{"property": "invoiceDate", "direction": "DESC"}] }
  },
  "totalElements": 1000,
  "totalPages": 50,
  "last": false,
  "first": true
}
```

### Pagination with JOIN FETCH (Problem)

```java
// ❌ BAD - JOIN FETCH doesn't work with setMaxResults
@Query("SELECT i FROM Invoice i JOIN FETCH i.customer")
Page<Invoice> findAllWithCustomer(Pageable pageable);

// WARNING: Hibernate loads ALL rows in memory, then pages in memory!
// If you have 100,000 invoices, all 100,000 are loaded!
```

### Solution: Use @EntityGraph

```java
// ✅ GOOD - @EntityGraph works with pagination
@EntityGraph(attributePaths = {"customer"})
Page<Invoice> findAll(Pageable pageable);

@EntityGraph(attributePaths = {"customer"})
Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);
```

### Custom Pagination DTO

```java
// Return DTO instead of entity
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT new com.example.dto.InvoiceSummaryDTO(" +
           "i.id, i.invoiceDate, i.total, c.name) " +
           "FROM Invoice i JOIN i.customer c")
    Page<InvoiceSummaryDTO> findAllSummaries(Pageable pageable);
}

// DTO
public class InvoiceSummaryDTO {
    private Long id;
    private LocalDate invoiceDate;
    private BigDecimal total;
    private String customerName;

    public InvoiceSummaryDTO(Long id, LocalDate invoiceDate, BigDecimal total, String customerName) {
        this.id = id;
        this.invoiceDate = invoiceDate;
        this.total = total;
        this.customerName = customerName;
    }

    // Getters
}
```

### Slice (Lightweight Alternative)

```java
// If you don't need total count, use Slice
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Slice<Invoice> findByCustomerId(Long customerId, Pageable pageable);
}

// Slice only knows:
// - Current page data
// - hasNext() / hasPrevious()
// Does NOT execute COUNT query (faster!)
```

**Use Slice when**:
- Infinite scroll (mobile apps)
- Don't need total count
- Performance critical

---

## Index Optimization

### When to Add Indexes

**Indexes** speed up queries but slow down inserts/updates. Add indexes on columns frequently used in:
- WHERE clauses
- JOIN conditions
- ORDER BY clauses
- Foreign keys

### Adding Indexes

```java
@Entity
@Table(
    name = "invoices",
    indexes = {
        @Index(name = "idx_customer_id", columnList = "customer_id"),
        @Index(name = "idx_invoice_date", columnList = "invoice_date"),
        @Index(name = "idx_status", columnList = "status"),
        @Index(name = "idx_customer_date", columnList = "customer_id, invoice_date")  // Composite
    }
)
public class Invoice {
    // ...
}
```

**Generated SQL**:
```sql
CREATE INDEX idx_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_status ON invoices(status);
CREATE INDEX idx_customer_date ON invoices(customer_id, invoice_date);
```

### Unique Indexes

```java
@Entity
@Table(
    name = "customers",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_email", columnNames = "email")
    }
)
public class Customer {

    @Column(unique = true)  // Also creates unique index
    private String email;
}
```

### Check Index Usage

```sql
-- PostgreSQL - Check if index is used
EXPLAIN ANALYZE
SELECT * FROM invoices WHERE customer_id = 1;

-- Should show "Index Scan using idx_customer_id"
-- If it shows "Seq Scan", index is not being used
```

---

## Query Performance Tuning

### Use Projections for Large Entities

```java
// ❌ BAD - Load entire entity when you only need 2 fields
List<Invoice> invoices = invoiceRepository.findAll();
for (Invoice invoice : invoices) {
    System.out.println(invoice.getId() + ": " + invoice.getTotal());
}

// ✅ GOOD - Projection interface
public interface InvoiceProjection {
    Long getId();
    BigDecimal getTotal();
}

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<InvoiceProjection> findAllProjectedBy();
}

// Usage
List<InvoiceProjection> invoices = invoiceRepository.findAllProjectedBy();
// Only selects id and total columns
```

### Class-Based Projections

```java
// DTO projection
@Query("SELECT new com.example.dto.InvoiceSummary(i.id, i.total, c.name) " +
       "FROM Invoice i JOIN i.customer c")
List<InvoiceSummary> findAllSummaries();

public class InvoiceSummary {
    private Long id;
    private BigDecimal total;
    private String customerName;

    public InvoiceSummary(Long id, BigDecimal total, String customerName) {
        this.id = id;
        this.total = total;
        this.customerName = customerName;
    }

    // Getters
}
```

### Use Native Queries for Complex Reports

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query(value = "SELECT " +
           "    c.name AS customer_name, " +
           "    COUNT(i.id) AS invoice_count, " +
           "    SUM(i.total) AS total_amount " +
           "FROM customers c " +
           "LEFT JOIN invoices i ON c.id = i.customer_id " +
           "GROUP BY c.id, c.name " +
           "ORDER BY total_amount DESC",
           nativeQuery = true)
    List<Object[]> getCustomerInvoiceStats();
}
```

### Stream Large Result Sets

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @QueryHints(value = @QueryHint(name = HINT_FETCH_SIZE, value = "50"))
    @Query("SELECT i FROM Invoice i")
    Stream<Invoice> streamAll();
}

@Service
public class InvoiceExportService {

    @Transactional(readOnly = true)
    public void exportAll(OutputStream out) {
        try (Stream<Invoice> invoices = invoiceRepository.streamAll()) {
            invoices.forEach(invoice -> {
                // Process and write to output
                writeToStream(out, invoice);
            });
        }
        // Stream is closed automatically
    }
}
```

---

## Connection Pooling (HikariCP)

### Default Configuration

Spring Boot uses **HikariCP** by default (fastest connection pool).

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

    hikari:
      maximum-pool-size: 10          # Max connections
      minimum-idle: 5                 # Min idle connections
      connection-timeout: 20000       # 20 seconds
      idle-timeout: 300000            # 5 minutes
      max-lifetime: 1200000           # 20 minutes
      pool-name: InvoiceHikariPool
```

### Sizing the Pool

**Formula**: `connections = ((core_count * 2) + effective_spindle_count)`

**Example**:
- 4 CPU cores
- SSD (effective_spindle_count ≈ 1)
- Pool size = (4 × 2) + 1 = **9 connections**

**Common Mistakes**:
- ❌ Pool too large (200+ connections): Waste resources, slow
- ❌ Pool too small (1-2 connections): Bottleneck
- ✅ Start with 10-20, monitor, adjust

### Monitor Connection Pool

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics
  metrics:
    enable:
      hikaricp: true
```

**Metrics to Watch**:
- `hikaricp.connections.active` - Active connections
- `hikaricp.connections.idle` - Idle connections
- `hikaricp.connections.pending` - Waiting threads (should be 0)
- `hikaricp.connections.timeout` - Connection timeouts (should be 0)

---

## Database Migrations

### Why Use Migrations?

**Problem**: How do you version control your database schema?

**Solution**: Database migrations - version-controlled SQL scripts that evolve your schema.

### Flyway (Simpler)

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

**Migration Files** (`src/main/resources/db/migration`):

```sql
-- V1__create_customers_table.sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- V2__create_invoices_table.sql
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- V3__add_index_to_invoices.sql
CREATE INDEX idx_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoice_date ON invoices(invoice_date);

-- V4__add_phone_to_customers.sql
ALTER TABLE customers ADD COLUMN mobile VARCHAR(50);
```

**Naming Convention**: `V{version}__{description}.sql`

### Liquibase (More Features)

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

```yaml
spring:
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.yaml
```

**Changelog** (`src/main/resources/db/changelog/db.changelog-master.yaml`):

```yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: john
      changes:
        - createTable:
            tableName: customers
            columns:
              - column:
                  name: id
                  type: BIGINT
                  autoIncrement: true
                  constraints:
                    primaryKey: true
              - column:
                  name: name
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    unique: true
                    nullable: false

  - changeSet:
      id: 2
      author: john
      changes:
        - addColumn:
            tableName: customers
            columns:
              - column:
                  name: phone
                  type: VARCHAR(50)
```

### Best Practices

1. **Never modify existing migrations** - Create new ones
2. **Test migrations** on dev/test databases first
3. **Backup production** before running migrations
4. **Use transactions** (Flyway does this automatically for PostgreSQL)
5. **Version migrations** alongside code

---

## Testing Strategies

### @DataJpaTest (Repository Tests)

```java
@DataJpaTest  // Loads only JPA components
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)  // Use real database
public class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    public void testFindByCustomerId() {
        // Given
        Customer customer = new Customer("Acme Corp", "acme@example.com");
        customer = customerRepository.save(customer);

        Invoice invoice1 = new Invoice();
        invoice1.setCustomer(customer);
        invoice1.setTotal(new BigDecimal("100.00"));
        invoiceRepository.save(invoice1);

        Invoice invoice2 = new Invoice();
        invoice2.setCustomer(customer);
        invoice2.setTotal(new BigDecimal("200.00"));
        invoiceRepository.save(invoice2);

        entityManager.flush();
        entityManager.clear();  // Clear persistence context

        // When
        List<Invoice> invoices = invoiceRepository.findByCustomerId(customer.getId());

        // Then
        assertThat(invoices).hasSize(2);
        assertThat(invoices).extracting(Invoice::getTotal)
            .containsExactlyInAnyOrder(new BigDecimal("100.00"), new BigDecimal("200.00"));
    }

    @Test
    public void testNoPlusOneQueryProblem() {
        // Given
        Customer customer = customerRepository.save(new Customer("Test", "test@example.com"));

        for (int i = 0; i < 5; i++) {
            Invoice invoice = new Invoice();
            invoice.setCustomer(customer);
            invoice.setTotal(new BigDecimal("100.00"));
            invoiceRepository.save(invoice);
        }

        entityManager.flush();
        entityManager.clear();

        // When
        List<Invoice> invoices = invoiceRepository.findAllWithCustomer();

        // Then - Access customer without additional queries
        assertThat(invoices).hasSize(5);

        // This should not trigger additional queries (already loaded)
        for (Invoice invoice : invoices) {
            assertThat(invoice.getCustomer().getName()).isEqualTo("Test");
        }
    }
}
```

### @Sql (Load Test Data)

```java
@DataJpaTest
public class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Test
    @Sql("/test-data/customers.sql")
    @Sql("/test-data/invoices.sql")
    public void testFindByDateRange() {
        // Test data loaded from SQL files
        List<Invoice> invoices = invoiceRepository.findByInvoiceDateBetween(
            LocalDate.of(2024, 1, 1),
            LocalDate.of(2024, 12, 31)
        );

        assertThat(invoices).isNotEmpty();
    }
}
```

**test-data/customers.sql**:
```sql
INSERT INTO customers (id, name, email) VALUES
(1, 'Customer A', 'a@example.com'),
(2, 'Customer B', 'b@example.com');
```

**test-data/invoices.sql**:
```sql
INSERT INTO invoices (id, customer_id, invoice_date, total, status) VALUES
(1, 1, '2024-01-15', 100.00, 'PAID'),
(2, 1, '2024-06-20', 200.00, 'PAID'),
(3, 2, '2024-12-10', 150.00, 'DRAFT');
```

### TestContainers (Real Database)

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class InvoiceRepositoryIntegrationTest {

    @Container
    @ServiceConnection  // Spring Boot 3.1+
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Test
    public void testWithRealDatabase() {
        // Test runs against real PostgreSQL in Docker container
        // Container automatically started before tests, stopped after

        Invoice invoice = new Invoice();
        invoice.setTotal(new BigDecimal("100.00"));

        Invoice saved = invoiceRepository.save(invoice);

        assertThat(saved.getId()).isNotNull();
    }
}
```

**Benefits**:
- Tests run against real database (not H2)
- Catches database-specific issues
- No need for H2 compatibility workarounds

### Unit Tests (No Spring)

```java
public class InvoiceServiceTest {

    private InvoiceService invoiceService;
    private InvoiceRepository invoiceRepository;
    private CustomerRepository customerRepository;

    @BeforeEach
    public void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        customerRepository = mock(CustomerRepository.class);
        invoiceService = new InvoiceService(invoiceRepository, customerRepository);
    }

    @Test
    public void testCreateInvoice() {
        // Given
        Long customerId = 1L;
        Customer customer = new Customer("Test", "test@example.com");
        customer.setId(customerId);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

        List<InvoiceLineItemDTO> items = List.of(
            new InvoiceLineItemDTO("Product A", 2, new BigDecimal("50.00"))
        );

        // When
        Invoice invoice = invoiceService.createInvoice(customerId, items);

        // Then
        assertThat(invoice).isNotNull();
        assertThat(invoice.getCustomer()).isEqualTo(customer);
        assertThat(invoice.getItems()).hasSize(1);
        assertThat(invoice.getTotal()).isEqualByComparingTo(new BigDecimal("100.00"));

        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    public void testCreateInvoiceWithInvalidCustomer() {
        // Given
        when(customerRepository.findById(999L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> invoiceService.createInvoice(999L, List.of()))
            .isInstanceOf(CustomerNotFoundException.class);
    }
}
```

---

## Common Pitfalls Checklist

### 1. LazyInitializationException

**Problem**: Accessing lazy-loaded collection outside transaction.

**Solution**:
- Add `@Transactional(readOnly = true)` to service method
- Use JOIN FETCH or @EntityGraph
- Initialize collections within transaction

### 2. MultipleBagFetchException

**Problem**: Multiple @OneToMany with FetchType.EAGER or multiple JOIN FETCH.

**Solution**:
- Use LAZY fetch type
- Use separate queries or @EntityGraph
- Convert one collection to Set

### 3. Object References an Unsaved Transient Instance

**Problem**: Saving entity with reference to unsaved entity.

**Solution**:
- Add `cascade = CascadeType.PERSIST`
- Save referenced entity first
- Use `cascade = CascadeType.ALL` if appropriate

### 4. StackOverflowError (JSON Serialization)

**Problem**: Bidirectional relationship creates infinite loop.

**Solution**:
- Use `@JsonManagedReference` / `@JsonBackReference`
- Use `@JsonIgnore`
- Use DTOs instead of entities

### 5. Detached Entity Passed to Persist

**Problem**: Calling `persist()` on entity with ID.

**Solution**:
- Use `save()` (merge) instead of `persist()`
- Call `merge()` explicitly
- Ensure entity is attached

---

## Production Readiness Checklist

### Configuration
- [ ] Connection pool sized appropriately (10-20 for most apps)
- [ ] Connection timeout configured (20-30 seconds)
- [ ] Statement timeout configured (30-60 seconds)
- [ ] Database credentials externalized (environment variables)
- [ ] SSL/TLS enabled for database connections
- [ ] `spring.jpa.hibernate.ddl-auto` set to `validate` or `none`

### Performance
- [ ] Indexes on foreign keys and frequently queried columns
- [ ] N+1 queries eliminated (check logs)
- [ ] Pagination used for large result sets
- [ ] Projections used for large entities
- [ ] Query execution plans reviewed (EXPLAIN ANALYZE)
- [ ] Batch operations configured (`jdbc.batch_size`)

### Transactions
- [ ] `@Transactional` on service methods (not repositories)
- [ ] `readOnly = true` for read-only operations
- [ ] Timeout configured for long operations
- [ ] Proper exception handling and rollback

### Monitoring
- [ ] SQL logging enabled in dev (disabled in prod)
- [ ] Slow query logging enabled
- [ ] Connection pool metrics monitored
- [ ] Query statistics collected (`hibernate.generate_statistics`)
- [ ] Health checks configured

### Data Integrity
- [ ] Unique constraints on business keys
- [ ] Foreign key constraints defined
- [ ] NOT NULL constraints on required fields
- [ ] Database migrations (Flyway/Liquibase)
- [ ] Backup and recovery plan

### Testing
- [ ] Repository tests with @DataJpaTest
- [ ] Service tests (unit and integration)
- [ ] TestContainers for integration tests
- [ ] N+1 query tests
- [ ] Concurrency tests (optimistic locking)

---

## Interview Questions with Answers

### Q1: What is the N+1 query problem and how do you fix it?

**Answer**:

The N+1 query problem occurs when you fetch N entities with one query, then execute N additional queries to load related data for each entity.

**Example**:
```java
// 1 query for invoices
List<Invoice> invoices = invoiceRepository.findAll();

// N queries (one per invoice)
for (Invoice invoice : invoices) {
    invoice.getCustomer().getName();
}
```

**Solutions**:
1. **JOIN FETCH**: `@Query("SELECT i FROM Invoice i JOIN FETCH i.customer")`
2. **@EntityGraph**: `@EntityGraph(attributePaths = {"customer"})`
3. **@BatchSize**: Fetch in batches instead of individually

### Q2: Explain optimistic vs pessimistic locking.

**Answer**:

**Optimistic Locking**:
- Assumes conflicts are rare
- Uses `@Version` column
- Checks if data changed before updating
- Throws `OptimisticLockException` if conflict detected
- Best for: Low contention, read-heavy workloads

**Pessimistic Locking**:
- Assumes conflicts are common
- Uses database locks (SELECT FOR UPDATE)
- Prevents others from reading/writing
- Best for: High contention, critical operations

**Example**:
```java
// Optimistic
@Entity
public class Product {
    @Version
    private Long version;
}

// Pessimistic
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Product p WHERE p.id = :id")
Optional<Product> findByIdWithLock(@Param("id") Long id);
```

### Q3: When should you use @Transactional?

**Answer**:

Use `@Transactional` on service layer methods that:
1. Modify data (inserts, updates, deletes)
2. Execute multiple database operations that must succeed/fail together
3. Need to access lazy-loaded collections

**Best Practices**:
- Place on service methods, not repositories
- Use `readOnly = true` for read-only operations
- Specify timeout for long operations
- Handle exceptions appropriately

**Example**:
```java
@Service
public class OrderService {

    @Transactional  // Create order, reserve inventory, charge payment - all or nothing
    public Order placeOrder(OrderRequest request) {
        Order order = createOrder(request);
        inventoryService.reserveItems(order.getItems());
        paymentService.charge(order.getTotal());
        return order;
    }

    @Transactional(readOnly = true)  // Read-only optimization
    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }
}
```

### Q4: What is the difference between IDENTITY and SEQUENCE for ID generation?

**Answer**:

**IDENTITY** (`@GeneratedValue(strategy = GenerationType.IDENTITY)`):
- Database generates ID on INSERT
- Requires immediate database call to get ID
- Disables JDBC batching (must insert one by one)
- Supported: MySQL, SQL Server, PostgreSQL

**SEQUENCE** (`@GeneratedValue(strategy = GenerationType.SEQUENCE)`):
- Database sequence pre-allocates IDs
- JPA can fetch IDs in batches
- Enables efficient JDBC batching
- Supported: PostgreSQL, Oracle, H2

**Performance Impact**:
```java
// IDENTITY - 1000 separate INSERTs
for (Customer c : customers) {
    repository.save(c);  // Must insert immediately to get ID
}

// SEQUENCE - Batched INSERTs (50 at a time with batch_size=50)
for (Customer c : customers) {
    repository.save(c);  // ID pre-fetched, batch later
}
```

**Recommendation**: Use SEQUENCE for better batch performance.

### Q5: How do you handle LazyInitializationException?

**Answer**:

`LazyInitializationException` occurs when accessing a lazy-loaded collection/entity outside an active transaction.

**Solutions**:

1. **Add @Transactional** (keep transaction open):
```java
@Transactional(readOnly = true)
public List<String> getCustomerInvoiceNumbers(Long id) {
    Customer customer = customerRepository.findById(id).orElseThrow();
    return customer.getInvoices().stream()
        .map(Invoice::getNumber)
        .collect(Collectors.toList());
}
```

2. **Use JOIN FETCH** (load eagerly):
```java
@Query("SELECT c FROM Customer c JOIN FETCH c.invoices WHERE c.id = :id")
Optional<Customer> findByIdWithInvoices(@Param("id") Long id);
```

3. **Use @EntityGraph**:
```java
@EntityGraph(attributePaths = {"invoices"})
Optional<Customer> findById(Long id);
```

4. **Initialize in transaction**:
```java
@Transactional(readOnly = true)
public Customer getCustomer(Long id) {
    Customer customer = customerRepository.findById(id).orElseThrow();
    customer.getInvoices().size();  // Force initialization
    return customer;
}
```

### Q6: What's the difference between save() and persist()?

**Answer**:

**save()** (Spring Data JPA):
- Calls `persist()` if entity is new (no ID)
- Calls `merge()` if entity has ID
- Returns the saved entity
- Can work with detached entities

**persist()** (JPA EntityManager):
- Only for new entities
- Throws exception if entity already has ID
- Makes entity managed
- Returns void

**Example**:
```java
// save() - works for both new and existing
Customer customer = new Customer();
customer = customerRepository.save(customer);  // persist()

customer.setName("Updated");
customer = customerRepository.save(customer);  // merge()

// persist() - only for new entities
Customer customer = new Customer();
entityManager.persist(customer);  // OK

customer.setId(999L);
entityManager.persist(customer);  // EXCEPTION!
```

**Recommendation**: Use `save()` in repositories (more flexible).

### Q7: How do you test JPA repositories?

**Answer**:

**Three approaches**:

1. **@DataJpaTest** (Slice test):
```java
@DataJpaTest
public class CustomerRepositoryTest {
    @Autowired
    private CustomerRepository repository;

    @Test
    public void testFindByEmail() {
        Customer customer = new Customer("John", "john@example.com");
        repository.save(customer);

        Optional<Customer> found = repository.findByEmail("john@example.com");
        assertThat(found).isPresent();
    }
}
```

2. **@SpringBootTest** (Full integration):
```java
@SpringBootTest
@Transactional
public class CustomerServiceIntegrationTest {
    @Autowired
    private CustomerService service;

    @Test
    public void testCreateCustomer() {
        Customer customer = service.createCustomer("John", "john@example.com");
        assertThat(customer.getId()).isNotNull();
    }
}
```

3. **Unit test with mocks** (Fast):
```java
public class CustomerServiceTest {
    @Mock
    private CustomerRepository repository;

    @InjectMocks
    private CustomerService service;

    @Test
    public void testGetCustomer() {
        Customer customer = new Customer("John", "john@example.com");
        when(repository.findById(1L)).thenReturn(Optional.of(customer));

        Customer result = service.getCustomer(1L);
        assertThat(result).isEqualTo(customer);
    }
}
```

**Use**:
- Unit tests: Business logic validation (fast)
- @DataJpaTest: Repository/query validation
- @SpringBootTest: Full integration validation

### Q8: What causes StackOverflowError when returning entities from REST API?

**Answer**:

**Cause**: Bidirectional relationship creates infinite loop during JSON serialization.

**Example**:
```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    private List<Invoice> invoices;
}

@Entity
public class Invoice {
    @ManyToOne
    private Customer customer;
}

// Controller
@GetMapping("/customers/{id}")
public Customer getCustomer(@PathVariable Long id) {
    return customerRepository.findById(id).orElseThrow();
}

// JSON: customer → invoices → customer → invoices → ... (infinite)
```

**Solutions**:

1. **@JsonManagedReference / @JsonBackReference**:
```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    @JsonManagedReference
    private List<Invoice> invoices;
}

@Entity
public class Invoice {
    @ManyToOne
    @JsonBackReference  // Excluded from JSON
    private Customer customer;
}
```

2. **@JsonIgnore**:
```java
@Entity
public class Invoice {
    @ManyToOne
    @JsonIgnore  // Don't serialize customer
    private Customer customer;
}
```

3. **DTOs** (Best):
```java
@GetMapping("/customers/{id}")
public CustomerDTO getCustomer(@PathVariable Long id) {
    Customer customer = customerRepository.findById(id).orElseThrow();
    return CustomerDTO.from(customer);  // Map to DTO
}
```

**Recommendation**: Always use DTOs for REST APIs (avoids JSON issues, controls API contract).

---

## Summary

**Key Takeaways**:

1. **N+1 Problem**: Use JOIN FETCH or @EntityGraph to avoid
2. **Transactions**: Use @Transactional on service layer
3. **Locking**: Optimistic (low contention) vs Pessimistic (high contention)
4. **Batching**: Configure batch_size, use SEQUENCE for IDs
5. **Pagination**: Use @EntityGraph (works with pagination), not JOIN FETCH
6. **Indexes**: Add on foreign keys and frequently queried columns
7. **Connection Pooling**: Size appropriately (10-20 for most apps)
8. **Migrations**: Use Flyway or Liquibase for schema versioning
9. **Testing**: @DataJpaTest for repositories, TestContainers for integration
10. **DTOs**: Always use for REST APIs (avoid JSON circular references)

**Remember**: Performance problems in JPA usually come from:
- N+1 queries (most common)
- Missing indexes
- Loading too much data
- Not using transactions properly
- Wrong fetch type (EAGER when should be LAZY)

**Production Rule**: If it works locally but slow in production, check query count first!

---

## Navigation

**Previous:**
- [Entity Relationships](./04-relationships.md) - Mapping relationships in JPA

**Related:**
- [JPA Basics](./01-jpa-basics.md) - Entity fundamentals
- [Repository Pattern](./02-repositories.md) - Data access layer
- [Query Methods](./03-queries.md) - Custom queries

**Resources:**
- [Hibernate Performance Tuning](https://vladmihalcea.com/tutorials/hibernate/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
- [Baeldung JPA Tutorials](https://www.baeldung.com/learn-jpa-hibernate)

---

**Module Index:** [Spring Data JPA Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)

---

**Congratulations!** You've completed Spring Data JPA. You now understand entities, repositories, queries, relationships, and best practices for production-ready applications.
