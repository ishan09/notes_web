# Apache Kafka - Advanced Interview Questions

## Before You Start

This file covers **advanced Kafka concepts** frequently asked in SDE interviews for backend roles. You should understand:
- Basic Kafka concepts (topics, partitions, producers, consumers)
- Pub-sub messaging patterns
- Distributed systems fundamentals

This guide is organized by topic area, covering production-level scenarios you'll encounter when building scalable event-driven systems.

---

## Table of Contents

### Part 1: Replication & Fault Tolerance
- ISR vs AR
- Leader Election
- Broker Failure Handling
- Unclean Leader Election

### Part 2: Performance & Optimization
- Sticky Partitioning Strategy
- Zero-Copy Transfer
- Page Cache Usage
- Batching and Compression
- Scaling to Millions of Messages/Second

### Part 3: Exactly-Once Semantics (EOS)
- What is EOS and How It's Achieved
- Kafka Transactions
- When EOS Fails
- Kafka Streams Exactly-Once

### Part 4: Consumer Management
- Consumer Group Rebalancing
- Reducing Rebalances
- Consumer Lag vs End-to-End Latency
- Backpressure Handling

### Part 5: Operational Concerns
- Monitoring Kafka in Production
- Log Compaction
- Handling Large Messages
- Tiered Storage

### Part 6: Modern Kafka (KRaft)
- KRaft Mode vs Zookeeper
- Benefits of KRaft
- Migration Path

---

## Part 1: Replication & Fault Tolerance

### Q1: What is the difference between ISR and AR in Kafka?

**Answer:**

**ISR (In-Sync Replicas)**:
- Replicas that are **fully caught up** with the leader
- Have replicated all messages from the leader
- Eligible for leader election
- Ensures data durability

**AR (Assigned Replicas)**:
- **All replicas** assigned to a partition (including lagging ones)
- Includes both in-sync and out-of-sync replicas
- Total number of replicas configured for the partition

**Example**:
```
Topic: orders, Partition: 0, Replication Factor: 3

Broker 1 (Leader):   Offset 0-1000  [ISR]
Broker 2 (Follower): Offset 0-1000  [ISR]
Broker 3 (Follower): Offset 0-950   [AR but NOT ISR - lagging]

ISR = [Broker 1, Broker 2]
AR  = [Broker 1, Broker 2, Broker 3]
```

**Why ISR matters**:
- Only ISR members can become leader (ensures no data loss)
- Producer `acks=all` waits for all ISR members to acknowledge
- If a replica falls behind (`replica.lag.time.max.ms`), it's removed from ISR

**Interview tip**: Explain that `min.insync.replicas` setting ensures minimum ISR count before accepting writes (e.g., `min.insync.replicas=2` with `replication.factor=3` ensures at least 2 replicas are in sync).

---

### Q2: How does Kafka handle leader election?

**Answer:**

**Leader Election Process**:

1. **Controller Role**:
   - One Kafka broker acts as the **Controller** (elected via Zookeeper/KRaft)
   - Controller manages all leader elections cluster-wide

2. **Leader Election Trigger**:
   - Current leader broker fails
   - Partition reassignment
   - Preferred leader election (rebalancing)

3. **Election Process**:
   ```
   Step 1: Controller detects leader failure (via heartbeat/Zookeeper watch)
   Step 2: Controller selects new leader from ISR list
   Step 3: Controller updates metadata in Zookeeper/KRaft
   Step 4: Controller sends LeaderAndIsr request to all brokers
   Step 5: Brokers update their metadata cache
   Step 6: Clients discover new leader via metadata refresh
   ```

4. **Leader Selection Criteria**:
   - **Must be in ISR** (ensures no data loss)
   - First replica in ISR list is chosen (deterministic)
   - If ISR is empty and `unclean.leader.election.enable=true`, any replica can become leader (risk of data loss)

**Zookeeper vs KRaft**:

| Zookeeper (Legacy) | KRaft (Modern) |
|-------------------|----------------|
| Controller elected via Zookeeper | Controller uses Raft consensus |
| Metadata stored in Zookeeper | Metadata stored in Kafka itself |
| Slower election (~seconds) | Faster election (~milliseconds) |
| External dependency | Self-contained |

**Configuration**:
```properties
# Disable unclean leader election (prevent data loss)
unclean.leader.election.enable=false

# KRaft mode (Kafka 3.3+)
process.roles=broker,controller
controller.quorum.voters=1@localhost:9093
```

**Interview scenario**: "What happens if all ISR replicas are down?"
- If `unclean.leader.election.enable=false` → Partition becomes unavailable (no writes/reads)
- If `unclean.leader.election.enable=true` → Out-of-sync replica becomes leader (data loss possible)

---

### Q3: What happens internally when a Kafka broker fails?

**Answer:**

**Step-by-Step Failure Handling**:

