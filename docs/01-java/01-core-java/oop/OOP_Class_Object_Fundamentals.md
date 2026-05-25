# Class & Object Fundamentals - Java OOP Interview Questions

**Part of Java OOP Interview Preparation Series**

This document covers fundamental concepts about Classes and Objects in Java.

---

## Table of Contents

- Classes and Objects Basics
- Constructors
- `this` keyword
- `static` keyword
- Object class methods
- Memory management (Stack vs Heap)

---

## Classes and Objects Basics

### Q36: What is a Class and what is an Object? How are they different?

**Answer:**

A **Class** is a blueprint or template, while an **Object** is an instance created from that blueprint.

**Visual Analogy:**

```
╔═══════════════════════════════════════════════════════╗
║         CLASS = BLUEPRINT                             ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  📋 Car Blueprint (Class)                             ║
║  ┌─────────────────────────────┐                     ║
║  │ Properties:                 │                     ║
║  │  - brand                    │                     ║
║  │  - model                    │                     ║
║  │  - color                    │                     ║
║  │  - speed                    │                     ║
║  │                             │                     ║
║  │ Methods:                    │                     ║
║  │  - start()                  │                     ║
║  │  - accelerate()             │                     ║
║  │  - brake()                  │                     ║
║  └─────────────────────────────┘                     ║
║                                                       ║
║  One blueprint, many cars can be built from it!      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════╗
║         OBJECT = ACTUAL INSTANCE                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  🚗 Car Object 1          🚙 Car Object 2             ║
║  brand: "Toyota"          brand: "Honda"              ║
║  model: "Camry"           model: "Accord"             ║
║  color: "Red"             color: "Blue"               ║
║  speed: 0                 speed: 0                    ║
║                                                       ║
║  Each object has its OWN data!                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Key Differences:**

| Aspect | Class | Object |
|--------|-------|--------|
| **What is it?** | Blueprint/Template | Actual instance |
| **Memory** | No memory allocated | Memory allocated in heap |
| **Existence** | Logical entity | Physical entity |
| **Declaration** | Once | Multiple instances possible |
| **Keyword** | `class` | `new` |
| **Example** | `class Car { }` | `Car myCar = new Car();` |
| **Contains** | Variables + Methods (definitions) | Variables + Methods (with actual values) |

**Code Example:**

```java
// CLASS - Blueprint
class Car {
    // Instance variables (properties/attributes)
    String brand;
    String model;
    String color;
    int speed;

    // Constructor
    public Car(String brand, String model, String color) {
        this.brand = brand;
        this.model = model;
        this.color = color;
        this.speed = 0;
    }

    // Methods (behaviors)
    public void start() {
        System.out.println(brand + " " + model + " started!");
    }

    public void accelerate(int increment) {
        speed += increment;
        System.out.println("Speed: " + speed + " km/h");
    }

    public void displayInfo() {
        System.out.println("Car: " + brand + " " + model + " (" + color + ")");
    }
}

// OBJECTS - Actual instances
public class ClassObjectDemo {
    public static void main(String[] args) {
        // Create Object 1
        Car car1 = new Car("Toyota", "Camry", "Red");
        car1.displayInfo();  // Output: Car: Toyota Camry (Red)
        car1.start();        // Output: Toyota Camry started!
        car1.accelerate(50); // Output: Speed: 50 km/h

        // Create Object 2
        Car car2 = new Car("Honda", "Accord", "Blue");
        car2.displayInfo();  // Output: Car: Honda Accord (Blue)
        car2.start();        // Output: Honda Accord started!
        car2.accelerate(70); // Output: Speed: 70 km/h

        // Each object has independent data
        System.out.println("Car1 speed: " + car1.speed);  // 50
        System.out.println("Car2 speed: " + car2.speed);  // 70
    }
}
```

**Memory Representation:**

```
MEMORY LAYOUT:

Class Area (Method Area/Metaspace):
┌──────────────────────────────┐
│  Car.class                   │
│  - brand (definition)        │
│  - model (definition)        │
│  - color (definition)        │
│  - speed (definition)        │
│  - start() (code)            │
│  - accelerate() (code)       │
│  - displayInfo() (code)      │
└──────────────────────────────┘
         ↓ (creates instances)

Heap Memory:
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  Object 1 (car1)             │    │  Object 2 (car2)             │
│  brand: "Toyota"             │    │  brand: "Honda"              │
│  model: "Camry"              │    │  model: "Accord"             │
│  color: "Red"                │    │  color: "Blue"               │
│  speed: 50                   │    │  speed: 70                   │
└──────────────────────────────┘    └──────────────────────────────┘

Stack Memory:
┌──────────────────────────────┐
│  car1 → (reference to Object 1 in heap)
│  car2 → (reference to Object 2 in heap)
└──────────────────────────────┘
```

**Real-World Analogies:**

```
Class = Cookie Cutter 🍪
Object = Actual Cookie

Class = House Blueprint 🏗️
Object = Actual House

Class = Student Form Template 📋
Object = Filled Form for each student
```

**Important Concepts:**

```java
// 1. One class, multiple objects
Car car1 = new Car("Toyota", "Camry", "Red");
Car car2 = new Car("Honda", "Accord", "Blue");
Car car3 = new Car("BMW", "X5", "Black");
// All from the same Car class!

// 2. Objects are independent
car1.speed = 100;
car2.speed = 80;
// Changing car1 does NOT affect car2

// 3. Class is loaded once, objects created many times
// Car.class loaded into memory once
// car1, car2, car3 are separate instances in heap
```

**Memory Trick:**

```
CLASS = "Recipe Book" 📖
  • Instructions on how to make something
  • Doesn't take up kitchen space
  • One recipe, many dishes

OBJECT = "Actual Dish" 🍝
  • Made following the recipe
  • Takes up actual space on the table
  • Each dish is independent
```

---

### Q37: What is a Constructor? What are its types?

**Answer:**

A **Constructor** is a special method used to initialize objects. It's called automatically when an object is created using the `new` keyword.

**Constructor Characteristics:**

```
╔═══════════════════════════════════════════════════════╗
║         CONSTRUCTOR PROPERTIES                        ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  ✅ Same name as class                               ║
║  ✅ No return type (not even void)                   ║
║  ✅ Called automatically when object is created      ║
║  ✅ Used to initialize object state                  ║
║  ✅ Can be overloaded (multiple constructors)        ║
║  ❌ Cannot be abstract, static, or final             ║
║  ❌ Cannot be inherited                              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Types of Constructors:**

**1. Default Constructor (No-Argument Constructor)**

A constructor with no parameters. If you don't write any constructor, Java provides one automatically.

