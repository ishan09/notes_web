# Functions

> **Before you start**: Can you write loops and conditions? If not, review [Control Flow](./03-control-flow.md)

## What are Functions?

Functions are **reusable blocks of code** that perform a specific task. Think of them as mini-programs within your program - they take input, do something with it, and (optionally) return output.

**Real-world analogy**: A function is like a recipe. You give it ingredients (parameters), it follows steps (function body), and produces a dish (return value). Once you write the recipe, you can use it repeatedly without rewriting the steps.

## Why This Matters for AI/ML

**You'll need functions for**:
- Data preprocessing pipelines (normalize, clean, transform)
- Model training and evaluation (train_model, evaluate, predict)
- Feature engineering (extract_features, encode_categorical)
- Organizing complex ML workflows into manageable pieces

**AI/ML Context**: ML code without functions becomes unmaintainable. Instead of writing the same preprocessing steps repeatedly, you write `preprocessed_data = preprocess(raw_data)`. Functions make code testable, reusable, and easier to debug - essential for iterative ML development.

## Defining Functions

### Basic Function Syntax

```python
# Define a function
def greet():
    print("Hello, World!")

# Call the function
greet()  # Output: Hello, World!
```

**Key differences from Java**:
- Use `def` keyword instead of specifying return type
- No type declarations for parameters
- No access modifiers (public/private) needed
- Use `pass` for empty function body (not `{}`)

```java
// Java
public String greet() {
    return "Hello";
}
```

```python
# Python - simpler!
def greet():
    return "Hello"
```

### Parameters and Arguments

**Parameters** are variables in function definition. **Arguments** are values passed when calling.

```python
# 'name' is a parameter
def greet(name):
    print(f"Hello, {name}!")

# "Alice" is an argument
greet("Alice")  # Output: Hello, Alice!
```

**Multiple parameters**:

```python
def add(a, b):
    return a + b

result = add(3, 5)  # 8
print(result)
```

**ML example**:

```python
def normalize(data, min_val, max_val):
    """Normalize data to range [0, 1]"""
    normalized = (data - min_val) / (max_val - min_val)
    return normalized

# Usage
values = [10, 20, 30, 40, 50]
min_v = min(values)
max_v = max(values)
normalized_values = normalize(values[0], min_v, max_v)
```

### Return Values

Functions can return values using `return`.

```python
# Return a value
def square(x):
    return x ** 2

result = square(5)  # 25

# Return multiple values (actually returns a tuple)
def get_stats(numbers):
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

min_val, max_val, mean = get_stats([1, 2, 3, 4, 5])
print(f"Min: {min_val}, Max: {max_val}, Mean: {mean}")
```

**No return statement** - function returns `None`:

```python
def print_message(msg):
    print(msg)
    # No return statement

result = print_message("Hello")
print(result)  # None
```

**Early return**:

```python
def find_first_even(numbers):
    for num in numbers:
        if num % 2 == 0:
            return num  # Exit immediately
    return None  # If no even number found
```

## Function Arguments

### Positional Arguments

Arguments passed in order of parameters.

```python
def divide(a, b):
    return a / b

result = divide(10, 2)  # a=10, b=2 → 5.0
result = divide(2, 10)  # a=2, b=10 → 0.2
```

### Keyword Arguments

Arguments passed by parameter name - order doesn't matter.

```python
def create_user(name, age, city):
    return {"name": name, "age": age, "city": city}

# Positional
user1 = create_user("Alice", 30, "NYC")

# Keyword arguments - clearer!
user2 = create_user(name="Bob", age=25, city="LA")

# Mixed (positional first, then keyword)
user3 = create_user("Charlie", age=35, city="Chicago")

# Order doesn't matter with keywords
user4 = create_user(city="Boston", name="Diana", age=28)
```

**ML use case**:

```python
def train_model(data, epochs, learning_rate, batch_size):
    print(f"Training for {epochs} epochs")
    print(f"LR: {learning_rate}, Batch: {batch_size}")

# Keyword args make hyperparameters explicit
train_model(
    data=training_data,
    epochs=100,
    learning_rate=0.001,
    batch_size=32
)
```

### Default Parameters

Provide default values for parameters.

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Alice"))              # "Hello, Alice!"
print(greet("Bob", "Hi"))          # "Hi, Bob!"
print(greet("Charlie", greeting="Hey"))  # "Hey, Charlie!"
```

**ML example**:

```python
def train_model(data, epochs=100, learning_rate=0.001, optimizer="adam"):
    print(f"Training: epochs={epochs}, lr={learning_rate}, opt={optimizer}")

# Use all defaults
train_model(data)

# Override some defaults
train_model(data, epochs=50)
train_model(data, learning_rate=0.01, optimizer="sgd")
```

**Important**: Default parameters must come after non-default parameters.

```python
# Wrong - SyntaxError
def bad_function(a=1, b):
    pass

# Correct
def good_function(b, a=1):
    pass
```

### *args and **kwargs

Handle variable number of arguments.

**\*args** - arbitrary positional arguments (tuple):

```python
def sum_all(*args):
    """Sum any number of arguments"""
    return sum(args)

print(sum_all(1, 2, 3))           # 6
print(sum_all(1, 2, 3, 4, 5))     # 15
print(sum_all(10))                # 10

# 'args' is a tuple
def print_args(*args):
    print(type(args))  # <class 'tuple'>
    for i, arg in enumerate(args):
        print(f"Argument {i}: {arg}")

print_args("a", "b", "c")
```

**\*\*kwargs** - arbitrary keyword arguments (dict):

```python
def print_info(**kwargs):
    """Accept any number of keyword arguments"""
    print(type(kwargs))  # <class 'dict'>
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print_info(name="Alice", age=30, city="NYC")
# name: Alice
# age: 30
# city: NYC
```

**Combine all argument types**:

Order matters: `def func(positional, *args, default=val, **kwargs)`

```python
def complex_function(required, *args, default="default", **kwargs):
    print(f"Required: {required}")
    print(f"Args: {args}")
    print(f"Default: {default}")
    print(f"Kwargs: {kwargs}")

complex_function(
    "must_have",
    "extra1", "extra2",
    default="custom",
    key1="value1",
    key2="value2"
)
# Required: must_have
# Args: ('extra1', 'extra2')
# Default: custom
# Kwargs: {'key1': 'value1', 'key2': 'value2'}
```

**ML use case**:

```python
def train_model(data, labels, *layers, **config):
    """
    Train a model with variable architecture and config.

    Args:
        data: Training data
        labels: Labels
        *layers: Variable number of layer sizes
        **config: Any training configuration (lr, epochs, etc.)
    """
    print(f"Network architecture: {layers}")
    print(f"Configuration: {config}")

train_model(
    X_train, y_train,
    64, 32, 16,  # layer sizes
    learning_rate=0.001,
    epochs=100,
    optimizer="adam"
)
```

## Scope and Lifetime

Variables have different scopes based on where they're defined.

**LEGB Rule**: Python looks for variables in this order:
1. **L**ocal - Inside function
2. **E**nclosing - In outer functions
3. **G**lobal - Module level
4. **B**uilt-in - Python built-ins

```python
x = "global"  # Global variable

def outer():
    x = "enclosing"  # Enclosing variable

    def inner():
        x = "local"  # Local variable
        print(x)

    inner()  # Prints: local
    print(x)  # Prints: enclosing

outer()
print(x)  # Prints: global
```

**Global keyword** - modify global variable:

```python
count = 0  # Global

def increment():
    global count  # Declare we're using global
    count += 1

increment()
increment()
print(count)  # 2
```

**Better approach** - avoid global, return values instead:

```python
def increment(count):
    return count + 1

count = 0
count = increment(count)
count = increment(count)
print(count)  # 2
```

**ML example**:

```python
# Bad - global state
model = None

def train():
    global model
    model = create_model()

# Better - return values
def train():
    model = create_model()
    return model

model = train()
```

## Lambda Functions

Small anonymous functions - one-line expressions.

```python
# Regular function
def square(x):
    return x ** 2

# Lambda equivalent
square = lambda x: x ** 2

print(square(5))  # 25

# Lambda with multiple parameters
add = lambda a, b: a + b
print(add(3, 5))  # 8
```

**Common use cases**:

```python
# Sort by custom key
students = [
    {"name": "Alice", "grade": 85},
    {"name": "Bob", "grade": 92},
    {"name": "Charlie", "grade": 78}
]

# Sort by grade
sorted_students = sorted(students, key=lambda s: s["grade"])
print([s["name"] for s in sorted_students])  # ['Charlie', 'Alice', 'Bob']

# Filter with lambda
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
evens = list(filter(lambda x: x % 2 == 0, numbers))
print(evens)  # [2, 4, 6, 8, 10]

# Map with lambda
squared = list(map(lambda x: x**2, numbers))
print(squared)  # [1, 4, 9, 16, 25, ...]
```

**Note**: List comprehensions are usually more Pythonic than map/filter.

```python
# Lambda + filter
evens = list(filter(lambda x: x % 2 == 0, numbers))

# List comprehension (preferred)
evens = [x for x in numbers if x % 2 == 0]
```

## Docstrings

Document your functions with docstrings.

```python
def calculate_accuracy(predictions, labels):
    """
    Calculate classification accuracy.

    Args:
        predictions: List of predicted labels
        labels: List of true labels

    Returns:
        float: Accuracy score between 0 and 1

    Example:
        >>> calculate_accuracy([1, 0, 1], [1, 0, 0])
        0.6666666666666666
    """
    correct = sum(p == l for p, l in zip(predictions, labels))
    return correct / len(labels)

# Access docstring
print(calculate_accuracy.__doc__)

# Better: use help()
help(calculate_accuracy)
```

## Try It

**Exercise 1**: Basic functions

```python
# Define and call function
def greet(name):
    return f"Hello, {name}!"

print(greet("Alice"))

# Function with multiple parameters
def calculate_bmi(weight, height):
    bmi = weight / (height ** 2)
    return bmi

print(calculate_bmi(70, 1.75))

# Function with default parameter
def power(base, exponent=2):
    return base ** exponent

