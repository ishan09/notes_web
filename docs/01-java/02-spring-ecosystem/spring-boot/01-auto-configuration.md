# Spring Boot Auto-Configuration

## Before You Start

Can you answer these? If not, review Spring Core first:
- What is a Spring Bean?
- What does @Configuration do?
- How does component scanning work?

## What is Auto-Configuration?

**Simple explanation**: Spring Boot looks at your classpath and automatically configures beans based on what libraries you have.

**Analogy**: Imagine you walk into a hotel room:
- **Spring Framework**: You have to set up everything - plug in the lamp, turn on AC, adjust thermostat
- **Spring Boot**: Everything is already set up when you arrive. Don't like the temperature? Just adjust it (override defaults).

## The Problem Spring Boot Solves

### WITHOUT Spring Boot (Spring Framework only)

You want to use a database. Here's what you need to configure:

```java
@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = "com.example.repository")
public class DatabaseConfig {

    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl("jdbc:postgresql://localhost:5432/mydb");
        dataSource.setUsername("admin");
        dataSource.setPassword("secret");
        return dataSource;
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory() {
        LocalContainerEntityManagerFactoryBean em =
            new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource());
        em.setPackagesToScan("com.example.entity");

        JpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Properties properties = new Properties();
        properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        properties.put("hibernate.show_sql", "true");
        em.setJpaProperties(properties);

        return em;
    }

    @Bean
    public PlatformTransactionManager transactionManager() {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(
            entityManagerFactory().getObject());
        return transactionManager;
    }
}
```

**That's 40+ lines of boilerplate for just database configuration!**

### WITH Spring Boot

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: admin
    password: secret
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
```

```java
@SpringBootApplication  // That's it!
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**Spring Boot auto-configured**:
- DataSource bean
- EntityManagerFactory bean
- TransactionManager bean
- JPA repositories
- And set up sensible defaults!

**Stop and think**: How does Spring Boot know to configure database beans?

<details>
<summary>Answer</summary>

Spring Boot sees these on your classpath:
1. `spring-boot-starter-data-jpa` dependency
2. PostgreSQL driver

It thinks: "They want JPA + PostgreSQL, I'll configure those beans automatically"
</details>

## How Auto-Configuration Works

### 1. The @SpringBootApplication Annotation

```java
@SpringBootApplication
public class InvoiceManagerApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApplication.class, args);
    }
}
```

**What does @SpringBootApplication do?**

```java
// It's a combo of 3 annotations:
@SpringBootConfiguration  // = @Configuration (this class can define beans)
@EnableAutoConfiguration  // Turn on auto-configuration magic
@ComponentScan            // Scan for @Component, @Service, etc.
public @interface SpringBootApplication { }
```

### 2. @EnableAutoConfiguration - The Magic

This annotation triggers Spring Boot to:
1. Look at your classpath (what JARs you have)
2. Read auto-configuration classes
3. Apply conditional configuration based on what it finds

**Example**: DataSource auto-configuration

```java
@Configuration
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@ConditionalOnMissingBean(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }
}
```

**Breaking it down**:
- `@ConditionalOnClass(DataSource.class)` - Only run if DataSource class exists on classpath
- `@ConditionalOnMissingBean(DataSource.class)` - Only create bean if user hasn't defined their own
- `@EnableConfigurationProperties` - Enable reading from application.yml

**This means**: If you have a database driver on classpath AND you haven't defined your own DataSource bean, Spring Boot creates one for you using properties from application.yml.

### 3. Conditional Annotations

These control WHEN auto-configuration happens:

| Annotation | When it applies |
|------------|-----------------|
| `@ConditionalOnClass` | If class exists on classpath |
| `@ConditionalOnMissingClass` | If class does NOT exist |
| `@ConditionalOnBean` | If bean already exists |
| `@ConditionalOnMissingBean` | If bean does NOT exist (most common) |
| `@ConditionalOnProperty` | If property is set |
| `@ConditionalOnWebApplication` | If it's a web app |

**Example use case**:

```java
@Configuration
@ConditionalOnClass(ObjectMapper.class)  // Jackson library present?
public class JacksonAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Configure with sensible defaults
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
}
```

