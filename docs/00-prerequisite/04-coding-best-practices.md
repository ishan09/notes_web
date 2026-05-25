# Coding Best Practices for New Software Developers

## What You'll Learn

This guide teaches the foundational practices that separate "code that works" from "code that's maintainable in a professional team environment." You'll learn:

- Why formatting and readability matter beyond aesthetics
- How to set up a professional development environment
- Principles for writing maintainable code
- Language-specific conventions (Java and Python)
- When and how to write effective comments
- How to recognize and fix common code smells

**Time Investment:** 2-3 hours with exercises
**Prerequisites:** None (foundational guide)

---

## 1. What are Coding Best Practices?

### The Recipe Analogy

Imagine you're writing a recipe for someone who's never cooked before. You could write:

❌ **Bad Recipe:**
```
Cook stuff. Add things. Heat. Done.
```

✅ **Good Recipe:**
```
1. Preheat oven to 350°F (175°C)
2. Mix 2 cups flour with 1 tsp baking powder
3. In separate bowl, beat 2 eggs with 1 cup sugar
4. Combine wet and dry ingredients
5. Bake for 25 minutes until golden brown
```

Code works the same way. You could write code that technically works but is impossible for others (or future you) to understand:

❌ **Works, but unreadable:**
```java
public void p(List<Order> o){if(o==null||o.isEmpty()){return;}for(Order x:o){if(x.isValid()){processOrder(x);}}}
```

✅ **Works AND readable:**
```java
public void processOrders(List<Order> orders) {
    if (orders == null || orders.isEmpty()) {
        return;
    }

    for (Order order : orders) {
        if (order.isValid()) {
            processOrder(order);
        }
    }
}
```

### Simple Explanation

**Coding best practices** are the conventions, patterns, and techniques that make code:
- **Readable** - Easy to understand at a glance
- **Maintainable** - Easy to modify without breaking things
- **Collaborative** - Easy for teammates to work with

The core principle: **Code is read 10x more than it's written.**

You might spend 30 minutes writing a function, but over its lifetime:
- You'll read it dozens of times during debugging
- Teammates will read it during code reviews
- Future developers will read it when adding features
- Someone will read it at 2 AM trying to fix a production bug

### The Difference from "Code That Works"

| Code That Works | Professional Code |
|---|---|
| Runs without errors | Runs without errors |
| Solves the immediate problem | Solves the problem AND is easy to modify |
| Only you understand it | Anyone on the team understands it |
| Hard to test | Designed for testability |
| Becomes technical debt | Reduces technical debt |

**Stop and Think:** Can you recall a time when you struggled to understand your own code from a month ago? That's the pain these practices prevent.

---

## 2. Why This Matters

### Real-World Impact

**Scenario 1: Joining a Team**

You join a company with a 5-year-old codebase. Without coding standards:
- Every file looks different
- Variables named `x`, `temp`, `data2`
- 800-line functions you can't comprehend
- No comments explaining why decisions were made

**Result:** Takes 6 months to become productive instead of 6 weeks.

**Scenario 2: Code Review**

You submit a pull request. Your teammate reviews it and sees:
```java
// What does this do?
if(u.getAge()>18&&u.getCountry().equals("US")&&!u.isBanned()){
    processUser(u);
}
```

They have to mentally parse the logic, guess the business rule, and hope they understand correctly.

Compare to:
```java
if (user.isEligibleForService()) {
    processUser(user);
}

// In User class:
public boolean isEligibleForService() {
    return age > 18
        && country.equals("US")
        && !isBanned;
}
```

**Result:** Review takes 10 minutes instead of 45 minutes.

**Scenario 3: Production Bug**

At 2 AM, the system crashes. You need to understand this code quickly:
```python
def calc(d):
    t=0
    for i in d:
        if i[2]>100:t+=i[1]*0.9
        else:t+=i[1]
    return t
```

**Result:** Takes 20 minutes to understand. Every minute costs money during an outage.

### Interview Context

Coding best practices directly impact interview performance:

**Live Coding Interviews:**
- Interviewers evaluate code quality, not just correctness
- Meaningful variable names show clear thinking
- Clean formatting makes your logic easier to follow

**Take-Home Assignments:**
- Code quality often matters more than features
- Professional formatting signals experience
- Good practices demonstrate you're ready for team work

**Code Review Questions:**
- "What would you change about this code?" tests your ability to spot issues
- Understanding SOLID principles helps you discuss design decisions

---

## 3. Setting Up Your Development Environment

Professional developers use tools to automate code quality. This section focuses on **VS Code** (free, cross-platform, widely used) with callouts for IntelliJ IDEA users.

### 3A. VS Code Setup

#### Installation and Workspace Concepts

1. **Download:** [code.visualstudio.com](https://code.visualstudio.com/)
2. **Workspace vs Folder:**
   - **Folder:** Opening a single project directory
   - **Workspace:** Multiple related folders with shared settings
   - For interview prep, open `java_prep` as a folder

3. **Settings Sync:**
   - Sign in with GitHub/Microsoft account
   - Settings sync across all machines
   - Extensions install automatically

#### Top 15 Productivity Keyboard Shortcuts

| Shortcut (Mac) | Shortcut (Windows/Linux) | Action |
|---|---|---|
| `Cmd+P` | `Ctrl+P` | Quick file open |
| `Cmd+Shift+P` | `Ctrl+Shift+P` | Command palette |
| `Cmd+D` | `Ctrl+D` | Select next occurrence |
| `Cmd+/` | `Ctrl+/` | Toggle line comment |
| `Opt+Shift+F` | `Alt+Shift+F` | Format document |
| `Cmd+Shift+F` | `Ctrl+Shift+F` | Find in files |
| `Cmd+Click` | `Ctrl+Click` | Go to definition |
| `Opt+Up/Down` | `Alt+Up/Down` | Move line up/down |
| `Cmd+Opt+Up/Down` | `Ctrl+Alt+Up/Down` | Add cursor above/below |
| `Cmd+B` | `Ctrl+B` | Toggle sidebar |
| `Cmd+J` | `Ctrl+J` | Toggle terminal |
| `F12` | `F12` | Go to definition |
| `Shift+F12` | `Shift+F12` | Find all references |
| `Cmd+.` | `Ctrl+.` | Quick fix |
| `F2` | `F2` | Rename symbol |

**Try it:** Open VS Code and practice `Cmd+P` → type filename → Enter. This is faster than clicking through folders.

### 3B. Essential Extensions (Universal)

These extensions work across all programming languages:

#### 1. Prettier - Code Formatter

**Purpose:** Automatically formats code to a consistent style

**Installation:** Search "Prettier" in Extensions, install "Prettier - Code formatter" by Prettier

**Key Configuration (settings.json):**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true
}
```

**Why it matters:** Eliminates debates about spacing, indentation, and brace placement.

#### 2. EditorConfig

**Purpose:** Maintains consistent formatting across different editors and IDEs

**Installation:** Search "EditorConfig" in Extensions

**Setup:** Create `.editorconfig` in project root:
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 4

[*.{java,kt}]
indent_size = 4

[*.{py}]
indent_size = 4

[*.{yml,yaml,json}]
indent_size = 2
```

**Why it matters:** Team members using different IDEs see the same formatting.

#### 3. GitLens

**Purpose:** Git supercharged - see who changed what and when

**Installation:** Search "GitLens" in Extensions

**Key Features:**
- Inline blame annotations (who wrote this line)
- File history visualization
- Compare branches visually

**Why it matters:** Understand context behind code changes, find who to ask about confusing logic.

#### 4. Error Lens

**Purpose:** Show errors and warnings inline (not just in sidebar)

**Installation:** Search "Error Lens" in Extensions

**Why it matters:** Reduces context switching - see errors right where you're typing.

#### 5. Path Intellisense

**Purpose:** Autocomplete file paths in import statements

**Installation:** Search "Path Intellisense" in Extensions

**Why it matters:** Avoid typos in import paths, discover available modules faster.

#### 6. Code Spell Checker

**Purpose:** Catch typos in variable names, comments, and strings

**Installation:** Search "Code Spell Checker" in Extensions

**Why it matters:** Typos like `processOder` instead of `processOrder` cause bugs and look unprofessional.

#### 7. SonarLint

**Purpose:** Real-time code quality feedback (bugs, vulnerabilities, code smells)

**Installation:** Search "SonarLint" in Extensions

**Why it matters:** Catch issues before code review - null pointer risks, security vulnerabilities, complexity problems.

### 3C. Language-Specific Extensions

#### Java Stack

| Extension | Purpose | Key Feature |
|---|---|---|
| **Extension Pack for Java** (Microsoft) | All-in-one Java support | Includes language server, debugger, test runner, Maven |
| **Spring Boot Extension Pack** (VMware) | Spring development | Run Spring Boot apps, autocomplete annotations |
| **Lombok Annotations Support** | Lombok compatibility | Recognize @Getter, @Builder, etc. |
| **Maven for Java** | Maven build tool | Execute Maven goals from sidebar |
| **Checkstyle** | Style enforcement | Real-time feedback on Google/Sun style violations |
| **SpotBugs** | Bug detection | Find common Java bugs (null pointers, resource leaks) |

**Sample Java settings.json:**
```json
{
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
  "java.format.settings.profile": "GoogleStyle",
  "java.saveActions.organizeImports": true,
  "java.configuration.updateBuildConfiguration": "automatic",
  "[java]": {
    "editor.defaultFormatter": "redhat.java",
    "editor.formatOnSave": true,
    "editor.tabSize": 4
  }
}
```

**IntelliJ IDEA Users:**
> IntelliJ IDEA comes with these features built-in:
> - Code formatting: `Cmd+Opt+L` (Mac) or `Ctrl+Alt+L` (Windows)
> - Organize imports: `Cmd+Opt+O` (Mac) or `Ctrl+Alt+O` (Windows)
> - Spring support: Built into Ultimate edition
> - Import Google Java Style: File → Settings → Editor → Code Style → Java → Import Scheme
>
> The principles in this guide apply regardless of IDE choice.

