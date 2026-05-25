# JVM Memory Model

> **Before you start**: Can you draw the JVM memory layout on a napkin?

## High-Level Stick Diagram

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
        │  │           Native Memory             │  │
        │  │                                     │  │
        │  │  ┌──────────────┐                  │  │
        │  │  │ Thread Stack │  (per thread)    │  │
        │  │  │   ~1 MB      │◄─┐               │  │
        │  │  └──────────────┘  │               │  │
        │  │                    │               │  │
        │  │  ┌──────────────┐  │               │  │
        │  │  │  Metaspace   │◄─┼─ Class Meta   │  │
        │  │  └──────────────┘  │               │  │
        │  │                    │               │  │
        │  │  ┌──────────────┐  │               │  │
        │  │  │ Direct / NIO │  │               │  │
        │  │  └──────────────┘  │               │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │                Heap                 │  │
        │  │   (Objects living here)             │  │
        │  │   ┌────────────┐   ┌────────────┐   │  │
        │  │   │ Young Gen  │──▶│  Old Gen   │   │  │
        │  │   └────────────┘   └────────────┘   │  │
        │  │                                     │  │
        │  │   GC works here (heap only)         │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │            Code Cache               │  │
        │  │   (JIT compiled native code)        │  │
        │  └─────────────────────────────────────┘  │
        └───────────────────────────────────────────┘
```

## 1. Heap (Object Storage)
*   Stores **Java objects**
*   Managed by **GC**
*   Generational (Young → Old)
*   **Key Insight**: Bigger heap ≠ faster app (can lead to longer GC pauses).

## 2. Stack (Thread Memory)
*   One stack **per thread**
*   Stores: Method calls, Local variables
*   **Very fast**, NOT managed by GC
*   Freed automatically when method returns

## 3. Metaspace (Class Metadata)
*   Stores **class structure** (methods, fields)
*   Lives in **Native Memory** (not Heap)
*   Grows dynamically until `MaxMetaspaceSize`

> **Note**: In Java 8+, this replaced "PermGen".

### Java 16+ Elastic Metaspace
*   **Feature**: JVM can **return unused metaspace to the OS**.
*   **Benefit**: Huge win for containers and plugin systems where apps redeploy frequently.
*   **Contrast**: In Java 8-15, metaspace often shrank poorly, holding onto RAM.

## 4. Off-Heap / Direct Memory
*   Used by **NIO** (Netty, Kafka)
*   Zero-copy operations
*   **Danger**: GC does not manage this directly; can cause native OOM.

## Quick Check
1. Which memory area stores Local Variables? (Hint: Stack)
2. Does GC clean up the Stack?

---
**Next**: [Garbage Collection](./02-garbage-collection.md)
