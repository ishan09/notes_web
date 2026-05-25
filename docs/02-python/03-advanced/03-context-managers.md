# Context Managers

> **Before you start**: Understand [Functions](../01-fundamentals/04-functions.md), [Error Handling](../02-intermediate/04-error-handling.md), and [OOP Basics](../02-intermediate/01-oop-basics.md)

## What are Context Managers?

Context managers are Python objects that **manage resources** by defining setup and cleanup actions. They ensure resources are properly acquired and released, even if errors occur. Think of them as automatic resource guardians that guarantee cleanup happens.

**Real-world analogy**: Context managers are like hotel room service. When you enter (check in), lights turn on and AC starts. When you leave (check out), everything turns off automatically - even if you leave in a hurry. The cleanup always happens.

## Why This Matters for AI/ML

**You'll need context managers for**:
- Managing database connections for training data pipelines
- Handling file I/O for large datasets (ensure files close properly)
- GPU memory management (allocate/deallocate tensors)
- Model loading/unloading (free memory after inference)
- Temporary model checkpoints (cleanup on failure)
- Distributed training locks and synchronization
- API client sessions (connection pooling)

**AI/ML Context**: ML applications manage expensive resources - GPU memory, large datasets, database connections, model weights. Context managers ensure these resources are cleaned up even when training crashes or inference fails. For example, loading a 7B parameter LLM takes 14GB RAM - context managers ensure memory is freed after use, preventing OOM errors in long-running services.

## Core Concepts

### 1. The `with` Statement

The `with` statement is syntactic sugar for setup/cleanup patterns:

```python
# Without context manager - manual cleanup
file = open('data.txt', 'r')
try:
    data = file.read()
    process(data)
finally:
    file.close()  # Must remember to close!

# With context manager - automatic cleanup
with open('data.txt', 'r') as file:
    data = file.read()
    process(data)
# File automatically closed here, even if exception occurs
```

**Key benefits**:
- Guaranteed cleanup (even with exceptions)
- Cleaner, more readable code
- No resource leaks
- Automatic error handling

### 2. Built-in Context Managers

Python has many built-in context managers:

```python
# File handling
with open('data.txt', 'r') as f:
    content = f.read()

# Thread locks
import threading
lock = threading.Lock()
with lock:
    # Critical section - lock acquired
    shared_resource.modify()
# Lock automatically released

# Decimal precision
from decimal import localcontext
with localcontext() as ctx:
    ctx.prec = 50  # 50 decimal places
    result = Decimal(1) / Decimal(7)
# Original precision restored

# Suppressing exceptions
from contextlib import suppress
with suppress(FileNotFoundError):
    os.remove('file.txt')  # No error if file doesn't exist

# Redirecting stdout
from contextlib import redirect_stdout
import io
f = io.StringIO()
with redirect_stdout(f):
    print("This goes to string buffer")
output = f.getvalue()
```

### 3. Creating Context Managers with `__enter__` and `__exit__`

Implement the context manager protocol:

```python
class DatabaseConnection:
    def __init__(self, db_name):
        self.db_name = db_name
        self.connection = None

    def __enter__(self):
        """Called when entering 'with' block"""
        print(f"Connecting to {self.db_name}")
        self.connection = connect_to_database(self.db_name)
        return self.connection  # Available as 'as' variable

    def __exit__(self, exc_type, exc_value, traceback):
        """Called when exiting 'with' block"""
        print(f"Closing connection to {self.db_name}")
        if self.connection:
            self.connection.close()

        # Return True to suppress exceptions, False to propagate
        return False

# Usage
with DatabaseConnection('training_data') as conn:
    data = conn.query("SELECT * FROM samples")
# Connection automatically closed
```

**`__exit__` parameters**:
- `exc_type`: Exception class (or None if no exception)
- `exc_value`: Exception instance
- `traceback`: Traceback object
- Return `True` to suppress exception, `False` to propagate

### 4. Creating Context Managers with `@contextmanager`

The `contextlib.contextmanager` decorator makes it easier:

```python
from contextlib import contextmanager
import time

@contextmanager
def timer(name):
    """Context manager to time code blocks"""
    print(f"Starting {name}")
    start = time.time()

    try:
        yield  # Execution pauses here, 'with' block runs
    finally:
        # Cleanup always runs, even if exception occurs
        elapsed = time.time() - start
        print(f"{name} took {elapsed:.2f}s")

# Usage
with timer("Data loading"):
    data = load_large_dataset()
# Timing printed automatically

# Can yield a value
@contextmanager
def temporary_file(filename):
    """Create temporary file, delete after use"""
    f = open(filename, 'w')
    try:
        yield f  # File available in 'with' block
    finally:
        f.close()
        os.remove(filename)  # Cleanup

with temporary_file('temp.txt') as f:
    f.write("temporary data")
# File automatically deleted
```

### 5. ML-Specific Context Managers

```python
import torch
from contextlib import contextmanager

@contextmanager
def torch_device(device='cuda'):
    """Temporarily move model to device"""
    original_device = torch.cuda.current_device() if torch.cuda.is_available() else 'cpu'

    torch.cuda.set_device(device)
    try:
        yield
    finally:
        torch.cuda.set_device(original_device)

@contextmanager
def evaluation_mode(model):
    """Temporarily set model to eval mode"""
    was_training = model.training
    model.eval()

    try:
        with torch.no_grad():  # Nested context managers!
            yield model
    finally:
        if was_training:
            model.train()

# Usage
with evaluation_mode(my_model):
    predictions = my_model(test_data)
# Model back to original training state
```

## Try It

**Exercise 1**: Timer context manager

```python
from contextlib import contextmanager
import time

@contextmanager
def measure_time():
    start = time.time()
    yield
    end = time.time()
    print(f"Execution time: {end - start:.4f}s")

# Test it
with measure_time():
    total = sum(range(1000000))
```

**Exercise 2**: Resource manager class

```python
class GPUMemoryManager:
    def __init__(self, device='cuda:0'):
        self.device = device

    def __enter__(self):
        if torch.cuda.is_available():
            torch.cuda.set_device(self.device)
            self.initial_memory = torch.cuda.memory_allocated()
            print(f"GPU memory at start: {self.initial_memory / 1e9:.2f} GB")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if torch.cuda.is_available():
            final_memory = torch.cuda.memory_allocated()
            print(f"GPU memory at end: {final_memory / 1e9:.2f} GB")
            print(f"Memory used: {(final_memory - self.initial_memory) / 1e9:.2f} GB")
        return False

# Usage
with GPUMemoryManager('cuda:0'):
    model = load_large_model()
    output = model(input_data)
```

**Exercise 3**: Nested context managers

```python
@contextmanager
def managed_model(model_path):
    """Load model, ensure cleanup"""
    print(f"Loading model from {model_path}")
    model = torch.load(model_path)

    try:
        yield model
    finally:
        print("Cleaning up model")
        del model
        torch.cuda.empty_cache()

# Multiple context managers
with managed_model('model.pt') as model, \
     open('results.txt', 'w') as f:
    predictions = model(data)
    f.write(str(predictions))
# Both automatically cleaned up
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the purpose of `__enter__` and `__exit__` methods?
2. **Why** does `__exit__` receive exception information as parameters?
3. **When** should `__exit__` return `True` vs `False`?
4. **How** do you create a context manager using `@contextmanager`?
5. **Compare**: Class-based vs decorator-based context managers - when to use each?

<details>
<summary>Click to reveal answers</summary>

1. **`__enter__` sets up the resource** and returns it (available as `as` variable). **`__exit__` cleans up the resource** and is guaranteed to run even if exceptions occur. This implements the context manager protocol for use with `with` statements.

2. **`__exit__` receives exception info** so it can handle cleanup differently based on whether an error occurred. It can suppress exceptions by returning `True`, log errors, or perform special cleanup for specific exceptions. Parameters are `(exc_type, exc_value, traceback)` - all `None` if no exception.

3. **Return `True` to suppress the exception** (prevent it from propagating), return `False` to let it propagate normally. Most context managers return `False` because you usually want to see errors. Return `True` only when you want to handle/ignore specific exceptions (like `suppress()` context manager).

4. **Use `@contextmanager` decorator** on a generator function. Use `yield` to mark where the `with` block executes. Put setup before `yield`, cleanup in `finally` after `yield`. Example: `@contextmanager def timer(): start = time.time(); yield; print(time.time() - start)`.

5. **Class-based**: Use when you need state management, multiple methods, or complex initialization. Better for reusable, production code. **Decorator-based**: Use for simple, one-off context managers or when you want concise code. The decorator approach is easier to read but class-based is more flexible. For ML: class for model managers, decorator for timing/profiling.

</details>

## Practice Exercises

**Level 1 - Understand**:

Create `context_basics.py`:

```python
from contextlib import contextmanager

@contextmanager
def log_execution(name):
    """Log start and end of code block"""
    print(f"[START] {name}")
    try:
        yield
    finally:
        print(f"[END] {name}")

# Test it
with log_execution("Data processing"):
    print("Processing data...")
    data = [1, 2, 3, 4, 5]
    result = sum(data)
    print(f"Result: {result}")
```

**Level 2 - Apply**:

Create model loading context manager:

```python
import torch
from contextlib import contextmanager

@contextmanager
def load_model_temporarily(model_path, device='cpu'):
    """Load model, use it, then free memory"""
    print(f"Loading model from {model_path}")

    # Setup
    model = torch.load(model_path, map_location=device)
    model.eval()

    try:
        yield model
    finally:
        # Cleanup
        print("Freeing model memory")
        del model
        if device.startswith('cuda'):
            torch.cuda.empty_cache()
        print("Memory freed")

# Usage
with load_model_temporarily('model.pth', device='cuda') as model:
    with torch.no_grad():
        predictions = model(test_data)
    print(f"Predictions: {predictions}")
# Model automatically unloaded, GPU memory freed
```

**Level 3 - Create**:

Build database connection pool manager:

<details>
<summary>Solution</summary>

```python
from contextlib import contextmanager
import threading
from queue import Queue, Empty
import time

class ConnectionPool:
    """Database connection pool with context manager"""

    def __init__(self, max_connections=5):
        self.max_connections = max_connections
        self.available = Queue(maxsize=max_connections)
        self.in_use = set()
        self._lock = threading.Lock()

        # Create initial connections
        for i in range(max_connections):
            conn = self._create_connection(i)
            self.available.put(conn)

    def _create_connection(self, conn_id):
        """Simulate creating a database connection"""
        return {"id": conn_id, "status": "active"}

    @contextmanager
    def get_connection(self, timeout=5):
        """Get connection from pool with automatic return"""
        conn = None
        try:
            # Acquire connection
            conn = self.available.get(timeout=timeout)
            with self._lock:
                self.in_use.add(conn["id"])

            print(f"Acquired connection {conn['id']}")
            yield conn

        except Empty:
            raise Exception("No connections available in pool")

        finally:
            # Always return connection to pool
            if conn:
                with self._lock:
                    self.in_use.discard(conn["id"])
                self.available.put(conn)
                print(f"Returned connection {conn['id']}")

    def stats(self):
        """Pool statistics"""
        return {
            "available": self.available.qsize(),
            "in_use": len(self.in_use),
            "total": self.max_connections
        }

# Usage example
pool = ConnectionPool(max_connections=3)

def query_database(query, pool):
    """Execute query using pool"""
    with pool.get_connection() as conn:
        # Simulate query execution
        time.sleep(0.5)
        return f"Results for: {query}"

# Multiple concurrent queries
import concurrent.futures

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    queries = [f"SELECT * FROM table{i}" for i in range(10)]
    futures = [executor.submit(query_database, q, pool) for q in queries]

    for future in concurrent.futures.as_completed(futures):
        result = future.result()
        print(result)

