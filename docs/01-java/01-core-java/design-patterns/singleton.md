# Singleton Design Pattern

> **Before you start**: Do you understand Java classes and static members? If you can create a class and use `static` keyword, you're ready!

---

## What is the Singleton Pattern?

The **Singleton Pattern** ensures that a class has **only ONE instance** throughout the entire application, and provides a global point of access to that instance.

### The Simplest Explanation

**Normal class**: Every time you call `new`, you get a new object.
```java
Calculator calc1 = new Calculator();  // Object 1
Calculator calc2 = new Calculator();  // Object 2
Calculator calc3 = new Calculator();  // Object 3
// Three separate objects
```

**Singleton class**: No matter how many times you ask for it, you always get the same object.
```java
DatabaseConnection conn1 = DatabaseConnection.getInstance();  // Object 1
DatabaseConnection conn2 = DatabaseConnection.getInstance();  // Same object 1
DatabaseConnection conn3 = DatabaseConnection.getInstance();  // Same object 1
// All three variables point to the SAME object
```

---

## Why This Matters

### Real-World Analogy

**President of a Country**:
- There's only ONE president at a time
- Everyone in the country refers to the same president
- You can't create multiple presidents simultaneously
- This is a Singleton!

**Database Connection Pool**:
- Expensive to create
- Should be shared across application
- Only one instance needed
- Perfect use case for Singleton

---

## When to Use Singleton

Use Singleton when:
- ✅ You need exactly ONE instance (e.g., configuration, logger, thread pool)
- ✅ The instance is expensive to create (e.g., database connection)
- ✅ The instance is shared across the application
- ✅ The instance has no mutable state (stateless or carefully synchronized)

**Common Use Cases**:
- Logger
- Configuration manager
- Database connection pool
- Cache
- Thread pool
- Device drivers (printer, file system)

---

## How to Implement Singleton

### Implementation 1: Eager Initialization (Simplest)

```java
public class DatabaseConnection {
    // Create instance at class loading time
    private static final DatabaseConnection instance = new DatabaseConnection();

    // Private constructor - prevent outside instantiation
    private DatabaseConnection() {
        System.out.println("Database connection created!");
    }

    // Public method to get the instance
    public static DatabaseConnection getInstance() {
        return instance;
    }

    // Business methods
    public void connect() {
        System.out.println("Connected to database");
    }

    public void disconnect() {
        System.out.println("Disconnected from database");
    }
}
```

**Usage**:
```java
public class Main {
    public static void main(String[] args) {
        // Get the singleton instance
        DatabaseConnection conn1 = DatabaseConnection.getInstance();
        DatabaseConnection conn2 = DatabaseConnection.getInstance();
        DatabaseConnection conn3 = DatabaseConnection.getInstance();

        // All reference the same object
        System.out.println(conn1 == conn2);  // true
        System.out.println(conn2 == conn3);  // true

        // Use it
        conn1.connect();

        // This won't compile - constructor is private
        // DatabaseConnection conn = new DatabaseConnection();  // ERROR!
    }
}
```

**Output**:
```
Database connection created!
true
true
Connected to database
```

**Pros**:
- ✅ Simple and thread-safe
- ✅ Instance created at class loading (JVM guarantees thread safety)

**Cons**:
- ❌ Instance created even if never used (wastes memory)
- ❌ No exception handling during initialization

---

### Implementation 2: Lazy Initialization (Create When Needed)

```java
public class Logger {
    private static Logger instance;

    private Logger() {
        System.out.println("Logger initialized");
    }

    // Create instance only when first requested
    public static Logger getInstance() {
        if (instance == null) {
            instance = new Logger();
        }
        return instance;
    }

    public void log(String message) {
        System.out.println("[LOG] " + message);
    }
}
```

**Usage**:
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Application started");

        // Logger not created yet
        System.out.println("Doing work...");

        // Now logger is created (lazy)
        Logger logger = Logger.getInstance();
        logger.log("First message");

        // Same instance
        Logger logger2 = Logger.getInstance();
        logger2.log("Second message");
    }
}
```

**Output**:
```
Application started
Doing work...
Logger initialized
[LOG] First message
[LOG] Second message
```

**Pros**:
- ✅ Instance created only when needed (saves memory)

**Cons**:
- ❌ NOT thread-safe! Two threads might create two instances

**Problem with threads**:
```java
// Thread 1 calls getInstance()
if (instance == null) {        // Thread 1: instance is null
    // Thread 2 also calls getInstance() HERE
    if (instance == null) {    // Thread 2: instance is still null!
        instance = new Logger();   // Thread 2 creates instance
    }
    instance = new Logger();   // Thread 1 also creates instance
}
// Now we have TWO instances! Singleton broken!
```

---

### Implementation 3: Thread-Safe Lazy Initialization

```java
public class ConfigurationManager {
    private static ConfigurationManager instance;

