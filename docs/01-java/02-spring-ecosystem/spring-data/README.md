# Spring Data JPA - Complete Guide

> **Before you start**: Do you understand JPA (Java Persistence API) and database basics? If not, review database fundamentals first.

## What is Spring Data JPA?

**Spring Data JPA** is a layer on top of JPA that eliminates boilerplate code for database operations. It provides repository abstractions and automatic query generation.

### The Evolution

**JDBC (Old Way)**:
```java
// 50+ lines to save a customer
Connection conn = DriverManager.getConnection(url);
PreparedStatement stmt = conn.prepareStatement("INSERT INTO customer VALUES (?, ?, ?)");
stmt.setString(1, customer.getName());
stmt.setString(2, customer.getEmail());
stmt.setString(3, customer.getAddress());
stmt.executeUpdate();
stmt.close();
conn.close();
```

**JPA (Better)**:
```java
// 10 lines
EntityManager em = emf.createEntityManager();
em.getTransaction().begin();
em.persist(customer);
em.getTransaction().commit();
em.close();
```

**Spring Data JPA (Best)**:
```java
// 1 line!
customerRepository.save(customer);
```

---

## Learning Path

```
01. JPA Basics              ← Entities, relationships, JPQL
    ↓
02. Repository Pattern      ← JpaRepository, query methods
    ↓
03. Query Methods           ← Derived queries, custom queries
    ↓
04. Relationships           ← One-to-Many, Many-to-One, Many-to-Many
    ↓
05. Best Practices         ← N+1 problem, transactions, performance
```

## Files in this Module

1. **[01-jpa-basics.md](./01-jpa-basics.md)** - Entities, EntityManager, persistence context
2. **[02-repository-pattern.md](./02-repository-pattern.md)** - JpaRepository, CrudRepository, custom repositories
3. **[03-query-methods.md](./03-query-methods.md)** - Query derivation, @Query, specifications
4. **[04-relationships.md](./04-relationships.md)** - @OneToMany, @ManyToOne, @ManyToMany, fetching strategies
5. **[05-best-practices.md](./05-best-practices.md)** - Performance, transactions, common pitfalls

---

## Quick Reference

### Core Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@Entity` | Mark class as JPA entity | `@Entity public class Customer {}` |
| `@Table` | Map to specific table | `@Table(name = "customers")` |
| `@Id` | Primary key field | `@Id private Long id;` |
| `@GeneratedValue` | Auto-generate ID | `@GeneratedValue(strategy = IDENTITY)` |
| `@Column` | Map field to column | `@Column(name = "email", unique = true)` |
| `@OneToMany` | One-to-many relationship | `@OneToMany List<Order> orders;` |
| `@ManyToOne` | Many-to-one relationship | `@ManyToOne Customer customer;` |
| `@ManyToMany` | Many-to-many relationship | `@ManyToMany Set<Role> roles;` |
| `@JoinColumn` | Foreign key column | `@JoinColumn(name = "customer_id")` |
| `@Transient` | Don't persist field | `@Transient private int temp;` |

### Repository Interfaces

| Interface | Methods | When to Use |
|-----------|---------|-------------|
| `Repository` | Marker interface | Custom repository from scratch |
| `CrudRepository` | save, findById, delete, etc. | Basic CRUD operations |
| `JpaRepository` | + flush, saveAll, batch operations | Most common choice |
| `PagingAndSortingRepository` | + pagination & sorting | Large datasets |

### Common Query Method Keywords

| Keyword | Example | SQL Equivalent |
|---------|---------|----------------|
| `findBy` | `findByName(String name)` | `WHERE name = ?` |
| `findAllBy` | `findAllByCity(String city)` | `SELECT * WHERE city = ?` |
| `countBy` | `countByStatus(Status s)` | `SELECT COUNT(*) WHERE status = ?` |
| `deleteBy` | `deleteByCreatedBefore(Date d)` | `DELETE WHERE created < ?` |
| `And` | `findByNameAndEmail()` | `WHERE name = ? AND email = ?` |
| `Or` | `findByNameOrEmail()` | `WHERE name = ? OR email = ?` |
| `Between` | `findByAgeBetween(int min, int max)` | `WHERE age BETWEEN ? AND ?` |
| `LessThan` | `findByAgeLessThan(int age)` | `WHERE age < ?` |
| `GreaterThan` | `findByAgeGreaterThan(int age)` | `WHERE age > ?` |
| `Like` | `findByNameLike(String pattern)` | `WHERE name LIKE ?` |
| `In` | `findByStatusIn(List<Status> statuses)` | `WHERE status IN (?)` |
| `OrderBy` | `findByNameOrderByAgeDesc()` | `WHERE name = ? ORDER BY age DESC` |

---

## InvoiceManager Evolution

### Week 2: Manual Repository Pattern

```java
@Repository
public class InvoiceRepository {
    private final Map<String, Invoice> invoices = new HashMap<>();

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
}
```

### Week 4: Spring Data JPA

```java
// Entity
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL)
    private List<InvoiceLineItem> items;

    private LocalDate invoiceDate;
    private BigDecimal total;

    // Getters, setters, constructors
}

// Repository - that's it!
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByCustomer(Customer customer);
    List<Invoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer WHERE i.id = :id")
    Optional<Invoice> findByIdWithCustomer(@Param("id") Long id);
}
```

**What you get**:
- ✅ No more manual SQL
- ✅ Automatic CRUD operations
- ✅ Query methods generated from method names
- ✅ Pagination and sorting built-in
- ✅ Transaction management
- ✅ Database independence

---

## Prerequisites

