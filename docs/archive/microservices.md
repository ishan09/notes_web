# Microservices Architecture

## High-Level Overview: What Are Microservices Really?

Think of microservices like a city instead of a single large building (monolith). In a city:
- Each building (service) has a specific purpose: residential, commercial, hospital, school
- Buildings operate independently but communicate through roads, utilities, and infrastructure
- You can renovate one building without affecting others
- Different buildings can use different technologies (brick, steel, glass)
- If one building has issues, the entire city doesn't shut down

### Elixir/Phoenix Parallels

Coming from Elixir, you'll find many familiar concepts:

**OTP Applications → Microservices**
```elixir
# In Elixir: Separate OTP applications
mix new user_service --sup
mix new order_service --sup
mix new notification_service --sup
```
```java
// In Java: Separate Spring Boot applications
@SpringBootApplication
public class UserServiceApplication { }

@SpringBootApplication
public class OrderServiceApplication { }
```

**GenServer → Spring Boot Service**
```elixir
# Elixir GenServer handles state and messages
defmodule UserServer do
  use GenServer

  def handle_call({:get_user, id}, _from, state) do
    # Handle user lookup
  end
end
```
```java
// Java service handles HTTP requests
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        // Handle user lookup
    }
}
```

**Process Communication → Inter-Service Communication**
```elixir
# Elixir: Process messages
send(user_pid, {:create_user, user_data})
```
```java
// Java: HTTP calls or message queues
userServiceClient.createUser(userData);
// or
rabbitTemplate.send("user.queue", userData);
```

**Supervision Trees → Circuit Breakers**
```elixir
# Elixir: Supervisor restarts failed processes
children = [
  {UserServer, []},
  {OrderServer, []}
]
Supervisor.start_link(children, strategy: :one_for_one)
```
```java
// Java: Circuit breaker handles service failures
@CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
public User getUser(Long id) {
    return userServiceClient.getUser(id);
}
```

## Why Use Microservices?

### Problems They Solve

**1. Team Scaling ("Conway's Law")**
- **Problem**: Large teams stepping on each other's code
- **Solution**: Each team owns complete services
- **Real Example**: Netflix has 1000+ microservices, each owned by small teams

**2. Technology Diversity**
- **Problem**: Stuck with one technology stack forever
- **Solution**: Each service can use appropriate technology
- **Real Example**: User service in Java, ML service in Python, frontend in React

**3. Independent Deployment**
- **Problem**: Deploy entire app for small changes
- **Solution**: Deploy only changed services
- **Real Example**: Update recommendation engine without touching payment system

**4. Fault Isolation**
- **Problem**: One bug crashes entire application
- **Solution**: Service failures are contained
- **Real Example**: Search service down, but checkout still works

## When NOT to Use Microservices

### Anti-Patterns and Red Flags

**Don't Use If:**
- Team smaller than 8-10 people (not enough to own multiple services)
- Simple CRUD application with minimal logic
- Tight coupling between all features
- No DevOps/deployment automation capability
- Premature optimization (start with modular monolith)

**Real Horror Stories:**
- **Distributed Monolith**: Services so tightly coupled they must deploy together
- **Microservice Hell**: 50+ services for simple e-commerce site
- **Data Inconsistency Nightmare**: Order created but payment failed, no rollback mechanism

### The "Microservice Premium"

Microservices add complexity:
- Network calls instead of method calls
- Distributed debugging
- Service discovery
- Data consistency challenges
- Operational overhead

**Rule of Thumb**: If you can't manage a monolith, microservices will be worse.

## Core Concepts

### 1. What are Microservices?
Microservices are an architectural approach where applications are built as a collection of small, independently deployable services that communicate over well-defined APIs.

**Key Characteristics:**
- Single responsibility per service
- Independently deployable
- Technology agnostic
- Decentralized governance
- Fault isolation
- Organized around business capabilities

### 2. Microservices vs Monolith

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single unit | Independent services |
| **Scaling** | Scale entire app | Scale individual services |
| **Technology** | Single stack | Polyglot architecture |
| **Data** | Shared database | Database per service |
| **Team Structure** | Large teams | Small, autonomous teams |
| **Complexity** | Simple deployment | Complex orchestration |

### 3. Microservices Patterns

#### Service Discovery Pattern

**Overview**: Services automatically register themselves and discover other services without hardcoded addresses.

**Pros**:
- Dynamic scaling (services come and go)
- Load balancing across instances
- Health checking built-in
- Environment agnostic (dev/staging/prod)

**Cons**:
- Additional infrastructure complexity
- Single point of failure (registry)
- Network calls to resolve services
- Configuration overhead

**When to Use**:
- Multiple instances of services
- Container orchestration (Docker/Kubernetes)
- Frequent deployments
- Cloud environments with dynamic IPs

**When to Avoid**:
- Simple 2-3 service setups
- Static environments
- When you can use DNS-based discovery

**Common Pitfalls**:
- Registry becomes bottleneck
- Stale service registrations
- Client-side vs server-side discovery confusion

```java
// Eureka Service Registry
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServiceRegistryApplication.class, args);
    }
}

// Service Registration
@SpringBootApplication
@EnableEurekaClient
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}

// Service Discovery Client
@RestController
public class OrderController {

    @Autowired
    private DiscoveryClient discoveryClient;

    @LoadBalanced
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
        // Direct service call using service name
        User user = restTemplate.getForObject(
            "http://user-service/users/{userId}",
            User.class,
            order.getUserId()
        );
        return order;
    }
}
```

#### API Gateway Pattern

**Overview**: Single entry point that routes requests to appropriate microservices and handles cross-cutting concerns.

**Pros**:
- Centralized authentication/authorization
- Rate limiting and throttling
- Request/response transformation
- Protocol translation (HTTP to gRPC)
- Single entry point for clients

