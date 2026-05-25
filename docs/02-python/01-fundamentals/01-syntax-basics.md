# Python Syntax Basics

> **Before you start**: Have you set up your Python environment? If not, review [Package Management](../00-setup/03-pip-poetry.md)

## What is Python Syntax?

Python syntax is the **set of rules that define how Python code is written and structured**. Think of it like grammar for a programming language - just as English has rules about sentence structure, Python has rules about how to write code.

**Real-world analogy**: Python syntax is like the building code for construction. You can design any house you want, but you must follow structural rules (beams go here, walls need foundations). Python gives you freedom in what you build, but you must follow indentation and naming rules.

## Why This Matters for AI/ML

**You'll need Python syntax for**:
- Writing ML scripts and data processing pipelines
- Working in Jupyter notebooks (interactive AI development)
- Reading and modifying existing AI/ML code
- Collaborating with data scientists (most use Python)

**AI/ML Context**: Python's simple, readable syntax is why it dominates AI/ML. Code like `model.fit(X_train, y_train)` is intuitive - you can guess what it does even without knowing Python. This clarity matters when experimenting with complex algorithms.

## Basic Syntax Rules

### 1. Indentation (Most Important!)

Python uses **indentation (whitespace) to define code blocks**, not braces `{}` like Java or C++.

**Java vs Python comparison**:

```java
// Java - uses braces
if (x > 0) {
    System.out.println("Positive");
    System.out.println("Number: " + x);
}
```

```python
# Python - uses indentation
if x > 0:
    print("Positive")
    print(f"Number: {x}")
```

**Rules**:
- Use **4 spaces** per indentation level (PEP 8 standard)
- Don't mix tabs and spaces (Python 3 will error)
- All lines in a block must have the same indentation

```python
# Correct
if True:
    print("This is indented 4 spaces")
    print("This is also indented 4 spaces")

# Wrong - IndentationError
if True:
    print("4 spaces")
  print("2 spaces - ERROR!")
```

### 2. Comments

Comments explain code to humans - Python ignores them.

```python
# Single-line comment starts with #

# This is useful for explaining complex logic
result = model.predict(X_test)  # Inline comment

"""
Multi-line comment (actually a string literal)
Use triple quotes for longer explanations.
This is often used for documentation.
"""

'''
You can also use single quotes
for multi-line comments.
'''
```

**Best practice**: Comment *why*, not *what*. Code should be self-explanatory.

```python
# Bad - obvious from code
x = x + 1  # Add 1 to x

# Good - explains reasoning
x = x + 1  # Offset by 1 to account for zero-indexing
```

### 3. Variables

Python is **dynamically typed** - no need to declare types like Java's `int x = 5;`.

```python
# Variable assignment
x = 10              # Integer
name = "Claude"     # String
price = 99.99       # Float
is_active = True    # Boolean

# Multiple assignment
a, b, c = 1, 2, 3

# Same value to multiple variables
x = y = z = 0
```

**Naming rules**:
- Use lowercase with underscores: `user_count`, `model_accuracy`
- Must start with letter or underscore: `_private`, `data1` (not `1data`)
- Case-sensitive: `Model` ≠ `model`
- Avoid Python keywords: `class`, `for`, `if`, etc.

**Conventions** (PEP 8):
```python
# Variables and functions: snake_case
user_name = "Alice"
def calculate_score():
    pass

# Classes: PascalCase
class DataProcessor:
    pass

# Constants: SCREAMING_SNAKE_CASE
MAX_ITERATIONS = 1000
API_KEY = "secret"
```

### 4. Print Statements

`print()` outputs to console - essential for debugging.

```python
# Basic print
print("Hello, World!")

# Multiple values (separated by space)
print("Name:", name, "Age:", 25)

# F-strings (Python 3.6+) - MOST COMMON
name = "Alice"
age = 30
print(f"My name is {name} and I'm {age} years old")

# Expressions inside f-strings
x = 10
print(f"x squared is {x**2}")

# Format method (older style)
print("Name: {}, Age: {}".format(name, age))
```

**F-strings are preferred** for readability and performance.

### 5. Basic Data Types

```python
# Numbers
integer = 42
floating = 3.14
complex_num = 3 + 4j  # Rarely used

# Strings
single_quote = 'Hello'
double_quote = "World"
multi_line = """This is
a multi-line
string"""

# Boolean
is_true = True
is_false = False

# None (like null in Java)
empty = None
```

