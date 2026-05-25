# Building REST APIs with Spring Boot

## Before You Start

Can you answer these?
- What is REST (Representational State Transfer)?
- What are HTTP methods (GET, POST, PUT, DELETE)?
- What are HTTP status codes (200, 201, 400, 404, 500)?
- What is JSON?

If not, spend 15 minutes learning HTTP basics before continuing.

## What is a REST API?

**Simple explanation**: A REST API is a way for applications to communicate over HTTP using standard methods and status codes.

**Analogy**: Restaurant ordering
- **Menu (API documentation)**: Shows what you can order and how
- **Waiter (HTTP)**: Carries requests and responses
- **Kitchen (Server)**: Processes requests
- **Order format (JSON)**: Standard way to structure information

**Example conversation**:
```
You: "GET me the menu"
Waiter: "200 OK - Here's the menu (JSON)"

You: "POST a new order: 1 burger"
Waiter: "201 Created - Order #42"

You: "GET order #42 status"
Waiter: "200 OK - Order ready"

You: "DELETE order #99"
Waiter: "404 Not Found - No such order"
```

## REST Principles (Keep it simple)

1. **Resources**: Everything is a resource (Invoice, Customer, Product)
2. **HTTP Methods**: Use standard methods for operations
   - GET: Retrieve resource
   - POST: Create resource
   - PUT: Update resource (full replacement)
   - PATCH: Update resource (partial)
   - DELETE: Remove resource
3. **Status Codes**: Use standard codes
   - 2xx: Success
   - 4xx: Client error
   - 5xx: Server error
4. **Stateless**: Each request has all needed information

## Spring Boot REST Annotations

### Core Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@RestController` | Marks class as REST controller | `@RestController` |
| `@RequestMapping` | Base URL for controller | `@RequestMapping("/api/invoices")` |
| `@GetMapping` | Handle GET requests | `@GetMapping("/{id}")` |
| `@PostMapping` | Handle POST requests | `@PostMapping` |
| `@PutMapping` | Handle PUT requests | `@PutMapping("/{id}")` |
| `@PatchMapping` | Handle PATCH requests | `@PatchMapping("/{id}")` |
| `@DeleteMapping` | Handle DELETE requests | `@DeleteMapping("/{id}")` |
| `@RequestBody` | Bind JSON to object | `create(@RequestBody Invoice inv)` |
| `@PathVariable` | Extract from URL path | `get(@PathVariable Long id)` |
| `@RequestParam` | Extract from query string | `search(@RequestParam String name)` |
| `@Valid` | Trigger validation | `create(@Valid @RequestBody...)` |

### Response Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@ResponseStatus` | Set HTTP status code | `@ResponseStatus(HttpStatus.CREATED)` |
| `ResponseEntity<T>` | Full control over response | `return ResponseEntity.ok(invoice)` |

## Your First REST Controller

### Step 1: Simple Hello World

```java
package com.example.invoicemanager.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Hello, World!";
    }
}
```

**Try it**:
```bash
# Start app
mvn spring-boot:run

# Test
curl http://localhost:8080/hello
# Output: Hello, World!
```

**What happened?**
1. Spring Boot started embedded Tomcat on port 8080
2. Registered `/hello` endpoint
3. When request arrives, Spring calls `hello()` method
4. Return value automatically converted to HTTP response

### Step 2: Return JSON

```java
@RestController
public class HelloController {

    @GetMapping("/api/status")
    public Map<String, String> status() {
        return Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now().toString()
        );
    }
}
```

**Try it**:
```bash
curl http://localhost:8080/api/status
```

**Output**:
```json
{
  "status": "UP",
  "timestamp": "2026-01-05T10:30:00"
}
```

**What happened?** Spring Boot automatically:
- Serialized Map to JSON (using Jackson)
- Set Content-Type: application/json header
- Returned 200 OK status

**Stop and think**: How does Spring Boot know to convert the Map to JSON?

<details>
<summary>Answer</summary>

Spring Boot auto-configured Jackson ObjectMapper (from spring-boot-starter-web). @RestController implies @ResponseBody, which triggers automatic JSON serialization.
</details>