    private ConfigurationManager() {
        System.out.println("Loading configuration...");
        // Expensive initialization
    }

    // Synchronized method - thread-safe
    public static synchronized ConfigurationManager getInstance() {
        if (instance == null) {
            instance = new ConfigurationManager();
        }
        return instance;
    }

    public String getProperty(String key) {
        return "Value for " + key;
    }
}
```

**Pros**:
- ✅ Thread-safe
- ✅ Lazy initialization

**Cons**:
- ❌ Synchronized method = slow (every call locks)
- ❌ Performance impact even after instance is created

---

### Implementation 4: Double-Checked Locking (Best Performance)

```java
public class CacheManager {
    // volatile ensures visibility across threads
    private static volatile CacheManager instance;

    private CacheManager() {
        System.out.println("Cache initialized");
    }

    public static CacheManager getInstance() {
        // First check (no locking) - fast
        if (instance == null) {
            // Only synchronize if instance is null
            synchronized (CacheManager.class) {
                // Second check (with locking) - safe
                if (instance == null) {
                    instance = new CacheManager();
                }
            }
        }
        return instance;
    }

    public void put(String key, Object value) {
        System.out.println("Cached: " + key);
    }

    public Object get(String key) {
        return "Value for " + key;
    }
}
```

**Pros**:
- ✅ Thread-safe
- ✅ Lazy initialization
- ✅ Good performance (synchronized only when needed)

**Cons**:
- ❌ More complex code
- ❌ Requires `volatile` keyword (Java 5+)

---

### Implementation 5: Bill Pugh Singleton (Recommended)

Uses **static inner class** for lazy initialization with thread safety.

```java
public class ThreadPool {

    private ThreadPool() {
        System.out.println("Thread pool created");
    }

    // Static inner class - loaded only when getInstance() is called
    private static class SingletonHelper {
        private static final ThreadPool INSTANCE = new ThreadPool();
    }

    public static ThreadPool getInstance() {
        return SingletonHelper.INSTANCE;
    }

    public void executeTask(Runnable task) {
        System.out.println("Executing task");
        task.run();
    }
}
```

**Why this is best**:
- ✅ Thread-safe (JVM guarantees)
- ✅ Lazy initialization (inner class loaded only when needed)
- ✅ No synchronization overhead
- ✅ Simple and clean code

**Usage**:
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("App started");

        // Thread pool not created yet (lazy)

        ThreadPool pool = ThreadPool.getInstance();
        // Now thread pool is created

        pool.executeTask(() -> System.out.println("Task 1"));

        ThreadPool pool2 = ThreadPool.getInstance();
        System.out.println(pool == pool2);  // true
    }
}
```

**Output**:
```
App started
Thread pool created
Executing task
Task 1
true
```

---

### Implementation 6: Enum Singleton (Most Secure)

The **best way** to create a singleton that prevents:
- Reflection attacks
- Serialization issues
- Thread safety problems

```java
public enum DatabaseManager {
    INSTANCE;  // The singleton instance

    // You can add fields
    private Connection connection;

    // Constructor
    DatabaseManager() {
        System.out.println("Database manager initialized");
        // Initialize connection
    }

    // Methods
    public void connect() {
        System.out.println("Connecting to database...");
    }

    public void query(String sql) {
        System.out.println("Executing: " + sql);
    }
}
```

**Usage**:
```java
public class Main {
    public static void main(String[] args) {
        // Get the singleton instance
        DatabaseManager db = DatabaseManager.INSTANCE;
        db.connect();
        db.query("SELECT * FROM users");

        // Same instance
        DatabaseManager db2 = DatabaseManager.INSTANCE;
        System.out.println(db == db2);  // true
    }
}
```

**Why Enum is best**:
- ✅ Thread-safe automatically
- ✅ Prevents reflection attacks
- ✅ Serialization safe
- ✅ Simplest code
- ✅ Recommended by Joshua Bloch (Effective Java)

---

## Comparison of All Implementations

