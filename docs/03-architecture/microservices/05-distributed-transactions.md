# Distributed Transactions (Saga Pattern)

> **Before you start**: How do you maintain consistency without 2-Phase Commit (2PC)?

## Saga Pattern

**Overview**: Manages distributed transactions across multiple services using a sequence of local transactions with compensating actions.

**Pros**:
*   Eventual consistency without distributed locks
*   Better performance than 2PC
*   Clear failure handling

**Cons**:
*   Complex compensation logic
*   Eventual consistency only (not ACID)
*   Difficult debugging

**Elixir Parallel**: Like **GenServer** processes coordinating with messages and error handling.

### Implementation Approaches

#### 1. Orchestration
Central coordinator tells services what to do. Easier to debug.

```java
@Service
public class OrderSagaOrchestrator {
    public void processOrder(Request request) {
        try {
            // Step 1: Create Order
            orderService.createOrder(request);
            // Step 2: Reserve Inventory
            inventoryService.reserve(request.getItems());
            // Step 3: Payment
            paymentService.process(request.getAmount());
            
            confirmOrder();
        } catch (Exception e) {
            compensate(); // Rollback all steps
        }
    }
    
    private void compensate() {
        inventoryService.cancelReservation();
        orderService.cancelOrder();
    }
}
```

#### 2. Choreography
Services listen to events and react. More decoupled but harder to track.

```java
@EventListener
public void handle(OrderCreatedEvent event) {
    try {
        inventoryService.reserve(event.getItems());
        eventPublisher.publish(new InventoryReservedEvent(...));
    } catch (Exception e) {
        eventPublisher.publish(new InventoryFailedEvent(...));
        // Compensation logic triggered by FailedEvent
    }
}
```

## Practice Interview Questions

### 1. Saga vs 2PC
**Q: Why don't we just use Two-Phase Commit (2PC/XA) for everything?**
*   **A**: 2PC is a blocking protocol. If one service locks a row and crashes, everyone waits. It destroys availability and throughput (CAP theorem - chooses Consistency over Availability). Saga chooses Availability + Eventual Consistency.

### 2. Orchestration Bottlenecks
**Q: In Orchestration, doesn't the Orchestrator become a single point of failure/bottleneck?**
*   **A**: It can.
    *   **Mitigation**: Scale the Orchestrator (it's stateless). Use a persistent store (database/Kafka) for state so if it crashes, another instance picks up.
    *   **Alternative**: Use Choreography for high-scale, simple flows.

### 3. Handling Compensation Failures
**Q: What happens if the Payment succeeds, but the Compensation (Refund) FAILS?**
*   **A**: This is the "Zombie" scenario.
    *   **Retry**: Ideally, compensations must be idempotent and retried until success.
    *   **Dead Letter Queue (DLQ)**: If it fails forever (e.g., account closed), alert a human operator for manual reconciliation.

## Quick Check
1. Why is 2PC (Two-Phase Commit) avoided in microservices?
2. What happens if the Compensation step fails?

---
**Next**: [Advanced Data Patterns](./06-advanced-data-patterns.md)
