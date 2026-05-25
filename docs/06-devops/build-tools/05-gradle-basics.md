# Gradle Basics for Maven Users

> **Before you start**: Maven is XML (declarative). Gradle is Code (imperative). Ready to code your build?

## Gradle vs Maven Mental Model

| Feature | Maven | Gradle |
|---------|-------|--------|
| **Language** | XML (Rigid) | Groovy / Kotlin (Flexible) |
| **Performance** | Slower (clean builds) | Fast (Incremental builds + Daemon) |
| **Structure** | Fixed Lifecycle | Graph of Tasks (DAG) |
| **Philosophy** | Convention over Configuration | Flexible, scriptable power |

### Stick Diagram: Task Graph (The Gradle Way)

In Maven, you have a linear lifecycle. In Gradle, you have a **Directed Acyclic Graph (DAG)** of tasks.

```
       ┌──────────────┐
       │   compile    │
       └──────┬───────┘
              │ dependsOn
       ┌──────▼───────┐
       │ processRes   │
       └──────┬───────┘
              │ dependsOn
       ┌──────▼───────┐
       │   classes    │
       └──────────────┘
```

## The Build File (`build.gradle`)

Equivalent to `pom.xml`, but much shorter.

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.0.0'
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'

repositories {
    mavenCentral()
}

dependencies {
    // Scope: implementation (compile), testImplementation (test)
    implementation 'org.springframework.boot:spring-boot-starter-web'
    testImplementation 'org.junit.jupiter:junit-jupiter'
}

test {
    useJUnitPlatform()
}
```

## Dependency Scopes Mapping

| Maven Scope | Gradle Configuration | Description |
|-------------|----------------------|-------------|
| `compile` | `implementation` | Available at compile & runtime (internal details hidden) |
| `compile` | `api` (Java Library plugin) | Transitive (leaks to consumers) |
| `test` | `testImplementation` | Available only for tests |
| `runtime` | `runtimeOnly` | Only at runtime |
| `provided` | `compileOnly` | Available compile-time, not packaged |

## Key Commands

*   `./gradlew build`: Compiles, tests, and assembles.
*   `./gradlew clean`: Deletes build directory.
*   `./gradlew bootRun`: Runs the Spring Boot app.
*   `./gradlew tasks`: Lists available tasks.
*   `./gradlew dependencies`: Prints the dependency tree.

## The Wrapper (`gradlew`)
**Always use the wrapper.** It locks the Gradle version for the project, so you don't need Gradle installed on your machine.
*   `gradle/wrapper/gradle-wrapper.properties`: The version definition.

## Quick Check

1. Which Gradle configuration is equivalent to Maven's `provided` scope?
2. Why is `./gradlew` preferred over `gradle`? (Hint: Version consistency).

## Practice Interview Questions

### 1. Maven vs Gradle Performance
**Q: Why is Gradle generally faster than Maven?**
*   **A**:
    1.  **Incremental Builds**: Gradle tracks input/output hashes. If code didn't change, it skips the task (`UP-TO-DATE`).
    2.  **Build Cache**: Reuses outputs from previous builds (even across different machines).
    3.  **Daemon**: Long-lived process that keeps JVM warm.

### 2. Implementation vs API
**Q: In Gradle, what is the difference between `implementation` and `api`?**
*   **A**:
    *   `api`: Dependencies are visible to consumers (like Maven `compile`).
    *   `implementation`: Dependencies are **hidden** from consumers. Changing an implementation dependency doesn't force consumers to recompile, making builds much faster.

---
**Next**: [Return to Index](./README.md)
