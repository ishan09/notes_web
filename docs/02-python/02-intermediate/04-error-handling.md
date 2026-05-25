# Error Handling & Exceptions

> **Before you start**: Do you understand functions? If not, review [Functions](../01-fundamentals/04-functions.md)

## What is Error Handling?

**Simple explanation**: Error handling is how you deal with unexpected situations (errors) in your code without crashing the entire program. Instead of letting errors stop everything, you "catch" them and decide what to do.

**Analogy**: It's like having a safety net when walking a tightrope. If you slip (error occurs), the net catches you (exception handling) so you don't fall all the way down (crash).

**Two types of problems**:
1. **Syntax Errors**: Code is written wrong (Python can't even run it)
   ```python
   if x == 5  # ❌ SyntaxError: missing colon
   ```

2. **Exceptions**: Code is correct, but something goes wrong at runtime
   ```python
   x = 10 / 0  # ✅ Valid syntax, ❌ ZeroDivisionError at runtime
   ```

**Basic example**:
```python
# ❌ Without error handling - program crashes
def divide(a, b):
    return a / b

result = divide(10, 0)  # Crash! ZeroDivisionError
print("This never runs")

# ✅ With error handling - program continues
def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Cannot divide by zero"

result = divide(10, 0)  # Returns error message
print("This runs!")  # Program continues
```

## Why This Matters for AI/ML

1. **API Calls Can Fail**: LLM APIs have rate limits, timeouts, network issues
   ```python
   try:
       response = openai.ChatCompletion.create(...)
   except openai.error.RateLimitError:
       time.sleep(60)  # Wait and retry
   ```

2. **Data Loading Issues**: Missing files, corrupted data, wrong formats
   ```python
   try:
       data = pd.read_csv("dataset.csv")
   except FileNotFoundError:
       print("Dataset not found, downloading...")
       download_dataset()
   ```

3. **Model Inference Errors**: Input shape mismatches, GPU out of memory
   ```python
   try:
       prediction = model(input_tensor)
   except RuntimeError as e:
       if "out of memory" in str(e):
           torch.cuda.empty_cache()
           prediction = model(input_tensor.cpu())
   ```

4. **Production Robustness**: Services must handle errors gracefully, not crash
   ```python
   # API endpoint shouldn't crash on bad input
   try:
       prediction = predict(user_input)
       return {"result": prediction}
   except ValueError:
       return {"error": "Invalid input"}, 400
   ```

## Exception Basics

### try/except

**Syntax**:
```python
try:
    # Code that might raise an exception
    risky_operation()
except ExceptionType:
    # What to do if exception occurs
    handle_error()
```

**Example**:
```python
def load_config(filename):
    try:
        with open(filename) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Config file '{filename}' not found")
        return {}  # Return empty config as fallback
    except json.JSONDecodeError:
        print(f"Config file '{filename}' is not valid JSON")
        return {}

# Usage
config = load_config("config.json")
print(config)  # Works even if file is missing or invalid
```

### Multiple Exception Types

**Catch different exceptions differently**:
```python
def process_data(filename):
    try:
        data = pd.read_csv(filename)
        result = expensive_computation(data)
        return result
    except FileNotFoundError:
        print("File not found")
        return None
    except pd.errors.EmptyDataError:
        print("CSV file is empty")
        return None
    except MemoryError:
        print("Not enough memory, using subset")
        data = pd.read_csv(filename, nrows=1000)
        return expensive_computation(data)
```

**Catch multiple exceptions the same way**:
```python
try:
    result = risky_operation()
except (ValueError, TypeError) as e:  # Tuple of exceptions
    print(f"Input error: {e}")
```

**Catch all exceptions** (use sparingly):
```python
try:
    risky_operation()
except Exception as e:  # Catches almost everything
    print(f"Something went wrong: {e}")
```

### else and finally

**Full syntax**:
```python
try:
    result = operation()
except ExceptionType:
    handle_error()
else:
    # Runs if NO exception occurred
    print("Success!")
finally:
    # ALWAYS runs (exception or not)
    cleanup()
```

**Example: Database connection**:
```python
def query_database(query):
    conn = None
    try:
        conn = connect_to_db()
        result = conn.execute(query)
    except DatabaseError as e:
        print(f"Query failed: {e}")
        result = None
    else:
        print("Query successful")
    finally:
        # Always close connection, even if exception occurred
        if conn:
            conn.close()
    return result
```

**When to use each**:
- **try**: Code that might fail
- **except**: Handle the failure
- **else**: Code that should only run if try succeeded
- **finally**: Cleanup that must happen no matter what

## Common Built-in Exceptions

| Exception | When It Happens | Example |
|-----------|----------------|---------|
| `ValueError` | Invalid value for operation | `int("abc")` |
| `TypeError` | Wrong type | `"string" + 5` |
| `KeyError` | Dict key doesn't exist | `dict["missing_key"]` |
| `IndexError` | List index out of range | `list[100]` (list has 10 items) |
| `FileNotFoundError` | File doesn't exist | `open("missing.txt")` |
| `ZeroDivisionError` | Division by zero | `10 / 0` |
| `AttributeError` | Attribute doesn't exist | `obj.nonexistent_attr` |
| `ImportError` | Can't import module | `import nonexistent_module` |
| `RuntimeError` | Generic runtime error | Various situations |
| `StopIteration` | Iterator exhausted | `next(exhausted_gen)` |

**ML-specific exceptions** (from libraries):
```python
# PyTorch
torch.cuda.OutOfMemoryError  # GPU memory full
RuntimeError                  # Shape mismatch, etc.

# TensorFlow
tf.errors.ResourceExhaustedError  # Out of memory
tf.errors.InvalidArgumentError    # Invalid tensor shape

# OpenAI API
openai.error.RateLimitError      # Too many requests
openai.error.APIError            # API error
openai.error.Timeout             # Request timeout
```

## Raising Exceptions

**Raise your own exceptions** when something is wrong:

```python
def set_learning_rate(lr):
    if lr <= 0:
        raise ValueError("Learning rate must be positive")
    if lr > 1:
        raise ValueError("Learning rate too high (max: 1)")
    return lr

# Usage
set_learning_rate(0.001)  # ✅ Works
set_learning_rate(-0.1)   # ❌ Raises ValueError
```

**Re-raise an exception** after logging:
```python
try:
    result = risky_operation()
except Exception as e:
    log_error(e)  # Log it
    raise         # Re-raise the same exception
```

**Raise different exception**:
```python
def load_model(path):
    try:
        return torch.load(path)
    except FileNotFoundError:
        raise RuntimeError(f"Model not found at {path}")
```

## Custom Exceptions

**Create your own exception types** for domain-specific errors:

```python
class ModelError(Exception):
    """Base exception for model-related errors"""
    pass

class ModelNotTrainedError(ModelError):
    """Raised when trying to use untrained model"""
    pass

class ModelInputError(ModelError):
    """Raised when input is invalid"""
    pass

class Model:
    def __init__(self):
        self.trained = False

    def predict(self, x):
        if not self.trained:
            raise ModelNotTrainedError("Must call train() first")

        if x.shape[0] != 784:
            raise ModelInputError(f"Expected 784 features, got {x.shape[0]}")

        return self._inference(x)

# Usage
model = Model()
try:
    model.predict(data)
except ModelNotTrainedError:
    print("Training model first...")
    model.train()
except ModelInputError as e:
    print(f"Bad input: {e}")
```

**With additional context**:
```python
class DataValidationError(Exception):
    """Raised when data validation fails"""

    def __init__(self, message, row_number=None, column=None):
        self.row_number = row_number
        self.column = column
        super().__init__(message)

    def __str__(self):
        msg = super().__str__()
        if self.row_number:
            msg += f" (row {self.row_number}"
            if self.column:
                msg += f", column '{self.column}'"
            msg += ")"
        return msg

# Usage
raise DataValidationError("Invalid value", row_number=42, column="age")
# Output: Invalid value (row 42, column 'age')
```

**Java comparison**:
```java
// Java - checked exceptions (must declare)
public void loadFile() throws FileNotFoundException {
    // ...
}

// Python - all exceptions are unchecked
def load_file():
    # No declaration needed
    raise FileNotFoundError()
```

## Best Practices

### EAFP vs LBYL

**Python philosophy**: "Easier to Ask for Forgiveness than Permission" (EAFP)

**LBYL (Look Before You Leap)** - Check first:
```python
# ❌ Not Pythonic - race condition possible
if os.path.exists(filename):
    with open(filename) as f:
        data = f.read()
```

**EAFP (Easier to Ask Forgiveness)** - Try and catch:
```python
# ✅ Pythonic - handles errors gracefully
try:
    with open(filename) as f:
        data = f.read()
except FileNotFoundError:
    data = get_default_data()
```

**Why EAFP is better**:
- Avoids race conditions (file could be deleted between check and open)
- Cleaner code (one code path, not two)
- Faster (no extra check in success case)

**Example: Dictionary access**:
```python
# ❌ LBYL
if "key" in dictionary:
    value = dictionary["key"]
else:
    value = default

# ✅ EAFP
try:
    value = dictionary["key"]
except KeyError:
    value = default

# ✅ Even better - use dict methods
value = dictionary.get("key", default)
```

### Exception Chaining

**Preserve original exception** when raising new one:

```python
# ❌ Loses original error
try:
    data = json.loads(response.text)
except json.JSONDecodeError:
    raise ValueError("Invalid API response")

# ✅ Preserves original error
try:
    data = json.loads(response.text)
except json.JSONDecodeError as e:
    raise ValueError("Invalid API response") from e
```

**Automatic chaining** (implicit):
```python
try:
    process_data()
except Exception:
    # If this raises, Python chains them automatically
    cleanup()
```

**Suppress chaining** (rare):
```python
try:
    risky_operation()
except Exception:
    raise NewException() from None  # Don't show original
```

### Don't Catch Everything

**❌ Too broad**:
```python
try:
    result = model.predict(data)
except Exception:  # Catches EVERYTHING (even KeyboardInterrupt!)
    return None
```

**✅ Specific**:
```python
try:
    result = model.predict(data)
except (ValueError, RuntimeError) as e:
    log_error(e)
    return None
```

**Catching `Exception` hides bugs**:
```python
try:
    result = mdoel.predict(data)  # Typo: mdoel instead of model
except Exception:  # Catches NameError, hides the bug!
    return None
```

### Log Exceptions Properly

```python
import logging

logger = logging.getLogger(__name__)

try:
    result = risky_operation()
except Exception as e:
    # ✅ Includes full traceback
    logger.exception("Operation failed")
    # or
    logger.error("Operation failed", exc_info=True)
```

## Try It

Open Python REPL and try this:

```python
# 1. Basic try/except
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Cannot divide by zero"

print(safe_divide(10, 2))   # 5.0
print(safe_divide(10, 0))   # Cannot divide by zero

# 2. Multiple exceptions
def convert_input(value):
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value  # Keep as string

print(convert_input("42"))      # 42
print(convert_input("3.14"))    # 3.14
print(convert_input("hello"))   # hello

# 3. Custom exception
class NegativeValueError(ValueError):
    pass

def square_root(x):
    if x < 0:
        raise NegativeValueError(f"Cannot take square root of {x}")
    return x ** 0.5

try:
    print(square_root(-4))
except NegativeValueError as e:
    print(f"Error: {e}")
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between errors and exceptions?
2. **Why** use try/except instead of checking conditions?
3. **When** should you catch specific exceptions vs broad Exception?
4. **How** do you create custom exceptions?
5. **Compare**: Python's exception handling vs Java's

<details>
<summary><strong>Answers</strong></summary>

1. **What is the difference between errors and exceptions?**
   - **Syntax Errors**: Code is invalid, Python can't parse it (e.g., missing colon)
   - **Exceptions**: Valid code, but runtime problem (e.g., division by zero)
   - **Errors** (like SyntaxError) stop execution before code runs
   - **Exceptions** can be caught and handled with try/except
   - Some "Errors" are actually exceptions (TypeError, ValueError) - confusing names!

2. **Why use try/except instead of checking conditions?**
   - **EAFP philosophy**: "Easier to Ask for Forgiveness than Permission"
   - **Avoids race conditions**: File could be deleted between check and use
   - **Cleaner code**: One path instead of branching
   - **Better performance**: No extra check in the success case
   - Example: `try: dict[key]` vs `if key in dict: dict[key]`

3. **When should you catch specific exceptions vs broad Exception?**

   **Catch specific exceptions when**:
   - You know what can fail and how to handle it
   - You want different handling for different errors
   - You're in production code (don't hide bugs)

   **Catch broad Exception when**:
   - Top-level error handlers (logging, monitoring)
   - Cleanup must happen no matter what
   - Wrapping third-party code

   **Never catch**:
   - `BaseException` (includes SystemExit, KeyboardInterrupt)
   - Just `except:` without specifying (same as BaseException)

4. **How do you create custom exceptions?**
   ```python
   # Simple custom exception
   class MyError(Exception):
       pass

   # With additional context
   class ValidationError(Exception):
       def __init__(self, message, field_name):
           self.field_name = field_name
           super().__init__(message)

   # Exception hierarchy
   class ModelError(Exception):
       pass

   class ModelNotTrainedError(ModelError):
       pass

   # Raise it
   raise ModelNotTrainedError("Model not trained")
   ```

5. **Compare: Python's exception handling vs Java's**

   | Aspect | Python | Java |
   |--------|--------|------|
   | Exception types | All unchecked | Checked + Unchecked |
   | Declaration | Not required | `throws` required for checked |
   | Syntax | `try/except/else/finally` | `try/catch/finally` |
   | Multiple catches | `except (E1, E2):` | Multiple `catch` blocks |
   | Re-raise | `raise` | `throw e` |
   | Chaining | `raise E from original` | `new E(msg, cause)` |

   **Key difference**: Python has no checked exceptions - you never have to declare what exceptions a function might raise.

   ```java
   // Java - must declare
   public void readFile() throws IOException {
       // ...
   }
   ```

   ```python
   # Python - no declaration needed
   def read_file():
       raise IOError()  # No throws declaration
   ```

</details>

## Practice Exercises

**Level 1 - Understand**: Read and explain the code

```python
def process_file(filename):
    try:
        with open(filename) as f:
            data = f.read()
    except FileNotFoundError:
        print(f"File {filename} not found")
        return None
    else:
        print(f"Successfully read {filename}")
        return data
    finally:
        print("Cleanup complete")

result = process_file("data.txt")
```

**Questions**:
1. What gets printed if the file exists?
2. What gets printed if the file doesn't exist?
3. Does `finally` run in both cases?
4. What does the function return in each case?

<details>
<summary><strong>Explanation</strong></summary>

1. **If file exists**:
   ```
   Successfully read data.txt
   Cleanup complete
   ```
   - `try` block succeeds
   - `else` block runs (only on success)
   - `finally` always runs
   - Returns file contents

2. **If file doesn't exist**:
   ```
   File data.txt not found
   Cleanup complete
   ```
   - `try` block raises FileNotFoundError
   - `except` block catches it
   - `else` block doesn't run (exception occurred)
   - `finally` still runs
   - Returns None

3. **Yes**, `finally` always runs, whether exception occurs or not

4. **Returns**:
   - File exists: file contents (data)
   - File doesn't exist: None

**Note**: The `with` statement automatically closes the file even if exception occurs, so `finally` here is mainly for demonstration.

</details>

---

**Level 2 - Apply**: Modify the code

Create a function `safe_int_convert(value)` that:
- Tries to convert value to int
- If that fails, tries to convert to float, then rounds to int
- If that fails, returns 0
- Logs what happened at each step
- Returns the converted integer

<details>
<summary><strong>Solution</strong></summary>

```python
def safe_int_convert(value):
    """Convert value to int with multiple fallback strategies"""

    # Strategy 1: Direct int conversion
    try:
        result = int(value)
        print(f"✓ Converted '{value}' directly to int: {result}")
        return result
    except ValueError:
        print(f"✗ Cannot convert '{value}' directly to int")

    # Strategy 2: Float then int
    try:
        float_val = float(value)
        result = round(float_val)
        print(f"✓ Converted '{value}' via float: {result}")
        return result
    except ValueError:
        print(f"✗ Cannot convert '{value}' to float")

    # Strategy 3: Default fallback
    print(f"✗ Using default value: 0")
    return 0

# Test cases
print(safe_int_convert("42"))       # Direct int
print(safe_int_convert("3.7"))      # Float to int
print(safe_int_convert("hello"))    # Fallback to 0
print(safe_int_convert([1, 2]))     # Fallback to 0
```

**Output**:
```
✓ Converted '42' directly to int: 42
42
✗ Cannot convert '3.7' directly to int
✓ Converted '3.7' via float: 4
4
✗ Cannot convert 'hello' directly to int
✗ Cannot convert 'hello' to float
✗ Using default value: 0
0
✗ Cannot convert '[1, 2]' directly to int
✗ Cannot convert '[1, 2]' to float
✗ Using default value: 0
0
```

**Alternative with nested try**:
```python
def safe_int_convert(value):
    try:
        return int(value)
    except ValueError:
        try:
            return round(float(value))
        except ValueError:
            return 0
```

</details>

---

**Level 3 - Create**: Build from scratch

Build a **DataValidator** class for validating ML training data:

**Requirements**:
1. Custom exceptions:
   - `DataValidationError` (base)
   - `MissingDataError` (missing values)
   - `InvalidRangeError` (values out of range)
   - `InvalidTypeError` (wrong data type)

2. Methods:
   - `validate_not_null(data, column_name)`: Check no missing values
   - `validate_range(data, min_val, max_val, column_name)`: Check value range
   - `validate_type(data, expected_type, column_name)`: Check data type
   - `validate_all(data, schema)`: Run all validations from schema

3. Each exception should store:
   - Error message
   - Column name
   - Row numbers where error occurred (for first 5 errors)

4. `validate_all` should collect all errors and raise a summary

<details>
<summary><strong>Solution</strong></summary>

```python
class DataValidationError(Exception):
    """Base exception for data validation errors"""

    def __init__(self, message, column=None, rows=None):
        self.column = column
        self.rows = rows or []
        super().__init__(message)

    def __str__(self):
        msg = super().__str__()
        if self.column:
            msg += f" [column: {self.column}]"
        if self.rows:
            row_str = ", ".join(str(r) for r in self.rows[:5])
            if len(self.rows) > 5:
                row_str += f" ... ({len(self.rows)} total)"
            msg += f" [rows: {row_str}]"
        return msg


class MissingDataError(DataValidationError):
    """Raised when data has missing values"""
    pass


class InvalidRangeError(DataValidationError):
    """Raised when values are out of valid range"""
    pass


class InvalidTypeError(DataValidationError):
    """Raised when data has wrong type"""
    pass


class DataValidator:
    """Validator for ML training data"""

    def validate_not_null(self, data, column_name):
        """Check that column has no missing values"""
        missing_rows = []
        for i, value in enumerate(data):
            if value is None or (isinstance(value, float) and value != value):  # NaN check
                missing_rows.append(i)

        if missing_rows:
            raise MissingDataError(
                f"{len(missing_rows)} missing values found",
                column=column_name,
                rows=missing_rows
            )

    def validate_range(self, data, min_val, max_val, column_name):
        """Check that all values are within range"""
        invalid_rows = []
        for i, value in enumerate(data):
            if value is not None:
                try:
                    if not (min_val <= value <= max_val):
                        invalid_rows.append(i)
                except TypeError:
                    # Can't compare (e.g., string with number)
                    invalid_rows.append(i)

        if invalid_rows:
            raise InvalidRangeError(
                f"{len(invalid_rows)} values outside range [{min_val}, {max_val}]",
                column=column_name,
                rows=invalid_rows
            )

    def validate_type(self, data, expected_type, column_name):
        """Check that all values are of expected type"""
        invalid_rows = []
        for i, value in enumerate(data):
            if value is not None and not isinstance(value, expected_type):
                invalid_rows.append(i)

        if invalid_rows:
            raise InvalidTypeError(
                f"{len(invalid_rows)} values are not {expected_type.__name__}",
                column=column_name,
                rows=invalid_rows
            )

    def validate_all(self, data_dict, schema):
        """
        Validate all columns according to schema.

        schema = {
            'column_name': {
                'type': int,
                'nullable': False,
                'min': 0,
                'max': 100
            }
        }
        """
        errors = []

        for column_name, rules in schema.items():
            if column_name not in data_dict:
                errors.append(f"Missing column: {column_name}")
                continue

            data = data_dict[column_name]

            # Check null values
            if not rules.get('nullable', True):
                try:
                    self.validate_not_null(data, column_name)
                except DataValidationError as e:
                    errors.append(str(e))

            # Check type
            if 'type' in rules:
                try:
                    self.validate_type(data, rules['type'], column_name)
                except DataValidationError as e:
                    errors.append(str(e))

            # Check range
            if 'min' in rules and 'max' in rules:
                try:
                    self.validate_range(data, rules['min'], rules['max'], column_name)
                except DataValidationError as e:
                    errors.append(str(e))

        if errors:
            error_msg = f"Validation failed with {len(errors)} error(s):\n"
            error_msg += "\n".join(f"  - {err}" for err in errors)
            raise DataValidationError(error_msg)


# Test the validator
if __name__ == "__main__":
    validator = DataValidator()

    # Sample data
    data = {
        'age': [25, 30, None, 45, 200],  # Missing value, out of range
        'score': [85, 92, 78, "invalid", 88],  # Wrong type
        'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve']
    }

    # Schema
    schema = {
        'age': {
            'type': int,
            'nullable': False,
            'min': 0,
            'max': 120
        },
        'score': {
            'type': int,
            'min': 0,
            'max': 100
        },
        'name': {
            'type': str,
            'nullable': False
        }
    }

    # Validate
    try:
        validator.validate_all(data, schema)
        print("✓ All validation passed!")
    except DataValidationError as e:
        print(f"✗ Validation failed:\n{e}")