**Cons**:
- Potential bottleneck
- Single point of failure
- Can become a monolith itself
- Added latency

**When to Use**:
- Multiple client types (web, mobile, IoT)
- Need centralized security
- Complex routing requirements
- API versioning needs

**When to Avoid**:
- Simple internal service communication
- High-performance requirements
- When services can handle cross-cutting concerns themselves

**Common Pitfalls**:
- Fat gateway with business logic
- Not scaling the gateway independently
- Coupling gateway to specific services

**Elixir Parallel**: Like Phoenix Router but for multiple applications

```java
// Zuul Gateway (Spring Cloud Gateway alternative)
@SpringBootApplication
@EnableZuulProxy
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}

// application.yml for Gateway
zuul:
  routes:
    user-service:
      path: /users/**
      serviceId: user-service
    order-service:
      path: /orders/**
      serviceId: order-service

  # Rate limiting
  ratelimit:
    key-generator: "#{@userKeyGenerator}"
    repository: REDIS
    behind-proxy: true
    default-policy:
      limit: 100
      refresh-interval: 60
      type: user

# Spring Cloud Gateway (preferred)
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/users/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
```

#### Circuit Breaker Pattern

**Overview**: Prevents cascading failures by "breaking the circuit" when a service is failing, similar to electrical circuit breakers.

**Pros**:
- Prevents cascade failures
- Fast failure detection
- Automatic recovery testing
- Reduces resource consumption on failing services

**Cons**:
- Added complexity to service calls
- Configuration tuning required
- False positives during legitimate traffic spikes
- Monitoring overhead

**When to Use**:
- Calling external services
- Services with variable response times
- High-availability requirements
- Distributed systems with many dependencies

**When to Avoid**:
- Internal database calls (use connection pooling instead)
- Services that must always succeed
- Simple request-response patterns

**Common Pitfalls**:
- Wrong timeout configurations
- Not implementing proper fallbacks
- Circuit breaker per method vs per service confusion

**Elixir Parallel**: Similar to Supervisor `:one_for_one` strategy

```java
// Using Hystrix (legacy) or Resilience4j (modern)
@Component
public class UserServiceClient {

    @Autowired
    private RestTemplate restTemplate;

    // Hystrix
    @HystrixCommand(fallbackMethod = "getDefaultUser",
                   commandProperties = {
                       @HystrixProperty(name = "execution.isolation.thread.timeoutInMilliseconds", value = "2000"),
                       @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "5"),
                       @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "50")
                   })
    public User getUserById(Long userId) {
        return restTemplate.getForObject(
            "http://user-service/users/" + userId, User.class);
    }

    public User getDefaultUser(Long userId) {
        return new User(userId, "Unknown User", "unknown@example.com");
    }
}

// Resilience4j (modern approach)
@Component
public class UserServiceClient {

    @Autowired
    private RestTemplate restTemplate;

    @CircuitBreaker(name = "userService", fallbackMethod = "getDefaultUser")
    @TimeLimiter(name = "userService")
    @Retry(name = "userService")
    public CompletableFuture<User> getUserById(Long userId) {
        return CompletableFuture.supplyAsync(() ->
            restTemplate.getForObject(
                "http://user-service/users/" + userId, User.class)
        );
    }

    public CompletableFuture<User> getDefaultUser(Long userId, Exception ex) {
        return CompletableFuture.completedFuture(
            new User(userId, "Unknown User", "unknown@example.com")
        );
    }
}

# Resilience4j Configuration
resilience4j:
  circuitbreaker:
    instances:
      userService:
        registerHealthIndicator: true
        slidingWindowSize: 10
        minimumNumberOfCalls: 5
        permittedNumberOfCallsInHalfOpenState: 3
        automaticTransitionFromOpenToHalfOpenEnabled: true
        waitDurationInOpenState: 5s
        failureRateThreshold: 50
        eventConsumerBufferSize: 10

  retry:
    instances:
      userService:
        maxAttempts: 3
        waitDuration: 1s
        retryExceptions:
          - org.springframework.web.client.HttpServerErrorException
          - java.io.IOException
```

### 4. Inter-Service Communication

#### Synchronous Communication (REST)
```java
@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/users/{userId}")
    User getUserById(@PathVariable("userId") Long userId);

    @PostMapping("/users")
    User createUser(@RequestBody CreateUserRequest request);

    @PutMapping("/users/{userId}")
    User updateUser(@PathVariable("userId") Long userId,
                   @RequestBody UpdateUserRequest request);
}

@RestController
public class OrderController {

    @Autowired
    private UserServiceClient userServiceClient;

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest request) {
        // Validate user exists
        User user = userServiceClient.getUserById(request.getUserId());

        Order order = orderService.createOrder(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }
}
```

#### Asynchronous Communication (Messaging)
```java
// Producer (Order Service)
@Service
public class OrderEventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(),
            order.getUserId(),
            order.getAmount(),
            Instant.now()
        );

        rabbitTemplate.convertAndSend(
            "order.exchange",
            "order.created",
            event
        );
    }
}

// Consumer (Notification Service)
@RabbitListener(queues = "notification.order.created")
public class OrderEventListener {

    @Autowired
    private NotificationService notificationService;

    @RabbitHandler
    public void handleOrderCreated(OrderCreatedEvent event) {
        notificationService.sendOrderConfirmation(event.getUserId(), event.getOrderId());
    }
}

// Event Sourcing approach
@Entity
public class EventStore {
    @Id
    private String id;
    private String aggregateId;
    private String eventType;
    private String eventData;
    private LocalDateTime timestamp;
    private Long version;

    // getters, setters
}

@Service
public class OrderEventStore {

    @Autowired
    private EventStoreRepository eventStoreRepository;

    public void saveEvent(String aggregateId, Object event) {
        EventStore eventStore = new EventStore();
        eventStore.setAggregateId(aggregateId);
        eventStore.setEventType(event.getClass().getSimpleName());
        eventStore.setEventData(objectMapper.writeValueAsString(event));
        eventStore.setTimestamp(LocalDateTime.now());

        eventStoreRepository.save(eventStore);
    }

    public List<EventStore> getEvents(String aggregateId) {
        return eventStoreRepository.findByAggregateIdOrderByVersion(aggregateId);
    }
}
```

