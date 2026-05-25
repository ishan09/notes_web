# Entity Relationships in Spring Data JPA

> **Before you start**: Do you understand JPA entities and repositories? If not, review [01-jpa-basics.md](./01-jpa-basics.md) first.

## What This File Covers

This guide teaches you how to map real-world relationships in your database using JPA annotations. You'll learn:
- How to map one-to-one, one-to-many, many-to-one, and many-to-many relationships
- Understanding bidirectional vs unidirectional relationships
- Cascade operations and orphan removal
- Fetch strategies (LAZY vs EAGER)
- Avoiding common pitfalls like N+1 queries and circular JSON references

**Think of this as**: Teaching your Java objects how to talk to each other, just like tables with foreign keys.

---

## Real-World Analogy

Imagine a library:
- **One-to-One**: One library card → One member
- **One-to-Many**: One member → Many borrowed books
- **Many-to-One**: Many borrowed books → One member (reverse view)
- **Many-to-Many**: Many students → Many courses (students take multiple courses, courses have multiple students)

In databases, we use **foreign keys** to link tables. In JPA, we use **annotations** to map these relationships.

---

## Entity Relationships Overview

### Relationship Types

| Type | Database Representation | Example |
|------|------------------------|---------|
| `@OneToOne` | Foreign key in either table | User ↔ UserProfile |
| `@OneToMany` | Foreign key in "many" table | Customer → Invoices |
| `@ManyToOne` | Foreign key in "this" table | Invoice → Customer |
| `@ManyToMany` | Join table | Student ↔ Course |

### Directionality

**Unidirectional**: Only one entity knows about the relationship
```java
// Invoice knows about Customer, but Customer doesn't know about Invoices
public class Invoice {
    @ManyToOne
    private Customer customer;
}

public class Customer {
    // No reference to invoices
}
```

**Bidirectional**: Both entities know about each other
```java
// Both know about the relationship
public class Invoice {
    @ManyToOne
    private Customer customer;
}

public class Customer {
    @OneToMany(mappedBy = "customer")
    private List<Invoice> invoices;
}
```

**Rule of Thumb**: Start with unidirectional. Add bidirectional only when you need to navigate from both sides.

---

## @OneToOne - One-to-One Relationship

### Real-World Example
A **User** has one **UserProfile**, and a **UserProfile** belongs to one **User**.

```
users table           user_profiles table
+----+-------+       +----+----------+---------+
| id | email |       | id | user_id  | bio     |
+----+-------+       +----+----------+---------+
| 1  | john@ |<------| 1  | 1        | "..."   |
+----+-------+       +----+----------+---------+
```

### Unidirectional @OneToOne

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "profile_id", referencedColumnName = "id")
    private UserProfile profile;

    // Getters, setters, constructors
}

@Entity
@Table(name = "user_profiles")
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bio;
    private String phone;

    // No reference to User
}
```

**Using it**:
```java
// Create and save
User user = new User();
user.setEmail("john@example.com");

UserProfile profile = new UserProfile();
profile.setBio("Software developer");
user.setProfile(profile);

userRepository.save(user);  // Saves both user and profile (cascade)
```

### Bidirectional @OneToOne

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserProfile profile;

    // Helper method to keep both sides in sync
    public void setProfile(UserProfile profile) {
        this.profile = profile;
        if (profile != null) {
            profile.setUser(this);
        }
    }
}

@Entity
@Table(name = "user_profiles")
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bio;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;  // Owns the relationship

    // Getters, setters
}
```

**Key Points**:
- `mappedBy = "user"` - indicates the other side owns the foreign key
- The side WITHOUT `mappedBy` owns the relationship (has the foreign key)
- Always use helper methods to keep both sides synchronized

---

## @OneToMany / @ManyToOne - One-to-Many Relationship

### Real-World Example: Customer → Invoices

A **Customer** has many **Invoices**, but each **Invoice** belongs to one **Customer**.

```
customers table              invoices table
+----+---------+            +----+-------------+-------+
| id | name    |            | id | customer_id | total |
+----+---------+            +----+-------------+-------+
| 1  | Acme Co |<-----------| 1  | 1           | 100   |
+----+---------+    |       +----+-------------+-------+
                    |-------| 2  | 1           | 200   |
                    |       +----+-------------+-------+
                    |-------| 3  | 1           | 150   |
                            +----+-------------+-------+
```

### Unidirectional @ManyToOne (Most Common)

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    private LocalDate invoiceDate;
    private BigDecimal total;

    // Getters, setters
}

@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;

    // No reference to invoices
}
```

**Using it**:
```java
Customer customer = customerRepository.findById(1L).orElseThrow();