#### Python Stack

| Extension | Purpose | Key Feature |
|---|---|---|
| **Python** (Microsoft) | Core Python support | IntelliSense, debugging, linting |
| **Pylance** | Fast language server | Type checking, auto-imports |
| **Python Indent** | Correct indentation | Auto-indent after colons |
| **Black Formatter** | Opinionated formatter | Uncompromising code style |
| **Ruff** | Fast linter | Replaces Flake8, isort, pydocstyle |

**Sample Python settings.json:**
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.formatting.provider": "none",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    },
    "editor.tabSize": 4
  },
  "black-formatter.args": [
    "--line-length=100"
  ],
  "ruff.args": [
    "--line-length=100"
  ]
}
```

**PyCharm Users:**
> PyCharm includes similar features:
> - Format code: `Cmd+Opt+L` (Mac) or `Ctrl+Alt+L` (Windows)
> - Configure Black: File → Settings → Tools → Black → Enable "On Save"
> - Built-in inspections replace Ruff/Flake8
> - Virtual environment auto-detection
>
> All principles here apply to PyCharm as well.

### Setup Checklist

After installation, verify your setup:

- [ ] Open VS Code, press `Cmd+Shift+P` (or `Ctrl+Shift+P`), type "format document" - should see formatter options
- [ ] Create a test file, write messy code, save - should auto-format
- [ ] Install language extensions for your primary language (Java or Python)
- [ ] Enable Settings Sync to keep configuration across machines
- [ ] Practice top 5 keyboard shortcuts until muscle memory develops

**Try it:** Create a file `test.java`, paste this messy code, and save:
```java
public class Test{public void test(String name){if(name!=null){System.out.println(name);}}}
```

If properly configured, it should auto-format to:
```java
public class Test {
    public void test(String name) {
        if (name != null) {
            System.out.println(name);
        }
    }
}
```

---

## 4. Why Formatting Matters

### The Brain Science

Your brain processes consistent patterns 30-40% faster than inconsistent ones. When code follows predictable formatting:
- You scan structure visually (indentation shows nesting)
- Your eyes jump to key elements (method names, conditions)
- You recognize patterns without reading every character

### Team Collaboration

Without consistent formatting:
- Every developer formats differently
- Git diffs show formatting changes mixed with logic changes
- Code reviews focus on style instead of logic
- Merge conflicts increase

With automated formatting:
- Code looks like one person wrote it
- Git diffs only show meaningful changes
- Reviews focus on correctness and design
- Merge conflicts decrease

### The Bikeshedding Problem

"Bikeshedding" is when teams waste time debating trivial decisions (like what color to paint a bike shed). Without automated formatting, teams waste hours debating:
- Tabs vs spaces
- Where to place braces
- Max line length
- Spacing around operators

**Solution:** Pick a formatter, configure once, never debate again.

### Before/After Example 1: Inconsistent Spacing

❌ **Before: Hard to scan structure**
```java
public class OrderProcessor{
private static final int MAX_RETRIES=3;
public void process(List<Order>orders){
if(orders==null||orders.isEmpty()){
return;}
for(Order order:orders){
if(order.getAmount()>1000){
processLargeOrder(order);}
else{processSmallOrder(order);}}}}
```

✅ **After: Structure is immediately visible**
```java
public class OrderProcessor {
    private static final int MAX_RETRIES = 3;

    public void process(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return;
        }

        for (Order order : orders) {
            if (order.getAmount() > 1000) {
                processLargeOrder(order);
            } else {
                processSmallOrder(order);
            }
        }
    }
}
```

**What changed:**
- Consistent spacing around operators (`=`, `>`, `||`)
- Indentation shows nesting levels
- Blank lines separate logical sections
- Opening braces on same line (Java convention)

### Before/After Example 2: Python Inconsistency

❌ **Before: Mixed indentation and spacing**
```python
def calculate_total(items):
  total=0
  for item in items:
      if item['price']>100:
        total+=item['price']*0.9
      else:
          total+=item['price']
  return total
```

✅ **After: Consistent and readable**
```python
def calculate_total(items):
    total = 0
    for item in items:
        if item["price"] > 100:
            total += item["price"] * 0.9
        else:
            total += item["price"]
    return total
```

**What changed:**
- Consistent 4-space indentation (PEP 8 standard)
- Spacing around operators
- Double quotes for strings (Black formatter default)

### Use/Don't Use Table

| ✅ Do This | ❌ Don't Do This |
|---|---|
| Use automated formatter (Prettier, Black, Google Java Style) | Manually format every file |
| Configure format-on-save | Remember to format before commit |
| Pick a style guide and stick to it | Mix styles in same project |
| Let tools enforce rules | Debate style in code reviews |
| Focus code reviews on logic | Focus reviews on brace placement |

**Stop and Think:** If formatting is automated, why should you still understand it? Because you need to read code on GitHub, in interviews, and in codebases without formatters.

---

## 5. Readability Principles

Readability is about making your intent clear. Future readers (including you) should understand what the code does and why it exists without reverse-engineering it.

### 5A. Meaningful Names

Names are the primary tool for communicating intent. Good names answer three questions:
1. **What is this?** (variable purpose)
2. **What does it do?** (function behavior)
3. **Why does it exist?** (context)

#### Variables: Nouns, Descriptive

Variables represent data, so use **nouns** that describe the content.

❌ **Bad: Abbreviations and single letters**
```java
String n;           // What is 'n'?
int d;              // Days? Distance? Data?
List<Order> o;      // Hard to search for
double amt;         // Amount of what?
```

✅ **Good: Self-documenting**
```java
String customerName;
int daysUntilExpiration;
List<Order> pendingOrders;
double orderTotalAmount;
```

**Python example:**
```python
# ❌ Bad
def calc(d, r):
    return d * r

# ✅ Good
def calculate_total_price(quantity, unit_price):
    return quantity * unit_price
```

**Guidelines:**
- **Length proportional to scope:** Loop variable `i` is fine for 3-line loop, but use `orderIndex` in 50-line function
- **Avoid abbreviations:** `customer` not `cust`, `message` not `msg`
- **Boolean variables:** Prefix with `is`, `has`, `can`, `should`
  - `isValid`, `hasPermission`, `canEdit`, `shouldRetry`

**Try it:** Rename these variables meaningfully:
```java
int x = 30;           // Represents days in trial period
List<User> lst;       // Represents active users
boolean f;            // Represents whether user is verified
```

<details>
<summary>Answer (try first!)</summary>

```java
int trialPeriodDays = 30;
List<User> activeUsers;
boolean isUserVerified;
```
</details>

#### Functions: Verbs, Intention-Revealing

Functions perform actions, so use **verbs** that describe what they do.

❌ **Bad: Vague or misleading**
```java
void data(User u);              // What does this do with data?
boolean check(Order o);         // Check what?
void process(List<Item> items); // Process how?
int calculate(int x, int y);    // Calculate what?
```

✅ **Good: Clear action and intent**
```java
void saveUserToDatabase(User user);
boolean isOrderValid(Order order);
void applyDiscountToItems(List<Item> items);
int calculateOrderTotal(int quantity, int unitPrice);
```

**Naming patterns by function type:**

| Function Type | Pattern | Example |
|---|---|---|
| Query (returns data) | `get`, `find`, `fetch` | `getUserById(id)` |
| Predicate (returns boolean) | `is`, `has`, `can`, `should` | `isEmailValid(email)` |
| Command (changes state) | `create`, `update`, `delete`, `save` | `saveOrder(order)` |
| Transformation | `convert`, `transform`, `map` | `convertToDto(entity)` |

**Python example:**
```python
# ❌ Bad
def user(id):
    pass

# ✅ Good
def find_user_by_id(user_id):
    pass

# ❌ Bad
def validate(email):
    pass

# ✅ Good
def is_email_valid(email):
    pass
```

**Try it:** Rename these functions:
```java
void handle(Payment p);      // Processes payment through gateway
boolean test(String email);  // Checks if email format is valid
List<Order> get(int uid);    // Retrieves orders for user
```

<details>
<summary>Answer (try first!)</summary>

```java
void processPaymentThroughGateway(Payment payment);
boolean isEmailFormatValid(String email);
List<Order> getOrdersByUserId(int userId);
```
</details>

#### Classes: Nouns, Single Responsibility

Classes represent concepts or entities, so use **nouns** that describe what they are.

❌ **Bad: Vague or overly generic**
```java
class Manager { }        // Manages what?
class Data { }           // What kind of data?
class Handler { }        // Handles what?
class Processor { }      // Processes what?
class Utility { }        // Contains what utilities?
```

✅ **Good: Specific and descriptive**
```java
class OrderManager { }
class UserRepository { }
class PaymentProcessor { }
class EmailValidator { }
class StringFormatter { }
```

**Naming patterns by class type:**

| Class Type | Pattern | Example |
|---|---|---|
| Entity/Model | Noun | `User`, `Order`, `Product` |
| Service | `[Noun]Service` | `PaymentService`, `EmailService` |
| Repository | `[Noun]Repository` | `UserRepository`, `OrderRepository` |
| Controller | `[Noun]Controller` | `OrderController`, `UserController` |
| Utility | `[Noun]Utils` or `[Noun]Helper` | `StringUtils`, `DateFormatter` |

#### Constants: UPPERCASE_SNAKE_CASE

Constants represent fixed configuration values.

```java
// ✅ Java
public static final int MAX_RETRY_ATTEMPTS = 3;
public static final String DEFAULT_CURRENCY = "USD";
public static final double TAX_RATE = 0.07;

