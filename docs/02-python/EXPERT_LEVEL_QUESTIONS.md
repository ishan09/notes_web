# Expert-Level Deep Dive Questions

> **Purpose**: These questions go beyond the basics and target the level of understanding a 12-year experienced Python developer should possess. They cover interview scenarios, Python internals, edge cases, and production debugging - areas that aren't always explicitly taught but separate experts from intermediates.

## How to Use These Questions

1. **During Learning** (Inline): Each topic file includes 2-3 "Deep Dive Questions" at the end
2. **For Review** (Consolidated): This master file consolidates all questions by theme
3. **When to Tackle**: After completing basic exercises and feeling comfortable with a topic
4. **Research Required**: Most questions require reading documentation, source code, or experimentation

---

## 1. Memory Management & Performance {#memory-management}

### Core Python Internals

- How does Python's garbage collector work with reference counting and cyclic garbage collection? When does each mechanism trigger?
- What is the GIL (Global Interpreter Lock) and why does it exist? How does it affect multi-threaded programs vs multiprocessing?
- Explain Python's memory allocation strategy. What are arenas, pools, and blocks? When does Python return memory to the OS?
- What happens when you create a string in Python? Where is it stored? What is string interning and when does it occur?
- How do `__slots__` reduce memory usage? What are the trade-offs and limitations?
- What causes memory leaks in Python despite having automatic garbage collection?
- How does Python handle small integer caching? What range is cached and why?

### AI/ML Context

- Why do numpy arrays use less memory than Python lists for numerical data? What's happening at the memory level?
- When training large models, what causes "CUDA out of memory" errors even when you think you've freed tensors?
- How does PyTorch's autograd track gradients? What memory implications does this have during training?
- Why do generators save memory when processing large datasets, but what's the performance trade-off?
- What happens to memory when you load a 10GB pandas DataFrame? Can you partially load it? How?
- Explain reference cycles in ML pipelines (e.g., model → optimizer → parameters → gradients). How do you break them?

### Production Scenarios

- Your ML service is gradually consuming more memory over time (memory leak). How do you debug it?
- When should you use `multiprocessing` vs `threading` vs `asyncio` for parallel data processing in ML pipelines?
- How do you profile Python code to find memory bottlenecks? Which tools work best for what scenarios?

---

## 2. Type System & Metaprogramming {#type-system}

### Core Python Internals

- What are metaclasses? When would you use them (real use case, not academic example)?
- Explain the descriptor protocol (`__get__`, `__set__`, `__delete__`). How do `property`, `classmethod`, and `staticmethod` use it?
- What's the difference between `__new__` and `__init__`? When would you override `__new__`?
- How does Python's MRO (Method Resolution Order) work with multiple inheritance? What is C3 linearization?
- What are abstract base classes (ABCs)? How do they differ from Protocols (PEP 544)?
- Explain the difference between `type()` and `isinstance()` for type checking. When does each fail?
- What is monkey patching? Why is it dangerous in production? When is it acceptable?

### AI/ML Context

- How do type hints improve ML code? What's the difference between `List[int]` and `list[int]` (Python 3.9+)?
- What are Protocol types and how do they enable structural subtyping for ML frameworks?
- How does PyTorch use metaclasses internally? (Hint: `torch.nn.Module`)
- Why do ML libraries often use `__call__` for models instead of explicit methods?
- How do you type-hint variadic functions (e.g., `def forward(*args, **kwargs)` in neural networks)?
- What are generic types and how do they work with TypeVar for ML pipelines?

### Production Scenarios

- Your team wants to enforce type checking in CI/CD. Which type checker (mypy, pyright, pyre) and why?
- How do you handle dynamic types from JSON APIs while maintaining type safety?
- When debugging, how do you inspect an object's MRO, methods, and attributes at runtime?

---

## 3. Async Programming & Concurrency {#async-programming}

### Core Python Internals

- How does `asyncio` work under the hood? What is an event loop?
- What's the difference between `async def` and `def` that returns a coroutine?
- Explain `asyncio.gather()` vs `asyncio.wait()` vs `asyncio.as_completed()`. When do you use each?
- What is the difference between concurrency and parallelism in Python?
- How do you handle blocking I/O in an async application without blocking the event loop?
- What are async context managers and async generators? How do they differ from regular ones?
- Explain backpressure in async systems. How do you implement it?

### AI/ML Context

