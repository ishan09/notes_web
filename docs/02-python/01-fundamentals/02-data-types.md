# Data Types

> **Before you start**: Can you write basic Python syntax? If not, review [Syntax Basics](./01-syntax-basics.md)

## What are Data Types?

Data types define **what kind of data a variable can hold** and **what operations you can perform on it**. Think of data types as containers - you store water in bottles, books on shelves, and clothes in drawers. Each container is designed for its specific content.

**Real-world analogy**: Data types are like different types of shipping containers. A refrigerated container (list) holds multiple items and keeps them in order. A filing cabinet (dictionary) lets you look up items by name. A set of keys (set) ensures no duplicates. Each container serves a different purpose.

## Why This Matters for AI/ML

**You'll need data types for**:
- Storing training data (lists, arrays)
- Feature engineering (dictionaries for key-value pairs)
- Model parameters and configurations (dicts, tuples)
- Data preprocessing and cleaning (understanding type conversions)

**AI/ML Context**: ML pipelines transform data through different types. Raw CSV data becomes lists, then numpy arrays, then pandas DataFrames, then tensors. Understanding Python's basic types is foundational to working with these advanced structures.

## Basic Data Types

### 1. Numbers (int, float, complex)

Python has three numeric types:

```python
# Integer (whole numbers, unlimited precision)
age = 25
population = 7_900_000_000  # Underscores for readability

# Float (decimal numbers)
price = 99.99
accuracy = 0.856
scientific = 1.5e-3  # 0.0015 in scientific notation

# Complex (rarely used in ML)
z = 3 + 4j
```

**Key differences from Java**:
- **No overflow**: Python ints can be arbitrarily large (no int32/int64 limit)
- **Division returns float**: `10 / 3 = 3.333...` (not integer division by default)
- **Use `//` for integer division**: `10 // 3 = 3`

```python
# Arithmetic operations
x = 10
y = 3

print(x + y)   # 13 (addition)
print(x - y)   # 7 (subtraction)
print(x * y)   # 30 (multiplication)
print(x / y)   # 3.333... (float division)
print(x // y)  # 3 (integer division)
print(x % y)   # 1 (modulo)
print(x ** y)  # 1000 (exponent: 10^3)
```

### 2. Strings

Strings are sequences of characters - immutable in Python.

```python
# Creating strings
name = "Alice"
message = 'Hello, World!'
multi = """This is
a multi-line
string"""

# String operations
greeting = "Hello" + " " + "World"  # Concatenation
repeated = "Ha" * 3  # "HaHaHa" (repetition)

# String methods (non-mutating - return new strings)
text = "  Python Programming  "
print(text.strip())        # "Python Programming" (remove whitespace)
print(text.lower())        # "  python programming  "
print(text.upper())        # "  PYTHON PROGRAMMING  "
print(text.replace("Python", "Java"))  # "  Java Programming  "

# String indexing and slicing
word = "Python"
print(word[0])      # 'P' (first character)
print(word[-1])     # 'n' (last character)
print(word[0:3])    # 'Pyt' (slice: start to end-1)
print(word[:3])     # 'Pyt' (start to 3)
print(word[3:])     # 'hon' (3 to end)
```

**Common string operations for ML**:

```python
# String formatting (f-strings)
name = "Alice"
accuracy = 0.856
print(f"{name}'s model accuracy: {accuracy:.2%}")  # "Alice's model accuracy: 85.60%"

# Splitting and joining (data parsing)
csv_line = "name,age,city"
fields = csv_line.split(",")  # ['name', 'age', 'city']

data = ["apple", "banana", "orange"]
result = ", ".join(data)  # "apple, banana, orange"

# Checking contents
email = "user@example.com"
print(email.startswith("user"))  # True
print(email.endswith(".com"))    # True
print("@" in email)              # True
```

### 3. Booleans

Boolean values represent True or False.

```python
# Boolean literals
is_trained = True
has_error = False

# Comparison operations return booleans
x = 10
print(x > 5)    # True
print(x == 10)  # True
print(x != 10)  # False

# Logical operations
a = True
b = False
print(a and b)  # False (both must be True)
print(a or b)   # True (at least one is True)
print(not a)    # False (negation)

# Truthy and Falsy values
# False: False, None, 0, 0.0, "", [], {}, ()
# True: Everything else

print(bool(0))       # False
print(bool(1))       # True
print(bool(""))      # False (empty string)
print(bool("hello")) # True (non-empty string)
print(bool([]))      # False (empty list)
print(bool([1, 2]))  # True (non-empty list)
```

### 4. None Type

`None` represents the absence of a value (like `null` in Java).

```python
result = None  # No value yet

if result is None:
    print("No result")

# Common use: default parameter values
def process_data(data, model=None):
    if model is None:
        model = create_default_model()
    # ... rest of function
```

**Important**: Use `is` / `is not` for None comparisons, not `==`.

```python
# Correct
if value is None:
    pass

# Wrong (works but not idiomatic)
if value == None:
    pass
```

## Collection Types

### 1. Lists

**Mutable, ordered sequences** - most versatile collection type.

```python
# Creating lists
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", 3.14, True]  # Can mix types
empty = []

# Accessing elements
fruits = ["apple", "banana", "orange"]
print(fruits[0])      # "apple" (first element)
print(fruits[-1])     # "orange" (last element)
print(fruits[1:3])    # ["banana", "orange"] (slice)

# Modifying lists (mutable!)
fruits.append("grape")          # Add to end
fruits.insert(1, "mango")       # Insert at index 1
fruits.remove("banana")         # Remove first occurrence
last = fruits.pop()             # Remove and return last element
fruits[0] = "pear"              # Change element

# List operations
nums = [1, 2, 3]
nums2 = [4, 5, 6]
combined = nums + nums2         # [1, 2, 3, 4, 5, 6]
repeated = nums * 2             # [1, 2, 3, 1, 2, 3]

# Useful methods
numbers = [3, 1, 4, 1, 5]
print(len(numbers))             # 5 (length)
print(sum(numbers))             # 14 (sum)
print(max(numbers))             # 5 (maximum)
print(min(numbers))             # 1 (minimum)
print(numbers.count(1))         # 2 (count occurrences)
numbers.sort()                  # [1, 1, 3, 4, 5] (sort in-place)
numbers.reverse()               # [5, 4, 3, 1, 1] (reverse in-place)
```

**List comprehensions** (powerful one-liner):

```python
# Create list from 0 to 9
numbers = [x for x in range(10)]

# Squares of even numbers
squares = [x**2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]

# Transform data (common in ML preprocessing)
raw_data = ["1.5", "2.3", "4.7"]
floats = [float(x) for x in raw_data]
# [1.5, 2.3, 4.7]
```