// ✅ Python
MAX_RETRY_ATTEMPTS = 3
DEFAULT_CURRENCY = "USD"
TAX_RATE = 0.07
```

**Why uppercase?** Instantly distinguishes constants from variables.

### 5B. Function Size and Complexity

#### The Single Responsibility Principle

Each function should do **one thing** and do it well. If you can't describe a function's purpose in one sentence without using "and", it does too much.

❌ **Bad: Function does multiple things**
```java
// Validates user, checks inventory, processes payment, sends email
public void processOrder(Order order, User user) {
    // Validate user (responsibility 1)
    if (user.getEmail() == null || !user.getEmail().contains("@")) {
        throw new ValidationException("Invalid email");
    }

    // Check inventory (responsibility 2)
    for (OrderItem item : order.getItems()) {
        Product product = productRepository.findById(item.getProductId());
        if (product.getStock() < item.getQuantity()) {
            throw new OutOfStockException("Product unavailable");
        }
    }

    // Process payment (responsibility 3)
    PaymentRequest paymentRequest = new PaymentRequest();
    paymentRequest.setAmount(order.getTotal());
    paymentRequest.setCardNumber(user.getCreditCard());
    paymentGateway.charge(paymentRequest);

    // Send confirmation email (responsibility 4)
    String emailBody = "Thank you for your order...";
    emailService.send(user.getEmail(), "Order Confirmation", emailBody);
}
```

✅ **Good: Each function has one responsibility**
```java
public void processOrder(Order order, User user) {
    validateUser(user);
    validateInventory(order);
    chargePayment(order, user);
    sendOrderConfirmation(order, user);
}

private void validateUser(User user) {
    if (!isEmailValid(user.getEmail())) {
        throw new ValidationException("Invalid email");
    }
}

private void validateInventory(Order order) {
    for (OrderItem item : order.getItems()) {
        ensureProductInStock(item);
    }
}

private void ensureProductInStock(OrderItem item) {
    Product product = productRepository.findById(item.getProductId());
    if (product.getStock() < item.getQuantity()) {
        throw new OutOfStockException("Product unavailable");
    }
}

private void chargePayment(Order order, User user) {
    PaymentRequest request = createPaymentRequest(order, user);
    paymentGateway.charge(request);
}

private void sendOrderConfirmation(Order order, User user) {
    String emailBody = buildConfirmationEmail(order);
    emailService.send(user.getEmail(), "Order Confirmation", emailBody);
}
```

**Benefits of small functions:**
- Easy to test in isolation
- Easy to understand without scrolling
- Easy to reuse
- Easy to name accurately

#### Function Length Guidelines

**Target: 20-30 lines per function** (excluding braces and blank lines)

| Lines | Assessment | Action |
|---|---|---|
| 1-10 | Ideal | Perfect size |
| 10-30 | Good | Acceptable |
| 30-50 | Warning | Look for extraction opportunities |
| 50+ | Problem | Definitely extract methods |

**Exception:** Main/orchestrator functions can be longer if they're mostly method calls (like the refactored `processOrder` above).

#### Cyclomatic Complexity

**Cyclomatic complexity** measures the number of independent paths through code. Each `if`, `for`, `while`, `case`, `&&`, `||` increases complexity.

```java
// Complexity = 5 (high)
public void process(Order order) {
    if (order != null) {                    // +1
        if (order.isPaid()) {               // +1
            if (order.getItems().size() > 0) { // +1
                for (Item item : order.getItems()) { // +1
                    if (item.isAvailable()) {  // +1
                        ship(item);
                    }
                }
            }
        }
    }
}
```

**Target complexity: < 10 per function**

**How to reduce:**
- Extract methods
- Use guard clauses (early returns)
- Replace nested conditions with boolean methods

#### Extract Method Refactoring

When a function is too long, **extract** cohesive chunks into separate methods.

**Before:**
```python
def generate_invoice(order):
    # Calculate subtotal
    subtotal = 0
    for item in order.items:
        subtotal += item.price * item.quantity

    # Calculate tax
    tax_rate = 0.07 if order.state == "CA" else 0.05
    tax = subtotal * tax_rate

    # Calculate discount
    discount = 0
    if subtotal > 100:
        discount = subtotal * 0.1

    # Calculate total
    total = subtotal + tax - discount

    # Generate invoice text
    invoice = f"Subtotal: ${subtotal}\n"
    invoice += f"Tax: ${tax}\n"
    invoice += f"Discount: ${discount}\n"
    invoice += f"Total: ${total}\n"

    return invoice
```

**After:**
```python
def generate_invoice(order):
    subtotal = calculate_subtotal(order)
    tax = calculate_tax(subtotal, order.state)
    discount = calculate_discount(subtotal)
    total = subtotal + tax - discount

    return format_invoice(subtotal, tax, discount, total)

def calculate_subtotal(order):
    return sum(item.price * item.quantity for item in order.items)

def calculate_tax(subtotal, state):
    tax_rate = 0.07 if state == "CA" else 0.05
    return subtotal * tax_rate

def calculate_discount(subtotal):
    return subtotal * 0.1 if subtotal > 100 else 0

def format_invoice(subtotal, tax, discount, total):
    return (
        f"Subtotal: ${subtotal}\n"
        f"Tax: ${tax}\n"
        f"Discount: ${discount}\n"
        f"Total: ${total}\n"
    )
```

**Benefits:**
- Each function is testable independently
- Easy to modify tax calculation without touching discount logic
- Function names document what each section does

**Try it:** This function does too much. How would you extract methods?
```java
public String processUserRegistration(String email, String password, String name) {
    // Validate inputs
    if (email == null || !email.contains("@")) {
        return "Invalid email";
    }
    if (password == null || password.length() < 8) {
        return "Password too short";
    }
    if (name == null || name.isEmpty()) {
        return "Name required";
    }

    // Hash password
    String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());

    // Create user
    User user = new User();
    user.setEmail(email);
    user.setPassword(hashedPassword);
    user.setName(name);
    user.setCreatedAt(LocalDateTime.now());

    // Save to database
    userRepository.save(user);

    // Send welcome email
    String emailBody = "Welcome " + name + "! Thank you for registering.";
    emailService.send(email, "Welcome!", emailBody);

    return "Success";
}
```

### 5C. Cognitive Load Reduction

**Cognitive load** is the mental effort required to understand code. Reduce it by:
- Avoiding deep nesting
- Using early returns
- Extracting complex conditions
- Minimizing mental mapping

#### Avoid Deep Nesting (Max 3 Levels)

Humans struggle to track more than 3-4 nested contexts.

❌ **Bad: 5 levels of nesting**
```java
public void process(Order order) {
    if (order != null) {                          // Level 1
        if (order.getCustomer() != null) {         // Level 2
            if (order.getCustomer().isActive()) {   // Level 3
                if (order.getTotal() > 0) {         // Level 4
                    if (order.isPaid()) {            // Level 5
                        shipOrder(order);
                    }
                }
            }
        }
    }
}
```

✅ **Good: Guard clauses eliminate nesting**
```java
public void process(Order order) {
    if (order == null) return;
    if (order.getCustomer() == null) return;
    if (!order.getCustomer().isActive()) return;
    if (order.getTotal() <= 0) return;
    if (!order.isPaid()) return;

    shipOrder(order);
}
```

**Benefits:**
- The "happy path" (successful case) is obvious
- Each guard clause is independent
- No need to track nested contexts

#### Early Returns vs Nested If-Else

**Early returns** (guard clauses) make code more linear and easier to follow.

❌ **Bad: Nested if-else**
```python
def get_discount(customer):
    if customer is not None:
        if customer.is_premium:
            if customer.years_active > 5:
                return 0.20
            else:
                return 0.10
        else:
            return 0.05
    else:
        return 0
```

✅ **Good: Early returns**
```python
def get_discount(customer):
    if customer is None:
        return 0

    if not customer.is_premium:
        return 0.05

    if customer.years_active > 5:
        return 0.20

    return 0.10
```

**Pattern recognition:** Each condition is evaluated once, clearly showing decision points.

#### Guard Clauses Pattern

**Guard clauses** validate preconditions early and exit, allowing the main logic to proceed without nesting.

**Structure:**
```java
public void doSomething(Input input) {
    // Guard clauses first
    if (precondition1Failed) return;
    if (precondition2Failed) return;
    if (precondition3Failed) return;

    // Main logic (happy path)
    actualWork();
}
```

**Example:**
```java
// ❌ Bad: Nested logic
public void processPayment(Order order, PaymentMethod method) {
    if (order != null) {
        if (order.getTotal() > 0) {
            if (method != null) {
                if (method.isValid()) {
                    // Actual payment logic here
                    chargePayment(order, method);
                }
            }
        }
    }
}

// ✅ Good: Guard clauses
public void processPayment(Order order, PaymentMethod method) {
    if (order == null) {
        throw new IllegalArgumentException("Order cannot be null");
    }
    if (order.getTotal() <= 0) {
        throw new IllegalArgumentException("Order total must be positive");
    }
    if (method == null || !method.isValid()) {
        throw new IllegalArgumentException("Invalid payment method");
    }

    chargePayment(order, method);
}
```

#### Extract Complex Conditions to Named Methods

Complex boolean expressions are hard to understand. Extract them into well-named methods.

❌ **Bad: Complex inline condition**
```java
if (user.getAge() > 18 && user.getCountry().equals("US")
    && !user.isSuspended() && user.hasVerifiedEmail()) {
    allowAccess(user);
}
```

✅ **Good: Named predicate method**
```java
if (user.isEligibleForService()) {
    allowAccess(user);
}

// In User class:
public boolean isEligibleForService() {
    return age > 18
        && country.equals("US")
        && !isSuspended
        && hasVerifiedEmail;
}
```

**Python example:**
```python
# ❌ Bad
if order.total > 100 and order.customer.is_premium and not order.has_discount_applied:
    apply_discount(order)

# ✅ Good
if order.qualifies_for_premium_discount():
    apply_discount(order)

# In Order class:
def qualifies_for_premium_discount(self):
    return (
        self.total > 100
        and self.customer.is_premium
        and not self.has_discount_applied
    )