**1. Failure Detection** (~10-30 seconds):
```
- Controller monitors broker health via heartbeats
- Zookeeper ephemeral node disappears OR KRaft heartbeat fails
- Controller marks broker as dead
```

**2. Leader Re-Election**:
```
For each partition where failed broker was leader:
  - Controller picks new leader from ISR
  - Updates partition metadata
  - Sends LeaderAndIsr request to all brokers
```

**3. ISR Adjustment**:
```
For each partition where failed broker was a follower:
  - Remove failed broker from ISR
  - Continue with reduced ISR (if min.insync.replicas satisfied)
```

**4. Client Failover**:
```
- Producers detect leader change via metadata refresh
- Producers retry failed messages to new leader
- Consumers continue reading from new leader
```

**5. Data Consistency**:
```
- No data loss if broker was in ISR
- In-flight messages may be duplicated (at-least-once semantics)
- Committed offsets preserved in __consumer_offsets topic
```

**Example Scenario**:
```
Initial state:
  Partition 0: Leader=Broker1, ISR=[Broker1, Broker2, Broker3]

Broker1 fails:
  Step 1: Controller detects failure
  Step 2: Elects Broker2 as new leader (first in ISR)
  Step 3: ISR=[Broker2, Broker3] (removed Broker1)
  Step 4: Producers/Consumers switch to Broker2

Broker1 recovers:
  Step 1: Broker1 rejoins cluster
  Step 2: Starts replicating from new leader (Broker2)
  Step 3: Once caught up, added back to ISR
  Step 4: ISR=[Broker2, Broker3, Broker1]
```

**Configuration affecting behavior**:
```properties
# How long before broker is considered dead
replica.lag.time.max.ms=30000

# Minimum in-sync replicas required
min.insync.replicas=2

# Producer retry configuration
retries=2147483647
retry.backoff.ms=100
```

**Interview tip**: Mention that Kafka's replication is **asynchronous by default** (followers fetch from leader), but `acks=all` makes it **synchronous** (waits for ISR acknowledgment).

---

### Q4: What is Unclean Leader Election and when would you enable it?

**Answer:**

**Unclean Leader Election**:
- Allows **out-of-sync replicas** (not in ISR) to become leader
- Enabled via `unclean.leader.election.enable=true`

**When it's triggered**:
```
Scenario: All ISR replicas are down

Option 1 (unclean.leader.election=false):
  → Partition unavailable until ISR replica recovers
  → No data loss, but reduced availability

Option 2 (unclean.leader.election=true):
  → Out-of-sync replica becomes leader
  → Partition available, but potential data loss
```

**Trade-offs**:

| Aspect | Enabled (true) | Disabled (false) |
|--------|---------------|------------------|
| **Availability** | Higher (partition stays online) | Lower (partition offline if ISR empty) |
| **Durability** | Lower (data loss possible) | Higher (no data loss) |
| **Use Case** | Metrics, logs (loss tolerable) | Financial data, orders (loss unacceptable) |

**Example Data Loss Scenario**:
```
Initial state:
  Partition 0: Leader=Broker1 (offset 0-1000), ISR=[Broker1, Broker2]
  Broker2: (offset 0-950) - lagging by 50 messages

Broker1 and Broker2 fail:
  Broker3 (offset 0-900) is only remaining replica

If unclean.leader.election=true:
  → Broker3 becomes leader with offset 0-900
  → Messages 901-1000 are LOST!

If unclean.leader.election=false:
  → Partition unavailable until Broker1 or Broker2 recovers
  → No data loss
```

**Best practice**:
```properties
# For critical data (orders, payments, user actions)
unclean.leader.election.enable=false

# For non-critical data (metrics, logs, analytics)
unclean.leader.election.enable=true
```

**Interview tip**: Explain the **CAP theorem trade-off** - Kafka chooses **Consistency** (no unclean election) by default, but you can choose **Availability** (allow unclean election) if needed.

---

## Part 2: Performance & Optimization

### Q5: What is Sticky Partitioning Strategy and how does it improve performance?

**Answer:**

**Sticky Partitioning**:
- Producer **batches messages to the same partition** until batch is full or timeout
- Introduced in Kafka 2.4 to improve throughput

**Comparison**:

**Round-Robin Partitioning (Old Default)**:
```
Producer sends messages:
  Message 1 → Partition 0
  Message 2 → Partition 1
  Message 3 → Partition 2
  Message 4 → Partition 0
  Message 5 → Partition 1
  ...

Result: Small batches per partition → Many network calls
```

**Sticky Partitioning (New Default)**:
```
Producer sends messages:
  Message 1-100   → Partition 0 (batch full)
  Message 101-200 → Partition 1 (batch full)
  Message 201-300 → Partition 2 (batch full)
  ...

Result: Larger batches → Fewer network calls
```

**Performance Impact**:
- **Throughput**: 30-50% improvement (fewer network round-trips)
- **Latency**: Slightly higher per message (waits for batch to fill)
- **Compression**: Better compression ratio (larger batches)