Invoice invoice = new Invoice();
invoice.setCustomer(customer);
invoice.setTotal(new BigDecimal("100.00"));
invoice.setInvoiceDate(LocalDate.now());

invoiceRepository.save(invoice);
```

**Querying**:
```java
// Find all invoices for a customer
List<Invoice> invoices = invoiceRepository.findByCustomer(customer);

// Or by customer ID
List<Invoice> invoices = invoiceRepository.findByCustomerId(1L);
```

### Bidirectional @OneToMany / @ManyToOne

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Invoice> invoices = new ArrayList<>();

    // Helper methods to maintain both sides
    public void addInvoice(Invoice invoice) {
        invoices.add(invoice);
        invoice.setCustomer(this);
    }

    public void removeInvoice(Invoice invoice) {
        invoices.remove(invoice);
        invoice.setCustomer(null);
    }
}

@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;  // Owns the relationship

    private LocalDate invoiceDate;
    private BigDecimal total;

    // Getters, setters
}
```

**Using it**:
```java
Customer customer = new Customer();
customer.setName("Acme Corp");

Invoice invoice1 = new Invoice();
invoice1.setTotal(new BigDecimal("100.00"));
invoice1.setInvoiceDate(LocalDate.now());

Invoice invoice2 = new Invoice();
invoice2.setTotal(new BigDecimal("200.00"));
invoice2.setInvoiceDate(LocalDate.now());

customer.addInvoice(invoice1);
customer.addInvoice(invoice2);

customerRepository.save(customer);  // Saves customer + invoices (cascade)
```

**Important Rules**:
1. The `@ManyToOne` side ALWAYS owns the relationship (has `@JoinColumn`)
2. The `@OneToMany` side uses `mappedBy` to point to the owning field
3. ALWAYS use helper methods to keep both sides in sync
4. Initialize collections: `private List<Invoice> invoices = new ArrayList<>();`

---

## @ManyToMany - Many-to-Many Relationship

### Real-World Example: Students ↔ Courses

A **Student** can enroll in many **Courses**, and a **Course** can have many **Students**.

```
students table        student_course (join table)      courses table
+----+-------+       +------------+-----------+        +----+------------+
| id | name  |       | student_id | course_id |        | id | title      |
+----+-------+       +------------+-----------+        +----+------------+
| 1  | Alice |<------| 1          | 101       |------->| 101| Java       |
+----+-------+   |   +------------+-----------+    |   +----+------------+
| 2  | Bob   |<--+---| 2          | 101       |----+   | 102| Spring     |
+----+-------+   |   +------------+-----------+    |   +----+------------+
                 +---| 1          | 102       |----+
                     +------------+-----------+
                     | 2          | 102       |--------+
                     +------------+-----------+
```

### Unidirectional @ManyToMany

```java
@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();

    // Getters, setters
}

@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    // No reference to students
}
```

**Using it**:
```java
Student student = new Student();
student.setName("Alice");

Course javaCourse = courseRepository.findById(101L).orElseThrow();
Course springCourse = courseRepository.findById(102L).orElseThrow();

student.getCourses().add(javaCourse);
student.getCourses().add(springCourse);

studentRepository.save(student);
```

### Bidirectional @ManyToMany

```java
@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();

    // Helper methods
    public void enrollInCourse(Course course) {
        courses.add(course);
        course.getStudents().add(this);
    }

    public void dropCourse(Course course) {
        courses.remove(course);
        course.getStudents().remove(this);
    }
}

@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();

    // Getters, setters
}
```

**Important Points**:
1. Use `Set` instead of `List` for better performance (avoids duplicates)
2. Override `equals()` and `hashCode()` in both entities
3. The side with `@JoinTable` owns the relationship
4. Always use helper methods to synchronize both sides

**Why Set and not List?**
```java
// BAD - List can have duplicates
@ManyToMany
private List<Course> courses = new ArrayList<>();
// If course added twice, creates duplicate join table entries

// GOOD - Set prevents duplicates
@ManyToMany
private Set<Course> courses = new HashSet<>();
// Adding same course twice has no effect
```

---

## mappedBy Attribute Explained

**mappedBy** indicates which side of a bidirectional relationship **owns** the foreign key.

**Rule**: The side WITHOUT `mappedBy` owns the relationship and has the foreign key column.

### Examples

```java
// Customer owns the relationship (no mappedBy)
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")  // Points to Invoice.customer field
    private List<Invoice> invoices;
}

// Invoice has the foreign key
@Entity
public class Invoice {
    @ManyToOne  // Owns the relationship
    @JoinColumn(name = "customer_id")
    private Customer customer;
}
```

