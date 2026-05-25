# File I/O & Data Serialization

> **Before you start**: Do you understand error handling? If not, review [Error Handling](./04-error-handling.md)

## What is File I/O?

**Simple explanation**: File I/O (Input/Output) is how you read data from files and write data to files on disk. Instead of losing data when your program ends, you can save it to files and load it later.

**Analogy**: It's like saving a document in a word processor—you can close the program, and when you reopen it, your work is still there.

**Key concepts**:
- **Reading**: Load data from a file into your program (input)
- **Writing**: Save data from your program to a file (output)
- **Serialization**: Convert Python objects to a format that can be stored (JSON, pickle)
- **Deserialization**: Convert stored data back to Python objects

**Basic example**:
```python
# Writing
with open("data.txt", "w") as f:
    f.write("Hello, World!")

# Reading
with open("data.txt", "r") as f:
    content = f.read()
    print(content)  # Hello, World!
```

## Why This Matters for AI/ML

1. **Loading Datasets**: Read training data from CSV, JSON, or text files
   ```python
   import pandas as pd
   data = pd.read_csv("training_data.csv")
   ```

2. **Saving Model Weights**: Persist trained models
   ```python
   torch.save(model.state_dict(), "model_weights.pt")
   ```

3. **Configuration Files**: Store hyperparameters as JSON
   ```python
   config = {"learning_rate": 0.001, "batch_size": 32}
   with open("config.json", "w") as f:
       json.dump(config, f)
   ```

4. **Logging Results**: Track training metrics over time
   ```python
   with open("training_log.txt", "a") as f:
       f.write(f"Epoch {epoch}: loss={loss:.4f}\n")
   ```

## Basic File Operations

### Reading Files

**Three ways to read**:

```python
# 1. Read entire file as string
with open("file.txt", "r") as f:
    content = f.read()
    print(content)

# 2. Read line by line (list)
with open("file.txt", "r") as f:
    lines = f.readlines()  # ['line1\n', 'line2\n', ...]
    for line in lines:
        print(line.strip())

# 3. Read line by line (generator - memory efficient)
with open("file.txt", "r") as f:
    for line in f:  # File object is an iterator
        print(line.strip())
```

**Which to use?**
- `read()`: Small files, need entire content
- `readlines()`: Small files, need list of lines
- `for line in f`: Large files (memory efficient)

### Writing Files

```python
# Write string
with open("output.txt", "w") as f:
    f.write("Hello, World!\n")

# Write multiple lines
lines = ["Line 1\n", "Line 2\n", "Line 3\n"]
with open("output.txt", "w") as f:
    f.writelines(lines)

# Append to existing file
with open("log.txt", "a") as f:
    f.write("New log entry\n")
```

**Note**: `write()` doesn't add newlines automatically—you must add `\n` yourself!

### File Modes

| Mode | Description | Creates if missing? | Overwrites? |
|------|-------------|---------------------|-------------|
| `'r'` | Read (text) | No (raises error) | - |
| `'w'` | Write (text) | Yes | Yes |
| `'a'` | Append (text) | Yes | No |
| `'x'` | Exclusive create | Yes | No (error if exists) |
| `'rb'` | Read binary | No | - |
| `'wb'` | Write binary | Yes | Yes |
| `'r+'` | Read & write | No | No |

**Common combinations**:
```python
# Read text
with open("data.txt", "r") as f:
    content = f.read()

# Write text (overwrites)
with open("data.txt", "w") as f:
    f.write("New content")

# Append text
with open("log.txt", "a") as f:
    f.write("Log entry\n")

# Read binary (images, models)
with open("image.png", "rb") as f:
    data = f.read()

# Write binary
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)
```

### Context Managers (with statement)

**❌ Without `with`** (manual cleanup):
```python
f = open("file.txt", "r")
content = f.read()
f.close()  # Must remember to close!

# If exception occurs before close(), file stays open (resource leak)
```

**✅ With `with`** (automatic cleanup):
```python
with open("file.txt", "r") as f:
    content = f.read()
# File is automatically closed when block exits (even if exception occurs)
```

**Why `with` is better**:
- Automatically closes file (no leaks)
- Closes even if exception occurs
- Cleaner, more readable code

**Java comparison**:
```java
// Java 7+ try-with-resources (similar to Python's with)
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line = reader.readLine();
}  // Automatically closed
```

## Working with Different Formats

### Text Files

**Basic text operations**:
```python
# Write training metrics
with open("metrics.txt", "w") as f:
    f.write("Epoch 1: loss=2.5, accuracy=0.65\n")
    f.write("Epoch 2: loss=1.8, accuracy=0.72\n")

# Read and parse
with open("metrics.txt", "r") as f:
    for line in f:
        print(line.strip())
```

**Reading large files efficiently**:
```python
def process_large_file(filename):
    """Process file line by line (memory efficient)"""
    with open(filename, "r") as f:
        for line in f:
            # Process one line at a time
            yield process(line.strip())

# Usage
for result in process_large_file("huge_dataset.txt"):
    train(result)
```

### JSON

**Python's structured data format** (human-readable, language-agnostic)

```python
import json

# Write JSON
data = {
    "model": "ResNet50",
    "accuracy": 0.94,
    "hyperparameters": {
        "learning_rate": 0.001,
        "batch_size": 32
    },
    "classes": ["cat", "dog", "bird"]
}

with open("config.json", "w") as f:
    json.dump(data, f, indent=2)  # indent=2 for pretty printing

# Read JSON
with open("config.json", "r") as f:
    loaded_data = json.load(f)
    print(loaded_data["model"])  # ResNet50
```