### 6. Basic Operators

```python
# Arithmetic
x = 10 + 5   # Addition: 15
x = 10 - 5   # Subtraction: 5
x = 10 * 5   # Multiplication: 50
x = 10 / 5   # Division: 2.0 (always float)
x = 10 // 3  # Floor division: 3 (integer)
x = 10 % 3   # Modulo: 1
x = 2 ** 3   # Exponent: 8

# Comparison
x == y  # Equal
x != y  # Not equal
x > y   # Greater than
x < y   # Less than
x >= y  # Greater or equal
x <= y  # Less or equal

# Logical
True and False  # False
True or False   # True
not True        # False
```

### 7. Line Continuation

Python prefers single-line statements, but you can break long lines:

```python
# Implicit continuation (inside brackets)
total = (first_value +
         second_value +
         third_value)

# Explicit continuation with backslash
total = first_value + \
        second_value + \
        third_value

# Preferred: use parentheses
result = model.predict(
    X_test,
    batch_size=32,
    verbose=1
)
```

## Try It

**Exercise 1**: Hello World variations

```python
# Basic
print("Hello, World!")

# With variable
name = "Alice"
print(f"Hello, {name}!")

# Multiple lines
print("Line 1")
print("Line 2")
print("Line 3")

# Math in print
print(f"5 + 3 = {5 + 3}")
```

**Exercise 2**: Variable experiments

```python
# Try different types
x = 10
print(type(x))  # <class 'int'>

x = 10.5
print(type(x))  # <class 'float'>

x = "Hello"
print(type(x))  # <class 'str'>

# Reassignment (dynamic typing!)
value = 42        # int
value = "text"    # now str - no error!
```

**Exercise 3**: Indentation practice

```python
# Nested indentation
if True:
    print("Level 1")
    if True:
        print("Level 2")
        if True:
            print("Level 3")

# Multiple statements at same level
if True:
    print("Statement 1")
    print("Statement 2")
    print("Statement 3")
```

## Self-Check Questions

> Answer from memory before checking

1. **What** makes Python's syntax different from Java or C++?
2. **Why** does Python use indentation instead of braces?
3. **When** should you use single vs double quotes for strings?
4. **How** do you write multi-line statements in Python?
5. **Compare**: Python's variable declaration vs Java's - what's different?

<details>
<summary>Click to reveal answers</summary>

1. **Python uses indentation for code blocks** (not braces), is dynamically typed (no type declarations), and has simpler syntax overall. Example: `if x > 0:` vs Java's `if (x > 0) { }`.

2. **Readability and enforced formatting**. Indentation forces consistent code structure - you can't write messy code with inconsistent blocks. This aligns with Python's philosophy: "There should be one obvious way to do it."

3. **Single and double quotes are interchangeable** in Python - use whichever you prefer, but be consistent. Use one when the string contains the other: `"It's working"` or `'He said "hi"'`. Most style guides prefer double quotes.

4. **Three ways**: (1) Implicit continuation inside parentheses/brackets (preferred), (2) Backslash `\` at end of line, (3) Triple quotes for multi-line strings. Example: `total = (a + b + c)` or `text = """line 1\nline 2"""`.

5. **Python is dynamically typed** - no type declaration needed. Java: `int x = 5;` vs Python: `x = 5`. Python variables can change type: `x = 5` then `x = "text"` is valid. Java requires explicit types and variables are strongly typed.

</details>

## Practice Exercises

**Level 1 - Understand**:

Explore Python syntax by typing these in the Python interpreter:

```python
# Start Python interpreter
python3

# Try these:
>>> x = 10
>>> y = 20
>>> print(f"x is {x}, y is {y}")
>>> print(f"Sum: {x + y}")
>>> print(f"Product: {x * y}")

# Check types
>>> type(x)
>>> type(3.14)
>>> type("Hello")
>>> type(True)

# Try reassignment
>>> z = 10
>>> type(z)
>>> z = "now a string"
>>> type(z)

>>> exit()
```

**Level 2 - Apply**:

Create a file `syntax_practice.py`:

```python
# Variables
name = "Your Name"
age = 25
height = 1.75  # meters

# Print with f-strings
print(f"Name: {name}")
print(f"Age: {age}")
print(f"Height: {height}m")