## Build-Along Project: InvoiceManager REST API

Let's build a complete CRUD API for invoices.

### Domain Model

```java
package com.example.invoicemanager.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String invoiceNumber;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private LocalDate invoiceDate;

    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "invoice_id")
    private List<InvoiceItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    // Getters and setters
}

enum InvoiceStatus {
    DRAFT, SENT, PAID, OVERDUE, CANCELLED
}
```

```java
@Entity
@Table(name = "invoice_items")
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String description;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    // Getters and setters
}
```

### Repository

```java
package com.example.invoicemanager.repository;

import com.example.invoicemanager.entity.Invoice;
import com.example.invoicemanager.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByCustomerId(Long customerId);

    List<Invoice> findByStatus(InvoiceStatus status);

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    List<Invoice> findByDueDateBefore(LocalDate date);

    boolean existsByInvoiceNumber(String invoiceNumber);
}
```

### Service Layer

```java
package com.example.invoicemanager.service;

import com.example.invoicemanager.entity.Invoice;
import com.example.invoicemanager.entity.InvoiceStatus;
import com.example.invoicemanager.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class InvoiceService {

    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public List<Invoice> findAll() {
        return repository.findAll();
    }

    public Invoice findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new InvoiceNotFoundException(id));
    }

    public List<Invoice> findByCustomerId(Long customerId) {
        return repository.findByCustomerId(customerId);
    }

    public List<Invoice> findByStatus(InvoiceStatus status) {
        return repository.findByStatus(status);
    }

    @Transactional
    public Invoice create(Invoice invoice) {
        // Validate
        if (repository.existsByInvoiceNumber(invoice.getInvoiceNumber())) {
            throw new DuplicateInvoiceNumberException(invoice.getInvoiceNumber());
        }

        // Calculate totals
        BigDecimal total = invoice.getItems().stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setTotalAmount(total);

        // Set default status
        if (invoice.getStatus() == null) {
            invoice.setStatus(InvoiceStatus.DRAFT);
        }

        return repository.save(invoice);
    }

    @Transactional
    public Invoice update(Long id, Invoice updatedInvoice) {
        Invoice existing = findById(id);

        // Update fields
        existing.setCustomerId(updatedInvoice.getCustomerId());
        existing.setDueDate(updatedInvoice.getDueDate());
        existing.setStatus(updatedInvoice.getStatus());
        existing.setItems(updatedInvoice.getItems());

        // Recalculate total
        BigDecimal total = existing.getItems().stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        existing.setTotalAmount(total);

        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        Invoice invoice = findById(id);
        repository.delete(invoice);
    }
}
```

### REST Controller (Complete CRUD)

```java
package com.example.invoicemanager.controller;

import com.example.invoicemanager.entity.Invoice;
import com.example.invoicemanager.entity.InvoiceStatus;
import com.example.invoicemanager.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    // GET /api/invoices - List all invoices
    @GetMapping
    public List<Invoice> getAllInvoices() {
        return service.findAll();
    }

    // GET /api/invoices/{id} - Get invoice by ID
    @GetMapping("/{id}")
    public Invoice getInvoiceById(@PathVariable Long id) {
        return service.findById(id);
    }

    // GET /api/invoices?customerId=123 - Filter by customer
    @GetMapping(params = "customerId")
    public List<Invoice> getInvoicesByCustomer(@RequestParam Long customerId) {
        return service.findByCustomerId(customerId);
    }

    // GET /api/invoices?status=PAID - Filter by status
    @GetMapping(params = "status")
    public List<Invoice> getInvoicesByStatus(@RequestParam InvoiceStatus status) {
        return service.findByStatus(status);
    }

    // POST /api/invoices - Create new invoice
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Invoice createInvoice(@Valid @RequestBody Invoice invoice) {
        return service.create(invoice);
    }

    // PUT /api/invoices/{id} - Update invoice
    @PutMapping("/{id}")
    public Invoice updateInvoice(@PathVariable Long id,
                                  @Valid @RequestBody Invoice invoice) {
        return service.update(id, invoice);
    }

    // DELETE /api/invoices/{id} - Delete invoice
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvoice(@PathVariable Long id) {
        service.delete(id);
    }
}
```

