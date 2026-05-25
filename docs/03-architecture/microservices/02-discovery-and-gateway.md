# Service Discovery and API Gateway

> **Before you start**: How do services find each other in a dynamic environment?

## Service Discovery Pattern

**Overview**: Services automatically register themselves and discover other services without hardcoded addresses.

**Pros**:
*   Dynamic scaling
*   Load balancing
*   Health checking built-in
*   Environment agnostic

**Cons**:
*   Infrastructure complexity
*   Single point of failure (registry)

**When to Use**: Multiple instances, Containers (K8s), Dynamic IPs.
**When to Avoid**: Static environments, few services (use DNS).

**Common Pitfalls**: Registry bottleneck, Stale registrations.

### Implementation (Eureka)

```java
// Eureka Service RegistryServer
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication { ... }

// Service Registration
@SpringBootApplication
@EnableEurekaClient
public class UserServiceApplication { ... }

// Service Discovery Client
@RestController
public class OrderController {
    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
        // Direct service call using service name (lb://user-service)
        User user = restTemplate.getForObject("http://user-service/users/{userId}", User.class);
        return order;
    }
}
```

## API Gateway Pattern

**Overview**: Single entry point that routes requests to microservices and handles cross-cutting concerns.

**Pros**:
*   Centralized auth/security
*   Rate limiting
*   Protocol translation
*   Single entry point

**Cons**:
*   Potential bottleneck
*   Single point of failure
*   Added latency

**Elixir Parallel**: Like **Phoenix Router** but for multiple applications.

### Implementation (Spring Cloud Gateway)

```yaml
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

### Legacy: Zuul Gateway
```java
@SpringBootApplication
@EnableZuulProxy
public class ApiGatewayApplication { ... }
```

## Quick Check
1. Why avoid hardcoding service URLs?
2. What are the risks of a "Fat Gateway"?

---
**Next**: [Resilience Patterns](./03-resilience.md)