print(f"\nPool stats: {pool.stats()}")
```

</details>

## Common Mistakes

❌ **Mistake 1**: Forgetting to return from `__enter__`

```python
class BadManager:
    def __enter__(self):
        self.resource = "important"
        # Forgot to return! 'as' variable will be None

    def __exit__(self, *args):
        pass

with BadManager() as resource:
    print(resource)  # Prints: None (not "important")
```

✅ **Instead**: Always return from `__enter__`

```python
class GoodManager:
    def __enter__(self):
        self.resource = "important"
        return self.resource  # or return self

    def __exit__(self, *args):
        pass

with GoodManager() as resource:
    print(resource)  # Prints: "important"
```

---

❌ **Mistake 2**: Not handling exceptions in `__exit__`

```python
class LeakyManager:
    def __enter__(self):
        self.file = open('data.txt', 'w')
        return self.file

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()  # Might not run if exception in cleanup
```

✅ **Instead**: Use try/finally in `__exit__`

```python
class SafeManager:
    def __enter__(self):
        self.file = open('data.txt', 'w')
        return self.file

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            if self.file:
                self.file.close()
        except Exception as e:
            print(f"Error during cleanup: {e}")
        return False
```

---

❌ **Mistake 3**: Using `@contextmanager` without try/finally

```python
@contextmanager
def bad_timer():
    start = time.time()
    yield
    # If exception occurs in 'with' block, this never runs!
    print(f"Time: {time.time() - start}")
```

✅ **Instead**: Always use try/finally

```python
@contextmanager
def good_timer():
    start = time.time()
    try:
        yield
    finally:
        # Always runs, even if exception
        print(f"Time: {time.time() - start}")
```

---

❌ **Mistake 4**: Returning True from `__exit__` by accident

```python
class SilentFailure:
    def __exit__(self, exc_type, exc_value, traceback):
        self.cleanup()
        return True  # Suppresses ALL exceptions!

with SilentFailure():
    raise ValueError("Important error")  # Silently swallowed!
```

✅ **Instead**: Return False (or nothing) unless you specifically want to suppress

```python
class ProperFailure:
    def __exit__(self, exc_type, exc_value, traceback):
        self.cleanup()
        return False  # Let exceptions propagate
```

---

❌ **Mistake 5**: Not chaining context managers properly

```python
# Wrong - nested 'with' statements
with open('input.txt') as f1:
    with open('output.txt', 'w') as f2:
        data = f1.read()
        f2.write(data.upper())
```

✅ **Instead**: Use comma-separated context managers

```python
# Correct - cleaner and more readable
with open('input.txt') as f1, \
     open('output.txt', 'w') as f2:
    data = f1.read()
    f2.write(data.upper())
```

## How This Connects

**Builds on**:
- [Error Handling](../02-intermediate/04-error-handling.md) - Context managers ensure cleanup on errors
- [OOP Basics](../02-intermediate/01-oop-basics.md) - `__enter__`/`__exit__` are special methods
- [Functions](../01-fundamentals/04-functions.md) - `@contextmanager` uses generator functions

**Related concepts**:
- [Decorators](./04-decorators.md) - `@contextmanager` is a decorator
- [Async Programming](./02-async-programming.md) - Async context managers with `async with`
- [Generators](../02-intermediate/03-iterators-generators.md) - `@contextmanager` uses `yield`

**Why this matters for AI**:
- **Resource management**: GPU memory, model weights, dataset handles
- **Training pipelines**: Ensure cleanup on training failure
- **Inference services**: Proper connection handling, model loading/unloading
- **Distributed training**: Locks, synchronization, checkpointing
- **Data pipelines**: File handles, database connections, temporary storage

**Next steps**:
- Learn async context managers for async I/O
- Explore `contextlib` utilities (suppress, redirect, ExitStack)
- Build custom managers for your ML workflows

## Deep Dive Questions (Expert Level)

> **For 12+ years experience**: These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does the `with` statement work under the hood? What bytecode does it generate?

<details>
<summary>Answer: `with` compiles to SETUP_WITH/WITH_CLEANUP opcodes; calls __enter__, stores result, ensures __exit__ in finally block</summary>

**Explanation**:
The `with` statement is syntactic sugar that compiles to specific bytecode operations. When Python encounters `with expr as var:`, it: (1) Evaluates `expr` to get the context manager, (2) Calls `__enter__()` and stores the result in `var`, (3) Executes the body, (4) Calls `__exit__(exc_type, exc_val, tb)` in a finally block to ensure cleanup.

The bytecode sequence uses `SETUP_WITH` (pre-3.11) or `BEFORE_WITH`/`WITH_CLEANUP_START`/`WITH_CLEANUP_FINISH` (3.11+) opcodes. These opcodes set up exception handling that guarantees `__exit__` is called even if the body raises an exception. The exception info is automatically passed to `__exit__`, and if `__exit__` returns truthy, the exception is suppressed.

The key insight: `with` is essentially a try/finally block where the finally clause calls `__exit__` with exception information. This ensures deterministic cleanup regardless of how the block exits (normal return, exception, or even sys.exit).

**Example**:
```python
import dis

# Simple with statement
def with_example():
    with open('file.txt') as f:
        data = f.read()

# Examine bytecode
dis.dis(with_example)
# Shows: SETUP_WITH, POP_TOP, WITH_CLEANUP opcodes

# Equivalent manual implementation
def manual_with():
    mgr = open('file.txt')
    value = mgr.__enter__()
    exc = True
    try:
        try:
            f = value
            data = f.read()
        except:
            exc = False
            if not mgr.__exit__(*sys.exc_info()):
                raise
    finally:
        if exc:
            mgr.__exit__(None, None, None)

# Context manager protocol
class DebugManager:
    def __enter__(self):
        print("__enter__ called")
        return self

    def __exit__(self, exc_type, exc_val, tb):
        print(f"__exit__ called with: {exc_type}, {exc_val}")
        return False  # Don't suppress exceptions

with DebugManager() as mgr:
    print("In with block")
    # raise ValueError("test")  # Uncomment to see exception handling

# Output:
# __enter__ called
# In with block
# __exit__ called with: None, None

# Advanced: ExitStack for dynamic context managers
from contextlib import ExitStack

def dynamic_with(filenames):
    """Open multiple files dynamically"""
    with ExitStack() as stack:
        files = [stack.enter_context(open(fname)) for fname in filenames]
        # All files automatically closed
        return [f.read() for f in files]

# Low-level implementation
class CustomExitStack:
    def __init__(self):
        self._exit_callbacks = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, tb):
        # Call all registered callbacks in reverse order (LIFO)
        suppressed = False
        for callback in reversed(self._exit_callbacks):
            try:
                if callback(exc_type, exc_val, tb):
                    suppressed = True
                    exc_type = exc_val = tb = None
            except Exception:
                exc_type, exc_val, tb = sys.exc_info()
        return suppressed

    def enter_context(self, cm):
        result = cm.__enter__()
        self._exit_callbacks.append(cm.__exit__)
        return result
```

**In Practice**:
Understanding `with` bytecode helps debug context manager issues. If `__exit__` isn't called, check that your context manager implements the protocol correctly. For ML: when building custom model loaders or GPU memory managers, ensure `__exit__` is exception-safe. Use `ExitStack` when you need to manage a dynamic number of resources (e.g., opening N model checkpoint files based on runtime config). The LIFO (last-in-first-out) cleanup order matters when resources have dependencies.

**Key Takeaway**: `with` compiles to opcodes that guarantee `__exit__` is called via a finally block with exception info; the context manager protocol is a language-level feature, not just a convention.

</details>

2. What happens if `__enter__` raises an exception? What about if `__exit__` raises?

<details>
<summary>Answer: If __enter__ raises, __exit__ is NOT called; if __exit__ raises, it propagates (unless __exit__ itself suppressed original exception)</summary>

**Explanation**:
**If `__enter__` raises**: The exception propagates immediately and `__exit__` is NOT called. This makes sense because the resource was never successfully acquired, so there's nothing to clean up. The context manager never "entered", so it doesn't need to "exit". This is a critical edge case for resource management.

**If `__exit__` raises** (while no exception in body): The exception propagates normally. **If `__exit__` raises while handling an exception** (exception occurred in body): The new exception from `__exit__` replaces the original exception from the body. This can hide the root cause! To preserve the original exception, use exception chaining with `raise ... from ...` or reraise the original.

**If both body and `__exit__` raise**: Only the `__exit__` exception propagates (the body exception is lost unless you use exception chaining). This is why `__exit__` should avoid raising exceptions during cleanup - use try/except within `__exit__`.

**Example**:
```python
import sys

# Case 1: __enter__ raises
class BrokenEnter:
    def __enter__(self):
        raise ValueError("Enter failed!")

    def __exit__(self, *args):
        print("Exit called")  # This won't print
        return False

try:
    with BrokenEnter() as mgr:
        print("Body")
except ValueError as e:
    print(f"Caught: {e}")  # "Enter failed!"
# Output: "Caught: Enter failed!" (Exit NOT called)

# Case 2: __exit__ raises (no exception in body)
class BrokenExit:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        raise RuntimeError("Exit failed!")

try:
    with BrokenExit():
        print("Body executed")
except RuntimeError as e:
    print(f"Caught: {e}")  # "Exit failed!"
# Output: "Body executed", then "Caught: Exit failed!"

# Case 3: Both body and __exit__ raise
class DoubleFailure:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, tb):
        print(f"Exit sees exception: {exc_type}")
        raise RuntimeError("Exit failed!")

try:
    with DoubleFailure():
        raise ValueError("Body failed!")
except Exception as e:
    print(f"Caught: {type(e).__name__}: {e}")
# Output: "Exit sees exception: ValueError"
#         "Caught: RuntimeError: Exit failed!"
# Original ValueError is LOST!

# Case 4: Proper exception handling in __exit__
class SafeExit:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, tb):
        try:
            # Cleanup code that might fail
            self.cleanup()
        except Exception as cleanup_error:
            if exc_type is None:
                # No original exception, propagate cleanup error
                raise
            else:
                # Original exception exists, preserve it
                print(f"Cleanup failed but preserving original exception: {cleanup_error}")
                return False  # Let original exception propagate
        return False

    def cleanup(self):
        raise IOError("Cleanup failed")

try:
    with SafeExit():
        raise ValueError("Original error")
except ValueError as e:
    print(f"Caught original: {e}")
# Output: "Cleanup failed but preserving original exception..."
#         "Caught original: Original error"

# Case 5: Using exception chaining
class ChainedExit:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, tb):
        try:
            self.cleanup()
        except Exception as cleanup_error:
            if exc_type is not None:
                # Chain exceptions to preserve both
                raise cleanup_error from exc_val
            raise
        return False

    def cleanup(self):
        raise IOError("Cleanup failed")

try:
    with ChainedExit():
        raise ValueError("Original error")
except IOError as e:
    print(f"Cleanup error: {e}")
    print(f"Caused by: {e.__cause__}")
# Output: Both exceptions visible in traceback

# Production pattern: Safe cleanup
class ProductionManager:
    def __enter__(self):
        self.resources = []
        try:
            self.resources.append(self.acquire_resource_1())
            self.resources.append(self.acquire_resource_2())
            return self
        except:
            # If __enter__ fails partway, cleanup acquired resources
            self.__exit__(*sys.exc_info())
            raise

    def __exit__(self, exc_type, exc_val, tb):
        errors = []
        for resource in reversed(self.resources):
            try:
                resource.release()
            except Exception as e:
                errors.append(e)

        if errors:
            # Log errors but don't hide original exception
            print(f"Cleanup errors: {errors}")

        return False  # Never suppress exceptions

    def acquire_resource_1(self):
        return type('R', (), {'release': lambda: None})()

    def acquire_resource_2(self):
        return type('R', (), {'release': lambda: None})()
