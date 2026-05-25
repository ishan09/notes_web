# Repository Pattern with Spring Data JPA

> **Before you start**: Have you read [JPA Basics](./01-jpa-basics.md)? Do you understand what an entity and EntityManager are?

## What is the Repository Pattern?

Imagine organizing a library:

**Without Repository Pattern**:
- Librarians directly access shelves, cards, computers
- Different librarians use different methods to find books
- Mix of SQL queries scattered everywhere
- Hard to change how books are stored
- **Problem**: Messy, inconsistent, tightly coupled!

**With Repository Pattern**:
- One central "Book Repository" handles all book operations
- All librarians use the same interface: "get book by ID", "find books by author"
- Storage details hidden (database, files, cloud - doesn't matter)
- Easy to change storage mechanism
- **Result**: Clean, consistent, loosely coupled!

**In programming**: Repository Pattern provides a collection-like interface for accessing domain objects, hiding database complexity.

**Real-world analogy**:
```java
// Without repository - database details everywhere
@Service
public class InvoiceService {
    @PersistenceContext
    private EntityManager em;  // Database detail leaked!

    public Invoice getInvoice(Long id) {
        return em.find(Invoice.class, id);  // SQL knowledge required
    }

    public List<Invoice> getAllInvoices() {
        return em.createQuery("SELECT i FROM Invoice i", Invoice.class)
                 .getResultList();  // JPQL everywhere
    }
}

// With repository - clean abstraction
@Service
public class InvoiceService {
    private final InvoiceRepository repository;  // Clean interface!

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public Invoice getInvoice(Long id) {
        return repository.findById(id).orElseThrow();  // Simple!
    }

    public List<Invoice> getAllInvoices() {
        return repository.findAll();  // No SQL!
    }
}
```

**Stop and think**: Why is it better to hide database details behind a repository interface?

<details>
<summary>Hint</summary>
You can switch from database to file storage or cloud storage without changing service code. Also easier to test - just mock the repository interface.
</details>

---

## Why This Matters

**You'll use repositories when**:
- Building any Spring Boot application (99% of projects)
- You want to eliminate boilerplate DAO code
- You need consistent data access across your app
- Testing services (mock repositories easily)
- Want database independence

**Interview context**:
- Common question: "What is Repository pattern in Spring Data JPA?"
- Expected to explain: Repository hierarchy, built-in methods, custom queries
- Often asked: "Difference between CrudRepository and JpaRepository?"

---

## Spring Data Repository Hierarchy

```
Repository<T, ID>                    (Marker interface - no methods)
        ↑
        │
CrudRepository<T, ID>               (Basic CRUD: save, findById, delete)
        ↑
        │
PagingAndSortingRepository<T, ID>   (+ pagination and sorting)
        ↑
        │
JpaRepository<T, ID>                (+ JPA specific: flush, batch operations)
```

**Visual comparison**:

| Interface | Methods | When to Use |
|-----------|---------|-------------|
| **Repository** | None (marker) | Custom repository from scratch |
| **CrudRepository** | save, findById, findAll, count, delete, existsById | Simple CRUD only |
| **PagingAndSortingRepository** | + findAll(Pageable), findAll(Sort) | Need pagination/sorting |
| **JpaRepository** | + flush, saveAndFlush, deleteInBatch | Most Spring Boot apps (default choice) |

**Key insight**: JpaRepository includes everything from CrudRepository and PagingAndSortingRepository.

---

## Creating Your First Repository

**Step 1: Define Entity** (from previous chapter)

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String invoiceNumber;

    @Column(nullable = false)
    private LocalDate invoiceDate;

    @Column(precision = 10, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    // Constructors, getters, setters...
}
```

**Step 2: Create Repository Interface** (that's it!)

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    // No code needed! Spring Data JPA implements this automatically
}
```

**What you get for free**:
```java
// Save operations
save(invoice)              // Insert or update
saveAll(invoices)          // Batch save
saveAndFlush(invoice)      // Save and immediately flush to database

// Find operations
findById(id)               // Returns Optional<Invoice>
findAll()                  // All invoices
findAllById(ids)           // Multiple by IDs
existsById(id)             // Check if exists
count()                    // Total count

// Delete operations
delete(invoice)            // Delete entity
deleteById(id)             // Delete by ID
deleteAll()                // Delete all
deleteAllInBatch()         // Batch delete (single SQL)

// JPA specific
flush()                    // Force flush to database
getOne(id)                 // Lazy-loaded reference
```

**Compare with manual DAO**: Without Spring Data JPA, you'd write 100+ lines of boilerplate. Now it's 2 lines!

---

## Built-In Methods in Detail

### Save Operations

**save(entity)** - Insert new or update existing

```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Invoice createInvoice(String invoiceNumber, BigDecimal total) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setTotal(total);
        invoice.setStatus(InvoiceStatus.DRAFT);

        return repository.save(invoice);  // INSERT (id is null)
    }

    @Transactional
    public Invoice updateInvoice(Long id, BigDecimal newTotal) {
        Invoice invoice = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Invoice not found"));

        invoice.setTotal(newTotal);

        return repository.save(invoice);  // UPDATE (id exists)
    }
}
```

**How save() decides INSERT vs UPDATE**:
- If `id` is `null` → INSERT
- If `id` exists → SELECT first, then UPDATE (or INSERT if not found)

**saveAll(entities)** - Batch save

```java
@Transactional
public List<Invoice> createBulkInvoices(List<InvoiceDTO> dtos) {
    List<Invoice> invoices = dtos.stream()
        .map(dto -> new Invoice(dto.getNumber(), dto.getDate(), dto.getTotal()))
        .collect(Collectors.toList());

    return repository.saveAll(invoices);  // More efficient than loop with save()
}
```

**saveAndFlush(entity)** - Save and immediately write to database

```java
@Transactional
public Invoice saveAndGetGeneratedId(Invoice invoice) {
    Invoice saved = repository.saveAndFlush(invoice);
    // ID is now available (flushed to database)
    System.out.println("Generated ID: " + saved.getId());
    return saved;
}
```

### Find Operations

**findById(id)** - Find by primary key

```java
public Invoice getInvoice(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id));
}

// Alternative with default value
public Invoice getInvoiceOrDefault(Long id) {
    return repository.findById(id)
        .orElse(new Invoice());  // Return default if not found
}

// Alternative with null check
public Invoice getInvoiceNullable(Long id) {
    return repository.findById(id)
        .orElse(null);  // Return null if not found
}
```

**Why Optional?** Prevents NullPointerException and forces you to handle missing cases.

**findAll()** - Get all entities

```java
public List<Invoice> getAllInvoices() {
    return repository.findAll();
}

// With sorting
public List<Invoice> getAllInvoicesSorted() {
    return repository.findAll(Sort.by(Sort.Direction.DESC, "invoiceDate"));
}

// With pagination
public Page<Invoice> getInvoicesPage(int pageNumber, int pageSize) {
    Pageable pageable = PageRequest.of(pageNumber, pageSize);
    return repository.findAll(pageable);
}
```

**findAllById(ids)** - Find multiple by IDs

```java
public List<Invoice> getInvoicesByIds(List<Long> ids) {
    return repository.findAllById(ids);
    // More efficient than loop with findById()
}
```

**existsById(id)** - Check existence without loading entity

```java
public boolean invoiceExists(Long id) {
    return repository.existsById(id);
    // More efficient than findById() when you just need to check existence
}

public void validateInvoiceExists(Long id) {
    if (!repository.existsById(id)) {
        throw new EntityNotFoundException("Invoice not found: " + id);
    }
}
```

**count()** - Total number of entities

```java
public long getTotalInvoiceCount() {
    return repository.count();
}

public Map<String, Object> getInvoiceStats() {
    Map<String, Object> stats = new HashMap<>();
    stats.put("totalCount", repository.count());
    stats.put("invoices", repository.findAll());
    return stats;
}
```

### Delete Operations

**deleteById(id)** - Delete by primary key

```java
@Transactional
public void deleteInvoice(Long id) {
    if (!repository.existsById(id)) {
        throw new EntityNotFoundException("Invoice not found: " + id);
    }
    repository.deleteById(id);
}
```

**delete(entity)** - Delete entity object

```java
@Transactional
public void cancelInvoice(Long id) {
    Invoice invoice = repository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Invoice not found"));

    // Business logic before delete
    if (invoice.getStatus() == InvoiceStatus.PAID) {
        throw new IllegalStateException("Cannot delete paid invoice");
    }

    repository.delete(invoice);
}
```

**deleteAll()** - Delete all entities

```java
@Transactional
public void deleteAllInvoices() {
    repository.deleteAll();  // BE CAREFUL! Deletes everything
}

// Better: Delete with condition using query method (next chapter)
```

**deleteAllInBatch()** - Batch delete (more efficient)

```java
@Transactional
public void deleteInvoicesBatch(List<Invoice> invoices) {
    repository.deleteAllInBatch(invoices);
    // Single DELETE statement instead of one per entity
}
```

**Difference**: `deleteAll()` loads each entity and deletes one by one. `deleteAllInBatch()` uses single DELETE statement - much faster!

---

## Practical Example: InvoiceManager Repositories

**Entity: Customer**

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

    @Column(length = 200)
    private String address;

    // Constructors, getters, setters
    public Customer() {}

    public Customer(String name, String email) {
        this.name = name;
        this.email = email;
    }

    // Standard getters/setters...
}
```

**Repository: CustomerRepository**

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Built-in methods inherited:
    // - save, findById, findAll, delete, count, etc.

    // We'll add custom methods in next chapter
}
```

