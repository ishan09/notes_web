# Advanced OOP Concepts - Java Interview Questions

**Part of Java OOP Interview Preparation Series**

This document covers advanced OOP concepts including inner classes, nested classes, anonymous classes, lambda expressions, and more.

---

## Table of Contents

- Inner Classes (Nested Classes)
- Anonymous Classes
- Lambda Expressions
- Method References
- Enumerations (Enums)
- Records (Java 14+)

---

## Inner Classes (Nested Classes)

### Q41: What are Inner Classes? What are the different types?

**Answer:**

An **Inner Class** (or Nested Class) is a class defined within another class. Java supports several types of nested classes, each with different properties and use cases.

**Types of Nested Classes:**

```
╔═══════════════════════════════════════════════════════╗
║         NESTED CLASSES HIERARCHY                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Nested Classes                                       ║
║  ├── Static Nested Class                              ║
║  └── Inner Classes (Non-static)                       ║
║      ├── Member Inner Class                           ║
║      ├── Local Inner Class                            ║
║      └── Anonymous Inner Class                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

#### 1. Member Inner Class (Non-static Inner Class)

A non-static class defined at the member level of outer class.

**Characteristics:**
- Has access to all members of outer class (including private)
- Cannot have static members (except static final constants)
- Requires an instance of outer class to create inner class instance

```java
class Outer {
    private String outerField = "Outer Field";
    private static String staticField = "Static Field";

    // Member Inner Class
    class Inner {
        private String innerField = "Inner Field";

        public void display() {
            // Can access outer class members directly
            System.out.println("Outer field: " + outerField);
            System.out.println("Static field: " + staticField);
            System.out.println("Inner field: " + innerField);

            // Can call outer class methods
            outerMethod();
        }

        // ❌ Cannot have static methods (except static final)
        // public static void staticMethod() { }  // Compilation error

        // ✅ Can have static final constants
        public static final int CONSTANT = 100;
    }

    public void outerMethod() {
        System.out.println("Outer method called");

        // Create inner class instance
        Inner inner = new Inner();
        inner.display();
    }
}

public class MemberInnerClassDemo {
    public static void main(String[] args) {
        // Create outer class instance
        Outer outer = new Outer();

        // Method 1: Create inner class through outer instance
        Outer.Inner inner1 = outer.new Inner();
        inner1.display();

        // Method 2: Call outer method that uses inner class
        outer.outerMethod();
    }
}
```

**Real-World Example: LinkedList Node**

```java
class LinkedList {
    private Node head;
    private int size = 0;

    // Inner class - Node
    private class Node {
        int data;
        Node next;

        Node(int data) {
            this.data = data;
            this.next = null;
        }
    }

    public void add(int data) {
        Node newNode = new Node(data);
        if (head == null) {
            head = newNode;
        } else {
            Node current = head;
            while (current.next != null) {
                current = current.next;
            }
            current.next = newNode;
        }
        size++;
    }

    public void display() {
        Node current = head;
        while (current != null) {
            System.out.print(current.data + " -> ");
            current = current.next;
        }
        System.out.println("null");
    }

    public int getSize() {
        return size;
    }
}

public class LinkedListDemo {
    public static void main(String[] args) {
        LinkedList list = new LinkedList();
        list.add(10);
        list.add(20);
        list.add(30);

        list.display();  // Output: 10 -> 20 -> 30 -> null
        System.out.println("Size: " + list.getSize());  // Output: Size: 3
    }
}
```

---

#### 2. Static Nested Class

A static class defined inside another class.

**Characteristics:**
- Does NOT have access to outer class instance members
- CAN access outer class static members
- Can be instantiated without outer class instance
- Can have static members

```java
class Outer {
    private String instanceField = "Instance Field";
    private static String staticField = "Static Field";

    // Static Nested Class
    static class StaticNested {
        private String nestedField = "Nested Field";

        public void display() {
            // ❌ Cannot access instance members of outer class
            // System.out.println(instanceField);  // Compilation error

            // ✅ Can access static members of outer class
            System.out.println("Static field: " + staticField);
            System.out.println("Nested field: " + nestedField);
        }

        // ✅ Can have static members
        public static void staticMethod() {
            System.out.println("Static method in nested class");
        }
    }

    public void outerMethod() {
        // Create static nested class instance
        StaticNested nested = new StaticNested();
        nested.display();
    }
}

public class StaticNestedClassDemo {
    public static void main(String[] args) {
        // Create static nested class WITHOUT outer instance
        Outer.StaticNested nested = new Outer.StaticNested();
        nested.display();

        // Call static method
        Outer.StaticNested.staticMethod();

        // vs Member Inner Class
        // Outer.Inner inner = new Outer.Inner();  // ❌ Error - needs outer instance
    }
}
```

**Real-World Example: Builder Pattern**

```java
class Person {
    // Required parameters
    private final String firstName;
    private final String lastName;

    // Optional parameters
    private final int age;
    private final String phone;
    private final String address;

    // Private constructor
    private Person(Builder builder) {
        this.firstName = builder.firstName;
        this.lastName = builder.lastName;
        this.age = builder.age;
        this.phone = builder.phone;
        this.address = builder.address;
    }

    // Static nested Builder class
    public static class Builder {
        // Required parameters
        private final String firstName;
        private final String lastName;

        // Optional parameters - initialized to default values
        private int age = 0;
        private String phone = "";
        private String address = "";

        public Builder(String firstName, String lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        }

        public Builder age(int age) {
            this.age = age;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public Builder address(String address) {
            this.address = address;
            return this;
        }

        public Person build() {
            return new Person(this);
        }
    }

    @Override
    public String toString() {
        return "Person{" +
               "firstName='" + firstName + '\'' +
               ", lastName='" + lastName + '\'' +
               ", age=" + age +
               ", phone='" + phone + '\'' +
               ", address='" + address + '\'' +
               '}';
    }
}

public class BuilderPatternDemo {
    public static void main(String[] args) {
        // Build Person with only required fields
        Person person1 = new Person.Builder("John", "Doe")
                .build();

        // Build Person with all fields using method chaining
        Person person2 = new Person.Builder("Jane", "Smith")
                .age(30)
                .phone("123-456-7890")
                .address("123 Main St")
                .build();

        System.out.println(person1);
        System.out.println(person2);
    }
}
```

---

#### 3. Local Inner Class

A class defined inside a method or block.

**Characteristics:**
- Scope limited to the block/method where it's defined
- Can access outer class members
- Can access final or effectively final local variables
- Cannot have access modifiers (public, private, etc.)
- Cannot have static members

```java
class Outer {
    private String outerField = "Outer Field";

    public void outerMethod() {
        final String localVariable = "Local Variable";
        int effectivelyFinal = 100;  // Not modified, so effectively final

        // Local Inner Class
        class LocalInner {
            private String innerField = "Inner Field";

            public void display() {
                System.out.println("Outer field: " + outerField);
                System.out.println("Local variable: " + localVariable);
                System.out.println("Effectively final: " + effectivelyFinal);
                System.out.println("Inner field: " + innerField);
            }
        }

        // Create and use local inner class
        LocalInner inner = new LocalInner();
        inner.display();

        // Local inner class only accessible within this method
    }
}

public class LocalInnerClassDemo {
    public static void main(String[] args) {
        Outer outer = new Outer();
        outer.outerMethod();

        // ❌ Cannot access LocalInner here
        // Outer.LocalInner inner = ???  // Not accessible
    }
}
```

**Real-World Example: Event Handling**

```java
class Button {
    private String label;

