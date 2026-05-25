# Async Programming with asyncio

> **Before you start**: Understand [Functions](../01-fundamentals/04-functions.md), [Error Handling](../02-intermediate/04-error-handling.md), and [Iterators & Generators](../02-intermediate/03-iterators-generators.md)

## What is Async Programming with asyncio?

Async programming is a **concurrent programming paradigm** that allows you to write code that can handle multiple I/O operations simultaneously without blocking. Think of it like a restaurant: instead of one waiter (thread) serving one table at a time and waiting for each order to complete, async programming is like having one waiter who takes an order, starts it cooking, then moves to the next table while the first order cooks.

**Real-world analogy**: Async programming is like doing laundry while cooking dinner. You start the washing machine (non-blocking I/O), then start cooking (more work), and when the washer beeps (I/O completes), you move clothes to dryer. You're not parallelizing (not doing both simultaneously), you're just not waiting idle for the washer.

## Why This Matters for AI/ML

**You'll need async programming for**:
- Making concurrent API calls to LLM providers (OpenAI, Anthropic, etc.)
- Building AI agents that handle multiple tool calls simultaneously
- Streaming LLM responses in real-time (SSE, WebSocket)
- Async data loading pipelines that fetch from multiple sources
- ML inference services handling many concurrent requests
- Real-time data processing from multiple streams

**AI/ML Context**: Modern ML applications are I/O heavy - waiting for API responses, database queries, file reads. Traditional synchronous code wastes time waiting. Async lets you handle 1000s of concurrent LLM requests with minimal resources. For example, processing 100 documents with GPT-4 API calls: sync takes 100 * 2 seconds = 200s, async takes ~2 seconds (limited by API rate limits, not waiting).

## Core Concepts

### 1. Coroutines and async/await

**Coroutines** are functions defined with `async def` that can be paused and resumed.

```python
import asyncio

# Regular function - blocks until complete
def fetch_data():
    time.sleep(2)  # Blocks thread
    return "data"

# Async coroutine - can be paused
async def fetch_data_async():
    await asyncio.sleep(2)  # Yields control, doesn't block
    return "data"

# Running coroutines
async def main():
    # await pauses until coroutine completes
    result = await fetch_data_async()
    print(result)

# Run the event loop
asyncio.run(main())
```

**Key concepts**:
- `async def` creates a coroutine function
- `await` pauses coroutine until awaited operation completes
- Coroutines must be awaited or scheduled to run
- `asyncio.run()` creates event loop and runs coroutine

### 2. Event Loop

The **event loop** is the core of asyncio - it manages and schedules coroutines.

```python
import asyncio

async def task1():
    print("Task 1 starting")
    await asyncio.sleep(1)
    print("Task 1 done")

async def task2():
    print("Task 2 starting")
    await asyncio.sleep(0.5)
    print("Task 2 done")

async def main():
    # Schedule both tasks concurrently
    await asyncio.gather(task1(), task2())
    # Output:
    # Task 1 starting
    # Task 2 starting
    # Task 2 done  (after 0.5s)
    # Task 1 done  (after 1s)

asyncio.run(main())
```

### 3. Concurrent Execution

**asyncio.gather()** runs multiple coroutines concurrently:

```python
import asyncio
import aiohttp

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.text()

async def fetch_multiple():
    urls = [
        "https://api.example.com/data1",
        "https://api.example.com/data2",
        "https://api.example.com/data3",
    ]

    async with aiohttp.ClientSession() as session:
        # Run all requests concurrently
        results = await asyncio.gather(
            *[fetch_url(session, url) for url in urls]
        )
    return results

# 3 requests in parallel, ~1x time instead of 3x
```

### 4. Tasks

**Tasks** wrap coroutines and schedule them for execution:

```python
import asyncio

async def long_task():
    await asyncio.sleep(5)
    return "done"

async def main():
    # Create task - starts running immediately
    task = asyncio.create_task(long_task())

    # Do other work while task runs
    print("Task running in background...")
    await asyncio.sleep(1)
    print("Still running...")

    # Wait for task to complete
    result = await task
    print(f"Task result: {result}")

asyncio.run(main())
```

### 5. Async Context Managers

Async version of context managers for async resource management:

```python
import asyncio
import aiohttp

# Async context manager
async def process_api():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://api.example.com") as response:
            data = await response.json()
            return data

# Custom async context manager
class AsyncDatabase:
    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def connect(self):
        await asyncio.sleep(0.1)  # Simulate connection
        print("Connected")

    async def close(self):
        await asyncio.sleep(0.1)  # Simulate cleanup
        print("Closed")
```

## Try It

**Exercise 1**: Basic async function

```python
import asyncio

async def greet(name, delay):
    await asyncio.sleep(delay)
    print(f"Hello, {name}!")

async def main():
    # Sequential - takes 3 seconds
    await greet("Alice", 1)
    await greet("Bob", 2)

    # Concurrent - takes 2 seconds (max of both)
    await asyncio.gather(
        greet("Alice", 1),
        greet("Bob", 2)
    )

asyncio.run(main())
```

**Exercise 2**: Async API calls (simulated)

```python
import asyncio
import random

async def call_llm_api(prompt, model="gpt-4"):
    # Simulate API call delay
    delay = random.uniform(0.5, 2.0)
    await asyncio.sleep(delay)
    return f"Response to: {prompt[:30]}..."

async def process_documents(documents):
    # Process all documents concurrently
    tasks = [call_llm_api(doc) for doc in documents]
    results = await asyncio.gather(*tasks)
    return results

async def main():
    docs = [f"Document {i} content..." for i in range(10)]

    import time
    start = time.time()
    results = await process_documents(docs)
    elapsed = time.time() - start

    print(f"Processed {len(results)} documents in {elapsed:.2f}s")
    # ~2s instead of 10-20s synchronously

asyncio.run(main())
```

**Exercise 3**: Async generators

```python
import asyncio

async def async_range(start, stop):
    """Async generator for streaming data"""
    for i in range(start, stop):
        await asyncio.sleep(0.1)  # Simulate I/O
        yield i

async def consume_stream():
    async for value in async_range(0, 10):
        print(f"Received: {value}")

asyncio.run(consume_stream())
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between `async def` and regular `def`?
2. **Why** can't you use `await` in a regular (non-async) function?
3. **When** should you use `asyncio.gather()` vs `asyncio.create_task()`?
4. **How** does the event loop decide which coroutine to run next?
5. **Compare**: Threading vs async - which is better for I/O-bound tasks?

<details>
<summary>Click to reveal answers</summary>

1. **`async def` creates a coroutine function** that returns a coroutine object when called. Regular `def` executes immediately. Coroutines must be awaited or scheduled. Example: `async def fetch()` returns a coroutine, `def fetch()` executes immediately.

2. **`await` requires async context** because it pauses execution and yields control to the event loop. Regular functions don't have this pause/resume mechanism. Only coroutines (async functions) can be paused. If you need to call async code from sync code, use `asyncio.run()`.

3. **`asyncio.gather()` waits for multiple coroutines** and returns their results in order. Use when you want all results together. **`asyncio.create_task()` schedules one coroutine** and returns immediately, letting it run in background. Use when you want to start work early or don't need result immediately.

4. **The event loop uses cooperative multitasking**. When a coroutine hits `await`, it yields control back to the loop. The loop picks the next ready coroutine (one whose awaited operation completed). No preemption - coroutines must explicitly yield with `await`.

5. **Async is better for I/O-bound tasks** because it's lightweight (no thread overhead), scales to 1000s of concurrent operations, and avoids GIL issues. Threading has overhead, context switching costs, and GIL contention. Use threading for CPU-bound tasks with multiprocessing, async for I/O-bound tasks (APIs, databases, files).

</details>

## Practice Exercises

**Level 1 - Understand**:

Create `async_basics.py`:

```python
import asyncio
import time

async def fetch_data(source, delay):
    print(f"Fetching from {source}...")
    await asyncio.sleep(delay)
    return f"Data from {source}"

async def main():
    # Time sequential execution
    start = time.time()
    result1 = await fetch_data("API-1", 1)
    result2 = await fetch_data("API-2", 1)
    result3 = await fetch_data("API-3", 1)
    print(f"Sequential: {time.time() - start:.2f}s")

    # Time concurrent execution
    start = time.time()
    results = await asyncio.gather(
        fetch_data("API-1", 1),
        fetch_data("API-2", 1),
        fetch_data("API-3", 1)
    )
    print(f"Concurrent: {time.time() - start:.2f}s")
    print(results)

asyncio.run(main())
```

**Level 2 - Apply**:

Create async LLM batch processor:

```python
import asyncio
import random

async def call_llm(prompt, model="gpt-4"):
    """Simulate LLM API call"""
    await asyncio.sleep(random.uniform(0.5, 1.5))
    return {
        "prompt": prompt,
        "response": f"Generated response for: {prompt[:30]}...",
        "model": model,
        "tokens": random.randint(50, 200)
    }

