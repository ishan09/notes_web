# Maven Plugins & Profiles

> **Before you start**: How do you tell Maven to use a different database URL for "Production" vs "Local"?

## Plugins: The Workers

Maven is just a skeleton; **Plugins** do the actual work.

### Essential Plugins

1.  **Compiler Plugin**: "Use Java 17, please."
    ```xml
    <plugin>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
            <source>17</source>
            <target>17</target>
        </configuration>
    </plugin>
    ```

2.  **Surefire Plugin**: Runs **Unit Tests** (`*Test.java`).
3.  **Failsafe Plugin**: Runs **Integration Tests** (`*IT.java`).
    *   *Why separate them?* Unit tests are fast (build time). Integration tests are slow (verify phase).

## Profiles: The Chameleons

Profiles allow you to change the build configuration based on the environment (Dev, Test, Prod).

### Stick Diagram: Profile Activation

```
       mvn package -P prod
              │
              ▼
    ┌────────────────────┐
    │    Active: "prod"  │
    │                    │
    │  DB: MySQL         │
    │  Skip Tests: No    │
    └────────────────────┘

       mvn package (default)
              │
              ▼
    ┌────────────────────┐
    │    Active: "dev"   │
    │                    │
    │  DB: H2 (In-Mem)   │
    │  Skip Tests: Yes   │
    └────────────────────┘
```

### Best Practice: Environment Properties
Don't put passwords in Profiles. Use Profiles to set *filenames* or *flags*, then inject credentials via Environment Variables.

```xml
<profiles>
    <profile>
        <id>prod</id>
        <properties>
            <app.config.file>application-prod.properties</app.config.file>
        </properties>
    </profile>
</profiles>
```

## Quick Check

1. Which plugin runs integration tests?
2. How do you activate a profile named "ci" from the command line?

## Practice Interview Questions

### 1. Failsafe vs Surefire
**Q: Why does Maven have two test plugins (Surefire and Failsafe)?**
*   **A**: Life-cycle separation.
    *   **Surefire** runs in the `test` phase. If it fails, the build stops immediately.
    *   **Failsafe** runs in the `integration-test` phase and verifies in `verify`. It allows the build to tear down the test environment (e.g., Docker containers) even if tests fail (post-integration-test phase).

### 2. Profile Pitfalls
**Q: Can I use profiles to change dependencies?**
*   **A**: Yes, but **be careful**. If `prod` has different JARs than `dev`, you are violating "Build once, run anywhere." Try to keep dependencies identical and only change *configuration* properties.

## Advanced Topics

### 1. Release Management (maven-release-plugin)
Automates versioning: `1.0.0-SNAPSHOT` -> `1.0.0` -> `1.1.0-SNAPSHOT`.
```bash
mvn release:prepare release:perform
```

### 2. Writing a Custom Plugin
Sometimes you need to do something weird during the build.

```java
@Mojo(name = "greet", defaultPhase = LifecyclePhase.COMPILE)
public class GreetingMojo extends AbstractMojo {
    @Parameter(property = "greet.msg", defaultValue = "Hello Tech Lead!")
    private String message;

    public void execute() {
        getLog().info(message);
    }
}
```

---
**Next**: [Multi-Module Projects](./04-maven-multi-module.md)