print(power(5))      # 25 (5^2)
print(power(5, 3))   # 125 (5^3)
```

**Exercise 2**: Variable arguments

```python
# *args
def average(*numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

print(average(1, 2, 3, 4, 5))  # 3.0
print(average(10, 20))          # 15.0

# **kwargs
def create_config(**settings):
    config = {}
    for key, value in settings.items():
        config[key] = value
    return config

cfg = create_config(lr=0.001, epochs=100, batch_size=32)
print(cfg)
```

**Exercise 3**: Lambda functions

```python
# Sort data
data = [5, 2, 8, 1, 9, 3]
sorted_data = sorted(data)
print(sorted_data)

# Sort by absolute value
mixed = [-5, 2, -8, 1, -3]
sorted_mixed = sorted(mixed, key=lambda x: abs(x))
print(sorted_mixed)  # [1, 2, -3, -5, -8]

# Filter data
numbers = range(1, 11)
evens = list(filter(lambda x: x % 2 == 0, numbers))
print(evens)
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between parameters and arguments?
2. **Why** would you use keyword arguments instead of positional?
3. **When** should you use default parameter values?
4. **How** do *args and **kwargs work?
5. **Compare**: Python functions vs Java methods - what's different?

<details>
<summary>Click to reveal answers</summary>

1. **Parameters are variables in the function definition**, **arguments are actual values passed when calling**. Example: `def greet(name):` - `name` is parameter. `greet("Alice")` - `"Alice"` is argument. Parameters are placeholders, arguments are concrete values.

2. **Keyword arguments make code more readable and self-documenting**, especially with many parameters or when you want to skip defaults. Example: `train_model(data, epochs=100, lr=0.001)` is clearer than `train_model(data, 100, 0.001)`. You can also change argument order and skip optional parameters easily.

3. **Use default parameters when a value makes sense most of the time** but you want flexibility to override. Examples: `learning_rate=0.001`, `verbose=True`, `epochs=100`. Provides sensible defaults while allowing customization. Reduces function calls complexity - `train(data)` vs `train(data, 100, 0.001, "adam", True, 32)`.

4. **\*args captures extra positional arguments as a tuple**, **\*\*kwargs captures extra keyword arguments as a dict**. Example: `def func(*args, **kwargs)` called as `func(1, 2, x=3, y=4)` gives `args=(1,2)` and `kwargs={'x':3, 'y':4}`. Use when you don't know how many arguments will be passed or for flexible APIs.

5. **Python functions are simpler**: No return type declarations, no access modifiers, no throws declarations. Python uses `def` for all functions (Java has methods in classes). Python supports default parameters naturally, Java uses overloading. Python has \*args/\*\*kwargs for variable arguments; Java uses varargs (`...`). Python functions are first-class objects (can be passed around).

</details>

## Practice Exercises

**Level 1 - Understand**:

Create simple functions in the interpreter:

```python
python3

# Basic function
>>> def add(a, b):
...     return a + b
...
>>> print(add(3, 5))

# Default parameter
>>> def greet(name, greeting="Hello"):
...     return f"{greeting}, {name}"
...
>>> print(greet("Alice"))
>>> print(greet("Bob", "Hi"))

# Variable arguments
>>> def sum_all(*args):
...     return sum(args)
...
>>> print(sum_all(1, 2, 3, 4, 5))

>>> exit()
```

**Level 2 - Apply**:

Create a file `functions_practice.py`:

```python
# Data preprocessing functions

def normalize(data, min_val=None, max_val=None):
    """Normalize data to [0, 1] range."""
    if min_val is None:
        min_val = min(data)
    if max_val is None:
        max_val = max(data)

    normalized = [(x - min_val) / (max_val - min_val) for x in data]
    return normalized

def remove_outliers(data, threshold=2.0):
    """Remove values beyond threshold standard deviations."""
    mean = sum(data) / len(data)
    variance = sum((x - mean) ** 2 for x in data) / len(data)
    std_dev = variance ** 0.5

    filtered = [x for x in data if abs(x - mean) <= threshold * std_dev]
    return filtered

def calculate_stats(data):
    """Calculate basic statistics."""
    return {
        "mean": sum(data) / len(data),
        "min": min(data),
        "max": max(data),
        "count": len(data)
    }

# Test the functions
raw_data = [10, 12, 15, 18, 100, 22, 25, 28, 30]

print("Original data:", raw_data)
print("Stats:", calculate_stats(raw_data))

cleaned = remove_outliers(raw_data)
print("\nAfter removing outliers:", cleaned)
print("Stats:", calculate_stats(cleaned))

normalized = normalize(cleaned)
print("\nNormalized:", normalized)
```

Run it: `python3 functions_practice.py`

**Level 3 - Create**:

Build a feature engineering toolkit for ML:

<details>
<summary>Solution</summary>

```python
# feature_engineering.py

def one_hot_encode(labels, num_classes=None):
    """
    One-hot encode a list of labels.

    Args:
        labels: List of integer labels
        num_classes: Number of classes (auto-detected if None)

    Returns:
        List of one-hot encoded vectors
    """
    if num_classes is None:
        num_classes = max(labels) + 1

    encoded = []
    for label in labels:
        vector = [0] * num_classes
        vector[label] = 1
        encoded.append(vector)

    return encoded

def normalize_features(features, method="minmax"):
    """
    Normalize features using different methods.

    Args:
        features: List of lists (samples x features)
        method: 'minmax' or 'zscore'

    Returns:
        Normalized features
    """
    num_features = len(features[0])
    normalized = []

    for sample in features:
        norm_sample = []
        for i in range(num_features):
            # Get all values for this feature
            feature_values = [s[i] for s in features]

            if method == "minmax":
                min_val = min(feature_values)
                max_val = max(feature_values)
                if max_val == min_val:
                    norm_val = 0
                else:
                    norm_val = (sample[i] - min_val) / (max_val - min_val)
            elif method == "zscore":
                mean = sum(feature_values) / len(feature_values)
                variance = sum((x - mean) ** 2 for x in feature_values) / len(feature_values)
                std = variance ** 0.5
                norm_val = (sample[i] - mean) / std if std > 0 else 0
            else:
                norm_val = sample[i]

            norm_sample.append(norm_val)
        normalized.append(norm_sample)

    return normalized

def create_polynomial_features(values, degree=2):
    """
    Create polynomial features up to specified degree.

    Args:
        values: List of numbers
        degree: Maximum polynomial degree

    Returns:
        List of feature vectors with polynomial terms
    """
    features = []
    for val in values:
        feature_vector = [val ** d for d in range(1, degree + 1)]
        features.append(feature_vector)
    return features

def train_test_split(features, labels, test_size=0.2):
    """
    Split data into train and test sets.

    Args:
        features: List of feature vectors
        labels: List of labels
        test_size: Proportion for test set (0.0 to 1.0)

    Returns:
        Tuple of (train_features, test_features, train_labels, test_labels)
    """
    n_samples = len(features)
    n_test = int(n_samples * test_size)
    n_train = n_samples - n_test

    train_features = features[:n_train]
    test_features = features[n_train:]
    train_labels = labels[:n_train]
    test_labels = labels[n_train:]

    return train_features, test_features, train_labels, test_labels

# Demo usage
if __name__ == "__main__":
    print("=" * 50)
    print("Feature Engineering Toolkit Demo")
    print("=" * 50)

    # Sample data
    features = [
        [1.0, 2.0, 3.0],
        [2.0, 4.0, 6.0],
        [3.0, 6.0, 9.0],
        [4.0, 8.0, 12.0]
    ]
    labels = [0, 1, 0, 1]

    print("\n1. Original Features:")
    for i, f in enumerate(features):
        print(f"   Sample {i}: {f}")

    # Normalize
    print("\n2. MinMax Normalized:")
    normalized = normalize_features(features, method="minmax")
    for i, f in enumerate(normalized):
        print(f"   Sample {i}: {[f'{x:.2f}' for x in f]}")

    # One-hot encode labels
    print("\n3. One-Hot Encoded Labels:")
    encoded_labels = one_hot_encode(labels)
    for i, e in enumerate(encoded_labels):
        print(f"   Label {labels[i]}: {e}")

    # Polynomial features
    print("\n4. Polynomial Features (degree=2):")
    values = [1, 2, 3, 4, 5]
    poly = create_polynomial_features(values, degree=2)
    for i, p in enumerate(poly):
        print(f"   Value {values[i]}: {p}")

    # Train-test split
    print("\n5. Train-Test Split (80/20):")
    X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2)
    print(f"   Train samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Train labels: {y_train}")
    print(f"   Test labels: {y_test}")

    print("=" * 50)
```

Run it: `python3 feature_engineering.py`

</details>

## Common Mistakes

❌ **Mistake 1**: Mutable default arguments

```python
# Wrong - list is created once and shared!
def add_item(item, items=[]):
    items.append(item)
    return items

list1 = add_item(1)  # [1]
list2 = add_item(2)  # [1, 2] - WRONG! Expected [2]
```

**Why it's wrong**: Default mutable objects are created once when function is defined, shared across all calls.

✅ **Instead**: Use None as default

```python
# Correct
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

list1 = add_item(1)  # [1]
list2 = add_item(2)  # [2] - Correct!
```

---

❌ **Mistake 2**: Modifying global variable without `global`

```python
# Wrong - creates local variable
count = 0

def increment():
    count = count + 1  # UnboundLocalError

increment()
```

✅ **Instead**: Use `global` or return value

```python
# Option 1: global (not recommended)
count = 0

def increment():
    global count
    count += 1

# Option 2: Return value (better)
def increment(count):
    return count + 1

count = 0
count = increment(count)
```

---

❌ **Mistake 3**: Not returning a value when needed

```python
# Wrong - function returns None
def calculate(x, y):
    result = x + y
    # Forgot to return!

answer = calculate(5, 3)
print(answer)  # None - oops!
```

✅ **Instead**: Remember to return

```python
# Correct
def calculate(x, y):
    result = x + y
    return result

answer = calculate(5, 3)
print(answer)  # 8
```

---

❌ **Mistake 4**: Using `return` in wrong place

```python
# Wrong - return exits function immediately
def process_data(data):
    for item in data:
        result = transform(item)
        return result  # Only processes first item!
```

✅ **Instead**: Collect results, return after loop

```python
# Correct
def process_data(data):
    results = []
    for item in data:
        result = transform(item)
        results.append(result)
    return results
```

---

❌ **Mistake 5**: Not handling empty input

```python
# Wrong - crashes on empty list
def average(numbers):
    return sum(numbers) / len(numbers)  # ZeroDivisionError if empty

avg = average([])  # Error!
```

✅ **Instead**: Validate input

```python
# Correct
def average(numbers):
    if not numbers:
        return 0  # or raise ValueError
    return sum(numbers) / len(numbers)
```

## How This Connects

**Builds on**:
- [Control Flow](./03-control-flow.md) - Functions contain conditional logic and loops
- [Data Types](./02-data-types.md) - Functions process and return data

**Related concepts**:
- [Modules](./05-modules.md) - Organize functions into files
- [OOP Basics](../02-intermediate/01-oop-basics.md) - Methods are functions in classes
- [Decorators](../03-advanced/04-decorators.md) - Modify function behavior
- [Type Hints](../03-advanced/01-type-hints.md) - Add type information to functions

**Why this matters for AI**:
- **Preprocessing pipelines**: `cleaned = remove_outliers(normalize(data))`
- **Model training**: `model = train(X_train, y_train, epochs=100)`
- **Evaluation**: `accuracy = evaluate(model, X_test, y_test)`
- **Feature engineering**: `features = extract_features(raw_data)`
- **Code organization**: Break complex ML workflows into testable functions

**Next steps**:
- [Modules](./05-modules.md) - Learn to organize functions into separate files

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does Python handle function closures? What is the LEGB rule and how does it work?

<details>
<summary>Answer: LEGB searches Local→Enclosing→Global→Built-in; closures capture enclosing scope variables by reference</summary>

**Explanation**:
The LEGB rule defines Python's variable lookup order: **L**ocal (current function), **E**nclosing (outer function scopes), **G**lobal (module level), **B**uilt-in (Python's built-ins like `len`, `print`). When you reference a variable, Python searches these scopes in order until found.

**Closures** occur when an inner function references variables from an enclosing function. Python captures these variables **by reference** (not by value), so the inner function "closes over" the enclosing scope's variables. The enclosing scope's local variables persist even after the outer function returns, because the closure maintains a reference to them.

This is implemented via Python's function objects storing a `__closure__` attribute containing cell objects that reference the captured variables. Each cell holds a pointer to the variable in the enclosing scope.

**Example**:
```python
# LEGB demonstration
x = "global"  # Global scope

def outer():
    x = "enclosing"  # Enclosing scope

    def inner():
        x = "local"  # Local scope
        print(f"Local: {x}")  # Finds local first

    inner()
    print(f"Enclosing: {x}")  # Local to outer

outer()
print(f"Global: {x}")  # Module level

# Built-in scope (lowest priority)
def test():
    # len is found in built-in scope
    print(len([1, 2, 3]))

# Closure example - captures by reference
def make_multiplier(factor):
    """Returns a function that multiplies by factor"""
    def multiply(x):
        return x * factor  # 'factor' from enclosing scope
    return multiply

times_3 = make_multiplier(3)
times_5 = make_multiplier(5)

print(times_3(10))  # 30 - captures factor=3
print(times_5(10))  # 50 - captures factor=5

# View closure variables
print(times_3.__closure__)  # (<cell at 0x...: int object at 0x...>,)
print(times_3.__closure__[0].cell_contents)  # 3

# Closure captures by REFERENCE (gotcha!)
def make_functions():
    funcs = []
    for i in range(3):
        def func():
            return i  # Captures 'i' by reference!
        funcs.append(func)
    return funcs

f1, f2, f3 = make_functions()
print(f1(), f2(), f3())  # 2, 2, 2 (NOT 0, 1, 2!)
# All capture same 'i', which is 2 after loop

# Fix: Capture by value using default argument
def make_functions_fixed():
    funcs = []
    for i in range(3):
        def func(i=i):  # Default arg evaluated at definition time
            return i
        funcs.append(func)
    return funcs

f1, f2, f3 = make_functions_fixed()
print(f1(), f2(), f3())  # 0, 1, 2 (correct!)

# nonlocal keyword - modify enclosing scope variable
def counter():
    count = 0

    def increment():
        nonlocal count  # Modify enclosing scope
        count += 1
        return count

    return increment

c = counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3

# Without nonlocal - error
def broken_counter():
    count = 0

    def increment():
        count += 1  # UnboundLocalError: can't read before assignment
        return count

    return increment
```