```

**In Practice**:
**For ML resource management**: If loading a model fails (`__enter__` raises), you don't want to try cleaning up uninitialized GPU memory. For inference services, if `__exit__` cleanup fails (can't release database connection), log it but don't hide the original inference error - the inference error is more important for debugging.

**Design principle**: `__exit__` should be as exception-safe as possible. Use try/except around cleanup code. Never let cleanup exceptions hide the original exception. For multi-resource managers, clean up all resources even if one cleanup fails (collect errors and log them).

**Key Takeaway**: If `__enter__` raises, `__exit__` is NOT called; if `__exit__` raises, it can hide the original exception - always protect cleanup code with try/except in `__exit__`.

</details>

3. Can you have nested context managers? How does cleanup order work?

<details>
<summary>Answer: Yes, cleanup is LIFO (last-in-first-out); inner context managers exit before outer ones</summary>

**Explanation**:
Nested context managers clean up in **LIFO (last-in-first-out) order** - the most recently entered context exits first, like a stack. This mirrors the behavior of nested function calls and ensures proper resource dependency management. If resource B depends on resource A, you acquire A first then B, and cleanup happens B then A.

Python supports two syntaxes for multiple context managers: (1) Nested `with` statements, (2) Comma-separated managers in single `with`. Both have identical semantics - LIFO cleanup order. The second syntax is preferred for readability.

If an inner `__exit__` suppresses an exception (returns True), outer `__exit__` methods still run but see no exception (all parameters are None). If an `__exit__` raises, it propagates outward and remaining outer `__exit__` methods don't run unless you use exception handling.

**Example**:
```python
from contextlib import contextmanager
import sys

# Demonstration of cleanup order
class Manager:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print(f"  -> Entering {self.name}")
        return self

    def __exit__(self, exc_type, exc_val, tb):
        print(f"  <- Exiting {self.name} (exception: {exc_type})")
        return False

# Nested with statements (verbose)
print("Nested with statements:")
with Manager("A"):
    with Manager("B"):
        with Manager("C"):
            print("    In innermost block")
# Output:
#   -> Entering A
#   -> Entering B
#   -> Entering C
#     In innermost block
#   <- Exiting C
#   <- Exiting B
#   <- Exiting A

# Comma-separated (preferred)
print("\nComma-separated:")
with Manager("A"), Manager("B"), Manager("C"):
    print("    In block")
# Same output as nested version

# Exception propagation
print("\nWith exception:")
try:
    with Manager("A"), Manager("B"), Manager("C"):
        raise ValueError("Error in body")
except ValueError:
    pass
# Output shows all three exit with exception info

# Inner manager suppresses exception
class SuppressingManager:
    def __init__(self, name, suppress=False):
        self.name = name
        self.suppress = suppress

    def __enter__(self):
        print(f"  -> Enter {self.name}")
        return self

    def __exit__(self, exc_type, exc_val, tb):
        print(f"  <- Exit {self.name}, exc={exc_type}, suppress={self.suppress}")
        return self.suppress  # True suppresses exception

print("\nException suppression:")
with SuppressingManager("A"), \
     SuppressingManager("B", suppress=True), \
     SuppressingManager("C"):
    raise ValueError("Test error")
# B suppresses exception, so A sees no exception
# Output:
#   -> Enter A
#   -> Enter B
#   -> Enter C
#   <- Exit C, exc=ValueError, suppress=False
#   <- Exit B, exc=ValueError, suppress=True
#   <- Exit A, exc=None, suppress=False

# Dynamic number of context managers with ExitStack
from contextlib import ExitStack

def open_multiple_files(filenames):
    """Open multiple files with proper cleanup order"""
    with ExitStack() as stack:
        files = [stack.enter_context(open(fname)) for fname in filenames]
        # Process all files
        return [f.read() for f in files]
    # All files closed in reverse order

# Real-world ML example: Nested resource management
@contextmanager
def gpu_memory_pool(device):
    """Allocate GPU memory pool"""
    print(f"Allocating memory pool on {device}")
    torch.cuda.set_device(device)
    pool = torch.cuda.caching_allocator_alloc(1024 * 1024 * 1024)  # 1GB
    try:
        yield pool
    finally:
        print(f"Freeing memory pool on {device}")
        torch.cuda.caching_allocator_delete(pool)

@contextmanager
def loaded_model(path, device):
    """Load model to device"""
    print(f"Loading model from {path}")
    model = torch.load(path, map_location=device)
    try:
        yield model
    finally:
        print("Unloading model")
        del model

@contextmanager
def inference_mode():
    """Set inference mode"""
    print("Entering inference mode")
    torch.set_grad_enabled(False)
    try:
        yield
    finally:
        print("Exiting inference mode")
        torch.set_grad_enabled(True)

# Nested ML context managers
def run_inference(model_path, data):
    with gpu_memory_pool('cuda:0'), \
         loaded_model(model_path, 'cuda:0') as model, \
         inference_mode():
        return model(data)
# Cleanup order: inference_mode -> model -> memory_pool

# Complex nesting with error handling
class Transaction:
    def __init__(self, name):
        self.name = name
        self.committed = False

    def __enter__(self):
        print(f"Begin transaction: {self.name}")
        return self

    def __exit__(self, exc_type, exc_val, tb):
        if exc_type is None:
            print(f"Commit transaction: {self.name}")
            self.committed = True
        else:
            print(f"Rollback transaction: {self.name}")
        return False

# Nested transactions
with Transaction("Outer"):
    print("  Outer work")
    with Transaction("Inner"):
        print("    Inner work")
        # If inner raises, inner rolls back, then outer rolls back
# Both commit if no exception

# ExitStack for conditional resources
def process_with_optional_logging(data, log_file=None):
    with ExitStack() as stack:
        # Conditionally add context managers
        if log_file:
            logger = stack.enter_context(open(log_file, 'w'))
        else:
            logger = None

        # Main work
        result = process(data)

        if logger:
            logger.write(f"Processed {result}")

        return result
```

**In Practice**:
**For ML pipelines**: Order matters! If you're managing (1) database connection, (2) model loading, (3) GPU allocation, acquire in that order and cleanup happens in reverse. Model depends on GPU memory, so GPU clears after model unloads.

**Design pattern**: Use `ExitStack` when the number of resources is dynamic (e.g., loading N model checkpoints based on ensemble size). Use comma-separated `with` for fixed resources. Always consider dependency order - acquire dependencies first.

**Testing cleanup**: Verify LIFO order in tests, especially for complex resource chains. Check that partial failures (exception in middle context manager) still clean up all acquired resources.

**Key Takeaway**: Nested context managers clean up in LIFO order (last in, first out); use comma-separated syntax for readability; `ExitStack` handles dynamic numbers of resources.

</details>

4. How do you implement a reentrant context manager (can be entered multiple times)?

<details>
<summary>Answer: Track entry count; only cleanup on final exit; threading.RLock is the classic example</summary>

**Explanation**:
A **reentrant** (or recursive) context manager can be entered multiple times by the same thread/context without deadlocking or corrupting state. Each `__enter__` increments a counter, each `__exit__` decrements it, and cleanup only happens when the counter reaches zero. This is essential for recursive functions or nested calls that need the same resource.

The classic example is `threading.RLock` (reentrant lock) - the same thread can acquire it multiple times and must release it the same number of times. For ML: a model caching manager that can be nested (outer call loads model, inner call reuses it without reloading).

Key considerations: (1) Thread safety (if used in multithreaded code), (2) Exception handling (decrement counter even if exception occurs), (3) Resource state (track whether resource is initialized), (4) Return value (often return self or the resource on every enter).

**Example**:
```python
import threading
from contextlib import contextmanager

# Basic reentrant context manager
class ReentrantManager:
    def __init__(self):
        self._depth = 0
        self._resource = None
        self._lock = threading.Lock()

    def __enter__(self):
        with self._lock:
            self._depth += 1
            if self._depth == 1:
                # First entry - acquire resource
                print("Acquiring resource")
                self._resource = self._acquire_resource()
            else:
                print(f"Reentrant call (depth={self._depth})")
            return self._resource

    def __exit__(self, exc_type, exc_val, tb):
        with self._lock:
            self._depth -= 1
            if self._depth == 0:
                # Final exit - release resource
                print("Releasing resource")
                self._release_resource()
                self._resource = None
            else:
                print(f"Exiting reentrant call (depth={self._depth})")
        return False

    def _acquire_resource(self):
        return "Expensive Resource"

    def _release_resource(self):
        pass

# Usage - nested calls share same resource
mgr = ReentrantManager()

with mgr as res1:
    print(f"Outer: {res1}")
    with mgr as res2:
        print(f"Inner: {res2}")
        assert res1 is res2  # Same resource
    print("Inner exited, resource still available")
print("Outer exited, resource released")

# ML Example: Model cache manager
class ModelCache:
    """Reentrant model loader with caching"""

    def __init__(self):
        self._models = {}
        self._ref_counts = {}
        self._lock = threading.Lock()

    @contextmanager
    def load_model(self, model_path):
        """Load model, cache for nested calls"""
        with self._lock:
            if model_path not in self._models:
                print(f"Loading model: {model_path}")
                self._models[model_path] = self._load_from_disk(model_path)
                self._ref_counts[model_path] = 0

            self._ref_counts[model_path] += 1
            current_count = self._ref_counts[model_path]
            print(f"Model {model_path} ref count: {current_count}")

        try:
            yield self._models[model_path]
        finally:
            with self._lock:
                self._ref_counts[model_path] -= 1
                if self._ref_counts[model_path] == 0:
                    print(f"Unloading model: {model_path}")
                    del self._models[model_path]
                    del self._ref_counts[model_path]

    def _load_from_disk(self, path):
        """Simulate expensive model loading"""
        import time
        time.sleep(0.1)
        return {"path": path, "weights": "..."}

# Usage in recursive function
cache = ModelCache()

def recursive_inference(data, depth, model_path):
    with cache.load_model(model_path) as model:
        print(f"Depth {depth}: Using {model['path']}")
        if depth > 0:
            recursive_inference(data, depth - 1, model_path)
        return "result"

recursive_inference("data", 3, "model.pt")
# Model loaded once, used 4 times, unloaded once

# Thread-safe reentrant manager
class ThreadSafeReentrant:
    """Reentrant per-thread (like RLock)"""

    def __init__(self):
        self._local = threading.local()

    def __enter__(self):
        if not hasattr(self._local, 'depth'):
            self._local.depth = 0
            self._local.resource = None

        self._local.depth += 1
        if self._local.depth == 1:
            print(f"[{threading.current_thread().name}] Acquiring")
            self._local.resource = self._acquire()
        else:
            print(f"[{threading.current_thread().name}] Reentrant (depth={self._local.depth})")

        return self._local.resource

    def __exit__(self, *args):
        self._local.depth -= 1
        if self._local.depth == 0:
            print(f"[{threading.current_thread().name}] Releasing")
            self._release()
            self._local.resource = None
        return False

    def _acquire(self):
        return "resource"

    def _release(self):
        pass

# Each thread has independent reentrant state
mgr = ThreadSafeReentrant()

def thread_func():
    with mgr:  # Thread A depth=1
        with mgr:  # Thread A depth=2
            print(f"[{threading.current_thread().name}] In nested block")