# Calculations
years_to_30 = 30 - age
height_cm = height * 100

print(f"\nYears until 30: {years_to_30}")
print(f"Height in cm: {height_cm}")

# Boolean logic
is_adult = age >= 18
is_tall = height > 1.80

print(f"\nIs adult? {is_adult}")
print(f"Is tall (>1.80m)? {is_tall}")
```

Run it: `python3 syntax_practice.py`

**Level 3 - Create**:

Create a script that calculates ML model metrics:

<details>
<summary>Solution</summary>

```python
# model_metrics.py

# Simulate model predictions
model_name = "RandomForest"
total_predictions = 1000
correct_predictions = 850
training_time = 45.5  # seconds

# Calculate metrics
accuracy = correct_predictions / total_predictions
error_rate = 1 - accuracy
predictions_per_second = total_predictions / training_time

# Display results
print("=" * 40)
print(f"Model Evaluation: {model_name}")
print("=" * 40)
print(f"Total Predictions: {total_predictions}")
print(f"Correct: {correct_predictions}")
print(f"Accuracy: {accuracy:.2%}")
print(f"Error Rate: {error_rate:.2%}")
print(f"Training Time: {training_time}s")
print(f"Speed: {predictions_per_second:.1f} predictions/sec")
print("=" * 40)
```

Run it: `python3 model_metrics.py`

Output:
```
========================================
Model Evaluation: RandomForest
========================================
Total Predictions: 1000
Correct: 850
Accuracy: 85.00%
Error Rate: 15.00%
Training Time: 45.5s
Speed: 22.0 predictions/sec
========================================
```

</details>

## Common Mistakes

❌ **Mistake 1**: Mixing tabs and spaces

```python
# Wrong - will cause TabError or inconsistent behavior
if True:
    print("4 spaces")
	print("1 tab - ERROR!")  # Mixed indentation
```

**Why it's wrong**: Python 3 treats tabs and spaces differently, causing IndentationError. Code looks correct but fails.

✅ **Instead**: Always use 4 spaces. Configure your editor to convert tabs to spaces.

```python
# Correct
if True:
    print("4 spaces")
    print("4 spaces")
```

---

❌ **Mistake 2**: Wrong indentation level

```python
# Wrong - unexpected indent
x = 10
    print(x)  # IndentationError
```

```python
# Wrong - not indented when should be
if x > 0:
print("Positive")  # IndentationError
```

✅ **Instead**: Only indent inside code blocks (after `:`)

```python
# Correct
x = 10
print(x)

if x > 0:
    print("Positive")
```

---

❌ **Mistake 3**: Using Java-style braces

```python
# Wrong - SyntaxError
if x > 0 {
    print("Positive")
}
```

✅ **Instead**: Use colon and indentation

```python
# Correct
if x > 0:
    print("Positive")
```

---

❌ **Mistake 4**: Using reserved keywords as variables

```python
# Wrong - SyntaxError
class = "Math"  # 'class' is a keyword
for = 10        # 'for' is a keyword
```

✅ **Instead**: Use descriptive names that aren't keywords

```python
# Correct
class_name = "Math"
iteration_count = 10
```

---

❌ **Mistake 5**: Forgetting colon after if/for/def

```python
# Wrong - SyntaxError
if x > 0
    print("Positive")
```

✅ **Instead**: Always use colon before indented block

```python
# Correct
if x > 0:
    print("Positive")
