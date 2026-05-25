# Spring Boot

## Core Concepts

### 1. Auto-Configuration
Spring Boot automatically configures beans based on classpath content.

```java
// Import statements needed for basic Spring Boot application
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main application class - entry point for Spring Boot application
 * Like your main.ex file in Phoenix that starts the supervision tree
 */
@SpringBootApplication  // Meta-annotation that combines three key annotations:
public class Application {

    /**
     * Main method - starts the Spring Boot application
     * Similar to Application.start() in Elixir OTP applications
     *
     * @param args Command line arguments (like System.argv() in Elixir)
     */
    public static void main(String[] args) {
        // Creates and runs the Spring application context
        // Like starting your Phoenix endpoint and supervision tree
        SpringApplication.run(Application.class, args);
    }
}

/**
 * @SpringBootApplication is a meta-annotation that combines:
 *
 * @Configuration - Marks this class as a source of bean definitions
 *                 (like defining modules in your Application module)
 *
 * @EnableAutoConfiguration - Tells Spring Boot to automatically configure
 *                           beans based on classpath dependencies
 *                           (like Phoenix auto-configuring Ecto, Router, etc.)
 *
 * @ComponentScan - Enables component scanning to find @Component, @Service,
 *                 @Repository, @Controller classes in current package and sub-packages
 *                 (like how Phoenix auto-discovers your controllers and views)
 */
```

### 2. Starters
Pre-configured dependency descriptors.

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Web applications -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 3. Application Properties

#### application.yml
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: user
    password: password
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true

  profiles:
    active: dev

logging:
  level:
    com.example: DEBUG
    org.springframework.security: DEBUG
  file:
    name: application.log

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

#### Configuration Properties
```java
// Import statements for configuration properties
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Configuration properties class - binds YAML/properties to Java objects
 * Like using Application.get_env() in Elixir to read configuration
 *
 * For YAML like:
 * app:
 *   name: "MyApp"
 *   version: "1.0"
 *   database:
 *     url: "jdbc:mysql://localhost:3306/mydb"
 *     maxConnections: 20
 */
@ConfigurationProperties(prefix = "app")  // Binds all properties starting with "app."
@Component  // Makes this a Spring-managed bean (like a GenServer)
public class AppProperties {

    // These fields automatically get populated from application.yml
    private String name;           // Maps to app.name
    private String version;        // Maps to app.version
    private Database database = new Database();  // Maps to app.database.*

    // Spring requires getters and setters for property binding
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public Database getDatabase() { return database; }
    public void setDatabase(Database database) { this.database = database; }

    /**
     * Nested configuration class for database properties
     * Like nested keyword lists in Elixir config
     */
    public static class Database {
        private String url;
        private int maxConnections = 10;  // Default value

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }

        public int getMaxConnections() { return maxConnections; }
        public void setMaxConnections(int maxConnections) { this.maxConnections = maxConnections; }
    }
}

/**
 * Service class demonstrating how to use configuration properties
 * Like a GenServer that needs configuration from Application.get_env()
 */
@Service  // Makes this a business logic component (like a context module in Phoenix)
public class AppService {

    // Dependency injection - Spring automatically provides the AppProperties instance
    // Similar to passing config as arguments to GenServer.start_link()
    @Autowired
    private AppProperties appProperties;

    /**
     * Example method using the injected configuration
     * Like using config values in your GenServer handle_call/handle_cast
     */
    public void printConfig() {
        // Access configuration values through the properties object
        System.out.println("App: " + appProperties.getName());
        System.out.println("Version: " + appProperties.getVersion());
        System.out.println("DB URL: " + appProperties.getDatabase().getUrl());
        System.out.println("Max Connections: " + appProperties.getDatabase().getMaxConnections());
    }
}
```

### 4. Profiles
Environment-specific configurations.

