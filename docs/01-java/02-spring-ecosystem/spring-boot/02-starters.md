# Spring Boot Starters

## Before You Start

Can you answer these?
- What is a Maven dependency?
- Why do transitive dependencies matter?
- What does auto-configuration do? (See 01-auto-configuration.md if not)

## What are Starters?

**Simple explanation**: Starters are pre-packaged sets of dependencies that work well together. Instead of adding 10 individual libraries, you add 1 starter.

**Analogy**: Building a PC
- **Without Starters**: You buy CPU, motherboard, RAM, GPU, power supply, case separately and hope they're compatible
- **With Starters**: You buy a pre-built gaming PC - all parts chosen to work together

## The Problem Starters Solve

### WITHOUT Starters (Traditional Maven)

You want to build a web application with database access:

```xml
<dependencies>
    <!-- Spring MVC -->
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-webmvc</artifactId>
        <version>6.1.0</version>
    </dependency>

    <!-- Tomcat -->
    <dependency>
        <groupId>org.apache.tomcat.embed</groupId>
        <artifactId>tomcat-embed-core</artifactId>
        <version>10.1.15</version>
    </dependency>

    <!-- Jackson for JSON -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.15.3</version>
    </dependency>

    <!-- Hibernate -->
    <dependency>
        <groupId>org.hibernate.orm</groupId>
        <artifactId>hibernate-core</artifactId>
        <version>6.3.1.Final</version>
    </dependency>

    <!-- Spring Data JPA -->
    <dependency>
        <groupId>org.springframework.data</groupId>
        <artifactId>spring-data-jpa</artifactId>
        <version>3.2.0</version>
    </dependency>

    <!-- ... and 10 more dependencies -->
</dependencies>
```

**Problems**:
1. Version management nightmare - which versions are compatible?
2. Easy to miss required dependencies
3. Hard to upgrade - need to update every version
4. Copy-paste errors

### WITH Starters

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
</dependencies>
```

**That's it!** Spring Boot manages versions and includes all needed transitive dependencies.

**Stop and think**: How does Spring Boot know which versions to use for all the transitive dependencies?

<details>
<summary>Answer</summary>

The spring-boot-starter-parent POM has a dependency management section that specifies compatible versions for hundreds of libraries. When you add a starter, it inherits these versions.
</details>

## How Starters Work

### 1. The Parent POM

Every Spring Boot project starts with:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>
```

**What this does**:
- Defines compatible versions for 300+ libraries
- Sets up plugin configurations
- Enables UTF-8 encoding
- Configures resource filtering

**You can see all managed versions**:
```bash
mvn dependency:tree
```

### 2. What's Inside a Starter

A starter is just a POM file with dependencies. Let's look at `spring-boot-starter-web`:

```xml
<dependencies>
    <!-- Spring Boot core -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>

    <!-- JSON support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-json</artifactId>
    </dependency>

    <!-- Embedded Tomcat -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-tomcat</artifactId>
    </dependency>

    <!-- Spring MVC -->
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-webmvc</artifactId>
    </dependency>
</dependencies>
```

Each dependency may have its own transitive dependencies. The final result: ~30 JARs on your classpath from 1 starter.

### 3. The Starter Naming Convention

**Official Spring Boot starters**:
```
spring-boot-starter-{technology}
```

Examples:
- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`

**Third-party starters**:
```
{technology}-spring-boot-starter
```

Examples:
- `mybatis-spring-boot-starter`
- `camel-spring-boot-starter`

**Why different naming?** To avoid confusion about who maintains it.

## Common Spring Boot Starters

### Core Starters

| Starter | Purpose | Includes |
|---------|---------|----------|
| `spring-boot-starter` | Core starter | Logging, auto-config, YAML support |
| `spring-boot-starter-test` | Testing | JUnit 5, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-logging` | Logging (included by default) | Logback, SLF4J |

