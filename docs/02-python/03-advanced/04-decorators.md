# Decorators

> **Before you start**: [Prerequisites to be filled]

## What is Decorators?

[Content to be filled]

## Why This Matters for AI/ML

[Content to be filled]

## Core Concepts

[Content to be filled]

## Try It

[Content to be filled]

## Self-Check Questions

> Answer from memory before checking

1. **What** [question]?
2. **Why** [question]?
3. **When** [question]?
4. **How** [question]?
5. **Compare**: [comparison question]?

## Practice Exercises

**Level 1 - Understand**:
[Content to be filled]

**Level 2 - Apply**:
[Content to be filled]

**Level 3 - Create**:
[Content to be filled]

## Common Mistakes

[Content to be filled]

## How This Connects

**Builds on**:
- [Previous topic] - [Why needed]

**Related concepts**:
- [Related topic] - [Connection]

**Why this matters for AI**:
- [AI/ML relevance]

**Next steps**:
- [Next topic] - [Why this is next]

## Deep Dive Questions (Expert Level)

> **For 12+ years experience**: These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. What is a closure? How does Python implement variable capture?

<details>
<summary>Answer: A closure is a function that captures and remembers variables from its enclosing scope; Python uses cell objects to store captured variables</summary>

**Explanation**:
A closure occurs when a nested function references variables from its enclosing scope. Python implements closures using **cell objects** - special objects that act as indirect references to variables. When a function is defined, Python analyzes which variables it references from outer scopes and creates cells to store those variables. The inner function's `__closure__` attribute contains a tuple of cell objects, and each cell has a `cell_contents` attribute with the actual value.

The key insight: closures allow data encapsulation without classes. The captured variables persist in memory even after the outer function returns because the cell objects are referenced by the inner function. This is different from just accessing global variables - closures capture the specific scope where they were created. Python uses the LEGB rule (Local, Enclosing, Global, Built-in) to resolve names, and closures specifically use the "Enclosing" scope.

Variable capture happens at definition time, not at call time. If you capture a variable that changes, the closure sees the current value, not the value when the closure was created. This is a common source of bugs in loops when creating multiple closures.

**Example**:
```python
# Basic closure
def make_multiplier(factor):
    # 'factor' is captured by the closure
    def multiply(x):
        return x * factor
    return multiply

times_3 = make_multiplier(3)
times_5 = make_multiplier(5)

print(times_3(10))  # 30
print(times_5(10))  # 50

# Inspect closure internals
print(times_3.__closure__)  # (<cell at 0x...: int object at 0x...>,)
print(times_3.__closure__[0].cell_contents)  # 3
print(times_3.__code__.co_freevars)  # ('factor',)

# Common pitfall: loop variable capture
def create_multipliers():
    multipliers = []
    for i in range(3):
        # BUG: All closures capture same 'i' variable
        multipliers.append(lambda x: x * i)
    return multipliers

funcs = create_multipliers()
print([f(10) for f in funcs])  # [20, 20, 20] - all use i=2!

# Fix 1: Default argument (captures value, not variable)
def create_multipliers_fixed1():
    multipliers = []
    for i in range(3):
        multipliers.append(lambda x, i=i: x * i)
    return multipliers

# Fix 2: Use partial application
from functools import partial

def create_multipliers_fixed2():
    multipliers = []
    for i in range(3):
        multipliers.append(partial(lambda i, x: x * i, i))
    return multipliers

# Advanced: Mutable closure variables (nonlocal)
def make_counter():
    count = 0  # Captured variable

    def increment():
        nonlocal count  # Without this, would create local 'count'
        count += 1
        return count

    return increment

counter = make_counter()
print(counter())  # 1
print(counter())  # 2
print(counter())  # 3

# Closure internals
import dis

def outer(x):
    def inner(y):
        return x + y
    return inner

dis.dis(inner)
# Shows LOAD_DEREF opcode for accessing closure variable 'x'
```

**In Practice**:
For ML pipelines, closures enable elegant functional patterns. Use closures to create parameterized preprocessing functions (`make_normalizer(mean, std)` returns a closure that normalizes data). For decorators, closures capture configuration (e.g., `@retry(attempts=3)` - the inner decorator closure captures `attempts`). In production, be aware that closures can cause memory leaks if they capture large objects (like trained models) - the captured data persists as long as the closure exists. For LLM agent tools, closures let you create tool factories that capture API keys or configuration without exposing them as parameters.

**Key Takeaway**: Closures use cell objects to capture variables from enclosing scopes; captured variables persist in memory and are accessible via `__closure__`, enabling stateful functions without classes.

</details>

2. Explain function decorators with and without arguments. What's the wrapping pattern?

<details>
<summary>Answer: Decorators without args are simple wrappers; decorators with args require an extra layer (decorator factory) that returns the actual decorator</summary>

**Explanation**:
**Decorators without arguments** are functions that take a function and return a wrapped version. The pattern is: `wrapper = decorator(original_func)`. When you write `@decorator`, Python calls `decorator(func)` and replaces the function with the result. The decorator typically defines an inner wrapper function that adds behavior before/after calling the original function.

**Decorators with arguments** require an extra layer of nesting (decorator factory pattern). The outer function takes the decorator arguments and returns the actual decorator, which then wraps the function. The pattern is: `wrapper = decorator(args)(original_func)`. When you write `@decorator(args)`, Python first calls `decorator(args)` (returns a decorator), then calls that decorator with the function.

The wrapping pattern uses closures: the wrapper function captures both the original function and any decorator arguments. Use `functools.wraps` to preserve the original function's metadata (`__name__`, `__doc__`, etc.) - without it, debugging and introspection break because the wrapper's metadata replaces the original's.

**Example**:
```python
import functools
import time
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec('P')
T = TypeVar('T')

# Pattern 1: Decorator WITHOUT arguments
def timer(func: Callable[P, T]) -> Callable[P, T]:
    """Simple decorator - no arguments"""
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer  # Equivalent to: train_model = timer(train_model)
def train_model(epochs):
    time.sleep(0.1 * epochs)
    return "model_trained"

train_model(3)  # "train_model took 0.3000s"

# Pattern 2: Decorator WITH arguments (decorator factory)
def retry(attempts: int = 3, delay: float = 1.0):
    """Decorator factory - returns actual decorator"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception = None
            for attempt in range(attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < attempts - 1:
                        print(f"Attempt {attempt + 1} failed, retrying in {delay}s")
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

@retry(attempts=3, delay=0.5)  # retry(3, 0.5)(call_llm_api)
def call_llm_api(prompt):
    import random
    if random.random() < 0.7:  # 70% failure rate
        raise ConnectionError("API unavailable")
    return "LLM response"

# Pattern 3: Decorator that works with OR without arguments
def smart_cache(func=None, *, max_size: int = 128):
    """Can be used as @smart_cache or @smart_cache(max_size=256)"""
    def decorator(fn: Callable[P, T]) -> Callable[P, T]:
        cache = {}

        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Simple cache key (works for hashable args only)
            key = (args, tuple(sorted(kwargs.items())))
            if key not in cache:
                if len(cache) >= max_size:
                    # Evict oldest entry (simplified LRU)
                    cache.pop(next(iter(cache)))
                cache[key] = fn(*args, **kwargs)
            return cache[key]

        wrapper.cache_clear = cache.clear
        wrapper.cache_info = lambda: f"Cache size: {len(cache)}/{max_size}"
        return wrapper

    # If called without arguments: @smart_cache
    if func is not None:
        return decorator(func)
    # If called with arguments: @smart_cache(max_size=256)
    return decorator

@smart_cache  # No parentheses
def expensive_computation(n):
    time.sleep(0.1)
    return n ** 2

@smart_cache(max_size=256)  # With arguments
def model_inference(input_text):
    return f"prediction for {input_text}"

# Pattern 4: Class-based decorator (useful for complex state)
class RateLimiter:
    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self.calls = []

    def __call__(self, func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            now = time.time()
            # Remove old calls outside the time window
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                wait_time = self.period - (now - self.calls[0])
                raise RuntimeError(f"Rate limit exceeded. Retry in {wait_time:.1f}s")

            self.calls.append(now)
            return func(*args, **kwargs)
        return wrapper

@RateLimiter(max_calls=5, period=60.0)  # 5 calls per minute
def call_expensive_api(query):
    return f"API result for {query}"

# Pattern 5: Multiple decorators (order matters!)
@timer
@retry(attempts=2)
def flaky_function():
    import random
    if random.random() < 0.5:
        raise ValueError("Random failure")
    return "Success"

# Execution order: timer(retry(attempts=2)(flaky_function))
# Equivalent to:
# flaky_function = retry(attempts=2)(flaky_function)  # Add retry
# flaky_function = timer(flaky_function)               # Add timing
```

**In Practice**:
For ML systems, use decorator factories for configurable monitoring (`@log_metrics(level="INFO")`, `@track_latency(percentiles=[50, 95, 99])`). For LLM APIs, the retry decorator pattern is essential for handling transient failures. The optional-arguments pattern is useful for development vs production (`@cache` in dev, `@cache(redis_backend)` in prod). Be aware of decorator order: `@timer @retry` times the entire retry loop, while `@retry @timer` times individual attempts. For agent tools, class-based decorators maintain state across calls (rate limiting, token counting, cost tracking).

**Key Takeaway**: Decorators without args are simple wrappers; with args, use the factory pattern (outer function returns decorator); always use `functools.wraps` to preserve metadata.

</details>

3. What are class decorators? How do they differ from metaclasses?

<details>
<summary>Answer: Class decorators modify/wrap classes after creation; metaclasses control class creation itself - decorators are simpler and usually preferred</summary>

**Explanation**:
**Class decorators** are functions that take a class and return a modified or wrapped class. They run after the class is fully created and can add/modify attributes, wrap methods, or replace the class entirely. The pattern is: `NewClass = decorator(OriginalClass)`. Class decorators are simpler than metaclasses and handle most use cases where you want to modify class behavior.

**Metaclasses** control how classes are created. They define the `__new__` and `__init__` methods that construct the class object itself. The metaclass runs before the class is fully formed and can modify the class namespace, change base classes, or enforce constraints. The pattern is: `class MyClass(metaclass=MyMeta)`.

The key difference: **Decorators transform** (modify after creation), **metaclasses create** (control creation process). Use decorators for 99% of cases - they're more explicit and easier to understand. Use metaclasses only when you need to: (1) enforce class-level constraints, (2) automatically modify all subclasses, (3) implement advanced patterns like singletons or abstract base classes.