**Configuration**:
```java
Properties props = new Properties();
props.put("partitioner.class", "org.apache.kafka.clients.producer.UniformStickyPartitioner");
props.put("batch.size", 16384);        // 16 KB batch
props.put("linger.ms", 10);            // Wait up to 10ms to fill batch
props.put("compression.type", "lz4");  // Compress batch
```

**When to use**:
- ✅ High-throughput scenarios (logs, metrics, events)
- ✅ Messages without keys (keys always go to same partition)
- ❌ Strict ordering requirements across all messages (use keyed messages instead)

**Interview tip**: Explain that sticky partitioning **only applies to messages without keys**. Messages with keys always go to the same partition based on `hash(key) % num_partitions`.

---

### Q6: Explain Zero-Copy in Kafka and why it's important for performance.

**Answer:**

**Zero-Copy Transfer**:
- Kafka **transfers data directly from disk to network socket** without copying to user space
- Uses `sendfile()` system call (Linux)

**Traditional I/O (4 copies)**:
```
Step 1: Disk → Kernel buffer (DMA copy)
Step 2: Kernel buffer → Application buffer (CPU copy)
Step 3: Application buffer → Socket buffer (CPU copy)
Step 4: Socket buffer → NIC (DMA copy)

Total: 4 copies, 2 context switches (kernel ↔ user space)
```

**Zero-Copy I/O (2 copies)**:
```
Step 1: Disk → Kernel buffer (DMA copy)
Step 2: Kernel buffer → NIC (DMA copy)

Total: 2 copies, no CPU involvement, no context switches
```

**Visual Representation**:
```
Traditional:
  Disk → [Kernel] → [User Space: Kafka] → [Kernel] → Network
       ↑ Copy      ↑ Copy                ↑ Copy

Zero-Copy:
  Disk → [Kernel] ─────────────────────→ Network
       ↑ Copy                            ↑ Copy
       (CPU not involved)
```

**Performance Benefits**:
- **50-70% reduction in CPU usage** (CPU not copying data)
- **2x higher throughput** (fewer copies, fewer context switches)
- **Lower latency** (direct disk-to-network transfer)

**When Kafka uses Zero-Copy**:
- Consumer reads from disk (log segments)
- Broker replicates data to followers
- Producer compressed data (already in network format)

**When Zero-Copy is NOT used**:
- Broker decompresses data (needs to touch data in user space)
- SSL/TLS encryption (needs to encrypt data in user space)
- Message transformation (needs to modify data)

**Configuration**:
```properties
# Verify zero-copy is enabled (default)
log.segment.bytes=1073741824  # 1 GB segments
```

**Interview tip**: Explain that zero-copy is a key reason Kafka can achieve **millions of messages per second** with relatively low CPU usage.

---

### Q7: How does Kafka use Page Cache for high performance?

**Answer:**

**Page Cache Strategy**:
- Kafka **relies on OS page cache** instead of application-level caching
- Messages are written to disk but **served from RAM** (page cache)

**How it works**:
```
Write path:
  Producer → Kafka → Write to log file → OS page cache → Disk (async)
                                           ↑
                                      Cached in RAM

Read path:
  Consumer → Kafka → Read from page cache → Return (no disk I/O!)
                         ↑
                    Already in RAM from writes
```

**Benefits**:

**1. Write Performance**:
```java
// Kafka writes are sequential appends
// Sequential writes to disk: ~100 MB/s
// Sequential writes to page cache: ~1 GB/s (10x faster)
producer.send(new ProducerRecord<>("orders", order));
// Returns immediately (buffered in page cache)
```

**2. Read Performance**:
```java
// Recent messages are in page cache (RAM)
// Reading from RAM: ~10 GB/s
// Reading from disk: ~100 MB/s (100x slower)
consumer.poll(Duration.ofMillis(100));
// Fast if consumer is caught up (reads from cache)
```

**3. Zero-Copy Friendly**:
- Data in page cache can be transferred to network via `sendfile()` (zero-copy)

**Why not use JVM heap cache?**

| JVM Heap Cache | OS Page Cache |
|---------------|---------------|
| Limited by heap size (few GB) | Uses all available RAM (tens of GB) |
| Garbage collection overhead | No GC (kernel manages memory) |
| Duplicates data (heap + page cache) | Single copy of data |
| Process restart clears cache | Survives process restart |

**Configuration**:
```yaml
# Kafka broker JVM settings
# Keep heap small (let OS use RAM for page cache)
KAFKA_HEAP_OPTS: "-Xmx1G -Xms1G"

# Let OS use remaining RAM for page cache
# Example: 32 GB server
#   - 1 GB: Kafka JVM heap
#   - 31 GB: OS page cache (stores log segments)
```

**Trade-offs**:
- **Benefit**: Extremely high throughput for recent data
- **Limitation**: Old data evicted from cache (disk I/O required)