async def process_batch(prompts, max_concurrent=5):
    """Process prompts with concurrency limit"""
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_call(prompt):
        async with semaphore:
            return await call_llm(prompt)

    return await asyncio.gather(*[limited_call(p) for p in prompts])

async def main():
    prompts = [f"Prompt {i}: Analyze this data..." for i in range(20)]

    import time
    start = time.time()
    results = await process_batch(prompts, max_concurrent=5)
    elapsed = time.time() - start

    total_tokens = sum(r["tokens"] for r in results)
    print(f"Processed {len(results)} prompts in {elapsed:.2f}s")
    print(f"Total tokens: {total_tokens}")
    print(f"Avg time per prompt: {elapsed/len(results):.2f}s")

asyncio.run(main())
```

**Level 3 - Create**:

Build async streaming LLM response handler:

<details>
<summary>Solution</summary>

```python
import asyncio
import random

class StreamingLLM:
    """Simulate streaming LLM responses"""

    async def stream_response(self, prompt):
        """Stream response word by word"""
        words = ["This", "is", "a", "streaming", "response", "from", "the", "LLM"]
        for word in words:
            await asyncio.sleep(random.uniform(0.1, 0.3))
            yield word

    async def generate(self, prompt):
        """Generate complete response by collecting stream"""
        response = []
        async for word in self.stream_response(prompt):
            response.append(word)
        return " ".join(response)

async def handle_multiple_streams():
    """Handle multiple streaming requests concurrently"""
    llm = StreamingLLM()
    prompts = [
        "Explain async programming",
        "What is machine learning?",
        "How do neural networks work?"
    ]

    async def stream_with_id(prompt_id, prompt):
        print(f"\n[Stream {prompt_id}] Starting...")
        response = []
        async for word in llm.stream_response(prompt):
            response.append(word)
            print(f"[Stream {prompt_id}] {word}", end=" ", flush=True)
        print(f"\n[Stream {prompt_id}] Complete!")
        return " ".join(response)

    # Process all streams concurrently
    results = await asyncio.gather(*[
        stream_with_id(i, prompt)
        for i, prompt in enumerate(prompts)
    ])

    return results

async def main():
    print("Starting concurrent streaming...")
    results = await handle_multiple_streams()

    print("\n" + "="*50)
    print("All streams completed!")
    for i, result in enumerate(results):
        print(f"\nResponse {i}: {result}")

asyncio.run(main())
```

</details>

## Common Mistakes

❌ **Mistake 1**: Forgetting `await`

```python
# Wrong - returns coroutine object, doesn't execute
async def main():
    result = fetch_data()  # Returns <coroutine object>
    print(result)  # Prints: <coroutine object fetch_data>
```

✅ **Instead**: Always await coroutines

```python
# Correct
async def main():
    result = await fetch_data()
    print(result)
```

---

❌ **Mistake 2**: Mixing sync and async incorrectly

```python
# Wrong - can't await in sync function
def sync_function():
    result = await async_function()  # SyntaxError
```

✅ **Instead**: Use `asyncio.run()` to bridge sync/async

```python
# Correct
def sync_function():
    result = asyncio.run(async_function())
    return result
```

---

❌ **Mistake 3**: Blocking the event loop

```python
# Wrong - blocks event loop
async def process():
    time.sleep(5)  # BLOCKS entire loop!
    return "done"
```

✅ **Instead**: Use async sleep or run_in_executor for blocking code

```python
# Correct - async sleep
async def process():
    await asyncio.sleep(5)
    return "done"

# Or run blocking code in thread pool
async def process_blocking():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, blocking_function)
    return result
```

---

❌ **Mistake 4**: Not handling task exceptions

```python
# Wrong - exception in task crashes silently
async def main():
    task = asyncio.create_task(failing_function())
    # If we don't await task, exception is lost
```

✅ **Instead**: Always await tasks or handle exceptions

```python
# Correct
async def main():
    task = asyncio.create_task(failing_function())
    try:
        await task
    except Exception as e:
        print(f"Task failed: {e}")
```

---

❌ **Mistake 5**: Using global event loop

```python
# Wrong - deprecated in Python 3.10+
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
```

✅ **Instead**: Use `asyncio.run()`

```python
# Correct
asyncio.run(main())
```

## How This Connects

**Builds on**:
- [Functions](../01-fundamentals/04-functions.md) - Coroutines are special functions
- [Error Handling](../02-intermediate/04-error-handling.md) - Async error handling patterns
- [Iterators & Generators](../02-intermediate/03-iterators-generators.md) - Async generators extend this concept

**Related concepts**:
- [Decorators](../02-intermediate/01-decorators.md) - Async function decorators
- [Context Managers](../02-intermediate/04-error-handling.md) - Async context managers
- [Type Hints](./01-type-hints.md) - Typing async functions

**Why this matters for AI**:
- **LLM APIs**: Most modern LLM libraries use async (OpenAI SDK, Anthropic SDK)
- **Agent systems**: Concurrent tool execution and decision-making
- **Data pipelines**: Async data loading from multiple sources
- **Real-time**: Streaming responses, live data processing
- **Scale**: Handle 1000s of concurrent requests efficiently

**Next steps**:
- [Concurrency Patterns](./03-concurrency-patterns.md) - Advanced async patterns
- Learn async libraries: aiohttp, asyncpg, motor (MongoDB)
- Build async ML inference services with FastAPI

## Deep Dive Questions (Expert Level)

> **For 12+ years experience**: These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. How does `asyncio` work under the hood? What is an event loop and how does it schedule coroutines?

<details>
<summary>Answer: Event loop uses selector-based I/O multiplexing; coroutines yield control via await</summary>

**Explanation**:
The asyncio event loop is built on I/O multiplexing using `select`, `epoll` (Linux), `kqueue` (macOS), or `IOCP` (Windows). When you `await` an I/O operation, the coroutine registers a callback with the event loop and yields control. The event loop monitors file descriptors for readiness using the OS selector API, and when I/O completes, it resumes the waiting coroutine.

Internally, coroutines are implemented using Python generators with `send()` and `throw()` methods. When you `await`, the coroutine yields a Future or Task object. The event loop maintains a ready queue (coroutines that can run) and a waiting queue (coroutines blocked on I/O). It runs coroutines from the ready queue until they yield, checks the selector for completed I/O, moves newly-ready coroutines to the ready queue, and repeats.

The magic happens in `await`: it's syntactic sugar for `yield from` which suspends the coroutine and returns control to the event loop. The event loop then schedules other ready coroutines. When the awaited operation completes (Future resolves), the event loop resumes the coroutine by calling its `send()` method with the result.

**Example**:
```python
import asyncio
import selectors

# Simplified event loop concept
class SimpleEventLoop:
    def __init__(self):
        self.ready = []  # Coroutines ready to run
        self.waiting = {}  # Coroutines waiting on I/O
        self.selector = selectors.DefaultSelector()

    def run_until_complete(self, coro):
        task = Task(coro)
        self.ready.append(task)

        while self.ready or self.waiting:
            # Run all ready coroutines
            while self.ready:
                task = self.ready.pop(0)
                try:
                    # Resume coroutine, get what it's waiting for
                    future = task.step()
                    if not task.done:
                        self.waiting[future] = task
                except StopIteration:
                    pass  # Coroutine completed

            # Wait for I/O using selector
            events = self.selector.select(timeout=0.1)
            for key, mask in events:
                future = key.data
                if future in self.waiting:
                    task = self.waiting.pop(future)
                    self.ready.append(task)

# Real asyncio internals
async def demo():
    await asyncio.sleep(0)  # Yields control to event loop

# Check event loop state
import asyncio
loop = asyncio.get_event_loop()
print(f"Event loop: {loop}")  # e.g., <_UnixSelectorEventLoop>
print(f"Selector: {loop._selector}")  # OS-specific selector
```

**In Practice**:
Understanding event loops helps debug async issues. If your async service becomes unresponsive, check: (1) Are you blocking the event loop with `time.sleep()` or CPU-heavy work? Use `await asyncio.sleep()` or `loop.run_in_executor()`. (2) Are too many coroutines waiting? Check with `asyncio.all_tasks()`. (3) Is the selector overwhelmed? Monitor with `len(loop._selector.get_map())`. For ML services handling many LLM API calls, the event loop efficiently multiplexes 1000s of concurrent requests using a single thread because it's all I/O-bound.

**Key Takeaway**: The event loop uses OS-level I/O multiplexing (epoll/kqueue/IOCP); coroutines yield control via await, and the loop schedules them cooperatively - no threads needed for I/O concurrency.

</details>

2. What's the difference between `async def` and `def` that returns a coroutine? Can you have async lambdas?

<details>
<summary>Answer: `async def` is syntactic sugar creating coroutine functions; no async lambdas but can return awaitable</summary>

**Explanation**:
`async def` creates a coroutine function - when called, it returns a coroutine object without executing the body. A regular `def` that returns a coroutine (e.g., by calling another async function) is NOT a coroutine function - it's a regular function that returns an awaitable. The difference matters for introspection, type checking, and how the function is called.

Python doesn't support async lambdas (`async lambda: await x`) because lambdas are expressions, and `await` is a statement in the function body. However, you can create regular lambdas that return coroutines by calling async functions: `lambda x: async_func(x)`.

The underlying implementation: `async def` tells Python to use the `CO_COROUTINE` flag in the function's code object and wrap the generator-based implementation in a coroutine wrapper. Regular functions don't get this flag, so even if they return coroutines, they're not coroutine functions themselves.

**Example**:
```python
import asyncio
import inspect