### 5. Advanced Microservices Patterns

#### CQRS (Command Query Responsibility Segregation)

**Overview**: Separates read and write operations into different models, optimizing each for their specific use case.

**Pros**:
- Optimized read and write models
- Independent scaling of reads vs writes
- Complex query support without affecting writes
- Better performance for both operations
- Clear separation of concerns

**Cons**:
- Increased complexity
- Eventual consistency between read/write models
- More infrastructure (separate databases)
- Data synchronization challenges

**When to Use**:
- Different read/write performance requirements
- Complex reporting needs
- High read-to-write ratios
- Different teams owning reads vs writes

**When to Avoid**:
- Simple CRUD operations
- Strong consistency requirements
- Limited team experience with eventual consistency
- Small applications

**Common Pitfalls**:
- Synchronizing read models becomes complex
- Overusing CQRS for simple scenarios
- Not handling read model failures

**Elixir Parallel**: Like separate GenServers for reads/writes with PubSub for synchronization

```java
// Command Side - Write Model
@Entity
public class Order {
    @Id
    private String id;
    private String customerId;
    private List<OrderItem> items;
    private OrderStatus status;

    public void addItem(OrderItem item) {
        this.items.add(item);
        // Emit domain event
        DomainEventPublisher.publish(new ItemAddedEvent(this.id, item));
    }
}

@Service
public class OrderCommandService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EventStore eventStore;

    public void createOrder(CreateOrderCommand command) {
        Order order = new Order(command.getCustomerId());
        orderRepository.save(order);

        // Store event for read model updates
        eventStore.save(new OrderCreatedEvent(order.getId(), command));
    }
}

// Query Side - Read Model (Materialized Views)
@Document(collection = "order_views")
public class OrderView {
    @Id
    private String orderId;
    private String customerName;
    private String customerEmail;
    private BigDecimal totalAmount;
    private List<String> productNames;
    private String status;
    // Optimized for queries
}

@Service
public class OrderQueryService {

    @Autowired
    private OrderViewRepository orderViewRepository;

    public List<OrderView> findOrdersByCustomer(String customerId) {
        return orderViewRepository.findByCustomerId(customerId);
    }

    public OrderSummary getOrderSummary(String orderId) {
        // Fast query from denormalized view
        return orderViewRepository.findSummaryById(orderId);
    }
}

// Event Handler to update read models
@EventListener
public class OrderViewUpdater {

    @Autowired
    private OrderViewRepository orderViewRepository;

    @EventListener
    public void handle(OrderCreatedEvent event) {
        OrderView view = new OrderView();
        view.setOrderId(event.getOrderId());
        // Populate from event data and external services
        orderViewRepository.save(view);
    }
}
```

#### Event Sourcing Pattern

**Overview**: Stores all changes as a sequence of immutable events rather than current state, allowing complete audit trail and state reconstruction.

**Pros**:
- Complete audit trail
- Time travel (replay to any point)
- Natural event-driven architecture
- Perfect for compliance requirements
- Debugging advantages

**Cons**:
- Storage overhead (all events stored)
- Complexity in event schema evolution
- Performance implications for large event stores
- Snapshot strategy needed for performance

**When to Use**:
- Audit requirements (financial, healthcare)
- Complex business processes
- Need for temporal queries
- Event-driven architecture already in place

**When to Avoid**:
- Simple CRUD applications
- Performance-critical applications
- Limited storage
- Teams unfamiliar with event-driven patterns

**Common Pitfalls**:
- Events too granular or too coarse
- Not versioning events properly
- Missing snapshot strategy
- Forgetting about event store performance

**Elixir Parallel**: Like :gen_event with persistent storage

```java
// Event Store
@Entity
public class EventEntity {
    @Id
    private String id;
    private String aggregateId;
    private String eventType;
    private String eventData;
    private LocalDateTime timestamp;
    private Long sequenceNumber;
}

// Domain Events
public abstract class DomainEvent {
    private final String aggregateId;
    private final LocalDateTime occurredOn;

    protected DomainEvent(String aggregateId) {
        this.aggregateId = aggregateId;
        this.occurredOn = LocalDateTime.now();
    }
}

public class OrderCreatedEvent extends DomainEvent {
    private final String customerId;
    private final List<OrderItem> items;

    public OrderCreatedEvent(String orderId, String customerId, List<OrderItem> items) {
        super(orderId);
        this.customerId = customerId;
        this.items = items;
    }
}

// Aggregate Root with Event Sourcing
public class Order {
    private String id;
    private String customerId;
    private List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;
    private List<DomainEvent> uncomittedEvents = new ArrayList<>();

    // Replay events to reconstruct state
    public static Order fromEvents(List<DomainEvent> events) {
        Order order = new Order();
        events.forEach(order::apply);
        return order;
    }

    public void createOrder(String customerId, List<OrderItem> items) {
        if (this.id != null) {
            throw new IllegalStateException("Order already created");
        }

        OrderCreatedEvent event = new OrderCreatedEvent(
            UUID.randomUUID().toString(), customerId, items);
        apply(event);
        uncomittedEvents.add(event);
    }

    private void apply(DomainEvent event) {
        if (event instanceof OrderCreatedEvent) {
            OrderCreatedEvent e = (OrderCreatedEvent) event;
            this.id = e.getAggregateId();
            this.customerId = e.getCustomerId();
            this.items = new ArrayList<>(e.getItems());
            this.status = OrderStatus.PENDING;
        }
        // Handle other event types...
    }

    public List<DomainEvent> getUncommittedEvents() {
        return new ArrayList<>(uncomittedEvents);
    }

    public void markEventsAsCommitted() {
        uncomittedEvents.clear();
    }
}

// Event Store Repository
@Repository
public class EventStoreRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public void saveEvents(String aggregateId, List<DomainEvent> events, Long expectedVersion) {
        // Optimistic concurrency control
        Long currentVersion = getCurrentVersion(aggregateId);
        if (!currentVersion.equals(expectedVersion)) {
            throw new ConcurrencyException("Aggregate version mismatch");
        }

        events.forEach(event -> {
            jdbcTemplate.update(
                "INSERT INTO events (aggregate_id, event_type, event_data, sequence_number) VALUES (?, ?, ?, ?)",
                aggregateId,
                event.getClass().getSimpleName(),
                serializeEvent(event),
                ++currentVersion
            );
        });
    }

    public List<DomainEvent> getEvents(String aggregateId) {
        return jdbcTemplate.query(
            "SELECT * FROM events WHERE aggregate_id = ? ORDER BY sequence_number",
            new Object[]{aggregateId},
            (rs, rowNum) -> deserializeEvent(rs.getString("event_data"), rs.getString("event_type"))
        );
    }
}
```