- How do you handle async API calls to LLM providers (OpenAI, Anthropic) at scale?
- What's the best way to implement async batching for inference requests?
- How do you stream LLM responses (SSE/WebSocket) while maintaining async efficiency?
- When building agents, how do you handle concurrent tool calls without race conditions?
- How do async generators help with real-time data streaming for ML pipelines?
- What are the pitfalls of mixing sync and async code in ML services?

### Production Scenarios

- Your async web service becomes unresponsive under load. How do you debug it?
- How do you implement graceful shutdown for async tasks (e.g., ML batch jobs)?
- What happens when an async task raises an exception? How do you handle it without crashing the event loop?
- How do you implement rate limiting for async API calls?

---

## 4. Decorators, Closures & Functional Programming {#decorators}

### Core Python Internals

- What is a closure? How does Python implement variable capture?
- Explain function decorators with and without arguments. What's the wrapping pattern?
- What are class decorators? How do they differ from metaclasses?
- What is `functools.wraps` and why should you always use it in decorators?
- How do you preserve type hints when decorating functions?
- What is partial application (`functools.partial`) and when is it useful?
- Explain the difference between `map`, `filter`, `reduce` and list comprehensions. Which is more Pythonic?

### AI/ML Context

- How do you implement a decorator to cache model inference results?
- How would you create a decorator to retry failed API calls to LLM providers?
- What's the pattern for decorating async functions (e.g., adding logging to async API calls)?
- How do you implement function wrappers that track model performance metrics?
- How does JAX use functional programming principles for ML? What are pure functions?

### Production Scenarios

- Your decorator is slowing down function calls. How do you profile and optimize it?
- How do you create a decorator that works for both sync and async functions?
- What are the memory implications of closures in long-running services?

---

## 5. Testing, Mocking & Debugging {#testing}

### Core Python Internals

- What's the difference between `unittest.mock.Mock` and `MagicMock`? When does each matter?
- How do you mock external APIs without changing production code?
- What is monkey patching in tests? When is it appropriate?
- Explain test fixtures vs test factories. When do you use each?
- How do you test async code with pytest?
- What are parametrized tests and why are they better than multiple test functions?
- How do you measure code coverage meaningfully (not just hitting 100%)?

### AI/ML Context

- How do you test non-deterministic ML model outputs?
- How do you mock LLM API calls for integration tests?
- What's the strategy for testing agent workflows with multiple tool calls?
- How do you test data pipelines with large datasets efficiently?
- How do you create reproducible tests when randomness is involved (model training)?
- What's the difference between unit testing ML code vs integration testing models?

### Production Scenarios

- Your ML service fails intermittently in production but passes all tests. How do you debug?
- How do you implement property-based testing for ML data transformations?
- What tools do you use to debug production Python code (without adding print statements)?
- How do you test for memory leaks in ML pipelines?

---

## 6. Packaging, Dependencies & Project Structure {#packaging}

### Core Python Internals

- What's the difference between `setup.py`, `pyproject.toml`, and `setup.cfg`?
- Explain relative vs absolute imports. When does each break?
- What is `__init__.py` for? When can you omit it (Python 3.3+)?
- How does Python resolve imports? What is `sys.path` and how does it work?
- What are namespace packages? When would you use them?
- Explain virtual environments. How do they work under the hood?
- What's the difference between `pip install -e .` (editable) and regular install?

### AI/ML Context

- How do you manage conflicting dependencies in ML projects (e.g., TensorFlow vs PyTorch)?
- What's the best way to version control large ML models? (Not in git!)
- How do you structure a Python package for an ML model service?
- What's the pattern for separating training code from inference code in production?
- How do you handle versioning for ML model APIs?
- Should ML model weights be in the Python package or loaded separately? Why?

### Production Scenarios

- Your Docker container for ML inference is 5GB. How do you reduce it?
- How do you handle secret management (API keys) in Python applications?
- What's the best practice for logging in production ML services?
- How do you implement health checks for ML services?

---

## 7. Data Science Libraries (NumPy, Pandas) {#data-science}

### Core Understanding

- Why is NumPy fast? What is vectorization and how does it work?
- What's the difference between a NumPy view and a copy? When does each occur?
- Explain broadcasting in NumPy. What are the rules?
- What is the difference between `pandas.DataFrame.apply()` and vectorized operations? Which is faster and why?
- How does pandas handle missing data (NaN, None, NaT)? What are the pitfalls?
- What's the difference between `loc`, `iloc`, and `at` in pandas? When does each perform best?
- Explain pandas' categorical data type. When should you use it?

### AI/ML Context