**Entity: Product**

```java
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false, length = 50)
    private String sku;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer stockQuantity;

    // Constructors, getters, setters
    public Product() {}

    public Product(String name, String sku, BigDecimal price) {
        this.name = name;
        this.sku = sku;
        this.price = price;
        this.stockQuantity = 0;
    }

    // Standard getters/setters...
}
```

**Repository: ProductRepository**

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Built-in methods inherited
}
```

**Entity: Invoice**

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", unique = true, nullable = false, length = 20)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvoiceStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Constructors, getters, setters
    public Invoice() {}

    public Invoice(String invoiceNumber, Customer customer, LocalDate invoiceDate, BigDecimal total) {
        this.invoiceNumber = invoiceNumber;
        this.customer = customer;
        this.invoiceDate = invoiceDate;
        this.total = total;
        this.status = InvoiceStatus.DRAFT;
        this.dueDate = invoiceDate.plusDays(30);  // Default 30 days
    }

    // Standard getters/setters...
}
```

**Repository: InvoiceRepository**

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    // Built-in methods inherited
}
```

**Service: InvoiceService** (uses repositories)

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository,
                         ProductRepository productRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public Invoice createInvoice(Long customerId, BigDecimal total) {
        // Find customer (using repository)
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new EntityNotFoundException("Customer not found: " + customerId));

        // Generate invoice number
        String invoiceNumber = generateInvoiceNumber();

        // Create invoice
        Invoice invoice = new Invoice(invoiceNumber, customer, LocalDate.now(), total);

        // Save (using repository)
        return invoiceRepository.save(invoice);
    }

    public Invoice getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id));
    }

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public Page<Invoice> getInvoicesPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return invoiceRepository.findAll(pageable);
    }

    @Transactional
    public Invoice updateInvoiceTotal(Long id, BigDecimal newTotal) {
        Invoice invoice = getInvoiceById(id);
        invoice.setTotal(newTotal);
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public void deleteInvoice(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new EntityNotFoundException("Invoice not found: " + id);
        }
        invoiceRepository.deleteById(id);
    }

    public long getInvoiceCount() {
        return invoiceRepository.count();
    }

    public boolean invoiceExists(String invoiceNumber) {
        // We'll add custom query method in next chapter
        return false;  // Placeholder
    }

    private String generateInvoiceNumber() {
        return "INV-" + System.currentTimeMillis();
    }
}
```

