# Advanced Data Patterns

> **Before you start**: Is it hard to join data across microservices? These patterns answer that.

## CQRS (Command Query Responsibility Segregation)

**Overview**: Separates read and write operations into different models.

**Pros**: Independent scaling, Optimized queries.
**Cons**: Eventual consistency, Complexity.

**Elixir Parallel**: Separate **GenServers** for reads/writes with PubSub for sync.

### Implementation

**Command Side (Write - Relational DB)**
```java
public void createOrder(CreateOrderCommand command) {
    Order order = new Order(command.getCustomerId());
    orderRepository.save(order);
    // Emit event
    eventStore.save(new OrderCreatedEvent(order.getId(), ...));
}
```

**Query Side (Read - MongoDB/Elasticsearch)**
```java
// Materialized View
@Document(collection = "order_views")
public class OrderView {
    // Denormalized data optimized for UI
    private String customerName;
    private BigDecimal totalAmount;
}

// Event Handler updates Read Model
@EventListener
public void handle(OrderCreatedEvent event) {
    // Update OrderView
}
```

## Event Sourcing Pattern

**Overview**: Store changes as a sequence of events rather than current state.

**Elixir Parallel**: `GenEvent` or `EventStore` library.

**Benefits**: Time travel (replay), Audit trail.

### Implementation Concept
```java
public class Order {
    public static Order fromEvents(List<DomainEvent> events) {
        Order order = new Order();
        events.forEach(order::apply); // Reconstruct state
        return order;
    }
}
```

## Practice Interview Questions

### 1. CQRS Use Cases
**Q: Describe a real-world scenario where you would use CQRS.**
*   **A**: An E-commerce Product Page.
    *   **Writes (Command)**: Admins update product details (low throughput, high consistency).
    *   **Reads (Query)**: Millions of users search/view products (high throughput, low latency).
    *   **Solution**: Write to Normalized SQL (Command). Sync to ElasticSearch (Query) for fast search.

### 2. Eventual Consistency
**Q: The user updates their profile, but the "Read" model is outdated for 2 seconds. How do you handle this?**
*   **A**: "Read your own writes". The UI can optimistically update the view, or query the Command side strictly for that specific user immediately after an update.

## Quick Check
1. Why does CQRS often require Eventual Consistency?
2. How do you fix a bug in a Read Model with Event Sourcing? (Hint: Replay events).

---
**Next**: [Migration & Database Patterns](./07-migration-and-database.md)