**In Practice**:
In ML pipelines, closures are useful for: (1) **Factory functions** - create specialized preprocessors with captured config: `normalize_fn = make_normalizer(mean=0, std=1)`, (2) **Callbacks** - capture training state: `early_stopping = make_early_stopper(patience=5)`, (3) **Decorators** - wrap functions while preserving access to arguments. Be careful with loop closures - the classic "late binding" gotcha where all closures share the same loop variable. Use default arguments or functools.partial to capture by value.

**Key Takeaway**: LEGB defines variable lookup order (Local→Enclosing→Global→Built-in); closures capture enclosing variables by reference, persisting them beyond outer function's lifetime; use `nonlocal` to modify enclosing variables.

</details>

2. What are the dangers of mutable default arguments? Why does Python behave this way?

<details>
<summary>Answer: Default arguments evaluated once at function definition; mutable defaults are shared across all calls causing unexpected state</summary>

**Explanation**:
Python evaluates default argument values **once** when the function is **defined** (not when called). For immutable types (int, str, tuple), this doesn't matter - you can't modify them anyway. But for **mutable** types (list, dict, set), the same object is reused across all function calls, causing shared state bugs.

Why does Python do this? Performance and simplicity. Evaluating defaults once is faster than re-evaluating on every call. The function's defaults are stored in the `__defaults__` attribute as a tuple, shared across all calls.

This is one of Python's most infamous gotchas because it violates the principle of least astonishment - developers expect a fresh empty list each call, but get a shared persistent list instead.

**Example**:
```python
# The classic gotcha
def add_item(item, items=[]):
    items.append(item)
    return items

# First call - works as expected
result1 = add_item(1)
print(result1)  # [1]

# Second call - SURPRISE!
result2 = add_item(2)
print(result2)  # [1, 2] - expected [2]!

# Third call - even worse
result3 = add_item(3)
print(result3)  # [1, 2, 3] - expected [3]!

# All calls share the SAME list object
print(result1 is result2)  # True - same object!

# View the function's defaults
print(add_item.__defaults__)  # ([1, 2, 3],) - persistent state!

# Why it happens: default evaluated once at definition
def show_when_evaluated():
    print("Default evaluated!")
    return []

def func(items=show_when_evaluated()):
    return items

# "Default evaluated!" prints only once here (at definition)
func()
func()
func()

# Correct pattern - use None sentinel
def add_item_fixed(item, items=None):
    if items is None:
        items = []  # Fresh list each call
    items.append(item)
    return items

result1 = add_item_fixed(1)  # [1]
result2 = add_item_fixed(2)  # [2]
result3 = add_item_fixed(3)  # [3]
print(result1, result2, result3)  # [1] [2] [3] - correct!

# Also works for dicts, sets, etc.
def create_config(updates=None):
    config = {"lr": 0.001, "epochs": 100}  # Fresh dict
    if updates is not None:
        config.update(updates)
    return config

# Other mutable default gotchas
import datetime

def log_message(message, timestamp=datetime.datetime.now()):
    print(f"[{timestamp}] {message}")

log_message("First")   # [2026-01-25 10:00:00] First
import time
time.sleep(2)
log_message("Second")  # [2026-01-25 10:00:00] Second - SAME timestamp!

# Fix: Use None, evaluate inside function
def log_message_fixed(message, timestamp=None):
    if timestamp is None:
        timestamp = datetime.datetime.now()  # Fresh timestamp
    print(f"[{timestamp}] {message}")

# Intentional use of mutable defaults (rare, but valid)
def cached_fibonacci(n, cache={}):
    """Cache persists across calls - intentional optimization"""
    if n in cache:
        return cache[n]
    if n < 2:
        result = n
    else:
        result = cached_fibonacci(n-1) + cached_fibonacci(n-2)
    cache[n] = result
    return result

print(cached_fibonacci(10))  # 55
print(cached_fibonacci.__defaults__[0])  # {0: 0, 1: 1, 2: 1, ...}
```

**In Practice**:
In ML code, this gotcha appears when: (1) **Accumulating results** - `def train(model, history=[])` accumulates across multiple training runs, (2) **Default configurations** - `def preprocess(data, config={})` shares config between calls, (3) **Caching** - sometimes intentional, usually a bug. Always use `None` as default and create fresh mutable objects inside the function. Linters like `pylint` and `flake8` warn about this pattern (B006: "Do not use mutable data structures for argument defaults").

**Key Takeaway**: Default arguments are evaluated once at function definition, not per call; mutable defaults (list, dict) are shared across all calls causing bugs; use `None` sentinel and create fresh objects inside function.

</details>

3. What's the difference between `*args` and unpacking with `*` in function calls?

<details>
<summary>Answer: *args in definition packs arguments into tuple; * in call unpacks iterable into separate arguments</summary>

**Explanation**:
`*args` has two opposite uses: (1) **In function definition** - packs multiple positional arguments into a tuple, (2) **In function call** - unpacks an iterable into separate positional arguments. They're inverse operations: packing vs unpacking.

**In definition**: `def func(*args)` - any number of positional args are collected into tuple `args`. The function receives a single tuple containing all arguments.

**In call**: `func(*my_list)` - the iterable `my_list` is unpacked into separate arguments. Python "spreads" the iterable's elements as individual positional arguments.

Similarly, `**kwargs` in definition packs keyword arguments into dict, and `**dict` in call unpacks dict into keyword arguments.

**Example**:
```python
# *args in DEFINITION - packs arguments
def sum_all(*args):
    """Accepts any number of arguments, packs into tuple"""
    print(f"args type: {type(args)}")  # <class 'tuple'>
    print(f"args value: {args}")
    return sum(args)

result = sum_all(1, 2, 3, 4, 5)
# args value: (1, 2, 3, 4, 5)
# result: 15

# * in CALL - unpacks iterable
numbers = [1, 2, 3, 4, 5]
result = sum_all(*numbers)  # Same as sum_all(1, 2, 3, 4, 5)
# args value: (1, 2, 3, 4, 5)
# result: 15

# Without *, passes list as single argument
# result = sum_all(numbers)  # TypeError: unsupported operand type(s)

# **kwargs in DEFINITION - packs keyword args
def print_config(**kwargs):
    """Accepts any number of keyword arguments, packs into dict"""
    print(f"kwargs type: {type(kwargs)}")  # <class 'dict'>
    print(f"kwargs value: {kwargs}")
    for key, value in kwargs.items():
        print(f"  {key}: {value}")

print_config(lr=0.001, epochs=100, batch_size=32)
# kwargs value: {'lr': 0.001, 'epochs': 100, 'batch_size': 32}

# ** in CALL - unpacks dict
config = {"lr": 0.001, "epochs": 100, "batch_size": 32}
print_config(**config)  # Same as print_config(lr=0.001, epochs=100, batch_size=32)

# Combining * and ** in calls
def train_model(data, labels, epochs, lr, batch_size):
    print(f"Training: epochs={epochs}, lr={lr}, batch={batch_size}")

# Unpack both positional and keyword
datasets = (X_train, y_train)
config = {"epochs": 100, "lr": 0.001, "batch_size": 32}
train_model(*datasets, **config)
# Same as: train_model(X_train, y_train, epochs=100, lr=0.001, batch_size=32)

# Unpacking in list/dict literals (Python 3.5+)
list1 = [1, 2, 3]
list2 = [4, 5, 6]
combined = [*list1, *list2, 7, 8]  # [1, 2, 3, 4, 5, 6, 7, 8]

dict1 = {"a": 1, "b": 2}
dict2 = {"c": 3, "d": 4}
merged = {**dict1, **dict2, "e": 5}  # {'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5}

# Partial unpacking with *
first, *middle, last = [1, 2, 3, 4, 5]
print(first)   # 1
print(middle)  # [2, 3, 4]
print(last)    # 5

# Mixing *args in definition with * unpacking in call
def wrapper(*args):
    print(f"Wrapper received: {args}")
    return another_function(*args)  # Unpack and forward

def another_function(a, b, c):
    return a + b + c

result = wrapper(1, 2, 3)
# Wrapper received: (1, 2, 3)
# Returns: 6

# Common pattern: flexible forwarding
def decorator_function(*args, **kwargs):
    print("Before function call")
    result = original_function(*args, **kwargs)  # Forward all args
    print("After function call")
    return result
```

**Real-world examples**:
```python
# ML pipeline - flexible data loading
def load_datasets(*paths):
    """Load multiple datasets from paths"""
    datasets = []
    for path in paths:  # paths is tuple
        datasets.append(load_data(path))
    return datasets

# Call with unpacking
file_list = ["train.csv", "val.csv", "test.csv"]
train, val, test = load_datasets(*file_list)

# Merging configurations
default_config = {"lr": 0.001, "epochs": 100}
user_config = {"epochs": 50, "batch_size": 32}
final_config = {**default_config, **user_config}
# {'lr': 0.001, 'epochs': 50, 'batch_size': 32}

# Forwarding to sklearn
def train_custom_model(X, y, **model_params):
    """Train with any scikit-learn compatible params"""
    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(**model_params)
    model.fit(X, y)
    return model

# Flexible call
model = train_custom_model(
    X_train, y_train,
    n_estimators=100,
    max_depth=10,
    random_state=42
)
```

**In Practice**:
Use `*args`/`**kwargs` for: (1) **Flexible APIs** - accept variable arguments without knowing count, (2) **Wrapper functions** - forward arguments to wrapped function, (3) **Decorator pattern** - preserve original function signature. Use `*`/`**` unpacking to: (1) **Pass lists/dicts as arguments**, (2) **Merge collections**, (3) **Forward arguments** from one function to another. Very common in ML for config merging and flexible model initialization.

**Key Takeaway**: `*args` in definition packs arguments into tuple; `*iterable` in call unpacks into separate arguments; `**kwargs` packs keywords into dict; `**dict` unpacks dict into keyword arguments.

</details>

4. How do nested functions and closures work? When would you use them?

<details>
<summary>Answer: Nested functions create closures capturing enclosing scope; useful for encapsulation, factory functions, and decorators</summary>

**Explanation**:
**Nested functions** are functions defined inside other functions. They have access to the enclosing function's variables via closures. When the outer function returns the inner function, the inner function "remembers" the enclosing scope's variables even after the outer function has finished executing.

**Closures** allow nested functions to access variables from enclosing scope. Python implements this by storing references to enclosing variables in the inner function's `__closure__` attribute. This creates a "function with state" - the inner function carries its environment with it.

Use cases: (1) **Encapsulation** - hide implementation details, (2) **Factory functions** - create specialized functions with pre-configured behavior, (3) **Decorators** - wrap functions while preserving access to arguments, (4) **Callbacks** - create functions that remember context, (5) **Data privacy** - simulate private variables.

**Example**:
```python
# Basic nested function and closure
def outer(x):
    """Outer function creates a closure"""
    def inner(y):
        return x + y  # Accesses 'x' from enclosing scope
    return inner

# Create specialized functions
add_5 = outer(5)  # inner function with x=5
add_10 = outer(10)  # inner function with x=10

print(add_5(3))   # 8 (5 + 3)
print(add_10(3))  # 13 (10 + 3)

# Closure captures the variable
print(add_5.__closure__)  # (<cell at 0x...>,)
print(add_5.__closure__[0].cell_contents)  # 5

# Factory pattern - create configured functions
def make_multiplier(factor):
    """Factory that creates multiplier functions"""
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(5))  # 10
print(triple(5))  # 15

# Data privacy - simulate private variables
def create_account(initial_balance):
    """Closure-based encapsulation"""
    balance = initial_balance  # "Private" variable

    def deposit(amount):
        nonlocal balance
        balance += amount
        return balance

    def withdraw(amount):
        nonlocal balance
        if amount > balance:
            raise ValueError("Insufficient funds")
        balance -= amount
        return balance

    def get_balance():
        return balance

    # Return dict of methods (interface)
    return {
        "deposit": deposit,
        "withdraw": withdraw,
        "get_balance": get_balance
    }

account = create_account(100)
print(account["get_balance"]())  # 100
account["deposit"](50)
print(account["get_balance"]())  # 150
account["withdraw"](30)
print(account["get_balance"]())  # 120
# No direct access to 'balance' - encapsulated!

# ML use case: Configurable preprocessing
def make_normalizer(method="minmax"):
    """Factory for different normalization strategies"""

    if method == "minmax":
        def normalize(data):
            min_val = min(data)
            max_val = max(data)
            return [(x - min_val) / (max_val - min_val) for x in data]

    elif method == "zscore":
        def normalize(data):
            mean = sum(data) / len(data)
            std = (sum((x - mean)**2 for x in data) / len(data)) ** 0.5
            return [(x - mean) / std for x in data]

    else:
        def normalize(data):
            return data

    return normalize

# Create specialized normalizers
minmax_norm = make_normalizer("minmax")
zscore_norm = make_normalizer("zscore")

data = [1, 2, 3, 4, 5]
print(minmax_norm(data))  # [0.0, 0.25, 0.5, 0.75, 1.0]
print(zscore_norm(data))  # [-1.41, -0.71, 0.0, 0.71, 1.41]

# Callback pattern - capture training context
def create_early_stopping(patience=5, min_delta=0.001):
    """Returns a callback function with captured state"""
    best_loss = float('inf')
    wait = 0

    def check(current_loss):
        nonlocal best_loss, wait

        if current_loss < best_loss - min_delta:
            best_loss = current_loss
            wait = 0
            return False  # Continue training
        else:
            wait += 1
            if wait >= patience:
                return True  # Stop training
            return False

    return check

early_stop = create_early_stopping(patience=3)

for epoch in range(100):
    loss = train_epoch()  # Simulated
    if early_stop(loss):
        print(f"Early stopping at epoch {epoch}")
        break

# Decorator pattern using closures
def repeat(n):
    """Decorator that repeats function n times"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(n):  # 'n' from enclosing scope
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(3)
def greet(name):
    return f"Hello, {name}!"

print(greet("Alice"))  # ['Hello, Alice!', 'Hello, Alice!', 'Hello, Alice!']

# Partial application using closures
def partial(func, *partial_args, **partial_kwargs):
    """Create a new function with some arguments pre-filled"""
    def wrapper(*args, **kwargs):
        full_args = partial_args + args
        full_kwargs = {**partial_kwargs, **kwargs}
        return func(*full_args, **full_kwargs)
    return wrapper

def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(5))  # 25
print(cube(5))    # 125
```