**Real-world example**:
```
Scenario: 1 million messages/sec
  - Recent messages (last 5 min): Served from page cache (~10 GB in RAM)
  - Older messages: Fetched from disk (slower, but less frequent)

Result: 99% of reads served from RAM!
```

**Interview tip**: Explain that Kafka's design is **cache-aware** - it writes sequentially to disk and relies on OS page cache for reads, avoiding the complexity of managing an application-level cache.

---

### Q8: How do you scale Kafka to millions of messages per second?

**Answer:**

**Comprehensive Scaling Strategy**:

**1. Increase Partitions** (Horizontal Scaling):
```properties
# More partitions = more parallelism
num.partitions=100

# Each partition can handle ~10-50 MB/s
# 100 partitions × 50 MB/s = 5 GB/s throughput
```

**Trade-offs**:
- ✅ Benefit: Linear scalability
- ❌ Limitation: More partitions = more file handles, more leader elections

**2. Add More Brokers**:
```
3 brokers → 10 brokers = 3x capacity

Partition distribution:
  100 partitions ÷ 10 brokers = 10 partitions per broker
```

**3. Use Compression** (2-5x reduction):
```java
Properties props = new Properties();
props.put("compression.type", "lz4");  // Best balance (speed vs ratio)

// Other options:
// "snappy" - Faster compression, lower ratio
// "gzip"   - Slower compression, higher ratio
// "zstd"   - Best ratio, moderate speed (Kafka 2.1+)
```

**Compression performance**:
```
Uncompressed: 1 MB message
LZ4:          250 KB (75% reduction, minimal CPU)
Snappy:       300 KB (70% reduction, very fast)
Gzip:         200 KB (80% reduction, slower)
```

**4. Enable Batching** (Reduce Network Overhead):
```java
// Producer batching
props.put("batch.size", 65536);      // 64 KB batches
props.put("linger.ms", 10);          // Wait 10ms to accumulate batch
props.put("buffer.memory", 67108864); // 64 MB buffer

// Benefit: 100 individual messages → 1 batch = 100x fewer network calls
```

**5. Use Async Producers**:
```java
// Synchronous (slow)
for (int i = 0; i < 1_000_000; i++) {
    producer.send(record).get();  // Blocks until acknowledged
}
// Throughput: ~5,000 messages/sec

// Asynchronous (fast)
for (int i = 0; i < 1_000_000; i++) {
    producer.send(record, callback);  // Non-blocking
}
// Throughput: ~500,000 messages/sec (100x faster)
```

**6. Tune `acks` Based on Requirements**:
```java
// Fastest (no durability guarantee)
props.put("acks", "0");  // Fire-and-forget
// Throughput: ~1,000,000 msg/sec

// Balanced (leader acknowledgment)
props.put("acks", "1");  // Leader persisted
// Throughput: ~500,000 msg/sec

// Safest (all ISR acknowledgment)
props.put("acks", "all");  // All replicas persisted
// Throughput: ~100,000 msg/sec
```

**7. Leverage Zero-Copy Transfer**:
```properties
# Ensure no SSL (breaks zero-copy)
# Ensure no message transformation
# Use compression at producer (not broker)

# Zero-copy enabled by default
```

**8. Optimize Consumer Settings**:
```java
// Fetch more data per request
props.put("fetch.min.bytes", 1048576);     // 1 MB minimum
props.put("fetch.max.wait.ms", 500);       // Wait up to 500ms
props.put("max.partition.fetch.bytes", 10485760);  // 10 MB max per partition

// Process in batches
ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
records.forEach(record -> process(record));
```

**Real-World Architecture**:
```
Scenario: 10 million messages/second

Setup:
  - 10 Kafka brokers (each handling 1M msg/sec)
  - 100 partitions (each handling 100K msg/sec)
  - Replication factor: 3 (durability)
  - Compression: LZ4 (75% reduction)
  - Batching: 64 KB batches, 10ms linger
  - Async producers
  - acks=1 (leader acknowledgment)

Result:
  - Write throughput: 10M msg/sec = 5 GB/sec (compressed)
  - Latency: p99 < 50ms
  - CPU usage: ~30% (zero-copy)
  - Disk writes: 15 GB/sec (3x replication)
```

**Interview tip**: Emphasize the **trade-offs** - higher throughput often means lower durability or higher latency. Production systems balance these based on business requirements.

---

## Part 3: Exactly-Once Semantics (EOS)

### Q9: What is Exactly-Once Semantics (EOS) in Kafka? How is it achieved?

**Answer:**

**Exactly-Once Semantics (EOS)**:
- Guarantees **each message is processed exactly once**, even during failures and retries
- No duplicates, no data loss

**Problem it solves**:
```
Scenario: Producer sends message, Kafka acknowledges, but network fails

At-Least-Once (default):
  Producer retries → Message written twice → Duplicates!

At-Most-Once (acks=0):
  Producer doesn't retry → Message may be lost

Exactly-Once (EOS):
  Producer retries → Kafka deduplicates → No duplicates!
```