#### Strangler Fig Pattern (Legacy Migration)

**Overview**: Gradually replace legacy systems by "strangling" them - routing traffic away piece by piece until the old system can be retired.

**Pros**:
- Risk-free incremental migration
- Can roll back at any point
- Business continues during migration
- Learn and adapt as you migrate

**Cons**:
- Long migration timelines
- Maintaining two systems simultaneously
- Complex routing logic
- Potential for "eternal migration"

**When to Use**:
- Large legacy system modernization
- Risk-averse organizations
- Systems with unclear requirements
- When big-bang migration is too risky

**When to Avoid**:
- Simple systems (rewrite faster)
- Tight coupling that can't be broken
- Legacy system is completely broken
- No clear service boundaries

**Common Pitfalls**:
- Migration never completes
- Not establishing clear timelines
- Feature development in both systems
- Inadequate monitoring during transition

**Elixir Parallel**: Like gradually moving from Plug to Phoenix pipelines

```java
// Gradual migration from monolith to microservices
@Component
public class UserServiceProxy {

    @Value("${migration.user-service.enabled:false}")
    private boolean useNewUserService;

    @Autowired
    private UserServiceClient newUserService;

    @Autowired
    private LegacyUserService legacyUserService;

    public User getUserById(Long userId) {
        if (useNewUserService) {
            try {
                return newUserService.getUserById(userId);
            } catch (Exception e) {
                // Fallback to legacy during migration
                log.warn("New service failed, falling back to legacy", e);
                return legacyUserService.getUserById(userId);
            }
        } else {
            return legacyUserService.getUserById(userId);
        }
    }
}

// Feature toggle for gradual rollout
@RestController
public class OrderController {

    @Autowired
    private FeatureToggleService featureToggle;

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest request) {
        if (featureToggle.isEnabled("new-order-processing", request.getCustomerId())) {
            return createOrderV2(request);
        } else {
            return createOrderV1(request);
        }
    }
}
```

#### Bulkhead Pattern (Failure Isolation)

**Overview**: Isolates critical resources to prevent failure in one area from cascading to others, like ship compartments.

**Pros**:
- Failure isolation
- Resource prioritization
- Better resource utilization
- Prevents resource starvation

**Cons**:
- Resource overhead (dedicated pools)
- Configuration complexity
- Monitoring multiple resource pools
- Can lead to resource underutilization

**When to Use**:
- Mixed critical/non-critical workloads
- Different SLA requirements
- Risk of resource exhaustion
- Need to prioritize certain operations

**When to Avoid**:
- Simple applications with similar workloads
- Limited resources
- All operations have same priority
- Uniform performance requirements

**Common Pitfalls**:
- Over-partitioning resources
- Not monitoring pool utilization
- Wrong pool sizing
- Forgetting about shared dependencies

**Elixir Parallel**: Like separate Supervisors with different restart strategies

```java
// Separate thread pools for different operations
@Configuration
public class BulkheadConfig {

    @Bean("orderProcessingExecutor")
    public TaskExecutor orderProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("OrderProcessing-");
        return executor;
    }

    @Bean("reportingExecutor")
    public TaskExecutor reportingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("Reporting-");
        return executor;
    }
}

@Service
public class OrderService {

    @Async("orderProcessingExecutor")
    public CompletableFuture<Order> processOrder(CreateOrderRequest request) {
        // Critical path processing isolated
        return CompletableFuture.completedFuture(processOrderInternal(request));
    }

    @Async("reportingExecutor")
    public CompletableFuture<Void> generateOrderReport(String orderId) {
        // Non-critical reporting isolated
        return CompletableFuture.runAsync(() -> generateReportInternal(orderId));
    }
}
```

#### Database per Service Pattern

**Overview**: Each microservice owns its data and database, accessed only through service APIs, ensuring loose coupling.

**Pros**:
- True service autonomy
- Technology diversity (polyglot persistence)
- Independent scaling
- Team ownership of data
- Fault isolation

**Cons**:
- No cross-service transactions
- Data consistency challenges
- Increased operational complexity
- Data duplication across services
- Complex reporting

**When to Use**:
- Clear service boundaries
- Different data access patterns
- Independent team ownership
- Different scalability requirements

**When to Avoid**:
- Heavy cross-service data dependencies
- Strong consistency requirements
- Limited operational capabilities
- Reporting requires data joins

