# Spring Configuration

> **Before you start**: Do you understand Java annotations? If not, review: [Java Annotations](../../01-core-java/annotations/java-annotations.md)

## What is Spring Configuration?

Imagine setting up a smart home:

**Option 1: Manual wiring (XML)**:
- Write detailed instructions in a manual
- "Connect light switch A to bulb B"
- "Connect thermostat C to heater D"
- Verbose but explicit

**Option 2: Auto-discovery (Component Scanning)**:
- Put smart devices anywhere
- Hub automatically finds them
- Just say "I'm a light" and hub connects you
- Less configuration, more magic

**Option 3: Programming (Java Config)**:
- Write code to set up devices
- Type-safe, refactorable
- Best of both worlds

**In Spring**: Configuration tells Spring what beans to create and how to wire them together.

**Real-world analogy**:
```java
// XML: Explicit but verbose
<bean id="invoiceService" class="com.example.InvoiceService">
    <property name="repository" ref="invoiceRepository"/>
</bean>

// Component Scanning: Automatic discovery
@Service
public class InvoiceService { }  // Spring finds this automatically

// Java Config: Programmatic and type-safe
@Configuration
public class AppConfig {
    @Bean
    public InvoiceService invoiceService() {
        return new InvoiceService(invoiceRepository());
    }
}
```

**Stop and think**: Which approach seems easiest to maintain? Which is most explicit?

---

## Why This Matters

**You'll use Spring Configuration when**:
- Starting a new Spring project (how to structure it)
- Creating beans that need special initialization
- Switching between environments (dev, test, prod)
- Conditionally enabling features

**Interview context**:
- Common question: "How do you configure beans in Spring?"
- Expected to know: Component scanning + Java config (modern approach)
- Often asked: "What's the difference between @Component and @Bean?"

---

## Three Configuration Approaches

### Comparison Table

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **XML** | Explicit, separate from code | Verbose, no compile-time safety | Legacy apps only |
| **Annotations** | Concise, auto-discovery | Less explicit control | Your own classes |
| **Java Config** | Type-safe, programmatic | More code | Third-party beans, complex logic |

**Modern best practice**: **Annotations + Java Config** (skip XML)

---

## 1. Component Scanning (Annotation-Based)

### Stereotype Annotations

Spring provides 4 stereotype annotations to mark classes as beans:

```java
@Component  // Generic Spring-managed component
@Service    // Business logic layer (semantic, same as @Component)
@Repository // Data access layer (adds exception translation)
@Controller // Presentation layer (Spring MVC)
```

**Example**:
```java
// Spring automatically discovers these
@Repository
public class InvoiceRepository {
    // Data access logic
}

@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }
}

@Controller
public class InvoiceController {
    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }
}
```

### Enabling Component Scanning

**Spring Boot** (automatic):
```java
@SpringBootApplication  // Includes @ComponentScan
public class InvoiceManagerApp {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }
}
```

**@SpringBootApplication is equivalent to**:
```java
@Configuration        // This class contains bean definitions
@EnableAutoConfiguration  // Spring Boot auto-configuration
@ComponentScan        // Scan for @Component, @Service, etc.
public class InvoiceManagerApp { }
```

**Plain Spring** (manual):
```java
@Configuration
@ComponentScan(basePackages = "com.example.invoicemanager")
public class AppConfig {
    // Spring will scan com.example.invoicemanager package
}
```

### Component Scan Options

```java
@Configuration
@ComponentScan(
    basePackages = "com.example",  // Where to scan

    // Include only specific annotations
    includeFilters = @ComponentScan.Filter(
        type = FilterType.ANNOTATION,
        classes = MyCustomAnnotation.class
    ),

    // Exclude specific classes
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "com.example.test.*"
    )
)
public class AppConfig { }
```

**Type-safe package scanning**:
```java
@ComponentScan(basePackageClasses = InvoiceManagerApp.class)
// Scans package of InvoiceManagerApp class
// Safer than string (refactoring-friendly)
```

**Try it**: You have packages `com.example.invoice`, `com.example.customer`, `com.example.product`. How would you scan all of them?

<details>
<summary>Solution</summary>