**How EOS is achieved**:

**1. Idempotent Producers**:
```java
Properties props = new Properties();
props.put("enable.idempotence", "true");  // Enables EOS

// Behind the scenes:
// - Kafka assigns Producer ID (PID)
// - Producer adds sequence number to each message
// - Broker detects duplicates (same PID + sequence number)

ProducerRecord<String, String> record = new ProducerRecord<>("orders", "order-123");
producer.send(record);
// If retry happens, Kafka deduplicates based on PID + sequence
```

**Internal mechanism**:
```
Producer sends:
  Message 1: PID=100, Seq=0
  Message 2: PID=100, Seq=1
  Message 3: PID=100, Seq=2

Network failure, producer retries Message 2:
  Message 2 (retry): PID=100, Seq=1

Broker checks:
  - Already received PID=100, Seq=1 → Duplicate!
  - Acknowledges without writing again
```

**2. Transactional Producers** (Atomic Multi-Partition Writes):
```java
Properties props = new Properties();
props.put("enable.idempotence", "true");
props.put("transactional.id", "order-processor-1");  // Unique per producer

KafkaProducer<String, String> producer = new KafkaProducer<>(props);

producer.initTransactions();  // Initialize

try {
    producer.beginTransaction();

    // Send to multiple partitions atomically
    producer.send(new ProducerRecord<>("orders", "order-123"));
    producer.send(new ProducerRecord<>("inventory", "update-item-456"));
    producer.send(new ProducerRecord<>("notifications", "email-customer-789"));

    producer.commitTransaction();  // All-or-nothing commit

} catch (Exception e) {
    producer.abortTransaction();  // Rollback all messages
}
```

**What happens during commit**:
```
Step 1: Producer writes messages to partitions (marked as "uncommitted")
Step 2: Producer sends commit request to Transaction Coordinator
Step 3: Coordinator writes commit marker to all partitions
Step 4: Messages become visible to consumers

If failure before commit:
  - Messages stay uncommitted
  - Consumers with isolation.level=read_committed don't see them
  - Kafka garbage-collects uncommitted messages after timeout
```

**3. Consumers with `read_committed`**:
```java
Properties props = new Properties();
props.put("isolation.level", "read_committed");  // Only read committed messages

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders"));

ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
// Only sees committed messages (skips aborted transactions)
```

**EOS Requirements**:
```
Producer:
  ✅ enable.idempotence=true
  ✅ transactional.id=<unique-id>
  ✅ acks=all (required for idempotence)
  ✅ retries > 0
  ✅ max.in.flight.requests.per.connection ≤ 5

Consumer:
  ✅ isolation.level=read_committed
```

**Interview tip**: Explain that EOS only guarantees **within Kafka** (producer → Kafka → consumer). For true end-to-end EOS (including external systems like databases), you need additional patterns like idempotent processing or transactional outbox.

---

### Q10: How do Kafka Transactions work internally?

**Answer:**

**Transaction Coordinator**:
- Special Kafka component that manages all transactional state
- Similar to how Group Coordinator manages consumer groups

**Transaction Flow**:

**Step 1: Initialize Transaction**:
```java
producer.initTransactions();
```

**What happens**:
```
1. Producer requests Producer ID (PID) from Transaction Coordinator
2. Coordinator assigns PID and Epoch (version number)
3. Coordinator stores mapping: transactional.id → PID in __transaction_state topic
4. If transactional.id already exists, increment Epoch (fences old producer)
```

**Step 2: Begin Transaction**:
```java
producer.beginTransaction();
```

**What happens**:
```
1. Producer marks transaction as "STARTED"
2. No coordination with broker yet (local state)
```

**Step 3: Send Messages**:
```java
producer.send(new ProducerRecord<>("topic1", "msg1"));
producer.send(new ProducerRecord<>("topic2", "msg2"));
```

**What happens**:
```
1. Producer writes messages to partitions
2. Messages are marked with:
   - PID
   - Epoch
   - Sequence number
   - Transaction flag: "UNCOMMITTED"
3. Messages not yet visible to read_committed consumers
```

**Step 4: Commit Transaction**:
```java
producer.commitTransaction();
```

**What happens**:
```
1. Producer sends PREPARE_COMMIT to Transaction Coordinator
2. Coordinator writes transaction state to __transaction_state topic
3. Coordinator writes COMMIT markers to all involved partitions
4. Messages become visible to read_committed consumers
5. Transaction state updated to "COMPLETED"
```

**Step 5 (Alternative): Abort Transaction**:
```java
producer.abortTransaction();
```

**What happens**:
```
1. Producer sends ABORT to Transaction Coordinator
2. Coordinator writes ABORT markers to all partitions
3. read_committed consumers skip aborted messages
4. Aborted messages eventually garbage-collected
```

