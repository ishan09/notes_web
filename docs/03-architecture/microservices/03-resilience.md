# Resilience Patterns

> **Before you start**: What happens when a service you depend on goes down?

## Circuit Breaker Pattern

**Overview**: Prevents cascading failures by "breaking the circuit" when a service is failing.

**Elixir Parallel**: Similar to **Supervisor `:one_for_one`** strategy.

**Pros**:
*   Prevents cascade failures
*   Fast failure detection
*   Automatic recovery testing

**Cons**:
*   Complexity
*   False positives

### Implementation (Resilience4j)

```java
@Component
public class UserServiceClient {

    @Autowired
    private RestTemplate restTemplate;

    @CircuitBreaker(name = "userService", fallbackMethod = "getDefaultUser")
    @TimeLimiter(name = "userService")
    @Retry(name = "userService")
    public CompletableFuture<User> getUserById(Long userId) {
        return CompletableFuture.supplyAsync(() ->
            restTemplate.getForObject("http://user-service/users/" + userId, User.class)
        );
    }

    public CompletableFuture<User> getDefaultUser(Long userId, Exception ex) {
        return CompletableFuture.completedFuture(
            new User(userId, "Unknown User", "unknown@example.com")
        );
    }
}
```

### Resilience4j Configuration
```yaml
resilience4j:
  circuitbreaker:
    instances:
      userService:
        failureRateThreshold: 50
        minimumNumberOfCalls: 5
        waitDurationInOpenState: 5s
  retry:
    instances:
      userService:
        maxAttempts: 3
        waitDuration: 1s
```

## Bulkhead Pattern (Failure Isolation)

**Overview**: Isolates critical resources (like thread pools) to prevent failure in one area from cascading to others.
**Analogy**: Ship compartments. If one floods, the others stay dry.

**Pros**:
*   Failure isolation
*   Resource prioritization
*   Prevents resource starvation

**Cons**:
*   Resource overhead
*   Configuration complexity

**Elixir Parallel**: Like separate **Supervisors** with different restart strategies.

### Implementation
```java
@Configuration
public class BulkheadConfig {
    @Bean("orderExecutor")
    public TaskExecutor orderExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10); // Dedicated pool
        return executor;
    }
}

@Service
public class OrderService {
    @Async("orderExecutor")
    public CompletableFuture<Order> processOrder(Request req) {
        // Critical path isolated
        return CompletableFuture.completedFuture(processInternal(req));
    }
}
```

## Quick Check
1. What is the difference between "Open" and "Closed" circuit states?
2. How does Retry differ from Circuit Breaker?

---
**Next**: [Inter-Service Communication](./04-communication.md)
