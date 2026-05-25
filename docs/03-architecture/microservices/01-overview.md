# Microservices Overview

> **Before you start**: Do you understand the limitations of Monolithic architecture?

## What Are Microservices Really?

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
```
```java
// In Java: Separate Spring Boot applications
@SpringBootApplication
public class UserServiceApplication { }
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
send(user_pid, {:create_user, user_data})
```
```java
userServiceClient.createUser(userData);
```

**Supervision Trees → Circuit Breakers**
```elixir
Supervisor.start_link(children, strategy: :one_for_one)
```
```java
@CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
public User getUser(Long id) { ... }
```

## Why Use Microservices?

### Problems They Solve

1.  **Team Scaling ("Conway's Law")**
    *   **Problem**: Large teams stepping on each other's code
    *   **Solution**: Each team owns complete services
    *   **Real Example**: Netflix has 1000+ microservices

2.  **Technology Diversity**
    *   **Problem**: Stuck with one technology stack forever
    *   **Solution**: Each service can use appropriate technology

3.  **Independent Deployment**
    *   **Problem**: Deploy entire app for small changes
    *   **Solution**: Deploy only changed services

4.  **Fault Isolation**
    *   **Problem**: One bug crashes entire application
    *   **Solution**: Service failures are contained

## When NOT to Use Microservices

### Anti-Patterns and Red Flags

**Don't Use If:**
*   Team smaller than 8-10 people
*   Simple CRUD application
*   Tight coupling between features
*   No DevOps capability

**Real Horror Stories:**
*   **Distributed Monolith**: Services must deploy together
*   **Microservice Hell**: 50+ services for simple functionality
*   **Data Inconsistency Nightmare**: No rollback mechanism

### The "Microservice Premium"
Microservices add complexity: network calls, distributed debugging, service discovery. **Rule of Thumb**: If you can't manage a monolith, microservices will be worse.

## Core Concepts

### 1. What are Microservices?
An architectural approach where applications are built as a collection of small, independently deployable services that communicate over well-defined APIs.

**Key Characteristics:**
*   Single responsibility per service
*   Independently deployable
*   Technology agnostic
*   Decentralized governance
*   Fault isolation
*   Organized around business capabilities

### 2. Microservices vs Monolith

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single unit | Independent services |
| **Scaling** | Scale entire app | Scale individual services |
| **Technology** | Single stack | Polyglot architecture |
| **Data** | Shared database | Database per service |
| **Team Structure** | Large teams | Small, autonomous teams |
| **Complexity** | Simple deployment | Complex orchestration |

## Practice Interview Questions

### 1. The Migration Decision
**Q: When would you NOT moving to microservices?**
*   **A**: When the team is small (< 10 devs), the domain is simple (CRUD), or you need rapid prototyping (startup MVP). The operational overhead of K8s, tracing, and distributed transactions will slow you down more than the monolith.

### 2. Distributed Challenges
**Q: What is the hardest part of microservices that tutorials don't show?**
*   **A**: **Distributed transactions** (no JOINs, no ACID), **Network failures** (retries, timeouts), and **Debugging** (tracing a request through 10 services).

## Quick Check
1. What is the "Microservice Premium"?
2. How does a Java Circuit Breaker compare to an Elixir Supervisor?

---
**Next**: [Service Discovery & Gateway](./02-discovery-and-gateway.md)
