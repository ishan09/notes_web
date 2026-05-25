# Control Flow

> **Before you start**: Do you understand Python data types? If not, review [Data Types](./02-data-types.md)

## What is Control Flow?

Control flow is **how your program makes decisions and repeats actions**. Think of it as the logic that determines which code runs and how many times. It's the "if this, then that" and "do this repeatedly" parts of programming.

**Real-world analogy**: Control flow is like a recipe with decisions. "If batter is too thick, add milk. While mixing, check for lumps. For each egg, crack into bowl." The recipe doesn't just list steps linearly - it has conditions (if), repetition (while), and iteration (for each).

## Why This Matters for AI/ML

**You'll need control flow for**:
- Data preprocessing (filter invalid data, transform features)
- Training loops (iterate over epochs and batches)
- Model evaluation (check accuracy, adjust hyperparameters)
- Feature engineering (create new features based on conditions)

**AI/ML Context**: ML code is full of control flow. Training a model: `for epoch in range(100): for batch in data: train()`. Data cleaning: `if value < 0: value = 0`. Early stopping: `if accuracy > 0.95: break`. Understanding control flow is fundamental to writing ML pipelines.

## Conditional Statements

### if, elif, else

Make decisions based on conditions.

**Basic if statement**:

```python
x = 10

if x > 0:
    print("Positive")
```

**if-else**:

```python
x = -5

if x > 0:
    print("Positive")
else:
    print("Zero or negative")
```

**if-elif-else** (multiple conditions):

```python
x = 0

if x > 0:
    print("Positive")
elif x < 0:
    print("Negative")
else:
    print("Zero")
```

**Key differences from Java**:
- No parentheses required: `if x > 0:` not `if (x > 0)`
- Use `elif` instead of `else if`
- Use `and`/`or`/`not` instead of `&&`/`||`/`!`

```python
# Java style (wrong in Python)
# if (x > 0 && x < 10) { }

# Python style
if x > 0 and x < 10:
    print("Between 0 and 10")

# More Pythonic (chained comparison)
if 0 < x < 10:
    print("Between 0 and 10")
```

**Multiple conditions**:

```python
age = 25
has_license = True

# Logical AND
if age >= 18 and has_license:
    print("Can drive")

# Logical OR
if age < 18 or not has_license:
    print("Cannot drive")

# Complex conditions
if (age >= 18 and has_license) or age >= 21:
    print("Special case")
```

**Checking membership**:

```python
# Check if value in collection
fruits = ["apple", "banana", "orange"]
if "apple" in fruits:
    print("Found apple")

# Check if NOT in collection
if "grape" not in fruits:
    print("No grape")

# Check key in dictionary
config = {"lr": 0.01, "batch_size": 32}
if "lr" in config:
    print(f"Learning rate: {config['lr']}")
```

### Ternary Operator

Concise one-line if-else.

```python
# Regular if-else
if x > 0:
    result = "positive"
else:
    result = "non-positive"

# Ternary operator (Python's conditional expression)
result = "positive" if x > 0 else "non-positive"

# More examples
age = 20
status = "adult" if age >= 18 else "minor"

# Use in assignments
max_value = a if a > b else b  # Like Math.max(a, b)

# In function calls
print("Pass" if score >= 60 else "Fail")
```

**ML use case**:

```python
# Clamp values to range
value = max_value if value > max_value else (min_value if value < min_value else value)

# Or more readable
value = max(min_value, min(value, max_value))

# Label assignment
prediction = 1 if probability > 0.5 else 0
```

## Loops

### for loops

Iterate over sequences (lists, strings, ranges, etc.).

**Basic for loop**:

```python
# Iterate over list
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)

# Iterate over string
for char in "Python":
    print(char)

# Iterate over range
for i in range(5):  # 0, 1, 2, 3, 4
    print(i)

# Range with start and end
for i in range(2, 8):  # 2, 3, 4, 5, 6, 7
    print(i)

# Range with step
for i in range(0, 10, 2):  # 0, 2, 4, 6, 8
    print(i)
```

**Python vs Java for loops**:

```java
// Java - traditional for loop
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

```python
# Python - more intuitive
for i in range(10):
    print(i)

# Python doesn't have C-style for(;;) loops
# Use while for more control
```

**Iterate with index** (enumerate):

```python
fruits = ["apple", "banana", "orange"]

# Get both index and value
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")

# Output:
# 0: apple
# 1: banana
# 2: orange

# Start index at 1
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")
```

**Iterate over dictionary**:

```python
person = {"name": "Alice", "age": 30, "city": "NYC"}

# Iterate over keys
for key in person:
    print(key)

# Iterate over values
for value in person.values():
    print(value)

# Iterate over key-value pairs
for key, value in person.items():
    print(f"{key}: {value}")
```

**Iterate over multiple lists** (zip):

```python
names = ["Alice", "Bob", "Charlie"]
ages = [25, 30, 35]
cities = ["NYC", "LA", "Chicago"]

# Zip lists together
for name, age, city in zip(names, ages, cities):
    print(f"{name} is {age} years old and lives in {city}")

# Output:
# Alice is 25 years old and lives in NYC
# Bob is 30 years old and lives in LA
# Charlie is 35 years old and lives in Chicago
```

### while loops

Repeat while condition is true.

```python
# Basic while loop
count = 0
while count < 5:
    print(count)
    count += 1

# Waiting for condition
user_input = ""
while user_input != "quit":
    user_input = input("Enter command (or 'quit'): ")
    print(f"You entered: {user_input}")

# Infinite loop (use with break)
while True:
    response = input("Continue? (y/n): ")
    if response == "n":
        break
    print("Continuing...")
```

**for vs while**:
- Use `for` when you know how many iterations (iterate over collection)
- Use `while` when you don't know (wait for condition to become true)

### Loop Control (break, continue, pass)

Control loop execution flow.

**break** - Exit loop immediately:

```python
# Find first even number
numbers = [1, 3, 5, 8, 9, 10]
for num in numbers:
    if num % 2 == 0:
        print(f"First even: {num}")
        break  # Exit loop
```

**continue** - Skip to next iteration:

```python
# Print only positive numbers
numbers = [1, -2, 3, -4, 5]
for num in numbers:
    if num < 0:
        continue  # Skip negative numbers
    print(num)

# Output: 1, 3, 5
```

**pass** - Do nothing (placeholder):

```python
# Placeholder for future code
for i in range(10):
    if i < 5:
        pass  # TODO: implement this later
    else:
        print(i)
```

**else clause** (rare but useful):

Runs if loop completes without `break`.

```python
# Search for item
items = [1, 2, 3, 4, 5]
search = 6

for item in items:
    if item == search:
        print("Found!")
        break
else:
    # Runs only if break was NOT called
    print("Not found")
```

## Comprehensions

Concise way to create collections from loops.

**List comprehensions**:

```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x**2)

# List comprehension (one line!)
squares = [x**2 for x in range(10)]

# With condition
even_squares = [x**2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]

# Transform strings
names = ["alice", "bob", "charlie"]
upper_names = [name.upper() for name in names]
# ['ALICE', 'BOB', 'CHARLIE']
```

**Dictionary comprehensions**:

```python
# Create dictionary
numbers = [1, 2, 3, 4, 5]
squares_dict = {x: x**2 for x in numbers}
# {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}

# Filter and transform
words = ["apple", "banana", "avocado", "berry"]
a_words = {word: len(word) for word in words if word.startswith("a")}
# {'apple': 5, 'avocado': 7}
```

**Set comprehensions**:

```python
# Create set (unique values)
numbers = [1, 2, 2, 3, 3, 3, 4]
unique_squares = {x**2 for x in numbers}
# {1, 4, 9, 16}
```

**Nested comprehensions**:

```python
# Flatten nested list
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [num for row in matrix for num in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Create multiplication table
table = [[i*j for j in range(1, 6)] for i in range(1, 6)]
# [[1,2,3,4,5], [2,4,6,8,10], ...]
```

**ML preprocessing examples**:

```python
# Normalize data
data = [10, 20, 30, 40, 50]
max_val = max(data)
normalized = [x / max_val for x in data]
# [0.2, 0.4, 0.6, 0.8, 1.0]

# Filter outliers
values = [1, 2, 100, 3, 4, 200, 5]
filtered = [x for x in values if x < 50]
# [1, 2, 3, 4, 5]

# One-hot encode labels
labels = [0, 1, 0, 2, 1]
unique = sorted(set(labels))
one_hot = [[1 if x == label else 0 for x in unique] for label in labels]
# [[1,0,0], [0,1,0], [1,0,0], [0,0,1], [0,1,0]]
```

## Try It

**Exercise 1**: Conditional statements

```python
# Check if number is positive, negative, or zero
num = 10
if num > 0:
    print("Positive")
elif num < 0:
    print("Negative")
else:
    print("Zero")

# Ternary operator
result = "Even" if num % 2 == 0 else "Odd"
print(result)

# Multiple conditions
age = 25
if age >= 18 and age < 65:
    print("Working age")
```

**Exercise 2**: Loops

```python
# For loop with range
for i in range(5):
    print(f"Iteration {i}")

# Iterate over list
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)

# Enumerate for index
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")

# While loop
count = 0
while count < 3:
    print(count)
    count += 1
```

**Exercise 3**: Comprehensions

```python
# List comprehension
squares = [x**2 for x in range(10)]
print(squares)

# With condition
evens = [x for x in range(20) if x % 2 == 0]
print(evens)

