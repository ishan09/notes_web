# JPA Basics

> **Before you start**: Do you understand SQL basics (SELECT, INSERT, UPDATE, DELETE)? Can you explain what a primary key is?

## What is JPA (Java Persistence API)?

Imagine you're managing a library:

**Traditional JDBC way**:
- Manually write SQL for every book operation
- Convert result sets to Book objects line by line
- Handle database connections, statements, error handling
- Write 50+ lines for simple operations
- **Problem**: Repetitive, error-prone, tedious!

**JPA way**:
- Define Book as a Java class with annotations
- JPA automatically converts objects to database rows
- Just say "save this book" - JPA handles the SQL
- Write 5 lines instead of 50
- **Result**: Focus on business logic, not database plumbing!

**In programming**: JPA is a specification that allows you to map Java objects to database tables and handle persistence automatically.

**Real-world analogy**:
```java
// JDBC: You do EVERYTHING manually
Connection conn = DriverManager.getConnection(url);
PreparedStatement stmt = conn.prepareStatement(
    "INSERT INTO books (id, title, author, price) VALUES (?, ?, ?, ?)");
stmt.setLong(1, book.getId());
stmt.setString(2, book.getTitle());
stmt.setString(3, book.getAuthor());
stmt.setBigDecimal(4, book.getPrice());
stmt.executeUpdate();
stmt.close();
conn.close();
// Plus error handling, transactions, result mapping...

// JPA: Framework handles the details
entityManager.persist(book);  // That's it!
```

**Stop and think**: Why would automatic object-to-database mapping save you time?

---

## Why This Matters

**You'll use JPA when**:
- Building any database-driven application (90% of enterprise apps)
- You want database independence (switch from MySQL to PostgreSQL easily)
- You need to avoid SQL injection vulnerabilities
- You want to focus on objects, not SQL statements
- Working with complex object relationships

**Interview context**:
- #1 question: "What is ORM and JPA?"
- Expected to explain: entity mapping, persistence context, entity lifecycle
- Often asked: "What's the difference between JPA and Hibernate?"

---

## What is ORM (Object-Relational Mapping)?

**The Problem**: Impedance mismatch

**Java World** (Object-Oriented):
```java
class Customer {
    Long id;
    String name;
    List<Invoice> invoices;  // Customer HAS invoices
}

class Invoice {
    Long id;
    Customer customer;       // Invoice belongs to Customer
    BigDecimal total;
}
```

**Database World** (Relational):
```sql
CREATE TABLE customers (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE invoices (
    id BIGINT PRIMARY KEY,
    customer_id BIGINT,      -- Foreign key reference
    total DECIMAL(10,2),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**ORM bridges the gap**: Automatically maps objects ↔ tables

| Java Concept | Database Concept | ORM Handles |
|--------------|------------------|-------------|
| Class | Table | `@Entity`, `@Table` |
| Object | Row | `entityManager.persist()` |
| Field | Column | `@Column` |
| Reference | Foreign Key | `@ManyToOne`, `@OneToMany` |
| Collection | JOIN | `@OneToMany`, `@ManyToMany` |
| Inheritance | Table strategies | `@Inheritance` |

**Compare**: Without ORM, you manually write SQL and convert ResultSets. With ORM, you work with Java objects naturally.

---

## JPA vs Hibernate - What's the Difference?

**JPA is a specification** (interface/contract):
- Defines how Java objects should be persisted
- Just rules and annotations (`@Entity`, `@Id`, etc.)
- Cannot be used alone - needs an implementation

**Hibernate is an implementation** (concrete framework):
- Implements the JPA specification
- Provides actual code that does the work
- Most popular JPA implementation (95% market share)
- Also has features beyond JPA (Hibernate-specific)

**Analogy**:
```
JPA = Blueprint for a house
Hibernate = Actual house built from blueprint

