# Spring Data JPA Query Methods

> **Before you start**: Do you understand basic SQL queries (SELECT, WHERE, JOIN)? If not, review SQL fundamentals first.

## What are Query Methods?

**Query Methods** are Spring Data JPA's way of generating database queries from method names. You declare a method in your repository interface, and Spring Data automatically creates the implementation.

### The Magic

**Traditional JDBC**:
```java
public List<Customer> findByCity(String city) {
    String sql = "SELECT * FROM customers WHERE city = ?";
    PreparedStatement stmt = connection.prepareStatement(sql);
    stmt.setString(1, city);
    ResultSet rs = stmt.executeQuery();

    List<Customer> customers = new ArrayList<>();
    while (rs.next()) {
        Customer c = new Customer();
        c.setId(rs.getLong("id"));
        c.setName(rs.getString("name"));
        // ... 20 more lines
    }
    return customers;
}
```

**Spring Data JPA**:
```java
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByCity(String city);  // That's it!
}
```

**Spring Data reads the method name** and automatically generates the query!

---

## Why This Matters

**You'll use query methods when**:
- Building search functionality
- Filtering data by various criteria
- Creating custom queries beyond basic CRUD
- 90% of your database queries

**Interview context**:
- Common question: "How do you write custom queries in Spring Data?"
- Expected to know: Query derivation, @Query annotation, method naming conventions
- Often asked: "What's the difference between @Query and query methods?"

---

## Query Derivation Keywords

### Basic Keywords

Spring Data parses method names using these keywords:

| Keyword | Example | Generated Query |
|---------|---------|-----------------|
| `findBy` | `findByName(String name)` | `WHERE name = ?` |
| `findAllBy` | `findAllByCity(String city)` | `SELECT * WHERE city = ?` |
| `getBy` | `getByEmail(String email)` | `WHERE email = ?` (same as findBy) |
| `queryBy` | `queryByStatus(Status s)` | `WHERE status = ?` (same as findBy) |
| `countBy` | `countByStatus(Status s)` | `SELECT COUNT(*) WHERE status = ?` |
| `deleteBy` | `deleteByCreatedBefore(Date d)` | `DELETE WHERE created < ?` |
| `removeBy` | `removeByStatus(Status s)` | `DELETE WHERE status = ?` |
| `existsBy` | `existsByEmail(String email)` | `SELECT EXISTS WHERE email = ?` |

### Example Repository

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Find by single field
    Customer findByEmail(String email);
    List<Customer> findByCity(String city);

    // Count queries
    long countByCity(String city);
    long countByActiveTrue();

    // Existence checks
    boolean existsByEmail(String email);
    boolean existsByNameAndEmail(String name, String email);

    // Delete queries
    void deleteByCity(String city);
    long deleteByCreatedBefore(LocalDate date);
}
```

---

## Logical Operators

### AND / OR

Combine multiple conditions:

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // AND - both conditions must be true
    List<Invoice> findByCustomerAndStatus(Customer customer, InvoiceStatus status);

    // OR - at least one condition must be true
    List<Invoice> findByStatusOrPaid(InvoiceStatus status, boolean paid);

    // Complex combinations
    List<Invoice> findByCustomerAndStatusAndDateBetween(
        Customer customer,
        InvoiceStatus status,
        LocalDate startDate,
        LocalDate endDate
    );
}
```

**Generated SQL**:
```sql
-- findByCustomerAndStatus
SELECT * FROM invoices
WHERE customer_id = ? AND status = ?

-- findByStatusOrPaid
SELECT * FROM invoices
WHERE status = ? OR paid = ?
```

---

## Comparison Operators

