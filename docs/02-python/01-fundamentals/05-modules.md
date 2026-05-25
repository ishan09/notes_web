# Modules and Packages

> **Before you start**: Can you write functions? If not, review [Functions](./04-functions.md)

## What are Modules?

A **module is a Python file containing code** (functions, classes, variables). Think of it as a toolbox - instead of carrying all your tools everywhere, you keep them organized in separate boxes and bring out what you need.

**Real-world analogy**: Modules are like library books. The library (Python ecosystem) has thousands of books (modules). You check out (import) only the books you need for your project, rather than carrying the entire library around.

## Why This Matters for AI/ML

**You'll need modules for**:
- Using ML libraries (`import numpy`, `import pandas`, `import sklearn`)
- Organizing your code into logical units
- Reusing code across multiple projects
- Collaborating with teams (share modules)

**AI/ML Context**: Every ML project imports dozens of modules - `numpy` for arrays, `pandas` for data, `sklearn` for models, `matplotlib` for visualization. Understanding imports is essential from day one. Plus, as your ML projects grow, you'll organize code into custom modules for preprocessing, model definitions, evaluation, etc.

## Importing Modules

### Basic Imports

**Import entire module**:

```python
# Import the math module
import math

# Use functions from math
result = math.sqrt(16)  # 4.0
print(math.pi)          # 3.141592653589793
```

**Import specific items**:

```python
# Import only what you need
from math import sqrt, pi

# Use directly without 'math.' prefix
result = sqrt(16)  # 4.0
print(pi)          # 3.141592653589793
```

**Import everything** (not recommended):

```python
# Import all items from module
from math import *

# Can use all functions directly
result = sqrt(16)
print(pi)

# Problem: Pollutes namespace, unclear where functions come from
```

### import vs from...import

**When to use `import module`**:
- Makes code clearer (you know where functions come from)
- Avoids name conflicts
- Common for standard library modules

```python
import random
import datetime

# Clear where each function comes from
number = random.randint(1, 10)
today = datetime.date.today()
```

**When to use `from module import item`**:
- Frequently used items
- Long module names
- Common convention for certain libraries

```python
# Common in ML code
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Shorter, cleaner
X_train, X_test = train_test_split(X, y)
```

### Aliasing with 'as'

Give modules shorter names with `as`.

```python
# Standard ML conventions
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Use short aliases
array = np.array([1, 2, 3])
df = pd.DataFrame({"col": [1, 2, 3]})
plt.plot([1, 2, 3])
```

**Why alias?**
- Shorter code: `np.array()` vs `numpy.array()`
- Industry conventions (everyone uses `np`, `pd`)
- Avoid typing long names repeatedly

**Common ML aliases**:

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
import torch
from sklearn.model_selection import train_test_split as tts
```

## Creating Your Own Modules

Any Python file (`.py`) is a module!

### Step 1: Create a module file

Create `my_utils.py`:

```python
# my_utils.py

def greet(name):
    """Greet someone."""
    return f"Hello, {name}!"

def add(a, b):
    """Add two numbers."""
    return a + b

PI = 3.14159

class Calculator:
    """Simple calculator."""
    def multiply(self, a, b):
        return a * b
```

### Step 2: Import and use it

In another file (same directory):

```python
# main.py

import my_utils

# Use functions
print(my_utils.greet("Alice"))  # "Hello, Alice!"
print(my_utils.add(3, 5))       # 8
print(my_utils.PI)              # 3.14159

# Use class
calc = my_utils.Calculator()
print(calc.multiply(4, 5))      # 20
```

Or import specific items:

```python
# main.py

from my_utils import greet, add, PI

print(greet("Bob"))   # "Hello, Bob!"
print(add(10, 20))    # 30
print(PI)             # 3.14159
```

### Module Search Path

Python searches for modules in this order:
1. Current directory
2. Directories in `PYTHONPATH` environment variable
3. Standard library directories
4. Site-packages (installed packages)

```python
# Check search path
import sys
print(sys.path)
```

## Packages and `__init__.py`

A **package is a directory containing modules** and an `__init__.py` file.

### Creating a Package

```
my_ml_project/
├── main.py
└── ml_utils/           # Package
    ├── __init__.py
    ├── preprocessing.py
    ├── models.py
    └── evaluation.py
```

**preprocessing.py**:

```python
# ml_utils/preprocessing.py

def normalize(data):
    """Normalize data to [0, 1]."""
    min_val = min(data)
    max_val = max(data)
    return [(x - min_val) / (max_val - min_val) for x in data]

def remove_outliers(data, threshold=2.0):
    """Remove statistical outliers."""
    mean = sum(data) / len(data)
    std = (sum((x - mean) ** 2 for x in data) / len(data)) ** 0.5
    return [x for x in data if abs(x - mean) <= threshold * std]
```

**models.py**:

```python
# ml_utils/models.py

def train_model(X, y):
    """Train a simple model."""
    print(f"Training on {len(X)} samples")
    # Training logic here
    return {"trained": True}

def predict(model, X):
    """Make predictions."""
    print(f"Predicting for {len(X)} samples")
    # Prediction logic here
    return [1] * len(X)
```

**evaluation.py**:

```python
# ml_utils/evaluation.py

def calculate_accuracy(predictions, labels):
    """Calculate accuracy."""
    correct = sum(p == l for p, l in zip(predictions, labels))
    return correct / len(labels)
```

**`__init__.py`** (can be empty or import key items):

```python
# ml_utils/__init__.py

# Empty file - makes ml_utils a package

# Or import key items for easier access
from .preprocessing import normalize, remove_outliers
from .models import train_model, predict
from .evaluation import calculate_accuracy

__version__ = "0.1.0"
```

### Using the Package

```python
# main.py

# Import from package
from ml_utils import normalize, train_model, calculate_accuracy

# Or import module
from ml_utils import preprocessing
data = preprocessing.normalize([1, 2, 3, 4, 5])

# Or import entire package
import ml_utils
data = ml_utils.normalize([1, 2, 3, 4, 5])
```

## The Standard Library

Python comes with tons of useful modules built-in.

**Common standard library modules**:

```python
# Math operations
import math
print(math.sqrt(16))      # 4.0
print(math.factorial(5))  # 120

# Random numbers
import random
print(random.randint(1, 10))      # Random integer
print(random.choice([1, 2, 3]))   # Random choice
random.shuffle([1, 2, 3, 4, 5])   # Shuffle list

# Date and time
import datetime
now = datetime.datetime.now()
print(now)
print(now.year, now.month, now.day)

# File paths
from pathlib import Path
home = Path.home()
files = Path(".").glob("*.py")

# JSON handling
import json
data = {"name": "Alice", "age": 30}
json_str = json.dumps(data)
parsed = json.loads(json_str)

# System and OS operations
import os
import sys
print(os.getcwd())        # Current directory
print(sys.version)        # Python version

# Collections
from collections import Counter, defaultdict
counts = Counter([1, 1, 2, 2, 2, 3])  # {1: 2, 2: 3, 3: 1}

# Itertools
from itertools import combinations, permutations
combos = list(combinations([1, 2, 3], 2))  # [(1,2), (1,3), (2,3)]
```

## `if __name__ == "__main__"`

Special pattern to run code only when file is executed directly.

```python
# my_module.py

def process_data(data):
    """Process data."""
    return [x * 2 for x in data]

# This runs only when file is executed directly
if __name__ == "__main__":
    # Test code
    test_data = [1, 2, 3, 4, 5]
    result = process_data(test_data)
    print(f"Result: {result}")
```

**Why use it?**

```python
# When imported: import my_module
# - Functions are available
# - Code under if __name__ == "__main__" does NOT run

# When executed: python my_module.py
# - Code under if __name__ == "__main__" DOES run
```

**ML use case**:

```python
# train.py

def train_model(data, labels, epochs=100):
    """Train model."""
    print(f"Training for {epochs} epochs...")
    # Training logic
    return {"accuracy": 0.95}

def evaluate_model(model, test_data):
    """Evaluate model."""
    # Evaluation logic
    return 0.93