# Coroutine function - async def
async def coro_func():
    await asyncio.sleep(0)
    return "result"

# Regular function returning coroutine
def regular_func():
    return coro_func()  # Returns a coroutine

# Check types
print(inspect.iscoroutinefunction(coro_func))    # True
print(inspect.iscoroutinefunction(regular_func)) # False

# Both return coroutines when called
c1 = coro_func()
c2 = regular_func()
print(inspect.iscoroutine(c1))  # True
print(inspect.iscoroutine(c2))  # True

# No async lambda - SyntaxError
# f = async lambda x: await asyncio.sleep(x)

# But can return coroutines from lambda
async def delay(x):
    await asyncio.sleep(x)
    return x

# Lambda that returns coroutine (not async lambda)
f = lambda x: delay(x)
result = asyncio.run(f(0.1))  # Works

# Practical difference for type hints
from typing import Awaitable, Coroutine

async def typed_coro() -> str:  # Coroutine function
    return "result"

def returns_coro() -> Coroutine[None, None, str]:  # Returns coroutine
    return typed_coro()

# For decorators - need to detect coroutine functions
def my_decorator(func):
    if inspect.iscoroutinefunction(func):
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    else:
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
```

**In Practice**:
This matters when building decorators, middleware, or frameworks that need to handle both sync and async functions differently. For example, FastAPI detects if your endpoint is `async def` to run it in the event loop or thread pool. In ML agent frameworks, you might have tool functions that are async or sync - you need `inspect.iscoroutinefunction()` to call them correctly. Type checkers like mypy also distinguish between coroutine functions and functions returning coroutines for proper type validation.

**Key Takeaway**: `async def` creates coroutine functions (detected by `iscoroutinefunction`); regular functions can return coroutines but aren't coroutine functions; no async lambdas exist, but lambdas can return coroutines.

</details>

3. Explain `asyncio.gather()` vs `asyncio.wait()` vs `asyncio.as_completed()`. When do you use each?

<details>
<summary>Answer: gather returns ordered results; wait gives control over completion strategy; as_completed yields in completion order</summary>

**Explanation**:
**`asyncio.gather(*coros)`** runs coroutines concurrently and returns results in the **same order** as input, waiting for all to complete. Returns a list of results. If any raises an exception, gather cancels remaining tasks and propagates the exception (unless `return_exceptions=True`). Use when you want all results and order matters.

**`asyncio.wait(tasks)`** gives low-level control with strategies: `ALL_COMPLETED` (wait for all), `FIRST_COMPLETED` (return when first finishes), `FIRST_EXCEPTION` (return when first exception). Returns two sets: done and pending tasks. You must manually extract results/exceptions. Use when you need fine-grained control over completion conditions.

**`asyncio.as_completed(tasks)`** returns an iterator yielding tasks as they complete (completion order, not input order). Use when you want to process results as soon as available, not wait for slowest task. Great for showing progress or early termination.

Key difference: gather is high-level (returns results), wait is low-level (returns tasks), as_completed is streaming (yields tasks as they finish).

**Example**:
```python
import asyncio
import random

async def task(name, delay):
    await asyncio.sleep(delay)
    if name == "task2":
        raise ValueError(f"{name} failed!")
    return f"{name} completed"

async def demo_gather():
    """gather - ordered results, all or nothing"""
    try:
        results = await asyncio.gather(
            task("task1", 1),
            task("task2", 0.5),  # Will fail
            task("task3", 0.3),
            return_exceptions=False  # Propagate exception
        )
    except ValueError as e:
        print(f"gather failed: {e}")
        # All tasks cancelled on exception

    # With return_exceptions=True
    results = await asyncio.gather(
        task("task1", 1),
        task("task2", 0.5),
        task("task3", 0.3),
        return_exceptions=True  # Exceptions as values
    )
    print(f"gather results: {results}")
    # ['task1 completed', ValueError(...), 'task3 completed']

async def demo_wait():
    """wait - fine control over completion"""
    tasks = {
        asyncio.create_task(task(f"task{i}", random.random()))
        for i in range(5)
    }

    # Wait for first completion
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )

    print(f"First completed: {done}")
    print(f"Still pending: {len(pending)}")

    # Cancel remaining
    for task in pending:
        task.cancel()

    # Extract results
    for task in done:
        try:
            result = task.result()
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {e}")

async def demo_as_completed():
    """as_completed - process results as they finish"""
    tasks = [
        task(f"task{i}", random.random())
        for i in range(5)
    ]

    for coro in asyncio.as_completed(tasks):
        try:
            result = await coro
            print(f"Finished: {result}")  # In completion order!
        except Exception as e:
            print(f"Failed: {e}")

# Run examples
asyncio.run(demo_gather())
asyncio.run(demo_wait())
asyncio.run(demo_as_completed())
```

**In Practice**:
**ML use cases**:
- **gather**: Batch LLM API calls where you need all responses - `results = await asyncio.gather(*[call_gpt(p) for p in prompts])`
- **wait**: Agent tool calls where first success is enough - race multiple tool providers, use first result
- **as_completed**: Processing documents where you show progress bar or stream results - update UI as each completes

For ML inference services: use gather for batch requests, as_completed for streaming responses, wait for timeout control (kill slow requests).

**Key Takeaway**: Use gather for ordered results from all tasks; wait for fine control (FIRST_COMPLETED, timeouts); as_completed for processing results in completion order.

</details>

4. What is the difference between concurrency and parallelism in Python? Why does async provide concurrency but not parallelism?

<details>
<summary>Answer: Concurrency is task-switching (one CPU); parallelism is simultaneous execution (multiple CPUs); async is concurrent, not parallel due to GIL</summary>

**Explanation**:
**Concurrency** is about dealing with multiple tasks at once through interleaving - one CPU switches between tasks. Like a chef cooking multiple dishes by moving between them. **Parallelism** is about doing multiple tasks simultaneously - multiple CPUs executing at the same instant. Like multiple chefs each cooking a dish.

Async provides concurrency: one thread switches between coroutines when they `await` I/O. It's efficient for I/O-bound work because you're not waiting idle. But it's NOT parallel - only one coroutine executes at a time due to Python's GIL (Global Interpreter Lock). The GIL ensures only one thread executes Python bytecode at a time, even on multi-core CPUs.

For CPU-bound work (math, data processing), async provides no benefit because there's no I/O to wait for - you need actual parallelism via multiprocessing (separate processes, each with own GIL). For I/O-bound work (APIs, databases), async is perfect because you're multiplexing I/O, not CPU.

**Example**:
```python
import asyncio
import time
import multiprocessing

# CPU-bound task
def cpu_task():
    total = sum(i * i for i in range(10_000_000))
    return total

# I/O-bound task
async def io_task():
    await asyncio.sleep(1)  # Simulates I/O
    return "done"

# Concurrency with async (I/O-bound)
async def concurrent_io():
    start = time.time()
    results = await asyncio.gather(*[io_task() for _ in range(10)])
    print(f"Async (concurrent): {time.time() - start:.2f}s")  # ~1s

# No benefit for CPU-bound
async def concurrent_cpu():
    start = time.time()
    loop = asyncio.get_event_loop()
    # Even with run_in_executor, limited by GIL in threads
    results = await asyncio.gather(*[
        loop.run_in_executor(None, cpu_task) for _ in range(4)
    ])
    print(f"Async CPU (threads): {time.time() - start:.2f}s")  # ~4x single task time

# True parallelism with multiprocessing
def parallel_cpu():
    start = time.time()
    with multiprocessing.Pool(4) as pool:
        results = pool.map(cpu_task, range(4))
    print(f"Multiprocessing (parallel): {time.time() - start:.2f}s")  # ~1x single task time

# Run examples
asyncio.run(concurrent_io())      # Fast - concurrent I/O
asyncio.run(concurrent_cpu())     # Slow - GIL prevents parallelism
parallel_cpu()                     # Fast - true parallelism

# Visual explanation
print("\nConcurrency (async):")
print("Task1: [===wait===][===wait===]")
print("Task2:      [===wait===][===wait===]")
print("Task3:           [===wait===][===wait===]")
print("CPU:   [1][2][3][1][2][3][1][2][3]  (switching)")
print("Total time: max(task times), not sum")