### LessThan, GreaterThan, Between

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Less than
    List<Invoice> findByTotalLessThan(BigDecimal amount);

    // Less than or equal
    List<Invoice> findByTotalLessThanEqual(BigDecimal amount);

    // Greater than
    List<Invoice> findByTotalGreaterThan(BigDecimal amount);

    // Greater than or equal
    List<Invoice> findByTotalGreaterThanEqual(BigDecimal amount);

    // Between (inclusive)
    List<Invoice> findByDateBetween(LocalDate start, LocalDate end);
    List<Invoice> findByTotalBetween(BigDecimal min, BigDecimal max);
}
```

**Usage**:
```java
// Find invoices over $1000
List<Invoice> expensiveInvoices = invoiceRepository.findByTotalGreaterThan(
    new BigDecimal("1000.00")
);

// Find invoices in date range
List<Invoice> monthInvoices = invoiceRepository.findByDateBetween(
    LocalDate.of(2024, 1, 1),
    LocalDate.of(2024, 1, 31)
);
```

---

## String Matching

### Like, StartingWith, EndingWith, Containing

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Contains (case-sensitive)
    List<Customer> findByNameContaining(String keyword);

    // Starts with
    List<Customer> findByNameStartingWith(String prefix);

    // Ends with
    List<Customer> findByNameEndingWith(String suffix);

    // Like (with wildcards)
    List<Customer> findByNameLike(String pattern);

    // Ignore case variants
    List<Customer> findByNameContainingIgnoreCase(String keyword);
    List<Customer> findByEmailIgnoreCase(String email);
}
```

**Usage**:
```java
// Find customers with "Corp" in name
List<Customer> corps = customerRepository.findByNameContaining("Corp");
// Matches: "Acme Corp", "Tech Corp", "Corporate Solutions"

// Find customers starting with "A"
List<Customer> aCustomers = customerRepository.findByNameStartingWith("A");
// Matches: "Acme", "Amazon", "Apple"

// Case-insensitive email search
Customer customer = customerRepository.findByEmailIgnoreCase("ADMIN@EXAMPLE.COM");
// Matches: "admin@example.com", "Admin@Example.com"

// Custom pattern (% = wildcard)
List<Customer> matching = customerRepository.findByNameLike("%Corp%");
```

---

## Collection Operations

### In, NotIn

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Find by value in collection
    List<Invoice> findByStatusIn(List<InvoiceStatus> statuses);
    List<Invoice> findByIdIn(List<Long> ids);

    // Find by value not in collection
    List<Invoice> findByStatusNotIn(List<InvoiceStatus> statuses);
}
```

**Usage**:
```java
// Find all paid and completed invoices
List<InvoiceStatus> completedStatuses = Arrays.asList(
    InvoiceStatus.PAID,
    InvoiceStatus.COMPLETED
);
List<Invoice> completed = invoiceRepository.findByStatusIn(completedStatuses);

// Find specific invoices by IDs
List<Long> ids = Arrays.asList(1L, 5L, 10L, 15L);
List<Invoice> invoices = invoiceRepository.findByIdIn(ids);

// Find all except cancelled/deleted
List<InvoiceStatus> excludedStatuses = Arrays.asList(
    InvoiceStatus.CANCELLED,
    InvoiceStatus.DELETED
);
List<Invoice> active = invoiceRepository.findByStatusNotIn(excludedStatuses);
```

---

## Null Handling

### IsNull, IsNotNull

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Find records where field is null
    List<Customer> findByPhoneIsNull();
    List<Customer> findByCompanyIsNull();  // Individual customers

    // Find records where field is not null
    List<Customer> findByPhoneIsNotNull();
    List<Customer> findByCompanyIsNotNull();  // Business customers
}
```

---

## Boolean Fields

### IsTrue, IsFalse

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Boolean conditions
    List<Invoice> findByPaidIsTrue();
    List<Invoice> findByPaidIsFalse();

    // Alternative (same result)
    List<Invoice> findByPaid(boolean paid);

    // Combined with other conditions
    List<Invoice> findByPaidIsTrueAndDateAfter(LocalDate date);
}
```

**Usage**:
```java
// Find all paid invoices
List<Invoice> paidInvoices = invoiceRepository.findByPaidIsTrue();