    public Button(String label) {
        this.label = label;
    }

    public void click() {
        final String buttonLabel = this.label;

        // Local inner class for click handling
        class ClickHandler {
            public void handle() {
                System.out.println("Button '" + buttonLabel + "' clicked!");
                performAction();
            }

            private void performAction() {
                System.out.println("Performing action for: " + buttonLabel);
            }
        }

        ClickHandler handler = new ClickHandler();
        handler.handle();
    }
}

public class LocalInnerEventDemo {
    public static void main(String[] args) {
        Button submitButton = new Button("Submit");
        Button cancelButton = new Button("Cancel");

        submitButton.click();  // Output: Button 'Submit' clicked!
        cancelButton.click();  // Output: Button 'Cancel' clicked!
    }
}
```

---

#### 4. Anonymous Inner Class

A class without a name, defined and instantiated in a single expression.

**Characteristics:**
- No class name
- Used for one-time use
- Can extend a class or implement an interface
- Cannot have constructor (no name to call)
- Commonly used for event handlers, threads, callbacks

```java
// Interface
interface Greeting {
    void greet(String name);
}

// Abstract class
abstract class Animal {
    abstract void makeSound();
}

public class AnonymousInnerClassDemo {
    public static void main(String[] args) {
        // 1. Anonymous class implementing interface
        Greeting greeting = new Greeting() {
            @Override
            public void greet(String name) {
                System.out.println("Hello, " + name + "!");
            }
        };
        greeting.greet("Alice");

        // 2. Anonymous class extending abstract class
        Animal dog = new Animal() {
            @Override
            void makeSound() {
                System.out.println("Woof!");
            }
        };
        dog.makeSound();

        // 3. Anonymous class extending concrete class
        Thread thread = new Thread() {
            @Override
            public void run() {
                System.out.println("Thread running: " + Thread.currentThread().getName());
            }
        };
        thread.start();

        // 4. Anonymous class with Runnable
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                System.out.println("Runnable executed");
            }
        };
        new Thread(runnable).start();
    }
}
```

**Real-World Example: Comparator**

```java
import java.util.*;

class Student {
    String name;
    int marks;

    public Student(String name, int marks) {
        this.name = name;
        this.marks = marks;
    }

    @Override
    public String toString() {
        return name + "(" + marks + ")";
    }
}

public class ComparatorDemo {
    public static void main(String[] args) {
        List<Student> students = new ArrayList<>();
        students.add(new Student("Alice", 85));
        students.add(new Student("Bob", 92));
        students.add(new Student("Charlie", 78));

        // Anonymous inner class - Sort by marks (descending)
        Collections.sort(students, new Comparator<Student>() {
            @Override
            public int compare(Student s1, Student s2) {
                return Integer.compare(s2.marks, s1.marks);  // Descending
            }
        });

        System.out.println("Sorted by marks: " + students);
        // Output: [Bob(92), Alice(85), Charlie(78)]

        // Anonymous inner class - Sort by name
        Collections.sort(students, new Comparator<Student>() {
            @Override
            public int compare(Student s1, Student s2) {
                return s1.name.compareTo(s2.name);
            }
        });

        System.out.println("Sorted by name: " + students);
        // Output: [Alice(85), Bob(92), Charlie(78)]
    }
}
```

---

### Comparison Table: Types of Nested Classes

| Feature | Member Inner | Static Nested | Local Inner | Anonymous |
|---------|-------------|---------------|-------------|-----------|
| **Keyword** | None | `static` | None | None |
| **Name** | Yes | Yes | Yes | No |
| **Access outer instance members** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Access outer static members** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Needs outer instance** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Can have static members** | ❌ No* | ✅ Yes | ❌ No | ❌ No |
| **Scope** | Class level | Class level | Block/Method | Expression |
| **Access modifier** | Yes | Yes | No | No |
| **Can have constructor** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Common use** | Encapsulation | Builder, Utility | Event handlers | Callbacks |

*Except static final constants

---

### When to Use Which?

```
┌────────────────────────────────────────────────┐
│  MEMBER INNER CLASS                            │
├────────────────────────────────────────────────┤
│  Use when:                                     │
│  • Needs access to outer instance members      │
│  • Logically part of outer class               │
│  • Example: LinkedList.Node, Iterator          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  STATIC NESTED CLASS                           │
├────────────────────────────────────────────────┤
│  Use when:                                     │
│  • Doesn't need outer instance                 │
│  • Logical grouping with outer class           │
│  • Example: Builder pattern, Entry class       │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  LOCAL INNER CLASS                             │
├────────────────────────────────────────────────┤
│  Use when:                                     │
│  • Needed only in one method                   │
│  • Temporary, one-time helper                  │
│  • Example: Event handlers, validators         │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  ANONYMOUS INNER CLASS                         │
├────────────────────────────────────────────────┤
│  Use when:                                     │
│  • One-time use, short implementation          │
│  • Implementing interface/extending class      │
│  • Example: Comparators, Runnables, Listeners  │
│  • Note: Often replaced by lambda in Java 8+   │
└────────────────────────────────────────────────┘
```

---

### Memory Trick

```
INNER CLASSES = "MSLA"

M - Member Inner      → "Member of the family" (needs parent)
S - Static Nested     → "Standalone" (independent)
L - Local Inner       → "Local to method" (method scope)
A - Anonymous         → "Anonymous person" (no name)

Remember:
  Static nested = NO outer instance needed
  All others = Need outer instance
  Anonymous = Lambda replacement candidate
```

---

## Anonymous Classes (Detailed)

### Q42: What are Anonymous Classes? When should we use them?

**Answer:**

An **Anonymous Class** is a class without a name that is declared and instantiated in a single expression. It's commonly used for creating one-time implementations of interfaces or abstract classes.

**Syntax:**

```java
// Implementing an interface
InterfaceName obj = new InterfaceName() {
    // Implementation
};

// Extending a class
ClassName obj = new ClassName() {
    // Override methods
};
```

---

#### Anonymous Class Extending a Class

```java
class Vehicle {
    public void start() {
        System.out.println("Vehicle starting");
    }
}

public class AnonymousExtendDemo {
    public static void main(String[] args) {
        // Anonymous class extending Vehicle
        Vehicle car = new Vehicle() {
            @Override
            public void start() {
                System.out.println("Car engine starting: Vroom!");
            }

            // Can add new methods (but cannot be called through reference)
            public void honk() {
                System.out.println("Beep beep!");
            }
        };

        car.start();  // Output: Car engine starting: Vroom!
        // car.honk();  // ❌ Cannot call - not in Vehicle interface
    }
}
```

---

#### Anonymous Class Implementing Interface

```java
interface Calculator {
    int calculate(int a, int b);
}