**Example**:
```python
import functools
from typing import Any, Type, TypeVar

T = TypeVar('T')

# Class Decorator Pattern 1: Add functionality
def singleton(cls: Type[T]) -> Type[T]:
    """Decorator that makes a class a singleton"""
    instances = {}

    @functools.wraps(cls, updated=[])  # Preserve class metadata
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance

@singleton
class ModelRegistry:
    def __init__(self):
        self.models = {}
        print("Registry initialized")

    def register(self, name, model):
        self.models[name] = model

# Both return same instance
reg1 = ModelRegistry()  # "Registry initialized"
reg2 = ModelRegistry()  # (no print - same instance)
assert reg1 is reg2

# Class Decorator Pattern 2: Wrap all methods
def log_methods(cls: Type[T]) -> Type[T]:
    """Decorator that adds logging to all public methods"""
    for attr_name in dir(cls):
        if not attr_name.startswith('_'):
            attr = getattr(cls, attr_name)
            if callable(attr):
                setattr(cls, attr_name, log_call(attr))
    return cls

def log_call(method):
    @functools.wraps(method)
    def wrapper(*args, **kwargs):
        print(f"Calling {method.__name__}")
        result = method(*args, **kwargs)
        print(f"Finished {method.__name__}")
        return result
    return wrapper

@log_methods
class DataProcessor:
    def load_data(self):
        return "data"

    def transform(self, data):
        return data.upper()

processor = DataProcessor()
processor.load_data()  # Logs: "Calling load_data" ... "Finished load_data"

# Class Decorator Pattern 3: Add attributes
def dataclass_lite(cls: Type[T]) -> Type[T]:
    """Simplified @dataclass - generates __init__ from annotations"""
    annotations = cls.__annotations__

    # Generate __init__
    def __init__(self, **kwargs):
        for field_name in annotations:
            setattr(self, field_name, kwargs.get(field_name))

    cls.__init__ = __init__
    return cls

@dataclass_lite
class Config:
    learning_rate: float
    batch_size: int
    epochs: int

config = Config(learning_rate=0.001, batch_size=32, epochs=10)

# Metaclass Pattern 1: Enforce constraints
class AbstractMeta(type):
    """Metaclass that enforces implementation of abstract methods"""
    def __new__(mcs, name, bases, namespace):
        # Check if class implements required methods
        if bases:  # Skip check for base class
            required = getattr(bases[0], '_required_methods', set())
            implemented = {k for k in namespace if not k.startswith('_')}
            missing = required - implemented
            if missing:
                raise TypeError(f"{name} must implement: {missing}")

        return super().__new__(mcs, name, bases, namespace)

class ModelBase(metaclass=AbstractMeta):
    _required_methods = {'train', 'predict'}

# class BrokenModel(ModelBase):  # TypeError: must implement train, predict
#     pass

class WorkingModel(ModelBase):
    def train(self, data):
        pass

    def predict(self, x):
        pass

# Metaclass Pattern 2: Automatic registration
_model_registry = {}

class RegisteredMeta(type):
    """Metaclass that auto-registers all subclasses"""
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        if bases:  # Don't register base class
            model_name = namespace.get('model_name', name.lower())
            _model_registry[model_name] = cls
        return cls

class MLModel(metaclass=RegisteredMeta):
    pass

class LinearModel(MLModel):
    model_name = 'linear'

class TreeModel(MLModel):
    model_name = 'tree'

print(_model_registry)  # {'linear': LinearModel, 'tree': TreeModel}

# When to use which: Decorator vs Metaclass
# Decorator: Simpler, more explicit, easier to understand
@singleton
class Cache:
    pass

# Metaclass: More powerful but complex, affects all subclasses
class BaseTool(metaclass=RegisteredMeta):
    pass

# Combining both (rare but powerful)
class ValidatedMeta(type):
    """Metaclass for validation"""
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        # Add validation
        cls._validated = True
        return cls

def add_serialization(cls: Type[T]) -> Type[T]:
    """Decorator for serialization"""
    cls.to_dict = lambda self: vars(self)
    return cls

@add_serialization
class Model(metaclass=ValidatedMeta):
    def __init__(self, name):
        self.name = name

m = Model("bert")
print(m._validated)  # True (from metaclass)
print(m.to_dict())   # {'name': 'bert'} (from decorator)
```

**In Practice**:
For ML systems, use class decorators for cross-cutting concerns: `@register_model` auto-registers models, `@validate_config` ensures config classes have required fields, `@cache_predictions` wraps predict methods. Avoid metaclasses unless building frameworks - PyTorch uses metaclasses for `nn.Module` to track parameters automatically, but as an ML engineer you typically just use `nn.Module`, not create new metaclasses. For agent tools, class decorators can add authentication, rate limiting, or logging to all tool classes uniformly. In production, decorators are easier to debug and understand than metaclasses.

**Key Takeaway**: Class decorators modify classes after creation (simpler, preferred); metaclasses control class creation itself (powerful but complex, rarely needed).

</details>

4. What is `functools.wraps` and why should you always use it in decorators?

<details>
<summary>Answer: `functools.wraps` copies metadata (__name__, __doc__, etc.) from the original function to the wrapper, preserving introspection and debugging capabilities</summary>

**Explanation**:
`functools.wraps` is a decorator for decorators that copies metadata from the original function to the wrapper function. Without it, the wrapped function loses its identity: `__name__` becomes "wrapper", `__doc__` is lost, `__module__` is wrong, and `__annotations__` (type hints) disappear. This breaks introspection tools, documentation generators (Sphinx), help() functions, debuggers, and stack traces.

`functools.wraps` updates the wrapper's `__dict__` with specific attributes from the original function: `__module__`, `__name__`, `__qualname__`, `__annotations__`, `__doc__`, and `__wrapped__` (reference to the original). The `__wrapped__` attribute is crucial - it creates a chain that introspection tools can follow to find the original function, enabling features like signature inspection and debugger stepping into the actual function code.

Without `functools.wraps`: stack traces show "wrapper" instead of the real function name, making debugging hard. Type checkers can't verify arguments. Documentation tools generate docs for "wrapper" not your function. Help text is lost. In production, this makes monitoring and error tracking nearly impossible.

**Example**:
```python
import functools
import time
import inspect
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec('P')
T = TypeVar('T')

# BAD: Without functools.wraps
def timer_bad(func: Callable[P, T]) -> Callable[P, T]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer_bad
def train_model(epochs: int, lr: float) -> str:
    """Trains a neural network model.

    Args:
        epochs: Number of training epochs
        lr: Learning rate

    Returns:
        Status message
    """
    time.sleep(0.1)
    return "Model trained"

# Metadata is broken!
print(train_model.__name__)  # "wrapper" (wrong!)
print(train_model.__doc__)   # None (lost!)
print(train_model.__annotations__)  # {} (no type hints!)
print(inspect.signature(train_model))  # (*args, **kwargs) (useless!)

# GOOD: With functools.wraps
def timer_good(func: Callable[P, T]) -> Callable[P, T]:
    @functools.wraps(func)  # Copies metadata
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer_good
def predict_model(input_data: list[float], threshold: float = 0.5) -> bool:
    """Makes prediction on input data.

    Args:
        input_data: Feature vector
        threshold: Classification threshold

    Returns:
        Binary prediction
    """
    return sum(input_data) > threshold

# Metadata preserved!
print(predict_model.__name__)  # "predict_model" ✓
print(predict_model.__doc__)   # Full docstring ✓
print(predict_model.__annotations__)  # {'input_data': ..., 'return': bool} ✓
print(inspect.signature(predict_model))  # (input_data: list[float], threshold: float = 0.5) -> bool ✓
print(predict_model.__wrapped__)  # <function predict_model> (original function)

# Practical example: Stack traces
def buggy_decorator_bad(func):
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        return result / 0  # Bug!
    return wrapper

def buggy_decorator_good(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        return result / 0  # Bug!
    return wrapper

@buggy_decorator_bad
def compute_bad():
    return 42

@buggy_decorator_good
def compute_good():
    return 42

try:
    compute_bad()
except ZeroDivisionError as e:
    import traceback
    traceback.print_exc()
    # Shows: wrapper() ... (confusing!)

try:
    compute_good()
except ZeroDivisionError as e:
    import traceback
    traceback.print_exc()
    # Shows: compute_good() ... (clear!)

# Advanced: Custom wrapper updates
def smart_decorator(func):
    @functools.wraps(func, updated=['__dict__'])  # Also copy custom attributes
    def wrapper(*args, **kwargs):
        wrapper.call_count += 1  # Track calls
        return func(*args, **kwargs)
    wrapper.call_count = 0
    return wrapper

@smart_decorator
def api_call():
    """Call external API"""
    pass

api_call.custom_attr = "metadata"  # Add custom attribute

print(api_call.__doc__)  # "Call external API" (preserved)
print(api_call.call_count)  # 0
api_call()
print(api_call.call_count)  # 1

# Why it matters for type checking
def validate_return(return_type: type):
    """Decorator that validates return type"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            result = func(*args, **kwargs)
            if not isinstance(result, return_type):
                raise TypeError(f"Expected {return_type}, got {type(result)}")
            return result
        return wrapper
    return decorator

@validate_return(int)
def compute_score(data: list[float]) -> int:
    """Compute integer score"""
    return int(sum(data))

# Type checkers (mypy, pyright) can verify calls because signature is preserved
score: int = compute_score([1.0, 2.0, 3.0])  # ✓
# score: str = compute_score([1.0, 2.0, 3.0])  # mypy error!

# Introspection tools work correctly
print(inspect.getfullargspec(compute_score))
# FullArgSpec(args=['data'], annotations={'data': list[float], 'return': int})

# Access original function if needed
original = compute_score.__wrapped__
print(original([1.0, 2.0]))  # 3 (calls unwrapped function)
```

**In Practice**:
For ML production systems, `functools.wraps` is critical for observability. When decorating model inference functions with `@log_latency`, `@cache_predictions`, `@retry_on_failure`, you need stack traces to show the actual model name, not "wrapper". For LLM APIs, decorated async functions like `@retry async def call_openai()` must preserve signatures for API documentation tools. In monitoring dashboards, function names from decorators populate metrics labels - without `functools.wraps`, all metrics show "wrapper". For agent tools, type hints on tool functions enable automatic schema generation for LLMs - lose the hints, lose the tool descriptions.

**Key Takeaway**: Always use `@functools.wraps(func)` in decorators to preserve metadata (`__name__`, `__doc__`, `__annotations__`), enabling proper introspection, debugging, and type checking.

</details>

5. How do you preserve type hints when decorating functions?

<details>
<summary>Answer: Use `functools.wraps` + `ParamSpec` and `TypeVar` from typing module to preserve input/output types correctly</summary>