| Implementation | Thread-Safe | Lazy | Performance | Complexity | Recommended |
|---------------|------------|------|-------------|------------|-------------|
| Eager | ✅ Yes | ❌ No | Excellent | Simple | Good for small objects |
| Lazy | ❌ No | ✅ Yes | Excellent | Simple | ❌ Never use |
| Synchronized | ✅ Yes | ✅ Yes | Poor | Simple | ❌ Avoid |
| Double-Checked | ✅ Yes | ✅ Yes | Good | Complex | Okay |
| Bill Pugh | ✅ Yes | ✅ Yes | Excellent | Medium | ✅ **Best for most cases** |
| Enum | ✅ Yes | ❌ No | Excellent | Simple | ✅ **Best for security** |

---

## Complete Real-World Example

### Application Configuration Manager

```java
/**
 * Singleton configuration manager
 * Uses Bill Pugh implementation for thread-safety and lazy loading
 */
public class AppConfig {

    private final Properties properties;

    // Private constructor
    private AppConfig() {
        System.out.println("Loading application configuration...");
        properties = new Properties();
        loadConfiguration();
    }

    // Static inner class for singleton
    private static class SingletonHelper {
        private static final AppConfig INSTANCE = new AppConfig();
    }

    // Public method to get instance
    public static AppConfig getInstance() {
        return SingletonHelper.INSTANCE;
    }

    private void loadConfiguration() {
        // Load from file, environment, etc.
        properties.setProperty("app.name", "InvoiceManager");
        properties.setProperty("app.version", "1.0.0");
        properties.setProperty("db.url", "jdbc:postgresql://localhost:5432/invoices");
        properties.setProperty("db.pool.size", "10");
        System.out.println("Configuration loaded successfully");
    }

    public String getProperty(String key) {
        return properties.getProperty(key);
    }

    public String getProperty(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    public int getIntProperty(String key, int defaultValue) {
        String value = properties.getProperty(key);
        try {
            return value != null ? Integer.parseInt(value) : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public void setProperty(String key, String value) {
        properties.setProperty(key, value);
    }

    public void displayConfiguration() {
        System.out.println("\n=== Application Configuration ===");
        properties.forEach((key, value) ->
            System.out.println(key + " = " + value));
        System.out.println("================================\n");
    }
}
```

**Usage in Application**:
```java
public class InvoiceService {
    private final AppConfig config;

    public InvoiceService() {
        // Get singleton configuration
        this.config = AppConfig.getInstance();
    }

    public void createInvoice() {
        String appName = config.getProperty("app.name");
        System.out.println("Creating invoice in " + appName);

        int poolSize = config.getIntProperty("db.pool.size", 5);
        System.out.println("Using connection pool size: " + poolSize);
    }
}

public class ReportService {
    private final AppConfig config;

    public ReportService() {
        // Same singleton instance
        this.config = AppConfig.getInstance();
    }

    public void generateReport() {
        String version = config.getProperty("app.version");
        System.out.println("Generating report (v" + version + ")");
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println("Starting application...\n");

        // Configuration loaded only once
        InvoiceService invoiceService = new InvoiceService();
        ReportService reportService = new ReportService();

        // Display configuration
        AppConfig.getInstance().displayConfiguration();

        // Use services
        invoiceService.createInvoice();
        reportService.generateReport();

        // Verify singleton
        AppConfig config1 = AppConfig.getInstance();
        AppConfig config2 = AppConfig.getInstance();
        System.out.println("\nSame instance? " + (config1 == config2));
    }
}
```

**Output**:
```
Starting application...

Loading application configuration...
Configuration loaded successfully

=== Application Configuration ===
app.name = InvoiceManager
app.version = 1.0.0
db.url = jdbc:postgresql://localhost:5432/invoices
db.pool.size = 10
================================

Creating invoice in InvoiceManager
Using connection pool size: 10
Generating report (v1.0.0)

Same instance? true
```

---

## Common Pitfalls and How to Avoid Them

### ❌ Pitfall 1: Breaking Singleton with Reflection

```java
public class Main {
    public static void main(String[] args) throws Exception {
        // Normal way - works
        AppConfig instance1 = AppConfig.getInstance();

        // Using reflection - breaks singleton!
        Constructor<AppConfig> constructor = AppConfig.class.getDeclaredConstructor();
        constructor.setAccessible(true);  // Bypass private constructor
        AppConfig instance2 = constructor.newInstance();

        System.out.println(instance1 == instance2);  // false - broken!
    }
}
```

**Solution**: Use Enum singleton (cannot be broken by reflection)
```java
public enum AppConfig {
    INSTANCE;

    public void configure() {
        // Configuration logic
    }
}
```

---