```java
@ComponentScan(basePackages = "com.example")
// Scans com.example and all subpackages

// Or be explicit:
@ComponentScan(basePackages = {
    "com.example.invoice",
    "com.example.customer",
    "com.example.product"
})
```
</details>

---

## 2. Java-Based Configuration

### @Configuration Classes

```java
@Configuration
public class AppConfig {

    @Bean  // Creates a bean
    public InvoiceRepository invoiceRepository() {
        return new InvoiceRepositoryImpl();
    }

    @Bean
    public InvoiceService invoiceService() {
        // Manually wire dependencies
        return new InvoiceService(invoiceRepository());
    }

    @Bean
    public EmailService emailService() {
        EmailService service = new EmailService();
        service.setSmtpHost("smtp.gmail.com");
        service.setSmtpPort(587);
        return service;
    }
}
```

**How it works**:
1. Spring detects `@Configuration` class
2. Methods annotated with `@Bean` create beans
3. Bean name = method name (unless specified)
4. Spring manages these beans like any other

### Bean Names and Aliasing

```java
@Configuration
public class AppConfig {

    @Bean(name = "invoiceRepo")  // Custom name
    public InvoiceRepository invoiceRepository() {
        return new InvoiceRepositoryImpl();
    }

    @Bean({"emailService", "mailService"})  // Multiple names (aliases)
    public EmailService emailService() {
        return new EmailService();
    }
}
```

**Using custom names**:
```java
@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(@Qualifier("invoiceRepo") InvoiceRepository repository) {
        this.repository = repository;
    }
}
```

### Dependency Injection in @Configuration

```java
@Configuration
public class AppConfig {

    @Bean
    public InvoiceRepository repository() {
        return new InvoiceRepositoryImpl();
    }

    @Bean
    public CustomerRepository customerRepository() {
        return new CustomerRepositoryImpl();
    }

    // Method 1: Call @Bean methods directly
    @Bean
    public InvoiceService invoiceService() {
        return new InvoiceService(
            repository(),           // Calls @Bean method
            customerRepository()    // Spring ensures singleton
        );
    }

    // Method 2: Inject as parameters (preferred)
    @Bean
    public EmailService emailService(InvoiceRepository repo) {
        // Spring injects InvoiceRepository bean
        return new EmailService(repo);
    }

    // Method 3: Inject multiple beans
    @Bean
    public ReportService reportService(InvoiceRepository invoiceRepo,
                                       CustomerRepository customerRepo) {
        return new ReportService(invoiceRepo, customerRepo);
    }
}
```

**Spring's CGLIB magic**:
```java
@Bean
public InvoiceRepository repository() {
    return new InvoiceRepositoryImpl();  // Created ONCE
}

@Bean
public InvoiceService service1() {
    return new InvoiceService(repository());  // Gets singleton
}

@Bean
public InvoiceService service2() {
    return new InvoiceService(repository());  // Same singleton!
}
```

Even though `repository()` is called twice, Spring creates only ONE instance.

### When to Use @Bean vs @Component