**Common Pitfalls**:
- Shared databases between services
- Direct database access from other services
- Not planning for cross-service queries
- Ignoring data consistency requirements

**Elixir Parallel**: Like separate Ecto repos per OTP application

```java
// Each service has its own database
// User Service - PostgreSQL for ACID transactions
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String email;
    private String hashedPassword;
}

// Product Catalog - MongoDB for flexible schema
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private Map<String, Object> attributes; // Flexible attributes
    private List<String> categories;
    private BigDecimal price;
}

// Analytics Service - ClickHouse for time-series data
@Entity
@Table(name = "user_events")
public class UserEvent {
    @Id
    private String id;
    private Long userId;
    private String eventType;
    private LocalDateTime timestamp;
    private Map<String, String> properties;
}

// Cross-service data access through APIs only
@Service
public class OrderService {

    @Autowired
    private UserServiceClient userService; // No direct DB access

    @Autowired
    private ProductServiceClient productService;

    public Order createOrder(CreateOrderRequest request) {
        // Validate user exists via API call
        User user = userService.getUserById(request.getUserId());
        if (user == null) {
            throw new UserNotFoundException(request.getUserId());
        }

        // Validate products via API call
        List<Product> products = productService.getProducts(request.getProductIds());

        return orderRepository.save(new Order(user.getId(), products));
    }
}
```

## Pattern Selection Guide

### Quick Reference: When to Use Each Pattern

| Pattern | Best For | Avoid When | Complexity | Elixir Parallel |
|---------|----------|------------|------------|-----------------|
| **Service Discovery** | Dynamic environments, containers | Static setups, few services | Medium | Registry process |
| **API Gateway** | Multiple clients, centralized auth | Simple internal communication | Medium | Umbrella router |
| **Circuit Breaker** | External calls, reliability | Database calls, simple flows | Low | Supervisor strategies |
| **CQRS** | Different read/write needs | Simple CRUD | High | Separate GenServers |
| **Event Sourcing** | Audit trails, compliance | Simple apps, performance critical | High | :gen_event + storage |
| **Strangler Fig** | Legacy migration | Greenfield projects | Medium | Gradual OTP migration |
| **Bulkhead** | Mixed workloads, SLAs | Uniform requirements | Medium | Multiple Supervisors |
| **Database per Service** | Service autonomy | Heavy data coupling | High | Separate Ecto repos |
| **Saga** | Cross-service transactions | Simple operations | High | GenServer coordination |

### Pattern Complexity Matrix

| Pattern | Infrastructure | Development | Operations | Learning Curve |
|---------|---------------|-------------|------------|----------------|
| Service Discovery | 🟡 Medium | 🟢 Low | 🟡 Medium | 🟢 Low |
| API Gateway | 🟡 Medium | 🟡 Medium | 🟡 Medium | 🟢 Low |
| Circuit Breaker | 🟢 Low | 🟡 Medium | 🟢 Low | 🟢 Low |
| CQRS | 🔴 High | 🔴 High | 🔴 High | 🔴 High |
| Event Sourcing | 🔴 High | 🔴 High | 🔴 High | 🔴 High |
| Strangler Fig | 🟡 Medium | 🔴 High | 🔴 High | 🟡 Medium |
| Bulkhead | 🟢 Low | 🟡 Medium | 🟡 Medium | 🟢 Low |
| Database per Service | 🔴 High | 🟡 Medium | 🔴 High | 🟡 Medium |
| Saga | 🟡 Medium | 🔴 High | 🔴 High | 🔴 High |

### 6. Data Management Patterns

#### Database per Service
```java
// User Service - PostgreSQL
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String email;
    // ... other fields
}

// Order Service - MySQL
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId; // Reference to user, not foreign key
    private BigDecimal amount;
    private OrderStatus status;
    // ... other fields
}

// Product Service - MongoDB
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    // ... other fields
}
```

#### Saga Pattern for Distributed Transactions

**Overview**: Manages distributed transactions across multiple services using a sequence of local transactions with compensating actions.

**Pros**:
- Eventual consistency without distributed locks
- Better performance than 2PC (two-phase commit)
- Clear failure handling
- Scalable transaction management

**Cons**:
- Complex compensation logic
- Eventual consistency only
- Difficult debugging
- Ordering dependencies

**When to Use**:
- Cross-service transactions needed
- Long-running business processes
- High-availability requirements
- Can tolerate eventual consistency

**When to Avoid**:
- Simple single-service operations
- Strong consistency requirements
- Short-lived operations
- Complex compensation scenarios

**Common Pitfalls**:
- Forgetting compensation logic
- Not handling partial failures
- Making compensations non-idempotent
- Saga timeouts not configured

**Two Approaches**:
1. **Orchestration**: Central coordinator (easier debugging)
2. **Choreography**: Events between services (more decoupled)

**Elixir Parallel**: Like GenServer processes coordinating with messages and error handling

