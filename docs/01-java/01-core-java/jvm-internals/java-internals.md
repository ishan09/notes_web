# JVM Internals – Revision Cheat Sheet

## 1. JVM Memory Model (What lives where)

### Heap

* Stores **Java objects**
* Managed by **GC**
* Generational (Young → Old)
* GC cost mostly driven by **allocation rate**
* Bigger heap ≠ faster app

---

### Stack

* One **stack per thread**
* Stores:

  * Method calls
  * Local variables
* **Very fast**
* Not GC-managed
* Freed automatically when method returns

**Memory cost**

* Default ~**1 MB per thread**
* 1000 threads ≈ **~1 GB native memory**
* Too many threads → `unable to create native thread`

---

### Metaspace

* Stores **class metadata**
* Lives in **native memory (RAM)**
* Introduced in **Java 8** (replaced PermGen)

**Key points**

* Not part of heap
* GC does NOT collect it directly
* Class unloading happens **during GC**
* Grows dynamically

**Important flags**

```
-XX:MetaspaceSize        # GC trigger threshold (NOT pre-allocated)
-XX:MaxMetaspaceSize     # Hard cap (optional)
```

---

### Java 16+ Elastic Metaspace

* JVM can **return unused metaspace to OS**
* Much better for:

  * Containers
  * Redeploys
  * Plugin systems
* Java 8–15: metaspace shrinks poorly

---

### Direct / Native Memory

* Outside heap
* Used by:

  * NIO buffers
  * JNI
  * Thread stacks
  * Metaspace
* GC does NOT manage it
* Can cause native OOM even if heap is fine

---

## 2. Garbage Collection (GC)

### What GC does

* Frees **unreachable heap objects**
* Based on **reachability**, not “unused”

### GC does NOT

* Fix memory leaks
* Free native memory
* Manage metaspace directly
* Reduce allocations

---

### Stop-The-World (STW)

* GC pauses app to work safely
* Modern GC minimizes pause duration

---

### Generational GC (Core idea)

* Most objects die young
* Heap split into:

  * Young Gen (fast GC)
  * Old Gen (rare GC)

---

### GC Algorithms (High level)

| GC               | Goal               | Notes                  |
| ---------------- | ------------------ | ---------------------- |
| Parallel         | Throughput         | Long pauses            |
| CMS              | Low pause          | Fragmentation, removed |
| **G1 (default)** | Predictable pauses | Best general-purpose   |
| ZGC              | Ultra-low pause    | Needs more memory      |
| Shenandoah       | Ultra-low pause    | Similar to ZGC         |

---

## 3. JIT Compilation (Why Java gets fast)

### Execution flow

```
Source → Bytecode → Interpreter → C1 → C2
```

---

### C1 Compiler (Client)

* Fast compilation
* Basic optimizations
* Used during warm-up

---

### C2 Compiler (Server)

* Slow compilation
* Aggressive optimizations
* Used for **very hot code**
* Produces best performance

---

### Tiered Compilation

* JVM uses both C1 + C2
* Balances startup vs peak performance

---

## 4. How C1 / C2 Reduce GC

### Core rule

> **GC cost ∝ allocation rate**

C2 reduces GC by **eliminating allocations**

---

### Key optimizations (C2)

#### Escape Analysis

* If object doesn’t escape:

  * No heap allocation

#### Scalar Replacement

* Object broken into primitives
* Object may **not exist at all**

#### Stack allocation

* Short-lived objects on stack
* No GC involved

#### Lock elimination

* Removes unnecessary synchronization

#### Method inlining

* Removes temporary objects
* Reduces wrapper allocations

---

### Result

* Fewer allocations
* Young Gen fills slower
* Fewer GC cycles
* Lower latency

---

## 5. ClassLoaders & Leaks

### ClassLoader basics

* Classes belong to a **classloader**
* Classes unload only when **classloader is GC’d**

---

### Bootstrap ClassLoader

* Loads core Java classes
* Native
* Lives forever
* Never unloaded

---

