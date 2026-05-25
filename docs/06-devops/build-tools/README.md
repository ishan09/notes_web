# Build Tools (Maven & Gradle)

> "Amateurs talk about strategy. Professionals talk about logistics." — General Omar Bradley

As a Tech Lead, your job isn't just writing code; it's ensuring the **supply chain** (builds, dependencies, releases) works smoothly. This module covers the logistics of Java development.

## 🏗️ Maven Modules

### 1. [Core Concepts](./01-maven-core.md)
*   **Topics**: POM structure, Project Coordinates, Standard Directory Layout.
*   **Visual**: The Default Lifecycle Stick Diagram.

### 2. [Dependency Management](./02-maven-dependencies.md)
*   **Topics**: Scopes (compile vs test), Transitive Dependencies, Conflict Resolution (Nearest Wins).
*   **Key Skill**: Debugging `Dependency Hell` with `mvn dependency:tree`.

### 3. [Plugins & Profiles](./03-maven-plugins-profiles.md)
*   **Topics**: Surefire vs Failsafe, Profile activation (Dev vs Prod).
*   **Visual**: Profile State Diagram.

### 4. [Multi-Module Projects](./04-maven-multi-module.md)
*   **Topics**: Parent POM (Inheritance), Reactor (Aggregation), BOM Pattern.
*   **Role**: Critical for managing microservices repositories.

## 🐘 Gradle

### 5. [Gradle Basics](./05-gradle-basics.md)
*   **Topics**: `build.gradle`, Task Graph, Incremental Builds.
*   **Comparison**: Maven vs Gradle feature table.
*   **Key Concept**: `implementation` vs `api`.

## Best Practices Checklist

*   [ ] **Lock Versions**: Never use `LATEST` or `SNAPSHOT` in production releases.
*   [ ] **Use Wrappers**: Always commit `mvnw` or `gradlew` to ensure consistent build tool versions.
*   [ ] **Fail Fast**: Run unit tests *before* integration tests.
*   [ ] **Minimize Scope**: Use `test` and `provided` scopes aggressively to keep artifacts small.