public class AnonymousInterfaceDemo {
    public static void main(String[] args) {
        // Anonymous class for addition
        Calculator addition = new Calculator() {
            @Override
            public int calculate(int a, int b) {
                return a + b;
            }
        };

        // Anonymous class for multiplication
        Calculator multiplication = new Calculator() {
            @Override
            public int calculate(int a, int b) {
                return a * b;
            }
        };

        System.out.println("5 + 3 = " + addition.calculate(5, 3));        // 8
        System.out.println("5 * 3 = " + multiplication.calculate(5, 3));  // 15
    }
}
```

---

#### Anonymous Class with Multiple Methods

```java
interface Worker {
    void work();
    void rest();
}

public class MultiMethodAnonymousDemo {
    public static void main(String[] args) {
        Worker developer = new Worker() {
            private int hoursWorked = 0;

            @Override
            public void work() {
                hoursWorked++;
                System.out.println("Developer coding... (" + hoursWorked + " hours)");
            }

            @Override
            public void rest() {
                System.out.println("Developer taking a coffee break");
            }
        };

        developer.work();
        developer.work();
        developer.rest();
        developer.work();
    }
}
```

---

#### Real-World Examples

**1. GUI Event Handling (Swing)**

```java
import javax.swing.*;
import java.awt.event.*;