### Exception Handling

```java
package com.example.invoicemanager.exception;

public class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(Long id) {
        super("Invoice not found with id: " + id);
    }
}

public class DuplicateInvoiceNumberException extends RuntimeException {
    public DuplicateInvoiceNumberException(String invoiceNumber) {
        super("Invoice number already exists: " + invoiceNumber);
    }
}
```

### Global Exception Handler

```java
package com.example.invoicemanager.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvoiceNotFoundException.class)
    public ProblemDetail handleNotFound(InvoiceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problem.setTitle("Invoice Not Found");
        problem.setProperty("timestamp", LocalDateTime.now());
        return problem;
    }

    @ExceptionHandler(DuplicateInvoiceNumberException.class)
    public ProblemDetail handleDuplicate(DuplicateInvoiceNumberException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT,
            ex.getMessage()
        );
        problem.setTitle("Duplicate Invoice Number");
        problem.setProperty("timestamp", LocalDateTime.now());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Validation failed"
        );
        problem.setTitle("Validation Error");
        problem.setProperty("timestamp", LocalDateTime.now());

        // Add field errors
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .toList();
        problem.setProperty("errors", errors);

        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred"
        );
        problem.setTitle("Internal Server Error");
        problem.setProperty("timestamp", LocalDateTime.now());
        return problem;
    }
}
```

## Testing the API

### Manual Testing with curl

```bash
# 1. Create invoice
curl -X POST http://localhost:8080/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "customerId": 1,
    "invoiceDate": "2026-01-05",
    "dueDate": "2026-02-05",
    "items": [
      {
        "productId": 101,
        "description": "Product A",
        "quantity": 2,
        "unitPrice": 50.00
      },
      {
        "productId": 102,
        "description": "Product B",
        "quantity": 1,
        "unitPrice": 75.00
      }
    ]
  }'

# Response: 201 Created
# {
#   "id": 1,
#   "invoiceNumber": "INV-001",
#   "customerId": 1,
#   "status": "DRAFT",
#   "totalAmount": 175.00,
#   ...
# }

# 2. Get all invoices
curl http://localhost:8080/api/invoices

# 3. Get invoice by ID
curl http://localhost:8080/api/invoices/1

# 4. Filter by customer
curl http://localhost:8080/api/invoices?customerId=1

# 5. Filter by status
curl http://localhost:8080/api/invoices?status=PAID

# 6. Update invoice
curl -X PUT http://localhost:8080/api/invoices/1 \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "customerId": 1,
    "invoiceDate": "2026-01-05",
    "dueDate": "2026-02-05",
    "status": "SENT",
    "items": [...]
  }'

# 7. Delete invoice
curl -X DELETE http://localhost:8080/api/invoices/1

# 8. Try to get deleted invoice (should return 404)
curl http://localhost:8080/api/invoices/1
```

### Testing with REST Client (IntelliJ/VS Code)

Create `requests.http`:

```http
### Create Invoice
POST http://localhost:8080/api/invoices
Content-Type: application/json

{
  "invoiceNumber": "INV-001",
  "customerId": 1,
  "invoiceDate": "2026-01-05",
  "dueDate": "2026-02-05",
  "items": [
    {
      "productId": 101,
      "description": "Product A",
      "quantity": 2,
      "unitPrice": 50.00
    }
  ]
}

### Get All Invoices
GET http://localhost:8080/api/invoices

### Get Invoice by ID
GET http://localhost:8080/api/invoices/1

### Filter by Customer
GET http://localhost:8080/api/invoices?customerId=1

### Filter by Status
GET http://localhost:8080/api/invoices?status=PAID

### Update Invoice
PUT http://localhost:8080/api/invoices/1
Content-Type: application/json

{
  "invoiceNumber": "INV-001",
  "customerId": 1,
  "invoiceDate": "2026-01-05",
  "dueDate": "2026-02-05",
  "status": "SENT",
  "items": []
}

### Delete Invoice
DELETE http://localhost:8080/api/invoices/1

### Test 404 (Not Found)
GET http://localhost:8080/api/invoices/999

### Test Duplicate Invoice Number
POST http://localhost:8080/api/invoices
Content-Type: application/json

{
  "invoiceNumber": "INV-001",
  "customerId": 1,
  "invoiceDate": "2026-01-05",
  "items": []
}
```

