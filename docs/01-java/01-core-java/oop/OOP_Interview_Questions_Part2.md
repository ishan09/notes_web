# Object-Oriented Programming Interview Questions - Part 2

**Continuation from Part 1**

This document continues the OOP interview questions covering:
- Remaining Abstraction topics (Q33-Q35)
- Class & Object Fundamentals
- Advanced OOP Concepts

---

## Abstraction Deep Dive (Continued)

### Q33: What are Marker Interfaces and Functional Interfaces?

**Answer:**

Both are special types of interfaces in Java that serve specific purposes.

**1. Marker Interface (Tag Interface)**

A **Marker Interface** is an interface with **NO methods or fields**. It's used to "mark" or "tag" a class to indicate that it has some special property or behavior.

```
╔═══════════════════════════════════════════════════════╗
║         MARKER INTERFACE                              ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Definition: Empty interface (no methods)             ║
║  Purpose: Mark/Tag a class for special treatment      ║
║  JVM Recognition: JVM or framework checks this tag    ║
║                                                       ║
║  Think: "Badge" or "Label" on a class                 ║
║  Example: "This class is Serializable"                ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Common Built-in Marker Interfaces:**

```java
// 1. Serializable - Marks class as serializable
package java.io;
public interface Serializable {
    // Empty! No methods
}

// 2. Cloneable - Marks class as cloneable
package java.lang;
public interface Cloneable {
    // Empty! No methods
}

// 3. Remote - Marks remote objects in RMI
package java.rmi;
public interface Remote {
    // Empty! No methods (marker only)
}
```

**Example: Using Serializable Marker Interface**

```java
import java.io.*;

// Class WITHOUT Serializable marker ❌
class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
}

// Class WITH Serializable marker ✅
class Employee implements Serializable {
    private String name;
    private int employeeId;

    public Employee(String name, String employeeId) {
        this.name = name;
        this.employeeId = employeeId;
    }
}

