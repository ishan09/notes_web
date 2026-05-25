# Garbage Collection (GC)

> **Before you start**: Is having a bigger heap always better? (Hint: No, pause times!)

## What GC Does (and Doesn't)
*   **DOES**: Free unreachable heap objects.
*   **DOES NOT**: Fix memory leaks (if references still exist), free native memory, or manage Metaspace directly.
*   **Stop-The-World (STW)**: All GCs pause the app at some point. The goal is to minimize this duration.

## High-Level Flow (Generational GC)

```
Object Created
      ↓
Allocated in Young Gen
      ↓
Minor GC
      ↓
Alive? ─▶ Aged ─▶ Promoted to Old Gen
      ↓
Dead? ──▶ Freed
```

## GC Algorithms: Choose Your Fighter

| GC | Goal | Pro | Con |
| :--- | :--- | :--- | :--- |
| **G1 (Default)** | Balanced | Predictable pauses, standard for general apps | Tuning can be complex |
| **ZGC** | Low Latency | <1ms pauses, handles huge heaps (TB+) | Higher CPU usage |
| **Shenandoah** | Low Latency | Similar to ZGC (RedHat) | Higher CPU usage |
| **Parallel** | Throughput | Excellent for batch jobs | Long "Stop-The-World" pauses |

## Tuning Mental Model

**Golden Rule**: GC cost ∝ Allocation Rate.
*   If you create less garbage, GC does less work.

### 4 Real GC Tuning Levers
1.  **Allocation Rate** (Fix your code)
2.  **Heap Size** (`-Xms`, `-Xmx`)
3.  **Live Set Size** (How much data is actually needed?)
4.  **Pause Time Goals** (`-XX:MaxGCPauseMillis`)

### Practical G1 Tuning
Start simple:
```bash
-Xms4g -Xmx4g  # Fixed heap avoids resize cost
-XX:MaxGCPauseMillis=200
```

## Quick Check
1. Why does high allocation rate lead to CPU spikes?
2. Which GC is best for a background data processing job?

---
**Next**: [JVM Architecture & JIT](./03-jvm-architecture.md)