**Visual Representation**:
```
Customer (mappedBy = "customer") ←-- inverse side
    ↓
Invoice (@JoinColumn) ←-- owning side (has foreign key)
```

**Common Mistake**:
```java
// ❌ WRONG - both have mappedBy (neither owns it)
@OneToMany(mappedBy = "invoice")
private List<InvoiceLineItem> items;

// ❌ WRONG - neither has mappedBy (both try to own it)
@OneToMany
private List<InvoiceLineItem> items;
@ManyToOne
private Invoice invoice;
```

**✅ CORRECT**:
```java
// Parent side (inverse)
@OneToMany(mappedBy = "invoice")
private List<InvoiceLineItem> items;

// Child side (owner)
@ManyToOne
@JoinColumn(name = "invoice_id")
private Invoice invoice;
```

---

## @JoinColumn and @JoinTable

### @JoinColumn - Customize Foreign Key Column

Used with `@ManyToOne` and `@OneToOne` to specify the foreign key column name.

```java
@Entity
public class Invoice {
    @ManyToOne
    @JoinColumn(
        name = "customer_id",           // Column name in invoices table
        referencedColumnName = "id",    // Column name in customers table (default: "id")
        nullable = false,                // Cannot be null
        foreignKey = @ForeignKey(name = "fk_invoice_customer")
    )
    private Customer customer;
}
```

**Generated SQL**:
```sql
CREATE TABLE invoices (
    id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id)
        REFERENCES customers(id)
);
```

### @JoinTable - Customize Join Table

Used with `@ManyToMany` to specify the join table details.

```java
@Entity
public class Student {
    @ManyToMany
    @JoinTable(
        name = "student_course",                      // Join table name
        joinColumns = @JoinColumn(name = "student_id"),           // FK to students
        inverseJoinColumns = @JoinColumn(name = "course_id"),     // FK to courses
        uniqueConstraints = @UniqueConstraint(
            columnNames = {"student_id", "course_id"}  // Prevent duplicates
        )
    )
    private Set<Course> courses;
}
```

**Generated SQL**:
```sql
CREATE TABLE student_course (
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

---

## Cascade Types

**Cascade** determines which operations propagate from parent to child entities.

### CascadeType Options

| Type | Effect | When to Use |
|------|--------|-------------|
| `PERSIST` | Saves child when parent is saved | Always save children with parent |
| `MERGE` | Updates child when parent is updated | Update children with parent |
| `REMOVE` | Deletes child when parent is deleted | Delete children when parent deleted |
| `REFRESH` | Reloads child when parent is reloaded | Refresh children with parent |
| `DETACH` | Detaches child when parent is detached | Detach children with parent |
| `ALL` | All of the above | Full lifecycle management |

### Examples

#### CascadeType.PERSIST

```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer", cascade = CascadeType.PERSIST)
    private List<Invoice> invoices = new ArrayList<>();
}

// Usage
Customer customer = new Customer();
Invoice invoice = new Invoice();
customer.addInvoice(invoice);

customerRepository.save(customer);  // ✅ Also saves invoice
// Without cascade: Need to call invoiceRepository.save(invoice) separately
```

#### CascadeType.REMOVE

```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer", cascade = CascadeType.REMOVE)
    private List<Invoice> invoices = new ArrayList<>();
}

// Usage
customerRepository.delete(customer);  // ✅ Also deletes all invoices
// Without cascade: Need to manually delete invoices first
```

#### CascadeType.ALL (Most Common)

```java
@Entity
public class Invoice {
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> items = new ArrayList<>();
}

// Usage
Invoice invoice = new Invoice();
invoice.addItem(new InvoiceLineItem("Product A", 2, new BigDecimal("50")));
invoice.addItem(new InvoiceLineItem("Product B", 1, new BigDecimal("30")));

invoiceRepository.save(invoice);  // Saves invoice + all items
```

### Cascade Best Practices

**✅ DO: Use CASCADE for Composition (Parent owns children)**

```java
// Invoice "owns" its line items - use CASCADE
@OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL)
private List<InvoiceLineItem> items;

// Customer "owns" their addresses - use CASCADE
@OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
private List<Address> addresses;
```

**❌ DON'T: Use CASCADE for References (Independent entities)**

```java
// Invoice references Customer, but doesn't own it - NO CASCADE
@ManyToOne  // No cascade!
@JoinColumn(name = "customer_id")
private Customer customer;

// Student references Courses - NO CASCADE (courses exist independently)
@ManyToMany  // No cascade!
@JoinTable(name = "student_course")
private Set<Course> courses;
```

**Rule of Thumb**:
- Use CASCADE when child cannot exist without parent (composition)
- Don't use CASCADE when child can exist independently (association)

---

## orphanRemoval

**orphanRemoval** automatically deletes child entities when they're removed from the parent's collection.

### Without orphanRemoval

```java
@Entity
public class Invoice {
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL)
    private List<InvoiceLineItem> items = new ArrayList<>();
}

