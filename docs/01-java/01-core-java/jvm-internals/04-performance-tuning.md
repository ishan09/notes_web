# Performance Tuning & Flags

> **Before you start**: Don't guess. Measure.

## The Memory Budget Formula

Before optimizing, ensure your JVM fits in your container/RAM.

```
Total Process Memory ≈
  Heap (Xmx)
+ Thread stacks (Xss × threads)
+ Metaspace (MaxMetaspaceSize)
+ Direct memory (NIO buffers)
+ Code cache (ReservedCodeCacheSize)
```
**Risk**: If Total > Container RAM -> **Linux OOM Killer** kills your app.

## Profiler Mental Model

**Profilers do NOT**: Suggest code changes or understand business logic.
**Profilers DO**: Show where memory/CPU is spent.

### The Troubleshooting Flow
```
Symptom
   ↓
Measure (Profiler / APM)
   ↓
Identify Hotspot (Allocation OR CPU)
   ↓
Code Fix (Reduce loop size, remove heavy object)
   ↓
Verify Improvement
```

## Flags Cheat Sheet (The 20% you need)

### 1. Heap (The Basics)
*   `-Xms4g -Xmx4g`: Lock heap size to avoid resize jitter.
*   `-XX:MaxRAMPercentage=75`: Good for containers (auto-detect RAM).

### 2. Garbage Collection
*   `-XX:+UseG1GC`: Standard for Java 8+.
*   `-XX:MaxGCPauseMillis=200`: "Try to pause for max 200ms".

### 3. Native & Threads
*   `-Xss1m`: Stack size per thread (default is usually 1MB).
*   `-XX:MaxDirectMemorySize=1g`: Cap off-heap memory safety.

### 4. Diagnostics (Always ON in Prod)
*   `-XX:+HeapDumpOnOutOfMemoryError`
*   `-XX:HeapDumpPath=/log/heapdump.hprof`
*   `-Xlog:gc*` (Java 11+ GC logging)

### 5. Advanced Debugging (Use carefully)
*   `-XX:+TraceClassLoading`: Helpful for debugging Metaspace leaks.
*   `-XX:+TraceClassUnloading`: confirm if classes are actually being unloaded.

### 6. Flags to AVOID (The Danger Zone)
*   `-XX:SurvivorRatio`: Let GC handle generation sizing.
*   `-XX:MaxTenuringThreshold`: Don't manually promote objects.
*   `-XX:G1HeapRegionSize`: Default is usually optimal.

## Quick Check
1. What is the difference between `-Xmx` and Total Process Memory?
2. Which flag helps you debug an OutOfMemoryError after the app crashes?

---
**Summary**: You now understand the engine running your code.
