# Maven Core Concepts

> **Before you start**: Have you ever manually managed 50 JAR files in a `lib` folder and pulled your hair out?

## What is Maven?

Maven is your **project architect**. It doesn't just build your code; it tells you where to put source files, how to name artifacts, and how to manage the thousands of libraries your project depends on.

**Analogy**: If a script is like a handwritten recipe, Maven is like a **Standard Operating Procedure (SOP)** for a professional kitchen. Everyone knows exactly where component preparation happens, where cooking happens, and where plating happens.

## The Mental Model: Build Lifecycle

Maven works in **phases**. Each phase acts like a checkpoint.

### Stick Diagram: The Default Lifecycle

```
    Start
      │
      ▼
┌────────────┐
│  validate  │ "Is the project structure correct?"
└─────┬──────┘
      │
      ▼
┌────────────┐
│  compile   │ "Turn .java into .class"
└─────┬──────┘
      │
      ▼
┌────────────┐
│    test    │ "Run unit tests (Surefire)"
└─────┬──────┘
      │
      ▼
┌────────────┐
│  package   │ "Bundle into JAR/WAR"
└─────┬──────┘
      │
      ▼
┌────────────┐
│  install   │ "Put JAR in local ~/.m2 repo"
└─────┬──────┘
      │
      ▼
┌────────────┐
│   deploy   │ "Push to Nexus/Artifactory"
└────────────┘
```

> **Key Rule**: Running `mvn install` AUTOMATICALLY runs `validate`, `compile`, `test`, and `package` first. You don't need to chain them like `mvn compile test package install`.

## Core Components

### 1. The POM (Project Object Model)
The `pom.xml` is the blueprint.

```xml
<project>
    <!-- Coordinates: The GPS location of your artifact -->
    <groupId>com.company.payment</groupId>    <!-- Organization -->
    <artifactId>payment-service</artifactId>  <!-- Project Name -->
    <version>1.2.0-SNAPSHOT</version>         <!-- Version -->
    <packaging>jar</packaging>
</project>
```

### 2. Standard Directory Layout
Maven enforces a strict folder structure. **Don't fight it.**

```
my-project/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/        (Source code)
│   │   └── resources/   (Configs, images)
│   └── test/
│       ├── java/        (Test code)
│       └── resources/   (Test configs)
└── target/              (Generated build artifacts)
```


## Command Cheat Sheet

| Command | Description |
|---------|-------------|
| `mvn clean install` | The "Do Everything" command. Cleans, tests, packages, installs to local repo. |
| `mvn dependency:tree` | **#1 Debugging Tool**. Shows the full hierarchy of JARs. |
| `mvn dependency:analyze` | Shows "Used undeclared" and "Unused declared" dependencies. |
| `mvn test -Dtest=UserServiceTest` | Run a single test class. |
| `mvn clean package -DskipTests` | Build the JAR but skip running tests (Speed boost). |
| `mvn help:effective-pom` | Shows the *real* POM after inheritance and interpolation. |

## Quick Check

1. Does `mvn package` run unit tests? (Hint: Check the lifecycle diagram)
2. Where does Maven look for source code by default?
3. What is the difference between `install` and `deploy`?

## Practice Interview Questions

### 1. The "Clean" Life Cycle
**Q: Why do we often run `mvn clean install` instead of just `mvn install`?**
*   **A**: `clean` removes the `target/` directory, ensuring you don't keep old, stale `.class` files from deleted source files. The "Clean Lifecycle" (`clean`) is separate from the "Default Lifecycle" (`install`).

---
**Next**: [Dependency Management](./02-maven-dependencies.md)