Other implementations:
- EclipseLink (Oracle's reference implementation)
- OpenJPA (Apache)
```

**In Spring Boot**:
```xml
<!-- You add this dependency -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Spring Boot automatically includes Hibernate as JPA implementation -->
```

**Key point**: You write code using JPA annotations, but Hibernate does the actual work behind the scenes.

---

## Core JPA Annotations

### @Entity - Mark Class as JPA Entity

Tells JPA: "This class represents a database table"

```java
@Entity  // This class is mapped to a database table
public class Customer {
    // Fields map to columns
    private Long id;
    private String name;
    private String email;
}
```

**What happens**:
- JPA creates (or expects) a table named `customer` (lowercase class name)
- Each instance = one row in the table
- Each field = one column

### @Table - Customize Table Details

```java
@Entity
@Table(name = "customers")  // Explicit table name
public class Customer {
    // ...
}
```

**Additional options**:
```java
@Entity
@Table(
    name = "customers",
    schema = "invoice_schema",  // Database schema
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"email"})  // Unique email
    },
    indexes = {
        @Index(name = "idx_customer_name", columnList = "name")  // Index on name
    }
)
public class Customer {
    // ...
}
```

### @Id - Primary Key

Every entity MUST have a primary key.

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id  // Primary key field
    private Long id;

    private String name;
    private String email;
}
```

**Database equivalent**:
```sql
CREATE TABLE customers (
    id BIGINT PRIMARY KEY,  -- @Id
    name VARCHAR(255),
    email VARCHAR(255)
);
```

### @GeneratedValue - Auto-Generate IDs

Don't want to manually set IDs? Let the database generate them.

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Auto-increment
    private Long id;

    private String name;
    private String email;
}
```

**Four generation strategies**:

| Strategy | How it Works | When to Use | Database |
|----------|-------------|-------------|----------|
| **IDENTITY** | Database auto-increment | Simple apps, single inserts | MySQL, PostgreSQL |
| **SEQUENCE** | Database sequence | Better performance, batch inserts | PostgreSQL, Oracle |
| **TABLE** | Dedicated ID table | Database-independent (slow) | Any |
| **AUTO** | JPA chooses based on DB | Let framework decide | Any |

**Example - IDENTITY** (most common):
```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```

**Database equivalent**:
```sql
-- MySQL
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ...
);

-- PostgreSQL
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    ...
);
```

**Example - SEQUENCE** (better for batch inserts):
```java
@Id
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "customer_seq")
@SequenceGenerator(name = "customer_seq", sequenceName = "customer_id_seq", allocationSize = 50)
private Long id;
```

**Try it**: Why would SEQUENCE be better for inserting 1000 customers at once?

<details>
<summary>Hint</summary>
IDENTITY requires database round-trip for each insert to get the generated ID. SEQUENCE can pre-allocate 50 IDs at once, reducing database calls.
</details>

### @Column - Customize Column Mapping

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false, length = 150)
    private String email;

    @Column(precision = 10, scale = 2)  // For BigDecimal
    private BigDecimal creditLimit;

    @Column(columnDefinition = "TEXT")  // Custom SQL type
    private String notes;
}
```

**Common @Column attributes**:

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `name` | Database column name | `@Column(name = "customer_name")` |
| `nullable` | Can be NULL? | `@Column(nullable = false)` |
| `unique` | Unique constraint | `@Column(unique = true)` |
| `length` | VARCHAR length | `@Column(length = 100)` |
| `precision` | Total digits (BigDecimal) | `@Column(precision = 10, scale = 2)` |
| `scale` | Decimal places | For $12345.67: precision=7, scale=2 |
| `columnDefinition` | Custom SQL type | `@Column(columnDefinition = "TEXT")` |

**Database equivalent**:
```sql
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    credit_limit DECIMAL(10, 2),
    notes TEXT
);
```

---

## Complete Entity Example: Invoice

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", unique = true, nullable = false, length = 20)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    @Column(length = 20, nullable = false)
    @Enumerated(EnumType.STRING)  // Store enum as string
    private InvoiceStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Invoice() {
        // JPA requires no-arg constructor
    }

    public Invoice(String invoiceNumber, LocalDate invoiceDate, BigDecimal total) {
        this.invoiceNumber = invoiceNumber;
        this.invoiceDate = invoiceDate;
        this.total = total;
        this.status = InvoiceStatus.DRAFT;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    // ... other getters/setters

    // Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = InvoiceStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // equals() and hashCode() - use business key, not ID
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Invoice)) return false;
        Invoice invoice = (Invoice) o;
        return Objects.equals(invoiceNumber, invoice.invoiceNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(invoiceNumber);
    }

    @Override
    public String toString() {
        return "Invoice{" +
            "id=" + id +
            ", invoiceNumber='" + invoiceNumber + '\'' +
            ", total=" + total +
            ", status=" + status +
            '}';
    }
}
```

**Enum for status**:
```java
public enum InvoiceStatus {
    DRAFT,
    SENT,
    PAID,
    OVERDUE,
    CANCELLED
}
```

**Database table created**:
```sql
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
```

---

## EntityManager - The JPA Heart

**EntityManager** is the main JPA interface for interacting with the database.

**Think of it as**: A manager that handles all database operations for entities.

**Core operations**:
```java
// Create/Update
entityManager.persist(entity);    // Insert new
entityManager.merge(entity);      // Update existing