// Usage
Invoice invoice = invoiceRepository.findById(1L).orElseThrow();
invoice.getItems().remove(0);  // Remove first item
invoiceRepository.save(invoice);

// Result: Item is orphaned (invoice_id set to NULL), but NOT deleted
```

### With orphanRemoval

```java
@Entity
public class Invoice {
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> items = new ArrayList<>();
}

// Usage
Invoice invoice = invoiceRepository.findById(1L).orElseThrow();
invoice.getItems().remove(0);  // Remove first item
invoiceRepository.save(invoice);

// Result: Item is DELETED from database
```

**When to Use**:
- Use `orphanRemoval = true` when child entity has no meaning without parent
- Examples: InvoiceLineItems, OrderDetails, Comments

**When NOT to Use**:
- When child entity can exist independently
- Example: Products (removing from invoice shouldn't delete the product)

---

## Fetch Types: LAZY vs EAGER

**Fetch type** determines WHEN related entities are loaded from the database.

### FetchType.LAZY (Recommended Default)

```java
@Entity
public class Invoice {
    @ManyToOne(fetch = FetchType.LAZY)  // Not loaded until accessed
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "invoice", fetch = FetchType.LAZY)
    private List<InvoiceLineItem> items = new ArrayList<>();
}

// Usage
Invoice invoice = invoiceRepository.findById(1L).orElseThrow();
// Query: SELECT * FROM invoices WHERE id = 1
// Customer and items NOT loaded yet

String customerName = invoice.getCustomer().getName();
// NOW queries customer: SELECT * FROM customers WHERE id = ?

invoice.getItems().size();
// NOW queries items: SELECT * FROM invoice_line_items WHERE invoice_id = ?
```

**When to Use**:
- Default for all relationships
- When you don't always need the related data
- Helps avoid loading unnecessary data

**Pitfall - LazyInitializationException**:
```java
@Service
public class InvoiceService {
    @Transactional
    public Invoice getInvoice(Long id) {
        return invoiceRepository.findById(id).orElseThrow();
    }
}

// Controller
Invoice invoice = invoiceService.getInvoice(1L);
// Transaction closed here

invoice.getCustomer().getName();  // ❌ LazyInitializationException!
// Customer wasn't loaded, and transaction is closed
```

### FetchType.EAGER

```java
@Entity
public class Invoice {
    @ManyToOne(fetch = FetchType.EAGER)  // Loaded immediately
    @JoinColumn(name = "customer_id")
    private Customer customer;
}

// Usage
Invoice invoice = invoiceRepository.findById(1L).orElseThrow();
// Query: SELECT * FROM invoices i
//        LEFT JOIN customers c ON i.customer_id = c.id
//        WHERE i.id = 1
// Customer loaded immediately

String name = invoice.getCustomer().getName();  // No additional query
```

**When to Use**:
- When you ALWAYS need the related data
- For small, frequently accessed relationships

**Pitfalls**:
```java
// ❌ BAD - Everything is EAGER
@OneToMany(fetch = FetchType.EAGER)
private List<Invoice> invoices;

@OneToMany(fetch = FetchType.EAGER)
private List<InvoiceLineItem> items;

// Loading one customer loads:
// - All invoices
// - All items for each invoice
// - Potentially HUGE amount of data!
```

### Default Fetch Types

| Relationship | Default |
|--------------|---------|
| `@OneToOne` | EAGER |
| `@ManyToOne` | EAGER |
| `@OneToMany` | LAZY |
| `@ManyToMany` | LAZY |

**Best Practice**: Explicitly specify fetch type:

```java
// Override defaults to be explicit
@ManyToOne(fetch = FetchType.LAZY)  // Good: explicit
private Customer customer;

@OneToMany(fetch = FetchType.LAZY)  // Good: explicit (though it's default)
private List<Invoice> invoices;
```

---

## Fetching Strategies

### Problem: N+1 Query Problem

```java
// ❌ BAD - N+1 queries
List<Invoice> invoices = invoiceRepository.findAll();
// Query 1: SELECT * FROM invoices

for (Invoice invoice : invoices) {
    System.out.println(invoice.getCustomer().getName());
    // Query 2, 3, 4, ..., N+1: SELECT * FROM customers WHERE id = ?
}