| Use @Component | Use @Bean |
|----------------|-----------|
| Your own classes | Third-party classes (can't add @Component) |
| Simple beans | Beans needing complex initialization |
| Auto-discovery preferred | Explicit control needed |
| | Multiple beans of same type |

**Example - Third-party library**:
```java
// Can't modify this class (it's in a library)
public class ThirdPartyEmailClient {
    public ThirdPartyEmailClient(String apiKey, String endpoint) {
        // Complex initialization
    }
}

// Use @Bean to create it
@Configuration
public class AppConfig {

    @Bean
    public ThirdPartyEmailClient emailClient(
            @Value("${email.api.key}") String apiKey,
            @Value("${email.api.endpoint}") String endpoint) {

        ThirdPartyEmailClient client = new ThirdPartyEmailClient(apiKey, endpoint);
        client.setTimeout(5000);
        client.setRetryCount(3);
        return client;
    }
}
```

**Example - Multiple beans of same type**:
```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary  // Default choice
    public DataSource primaryDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost/main");
        return ds;
    }

    @Bean
    public DataSource reportsDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost/reports");
        ds.setReadOnly(true);  // Read-only replica
        return ds;
    }
}
```

**Compare**: When would you use @Component vs @Bean for creating a bean?

---

## 3. Property Configuration

### application.properties / application.yml

**application.properties**:
```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/invoicedb
spring.datasource.username=admin
spring.datasource.password=secret

# Email
email.smtp.host=smtp.gmail.com
email.smtp.port=587
email.from=noreply@invoicemanager.com

# App settings
app.invoice.currency=USD
app.invoice.tax-rate=0.08
```

**application.yml** (preferred - more readable):
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/invoicedb
    username: admin
    password: secret

email:
  smtp:
    host: smtp.gmail.com
    port: 587
  from: noreply@invoicemanager.com

app:
  invoice:
    currency: USD
    tax-rate: 0.08
```

### Injecting Properties with @Value

```java
@Service
public class InvoiceService {
    private final String currency;
    private final double taxRate;

    public InvoiceService(
            @Value("${app.invoice.currency}") String currency,
            @Value("${app.invoice.tax-rate}") double taxRate) {
        this.currency = currency;
        this.taxRate = taxRate;
    }

    public Invoice calculateTotal(Invoice invoice) {
        double subtotal = invoice.getLineItems().stream()
            .mapToDouble(InvoiceLineItem::getSubtotal)
            .sum();

        double tax = subtotal * taxRate;
        invoice.setTotal(subtotal + tax);
        invoice.setCurrency(currency);

        return invoice;
    }
}
```

**Default values**:
```java
@Value("${app.feature.enabled:false}")  // Default: false
private boolean featureEnabled;

@Value("${app.max.items:100}")  // Default: 100
private int maxItems;
```

### @ConfigurationProperties (Type-Safe)

**Better than @Value for grouped properties**:

```java
@ConfigurationProperties(prefix = "app.invoice")
@Component
public class InvoiceProperties {
    private String currency = "USD";
    private double taxRate = 0.08;
    private int maxLineItems = 100;
    private boolean emailNotifications = true;

    // Getters and setters (required)
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public double getTaxRate() { return taxRate; }
    public void setTaxRate(double taxRate) { this.taxRate = taxRate; }

    // ... other getters/setters
}
```

**application.yml**:
```yaml
app:
  invoice:
    currency: EUR
    tax-rate: 0.15
    max-line-items: 50
    email-notifications: true
```

**Using it**:
```java
@Service
public class InvoiceService {
    private final InvoiceProperties properties;

    public InvoiceService(InvoiceProperties properties) {
        this.properties = properties;
    }

    public Invoice createInvoice(CreateInvoiceRequest request) {
        if (request.getLineItems().size() > properties.getMaxLineItems()) {
            throw new IllegalArgumentException(
                "Too many line items (max: " + properties.getMaxLineItems() + ")");
        }

        Invoice invoice = new Invoice();
        invoice.setCurrency(properties.getCurrency());
        // Calculate with tax rate
        double total = calculateWithTax(request, properties.getTaxRate());
        invoice.setTotal(total);

        return invoice;
    }
}
```

**Why @ConfigurationProperties is better**:
- ✅ Type-safe (compile-time errors)
- ✅ Grouped properties (organization)
- ✅ Validation support (`@Validated`, `@NotNull`, etc.)
- ✅ IDE autocomplete
- ✅ Relaxed binding (`tax-rate` → `taxRate`)

**With validation**:
```java
@ConfigurationProperties(prefix = "app.invoice")
@Validated
@Component
public class InvoiceProperties {

    @NotBlank
    private String currency;

    @Min(0)
    @Max(1)
    private double taxRate;

    @Positive
    private int maxLineItems;

    // If properties are invalid, app fails to start
}
```

---

## 4. Profiles

Profiles allow different configurations for different environments.

### Defining Profiles

**application.yml**:
```yaml
# Default (all environments)
app:
  name: InvoiceManager

---
# Development profile
spring:
  config:
    activate:
      on-profile: dev

spring:
  datasource:
    url: jdbc:h2:mem:testdb
    username: sa
    password:

logging:
  level:
    root: DEBUG

---
# Production profile
spring:
  config:
    activate:
      on-profile: prod

spring:
  datasource:
    url: jdbc:postgresql://prod-db:5432/invoicedb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

logging:
  level:
    root: WARN
```

**Or separate files**:
```
application.yml          # Common properties
application-dev.yml      # Development
application-test.yml     # Testing
application-prod.yml     # Production
```

### Activating Profiles

**Command line**:
```bash
java -jar invoice-manager.jar --spring.profiles.active=prod
```

**Environment variable**:
```bash
export SPRING_PROFILES_ACTIVE=dev
java -jar invoice-manager.jar
```

**In application.yml**:
```yaml
spring:
  profiles:
    active: dev
```

**Programmatically**:
```java
public static void main(String[] args) {
    SpringApplication app = new SpringApplication(InvoiceManagerApp.class);
    app.setAdditionalProfiles("dev");
    app.run(args);
}
```

### Profile-Specific Beans

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")  // Only in dev profile
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }

    @Bean
    @Profile("prod")  // Only in prod profile
    public DataSource prodDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(System.getenv("DATABASE_URL"));
        return ds;
    }

    @Bean
    @Profile({"dev", "test"})  // Multiple profiles
    public DataSource testDataSource() {
        // Used in both dev and test
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }

    @Bean
    @Profile("!prod")  // All except prod
    public MockEmailService mockEmailService() {
        return new MockEmailService();
    }
}
```

**Component-level profiles**:
```java
@Service
@Profile("dev")
public class MockPaymentService implements PaymentService {
    public void processPayment(double amount) {
        System.out.println("MOCK: Processing $" + amount);
    }
}

@Service
@Profile("prod")
public class StripePaymentService implements PaymentService {
    public void processPayment(double amount) {
        // Real Stripe API call
    }
}
```

**Try it**: How would you create a bean that's active in all profiles EXCEPT production?

<details>
<summary>Solution</summary>

```java
@Bean
@Profile("!prod")
public DebugToolsBean debugTools() {
    return new DebugToolsBean();
}
```
</details>

---

## 5. Conditional Configuration

### @Conditional Annotations

Spring Boot provides many conditional annotations:

```java
@Configuration
public class AppConfig {

    // Only if class is on classpath
    @Bean
    @ConditionalOnClass(name = "com.stripe.Stripe")
    public StripePaymentService stripePayment() {
        return new StripePaymentService();
    }

    // Only if property is set
    @Bean
    @ConditionalOnProperty(name = "app.email.enabled", havingValue = "true")
    public EmailService emailService() {
        return new EmailService();
    }

    // Only if bean doesn't exist
    @Bean
    @ConditionalOnMissingBean
    public PaymentService defaultPaymentService() {
        return new MockPaymentService();  // Fallback
    }

    // Only if expression is true
    @Bean
    @ConditionalOnExpression("${app.cache.enabled:false} && ${app.cache.size:0} > 0")
    public CacheManager cacheManager() {
        return new CacheManager();
    }

    // Only on specific OS
    @Bean
    @ConditionalOnOs(OS.LINUX)
    public LinuxSpecificService linuxService() {
        return new LinuxSpecificService();
    }
}
```

**Common conditionals**:

| Annotation | When Bean is Created |
|------------|---------------------|
| `@ConditionalOnClass` | If class is on classpath |
| `@ConditionalOnMissingClass` | If class is NOT on classpath |
| `@ConditionalOnBean` | If bean exists |
| `@ConditionalOnMissingBean` | If bean doesn't exist |
| `@ConditionalOnProperty` | If property matches |
| `@ConditionalOnExpression` | If SpEL expression is true |
| `@ConditionalOnWebApplication` | If web application |

**Example - Feature flag**:
```java
@Configuration
public class FeatureConfig {

    @Bean
    @ConditionalOnProperty(
        name = "app.feature.pdf-generation",
        havingValue = "true",
        matchIfMissing = false  // Default: disabled
    )
    public PDFGenerationService pdfService() {
        return new PDFGenerationService();
    }
}
```

**application.yml**:
```yaml
app:
  feature:
    pdf-generation: true  # Enable PDF generation
```

---

## Mixing Configuration Approaches

**Modern best practice**: Combine component scanning + Java config

```java
@SpringBootApplication  // Enables component scanning
public class InvoiceManagerApp {
    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }
}

// Component scanning finds these
@Service
public class InvoiceService { }

@Repository
public class InvoiceRepository { }

// Java config for third-party beans
@Configuration
public class ThirdPartyConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        return mapper;
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** are the three main ways to configure Spring beans?
2. **Why** would you use @Bean instead of @Component?
3. **When** would you use @ConfigurationProperties over @Value?
4. **How** do you activate a specific profile?
5. **Compare**: @Value vs @ConfigurationProperties - which is better for grouped properties?

---

## Practice Exercises

### Standalone Exercises

**Level 1 - Choose the Right Approach**:
For each scenario, choose @Component or @Bean:
1. Your `UserService` class
2. Jackson's `ObjectMapper` (third-party)
3. Your `EmailNotifier` class
4. Two different `DataSource` beans

**Level 2 - Configuration Properties**:
Create a type-safe configuration for:
```yaml
payment:
  stripe:
    api-key: sk_test_xxx
    webhook-secret: whsec_xxx
    timeout-seconds: 30
```

**Level 3 - Profile Configuration**:
Configure different `EmailService` implementations:
- Dev: Log emails to console
- Test: Store in memory
- Prod: Send via SMTP

---

### Build-Along Project: InvoiceManager App

> **Goal**: Add configuration, profiles, and properties to InvoiceManager

**Step 1: Create Configuration Properties**

```java
@ConfigurationProperties(prefix = "app.invoice")
@Validated
@Component
public class InvoiceProperties {

    @NotBlank
    private String currency = "USD";

    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal taxRate = new BigDecimal("0.08");

    @Positive
    private int maxLineItems = 100;

    private boolean emailNotifications = true;

    private String pdfTemplate = "default";

    // Getters and setters
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }

    public int getMaxLineItems() { return maxLineItems; }
    public void setMaxLineItems(int maxLineItems) { this.maxLineItems = maxLineItems; }

    public boolean isEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public String getPdfTemplate() { return pdfTemplate; }
    public void setPdfTemplate(String pdfTemplate) { this.pdfTemplate = pdfTemplate; }
}
```

**Step 2: Create application.yml**

```yaml
spring:
  application:
    name: InvoiceManager