### ❌ Pitfall 2: Breaking Singleton with Serialization

```java
public class Config implements Serializable {
    private static Config instance = new Config();

    private Config() {}

    public static Config getInstance() {
        return instance;
    }
}

// Using serialization
Config instance1 = Config.getInstance();

// Serialize
ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("config.ser"));
out.writeObject(instance1);
out.close();

// Deserialize
ObjectInputStream in = new ObjectInputStream(new FileInputStream("config.ser"));
Config instance2 = (Config) in.readObject();
in.close();

System.out.println(instance1 == instance2);  // false - broken!
```

**Solution**: Implement `readResolve()` method
```java
public class Config implements Serializable {
    private static Config instance = new Config();

    private Config() {}

    public static Config getInstance() {
        return instance;
    }

    // This method is called during deserialization
    protected Object readResolve() {
        return getInstance();  // Return the singleton instance
    }
}
```

---

### ❌ Pitfall 3: Singleton with Mutable State in Multi-threaded Environment

```java
public class Counter {
    private static Counter instance = new Counter();
    private int count = 0;  // Mutable state - DANGER!

    private Counter() {}

    public static Counter getInstance() {
        return instance;
    }

    // Not synchronized - race condition!
    public void increment() {
        count++;
    }

    public int getCount() {
        return count;
    }
}

// Multiple threads incrementing
Thread t1 = new Thread(() -> {
    for (int i = 0; i < 1000; i++) {
        Counter.getInstance().increment();
    }
});

Thread t2 = new Thread(() -> {
    for (int i = 0; i < 1000; i++) {
        Counter.getInstance().increment();
    }
});

t1.start();
t2.start();
t1.join();
t2.join();

System.out.println(Counter.getInstance().getCount());  // Not 2000! Race condition!
```

**Solution**: Synchronize mutable operations
```java
public class Counter {
    private static Counter instance = new Counter();
    private int count = 0;

    private Counter() {}

    public static Counter getInstance() {
        return instance;
    }

    // Synchronized method
    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

**Better Solution**: Use AtomicInteger for thread-safe counter
```java
public class Counter {
    private static Counter instance = new Counter();
    private AtomicInteger count = new AtomicInteger(0);

    private Counter() {}

    public static Counter getInstance() {
        return instance;
    }

    public void increment() {
        count.incrementAndGet();  // Thread-safe
    }

    public int getCount() {
        return count.get();
    }
}
```

---

## Singleton vs Static Class

### When to use Static Class?

```java
// Utility class - all methods static
public class MathUtils {
    // Private constructor to prevent instantiation
    private MathUtils() {}

    public static int add(int a, int b) {
        return a + b;
    }

    public static int multiply(int a, int b) {
        return a * b;
    }
}

// Usage
int result = MathUtils.add(5, 3);
```

**Use Static Class when**:
- ✅ No state needed (pure utility functions)
- ✅ No inheritance needed
- ✅ Simple helper methods
- ✅ Examples: Math utilities, String utilities

**Use Singleton when**:
- ✅ You need to maintain state
- ✅ You need inheritance/polymorphism
- ✅ You need lazy initialization
- ✅ You need to manage resources (connections, files)
- ✅ Examples: Configuration, Logger, Connection Pool

---

## Interview Questions

### Q1: What is the Singleton pattern?
**Answer**: A design pattern that ensures a class has only one instance throughout the application and provides a global point of access to it.

### Q2: How do you make a class Singleton?
**Answer**:
1. Make constructor private
2. Create a static method to get the instance
3. Store the instance in a static variable

### Q3: Which is the best way to implement Singleton in Java?
**Answer**:
- **Bill Pugh (static inner class)**: Best for most cases - lazy, thread-safe, performant
- **Enum**: Best for security - prevents reflection and serialization attacks

### Q4: Is Singleton thread-safe?
**Answer**: Depends on implementation:
- Eager initialization: Yes (created at class loading)
- Lazy without synchronization: No
- Synchronized method: Yes (but slow)
- Double-checked locking: Yes (with volatile)
- Bill Pugh: Yes (JVM guarantees)
- Enum: Yes (JVM guarantees)

### Q5: How can Singleton be broken?
**Answer**:
1. **Reflection**: Can access private constructor
2. **Serialization**: Deserialization creates new instance
3. **Cloning**: If Cloneable is implemented
4. **Multiple ClassLoaders**: Each ClassLoader has its own singleton

**Solutions**:
- Use Enum (prevents reflection and serialization)
- Implement readResolve() for serialization
- Don't implement Cloneable
- Be aware of ClassLoader issues in complex environments

### Q6: What are the disadvantages of Singleton?
**Answer**:
1. ❌ Global state (hard to test)
2. ❌ Hidden dependencies (not clear from constructor)
3. ❌ Difficult to subclass
4. ❌ Can cause tight coupling
5. ❌ Violates Single Responsibility Principle (manages instance + business logic)

### Q7: Singleton vs Static Class?
**Answer**:
- **Static Class**: No state, no inheritance, pure utility functions
- **Singleton**: Can have state, supports inheritance, manages resources

---

## Best Practices

### ✅ DO: Use Bill Pugh or Enum

```java
// Best for most cases
public class ConfigManager {
    private ConfigManager() {}