**JSON to/from strings**:
```python
# Serialize to string
json_string = json.dumps(data, indent=2)
print(json_string)

# Parse from string
parsed = json.loads(json_string)
```

**Handling non-serializable types**:
```python
import json
from datetime import datetime

data = {
    "timestamp": datetime.now()  # ❌ datetime not JSON serializable
}

# ✅ Custom encoder
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

with open("data.json", "w") as f:
    json.dump(data, f, cls=DateTimeEncoder)
```

### CSV

**Tabular data format** (like Excel, but simpler)

```python
import csv

# Write CSV
data = [
    ["name", "age", "score"],
    ["Alice", 25, 95],
    ["Bob", 30, 87],
    ["Charlie", 35, 92]
]

with open("data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(data)  # Write all rows at once

# Read CSV
with open("data.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)  # First row is header
    for row in reader:
        name, age, score = row
        print(f"{name}: {score}")
```

**DictReader/DictWriter** (more convenient):
```python
import csv

# Write with headers
data = [
    {"name": "Alice", "age": 25, "score": 95},
    {"name": "Bob", "age": 30, "score": 87}
]

with open("data.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age", "score"])
    writer.writeheader()
    writer.writerows(data)

# Read as dictionaries
with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["score"])  # Access by column name
```

**For ML, usually use pandas**:
```python
import pandas as pd

# Read CSV (much more powerful)
df = pd.read_csv("data.csv")
print(df.head())

# Write CSV
df.to_csv("output.csv", index=False)
```

### Pickle

**Python-specific binary format** (can serialize almost any Python object)

```python
import pickle

# Save Python objects
data = {
    "model_state": model.state_dict(),
    "optimizer_state": optimizer.state_dict(),
    "epoch": 42,
    "loss_history": [2.5, 1.8, 1.2, 0.9]
}

with open("checkpoint.pkl", "wb") as f:
    pickle.dump(data, f)

# Load Python objects
with open("checkpoint.pkl", "rb") as f:
    checkpoint = pickle.load(f)
    model.load_state_dict(checkpoint["model_state"])
```

**⚠️ Pickle security warning**:
```python
# ❌ NEVER unpickle untrusted data
# Pickle can execute arbitrary code!
with open("untrusted.pkl", "rb") as f:
    data = pickle.load(f)  # Could run malicious code
```

**When to use pickle**:
- ✅ Internal use (your own data)
- ✅ Caching computed results
- ✅ Python-specific objects

**When NOT to use pickle**:
- ❌ Sharing data with non-Python programs
- ❌ Storing data from untrusted sources
- ❌ Long-term data storage (pickle format can change)

**Alternatives**:
- **JSON**: Human-readable, language-agnostic (but limited types)
- **Protocol Buffers**: Efficient, language-agnostic, schema-based
- **HDF5**: Large numerical data (via h5py)
- **PyTorch**: `torch.save()` / `torch.load()` for models

## Path Handling with pathlib

**Modern way to work with file paths** (introduced in Python 3.4)

```python
from pathlib import Path

# Create Path objects
data_dir = Path("data")
file_path = data_dir / "train.csv"  # Path concatenation with /

print(file_path)  # data/train.csv

# Check existence
if file_path.exists():
    print("File exists")

# Create directories
output_dir = Path("output/experiments/run_001")
output_dir.mkdir(parents=True, exist_ok=True)  # Create nested dirs

# Read/write with pathlib
file_path.write_text("Hello, World!")
content = file_path.read_text()

# Get file info
print(file_path.name)        # train.csv
print(file_path.stem)        # train
print(file_path.suffix)      # .csv
print(file_path.parent)      # data
print(file_path.absolute())  # /full/path/to/data/train.csv

# List files
data_dir = Path("data")
for file in data_dir.glob("*.csv"):  # All CSV files
    print(file)

for file in data_dir.rglob("*.json"):  # Recursive search
    print(file)
```

**Old way (os.path)** vs **New way (pathlib)**:
```python
import os

# ❌ Old way (os.path)
path = os.path.join("data", "train.csv")
if os.path.exists(path):
    with open(path, "r") as f:
        content = f.read()

# ✅ New way (pathlib)
path = Path("data") / "train.csv"
if path.exists():
    content = path.read_text()
```

**Real-world ML example**:
```python
from pathlib import Path

# Project structure
project_root = Path(__file__).parent
data_dir = project_root / "data"
models_dir = project_root / "models"
logs_dir = project_root / "logs"

# Create directories
for dir in [data_dir, models_dir, logs_dir]:
    dir.mkdir(exist_ok=True)

# Save model
model_path = models_dir / f"model_epoch_{epoch}.pt"
torch.save(model.state_dict(), model_path)

# Load latest model
checkpoints = sorted(models_dir.glob("model_epoch_*.pt"))
if checkpoints:
    latest = checkpoints[-1]
    model.load_state_dict(torch.load(latest))
```

## Try It

Open Python REPL and try this:

```python
from pathlib import Path
import json

# 1. Create a simple text file
file = Path("test.txt")
file.write_text("Hello from Python!")
print(file.read_text())

# 2. Work with JSON
config = {
    "model": "ResNet",
    "lr": 0.001,
    "epochs": 10
}

config_file = Path("config.json")
config_file.write_text(json.dumps(config, indent=2))

# Read it back
loaded = json.loads(config_file.read_text())
print(loaded["model"])

# 3. Create directory structure
project = Path("ml_project")
(project / "data").mkdir(parents=True, exist_ok=True)
(project / "models").mkdir(exist_ok=True)
(project / "logs").mkdir(exist_ok=True)

# List directories
for item in project.iterdir():
    print(f"{'DIR' if item.is_dir() else 'FILE'}: {item.name}")

# Cleanup (optional)
import shutil
shutil.rmtree(project)
file.unlink()
config_file.unlink()
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the advantage of using `with` statement for files?
2. **Why** use JSON instead of pickle for serialization?
3. **When** should you use binary mode vs text mode?
4. **How** does pathlib improve file path handling?
5. **Compare**: Python's file handling vs Java's

<details>
<summary><strong>Answers</strong></summary>

1. **What is the advantage of using `with` statement for files?**
   - **Automatic cleanup**: File is closed when block exits
   - **Exception safety**: File closes even if exception occurs
   - **No resource leaks**: Don't have to remember `close()`
   - **Cleaner code**: Less boilerplate
   - Example:
     ```python
     # Without with - manual close required
     f = open("file.txt")
     data = f.read()
     f.close()  # Must remember this!

     # With with - automatic close
     with open("file.txt") as f:
         data = f.read()
     # Automatically closed
     ```

2. **Why use JSON instead of pickle for serialization?**

   **JSON advantages**:
   - ✅ Human-readable (can edit with text editor)
   - ✅ Language-agnostic (works with JavaScript, Go, etc.)
   - ✅ Secure (no code execution)
   - ✅ Stable format (works across Python versions)
   - ❌ Limited types (only: dict, list, str, int, float, bool, None)

   **Pickle advantages**:
   - ✅ Can serialize almost any Python object
   - ✅ Preserves object types exactly
   - ❌ Python-only
   - ❌ Security risk (can execute code)
   - ❌ Format can change between versions

   **Use JSON for**: Config files, API data, sharing with other languages
   **Use pickle for**: Caching, internal Python objects

3. **When should you use binary mode vs text mode?**

   **Text mode** (`'r'`, `'w'`):
   - Text files (.txt, .csv, .json, .py)
   - Handles encoding/decoding (UTF-8)
   - Converts line endings (\n, \r\n)
   - Example: `open("data.txt", "r")`

   **Binary mode** (`'rb'`, `'wb'`):
   - Non-text files (images, videos, models)
   - No encoding/decoding
   - Exact byte representation
   - Required for pickle
   - Example: `open("model.pkl", "wb")`

   **Rule of thumb**:
   - If you can open it in Notepad → text mode
   - If you can't (images, audio, etc.) → binary mode

4. **How does pathlib improve file path handling?**

   **Old way (os.path)**:
   ```python
   import os
   path = os.path.join("data", "train.csv")
   exists = os.path.exists(path)
   name = os.path.basename(path)
   ```

   **New way (pathlib)**:
   ```python
   from pathlib import Path
   path = Path("data") / "train.csv"  # / operator!
   exists = path.exists()              # Method call
   name = path.name                    # Property
   ```

   **Pathlib advantages**:
   - Object-oriented (methods, not functions)
   - `/` operator for joining paths
   - Cross-platform (handles Windows/Linux differences)
   - Cleaner, more intuitive API
   - Built-in file operations (`read_text()`, `write_text()`)

5. **Compare: Python's file handling vs Java's**

   | Aspect | Python | Java |
   |--------|--------|------|
   | Basic read | `open("f.txt").read()` | `Files.readString(Path.of("f.txt"))` |
   | Auto-close | `with open(...)` | `try (BufferedReader ...)` |
   | Modes | String flags (`'r'`, `'w'`) | Separate classes (Reader, Writer) |
   | Encoding | UTF-8 default | Must specify explicitly |
   | Path handling | `pathlib.Path` (OOP) | `java.nio.file.Path` (OOP) |

   **Python is simpler**:
   ```python
   # Python - concise
   with open("file.txt") as f:
       content = f.read()
   ```

   ```java
   // Java - more verbose
   try (BufferedReader reader = new BufferedReader(
           new FileReader("file.txt"))) {
       String content = reader.lines()
           .collect(Collectors.joining("\n"));
   }
   ```

</details>

## Practice Exercises

**Level 1 - Understand**: Read and explain the code

```python
from pathlib import Path
import json

config_file = Path("config.json")

if not config_file.exists():
    default_config = {"lr": 0.001, "epochs": 10}
    config_file.write_text(json.dumps(default_config, indent=2))

config = json.loads(config_file.read_text())
print(f"Learning rate: {config['lr']}")
```

**Questions**:
1. What happens the first time you run this code?
2. What happens the second time you run it?
3. Why use `json.dumps()` and `json.loads()`?
4. Could you use `json.dump()` and `json.load()` instead?

<details>
<summary><strong>Explanation</strong></summary>

1. **First run**:
   - `config.json` doesn't exist
   - Creates file with default config: `{"lr": 0.001, "epochs": 10}`
   - Reads it back and prints: `Learning rate: 0.001`

2. **Second run**:
   - `config.json` already exists
   - Skips creation (if block is False)
   - Reads existing file
   - Prints: `Learning rate: 0.001`

3. **Why `json.dumps()` and `json.loads()`?**
   - `json.dumps()`: dict → string (for `write_text()`)
   - `json.loads()`: string → dict (from `read_text()`)
   - The 's' stands for "string"

4. **Could you use `json.dump()` and `json.load()`?**
   Yes, but syntax is different:
   ```python
   # With dump/load (file object)
   with open("config.json", "w") as f:
       json.dump(default_config, f, indent=2)

   with open("config.json", "r") as f:
       config = json.load(f)

   # With dumps/loads (string)
   text = json.dumps(default_config, indent=2)
   Path("config.json").write_text(text)

   text = Path("config.json").read_text()
   config = json.loads(text)
   ```

   **Rule**:
   - `dump/load`: work with file objects
   - `dumps/loads`: work with strings

</details>

---

**Level 2 - Apply**: Modify the code

Create a `TrainingLogger` class that:
- Logs training metrics to a CSV file
- Has method `log(epoch, loss, accuracy)` that appends to CSV
- Has method `get_history()` that returns all logs as list of dicts
- Creates file with headers if it doesn't exist
- Uses `pathlib.Path` for file handling

<details>
<summary><strong>Solution</strong></summary>

```python
from pathlib import Path
import csv

