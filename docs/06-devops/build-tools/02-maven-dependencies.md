# Maven Dependency Management

> **Before you start**: A depends on B, and B depends on C (v1.0). You add D, which depends on C (v2.0). Which C do you get?

## The Dependency Hell "Mental Map"

Maven resolves dependencies transitively. This is powerful but dangerous.

### Stick Diagram: Conflict Resolution (Nearest Wins)

```
Your App
   │
   ├─── Dependency A
   │       └─── Library X (v1.0)  ◄── Level 2 (Winner!)
   │
   └─── Dependency B
           └─── Dependency C
                   └─── Library X (v2.0)  ◄── Level 3 (Loser)
```

**Rule**: "Nearest definition wins." Since A->X is depth 2, and B->C->X is depth 3, **v1.0** is chosen. This might break Dependency C!

## Scopes Cheat Sheet

| Scope | Available at Compile? | Available at Test? | In Final JAR? | Example |
|-------|----------------------|-------------------|---------------|---------|
| **compile** (default) | ✅ | ✅ | ✅ | `spring-web`, `commons-lang` |
| **test** | ❌ | ✅ | ❌ | `junit`, `mockito` |
| **provided** | ✅ | ✅ | ❌ | `lombok`, `servlet-api` (Server has provided it) |
| **runtime** | ❌ | ✅ | ✅ | `mysql-connector` (Need Interface to compile, Impl to run) |

## Managing Conflicts

### 1. `mvn dependency:tree`
Your best friend. It draws the ASCII tree of truth.

### 2. Exclusions
"I don't want your transitive garbage."

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

### 3. BOM (Bill of Materials)
"One version to rule them all."

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2021.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```
**Benefit**: You don't specify versions in `<dependencies>`, you just specify the ArtifactId, and the BOM dictates the version.

## Quick Check

1. If you mark a dependency as `provided`, will it be in the final Fat JAR?
2. Which scope is used for a JDBC driver implementation? (Hint: You don't write code against the driver class directly).

## Practice Interview Questions

### 1. Dependency Resolution
**Q: I have `commons-io` v2.6 in my POM, but a transitive dependency pulls in v2.4. Which one is used?**
*   **A**: Direct dependencies in your POM **always win** over transitive ones, regardless of depth. So v2.6 wins.

### 2. The Diamond Problem
**Q: How do you fix a `NoSuchMethodError` caused by a version conflict without exclusions?**
*   **A**: Define the conflicting library as a **direct dependency** in your POM with the version you *know* works. This forces Maven to use your chosen version (Nearest Wins strategy).

---
**Next**: [Plugins & Profiles](./03-maven-plugins-profiles.md)