# Dictionary comprehension
square_dict = {x: x**2 for x in range(5)}
print(square_dict)
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between `if/elif/else` and multiple `if` statements?
2. **Why** would you use `break` vs `continue` in a loop?
3. **When** should you use a `for` loop vs a `while` loop?
4. **How** does Python's `for` loop differ from Java's traditional for loop?
5. **Compare**: Python's `range()` vs Java's `for(int i=0; i<n; i++)`

<details>
<summary>Click to reveal answers</summary>

1. **if/elif/else chains are mutually exclusive** - only ONE block runs (first true condition). **Multiple if statements are independent** - each is checked and can all run. Example: `if x>0: ... elif x>5: ...` (only first runs), vs `if x>0: ... if x>5: ...` (both run if x>5).

2. **break exits the loop entirely**, stopping all remaining iterations. **continue skips the current iteration** and moves to the next one. Example: In `for i in range(10): if i==5: break` stops at 5. With `continue`, it skips 5 but continues to 6-9.

3. **Use for when iterating over known sequences** (lists, ranges, files) or when you know the number of iterations. **Use while when the stopping condition is dynamic** - you don't know how many iterations needed (user input, waiting for convergence, polling). For: `for i in range(100)`. While: `while accuracy < 0.95`.

4. **Python's for iterates over objects directly**, not indices. Java: `for(int i=0; i<arr.length; i++)` accesses `arr[i]`. Python: `for item in arr:` gives you the item directly. Python's for is like Java's enhanced for-each: `for(String item : arr)`. Python has no C-style `for(init; condition; increment)`.

5. **Both iterate over ranges, but syntax differs**. Python `range(10)` is cleaner than Java `for(int i=0; i<10; i++)`. Python: `for i in range(0, 10, 2)` (start, stop, step). Java: `for(int i=0; i<10; i+=2)`. Python's range is an object you iterate over; Java's for is a control structure with explicit init/condition/increment.

</details>

## Practice Exercises

**Level 1 - Understand**:

Try different control flow patterns in the interpreter:

```python
python3

# Conditionals
>>> x = 10
>>> if x > 5:
...     print("Greater than 5")
...

# For loop
>>> for i in range(5):
...     print(i)
...

# List comprehension
>>> squares = [x**2 for x in range(10)]
>>> print(squares)

# Break and continue
>>> for i in range(10):
...     if i == 5:
...         break
...     print(i)
...

>>> exit()
```

**Level 2 - Apply**:

Create a file `control_flow_practice.py`:

```python
# Data filtering
numbers = [1, -2, 3, -4, 5, -6, 7, -8, 9, -10]

# Filter positive numbers
positive = [num for num in numbers if num > 0]
print(f"Positive numbers: {positive}")

# Count negatives
negative_count = 0
for num in numbers:
    if num < 0:
        negative_count += 1
print(f"Negative count: {negative_count}")

# Find first number greater than 5
for num in numbers:
    if num > 5:
        print(f"First > 5: {num}")
        break

# Process data with conditions
grades = [85, 92, 78, 95, 88, 73]
for i, grade in enumerate(grades, start=1):
    if grade >= 90:
        status = "A"
    elif grade >= 80:
        status = "B"
    elif grade >= 70:
        status = "C"
    else:
        status = "F"
    print(f"Student {i}: {grade} - {status}")
```

Run it: `python3 control_flow_practice.py`

**Level 3 - Create**:

Build a data quality checker for ML datasets:

<details>
<summary>Solution</summary>

```python
# data_quality_checker.py

# Sample ML dataset
dataset = {
    "features": [
        [1.5, 2.3, None],
        [2.1, 3.5, 4.2],
        [None, 2.9, 3.7],
        [2.5, None, 4.5],
        [1.8, 2.2, 3.1]
    ],
    "labels": [0, 1, 1, None, 0]
}

print("=" * 50)
print("Data Quality Report")
print("=" * 50)

# Check for missing values in features
print("\n1. Missing Values in Features:")
missing_per_row = []
for i, row in enumerate(dataset["features"]):
    missing_count = sum(1 for val in row if val is None)
    missing_per_row.append(missing_count)
    if missing_count > 0:
        print(f"   Row {i}: {missing_count} missing value(s)")

total_missing = sum(missing_per_row)
total_values = len(dataset["features"]) * len(dataset["features"][0])
missing_percentage = (total_missing / total_values) * 100
print(f"   Total: {total_missing}/{total_values} ({missing_percentage:.1f}% missing)")

# Check for missing labels
print("\n2. Missing Labels:")
missing_labels = [i for i, label in enumerate(dataset["labels"]) if label is None]
if missing_labels:
    print(f"   Rows with missing labels: {missing_labels}")
else:
    print("   No missing labels")

# Feature statistics (excluding None)
print("\n3. Feature Statistics:")
num_features = len(dataset["features"][0])
for feat_idx in range(num_features):
    # Collect non-None values for this feature
    values = [row[feat_idx] for row in dataset["features"]
              if row[feat_idx] is not None]

    if values:
        mean = sum(values) / len(values)
        min_val = min(values)
        max_val = max(values)
        print(f"   Feature {feat_idx}: mean={mean:.2f}, min={min_val:.2f}, max={max_val:.2f}")
    else:
        print(f"   Feature {feat_idx}: All values missing!")

# Label distribution
print("\n4. Label Distribution:")
label_counts = {}
for label in dataset["labels"]:
    if label is not None:
        label_counts[label] = label_counts.get(label, 0) + 1

for label, count in sorted(label_counts.items()):
    percentage = (count / len([l for l in dataset["labels"] if l is not None])) * 100
    print(f"   Label {label}: {count} samples ({percentage:.1f}%)")

# Data quality recommendations
print("\n5. Recommendations:")
recommendations = []

if total_missing > 0:
    recommendations.append("- Impute or remove rows with missing feature values")

if missing_labels:
    recommendations.append("- Remove or relabel samples with missing labels")

# Check for class imbalance
if label_counts:
    label_values = list(label_counts.values())
    max_count = max(label_values)
    min_count = min(label_values)
    if max_count / min_count > 2:
        recommendations.append("- Address class imbalance (consider SMOTE or class weights)")

if recommendations:
    for rec in recommendations:
        print(rec)
else:
    print("   Dataset looks good!")

print("=" * 50)
```

Run it: `python3 data_quality_checker.py`

Output:
```
==================================================
Data Quality Report
==================================================

1. Missing Values in Features:
   Row 0: 1 missing value(s)
   Row 2: 1 missing value(s)
   Row 3: 1 missing value(s)
   Total: 3/15 (20.0% missing)

2. Missing Labels:
   Rows with missing labels: [3]

3. Feature Statistics:
   Feature 0: mean=1.98, min=1.50, max=2.50
   Feature 1: mean=2.72, min=2.20, max=3.50
   Feature 2: mean=3.88, min=3.10, max=4.50

4. Label Distribution:
   Label 0: 2 samples (50.0%)
   Label 1: 2 samples (50.0%)

5. Recommendations:
- Impute or remove rows with missing feature values
- Remove or relabel samples with missing labels
==================================================
```

</details>

## Common Mistakes

❌ **Mistake 1**: Using assignment `=` instead of comparison `==`

```python
# Wrong - assigns value, doesn't compare
x = 10
if x = 5:  # SyntaxError
    print("Equal")
```

✅ **Instead**: Use `==` for comparison

```python
# Correct
x = 10
if x == 5:
    print("Equal")
```

---

❌ **Mistake 2**: Modifying list while iterating

```python
# Wrong - unpredictable behavior
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    if num % 2 == 0:
        numbers.remove(num)  # Modifying while iterating!
```

✅ **Instead**: Use list comprehension or iterate over copy

```python
# Correct - list comprehension
numbers = [1, 2, 3, 4, 5]
numbers = [num for num in numbers if num % 2 != 0]

# Or iterate over copy
numbers = [1, 2, 3, 4, 5]
for num in numbers[:]:  # [:] creates copy
    if num % 2 == 0:
        numbers.remove(num)
```

---

❌ **Mistake 3**: Forgetting indentation in loops

```python
# Wrong - IndentationError
for i in range(5):
print(i)  # Not indented
```

✅ **Instead**: Properly indent loop body

```python
# Correct
for i in range(5):
    print(i)
```

---

❌ **Mistake 4**: Using `range(len())` unnecessarily

```python
# Wrong - unPythonic
fruits = ["apple", "banana", "orange"]
for i in range(len(fruits)):
    print(fruits[i])
```

✅ **Instead**: Iterate directly or use enumerate

```python
# Correct - direct iteration
for fruit in fruits:
    print(fruit)

# If you need index
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
```

---

❌ **Mistake 5**: Infinite loop without break

```python
# Wrong - infinite loop
while True:
    print("Running...")
    # No break condition!
```

✅ **Instead**: Always have exit condition

```python
# Correct
count = 0
while True:
    print("Running...")
    count += 1
    if count >= 10:
        break
```

## How This Connects

**Builds on**:
- [Data Types](./02-data-types.md) - Use types in conditions and loops
- [Syntax Basics](./01-syntax-basics.md) - Indentation crucial for control flow

**Related concepts**:
- [Functions](./04-functions.md) - Combine control flow into reusable blocks
- [Iterators & Generators](../02-intermediate/03-iterators-generators.md) - Advanced iteration patterns
- [List Comprehensions](./02-data-types.md) - Concise data transformations

**Why this matters for AI**:
- **Training loops**: `for epoch in range(100): for batch in dataloader: train()`
- **Data preprocessing**: Filter, transform, normalize data with loops and conditions
- **Model evaluation**: Iterate through test data, calculate metrics
- **Hyperparameter tuning**: Nested loops to try different configurations
- **Early stopping**: `if validation_loss stops improving: break`