```

#### Reduce Mental Mapping

Avoid forcing readers to mentally map variable names to their meaning.

❌ **Bad: Requires mental mapping**
```java
for (int i = 0; i < users.size(); i++) {
    User u = users.get(i);
    if (u.getAge() > 18) {
        List<Order> o = orderRepository.findByUserId(u.getId());
        for (int j = 0; j < o.size(); j++) {
            Order ord = o.get(j);
            // What is i? What is j? What is u? What is o?
        }
    }
}
```

✅ **Good: Self-documenting**
```java
for (User user : users) {
    if (user.isAdult()) {
        List<Order> userOrders = orderRepository.findByUserId(user.getId());
        for (Order order : userOrders) {
            // Clear what each variable represents
        }
    }
}
```

**Even better with streams (Java 8+):**
```java
users.stream()
    .filter(User::isAdult)
    .forEach(user -> {
        List<Order> userOrders = orderRepository.findByUserId(user.getId());
        userOrders.forEach(this::processOrder);
    });
```

### Common Readability Patterns

| Pattern | ❌ Before | ✅ After |
|---|---|---|
| **Guard Clauses** | Nested if statements | Early returns for invalid cases |
| **Meaningful Names** | `x`, `temp`, `data` | `customerEmail`, `orderTotal` |
| **Small Functions** | 200-line method | 5 methods of 20-40 lines each |
| **Extract Condition** | `if (a > 5 && b < 10 && c)` | `if (isValid())` |
| **Avoid Nesting** | 5 levels of if/for | Max 2-3 levels |

**Stop and Think:** Find some code you wrote last month. Can you understand it immediately, or do you need to reverse-engineer it?

---

## 6. Maintainability Principles

Maintainable code is code that's easy to modify without breaking things. These principles help you write code that ages well.

### 6A. DRY (Don't Repeat Yourself)

**Principle:** Every piece of knowledge should have a single, authoritative representation.

When you duplicate code, you create maintenance burden:
- Fix a bug once, but it exists in 5 places
- Change business logic requires updating multiple locations
- Risk of forgetting one location

#### Recognize Duplication

❌ **Bad: Duplicated validation logic**
```java
public void createUser(String email, String password) {
    if (email == null || !email.contains("@")) {
        throw new ValidationException("Invalid email");
    }
    // Create user...
}

public void updateUser(User user, String newEmail) {
    if (newEmail == null || !newEmail.contains("@")) {
        throw new ValidationException("Invalid email");
    }
    // Update user...
}

public void sendEmail(String email, String message) {
    if (email == null || !email.contains("@")) {
        throw new ValidationException("Invalid email");
    }
    // Send email...
}
```

✅ **Good: Extracted to single method**
```java
private void validateEmail(String email) {
    if (email == null || !email.contains("@")) {
        throw new ValidationException("Invalid email");
    }
}

public void createUser(String email, String password) {
    validateEmail(email);
    // Create user...
}

public void updateUser(User user, String newEmail) {
    validateEmail(newEmail);
    // Update user...
}

public void sendEmail(String email, String message) {
    validateEmail(email);
    // Send email...
}
```

**Even better: Dedicated validator class**
```java
public class EmailValidator {
    public static void validate(String email) {
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Invalid email");
        }
    }

    public static boolean isValid(String email) {
        return email != null && email.contains("@");
    }
}
```

#### When Duplication Is Acceptable

Not all similar code is duplication. Consider:

**1. Coincidental Similarity**
```java
// These happen to look similar but represent different concepts
double calculateTax(double amount) {
    return amount * 0.07;
}

double calculateDiscount(double amount) {
    return amount * 0.10;
}
```

Don't combine these - they might change independently.

**2. Different Rates of Change**
```java
// Frontend validation (changes with UX requirements)
function validateEmail(email) {
    return email.includes("@");
}

// Backend validation (changes with security requirements)
public boolean validateEmail(String email) {
    return email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
}
```

Don't share code between frontend and backend - they evolve independently.

**3. Abstraction Would Add Complexity**

If extracting common code requires complex parameters or many conditional branches, duplication might be better.

**Rule of Three:** Wait until you have 3 instances before extracting. First instance: write it. Second instance: note the duplication. Third instance: refactor.

### 6B. SOLID Principles (Beginner-Friendly)

SOLID is an acronym for five object-oriented design principles. Here are the most important ones for beginners:

#### Single Responsibility Principle (SRP)

**Definition:** A class should have only one reason to change.

Each class should do one thing and do it well.

❌ **Bad: Class has multiple responsibilities**
```java
public class User {
    private String email;
    private String password;

    // Responsibility 1: User data
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    // Responsibility 2: Validation
    public boolean isValidEmail() {
        return email != null && email.contains("@");
    }

    // Responsibility 3: Persistence
    public void saveToDatabase() {
        // Database code here
    }

    // Responsibility 4: Email sending
    public void sendWelcomeEmail() {
        // Email sending code here
    }
}
```

**Problems:**
- Changes to database logic require changing User class
- Changes to email formatting require changing User class
- Can't test validation without database

✅ **Good: Separated responsibilities**
```java
// Responsibility 1: User data
public class User {
    private String email;
    private String password;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

// Responsibility 2: Validation
public class UserValidator {
    public boolean isEmailValid(String email) {
        return email != null && email.contains("@");
    }
}

// Responsibility 3: Persistence
public class UserRepository {
    public void save(User user) {
        // Database code here
    }
}

// Responsibility 4: Email sending
public class UserEmailService {
    public void sendWelcomeEmail(User user) {
        // Email sending code here
    }
}
```

**Benefits:**
- Each class can be tested independently
- Changes to email logic don't touch database code
- Easy to replace database implementation

#### Open/Closed Principle

**Definition:** Software entities should be open for extension, closed for modification.

You should be able to add new functionality without changing existing code.

**Beginner takeaway:** Use inheritance, interfaces, or strategy pattern to add behavior. (Covered in detail in OOP and Design Patterns sections - link when ready)

#### Interface Segregation Principle

**Definition:** Clients shouldn't be forced to depend on methods they don't use.

Keep interfaces small and focused.

❌ **Bad: Fat interface**
```java
public interface Worker {
    void work();
    void eat();
    void sleep();
    void getPaid();
}

// Robot implements Worker but doesn't eat or sleep
public class Robot implements Worker {
    public void work() { /* work */ }
    public void eat() { /* doesn't eat! */ }
    public void sleep() { /* doesn't sleep! */ }
    public void getPaid() { /* doesn't get paid! */ }
}
```

✅ **Good: Segregated interfaces**
```java
public interface Workable {
    void work();
}

public interface Payable {
    void getPaid();
}

public interface BiologicalNeeds {
    void eat();
    void sleep();
}

public class Human implements Workable, Payable, BiologicalNeeds {
    // Implements all methods
}

public class Robot implements Workable {
    // Only implements work()
}
```

#### Dependency Inversion Principle

**Definition:** Depend on abstractions, not concretions.

High-level modules shouldn't depend on low-level implementation details.

❌ **Bad: Depends on concrete implementation**
```java
public class OrderService {
    private MySQLDatabase database;  // Tightly coupled to MySQL

    public OrderService() {
        this.database = new MySQLDatabase();
    }

    public void saveOrder(Order order) {
        database.save(order);
    }
}
```

**Problem:** Can't switch to PostgreSQL without changing OrderService.

✅ **Good: Depends on abstraction**
```java
public interface Database {
    void save(Order order);
}

public class MySQLDatabase implements Database {
    public void save(Order order) { /* MySQL implementation */ }
}

public class PostgreSQLDatabase implements Database {
    public void save(Order order) { /* PostgreSQL implementation */ }
}

public class OrderService {
    private Database database;  // Depends on interface

    // Inject dependency
    public OrderService(Database database) {
        this.database = database;
    }