public class ButtonEventDemo {
    public static void main(String[] args) {
        JFrame frame = new JFrame("Anonymous Class Demo");
        JButton button = new JButton("Click Me!");

        // Anonymous class for ActionListener
        button.addActionListener(new ActionListener() {
            private int clickCount = 0;

            @Override
            public void actionPerformed(ActionEvent e) {
                clickCount++;
                System.out.println("Button clicked " + clickCount + " times!");
            }
        });

        frame.add(button);
        frame.setSize(300, 200);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}
```

**2. Custom Thread**

```java
public class ThreadAnonymousDemo {
    public static void main(String[] args) {
        // Method 1: Anonymous class extending Thread
        Thread thread1 = new Thread() {
            @Override
            public void run() {
                for (int i = 1; i <= 5; i++) {
                    System.out.println("Thread1: " + i);
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        };

        // Method 2: Anonymous class implementing Runnable
        Thread thread2 = new Thread(new Runnable() {
            @Override
            public void run() {
                for (int i = 1; i <= 5; i++) {
                    System.out.println("Thread2: " + i);
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        });

        thread1.start();
        thread2.start();
    }
}
```

**3. Custom Sorting with Comparator**

```java
import java.util.*;

class Employee {
    String name;
    double salary;
    int age;

    public Employee(String name, double salary, int age) {
        this.name = name;
        this.salary = salary;
        this.age = age;
    }

    @Override
    public String toString() {
        return name + "(salary=" + salary + ", age=" + age + ")";
    }
}

public class SortingAnonymousDemo {
    public static void main(String[] args) {
        List<Employee> employees = new ArrayList<>();
        employees.add(new Employee("Alice", 75000, 30));
        employees.add(new Employee("Bob", 85000, 25));
        employees.add(new Employee("Charlie", 70000, 35));

        // Sort by salary (descending) using anonymous class
        Collections.sort(employees, new Comparator<Employee>() {
            @Override
            public int compare(Employee e1, Employee e2) {
                return Double.compare(e2.salary, e1.salary);
            }
        });

        System.out.println("Sorted by salary:");
        employees.forEach(System.out::println);

        // Sort by age using anonymous class
        Collections.sort(employees, new Comparator<Employee>() {
            @Override
            public int compare(Employee e1, Employee e2) {
                return Integer.compare(e1.age, e2.age);
            }
        });

        System.out.println("\nSorted by age:");
        employees.forEach(System.out::println);
    }
}
```

**4. Stream Filter/Map with Anonymous Class**

```java
import java.util.*;
import java.util.function.*;

public class StreamAnonymousDemo {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

        // Anonymous class for Predicate
        Predicate<Integer> isEven = new Predicate<Integer>() {
            @Override
            public boolean test(Integer n) {
                return n % 2 == 0;
            }
        };

        // Anonymous class for Function
        Function<Integer, Integer> square = new Function<Integer, Integer>() {
            @Override
            public Integer apply(Integer n) {
                return n * n;
            }
        };

        // Use in stream
        List<Integer> result = numbers.stream()
                .filter(isEven)
                .map(square)
                .collect(Collectors.toList());

        System.out.println("Even squares: " + result);
        // Output: [4, 16, 36, 64, 100]
    }
}
```

---

#### Advantages of Anonymous Classes

```
✅ ADVANTAGES:
• Reduce code - no need for separate class file
• Encapsulation - logic stays close to usage
• Quick implementation for one-time use
• Access to outer class members and final variables
```

#### Disadvantages of Anonymous Classes

```
❌ DISADVANTAGES:
• Verbose syntax (compared to lambdas)
• Cannot be reused
• Cannot have constructor (no name)
• Can make code harder to read if too long
• No explicit type name for debugging
```

---

#### Anonymous Class vs Lambda Expression (Java 8+)

**Before Java 8 (Anonymous Class):**

```java
// Verbose anonymous class
Runnable runnable = new Runnable() {
    @Override
    public void run() {
        System.out.println("Running");
    }
};
```

**Java 8+ (Lambda):**

```java
// Concise lambda expression
Runnable runnable = () -> System.out.println("Running");
```

**When to Use Anonymous Class vs Lambda:**

```
┌────────────────────────────────────────────────┐
│  USE ANONYMOUS CLASS when:                     │
├────────────────────────────────────────────────┤
│  • Interface has multiple abstract methods     │
│  • Need to maintain state (instance variables) │
│  • Need to override multiple methods           │
│  • Extending a class (not interface)           │
│  • Need initialization block                   │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  USE LAMBDA when:                              │
├────────────────────────────────────────────────┤
│  • Functional interface (single method)        │
│  • Simple, stateless operation                 │
│  • Need concise, readable code                 │
│  • Java 8+ available                           │
└────────────────────────────────────────────────┘
```

**Comparison Example:**

```java
import java.util.*;

public class AnonymousVsLambdaDemo {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");

        // ANONYMOUS CLASS - Before Java 8
        Collections.sort(names, new Comparator<String>() {
            @Override
            public int compare(String s1, String s2) {
                return s1.length() - s2.length();
            }
        });

        // LAMBDA - Java 8+
        Collections.sort(names, (s1, s2) -> s1.length() - s2.length());

        // METHOD REFERENCE - Even shorter!
        Collections.sort(names, Comparator.comparingInt(String::length));

        System.out.println(names);
    }
}
```

---

### When to Use Anonymous Classes

```
✅ Good Use Cases:
1. Event handlers (GUI applications)
2. Thread creation (one-time tasks)
3. Callbacks and listeners
4. Custom comparators for sorting
5. Stream operations (if not using lambdas)
6. Testing and prototyping

❌ Avoid When:
1. Implementation is long (>10 lines)
2. Same logic needed in multiple places
3. Can use lambda instead (Java 8+)
4. Need to reuse the implementation
5. Makes code hard to read
```

---

### Memory Trick

```
ANONYMOUS CLASS = "INCOGNITO MODE"

• No name (anonymous)
• One-time use (temporary)
• Created on-the-fly
• Disappears after use

Think:
  "I need this ONCE, right HERE, right NOW"

If needed more than once → Create named class
If single method interface → Use lambda (Java 8+)
```

---


## Lambda Expressions (Java 8+)

### Q43: What are Lambda Expressions? How do they work?

**Answer:**

A **Lambda Expression** is a concise way to represent a functional interface (an interface with a single abstract method) using an expression. It's essentially a shorthand for anonymous inner classes.

**Syntax:**

```java
(parameters) -> expression
// or
(parameters) -> { statements; }
```

**Visual Comparison:**

```
╔═══════════════════════════════════════════════════════╗
║     BEFORE JAVA 8 (Anonymous Class)                   ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Runnable r = new Runnable() {                        ║
║      @Override                                        ║
║      public void run() {                              ║
║          System.out.println("Hello");                 ║
║      }                                                ║
║  };                                                   ║
║                                                       ║
║  5 lines of boilerplate code!                         ║
╚═══════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════╗
║     JAVA 8+ (Lambda Expression)                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Runnable r = () -> System.out.println("Hello");      ║
║                                                       ║
║  1 line! Clear and concise.                           ║
╚═══════════════════════════════════════════════════════╝
```

---

#### Lambda Expression Syntax Variations

```java
import java.util.*;
import java.util.function.*;

public class LambdaSyntaxDemo {
    public static void main(String[] args) {
        
        // 1. No parameters
        Runnable r1 = () -> System.out.println("No parameters");
        
        // 2. Single parameter (parentheses optional)
        Consumer<String> c1 = s -> System.out.println(s);
        Consumer<String> c2 = (s) -> System.out.println(s);  // Same as above
        
        // 3. Multiple parameters
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
        
        // 4. Type inference (types optional)
        BiFunction<Integer, Integer, Integer> multiply = (Integer a, Integer b) -> a * b;
        
        // 5. Multiple statements (requires braces and return)
        BiFunction<Integer, Integer, Integer> complex = (a, b) -> {
            int result = a * b;
            System.out.println("Calculating: " + a + " * " + b);
            return result;
        };
        
        // 6. Single expression (return is implicit)
        Function<Integer, Integer> square = x -> x * x;
        
        // Usage
        r1.run();
        c1.accept("Hello");
        System.out.println("5 + 3 = " + add.apply(5, 3));
        System.out.println("5 * 3 = " + multiply.apply(5, 3));
        System.out.println(complex.apply(4, 7));
        System.out.println("Square of 5: " + square.apply(5));
    }
}
```

---

#### Functional Interfaces

Lambda expressions can only be used with **functional interfaces** - interfaces with exactly ONE abstract method.

**Common Built-in Functional Interfaces:**

```java
import java.util.function.*;

public class FunctionalInterfacesDemo {
    public static void main(String[] args) {
        
        // 1. Predicate<T> - takes T, returns boolean
        Predicate<Integer> isEven = n -> n % 2 == 0;
        System.out.println("Is 4 even? " + isEven.test(4));  // true
        
        // 2. Function<T, R> - takes T, returns R
        Function<String, Integer> length = s -> s.length();
        System.out.println("Length of 'Hello': " + length.apply("Hello"));  // 5
        
        // 3. Consumer<T> - takes T, returns nothing
        Consumer<String> printer = s -> System.out.println("Value: " + s);
        printer.accept("Hello");
        
        // 4. Supplier<T> - takes nothing, returns T
        Supplier<Double> randomGen = () -> Math.random();
        System.out.println("Random: " + randomGen.get());
        
        // 5. BiFunction<T, U, R> - takes T and U, returns R
        BiFunction<Integer, Integer, Integer> max = (a, b) -> a > b ? a : b;
        System.out.println("Max(10, 20): " + max.apply(10, 20));  // 20
        
        // 6. BiPredicate<T, U> - takes T and U, returns boolean
        BiPredicate<String, Integer> lengthCheck = (s, len) -> s.length() == len;
        System.out.println("'Java' has 4 chars? " + lengthCheck.test("Java", 4));  // true
        
        // 7. UnaryOperator<T> - takes T, returns T (special case of Function)
        UnaryOperator<Integer> doubleIt = x -> x * 2;
        System.out.println("Double 5: " + doubleIt.apply(5));  // 10
        
        // 8. BinaryOperator<T> - takes T and T, returns T (special case of BiFunction)
        BinaryOperator<Integer> sum = (a, b) -> a + b;
        System.out.println("Sum(3, 7): " + sum.apply(3, 7));  // 10
    }
}
```

**Summary Table:**

| Interface | Input | Output | Method | Example |
|-----------|-------|--------|--------|---------|
| `Predicate<T>` | T | boolean | `test(T)` | `n -> n > 0` |
| `Function<T,R>` | T | R | `apply(T)` | `s -> s.length()` |
| `Consumer<T>` | T | void | `accept(T)` | `s -> System.out.println(s)` |
| `Supplier<T>` | none | T | `get()` | `() -> new Date()` |
| `BiFunction<T,U,R>` | T, U | R | `apply(T,U)` | `(a,b) -> a+b` |
| `UnaryOperator<T>` | T | T | `apply(T)` | `x -> x*2` |
| `BinaryOperator<T>` | T, T | T | `apply(T,T)` | `(a,b) -> Math.max(a,b)` |

---

#### Real-World Examples

**1. Sorting with Lambda**

```java
import java.util.*;

class Employee {
    String name;
    double salary;
    
    public Employee(String name, double salary) {
        this.name = name;
        this.salary = salary;
    }
    
    @Override
    public String toString() {
        return name + "($" + salary + ")";
    }
}

public class SortingLambdaDemo {
    public static void main(String[] args) {
        List<Employee> employees = Arrays.asList(
            new Employee("Alice", 75000),
            new Employee("Bob", 85000),
            new Employee("Charlie", 70000)
        );
        
        // Sort by salary (ascending)
        employees.sort((e1, e2) -> Double.compare(e1.salary, e2.salary));
        System.out.println("By salary: " + employees);
        
        // Sort by name
        employees.sort((e1, e2) -> e1.name.compareTo(e2.name));
        System.out.println("By name: " + employees);
        
        // Sort by salary (descending)
        employees.sort((e1, e2) -> Double.compare(e2.salary, e1.salary));
        System.out.println("By salary (desc): " + employees);
    }
}
```

**2. Filtering and Processing Collections**

```java
import java.util.*;
import java.util.stream.*;

public class CollectionLambdaDemo {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        
        // Filter even numbers
        List<Integer> evenNumbers = numbers.stream()
                .filter(n -> n % 2 == 0)
                .collect(Collectors.toList());
        System.out.println("Even numbers: " + evenNumbers);
        
        // Square each number
        List<Integer> squares = numbers.stream()
                .map(n -> n * n)
                .collect(Collectors.toList());
        System.out.println("Squares: " + squares);
        
        // Filter and transform
        List<Integer> evenSquares = numbers.stream()
                .filter(n -> n % 2 == 0)
                .map(n -> n * n)
                .collect(Collectors.toList());
        System.out.println("Even squares: " + evenSquares);
        
        // Sum using reduce
        int sum = numbers.stream()
                .reduce(0, (a, b) -> a + b);
        System.out.println("Sum: " + sum);
        
        // Count elements
        long count = numbers.stream()
                .filter(n -> n > 5)
                .count();
        System.out.println("Numbers > 5: " + count);
    }
}
```

**3. Thread Creation**

```java
public class ThreadLambdaDemo {
    public static void main(String[] args) {
        // Before Java 8
        Thread thread1 = new Thread(new Runnable() {
            @Override
            public void run() {
                System.out.println("Old way: " + Thread.currentThread().getName());
            }
        });
        
        // Java 8+ with lambda
        Thread thread2 = new Thread(() -> {
            System.out.println("Lambda way: " + Thread.currentThread().getName());
        });
        
        // Even more concise
        Thread thread3 = new Thread(() -> 
            System.out.println("Concise: " + Thread.currentThread().getName())
        );
        
        thread1.start();
        thread2.start();
        thread3.start();
    }
}
```

**4. Custom Functional Interface**

```java
@FunctionalInterface
interface MathOperation {
    int operate(int a, int b);
}

@FunctionalInterface
interface StringProcessor {
    String process(String str);
}

public class CustomFunctionalInterfaceDemo {
    public static void main(String[] args) {
        // Different implementations using lambda
        MathOperation add = (a, b) -> a + b;
        MathOperation subtract = (a, b) -> a - b;
        MathOperation multiply = (a, b) -> a * b;
        MathOperation divide = (a, b) -> a / b;
        
        System.out.println("10 + 5 = " + add.operate(10, 5));
        System.out.println("10 - 5 = " + subtract.operate(10, 5));
        System.out.println("10 * 5 = " + multiply.operate(10, 5));
        System.out.println("10 / 5 = " + divide.operate(10, 5));
        
        // String processing
        StringProcessor toUpper = s -> s.toUpperCase();
        StringProcessor reverse = s -> new StringBuilder(s).reverse().toString();
        StringProcessor addPrefix = s -> "Mr. " + s;
        
        System.out.println(toUpper.process("hello"));      // HELLO
        System.out.println(reverse.process("hello"));      // olleh
        System.out.println(addPrefix.process("Smith"));    // Mr. Smith
    }
}
```

---

#### Variable Capture in Lambdas

Lambdas can access variables from the enclosing scope, but they must be **effectively final**.

```java
public class LambdaVariableCaptureDemo {
    public static void main(String[] args) {
        int multiplier = 10;  // Effectively final (not modified)
        
        // Lambda captures 'multiplier'
        Function<Integer, Integer> multiply = x -> x * multiplier;
        
        System.out.println("5 * 10 = " + multiply.apply(5));  // 50
        
        // ❌ Cannot modify captured variable
        // multiplier = 20;  // Compilation error!
        
        // ✅ Local variable in lambda is fine
        Consumer<String> printer = s -> {
            String message = "Value: " + s;  // Local to lambda
            System.out.println(message);
        };
        printer.accept("Hello");
    }
}
```

---

#### Advantages and Limitations

**Advantages:**

```
✅ ADVANTAGES:
• Concise syntax - less boilerplate code
• Readable - intention is clearer
• Functional programming support
• Easy to pass behavior as parameters
• Works seamlessly with Stream API
• Type inference reduces verbosity
```

**Limitations:**

```
❌ LIMITATIONS:
• Only works with functional interfaces
• Cannot access non-final variables from scope
• Debugging can be harder (no explicit class name)
• Cannot have multiple abstract methods
• Cannot throw checked exceptions (without wrapper)
```

---

### Memory Trick

```
LAMBDA = "SHORTCUT"

(parameters) -> expression

Think: "FOR these parameters, DO this"

Remember:
  () -> ...           Zero parameters
  x -> ...            One parameter (no parentheses)
  (x, y) -> ...       Multiple parameters
  