public class MarkerInterfaceDemo {
    public static void main(String[] args) {
        // Try to serialize Person (not marked as Serializable)
        Person person = new Person("John", 30);
        try {
            FileOutputStream fileOut = new FileOutputStream("person.ser");
            ObjectOutputStream out = new ObjectOutputStream(fileOut);
            out.writeObject(person);  // ❌ Throws NotSerializableException!
            out.close();
        } catch (NotSerializableException e) {
            System.out.println("Person is NOT serializable: " + e.getMessage());
        } catch (IOException e) {
            e.printStackTrace();
        }

        // Serialize Employee (marked as Serializable)
        Employee emp = new Employee("Alice", "E123");
        try {
            FileOutputStream fileOut = new FileOutputStream("employee.ser");
            ObjectOutputStream out = new ObjectOutputStream(fileOut);
            out.writeObject(emp);  // ✅ Works! JVM checks for Serializable marker
            out.close();
            System.out.println("Employee serialized successfully!");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

**How JVM Uses Marker Interfaces:**

```
┌────────────────────────────────────────────────┐
│  JVM checks at runtime:                        │
├────────────────────────────────────────────────┤
│                                                │
│  if (object instanceof Serializable) {         │
│      // OK to serialize                        │
│      performSerialization(object);             │
│  } else {                                      │
│      throw new NotSerializableException();     │
│  }                                             │
│                                                │
│  The marker is like a "permission slip"        │
│  that allows the JVM to perform the operation  │
│                                                │
└────────────────────────────────────────────────┘
```

**Custom Marker Interface Example:**

```java
// Custom marker interface
interface Premium {
    // Empty - just a marker
}

class Customer {
    private String name;
    private double discount;

    public Customer(String name) {
        this.name = name;
        this.discount = 0.0;
    }

    public String getName() {
        return name;
    }

    public double getDiscount() {
        return discount;
    }

    public void setDiscount(double discount) {
        this.discount = discount;
    }
}

// Premium customer marked with Premium interface
class PremiumCustomer extends Customer implements Premium {
    public PremiumCustomer(String name) {
        super(name);
        setDiscount(0.20);  // 20% discount for premium customers
    }
}

// Regular customer - no marker
class RegularCustomer extends Customer {
    public RegularCustomer(String name) {
        super(name);
        setDiscount(0.05);  // 5% discount for regular customers
    }
}

// Service that checks for marker
class BillingService {
    public void processBilling(Customer customer, double amount) {
        double finalAmount = amount;

        // Check for marker interface ✅
        if (customer instanceof Premium) {
            System.out.println(customer.getName() + " is a PREMIUM customer!");
            finalAmount = amount - (amount * customer.getDiscount());
        } else {
            System.out.println(customer.getName() + " is a regular customer");
            finalAmount = amount - (amount * customer.getDiscount());
        }

        System.out.println("Original: $" + amount);
        System.out.println("Discount: " + (customer.getDiscount() * 100) + "%");
        System.out.println("Final: $" + finalAmount);
    }
}

// Usage
public class CustomMarkerDemo {
    public static void main(String[] args) {
        BillingService billing = new BillingService();

        Customer premium = new PremiumCustomer("Alice");
        Customer regular = new RegularCustomer("Bob");

        billing.processBilling(premium, 100);
        System.out.println();
        billing.processBilling(regular, 100);
    }
}
```

---

**2. Functional Interface**

A **Functional Interface** is an interface with **exactly ONE abstract method**. Used for lambda expressions and method references (Java 8+).

```
╔═══════════════════════════════════════════════════════╗
║         FUNCTIONAL INTERFACE                          ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Definition: Interface with ONE abstract method       ║
║  Annotation: @FunctionalInterface (optional)          ║
║  Purpose: Enable lambda expressions                   ║
║                                                       ║
║  Think: "Single job description"                      ║
║  Example: "Run this code" (Runnable)                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Built-in Functional Interfaces:**

```java
// 1. Runnable - Run code with no parameters, no return
@FunctionalInterface
public interface Runnable {
    void run();  // One abstract method
}

// 2. Callable - Run code with no parameters, returns value
@FunctionalInterface
public interface Callable<V> {
    V call() throws Exception;  // One abstract method
}

// 3. Comparator - Compare two objects
@FunctionalInterface
public interface Comparator<T> {
    int compare(T o1, T o2);  // One abstract method

    // Can have default and static methods ✅
    default Comparator<T> reversed() { ... }
    static <T> Comparator<T> reverseOrder() { ... }
}
```

**Common Functional Interfaces in java.util.function:**

```java
import java.util.function.*;

// 1. Predicate<T> - Tests a condition, returns boolean
@FunctionalInterface
public interface Predicate<T> {
    boolean test(T t);
}

// 2. Function<T, R> - Takes input T, returns output R
@FunctionalInterface
public interface Function<T, R> {
    R apply(T t);
}

// 3. Consumer<T> - Takes input, returns nothing
@FunctionalInterface
public interface Consumer<T> {
    void accept(T t);
}

// 4. Supplier<T> - Takes no input, returns output
@FunctionalInterface
public interface Supplier<T> {
    T get();
}

// 5. BiFunction<T, U, R> - Takes two inputs, returns output
@FunctionalInterface
public interface BiFunction<T, U, R> {
    R apply(T t, U u);
}
```

**Using Functional Interfaces with Lambda Expressions:**

```java
import java.util.function.*;
import java.util.*;

public class FunctionalInterfaceDemo {
    public static void main(String[] args) {

        // 1. Predicate - Test condition
        Predicate<Integer> isEven = n -> n % 2 == 0;
        System.out.println("Is 4 even? " + isEven.test(4));    // true
        System.out.println("Is 5 even? " + isEven.test(5));    // false

        // 2. Function - Transform data
        Function<String, Integer> stringLength = s -> s.length();
        System.out.println("Length of 'Hello': " + stringLength.apply("Hello"));  // 5

        // 3. Consumer - Consume/use data
        Consumer<String> printer = s -> System.out.println("Printing: " + s);
        printer.accept("Hello World");  // Output: Printing: Hello World

        // 4. Supplier - Supply/generate data
        Supplier<Double> randomGenerator = () -> Math.random();
        System.out.println("Random number: " + randomGenerator.get());

        // 5. BiFunction - Two inputs, one output
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
        System.out.println("5 + 3 = " + add.apply(5, 3));  // 8

        // Using with Collections
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6);

        // Filter even numbers using Predicate
        numbers.stream()
               .filter(isEven)  // Predicate
               .forEach(n -> System.out.println(n));  // Consumer
    }
}
```

**Custom Functional Interface Example:**

```java
// Custom functional interface
@FunctionalInterface
interface Calculator {
    int calculate(int a, int b);  // One abstract method

    // Can have default methods ✅
    default void printResult(int a, int b) {
        System.out.println("Result: " + calculate(a, b));
    }

    // Can have static methods ✅
    static void info() {
        System.out.println("This is a calculator");
    }
}

public class CustomFunctionalInterfaceDemo {
    public static void main(String[] args) {
        // Before Java 8 - Anonymous class
        Calculator addition = new Calculator() {
            @Override
            public int calculate(int a, int b) {
                return a + b;
            }
        };

        // Java 8+ - Lambda expression ✅
        Calculator subtraction = (a, b) -> a - b;
        Calculator multiplication = (a, b) -> a * b;
        Calculator division = (a, b) -> a / b;

        System.out.println("Addition: " + addition.calculate(10, 5));       // 15
        System.out.println("Subtraction: " + subtraction.calculate(10, 5)); // 5
        System.out.println("Multiplication: " + multiplication.calculate(10, 5)); // 50
        System.out.println("Division: " + division.calculate(10, 5));       // 2

        // Using default method
        multiplication.printResult(10, 5);  // Output: Result: 50

        // Using static method
        Calculator.info();  // Output: This is a calculator
    }
}
```

**Comparison Table:**

| Feature | Marker Interface | Functional Interface |
|---------|------------------|---------------------|
| **Methods** | Zero methods (empty) | Exactly one abstract method |
| **Purpose** | Tag/mark a class | Enable lambda expressions |
| **Java Version** | Since Java 1.0 | Since Java 8 |
| **Annotation** | None | @FunctionalInterface (optional) |
| **Examples** | Serializable, Cloneable | Runnable, Callable, Predicate |
| **Usage** | instanceof checks | Lambda expressions |
| **Can have default methods?** | N/A (no methods) | ✅ Yes |
| **Can have static methods?** | N/A (no methods) | ✅ Yes |

**Rules for Functional Interface:**

```
┌────────────────────────────────────────────────┐
│  Functional Interface Rules:                   │
├────────────────────────────────────────────────┤
│                                                │
│  ✅ MUST have exactly ONE abstract method      │
│  ✅ CAN have multiple default methods          │
│  ✅ CAN have multiple static methods           │
│  ✅ CAN inherit from Object class methods      │
│     (toString, equals, hashCode)               │
│  ✅ @FunctionalInterface annotation optional   │
│     (but recommended for compile-time check)   │
│                                                │
└────────────────────────────────────────────────┘
```

**Valid Functional Interface Examples:**

```java
// ✅ Valid - One abstract method
@FunctionalInterface
interface Example1 {
    void doSomething();
}

// ✅ Valid - One abstract + default methods
@FunctionalInterface
interface Example2 {
    void doSomething();
    default void doSomethingElse() { }
    default void doMore() { }
}

// ✅ Valid - One abstract + static methods
@FunctionalInterface
interface Example3 {
    void doSomething();
    static void helper() { }
}

// ✅ Valid - Inherits from Object methods
@FunctionalInterface
interface Example4 {
    void doSomething();
    String toString();  // From Object - doesn't count
    boolean equals(Object obj);  // From Object - doesn't count
}

// ❌ INVALID - Two abstract methods
@FunctionalInterface  // Compiler error!
interface Example5 {
    void method1();
    void method2();  // Second abstract method - not allowed!
}
```

**Memory Tricks:**

```
MARKER INTERFACE = "NAME TAG"
  • Empty interface
  • Just identifies the class
  • Think: "Hi, my name is Serializable"

FUNCTIONAL INTERFACE = "ONE JOB"
  • One abstract method
  • Used with lambdas
  • Think: "I do ONE thing, and I do it well"

Remember:
  Marker = 0 methods (badge)
  Functional = 1 method (lambda)
```

---

### Q34: What are Default and Static methods in Interfaces? (Java 8+)

**Answer:**

Java 8 introduced **default methods** and **static methods** in interfaces, allowing interfaces to have implementation code while maintaining backward compatibility.

**1. Default Methods in Interfaces**

```
╔═══════════════════════════════════════════════════════╗
║         DEFAULT METHODS                               ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Keyword: default                                     ║
║  Purpose: Add new methods WITHOUT breaking existing   ║
║           implementations                             ║
║                                                       ║
║  Think: "Optional upgrade" for implementing classes   ║
║                                                       ║
║  • Classes can OVERRIDE default methods (optional)    ║
║  • Classes can USE default methods (inherited)        ║
║  • Provides DEFAULT implementation                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Why Default Methods Were Introduced:**

**Problem Before Java 8:**

```java
// Java 7 - Adding new method breaks all implementations!
interface Vehicle {
    void start();
    void stop();
}

class Car implements Vehicle {
    public void start() { System.out.println("Car started"); }
    public void stop() { System.out.println("Car stopped"); }
}

// Now you want to add a new method...
interface Vehicle {
    void start();
    void stop();
    void honk();  // ❌ BREAKS all existing implementations!
}

// Car class now has compilation error - must implement honk()
```

**Solution with Default Methods (Java 8+):**

```java
interface Vehicle {
    void start();
    void stop();

    // Default method - doesn't break existing implementations ✅
    default void honk() {
        System.out.println("Beep beep!");
    }
}

class Car implements Vehicle {
    public void start() { System.out.println("Car started"); }
    public void stop() { System.out.println("Car stopped"); }
    // Don't need to implement honk() - can use default!
}

class Bike implements Vehicle {
    public void start() { System.out.println("Bike started"); }
    public void stop() { System.out.println("Bike stopped"); }

    // Can override default method if needed ✅
    @Override
    public void honk() {
        System.out.println("Ring ring!");
    }
}

public class DefaultMethodDemo {
    public static void main(String[] args) {
        Car car = new Car();
        car.honk();  // Output: Beep beep! (uses default)

        Bike bike = new Bike();
        bike.honk();  // Output: Ring ring! (overridden)
    }
}
```

**Real-World Example: Java Collections**

```java
// Java 8 added default methods to List interface
public interface List<E> extends Collection<E> {
    // Existing abstract methods (from Java 1.0)
    boolean add(E e);
    E get(int index);
    int size();
    // ... many more

    // NEW default methods (Java 8) - didn't break existing code! ✅
    default void sort(Comparator<? super E> c) {
        Object[] a = this.toArray();
        Arrays.sort(a, (Comparator) c);
        ListIterator<E> i = this.listIterator();
        for (Object e : a) {
            i.next();
            i.set((E) e);
        }
    }

    default Spliterator<E> spliterator() {
        return Spliterators.spliterator(this, Spliterator.ORDERED);
    }
}

// Usage
public class Java8ListDemo {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();  // ArrayList from Java 1.2
        names.add("Charlie");
        names.add("Alice");
        names.add("Bob");

        // sort() is a DEFAULT method added in Java 8 ✅
        names.sort(String::compareTo);

        System.out.println(names);  // Output: [Alice, Bob, Charlie]
    }
}
```

**Multiple Inheritance with Default Methods:**

```java
interface Printer {
    default void print(String message) {
        System.out.println("Printing: " + message);
    }
}

interface Scanner {
    default void scan() {
        System.out.println("Scanning document...");
    }
}

// Implements both - no conflict ✅
class AllInOnePrinter implements Printer, Scanner {
    // Inherits both default methods
}

// Diamond Problem with default methods
interface A {
    default void show() {
        System.out.println("A");
    }
}

interface B {
    default void show() {
        System.out.println("B");
    }
}

// ❌ Conflict! Which show() to use?
class C implements A, B {
    // Must override to resolve conflict ✅
    @Override
    public void show() {
        A.super.show();  // Explicitly call A's version
        // or B.super.show(); for B's version
        // or provide custom implementation
    }
}
```

---

**2. Static Methods in Interfaces**

```
╔═══════════════════════════════════════════════════════╗
║         STATIC METHODS                                ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Keyword: static                                      ║
║  Purpose: Utility/helper methods related to interface ║
║                                                       ║
║  Think: "Helper functions" that belong to interface   ║
║                                                       ║
║  • Called on INTERFACE, not on instance               ║
║  • NOT inherited by implementing classes              ║
║  • Cannot be overridden                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Static Methods Example:**

```java
interface MathOperations {
    // Abstract method
    int calculate(int a, int b);

    // Static method - utility ✅
    static int add(int a, int b) {
        return a + b;
    }

    static int multiply(int a, int b) {
        return a * b;
    }

    // Static method calling another static method
    static int square(int n) {
        return multiply(n, n);  // Can call other static methods
    }
}

class Addition implements MathOperations {
    @Override
    public int calculate(int a, int b) {
        return a + b;
    }
}

public class StaticMethodDemo {
    public static void main(String[] args) {
        // Call static methods on INTERFACE ✅
        System.out.println("5 + 3 = " + MathOperations.add(5, 3));
        System.out.println("5 * 3 = " + MathOperations.multiply(5, 3));
        System.out.println("5 squared = " + MathOperations.square(5));

        Addition obj = new Addition();
        System.out.println("Calculate: " + obj.calculate(5, 3));

        // ❌ Cannot call static method on instance
        // obj.add(5, 3);  // Compilation error!

        // ❌ Cannot override static method
        // Static methods are NOT inherited
    }
}
```

**Real-World Example: Comparator Interface**

```java
import java.util.*;

public class ComparatorStaticDemo {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");

        // Comparator.naturalOrder() - static method ✅
        names.sort(Comparator.naturalOrder());
        System.out.println("Natural order: " + names);

        // Comparator.reverseOrder() - static method ✅
        names.sort(Comparator.reverseOrder());
        System.out.println("Reverse order: " + names);

        // Comparator.comparing() - static method ✅
        List<Person> people = Arrays.asList(
            new Person("Alice", 30),
            new Person("Bob", 25),
            new Person("Charlie", 35)
        );

        people.sort(Comparator.comparing(Person::getAge));
        System.out.println(people);
    }
}

class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public int getAge() { return age; }