print("\nParallelism (multiprocessing):")
print("CPU1:  [======Task1======]")
print("CPU2:  [======Task2======]")
print("CPU3:  [======Task3======]")
print("Total time: single task time")
```

**In Practice**:
**ML scenarios**:
- **Async**: LLM API calls, database queries, file I/O, web scraping - all I/O-bound, benefit from concurrency
- **Multiprocessing**: Model training, data preprocessing, image processing - CPU-bound, need parallelism
- **Threading**: Generally avoid in Python due to GIL, except for I/O that releases GIL (NumPy, C extensions)

For ML inference: async handles concurrent requests (I/O), but actual model inference might use threading (PyTorch/TensorFlow release GIL) or multiprocessing (batch prediction workers).

**Key Takeaway**: Async gives concurrency (task-switching on one CPU) for I/O-bound work; use multiprocessing for parallelism (multiple CPUs) for CPU-bound work; GIL prevents Python-level parallelism in threads.

</details>

5. How do you handle blocking I/O in an async application without blocking the event loop?

<details>
<summary>Answer: Use run_in_executor to run blocking code in thread/process pool</summary>

**Explanation**:
Blocking I/O (like `requests.get()`, `open().read()`, `time.sleep()`, or CPU-heavy code) blocks the entire event loop because it doesn't yield control back. The solution is `loop.run_in_executor()` which runs blocking code in a separate thread or process pool, allowing the event loop to continue.

By default, `run_in_executor(None, func)` uses a ThreadPoolExecutor. For CPU-bound work, pass a ProcessPoolExecutor. The executor runs the blocking function and returns a Future that you can await. This bridges sync and async code.

Common scenario: You have a legacy library that's sync-only (like many ML libraries) and need to use it in an async application. Instead of rewriting it, wrap calls in `run_in_executor`. The trade-off: threads/processes have overhead, so don't use for trivial operations.

**Example**:
```python
import asyncio
import time
import requests
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# Blocking functions
def blocking_io():
    """Sync I/O that doesn't release GIL"""
    time.sleep(2)  # Simulates blocking I/O
    return "I/O result"

def blocking_request(url):
    """Sync HTTP request"""
    response = requests.get(url)
    return response.text

def cpu_intensive():
    """CPU-bound work"""
    total = sum(i * i for i in range(10_000_000))
    return total

# WRONG: Blocks event loop
async def bad_async():
    result = blocking_io()  # BLOCKS entire loop!
    return result

# CORRECT: Run in executor
async def good_async():
    loop = asyncio.get_event_loop()

    # Run blocking I/O in thread pool
    result = await loop.run_in_executor(None, blocking_io)
    return result

# Multiple blocking calls concurrently
async def concurrent_blocking():
    loop = asyncio.get_event_loop()

    # Run multiple blocking operations concurrently
    results = await asyncio.gather(
        loop.run_in_executor(None, blocking_io),
        loop.run_in_executor(None, blocking_io),
        loop.run_in_executor(None, blocking_io)
    )
    return results

# Custom executor for control
async def with_custom_executor():
    # More threads for I/O-bound
    executor = ThreadPoolExecutor(max_workers=10)
    loop = asyncio.get_event_loop()

    urls = ["https://example.com"] * 10
    tasks = [
        loop.run_in_executor(executor, blocking_request, url)
        for url in urls
    ]

    results = await asyncio.gather(*tasks)
    executor.shutdown()
    return results

# CPU-bound work in process pool
async def cpu_bound_async():
    executor = ProcessPoolExecutor(max_workers=4)
    loop = asyncio.get_event_loop()

    # Run CPU-intensive work in separate processes
    results = await asyncio.gather(*[
        loop.run_in_executor(executor, cpu_intensive)
        for _ in range(4)
    ])

    executor.shutdown()
    return results

# ML example: Sync model inference in async service
import pickle

class SyncMLModel:
    def predict(self, data):
        time.sleep(0.5)  # Simulates inference time
        return {"prediction": "class_A", "confidence": 0.95}

async def async_inference_service(model, requests):
    """Async service wrapping sync model"""
    loop = asyncio.get_event_loop()

    # Run predictions concurrently in thread pool
    tasks = [
        loop.run_in_executor(None, model.predict, req)
        for req in requests
    ]

    return await asyncio.gather(*tasks)

# Test
async def main():
    # Bad approach - blocks event loop
    start = time.time()
    # await bad_async()  # Would block for 2s

    # Good approach - concurrent
    start = time.time()
    result = await concurrent_blocking()
    print(f"Concurrent blocking: {time.time() - start:.2f}s")  # ~2s, not 6s

    # ML inference
    model = SyncMLModel()
    reqs = [{"data": f"request_{i}"} for i in range(10)]
    start = time.time()
    predictions = await async_inference_service(model, reqs)
    print(f"Async inference: {time.time() - start:.2f}s")
    print(f"Predictions: {len(predictions)}")

asyncio.run(main())
```

**In Practice**:
**ML scenarios**:
- **Legacy models**: Sync scikit-learn/XGBoost models in async FastAPI - wrap `model.predict()` in executor
- **File I/O**: Reading large datasets with sync libraries - run in executor while serving other requests
- **Preprocessing**: CPU-heavy transforms (image resizing, tokenization) - use ProcessPoolExecutor
- **Database**: Sync database clients (psycopg2) - wrap queries in executor or use async clients (asyncpg)

**Pro tip**: Prefer native async libraries when available (aiohttp over requests, asyncpg over psycopg2, motor over pymongo). Only use executors as a fallback for sync-only code.

**Key Takeaway**: Use `loop.run_in_executor()` to run blocking code in threads/processes without blocking event loop; prefer ThreadPoolExecutor for I/O, ProcessPoolExecutor for CPU-bound work.

</details>

6. What are async context managers and async generators? How do they differ from regular ones?

<details>
<summary>Answer: Async context managers use `__aenter__`/`__aexit__`; async generators yield in async functions with `async for`</summary>

**Explanation**:
**Async context managers** implement `__aenter__` and `__aexit__` (async versions of `__enter__`/`__exit__`). They're used with `async with` and allow cleanup code that needs to await (like closing database connections). Regular context managers can't await in their methods.

**Async generators** are async functions that use `yield` to produce values. They're consumed with `async for` which awaits each yielded value. Useful for streaming data where producing each value involves async operations (API calls, database queries). Regular generators can't await.

The key difference: async versions can pause during entry/exit (context managers) or while producing values (generators), allowing other coroutines to run. This is essential when setup, cleanup, or data production involves I/O.

**Example**:
```python
import asyncio
import aiohttp