**In Practice**:
In ML pipelines: (1) **Factory functions** - create preprocessors with specific configs: `scaler = make_scaler(method='standard')`, (2) **Callbacks** - early stopping, learning rate schedulers that maintain state, (3) **Decorators** - add timing, logging, caching to training functions, (4) **Partial application** - pre-configure model hyperparameters. Closures allow clean API design without global state or classes when you just need simple stateful behavior.

**Key Takeaway**: Nested functions create closures that capture enclosing scope variables; useful for factory functions (pre-configured behavior), callbacks (stateful functions), and data encapsulation (private variables).

</details>

5. What happens to default parameter values when a function is defined vs called?

<details>
<summary>Answer: Defaults evaluated once at definition time, stored in __defaults__; same objects reused across all calls</summary>

**Explanation**:
Python evaluates default parameter values **exactly once**, when the `def` statement executes (definition time), not when the function is called. The evaluated values are stored in the function object's `__defaults__` tuple attribute. Every function call reuses these same objects.

For **immutable** values (int, str, tuple, None), this is fine - you can't modify them anyway. For **mutable** values (list, dict, set), this causes the infamous "mutable default argument" bug - all calls share the same mutable object.

This design choice is for performance (evaluate once vs every call) and consistency (default values are function metadata, not runtime behavior). It also allows interesting patterns like caching, though using mutable defaults for this is discouraged.

**Example**:
```python
# When are defaults evaluated? AT DEFINITION TIME
import datetime

print("Before function definition")

def log_message(msg, timestamp=datetime.datetime.now()):
    """Default evaluated when function is DEFINED"""
    print(f"[{timestamp}] {msg}")

print("After function definition")
# Output:
# Before function definition
# After function definition
# (datetime.now() was called during 'def', not stored as code)

# All calls use the SAME timestamp (from definition time)
log_message("First message")   # [2026-01-25 10:00:00] First message
import time
time.sleep(2)
log_message("Second message")  # [2026-01-25 10:00:00] Second message
# Same timestamp! Evaluated once at definition

# View function's default values
print(log_message.__defaults__)
# (datetime.datetime(2026, 1, 25, 10, 0, 0),)

# Mutable defaults are shared across calls
def append_to(element, target=[]):
    target.append(element)
    return target

# First call
result1 = append_to(1)
print(result1)  # [1]
print(id(result1))  # e.g., 140234567890

# Second call - uses SAME list object
result2 = append_to(2)
print(result2)  # [1, 2] - not [2]!
print(id(result2))  # 140234567890 - SAME object

# Third call
result3 = append_to(3)
print(result3)  # [1, 2, 3]

# All results point to same object
print(result1 is result2 is result3)  # True

# The default is modified permanently
print(append_to.__defaults__)  # ([1, 2, 3],)

# Providing explicit argument creates new object
result4 = append_to(4, [])
print(result4)  # [4] - fresh list
result5 = append_to(5)
print(result5)  # [1, 2, 3, 5] - back to shared default

# Example with function call as default
call_count = 0

def increment():
    global call_count
    call_count += 1
    return call_count

def show_count(value=increment()):
    print(f"Value: {value}")

# increment() called ONCE at definition
print(f"Call count after def: {call_count}")  # 1

show_count()  # Value: 1
show_count()  # Value: 1 (still 1, not 2!)
show_count()  # Value: 1

print(f"Final call count: {call_count}")  # Still 1

# Correct pattern: None sentinel + late evaluation
def log_message_fixed(msg, timestamp=None):
    if timestamp is None:
        timestamp = datetime.datetime.now()  # Evaluated at CALL time
    print(f"[{timestamp}] {msg}")

log_message_fixed("First")   # [2026-01-25 10:00:00]
time.sleep(2)
log_message_fixed("Second")  # [2026-01-25 10:00:02] - different!

# Correct pattern for mutable defaults
def append_to_fixed(element, target=None):
    if target is None:
        target = []  # Fresh list each call
    target.append(element)
    return target

result1 = append_to_fixed(1)  # [1]
result2 = append_to_fixed(2)  # [2]
result3 = append_to_fixed(3)  # [3]
print(result1, result2, result3)  # [1] [2] [3] - independent

# Intentional use: function-level cache
def fibonacci(n, cache={}):
    """Cache persists across calls - shared default"""
    if n in cache:
        return cache[n]
    if n < 2:
        cache[n] = n
    else:
        cache[n] = fibonacci(n-1) + fibonacci(n-2)
    return cache[n]

print(fibonacci(10))  # 55
print(fibonacci(15))  # 610 - reuses cached values
print(fibonacci.__defaults__[0])  # Full cache dict

# Counter using mutable default (not recommended style)
def call_counter(counts={"calls": 0}):
    counts["calls"] += 1
    return counts["calls"]

print(call_counter())  # 1
print(call_counter())  # 2
print(call_counter())  # 3

# Modifying defaults dynamically (advanced, rarely needed)
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Alice"))  # Hello, Alice!

# Change default at runtime (unusual but possible)
greet.__defaults__ = ("Hi",)
print(greet("Bob"))  # Hi, Bob!
```

**In Practice**:
In ML code: (1) **Never use mutable defaults** - use `None` sentinel pattern, (2) **Don't call functions in defaults** - `log_time=datetime.now()` is a bug, use `log_time=None` and evaluate inside, (3) **Be aware for debugging** - if a function has unexpected state, check `func.__defaults__`, (4) **Intentional caching** - if using mutable defaults for caching, document it clearly and consider `functools.lru_cache` instead. Most style guides and linters flag mutable defaults as errors.

**Key Takeaway**: Default parameter values are evaluated once at function definition time and stored in `__defaults__`; same objects are reused across all calls; use None sentinel for mutable/callable defaults.

</details>

6. How does Python handle recursive functions? What's the recursion limit?

<details>
<summary>Answer: Python uses call stack with default limit of ~1000; can adjust with sys.setrecursionlimit; no tail call optimization</summary>

**Explanation**:
Python implements recursion using the **call stack** - each recursive call adds a stack frame containing local variables and return address. The recursion limit (default ~1000 frames) prevents infinite recursion from crashing the interpreter. Unlike some languages (Scheme, Scala), Python does **not** optimize tail recursion, so even tail-recursive functions consume stack space.

The limit is set by `sys.getrecursionlimit()` (typically 1000 on most systems, 3000 on some). You can increase it with `sys.setrecursionlimit(n)`, but be careful - too deep recursion can cause segmentation faults or stack overflow crashes.

For deep recursion, consider: (1) **Iterative solution** - use loops instead, (2) **Memoization** - cache results to reduce recursive calls, (3) **Increase limit** - carefully, and only if necessary, (4) **Trampolining** - convert to iteration using generators.

**Example**:
```python
import sys

# Check default recursion limit
print(f"Default recursion limit: {sys.getrecursionlimit()}")  # ~1000

# Exceeding recursion limit
def infinite_recursion(n):
    return infinite_recursion(n + 1)

try:
    infinite_recursion(0)
except RecursionError as e:
    print(f"RecursionError: {e}")
    # RecursionError: maximum recursion depth exceeded

# Factorial - naive recursion
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))   # 120
print(factorial(100))  # Works
# print(factorial(1500))  # RecursionError!

# Fibonacci - very inefficient without memoization
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(10))  # 55 - fast
# print(fib(40))  # Takes forever - exponential time

# Solution 1: Memoization (cache results)
def fib_memo(n, cache={}):
    if n in cache:
        return cache[n]
    if n < 2:
        return n
    cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]

print(fib_memo(100))  # 354224848179261915075 - instant!
print(fib_memo(500))  # Works - cached values prevent deep recursion

# Solution 2: Iterative approach (no recursion)
def fib_iterative(n):
    if n < 2:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b

print(fib_iterative(1000))  # Works for any n

# Tail recursion - NOT optimized in Python
def factorial_tail(n, accumulator=1):
    """Tail recursive - but Python doesn't optimize it"""
    if n <= 1:
        return accumulator
    return factorial_tail(n - 1, n * accumulator)  # Tail call

print(factorial_tail(10))  # 3628800
# print(factorial_tail(1500))  # Still hits recursion limit!

# Increasing recursion limit (use with caution)
sys.setrecursionlimit(5000)
print(f"New limit: {sys.getrecursionlimit()}")  # 5000

print(factorial(1500))  # Now works (but slow)

# Reset to default
sys.setrecursionlimit(1000)

# Mutual recursion
def is_even(n):
    if n == 0:
        return True
    return is_odd(n - 1)

def is_odd(n):
    if n == 0:
        return False
    return is_even(n - 1)

print(is_even(10))  # True
print(is_odd(15))   # True
# print(is_even(1500))  # RecursionError

# Binary tree traversal (good use of recursion)
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

def tree_sum(node):
    """Sum all values in tree - natural for recursion"""
    if node is None:
        return 0
    return node.value + tree_sum(node.left) + tree_sum(node.right)

# Create tree
root = TreeNode(1,
    TreeNode(2, TreeNode(4), TreeNode(5)),
    TreeNode(3, TreeNode(6), TreeNode(7))
)

print(tree_sum(root))  # 28

# Depth tracking
def max_depth(node, depth=0):
    if node is None:
        return depth
    return max(
        max_depth(node.left, depth + 1),
        max_depth(node.right, depth + 1)
    )

print(max_depth(root))  # 3

# Trampoline pattern for deep recursion
class Bounce:
    def __init__(self, func, *args):
        self.func = func
        self.args = args

def trampoline(bouncer):
    """Execute bouncer until it returns a non-Bounce value"""
    while isinstance(bouncer, Bounce):
        bouncer = bouncer.func(*bouncer.args)
    return bouncer

def factorial_trampoline(n, acc=1):
    if n <= 1:
        return acc
    return Bounce(factorial_trampoline, n - 1, n * acc)

result = trampoline(Bounce(factorial_trampoline, 1000))
print(result)  # Works for deep recursion!

# functools.lru_cache decorator for automatic memoization
from functools import lru_cache

@lru_cache(maxsize=None)
def fib_cached(n):
    if n < 2:
        return n
    return fib_cached(n - 1) + fib_cached(n - 2)

print(fib_cached(100))  # Fast
print(fib_cached(300))  # Fast
print(fib_cached.cache_info())  # CacheInfo(hits=..., misses=..., ...)
```

**In Practice**:
In ML code, recursion is rarely the bottleneck or solution: (1) **Tree algorithms** - decision trees, random forests use recursion naturally, (2) **Graph traversal** - recursive DFS for small graphs, iterative for large, (3) **Divide-and-conquer** - merge sort, quicksort (but NumPy handles this), (4) **Nested data processing** - JSON parsing, XML traversal. For most ML tasks, use iterative solutions or libraries. If you must recurse deeply, use memoization (`@lru_cache`) or increase limit carefully. Never increase limit beyond ~10000 without understanding stack limits.