    @Override
    public String toString() {
        return name + "(" + age + ")";
    }
}
```

**Comparison: Default vs Static Methods**

| Feature | Default Method | Static Method |
|---------|----------------|---------------|
| **Keyword** | `default` | `static` |
| **Implementation** | ✅ Yes (in interface) | ✅ Yes (in interface) |
| **Inheritance** | ✅ Inherited by implementing class | ❌ NOT inherited |
| **Override** | ✅ Can be overridden | ❌ Cannot be overridden |
| **Call from instance** | ✅ Yes | ❌ No |
| **Call from interface** | ❌ No | ✅ Yes (InterfaceName.method()) |
| **Access to instance fields** | ❌ No (interface has no fields) | ❌ No |
| **Purpose** | Provide default behavior | Provide utility methods |
| **Example** | `List.sort()` | `Comparator.naturalOrder()` |

**Complete Example - Combining All Features:**

```java
interface PaymentProcessor {
    // Abstract method
    boolean processPayment(double amount);

    // Default method - can be overridden ✅
    default void logTransaction(double amount) {
        System.out.println("Transaction of $" + amount + " processed at " +
                          System.currentTimeMillis());
    }

    // Default method calling static method
    default boolean isValidAmount(double amount) {
        return validateAmount(amount);  // Calls static method
    }