```

## How This Connects

**Builds on**:
- [Package Management](../00-setup/03-pip-poetry.md) - Environment ready to write code

**Related concepts**:
- [Data Types](./02-data-types.md) - Next, learn about lists, dicts, etc.
- [Control Flow](./03-control-flow.md) - if/else and loops use this syntax
- [Functions](./04-functions.md) - Function definitions follow these rules

**Why this matters for AI**:
- **ML code readability**: Python's clean syntax makes complex algorithms easier to understand
- **Jupyter notebooks**: Interactive AI development uses the same syntax rules
- **Collaboration**: Most data scientists use Python - knowing syntax is essential
- **Debugging**: Understanding indentation prevents 90% of beginner errors

**Next steps**:
- [Data Types](./02-data-types.md) - Learn about lists, dicts, sets, and tuples

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. Why did Guido van Rossum choose significant whitespace for Python? What problem does it solve?

<details>
<summary>Answer: Eliminates visual-logical structure mismatch and enforces readability</summary>

**Explanation**:
Guido van Rossum chose significant whitespace to solve a fundamental problem in C-family languages: the visual structure (indentation) can differ from the logical structure (braces). In C, Java, or JavaScript, code can *look* like it's in a block but actually isn't, leading to subtle bugs. Apple's infamous "goto fail" SSL vulnerability (2014) was caused by misleading indentation where one unindented statement appeared to be inside an if-block but wasn't.

Python makes indentation the actual syntax, so what you see is what you get. This forces all Python code to follow the same visual structure, eliminating entire classes of bugs. It also aligns with Python's core philosophy from PEP 20: "There should be one-- and preferably only one --obvious way to do it." By making indentation mandatory, Python ensures all code follows consistent formatting.

The design also reduces visual clutter. Compare `if x > 0:` to `if (x > 0) {`. Python's approach is cleaner and more readable, especially for beginners. This made Python ideal for education and rapid development.

**Example**:
```python
# Python - indentation IS the syntax
if user.is_authenticated:
    grant_access()
    log_access()  # Clearly inside the if block

# C/JavaScript - braces determine behavior, indentation is cosmetic
if (user.isAuthenticated)
    grantAccess();
    logAccess();  // LOOKS like it's in the block, but it's NOT!
// logAccess() always runs - critical security bug!

// Correct C version needs braces:
if (user.isAuthenticated) {
    grantAccess();
    logAccess();
}
```

**In Practice**:
When working on ML projects with teams from different backgrounds (Java, C++, MATLAB), Python's enforced indentation means everyone's code looks consistent. You can immediately understand control flow in data preprocessing pipelines or model training loops without hunting for mismatched braces. This is especially valuable in Jupyter notebooks where code clarity is essential for experimentation and sharing results.

**Key Takeaway**: Python's significant whitespace eliminates the gap between visual appearance and actual behavior, preventing bugs and enforcing universal code readability.

</details>

2. How does Python's parser handle indentation errors? What's the difference between TabError and IndentationError?

<details>
<summary>Answer: Tokenizer checks consistency; TabError for mixed tabs/spaces, IndentationError for improper nesting</summary>

**Explanation**:
Python's parser uses a tokenizer that tracks indentation levels using a stack. When it encounters a line, it counts leading whitespace and compares it to the current indentation level. IndentationError occurs when the indentation doesn't match any outer level (not properly aligned with a block). TabError is a specific subclass raised when tabs and spaces are mixed inconsistently.

Python 3 treats tabs as 8 spaces but disallows mixing tabs and spaces in the same source file. The parser tracks whether a file uses tabs or spaces and raises TabError if they're inconsistently mixed. This was introduced because mixing tabs (which display differently in different editors) with spaces creates invisible bugs.

IndentationError happens in several cases: (1) unexpected indent when there's no block to indent into, (2) unindent doesn't match any outer level, (3) expected indented block after colon. The parser maintains a stack of indentation levels and checks that each dedent returns to a previous level exactly.

**Example**:
```python
# IndentationError - unexpected indent
x = 10
    print(x)  # IndentationError: unexpected indent

# IndentationError - unindent doesn't match
if True:
    print("4 spaces")
   print("3 spaces")  # IndentationError: unindent doesn't match

# TabError - mixing tabs and spaces
if True:
    print("4 spaces")
	print("1 tab")  # TabError: inconsistent use of tabs and spaces

# IndentationError - expected indent
if True:
print("No indent")  # IndentationError: expected an indented block
```

**In Practice**:
In production ML projects with multiple contributors, TabError commonly appears when team members use different editors. Configure your editor to "use spaces for tabs" and set tab width to 4 spaces. Use pre-commit hooks with tools like `black` or `autopep8` that automatically fix indentation. In CI/CD pipelines, run `python -tt` (treat tabs as errors) to catch these before code review.

**Key Takeaway**: TabError is for mixed tabs/spaces (configure editor to use spaces), IndentationError is for improper nesting (parser checks stack alignment).

</details>

3. What happens to comments at runtime? Are they stored in bytecode?

<details>
<summary>Answer: Comments are discarded by tokenizer; not in bytecode or AST</summary>

**Explanation**:
Python's lexical analyzer (tokenizer) strips comments during the first phase of compilation before building the Abstract Syntax Tree (AST). Comments never make it into bytecode (.pyc files). When you run `python script.py`, the tokenizer converts source code into tokens, discarding comments entirely. Only tokens are passed to the parser to build the AST, which is then compiled to bytecode.

You can verify this by examining bytecode with `dis.dis()` or inspecting `.pyc` files - they contain zero trace of comments. Docstrings are different: triple-quoted strings at the start of modules/classes/functions are stored as `__doc__` attributes and exist at runtime, but regular `#` comments vanish.

This design means comments have absolutely zero runtime overhead. Unlike some languages where comments might be preserved for debugging or reflection, Python treats them purely as developer documentation that disappears before execution.

**Example**:
```python
import dis

def example():
    # This comment will not be in bytecode
    x = 10  # Neither will this
    """But this docstring IS stored"""
    return x

# Examine bytecode - no comments present
print(dis.dis(example))

# Docstring is accessible at runtime
print(example.__doc__)  # "But this docstring IS stored"

# Comments are gone forever
import inspect
print(inspect.getsource(example))  # This reads the SOURCE file, not runtime
```

**In Practice**:
This means you can heavily comment ML code during development without worrying about performance impact. Add detailed explanations of complex preprocessing steps, model architecture decisions, or hyperparameter choices - they cost nothing at runtime. However, for production documentation, prefer docstrings for functions/classes since they're accessible via `help()` and IDEs can display them. Use comments for inline explanations and TODOs.

**Key Takeaway**: Comments are stripped during tokenization before compilation, have zero runtime cost, and don't appear in bytecode - only docstrings are preserved.

</details>

4. What is the difference between `//` (floor division) and `/` (true division) in Python 2 vs Python 3?

<details>
<summary>Answer: Python 3 `/` always returns float; `//` always floors; Python 2 `/` was type-dependent</summary>

**Explanation**:
This was one of the most significant breaking changes from Python 2 to 3. In Python 2, `/` performed integer division if both operands were integers, returning a truncated integer. This caused subtle bugs because `5 / 2` returned `2` (not `2.5`), but `5.0 / 2` returned `2.5`. Python 3 changed `/` to always perform true division (returning float), and introduced `//` for explicit floor division.

Python 3's behavior is more intuitive and prevents the common bug where developers expect mathematical division but get truncation. Floor division `//` always returns the floor (largest integer ≤ result), which works consistently for both positive and negative numbers. For example, `-7 // 2` returns `-4` (not `-3`), because `-3.5` rounded down is `-4`.

The Python 2 behavior was particularly problematic in scientific computing and ML where you might divide metrics or compute averages. A simple `correct_predictions / total_predictions` would return `0` instead of `0.85` if both were integers.

**Example**:
```python
# Python 3 behavior
print(5 / 2)     # 2.5 (true division - always float)
print(5 // 2)    # 2 (floor division)
print(-7 // 2)   # -4 (floor, not truncation)
print(5.0 / 2)   # 2.5 (consistent)

# Python 2 behavior (don't use this anymore!)
# 5 / 2    would give 2 (integer division)
# 5.0 / 2  would give 2.5 (float division)
# Inconsistent and confusing!

# ML example - accuracy calculation
correct = 850  # int
total = 1000   # int

# Python 3: correct!
accuracy = correct / total  # 0.85

# Python 2 would have given: 0 (wrong!)
# Had to write: float(correct) / total
```

**In Practice**:
In ML code, always use `/` for true division when computing metrics, averages, or normalized values. Use `//` explicitly when you need integer results (e.g., calculating batch indices, splitting datasets). Be especially careful when porting old ML code from Python 2 - look for division operations that might have relied on integer truncation. Modern linters can catch this with `from __future__ import division` checks.

**Key Takeaway**: Python 3 `/` always does true division (returns float), `//` always does floor division; Python 2's type-dependent `/` was confusing and bug-prone.

</details>

**Production Scenarios**:

1. How do you enforce consistent code style across a team? Compare PEP 8, Black, flake8, and pylint.

<details>
<summary>Answer: PEP 8 is the standard; Black auto-formats; flake8 lints; pylint is comprehensive but strict</summary>

**Explanation**:
**PEP 8** is the official Python style guide - the standard all tools reference. It specifies 4-space indentation, 79-character line limits, naming conventions (snake_case, PascalCase), and whitespace rules. It's a guideline, not a tool.

**Black** is an opinionated auto-formatter - "the uncompromising code formatter." It automatically reformats code to a consistent style (based on PEP 8 but with modifications like 88-character lines). Black eliminates style debates: you run it, it formats your code, discussion over. It's deterministic and fast.

**flake8** is a linter that checks PEP 8 compliance but doesn't fix code. It combines PyFlakes (logical errors), pycodestyle (PEP 8), and McCabe (complexity). It reports violations but you fix them manually. Highly configurable.

**pylint** is a comprehensive linter that checks style, errors, code smells, and complexity. It's more thorough than flake8 but also stricter and slower. It assigns a code quality score (0-10). Great for catching bugs but can be overwhelming with warnings.

**Example**:
```python
# Before formatting
def calculate_metrics(predictions,labels,threshold=0.5):
  correct=sum([1 for p,l in zip(predictions,labels) if p==l])
  return correct/len(labels)

# After Black
def calculate_metrics(predictions, labels, threshold=0.5):
    correct = sum([1 for p, l in zip(predictions, labels) if p == l])
    return correct / len(labels)

# flake8 would catch:
# - Missing spaces around operators
# - Wrong indentation
# - Line too long

# pylint would additionally catch:
# - Missing docstring
# - Variable names could be better
# - Complexity score
```

**In Practice**:
For ML teams, use this stack:
1. **Black** in pre-commit hooks for auto-formatting (no debates)
2. **flake8** in CI for PEP 8 compliance (configurable, fast)
3. **pylint** optionally for deep analysis (weekly, not per-commit)

Configuration example (`.pre-commit-config.yaml`):
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=88, --extend-ignore=E203]
```

**Key Takeaway**: Use Black for automatic formatting, flake8 for linting in CI, and optionally pylint for deep analysis - this stack enforces consistency without slowing development.

</details>

2. What are the performance implications of Python's dynamic typing vs static typing?

<details>
<summary>Answer: Dynamic typing adds runtime overhead but enables flexibility; type hints + JIT can recover performance</summary>

**Explanation**:
Python's dynamic typing means type checking happens at runtime, not compile time. Every operation must check types, which adds overhead. When you write `a + b`, Python must: (1) look up `a.__add__`, (2) check if it exists, (3) check if `b` is compatible, (4) call the method, (5) handle potential errors. Statically-typed languages like C or Java know types at compile time and generate direct machine code.

This overhead means Python is 10-100x slower than C for numeric operations. However, dynamic typing enables Python's flexibility: same function works with different types, duck typing, metaprogramming, and rapid prototyping. For ML, this matters less because heavy computation happens in C/C++ libraries (NumPy, PyTorch) - Python is the "glue" code.

Modern Python has type hints (PEP 484) which don't affect runtime but enable tools like mypy to catch type errors early. PyPy (JIT compiler) uses type hints and runtime profiling to optimize hot paths. Mypyc compiles type-hinted Python to C extensions.

**Example**:
```python
# Dynamic typing - runtime checks
def add(a, b):
    return a + b  # Works with int, float, str, lists, custom objects