# Run only when executed directly
if __name__ == "__main__":
    # Load data
    X_train = [...]  # Load training data
    y_train = [...]  # Load labels

    # Train
    model = train_model(X_train, y_train, epochs=50)

    # Evaluate
    accuracy = evaluate_model(model, X_test)
    print(f"Test accuracy: {accuracy}")
```

## Try It

**Exercise 1**: Import standard library modules

```python
# Test different import styles
import math
from math import sqrt, pi
import random as rnd

print(math.sqrt(16))
print(sqrt(25))
print(pi)
print(rnd.randint(1, 100))
```

**Exercise 2**: Create a simple module

Create `calculator.py`:

```python
# calculator.py

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        return "Cannot divide by zero"
    return a / b

if __name__ == "__main__":
    # Test the functions
    print(f"5 + 3 = {add(5, 3)}")
    print(f"10 - 4 = {subtract(10, 4)}")
    print(f"6 * 7 = {multiply(6, 7)}")
    print(f"20 / 4 = {divide(20, 4)}")
```

Test it:
```bash
# Run directly
python calculator.py

# Import in another file
python
>>> import calculator
>>> calculator.add(10, 20)
```

**Exercise 3**: Create a package

```
my_package/
├── __init__.py
├── math_utils.py
└── string_utils.py
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between a module and a package?
2. **Why** would you use `from module import function` vs `import module`?
3. **When** should you alias imports with 'as'?
4. **How** does Python find modules when you import them?
5. **Compare**: Python imports vs Java imports - what's different?

<details>
<summary>Click to reveal answers</summary>

1. **A module is a single Python file** (`.py`) containing code. **A package is a directory containing multiple modules** and an `__init__.py` file. Example: `math.py` is a module. `sklearn/` containing multiple `.py` files is a package. Packages organize related modules together.

2. **`import module` keeps namespace clear** - you know where functions come from (`math.sqrt()`). **`from module import function` is shorter** for frequently used items (`sqrt()` directly). Use `import module` for clarity, `from module import` for convenience with commonly used functions or long module names.

3. **Alias with `as` when**: (1) Module name is long (`import tensorflow as tf`), (2) Industry convention (`import numpy as np`), (3) Avoiding name conflicts (`import pandas as pd`), (4) Making code more readable. Don't alias unnecessarily - only when it improves clarity or follows conventions.

4. **Python searches in order**: (1) Current directory, (2) Directories in `PYTHONPATH`, (3) Standard library directories, (4) Site-packages (installed via pip). Check with `import sys; print(sys.path)`. When you `import mymodule`, Python searches each directory in `sys.path` until it finds `mymodule.py`.

5. **Python imports are simpler**: No need for fully qualified paths by default. Python: `import math` (anywhere). Java: `import java.util.Math` (full package path). Python allows importing specific items (`from math import sqrt`). Java imports entire classes. Python has dynamic imports (import anywhere). Java imports at file top. Python's `as` aliasing is cleaner than Java's verbose imports.

</details>

## Practice Exercises

**Level 1 - Understand**:

Explore different import styles:

```python
python3

# Import entire module
>>> import math
>>> print(math.sqrt(16))
>>> print(math.pi)

# Import specific items
>>> from random import randint, choice
>>> print(randint(1, 10))
>>> print(choice([1, 2, 3, 4, 5]))

# Import with alias
>>> import datetime as dt
>>> print(dt.date.today())

>>> exit()
```

**Level 2 - Apply**:

Create a data processing module.

Create `data_processor.py`:

```python
# data_processor.py

def clean_data(data):
    """Remove None values and convert to float."""
    cleaned = []
    for item in data:
        if item is not None:
            try:
                cleaned.append(float(item))
            except (ValueError, TypeError):
                pass
    return cleaned

def normalize(data):
    """Normalize to [0, 1] range."""
    if not data:
        return []
    min_val = min(data)
    max_val = max(data)
    if max_val == min_val:
        return [0.5] * len(data)
    return [(x - min_val) / (max_val - min_val) for x in data]

def get_stats(data):
    """Calculate basic statistics."""
    if not data:
        return None
    return {
        "count": len(data),
        "min": min(data),
        "max": max(data),
        "mean": sum(data) / len(data)
    }

if __name__ == "__main__":
    # Test the module
    test_data = [1, None, 2, "3", 4, None, 5]

    print("Original:", test_data)

    cleaned = clean_data(test_data)
    print("Cleaned:", cleaned)

    normalized = normalize(cleaned)
    print("Normalized:", normalized)

    stats = get_stats(cleaned)
    print("Stats:", stats)
```

Test it:
```bash
python data_processor.py
```

Use it in another file:
```python
# main.py
from data_processor import clean_data, normalize, get_stats

raw = [10, None, 20, "30", 40]
cleaned = clean_data(raw)
normalized = normalize(cleaned)
print(f"Normalized: {normalized}")
```

**Level 3 - Create**:

Build an ML utilities package:

<details>
<summary>Solution</summary>

Create structure:
```
ml_toolkit/
├── __init__.py
├── preprocessing.py
├── metrics.py
└── visualization.py
```

**preprocessing.py**:
```python
# ml_toolkit/preprocessing.py

def normalize_features(features, method="minmax"):
    """
    Normalize features.

    Args:
        features: List of lists (samples x features)
        method: 'minmax' or 'zscore'

    Returns:
        Normalized features
    """
    if not features or not features[0]:
        return features

    num_features = len(features[0])
    normalized = []

    for sample in features:
        norm_sample = []
        for i in range(num_features):
            feature_values = [s[i] for s in features if i < len(s)]

            if method == "minmax":
                min_val = min(feature_values)
                max_val = max(feature_values)
                if max_val == min_val:
                    norm_val = 0.5
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

def train_test_split(X, y, test_size=0.2, shuffle=False):
    """Split data into train and test sets."""
    if shuffle:
        # Simple shuffle (not production-ready)
        import random
        combined = list(zip(X, y))
        random.shuffle(combined)
        X, y = zip(*combined)
        X, y = list(X), list(y)

    split_idx = int(len(X) * (1 - test_size))
    return X[:split_idx], X[split_idx:], y[:split_idx], y[split_idx:]
```

**metrics.py**:
```python
# ml_toolkit/metrics.py

def accuracy(predictions, labels):
    """Calculate accuracy."""
    if len(predictions) != len(labels):
        raise ValueError("Predictions and labels must have same length")
    correct = sum(p == l for p, l in zip(predictions, labels))
    return correct / len(labels)

def confusion_matrix(predictions, labels, num_classes):
    """Calculate confusion matrix."""
    matrix = [[0] * num_classes for _ in range(num_classes)]
    for pred, label in zip(predictions, labels):
        matrix[label][pred] += 1
    return matrix

def mean_squared_error(predictions, labels):
    """Calculate MSE."""
    if len(predictions) != len(labels):
        raise ValueError("Predictions and labels must have same length")
    return sum((p - l) ** 2 for p, l in zip(predictions, labels)) / len(labels)
```

**visualization.py**:
```python
# ml_toolkit/visualization.py

def print_confusion_matrix(matrix, class_names=None):
    """Pretty print confusion matrix."""
    n = len(matrix)
    if class_names is None:
        class_names = [f"Class {i}" for i in range(n)]

    # Header
    print("\nConfusion Matrix:")
    print("=" * 50)
    print(f"{'':15}", end="")
    for name in class_names:
        print(f"{name:>10}", end="")
    print()
    print("-" * 50)

    # Rows
    for i, row in enumerate(matrix):
        print(f"{class_names[i]:15}", end="")
        for val in row:
            print(f"{val:>10}", end="")
        print()
    print("=" * 50)

def plot_metrics(metrics_history):
    """Simple text-based plot of metrics over epochs."""
    print("\nTraining Metrics:")
    print("=" * 50)
    for epoch, metrics in enumerate(metrics_history, 1):
        bar_length = int(metrics.get("accuracy", 0) * 50)
        bar = "█" * bar_length
        print(f"Epoch {epoch:3d}: {bar} {metrics.get('accuracy', 0):.3f}")
    print("=" * 50)
```