```

**Output**:
```
✗ Validation failed:
Validation failed with 3 error(s):
  - 1 missing values found [column: age] [rows: 2]
  - 1 values outside range [0, 120] [column: age] [rows: 4]
  - 1 values are not int [column: score] [rows: 3]
```

**Key features**:
- Exception hierarchy (MissingDataError extends DataValidationError)
- Context in exceptions (column, rows)
- Multiple validations run (doesn't stop at first error)
- Clear error messages with details
- Reusable validator class

</details>

## Common Mistakes

### ❌ Mistake 1: Bare except clause

```python
try:
    result = operation()
except:  # ❌ Catches EVERYTHING, including KeyboardInterrupt!
    handle_error()
```

✅ **Fix**: Always specify exception type
```python
try:
    result = operation()
except Exception as e:  # ✅ Still broad, but doesn't catch system exits
    handle_error(e)
```

---

### ❌ Mistake 2: Empty except block

```python
try:
    result = model.predict(data)
except ValueError:
    pass  # ❌ Silent failure - bug is hidden!
```

✅ **Fix**: At minimum, log the error
```python
try:
    result = model.predict(data)
except ValueError as e:
    logger.warning(f"Prediction failed: {e}")
    result = None
```

---

### ❌ Mistake 3: Too broad exception catching

```python
try:
    connection = connect_db()
    data = connection.query("SELECT * FROM users")
    result = process(data)
    return result