# Runtime overhead:
# - Look up 'a' type
# - Find __add__ method
# - Check 'b' compatibility
# - Execute

# With type hints - no runtime change, but mypy can check
def add_typed(a: int, b: int) -> int:
    return a + b  # mypy catches add_typed("1", "2")

# NumPy - fast because operations are in C
import numpy as np
arr = np.array([1, 2, 3])  # Python wrapper around C array
result = arr + arr  # Fast C operation, minimal Python overhead
```

**In Practice**:
For ML production code:
1. **Use NumPy/PyTorch/TensorFlow** for numerical operations - they're C/C++ under the hood
2. **Add type hints** to catch bugs early (doesn't slow code but improves safety)
3. **Profile first** - optimize only bottlenecks (usually not Python overhead)
4. **Use Numba/Cython** for pure-Python hot paths that need speed
5. **Embrace dynamic typing** for flexibility in data pipelines

Most ML slowness isn't from dynamic typing - it's from algorithm choices, I/O, or not vectorizing operations.

**Key Takeaway**: Dynamic typing adds 10-100x overhead vs C, but ML libraries are C/C++ underneath; use type hints for safety, optimize only proven bottlenecks.

</details>

3. How do you handle tabs vs spaces issues in a large codebase with multiple contributors?

<details>
<summary>Answer: Enforce spaces-only via editor config, pre-commit hooks, and CI checks</summary>

**Explanation**:
Tabs vs spaces issues arise because different editors render tabs differently (2, 4, or 8 spaces), causing code to look different for different developers. Python 3 disallows mixing tabs and spaces, but you can still have all-tabs or all-spaces files. The solution is to enforce "spaces only" across the entire codebase.

Use a three-layer defense: (1) **EditorConfig** makes all editors use spaces, (2) **pre-commit hooks** catch violations before commit, (3) **CI checks** enforce on pull requests. This prevents tabs from entering the codebase.

For legacy codebases with mixed indentation, use automated tools to convert everything to spaces once, then enforce going forward. Tools like `autopep8 --in-place --aggressive` or `black` will fix indentation issues.

**Example**:
```python
# .editorconfig (placed in project root)
root = true