**Explanation**:
Preserving type hints in decorators requires three components: (1) `functools.wraps` to copy `__annotations__`, (2) `ParamSpec` to preserve parameter types (args + kwargs), and (3) `TypeVar` to preserve return type. Without these, type checkers see the decorator's signature (generic `*args, **kwargs`), not the original function's signature.

**`ParamSpec`** (Python 3.10+) captures the complete parameter specification - positional args, keyword args, defaults, and types. It's designed specifically for decorators. **`TypeVar`** captures the return type. Together, they enable generic decorators that work with any function signature while maintaining type safety.

The pattern is: `P = ParamSpec('P')`, `T = TypeVar('T')`, then `def decorator(func: Callable[P, T]) -> Callable[P, T]`. The type checker understands that the decorator preserves the function's signature. For decorators with parameters, you need to type the decorator factory correctly.

Type checkers (mypy, pyright) use this information to verify calls to decorated functions, catch argument errors, and provide autocomplete in IDEs. Without proper typing, decorators create "type holes" where errors pass through unchecked.

**Example**:
```python
from typing import TypeVar, ParamSpec, Callable, Any, cast
import functools
import time

# Type variables for generic decorators
P = ParamSpec('P')  # Preserves parameter types
T = TypeVar('T')     # Preserves return type

# Basic decorator with type preservation
def timer(func: Callable[P, T]) -> Callable[P, T]:
    """Type-safe timer decorator"""
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def train_model(epochs: int, lr: float = 0.001) -> dict[str, float]:
    """Type hints are preserved through decorator"""
    time.sleep(0.1)
    return {"loss": 0.5, "accuracy": 0.95}

# Type checker knows the signature!
result: dict[str, float] = train_model(10, lr=0.01)  # ✓
# result: str = train_model(10)  # mypy error: expected dict, got str
# train_model("not an int")  # mypy error: expected int, got str

# Decorator with arguments (decorator factory)
def retry(max_attempts: int = 3) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Typed decorator factory"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
            raise last_exception  # type: ignore
        return wrapper
    return decorator

@retry(max_attempts=3)
def call_api(url: str, timeout: int = 30) -> dict[str, Any]:
    """API call with retry - types preserved"""
    import requests
    response = requests.get(url, timeout=timeout)
    return response.json()

# Type checker validates all of this
data: dict[str, Any] = call_api("https://api.example.com")  # ✓
# call_api(123)  # mypy error: expected str, got int

# Advanced: Decorator that modifies return type
R = TypeVar('R')

def wrap_in_result(
    func: Callable[P, T]
) -> Callable[P, dict[str, T]]:
    """Changes return type from T to dict[str, T]"""
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> dict[str, T]:
        result = func(*args, **kwargs)
        return {"success": True, "data": result}  # type: ignore
    return wrapper

@wrap_in_result
def compute(x: int) -> int:
    return x * 2

# Type checker knows return type changed!
result: dict[str, int] = compute(5)  # ✓ {"success": True, "data": 10}
# result: int = compute(5)  # mypy error: expected dict, got int

# Async function decorator with type preservation
from typing import Awaitable

async def async_timer(
    func: Callable[P, Awaitable[T]]
) -> Callable[P, Awaitable[T]]:
    """Type-safe async decorator"""
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        result = await func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.4f}s")
        return result
    return wrapper

@async_timer
async def fetch_embeddings(text: str, model: str = "ada") -> list[float]:
    """Async function with preserved types"""
    await asyncio.sleep(0.1)  # Simulate API call
    return [0.1, 0.2, 0.3]

# Type checker validates async call
embeddings: list[float] = await fetch_embeddings("hello")  # ✓

# Complex example: Decorator that works with both sync and async
from typing import Union, overload

@overload
def smart_timer(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

@overload
def smart_timer(func: Callable[P, T]) -> Callable[P, T]: ...

def smart_timer(
    func: Union[Callable[P, Awaitable[T]], Callable[P, T]]
) -> Union[Callable[P, Awaitable[T]], Callable[P, T]]:
    """Decorator for both sync and async functions"""
    if asyncio.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = await func(*args, **kwargs)  # type: ignore
            print(f"Async {func.__name__} took {time.time() - start:.4f}s")
            return result
        return async_wrapper  # type: ignore
    else:
        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = func(*args, **kwargs)  # type: ignore
            print(f"Sync {func.__name__} took {time.time() - start:.4f}s")
            return result
        return sync_wrapper  # type: ignore

@smart_timer
def sync_compute(x: int) -> int:
    return x * 2

@smart_timer
async def async_compute(x: int) -> int:
    return x * 2

# Both preserve types correctly
sync_result: int = sync_compute(5)  # ✓
async_result: int = await async_compute(5)  # ✓

# Real-world ML example: Cache with type preservation
from typing import Protocol

class CacheBackend(Protocol):
    def get(self, key: str) -> Any: ...
    def set(self, key: str, value: Any) -> None: ...

def cache_predictions(
    backend: CacheBackend,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Type-safe prediction caching"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            cache_key = f"{func.__name__}:{args}:{kwargs}"
            cached = backend.get(cache_key)
            if cached is not None:
                return cached
            result = func(*args, **kwargs)
            backend.set(cache_key, result)
            return result
        return wrapper
    return decorator

class SimpleCache:
    def __init__(self):
        self._cache: dict[str, Any] = {}

    def get(self, key: str) -> Any:
        return self._cache.get(key)

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = value

cache = SimpleCache()

@cache_predictions(cache)
def predict(features: list[float], threshold: float = 0.5) -> bool:
    """Model prediction with caching"""
    return sum(features) > threshold

# Type checker validates everything
prediction: bool = predict([1.0, 2.0, 3.0], threshold=0.5)  # ✓
# prediction: int = predict([1.0, 2.0])  # mypy error!
```

**In Practice**:
For ML production code, proper type hints in decorators catch bugs before runtime. When decorating model inference functions, type checkers verify input shapes, output types, and optional parameters. For LLM API wrappers, typed decorators ensure prompt parameters are strings and responses are properly structured. In large codebases, IDE autocomplete works correctly on decorated functions, showing parameter names and types. For agent tools, type-preserved decorators enable automatic generation of tool schemas from function signatures, which LLMs use to understand how to call tools.

**Key Takeaway**: Use `ParamSpec` and `TypeVar` with `functools.wraps` to preserve complete type signatures in decorators, enabling type checkers to catch errors in decorated function calls.

</details>

**Production Scenarios**:

1. How do you implement a decorator to cache model inference results?

<details>
<summary>Answer: Create a decorator with hash-based cache keys from function arguments; use TTL and size limits; consider Redis for distributed systems</summary>

**Explanation**:
A production-grade model inference cache decorator needs several components: (1) **Cache key generation** from function arguments (handle both hashable and non-hashable types like arrays), (2) **Eviction policy** (LRU or size-based limits to prevent memory leaks), (3) **TTL (Time-To-Live)** for stale result expiration, (4) **Serialization** for complex objects (numpy arrays, tensors), (5) **Cache statistics** (hit rate, size) for monitoring.

For single-server deployments, use an in-memory dictionary with `functools.lru_cache` or a custom implementation. For distributed systems (multiple inference servers), use Redis or Memcached to share cache across instances. The cache key must uniquely identify the input - for ML, this often means hashing array contents, not just the array object ID.

The decorator should be **configurable** (cache size, TTL, backend) and **observable** (expose metrics for cache hits/misses). For ML models, caching is most effective for repeated queries (chatbots, recommendation systems) and less useful for unique queries (real-time predictions on streaming data). Always measure cache hit rates in production to verify effectiveness.

