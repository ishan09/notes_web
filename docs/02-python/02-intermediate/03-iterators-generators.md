# Iterators & Generators

> **Before you start**: Can you write for-loops in Python? If not, review [Control Flow](../01-fundamentals/03-control-flow.md)

## What are Iterators and Generators?

**Simple explanation**:
- **Iterator**: An object that remembers its position and returns items one at a time when you ask for the "next" one
- **Generator**: A special function that produces items one at a time using `yield` instead of `return`

**Analogy**:
- **Iterator**: Like a bookmark in a book—it remembers where you are and lets you read one page at a time
- **Generator**: Like a vending machine—it dispenses one item at a time when you press the button, without storing all items in memory

**Key difference from lists**:
```python
# List - creates all items in memory at once
numbers_list = [x * x for x in range(1000000)]  # ❌ Uses ~37MB memory

# Generator - creates items one at a time
numbers_gen = (x * x for x in range(1000000))   # ✅ Uses ~120 bytes memory
```

## Why This Matters for AI/ML

1. **Memory Efficiency**: Process datasets larger than RAM
   ```python
   # Process 1TB dataset without loading it all
   def read_large_file(path):
       with open(path) as f:
           for line in f:  # File object is an iterator!
               yield process(line)
   ```

2. **Lazy Evaluation**: Compute values only when needed
   ```python
   # Generate infinite data augmentation pipeline
   def augment_images(images):
       for img in images:
           yield rotate(img)
           yield flip(img)
           yield add_noise(img)
   ```

3. **Real-world ML Use Cases**:
   - **PyTorch DataLoader**: Yields batches without loading entire dataset
   - **LLM Streaming**: Yield tokens as they're generated
   - **ETL Pipelines**: Transform data in streaming fashion
   - **Data Augmentation**: Generate variations on-the-fly

## Iterators

### The Iterator Protocol

Every iterator must implement two methods:
- `__iter__()`: Returns the iterator object itself
- `__next__()`: Returns the next item or raises `StopIteration`

```python
# What happens when you use a for loop
numbers = [1, 2, 3]

for num in numbers:
    print(num)

# Under the hood, Python does this:
iterator = iter(numbers)  # Calls __iter__()
while True:
    try:
        num = next(iterator)  # Calls __next__()
        print(num)
    except StopIteration:
        break
```

### Creating Custom Iterators

```python
class BatchIterator:
    """Iterate over data in batches"""

    def __init__(self, data, batch_size):
        self.data = data
        self.batch_size = batch_size
        self.index = 0

    def __iter__(self):
        return self  # Iterator returns itself

    def __next__(self):
        if self.index >= len(self.data):
            raise StopIteration

        # Get next batch
        batch = self.data[self.index:self.index + self.batch_size]
        self.index += self.batch_size
        return batch

# Usage
data = list(range(10))
batches = BatchIterator(data, batch_size=3)

for batch in batches:
    print(batch)
# Output:
# [0, 1, 2]
# [3, 4, 5]
# [6, 7, 8]
# [9]
```

**Problem with this approach**: The iterator can only be used once!

```python
batches = BatchIterator(data, batch_size=3)

# First iteration works
for batch in batches:
    print(batch)  # Prints batches

# Second iteration does nothing (already exhausted)
for batch in batches:
    print(batch)  # Nothing printed!
```

**Java comparison**: Similar to `Iterator<T>` interface:
```java
// Java Iterator
Iterator<String> iter = list.iterator();
while (iter.hasNext()) {
    String item = iter.next();
}
```

## Generators

### Generator Functions (yield)

**Generators are easier than iterators**: Just use `yield` instead of `return`

```python
def batch_generator(data, batch_size):
    """Generator version - much simpler!"""
    for i in range(0, len(data), batch_size):
        yield data[i:i + batch_size]

# Usage (identical to iterator)
data = list(range(10))
batches = batch_generator(data, batch_size=3)

for batch in batches:
    print(batch)
# Same output as before
```

