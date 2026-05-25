# Type Hints & Static Typing

> **Before you start**: Do you understand functions and classes? If not, review [Functions](../01-fundamentals/04-functions.md) and [OOP Basics](../02-intermediate/01-oop-basics.md)

## What are Type Hints?

**Simple explanation**: Type hints are optional annotations that tell you (and your IDE) what type of data a variable, parameter, or return value should be. Python doesn't enforce them at runtime—they're documentation that helps catch bugs early.

**Analogy**: It's like labeling your storage boxes. The label doesn't stop you from putting the wrong things inside, but it helps you (and others) know what belongs there and catch mistakes before they cause problems.

**Without type hints**:
```python
def calculate_discount(price, discount):
    return price * (1 - discount)

# What types are price and discount? 🤷
# What does it return? 🤷
```

**With type hints**:
```python
def calculate_discount(price: float, discount: float) -> float:
    return price * (1 - discount)

# Clear: takes two floats, returns a float ✅
```

**Key point**: Python is still dynamically typed—type hints are **optional** and don't affect runtime behavior. They're for:
- Developer documentation
- IDE autocomplete and error detection
- Static analysis tools (mypy, pyright)

## Why This Matters for AI/ML

1. **Large Codebases**: Type hints make code self-documenting
   ```python
   def train_model(
       data: pd.DataFrame,
       config: ModelConfig,
       epochs: int
   ) -> Tuple[Model, float]:
       """Clear what inputs and outputs are"""
       ...
   ```

2. **Catch Bugs Early**: Before runtime
   ```python
   def predict(model: Model, input: np.ndarray) -> np.ndarray:
       return model(input)

   # mypy catches this error:
   predict(model, "wrong type")  # Error: str not compatible with np.ndarray
   ```

3. **Better IDE Support**: Autocomplete, refactoring
   ```python
   config: ModelConfig = load_config()
   config.  # IDE shows all ModelConfig attributes
   ```

4. **Team Collaboration**: Makes APIs clear
   ```python
   # Clear contract - no need to read implementation
   def preprocess_data(
       raw_data: List[str],
       vocab: Dict[str, int]
   ) -> torch.Tensor:
       ...
   ```

## Basic Type Hints

### Simple Types

```python
# Built-in types
age: int = 25
name: str = "Alice"
score: float = 95.5
is_active: bool = True

# Variables without initial values
count: int
result: float

# Function parameters and return types
def greet(name: str) -> str:
    return f"Hello, {name}"

def add(a: int, b: int) -> int:
    return a + b

# No return value
def log_message(msg: str) -> None:
    print(msg)
```

### Collection Types

```python
from typing import List, Dict, Set, Tuple

# Lists
numbers: List[int] = [1, 2, 3, 4, 5]
names: List[str] = ["Alice", "Bob"]

# Dictionaries
scores: Dict[str, int] = {"Alice": 95, "Bob": 87}
config: Dict[str, float] = {"lr": 0.001, "momentum": 0.9}

# Sets
unique_ids: Set[int] = {1, 2, 3}

# Tuples (fixed size)
coordinates: Tuple[float, float] = (10.5, 20.3)
rgb: Tuple[int, int, int] = (255, 128, 0)

# Tuple of variable length
values: Tuple[int, ...] = (1, 2, 3, 4, 5)
```

**Python 3.9+ syntax** (cleaner):
```python
# No need to import from typing
numbers: list[int] = [1, 2, 3]
scores: dict[str, int] = {"Alice": 95}
coords: tuple[float, float] = (10.5, 20.3)
```

### Optional Types

```python
from typing import Optional

# Optional[T] means "T or None"
def find_user(user_id: int) -> Optional[str]:
    if user_exists(user_id):
        return get_username(user_id)
    return None  # Explicitly allows None

# Using the value
username: Optional[str] = find_user(123)
if username is not None:
    print(username.upper())  # Safe - checked for None
```

**Python 3.10+ syntax**:
```python
# Use | (union) instead of Optional
def find_user(user_id: int) -> str | None:
    ...
```

### Union Types

```python
from typing import Union

# Can be one of multiple types
def process_input(value: Union[int, float, str]) -> str:
    return str(value)

# Python 3.10+
def process_input(value: int | float | str) -> str:
    return str(value)
```

## Advanced Type Hints

### Type Aliases

```python
from typing import Dict, List

# Create aliases for complex types
UserId = int
Username = str
UserData = Dict[UserId, Username]

users: UserData = {1: "Alice", 2: "Bob"}

# ML example
Features = List[float]
Label = int
Dataset = List[Tuple[Features, Label]]

def train(dataset: Dataset) -> Model:
    ...
```

### Generic Types

```python
from typing import TypeVar, Generic, List

# Define a generic type variable
T = TypeVar('T')

def get_first(items: List[T]) -> T:
    """Return first item, preserving type"""
    return items[0]

# Type checker knows these return the correct type
num: int = get_first([1, 2, 3])        # int
name: str = get_first(["a", "b", "c"]) # str
```