// Read
entityManager.find(Entity.class, id);    // Find by primary key
entityManager.createQuery("...");        // Query with JPQL

// Delete
entityManager.remove(entity);

// Transaction management
entityManager.getTransaction().begin();
// ... operations ...
entityManager.getTransaction().commit();
```

**Example - Using EntityManager directly**:
```java
@Component
public class InvoiceDAO {
    @PersistenceContext  // Spring injects EntityManager
    private EntityManager entityManager;

    @Transactional
    public Invoice createInvoice(Invoice invoice) {
        entityManager.persist(invoice);  // Save to database
        return invoice;  // Now has generated ID
    }

    public Invoice findById(Long id) {
        return entityManager.find(Invoice.class, id);
    }

    public List<Invoice> findAll() {
        return entityManager
            .createQuery("SELECT i FROM Invoice i", Invoice.class)
            .getResultList();
    }

    @Transactional
    public Invoice updateInvoice(Invoice invoice) {
        return entityManager.merge(invoice);
    }

    @Transactional
    public void deleteInvoice(Long id) {
        Invoice invoice = entityManager.find(Invoice.class, id);
        if (invoice != null) {
            entityManager.remove(invoice);
        }
    }
}
```

**Note**: In practice, you'll rarely use EntityManager directly. Spring Data JPA repositories (covered in next chapter) provide a better abstraction.

---

## The Persistence Context

**Most important JPA concept!**

**Persistence Context** = A cache of managed entities within a transaction.

**Think of it as**: A staging area where entities are tracked before being saved to the database.

**Visual representation**:
```
┌──────────────────────────────────────────────────┐
│                Your Application                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │      Persistence Context (Cache)        │     │
│  │                                          │     │
│  │  Customer#1 (managed) ─ changes tracked │     │
│  │  Invoice#5  (managed) ─ changes tracked │     │
│  │  Product#3  (managed) ─ changes tracked │     │
│  │                                          │     │
│  │  On commit/flush → SQL generated        │     │
│  └────────────────────────────────────────┘     │
│                     ↕                             │
│               EntityManager                       │
│                     ↕                             │
├──────────────────────────────────────────────────┤
│                  Database                         │
│   customers table, invoices table, etc.          │
└──────────────────────────────────────────────────┘
```

**Entity states**:

| State | Description | In Persistence Context? | In Database? |
|-------|-------------|------------------------|--------------|
| **Transient** | New entity, never saved | No | No |
| **Managed** | Entity tracked by EntityManager | Yes | Maybe |
| **Detached** | Was managed, but context closed | No | Yes |
| **Removed** | Marked for deletion | Yes (marked) | Yes (until commit) |

**Example showing all states**:
```java
@Transactional
public void demonstrateEntityStates() {
    // 1. TRANSIENT - new entity, JPA doesn't know about it
    Invoice invoice = new Invoice("INV-001", LocalDate.now(), BigDecimal.valueOf(1000));
    // Not in persistence context, not in database

    // 2. MANAGED - after persist()
    entityManager.persist(invoice);
    // Now in persistence context, tracked for changes
    // Not yet in database (waiting for flush/commit)

    invoice.setTotal(BigDecimal.valueOf(1500));  // Change tracked!
    // No need to call update() - JPA sees the change

    // 3. Flush/commit - changes written to database
    entityManager.flush();  // Or happens automatically on commit
    // UPDATE SQL executed because JPA detected change

    // 4. DETACHED - after transaction ends
    entityManager.clear();  // Clear persistence context
    // invoice is now detached - changes no longer tracked

    invoice.setTotal(BigDecimal.valueOf(2000));  // JPA doesn't see this change!

    // 5. MANAGED again - merge() brings detached entity back
    Invoice managedInvoice = entityManager.merge(invoice);
    // Now changes are tracked again

    // 6. REMOVED - marked for deletion
    entityManager.remove(managedInvoice);
    // Marked for deletion, DELETE will execute on commit
}
```

**Why this matters**:
```java
@Transactional
public void updateInvoiceTotal(Long invoiceId, BigDecimal newTotal) {
    Invoice invoice = entityManager.find(Invoice.class, invoiceId);  // MANAGED

    invoice.setTotal(newTotal);  // Just change the object!

    // NO need for entityManager.update(invoice)
    // JPA automatically detects changes and updates database on commit
}
```

**Key insight**: Changes to managed entities are automatically persisted. This is called **automatic dirty checking**.

---

## Simple CRUD Operations with EntityManager

### Create (Insert)

```java
@Transactional
public Invoice createInvoice(String invoiceNumber, LocalDate date, BigDecimal total) {
    Invoice invoice = new Invoice();
    invoice.setInvoiceNumber(invoiceNumber);
    invoice.setInvoiceDate(date);
    invoice.setTotal(total);
    invoice.setStatus(InvoiceStatus.DRAFT);

    entityManager.persist(invoice);  // INSERT SQL

    return invoice;  // Now has generated ID
}
```

**Generated SQL**:
```sql
INSERT INTO invoices (invoice_number, invoice_date, total, status, created_at)
VALUES ('INV-001', '2024-01-15', 1000.00, 'DRAFT', '2024-01-15 10:30:00');
```

### Read (Select)

**Find by ID**:
```java
public Invoice findInvoiceById(Long id) {
    Invoice invoice = entityManager.find(Invoice.class, id);
    if (invoice == null) {
        throw new EntityNotFoundException("Invoice not found: " + id);
    }
    return invoice;
}
```

**Find all with JPQL**:
```java
public List<Invoice> findAllInvoices() {
    return entityManager
        .createQuery("SELECT i FROM Invoice i", Invoice.class)
        .getResultList();
}
```

**Find with condition**:
```java
public List<Invoice> findInvoicesByStatus(InvoiceStatus status) {
    return entityManager
        .createQuery("SELECT i FROM Invoice i WHERE i.status = :status", Invoice.class)
        .setParameter("status", status)
        .getResultList();
}
```

### Update (Modify)

**Option 1: Update managed entity** (preferred):
```java
@Transactional
public Invoice updateInvoiceTotal(Long id, BigDecimal newTotal) {
    Invoice invoice = entityManager.find(Invoice.class, id);  // Managed

    invoice.setTotal(newTotal);  // Change tracked automatically

    return invoice;  // UPDATE SQL on commit
}
```

**Option 2: Merge detached entity**:
```java
@Transactional
public Invoice updateInvoice(Invoice detachedInvoice) {
    return entityManager.merge(detachedInvoice);  // Merge changes to database
}
```

**Generated SQL**:
```sql
UPDATE invoices
SET total = 1500.00, updated_at = '2024-01-15 11:00:00'
WHERE id = 1;
```

### Delete (Remove)

```java
@Transactional
public void deleteInvoice(Long id) {
    Invoice invoice = entityManager.find(Invoice.class, id);

    if (invoice != null) {
        entityManager.remove(invoice);  // DELETE SQL on commit
    }
}
```

**Generated SQL**:
```sql
DELETE FROM invoices WHERE id = 1;
```

---

## Practical Example: InvoiceManager DAO

**Entity classes**:

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(length = 15)
    private String phone;

    // Constructors, getters, setters
    public Customer() {}

    public Customer(String name, String email) {
        this.name = name;
        this.email = email;
    }

    // Standard getters/setters...
}
```

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", unique = true, nullable = false)
    private String invoiceNumber;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;  // Simple foreign key (no relationship yet)

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status;

    // Constructors, getters, setters
    public Invoice() {}

    public Invoice(String invoiceNumber, Long customerId, LocalDate invoiceDate, BigDecimal total) {
        this.invoiceNumber = invoiceNumber;
        this.customerId = customerId;
        this.invoiceDate = invoiceDate;
        this.total = total;
        this.status = InvoiceStatus.DRAFT;
    }

    // Standard getters/setters...
}
```

**DAO layer** (Data Access Object):

```java
@Component
public class CustomerDAO {
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Customer save(Customer customer) {
        if (customer.getId() == null) {
            entityManager.persist(customer);
            return customer;
        } else {
            return entityManager.merge(customer);
        }
    }