**Key differences**:
- `return` ends the function and returns a value
- `yield` pauses the function and returns a value, remembering state for next call

```python
def count_up_to(n):
    count = 1
    while count <= n:
        yield count
        count += 1

counter = count_up_to(3)
print(next(counter))  # 1 (pauses after first yield)
print(next(counter))  # 2 (resumes from where it left off)
print(next(counter))  # 3
print(next(counter))  # StopIteration exception
```

**Infinite generators**:
```python
def infinite_sequence():
    num = 0
    while True:
        yield num
        num += 1

# Can iterate forever!
gen = infinite_sequence()
print(next(gen))  # 0
print(next(gen))  # 1
# ... infinite
```

### Generator Expressions

**List comprehension** (eager):
```python
squares = [x * x for x in range(1000000)]  # Creates entire list in memory
```

**Generator expression** (lazy):
```python
squares = (x * x for x in range(1000000))  # Creates generator (uses () instead of [])
```

**Syntax**: Same as list comprehension but with `()` instead of `[]`

```python
# List comprehension - creates list
numbers = [x for x in range(5)]
print(numbers)  # [0, 1, 2, 3, 4]

# Generator expression - creates generator
numbers = (x for x in range(5))
print(numbers)  # <generator object at 0x...>
print(list(numbers))  # [0, 1, 2, 3, 4]
```

**Example: Data processing pipeline**
```python
# Process 1 million records efficiently
data = range(1000000)

# Chain operations - nothing computed yet!
squared = (x * x for x in data)
filtered = (x for x in squared if x % 2 == 0)
first_10 = (x for i, x in enumerate(filtered) if i < 10)

# Only compute when you iterate
result = list(first_10)  # Only processes what's needed
print(result)  # [0, 4, 16, 36, 64, 100, 144, 196, 256, 324]
```

### Generator vs List

| Feature | List | Generator |
|---------|------|-----------|
| Memory | All items at once | One item at a time |
| Speed (creation) | Slower (creates all) | Faster (creates nothing) |
| Speed (iteration) | Faster (cached) | Slightly slower |
| Reusability | Can iterate multiple times | Can only iterate once |
| Indexing | `list[5]` works | `gen[5]` doesn't work |
| len() | `len(list)` works | `len(gen)` doesn't work |

**When to use what**:
- **List**: Small data, need multiple iterations, need indexing
- **Generator**: Large data, iterate once, memory constrained

```python
# ❌ Bad - loads entire file into memory
def read_file_bad(path):
    with open(path) as f:
        return f.readlines()  # Returns list of all lines

lines = read_file_bad("huge_file.txt")  # ❌ Could crash with large files

# ✅ Good - processes one line at a time
def read_file_good(path):
    with open(path) as f:
        for line in f:  # File objects are iterators!
            yield line.strip()

for line in read_file_good("huge_file.txt"):  # ✅ Memory efficient
    process(line)
```

## Advanced Generator Patterns

### send() and throw()

Generators can receive values and exceptions:

```python
def training_monitor():
    """Monitor training progress"""
    epoch = 0
    while True:
        loss = yield epoch  # Yield value and receive input
        if loss is not None:
            print(f"Epoch {epoch}: loss = {loss:.4f}")
        epoch += 1

monitor = training_monitor()
next(monitor)  # Prime the generator (run until first yield)

# Send loss values
monitor.send(2.5)    # Epoch 0: loss = 2.5000
monitor.send(1.8)    # Epoch 1: loss = 1.8000
monitor.send(1.2)    # Epoch 2: loss = 1.2000
```

**throw()**: Inject exceptions into generator
```python
def resilient_processor():
    try:
        while True:
            item = yield
            print(f"Processing {item}")
    except ValueError as e:
        print(f"Error: {e}")
        yield "recovered"

proc = resilient_processor()
next(proc)
proc.send("item1")  # Processing item1
proc.throw(ValueError, "Bad data")  # Error: Bad data
```