**Generic classes**:
```python
from typing import Generic, TypeVar

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self.items: List[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()

# Type-safe stacks
int_stack: Stack[int] = Stack()
int_stack.push(42)
value: int = int_stack.pop()  # Type checker knows it's int
```

### Callable Types

```python
from typing import Callable

# Function that takes another function
def apply_twice(
    func: Callable[[int], int],
    value: int
) -> int:
    return func(func(value))

def double(x: int) -> int:
    return x * 2

result = apply_twice(double, 5)  # 20

# ML callback example
LossFunction = Callable[[torch.Tensor, torch.Tensor], torch.Tensor]

def train_epoch(
    model: Model,
    data: DataLoader,
    loss_fn: LossFunction
) -> float:
    ...
```

### Literal Types

```python
from typing import Literal

# Only specific values allowed
Mode = Literal["train", "eval", "test"]

def set_mode(model: Model, mode: Mode) -> None:
    if mode == "train":
        model.train()
    elif mode == "eval":
        model.eval()

# Type checker enforces this
set_mode(model, "train")  # ✅ OK
set_mode(model, "invalid")  # ❌ Error: Literal["train", "eval", "test"] expected
```

### Protocol Types (Structural Typing)

```python
from typing import Protocol

# Define interface without inheritance
class Transformer(Protocol):
    def fit(self, data: np.ndarray) -> None:
        ...

    def transform(self, data: np.ndarray) -> np.ndarray:
        ...

# Any class with these methods works
class StandardScaler:
    def fit(self, data: np.ndarray) -> None:
        self.mean = data.mean()

    def transform(self, data: np.ndarray) -> np.ndarray:
        return data - self.mean

# Type checker accepts it (duck typing)
def preprocess(
    data: np.ndarray,
    transformer: Transformer  # Any class with fit/transform
) -> np.ndarray:
    transformer.fit(data)
    return transformer.transform(data)

scaler = StandardScaler()
preprocess(data, scaler)  # ✅ Works
```

**Java comparison**:
```java
// Java - explicit interface implementation required
public class StandardScaler implements Transformer {
    public void fit(double[] data) { ... }
    public double[] transform(double[] data) { ... }
}
```

## Type Hints with Classes

### Basic Class Annotations

```python
from typing import List, Optional

class Model:
    def __init__(
        self,
        input_size: int,
        output_size: int,
        hidden_layers: List[int]
    ) -> None:
        self.input_size: int = input_size
        self.output_size: int = output_size
        self.hidden_layers: List[int] = hidden_layers
        self.trained: bool = False

    def train(
        self,
        data: np.ndarray,
        labels: np.ndarray,
        epochs: int = 10
    ) -> float:
        """Returns final loss"""
        self.trained = True
        return 0.5  # Placeholder

    def predict(self, data: np.ndarray) -> np.ndarray:
        if not self.trained:
            raise ValueError("Model not trained")
        return np.array([])  # Placeholder
```

### Dataclasses with Type Hints

```python
from dataclasses import dataclass
from typing import List

@dataclass
class TrainingConfig:
    learning_rate: float
    batch_size: int
    epochs: int
    hidden_layers: List[int]
    dropout: float = 0.0
    optimizer: str = "adam"

# Type checker knows all field types
config = TrainingConfig(
    learning_rate=0.001,
    batch_size=32,
    epochs=100,
    hidden_layers=[128, 64]
)
```

### Self Type (Python 3.11+)

```python
from typing import Self  # Python 3.11+

class Model:
    def clone(self) -> Self:  # Returns same type as class
        return Model()

class AdvancedModel(Model):
    def clone(self) -> Self:  # Returns AdvancedModel
        return AdvancedModel()
```

## Static Type Checkers

### mypy

**Install**:
```bash
pip install mypy
```

**Check your code**:
```bash
mypy script.py
mypy src/  # Check entire directory
```

**Example**:
```python
# script.py
def add(a: int, b: int) -> int:
    return a + b

result: str = add(1, 2)  # ❌ Type error
```

**mypy output**:
```
script.py:4: error: Incompatible types in assignment (expression has type "int", variable has type "str")
```

### Configuration (mypy.ini)

```ini
[mypy]
python_version = 3.9
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True

# Ignore third-party libraries without type stubs
[mypy-numpy.*]
ignore_missing_imports = True

[mypy-pandas.*]
ignore_missing_imports = True
```

### pyright

Microsoft's type checker (faster than mypy):
```bash
pip install pyright
pyright script.py
```

## Try It

Open Python REPL and try this:

```python
from typing import List, Dict, Optional

# 1. Simple function with type hints
def calculate_average(numbers: List[float]) -> float:
    return sum(numbers) / len(numbers)

print(calculate_average([1.5, 2.5, 3.5]))  # 2.5

# 2. Function with optional return
def find_max(numbers: List[int]) -> Optional[int]:
    if not numbers:
        return None
    return max(numbers)

print(find_max([1, 5, 3]))  # 5
print(find_max([]))         # None

# 3. Type alias
UserId = int
UserName = str
UserDatabase = Dict[UserId, UserName]

users: UserDatabase = {
    1: "Alice",
    2: "Bob",
    3: "Charlie"
}

def get_user(user_id: UserId) -> Optional[UserName]:
    return users.get(user_id)

print(get_user(1))  # Alice
print(get_user(99))  # None

# 4. Class with type hints
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

    def distance_from_origin(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5

p = Point(3.0, 4.0)
print(p.distance_from_origin())  # 5.0
```

## Self-Check Questions

> Answer from memory before checking

1. **What** are type hints and how do they differ from runtime type checking?
2. **Why** use type hints if Python doesn't enforce them?
3. **When** should you use `Optional[T]` vs just `T`?
4. **How** do you type hint a function that takes another function as parameter?
5. **Compare**: Python's type hints vs Java's static typing

<details>
<summary><strong>Answers</strong></summary>

1. **What are type hints and how do they differ from runtime type checking?**
   - **Type hints**: Optional annotations that document expected types
   - **No runtime enforcement**: Python ignores them during execution
   - **Static analysis**: Tools like mypy check types before running
   - **Example**:
     ```python
     def add(a: int, b: int) -> int:
         return a + b

     add("x", "y")  # Python runs this fine, mypy catches error
     ```
   - **Difference**: Java/TypeScript enforce types at runtime/compile-time; Python type hints are just documentation checked by external tools

2. **Why use type hints if Python doesn't enforce them?**
   - **Catch bugs early**: Find type mismatches before runtime
   - **Documentation**: Code is self-explaining
   - **IDE support**: Better autocomplete, refactoring, error detection
   - **Maintainability**: Easier to understand large codebases
   - **Refactoring safety**: Type checker catches breaking changes
   - **Example benefit**:
     ```python
     # Without hints - need to read implementation
     def process(data):
         return data.upper()

     # With hints - intent is clear
     def process(data: str) -> str:
         return data.upper()
     ```

3. **When should you use `Optional[T]` vs just `T`?**

   **Use `Optional[T]` when**:
   - Function can return `None`
   - Parameter can be `None`
   - Variable might be uninitialized

   ```python
   # Function that might not find result
   def find_user(id: int) -> Optional[str]:
       return users.get(id)  # Returns None if not found

   # Parameter that's optional
   def greet(name: str, title: Optional[str] = None) -> str:
       if title:
           return f"Hello, {title} {name}"
       return f"Hello, {name}"
   ```

   **Use just `T` when**:
   - Value is always present
   - None is not a valid value

   ```python
   def calculate_total(prices: List[float]) -> float:
       return sum(prices)  # Always returns float, never None
   ```

4. **How do you type hint a function that takes another function as parameter?**

   Use `Callable[[ArgTypes...], ReturnType]`:

   ```python
   from typing import Callable

   # Function taking a function
   def apply_operation(
       func: Callable[[int, int], int],  # Takes 2 ints, returns int
       a: int,
       b: int
   ) -> int:
       return func(a, b)

   def add(x: int, y: int) -> int:
       return x + y

   result = apply_operation(add, 5, 3)  # 8
   ```

   **ML example**:
   ```python
   # Loss function type
   LossFunction = Callable[[torch.Tensor, torch.Tensor], torch.Tensor]

   def train(
       model: Model,
       loss_fn: LossFunction,
       data: DataLoader
   ) -> float:
       ...
   ```

5. **Compare: Python's type hints vs Java's static typing**

   | Aspect | Python Type Hints | Java Static Types |
   |--------|-------------------|-------------------|
   | Enforcement | Optional, no runtime check | Required, compile-time check |
   | When checked | By external tools (mypy) | At compilation |
   | Can skip? | Yes, purely optional | No, must declare types |
   | Duck typing | Yes (Protocol) | No (explicit interfaces) |
   | Gradual typing | Yes (add incrementally) | No (all or nothing) |
   | Performance | No impact | Enables optimizations |

   **Python**:
   ```python
   # Optional - code runs without hints
   def add(a: int, b: int) -> int:
       return a + b

   add("x", "y")  # Runs fine (string concatenation)
   ```

   **Java**:
   ```java
   // Required - won't compile without types
   public int add(int a, int b) {
       return a + b;
   }

   add("x", "y");  // Compile error
   ```

   **Key difference**: Python type hints are for developers and tools; Java types are enforced by the compiler.

</details>

## Practice Exercises

**Level 1 - Understand**: Read and explain the code