t1 = threading.Thread(target=thread_func, name="T1")
t2 = threading.Thread(target=thread_func, name="T2")
t1.start()
t2.start()
t1.join()
t2.join()
# Each thread manages its own depth independently

# Production pattern: Reentrant transaction manager
class TransactionManager:
    """Reentrant database transactions (savepoints)"""

    def __init__(self, db_connection):
        self.conn = db_connection
        self._depth = 0
        self._savepoints = []

    def __enter__(self):
        self._depth += 1
        if self._depth == 1:
            print("BEGIN TRANSACTION")
            self.conn.execute("BEGIN")
        else:
            # Nested transaction uses savepoints
            savepoint = f"sp_{self._depth}"
            print(f"SAVEPOINT {savepoint}")
            self.conn.execute(f"SAVEPOINT {savepoint}")
            self._savepoints.append(savepoint)
        return self

    def __exit__(self, exc_type, exc_val, tb):
        if exc_type is not None:
            if self._depth == 1:
                print("ROLLBACK TRANSACTION")
                self.conn.execute("ROLLBACK")
            else:
                savepoint = self._savepoints.pop()
                print(f"ROLLBACK TO {savepoint}")
                self.conn.execute(f"ROLLBACK TO {savepoint}")
        else:
            if self._depth == 1:
                print("COMMIT TRANSACTION")
                self.conn.execute("COMMIT")
            else:
                # Savepoint automatically released on commit
                self._savepoints.pop()

        self._depth -= 1
        return False

# Nested transactions with savepoints
# with TransactionManager(conn):
#     conn.execute("INSERT ...")
#     with TransactionManager(conn):  # Savepoint
#         conn.execute("INSERT ...")
#         # If inner raises, only inner rolled back

# Anti-pattern: Non-thread-safe reentrant (WRONG)
class BrokenReentrant:
    def __init__(self):
        self._depth = 0  # Shared across threads - RACE CONDITION!

    def __enter__(self):
        self._depth += 1  # Not atomic - multiple threads can see same value
        return self

    def __exit__(self, *args):
        self._depth -= 1  # Can become negative in race condition!
        return False

# This breaks with concurrent threads - use locks or thread-local storage
```

**In Practice**:
**For ML workflows**: Use reentrant managers for model caching (outer function loads model, inner function reuses it without reload overhead). For training pipelines, reentrant checkpoint managers allow nested saving (epoch checkpoint + batch checkpoint).

**Design considerations**:
- **Thread safety**: Use locks (if global state) or thread-local storage (if per-thread)
- **Exception handling**: Counter must decrement even if body raises
- **Resource initialization**: Check if resource exists before reacquiring
- **Ref counting**: Track references if resource is expensive to create/destroy

**When to use**: Recursive algorithms needing same resource, nested function calls sharing context, transaction systems with savepoints, cached resource loading.

**Key Takeaway**: Reentrant context managers track entry depth; cleanup only on final exit (depth=0); use locks for thread safety or thread-local storage for per-thread reentrancy.

</details>

5. What is `contextlib.ExitStack` and when should you use it?

<details>
<summary>Answer: ExitStack manages dynamic number of context managers; use for runtime-determined resources or conditional cleanup</summary>

**Explanation**:
`ExitStack` is a context manager that collects other context managers dynamically and ensures they all clean up properly. Unlike fixed `with` statements where you know the resources at write-time, `ExitStack` lets you add context managers at runtime based on conditions or loops. It maintains a stack of cleanup callbacks and executes them in LIFO order on exit.

Key methods: (1) `enter_context(cm)` - enter a context manager and register its exit, (2) `push(exit_func)` - register a cleanup callback, (3) `callback(func, *args, **kwargs)` - register a function to call on cleanup, (4) `pop_all()` - transfer cleanup responsibility to another ExitStack (for deferred cleanup).

Use cases: Opening N files (where N is determined at runtime), conditionally acquiring resources based on config, managing variable-length chains of context managers (e.g., nested transactions), temporarily transferring resource ownership.

**Example**:
```python
from contextlib import ExitStack, contextmanager
import os

# Problem: Dynamic number of files
def process_files_wrong(filenames):
    files = []
    for fname in filenames:
        files.append(open(fname))
    # Problem: If exception occurs, files never closed!

    try:
        return [f.read() for f in files]
    finally:
        for f in files:
            f.close()

# Solution 1: Manual nested with (doesn't work for dynamic N)
def process_fixed_files():
    with open('f1.txt') as f1, \
         open('f2.txt') as f2, \
         open('f3.txt') as f3:
        return [f1.read(), f2.read(), f3.read()]
# Only works if you know count at write-time

# Solution 2: ExitStack (works for any N)
def process_files_right(filenames):
    with ExitStack() as stack:
        files = [stack.enter_context(open(fname)) for fname in filenames]
        return [f.read() for f in files]
# All files automatically closed in reverse order

# Example: Conditional resources
def process_with_optional_resources(use_cache=False, use_logging=False):
    with ExitStack() as stack:
        # Conditionally acquire resources
        if use_cache:
            cache = stack.enter_context(cache_connection())
        else:
            cache = None

        if use_logging:
            logger = stack.enter_context(open('log.txt', 'w'))
        else:
            logger = None

        # Main logic
        result = do_work(cache, logger)
        return result
    # Only acquired resources are cleaned up

# Example: Custom cleanup callbacks
def with_custom_cleanup():
    with ExitStack() as stack:
        # Register cleanup function
        temp_file = 'temp_data.txt'
        with open(temp_file, 'w') as f:
            f.write("data")

        # Register cleanup callback
        stack.callback(os.remove, temp_file)
        stack.callback(print, "Cleanup complete")

        # Do work with temp file
        process_temp_file(temp_file)
    # Callbacks executed in reverse order

# Example: Push multiple cleanups
def batch_resource_manager():
    with ExitStack() as stack:
        # Add cleanup for each resource
        for i in range(5):
            resource = acquire_resource(i)
            # Register a lambda that captures current i
            stack.callback(lambda r=resource: release_resource(r))

        # Use all resources
        do_work_with_resources()

# ML Example: Dynamic model ensemble loading
class EnsemblePredictor:
    """Load variable number of models based on config"""

    def predict(self, model_paths, data):
        with ExitStack() as stack:
            # Load all models
            models = []
            for path in model_paths:
                model = stack.enter_context(self.load_model(path))
                models.append(model)

            # Run inference on all models
            predictions = [model(data) for model in models]

            # Ensemble predictions
            return self.ensemble(predictions)

    @contextmanager
    def load_model(self, path):
        print(f"Loading {path}")
        model = torch.load(path)
        try:
            yield model
        finally:
            print(f"Unloading {path}")
            del model
            torch.cuda.empty_cache()

    def ensemble(self, predictions):
        return sum(predictions) / len(predictions)

# Example: pop_all for deferred cleanup
def deferred_cleanup_example():
    """Transfer resource ownership"""
    with ExitStack() as stack:
        # Acquire resources
        f1 = stack.enter_context(open('file1.txt'))
        f2 = stack.enter_context(open('file2.txt'))

        # Decide to keep resources alive
        if need_to_defer():
            # Transfer cleanup responsibility
            cleanup_stack = stack.pop_all()
            return f1, f2, cleanup_stack
        else:
            # Normal cleanup happens here
            return None, None, None

# Caller handles deferred cleanup
f1, f2, cleanup = deferred_cleanup_example()
if cleanup:
    # Do more work with files
    process(f1, f2)
    # Manually trigger cleanup
    cleanup.close()

# Example: Nested ExitStacks
def nested_stacks():
    with ExitStack() as outer_stack:
        # Outer resources
        db = outer_stack.enter_context(database_connection())

        # Inner stack for batch processing
        for batch in get_batches():
            with ExitStack() as batch_stack:
                # Temporary resources for this batch
                temp_file = batch_stack.enter_context(open(f'temp_{batch}.txt', 'w'))
                batch_stack.callback(cleanup_batch, batch)

                process_batch(db, temp_file, batch)
            # Batch resources cleaned up

        # Database cleaned up here

# Production example: ML data pipeline
class DataPipeline:
    """Pipeline with dynamic data sources"""

    def process(self, source_configs):
        with ExitStack() as stack:
            # Open all data sources
            sources = []
            for config in source_configs:
                if config['type'] == 'file':
                    source = stack.enter_context(open(config['path']))
                elif config['type'] == 'database':
                    source = stack.enter_context(self.db_connection(config))
                elif config['type'] == 'api':
                    source = stack.enter_context(self.api_client(config))
                sources.append(source)

            # Process all sources
            data = []
            for source in sources:
                data.extend(self.read_source(source))

            return data
        # All sources automatically closed

# Example: Exception handling with ExitStack
def exitstack_exception_handling():
    try:
        with ExitStack() as stack:
            f1 = stack.enter_context(open('file1.txt'))
            f2 = stack.enter_context(open('file2.txt'))

            # Register cleanup callbacks
            stack.callback(print, "Cleaning up")

            # If exception occurs here
            raise ValueError("Error!")
    except ValueError:
        print("Exception caught")
    # All cleanups still executed

# Comparison: With vs ExitStack
def comparison():
    # Static - known at write-time
    with open('f1.txt') as f1, \
         open('f2.txt') as f2:
        process(f1, f2)

    # Dynamic - determined at runtime
    filenames = get_filenames_from_config()
    with ExitStack() as stack:
        files = [stack.enter_context(open(f)) for f in filenames]
        process(*files)

# Advanced: Reusable ExitStack
class ResourcePool:
    """Pool of resources managed by ExitStack"""

    def __init__(self):
        self.stack = ExitStack()

    def add_resource(self, context_manager):
        """Add resource to pool"""
        return self.stack.enter_context(context_manager)

    def add_cleanup(self, func, *args, **kwargs):
        """Add cleanup callback"""
        self.stack.callback(func, *args, **kwargs)

    def close(self):
        """Cleanup all resources"""
        self.stack.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc_details):
        self.stack.__exit__(*exc_details)
        return False

# Usage
with ResourcePool() as pool:
    f1 = pool.add_resource(open('file1.txt'))
    f2 = pool.add_resource(open('file2.txt'))
    pool.add_cleanup(print, "All cleaned up")

    process(f1, f2)
# All resources and callbacks cleaned up

# Helper stubs
def cache_connection():
    @contextmanager
    def ctx():
        yield "cache"
    return ctx()

def do_work(cache, logger):
    return "result"

def process_temp_file(path):
    pass

def acquire_resource(i):
    return f"resource_{i}"

def release_resource(r):
    print(f"Released {r}")

def do_work_with_resources():
    pass

def need_to_defer():
    return True

def database_connection():
    @contextmanager
    def ctx():
        yield "db_conn"
    return ctx()

def cleanup_batch(batch):
    pass

def get_batches():
    return [1, 2, 3]

def process_batch(db, temp, batch):
    pass

def get_filenames_from_config():
    return ['f1.txt', 'f2.txt', 'f3.txt']

def process(*args):
    pass
```

**In Practice**:
**When to use ExitStack**:
- ✅ Dynamic number of resources (N determined at runtime)
- ✅ Conditional resources (based on config or user input)
- ✅ Loops opening resources (files, connections, models)
- ✅ Variable-length chains of context managers
- ✅ Registering cleanup callbacks (not just context managers)
- ✅ Deferred cleanup (pop_all transfers responsibility)

**ML use cases**:
```python
# Load ensemble of N models
with ExitStack() as stack:
    models = [stack.enter_context(load_model(p)) for p in model_paths]

# Conditional GPU allocation
with ExitStack() as stack:
    if use_gpu:
        stack.enter_context(torch.cuda.device(0))

