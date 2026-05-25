# SOLID Principles - Object-Oriented Design

**Part of Java OOP Interview Preparation Series**

This document covers the five SOLID principles that form the foundation of good object-oriented design and are essential for building maintainable, scalable software systems.

---

## Table of Contents

- What are SOLID Principles?
- Why SOLID Principles Matter
- Single Responsibility Principle (SRP)
- Open/Closed Principle (OCP)
- Liskov Substitution Principle (LSP)
- Interface Segregation Principle (ISP)
- Dependency Inversion Principle (DIP)
- SOLID in Practice
- Common Interview Questions
- Self-Check Questions

---

## What are SOLID Principles?

**SOLID** is an acronym for five object-oriented design principles introduced by Robert C. Martin (Uncle Bob) that help developers create software that is:
- **Maintainable** - Easy to modify and extend
- **Scalable** - Can grow without major refactoring
- **Testable** - Simple to write unit tests for
- **Flexible** - Adapts to changing requirements

**Real-world analogy**: Think of SOLID principles like building blocks for constructing a house. Each principle is a guideline that ensures your house (software) has a strong foundation, can be extended with new rooms (features), and won't collapse when you make changes.

```
╔════════════════════════════════════════════════════════╗
║              SOLID PRINCIPLES                          ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  S - Single Responsibility Principle                   ║
║      "One class, one job"                              ║
║                                                        ║
║  O - Open/Closed Principle                             ║
║      "Open for extension, closed for modification"     ║
║                                                        ║
║  L - Liskov Substitution Principle                     ║
║      "Subclasses should be substitutable"              ║
║                                                        ║
║  I - Interface Segregation Principle                   ║
║      "Many small interfaces > one large interface"     ║
║                                                        ║
║  D - Dependency Inversion Principle                    ║
║      "Depend on abstractions, not concretions"         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## Why SOLID Principles Matter

**You'll use these principles when**:
- Designing new classes and modules
- Refactoring existing code
- Conducting code reviews
- Preparing for software design interviews
- Making architectural decisions

**Interview context**: SOLID principles are frequently asked in interviews for mid-to-senior level positions. Interviewers expect you to:
1. Explain each principle with real-world examples
2. Identify violations in code snippets
3. Refactor code to follow SOLID principles
4. Discuss trade-offs and when to apply each principle

**In the real world**: Following SOLID principles reduces technical debt, makes code easier to test, and allows teams to work on different parts of the codebase without stepping on each other's toes.

---

## 1. Single Responsibility Principle (SRP)

### Definition

> **"A class should have only one reason to change."**
>
> — Robert C. Martin

**In simple terms**: Each class should do one thing and do it well. If a class has multiple responsibilities, changes to one responsibility may affect the other.

**Real-world analogy**: Think of a restaurant. The chef cooks, the waiter serves, and the cashier handles payments. Each person has a single responsibility. If the chef had to cook AND handle payments, they'd be less efficient at both tasks.

---

### The Problem: Violating SRP

**Example - Invoice Manager with Multiple Responsibilities:**

```java
// ❌ BAD: This class has THREE responsibilities
public class Invoice {
    private String invoiceNumber;
    private double amount;
    private String customerEmail;

    // Responsibility 1: Invoice business logic
    public void calculateTotal() {
        // Calculate total amount
    }

    // Responsibility 2: Database operations
    public void saveToDatabase() {
        // JDBC code to save invoice
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        // ... save logic
    }

    // Responsibility 3: Email notifications
    public void sendEmailToCustomer() {
        // Email sending logic
        JavaMailSender sender = new JavaMailSender();
        sender.send(customerEmail, "Invoice: " + invoiceNumber);
    }
}
```

**Problems with this design:**
1. **Hard to maintain**: Changes to email logic require modifying the Invoice class
2. **Difficult to test**: You can't test invoice calculations without database/email dependencies
3. **Poor reusability**: Can't reuse email logic for other entities (e.g., receipts, orders)
4. **Multiple reasons to change**: Database schema changes, email template changes, or calculation logic changes all affect this class

---

### The Solution: Following SRP

**Refactored Design - Each Class Has One Responsibility:**

```java
// ✅ GOOD: Invoice class only handles invoice business logic
public class Invoice {
    private String invoiceNumber;
    private double amount;
    private List<InvoiceItem> items;

    // Single Responsibility: Invoice calculations and business rules
    public double calculateTotal() {
        return items.stream()
                   .mapToDouble(InvoiceItem::getPrice)
                   .sum();
    }

    public double calculateTax() {
        return calculateTotal() * 0.18; // 18% tax
    }

    public double calculateGrandTotal() {
        return calculateTotal() + calculateTax();
    }

    // Getters and setters
    public String getInvoiceNumber() { return invoiceNumber; }
    public double getAmount() { return amount; }
}

// ✅ Separate class for database operations
public class InvoiceRepository {
    // Single Responsibility: Invoice persistence
    public void save(Invoice invoice) {
        // JDBC/JPA code to save invoice
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        PreparedStatement stmt = conn.prepareStatement(
            "INSERT INTO invoices (invoice_number, amount) VALUES (?, ?)"
        );
        stmt.setString(1, invoice.getInvoiceNumber());
        stmt.setDouble(2, invoice.getAmount());
        stmt.executeUpdate();
    }

    public Invoice findById(String invoiceNumber) {
        // Retrieval logic
        return new Invoice();
    }
}

// ✅ Separate class for email notifications
public class EmailService {
    private JavaMailSender mailSender;

    // Single Responsibility: Email sending
    public void sendInvoiceEmail(String customerEmail, Invoice invoice) {
        String subject = "Invoice: " + invoice.getInvoiceNumber();
        String body = "Total amount: $" + invoice.getAmount();
        mailSender.send(customerEmail, subject, body);
    }

    public void sendReceiptEmail(String customerEmail, String receiptNumber) {
        // Reusable for other entities
    }
}

// ✅ Orchestrator class that uses the above services
public class InvoiceService {
    private InvoiceRepository repository;
    private EmailService emailService;

    public InvoiceService(InvoiceRepository repository, EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }

    public void processInvoice(Invoice invoice, String customerEmail) {
        // Coordinate the workflow
        double total = invoice.calculateTotal();
        repository.save(invoice);
        emailService.sendInvoiceEmail(customerEmail, invoice);
    }
}
```

**Benefits of this refactored design:**
- ✅ **Easy to test**: Each class can be unit tested independently
- ✅ **Easy to maintain**: Email changes don't affect Invoice or Repository
- ✅ **Reusable**: EmailService can be used for receipts, orders, etc.
- ✅ **Single reason to change**: Invoice changes only for business logic, Repository for DB schema, EmailService for email templates

---

### SRP in Spring Boot

**Spring Boot naturally encourages SRP through its layered architecture:**

```java
// ✅ Controller - Single Responsibility: Handle HTTP requests
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceService invoiceService;

    @Autowired
    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    public ResponseEntity<Invoice> createInvoice(@RequestBody Invoice invoice) {
        Invoice created = invoiceService.createInvoice(invoice);
        return ResponseEntity.ok(created);
    }
}

// ✅ Service - Single Responsibility: Business logic
@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    @Autowired
    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public Invoice createInvoice(Invoice invoice) {
        invoice.calculateTotal();
        return repository.save(invoice);
    }
}

// ✅ Repository - Single Responsibility: Data access
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByCustomerEmail(String email);
}
```

---

### Common SRP Violations

**1. God Classes / God Objects**

```java
// ❌ BAD: UserManager does EVERYTHING
public class UserManager {
    public void createUser() { }
    public void deleteUser() { }
    public void sendEmail() { }
    public void validatePassword() { }
    public void logActivity() { }
    public void exportToCSV() { }
    public void generateReport() { }
}
```

**Fix**: Split into UserService, EmailService, PasswordValidator, ActivityLogger, ReportGenerator

---

**2. Mixing Business Logic with Infrastructure**

```java
// ❌ BAD: Business logic mixed with HTTP details
public class OrderService {
    public void placeOrder(HttpServletRequest request, HttpServletResponse response) {
        String orderId = request.getParameter("orderId");
        // Business logic
        Order order = new Order(orderId);
        // More HTTP details
        response.setStatus(200);
        response.getWriter().write("Order placed");
    }
}
```

**Fix**: Controller handles HTTP, Service handles business logic

```java
// ✅ GOOD: Separated concerns
@RestController
public class OrderController {
    private OrderService orderService;

    @PostMapping("/orders")
    public ResponseEntity<String> placeOrder(@RequestBody OrderRequest request) {
        orderService.placeOrder(request.getOrderId());
        return ResponseEntity.ok("Order placed");
    }
}

@Service
public class OrderService {
    public void placeOrder(String orderId) {
        Order order = new Order(orderId);
        // Pure business logic
    }
}
```

---

### Interview Questions on SRP

**Q1: What is the Single Responsibility Principle?**

**A**: A class should have only one reason to change, meaning it should have only one job or responsibility.

**Q2: Why is SRP important?**

**A**:
- Easier to maintain and test
- Reduces coupling between components
- Increases code reusability
- Makes changes less risky (changing one responsibility doesn't break others)

**Q3: How do you identify SRP violations?**

**A**: Ask these questions:
1. Does this class have multiple reasons to change?
2. Can I describe what this class does without using "and" or "or"?
3. If I change the database, email system, or business rules, does this class need to change?

**Q4: Can you give a real-world example of SRP violation and how to fix it?**

**A**: [Use the Invoice example above]

---

## 2. Open/Closed Principle (OCP)

### Definition

> **"Software entities (classes, modules, functions) should be open for extension but closed for modification."**
>
> — Bertrand Meyer

**In simple terms**: You should be able to add new functionality without changing existing code. Extend behavior through new code, not by modifying old code.

**Real-world analogy**: Think of a smartphone. You can add new apps (extensions) without modifying the phone's operating system (closed for modification). The phone is designed to allow extensions through its app ecosystem.

---

### The Problem: Violating OCP

**Example - Payment Processing with Hard-Coded Logic:**

```java
// ❌ BAD: Every new payment type requires modifying this class
public class PaymentProcessor {