```java
class Student {
    String name;
    int age;

    // Default constructor (provided by Java if you don't write one)
    public Student() {
        name = "Unknown";
        age = 0;
        System.out.println("Default constructor called");
    }
}

// Usage
public class DefaultConstructorDemo {
    public static void main(String[] args) {
        Student s1 = new Student();  // Calls default constructor
        System.out.println("Name: " + s1.name);  // Output: Unknown
        System.out.println("Age: " + s1.age);    // Output: 0
    }
}
```

**Automatic Default Constructor:**

```java
// If you write this:
class Person {
    String name;
}

// Java automatically provides this:
class Person {
    String name;

    public Person() {  // Auto-generated by compiler
        super();  // Calls Object class constructor
    }
}

// But if you write ANY constructor yourself:
class Person {
    String name;

    public Person(String name) {
        this.name = name;
    }
    // Java will NOT provide default constructor!
}

// This will cause error:
Person p = new Person();  // ❌ ERROR! No default constructor
```

**2. Parameterized Constructor**

A constructor that accepts parameters to initialize object with specific values.

```java
class Employee {
    String name;
    int employeeId;
    double salary;

    // Parameterized constructor
    public Employee(String name, int employeeId, double salary) {
        this.name = name;
        this.employeeId = employeeId;
        this.salary = salary;
        System.out.println("Parameterized constructor called");
    }

    public void display() {
        System.out.println("ID: " + employeeId + ", Name: " + name +
                          ", Salary: $" + salary);
    }
}

// Usage
public class ParameterizedConstructorDemo {
    public static void main(String[] args) {
        Employee emp1 = new Employee("Alice", 101, 50000);
        Employee emp2 = new Employee("Bob", 102, 60000);

        emp1.display();  // Output: ID: 101, Name: Alice, Salary: $50000
        emp2.display();  // Output: ID: 102, Name: Bob, Salary: $60000
    }
}
```

**3. Copy Constructor**

A constructor that creates a new object as a copy of an existing object.

**Note:** Java doesn't have built-in copy constructors like C++, but we can implement them.

```java
class Book {
    String title;
    String author;
    double price;

    // Parameterized constructor
    public Book(String title, String author, double price) {
        this.title = title;
        this.author = author;
        this.price = price;
    }

    // Copy constructor - takes another Book object
    public Book(Book other) {
        this.title = other.title;
        this.author = other.author;
        this.price = other.price;
        System.out.println("Copy constructor called");
    }

    public void display() {
        System.out.println("Title: " + title + ", Author: " + author +
                          ", Price: $" + price);
    }
}

// Usage
public class CopyConstructorDemo {
    public static void main(String[] args) {
        Book original = new Book("Java Programming", "James Gosling", 49.99);

        // Create a copy using copy constructor
        Book copy = new Book(original);

        original.display();  // Output: Title: Java Programming, Author: James Gosling, Price: $49.99
        copy.display();      // Output: Title: Java Programming, Author: James Gosling, Price: $49.99

        // Modify copy - doesn't affect original
        copy.price = 39.99;

        System.out.println("\nAfter modifying copy:");
        original.display();  // Output: Price: $49.99 (unchanged)
        copy.display();      // Output: Price: $39.99 (changed)
    }
}
```

**Constructor Overloading:**

Having multiple constructors with different parameters in the same class.

```java
class Product {
    String name;
    double price;
    int quantity;

    // 1. Default constructor
    public Product() {
        this.name = "Unknown Product";
        this.price = 0.0;
        this.quantity = 0;
    }

    // 2. Constructor with name only
    public Product(String name) {
        this.name = name;
        this.price = 0.0;
        this.quantity = 0;
    }

    // 3. Constructor with name and price
    public Product(String name, double price) {
        this.name = name;
        this.price = price;
        this.quantity = 0;
    }

    // 4. Constructor with all parameters
    public Product(String name, double price, int quantity) {
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    public void display() {
        System.out.println("Product: " + name + ", Price: $" + price +
                          ", Qty: " + quantity);
    }
}

// Usage
public class ConstructorOverloadingDemo {
    public static void main(String[] args) {
        Product p1 = new Product();
        Product p2 = new Product("Laptop");
        Product p3 = new Product("Phone", 999.99);
        Product p4 = new Product("Tablet", 499.99, 10);

        p1.display();  // Output: Product: Unknown Product, Price: $0.0, Qty: 0
        p2.display();  // Output: Product: Laptop, Price: $0.0, Qty: 0
        p3.display();  // Output: Product: Phone, Price: $999.99, Qty: 0
        p4.display();  // Output: Product: Tablet, Price: $499.99, Qty: 10
    }
}
```

**Constructor Chaining with `this()`:**

Calling one constructor from another constructor in the same class.

```java
class Account {
    String accountNumber;
    String holderName;
    double balance;

    // Constructor 1 - Minimum parameters
    public Account(String accountNumber) {
        this(accountNumber, "Unknown", 0.0);  // Call constructor 3
        System.out.println("Constructor 1 called");
    }

    // Constructor 2 - Two parameters
    public Account(String accountNumber, String holderName) {
        this(accountNumber, holderName, 0.0);  // Call constructor 3
        System.out.println("Constructor 2 called");
    }

    // Constructor 3 - All parameters (main constructor)
    public Account(String accountNumber, String holderName, double balance) {
        this.accountNumber = accountNumber;
        this.holderName = holderName;
        this.balance = balance;
        System.out.println("Constructor 3 called");
    }

    public void display() {
        System.out.println("Account: " + accountNumber + ", Holder: " +
                          holderName + ", Balance: $" + balance);
    }
}

// Usage
public class ConstructorChainingDemo {
    public static void main(String[] args) {
        System.out.println("Creating account1:");
        Account account1 = new Account("ACC001");
        // Output:
        // Constructor 3 called
        // Constructor 1 called

        System.out.println("\nCreating account2:");
        Account account2 = new Account("ACC002", "Alice");
        // Output:
        // Constructor 3 called
        // Constructor 2 called

        System.out.println("\nCreating account3:");
        Account account3 = new Account("ACC003", "Bob", 5000.0);
        // Output:
        // Constructor 3 called

        account1.display();
        account2.display();
        account3.display();
    }
}
```

**Important Rules:**

```
Constructor Rules:
┌────────────────────────────────────────────────┐
│  ✅ DO:                                        │
│  • Same name as class                          │
│  • Can have any access modifier                │
│  • Can be overloaded                           │
│  • Can call other constructors with this()     │
│  • this() must be FIRST statement              │
│                                                │
│  ❌ DON'T:                                     │
│  • Add return type (not even void)             │
│  • Make it static, final, or abstract          │
│  • Call constructor after first statement      │
│  • Use super() and this() together             │
│                                                │
└────────────────────────────────────────────────┘
```