```java
// Orchestration-based Saga
@Service
public class OrderSagaOrchestrator {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrderService orderService;

    public void processOrder(CreateOrderRequest request) {
        String sagaId = UUID.randomUUID().toString();

        try {
            // Step 1: Create order
            Order order = orderService.createOrder(request);

            // Step 2: Reserve inventory
            inventoryService.reserveItems(order.getItems());

            // Step 3: Process payment
            PaymentResult payment = paymentService.processPayment(
                order.getUserId(), order.getAmount());

            if (payment.isSuccessful()) {
                // Step 4: Confirm order
                orderService.confirmOrder(order.getId());
                inventoryService.confirmReservation(order.getItems());
            } else {
                // Compensate
                compensateOrder(order);
            }

        } catch (Exception e) {
            // Compensate all completed steps
            compensateOrder(order);
            throw new OrderProcessingException("Failed to process order", e);
        }
    }

    private void compensateOrder(Order order) {
        try {
            inventoryService.cancelReservation(order.getItems());
            orderService.cancelOrder(order.getId());
        } catch (Exception e) {
            // Log compensation failure - may need manual intervention
            log.error("Failed to compensate order: {}", order.getId(), e);
        }
    }
}

// Choreography-based Saga using events
@EventListener
public class OrderSagaEventHandler {

    @Autowired
    private PaymentService paymentService;

    @EventListener
    public void handle(OrderCreatedEvent event) {
        try {
            inventoryService.reserveItems(event.getItems());
            eventPublisher.publish(new InventoryReservedEvent(event.getOrderId()));
        } catch (Exception e) {
            eventPublisher.publish(new InventoryReservationFailedEvent(event.getOrderId()));
        }
    }

    @EventListener
    public void handle(InventoryReservedEvent event) {
        try {
            paymentService.processPayment(event.getOrderId());
            eventPublisher.publish(new PaymentProcessedEvent(event.getOrderId()));
        } catch (Exception e) {
            eventPublisher.publish(new PaymentFailedEvent(event.getOrderId()));
            // Trigger compensation
            inventoryService.cancelReservation(event.getOrderId());
        }
    }
}
```

### 6. Configuration Management

#### Spring Cloud Config
```java
// Config Server
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}

# Config Server application.yml
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/myorg/config-repo
          search-paths: '{application}'
        default-label: main

# Client Configuration
spring:
  application:
    name: user-service
  cloud:
    config:
      uri: http://localhost:8888
      fail-fast: true
  config:
    import: "configserver:"

# External configuration files in git repo
# user-service.yml
server:
  port: 8081

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/userdb
    username: ${DB_USERNAME:user}
    password: ${DB_PASSWORD:password}

management:
  endpoints:
    web:
      exposure:
        include: refresh,health,info
```

### 7. Monitoring and Observability

#### Distributed Tracing
```java
// Sleuth + Zipkin
@RestController
public class OrderController {

    @Autowired
    private UserServiceClient userServiceClient;

    @Autowired
    private Tracer tracer;

    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
        Span span = tracer.nextSpan().name("get-order").start();
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            span.tag("order.id", orderId);

            Order order = orderService.findById(orderId);

            // This call will be traced automatically
            User user = userServiceClient.getUserById(order.getUserId());
            order.setUser(user);

            return order;
        } finally {
            span.end();
        }
    }
}

# Configuration for distributed tracing
spring:
  sleuth:
    zipkin:
      base-url: http://zipkin-server:9411
    sampler:
      probability: 1.0 # Sample 100% for development

management:
  tracing:
    sampling:
      probability: 1.0
```

#### Metrics and Health Checks
```java
// Custom metrics
@Component
public class OrderMetrics {

    private final Counter orderCounter;
    private final Timer orderProcessingTimer;

    public OrderMetrics(MeterRegistry meterRegistry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .register(meterRegistry);

        this.orderProcessingTimer = Timer.builder("order.processing.time")
            .description("Order processing time")
            .register(meterRegistry);
    }

    public void incrementOrderCount() {
        orderCounter.increment();
    }

    public Timer.Sample startTimer() {
        return Timer.start(orderProcessingTimer);
    }
}

// Custom health indicator
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Autowired
    private DataSource dataSource;

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                return Health.up()
                    .withDetail("database", "Available")
                    .build();
            }
        } catch (Exception e) {
            return Health.down()
                .withDetail("database", "Unavailable")
                .withException(e)
                .build();
        }
        return Health.down().build();
    }
}
```

## Common Interview Questions

### 1. When to use Microservices vs Monolith?

**Use Microservices when:**
- Large, complex applications
- Multiple teams working independently
- Different scaling requirements per component
- Technology diversity needed
- High availability requirements

**Use Monolith when:**
- Small to medium applications
- Simple, well-defined scope
- Single team
- Rapid prototyping
- Limited operational capability

### 2. How do you handle data consistency in microservices?
- **Eventual Consistency**: Accept temporary inconsistency
- **Saga Pattern**: Coordinate transactions across services
- **Event Sourcing**: Store events instead of current state
- **CQRS**: Separate read and write models

### 3. What are the challenges of microservices?
- **Network latency and failures**
- **Distributed system complexity**
- **Data consistency**
- **Service discovery and configuration**
- **Monitoring and debugging**
- **Testing complexity**

### 4. How do you implement authentication in microservices?
```java
// JWT-based authentication with API Gateway
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && jwtUtil.validateToken(token)) {
            UserDetails userDetails = jwtUtil.getUserDetailsFromToken(token);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null,
                                                       userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
```

### 5. How do you handle service-to-service communication?
- **Synchronous**: REST APIs, gRPC
- **Asynchronous**: Message queues, Event streaming
- **Service Mesh**: Istio, Linkerd for communication management

## Migration Strategies: From Monolith to Microservices

### The Strangler Fig Approach (Recommended)

**Like the Elixir Umbrella Pattern:** Just as you might extract OTP applications from a growing Elixir system, you gradually extract services from your monolith.

#### Phase 1: Identify Bounded Contexts
```java
// Original Monolithic Controller
@RestController
public class ECommerceController {

    // User management
    @PostMapping("/users")
    public User createUser(@RequestBody CreateUserRequest request) { }

    // Product catalog
    @GetMapping("/products")
    public List<Product> getProducts() { }

    // Order processing
    @PostMapping("/orders")
    public Order createOrder(@RequestBody CreateOrderRequest request) { }

    // Inventory management
    @PutMapping("/inventory/{productId}")
    public void updateInventory(@PathVariable String productId, @RequestBody InventoryUpdate update) { }
}

// Identify clear business boundaries:
// 1. User Management (Identity & Access)
// 2. Product Catalog (Content Management)
// 3. Order Processing (Core Business Logic)
// 4. Inventory Management (Stock Control)
```