### yield from

Delegate to another generator:

```python
def sub_generator():
    yield 1
    yield 2

def main_generator():
    yield "start"
    yield from sub_generator()  # Delegates to sub_generator
    yield "end"

for val in main_generator():
    print(val)
# Output:
# start
# 1
# 2
# end
```

**Real-world example: Flatten nested data**
```python
def flatten(nested_list):
    """Recursively flatten nested lists"""
    for item in nested_list:
        if isinstance(item, list):
            yield from flatten(item)  # Recursive delegation
        else:
            yield item

data = [1, [2, 3, [4, 5]], 6, [7, [8, 9]]]
print(list(flatten(data)))  # [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

## Try It

Open Python REPL and try this:

```python
# 1. Create a simple generator
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for num in countdown(5):
    print(num)

# 2. Generator expression
squares = (x * x for x in range(10))
print(next(squares))  # 0
print(next(squares))  # 1
print(list(squares))  # [4, 9, 16, 25, 36, 49, 64, 81]

# 3. Memory comparison
import sys

list_comp = [x for x in range(10000)]
gen_expr = (x for x in range(10000))

print(f"List size: {sys.getsizeof(list_comp)} bytes")
print(f"Generator size: {sys.getsizeof(gen_expr)} bytes")
# List size: ~85KB
# Generator size: ~120 bytes
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between `return` and `yield`?
2. **Why** would you use a generator instead of a list?
3. **When** should you NOT use a generator?
4. **How** does Python know when a generator is finished?
5. **Compare**: Generator vs Iterator - what's the difference?

<details>
<summary><strong>Answers</strong></summary>

1. **What is the difference between `return` and `yield`?**
   - **return**: Ends the function and returns a single value
   - **yield**: Pauses the function, returns a value, and remembers state
   - When you call `next()` on a generator, it resumes from the last `yield`
   - A function with `yield` is a generator function
   - Example:
     ```python
     def with_return():
         return 1
         return 2  # Never reached

     def with_yield():
         yield 1
         yield 2  # This WILL be reached on second next()
     ```

2. **Why would you use a generator instead of a list?**
   - **Memory efficiency**: Process large datasets without loading all in memory
   - **Lazy evaluation**: Compute values only when needed (faster startup)
   - **Infinite sequences**: Can represent infinite data streams
   - **Pipeline composition**: Chain transformations elegantly
   - **Example**: Processing a 10GB file line-by-line vs loading entire file