**Common Mistakes:**

```java
// ❌ MISTAKE 1: Adding return type
public void Student() {  // This is NOT a constructor - it's a method!
    // ...
}

// ✅ CORRECT:
public Student() {  // Constructor - no return type
    // ...
}

// ❌ MISTAKE 2: this() not as first statement
public Student(String name, int age) {
    System.out.println("Creating student");  // Statement before this()
    this(name);  // ❌ ERROR! this() must be first
}

// ✅ CORRECT:
public Student(String name, int age) {
    this(name);  // First statement
    System.out.println("Creating student");  // Now OK
}

// ❌ MISTAKE 3: Using both super() and this()
public Student(String name) {
    super();  // Call parent constructor
    this(name, 0);  // ❌ ERROR! Can't use both
}

// ✅ CORRECT: Use only one
public Student(String name) {
    this(name, 0);  // Only this()
}
```

**Constructor vs Method Comparison:**

| Feature | Constructor | Method |
|---------|-------------|--------|
| **Name** | Same as class | Any valid name |
| **Return Type** | No return type | Must have return type |
| **Invocation** | Automatically on object creation | Explicitly called |
| **Purpose** | Initialize object | Perform operations |
| **Keyword** | None | Can be static, abstract, final |
| **Inheritance** | Not inherited | Inherited |

**Memory Trick:**

```
CONSTRUCTOR = "Birth Certificate" 🏥
  • Created when object is "born" (new)
  • Sets up initial identity (values)
  • Can only happen during creation
  • No return - just initialization

Types to remember:
  DEFAULT = "Standard birth"
  PARAMETERIZED = "Custom birth details"
  COPY = "Twin birth (copying another)"
```

---

### Q38: What is the `this` keyword in Java?

**Answer:**

The `this` keyword is a reference variable that refers to the **current object** - the object whose method or constructor is being called.

**Visual Representation:**

```
╔═══════════════════════════════════════════════════════╗
║         "this" = "ME" (current object)                ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  When car1.start() is called:                         ║
║  • "this" inside start() refers to car1               ║
║                                                       ║
║  When car2.start() is called:                         ║
║  • "this" inside start() refers to car2               ║
║                                                       ║
║  Think: "this" = the object calling the method        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Uses of `this` keyword:**

**1. Distinguish between instance variables and parameters**

```java
class Person {
    String name;
    int age;

    // Without this - confusing! ❌
    public Person(String name, int age) {
        name = name;  // ❌ Which name? Parameter assigns to itself!
        age = age;    // ❌ Same problem
    }

    // With this - clear! ✅
    public Person(String name, int age) {
        this.name = name;  // ✅ this.name = instance variable
                          //    name = parameter
        this.age = age;
    }
}
```

**2. Call current class method**

```java
class Calculator {
    private int result;

    public void add(int a, int b) {
        result = a + b;
        display();  // Same as: this.display()
    }

    public void multiply(int a, int b) {
        result = a * b;
        this.display();  // Explicitly using this
    }

    private void display() {
        System.out.println("Result: " + result);
    }
}
```

**3. Call current class constructor (constructor chaining)**

```java
class Employee {
    String name;
    int id;
    double salary;

    // Constructor 1
    public Employee() {
        this("Unknown", 0, 0.0);  // Call constructor 3
    }

    // Constructor 2
    public Employee(String name, int id) {
        this(name, id, 0.0);  // Call constructor 3
    }

    // Constructor 3
    public Employee(String name, int id, double salary) {
        this.name = name;
        this.id = id;
        this.salary = salary;
    }
}
```

**4. Pass current object as parameter**

```java
class Button {
    String label;

    public Button(String label) {
        this.label = label;
    }

    public void click() {
        EventHandler handler = new EventHandler();
        handler.handle(this);  // Pass current Button object
    }
}

class EventHandler {
    public void handle(Button button) {
        System.out.println("Button clicked: " + button.label);
    }
}

// Usage
public class PassThisDemo {
    public static void main(String[] args) {
        Button submitButton = new Button("Submit");
        submitButton.click();  // Output: Button clicked: Submit
    }
}
```

**5. Return current object (method chaining)**

```java
class StringBuilder2 {
    private String value = "";

    public StringBuilder2 append(String str) {
        value += str;
        return this;  // Return current object
    }

    public StringBuilder2 appendLine(String str) {
        value += str + "\n";
        return this;  // Return current object
    }

    public String build() {
        return value;
    }
}

// Usage - Method chaining
public class MethodChainingDemo {
    public static void main(String[] args) {
        StringBuilder2 sb = new StringBuilder2();

        // Method chaining - possible because methods return this
        String result = sb.append("Hello")
                         .append(" ")
                         .append("World")
                         .appendLine("!")
                         .append("Java is awesome")
                         .build();

        System.out.println(result);
        // Output:
        // Hello World!
        // Java is awesome
    }
}
```

**Complete Example:**

```java
class BankAccount {
    private String accountNumber;
    private String holderName;
    private double balance;

    // Use 1: Distinguish parameters from instance variables
    public BankAccount(String accountNumber, String holderName, double balance) {
        this.accountNumber = accountNumber;
        this.holderName = holderName;
        this.balance = balance;
    }

    // Use 2: Call another constructor
    public BankAccount(String accountNumber, String holderName) {
        this(accountNumber, holderName, 0.0);
    }

    // Use 3: Return current object for chaining
    public BankAccount deposit(double amount) {
        this.balance += amount;
        this.logTransaction("Deposit");  // Use 4: Call current class method
        return this;  // Use 5: Return current object
    }

    public BankAccount withdraw(double amount) {
        this.balance -= amount;
        this.logTransaction("Withdrawal");
        return this;
    }

    private void logTransaction(String type) {
        System.out.println(type + " completed. Balance: $" + this.balance);
    }

    // Use 6: Pass current object to another method
    public void transfer(BankAccount targetAccount, double amount) {
        this.withdraw(amount);
        targetAccount.receiveTransfer(this, amount);
    }

    public void receiveTransfer(BankAccount sourceAccount, double amount) {
        this.deposit(amount);
        System.out.println("Transfer received from " + sourceAccount.accountNumber);
    }

    public void display() {
        System.out.println("Account: " + accountNumber +
                          ", Holder: " + holderName +
                          ", Balance: $" + balance);
    }
}