// Result: 1 + N queries (if 100 invoices, 101 queries!)
```

### Solution 1: JOIN FETCH (JPQL)

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer")
    List<Invoice> findAllWithCustomer();
}

// Usage
List<Invoice> invoices = invoiceRepository.findAllWithCustomer();
// Query: SELECT * FROM invoices i
//        JOIN customers c ON i.customer_id = c.id
// Single query - NO N+1 problem!

for (Invoice invoice : invoices) {
    System.out.println(invoice.getCustomer().getName());  // No additional query
}
```

**Multiple Joins**:
```java
@Query("SELECT i FROM Invoice i " +
       "JOIN FETCH i.customer " +
       "JOIN FETCH i.items")
List<Invoice> findAllWithCustomerAndItems();
```

**Warning - Cartesian Product**:
```java
// ❌ BAD - Two JOIN FETCH on collections creates Cartesian product
@Query("SELECT c FROM Customer c " +
       "JOIN FETCH c.invoices " +
       "JOIN FETCH c.addresses")  // Results in N × M rows!
List<Customer> findAllWithInvoicesAndAddresses();
```

**✅ Fix with Multiple Queries**:
```java
@Query("SELECT DISTINCT c FROM Customer c JOIN FETCH c.invoices")
List<Customer> findAllWithInvoices();

@Query("SELECT DISTINCT c FROM Customer c JOIN FETCH c.addresses")
List<Customer> findAllWithAddresses();
```

### Solution 2: @EntityGraph

```java
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @EntityGraph(attributePaths = {"customer"})
    List<Invoice> findAll();

    @EntityGraph(attributePaths = {"customer", "items"})
    Optional<Invoice> findById(Long id);
}

// Usage - same as JOIN FETCH, but more declarative
List<Invoice> invoices = invoiceRepository.findAll();
// Single query with JOIN
```

**Named Entity Graphs** (more reusable):
```java
@Entity
@NamedEntityGraph(
    name = "Invoice.customer",
    attributeNodes = @NamedAttributeNode("customer")
)
@NamedEntityGraph(
    name = "Invoice.full",
    attributeNodes = {
        @NamedAttributeNode("customer"),
        @NamedAttributeNode("items")
    }
)
public class Invoice {
    // ...
}

// Repository
@EntityGraph("Invoice.customer")
List<Invoice> findAll();

@EntityGraph("Invoice.full")
Optional<Invoice> findById(Long id);
```

### Solution 3: Batch Fetching

```java
@Entity
public class Invoice {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @BatchSize(size = 10)  // Fetch 10 customers at once
    private Customer customer;
}

// Usage
List<Invoice> invoices = invoiceRepository.findAll();
// Query 1: SELECT * FROM invoices

for (Invoice invoice : invoices) {
    invoice.getCustomer().getName();
}
// Query 2: SELECT * FROM customers WHERE id IN (?, ?, ?, ..., ?)
// Instead of N queries, only 1 + (N/10) queries
```

### Comparison

| Strategy | Pros | Cons |
|----------|------|------|
| **JOIN FETCH** | Single query, explicit | Can't use with pagination, verbose |
| **@EntityGraph** | Clean, reusable | Less flexible than JOIN FETCH |
| **@BatchSize** | Works with pagination | Still multiple queries |

---

## Avoiding Circular JSON References

### Problem: Infinite Recursion

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

// Result: Infinite loop!
// Customer → invoices → each invoice → customer → invoices → ...
// StackOverflowError or infinite JSON
```

### Solution 1: @JsonManagedReference / @JsonBackReference

```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    @JsonManagedReference  // Include in JSON
    private List<Invoice> invoices;
}

@Entity
public class Invoice {
    @ManyToOne
    @JsonBackReference  // Exclude from JSON
    private Customer customer;
}

// Result:
// {
//   "id": 1,
//   "name": "Acme Corp",
//   "invoices": [
//     {"id": 1, "total": 100},  // No customer field
//     {"id": 2, "total": 200}
//   ]
// }
```

### Solution 2: @JsonIgnore

```java
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    @JsonIgnore  // Don't serialize invoices at all
    private List<Invoice> invoices;
}
```

### Solution 3: @JsonIgnoreProperties

```java
@Entity
public class Invoice {
    @ManyToOne
    @JsonIgnoreProperties("invoices")  // Ignore customer's invoices
    private Customer customer;
}
```

### Solution 4: DTOs (Best Practice)

```java
// Don't return entities directly - use DTOs
public class CustomerDTO {
    private Long id;
    private String name;
    private List<InvoiceSummaryDTO> invoices;

    public static CustomerDTO from(Customer customer) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(customer.getId());
        dto.setName(customer.getName());
        dto.setInvoices(customer.getInvoices().stream()
            .map(InvoiceSummaryDTO::from)
            .collect(Collectors.toList()));
        return dto;
    }
}