// Find unpaid invoices
List<Invoice> unpaid = invoiceRepository.findByPaidIsFalse();

// Alternative approach
List<Invoice> paid = invoiceRepository.findByPaid(true);
```

---

## Ordering Results

### OrderBy

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Order by single field (ascending)
    List<Customer> findByCityOrderByNameAsc(String city);

    // Order by single field (descending)
    List<Customer> findByCityOrderByNameDesc(String city);

    // Order by multiple fields
    List<Customer> findByCityOrderByNameAscEmailDesc(String city);

    // No filter, just ordering
    List<Customer> findAllByOrderByNameAsc();
}

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Order by date descending (newest first)
    List<Invoice> findByCustomerOrderByDateDesc(Customer customer);

    // Order by total descending (highest first)
    List<Invoice> findByStatusOrderByTotalDesc(InvoiceStatus status);

    // Multiple ordering
    List<Invoice> findByStatusOrderByDateDescTotalDesc(InvoiceStatus status);
}
```

---

## Limiting Results

### First, Top

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Get first result
    Customer findFirstByOrderByCreatedAtDesc();

    // Get first by criteria
    Customer findFirstByCity(String city);

    // Get top N results
    List<Customer> findTop10ByOrderByCreatedAtDesc();
    List<Customer> findTop5ByCityOrderByNameAsc(String city);

    // First and Top are synonyms
    List<Customer> findFirst10ByOrderByCreatedAtDesc();
}

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Get most recent invoice
    Invoice findFirstByOrderByDateDesc();

    // Get top 10 highest invoices
    List<Invoice> findTop10ByOrderByTotalDesc();

    // Get most recent customer invoice
    Invoice findFirstByCustomerOrderByDateDesc(Customer customer);
}
```

---

## Distinct Results

### Distinct

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Get distinct cities
    List<String> findDistinctCityBy();

    // Distinct customers with specific status
    List<Customer> findDistinctCustomerByStatus(InvoiceStatus status);
}
```

---

## Custom Queries with @Query

Sometimes method names get too long or complex. Use `@Query` instead.

### JPQL Queries

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Simple JPQL query
    @Query("SELECT i FROM Invoice i WHERE i.total > :amount")
    List<Invoice> findExpensiveInvoices(@Param("amount") BigDecimal amount);

    // Join query
    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer WHERE i.id = :id")
    Optional<Invoice> findByIdWithCustomer(@Param("id") Long id);

    // Aggregation
    @Query("SELECT SUM(i.total) FROM Invoice i WHERE i.customer = :customer")
    BigDecimal getTotalRevenueForCustomer(@Param("customer") Customer customer);

    // Count query
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.paid = true")
    long countPaidInvoices();

    // Complex criteria
    @Query("""
        SELECT i FROM Invoice i
        WHERE i.customer = :customer
          AND i.date BETWEEN :startDate AND :endDate
          AND i.status = :status
        ORDER BY i.date DESC
        """)
    List<Invoice> findCustomerInvoicesInPeriod(
        @Param("customer") Customer customer,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        @Param("status") InvoiceStatus status
    );
}
```

### Native SQL Queries

Use native SQL when you need database-specific features:

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Native SQL query
    @Query(value = "SELECT * FROM invoices WHERE total > ?1", nativeQuery = true)
    List<Invoice> findExpensiveInvoicesNative(BigDecimal amount);

    // Native with named parameters
    @Query(value = "SELECT * FROM invoices WHERE customer_id = :customerId " +
                   "AND paid = :paid", nativeQuery = true)
    List<Invoice> findByCustomerAndPaidNative(
        @Param("customerId") Long customerId,
        @Param("paid") boolean paid
    );

    // Database-specific function
    @Query(value = "SELECT * FROM invoices WHERE EXTRACT(YEAR FROM date) = ?1",
           nativeQuery = true)
    List<Invoice> findByYear(int year);
}
```