# Async context manager - manual implementation
class AsyncDatabase:
    async def __aenter__(self):
        """Setup - can await connection"""
        print("Connecting to database...")
        await asyncio.sleep(0.1)  # Simulate async connection
        self.connection = "DB Connection"
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Cleanup - can await disconnection"""
        print("Closing database...")
        await asyncio.sleep(0.1)  # Simulate async cleanup
        self.connection = None
        return False  # Don't suppress exceptions

    async def query(self, sql):
        await asyncio.sleep(0.1)
        return f"Result of {sql}"

# Using async context manager
async def use_database():
    async with AsyncDatabase() as db:
        result = await db.query("SELECT * FROM users")
        print(result)
    # __aexit__ called here, connection closed

# Async context manager with decorator
from contextlib import asynccontextmanager

@asynccontextmanager
async def async_file_reader(filename):
    """Simulated async file operations"""
    print(f"Opening {filename}")
    await asyncio.sleep(0.1)  # Simulate async open
    file_handle = f"Handle to {filename}"

    try:
        yield file_handle
    finally:
        print(f"Closing {filename}")
        await asyncio.sleep(0.1)  # Simulate async close

async def use_file():
    async with async_file_reader("data.txt") as f:
        print(f"Reading from {f}")

# Async generators
async def async_range(n):
    """Async generator - yields values asynchronously"""
    for i in range(n):
        await asyncio.sleep(0.1)  # Simulate async data fetch
        yield i

async def consume_async_generator():
    async for value in async_range(5):
        print(f"Received: {value}")

# Async generator for streaming API data
async def fetch_paginated_data(base_url, pages):
    """Stream data from paginated API"""
    async with aiohttp.ClientSession() as session:
        for page in range(1, pages + 1):
            url = f"{base_url}?page={page}"
            async with session.get(url) as response:
                data = await response.json()
                yield data  # Stream each page as it arrives

async def process_streaming_data():
    async for page_data in fetch_paginated_data("https://api.example.com/data", 10):
        print(f"Processing page with {len(page_data)} items")
        # Process each page as it arrives, don't wait for all

# ML example: Streaming LLM tokens
async def stream_llm_tokens(prompt):
    """Simulated LLM token streaming"""
    tokens = ["This", "is", "a", "stream", "of", "tokens"]
    for token in tokens:
        await asyncio.sleep(0.1)  # Simulate API delay
        yield token

async def consume_llm_stream():
    full_response = []
    async for token in stream_llm_tokens("Hello world"):
        full_response.append(token)
        print(token, end=" ", flush=True)
    print(f"\n\nComplete response: {' '.join(full_response)}")

# Async generator with context manager - resource cleanup
async def async_batch_loader(files, batch_size=10):
    """Load data in batches asynchronously"""
    async with aiohttp.ClientSession() as session:  # Async context manager
        for i in range(0, len(files), batch_size):
            batch = files[i:i + batch_size]
            # Fetch batch concurrently
            tasks = [fetch_file(session, f) for f in batch]
            results = await asyncio.gather(*tasks)
            yield results  # Yield batch when ready

async def fetch_file(session, filename):
    await asyncio.sleep(0.1)
    return f"data from {filename}"

async def process_batches():
    files = [f"file_{i}.txt" for i in range(50)]
    async for batch in async_batch_loader(files, batch_size=10):
        print(f"Processing batch of {len(batch)} files")

# Run examples
async def main():
    await use_database()
    await use_file()
    await consume_async_generator()
    await consume_llm_stream()
    await process_batches()

asyncio.run(main())
```

**In Practice**:
**ML scenarios**:
- **Async context managers**: Database connections, API clients, model resource locks
  ```python
  async with AsyncModelServer() as model:
      result = await model.predict(data)
  ```
- **Async generators**: Streaming LLM responses, paginated API data, dataset iteration
  ```python
  async for chunk in dataset.stream_batches():
      await process(chunk)
  ```

**Real example - OpenAI streaming**:
```python
import openai

async def stream_gpt_response(prompt):
    async with aiohttp.ClientSession() as session:  # Async context manager
        async for chunk in openai.ChatCompletion.acreate(  # Async generator
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        ):
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

**Key Takeaway**: Async context managers handle async setup/cleanup with `async with`; async generators stream async data with `async for`; both allow awaiting, unlike regular versions.

</details>

**Production Scenarios**:

1. How do you handle async API calls to LLM providers (OpenAI, Anthropic) at scale?

<details>
<summary>Answer: Use rate limiting, connection pooling, retries, and graceful error handling</summary>

**Explanation**:
Scaling async LLM calls requires handling: (1) **Rate limits** - APIs have requests/minute caps, use semaphores or token buckets, (2) **Connection pooling** - reuse HTTP connections with session management, (3) **Retries** - handle transient failures with exponential backoff, (4) **Error handling** - gracefully handle timeouts, overloads, and quota exceeded, (5) **Concurrency limits** - don't overwhelm your service or theirs.

Use `aiohttp.ClientSession` for connection pooling (don't create per-request). Implement semaphore-based rate limiting to stay within API limits. Add retry logic with exponential backoff for 429/500 errors. Monitor latencies and implement circuit breakers for failing providers. Cache responses when possible to reduce API calls.

**Example**:
```python
import asyncio
import aiohttp
from typing import List, Dict, Optional
import time
from datetime import datetime, timedelta

class RateLimiter:
    """Token bucket rate limiter"""
    def __init__(self, rate: int, per: float = 1.0):
        self.rate = rate
        self.per = per
        self.allowance = rate
        self.last_check = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            current = time.time()
            time_passed = current - self.last_check
            self.last_check = current
            self.allowance += time_passed * (self.rate / self.per)

            if self.allowance > self.rate:
                self.allowance = self.rate

            if self.allowance < 1.0:
                sleep_time = (1.0 - self.allowance) * (self.per / self.rate)
                await asyncio.sleep(sleep_time)
                self.allowance = 0.0
            else:
                self.allowance -= 1.0

class AsyncLLMClient:
    """Production-ready async LLM client"""

    def __init__(
        self,
        api_key: str,
        max_concurrent: int = 50,
        rate_limit: int = 100,  # requests per minute
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.rate_limiter = RateLimiter(rate_limit, per=60.0)
        self.max_retries = max_retries

        # Metrics
        self.total_requests = 0
        self.failed_requests = 0
        self.total_tokens = 0

    async def __aenter__(self):
        # Connection pooling - reuse connections
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=50,
            ttl_dns_cache=300
        )
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def call_api(
        self,
        prompt: str,
        model: str = "gpt-4",
        temperature: float = 0.7,
        **kwargs
    ) -> Dict:
        """Call LLM API with rate limiting, retries, and error handling"""

        # Rate limiting
        await self.rate_limiter.acquire()

        # Concurrency limiting
        async with self.semaphore:
            for attempt in range(self.max_retries):
                try:
                    result = await self._make_request(
                        prompt, model, temperature, **kwargs
                    )
                    self.total_requests += 1
                    return result

                except aiohttp.ClientResponseError as e:
                    if e.status == 429:  # Rate limited
                        wait_time = 2 ** attempt  # Exponential backoff
                        print(f"Rate limited, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    elif e.status >= 500:  # Server error
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                    raise

                except asyncio.TimeoutError:
                    if attempt < self.max_retries - 1:
                        print(f"Timeout on attempt {attempt + 1}, retrying...")
                        continue
                    raise

                except Exception as e:
                    print(f"Unexpected error: {e}")
                    raise

            self.failed_requests += 1
            raise Exception(f"Failed after {self.max_retries} attempts")

    async def _make_request(
        self,
        prompt: str,
        model: str,
        temperature: float,
        **kwargs
    ) -> Dict:
        """Actual API request"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            **kwargs
        }

        async with self.session.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers=headers
        ) as response:
            response.raise_for_status()
            data = await response.json()

            # Track metrics
            if "usage" in data:
                self.total_tokens += data["usage"]["total_tokens"]

            return data

    async def batch_process(
        self,
        prompts: List[str],
        progress_callback=None
    ) -> List[Dict]:
        """Process batch of prompts with progress tracking"""
        tasks = []
        for i, prompt in enumerate(prompts):
            async def process_with_progress(p, idx):
                result = await self.call_api(p)
                if progress_callback:
                    await progress_callback(idx, len(prompts))
                return result

            tasks.append(process_with_progress(prompt, i))

        return await asyncio.gather(*tasks, return_exceptions=True)

    def get_stats(self) -> Dict:
        """Get client statistics"""
        return {
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (
                (self.total_requests - self.failed_requests) / self.total_requests
                if self.total_requests > 0 else 0
            ),
            "total_tokens": self.total_tokens
        }

# Usage example
async def process_documents(documents: List[str]):
    """Process documents with LLM at scale"""

    async def progress(current, total):
        print(f"Progress: {current + 1}/{total}")

    async with AsyncLLMClient(
        api_key="sk-...",
        max_concurrent=50,  # Max 50 concurrent requests
        rate_limit=100,     # Max 100 req/min
    ) as client:

        prompts = [f"Summarize: {doc}" for doc in documents]

        start = time.time()
        results = await client.batch_process(prompts, progress_callback=progress)
        elapsed = time.time() - start

        # Filter successful results
        successful = [r for r in results if not isinstance(r, Exception)]
        failed = [r for r in results if isinstance(r, Exception)]

        print(f"\nProcessed {len(documents)} documents in {elapsed:.2f}s")
        print(f"Successful: {len(successful)}, Failed: {len(failed)}")
        print(f"Stats: {client.get_stats()}")

        return successful

# Advanced: Multiple providers with fallback
class MultiProviderLLM:
    """Fallback across multiple LLM providers"""

    def __init__(self, providers: List[AsyncLLMClient]):
        self.providers = providers

    async def call_with_fallback(self, prompt: str) -> Dict:
        """Try providers in order until one succeeds"""
        last_error = None

        for i, provider in enumerate(self.providers):
            try:
                return await provider.call_api(prompt)
            except Exception as e:
                print(f"Provider {i} failed: {e}")
                last_error = e
                continue

        raise Exception(f"All providers failed: {last_error}")

# Run
async def main():
    documents = [f"Document {i} with lots of content..." for i in range(100)]
    results = await process_documents(documents)

asyncio.run(main())
```

**In Practice**:
**Production checklist**:
- ✅ Connection pooling (aiohttp.ClientSession)
- ✅ Rate limiting (token bucket or semaphore)
- ✅ Concurrency limits (Semaphore)
- ✅ Retries with exponential backoff
- ✅ Timeout handling
- ✅ Error classification (429 vs 500 vs network)
- ✅ Metrics tracking (requests, tokens, latency)
- ✅ Circuit breaker for failing providers
- ✅ Response caching where appropriate
- ✅ Graceful degradation (fallback providers)

**Key Takeaway**: Scale async LLM calls with connection pooling, rate limiting via semaphores/token buckets, retries with exponential backoff, and comprehensive error handling - monitor metrics to optimize.

</details>

2. Your async web service becomes unresponsive under load. How do you debug it?

<details>
<summary>Answer: Check event loop blocking, task leaks, backpressure, and use profiling tools</summary>

**Explanation**:
Async services become unresponsive from: (1) **Blocking the event loop** - sync code or CPU-heavy operations, (2) **Task leaks** - tasks created but never awaited, accumulating in memory, (3) **No backpressure** - accepting more work than can be processed, queues grow unbounded, (4) **Deadlocks** - circular waits on resources, (5) **Slow async operations** - one slow task blocks others (no timeout).

Debug by: (1) Check running tasks with `asyncio.all_tasks()`, (2) Enable asyncio debug mode (`PYTHONDEVMODE=1`), (3) Profile event loop iteration time, (4) Look for blocking calls (`time.sleep`, sync I/O), (5) Add timeouts to async operations, (6) Monitor task creation/completion rates, (7) Use `aiomonitor` for live debugging.

**Example**:
```python
import asyncio
import time
from typing import Set
import aiomonitor

