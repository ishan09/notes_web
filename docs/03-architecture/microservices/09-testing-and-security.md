# Testing & Security

> **Before you start**: How do you test a service that depends on 5 others?

## Testing Strategy

### Contract Testing (Pact)
**Problem**: Integration tests are slow/flaky. Mocks can drift from reality.
**Solution**: Consumer-Driven Contracts. The consumer defines what they need (Contract), and the provider verifies they adhere to it.

```java
// Consumer Test (Order Service)
@Pact(consumer = "order-service")
public RequestResponsePact createPact(PactDslWithProvider builder) {
    return builder
        .given("user 123 exists")
        .uponReceiving("get user 123")
        .willRespondWith().status(200)
        .toPact();
}
```

### Testing Pyramid in Microservices
1.  **Unit**: Business logic (fastest).
2.  **Component**: Business logic + In-memory DB.
3.  **Contract**: External dependencies.
4.  **End-to-End**: Full flow (slowest, minimize these).

## Security Patterns

### Authentication (API Gateway + JWT)
1.  User logs in via Auth Service -> gets JWT.
2.  Client sends JWT to API Gateway.
3.  Gateway validates signature and routes request.
4.  Services trust Gateway (or validate JWT again for Zero Trust).

```java
// JWT Filter
String token = extractToken(request);
if (jwtUtil.validate(token)) {
    SecurityContextHolder.setAuth(token);
}
```

### Service-to-Service Security
*   **mTLS**: Mutual TLS (Client and Server verify each other).
*   **Network Segmentation**: VPCs, Private subnets.

## Practice Interview Questions

### 1. API Gateway vs Load Balancer
**Q: Why do I need an API Gateway if I have a Load Balancer?**
*   **A**: A Load Balancer just creates a "Big Pipe" for traffic. An API Gateway offers specific APIs for clients (BFF Pattern), handles rate limiting per user, JWT validation to offload services, and request transformation.

### 2. Zero Trust Security
**Q: If I use an API Gateway, can my internal microservices trust everything?**
*   **A**: **No**. In a "Zero Trust" architecture, even internal services should assume the network is hostile.
    *   **mTLS**: Ensure the caller is who they say they are.
    *   **JWT Propagation**: Pass the user context (JWT) to ensure the user actually has permission to access the downstream resource.

## Quick Check
1. Why is End-to-End testing expensive in microservices?
2. Who generates the Contract in Consumer-Driven Contract testing?

---
**Next**: [Return to Index](./README.md)