**Example**:
```python
import functools
import hashlib
import pickle
import time
from typing import Callable, TypeVar, ParamSpec, Any, Optional
from collections import OrderedDict
from dataclasses import dataclass
import numpy as np

P = ParamSpec('P')
T = TypeVar('T')

@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    size: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

# Simple in-memory cache with LRU eviction
def cache_inference(
    max_size: int = 128,
    ttl_seconds: Optional[float] = None,
    include_arrays: bool = True
):
    """Decorator to cache model inference results.

    Args:
        max_size: Maximum cache entries (LRU eviction)
        ttl_seconds: Time-to-live for cache entries
        include_arrays: Whether to hash numpy/torch arrays
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        cache: OrderedDict[str, tuple[T, float]] = OrderedDict()
        stats = CacheStats()

        def make_cache_key(*args: Any, **kwargs: Any) -> str:
            """Generate unique cache key from arguments"""
            key_parts = []

            for arg in args:
                if isinstance(arg, np.ndarray) and include_arrays:
                    # Hash array contents
                    key_parts.append(hashlib.md5(arg.tobytes()).hexdigest())
                elif hasattr(arg, 'numpy'):  # PyTorch tensor
                    arr = arg.detach().cpu().numpy()
                    key_parts.append(hashlib.md5(arr.tobytes()).hexdigest())
                elif isinstance(arg, (list, tuple)):
                    # Convert to tuple for hashing
                    key_parts.append(str(tuple(arg)))
                else:
                    key_parts.append(str(arg))

            for k, v in sorted(kwargs.items()):
                if isinstance(v, np.ndarray) and include_arrays:
                    key_parts.append(f"{k}={hashlib.md5(v.tobytes()).hexdigest()}")
                else:
                    key_parts.append(f"{k}={v}")

            cache_key = "|".join(key_parts)
            return hashlib.sha256(cache_key.encode()).hexdigest()

        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Generate cache key
            cache_key = make_cache_key(*args, **kwargs)

            # Check cache
            if cache_key in cache:
                result, timestamp = cache[cache_key]

                # Check TTL
                if ttl_seconds is None or (time.time() - timestamp) < ttl_seconds:
                    # Move to end (LRU)
                    cache.move_to_end(cache_key)
                    stats.hits += 1
                    return result
                else:
                    # Expired
                    del cache[cache_key]

            # Cache miss - compute result
            stats.misses += 1
            result = func(*args, **kwargs)

            # Store in cache
            cache[cache_key] = (result, time.time())

            # Evict oldest if over size limit
            if len(cache) > max_size:
                cache.popitem(last=False)  # Remove oldest (FIFO)

            stats.size = len(cache)
            return result

        # Expose cache management methods
        wrapper.cache_clear = cache.clear
        wrapper.cache_info = lambda: stats
        wrapper.cache_size = lambda: len(cache)

        return wrapper
    return decorator

# Example 1: Cache text classification
@cache_inference(max_size=1000, ttl_seconds=3600)
def classify_text(text: str, model_name: str = "bert") -> dict[str, float]:
    """Classify text sentiment (expensive operation)"""
    print(f"Computing classification for: {text[:50]}...")
    time.sleep(0.5)  # Simulate model inference
    return {"positive": 0.8, "negative": 0.2}

# First call - cache miss
result1 = classify_text("This is a great product!")
print(result1)  # Computes

# Second call - cache hit
result2 = classify_text("This is a great product!")
print(result2)  # Instant (cached)

# Check stats
print(f"Cache hit rate: {classify_text.cache_info().hit_rate:.2%}")
print(f"Cache size: {classify_text.cache_size()}")

# Example 2: Cache image classification with arrays
@cache_inference(max_size=50, include_arrays=True)
def classify_image(image: np.ndarray, threshold: float = 0.5) -> str:
    """Classify image (hashes array contents)"""
    print(f"Computing classification for image shape {image.shape}...")
    time.sleep(0.3)
    return "cat" if np.mean(image) > threshold else "dog"

img1 = np.random.rand(224, 224, 3)
result1 = classify_image(img1)  # Cache miss
result2 = classify_image(img1)  # Cache hit (same array contents)

img2 = np.random.rand(224, 224, 3)
result3 = classify_image(img2)  # Cache miss (different array)

# Example 3: Redis-backed distributed cache
import redis
import json

def redis_cache_inference(
    redis_client: redis.Redis,
    ttl_seconds: int = 3600,
    prefix: str = "model_cache"
):
    """Production cache using Redis for distributed systems"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Generate cache key
            key_data = {
                "func": func.__name__,
                "args": [str(arg) for arg in args],
                "kwargs": {k: str(v) for k, v in kwargs.items()}
            }
            cache_key = f"{prefix}:{hashlib.sha256(json.dumps(key_data).encode()).hexdigest()}"

            # Try to get from Redis
            cached = redis_client.get(cache_key)
            if cached:
                return pickle.loads(cached)

            # Compute result
            result = func(*args, **kwargs)

            # Store in Redis with TTL
            redis_client.setex(
                cache_key,
                ttl_seconds,
                pickle.dumps(result)
            )

            return result

        return wrapper
    return decorator

# Usage with Redis (for production)
# redis_client = redis.Redis(host='localhost', port=6379, db=0)
#
# @redis_cache_inference(redis_client, ttl_seconds=7200)
# def predict_embeddings(text: str) -> list[float]:
#     """Generate embeddings (cached in Redis across servers)"""
#     return [0.1, 0.2, 0.3]  # Simulate embedding

# Example 4: Advanced cache with warming and invalidation
class ModelCache:
    """Production-grade cache with warm-up and invalidation"""
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        self.stats = CacheStats()

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                self.cache.move_to_end(key)
                return value
            del self.cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self.cache[key] = (value, time.time())
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)

    def warm_up(self, common_inputs: list[tuple[Any, ...]]) -> None:
        """Pre-populate cache with common queries"""
        print(f"Warming up cache with {len(common_inputs)} entries...")
        for inputs in common_inputs:
            key = str(inputs)
            if key not in self.cache:
                # Simulate computation
                self.set(key, f"result_for_{inputs}")

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        keys_to_delete = [k for k in self.cache if pattern in k]
        for key in keys_to_delete:
            del self.cache[key]
        return len(keys_to_delete)

    def clear(self) -> None:
        self.cache.clear()
        self.stats = CacheStats()

# Production usage
model_cache = ModelCache(max_size=5000, ttl=7200)

# Warm up with common queries at startup
common_queries = [
    ("popular text 1",),
    ("popular text 2",),
]
model_cache.warm_up(common_queries)

# Invalidate when model updates
def on_model_update():
    """Called when model is retrained"""
    invalidated = model_cache.invalidate_pattern("model_v1")
    print(f"Invalidated {invalidated} cache entries")
    model_cache.clear()  # Or clear all
```

**In Practice**:
For production ML systems, implement cache at the inference endpoint level. Monitor cache hit rates with Prometheus/Grafana - if hit rate is below 20%, caching may not be worth the complexity. For LLM APIs, cache entire prompt+response pairs (prompt is the key). For embeddings models, cache is highly effective since the same text appears repeatedly. Use Redis in Kubernetes deployments to share cache across pods. Set TTL based on how often the model is retrained (e.g., 1 hour if model updates daily). For agent systems, cache tool results if tools are idempotent (read-only APIs, database queries). Always implement cache warming on service startup for high-traffic endpoints.

**Key Takeaway**: Use hash-based cache keys from function args, implement LRU eviction with TTL, expose cache statistics for monitoring, and use Redis for distributed deployments.

</details>

2. How would you create a decorator to retry failed API calls to LLM providers?

<details>
<summary>Answer: Implement exponential backoff with jitter; handle specific exceptions; add max attempts and timeout; log retries for observability</summary>

**Explanation**:
A production retry decorator for LLM APIs needs: (1) **Exponential backoff** (delay increases: 1s, 2s, 4s, 8s) to avoid overwhelming the API, (2) **Jitter** (random variation) to prevent thundering herd when multiple clients retry simultaneously, (3) **Selective retry** (only retry transient errors like 429 rate limits or 503 service unavailable, not 400 bad requests), (4) **Max attempts** with fallback, (5) **Timeout** (total retry window), (6) **Logging** for debugging and monitoring.

The decorator should distinguish between **retryable errors** (network issues, rate limits, temporary outages) and **non-retryable errors** (invalid API keys, malformed requests). For async functions, use `await asyncio.sleep()` instead of `time.sleep()` to avoid blocking the event loop. Consider **circuit breaker pattern** for extended outages - stop retrying if the API is consistently down.

For LLM APIs specifically: OpenAI returns 429 with `Retry-After` header (respect it!), rate limits are per-minute or per-day (track both), streaming responses can fail mid-stream (handle partial results). Always set a **maximum total timeout** to prevent hanging indefinitely.

**Example**:
```python
import functools
import time
import random
import asyncio
from typing import Callable, TypeVar, ParamSpec, Type, Optional
import logging

P = ParamSpec('P')
T = TypeVar('T')

logger = logging.getLogger(__name__)

# Retryable exceptions (network/rate limit errors)
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    # Add specific API exceptions here
)

def retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    exceptions: tuple[Type[Exception], ...] = RETRYABLE_EXCEPTIONS,
    timeout: Optional[float] = None,
):
    """Retry decorator with exponential backoff and jitter.

    Args:
        max_attempts: Maximum retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        exponential_base: Base for exponential backoff (2 = double each time)
        jitter: Add random variation to delay (prevent thundering herd)
        exceptions: Tuple of exception types to retry
        timeout: Maximum total time for all attempts (seconds)
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time.time()
            last_exception: Optional[Exception] = None

            for attempt in range(max_attempts):
                try:
                    # Check timeout
                    if timeout and (time.time() - start_time) >= timeout:
                        raise TimeoutError(f"Retry timeout after {timeout}s")

                    return func(*args, **kwargs)

                except exceptions as e:
                    last_exception = e

                    # Don't retry on last attempt
                    if attempt >= max_attempts - 1:
                        break

                    # Calculate delay with exponential backoff
                    delay = min(
                        initial_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    # Add jitter (random 0-25% variation)
                    if jitter:
                        delay = delay * (1 + random.uniform(-0.25, 0.25))

                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{max_attempts} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )

                    time.sleep(delay)

            # All retries exhausted
            logger.error(f"{func.__name__} failed after {max_attempts} attempts")
            raise last_exception  # type: ignore

        return wrapper
    return decorator

# Example 1: Sync LLM API call
@retry(
    max_attempts=5,
    initial_delay=1.0,
    max_delay=32.0,
    exponential_base=2.0,
    jitter=True,
    timeout=120.0
)
def call_openai_api(prompt: str, model: str = "gpt-4") -> str:
    """Call OpenAI API with retry logic"""
    import requests

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}]
        },
        headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"},
        timeout=30
    )

    # Raise for retryable status codes
    if response.status_code in (429, 503, 502, 504):
        raise ConnectionError(f"API returned {response.status_code}")

    # Don't retry client errors (bad request, auth failure)
    response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"]

# Example 2: Async version with asyncio
def async_retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
):
    """Async retry decorator"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception: Optional[Exception] = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)

                except Exception as e:
                    last_exception = e

                    if attempt >= max_attempts - 1:
                        break

                    delay = min(
                        initial_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    if jitter:
                        delay = delay * (1 + random.uniform(-0.25, 0.25))

                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{max_attempts} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )

                    await asyncio.sleep(delay)  # Non-blocking sleep

            raise last_exception  # type: ignore

        return wrapper
    return decorator

@async_retry(max_attempts=5, initial_delay=1.0)
async def async_call_openai(prompt: str) -> str:
    """Async OpenAI API call with retry"""
    import aiohttp

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.openai.com/v1/chat/completions",
            json={
                "model": "gpt-4",
                "messages": [{"role": "user", "content": prompt}]
            },
            headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"}
        ) as response:
            if response.status in (429, 503, 502, 504):
                raise ConnectionError(f"API returned {response.status}")

            response.raise_for_status()
            data = await response.json()
            return data["choices"][0]["message"]["content"]

# Example 3: Respect Retry-After header (OpenAI rate limits)
def smart_retry(max_attempts: int = 3):
    """Retry that respects Retry-After header"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)

                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:
                        # Respect Retry-After header
                        retry_after = e.response.headers.get("Retry-After")
                        if retry_after:
                            delay = int(retry_after)
                            logger.warning(f"Rate limited. Retrying after {delay}s")
                            time.sleep(delay)
                            continue

                    # Re-raise non-retryable errors
                    if e.response.status_code < 500:
                        raise

                    if attempt >= max_attempts - 1:
                        raise

                    # Default backoff for 5xx errors
                    delay = 2 ** attempt
                    time.sleep(delay)

            raise Exception("Max retries exceeded")

        return wrapper
    return decorator

# Example 4: Circuit breaker pattern (stop retrying if API is down)
class CircuitBreaker:
    """Circuit breaker to prevent retry storms"""
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time: Optional[float] = None
        self.state = "CLOSED"  # CLOSED = normal, OPEN = failing, HALF_OPEN = testing

    def call(self, func: Callable[[], T]) -> T:
        """Execute function with circuit breaker"""
        if self.state == "OPEN":
            # Check if we should try again
            if time.time() - self.last_failure_time >= self.recovery_timeout:  # type: ignore
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker OPEN - API is down")

        try:
            result = func()
            # Success - reset if in HALF_OPEN
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failures = 0
            return result

        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()

            if self.failures >= self.failure_threshold:
                self.state = "OPEN"
                logger.error("Circuit breaker opened - too many failures")

            raise

breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60.0)

@retry(max_attempts=3)
def call_with_circuit_breaker(prompt: str) -> str:
    """Combine retry + circuit breaker"""
    return breaker.call(lambda: call_openai_api(prompt))

# Example 5: Production-ready retry with metrics
import time
from dataclasses import dataclass, field

@dataclass
class RetryMetrics:
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    retry_counts: dict[int, int] = field(default_factory=dict)

    def record_success(self, attempts: int):
        self.total_calls += 1
        self.successful_calls += 1
        self.retry_counts[attempts] = self.retry_counts.get(attempts, 0) + 1

    def record_failure(self, attempts: int):
        self.total_calls += 1
        self.failed_calls += 1

def monitored_retry(metrics: RetryMetrics, max_attempts: int = 3):
    """Retry decorator with metrics tracking"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            for attempt in range(max_attempts):
                try:
                    result = func(*args, **kwargs)
                    metrics.record_success(attempt + 1)
                    return result
                except Exception as e:
                    if attempt >= max_attempts - 1:
                        metrics.record_failure(attempt + 1)
                        raise
                    time.sleep(2 ** attempt)

        return wrapper
    return decorator

api_metrics = RetryMetrics()

@monitored_retry(api_metrics, max_attempts=3)
def monitored_api_call(prompt: str) -> str:
    """API call with metrics"""
    return call_openai_api(prompt)

# Check metrics
print(f"Success rate: {api_metrics.successful_calls / api_metrics.total_calls:.2%}")
print(f"Retry distribution: {api_metrics.retry_counts}")
```