    // Static method - utility ✅
    static boolean validateAmount(double amount) {
        return amount > 0 && amount < 1000000;
    }

    // Static factory method
    static PaymentProcessor createProcessor(String type) {
        if (type.equals("credit")) {
            return new CreditCardProcessor();
        } else {
            return new DebitCardProcessor();
        }
    }
}

class CreditCardProcessor implements PaymentProcessor {
    @Override
    public boolean processPayment(double amount) {
        if (isValidAmount(amount)) {  // Uses default method
            System.out.println("Credit card payment: $" + amount);
            logTransaction(amount);  // Uses default method
            return true;
        }
        return false;
    }
}

class DebitCardProcessor implements PaymentProcessor {
    @Override
    public boolean processPayment(double amount) {
        if (isValidAmount(amount)) {
            System.out.println("Debit card payment: $" + amount);
            return true;
        }
        return false;
    }

    // Override default method ✅
    @Override
    public void logTransaction(double amount) {
        System.out.println("[DEBIT] Transaction of $" + amount +
                          " - Instant deduction");
    }
}

public class CompleteInterfaceDemo {
    public static void main(String[] args) {
        // Use static factory method
        PaymentProcessor processor1 = PaymentProcessor.createProcessor("credit");
        processor1.processPayment(100.50);

        PaymentProcessor processor2 = PaymentProcessor.createProcessor("debit");
        processor2.processPayment(50.75);

        // Use static utility method directly
        System.out.println("Is $500 valid? " +
                          PaymentProcessor.validateAmount(500));
    }
}
```

**Key Benefits:**

```
┌────────────────────────────────────────────────┐
│  Default Methods Benefits:                     │
├────────────────────────────────────────────────┤
│  ✅ Backward compatibility                     │
│  ✅ Add new functionality to old interfaces    │
│  ✅ Reduce code duplication                    │
│  ✅ Optional implementation for classes        │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Static Methods Benefits:                      │
├────────────────────────────────────────────────┤
│  ✅ Utility methods related to interface       │
│  ✅ Factory methods                            │
│  ✅ Helper methods                             │
│  ✅ No need for separate utility class         │
└────────────────────────────────────────────────┘
```

**Memory Trick:**

```
DEFAULT = "Inherited gift"
  • Classes inherit it
  • Can keep it or change it
  • Think: "Default settings - use or customize"