---

## Modifying Queries

### @Modifying for UPDATE and DELETE

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Update query
    @Modifying
    @Query("UPDATE Invoice i SET i.paid = true WHERE i.id = :id")
    int markAsPaid(@Param("id") Long id);

    // Bulk update
    @Modifying
    @Query("UPDATE Invoice i SET i.status = :status WHERE i.date < :date")
    int updateOldInvoicesStatus(
        @Param("status") InvoiceStatus status,
        @Param("date") LocalDate date
    );

    // Delete query
    @Modifying
    @Query("DELETE FROM Invoice i WHERE i.customer = :customer AND i.paid = false")
    int deleteUnpaidByCustomer(@Param("customer") Customer customer);
}
```

**Important**: Always use `@Modifying` with `@Transactional`:

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;

    @Transactional
    public void markInvoiceAsPaid(Long invoiceId) {
        invoiceRepository.markAsPaid(invoiceId);
    }
}
```

---

## Pagination and Sorting

### Using Pageable

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Pageable support
    Page<Invoice> findByCustomer(Customer customer, Pageable pageable);
    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    // With @Query
    @Query("SELECT i FROM Invoice i WHERE i.total > :amount")
    Page<Invoice> findExpensive(@Param("amount") BigDecimal amount, Pageable pageable);
}
```

**Usage**:
```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;

    public Page<Invoice> getCustomerInvoices(Customer customer, int page, int size) {
        // Create pageable (page 0-based)
        Pageable pageable = PageRequest.of(page, size);
        return invoiceRepository.findByCustomer(customer, pageable);
    }

    public Page<Invoice> getCustomerInvoicesSorted(Customer customer, int page) {
        // With sorting
        Pageable pageable = PageRequest.of(
            page,
            20,  // size
            Sort.by("date").descending()
        );
        return invoiceRepository.findByCustomer(customer, pageable);
    }

    public Page<Invoice> getInvoicesMultiSort(InvoiceStatus status, int page) {
        // Multiple sort fields
        Pageable pageable = PageRequest.of(page, 10,
            Sort.by("date").descending()
                .and(Sort.by("total").descending())
        );
        return invoiceRepository.findByStatus(status, pageable);
    }
}
```

**Page object provides**:
```java
Page<Invoice> page = invoiceRepository.findByCustomer(customer, pageable);

page.getContent();          // List<Invoice> for current page
page.getTotalElements();    // Total number of invoices
page.getTotalPages();       // Total number of pages
page.getNumber();           // Current page number (0-based)
page.getSize();             // Page size
page.hasNext();             // Has next page?
page.hasPrevious();         // Has previous page?
page.isFirst();             // Is first page?
page.isLast();              // Is last page?
```

---

## Projections

### Interface-Based Projections

Return only specific fields:

```java
// Projection interface
public interface CustomerSummary {
    String getName();
    String getEmail();
}

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Returns only name and email
    List<CustomerSummary> findByCity(String city);
}

// Usage
List<CustomerSummary> summaries = customerRepository.findByCity("New York");
for (CustomerSummary summary : summaries) {
    System.out.println(summary.getName() + " - " + summary.getEmail());
}
```

### Class-Based Projections (DTOs)

```java
// DTO class
public class InvoiceSummaryDTO {
    private Long id;
    private LocalDate date;
    private BigDecimal total;
    private String customerName;

    public InvoiceSummaryDTO(Long id, LocalDate date, BigDecimal total, String customerName) {
        this.id = id;
        this.date = date;
        this.total = total;
        this.customerName = customerName;
    }

