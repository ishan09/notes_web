# Build-Along Project: InvoiceManager Application

> **Purpose**: Build a real working application incrementally as you learn each topic. By the end, you'll have a portfolio-ready project demonstrating all key Java/Spring concepts.

## Why This Approach Works

**Traditional learning**:
```
Learn Streams → Forget
Learn Spring DI → Forget
Learn JPA → Forget
Interview: "Show me your projects" → Panic!
```

**Build-along learning**:
```
Week 1: Invoice CRUD (OOP, Java 8)
Week 2: Add Spring DI + REST API
Week 3: Add database + security
Week 4: Add microservices + observability
Interview: "Here's my InvoiceManager on GitHub"
```

**Benefits**:
- ✅ **Context**: Every concept has a purpose
- ✅ **Retention**: See how pieces fit together
- ✅ **Portfolio**: Working app for interviews
- ✅ **Debugging**: Real problems, real solutions
- ✅ **Confidence**: "I built this!"

---

## Project Overview: InvoiceManager

**What it does**: A web application to manage invoices for small businesses

**Core features**:
- Create, read, update, delete invoices
- Customer management
- Product/service catalog
- Invoice line items with calculations
- User authentication and authorization
- REST API
- Database persistence
- PDF generation
- Email notifications

**Tech stack** (added progressively):
```
Week 1: Pure Java (OOP, Collections, Streams)
Week 2: Spring Core, Spring Boot, REST API
Week 3: Spring Data JPA, PostgreSQL, Spring Security
Week 4: Microservices, Kafka, Docker, Testing
```

---

## Week 1: Core Java Foundation

### Topics Covered
- OOP principles (encapsulation, inheritance, polymorphism)
- Java 8 features (Streams, Optional, LocalDate)
- Collections (List, Map, Set)
- Exception handling

### Week 1 Checkpoint: Console Application

**What you'll build**: Basic invoice management with in-memory storage

**Domain model**:
```java
// Customer.java
public class Customer {
    private String id;
    private String name;
    private String email;
    private String address;
    // constructors, getters, setters
}

// Product.java
public class Product {
    private String id;
    private String name;
    private double price;
    // constructors, getters, setters
}

// InvoiceLineItem.java
public class InvoiceLineItem {
    private Product product;
    private int quantity;
    private double subtotal;
    // constructors, getters, methods
}

// Invoice.java
public class Invoice {
    private String id;
    private Customer customer;
    private LocalDate date;
    private List<InvoiceLineItem> lineItems;
    private double total;
    // constructors, getters, methods to calculate total
}
```

**Services**:
```java
// InvoiceService.java
public class InvoiceService {
    private Map<String, Invoice> invoices = new HashMap<>();

    public Invoice create(Customer customer, List<InvoiceLineItem> items) {
        // Generate ID, create invoice, store in map
    }

    public Optional<Invoice> findById(String id) {
        return Optional.ofNullable(invoices.get(id));
    }

    public List<Invoice> findByCustomer(Customer customer) {
        return invoices.values().stream()
            .filter(inv -> inv.getCustomer().equals(customer))
            .collect(Collectors.toList());
    }

    public double getTotalRevenue() {
        return invoices.values().stream()
            .mapToDouble(Invoice::getTotal)
            .sum();
    }
}
```

**Practice exercises mapped to topics**:

| Topic | Add to InvoiceManager |
|-------|----------------------|
| **OOP Encapsulation** | Make all fields private, add getters/setters |
| **OOP Inheritance** | Create `PremiumCustomer extends Customer` with discount |
| **Java 8 Streams** | Filter invoices by date range, calculate totals |
| **Java 8 Optional** | Handle missing invoices/customers gracefully |
| **Collections** | Use appropriate collection for each use case |

**By end of Week 1, you can**:
- Create invoices via console
- List all invoices
- Find invoices by customer
- Calculate total revenue
- Handle errors gracefully

---

## Week 2: Spring Framework & REST API