```python
from typing import List, Dict, Optional, Tuple

def analyze_scores(
    scores: Dict[str, int]
) -> Tuple[float, Optional[str], Optional[str]]:
    if not scores:
        return 0.0, None, None

    avg = sum(scores.values()) / len(scores)
    best = max(scores, key=scores.get)
    worst = min(scores, key=scores.get)

    return avg, best, worst

result = analyze_scores({"Alice": 95, "Bob": 87, "Charlie": 92})
```

**Questions**:
1. What types does the function accept?
2. What does it return?
3. Why use `Optional[str]` for best and worst?
4. What would mypy say about: `result[0] + "score"`?

<details>
<summary><strong>Explanation</strong></summary>

1. **What types does the function accept?**
   - `scores: Dict[str, int]` - dictionary with string keys and integer values
   - Example: `{"Alice": 95, "Bob": 87}`

2. **What does it return?**
   - `Tuple[float, Optional[str], Optional[str]]`
   - A 3-tuple containing:
     - `float`: average score
     - `Optional[str]`: name of best student (or None)
     - `Optional[str]`: name of worst student (or None)

3. **Why use `Optional[str]` for best and worst?**
   - If `scores` dict is empty, returns `None` for best and worst
   - `Optional[str]` means "str or None"
   - Makes it explicit that these values might be missing

4. **What would mypy say about: `result[0] + "score"`?**
   ```python
   result[0] + "score"  # ❌ Type error
   ```
   - `result[0]` is `float`
   - `"score"` is `str`
   - Can't add float + str
   - mypy error: `Unsupported operand types for + ("float" and "str")`
   - Fix: `str(result[0]) + "score"` or `f"{result[0]} score"`

</details>

---

**Level 2 - Apply**: Add type hints to existing code

Add complete type hints to this code:

```python
def train_model(data, config, callbacks=None):
    model = create_model(config)

    if callbacks is None:
        callbacks = []

    history = {"loss": [], "accuracy": []}

    for epoch in range(config["epochs"]):
        loss = train_epoch(model, data)
        acc = evaluate(model, data)

        history["loss"].append(loss)
        history["accuracy"].append(acc)

        for callback in callbacks:
            callback(epoch, loss, acc)

    return model, history
```

<details>
<summary><strong>Solution</strong></summary>

```python
from typing import List, Dict, Callable, Tuple, Optional
import numpy as np

# Type aliases for clarity
Model = object  # In real code, would be specific model class
Callback = Callable[[int, float, float], None]
TrainingHistory = Dict[str, List[float]]

def train_model(
    data: np.ndarray,
    config: Dict[str, int],
    callbacks: Optional[List[Callback]] = None
) -> Tuple[Model, TrainingHistory]:
    """Train a model with given data and configuration.

    Args:
        data: Training data array
        config: Configuration dict with "epochs" key
        callbacks: Optional list of callback functions

    Returns:
        Tuple of (trained model, training history dict)
    """
    model: Model = create_model(config)

    if callbacks is None:
        callbacks = []

    history: TrainingHistory = {"loss": [], "accuracy": []}

    for epoch in range(config["epochs"]):
        loss: float = train_epoch(model, data)
        acc: float = evaluate(model, data)

        history["loss"].append(loss)
        history["accuracy"].append(acc)

        for callback in callbacks:
            callback(epoch, loss, acc)

    return model, history

# Example callback with correct signature
def log_metrics(epoch: int, loss: float, accuracy: float) -> None:
    print(f"Epoch {epoch}: loss={loss:.4f}, acc={accuracy:.4f}")

# Usage
callbacks_list: List[Callback] = [log_metrics]
model, history = train_model(
    data=training_data,
    config={"epochs": 10},
    callbacks=callbacks_list
)
```

**Key points**:
- Used type aliases for complex types
- `Optional[List[Callback]]` for optional parameter
- Callback type: `Callable[[int, float, float], None]`
- Return type: `Tuple[Model, TrainingHistory]`
- Added docstring for documentation

</details>

---

**Level 3 - Create**: Design type-safe API

Design a type-safe API for a data preprocessing pipeline:

**Requirements**:
1. `Transformer` protocol with `fit` and `transform` methods
2. `Pipeline` class that chains transformers
3. Type hints for all methods
4. Support for generic data types (not just arrays)
5. Proper return types showing the pipeline returns same type as input

<details>
<summary><strong>Solution</strong></summary>

