# Migration & Database Patterns

> **Before you start**: How do you move from a Monolith to Microservices without stopping business?

## The Strangler Fig Pattern

**Overview**: Gradually replace legacy systems by "strangling" them - routing traffic away piece by piece.

**Pros**: Risk-free, Incremental, Business continuity.
**Cons**: Long timeline, Complex routing.

**Elixir Parallel**: Like gradually moving functions from a Monolith module to separate Apps in an Umbrella.

### Migration Phases

#### Phase 1: Identify Bounded Contexts
Identify clear business boundaries (e.g., User Management, Order Processing) within the monolith.

#### Phase 2: Extract Services Behind Proxy
Use a proxy to route traffic.

```java
@Component
public class UserServiceProxy {
    @Value("${feature.new-user-service.enabled:false}")
    private boolean useNewService;

    public User createUser(Request request) {
        if (useNewService) {
            try {
                return newUserService.create(request);
            } catch (Exception e) {
                return legacyUserService.create(request); // Fallback
            }
        }
        return legacyUserService.create(request);
    }
}
```

#### Phase 3: Data Migration (Dual Write)
```java
public void createOrder(Order order) {
    legacyRepo.save(order); // Source of truth
    if (dualWriteEnabled) {
        try {
            newRepo.save(order);
        } catch (Exception e) {
            log.error("Sync failed", e);
        }
    }
}
```

## Database Patterns

### Database per Service
**Overview**: Each microservice owns its private database. Other services must use APIs to access this data.

**Pros**: Loose coupling, Polyglot persistence.
**Cons**: No CROSS-JOINs, No ACID transactions across services.

**Elixir Parallel**: Separate **Ecto Prompts** for each OTP app.

### Decomposition Strategies

**Anti-Pattern**: Shared Database (services reading each other's tables).
**Refactoring**:
1.  **Before**: `Order` entity has a `@ManyToOne User`.
2.  **After**: `Order` entity has `Long userId`.

## Event-Driven Migration
Replace synchronous calls with events to decouple services during migration.

**Elixir**: Phoenix PubSub.
**Java**: Spring Events / RabbitMQ.

```java
// BEFORE: Sync Call
inventoryService.reserve(order.getItems()); // Coupled

// AFTER: Event
eventPublisher.publish(new OrderCreatedEvent(order)); // Decoupled
```

## AI-Assisted Monolith Extraction (Production Lessons)

> From 1Password's real-world use of AI agents to break apart a Go monolith.

**The actual bottleneck**: not writing code — it's managing *ordering constraints* across schema migrations, deployment sequencing, and shared state.

**What worked**:
- Use agents to **build deterministic tools** (AST analyzers, ownership manifests) first; then run agents over those stable artifacts — not over a live codebase they must guess about.
- Static analysis (Go SSA + SQL parsing + runtime coupling) to build accurate domain ownership maps and extraction order.
- Parallel agents in isolated git worktrees for independent changes.
- Exhaustive migration playbooks with explicit templates → 3,000+ call sites migrated in hours.

**Failure modes to design against**:
- Agent gap-filling: missing context → plausible-but-wrong assumptions (e.g., wrong ID format propagated everywhere → full rollback).
- Ordering violations: backfilling DB columns *before* updating write paths → silent data loss.
- Shared table misclassification: treating shared state as independently owned → deployment conflicts.

**Key rules**:
1. Sequencing matters more than code quality.
2. Produce deterministic intermediate artifacts before acting.
3. Solve isolation *before* enabling parallelism.

## Quick Check
1. What is "Dual Write" and why is it needed?
2. Why is "Shared Database" considered an anti-pattern?
3. Why must schema migrations happen *after* write-path code changes, not before?

---
**Next**: [Observability & Operations](./08-observability-and-ops.md)