STATIC = "Interface toolbox"
  • Belongs to interface, not objects
  • Not inherited
  • Think: "Tools on the workbench, not in your pocket"
```

---

### Q35: What is the difference between Abstract Class and Interface after Java 8?

**Answer:**

After Java 8, the line between Abstract Classes and Interfaces became blurred since interfaces can now have implementation (default and static methods). However, **key differences still remain**.

**Updated Comparison After Java 8:**

| Feature | Abstract Class | Interface (Java 8+) |
|---------|----------------|---------------------|
| **Constructors** | ✅ Can have | ❌ Cannot have |
| **Instance Variables** | ✅ Can have (any type) | ❌ Cannot have (only constants) |
| **Method Implementation** | ✅ Concrete methods | ✅ Default and static methods |
| **Abstract Methods** | ✅ Can have | ✅ Can have |
| **Access Modifiers** | All types (public, private, protected) | Only public |
| **Multiple Inheritance** | ❌ Single inheritance | ✅ Multiple inheritance |
| **State** | ✅ Can maintain state | ❌ Cannot maintain state |
| **Fields** | Any access modifier | `public static final` only |
| **When to use** | IS-A with shared state | CAN-DO capability |

**The Key Differences That Still Matter:**

```
┌────────────────────────────────────────────────────┐
│  ABSTRACT CLASS = STATE + BEHAVIOR                 │
├────────────────────────────────────────────────────┤
│  • Can have instance variables (state)             │
│  • Can have constructors                           │
│  • Can have private/protected members              │
│  • Single inheritance only                         │
│                                                    │
│  Use when: Classes share STATE and BEHAVIOR        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  INTERFACE = BEHAVIOR ONLY (even with Java 8)      │
├────────────────────────────────────────────────────┤
│  • Cannot have instance variables                  │
│  • Cannot have constructors                        │
│  • All members public                              │
│  • Multiple inheritance allowed                    │
│                                                    │
│  Use when: Define CAPABILITIES/CONTRACTS           │
└────────────────────────────────────────────────────┘
```

**Example Showing the Difference:**

```java
// Abstract class - can maintain STATE ✅
abstract class Animal {
    protected String name;  // Instance variable ✅
    protected int age;