**`__init__.py`**:
```python
# ml_toolkit/__init__.py

from .preprocessing import normalize_features, train_test_split
from .metrics import accuracy, confusion_matrix, mean_squared_error
from .visualization import print_confusion_matrix, plot_metrics

__version__ = "0.1.0"
__all__ = [
    "normalize_features",
    "train_test_split",
    "accuracy",
    "confusion_matrix",
    "mean_squared_error",
    "print_confusion_matrix",
    "plot_metrics"
]
```

**Demo usage** (`demo.py`):
```python
# demo.py

from ml_toolkit import (
    normalize_features,
    train_test_split,
    accuracy,
    confusion_matrix,
    print_confusion_matrix
)

# Sample data
features = [
    [1.0, 2.0],
    [2.0, 4.0],
    [3.0, 6.0],
    [4.0, 8.0],
    [5.0, 10.0]
]
labels = [0, 0, 1, 1, 1]

print("=" * 50)
print("ML Toolkit Demo")
print("=" * 50)

# Normalize
normalized = normalize_features(features, method="minmax")
print("\n1. Normalized Features:")
for i, f in enumerate(normalized):
    print(f"   Sample {i}: {[f'{x:.2f}' for x in f]}")

# Split
X_train, X_test, y_train, y_test = train_test_split(
    normalized, labels, test_size=0.4
)
print(f"\n2. Train/Test Split:")
print(f"   Train: {len(X_train)} samples")
print(f"   Test: {len(X_test)} samples")

# Mock predictions
predictions = [0, 1]  # Mock predictions for test set

# Accuracy
acc = accuracy(predictions, y_test)
print(f"\n3. Accuracy: {acc:.2%}")

# Confusion matrix
cm = confusion_matrix(predictions, y_test, num_classes=2)
print_confusion_matrix(cm, class_names=["Class 0", "Class 1"])

print("=" * 50)
```

Run it:
```bash
python demo.py
```

</details>

## Common Mistakes

❌ **Mistake 1**: Circular imports

```python
# file1.py
import file2
def function1():
    file2.function2()

# file2.py
import file1  # Circular import!
def function2():
    file1.function1()
```

**Why it's wrong**: Files import each other, causing infinite loop or import errors.

✅ **Instead**: Restructure code or use local imports

```python
# file1.py
def function1():
    from file2 import function2  # Local import
    function2()

# Or better: refactor to avoid circular dependency
```

---

❌ **Mistake 2**: Using `from module import *`

```python
# Wrong - pollutes namespace
from math import *
from random import *

result = sqrt(16)  # Where did this come from?
```

✅ **Instead**: Import specific items or entire module

```python
# Correct - clear origin
import math
import random

result = math.sqrt(16)
number = random.randint(1, 10)
```

---

❌ **Mistake 3**: Forgetting `__init__.py` in packages

```
my_package/
├── module1.py
└── module2.py
# No __init__.py!
```

**Why it's wrong**: Python may not recognize directory as package (pre-Python 3.3) or imports may fail.

✅ **Instead**: Always include `__init__.py`

```
my_package/
├── __init__.py  # Can be empty
├── module1.py
└── module2.py
```

---

❌ **Mistake 4**: Relative imports without package context

```python
# In some_module.py
from .other_module import function  # Error if run directly
```

✅ **Instead**: Use absolute imports or run as module

```python
# Option 1: Absolute import
from my_package.other_module import function

# Option 2: Run as module
# python -m my_package.some_module
```

---

❌ **Mistake 5**: Modifying `sys.path` incorrectly

```python
# Wrong - fragile, not portable
import sys
sys.path.append("/Users/me/my_project")  # Hard-coded path
```

✅ **Instead**: Use proper package structure or relative paths

```python
# Correct - use pathlib
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent))
```

## How This Connects

**Builds on**:
- [Functions](./04-functions.md) - Modules organize functions
- [Setup](../00-setup/03-pip-poetry.md) - Install external packages to import

**Related concepts**:
- [Project Structure](../04-testing-quality/03-project-structure.md) - Organize modules properly
- [OOP Basics](../02-intermediate/01-oop-basics.md) - Classes in modules
- [Testing](../04-testing-quality/01-pytest.md) - Test your modules

**Why this matters for AI**:
- **Every ML project imports libraries**: `numpy`, `pandas`, `sklearn`, `torch`, `tensorflow`
- **Code organization**: Break large ML pipelines into modules (preprocessing, training, evaluation)
- **Reusability**: Write once, import everywhere
- **Collaboration**: Share modules with team members
- **Production**: Deploy models as importable modules

**Next steps**:
- **✅ Phase 1 Complete!** You've mastered Python fundamentals
- **Phase 2**: [OOP Basics](../02-intermediate/01-oop-basics.md) - Object-oriented programming

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does Python's import system work? What is `sys.path` and how is it populated?

<details>
<summary>Answer: Import uses sys.path to find modules; populated from PYTHONPATH, current dir, stdlib, site-packages</summary>

**Explanation**:
When you `import module`, Python's import system: (1) checks `sys.modules` cache (already imported?), (2) searches `sys.path` directories for `module.py` or `module/` package, (3) loads and executes the module, (4) caches in `sys.modules`, (5) binds to local namespace. This process is handled by the import machinery in `importlib`.

`sys.path` is a list of directory paths Python searches in order. It's populated at startup from: (1) current script's directory (or current working directory for interactive), (2) `PYTHONPATH` environment variable, (3) installation-dependent defaults (standard library location), (4) site-packages (where `pip install` puts packages). You can modify `sys.path` at runtime but it's usually a bad idea (use proper package structure instead).

The import system uses "finders" and "loaders" - finders locate modules, loaders execute them. Python 3.3+ uses `importlib` as the implementation. Packages (directories with `__init__.py`) have special handling where importing the package executes `__init__.py`.

**Example**:
```python
import sys

# View sys.path
print(sys.path)
# [
#   '/path/to/current/script',  # Script's directory
#   '/usr/lib/python3.9',       # Standard library
#   '/usr/local/lib/python3.9/site-packages',  # pip packages
#   ...
# ]

# Check if module already imported
import json
print('json' in sys.modules)  # True

# Import caches module - code runs once
import my_module  # Prints "Initializing module"
import my_module  # Doesn't print again

# How imports work internally
import importlib

# Manual import (equivalent to 'import math')
math = importlib.import_module('math')
print(math.sqrt(16))

# Add custom path (not recommended in production)
sys.path.insert(0, '/custom/path')
import custom_module  # Now finds in /custom/path

# Better: use proper package structure and PYTHONPATH
# export PYTHONPATH=/custom/path
```

**In Practice**:
For ML projects:
- **Don't modify sys.path** - use proper package structure with `setup.py` or `pyproject.toml`
- **Virtual environments** isolate site-packages per project
- **PYTHONPATH** for development: `export PYTHONPATH=/path/to/project/src`
- **Editable installs** for development: `pip install -e .` (modifies sys.path properly)
- **Check imports** in CI to ensure packages are found correctly

Structure example:
```
ml_project/
├── setup.py
├── src/
│   └── ml_project/
│       ├── __init__.py
│       ├── models/
│       └── utils/
└── tests/

# Install editable: pip install -e .
# Now 'import ml_project' works from anywhere
```

**Key Takeaway**: sys.path defines where Python searches for modules (script dir, PYTHONPATH, stdlib, site-packages); imports cache in sys.modules; use proper packaging instead of modifying sys.path.

</details>

2. What are namespace packages and when would you use them? How do they differ from regular packages?

<details>
<summary>Answer: Namespace packages lack __init__.py, allow splitting across directories/distributions; use for plugin systems</summary>

**Explanation**:
**Regular packages** require `__init__.py` and exist in a single directory. **Namespace packages** (PEP 420, Python 3.3+) have no `__init__.py` and can span multiple directories or distributions. Python treats any directory matching the package name as part of the namespace, merging them virtually.