### Application ClassLoader

* Loads app + libraries
* Can be GC’d
* One per application / deployment

---

### ClassLoader Leak (Metaspace leak)

**Common causes**

* Static fields
* ThreadLocals
* Background threads
* Executors not shut down
* Caches without cleanup

**Symptoms**

* Heap stable
* Metaspace grows
* OOM: Metaspace

---

### Prevention

* Shut down threads/executors
* Remove ThreadLocals
* Avoid static references to app objects
* Use lifecycle hooks (`@PreDestroy`)

---

## 6. GC Tuning (Thinking Framework)

### Tune only when:

* GC CPU > ~5–10%
* Latency spikes
* Frequent GC pauses
* Old Gen grows

---

### 4 Real GC Tuning Levers

1. **Allocation rate** (MOST IMPORTANT)
2. Heap size
3. Live set size
4. Pause time goals

---

### G1 GC – Practical tuning

Start with:

```
-Xms = -Xmx
```

Useful flags:

```
-XX:MaxGCPauseMillis=200
-XX:InitiatingHeapOccupancyPercent=45
```

Avoid tuning:

* Region size
* Survivor ratios
* Promotion rules

---

### When to use ZGC / Shenandoah

* p99 latency critical
* Large heap (8GB+)
* Can afford extra memory

---

## 7. Profiling (Reality check)

### Profilers do NOT

* Suggest code changes
* Understand business logic

### Profilers DO

* Show where time is spent
* Show where memory is allocated
* Show what retains memory
* Expose contention & leaks

---

### Allocation profiling

* Most important for GC issues
* Reveals object churn
* Points to optimization hotspots

---

### CPU profiling

* Shows hot methods after JIT
* Sampling preferred for production

---

### Leak vs High Allocation

| Issue           | Behavior                     |
| --------------- | ---------------------------- |
| High allocation | Heap up/down, GC works       |
| Heap leak       | Heap grows, GC can’t free    |
| Metaspace leak  | Heap stable, metaspace grows |

---

### Tools

* VisualVM → learning, basics
* JProfiler / YourKit → serious profiling
* jcmd / jmap / jstack → must-know JVM tools

---

## 8. Profiler “Suggestions” Reality

* Profilers give **signals**, not fixes
* Leak views give **strong hints**
* Humans decide:

  * If it’s a real issue
  * How to fix it

---

## Core Mental Models (Final)

```
Allocations → GC pressure
C2 → fewer allocations
Threads → native memory
ClassLoader alive → metaspace alive
Profiler → measurement
You → interpretation
```

---


# JVM Internals — Stick Diagram (Mental Map)

```
                ┌───────────────────────────┐
                │        Operating System   │
                │   (Physical RAM, CPU)     │
                └─────────────┬─────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │                 JVM Process               │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │           Native Memory              │  │
        │  │                                     │  │
        │  │  ┌──────────────┐                  │  │
        │  │  │ Thread Stack │  (per thread)     │  │
        │  │  │   ~1 MB      │◄─┐                │  │
        │  │  └──────────────┘  │                │  │
        │  │                    │                │  │
        │  │  ┌──────────────┐  │                │  │
        │  │  │  Metaspace   │◄─┼─ Class metadata│  │
        │  │  │ (Java 8+)    │  │                │  │
        │  │  └──────────────┘  │                │  │
        │  │                    │                │  │
        │  │  ┌──────────────┐  │                │  │
        │  │  │ Direct / NIO │  │                │  │
        │  │  │  Buffers     │  │                │  │
        │  │  └──────────────┘  │                │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │                Heap                 │  │
        │  │                                     │  │
        │  │   ┌────────────┐   ┌────────────┐  │  │
        │  │   │ Young Gen  │──▶│  Old Gen   │  │  │
        │  │   │ (Eden +    │   │            │  │  │
        │  │   │ Survivor) │   │            │  │  │
        │  │   └────────────┘   └────────────┘  │  │
        │  │                                     │  │
        │  │   GC works here (heap only)         │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │            Code Cache                │  │
        │  │   (JIT compiled native code)         │  │
        │  │    C1 → C2 output                    │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        └───────────────────────────────────────────┘
```