## Request Validation

### Add Validation Annotations

```java
package com.example.invoicemanager.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceRequest {

    @NotBlank(message = "Invoice number is required")
    @Size(min = 3, max = 20, message = "Invoice number must be 3-20 characters")
    private String invoiceNumber;

    @NotNull(message = "Customer ID is required")
    @Positive(message = "Customer ID must be positive")
    private Long customerId;

    @NotNull(message = "Invoice date is required")
    @PastOrPresent(message = "Invoice date cannot be in the future")
    private LocalDate invoiceDate;

    @Future(message = "Due date must be in the future")
    private LocalDate dueDate;

    @NotEmpty(message = "Invoice must have at least one item")
    @Valid
    private List<InvoiceItemRequest> items;

    // Getters and setters
}

public class InvoiceItemRequest {

    @NotNull(message = "Product ID is required")
    @Positive
    private Long productId;

    @NotBlank(message = "Description is required")
    @Size(max = 200)
    private String description;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 1000, message = "Quantity cannot exceed 1000")
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.01", message = "Unit price must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Unit price too large")
    private BigDecimal unitPrice;

    // Getters and setters
}
```

### Update Controller

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public Invoice createInvoice(@Valid @RequestBody InvoiceRequest request) {
    // Convert DTO to entity
    Invoice invoice = convertToEntity(request);
    return service.create(invoice);
}
```

### Test Validation

```bash
# Missing required field
curl -X POST http://localhost:8080/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "invoiceDate": "2026-01-05"
  }'

# Response: 400 Bad Request
# {
#   "type": "about:blank",
#   "title": "Validation Error",
#   "status": 400,
#   "detail": "Validation failed",
#   "errors": [
#     "invoiceNumber: Invoice number is required",
#     "items: Invoice must have at least one item"
#   ]
# }
```

## Response Customization

### Using ResponseEntity

```java
@GetMapping("/{id}")
public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
    Invoice invoice = service.findById(id);
    return ResponseEntity.ok()
        .header("X-Invoice-Number", invoice.getInvoiceNumber())
        .body(invoice);
}

@PostMapping
public ResponseEntity<Invoice> createInvoice(@Valid @RequestBody Invoice invoice) {
    Invoice created = service.create(invoice);
    return ResponseEntity
        .created(URI.create("/api/invoices/" + created.getId()))
        .body(created);
}
```

### Custom Response DTOs

```java
public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private BigDecimal totalAmount;
    private InvoiceStatus status;
    private int itemCount;

    // Constructor, getters
    public static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getTotalAmount(),
            invoice.getStatus(),
            invoice.getItems().size()
        );
    }
}

@GetMapping
public List<InvoiceResponse> getAllInvoices() {
    return service.findAll().stream()
        .map(InvoiceResponse::from)
        .toList();
}
```

## Pagination and Sorting

```java
@GetMapping
public Page<Invoice> getAllInvoices(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "id") String sortBy,
    @RequestParam(defaultValue = "ASC") String direction
) {
    Sort.Direction dir = Sort.Direction.fromString(direction);
    Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
    return service.findAll(pageable);
}
```

**Usage**:
```bash
# Page 0, 10 items, sort by invoiceDate descending
curl "http://localhost:8080/api/invoices?page=0&size=10&sortBy=invoiceDate&direction=DESC"