### Topics Covered
- Spring Core (IoC, DI)
- Spring Boot
- REST API with Spring MVC
- Configuration and profiles

### Week 2 Checkpoint: REST API

**What you'll add**: Convert to Spring Boot with REST endpoints

**Refactoring**:

```java
// CustomerRepository.java
@Repository
public class CustomerRepository {
    private Map<String, Customer> customers = new ConcurrentHashMap<>();

    public Customer save(Customer customer) { /* ... */ }
    public Optional<Customer> findById(String id) { /* ... */ }
    public List<Customer> findAll() { /* ... */ }
}

// InvoiceService.java (now with DI)
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;

    // Constructor injection
    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
    }

    public Invoice createInvoice(CreateInvoiceRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
            .orElseThrow(() -> new CustomerNotFoundException(request.getCustomerId()));
        // Create and save invoice
    }
}

// InvoiceController.java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceService invoiceService;

    @Autowired
    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    public ResponseEntity<Invoice> createInvoice(@RequestBody CreateInvoiceRequest request) {
        Invoice invoice = invoiceService.createInvoice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoice(@PathVariable String id) {
        return invoiceService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(invoiceService.findAll());
    }
}
```

**Practice exercises mapped to topics**:

| Topic | Add to InvoiceManager |
|-------|----------------------|
| **Spring DI** | Refactor services to use constructor injection |
| **Spring Boot** | Create Spring Boot app with proper project structure |
| **REST API** | Add endpoints for CRUD operations |
| **Configuration** | Externalize config (application.yml) |
| **Validation** | Add `@Valid` annotations for request validation |

**By end of Week 2, you can**:
- Make HTTP requests to create/read/update/delete invoices
- Test with Postman or curl
- Use proper REST conventions
- Handle errors with proper HTTP status codes

---

## Week 3: Database & Security

### Topics Covered
- Spring Data JPA
- Database design & PostgreSQL
- Spring Security (authentication, JWT)
- Transaction management

### Week 3 Checkpoint: Persistent Data + Auth

**What you'll add**: Database persistence and user authentication

**Database schema**:
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50)
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    product_id UUID REFERENCES products(id),
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);
```

**JPA entities**:
```java
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "invoice_date")
    private LocalDate date;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> lineItems = new ArrayList<>();

    private BigDecimal total;

    // Methods to calculate total, add line items, etc.
}

// Repository
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByCustomerId(UUID customerId);
    List<Invoice> findByDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT SUM(i.total) FROM Invoice i WHERE i.date BETWEEN :start AND :end")
    BigDecimal getTotalRevenueBetween(@Param("start") LocalDate start,
                                      @Param("end") LocalDate end);
}
```

**Security config**:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/invoices/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

**Practice exercises mapped to topics**:

| Topic | Add to InvoiceManager |
|-------|----------------------|
| **JPA Entities** | Convert domain models to JPA entities |
| **Repositories** | Replace in-memory storage with JPA repositories |
| **Queries** | Add custom queries for reporting |
| **Transactions** | Ensure invoice creation is transactional |
| **Spring Security** | Add JWT-based authentication |
| **Authorization** | Role-based access (USER vs ADMIN) |

**By end of Week 3, you can**:
- Data persists in PostgreSQL
- User login with JWT tokens
- Role-based access control
- Transactional integrity

---

## Week 4: Microservices & Advanced Topics

### Topics Covered
- Microservices architecture
- Service discovery (Eureka)
- API Gateway
- Messaging (Kafka)
- Testing strategies
- Observability

### Week 4 Checkpoint: Microservices Architecture

**What you'll add**: Split into microservices

**Architecture**:
```
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Spring Cloud) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Invoice   │  │  Customer  │  │  Notification│
     │  Service   │  │  Service   │  │  Service    │
     └─────┬──────┘  └──────┬─────┘  └──────┬──────┘
           │                │                │
           ▼                ▼                ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ PostgreSQL │  │ PostgreSQL │  │   Kafka    │
     └────────────┘  └────────────┘  └────────────┘