  Single line → no braces, implicit return
  Multiple lines → braces + explicit return
```

---

## Method References (Java 8+)

### Q44: What are Method References? How are they different from Lambdas?

**Answer:**

A **Method Reference** is a shorthand notation for calling a method using lambda expressions. When a lambda only calls an existing method, you can replace it with a method reference.

**Syntax:**

```
ClassName::methodName
```

**Types of Method References:**

```
1. Reference to a static method
   ClassName::staticMethod
   
2. Reference to an instance method of a particular object
   instance::instanceMethod
   
3. Reference to an instance method of an arbitrary object
   ClassName::instanceMethod
   
4. Reference to a constructor
   ClassName::new
```

---

#### 1. Static Method Reference

```java
import java.util.*;

public class StaticMethodRefDemo {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(-3, 5, -1, 10, -7, 2);
        
        // Lambda
        numbers.forEach(n -> System.out.println(n));
        
        // Method reference (instance method of System.out)
        numbers.forEach(System.out::println);
        
        // Lambda - calling static method
        List<Integer> absolute = numbers.stream()
                .map(n -> Math.abs(n))
                .collect(Collectors.toList());
        
        // Method reference - static method
        List<Integer> absolute2 = numbers.stream()
                .map(Math::abs)
                .collect(Collectors.toList());
        
        System.out.println("Absolute values: " + absolute2);
    }
}
```

---

#### 2. Instance Method Reference (Particular Object)

```java
class Printer {
    public void print(String message) {
        System.out.println("Printing: " + message);
    }
    
    public void printUpper(String message) {
        System.out.println(message.toUpperCase());
    }
}

public class InstanceMethodRefDemo {
    public static void main(String[] args) {
        Printer printer = new Printer();
        List<String> messages = Arrays.asList("hello", "world", "java");
        
        // Lambda
        messages.forEach(msg -> printer.print(msg));
        
        // Method reference - instance method of particular object
        messages.forEach(printer::print);
        
        // Another example
        messages.forEach(printer::printUpper);
    }
}
```

---

#### 3. Instance Method Reference (Arbitrary Object)

```java
import java.util.*;

public class ArbitraryObjectMethodRefDemo {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("alice", "bob", "charlie");
        
        // Lambda
        names.stream()
             .map(s -> s.toUpperCase())
             .forEach(System.out::println);
        
        // Method reference - instance method of arbitrary object
        names.stream()
             .map(String::toUpperCase)  // Each string calls its own toUpperCase()
             .forEach(System.out::println);
        
        // Sorting example
        List<String> words = Arrays.asList("apple", "Banana", "cherry");
        
        // Lambda
        words.sort((s1, s2) -> s1.compareToIgnoreCase(s2));
        
        // Method reference
        words.sort(String::compareToIgnoreCase);
        
        System.out.println(words);
    }
}
```

---

#### 4. Constructor Reference

```java
import java.util.*;
import java.util.function.*;

class Person {
    String name;
    
    public Person() {
        this.name = "Unknown";
    }
    
    public Person(String name) {
        this.name = name;
    }
    
    @Override
    public String toString() {
        return "Person{name='" + name + "'}";
    }
}

