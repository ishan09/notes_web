# Maven Multi-Module Projects

> **Before you start**: You have a Monorepo with "Core", "API", and "Web". How do you version them together?

## The Structure

Multi-module projects allow you to split a large system into logical components that build together.

### Stick Diagram: The Reactor

```
             ┌──────────────┐
             │  Root (POM)  │
             └──────┬───────┘
                    │ Aggregates
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Core   │◀─│ Service  │◀─│   Web    │
└──────────┘  └──────────┘  └──────────┘
 (Depends on None)   (Depends on Core)    (Depends on Service)
```

**Build Order**: The Maven **Reactor** sorts this DAG (Directed Acyclic Graph). It will build `Core` -> `Service` -> `Web`.

## Parent POM vs Aggregator

1.  **Parent POM**: "I provide common configuration (Java 17, Spring Boot version) for my children to INHERIT."
2.  **Aggregator (Root)**: "I list the modules so you can build them all with one command (`modules` tag)."

*Usually, the Root POM is BOTH a Parent and an Aggregator.*

## Dependency Management (The Tech Lead's Tool)

In the Parent POM, use `<dependencyManagement>`.

```xml
<!-- Parent POM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>3.12.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

```xml
<!-- Child POM -->
<dependencies>
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <!-- NO VERSION HERE! Inherited from Parent -->
    </dependency>
</dependencies>
```

**Why?** Ensures all 50 microservices use the EXACT same version of `commons-lang3`.

## Quick Check

1. If module A depends on B, which one does Maven build first?
2. What is the difference between `<dependencies>` and `<dependencyManagement>`?

## Practice Interview Questions

### 1. Cyclic Dependencies
**Q: Module A depends on B, and B depends on A. What happens?**
*   **A**: Maven fails with a `CyclicReferenceError`.
    *   **Fix**: Extract the shared logic into a new Module C. A and B both depend on C.

### 2. The Bill of Materials (BOM) Pattern
**Q: How do we share dependencies across projects that DON'T share a parent?**
*   **A**: Create a dedicated "BOM Project" (packaging `pom`) that only contains `<dependencyManagement>`. Other projects import this BOM:
    ```xml
    <dependency>
        <scope>import</scope>
        <type>pom</type>
    </dependency>
    ```

---
**Next**: [Gradle Basics](./05-gradle-basics.md)