**Service: CustomerService**

```java
@Service
public class CustomerService {
    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Customer createCustomer(String name, String email, String phone, String address) {
        Customer customer = new Customer(name, email);
        customer.setPhone(phone);
        customer.setAddress(address);
        return customerRepository.save(customer);
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Customer not found: " + id));
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll(Sort.by("name"));
    }

    @Transactional
    public Customer updateCustomer(Long id, String name, String email, String phone, String address) {
        Customer customer = getCustomerById(id);
        customer.setName(name);
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setAddress(address);
        return customerRepository.save(customer);
    }

    @Transactional
    public void deleteCustomer(Long id) {
        // Check if customer has invoices (we'll add this check in next chapter)
        customerRepository.deleteById(id);
    }

    public long getCustomerCount() {
        return customerRepository.count();
    }
}
```

---

## Testing Repositories with @DataJpaTest

**@DataJpaTest** configures an in-memory database and loads only JPA components for fast repository testing.

**Setup test dependencies** (pom.xml):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

**Test application.yml** (src/test/resources/application.yml):

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop  # Recreate schema for each test
    show-sql: true
```

**Repository Test: InvoiceRepositoryTest**

```java
@DataJpaTest  // Loads only JPA components, uses in-memory H2 database
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)  // Use config from application-test.yml
class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TestEntityManager entityManager;  // For test data setup

    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        // Create test customer
        testCustomer = new Customer("Test Corp", "test@example.com");
        testCustomer = customerRepository.save(testCustomer);
    }

    @Test
    @DisplayName("Should save invoice and generate ID")
    void testSaveInvoice() {
        // Given
        Invoice invoice = new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000));

        // When
        Invoice saved = invoiceRepository.save(invoice);

        // Then
        assertNotNull(saved.getId());
        assertEquals("INV-001", saved.getInvoiceNumber());
        assertEquals(BigDecimal.valueOf(1000), saved.getTotal());
        assertEquals(InvoiceStatus.DRAFT, saved.getStatus());
    }

    @Test
    @DisplayName("Should find invoice by ID")
    void testFindById() {
        // Given
        Invoice invoice = new Invoice("INV-002", testCustomer, LocalDate.now(), BigDecimal.valueOf(2000));
        Invoice saved = invoiceRepository.save(invoice);

        // When
        Optional<Invoice> found = invoiceRepository.findById(saved.getId());

        // Then
        assertTrue(found.isPresent());
        assertEquals("INV-002", found.get().getInvoiceNumber());
    }

    @Test
    @DisplayName("Should return empty when invoice not found")
    void testFindByIdNotFound() {
        // When
        Optional<Invoice> found = invoiceRepository.findById(999L);

        // Then
        assertFalse(found.isPresent());
    }

    @Test
    @DisplayName("Should find all invoices")
    void testFindAll() {
        // Given
        invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));
        invoiceRepository.save(new Invoice("INV-002", testCustomer, LocalDate.now(), BigDecimal.valueOf(2000)));
        invoiceRepository.save(new Invoice("INV-003", testCustomer, LocalDate.now(), BigDecimal.valueOf(3000)));

        // When
        List<Invoice> invoices = invoiceRepository.findAll();

        // Then
        assertEquals(3, invoices.size());
    }

    @Test
    @DisplayName("Should count invoices")
    void testCount() {
        // Given
        invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));
        invoiceRepository.save(new Invoice("INV-002", testCustomer, LocalDate.now(), BigDecimal.valueOf(2000)));

        // When
        long count = invoiceRepository.count();

        // Then
        assertEquals(2, count);
    }

    @Test
    @DisplayName("Should check if invoice exists")
    void testExistsById() {
        // Given
        Invoice saved = invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));

        // When
        boolean exists = invoiceRepository.existsById(saved.getId());
        boolean notExists = invoiceRepository.existsById(999L);

        // Then
        assertTrue(exists);
        assertFalse(notExists);
    }

    @Test
    @DisplayName("Should update invoice")
    void testUpdate() {
        // Given
        Invoice invoice = new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000));
        Invoice saved = invoiceRepository.save(invoice);

        // When
        saved.setTotal(BigDecimal.valueOf(1500));
        saved.setStatus(InvoiceStatus.SENT);
        Invoice updated = invoiceRepository.save(saved);

        // Then
        assertEquals(BigDecimal.valueOf(1500), updated.getTotal());
        assertEquals(InvoiceStatus.SENT, updated.getStatus());
    }

    @Test
    @DisplayName("Should delete invoice by ID")
    void testDeleteById() {
        // Given
        Invoice saved = invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));
        Long id = saved.getId();

        // When
        invoiceRepository.deleteById(id);

        // Then
        assertFalse(invoiceRepository.existsById(id));
    }

    @Test
    @DisplayName("Should delete invoice entity")
    void testDelete() {
        // Given
        Invoice invoice = invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));

        // When
        invoiceRepository.delete(invoice);

        // Then
        assertFalse(invoiceRepository.existsById(invoice.getId()));
    }

    @Test
    @DisplayName("Should delete all invoices")
    void testDeleteAll() {
        // Given
        invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now(), BigDecimal.valueOf(1000)));
        invoiceRepository.save(new Invoice("INV-002", testCustomer, LocalDate.now(), BigDecimal.valueOf(2000)));

        // When
        invoiceRepository.deleteAll();

        // Then
        assertEquals(0, invoiceRepository.count());
    }

    @Test
    @DisplayName("Should handle pagination")
    void testPagination() {
        // Given - Create 10 invoices
        for (int i = 1; i <= 10; i++) {
            invoiceRepository.save(new Invoice("INV-" + i, testCustomer, LocalDate.now(), BigDecimal.valueOf(i * 1000)));
        }

        // When - Get first page (5 items)
        Pageable pageable = PageRequest.of(0, 5);
        Page<Invoice> page = invoiceRepository.findAll(pageable);

        // Then
        assertEquals(5, page.getContent().size());
        assertEquals(10, page.getTotalElements());
        assertEquals(2, page.getTotalPages());
        assertTrue(page.isFirst());
        assertFalse(page.isLast());
    }

    @Test
    @DisplayName("Should handle sorting")
    void testSorting() {
        // Given
        invoiceRepository.save(new Invoice("INV-003", testCustomer, LocalDate.now().minusDays(1), BigDecimal.valueOf(3000)));
        invoiceRepository.save(new Invoice("INV-001", testCustomer, LocalDate.now().minusDays(3), BigDecimal.valueOf(1000)));
        invoiceRepository.save(new Invoice("INV-002", testCustomer, LocalDate.now().minusDays(2), BigDecimal.valueOf(2000)));

        // When - Sort by invoice date descending
        List<Invoice> invoices = invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "invoiceDate"));

        // Then
        assertEquals("INV-003", invoices.get(0).getInvoiceNumber());  // Most recent
        assertEquals("INV-002", invoices.get(1).getInvoiceNumber());
        assertEquals("INV-001", invoices.get(2).getInvoiceNumber());  // Oldest
    }
}
```

**Repository Test: CustomerRepositoryTest**

```java
@DataJpaTest
class CustomerRepositoryTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    @DisplayName("Should save customer and generate ID")
    void testSaveCustomer() {
        // Given
        Customer customer = new Customer("Acme Corp", "billing@acme.com");
        customer.setPhone("555-1234");

        // When
        Customer saved = customerRepository.save(customer);

        // Then
        assertNotNull(saved.getId());
        assertEquals("Acme Corp", saved.getName());
        assertEquals("billing@acme.com", saved.getEmail());
    }

    @Test
    @DisplayName("Should enforce unique email constraint")
    void testUniqueEmail() {
        // Given
        customerRepository.save(new Customer("Company A", "same@email.com"));

        // When & Then
        Customer duplicate = new Customer("Company B", "same@email.com");
        assertThrows(DataIntegrityViolationException.class, () -> {
            customerRepository.save(duplicate);
            customerRepository.flush();  // Force database constraint check
        });
    }

    @Test
    @DisplayName("Should update customer")
    void testUpdateCustomer() {
        // Given
        Customer customer = customerRepository.save(new Customer("Old Name", "old@email.com"));

        // When
        customer.setName("New Name");
        customer.setEmail("new@email.com");
        Customer updated = customerRepository.save(customer);

        // Then
        assertEquals("New Name", updated.getName());
        assertEquals("new@email.com", updated.getEmail());
    }
}
```

---

## Best Practices

### 1. Use Constructor Injection (Not Field Injection)

❌ **Avoid**:
```java
@Service
public class InvoiceService {
    @Autowired
    private InvoiceRepository repository;  // Field injection - hard to test
}
```

✅ **Prefer**:
```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {  // Constructor injection
        this.repository = repository;
    }
}
```

### 2. Return Optional from findById

✅ **Good**:
```java
public Invoice getInvoice(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id));
}
```

❌ **Bad**:
```java
public Invoice getInvoice(Long id) {
    Invoice invoice = repository.findById(id).get();  // Throws NoSuchElementException!
    return invoice;
}
```

### 3. Use existsById Instead of findById for Existence Checks

✅ **Efficient**:
```java
if (repository.existsById(id)) {
    // More efficient - doesn't load entity
}
```

❌ **Wasteful**:
```java
if (repository.findById(id).isPresent()) {
    // Loads entire entity just to check existence
}
```

### 4. Use @Transactional on Service Methods (Not Repository)

✅ **Correct**:
```java
@Service
public class InvoiceService {
    @Transactional  // Transaction boundary at service layer
    public Invoice createInvoice(...) {
        // Multiple repository calls in one transaction
        Customer customer = customerRepository.findById(id);
        Invoice invoice = invoiceRepository.save(...);
        return invoice;
    }
}
```

❌ **Wrong**:
```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    @Transactional  // Don't add @Transactional to repository interface
    // Repositories already have transaction support
}
```

### 5. Use Pagination for Large Datasets

✅ **Good for large data**:
```java
public Page<Invoice> getInvoices(int page, int size) {
    Pageable pageable = PageRequest.of(page, size);
    return repository.findAll(pageable);  // Efficient
}
```

❌ **Bad for large data**:
```java
public List<Invoice> getAllInvoices() {
    return repository.findAll();  // Loads all invoices - memory problem!
}
```

### 6. Name Repositories Consistently

✅ **Consistent naming**:
```
CustomerRepository
InvoiceRepository
ProductRepository
OrderRepository
```

❌ **Inconsistent**:
```
CustomerRepo
InvoiceDAO
ProductRepository
OrderDataAccess
```

---

## Common Mistakes

❌ **Mistake 1**: Not handling Optional properly

```java
public Invoice getInvoice(Long id) {
    return repository.findById(id).get();  // NoSuchElementException if not found!
}
```

✅ **Fix**:
```java
public Invoice getInvoice(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id));
}
```

❌ **Mistake 2**: Using save() in a loop

```java
for (Invoice invoice : invoices) {
    repository.save(invoice);  // N database round-trips
}
```

✅ **Fix**:
```java
repository.saveAll(invoices);  // Batch operation - much faster
```

❌ **Mistake 3**: Deleting without checking existence

```java
repository.deleteById(id);  // Throws EmptyResultDataAccessException if not found
```

✅ **Fix**:
```java
if (repository.existsById(id)) {
    repository.deleteById(id);
} else {
    throw new EntityNotFoundException("Invoice not found: " + id);
}
```

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** is the difference between CrudRepository and JpaRepository?
2. **Why** does findById() return Optional instead of the entity directly?
3. **When** would you use existsById() instead of findById()?
4. **How** do you test repositories without a real database?
5. **Compare**: save() vs saveAndFlush() - when would you use each?

---

## Practice Exercises

### Level 1 - Create Repository

Create a `ProductRepository` interface that extends `JpaRepository`.

<details>
<summary>Solution</summary>

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // That's it! Inherits all CRUD methods
}
```
</details>