**Translation**: "If Jackson library is on classpath AND user hasn't created their own ObjectMapper bean, I'll create one with good defaults."

## Seeing What Was Auto-Configured

### Method 1: Debug Mode

```bash
mvn spring-boot:run --debug
```

Or in application.yml:
```yaml
debug: true
```

**Output example**:
```
============================
CONDITIONS EVALUATION REPORT
============================

Positive matches:
-----------------

   DataSourceAutoConfiguration matched:
      - @ConditionalOnClass found required classes 'javax.sql.DataSource', 'org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType' (OnClassCondition)

   JpaRepositoriesAutoConfiguration matched:
      - @ConditionalOnClass found required class 'org.springframework.data.jpa.repository.JpaRepository' (OnClassCondition)

Negative matches:
-----------------

   ActiveMQAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class 'javax.jms.ConnectionFactory' (OnClassCondition)
```

**Translation**: Spring Boot tells you exactly what it configured and why!

### Method 2: Actuator (Production)

Add dependency:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Enable in application.yml:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: conditions
```

Then visit: `http://localhost:8080/actuator/conditions`

## Overriding Auto-Configuration

**Key principle**: Your bean always wins over auto-configured bean.

### Example 1: Custom DataSource

```java
@Configuration
public class CustomDataSourceConfig {

    @Bean
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        dataSource.setUsername("admin");
        dataSource.setPassword("secret");
        dataSource.setMaximumPoolSize(20);  // Custom pool size
        dataSource.setConnectionTimeout(30000);
        return dataSource;
    }
}
```

**What happens**: Spring Boot sees you defined a DataSource bean, so it skips auto-configuring one.

### Example 2: Custom ObjectMapper

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}
```

### Example 3: Partial Override with Customizer

You can also customize auto-configured beans without replacing them:

```java
@Configuration
public class WebMvcConfig {

    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:3000")
                    .allowedMethods("GET", "POST", "PUT", "DELETE");
            }
        };
    }
}
```

## Disabling Specific Auto-Configuration

Sometimes you want to turn off specific auto-configurations:

### Method 1: Exclude on @SpringBootApplication

```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class
})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### Method 2: Exclude in application.yml

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
      - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

**Use case**: You're building a service that doesn't need a database, but a database library ended up on your classpath.

## Common Auto-Configurations

### 1. Web Application (spring-boot-starter-web)

**Auto-configures**:
- Embedded Tomcat server
- Spring MVC
- Jackson for JSON
- Error handling
- Static resource handling

**Key properties**:
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  mvc:
    throw-exception-if-no-handler-found: true
```

### 2. Database (spring-boot-starter-data-jpa)

**Auto-configures**:
- DataSource
- EntityManagerFactory
- TransactionManager
- JPA repositories

**Key properties**:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/db
    username: user
    password: pass
    hikari:
      maximum-pool-size: 10
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
```

### 3. Security (spring-boot-starter-security)

**Auto-configures**:
- SecurityFilterChain
- UserDetailsService (with default user)
- Password encoder
- Basic authentication

**Default behavior**: Secures ALL endpoints with basic auth (username: user, password: printed in console)

### 4. Validation (spring-boot-starter-validation)

**Auto-configures**:
- Hibernate Validator
- Bean Validation
- Method validation

**Usage**:
```java
@RestController
public class InvoiceController {

    @PostMapping("/invoices")
    public Invoice create(@Valid @RequestBody InvoiceRequest request) {
        // @Valid triggers validation
    }
}

public class InvoiceRequest {
    @NotNull
    @Min(1)
    private Long customerId;

    @NotEmpty
    @Size(min = 1, max = 100)
    private List<InvoiceItem> items;
}
```

## Build-Along Project: InvoiceManager App

### Week 3 - Part 1: Convert to Spring Boot

**Goal**: Eliminate all configuration classes using auto-configuration.

**Step 1: Update pom.xml**

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <!-- All-in-one starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

**Step 2: Delete these configuration classes** (Spring Boot handles them now)

```
BEFORE (Week 2 - Spring Core):
src/
  main/
    java/
      config/
        AppConfig.java          ❌ DELETE
        DatabaseConfig.java     ❌ DELETE
        WebConfig.java          ❌ DELETE
```