class TrainingLogger:
    """Log training metrics to CSV file"""

    def __init__(self, log_file):
        self.log_file = Path(log_file)
        self.fieldnames = ["epoch", "loss", "accuracy"]

        # Create file with headers if doesn't exist
        if not self.log_file.exists():
            with open(self.log_file, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=self.fieldnames)
                writer.writeheader()

    def log(self, epoch, loss, accuracy):
        """Append training metrics to CSV"""
        with open(self.log_file, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            writer.writerow({
                "epoch": epoch,
                "loss": loss,
                "accuracy": accuracy
            })

    def get_history(self):
        """Read all logs as list of dicts"""
        if not self.log_file.exists():
            return []

        with open(self.log_file, "r") as f:
            reader = csv.DictReader(f)
            return list(reader)

    def get_best_accuracy(self):
        """Find epoch with best accuracy"""
        history = self.get_history()
        if not history:
            return None

        best = max(history, key=lambda x: float(x["accuracy"]))
        return {
            "epoch": int(best["epoch"]),
            "accuracy": float(best["accuracy"]),
            "loss": float(best["loss"])
        }

# Test it
logger = TrainingLogger("training_log.csv")

# Simulate training
for epoch in range(1, 6):
    loss = 2.5 - (epoch * 0.3)
    accuracy = 0.6 + (epoch * 0.05)
    logger.log(epoch, loss, accuracy)
    print(f"Epoch {epoch}: loss={loss:.2f}, acc={accuracy:.2f}")

# Review history
print("\n--- Training History ---")
for entry in logger.get_history():
    print(entry)

print("\n--- Best Model ---")
print(logger.get_best_accuracy())
```

**Output**:
```
Epoch 1: loss=2.20, acc=0.65
Epoch 2: loss=1.90, acc=0.70
Epoch 3: loss=1.60, acc=0.75
Epoch 4: loss=1.30, acc=0.80
Epoch 5: loss=1.00, acc=0.85

--- Training History ---
{'epoch': '1', 'loss': '2.2', 'accuracy': '0.65'}
{'epoch': '2', 'loss': '1.9', 'accuracy': '0.7'}
{'epoch': '3', 'loss': '1.6', 'accuracy': '0.75'}
{'epoch': '4', 'loss': '1.3', 'accuracy': '0.8'}
{'epoch': '5', 'loss': '1.0', 'accuracy': '0.85'}

--- Best Model ---
{'epoch': 5, 'accuracy': 0.85, 'loss': 1.0}
```

**Key features**:
- Creates file with headers automatically
- Appends new entries (doesn't overwrite)
- Can read back entire history
- Finds best model by accuracy

</details>

---

**Level 3 - Create**: Build from scratch

Build a **DatasetManager** class for managing ML datasets:

**Requirements**:
1. Initialize with `data_dir` (Path)
2. Methods:
   - `save_dataset(name, data, format="json")`: Save dataset (support json/csv/pickle)
   - `load_dataset(name, format="json")`: Load dataset
   - `list_datasets(format=None)`: List all datasets (optionally filter by format)
   - `delete_dataset(name, format="json")`: Delete a dataset
   - `get_dataset_info(name, format="json")`: Return dict with file size, mod time

3. Error handling:
   - Raise `FileNotFoundError` if loading non-existent dataset
   - Raise `ValueError` for unsupported formats

4. File naming convention: `{name}.{format}`

<details>
<summary><strong>Solution</strong></summary>

```python
from pathlib import Path
import json
import pickle
import csv
from datetime import datetime

class DatasetManager:
    """Manage ML datasets with multiple formats"""

    SUPPORTED_FORMATS = ["json", "csv", "pickle"]

    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, name, format):
        """Get file path for dataset"""
        if format not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported format: {format}. "
                f"Supported: {self.SUPPORTED_FORMATS}"
            )
        return self.data_dir / f"{name}.{format}"

    def save_dataset(self, name, data, format="json"):
        """Save dataset in specified format"""
        path = self._get_path(name, format)

        if format == "json":
            with open(path, "w") as f:
                json.dump(data, f, indent=2)

        elif format == "csv":
            # Assume data is list of dicts
            if not data:
                raise ValueError("Cannot save empty dataset to CSV")

            with open(path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)

        elif format == "pickle":
            with open(path, "wb") as f:
                pickle.dump(data, f)

        print(f"✓ Saved {name}.{format} ({path.stat().st_size} bytes)")

    def load_dataset(self, name, format="json"):
        """Load dataset from specified format"""
        path = self._get_path(name, format)

        if not path.exists():
            raise FileNotFoundError(
                f"Dataset not found: {name}.{format}"
            )

        if format == "json":
            with open(path, "r") as f:
                return json.load(f)

        elif format == "csv":
            with open(path, "r") as f:
                reader = csv.DictReader(f)
                return list(reader)

        elif format == "pickle":
            with open(path, "rb") as f:
                return pickle.load(f)

    def list_datasets(self, format=None):
        """List all datasets, optionally filtered by format"""
        datasets = []

        if format:
            # List specific format
            pattern = f"*.{format}"
            files = self.data_dir.glob(pattern)
        else:
            # List all supported formats
            files = []
            for fmt in self.SUPPORTED_FORMATS:
                files.extend(self.data_dir.glob(f"*.{fmt}"))

        for path in sorted(files):
            datasets.append({
                "name": path.stem,
                "format": path.suffix[1:],  # Remove leading dot
                "size": path.stat().st_size,
                "path": str(path)
            })

        return datasets

    def delete_dataset(self, name, format="json"):
        """Delete a dataset"""
        path = self._get_path(name, format)

        if not path.exists():
            raise FileNotFoundError(
                f"Dataset not found: {name}.{format}"
            )

        path.unlink()
        print(f"✓ Deleted {name}.{format}")

    def get_dataset_info(self, name, format="json"):
        """Get information about a dataset"""
        path = self._get_path(name, format)

        if not path.exists():
            raise FileNotFoundError(
                f"Dataset not found: {name}.{format}"
            )

        stat = path.stat()
        return {
            "name": name,
            "format": format,
            "size_bytes": stat.st_size,
            "size_kb": stat.st_size / 1024,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "path": str(path.absolute())
        }