# Batch processing with temp files
with ExitStack() as stack:
    temps = [stack.enter_context(tempfile.NamedTemporaryFile()) for _ in batches]
```

**Key Takeaway**: Use `ExitStack` when the number or type of context managers is determined at runtime; it manages dynamic resources with guaranteed LIFO cleanup and supports custom callbacks.

</details>

6. How do async context managers differ from regular ones? Implement both versions.

<details>
<summary>Answer: Async context managers use `async with`, implement `__aenter__`/`__aexit__`, allow awaiting in setup/cleanup</summary>

**Explanation**:
**Async context managers** use `async with` instead of `with` and implement `__aenter__` and `__aexit__` (async versions of `__enter__`/`__exit__`). The key difference: you can `await` inside these methods, allowing async operations during setup and cleanup (e.g., async database connection, async file I/O, async API calls).

Regular context managers block during setup/cleanup. Async context managers yield control to the event loop, allowing other coroutines to run while waiting for I/O. This is essential for async applications (FastAPI, aiohttp servers) where blocking would freeze the entire service.

The protocol: `__aenter__` and `__aexit__` must be `async def`. Use `async with` to enter. The `@asynccontextmanager` decorator (from contextlib) simplifies creation, similar to `@contextmanager` but for async generators.

**Example**:
```python
import asyncio
import aiohttp
import aiofiles
from contextlib import asynccontextmanager

# Regular (sync) context manager
class SyncDatabaseConnection:
    def __init__(self, db_url):
        self.db_url = db_url
        self.conn = None

    def __enter__(self):
        print("Connecting (blocking)...")
        time.sleep(1)  # Blocks entire thread!
        self.conn = f"Connection to {self.db_url}"
        return self.conn

    def __exit__(self, exc_type, exc_val, tb):
        print("Disconnecting (blocking)...")
        time.sleep(0.5)  # Blocks entire thread!
        self.conn = None
        return False

# Async context manager
class AsyncDatabaseConnection:
    def __init__(self, db_url):
        self.db_url = db_url
        self.conn = None

    async def __aenter__(self):
        print("Connecting (async)...")
        await asyncio.sleep(1)  # Yields control to event loop
        self.conn = f"Connection to {self.db_url}"
        return self.conn

    async def __aexit__(self, exc_type, exc_val, tb):
        print("Disconnecting (async)...")
        await asyncio.sleep(0.5)  # Yields control
        self.conn = None
        return False

# Usage comparison
def sync_example():
    with SyncDatabaseConnection("postgres://db") as conn:
        print(f"Using {conn}")
        # Blocks here for 1 second during connection

async def async_example():
    async with AsyncDatabaseConnection("postgres://db") as conn:
        print(f"Using {conn}")
        # Other coroutines can run during connection

# Run async example
asyncio.run(async_example())

# Async context manager with decorator
@asynccontextmanager
async def async_timer(name):
    """Async version of timer"""
    print(f"[{name}] Starting")
    start = asyncio.get_event_loop().time()

    try:
        yield
    finally:
        elapsed = asyncio.get_event_loop().time() - start
        print(f"[{name}] Took {elapsed:.2f}s")
        # Can await here if needed
        await asyncio.sleep(0)  # Example async cleanup

# Usage
async def timed_work():
    async with async_timer("API call"):
        await asyncio.sleep(1)
        print("Work done")

asyncio.run(timed_work())

# Real-world: Async file operations
@asynccontextmanager
async def async_file(filename, mode='r'):
    """Async file context manager"""
    print(f"Opening {filename} (async)")
    file = await aiofiles.open(filename, mode)

    try:
        yield file
    finally:
        print(f"Closing {filename} (async)")
        await file.close()

# Real-world: Async HTTP session
@asynccontextmanager
async def http_session():
    """Async HTTP client session"""
    print("Creating session")
    session = aiohttp.ClientSession()

    try:
        yield session
    finally:
        print("Closing session")
        await session.close()

# Usage
async def fetch_data():
    async with http_session() as session:
        async with session.get('https://api.example.com/data') as response:
            return await response.json()

# ML Example: Async model server
class AsyncModelServer:
    """Async model loading for inference service"""

    def __init__(self, model_path, device='cuda'):
        self.model_path = model_path
        self.device = device
        self.model = None

    async def __aenter__(self):
        print(f"Loading model from {self.model_path}")
        # Simulate async model loading (e.g., from S3, remote storage)
        await asyncio.sleep(2)

        # In reality: await async_download_from_s3(self.model_path)
        self.model = {"weights": "...", "config": "..."}

        print("Model loaded")
        return self

    async def __aexit__(self, exc_type, exc_val, tb):
        print("Unloading model")
        # Async cleanup - maybe upload metrics, save checkpoints
        await asyncio.sleep(0.5)

        self.model = None
        print("Model unloaded")
        return False

    async def predict(self, data):
        """Async inference"""
        await asyncio.sleep(0.1)  # Simulate inference
        return f"Prediction for {data}"

# Usage in FastAPI-like service
async def handle_request(model_path, data):
    async with AsyncModelServer(model_path) as server:
        result = await server.predict(data)
        return result

# Nested async context managers
@asynccontextmanager
async def async_gpu_lock(device):
    """Async GPU lock"""
    print(f"Acquiring GPU {device}")
    await asyncio.sleep(0.1)  # Simulate async lock acquisition

    try:
        yield device
    finally:
        print(f"Releasing GPU {device}")
        await asyncio.sleep(0.1)

@asynccontextmanager
async def async_model_cache(model_path):
    """Async model cache"""
    print(f"Loading model (cached)")
    await asyncio.sleep(0.5)
    model = {"path": model_path}

    try:
        yield model
    finally:
        print("Unloading model (cache)")
        await asyncio.sleep(0.1)

# Nested usage
async def inference_with_resources(model_path, device, data):
    async with async_gpu_lock(device):
        async with async_model_cache(model_path) as model:
            # Both resources managed asynchronously
            await asyncio.sleep(0.1)
            return f"Result from {model['path']}"

# AsyncExitStack for dynamic async resources
from contextlib import AsyncExitStack

async def process_multiple_async_files(filenames):
    """Open multiple files asynchronously"""
    async with AsyncExitStack() as stack:
        files = []
        for fname in filenames:
            file = await stack.enter_async_context(async_file(fname))
            files.append(file)

        # Read all files
        contents = []
        for file in files:
            content = await file.read()
            contents.append(content)

        return contents
    # All files closed asynchronously

# Comparison: Sync vs Async throughput
async def compare_throughput():
    """Show why async matters"""

    # Sync version (simulated in async)
    start = asyncio.get_event_loop().time()

    # Sequential blocking operations
    for i in range(10):
        # time.sleep(1) in sync version
        await asyncio.sleep(1)  # Simulating sync blocking

    sync_time = asyncio.get_event_loop().time() - start
    print(f"Sync time: {sync_time:.2f}s")  # ~10 seconds

    # Async version
    start = asyncio.get_event_loop().time()

    # Concurrent async operations
    async def async_op():
        await asyncio.sleep(1)

    await asyncio.gather(*[async_op() for _ in range(10)])

    async_time = asyncio.get_event_loop().time() - start
    print(f"Async time: {async_time:.2f}s")  # ~1 second

asyncio.run(compare_throughput())

# Advanced: Both sync and async context manager
class HybridContextManager:
    """Works with both 'with' and 'async with'"""

    def __init__(self, name):
        self.name = name

    # Sync protocol
    def __enter__(self):
        print(f"[Sync] Entering {self.name}")
        return self

    def __exit__(self, *args):
        print(f"[Sync] Exiting {self.name}")
        return False

    # Async protocol
    async def __aenter__(self):
        print(f"[Async] Entering {self.name}")
        await asyncio.sleep(0.1)
        return self

    async def __aexit__(self, *args):
        print(f"[Async] Exiting {self.name}")
        await asyncio.sleep(0.1)
        return False

# Can use with both
def sync_usage():
    with HybridContextManager("test") as mgr:
        print("In sync context")

async def async_usage():
    async with HybridContextManager("test") as mgr:
        print("In async context")

sync_usage()
asyncio.run(async_usage())

# Production: Async database connection pool
class AsyncConnectionPool:
    """Async database connection pool"""

    def __init__(self, size=10):
        self.size = size
        self.available = asyncio.Queue(maxsize=size)
        self._initialized = False

    async def __aenter__(self):
        # Initialize pool
        if not self._initialized:
            print(f"Initializing pool with {self.size} connections")
            for i in range(self.size):
                conn = await self._create_connection(i)
                await self.available.put(conn)
            self._initialized = True
        return self

    async def __aexit__(self, exc_type, exc_val, tb):
        # Close all connections
        print("Closing connection pool")
        while not self.available.empty():
            conn = await self.available.get()
            await self._close_connection(conn)
        return False

    @asynccontextmanager
    async def acquire(self):
        """Get connection from pool"""
        conn = await self.available.get()
        try:
            yield conn
        finally:
            await self.available.put(conn)

    async def _create_connection(self, conn_id):
        await asyncio.sleep(0.1)
        return {"id": conn_id}

    async def _close_connection(self, conn):
        await asyncio.sleep(0.1)

# Usage
async def use_connection_pool():
    async with AsyncConnectionPool(size=5) as pool:
        # Multiple requests share pool
        async def query(sql):
            async with pool.acquire() as conn:
                await asyncio.sleep(0.1)
                return f"Result for {sql} using conn {conn['id']}"

        results = await asyncio.gather(*[
            query(f"SELECT {i}") for i in range(20)
        ])
        return results

asyncio.run(use_connection_pool())
```

**In Practice**:
**When to use async context managers**:
- ✅ Async I/O operations (network, files, databases)
- ✅ Async services (FastAPI, aiohttp)
- ✅ Resource pools with async operations
- ✅ Anything using `await` in setup/cleanup

**ML scenarios**:
```python
# Async model loading from S3
async with S3ModelLoader(bucket, key) as model:
    predictions = await model.predict(data)

# Async database for training data
async with AsyncDatabase(url) as db:
    training_data = await db.fetch_batch()

# Async GPU resource management
async with AsyncGPUAllocator(device) as gpu:
    result = await async_inference(gpu, model, data)
```

**Performance**: Async context managers enable high concurrency - handle 1000s of connections with single thread, perfect for I/O-bound ML inference services.

**Key Takeaway**: Async context managers use `async with`, `__aenter__`/`__aexit__`, and allow `await` in setup/cleanup; essential for async I/O in modern ML services; use `@asynccontextmanager` decorator for simpler creation.

</details>

**Production Scenarios**:

1. You're building an ML inference service that loads models on-demand. How do you implement a context manager for model lifecycle management?

<details>
<summary>Answer: Implement context manager with lazy loading, reference counting, LRU eviction, and proper GPU cleanup</summary>

**Explanation**:
A production model lifecycle manager needs: (1) **Lazy loading** - load models only when needed, (2) **Reference counting** - track active users, don't unload while in use, (3) **LRU eviction** - unload least recently used models when memory full, (4) **GPU memory management** - proper allocation/deallocation, (5) **Thread safety** - multiple requests accessing simultaneously, (6) **Graceful degradation** - handle loading failures, (7) **Metrics tracking** - load times, cache hits, memory usage.

The pattern: Context manager loads model on enter (or reuses cached), increments reference count, executes inference, decrements count on exit. Background thread monitors memory and evicts unused models. Use locks for thread safety.

**Example**:
```python
import asyncio
import threading
import time
from collections import OrderedDict
from contextlib import contextmanager, asynccontextmanager
from dataclasses import dataclass
from typing import Optional, Dict
import torch