```python
from typing import Protocol, TypeVar, Generic, List
import numpy as np

# Generic type variable for data
T = TypeVar('T')

class Transformer(Protocol[T]):
    """Protocol for any transformer (structural typing)"""

    def fit(self, data: T) -> 'Transformer[T]':
        """Fit transformer to data"""
        ...

    def transform(self, data: T) -> T:
        """Transform data"""
        ...

    def fit_transform(self, data: T) -> T:
        """Fit and transform in one step"""
        ...


class Pipeline(Generic[T]):
    """Type-safe preprocessing pipeline"""

    def __init__(self, steps: List[Transformer[T]]) -> None:
        """Initialize pipeline with list of transformers"""
        self.steps: List[Transformer[T]] = steps
        self.fitted: bool = False

    def fit(self, data: T) -> 'Pipeline[T]':
        """Fit all transformers in sequence"""
        current_data: T = data

        for transformer in self.steps:
            transformer.fit(current_data)
            current_data = transformer.transform(current_data)

        self.fitted = True
        return self  # Enable chaining

    def transform(self, data: T) -> T:
        """Transform data through all steps"""
        if not self.fitted:
            raise ValueError("Pipeline not fitted")

        current_data: T = data
        for transformer in self.steps:
            current_data = transformer.transform(current_data)

        return current_data

    def fit_transform(self, data: T) -> T:
        """Fit and transform in one step"""
        return self.fit(data).transform(data)


# Concrete transformer implementations
class StandardScaler(Transformer[np.ndarray]):
    """Standardize features by removing mean and scaling to unit variance"""

    def __init__(self) -> None:
        self.mean: Optional[float] = None
        self.std: Optional[float] = None

    def fit(self, data: np.ndarray) -> 'StandardScaler':
        self.mean = data.mean()
        self.std = data.std()
        return self

    def transform(self, data: np.ndarray) -> np.ndarray:
        if self.mean is None or self.std is None:
            raise ValueError("Scaler not fitted")
        return (data - self.mean) / self.std

    def fit_transform(self, data: np.ndarray) -> np.ndarray:
        return self.fit(data).transform(data)


class MinMaxScaler(Transformer[np.ndarray]):
    """Scale features to a given range"""

    def __init__(self, feature_range: Tuple[float, float] = (0.0, 1.0)) -> None:
        self.feature_range: Tuple[float, float] = feature_range
        self.min: Optional[float] = None
        self.max: Optional[float] = None

    def fit(self, data: np.ndarray) -> 'MinMaxScaler':
        self.min = data.min()
        self.max = data.max()
        return self

    def transform(self, data: np.ndarray) -> np.ndarray:
        if self.min is None or self.max is None:
            raise ValueError("Scaler not fitted")

        min_val, max_val = self.feature_range
        data_range = self.max - self.min

        if data_range == 0:
            return np.full_like(data, (min_val + max_val) / 2)

        scaled = (data - self.min) / data_range
        return scaled * (max_val - min_val) + min_val

    def fit_transform(self, data: np.ndarray) -> np.ndarray:
        return self.fit(data).transform(data)


# Usage example with type safety
def create_preprocessing_pipeline() -> Pipeline[np.ndarray]:
    """Create a standard preprocessing pipeline"""
    return Pipeline([
        StandardScaler(),
        MinMaxScaler(feature_range=(0.0, 1.0))
    ])

# Type checker ensures type safety
pipeline: Pipeline[np.ndarray] = create_preprocessing_pipeline()

train_data: np.ndarray = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
test_data: np.ndarray = np.array([1.5, 2.5, 3.5])

# Fit on training data
pipeline.fit(train_data)

# Transform test data
transformed: np.ndarray = pipeline.transform(test_data)

print(f"Original: {test_data}")
print(f"Transformed: {transformed}")

# Type checker catches errors:
# pipeline.transform("wrong type")  # ❌ Error: str not compatible with np.ndarray
```

**Advanced: Generic pipeline that works with any data type**:

```python
from typing import TypeVar, List

T = TypeVar('T')
U = TypeVar('U')

class TransformerMapping(Protocol[T, U]):
    """Transformer that converts from type T to type U"""

    def fit(self, data: T) -> 'TransformerMapping[T, U]':
        ...

    def transform(self, data: T) -> U:
        ...


class HeterogeneousPipeline(Generic[T, U]):
    """Pipeline that can change data types"""

    def __init__(
        self,
        steps: List[TransformerMapping[Any, Any]]
    ) -> None:
        self.steps = steps

    def transform(self, data: T) -> U:
        current: Any = data
        for step in self.steps:
            current = step.transform(current)
        return current


# Example: str -> tokens -> embeddings
class Tokenizer(TransformerMapping[str, List[str]]):
    def fit(self, data: str) -> 'Tokenizer':
        return self

    def transform(self, data: str) -> List[str]:
        return data.split()


class Embedder(TransformerMapping[List[str], np.ndarray]):
    def __init__(self, vocab: Dict[str, int]) -> None:
        self.vocab = vocab

    def fit(self, data: List[str]) -> 'Embedder':
        return self

    def transform(self, tokens: List[str]) -> np.ndarray:
        indices = [self.vocab.get(token, 0) for token in tokens]
        return np.array(indices)


# Type-safe text processing pipeline
text_pipeline: HeterogeneousPipeline[str, np.ndarray] = HeterogeneousPipeline([
    Tokenizer(),
    Embedder(vocab={"hello": 1, "world": 2})
])

text: str = "hello world"
embeddings: np.ndarray = text_pipeline.transform(text)
```