[*.py]
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: mixed-line-ending
        args: [--fix=lf]

  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black

# CI check (.github/workflows/lint.yml)
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install flake8
      - run: flake8 . --count --select=E9,F63,F7,F82,W191 --show-source
```

**In Practice**:
For existing ML projects:
1. **Run once**: `find . -name "*.py" -exec autopep8 --in-place --aggressive --aggressive {} \;`
2. **Add EditorConfig**: Ensures VSCode, PyCharm, Vim all use spaces
3. **Install pre-commit**: `pre-commit install` in each clone
4. **CI enforcement**: Reject PRs that fail linting

For new projects, use `cookiecutter` templates that include these configurations from the start.

**Key Takeaway**: Enforce spaces-only via EditorConfig, pre-commit hooks with Black/autopep8, and CI checks - prevents tabs from ever entering the codebase.

</details>

4. What tools can automatically fix indentation issues in Python code?

<details>
<summary>Answer: Black, autopep8, and YAPF auto-format; use Black for modern projects</summary>

**Explanation**:
**Black** is the modern standard - opinionated, deterministic, fast. It reformats entire files to consistent style, fixing indentation, spacing, line length, and more. It's non-configurable by design (except line length), which eliminates bikeshedding. Use `black .` to format all Python files.

**autopep8** fixes PEP 8 violations automatically. It's more conservative than Black - only fixes style issues, doesn't reformat aggressively. Use `autopep8 --in-place --aggressive --aggressive file.py` for thorough fixes. Good for legacy code where you want minimal changes.

**YAPF** (Yet Another Python Formatter) by Google is configurable and reformats based on style guides (Google, PEP 8, Facebook). More flexible than Black but requires configuration decisions.

**Example**:
```python
# Before formatting
def train_model( data,labels,
    epochs=100 ,batch_size= 32):
  for epoch in range(epochs ):
        print(f"Epoch {epoch}")
        # training code
  return model

