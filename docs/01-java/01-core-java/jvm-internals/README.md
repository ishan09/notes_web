# JVM Internals Roadmap

Understanding the JVM separates developers from engineers. These modules break down the black box into understandable components.

## Core Modules

### 1. [Memory Model](./01-memory-model.md)
*   **Stick Diagrams**: Visualizing the runtime areas.
*   **Heap vs Stack**: Where variables live.
*   **Metaspace**: Where classes live.

### 2. [Garbage Collection](./02-garbage-collection.md)
*   **Algorithms**: G1, ZGC, Parallel.
*   **Tuning**: Pause time vs Throughput.
*   **Mental Models**: Allocation rate is king.

### 3. [Architecture & JIT](./03-jvm-architecture.md)
*   **Execution Flow**: Source -> C1 -> C2 -> Native.
*   **C2 Optimizations**: How code gets faster.
*   **ClassLoaders**: The hierarchy.

### 4. [Performance Tuning](./04-performance-tuning.md)
*   **Flags Cheat Sheet**: The essential 20%.
*   **Memory Budget**: Avoiding OOM.
*   **Profiling**: How to find bottlenecks.

---
**Looking for a plan?** Check the [STUDY_TRACKER.md](../../STUDY_TRACKER.md).