**Visual Representation**:
```
Topic: orders, Partition 0

[Message 1] PID=100, Seq=0, TXN=UNCOMMITTED
[Message 2] PID=100, Seq=1, TXN=UNCOMMITTED
[COMMIT MARKER] PID=100  ← Transaction committed
[Message 3] PID=100, Seq=2, TXN=UNCOMMITTED
[Message 4] PID=100, Seq=3, TXN=UNCOMMITTED
[ABORT MARKER] PID=100  ← Transaction aborted

Consumer with isolation.level=read_committed:
  - Reads Message 1, 2 (committed)
  - Skips Message 3, 4 (aborted)
```

**Transaction Coordinator State Machine**:
```
EMPTY
  ↓ initTransactions()
ONGOING
  ↓ beginTransaction()
  ↓ send()
  ↓ send()
PREPARE_COMMIT
  ↓ commitTransaction()
COMPLETE_COMMIT
  ↓
EMPTY (ready for next transaction)
```

**Failure Scenarios**:

**Producer crashes mid-transaction**:
```
1. Transaction Coordinator detects timeout
2. Aborts pending transaction automatically
3. Writes ABORT markers to partitions
4. New producer with same transactional.id fences old producer (higher Epoch)
```

**Transaction Coordinator crashes**:
```
1. New coordinator elected
2. Reads transaction state from __transaction_state topic
3. Completes/aborts pending transactions
```

