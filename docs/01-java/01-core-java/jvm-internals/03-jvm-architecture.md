# JVM Architecture & JIT

> **Before you start**: Why is Java slower at startup but faster over time?

## Execution Flow Mental Model

```
Java Source
    ↓
Bytecode (.class)
    ↓
Interpreter (starts immediately)
    ↓
C1 Compiler (fast compilation, basic profiling)
    ↓
C2 Compiler (slow compilation, DEEP optimization)
    ↓
Native Machine Code (stored in Code Cache)
```

## JIT (Just-In-Time) Compiler

### Tiered Compilation
The JVM uses both C1 and C2 compilers.
*   **Interpretation**: Runs immediately but slowly.
*   **C1**: Compiles hot methods quickly for decent performance.
*   **C2**: Compiles *very* hot methods slowly for peak performance.

### Key Optimizations (How C2 reduces GC)
1.  **Escape Analysis**: "Does this object live only inside this method?" -> **Stack Allocation**.
2.  **Scalar Replacement**: Breaks object into primitive variables (virtual object).
3.  **Lock Elimination**: Removes synchronization if the object is thread-local (determined by Escape Analysis).
4.  **Inlining**: Copies method body into caller to remove overhead.

## ClassLoaders

```
Bootstrap ClassLoader (Core Java classes)
    ↓
Application ClassLoader (Your code + libs)
    ↓
Loaded Classes ──▶ stored in Metaspace
```

### The ClassLoader Leak
**Scenario**: You redeploy an app, but the old version stays in memory.
**Cause**: Something (ThreadLocal, Static field, strong reference) still holds a reference to the **Old ClassLoader**.
**Result**: `java.lang.OutOfMemoryError: Metaspace`

## Quick Check
1. What happens if the Code Cache fills up? (Hint: De-optimization)
2. Can a private static field cause a memory leak?

---
**Next**: [Performance Tuning](./04-performance-tuning.md)