### Level 2 - Write Service with Repository

Write a `ProductService` that uses `ProductRepository` to:
- Create a product
- Get product by ID (throw exception if not found)
- Get all products sorted by name
- Update product price
- Delete product (check existence first)

<details>
<summary>Solution</summary>

```java
@Service
public class ProductService {
    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Product createProduct(String name, String sku, BigDecimal price) {
        Product product = new Product(name, sku, price);
        return repository.save(product);
    }

    public Product getProductById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
    }

    public List<Product> getAllProductsSorted() {
        return repository.findAll(Sort.by("name"));
    }

    @Transactional
    public Product updateProductPrice(Long id, BigDecimal newPrice) {
        Product product = getProductById(id);
        product.setPrice(newPrice);
        return repository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Product not found: " + id);
        }
        repository.deleteById(id);
    }
}
```
</details>

### Level 3 - Write Repository Tests

Write tests for `ProductRepository` covering:
- Save product
- Find by ID (found and not found)
- Find all with sorting
- Count
- Delete

<details>
<summary>Solution</summary>

```java
@DataJpaTest
class ProductRepositoryTest {

    @Autowired
    private ProductRepository repository;

    @Test
    void testSaveProduct() {
        Product product = new Product("Laptop", "LAP-001", BigDecimal.valueOf(999.99));
        Product saved = repository.save(product);

        assertNotNull(saved.getId());
        assertEquals("Laptop", saved.getName());
    }

    @Test
    void testFindById() {
        Product saved = repository.save(new Product("Mouse", "MOU-001", BigDecimal.valueOf(29.99)));

        Optional<Product> found = repository.findById(saved.getId());

        assertTrue(found.isPresent());
        assertEquals("Mouse", found.get().getName());
    }

    @Test
    void testFindByIdNotFound() {
        Optional<Product> found = repository.findById(999L);
        assertFalse(found.isPresent());
    }

    @Test
    void testFindAllSorted() {
        repository.save(new Product("Zebra", "Z-001", BigDecimal.valueOf(100)));
        repository.save(new Product("Apple", "A-001", BigDecimal.valueOf(200)));
        repository.save(new Product("Mouse", "M-001", BigDecimal.valueOf(300)));

        List<Product> products = repository.findAll(Sort.by("name"));

        assertEquals("Apple", products.get(0).getName());
        assertEquals("Mouse", products.get(1).getName());
        assertEquals("Zebra", products.get(2).getName());
    }

    @Test
    void testCount() {
        repository.save(new Product("P1", "S1", BigDecimal.valueOf(100)));
        repository.save(new Product("P2", "S2", BigDecimal.valueOf(200)));

        assertEquals(2, repository.count());
    }

    @Test
    void testDelete() {
        Product saved = repository.save(new Product("Test", "T-001", BigDecimal.valueOf(100)));
        Long id = saved.getId();

        repository.deleteById(id);

        assertFalse(repository.existsById(id));
    }
}
```
</details>

---

## Summary

**In 3 sentences**:
- Spring Data JPA repositories eliminate boilerplate DAO code by automatically implementing common CRUD operations.
- JpaRepository extends CrudRepository and PagingAndSortingRepository, providing the most complete feature set.
- Use @DataJpaTest with in-memory H2 database to efficiently test repository methods without a real database.

**Key takeaway**: **Repositories provide a clean abstraction** over database operations - define the interface, Spring Data implements it automatically.

---

## Navigation

**Prerequisites**:
- [JPA Basics](./01-jpa-basics.md) - Entities, EntityManager, persistence context

**Next Topics**:
- [Query Methods](./03-query-methods.md) - Derive queries from method names, custom queries with @Query
- [Entity Relationships](./04-relationships.md) - @OneToMany, @ManyToOne, @ManyToMany

**Related**:
- [Spring Testing](../spring-boot/05-testing.md) - Comprehensive testing strategies
- [Transactions](../spring-boot/04-transactions.md) - @Transactional deep dive

**Module Index**: [Spring Data JPA Guide](./README.md) | **Main Index**: [Learning Roadmap](../../../README.md)