### Web Starters

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-web` | Build web apps, REST APIs | Spring MVC, Tomcat, Jackson |
| `spring-boot-starter-webflux` | Reactive web apps | Spring WebFlux, Netty, Reactor |
| `spring-boot-starter-websocket` | WebSocket support | Spring WebSocket, STOMP |
| `spring-boot-starter-thymeleaf` | Server-side HTML rendering | Thymeleaf template engine |

**InvoiceManager uses**: `spring-boot-starter-web` (for REST API)

### Data Starters

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-data-jpa` | JPA with Hibernate | Hibernate, Spring Data JPA, JDBC |
| `spring-boot-starter-data-jdbc` | JDBC without JPA | Spring Data JDBC |
| `spring-boot-starter-data-mongodb` | MongoDB | Spring Data MongoDB driver |
| `spring-boot-starter-data-redis` | Redis | Lettuce (Redis client) |
| `spring-boot-starter-jdbc` | Plain JDBC | HikariCP connection pool |

**InvoiceManager uses**: `spring-boot-starter-data-jpa` (for repository pattern)

### Security & Validation

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-security` | Authentication & Authorization | Spring Security |
| `spring-boot-starter-oauth2-client` | OAuth2 client | Spring Security OAuth2 |
| `spring-boot-starter-validation` | Bean validation | Hibernate Validator |

### Messaging

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-amqp` | RabbitMQ | Spring AMQP |
| `spring-boot-starter-artemis` | ActiveMQ Artemis | Spring JMS |
| `spring-boot-starter-kafka` | Kafka | Spring Kafka |

**InvoiceManager will use**: `spring-boot-starter-kafka` (Week 4 - Microservices)

### Monitoring & Operations

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-actuator` | Health checks, metrics | Micrometer, endpoints |
| `spring-boot-starter-prometheus` | Prometheus metrics | Micrometer Prometheus registry |

### Testing

| Starter | Purpose | Key Dependencies |
|---------|---------|------------------|
| `spring-boot-starter-test` | Unit & integration testing | JUnit 5, Mockito, AssertJ, Hamcrest |
| `spring-boot-starter-webflux` (test scope) | Testing WebFlux apps | WebTestClient |

## InvoiceManager Dependencies

Here's what your InvoiceManager pom.xml should look like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>invoice-manager</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>InvoiceManager</name>
    <description>Invoice Management System</description>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <!-- Web & REST API -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Database - JPA + Hibernate -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- PostgreSQL Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Monitoring (production-ready features) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Development tools (auto-restart) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

**What you get from these 6 starters**:
- 150+ JARs on classpath
- All versions compatible
- All auto-configurations ready

## Replacing Embedded Servers

By default, `spring-boot-starter-web` includes Tomcat. You can swap it:

### Use Jetty Instead

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

### Use Undertow Instead

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

**When to switch?**
- Undertow: Better performance under high load
- Jetty: Better for WebSockets
- Tomcat: Good default, most popular

## Overriding Dependency Versions

Sometimes you need a specific version (security patch, bug fix):

### Method 1: Properties in pom.xml

```xml
<properties>
    <postgresql.version>42.7.0</postgresql.version>
    <hibernate.version>6.4.0.Final</hibernate.version>
</properties>
```

Spring Boot's parent POM uses properties for versions. Override them in your POM.

### Method 2: Explicit version

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.0</version>
    <scope>runtime</scope>
</dependency>
```

**Warning**: Make sure your custom version is compatible with Spring Boot's other dependencies!

### Method 3: BOM (Bill of Materials)

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>custom-bom</artifactId>
            <version>1.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Creating a Custom Starter

**Use case**: You have a reusable component you want to use across multiple projects.

### Example: Invoice Auditing Starter

**Goal**: Create `invoice-audit-spring-boot-starter` that auto-configures audit logging.

### Step 1: Create starter module structure

```
invoice-audit-spring-boot-starter/
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── com/example/audit/
        │       ├── InvoiceAuditService.java
        │       ├── InvoiceAuditProperties.java
        │       └── InvoiceAuditAutoConfiguration.java
        └── resources/
            └── META-INF/
                └── spring/
                    └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

### Step 2: Create the service

```java
package com.example.audit;