    public void saveOrder(Order order) {
        database.save(order);
    }
}
```

**Benefits:**
- Can swap MySQL for PostgreSQL without changing OrderService
- Can inject a mock database for testing
- Loose coupling between components

**Learn more:** See existing OOP content in this repository for deeper coverage of SOLID principles.

### 6C. Code Smells to Recognize

**Code smells** are symptoms of deeper problems. They're not bugs, but they indicate code that's hard to maintain.

#### 1. Long Methods

**Smell:** Methods over 50 lines

**Problem:** Hard to understand, test, and reuse

**Fix:** Extract smaller methods

#### 2. Long Parameter Lists

**Smell:** Methods with 4+ parameters

❌ **Bad:**
```java
public void createOrder(String customerId, String productId,
                       int quantity, double price, String currency,
                       String shippingAddress, String billingAddress) {
    // Too many parameters!
}
```

✅ **Good:**
```java
public void createOrder(OrderRequest request) {
    // Single object parameter
}

public class OrderRequest {
    private String customerId;
    private String productId;
    private int quantity;
    private Money price;  // Value object
    private Address shippingAddress;  // Value object
    private Address billingAddress;  // Value object
}
```

#### 3. Duplicated Code

**Smell:** Copy-pasted logic in multiple places

**Fix:** Extract to method or class

#### 4. Magic Numbers

**Smell:** Unexplained literal values

❌ **Bad:**
```java
if (user.getAge() > 18) {
    // What does 18 mean?
}

if (retryCount > 3) {
    // Why 3?
}

double total = subtotal * 1.07;
// What is 1.07?
```

✅ **Good:**
```java
private static final int MINIMUM_AGE_FOR_SERVICE = 18;
private static final int MAX_RETRY_ATTEMPTS = 3;
private static final double TAX_RATE = 0.07;

if (user.getAge() > MINIMUM_AGE_FOR_SERVICE) {
    // Clear intent
}

if (retryCount > MAX_RETRY_ATTEMPTS) {
    // Self-documenting
}

double total = subtotal * (1 + TAX_RATE);
```

#### 5. God Classes

**Smell:** Classes with 500+ lines or 20+ methods

**Problem:** Does too much, violates Single Responsibility

**Fix:** Split into multiple classes with focused responsibilities

#### 6. Feature Envy

**Smell:** Method uses more methods/data from another class than its own

❌ **Bad:**
```java
public class OrderPrinter {
    public void print(Order order) {
        System.out.println("Customer: " + order.getCustomer().getName());
        System.out.println("Email: " + order.getCustomer().getEmail());
        System.out.println("Address: " + order.getCustomer().getAddress());
        // Uses lots of Customer methods
    }
}
```

✅ **Good:**
```java
// Move method closer to the data
public class Customer {
    public String formatForDisplay() {
        return "Customer: " + name + "\n" +
               "Email: " + email + "\n" +
               "Address: " + address;
    }
}

public class OrderPrinter {
    public void print(Order order) {
        System.out.println(order.getCustomer().formatForDisplay());
    }
}
```

#### Code Smell Exercise

**Identify the smells in this code:**
```java
public class UserManager {
    public void process(String e, String p, String n, int a, String c) {
        if (e == null || !e.contains("@")) {
            System.out.println("Invalid");
            return;
        }
        if (p.length() < 8) {
            System.out.println("Invalid");
            return;
        }

        String hp = hashPassword(p);

        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db", "root", "password");
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO users VALUES (?, ?, ?, ?, ?)");
        stmt.setString(1, e);
        stmt.setString(2, hp);
        stmt.setString(3, n);
        stmt.setInt(4, a);
        stmt.setString(5, c);
        stmt.executeUpdate();

        if (a > 18) {
            String msg = "Welcome " + n + "!";
            sendEmail(e, msg);
        }
    }
}
```

<details>
<summary>Smells Found (try first!)</summary>

1. **Long parameter list:** 5 parameters
2. **Cryptic names:** `e`, `p`, `n`, `a`, `c`, `hp`
3. **Magic number:** `8` (min password length), `18` (age threshold)
4. **Multiple responsibilities:** validation, database, email
5. **Hardcoded values:** database connection string
6. **No error handling:** database operations can fail

**How to fix:**
- Extract parameter object
- Use meaningful names
- Extract constants
- Separate into UserValidator, UserRepository, UserEmailService
- Use configuration for connection string
- Add try-catch for database operations
</details>

---

## 7. Commenting Conventions

Comments should explain **why**, not **what**. Code should be self-documenting for the "what."

### The Golden Rule

> **Comment the business logic and complex algorithms. Don't comment obvious code.**

### Use/Don't Use Table

| ✅ Write Comments For | ❌ Don't Comment |
|---|---|
| **Why** something is done (business logic) | **What** code does (obvious from reading) |
| Complex algorithms | Self-explanatory code |
| Workarounds and hacks | Out-of-date information |
| API documentation (JavaDoc/docstrings) | Commented-out code (delete it) |
| Non-obvious optimizations | Redundant explanations |
| Public class/method contracts | Every single variable |

### Examples

#### ❌ Bad: Obvious Comments

```java
// Increment counter by 1
counter++;

// Loop through users
for (User user : users) {
    // Call process method
    process(user);
}

// Get user by ID
User user = userRepository.findById(id);
```

**Problem:** Comments add no value. The code is self-explanatory.

#### ✅ Good: Explains Why

```java
// Wait 500ms to avoid hitting rate limit (10 requests/second)
Thread.sleep(500);

// Use LinkedHashMap to preserve insertion order for display
Map<String, Product> products = new LinkedHashMap<>();

// Round down to prevent charging fractional cents
int centsToCharge = (int) Math.floor(dollarAmount * 100);
```

**Why these are good:**
- Explain business reason or constraint
- Clarify non-obvious technical decision
- Prevent future developer from "fixing" intentional behavior

#### ✅ Good: Complex Algorithm

```python
def calculate_shipping_cost(weight, distance):
    """
    Calculate shipping cost using tiered pricing model.

    Pricing tiers (as of 2024-01):
    - First 5 lbs: $2/lb
    - Next 10 lbs: $1.50/lb
    - Over 15 lbs: $1/lb
    - Add $0.10 per mile over 100 miles

    Args:
        weight: Package weight in pounds
        distance: Shipping distance in miles

    Returns:
        Shipping cost in dollars
    """
    cost = 0

    # Apply tiered pricing
    if weight <= 5:
        cost = weight * 2.00
    elif weight <= 15:
        cost = (5 * 2.00) + ((weight - 5) * 1.50)
    else:
        cost = (5 * 2.00) + (10 * 1.50) + ((weight - 15) * 1.00)

    # Add distance surcharge
    if distance > 100:
        cost += (distance - 100) * 0.10

    return round(cost, 2)
```

**Why this is good:**
- Documents business rules (pricing tiers)
- Shows when rules were defined (might change)
- Explains calculation logic
- Documents function contract (params and return)

#### ✅ Good: Workaround

```java
// HACK: API returns null instead of empty list before 9 AM EST
// Remove this check once API version 2.0 is deployed (TICKET-1234)
if (response.getData() == null) {
    return Collections.emptyList();
}
```

**Why this is good:**
- Marks temporary code
- Links to tracking ticket
- Prevents future developer from removing "unnecessary" null check

#### ❌ Bad: Out-of-Date Comment

```java
// Fetch all active users
// Updated 2020: Now fetches inactive users too
// Updated 2021: Now filters by role
// Updated 2022: Added pagination
List<User> users = userRepository.findByStatus("ACTIVE");
```

**Problem:** Comment history is confusing. Git tracks changes, not comments.

**Fix:** Delete comment history, let Git show evolution:
```java
List<User> users = userRepository.findByStatus("ACTIVE");
```

Or if status filter is non-obvious:
```java
// Filter to active users only (inactive users archived after 90 days)
List<User> users = userRepository.findByStatus("ACTIVE");
```

#### ❌ Bad: Commented-Out Code

```java
public void processOrder(Order order) {
    validateOrder(order);
    // calculateTax(order);  // Removed because tax calculation moved to TaxService
    // applyDiscount(order);  // Discount feature disabled
    saveOrder(order);
}
```

**Problem:** Readers don't know if code should be reactivated or deleted.

**Fix:** Delete it. Git preserves history:
```java
public void processOrder(Order order) {
    validateOrder(order);
    saveOrder(order);
}
```

### JavaDoc (Java) and Docstrings (Python)

Document **public APIs** (public classes, methods, functions).

#### Java JavaDoc

```java
/**
 * Processes a payment through the configured payment gateway.
 *
 * This method validates the payment request, charges the payment method,
 * and records the transaction in the database. If payment fails, the
 * method throws a PaymentException and does NOT save the transaction.
 *
 * @param order The order to charge for (must not be null)
 * @param paymentMethod The payment method to charge (must be valid)
 * @return The transaction ID from the payment gateway
 * @throws PaymentException if payment fails or is declined
 * @throws IllegalArgumentException if order or paymentMethod is null
 */
public String processPayment(Order order, PaymentMethod paymentMethod)
    throws PaymentException {
    // Implementation
}
```

**Key elements:**
- **Description:** What the method does
- **@param:** Describe each parameter and constraints
- **@return:** What's returned
- **@throws:** What exceptions can occur and why

#### Python Docstrings

```python
def process_payment(order, payment_method):
    """
    Process a payment through the configured payment gateway.

    Validates the payment request, charges the payment method, and records
    the transaction in the database. If payment fails, raises PaymentException
    and does NOT save the transaction.

    Args:
        order (Order): The order to charge for (must not be None)
        payment_method (PaymentMethod): The payment method to charge (must be valid)

    Returns:
        str: The transaction ID from the payment gateway

    Raises:
        PaymentException: If payment fails or is declined
        ValueError: If order or payment_method is None

    Example:
        >>> order = Order(total=100.00)
        >>> method = CreditCard("4111111111111111")
        >>> transaction_id = process_payment(order, method)
        >>> print(transaction_id)
        'txn_1234567890'
    """
    # Implementation
```

**Python docstring formats:**
- **Google style** (shown above)
- **NumPy style**
- **reStructuredText**

Pick one and be consistent.

### Comment Anti-Patterns

#### 1. Apologizing in Comments

```java
// I know this is a mess, sorry
// TODO: Fix this terrible code
// This is hacky but it works
```

**Fix:** Either refactor the code or explain why it must be this way.

#### 2. Venting Frustration

```java
// WTF is this API doing?
// Stupid legacy code
// I hate this framework
```

**Fix:** Explain the problem professionally or file a ticket to fix it.

#### 3. Obvious TODOs

```java
// TODO: Implement this
public void processOrder(Order order) {
    // Empty method
}
```

**Fix:** Either implement it now or create a proper ticket. Don't commit empty methods.

### Commenting Checklist

Before committing, ask:

- [ ] Did I remove commented-out code?
- [ ] Are my comments explaining WHY, not WHAT?
- [ ] Did I add JavaDoc/docstrings to public APIs?
- [ ] Are there any outdated comments?
- [ ] Can I improve the code to be self-documenting instead?

---

## 8. Coding Conventions

Conventions are standardized patterns that teams agree on. They eliminate bikeshedding and make code consistent.

### Why Conventions Matter

**Without conventions:**
- Every file looks different
- Reviews focus on style instead of logic
- Onboarding takes longer
- Merge conflicts increase

**With conventions:**
- Code looks like one person wrote it
- Automated tools enforce rules
- Reviews focus on correctness
- Team productivity increases

### Java Conventions

Following Oracle's official Java conventions and Google Java Style Guide.

| Convention | Example | Rationale |
|---|---|---|
| **Class names** | `CustomerService`, `OrderRepository` | PascalCase, nouns |
| **Interface names** | `Payable`, `OrderProcessor` | PascalCase, adjectives or nouns |
| **Method names** | `findById()`, `calculateTotal()` | camelCase, verbs |
| **Variable names** | `customerName`, `orderTotal` | camelCase, nouns |
| **Constants** | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` | UPPER_SNAKE_CASE |
| **Package names** | `com.company.product.module` | lowercase, reverse domain |
| **Indentation** | 4 spaces (not tabs) | Oracle standard |
| **Brace style** | Opening brace on same line | K&R style |
| **Max line length** | 100-120 characters | Google style |

#### Java Example

```java
package com.company.ecommerce.service;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing customer orders.
 */
public class OrderService {
    private static final int MAX_ITEMS_PER_ORDER = 50;
    private static final double TAX_RATE = 0.07;

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    public OrderService(OrderRepository orderRepository,
                       PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }

    /**
     * Creates a new order and processes payment.
     *
     * @param request The order creation request
     * @return The created order with transaction ID
     * @throws PaymentException if payment fails
     */
    public Order createOrder(OrderRequest request) throws PaymentException {
        validateOrderRequest(request);

        Order order = buildOrder(request);
        String transactionId = paymentService.processPayment(
            order.getTotal(),
            request.getPaymentMethod()
        );

        order.setTransactionId(transactionId);
        return orderRepository.save(order);
    }

    private void validateOrderRequest(OrderRequest request) {
        if (request.getItems().size() > MAX_ITEMS_PER_ORDER) {
            throw new IllegalArgumentException(
                "Order exceeds maximum items: " + MAX_ITEMS_PER_ORDER
            );
        }
    }

    private Order buildOrder(OrderRequest request) {
        double subtotal = calculateSubtotal(request.getItems());
        double tax = subtotal * TAX_RATE;
        double total = subtotal + tax;

        return Order.builder()
            .customerId(request.getCustomerId())
            .items(request.getItems())
            .subtotal(subtotal)
            .tax(tax)
            .total(total)
            .build();
    }

    private double calculateSubtotal(List<OrderItem> items) {
        return items.stream()
            .mapToDouble(item -> item.getPrice() * item.getQuantity())
            .sum();
    }
}
```

**Key conventions demonstrated:**
- Class name: `OrderService` (PascalCase, noun)
- Constants: `MAX_ITEMS_PER_ORDER` (UPPER_SNAKE_CASE)
- Methods: `createOrder()`, `validateOrderRequest()` (camelCase, verbs)
- Variables: `transactionId`, `subtotal` (camelCase, nouns)
- Indentation: 4 spaces
- Braces: K&R style (opening on same line)
- JavaDoc on public methods

### Python Conventions (PEP 8)

PEP 8 is Python's official style guide.

| Convention | Example | Rationale |
|---|---|---|
| **Class names** | `CustomerService`, `OrderRepository` | PascalCase, nouns |
| **Function names** | `find_by_id()`, `calculate_total()` | snake_case, verbs |
| **Variable names** | `customer_name`, `order_total` | snake_case, nouns |
| **Constants** | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` | UPPER_SNAKE_CASE |
| **Module names** | `order_service.py`, `payment_processor.py` | snake_case |
| **Indentation** | 4 spaces (never tabs) | PEP 8 |
| **Max line length** | 79 characters (docstrings), 99 (code) | PEP 8 |
| **Imports** | Absolute imports, grouped | PEP 8 |
| **String quotes** | Consistent (single or double) | Black uses double |

#### Python Example

```python
"""
Service for managing customer orders.
"""

from typing import List, Optional
from decimal import Decimal

from .repositories import OrderRepository
from .payment_service import PaymentService
from .exceptions import PaymentException


# Constants
MAX_ITEMS_PER_ORDER = 50
TAX_RATE = Decimal("0.07")


class OrderService:
    """Handles order creation and payment processing."""