    public Customer findById(Long id) {
        return entityManager.find(Customer.class, id);
    }

    public List<Customer> findAll() {
        return entityManager
            .createQuery("SELECT c FROM Customer c ORDER BY c.name", Customer.class)
            .getResultList();
    }

    public Customer findByEmail(String email) {
        List<Customer> results = entityManager
            .createQuery("SELECT c FROM Customer c WHERE c.email = :email", Customer.class)
            .setParameter("email", email)
            .getResultList();

        return results.isEmpty() ? null : results.get(0);
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = entityManager.find(Customer.class, id);
        if (customer != null) {
            entityManager.remove(customer);
        }
    }
}
```

```java
@Component
public class InvoiceDAO {
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Invoice save(Invoice invoice) {
        if (invoice.getId() == null) {
            entityManager.persist(invoice);
            return invoice;
        } else {
            return entityManager.merge(invoice);
        }
    }

    public Invoice findById(Long id) {
        return entityManager.find(Invoice.class, id);
    }

    public List<Invoice> findAll() {
        return entityManager
            .createQuery("SELECT i FROM Invoice i ORDER BY i.invoiceDate DESC", Invoice.class)
            .getResultList();
    }

    public List<Invoice> findByCustomerId(Long customerId) {
        return entityManager
            .createQuery("SELECT i FROM Invoice i WHERE i.customerId = :customerId ORDER BY i.invoiceDate DESC", Invoice.class)
            .setParameter("customerId", customerId)
            .getResultList();
    }