#### Phase 2: Extract Services Behind Proxy
```java
// Create a proxy that routes to new services or legacy code
@Component
public class UserServiceProxy {

    @Value("${feature.new-user-service.enabled:false}")
    private boolean useNewService;

    @Value("${feature.new-user-service.percentage:0}")
    private int rolloutPercentage;

    @Autowired
    private NewUserServiceClient newUserService;

    @Autowired
    private LegacyUserService legacyUserService;

    public User createUser(CreateUserRequest request) {
        // Gradual rollout based on user ID hash
        boolean useNew = useNewService &&
            (rolloutPercentage == 100 ||
             Math.abs(request.getEmail().hashCode()) % 100 < rolloutPercentage);

        if (useNew) {
            try {
                return newUserService.createUser(request);
            } catch (Exception e) {
                // Fallback to legacy during rollout
                log.warn("New service failed, falling back to legacy", e);
                return legacyUserService.createUser(request);
            }
        } else {
            return legacyUserService.createUser(request);
        }
    }
}

// Configuration for gradual rollout
# application.yml
feature:
  new-user-service:
    enabled: true
    percentage: 10  # Start with 10% of users
```

#### Phase 3: Data Migration Strategy
```java
// Dual-write approach during transition
@Service
public class OrderService {

    @Autowired
    private LegacyOrderRepository legacyRepo;

    @Autowired
    private NewOrderRepository newRepo;

    @Value("${migration.dual-write.enabled:false}")
    private boolean dualWriteEnabled;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        // Always write to legacy system first (source of truth)
        Order order = legacyRepo.save(new Order(request));

        if (dualWriteEnabled) {
            try {
                // Also write to new system
                newRepo.save(order);
            } catch (Exception e) {
                // Don't fail the operation, just log
                log.error("Failed to write to new system", e);
            }
        }

        return order;
    }
}

// Background sync job to ensure consistency
@Scheduled(fixedDelay = 60000)
public void syncOrderData() {
    List<Order> unsynced = legacyRepo.findUnsyncedOrders();
    for (Order order : unsynced) {
        try {
            newRepo.save(order);
            legacyRepo.markAsSynced(order.getId());
        } catch (Exception e) {
            log.error("Failed to sync order: {}", order.getId(), e);
        }
    }
}
```

### Database Decomposition Patterns

#### Shared Database Anti-Pattern → Database per Service
```java
// BEFORE: Shared database with foreign keys
@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;  // Direct FK relationship

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items;
}

// AFTER: Service-owned data with references
@Entity
public class Order {
    @Id
    private Long id;

    private Long userId;  // Reference, not FK
    private String userEmail;  // Denormalized for performance

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items;
}

// Service boundaries respected
@Service
public class OrderService {

    public Order createOrder(CreateOrderRequest request) {
        // Get user data via API call, not DB join
        User user = userServiceClient.getUser(request.getUserId());

        Order order = new Order();
        order.setUserId(user.getId());
        order.setUserEmail(user.getEmail());  // Cache for performance

        return orderRepository.save(order);
    }
}
```

### Event-Driven Migration

#### Replace Synchronous Calls with Events
```java
// BEFORE: Synchronous service calls
@Service
public class OrderService {

    public Order createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(new Order(request));

        // Synchronous calls create tight coupling
        inventoryService.reserveItems(order.getItems());
        paymentService.authorizePayment(order.getTotal());
        notificationService.sendConfirmation(order.getUserId());

        return order;
    }
}

// AFTER: Event-driven approach
@Service
public class OrderService {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public Order createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(new Order(request));

        // Publish event - let other services react
        eventPublisher.publishEvent(new OrderCreatedEvent(order));

        return order;
    }
}

// Other services react to events
@EventListener
public class InventoryEventHandler {

    @EventListener
    public void handle(OrderCreatedEvent event) {
        inventoryService.reserveItems(event.getOrder().getItems());
    }
}

@EventListener
public class PaymentEventHandler {

    @EventListener
    public void handle(OrderCreatedEvent event) {
        paymentService.authorizePayment(event.getOrder().getTotal());
    }
}
```

#### Elixir Event Bus → Java Event Bus
```elixir
# Elixir: Phoenix PubSub
Phoenix.PubSub.broadcast(MyApp.PubSub, "orders", {:order_created, order})

# Subscribe to events
Phoenix.PubSub.subscribe(MyApp.PubSub, "orders")

def handle_info({:order_created, order}, state) do
  # Handle event
end
```

```java
// Java: Spring Application Events
@EventListener
public void handleOrderCreated(OrderCreatedEvent event) {
    // Handle event
}

// Or with message brokers (RabbitMQ/Kafka)
@RabbitListener(queues = "order.created")
public void handleOrderCreated(OrderCreatedEvent event) {
    // Handle event
}
```

### Common Migration Pitfalls and Solutions

#### Pitfall 1: Distributed Monolith
```java
// BAD: Services too chatty and coupled
@Service
public class OrderService {

    public Order createOrder(CreateOrderRequest request) {
        User user = userService.getUser(request.getUserId());  // Call 1
        Address address = userService.getAddress(user.getId());  // Call 2
        Product product = productService.getProduct(request.getProductId());  // Call 3
        boolean inStock = inventoryService.checkStock(product.getId());  // Call 4
        PaymentMethod payment = paymentService.getPaymentMethod(user.getId());  // Call 5

        // This is a distributed monolith!
        return new Order(user, address, product, payment);
    }
}

// GOOD: Aggregate data and minimize calls
@Service
public class OrderService {

    public Order createOrder(CreateOrderRequest request) {
        // Single call with all needed data
        OrderContext context = orderContextService.getOrderContext(
            request.getUserId(),
            request.getProductId()
        );

        return new Order(context);
    }
}

@Service
public class OrderContextService {

    public OrderContext getOrderContext(Long userId, Long productId) {
        // Parallel calls or cached/denormalized data
        CompletableFuture<User> userFuture =
            CompletableFuture.supplyAsync(() -> userService.getUser(userId));
        CompletableFuture<Product> productFuture =
            CompletableFuture.supplyAsync(() -> productService.getProduct(productId));

        return new OrderContext(
            userFuture.join(),
            productFuture.join()
        );
    }
}
```