except Exception:  # ❌ What went wrong? DB? Processing? Can't tell!
    return None
```

✅ **Fix**: Catch specific exceptions
```python
try:
    connection = connect_db()
except ConnectionError as e:
    logger.error(f"Cannot connect to database: {e}")
    return None

try:
    data = connection.query("SELECT * FROM users")
except DatabaseError as e:
    logger.error(f"Query failed: {e}")
    return None

try:
    result = process(data)
except ValueError as e:
    logger.error(f"Processing failed: {e}")
    return None

return result
```

---

### ❌ Mistake 4: Using exceptions for control flow

```python
# ❌ Using exceptions for normal logic
def find_item(items, target):
    try:
        return items[items.index(target)]
    except ValueError:
        return None
```

✅ **Fix**: Use normal control flow
```python
# ✅ Better
def find_item(items, target):
    if target in items:
        return target
    return None

# ✅ Even better
def find_item(items, target):
    return target if target in items else None
```

**Exception**: EAFP is still good for things that can truly fail (file I/O, network, etc.)

---

### ❌ Mistake 5: Losing exception context

```python
try:
    data = fetch_from_api()
    result = process(data)
except APIError:
    raise ValueError("Processing failed")  # ❌ Lost original API error
```

✅ **Fix**: Chain exceptions
```python
try:
    data = fetch_from_api()
    result = process(data)