# Response:
# {
#   "content": [...],
#   "totalElements": 50,
#   "totalPages": 5,
#   "size": 10,
#   "number": 0
# }
```

## CORS Configuration

Allow frontend apps to call your API:

```java
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:3000", "http://localhost:4200")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
```

Or use annotation on controller:

```java
@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "http://localhost:3000")
public class InvoiceController {
    // ...
}
```

## Content Negotiation

Support multiple response formats:

```java
@GetMapping(value = "/{id}",
            produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
public Invoice getInvoiceById(@PathVariable Long id) {
    return service.findById(id);
}
```

**Usage**:
```bash
# JSON (default)
curl -H "Accept: application/json" http://localhost:8080/api/invoices/1

# XML (if Jackson XML is on classpath)
curl -H "Accept: application/xml" http://localhost:8080/api/invoices/1
```

## Testing REST Controllers

### Unit Tests (MockMvc)

```java
@WebMvcTest(InvoiceController.class)
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService service;

    @Test
    void shouldGetInvoiceById() throws Exception {
        // Given
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setInvoiceNumber("INV-001");
        invoice.setTotalAmount(new BigDecimal("100.00"));
        invoice.setStatus(InvoiceStatus.DRAFT);

        when(service.findById(1L)).thenReturn(invoice);

        // When & Then
        mockMvc.perform(get("/api/invoices/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.invoiceNumber").value("INV-001"))
            .andExpect(jsonPath("$.totalAmount").value(100.00))
            .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void shouldCreateInvoice() throws Exception {
        // Given
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setInvoiceNumber("INV-001");

        when(service.create(any(Invoice.class))).thenReturn(invoice);

        // When & Then
        mockMvc.perform(post("/api/invoices")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "invoiceNumber": "INV-001",
                  "customerId": 1,
                  "invoiceDate": "2026-01-05",
                  "items": []
                }
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void shouldReturn404WhenInvoiceNotFound() throws Exception {
        // Given
        when(service.findById(999L)).thenThrow(new InvoiceNotFoundException(999L));

        // When & Then
        mockMvc.perform(get("/api/invoices/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.title").value("Invoice Not Found"));
    }

    @Test
    void shouldValidateInvoice() throws Exception {
        mockMvc.perform(post("/api/invoices")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "customerId": 1
                }
                """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Validation Error"));
    }
}
```

### Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class InvoiceControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private InvoiceRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void shouldCreateAndRetrieveInvoice() {
        // Create
        InvoiceRequest request = new InvoiceRequest();
        request.setInvoiceNumber("INV-001");
        request.setCustomerId(1L);
        request.setInvoiceDate(LocalDate.now());
        request.setItems(List.of());

        ResponseEntity<Invoice> createResponse = restTemplate.postForEntity(
            "/api/invoices",
            request,
            Invoice.class
        );

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long id = createResponse.getBody().getId();

        // Retrieve
        ResponseEntity<Invoice> getResponse = restTemplate.getForEntity(
            "/api/invoices/" + id,
            Invoice.class
        );

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getInvoiceNumber()).isEqualTo("INV-001");
    }
}
```

## Common Mistakes

### Mistake 1: Not using @RestController

```java
// DON'T - Returns view name, not JSON
@Controller
public class InvoiceController {
    @GetMapping("/invoices")
    public List<Invoice> getAll() {
        return service.findAll();  // Spring tries to find "Invoice" view!
    }
}

// FIX
@RestController  // = @Controller + @ResponseBody
public class InvoiceController {
    @GetMapping("/invoices")
    public List<Invoice> getAll() {
        return service.findAll();  // Returns JSON
    }
}
```

### Mistake 2: Wrong HTTP method

```java
// DON'T - POST should return 201, not 200
@PostMapping
public Invoice create(@RequestBody Invoice invoice) {
    return service.create(invoice);  // Returns 200 OK
}

// FIX
@PostMapping
@ResponseStatus(HttpStatus.CREATED)  // Returns 201 Created
public Invoice create(@RequestBody Invoice invoice) {
    return service.create(invoice);
}
```

### Mistake 3: Not handling exceptions

```java
// DON'T - Returns 500 for not found
@GetMapping("/{id}")
public Invoice getById(@PathVariable Long id) {
    return repository.findById(id).get();  // .get() throws if not found
}

// FIX - Use orElseThrow with custom exception
@GetMapping("/{id}")
public Invoice getById(@PathVariable Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new InvoiceNotFoundException(id));
}
```

### Mistake 4: Exposing entities directly

```java
// DON'T - Exposes internal structure, causes lazy-loading issues
@GetMapping("/{id}")
public Invoice getById(@PathVariable Long id) {
    return service.findById(id);  // May serialize password, internal IDs, etc.
}

// FIX - Use DTOs
@GetMapping("/{id}")
public InvoiceResponse getById(@PathVariable Long id) {
    Invoice invoice = service.findById(id);
    return InvoiceResponse.from(invoice);
}
```

### Mistake 5: Not validating input

```java
// DON'T - No validation
@PostMapping
public Invoice create(@RequestBody Invoice invoice) {
    return service.create(invoice);
}

// FIX
@PostMapping
public Invoice create(@Valid @RequestBody InvoiceRequest request) {
    return service.create(convertToEntity(request));
}
```

### Mistake 6: Inconsistent URL naming

```java
// DON'T - Inconsistent
@GetMapping("/getInvoices")          // Wrong verb in URL
@PostMapping("/invoice/create")      // Inconsistent path
@DeleteMapping("/removeInvoice")     // Wrong verb

// FIX - RESTful
@GetMapping("/invoices")
@PostMapping("/invoices")
@DeleteMapping("/invoices/{id}")
```

## Self-Check Questions

Before moving on, can you answer these?

1. What's the difference between @Controller and @RestController?
2. What HTTP status code should POST return when creating a resource?
3. How do you extract a value from the URL path?
4. How do you extract a value from the query string?
5. What does @Valid do?
6. How do you handle exceptions globally?

<details>
<summary>Answers</summary>

1. @RestController = @Controller + @ResponseBody (auto-serializes to JSON)
2. 201 Created
3. @PathVariable - extracts from path (e.g., /invoices/{id})
4. @RequestParam - extracts from query string (e.g., /invoices?status=PAID)
5. Triggers validation on @RequestBody using Bean Validation annotations
6. Use @RestControllerAdvice with @ExceptionHandler methods
</details>

## Practice Exercises

### Exercise 1: Complete CRUD
Build the complete InvoiceManager API:
- Create, Read, Update, Delete invoices
- Filter by customer ID and status
- Pagination and sorting
- Validation
- Exception handling

### Exercise 2: Add Customer API
Create CustomerController with:
- CRUD operations
- Search by name
- Get customer's invoices

### Exercise 3: Add Statistics Endpoint
```java
@GetMapping("/api/statistics")
public InvoiceStatistics getStatistics() {
    // Return total invoices, total amount, by status, etc.
}
```

### Exercise 4: Batch Operations
```java
@PostMapping("/api/invoices/batch")
public List<Invoice> createBatch(@RequestBody List<InvoiceRequest> requests) {
    // Create multiple invoices
}
```

---

## Navigation

**Prerequisites:**
- [Auto-Configuration](./01-auto-configuration.md) - Web auto-configuration with Spring MVC
- [Starters](./02-starters.md) - spring-boot-starter-web and dependencies
- [IoC & DI](../spring-core/01-ioc-and-di.md) - Dependency injection for controllers and services

**Next Topics:**
- [Actuator & Monitoring](./04-actuator-monitoring.md) - Monitoring REST APIs in production
- [Best Practices](./05-best-practices.md) - REST API design patterns

**Related:**
- [Spring Security REST](../../spring-security/03-jwt.md) - Securing REST endpoints with JWT
- [Microservices Communication](../../../03-architecture/microservices/04-communication.md) - REST vs gRPC
- [API Design](../../../04-data-integration/api-design/README.md) - RESTful best practices

**Interview Focus:**
- RESTful API design principles (resource naming, HTTP methods)
- HTTP status codes and when to use them
- @RestController vs @Controller difference
- Exception handling strategies (@ControllerAdvice)
- Request validation with Bean Validation

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