    public List<Invoice> findByStatus(InvoiceStatus status) {
        return entityManager
            .createQuery("SELECT i FROM Invoice i WHERE i.status = :status", Invoice.class)
            .setParameter("status", status)
            .getResultList();
    }

    public BigDecimal getTotalRevenue() {
        return entityManager
            .createQuery("SELECT SUM(i.total) FROM Invoice i WHERE i.status = :status", BigDecimal.class)
            .setParameter("status", InvoiceStatus.PAID)
            .getSingleResult();
    }

    @Transactional
    public void delete(Long id) {
        Invoice invoice = entityManager.find(Invoice.class, id);
        if (invoice != null) {
            entityManager.remove(invoice);
        }
    }
}
```

**Service layer** (uses DAOs):

```java
@Service
public class InvoiceService {
    private final InvoiceDAO invoiceDAO;
    private final CustomerDAO customerDAO;

    public InvoiceService(InvoiceDAO invoiceDAO, CustomerDAO customerDAO) {
        this.invoiceDAO = invoiceDAO;
        this.customerDAO = customerDAO;
    }

    @Transactional
    public Invoice createInvoice(Long customerId, BigDecimal total) {
        // Verify customer exists
        Customer customer = customerDAO.findById(customerId);
        if (customer == null) {
            throw new IllegalArgumentException("Customer not found: " + customerId);
        }

        // Generate invoice number
        String invoiceNumber = generateInvoiceNumber();

        // Create invoice
        Invoice invoice = new Invoice(invoiceNumber, customerId, LocalDate.now(), total);
        return invoiceDAO.save(invoice);
    }

    public List<Invoice> getCustomerInvoices(Long customerId) {
        return invoiceDAO.findByCustomerId(customerId);
    }

    public BigDecimal getTotalRevenue() {
        return invoiceDAO.getTotalRevenue();
    }

    @Transactional
    public Invoice markAsPaid(Long invoiceId) {
        Invoice invoice = invoiceDAO.findById(invoiceId);
        if (invoice == null) {
            throw new IllegalArgumentException("Invoice not found: " + invoiceId);
        }

        invoice.setStatus(InvoiceStatus.PAID);
        return invoice;  // Automatic dirty checking updates database
    }

    private String generateInvoiceNumber() {
        return "INV-" + System.currentTimeMillis();
    }
}
```

**Usage example**:

```java
@Component
public class InvoiceManagerDemo implements CommandLineRunner {
    private final InvoiceService invoiceService;
    private final CustomerDAO customerDAO;

    public InvoiceManagerDemo(InvoiceService invoiceService, CustomerDAO customerDAO) {
        this.invoiceService = invoiceService;
        this.customerDAO = customerDAO;
    }

