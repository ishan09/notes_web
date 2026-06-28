# Dataclasses

> **Before you start**: Do you understand OOP basics? If not, review [OOP Basics](./01-oop-basics.md)

## What are Dataclasses?

**Simple explanation**: Dataclasses are a special type of class designed to hold data. Instead of writing repetitive `__init__`, `__repr__`, and `__eq__` methods, you just add `@dataclass` decorator and Python generates them automatically.

**Analogy**: It's like filling out a form where the structure is already printed—you just fill in the values. Without dataclasses, you'd have to draw the form structure yourself every time.

**In code** (Traditional vs Dataclass):

```python
# ❌ Traditional way - too much boilerplate
class ModelConfig:
    def __init__(self, learning_rate, batch_size, epochs):
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.epochs = epochs

    def __repr__(self):
        return (f"ModelConfig(learning_rate={self.learning_rate}, "
                f"batch_size={self.batch_size}, epochs={self.epochs})")

    def __eq__(self, other):
        if not isinstance(other, ModelConfig):
            return False
        return (self.learning_rate == other.learning_rate and
                self.batch_size == other.batch_size and
                self.epochs == other.epochs)

# ✅ Dataclass way - clean and concise
from dataclasses import dataclass

@dataclass
class ModelConfig:
    learning_rate: float
    batch_size: int
    epochs: int
```

Both produce the same functionality, but the dataclass version is 70% shorter!

## Why This Matters for AI/ML

1. **Model Configurations**: Store hyperparameters cleanly
   ```python
   @dataclass
   class TrainingConfig:
       learning_rate: float = 0.001
       batch_size: int = 32
       dropout: float = 0.2
   ```

2. **Data Structures**: Represent training examples, predictions, metrics
   ```python
   @dataclass
   class Prediction:
       class_name: str
       confidence: float
       timestamp: str
   ```

3. **API Models**: Clean request/response structures
   ```python
   @dataclass
   class InferenceRequest:
       model_name: str
       input_data: list
       temperature: float = 0.7
   ```

4. **Less Code = Fewer Bugs**: Auto-generated methods are tested and reliable

## Creating Dataclasses

### The @dataclass Decorator

```python
from dataclasses import dataclass

@dataclass
class Dataset:
    name: str           # Required field
    samples: int        # Required field
    features: int       # Required field
    task: str = "classification"  # Optional field with default

# Usage
ds = Dataset(name="MNIST", samples=60000, features=784)
print(ds)
# Output: Dataset(name='MNIST', samples=60000, features=784, task='classification')

# Auto-generated __eq__
ds2 = Dataset(name="MNIST", samples=60000, features=784)
print(ds == ds2)  # True
```

**Key points**:
- Import from `dataclasses` module (Python 3.7+)
- Type annotations are **required** (e.g., `name: str`)
- Fields without defaults must come before fields with defaults

### Field Definitions

```python
from dataclasses import dataclass, field

@dataclass
class Experiment:
    name: str
    model_type: str
    metrics: dict = field(default_factory=dict)  # Mutable default
    tags: list = field(default_factory=list)     # Mutable default

# Why field(default_factory)?
# ❌ WRONG - this creates ONE shared list for all instances
# tags: list = []  # DON'T DO THIS!

# ✅ RIGHT - each instance gets its own list
# tags: list = field(default_factory=list)

exp1 = Experiment("exp1", "CNN")
exp2 = Experiment("exp2", "RNN")

exp1.tags.append("vision")
exp2.tags.append("nlp")

print(exp1.tags)  # ['vision'] - separate list
print(exp2.tags)  # ['nlp'] - separate list
```

**Rule**: Always use `field(default_factory=...)` for mutable defaults (lists, dicts, sets)

### Default Values

```python
@dataclass
class NeuralNetwork:
    input_size: int
    output_size: int
    hidden_layers: int = 2              # Simple default
    activation: str = "relu"             # Simple default
    dropout_rate: float = 0.0            # Simple default
    optimizer: str = "adam"              # Simple default
    device: str = field(default="cpu")   # Using field()

# Create with some defaults
nn = NeuralNetwork(input_size=784, output_size=10)
print(nn.hidden_layers)  # 2
print(nn.activation)     # relu
```

**Java comparison**:
```java
// Java - similar concept with constructor overloading
public class NeuralNetwork {
    private int inputSize;
    private int outputSize;
    private int hiddenLayers = 2;
    private String activation = "relu";

    public NeuralNetwork(int inputSize, int outputSize) {
        this.inputSize = inputSize;
        this.outputSize = outputSize;
    }
}
```

## Dataclass Features

### Automatic __init__, __repr__, __eq__

```python
@dataclass
class Model:
    name: str
    version: str
    accuracy: float

# 1. __init__ is generated
model = Model("ResNet", "v2", 0.94)  # No need to write __init__

# 2. __repr__ is generated
print(model)
# Output: Model(name='ResNet', version='v2', accuracy=0.94)

# 3. __eq__ is generated
model2 = Model("ResNet", "v2", 0.94)
print(model == model2)  # True

model3 = Model("VGG", "v1", 0.90)
print(model == model3)  # False
```

### frozen=True (Immutability)

```python
@dataclass(frozen=True)
class HyperParameters:
    learning_rate: float
    momentum: float
    weight_decay: float

hp = HyperParameters(0.001, 0.9, 0.0001)

# ❌ This will raise FrozenInstanceError
# hp.learning_rate = 0.01  # Error!

# ✅ To "change" values, create a new instance
from dataclasses import replace
hp_new = replace(hp, learning_rate=0.01)
print(hp_new)
```

**Why use frozen?**
- Thread-safe configurations
- Can be used as dictionary keys
- Prevents accidental modifications
- Makes code more predictable

### field() for Advanced Configuration

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class TrainingRun:
    experiment_id: str
    model_name: str

    # Exclude from __init__ but compute in __post_init__
    run_id: str = field(init=False)

    # Exclude from repr (too verbose)
    raw_logs: List[str] = field(default_factory=list, repr=False)

    # Include in comparison
    accuracy: float = field(default=0.0, compare=True)

    # Exclude from comparison (metadata)
    timestamp: str = field(default="", compare=False)

    def __post_init__(self):
        # Generate run_id after init
        self.run_id = f"{self.experiment_id}_{self.model_name}"

run = TrainingRun("exp001", "resnet50")
print(run)
# Output: TrainingRun(experiment_id='exp001', model_name='resnet50',
#                     run_id='exp001_resnet50', accuracy=0.0, timestamp='')
# Notice: raw_logs is not shown (repr=False)
```

**field() parameters**:
- `default`: Default value
- `default_factory`: Function to create default (for mutable objects)
- `init=False`: Exclude from `__init__`
- `repr=False`: Exclude from `__repr__`
- `compare=False`: Exclude from `__eq__` and comparison methods

## Dataclasses vs Regular Classes

### Use Cases

| Feature | Regular Class | Dataclass | When to Use |
|---------|--------------|-----------|-------------|
| Custom logic in `__init__` | Easy | Needs `__post_init__` | Regular class if complex init |
| Data storage | Verbose | Concise | Dataclass for data storage |
| Inheritance with methods | Natural | Natural | Either works |
| Immutability | Manual | `frozen=True` | Dataclass for easy immutability |
| Quick prototyping | Slow | Fast | Dataclass for prototypes |

### Side-by-Side Comparison

```python
# Regular class - full control, more code
class TrainingMetrics:
    def __init__(self, loss, accuracy, epoch):
        self.loss = loss
        self.accuracy = accuracy
        self.epoch = epoch
        self.improvement = self._calculate_improvement()

    def __repr__(self):
        return (f"TrainingMetrics(loss={self.loss}, "
                f"accuracy={self.accuracy}, epoch={self.epoch})")

    def __eq__(self, other):
        return (isinstance(other, TrainingMetrics) and
                self.loss == other.loss and
                self.accuracy == other.accuracy and
                self.epoch == other.epoch)

    def _calculate_improvement(self):
        # Custom logic in init
        return self.accuracy * 100

# Dataclass - concise, less control over init
@dataclass
class TrainingMetrics:
    loss: float
    accuracy: float
    epoch: int
    improvement: float = field(init=False)

    def __post_init__(self):
        self.improvement = self.accuracy * 100
```

**Java comparison**: Dataclasses are similar to Java's record classes (Java 14+):
```java
// Java record (similar to Python dataclass)
public record ModelConfig(double learningRate, int batchSize, int epochs) {}
```

## Try It

Open Python REPL and try this:

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class DataLoader:
    dataset_name: str
    batch_size: int
    shuffle: bool = True
    num_workers: int = 4
    batches_processed: int = field(default=0, init=False)
    errors: List[str] = field(default_factory=list, repr=False)

    def __post_init__(self):
        print(f"Initialized DataLoader for {self.dataset_name}")

    def process_batch(self):
        self.batches_processed += 1
        return f"Processed batch {self.batches_processed}"

# Create and use
loader = DataLoader("ImageNet", batch_size=32)
print(loader)
print(loader.process_batch())
print(loader.process_batch())
print(f"Total batches: {loader.batches_processed}")
```

**Expected output**:
```
Initialized DataLoader for ImageNet
DataLoader(dataset_name='ImageNet', batch_size=32, shuffle=True, num_workers=4, batches_processed=0)
Processed batch 1
Processed batch 2
Total batches: 2
```

## Self-Check Questions

> Answer from memory before checking

1. **What** problem do dataclasses solve?
2. **Why** use dataclasses instead of regular classes?
3. **When** should you use `frozen=True`?
4. **How** do dataclasses reduce boilerplate code?
5. **Compare**: Dataclasses vs namedtuples vs regular classes

<details>
<summary><strong>Answers</strong></summary>

1. **What problem do dataclasses solve?**
   - Eliminate boilerplate code for classes that primarily hold data
   - Auto-generate `__init__`, `__repr__`, `__eq__`, and optionally `__hash__`
   - Reduce 20-50 lines of repetitive code to just the field definitions

2. **Why use dataclasses instead of regular classes?**
   - **Less code**: 70% fewer lines for simple data containers
   - **Fewer bugs**: Auto-generated methods are tested and reliable
   - **More readable**: Intent is clear - "this class holds data"
   - **Type hints**: Forces you to use type annotations (good practice)
   - **But**: Use regular classes when you need complex `__init__` logic

3. **When should you use `frozen=True`?**
   - Configuration objects that shouldn't change
   - When you want to use instances as dict keys
   - Thread-safe data structures
   - Functional programming style (immutability)
   - Example: `@dataclass(frozen=True)` for hyperparameters

4. **How do dataclasses reduce boilerplate code?**
   - Auto-generate `__init__` from field annotations
   - Auto-generate `__repr__` showing all fields
   - Auto-generate `__eq__` comparing all fields
   - Optional: `__hash__`, `__lt__`, `__le__`, `__gt__`, `__ge__`
   - You just define fields, Python writes the methods

5. **Compare: Dataclasses vs namedtuples vs regular classes**

   | Feature | Regular Class | Dataclass | Namedtuple |
   |---------|--------------|-----------|------------|
   | Mutability | Mutable | Mutable (or frozen) | Immutable |
   | Methods | Yes | Yes | No (functions only) |
   | Inheritance | Yes | Yes | Limited |
   | Type hints | Optional | Required | Optional |
   | Memory | Normal | Normal | Slightly less |
   | Boilerplate | Most | Least | Medium |

   **Choose**:
   - **Regular class**: Complex logic, many methods
   - **Dataclass**: Data storage with some methods
   - **Namedtuple**: Simple immutable data, no methods needed

</details>

## Practice Exercises

**Level 1 - Understand**: Read and explain the code

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class ModelCheckpoint:
    epoch: int
    loss: float
    accuracy: float
    saved: bool = False
    path: str = field(default="", init=False)

    def __post_init__(self):
        if self.saved:
            self.path = f"checkpoint_epoch_{self.epoch}.pt"

# What happens here?
cp1 = ModelCheckpoint(10, 0.5, 0.92, saved=True)
cp2 = ModelCheckpoint(10, 0.5, 0.92, saved=True)

