# Microservices Architecture Patterns

This directory contains a comprehensive guide to Microservices, refactored into modular topics for better learning.

## Module Index

### Foundations
1.  [**Overview**](./01-overview.md): Monolith vs Microservices, Core Concepts.
2.  [**Discovery & Gateway**](./02-discovery-and-gateway.md): Eureka, API Gateway (Zuul/Spring Cloud).
3.  [**Resilience**](./03-resilience.md): Circuit Breakers, Bulkheads.
4.  [**Communication**](./04-communication.md): REST (Feign) vs Messaging (RabbitMQ).

### Advanced Patterns
5.  [**Distributed Transactions**](./05-distributed-transactions.md): Saga Pattern.
6.  [**Advanced Data**](./06-advanced-data-patterns.md): CQRS, Event Sourcing.
7.  [**Migration & Databases**](./07-migration-and-database.md): Strangler Fig, Database per Service.

### Operations
8.  [**Observability & Ops**](./08-observability-and-ops.md): Tracing, Metrics, K8s, Config.
9.  [**Testing & Security**](./09-testing-and-security.md): Contract Testing, JWT.

---

## Pattern Selection Guide

| Pattern | Best For | Complexity | Elixir Parallel |
|---------|----------|------------|-----------------|
| **Service Discovery** | Dynamic, Containers | Med | Registry process |
| **Circuit Breaker** | External calls | Low | Supervisor strategies |
| **CQRS** | Complex reads/writes | High | Separate GenServers |
| **Strangler Fig** | Migration | Med | Gradual OTP migration |
| **Saga** | Distributed Tx | High | GenServer coordination |

## Common Interview Questions

**1. When to use Microservices vs Monolith?**
*   **Microservices**: Large complexity, distinct scaling needs, failures must be isolated.
*   **Monolith**: Startups, simple domains, small teams (speed to market).

**2. How to handle data consistency?**
*   Use **Eventual Consistency** where possible.
*   Use **Saga Pattern** for critical flows.

**3. What are the biggest challenges?**
*   Network latency, Distributed debugging, Data consistency, Operational complexity.

---
*Refactored from original monolithic guide for better active learning.*