# Common issue 1: Blocking the event loop
async def bad_handler_blocking():
    """BAD: Blocks event loop"""
    time.sleep(5)  # BLOCKS everything!
    return "response"

async def good_handler():
    """GOOD: Async sleep"""
    await asyncio.sleep(5)
    return "response"

# Common issue 2: Task leaks
class LeakyService:
    """BAD: Creates tasks that are never awaited"""
    def __init__(self):
        self.tasks: Set[asyncio.Task] = set()

    async def handle_request(self, data):
        # Create task but never track or await it - LEAK!
        asyncio.create_task(self.background_work(data))
        return "accepted"

    async def background_work(self, data):
        await asyncio.sleep(10)
        print(f"Processed {data}")

class GoodService:
    """GOOD: Tracks and cleans up tasks"""
    def __init__(self):
        self.tasks: Set[asyncio.Task] = set()

    async def handle_request(self, data):
        task = asyncio.create_task(self.background_work(data))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return "accepted"

    async def background_work(self, data):
        await asyncio.sleep(10)
        print(f"Processed {data}")

    async def shutdown(self):
        """Cleanup on shutdown"""
        await asyncio.gather(*self.tasks, return_exceptions=True)

# Common issue 3: No backpressure
async def no_backpressure_handler(queue: asyncio.Queue):
    """BAD: Unbounded queue growth"""
    while True:
        item = await queue.get()
        # Slow processing
        await asyncio.sleep(1)
        process(item)

async def with_backpressure_handler():
    """GOOD: Bounded queue with backpressure"""
    queue = asyncio.Queue(maxsize=100)  # Bounded!

    async def producer():
        for i in range(1000):
            try:
                # Blocks if queue full - natural backpressure
                await asyncio.wait_for(
                    queue.put(i),
                    timeout=1.0
                )
            except asyncio.TimeoutError:
                print(f"Queue full, dropping item {i}")

    async def consumer():
        while True:
            item = await queue.get()
            await asyncio.sleep(1)
            print(f"Processed {item}")

    await asyncio.gather(producer(), consumer())

# Debugging toolkit
class AsyncDebugger:
    """Tools for debugging async issues"""

    @staticmethod
    async def monitor_event_loop():
        """Monitor event loop health"""
        while True:
            start = asyncio.get_event_loop().time()
            await asyncio.sleep(0)  # Yield control
            elapsed = asyncio.get_event_loop().time() - start

            if elapsed > 0.1:  # >100ms for single iteration
                print(f"WARNING: Event loop iteration took {elapsed:.3f}s")

            await asyncio.sleep(1)

    @staticmethod
    def dump_tasks():
        """Dump all running tasks"""
        tasks = asyncio.all_tasks()
        print(f"\n=== Running Tasks ({len(tasks)}) ===")
        for task in tasks:
            print(f"Task: {task.get_name()}")
            print(f"  Coro: {task.get_coro()}")
            print(f"  Done: {task.done()}")
            if not task.done():
                print(f"  Stack: {task.get_stack()}")
        print("=" * 40)

    @staticmethod
    async def watch_task_growth():
        """Detect task leaks"""
        baseline = len(asyncio.all_tasks())
        await asyncio.sleep(60)
        current = len(asyncio.all_tasks())
        growth = current - baseline

        if growth > 100:
            print(f"WARNING: Task leak detected! {growth} new tasks")
            AsyncDebugger.dump_tasks()

    @staticmethod
    async def profile_handler(handler, *args, **kwargs):
        """Profile async handler execution"""
        start = time.time()

        try:
            result = await asyncio.wait_for(
                handler(*args, **kwargs),
                timeout=5.0
            )
            elapsed = time.time() - start
            print(f"Handler {handler.__name__} took {elapsed:.3f}s")
            return result
        except asyncio.TimeoutError:
            print(f"Handler {handler.__name__} TIMEOUT")
            raise

# Complete debugging example
async def debuggable_service():
    """Service with debugging built in"""

    # Enable asyncio debug mode
    asyncio.get_event_loop().set_debug(True)

    # Start monitors
    asyncio.create_task(AsyncDebugger.monitor_event_loop())
    asyncio.create_task(AsyncDebugger.watch_task_growth())

    # Service logic
    service = GoodService()

    # Simulate requests
    for i in range(100):
        await service.handle_request(f"request_{i}")
        await asyncio.sleep(0.1)

    # Periodic diagnostics
    await asyncio.sleep(5)
    AsyncDebugger.dump_tasks()

    # Graceful shutdown
    await service.shutdown()

# Using aiomonitor for live debugging
async def production_service():
    """Service with aiomonitor for live debugging"""

    # Start aiomonitor - telnet localhost 50101
    with aiomonitor.start_monitor(
        loop=asyncio.get_event_loop(),
        port=50101
    ):
        # Your service code
        while True:
            await asyncio.sleep(1)
            # Handle requests...

# Practical debugging workflow
async def debug_unresponsive_service():
    """Step-by-step debugging"""

    print("Step 1: Check task count")
    print(f"Running tasks: {len(asyncio.all_tasks())}")

    print("\nStep 2: Find long-running tasks")
    for task in asyncio.all_tasks():
        if not task.done():
            coro = task.get_coro()
            frame = task.get_stack()[-1] if task.get_stack() else None
            print(f"Task: {coro}, Frame: {frame}")

    print("\nStep 3: Check for blocking code")
    # Look for time.sleep, requests.get, open().read() in stack traces

    print("\nStep 4: Enable asyncio warnings")
    # Set PYTHONDEVMODE=1 or loop.set_debug(True)

    print("\nStep 5: Add timeouts")
    # Wrap all async operations in asyncio.wait_for()

    print("\nStep 6: Implement backpressure")
    # Use bounded queues, semaphores, rate limiters

    print("\nStep 7: Profile hot paths")
    # Use cProfile, py-spy, or asyncio profilers

# Run debugging
asyncio.run(debuggable_service())
```

**In Practice**:
**Production debugging checklist**:
1. **Enable debug mode**: `PYTHONDEVMODE=1` or `loop.set_debug(True)`
2. **Monitor metrics**:
   - Task count: `len(asyncio.all_tasks())`
   - Event loop lag: Time between iterations
   - Queue depths: Length of asyncio.Queue
3. **Add timeouts**: Wrap all async operations in `asyncio.wait_for()`
4. **Profile**: Use `py-spy` or `cProfile` to find blocking code
5. **Use aiomonitor**: Connect via telnet for live debugging
6. **Log slow operations**: Track p50/p95/p99 latencies
7. **Implement circuit breakers**: Fail fast on overload

**Tools**:
- `aiomonitor`: Live async debugging (task inspection, stack traces)
- `py-spy`: Sampling profiler that works with asyncio
- `asyncio.all_tasks()`: List all running tasks
- `task.get_stack()`: Get stack trace of stuck task

**Key Takeaway**: Debug async unresponsiveness by checking task leaks (`all_tasks()`), finding blocking code (enable debug mode), adding timeouts, implementing backpressure, and using tools like aiomonitor.

</details>

3. How do you implement graceful shutdown for async tasks (e.g., ML batch jobs)?

<details>
<summary>Answer: Handle signals, cancel tasks gracefully, wait with timeout, save state before exit</summary>

**Explanation**:
Graceful shutdown requires: (1) **Catch signals** (SIGTERM, SIGINT) to initiate shutdown, (2) **Stop accepting new work** - close listeners/queues, (3) **Cancel running tasks** - use `task.cancel()` but let them clean up, (4) **Wait with timeout** - give tasks time to finish, force-kill after timeout, (5) **Save state** - checkpoint progress for resumption, (6) **Close resources** - database connections, file handles, HTTP sessions.

The pattern: Set a shutdown flag, wait for tasks to notice and complete current work, cancel stragglers, wait with timeout, force-kill remaining. For ML jobs: save model checkpoints, processed batch IDs, partial results before exiting.

**Example**:
```python
import asyncio
import signal
from typing import Set, Optional
import time