except APIError as e:
    raise ValueError("Processing failed") from e  # ✅ Preserves chain
```

## How This Connects

**Builds on**:
- [Control Flow](../01-fundamentals/03-control-flow.md) - Exceptions alter control flow
- [Functions](../01-fundamentals/04-functions.md) - Handle errors in functions

**Related concepts**:
- **Context Managers** (Phase 3) - Use `with` to guarantee cleanup (similar to finally)
- **Logging** - Log exceptions properly for debugging
- **Decorators** (Phase 3) - Create retry decorators for error handling

**Why this matters for AI/ML**:

1. **LLM API Calls**:
   ```python
   import openai
   from tenacity import retry, stop_after_attempt, wait_exponential

   @retry(
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=4, max=10)
   )
   def call_llm(prompt):
       try:
           return openai.ChatCompletion.create(
               model="gpt-4",
               messages=[{"role": "user", "content": prompt}]
           )
       except openai.error.RateLimitError:
           print("Rate limited, retrying...")
           raise  # Let tenacity handle retry
   ```

2. **Data Loading**:
   ```python
   def load_batch(file_path):
       try:
           return np.load(file_path)
       except FileNotFoundError:
           logger.warning(f"File {file_path} not found, using empty batch")
           return np.array([])
       except Exception as e:
           logger.error(f"Failed to load {file_path}: {e}")
           raise  # Re-raise unexpected errors
   ```

3. **Model Inference**:
   ```python
   def predict(model, input_data):
       try:
           return model(input_data)
       except RuntimeError as e:
           if "out of memory" in str(e):
               torch.cuda.empty_cache()
               return model(input_data.cpu())
           raise
   ```

4. **Production APIs**:
   ```python
   from fastapi import FastAPI, HTTPException

   app = FastAPI()

   @app.post("/predict")
   async def predict(request: PredictionRequest):
       try:
           result = model.predict(request.data)
           return {"prediction": result}
       except ValueError as e:
           raise HTTPException(status_code=400, detail=str(e))
       except Exception as e:
           logger.exception("Prediction failed")
           raise HTTPException(status_code=500, detail="Internal error")
   ```

**Next steps**:
- [File I/O](./05-file-io.md) - Handle file-related errors (FileNotFoundError, etc.)

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. **What's the cost of exceptions in Python? When do they impact performance?**
   <details>
   <summary>Answer</summary>

   **Cost breakdown**:
   - **Setting up try block**: ~0 cost (no overhead if exception doesn't occur)
   - **Raising exception**: ~20-50x slower than normal return
   - **Catching exception**: Adds to the cost
   - **Creating traceback**: Most expensive part

   **Benchmark**:
   ```python
   import timeit

   # No exception
   def no_exception():
       return 42

   # With exception
   def with_exception():
       try:
           raise ValueError()
       except ValueError:
           return 42

   print(timeit.timeit(no_exception, number=1000000))      # ~0.03s
   print(timeit.timeit(with_exception, number=1000000))    # ~1.5s
   ```

   **When exceptions impact performance**:
   1. **In hot loops** - Don't use exceptions for control flow
      ```python
      # ❌ Bad - exception per iteration
      for item in items:
          try:
              result = process(item)
          except ValueError:
              continue

      # ✅ Better - validate first
      for item in items:
          if is_valid(item):
              result = process(item)
      ```

   2. **Deep call stacks** - Traceback creation is expensive
   3. **Frequent failures** - If exceptions happen often, rethink approach

   **When exceptions are fine**:
   - Rare failure cases (file not found, network error)
   - Initialization code (not in hot path)
   - EAFP pattern (usually faster overall despite exception cost)

   **Disabling traceback for performance**:
   ```python
   # Disable traceback (saves ~50% exception cost)
   raise ValueError("message") from None
   ```

   **Key insight**: Exceptions are for exceptional cases, not control flow.
   </details>

2. **How does exception handling work at the interpreter level?**
   <details>
   <summary>Answer</summary>

   **Exception handling mechanism**:

   1. **Exception object created** with:
      - Type (class)
      - Value (message/data)
      - Traceback (call stack)

   2. **Stack unwinding**:
      - Python walks up the call stack
      - Checks each frame for matching exception handler
      - Destroys frames until handler found or program exits

   3. **Exception table**:
      - Each function has a table of exception handlers
      - Maps bytecode ranges to exception types and jump targets
      - CPython uses this for fast exception dispatch

   **Bytecode example**:
   ```python
   def example():
       try:
           risky()
       except ValueError:
           handle()
   ```

   Compiles to (simplified):
   ```
   SETUP_EXCEPT        L1      # Register exception handler
   LOAD_GLOBAL         risky
   CALL_FUNCTION       0
   POP_EXCEPT                  # No exception, remove handler
   JUMP_FORWARD        L2

   L1:  # Exception handler
   DUP_TOP                     # Copy exception
   LOAD_GLOBAL         ValueError
   COMPARE_OP          exception_match
   POP_JUMP_IF_FALSE   L3      # Not ValueError, re-raise
   POP_TOP                     # Consume exception
   LOAD_GLOBAL         handle
   CALL_FUNCTION       0
   POP_EXCEPT

   L2:  # After try/except
   ```

   **Performance implications**:
   - Exception tables are pre-computed (no runtime lookup cost)
   - Stack unwinding is expensive (destroys frames)
   - Traceback creation walks the stack (expensive)

   **sys.exc_info()**:
   ```python
   import sys

   try:
       1 / 0
   except:
       exc_type, exc_value, exc_traceback = sys.exc_info()
       print(exc_type)      # <class 'ZeroDivisionError'>
       print(exc_value)     # division by zero
       print(exc_traceback) # traceback object
   ```
   </details>

3. **What's the difference between `except Exception` and `except BaseException`?**
   <details>
   <summary>Answer</summary>

   **Exception hierarchy**:
   ```
   BaseException
   ├── SystemExit           # sys.exit()
   ├── KeyboardInterrupt    # Ctrl+C
   ├── GeneratorExit        # generator.close()
   └── Exception            # All "normal" exceptions
       ├── StopIteration
       ├── ArithmeticError
       │   ├── ZeroDivisionError
       │   └── OverflowError
       ├── LookupError
       │   ├── IndexError
       │   └── KeyError
       ├── ValueError
       ├── TypeError
       └── ... (all others)
   ```

   **Key differences**:

   ```python
   # ❌ BAD - catches KeyboardInterrupt!
   try:
       while True:
           process()
   except BaseException:
       cleanup()  # User can't Ctrl+C to stop!

   # ✅ GOOD - doesn't catch system exits
   try:
       while True:
           process()
   except Exception:
       cleanup()  # Ctrl+C still works

   # ✅ BEST - be specific
   try:
       process()
   except (ValueError, TypeError) as e:
       handle_error(e)
   ```

   **When to catch BaseException**:
   - Almost never!
   - Only at the very top level for logging all exceptions before exit
   - Even then, re-raise SystemExit and KeyboardInterrupt

   ```python
   def main():
       try:
           app.run()
       except KeyboardInterrupt:
           print("Shutting down gracefully...")
           raise  # Let it propagate
       except Exception as e:
           logger.exception("Unhandled error")
           raise
   ```
   </details>

**Production Scenarios**:

1. **How do you implement retry logic for LLM API calls?**
   <details>
   <summary>Answer</summary>

   **Using tenacity library** (recommended):
   ```python
   from tenacity import (
       retry,
       stop_after_attempt,
       wait_exponential,
       retry_if_exception_type
   )
   import openai

   @retry(
       # Retry up to 5 times
       stop=stop_after_attempt(5),
       # Exponential backoff: 2^x * 1 second, max 60s
       wait=wait_exponential(multiplier=1, min=4, max=60),
       # Only retry on specific errors
       retry=retry_if_exception_type((
           openai.error.RateLimitError,
           openai.error.APIError,
           openai.error.Timeout
       )),
       # Log retry attempts
       before_sleep=lambda retry_state: print(
           f"Retrying {retry_state.attempt_number}/5..."
       )
   )
   def call_llm(prompt, **kwargs):
       return openai.ChatCompletion.create(
           model="gpt-4",
           messages=[{"role": "user", "content": prompt}],
           **kwargs
       )

   # Usage
   try:
       response = call_llm("Explain quantum computing")
       print(response.choices[0].message.content)
   except openai.error.RateLimitError:
       print("Rate limited after all retries")
   except Exception as e:
       print(f"Failed: {e}")
   ```

   **Custom retry decorator**:
   ```python
   import time
   import functools

   def retry_with_backoff(
       max_attempts=3,
       initial_delay=1,
       backoff_factor=2,
       exceptions=(Exception,)
   ):
       def decorator(func):
           @functools.wraps(func)
           def wrapper(*args, **kwargs):
               delay = initial_delay
               last_exception = None

               for attempt in range(max_attempts):
                   try:
                       return func(*args, **kwargs)
                   except exceptions as e:
                       last_exception = e
                       if attempt < max_attempts - 1:
                           print(f"Attempt {attempt + 1} failed: {e}")
                           print(f"Retrying in {delay}s...")
                           time.sleep(delay)
                           delay *= backoff_factor
                       else:
                           print(f"All {max_attempts} attempts failed")

               raise last_exception

           return wrapper
       return decorator

   # Usage
   @retry_with_backoff(
       max_attempts=3,
       initial_delay=2,
       exceptions=(openai.error.RateLimitError, openai.error.APIError)
   )
   def call_llm(prompt):
       return openai.ChatCompletion.create(
           model="gpt-4",
           messages=[{"role": "user", "content": prompt}]
       )
   ```

   **Advanced: Retry with different strategies**:
   ```python
   from tenacity import retry, stop_after_attempt, wait_chain, wait_fixed

   @retry(
       # First 3 retries: wait 1s
       # Next 2 retries: wait 5s
       # After that: exponential backoff
       wait=wait_chain(
           *[wait_fixed(1) for _ in range(3)],
           *[wait_fixed(5) for _ in range(2)],
           wait_exponential(min=10, max=60)
       ),
       stop=stop_after_attempt(10)
   )
   def call_llm_with_complex_retry(prompt):
       return openai.ChatCompletion.create(...)
   ```

   **Key considerations**:
   - Exponential backoff prevents overwhelming the API
   - Max retry limit prevents infinite loops
   - Only retry transient errors (rate limits, timeouts)
   - Don't retry validation errors (400 status codes)
   - Log retry attempts for monitoring
   </details>

2. **What's the best practice for logging exceptions in production ML services?**
   <details>
   <summary>Answer</summary>

   **Structured logging setup**:
   ```python
   import logging
   import json
   import traceback
   from datetime import datetime

   # Configure structured logging
   class StructuredFormatter(logging.Formatter):
       def format(self, record):
           log_data = {
               "timestamp": datetime.utcnow().isoformat(),
               "level": record.levelname,
               "message": record.getMessage(),
               "module": record.module,
               "function": record.funcName,
               "line": record.lineno,
           }

           # Add exception info if present
           if record.exc_info:
               log_data["exception"] = {
                   "type": record.exc_info[0].__name__,
                   "message": str(record.exc_info[1]),
                   "traceback": traceback.format_exception(*record.exc_info)
               }

           # Add custom fields
           if hasattr(record, 'user_id'):
               log_data["user_id"] = record.user_id
           if hasattr(record, 'request_id'):
               log_data["request_id"] = record.request_id

           return json.dumps(log_data)

   # Setup logger
   logger = logging.getLogger(__name__)
   handler = logging.StreamHandler()
   handler.setFormatter(StructuredFormatter())
   logger.addHandler(handler)
   logger.setLevel(logging.INFO)
   ```

   **Exception logging patterns**:
   ```python
   # 1. Log with full traceback
   try:
       result = model.predict(data)
   except Exception:
       logger.exception("Prediction failed")  # Includes traceback
       raise

   # 2. Log with context
   try:
       result = process_data(data)
   except ValueError as e:
       logger.error(
           "Data processing failed",
           extra={
               "user_id": user_id,
               "data_shape": data.shape,
               "error": str(e)
           },
           exc_info=True  # Include traceback
       )
       raise

   # 3. Log and suppress (use rarely)
   try:
       update_cache()
   except Exception as e:
       logger.warning(f"Cache update failed: {e}", exc_info=True)
       # Continue without cache

   # 4. Custom exception logging
   class ModelInferenceError(Exception):
       def __init__(self, message, model_name, input_shape):
           self.model_name = model_name
           self.input_shape = input_shape
           super().__init__(message)

   try:
       prediction = model(input_tensor)
   except RuntimeError as e:
       error = ModelInferenceError(
           "Inference failed",
           model_name=model.name,
           input_shape=input_tensor.shape
       )
       logger.error(
           str(error),
           extra={
               "model_name": error.model_name,
               "input_shape": error.input_shape
           },
           exc_info=True
       )
       raise error from e
   ```

   **FastAPI error handling**:
   ```python
   from fastapi import FastAPI, Request, status
   from fastapi.responses import JSONResponse
   import uuid

   app = FastAPI()

   @app.middleware("http")
   async def add_request_id(request: Request, call_next):
       request_id = str(uuid.uuid4())
       request.state.request_id = request_id

       try:
           response = await call_next(request)
           response.headers["X-Request-ID"] = request_id
           return response
       except Exception as e:
           logger.exception(
               "Unhandled exception",
               extra={"request_id": request_id}
           )
           return JSONResponse(
               status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
               content={"error": "Internal server error", "request_id": request_id}
           )

   @app.exception_handler(ValueError)
   async def value_error_handler(request: Request, exc: ValueError):
       logger.warning(
           f"Validation error: {exc}",
           extra={"request_id": request.state.request_id}
       )
       return JSONResponse(
           status_code=status.HTTP_400_BAD_REQUEST,
           content={"error": str(exc)}
       )
   ```

   **Monitoring integration** (Sentry example):
   ```python
   import sentry_sdk

   sentry_sdk.init(
       dsn="your-sentry-dsn",
       traces_sample_rate=0.1,
       environment="production"
   )

   # Sentry automatically captures unhandled exceptions
   # Add context manually:
   try:
       result = model.predict(data)
   except Exception as e:
       sentry_sdk.set_context("model", {
           "name": model.name,
           "version": model.version
       })
       sentry_sdk.set_context("input", {
           "shape": data.shape,
           "dtype": str(data.dtype)
       })
       sentry_sdk.capture_exception(e)
       raise
   ```

   **Best practices**:
   - ✅ Use structured logging (JSON) for easy parsing
   - ✅ Include request IDs for tracing
   - ✅ Log exception context (user, input, model)
   - ✅ Use different log levels appropriately
   - ✅ Integrate with monitoring tools (Sentry, DataDog)
   - ✅ Don't log sensitive data (PII, secrets)
   - ✅ Sample high-frequency errors (don't spam logs)
   </details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#error-handling) for comprehensive list

## Summary

**In 3 sentences**:
- Python uses try/except to catch and handle exceptions, with optional else (runs if no exception) and finally (always runs) blocks
- Follow the EAFP philosophy ("Easier to Ask for Forgiveness than Permission") - try operations and catch exceptions rather than checking conditions first
- Create custom exception classes for domain-specific errors, always catch specific exception types (not broad Exception), and use exception chaining to preserve error context

**Key takeaway**: Exceptions are expensive to raise (~50x slower than normal returns), so use them for truly exceptional cases like API failures or missing files—not for control flow in hot loops—and always log exceptions with full context (traceback, request ID, input data) for debugging production issues!