### 2. Tuples

**Immutable, ordered sequences** - like lists but can't be changed.

```python
# Creating tuples
coordinates = (10, 20)
single = (1,)  # Note the comma for single-element tuple
empty = ()

# Accessing elements (same as lists)
point = (3, 4, 5)
print(point[0])    # 3
print(point[1:3])  # (4, 5)

# Unpacking (very useful!)
x, y, z = point    # x=3, y=4, z=5

# Function returning multiple values
def get_stats():
    return 0.85, 0.92, 0.78  # Returns a tuple

accuracy, precision, recall = get_stats()

# Tuples are immutable
point = (1, 2)
# point[0] = 5  # TypeError: 'tuple' object does not support item assignment
```

**When to use tuples**:
- Fixed data that shouldn't change (coordinates, RGB colors)
- Function return values (multiple items)
- Dictionary keys (lists can't be keys)

### 3. Dictionaries

**Mutable, unordered key-value pairs** - like HashMap in Java.

```python
# Creating dictionaries
person = {
    "name": "Alice",
    "age": 30,
    "city": "NYC"
}

# Empty dict
empty = {}
empty_explicit = dict()

# Accessing values
print(person["name"])          # "Alice"
print(person.get("age"))       # 30
print(person.get("email", "N/A"))  # "N/A" (default if key missing)

# Modifying dictionaries
person["email"] = "alice@example.com"  # Add new key
person["age"] = 31                      # Update existing key
del person["city"]                      # Remove key

# Dictionary methods
print(person.keys())    # dict_keys(['name', 'age', 'email'])
print(person.values())  # dict_values(['Alice', 31, 'alice@example.com'])
print(person.items())   # dict_items([('name', 'Alice'), ...])

# Checking key existence
if "name" in person:
    print(person["name"])

# Iterating
for key, value in person.items():
    print(f"{key}: {value}")
```

**Common ML use cases**:

```python
# Model configuration
config = {
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100,
    "optimizer": "adam"
}

# Feature mapping
feature_map = {
    "age": 0,
    "income": 1,
    "education": 2
}

# Vocabulary (word to index)
vocab = {
    "hello": 0,
    "world": 1,
    "python": 2
}
```

### 4. Sets

**Mutable, unordered collections of unique elements** - like HashSet in Java.

```python
# Creating sets
fruits = {"apple", "banana", "orange"}
empty = set()  # Note: {} creates an empty dict, not set!

# Adding/removing elements
fruits.add("grape")
fruits.remove("banana")  # KeyError if not present
fruits.discard("banana") # No error if not present

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(a | b)  # {1, 2, 3, 4, 5, 6} (union)
print(a & b)  # {3, 4} (intersection)
print(a - b)  # {1, 2} (difference)
print(a ^ b)  # {1, 2, 5, 6} (symmetric difference)

# Membership testing (very fast)
fruits = {"apple", "banana", "orange"}
print("apple" in fruits)  # True (O(1) average time)

# Remove duplicates from list
numbers = [1, 2, 2, 3, 3, 3, 4]
unique = list(set(numbers))  # [1, 2, 3, 4]
```

**ML use cases**:
- Remove duplicate data points
- Find unique labels in classification
- Fast membership testing

## Type Checking and Conversion

```python
# Check type
x = 10
print(type(x))           # <class 'int'>
print(isinstance(x, int))  # True (preferred way)

# Type conversion
x = "123"
num = int(x)        # 123 (string to int)
flt = float(x)      # 123.0 (string to float)
s = str(456)        # "456" (number to string)

# Collection conversions
numbers = [1, 2, 3]
t = tuple(numbers)  # (1, 2, 3) (list to tuple)
s = set(numbers)    # {1, 2, 3} (list to set)

text = "hello"
chars = list(text)  # ['h', 'e', 'l', 'l', 'o'] (string to list)
```

**Common conversions in ML**:

```python
# String data to numeric
data = ["1.5", "2.3", "4.7"]
floats = [float(x) for x in data]

# List to numpy array (later topic)
# import numpy as np
# arr = np.array([1, 2, 3])

# Dictionary keys/values to list
config = {"lr": 0.01, "batch": 32}
keys_list = list(config.keys())
values_list = list(config.values())
```

## Try It

**Exercise 1**: Work with different data types

```python
# Numbers
x = 10
y = 3
print(f"Division: {x / y}")
print(f"Integer division: {x // y}")
print(f"Power: {x ** y}")

# Strings
name = "python"
print(name.upper())
print(name.capitalize())
print(name * 3)

# Type checking
print(type(x))
print(type(name))
print(type(3.14))
```

**Exercise 2**: Collection operations

```python
# List operations
fruits = ["apple", "banana", "orange"]
fruits.append("grape")
print(fruits)
print(fruits[1:3])

# Dictionary operations
person = {"name": "Alice", "age": 30}
person["city"] = "NYC"
print(person)

# Set operations
a = {1, 2, 3}
b = {3, 4, 5}
print(a & b)  # Intersection
print(a | b)  # Union
```

**Exercise 3**: Type conversions

```python
# String to number
text = "123"
num = int(text)
print(num + 10)

# List to set (remove duplicates)
numbers = [1, 2, 2, 3, 3, 3]
unique = set(numbers)
print(unique)

# Split string to list
csv = "apple,banana,orange"
items = csv.split(",")
print(items)
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between a list and a tuple?
2. **Why** would you use a dictionary instead of a list?
3. **When** should you use a set vs a list?
4. **How** do you check the type of a variable?
5. **Compare**: Python's dynamic typing vs Java's static typing

<details>
<summary>Click to reveal answers</summary>

1. **Lists are mutable** (can be changed) and **tuples are immutable** (cannot be changed). Lists use `[]`, tuples use `()`. Example: `list = [1, 2, 3]` can be modified with `list[0] = 10`, but `tuple = (1, 2, 3)` cannot be changed. Use tuples for fixed data, lists for data that changes.

2. **Dictionaries provide key-value mapping** - you can look up values by meaningful keys instead of numeric indices. Example: `person["name"]` is clearer than `person[0]`. Use dicts when you need named access to data, like configuration settings, feature mappings, or when order doesn't matter.

3. **Use sets when you need**: (1) Unique elements only (automatic deduplication), (2) Fast membership testing (`x in my_set` is O(1)), (3) Set operations (union, intersection, difference). Use lists when order matters or duplicates are allowed.

4. **Two ways**: (1) `type(variable)` returns the type object, (2) `isinstance(variable, type)` checks if variable is of that type (preferred). Example: `type(x) == int` vs `isinstance(x, int)`. Use `isinstance()` as it handles inheritance better.

5. **Python uses dynamic typing** - types are determined at runtime, variables can change type. **Java uses static typing** - types are declared and checked at compile time. Python: `x = 5` then `x = "hello"` is valid. Java requires `int x = 5;` and `x` must remain an int. Python is more flexible but catches type errors at runtime; Java catches them at compile time.

</details>

## Practice Exercises

**Level 1 - Understand**:

Explore each collection type in the Python interpreter:

```python
# Start Python
python3

# Lists
>>> fruits = ["apple", "banana", "orange"]
>>> fruits.append("grape")
>>> print(fruits)
>>> print(len(fruits))

# Dictionaries
>>> person = {"name": "Alice", "age": 30}
>>> person["city"] = "NYC"
>>> print(person)
>>> print(person.keys())

# Sets
>>> nums = {1, 2, 3, 3, 3}  # Duplicates removed
>>> print(nums)
>>> nums.add(4)
>>> print(nums)

>>> exit()
```

**Level 2 - Apply**:

Create a file `data_types_practice.py`:

```python
# Student data management
students = [
    {"name": "Alice", "age": 20, "grades": [85, 90, 92]},
    {"name": "Bob", "age": 21, "grades": [78, 85, 88]},
    {"name": "Charlie", "age": 20, "grades": [92, 95, 98]}
]

# Calculate average grade for each student
for student in students:
    name = student["name"]
    grades = student["grades"]
    average = sum(grades) / len(grades)
    print(f"{name}'s average: {average:.2f}")

# Find unique ages
ages = [student["age"] for student in students]
unique_ages = set(ages)
print(f"\nUnique ages: {unique_ages}")

# Count students by age
age_counts = {}
for student in students:
    age = student["age"]
    if age in age_counts:
        age_counts[age] += 1
    else:
        age_counts[age] = 1

print(f"\nStudents per age: {age_counts}")
```

Run it: `python3 data_types_practice.py`

**Level 3 - Create**:

Build a simple ML dataset manager:

<details>
<summary>Solution</summary>

```python
# ml_dataset.py

# Simulate ML dataset
dataset = {
    "features": [
        [1.5, 2.3, 3.1],
        [2.1, 3.5, 4.2],
        [1.8, 2.9, 3.7],
        [2.5, 3.8, 4.5]
    ],
    "labels": [0, 1, 0, 1],
    "feature_names": ["age", "income", "score"]
}

# Dataset statistics
num_samples = len(dataset["features"])
num_features = len(dataset["feature_names"])
unique_labels = set(dataset["labels"])

print("=" * 40)
print("Dataset Summary")
print("=" * 40)
print(f"Total samples: {num_samples}")
print(f"Number of features: {num_features}")
print(f"Feature names: {', '.join(dataset['feature_names'])}")
print(f"Unique labels: {unique_labels}")
print()

# Label distribution
label_counts = {}
for label in dataset["labels"]:
    label_counts[label] = label_counts.get(label, 0) + 1

print("Label Distribution:")
for label, count in sorted(label_counts.items()):
    percentage = (count / num_samples) * 100
    print(f"  Label {label}: {count} samples ({percentage:.1f}%)")
print()

# Feature statistics (mean per feature)
print("Feature Statistics (Mean):")
for i, feature_name in enumerate(dataset["feature_names"]):
    values = [sample[i] for sample in dataset["features"]]
    mean = sum(values) / len(values)
    print(f"  {feature_name}: {mean:.2f}")

print("=" * 40)
```

Run it: `python3 ml_dataset.py`

Output:
```
========================================
Dataset Summary
========================================
Total samples: 4
Number of features: 3
Feature names: age, income, score
Unique labels: {0, 1}

Label Distribution:
  Label 0: 2 samples (50.0%)
  Label 1: 2 samples (50.0%)

Feature Statistics (Mean):
  age: 1.98
  income: 3.12
  score: 3.88
========================================
```

</details>

## Common Mistakes

❌ **Mistake 1**: Modifying list while iterating

```python
# Wrong - can cause issues
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    if num % 2 == 0:
        numbers.remove(num)  # Modifying while iterating
```

**Why it's wrong**: Removing items changes indices, causing you to skip elements.

✅ **Instead**: Create a new list or iterate over a copy

```python
# Correct - list comprehension
numbers = [1, 2, 3, 4, 5]
numbers = [num for num in numbers if num % 2 != 0]

# Or iterate over copy
numbers = [1, 2, 3, 4, 5]
for num in numbers[:]:  # [:] creates a copy
    if num % 2 == 0:
        numbers.remove(num)
```

---

❌ **Mistake 2**: Using mutable default arguments

```python
# Wrong - bug waiting to happen
def add_item(item, items=[]):
    items.append(item)
    return items

# This behaves unexpectedly
list1 = add_item(1)  # [1]
list2 = add_item(2)  # [1, 2] - WHAT?! Expected [2]
```

**Why it's wrong**: Default list is created once and shared across all calls.

✅ **Instead**: Use None as default

```python
# Correct
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

list1 = add_item(1)  # [1]
list2 = add_item(2)  # [2] - correct!
```

---

❌ **Mistake 3**: Using `{}` for empty set

```python
# Wrong - creates dict, not set
empty = {}
print(type(empty))  # <class 'dict'>
```

✅ **Instead**: Use `set()` constructor

```python
# Correct
empty = set()
print(type(empty))  # <class 'set'>
```

---

❌ **Mistake 4**: Comparing with `==` instead of `is` for None

```python
# Works but not idiomatic
if value == None:
    pass
```

✅ **Instead**: Use `is` for None checks

```python
# Correct - idiomatic Python
if value is None:
    pass
```

---

❌ **Mistake 5**: Forgetting strings are immutable

```python
# Wrong - doesn't modify string
text = "hello"
text.upper()  # This returns new string, doesn't modify text
print(text)   # Still "hello"
```

✅ **Instead**: Reassign the result

```python
# Correct
text = "hello"
text = text.upper()  # Reassign
print(text)  # "HELLO"
```

## How This Connects

**Builds on**:
- [Syntax Basics](./01-syntax-basics.md) - Variable assignment and basic syntax

**Related concepts**:
- [Control Flow](./03-control-flow.md) - Use data types in if/else and loops
- [Functions](./04-functions.md) - Pass data types as parameters
- [OOP Basics](../02-intermediate/01-oop-basics.md) - Create custom data types (classes)

**Why this matters for AI**:
- **Data preprocessing**: Raw data (strings) → processed data (lists/dicts) → numpy arrays
- **Feature engineering**: Dictionaries map feature names to values
- **Model configuration**: Use dicts for hyperparameters
- **Data structures**: Understanding basic types helps with pandas DataFrames and numpy arrays

**Next steps**:
- [Control Flow](./03-control-flow.md) - Use these data types in conditions and loops

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How are Python integers implemented? Why don't they overflow like in C or Java?

<details>
<summary>Answer: Python uses arbitrary-precision integers with dynamic memory allocation</summary>

**Explanation**:
Python integers are implemented as variable-length arrays of "digits" (30-bit chunks on 64-bit systems). Unlike C's `int` (fixed 32-bit) or Java's `int` (fixed 32-bit), Python allocates more memory as numbers grow. Small integers (-5 to 256) are cached as singletons for performance. Larger integers dynamically allocate space.

Internally, Python's `int` is a `PyLongObject` structure containing a size field and an array of 30-bit "digits". When you add two numbers that overflow a digit, Python adds more digits. This is why `2**1000` works in Python but would overflow in C.

The trade-off: Python integers use more memory (minimum 28 bytes vs 4 bytes for C int) and operations are slower (software arithmetic vs CPU instructions). But you never worry about overflow bugs - critical for scientific computing where calculations can produce huge intermediate values.

**Example**:
```python
import sys

# Small ints are cached (same object)
a = 100
b = 100
print(a is b)  # True - same object in memory

c = 1000
d = 1000
print(c is d)  # False - different objects (outside cache range)

# Arbitrary precision - no overflow!
huge = 2 ** 1000  # Works! 302 digits
print(len(str(huge)))  # 302

# Java/C would overflow:
# int x = 2_147_483_647;  // Max int
# x = x + 1;  // Overflows to -2_147_483_648

# Memory size
small_int = 1
large_int = 2 ** 100
print(sys.getsizeof(small_int))  # 28 bytes
print(sys.getsizeof(large_int))  # 40 bytes (dynamically grows)
```

**In Practice**:
For ML, this means you can compute factorials, combinatorics, or cryptographic operations without overflow. However, for large array operations, use NumPy (fixed-size dtypes like int32/int64) which is faster and uses less memory. Python's arbitrary precision is for scalar math, not array computations.

**Key Takeaway**: Python integers use variable-length arrays of 30-bit digits, never overflow, but use more memory and are slower than fixed-size types in C/Java.

</details>

2. What is string interning and when does Python automatically intern strings?

<details>
<summary>Answer: Interning reuses identical string objects; Python auto-interns identifiers and short strings</summary>

**Explanation**:
String interning is storing only one copy of each distinct string value. When you create `a = "hello"` and `b = "hello"`, Python might make both variables point to the same string object in memory, saving space and making comparisons faster (`is` instead of `==`).

Python automatically interns: (1) string literals that look like identifiers (`"hello"`, `"var_name"`), (2) strings used as dict keys, (3) strings in compile-time constants. It does NOT intern strings with special characters, very long strings, or strings created at runtime via concatenation.

The reason: identifiers (variable names, function names) are used repeatedly, so interning saves memory and speeds up lookups. Dict keys benefit from interning because Python compares interned strings by address (pointer comparison) which is O(1) instead of O(n) character-by-character comparison.

**Example**:
```python
# Auto-interned (identifier-like)
a = "hello"
b = "hello"
print(a is b)  # True - same object

# Not auto-interned (has space)
c = "hello world"
d = "hello world"
print(c is d)  # False - different objects

# Explicit interning
import sys
e = sys.intern("hello world")
f = sys.intern("hello world")
print(e is f)  # True - manually interned

# Runtime concatenation - not interned
x = "hel" + "lo"
y = "hel" + "lo"
print(x is y)  # False

# Compile-time constant - interned
x = "hel" "lo"  # Concatenated at compile time
y = "hello"
print(x is y)  # True
```

**In Practice**:
For ML code, interning matters when: (1) processing large vocabularies (use `sys.intern()` for repeated words), (2) feature names in DataFrames (interned keys speed up lookups), (3) creating many objects with repeated string attributes. Don't over-use it - modern Python optimizes this automatically for common cases. Only manually intern when profiling shows string comparison is a bottleneck.

**Key Takeaway**: Python auto-interns identifier-like strings and dict keys for memory/speed; manually intern repeated runtime strings with `sys.intern()` when profiling shows benefit.

</details>

3. What's the time complexity of common operations on lists, dicts, and sets?

<details>
<summary>Answer: Lists: O(n) search/O(1) append; Dicts/Sets: O(1) average for lookup/insert/delete</summary>

**Explanation**:
**Lists** (arrays): O(1) index access `list[i]`, O(1) append, O(n) insert/delete (shifts elements), O(n) search `x in list` (linear scan), O(n log n) sort.

**Dicts** (hash tables): O(1) average for get/set/delete/contains, O(n) worst case (hash collisions), O(n) iteration. Resizes when 2/3 full (amortized O(1) insert).

**Sets** (hash tables): Same as dicts - O(1) average add/remove/contains, O(n) union/intersection (depends on set sizes).

**Tuples**: Same as lists for read operations (O(1) index, O(n) search), but immutable so no insert/delete.

Key insight: Lists are arrays (contiguous memory), Dicts/Sets are hash tables (compute hash → bucket index). Use dicts/sets for membership testing (`x in collection`), lists for ordered data.

**Example**:
```python
import time

# List - O(n) membership test
big_list = list(range(1_000_000))
start = time.time()
result = 999_999 in big_list  # Scans whole list
print(f"List search: {time.time() - start:.4f}s")  # ~0.02s

# Set - O(1) membership test
big_set = set(range(1_000_000))
start = time.time()
result = 999_999 in big_set  # Hash lookup
print(f"Set search: {time.time() - start:.6f}s")  # ~0.000001s

# Dict - O(1) key lookup
big_dict = {i: i for i in range(1_000_000)}
start = time.time()
result = big_dict.get(999_999)
print(f"Dict search: {time.time() - start:.6f}s")  # ~0.000001s

# List operations complexity
nums = [1, 2, 3, 4, 5]
nums.append(6)      # O(1)
nums.insert(0, 0)   # O(n) - shifts all elements
nums.pop()          # O(1)
nums.pop(0)         # O(n) - shifts all elements
nums.index(3)       # O(n) - linear search
```

**In Practice**:
For ML pipelines:
- **Lists**: Training data sequences, ordered predictions, batch processing
- **Sets**: Unique labels, deduplication, vocabulary building, fast membership tests
- **Dicts**: Feature mappings, config parameters, label encoding, caching

Anti-pattern: `if item in my_list` in a loop with large lists - convert to set first. Example: filtering data against a blacklist - convert blacklist to set for O(1) lookups.

**Key Takeaway**: Lists are O(n) for search/insert; Dicts/Sets are O(1) average for lookup/insert/delete; choose based on whether you need order (list) or fast lookup (dict/set).

</details>

4. How do dictionaries work internally? What is a hash table and why are dict lookups O(1)?

<details>
<summary>Answer: Dicts use hash tables - hash key to index, store in array buckets, handle collisions via open addressing</summary>

**Explanation**:
A hash table stores key-value pairs in an array. When you insert `d[key] = value`, Python: (1) computes `hash(key)` (integer), (2) uses `hash % array_size` to get array index, (3) stores key-value pair at that index. Lookup is the same process: hash the key, compute index, retrieve value.

This is O(1) because: (1) hashing is O(1), (2) modulo is O(1), (3) array access is O(1). No searching needed - the hash directly tells you where to look.

**Collisions** occur when two keys hash to the same index. Python uses "open addressing" - if slot is taken, probe nearby slots using a deterministic sequence. Dict resizes (doubles size) when 2/3 full to keep collisions rare.

Python 3.7+ maintains insertion order by storing entries in insertion order and having the hash table point to indices in the entry array. This adds slight overhead but makes dicts behave predictably.

**Example**:
```python
# Simplified hash table concept
class SimpleDict:
    def __init__(self):
        self.size = 8
        self.slots = [None] * self.size
        self.values = [None] * self.size

    def _hash(self, key):
        return hash(key) % self.size

    def set(self, key, value):
        index = self._hash(key)
        # Handle collision: linear probing
        while self.slots[index] is not None:
            if self.slots[index] == key:
                break  # Key exists, update
            index = (index + 1) % self.size  # Next slot
        self.slots[index] = key
        self.values[index] = value

    def get(self, key):
        index = self._hash(key)
        while self.slots[index] is not None:
            if self.slots[index] == key:
                return self.values[index]
            index = (index + 1) % self.size
        return None

# Real Python dict internals
d = {"a": 1, "b": 2, "c": 3}
print(hash("a"))  # e.g., 12416037344
# Python uses this hash % table_size to find index

# Why keys must be hashable
try:
    d = {[1, 2]: "value"}  # Error: list is not hashable
except TypeError as e:
    print(e)  # "unhashable type: 'list'"

# Tuples are hashable (if contents are)
d = {(1, 2): "value"}  # OK
```

**In Practice**:
For ML applications:
- **Feature mappings**: `feature_to_index = {"age": 0, "income": 1}` - O(1) lookups
- **Caching**: `cache[input_hash] = model_output` - avoid recomputation
- **Counting**: `word_counts = Counter(tokens)` - uses dict internally
- **Label encoding**: `label_to_id = {"cat": 0, "dog": 1}`

Memory note: Dicts use ~2-3x more memory than the data alone (hash table overhead). For huge datasets, consider alternatives like pandas DataFrames (column-oriented) or databases.

**Key Takeaway**: Dicts use hash tables - hash key to array index for O(1) lookup; keys must be immutable/hashable; resizes to keep collisions rare.

</details>

5. Why can't lists be dictionary keys but tuples can?

<details>
<summary>Answer: Dict keys must be immutable (hashable); lists are mutable, tuples are immutable</summary>

**Explanation**:
Dictionary keys must be **hashable** - they need a consistent hash value that never changes. Lists are mutable (you can append, remove, modify elements), so their content can change. If Python allowed lists as keys, you could: (1) use list as key, (2) modify the list, (3) the hash changes, (4) the dict can't find the key anymore - broken!

Tuples are immutable - once created, their contents never change. Python can compute a hash once and trust it forever. However, tuples containing mutable objects (like lists) aren't hashable either: `(1, [2, 3])` can't be a key because the inner list could change.

Technically, objects are hashable if they implement `__hash__()` and `__eq__()` methods, and their hash never changes during their lifetime. Immutable types (int, str, tuple of immutables) are hashable. Mutable types (list, dict, set) are not.

**Example**:
```python
# Lists are not hashable - can't be dict keys
try:
    d = {[1, 2]: "value"}
except TypeError as e:
    print(e)  # "unhashable type: 'list'"

# Tuples are hashable - can be keys
d = {(1, 2): "value"}  # OK
print(d[(1, 2)])  # "value"

# Why lists can't be keys - they're mutable
my_list = [1, 2]
# If this worked:
# d = {my_list: "value"}
# my_list.append(3)  # Now [1, 2, 3]
# d[my_list]  # Would fail - hash changed!

# Tuple with mutable content - not hashable!
try:
    d = {(1, [2, 3]): "value"}
except TypeError as e:
    print(e)  # "unhashable type: 'list'"

# Solution: convert list to tuple
key = tuple([1, 2, 3])
d = {key: "value"}  # OK

# Or use frozenset (immutable set)
key = frozenset([1, 2, 3])
d = {key: "value"}  # OK
```

**In Practice**:
For ML use cases:
- **Multi-dimensional indices**: Use tuples as keys: `cache[(x, y, z)] = result`
- **Feature combinations**: `feature_pairs = {("age", "income"): correlation}`
- **Graph nodes**: `graph = {("A", "B"): edge_weight}`

If you need list-like keys, convert to tuples. If you need set-like keys, use `frozenset`. If you really need mutable keys, use a list of pairs: `[(key, value), ...]` or assign unique IDs to mutable objects and use IDs as keys.

**Key Takeaway**: Lists are mutable (hash can change), so they can't be dict keys; tuples are immutable (hash is stable), so they can be keys - same for any hashable immutable type.

</details>

6. What happens to memory when you create a list slice `my_list[1:3]` - is it a view or a copy?

<details>
<summary>Answer: List slices create shallow copies (new list, same objects); NumPy creates views</summary>

**Explanation**:
Python list slices **create new list objects** (copies), not views. When you do `new_list = my_list[1:3]`, Python allocates a new list and copies references to the elements. The list structure is new, but the elements themselves are shared (shallow copy). Modifying the new list doesn't affect the original list structure, but modifying mutable elements (like inner lists) affects both.

This is different from NumPy arrays, where slices create **views** (no copy) - modifying a slice modifies the original. Python chose copying for lists because it's simpler and avoids surprising bugs from shared state.

Memory impact: Slicing large lists duplicates the list structure (~28 bytes + 8 bytes per element), which can be expensive. For large data, use iterators (`itertools.islice`) or NumPy arrays.

**Example**:
```python
# List slice = copy
original = [1, 2, 3, 4, 5]
sliced = original[1:4]  # [2, 3, 4]

sliced[0] = 99  # Modify slice
print(original)  # [1, 2, 3, 4, 5] - unchanged
print(sliced)    # [99, 3, 4]

# But elements are shared (shallow copy)
original = [[1, 2], [3, 4], [5, 6]]
sliced = original[1:3]  # [[3, 4], [5, 6]]

sliced[0][0] = 99  # Modify inner list
print(original)  # [[1, 2], [99, 4], [5, 6]] - inner list changed!

# Memory cost
import sys
big_list = list(range(1_000_000))
print(sys.getsizeof(big_list))  # ~8 MB

sliced = big_list[::2]  # Every other element
print(sys.getsizeof(sliced))  # ~4 MB - new list

# NumPy - slices are VIEWS (no copy)
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
view = arr[1:4]  # View, not copy

view[0] = 99
print(arr)  # [1, 99, 3, 4, 5] - original changed!

# Explicit copy in NumPy
copy = arr[1:4].copy()
copy[0] = 77
print(arr)  # [1, 99, 3, 4, 5] - unchanged
```

**In Practice**:
For ML pipelines:
- **Python lists**: Slicing training data creates copies - OK for small datasets, expensive for large
- **NumPy arrays**: Slicing creates views - fast and memory-efficient, but watch for unintended mutations
- **Pandas DataFrames**: `.loc[]/.iloc[]` can return views or copies depending on context - use `.copy()` to be explicit

Rule of thumb: If memory is tight, use NumPy arrays (views). If you need independence, Python lists (copies) or explicit `.copy()`. Check with `arr.base` (NumPy) - if not None, it's a view.

**Key Takeaway**: Python list slices create shallow copies (new list, shared elements); NumPy slices create views (shared memory) - very different memory behavior.

</details>

**Production Scenarios**:

1. How do you optimize memory usage when working with large lists in ML pipelines?

<details>
<summary>Answer: Use generators, NumPy arrays, chunking, and memory profiling; avoid copies</summary>

**Explanation**:
Large lists in Python consume significant memory: each element is a pointer (8 bytes) plus object overhead (~28 bytes for int). A list of 1M integers uses ~36 MB just for the list structure, plus memory for the integer objects. Optimize by: (1) using generators instead of lists for one-pass iteration, (2) switching to NumPy arrays (fixed-size types, less overhead), (3) processing data in chunks, (4) using `__slots__` for custom objects, (5) profiling with `memory_profiler`.

Generators yield items one at a time without storing the whole sequence. NumPy arrays use contiguous C arrays with fixed-size types (4 bytes for int32 vs 28 bytes for Python int). Chunking processes data in batches, keeping only one chunk in memory at a time.

**Example**:
```python
import sys
import numpy as np

# Problem: Large list in memory
data = list(range(1_000_000))
print(f"List memory: {sys.getsizeof(data) / 1024 / 1024:.2f} MB")  # ~8 MB

# Solution 1: Generator (no memory for data)
data_gen = (x for x in range(1_000_000))
print(f"Generator memory: {sys.getsizeof(data_gen)} bytes")  # ~200 bytes

# Solution 2: NumPy array (fixed-size types)
data_np = np.arange(1_000_000, dtype=np.int32)
print(f"NumPy memory: {data_np.nbytes / 1024 / 1024:.2f} MB")  # ~4 MB

# Solution 3: Chunking for large files
def process_in_chunks(filename, chunk_size=1000):
    with open(filename) as f:
        while True:
            chunk = [f.readline() for _ in range(chunk_size)]
            chunk = [line for line in chunk if line]  # Remove empty
            if not chunk:
                break
            yield chunk  # Process one chunk at a time

# Solution 4: __slots__ for custom objects
class PointWithSlots:
    __slots__ = ['x', 'y', 'z']  # No __dict__
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

class PointNormal:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

p1 = PointNormal(1, 2, 3)
p2 = PointWithSlots(1, 2, 3)
print(f"Normal: {sys.getsizeof(p1.__dict__)} bytes")  # ~232 bytes
print(f"Slots: {sys.getsizeof(p2)} bytes")  # ~64 bytes
```

**In Practice**:
ML pipeline optimization strategies:
1. **Data loading**: Use generators for large datasets: `(process(line) for line in file)`
2. **Preprocessing**: Switch to NumPy/Pandas early - operations are vectorized and memory-efficient
3. **Feature extraction**: Process in batches, don't load entire dataset at once
4. **Memory profiling**: Use `@profile` decorator from `memory_profiler` to find hotspots

Example: Processing 1GB CSV:
```python
# Bad: Load everything
df = pd.read_csv("huge.csv")  # Loads 1GB into memory

# Good: Chunk processing
for chunk in pd.read_csv("huge.csv", chunksize=10000):
    processed = preprocess(chunk)
    save_to_disk(processed)
```

**Key Takeaway**: Use generators for iteration, NumPy for numerical data, chunk processing for large files, and profile memory to find bottlenecks - avoid creating large lists.

</details>

2. When should you use NumPy arrays instead of Python lists for numerical data?

<details>
<summary>Answer: Use NumPy for numerical operations, large datasets, vectorization, and performance; lists for mixed types and small data</summary>

**Explanation**:
Use **NumPy** when: (1) data is homogeneous (all same type), (2) doing mathematical operations, (3) dataset is large, (4) need vectorization (operations on entire arrays), (5) memory efficiency matters, (6) interfacing with ML libraries (they expect NumPy).

Use **Lists** when: (1) mixed types (e.g., `[1, "text", 3.14]`), (2) small datasets (overhead not worth it), (3) need dynamic resizing (append/remove frequently), (4) nested data structures with varying sizes.

NumPy arrays are 10-100x faster for numerical operations because: (1) contiguous memory (cache-friendly), (2) operations in C (no Python interpreter overhead), (3) vectorized (no loops in Python), (4) fixed-size types (int32 = 4 bytes vs Python int = 28+ bytes).

**Example**:
```python
import numpy as np
import time

# Performance comparison
size = 1_000_000

# Python lists
list_a = list(range(size))
list_b = list(range(size))

start = time.time()
list_c = [a + b for a, b in zip(list_a, list_b)]
print(f"Lists: {time.time() - start:.4f}s")  # ~0.2s

# NumPy arrays
arr_a = np.arange(size)
arr_b = np.arange(size)

start = time.time()
arr_c = arr_a + arr_b  # Vectorized operation
print(f"NumPy: {time.time() - start:.6f}s")  # ~0.003s (60x faster!)

# Memory comparison
import sys
print(f"List memory: {sys.getsizeof(list_a) / 1024 / 1024:.2f} MB")  # ~8 MB
print(f"NumPy memory: {arr_a.nbytes / 1024 / 1024:.2f} MB")  # ~8 MB (int64)

arr_a_int32 = np.arange(size, dtype=np.int32)
print(f"NumPy int32: {arr_a_int32.nbytes / 1024 / 1024:.2f} MB")  # ~4 MB

# When to use lists: mixed types
mixed = [1, "text", 3.14, None, [1, 2]]  # OK with lists
# NumPy would require object dtype (slow, no type safety)

# When to use NumPy: vectorized operations
data = np.array([1, 2, 3, 4, 5])
normalized = (data - data.mean()) / data.std()  # Vectorized
# List equivalent requires comprehension or loop
```

**In Practice**:
ML pipeline decision matrix:
- **Loading CSV data**: pandas (uses NumPy underneath) → `pd.read_csv()`
- **Preprocessing**: NumPy for numerical ops, lists for collecting variable-length data
- **Model input**: Always NumPy arrays (scikit-learn, PyTorch, TensorFlow expect NumPy)
- **Small config/metadata**: Lists/dicts (readability over performance)

Rule of thumb: If you're writing loops over numbers, you should be using NumPy. If you're doing math, use NumPy. If you're collecting heterogeneous data, use lists.

**Key Takeaway**: Use NumPy for numerical operations and large datasets (10-100x faster, less memory); use lists for mixed types and small collections where flexibility matters.

</details>

3. What's the performance difference between list comprehensions and generator expressions?

<details>
<summary>Answer: Comprehensions build full list in memory; generators yield one item at a time (lazy); use generators for large data</summary>

**Explanation**:
**List comprehensions** `[x for x in ...]` create the entire list in memory upfront. **Generator expressions** `(x for x in ...)` yield items one at a time on demand (lazy evaluation). Memory: comprehension uses O(n), generator uses O(1). Speed: comprehension is faster for small datasets (optimized C loop), generator avoids building the list.

Use list comprehensions when: (1) need the full list, (2) data fits in memory, (3) will iterate multiple times, (4) need indexing/slicing. Use generators when: (1) large datasets, (2) one-pass iteration, (3) chaining operations, (4) memory-constrained.

Generators are especially powerful with `itertools` and chaining: `(process(x) for x in (filter(y) for y in data))` - processes one item through the entire pipeline without intermediate lists.

**Example**:
```python
import sys
import time

# List comprehension - full list in memory
squares_list = [x**2 for x in range(1_000_000)]
print(f"List size: {sys.getsizeof(squares_list) / 1024 / 1024:.2f} MB")  # ~8 MB
print(f"First item: {squares_list[0]}")  # Can index

# Generator expression - lazy evaluation
squares_gen = (x**2 for x in range(1_000_000))
print(f"Generator size: {sys.getsizeof(squares_gen)} bytes")  # ~200 bytes
# print(squares_gen[0])  # Error: generators don't support indexing

# Performance: one-pass iteration
start = time.time()
total = sum([x**2 for x in range(1_000_000)])
print(f"List comp: {time.time() - start:.4f}s")  # ~0.08s

start = time.time()
total = sum((x**2 for x in range(1_000_000)))
print(f"Generator: {time.time() - start:.4f}s")  # ~0.08s (similar for one-pass)

# But generator saves memory!
# When you need the list multiple times:
data = [x**2 for x in range(1000)]
print(sum(data))  # Use multiple times
print(max(data))

# When one-pass is enough:
data = (x**2 for x in range(1_000_000))
print(sum(data))  # Use once, then exhausted

# Chaining operations - generators shine
def process_pipeline(filename):
    lines = (line.strip() for line in open(filename))  # Generator
    non_empty = (line for line in lines if line)  # Generator
    numbers = (float(line) for line in non_empty)  # Generator
    return sum(numbers)  # Only final sum in memory
```

**In Practice**:
ML pipeline patterns:
```python
# Bad: Multiple intermediate lists
data = load_data()
filtered = [x for x in data if x > 0]
normalized = [x / max(filtered) for x in filtered]
processed = [transform(x) for x in normalized]

# Good: Generator pipeline
data = load_data()
pipeline = (transform(x / max_val)
            for x in (x for x in data if x > 0))
# Or use itertools
from itertools import chain, islice
processed = islice((transform(x) for x in data), 1000)  # First 1000

# When to use list comp: Need full result
train_data = [preprocess(x) for x in dataset]  # Need entire list
model.fit(train_data)  # Sklearn needs array-like

# When to use generator: One-pass processing
for batch in (data[i:i+32] for i in range(0, len(data), 32)):
    model.train_on_batch(batch)  # Process one batch at a time
```

**Key Takeaway**: List comprehensions build full list (fast for small data, multiple iterations); generators yield lazily (memory-efficient for large data, one-pass) - choose based on memory constraints and usage pattern.

</details>

4. How do you handle missing values (None) in data preprocessing pipelines?

<details>
<summary>Answer: Detect with `is None` checks; impute, drop, or use sentinel values; pandas provides built-in methods</summary>

**Explanation**:
Missing values appear as `None` in Python lists or `NaN` in NumPy/pandas. Handle by: (1) **dropping** rows/columns with missing data, (2) **imputing** (fill with mean, median, mode, forward-fill, or model prediction), (3) **using sentinel values** (e.g., -1 for categorical, 0 for numerical), (4) **keeping as-is** if model handles missing values.

Python: Use `is None` (not `== None`) for checks. NumPy: Use `np.isnan()` for NaN checks. Pandas: Use `.isna()`, `.fillna()`, `.dropna()` methods (most convenient).

Strategy depends on: (1) How much data is missing, (2) Why it's missing (random vs systematic), (3) Model requirements (some handle NaN, some don't), (4) Domain knowledge (appropriate default value).

**Example**:
```python
import numpy as np
import pandas as pd

# Python lists - None handling
data = [1, 2, None, 4, None, 6]

# Drop None values
clean = [x for x in data if x is not None]
print(clean)  # [1, 2, 4, 6]

# Impute with mean (careful with None!)
values = [x for x in data if x is not None]
mean_val = sum(values) / len(values)
imputed = [x if x is not None else mean_val for x in data]
print(imputed)  # [1, 2, 3.25, 4, 3.25, 6]

# NumPy - NaN handling
arr = np.array([1.0, 2.0, np.nan, 4.0, np.nan, 6.0])

# Check for NaN
print(np.isnan(arr))  # [False, False, True, False, True, False]

# Drop NaN
clean = arr[~np.isnan(arr)]
print(clean)  # [1. 2. 4. 6.]

# Impute with mean
mean_val = np.nanmean(arr)  # Ignores NaN
arr_imputed = np.where(np.isnan(arr), mean_val, arr)
print(arr_imputed)  # [1.  2.  3.25 4.  3.25 6. ]

# Pandas - most convenient
df = pd.DataFrame({
    'feature1': [1, 2, None, 4, None, 6],
    'feature2': [10, None, 30, None, 50, 60],
    'label': [0, 1, 0, 1, 0, 1]
})

# Check missing
print(df.isna().sum())  # Count per column

# Drop rows with any missing
clean = df.dropna()

# Drop columns with >50% missing
threshold = len(df) * 0.5
clean = df.dropna(axis=1, thresh=threshold)

# Impute strategies
df_imputed = df.copy()
df_imputed['feature1'].fillna(df['feature1'].mean(), inplace=True)  # Mean
df_imputed['feature2'].fillna(df['feature2'].median(), inplace=True)  # Median
df_imputed.fillna(method='ffill', inplace=True)  # Forward fill
df_imputed.fillna(0, inplace=True)  # Constant
```

**In Practice**:
ML preprocessing pipeline:
```python
import pandas as pd
from sklearn.impute import SimpleImputer

# Load data
df = pd.read_csv('data.csv')

# Strategy 1: Drop if <5% missing
if df.isna().sum().sum() / df.size < 0.05:
    df = df.dropna()

# Strategy 2: Impute numerical features
numerical_cols = df.select_dtypes(include=[np.number]).columns
imputer = SimpleImputer(strategy='median')
df[numerical_cols] = imputer.fit_transform(df[numerical_cols])

# Strategy 3: Impute categorical with mode
categorical_cols = df.select_dtypes(include=['object']).columns
for col in categorical_cols:
    df[col].fillna(df[col].mode()[0], inplace=True)

# Strategy 4: Create "missing" indicator feature
df['feature1_missing'] = df['feature1'].isna().astype(int)
df['feature1'].fillna(0, inplace=True)

# Strategy 5: Model-based imputation (advanced)
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
imputer = IterativeImputer()
df_imputed = imputer.fit_transform(df)
```

**Key Takeaway**: Use `is None` in Python, `np.isnan()` in NumPy, `.isna()`/`.fillna()`/`.dropna()` in pandas; choose imputation strategy based on data characteristics and domain knowledge.

</details>

5. What's the best way to merge large dictionaries efficiently?

<details>
<summary>Answer: Use `**` unpacking for small dicts; `.update()` for in-place; `|` operator (Python 3.9+) for new dict; ChainMap for view</summary>

**Explanation**:
Python offers several dict merge strategies: (1) **`{**d1, **d2}`** unpacking (Python 3.5+) creates new dict, slower for large dicts, (2) **`d1.update(d2)`** in-place update (fast, modifies d1), (3) **`d1 | d2`** union operator (Python 3.9+, creates new dict, cleanest), (4) **`ChainMap(d1, d2)`** creates view without copying, (5) **`dict(d1, **d2)`** older style (limited to string keys).

For large dicts (>10k items), `.update()` is fastest (in-place, no copy). For immutability, use `|` operator. For read-only merged view, use `ChainMap`.

**Example**:
```python
from collections import ChainMap
import time

d1 = {f"key{i}": i for i in range(100_000)}
d2 = {f"key{i}": i+1 for i in range(50_000, 150_000)}

# Method 1: ** unpacking (Python 3.5+)
start = time.time()
merged = {**d1, **d2}
print(f"Unpacking: {time.time() - start:.4f}s")  # ~0.02s

# Method 2: .update() - fastest for in-place
start = time.time()
d1_copy = d1.copy()
d1_copy.update(d2)
print(f".update(): {time.time() - start:.4f}s")  # ~0.01s

# Method 3: | operator (Python 3.9+) - cleanest
start = time.time()
merged = d1 | d2
print(f"| operator: {time.time() - start:.4f}s")  # ~0.02s

# Method 4: ChainMap - no copy (read-only view)
start = time.time()
merged_view = ChainMap(d2, d1)  # d2 takes precedence
print(f"ChainMap: {time.time() - start:.6f}s")  # ~0.0001s
print(merged_view['key75000'])  # Looks up in d2 first, then d1

# Multiple dicts
d3 = {"key": "value3"}
d4 = {"key": "value4"}

# Unpack multiple
merged = {**d1, **d2, **d3, **d4}  # d4's values win

# Chain multiple
merged = d1 | d2 | d3 | d4  # Right-most wins

# ChainMap - first dict takes precedence
merged = ChainMap(d4, d3, d2, d1)  # d4 checked first
```

**In Practice**:
ML configuration merging:
```python
# Default config
default_config = {
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100,
    "optimizer": "adam"
}

# User config (overrides)
user_config = {
    "learning_rate": 0.01,
    "epochs": 50
}

# Merge: user overrides default
config = default_config | user_config  # Python 3.9+
# Or: config = {**default_config, **user_config}

print(config)
# {
#   "learning_rate": 0.01,  # User override
#   "batch_size": 32,       # Default
#   "epochs": 50,           # User override
#   "optimizer": "adam"     # Default
# }

# Feature dictionaries - in-place update
features = {"age": 25, "income": 50000}
new_features = {"education": "PhD", "experience": 5}
features.update(new_features)  # Modifies features

# Read-only merged view (memory efficient)
from collections import ChainMap
all_configs = ChainMap(user_config, default_config)
print(all_configs["learning_rate"])  # 0.01 from user_config
```

**Key Takeaway**: Use `.update()` for in-place merging (fastest), `|` operator for new dict (Python 3.9+, cleanest), `ChainMap` for read-only view (no copy) - choose based on mutability and Python version.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#data-science) for comprehensive list

## Summary

**In 3 sentences**:
- Python has four basic types (int, float, str, bool) and four main collection types (list, tuple, dict, set), each serving different purposes
- Lists are mutable ordered sequences, tuples are immutable ordered sequences, dictionaries store key-value pairs, and sets store unique unordered elements
- Understanding when to use each type is crucial for ML: lists for sequences, dicts for configurations, sets for deduplication, and tuples for fixed data

**Key takeaway**: Python's data types are the foundation of all ML code - mastering lists, dicts, and their operations will make you productive with pandas DataFrames and numpy arrays later!