class GracefulShutdown:
    """Handles graceful shutdown of async application"""

    def __init__(self):
        self.is_shutting_down = False
        self.shutdown_event = asyncio.Event()
        self.tasks: Set[asyncio.Task] = set()

    def setup_signal_handlers(self):
        """Register signal handlers for graceful shutdown"""
        loop = asyncio.get_event_loop()

        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(
                sig,
                lambda s=sig: asyncio.create_task(self.shutdown(s))
            )

    async def shutdown(self, sig):
        """Initiate graceful shutdown"""
        if self.is_shutting_down:
            return

        print(f"\n{sig.name} received, initiating graceful shutdown...")
        self.is_shutting_down = True
        self.shutdown_event.set()

        # Stop accepting new work (application-specific)
        # e.g., close HTTP server, stop queue consumers

        # Wait for tasks to complete
        await self.wait_for_tasks(timeout=30)

    async def wait_for_tasks(self, timeout: float = 30):
        """Wait for all tasks to complete with timeout"""
        if not self.tasks:
            return

        print(f"Waiting for {len(self.tasks)} tasks to complete...")

        try:
            # Wait with timeout
            await asyncio.wait_for(
                asyncio.gather(*self.tasks, return_exceptions=True),
                timeout=timeout
            )
            print("All tasks completed gracefully")

        except asyncio.TimeoutError:
            print(f"Timeout after {timeout}s, cancelling remaining tasks...")
            await self.cancel_remaining_tasks()

    async def cancel_remaining_tasks(self):
        """Cancel tasks that didn't complete in time"""
        for task in self.tasks:
            if not task.done():
                print(f"Cancelling task: {task.get_name()}")
                task.cancel()

        # Wait for cancellations to propagate
        await asyncio.gather(*self.tasks, return_exceptions=True)
        print("All tasks cancelled")

    def track_task(self, task: asyncio.Task):
        """Track task for shutdown"""
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

# ML Batch Job with Graceful Shutdown
class MLBatchProcessor:
    """ML batch job with checkpointing and graceful shutdown"""

    def __init__(self, checkpoint_file: str = "checkpoint.json"):
        self.checkpoint_file = checkpoint_file
        self.shutdown_manager = GracefulShutdown()
        self.processed_ids = set()
        self.current_batch = None

    async def process_documents(self, document_ids: list):
        """Process documents with graceful shutdown support"""
        self.shutdown_manager.setup_signal_handlers()

        # Load checkpoint
        start_idx = self.load_checkpoint()
        print(f"Resuming from index {start_idx}")

        for i in range(start_idx, len(document_ids)):
            # Check for shutdown signal
            if self.shutdown_manager.is_shutting_down:
                print("Shutdown requested, saving state...")
                self.save_checkpoint(i)
                break

            doc_id = document_ids[i]
            self.current_batch = i

            # Create tracked task
            task = asyncio.create_task(
                self.process_single_document(doc_id)
            )
            self.shutdown_manager.track_task(task)

            try:
                result = await task
                self.processed_ids.add(doc_id)

                # Periodic checkpoint
                if i % 100 == 0:
                    self.save_checkpoint(i)

            except asyncio.CancelledError:
                print(f"Task cancelled for doc {doc_id}")
                self.save_checkpoint(i)
                raise

        # Final checkpoint
        self.save_checkpoint(len(document_ids))
        print(f"Processed {len(self.processed_ids)} documents")

    async def process_single_document(self, doc_id: str):
        """Process single document (simulated)"""
        try:
            # Simulate ML inference
            await asyncio.sleep(1)
            return f"Result for {doc_id}"

        except asyncio.CancelledError:
            print(f"Cleaning up document {doc_id}")
            # Save partial results, release resources
            raise

    def save_checkpoint(self, index: int):
        """Save progress checkpoint"""
        checkpoint = {
            "index": index,
            "processed_ids": list(self.processed_ids),
            "timestamp": time.time()
        }
        # In production: save to file/database
        print(f"Checkpoint saved at index {index}")

    def load_checkpoint(self) -> int:
        """Load progress checkpoint"""
        # In production: load from file/database
        return 0

# Service with Multiple Workers
class AsyncMLService:
    """ML inference service with graceful shutdown"""

    def __init__(self, num_workers: int = 4):
        self.num_workers = num_workers
        self.shutdown_manager = GracefulShutdown()
        self.request_queue = asyncio.Queue()
        self.workers = []

    async def start(self):
        """Start service with workers"""
        self.shutdown_manager.setup_signal_handlers()

        # Start workers
        for i in range(self.num_workers):
            worker = asyncio.create_task(
                self.worker(i),
                name=f"worker-{i}"
            )
            self.shutdown_manager.track_task(worker)
            self.workers.append(worker)

        print(f"Started {self.num_workers} workers")

        # Wait for shutdown signal
        await self.shutdown_manager.shutdown_event.wait()

        # Stop accepting new requests
        await self.stop_accepting_requests()

        # Wait for workers to finish current work
        await self.shutdown_manager.wait_for_tasks(timeout=30)

    async def worker(self, worker_id: int):
        """Worker that processes requests"""
        print(f"Worker {worker_id} started")

        try:
            while not self.shutdown_manager.is_shutting_down:
                try:
                    # Get request with timeout
                    request = await asyncio.wait_for(
                        self.request_queue.get(),
                        timeout=1.0
                    )

                    # Process request
                    result = await self.process_request(request)
                    print(f"Worker {worker_id} processed: {result}")

                except asyncio.TimeoutError:
                    continue  # No request, check shutdown flag

        except asyncio.CancelledError:
            print(f"Worker {worker_id} cancelled")
            # Cleanup resources
            raise

        finally:
            print(f"Worker {worker_id} shutdown complete")

    async def process_request(self, request):
        """Process inference request"""
        await asyncio.sleep(0.5)  # Simulate inference
        return f"Result for {request}"

    async def stop_accepting_requests(self):
        """Stop accepting new requests"""
        print("Stopping request acceptance...")
        # Close HTTP server, stop queue producers, etc.
        await asyncio.sleep(0.1)

    async def submit_request(self, request):
        """Submit request to queue"""
        if not self.shutdown_manager.is_shutting_down:
            await self.request_queue.put(request)

# Complete example
async def main():
    """Run ML service with graceful shutdown"""

    # Example 1: Batch job
    print("=== Batch Job Example ===")
    processor = MLBatchProcessor()
    documents = [f"doc_{i}" for i in range(1000)]

    try:
        await processor.process_documents(documents)
    except KeyboardInterrupt:
        print("Interrupted, state saved")

    # Example 2: Service with workers
    print("\n=== Service Example ===")
    service = AsyncMLService(num_workers=4)

    # Simulate request submission
    async def submit_requests():
        for i in range(100):
            await service.submit_request(f"request_{i}")
            await asyncio.sleep(0.1)

    # Run both
    await asyncio.gather(
        service.start(),
        submit_requests()
    )

# Run
if __name__ == "__main__":
    asyncio.run(main())
```

**In Practice**:
**Production graceful shutdown checklist**:
1. **Signal handling**: Register SIGTERM/SIGINT handlers
2. **Shutdown flag**: Set flag checked by all workers
3. **Stop new work**: Close servers, stop accepting requests
4. **Finish current work**: Let tasks complete (with timeout)
5. **Save state**: Checkpoint progress, partial results
6. **Cancel stragglers**: Cancel tasks exceeding timeout
7. **Close resources**: Database connections, file handles, sessions
8. **Exit cleanly**: Return proper exit code

**For ML batch jobs**:
```python
# Checkpoint structure
checkpoint = {
    "processed_ids": [...],
    "current_batch": 42,
    "model_state": {...},
    "timestamp": "2024-01-01T00:00:00Z"
}
```

**Testing shutdown**:
```bash
# Test graceful shutdown
python service.py &
PID=$!
sleep 5
kill -TERM $PID  # Should shutdown gracefully
```

**Key Takeaway**: Implement graceful shutdown by handling signals, setting shutdown flags, finishing current work with timeout, saving checkpoints, cancelling remaining tasks, and closing resources.

</details>

4. How do you implement rate limiting for async API calls?

<details>
<summary>Answer: Use semaphores for concurrency limits and token bucket/leaky bucket for rate limits</summary>

**Explanation**:
Rate limiting has two aspects: (1) **Concurrency limiting** - max N requests in-flight at once (use Semaphore), (2) **Rate limiting** - max R requests per time window (use token bucket or leaky bucket algorithms). Semaphores are simple: acquire before request, release after. Token buckets are more complex: tokens regenerate over time, each request consumes a token, requests wait if no tokens available.

For API rate limits (e.g., "100 requests/minute"), implement a token bucket: start with N tokens, add tokens at rate R, consume 1 per request, block when empty. For burst limits (e.g., "no more than 10 concurrent"), use Semaphore(10). Often you need both: semaphore for concurrency, token bucket for rate.

Libraries like `aiolimiter` provide production-ready rate limiters. For multi-process scenarios, use Redis for shared rate limiting state.

**Example**:
```python
import asyncio
import time
from typing import Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

# 1. Simple concurrency limiting with Semaphore
class ConcurrencyLimiter:
    """Limit concurrent operations"""

    def __init__(self, max_concurrent: int):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def acquire(self):
        await self.semaphore.acquire()

    def release(self):
        self.semaphore.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.release()