**In Practice**:
For production LLM systems, implement retry at the client library level (all API calls get retry automatically). Use exponential backoff with jitter to handle rate limits gracefully - linear backoff causes thundering herd. Set max_attempts based on SLA: 3-5 attempts for interactive APIs (chatbots), 10+ for batch processing. Always respect `Retry-After` headers. For async systems (FastAPI, agent frameworks), use async retry to avoid blocking the event loop. Implement circuit breakers when calling multiple downstream APIs - one slow API shouldn't cascade failures. Monitor retry metrics (Prometheus gauges: retry_count, failure_rate) to detect API degradation early. For cost optimization, implement backoff before hitting rate limits (predictive throttling).

**Key Takeaway**: Use exponential backoff with jitter, retry only transient errors, respect Retry-After headers, add circuit breakers for extended outages, and track retry metrics for observability.

</details>

3. What's the pattern for decorating async functions (e.g., adding logging to async API calls)?

<details>
<summary>Answer: Decorator must be async, use await for the wrapped function, handle async context managers/generators, preserve await semantics</summary>

**Explanation**:
Decorating async functions requires understanding **async/await semantics**. The decorator itself doesn't need to be async, but the wrapper function inside must be async if it calls the decorated function with `await`. Use `asyncio.iscoroutinefunction()` to detect async functions. Key considerations: (1) **Use `await`** when calling the wrapped async function, (2) **Use `asyncio.sleep()` not `time.sleep()`** for delays (blocking sleep freezes the event loop), (3) **Handle exceptions** properly (they don't propagate until awaited), (4) **Preserve coroutine type** (return a coroutine, not a regular value).

For **logging**, capture start time, await the function, log duration and result. For **retry logic**, await in a loop with `asyncio.sleep()` between attempts. For **timeouts**, use `asyncio.wait_for()`. Be careful with **shared state** in async decorators - multiple concurrent calls can interleave, causing race conditions if the decorator modifies shared data.

**Advanced patterns**: Async context managers (`async with`), async generators (`async for`), and sync/async hybrid decorators (detect function type and apply appropriate wrapper). Always use `functools.wraps` to preserve metadata, including for async functions.

**Example**:
```python
import functools
import asyncio
import time
import logging
from typing import Callable, TypeVar, ParamSpec, Awaitable
from contextlib import asynccontextmanager

P = ParamSpec('P')
T = TypeVar('T')

logger = logging.getLogger(__name__)

# Pattern 1: Basic async decorator (logging)
def async_log(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
    """Log async function calls with timing"""
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.time()
        logger.info(f"Starting {func.__name__} with args={args}, kwargs={kwargs}")

        try:
            result = await func(*args, **kwargs)
            elapsed = time.time() - start
            logger.info(f"Completed {func.__name__} in {elapsed:.4f}s")
            return result

        except Exception as e:
            elapsed = time.time() - start
            logger.error(f"Failed {func.__name__} after {elapsed:.4f}s: {e}")
            raise

    return wrapper

@async_log
async def fetch_embeddings(text: str, model: str = "ada") -> list[float]:
    """Fetch embeddings from API"""
    await asyncio.sleep(0.5)  # Simulate API call
    return [0.1, 0.2, 0.3]

# Usage
async def main():
    embeddings = await fetch_embeddings("hello world")
    print(embeddings)

asyncio.run(main())

# Pattern 2: Async retry with exponential backoff
def async_retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    exponential_base: float = 2.0
):
    """Async retry decorator"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)

                except Exception as e:
                    last_exception = e

                    if attempt >= max_attempts - 1:
                        break

                    delay = initial_delay * (exponential_base ** attempt)
                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )

                    await asyncio.sleep(delay)  # Non-blocking sleep!

            raise last_exception  # type: ignore

        return wrapper
    return decorator

@async_retry(max_attempts=3, initial_delay=1.0)
async def unreliable_api_call(url: str) -> dict:
    """API call that might fail"""
    import random
    if random.random() < 0.6:
        raise ConnectionError("API temporarily unavailable")
    return {"status": "success"}

# Pattern 3: Async timeout decorator
def async_timeout(seconds: float):
    """Add timeout to async function"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=seconds
                )
            except asyncio.TimeoutError:
                logger.error(f"{func.__name__} timed out after {seconds}s")
                raise TimeoutError(f"{func.__name__} exceeded timeout of {seconds}s")

        return wrapper
    return decorator

@async_timeout(seconds=5.0)
async def slow_llm_call(prompt: str) -> str:
    """LLM call that might be slow"""
    await asyncio.sleep(10)  # Simulates slow API
    return "Response"

# This will raise TimeoutError after 5s
# await slow_llm_call("test")

# Pattern 4: Rate limiting decorator (async-safe)
class AsyncRateLimiter:
    """Async-safe rate limiter"""
    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self.calls: list[float] = []
        self.lock = asyncio.Lock()  # Protect shared state

    async def acquire(self):
        """Wait until rate limit allows the call"""
        async with self.lock:
            now = time.time()
            # Remove old calls
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                # Calculate wait time
                oldest_call = self.calls[0]
                wait_time = self.period - (now - oldest_call)
                await asyncio.sleep(wait_time)
                # Retry acquire after waiting
                await self.acquire()
                return

            self.calls.append(now)

def async_rate_limit(limiter: AsyncRateLimiter):
    """Rate limit decorator for async functions"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            await limiter.acquire()
            return await func(*args, **kwargs)

        return wrapper
    return decorator

limiter = AsyncRateLimiter(max_calls=5, period=60.0)  # 5 calls per minute

@async_rate_limit(limiter)
async def call_expensive_api(query: str) -> str:
    """Rate-limited API call"""
    await asyncio.sleep(0.1)
    return f"Result for {query}"

# Pattern 5: Hybrid decorator (works with both sync and async)
from typing import Union, overload

@overload
def universal_timer(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

@overload
def universal_timer(func: Callable[P, T]) -> Callable[P, T]: ...

def universal_timer(
    func: Union[Callable[P, Awaitable[T]], Callable[P, T]]
) -> Union[Callable[P, Awaitable[T]], Callable[P, T]]:
    """Timer that works for both sync and async functions"""
    if asyncio.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = await func(*args, **kwargs)  # type: ignore
            print(f"Async {func.__name__} took {time.time() - start:.4f}s")
            return result
        return async_wrapper  # type: ignore
    else:
        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = func(*args, **kwargs)  # type: ignore
            print(f"Sync {func.__name__} took {time.time() - start:.4f}s")
            return result
        return sync_wrapper  # type: ignore

@universal_timer
def sync_compute(x: int) -> int:
    time.sleep(0.1)
    return x * 2

@universal_timer
async def async_compute(x: int) -> int:
    await asyncio.sleep(0.1)
    return x * 2

# Pattern 6: Async context manager decorator
@asynccontextmanager
async def async_timer_context():
    """Async context manager for timing"""
    start = time.time()
    yield
    print(f"Block took {time.time() - start:.4f}s")

# Usage
async def example():
    async with async_timer_context():
        await asyncio.sleep(0.5)

# Pattern 7: Concurrent execution decorator
def concurrent_map(max_concurrency: int = 10):
    """Execute async function concurrently on multiple inputs"""
    def decorator(
        func: Callable[[T], Awaitable[T]]
    ) -> Callable[[list[T]], Awaitable[list[T]]]:
        @functools.wraps(func)
        async def wrapper(items: list[T]) -> list[T]:
            semaphore = asyncio.Semaphore(max_concurrency)

            async def bounded_call(item: T) -> T:
                async with semaphore:
                    return await func(item)

            results = await asyncio.gather(
                *[bounded_call(item) for item in items],
                return_exceptions=False
            )
            return results

        return wrapper
    return decorator

@concurrent_map(max_concurrency=5)
async def process_item(text: str) -> str:
    """Process single item"""
    await asyncio.sleep(0.1)
    return text.upper()

# Process 100 items with max 5 concurrent
async def batch_process():
    items = [f"item_{i}" for i in range(100)]
    results = await process_item(items)  # type: ignore
    print(f"Processed {len(results)} items")

# Pattern 8: Real-world LLM API decorator
def llm_api_call(
    max_retries: int = 3,
    timeout: float = 30.0,
    rate_limiter: Optional[AsyncRateLimiter] = None
):
    """Production decorator for LLM API calls"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Apply rate limiting
            if rate_limiter:
                await rate_limiter.acquire()

            # Retry logic
            for attempt in range(max_retries):
                try:
                    # Apply timeout
                    result = await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=timeout
                    )

                    logger.info(f"{func.__name__} succeeded on attempt {attempt + 1}")
                    return result

                except asyncio.TimeoutError:
                    logger.warning(f"{func.__name__} timed out (attempt {attempt + 1})")
                    if attempt >= max_retries - 1:
                        raise

                except Exception as e:
                    logger.warning(f"{func.__name__} failed (attempt {attempt + 1}): {e}")
                    if attempt >= max_retries - 1:
                        raise

                # Exponential backoff
                await asyncio.sleep(2 ** attempt)

            raise Exception("Unreachable")

        return wrapper
    return decorator

api_limiter = AsyncRateLimiter(max_calls=10, period=60.0)

@llm_api_call(max_retries=3, timeout=30.0, rate_limiter=api_limiter)
async def call_openai_completions(prompt: str) -> str:
    """Call OpenAI with all best practices"""
    # Actual API call here
    await asyncio.sleep(0.5)
    return "LLM response"
```