public class InvoiceAuditService {
    private final InvoiceAuditProperties properties;

    public InvoiceAuditService(InvoiceAuditProperties properties) {
        this.properties = properties;
    }

    public void auditCreate(Long invoiceId, String user) {
        if (properties.isEnabled()) {
            log("[{}] Invoice {} created by {}", properties.getPrefix(), invoiceId, user);
        }
    }

    public void auditUpdate(Long invoiceId, String user) {
        if (properties.isEnabled()) {
            log("[{}] Invoice {} updated by {}", properties.getPrefix(), invoiceId, user);
        }
    }

    private void log(String message, Object... args) {
        System.out.printf(message + "%n", args);
    }
}
```

### Step 3: Create configuration properties

```java
package com.example.audit;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "invoice.audit")
public class InvoiceAuditProperties {
    private boolean enabled = true;
    private String prefix = "AUDIT";

    // Getters and setters
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }
}
```

### Step 4: Create auto-configuration

```java
package com.example.audit;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@EnableConfigurationProperties(InvoiceAuditProperties.class)
public class InvoiceAuditAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public InvoiceAuditService invoiceAuditService(InvoiceAuditProperties properties) {
        return new InvoiceAuditService(properties);
    }
}
```

### Step 5: Register auto-configuration

Create `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`:

```
com.example.audit.InvoiceAuditAutoConfiguration
```

### Step 6: Create starter POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>invoice-audit-spring-boot-starter</artifactId>
    <version>1.0.0</version>
    <name>Invoice Audit Starter</name>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
            <version>3.2.0</version>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-configuration-processor</artifactId>
            <version>3.2.0</version>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

### Step 7: Use the starter

In your InvoiceManager project:

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>invoice-audit-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

Configure in application.yml:

```yaml
invoice:
  audit:
    enabled: true
    prefix: "[INVOICE-AUDIT]"
```

Use it:

```java
@Service
public class InvoiceService {
    private final InvoiceAuditService auditService;

    public InvoiceService(InvoiceAuditService auditService) {
        this.auditService = auditService;
    }

    public Invoice createInvoice(InvoiceRequest req) {
        Invoice invoice = repository.save(new Invoice(req));
        auditService.auditCreate(invoice.getId(), "current-user");
        return invoice;
    }
}
```

**What you achieved**:
- Reusable component across projects
- Type-safe configuration
- Auto-configuration (no manual setup)
- Can be disabled via properties

## Build-Along Project: InvoiceManager Starters

### Current InvoiceManager Dependencies

Add these starters to your pom.xml:

```xml
<dependencies>
    <!-- REST API -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Actuator (health checks) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Try it: See what you got

```bash
# List all dependencies (including transitive)
mvn dependency:tree

# Count the JARs
mvn dependency:tree | grep -c "jar"
```

**You should see**:
- ~150 JARs from 6 starters
- Spring Framework libraries
- Hibernate
- Jackson
- Tomcat
- Logback
- JUnit, Mockito, AssertJ

### Exercise: Swap to Jetty

1. Exclude Tomcat from spring-boot-starter-web
2. Add spring-boot-starter-jetty
3. Run the app
4. Verify it's using Jetty (check logs)

Expected log:
```
Jetty started on port(s) 8080
```

## Dependency Analysis

### See what each starter brings

```bash
# Web starter
mvn dependency:tree -Dincludes=org.springframework.boot:spring-boot-starter-web

# Data JPA starter
mvn dependency:tree -Dincludes=org.springframework.boot:spring-boot-starter-data-jpa
```

### Find version conflicts

```bash
mvn dependency:tree -Dverbose
```

Look for version conflicts (shown as "omitted for conflict with X").

### Analyze dependency size

```bash
# After building
ls -lh target/*.jar

# Unzip and see what's inside
unzip -l target/invoice-manager-0.0.1-SNAPSHOT.jar | grep "\.jar$"
```

## Common Mistakes

### Mistake 1: Adding transitive dependencies explicitly