**Next steps**:
- [Functions](./04-functions.md) - Package control flow logic into reusable functions

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does Python's `for` loop work with the iterator protocol? What methods does an object need to be iterable?

<details>
<summary>Answer: Objects need __iter__() and __next__(); for loop calls iter() then repeatedly calls next() until StopIteration</summary>

**Explanation**:
Python's `for` loop uses the iterator protocol, which is a two-method contract. An **iterable** object implements `__iter__()` that returns an **iterator** object. An **iterator** implements `__next__()` that returns the next item, and raises `StopIteration` when exhausted. When you write `for item in collection:`, Python internally calls `iter(collection)` to get an iterator, then repeatedly calls `next(iterator)` until `StopIteration` is raised.

This protocol allows any object to be used in `for` loops, comprehensions, and other iteration contexts. Built-in types like lists, strings, and dicts are iterable. You can create custom iterables by implementing these methods. Generators automatically implement the iterator protocol.

The separation of iterable and iterator allows multiple simultaneous iterations over the same collection - each call to `iter()` returns a new independent iterator with its own state.

**Example**:
```python
# How for loop works internally
my_list = [1, 2, 3]

# What Python does under the hood
iterator = iter(my_list)  # Calls my_list.__iter__()
try:
    while True:
        item = next(iterator)  # Calls iterator.__next__()
        print(item)
except StopIteration:
    pass  # Loop ends

# Custom iterable - countdown
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        # Return an iterator (could be self or separate object)
        return CountdownIterator(self.start)

class CountdownIterator:
    def __init__(self, start):
        self.current = start

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

# Usage - works with for loop
for num in Countdown(5):
    print(num)  # 5, 4, 3, 2, 1

# Can have multiple independent iterators
cd = Countdown(3)
iter1 = iter(cd)
iter2 = iter(cd)
print(next(iter1))  # 3
print(next(iter2))  # 3 (independent state)

# Generator - automatic iterator
def countdown_gen(start):
    while start > 0:
        yield start
        start -= 1

for num in countdown_gen(3):
    print(num)  # 3, 2, 1
```

**In Practice**:
In ML pipelines, understanding iterators lets you create memory-efficient data loaders. Instead of loading entire datasets into memory, create an iterator that yields batches on demand. PyTorch's `DataLoader` uses this pattern - it's an iterable that returns batches. You can also create custom iterables for data augmentation pipelines, infinite epoch loops, or streaming data sources.

**Key Takeaway**: For loops use the iterator protocol - `__iter__()` returns an iterator, `__next__()` yields items, `StopIteration` signals end; this allows custom iteration logic and memory-efficient data processing.

</details>

2. What happens when you modify a list while iterating over it? Why does it cause issues?

<details>
<summary>Answer: Iterator uses indices; modification shifts elements causing skipped/repeated items or infinite loops</summary>

**Explanation**:
When you modify a list during iteration, the iterator maintains an index that advances through the list. If you remove an item, all subsequent items shift left by one position, but the iterator advances to the next index - causing you to skip an element. If you insert items, the iterator might revisit elements or loop infinitely. Python doesn't raise an error immediately because the list structure allows modification, but the behavior is unpredictable.

The core issue: iterators track position (index), but modifications change what's at each position. Removing `list[i]` makes `list[i+1]` become the new `list[i]`, but the iterator moves to `i+1`, skipping the shifted element.

This is different from dictionaries where modifying during iteration raises `RuntimeError: dictionary changed size during iteration` in Python 3. Lists allow it but produce wrong results.

**Example**:
```python
# Problem: Removing items while iterating
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    if num % 2 == 0:
        numbers.remove(num)  # Modifies list
print(numbers)  # [1, 3, 5] - Correct? NO! Let's trace:

# What actually happens:
# i=0: num=1, skip
# i=1: num=2, remove 2 → [1,3,4,5], next i=2
# i=2: num=4 (was at i=3), remove 4 → [1,3,5], next i=3
# i=3: out of range, stop
# Result: [1, 3, 5] - accidentally correct, but skipped checking 3!

# Worse example:
numbers = [2, 4, 6, 8]
for num in numbers:
    numbers.remove(num)
print(numbers)  # [4, 8] - Only removed half!

# Trace:
# i=0: num=2, remove 2 → [4,6,8], next i=1
# i=1: num=6 (skipped 4!), remove 6 → [4,8], next i=2
# i=2: out of range, stop

# Adding items can cause infinite loop
numbers = [1, 2, 3]
for num in numbers:
    if num < 10:
        numbers.append(num + 1)  # Infinite loop!
    print(num)  # 1, 2, 3, 2, 3, 4, 3, 4, 5, 4...

# Dict modification - raises error (safer!)
d = {"a": 1, "b": 2, "c": 3}
try:
    for key in d:
        if key == "b":
            del d[key]
except RuntimeError as e:
    print(e)  # "dictionary changed size during iteration"
```

**Solutions**:
```python
# Solution 1: List comprehension (create new list)
numbers = [1, 2, 3, 4, 5]
numbers = [num for num in numbers if num % 2 != 0]
print(numbers)  # [1, 3, 5]

# Solution 2: Iterate over copy
numbers = [1, 2, 3, 4, 5]
for num in numbers[:]:  # [:] creates copy
    if num % 2 == 0:
        numbers.remove(num)
print(numbers)  # [1, 3, 5]

# Solution 3: Iterate backwards (indices don't shift forward)
numbers = [1, 2, 3, 4, 5]
for i in range(len(numbers) - 1, -1, -1):
    if numbers[i] % 2 == 0:
        del numbers[i]
print(numbers)  # [1, 3, 5]

# Solution 4: Collect indices, remove later
numbers = [1, 2, 3, 4, 5]
to_remove = [i for i, num in enumerate(numbers) if num % 2 == 0]
for i in reversed(to_remove):  # Reverse to avoid index shifting
    del numbers[i]
print(numbers)  # [1, 3, 5]
```

**In Practice**:
In ML data cleaning pipelines, avoid modifying lists during iteration. Use list comprehensions to filter data, or collect indices of invalid samples and remove them in a separate pass. For large datasets, use pandas `.loc[]` or boolean indexing which handle this correctly: `df = df[df['value'] > 0]`.

**Key Takeaway**: Modifying lists during iteration causes skipped/repeated elements because iterator indices don't account for shifting positions; use comprehensions or iterate over a copy.

</details>

3. What's the difference between `range()` in Python 2 vs Python 3? (Hint: memory)

<details>
<summary>Answer: Python 2 range() creates list in memory; Python 3 returns lazy range object (like xrange)</summary>

**Explanation**:
In Python 2, `range()` returned a full list in memory. `range(1000000)` created a list with 1 million integers, consuming ~8MB of RAM. Python 2 had `xrange()` which returned a lazy sequence object. In Python 3, `range()` was changed to behave like `xrange()` - it returns a range object that generates numbers on demand, using constant O(1) memory regardless of size.

The range object is an iterable that implements `__iter__()` and `__next__()`, computing values mathematically (start + step * index) instead of storing them. This is vastly more memory-efficient for large ranges. Python 3's range also supports indexing, slicing, and membership testing efficiently.

This change was one of many performance improvements in Python 3, focusing on lazy evaluation and memory efficiency. If you need an actual list, you must explicitly convert: `list(range(10))`.

**Example**:
```python
import sys

# Python 3 - range is lazy
r = range(1_000_000)
print(type(r))  # <class 'range'>
print(sys.getsizeof(r))  # 48 bytes (constant size!)

# Create list explicitly
lst = list(range(1_000_000))
print(sys.getsizeof(lst))  # ~8 MB

# Python 2 behavior (for reference, don't use)
# r = range(1000000)  # Creates full list - 8MB
# r = xrange(1000000) # Lazy - like Python 3 range

# Range objects support efficient operations
r = range(0, 100, 2)  # Even numbers 0-98
print(50 in r)  # True - O(1) membership test
print(r[10])  # 20 - O(1) indexing
print(len(r))  # 50 - O(1) length

# Slicing returns new range (no list created)
subset = r[10:20]
print(type(subset))  # <class 'range'>

# Memory comparison
import sys
big_range = range(10_000_000)
big_list = list(range(10_000_000))

print(f"Range: {sys.getsizeof(big_range)} bytes")  # 48 bytes
print(f"List: {sys.getsizeof(big_list) / 1024 / 1024:.2f} MB")  # ~76 MB

# Iteration - same speed for both
import time

start = time.time()
for i in range(1_000_000):
    pass
print(f"Range loop: {time.time() - start:.4f}s")

start = time.time()
for i in list(range(1_000_000)):
    pass
print(f"List loop: {time.time() - start:.4f}s")
# Similar speed, but range uses way less memory
```

**In Practice**:
In ML training loops, `range()` is perfect for epoch iterations: `for epoch in range(1000):`. It uses no memory regardless of epoch count. For batch processing, `range(0, len(data), batch_size)` generates batch indices without storing them. Only convert to list if you need to shuffle or manipulate indices. For large-scale data processing, always prefer range over list when possible.

**Key Takeaway**: Python 3 range() returns lazy range object using O(1) memory (not a list like Python 2); supports indexing/slicing/membership efficiently without creating lists.

</details>

4. How do list comprehensions compare to `map()` and `filter()` in terms of performance?