# Test the DatasetManager
if __name__ == "__main__":
    manager = DatasetManager("datasets")

    # Save different formats
    json_data = {
        "samples": 1000,
        "features": ["age", "income", "score"],
        "labels": ["A", "B", "C"]
    }
    manager.save_dataset("config", json_data, format="json")

    csv_data = [
        {"name": "Alice", "age": 25, "score": 95},
        {"name": "Bob", "age": 30, "score": 87},
        {"name": "Charlie", "age": 35, "score": 92}
    ]
    manager.save_dataset("users", csv_data, format="csv")

    pickle_data = {
        "model_weights": [0.1, 0.2, 0.3],
        "optimizer_state": {"lr": 0.001},
        "epoch": 42
    }
    manager.save_dataset("checkpoint", pickle_data, format="pickle")

    # List all datasets
    print("\n--- All Datasets ---")
    for ds in manager.list_datasets():
        print(f"{ds['name']}.{ds['format']} - {ds['size']} bytes")

    # List only JSON datasets
    print("\n--- JSON Datasets ---")
    for ds in manager.list_datasets(format="json"):
        print(f"{ds['name']}.{ds['format']}")

    # Get info
    print("\n--- Dataset Info ---")
    info = manager.get_dataset_info("config", "json")
    for key, value in info.items():
        print(f"{key}: {value}")

    # Load dataset
    print("\n--- Loading Dataset ---")
    loaded = manager.load_dataset("users", "csv")
    for row in loaded:
        print(row)

    # Try to load non-existent
    print("\n--- Error Handling ---")
    try:
        manager.load_dataset("nonexistent", "json")
    except FileNotFoundError as e:
        print(f"Error: {e}")

    # Delete dataset
    print("\n--- Cleanup ---")
    manager.delete_dataset("checkpoint", "pickle")

    # List after deletion
    print("\n--- Datasets After Deletion ---")
    for ds in manager.list_datasets():
        print(f"{ds['name']}.{ds['format']}")
```

**Output**:
```
✓ Saved config.json (110 bytes)
✓ Saved users.csv (98 bytes)
✓ Saved checkpoint.pickle (85 bytes)

--- All Datasets ---
checkpoint.pickle - 85 bytes
config.json - 110 bytes
users.csv - 98 bytes

--- JSON Datasets ---
config.json

--- Dataset Info ---
name: config
format: json
size_bytes: 110
size_kb: 0.107421875
modified: 2026-01-13T10:30:45.123456
path: /path/to/datasets/config.json

--- Loading Dataset ---
{'name': 'Alice', 'age': '25', 'score': '95'}
{'name': 'Bob', 'age': '30', 'score': '87'}
{'name': 'Charlie', 'age': '35', 'score': '92'}

--- Error Handling ---
Error: Dataset not found: nonexistent.json

--- Cleanup ---
✓ Deleted checkpoint.pickle

--- Datasets After Deletion ---
config.json - 110 bytes
users.csv - 98 bytes
```

**Key features**:
- Supports multiple formats (JSON, CSV, pickle)
- Proper error handling
- File size and modification time info
- List and filter datasets
- Clean API with pathlib

</details>

## Common Mistakes

### ❌ Mistake 1: Forgetting to close files

```python
# ❌ File stays open (resource leak)
f = open("file.txt", "r")
content = f.read()
# Forgot to close!

# If many files opened this way, you'll hit OS limit
```

✅ **Fix**: Always use `with`
```python
with open("file.txt", "r") as f:
    content = f.read()
# Automatically closed
```

---

### ❌ Mistake 2: Writing without newlines

```python
# ❌ All on one line
with open("log.txt", "w") as f:
    f.write("Line 1")
    f.write("Line 2")
    f.write("Line 3")

# Result: Line 1Line 2Line 3
```

✅ **Fix**: Add `\n` explicitly
```python
with open("log.txt", "w") as f:
    f.write("Line 1\n")
    f.write("Line 2\n")
    f.write("Line 3\n")

# or use print()
with open("log.txt", "w") as f:
    print("Line 1", file=f)
    print("Line 2", file=f)
    print("Line 3", file=f)