    def __init__(
        self,
        order_repository: OrderRepository,
        payment_service: PaymentService
    ):
        self.order_repository = order_repository
        self.payment_service = payment_service

    def create_order(self, request: OrderRequest) -> Order:
        """
        Create a new order and process payment.

        Args:
            request: The order creation request

        Returns:
            The created order with transaction ID

        Raises:
            PaymentException: If payment fails
            ValueError: If order request is invalid
        """
        self._validate_order_request(request)

        order = self._build_order(request)
        transaction_id = self.payment_service.process_payment(
            order.total,
            request.payment_method
        )

        order.transaction_id = transaction_id
        return self.order_repository.save(order)

    def _validate_order_request(self, request: OrderRequest) -> None:
        """Validate order request constraints."""
        if len(request.items) > MAX_ITEMS_PER_ORDER:
            raise ValueError(
                f"Order exceeds maximum items: {MAX_ITEMS_PER_ORDER}"
            )

    def _build_order(self, request: OrderRequest) -> Order:
        """Build order object with calculated totals."""
        subtotal = self._calculate_subtotal(request.items)
        tax = subtotal * TAX_RATE
        total = subtotal + tax

        return Order(
            customer_id=request.customer_id,
            items=request.items,
            subtotal=subtotal,
            tax=tax,
            total=total
        )

    def _calculate_subtotal(self, items: List[OrderItem]) -> Decimal:
        """Calculate order subtotal from items."""
        return sum(
            item.price * item.quantity
            for item in items
        )
```

**Key conventions demonstrated:**
- Class name: `OrderService` (PascalCase)
- Function names: `create_order()`, `_validate_order_request()` (snake_case)
- Private methods: `_build_order()` (leading underscore)
- Constants: `MAX_ITEMS_PER_ORDER` (UPPER_SNAKE_CASE)
- Variables: `transaction_id`, `subtotal` (snake_case)
- Indentation: 4 spaces
- Type hints: `-> Order`, `: List[OrderItem]`
- Docstrings: Google style

### Language-Specific Gotchas

#### Java

**1. equals() and hashCode()**
```java
// ✅ Always override both together
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    User user = (User) o;
    return Objects.equals(id, user.id);
}

@Override
public int hashCode() {
    return Objects.hash(id);
}
```

**2. Use StringBuilder for string concatenation in loops**
```java
// ❌ Bad: Creates new string on each iteration
String result = "";
for (String item : items) {
    result += item + ", ";
}

// ✅ Good: Efficient
StringBuilder result = new StringBuilder();
for (String item : items) {
    result.append(item).append(", ");
}
return result.toString();
```

**3. Close resources with try-with-resources**
```java
// ✅ Good: Auto-closes resources
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    return reader.readLine();
}
```

#### Python

**1. Use list comprehensions**
```python
# ❌ Bad: Verbose
squares = []
for x in range(10):
    squares.append(x ** 2)

# ✅ Good: Pythonic
squares = [x ** 2 for x in range(10)]
```

**2. Use context managers**
```python
# ✅ Good: Auto-closes file
with open("file.txt") as f:
    content = f.read()
```

**3. Use enumerate() instead of range(len())**
```python
# ❌ Bad: Unpythonic
for i in range(len(items)):
    print(i, items[i])

# ✅ Good: Pythonic
for i, item in enumerate(items):
    print(i, item)
```

### Tool Configuration

#### .editorconfig (Universal)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.java]
indent_style = space
indent_size = 4
max_line_length = 120

[*.py]
indent_style = space
indent_size = 4
max_line_length = 99

[*.{yml,yaml,json}]
indent_style = space
indent_size = 2
```

#### checkstyle.xml (Java)

Use Google Java Style: https://github.com/google/styleguide/blob/gh-pages/intellij-java-google-style.xml

#### .pylintrc or pyproject.toml (Python)

```toml
[tool.black]
line-length = 99
target-version = ['py39']

[tool.ruff]
line-length = 99
select = ["E", "F", "I", "N", "W"]
```

---

## 9. Self-Check Questions

Test your understanding. Try to answer from memory, then check the relevant sections.

1. **What's the difference between formatting and readability?**
   <details><summary>Answer</summary>
   Formatting is about consistent style (spacing, indentation). Readability is about making code easy to understand (meaningful names, small functions, low complexity).
   </details>

2. **When should you write comments?**
   <details><summary>Answer</summary>
   Comment the WHY (business logic, workarounds, non-obvious decisions), not the WHAT (obvious code). Document public APIs with JavaDoc/docstrings.
   </details>

3. **What does the Single Responsibility Principle mean?**
   <details><summary>Answer</summary>
   A class should have only one reason to change. Each class should do one thing and do it well.
   </details>

4. **What's the Rule of Three for DRY?**
   <details><summary>Answer</summary>
   Wait until you have 3 instances of similar code before extracting it into a shared function. First: write it. Second: note duplication. Third: refactor.
   </details>

5. **What are guard clauses and why use them?**
   <details><summary>Answer</summary>
   Guard clauses are early returns that validate preconditions. They reduce nesting and make the "happy path" obvious.
   </details>

6. **Name 3 code smells and how to fix them.**
   <details><summary>Answer</summary>
   Long methods → extract smaller methods. Magic numbers → extract to named constants. Duplicated code → extract to shared function.
   </details>

7. **What's the difference between `customerName` (Java) and `customer_name` (Python)?**
   <details><summary>Answer</summary>
   Java uses camelCase for variables/methods. Python uses snake_case for functions/variables per PEP 8.
   </details>

---

## 10. Practice Exercises

### Level 1 - Understand

**Exercise 1.1: Identify Issues**

Read this code and list all readability issues you find:

```java
public class u {
    public void p(List<Order> o){
        for(int i=0;i<o.size();i++){
            Order x=o.get(i);
            if(x.getTotal()>100){
                if(x.getCustomer()!=null){
                    if(x.getCustomer().getEmail()!=null){
                        sendEmail(x.getCustomer().getEmail(),"Thanks");
                    }
                }
            }
        }
    }
}
```

<details>
<summary>Issues Found (try first!)</summary>

1. Class name: `u` → should be `OrderProcessor` or similar
2. Method name: `p` → should be `processOrders` or `sendConfirmationEmails`
3. Variable names: `o`, `x`, `i` → should be `orders`, `order`, not needed (use for-each)
4. No spacing around operators
5. Deep nesting (3 levels)
6. Magic number: `100`
7. No null check on `o`
8. Should use guard clauses or for-each loop
</details>