app:
  invoice:
    currency: USD
    tax-rate: 0.08
    max-line-items: 100
    email-notifications: true
    pdf-template: default

---
# Development Profile
spring:
  config:
    activate:
      on-profile: dev

logging:
  level:
    com.example.invoicemanager: DEBUG

app:
  invoice:
    email-notifications: false  # Don't send emails in dev

---
# Production Profile
spring:
  config:
    activate:
      on-profile: prod

logging:
  level:
    com.example.invoicemanager: INFO

app:
  invoice:
    tax-rate: 0.15  # Different tax rate for prod
    email-notifications: true
```

**Step 3: Update InvoiceService to Use Properties**

```java
@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ApplicationContext context;
    private final ApplicationMetrics metrics;
    private final InvoiceProperties properties;  // Add properties

    public InvoiceService(InvoiceRepository invoiceRepository,
                         CustomerRepository customerRepository,
                         ApplicationContext context,
                         ApplicationMetrics metrics,
                         InvoiceProperties properties) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.context = context;
        this.metrics = metrics;
        this.properties = properties;
    }

    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        // Validate max line items
        if (items.size() > properties.getMaxLineItems()) {
            throw new IllegalArgumentException(
                String.format("Too many line items. Maximum allowed: %d",
                    properties.getMaxLineItems())
            );
        }

        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));

        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        invoice.setDate(LocalDate.now());
        invoice.setLineItems(items);
        invoice.setCurrency(properties.getCurrency());

        // Calculate subtotal
        double subtotal = items.stream()
            .mapToDouble(InvoiceLineItem::getSubtotal)
            .sum();

        // Apply tax rate from config
        double tax = subtotal * properties.getTaxRate().doubleValue();
        double total = subtotal + tax;
        invoice.setTotal(total);

        Invoice saved = invoiceRepository.save(invoice);
        metrics.recordInvoiceCreated(total);

        return saved;
    }

    public byte[] generateInvoicePDF(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        InvoicePDFGenerator generator = context.getBean(InvoicePDFGenerator.class);
        generator.setInvoice(invoice);
        generator.addCustomData("template", properties.getPdfTemplate());
        generator.addCustomData("generatedAt", LocalDateTime.now());

        byte[] pdf = generator.generatePDF();
        metrics.recordPDFGenerated();

        return pdf;
    }

    // Other methods...
}
```

**Step 4: Create Profile-Specific Email Service**

```java
// Interface
public interface EmailService {
    void sendInvoiceCreated(Invoice invoice);
}