public class ConstructorRefDemo {
    public static void main(String[] args) {
        // No-arg constructor reference
        Supplier<Person> personSupplier = Person::new;
        Person p1 = personSupplier.get();
        System.out.println(p1);
        
        // Constructor with parameter reference
        Function<String, Person> personCreator = Person::new;
        Person p2 = personCreator.apply("Alice");
        System.out.println(p2);
        
        // Create list of Person objects from list of names
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
        
        // Lambda
        List<Person> people1 = names.stream()
                .map(name -> new Person(name))
                .collect(Collectors.toList());
        
        // Constructor reference
        List<Person> people2 = names.stream()
                .map(Person::new)
                .collect(Collectors.toList());
        
        people2.forEach(System.out::println);
    }
}
```

---

#### Comparison: Lambda vs Method Reference

```java
import java.util.*;
import java.util.function.*;

public class LambdaVsMethodRefDemo {
    public static void main(String[] args) {
        List<String> words = Arrays.asList("java", "python", "javascript", "go");
        
        // Example 1: Print each
        // Lambda
        words.forEach(w -> System.out.println(w));
        // Method reference
        words.forEach(System.out::println);
        
        // Example 2: Convert to uppercase
        // Lambda
        words.stream().map(w -> w.toUpperCase());
        // Method reference
        words.stream().map(String::toUpperCase);
        
        // Example 3: Get length
        // Lambda
        words.stream().map(w -> w.length());
        // Method reference
        words.stream().map(String::length);
        
        // Example 4: Parse integer
        List<String> numbers = Arrays.asList("1", "2", "3");
        // Lambda
        numbers.stream().map(s -> Integer.parseInt(s));
        // Method reference
        numbers.stream().map(Integer::parseInt);
        
        // Example 5: Check if even
        List<Integer> nums = Arrays.asList(1, 2, 3, 4, 5);
        Predicate<Integer> isEven = n -> n % 2 == 0;  // Lambda (no method ref possible)
    }
}
```

---

#### When to Use Method References

```
✅ USE METHOD REFERENCE when:
• Lambda only calls an existing method
• Makes code more readable
• No additional logic in lambda

Example:
  list.forEach(s -> System.out.println(s))  →  list.forEach(System.out::println)
  list.map(s -> s.length())                  →  list.map(String::length)
  list.map(s -> new Person(s))               →  list.map(Person::new)

❌ CANNOT USE METHOD REFERENCE when:
• Lambda has additional logic beyond method call
• Lambda modifies parameters before passing

Example:
  list.map(s -> s.toUpperCase() + "!")      // Cannot use method reference
  list.filter(n -> n > 0 && n < 100)        // Cannot use method reference
```

---

### Memory Trick

```
METHOD REFERENCE = "SHORTCUT TO SHORTCUT"

Lambda is shortcut for anonymous class
Method reference is shortcut for lambda

:: = "GO TO"

ClassName::method     → "Go to static method"
object::method        → "Go to instance method"
ClassName::new        → "Go to constructor"

Remember: Only when lambda JUST calls a method!
```

---


## Enumerations (Enums)

### Q45: What are Enums in Java? When should we use them?

**Answer:**

An **Enum** (enumeration) is a special class that represents a group of constants (unchangeable variables, like final variables). Enums are type-safe and more powerful than simple constants.

**Before Enums (Old Way):**

```java
// Using constants - NOT type-safe
public class Days {
    public static final int MONDAY = 1;
    public static final int TUESDAY = 2;
    public static final int WEDNESDAY = 3;
    // ...
}

// Problem: Can pass any integer
int day = 999;  // Invalid but compiles!
```

**With Enums (Better Way):**

```java
// Type-safe enumeration
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

// Usage
Day day = Day.MONDAY;  // Type-safe!
// Day day = 999;  // ❌ Compilation error
```

---

#### Basic Enum Usage

```java
enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

public class BasicEnumDemo {
    public static void main(String[] args) {
        Day today = Day.MONDAY;
        
        System.out.println("Today is: " + today);  // Output: MONDAY
        
        // Enum in switch
        switch (today) {
            case MONDAY:
                System.out.println("Start of work week");
                break;
            case FRIDAY:
                System.out.println("Almost weekend!");
                break;
            case SATURDAY:
            case SUNDAY:
                System.out.println("Weekend!");
                break;
            default:
                System.out.println("Midweek");
        }
        
        // Iterate over enum values
        System.out.println("\nAll days:");
        for (Day day : Day.values()) {
            System.out.println(day);
        }
        
        // Get enum by name
        Day friday = Day.valueOf("FRIDAY");
        System.out.println("Friday: " + friday);
        
        // Get ordinal (position)
        System.out.println("Monday ordinal: " + Day.MONDAY.ordinal());  // 0
    }
}
```

---

#### Enum with Fields and Methods

Enums can have constructors, fields, and methods!

```java
enum Size {
    SMALL("S", 10),
    MEDIUM("M", 20),
    LARGE("L", 30),
    EXTRA_LARGE("XL", 40);
    
    // Fields
    private final String abbreviation;
    private final int price;
    
    // Constructor (always private or package-private)
    Size(String abbreviation, int price) {
        this.abbreviation = abbreviation;
        this.price = price;
    }
    
    // Getters
    public String getAbbreviation() {
        return abbreviation;
    }
    
    public int getPrice() {
        return price;
    }
    
    // Method
    public String getDescription() {
        return String.format("%s (%s) - $%d", name(), abbreviation, price);
    }
}

public class EnumWithFieldsDemo {
    public static void main(String[] args) {
        Size mySize = Size.MEDIUM;
        
        System.out.println("Size: " + mySize);  // MEDIUM
        System.out.println("Abbreviation: " + mySize.getAbbreviation());  // M
        System.out.println("Price: $" + mySize.getPrice());  // $20
        System.out.println("Description: " + mySize.getDescription());
        
        // All sizes
        System.out.println("\nAll sizes:");
        for (Size size : Size.values()) {
            System.out.println(size.getDescription());
        }
    }
}
```

---

#### Real-World Example: Order Status

```java
enum OrderStatus {
    PENDING("Order received", false),
    CONFIRMED("Order confirmed", false),
    SHIPPED("Order shipped", false),
    DELIVERED("Order delivered", true),
    CANCELLED("Order cancelled", true);
    
    private final String description;
    private final boolean isFinal;
    
    OrderStatus(String description, boolean isFinal) {
        this.description = description;
        this.isFinal = isFinal;
    }
    
    public String getDescription() {
        return description;
    }
    
    public boolean isFinalStatus() {
        return isFinal;
    }
    
    public boolean canTransitionTo(OrderStatus newStatus) {
        if (this.isFinal) {
            return false;  // Cannot change from final status
        }
        
        // Define valid transitions
        switch (this) {
            case PENDING:
                return newStatus == CONFIRMED || newStatus == CANCELLED;
            case CONFIRMED:
                return newStatus == SHIPPED || newStatus == CANCELLED;
            case SHIPPED:
                return newStatus == DELIVERED;
            default:
                return false;
        }
    }
}

class Order {
    private String orderId;
    private OrderStatus status;
    
    public Order(String orderId) {
        this.orderId = orderId;
        this.status = OrderStatus.PENDING;
    }
    