**Step 3: Create main application class**

```java
package com.example.invoicemanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class InvoiceManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApplication.class, args);
    }
}
```

**Step 4: Create application.yml**

```yaml
spring:
  application:
    name: invoice-manager

  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: admin
    password: secret
    hikari:
      maximum-pool-size: 10
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

server:
  port: 8080

logging:
  level:
    com.example: DEBUG
    org.springframework.web: INFO
```

**Step 5: Verify auto-configuration**

Run with debug:
```bash
mvn spring-boot:run --debug
```

**You should see**:
```
Positive matches:
-----------------
   DataSourceAutoConfiguration matched:
      - @ConditionalOnClass found required classes

   HibernateJpaAutoConfiguration matched:
      - @ConditionalOnClass found required classes

   WebMvcAutoConfiguration matched:
      - @ConditionalOnWebApplication found web application
```

**Try it**:
1. Delete all config classes
2. Replace with @SpringBootApplication + application.yml
3. Run the app
4. Verify your services still work (InvoiceService, CustomerRepository, etc.)

**What you eliminated**:
- 3 configuration classes (~150 lines of code)
- Manual bean definitions
- Explicit component scanning
- Transaction management setup
- JPA repository configuration

**What Spring Boot gave you**:
- Same functionality
- Better defaults
- Externalized configuration
- Production-ready features (health checks, metrics)

## Custom Auto-Configuration (Advanced)

You can create your own auto-configuration for reusable components.

**Use case**: You want to auto-configure a custom invoice auditing service.

### Step 1: Create the service

```java
public class InvoiceAuditService {
    private final String auditPrefix;
    private final boolean enabled;

    public InvoiceAuditService(String auditPrefix, boolean enabled) {
        this.auditPrefix = auditPrefix;
        this.enabled = enabled;
    }

    public void audit(String action, Long invoiceId) {
        if (enabled) {
            System.out.println(auditPrefix + ": " + action + " on invoice " + invoiceId);
        }
    }
}
```

### Step 2: Create configuration properties

```java
@ConfigurationProperties(prefix = "app.audit")
public class InvoiceAuditProperties {
    private boolean enabled = true;
    private String prefix = "[AUDIT]";

    // getters and setters
}
```

### Step 3: Create auto-configuration class

```java
@Configuration
@ConditionalOnClass(InvoiceAuditService.class)
@EnableConfigurationProperties(InvoiceAuditProperties.class)
public class InvoiceAuditAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public InvoiceAuditService invoiceAuditService(InvoiceAuditProperties props) {
        return new InvoiceAuditService(props.getPrefix(), props.isEnabled());
    }
}
```

### Step 4: Register auto-configuration

Create `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`:

```
com.example.autoconfigure.InvoiceAuditAutoConfiguration
```

### Step 5: Use in application.yml

```yaml
app:
  audit:
    enabled: true
    prefix: "[INVOICE-AUDIT]"
```

Now InvoiceAuditService is auto-configured and can be injected anywhere!

## Common Mistakes

### Mistake 1: Creating beans that conflict with auto-configuration

```java
// DON'T - This will conflict with Spring Boot's DataSource
@Configuration
public class BadConfig {
    @Bean
    public DataSource dataSource() {
        // This creates TWO DataSource beans!
        return new DriverManagerDataSource();
    }
}
```

**Fix**: Either let Spring Boot handle it OR explicitly exclude auto-configuration.

### Mistake 2: Not understanding property binding

```yaml
# This WON'T work
datasource:
  url: jdbc:postgresql://localhost:5432/db

# Must be under 'spring' namespace
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/db
```

### Mistake 3: Expecting auto-configuration without dependencies

```java
// This won't work - no database driver on classpath
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/db
```

**Error**: `Cannot determine embedded database driver class`

**Fix**: Add PostgreSQL dependency to pom.xml

### Mistake 4: Overriding incorrectly

```java
// BAD - Component won't be picked up by auto-config
@Component
public class DataSource {  // Don't name classes same as framework classes!
}
```

### Mistake 5: Not checking what was auto-configured