Use namespace packages for: (1) **plugin architectures** where plugins extend a core package, (2) **company-wide namespaces** (`acme.web`, `acme.ml` as separate packages), (3) **splitting large projects** across repositories. They allow multiple teams to contribute to the same namespace independently.

Key difference: Regular packages execute `__init__.py` on import (initialization code). Namespace packages have no initialization - they're just a virtual container for subpackages. This makes them ideal for extensibility but means you can't run setup code on import.

**Example**:
```python
# Regular package structure
mypackage/
├── __init__.py  # Required
├── module1.py
└── module2.py

# Import executes __init__.py
import mypackage  # Runs __init__.py code

# Namespace package structure (no __init__.py)
mynamespace/
├── plugin1/
│   └── __init__.py
└── plugin2/
    └── __init__.py

# Can split across locations:
# /usr/local/lib/python3.9/site-packages/mynamespace/plugin1/
# /home/user/.local/lib/python3.9/site-packages/mynamespace/plugin2/

# Both accessible as:
from mynamespace import plugin1, plugin2

# Real-world example: Zope, Google's internal packages
# google.cloud, google.auth, etc. are separate packages
# but share 'google' namespace

# Plugin system example
# Core package (namespace)
myapp/
└── plugins/  # No __init__.py

# Plugin 1 (separate package)
myapp/
└── plugins/
    └── authentication/
        └── __init__.py

# Plugin 2 (separate package, different repo)
myapp/
└── plugins/
    └── database/
        └── __init__.py

# Both accessible:
from myapp.plugins import authentication, database
```

**In Practice**:
ML framework plugin systems:
```python
# Core ML framework uses namespace package
mlframework/
└── plugins/  # No __init__.py

# Community contributes plugins
# Package 1: pip install mlframework-vision
mlframework/
└── plugins/
    └── vision/
        └── __init__.py

# Package 2: pip install mlframework-nlp
mlframework/
└── plugins/
    └── nlp/
        └── __init__.py

# Users install what they need
# pip install mlframework mlframework-vision
# from mlframework.plugins import vision
# model = vision.ImageClassifier()

# Discovery pattern
import pkgutil
import mlframework.plugins

# Discover all plugins
for importer, modname, ispkg in pkgutil.iter_modules(mlframework.plugins.__path__):
    print(f"Found plugin: {modname}")
```

Most projects use regular packages. Use namespace packages only for true multi-distribution extensibility scenarios.

**Key Takeaway**: Namespace packages (no __init__.py) allow splitting across directories/distributions for plugin systems; regular packages (with __init__.py) are for single-location code with initialization.

</details>

3. What happens when you import a module twice? Is code executed again?

<details>
<summary>Answer: Module cached in sys.modules; code executes only once; use importlib.reload() to re-execute</summary>

**Explanation**:
When you first `import module`, Python executes the module code and caches the module object in `sys.modules` dict (key = module name). On subsequent imports, Python returns the cached object from `sys.modules` without re-executing code. This ensures module-level code (function defs, class defs, global variables) runs only once.

This caching is critical for: (1) **performance** - parsing and executing modules is expensive, (2) **singleton behavior** - module-level objects are singletons, (3) **circular imports** - allows modules to reference each other. Module state persists across imports - globals set in one import are visible in later imports.

To force re-execution (rare, mainly for development), use `importlib.reload(module)`. This re-executes the module code but doesn't affect existing references to old objects. Only the module object in `sys.modules` is updated.

**Example**:
```python
# my_module.py
print("Module is being imported!")
counter = 0

def increment():
    global counter
    counter += 1
    return counter

# First import
import my_module
# Output: "Module is being imported!"
print(my_module.counter)  # 0
my_module.increment()
print(my_module.counter)  # 1

# Second import - NO output, uses cache
import my_module
print(my_module.counter)  # Still 1 (same object)

# Check cache
import sys
print('my_module' in sys.modules)  # True

# Module is singleton
import my_module as m1
import my_module as m2
print(m1 is m2)  # True - same object

# Force reload (rare, usually in dev/debugging)
import importlib
importlib.reload(my_module)
# Output: "Module is being imported!" (re-executed)
print(my_module.counter)  # 0 (reset)

# But old references aren't updated!
old_func = my_module.increment
importlib.reload(my_module)
old_func()  # Calls OLD version
my_module.increment()  # Calls NEW version
```

**In Practice**:
Implications for ML code:
- **Configuration modules**: Load config once, shared everywhere
```python
# config.py
MODEL_PATH = "/path/to/model"
BATCH_SIZE = 32

# train.py and inference.py both import
import config
# Both see same config object
```

- **Model caching**: Load expensive models once
```python
# model_loader.py
_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading model (expensive)...")
        _model = load_model()  # Only happens once
    return _model

# Multiple imports reuse same model instance
from model_loader import get_model
model = get_model()  # Loads once
```

- **Jupyter notebooks**: Use `%load_ext autoreload` + `%autoreload 2` to auto-reload modules during development
- **Testing**: Avoid reload in tests - reset state explicitly or use fixtures

**Key Takeaway**: Modules execute once on first import, cached in sys.modules; subsequent imports return cached object; module globals persist (singleton pattern); reload() forces re-execution but is rare.

</details>

4. What's the difference between `import module` and `importlib.import_module()`?

<details>
<summary>Answer: import is statement (compile-time); importlib.import_module() is function (runtime); use importlib for dynamic imports</summary>

**Explanation**:
`import module` is a **statement** processed at compile time - module name must be hardcoded, and it binds the module to a variable in local scope. `importlib.import_module('module')` is a **function** called at runtime - module name can be a string variable, useful for dynamic imports, plugins, or importing from user input.

Key differences: (1) **Dynamic name**: `importlib` accepts string variables, `import` requires literals, (2) **Binding**: `import` binds to variable automatically, `importlib` returns module object you assign manually, (3) **Relative imports**: `import` uses `.` syntax, `importlib` uses `package` parameter, (4) **Use cases**: `import` for static dependencies, `importlib` for dynamic loading.

Both use the same underlying import machinery (`importlib` is the implementation). `import` is syntactic sugar that compiles to `importlib` calls. Use `import` for normal code (clearer, linters understand it). Use `importlib` for plugins, dynamic loading, or metaprogramming.

**Example**:
```python
# Static import (normal)
import math
from collections import Counter

# Dynamic import with importlib
import importlib

module_name = "math"  # Could be from config, user input, etc.
math_dynamic = importlib.import_module(module_name)
print(math_dynamic.sqrt(16))  # Same as math.sqrt(16)

# Import from variable
modules_to_load = ["json", "os", "sys"]
loaded = {}
for name in modules_to_load:
    loaded[name] = importlib.import_module(name)

print(loaded["json"].dumps({"key": "value"}))

# Relative imports
# import: from .utils import helper
# importlib equivalent:
helper = importlib.import_module('.utils', package='mypackage')

# Plugin system - dynamic loading
def load_plugin(plugin_name):
    """Load plugin by name from config"""
    plugin_module = importlib.import_module(f'plugins.{plugin_name}')
    return plugin_module.Plugin()  # Instantiate plugin class

# Load from config
config = {"plugin": "authentication"}
plugin = load_plugin(config["plugin"])

# Can't do this with import:
# import f"plugins.{config['plugin']}"  # SyntaxError!

# Import from path (advanced)
import importlib.util
spec = importlib.util.spec_from_file_location("module.name", "/path/to/file.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
```

**In Practice**:
ML use cases for `importlib`:
```python
# Load model architecture from config
def load_model_class(config):
    """Load model class dynamically"""
    module_path = config["model_module"]  # e.g., "models.resnet"
    class_name = config["model_class"]    # e.g., "ResNet50"

    module = importlib.import_module(module_path)
    model_class = getattr(module, class_name)
    return model_class()

# Plugin-based preprocessing
def load_preprocessor(name):
    """Load preprocessor from plugins directory"""
    try:
        module = importlib.import_module(f'preprocessors.{name}')
        return module.Preprocessor()
    except ImportError:
        raise ValueError(f"Unknown preprocessor: {name}")

# Lazy loading for heavy dependencies
class ModelWrapper:
    def __init__(self):
        self._torch = None

    @property
    def torch(self):
        if self._torch is None:
            self._torch = importlib.import_module('torch')
        return self._torch

    def predict(self, x):
        return self.torch.sigmoid(x)  # Only loads torch when used
```