**In Practice**:
For production async LLM APIs, combine multiple decorators: `@rate_limit` → `@retry` → `@timeout` → `@log` (order matters!). Use `asyncio.gather()` for parallel LLM calls (multiple prompts simultaneously). For agent systems with async tool calls, use semaphores to limit concurrency (avoid overwhelming external APIs). In FastAPI services, all endpoint handlers are async - decorate them with logging, metrics, and error tracking. For streaming responses (SSE), decorators must preserve async generator semantics (`async for`). Always use `asyncio.Lock()` for shared state in decorators to prevent race conditions. Monitor event loop lag (if blocking sleep is used accidentally, entire service freezes).

**Key Takeaway**: Async decorators must use `await` for the wrapped function, `asyncio.sleep()` for delays, and `asyncio.Lock()` for shared state; combine decorators for production patterns like retry + timeout + rate limit.

</details>

4. How do you implement function wrappers that track model performance metrics?

<details>
<summary>Answer: Use decorators to track latency, throughput, error rates, and resource usage; export metrics to Prometheus/StatsD for dashboards</summary>

**Explanation**:
Performance tracking decorators capture key metrics: (1) **Latency** (p50, p95, p99 percentiles, not just averages), (2) **Throughput** (requests per second), (3) **Error rates** (by exception type), (4) **Resource usage** (memory, GPU utilization), (5) **Business metrics** (model version, input characteristics). These metrics are exported to monitoring systems like Prometheus (pull-based), StatsD (push-based), or CloudWatch.

The decorator pattern allows **non-invasive instrumentation** - add metrics without modifying model code. Use **context variables** or thread-locals to track request-scoped data (user ID, session ID, trace ID for distributed tracing). For ML models, track **input/output distributions** to detect data drift (input values shifting from training distribution).

Key considerations: (1) **Low overhead** - metrics collection shouldn't significantly slow down inference, (2) **Aggregation** - store summaries (histograms), not raw values, (3) **Labels** - tag metrics with dimensions (model_version, endpoint, error_type) for filtering, (4) **Sampling** - for high-throughput systems, sample 1-10% of requests for detailed tracking.

**Example**:
```python
import functools
import time
import logging
from typing import Callable, TypeVar, ParamSpec, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import threading
import numpy as np

P = ParamSpec('P')
T = TypeVar('T')

logger = logging.getLogger(__name__)

# Metrics storage (in production, use Prometheus client library)
@dataclass
class MetricsCollector:
    """Thread-safe metrics collector"""
    call_count: int = 0
    error_count: int = 0
    total_latency: float = 0.0
    latencies: list[float] = field(default_factory=list)
    error_types: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    lock: threading.Lock = field(default_factory=threading.Lock)

    def record_success(self, latency: float):
        with self.lock:
            self.call_count += 1
            self.total_latency += latency
            self.latencies.append(latency)

            # Keep only recent latencies (sliding window)
            if len(self.latencies) > 1000:
                self.latencies = self.latencies[-1000:]

    def record_error(self, error_type: str, latency: float):
        with self.lock:
            self.call_count += 1
            self.error_count += 1
            self.total_latency += latency
            self.error_types[error_type] += 1

    def get_stats(self) -> dict[str, Any]:
        with self.lock:
            if not self.latencies:
                return {}

            return {
                "total_calls": self.call_count,
                "error_count": self.error_count,
                "error_rate": self.error_count / self.call_count if self.call_count > 0 else 0,
                "avg_latency": self.total_latency / self.call_count if self.call_count > 0 else 0,
                "p50_latency": np.percentile(self.latencies, 50),
                "p95_latency": np.percentile(self.latencies, 95),
                "p99_latency": np.percentile(self.latencies, 99),
                "max_latency": max(self.latencies),
                "min_latency": min(self.latencies),
                "error_breakdown": dict(self.error_types),
            }

# Pattern 1: Basic metrics decorator
def track_metrics(metrics: MetricsCollector):
    """Decorator to track function performance metrics"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()

            try:
                result = func(*args, **kwargs)
                latency = time.time() - start
                metrics.record_success(latency)
                return result

            except Exception as e:
                latency = time.time() - start
                error_type = type(e).__name__
                metrics.record_error(error_type, latency)
                raise

        return wrapper
    return decorator

# Usage
model_metrics = MetricsCollector()

@track_metrics(model_metrics)
def predict(features: list[float]) -> str:
    """Model inference"""
    time.sleep(0.1)  # Simulate inference
    return "prediction"

# Make some calls
for _ in range(100):
    try:
        predict([1.0, 2.0, 3.0])
    except Exception:
        pass

# Check metrics
stats = model_metrics.get_stats()
print(f"P95 latency: {stats['p95_latency']:.4f}s")
print(f"Error rate: {stats['error_rate']:.2%}")

# Pattern 2: Prometheus integration
try:
    from prometheus_client import Counter, Histogram, Gauge
    import time

    # Define Prometheus metrics
    REQUEST_COUNT = Counter(
        'model_requests_total',
        'Total model inference requests',
        ['model_name', 'status']
    )

    REQUEST_LATENCY = Histogram(
        'model_request_duration_seconds',
        'Model inference latency',
        ['model_name'],
        buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
    )

    ACTIVE_REQUESTS = Gauge(
        'model_active_requests',
        'Currently active inference requests',
        ['model_name']
    )

    def prometheus_metrics(model_name: str):
        """Decorator that exports metrics to Prometheus"""
        def decorator(func: Callable[P, T]) -> Callable[P, T]:
            @functools.wraps(func)
            def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                ACTIVE_REQUESTS.labels(model_name=model_name).inc()
                start = time.time()

                try:
                    result = func(*args, **kwargs)
                    latency = time.time() - start

                    REQUEST_COUNT.labels(model_name=model_name, status='success').inc()
                    REQUEST_LATENCY.labels(model_name=model_name).observe(latency)

                    return result

                except Exception as e:
                    latency = time.time() - start

                    REQUEST_COUNT.labels(model_name=model_name, status='error').inc()
                    REQUEST_LATENCY.labels(model_name=model_name).observe(latency)

                    raise

                finally:
                    ACTIVE_REQUESTS.labels(model_name=model_name).dec()

            return wrapper
        return decorator

    @prometheus_metrics(model_name="sentiment_classifier")
    def classify_sentiment(text: str) -> dict[str, float]:
        """Classify text sentiment"""
        time.sleep(0.05)
        return {"positive": 0.8, "negative": 0.2}

except ImportError:
    logger.warning("prometheus_client not installed")

# Pattern 3: Detailed metrics with input/output tracking
@dataclass
class DetailedMetrics:
    """Track input/output distributions for drift detection"""
    input_sizes: list[int] = field(default_factory=list)
    output_values: list[Any] = field(default_factory=list)
    latencies_by_size: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))

    def record(self, input_size: int, output: Any, latency: float):
        self.input_sizes.append(input_size)
        self.output_values.append(output)

        # Bucket by input size
        if input_size < 100:
            bucket = "small"
        elif input_size < 1000:
            bucket = "medium"
        else:
            bucket = "large"

        self.latencies_by_size[bucket].append(latency)

    def detect_drift(self) -> dict[str, Any]:
        """Detect if input distribution is shifting"""
        if len(self.input_sizes) < 100:
            return {"status": "insufficient_data"}

        recent = self.input_sizes[-100:]
        historical = self.input_sizes[-1000:-100] if len(self.input_sizes) >= 1000 else []

        if not historical:
            return {"status": "no_baseline"}

        # Compare distributions (simple mean comparison; use KS test in production)
        recent_mean = np.mean(recent)
        historical_mean = np.mean(historical)
        drift_pct = abs(recent_mean - historical_mean) / historical_mean * 100

        return {
            "status": "drift_detected" if drift_pct > 10 else "stable",
            "drift_percentage": drift_pct,
            "recent_mean": recent_mean,
            "historical_mean": historical_mean,
        }

detailed_metrics = DetailedMetrics()

def track_io_metrics(metrics: DetailedMetrics):
    """Track input/output distributions"""
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()

            # Extract input size (assumes first arg is input data)
            input_size = len(args[0]) if args and hasattr(args[0], '__len__') else 0

            result = func(*args, **kwargs)
            latency = time.time() - start

            metrics.record(input_size, result, latency)

            return result

        return wrapper
    return decorator

@track_io_metrics(detailed_metrics)
def batch_predict(inputs: list[str]) -> list[str]:
    """Batch prediction"""
    time.sleep(len(inputs) * 0.01)  # Latency scales with batch size
    return [f"pred_{i}" for i in range(len(inputs))]

# Generate traffic
for _ in range(200):
    import random
    batch_size = random.randint(10, 500)
    batch_predict([f"input_{i}" for i in range(batch_size)])

# Check for drift
drift_report = detailed_metrics.detect_drift()
print(f"Drift status: {drift_report}")

# Pattern 4: GPU utilization tracking (requires pynvml)
try:
    import pynvml

    def track_gpu_metrics(func: Callable[P, T]) -> Callable[P, T]:
        """Track GPU memory and utilization"""
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)

            # Before inference
            mem_before = pynvml.nvmlDeviceGetMemoryInfo(handle).used

            result = func(*args, **kwargs)

            # After inference
            mem_after = pynvml.nvmlDeviceGetMemoryInfo(handle).used
            mem_used = (mem_after - mem_before) / 1024**3  # GB

            utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
            logger.info(
                f"{func.__name__}: GPU memory used: {mem_used:.2f}GB, "
                f"GPU utilization: {utilization.gpu}%"
            )

            pynvml.nvmlShutdown()
            return result

        return wrapper
    return decorator

except ImportError:
    logger.warning("pynvml not installed")

# Pattern 5: Async metrics decorator
import asyncio

async_metrics = MetricsCollector()

def async_track_metrics(metrics: MetricsCollector):
    """Async version of metrics decorator"""
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()

            try:
                result = await func(*args, **kwargs)
                latency = time.time() - start
                metrics.record_success(latency)
                return result

            except Exception as e:
                latency = time.time() - start
                metrics.record_error(type(e).__name__, latency)
                raise

        return wrapper
    return decorator

@async_track_metrics(async_metrics)
async def async_llm_call(prompt: str) -> str:
    """Async LLM API call with metrics"""
    await asyncio.sleep(0.2)
    return "LLM response"

# Pattern 6: Real-world production metrics class
class ProductionMetrics:
    """Complete production metrics solution"""
    def __init__(self, model_name: str, export_interval: int = 60):
        self.model_name = model_name
        self.export_interval = export_interval
        self.metrics = MetricsCollector()

        # Start background export thread
        self.export_thread = threading.Thread(target=self._export_loop, daemon=True)
        self.export_thread.start()

    def _export_loop(self):
        """Periodically export metrics"""
        while True:
            time.sleep(self.export_interval)
            stats = self.metrics.get_stats()

            # Export to monitoring system (CloudWatch, Prometheus, etc.)
            logger.info(f"Metrics for {self.model_name}: {stats}")

            # In production, push to actual monitoring system:
            # cloudwatch.put_metric_data(...)
            # statsd.gauge(f"{self.model_name}.p95_latency", stats['p95_latency'])

    def __call__(self, func: Callable[P, T]) -> Callable[P, T]:
        """Use as decorator"""
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()

            try:
                result = func(*args, **kwargs)
                latency = time.time() - start
                self.metrics.record_success(latency)
                return result

            except Exception as e:
                latency = time.time() - start
                self.metrics.record_error(type(e).__name__, latency)
                raise

        return wrapper

# Usage
production_metrics = ProductionMetrics(model_name="bert_classifier", export_interval=60)

@production_metrics
def production_inference(text: str) -> dict:
    """Production model inference with full metrics"""
    time.sleep(0.1)
    return {"label": "positive", "score": 0.95}
```