```

---

### ❌ Mistake 3: Using 'w' instead of 'a' for appending

```python
# ❌ Overwrites file each time
for i in range(5):
    with open("log.txt", "w") as f:
        f.write(f"Iteration {i}\n")

# Result: Only "Iteration 4" in file
```

✅ **Fix**: Use 'a' to append
```python
for i in range(5):
    with open("log.txt", "a") as f:
        f.write(f"Iteration {i}\n")

# Result: All 5 iterations in file
```

---

### ❌ Mistake 4: Loading large files into memory

```python
# ❌ Loads entire 10GB file into memory
with open("huge_dataset.txt", "r") as f:
    lines = f.readlines()  # ❌ OOM error!

for line in lines:
    process(line)
```

✅ **Fix**: Process line by line
```python
# ✅ Processes one line at a time
with open("huge_dataset.txt", "r") as f:
    for line in f:  # Iterator - memory efficient
        process(line.strip())
```

---

### ❌ Mistake 5: Unpickling untrusted data

```python
# ❌ SECURITY RISK - pickle can execute code
import pickle

with open("untrusted_data.pkl", "rb") as f:
    data = pickle.load(f)  # Could run malicious code!
```

✅ **Fix**: Use JSON for untrusted data
```python
import json

with open("data.json", "r") as f:
    data = json.load(f)  # Safe - just data
```

---

### ❌ Mistake 6: Hardcoding file paths

```python
# ❌ Breaks on Windows (wrong path separator)
file = "data/train/images/image001.jpg"

# ❌ Breaks when run from different directory
file = "../data/train.csv"
```

✅ **Fix**: Use pathlib
```python
from pathlib import Path

# ✅ Works on all platforms
file = Path("data") / "train" / "images" / "image001.jpg"