public class InvoiceSummaryDTO {
    private Long id;
    private BigDecimal total;
    // No customer field - avoid circular reference
}

// Controller
@GetMapping("/customers/{id}")
public CustomerDTO getCustomer(@PathVariable Long id) {
    Customer customer = customerRepository.findById(id).orElseThrow();
    return CustomerDTO.from(customer);
}
```

---

## Complete InvoiceManager Relationship Examples

### Database Schema

```
customers                    invoices                      invoice_line_items
+----+-------+              +----+-------------+           +----+------------+----------+------+-------+
| id | name  |              | id | customer_id |           | id | invoice_id | product  | qty  | price |
+----+-------+              +----+-------------+           +----+------------+----------+------+-------+
| 1  | Acme  |<-------------| 1  | 1           |<----------| 1  | 1          | Laptop   | 2    | 1000  |
+----+-------+      |       +----+-------------+   |       +----+------------+----------+------+-------+
                    |       | 2  | 1           |<--+       | 2  | 1          | Mouse    | 5    | 25    |
                    |       +----+-------------+   |       +----+------------+----------+------+-------+
                    |                               +-------| 3  | 2          | Keyboard | 3    | 50    |
                    |                                       +----+------------+----------+------+-------+
                    +-------| 3  | 2           |
                            +----+-------------+