# After Black
def train_model(data, labels, epochs=100, batch_size=32):
    for epoch in range(epochs):
        print(f"Epoch {epoch}")
        # training code
    return model

# Command line usage
black script.py                    # Format one file
black .                            # Format all Python files
black --check .                    # Check without modifying
black --diff .                     # Show what would change

# autopep8 alternative
autopep8 --in-place --aggressive --aggressive script.py

# YAPF alternative
yapf --in-place --style=google script.py
```

**In Practice**:
For ML projects, recommended workflow:
1. **Install Black**: `pip install black`
2. **Format codebase**: `black .`
3. **Add pre-commit hook**: Prevents unformatted code from being committed
4. **Configure IDE**: VSCode "Format on Save", PyCharm "Black formatter"
5. **CI check**: `black --check .` in CI to enforce

For legacy projects with custom formatting, use autopep8 first (minimal changes), then gradually migrate to Black. For Jupyter notebooks, use `black-jupyter`.

**Key Takeaway**: Use Black for automatic formatting in modern projects - opinionated, deterministic, industry standard; autopep8 for legacy code needing minimal changes.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#type-system) for comprehensive list

## Summary

**In 3 sentences**:
- Python uses indentation (4 spaces) to define code blocks instead of braces, making code structure visually obvious
- Variables don't need type declarations (dynamic typing) and use snake_case naming convention
- F-strings (`f"Value: {x}"`) are the modern, preferred way to format output in Python

**Key takeaway**: Python's syntax prioritizes readability - "code is read more often than it's written." Once you master indentation and understand dynamic typing, Python feels natural and intuitive compared to Java or C++!