// Usage
public class ThisKeywordDemo {
    public static void main(String[] args) {
        BankAccount account1 = new BankAccount("ACC001", "Alice", 1000);
        BankAccount account2 = new BankAccount("ACC002", "Bob");

        // Method chaining using this
        account1.deposit(500)
               .deposit(200)
               .withdraw(100);

        account1.display();  // Output: Account: ACC001, Holder: Alice, Balance: $1600

        // Transfer using this
        account1.transfer(account2, 300);

        account1.display();  // Output: Balance: $1300
        account2.display();  // Output: Balance: $300
    }
}
```

**Important Points:**

```
this Keyword Rules:
┌────────────────────────────────────────────────┐
│  ✅ CAN be used in:                            │
│  • Instance methods                            │
│  • Constructors                                │
│                                                │
│  ❌ CANNOT be used in:                         │
│  • Static methods (no current object)          │
│  • Static blocks                               │
│                                                │
│  • this() must be FIRST statement in           │
│    constructor                                 │
│  • Cannot use super() and this() together      │
│                                                │
└────────────────────────────────────────────────┘
```

**Common Use Cases Summary:**

```java
class Example {
    int x;

    // Use case 1: Resolve naming conflict
    public Example(int x) {
        this.x = x;
    }

    // Use case 2: Call current class method
    public void method1() {
        this.method2();
    }

    private void method2() {
        System.out.println("Method 2");
    }

    // Use case 3: Constructor chaining
    public Example() {
        this(0);
    }

    // Use case 4: Return current object
    public Example setValue(int x) {
        this.x = x;
        return this;
    }

    // Use case 5: Pass current object
    public void processMe() {
        Processor p = new Processor();
        p.process(this);
    }
}
```

**Memory Trick:**

```
"this" = "ME" / "MYSELF"

When you say "I am eating":
  • "I" refers to YOU (the person speaking)

When object says "this.name":
  • "this" refers to THAT OBJECT (the object executing)

Remember:
  this.field → MY field
  this.method() → MY method
  this() → Call MY other constructor
  return this → Return ME (for chaining)
```

---


### Q39: What is the `static` keyword in Java? Explain static variables, methods, and blocks.

**Answer:**

The `static` keyword indicates that a member belongs to the **class itself** rather than to any specific instance (object) of the class. Static members are shared across all instances.

**Visual Representation:**

```
╔═══════════════════════════════════════════════════════╗
║         INSTANCE vs STATIC                            ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INSTANCE (Non-static):                               ║
║  Each object has its OWN copy                         ║
║                                                       ║
║  Car car1:  brand="Toyota"                            ║
║  Car car2:  brand="Honda"                             ║
║  (Different values for each object)                   ║
║                                                       ║
║  ──────────────────────────────────────────────────   ║
║                                                       ║
║  STATIC:                                              ║
║  ONE copy SHARED by all objects                       ║
║                                                       ║
║  Car.wheels = 4                                       ║
║  (Same value for ALL Car objects)                     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

#### 1. Static Variables (Class Variables)

A static variable is shared by all instances of the class. Only one copy exists in memory.

```java
class Employee {
    // Instance variables - each employee has their own
    String name;
    int employeeId;
    
    // Static variable - shared by ALL employees
    static String companyName = "Tech Corp";
    static int employeeCount = 0;
    
    public Employee(String name, int employeeId) {
        this.name = name;
        this.employeeId = employeeId;
        employeeCount++;  // Increment shared counter
    }
    
    public void displayInfo() {
        System.out.println("ID: " + employeeId + 
                          ", Name: " + name + 
                          ", Company: " + companyName);
    }
}

public class StaticVariableDemo {
    public static void main(String[] args) {
        System.out.println("Initial count: " + Employee.employeeCount);  // 0
        
        Employee emp1 = new Employee("Alice", 101);
        Employee emp2 = new Employee("Bob", 102);
        Employee emp3 = new Employee("Charlie", 103);
        
        // Access static variable through class name (preferred)
        System.out.println("Total employees: " + Employee.employeeCount);  // 3
        
        // Can also access through instance (not recommended)
        System.out.println("Total employees: " + emp1.employeeCount);  // 3
        
        // Change static variable - affects ALL instances
        Employee.companyName = "New Tech Corp";
        
        emp1.displayInfo();  // Company: New Tech Corp
        emp2.displayInfo();  // Company: New Tech Corp (changed for all!)
        emp3.displayInfo();  // Company: New Tech Corp
    }
}
```

**Memory Layout:**

```
CLASS AREA (Method Area):
┌─────────────────────────────┐
│  Employee.class             │
│  ┌───────────────────────┐  │
│  │ Static Variables:     │  │
│  │ companyName = "..."   │  │ ← ONE copy for all
│  │ employeeCount = 3     │  │
│  └───────────────────────┘  │
└─────────────────────────────┘

HEAP MEMORY:
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ emp1:               │  │ emp2:               │  │ emp3:               │
│ name = "Alice"      │  │ name = "Bob"        │  │ name = "Charlie"    │
│ employeeId = 101    │  │ employeeId = 102    │  │ employeeId = 103    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
  (Each has own copy)      (Each has own copy)      (Each has own copy)
```

---

#### 2. Static Methods (Class Methods)

Static methods belong to the class and can be called without creating an object.

```java
class MathUtils {
    // Static method - belongs to class
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static int multiply(int a, int b) {
        return a * b;
    }
    
    public static double calculateCircleArea(double radius) {
        return Math.PI * radius * radius;
    }
}

public class StaticMethodDemo {
    public static void main(String[] args) {
        // Call static method using class name (no object needed)
        int sum = MathUtils.add(5, 3);
        System.out.println("Sum: " + sum);  // Output: Sum: 8
        
        int product = MathUtils.multiply(4, 7);
        System.out.println("Product: " + product);  // Output: Product: 28
        
        double area = MathUtils.calculateCircleArea(5.0);
        System.out.println("Area: " + area);  // Output: Area: 78.53...
        
        // No need to create object!
        // MathUtils utils = new MathUtils();  // Not necessary
    }
}
```

**Restrictions on Static Methods:**

```java
class Example {
    int instanceVar = 10;
    static int staticVar = 20;
    
    // Static method
    public static void staticMethod() {
        // ✅ Can access static variables
        System.out.println(staticVar);
        
        // ❌ CANNOT access instance variables
        // System.out.println(instanceVar);  // Compilation error!
        
        // ❌ CANNOT use 'this' keyword
        // System.out.println(this.instanceVar);  // Compilation error!
        
        // ❌ CANNOT call instance methods directly
        // instanceMethod();  // Compilation error!
        
        // ✅ Can call other static methods
        anotherStaticMethod();
    }
    
    public static void anotherStaticMethod() {
        System.out.println("Another static method");
    }
    
    // Instance method
    public void instanceMethod() {
        // ✅ Can access both static and instance members
        System.out.println(instanceVar);  // OK
        System.out.println(staticVar);    // OK
        staticMethod();                   // OK
    }
}
```

**Why These Restrictions?**