# Usage
async def limited_api_call():
    limiter = ConcurrencyLimiter(max_concurrent=10)

    async with limiter:
        # Only 10 calls can be here simultaneously
        await api_call()

# 2. Token Bucket Rate Limiter
class TokenBucket:
    """Token bucket algorithm for rate limiting"""

    def __init__(self, rate: float, capacity: float):
        """
        Args:
            rate: Tokens added per second
            capacity: Maximum tokens (burst capacity)
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0):
        """Acquire tokens, waiting if necessary"""
        async with self._lock:
            while True:
                # Refill tokens based on time passed
                now = time.time()
                elapsed = now - self.last_update
                self.tokens = min(
                    self.capacity,
                    self.tokens + elapsed * self.rate
                )
                self.last_update = now

                # Check if enough tokens available
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return

                # Calculate wait time for enough tokens
                needed = tokens - self.tokens
                wait_time = needed / self.rate
                await asyncio.sleep(wait_time)

# 3. Leaky Bucket Rate Limiter
class LeakyBucket:
    """Leaky bucket algorithm for rate limiting"""

    def __init__(self, rate: float, capacity: int):
        """
        Args:
            rate: Requests processed per second
            capacity: Maximum queue size
        """
        self.rate = rate
        self.capacity = capacity
        self.queue = asyncio.Queue(maxsize=capacity)
        self.last_leak = time.time()

    async def acquire(self):
        """Add request to bucket"""
        # Try to add to queue (fails if full)
        try:
            await asyncio.wait_for(
                self.queue.put(None),
                timeout=0.1
            )
        except asyncio.TimeoutError:
            raise Exception("Rate limit exceeded")

        # Wait for turn
        await self._leak()

    async def _leak(self):
        """Process requests at fixed rate"""
        now = time.time()
        elapsed = now - self.last_leak

        if elapsed < 1.0 / self.rate:
            wait_time = (1.0 / self.rate) - elapsed
            await asyncio.sleep(wait_time)

        await self.queue.get()
        self.last_leak = time.time()

# 4. Complete Rate Limiter with both concurrency and rate limits
class RateLimiter:
    """Production-ready rate limiter"""

    def __init__(
        self,
        max_concurrent: int,
        requests_per_second: float,
        burst_capacity: Optional[float] = None
    ):
        self.concurrency_limiter = asyncio.Semaphore(max_concurrent)
        self.burst_capacity = burst_capacity or requests_per_second
        self.token_bucket = TokenBucket(
            rate=requests_per_second,
            capacity=self.burst_capacity
        )

        # Metrics
        self.total_requests = 0
        self.rejected_requests = 0
        self.total_wait_time = 0.0

    async def acquire(self):
        """Acquire both concurrency and rate limit"""
        start = time.time()

        # Rate limit (token bucket)
        await self.token_bucket.acquire()

        # Concurrency limit
        await self.concurrency_limiter.acquire()

        wait_time = time.time() - start
        self.total_wait_time += wait_time
        self.total_requests += 1

    def release(self):
        """Release concurrency slot"""
        self.concurrency_limiter.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.release()

    def get_stats(self):
        """Get rate limiter statistics"""
        return {
            "total_requests": self.total_requests,
            "rejected_requests": self.rejected_requests,
            "avg_wait_time": (
                self.total_wait_time / self.total_requests
                if self.total_requests > 0 else 0
            )
        }

# 5. Per-resource rate limiting (e.g., per-user, per-API-key)
class PerResourceRateLimiter:
    """Rate limiter with separate limits per resource"""

    def __init__(self, rate: float, capacity: float):
        self.rate = rate
        self.capacity = capacity
        self.limiters = {}
        self._lock = asyncio.Lock()

    async def acquire(self, resource_id: str):
        """Acquire for specific resource"""
        async with self._lock:
            if resource_id not in self.limiters:
                self.limiters[resource_id] = TokenBucket(
                    self.rate,
                    self.capacity
                )

        await self.limiters[resource_id].acquire()

# 6. Redis-based distributed rate limiter
class RedisRateLimiter:
    """Rate limiter using Redis for multi-process/multi-server"""

    def __init__(self, redis_client, key_prefix: str, rate: int, window: int):
        """
        Args:
            redis_client: aioredis client
            key_prefix: Redis key prefix
            rate: Max requests per window
            window: Time window in seconds
        """
        self.redis = redis_client
        self.key_prefix = key_prefix
        self.rate = rate
        self.window = window

    async def acquire(self, resource_id: str):
        """Acquire using Redis sliding window"""
        key = f"{self.key_prefix}:{resource_id}"
        now = time.time()
        window_start = now - self.window

        # Remove old entries
        await self.redis.zremrangebyscore(key, 0, window_start)

        # Count requests in window
        count = await self.redis.zcard(key)

        if count >= self.rate:
            raise Exception(f"Rate limit exceeded for {resource_id}")

        # Add current request
        await self.redis.zadd(key, {str(now): now})
        await self.redis.expire(key, self.window)

# Usage Examples
async def example_openai_rate_limiting():
    """Example: Rate limit OpenAI API calls"""

    # OpenAI limits: 3500 RPM, 90000 tokens/min
    limiter = RateLimiter(
        max_concurrent=50,           # Max 50 concurrent requests
        requests_per_second=58.3,    # 3500 RPM = 58.3 RPS
        burst_capacity=100           # Allow bursts up to 100
    )

    async def call_openai_api(prompt):
        async with limiter:
            # Make API call
            result = await actual_api_call(prompt)
            return result

    # Process many prompts
    prompts = [f"Prompt {i}" for i in range(1000)]
    results = await asyncio.gather(*[
        call_openai_api(p) for p in prompts
    ])

    print(limiter.get_stats())

async def example_per_user_rate_limiting():
    """Example: Rate limit per user"""

    limiter = PerResourceRateLimiter(
        rate=10,      # 10 requests/sec per user
        capacity=20   # Burst up to 20
    )

    async def handle_request(user_id: str, request):
        await limiter.acquire(user_id)
        return await process_request(request)

    # Different users have independent rate limits
    await asyncio.gather(
        handle_request("user1", "request1"),
        handle_request("user1", "request2"),
        handle_request("user2", "request1"),  # Independent limit
    )

# Helper functions (stubs)
async def api_call():
    await asyncio.sleep(0.1)

async def actual_api_call(prompt):
    await asyncio.sleep(0.1)
    return f"Response to {prompt}"

async def process_request(request):
    await asyncio.sleep(0.1)
    return f"Processed {request}"

# Run example
async def main():
    await example_openai_rate_limiting()

asyncio.run(main())
```

**In Practice**:
**Choosing rate limiting strategy**:

| Scenario | Strategy | Implementation |
|----------|----------|----------------|
| Max concurrent | Semaphore | `Semaphore(N)` |
| Requests/second | Token Bucket | Refill tokens over time |
| Fixed rate | Leaky Bucket | Process at constant rate |
| Bursty traffic | Token Bucket | Higher capacity than rate |
| Per-user limits | Per-Resource | Dict of limiters |
| Distributed | Redis/Memcached | Shared state across processes |

**API-specific examples**:
```python
# OpenAI: 3500 RPM, 90K tokens/min
limiter = RateLimiter(max_concurrent=50, requests_per_second=58)

# Anthropic: 50 RPM tier 1
limiter = RateLimiter(max_concurrent=10, requests_per_second=0.83)

# Custom API: 100 RPS, max 500 concurrent
limiter = RateLimiter(max_concurrent=500, requests_per_second=100)
```

**Testing rate limits**:
```python
async def test_rate_limit():
    limiter = RateLimiter(max_concurrent=2, requests_per_second=10)

    start = time.time()
    tasks = [call_with_limiter(limiter) for _ in range(100)]
    await asyncio.gather(*tasks)
    elapsed = time.time() - start

    # Should take ~10 seconds (100 requests / 10 RPS)
    assert 9 < elapsed < 11
```

**Key Takeaway**: Use Semaphore for concurrency limits, Token Bucket for rate limits (requests/time), combine both for production; for distributed systems use Redis-based rate limiting.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#async-programming) for comprehensive list

## Summary

**In 3 sentences**:
- Async programming uses `async`/`await` and an event loop to handle concurrent I/O operations without blocking, enabling efficient handling of 1000s of simultaneous operations with minimal resources
- Coroutines are functions defined with `async def` that can be paused with `await`, yielding control back to the event loop to run other coroutines while waiting for I/O
- Use `asyncio.gather()` to run multiple coroutines concurrently, semaphores for rate/concurrency limiting, and async context managers for proper resource cleanup in async code

**Key takeaway**: Async programming is essential for modern AI/ML applications making concurrent LLM API calls, building agents with parallel tool execution, and handling real-time data streams - it provides concurrency (not parallelism) that's perfect for I/O-bound workloads like API calls, databases, and file operations!