```xml
<!-- DON'T - already included by spring-boot-starter-web -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-webmvc</artifactId>
</dependency>

<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

**Fix**: Only add the starter. Let it bring transitive dependencies.

### Mistake 2: Version conflicts

```xml
<!-- DON'T - conflicts with version from starter-parent -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-core</artifactId>
    <version>5.3.0</version>  <!-- Older version! -->
</dependency>
```

**Fix**: Let Spring Boot manage versions. Only override if absolutely necessary.

### Mistake 3: Wrong scope

```xml
<!-- DON'T - PostgreSQL needed at runtime! -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>provided</scope>  <!-- WRONG -->
</dependency>
```

**Fix**: Use `runtime` scope for JDBC drivers.

### Mistake 4: Including multiple starters for same purpose

```xml
<!-- DON'T - use one or the other -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

**Fix**: Choose web (blocking) OR webflux (reactive), not both.

### Mistake 5: Not using parent POM

```xml
<!-- Missing this -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>
```

Without parent, you lose version management!

**Fix**: Always use spring-boot-starter-parent OR import spring-boot-dependencies BOM.

## Self-Check Questions

Before moving on, can you answer these?

1. What problem do starters solve?
2. How does Spring Boot know which versions to use for transitive dependencies?
3. What's the difference between `spring-boot-starter-web` and `mybatis-spring-boot-starter` naming?
4. How do you replace Tomcat with Jetty?
5. What does `spring-boot-starter-test` include?
6. When should you create a custom starter?

<details>
<summary>Answers</summary>

1. Starters group compatible dependencies together, eliminating version management complexity
2. The spring-boot-starter-parent POM defines versions in dependencyManagement section
3. Official Spring Boot starters: `spring-boot-starter-*`, Third-party: `*-spring-boot-starter`
4. Exclude spring-boot-starter-tomcat, add spring-boot-starter-jetty
5. JUnit 5, Mockito, AssertJ, Hamcrest, Spring Test
6. When you have a reusable component used across multiple projects that needs auto-configuration
</details>

## Practice Exercises

### Exercise 1: Dependency Analysis

Run these commands and analyze output:
```bash
mvn dependency:tree
mvn dependency:tree -Dverbose
mvn dependency:analyze
```

Questions:
- How many dependencies does spring-boot-starter-web bring?
- Are there any unused dependencies?
- Are there version conflicts?

### Exercise 2: Custom Starter

Create an `invoice-pdf-spring-boot-starter` that:
- Auto-configures a PDF generator service
- Has properties: `invoice.pdf.enabled`, `invoice.pdf.template-path`
- Only activates if iText library is on classpath
- Can be disabled via `invoice.pdf.enabled=false`

### Exercise 3: Swap Servers

Try all three embedded servers:
1. Tomcat (default)
2. Jetty
3. Undertow

Measure startup time and memory usage for each.

### Exercise 4: Minimal Starter Set

What's the minimum set of starters needed for InvoiceManager?
- Try removing starters one by one
- See what breaks
- Understand what each starter provides

---

## Navigation

**Prerequisites:**
- [Auto-Configuration](./01-auto-configuration.md) - Starters trigger auto-configurations
- [Maven Dependencies](../../../06-leadership/build-tools/02-maven-dependencies.md) - Dependency management and scopes

**Next Topics:**
- [REST API Development](./03-rest-api.md) - Using spring-boot-starter-web in practice
- [Actuator & Monitoring](./04-actuator-monitoring.md) - Using spring-boot-starter-actuator

**Related:**
- [Maven Dependency Management](../../../06-leadership/build-tools/02-maven-dependencies.md) - How Spring Boot BOM works
- [Microservices](../../../03-architecture/microservices/01-overview.md) - Creating custom starters for shared components
- [Best Practices](./05-best-practices.md) - Choosing and customizing starters

**Interview Focus:**
- What starters are and why they exist
- How Spring Boot manages dependency versions (BOM)
- When to create a custom starter
- How to override embedded servers (Tomcat vs Jetty)

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