```
┌────────────────────────────────────────────────┐
│  Static methods run WITHOUT an object          │
├────────────────────────────────────────────────┤
│                                                │
│  Static method called: Example.staticMethod()  │
│  • No object exists yet!                       │
│  • instanceVar belongs to an object            │
│  • Which object's instanceVar to use? ❌       │
│  • staticVar belongs to class ✅               │
│                                                │
│  Think: "Can't access personal belongings      │
│          when no person exists"                │
│                                                │
└────────────────────────────────────────────────┘
```

---

#### 3. Static Blocks (Static Initializers)

Static blocks are used to initialize static variables and run code when the class is loaded.

```java
class Database {
    static String connectionUrl;
    static String username;
    static int maxConnections;
    
    // Static block - runs ONCE when class is loaded
    static {
        System.out.println("Static block 1: Initializing database config");
        connectionUrl = "jdbc:mysql://localhost:3306/mydb";
        username = "admin";
        maxConnections = 10;
    }
    
    // Can have multiple static blocks - executed in order
    static {
        System.out.println("Static block 2: Setting up connection pool");
        // Additional initialization
    }
    
    public static void connect() {
        System.out.println("Connecting to: " + connectionUrl);
    }
}

public class StaticBlockDemo {
    public static void main(String[] args) {
        System.out.println("Before accessing Database class");
        
        // Static blocks run when class is FIRST accessed
        Database.connect();
        // Output:
        // Static block 1: Initializing database config
        // Static block 2: Setting up connection pool
        // Connecting to: jdbc:mysql://localhost:3306/mydb
        
        Database.connect();  // Static blocks DON'T run again
        // Output:
        // Connecting to: jdbc:mysql://localhost:3306/mydb
    }
}
```

**Execution Order:**

```java
class InitializationOrder {
    // 1. Static variables initialized
    static int staticVar = 100;
    
    // 2. Static block executed
    static {
        System.out.println("Static block executed");
        staticVar = 200;
    }
    
    // 3. Instance variables initialized (when object created)
    int instanceVar = 10;
    
    // 4. Instance initializer block (when object created)
    {
        System.out.println("Instance block executed");
        instanceVar = 20;
    }
    
    // 5. Constructor (when object created)
    public InitializationOrder() {
        System.out.println("Constructor executed");
        instanceVar = 30;
    }
    
    public static void main(String[] args) {
        System.out.println("Main method started");
        
        // Class loading triggers static initialization
        System.out.println("Static var: " + InitializationOrder.staticVar);
        
        // Object creation triggers instance initialization
        InitializationOrder obj1 = new InitializationOrder();
        System.out.println("Instance var: " + obj1.instanceVar);
        
        System.out.println("\nCreating second object:");
        InitializationOrder obj2 = new InitializationOrder();
    }
}

/* Output:
Static block executed
Main method started
Static var: 200
Instance block executed
Constructor executed
Instance var: 30

Creating second object:
Instance block executed
Constructor executed
*/
```

---

#### 4. Complete Example - Counter Application

```java
class Counter {
    // Instance variable - each counter has its own count
    private int instanceCount = 0;
    
    // Static variable - shared across all counters
    private static int totalCount = 0;
    
    // Static block - initialize static data
    static {
        System.out.println("Counter class loaded!");
        totalCount = 0;
    }
    
    // Instance method
    public void increment() {
        instanceCount++;
        totalCount++;
    }
    
    public void displayCount() {
        System.out.println("Instance count: " + instanceCount + 
                          ", Total count: " + totalCount);
    }
    
    // Static method
    public static void displayTotalCount() {
        System.out.println("Total count across all counters: " + totalCount);
        // Cannot access instanceCount here!
    }
    
    // Static method to reset total count
    public static void resetTotal() {
        totalCount = 0;
    }
}

public class CounterDemo {
    public static void main(String[] args) {
        Counter c1 = new Counter();
        Counter c2 = new Counter();
        
        c1.increment();
        c1.increment();
        c1.increment();
        
        c2.increment();
        c2.increment();
        
        c1.displayCount();  // Instance: 3, Total: 5
        c2.displayCount();  // Instance: 2, Total: 5
        
        Counter.displayTotalCount();  // Total: 5
        
        Counter.resetTotal();
        Counter.displayTotalCount();  // Total: 0
    }
}
```

---

#### 5. Real-World Use Cases

**Singleton Pattern:**

```java
class DatabaseConnection {
    // Static variable to hold single instance
    private static DatabaseConnection instance;
    
    // Private constructor - prevents external instantiation
    private DatabaseConnection() {
        System.out.println("Database connection established");
    }
    
    // Static method to get instance
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
    
    public void query(String sql) {
        System.out.println("Executing: " + sql);
    }
}

public class SingletonDemo {
    public static void main(String[] args) {
        // Get same instance every time
        DatabaseConnection db1 = DatabaseConnection.getInstance();
        DatabaseConnection db2 = DatabaseConnection.getInstance();
        
        System.out.println(db1 == db2);  // true - same object
        
        db1.query("SELECT * FROM users");
    }
}
```

**Utility Classes:**

```java
class StringUtils {
    // Private constructor - prevent instantiation
    private StringUtils() {
        throw new AssertionError("Utility class cannot be instantiated");
    }
    
    // Static utility methods
    public static boolean isEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }
    
    public static String reverse(String str) {
        if (isEmpty(str)) return str;
        return new StringBuilder(str).reverse().toString();
    }
    
    public static String capitalize(String str) {
        if (isEmpty(str)) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }
}

// Usage - no object needed
public class UtilityDemo {
    public static void main(String[] args) {
        System.out.println(StringUtils.isEmpty(""));      // true
        System.out.println(StringUtils.reverse("hello")); // olleh
        System.out.println(StringUtils.capitalize("jAvA")); // Java
    }
}
```

**Constants:**

```java
class Constants {
    // Static final variables - constants
    public static final double PI = 3.14159;
    public static final int MAX_USERS = 100;
    public static final String APP_NAME = "MyApp";
    
    // Private constructor
    private Constants() {}
}

// Usage
public class ConstantsDemo {
    public static void main(String[] args) {
        double area = Constants.PI * 5 * 5;
        System.out.println("Max users allowed: " + Constants.MAX_USERS);
    }
}
```

---

#### 6. Static Import

Import static members to use them without class name prefix.

```java
import static java.lang.Math.*;  // Import all static members
import static java.lang.System.out;  // Import specific static member

public class StaticImportDemo {
    public static void main(String[] args) {
        // Without static import:
        // double result = Math.sqrt(16);
        // System.out.println(result);
        
        // With static import:
        double result = sqrt(16);  // No Math. prefix
        out.println(result);       // No System. prefix
        
        out.println("Max: " + max(10, 20));
        out.println("Random: " + random());
    }
}
```

