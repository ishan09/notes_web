# Java Annotations

## Table of Contents
1. [Introduction](#introduction)
2. [Built-in Annotations](#built-in-annotations)
3. [Meta-Annotations](#meta-annotations)
4. [Custom Annotations](#custom-annotations)
5. [Annotation Processing](#annotation-processing)
6. [Common Use Cases](#common-use-cases)

---

## Introduction

**Annotations** are a form of metadata that provide data about a program but are not part of the program itself. They have no direct effect on the operation of the code they annotate.

### Key Characteristics
- Introduced in Java 5
- Begin with `@` symbol
- Can be applied to classes, methods, fields, parameters, packages, and other annotations
- Can include elements (parameters)
- Processed at compile-time, load-time, or runtime via reflection

### Syntax
```java
@AnnotationName
@AnnotationName(element = "value")
@AnnotationName(element1 = "value1", element2 = "value2")
```

---

## Built-in Annotations

### 1. @Override
Indicates that a method overrides a method in a superclass.

```java
public class Parent {
    public void display() {
        System.out.println("Parent");
    }
}

public class Child extends Parent {
    @Override
    public void display() {
        System.out.println("Child");
    }
}
```

**Benefits:**
- Compile-time checking
- Prevents errors from typos or signature mismatches
- Improves code readability

---

### 2. @Deprecated
Marks a program element as deprecated, warning users not to use it.

```java
public class MyClass {
    @Deprecated
    public void oldMethod() {
        System.out.println("This method is deprecated");
    }

    @Deprecated(since = "9", forRemoval = true)
    public void legacyMethod() {
        System.out.println("Will be removed in future versions");
    }
}
```

**Elements (Java 9+):**
- `since`: Version when element was deprecated
- `forRemoval`: Whether element will be removed in future

---

### 3. @SuppressWarnings
Instructs the compiler to suppress specific warnings.

```java
public class WarningExample {
    @SuppressWarnings("unchecked")
    public void methodWithUncheckedWarning() {
        List list = new ArrayList();
        list.add("item");
    }

    @SuppressWarnings({"unchecked", "deprecation"})
    public void multipleWarnings() {
        // Code that generates multiple warnings
    }
}
```

**Common Values:**
- `"unchecked"`: Unchecked operations
- `"deprecation"`: Deprecated API usage
- `"rawtypes"`: Raw types usage
- `"unused"`: Unused variables
- `"all"`: All warnings

---

### 4. @FunctionalInterface (Java 8+)
Indicates that an interface is intended to be a functional interface (SAM - Single Abstract Method).

```java
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);

    // Default and static methods are allowed
    default void display() {
        System.out.println("Calculator interface");
    }
}

// Usage
Calculator add = (a, b) -> a + b;
Calculator multiply = (a, b) -> a * b;
```

---

### 5. @SafeVarargs (Java 7+)
Suppresses warnings about potentially unsafe operations on varargs parameters.

```java
public class VarargsExample {
    @SafeVarargs
    public final <T> void printAll(T... items) {
        for (T item : items) {
            System.out.println(item);
        }
    }
}
```

**Requirements:**
- Method must be `static`, `final`, or `private`
- Used with generic varargs parameters

---

## Meta-Annotations

Meta-annotations are annotations that apply to other annotations.

### 1. @Retention
Specifies how long annotations are retained.

```java
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
public @interface MyAnnotation {
    String value();
}
```

**Retention Policies:**
- `SOURCE`: Discarded by compiler (e.g., @Override)
- `CLASS`: Recorded in class file but not available at runtime (default)
- `RUNTIME`: Recorded in class file and available at runtime via reflection

---

### 2. @Target
Specifies where an annotation can be applied.

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.FIELD})
public @interface MyAnnotation {
    String value();
}
```

**Element Types:**
- `TYPE`: Class, interface, enum
- `FIELD`: Field
- `METHOD`: Method
- `PARAMETER`: Parameter
- `CONSTRUCTOR`: Constructor
- `LOCAL_VARIABLE`: Local variable
- `ANNOTATION_TYPE`: Annotation type
- `PACKAGE`: Package
- `TYPE_PARAMETER`: Type parameter (Java 8+)
- `TYPE_USE`: Any use of a type (Java 8+)

---

### 3. @Documented
Indicates that the annotation should be included in JavaDoc.

```java
import java.lang.annotation.Documented;

@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Important {
    String reason();
}
```

---

### 4. @Inherited
Indicates that an annotation type is automatically inherited by subclasses.

```java
import java.lang.annotation.Inherited;

@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DatabaseTable {
    String name();
}

@DatabaseTable(name = "users")
public class User {
}

// Child class inherits @DatabaseTable annotation
public class AdminUser extends User {
}
```

**Note:** Only works with class inheritance, not interface implementation.

---

### 5. @Repeatable (Java 8+)
Allows an annotation to be applied multiple times to the same element.

```java
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Repeatable(Schedules.class)
@Retention(RetentionPolicy.RUNTIME)
public @interface Schedule {
    String day();
    int hour();
}

@Retention(RetentionPolicy.RUNTIME)
public @interface Schedules {
    Schedule[] value();
}

// Usage
@Schedule(day = "Monday", hour = 10)
@Schedule(day = "Friday", hour = 14)
public class Task {
}
```

---

## Custom Annotations

### Creating Custom Annotations

```java
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Documented
public @interface Test {
    // Elements
    int priority() default 0;
    String description() default "";
    String[] tags() default {};
}
```

### Annotation Elements Rules
1. No parameters
2. No `throws` clause
3. Return types: primitives, String, Class, enum, annotations, or arrays of these
4. Can have default values
5. Cannot be `null`

### Example: Custom Validation Annotation

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface NotNull {
    String message() default "Field cannot be null";
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Range {
    int min() default 0;
    int max() default Integer.MAX_VALUE;
    String message() default "Value out of range";
}

// Usage
public class User {
    @NotNull(message = "Username is required")
    private String username;

    @Range(min = 18, max = 100, message = "Age must be between 18 and 100")
    private int age;
}
```

---

## Annotation Processing

### Runtime Processing with Reflection

```java
import java.lang.reflect.Method;

public class AnnotationProcessor {
    public static void processAnnotations(Class<?> clazz) {
        // Class-level annotations
        if (clazz.isAnnotationPresent(DatabaseTable.class)) {
            DatabaseTable table = clazz.getAnnotation(DatabaseTable.class);
            System.out.println("Table: " + table.name());
        }

        // Method-level annotations
        for (Method method : clazz.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Test.class)) {
                Test test = method.getAnnotation(Test.class);
                System.out.println("Test: " + method.getName());
                System.out.println("Priority: " + test.priority());
                System.out.println("Description: " + test.description());
            }
        }
    }
}
```

### Example: Simple Test Framework

```java
import java.lang.reflect.Method;

public class SimpleTestRunner {
    public static void runTests(Class<?> testClass) {
        int passed = 0;
        int failed = 0;

        for (Method method : testClass.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Test.class)) {
                try {
                    method.invoke(testClass.getDeclaredConstructor().newInstance());
                    passed++;
                    System.out.println("✓ " + method.getName() + " passed");
                } catch (Exception e) {
                    failed++;
                    System.out.println("✗ " + method.getName() + " failed: " + e.getCause());
                }
            }
        }

        System.out.println("\nResults: " + passed + " passed, " + failed + " failed");
    }
}

// Test class
public class CalculatorTest {
    @Test(priority = 1, description = "Test addition")
    public void testAdd() {
        assert 2 + 2 == 4 : "Addition failed";
    }

    @Test(priority = 2, description = "Test subtraction")
    public void testSubtract() {
        assert 5 - 3 == 2 : "Subtraction failed";
    }
}
```

### Compile-Time Processing (Annotation Processors)

```java
import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.TypeElement;
import java.util.Set;

@SupportedAnnotationTypes("com.example.Builder")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public class BuilderProcessor extends AbstractProcessor {

    @Override
    public boolean process(Set<? extends TypeElement> annotations,
                          RoundEnvironment roundEnv) {
        for (Element element : roundEnv.getElementsAnnotatedWith(Builder.class)) {
            // Generate builder class code
            String className = element.getSimpleName().toString();
            generateBuilderClass(className);
        }
        return true;
    }

    private void generateBuilderClass(String className) {
        // Code generation logic
    }
}
```

---

## Common Use Cases

### 1. ORM Mapping (JPA)

```java
import javax.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "email", length = 100)
    private String email;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Order> orders;
}
```

---

### 2. REST API (Spring)

```java
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public User createUser(@RequestBody @Valid User user) {
        return userService.save(user);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.update(id, user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

---

### 3. Validation (Bean Validation)

```java
import javax.validation.constraints.*;

public class UserDTO {
    @NotNull(message = "Username is required")
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    private String username;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @Min(value = 18, message = "Age must be at least 18")
    @Max(value = 120, message = "Age must be less than 120")
    private int age;

    @Pattern(regexp = "^\\d{10}$", message = "Phone must be 10 digits")
    private String phone;

    @Past(message = "Birth date must be in the past")
    private LocalDate birthDate;
}
```

---

### 4. Dependency Injection

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.stereotype.Repository;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
}
```

---

### 5. Testing (JUnit)

```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Calculator Tests")
public class CalculatorTest {

    private Calculator calculator;

    @BeforeEach
    public void setUp() {
        calculator = new Calculator();
    }

    @Test
    @DisplayName("Test addition of two numbers")
    public void testAdd() {
        assertEquals(5, calculator.add(2, 3));
    }

    @Test
    @Disabled("Not implemented yet")
    public void testDivision() {
        // Test code
    }

    @RepeatedTest(5)
    public void testRandom() {
        assertTrue(Math.random() >= 0);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5})
    public void testPositiveNumbers(int number) {
        assertTrue(number > 0);
    }
}
```

---

### 6. Concurrency

```java
import javax.annotation.concurrent.*;

@ThreadSafe
public class Counter {
    @GuardedBy("this")
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}

@Immutable
public final class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }
}
```

---

### 7. Serialization/JSON (Jackson)

```java
import com.fasterxml.jackson.annotation.*;
import java.util.Date;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class User {
    @JsonProperty("user_id")
    private Long id;

    @JsonProperty("user_name")
    private String username;

    @JsonIgnore
    private String password;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createdAt;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Order> orders;
}
```

---

## Best Practices

1. **Use Built-in Annotations**: Prefer standard annotations when available
2. **Document Custom Annotations**: Always document purpose and usage
3. **Keep Annotations Simple**: Avoid complex logic in annotation processors
4. **Use Appropriate Retention**: Choose the right retention policy
5. **Specify Target**: Always use @Target to limit where annotations can be applied
6. **Provide Defaults**: Give sensible default values for annotation elements
7. **Validate at Compile-Time**: Use annotation processors when possible
8. **Don't Overuse**: Annotations are metadata, not business logic
9. **Follow Naming Conventions**: Use clear, descriptive names
10. **Consider Performance**: Runtime reflection has overhead

---

## Common Pitfalls

1. **Forgetting @Retention**: Annotations default to CLASS retention
2. **Null Values**: Annotation elements cannot be null
3. **Inheritance Confusion**: @Inherited only works with classes
4. **Processing Order**: Annotation processing order is not guaranteed
5. **Overusing Reflection**: Can impact performance significantly

---

## Summary

Annotations are a powerful feature in Java that:
- Provide metadata about code
- Enable declarative programming
- Reduce boilerplate code
- Support frameworks and libraries
- Enable compile-time and runtime processing
- Improve code readability and maintainability

Understanding annotations is essential for modern Java development, especially when working with frameworks like Spring, Hibernate, and JUnit.