    public void processPayment(String paymentType, double amount) {
        if (paymentType.equals("CREDIT_CARD")) {
            System.out.println("Processing credit card payment: $" + amount);
            // Credit card specific logic
            validateCreditCard();
            chargeCreditCard(amount);

        } else if (paymentType.equals("PAYPAL")) {
            System.out.println("Processing PayPal payment: $" + amount);
            // PayPal specific logic
            authenticatePayPal();
            transferViaPayPal(amount);

        } else if (paymentType.equals("BITCOIN")) {
            System.out.println("Processing Bitcoin payment: $" + amount);
            // Bitcoin specific logic
            verifyBitcoinWallet();
            transferBitcoin(amount);
        }
        // What if we need to add UPI, Razorpay, Stripe? Modify this class again!
    }

    private void validateCreditCard() { }
    private void chargeCreditCard(double amount) { }
    private void authenticatePayPal() { }
    private void transferViaPayPal(double amount) { }
    private void verifyBitcoinWallet() { }
    private void transferBitcoin(double amount) { }
}
```

**Problems with this design:**
1. **Modification required**: Every new payment method requires modifying the PaymentProcessor class
2. **Violates SRP**: This class has multiple reasons to change (any payment method change)
3. **Hard to test**: Can't test one payment method without all the others
4. **Risk of bugs**: Modifying existing code might break working payment methods

---

### The Solution: Following OCP

**Refactored Design - Open for Extension, Closed for Modification:**

```java
// ✅ GOOD: Define an abstraction (interface)
public interface PaymentMethod {
    void processPayment(double amount);
}

// ✅ Each payment type is a separate implementation
public class CreditCardPayment implements PaymentMethod {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing credit card payment: $" + amount);
        validateCreditCard();
        chargeCreditCard(amount);
    }

    private void validateCreditCard() {
        // Credit card validation logic
    }

    private void chargeCreditCard(double amount) {
        // Charge logic
    }
}

public class PayPalPayment implements PaymentMethod {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing PayPal payment: $" + amount);
        authenticatePayPal();
        transferViaPayPal(amount);
    }

    private void authenticatePayPal() {
        // PayPal auth logic
    }

    private void transferViaPayPal(double amount) {
        // Transfer logic
    }
}

public class BitcoinPayment implements PaymentMethod {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing Bitcoin payment: $" + amount);
        verifyBitcoinWallet();
        transferBitcoin(amount);
    }

    private void verifyBitcoinWallet() {
        // Wallet verification
    }

    private void transferBitcoin(double amount) {
        // Transfer logic
    }
}

// ✅ NEW: Add UPI payment WITHOUT modifying existing code
public class UpiPayment implements PaymentMethod {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing UPI payment: $" + amount);
        verifyUpiId();
        transferViaUpi(amount);
    }

    private void verifyUpiId() {
        // UPI verification
    }

    private void transferViaUpi(double amount) {
        // Transfer logic
    }
}

// ✅ Payment processor works with any PaymentMethod (open for extension)
public class PaymentProcessor {

    public void processPayment(PaymentMethod paymentMethod, double amount) {
        // No modification needed for new payment types!
        paymentMethod.processPayment(amount);
    }
}

// Usage
public class EcommerceApp {
    public static void main(String[] args) {
        PaymentProcessor processor = new PaymentProcessor();

        // Process different payment types
        processor.processPayment(new CreditCardPayment(), 100.0);
        processor.processPayment(new PayPalPayment(), 200.0);
        processor.processPayment(new BitcoinPayment(), 300.0);
        processor.processPayment(new UpiPayment(), 400.0);  // NEW - no changes to PaymentProcessor!
    }
}
```

**Benefits of this design:**
- ✅ **Open for extension**: Add new payment methods by creating new classes
- ✅ **Closed for modification**: No need to modify PaymentProcessor or existing payment classes
- ✅ **Easy to test**: Each payment method can be tested independently
- ✅ **No risk**: Adding UPI doesn't affect Credit Card or PayPal logic

---

### OCP with Strategy Pattern

The above example uses the **Strategy Pattern**, which is a classic implementation of OCP:

```
╔════════════════════════════════════════════════════════╗
║           STRATEGY PATTERN (OCP in Action)             ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║              <<interface>>                             ║
║            PaymentMethod                               ║
║        + processPayment(amount)                        ║
║                   △                                    ║
║                   |                                    ║
║      ┌────────────┼────────────┬──────────┐            ║
║      |            |            |          |            ║
║  CreditCard    PayPal      Bitcoin      UPI            ║
║   Payment      Payment      Payment    Payment         ║
║                                                        ║
║   Each can be added without modifying others           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

### OCP in Spring Boot

**Spring Boot's Dependency Injection makes OCP easy to implement:**

```java
// ✅ Define the abstraction
public interface NotificationService {
    void sendNotification(String message);
}

// ✅ Multiple implementations
@Service
@Qualifier("email")
public class EmailNotificationService implements NotificationService {
    @Override
    public void sendNotification(String message) {
        System.out.println("Sending email: " + message);
    }
}

@Service
@Qualifier("sms")
public class SmsNotificationService implements NotificationService {
    @Override
    public void sendNotification(String message) {
        System.out.println("Sending SMS: " + message);
    }
}

// ✅ NEW: Add Slack notifications without modifying existing code
@Service
@Qualifier("slack")
public class SlackNotificationService implements NotificationService {
    @Override
    public void sendNotification(String message) {
        System.out.println("Sending Slack message: " + message);
    }
}

// ✅ Client code works with the abstraction
@Service
public class OrderService {
    private final NotificationService notificationService;

    // Inject specific implementation via qualifier or @Primary
    @Autowired
    public OrderService(@Qualifier("email") NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    public void placeOrder(String orderId) {
        // Business logic
        notificationService.sendNotification("Order " + orderId + " placed successfully");
    }
}
```

**To switch from Email to SMS, you only change the @Qualifier - no code modification!**

---

### OCP with Abstract Classes

You can also use **abstract classes** instead of interfaces when you have common implementation:

```java
// ✅ Abstract class with common logic
public abstract class DiscountCalculator {

    // Template method - defines the algorithm structure
    public final double calculateDiscount(double price) {
        if (isEligibleForDiscount(price)) {
            return applyDiscount(price);
        }
        return 0.0;
    }

    // Common logic
    protected boolean isEligibleForDiscount(double price) {
        return price > 100;  // Discount only if price > $100
    }

    // Abstract method - subclasses define specific discount logic
    protected abstract double applyDiscount(double price);
}

// ✅ Extend for different discount types
public class PercentageDiscount extends DiscountCalculator {
    private double percentage;

    public PercentageDiscount(double percentage) {
        this.percentage = percentage;
    }

    @Override
    protected double applyDiscount(double price) {
        return price * (percentage / 100);
    }
}

public class FixedAmountDiscount extends DiscountCalculator {
    private double amount;

    public FixedAmountDiscount(double amount) {
        this.amount = amount;
    }

    @Override
    protected double applyDiscount(double price) {
        return Math.min(amount, price);  // Don't exceed price
    }
}

// ✅ NEW: Add seasonal discount without modifying existing code
public class SeasonalDiscount extends DiscountCalculator {
    @Override
    protected double applyDiscount(double price) {
        // 30% off during holiday season
        return price * 0.30;
    }

    @Override
    protected boolean isEligibleForDiscount(double price) {
        // Override: Seasonal discount available for any price
        return true;
    }
}
```

---

### Common OCP Violations

**1. Switch/If-Else Chains for Type Checking**

```java
// ❌ BAD: Adding new shape requires modifying this method
public double calculateArea(String shapeType, double dimension) {
    if (shapeType.equals("CIRCLE")) {
        return Math.PI * dimension * dimension;
    } else if (shapeType.equals("SQUARE")) {
        return dimension * dimension;
    } else if (shapeType.equals("TRIANGLE")) {
        return 0.5 * dimension * dimension;
    }
    return 0;
}
```

**✅ Fix with Polymorphism:**

```java
public interface Shape {
    double calculateArea();
}

public class Circle implements Shape {
    private double radius;

    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
}

public class Square implements Shape {
    private double side;

    @Override
    public double calculateArea() {
        return side * side;
    }
}
```

---

**2. Type Checking with instanceof**

```java
// ❌ BAD: Type checking violates OCP
public void renderShape(Shape shape) {
    if (shape instanceof Circle) {
        Circle circle = (Circle) shape;
        // Render circle
    } else if (shape instanceof Square) {
        Square square = (Square) shape;
        // Render square
    }
}
```

**✅ Fix with Polymorphism:**

```java
public interface Shape {
    void render();
}

public class Circle implements Shape {
    @Override
    public void render() {
        System.out.println("Rendering circle");
    }
}

public void renderShape(Shape shape) {
    shape.render();  // Polymorphism - no type checking needed
}
```

---

### When NOT to Apply OCP

**OCP is not always necessary. Don't over-engineer:**

❌ **Don't create abstractions for things that never change:**

```java
// ❌ Overkill: Math operations rarely change
public interface MathOperation {
    int execute(int a, int b);
}

public class Addition implements MathOperation {
    @Override
    public int execute(int a, int b) {
        return a + b;
    }
}
```

✅ **Simple is better when requirements are stable:**

```java
// ✅ Simple and clear
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}
```

