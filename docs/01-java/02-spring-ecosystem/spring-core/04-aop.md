# Aspect-Oriented Programming (AOP)

> **Before you start**: Can you think of concerns that affect multiple classes in your application? (logging, security, transactions)

## What is AOP?

Imagine running a restaurant:

**Without AOP (Scattered logic)**:
- Chef 1: Cook pasta + log what you cooked + check if you're authorized
- Chef 2: Cook pizza + log what you cooked + check if you're authorized
- Chef 3: Cook salad + log what you cooked + check if you're authorized
- **Problem**: Every chef repeats the same logging/security code

**With AOP (Centralized logic)**:
- Manager: "I'll handle all logging and security for everyone"
- Chef 1: Cook pasta (that's it!)
- Chef 2: Cook pizza (that's it!)
- Chef 3: Cook salad (that's it!)
- **Result**: Chefs focus on cooking, manager handles cross-cutting concerns

**In programming**: AOP separates **cross-cutting concerns** (logging, security, transactions) from **business logic**.

**Real-world analogy**:
```java
// WITHOUT AOP - Logging scattered everywhere
@Service
public class InvoiceService {
    public Invoice createInvoice(CreateInvoiceRequest request) {
        log.info("Creating invoice for customer: " + request.getCustomerId());
        // Business logic
        Invoice invoice = ...;
        log.info("Invoice created: " + invoice.getId());
        return invoice;
    }

    public void deleteInvoice(String id) {
        log.info("Deleting invoice: " + id);
        // Business logic
        repository.delete(id);
        log.info("Invoice deleted: " + id);
    }
}

// WITH AOP - Logging centralized
@Aspect
@Component
public class LoggingAspect {
    @Before("execution(* com.example..*Service.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        log.info("Calling: " + joinPoint.getSignature().getName());
    }

    @AfterReturning("execution(* com.example..*Service.*(..))")
    public void logAfter(JoinPoint joinPoint) {
        log.info("Completed: " + joinPoint.getSignature().getName());
    }
}

@Service
public class InvoiceService {
    public Invoice createInvoice(CreateInvoiceRequest request) {
        // Just business logic - logging handled by aspect!
        return ...;
    }

    public void deleteInvoice(String id) {
        // Just business logic - logging handled by aspect!
        repository.delete(id);
    }
}
```

**Stop and think**: What other concerns might you want to handle separately from business logic?

<details>
<summary>Examples</summary>
- Logging (what we just saw)
- Security (who can call this method?)
- Transactions (commit/rollback database changes)
- Performance monitoring (how long did this take?)
- Caching (save results for later)
- Error handling (what to do when things fail?)
</details>

---

## Why This Matters

**You'll use AOP when**:
- Adding logging without cluttering business code
- Implementing security checks across multiple methods
- Managing database transactions
- Monitoring performance
- Any cross-cutting concern that affects many classes

**Interview context**:
- Common question: "What is AOP? Give an example."
- Expected to know: Aspect, Advice, Pointcut, Join Point
- Often asked: "How does @Transactional work?" (hint: AOP!)

---

## AOP Core Concepts

### The Key Terms

```
┌─────────────────────────────────────────────────────────┐
│                    AOP Terminology                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Aspect         = Module containing cross-cutting logic │
│                   (e.g., LoggingAspect)                 │
│                                                         │
│  Join Point     = Point in execution where aspect runs  │
│                   (e.g., method call, exception)        │
│                                                         │
│  Pointcut       = Expression selecting join points      │
│                   (e.g., "all service methods")         │
│                                                         │
│  Advice         = Code to run at join point             │
│                   (e.g., @Before, @After, @Around)      │
│                                                         │
│  Target Object  = Object being advised                  │
│                   (e.g., InvoiceService)                │
│                                                         │
│  Weaving        = Linking aspects with objects          │
│                   (happens at runtime in Spring)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Visual example**:
```
Target Method: invoiceService.createInvoice()
                      │
                      ↓
    ┌─────────────────────────────────────┐
    │  @Before Advice                     │  ← Runs before
    │  "Log: Starting createInvoice"      │
    └─────────────────────────────────────┘
                      │
                      ↓
    ┌─────────────────────────────────────┐
    │  ACTUAL METHOD EXECUTION            │
    │  createInvoice() {                  │
    │    // Business logic                │
    │  }                                  │
    └─────────────────────────────────────┘
                      │
                      ↓
    ┌─────────────────────────────────────┐
    │  @After Advice                      │  ← Runs after
    │  "Log: Finished createInvoice"      │
    └─────────────────────────────────────┘
```

---

## Setting Up AOP

### Add Dependency

**Maven**:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

**Gradle**:
```gradle
implementation 'org.springframework.boot:spring-boot-starter-aop'
```

### Enable AOP (if not using Spring Boot)

```java
@Configuration
@EnableAspectJAutoProxy  // Spring Boot does this automatically
public class AppConfig {
}
```

---

## Types of Advice

### 1. @Before - Runs Before Method

```java
@Aspect
@Component
public class LoggingAspect {

    @Before("execution(* com.example.service.*.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();

        System.out.println("→ Calling: " + className + "." + methodName);
    }
}
```

**When it runs**:
```
→ Calling: InvoiceService.createInvoice
  [ACTUAL METHOD EXECUTES]
```

**Use cases**:
- Logging method entry
- Parameter validation
- Security checks

### 2. @After - Runs After Method (Success or Failure)

```java
@Aspect
@Component
public class LoggingAspect {

    @After("execution(* com.example.service.*.*(..))")
    public void logAfter(JoinPoint joinPoint) {
        System.out.println("← Finished: " + joinPoint.getSignature().getName());
    }
}
```

**When it runs**:
```
  [ACTUAL METHOD EXECUTES]
← Finished: InvoiceService.createInvoice
```

**Use cases**:
- Cleanup operations
- Logging method exit
- Release resources

### 3. @AfterReturning - Runs After Successful Return

```java
@Aspect
@Component
public class LoggingAspect {

    @AfterReturning(
        pointcut = "execution(* com.example.service.InvoiceService.createInvoice(..))",
        returning = "invoice"
    )
    public void logAfterReturning(JoinPoint joinPoint, Invoice invoice) {
        System.out.println("✓ Invoice created: " + invoice.getId() +
                          " Total: $" + invoice.getTotal());
    }
}
```

**When it runs**:
```
  [ACTUAL METHOD EXECUTES SUCCESSFULLY]
✓ Invoice created: INV-001 Total: $1500.00
```

**Use cases**:
- Log successful operations
- Audit trail
- Cache results

### 4. @AfterThrowing - Runs If Method Throws Exception

```java
@Aspect
@Component
public class ErrorHandlingAspect {

    @AfterThrowing(
        pointcut = "execution(* com.example.service.*.*(..))",
        throwing = "exception"
    )
    public void logError(JoinPoint joinPoint, Exception exception) {
        String methodName = joinPoint.getSignature().getName();

        System.err.println("✗ Error in " + methodName + ": " + exception.getMessage());

        // Could also:
        // - Send alert email
        // - Log to monitoring system
        // - Increment error counter
    }
}
```

**When it runs**:
```
  [ACTUAL METHOD THROWS EXCEPTION]
✗ Error in createInvoice: Customer not found
```

**Use cases**:
- Error logging
- Send alerts
- Rollback operations

### 5. @Around - Wraps Method (Most Powerful)

```java
@Aspect
@Component
public class PerformanceAspect {

    @Around("execution(* com.example.service.*.*(..))")
    public Object measurePerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();

        // BEFORE
        long startTime = System.currentTimeMillis();
        System.out.println("→ Starting: " + methodName);

        Object result = null;
        try {
            // EXECUTE ACTUAL METHOD
            result = joinPoint.proceed();

            // AFTER SUCCESS
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("✓ Completed: " + methodName + " in " + duration + "ms");

        } catch (Exception e) {
            // AFTER ERROR
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("✗ Failed: " + methodName + " in " + duration + "ms");
            throw e;
        }

        return result;
    }
}
```

**When it runs**:
```
→ Starting: createInvoice
  [ACTUAL METHOD EXECUTES]
✓ Completed: createInvoice in 45ms
```

**@Around is special**:
- You control if/when the actual method runs (`joinPoint.proceed()`)
- You can modify arguments
- You can modify return value
- You can catch and handle exceptions

**Use cases**:
- Performance monitoring
- Caching
- Retry logic
- Transaction management

**Try it**: Which advice would you use to cache method results?

<details>
<summary>Answer</summary>
@Around - you can check if result is cached before calling proceed(), and store result in cache after.
</details>

---

## Pointcut Expressions

Pointcuts define **where** advice applies.

### Basic Syntax

```
execution(modifiers? return-type package.class.method(params) throws?)
```

**Examples**:

```java
// All methods in InvoiceService
@Before("execution(* com.example.service.InvoiceService.*(..))")

// All public methods in any service
@Before("execution(public * com.example.service.*.*(..))")

// Methods returning Invoice
@Before("execution(com.example.model.Invoice *.*(..))")

// Methods taking String parameter
@Before("execution(* *(String))")

// Methods taking any parameters
@Before("execution(* *(..))")

// Methods with no parameters
@Before("execution(* *())")
```

### Wildcards

| Wildcard | Meaning | Example |
|----------|---------|---------|
| `*` | Any one element | `*.Invoice` = any package + Invoice |
| `..` | Zero or more elements | `com.example..*` = com.example and all subpackages |
| `(..)` | Any parameters | `method(..)` = any parameters |
| `(*)` | One parameter of any type | `method(*)` |

### Common Pointcut Patterns

```java
@Aspect
@Component
public class CommonPointcuts {

    // All service layer methods
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceMethods() {}

    // All repository layer methods
    @Pointcut("execution(* com.example.repository.*.*(..))")
    public void repositoryMethods() {}

    // All public methods
    @Pointcut("execution(public * *(..))")
    public void publicMethods() {}

    // Methods annotated with @Transactional
    @Pointcut("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void transactionalMethods() {}

    // Classes annotated with @Service
    @Pointcut("@within(org.springframework.stereotype.Service)")
    public void serviceClasses() {}

    // Combine pointcuts with AND
    @Pointcut("serviceMethods() && publicMethods()")
    public void publicServiceMethods() {}

    // Combine with OR
    @Pointcut("serviceMethods() || repositoryMethods()")
    public void serviceOrRepositoryMethods() {}

    // Use the pointcut
    @Before("publicServiceMethods()")
    public void logPublicServiceCalls(JoinPoint joinPoint) {
        // ...
    }
}
```

### Annotation-Based Pointcuts

**Create custom annotation**:
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String value() default "";
}
```

**Apply to methods**:
```java
@Service
public class InvoiceService {

    @Audited("invoice-creation")
    public Invoice createInvoice(CreateInvoiceRequest request) {
        // Business logic
    }

    @Audited("invoice-deletion")
    public void deleteInvoice(String id) {
        // Business logic
    }
}
```

**Create aspect for annotated methods**:
```java
@Aspect
@Component
public class AuditAspect {

    @AfterReturning(
        pointcut = "@annotation(audited)",
        returning = "result"
    )
    public void audit(JoinPoint joinPoint, Audited audited, Object result) {
        String action = audited.value();
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        String details = joinPoint.getSignature().getName();

        System.out.println(String.format(
            "AUDIT: User '%s' performed '%s' - %s",
            user, action, details
        ));

        // Save to audit log database
    }
}
```

**Compare**: What's the advantage of annotation-based pointcuts vs execution() expressions?

<details>
<summary>Answer</summary>
More explicit and maintainable. You clearly mark which methods should be audited. Execution expressions can be fragile if package structure changes.
</details>

---

## Practical Examples

### Example 1: Method Execution Logging

```java
@Aspect
@Component
@Slf4j
public class ExecutionLoggingAspect {

    @Around("execution(* com.example.service.*.*(..))")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        log.info("→ {}. {} called with args: {}",
                className, methodName, Arrays.toString(args));

        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            log.info("← {}.{} completed in {}ms, returned: {}",
                    className, methodName, duration, result);

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;

            log.error("✗ {}.{} failed in {}ms with error: {}",
                    className, methodName, duration, e.getMessage());

            throw e;
        }
    }
}
```

**Output**:
```
→ InvoiceService.createInvoice called with args: [CreateInvoiceRequest@123]
← InvoiceService.createInvoice completed in 45ms, returned: Invoice@456
```

### Example 2: Performance Monitoring

```java
@Aspect
@Component
public class PerformanceMonitoringAspect {

    private final Map<String, LongSummaryStatistics> performanceStats = new ConcurrentHashMap<>();

    @Around("execution(* com.example.service.*.*(..))")
    public Object monitorPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();

        long startTime = System.nanoTime();
        Object result = joinPoint.proceed();
        long duration = (System.nanoTime() - startTime) / 1_000_000; // Convert to ms

        // Track statistics
        performanceStats.computeIfAbsent(methodName, k -> new LongSummaryStatistics())
                       .accept(duration);

        return result;
    }

    @Scheduled(fixedRate = 60000)  // Every minute
    public void printStats() {
        System.out.println("\n=== Performance Statistics ===");
        performanceStats.forEach((method, stats) -> {
            System.out.printf("%s: avg=%.2fms, min=%dms, max=%dms, count=%d%n",
                    method,
                    stats.getAverage(),
                    stats.getMin(),
                    stats.getMax(),
                    stats.getCount());
        });
    }
}
```

**Output**:
```
=== Performance Statistics ===
InvoiceService.createInvoice: avg=45.30ms, min=23ms, max=120ms, count=150
InvoiceService.getById: avg=12.50ms, min=5ms, max=45ms, count=500
```

### Example 3: Automatic Retry on Failure

```java
@Aspect
@Component
public class RetryAspect {

    @Around("@annotation(com.example.annotation.Retry)")
    public Object retry(ProceedingJoinPoint joinPoint) throws Throwable {
        int maxAttempts = 3;
        int attempt = 1;

        while (attempt <= maxAttempts) {
            try {
                return joinPoint.proceed();

            } catch (Exception e) {
                if (attempt == maxAttempts) {
                    System.err.println("Failed after " + maxAttempts + " attempts");
                    throw e;
                }

                System.out.println("Attempt " + attempt + " failed, retrying...");
                attempt++;

                // Wait before retry (exponential backoff)
                Thread.sleep((long) Math.pow(2, attempt) * 100);
            }
        }

        throw new RuntimeException("Should not reach here");
    }
}

// Usage
@Service
public class ExternalApiService {

    @Retry
    public String callExternalApi() {
        // Might fail temporarily
        return restTemplate.getForObject("https://api.example.com/data", String.class);
    }
}
```

### Example 4: Security Authorization

```java
@Aspect
@Component
public class SecurityAspect {

    @Before("@annotation(secured)")
    public void checkAuthorization(JoinPoint joinPoint, Secured secured) {
        String requiredRole = secured.value();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(requiredRole))) {

            throw new AccessDeniedException(
                "User does not have required role: " + requiredRole);
        }
    }
}

// Usage
@Service
public class InvoiceService {

    @Secured("ROLE_ADMIN")
    public void deleteAllInvoices() {
        // Only admins can call this
    }
}
```

---

## Self-Check Questions

> Answer from memory before looking back

1. **What** is the difference between @Before and @Around advice?
2. **Why** would you use AOP instead of adding logic directly to methods?
3. **When** would you use @AfterReturning vs @After?
4. **How** do you create a pointcut that matches all service methods?
5. **Compare**: @Around vs other advice types - what makes @Around special?

---

## Practice Exercises

### Standalone Exercises

**Level 1 - Basic Logging**:
Create an aspect that logs the method name and parameters for all repository methods.

**Level 2 - Exception Handling**:
Create an aspect that catches all exceptions from service methods and logs them with a timestamp.

**Level 3 - Caching**:
Create an @Around aspect that caches method results based on parameters. If same parameters are used, return cached result.

---

### Build-Along Project: InvoiceManager App

> **Goal**: Add logging, performance monitoring, and auditing to InvoiceManager

**Step 1: Create Logging Aspect**

```java
@Aspect
@Component
@Slf4j
public class LoggingAspect {

    @Before("execution(* com.example.invoicemanager.service.*.*(..))")
    public void logMethodEntry(JoinPoint joinPoint) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        log.info("→ {}.{}() called with args: {}",
                className, methodName, Arrays.toString(args));
    }

    @AfterReturning(
        pointcut = "execution(* com.example.invoicemanager.service.*.*(..))",
        returning = "result"
    )
    public void logMethodExit(JoinPoint joinPoint, Object result) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();

        if (result != null) {
            log.info("← {}.{}() returned: {}",
                    className, methodName, result.toString());
        } else {
            log.info("← {}.{}() returned: void", className, methodName);
        }
    }

    @AfterThrowing(
        pointcut = "execution(* com.example.invoicemanager.service.*.*(..))",
        throwing = "exception"
    )
    public void logException(JoinPoint joinPoint, Exception exception) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String methodName = joinPoint.getSignature().getName();

        log.error("✗ {}.{}() threw exception: {}",
                className, methodName, exception.getMessage());
    }
}
```

**Step 2: Create Performance Monitoring Aspect**

```java
@Aspect
@Component
@Slf4j
public class PerformanceAspect {

    @Around("execution(* com.example.invoicemanager.service.*.*(..))")
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();

        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            if (duration > 1000) {
                log.warn("⚠️  SLOW: {} took {}ms", methodName, duration);
            } else {
                log.debug("⏱️  {} took {}ms", methodName, duration);
            }

            return result;

        } catch (Throwable throwable) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("❌ {} failed after {}ms", methodName, duration);
            throw throwable;
        }
    }
}
```

**Step 3: Create Custom @Audited Annotation**

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String action();
}
```

**Step 4: Create Audit Aspect**

```java
@Aspect
@Component
@Slf4j
public class AuditAspect {

    private final List<AuditEntry> auditLog = new CopyOnWriteArrayList<>();

    @AfterReturning(
        pointcut = "@annotation(audited)",
        returning = "result"
    )
    public void auditAction(JoinPoint joinPoint, Audited audited, Object result) {
        String action = audited.action();
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        AuditEntry entry = new AuditEntry(
            LocalDateTime.now(),
            action,
            methodName,
            Arrays.toString(args),
            result != null ? result.toString() : "void"
        );

        auditLog.add(entry);

        log.info("📝 AUDIT: {} - {} - Args: {} - Result: {}",
                action, methodName, entry.getArgs(), entry.getResult());
    }

    public List<AuditEntry> getAuditLog() {
        return new ArrayList<>(auditLog);
    }

    @PreDestroy
    public void printAuditSummary() {
        log.info("\n=== Audit Summary ===");
        log.info("Total audited actions: {}", auditLog.size());

        Map<String, Long> actionCounts = auditLog.stream()
            .collect(Collectors.groupingBy(AuditEntry::getAction, Collectors.counting()));

        actionCounts.forEach((action, count) ->
            log.info("{}: {} times", action, count));
    }
}

@Data
@AllArgsConstructor
class AuditEntry {
    private LocalDateTime timestamp;
    private String action;
    private String method;
    private String args;
    private String result;
}
```

**Step 5: Apply @Audited to Service Methods**

```java
@Service
public class InvoiceService {
    // ... existing fields ...

    @Audited(action = "CREATE_INVOICE")
    public Invoice createInvoice(String customerId, List<InvoiceLineItem> items) {
        // Existing logic...
    }

    @Audited(action = "GENERATE_PDF")
    public byte[] generateInvoicePDF(String invoiceId) {
        // Existing logic...
    }

    @Audited(action = "DELETE_INVOICE")
    public void deleteInvoice(String invoiceId) {
        invoiceRepository.findById(invoiceId)
            .ifPresent(invoice -> {
                invoiceRepository.delete(invoice);
                log.info("Invoice deleted: {}", invoiceId);
            });
    }
}
```

**Step 6: Create Exception Handling Aspect**

```java
@Aspect
@Component
@Slf4j
public class ExceptionHandlingAspect {

    @AfterThrowing(
        pointcut = "execution(* com.example.invoicemanager.service.*.*(..))",
        throwing = "exception"
    )
    public void handleException(JoinPoint joinPoint, Exception exception) {
        String methodName = joinPoint.getSignature().toShortString();
        String errorMessage = exception.getMessage();

        // Log the error
        log.error("💥 Exception in {}: {}", methodName, errorMessage, exception);

        // Could also:
        // - Send email alert
        // - Increment error counter in metrics
        // - Create support ticket for critical errors

        if (exception instanceof IllegalArgumentException) {
            log.warn("⚠️  Validation error - user input issue");
        } else if (exception instanceof RuntimeException) {
            log.error("🚨 System error - requires investigation");
        }
    }
}
```

**Step 7: Test All Aspects**

```java
@SpringBootApplication
public class InvoiceManagerApp implements CommandLineRunner {

    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;
    private final AuditAspect auditAspect;

    // Constructor injection...

    @Override
    public void run(String... args) {
        log.info("=== Testing AOP Aspects ===\n");

        try {
            // Get customer (triggers logging aspect)
            Customer customer = customerRepository.findAll().get(0);

            // Create invoice (triggers logging, performance, and audit aspects)
            List<InvoiceLineItem> items = Arrays.asList(
                new InvoiceLineItem(new Product("P001", "Laptop", 1000.0), 1),
                new InvoiceLineItem(new Product("P002", "Mouse", 25.0), 2)
            );

            Invoice invoice = invoiceService.createInvoice(customer.getId(), items);
            log.info("Invoice created: {}\n", invoice.getId());

            // Generate PDF (triggers all aspects)
            byte[] pdf = invoiceService.generateInvoicePDF(invoice.getId());
            log.info("PDF generated: {} bytes\n", pdf.length);

            // Trigger exception (triggers exception handling aspect)
            try {
                invoiceService.createInvoice("INVALID_ID", items);
            } catch (Exception e) {
                log.info("Expected exception caught\n");
            }

            // Show audit log
            log.info("=== Audit Log ===");
            auditAspect.getAuditLog().forEach(entry ->
                log.info("{} - {} - {}", entry.getTimestamp(), entry.getAction(), entry.getMethod())
            );

        } catch (Exception e) {
            log.error("Error in application", e);
        }
    }
}
```

**Expected Output**:
```
=== Testing AOP Aspects ===

→ InvoiceService.createInvoice() called with args: [C123, [LineItem@1, LineItem@2]]
⏱️  InvoiceService.createInvoice() took 45ms
📝 AUDIT: CREATE_INVOICE - createInvoice - Args: [C123, ...] - Result: Invoice@456
← InvoiceService.createInvoice() returned: Invoice@456
Invoice created: INV-001

→ InvoiceService.generateInvoicePDF() called with args: [INV-001]
⏱️  InvoiceService.generateInvoicePDF() took 12ms
📝 AUDIT: GENERATE_PDF - generateInvoicePDF - Args: [INV-001] - Result: [B@789
← InvoiceService.generateInvoicePDF() returned: [B@789
PDF generated: 245 bytes

→ InvoiceService.createInvoice() called with args: [INVALID_ID, ...]
💥 Exception in InvoiceService.createInvoice(): Customer not found: INVALID_ID
✗ InvoiceService.createInvoice() threw exception: Customer not found: INVALID_ID

=== Audit Log ===
2024-01-15T10:30:45 - CREATE_INVOICE - createInvoice
2024-01-15T10:30:45 - GENERATE_PDF - generateInvoicePDF

=== Audit Summary ===
Total audited actions: 2
CREATE_INVOICE: 1 times
GENERATE_PDF: 1 times
```

**Checkpoint**: By now, your app should:
- ✅ Log all service method calls with parameters
- ✅ Measure and log execution time
- ✅ Audit specific actions (create, delete, generate PDF)
- ✅ Handle exceptions centrally
- ✅ Provide performance statistics

**Business logic remains clean** - no logging/auditing code in service classes!

---

## Common Mistakes

❌ **Mistake 1**: Forgetting to call proceed() in @Around
```java
@Around("execution(* *.*(..))")
public Object myAdvice(ProceedingJoinPoint joinPoint) {
    // Do something
    return null;  // ❌ Never calls actual method!
}
```
✅ **Instead**: Always call proceed()
```java
@Around("execution(* *.*(..))")
public Object myAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
    // Before
    Object result = joinPoint.proceed();  // ✅ Call actual method
    // After
    return result;
}
```

❌ **Mistake 2**: Too broad pointcut
```java
@Before("execution(* *.*(..))")  // Matches EVERYTHING!
public void log() {
    // Will slow down entire application
}
```
✅ **Instead**: Be specific
```java
@Before("execution(* com.example.service.*.*(..))")  // Only service layer
public void log() { }
```

❌ **Mistake 3**: Not handling exceptions in @Around
```java
@Around("execution(* *.*(..))")
public Object myAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
    // What if proceed() throws exception?
    return joinPoint.proceed();  // Exception propagates, but you might want to handle it
}
```
✅ **Instead**: Handle exceptions if needed
```java
@Around("execution(* *.*(..))")
public Object myAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
    try {
        return joinPoint.proceed();
    } catch (Exception e) {
        // Log, handle, or rethrow
        log.error("Error", e);
        throw e;
    }
}
```

---

## Interview Questions

### Knowledge Questions
1. "What is AOP?" → Separating cross-cutting concerns from business logic
2. "Name types of advice" → @Before, @After, @AfterReturning, @AfterThrowing, @Around
3. "What's a pointcut?" → Expression selecting where advice applies
4. "How does @Transactional work?" → AOP! Spring wraps method with transaction management

### Scenario Questions
1. "You need to log all service method calls. How?"
   → Answer: Create aspect with @Before advice on service layer pointcut

2. "You want to retry failed API calls. Which advice?"
   → Answer: @Around - you control when/if to call proceed()

3. "How to add security checks without modifying code?"
   → Answer: Create aspect with @Before advice checking authentication

### Debugging Questions
```java
@Around("execution(* com.example..*(..))")
public Object log(ProceedingJoinPoint joinPoint) {
    System.out.println("Calling: " + joinPoint.getSignature());
    // Oops, forgot to return!
}
```
What's wrong? → Missing `return joinPoint.proceed()` and throws declaration

---

---

## Summary

**In 3 sentences**:
- AOP separates cross-cutting concerns (logging, security, transactions) from business logic, keeping code clean and focused.
- Aspects define what to do (advice), where to do it (pointcut), and when to do it (@Before, @After, @Around, etc.).
- Spring uses runtime proxies to weave aspects into target objects, enabling features like @Transactional without modifying your code.

**Key takeaway**: **AOP = Don't repeat yourself across classes** - centralize cross-cutting concerns in aspects instead of scattering them throughout your codebase.

---

## Navigation

**Prerequisites:**
- [IoC & Dependency Injection](./01-ioc-and-di.md) - AOP works with Spring-managed beans
- [Bean Lifecycle & Scopes](./02-bean-lifecycle-scopes.md) - Understanding bean proxies
- [Configuration Approaches](./03-configuration.md) - Enable AOP with @EnableAspectJAutoProxy

**Next Topics:**
- [Best Practices & Patterns](./05-best-practices.md) - When to use AOP and common pitfalls

**Related:**
- [Spring Security Method Security](../../spring-security/02-authorization.md) - Uses AOP for @PreAuthorize, @Secured
- [Spring Boot Actuator](../../spring-boot/04-actuator-monitoring.md) - Custom metrics using AOP
- [Spring Data Transactions](../../spring-data/README.md) - @Transactional uses AOP

**Real-World Examples:**
- `@Transactional` - Transaction management
- `@Cacheable` - Caching
- `@Secured` / `@PreAuthorize` - Security
- `@Async` - Async execution

**Module Index:** [Spring Core Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