<details>
<summary>Answer: List comprehensions are slightly faster and more readable; map/filter return lazy iterators; use comprehensions for most cases</summary>

**Explanation**:
**List comprehensions** are usually 10-20% faster than equivalent `map()`/`filter()` for small to medium datasets because they're optimized at the bytecode level. They execute in pure C inside the interpreter with less overhead. They also create the list directly without intermediate iterator objects.

**`map()` and `filter()`** return lazy iterators (like generators), which is more memory-efficient for large datasets since they don't build the full result list. However, if you need a list anyway, `list(map(...))` adds overhead from creating the iterator then converting to list.

**Readability**: List comprehensions are more Pythonic and readable: `[x*2 for x in nums]` vs `list(map(lambda x: x*2, nums))`. The comprehension syntax is explicit and self-documenting.

**When to use map/filter**: (1) When you need lazy evaluation (large datasets), (2) when you already have a named function (no lambda needed), (3) when chaining with other itertools.

**Example**:
```python
import time

data = list(range(1_000_000))

# Performance comparison
# List comprehension
start = time.time()
result = [x * 2 for x in data]
print(f"List comp: {time.time() - start:.4f}s")  # ~0.06s

# map()
start = time.time()
result = list(map(lambda x: x * 2, data))
print(f"map(): {time.time() - start:.4f}s")  # ~0.08s

# List comp with filter
start = time.time()
result = [x * 2 for x in data if x % 2 == 0]
print(f"List comp + filter: {time.time() - start:.4f}s")  # ~0.10s

# map + filter
start = time.time()
result = list(map(lambda x: x * 2, filter(lambda x: x % 2 == 0, data)))
print(f"map + filter: {time.time() - start:.4f}s")  # ~0.12s

# Memory efficiency - map/filter are lazy
import sys

# List comprehension - full list in memory
result1 = [x * 2 for x in range(1_000_000)]
print(f"List comp size: {sys.getsizeof(result1) / 1024 / 1024:.2f} MB")  # ~8 MB

# map - iterator (lazy)
result2 = map(lambda x: x * 2, range(1_000_000))
print(f"map size: {sys.getsizeof(result2)} bytes")  # ~200 bytes

# When map shines - with named function
def square(x):
    return x ** 2

# Readable with map
result = map(square, data)

# Less readable with comprehension (but still preferred)
result = [square(x) for x in data]

# Lambda makes map ugly
result = map(lambda x: x ** 2, data)  # Unreadable

# Comprehension is clearer
result = [x ** 2 for x in data]  # Clear

# Chaining - map/filter can be elegant
from itertools import islice
result = islice(map(square, filter(lambda x: x > 0, data)), 100)
# vs
result = [square(x) for x in data if x > 0][:100]
```

**Readability comparison**:
```python
# List comprehension (Pythonic)
squares = [x**2 for x in range(10)]
evens = [x for x in range(10) if x % 2 == 0]
pairs = [(x, y) for x in range(3) for y in range(3)]

# map/filter (less readable)
squares = list(map(lambda x: x**2, range(10)))
evens = list(filter(lambda x: x % 2 == 0, range(10)))
# pairs - gets ugly with nested map
```

**In Practice**:
For ML preprocessing pipelines, use list comprehensions by default for readability and speed. Use `map()`/`filter()` when: (1) processing huge datasets where memory matters (keep as iterators), (2) you have existing functions to apply, (3) working with functional programming patterns. Example: `normalized = [preprocess(x) for x in batch]` is clearer than `normalized = list(map(preprocess, batch))`.

**Key Takeaway**: List comprehensions are faster and more readable for most cases; map/filter are lazy (memory-efficient) but slower when converted to lists - prefer comprehensions unless you need lazy evaluation.

</details>

5. What is the `else` clause in loops and when would you use it?

<details>
<summary>Answer: Loop else runs if loop completes without break; useful for search patterns to detect "not found"</summary>

**Explanation**:
Python's `for` and `while` loops can have an optional `else` clause that executes only if the loop completes normally without encountering a `break` statement. This is counterintuitive because "else" suggests "if loop didn't run," but it actually means "if loop completed without break."

The pattern is useful for search operations: iterate through a collection looking for something, break if found, else (not found) handle that case. Without the `else` clause, you'd need a flag variable to track whether the item was found.

This feature is unique to Python and often confuses newcomers. Think of it as "no-break" clause rather than "else." It works with both `for` and `while` loops.

**Example**:
```python
# Classic use case: search
numbers = [1, 2, 3, 4, 5]
search_for = 6

for num in numbers:
    if num == search_for:
        print("Found!")
        break
else:
    # Runs only if break was NOT executed
    print("Not found")
# Output: "Not found"

# Without else - need flag variable
found = False
for num in numbers:
    if num == search_for:
        print("Found!")
        found = True
        break
if not found:
    print("Not found")

# With else - cleaner
for num in numbers:
    if num == search_for:
        print("Found!")
        break
else:
    print("Not found")

# Else runs if loop completes
for i in range(3):
    print(i)
else:
    print("Loop completed")  # This runs
# Output: 0, 1, 2, "Loop completed"

# Else doesn't run if break
for i in range(3):
    if i == 1:
        break
else:
    print("This won't print")

# Works with while loops too
i = 0
while i < 5:
    if i == 10:  # Never true
        break
    i += 1
else:
    print("While completed without break")  # Runs

# Prime number checker
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False  # Found divisor
    else:
        return True  # No divisor found

print(is_prime(17))  # True
print(is_prime(18))  # False
```

**Common patterns**:
```python
# Pattern 1: Search in collection
users = [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
search_id = 3

for user in users:
    if user["id"] == search_id:
        print(f"Found: {user['name']}")
        break
else:
    print("User not found")

# Pattern 2: Validation - check all items
data = [1, 2, 3, 4, 5]
for item in data:
    if item < 0:
        print("Found invalid data")
        break
else:
    print("All data valid")

# Pattern 3: Retry loop
attempts = 0
while attempts < 3:
    if try_operation():
        print("Success!")
        break
    attempts += 1
else:
    print("Failed after 3 attempts")

# Anti-pattern: Using else when you don't need it
# Bad - confusing
for i in range(10):
    print(i)
else:
    print("Done")  # This always runs unless break

# Good - just put after loop
for i in range(10):
    print(i)
print("Done")
```

**In Practice**:
In ML pipelines, use loop-else for: (1) early stopping - search for convergence condition, else max epochs reached, (2) hyperparameter search - found optimal params, else use defaults, (3) data validation - found corrupt sample, else all clean. Example:

```python
# Early stopping
for epoch in range(max_epochs):
    train_loss = train_epoch()
    val_loss = validate()
    if val_loss < threshold:
        print(f"Converged at epoch {epoch}")
        break
else:
    print("Reached max epochs without convergence")

# Find best hyperparameter
for lr in learning_rates:
    accuracy = test_model(lr)
    if accuracy > target_accuracy:
        print(f"Found optimal LR: {lr}")
        best_lr = lr
        break
else:
    best_lr = default_lr
    print(f"Using default LR: {default_lr}")
```