---

# Execution Flow (Interpreter → C1 → C2)

```
Java Source
    ↓
Bytecode (.class)
    ↓
Interpreter (startup)
    ↓
C1 Compiler (fast, basic)
    ↓
C2 Compiler (slow, optimized)
    ↓
Native Machine Code (Code Cache)
```

---

# GC + Allocation Flow

```
Object Created
      ↓
Allocated in Young Gen
      ↓
Minor GC
      ↓
Dead? ──▶ Freed
Alive? ─▶ Aged
      ↓
Promoted to Old Gen
      ↓
Major / Concurrent GC
```

---

# Allocation vs GC Pressure

```
High Allocation Rate
        ↓
Young Gen fills fast
        ↓
Frequent GC
        ↓
CPU + Latency spikes
```

C2 effect:

```
C2 optimizations
        ↓
Fewer allocations
        ↓
Less GC
```

---

# Thread Memory Model

```
Thread
  │
  ├─ Stack (~1 MB)   ← native memory
  │     ├─ method frames
  │     ├─ local variables
  │     └─ return addresses
  │
  └─ Heap references (objects)
```

Many threads ⇒ high native memory usage

---

# ClassLoader & Metaspace

```
Bootstrap ClassLoader
        ↓
Application ClassLoader
        ↓
Loaded Classes
        ↓
Metaspace (native memory)
```

---

# ClassLoader Leak Pattern

```
Static / ThreadLocal / Thread
        ↓
References App Class
        ↓
App ClassLoader
        ↓
Metaspace NOT freed ❌
```

---

# GC & Metaspace Interaction

```
Metaspace grows
        ↓
Crosses MetaspaceSize
        ↓
GC triggered
        ↓
ClassLoader unreachable?
     │        │
    Yes      No
     │        │
Unload     Metaspace stays
classes
```

---

# Profiler Mental Flow

```
Symptom
   ↓
Measure (Profiler)
   ↓
Hot Allocation / Retention
   ↓
Code Fix
   ↓
GC Improves
```

---

# One-Line Memory Map (Ultra Compact)

```
Heap → Objects → GC
Stack → Calls → Per Thread
Metaspace → Classes → ClassLoader
Native → Threads / NIO → No GC
Code Cache → JIT (C1/C2)
```

---


# JVM Flags Cheat Sheet + Mental Model

This is **not an exhaustive list** — it’s the **20% of flags you’ll actually use 80% of the time**.

## Mental Model (remember this first)

Think of JVM flags in **5 buckets**:

```
1. Heap        → Object memory (GC-managed)
2. GC          → How cleanup happens
3. Threads     → Concurrency & stack memory
4. Metaspace   → Classes & classloaders
5. Native      → Everything else (off-heap)
```

If you know **which bucket you’re tuning**, you won’t misuse flags.

---

## 1️⃣ Heap Flags (Object Memory)

### Mental model

> “How much memory can objects use?”

```
-Xms  → Start size
-Xmx  → Max size
```

### Common flags

```bash
-Xms4g              # Initial heap size
-Xmx4g              # Maximum heap size
```

### Best practice

```
-Xms = -Xmx         # Fixed heap for servers
```

### Related (rarely needed)

```bash
-XX:NewRatio=3      # Old:Young ratio (avoid with G1)
```

---

## 2️⃣ GC Selection Flags (Cleanup Strategy)

### Mental model

> “How do I want GC to behave?”

### Choose ONE GC

```bash
-XX:+UseG1GC
-XX:+UseZGC
-XX:+UseShenandoahGC
-XX:+UseParallelGC
```

Default:

* Java 9+ → **G1GC**

---

## 3️⃣ GC Tuning Flags (Pause vs Throughput)

### Mental model

> “How much pause can I tolerate?”

### Most useful

```bash
-XX:MaxGCPauseMillis=200
```