```java
// Import statements for profiles and configuration
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;  // H2 database
import com.mysql.cj.jdbc.MysqlDataSource;  // MySQL database

/**
 * Development environment configuration
 * Like Mix.env() == :dev in Elixir - only active in development
 *
 * Activated when spring.profiles.active=dev
 */
@Configuration  // Marks this as a configuration class (like config/dev.exs)
@Profile("dev")  // Only active when "dev" profile is enabled
public class DevConfig {

    /**
     * Creates an in-memory H2 database for development
     * Like using SQLite in development in Phoenix
     *
     * @return DataSource for H2 database (fast, in-memory, no setup required)
     */
    @Bean  // Creates a Spring-managed bean
    public DataSource dataSource() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:devdb");  // In-memory database
        dataSource.setUser("sa");
        dataSource.setPassword("");
        return dataSource;
    }
}

/**
 * Production environment configuration
 * Like Mix.env() == :prod in Elixir - only active in production
 *
 * Activated when spring.profiles.active=prod
 */
@Configuration  // Configuration class for production settings
@Profile("prod")  // Only active when "prod" profile is enabled
public class ProdConfig {

    /**
     * Creates a MySQL database connection for production
     * Like using PostgreSQL in production in Phoenix
     *
     * @return DataSource for MySQL database (persistent, production-ready)
     */
    @Bean  // Spring will manage this bean's lifecycle
    public DataSource dataSource() {
        MysqlDataSource dataSource = new MysqlDataSource();
        dataSource.setURL("jdbc:mysql://localhost:3306/proddb");
        dataSource.setUser("prod_user");
        dataSource.setPassword("secure_password");
        return dataSource;
    }
}

/**
 * Email service with profile-specific behavior
 * Like conditional logic based on Mix.env() in Elixir
 */
@Component  // Spring-managed component (like a GenServer)
public class EmailService {

    /**
     * Reads configuration property with default value
     * Like Application.get_env(:myapp, :email_enabled, false) in Elixir
     *
     * Looks for "email.enabled" in application.yml, defaults to false if not found
     */
    @Value("${email.enabled:false}")
    private boolean emailEnabled;

    /**
     * Send email method - only available when NOT in test profile
     * Like using unless Mix.env() == :test in Elixir
     *
     * @param message The email message to send
     */
    @Profile("!test")  // Active in all profiles EXCEPT test (!test means "not test")
    public void sendEmail(String message) {
        if (emailEnabled) {
            // In development/production: send actual email via SMTP
            System.out.println("Sending email: " + message);
            // Implementation would use JavaMail API or SendGrid/Amazon SES
        } else {
            System.out.println("Email sending disabled in configuration");
        }
    }

    /**
     * In test profile, this method would be replaced with a mock
     * or a test-specific implementation that doesn't send real emails
     */
}
```

**Application properties by profile:**
- `application.yml` (common)
- `application-dev.yml` (development)
- `application-prod.yml` (production)
- `application-test.yml` (testing)

### 5. Actuator
Production-ready features for monitoring and management.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "*"
      base-path: /actuator
  endpoint:
    health:
      show-details: always
  info:
    env:
      enabled: true
```

**Common Endpoints:**
- `/actuator/health` - Application health
- `/actuator/info` - Application information
- `/actuator/metrics` - Application metrics
- `/actuator/env` - Environment properties
- `/actuator/loggers` - Logger configuration

#### Custom Health Indicator
```java
// Import statements for health indicators
import org.springframework.stereotype.Component;
import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Custom health check for database connectivity
 * Like implementing a health check endpoint in Phoenix that verifies Ecto connection
 *
 * Accessed via GET /actuator/health/database
 */
@Component  // Spring-managed component
public class DatabaseHealthIndicator implements HealthIndicator {

    // Database connection pool injected by Spring
    // Like having access to your Ecto.Repo in a Phoenix controller
    @Autowired
    private DataSource dataSource;

    /**
     * Performs the actual health check
     * Like a Phoenix controller action that checks database connectivity
     *
     * @return Health status with details about database connectivity
     */
    @Override
    public Health health() {
        try {
            // Attempt to get a connection from the pool
            // Like Ecto.Adapters.SQL.query(MyApp.Repo, "SELECT 1", [])
            Connection connection = dataSource.getConnection();

            // Test if connection is valid within 2 seconds
            // This sends a simple query to verify database responsiveness
            if (connection.isValid(2)) {
                // Connection successful - database is healthy
                // Like returning {:ok, "Database connected"} in Elixir
                return Health.up()  // Status: UP (healthy)
                    .withDetail("database", "Available")  // Additional info
                    .withDetail("validationQuery", "SELECT 1")  // What we tested
                    .withDetail("connectionTimeout", "2 seconds")  // Timeout used
                    .build();
            }
        } catch (SQLException e) {
            // Database connection failed
            // Like catching an Ecto connection error
            return Health.down()  // Status: DOWN (unhealthy)
                .withDetail("database", "Unavailable")
                .withDetail("error", e.getMessage())  // Error details for debugging
                .withException(e)  // Full exception for logs
                .build();
        }

        // Fallback - connection was obtained but validation failed
        return Health.down()
            .withDetail("database", "Connection validation failed")
            .build();
    }
}