**Key Takeaway**: Loop else executes only if loop completes without break (not if loop doesn't run); useful for search patterns to distinguish "found" vs "not found" without flag variables.

</details>

6. What's the time complexity of `x in list` vs `x in set` in a loop?

<details>
<summary>Answer: list is O(n) linear scan; set is O(1) average hash lookup - 1000x+ difference for large collections</summary>

**Explanation**:
**List membership** (`x in my_list`) performs a linear scan - it checks each element sequentially until found or end is reached. Time complexity: O(n) where n is list length. For a list of 1 million items, worst case is 1 million comparisons.

**Set membership** (`x in my_set`) uses a hash table - it computes `hash(x)`, finds the bucket, and checks if the item is there. Time complexity: O(1) average case (O(n) worst case with hash collisions, but rare). Same 1 million item set: just 1 hash computation and bucket lookup.

The performance difference is massive for large collections. If you're doing membership testing in a loop, converting a list to a set first (O(n)) saves time if you do more than 1 lookup. For 1000 lookups in a 1000-item list: O(1000 * 1000) = O(1,000,000) operations. With set: O(1000) to build set + O(1000 * 1) = O(2000) operations - 500x faster!

**Example**:
```python
import time

# Setup
big_list = list(range(100_000))
big_set = set(range(100_000))
lookups = [50_000, 75_000, 99_999, 100_001]  # Some in, some not

# List - O(n) per lookup
start = time.time()
for item in lookups:
    result = item in big_list  # Linear scan each time
print(f"List lookup: {time.time() - start:.6f}s")  # ~0.01s

# Set - O(1) per lookup
start = time.time()
for item in lookups:
    result = item in big_set  # Hash lookup each time
print(f"Set lookup: {time.time() - start:.6f}s")  # ~0.000001s

# Detailed comparison
sizes = [100, 1_000, 10_000, 100_000]
for size in sizes:
    test_list = list(range(size))
    test_set = set(range(size))
    search = size - 1  # Worst case - at end

    start = time.time()
    result = search in test_list
    list_time = time.time() - start

    start = time.time()
    result = search in test_set
    set_time = time.time() - start

    print(f"Size {size:6}: List={list_time:.6f}s, Set={set_time:.6f}s, "
          f"Speedup={list_time/set_time:.0f}x")

# Output (approximate):
# Size    100: List=0.000002s, Set=0.000001s, Speedup=2x
# Size   1000: List=0.000020s, Set=0.000001s, Speedup=20x
# Size  10000: List=0.000200s, Set=0.000001s, Speedup=200x
# Size 100000: List=0.002000s, Set=0.000001s, Speedup=2000x

# When to convert list to set
blacklist_list = [1, 5, 10, 15, 20]  # Small blacklist
data = range(1000)  # Large data

# Bad - repeated linear scans
filtered = [x for x in data if x not in blacklist_list]
# Each lookup is O(5), total O(1000 * 5) = O(5000)

# Good - convert to set first
blacklist_set = set(blacklist_list)  # O(5)
filtered = [x for x in data if x not in blacklist_set]
# Each lookup is O(1), total O(5 + 1000) = O(1005) - 5x faster

# Tipping point - when is conversion worth it?
# If doing N lookups in a list of size M:
# List: O(N * M)
# Set: O(M) to convert + O(N) lookups = O(M + N)
# Set wins when: N * M > M + N
# Simplifies to: N > 1 + 1/M
# For M=1000: N > 1.001 (almost always worth it!)
```

**Real-world ML example**:
```python
# Bad - O(n*m) - very slow for large datasets
def filter_invalid_samples(data, invalid_ids):
    """data: 1M samples, invalid_ids: 10k ids"""
    return [sample for sample in data
            if sample['id'] not in invalid_ids]
# Time: 1M * 10k = 10 billion comparisons!

# Good - O(m + n) - much faster
def filter_invalid_samples(data, invalid_ids):
    invalid_set = set(invalid_ids)  # O(10k)
    return [sample for sample in data
            if sample['id'] not in invalid_set]  # O(1M)
# Time: 10k + 1M = ~1M operations - 10,000x faster!

# Practical example
import time

# Simulate ML data filtering
data = [{'id': i, 'value': i*2} for i in range(100_000)]
invalid_ids = list(range(0, 100_000, 10))  # Every 10th ID

# Method 1: List (slow)
start = time.time()
filtered = [s for s in data if s['id'] not in invalid_ids]
print(f"List filtering: {time.time() - start:.4f}s")  # ~1.5s

# Method 2: Set (fast)
start = time.time()
invalid_set = set(invalid_ids)
filtered = [s for s in data if s['id'] not in invalid_set]
print(f"Set filtering: {time.time() - start:.4f}s")  # ~0.02s
# 75x faster!
```

**In Practice**:
Always convert lists to sets for membership testing if: (1) doing more than 1-2 lookups, (2) list size > 10, (3) inside a loop. Common pattern in ML: filtering data against blacklists, checking valid labels, removing seen samples. Convert once, reuse many times. Exception: very small lists (<5 items) where set conversion overhead isn't worth it.

**Key Takeaway**: List membership is O(n) linear scan; set membership is O(1) hash lookup - convert lists to sets before repeated lookups for 100-1000x+ speedup on large data.

</details>

**Production Scenarios**:

1. How do you optimize nested loops in data processing pipelines?

<details>
<summary>Answer: Vectorize with NumPy, use broadcasting, cache inner computations, reduce nesting levels, or parallelize</summary>

**Explanation**:
Nested loops in Python are slow because of interpreter overhead - each iteration has Python bytecode execution cost. Optimization strategies: (1) **Vectorize** - replace loops with NumPy array operations that execute in C, (2) **Broadcasting** - let NumPy handle dimension matching automatically, (3) **Cache** - precompute inner loop values if they don't depend on outer loop, (4) **Reduce nesting** - flatten loops or use itertools, (5) **Numba JIT** - compile to machine code, (6) **Parallelize** - use multiprocessing for CPU-bound tasks.

The most effective is vectorization - converting nested loops to NumPy operations typically gives 10-100x speedups. For truly unavoidable nested loops, Numba JIT compilation can give 100x+ speedups.

**Example**:
```python
import numpy as np
import time
from numba import jit

# Problem: Pairwise distance calculation
points_a = np.random.rand(1000, 3)  # 1000 points, 3D
points_b = np.random.rand(1000, 3)

# Method 1: Nested Python loops (SLOW)
def pairwise_distances_slow(a, b):
    n, m = len(a), len(b)
    distances = np.zeros((n, m))
    for i in range(n):
        for j in range(m):
            # Euclidean distance
            distances[i, j] = np.sqrt(np.sum((a[i] - b[j])**2))
    return distances

start = time.time()
dist1 = pairwise_distances_slow(points_a, points_b)
print(f"Nested loops: {time.time() - start:.4f}s")  # ~2.5s

# Method 2: NumPy broadcasting (FAST)
def pairwise_distances_vectorized(a, b):
    # a: (n, 3), b: (m, 3)
    # Expand dims: a -> (n, 1, 3), b -> (1, m, 3)
    # Broadcasting creates (n, m, 3)
    diff = a[:, np.newaxis, :] - b[np.newaxis, :, :]
    distances = np.sqrt(np.sum(diff**2, axis=2))
    return distances

start = time.time()
dist2 = pairwise_distances_vectorized(points_a, points_b)
print(f"Vectorized: {time.time() - start:.6f}s")  # ~0.02s - 125x faster!

# Method 3: Numba JIT (for complex logic)
@jit(nopython=True)
def pairwise_distances_numba(a, b):
    n, m = a.shape[0], b.shape[0]
    distances = np.zeros((n, m))
    for i in range(n):
        for j in range(m):
            total = 0.0
            for k in range(a.shape[1]):
                diff = a[i, k] - b[j, k]
                total += diff * diff
            distances[i, j] = np.sqrt(total)
    return distances

start = time.time()
dist3 = pairwise_distances_numba(points_a, points_b)
print(f"Numba JIT: {time.time() - start:.6f}s")  # ~0.01s - 250x faster!

# Optimization technique 1: Cache inner computations
# Bad - recompute every iteration
for i in range(1000):
    for j in range(1000):
        result = expensive_function() * i * j  # Recomputed!

# Good - cache if doesn't depend on loop vars
cached = expensive_function()
for i in range(1000):
    for j in range(1000):
        result = cached * i * j

# Optimization technique 2: Reduce nesting
# Bad - triple nested
matrix = []
for i in range(n):
    row = []
    for j in range(m):
        value = 0
        for k in range(p):
            value += a[i][k] * b[k][j]
        row.append(value)
    matrix.append(row)

# Good - matrix multiplication (built-in)
matrix = np.dot(a, b)  # 1000x faster

# Optimization technique 3: Use built-in functions
# Bad - nested loops for filtering
result = []
for item in data1:
    for item2 in data2:
        if condition(item, item2):
            result.append(process(item, item2))

# Good - list comprehension (faster)
result = [process(item, item2)
          for item in data1
          for item2 in data2
          if condition(item, item2)]

# Better - itertools for large data
from itertools import product
result = [process(i, j)
          for i, j in product(data1, data2)
          if condition(i, j)]
```

**ML-specific examples**:
```python
# Feature engineering - pairwise features
# Bad - nested loops
features = []
for i in range(len(data)):
    for j in range(i+1, len(data)):
        features.append(compute_similarity(data[i], data[j]))

# Good - vectorized
from scipy.spatial.distance import pdist
features = pdist(data, metric='cosine')  # 100x faster

# Batch processing - nested batches
# Bad - nested loops
for epoch in range(num_epochs):
    for batch in data_loader:
        for sample in batch:
            process_sample(sample)  # Too slow!

# Good - vectorized batch processing
for epoch in range(num_epochs):
    for batch in data_loader:
        process_batch(batch)  # NumPy/Torch operations

# Grid search - nested parameter loops
# Bad - sequential nested loops
best_score = 0
for lr in learning_rates:
    for batch_size in batch_sizes:
        for hidden_size in hidden_sizes:
            score = train_model(lr, batch_size, hidden_size)
            if score > best_score:
                best_score = score

# Good - use sklearn GridSearchCV (parallelized)
from sklearn.model_selection import GridSearchCV
param_grid = {
    'learning_rate': learning_rates,
    'batch_size': batch_sizes,
    'hidden_size': hidden_sizes
}
grid_search = GridSearchCV(model, param_grid, cv=5, n_jobs=-1)
grid_search.fit(X, y)  # Parallel execution
```

**In Practice**:
For ML pipelines, optimization priority: (1) Check if NumPy/pandas has built-in function (dot, pdist, etc.), (2) Vectorize with NumPy broadcasting, (3) Use Numba JIT for complex unavoidable loops, (4) Parallelize with joblib/multiprocessing for independent iterations, (5) Last resort: rewrite in Cython or C++. Profile first to find actual bottlenecks - don't optimize prematurely.

**Key Takeaway**: Optimize nested loops by vectorizing with NumPy (10-100x faster), using broadcasting, caching computations, or JIT compilation with Numba; avoid pure Python nested loops for numerical operations.

</details>

2. When should you vectorize operations (NumPy) instead of using loops in ML code?

<details>
<summary>Answer: Vectorize for numerical operations, large arrays, math functions; use loops for complex logic, I/O, or mixed types</summary>

**Explanation**:
**Vectorize with NumPy when**: (1) performing mathematical operations (+, -, *, /, **, sqrt, exp, etc.), (2) working with homogeneous numerical arrays, (3) data size is large (>1000 elements), (4) operations can be expressed as array operations, (5) need performance (10-100x faster than loops).

**Use loops when**: (1) complex conditional logic that varies per element, (2) operations involve I/O (file reads, API calls), (3) mixed data types or nested structures, (4) early exit/break needed, (5) operations aren't vectorizable (sequential dependencies).

NumPy is fast because operations execute in compiled C code with optimized SIMD instructions, avoid Python interpreter overhead, and use contiguous memory (cache-friendly). Python loops have per-iteration overhead (bytecode dispatch, type checking, reference counting).

**Example**:
```python
import numpy as np
import time

data = np.random.rand(1_000_000)

# Example 1: Mathematical operations - VECTORIZE
# Bad - Python loop
start = time.time()
result = []
for x in data:
    result.append(x**2 + 2*x + 1)
result = np.array(result)
print(f"Loop: {time.time() - start:.4f}s")  # ~0.5s

# Good - NumPy vectorized
start = time.time()
result = data**2 + 2*data + 1
print(f"Vectorized: {time.time() - start:.6f}s")  # ~0.003s - 150x faster!

# Example 2: Conditional operations - VECTORIZE with where
# Bad - loop
result = []
for x in data:
    if x > 0.5:
        result.append(x * 2)
    else:
        result.append(x / 2)

# Good - np.where
result = np.where(data > 0.5, data * 2, data / 2)

# Example 3: Complex logic - LOOP may be better
# When each iteration has different logic
results = []
for i, value in enumerate(data):
    if i % 100 == 0:
        result = complex_function_a(value)
    elif value > threshold:
        result = complex_function_b(value)
    else:
        result = complex_function_c(value, context)
    results.append(result)
# Hard to vectorize - loop is OK here

# Example 4: Statistical operations - VECTORIZE
# Bad - loop for normalization
mean = sum(data) / len(data)
std = (sum((x - mean)**2 for x in data) / len(data))**0.5
normalized = [(x - mean) / std for x in data]

# Good - NumPy
normalized = (data - data.mean()) / data.std()

# Example 5: Matrix operations - ALWAYS vectorize
# Bad - nested loops for matrix multiply
def matmul_slow(A, B):
    n, m, p = A.shape[0], B.shape[1], A.shape[1]
    C = np.zeros((n, m))
    for i in range(n):
        for j in range(m):
            for k in range(p):
                C[i, j] += A[i, k] * B[k, j]
    return C

# Good - NumPy dot
C = np.dot(A, B)  # 1000x+ faster

# Example 6: Element-wise with different functions - VECTORIZE
# Bad - loop
result = []
for x in data:
    if x < 0.3:
        result.append(np.sin(x))
    elif x < 0.7:
        result.append(np.cos(x))
    else:
        result.append(np.tan(x))

# Good - np.select
conditions = [data < 0.3, data < 0.7]
choices = [np.sin(data), np.cos(data)]
result = np.select(conditions, choices, default=np.tan(data))
```

**ML-specific decision matrix**:
```python
# Data loading - LOOP (I/O bound)
images = []
for filename in file_list:
    img = load_image(filename)  # I/O operation
    images.append(img)

# Preprocessing - VECTORIZE
images = np.array(images)
normalized = (images - images.mean(axis=(1,2), keepdims=True)) / 255.0

# Feature extraction (simple math) - VECTORIZE
features = np.concatenate([
    images.mean(axis=(1,2)),
    images.std(axis=(1,2)),
    images.max(axis=(1,2))
], axis=1)

# Feature extraction (complex) - LOOP
features = []
for img in images:
    feat = extract_complex_features(img)  # Custom algorithm
    features.append(feat)

# Training loop - LOOP at top level, VECTORIZE inside
for epoch in range(num_epochs):
    for batch in data_loader:  # Loop over batches
        # Vectorized operations inside
        predictions = model(batch)  # Matrix ops
        loss = criterion(predictions, labels)  # Vectorized
        loss.backward()
        optimizer.step()

# Metric calculation - VECTORIZE
predictions = model(X_test)  # Vectorized
accuracy = (predictions.argmax(axis=1) == y_test).mean()  # Vectorized

# Custom metric with conditions - VECTORIZE with boolean indexing
precision = (predictions[y_test == 1] == 1).mean()
recall = (y_test[predictions == 1] == 1).mean()
```

**Performance rules of thumb**:
```python
# Rule 1: If it's math, vectorize
data_scaled = (data - data.min()) / (data.max() - data.min())  # Fast

# Rule 2: If it's conditional, use np.where/select/boolean indexing
result = np.where(data > threshold, data * 2, data / 2)  # Fast

# Rule 3: If it's aggregation, use built-in
totals = data.sum(axis=1)  # Fast
means = data.mean(axis=0)  # Fast

# Rule 4: If it's iteration-dependent, use loop
for i in range(len(sequence)):
    sequence[i] = sequence[i-1] * 0.9 + new_value[i] * 0.1  # Loop needed

# Rule 5: If vectorization makes code unreadable, profile first
# Sometimes a clear loop is better than obscure vectorization
# if the performance difference is negligible (<10% of total time)
```

**In Practice**:
In ML production code, vectorize: (1) all numerical preprocessing (normalization, scaling, encoding), (2) model forward/backward passes (always batched), (3) metric calculations, (4) feature engineering with math. Use loops for: (1) batch iteration, (2) epoch iteration, (3) file I/O, (4) complex per-sample logic that can't be vectorized. Profile to verify vectorization helps - don't make code unreadable for 5% speedup on non-bottleneck.

**Key Takeaway**: Vectorize numerical operations on arrays (10-100x faster); use loops for I/O, complex logic, or sequential dependencies; NumPy excels at math, struggles with control flow.

</details>

3. How do you implement early stopping in training loops efficiently?

<details>
<summary>Answer: Track validation metric, check patience counter, use callbacks for modularity; avoid checking every iteration</summary>

**Explanation**:
Early stopping monitors a validation metric (loss, accuracy) and stops training when it stops improving for a specified number of epochs (patience). Efficient implementation: (1) **Track best metric** and epoch, (2) **Patience counter** increments when no improvement, resets on improvement, (3) **Check at epoch end** (not every batch - too expensive), (4) **Save best model** checkpoint, (5) **Optional**: use callbacks pattern for modularity.

Key efficiency considerations: Don't validate every batch (expensive), use a patience window to avoid premature stopping from noise, restore best model weights (not final weights), consider combining with learning rate reduction.

**Example**:
```python
import numpy as np

# Basic early stopping implementation
class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.001, mode='min'):
        """
        patience: epochs to wait for improvement
        min_delta: minimum change to count as improvement
        mode: 'min' (loss) or 'max' (accuracy)
        """
        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode
        self.counter = 0
        self.best_score = None
        self.early_stop = False
        self.best_epoch = 0

    def __call__(self, current_score, epoch):
        if self.best_score is None:
            self.best_score = current_score
            self.best_epoch = epoch
            return False

        # Check if improved
        if self.mode == 'min':
            improved = current_score < (self.best_score - self.min_delta)
        else:  # max
            improved = current_score > (self.best_score + self.min_delta)

        if improved:
            self.best_score = current_score
            self.best_epoch = epoch
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True

        return self.early_stop

# Training loop with early stopping
def train_with_early_stopping(model, train_loader, val_loader,
                               max_epochs=100, patience=10):
    early_stopping = EarlyStopping(patience=patience, mode='min')
    best_model_state = None

    for epoch in range(max_epochs):
        # Training
        model.train()
        train_loss = 0
        for batch in train_loader:
            loss = train_step(model, batch)
            train_loss += loss
        train_loss /= len(train_loader)

        # Validation (only at epoch end - not every batch)
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch in val_loader:
                loss = val_step(model, batch)
                val_loss += loss
        val_loss /= len(val_loader)

        print(f"Epoch {epoch}: train_loss={train_loss:.4f}, "
              f"val_loss={val_loss:.4f}")

        # Check early stopping
        if early_stopping(val_loss, epoch):
            print(f"Early stopping at epoch {epoch}")
            print(f"Best epoch was {early_stopping.best_epoch} "
                  f"with val_loss={early_stopping.best_score:.4f}")
            break

        # Save best model
        if val_loss == early_stopping.best_score:
            best_model_state = model.state_dict().copy()

    # Restore best model
    if best_model_state is not None:
        model.load_state_dict(best_model_state)

    return model

# Advanced: Early stopping with model checkpointing
import os
import torch

class EarlyStoppingWithCheckpoint:
    def __init__(self, patience=5, min_delta=0, checkpoint_path='best_model.pt'):
        self.patience = patience
        self.min_delta = min_delta
        self.checkpoint_path = checkpoint_path
        self.counter = 0
        self.best_score = None
        self.early_stop = False

    def __call__(self, model, val_loss, epoch):
        if self.best_score is None:
            self.best_score = val_loss
            self.save_checkpoint(model, epoch)
        elif val_loss < self.best_score - self.min_delta:
            self.best_score = val_loss
            self.save_checkpoint(model, epoch)
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True

        return self.early_stop

    def save_checkpoint(self, model, epoch):
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'val_loss': self.best_score,
        }, self.checkpoint_path)

    def load_checkpoint(self, model):
        checkpoint = torch.load(self.checkpoint_path)
        model.load_state_dict(checkpoint['model_state_dict'])
        return checkpoint['epoch'], checkpoint['val_loss']

# Callback-based pattern (like Keras)
class Callback:
    def on_epoch_end(self, epoch, logs=None):
        pass

class EarlyStoppingCallback(Callback):
    def __init__(self, monitor='val_loss', patience=5):
        self.monitor = monitor
        self.patience = patience
        self.best = None
        self.wait = 0
        self.stopped_epoch = 0

    def on_epoch_end(self, epoch, logs=None):
        current = logs.get(self.monitor)
        if current is None:
            return

        if self.best is None or current < self.best:
            self.best = current
            self.wait = 0
        else:
            self.wait += 1
            if self.wait >= self.patience:
                self.stopped_epoch = epoch
                return True  # Signal to stop
        return False

# Usage with callbacks
def train_with_callbacks(model, train_loader, val_loader, callbacks=None):
    callbacks = callbacks or []

    for epoch in range(100):
        # Training
        train_loss = train_epoch(model, train_loader)
        val_loss = validate(model, val_loader)

        logs = {'train_loss': train_loss, 'val_loss': val_loss}

        # Run callbacks
        for callback in callbacks:
            if callback.on_epoch_end(epoch, logs):
                print(f"Stopping at epoch {epoch}")
                return

# Efficient validation frequency
def train_with_adaptive_validation(model, train_loader, val_loader):
    """Validate less frequently in early epochs to save time"""
    for epoch in range(100):
        train_epoch(model, train_loader)

        # Validate every N epochs
        if epoch < 10:
            val_freq = 5  # Every 5 epochs early on
        elif epoch < 50:
            val_freq = 2  # Every 2 epochs mid-training
        else:
            val_freq = 1  # Every epoch late training

        if epoch % val_freq == 0:
            val_loss = validate(model, val_loader)
            if check_early_stopping(val_loss):
                break
```

**In Practice**:
```python
# Production ML training loop
import torch
from torch.utils.tensorboard import SummaryWriter

def train_production(model, train_loader, val_loader, config):
    optimizer = torch.optim.Adam(model.parameters(), lr=config['lr'])
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', patience=3, factor=0.5
    )
    early_stopping = EarlyStoppingWithCheckpoint(
        patience=10,
        checkpoint_path='checkpoints/best_model.pt'
    )
    writer = SummaryWriter()

    for epoch in range(config['max_epochs']):
        # Training
        model.train()
        train_metrics = train_epoch(model, train_loader, optimizer)

        # Validation (not every batch - only at epoch end)
        model.eval()
        val_metrics = validate(model, val_loader)

        # Logging
        writer.add_scalar('Loss/train', train_metrics['loss'], epoch)
        writer.add_scalar('Loss/val', val_metrics['loss'], epoch)
        writer.add_scalar('LR', optimizer.param_groups[0]['lr'], epoch)

        # Learning rate scheduling
        scheduler.step(val_metrics['loss'])

        # Early stopping check
        if early_stopping(model, val_metrics['loss'], epoch):
            print(f"Early stopping triggered at epoch {epoch}")
            best_epoch, best_loss = early_stopping.load_checkpoint(model)
            print(f"Restored model from epoch {best_epoch} "
                  f"with val_loss={best_loss:.4f}")
            break

    writer.close()
    return model

# Key efficiency points:
# 1. Validate only at epoch end, not every batch
# 2. Save only best checkpoint, not all epochs
# 3. Use min_delta to avoid stopping on noise
# 4. Combine with LR scheduling for better convergence
# 5. Log metrics for debugging why it stopped
```

**Key Takeaway**: Implement early stopping by tracking validation metric at epoch end (not per batch), using patience counter with min_delta threshold; save best checkpoint and restore after stopping for optimal model.

</details>

4. What's the best way to parallelize data processing loops for large datasets?

<details>
<summary>Answer: Use multiprocessing for CPU-bound, threading for I/O-bound; joblib for simplicity, or specialized tools (Dask, Ray)</summary>

**Explanation**:
Python's Global Interpreter Lock (GIL) prevents true parallel execution of Python code in threads. Parallelization strategy depends on task type:

**CPU-bound** (computation-heavy): Use **multiprocessing** to spawn processes (bypass GIL), each with independent Python interpreter. Each core gets full CPU. Overhead: process creation, IPC serialization.

**I/O-bound** (file/network ops): Use **threading** or **asyncio** - GIL releases during I/O, allowing concurrent operations. Lower overhead than processes.

**Tools**: (1) **`multiprocessing.Pool`** - simple parallel map, (2) **`joblib.Parallel`** - easier API, better serialization, (3) **`concurrent.futures`** - modern high-level interface, (4) **Dask** - parallel pandas/numpy for huge datasets, (5) **Ray** - distributed computing framework.

**Example**:
```python
import time
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from joblib import Parallel, delayed
import numpy as np

# CPU-bound task - heavy computation
def process_sample_cpu(data):
    # Simulate heavy computation
    return np.sum(data ** 2) + np.mean(data ** 3)

# I/O-bound task - file/network operation
def process_sample_io(filename):
    # Simulate file I/O
    time.sleep(0.01)  # I/O delay
    return len(filename)

# Setup
data_samples = [np.random.rand(1000) for _ in range(100)]
filenames = [f"file_{i}.txt" for i in range(100)]

# ===== CPU-BOUND: Use multiprocessing =====

# Method 1: multiprocessing.Pool
def parallel_pool(data):
    with mp.Pool(processes=mp.cpu_count()) as pool:
        results = pool.map(process_sample_cpu, data)
    return results

start = time.time()
results = parallel_pool(data_samples)
print(f"multiprocessing.Pool: {time.time() - start:.4f}s")

# Method 2: concurrent.futures.ProcessPoolExecutor
def parallel_futures(data):
    with ProcessPoolExecutor(max_workers=mp.cpu_count()) as executor:
        results = list(executor.map(process_sample_cpu, data))
    return results

start = time.time()
results = parallel_futures(data_samples)
print(f"ProcessPoolExecutor: {time.time() - start:.4f}s")

# Method 3: joblib (preferred for simplicity)
def parallel_joblib(data):
    results = Parallel(n_jobs=-1)(
        delayed(process_sample_cpu)(sample) for sample in data
    )
    return results

start = time.time()
results = parallel_joblib(data_samples)
print(f"joblib.Parallel: {time.time() - start:.4f}s")

# ===== I/O-BOUND: Use threading =====

# Threading for I/O-bound
def parallel_threading(filenames):
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(process_sample_io, filenames))
    return results

start = time.time()
results = parallel_threading(filenames)
print(f"Threading: {time.time() - start:.4f}s")  # Much faster than processes

# ===== ML-specific: Batch processing with multiprocessing =====

def preprocess_batch_cpu(batch):
    """CPU-intensive preprocessing"""
    # Normalize
    batch = (batch - batch.mean(axis=0)) / batch.std(axis=0)
    # Feature engineering
    batch = np.concatenate([batch, batch**2, batch**3], axis=1)
    return batch

# Parallel batch processing
def parallel_batch_processing(data, batch_size=32, n_jobs=-1):
    # Split into batches
    n_samples = len(data)
    batches = [data[i:i+batch_size] for i in range(0, n_samples, batch_size)]

    # Process batches in parallel
    processed_batches = Parallel(n_jobs=n_jobs)(
        delayed(preprocess_batch_cpu)(batch) for batch in batches
    )

    # Concatenate results
    return np.vstack(processed_batches)

# Usage
large_dataset = np.random.rand(10000, 50)
start = time.time()
processed = parallel_batch_processing(large_dataset)
print(f"Parallel batch: {time.time() - start:.4f}s")

# ===== Advanced: Dask for huge datasets =====
import dask.array as da
import dask.dataframe as dd

# Dask array - lazy parallel NumPy
large_array = da.from_delayed([
    delayed(np.random.rand)(10000, 100) for _ in range(100)
], shape=(1_000_000, 100), dtype=float)

# Operations are lazy
normalized = (large_array - large_array.mean(axis=0)) / large_array.std(axis=0)

# Compute in parallel
start = time.time()
result = normalized.compute(scheduler='threads')
print(f"Dask: {time.time() - start:.4f}s")

# Dask DataFrame - parallel pandas
df = dd.read_csv('large_data/*.csv')
result = df.groupby('category').mean().compute()

# ===== Production pattern: Parallel data loading =====

class ParallelDataLoader:
    def __init__(self, file_list, n_workers=4):
        self.file_list = file_list
        self.n_workers = n_workers

    def load_file(self, filename):
        # I/O operation - use threading
        data = np.load(filename)
        return self.preprocess(data)

    def preprocess(self, data):
        # CPU operation - happens in worker process
        return (data - data.mean()) / data.std()

    def __iter__(self):
        # Parallel loading with multiprocessing
        with mp.Pool(self.n_workers) as pool:
            for batch in pool.imap(self.load_file, self.file_list):
                yield batch

# Usage
loader = ParallelDataLoader(['data1.npy', 'data2.npy', ...])
for batch in loader:
    train_model(batch)
```

**Decision matrix**:
```python
# CPU-bound (computation) → multiprocessing
# - Image preprocessing (resize, normalize, augment)
# - Feature engineering (complex transformations)
# - Model inference on CPU
# Use: joblib.Parallel or ProcessPoolExecutor

# I/O-bound (disk/network) → threading or asyncio
# - Loading images from disk
# - Downloading data from API
# - Reading multiple CSV files
# Use: ThreadPoolExecutor or asyncio

# Mixed workload → pipeline with both
# 1. Thread pool loads files (I/O)
# 2. Process pool processes data (CPU)

# Huge datasets (>memory) → Dask or Ray
# - Distributed processing across machines
# - Out-of-core computation
```

**Common pitfalls**:
```python
# Pitfall 1: Using multiprocessing for I/O-bound tasks
# Overhead of spawning processes > benefit
# Use threading instead

# Pitfall 2: Sharing large data between processes
# Serialization overhead can negate speedup
# Solution: Use shared memory or pass indices not data

# Pitfall 3: Not checking if parallelization helps
# Always profile! For small datasets, overhead > benefit

# Pitfall 4: Deadlocks in multiprocessing
# Avoid: Nested pools, sharing locks incorrectly
# Use: Context managers (with Pool:), simple patterns

# Pitfall 5: Not limiting workers
# Too many workers → overhead, memory issues
# Use: n_jobs = min(cpu_count(), optimal_for_task)
```

**In Practice**:
For ML pipelines: (1) Use **joblib** for parallel preprocessing (simple API, good defaults), (2) Use **DataLoader with multiprocessing** for training (PyTorch/TensorFlow built-in), (3) Use **Ray** for distributed hyperparameter tuning, (4) Use **Dask** for huge datasets (>100GB). Always profile - parallelization has overhead that may not pay off for small tasks (<1s per item).

**Key Takeaway**: Use multiprocessing (joblib/ProcessPoolExecutor) for CPU-bound tasks, threading for I/O-bound; always profile to verify speedup justifies overhead; specialized tools (Dask, Ray) for huge/distributed workloads.

</details>

5. How do you profile and optimize slow loops in production ML code?

<details>
<summary>Answer: Use line_profiler for hotspots, cProfile for overview; optimize with vectorization, caching, Numba JIT, or algorithm changes</summary>

**Explanation**:
Profiling identifies where time is spent. **cProfile** gives function-level timing (built-in, low overhead). **line_profiler** shows line-by-line timing (more detailed, higher overhead). **memory_profiler** tracks memory usage. **snakeviz** visualizes cProfile output.

Optimization strategies after profiling: (1) **Vectorize** - replace loops with NumPy, (2) **Cache** - store repeated computations, (3) **Algorithmic** - reduce complexity (O(n²) → O(n log n)), (4) **JIT compile** - Numba for numerical loops, (5) **Parallelize** - multiprocessing for independent iterations, (6) **Use better data structures** - set instead of list for membership.

**Example**:
```python
# Setup: Slow ML preprocessing code
import numpy as np
import time

def slow_preprocessing(data):
    """Poorly optimized preprocessing"""
    results = []
    for i in range(len(data)):
        # Inefficiency 1: Loop instead of vectorize
        normalized = (data[i] - data.mean()) / data.std()

        # Inefficiency 2: Repeated expensive computation
        if normalized > 0:
            result = np.sqrt(np.abs(normalized)) * np.log(np.abs(normalized) + 1)
        else:
            result = -np.sqrt(np.abs(normalized)) * np.log(np.abs(normalized) + 1)

        results.append(result)
    return np.array(results)

# Test data
data = np.random.randn(10000)

# ===== Step 1: Profile with cProfile =====
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()
result = slow_preprocessing(data)
profiler.disable()

stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(10)  # Top 10 slowest functions

# ===== Step 2: Line-by-line profiling =====
# Install: pip install line_profiler
# Usage: kernprof -l -v script.py

from line_profiler import LineProfiler

lp = LineProfiler()
lp.add_function(slow_preprocessing)
lp.run('slow_preprocessing(data)')
lp.print_stats()

# Output shows time per line:
# Line  Hits   Time  Per Hit   % Time  Line Contents
# 5     1      0.2   0.2       0.5     results = []
# 6     10000  2.5   0.0       6.2     for i in range(len(data)):
# 7     10000  15.3  0.002     38.2    normalized = (data[i] - data.mean()) / data.std()
# ...

# ===== Step 3: Optimize based on profiling =====

def optimized_preprocessing(data):
    """Optimized version"""
    # Fix 1: Vectorize - compute once, not per iteration
    mean = data.mean()  # Compute once
    std = data.std()    # Compute once
    normalized = (data - mean) / std  # Vectorized

    # Fix 2: Vectorize conditional logic
    abs_norm = np.abs(normalized)
    result = np.sign(normalized) * np.sqrt(abs_norm) * np.log(abs_norm + 1)

    return result

# Benchmark
start = time.time()
result1 = slow_preprocessing(data)
slow_time = time.time() - start

start = time.time()
result2 = optimized_preprocessing(data)
fast_time = time.time() - start

print(f"Slow: {slow_time:.4f}s")
print(f"Fast: {fast_time:.6f}s")
print(f"Speedup: {slow_time/fast_time:.1f}x")
# Output: Speedup: 250x

# ===== Advanced: Numba JIT for complex loops =====
from numba import jit

@jit(nopython=True)
def complex_loop_numba(data):
    """When vectorization is hard, JIT compile"""
    n = len(data)
    result = np.zeros(n)
    for i in range(n):
        # Complex logic hard to vectorize
        if i == 0:
            result[i] = data[i]
        else:
            result[i] = 0.9 * result[i-1] + 0.1 * data[i]
    return result

# ===== Memory profiling =====
from memory_profiler import profile

@profile
def memory_heavy_function(n):
    # Shows memory usage line-by-line
    data = np.random.rand(n, n)  # Large allocation
    result = data @ data.T  # Another large allocation
    return result

# Usage: python -m memory_profiler script.py

# ===== Production profiling pattern =====

class ProfilingContext:
    """Profile specific code sections in production"""
    def __init__(self, name):
        self.name = name
        self.start = None

    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, *args):
        elapsed = time.time() - self.start
        print(f"{self.name}: {elapsed:.4f}s")

# Usage in training loop
for epoch in range(100):
    with ProfilingContext("Data loading"):
        batch = load_batch()

    with ProfilingContext("Forward pass"):
        output = model(batch)

    with ProfilingContext("Loss computation"):
        loss = criterion(output, labels)

    with ProfilingContext("Backward pass"):
        loss.backward()

    with ProfilingContext("Optimizer step"):
        optimizer.step()

# ===== Practical optimization example =====

# Before optimization
def compute_distances_slow(points1, points2):
    """O(n*m) with Python loops"""
    distances = []
    for p1 in points1:
        row = []
        for p2 in points2:
            dist = np.sqrt(np.sum((p1 - p2)**2))
            row.append(dist)
        distances.append(row)
    return np.array(distances)

# After profiling → vectorize
def compute_distances_fast(points1, points2):
    """Vectorized with broadcasting"""
    # points1: (n, d), points2: (m, d)
    # Result: (n, m)
    diff = points1[:, np.newaxis, :] - points2[np.newaxis, :, :]
    distances = np.sqrt(np.sum(diff**2, axis=2))
    return distances

# Benchmark
points1 = np.random.rand(1000, 3)
points2 = np.random.rand(1000, 3)

start = time.time()
dist1 = compute_distances_slow(points1, points2)
print(f"Slow: {time.time() - start:.4f}s")  # ~2.5s

start = time.time()
dist2 = compute_distances_fast(points1, points2)
print(f"Fast: {time.time() - start:.6f}s")  # ~0.01s - 250x faster!

# ===== Profiling workflow =====
"""
1. Profile with cProfile: Identify slow functions
2. Profile with line_profiler: Find slow lines within functions
3. Analyze results:
   - High time in loops? → Vectorize with NumPy
   - High time in repeated calls? → Cache results
   - High time in pure Python? → JIT with Numba
   - High time in algorithm? → Better algorithm/data structure
4. Optimize and re-profile
5. Repeat until performance is acceptable
"""

# ===== Tools summary =====
# cProfile: Quick function-level overview (low overhead)
# line_profiler: Detailed line-by-line timing (higher overhead)
# memory_profiler: Memory usage per line
# py-spy: Sampling profiler (production safe, low overhead)
# snakeviz: Visualize cProfile output
# scalene: CPU + memory + GPU profiling
```

**Common bottlenecks and fixes**:
```python
# Bottleneck 1: Loops over large arrays
# Fix: Vectorize with NumPy
# Bad: for x in array: result.append(x**2)
# Good: result = array**2

# Bottleneck 2: Repeated expensive computations
# Fix: Cache or precompute
# Bad: for i in range(n): result.append(expensive_func())
# Good: cached = expensive_func(); result = [cached] * n

# Bottleneck 3: Wrong data structure
# Fix: Use set/dict instead of list for lookups
# Bad: if item in my_list  # O(n)
# Good: if item in my_set  # O(1)

# Bottleneck 4: String concatenation in loops
# Fix: Use join
# Bad: s = ""; for x in data: s += str(x)  # O(n²)
# Good: s = "".join(str(x) for x in data)  # O(n)

# Bottleneck 5: Unnecessary copying
# Fix: Operate in-place or use views
# Bad: for i in range(n): data = transform(data.copy())
# Good: for i in range(n): data = transform(data)  # In-place
```

**In Practice**:
Production ML optimization workflow: (1) Profile training loop with cProfile to find slowest function, (2) Use line_profiler on that function to find slow lines, (3) Apply appropriate fix (usually vectorization), (4) Re-profile to verify improvement, (5) Repeat for next bottleneck. Don't optimize blindly - profile first! 80% of time is usually in 20% of code. Focus there.

**Key Takeaway**: Profile with cProfile (overview) and line_profiler (details) to find hotspots; optimize with vectorization, caching, or JIT compilation based on profiling results; always verify speedup with benchmarks.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#performance) for comprehensive list

## Summary

**In 3 sentences**:
- Python uses `if/elif/else` for decisions, `for` for iterating over sequences, and `while` for repeating until a condition is met
- List/dict/set comprehensions provide concise one-line alternatives to loops for creating collections
- Control flow is essential in ML for training loops, data preprocessing, and conditional logic throughout pipelines

**Key takeaway**: Python's control flow is cleaner than Java's - `for item in collection` beats `for(int i=0; i<n; i++)`, and comprehensions replace verbose loops. Master these patterns and your ML code will be concise and readable!