    @Override
    public void run(String... args) {
        // Create customer
        Customer customer = new Customer("Acme Corp", "billing@acme.com");
        customer.setPhone("555-1234");
        customer = customerDAO.save(customer);
        System.out.println("Created customer: " + customer.getId());

        // Create invoices
        Invoice inv1 = invoiceService.createInvoice(customer.getId(), BigDecimal.valueOf(1000));
        Invoice inv2 = invoiceService.createInvoice(customer.getId(), BigDecimal.valueOf(2500));
        System.out.println("Created invoices: " + inv1.getInvoiceNumber() + ", " + inv2.getInvoiceNumber());

        // Mark one as paid
        invoiceService.markAsPaid(inv1.getId());

        // Get customer's invoices
        List<Invoice> invoices = invoiceService.getCustomerInvoices(customer.getId());
        System.out.println("Customer has " + invoices.size() + " invoices");

        // Get total revenue
        BigDecimal revenue = invoiceService.getTotalRevenue();
        System.out.println("Total revenue: $" + revenue);
    }
}
```

---

## Common Mistakes

❌ **Mistake 1**: Forgetting no-arg constructor
```java
@Entity
public class Invoice {
    @Id
    private Long id;

    // Only parameterized constructor
    public Invoice(Long id, BigDecimal total) {
        this.id = id;
        this.total = total;
    }
    // JPA error: No default constructor!
}
```
✅ **Fix**: Always add no-arg constructor
```java
@Entity
public class Invoice {
    @Id
    private Long id;

    public Invoice() {
        // JPA requires this
    }

    public Invoice(Long id, BigDecimal total) {
        this.id = id;
        this.total = total;
    }
}
```

❌ **Mistake 2**: Using equals/hashCode with ID field
```java
@Entity
public class Invoice {
    @Id
    @GeneratedValue
    private Long id;

    @Override
    public boolean equals(Object o) {
        Invoice that = (Invoice) o;
        return Objects.equals(id, that.id);  // Problem: id is null before persist!
    }
}
```
✅ **Fix**: Use business key
```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Invoice)) return false;
    Invoice invoice = (Invoice) o;
    return Objects.equals(invoiceNumber, invoice.invoiceNumber);  // Use unique business key
}
```

❌ **Mistake 3**: Modifying detached entity
```java
public void updateInvoice(Long id) {
    Invoice invoice = entityManager.find(Invoice.class, id);
    // Transaction ends, invoice becomes detached

    invoice.setTotal(BigDecimal.valueOf(2000));  // Change not saved!
}
```
✅ **Fix**: Modify within transaction
```java
@Transactional
public void updateInvoice(Long id) {
    Invoice invoice = entityManager.find(Invoice.class, id);
    invoice.setTotal(BigDecimal.valueOf(2000));  // Saved on commit
}
```

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** is the difference between JPA and Hibernate?
2. **Why** does every entity need a no-arg constructor?
3. **When** would you use `GenerationType.SEQUENCE` instead of `IDENTITY`?
4. **How** does JPA know to update the database when you change a field?
5. **Compare**: What's the difference between `persist()` and `merge()`?

---

## Practice Exercises

### Level 1 - Create Your First Entity

Create a `Product` entity with:
- Auto-generated ID
- Name (required, max 100 chars)
- Price (BigDecimal, 2 decimal places)
- SKU (unique, required)
- Description (optional, text)

<details>
<summary>Solution</summary>

```java
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(unique = true, nullable = false, length = 50)
    private String sku;

    @Column(columnDefinition = "TEXT")
    private String description;

    // No-arg constructor
    public Product() {}

    // Convenience constructor
    public Product(String name, BigDecimal price, String sku) {
        this.name = name;
        this.price = price;
        this.sku = sku;
    }

    // Getters and setters...
}
```
</details>

### Level 2 - CRUD Operations

Write a ProductDAO with methods:
- `save(Product)` - insert or update
- `findById(Long)` - find by ID
- `findAll()` - get all products
- `findBySku(String)` - find by SKU
- `delete(Long)` - delete by ID

<details>
<summary>Solution</summary>

```java
@Component
public class ProductDAO {
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Product save(Product product) {
        if (product.getId() == null) {
            entityManager.persist(product);
            return product;
        } else {
            return entityManager.merge(product);
        }
    }

    public Product findById(Long id) {
        return entityManager.find(Product.class, id);
    }