/**
 * Example response when healthy:
 * {
 *   "status": "UP",
 *   "details": {
 *     "database": "Available",
 *     "validationQuery": "SELECT 1",
 *     "connectionTimeout": "2 seconds"
 *   }
 * }
 *
 * Example response when unhealthy:
 * {
 *   "status": "DOWN",
 *   "details": {
 *     "database": "Unavailable",
 *     "error": "Communications link failure"
 *   }
 * }
 */
```

### 6. Testing in Spring Boot

#### Unit Testing
```java
// Import statements for unit testing
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

/**
 * Unit test for OrderService - tests business logic in isolation
 * Like ExUnit tests in Elixir that test individual functions
 *
 * Uses Mockito to mock dependencies (like using Mox in Elixir)
 */
@ExtendWith(MockitoExtension.class)  // Enables Mockito for this test class
class OrderServiceTest {

    // Mock objects - fake implementations for testing
    // Like using Mox.defmock() in Elixir to create test doubles

    @Mock  // Creates a mock/fake OrderRepository
    private OrderRepository orderRepository;

    @Mock  // Creates a mock/fake PaymentService
    private PaymentService paymentService;

    // The actual service we're testing - gets mocks injected automatically
    // Like the module under test in ExUnit
    @InjectMocks
    private OrderService orderService;

    /**
     * Test method - verifies order creation logic
     * Like a test/3 function in ExUnit
     */
    @Test  // Marks this as a test method (like "test" in ExUnit)
    void shouldCreateOrder() {
        // Given (Arrange) - Set up test data and mock behavior
        // Like setup in ExUnit or given/when/then in Gherkin
        Order order = new Order(1L, "Test Customer", new BigDecimal("100.00"));

        // Configure mock behavior - when save() is called, return our test order
        // Like using Mox.expect() to define mock behavior
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        // Configure payment service mock to always succeed
        when(paymentService.processPayment(any())).thenReturn(true);

        // When (Act) - Execute the method we're testing
        // Like calling the function under test
        OrderRequest request = new OrderRequest("Test Customer", new BigDecimal("100.00"));
        Order result = orderService.createOrder(request);

        // Then (Assert) - Verify the results
        // Like assert statements in ExUnit

        // Verify the returned order is not null
        assertThat(result).isNotNull();
        assertThat(result.getCustomerName()).isEqualTo("Test Customer");

        // Verify that save() was called on the repository
        // Like verifying that a mock was called in Elixir
        verify(orderRepository).save(any(Order.class));
        verify(paymentService).processPayment(any());

        // Could also verify it was called exactly once
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    /**
     * Test error handling - what happens when payment fails
     */
    @Test
    void shouldHandlePaymentFailure() {
        // Given - payment service will fail
        when(paymentService.processPayment(any())).thenReturn(false);

        // When & Then - expect an exception
        OrderRequest request = new OrderRequest("Test Customer", new BigDecimal("100.00"));

        // assertThatThrownBy is like assert_raise in ExUnit
        assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(PaymentFailedException.class)
            .hasMessage("Payment processing failed");

        // Verify repository save was never called due to payment failure
        verify(orderRepository, never()).save(any(Order.class));
    }
}
```

#### Integration Testing
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class OrderControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldCreateAndRetrieveOrder() {
        // Given
        OrderRequest request = new OrderRequest("John Doe", BigDecimal.valueOf(100));

        // When
        ResponseEntity<Order> createResponse = restTemplate.postForEntity(
            "/api/orders", request, Order.class);

        // Then
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Order createdOrder = createResponse.getBody();
        assertThat(createdOrder.getId()).isNotNull();

        // Verify in database
        Optional<Order> savedOrder = orderRepository.findById(createdOrder.getId());
        assertThat(savedOrder).isPresent();
    }
}
```

#### Web Layer Testing
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrder() throws Exception {
        // Given
        Order order = new Order(1L, "John Doe", BigDecimal.valueOf(100));
        when(orderService.findById(1L)).thenReturn(order);

        // When & Then
        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.customerName").value("John Doe"))
            .andExpect(jsonPath("$.amount").value(100));
    }