    // Constructor ✅
    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // Concrete method
    public void sleep() {
        System.out.println(name + " is sleeping");
    }

    // Abstract method
    public abstract void makeSound();
}

// Interface - CANNOT maintain STATE ❌
interface Flyable {
    // This is NOT an instance variable - it's a constant!
    int MAX_ALTITUDE = 10000;  // public static final (implicitly)

    // Abstract method
    void fly();

    // Default method (Java 8+) ✅
    default void land() {
        System.out.println("Landing...");
        // Cannot access instance variables - there are none!
    }

    // Static method (Java 8+) ✅
    static void checkWeather() {
        System.out.println("Weather check for flying");
    }
}

// Interface CANNOT have constructor ❌
interface Swimmable {
    // Swimmable() { }  // ❌ Compilation error!

    void swim();
}

// Class using both
class Duck extends Animal implements Flyable, Swimmable {

    public Duck(String name, int age) {
        super(name, age);  // Call abstract class constructor
    }

    @Override
    public void makeSound() {
        System.out.println(name + " says: Quack!");
    }

    @Override
    public void fly() {
        System.out.println(name + " is flying");
    }

    @Override
    public void swim() {
        System.out.println(name + " is swimming");
    }
}
```

**When to Use What (Post Java 8):**

```
Use ABSTRACT CLASS when you need:
├─ Instance variables (state)
├─ Constructors
├─ Private/protected methods
├─ Tightly related classes
└─ Example: Employee hierarchy with shared state

Use INTERFACE when you need:
├─ Multiple inheritance
├─ Define capabilities
├─ Unrelated classes with same behavior
├─ Pure contracts
└─ Example: Serializable, Comparable, Runnable
```

**Memory Trick:**

```
Even after Java 8:

ABSTRACT CLASS = "Family with shared DNA"
  • Constructor = Birth
  • Instance variables = Genetics
  • Shared behavior = Family traditions

INTERFACE = "Club membership"
  • No constructor = No birth
  • No state = No genetics
  • Default methods = Club activities
  • Multiple interfaces = Multiple club memberships
```

---

**📚 Continue to: [OOP_Class_Object_Fundamentals.md](OOP_Class_Object_Fundamentals.md)**

Covers:
- Q36: What is a Class and what is an Object?
- Q37: What is a Constructor? What are its types?
- Q38: What is the `this` keyword?
- More fundamentals about static keyword, Object class methods, and memory management

---