# ✅ Relative to current file
project_root = Path(__file__).parent
data_dir = project_root / "data"
```

## How This Connects

**Builds on**:
- [Error Handling](./04-error-handling.md) - Handle file errors (FileNotFoundError, etc.)
- [Data Types](../01-fundamentals/02-data-types.md) - Serialize dicts, lists, etc.

**Related concepts**:
- **Context Managers** (Phase 3) - `with` statement deep dive
- **Generators** (Already covered) - Memory-efficient file reading
- **Pandas** (Phase 5) - Advanced CSV/Excel handling

**Why this matters for AI/ML**:

1. **Loading Datasets**:
   ```python
   import pandas as pd

   # CSV
   data = pd.read_csv("train.csv")

   # JSON
   with open("config.json") as f:
       config = json.load(f)

   # Custom format
   def load_custom_dataset(path):
       with open(path) as f:
           for line in f:
               yield parse(line)
   ```

2. **Saving Model Checkpoints**:
   ```python
   from pathlib import Path
   import torch

   checkpoints_dir = Path("checkpoints")
   checkpoints_dir.mkdir(exist_ok=True)

   # Save checkpoint
   checkpoint = {
       'epoch': epoch,
       'model_state_dict': model.state_dict(),
       'optimizer_state_dict': optimizer.state_dict(),
       'loss': loss
   }
   torch.save(checkpoint, checkpoints_dir / f"checkpoint_epoch_{epoch}.pt")

   # Load latest
   latest = sorted(checkpoints_dir.glob("*.pt"))[-1]
   checkpoint = torch.load(latest)
   model.load_state_dict(checkpoint['model_state_dict'])
   ```

3. **Configuration Management**:
   ```python
   from pathlib import Path
   import json

   config_file = Path("config.json")

   # Default config
   default_config = {
       "model": "ResNet50",
       "lr": 0.001,
       "batch_size": 32,
       "epochs": 100
   }

   # Load or create
   if config_file.exists():
       with open(config_file) as f:
           config = json.load(f)
   else:
       config = default_config
       with open(config_file, "w") as f:
           json.dump(config, f, indent=2)
   ```

4. **Logging Training Metrics**:
   ```python
   from pathlib import Path
   import csv

   log_file = Path("training.csv")

   # Create with headers
   if not log_file.exists():
       with open(log_file, "w", newline="") as f:
           writer = csv.writer(f)
           writer.writerow(["epoch", "train_loss", "val_loss", "val_acc"])

   # Append metrics
   with open(log_file, "a", newline="") as f:
       writer = csv.writer(f)
       writer.writerow([epoch, train_loss, val_loss, val_acc])
   ```

**Next steps**:
- **Phase 3**: Advanced Python (Type Hints, Async, Decorators)
- **Phase 5**: Data Science with pandas for advanced data manipulation

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. **How does Python buffer file I/O operations?**
   <details>
   <summary>Answer</summary>

   **Buffering levels**:

   ```python
   # 0 = No buffering (unbuffered)
   with open("file.txt", "w", buffering=0) as f:
       f.write(b"data")  # Written immediately to disk

   # 1 = Line buffering (text mode only)
   with open("file.txt", "w", buffering=1) as f:
       f.write("line 1\n")  # Flushed on newline

   # >1 = Fixed-size buffer (in bytes)
   with open("file.txt", "w", buffering=8192) as f:
       f.write("data")  # Buffered until 8KB accumulated

   # -1 = Default (system-dependent, usually 4KB-8KB)
   with open("file.txt", "w") as f:
       f.write("data")
   ```

   **Why buffering matters**:
   - **Performance**: Disk I/O is slow (~1000x slower than RAM)
   - **Batching**: Fewer system calls = faster execution
   - **Trade-off**: Data might be lost if program crashes before flush

   **Manual flushing**:
   ```python
   with open("log.txt", "w") as f:
       f.write("Critical data\n")
       f.flush()  # Force write to disk immediately
   ```

   **ML implications**:
   ```python
   # Logging training progress
   with open("training.log", "w", buffering=1) as f:  # Line buffered
       for epoch in range(100):
           loss = train_epoch()
           f.write(f"Epoch {epoch}: {loss}\n")
           # Immediately visible in file (line buffering)
   ```

   **Buffer size recommendations**:
   - Small files: Default buffering fine
   - Large sequential writes: Larger buffer (64KB-1MB)
   - Real-time logging: Line buffering or unbuffered
   - Critical data: Flush after important writes
   </details>

2. **What are the security implications of using pickle?**
   <details>
   <summary>Answer</summary>

   **Pickle can execute arbitrary code**:

   ```python
   import pickle
   import os

   # ❌ Malicious pickle payload
   class Exploit:
       def __reduce__(self):
           # This runs when unpickled!
           return (os.system, ('rm -rf /',))  # Deletes everything!

   # Attacker creates malicious pickle file
   with open("malicious.pkl", "wb") as f:
       pickle.dump(Exploit(), f)

   # Victim unpickles it
   with open("malicious.pkl", "rb") as f:
       obj = pickle.load(f)  # 💥 Code executes!
   ```

   **Why pickle is dangerous**:
   - `__reduce__` method controls deserialization
   - Can call any function with any arguments
   - No sandboxing or validation
   - Attackers can craft malicious pickles

   **Safe alternatives**:

   1. **JSON** (best for simple data):
      ```python
      import json

      # Safe - only data, no code
      with open("data.json", "w") as f:
          json.dump({"key": "value"}, f)
      ```

   2. **Protocol Buffers** (structured, typed):
      ```python
      # Define schema
      message Config {
          string model_name = 1;
          float learning_rate = 2;
      }

      # Safe - schema-validated
      ```

   3. **HDF5** (large numerical data):
      ```python
      import h5py

      with h5py.File("data.h5", "w") as f:
          f["dataset"] = numpy_array
      ```

   **If you must use pickle**:
   ```python
   import pickle
   import hashlib

   # 1. Only unpickle from trusted sources
   # 2. Verify integrity with HMAC
   def safe_pickle_dump(obj, filename, secret_key):
       data = pickle.dumps(obj)
       signature = hashlib.sha256(secret_key + data).hexdigest()

       with open(filename, "wb") as f:
           f.write(signature.encode())
           f.write(b"\n")
           f.write(data)

   def safe_pickle_load(filename, secret_key):
       with open(filename, "rb") as f:
           stored_signature = f.readline().strip()
           data = f.read()

       computed_signature = hashlib.sha256(
           secret_key + data
       ).hexdigest().encode()

       if stored_signature != computed_signature:
           raise ValueError("Pickle file tampered!")

       return pickle.loads(data)
   ```

   **ML model storage recommendations**:
   - PyTorch: `torch.save()` (uses pickle internally, same risks)
   - TensorFlow: SavedModel format (safer, structured)
   - ONNX: Cross-framework, safe format
   - Safetensors: New, secure alternative to pickle
   </details>

**Production Scenarios**:

1. **How do you handle large files (>1GB) that don't fit in memory?**
   <details>
   <summary>Answer</summary>

   **Streaming with generators**:
   ```python
   def stream_large_file(filename, chunk_size=1024*1024):  # 1MB chunks
       """Stream file in chunks"""
       with open(filename, "rb") as f:
           while True:
               chunk = f.read(chunk_size)
               if not chunk:
                   break
               yield chunk

   # Process file in chunks
   for chunk in stream_large_file("10GB_file.dat"):
       process(chunk)
   ```

   **Line-by-line processing**:
   ```python
   def process_large_text_file(filename):
       """Process text file line by line"""
       with open(filename, "r") as f:
           for line_num, line in enumerate(f, 1):
               # Process one line at a time
               result = transform(line.strip())

               if line_num % 1000000 == 0:
                   print(f"Processed {line_num:,} lines")

               yield result

   # Usage
   for result in process_large_text_file("huge_dataset.txt"):
       train(result)
   ```

   **Memory-mapped files**:
   ```python
   import mmap
   import numpy as np

   # Memory-map a large file
   with open("huge_array.dat", "r+b") as f:
       mmapped = mmap.mmap(f.fileno(), 0)

       # Access like array without loading all into RAM
       data = np.frombuffer(mmapped, dtype=np.float32)

       # Process in chunks
       chunk_size = 1000000
       for i in range(0, len(data), chunk_size):
           chunk = data[i:i+chunk_size]
           process(chunk)
   ```

   **Chunked CSV processing with pandas**:
   ```python
   import pandas as pd

   chunk_size = 100000  # Process 100k rows at a time

   for chunk in pd.read_csv("large_dataset.csv", chunksize=chunk_size):
       # Process chunk
       processed = preprocess(chunk)
       train_batch(processed)
   ```

   **HDF5 for large datasets**:
   ```python
   import h5py
   import numpy as np

   # Create HDF5 file
   with h5py.File("dataset.h5", "w") as f:
       # Create dataset (doesn't load into memory)
       dset = f.create_dataset(
           "data",
           shape=(1000000, 784),  # 1M samples, 784 features
           dtype=np.float32,
           chunks=(1000, 784)      # Process 1k at a time
       )

       # Write in chunks
       for i in range(0, 1000000, 1000):
           batch = generate_batch(1000)
           dset[i:i+1000] = batch

   # Read in chunks
   with h5py.File("dataset.h5", "r") as f:
       dset = f["data"]

       for i in range(0, len(dset), 1000):
           batch = dset[i:i+1000]
           train(batch)
   ```

   **Best practices**:
   - Use generators for streaming
   - Process in fixed-size chunks
   - Memory-map when possible
   - Monitor memory usage
   - Consider distributed processing (Dask, Spark) for very large files
   </details>

2. **What's the best practice for storing ML model artifacts?**
   <details>
   <summary>Answer</summary>

   **1. PyTorch models**:
   ```python
   import torch
   from pathlib import Path

   # Save checkpoint (recommended)
   def save_checkpoint(model, optimizer, epoch, loss, path):
       checkpoint = {
           'epoch': epoch,
           'model_state_dict': model.state_dict(),
           'optimizer_state_dict': optimizer.state_dict(),
           'loss': loss,
           'model_architecture': model.__class__.__name__,
           'hyperparameters': model.config,
           'timestamp': datetime.now().isoformat()
       }
       torch.save(checkpoint, path)

   # Load checkpoint
   def load_checkpoint(model, optimizer, path):
       checkpoint = torch.load(path)
       model.load_state_dict(checkpoint['model_state_dict'])
       optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
       return checkpoint['epoch'], checkpoint['loss']

   # Usage
   save_checkpoint(
       model, optimizer, epoch=10, loss=0.5,
       path="checkpoints/model_epoch_10.pt"
   )
   ```

   **2. Versioned model storage**:
   ```python
   from pathlib import Path
   import json
   import torch

   class ModelRegistry:
       def __init__(self, registry_dir):
           self.registry_dir = Path(registry_dir)
           self.registry_dir.mkdir(exist_ok=True)

       def save_model(self, model, name, version, metadata=None):
           """Save model with version and metadata"""
           model_dir = self.registry_dir / name / version
           model_dir.mkdir(parents=True, exist_ok=True)

           # Save model weights
           torch.save(
               model.state_dict(),
               model_dir / "weights.pt"
           )

           # Save metadata
           meta = metadata or {}
           meta.update({
               "name": name,
               "version": version,
               "architecture": model.__class__.__name__,
               "saved_at": datetime.now().isoformat()
           })

           with open(model_dir / "metadata.json", "w") as f:
               json.dump(meta, f, indent=2)

       def load_model(self, model_class, name, version):
           """Load model by name and version"""
           model_dir = self.registry_dir / name / version

           # Load metadata
           with open(model_dir / "metadata.json") as f:
               metadata = json.load(f)

           # Create model and load weights
           model = model_class()
           model.load_state_dict(
               torch.load(model_dir / "weights.pt")
           )

           return model, metadata

   # Usage
   registry = ModelRegistry("model_registry")

   registry.save_model(
       model,
       name="resnet50",
       version="v1.0.0",
       metadata={
           "accuracy": 0.94,
           "training_samples": 50000,
           "framework": "pytorch"
       }
   )
   ```

   **3. Cloud storage integration**:
   ```python
   # AWS S3
   import boto3

   def save_model_to_s3(model, bucket, key):
       # Save locally first
       local_path = "/tmp/model.pt"
       torch.save(model.state_dict(), local_path)

       # Upload to S3
       s3 = boto3.client('s3')
       s3.upload_file(local_path, bucket, key)

   # Google Cloud Storage
   from google.cloud import storage

   def save_model_to_gcs(model, bucket_name, blob_name):
       local_path = "/tmp/model.pt"
       torch.save(model.state_dict(), local_path)

       storage_client = storage.Client()
       bucket = storage_client.bucket(bucket_name)
       blob = bucket.blob(blob_name)
       blob.upload_from_filename(local_path)
   ```

   **4. Model formats comparison**:

   | Format | Use Case | Pros | Cons |
   |--------|----------|------|------|
   | PyTorch `.pt` | PyTorch-only | Simple, full state | Python-only, pickle risks |
   | TensorFlow SavedModel | Production | Cross-language, serving | Larger size |
   | ONNX | Cross-framework | Interoperable | Limited op support |
   | Safetensors | Secure storage | Safe, fast | Newer, less adoption |
   | TorchScript | Production | Optimized, no Python | Complex to debug |

   **5. Best practices**:
   - ✅ Version your models (`v1.0.0`, `v1.1.0`)
   - ✅ Store metadata (accuracy, training config)
   - ✅ Use checksums for integrity verification
   - ✅ Keep model architecture code with weights
   - ✅ Compress large models (tar.gz)
   - ✅ Back up to cloud storage
   - ✅ Test loading before deployment
   - ❌ Don't rely solely on pickle
   - ❌ Don't store secrets in model files
   </details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#file-io) for comprehensive list

## Summary

**In 3 sentences**:
- Use the `with` statement for automatic file closing (context manager), choose appropriate file modes ('r', 'w', 'a' for text; 'rb', 'wb' for binary), and use pathlib.Path for cross-platform path handling instead of string concatenation
- JSON is preferred for configuration and data sharing (human-readable, secure), CSV for tabular data (use pandas for complex operations), and pickle only for trusted internal Python objects (security risk with untrusted data)
- Process large files line-by-line or in chunks using generators to avoid loading everything into memory, and use memory-mapped files (mmap) or HDF5 for efficient access to huge datasets

**Key takeaway**: Always use `with open()` to prevent resource leaks, prefer JSON over pickle for security (pickle can execute arbitrary code when loading), and use pathlib.Path for all file operations—it's object-oriented, cross-platform, and much cleaner than os.path string manipulation!