---

### Comparison Table: Instance vs Static

| Feature | Instance (Non-static) | Static |
|---------|----------------------|--------|
| **Belongs to** | Individual objects | Class itself |
| **Memory** | New copy for each object | Single copy shared |
| **Access** | Requires object | Through class name |
| **Keyword** | None | `static` |
| **Can access** | Both instance and static members | Only static members |
| **Use `this`?** | ✅ Yes | ❌ No |
| **Initialized** | When object created | When class loaded |
| **Example** | `car.brand` | `Math.PI` |

---

### Common Interview Questions

**Q: Can we override static methods?**
**A:** No! Static methods belong to the class, not objects. You can have a method with the same signature in a subclass (method hiding), but it's NOT overriding.

```java
class Parent {
    public static void display() {
        System.out.println("Parent static method");
    }
}

class Child extends Parent {
    // This is method HIDING, not overriding
    public static void display() {
        System.out.println("Child static method");
    }
}

public class MethodHidingDemo {
    public static void main(String[] args) {
        Parent.display();  // Output: Parent static method
        Child.display();   // Output: Child static method
        
        Parent obj = new Child();
        obj.display();     // Output: Parent static method (not polymorphic!)
    }
}
```

**Q: Can we have static and non-static methods with same name?**
**A:** Yes! They have different signatures (one is static, one is not).

```java
class Example {
    public static void print() {
        System.out.println("Static print");
    }
    
    public void print() {
        System.out.println("Instance print");
    }
}
```

**Q: Why is the `main` method static?**
**A:** So the JVM can call it without creating an object. The JVM calls `ClassName.main(args)` to start the program.

---

### Memory Trick

```
STATIC = "SHARED"
  • Like a whiteboard in a classroom
  • One board, all students see the same thing
  • Static variable = Class property (shared)
  • Instance variable = Personal property (individual)

Remember:
  static = belongs to CLASS
  instance = belongs to OBJECT

Example:
  Car.wheels = 4 (static - all cars have 4 wheels)
  myCar.color = "Red" (instance - my car's color)
```

---

### Q40: What are the important methods of the Object class?

**Answer:**

The `Object` class is the root of the Java class hierarchy. **Every class** in Java inherits from Object (directly or indirectly). It provides several fundamental methods that all objects inherit.

**Object Class Hierarchy:**

```
╔═══════════════════════════════════════════════════════╗
║                   java.lang.Object                    ║
║              (Root of all classes)                    ║
╠═══════════════════════════════════════════════════════╣
║                       ▲                               ║
║                       │                               ║
║            ┌──────────┼──────────┐                    ║
║            │          │          │                    ║
║         String     Integer    YourClass               ║
║                                  │                    ║
║                           YourSubClass                ║
║                                                       ║
║  All inherit Object's methods                         ║
╚═══════════════════════════════════════════════════════╝
```

---

#### Important Object Class Methods

```java
public class Object {
    public String toString()
    public boolean equals(Object obj)
    public int hashCode()
    protected Object clone()
    public final Class<?> getClass()
    protected void finalize()  // Deprecated in Java 9
    public final void notify()
    public final void notifyAll()
    public final void wait()
}
```

---

### 1. `toString()` Method

Returns a string representation of the object.

**Default Implementation:**

```java
public String toString() {
    return getClass().getName() + "@" + Integer.toHexString(hashCode());
}
```

**Example: Without Overriding**

```java
class Person {
    String name;
    int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
}

public class ToStringDemo {
    public static void main(String[] args) {
        Person person = new Person("Alice", 30);
        
        // Without overriding toString()
        System.out.println(person);
        // Output: Person@15db9742 (Class name + hashcode in hex)
        
        System.out.println(person.toString());
        // Output: Person@15db9742 (same as above)
    }
}
```

**Example: With Overriding ✅**

```java
class Person {
    String name;
    int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // Override toString() for meaningful output
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
}

public class ToStringOverrideDemo {
    public static void main(String[] args) {
        Person person = new Person("Alice", 30);
        
        System.out.println(person);
        // Output: Person{name='Alice', age=30}
        
        // println() automatically calls toString()
    }
}
```

**Best Practices:**

```java
class Employee {
    private int id;
    private String name;
    private double salary;
    
    public Employee(int id, String name, double salary) {
        this.id = id;
        this.name = name;
        this.salary = salary;
    }
    
    @Override
    public String toString() {
        // Option 1: Manual formatting
        return "Employee{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", salary=" + salary +
               '}';
        
        // Option 2: Using String.format()
        // return String.format("Employee{id=%d, name='%s', salary=%.2f}", 
        //                     id, name, salary);
    }
}
```

---

### 2. `equals()` Method

Compares two objects for equality.

**Default Implementation:**

```java
public boolean equals(Object obj) {
    return (this == obj);  // Reference equality (same object in memory)
}
```

**Example: Without Overriding (Reference Comparison)**

```java
class Book {
    String title;
    String author;
    
    public Book(String title, String author) {
        this.title = title;
        this.author = author;
    }
}

public class EqualsDemo {
    public static void main(String[] args) {
        Book book1 = new Book("Java", "James Gosling");
        Book book2 = new Book("Java", "James Gosling");
        Book book3 = book1;
        
        // Default equals() uses ==  (reference comparison)
        System.out.println(book1.equals(book2));  // false (different objects)
        System.out.println(book1.equals(book3));  // true (same object)
        System.out.println(book1 == book2);       // false
        System.out.println(book1 == book3);       // true
    }
}
```

**Example: With Overriding (Content Comparison) ✅**

```java
class Book {
    String title;
    String author;
    
    public Book(String title, String author) {
        this.title = title;
        this.author = author;
    }
    
    // Override equals() for content comparison
    @Override
    public boolean equals(Object obj) {
        // 1. Check if same object
        if (this == obj) return true;
        
        // 2. Check if null or different class
        if (obj == null || getClass() != obj.getClass()) return false;
        
        // 3. Cast and compare fields
        Book book = (Book) obj;
        
        // 4. Compare content
        return title.equals(book.title) && author.equals(book.author);
    }
}

public class EqualsOverrideDemo {
    public static void main(String[] args) {
        Book book1 = new Book("Java", "James Gosling");
        Book book2 = new Book("Java", "James Gosling");
        Book book3 = new Book("Python", "Guido van Rossum");
        
        System.out.println(book1.equals(book2));  // true (same content)
        System.out.println(book1.equals(book3));  // false (different content)
        System.out.println(book1 == book2);       // false (different objects)
    }
}
```

**equals() Contract:**