**Interview tip**: Emphasize that transactions provide **atomicity across multiple partitions** (all-or-nothing), not isolation (concurrent readers can't see partial state due to `read_committed`).

---

### Q11: When does Kafka Exactly-Once Semantics (EOS) fail?

**Answer:**

EOS guarantees within Kafka, but can break in these scenarios:

**1. Non-Idempotent Downstream Systems**:
```java
// Kafka EOS works perfectly
producer.send(new ProducerRecord<>("orders", order));  // Exactly-once in Kafka

// Consumer processes message
consumer.poll();
database.insert(order);  // ❌ Database insert is NOT idempotent!

// Problem: Consumer crashes after DB insert but before committing offset
// On restart: Consumer reprocesses message → Duplicate insert!
```

**Solution**: Make downstream processing idempotent
```java
// Use unique constraint on order_id
database.insertOrIgnore(order);  // ✅ Idempotent insert

// Or check existence first
if (!database.exists(order.id)) {
    database.insert(order);
}
```

**2. Log Compaction Removes Uncommitted Data**:
```properties
# Topic with log compaction enabled
cleanup.policy=compact
```

**Problem**:
```
Step 1: Producer writes Message A (key=user-123, uncommitted)
Step 2: Producer writes Message B (key=user-123, uncommitted)
Step 3: Log compaction runs BEFORE transaction commits
Step 4: Compaction removes Message A (same key as B)
Step 5: Transaction aborts

Result: Message A is gone! (should have been aborted but was compacted)
```

**Solution**: Avoid compaction on transactional topics
```properties
cleanup.policy=delete  # Use time/size-based retention instead
```

**3. Consumer Offsets Persisted Before Processing**:
```java
// ❌ BAD: Auto-commit before processing
props.put("enable.auto.commit", "true");
props.put("auto.commit.interval.ms", "1000");

ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
// Kafka auto-commits offset here (every 1 second)

for (ConsumerRecord<String, String> record : records) {
    processMessage(record);  // Crash here → Message lost!
}
```

**Solution**: Commit after processing
```java
// ✅ GOOD: Manual commit after processing
props.put("enable.auto.commit", "false");

ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

for (ConsumerRecord<String, String> record : records) {
    processMessage(record);
}

consumer.commitSync();  // Commit after successful processing
```

**4. External Database Commits Not Atomic with Kafka**:
```java
// ❌ BAD: Separate transactions
producer.beginTransaction();
producer.send(new ProducerRecord<>("topic", "msg"));
producer.commitTransaction();  // Kafka transaction commits

database.insert(record);  // Separate database transaction

// Problem: Kafka commit succeeds, but DB insert fails → Inconsistency!
```

**Solution**: Use Transactional Outbox Pattern
```java
// ✅ GOOD: Write to DB and Kafka together
database.beginTransaction();
database.insert(record);
database.insertOutbox(topic, key, value);  // Outbox table
database.commit();

// Separate background process reads outbox and sends to Kafka
OutboxReader.sendToKafka();
```

**5. Processing Takes Longer than `transaction.timeout.ms`**:
```java
producer.beginTransaction();
producer.send(new ProducerRecord<>("topic", "msg"));

// Long-running processing
Thread.sleep(120_000);  // 2 minutes

producer.commitTransaction();  // ❌ FAILS! Transaction timed out
```

**Error**:
```
ProducerFencedException: Producer with transactional.id has been fenced
```

**Solution**: Increase timeout
```properties
transaction.timeout.ms=120000  # 2 minutes (default: 60 seconds)
```

**6. Multiple Producers with Same `transactional.id`**:
```java
// Producer 1 (older)
producer1.initTransactions();  // Gets PID=100, Epoch=0

// Producer 2 (newer, same transactional.id)
producer2.initTransactions();  // Gets PID=100, Epoch=1

// Producer 1 tries to send
producer1.send(record);  // ❌ ProducerFencedException! (fenced by Producer 2)
```

**Solution**: Ensure unique `transactional.id` per producer instance
```java
String transactionalId = "app-" + UUID.randomUUID();
props.put("transactional.id", transactionalId);
```

**Interview tip**: Explain that EOS is powerful **within Kafka**, but end-to-end exactly-once requires careful design of the entire pipeline (idempotent consumers, transactional outbox, etc.).

---

### Q12: How does exactly-once work in Kafka Streams?

**Answer:**

Kafka Streams provides **exactly-once processing guarantee** (EOP) across:
- Reading from source topics
- Processing and state updates
- Writing to sink topics

**Configuration**:
```java
Properties props = new Properties();
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, "exactly_once_v2");
// v2 is more efficient (uses EOS without consumer offset commits in transactions)

props.put(StreamsConfig.APPLICATION_ID_CONFIG, "word-count-app");
// APPLICATION_ID becomes transactional.id prefix
```

**How it works**:

**1. RocksDB State Stores** (Local Persistence):
```java
StreamsBuilder builder = new StreamsBuilder();

// Create state store
StoreBuilder<KeyValueStore<String, Long>> storeBuilder =
    Stores.keyValueStoreBuilder(
        Stores.persistentKeyValueStore("word-counts"),
        Serdes.String(),
        Serdes.Long()
    );
builder.addStateStore(storeBuilder);

// Use state store in processing
KStream<String, String> stream = builder.stream("input");
stream
    .groupByKey()
    .count(Materialized.<String, Long, KeyValueStore<Bytes, byte[]>>as("word-counts"))
    .toStream()
    .to("output");
```

**State storage**:
```
Local disk:
  /tmp/kafka-streams/word-count-app/0_0/rocksdb/word-counts/

Changelog topic (for fault tolerance):
  word-count-app-word-counts-changelog
```

**2. Changelog Topics** (Replicated State):
```
Input: "hello world"

Step 1: Process and update state
  RocksDB: "hello" → 1, "world" → 1

Step 2: Write to changelog topic (transactionally)
  Topic: word-count-app-word-counts-changelog
  Message: key="hello", value=1
  Message: key="world", value=1

Step 3: Write to output topic (same transaction)
  Topic: output
  Message: key="hello", value=1
  Message: key="world", value=1

Step 4: Commit transaction
  - State update
  - Changelog write
  - Output write
  - Input offset commit
  All or nothing!
```

**3. Transactional Writes** (Atomic Commit):
```
Transaction includes:
  1. Input topic offset commit (read from "input")
  2. Changelog topic writes (state updates)
  3. Output topic writes (results)

If crash before commit:
  - Transaction aborts
  - Restart reads from last committed offset
  - Reprocesses messages
  - Deduplication ensures exactly-once
```

**Example Application**:
```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, String> source = builder.stream("sentences");

source
    .flatMapValues(value -> Arrays.asList(value.toLowerCase().split("\\s+")))
    .groupBy((key, word) -> word)
    .count()  // State update
    .toStream()
    .to("word-counts");  // Output

KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();
```

**Processing Flow**:
```
Input (sentences):
  "hello world"
  "hello kafka"

Processing:
  Txn 1:
    - Read offset=0 ("hello world")
    - Update state: {"hello": 1, "world": 1}
    - Write to changelog: [hello→1, world→1]
    - Write to output: [hello→1, world→1]
    - Commit offset=1

  Txn 2:
    - Read offset=1 ("hello kafka")
    - Update state: {"hello": 2, "kafka": 1}
    - Write to changelog: [hello→2, kafka→1]
    - Write to output: [hello→2, kafka→1]
    - Commit offset=2

If crash between Txn 1 and Txn 2:
  - Restart from offset=1
  - Reprocess "hello kafka"
  - Exactly-once: No duplicates in output
```

**exactly_once vs exactly_once_v2**:

| exactly_once (v1) | exactly_once_v2 (Recommended) |
|-------------------|-------------------------------|
| Commits consumer offsets in transaction | Doesn't commit offsets in transaction |
| Higher latency (more coordination) | Lower latency |
| More network round-trips | Fewer network round-trips |
| Kafka 0.11+ | Kafka 2.5+ |

**Failure Recovery**:
```
Scenario: Instance crashes mid-processing

Step 1: Kafka Streams detects failure (heartbeat timeout)
Step 2: Rebalances partitions to other instances
Step 3: New instance reads from changelog topic
Step 4: Rebuilds RocksDB state from changelog
Step 5: Resumes processing from last committed offset
Step 6: Exactly-once maintained (no duplicates)
```

**Interview tip**: Emphasize that Kafka Streams EOP is **automatic** - you just set `processing.guarantee=exactly_once_v2`, and the framework handles transactions, state management, and changelog topics for you.

---

## Part 4: Consumer Management

### Q13: What causes Consumer Group Rebalancing? How to reduce it?

**Answer:**

**Rebalancing** = Reassignment of partitions among consumers in a group

**When rebalancing happens**:

**1. Consumer Joins Group**:
```java
// New consumer joins
KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders"));
consumer.poll(Duration.ofMillis(100));  // Triggers rebalance
```

**2. Consumer Leaves Group**:
```java
// Explicit leave
consumer.close();  // Triggers rebalance

// Crash/timeout
// (no heartbeat for session.timeout.ms) → Triggers rebalance
```

**3. Topic Partitions Change**:
```bash
# Add partitions to topic
kafka-topics.sh --alter --topic orders --partitions 20
# Triggers rebalance
```

**4. Heartbeat/Session Timeout**:
```
Consumer fails to send heartbeat within session.timeout.ms
  → Broker kicks consumer out
  → Triggers rebalance
```

**5. Processing Takes Too Long**:
```java
props.put("max.poll.interval.ms", "300000");  // 5 minutes

ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

for (ConsumerRecord<String, String> record : records) {
    slowProcessing(record);  // Takes 10 minutes!
}

consumer.poll(Duration.ofMillis(100));  // ❌ Too late! Rebalance already triggered
```

---

**How to Reduce Rebalances**:

**Strategy 1: Tune Timeouts**:
```java
// Increase session timeout (allow longer between heartbeats)
props.put("session.timeout.ms", "30000");  // 30 seconds (default: 10s)

// Increase max poll interval (allow longer processing)
props.put("max.poll.interval.ms", "600000");  // 10 minutes (default: 5min)

// Decrease heartbeat interval (send heartbeats more frequently)
props.put("heartbeat.interval.ms", "3000");  // 3 seconds (default: 3s)

// Rule: heartbeat.interval.ms < session.timeout.ms / 3
```

**Strategy 2: Use Static Membership** (Kafka 2.3+):
```java
// Assign unique group.instance.id to each consumer
props.put("group.instance.id", "consumer-1");  // Must be unique per instance

// Benefit: Consumer restart doesn't trigger rebalance
// Partitions remain assigned to same group.instance.id
```

**Before static membership**:
```
Consumer crashes:
  → Immediate rebalance
  → Partitions reassigned to other consumers
  → Consumer restarts (30 seconds later)
  → Another rebalance
  → Partitions reassigned again

Total: 2 rebalances, 60 seconds of disruption
```

**With static membership**:
```
Consumer crashes:
  → No immediate rebalance (waits session.timeout.ms)
  → Consumer restarts within session.timeout.ms
  → Rejoins with same group.instance.id
  → Partitions still assigned (no rebalance!)

Total: 0 rebalances if restart is fast
```

**Strategy 3: Use Incremental Cooperative Rebalancing** (Kafka 2.4+):
```java
props.put("partition.assignment.strategy", "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");

// OLD (Eager Rebalancing):
//   - Stop ALL consumers
//   - Revoke ALL partitions
//   - Reassign ALL partitions
//   - Resume ALL consumers
//   Result: 100% downtime during rebalance

// NEW (Incremental Cooperative):
//   - Stop only affected consumers
//   - Revoke only reassigned partitions
//   - Reassign partitions incrementally
//   - Most consumers keep processing
//   Result: ~10% downtime during rebalance
```

**Strategy 4: Avoid Frequent Consumer Restarts**:
```java
// ❌ BAD: Restart consumer for each config change
consumer.close();
consumer = new KafkaConsumer<>(newProps);  // Triggers rebalance

// ✅ GOOD: Use long-lived consumers
// Update config via external config server (Spring Cloud Config)
```

**Strategy 5: Process in Batches Quickly**:
```java
// ❌ BAD: Process one record at a time (slow)
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        processSlowly(record);  // 1 second per record
    }
}
// If 1000 records, takes 1000 seconds → max.poll.interval.ms exceeded!

// ✅ GOOD: Batch processing (fast)
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    List<Record> batch = new ArrayList<>();
    records.forEach(record -> batch.add(record));

    processBatch(batch);  // Process all 1000 records in 10 seconds
    consumer.commitSync();
}
```

**Monitoring Rebalances**:
```java
consumer.subscribe(
    Arrays.asList("orders"),
    new ConsumerRebalanceListener() {
        @Override
        public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
            log.warn("Rebalance started! Partitions revoked: {}", partitions);
            // Commit offsets before rebalance
            consumer.commitSync();
        }

        @Override
        public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
            log.info("Rebalance completed! Partitions assigned: {}", partitions);
        }
    }
);
```

**Interview tip**: Explain that rebalances cause **temporary unavailability** (seconds to minutes), so production systems minimize them using static membership + cooperative rebalancing + proper timeout tuning.

---

*(Continued in next response due to length constraints...)*