#### Pitfall 2: Data Consistency Issues
```java
// Use Saga pattern for distributed transactions
@Component
public class OrderProcessingSaga {

    @SagaOrchestrationStart
    public void processOrder(CreateOrderRequest request) {
        // Step 1: Create order (compensable)
        choreography()
            .step("create-order")
                .invokeParticipant(orderService, "createOrder", request)
                .withCompensation("cancelOrder")
            .step("reserve-inventory")
                .invokeParticipant(inventoryService, "reserveItems", request.getItems())
                .withCompensation("releaseReservation")
            .step("process-payment")
                .invokeParticipant(paymentService, "processPayment", request.getPayment())
                .withCompensation("refundPayment")
            .step("confirm-order")
                .invokeParticipant(orderService, "confirmOrder")
            .build()
            .execute();
    }
}
```

### Migration Timeline and Metrics

#### Week 1-2: Planning and Preparation
- Identify service boundaries using Domain-Driven Design
- Set up CI/CD pipeline for microservices
- Implement feature flags and monitoring

#### Week 3-8: First Service Extraction
- Extract least-coupled service first (usually user management)
- Implement dual-write pattern
- Monitor performance and error rates

#### Week 9-16: Iterative Extraction
- Extract one service every 2-3 weeks
- Gradually increase traffic to new services
- Retire legacy code paths

#### Success Metrics
```java
// Monitor migration progress
@Component
public class MigrationMetrics {

    private final MeterRegistry meterRegistry;

    public void recordServiceCall(String service, String operation, boolean legacy) {
        Counter.builder("service.calls")
            .tag("service", service)
            .tag("operation", operation)
            .tag("legacy", String.valueOf(legacy))
            .register(meterRegistry)
            .increment();
    }
}

// Track in application.yml
management:
  metrics:
    export:
      prometheus:
        enabled: true
  endpoints:
    web:
      exposure:
        include: metrics,health,prometheus
```

## Best Practices

### 1. Design Principles
- **Single Responsibility**: One service, one business capability
- **Autonomy**: Services should be independently deployable
- **Domain-Driven Design**: Align services with business domains
- **API-First**: Design APIs before implementation
- **Stateless**: Services should not maintain session state

### 2. Testing Strategy
```java
// Contract Testing with Pact
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
public class UserServiceContractTest {

    @Pact(consumer = "order-service")
    public RequestResponsePact getUserById(PactDslWithProvider builder) {
        return builder
            .given("user with id 123 exists")
            .uponReceiving("a request for user with id 123")
            .path("/users/123")
            .method("GET")
            .willRespondWith()
            .status(200)
            .headers(Map.of("Content-Type", "application/json"))
            .body(LambdaDsl.newJsonBody(o -> o
                .numberType("id", 123)
                .stringType("username", "john_doe")
                .stringType("email", "john@example.com")
            ).build())
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getUserById")
    void testGetUserById(MockServer mockServer) {
        // Test implementation using the mock server
        UserServiceClient client = new UserServiceClient(mockServer.getUrl());
        User user = client.getUserById(123L);

        assertThat(user.getId()).isEqualTo(123L);
        assertThat(user.getUsername()).isEqualTo("john_doe");
    }
}
```

### 3. Deployment and DevOps
```yaml
# Docker Compose for local development
version: '3.8'
services:
  eureka-server:
    image: eureka-server:latest
    ports:
      - "8761:8761"

  user-service:
    image: user-service:latest
    environment:
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka-server:8761/eureka
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/userdb
    depends_on:
      - eureka-server
      - postgres

  order-service:
    image: order-service:latest
    environment:
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka-server:8761/eureka
    depends_on:
      - eureka-server
      - mysql

  api-gateway:
    image: api-gateway:latest
    ports:
      - "8080:8080"
    environment:
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka-server:8761/eureka
    depends_on:
      - eureka-server

# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: user-service:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "k8s"
        - name: DB_HOST
          value: "postgres-service"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 4. Security Considerations
- **API Gateway Authentication**: Centralized security
- **Service-to-Service Security**: mTLS, service mesh
- **Secret Management**: Vault, Kubernetes secrets
- **Network Segmentation**: VPCs, firewalls
- **Audit Logging**: Centralized logging for security events

## Performance Optimization

### 1. Caching Strategies
```java
// Distributed caching with Redis
@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Cacheable(value = "users", key = "#userId")
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }

    @CacheEvict(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}

# Redis configuration
spring:
  cache:
    type: redis
  redis:
    host: redis-cluster
    port: 6379
    cluster:
      nodes: redis-node1:6379,redis-node2:6379,redis-node3:6379
```

### 2. Connection Pooling
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

# HTTP client configuration
feign:
  httpclient:
    enabled: true
    max-connections: 200
    max-connections-per-route: 50
```

### 3. Async Processing
```java
@Service
public class NotificationService {

    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmailNotification(String email, String message) {
        // Async email sending
        emailService.send(email, message);
        return CompletableFuture.completedFuture(null);
    }
}

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("Async-");
        executor.initialize();
        return executor;
    }
}
```

Microservices architecture provides scalability and flexibility but comes with increased complexity. Success requires careful planning, proper tooling, and strong DevOps practices.