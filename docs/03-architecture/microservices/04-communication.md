# Inter-Service Communication

> **Before you start**: REST vs Messaging vs gRPC — do you know when to use which?

## Synchronous Communication (REST)

**Best for**: Queries, simple real-time commands.

### Implementation (Feign Client)
```java
@FeignClient(name = "user-service")
public interface UserServiceClient {
    @GetMapping("/users/{userId}")
    User getUserById(@PathVariable("userId") Long userId);
}
```

## Synchronous Communication (gRPC)

**Best for**: High-throughput internal service calls, streaming, polyglot environments.

> See the full [gRPC Zero-to-Hero Guide](../../00-prerequisite/05-grpc.md) for deep coverage. Summary below.

### Why gRPC over REST for Internal Services

```
REST (JSON/HTTP1.1)         gRPC (Protobuf/HTTP2)
─────────────────────       ─────────────────────
Text-based (verbose)        Binary (5–10× smaller)
No enforced schema          .proto = contract
Request-response only       4 patterns incl. streaming
Per-connection serial       Multiplexed on one connection
Optional code gen           First-class code generation
```

### Quick Setup (Spring Boot + grpc-spring-boot-starter)

**Proto definition:**
```protobuf
syntax = "proto3";
package order.v1;

message CreateOrderRequest {
  int64  user_id   = 1;
  string product   = 2;
  int32  quantity  = 3;
}

message OrderResponse {
  int64  order_id = 1;
  string status   = 2;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (OrderResponse);
}
```

**Server:**
```java
@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void createOrder(CreateOrderRequest req,
                            StreamObserver<OrderResponse> observer) {
        Order saved = orderRepo.save(req.getUserId(), req.getProduct());
        observer.onNext(OrderResponse.newBuilder()
            .setOrderId(saved.getId())
            .setStatus("CREATED")
            .build());
        observer.onCompleted();
    }
}
```

**Client:**
```java
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub stub;

public OrderResponse placeOrder(long userId, String product) {
    return stub
        .withDeadlineAfter(5, TimeUnit.SECONDS)  // Always set a deadline!
        .createOrder(CreateOrderRequest.newBuilder()
            .setUserId(userId)
            .setProduct(product)
            .build());
}
```

### Streaming Pattern (Server → Client)

```protobuf
// Server pushes a stream of events to client
rpc StreamOrderUpdates(OrderIdRequest) returns (stream OrderEvent);
```

```java
// Client consumes the stream
asyncStub.streamOrderUpdates(request, new StreamObserver<OrderEvent>() {
    @Override public void onNext(OrderEvent event) { handle(event); }
    @Override public void onError(Throwable t)     { log.error("stream error", t); }
    @Override public void onCompleted()             { log.info("stream ended"); }
});
```

### Decision: REST vs gRPC (Internal Services)

| Factor | REST | gRPC |
|--------|------|------|
| Latency sensitivity | Low | High |
| Payload size | Small | Large / frequent |
| Streaming needed | No | Yes |
| Teams / languages | Same stack | Multiple languages |
| Debug-ability | Easy (curl) | Harder (need grpcurl) |

## Asynchronous Communication (Messaging)

**Best for**: Event notifications, decoupling, high throughput.

### Implementation (RabbitMQ / Spring AMQP)

**Producer (Order Service)**
```java
@Service
public class OrderEventPublisher {
    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(order.getId(), ...);
        rabbitTemplate.convertAndSend("order.exchange", "order.created", event);
    }
}
```

**Consumer (Notification Service)**
```java
@RabbitListener(queues = "notification.order.created")
public class OrderEventListener {
    @RabbitHandler
    public void handleOrderCreated(OrderCreatedEvent event) {
        notificationService.sendConfirmation(event);
    }
}
```

### Event Sourcing Basics
*(See Advanced Data Patterns for full audit trail details)*
Storing all changes as immutable events.

**Elixir Parallel**: Phoenix PubSub broadcasting changes.
```elixir
Phoenix.PubSub.broadcast(MyApp.PubSub, "orders", {:order_created, order})
```

## Practice Interview Questions

### 1. Handling Partial Failures
**Q: A downstream service is timing out. How do you prevent this from crashing your entire app?**
*   **A**: Use a **Circuit Breaker**. It detects the failure rate and "opens" the circuit to fail fast without waiting for timeouts, allowing the system to recover gracefully.

### 2. Message Ordering
**Q: How do you guarantee message ordering in RabbitMQ/Kafka?**
*   **A**:
    *   **Kafka**: Partition traffic by a key (e.g., `userId`). All events for that user go to the same partition and are consumed in order.
    *   **RabbitMQ**: Use a consistent hash exchange or single active consumer (limits concurrency).

### 3. REST vs gRPC vs Messaging
**Q: Service A needs to call Service B. When do you pick each?**
*   **A**:
    *   **REST**: Public-facing, browser clients, simple CRUD, human-readable responses needed.
    *   **gRPC**: Internal high-throughput calls, streaming data, polyglot services, strong typing needed.
    *   **Messaging (Kafka/RabbitMQ)**: Decoupled event-driven flow, fire-and-forget, fan-out to multiple consumers, no real-time response needed.

## Quick Check
1. Why might Synchronous communication lead to tight coupling?
2. What happens to the message if the Consumer is down in Async communication?
3. Why does gRPC need an L7-aware load balancer, unlike REST on HTTP/1.1?

---
**Next**: [Distributed Transactions (Saga)](./05-distributed-transactions.md)