    private static class SingletonHelper {
        private static final ConfigManager INSTANCE = new ConfigManager();
    }

    public static ConfigManager getInstance() {
        return SingletonHelper.INSTANCE;
    }
}

// Best for security
public enum ConfigManager {
    INSTANCE;

    public void configure() { }
}
```

### ✅ DO: Keep Singleton Stateless When Possible

```java
// Good - no mutable state
public class Logger {
    private Logger() {}

    private static class SingletonHelper {
        private static final Logger INSTANCE = new Logger();
    }

    public static Logger getInstance() {
        return SingletonHelper.INSTANCE;
    }

    public void log(String message) {
        System.out.println("[" + Instant.now() + "] " + message);
    }
}
```

### ❌ DON'T: Make Everything a Singleton

```java
// Bad - overusing singleton
public class UserService {
    private static UserService instance = new UserService();
    // This doesn't need to be a singleton!
}

// Good - regular class with dependency injection
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```

---

## Connection to Spring Framework

In Spring Framework, most beans are **singletons by default**!

```java
@Service  // This is a singleton bean
public class InvoiceService {
    // Spring creates only ONE instance
    // Shared across entire application
}
```

Spring manages the singleton pattern for you, so you don't need to implement it manually. This is one reason Spring is so powerful!

**Next**: Learn about [Spring Beans](../../02-spring-ecosystem/spring-core/00-what-is-a-bean.md) to see how Spring uses the Singleton pattern.

---

## Summary

**In 3 sentences**:
- Singleton pattern ensures only one instance of a class exists, providing a global access point.
- Best implementations are Bill Pugh (static inner class) for most cases, or Enum for maximum security.
- Use singleton sparingly for truly shared resources like configuration, logging, or connection pools - don't make every class a singleton!

**Key Takeaway**: **One instance, globally accessible** - like having one president, one configuration file, or one connection pool for the entire application.

---

## Practice Exercise

Create a Singleton `CacheManager` with these requirements:
1. Thread-safe implementation
2. Methods: `put(key, value)`, `get(key)`, `remove(key)`, `clear()`
3. Use Map to store data
4. Add statistics: `getSize()`, `getHitCount()`, `getMissCount()`
5. Test with multiple threads

<details>
<summary>Solution</summary>

```java
public class CacheManager {
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final AtomicInteger hitCount = new AtomicInteger(0);
    private final AtomicInteger missCount = new AtomicInteger(0);

    private CacheManager() {}

    private static class SingletonHelper {
        private static final CacheManager INSTANCE = new CacheManager();
    }

    public static CacheManager getInstance() {
        return SingletonHelper.INSTANCE;
    }

    public void put(String key, Object value) {
        cache.put(key, value);
    }

    public Object get(String key) {
        Object value = cache.get(key);
        if (value != null) {
            hitCount.incrementAndGet();
        } else {
            missCount.incrementAndGet();
        }
        return value;
    }

    public void remove(String key) {
        cache.remove(key);
    }

    public void clear() {
        cache.clear();
        hitCount.set(0);
        missCount.set(0);
    }

    public int getSize() {
        return cache.size();
    }

    public int getHitCount() {
        return hitCount.get();
    }

    public int getMissCount() {
        return missCount.get();
    }

    public void printStats() {
        System.out.println("Cache Statistics:");
        System.out.println("Size: " + getSize());
        System.out.println("Hits: " + getHitCount());
        System.out.println("Misses: " + getMissCount());
    }
}
```
</details>

---

**Related Patterns**:
- [Factory Pattern](./factory.md) - Creates objects
- [Builder Pattern](./builder.md) - Constructs complex objects
- [Prototype Pattern](./prototype.md) - Clones objects

**Module Index:** [Design Patterns](./README.md) | **Main Index:** [Learning Roadmap](../../README.md)