@dataclass
class ModelMetadata:
    """Model metadata and statistics"""
    path: str
    model: any
    ref_count: int = 0
    last_used: float = 0
    memory_bytes: int = 0
    load_count: int = 0

class ModelLifecycleManager:
    """Production model lifecycle manager"""

    def __init__(
        self,
        max_models: int = 3,
        max_memory_gb: float = 16.0,
        device: str = 'cuda',
        eviction_check_interval: float = 60.0
    ):
        self.max_models = max_models
        self.max_memory_bytes = int(max_memory_gb * 1024**3)
        self.device = device
        self.eviction_check_interval = eviction_check_interval

        # Thread-safe model cache (LRU via OrderedDict)
        self._models: OrderedDict[str, ModelMetadata] = OrderedDict()
        self._lock = threading.RLock()

        # Metrics
        self.cache_hits = 0
        self.cache_misses = 0
        self.evictions = 0

        # Background eviction thread
        self._eviction_thread = threading.Thread(
            target=self._eviction_loop,
            daemon=True
        )
        self._eviction_thread.start()

    @contextmanager
    def load_model(self, model_path: str):
        """Context manager for model loading"""
        metadata = None

        try:
            # Acquire model
            metadata = self._acquire_model(model_path)
            print(f"Model {model_path} acquired (refs={metadata.ref_count})")

            yield metadata.model

        finally:
            # Release model
            if metadata:
                self._release_model(model_path)
                print(f"Model {model_path} released (refs={metadata.ref_count})")

    def _acquire_model(self, model_path: str) -> ModelMetadata:
        """Acquire model (load if needed, increment ref count)"""
        with self._lock:
            if model_path in self._models:
                # Cache hit
                self.cache_hits += 1
                metadata = self._models[model_path]
                metadata.ref_count += 1
                metadata.last_used = time.time()

                # Move to end (most recently used)
                self._models.move_to_end(model_path)

                return metadata
            else:
                # Cache miss - load model
                self.cache_misses += 1

                # Check if we need to evict
                self._maybe_evict_models()

                # Load model
                print(f"Loading model: {model_path}")
                start = time.time()
                model = self._load_model_from_disk(model_path)
                load_time = time.time() - start

                # Track memory
                memory_bytes = self._get_model_memory(model)

                # Create metadata
                metadata = ModelMetadata(
                    path=model_path,
                    model=model,
                    ref_count=1,
                    last_used=time.time(),
                    memory_bytes=memory_bytes,
                    load_count=1
                )

                self._models[model_path] = metadata

                print(f"Model loaded in {load_time:.2f}s, memory={memory_bytes/1024**3:.2f}GB")

                return metadata

    def _release_model(self, model_path: str):
        """Release model (decrement ref count)"""
        with self._lock:
            if model_path in self._models:
                metadata = self._models[model_path]
                metadata.ref_count -= 1
                metadata.last_used = time.time()

    def _maybe_evict_models(self):
        """Evict models if over limits"""
        with self._lock:
            # Check model count limit
            while len(self._models) >= self.max_models:
                self._evict_lru_model()

            # Check memory limit
            total_memory = sum(m.memory_bytes for m in self._models.values())
            while total_memory > self.max_memory_bytes and self._models:
                evicted_memory = self._evict_lru_model()
                if evicted_memory == 0:
                    break  # No more models to evict
                total_memory -= evicted_memory

    def _evict_lru_model(self) -> int:
        """Evict least recently used model (with ref_count==0)"""
        with self._lock:
            # Find LRU model with ref_count==0
            for model_path, metadata in self._models.items():
                if metadata.ref_count == 0:
                    print(f"Evicting model: {model_path}")
                    memory_freed = metadata.memory_bytes

                    # Cleanup GPU memory
                    del metadata.model
                    if self.device.startswith('cuda'):
                        torch.cuda.empty_cache()

                    del self._models[model_path]
                    self.evictions += 1

                    return memory_freed

            # No models with ref_count==0
            print("Warning: All models in use, cannot evict")
            return 0

    def _eviction_loop(self):
        """Background thread to periodically check for eviction"""
        while True:
            time.sleep(self.eviction_check_interval)

            with self._lock:
                # Evict models unused for > 5 minutes
                current_time = time.time()
                to_evict = []

                for model_path, metadata in self._models.items():
                    if (metadata.ref_count == 0 and
                        current_time - metadata.last_used > 300):
                        to_evict.append(model_path)

                for model_path in to_evict:
                    print(f"Background eviction: {model_path}")
                    self._evict_lru_model()

    def _load_model_from_disk(self, model_path: str):
        """Load model from disk"""
        # Simulate loading time
        time.sleep(2)

        # In production:
        # model = torch.load(model_path, map_location=self.device)
        # model.eval()
        # return model

        return {"path": model_path, "weights": "..."}

    def _get_model_memory(self, model) -> int:
        """Estimate model memory usage"""
        # In production:
        # if isinstance(model, torch.nn.Module):
        #     return sum(p.numel() * p.element_size() for p in model.parameters())

        return 1024 * 1024 * 1024  # 1GB placeholder

    def get_stats(self) -> Dict:
        """Get manager statistics"""
        with self._lock:
            total_memory = sum(m.memory_bytes for m in self._models.values())
            return {
                "cached_models": len(self._models),
                "total_memory_gb": total_memory / 1024**3,
                "cache_hits": self.cache_hits,
                "cache_misses": self.cache_misses,
                "evictions": self.evictions,
                "hit_rate": (
                    self.cache_hits / (self.cache_hits + self.cache_misses)
                    if (self.cache_hits + self.cache_misses) > 0 else 0
                )
            }

    def preload_models(self, model_paths: list):
        """Preload models into cache"""
        for path in model_paths:
            with self.load_model(path):
                pass  # Just load into cache

# Async version for async services
class AsyncModelLifecycleManager:
    """Async version for FastAPI/aiohttp services"""

    def __init__(self, max_models: int = 3):
        self.max_models = max_models
        self._models: OrderedDict[str, ModelMetadata] = OrderedDict()
        self._lock = asyncio.Lock()
        self.cache_hits = 0
        self.cache_misses = 0

    @asynccontextmanager
    async def load_model(self, model_path: str):
        """Async context manager for model loading"""
        metadata = None

        try:
            metadata = await self._acquire_model(model_path)
            yield metadata.model
        finally:
            if metadata:
                await self._release_model(model_path)

    async def _acquire_model(self, model_path: str) -> ModelMetadata:
        """Async acquire model"""
        async with self._lock:
            if model_path in self._models:
                self.cache_hits += 1
                metadata = self._models[model_path]
                metadata.ref_count += 1
                metadata.last_used = time.time()
                self._models.move_to_end(model_path)
                return metadata
            else:
                self.cache_misses += 1

                # Evict if needed
                while len(self._models) >= self.max_models:
                    await self._evict_lru_model()

                # Load model asynchronously
                print(f"[Async] Loading model: {model_path}")
                model = await self._load_model_async(model_path)

                metadata = ModelMetadata(
                    path=model_path,
                    model=model,
                    ref_count=1,
                    last_used=time.time(),
                    memory_bytes=1024**3,
                    load_count=1
                )

                self._models[model_path] = metadata
                return metadata

    async def _release_model(self, model_path: str):
        """Async release model"""
        async with self._lock:
            if model_path in self._models:
                self._models[model_path].ref_count -= 1
                self._models[model_path].last_used = time.time()

    async def _evict_lru_model(self):
        """Async evict model"""
        for model_path, metadata in self._models.items():
            if metadata.ref_count == 0:
                print(f"[Async] Evicting: {model_path}")
                del metadata.model
                del self._models[model_path]
                await asyncio.sleep(0)  # Yield control
                return

    async def _load_model_async(self, model_path: str):
        """Load model asynchronously (e.g., from S3)"""
        await asyncio.sleep(2)  # Simulate async loading
        return {"path": model_path, "weights": "..."}

# Usage Example: Sync service
def inference_service_sync():
    """Sync inference service"""
    manager = ModelLifecycleManager(max_models=3, max_memory_gb=8.0)

    def handle_request(model_path, data):
        with manager.load_model(model_path) as model:
            # Run inference
            result = model_predict(model, data)
            return result

    # Simulate requests
    handle_request("models/bert-base", "input data 1")
    handle_request("models/bert-large", "input data 2")
    handle_request("models/bert-base", "input data 3")  # Cache hit!

    print(f"\nStats: {manager.get_stats()}")

# Usage Example: Async service
async def inference_service_async():
    """Async inference service (FastAPI-style)"""
    manager = AsyncModelLifecycleManager(max_models=3)

    async def handle_request(model_path, data):
        async with manager.load_model(model_path) as model:
            result = await async_model_predict(model, data)
            return result

    # Simulate concurrent requests
    results = await asyncio.gather(
        handle_request("models/bert-base", "data1"),
        handle_request("models/bert-large", "data2"),
        handle_request("models/bert-base", "data3"),  # Cache hit
        handle_request("models/gpt2", "data4"),
    )

    return results

# Helper functions
def model_predict(model, data):
    time.sleep(0.1)
    return f"Prediction from {model['path']}"

async def async_model_predict(model, data):
    await asyncio.sleep(0.1)
    return f"Prediction from {model['path']}"

# Run examples
inference_service_sync()
asyncio.run(inference_service_async())
```

**In Practice**:
**Production checklist**:
- ✅ Reference counting (don't evict in-use models)
- ✅ LRU eviction (evict least recently used)
- ✅ Memory limits (total GB limit)
- ✅ Thread safety (locks for concurrent access)
- ✅ Metrics tracking (cache hits, evictions, memory)
- ✅ Graceful loading failures (handle model load errors)
- ✅ Background cleanup (periodic eviction of unused)
- ✅ Preloading (warm cache on startup)
- ✅ GPU memory management (torch.cuda.empty_cache())

**Key Takeaway**: Production model managers need reference counting, LRU eviction, memory limits, thread safety, and metrics tracking; use context managers to guarantee proper cleanup even if inference fails.

</details>

2. How do you handle database connection pooling with context managers in production?

<details>
<summary>Answer: Implement connection pool with acquire/release context manager, health checks, automatic reconnection, and timeout handling</summary>

**Explanation**:
Production database connection pools need: (1) **Fixed pool size** - limit concurrent connections, (2) **Health checks** - validate connections before use, (3) **Automatic reconnection** - handle connection failures, (4) **Timeout handling** - don't wait forever for connections, (5) **Connection lifecycle** - proper initialization and cleanup, (6) **Thread/async safety** - multiple workers accessing pool, (7) **Metrics** - track pool utilization, wait times.

The pattern: Context manager acquires connection from pool (blocking if none available), validates it, yields to caller, returns to pool on exit. Pool manager handles creation, validation, and retirement of connections.

**Example**:
```python
import threading
import time
import queue
from contextlib import contextmanager, asynccontextmanager
from dataclasses import dataclass
from typing import Optional
import asyncio

@dataclass
class ConnectionMetadata:
    """Connection metadata"""
    connection: any
    created_at: float
    last_used: float
    use_count: int = 0
    is_healthy: bool = True