**In Practice**:
For production ML systems, instrument all model inference endpoints with metrics decorators. Use Prometheus for pull-based metrics (Kubernetes) or StatsD for push-based (AWS Lambda). Track p95/p99 latencies, not just averages - tail latencies reveal performance issues. Add labels for model version, endpoint, error type to enable filtering in dashboards. For cost optimization, track GPU utilization and memory usage per request. Implement drift detection by logging input distributions (histogram of input sizes, value ranges). For A/B testing, tag metrics with experiment IDs. Use sampling for high-volume endpoints (track 10% of requests in detail). Set up alerts on error rate > 1%, p99 latency > SLA, or drift detection. For LLM APIs, track tokens per request and cost per request.

**Key Takeaway**: Use decorators to track latency percentiles (p50/p95/p99), error rates, and resource usage; export to Prometheus/StatsD with labels for filtering; track input distributions for drift detection.

</details>

5. How do you create a decorator that works for both sync and async functions?

<details>
<summary>Answer: Detect function type with asyncio.iscoroutinefunction(), return appropriate wrapper; use typing.overload for type safety</summary>

**Explanation**:
Creating a universal decorator requires **runtime detection** of whether the decorated function is sync or async, then returning the appropriate wrapper. Use `asyncio.iscoroutinefunction(func)` or `inspect.iscoroutinefunction(func)` to detect async functions. The decorator must handle three scenarios: (1) decorating a sync function (return sync wrapper), (2) decorating an async function (return async wrapper), (3) being called with or without arguments (optional decorator arguments).

For **type safety**, use `@typing.overload` to declare separate signatures for sync and async cases. This allows type checkers (mypy, pyright) to understand that decorating `async def foo() -> int` returns `async def foo() -> int`, not a generic callable. The implementation uses `Union[Callable[P, T], Callable[P, Awaitable[T]]]` to handle both cases.

**Key challenges**: (1) Type checkers struggle with runtime-dependent return types - use `type: ignore` selectively, (2) Decorator arguments require an extra nesting level, (3) Preserving `functools.wraps` metadata for both sync and async, (4) Testing both code paths to ensure correctness.

**Example**:
```python
import functools
import asyncio
import time
import inspect
from typing import Callable, TypeVar, ParamSpec, Union, Awaitable, overload, Any

P = ParamSpec('P')
T = TypeVar('T')

# Pattern 1: Simple universal decorator (no arguments)
@overload
def universal_log(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

@overload
def universal_log(func: Callable[P, T]) -> Callable[P, T]: ...

def universal_log(
    func: Union[Callable[P, Awaitable[T]], Callable[P, T]]
) -> Union[Callable[P, Awaitable[T]], Callable[P, T]]:
    """Decorator that works for both sync and async functions"""

    if asyncio.iscoroutinefunction(func):
        # Async version
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            print(f"[ASYNC] Calling {func.__name__}")
            result = await func(*args, **kwargs)  # type: ignore
            print(f"[ASYNC] Finished {func.__name__}")
            return result
        return async_wrapper  # type: ignore

    else:
        # Sync version
        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            print(f"[SYNC] Calling {func.__name__}")
            result = func(*args, **kwargs)  # type: ignore
            print(f"[SYNC] Finished {func.__name__}")
            return result
        return sync_wrapper  # type: ignore

# Test sync
@universal_log
def sync_compute(x: int) -> int:
    return x * 2

result: int = sync_compute(5)  # Type checker knows it's int
print(result)  # 10

# Test async
@universal_log
async def async_compute(x: int) -> int:
    await asyncio.sleep(0.1)
    return x * 2

async def main():
    result: int = await async_compute(5)  # Type checker knows it's awaitable
    print(result)  # 10

asyncio.run(main())

# Pattern 2: Universal decorator WITH arguments
def universal_retry(max_attempts: int = 3, delay: float = 1.0):
    """Universal retry decorator with arguments"""

    @overload
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

    @overload
    def decorator(func: Callable[P, T]) -> Callable[P, T]: ...

    def decorator(
        func: Union[Callable[P, Awaitable[T]], Callable[P, T]]
    ) -> Union[Callable[P, Awaitable[T]], Callable[P, T]]:

        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                for attempt in range(max_attempts):
                    try:
                        return await func(*args, **kwargs)  # type: ignore
                    except Exception as e:
                        if attempt >= max_attempts - 1:
                            raise
                        print(f"Async attempt {attempt + 1} failed, retrying...")
                        await asyncio.sleep(delay)
                raise Exception("Unreachable")
            return async_wrapper  # type: ignore

        else:
            @functools.wraps(func)
            def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                for attempt in range(max_attempts):
                    try:
                        return func(*args, **kwargs)  # type: ignore
                    except Exception as e:
                        if attempt >= max_attempts - 1:
                            raise
                        print(f"Sync attempt {attempt + 1} failed, retrying...")
                        time.sleep(delay)
                raise Exception("Unreachable")
            return sync_wrapper  # type: ignore

    return decorator

@universal_retry(max_attempts=3, delay=0.5)
def sync_api_call() -> str:
    import random
    if random.random() < 0.7:
        raise ConnectionError("Failed")
    return "Success"

@universal_retry(max_attempts=3, delay=0.5)
async def async_api_call() -> str:
    import random
    if random.random() < 0.7:
        raise ConnectionError("Failed")
    return "Success"

# Pattern 3: Optional arguments (can be used with or without parens)
def smart_timer(
    func: Optional[Callable] = None,
    *,
    unit: str = "seconds"
):
    """Can be used as @smart_timer or @smart_timer(unit="ms")"""

    def decorator(fn: Union[Callable[P, Awaitable[T]], Callable[P, T]]):
        if asyncio.iscoroutinefunction(fn):
            @functools.wraps(fn)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                start = time.time()
                result = await fn(*args, **kwargs)  # type: ignore
                elapsed = time.time() - start
                if unit == "ms":
                    elapsed *= 1000
                print(f"{fn.__name__} took {elapsed:.2f} {unit}")
                return result
            return async_wrapper
        else:
            @functools.wraps(fn)
            def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                start = time.time()
                result = fn(*args, **kwargs)  # type: ignore
                elapsed = time.time() - start
                if unit == "ms":
                    elapsed *= 1000
                print(f"{fn.__name__} took {elapsed:.2f} {unit}")
                return result
            return sync_wrapper

    if func is not None:
        # Called without arguments: @smart_timer
        return decorator(func)
    else:
        # Called with arguments: @smart_timer(unit="ms")
        return decorator

@smart_timer  # No parens
def compute1(x: int) -> int:
    time.sleep(0.1)
    return x * 2

@smart_timer(unit="ms")  # With args
async def compute2(x: int) -> int:
    await asyncio.sleep(0.1)
    return x * 2

# Pattern 4: Using inspect for more robust detection
def robust_universal(func: Union[Callable[P, Awaitable[T]], Callable[P, T]]):
    """More robust detection using inspect module"""

    # Multiple ways to detect async functions
    is_async = (
        asyncio.iscoroutinefunction(func) or
        inspect.iscoroutinefunction(func) or
        inspect.isasyncgenfunction(func)
    )

    if is_async:
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            result = await func(*args, **kwargs)  # type: ignore
            return result
        return async_wrapper  # type: ignore
    else:
        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            result = func(*args, **kwargs)  # type: ignore
            return result
        return sync_wrapper  # type: ignore

# Pattern 5: Real-world example - rate limiter for both sync and async
class UniversalRateLimiter:
    """Rate limiter that works for both sync and async"""
    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self.calls: list[float] = []
        self.sync_lock = threading.Lock()
        self.async_lock = asyncio.Lock()

    def _check_rate_limit_sync(self) -> None:
        """Sync rate limit check"""
        with self.sync_lock:
            now = time.time()
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                wait_time = self.period - (now - self.calls[0])
                raise RuntimeError(f"Rate limited. Wait {wait_time:.1f}s")

            self.calls.append(now)

    async def _check_rate_limit_async(self) -> None:
        """Async rate limit check"""
        async with self.async_lock:
            now = time.time()
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                wait_time = self.period - (now - self.calls[0])
                await asyncio.sleep(wait_time)
                await self._check_rate_limit_async()
                return

            self.calls.append(now)

    @overload
    def __call__(self, func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

    @overload
    def __call__(self, func: Callable[P, T]) -> Callable[P, T]: ...

    def __call__(
        self,
        func: Union[Callable[P, Awaitable[T]], Callable[P, T]]
    ) -> Union[Callable[P, Awaitable[T]], Callable[P, T]]:

        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                await self._check_rate_limit_async()
                return await func(*args, **kwargs)  # type: ignore
            return async_wrapper  # type: ignore
        else:
            @functools.wraps(func)
            def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                self._check_rate_limit_sync()
                return func(*args, **kwargs)  # type: ignore
            return sync_wrapper  # type: ignore

limiter = UniversalRateLimiter(max_calls=5, period=10.0)

@limiter
def sync_api():
    return "sync result"

@limiter
async def async_api():
    return "async result"

# Pattern 6: Testing universal decorators
import unittest

class TestUniversalDecorator(unittest.TestCase):
    def test_sync_function(self):
        """Test decorator on sync function"""
        call_count = 0

        def counter(func):
            if asyncio.iscoroutinefunction(func):
                @functools.wraps(func)
                async def async_wrapper(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    return await func(*args, **kwargs)
                return async_wrapper
            else:
                @functools.wraps(func)
                def sync_wrapper(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    return func(*args, **kwargs)
                return sync_wrapper

        @counter
        def add(x, y):
            return x + y

        result = add(2, 3)
        self.assertEqual(result, 5)
        self.assertEqual(call_count, 1)

    def test_async_function(self):
        """Test decorator on async function"""
        call_count = 0

        def counter(func):
            if asyncio.iscoroutinefunction(func):
                @functools.wraps(func)
                async def async_wrapper(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    return await func(*args, **kwargs)
                return async_wrapper
            else:
                @functools.wraps(func)
                def sync_wrapper(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    return func(*args, **kwargs)
                return sync_wrapper

        @counter
        async def add_async(x, y):
            return x + y

        result = asyncio.run(add_async(2, 3))
        self.assertEqual(result, 5)
        self.assertEqual(call_count, 1)
```