3. **When should you NOT use a generator?**
   - Need to iterate multiple times (generators exhaust after one pass)
   - Need random access / indexing (`gen[5]` doesn't work)
   - Need to know length beforehand (`len(gen)` doesn't work)
   - Need to sort or reverse (requires materializing to list)
   - Data is small and you need maximum iteration speed

4. **How does Python know when a generator is finished?**
   - When the function ends (no more code to execute)
   - Or when it hits a `return` statement (with or without value)
   - Python automatically raises `StopIteration` exception
   - for-loops catch this exception and stop iteration
   - Example:
     ```python
     def my_gen():
         yield 1
         yield 2
         return  # or function ends

     gen = my_gen()
     next(gen)  # 1
     next(gen)  # 2
     next(gen)  # StopIteration raised
     ```

5. **Compare: Generator vs Iterator - what's the difference?**

   | Aspect | Iterator | Generator |
   |--------|----------|-----------|
   | Definition | Class with `__iter__` and `__next__` | Function with `yield` |
   | Code | More verbose (class, methods) | Concise (just use yield) |
   | State | Manual (self.index, etc.) | Automatic (local variables) |
   | Use case | Complex iteration logic | Simple iteration patterns |

   **Key insight**: Generators ARE iterators, but simpler to write!
   - Every generator is an iterator
   - Not every iterator is a generator
   - Generators automatically implement `__iter__` and `__next__`

</details>

## Practice Exercises

**Level 1 - Understand**: Read and explain the code

```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

fib = fibonacci()
for _ in range(10):
    print(next(fib), end=" ")
```

**Questions**:
1. Is this generator finite or infinite?
2. What values are printed?
3. Can you iterate over `fib` again after the loop? Why or why not?

<details>
<summary><strong>Explanation</strong></summary>

1. **Infinite** - `while True` never ends
2. **Values printed**: `0 1 1 2 3 5 8 13 21 34`
   - First yield: a=0, then a,b = 1,1
   - Second yield: a=1, then a,b = 1,2
   - Third yield: a=1, then a,b = 2,3
   - And so on...
3. **Yes, but it continues from where it left off** - the generator is not exhausted (infinite)
   - `next(fib)` would give 55, 89, etc.
   - To restart, you'd need `fib = fibonacci()` (create new generator)

</details>

---

**Level 2 - Apply**: Modify the code

Create a generator function that yields batches of data with the following requirements:
- Takes a list and batch_size as parameters
- Yields batches as lists
- If there's remaining data that doesn't fill a batch, yield it as a partial batch
- Include batch number in yielded tuple: `(batch_num, batch_data)`

<details>
<summary><strong>Solution</strong></summary>

```python
def batched_data(data, batch_size):
    """Yield batches of data with batch numbers"""
    for i in range(0, len(data), batch_size):
        batch_num = i // batch_size
        batch = data[i:i + batch_size]
        yield (batch_num, batch)

# Test it
data = list(range(23))
for batch_num, batch in batched_data(data, batch_size=5):
    print(f"Batch {batch_num}: {batch}")

# Output:
# Batch 0: [0, 1, 2, 3, 4]
# Batch 1: [5, 6, 7, 8, 9]
# Batch 2: [10, 11, 12, 13, 14]
# Batch 3: [15, 16, 17, 18, 19]
# Batch 4: [20, 21, 22]  # Partial batch
```

**Alternative using enumerate**:
```python
def batched_data(data, batch_size):
    batch = []
    for i, item in enumerate(data):
        batch.append(item)
        if len(batch) == batch_size:
            yield (i // batch_size, batch)
            batch = []

    # Yield remaining items
    if batch:
        yield (len(data) // batch_size, batch)
```

</details>

---

**Level 3 - Create**: Build from scratch

Build a **DataPipeline** generator that:

1. Reads lines from a file (simulate with a list of strings)
2. Filters out lines that start with "#" (comments)
3. Converts each line to uppercase
4. Yields only lines longer than 10 characters
5. Adds line numbers to yielded results: `(line_num, processed_line)`

**Requirements**:
- Use generator functions (not list comprehensions)
- Chain multiple generators together
- Should work with arbitrarily large inputs (memory efficient)

<details>
<summary><strong>Solution</strong></summary>

```python
def read_lines(data):
    """Simulate reading lines from a file"""
    for line in data:
        yield line.strip()

def filter_comments(lines):
    """Filter out lines starting with #"""
    for line in lines:
        if not line.startswith("#"):
            yield line

def to_uppercase(lines):
    """Convert lines to uppercase"""
    for line in lines:
        yield line.upper()

def filter_by_length(lines, min_length=10):
    """Filter lines by minimum length"""
    for line in lines:
        if len(line) > min_length:
            yield line

def add_line_numbers(lines):
    """Add line numbers to results"""
    for i, line in enumerate(lines, start=1):
        yield (i, line)

# Sample data
data = [
    "short",
    "# this is a comment",
    "this is a valid line",
    "another valid line here",
    "# another comment",
    "small",
    "this line is definitely long enough"
]

# Build the pipeline
pipeline = read_lines(data)
pipeline = filter_comments(pipeline)
pipeline = to_uppercase(pipeline)
pipeline = filter_by_length(pipeline)
pipeline = add_line_numbers(pipeline)

# Execute the pipeline (nothing computed until here!)
for line_num, line in pipeline:
    print(f"{line_num}: {line}")

# Output:
# 1: THIS IS A VALID LINE
# 2: ANOTHER VALID LINE HERE
# 3: THIS LINE IS DEFINITELY LONG ENOUGH
```

**More elegant version using composition**:
```python
def data_pipeline(data, min_length=10):
    """Single generator that chains all transformations"""
    line_num = 0
    for line in data:
        line = line.strip()
        if line.startswith("#"):
            continue
        line = line.upper()
        if len(line) <= min_length:
            continue
        line_num += 1
        yield (line_num, line)

# Usage
for line_num, line in data_pipeline(data):
    print(f"{line_num}: {line}")
```

**Memory efficiency demonstration**:
```python
import sys

# List approach - all in memory
def list_pipeline(data):
    result = []
    for line in data:
        line = line.strip()
        if not line.startswith("#"):
            line = line.upper()
            if len(line) > 10:
                result.append(line)
    return result

# Generator approach - one at a time
def gen_pipeline(data):
    for line in data:
        line = line.strip()
        if not line.startswith("#"):
            line = line.upper()
            if len(line) > 10:
                yield line

# Compare memory
large_data = ["valid line number " + str(i) for i in range(100000)]

list_result = list_pipeline(large_data)
gen_result = gen_pipeline(large_data)

print(f"List size: {sys.getsizeof(list_result)} bytes")  # ~800KB
print(f"Generator size: {sys.getsizeof(gen_result)} bytes")  # ~120 bytes
```

</details>

## Common Mistakes

### ❌ Mistake 1: Trying to iterate a generator twice

```python
gen = (x * x for x in range(5))

print(list(gen))  # [0, 1, 4, 9, 16]
print(list(gen))  # [] - Empty! Generator exhausted
```

✅ **Fix**: Create a new generator or convert to list if you need multiple iterations
```python
# Option 1: Create new generator
gen1 = (x * x for x in range(5))
gen2 = (x * x for x in range(5))
print(list(gen1))
print(list(gen2))

# Option 2: Convert to list (if small data)
data = list(x * x for x in range(5))
print(data)
print(data)  # Can reuse
```

---

### ❌ Mistake 2: Using generator expression when you need indexing

```python
squares = (x * x for x in range(10))
print(squares[5])  # ❌ TypeError: 'generator' object is not subscriptable
```

✅ **Fix**: Use list comprehension when you need random access
```python
squares = [x * x for x in range(10)]  # List, not generator
print(squares[5])  # ✅ 25
```

---

### ❌ Mistake 3: Forgetting to "prime" a generator that uses send()

```python
def receiver():
    while True:
        value = yield
        print(f"Received: {value}")

gen = receiver()
gen.send(10)  # ❌ TypeError: can't send non-None value to a just-started generator
```

✅ **Fix**: Call `next()` first to advance to the first `yield`
```python
gen = receiver()
next(gen)  # Prime the generator
gen.send(10)  # ✅ Received: 10
```

---

### ❌ Mistake 4: Materializing entire generator unnecessarily

```python
# ❌ Bad - defeats the purpose of generators
data = (expensive_operation(x) for x in huge_dataset)
data_list = list(data)  # Loads everything into memory!

for item in data_list:
    if condition(item):
        process(item)
        break  # Only needed first match
```

✅ **Fix**: Iterate directly over generator
```python
# ✅ Good - processes items one at a time
data = (expensive_operation(x) for x in huge_dataset)

for item in data:
    if condition(item):
        process(item)
        break  # Stops early, didn't compute everything
```

---

### ❌ Mistake 5: Returning instead of yielding in generator

```python
def my_generator(n):
    for i in range(n):
        return i  # ❌ Returns immediately, only produces one value
```

✅ **Fix**: Use `yield` to produce multiple values
```python
def my_generator(n):
    for i in range(n):
        yield i  # ✅ Yields multiple values
```

## How This Connects

**Builds on**:
- [Functions](../01-fundamentals/04-functions.md) - Generators are special functions with `yield`
- [Control Flow](../01-fundamentals/03-control-flow.md) - for-loops use iterator protocol under the hood

**Related concepts**:
- **Context Managers** (Phase 3) - Generators can be used with `@contextmanager`
- **Async Programming** (Phase 3) - Async generators (`async def` + `yield`)
- **Itertools module** - Standard library tools for working with iterators

**Why this matters for AI/ML**:

1. **PyTorch DataLoader**:
   ```python
   from torch.utils.data import DataLoader

   # DataLoader yields batches (uses generators internally)
   for batch in DataLoader(dataset, batch_size=32):
       loss = model(batch)
   ```

2. **Streaming LLM Responses**:
   ```python
   def stream_llm_response(prompt):
       """Stream tokens as they're generated"""
       for token in llm.generate(prompt):
           yield token

   # User sees tokens appear in real-time
   for token in stream_llm_response("Explain AI"):
       print(token, end="", flush=True)
   ```

3. **Data Augmentation**:
   ```python
   def augment_images(images):
       """Infinite data augmentation"""
       while True:
           for img in images:
               yield img  # Original
               yield flip_horizontal(img)
               yield rotate(img, 15)
               yield add_noise(img)
   ```

4. **ETL Pipelines**:
   ```python
   def etl_pipeline(data_source):
       """Extract, transform, load - memory efficient"""
       extracted = extract_data(data_source)
       transformed = transform_data(extracted)
       loaded = load_data(transformed)
       return loaded
   ```

**Next steps**:
- [Error Handling](./04-error-handling.md) - Handle errors gracefully in generators

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. **How does Python implement the iterator protocol at the C level?**
   <details>
   <summary>Answer</summary>

   - Every iterable object has a `tp_iter` slot in its type object (C struct)
   - `iter()` calls `PyObject_GetIter()` which invokes `tp_iter`
   - `next()` calls `PyIter_Next()` which invokes `tp_iternext` slot
   - Generators are implemented as special frame objects that save state
   - Generator state includes:
     - Local variables (saved in frame's `f_localsplus`)
     - Instruction pointer (where to resume)
     - Exception state
   - When you call `next()`, Python:
     1. Restores the frame state
     2. Resumes execution at the saved instruction pointer
     3. Runs until next `yield` or function end
     4. Saves state again
   - This is why generators are memory-efficient - they don't store values, just state
   </details>

2. **What happens to memory when you create a generator vs a list?**
   <details>
   <summary>Answer</summary>

   **List**:
   ```python
   lst = [x for x in range(1000000)]
   # Memory: ~8MB for list + ~8 bytes per int = ~16MB total
   ```
   - Allocates array of pointers to objects
   - All objects created immediately
   - Stored contiguously in memory

   **Generator**:
   ```python
   gen = (x for x in range(1000000))
   # Memory: ~120 bytes (just the generator object)
   ```
   - Only stores:
     - Generator frame object (~88 bytes)
     - Code object reference
     - Closure variables
     - Current state (instruction pointer)
   - Objects created on-demand

   **Memory breakdown**:
   ```python
   import sys

   # List
   lst = [x for x in range(10000)]
   print(sys.getsizeof(lst))  # ~81,528 bytes

   # Generator
   gen = (x for x in range(10000))
   print(sys.getsizeof(gen))  # ~120 bytes

   # Generator with consumed values
   consumed = list(gen)  # Now it's a list
   print(sys.getsizeof(consumed))  # ~81,528 bytes
   ```

   **Key insight**: Generators trade memory for computation - you compute values as needed rather than storing them all.
   </details>

3. **Can generators be pickled? What are the implications?**
   <details>
   <summary>Answer</summary>

   **Short answer**: No, generators cannot be pickled by default.

   ```python
   import pickle

   def my_gen():
       yield 1
       yield 2

   gen = my_gen()
   pickle.dumps(gen)  # ❌ TypeError: cannot pickle 'generator' object
   ```

   **Why?**:
   - Generators contain executing frame state
   - Frame objects hold C pointers that can't be serialized
   - Code objects can be pickled, but not executing frames

   **Implications for ML**:
   - Can't use generators in multiprocessing.Pool
   - Can't checkpoint mid-iteration
   - Must recreate generators in worker processes

   **Workarounds**:
   ```python
   # ❌ Won't work
   from multiprocessing import Pool

   def process_batch(batch_gen):
       for batch in batch_gen:  # Can't pickle this
           train(batch)

   # ✅ Works - pass constructor
   def create_batch_gen(data, batch_size):
       return batched(data, batch_size)

   with Pool() as pool:
       # Pass the function and args, not the generator
       pool.apply_async(process_batch, (create_batch_gen, data, 32))
   ```

   **PyTorch's solution**:
   ```python
   # PyTorch DataLoader recreates generators in worker processes
   from torch.utils.data import DataLoader

   def worker_init_fn(worker_id):
       # Each worker creates its own generator
       np.random.seed(worker_id)

   loader = DataLoader(dataset, num_workers=4, worker_init_fn=worker_init_fn)
   ```
   </details>

4. **What's the performance difference between generator expressions and list comprehensions?**
   <details>
   <summary>Answer</summary>

   **Benchmark**:
   ```python
   import timeit

   # List comprehension
   list_time = timeit.timeit(
       '[x * x for x in range(10000)]',
       number=1000
   )
   print(f"List: {list_time:.4f}s")  # ~0.35s

   # Generator expression
   gen_time = timeit.timeit(
       'list((x * x for x in range(10000)))',
       number=1000
   )
   print(f"Generator: {gen_time:.4f}s")  # ~0.45s
   ```

   **Results**:
   - **Creation**: Generators are faster (nothing created)
   - **Full consumption**: Lists are ~20-30% faster (optimized in C)
   - **Partial consumption**: Generators win (don't compute unnecessary values)

   **When generators win**:
   ```python
   # Find first match in 1 million items
   def find_first():
       return next(x for x in range(1000000) if x > 50000)
   # Generator: ~0.001s (stops at 50001)

   def find_first_list():
       return [x for x in range(1000000) if x > 50000][0]
   # List: ~0.05s (creates entire list first)
   ```

   **Guideline**:
   - Small data, full iteration → List comprehension
   - Large data or early exit → Generator expression
   - Multiple iterations → List comprehension
   - Single iteration → Generator expression
   </details>

**Production Scenarios**:

1. **How do you implement efficient data streaming for ML training?**
   <details>
   <summary>Answer</summary>

   ```python
   import numpy as np
   from pathlib import Path

   def stream_training_data(
       data_dir: Path,
       batch_size: int,
       shuffle: bool = True,
       prefetch: int = 2
   ):
       """Efficient data streaming pipeline"""

       # Get all data files
       files = list(data_dir.glob("*.npy"))

       while True:  # Infinite epoch loop
           if shuffle:
               np.random.shuffle(files)

           # Stream files
           for file in files:
               # Load file lazily
               data = np.load(file, mmap_mode='r')  # Memory-mapped

               # Shuffle samples within file
               if shuffle:
                   indices = np.random.permutation(len(data))
               else:
                   indices = np.arange(len(data))

               # Yield batches
               for i in range(0, len(indices), batch_size):
                   batch_indices = indices[i:i + batch_size]
                   # Only load needed samples
                   batch = data[batch_indices]
                   yield batch

   # Usage in training loop
   for epoch in range(num_epochs):
       data_stream = stream_training_data(
           Path("data/train"),
           batch_size=32,
           shuffle=True
       )

       for batch in data_stream:
           loss = train_step(model, batch)
           if steps_done >= steps_per_epoch:
               break
   ```

   **Key techniques**:
   - Memory-mapped files (`mmap_mode='r'`)
   - Lazy loading (load files one at a time)
   - Shuffle at file level and sample level
   - Infinite generator for multi-epoch training
   - Early break for epoch boundaries

   **With prefetching**:
   ```python
   from concurrent.futures import ThreadPoolExecutor
   from queue import Queue

   def prefetch_generator(generator, prefetch_size=2):
       """Prefetch items in background thread"""
       queue = Queue(maxsize=prefetch_size)

       def producer():
           for item in generator:
               queue.put(item)
           queue.put(None)  # Sentinel

       import threading
       thread = threading.Thread(target=producer, daemon=True)
       thread.start()

       while True:
           item = queue.get()
           if item is None:
               break
           yield item

   # Usage
   data_stream = stream_training_data(data_dir, batch_size=32)
   prefetched = prefetch_generator(data_stream, prefetch_size=4)

   for batch in prefetched:
       train(batch)  # Next batch loads while training
   ```
   </details>

2. **What are the trade-offs of using generators in production ML pipelines?**
   <details>
   <summary>Answer</summary>

   **Advantages**:
   - ✅ Memory efficient (process TBs of data)
   - ✅ Lazy evaluation (compute only what's needed)
   - ✅ Composable pipelines (chain transformations)
   - ✅ Infinite data streams (online learning)
   - ✅ Early exit optimization

   **Disadvantages**:
   - ❌ Single-use (exhaust after one iteration)
   - ❌ No random access (can't seek to position)
   - ❌ Debugging harder (state hidden)
   - ❌ Can't pickle (multiprocessing issues)
   - ❌ Slightly slower iteration (vs lists)

   **Decision matrix**:

   | Scenario | Use Generator | Use List |
   |----------|--------------|----------|
   | Dataset > RAM | ✅ | ❌ |
   | Multiple epochs | ⚠️ Recreate each time | ✅ |
   | Distributed training | ⚠️ Complex | ✅ |
   | Data augmentation | ✅ | ❌ |
   | Hyperparameter search | ❌ | ✅ |
   | Online learning | ✅ | ❌ |
   | Batch inference | ⚠️ Depends on size | ⚠️ |

   **Real-world pattern** (PyTorch):
   ```python
   from torch.utils.data import Dataset, DataLoader

   class StreamingDataset(Dataset):
       """Dataset that streams from disk"""

       def __init__(self, file_list):
           self.files = file_list

       def __len__(self):
           # Required by DataLoader
           return len(self.files) * samples_per_file

       def __getitem__(self, idx):
           # DataLoader creates this per worker
           file_idx = idx // samples_per_file
           sample_idx = idx % samples_per_file
           return load_sample(self.files[file_idx], sample_idx)

   # DataLoader handles multiprocessing
   loader = DataLoader(
       StreamingDataset(files),
       batch_size=32,
       num_workers=4,  # Each worker has own generator
       prefetch_factor=2
   )
   ```

   **Best practice**:
   - Use generators for ETL and preprocessing
   - Convert to framework's data loader for training
   - Leverage framework's multiprocessing/prefetching
   - Profile to find bottlenecks (I/O vs compute)
   </details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#iterators-generators) for comprehensive list

## Summary

**In 3 sentences**:
- Iterators let you process items one at a time using the `__iter__` and `__next__` protocol, while generators are a simpler way to create iterators using the `yield` keyword
- Use generators for memory efficiency when processing large datasets, data streaming pipelines, or when you need lazy evaluation to compute values only when needed
- Generator expressions `(x for x in data)` are like list comprehensions but memory-efficient, perfect for chaining transformations without materializing intermediate results

**Key takeaway**: Generators are your secret weapon for handling datasets larger than RAM—they trade a bit of iteration speed for massive memory savings, letting you process TBs of data with GBs of memory by yielding one item at a time instead of loading everything at once!