**Key features**:
- Protocol for structural typing (duck typing with type safety)
- Generic types (`Pipeline[T]`) for reusability
- Type checker ensures transformers match
- Method chaining with correct return types
- Heterogeneous pipelines that change data types

</details>

## Common Mistakes

### ❌ Mistake 1: Using mutable defaults with type hints

```python
from typing import List

# ❌ Same problem as without type hints
def append_to(item: int, lst: List[int] = []) -> List[int]:
    lst.append(item)
    return lst

print(append_to(1))  # [1]
print(append_to(2))  # [1, 2] - Oops, shared list!
```

✅ **Fix**: Use None and create new list
```python
from typing import List, Optional

def append_to(item: int, lst: Optional[List[int]] = None) -> List[int]:
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

---

### ❌ Mistake 2: Forgetting `from __future__ import annotations`

```python
# ❌ Forward reference problem (Python < 3.10)
class Node:
    def __init__(self, value: int, next: Node = None):  # NameError: Node not defined yet
        self.value = value
        self.next = next
```

✅ **Fix**: Use string annotation or future import
```python
from __future__ import annotations  # Makes all annotations strings

class Node:
    def __init__(self, value: int, next: Node | None = None):
        self.value = value
        self.next = next

# Or use string (older way):
class Node:
    def __init__(self, value: int, next: 'Node' = None):
        ...
```

---

### ❌ Mistake 3: Over-specifying types

```python
# ❌ Too specific - breaks duck typing
def process_sequence(items: List[int]) -> int:
    return sum(items)

# Can't use with tuple, set, or other iterables
process_sequence((1, 2, 3))  # Type error
```

✅ **Fix**: Use abstract types
```python
from typing import Iterable

def process_sequence(items: Iterable[int]) -> int:
    return sum(items)

# Now works with any iterable
process_sequence([1, 2, 3])     # ✅ List
process_sequence((1, 2, 3))     # ✅ Tuple
process_sequence({1, 2, 3})     # ✅ Set
process_sequence(range(1, 4))   # ✅ Range
```

---

### ❌ Mistake 4: Not handling Optional properly

```python
from typing import Optional

def get_user(id: int) -> Optional[str]:
    return users.get(id)

# ❌ Doesn't check for None
name: str = get_user(123)
print(name.upper())  # Could crash if None
```

✅ **Fix**: Always check Optional values
```python
name: Optional[str] = get_user(123)
if name is not None:
    print(name.upper())  # Safe

# Or use walrus operator (Python 3.8+)
if (name := get_user(123)) is not None:
    print(name.upper())
```

---

### ❌ Mistake 5: Mixing up `list` vs `List`

```python
# Python 3.9+: Use built-in lowercase
from typing import List  # ❌ Unnecessary import

def process(items: List[int]) -> List[int]:  # ❌ Old style
    return items

# ✅ Python 3.9+ way
def process(items: list[int]) -> list[int]:
    return items