print(cp1 == cp2)  # What is printed? Why?
print(cp1.path)    # What is printed?
```

<details>
<summary><strong>Explanation</strong></summary>

```python
print(cp1 == cp2)  # False
```
**Why?** Even though we passed the same values, `__post_init__` sets `path` field, and the `path` field is included in equality comparison by default. Since both instances got `path = "checkpoint_epoch_10.pt"`, wait... let me reconsider.

Actually, it prints **True**! Because:
1. Both have same `epoch=10`, `loss=0.5`, `accuracy=0.92`, `saved=True`
2. Both have `path="checkpoint_epoch_10.pt"` (set in `__post_init__`)
3. All fields are equal, so `cp1 == cp2` is `True`

```python
print(cp1.path)  # "checkpoint_epoch_10.pt"
```
The `__post_init__` method runs after `__init__`, setting the path when `saved=True`.

</details>

---

**Level 2 - Apply**: Modify the code

Create a dataclass for an ML experiment that:
- Has required fields: `name`, `model_type`, `dataset`
- Has optional field: `status` (default: "pending")
- Has a mutable field: `metrics` (dict)
- Auto-generates an `id` field from name and timestamp
- The `metrics` field should not appear in `__repr__` (too verbose)

<details>
<summary><strong>Solution</strong></summary>

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict

@dataclass
class MLExperiment:
    name: str
    model_type: str
    dataset: str
    status: str = "pending"
    metrics: Dict[str, float] = field(default_factory=dict, repr=False)
    id: str = field(init=False)

    def __post_init__(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.id = f"{self.name}_{timestamp}"

    def update_metric(self, metric_name: str, value: float):
        self.metrics[metric_name] = value

# Test it
exp = MLExperiment("resnet_test", "CNN", "CIFAR10")
print(exp)  # metrics not shown
print(f"ID: {exp.id}")

exp.update_metric("accuracy", 0.92)
exp.update_metric("loss", 0.3)
print(f"Metrics: {exp.metrics}")
```

**Output**:
```
MLExperiment(name='resnet_test', model_type='CNN', dataset='CIFAR10', status='pending', id='resnet_test_20260112_143022')
ID: resnet_test_20260112_143022
Metrics: {'accuracy': 0.92, 'loss': 0.3}
```

</details>

---

**Level 3 - Create**: Build from scratch

Build a **TrainingPipeline** dataclass for tracking a machine learning training session:

Requirements:
1. Required fields: `model_name`, `learning_rate`, `batch_size`
2. Optional fields: `epochs` (default: 10), `device` (default: "cpu")
3. Computed fields (not in `__init__`):
   - `total_batches`: calculated from dataset size and batch size
   - `experiment_id`: auto-generated UUID
4. Mutable fields:
   - `loss_history`: list of losses per epoch
   - `checkpoint_paths`: list of saved checkpoint paths
5. Make it **frozen** (immutable) except for the lists
6. Add a method `add_checkpoint(path)` that appends to `checkpoint_paths`
7. Add a method `average_loss()` that returns mean of `loss_history`

<details>
<summary><strong>Solution</strong></summary>

```python
from dataclasses import dataclass, field
from typing import List
import uuid

@dataclass(frozen=True)  # Immutable... but lists can still be modified
class TrainingPipeline:
    model_name: str
    learning_rate: float
    batch_size: int
    epochs: int = 10
    device: str = "cpu"

    # Computed fields
    total_batches: int = field(init=False, default=0)
    experiment_id: str = field(init=False)

    # Mutable fields (note: frozen doesn't prevent list modifications)
    loss_history: List[float] = field(default_factory=list, repr=False)
    checkpoint_paths: List[str] = field(default_factory=list, repr=False)

    def __post_init__(self):
        # Need to use object.__setattr__ because dataclass is frozen
        object.__setattr__(self, 'experiment_id', str(uuid.uuid4())[:8])
        # total_batches would be set from dataset_size / batch_size in real code
        object.__setattr__(self, 'total_batches', 0)

    def add_checkpoint(self, path: str):
        """Add a checkpoint path (list mutation is allowed even in frozen dataclass)"""
        self.checkpoint_paths.append(path)

    def average_loss(self) -> float:
        """Calculate average loss from history"""
        if not self.loss_history:
            return 0.0
        return sum(self.loss_history) / len(self.loss_history)

# Test it
pipeline = TrainingPipeline(
    model_name="ResNet50",
    learning_rate=0.001,
    batch_size=32,
    epochs=50
)

print(pipeline)
print(f"Experiment ID: {pipeline.experiment_id}")

# Simulate training
pipeline.loss_history.extend([2.5, 1.8, 1.2, 0.9, 0.6])
pipeline.add_checkpoint("checkpoints/epoch_5.pt")
pipeline.add_checkpoint("checkpoints/epoch_10.pt")

print(f"Average loss: {pipeline.average_loss():.2f}")
print(f"Checkpoints: {pipeline.checkpoint_paths}")

# ❌ This would fail (frozen):
# pipeline.learning_rate = 0.01  # FrozenInstanceError
```

**Output**:
```
TrainingPipeline(model_name='ResNet50', learning_rate=0.001, batch_size=32, epochs=50, device='cpu', total_batches=0, experiment_id='a3f5c8d1')
Experiment ID: a3f5c8d1
Average loss: 1.40
Checkpoints: ['checkpoints/epoch_5.pt', 'checkpoints/epoch_10.pt']
```