You assume something was configured, but it wasn't. Always verify with `--debug` or actuator.

### Mistake 6: Using production values in auto-configuration

```yaml
# DON'T - Hard-coding secrets
spring:
  datasource:
    password: MySecretPassword123
```

**Fix**: Use environment variables or external config:
```yaml
spring:
  datasource:
    password: ${DB_PASSWORD}
```

## Debugging Auto-Configuration Issues

### Issue 1: Bean not found

```
***************************
APPLICATION FAILED TO START
***************************

Description:
Parameter 0 of constructor in com.example.InvoiceService required a bean of type 'com.example.InvoiceRepository' that could not be found.
```

**Debugging steps**:
1. Check if @SpringBootApplication is on a parent package of your components
2. Run with `--debug` to see if auto-configuration ran
3. Check if required dependencies are on classpath
4. Verify repository interface extends JpaRepository

### Issue 2: Wrong DataSource configured

```bash
# Run with debug
mvn spring-boot:run --debug | grep DataSource
```

Look for which DataSourceAutoConfiguration matched.

### Issue 3: Properties not working

```java
@Value("${app.invoice.currency}")
private String currency;  // null or error

// Check if property is actually loaded
@Component
public class PropertyChecker implements CommandLineRunner {
    @Autowired
    private Environment env;

    @Override
    public void run(String... args) {
        System.out.println("Currency: " + env.getProperty("app.invoice.currency"));
    }
}
```

## Self-Check Questions

Before moving on, can you answer these?

1. What three annotations does @SpringBootApplication combine?
2. What does @ConditionalOnMissingBean mean?
3. How do you see what Spring Boot auto-configured?
4. How do you override an auto-configured bean?
5. How do you disable a specific auto-configuration?
6. What happens if you define your own DataSource bean?

<details>
<summary>Answers</summary>

1. @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan
2. Only create this bean if user hasn't defined one already
3. Run with `--debug` flag or use `/actuator/conditions` endpoint
4. Define your own bean with same type - yours takes precedence
5. Use `exclude` on @SpringBootApplication or in application.yml
6. Spring Boot's DataSourceAutoConfiguration won't run (backs off)
</details>

## Practice Exercises

### Exercise 1: Identify Auto-Configurations

Run your InvoiceManager app with `--debug` and answer:
- Which auto-configurations matched?
- Which didn't match and why?
- How many beans were auto-configured?

### Exercise 2: Override DataSource

Create a custom DataSource bean with:
- HikariCP pool
- Maximum pool size of 5
- Connection timeout of 10 seconds

Verify Spring Boot didn't create its own DataSource.

### Exercise 3: Custom Auto-Configuration

Create an auto-configuration for a "InvoiceNumberGenerator" service that:
- Can be enabled/disabled via property
- Has configurable prefix (e.g., "INV-", "BILL-")
- Auto-configures only if InvoiceService is on classpath

### Exercise 4: Conditional Beans

Create a bean that only exists in "dev" profile:
```java
@Bean
@Profile("dev")
public DataInitializer dataInitializer() {
    // Populate test data
}
```

---

## Navigation

**Prerequisites:**
- [IoC & Dependency Injection](../spring-core/01-ioc-and-di.md) - Understanding of Spring beans and DI
- [Configuration Approaches](../spring-core/03-configuration.md) - @Configuration and @Conditional annotations
- [Maven Dependencies](../../../06-leadership/build-tools/02-maven-dependencies.md) - Dependency management

**Next Topics:**
- [Spring Boot Starters](./02-starters.md) - How Spring Boot groups dependencies and auto-configurations
- [REST API Development](./03-rest-api.md) - Web auto-configuration in action

**Related:**
- [Actuator & Monitoring](./04-actuator-monitoring.md) - Auto-configuration for monitoring endpoints
- [Best Practices](./05-best-practices.md) - When and how to customize auto-configuration
- [Troubleshooting](./06-troubleshooting-qa.md) - Debugging auto-configuration issues

**Interview Focus:**
- How @SpringBootApplication works (combination of 3 annotations)
- Difference between Spring and Spring Boot
- When and how to override auto-configuration
- What @Conditional annotations control auto-configuration

**Module Index:** [Spring Boot Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