**Exercise 1.2: Find Code Smells**

Identify code smells:

```python
def calc(data, type, discount, tax, shipping):
    # Calculate total
    t = 0
    for d in data:
        t = t + d

    # Apply discount
    if discount > 0:
        t = t - (t * discount)

    # Add tax
    if type == "US":
        t = t + (t * 0.07)
    elif type == "CA":
        t = t + (t * 0.05)

    # Add shipping
    t = t + shipping

    return t
```

<details>
<summary>Smells Found (try first!)</summary>

1. **Long parameter list:** 5 parameters
2. **Cryptic names:** `t`, `d`, `calc`, `type`
3. **Magic numbers:** `0.07`, `0.05`
4. **Multiple responsibilities:** calculation + tax logic + discount logic
5. **No docstring**
6. **Tax rates should be constants or config**
</details>

### Level 2 - Apply

**Exercise 2.1: Refactor to Guard Clauses**

Refactor this using guard clauses:

```java
public void processPayment(Order order, PaymentMethod method) {
    if (order != null) {
        if (order.getTotal() > 0) {
            if (method != null) {
                if (method.isValid()) {
                    chargePayment(order, method);
                } else {
                    throw new PaymentException("Invalid payment method");
                }
            } else {
                throw new PaymentException("Payment method is null");
            }
        } else {
            throw new PaymentException("Order total must be positive");
        }
    } else {
        throw new PaymentException("Order is null");
    }
}
```

<details>
<summary>Solution (try first!)</summary>

```java
public void processPayment(Order order, PaymentMethod method) {
    if (order == null) {
        throw new PaymentException("Order is null");
    }
    if (order.getTotal() <= 0) {
        throw new PaymentException("Order total must be positive");
    }
    if (method == null) {
        throw new PaymentException("Payment method is null");
    }
    if (!method.isValid()) {
        throw new PaymentException("Invalid payment method");
    }

    chargePayment(order, method);
}
```
</details>

**Exercise 2.2: Extract Methods**

Refactor by extracting methods:

```python
def process_user_registration(email, password, name):
    if email is None or "@" not in email:
        return "Invalid email"
    if password is None or len(password) < 8:
        return "Password too short"
    if name is None or len(name) == 0:
        return "Name required"

    hashed = hash_password(password)

    user = User()
    user.email = email
    user.password = hashed
    user.name = name
    user.created_at = datetime.now()

    save_user(user)

    send_email(email, f"Welcome {name}!")

    return "Success"
```

<details>
<summary>Solution (try first!)</summary>

```python
def process_user_registration(email, password, name):
    """Register a new user with validation."""
    validation_error = validate_registration_input(email, password, name)
    if validation_error:
        return validation_error

    user = create_user(email, password, name)
    save_user(user)
    send_welcome_email(user)

    return "Success"

def validate_registration_input(email, password, name):
    """Validate user registration inputs."""
    if email is None or "@" not in email:
        return "Invalid email"
    if password is None or len(password) < 8:
        return "Password too short"
    if name is None or len(name) == 0:
        return "Name required"
    return None

def create_user(email, password, name):
    """Create user object with hashed password."""
    user = User()
    user.email = email
    user.password = hash_password(password)
    user.name = name
    user.created_at = datetime.now()
    return user

def send_welcome_email(user):
    """Send welcome email to newly registered user."""
    send_email(user.email, f"Welcome {user.name}!")
```
</details>

**Exercise 2.3: Fix Magic Numbers**

Replace magic numbers with named constants:

```java
public class OrderProcessor {
    public void process(Order order) {
        if (order.getTotal() > 1000) {
            order.setDiscount(order.getTotal() * 0.15);
        } else if (order.getTotal() > 500) {
            order.setDiscount(order.getTotal() * 0.10);
        } else if (order.getTotal() > 100) {
            order.setDiscount(order.getTotal() * 0.05);
        }

        double tax = order.getTotal() * 0.07;
        order.setTax(tax);

        if (order.getItems().size() > 10) {
            order.setShipping(0);
        } else {
            order.setShipping(9.99);
        }
    }
}
```

<details>
<summary>Solution (try first!)</summary>

```java
public class OrderProcessor {
    // Discount thresholds and rates
    private static final double PREMIUM_ORDER_THRESHOLD = 1000.0;
    private static final double PREMIUM_DISCOUNT_RATE = 0.15;

    private static final double STANDARD_ORDER_THRESHOLD = 500.0;
    private static final double STANDARD_DISCOUNT_RATE = 0.10;

    private static final double BASIC_ORDER_THRESHOLD = 100.0;
    private static final double BASIC_DISCOUNT_RATE = 0.05;

    // Tax and shipping
    private static final double TAX_RATE = 0.07;
    private static final int FREE_SHIPPING_ITEM_THRESHOLD = 10;
    private static final double STANDARD_SHIPPING_COST = 9.99;

    public void process(Order order) {
        applyDiscount(order);
        applyTax(order);
        applyShipping(order);
    }

    private void applyDiscount(Order order) {
        double total = order.getTotal();

        if (total > PREMIUM_ORDER_THRESHOLD) {
            order.setDiscount(total * PREMIUM_DISCOUNT_RATE);
        } else if (total > STANDARD_ORDER_THRESHOLD) {
            order.setDiscount(total * STANDARD_DISCOUNT_RATE);
        } else if (total > BASIC_ORDER_THRESHOLD) {
            order.setDiscount(total * BASIC_DISCOUNT_RATE);
        }
    }

    private void applyTax(Order order) {
        double tax = order.getTotal() * TAX_RATE;
        order.setTax(tax);
    }

    private void applyShipping(Order order) {
        if (order.getItems().size() > FREE_SHIPPING_ITEM_THRESHOLD) {
            order.setShipping(0);
        } else {
            order.setShipping(STANDARD_SHIPPING_COST);
        }
    }
}
```
</details>

### Level 3 - Create

**Exercise 3.1: Set Up Your Environment**

Complete checklist:
- [ ] Install VS Code
- [ ] Install language extensions (Java or Python)
- [ ] Configure format-on-save
- [ ] Create `.editorconfig` in a project
- [ ] Practice 5 keyboard shortcuts until muscle memory

**Exercise 3.2: Write a Code Review Checklist**

Create a checklist you'd use when reviewing a pull request. Include at least:
- Naming conventions
- Function size
- Comment quality
- Code smells
- Testing

<details>
<summary>Example Checklist</summary>

### Code Review Checklist

**Naming & Readability**
- [ ] Variable/method names are descriptive
- [ ] No single-letter variables (except loop counters)
- [ ] Boolean variables use `is/has/can` prefix
- [ ] Constants are UPPER_SNAKE_CASE

**Function Quality**
- [ ] Functions under 50 lines
- [ ] Each function has single responsibility
- [ ] No deep nesting (max 3 levels)
- [ ] Guard clauses used where appropriate

**Comments & Documentation**
- [ ] No commented-out code
- [ ] Comments explain WHY, not WHAT
- [ ] Public APIs have JavaDoc/docstrings
- [ ] No outdated comments

**Code Smells**
- [ ] No magic numbers
- [ ] No duplicated code
- [ ] No god classes/methods
- [ ] No long parameter lists (max 3-4)

**Testing**
- [ ] New code has tests
- [ ] Tests are readable and focused
- [ ] Edge cases covered

**Style**
- [ ] Code is auto-formatted
- [ ] Follows language conventions (camelCase vs snake_case)
- [ ] Imports organized
</details>

**Exercise 3.3: Refactor Real Code**

Find a file in your own project (or a practice project) and:
1. Identify 3 code smells
2. Refactor to fix them
3. Write before/after comparison
4. Document why the changes improve maintainability

**Build-Along Integration (Optional):**

> **If you're following the InvoiceManager build-along project**:
>
> Apply these principles to refactor your `InvoiceService` class:
> 1. Extract validation logic to `InvoiceValidator`
> 2. Extract tax calculation to `TaxCalculator`
> 3. Rename any cryptic variables
> 4. Add JavaDoc to public methods
> 5. Replace magic numbers with named constants
> 6. Set up Checkstyle with Google Java Style

---

## 11. Common Mistakes

### Mistake 1: Over-Commenting Obvious Code

❌ **Bad:**
```java
// Get the customer
Customer customer = order.getCustomer();

// Check if customer is not null
if (customer != null) {
    // Get the email
    String email = customer.getEmail();
    // Send email
    sendEmail(email);
}
```

✅ **Good:**
```java
Customer customer = order.getCustomer();
if (customer != null) {
    sendEmail(customer.getEmail());
}
```

**Why:** Comments add noise without value.

### Mistake 2: Inconsistent Naming

❌ **Bad:**
```java
String customerName;
String addr;           // Inconsistent abbreviation
int numOrders;         // Inconsistent prefix
boolean active;        // Should be isActive
```

✅ **Good:**
```java
String customerName;
String customerAddress;
int orderCount;
boolean isActive;
```

### Mistake 3: God Functions

❌ **Bad:**
```python
def process_order(order_data):
    # 300 lines of validation, calculation, database, email...
```

✅ **Good:**
```python
def process_order(order_data):
    validate_order(order_data)
    order = create_order(order_data)
    process_payment(order)
    save_order(order)
    send_confirmation(order)
```

### Mistake 4: No Formatting Tool

❌ **Bad:** Manually spacing code, inconsistent across files

✅ **Good:** Configure Prettier/Black, enable format-on-save

### Mistake 5: Magic Numbers Everywhere

❌ **Bad:**
```java
if (retryCount > 3) { ... }
if (user.getAge() > 18) { ... }
double total = subtotal * 1.07;
```