    public void updateStatus(OrderStatus newStatus) {
        if (status.canTransitionTo(newStatus)) {
            System.out.println(orderId + ": " + status + " → " + newStatus);
            status = newStatus;
        } else {
            System.out.println("Invalid transition: " + status + " → " + newStatus);
        }
    }
    
    public void displayStatus() {
        System.out.println("Order " + orderId + ": " + status.getDescription());
    }
}

public class OrderStatusDemo {
    public static void main(String[] args) {
        Order order = new Order("ORD-001");
        
        order.displayStatus();  // Order received
        
        order.updateStatus(OrderStatus.CONFIRMED);  // Valid
        order.updateStatus(OrderStatus.SHIPPED);    // Valid
        order.updateStatus(OrderStatus.DELIVERED);  // Valid
        order.updateStatus(OrderStatus.CANCELLED);  // Invalid (already delivered)
    }
}
```

---

#### Enum with Abstract Methods

```java
enum Operation {
    PLUS {
        @Override
        public double apply(double x, double y) {
            return x + y;
        }
    },
    MINUS {
        @Override
        public double apply(double x, double y) {
            return x - y;
        }
    },
    MULTIPLY {
        @Override
        public double apply(double x, double y) {
            return x * y;
        }
    },
    DIVIDE {
        @Override
        public double apply(double x, double y) {
            if (y == 0) throw new ArithmeticException("Division by zero");
            return x / y;
        }
    };
    
    // Abstract method - each enum constant must implement
    public abstract double apply(double x, double y);
}

public class EnumAbstractMethodDemo {
    public static void main(String[] args) {
        double x = 10, y = 5;
        
        for (Operation op : Operation.values()) {
            System.out.printf("%f %s %f = %f%n", x, op, y, op.apply(x, y));
        }
        
        // Output:
        // 10.000000 PLUS 5.000000 = 15.000000
        // 10.000000 MINUS 5.000000 = 5.000000
        // 10.000000 MULTIPLY 5.000000 = 50.000000
        // 10.000000 DIVIDE 5.000000 = 2.000000
    }
}
```

---

#### Enum Implementing Interface

```java
interface Printable {
    void print();
}

enum Color implements Printable {
    RED("Red color"),
    GREEN("Green color"),
    BLUE("Blue color");
    
    private final String description;
    
    Color(String description) {
        this.description = description;
    }
    
    @Override
    public void print() {
        System.out.println(this.name() + ": " + description);
    }
}

public class EnumInterfaceDemo {
    public static void main(String[] args) {
        for (Color color : Color.values()) {
            color.print();
        }
    }
}
```

---

#### Built-in Enum Methods

```java
enum Planet {
    MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE
}

public class EnumMethodsDemo {
    public static void main(String[] args) {
        Planet earth = Planet.EARTH;
        
        // 1. name() - returns the name of enum constant
        System.out.println("Name: " + earth.name());  // EARTH
        
        // 2. ordinal() - returns position (starts from 0)
        System.out.println("Ordinal: " + earth.ordinal());  // 2
        
        // 3. values() - returns array of all enum constants
        Planet[] planets = Planet.values();
        System.out.println("Total planets: " + planets.length);  // 8
        
        // 4. valueOf() - converts string to enum
        Planet mars = Planet.valueOf("MARS");
        System.out.println("Mars: " + mars);
        
        // 5. compareTo() - compares based on ordinal
        int result = Planet.EARTH.compareTo(Planet.MARS);
        System.out.println("Earth compareTo Mars: " + result);  // negative (Earth comes before Mars)
        
        // 6. toString() - returns name (can be overridden)
        System.out.println("toString: " + earth.toString());  // EARTH
    }
}
```

---

#### Advantages of Enums

```
✅ ADVANTAGES:
• Type safety - cannot assign invalid values
• Namespace - constants grouped together
• Switch statement support
• Can have methods and fields
• Singleton guarantee (each constant is single instance)
• Thread-safe
• Cannot be subclassed
• Can implement interfaces
```

#### When to Use Enums

```
✅ USE ENUMS when:
• You have a fixed set of constants
• Values won't change at runtime
• Need type safety
• Examples: Days, Months, Status codes, Colors, Directions

❌ DON'T USE ENUMS when:
• Values need to be added dynamically
• Need inheritance (enums are final)
• Values come from database or external source
```

---

### Memory Trick

```
ENUM = "EXCLUSIVE NAMED UNCHANGEABLE MEMBERS"

Think: "FIXED LIST"
• Day: MONDAY, TUESDAY, ...
• Month: JANUARY, FEBRUARY, ...
• Direction: NORTH, SOUTH, EAST, WEST

Remember:
  • Each constant is a public static final instance
  • Enum constructor is always private
  • Cannot create new instances with 'new'
  • Type-safe replacement for constants
```

---

## Records (Java 14+)

### Q46: What are Records in Java? How are they different from regular classes?

**Answer:**

A **Record** is a special kind of class introduced in Java 14 (preview) and finalized in Java 16. Records are immutable data carriers that automatically provide implementations for `equals()`, `hashCode()`, `toString()`, and getters.

**Purpose:** Reduce boilerplate code for simple data holder classes (DTOs, Value Objects).

---

#### Before Records (Traditional Class)

```java
// Traditional class - lots of boilerplate
public class Person {
    private final String name;
    private final int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String getName() {
        return name;
    }
    
    public int getAge() {
        return age;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Person person = (Person) obj;
        return age == person.age && Objects.equals(name, person.name);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(name, age);
    }
    
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
}

// 40+ lines of code!
```

---

#### With Records (Java 16+)

```java
// Record - concise and clear
public record Person(String name, int age) {
    // That's it! Just 1 line!
}

// Automatically provides:
// - Constructor
// - Getters (name(), age())
// - equals()
// - hashCode()
// - toString()
```

---

#### Basic Record Usage

```java
record Point(int x, int y) { }

public class BasicRecordDemo {
    public static void main(String[] args) {
        // Create record instance
        Point p1 = new Point(10, 20);
        Point p2 = new Point(10, 20);
        Point p3 = new Point(30, 40);
        
        // Accessors (not getX(), just x())
        System.out.println("x: " + p1.x());  // 10
        System.out.println("y: " + p1.y());  // 20
        
        // toString() - automatically generated
        System.out.println(p1);  // Point[x=10, y=20]
        
        // equals() - content comparison
        System.out.println(p1.equals(p2));  // true (same values)
        System.out.println(p1.equals(p3));  // false
        
        // hashCode() - consistent with equals
        System.out.println(p1.hashCode() == p2.hashCode());  // true
        
        // Records are immutable - no setters!
        // p1.x = 50;  // ❌ Compilation error
    }
}
```

---

#### Record with Validation (Compact Constructor)

```java
record Employee(String name, double salary, int age) {
    // Compact constructor - for validation
    public Employee {
        if (salary < 0) {
            throw new IllegalArgumentException("Salary cannot be negative");
        }
        if (age < 18) {
            throw new IllegalArgumentException("Age must be at least 18");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be empty");
        }
    }
}