    // Getters
}

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("""
        SELECT new com.example.dto.InvoiceSummaryDTO(
            i.id, i.date, i.total, c.name
        )
        FROM Invoice i JOIN i.customer c
        WHERE i.status = :status
        """)
    List<InvoiceSummaryDTO> findSummariesByStatus(@Param("status") InvoiceStatus status);
}
```

---

## Query by Example

Dynamic queries without writing JPQL:

```java
@Service
public class CustomerService {
    private final CustomerRepository customerRepository;

    public List<Customer> searchCustomers(String name, String city, String email) {
        // Create example entity
        Customer probe = new Customer();
        if (name != null) probe.setName(name);
        if (city != null) probe.setCity(city);
        if (email != null) probe.setEmail(email);

        // Create example with matching strategy
        Example<Customer> example = Example.of(probe,
            ExampleMatcher.matching()
                .withIgnoreCase()
                .withStringMatcher(StringMatcher.CONTAINING)
        );

        return customerRepository.findAll(example);
    }
}
```

---

## Specifications (for complex dynamic queries)

```java
public class InvoiceSpecifications {

    public static Specification<Invoice> hasCustomer(Customer customer) {
        return (root, query, builder) ->
            builder.equal(root.get("customer"), customer);
    }

    public static Specification<Invoice> hasStatus(InvoiceStatus status) {
        return (root, query, builder) ->
            builder.equal(root.get("status"), status);
    }

    public static Specification<Invoice> dateBetween(LocalDate start, LocalDate end) {
        return (root, query, builder) ->
            builder.between(root.get("date"), start, end);
    }

    public static Specification<Invoice> totalGreaterThan(BigDecimal amount) {
        return (root, query, builder) ->
            builder.greaterThan(root.get("total"), amount);
    }
}

// Repository with Specification support
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long>,
                                          JpaSpecificationExecutor<Invoice> {
}

// Usage - combine specifications dynamically
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;

    public List<Invoice> searchInvoices(
            Customer customer,
            InvoiceStatus status,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal minAmount) {

        Specification<Invoice> spec = Specification.where(null);

        if (customer != null) {
            spec = spec.and(InvoiceSpecifications.hasCustomer(customer));
        }
        if (status != null) {
            spec = spec.and(InvoiceSpecifications.hasStatus(status));
        }
        if (startDate != null && endDate != null) {
            spec = spec.and(InvoiceSpecifications.dateBetween(startDate, endDate));
        }
        if (minAmount != null) {
            spec = spec.and(InvoiceSpecifications.totalGreaterThan(minAmount));
        }

        return invoiceRepository.findAll(spec);
    }
}
```

---

## Best Practices

### ✅ DO: Use Query Methods for Simple Queries

```java
// Good - clear and concise
List<Invoice> findByCustomerAndPaid(Customer customer, boolean paid);

// Good - easy to understand
List<Customer> findByCityOrderByNameAsc(String city);
```

### ❌ DON'T: Make Method Names Too Long

```java
// Bad - method name too complex
List<Invoice> findByCustomerAndStatusAndDateBetweenAndPaidOrderByDateDescTotalDesc(
    Customer customer, InvoiceStatus status, LocalDate start, LocalDate end, boolean paid
);

// Better - use @Query
@Query("""
    SELECT i FROM Invoice i
    WHERE i.customer = :customer
      AND i.status = :status
      AND i.date BETWEEN :start AND :end
      AND i.paid = :paid
    ORDER BY i.date DESC, i.total DESC
    """)
List<Invoice> searchInvoices(
    @Param("customer") Customer customer,
    @Param("status") InvoiceStatus status,
    @Param("start") LocalDate start,
    @Param("end") LocalDate end,
    @Param("paid") boolean paid
);
```

### ✅ DO: Use JOIN FETCH to Avoid N+1 Queries

```java
// Good - loads customer in same query
@Query("SELECT i FROM Invoice i JOIN FETCH i.customer WHERE i.id = :id")
Optional<Invoice> findByIdWithCustomer(@Param("id") Long id);