**Key Takeaway**: Python recursion uses call stack with default limit ~1000; no tail call optimization; use iteration, memoization, or increase limit for deep recursion; prefer loops for performance-critical code.

</details>

**Production Scenarios**:

1. How do you design function signatures for ML pipelines that are extensible?

<details>
<summary>Answer: Use required params + **kwargs for config; accept interfaces not implementations; return consistent types; validate inputs</summary>

**Explanation**:
Extensible function signatures balance **clarity** (obvious what's required) with **flexibility** (easy to add options without breaking existing code). Best practices: (1) **Required params first** - data, labels, model (positional, no defaults), (2) **Common params with defaults** - epochs=100, lr=0.001, (3) **`**kwargs` for advanced options** - forwards to underlying libraries without cluttering signature, (4) **Accept broad types** - array-like, not numpy.ndarray specifically, (5) **Return consistent types** - always dict with metrics, not sometimes dict sometimes tuple.

Design for **forward compatibility** - adding new parameters shouldn't break existing code. Use keyword-only arguments (after `*`) to prevent positional confusion. Validate inputs early with clear error messages.

**Example**:
```python
# Bad: Inflexible signature
def train_model(data, labels, epochs, learning_rate, batch_size, optimizer,
                momentum, weight_decay, dropout, activation, loss_function):
    """Too many positional args, hard to extend"""
    pass

# Calling is painful
model = train_model(X, y, 100, 0.001, 32, "adam", 0.9, 0.0001, 0.5, "relu", "cross_entropy")

# Good: Extensible signature
def train_model(
    data,
    labels,
    *,  # Force keyword arguments after this
    epochs=100,
    learning_rate=0.001,
    batch_size=32,
    **model_config  # Flexible additional config
):
    """
    Train a model with flexible configuration.

    Args:
        data: Training features (array-like)
        labels: Training labels (array-like)
        epochs: Number of training epochs
        learning_rate: Learning rate for optimizer
        batch_size: Batch size for training
        **model_config: Additional model configuration
            optimizer: Optimizer name (default: "adam")
            dropout: Dropout rate (default: 0.0)
            activation: Activation function (default: "relu")
            ... any other params

    Returns:
        dict: Training results with keys:
            - model: Trained model object
            - history: Training history dict
            - metrics: Final evaluation metrics dict
    """
    # Extract config with defaults
    optimizer = model_config.get("optimizer", "adam")
    dropout = model_config.get("dropout", 0.0)

    # Validate inputs
    if len(data) != len(labels):
        raise ValueError(f"Data and labels length mismatch: {len(data)} vs {len(labels)}")

    if epochs <= 0:
        raise ValueError(f"Epochs must be positive, got {epochs}")

    # Forward unknown config to model
    model = create_model(**model_config)
    history = train_loop(model, data, labels, epochs, learning_rate, batch_size)
    metrics = evaluate(model, data, labels)

    # Consistent return type
    return {
        "model": model,
        "history": history,
        "metrics": metrics
    }

# Easy to use with minimal args
result = train_model(X_train, y_train)

# Easy to customize
result = train_model(
    X_train, y_train,
    epochs=50,
    learning_rate=0.01,
    optimizer="sgd",
    momentum=0.9,
    dropout=0.5
)

# Accept interfaces, not implementations
from typing import Protocol, Any
import numpy as np
import pandas as pd

class ArrayLike(Protocol):
    """Protocol for array-like objects"""
    def __len__(self) -> int: ...
    def __getitem__(self, key): ...

def preprocess_data(
    data,  # Accept lists, numpy arrays, pandas, etc.
    *,
    normalize: bool = True,
    remove_outliers: bool = False,
    **options
):
    """
    Flexible preprocessing - accepts any array-like data.

    Works with: lists, numpy arrays, pandas Series/DataFrame, etc.
    """
    # Convert to numpy for processing (duck typing)
    if hasattr(data, 'values'):  # pandas
        data = data.values
    data = np.asarray(data)

    if normalize:
        method = options.get("normalize_method", "minmax")
        data = normalize_array(data, method)

    if remove_outliers:
        threshold = options.get("outlier_threshold", 3.0)
        data = filter_outliers(data, threshold)

    return data

# Works with any input type
result1 = preprocess_data([1, 2, 3, 4, 5])
result2 = preprocess_data(np.array([1, 2, 3, 4, 5]))
result3 = preprocess_data(pd.Series([1, 2, 3, 4, 5]))

# Builder pattern for complex configuration
class ModelConfig:
    """Fluent API for building model configuration"""
    def __init__(self):
        self.config = {
            "epochs": 100,
            "lr": 0.001,
            "batch_size": 32
        }

    def with_epochs(self, epochs):
        self.config["epochs"] = epochs
        return self

    def with_learning_rate(self, lr):
        self.config["lr"] = lr
        return self

    def with_batch_size(self, batch_size):
        self.config["batch_size"] = batch_size
        return self

    def with_optimizer(self, optimizer, **opts):
        self.config["optimizer"] = optimizer
        self.config.update(opts)
        return self

    def build(self):
        return self.config

# Fluent usage
config = (ModelConfig()
    .with_epochs(50)
    .with_learning_rate(0.01)
    .with_optimizer("adam", beta1=0.9, beta2=0.999)
    .build())

model = train_model(X, y, **config)

# Keyword-only arguments (prevent positional errors)
def train_model_strict(
    data,
    labels,
    /,  # Positional-only (Python 3.8+)
    *,  # Keyword-only
    epochs=100,
    learning_rate=0.001
):
    """data and labels must be positional, rest must be keyword"""
    pass

# OK
train_model_strict(X, y, epochs=50)

# Error: epochs must be keyword
# train_model_strict(X, y, 50)  # TypeError

# Error: data/labels can't be keyword
# train_model_strict(data=X, labels=y)  # TypeError

# Config dict pattern for complex models
def create_model(config_dict=None, **kwargs):
    """Accept config as dict or kwargs"""
    config = config_dict or {}
    config.update(kwargs)  # kwargs override dict

    # Extract with validation
    layers = config.get("layers", [64, 32])
    activation = config.get("activation", "relu")

    return build_model(layers, activation)

# Either style works
model1 = create_model({"layers": [128, 64], "activation": "tanh"})
model2 = create_model(layers=[128, 64], activation="tanh")
model3 = create_model({"layers": [128, 64]}, activation="tanh")  # Mix!
```

**Real-world ML pipeline**:
```python
from typing import Optional, Dict, Any, Callable
import numpy as np

def train_pipeline(
    # Required inputs
    train_data,
    train_labels,
    *,  # Keyword-only after this
    # Common parameters with defaults
    val_data=None,
    val_labels=None,
    epochs: int = 100,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    # Callbacks for extensibility
    callbacks: Optional[list] = None,
    # Preprocessing functions
    preprocessor: Optional[Callable] = None,
    # Advanced config via kwargs
    **model_kwargs
) -> Dict[str, Any]:
    """
    Extensible training pipeline.

    Args:
        train_data: Training features
        train_labels: Training labels
        val_data: Optional validation features
        val_labels: Optional validation labels
        epochs: Number of training epochs
        batch_size: Batch size
        learning_rate: Learning rate
        callbacks: List of callback functions
        preprocessor: Optional preprocessing function
        **model_kwargs: Additional model configuration

    Returns:
        dict with keys: model, history, metrics
    """
    # Validate required inputs
    if len(train_data) != len(train_labels):
        raise ValueError("Data/labels length mismatch")

    # Apply preprocessing if provided
    if preprocessor is not None:
        train_data = preprocessor(train_data)
        if val_data is not None:
            val_data = preprocessor(val_data)

    # Create model with forwarded config
    model = create_model(
        input_shape=train_data.shape[1:],
        **model_kwargs
    )

    # Train with callbacks
    history = model.fit(
        train_data, train_labels,
        validation_data=(val_data, val_labels) if val_data is not None else None,
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks or []
    )

    # Evaluate
    if val_data is not None:
        metrics = model.evaluate(val_data, val_labels)
    else:
        metrics = {}

    return {
        "model": model,
        "history": history.history,
        "metrics": metrics
    }

# Simple usage
result = train_pipeline(X_train, y_train)

# Advanced usage
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
result = train_pipeline(
    X_train, y_train,
    val_data=X_val,
    val_labels=y_val,
    epochs=50,
    learning_rate=0.01,
    callbacks=[early_stopping, lr_scheduler],
    preprocessor=lambda x: scaler.fit_transform(x),
    # Model kwargs forwarded
    layers=[128, 64, 32],
    dropout=0.5,
    activation="relu",
    optimizer="adam"
)
```

**In Practice**:
Design principles: (1) **Required positional first** - data, labels, model, (2) **Common options as keyword with defaults** - epochs, lr, batch_size, (3) **`**kwargs` for flexibility** - forwards to libraries without API changes, (4) **Callbacks/hooks for extension** - early stopping, logging, custom metrics, (5) **Return dicts not tuples** - named keys are self-documenting and extensible. This pattern allows adding features without breaking existing code.

**Key Takeaway**: Design extensible signatures with required positional params, common keyword params with defaults, and **kwargs for flexibility; accept broad types (array-like); return consistent structured types (dicts); validate early.

</details>

2. What's the best practice for function documentation in ML code (docstrings vs type hints)?

<details>
<summary>Answer: Use both - type hints for static analysis/IDE support; docstrings for human documentation with examples and ML-specific details</summary>

**Explanation**:
**Type hints** and **docstrings** serve different purposes and are complementary: (1) **Type hints** - machine-readable type annotations for static analysis (mypy), IDE autocomplete, and runtime validation (Pydantic), (2) **Docstrings** - human-readable documentation explaining purpose, parameters, return values, examples, and domain-specific details.

For ML code, use **both**: Type hints catch type errors early (passing list instead of numpy array), docstrings explain data shapes, value ranges, and ML-specific behavior (what happens with missing values, how normalization works, etc.).

**Best practices**: Google/NumPy/Sphinx docstring format, include type hints in signature and docstring, add examples, document data shapes (crucial for ML), explain side effects, note assumptions.

**Example**:
```python
# Basic: Just type hints (minimal documentation)
def train_model(data: np.ndarray, labels: np.ndarray, epochs: int = 100) -> dict:
    pass  # What does this return? What's the data shape? Unknown!

# Better: Type hints + minimal docstring
def train_model(data: np.ndarray, labels: np.ndarray, epochs: int = 100) -> dict:
    """Train a model on the provided data."""
    pass  # Still not great - no details!

# Best: Comprehensive type hints + detailed docstring
from typing import Optional, Dict, Any, Tuple
import numpy as np
import numpy.typing as npt

def train_model(
    data: npt.NDArray[np.float64],
    labels: npt.NDArray[np.int64],
    *,
    epochs: int = 100,
    learning_rate: float = 0.001,
    batch_size: int = 32,
    validation_split: float = 0.2,
    callbacks: Optional[list] = None
) -> Dict[str, Any]:
    """
    Train a classification model using the provided data.

    This function implements a standard training loop with mini-batch gradient
    descent. It automatically splits data into training and validation sets if
    validation_split > 0.

    Args:
        data: Training features of shape (n_samples, n_features). Values should
            be normalized to [0, 1] or standardized (mean=0, std=1). Missing
            values (NaN) are not supported.
        labels: Training labels of shape (n_samples,). Integer class labels
            starting from 0. For binary classification, use {0, 1}.
        epochs: Number of training epochs. One epoch = one pass through entire
            training dataset. Typical range: 10-1000 depending on dataset size.
        learning_rate: Learning rate for optimizer. Controls step size in
            gradient descent. Typical range: 0.0001 to 0.1. Use lower values
            for pre-trained models, higher for training from scratch.
        batch_size: Number of samples per mini-batch. Larger batches = faster
            training but more memory. Must be > 0 and <= n_samples. Powers of 2
            (32, 64, 128) are recommended for GPU efficiency.
        validation_split: Fraction of data to use for validation (0.0 to 1.0).
            If 0.0, no validation is performed. Typical: 0.1-0.3.
        callbacks: Optional list of callback functions called after each epoch.
            Each callback receives (epoch, metrics) as arguments.

    Returns:
        Dictionary with keys:
            - "model": Trained model object with .predict() method
            - "history": Dict mapping metric names to lists of values per epoch
                Example: {"loss": [0.5, 0.3, 0.2], "accuracy": [0.7, 0.8, 0.9]}
            - "final_metrics": Dict of final evaluation metrics on validation set
                Example: {"val_loss": 0.15, "val_accuracy": 0.92}
            - "training_time": Total training time in seconds (float)

    Raises:
        ValueError: If data and labels have mismatched lengths
        ValueError: If labels contain negative values or are not integers
        ValueError: If validation_split is not in [0.0, 1.0]
        ValueError: If batch_size > len(data)

    Example:
        >>> X = np.random.rand(1000, 20)  # 1000 samples, 20 features
        >>> y = np.random.randint(0, 3, 1000)  # 3-class classification
        >>> result = train_model(X, y, epochs=50, learning_rate=0.01)
        >>> print(result["final_metrics"]["val_accuracy"])
        0.87
        >>> predictions = result["model"].predict(X_test)

    Notes:
        - Training is deterministic if random seed is set before calling
        - GPU is used automatically if available
        - Model checkpoints are NOT saved automatically - use callbacks
        - Early stopping is NOT implemented - use callbacks

    See Also:
        evaluate_model: Evaluate trained model on test data
        predict: Make predictions on new data
        save_model: Save trained model to disk
    """
    # Validate inputs
    if len(data) != len(labels):
        raise ValueError(f"Data and labels length mismatch: {len(data)} vs {len(labels)}")

    if not (0.0 <= validation_split <= 1.0):
        raise ValueError(f"validation_split must be in [0, 1], got {validation_split}")

    # Implementation...
    pass

# NumPy-style docstring (common in ML libraries)
def normalize_features(
    data: npt.NDArray[np.float64],
    method: str = "minmax",
    axis: int = 0
) -> Tuple[npt.NDArray[np.float64], Dict[str, Any]]:
    """
    Normalize features to a standard range.

    Parameters
    ----------
    data : ndarray of shape (n_samples, n_features)
        Input data to normalize. NaN values are handled by skipping them
        in min/max/mean/std calculations.
    method : {"minmax", "zscore", "robust"}, default="minmax"
        Normalization method:
        - "minmax": Scale to [0, 1] using (x - min) / (max - min)
        - "zscore": Standardize to mean=0, std=1 using (x - mean) / std
        - "robust": Use median and IQR for outlier resistance
    axis : int, default=0
        Axis along which to compute statistics:
        - 0: Normalize each feature (column) independently
        - 1: Normalize each sample (row) independently

    Returns
    -------
    normalized : ndarray of shape (n_samples, n_features)
        Normalized data
    params : dict
        Normalization parameters for later use:
        - For "minmax": {"min": array, "max": array}
        - For "zscore": {"mean": array, "std": array}
        - For "robust": {"median": array, "iqr": array}

    Examples
    --------
    >>> X = np.array([[1, 2], [3, 4], [5, 6]])
    >>> X_norm, params = normalize_features(X, method="minmax")
    >>> X_norm
    array([[0. , 0. ],
           [0.5, 0.5],
           [1. , 1. ]])
    >>> params["min"]
    array([1., 2.])
    >>> params["max"]
    array([5., 6.])

    See Also
    --------
    sklearn.preprocessing.StandardScaler : Scikit-learn's standardization
    sklearn.preprocessing.MinMaxScaler : Scikit-learn's min-max scaling
    """
    pass

# Type hints for complex types
from typing import Union, List, Callable, TypeVar, Generic

T = TypeVar('T')

class DataLoader(Generic[T]):
    """Type-safe data loader"""

    def __init__(
        self,
        dataset: List[T],
        batch_size: int,
        shuffle: bool = True,
        transform: Optional[Callable[[T], Any]] = None
    ) -> None:
        """
        Initialize data loader.

        Args:
            dataset: List of data samples
            batch_size: Samples per batch
            shuffle: Whether to shuffle data
            transform: Optional transformation function applied to each sample
        """
        self.dataset = dataset
        self.batch_size = batch_size
        self.shuffle = shuffle
        self.transform = transform

    def __iter__(self) -> 'DataLoader[T]':
        return self

    def __next__(self) -> List[T]:
        """Return next batch of data."""
        pass

# Protocol for duck typing
from typing import Protocol

class ModelProtocol(Protocol):
    """Protocol for ML models"""

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train the model"""
        ...

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        ...

    def score(self, X: np.ndarray, y: np.ndarray) -> float:
        """Evaluate model"""
        ...

def train_any_model(
    model: ModelProtocol,  # Accept any model matching protocol
    X: np.ndarray,
    y: np.ndarray
) -> Dict[str, float]:
    """
    Train any model implementing ModelProtocol.

    Works with scikit-learn, custom models, etc.
    """
    model.fit(X, y)
    score = model.score(X, y)
    return {"training_accuracy": score}

# Use Pydantic for runtime validation
from pydantic import BaseModel, Field, validator

class TrainingConfig(BaseModel):
    """Type-safe training configuration"""

    epochs: int = Field(100, gt=0, description="Number of training epochs")
    learning_rate: float = Field(0.001, gt=0, le=1, description="Learning rate")
    batch_size: int = Field(32, gt=0, description="Batch size")
    validation_split: float = Field(0.2, ge=0, le=1)

    @validator('batch_size')
    def batch_size_power_of_2(cls, v):
        """Validate batch size is power of 2 for GPU efficiency"""
        if not (v & (v - 1) == 0):
            raise ValueError(f"batch_size should be power of 2, got {v}")
        return v

    class Config:
        validate_assignment = True  # Validate on attribute changes

# Usage with type checking
def train_with_config(
    data: np.ndarray,
    labels: np.ndarray,
    config: TrainingConfig
) -> dict:
    """
    Train model with validated configuration.

    Type hints + Pydantic ensure config is valid at runtime.
    """
    pass

# Valid
config = TrainingConfig(epochs=50, learning_rate=0.01)
result = train_with_config(X, y, config)

# Invalid - runtime error from Pydantic
# config = TrainingConfig(epochs=-10)  # ValidationError: epochs must be > 0
# config = TrainingConfig(batch_size=30)  # ValidationError: not power of 2
```

**Documentation checklist for ML functions**:
```python
def ml_function_template(
    data: npt.NDArray,
    labels: npt.NDArray,
    **kwargs
) -> Dict[str, Any]:
    """
    [One-line summary of what function does]

    [Detailed explanation: What problem does this solve? How does it work?
     Any ML-specific details about algorithm, assumptions, etc.]

    Args:
        data: [Type, shape, value range, missing value handling]
        labels: [Type, shape, class encoding, etc.]
        **kwargs: [List all common kwargs with descriptions]

    Returns:
        [Exact structure with example values]

    Raises:
        [All possible exceptions and when they occur]

    Example:
        [Complete working example with sample data and output]

    Notes:
        [Important details: randomness, GPU usage, memory requirements,
         computational complexity, convergence guarantees, etc.]

    See Also:
        [Related functions]
    """
    pass
```

**In Practice**:
For production ML code: (1) **Always use type hints** - catches errors early, improves IDE experience, (2) **Document data shapes** - most ML bugs are shape mismatches, (3) **Add examples** - show expected input/output, (4) **Explain ML-specific behavior** - normalization methods, missing value handling, randomness, (5) **Use Pydantic for configs** - runtime validation prevents silent errors. Run `mypy` in CI to enforce type checking. Use Sphinx to generate HTML docs from docstrings.

**Key Takeaway**: Use both type hints (machine-readable, IDE support, static analysis) and comprehensive docstrings (human-readable, ML-specific details, examples); document data shapes and value ranges for ML code.

</details>

3. How do you handle configuration in ML functions (many parameters vs config dict vs **kwargs)?

<details>
<summary>Answer: Use explicit params for common options, **kwargs for advanced; dataclasses/Pydantic for complex configs; avoid giant dicts</summary>

**Explanation**:
ML functions often have dozens of configuration options. Three approaches: (1) **Explicit parameters** - clear but verbose for 10+ options, (2) **Dict config** - flexible but error-prone (typos, missing keys), (3) **`**kwargs`** - very flexible but no discoverability or validation.

**Best approach**: Hybrid: (1) **Required + common params** as explicit arguments (data, epochs, lr), (2) **`**kwargs` for advanced options** that forward to underlying libraries, (3) **Dataclasses/Pydantic** for complex structured configs with validation.

Avoid: (1) Massive parameter lists (>10 params), (2) Untyped dicts (no validation, bad IDE support), (3) Pure `**kwargs` without defaults (can't see what's supported).

**Example**:
```python
# Anti-pattern 1: Too many explicit parameters
def train_model(
    data, labels, epochs, lr, batch_size, optimizer, momentum, weight_decay,
    dropout, l1_reg, l2_reg, activation, loss_fn, metric, early_stop_patience,
    lr_schedule, checkpoint_path, verbose, random_seed, num_workers, use_gpu
):
    """Unmanageable signature"""
    pass

# Calling is painful
train_model(X, y, 100, 0.001, 32, "adam", 0.9, 0.0001, 0.5, 0, 0.01,
            "relu", "cross_entropy", "accuracy", 5, "cosine", "/tmp/model",
            True, 42, 4, True)  # What is what?!

# Anti-pattern 2: Unstructured dict
def train_model(data, labels, config):
    """No validation, no IDE support"""
    epochs = config.get("epochs", 100)  # Typo in key? Silent bug
    lr = config.get("learning_rate", 0.001)
    # ... 20 more .get() calls

config = {
    "epochs": 50,
    "lernin_rate": 0.01,  # Typo! Will use default silently
    "unknown_param": 123   # Ignored silently
}
train_model(X, y, config)

# Anti-pattern 3: Pure **kwargs with no defaults
def train_model(data, labels, **kwargs):
    """What options are supported? Unknown!"""
    epochs = kwargs["epochs"]  # KeyError if missing
    lr = kwargs.get("lr", ???)  # What's the default? Who knows!

# Good approach: Dataclass config
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class TrainingConfig:
    """Type-safe training configuration with validation"""
    # Common parameters with defaults
    epochs: int = 100
    learning_rate: float = 0.001
    batch_size: int = 32

    # Optimizer config
    optimizer: str = "adam"
    momentum: float = 0.9
    weight_decay: float = 0.0

    # Regularization
    dropout: float = 0.0
    l1_regularization: float = 0.0
    l2_regularization: float = 0.0

    # Advanced options
    early_stopping_patience: int = 10
    learning_rate_schedule: Optional[str] = None
    checkpoint_path: Optional[str] = None
    random_seed: int = 42
    verbose: bool = True

    def __post_init__(self):
        """Validate configuration"""
        if self.epochs <= 0:
            raise ValueError(f"epochs must be positive, got {self.epochs}")
        if not 0 <= self.dropout <= 1:
            raise ValueError(f"dropout must be in [0, 1], got {self.dropout}")
        if self.batch_size <= 0:
            raise ValueError(f"batch_size must be positive, got {self.batch_size}")

def train_model(
    data,
    labels,
    config: TrainingConfig = None,
    **override_kwargs
):
    """
    Train model with type-safe configuration.

    Args:
        data: Training data
        labels: Training labels
        config: TrainingConfig object (uses defaults if None)
        **override_kwargs: Override specific config values
    """
    # Use default config if none provided
    if config is None:
        config = TrainingConfig()

    # Override with kwargs if provided
    if override_kwargs:
        config = dataclass_replace(config, **override_kwargs)

    # Now use validated config
    print(f"Training for {config.epochs} epochs with lr={config.learning_rate}")
    # ... training code

# Usage 1: All defaults
train_model(X, y)

# Usage 2: Custom config
config = TrainingConfig(
    epochs=50,
    learning_rate=0.01,
    dropout=0.5
)
train_model(X, y, config)

# Usage 3: Override specific values
train_model(X, y, epochs=30, learning_rate=0.005)

# Usage 4: Mix config + overrides
config = TrainingConfig(epochs=50, dropout=0.5)
train_model(X, y, config, learning_rate=0.01)  # Override lr

# Better: Pydantic for runtime validation
from pydantic import BaseModel, Field, validator

class TrainingConfig(BaseModel):
    """Self-validating config with Pydantic"""
    epochs: int = Field(100, gt=0, description="Number of training epochs")
    learning_rate: float = Field(0.001, gt=0, le=1)
    batch_size: int = Field(32, gt=0)
    optimizer: str = Field("adam", regex="^(adam|sgd|rmsprop)$")

    @validator('batch_size')
    def batch_size_must_be_power_of_2(cls, v):
        if v & (v - 1) != 0:
            raise ValueError(f"batch_size must be power of 2, got {v}")
        return v

    class Config:
        validate_assignment = True  # Validate when attributes change
        extra = "forbid"  # Reject unknown fields

# Invalid configs raise errors immediately
try:
    config = TrainingConfig(epochs=-10)
except ValidationError as e:
    print(e)  # epochs must be > 0

try:
    config = TrainingConfig(optimizer="adagrad")
except ValidationError as e:
    print(e)  # optimizer must match regex

try:
    config = TrainingConfig(unknown_param=123)
except ValidationError as e:
    print(e)  # extra fields not permitted

# Hybrid approach: Explicit common params + **kwargs for advanced
def train_model(
    data,
    labels,
    *,  # Keyword-only
    epochs: int = 100,
    learning_rate: float = 0.001,
    batch_size: int = 32,
    **advanced_options
):
    """
    Train model with explicit common params and flexible advanced options.

    Args:
        data: Training data
        labels: Training labels
        epochs: Training epochs
        learning_rate: Learning rate
        batch_size: Batch size
        **advanced_options: Advanced configuration passed to model:
            - optimizer: Optimizer name (default: "adam")
            - dropout: Dropout rate (default: 0.0)
            - l2_regularization: L2 reg strength (default: 0.0)
            - early_stopping_patience: Epochs to wait (default: 10)
            - ... any other model-specific params
    """
    # Extract advanced options with defaults
    optimizer = advanced_options.get("optimizer", "adam")
    dropout = advanced_options.get("dropout", 0.0)

    # Forward remaining kwargs to model
    model = create_model(**advanced_options)

    # Train
    model.fit(data, labels, epochs=epochs, lr=learning_rate, batch_size=batch_size)

# Clean common usage
train_model(X, y, epochs=50, learning_rate=0.01)

# Advanced usage when needed
train_model(
    X, y,
    epochs=50,
    learning_rate=0.01,
    optimizer="sgd",
    momentum=0.9,
    dropout=0.5,
    custom_param=123  # Forwarded to model
)

# Config file pattern (YAML/JSON)
import yaml

# config.yaml:
# epochs: 100
# learning_rate: 0.001
# batch_size: 32
# optimizer: adam
# dropout: 0.5

def load_config(path: str) -> TrainingConfig:
    """Load config from YAML file"""
    with open(path) as f:
        config_dict = yaml.safe_load(f)
    return TrainingConfig(**config_dict)  # Pydantic validates

config = load_config("config.yaml")
train_model(X, y, config)

# Environment variable overrides
import os

class TrainingConfig(BaseModel):
    epochs: int = Field(default_factory=lambda: int(os.getenv("EPOCHS", "100")))
    learning_rate: float = Field(default_factory=lambda: float(os.getenv("LR", "0.001")))
    batch_size: int = Field(default_factory=lambda: int(os.getenv("BATCH_SIZE", "32")))

# Can override via environment
# $ EPOCHS=50 LR=0.01 python train.py
```

**Real-world pattern: Tiered configuration**:
```python
from pydantic import BaseModel
from typing import Optional

class OptimizerConfig(BaseModel):
    """Nested optimizer configuration"""
    name: str = "adam"
    learning_rate: float = 0.001
    momentum: float = 0.9
    weight_decay: float = 0.0

class RegularizationConfig(BaseModel):
    """Nested regularization configuration"""
    dropout: float = 0.0
    l1_strength: float = 0.0
    l2_strength: float = 0.0

class TrainingConfig(BaseModel):
    """Top-level configuration"""
    # Basic training params
    epochs: int = 100
    batch_size: int = 32

    # Nested configs
    optimizer: OptimizerConfig = OptimizerConfig()
    regularization: RegularizationConfig = RegularizationConfig()

    # Paths and logging
    checkpoint_dir: Optional[str] = None
    log_dir: Optional[str] = "./logs"
    verbose: bool = True

# Usage with nested structure
config = TrainingConfig(
    epochs=50,
    optimizer=OptimizerConfig(name="sgd", learning_rate=0.01),
    regularization=RegularizationConfig(dropout=0.5, l2_strength=0.01)
)

def train_model(data, labels, config: TrainingConfig):
    print(f"Training with {config.optimizer.name} optimizer")
    print(f"Dropout: {config.regularization.dropout}")
    # ...
```

**In Practice**:
For ML projects: (1) **Use Pydantic for configs** - validation, IDE support, serialization, (2) **Explicit params for top 3-5 options** - epochs, lr, batch_size, (3) **`**kwargs` for library forwarding** - pass through to sklearn, PyTorch, etc., (4) **YAML/JSON config files** for experiments - version control configs, (5) **Environment variables** for deployment - override configs in production. Avoid untyped dicts and massive parameter lists.

**Key Takeaway**: Use explicit parameters for common options (3-5), dataclasses/Pydantic for structured configs with validation, **kwargs for advanced/forwarded options; avoid untyped dicts and parameter lists >10.

</details>

4. When should you split a large function into smaller ones in data pipelines?

<details>
<summary>Answer: Split when >50 lines, multiple responsibilities, reused logic, or hard to test; aim for single responsibility per function</summary>

**Explanation**:
Split functions when: (1) **Length** - >50-75 lines is hard to understand at a glance, (2) **Multiple responsibilities** - function does >1 thing (violates Single Responsibility Principle), (3) **Reusability** - same logic used in multiple places, (4) **Testability** - hard to test all paths in one function, (5) **Abstraction levels** - mixing high-level flow with low-level details, (6) **Nested complexity** - >3 levels of indentation.

Benefits: (1) **Easier testing** - test small units independently, (2) **Better reusability** - extract common logic, (3) **Clearer intent** - function names document what code does, (4) **Simpler debugging** - smaller units easier to trace, (5) **Parallel development** - team members work on different functions.

Apply "Extract Method" refactoring: identify code block that does one thing, extract to named function, replace original with call.

**Example**:
```python
# Bad: Monolithic data pipeline (hard to test, understand, modify)
def process_dataset(file_path):
    """Does everything - too complex!"""
    # Load data
    import pandas as pd
    df = pd.read_csv(file_path)

    # Remove duplicates
    df = df.drop_duplicates()

    # Handle missing values
    for col in df.columns:
        if df[col].dtype == 'float64':
            df[col].fillna(df[col].mean(), inplace=True)
        else:
            df[col].fillna(df[col].mode()[0], inplace=True)

    # Outlier removal
    for col in df.select_dtypes(include=['float64']).columns:
        mean = df[col].mean()
        std = df[col].std()
        df = df[(df[col] > mean - 3*std) & (df[col] < mean + 3*std)]

    # Feature engineering
    if 'age' in df.columns and 'income' in df.columns:
        df['age_income_ratio'] = df['age'] / (df['income'] + 1)

    # Encode categorical
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype('category').cat.codes

    # Normalize numerical
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    df[numeric_cols] = scaler.fit_transform(df[numeric_cols])

    # Split features and labels
    X = df.drop('target', axis=1)
    y = df['target']

    # Train-test split
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    return X_train, X_test, y_train, y_test

# Good: Split into focused functions (testable, reusable, clear)
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from typing import Tuple, List

def load_data(file_path: str) -> pd.DataFrame:
    """
    Load data from CSV file.

    Single responsibility: File I/O
    """
    return pd.read_csv(file_path)

def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove duplicate rows.

    Single responsibility: Deduplication
    """
    return df.drop_duplicates()

def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Impute missing values using appropriate strategy per column type.

    Single responsibility: Missing value imputation

    - Numeric columns: fill with mean
    - Categorical columns: fill with mode
    """
    df = df.copy()

    for col in df.columns:
        if df[col].dtype == 'float64' or df[col].dtype == 'int64':
            df[col].fillna(df[col].mean(), inplace=True)
        else:
            mode_value = df[col].mode()
            if len(mode_value) > 0:
                df[col].fillna(mode_value[0], inplace=True)

    return df

def remove_outliers(
    df: pd.DataFrame,
    columns: List[str] = None,
    threshold: float = 3.0
) -> pd.DataFrame:
    """
    Remove outliers using z-score method.

    Single responsibility: Outlier detection and removal

    Args:
        df: Input dataframe
        columns: Columns to check (default: all numeric)
        threshold: Number of standard deviations (default: 3.0)
    """
    df = df.copy()

    if columns is None:
        columns = df.select_dtypes(include=['float64', 'int64']).columns

    for col in columns:
        mean = df[col].mean()
        std = df[col].std()
        df = df[(df[col] > mean - threshold*std) & (df[col] < mean + threshold*std)]

    return df

def create_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create derived features from existing columns.

    Single responsibility: Feature engineering
    """
    df = df.copy()

    # Age-income ratio
    if 'age' in df.columns and 'income' in df.columns:
        df['age_income_ratio'] = df['age'] / (df['income'] + 1)

    # Add more feature engineering as needed

    return df

def encode_categorical(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode categorical variables as integers.

    Single responsibility: Categorical encoding
    """
    df = df.copy()

    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype('category').cat.codes

    return df

def normalize_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, StandardScaler]:
    """
    Normalize numerical features to zero mean and unit variance.

    Single responsibility: Feature scaling

    Returns:
        Tuple of (normalized dataframe, fitted scaler)
    """
    df = df.copy()
    scaler = StandardScaler()

    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    df[numeric_cols] = scaler.fit_transform(df[numeric_cols])

    return df, scaler

def split_features_labels(
    df: pd.DataFrame,
    target_column: str = 'target'
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Split dataframe into features and labels.

    Single responsibility: Data splitting
    """
    X = df.drop(target_column, axis=1)
    y = df[target_column]
    return X, y

def split_train_test(
    X: pd.DataFrame,
    y: pd.Series,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Split data into training and test sets.

    Single responsibility: Train-test splitting
    """
    return train_test_split(X, y, test_size=test_size, random_state=random_state)

# High-level pipeline function - composes smaller functions
def process_dataset(
    file_path: str,
    test_size: float = 0.2
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Complete data processing pipeline.

    This orchestrates the pipeline using single-responsibility functions.
    Each step is independently testable and reusable.
    """
    # Clear, readable flow - self-documenting
    df = load_data(file_path)
    df = remove_duplicates(df)
    df = handle_missing_values(df)
    df = remove_outliers(df)
    df = create_engineered_features(df)
    df = encode_categorical(df)
    df, scaler = normalize_features(df)
    X, y = split_features_labels(df)
    X_train, X_test, y_train, y_test = split_train_test(X, y, test_size)

    return X_train, X_test, y_train, y_test

# Now each function is:
# 1. Independently testable
def test_remove_outliers():
    df = pd.DataFrame({'col1': [1, 2, 3, 100, 4, 5]})
    result = remove_outliers(df, threshold=2.0)
    assert 100 not in result['col1'].values

# 2. Reusable in other pipelines
def process_new_data(file_path: str):
    """Different pipeline reusing same functions"""
    df = load_data(file_path)
    df = handle_missing_values(df)  # Reuse
    df = normalize_features(df)[0]   # Reuse
    return df

# 3. Easy to modify
def handle_missing_values_advanced(df: pd.DataFrame, strategy: str = "mean"):
    """Enhanced version - easy to extend without affecting other code"""
    df = df.copy()

    if strategy == "mean":
        # Original logic
        for col in df.columns:
            if df[col].dtype in ['float64', 'int64']:
                df[col].fillna(df[col].mean(), inplace=True)
    elif strategy == "median":
        # New strategy - doesn't break existing code
        for col in df.columns:
            if df[col].dtype in ['float64', 'int64']:
                df[col].fillna(df[col].median(), inplace=True)

    return df

# 4. Composable into different pipelines
def quick_pipeline(file_path: str):
    """Minimal processing for quick experiments"""
    df = load_data(file_path)
    df = handle_missing_values(df)
    return df

def production_pipeline(file_path: str):
    """Full processing for production"""
    df = load_data(file_path)
    df = remove_duplicates(df)
    df = handle_missing_values(df)
    df = remove_outliers(df)
    df = create_engineered_features(df)
    df = encode_categorical(df)
    df, scaler = normalize_features(df)
    return df, scaler
```

**When to split - code smells**:
```python
# Smell 1: Multiple levels of indentation (>3)
def complex_function(data):
    for item in data:
        if item > 0:
            for sub_item in item.children:
                if sub_item.is_valid():
                    for value in sub_item.values:
                        # Too nested - hard to follow

# Fix: Extract inner loops
def process_item(item):
    for sub_item in item.children:
        if sub_item.is_valid():
            process_sub_item(sub_item)

def process_sub_item(sub_item):
    for value in sub_item.values:
        # Process value

# Smell 2: Comments describing sections
def process_data(data):
    # Section 1: Validation
    if not validate(data):
        raise ValueError()

    # Section 2: Transformation
    transformed = transform(data)

    # Section 3: Aggregation
    result = aggregate(transformed)

    return result

# Fix: Each section becomes a function
def process_data(data):
    validate_data(data)
    transformed = transform_data(data)
    result = aggregate_data(transformed)
    return result

# Smell 3: Long parameter list (>5 params)
def train_model(X, y, epochs, lr, batch_size, optimizer, dropout, l2):
    pass  # Too many params

# Fix: Group related params
@dataclass
class TrainingConfig:
    epochs: int = 100
    lr: float = 0.001
    batch_size: int = 32
    optimizer: str = "adam"
    dropout: float = 0.0
    l2_regularization: float = 0.0

def train_model(X, y, config: TrainingConfig):
    pass  # Cleaner

# Smell 4: Try-except with large try blocks
def process(data):
    try:
        # 50 lines of code
        # If any line fails, which one?
        # Hard to handle different errors differently
    except Exception as e:
        pass

# Fix: Smaller try blocks or extract to functions
def process(data):
    loaded = safe_load(data)      # Handles load errors
    cleaned = safe_clean(loaded)  # Handles clean errors
    return safe_save(cleaned)     # Handles save errors
```

**In Practice**:
Apply these refactoring triggers: (1) **Length** - >50 lines, consider splitting, (2) **Complexity** - >3 levels of nesting, extract inner logic, (3) **Duplicate code** - used twice, extract to function, (4) **Testing pain** - hard to test, split into testable units, (5) **Comments** - "Step 1", "Step 2" comments indicate separate functions. Aim for functions that fit on one screen (~25-50 lines) and do one thing well. Each function should have a clear name that describes its single responsibility.

**Key Takeaway**: Split functions when >50 lines, multiple responsibilities, hard to test, or >3 nesting levels; aim for single responsibility, ~25-50 lines per function, clear names; improves testability and reusability.

</details>

5. How do you test functions that depend on external resources (APIs, databases)?

<details>
<summary>Answer: Use dependency injection, mocking (unittest.mock), fixtures, or test containers; separate I/O from logic</summary>

**Explanation**:
Testing functions with external dependencies requires **isolation** - you don't want tests to fail because a third-party API is down. Strategies: (1) **Dependency injection** - pass dependencies as parameters, inject mocks in tests, (2) **Mocking** - use `unittest.mock` to replace external calls with fake responses, (3) **Fixtures** - pre-recorded responses for deterministic tests, (4) **Test containers** - lightweight Docker containers for realistic testing, (5) **Separate I/O from logic** - pure functions for business logic, thin wrappers for I/O.

**Mocking** with `unittest.mock.patch` replaces external calls during tests. **Dependency injection** makes dependencies explicit and swappable. **Integration tests** use real external services (slower, less reliable). **Unit tests** use mocks (fast, reliable).

**Example**:
```python
# Bad: Hard to test - external dependency hardcoded
import requests

def get_user_data(user_id):
    """Fetches user from external API - hard to test!"""
    response = requests.get(f"https://api.example.com/users/{user_id}")
    response.raise_for_status()
    return response.json()

def process_user(user_id):
    """Hard to test without hitting real API"""
    user_data = get_user_data(user_id)  # External call
    return {
        "name": user_data["name"].upper(),
        "age": user_data["age"],
        "is_adult": user_data["age"] >= 18
    }

# Testing is problematic:
# - Requires real API to be available
# - Slow (network calls)
# - Non-deterministic (API could change or fail)
# - Can't test error cases easily

# Good: Dependency injection makes testing easy
from typing import Protocol, Dict, Any

class DataFetcher(Protocol):
    """Protocol for data fetchers - enables mocking"""
    def fetch_user(self, user_id: int) -> Dict[str, Any]:
        ...

class APIDataFetcher:
    """Production implementation"""
    def fetch_user(self, user_id: int) -> Dict[str, Any]:
        response = requests.get(f"https://api.example.com/users/{user_id}")
        response.raise_for_status()
        return response.json()

def process_user(user_id: int, fetcher: DataFetcher) -> Dict[str, Any]:
    """Now testable - fetcher is injected!"""
    user_data = fetcher.fetch_user(user_id)
    return {
        "name": user_data["name"].upper(),
        "age": user_data["age"],
        "is_adult": user_data["age"] >= 18
    }

# Testing with mock
class MockDataFetcher:
    """Test double - fake implementation"""
    def fetch_user(self, user_id: int) -> Dict[str, Any]:
        return {
            "name": "alice",
            "age": 25,
            "email": "alice@example.com"
        }

def test_process_user():
    mock_fetcher = MockDataFetcher()
    result = process_user(123, mock_fetcher)

    assert result["name"] == "ALICE"
    assert result["age"] == 25
    assert result["is_adult"] == True

# Using unittest.mock for mocking
import unittest
from unittest.mock import Mock, patch, MagicMock

def test_with_mock():
    # Create mock fetcher
    mock_fetcher = Mock(spec=DataFetcher)
    mock_fetcher.fetch_user.return_value = {
        "name": "bob",
        "age": 17,
        "email": "bob@example.com"
    }

    result = process_user(456, mock_fetcher)

    # Verify function behavior
    assert result["name"] == "BOB"
    assert result["is_adult"] == False

    # Verify mock was called correctly
    mock_fetcher.fetch_user.assert_called_once_with(456)

# Patching external calls
def get_user_data_original(user_id):
    """Original function with hardcoded requests"""
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

@patch('requests.get')
def test_get_user_data(mock_get):
    """Patch requests.get to return fake response"""
    # Setup mock response
    mock_response = Mock()
    mock_response.json.return_value = {"name": "alice", "age": 25}
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    # Call function
    result = get_user_data_original(123)

    # Verify
    assert result["name"] == "alice"
    mock_get.assert_called_once_with("https://api.example.com/users/123")

# Testing error cases with mocks
@patch('requests.get')
def test_get_user_data_network_error(mock_get):
    """Test how function handles network errors"""
    mock_get.side_effect = requests.ConnectionError("Network error")

    with pytest.raises(requests.ConnectionError):
        get_user_data_original(123)

@patch('requests.get')
def test_get_user_data_404(mock_get):
    """Test 404 response"""
    mock_response = Mock()
    mock_response.raise_for_status.side_effect = requests.HTTPError("404")
    mock_get.return_value = mock_response

    with pytest.raises(requests.HTTPError):
        get_user_data_original(123)

# Fixture-based testing (pytest)
import pytest

@pytest.fixture
def sample_user_data():
    """Reusable test data"""
    return {
        "name": "alice",
        "age": 25,
        "email": "alice@example.com"
    }

@pytest.fixture
def mock_fetcher(sample_user_data):
    """Reusable mock fetcher"""
    fetcher = Mock(spec=DataFetcher)
    fetcher.fetch_user.return_value = sample_user_data
    return fetcher

def test_process_user_with_fixtures(mock_fetcher):
    """Test using fixtures"""
    result = process_user(123, mock_fetcher)
    assert result["name"] == "ALICE"

# Database testing - separate I/O from logic
from typing import List
import sqlite3

# Bad: Business logic mixed with database
def get_adult_users_bad():
    """Hard to test - database hardcoded"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE age >= 18")
    rows = cursor.fetchall()
    conn.close()

    # Business logic mixed with I/O
    return [{"name": row[1], "age": row[2]} for row in rows]

# Good: Separate I/O from logic
class UserRepository:
    """Handles database I/O"""
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_all_users(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, age FROM users")
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "name": r[1], "age": r[2]} for r in rows]

def filter_adult_users(users: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Pure function - easy to test!"""
    return [u for u in users if u["age"] >= 18]

def get_adult_users(repo: UserRepository):
    """Testable - repo is injected"""
    all_users = repo.get_all_users()
    return filter_adult_users(all_users)

# Testing pure function - no database needed
def test_filter_adult_users():
    users = [
        {"id": 1, "name": "Alice", "age": 25},
        {"id": 2, "name": "Bob", "age": 17},
        {"id": 3, "name": "Charlie", "age": 30}
    ]
    result = filter_adult_users(users)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"
    assert result[1]["name"] == "Charlie"

# Testing with mock repository
def test_get_adult_users():
    mock_repo = Mock(spec=UserRepository)
    mock_repo.get_all_users.return_value = [
        {"id": 1, "name": "Alice", "age": 25},
        {"id": 2, "name": "Bob", "age": 17}
    ]

    result = get_adult_users(mock_repo)
    assert len(result) == 1
    assert result[0]["name"] == "Alice"

# Integration test with real database (slower, runs less often)
import tempfile

def test_integration_with_real_db():
    # Create temporary test database
    with tempfile.NamedTemporaryFile(suffix='.db') as tmp:
        conn = sqlite3.connect(tmp.name)
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE users (id INT, name TEXT, age INT)")
        cursor.execute("INSERT INTO users VALUES (1, 'Alice', 25)")
        cursor.execute("INSERT INTO users VALUES (2, 'Bob', 17)")
        conn.commit()
        conn.close()

        # Test with real repository
        repo = UserRepository(tmp.name)
        result = get_adult_users(repo)

        assert len(result) == 1
        assert result[0]["name"] == "Alice"

# Test containers for realistic testing (docker-based)
# Requires testcontainers library: pip install testcontainers
from testcontainers.postgres import PostgresContainer

def test_with_postgres_container():
    """Integration test with real Postgres in Docker"""
    with PostgresContainer("postgres:13") as postgres:
        # Get connection details
        conn = postgres.get_connection()
        cursor = conn.cursor()

        # Setup test schema
        cursor.execute("CREATE TABLE users (id SERIAL, name TEXT, age INT)")
        cursor.execute("INSERT INTO users VALUES (1, 'Alice', 25)")
        conn.commit()

        # Test against real database
        cursor.execute("SELECT * FROM users WHERE age >= 18")
        result = cursor.fetchall()

        assert len(result) == 1
        assert result[0][1] == "Alice"
```

**ML-specific testing patterns**:
```python
# Testing model training with mocked data loading
class ModelTrainer:
    def __init__(self, data_loader):
        self.data_loader = data_loader

    def train(self, epochs: int):
        X, y = self.data_loader.load_data()
        model = create_model()
        model.fit(X, y, epochs=epochs)
        return model

# Test without real data loading
def test_trainer():
    mock_loader = Mock()
    mock_loader.load_data.return_value = (
        np.random.rand(100, 10),
        np.random.randint(0, 2, 100)
    )

    trainer = ModelTrainer(mock_loader)
    model = trainer.train(epochs=5)

    assert model is not None
    mock_loader.load_data.assert_called_once()

# Testing API-based model inference
@patch('requests.post')
def test_model_inference_api(mock_post):
    """Test API call without hitting real endpoint"""
    mock_response = Mock()
    mock_response.json.return_value = {"prediction": 1, "confidence": 0.87}
    mock_post.return_value = mock_response

    result = predict_via_api({"features": [1, 2, 3]})

    assert result["prediction"] == 1
    mock_post.assert_called_once()
```

**In Practice**:
For ML testing: (1) **Unit tests** - mock external dependencies, test business logic in isolation, (2) **Integration tests** - use test containers or test databases, run less frequently, (3) **Smoke tests** - hit real APIs/DBs in staging environment, (4) **Separate I/O from logic** - pure functions for transformations, thin wrappers for external calls, (5) **Dependency injection** - pass dependencies as params, not hardcoded. This makes tests fast, reliable, and deterministic.

**Key Takeaway**: Test external dependencies using dependency injection (pass as params) + mocking (unittest.mock); separate I/O from business logic; use test containers for integration tests; pure functions are easiest to test.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#decorators) for comprehensive list

## Summary

**In 3 sentences**:
- Functions encapsulate reusable code blocks with parameters (inputs) and return values (outputs), using `def function_name(params):` syntax
- Python supports positional, keyword, default parameters, and variable arguments (*args for positional, **kwargs for keyword)
- Functions make ML code modular and testable - organize preprocessing, training, and evaluation into clear, reusable components

**Key takeaway**: Functions are the building blocks of clean ML code. Master parameters, return values, and scope, and you can build maintainable data pipelines and model training workflows!