```
┌────────────────────────────────────────────────┐
│  equals() must be:                             │
├────────────────────────────────────────────────┤
│  1. Reflexive:   x.equals(x) = true            │
│  2. Symmetric:   x.equals(y) = y.equals(x)     │
│  3. Transitive:  if x.equals(y) and            │
│                  y.equals(z),                  │
│                  then x.equals(z)              │
│  4. Consistent:  Multiple calls return same    │
│  5. Null-safe:   x.equals(null) = false        │
└────────────────────────────────────────────────┘
```

---

### 3. `hashCode()` Method

Returns an integer hash code value for the object.

**Contract: If you override equals(), you MUST override hashCode()!**

```java
class Person {
    String name;
    int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Person person = (Person) obj;
        return age == person.age && name.equals(person.name);
    }
    
    // MUST override hashCode() when equals() is overridden
    @Override
    public int hashCode() {
        // Simple approach
        int result = 17;  // Prime number
        result = 31 * result + name.hashCode();
        result = 31 * result + age;
        return result;
        
        // Or use Objects.hash() (Java 7+)
        // return Objects.hash(name, age);
    }
}

public class HashCodeDemo {
    public static void main(String[] args) {
        Person p1 = new Person("Alice", 30);
        Person p2 = new Person("Alice", 30);
        Person p3 = new Person("Bob", 25);
        
        System.out.println("p1 hashCode: " + p1.hashCode());
        System.out.println("p2 hashCode: " + p2.hashCode());  // Same as p1
        System.out.println("p3 hashCode: " + p3.hashCode());  // Different
        
        // Used in HashSet, HashMap
        Set<Person> set = new HashSet<>();
        set.add(p1);
        set.add(p2);  // Won't be added (same as p1)
        set.add(p3);
        
        System.out.println("Set size: " + set.size());  // 2 (not 3)
    }
}
```

**hashCode() Contract:**

```
┌────────────────────────────────────────────────┐
│  hashCode() must satisfy:                      │
├────────────────────────────────────────────────┤
│  1. Consistent: Same object → same hashCode    │
│     (if object doesn't change)                 │
│                                                │
│  2. If equals() → hashCode() must match:       │
│     if x.equals(y), then                       │
│     x.hashCode() == y.hashCode()               │
│                                                │
│  3. Reverse NOT required:                      │
│     Different objects CAN have same hashCode   │
│     (hash collision)                           │
└────────────────────────────────────────────────┘
```

**Why Override Both?**

```java
class Student {
    String name;
    
    public Student(String name) {
        this.name = name;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Student student = (Student) obj;
        return name.equals(student.name);
    }
    
    // ❌ Forgot to override hashCode()!
}

public class HashCodeProblemDemo {
    public static void main(String[] args) {
        Student s1 = new Student("Alice");
        Student s2 = new Student("Alice");
        
        System.out.println(s1.equals(s2));  // true
        
        // Problem with HashMap/HashSet
        Map<Student, Integer> map = new HashMap<>();
        map.put(s1, 100);
        
        System.out.println(map.get(s2));  // null ❌ (should be 100!)
        // Different hashCodes → different buckets → not found
        
        System.out.println(s1.hashCode());  // Different
        System.out.println(s2.hashCode());  // Different (BAD!)
    }
}
```

---

### 4. `clone()` Method

Creates a copy of the object.

**Requirements:**
- Class must implement `Cloneable` interface (marker interface)
- Override `clone()` method

```java
class Employee implements Cloneable {
    String name;
    int id;
    
    public Employee(String name, int id) {
        this.name = name;
        this.id = id;
    }
    
    // Override clone() method
    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();  // Shallow copy
    }
    
    @Override
    public String toString() {
        return "Employee{name='" + name + "', id=" + id + "}";
    }
}

public class CloneDemo {
    public static void main(String[] args) {
        try {
            Employee emp1 = new Employee("Alice", 101);
            
            // Clone the object
            Employee emp2 = (Employee) emp1.clone();
            
            System.out.println(emp1);  // Employee{name='Alice', id=101}
            System.out.println(emp2);  // Employee{name='Alice', id=101}
            
            System.out.println(emp1 == emp2);        // false (different objects)
            System.out.println(emp1.equals(emp2));   // false (unless equals overridden)
            
            // Modify clone
            emp2.name = "Bob";
            emp2.id = 102;
            
            System.out.println(emp1);  // Employee{name='Alice', id=101}
            System.out.println(emp2);  // Employee{name='Bob', id=102}
            
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
    }
}
```

**Shallow vs Deep Copy:**

```java
class Address {
    String city;
    
    public Address(String city) {
        this.city = city;
    }
}

class Person implements Cloneable {
    String name;
    Address address;
    
    public Person(String name, Address address) {
        this.name = name;
        this.address = address;
    }
    
    // Shallow copy - address reference is copied
    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
    
    // Deep copy - create new Address object
    protected Person deepClone() throws CloneNotSupportedException {
        Person cloned = (Person) super.clone();
        cloned.address = new Address(this.address.city);  // Deep copy
        return cloned;
    }
}

public class ShallowVsDeepCopy {
    public static void main(String[] args) throws CloneNotSupportedException {
        Address addr = new Address("New York");
        Person p1 = new Person("Alice", addr);
        
        // Shallow copy
        Person p2 = (Person) p1.clone();
        p2.address.city = "Los Angeles";
        
        System.out.println(p1.address.city);  // Los Angeles ❌ (affected!)
        System.out.println(p2.address.city);  // Los Angeles
        
        // Deep copy
        Person p3 = new Person("Bob", new Address("Chicago"));
        Person p4 = p3.deepClone();
        p4.address.city = "Boston";
        
        System.out.println(p3.address.city);  // Chicago ✅ (not affected)
        System.out.println(p4.address.city);  // Boston
    }
}
```

---

### 5. `getClass()` Method

Returns the runtime class of the object.

```java
class Animal { }
class Dog extends Animal { }

public class GetClassDemo {
    public static void main(String[] args) {
        Animal animal = new Animal();
        Dog dog = new Dog();
        Animal animalDog = new Dog();  // Upcasting
        
        System.out.println(animal.getClass());      // class Animal
        System.out.println(dog.getClass());         // class Dog
        System.out.println(animalDog.getClass());   // class Dog (runtime type)
        
        // Get class name
        System.out.println(dog.getClass().getName());         // Dog
        System.out.println(dog.getClass().getSimpleName());   // Dog
        
        // Check type
        if (animalDog.getClass() == Dog.class) {
            System.out.println("It's a Dog!");
        }
        
        // vs instanceof
        System.out.println(animalDog instanceof Animal);  // true
        System.out.println(animalDog instanceof Dog);     // true
        System.out.println(animalDog.getClass() == Animal.class);  // false
        System.out.println(animalDog.getClass() == Dog.class);     // true
    }
}
```

