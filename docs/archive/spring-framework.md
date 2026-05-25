# Spring Framework

## Core Concepts

### 1. Inversion of Control (IoC) Container
Spring container manages object lifecycle and dependencies.

```java
// Without Spring (manual dependency management)
public class OrderService {
    private PaymentService paymentService = new PaymentService();
    private InventoryService inventoryService = new InventoryService();
}

// With Spring (IoC)
@Component
public class OrderService {
    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InventoryService inventoryService;
}
```

### 2. Dependency Injection (DI)
Three types of injection:

```java
@Component
public class OrderService {

    // Constructor Injection (Recommended)
    private final PaymentService paymentService;

    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Setter Injection
    private InventoryService inventoryService;

    @Autowired
    public void setInventoryService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // Field Injection (Not recommended)
    @Autowired
    private NotificationService notificationService;
}
```

### 3. Configuration Approaches

#### Annotation-based Configuration
```java
@Configuration
@ComponentScan(basePackages = "com.example")
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        return new HikariDataSource();
    }

    @Bean
    @Scope("prototype")
    public OrderProcessor orderProcessor() {
        return new OrderProcessor();
    }
}
```

#### Java Configuration
```java
@Configuration
public class DatabaseConfig {

    @Value("${db.url}")
    private String dbUrl;

    @Bean
    @Primary
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create()
            .url(dbUrl)
            .build();
    }

    @Bean
    @Qualifier("secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:h2:mem:testdb")
            .build();
    }
}
```

### 4. Bean Scopes

```java
@Component
@Scope("singleton") // Default - one instance per container
public class SingletonService { }

@Component
@Scope("prototype") // New instance every time
public class PrototypeService { }

// Web-specific scopes
@Scope("request")   // One per HTTP request
@Scope("session")   // One per HTTP session
@Scope("application") // One per ServletContext
```

### 5. Aspect-Oriented Programming (AOP)

```java
@Aspect
@Component
public class LoggingAspect {

    // Pointcut definition
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceMethods() {}

    // Before advice
    @Before("serviceMethods()")
    public void logBefore(JoinPoint joinPoint) {
        log.info("Executing: {}", joinPoint.getSignature().getName());
    }

    // Around advice
    @Around("serviceMethods()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            return result;
        } finally {
            long executionTime = System.currentTimeMillis() - start;
            log.info("{} executed in {} ms",
                joinPoint.getSignature().getName(), executionTime);
        }
    }

    // After throwing advice
    @AfterThrowing(pointcut = "serviceMethods()", throwing = "ex")
    public void logException(JoinPoint joinPoint, Exception ex) {
        log.error("Exception in {}: {}",
            joinPoint.getSignature().getName(), ex.getMessage());
    }
}
```

### 6. Spring MVC

#### Controller
```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        Order order = orderService.findById(id);
        return ResponseEntity.ok(order);
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody @Valid OrderRequest request) {
        Order order = orderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Order> updateOrder(
            @PathVariable Long id,
            @RequestBody @Valid OrderRequest request) {
        Order order = orderService.update(id, request);
        return ResponseEntity.ok(order);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

#### Exception Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleOrderNotFound(OrderNotFoundException ex) {
        ErrorResponse error = new ErrorResponse("ORDER_NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {
        ValidationErrorResponse error = new ValidationErrorResponse();
        ex.getBindingResult().getFieldErrors()
            .forEach(fieldError ->
                error.addError(fieldError.getField(), fieldError.getDefaultMessage()));
        return ResponseEntity.badRequest().body(error);
    }
}
```

### 7. Data Access with Spring

#### JPA Repository
```java
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName;
    private BigDecimal amount;
    private LocalDateTime orderDate;

    // getters, setters
}

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByCustomerName(String customerName);

    @Query("SELECT o FROM Order o WHERE o.amount > :amount")
    List<Order> findHighValueOrders(@Param("amount") BigDecimal amount);

    @Modifying
    @Query("UPDATE Order o SET o.status = :status WHERE o.id = :id")
    int updateOrderStatus(@Param("id") Long id, @Param("status") String status);
}
```