✅ **Good:**
```java
private static final int MAX_RETRY_ATTEMPTS = 3;
private static final int MINIMUM_AGE_FOR_SERVICE = 18;
private static final double TAX_RATE = 0.07;

if (retryCount > MAX_RETRY_ATTEMPTS) { ... }
if (user.getAge() > MINIMUM_AGE_FOR_SERVICE) { ... }
double total = subtotal * (1 + TAX_RATE);
```

### Mistake 6: Ignoring Language Conventions

❌ **Bad (Python):**
```python
def FindUserById(userId):  # Should be snake_case
    pass
```

❌ **Bad (Java):**
```java
public void find_user_by_id(int user_id) {  // Should be camelCase
}
```

✅ **Good:**
```python
def find_user_by_id(user_id):
    pass
```

```java
public User findUserById(int userId) {
    // ...
}
```

### Mistake 7: Not Using Guard Clauses

❌ **Bad:**
```java
public void process(Order order) {
    if (order != null) {
        if (order.isValid()) {
            if (order.isPaid()) {
                ship(order);
            }
        }
    }
}
```

✅ **Good:**
```java
public void process(Order order) {
    if (order == null) return;
    if (!order.isValid()) return;
    if (!order.isPaid()) return;

    ship(order);
}
```

---

## 12. Interview Questions

### Knowledge Questions

**Q1: What's the difference between formatting and linting?**

<details>
<summary>Answer</summary>

**Formatting** fixes code style (spacing, indentation, line breaks). Tools: Prettier, Black, Google Java Format.

**Linting** finds code quality issues (unused variables, potential bugs, complexity). Tools: ESLint, Ruff, Checkstyle, SonarLint.

Both can run automatically, but linting often requires manual fixes.
</details>

**Q2: Explain the Single Responsibility Principle with an example.**

<details>
<summary>Answer</summary>

**SRP:** A class should have only one reason to change.

**Example:**
```java
// ❌ Bad: Multiple responsibilities
class User {
    String name;
    void saveToDatabase() { }  // Persistence responsibility
    void sendEmail() { }       // Email responsibility
}

// ✅ Good: Separated
class User {
    String name;
}
class UserRepository {
    void save(User user) { }
}
class UserEmailService {
    void sendEmail(User user) { }
}
```

**Benefit:** Changes to email logic don't touch database code.
</details>

**Q3: When is code duplication acceptable?**

<details>
<summary>Answer</summary>

Duplication is acceptable when:
1. **Coincidental similarity** - Code looks similar but represents different concepts that may evolve independently
2. **Different rates of change** - Frontend vs backend validation
3. **Premature abstraction would add complexity** - Wait for Rule of Three (3 instances before extracting)

**Example:** Tax calculation and discount calculation might both multiply by a rate, but they're different business rules that should stay separate.
</details>

### Scenario Questions

**Q4: A teammate's pull request has a 800-line method. How do you handle this in code review?**

<details>
<summary>Answer</summary>

1. **Acknowledge the work:** "Thanks for the PR. I see you've implemented the full feature."

2. **Explain the issue:** "The main method is quite long (800 lines), which makes it hard to test and understand. Could we break it into smaller methods?"

3. **Suggest approach:**
   - Extract validation logic to separate methods
   - Group related operations
   - Each method should do one thing

4. **Offer help:** "I can pair with you on the refactoring if helpful."

5. **Link to standards:** "Our team guideline is to keep methods under 50 lines for readability."

**Key:** Be constructive, not critical. Focus on maintainability, not blame.
</details>

**Q5: Your team has no coding standards. How would you introduce them?**

<details>
<summary>Answer</summary>

**Step 1: Research**
- Check if language has official style guide (PEP 8 for Python, Oracle for Java)
- Find popular industry standards (Google Java Style, Airbnb JavaScript)

**Step 2: Propose Incrementally**
- Start with automated formatting (no debate needed)
- Add linter with auto-fix rules
- Gradually add stricter rules

**Step 3: Make It Easy**
- Configure tools in repo (`.editorconfig`, `.prettierrc`)
- Add pre-commit hooks
- Document setup in README

**Step 4: Lead by Example**
- Format your own PRs first
- Offer to help teammates set up tools
- Highlight benefits (faster reviews, fewer merge conflicts)

**Step 5: Get Buy-In**
- Run a demo showing time saved
- Share metrics (review time decreased, bugs caught earlier)

**Key:** Don't mandate all at once. Automate what you can, then gradually improve.
</details>

### Code Review Question

**Q6: What would you change about this code?**

```java
public class UserManager {
    public void process(String e, String p, String n) {
        if(e!=null&&e.contains("@")){
            if(p!=null&&p.length()>=8){
                String hp=hash(p);
                User u=new User();
                u.setEmail(e);
                u.setPassword(hp);
                u.setName(n);
                save(u);
                sendEmail(e,"Welcome!");
            }
        }
    }
}
```

<details>
<summary>Answer</summary>

**Issues:**

1. **Naming:** `e`, `p`, `n`, `hp`, `u` are cryptic
2. **Formatting:** No spacing, poor readability
3. **Deep nesting:** Should use guard clauses
4. **Multiple responsibilities:** Validation, creation, persistence, email
5. **No error handling:** Silent failures
6. **Magic number:** `8` (min password length)

**Refactored:**

```java
public class UserRegistrationService {
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordHasher passwordHasher;

    public User registerUser(String email, String password, String name) {
        validateEmail(email);
        validatePassword(password);

        User user = createUser(email, password, name);
        userRepository.save(user);
        emailService.sendWelcomeEmail(user);

        return user;
    }

    private void validateEmail(String email) {
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Invalid email");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new ValidationException(
                "Password must be at least " + MIN_PASSWORD_LENGTH + " characters"
            );
        }
    }

    private User createUser(String email, String password, String name) {
        String hashedPassword = passwordHasher.hash(password);

        User user = new User();
        user.setEmail(email);
        user.setPassword(hashedPassword);
        user.setName(name);
        return user;
    }
}
```

**Improvements:**
- Meaningful names
- Guard clauses
- Extracted methods
- Named constant
- Error handling
- Dependency injection
</details>

---

## 13. How This Connects

### Builds On
None - this is a foundational guide for all software development.

### Related Concepts

**In This Repository:**
- **OOP Fundamentals** - SOLID principles in depth, design patterns
- **Spring Best Practices** - Framework-specific conventions, dependency injection
- **REST API Design** - API conventions, error handling patterns
- **Code Quality & Maintainability** - Advanced metrics (cyclomatic complexity, code coverage)

**External Learning:**
- **Refactoring** by Martin Fowler - Catalog of refactoring techniques
- **Clean Code** by Robert Martin - Deep dive into code quality
- **The Pragmatic Programmer** - Software craftsmanship principles

### Next Steps

After mastering these best practices:

1. **Dive into OOP** - Learn SOLID principles deeply
2. **Study Design Patterns** - Recognize common solutions
3. **Practice Refactoring** - Take messy code and improve it systematically
4. **Learn Testing** - Write maintainable tests
5. **Explore Language-Specific Idioms** - Java Streams, Python decorators, etc.

**Immediate Action:** Set up your development environment now. Configure formatters and practice keyboard shortcuts daily until they're muscle memory.

---

## 14. Summary

### In 3 Sentences

**Code is read 10x more than it's written**, so invest in readability and maintainability. **Use automated tools** (formatters, linters) to enforce consistent style without debate. **Follow established conventions** (meaningful names, small functions, guard clauses, DRY, SOLID basics) to write professional code that teams can maintain long-term.

### Key Takeaways

1. **Formatting matters** - Consistent style reduces cognitive load and enables faster reviews
2. **Names matter** - Descriptive names eliminate mental mapping
3. **Small functions matter** - Each function should do one thing (Single Responsibility)
4. **Comments explain WHY** - Not what (code should be self-documenting)
5. **Conventions eliminate bikeshedding** - Pick a standard, configure tools, move on
6. **Guard clauses reduce nesting** - Make the happy path obvious
7. **DRY after 3 instances** - Don't abstract prematurely
8. **Tools automate quality** - Formatters, linters, and IDE extensions catch issues early

### The Professional Code Standard

> **Professional code isn't just code that works—it's code that others can understand, modify, and maintain with confidence.**

Your ability to write clean, maintainable code directly impacts:
- How quickly you can join and contribute to teams
- How fast your PRs get approved
- How often bugs are introduced
- How successful you are in technical interviews
- How much your teammates enjoy working with your code

### Final Challenge

Find the worst code you've ever written. Refactor it using these principles. Share before/after with a peer. That's how you internalize these practices—by applying them to real messy code.

**Now go set up your development environment and start writing professional code.**

---

## Additional Resources

### Official Style Guides

**Java:**
- [Oracle Java Code Conventions](https://www.oracle.com/java/technologies/javase/codeconventions-contents.html)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)

**Python:**
- [PEP 8 - Style Guide for Python Code](https://pep8.org/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

### Books

- **Clean Code** by Robert C. Martin - Classic on writing maintainable code
- **Refactoring** by Martin Fowler - Catalog of code improvement techniques
- **The Pragmatic Programmer** by Hunt & Thomas - Timeless software craftsmanship

### Tools

**Java:**
- [Checkstyle](https://checkstyle.sourceforge.io/) - Style checker
- [SpotBugs](https://spotbugs.github.io/) - Bug detector
- [SonarLint](https://www.sonarsource.com/products/sonarlint/) - Code quality

**Python:**
- [Black](https://black.readthedocs.io/) - Opinionated formatter
- [Ruff](https://docs.astral.sh/ruff/) - Fast linter
- [mypy](http://mypy-lang.org/) - Static type checker

### Practice Platforms

- [Refactoring.Guru](https://refactoring.guru/) - Code smells and refactoring catalog
- [Exercism](https://exercism.org/) - Coding exercises with mentor feedback
- [Code Review Stack Exchange](https://codereview.stackexchange.com/) - Get your code reviewed

---

**Version:** 1.0
**Last Updated:** January 2025
**Feedback:** If you find issues or have suggestions, please contribute to this guide.