---

### 6. `finalize()` Method (Deprecated in Java 9)

Called by garbage collector before object is destroyed.

**⚠️ Not recommended to use - use try-with-resources instead**

```java
class Resource {
    @Override
    protected void finalize() throws Throwable {
        try {
            System.out.println("Finalize called - cleaning up");
            // Clean up resources
        } finally {
            super.finalize();
        }
    }
}

public class FinalizeDemo {
    public static void main(String[] args) {
        Resource r = new Resource();
        r = null;  // Make eligible for GC
        
        System.gc();  // Request garbage collection
        // finalize() may or may not be called immediately
    }
}
```

---

### Complete Example: Proper Object Implementation

```java
import java.util.*;

class Product implements Cloneable {
    private int id;
    private String name;
    private double price;
    
    public Product(int id, String name, double price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }
    
    // 1. toString() - readable string representation
    @Override
    public String toString() {
        return "Product{id=" + id + ", name='" + name + "', price=" + price + "}";
    }
    
    // 2. equals() - content comparison
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Product product = (Product) obj;
        return id == product.id &&
               Double.compare(product.price, price) == 0 &&
               name.equals(product.name);
    }
    
    // 3. hashCode() - consistent with equals()
    @Override
    public int hashCode() {
        return Objects.hash(id, name, price);
    }
    
    // 4. clone() - create copy
    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
    
    // Getters
    public int getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }
}

public class CompleteObjectDemo {
    public static void main(String[] args) throws CloneNotSupportedException {
        Product p1 = new Product(1, "Laptop", 999.99);
        Product p2 = new Product(1, "Laptop", 999.99);
        Product p3 = (Product) p1.clone();
        
        // toString()
        System.out.println(p1);  // Product{id=1, name='Laptop', price=999.99}
        
        // equals()
        System.out.println(p1.equals(p2));  // true (same content)
        System.out.println(p1 == p2);       // false (different objects)
        
        // hashCode()
        System.out.println(p1.hashCode() == p2.hashCode());  // true
        
        // Works correctly in collections
        Set<Product> set = new HashSet<>();
        set.add(p1);
        set.add(p2);  // Not added (duplicate)
        System.out.println("Set size: " + set.size());  // 1
        
        Map<Product, Integer> inventory = new HashMap<>();
        inventory.put(p1, 50);
        System.out.println("Stock: " + inventory.get(p2));  // 50 (works!)
        
        // getClass()
        System.out.println(p1.getClass().getSimpleName());  // Product
        
        // clone()
        System.out.println(p3);  // Product{id=1, name='Laptop', price=999.99}
        System.out.println(p1 == p3);  // false (different objects)
    }
}
```

---

### Summary Table

| Method | Purpose | Must Override? | Common Use |
|--------|---------|----------------|------------|
| `toString()` | String representation | Recommended | Debugging, logging |
| `equals()` | Object equality | Yes, if comparing content | Collections |
| `hashCode()` | Hash value | Yes, if equals() overridden | HashMap, HashSet |
| `clone()` | Create copy | Optional | Deep copy needed |
| `getClass()` | Get runtime class | No (final) | Type checking |
| `finalize()` | Cleanup before GC | No (deprecated) | Don't use |

---

### Best Practices

```
✅ DO:
• Override toString() for all classes
• Override equals() and hashCode() together
• Use Objects.hash() for hashCode()
• Implement Cloneable if clone() needed
• Follow equals() and hashCode() contracts

❌ DON'T:
• Override equals() without hashCode()
• Use finalize() (use try-with-resources)
• Break equals() contract (reflexive, symmetric, etc.)
• Forget null checks in equals()
```

---

### Memory Trick

```
Object Class Methods = "TECH GF"

T - toString()    → "Text representation"
E - equals()      → "Equal comparison"
C - clone()       → "Copy object"
H - hashCode()    → "Hash for collections"

G - getClass()    → "Get type"
F - finalize()    → "Forget about it" (deprecated)

Remember: equals() and hashCode() are best friends!
  • If equals() says true → hashCode() must match
  • Override both or neither (for custom comparison)
```

---

## Immutable Classes

### Q39: What is an Immutable Class in Java? How do you create one?

**Answer:**

An **immutable class** is a class whose object state cannot be changed after it is created. Once initialized, the data remains constant throughout the object's lifetime.

**Why immutable classes matter:**
- **Thread-safe by design** (no synchronization needed)
- Easier to reason about and debug
- Safer for use as keys in `HashMap` / elements in `HashSet`
- Prevents accidental data modification

**Classic examples**: `String`, `Integer`, `LocalDate`

**How to create a custom immutable class (5 steps):**

```
╔═══════════════════════════════════════════════════════╗
║         5 RULES FOR IMMUTABLE CLASSES                 ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  1. Declare the class as final                        ║
║     → Prevents subclassing that could alter behavior  ║
║                                                       ║
║  2. Make all fields private and final                 ║
║     → Fields assigned only once, not accessible       ║
║                                                       ║
║  3. Initialize fields using constructor only          ║
║     → All state set at creation time                  ║
║                                                       ║
║  4. Do not provide setter methods                     ║
║     → No way to modify state after creation           ║
║                                                       ║
║  5. Return defensive copies for mutable fields        ║
║     → Prevents external modification of internal data ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Complete Example:**

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// Step 1: Declare as final
public final class ImmutableEmployee {

    // Step 2: All fields private and final
    private final String name;
    private final int age;
    private final List<String> skills;

    // Step 3: Initialize via constructor only
    public ImmutableEmployee(String name, int age, List<String> skills) {
        this.name = name;
        this.age = age;
        // Step 5: Defensive copy on input (mutable field)
        this.skills = new ArrayList<>(skills);
    }

    // Step 4: Only getters, no setters
    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }

    // Step 5: Defensive copy on output (mutable field)
    public List<String> getSkills() {
        return Collections.unmodifiableList(skills);
    }
}
```

**Why defensive copies matter:**

```java
List<String> originalSkills = new ArrayList<>(List.of("Java", "Spring"));
ImmutableEmployee emp = new ImmutableEmployee("Alice", 30, originalSkills);

// Without defensive copy in constructor:
originalSkills.add("Hacking");  // Would modify internal state!

// Without defensive copy in getter:
emp.getSkills().add("Hacking");  // Would modify internal state!

// With proper defensive copies: both operations are safe
```

**Common Interview Follow-up**: Why is `String` immutable in Java?
- Thread safety without synchronization
- String pool caching (memory optimization)
- Security (class loading, network connections use strings)
- HashCode caching (used as `HashMap` keys)

---