- How do you efficiently process a 100GB CSV file that doesn't fit in memory?
- What's the best way to handle time-series data in pandas for ML features?
- How do you optimize pandas operations for ML preprocessing pipelines?
- When should you use NumPy vs pandas vs Polars for ML data processing?
- How do you handle imbalanced datasets efficiently in pandas?

### Production Scenarios

- Your pandas pipeline is consuming too much memory. How do you optimize it?
- How do you handle schema changes in production data pipelines?
- What's the best way to parallelize pandas operations?

---

## 8. LLM Integration & Agent Patterns {#llm-agents}

### Core LLM Concepts

- How do you handle rate limiting when making concurrent LLM API calls?
- What are the trade-offs between streaming and non-streaming LLM responses?
- How do you implement retry logic with exponential backoff for LLM APIs?
- What's the difference between function calling and tool use in LLM APIs?
- How do you validate LLM outputs programmatically?
- What are guardrails in LLM systems and how do you implement them?

### Agent Design Patterns

- What is the ReAct pattern (Reason + Act) for agents?
- How do you implement agent memory (short-term vs long-term)?
- What's the difference between autonomous agents and human-in-the-loop agents?
- How do you handle multi-step agent workflows with error recovery?
- What are agent tools and how do you design the tool interface?
- How do you prevent agents from getting stuck in loops?
- What's the strategy for orchestrating multiple agents?

### Production Scenarios

- How do you monitor and log LLM API usage and costs in production?
- What's the best way to A/B test different prompts in production?
- How do you handle LLM API failures gracefully?
- How do you implement caching for LLM responses?
- What's the pattern for versioning prompts in production?

---

## 9. Security & Best Practices {#security}

### Core Security

- What are the OWASP Top 10 vulnerabilities relevant to Python applications?
- How do you prevent SQL injection in Python? What about NoSQL injection?
- What is the secure way to store secrets (API keys, passwords) in Python?
- How do you validate and sanitize user input in Python?
- What are the risks of using `eval()` or `exec()`? When is it ever acceptable?
- How do you implement proper exception handling without leaking sensitive information?

### AI/ML Context

- What are prompt injection attacks and how do you prevent them?
- How do you sanitize user inputs before sending to LLMs?
- What are the security implications of allowing agents to execute code?
- How do you implement sandboxing for agent tool execution?
- What's the risk of model inversion attacks and how do you mitigate them?

### Production Scenarios

- How do you implement authentication and authorization for ML APIs?
- What's the best practice for rotating API keys in production?
- How do you audit and log access to ML models?

---

## 10. Performance Optimization & Profiling {#performance}

### Core Performance

- What tools do you use to profile CPU-bound vs I/O-bound Python code?
- How do you identify performance bottlenecks in Python applications?
- When should you use Cython, Numba, or PyPy for optimization?
- What is JIT compilation and how does Numba implement it?
- How do you optimize Python loops? What are the alternatives?
- What's the cost of Python exceptions? When do they impact performance?

### AI/ML Context

- How do you optimize ML inference latency in production?
- What's the trade-off between batch size and latency for model inference?
- How do you profile GPU utilization in PyTorch/TensorFlow?
- When should you use model quantization or pruning?
- What's the pattern for implementing model caching strategies?
- How do you optimize data loading for training (dataloaders, prefetching)?

### Production Scenarios

- Your ML API has p99 latency of 5 seconds. How do you reduce it?
- How do you benchmark Python code reliably?
- What's the strategy for load testing ML services?

---

## Using This Resource

### For Learning

- **After each topic**: Review 2-3 related questions from this file
- **Weekly review**: Pick one category and research all questions
- **Before interviews**: Focus on Production Scenarios sections

### For Interview Prep

- These questions cover senior/staff level Python interviews
- Mix of theoretical knowledge and practical experience
- Prepare STAR-format stories for production scenarios

### For Skill Assessment

- Can you answer 50% of questions in a category? → Intermediate
- Can you answer 80% of questions in a category? → Advanced
- Can you answer 95%+ and explain trade-offs? → Expert

---

## Contributing

As you research these questions:

1. **Document your findings** - Create notes with answers
2. **Share insights** - Add context from your experience
3. **Add more questions** - Expand categories as you learn
4. **Link resources** - Add references to docs, articles, videos

---

**Remember**: These questions are designed to push your understanding beyond tutorials. Many don't have a single "correct" answer - they test your ability to reason about trade-offs, understand systems deeply, and apply knowledge to real-world scenarios.