    @Test
    void shouldCreateOrder() throws Exception {
        // Given
        Order order = new Order(1L, "John Doe", BigDecimal.valueOf(100));
        when(orderService.createOrder(any())).thenReturn(order);

        // When & Then
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerName\":\"John Doe\",\"amount\":100}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }
}
```

### 7. Auto-Configuration Classes

#### Custom Auto-Configuration
```java
@Configuration
@ConditionalOnClass(MyService.class)
@ConditionalOnProperty(prefix = "myservice", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(MyServiceProperties.class)
public class MyServiceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyServiceProperties properties) {
        return new MyService(properties.getApiKey());
    }
}

@ConfigurationProperties(prefix = "myservice")
public class MyServiceProperties {
    private boolean enabled = true;
    private String apiKey;
    private int timeout = 5000;

    // getters and setters
}
```

**META-INF/spring.factories:**
```properties
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.MyServiceAutoConfiguration
```

### 8. Common Annotations

```java
// Import statements for REST controller
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import javax.validation.Valid;
import javax.validation.constraints.Min;

// Import statements for JPA Entity
import javax.persistence.*;
import javax.validation.constraints.Email;
import javax.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * REST Controller for User operations
 * Like a Phoenix controller but handles HTTP directly (no separate router)
 *
 * Handles all HTTP requests for /api/users/* endpoints
 */
@RestController  // Combines @Controller + @ResponseBody (returns JSON automatically)
@RequestMapping("/api/users")  // Base path for all endpoints (like scope in Phoenix router)
@Validated  // Enables validation on method parameters
public class UserController {

    // Service layer dependency - handles business logic
    // Like calling a context module in Phoenix (e.g., Accounts.get_user())
    @Autowired  // Spring dependency injection (like function arguments in Elixir)
    private UserService userService;

    /**
     * GET /api/users/{id} - Retrieve user by ID
     * Like a Phoenix controller action: def show(conn, %{"id" => id})
     *
     * @param id User ID from URL path (must be >= 1)
     * @return ResponseEntity with user data or 404 if not found
     */
    @GetMapping("/{id}")  // Handles GET requests to /api/users/123
    public ResponseEntity<User> getUser(
        @PathVariable @Min(1) Long id  // Extract {id} from URL path and validate >= 1
    ) {
        // Call service layer to find user (like Accounts.get_user(id))
        User user = userService.findById(id);

        // Return HTTP 200 OK with user data as JSON
        // Like conn |> put_status(200) |> json(user) in Phoenix
        return ResponseEntity.ok(user);
    }

    /**
     * POST /api/users - Create new user
     * Like: def create(conn, %{"user" => user_params})
     *
     * @param request User creation data from request body (JSON -> Java object)
     * @return ResponseEntity with created user and 201 status
     */
    @PostMapping  // Handles POST requests to /api/users
    public ResponseEntity<User> createUser(
        @RequestBody @Valid CreateUserRequest request  // Parse JSON body + validate
    ) {
        // Create user via service layer (like Accounts.create_user(attrs))
        User user = userService.create(request);

        // Return HTTP 201 Created with user data
        // Like conn |> put_status(:created) |> json(user) in Phoenix
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * PUT /api/users/{id} - Update existing user
     */
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
        @PathVariable Long id,
        @RequestBody @Valid UpdateUserRequest request
    ) {
        User user = userService.update(id, request);
        return ResponseEntity.ok(user);
    }

    /**
     * DELETE /api/users/{id} - Delete user
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        // Return HTTP 204 No Content (like conn |> send_resp(204, ""))
        return ResponseEntity.noContent().build();
    }
}

/**
 * JPA Entity representing users table
 * Like an Ecto schema in Phoenix - maps database table to Java object
 *
 * Example Ecto schema equivalent:
 * defmodule MyApp.Accounts.User do
 *   use Ecto.Schema
 *   schema "users" do
 *     field :email, :string
 *     field :first_name, :string
 *     timestamps()
 *   end
 * end
 */
@Entity  // Marks this as a JPA entity (database table mapping)
@Table(name = "users")  // Maps to "users" table (like schema "users" in Ecto)
public class User {

    /**
     * Primary key field - auto-incrementing ID
     * Like field :id, :id, autogenerate: true in Ecto
     */
    @Id  // Primary key annotation
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Auto-increment (like SERIAL in PostgreSQL)
    private Long id;