**Apply OCP when:**
- Requirements are likely to change
- New variations will be added frequently
- You want to allow third-party extensions

**Skip OCP when:**
- Requirements are stable and unlikely to change
- Only one implementation exists and no more are expected
- The abstraction makes code harder to understand

---

### Interview Questions on OCP

**Q1: What is the Open/Closed Principle?**

**A**: Software entities should be open for extension (you can add new functionality) but closed for modification (you shouldn't need to change existing code).

**Q2: How do you achieve OCP in Java?**

**A**:
- Use interfaces and abstract classes
- Program to interfaces, not implementations
- Use polymorphism to allow new behaviors without modifying existing code
- Leverage design patterns like Strategy, Template Method, Decorator

**Q3: What's wrong with this code? (Show if-else payment example)**

**A**: It violates OCP because adding a new payment method requires modifying the existing PaymentProcessor class. This increases the risk of bugs and makes the code harder to maintain.

**Q4: Give an example of OCP from a framework you've used.**

**A**:
- **Spring Boot**: You can add custom filters by implementing the `Filter` interface without modifying Spring's core code
- **JDBC**: You can add new database drivers by implementing the `Driver` interface
- **Servlet API**: Add new servlets by extending `HttpServlet`

---

## 3. Liskov Substitution Principle (LSP)

### Definition

> **"Objects of a superclass should be replaceable with objects of its subclasses without breaking the application."**
>
> — Barbara Liskov

**In simple terms**: If class B is a subtype of class A, you should be able to replace A with B without breaking your program. Subclasses must honor the contract defined by their parent class.

**Real-world analogy**: If your code expects a "Vehicle" and you give it a "Car", it should work fine. A Car *is-a* Vehicle and should work anywhere a Vehicle is expected. But if you give it a "Bicycle" that can't use highways, the code might break (LSP violation).

---

### The Problem: Violating LSP

**Classic Example - The Rectangle-Square Problem:**

```java
// ❌ BAD: Square violates LSP
public class Rectangle {
    protected int width;
    protected int height;

    public void setWidth(int width) {
        this.width = width;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public int getArea() {
        return width * height;
    }
}

// Square IS-A Rectangle mathematically, but NOT behaviorally in code!
public class Square extends Rectangle {

    @Override
    public void setWidth(int width) {
        // Maintain square constraint: width = height
        this.width = width;
        this.height = width;  // ⚠️ Side effect!
    }

    @Override
    public void setHeight(int height) {
        // Maintain square constraint: width = height
        this.width = height;  // ⚠️ Side effect!
        this.height = height;
    }
}

// This code works fine with Rectangle, but BREAKS with Square
public class AreaCalculator {

    public static void testRectangle(Rectangle rectangle) {
        rectangle.setWidth(5);
        rectangle.setHeight(10);

        // Expected: 5 * 10 = 50
        // Works for Rectangle
        // FAILS for Square (because setWidth also changes height!)
        int area = rectangle.getArea();

        assert area == 50 : "Area should be 50, but got " + area;
    }

    public static void main(String[] args) {
        Rectangle rect = new Rectangle();
        testRectangle(rect);  // ✅ PASS: area = 50

        Rectangle square = new Square();
        testRectangle(square);  // ❌ FAIL: area = 100 (not 50!)
        // LSP VIOLATED: Square cannot replace Rectangle
    }
}
```

**Why is this a LSP violation?**
1. **Unexpected behavior**: Square changes height when you set width (violates expectations)
2. **Contract broken**: Rectangle's contract says setWidth and setHeight are independent
3. **Substitution fails**: You cannot substitute Square for Rectangle without breaking code

---

### The Solution: Following LSP

**Option 1: Don't Use Inheritance (Composition over Inheritance)**

```java
// ✅ GOOD: Separate classes without inheritance
public class Rectangle {
    private int width;
    private int height;

    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public int getArea() {
        return width * height;
    }

    // Getters and setters
}

public class Square {
    private int side;

    public Square(int side) {
        this.side = side;
    }

    public int getArea() {
        return side * side;
    }

    // Getters and setters
}
```

**Option 2: Use a Common Interface**

```java
// ✅ GOOD: Common abstraction without inheritance
public interface Shape {
    int getArea();
}

public class Rectangle implements Shape {
    private int width;
    private int height;

    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public int getArea() {
        return width * height;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public void setHeight(int height) {
        this.height = height;
    }
}

public class Square implements Shape {
    private int side;

    public Square(int side) {
        this.side = side;
    }

    @Override
    public int getArea() {
        return side * side;
    }

    public void setSide(int side) {
        this.side = side;
    }
}

// ✅ Now both can be substituted via the Shape interface
public void printArea(Shape shape) {
    System.out.println("Area: " + shape.getArea());
}
```

---

### Another Example: The Bird Problem

**❌ BAD: Penguin violates LSP**

```java
public class Bird {
    public void fly() {
        System.out.println("Flying...");
    }
}

// Penguin IS-A Bird, but can't fly!
public class Penguin extends Bird {
    @Override
    public void fly() {
        throw new UnsupportedOperationException("Penguins can't fly!");
        // ❌ LSP VIOLATION: Cannot substitute Penguin for Bird
    }
}

public class BirdWatcher {
    public void makeBirdFly(Bird bird) {
        bird.fly();  // ❌ CRASH if bird is a Penguin!
    }
}
```

**✅ GOOD: Refactor the hierarchy**

```java
// Base class: Common to all birds
public abstract class Bird {
    public abstract void eat();
    public abstract void sleep();
}

// Separate interface for birds that can fly
public interface Flyable {
    void fly();
}

// Flying birds implement Flyable
public class Sparrow extends Bird implements Flyable {
    @Override
    public void fly() {
        System.out.println("Sparrow flying...");
    }

    @Override
    public void eat() {
        System.out.println("Sparrow eating seeds");
    }

    @Override
    public void sleep() {
        System.out.println("Sparrow sleeping");
    }
}

// Penguins don't implement Flyable
public class Penguin extends Bird {
    @Override
    public void eat() {
        System.out.println("Penguin eating fish");
    }

    @Override
    public void sleep() {
        System.out.println("Penguin sleeping");
    }

    public void swim() {
        System.out.println("Penguin swimming");
    }
}

// ✅ Now the code works correctly
public class BirdWatcher {
    // Only accept birds that can fly
    public void makeBirdFly(Flyable bird) {
        bird.fly();  // ✅ SAFE: Only flying birds can be passed
    }

    public static void main(String[] args) {
        Sparrow sparrow = new Sparrow();
        makeBirdFly(sparrow);  // ✅ Works

        Penguin penguin = new Penguin();
        // makeBirdFly(penguin);  // ❌ Compilation error - good!
        penguin.swim();  // ✅ Use penguin-specific behavior
    }
}
```

---

### LSP Rules to Follow

**1. Preconditions cannot be strengthened in subclasses**

```java
// ✅ Parent class
public class PaymentProcessor {
    // Precondition: amount must be > 0
    public void processPayment(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        // Process payment
    }
}

// ❌ BAD: Subclass strengthens precondition
public class PremiumPaymentProcessor extends PaymentProcessor {
    @Override
    public void processPayment(double amount) {
        // ❌ LSP VIOLATION: Now amount must be > 100 (stricter!)
        if (amount <= 100) {
            throw new IllegalArgumentException("Amount must be > 100");
        }
        super.processPayment(amount);
    }
}

// Client code breaks
PaymentProcessor processor = new PremiumPaymentProcessor();
processor.processPayment(50);  // ❌ CRASH: Used to work with parent class!
```

**✅ Fix: Don't strengthen preconditions**

```java
public class PremiumPaymentProcessor extends PaymentProcessor {
    @Override
    public void processPayment(double amount) {
        // ✅ Keep the same precondition (amount > 0)
        if (amount > 100) {
            applyPremiumBenefits();
        }
        super.processPayment(amount);
    }
}
```

---

**2. Postconditions cannot be weakened in subclasses**

```java
// ✅ Parent class guarantees non-null return
public class UserRepository {
    // Postcondition: Always returns a User (never null)
    public User findUserById(String id) {
        User user = database.find(id);
        return user != null ? user : new GuestUser();  // Never null
    }
}

// ❌ BAD: Subclass weakens postcondition
public class CachedUserRepository extends UserRepository {
    @Override
    public User findUserById(String id) {
        User user = cache.get(id);
        return user;  // ❌ LSP VIOLATION: Can return null!
    }
}

// Client code breaks
UserRepository repo = new CachedUserRepository();
User user = repo.findUserById("123");
System.out.println(user.getName());  // ❌ NullPointerException!
```

---

**3. Subclasses should not throw new exceptions that parent doesn't throw**

```java
// ✅ Parent class
public class FileReader {
    public String readFile(String path) throws IOException {
        // Read file
        return content;
    }
}

// ❌ BAD: Subclass throws additional exception
public class NetworkFileReader extends FileReader {
    @Override
    public String readFile(String path) throws IOException, TimeoutException {
        // ❌ LSP VIOLATION: Parent doesn't declare TimeoutException
        // Client code handling IOException won't expect TimeoutException
        return fetchFromNetwork(path);
    }
}
```

---

### LSP in Spring Boot

**Example: Spring's Repository Abstraction**

```java
// Spring Data JPA follows LSP
public interface CrudRepository<T, ID> {
    <S extends T> S save(S entity);
    Optional<T> findById(ID id);
    Iterable<T> findAll();
    void deleteById(ID id);
}

// ✅ JpaRepository extends CrudRepository (LSP compliant)
public interface JpaRepository<T, ID> extends CrudRepository<T, ID> {
    // Adds additional methods, but doesn't break parent contract
    List<T> findAll(Sort sort);
    <S extends T> List<S> saveAll(Iterable<S> entities);
}

// ✅ You can substitute JpaRepository for CrudRepository
public class InvoiceService {
    private CrudRepository<Invoice, Long> repository;

    // Works with ANY CrudRepository implementation
    public void saveInvoice(Invoice invoice) {
        repository.save(invoice);  // ✅ Works with JpaRepository too
    }
}
```

---

### How to Check for LSP Violations

**Ask these questions:**

1. **Can I replace parent with child without breaking code?**
   - If no → LSP violation

2. **Does the subclass throw new exceptions?**
   - If yes → LSP violation

3. **Does the subclass weaken postconditions (e.g., return null when parent returns non-null)?**
   - If yes → LSP violation

4. **Does the subclass strengthen preconditions (e.g., require amount > 100 when parent only requires amount > 0)?**
   - If yes → LSP violation

5. **Does the subclass override methods with empty implementations or throw UnsupportedOperationException?**
   - If yes → LSP violation (reconsider your inheritance hierarchy)

---

### Interview Questions on LSP

**Q1: What is the Liskov Substitution Principle?**

**A**: Objects of a superclass should be replaceable with objects of a subclass without affecting the correctness of the program.

**Q2: Explain the Rectangle-Square problem.**

**A**: [Use the example above - Square changes both width and height when you set one dimension, violating Rectangle's expected behavior]

**Q3: How does LSP relate to polymorphism?**

**A**: LSP is the foundation of polymorphism. For polymorphism to work correctly, subclasses must be truly substitutable for their parent classes.

**Q4: What's the difference between "IS-A" relationship in real world vs. code?**

**A**:
- **Real world**: A Square IS-A Rectangle (mathematically)
- **Code**: A Square might NOT BE-A Rectangle (behaviorally) - LSP focuses on behavioral compatibility

**Q5: How do you fix LSP violations?**

**A**:
- Remove inheritance if the "IS-A" relationship is not behavioral
- Use composition instead of inheritance
- Create proper abstractions (interfaces) that fit both types
- Refactor class hierarchy (e.g., Flyable interface for flying birds)

---

## 4. Interface Segregation Principle (ISP)

### Definition

> **"Clients should not be forced to depend on interfaces they do not use."**
>
> — Robert C. Martin

**In simple terms**: Create small, specific interfaces instead of one large, general-purpose interface. Classes should only implement methods they actually need.

**Real-world analogy**: Think of a universal remote control with 100 buttons. If you only watch TV, you don't need buttons for DVD, gaming console, and sound system. Better to have separate, smaller remotes for each device. ISP says: give clients only what they need.

---

### The Problem: Violating ISP

**Example - Fat Interface with Unnecessary Methods:**

```java
// ❌ BAD: One large interface with many responsibilities
public interface Machine {
    void print(Document doc);
    void scan(Document doc);
    void fax(Document doc);
    void staple(Document doc);
}

// Old multi-function printer can do everything
public class MultiFunctionPrinter implements Machine {
    @Override
    public void print(Document doc) {
        System.out.println("Printing: " + doc);
    }

    @Override
    public void scan(Document doc) {
        System.out.println("Scanning: " + doc);
    }

    @Override
    public void fax(Document doc) {
        System.out.println("Faxing: " + doc);
    }

    @Override
    public void staple(Document doc) {
        System.out.println("Stapling: " + doc);
    }
}

// ❌ PROBLEM: Simple printer is FORCED to implement unnecessary methods
public class SimplePrinter implements Machine {
    @Override
    public void print(Document doc) {
        System.out.println("Printing: " + doc);
    }

    @Override
    public void scan(Document doc) {
        // ❌ ISP VIOLATION: This printer can't scan!
        throw new UnsupportedOperationException("SimplePrinter cannot scan");
    }

    @Override
    public void fax(Document doc) {
        // ❌ ISP VIOLATION: This printer can't fax!
        throw new UnsupportedOperationException("SimplePrinter cannot fax");
    }

    @Override
    public void staple(Document doc) {
        // ❌ ISP VIOLATION: This printer can't staple!
        throw new UnsupportedOperationException("SimplePrinter cannot staple");
    }
}
```

**Problems with this design:**
1. **Forced implementation**: SimplePrinter must implement methods it doesn't support
2. **Runtime errors**: Client code might call unsupported methods and crash
3. **Misleading API**: Interface suggests SimplePrinter can scan/fax/staple, but it can't
4. **Hard to maintain**: Changes to one responsibility affect all implementations

---

### The Solution: Following ISP

**Refactored Design - Segregated Interfaces:**

```java
// ✅ GOOD: Segregate into small, specific interfaces
public interface Printer {
    void print(Document doc);
}

public interface Scanner {
    void scan(Document doc);
}

public interface Fax {
    void fax(Document doc);
}

public interface Stapler {
    void staple(Document doc);
}

// ✅ Simple printer only implements what it can do
public class SimplePrinter implements Printer {
    @Override
    public void print(Document doc) {
        System.out.println("Printing: " + doc);
    }
    // No need to implement scan/fax/staple!
}

// ✅ Multi-function printer implements multiple interfaces
public class MultiFunctionPrinter implements Printer, Scanner, Fax {
    @Override
    public void print(Document doc) {
        System.out.println("Printing: " + doc);
    }

    @Override
    public void scan(Document doc) {
        System.out.println("Scanning: " + doc);
    }

    @Override
    public void fax(Document doc) {
        System.out.println("Faxing: " + doc);
    }
}

// ✅ Photocopier only needs print and scan
public class Photocopier implements Printer, Scanner {
    @Override
    public void print(Document doc) {
        System.out.println("Printing: " + doc);
    }

    @Override
    public void scan(Document doc) {
        System.out.println("Scanning: " + doc);
    }
}

// ✅ Client code uses specific interfaces
public class Office {

    public void printDocument(Printer printer, Document doc) {
        printer.print(doc);  // Works with any Printer
    }

    public void scanDocument(Scanner scanner, Document doc) {
        scanner.scan(doc);  // Works with any Scanner
    }

    public static void main(String[] args) {
        Document doc = new Document("Report");

        Printer simplePrinter = new SimplePrinter();
        printDocument(simplePrinter, doc);  // ✅ Works

        // scanDocument(simplePrinter, doc);  // ❌ Compile error - good!
        // SimplePrinter doesn't implement Scanner

        MultiFunctionPrinter mfp = new MultiFunctionPrinter();
        printDocument(mfp, doc);  // ✅ Works
        scanDocument(mfp, doc);   // ✅ Works
    }
}
```

**Benefits of this design:**
- ✅ **No forced implementation**: Classes only implement methods they support
- ✅ **Compile-time safety**: Can't call scan() on SimplePrinter (compile error)
- ✅ **Clear contracts**: Each interface has a single, focused purpose
- ✅ **Easy to extend**: Add new capabilities (e.g., Copier) without affecting others

---

### Another Example: Worker Interface

**❌ BAD: Fat Worker Interface**

```java
// ❌ ISP VIOLATION: Not all workers need all these methods
public interface Worker {
    void work();
    void eat();
    void sleep();
    void getPaid();
}

// Human worker needs all methods
public class HumanWorker implements Worker {
    @Override
    public void work() {
        System.out.println("Human working");
    }

    @Override
    public void eat() {
        System.out.println("Human eating");
    }

    @Override
    public void sleep() {
        System.out.println("Human sleeping");
    }

    @Override
    public void getPaid() {
        System.out.println("Human getting paid");
    }
}

// ❌ Robot doesn't eat or sleep!
public class RobotWorker implements Worker {
    @Override
    public void work() {
        System.out.println("Robot working");
    }

    @Override
    public void eat() {
        // ❌ ISP VIOLATION: Robots don't eat
        throw new UnsupportedOperationException("Robots don't eat");
    }

    @Override
    public void sleep() {
        // ❌ ISP VIOLATION: Robots don't sleep
        throw new UnsupportedOperationException("Robots don't sleep");
    }

    @Override
    public void getPaid() {
        System.out.println("Robot getting maintenance");
    }
}
```

**✅ GOOD: Segregated Interfaces**

```java
// ✅ Core working capability
public interface Workable {
    void work();
}

// ✅ Biological needs
public interface Eatable {
    void eat();
}

public interface Sleepable {
    void sleep();
}

// ✅ Compensation
public interface Payable {
    void getPaid();
}

// ✅ Human implements all relevant interfaces
public class HumanWorker implements Workable, Eatable, Sleepable, Payable {
    @Override
    public void work() {
        System.out.println("Human working");
    }

    @Override
    public void eat() {
        System.out.println("Human eating");
    }

    @Override
    public void sleep() {
        System.out.println("Human sleeping");
    }

    @Override
    public void getPaid() {
        System.out.println("Human getting paid");
    }
}

// ✅ Robot only implements what it needs
public class RobotWorker implements Workable, Payable {
    @Override
    public void work() {
        System.out.println("Robot working");
    }

    @Override
    public void getPaid() {
        System.out.println("Robot getting maintenance");
    }
    // No eat() or sleep() methods - perfect!
}

// ✅ Client code uses specific interfaces
public class WorkManager {

    public void assignWork(Workable worker) {
        worker.work();  // Works with both humans and robots
    }

    public void arrangeBreak(Eatable worker) {
        worker.eat();  // Only works with entities that eat
    }

    public static void main(String[] args) {
        HumanWorker human = new HumanWorker();
        RobotWorker robot = new RobotWorker();

        assignWork(human);  // ✅ Works
        assignWork(robot);  // ✅ Works

        arrangeBreak(human);  // ✅ Works
        // arrangeBreak(robot);  // ❌ Compile error - perfect!
    }
}
```

---

### ISP in Spring Boot

**Example 1: Spring's Multiple Small Interfaces**

```java
// Spring doesn't force you to implement everything
// You pick only the interfaces you need

// ✅ Just initialize beans
public class MyApp implements InitializingBean {
    @Override
    public void afterPropertiesSet() throws Exception {
        // Initialization logic
    }
}

// ✅ Just clean up resources
public class MyService implements DisposableBean {
    @Override
    public void destroy() throws Exception {
        // Cleanup logic
    }
}

// ✅ Implement both if needed
public class MyComponent implements InitializingBean, DisposableBean {
    @Override
    public void afterPropertiesSet() throws Exception {
        // Init
    }

    @Override
    public void destroy() throws Exception {
        // Cleanup
    }
}
```

**Example 2: Repository Interfaces**

```java
// Spring Data provides segregated repository interfaces

// ✅ Minimal interface - only save and find
public interface CrudRepository<T, ID> {
    <S extends T> S save(S entity);
    Optional<T> findById(ID id);
}

// ✅ Adds paging - optional
public interface PagingAndSortingRepository<T, ID> extends CrudRepository<T, ID> {
    Page<T> findAll(Pageable pageable);
}

// ✅ Adds JPA-specific features - optional
public interface JpaRepository<T, ID> extends PagingAndSortingRepository<T, ID> {
    void flush();
    <S extends T> S saveAndFlush(S entity);
}

// ✅ Use only what you need
public interface InvoiceRepository extends CrudRepository<Invoice, Long> {
    // Gets save() and findById() - that's all we need!
}

// ✅ Use more features if needed
public interface UserRepository extends JpaRepository<User, Long> {
    // Gets all CRUD + Paging + JPA features
}
```

---

### How to Identify ISP Violations

**Warning signs:**

1. **Interface has many methods (> 5-7)**
   - Might need to be split

2. **Implementations throw UnsupportedOperationException**
   - Clear ISP violation

3. **Implementations have empty method bodies**
   - Sign that interface is too large

4. **Methods with unrelated responsibilities in same interface**
   - E.g., print() and sendEmail() in same interface

5. **Client code only uses subset of interface methods**
   - Interface might be too large for that use case

---

### ISP vs SRP

**How are they different?**

| ISP | SRP |
|-----|-----|
| Focuses on **interface design** | Focuses on **class design** |
| "Don't force clients to depend on unused methods" | "Class should have one reason to change" |
| About **interface consumers** | About **class responsibilities** |

**They work together:**
- **SRP** ensures each class has one responsibility
- **ISP** ensures each interface exposes only relevant methods for clients

```java
// ✅ SRP: PaymentService only handles payments
@Service
public class PaymentService {
    public void processPayment(PaymentRequest request) {
        // Payment logic only
    }
}

// ✅ ISP: PaymentGateway interface only has payment-related methods
public interface PaymentGateway {
    PaymentResponse charge(double amount);
    PaymentResponse refund(String transactionId);
}

// Not this:
// ❌ Violates ISP: Too many unrelated methods
public interface PaymentGateway {
    PaymentResponse charge(double amount);
    PaymentResponse refund(String transactionId);
    void sendEmail(String email);        // Unrelated!
    void logToDatabase(String message);  // Unrelated!
    void generateReport();               // Unrelated!
}
```

---

### When NOT to Apply ISP

**Don't over-segregate:**

❌ **Too granular:**

```java
// ❌ Overkill: Too many tiny interfaces
public interface Saveable {
    void save();
}

public interface Deleteable {
    void delete();
}

public interface Findable {
    Entity find();
}

public interface Updateable {
    void update();
}

// This forces you to implement 4 interfaces for basic CRUD
public class Repository implements Saveable, Deleteable, Findable, Updateable {
    // ...
}
```

✅ **Balanced approach:**

```java
// ✅ Good balance: Related operations grouped together
public interface CrudRepository {
    void save();
    void delete();
    Entity find();
    void update();
}
```

**Guidelines:**
- Group **cohesive methods** together (e.g., all CRUD operations)
- Segregate **unrelated concerns** (e.g., printing and emailing)
- Balance between **too granular** (1 method per interface) and **too coarse** (everything in one interface)

---

### Interview Questions on ISP

**Q1: What is the Interface Segregation Principle?**

**A**: Clients should not be forced to depend on interfaces they don't use. Create small, specific interfaces instead of large, general-purpose ones.

**Q2: How does ISP improve code quality?**

**A**:
- Reduces coupling (clients depend only on methods they use)
- Prevents forced implementation of unnecessary methods
- Makes code easier to understand and maintain
- Provides compile-time safety (can't call methods that don't exist)

**Q3: Give an example of ISP violation.**

**A**: [Use the Machine interface example - SimplePrinter forced to implement scan/fax/staple methods]

**Q4: How is ISP different from SRP?**

**A**:
- **SRP** focuses on class responsibilities (one class, one job)
- **ISP** focuses on interface design (clients shouldn't depend on unused methods)

**Q5: Can you have too many interfaces?**

**A**: Yes, over-segregation makes code harder to use. Balance between too coarse (one large interface) and too granular (one method per interface). Group cohesive operations together.

---

## 5. Dependency Inversion Principle (DIP)

### Definition

> **"High-level modules should not depend on low-level modules. Both should depend on abstractions."**
>
> **"Abstractions should not depend on details. Details should depend on abstractions."**
>
> — Robert C. Martin

**In simple terms**:
- Don't depend on concrete classes; depend on interfaces or abstract classes
- Your business logic shouldn't know about specific implementations (database, payment gateway, etc.)

**Real-world analogy**: Think of electrical outlets. Your laptop doesn't depend on a specific power plant (low-level detail). Instead, both your laptop and the power plant depend on a standard interface (the electrical outlet). You can plug your laptop anywhere in the world (with the right adapter) without knowing how that country generates electricity.

---

### The Problem: Violating DIP

**Example - Direct Dependency on Concrete Class:**

```java
// ❌ BAD: OrderService directly depends on RazorpayPayment (low-level module)
public class OrderService {

    // ❌ DIP VIOLATION: Tightly coupled to RazorpayPayment
    private RazorpayPayment payment = new RazorpayPayment();

    public void processOrder(String orderId, double amount) {
        // Business logic
        System.out.println("Processing order: " + orderId);

        // ❌ Directly using concrete class
        payment.charge(amount);

        System.out.println("Order completed");
    }
}

// Low-level module
public class RazorpayPayment {
    public void charge(double amount) {
        System.out.println("Charging $" + amount + " via Razorpay");
    }
}
```

**Problems with this design:**

1. **Tight coupling**: OrderService is tightly coupled to RazorpayPayment
2. **Hard to test**: Can't test OrderService without actually charging Razorpay
3. **Hard to change**: Switching from Razorpay to PayPal requires modifying OrderService
4. **Violates OCP**: Can't add new payment methods without modifying OrderService

**What if you want to switch to PayPal?**

```java
// ❌ BAD: Have to modify OrderService
public class OrderService {
    // private RazorpayPayment payment = new RazorpayPayment();  // Old
    private PayPalPayment payment = new PayPalPayment();  // ❌ Modified code!

    public void processOrder(String orderId, double amount) {
        System.out.println("Processing order: " + orderId);
        payment.charge(amount);
        System.out.println("Order completed");
    }
}
```

---

### The Solution: Following DIP

**Refactored Design - Depend on Abstraction:**

```java
// ✅ GOOD: Define an abstraction (interface)
public interface PaymentGateway {
    void charge(double amount);
}

// ✅ Low-level modules implement the abstraction
public class RazorpayPayment implements PaymentGateway {
    @Override
    public void charge(double amount) {
        System.out.println("Charging $" + amount + " via Razorpay");
        // Razorpay-specific API calls
    }
}

public class PayPalPayment implements PaymentGateway {
    @Override
    public void charge(double amount) {
        System.out.println("Charging $" + amount + " via PayPal");
        // PayPal-specific API calls
    }
}

public class StripePayment implements PaymentGateway {
    @Override
    public void charge(double amount) {
        System.out.println("Charging $" + amount + " via Stripe");
        // Stripe-specific API calls
    }
}

// ✅ GOOD: High-level module depends on abstraction
public class OrderService {

    // ✅ Depend on interface, not concrete class
    private PaymentGateway paymentGateway;

    // ✅ Inject dependency via constructor (Dependency Injection)
    public OrderService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public void processOrder(String orderId, double amount) {
        System.out.println("Processing order: " + orderId);

        // ✅ Use abstraction - don't care about implementation
        paymentGateway.charge(amount);

        System.out.println("Order completed");
    }
}

// ✅ Usage: Inject the specific implementation at runtime
public class EcommerceApp {
    public static void main(String[] args) {
        // ✅ Switch payment gateway without modifying OrderService
        PaymentGateway razorpay = new RazorpayPayment();
        OrderService orderService1 = new OrderService(razorpay);
        orderService1.processOrder("ORDER-001", 100.0);

        // ✅ Switch to PayPal - no changes to OrderService!
        PaymentGateway paypal = new PayPalPayment();
        OrderService orderService2 = new OrderService(paypal);
        orderService2.processOrder("ORDER-002", 200.0);

        // ✅ Switch to Stripe - still no changes to OrderService!
        PaymentGateway stripe = new StripePayment();
        OrderService orderService3 = new OrderService(stripe);
        orderService3.processOrder("ORDER-003", 300.0);
    }
}
```

**Benefits of this design:**
- ✅ **Loose coupling**: OrderService doesn't know about specific payment gateways
- ✅ **Easy to test**: Inject a mock PaymentGateway for unit tests
- ✅ **Easy to extend**: Add new payment gateways without modifying OrderService
- ✅ **Follows OCP**: Open for extension (new gateways), closed for modification (no changes to OrderService)

---

### DIP in Spring Boot

**Spring's Dependency Injection is a perfect example of DIP:**

```java
// ✅ Abstraction
public interface NotificationService {
    void sendNotification(String message);
}

// ✅ Implementations
@Service
@Qualifier("email")
public class EmailNotificationService implements NotificationService {
    @Override
    public void sendNotification(String message) {
        System.out.println("Sending email: " + message);
    }
}

@Service
@Qualifier("sms")
public class SmsNotificationService implements NotificationService {
    @Override
    public void sendNotification(String message) {
        System.out.println("Sending SMS: " + message);
    }
}

// ✅ High-level module depends on abstraction
@Service
public class UserService {

    private final NotificationService notificationService;

    // ✅ Spring injects the dependency
    @Autowired
    public UserService(@Qualifier("email") NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    public void registerUser(String username) {
        // User registration logic
        System.out.println("User registered: " + username);

        // ✅ Use abstraction
        notificationService.sendNotification("Welcome " + username);
    }
}
```

**Switch implementations via configuration:**

```java
// Option 1: Change @Qualifier
@Autowired
public UserService(@Qualifier("sms") NotificationService notificationService) {
    this.notificationService = notificationService;
}

// Option 2: Use @Primary on preferred implementation
@Service
@Primary
public class EmailNotificationService implements NotificationService {
    // ...
}

// Option 3: Configure via application.properties and @ConditionalOnProperty
@Service
@ConditionalOnProperty(name = "notification.type", havingValue = "email")
public class EmailNotificationService implements NotificationService {
    // ...
}
```

---

### DIP with Repository Pattern

**Another common Spring Boot example:**

```java
// ✅ Abstraction (Spring Data provides this)
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByCustomerEmail(String email);
}

// ✅ Service depends on abstraction
@Service
public class InvoiceService {

    private final InvoiceRepository repository;

    @Autowired
    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public Invoice createInvoice(Invoice invoice) {
        // ✅ Don't care if it's JPA, MongoDB, or in-memory
        return repository.save(invoice);
    }

    public List<Invoice> getInvoicesByEmail(String email) {
        return repository.findByCustomerEmail(email);
    }
}
```

**InvoiceService doesn't know:**
- What database is being used (MySQL, PostgreSQL, MongoDB)
- How data is persisted (JPA, JDBC, NoSQL)
- Where data is stored (local, cloud, cache)

**All it knows**: There's an InvoiceRepository interface with save() and find() methods.

---

### DIP Enables Easy Testing

**Without DIP (hard to test):**

```java
// ❌ BAD: Can't test without real database
public class UserService {
    private UserRepository repository = new JpaUserRepository();  // Hard-coded!

    public User getUser(Long id) {
        return repository.findById(id);  // Hits real database!
    }
}

// ❌ Test requires real database
@Test
public void testGetUser() {
    UserService service = new UserService();
    User user = service.getUser(1L);  // Actually queries database!
    assertNotNull(user);
}
```

**With DIP (easy to test):**

```java
// ✅ GOOD: Depends on abstraction
public class UserService {
    private UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User getUser(Long id) {
        return repository.findById(id);
    }
}

// ✅ Test with mock - no database needed
@Test
public void testGetUser() {
    // Create a mock repository
    UserRepository mockRepo = mock(UserRepository.class);
    when(mockRepo.findById(1L)).thenReturn(new User("John"));

    // Inject mock
    UserService service = new UserService(mockRepo);

    // Test business logic only - no database!
    User user = service.getUser(1L);
    assertEquals("John", user.getName());
}
```

---

### Dependency Injection Patterns

**There are three ways to inject dependencies:**

**1. Constructor Injection (✅ Recommended)**

```java
// ✅ BEST: Constructor injection
@Service
public class OrderService {
    private final PaymentGateway paymentGateway;
    private final InventoryService inventoryService;

    @Autowired  // Optional in Spring 4.3+
    public OrderService(PaymentGateway paymentGateway,
                       InventoryService inventoryService) {
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
    }
}
```

**Benefits:**
- Immutable (fields are final)
- Required dependencies are clear
- Easy to test (just pass mocks to constructor)
- Prevents circular dependencies

---

**2. Setter Injection (⚠️ Use for optional dependencies)**

```java
// ⚠️ Use only for optional dependencies
@Service
public class OrderService {
    private PaymentGateway paymentGateway;

    @Autowired
    public void setPaymentGateway(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
}
```

**Problems:**
- Mutable (can change at runtime)
- Not clear which dependencies are required
- Object can be in invalid state if setter not called

---

**3. Field Injection (❌ Avoid)**

```java
// ❌ BAD: Field injection (don't use in production code)
@Service
public class OrderService {

    @Autowired
    private PaymentGateway paymentGateway;  // ❌ Not final, hard to test
}
```

**Problems:**
- Can't create instance without Spring container (hard to test)
- Hides dependencies (not visible in constructor)
- Can't make fields final
- Reflection-based (slower, harder to debug)

---

### DIP vs Dependency Injection

**They're related but different:**

| DIP (Principle) | DI (Pattern) |
|-----------------|--------------|
| **What**: Design principle | **How**: Implementation technique |
| "Depend on abstractions" | "Inject dependencies from outside" |
| Guides architecture | Implements DIP in practice |

**DIP** says: "Depend on interfaces, not concrete classes"
**DI** says: "Don't create dependencies inside the class; inject them from outside"

```java
// ✅ Follows DIP (depends on interface) + DI (injected via constructor)
public class OrderService {
    private final PaymentGateway gateway;  // DIP: interface, not concrete class

    public OrderService(PaymentGateway gateway) {  // DI: injected, not created
        this.gateway = gateway;
    }
}

// ❌ Violates DIP (depends on concrete class)
public class OrderService {
    private final RazorpayPayment gateway = new RazorpayPayment();  // ❌ Concrete class
}

// ❌ Follows DIP but not DI (creates dependency inside class)
public class OrderService {
    private final PaymentGateway gateway;  // ✅ DIP: interface

    public OrderService() {
        this.gateway = new RazorpayPayment();  // ❌ Not DI: created inside
    }
}
```

---

### Layered Architecture and DIP

**DIP enables clean layered architecture:**

```
╔════════════════════════════════════════════════════════╗
║            LAYERED ARCHITECTURE (DIP)                  ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  ┌─────────────────────────────────────────┐           ║
║  │  Controller Layer (High-level)          │           ║
║  │  Depends on: Service Interface          │           ║
║  └────────────┬────────────────────────────┘           ║
║               │ depends on                             ║
║               ▼                                        ║
║  ┌─────────────────────────────────────────┐           ║
║  │  Service Layer (High-level)             │           ║
║  │  Depends on: Repository Interface       │           ║
║  └────────────┬────────────────────────────┘           ║
║               │ depends on                             ║
║               ▼                                        ║
║  ┌─────────────────────────────────────────┐           ║
║  │  Repository Interface (Abstraction)     │           ║
║  └────────────┬────────────────────────────┘           ║
║               △ implements                             ║
║               │                                        ║
║  ┌────────────┴────────────────────────────┐           ║
║  │  Repository Impl (Low-level details)    │           ║
║  │  JPA, JDBC, MongoDB, etc.               │           ║
║  └─────────────────────────────────────────┘           ║
║                                                        ║
║  High-level modules don't depend on low-level details  ║
║  Both depend on abstractions (interfaces)              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

**Code example:**

```java
// ✅ High-level: Controller depends on Service interface
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceService service;  // Interface, not implementation

    @Autowired
    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public Invoice getInvoice(@PathVariable Long id) {
        return service.findById(id);
    }
}

// ✅ Middle-level: Service depends on Repository interface
@Service
public class InvoiceServiceImpl implements InvoiceService {
    private final InvoiceRepository repository;  // Interface, not implementation

    @Autowired
    public InvoiceServiceImpl(InvoiceRepository repository) {
        this.repository = repository;
    }

    @Override
    public Invoice findById(Long id) {
        return repository.findById(id)
                         .orElseThrow(() -> new NotFoundException("Invoice not found"));
    }
}

// ✅ Low-level: Repository implementation (JPA, JDBC, etc.)
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    // Spring Data provides implementation at runtime
}
```

**Benefits:**
- Controller doesn't know about JPA, JDBC, or database
- Service doesn't know about database details
- Easy to switch from JPA to MongoDB without touching Controller or Service
- Each layer can be tested independently

---

### Common DIP Violations

**1. Creating dependencies with `new`**

```java
// ❌ BAD
public class OrderService {
    private EmailService emailService = new EmailService();  // ❌ Hard-coded

    public void placeOrder() {
        emailService.send("Order placed");
    }
}
```

**✅ Fix: Inject dependencies**

```java
public class OrderService {
    private final EmailService emailService;

    public OrderService(EmailService emailService) {  // ✅ Injected
        this.emailService = emailService;
    }
}
```

---

**2. Depending on concrete classes in method signatures**

```java
// ❌ BAD: Method depends on concrete class
public void processPayment(RazorpayPayment payment) {
    payment.charge(100);
}
```

**✅ Fix: Depend on interface**

```java
public void processPayment(PaymentGateway payment) {  // ✅ Interface
    payment.charge(100);
}
```

---

**3. Static methods (hidden dependencies)**

```java
// ❌ BAD: Static dependency - hard to test
public class OrderService {
    public void placeOrder() {
        DatabaseHelper.save(order);  // ❌ Static call - can't mock
    }
}
```

**✅ Fix: Inject as instance**

```java
public class OrderService {
    private final DatabaseHelper dbHelper;

    public OrderService(DatabaseHelper dbHelper) {  // ✅ Injected
        this.dbHelper = dbHelper;
    }

    public void placeOrder() {
        dbHelper.save(order);  // ✅ Can mock in tests
    }
}
```

---

### Interview Questions on DIP

**Q1: What is the Dependency Inversion Principle?**

**A**: High-level modules should not depend on low-level modules; both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions.

**Q2: How is DIP different from Dependency Injection?**

**A**:
- **DIP** is a design principle (what to do): Depend on interfaces, not concrete classes
- **DI** is an implementation pattern (how to do it): Inject dependencies instead of creating them

**Q3: Why is DIP important?**

**A**:
- Reduces coupling between modules
- Makes code easier to test (inject mocks)
- Makes code easier to change (swap implementations)
- Follows Open/Closed Principle (add new implementations without modifying existing code)

**Q4: Give an example of DIP from your project.**

**A**: [Use the OrderService + PaymentGateway example, or InvoiceService + InvoiceRepository]

**Q5: What's wrong with this code?**

```java
public class OrderService {
    private RazorpayPayment payment = new RazorpayPayment();
}
```

**A**:
- Violates DIP: Depends on concrete class (RazorpayPayment) instead of abstraction
- Tight coupling: Can't switch to PayPal without modifying OrderService
- Hard to test: Can't inject a mock payment gateway
- Fix: Depend on PaymentGateway interface and inject via constructor

---

## SOLID Principles in Practice

### How SOLID Principles Work Together

SOLID principles are interconnected and reinforce each other:

```
╔════════════════════════════════════════════════════════╗
║         HOW SOLID PRINCIPLES CONNECT                   ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  SRP → Each class has one responsibility              ║
║   │                                                    ║
║   └──→ Makes it easier to follow OCP                  ║
║        (extend one responsibility at a time)          ║
║                                                        ║
║  OCP → Open for extension, closed for modification    ║
║   │                                                    ║
║   └──→ Requires DIP (depend on abstractions)          ║
║        to enable extension without modification       ║
║                                                        ║
║  LSP → Subclasses must be substitutable               ║
║   │                                                    ║
║   └──→ Ensures OCP works correctly                    ║
║        (can't extend if subclass breaks contract)     ║
║                                                        ║
║  ISP → Many small interfaces > one large              ║
║   │                                                    ║
║   └──→ Supports SRP at the interface level            ║
║        (each interface has one purpose)               ║
║                                                        ║
║  DIP → Depend on abstractions                         ║
║   │                                                    ║
║   └──→ Enables OCP (add new implementations)          ║
║        and makes testing easier                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

### Real-World Example: Invoice System with All SOLID Principles

Let's build an invoice system that follows all five SOLID principles:

```java
// ✅ ISP: Small, focused interfaces
public interface Saveable {
    void save();
}

public interface Emailable {
    void sendEmail();
}

public interface Printable {
    void print();
}

// ✅ SRP: Invoice class only handles invoice data and calculations
public class Invoice {
    private String invoiceNumber;
    private double amount;
    private List<InvoiceItem> items;

    // Single Responsibility: Invoice business logic only
    public double calculateTotal() {
        return items.stream()
                   .mapToDouble(InvoiceItem::getPrice)
                   .sum();
    }

    public double calculateTax() {
        return calculateTotal() * 0.18;
    }

    // Getters
    public String getInvoiceNumber() { return invoiceNumber; }
    public double getAmount() { return amount; }
}

// ✅ SRP: Separate class for persistence
// ✅ DIP: Depends on abstraction (Repository interface)
public interface InvoiceRepository {
    void save(Invoice invoice);
    Invoice findById(String id);
}

@Repository
public class JpaInvoiceRepository implements InvoiceRepository {
    @Override
    public void save(Invoice invoice) {
        // JPA save logic
    }

    @Override
    public Invoice findById(String id) {
        // JPA find logic
        return new Invoice();
    }
}

// ✅ SRP: Separate class for email
// ✅ DIP: Depends on abstraction
public interface EmailService {
    void sendInvoiceEmail(String email, Invoice invoice);
}

@Service
public class SmtpEmailService implements EmailService {
    @Override
    public void sendInvoiceEmail(String email, Invoice invoice) {
        // SMTP email logic
    }
}

// ✅ OCP: Can add new notification types without modifying existing code
// ✅ DIP: Depends on abstraction
public interface NotificationService {
    void notify(String message);
}

@Service
public class EmailNotification implements NotificationService {
    @Override
    public void notify(String message) {
        System.out.println("Email: " + message);
    }
}

@Service
public class SmsNotification implements NotificationService {
    @Override
    public void notify(String message) {
        System.out.println("SMS: " + message);
    }
}

// ✅ SRP: Service orchestrates workflow
// ✅ DIP: Depends on abstractions (interfaces), not concrete classes
@Service
public class InvoiceService implements Saveable, Emailable {

    private final InvoiceRepository repository;  // DIP: interface
    private final EmailService emailService;      // DIP: interface
    private final NotificationService notification;  // DIP: interface

    // Constructor injection (DI)
    @Autowired
    public InvoiceService(InvoiceRepository repository,
                         EmailService emailService,
                         NotificationService notification) {
        this.repository = repository;
        this.emailService = emailService;
        this.notification = notification;
    }

    // ISP: Implements only methods it needs
    @Override
    public void save() {
        // Use repository
    }

    @Override
    public void sendEmail() {
        // Use email service
    }

    public void processInvoice(Invoice invoice, String customerEmail) {
        // Calculate total
        double total = invoice.calculateTotal();

        // Save to database
        repository.save(invoice);

        // Send email
        emailService.sendInvoiceEmail(customerEmail, invoice);

        // Send notification
        notification.notify("Invoice " + invoice.getInvoiceNumber() + " created");
    }
}

// ✅ LSP: Different invoice types can substitute base Invoice
public class TaxableInvoice extends Invoice {
    @Override
    public double calculateTax() {
        // Custom tax calculation for taxable invoices
        return calculateTotal() * 0.28;  // Higher tax rate
    }

    // ✅ LSP COMPLIANT: Still returns a valid tax amount, doesn't break contract
}

// ✅ OCP: Can add new repository implementations without modifying InvoiceService
@Repository
public class MongoInvoiceRepository implements InvoiceRepository {
    @Override
    public void save(Invoice invoice) {
        // MongoDB save logic
    }

    @Override
    public Invoice findById(String id) {
        // MongoDB find logic
        return new Invoice();
    }
}
```

**How this design follows SOLID:**

1. **SRP**:
   - Invoice → Business logic
   - InvoiceRepository → Persistence
   - EmailService → Email sending
   - InvoiceService → Orchestration

2. **OCP**:
   - Add MongoInvoiceRepository without modifying InvoiceService
   - Add SmsNotification without modifying existing code

3. **LSP**:
   - TaxableInvoice can substitute Invoice
   - JpaInvoiceRepository can substitute MongoInvoiceRepository

4. **ISP**:
   - Small interfaces (Saveable, Emailable, Printable)
   - InvoiceService implements only what it needs

5. **DIP**:
   - InvoiceService depends on InvoiceRepository interface, not JpaInvoiceRepository
   - Can inject mocks for testing

---

### SOLID Benefits Summary

| Principle | Key Benefit |
|-----------|-------------|
| **SRP** | Easier to maintain (one reason to change) |
| **OCP** | Easier to extend (add features without breaking existing code) |
| **LSP** | Safer inheritance (subclasses work everywhere parent works) |
| **ISP** | Cleaner interfaces (clients don't depend on unused methods) |
| **DIP** | Easier to test and change (depend on abstractions, inject mocks) |

**Overall SOLID benefits:**
- ✅ More maintainable code
- ✅ Easier to test
- ✅ Easier to extend
- ✅ Less coupling, more cohesion
- ✅ Better code organization

---

## Self-Check Questions

> Answer these from memory before looking back at the sections

**1. What does the SOLID acronym stand for?**

<details>
<summary>Answer</summary>
- S = Single Responsibility Principle
- O = Open/Closed Principle
- L = Liskov Substitution Principle
- I = Interface Segregation Principle
- D = Dependency Inversion Principle
</details>

---

**2. What is the Single Responsibility Principle? Give an example.**

<details>
<summary>Answer</summary>
A class should have only one reason to change (one responsibility).

Example: Instead of an Invoice class that handles calculations, database operations, and email sending, split into:
- Invoice (calculations)
- InvoiceRepository (database)
- EmailService (email)
</details>

---

**3. How is the Open/Closed Principle achieved in Java?**

<details>
<summary>Answer</summary>
- Use interfaces and abstract classes
- Program to interfaces, not implementations
- Use polymorphism to add new behaviors without modifying existing code
- Example: PaymentGateway interface with multiple implementations (Razorpay, PayPal, Stripe)
</details>

---

**4. Explain the Rectangle-Square problem (LSP violation).**

<details>
<summary>Answer</summary>
Square extends Rectangle, but when you set width on Square, it also changes height (to maintain square constraint). This breaks Rectangle's expected behavior where width and height are independent. Solution: Don't use inheritance; use separate classes or a common Shape interface.
</details>

---

**5. What's the difference between ISP and SRP?**

<details>
<summary>Answer</summary>
- **SRP**: Focuses on class design (one class, one responsibility)
- **ISP**: Focuses on interface design (don't force clients to depend on unused methods)
</details>

---

**6. What's the difference between DIP and Dependency Injection?**

<details>
<summary>Answer</summary>
- **DIP (Principle)**: Depend on abstractions (interfaces), not concrete classes
- **DI (Pattern)**: Inject dependencies from outside instead of creating them inside the class
</details>

---

**7. Give an example of a SOLID violation and how to fix it.**

<details>
<summary>Answer</summary>
**Violation**:
```java
public class OrderService {
    private RazorpayPayment payment = new RazorpayPayment();
}
```

**Violates**: DIP (depends on concrete class), SRP (tightly coupled)

**Fix**:
```java
public interface PaymentGateway {
    void charge(double amount);
}

public class OrderService {
    private final PaymentGateway payment;

    public OrderService(PaymentGateway payment) {
        this.payment = payment;
    }
}
```
</details>

---

**8. Why should you prefer constructor injection over field injection?**

<details>
<summary>Answer</summary>
- Fields can be final (immutable)
- Required dependencies are clear
- Easier to test (just pass mocks to constructor)
- No reflection needed
- Prevents circular dependencies
</details>

---

**9. How does Spring Boot encourage SOLID principles?**

<details>
<summary>Answer</summary>
- **SRP**: Layered architecture (Controller, Service, Repository)
- **OCP**: Dependency injection allows adding new implementations
- **LSP**: Repository interfaces (CrudRepository, JpaRepository)
- **ISP**: Small, focused interfaces (InitializingBean, DisposableBean)
- **DIP**: Dependency injection via @Autowired
</details>

---

**10. When should you NOT apply SOLID principles?**

<details>
<summary>Answer</summary>
- Don't over-engineer simple, stable code
- Don't create abstractions for things that never change
- Don't apply OCP if only one implementation will ever exist
- Don't over-segregate interfaces (balance between too coarse and too granular)
- Use judgment: SOLID improves maintainability, but simplicity is also valuable
</details>

---

## Common Interview Questions

### Knowledge-Based Questions

**Q1: Explain all five SOLID principles with examples.**

**A**: [Provide brief summary of each principle with a simple example]

---

**Q2: Which SOLID principle is most important?**

**A**:
- There's no "most important" - they work together
- **SRP** is foundational (affects class design)
- **DIP** enables testability (inject mocks)
- **OCP** ensures scalability (extend without breaking)
- In practice, **SRP** and **DIP** are used most frequently in Spring Boot applications

---

**Q3: How do SOLID principles relate to design patterns?**

**A**:
- **Strategy Pattern** → Implements OCP and DIP (PaymentGateway example)
- **Factory Pattern** → Implements OCP and DIP (create objects without knowing concrete types)
- **Decorator Pattern** → Implements OCP and LSP (extend behavior without modifying original class)
- **Template Method** → Implements OCP (subclasses extend behavior)

---

### Scenario-Based Questions

**Q4: Code review - Identify SOLID violations:**

```java
public class UserManager {
    public void createUser(String name, String email) {
        // Validate
        if (name == null || email == null) {
            throw new IllegalArgumentException("Invalid input");
        }

        // Save to database
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO users VALUES (?, ?)");
        stmt.setString(1, name);
        stmt.setString(2, email);
        stmt.executeUpdate();

        // Send email
        JavaMailSender sender = new JavaMailSender();
        sender.send(email, "Welcome!", "Welcome to our app");

        // Log
        System.out.println("User created: " + name);
    }
}
```

**A**:
**Violations:**
1. **SRP**: UserManager has multiple responsibilities (validation, database, email, logging)
2. **DIP**: Directly creates database connection and email sender (not injected)

**Fix:**
- Split into UserService (validation), UserRepository (database), EmailService (email), Logger (logging)
- Inject dependencies via constructor

---

**Q5: You need to add a new payment method. How would you design it following SOLID?**

**A**:
1. Define PaymentGateway interface (OCP, DIP)
2. Create new implementation (e.g., UpiPayment) without modifying existing code (OCP)
3. Inject into OrderService via constructor (DIP)
4. No changes to OrderService (OCP - closed for modification)

---

**Q6: How do you make code testable using SOLID principles?**

**A**:
- **SRP**: Small classes are easier to test
- **DIP**: Inject dependencies → can inject mocks in tests
- **ISP**: Test only relevant interfaces
- **OCP**: Add test-specific implementations without modifying production code

Example:
```java
// Production
OrderService service = new OrderService(new RazorpayPayment());

// Test
PaymentGateway mockGateway = mock(PaymentGateway.class);
OrderService service = new OrderService(mockGateway);
```

---

## Summary

**In 3 sentences:**
- SOLID principles are five design guidelines that make object-oriented code more maintainable, testable, and extensible
- They work together: SRP keeps classes focused, OCP allows extension, LSP ensures safe inheritance, ISP creates clean interfaces, and DIP enables loose coupling
- Following SOLID reduces technical debt and makes codebases easier to change as requirements evolve

**Key takeaway for interviews:**
- Be able to explain each principle with a simple example
- Identify violations in code snippets
- Know how to refactor code to follow SOLID
- Understand that SOLID principles work together, not in isolation

---

## Practice Exercises

### Exercise 1: Identify SOLID Violations

Review this code and list all SOLID violations:

```java
public class ReportGenerator {
    public void generateReport(String type) {
        if (type.equals("PDF")) {
            // PDF generation code
            System.out.println("Generating PDF report");
        } else if (type.equals("HTML")) {
            // HTML generation code
            System.out.println("Generating HTML report");
        } else if (type.equals("CSV")) {
            // CSV generation code
            System.out.println("Generating CSV report");
        }

        // Save to database
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO reports VALUES (?)");
        stmt.setString(1, type);
        stmt.executeUpdate();

        // Send email
        JavaMailSender sender = new JavaMailSender();
        sender.send("admin@example.com", "Report generated", "Report type: " + type);
    }
}
```

<details>
<summary>Answer</summary>

**Violations:**
1. **SRP**: Multiple responsibilities (report generation, database, email)
2. **OCP**: Adding new report type (XML, JSON) requires modifying this class
3. **DIP**: Creates database connection and email sender directly (not injected)

**Fix:**
- Create ReportGenerator interface with PDF, HTML, CSV implementations (OCP)
- Create ReportRepository for database operations (SRP)
- Create EmailService for email notifications (SRP)
- Inject dependencies via constructor (DIP)
</details>

---

### Exercise 2: Refactor to Follow SOLID

Refactor this code to follow all SOLID principles:

```java
public class Order {
    private String orderId;
    private double amount;

    public void process() {
        // Calculate discount
        double discount = amount * 0.10;
        double finalAmount = amount - discount;

        // Save to database
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO orders VALUES (?, ?)");
        stmt.setString(1, orderId);
        stmt.setDouble(2, finalAmount);
        stmt.executeUpdate();

        // Send confirmation email
        JavaMailSender sender = new JavaMailSender();
        sender.send("customer@example.com", "Order confirmed", "Order ID: " + orderId);
    }
}
```

<details>
<summary>Answer</summary>

```java
// SRP: Separate classes for each responsibility

// Business logic
public class Order {
    private String orderId;
    private double amount;

    public double calculateFinalAmount() {
        double discount = amount * 0.10;
        return amount - discount;
    }

    // Getters
}

// DIP: Repository interface
public interface OrderRepository {
    void save(Order order);
}

@Repository
public class JpaOrderRepository implements OrderRepository {
    @Override
    public void save(Order order) {
        // JPA save logic
    }
}

// DIP: Email service interface
public interface EmailService {
    void sendOrderConfirmation(String email, String orderId);
}

@Service
public class SmtpEmailService implements EmailService {
    @Override
    public void sendOrderConfirmation(String email, String orderId) {
        // Email logic
    }
}

// SRP + DIP: Service orchestrates workflow
@Service
public class OrderService {
    private final OrderRepository repository;
    private final EmailService emailService;

    @Autowired
    public OrderService(OrderRepository repository, EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }

    public void processOrder(Order order, String customerEmail) {
        double finalAmount = order.calculateFinalAmount();
        repository.save(order);
        emailService.sendOrderConfirmation(customerEmail, order.getOrderId());
    }
}
```
</details>

---

### Exercise 3: Design a System Following SOLID

Design a notification system that supports Email, SMS, and Push notifications. Follow all SOLID principles.

<details>
<summary>Answer</summary>

```java
// ISP: Small, focused interface
public interface NotificationSender {
    void send(String recipient, String message);
}

// OCP + DIP: Multiple implementations
@Service
public class EmailNotification implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        System.out.println("Email to " + recipient + ": " + message);
    }
}

@Service
public class SmsNotification implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        System.out.println("SMS to " + recipient + ": " + message);
    }
}

@Service
public class PushNotification implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        System.out.println("Push to " + recipient + ": " + message);
    }
}

// SRP: Service handles notification logic
@Service
public class NotificationService {
    private final NotificationSender sender;

    @Autowired
    public NotificationService(@Qualifier("email") NotificationSender sender) {
        this.sender = sender;
    }

    public void notifyUser(String recipient, String message) {
        sender.send(recipient, message);
    }
}

// OCP: Can add Slack, WhatsApp, etc. without modifying existing code
@Service
public class SlackNotification implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        System.out.println("Slack to " + recipient + ": " + message);
    }
}
```
</details>

---

## How This Connects

**Builds on** (review these if shaky):
- [OOP_Class_Object_Fundamentals.md](./OOP_Class_Object_Fundamentals.md) - Classes, objects, inheritance, polymorphism
- [OOP_Advanced_Concepts.md](./OOP_Advanced_Concepts.md) - Interfaces, abstract classes, encapsulation

**Related concepts** (compare/contrast):
- [Design Patterns](../../03-architecture/design-patterns/) - SOLID principles guide pattern usage
- [Spring Core](../../02-spring-ecosystem/spring-core/01-dependency-injection.md) - DIP in action via Spring DI
- [Clean Code Principles](../../05-security-quality/code-quality/) - SOLID is part of clean code

**Next steps** (learn these next):
- Design Patterns - Practical applications of SOLID principles
- Spring Dependency Injection - DIP implementation in Spring
- Refactoring Techniques - How to transform legacy code to follow SOLID

---

**Next**: [Design Patterns Overview](../../03-architecture/design-patterns/README.md)