Before studying Spring Data JPA:
- ✅ SQL basics (SELECT, INSERT, UPDATE, DELETE, JOIN)
- ✅ Database concepts (tables, primary keys, foreign keys, indexes)
- ✅ Spring Core (IoC, DI, Bean Management)
- ✅ Spring Boot basics (auto-configuration, starters)
- ✅ Java Collections (List, Set, Map)
- ✅ Java 8+ features (Optional, Streams, LocalDate)

---

## Common Configuration

### application.yml

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: admin
    password: secret
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate  # Options: none, validate, update, create, create-drop
    show-sql: true        # Show SQL in logs (dev only)
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        use_sql_comments: true

  # Connection pooling
  hikari:
    maximum-pool-size: 10
    minimum-idle: 5
    connection-timeout: 20000
```

### Maven Dependencies

```xml
<dependencies>
    <!-- Spring Data JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Database driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- For testing with H2 in-memory database -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## Study Tips

### 1. Understand the Layers

```
Controller Layer (REST API)
        ↓
Service Layer (Business Logic)
        ↓
Repository Layer (Data Access) ← Spring Data JPA
        ↓
Database (PostgreSQL, MySQL, etc.)
```

**Never call repositories directly from controllers!** Always go through services.

### 2. Master Entity Relationships

Understand when to use each:
- **@OneToMany**: Customer → Orders (one customer has many orders)
- **@ManyToOne**: Order → Customer (many orders belong to one customer)
- **@ManyToMany**: Student ↔ Course (students have many courses, courses have many students)

### 3. Learn to Read SQL Logs

Enable SQL logging to see what queries Spring Data generates:
```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### 4. Avoid Common Pitfalls

**N+1 Query Problem**:
```java
// BAD - fires N+1 queries
List<Invoice> invoices = invoiceRepository.findAll();
for (Invoice invoice : invoices) {
    invoice.getCustomer().getName();  // Additional query per invoice!
}

// GOOD - single query with JOIN FETCH
@Query("SELECT i FROM Invoice i JOIN FETCH i.customer")
List<Invoice> findAllWithCustomer();
```

### 5. Practice With Real Database

Don't just use H2 in-memory:
- Install PostgreSQL or MySQL locally
- Use Docker for easy setup:
```bash
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=invoicedb \
  -p 5432:5432 \
  postgres:15
```

---

## InvoiceManager Project Goals

By the end of Spring Data JPA module, your InvoiceManager will have:

**Week 4 - Spring Data Features**:
- ✅ JPA entities (@Entity, @Table, @Column)
- ✅ Entity relationships (@OneToMany, @ManyToOne)
- ✅ JpaRepository interfaces
- ✅ Custom query methods
- ✅ @Query for complex queries
- ✅ Pagination and sorting
- ✅ Transaction management
- ✅ Database migration with Flyway/Liquibase
- ✅ Repository tests with @DataJpaTest

**Example Entities**:

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    private List<Invoice> invoices = new ArrayList<>();
}

@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> items = new ArrayList<>();

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(precision = 10, scale = 2)
    private BigDecimal total;
}

@Entity
@Table(name = "invoice_line_items")
public class InvoiceLineItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private int quantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;
}
```

---

## Common Questions

**Q: JPA vs JDBC - which should I use?**
A: Use Spring Data JPA for most applications. Use JDBC only for high-performance batch operations or very simple queries.

**Q: Should I use @GeneratedValue(strategy = IDENTITY) or SEQUENCE?**
A:
- IDENTITY: Simpler, works with MySQL/PostgreSQL. Database generates ID.
- SEQUENCE: Better performance with batch inserts. Use with PostgreSQL/Oracle.
- AUTO: Let JPA choose based on database.

**Q: When to use FetchType.LAZY vs EAGER?**
A:
- Default to LAZY (avoids loading unnecessary data)
- Use EAGER only if you ALWAYS need the related data
- For @OneToMany, @ManyToMany: Always LAZY
- For @ManyToOne, @OneToOne: Can be EAGER if small data

**Q: What is N+1 query problem?**
A: Fetching a list of entities, then accessing related entities causes additional queries. Solution: Use JOIN FETCH or EntityGraph.

**Q: Should I use bidirectional or unidirectional relationships?**
A:
- Unidirectional: Simpler, less coupling
- Bidirectional: Convenient navigation, but requires more maintenance (@JsonIgnore, synchronized methods)
- Start unidirectional, add bidirectional only when needed

---

## Quick Start Commands

```bash
# Create database (PostgreSQL)
createdb invoicedb

# Run application with JPA
mvn spring-boot:run

# Generate SQL schema from entities
mvn clean compile
# Check target/classes/schema.sql

# Run with SQL logging
mvn spring-boot:run -Dspring.jpa.show-sql=true

# Run tests with in-memory H2
mvn test
```

---

## Next Steps

1. Start with **[01-jpa-basics.md](./01-jpa-basics.md)** - understand entities and persistence
2. Work through files in order (01 → 05)
3. Build InvoiceManager database layer as you learn
4. Complete practice exercises in each file
5. Review Spring Security module next

---

## How This Connects

**Builds on**:
- Spring Core (IoC, DI, Bean Management)
- Spring Boot (Auto-configuration, Starters)
- SQL and Database Fundamentals

**Leads to**:
- Advanced query optimization
- Database migrations (Flyway/Liquibase)
- Multi-tenancy and sharding
- Event sourcing and CQRS

---

**Time estimate**: 1 week with Spring Boot knowledge
**Hands-on project**: InvoiceManager Database Layer (Week 4)
**Key skill**: Professional data access layer with zero boilerplate

---

**Ready to start?** → [01. JPA Basics](./01-jpa-basics.md)