Use `import` for static dependencies, `importlib.import_module()` for dynamic/configurable loading.

**Key Takeaway**: import is compile-time statement (static names); importlib.import_module() is runtime function (dynamic strings); use importlib for plugins, config-driven loading, and metaprogramming.

</details>

5. How do relative imports work? When do `.` and `..` work vs fail?

<details>
<summary>Answer: . = current package, .. = parent; work in packages, fail in __main__; use absolute imports for scripts</summary>

**Explanation**:
Relative imports use `.` (current package) and `..` (parent package) notation. They only work when: (1) the importing module is part of a **package** (not a standalone script), (2) the module is not being run as `__main__` (not `python script.py`), (3) `__package__` attribute is set correctly. They fail when running scripts directly because Python can't determine package structure.

**How it works**: Python uses `__package__` to resolve relative imports. `.module` means "import from my package", `..module` means "import from parent package". Running a script directly sets `__package__ = None`, breaking relative imports. Running as module (`python -m package.script`) sets `__package__` correctly.

Use **absolute imports** for scripts, runnable modules, and clarity. Use **relative imports** for internal package structure (keeps package self-contained, easier to rename). Many style guides prefer absolute imports for explicitness.

**Example**:
```python
# Package structure
myproject/
├── __init__.py
├── main.py
├── utils/
│   ├── __init__.py
│   ├── helpers.py
│   └── validators.py
└── models/
    ├── __init__.py
    └── classifier.py

# In models/classifier.py:
# Absolute import (always works)
from myproject.utils.helpers import preprocess

# Relative import (works in package)
from ..utils.helpers import preprocess  # .. = parent (myproject)
from ..utils import validators          # Import module
from . import __init__                  # . = current package

# In utils/helpers.py:
from .validators import validate  # . = same package (utils)

# This WORKS - run as module
# python -m myproject.models.classifier
# __package__ = 'myproject.models'

# This FAILS - run as script
# python myproject/models/classifier.py
# __package__ = None
# ImportError: attempted relative import with no known parent package

# Fix for scripts: use absolute imports
# In main.py (entry point):
from myproject.utils import helpers  # Absolute - works when run directly
from myproject.models import classifier

if __name__ == "__main__":
    # This works: python main.py
    data = helpers.preprocess(raw_data)
```

**In Practice**:
ML project import strategies:
```python
# Project structure
ml_project/
├── setup.py
├── src/
│   └── ml_project/
│       ├── __init__.py
│       ├── train.py          # Entry point
│       ├── preprocessing/
│       │   ├── __init__.py
│       │   └── clean.py
│       └── models/
│           ├── __init__.py
│           └── neural_net.py

# In preprocessing/clean.py:
# Option 1: Absolute (preferred for clarity)
from ml_project.models import neural_net

# Option 2: Relative (good for internal package structure)
from ..models import neural_net

# In train.py (entry point):
# Always use absolute imports
from ml_project.preprocessing.clean import clean_data
from ml_project.models.neural_net import NeuralNet

# Run correctly:
# pip install -e .  # Editable install
# python -m ml_project.train  # Run as module
# Or: python src/ml_project/train.py (works with absolute imports)

# Hybrid approach (recommended):
# - Use absolute imports for cross-package references
# - Use relative imports for within-package references
# - Always use absolute in entry points
```

**Key Takeaway**: Relative imports (., ..) work in packages not run as __main__; use `python -m package.module` or absolute imports; prefer absolute for entry points and clarity.

</details>

6. What is the `__pycache__` directory and `.pyc` files?

<details>
<summary>Answer: __pycache__ stores compiled bytecode (.pyc); speeds up imports; safe to delete (regenerates); add to .gitignore</summary>

**Explanation**:
When Python imports a module, it compiles `.py` source to bytecode (`.pyc`) and caches it in `__pycache__/` directory. Bytecode is platform-independent, lower-level than source but higher-level than machine code. Next import checks if `.pyc` is up-to-date (source timestamp) and uses it, skipping parsing/compilation.

`.pyc` files are named `module.cpython-39.pyc` (includes Python version). This speeds up imports ~10-20% (more for large modules). The first import after code changes recompiles; subsequent imports are fast. Only imported modules get `.pyc` files - the script you run directly doesn't.

These files are safe to delete (regenerate automatically), should be in `.gitignore`, and are created automatically. You can disable with `python -B` or `PYTHONDONTWRITEBYTECODE=1` environment variable. In production, `.pyc` files speed up cold starts.

**Example**:
```python
# Project structure before first run
myproject/
├── main.py
└── utils.py

# After running: python main.py
myproject/
├── main.py           # No .pyc (run directly)
├── utils.py
└── __pycache__/
    └── utils.cpython-39.pyc  # Compiled bytecode

# .pyc filename format
# module_name.cpython-{version}.pyc
# utils.cpython-39.pyc = Python 3.9
# utils.cpython-311.pyc = Python 3.11

# View bytecode (disassemble)
import dis
import utils

dis.dis(utils.some_function)
# Shows bytecode instructions (LOAD_FAST, CALL_FUNCTION, etc.)

# Disable .pyc generation
# Option 1: Command line
# python -B main.py

# Option 2: Environment variable
# export PYTHONDONTWRITEBYTECODE=1
# python main.py

# Option 3: In code (affects subprocesses)
import sys
sys.dont_write_bytecode = True

# Force recompilation (rare)
import py_compile
py_compile.compile('utils.py')

# Or use compileall for whole directory
import compileall
compileall.compile_dir('myproject', force=True)
```

**In Practice**:
Managing `.pyc` files in ML projects:
```python
# .gitignore (always include)
__pycache__/
*.pyc
*.pyo
*.pyd

# Clean cache (Makefile or script)
# find . -type d -name __pycache__ -exec rm -rf {} +
# find . -type f -name "*.pyc" -delete

# Docker builds - keep .pyc for faster startup
# Stage 1: Install dependencies
FROM python:3.9 AS builder
COPY requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Copy code and precompile
FROM python:3.9
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY . /app
WORKDIR /app
RUN python -m compileall .  # Precompile for faster startup
CMD ["python", "-u", "train.py"]

# Development - delete when switching Python versions
# rm -rf **/__pycache__

# CI/CD - don't commit .pyc
# pytest runs with -B flag often
# pytest -B tests/
```