```

### Customer Entity

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

    private String phone;
    private String address;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Invoice> invoices = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Customer() {
        this.createdAt = LocalDateTime.now();
    }

    public Customer(String name, String email) {
        this();
        this.name = name;
        this.email = email;
    }

    // Helper methods
    public void addInvoice(Invoice invoice) {
        invoices.add(invoice);
        invoice.setCustomer(this);
    }

    public void removeInvoice(Invoice invoice) {
        invoices.remove(invoice);
        invoice.setCustomer(null);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public List<Invoice> getInvoices() { return invoices; }
    public void setInvoices(List<Invoice> invoices) { this.invoices = invoices; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Customer)) return false;
        Customer customer = (Customer) o;
        return Objects.equals(id, customer.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

### Invoice Entity

```java
@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonBackReference
    private Customer customer;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> items = new ArrayList<>();

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Invoice() {
        this.createdAt = LocalDateTime.now();
        this.invoiceDate = LocalDate.now();
        this.status = InvoiceStatus.DRAFT;
        this.total = BigDecimal.ZERO;
    }

    // Helper methods
    public void addItem(InvoiceLineItem item) {
        items.add(item);
        item.setInvoice(this);
        recalculateTotal();
    }

    public void removeItem(InvoiceLineItem item) {
        items.remove(item);
        item.setInvoice(null);
        recalculateTotal();
    }

    public void recalculateTotal() {
        this.total = items.stream()
            .map(InvoiceLineItem::getLineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public List<InvoiceLineItem> getItems() { return items; }
    public void setItems(List<InvoiceLineItem> items) { this.items = items; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public InvoiceStatus getStatus() { return status; }
    public void setStatus(InvoiceStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Invoice)) return false;
        Invoice invoice = (Invoice) o;
        return Objects.equals(id, invoice.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

// Enum
public enum InvoiceStatus {
    DRAFT, SENT, PAID, OVERDUE, CANCELLED
}
```

### InvoiceLineItem Entity

```java
@Entity
@Table(name = "invoice_line_items")
public class InvoiceLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    @JsonIgnore
    private Invoice invoice;

    @Column(nullable = false)
    private String product;

    @Column(nullable = false)
    private int quantity;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    // Constructors
    public InvoiceLineItem() {}

    public InvoiceLineItem(String product, int quantity, BigDecimal price) {
        this.product = product;
        this.quantity = quantity;
        this.price = price;
    }

    // Business method
    public BigDecimal getLineTotal() {
        return price.multiply(BigDecimal.valueOf(quantity));
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof InvoiceLineItem)) return false;
        InvoiceLineItem that = (InvoiceLineItem) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

### Repository Interfaces

```java
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);

    @EntityGraph(attributePaths = {"invoices"})
    Optional<Customer> findWithInvoicesById(Long id);

    List<Customer> findByNameContainingIgnoreCase(String name);
}

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByCustomer(Customer customer);

    List<Invoice> findByCustomerId(Long customerId);

    List<Invoice> findByStatus(InvoiceStatus status);

    List<Invoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer WHERE i.id = :id")
    Optional<Invoice> findByIdWithCustomer(@Param("id") Long id);

    @Query("SELECT i FROM Invoice i " +
           "JOIN FETCH i.customer " +
           "JOIN FETCH i.items " +
           "WHERE i.id = :id")
    Optional<Invoice> findByIdWithCustomerAndItems(@Param("id") Long id);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.customer WHERE i.status = :status")
    List<Invoice> findByStatusWithCustomer(@Param("status") InvoiceStatus status);
}

@Repository
public interface InvoiceLineItemRepository extends JpaRepository<InvoiceLineItem, Long> {

    List<InvoiceLineItem> findByInvoice(Invoice invoice);

    @Query("SELECT item FROM InvoiceLineItem item WHERE item.invoice.id = :invoiceId")
    List<InvoiceLineItem> findByInvoiceId(@Param("invoiceId") Long invoiceId);
}
```

### Service Example

```java
@Service
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;

    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
    }

    public Invoice createInvoice(Long customerId, List<InvoiceLineItemDTO> itemDTOs) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new CustomerNotFoundException(customerId));

        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        invoice.setDueDate(LocalDate.now().plusDays(30));

        for (InvoiceLineItemDTO dto : itemDTOs) {
            InvoiceLineItem item = new InvoiceLineItem(
                dto.getProduct(),
                dto.getQuantity(),
                dto.getPrice()
            );
            invoice.addItem(item);
        }

        return invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceWithDetails(Long id) {
        return invoiceRepository.findByIdWithCustomerAndItems(id)
            .orElseThrow(() -> new InvoiceNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public List<Invoice> getCustomerInvoices(Long customerId) {
        return invoiceRepository.findByCustomerId(customerId);
    }

    public Invoice addItemToInvoice(Long invoiceId, InvoiceLineItemDTO itemDTO) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        InvoiceLineItem item = new InvoiceLineItem(
            itemDTO.getProduct(),
            itemDTO.getQuantity(),
            itemDTO.getPrice()
        );

        invoice.addItem(item);
        return invoiceRepository.save(invoice);
    }

    public void markAsPaid(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        invoice.setStatus(InvoiceStatus.PAID);
        invoiceRepository.save(invoice);
    }
}
```

---

## Common Relationship Mistakes and Solutions

### Mistake 1: Not Synchronizing Bidirectional Relationships

```java
// ❌ BAD
Customer customer = new Customer();
Invoice invoice = new Invoice();
invoice.setCustomer(customer);
customerRepository.save(customer);
// invoice not in customer.getInvoices()!

// ✅ GOOD - Use helper method
customer.addInvoice(invoice);  // Synchronizes both sides
customerRepository.save(customer);
```

### Mistake 2: Forgetting to Initialize Collections

```java
// ❌ BAD
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    private List<Invoice> invoices;  // null!
}

customer.getInvoices().add(invoice);  // NullPointerException!

// ✅ GOOD
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    private List<Invoice> invoices = new ArrayList<>();  // Initialized
}
```

### Mistake 3: Using CascadeType.ALL on @ManyToOne

```java
// ❌ BAD - Deleting invoice deletes customer!
@Entity
public class Invoice {
    @ManyToOne(cascade = CascadeType.ALL)  // Don't do this!
    private Customer customer;
}

invoiceRepository.delete(invoice);  // Also deletes customer!

// ✅ GOOD - No cascade on many-to-one references
@Entity
public class Invoice {
    @ManyToOne  // No cascade
    private Customer customer;
}
```

### Mistake 4: Using List for @ManyToMany

```java
// ❌ BAD - Can have duplicates, poor performance
@ManyToMany
private List<Course> courses = new ArrayList<>();

student.getCourses().add(course);
student.getCourses().add(course);  // Duplicate!
// Creates duplicate entries in join table

// ✅ GOOD - Use Set
@ManyToMany
private Set<Course> courses = new HashSet<>();

student.getCourses().add(course);
student.getCourses().add(course);  // No duplicate
```

### Mistake 5: Not Overriding equals() and hashCode()

```java
// ❌ BAD - Set and @ManyToMany won't work correctly
@Entity
public class Course {
    // No equals() and hashCode()
}

Set<Course> courses = new HashSet<>();
courses.add(course);
courses.add(course);  // Added twice (object identity)!

// ✅ GOOD - Override based on ID
@Entity
public class Course {
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Course)) return false;
        Course course = (Course) o;
        return Objects.equals(id, course.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

### Mistake 6: Accessing LAZY Collections Outside Transaction

```java
// ❌ BAD
@Service
public class CustomerService {
    public List<String> getInvoiceNumbers(Long customerId) {
        Customer customer = customerRepository.findById(customerId).orElseThrow();
        // Transaction ends here

        return customer.getInvoices().stream()  // LazyInitializationException!
            .map(Invoice::getId)
            .map(String::valueOf)
            .collect(Collectors.toList());
    }
}

// ✅ GOOD - Fetch in transaction
@Service
public class CustomerService {
    @Transactional(readOnly = true)
    public List<String> getInvoiceNumbers(Long customerId) {
        Customer customer = customerRepository.findWithInvoicesById(customerId)
            .orElseThrow();
        // Transaction still active

        return customer.getInvoices().stream()
            .map(Invoice::getId)
            .map(String::valueOf)
            .collect(Collectors.toList());
    }
}
```

### Mistake 7: Forgetting orphanRemoval

```java
// ❌ BAD - Orphaned items left in database
@OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL)
private List<InvoiceLineItem> items;

invoice.getItems().remove(0);
invoiceRepository.save(invoice);
// Item still exists with invoice_id = null!

// ✅ GOOD - Orphans are deleted
@OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
private List<InvoiceLineItem> items;

invoice.getItems().remove(0);
invoiceRepository.save(invoice);
// Item is deleted from database
```

---

## Self-Check Questions

1. **What's the difference between unidirectional and bidirectional relationships?**
   <details>
   <summary>Answer</summary>

   - **Unidirectional**: Only one entity has a reference to the other
   - **Bidirectional**: Both entities have references to each other
   - Use unidirectional by default; add bidirectional only when needed for navigation
   </details>

2. **What does `mappedBy` do?**
   <details>
   <summary>Answer</summary>

   `mappedBy` indicates which side of a bidirectional relationship owns the foreign key. The side WITH `mappedBy` doesn't own the relationship; the other side does.
   </details>

3. **When should you use `orphanRemoval = true`?**
   <details>
   <summary>Answer</summary>

   Use when child entities have no meaning without their parent. Example: InvoiceLineItems belong to Invoice - if removed from invoice, they should be deleted.
   </details>

4. **Why is FetchType.LAZY preferred over EAGER?**
   <details>
   <summary>Answer</summary>

   - LAZY loads data only when accessed (performance)
   - EAGER loads everything upfront (can load huge amounts of data unnecessarily)
   - Default to LAZY; use EAGER only for small, frequently accessed relationships
   </details>

5. **What causes the N+1 query problem?**
   <details>
   <summary>Answer</summary>

   Loading a list of entities (1 query), then accessing LAZY-loaded relationships in a loop (N additional queries). Fix with JOIN FETCH or @EntityGraph.
   </details>

---

## Practice Exercises

### Exercise 1: Blog System

Create entities for a blog system:
- User (has many Posts and Comments)
- Post (belongs to User, has many Comments)
- Comment (belongs to User and Post)

<details>
<summary>Solution</summary>

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL)
    private List<Post> posts = new ArrayList<>();

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL)
    private List<Comment> comments = new ArrayList<>();
}

@Entity
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();
}

@Entity
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;
}
```
</details>

### Exercise 2: E-commerce Order System

Create entities for:
- Customer (has many Orders)
- Order (belongs to Customer, has many OrderItems, references many Products)
- Product (referenced by OrderItems)
- OrderItem (belongs to Order, references Product)

<details>
<summary>Solution</summary>

```java
@Entity
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    private List<Order> orders = new ArrayList<>();
}

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    private LocalDateTime orderDate;
}

@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal price;
}

@Entity
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;
    private BigDecimal price;
}
```
</details>

---

## Summary

**Key Takeaways**:

1. **Relationships**: @OneToOne, @OneToMany/@ManyToOne, @ManyToMany
2. **Directionality**: Start unidirectional, add bidirectional only when needed
3. **mappedBy**: Indicates inverse side of bidirectional relationship
4. **Cascade**: Use for composition (parent owns children), not for references
5. **orphanRemoval**: Delete children when removed from collection
6. **Fetch Types**: Default to LAZY; avoid loading unnecessary data
7. **N+1 Problem**: Use JOIN FETCH or @EntityGraph
8. **JSON Circular References**: Use DTOs, @JsonIgnore, or @JsonManagedReference/@JsonBackReference
9. **Collections**: Initialize to empty collection; use Set for @ManyToMany
10. **Helper Methods**: Synchronize both sides of bidirectional relationships

**Common Pitfalls**:
- Not synchronizing bidirectional relationships
- Using CASCADE on @ManyToOne references
- Not initializing collections
- Accessing LAZY collections outside transactions
- Forgetting to override equals() and hashCode()

---

## Navigation

**Previous:**
- [Query Methods](./03-queries.md) - Custom queries and specifications

**Next:**
- [Best Practices](./05-best-practices.md) - Performance, transactions, testing

**Related:**
- [JPA Basics](./01-jpa-basics.md) - Entity fundamentals
- [Repository Pattern](./02-repositories.md) - Data access layer

---

**Module Index:** [Spring Data JPA Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