// Development implementation
@Service
@Profile("dev")
public class ConsoleEmailService implements EmailService {
    @Override
    public void sendInvoiceCreated(Invoice invoice) {
        System.out.println("========================================");
        System.out.println("📧 EMAIL (Console - DEV MODE)");
        System.out.println("To: " + invoice.getCustomer().getEmail());
        System.out.println("Subject: Invoice Created");
        System.out.println("Body: Your invoice " + invoice.getId() + " for $" +
                          invoice.getTotal() + " has been created.");
        System.out.println("========================================");
    }
}

// Production implementation
@Service
@Profile("prod")
public class SmtpEmailService implements EmailService {
    private final InvoiceProperties properties;

    public SmtpEmailService(InvoiceProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendInvoiceCreated(Invoice invoice) {
        if (!properties.isEmailNotifications()) {
            return;  // Notifications disabled
        }

        // Real SMTP logic
        System.out.println("📧 Sending real email via SMTP to: " +
                          invoice.getCustomer().getEmail());
        // TODO: Implement actual SMTP sending
    }
}
```

**Step 5: Create Configuration Class for Third-Party Beans**

```java
@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        return mapper;
    }

    @Bean
    @ConditionalOnProperty(name = "app.invoice.pdf-generation", havingValue = "true", matchIfMissing = true)
    public PDFLibraryConfig pdfConfig() {
        // Configure PDF library
        return new PDFLibraryConfig();
    }
}
```

**Step 6: Update Main Application to Log Active Profile**

```java
@SpringBootApplication
public class InvoiceManagerApp implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(InvoiceManagerApp.class);

    private final Environment environment;
    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;
    private final ApplicationMetrics metrics;
    private final InvoiceProperties properties;

    public InvoiceManagerApp(Environment environment,
                            InvoiceService invoiceService,
                            CustomerRepository customerRepository,
                            ApplicationMetrics metrics,
                            InvoiceProperties properties) {
        this.environment = environment;
        this.invoiceService = invoiceService;
        this.customerRepository = customerRepository;
        this.metrics = metrics;
        this.properties = properties;
    }

    public static void main(String[] args) {
        SpringApplication.run(InvoiceManagerApp.class, args);
    }

    @Override
    public void run(String... args) {
        // Log configuration
        String[] profiles = environment.getActiveProfiles();
        log.info("==============================================");
        log.info("InvoiceManager Application Started");
        log.info("Active Profiles: {}", Arrays.toString(profiles.length > 0 ? profiles : new String[]{"default"}));
        log.info("Currency: {}", properties.getCurrency());
        log.info("Tax Rate: {}%", properties.getTaxRate().multiply(new BigDecimal("100")));
        log.info("Max Line Items: {}", properties.getMaxLineItems());
        log.info("Email Notifications: {}", properties.isEmailNotifications());
        log.info("==============================================");

        // Create sample data
        Customer customer = customerRepository.findAll().get(0);

        List<InvoiceLineItem> items = Arrays.asList(
            new InvoiceLineItem(new Product("P001", "Laptop", 1000.0), 1),
            new InvoiceLineItem(new Product("P002", "Mouse", 25.0), 2)
        );

        Invoice invoice = invoiceService.createInvoice(customer.getId(), items);

        log.info("Invoice created: {} for customer: {}",
                invoice.getId(), invoice.getCustomer().getName());
        log.info("Subtotal: ${}", invoice.getTotal() / (1 + properties.getTaxRate().doubleValue()));
        log.info("Tax ({}%): ${}", properties.getTaxRate().multiply(new BigDecimal("100")),
                invoice.getTotal() - (invoice.getTotal() / (1 + properties.getTaxRate().doubleValue())));
        log.info("Total: ${}", invoice.getTotal());
    }
}
```

**Step 7: Test with Different Profiles**

Run with dev profile:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Expected output:
```
Active Profiles: [dev]
Currency: USD
Tax Rate: 8%
Email Notifications: false
========================================
📧 EMAIL (Console - DEV MODE)
To: billing@acme.com
Subject: Invoice Created
...
========================================
```

Run with prod profile:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

Expected output:
```
Active Profiles: [prod]
Currency: USD
Tax Rate: 15%
Email Notifications: true
📧 Sending real email via SMTP to: billing@acme.com
```

**Checkpoint**: By now, your app should:
- ✅ Use type-safe configuration properties
- ✅ Support different profiles (dev, prod)
- ✅ Have profile-specific beans (email service)
- ✅ Externalize configuration to application.yml
- ✅ Validate configuration at startup

**Next step**: In [Spring AOP](./04-aop.md), you'll add cross-cutting concerns like logging and transaction management.

---

## Common Mistakes

❌ **Mistake 1**: Using @Value for many related properties
```java
@Service
public class MyService {
    @Value("${db.host}") private String host;
    @Value("${db.port}") private int port;
    @Value("${db.username}") private String username;
    @Value("${db.password}") private String password;
    // Too many @Value annotations!
}
```
✅ **Instead**: Use @ConfigurationProperties
```java
@ConfigurationProperties(prefix = "db")
@Component
public class DatabaseProperties {
    private String host;
    private int port;
    private String username;
    private String password;
    // Getters and setters
}
```

❌ **Mistake 2**: Hardcoding values instead of using properties
```java
@Bean
public EmailService emailService() {
    EmailService service = new EmailService();
    service.setHost("smtp.gmail.com");  // Hardcoded!
    return service;
}
```
✅ **Instead**: Inject from properties
```java
@Bean
public EmailService emailService(@Value("${email.smtp.host}") String host) {
    EmailService service = new EmailService();
    service.setHost(host);
    return service;
}
```

❌ **Mistake 3**: Not specifying profile for environment-specific beans
```java
@Bean
public DataSource dataSource() {
    // Which database? Dev or prod?
    return new HikariDataSource();
}
```
✅ **Instead**: Use profiles
```java
@Bean
@Profile("dev")
public DataSource devDataSource() { }