#### Transaction Management
```java
@Service
@Transactional
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentService paymentService;

    @Transactional(rollbackFor = Exception.class)
    public Order processOrder(OrderRequest request) {
        Order order = new Order();
        order.setCustomerName(request.getCustomerName());
        order.setAmount(request.getAmount());

        Order savedOrder = orderRepository.save(order);

        // This will be rolled back if payment fails
        paymentService.processPayment(request.getPaymentInfo());

        return savedOrder;
    }

    @Transactional(readOnly = true)
    public Order findById(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException("Order not found: " + id));
    }
}
```

## Common Interview Questions

### 1. What are the benefits of Spring Framework?
- **IoC/DI**: Loose coupling, easier testing
- **AOP**: Cross-cutting concerns separation
- **Transaction Management**: Declarative transactions
- **Integration**: With other frameworks and technologies
- **Testing Support**: Mock objects, test contexts

### 2. Explain Spring Bean Lifecycle
```java
@Component
public class ExampleBean implements InitializingBean, DisposableBean {

    @PostConstruct
    public void init() {
        // Called after dependency injection
    }

    @Override
    public void afterPropertiesSet() {
        // InitializingBean callback
    }

    @PreDestroy
    public void cleanup() {
        // Called before bean destruction
    }

    @Override
    public void destroy() {
        // DisposableBean callback
    }
}
```

### 3. What's the difference between @Component, @Service, @Repository, @Controller?
- `@Component`: Generic stereotype
- `@Service`: Business logic layer
- `@Repository`: Data access layer (adds exception translation)
- `@Controller`: Web layer (Spring MVC)

### 4. How does AOP work in Spring?
Spring AOP uses proxy pattern:
- **JDK Dynamic Proxies**: For interfaces
- **CGLIB Proxies**: For concrete classes

### 5. What are different types of ApplicationContext?
```java
// Annotation-based
AnnotationConfigApplicationContext context =
    new AnnotationConfigApplicationContext(AppConfig.class);

// XML-based
ClassPathXmlApplicationContext context =
    new ClassPathXmlApplicationContext("applicationContext.xml");

// Web applications
// Automatically created by Spring Boot or web.xml configuration
```

## Best Practices

### 1. Dependency Injection
- **Prefer constructor injection** for required dependencies
- **Use field injection sparingly** (makes testing harder)
- **Use @Qualifier** for disambiguation when multiple beans of same type exist

### 2. Configuration
```java
@Configuration
@PropertySource("classpath:application.properties")
public class AppConfig {

    @Value("${app.timeout:30}")
    private int timeout;

    @Bean
    @ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
    public FeatureService featureService() {
        return new FeatureService();
    }
}
```

### 3. Exception Handling
- **Use @ControllerAdvice** for global exception handling
- **Create custom exceptions** for business logic
- **Return meaningful error responses**

### 4. Testing
```java
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = TestConfig.class)
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @MockBean
    private PaymentService paymentService;

    @Test
    void shouldCreateOrder() {
        // Given
        OrderRequest request = new OrderRequest("John", BigDecimal.valueOf(100));
        when(paymentService.processPayment(any())).thenReturn(true);

        // When
        Order order = orderService.processOrder(request);

        // Then
        assertThat(order.getCustomerName()).isEqualTo("John");
        verify(paymentService).processPayment(any());
    }
}
```

## Practical Examples

### Custom Validator
```java
@Component
public class OrderValidator {

    public void validate(Order order) {
        if (order.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order amount must be positive");
        }
    }
}

@Aspect
@Component
public class ValidationAspect {

    @Autowired
    private OrderValidator orderValidator;

    @Before("execution(* com.example.service.OrderService.save(..)) && args(order)")
    public void validateOrder(Order order) {
        orderValidator.validate(order);
    }
}
```

### Event Handling
```java
public class OrderCreatedEvent extends ApplicationEvent {
    private final Order order;

    public OrderCreatedEvent(Object source, Order order) {
        super(source);
        this.order = order;
    }

    public Order getOrder() { return order; }
}

@Service
public class OrderService {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public Order createOrder(OrderRequest request) {
        Order order = new Order();
        // ... create order

        eventPublisher.publishEvent(new OrderCreatedEvent(this, order));
        return order;
    }
}

@Component
public class OrderEventListener {

    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Send notification, update inventory, etc.
        log.info("Order created: {}", event.getOrder().getId());
    }
}
```

## Performance Considerations

1. **Bean Creation**: Use prototype scope only when necessary
2. **AOP**: Understand proxy overhead
3. **Lazy Initialization**: Use `@Lazy` for expensive beans
4. **Connection Pooling**: Configure proper database connection pools