**Key insights**:
- `frozen=True` makes the dataclass immutable
- But lists can still be modified (they're mutable objects)
- Use `object.__setattr__()` in `__post_init__` for frozen dataclasses
- This pattern is common for config objects with tracking lists

</details>

## Common Mistakes

### ❌ Mistake 1: Mutable default values

```python
@dataclass
class Experiment:
    name: str
    metrics: dict = {}  # ❌ WRONG! Shared across all instances

exp1 = Experiment("exp1")
exp2 = Experiment("exp2")
exp1.metrics["accuracy"] = 0.9
print(exp2.metrics)  # {'accuracy': 0.9} - Oops! Shared dict
```

✅ **Fix**: Use `field(default_factory=dict)`
```python
@dataclass
class Experiment:
    name: str
    metrics: dict = field(default_factory=dict)  # ✅ Each instance gets own dict
```

---

### ❌ Mistake 2: Fields with defaults before fields without

```python
@dataclass
class Model:
    name: str = "default"
    version: int  # ❌ SyntaxError! Fields without defaults must come first
```

✅ **Fix**: Required fields first, optional fields last
```python
@dataclass
class Model:
    version: int        # ✅ Required first
    name: str = "default"  # ✅ Optional last
```

---

### ❌ Mistake 3: Forgetting type annotations

```python
@dataclass
class Config:
    learning_rate = 0.001  # ❌ No type annotation - won't be a field!
    batch_size: int = 32   # ✅ This is a field
```

✅ **Fix**: Always include type annotations
```python
@dataclass
class Config:
    learning_rate: float = 0.001  # ✅ Now it's a field
    batch_size: int = 32
```

---

### ❌ Mistake 4: Modifying frozen dataclass fields directly

```python
@dataclass(frozen=True)
class HyperParams:
    lr: float

hp = HyperParams(0.001)
hp.lr = 0.01  # ❌ FrozenInstanceError!
```

✅ **Fix**: Use `replace()` to create a new instance
```python
from dataclasses import replace

hp = HyperParams(0.001)
hp_new = replace(hp, lr=0.01)  # ✅ Creates new instance
```

---

### ❌ Mistake 5: Complex logic in `__post_init__` instead of using regular class

```python
@dataclass
class ComplexModel:
    config: dict

    def __post_init__(self):
        # ❌ Too much logic for a dataclass
        self.layers = self._parse_layers(self.config)
        self.optimizer = self._create_optimizer(self.config)
        self.scheduler = self._create_scheduler(self.optimizer)
        self._validate_architecture()
        # ... 50 more lines
```

✅ **Fix**: Use a regular class when init logic is complex
```python
class ComplexModel:  # ✅ Regular class for complex initialization
    def __init__(self, config: dict):
        self.config = config
        self.layers = self._parse_layers(config)
        self.optimizer = self._create_optimizer(config)
        # ... complex logic is fine here
```

## How This Connects

**Builds on**:
- [OOP Basics](./01-oop-basics.md) - Dataclasses are special classes with auto-generated methods

**Related concepts**:
- [Type Hints](../03-advanced/01-type-hints.md) - Dataclasses require and encourage type annotations
- [Pydantic Models](../08-fastapi/03-pydantic-models.md) - Like dataclasses but with runtime validation, field constraints, and JSON serialization — use for API request/response bodies
- [FastAPI Introduction](../08-fastapi/01-fastapi-intro.md) - Pydantic `BaseModel` is the foundation of FastAPI validation and auto-generated docs
- **Namedtuples** - Simpler immutable alternative for basic data containers

**Why this matters for AI/ML**:
- **Model Configs**: Store hyperparameters with type safety
  ```python
  @dataclass
  class TransformerConfig:
      vocab_size: int
      hidden_size: int = 768
      num_layers: int = 12
      num_heads: int = 12
  ```

- **Training State**: Track experiments cleanly
  ```python
  @dataclass
  class TrainingState:
      epoch: int
      global_step: int
      best_loss: float
      checkpoint_path: str
  ```

- **API Contracts**: Define request/response structures
  ```python
  @dataclass
  class PredictionRequest:
      model_id: str
      input_text: str
      max_tokens: int = 100
      temperature: float = 0.7
  ```

- **Less Boilerplate**: Spend time on ML logic, not repetitive code

**Next steps**:
- [Iterators & Generators](./03-iterators-generators.md) - Efficient data processing for large datasets

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does the @dataclass decorator work under the hood?

<details>
<summary>Answer: Inspects __annotations__ at class definition time, generates __init__, __repr__, __eq__ as code strings, injects via exec(); processes in order: fields(), then generates methods, then applies to class</summary>

**Explanation**:
The `@dataclass` decorator is a **class decorator** that runs at class definition time (when Python parses the class, not when you create instances). It inspects the class's `__annotations__` dictionary to discover field definitions, then programmatically generates methods like `__init__`, `__repr__`, and `__eq__` as Python code strings, compiles them, and injects them into the class using `exec()`.

The process happens in this order: (1) Extract field definitions from `__annotations__` and `field()` calls, (2) Validate field ordering (required before optional), (3) Generate method code as strings, (4) Compile and inject methods into class namespace, (5) Return modified class. This is pure Python metaprogramming - no magic, just code generation.

The generated methods are **real Python methods**, not wrappers. Once created, they perform identically to hand-written methods. The decorator runs once at import time, so there's no runtime overhead beyond what a regular class would have. You can even inspect the generated code using `inspect.getsource()` (though it will show the decorator, not generated code).

**Example**:
```python
from dataclasses import dataclass, fields, field
import inspect

# Simple dataclass
@dataclass
class Point:
    x: float
    y: float
    name: str = "origin"

# What the decorator did:
# 1. Inspected Point.__annotations__
print(Point.__annotations__)  # {'x': <class 'float'>, 'y': <class 'float'>, 'name': <class 'str'>}

# 2. Generated fields metadata
for f in fields(Point):
    print(f"Field: {f.name}, type: {f.type}, default: {f.default}")
# Field: x, type: <class 'float'>, default: <dataclasses._MISSING_TYPE object>
# Field: y, type: <class 'float'>, default: <dataclasses._MISSING_TYPE object>
# Field: name, type: <class 'str'>, default: origin

# 3. Generated __init__ (conceptually, the decorator created this):
# def __init__(self, x: float, y: float, name: str = "origin"):
#     self.x = x
#     self.y = y
#     self.name = name

# 4. Generated __repr__
# def __repr__(self):
#     return f"Point(x={self.x!r}, y={self.y!r}, name={self.name!r})"

# 5. Generated __eq__
# def __eq__(self, other):
#     if not isinstance(other, Point):
#         return NotImplemented
#     return (self.x, self.y, self.name) == (other.x, other.y, other.name)

# Test the generated methods
p1 = Point(3.0, 4.0)
print(p1)  # Point(x=3.0, y=4.0, name='origin')
print(p1 == Point(3.0, 4.0))  # True

# Manual simulation of what @dataclass does
class ManualPoint:
    """Equivalent to @dataclass without the decorator"""
    __annotations__ = {'x': float, 'y': float, 'name': str}

# Simulate decorator processing
def simulate_dataclass(cls):
    """Simplified version of what @dataclass does"""
    # Step 1: Extract field info from __annotations__
    field_info = []
    for name, type_hint in cls.__annotations__.items():
        # Check if there's a default value as class attribute
        default_value = getattr(cls, name, None)
        has_default = hasattr(cls, name)
        field_info.append((name, type_hint, default_value, has_default))

    # Step 2: Validate field ordering (required before optional)
    seen_default = False
    for name, _, _, has_default in field_info:
        if has_default:
            seen_default = True
        elif seen_default:
            raise TypeError(f"Non-default field '{name}' after default field")

    # Step 3: Generate __init__ as code string
    params = []
    body_lines = []
    for name, type_hint, default_value, has_default in field_info:
        if has_default:
            params.append(f"{name}={default_value!r}")
        else:
            params.append(name)
        body_lines.append(f"    self.{name} = {name}")

    init_code = f"""
def __init__(self, {', '.join(params)}):
{chr(10).join(body_lines)}
"""
    print("Generated __init__:")
    print(init_code)

    # Step 4: Compile and inject
    namespace = {}
    exec(init_code, namespace)
    cls.__init__ = namespace['__init__']

    # Step 5: Generate __repr__
    repr_fields = ', '.join(f"{name}={{self.{name}!r}}" for name, _, _, _ in field_info)
    repr_code = f"""
def __repr__(self):
    return f"{cls.__name__}({repr_fields})"
"""
    exec(repr_code, namespace)
    cls.__repr__ = namespace['__repr__']

    # Step 6: Generate __eq__
    field_names = [name for name, _, _, _ in field_info]
    field_tuple = ', '.join(f"self.{name}" for name in field_names)
    other_tuple = ', '.join(f"other.{name}" for name in field_names)
    eq_code = f"""
def __eq__(self, other):
    if not isinstance(other, {cls.__name__}):
        return NotImplemented
    return ({field_tuple},) == ({other_tuple},)
"""
    exec(eq_code, namespace)
    cls.__eq__ = namespace['__eq__']

    return cls

# Apply our simulation
@simulate_dataclass
class SimulatedPoint:
    __annotations__ = {'x': float, 'y': float, 'name': str}
    name = "origin"  # Default value

p = SimulatedPoint(1.0, 2.0)
print(p)  # SimulatedPoint(x=1.0, y=2.0, name='origin')

# Real implementation details
# The actual dataclass module:
# 1. Uses _process_class() function
# 2. Calls _fields() to extract field metadata
# 3. Calls _init_fn() to generate __init__
# 4. Calls _repr_fn() to generate __repr__
# 5. And so on for other methods

# Advanced: Field metadata storage
@dataclass
class Config:
    lr: float = field(default=0.01, metadata={'tunable': True})
    batch_size: int = field(default=32, metadata={'tunable': False})

for f in fields(Config):
    print(f"{f.name}: metadata={f.metadata}")
# lr: metadata={'tunable': True}
# batch_size: metadata={'tunable': False}

# The decorator stores this in __dataclass_fields__
print(Config.__dataclass_fields__.keys())  # dict_keys(['lr', 'batch_size'])

# Advanced: Custom field factory
from dataclasses import _MISSING_TYPE, MISSING

@dataclass
class Pipeline:
    name: str
    steps: list = field(default_factory=list)  # Factory creates new list each time

# How default_factory works internally:
# if field.default_factory is not MISSING:
#     field_value = field.default_factory()
# else:
#     field_value = field.default

# Demonstration of timing (decorator runs at class definition)
import time

print("Before class definition:", time.time())

@dataclass
class TimingTest:
    value: int = 0

print("After class definition:", time.time())
# Decorator ran here ^

# Creating instances is fast (no decorator overhead)
start = time.time()
for _ in range(10000):
    obj = TimingTest(42)
print(f"Created 10k instances in: {time.time() - start:.4f}s")

# Performance comparison: dataclass vs regular class
import timeit

@dataclass
class DataclassVersion:
    x: int
    y: int
    z: int

class RegularVersion:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def __repr__(self):
        return f"RegularVersion(x={self.x}, y={self.y}, z={self.z})"

    def __eq__(self, other):
        if not isinstance(other, RegularVersion):
            return NotImplemented
        return (self.x, self.y, self.z) == (other.x, other.y, other.z)

# Time instantiation
dc_time = timeit.timeit(lambda: DataclassVersion(1, 2, 3), number=100000)
regular_time = timeit.timeit(lambda: RegularVersion(1, 2, 3), number=100000)

print(f"Dataclass: {dc_time:.4f}s")
print(f"Regular:   {regular_time:.4f}s")
print(f"Difference: {abs(dc_time - regular_time):.4f}s (nearly identical)")

# Under the hood: frozen=True
@dataclass(frozen=True)
class Frozen:
    value: int

# This generates:
# def __setattr__(self, name, value):
#     raise FrozenInstanceError(f"cannot assign to field {name!r}")
#
# def __delattr__(self, name):
#     raise FrozenInstanceError(f"cannot delete field {name!r}")
#
# And uses object.__setattr__ in __init__

try:
    f = Frozen(10)
    f.value = 20
except Exception as e:
    print(type(e).__name__)  # FrozenInstanceError

# Checking generated methods
print("Methods generated for Point:")
for name in ['__init__', '__repr__', '__eq__']:
    if hasattr(Point, name):
        print(f"  {name}: {hasattr(Point, name)}")

# Note: Can't use inspect.getsource on generated methods
try:
    print(inspect.getsource(Point.__init__))
except OSError as e:
    print(f"Can't get source of generated methods: {e}")
```

**In Practice**:
In ML workflows: (1) **Config validation at import** - decorator validates field types when module loads, catching errors early, (2) **No runtime overhead** - generated methods are as fast as hand-written ones, crucial for hot paths, (3) **Introspection** - use `fields()` to build config UIs, auto-generate documentation, or validate hyperparameters, (4) **Debugging tip** - check `__dataclass_fields__` to see what decorator generated, (5) **Combine with Pydantic** - Pydantic's `@dataclass` decorator adds runtime validation on top of this mechanism. Understanding this helps debug decorator conflicts and build custom class decorators.

**Key Takeaway**: `@dataclass` decorator inspects `__annotations__` at class definition time, generates `__init__`, `__repr__`, `__eq__` as code strings via exec(), and injects them into the class; zero runtime overhead, methods are real Python code, not wrappers.

</details>

2. What are the performance implications of dataclasses vs regular classes?

<details>
<summary>Answer: Instantiation nearly identical; memory same (both use __dict__); __eq__ slightly slower with many fields; use __slots__ for 30-40% memory reduction; frozen slightly faster attribute access</summary>

**Explanation**:
Dataclasses have **nearly identical performance** to equivalent hand-written classes because the generated methods compile to the same bytecode. Instantiation speed is the same (both execute Python's normal `__init__`), memory usage is identical (both use `__dict__` for attribute storage by default), and method calls have no decorator overhead (methods are generated once at class definition, not wrapped).

The only performance difference is in **comparison operations**: dataclass `__eq__` compares all fields as a tuple, which can be slightly slower for classes with many fields (10+ fields), but the difference is negligible for typical use cases (< 1 microsecond). For **frozen dataclasses**, attribute access is slightly faster because Python doesn't need to check for custom `__setattr__`.

The big performance win comes from `__slots__`: when combined with dataclasses, it reduces memory by 30-40% and speeds up attribute access by 10-20%. This matters when creating millions of objects (embeddings, data points). Without `__slots__`, each instance has a `__dict__` (typically 240+ bytes overhead); with `__slots__`, instances use a fixed-size array.

**Example**:
```python
from dataclasses import dataclass
import sys
import timeit
from memory_profiler import profile

# Performance comparison: dataclass vs regular class
@dataclass
class DataclassPoint:
    x: float
    y: float
    z: float

class RegularPoint:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def __repr__(self):
        return f"RegularPoint(x={self.x}, y={self.y}, z={self.z})"

    def __eq__(self, other):
        if not isinstance(other, RegularPoint):
            return NotImplemented
        return (self.x, self.y, self.z) == (other.x, other.y, other.z)

# Instantiation benchmark
dc_create = timeit.timeit(
    lambda: DataclassPoint(1.0, 2.0, 3.0),
    number=1_000_000
)
regular_create = timeit.timeit(
    lambda: RegularPoint(1.0, 2.0, 3.0),
    number=1_000_000
)

print(f"Dataclass instantiation: {dc_create:.4f}s")
print(f"Regular instantiation:   {regular_create:.4f}s")
print(f"Difference: {abs(dc_create - regular_create):.6f}s (negligible)")

# Memory usage comparison (no __slots__)
dc_obj = DataclassPoint(1.0, 2.0, 3.0)
regular_obj = RegularPoint(1.0, 2.0, 3.0)

print(f"\nMemory without __slots__:")
print(f"Dataclass: {sys.getsizeof(dc_obj.__dict__)} bytes")
print(f"Regular:   {sys.getsizeof(regular_obj.__dict__)} bytes")
print("Same memory usage!")

# Attribute access speed (nearly identical)
dc_get = timeit.timeit(lambda: dc_obj.x, number=10_000_000)
regular_get = timeit.timeit(lambda: regular_obj.x, number=10_000_000)
print(f"\nAttribute access (10M times):")
print(f"Dataclass: {dc_get:.4f}s")
print(f"Regular:   {regular_get:.4f}s")

# Comparison performance (__eq__)
dc1 = DataclassPoint(1.0, 2.0, 3.0)
dc2 = DataclassPoint(1.0, 2.0, 3.0)
r1 = RegularPoint(1.0, 2.0, 3.0)
r2 = RegularPoint(1.0, 2.0, 3.0)

dc_eq = timeit.timeit(lambda: dc1 == dc2, number=1_000_000)
regular_eq = timeit.timeit(lambda: r1 == r2, number=1_000_000)
print(f"\nEquality comparison (1M times):")
print(f"Dataclass: {dc_eq:.4f}s")
print(f"Regular:   {regular_eq:.4f}s")

# Comparison with many fields (where difference shows)
@dataclass
class ManyFieldsDataclass:
    f1: int = 0; f2: int = 0; f3: int = 0; f4: int = 0; f5: int = 0
    f6: int = 0; f7: int = 0; f8: int = 0; f9: int = 0; f10: int = 0
    f11: int = 0; f12: int = 0; f13: int = 0; f14: int = 0; f15: int = 0

class ManyFieldsRegular:
    def __init__(self):
        self.f1 = self.f2 = self.f3 = self.f4 = self.f5 = 0
        self.f6 = self.f7 = self.f8 = self.f9 = self.f10 = 0
        self.f11 = self.f12 = self.f13 = self.f14 = self.f15 = 0

    def __eq__(self, other):
        if not isinstance(other, ManyFieldsRegular):
            return NotImplemented
        # Manually compare first 5 fields only (optimized)
        return (self.f1, self.f2, self.f3, self.f4, self.f5) == \
               (other.f1, other.f2, other.f3, other.f4, other.f5)

m1 = ManyFieldsDataclass()
m2 = ManyFieldsDataclass()
r1 = ManyFieldsRegular()
r2 = ManyFieldsRegular()

many_dc_eq = timeit.timeit(lambda: m1 == m2, number=1_000_000)
many_regular_eq = timeit.timeit(lambda: r1 == r2, number=1_000_000)
print(f"\nMany fields equality (1M times):")
print(f"Dataclass (15 fields): {many_dc_eq:.4f}s")
print(f"Regular (5 fields):    {many_regular_eq:.4f}s")
print("Dataclass compares ALL fields; optimize by overriding __eq__ if needed")

# THE BIG WIN: __slots__ for memory efficiency
@dataclass
class WithoutSlots:
    x: float
    y: float
    z: float

@dataclass
class WithSlots:
    __slots__ = ['x', 'y', 'z']
    x: float
    y: float
    z: float

no_slots = WithoutSlots(1.0, 2.0, 3.0)
with_slots = WithSlots(1.0, 2.0, 3.0)

print(f"\nMemory with __slots__:")
# Without __slots__: has __dict__
try:
    print(f"Without __slots__: {sys.getsizeof(no_slots)} + {sys.getsizeof(no_slots.__dict__)} = {sys.getsizeof(no_slots) + sys.getsizeof(no_slots.__dict__)} bytes")
except AttributeError:
    pass

# With __slots__: no __dict__, fixed layout
print(f"With __slots__:    {sys.getsizeof(with_slots)} bytes")
print(f"Reduction: ~40% less memory")

# Real-world example: 1 million objects
import gc
import tracemalloc

def create_million_without_slots():
    tracemalloc.start()
    objects = [WithoutSlots(i, i+1, i+2) for i in range(1_000_000)]
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return current / 1024 / 1024  # MB

def create_million_with_slots():
    tracemalloc.start()
    objects = [WithSlots(i, i+1, i+2) for i in range(1_000_000)]
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return current / 1024 / 1024  # MB

gc.collect()
mem_without = create_million_without_slots()
gc.collect()
mem_with = create_million_with_slots()

print(f"\n1 million objects:")
print(f"Without __slots__: {mem_without:.2f} MB")
print(f"With __slots__:    {mem_with:.2f} MB")
print(f"Saved: {mem_without - mem_with:.2f} MB ({(1 - mem_with/mem_without)*100:.1f}%)")

# Attribute access speed with __slots__
no_slots_obj = WithoutSlots(1.0, 2.0, 3.0)
slots_obj = WithSlots(1.0, 2.0, 3.0)

no_slots_access = timeit.timeit(lambda: no_slots_obj.x, number=10_000_000)
slots_access = timeit.timeit(lambda: slots_obj.x, number=10_000_000)

print(f"\nAttribute access speed (10M times):")
print(f"Without __slots__: {no_slots_access:.4f}s")
print(f"With __slots__:    {slots_access:.4f}s")
print(f"Speedup: {(1 - slots_access/no_slots_access)*100:.1f}%")

# Frozen dataclass performance
@dataclass(frozen=True)
class FrozenPoint:
    x: float
    y: float
    z: float

@dataclass
class MutablePoint:
    x: float
    y: float
    z: float

frozen = FrozenPoint(1.0, 2.0, 3.0)
mutable = MutablePoint(1.0, 2.0, 3.0)

# Attribute read is slightly faster (no __setattr__ check)
frozen_read = timeit.timeit(lambda: frozen.x, number=10_000_000)
mutable_read = timeit.timeit(lambda: mutable.x, number=10_000_000)

print(f"\nFrozen vs mutable attribute read (10M times):")
print(f"Frozen:  {frozen_read:.4f}s")
print(f"Mutable: {mutable_read:.4f}s")
print(f"Frozen is {(1 - frozen_read/mutable_read)*100:.1f}% faster")

# Hash performance (frozen dataclasses can be hashed)
@dataclass(frozen=True)
class HashableConfig:
    lr: float
    batch_size: int

configs = [HashableConfig(0.001, 32) for _ in range(1000)]

# Using as dict keys (fast lookup)
config_cache = {cfg: f"result_{i}" for i, cfg in enumerate(configs)}
lookup = timeit.timeit(
    lambda: config_cache[HashableConfig(0.001, 32)],
    number=100_000
)
print(f"\nDict lookup with frozen dataclass: {lookup:.4f}s (very fast)")

# When NOT to use dataclasses (performance-critical paths)
# Complex initialization logic
class ComplexModel:
    """Heavy initialization - regular class is clearer"""
    def __init__(self, config):
        # 100 lines of initialization logic
        # Parsing, validation, resource allocation
        # Dataclass __post_init__ would be awkward here
        pass

# Hot path optimization - hand-written __eq__
class OptimizedComparison:
    """Custom __eq__ for fast comparison"""
    def __init__(self, important, metadata):
        self.important = important
        self.metadata = metadata  # Not compared

    def __eq__(self, other):
        # Only compare important field (fast)
        return self.important == other.important
    # Dataclass would compare both fields

# Summary: When to use __slots__
"""
Use __slots__ with dataclasses when:
1. Creating millions of objects (embeddings, data points)
2. Memory is constrained (mobile, edge devices)
3. Need faster attribute access (hot loops)

Don't use __slots__ when:
4. Need dynamic attributes (adding attrs at runtime)
5. Need __dict__ (pickling, some serialization)
6. Multiple inheritance (complex __slots__ management)
"""

# Best of both worlds: frozen + __slots__
@dataclass(frozen=True)
class OptimalPoint:
    __slots__ = ['x', 'y', 'z']
    x: float
    y: float
    z: float

# This combines:
# - Memory efficiency (__slots__)
# - Fast attribute access (__slots__ + frozen)
# - Immutability (frozen)
# - Hashable (frozen)
# - Clean code (dataclass)

optimal = OptimalPoint(1.0, 2.0, 3.0)
print(f"\nOptimal dataclass (frozen + __slots__):")
print(f"Memory: {sys.getsizeof(optimal)} bytes")
print(f"Hashable: {hash(optimal)}")
print(f"Immutable: ", end="")
try:
    optimal.x = 5.0
except Exception as e:
    print(f"Yes ({type(e).__name__})")
```

**In Practice**:
In ML workflows: (1) **Large datasets** - use `__slots__` for millions of data points (30-40% memory savings matters), (2) **Model configs** - frozen dataclasses for immutable, hashable configs (can use as dict keys for caching), (3) **Embeddings** - storing millions of embeddings as dataclass instances with `__slots__` reduces memory footprint, (4) **Hot paths** - if profiling shows `__eq__` is slow (unlikely), override it manually, (5) **Edge deployment** - memory-constrained environments benefit greatly from `__slots__`. Rule of thumb: use plain dataclasses for readability, add `__slots__` only when profiling shows memory/speed issues.

**Key Takeaway**: Dataclasses have nearly identical performance to regular classes (instantiation, memory, methods); only difference is `__eq__` compares all fields (negligible overhead); use `__slots__` for 30-40% memory reduction and 10-20% faster attribute access when creating many objects.

</details>

3. Can you use `__slots__` with dataclasses? What are the caveats?

<details>
<summary>Answer: Yes, define __slots__ as class variable listing all fields; 30-40% memory reduction; caveats: no __dict__, no dynamic attributes, inheritance complexity, must match field names exactly</summary>

**Explanation**:
Yes, you can use `__slots__` with dataclasses by defining `__slots__` as a class-level list of attribute names. This replaces the instance `__dict__` with a fixed-size array, reducing memory by 30-40% and speeding up attribute access by 10-20%. The `@dataclass` decorator respects `__slots__` and generates methods accordingly.

**Caveats**: (1) **Must list ALL fields** - `__slots__` must include every field defined in the dataclass, (2) **No `__dict__`** - can't add attributes dynamically after instantiation, (3) **No `__weakref__`** by default - need to add `'__weakref__'` to `__slots__` if needed, (4) **Inheritance complexity** - child classes need empty `__slots__ = []` or their own slots, (5) **Serialization** - some pickle scenarios need `__dict__`, (6) **Debugging** - can't inspect `__dict__` in debugger.

The benefit is significant for **millions of small objects** (embeddings, data points, coordinates). Without `__slots__`, each instance has a `__dict__` (240+ bytes overhead); with `__slots__`, instances use a compact array. Combine with `frozen=True` for maximum efficiency: immutable + hashable + memory-efficient.

**Example**:
```python
from dataclasses import dataclass, field
import sys
import gc

# Basic usage: dataclass with __slots__
@dataclass
class Point:
    __slots__ = ['x', 'y', 'z']  # Must list all fields
    x: float
    y: float
    z: float

p = Point(1.0, 2.0, 3.0)
print(p)  # Point(x=1.0, y=2.0, z=3.0)

# No __dict__ attribute
print(f"Has __dict__: {hasattr(p, '__dict__')}")  # False

# Can't add dynamic attributes
try:
    p.new_attr = "value"
except AttributeError as e:
    print(f"Error: {e}")  # 'Point' object has no attribute 'new_attr'

# Memory comparison
@dataclass
class PointWithDict:
    x: float
    y: float
    z: float

@dataclass
class PointWithSlots:
    __slots__ = ['x', 'y', 'z']
    x: float
    y: float
    z: float

p_dict = PointWithDict(1.0, 2.0, 3.0)
p_slots = PointWithSlots(1.0, 2.0, 3.0)

dict_size = sys.getsizeof(p_dict) + sys.getsizeof(p_dict.__dict__)
slots_size = sys.getsizeof(p_slots)

print(f"\nMemory per instance:")
print(f"With __dict__:  {dict_size} bytes")
print(f"With __slots__: {slots_size} bytes")
print(f"Reduction: {dict_size - slots_size} bytes ({(1 - slots_size/dict_size)*100:.1f}%)")

# Caveat 1: Must list ALL fields
try:
    @dataclass
    class Broken:
        __slots__ = ['x']  # Missing 'y'!
        x: float
        y: float

    b = Broken(1.0, 2.0)
    print(b.y)  # AttributeError at runtime!
except AttributeError as e:
    print(f"\nCaveat 1 - Missing slot: {e}")

# Correct: include all fields
@dataclass
class Correct:
    __slots__ = ['x', 'y']
    x: float
    y: float

# Caveat 2: No dynamic attributes
@dataclass
class Config:
    __slots__ = ['lr', 'batch_size']
    lr: float
    batch_size: int

cfg = Config(0.001, 32)
try:
    cfg.new_setting = "value"  # ❌ Can't add
except AttributeError as e:
    print(f"\nCaveat 2 - No dynamic attrs: {e}")

# Workaround: include __dict__ in slots (defeats purpose)
@dataclass
class ConfigWithDict:
    __slots__ = ['lr', 'batch_size', '__dict__']
    lr: float
    batch_size: int

cfg2 = ConfigWithDict(0.001, 32)
cfg2.new_setting = "value"  # ✅ Works but loses memory benefit
print(f"With __dict__ in slots: {cfg2.new_setting}")

# Caveat 3: No __weakref__ by default
import weakref

@dataclass
class NoWeakref:
    __slots__ = ['value']
    value: int

try:
    obj = NoWeakref(42)
    weak = weakref.ref(obj)  # ❌ TypeError
except TypeError as e:
    print(f"\nCaveat 3 - No weakref: {e}")

# Fix: add __weakref__ to slots
@dataclass
class WithWeakref:
    __slots__ = ['value', '__weakref__']
    value: int

obj = WithWeakref(42)
weak = weakref.ref(obj)  # ✅ Works
print(f"Weakref supported: {weak() is obj}")

# Caveat 4: Inheritance complexity
@dataclass
class Parent:
    __slots__ = ['a', 'b']
    a: int
    b: int

# Child must have empty __slots__ or its own new slots
@dataclass
class Child(Parent):
    __slots__ = ['c']  # Only NEW fields
    c: int

# Total slots: a, b (from Parent) + c (from Child)
child = Child(1, 2, 3)
print(f"\nInheritance: a={child.a}, b={child.b}, c={child.c}")

# If child redefines parent's slots - ERROR
try:
    @dataclass
    class BadChild(Parent):
        __slots__ = ['a', 'b', 'c']  # ❌ Redefining parent slots
        c: int
    # This will cause issues
except Exception as e:
    print(f"Bad inheritance: {e}")

# Correct inheritance: only new fields in child slots
@dataclass
class GrandParent:
    __slots__ = ['x']
    x: int

@dataclass
class MiddleParent(GrandParent):
    __slots__ = ['y']
    y: int

@dataclass
class GrandChild(MiddleParent):
    __slots__ = ['z']
    z: int

gc_obj = GrandChild(1, 2, 3)
print(f"Multi-level: x={gc_obj.x}, y={gc_obj.y}, z={gc_obj.z}")

# Caveat 5: Default values with field()
@dataclass
class WithDefaults:
    __slots__ = ['required', 'optional']
    required: int
    optional: str = "default"

wd = WithDefaults(42)
print(f"\nDefaults work: {wd.optional}")

# Mutable defaults need default_factory
@dataclass
class WithMutableDefaults:
    __slots__ = ['name', 'tags']
    name: str
    tags: list = field(default_factory=list)

wm1 = WithMutableDefaults("exp1")
wm2 = WithMutableDefaults("exp2")
wm1.tags.append("tag1")
print(f"Mutable defaults: wm1={wm1.tags}, wm2={wm2.tags}")

# Caveat 6: Serialization (pickle)
import pickle

@dataclass
class PickleTest:
    __slots__ = ['value']
    value: int

obj = PickleTest(42)
serialized = pickle.dumps(obj)
deserialized = pickle.loads(serialized)
print(f"\nPickle works: {deserialized.value}")

# Combining with frozen=True (recommended)
@dataclass(frozen=True)
class OptimalConfig:
    __slots__ = ['lr', 'batch_size', 'epochs']
    lr: float
    batch_size: int
    epochs: int

oc = OptimalConfig(0.001, 32, 100)
print(f"\nOptimal config: {oc}")
print(f"Hashable: {hash(oc)}")
print(f"Memory: {sys.getsizeof(oc)} bytes")

# Can use as dict keys
cache = {oc: "cached_result"}
print(f"Dict key: {cache[oc]}")

# Real-world example: Million embeddings
@dataclass
class Embedding:
    __slots__ = ['id', 'vector', 'label']
    id: int
    vector: tuple  # Fixed-size tuple
    label: str

# Create 100k embeddings
import tracemalloc
tracemalloc.start()
embeddings = [
    Embedding(i, (i*0.1, i*0.2, i*0.3), f"label_{i}")
    for i in range(100_000)
]
current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()
print(f"\n100k embeddings: {current / 1024 / 1024:.2f} MB")

# Same without __slots__ (for comparison)
@dataclass
class EmbeddingNoSlots:
    id: int
    vector: tuple
    label: str

tracemalloc.start()
embeddings_no_slots = [
    EmbeddingNoSlots(i, (i*0.1, i*0.2, i*0.3), f"label_{i}")
    for i in range(100_000)
]
current_no_slots, _ = tracemalloc.get_traced_memory()
tracemalloc.stop()
print(f"Without __slots__: {current_no_slots / 1024 / 1024:.2f} MB")
print(f"Savings: {(current_no_slots - current) / 1024 / 1024:.2f} MB")

# When NOT to use __slots__
"""
Don't use __slots__ when:
1. Need dynamic attributes (config.new_attr = value)
2. Need __dict__ for inspection/debugging
3. Complex inheritance (multiple inheritance with slots is tricky)
4. Small number of instances (overhead not worth it)
5. Prototyping (less flexible)

DO use __slots__ when:
6. Millions of objects (embeddings, data points)
7. Memory constrained (mobile, edge)
8. Fixed schema (fields don't change)
9. Combined with frozen=True (immutable configs)
"""

# Best practices
@dataclass(frozen=True)
class BestPracticeConfig:
    """Immutable config with memory efficiency"""
    __slots__ = ['model_name', 'lr', 'batch_size', 'device']
    model_name: str
    lr: float = 0.001
    batch_size: int = 32
    device: str = "cpu"

# Benefits:
# - Frozen: immutable, hashable, thread-safe
# - Slots: memory efficient
# - Dataclass: clean syntax, auto-generated methods
# - Type hints: IDE support, documentation

config1 = BestPracticeConfig("bert-base")
config2 = BestPracticeConfig("bert-base")
print(f"\nBest practice example:")
print(f"Equal: {config1 == config2}")
print(f"Hashable: {hash(config1) == hash(config2)}")
print(f"Memory: {sys.getsizeof(config1)} bytes")

# Using in set/dict
configs = {config1, config2}  # Set deduplicates
print(f"Set size: {len(configs)} (deduplicated)")

# Edge case: __slots__ with init=False fields
@dataclass
class ComputedField:
    __slots__ = ['base', 'computed']
    base: int
    computed: int = field(init=False)

    def __post_init__(self):
        object.__setattr__(self, 'computed', self.base * 2)

cf = ComputedField(10)
print(f"\nComputed field: base={cf.base}, computed={cf.computed}")

# Multiple inheritance with __slots__ (advanced)
class A:
    __slots__ = ['a']

class B:
    __slots__ = ['b']

@dataclass
class C(A, B):
    __slots__ = ['c']  # Only new field
    a: int
    b: int
    c: int

    def __init__(self, a, b, c):
        A.__init__(self)
        B.__init__(self)
        self.a = a
        self.b = b
        self.c = c

# Note: Multiple inheritance with __slots__ is complex!
# Usually better to avoid or use composition instead
```

**In Practice**:
In ML pipelines: (1) **Dataset objects** - millions of data points benefit hugely from `__slots__` (30-40% memory reduction in tokenized datasets), (2) **Embeddings** - storing word/sentence embeddings as dataclass instances with slots saves GB of RAM, (3) **Configs** - frozen + slots for immutable, hashable, memory-efficient configs, (4) **Coordinates/Features** - geometric data (bbox coordinates, keypoints) with slots, (5) **When to skip** - prototyping, complex inheritance, need for dynamic attributes. Start without `__slots__`, add only when memory profiling shows it's needed.

**Key Takeaway**: Yes, use `__slots__` with dataclasses by listing all fields as class variable; provides 30-40% memory reduction; caveats: no `__dict__`, no dynamic attributes, inheritance complexity, must match field names; ideal for millions of small objects.

</details>

4. How do you serialize dataclasses to JSON for saving model configs?

<details>
<summary>Answer: Use asdict() + json.dump() for simple cases; custom JSONEncoder for nested dataclasses; Pydantic for production (validation + serialization); handle special types (datetime, Path, Enum) with custom encoder</summary>

**Explanation**:
Serializing dataclasses to JSON is crucial for saving model configurations, checkpoints, and experiment metadata. The standard library provides `asdict()` to convert dataclasses to dictionaries, which can then be serialized with `json.dump()`. For nested dataclasses, you need a custom `JSONEncoder` that recursively converts them. For production ML systems, **Pydantic** is recommended as it combines serialization with validation.

There are three common approaches: (1) **Simple**: `asdict(config)` + `json.dump()` for flat dataclasses with basic types, (2) **Advanced**: Custom `JSONEncoder` for nested dataclasses, datetime, Path, Enum, custom types, (3) **Production**: Pydantic dataclasses with built-in JSON serialization, validation, and type coercion. The key challenge is handling non-JSON-serializable types like `datetime`, `Path`, `set`, and nested dataclasses.

For deserialization, you can use **dictionary unpacking** (`Config(**json.load(f))`), but this doesn't validate types. Pydantic automatically validates and coerces types during deserialization, catching errors early. For versioning configs, include a `version` field and write migration functions.

**Example**:
```python
from dataclasses import dataclass, asdict, field, fields
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from enum import Enum

# Method 1: Simple serialization with asdict()
@dataclass
class SimpleConfig:
    learning_rate: float
    batch_size: int
    epochs: int
    model_name: str

config = SimpleConfig(0.001, 32, 100, "bert-base")

# Convert to dict
config_dict = asdict(config)
print(config_dict)
# {'learning_rate': 0.001, 'batch_size': 32, 'epochs': 100, 'model_name': 'bert-base'}

# Save to JSON
with open("config.json", "w") as f:
    json.dump(config_dict, f, indent=2)

# Load from JSON
with open("config.json", "r") as f:
    loaded_dict = json.load(f)
    loaded_config = SimpleConfig(**loaded_dict)

print(loaded_config == config)  # True

# Method 2: Nested dataclasses (asdict handles recursively)
@dataclass
class OptimizerConfig:
    name: str
    learning_rate: float
    momentum: float = 0.9

@dataclass
class ModelConfig:
    model_name: str
    hidden_size: int
    num_layers: int
    optimizer: OptimizerConfig

optimizer = OptimizerConfig("adam", 0.001)
model_config = ModelConfig("transformer", 768, 12, optimizer)

# asdict() recursively converts nested dataclasses
config_dict = asdict(model_config)
print(json.dumps(config_dict, indent=2))
# {
#   "model_name": "transformer",
#   "hidden_size": 768,
#   "num_layers": 12,
#   "optimizer": {
#     "name": "adam",
#     "learning_rate": 0.001,
#     "momentum": 0.9
#   }
# }

# Deserialize nested dataclasses (manual reconstruction)
loaded = json.load(open("config.json"))
loaded_optimizer = OptimizerConfig(**loaded["optimizer"])
loaded_model = ModelConfig(
    loaded["model_name"],
    loaded["hidden_size"],
    loaded["num_layers"],
    loaded_optimizer
)

# Method 3: Custom JSONEncoder for special types
class DataclassJSONEncoder(json.JSONEncoder):
    """Handle dataclasses, datetime, Path, Enum"""
    def default(self, obj):
        # Handle dataclasses
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        # Handle datetime
        if isinstance(obj, datetime):
            return obj.isoformat()
        # Handle Path
        if isinstance(obj, Path):
            return str(obj)
        # Handle Enum
        if isinstance(obj, Enum):
            return obj.value
        # Handle set
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)

@dataclass
class AdvancedConfig:
    model_name: str
    created_at: datetime
    checkpoint_path: Path
    device: str = "cpu"
    tags: set = field(default_factory=set)

config = AdvancedConfig(
    model_name="resnet50",
    created_at=datetime.now(),
    checkpoint_path=Path("/models/checkpoint.pt"),
)
config.tags.add("vision")
config.tags.add("classification")

# Serialize with custom encoder
json_str = json.dumps(config, cls=DataclassJSONEncoder, indent=2)
print(json_str)
# {
#   "model_name": "resnet50",
#   "created_at": "2026-01-26T10:30:00.123456",
#   "checkpoint_path": "/models/checkpoint.pt",
#   "device": "cpu",
#   "tags": ["vision", "classification"]
# }

# Deserialize (manual type conversion)
loaded = json.loads(json_str)
loaded_config = AdvancedConfig(
    model_name=loaded["model_name"],
    created_at=datetime.fromisoformat(loaded["created_at"]),
    checkpoint_path=Path(loaded["checkpoint_path"]),
    device=loaded["device"],
)
loaded_config.tags = set(loaded["tags"])

# Method 4: Helper functions for serialization
def serialize_dataclass(obj: Any) -> str:
    """Serialize dataclass to JSON string"""
    return json.dumps(obj, cls=DataclassJSONEncoder, indent=2)

def deserialize_dataclass(json_str: str, cls: type) -> Any:
    """Deserialize JSON string to dataclass (basic types only)"""
    data = json.loads(json_str)
    return cls(**data)

# Save/load helpers
def save_config(config: Any, path: str):
    """Save dataclass config to JSON file"""
    with open(path, "w") as f:
        json.dump(config, f, cls=DataclassJSONEncoder, indent=2)

def load_config(path: str, cls: type) -> Any:
    """Load dataclass config from JSON file"""
    with open(path, "r") as f:
        data = json.load(f)
        return cls(**data)

# Method 5: Pydantic (RECOMMENDED for production)
from pydantic import BaseModel, Field, validator
from pydantic.dataclasses import dataclass as pydantic_dataclass

# Option A: Pydantic BaseModel (more features)
class PydanticModelConfig(BaseModel):
    model_name: str
    learning_rate: float = Field(gt=0, le=1.0)  # Validation
    batch_size: int = Field(gt=0)
    hidden_size: int = Field(default=768)
    dropout: float = Field(default=0.1, ge=0.0, le=1.0)
    device: str = "cpu"
    created_at: datetime = Field(default_factory=datetime.now)

    @validator('model_name')
    def validate_model_name(cls, v):
        if not v.strip():
            raise ValueError("Model name cannot be empty")
        return v.lower()

config = PydanticModelConfig(
    model_name="BERT-Base",
    learning_rate=0.001,
    batch_size=32
)

# JSON serialization (built-in)
json_str = config.model_dump_json(indent=2)
print(json_str)

# Deserialization with validation
loaded = PydanticModelConfig.model_validate_json(json_str)
print(loaded == config)  # True

# Type coercion (strings converted automatically)
data = {
    "model_name": "GPT-2",
    "learning_rate": "0.001",  # String, will be coerced to float
    "batch_size": "64"         # String, will be coerced to int
}
config2 = PydanticModelConfig(**data)
print(type(config2.learning_rate))  # <class 'float'>

# Validation errors
try:
    bad_config = PydanticModelConfig(
        model_name="",  # ❌ Empty name
        learning_rate=2.0,  # ❌ > 1.0
        batch_size=-1  # ❌ Negative
    )
except Exception as e:
    print(f"Validation error: {e}")

# Option B: Pydantic dataclass (decorator style)
@pydantic_dataclass
class TrainingConfig:
    model_name: str
    learning_rate: float
    batch_size: int = 32

config = TrainingConfig(model_name="resnet", learning_rate=0.001)

# Pydantic dataclasses don't have model_dump_json directly
# Use dict() + json.dumps
from dataclasses import asdict
json_str = json.dumps(asdict(config))

# Method 6: Nested Pydantic models
class OptimizerConfig(BaseModel):
    name: str
    learning_rate: float
    weight_decay: float = 0.0

class SchedulerConfig(BaseModel):
    name: str
    warmup_steps: int = 0

class FullTrainingConfig(BaseModel):
    model_name: str
    optimizer: OptimizerConfig
    scheduler: Optional[SchedulerConfig] = None
    epochs: int = 100

config = FullTrainingConfig(
    model_name="bert-base",
    optimizer=OptimizerConfig(name="adamw", learning_rate=0.001),
    scheduler=SchedulerConfig(name="linear", warmup_steps=1000)
)

# Serialize (handles nesting automatically)
json_str = config.model_dump_json(indent=2)
print(json_str)

# Deserialize (validates nested models)
loaded = FullTrainingConfig.model_validate_json(json_str)

# Method 7: Config versioning for backward compatibility
@dataclass
class ConfigV1:
    version: str = "1.0"
    learning_rate: float = 0.01
    batch_size: int = 32

@dataclass
class ConfigV2:
    version: str = "2.0"
    learning_rate: float = 0.01
    batch_size: int = 32
    dropout: float = 0.1  # New field

@dataclass
class ConfigV3:
    version: str = "3.0"
    learning_rate: float = 0.01
    batch_size: int = 32
    dropout: float = 0.1
    optimizer: str = "adam"  # New field

def load_versioned_config(path: str) -> ConfigV3:
    """Load config with automatic migration"""
    with open(path) as f:
        data = json.load(f)

    version = data.get("version", "1.0")

    # Migrate v1 -> v2
    if version == "1.0":
        data["dropout"] = 0.1
        data["version"] = "2.0"

    # Migrate v2 -> v3
    if version == "2.0":
        data["optimizer"] = "adam"
        data["version"] = "3.0"

    return ConfigV3(**data)

# Save with version info
config = ConfigV3(learning_rate=0.001, batch_size=64, dropout=0.2, optimizer="adamw")
save_config(config, "config_v3.json")

# Load old config (auto-migrated)
old_config_v1 = {"version": "1.0", "learning_rate": 0.001, "batch_size": 32}
with open("old_config.json", "w") as f:
    json.dump(old_config_v1, f)

migrated = load_versioned_config("old_config.json")
print(migrated)  # ConfigV3 with defaults for new fields

# Method 8: Custom serialization for ML-specific types
import numpy as np
import torch

class MLJSONEncoder(json.JSONEncoder):
    """Handle ML-specific types"""
    def default(self, obj):
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, torch.Tensor):
            return obj.tolist()
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Path):
            return str(obj)
        return super().default(obj)

@dataclass
class MLConfig:
    model_name: str
    class_weights: list  # Will store numpy array as list
    learning_rate: float = 0.001

# Save config with numpy array
weights = np.array([0.3, 0.5, 0.2])
config = MLConfig("classifier", weights.tolist(), 0.001)
json_str = json.dumps(config, cls=MLJSONEncoder, indent=2)

# Load and convert back to numpy
loaded = json.loads(json_str)
loaded_config = MLConfig(
    loaded["model_name"],
    np.array(loaded["class_weights"]),
    loaded["learning_rate"]
)

# Method 9: Real-world example - Experiment tracking
@dataclass
class ExperimentConfig:
    experiment_name: str
    model_config: ModelConfig
    training_config: TrainingConfig
    created_at: datetime = field(default_factory=datetime.now)
    git_commit: Optional[str] = None
    notes: str = ""

    def save(self, directory: Path):
        """Save config to experiment directory"""
        directory.mkdir(parents=True, exist_ok=True)
        config_path = directory / "config.json"
        with open(config_path, "w") as f:
            json.dump(asdict(self), f, cls=DataclassJSONEncoder, indent=2)

    @classmethod
    def load(cls, directory: Path):
        """Load config from experiment directory"""
        config_path = directory / "config.json"
        with open(config_path) as f:
            data = json.load(f)
            # Reconstruct nested dataclasses
            data["model_config"] = ModelConfig(**data["model_config"])
            data["training_config"] = TrainingConfig(**data["training_config"])
            data["created_at"] = datetime.fromisoformat(data["created_at"])
            return cls(**data)

# Usage
experiment = ExperimentConfig(
    experiment_name="bert_finetuning_v1",
    model_config=ModelConfig("bert-base", 768, 12, optimizer),
    training_config=TrainingConfig("bert", 0.001),
    git_commit="abc123"
)
experiment.save(Path("experiments/exp001"))

# Load later
loaded_exp = ExperimentConfig.load(Path("experiments/exp001"))

# Method 10: Best practices summary
class BestPracticeConfig(BaseModel):
    """Production-ready config using Pydantic"""
    # Metadata
    version: str = Field(default="1.0", description="Config version")
    created_at: datetime = Field(default_factory=datetime.now)

    # Model settings
    model_name: str = Field(..., min_length=1)
    learning_rate: float = Field(gt=0, le=1.0)
    batch_size: int = Field(gt=0, le=1024)

    # Optional settings with validation
    dropout: float = Field(default=0.1, ge=0.0, le=1.0)
    device: str = Field(default="cpu")

    @validator('device')
    def validate_device(cls, v):
        if v not in ['cpu', 'cuda', 'mps']:
            raise ValueError(f"Invalid device: {v}")
        return v

    def save_json(self, path: str):
        """Save to JSON file"""
        with open(path, "w") as f:
            f.write(self.model_dump_json(indent=2))

    @classmethod
    def load_json(cls, path: str):
        """Load from JSON file with validation"""
        with open(path) as f:
            return cls.model_validate_json(f.read())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to plain dict"""
        return self.model_dump()

# Usage
config = BestPracticeConfig(
    model_name="resnet50",
    learning_rate=0.001,
    batch_size=32
)
config.save_json("config.json")
loaded = BestPracticeConfig.load_json("config.json")
```

**In Practice**:
In ML workflows: (1) **Experiment configs** - save hyperparameters with every training run using Pydantic for validation, (2) **Checkpoint metadata** - store model config alongside weights for reproducibility, (3) **A/B testing** - serialize different configs for comparison experiments, (4) **Config versioning** - include version field and migration logic for backward compatibility, (5) **API contracts** - use Pydantic models for request/response validation in ML APIs (FastAPI). Pydantic is the industry standard for production ML systems; stdlib dataclasses + asdict() work for simple scripts.

**Key Takeaway**: Use `asdict()` + `json.dump()` for simple dataclasses; custom `JSONEncoder` for datetime/Path/Enum/nested dataclasses; **Pydantic (recommended)** for production with automatic validation, type coercion, and serialization; include version field for config evolution.

</details>

**Production Scenarios**:

1. How do you use Pydantic for data validation in ML APIs?

<details>
<summary>Answer: Pydantic BaseModel provides runtime validation, type coercion, JSON serialization; use Field() for constraints; integrates with FastAPI for auto-validated endpoints; returns 422 with detailed errors</summary>

**Explanation**:
Pydantic is the **industry standard** for data validation in production ML APIs because it provides **runtime validation** (unlike dataclasses which only have type hints), automatic type coercion, detailed error messages, and seamless FastAPI integration. When an ML API receives a request, Pydantic validates all fields against constraints, coerces types (string "123" → int 123), and returns HTTP 422 with detailed validation errors if invalid.

Pydantic models inherit from `BaseModel` and use `Field()` for constraints like `gt=0` (greater than), `le=1.0` (less or equal), `min_length`, `regex`. Custom validators use `@validator` decorator for complex logic (cross-field validation, custom business rules). FastAPI automatically validates request bodies, query params, and path params using Pydantic models.

The key advantages over stdlib dataclasses: (1) **Runtime validation** - catches errors at API boundary, not during model inference, (2) **Type coercion** - flexible input handling (JSON strings → Python types), (3) **Detailed errors** - tells users exactly what's wrong and where, (4) **Serialization** - `model_dump_json()` for responses, (5) **OpenAPI** - FastAPI auto-generates API docs from Pydantic schemas.

**Example**:
```python
from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import json

# Basic Pydantic model for ML inference
class InferenceRequest(BaseModel):
    """Request schema for model inference endpoint"""
    model_id: str = Field(..., min_length=1, max_length=100, description="Model identifier")
    input_texts: List[str] = Field(..., min_items=1, max_items=100)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=100, ge=1, le=2048)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    @validator('input_texts')
    def validate_text_length(cls, v):
        """Custom validator for text length"""
        for i, text in enumerate(v):
            if len(text) > 5000:
                raise ValueError(f'Text at index {i} too long (max 5000 chars, got {len(text)})')
            if not text.strip():
                raise ValueError(f'Text at index {i} is empty')
        return v

    @validator('temperature')
    def validate_temperature(cls, v):
        """Warn about extreme temperatures"""
        if v > 1.5:
            print(f"Warning: High temperature {v} may produce unstable results")
        return v

class InferenceResponse(BaseModel):
    """Response schema for model inference"""
    predictions: List[str]
    model_id: str
    processing_time_ms: float
    timestamp: datetime = Field(default_factory=datetime.now)

# Test validation
try:
    # ✅ Valid request
    valid = InferenceRequest(
        model_id="gpt-3.5-turbo",
        input_texts=["Hello, world!", "How are you?"],
        temperature=0.8
    )
    print("Valid:", valid)
except Exception as e:
    print(f"Error: {e}")

try:
    # ❌ Invalid: empty input_texts
    invalid1 = InferenceRequest(
        model_id="gpt-3.5-turbo",
        input_texts=[],  # Violates min_items=1
        temperature=0.7
    )
except Exception as e:
    print(f"\nValidation error 1:\n{e}")
    # Shows: ensure this value has at least 1 items

try:
    # ❌ Invalid: temperature out of range
    invalid2 = InferenceRequest(
        model_id="gpt-3.5-turbo",
        input_texts=["Hello"],
        temperature=3.0  # Violates le=2.0
    )
except Exception as e:
    print(f"\nValidation error 2:\n{e}")
    # Shows: ensure this value is less than or equal to 2.0

# Type coercion (Pydantic converts types automatically)
from pydantic import ValidationError

data = {
    "model_id": "gpt-4",
    "input_texts": ["Test"],
    "temperature": "0.5",  # String instead of float
    "max_tokens": "200"    # String instead of int
}

request = InferenceRequest(**data)
print(f"\nType coercion:")
print(f"temperature type: {type(request.temperature)}")  # <class 'float'>
print(f"max_tokens type: {type(request.max_tokens)}")    # <class 'int'>

# FastAPI integration
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI(title="ML Inference API")

@app.post("/v1/inference", response_model=InferenceResponse)
async def predict(request: InferenceRequest):
    """
    Inference endpoint with automatic validation

    - **model_id**: Model to use (e.g., "gpt-3.5-turbo")
    - **input_texts**: List of texts to process (1-100 items, max 5000 chars each)
    - **temperature**: Sampling temperature 0.0-2.0 (default: 0.7)
    - **max_tokens**: Maximum tokens to generate (1-2048, default: 100)
    """
    # Request is automatically validated by FastAPI + Pydantic
    # If validation fails, returns HTTP 422 with detailed errors

    import time
    start = time.time()

    # Simulate inference
    predictions = [f"Response to: {text[:50]}..." for text in request.input_texts]

    processing_time = (time.time() - start) * 1000

    return InferenceResponse(
        predictions=predictions,
        model_id=request.model_id,
        processing_time_ms=processing_time
    )

# Advanced: Enums for fixed choices
class ModelType(str, Enum):
    GPT_3_5 = "gpt-3.5-turbo"
    GPT_4 = "gpt-4"
    CLAUDE = "claude-3-opus"

class TaskType(str, Enum):
    CLASSIFICATION = "classification"
    GENERATION = "generation"
    SUMMARIZATION = "summarization"

class AdvancedRequest(BaseModel):
    model: ModelType  # Only accepts enum values
    task: TaskType
    inputs: List[str] = Field(..., min_items=1)
    config: Optional[Dict[str, Any]] = None

# Enum validation
try:
    req = AdvancedRequest(
        model="gpt-3.5-turbo",  # String converted to enum
        task="classification",
        inputs=["text"]
    )
    print(f"\nEnum validation: model={req.model.value}")
except Exception as e:
    print(f"Error: {e}")

try:
    # ❌ Invalid enum value
    bad_req = AdvancedRequest(
        model="invalid-model",  # Not in enum
        task="classification",
        inputs=["text"]
    )
except Exception as e:
    print(f"\nInvalid enum: {e}")

# Cross-field validation with root_validator
class TrainingRequest(BaseModel):
    model_name: str
    learning_rate: float = Field(gt=0, le=1.0)
    batch_size: int = Field(gt=0)
    epochs: int = Field(gt=0)
    early_stopping: bool = False
    patience: Optional[int] = None

    @root_validator
    def validate_early_stopping(cls, values):
        """Validate that patience is set when early_stopping is enabled"""
        early_stopping = values.get('early_stopping')
        patience = values.get('patience')

        if early_stopping and patience is None:
            raise ValueError('patience must be set when early_stopping is True')

        if not early_stopping and patience is not None:
            raise ValueError('patience should not be set when early_stopping is False')

        return values

# Test cross-field validation
try:
    # ❌ early_stopping=True but no patience
    bad_train = TrainingRequest(
        model_name="resnet50",
        learning_rate=0.001,
        batch_size=32,
        epochs=100,
        early_stopping=True  # Missing patience!
    )
except Exception as e:
    print(f"\nCross-field validation error: {e}")

# ✅ Valid with early stopping
good_train = TrainingRequest(
    model_name="resnet50",
    learning_rate=0.001,
    batch_size=32,
    epochs=100,
    early_stopping=True,
    patience=5
)
print(f"\nValid training request: {good_train.model_name}")

# Nested Pydantic models
class DatasetConfig(BaseModel):
    name: str
    split: str = Field(..., regex="^(train|val|test)$")
    size: int = Field(gt=0)

class ModelArchitecture(BaseModel):
    type: str
    hidden_size: int = Field(gt=0)
    num_layers: int = Field(gt=0, le=100)

class FullTrainingConfig(BaseModel):
    experiment_name: str = Field(..., min_length=1, max_length=200)
    dataset: DatasetConfig
    model: ModelArchitecture
    training: TrainingRequest

# Nested validation
config = FullTrainingConfig(
    experiment_name="resnet_cifar10_v1",
    dataset=DatasetConfig(name="cifar10", split="train", size=50000),
    model=ModelArchitecture(type="resnet50", hidden_size=2048, num_layers=50),
    training=TrainingRequest(
        model_name="resnet50",
        learning_rate=0.001,
        batch_size=128,
        epochs=100
    )
)

# Serialize to JSON
json_str = config.model_dump_json(indent=2)
print(f"\nSerialized config:\n{json_str[:200]}...")

# Deserialize with validation
loaded = FullTrainingConfig.model_validate_json(json_str)
print(f"Loaded and validated: {loaded.experiment_name}")

# Error handling in FastAPI
@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc: ValidationError):
    """Custom error handler for validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "details": exc.errors(),  # Detailed error info
            "message": str(exc)
        }
    )

# Real-world: Model registry with validation
class ModelMetadata(BaseModel):
    model_id: str = Field(..., regex="^[a-z0-9-]+$")
    version: str = Field(..., regex="^v\\d+\\.\\d+\\.\\d+$")  # Semantic versioning
    framework: str = Field(..., regex="^(pytorch|tensorflow|sklearn)$")
    accuracy: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.now)
    tags: List[str] = Field(default_factory=list)

    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return [tag.lower() for tag in v]  # Normalize to lowercase

# Usage
model = ModelMetadata(
    model_id="bert-base-v2",
    version="v1.0.0",
    framework="pytorch",
    accuracy=0.94,
    tags=["NLP", "Classification", "BERT"]
)
print(f"\nModel metadata: {model.model_id} (accuracy: {model.accuracy})")

# Batch validation
class BatchInferenceRequest(BaseModel):
    model_id: str
    batch: List[InferenceRequest] = Field(..., min_items=1, max_items=1000)

    @validator('batch')
    def validate_batch_size(cls, v):
        total_texts = sum(len(req.input_texts) for req in v)
        if total_texts > 10000:
            raise ValueError(f'Total texts in batch ({total_texts}) exceeds limit (10000)')
        return v

# Config from environment variables
from pydantic import BaseSettings

class APISettings(BaseSettings):
    """Load settings from environment variables"""
    api_key: str
    model_endpoint: str = "https://api.example.com"
    max_batch_size: int = 100
    timeout_seconds: int = 30
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Load from .env file
# API_KEY=secret123
# MODEL_ENDPOINT=https://prod.api.com
# MAX_BATCH_SIZE=500
settings = APISettings()  # Automatically loads from env

# Performance: Validation overhead
import timeit

data = {
    "model_id": "gpt-4",
    "input_texts": ["Hello world"] * 10,
    "temperature": 0.7,
    "max_tokens": 100
}

# Time Pydantic validation
pydantic_time = timeit.timeit(
    lambda: InferenceRequest(**data),
    number=10000
)
print(f"\nPydantic validation (10k times): {pydantic_time:.4f}s")
print("Overhead: ~0.01ms per request (negligible for API)")

# Why Pydantic over dataclasses summary
"""
Pydantic advantages:
1. Runtime validation (dataclasses = type hints only)
2. Type coercion (JSON strings → Python types)
3. Detailed error messages (shows field, value, constraint)
4. FastAPI integration (auto-validation, OpenAPI docs)
5. Serialization (model_dump_json(), model_validate_json())
6. Settings management (load from env vars)
7. Validators (custom logic, cross-field validation)

Dataclasses advantages:
8. Faster (no validation overhead)
9. Simpler (stdlib, no dependencies)
10. Better for internal data structures

Use Pydantic for: API requests/responses, configs, external data
Use dataclasses for: Internal data structures, performance-critical paths
"""
```

**In Practice**:
In production ML systems: (1) **API validation** - all FastAPI endpoints use Pydantic models for request/response validation, (2) **Config validation** - load hyperparameters with Pydantic to catch errors early (learning_rate=-0.1 rejected immediately), (3) **Data pipelines** - validate incoming data before feeding to model (missing fields, wrong types), (4) **Experiment tracking** - Pydantic models for experiment configs with validation (epochs > 0, lr in valid range), (5) **Model serving** - validate inference requests (batch size limits, input constraints). Industry standard: FastAPI + Pydantic for ML APIs (used by OpenAI, Hugging Face, etc.).

**Key Takeaway**: Pydantic provides runtime validation, type coercion, and detailed error messages for ML APIs; use `BaseModel` + `Field()` for constraints; integrates seamlessly with FastAPI for auto-validated endpoints returning HTTP 422 on validation errors; industry standard for production ML systems.

</details>

2. What's the best practice for versioning model configs stored as dataclasses?

<details>
<summary>Answer: Include version field; separate dataclass per version; write migration functions; store with timestamp + git_commit; use semantic versioning; test migrations; archive old configs</summary>

**Explanation**:
Config versioning is critical for **reproducibility** in ML - you need to recreate training runs from months ago with exact same hyperparameters. Best practices: (1) **Version field** - every config includes version string (semantic versioning like "1.2.0"), (2) **Separate dataclasses** - `ModelConfigV1`, `ModelConfigV2`, etc. for clear evolution history, (3) **Migration functions** - automatic upgrade from old versions to latest, (4) **Metadata** - store timestamp, git commit, code version alongside config, (5) **Testing** - unit tests for migrations to ensure old configs still work.

The migration strategy: when loading a config, check its version, apply migration chain (v1→v2→v3), use sensible defaults for new fields. Never modify old config classes (breaking change); instead create new version. For experiments, save immutable snapshot of config at training time, not reference to "current" config.

Advanced patterns: (1) **Breaking changes** - bump major version (v1.x.x → v2.0.0), write clear migration guide, (2) **Deprecation** - mark fields as deprecated, log warnings, remove after grace period, (3) **Config registry** - map version strings to config classes, (4) **Backward compatibility** - old code can read new configs (forward compatibility harder), (5) **Archival** - keep sample configs for each version in repo.

**Example**:
```python
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, Type
from datetime import datetime
from pathlib import Path
import json
import subprocess
from enum import Enum

# Version 1: Initial config (released 2024-01-01)
@dataclass
class ModelConfigV1:
    """Initial model configuration"""
    version: str = "1.0.0"
    learning_rate: float
    batch_size: int
    epochs: int = 100

# Version 2: Added regularization (released 2024-03-15)
@dataclass
class ModelConfigV2:
    """Added dropout and weight decay"""
    version: str = "2.0.0"
    learning_rate: float
    batch_size: int
    epochs: int = 100
    dropout: float = 0.0  # New field with default
    weight_decay: float = 0.0  # New field with default

# Version 3: Added optimizer config (released 2024-06-01)
@dataclass
class OptimizerConfig:
    """Optimizer configuration (introduced in v3)"""
    name: str = "adam"
    beta1: float = 0.9
    beta2: float = 0.999
    epsilon: float = 1e-8

@dataclass
class ModelConfigV3:
    """Refactored to use nested optimizer config"""
    version: str = "3.0.0"
    learning_rate: float
    batch_size: int
    epochs: int = 100
    dropout: float = 0.0
    weight_decay: float = 0.0
    optimizer: OptimizerConfig = field(default_factory=OptimizerConfig)

# Version 4: Breaking change - renamed field (released 2025-01-01)
@dataclass
class ModelConfigV4:
    """Renamed learning_rate to lr (breaking change)"""
    version: str = "4.0.0"
    lr: float  # Renamed from learning_rate
    batch_size: int
    epochs: int = 100
    dropout: float = 0.0
    weight_decay: float = 0.0
    optimizer: OptimizerConfig = field(default_factory=OptimizerConfig)
    # New field
    gradient_clipping: Optional[float] = None

# Migration functions
def migrate_v1_to_v2(config_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate v1 -> v2: add dropout and weight_decay"""
    print("Migrating config from v1.0.0 to v2.0.0")
    config_dict["version"] = "2.0.0"
    config_dict["dropout"] = 0.0
    config_dict["weight_decay"] = 0.0
    return config_dict

def migrate_v2_to_v3(config_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate v2 -> v3: add optimizer config"""
    print("Migrating config from v2.0.0 to v3.0.0")
    config_dict["version"] = "3.0.0"
    # Create default optimizer config
    config_dict["optimizer"] = {
        "name": "adam",
        "beta1": 0.9,
        "beta2": 0.999,
        "epsilon": 1e-8
    }
    return config_dict

def migrate_v3_to_v4(config_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate v3 -> v4: rename learning_rate to lr"""
    print("Migrating config from v3.0.0 to v4.0.0")
    config_dict["version"] = "4.0.0"
    # Rename field (breaking change)
    config_dict["lr"] = config_dict.pop("learning_rate")
    # Add new field
    config_dict["gradient_clipping"] = None
    return config_dict

# Migration registry
MIGRATIONS = {
    ("1.0.0", "2.0.0"): migrate_v1_to_v2,
    ("2.0.0", "3.0.0"): migrate_v2_to_v3,
    ("3.0.0", "4.0.0"): migrate_v3_to_v4,
}

# Config class registry
CONFIG_CLASSES: Dict[str, Type] = {
    "1.0.0": ModelConfigV1,
    "2.0.0": ModelConfigV2,
    "3.0.0": ModelConfigV3,
    "4.0.0": ModelConfigV4,
}

LATEST_VERSION = "4.0.0"

def migrate_to_latest(config_dict: Dict[str, Any]) -> ModelConfigV4:
    """Migrate any version to latest version"""
    current_version = config_dict.get("version", "1.0.0")

    # Migration chain
    version_chain = ["1.0.0", "2.0.0", "3.0.0", "4.0.0"]

    # Apply migrations in sequence
    current_idx = version_chain.index(current_version)
    for i in range(current_idx, len(version_chain) - 1):
        from_version = version_chain[i]
        to_version = version_chain[i + 1]
        migration_func = MIGRATIONS[(from_version, to_version)]
        config_dict = migration_func(config_dict)

    # Handle nested OptimizerConfig
    if "optimizer" in config_dict and isinstance(config_dict["optimizer"], dict):
        config_dict["optimizer"] = OptimizerConfig(**config_dict["optimizer"])

    return ModelConfigV4(**config_dict)

def load_config(path: str) -> ModelConfigV4:
    """Load config from file, automatically migrating to latest version"""
    with open(path) as f:
        data = json.load(f)

    return migrate_to_latest(data)

# Save config with rich metadata
@dataclass
class ExperimentMetadata:
    """Metadata for experiment reproducibility"""
    experiment_name: str
    created_at: datetime = field(default_factory=datetime.now)
    git_commit: Optional[str] = field(default=None)
    git_branch: Optional[str] = field(default=None)
    code_version: Optional[str] = field(default=None)
    python_version: Optional[str] = field(default=None)
    environment: Dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_current_environment(cls, experiment_name: str) -> 'ExperimentMetadata':
        """Create metadata from current git state and environment"""
        import sys
        import os

        # Get git info
        git_commit = None
        git_branch = None
        try:
            git_commit = subprocess.check_output(
                ["git", "rev-parse", "HEAD"],
                stderr=subprocess.DEVNULL
            ).decode().strip()
            git_branch = subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                stderr=subprocess.DEVNULL
            ).decode().strip()
        except:
            pass

        return cls(
            experiment_name=experiment_name,
            git_commit=git_commit,
            git_branch=git_branch,
            code_version=os.getenv("CODE_VERSION"),
            python_version=sys.version,
            environment={
                "CUDA_VISIBLE_DEVICES": os.getenv("CUDA_VISIBLE_DEVICES", ""),
                "WORLD_SIZE": os.getenv("WORLD_SIZE", "1"),
            }
        )

@dataclass
class ExperimentConfig:
    """Complete experiment configuration with versioning"""
    metadata: ExperimentMetadata
    model_config: ModelConfigV4
    dataset_name: str
    seed: int = 42

    def save(self, directory: Path):
        """Save config with full metadata"""
        directory.mkdir(parents=True, exist_ok=True)

        # Convert to dict
        data = {
            "metadata": {
                "experiment_name": self.metadata.experiment_name,
                "created_at": self.metadata.created_at.isoformat(),
                "git_commit": self.metadata.git_commit,
                "git_branch": self.metadata.git_branch,
                "code_version": self.metadata.code_version,
                "python_version": self.metadata.python_version,
                "environment": self.metadata.environment,
            },
            "model_config": asdict(self.model_config),
            "dataset_name": self.dataset_name,
            "seed": self.seed,
        }

        # Save JSON
        config_path = directory / "config.json"
        with open(config_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"Saved config to {config_path}")

    @classmethod
    def load(cls, directory: Path) -> 'ExperimentConfig':
        """Load config from directory, auto-migrating if needed"""
        config_path = directory / "config.json"
        with open(config_path) as f:
            data = json.load(f)

        # Reconstruct metadata
        metadata_dict = data["metadata"]
        metadata = ExperimentMetadata(
            experiment_name=metadata_dict["experiment_name"],
            created_at=datetime.fromisoformat(metadata_dict["created_at"]),
            git_commit=metadata_dict.get("git_commit"),
            git_branch=metadata_dict.get("git_branch"),
            code_version=metadata_dict.get("code_version"),
            python_version=metadata_dict.get("python_version"),
            environment=metadata_dict.get("environment", {}),
        )

        # Load and migrate model config
        model_config = migrate_to_latest(data["model_config"])

        return cls(
            metadata=metadata,
            model_config=model_config,
            dataset_name=data["dataset_name"],
            seed=data["seed"]
        )

# Example usage: Creating configs over time
print("=== Simulating config evolution ===\n")

# 2024-01-01: Create v1 config
config_v1 = ModelConfigV1(
    learning_rate=0.001,
    batch_size=32,
    epochs=100
)
print(f"v1 config: {config_v1}\n")

# Save v1 config
v1_dict = asdict(config_v1)
with open("config_v1.json", "w") as f:
    json.dump(v1_dict, f, indent=2)

# 2024-06-01: Load old v1 config and migrate to v3
print("Loading v1 config and migrating to latest...")
loaded = load_config("config_v1.json")
print(f"Migrated to v4: {loaded}\n")

# Create new v4 config directly
config_v4 = ModelConfigV4(
    lr=0.001,
    batch_size=64,
    epochs=200,
    dropout=0.1,
    gradient_clipping=1.0,
    optimizer=OptimizerConfig(name="adamw", beta1=0.9)
)
print(f"New v4 config: {config_v4}\n")

# Save full experiment with metadata
experiment = ExperimentConfig(
    metadata=ExperimentMetadata.from_current_environment("bert_finetuning_v1"),
    model_config=config_v4,
    dataset_name="imdb",
    seed=42
)
experiment.save(Path("experiments/exp_001"))

# Load experiment later (auto-migrates if old version)
loaded_exp = ExperimentConfig.load(Path("experiments/exp_001"))
print(f"Loaded experiment: {loaded_exp.metadata.experiment_name}")
print(f"Git commit: {loaded_exp.metadata.git_commit}")
print(f"Config version: {loaded_exp.model_config.version}\n")

# Testing migrations (important!)
def test_v1_to_v4_migration():
    """Test that v1 configs can be migrated to v4"""
    v1_dict = {
        "version": "1.0.0",
        "learning_rate": 0.001,
        "batch_size": 32,
        "epochs": 100
    }

    v4_config = migrate_to_latest(v1_dict)

    assert v4_config.version == "4.0.0"
    assert v4_config.lr == 0.001  # Renamed field
    assert v4_config.batch_size == 32
    assert v4_config.dropout == 0.0  # Default from v2
    assert v4_config.optimizer.name == "adam"  # Default from v3
    assert v4_config.gradient_clipping is None  # Default from v4

    print("✓ v1->v4 migration test passed")

def test_v3_to_v4_migration():
    """Test v3 to v4 migration (breaking change in field name)"""
    v3_dict = {
        "version": "3.0.0",
        "learning_rate": 0.002,  # Old field name
        "batch_size": 64,
        "epochs": 50,
        "dropout": 0.1,
        "weight_decay": 0.01,
        "optimizer": {
            "name": "sgd",
            "beta1": 0.9,
            "beta2": 0.999,
            "epsilon": 1e-8
        }
    }

    v4_config = migrate_to_latest(v3_dict)

    assert v4_config.version == "4.0.0"
    assert v4_config.lr == 0.002  # Renamed from learning_rate
    assert v4_config.optimizer.name == "sgd"

    print("✓ v3->v4 migration test passed")

test_v1_to_v4_migration()
test_v3_to_v4_migration()

# Best practices summary
"""
Config Versioning Best Practices:

1. Version field:
   - Use semantic versioning (major.minor.patch)
   - Increment major for breaking changes (renamed/removed fields)
   - Increment minor for new fields with defaults
   - Increment patch for bug fixes

2. Migration strategy:
   - Separate dataclass per version (ModelConfigV1, V2, V3...)
   - Never modify old version classes (immutable history)
   - Write migration functions (v1->v2, v2->v3, etc.)
   - Chain migrations (v1->v2->v3->v4)
   - Test all migration paths

3. Metadata:
   - Store created_at timestamp
   - Store git_commit for code reproducibility
   - Store python_version, environment variables
   - Optional: store code_version, docker image

4. Storage:
   - Save config as JSON (human-readable)
   - Keep config with experiment results
   - Archive old configs in repo (examples/configs/v1/, v2/, etc.)

5. Breaking changes:
   - Bump major version
   - Write migration guide
   - Log warnings when loading old configs
   - Consider deprecation period

6. Documentation:
   - Changelog for each version
   - Migration guide for major versions
   - Example configs for each version
   - Version compatibility matrix

7. Testing:
   - Unit tests for each migration function
   - Integration test: load oldest config, migrate to latest
   - Roundtrip test: save -> load -> verify
   - Test with real experiment configs
"""

# Advanced: Config compatibility checker
class ConfigVersion:
    def __init__(self, version_str: str):
        parts = version_str.split(".")
        self.major = int(parts[0])
        self.minor = int(parts[1])
        self.patch = int(parts[2]) if len(parts) > 2 else 0

    def is_compatible_with(self, other: 'ConfigVersion') -> bool:
        """Check if configs are backward compatible (same major version)"""
        return self.major == other.major

    def __lt__(self, other):
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"

# Check compatibility
v1 = ConfigVersion("1.0.0")
v1_5 = ConfigVersion("1.5.0")
v2 = ConfigVersion("2.0.0")

print(f"\nv1.0.0 compatible with v1.5.0? {v1.is_compatible_with(v1_5)}")  # True
print(f"v1.5.0 compatible with v2.0.0? {v1_5.is_compatible_with(v2)}")    # False

# Cleanup
import os
os.remove("config_v1.json")
```

**In Practice**:
In production ML: (1) **Training reproducibility** - load config from 6 months ago, retrain exact same model, (2) **A/B testing** - compare models trained with different config versions, need migration to standardize, (3) **Model registry** - store config with each model version, migrate old configs when loading models, (4) **CI/CD** - automated tests ensure old experiment configs still load, (5) **Multi-team** - different teams use different config versions, migrations enable collaboration. Industry practice: semantic versioning, git commit in config, automated migration tests. Netflix, Uber, Airbnb all use versioned configs for ML reproducibility.

**Key Takeaway**: Include version field in all configs; create separate dataclass per version (V1, V2, V3); write and test migration functions; store with timestamp + git_commit for reproducibility; use semantic versioning for breaking changes; never modify old config classes.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md) for comprehensive list

## Summary

**In 3 sentences**:
- Dataclasses eliminate boilerplate code by auto-generating `__init__`, `__repr__`, and `__eq__` methods from type-annotated fields
- Use them for data-focused classes (configs, data structures, API models) but prefer regular classes when you need complex initialization logic
- The `@dataclass` decorator with `frozen=True`, `field()`, and `__post_init__` gives you fine-grained control while keeping code concise

**Key takeaway**: Dataclasses let you write 70% less code for data storage classes, allowing you to focus on ML logic instead of repetitive boilerplate—but remember to use `field(default_factory=dict)` for mutable defaults!