@Bean
@Profile("prod")
public DataSource prodDataSource() { }
```

---

## Interview Questions

### Knowledge Questions
1. "How do you configure beans in Spring?" → Component scanning, Java config, XML (legacy)
2. "Difference between @Component and @Bean?" → @Component on classes (auto), @Bean in config methods (manual)
3. "What's @ConfigurationProperties?" → Type-safe configuration properties
4. "How do you use profiles?" → See Profiles section

### Scenario Questions
1. "You need different database configs for dev and prod. How?"
   → Answer: Use profiles with @Profile annotation or profile-specific application-{profile}.yml

2. "Third-party library needs complex initialization. @Component or @Bean?"
   → Answer: @Bean (can't modify third-party class to add @Component)

3. "How to make a bean conditional on a property?"
   → Answer: @ConditionalOnProperty

### Debugging Questions
```java
@Value("${app.feature.enabled}")
private boolean enabled;  // Exception: Could not resolve placeholder
```
What's wrong? → Property not defined in application.yml or missing default

---

## Summary

**In 3 sentences**:
- Spring configuration defines what beans to create (component scanning, Java config, or XML).
- Use @Component for your classes, @Bean for third-party beans or complex initialization.
- Profiles (@Profile) enable environment-specific configuration, and @ConfigurationProperties provide type-safe property binding.

**Key takeaway**: **Component scanning + Java config** is the modern approach - use @Component/@Service/@Repository for your classes, @Bean for third-party beans, and @ConfigurationProperties for configuration.

---

## Navigation

**Prerequisites:**
- [IoC & Dependency Injection](./01-ioc-and-di.md) - Understanding of bean creation and injection
- [Bean Lifecycle & Scopes](./02-bean-lifecycle-scopes.md) - Bean initialization and scopes

**Next Topics:**
- [Aspect-Oriented Programming](./04-aop.md) - Cross-cutting concerns with aspects
- [Best Practices & Patterns](./05-best-practices.md) - Configuration patterns and anti-patterns

**Related:**
- [Spring Boot Auto-Configuration](../../spring-boot/01-auto-configuration.md) - Uses @Conditional annotations heavily
- [Spring Boot Starters](../../spring-boot/02-starters.md) - Pre-configured bean collections
- [Externalized Configuration](../../spring-boot/05-best-practices.md) - Profiles and properties in depth

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