public class RecordValidationDemo {
    public static void main(String[] args) {
        // Valid
        Employee emp1 = new Employee("Alice", 50000, 25);
        System.out.println(emp1);
        
        // Invalid - throws exception
        try {
            Employee emp2 = new Employee("Bob", -5000, 30);
        } catch (IllegalArgumentException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
```

---

#### Record with Custom Methods

```java
record Rectangle(double width, double height) {
    
    // Compact constructor with normalization
    public Rectangle {
        if (width < 0 || height < 0) {
            throw new IllegalArgumentException("Dimensions must be positive");
        }
    }
    
    // Custom methods
    public double area() {
        return width * height;
    }
    
    public double perimeter() {
        return 2 * (width + height);
    }
    
    public boolean isSquare() {
        return width == height;
    }
}

public class RecordMethodsDemo {
    public static void main(String[] args) {
        Rectangle rect = new Rectangle(10, 20);
        
        System.out.println("Width: " + rect.width());
        System.out.println("Height: " + rect.height());
        System.out.println("Area: " + rect.area());
        System.out.println("Perimeter: " + rect.perimeter());
        System.out.println("Is square? " + rect.isSquare());
        
        Rectangle square = new Rectangle(15, 15);
        System.out.println("Is square? " + square.isSquare());  // true
    }
}
```

---

#### Record with Static Members

```java
record Product(String name, double price) {
    // Static fields
    private static final double TAX_RATE = 0.1;
    private static int productCount = 0;
    
    // Compact constructor
    public Product {
        productCount++;
    }
    
    // Instance method
    public double priceWithTax() {
        return price + (price * TAX_RATE);
    }
    
    // Static method
    public static int getProductCount() {
        return productCount;
    }
}

public class RecordStaticDemo {
    public static void main(String[] args) {
        Product p1 = new Product("Laptop", 999.99);
        Product p2 = new Product("Mouse", 29.99);
        
        System.out.println(p1.name() + ": $" + p1.priceWithTax());
        System.out.println("Total products created: " + Product.getProductCount());
    }
}
```

---

#### Record Implementing Interface

```java
interface Describable {
    String describe();
}

record Book(String title, String author, int pages) implements Describable {
    @Override
    public String describe() {
        return String.format("'%s' by %s (%d pages)", title, author, pages);
    }
}

public class RecordInterfaceDemo {
    public static void main(String[] args) {
        Book book = new Book("Effective Java", "Joshua Bloch", 416);
        System.out.println(book.describe());
    }
}
```

---

#### Nested Records

```java
record Address(String street, String city, String zipCode) { }

record Person(String name, int age, Address address) {
    public String getFullAddress() {
        return address.street() + ", " + address.city() + " " + address.zipCode();
    }
}

public class NestedRecordDemo {
    public static void main(String[] args) {
        Address addr = new Address("123 Main St", "New York", "10001");
        Person person = new Person("Alice", 30, addr);
        
        System.out.println(person);
        System.out.println("Full address: " + person.getFullAddress());
        
        // Access nested record
        System.out.println("City: " + person.address().city());
    }
}
```

---

#### Record Characteristics and Limitations

```
✅ RECORDS ARE:
• Immutable - all fields are final
• Compact - less boilerplate code
• Value-based - equality based on content
• Thread-safe - immutability ensures safety
• Automatically provide: constructor, accessors, equals(), hashCode(), toString()

❌ RECORDS CANNOT:
• Extend other classes (but can implement interfaces)
• Be extended (implicitly final)
• Have additional instance fields beyond component list
• Have field initializers
• Be abstract

✅ RECORDS CAN:
• Implement interfaces
• Have static fields and methods
• Have instance methods
• Have custom constructors
• Override equals(), hashCode(), toString()
• Be nested
```

---

#### Comparison: Class vs Record

| Feature | Regular Class | Record |
|---------|--------------|--------|
| **Purpose** | General-purpose | Data carrier (DTO) |
| **Mutability** | Can be mutable | Always immutable |
| **Boilerplate** | Must write manually | Auto-generated |
| **Inheritance** | Can extend classes | Cannot extend (final) |
| **Getters** | `getName()` | `name()` (field name) |
| **equals/hashCode** | Must implement | Auto-generated |
| **toString** | Must implement | Auto-generated |
| **Fields** | Can add fields | Only component fields |
| **Use case** | Complex logic | Simple data holders |

---

#### When to Use Records

```
✅ USE RECORDS for:
• DTOs (Data Transfer Objects)
• Value objects (immutable data)
• Return types from methods
• Configuration objects
• API responses
• Database entities (read-only)
• Method parameters (multiple values)

Example use cases:
  - record UserDTO(String username, String email)
  - record Point(int x, int y)
  - record ApiResponse(int status, String message, Object data)
  - record Config(String host, int port, boolean ssl)

❌ DON'T USE RECORDS for:
• Classes with mutable state
• Classes with complex business logic
• Classes that need inheritance
• JavaBeans (need setters)
• Entities that change over time
```

---

### Memory Trick

```
RECORD = "READ-ONLY EFFICIENT COMPACT DATA"

Think: "DATA BAG"
• Just holds data
• Cannot change (immutable)
• Automatic methods (equals, hashCode, toString)

Remember:
  record Person(String name, int age) { }
  
  • Parentheses = components (constructor parameters + fields)
  • Final by default
  • Accessor = field name() not getField()
  • Java 16+ feature
```

---

## Summary: Advanced OOP Concepts

### Topics Covered

**Q41: Inner Classes (Nested Classes)**
- Member Inner Class
- Static Nested Class
- Local Inner Class
- Anonymous Inner Class

**Q42: Anonymous Classes**
- Syntax and usage
- Real-world examples
- Anonymous vs Lambda

**Q43: Lambda Expressions**
- Functional interfaces
- Syntax variations
- Built-in functional interfaces
- Real-world examples

**Q44: Method References**
- Static method reference
- Instance method reference
- Constructor reference
- Lambda vs Method Reference

**Q45: Enums**
- Basic enums
- Enums with fields and methods
- Enum with abstract methods
- When to use enums

**Q46: Records (Java 16+)**
- Record basics
- Compact constructor
- Records vs Classes
- When to use records

---

### Quick Reference Guide

```
INNER CLASSES = Encapsulation and organization
  • Member → Has outer instance access
  • Static → Independent from outer instance
  • Local → Method-scoped
  • Anonymous → One-time use

LAMBDA = Functional programming
  (params) -> expression
  • Only for functional interfaces
  • Replaces anonymous classes

METHOD REFERENCE = Lambda shorthand
  ClassName::method
  • Only when lambda just calls a method

ENUM = Type-safe constants
  enum Day { MONDAY, TUESDAY, ... }
  • Fixed set of values
  • Can have methods and fields

RECORD = Immutable data carrier
  record Person(String name, int age) { }
  • Auto-generates boilerplate
  • Java 16+ feature
```

---

**End of Advanced OOP Concepts**

Continue to other Java topics:
- [← Back to Class & Object Fundamentals](./OOP_Class_Object_Fundamentals.md)
- [← Back to Main OOP Questions](./OOP_Interview_Questions.md)
- [→ Next: Java 8-21 Features](../java8-21-features/)

---