    /**
     * Email field with validation and uniqueness constraint
     * Like field :email, :string, null: false in Ecto + unique index
     */
    @Column(nullable = false, unique = true)  // NOT NULL + UNIQUE constraint
    @Email  // Validation: must be valid email format
    private String email;

    /**
     * First name with length validation
     * Like field :first_name, :string with changeset validation
     */
    @Column(name = "first_name")  // Maps to "first_name" column
    @Size(min = 2, max = 50)  // Validation: length between 2-50 characters
    private String firstName;

    /**
     * Automatically set creation timestamp
     * Like timestamps() in Ecto schema
     */
    @CreationTimestamp  // Hibernate automatically sets this on insert
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * Default constructor required by JPA
     * Like %User{} struct creation in Elixir
     */
    public User() {}

    /**
     * Constructor for creating users with data
     */
    public User(String email, String firstName) {
        this.email = email;
        this.firstName = firstName;
    }

    // Getters and setters required by JPA (like accessing struct fields in Elixir)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", firstName='" + firstName + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
```

## Common Interview Questions

### 1. How does Spring Boot auto-configuration work?
Spring Boot uses `@EnableAutoConfiguration` which:
1. Scans classpath for configuration classes
2. Uses conditions (`@ConditionalOn*`) to decide what to configure
3. Creates beans only if they don't already exist (`@ConditionalOnMissingBean`)

### 2. What's the difference between @SpringBootApplication and @EnableAutoConfiguration?
- `@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`
- `@EnableAutoConfiguration` only enables auto-configuration

### 3. How do you disable specific auto-configuration?
```java
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class Application {
    // ...
}

// Or in properties
spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
```

### 4. What are the advantages of Spring Boot over Spring?
- **Auto-configuration**: Reduces boilerplate
- **Embedded servers**: No need for external deployment
- **Starters**: Simplified dependency management
- **Actuator**: Production-ready features
- **Spring Boot CLI**: Rapid prototyping

### 5. How do you create executable JAR?
```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

Run: `mvn clean package` and then `java -jar target/app.jar`

## Best Practices

### 1. Configuration
- **Use `@ConfigurationProperties`** instead of multiple `@Value`
- **Validate configuration** with JSR-303 annotations
- **Use profiles** for environment-specific config

### 2. Testing
- **Use `@WebMvcTest`** for controller testing
- **Use `@DataJpaTest`** for repository testing
- **Use `@SpringBootTest`** for integration tests
- **Mock external dependencies** with `@MockBean`

### 3. Packaging
```java
@SpringBootApplication
@EntityScan("com.example.domain")
@EnableJpaRepositories("com.example.repository")
public class Application {
    // Keep main class in root package
}
```

### 4. Security
- **Never commit sensitive data** in properties files
- **Use Spring Boot's configuration processor** for IDE support
- **Enable HTTPS** in production

## Performance Tips

### 1. Startup Optimization
```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        System.setProperty("spring.jmx.enabled", "false");
        System.setProperty("spring.config.location", "classpath:/application.properties");

        SpringApplication app = new SpringApplication(Application.class);
        app.setLazyInitialization(true); // Spring Boot 2.2+
        app.run(args);
    }
}
```

### 2. Memory Usage
```yaml
spring:
  jpa:
    open-in-view: false # Disable OSIV
  jackson:
    generator:
      write-numbers-as-strings: false

server:
  tomcat:
    max-threads: 200
    min-spare-threads: 20
```

### 3. Monitoring
```java
@Component
public class ApplicationMetrics {

    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;

    public ApplicationMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.orderCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .register(meterRegistry);
    }

    public void incrementOrderCount() {
        orderCounter.increment();
    }
}
```

## Practical Examples

### Custom Starter
```java
// MyLibraryAutoConfiguration.java
@Configuration
@ConditionalOnClass(MyLibraryService.class)
@EnableConfigurationProperties(MyLibraryProperties.class)
public class MyLibraryAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public MyLibraryService myLibraryService(MyLibraryProperties properties) {
        return new MyLibraryService(properties);
    }
}

// MyLibraryProperties.java
@ConfigurationProperties(prefix = "mylibrary")
public class MyLibraryProperties {
    private boolean enabled = true;
    private String apiUrl = "https://api.example.com";
    // getters and setters
}
```

### Error Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("VALIDATION_ERROR")
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        ErrorResponse error = ErrorResponse.builder()
            .code("INTERNAL_ERROR")
            .message("An unexpected error occurred")
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```