```

**Rule**:
- Python < 3.9: Use `List`, `Dict`, `Tuple` from `typing`
- Python >= 3.9: Use lowercase `list`, `dict`, `tuple`
- Python >= 3.10: Use `|` instead of `Union` and `Optional`

## How This Connects

**Builds on**:
- [Functions](../01-fundamentals/04-functions.md) - Type hints for function signatures
- [OOP Basics](../02-intermediate/01-oop-basics.md) - Type hints for classes
- [Dataclasses](../02-intermediate/02-dataclasses.md) - Automatic type validation

**Related concepts**:
- **Protocol types** - Structural typing (like Go interfaces)
- **Generic types** - Reusable type-safe code
- **Runtime validation** - Pydantic enforces types at runtime

**Why this matters for AI/ML**:

1. **Model Configuration**:
   ```python
   from dataclasses import dataclass

   @dataclass
   class ModelConfig:
       learning_rate: float
       batch_size: int
       epochs: int
       hidden_layers: list[int]

   # IDE catches typos
   config = ModelConfig(
       learning_rate=0.001,
       batch_size=32,
       epochs=100,
       hidden_layers=[128, 64]
   )
   ```

2. **Type-Safe Pipelines**:
   ```python
   from typing import Protocol

   class Preprocessor(Protocol):
       def transform(self, data: np.ndarray) -> np.ndarray:
           ...

   def create_pipeline(
       preprocessors: list[Preprocessor]
   ) -> Callable[[np.ndarray], np.ndarray]:
       ...
   ```

3. **API Contracts**:
   ```python
   from fastapi import FastAPI
   from pydantic import BaseModel

   class PredictionRequest(BaseModel):
       input_data: list[float]
       model_id: str

   class PredictionResponse(BaseModel):
       prediction: float
       confidence: float

   app = FastAPI()

   @app.post("/predict", response_model=PredictionResponse)
   async def predict(request: PredictionRequest) -> PredictionResponse:
       # Type checked and validated!
       ...
   ```

**Next steps**:
- [Async Programming](./02-async.md) - Type hints with async/await
- **Pydantic** (Phase 5) - Runtime type validation

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. **How do type checkers handle gradual typing and `Any`?**
   <details>
   <summary>Answer</summary>

   **Any type**:
   - `Any` is compatible with all types
   - Opt-out of type checking for specific values
   - Use sparingly - defeats purpose of type hints

   ```python
   from typing import Any

   def process(data: Any) -> Any:
       # Type checker allows anything
       return data.upper() + 5  # No error, but would crash

   # Any is compatible with everything
   value: int = process("hello")  # Type checker OK, runtime crash
   ```

   **Gradual typing**:
   - Can add type hints incrementally
   - Untyped code treated as `Any`
   - Mix typed and untyped code

   ```python
   # Untyped function
   def old_function(x):
       return x * 2

   # Typed function calling untyped
   def new_function(x: int) -> int:
       result = old_function(x)  # result type is Any
       return result  # Type checker allows this
   ```

   **Type narrowing**:
   ```python
   from typing import Union

   def process(value: Union[int, str]) -> int:
       # Type checker tracks branches
       if isinstance(value, int):
           # Here, type checker knows value is int
           return value + 1
       else:
           # Here, knows it's str
           return len(value)
   ```

   **Strict mode**:
   ```python
   # mypy --strict enforces:
   # - No untyped functions
   # - No implicit Any
   # - No untyped calls
   # - Return types required
   ```

   **Best practice**: Minimize `Any`, add types incrementally, use strict mode for new code.
   </details>

2. **What's the difference between Protocol, ABC, and structural typing?**
   <details>
   <summary>Answer</summary>

   **1. Protocol (PEP 544) - Structural typing**:
   ```python
   from typing import Protocol

   class Drawable(Protocol):
       def draw(self) -> None:
           ...

   # No explicit inheritance needed
   class Circle:
       def draw(self) -> None:
           print("Drawing circle")

   # Type checker accepts Circle as Drawable
   def render(obj: Drawable) -> None:
       obj.draw()

   render(Circle())  # ✅ Works - structural typing
   ```

   **2. ABC (Abstract Base Class) - Nominal typing**:
   ```python
   from abc import ABC, abstractmethod

   class Drawable(ABC):
       @abstractmethod
       def draw(self) -> None:
           pass

   # Must explicitly inherit
   class Circle(Drawable):  # Required!
       def draw(self) -> None:
           print("Drawing circle")

   # Without inheritance, won't work
   class Square:  # Has draw() but doesn't inherit
       def draw(self) -> None:
           print("Drawing square")

   def render(obj: Drawable) -> None:
       obj.draw()

   render(Circle())  # ✅ Works
   render(Square())  # ❌ Type error - not a Drawable
   ```

   **Comparison**:

   | Feature | Protocol | ABC |
   |---------|----------|-----|
   | Type system | Structural (duck typing) | Nominal (inheritance) |
   | Explicit inheritance | Not required | Required |
   | Runtime checks | No | Yes (`isinstance`) |
   | Third-party classes | Can use | Can't use without modification |
   | Python philosophy | More Pythonic | More Java-like |

   **When to use what**:

   **Use Protocol when**:
   - Defining interfaces for type checking only
   - Working with third-party classes
   - Want duck typing with type safety

   **Use ABC when**:
   - Need runtime `isinstance` checks
   - Want to enforce implementation
   - Building frameworks/libraries

   **Example combining both**:
   ```python
   from typing import Protocol
   from abc import ABC, abstractmethod

   # Type checking interface (Protocol)
   class Transformer(Protocol):
       def transform(self, data: list[float]) -> list[float]:
           ...

   # Runtime enforced base class (ABC)
   class BaseTransformer(ABC):
       @abstractmethod
       def transform(self, data: list[float]) -> list[float]:
           pass

   # Use Protocol for type hints
   def apply_transformers(
       data: list[float],
       transformers: list[Transformer]  # Accepts anything with transform()
   ) -> list[float]:
       ...

   # Use ABC for your own classes
   class StandardScaler(BaseTransformer):  # Enforced to implement transform
       def transform(self, data: list[float]) -> list[float]:
           ...
   ```
   </details>

**Production Scenarios**:

1. **How do you handle type hints with third-party libraries that don't have stubs?**
   <details>
   <summary>Answer</summary>

   **Problem**: Many libraries don't have type hints

   ```python
   import some_untyped_library  # No type stubs

   result = some_untyped_library.process(data)  # mypy: Any type
   ```

   **Solution 1: Stub files (.pyi)**
   ```python
   # some_untyped_library.pyi (create alongside .py file)
   def process(data: list[float]) -> list[float]: ...

   class Model:
       def __init__(self, config: dict[str, int]) -> None: ...
       def train(self, data: list[float]) -> None: ...
   ```

   **Solution 2: Inline type comments**
   ```python
   from typing import cast

   result = some_untyped_library.process(data)
   typed_result = cast(list[float], result)  # Tell mypy the type
   ```

   **Solution 3: Type ignore**
   ```python
   result = some_untyped_library.process(data)  # type: ignore
   ```

   **Solution 4: mypy configuration**
   ```ini
   # mypy.ini
   [mypy]
   [mypy-some_untyped_library.*]
   ignore_missing_imports = True  # Don't complain about this library
   ```

   **Solution 5: TypedDict for configs**
   ```python
   from typing import TypedDict

   class Config(TypedDict):
       learning_rate: float
       batch_size: int
       epochs: int

   # Now mypy knows the structure
   config: Config = {
       "learning_rate": 0.001,
       "batch_size": 32,
       "epochs": 100
   }

   some_untyped_library.train(config)  # config is typed
   ```

   **Best practices**:
   - Check if types-* package exists: `pip install types-requests`
   - Contribute type stubs to typeshed
   - Use `cast()` sparingly with comments explaining why
   - Create local .pyi stubs for frequently used untyped libraries
   </details>

2. **What's the performance impact of type hints in production?**
   <details>
   <summary>Answer</summary>

   **Short answer**: Almost zero runtime impact.

   **Detailed analysis**:

   **1. No runtime checking**:
   ```python
   def add(a: int, b: int) -> int:
       return a + b

   # Type hints completely ignored at runtime
   add("x", "y")  # Works fine, returns "xy"
   ```

   **2. Minimal memory overhead**:
   - Type hints stored in `__annotations__` dict
   - Only loaded when accessed
   - ~1-2% memory increase for heavily annotated code

   ```python
   def func(x: int, y: str) -> bool:
       return True

   print(func.__annotations__)
   # {'x': <class 'int'>, 'y': <class 'str'>, 'return': <class 'bool'>}
   ```

   **3. Import time impact**:
   - Importing `typing` module adds ~0.01s
   - Use `from __future__ import annotations` to defer evaluation

   **Without deferred evaluation**:
   ```python
   from typing import List, Dict

   # Types evaluated at import time
   def process(data: List[Dict[str, int]]) -> List[int]:
       ...
   # Cost: Must evaluate List[Dict[...]] at import
   ```

   **With deferred evaluation (Python 3.7+)**:
   ```python
   from __future__ import annotations  # Important!

   def process(data: list[dict[str, int]]) -> list[int]:
       ...
   # Cost: Types stored as strings, evaluated only when needed
   ```

   **4. Benchmarks**:
   ```python
   import timeit

   # Without type hints
   def add_no_hints(a, b):
       return a + b

   # With type hints
   def add_with_hints(a: int, b: int) -> int:
       return a + b

   print(timeit.timeit('add_no_hints(1, 2)', globals=globals(), number=10000000))
   # ~0.25s

   print(timeit.timeit('add_with_hints(1, 2)', globals=globals(), number=10000000))
   # ~0.25s (no difference)
   ```

   **5. Optimization opportunities**:
   - Future Python versions could use hints for optimization
   - JIT compilers (PyPy, Numba) could leverage types
   - Cython can use type hints for speedups

   **6. Production deployment**:
   ```python
   # Remove type hints in production (optional, rarely needed)
   import sys
   if not sys.flags.debug:
       # Strip annotations for minimal memory save
       from typing import no_type_check

       @no_type_check
       def expensive_function(...):
           ...
   ```

   **Best practices**:
   - ✅ Use `from __future__ import annotations`
   - ✅ Use lowercase types (list, dict) in Python 3.9+
   - ✅ Don't worry about performance - impact is negligible
   - ❌ Don't strip types in production (not worth complexity)
   - ✅ Use type hints everywhere for better code quality
   </details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#type-hints) for comprehensive list

## Summary

**In 3 sentences**:
- Type hints are optional annotations that document expected types for variables, parameters, and return values, checked by static analysis tools like mypy but not enforced at runtime
- Use simple types (int, str, float) and collection types (list[T], dict[K, V], Optional[T]) for basic typing, and advanced features like Protocol for structural typing, Generic for reusable code, and Callable for function types
- Type hints improve code quality through better IDE support, early bug detection, and self-documenting code, with virtually zero runtime performance impact when using `from __future__ import annotations`

**Key takeaway**: Type hints are Python's way of getting static typing benefits without sacrificing dynamic typing flexibility—they're completely optional, have no runtime cost, but provide massive developer experience improvements through IDE autocomplete, refactoring safety, and catching bugs before your code even runs!