**In Practice**:
For production ML libraries, universal decorators enable consistent API across sync and async codebases. Use for cross-cutting concerns: logging, metrics, retry, rate limiting. For LLM APIs, provide both sync and async clients with the same decorator-based functionality. In FastAPI (async) and Flask (sync) services, reuse the same decorator definitions. Be aware of performance: detecting function type at decoration time is cheap; doing it at call time is expensive. For agent frameworks that mix sync tools (file I/O) and async tools (API calls), universal decorators simplify tool registration. Always test both code paths - a bug in the async branch may not surface until production.

**Key Takeaway**: Detect function type with `asyncio.iscoroutinefunction()`, return appropriate async or sync wrapper, use `@overload` for type safety, test both code paths.

</details>

6. What are the memory implications of closures in long-running services?

<details>
<summary>Answer: Closures capture and retain references to outer scope variables, preventing garbage collection; can cause memory leaks if large objects are captured</summary>

**Explanation**:
**Closures extend object lifetimes** by holding references to variables from enclosing scopes. When a function creates a closure, Python stores the captured variables in **cell objects** that persist as long as the closure exists. This prevents garbage collection of those objects, even if they would otherwise be freed. In long-running services (web servers, batch processors), this can cause **memory leaks** if closures capture large objects (trained models, datasets, cached results).

**Common leak scenarios**: (1) **Event handlers** that capture request data but live forever, (2) **Decorator closures** that capture configuration or state and are never released, (3) **Callback functions** registered in global registries that capture context, (4) **Generator functions** (closures) that capture large datasets and are never exhausted.

**Solutions**: (1) **Explicitly del captured variables** when done (breaks closure, use carefully), (2) **Use weak references** (`weakref.ref`) for objects that should be GC'd, (3) **Avoid capturing large objects** - pass them as arguments instead, (4) **Use `__slots__` or dataclasses** to reduce closure size, (5) **Profile memory** with `tracemalloc` or `memory_profiler` to find leaks.

**Example**:
```python
import functools
import sys
import gc
import weakref
from typing import Callable, Any
import tracemalloc

# Problem 1: Closure captures large object
def create_processor():
    """Creates a closure that leaks memory"""
    large_data = [i for i in range(10_000_000)]  # ~80MB list

    def process():
        # Uses large_data
        return sum(large_data[:10])

    return process

# Each processor holds 80MB in memory!
processors = [create_processor() for _ in range(10)]

print(f"Memory used by closures: {sys.getsizeof(processors)} bytes")
# large_data is captured and can't be GC'd even if not used anymore

# Solution 1: Don't capture large objects - pass as argument
def create_processor_fixed():
    """Fixed version - doesn't capture large_data"""
    def process(data):
        return sum(data[:10])

    return process

# Data is not captured in closure
processors_fixed = [create_processor_fixed() for _ in range(10)]
large_data = [i for i in range(10_000_000)]

for proc in processors_fixed:
    result = proc(large_data)

# large_data can be GC'd after use
del large_data
gc.collect()

# Problem 2: Decorator closure captures model (memory leak)
def cache_predictions_leaky(model):
    """Leaky decorator - captures model forever"""
    cache = {}

    def decorator(func):
        @functools.wraps(func)
        def wrapper(input_data):
            key = str(input_data)
            if key not in cache:
                cache[key] = func(model, input_data)  # Captures model
            return cache[key]
        return wrapper
    return decorator

# Model captured in closure, never released
# @cache_predictions_leaky(my_model)  # DON'T DO THIS
# def predict(model, data):
#     return model.predict(data)

# Solution 2: Use weak references
def cache_predictions_fixed(model):
    """Fixed with weak reference"""
    model_ref = weakref.ref(model)  # Weak reference
    cache = {}

    def decorator(func):
        @functools.wraps(func)
        def wrapper(input_data):
            model = model_ref()  # Dereference
            if model is None:
                raise RuntimeError("Model was garbage collected")

            key = str(input_data)
            if key not in cache:
                cache[key] = func(model, input_data)
            return cache[key]
        return wrapper
    return decorator

# Problem 3: Closure in event handlers (typical web service leak)
class LeakyEventSystem:
    """Event system that leaks memory"""
    def __init__(self):
        self.handlers = []

    def on_event(self, event_type):
        """Decorator to register event handler"""
        def decorator(func):
            # Closure captures event_type (small, OK)
            # But handler lives forever!
            self.handlers.append((event_type, func))
            return func
        return decorator

    def process_request(self, request_data):
        """Process request - handlers capture request_data!"""
        @self.on_event("process")
        def handler():
            # This closure captures request_data
            # Handler is registered globally and NEVER removed
            # request_data can't be GC'd!
            return request_data["value"]

        return handler()

# Solution 3: Explicit cleanup or avoid closures in hot paths
class FixedEventSystem:
    """Event system with proper cleanup"""
    def __init__(self):
        self.handlers = []

    def on_event(self, event_type, handler):
        """Register handler without closure"""
        self.handlers.append((event_type, handler))

    def remove_handler(self, handler):
        """Cleanup method"""
        self.handlers = [(t, h) for t, h in self.handlers if h != handler]

    def process_request(self, request_data):
        """Process without creating persistent closures"""
        def handler():
            return request_data["value"]

        # Register, use, then remove
        self.on_event("process", handler)
        result = handler()
        self.remove_handler(handler)
        return result

# Problem 4: Generator closure captures large context
def leaky_generator(large_dataset):
    """Generator that captures large dataset"""
    # large_dataset is captured in closure

    def gen():
        for item in large_dataset:
            yield item * 2

    return gen()

# large_dataset can't be GC'd until generator is exhausted or deleted
large_list = [i for i in range(10_000_000)]
gen = leaky_generator(large_list)

# Use just one value
first_value = next(gen)

# large_list is STILL in memory because gen captures it!
print(f"Generator object size: {sys.getsizeof(gen)}")

# Solution 4: Explicitly delete generator when done
del gen
gc.collect()  # Now large_list can be GC'd

# Debugging tool: Find what a closure captures
def inspect_closure(func):
    """Inspect closure variables"""
    if func.__closure__:
        print(f"Function {func.__name__} captures {len(func.__closure__)} variables:")
        for i, cell in enumerate(func.__closure__):
            var_name = func.__code__.co_freevars[i]
            var_value = cell.cell_contents
            var_size = sys.getsizeof(var_value)
            print(f"  {var_name}: {type(var_value).__name__} ({var_size} bytes)")
    else:
        print(f"Function {func.__name__} has no closure")

def example():
    large_list = [1] * 1_000_000
    small_int = 42

    def closure():
        return len(large_list) + small_int

    inspect_closure(closure)
    return closure

my_closure = example()
# Output:
#   large_list: list (8000056 bytes)
#   small_int: int (28 bytes)

# Production pattern: Memory profiling decorators
def profile_memory(func):
    """Decorator to profile memory usage"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        tracemalloc.start()

        result = func(*args, **kwargs)

        current, peak = tracemalloc.get_traced_memory()
        print(f"{func.__name__}: Current memory: {current / 1024 / 1024:.2f} MB")
        print(f"{func.__name__}: Peak memory: {peak / 1024 / 1024:.2f} MB")

        tracemalloc.stop()
        return result
    return wrapper

@profile_memory
def process_data():
    """Function to profile"""
    data = [i for i in range(1_000_000)]
    result = sum(data)
    return result

# Best practices for closures in long-running services:

# 1. ✓ Capture immutable values (small footprint)
def good_closure(config_value: int):
    def process(data):
        return data * config_value  # Captures small int (28 bytes)
    return process

# 2. ✗ Don't capture large mutable objects
def bad_closure(model):  # Model could be 500MB!
    def process(data):
        return model.predict(data)  # Captures entire model
    return process

# 3. ✓ Use weak references for large objects
def good_closure_large(model):
    model_ref = weakref.ref(model)
    def process(data):
        m = model_ref()
        if m is None:
            raise RuntimeError("Model GC'd")
        return m.predict(data)
    return process

# 4. ✓ Explicitly break closures when done
def explicit_cleanup():
    large_data = create_large_data()

    def process():
        return compute(large_data)

    result = process()

    # Break closure by deleting captured variable
    del large_data
    gc.collect()

    return result

# 5. ✓ Monitor closure memory in production
def monitor_closure_memory(func):
    """Decorator to monitor closure memory"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if func.__closure__:
            total_size = sum(
                sys.getsizeof(cell.cell_contents)
                for cell in func.__closure__
            )
            if total_size > 1_000_000:  # > 1MB
                print(f"WARNING: {func.__name__} closure is large ({total_size} bytes)")

        return func(*args, **kwargs)
    return wrapper
```

**In Practice**:
For production ML services, avoid capturing models in decorator closures - pass models as function arguments instead. For LLM agent tools, closures that capture API clients are fine (small), but don't capture request contexts (can grow large with conversation history). In web services, never create closures in request handlers that capture request data and register globally (common leak pattern). Use weak references when closures must capture large objects. Monitor memory with `tracemalloc` in staging - if memory grows linearly with requests, suspect closure leaks. For batch processing, explicitly delete closures after use (`del func; gc.collect()`). Profile closure variables with the inspection pattern to find unexpected large captures. In Kubernetes, closure leaks manifest as gradual memory increase until OOM kill.

**Key Takeaway**: Closures capture and retain references to outer scope variables, preventing garbage collection; avoid capturing large objects, use weak references when needed, and explicitly delete closures in long-running services.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#decorators) for comprehensive list

## Summary

**In 3 sentences**:
- [Summary point 1]
- [Summary point 2]
- [Summary point 3]

**Key takeaway**: [One memorable insight]