Benefits: (1) faster imports (10-20%), (2) smaller Docker layers if precompiled, (3) no source needed for distribution. Drawbacks: (1) clutter in git (use .gitignore), (2) version-specific (3.9 .pyc won't work in 3.11), (3) stale files if source deleted.

**Key Takeaway**: __pycache__ stores compiled .pyc bytecode for faster imports; safe to delete (auto-regenerates); add to .gitignore; precompile in production for cold-start speed.

</details>

**Production Scenarios**:

1. How do you structure ML projects with multiple modules for training, inference, and evaluation?

<details>
<summary>Answer: Separate concerns into modules; use src layout; entry points in scripts; shared utils; config-driven</summary>

**Explanation**:
Best practice ML project structure separates concerns: (1) **data** - loading, preprocessing, augmentation, (2) **models** - architecture definitions, (3) **training** - training loops, optimization, (4) **evaluation** - metrics, visualization, (5) **inference** - prediction API/service, (6) **utils** - shared helpers, (7) **config** - hyperparameters, paths. Use "src layout" to avoid import issues.

Entry points (main scripts) go in root or `scripts/` directory. Core logic goes in `src/package_name/` as importable modules. This allows: (1) `pip install -e .` for development, (2) importing from anywhere, (3) clean separation of runnable vs library code, (4) easier testing (import modules without running entry points).

Keep training and inference separate - training is heavy (GPU, large batches), inference is light (CPU, single samples). Shared code (preprocessing, model architecture) goes in common modules both import.

**Example**:
```python
# Recommended ML project structure
ml_project/
├── README.md
├── setup.py / pyproject.toml
├── requirements.txt
├── .gitignore
├── data/                      # Data files (not in git)
│   ├── raw/
│   ├── processed/
│   └── models/               # Saved models
├── notebooks/                # Jupyter notebooks for exploration
│   └── eda.ipynb
├── scripts/                  # Entry points
│   ├── train.py             # Training script
│   ├── evaluate.py          # Evaluation script
│   └── predict.py           # Inference script
├── src/
│   └── ml_project/          # Main package
│       ├── __init__.py
│       ├── config.py        # Configuration
│       ├── data/            # Data handling
│       │   ├── __init__.py
│       │   ├── loader.py    # Data loading
│       │   └── preprocessor.py
│       ├── models/          # Model definitions
│       │   ├── __init__.py
│       │   ├── base.py      # Base model class
│       │   └── neural_net.py
│       ├── training/        # Training logic
│       │   ├── __init__.py
│       │   ├── trainer.py
│       │   └── callbacks.py
│       ├── evaluation/      # Evaluation logic
│       │   ├── __init__.py
│       │   └── metrics.py
│       ├── inference/       # Inference logic
│       │   ├── __init__.py
│       │   └── predictor.py
│       └── utils/           # Shared utilities
│           ├── __init__.py
│           ├── logging.py
│           └── visualization.py
└── tests/                   # Tests mirror src structure
    ├── test_data/
    ├── test_models/
    └── test_training/

# setup.py for installation
from setuptools import setup, find_packages

setup(
    name="ml_project",
    version="0.1.0",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "numpy>=1.20.0",
        "pandas>=1.3.0",
        "scikit-learn>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "ml-train=ml_project.scripts.train:main",
            "ml-predict=ml_project.scripts.predict:main",
        ],
    },
)

# Install: pip install -e .
# Now can import from anywhere: from ml_project.models import NeuralNet
```

**In Practice**:
Module organization patterns:
```python
# scripts/train.py (entry point)
from ml_project.config import config
from ml_project.data import loader, preprocessor
from ml_project.models import NeuralNet
from ml_project.training import Trainer
from ml_project.utils import logging

def main():
    logger = logging.get_logger("train")
    logger.info("Starting training")

    # Load data
    train_data = loader.load_training_data(config.data_path)
    train_data = preprocessor.preprocess(train_data)

    # Initialize model
    model = NeuralNet(config.model_config)

    # Train
    trainer = Trainer(model, config.training_config)
    trainer.fit(train_data)

    # Save
    model.save(config.model_output_path)

if __name__ == "__main__":
    main()

# scripts/predict.py (separate entry point)
from ml_project.config import config
from ml_project.data import preprocessor
from ml_project.inference import Predictor

def main():
    predictor = Predictor.load(config.model_path)

    # Single prediction (different from training batch processing)
    raw_input = {"feature1": 10, "feature2": 20}
    processed = preprocessor.preprocess_single(raw_input)
    prediction = predictor.predict(processed)

    print(f"Prediction: {prediction}")

if __name__ == "__main__":
    main()

# Shared code in src/ml_project/data/preprocessor.py
def preprocess(data):
    """Batch preprocessing for training"""
    # Vectorized operations for large datasets
    pass

def preprocess_single(sample):
    """Single sample preprocessing for inference"""
    # Optimized for low latency
    pass
```

This structure enables: development (`pip install -e .`), testing (import modules), deployment (pip install from git), collaboration (clear boundaries).

**Key Takeaway**: Use src layout with separate modules for data/models/training/inference; entry points in scripts/; install editable (`pip install -e .`); separate training (batch) from inference (single-sample) code.

</details>

2. What are circular import issues and how do you resolve them in large codebases?

<details>
<summary>Answer: Circular imports = mutual dependency; resolve with import order, refactoring, or local imports; prevent with layered architecture</summary>

**Explanation**:
Circular imports occur when module A imports B, and B imports A. Python partially initializes the first module before importing the second, causing `AttributeError` or `ImportError` when the second tries to use items from the first (not yet defined). This happens because modules execute top-to-bottom, and circular dependencies create a deadlock.

Resolution strategies: (1) **Refactor** - extract common code to third module, (2) **Import reordering** - import at module level only what's needed immediately, (3) **Local imports** - move imports inside functions (delays until call time), (4) **Type hints with strings** - use `"ClassName"` in annotations (PEP 563), (5) **Redesign** - fix architecture (dependency inversion, interfaces).

Prevention: Follow layered architecture - higher layers import lower layers, never reverse. Data → Models → Training → Inference. Use dependency injection and abstract interfaces.

**Example**:
```python
# Problem: Circular import
# models.py
from training import Trainer  # Import training

class Model:
    def train(self):
        trainer = Trainer(self)  # Uses Trainer
        trainer.fit()

# training.py
from models import Model  # Import models - CIRCULAR!

class Trainer:
    def __init__(self, model: Model):  # Uses Model
        self.model = model

# Error when importing either:
# import models  # Error: can't import Trainer (not yet defined)

# Solution 1: Refactor - extract interface
# interfaces.py
class ModelInterface:
    def train(self): pass

# models.py
from interfaces import ModelInterface

class Model(ModelInterface):
    def train(self):
        from training import Trainer  # Local import
        trainer = Trainer(self)
        trainer.fit()

# training.py
from interfaces import ModelInterface

class Trainer:
    def __init__(self, model: ModelInterface):
        self.model = model

# Solution 2: Type hints with strings (TYPE_CHECKING)
# models.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from training import Trainer  # Only for type checkers

class Model:
    def train(self):
        from training import Trainer  # Runtime import
        trainer = Trainer(self)

# training.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models import Model

class Trainer:
    def __init__(self, model: "Model"):  # String annotation
        self.model = model

# Solution 3: Dependency injection
# models.py
class Model:
    def train(self, trainer):  # Pass trainer as argument
        trainer.fit(self)

# training.py
class Trainer:
    def fit(self, model):
        pass

# main.py
from models import Model
from training import Trainer

model = Model()
trainer = Trainer()
model.train(trainer)  # Inject dependency
```

**In Practice**:
ML project architecture to avoid circular imports:
```python
# Layered architecture (no circles)
# Layer 1: Data (no dependencies)
data/
├── loader.py
└── preprocessor.py

# Layer 2: Models (depends on data)
models/
├── base_model.py
from data import preprocessor  # OK: lower layer

# Layer 3: Training (depends on models, data)
training/
├── trainer.py
from models import BaseModel  # OK: lower layer
from data import loader        # OK: lower layer

# Layer 4: Inference (depends on models, data)
inference/
├── predictor.py
from models import BaseModel  # OK: lower layer

# Anti-pattern: Model knowing about Trainer
# models/neural_net.py
class NeuralNet:
    def train(self):
        from training import Trainer  # BAD: upper layer

# Better: Trainer knows about Model
# training/trainer.py
class Trainer:
    def __init__(self, model):
        self.model = model

    def train(self):
        # Training logic
        pass

# Usage
from models import NeuralNet
from training import Trainer

model = NeuralNet()
trainer = Trainer(model)
trainer.train()

# Use Abstract Base Classes for dependencies
from abc import ABC, abstractmethod

class ModelInterface(ABC):
    @abstractmethod
    def forward(self, x): pass

class Trainer:
    def __init__(self, model: ModelInterface):
        self.model = model

class NeuralNet(ModelInterface):
    def forward(self, x):
        return x  # Implementation
```

**Key Takeaway**: Circular imports = mutual dependency causing AttributeError; resolve with refactoring (extract common code), local imports, or type hints; prevent with layered architecture (dependencies flow one direction).

</details>

3. How do you handle configuration across modules (avoid global state)?

<details>
<summary>Answer: Use config objects/dataclasses passed as params; environment variables; config files; dependency injection; avoid global mutable state</summary>

**Explanation**:
Avoid global mutable configuration (hard to test, thread-unsafe, implicit dependencies). Instead: (1) **Config objects** - create config instances passed to functions/classes, (2) **Dataclasses** - typed config with defaults, (3) **Environment variables** - 12-factor app principle, (4) **Config files** - YAML/JSON/TOML loaded at startup, (5) **Dependency injection** - pass config as parameter. This makes dependencies explicit, testable, and safe for concurrent execution.

For read-only config (hyperparameters), module-level constants are OK if immutable. For runtime config (paths, credentials), use passed objects. Never modify global config at runtime - creates hard-to-debug state.

Tools: `pydantic` for validation, `python-dotenv` for `.env` files, `hydra` for complex hierarchical config, `argparse`/`click` for CLI.

**Example**:
```python
# BAD: Global mutable state
# config.py
LEARNING_RATE = 0.001
BATCH_SIZE = 32

# training.py
import config

def train():
    config.LEARNING_RATE = 0.01  # MUTATION! Hard to track
    # ... training code ...

# GOOD: Config object passed as parameter
# config.py
from dataclasses import dataclass

@dataclass
class TrainingConfig:
    learning_rate: float = 0.001
    batch_size: int = 32
    epochs: int = 100

@dataclass
class ModelConfig:
    hidden_size: int = 128
    num_layers: int = 3

@dataclass
class Config:
    training: TrainingConfig
    model: ModelConfig
    data_path: str

# Load from environment and files
import os
from pathlib import Path
import yaml

def load_config() -> Config:
    # Load from file
    config_path = os.getenv("CONFIG_PATH", "config.yaml")
    with open(config_path) as f:
        config_dict = yaml.safe_load(f)

    # Override with environment variables
    config_dict["data_path"] = os.getenv("DATA_PATH", config_dict["data_path"])

    return Config(
        training=TrainingConfig(**config_dict["training"]),
        model=ModelConfig(**config_dict["model"]),
        data_path=config_dict["data_path"]
    )

# training.py
def train(config: TrainingConfig, model_config: ModelConfig):
    """Config passed explicitly"""
    print(f"Training with LR={config.learning_rate}")
    # No global state!

# main.py
def main():
    config = load_config()
    train(config.training, config.model)

if __name__ == "__main__":
    main()

# Using pydantic for validation
from pydantic import BaseModel, validator

class TrainingConfig(BaseModel):
    learning_rate: float
    batch_size: int
    epochs: int

    @validator("learning_rate")
    def validate_lr(cls, v):
        if v <= 0 or v >= 1:
            raise ValueError("Learning rate must be (0, 1)")
        return v

# Environment variables with python-dotenv
# .env file
# LEARNING_RATE=0.001
# BATCH_SIZE=32
# MODEL_PATH=/path/to/model

# Load in code
from dotenv import load_dotenv

load_dotenv()
config = TrainingConfig(
    learning_rate=float(os.getenv("LEARNING_RATE")),
    batch_size=int(os.getenv("BATCH_SIZE")),
    epochs=100
)
```

**In Practice**:
Production ML config patterns:
```python
# Hierarchical config with Hydra
# config.yaml
model:
  hidden_size: 128
  dropout: 0.1

training:
  learning_rate: 0.001
  batch_size: 32

data:
  path: /data
  split: 0.8

# train.py
import hydra
from omegaconf import DictConfig

@hydra.main(config_path=".", config_name="config")
def train(cfg: DictConfig):
    model = create_model(cfg.model)
    trainer = Trainer(cfg.training)
    data = load_data(cfg.data)
    trainer.fit(model, data)

if __name__ == "__main__":
    train()

# Override from command line
# python train.py training.learning_rate=0.01

# Testing with custom config
def test_training():
    test_config = TrainingConfig(
        learning_rate=0.1,
        batch_size=4,
        epochs=1  # Fast test
    )
    result = train(test_config)
    assert result is not None

# Factory pattern for different configs
def create_config(env: str) -> Config:
    if env == "development":
        return Config(
            training=TrainingConfig(epochs=10),  # Fast
            data_path="/data/sample"
        )
    elif env == "production":
        return Config(
            training=TrainingConfig(epochs=100),
            data_path="/data/full"
        )

config = create_config(os.getenv("ENV", "development"))
```

**Key Takeaway**: Pass config as objects/dataclasses (explicit dependencies); load from files/env vars; use pydantic for validation; avoid global mutable state (testing nightmare); dependency injection over imports.

</details>

4. What's the best practice for organizing ML model definitions as modules?

<details>
<summary>Answer: Base class in base.py; specific models in separate files; factory pattern; registry for dynamic loading; config-driven instantiation</summary>

**Explanation**:
Organize models with: (1) **Base class** - common interface, save/load logic, (2) **Specific models** - one file per architecture (resnet.py, transformer.py), (3) **Factory function** - create models from config, (4) **Model registry** - map names to classes for dynamic instantiation, (5) **Separate architecture from weights** - architecture definition vs trained model file.

Benefits: (1) easy to add models (new file), (2) config-driven model selection, (3) clear separation of concerns, (4) testable in isolation, (5) reusable across train/inference.

Structure models as classes with standard interface: `__init__()`, `forward()`, `save()`, `load()`. Training code shouldn't know specific architectures - use factory pattern.

**Example**:
```python
# models/__init__.py - Registry pattern
_MODEL_REGISTRY = {}

def register_model(name):
    """Decorator to register models"""
    def decorator(cls):
        _MODEL_REGISTRY[name] = cls
        return cls
    return decorator

def create_model(name, **kwargs):
    """Factory function"""
    if name not in _MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {name}")
    return _MODEL_REGISTRY[name](**kwargs)

# models/base.py - Base class
from abc import ABC, abstractmethod
import pickle

class BaseModel(ABC):
    """Base class for all models"""

    @abstractmethod
    def forward(self, x):
        """Forward pass"""
        pass

    def save(self, path):
        """Save model"""
        with open(path, 'wb') as f:
            pickle.dump(self, f)

    @classmethod
    def load(cls, path):
        """Load model"""
        with open(path, 'rb') as f:
            return pickle.load(f)

    def predict(self, x):
        """Inference (can be overridden)"""
        return self.forward(x)

# models/linear.py - Specific model
from . import register_model
from .base import BaseModel

@register_model("linear")
class LinearModel(BaseModel):
    def __init__(self, input_size, output_size):
        self.weights = np.random.randn(input_size, output_size)
        self.bias = np.zeros(output_size)

    def forward(self, x):
        return x @ self.weights + self.bias

# models/neural_net.py - Another model
@register_model("neural_net")
class NeuralNet(BaseModel):
    def __init__(self, hidden_sizes, activation='relu'):
        self.hidden_sizes = hidden_sizes
        self.activation = activation
        # Initialize layers...

    def forward(self, x):
        # Neural net forward pass
        pass

# models/resnet.py - Complex architecture
@register_model("resnet50")
class ResNet50(BaseModel):
    def __init__(self, num_classes=1000):
        self.num_classes = num_classes
        # Build ResNet architecture...

    def forward(self, x):
        # ResNet forward
        pass

# Usage - config-driven
from models import create_model

# Load from config
config = {
    "model_type": "neural_net",
    "model_params": {
        "hidden_sizes": [128, 64, 32],
        "activation": "relu"
    }
}

model = create_model(
    config["model_type"],
    **config["model_params"]
)

# Training code doesn't know specific model
def train(model: BaseModel, data):
    for batch in data:
        output = model.forward(batch)
        # Training logic...

# Easy to add new models
@register_model("transformer")
class Transformer(BaseModel):
    def __init__(self, d_model, num_heads):
        # Transformer init...
        pass

    def forward(self, x):
        # Transformer forward...
        pass

# List available models
from models import _MODEL_REGISTRY
print(_MODEL_REGISTRY.keys())  # dict_keys(['linear', 'neural_net', 'resnet50', 'transformer'])
```

**In Practice**:
Production model organization:
```python
# models/
# ├── __init__.py          # Registry
# ├── base.py              # Base class
# ├── vision/
# │   ├── resnet.py
# │   ├── vgg.py
# │   └── efficientnet.py
# ├── nlp/
# │   ├── transformer.py
# │   ├── bert.py
# │   └── gpt.py
# └── custom/
#     └── my_model.py

# Advanced registry with metadata
from typing import Dict, Type
from dataclasses import dataclass

@dataclass
class ModelInfo:
    model_class: Type[BaseModel]
    description: str
    default_params: Dict

class ModelRegistry:
    _registry: Dict[str, ModelInfo] = {}

    @classmethod
    def register(cls, name, description="", default_params=None):
        def decorator(model_class):
            cls._registry[name] = ModelInfo(
                model_class=model_class,
                description=description,
                default_params=default_params or {}
            )
            return model_class
        return decorator

    @classmethod
    def create(cls, name, **overrides):
        info = cls._registry[name]
        params = {**info.default_params, **overrides}
        return info.model_class(**params)

# Usage
@ModelRegistry.register(
    "resnet50",
    description="ResNet-50 architecture",
    default_params={"num_classes": 1000, "pretrained": False}
)
class ResNet50(BaseModel):
    pass

# Create with defaults
model = ModelRegistry.create("resnet50")

# Override params
model = ModelRegistry.create("resnet50", num_classes=10, pretrained=True)

# Integration with training
def train_from_config(config_path):
    config = load_config(config_path)
    model = ModelRegistry.create(
        config["model"]["type"],
        **config["model"]["params"]
    )
    trainer = Trainer(model, config["training"])
    trainer.fit()
```

**Key Takeaway**: Use base class for common interface; separate files per architecture; registry pattern for dynamic loading; factory function for config-driven instantiation; training code agnostic to specific models.

</details>

5. How do you make your ML code installable as a package (`pip install -e .`)?

<details>
<summary>Answer: Create setup.py/pyproject.toml; use src layout; specify dependencies; entry points for CLI; pip install -e for editable dev install</summary>

**Explanation**:
Making code installable as a package: (1) **setup.py** or **pyproject.toml** - package metadata and dependencies, (2) **src layout** - code in `src/package_name/`, (3) **dependencies** - runtime and dev requirements, (4) **entry points** - CLI commands, (5) **pip install -e .** - editable install (changes reflect immediately).

Benefits: (1) import from anywhere, (2) version management, (3) distribution (PyPI, git), (4) dependency resolution, (5) professional structure. Editable install (`-e`) links source directory - edit code without reinstalling.

Modern approach: `pyproject.toml` (PEP 518) with build backends (setuptools, poetry, flit). Legacy: `setup.py`. Use `setup.cfg` for configuration, `setup.py` minimal shim.

**Example**:
```python
# Project structure
ml_project/
├── pyproject.toml       # Modern (preferred)
├── setup.py             # Legacy
├── setup.cfg            # Configuration
├── README.md
├── LICENSE
├── requirements.txt     # Optional (or in setup.py)
├── src/
│   └── ml_project/
│       ├── __init__.py
│       ├── models/
│       ├── training/
│       └── cli.py       # Command-line interface
└── tests/

# pyproject.toml (modern approach)
[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm"]
build-backend = "setuptools.build_meta"

[project]
name = "ml-project"
version = "0.1.0"
description = "ML project for image classification"
readme = "README.md"
requires-python = ">=3.9"
authors = [
    {name = "Your Name", email = "you@example.com"}
]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3.9",
]
dependencies = [
    "numpy>=1.20.0",
    "pandas>=1.3.0",
    "scikit-learn>=1.0.0",
    "torch>=1.10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=22.0.0",
    "flake8>=4.0.0",
    "mypy>=0.950",
]

[project.scripts]
ml-train = "ml_project.cli:train"
ml-predict = "ml_project.cli:predict"
ml-evaluate = "ml_project.cli:evaluate"

[tool.setuptools.packages.find]
where = ["src"]

# setup.py (minimal shim for editable installs with older pip)
from setuptools import setup

setup()

# Or full setup.py (legacy)
from setuptools import setup, find_packages

setup(
    name="ml-project",
    version="0.1.0",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "numpy>=1.20.0",
        "pandas>=1.3.0",
    ],
    extras_require={
        "dev": ["pytest", "black"],
    },
    entry_points={
        "console_scripts": [
            "ml-train=ml_project.cli:train",
        ],
    },
    python_requires=">=3.9",
)

# src/ml_project/__init__.py
"""ML Project package"""
__version__ = "0.1.0"

from .models import create_model
from .training import Trainer

__all__ = ["create_model", "Trainer", "__version__"]

# src/ml_project/cli.py - Entry points
import argparse
from .training import Trainer
from .models import create_model

def train():
    """CLI entry point for training"""
    parser = argparse.ArgumentParser(description="Train ML model")
    parser.add_argument("--config", required=True)
    parser.add_argument("--output", default="model.pkl")
    args = parser.parse_args()

    # Training logic
    model = create_model("neural_net")
    trainer = Trainer(model)
    trainer.fit()
    model.save(args.output)

def predict():
    """CLI entry point for prediction"""
    parser = argparse.ArgumentParser(description="Make predictions")
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", required=True)
    args = parser.parse_args()

    # Prediction logic
    pass

# Install
# Development (editable):
# pip install -e .
# pip install -e ".[dev]"  # With dev dependencies

# Production:
# pip install git+https://github.com/user/ml-project.git
# pip install .

# After install:
# ml-train --config config.yaml
# ml-predict --model model.pkl --input data.csv
# python -c "from ml_project import create_model; print(create_model)"
```

**In Practice**:
Complete installable ML package:
```python
# Directory structure
ml_classifier/
├── pyproject.toml
├── README.md
├── LICENSE
├── .gitignore
├── src/
│   └── ml_classifier/
│       ├── __init__.py
│       ├── __version__.py
│       ├── models/
│       ├── data/
│       ├── training/
│       └── cli/
│           ├── __init__.py
│           ├── train.py
│           └── predict.py
├── tests/
├── examples/
└── docs/

# Multi-environment support
# requirements.txt - base
numpy>=1.20
pandas>=1.3

# requirements-dev.txt - development
-r requirements.txt
pytest
black
mypy

# requirements-prod.txt - production (pinned)
numpy==1.21.5
pandas==1.3.5

# Install for different scenarios
# Local development: pip install -e ".[dev]"
# CI/CD testing: pip install -e ".[test]"
# Production: pip install .

# Publish to PyPI
# python -m build
# twine upload dist/*

# Install from PyPI
# pip install ml-classifier

# Install from git (specific branch/tag)
# pip install git+https://github.com/user/ml-classifier.git@v0.1.0

# Docker integration
# Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir .
ENTRYPOINT ["ml-train"]

# Build: docker build -t ml-classifier .
# Run: docker run ml-classifier --config config.yaml
```

**Key Takeaway**: Use pyproject.toml (modern) or setup.py (legacy); src layout with src/package/; specify dependencies and entry points; pip install -e . for editable dev install; publish to PyPI or install from git.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#packaging) for comprehensive list

## Summary

**In 3 sentences**:
- Modules are Python files containing code, packages are directories of modules with `__init__.py`, and you import them to reuse code across your project
- Use `import module` for clarity, `from module import item` for convenience, and alias with `as` for shorter names (e.g., `import numpy as np`)
- Every ML project imports external libraries (numpy, pandas, sklearn) and should organize custom code into modules for preprocessing, models, and evaluation

**Key takeaway**: Modules are how Python scales from scripts to projects. Master imports and package structure, and you can organize complex ML workflows, collaborate effectively, and build reusable AI tools!

---

## 🎉 Phase 1 Complete!

**Congratulations!** You've finished **Python Fundamentals** and learned:

1. ✅ **Syntax Basics** - Indentation, variables, operators
2. ✅ **Data Types** - Lists, dicts, sets, tuples
3. ✅ **Control Flow** - if/else, loops, comprehensions
4. ✅ **Functions** - Parameters, *args, **kwargs, scope
5. ✅ **Modules** - Imports, packages, organizing code

You now have the foundation to write Python code and understand ML libraries!

**Next Phase**: [Phase 2 - Intermediate Python](../02-intermediate/01-oop-basics.md) where you'll learn OOP, dataclasses, error handling, and file I/O.