class DatabaseConnectionPool:
    """Production database connection pool"""

    def __init__(
        self,
        connection_factory,
        min_size: int = 2,
        max_size: int = 10,
        max_idle_time: float = 300,  # 5 minutes
        max_lifetime: float = 3600,  # 1 hour
        acquire_timeout: float = 30,
        health_check_interval: float = 60
    ):
        self.connection_factory = connection_factory
        self.min_size = min_size
        self.max_size = max_size
        self.max_idle_time = max_idle_time
        self.max_lifetime = max_lifetime
        self.acquire_timeout = acquire_timeout

        # Connection pool (queue-based)
        self._available = queue.Queue(maxsize=max_size)
        self._in_use: set = set()
        self._all_connections: dict = {}
        self._lock = threading.Lock()

        # Metrics
        self.total_created = 0
        self.total_closed = 0
        self.total_acquired = 0
        self.total_released = 0
        self.acquire_timeouts = 0
        self.health_check_failures = 0

        # Initialize minimum connections
        self._initialize_pool()

        # Start health check thread
        self._health_check_thread = threading.Thread(
            target=self._health_check_loop,
            daemon=True
        )
        self._health_check_thread.start()

    def _initialize_pool(self):
        """Create minimum number of connections"""
        for _ in range(self.min_size):
            conn = self._create_connection()
            self._available.put(conn)

    @contextmanager
    def get_connection(self):
        """Context manager to acquire connection"""
        conn = None
        try:
            # Acquire connection
            conn = self._acquire_connection()
            self.total_acquired += 1

            yield conn.connection

        finally:
            # Release connection back to pool
            if conn:
                self._release_connection(conn)
                self.total_released += 1

    def _acquire_connection(self) -> ConnectionMetadata:
        """Acquire connection from pool"""
        start = time.time()

        while True:
            try:
                # Try to get available connection
                conn = self._available.get(
                    timeout=min(1.0, self.acquire_timeout)
                )

                # Validate connection
                if self._validate_connection(conn):
                    with self._lock:
                        self._in_use.add(id(conn))
                    conn.last_used = time.time()
                    conn.use_count += 1
                    return conn
                else:
                    # Connection unhealthy, close and retry
                    self._close_connection(conn)

            except queue.Empty:
                # No available connections
                elapsed = time.time() - start
                if elapsed >= self.acquire_timeout:
                    self.acquire_timeouts += 1
                    raise TimeoutError(
                        f"Could not acquire connection in {self.acquire_timeout}s"
                    )

                # Try to create new connection if under limit
                with self._lock:
                    total = len(self._all_connections)
                    if total < self.max_size:
                        conn = self._create_connection()
                        with self._lock:
                            self._in_use.add(id(conn))
                        conn.last_used = time.time()
                        conn.use_count += 1
                        return conn

                # Wait and retry
                time.sleep(0.1)

    def _release_connection(self, conn: ConnectionMetadata):
        """Release connection back to pool"""
        with self._lock:
            self._in_use.discard(id(conn))

        conn.last_used = time.time()

        # Check if connection should be retired
        if self._should_retire(conn):
            self._close_connection(conn)
        else:
            # Return to pool
            try:
                self._available.put_nowait(conn)
            except queue.Full:
                # Pool full, close connection
                self._close_connection(conn)

    def _create_connection(self) -> ConnectionMetadata:
        """Create new connection"""
        print("Creating new database connection")

        try:
            raw_conn = self.connection_factory()

            metadata = ConnectionMetadata(
                connection=raw_conn,
                created_at=time.time(),
                last_used=time.time()
            )

            with self._lock:
                self._all_connections[id(metadata)] = metadata

            self.total_created += 1
            return metadata

        except Exception as e:
            print(f"Failed to create connection: {e}")
            raise

    def _close_connection(self, conn: ConnectionMetadata):
        """Close connection"""
        print(f"Closing connection (uses={conn.use_count})")

        try:
            if hasattr(conn.connection, 'close'):
                conn.connection.close()
        except Exception as e:
            print(f"Error closing connection: {e}")

        with self._lock:
            self._all_connections.pop(id(conn), None)

        self.total_closed += 1

    def _validate_connection(self, conn: ConnectionMetadata) -> bool:
        """Validate connection is still healthy"""
        try:
            # Check age
            if time.time() - conn.created_at > self.max_lifetime:
                print("Connection exceeded max lifetime")
                return False

            # Ping database (in production: conn.connection.ping())
            # For demo, just return True
            conn.is_healthy = True
            return True

        except Exception as e:
            print(f"Connection health check failed: {e}")
            self.health_check_failures += 1
            conn.is_healthy = False
            return False

    def _should_retire(self, conn: ConnectionMetadata) -> bool:
        """Check if connection should be retired"""
        current_time = time.time()

        # Too old
        if current_time - conn.created_at > self.max_lifetime:
            return True

        # Idle too long
        if current_time - conn.last_used > self.max_idle_time:
            return True

        # Unhealthy
        if not conn.is_healthy:
            return True

        # Too many connections, keep only minimum
        with self._lock:
            if len(self._all_connections) > self.min_size:
                return True

        return False

    def _health_check_loop(self):
        """Background thread for health checks"""
        while True:
            time.sleep(60)

            print("Running health check...")
            with self._lock:
                conns_to_check = list(self._all_connections.values())

            for conn in conns_to_check:
                # Skip in-use connections
                if id(conn) in self._in_use:
                    continue

                if not self._validate_connection(conn):
                    self._close_connection(conn)

    def get_stats(self) -> dict:
        """Get pool statistics"""
        with self._lock:
            return {
                "available": self._available.qsize(),
                "in_use": len(self._in_use),
                "total": len(self._all_connections),
                "created": self.total_created,
                "closed": self.total_closed,
                "acquired": self.total_acquired,
                "released": self.total_released,
                "timeouts": self.acquire_timeouts,
                "health_failures": self.health_check_failures
            }

    def close_all(self):
        """Close all connections"""
        print("Closing all connections...")
        with self._lock:
            conns = list(self._all_connections.values())

        for conn in conns:
            self._close_connection(conn)

# Async version for async applications
class AsyncDatabaseConnectionPool:
    """Async database connection pool"""

    def __init__(self, connection_factory, min_size=2, max_size=10):
        self.connection_factory = connection_factory
        self.min_size = min_size
        self.max_size = max_size

        self._available = asyncio.Queue(maxsize=max_size)
        self._in_use = set()
        self._lock = asyncio.Lock()
        self._initialized = False

    async def initialize(self):
        """Initialize pool"""
        if not self._initialized:
            for _ in range(self.min_size):
                conn = await self._create_connection()
                await self._available.put(conn)
            self._initialized = True

    @asynccontextmanager
    async def get_connection(self):
        """Async context manager for connection"""
        conn = None
        try:
            conn = await self._acquire_connection()
            yield conn.connection
        finally:
            if conn:
                await self._release_connection(conn)

    async def _acquire_connection(self) -> ConnectionMetadata:
        """Async acquire connection"""
        try:
            # Wait for available connection with timeout
            conn = await asyncio.wait_for(
                self._available.get(),
                timeout=30.0
            )

            # Validate
            if await self._validate_connection_async(conn):
                async with self._lock:
                    self._in_use.add(id(conn))
                conn.last_used = time.time()
                return conn
            else:
                await self._close_connection_async(conn)
                return await self._acquire_connection()  # Retry

        except asyncio.TimeoutError:
            # Try to create new connection
            async with self._lock:
                if len(self._in_use) + self._available.qsize() < self.max_size:
                    conn = await self._create_connection()
                    async with self._lock:
                        self._in_use.add(id(conn))
                    return conn

            raise TimeoutError("Could not acquire connection")

    async def _release_connection(self, conn: ConnectionMetadata):
        """Async release connection"""
        async with self._lock:
            self._in_use.discard(id(conn))

        await self._available.put(conn)

    async def _create_connection(self) -> ConnectionMetadata:
        """Async create connection"""
        print("[Async] Creating connection")
        raw_conn = await self.connection_factory()

        return ConnectionMetadata(
            connection=raw_conn,
            created_at=time.time(),
            last_used=time.time()
        )

    async def _close_connection_async(self, conn: ConnectionMetadata):
        """Async close connection"""
        if hasattr(conn.connection, 'close'):
            if asyncio.iscoroutinefunction(conn.connection.close):
                await conn.connection.close()
            else:
                conn.connection.close()

    async def _validate_connection_async(self, conn: ConnectionMetadata) -> bool:
        """Async validate connection"""
        # In production: await conn.connection.ping()
        await asyncio.sleep(0.01)
        return True

# Usage Examples

# Sync version
def demo_sync_pool():
    """Demo sync connection pool"""

    def create_connection():
        """Factory for creating connections"""
        time.sleep(0.1)  # Simulate connection time
        return {"db": "postgres", "connected": True}

    pool = DatabaseConnectionPool(
        connection_factory=create_connection,
        min_size=2,
        max_size=5,
        acquire_timeout=5
    )

    # Use in application
    def execute_query(sql):
        with pool.get_connection() as conn:
            print(f"Executing query with conn: {conn}")
            time.sleep(0.1)
            return f"Results for: {sql}"

    # Simulate concurrent requests
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        queries = [f"SELECT * FROM table{i}" for i in range(20)]
        futures = [executor.submit(execute_query, q) for q in queries]

        for future in concurrent.futures.as_completed(futures):
            result = future.result()

    print(f"\nPool stats: {pool.get_stats()}")
    pool.close_all()

# Async version
async def demo_async_pool():
    """Demo async connection pool"""

    async def create_connection():
        """Async connection factory"""
        await asyncio.sleep(0.1)
        return {"db": "postgres", "connected": True}

    pool = AsyncDatabaseConnectionPool(
        connection_factory=create_connection,
        min_size=2,
        max_size=5
    )

    await pool.initialize()

    async def execute_query(sql):
        async with pool.get_connection() as conn:
            print(f"[Async] Executing: {sql}")
            await asyncio.sleep(0.1)
            return f"Results for: {sql}"

    # Concurrent queries
    queries = [f"SELECT * FROM table{i}" for i in range(20)]
    results = await asyncio.gather(*[execute_query(q) for q in queries])

    print(f"\n{len(results)} queries completed")

# Run examples
demo_sync_pool()
asyncio.run(demo_async_pool())
```

**In Practice**:
**Production checklist**:
- ✅ Min/max pool size (prevent connection exhaustion)
- ✅ Acquire timeout (don't wait forever)
- ✅ Health checks (validate before use)
- ✅ Automatic reconnection (handle failures)
- ✅ Connection retirement (age and idle limits)
- ✅ Background maintenance (periodic cleanup)
- ✅ Metrics tracking (utilization, wait times)
- ✅ Thread/async safety (locks for concurrent access)
- ✅ Graceful shutdown (close all connections)

**For ML training pipelines**: Use connection pools for:
- Training data fetching (database queries)
- Feature store access (multiple workers)
- Experiment tracking (MLflow, W&B)
- Distributed training coordination

**Key Takeaway**: Production connection pools need fixed size limits, health checks, timeouts, automatic reconnection, and metrics; use context managers to guarantee connections return to pool even if queries fail.

</details>

3. Your training pipeline needs temporary disk space for checkpoints. How do you manage it with context managers?

<details>
<summary>Answer: Create context manager for temporary directory with automatic cleanup, disk space checking, and checkpoint preservation on success</summary>

**Explanation**:
ML training generates large temporary files (checkpoints, intermediate results, tensorboard logs). A production temp space manager needs: (1) **Automatic cleanup** - delete temps after training, (2) **Disk space checking** - verify enough space before starting, (3) **Selective preservation** - keep final checkpoint on success, (4) **Cleanup on failure** - remove temps even if training crashes, (5) **Concurrent training** - unique temp dirs per job, (6) **Size limits** - prevent runaway disk usage.

The pattern: Context manager creates temp directory, monitors disk usage, yields to training code, on exit either preserves successful artifacts or cleans up everything. Use try/finally to ensure cleanup even on exceptions.

**Example**:
```python
import os
import shutil
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, List
import threading