    public List<Product> findAll() {
        return entityManager
            .createQuery("SELECT p FROM Product p ORDER BY p.name", Product.class)
            .getResultList();
    }

    public Product findBySku(String sku) {
        List<Product> results = entityManager
            .createQuery("SELECT p FROM Product p WHERE p.sku = :sku", Product.class)
            .setParameter("sku", sku)
            .getResultList();
        return results.isEmpty() ? null : results.get(0);
    }

    @Transactional
    public void delete(Long id) {
        Product product = entityManager.find(Product.class, id);
        if (product != null) {
            entityManager.remove(product);
        }
    }
}
```
</details>

### Level 3 - Understanding Persistence Context

What will be the value of `total` after this code runs?

```java
@Transactional
public void mysteryMethod() {
    Invoice invoice = new Invoice("INV-001", 1L, LocalDate.now(), BigDecimal.valueOf(1000));
    entityManager.persist(invoice);  // Line 1

    invoice.setTotal(BigDecimal.valueOf(2000));  // Line 2

    entityManager.flush();  // Line 3

    invoice.setTotal(BigDecimal.valueOf(3000));  // Line 4

    // Transaction commits here
}

// What's in database after commit?
```

<details>
<summary>Answer</summary>

**$3000** - All changes to managed entities are tracked. Line 2 and Line 4 both modify the managed entity. On transaction commit, the final state ($3000) is persisted.
</details>

---

## Visual Diagrams

### Entity Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│   new Invoice()                                      │
│        ↓                                             │
│   [TRANSIENT]                                        │
│   - Not in persistence context                       │
│   - Not in database                                  │
│        ↓                                             │
│   entityManager.persist(invoice)                     │
│        ↓                                             │
│   [MANAGED]                                          │
│   - In persistence context                           │
│   - Changes tracked automatically                    │
│   - UPDATE SQL on commit if modified                 │
│        ↓                                             │
│   Transaction commits / context closes               │
│        ↓                                             │
│   [DETACHED]                                         │
│   - Not in persistence context                       │
│   - In database                                      │
│   - Changes NOT tracked                              │
│        ↓                                             │
│   entityManager.merge(invoice)                       │
│        ↓                                             │
│   [MANAGED] again                                    │
│                                                      │
│   Alternative: entityManager.remove(invoice)         │
│        ↓                                             │
│   [REMOVED]                                          │
│   - Marked for deletion                              │
│   - DELETE SQL on commit                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### JPA Architecture Layers

```
┌─────────────────────────────────────────────────┐
│         Application Code (Your Code)            │
│  - Services, Controllers, Business Logic        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         JPA API (@Entity, EntityManager)        │
│  - Standard annotations and interfaces          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│      JPA Implementation (Hibernate)             │
│  - Actual ORM engine                            │
│  - SQL generation                               │
│  - Persistence context management               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         JDBC (Database Driver)                  │
│  - Low-level database communication             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│        Database (PostgreSQL, MySQL)             │
│  - Actual data storage                          │
└─────────────────────────────────────────────────┘
```

---

## Summary

**In 3 sentences**:
- JPA is a specification for mapping Java objects to database tables using annotations like @Entity, @Id, and @Column.
- EntityManager manages the persistence context, automatically tracking changes to managed entities and generating SQL.
- You can perform CRUD operations simply by calling persist(), find(), merge(), and remove() - no manual SQL required.

**Key takeaway**: **Object-Relational Mapping eliminates boilerplate** - focus on your domain objects, let JPA handle the database complexity.

---

## Navigation

**Prerequisites**:
- [SQL Basics](../../../02-databases/01-sql-fundamentals.md) - SELECT, INSERT, UPDATE, DELETE
- [Spring Core](../spring-core/01-ioc-and-di.md) - IoC, DI, Bean Management

**Next Topics**:
- [Repository Pattern](./02-repository-pattern.md) - Spring Data repositories eliminate even more boilerplate
- [Query Methods](./03-query-methods.md) - Derive queries from method names, @Query annotation

**Related**:
- [Entity Relationships](./04-relationships.md) - @OneToMany, @ManyToOne, @ManyToMany
- [Transactions](../spring-boot/04-transactions.md) - @Transactional deep dive

**Module Index**: [Spring Data JPA Guide](./README.md) | **Main Index**: [Learning Roadmap](../../../README.md)