// Good - loads customer and items
@Query("SELECT DISTINCT i FROM Invoice i " +
       "JOIN FETCH i.customer " +
       "LEFT JOIN FETCH i.items " +
       "WHERE i.id = :id")
Optional<Invoice> findByIdWithDetails(@Param("id") Long id);
```

### ✅ DO: Use Projections for Read-Only Data

```java
// Good - only loads needed fields
public interface InvoiceSummary {
    Long getId();
    LocalDate getDate();
    BigDecimal getTotal();
}

List<InvoiceSummary> findByCustomer(Customer customer);
```

---

## Common Mistakes

❌ **Mistake 1**: Forgetting @Transactional with @Modifying

```java
// Bad - may not work correctly
@Modifying
@Query("UPDATE Invoice i SET i.paid = true WHERE i.id = :id")
int markAsPaid(@Param("id") Long id);

// Good
@Transactional
public void markInvoiceAsPaid(Long id) {
    invoiceRepository.markAsPaid(id);
}
```

❌ **Mistake 2**: Not using @Param with named parameters

```java
// Bad - may fail
@Query("SELECT i FROM Invoice i WHERE i.total > :amount")
List<Invoice> findExpensive(BigDecimal amount);  // Missing @Param!

// Good
@Query("SELECT i FROM Invoice i WHERE i.total > :amount")
List<Invoice> findExpensive(@Param("amount") BigDecimal amount);
```

❌ **Mistake 3**: Using native query when JPQL would work

```java
// Bad - database-specific, not portable
@Query(value = "SELECT * FROM invoices WHERE customer_id = ?1", nativeQuery = true)
List<Invoice> findByCustomer(Long customerId);

// Good - portable JPQL
@Query("SELECT i FROM Invoice i WHERE i.customer.id = :customerId")
List<Invoice> findByCustomer(@Param("customerId") Long customerId);

// Best - query method
List<Invoice> findByCustomerId(Long customerId);
```

---

## Self-Check Questions

1. **What** is the difference between `findBy` and `getBy`?
2. **Why** would you use @Query instead of query methods?
3. **When** should you use native queries vs JPQL?
4. **How** do you implement pagination with query methods?
5. **Compare**: Query methods vs Specifications - when to use each?

---

## Practice Exercises

### Level 1: Basic Query Methods

Create repository methods for these requirements:
1. Find all customers in a specific city
2. Find all invoices with total greater than $1000
3. Count unpaid invoices
4. Find customers whose email contains "@gmail.com"

### Level 2: Complex Query Methods

1. Find invoices for a customer within a date range, ordered by date descending
2. Find top 10 customers by total invoice amount
3. Find all paid invoices created this month

### Level 3: Custom Queries

1. Write a @Query to find total revenue per customer
2. Create a specification-based search with multiple optional filters
3. Implement a paginated search with dynamic sorting

---

## Summary

**In 3 sentences**:
- Query methods let Spring Data generate queries from method names, eliminating boilerplate code.
- Use @Query with JPQL for complex queries, and native SQL only when database-specific features are needed.
- Combine query methods with Pageable for pagination, Specifications for dynamic queries, and projections for read-only data.

**Key takeaway**: **Start simple with query methods, graduate to @Query when needed** - most queries can be expressed as method names, but @Query gives you full control when complexity increases.

---

## Navigation

**Prerequisites:**
- [JPA Basics](./01-jpa-basics.md) - Entity mapping and persistence
- [Repository Pattern](./02-repository-pattern.md) - JpaRepository basics

**Next Topics:**
- [Entity Relationships](./04-relationships.md) - @OneToMany, @ManyToOne, @ManyToMany
- [Best Practices](./05-best-practices.md) - Performance optimization, N+1 problem

**Related:**
- [Spring Data REST](https://docs.spring.io/spring-data/rest/docs/current/reference/html/) - Expose repositories as REST APIs
- [Query DSL](http://www.querydsl.com/) - Type-safe queries alternative

**Module Index:** [Spring Data Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