### G1-specific (safe)

```bash
-XX:InitiatingHeapOccupancyPercent=45
```

Avoid:

```bash
# Don't manually size regions or survivor spaces unless expert
```

---

## 4️⃣ Thread Flags (Native Memory Heavy)

### Mental model

> “Threads cost native memory”

```bash
-Xss1m          # Stack size per thread
```

Defaults:

* ~1 MB per thread

### When to change

* Too many threads → reduce stack size
* Deep recursion → increase stack size

---

## 5️⃣ Metaspace Flags (Classes & ClassLoaders)

### Mental model

> “How many classes can I load?”

```bash
-XX:MetaspaceSize=128m        # GC trigger threshold
-XX:MaxMetaspaceSize=512m     # Hard cap
```

⚠️ Not pre-allocated
⚠️ GC triggers class unloading

---

## 6️⃣ Direct / Native Memory Flags

### Mental model

> “Off-heap memory is dangerous but fast”

```bash
-XX:MaxDirectMemorySize=1g
```

If unset:

* Defaults roughly to `Xmx`

Used heavily by:

* NIO
* Netty
* Kafka

---

## 7️⃣ JIT / Compiler Flags (Rarely Touched)

### Mental model

> “How aggressively to optimize code”

```bash
-XX:+TieredCompilation        # Default ON
-XX:TieredStopAtLevel=4       # Full C2
```

Avoid unless benchmarking.

---

## 8️⃣ Code Cache Flags (JIT Output)

### Mental model

> “Where compiled code lives”

```bash
-XX:ReservedCodeCacheSize=256m
```

Symptoms if too small:

* De-optimization
* Performance drop after warm-up

---

## 9️⃣ GC Logging (Always enable in prod)

### Mental model

> “Visibility beats guessing”

Modern (Java 11+):

```bash
-Xlog:gc*,gc+heap=info
```

Old (Java 8):

```bash
-XX:+PrintGCDetails
-XX:+PrintGCDateStamps
```

---

## 🔟 Diagnostics & Troubleshooting Flags

### Mental model

> “When things go wrong, leave evidence”

```bash
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/tmp/heapdump.hprof
```

---

## 1️⃣1️⃣ Container / Cloud Flags (Very Important)

### Mental model

> “Heap must fit inside container limits”

```bash
-XX:MaxRAMPercentage=75
-XX:InitialRAMPercentage=50
```

Preferred over hard Xmx in containers.

---

## 1️⃣2️⃣ Class Unloading & Metaspace Debugging

```bash
-XX:+TraceClassLoading
-XX:+TraceClassUnloading
```

Use only for debugging.

---

# One-Line Memory Budget Formula (VERY IMPORTANT)

```
Total Process Memory ≈
  Heap (Xmx)
+ Thread stacks (Xss × threads)
+ Metaspace
+ Direct memory
+ Code cache
```

If this exceeds RAM / container limit → OOM

---

# Quick “Which Flag Do I Touch?” Guide

| Symptom            | Look at                 |
| ------------------ | ----------------------- |
| Frequent GC        | Allocation profiling    |
| Long GC pauses     | MaxGCPauseMillis        |
| Native OOM         | Threads / Direct memory |
| Metaspace OOM      | Classloader leaks       |
| Slow after warm-up | Code cache              |
| Pod OOM            | Heap + native sum       |

---

# Flags You Should Almost Never Touch

```bash
-XX:SurvivorRatio
-XX:MaxTenuringThreshold
-XX:G1HeapRegionSize
```

These usually cause more harm than good.

---

# Final Memory Map (Mental Anchor)

```
Heap        → -Xmx
Threads     → -Xss
Metaspace   → -XX:MaxMetaspaceSize
Direct      → -XX:MaxDirectMemorySize
JIT code    → -XX:ReservedCodeCacheSize
```

---

## Final Advice (very important)

* Fix code before flags
* Measure before tuning
* Start with defaults
* Use flags sparingly
* Know which “bucket” you’re tuning

---