```

**Services**:

1. **Invoice Service** (8081)
   - Manages invoices and line items
   - Publishes events when invoice created

2. **Customer Service** (8082)
   - Manages customer data
   - Provides customer lookup API

3. **Notification Service** (8083)
   - Listens to Kafka events
   - Sends email when invoice created

**Example: Event-driven flow**:

```java
// Invoice Service - publishes event
@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final KafkaTemplate<String, InvoiceCreatedEvent> kafkaTemplate;

    public Invoice createInvoice(CreateInvoiceRequest request) {
        Invoice invoice = // create invoice
        repository.save(invoice);

        // Publish event
        InvoiceCreatedEvent event = new InvoiceCreatedEvent(
            invoice.getId(),
            invoice.getCustomer().getEmail(),
            invoice.getTotal()
        );
        kafkaTemplate.send("invoice-created", event);

        return invoice;
    }
}

// Notification Service - consumes event
@Service
public class NotificationListener {
    private final EmailService emailService;

    @KafkaListener(topics = "invoice-created", groupId = "notification-service")
    public void handleInvoiceCreated(InvoiceCreatedEvent event) {
        emailService.sendInvoiceCreatedEmail(
            event.getCustomerEmail(),
            event.getInvoiceId(),
            event.getTotal()
        );
    }
}
```

**Practice exercises mapped to topics**:

| Topic | Add to InvoiceManager |
|-------|----------------------|
| **Microservices** | Split into 3 services |
| **Service Discovery** | Add Eureka server and clients |
| **API Gateway** | Route requests through gateway |
| **Feign Clients** | Invoice service calls Customer service |
| **Kafka** | Event-driven notifications |
| **Circuit Breaker** | Add Resilience4j for fault tolerance |
| **Testing** | Unit, integration, contract tests |
| **Observability** | Add Spring Boot Actuator, distributed tracing |

**By end of Week 4, you have**:
- Full microservices architecture
- Event-driven communication
- Resilient, scalable system
- Production-ready monitoring

---

## Incremental Build Guide

### Daily Commits

Track your progress with Git:

```bash
git commit -m "Day 1: Add Customer and Invoice domain models"
git commit -m "Day 2: Implement InvoiceService with Stream API"
git commit -m "Day 7: Add Spring Boot and REST controllers"
git commit -m "Day 14: Add JPA persistence and PostgreSQL"
git commit -m "Day 21: Split into microservices"
```

### Weekly Demos

End of each week, create a demo:
- **Week 1**: Console app walkthrough (video/README)
- **Week 2**: Postman collection testing REST API
- **Week 3**: Login flow + creating invoice with JWT
- **Week 4**: Full system demo (API Gateway → services → Kafka)

### GitHub Structure

```
invoice-manager/
├── README.md (with architecture diagram)
├── week1-console/          # Pure Java version
├── week2-rest-api/         # Spring Boot monolith
├── week3-with-db/          # + PostgreSQL + Security
└── week4-microservices/    # Final architecture
    ├── api-gateway/
    ├── invoice-service/
    ├── customer-service/
    ├── notification-service/
    ├── docker-compose.yml
    └── README.md