class TrainingTempSpace:
    """Context manager for ML training temporary space"""

    def __init__(
        self,
        base_dir: str = "/tmp/ml_training",
        min_free_gb: float = 10.0,
        max_size_gb: float = 50.0,
        preserve_on_success: bool = True,
        preserve_patterns: Optional[List[str]] = None
    ):
        self.base_dir = Path(base_dir)
        self.min_free_gb = min_free_gb
        self.max_size_gb = max_size_gb
        self.preserve_on_success = preserve_on_success
        self.preserve_patterns = preserve_patterns or ["final_*", "best_*"]

        # Create base directory
        self.base_dir.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def create_temp_space(self, job_name: str, preserve_dir: Optional[str] = None):
        """Context manager for training temporary space"""

        # Check disk space before starting
        self._check_disk_space()

        # Create unique temp directory for this job
        temp_dir = self.base_dir / f"{job_name}_{int(time.time())}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        print(f"Created temp space: {temp_dir}")

        # Track size
        size_monitor = SizeMonitor(temp_dir, self.max_size_gb)
        size_monitor.start()

        training_successful = False

        try:
            yield temp_dir

            # If we get here, training completed successfully
            training_successful = True

        except Exception as e:
            print(f"Training failed: {e}")
            # Re-raise to let caller handle
            raise

        finally:
            # Stop size monitoring
            size_monitor.stop()

            # Cleanup or preserve
            if training_successful and self.preserve_on_success:
                self._preserve_artifacts(temp_dir, preserve_dir)
            else:
                print(f"Cleaning up temp space: {temp_dir}")
                self._cleanup(temp_dir)

    def _check_disk_space(self):
        """Check available disk space"""
        stat = shutil.disk_usage(self.base_dir)
        free_gb = stat.free / (1024**3)

        if free_gb < self.min_free_gb:
            raise RuntimeError(
                f"Insufficient disk space: {free_gb:.2f}GB free, "
                f"need {self.min_free_gb}GB"
            )

        print(f"Disk space check: {free_gb:.2f}GB available")

    def _preserve_artifacts(self, temp_dir: Path, preserve_dir: Optional[str]):
        """Preserve important artifacts, cleanup rest"""
        if preserve_dir is None:
            print("No preserve directory specified, cleaning all")
            self._cleanup(temp_dir)
            return

        preserve_path = Path(preserve_dir)
        preserve_path.mkdir(parents=True, exist_ok=True)

        print(f"Preserving artifacts to: {preserve_path}")

        # Find files matching preserve patterns
        preserved_count = 0
        for pattern in self.preserve_patterns:
            for file in temp_dir.glob(pattern):
                dest = preserve_path / file.name
                print(f"  Preserving: {file.name}")
                shutil.move(str(file), str(dest))
                preserved_count += 1

        print(f"Preserved {preserved_count} files")

        # Cleanup remaining temp files
        self._cleanup(temp_dir)

    def _cleanup(self, temp_dir: Path):
        """Remove temporary directory and all contents"""
        try:
            if temp_dir.exists():
                size_mb = self._get_dir_size(temp_dir) / (1024**2)
                print(f"Removing {size_mb:.2f}MB from {temp_dir}")
                shutil.rmtree(temp_dir)
                print("Cleanup complete")
        except Exception as e:
            print(f"Error during cleanup: {e}")

    def _get_dir_size(self, path: Path) -> int:
        """Get total size of directory in bytes"""
        total = 0
        for entry in path.rglob('*'):
            if entry.is_file():
                total += entry.stat().st_size
        return total

class SizeMonitor:
    """Monitor directory size in background thread"""

    def __init__(self, directory: Path, max_size_gb: float):
        self.directory = directory
        self.max_size_bytes = int(max_size_gb * 1024**3)
        self._stop_event = threading.Event()
        self._thread = None

    def start(self):
        """Start monitoring"""
        self._thread = threading.Thread(target=self._monitor, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop monitoring"""
        if self._thread:
            self._stop_event.set()
            self._thread.join(timeout=1)

    def _monitor(self):
        """Monitor loop"""
        while not self._stop_event.wait(10):  # Check every 10 seconds
            total_size = self._get_size()
            size_gb = total_size / (1024**3)

            print(f"Temp space size: {size_gb:.2f}GB")

            if total_size > self.max_size_bytes:
                print(f"WARNING: Temp space exceeded {size_gb:.2f}GB limit!")
                # In production: could raise exception or trigger cleanup

    def _get_size(self) -> int:
        """Get directory size"""
        total = 0
        try:
            for entry in self.directory.rglob('*'):
                if entry.is_file():
                    total += entry.stat().st_size
        except Exception:
            pass
        return total

# Advanced: Checkpoint manager with temp space
class CheckpointManager:
    """Manage training checkpoints with automatic cleanup"""

    def __init__(self, temp_space: Path, keep_last_n: int = 3):
        self.temp_space = temp_space
        self.keep_last_n = keep_last_n
        self.checkpoints: List[Path] = []

    def save_checkpoint(self, step: int, model_state: dict):
        """Save checkpoint and manage cleanup"""
        checkpoint_path = self.temp_space / f"checkpoint_step_{step}.pt"

        print(f"Saving checkpoint: {checkpoint_path.name}")

        # In production: torch.save(model_state, checkpoint_path)
        # For demo: create dummy file
        checkpoint_path.write_text(f"Checkpoint at step {step}")

        self.checkpoints.append(checkpoint_path)

        # Cleanup old checkpoints
        if len(self.checkpoints) > self.keep_last_n:
            old_checkpoint = self.checkpoints.pop(0)
            print(f"Removing old checkpoint: {old_checkpoint.name}")
            old_checkpoint.unlink(missing_ok=True)

    def save_best_checkpoint(self, step: int, metric: float, model_state: dict):
        """Save best model checkpoint (will be preserved)"""
        best_path = self.temp_space / f"best_model_step_{step}_metric_{metric:.4f}.pt"

        print(f"Saving best checkpoint: {best_path.name}")
        best_path.write_text(f"Best checkpoint: step={step}, metric={metric}")

    def save_final_checkpoint(self, step: int, model_state: dict):
        """Save final model (will be preserved)"""
        final_path = self.temp_space / f"final_model_step_{step}.pt"

        print(f"Saving final checkpoint: {final_path.name}")
        final_path.write_text(f"Final checkpoint: step={step}")

# Production Example: Training with temp space management
def train_model_with_temp_space():
    """Complete training example with temp space management"""

    temp_manager = TrainingTempSpace(
        base_dir="/tmp/ml_training",
        min_free_gb=10.0,
        max_size_gb=50.0,
        preserve_on_success=True,
        preserve_patterns=["final_*", "best_*", "*.log"]
    )

    with temp_manager.create_temp_space(
        job_name="bert_training",
        preserve_dir="./saved_models/bert_run_1"
    ) as temp_dir:

        print(f"\nTraining in temp dir: {temp_dir}\n")

        # Initialize checkpoint manager
        checkpoint_mgr = CheckpointManager(temp_dir, keep_last_n=3)

        # Simulate training loop
        best_metric = float('inf')

        for step in range(1, 11):
            print(f"\n--- Step {step} ---")

            # Simulate training
            time.sleep(0.5)

            # Save periodic checkpoint
            if step % 2 == 0:
                checkpoint_mgr.save_checkpoint(
                    step,
                    {"model": "state", "step": step}
                )

            # Check if best model
            current_metric = 1.0 / step  # Simulated metric
            if current_metric < best_metric:
                best_metric = current_metric
                checkpoint_mgr.save_best_checkpoint(
                    step,
                    current_metric,
                    {"model": "state", "step": step}
                )

            # Simulate creating logs
            log_file = temp_dir / f"train.log"
            with open(log_file, 'a') as f:
                f.write(f"Step {step}: loss={current_metric:.4f}\n")

        # Save final model
        checkpoint_mgr.save_final_checkpoint(
            step=10,
            model_state={"model": "final_state"}
        )

        print("\nTraining completed successfully!")
        # Context manager will preserve best_* and final_* files

# Example: Training with failure
def train_model_with_failure():
    """Example showing cleanup on failure"""

    temp_manager = TrainingTempSpace(
        base_dir="/tmp/ml_training",
        preserve_on_success=True
    )

    try:
        with temp_manager.create_temp_space(
            job_name="failed_training",
            preserve_dir="./saved_models/failed_run"
        ) as temp_dir:

            print(f"Training in: {temp_dir}")

            # Create some files
            (temp_dir / "checkpoint_1.pt").write_text("data")
            (temp_dir / "checkpoint_2.pt").write_text("data")

            # Simulate failure
            raise ValueError("Training diverged!")

    except ValueError:
        print("Caught training error")

    # Temp files automatically cleaned up since training failed

# Example: Multiple concurrent training jobs
def concurrent_training_jobs():
    """Multiple training jobs with isolated temp spaces"""

    temp_manager = TrainingTempSpace(base_dir="/tmp/ml_training")

    def train_job(job_id: int):
        with temp_manager.create_temp_space(
            job_name=f"job_{job_id}",
            preserve_dir=f"./models/job_{job_id}"
        ) as temp_dir:
            print(f"Job {job_id} using: {temp_dir}")
            time.sleep(1)

            # Save final model
            (temp_dir / f"final_model.pt").write_text(f"Job {job_id} model")

    # Run multiple jobs concurrently
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(train_job, i) for i in range(3)]
        concurrent.futures.wait(futures)

    print("All jobs completed")

# Run examples
print("=== Example 1: Successful Training ===")
train_model_with_temp_space()

print("\n=== Example 2: Failed Training ===")
train_model_with_failure()

print("\n=== Example 3: Concurrent Jobs ===")
concurrent_training_jobs()
```

**In Practice**:
**Production checklist**:
- ✅ Disk space checking (before starting)
- ✅ Unique temp directories (per job/run)
- ✅ Size monitoring (prevent runaway growth)
- ✅ Automatic cleanup (on exit)
- ✅ Selective preservation (final/best checkpoints)
- ✅ Cleanup on failure (don't leave garbage)
- ✅ Concurrent job isolation (separate temp dirs)
- ✅ Logging (track what's preserved/deleted)

**For ML training**:
```python
# Typical usage
with temp_manager.create_temp_space("training_run", "./final_models") as temp_dir:
    # All checkpoints go to temp_dir
    for epoch in range(num_epochs):
        train_epoch(model, temp_dir / f"checkpoint_{epoch}.pt")

    # Save final model (preserved)
    save_model(model, temp_dir / "final_model.pt")
# Intermediate checkpoints cleaned up, final model preserved
```

**Key Takeaway**: Training temp space managers need disk checking, automatic cleanup, selective preservation of finals/bests, size monitoring, and cleanup on failure; context managers guarantee cleanup even if training crashes.

</details>

## Summary

**In 3 sentences**:
- Context managers implement the `__enter__`/`__exit__` protocol (or `__aenter__`/`__aexit__` for async) to guarantee resource cleanup even when exceptions occur, used with `with` statements for automatic setup and teardown
- They're essential for managing expensive ML resources like GPU memory, model weights, database connections, file handles, and temporary storage with guaranteed cleanup on success or failure
- Create context managers using classes with `__enter__`/`__exit__` methods for complex logic, or use `@contextmanager` decorator with `yield` for simpler cases; async versions handle I/O-bound operations without blocking

**Key takeaway**: Context managers are the Python way to guarantee resource cleanup - essential for production ML systems managing models, GPU memory, connections, and temporary files. Always use them for resources that need cleanup, and remember cleanup happens even if exceptions occur!