```

---

## Topic-to-Feature Mapping

Here's how each study topic maps to the project:

### Core Java
- **OOP**: Domain models (Customer, Invoice, Product)
- **Collections**: Storing invoices, customers in maps/lists
- **Streams**: Filtering invoices, calculating totals
- **Optional**: Handling missing entities
- **LocalDate**: Invoice dates
- **Exceptions**: Custom exceptions (CustomerNotFoundException)

### Spring Core
- **IoC/DI**: Service and repository injection
- **Bean scopes**: Singleton services, prototype for stateful objects
- **Configuration**: application.yml properties

### Spring Boot
- **Auto-configuration**: Minimal setup
- **Starters**: web, data-jpa, security starters
- **Actuator**: Health checks, metrics

### Spring Data JPA
- **Entities**: Invoice, Customer, Product, LineItem
- **Repositories**: CRUD + custom queries
- **Relationships**: @ManyToOne, @OneToMany
- **Transactions**: @Transactional on service methods

### Spring Security
- **Authentication**: JWT-based login
- **Authorization**: Role-based access (USER, ADMIN)
- **Security filters**: JWT validation filter

### Microservices
- **Service decomposition**: 3 bounded contexts
- **Service discovery**: Eureka registration
- **API Gateway**: Routing, load balancing
- **Inter-service communication**: Feign clients
- **Async messaging**: Kafka events
- **Circuit breakers**: Resilience4j

### Testing
- **Unit tests**: Service layer with Mockito
- **Integration tests**: @SpringBootTest, TestContainers
- **Contract tests**: Spring Cloud Contract

### DevOps
- **Docker**: Containerize each service
- **Docker Compose**: Local development environment
- **CI/CD**: GitHub Actions for build/test

---

## Interview Talking Points

When you show this project in interviews:

**"Walk me through your project"**:
> "I built InvoiceManager, a microservices-based invoice management system. It demonstrates Spring Boot, JPA, Security, and event-driven architecture with Kafka. The system is split into 3 services - Invoice, Customer, and Notification - communicating through an API Gateway with Eureka for service discovery."

**"What challenges did you face?"**:
> "Initially, I had N+1 query issues with JPA relationships. I solved it by using `@EntityGraph` for eager fetching specific paths. Another challenge was handling distributed transactions - I implemented the Saga pattern for invoice creation that spans multiple services."

**"How did you test it?"**:
> "I used a testing pyramid approach: unit tests with Mockito for business logic, integration tests with TestContainers for database interactions, and contract tests with Spring Cloud Contract for inter-service communication. I also added Actuator for monitoring in production."

**"How does it scale?"**:
> "Each service can scale independently. The Invoice Service can handle high write load, while Customer Service optimized for reads can scale horizontally. I used Kafka for async processing to decouple services and improve throughput."

---

## Additional Features (Optional Extensions)

Want to go beyond? Add:

1. **PDF Generation**: Generate invoice PDFs with iText
2. **File Upload**: Upload customer logos (AWS S3)
3. **Reporting**: Dashboard with charts (revenue over time)
4. **Multi-tenancy**: Support multiple businesses
5. **Rate Limiting**: Protect API with bucket4j
6. **Caching**: Redis for frequently accessed data
7. **Search**: Elasticsearch for invoice search
8. **Frontend**: React/Angular SPA consuming the API

---

## Checkpoint Validation

After each week, validate your progress:

### Week 1 Checklist
- [ ] Can create invoice with line items
- [ ] Can calculate total correctly
- [ ] Can filter invoices using Streams
- [ ] Handles missing customers with Optional
- [ ] Follows OOP principles (encapsulation, etc.)

### Week 2 Checklist
- [ ] All services use constructor injection
- [ ] REST endpoints follow conventions
- [ ] Can test with Postman/curl
- [ ] Proper error handling with HTTP status codes
- [ ] Configuration externalized

### Week 3 Checklist
- [ ] Data persists in PostgreSQL
- [ ] Can login and get JWT token
- [ ] Protected endpoints require authentication
- [ ] Admin-only endpoints work
- [ ] Transactions work (rollback on error)

### Week 4 Checklist
- [ ] 3 services running independently
- [ ] Services register with Eureka
- [ ] Requests go through API Gateway
- [ ] Invoice creation triggers email notification
- [ ] Can run entire system with docker-compose
- [ ] Has monitoring (Actuator, tracing)

---

## Resources

**Starter code**: [Link to GitHub template] _(create this)_
**Docker Compose**: [Link to docker-compose.yml] _(create this)_
**Postman Collection**: [Link to collection] _(create this)_

---

## Next Steps

1. **Start Week 1**: Create a new project `invoice-manager-week1`
2. **Follow along**: Each topic file now links to this project
3. **Commit daily**: Track progress with Git
4. **Demo weekly**: Show what you built
5. **Interview ready**: Polish final version for portfolio

**Let's build!** 🚀
