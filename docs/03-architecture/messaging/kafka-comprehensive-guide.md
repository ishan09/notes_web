# Apache Kafka - Comprehensive Guide

## Overview

Apache Kafka is a distributed, fault-tolerant, high-throughput event streaming platform designed for real-time data pipelines and event-driven architectures.

**Core use cases:**
- Real-time event streaming
- Decoupling microservices via async messaging
- Log aggregation and audit trails
- Stream processing (with Kafka Streams / ksqlDB)
- Change Data Capture (CDC)

---

## Table of Contents

1. [Core Concepts & Architecture](#1-core-concepts--architecture)
2. [Producers](#2-producers)
3. [Consumers & Consumer Groups](#3-consumers--consumer-groups)
4. [Topics, Partitions & Offsets](#4-topics-partitions--offsets)
5. [Replication & Fault Tolerance](#5-replication--fault-tolerance)
6. [Delivery Semantics](#6-delivery-semantics)
7. [Kafka Internals](#7-kafka-internals)
8. [Kafka Streams](#8-kafka-streams)
9. [Kafka Connect](#9-kafka-connect)
10. [Schema Registry & Avro](#10-schema-registry--avro)
11. [Security](#11-security)
12. [Performance Tuning](#12-performance-tuning)
13. [Operations & Monitoring](#13-operations--monitoring)
14. [KRaft Mode (Zookeeper-free)](#14-kraft-mode-zookeeper-free)
15. [Common Patterns & Anti-Patterns](#15-common-patterns--anti-patterns)
16. [Interview Scenarios](#16-interview-scenarios)

---

## 1. Core Concepts & Architecture

### Components

```
                        ┌─────────────────────────────────┐
                        │         Kafka Cluster           │
                        │                                 │
 Producer ──────────►  │  Broker 1   Broker 2   Broker 3 │  ──────────► Consumer
                        │                                 │
                        │  ZooKeeper / KRaft Controller   │
                        └─────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Broker** | Server that stores and serves messages |
| **Topic** | Named category/channel for messages |
| **Partition** | Ordered, immutable sequence of records within a topic |
| **Producer** | Client that writes messages to topics |
| **Consumer** | Client that reads messages from topics |
| **Consumer Group** | Group of consumers sharing load across partitions |
| **Controller** | Broker that manages cluster metadata and leader elections |
| **ZooKeeper/KRaft** | Cluster coordination and metadata storage |

### Message Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  Offset │ Timestamp │ Key │ Value │ Headers (optional)  │
└─────────────────────────────────────────────────────────┘
```

- **Offset**: Unique, monotonically increasing ID within a partition
- **Key**: Used for partitioning (same key → same partition)
- **Value**: The actual message payload (bytes)
- **Headers**: Optional metadata key-value pairs

---

## 2. Producers

### How Producers Work

```
Producer → Serializer → Partitioner → RecordAccumulator → NetworkThread → Broker
```

1. Message is serialized (key + value)
2. Partitioner determines which partition to send to
3. Message is batched in `RecordAccumulator`
4. Network thread sends batches to broker
5. Broker acknowledges (based on `acks` setting)

### Key Producer Configs

```properties
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# Acknowledgment level
acks=all          # 0=fire-forget, 1=leader only, all=all ISR

# Batching
batch.size=16384          # 16KB batch size
linger.ms=5               # Wait up to 5ms to fill batch

# Retries & idempotency
retries=Integer.MAX_VALUE
enable.idempotence=true   # Exactly-once per partition

# Compression
compression.type=snappy   # none, gzip, snappy, lz4, zstd

# Buffer
buffer.memory=33554432    # 32MB buffer
max.block.ms=60000        # How long to block if buffer full
```

### Partitioning Strategies

```java
// 1. Default: hash of key mod number of partitions
// Same key always goes to same partition
producer.send(new ProducerRecord<>("orders", orderId, orderJson));

// 2. Round-robin (null key)
producer.send(new ProducerRecord<>("events", null, eventJson));

// 3. Custom partitioner
public class RegionPartitioner implements Partitioner {
    public int partition(String topic, Object key, byte[] keyBytes,
                         Object value, byte[] valueBytes, Cluster cluster) {
        int numPartitions = cluster.partitionCountForTopic(topic);
        if (key.toString().startsWith("US")) return 0;
        if (key.toString().startsWith("EU")) return 1;
        return 2;
    }
}
```

### Sticky Partitioning

When key is null, Kafka 2.4+ uses **sticky partitioning**: batches all messages to one partition until the batch is sent, then switches. This improves batching efficiency vs pure round-robin.

### Producer Error Handling

```java
// Async with callback
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        // Retriable: NetworkException, LeaderNotAvailableException
        // Non-retriable: SerializationException, RecordTooLargeException
        log.error("Failed to send", exception);
    } else {
        log.info("Sent to partition {} offset {}", metadata.partition(), metadata.offset());
    }
});

// Sync (blocks until ack)
RecordMetadata metadata = producer.send(record).get();
```

**Retriable errors** (will retry automatically with `retries > 0`):
- `NetworkException`, `LeaderNotAvailableException`, `NotEnoughReplicasException`

**Non-retriable errors** (fail immediately):
- `SerializationException`, `RecordTooLargeException`, `InvalidTopicException`

---

## 3. Consumers & Consumer Groups

### Consumer Group Model

```
Topic: orders (4 partitions)

Consumer Group A (3 consumers):
  Consumer-1 → [Partition 0, Partition 1]
  Consumer-2 → [Partition 2]
  Consumer-3 → [Partition 3]

Consumer Group B (1 consumer):
  Consumer-1 → [Partition 0, Partition 1, Partition 2, Partition 3]
```

**Rules:**
- Each partition is assigned to **exactly one consumer** per group
- One consumer can read multiple partitions
- More consumers than partitions → some consumers are idle
- Multiple groups can read same topic independently

### Key Consumer Configs

```properties
bootstrap.servers=localhost:9092
group.id=my-consumer-group
key.deserializer=org.apache.kafka.common.serialization.StringDeserializer
value.deserializer=org.apache.kafka.common.serialization.StringDeserializer

# Offset reset (what to do when no committed offset exists)
auto.offset.reset=earliest   # earliest, latest, none

# Auto commit (risky for exactly-once)
enable.auto.commit=true
auto.commit.interval.ms=5000

# Polling
max.poll.records=500          # Max records per poll()
max.poll.interval.ms=300000   # Max time between polls before kicked out
session.timeout.ms=45000      # Heartbeat timeout
heartbeat.interval.ms=3000    # Heartbeat frequency
```

### Offset Management

```java
// Manual commit - synchronous
consumer.commitSync();

// Manual commit - asynchronous
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) log.error("Commit failed", exception);
});

// Commit specific offsets
Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
offsets.put(new TopicPartition("orders", 0), new OffsetAndMetadata(offset + 1));
consumer.commitSync(offsets);
```

**Offset storage:** Committed offsets are stored in `__consumer_offsets` topic (internal Kafka topic).

### Consumer Rebalancing

Triggered when:
- Consumer joins or leaves the group
- Partition count changes
- `session.timeout.ms` expires (consumer seen as dead)
- `max.poll.interval.ms` exceeded (consumer processing too slow)

**Rebalance protocols:**

| Protocol | Behavior | Downtime |
|----------|----------|----------|
| **Eager (Stop-the-World)** | All consumers revoke all partitions, then reassign | Full pause during rebalance |
| **Cooperative/Incremental** | Only affected partitions are moved; others continue | Minimal disruption |

```properties
# Use cooperative rebalancing (Kafka 2.4+)
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
```

**Static group membership** (reduces rebalances on restart):
```properties
group.instance.id=consumer-1   # Unique stable ID per consumer
```

### Handling Consumer Lag

```bash
# Check consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --describe

# Output:
# TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders   0          1000            1050            50
```

**Reduce lag by:**
- Increasing partition count (allows more parallelism)
- Adding more consumers to the group
- Increasing `max.poll.records`
- Optimizing processing logic

---

## 4. Topics, Partitions & Offsets

### Topic Configuration

```bash
# Create topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic orders \
  --partitions 6 \
  --replication-factor 3

# Describe topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic orders

# Alter partitions (can only increase, never decrease)
kafka-topics.sh --bootstrap-server localhost:9092 \
  --alter --topic orders --partitions 12
```

### Key Topic Configs

```properties
# Retention
retention.ms=604800000      # 7 days (default)
retention.bytes=1073741824  # 1GB per partition (-1 = unlimited)

# Log compaction (keep latest value per key)
cleanup.policy=delete         # delete (default) or compact or delete,compact
min.compaction.lag.ms=0       # Min time before a message can be compacted

# Message size
max.message.bytes=1048588    # 1MB (default)

# Segment size
segment.bytes=1073741824     # 1GB per log segment
segment.ms=604800000         # Roll segment after 7 days
```

### How Many Partitions?

**Rule of thumb:**
- Target: `(throughput_per_topic) / (throughput_per_partition)`
- Consider: max consumers you'll ever need (can't reduce partitions)
- Start conservatively (6-12) and scale up

**Caution:** More partitions = more open file handles, more memory, longer leader election time.

### Log Compaction

```
Normal Topic (delete policy):
  [key=A,v=1] [key=B,v=1] [key=A,v=2] [key=C,v=1] [key=B,v=2]
  After retention: all deleted

Compacted Topic:
  [key=A,v=1] [key=B,v=1] [key=A,v=2] [key=C,v=1] [key=B,v=2]
  After compaction: [key=A,v=2] [key=B,v=2] [key=C,v=1]
                    (only latest value per key is kept)
```

**Use cases:** User profiles, product catalog, configuration state — anywhere you need "current value" semantics.

---

## 5. Replication & Fault Tolerance

### ISR (In-Sync Replicas)

```
Partition 0, Replication Factor 3:
  Broker 1 (Leader):   Offset 0–1000  ← ISR
  Broker 2 (Follower): Offset 0–1000  ← ISR
  Broker 3 (Follower): Offset 0–950   ← AR only (lagging)

ISR = [Broker1, Broker2]
AR  = [Broker1, Broker2, Broker3]
```

- **High Watermark (HW):** Highest offset that all ISR replicas have replicated → consumers only read up to HW
- **Log End Offset (LEO):** Last offset written to leader

```properties
# Critical configs
replication.factor=3
min.insync.replicas=2        # Min ISR before rejecting writes
unclean.leader.election.enable=false  # Prevent data loss
replica.lag.time.max.ms=30000         # Max lag before removed from ISR
```

### Acknowledgment Levels

| `acks` | Meaning | Risk |
|--------|---------|------|
| `0` | No ack (fire-and-forget) | Data loss possible |
| `1` | Leader ack only | Data loss if leader crashes before replication |
| `all` / `-1` | All ISR acks | No data loss (with `min.insync.replicas >= 2`) |

---

## 6. Delivery Semantics

### At-Most-Once
- Producer: `acks=0`, no retries
- Consumer: commit before processing
- **Risk:** Message loss

### At-Least-Once
- Producer: `acks=all`, retries enabled
- Consumer: commit after processing
- **Risk:** Duplicate messages (idempotent consumer required)

### Exactly-Once Semantics (EOS)

**Producer side (idempotent producer):**
```properties
enable.idempotence=true     # Assigns PID + sequence number
acks=all
retries=Integer.MAX_VALUE
max.in.flight.requests.per.connection=5
```
- Broker deduplicates retried messages using (PID, partition, sequence number)

**End-to-end (transactions):**
```java
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("output", key, value));
    consumer.commitSync(offsets);            // Atomic offset commit
    producer.sendOffsetsToTransaction(offsets, consumerGroupMetadata);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

```properties
transactional.id=my-transactional-producer   # Must be unique per producer instance
isolation.level=read_committed               # Consumer only reads committed messages
```

**Exactly-once in Kafka Streams:**
```java
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
```

---

## 7. Kafka Internals

### Storage Layout

```
/kafka-logs/
  orders-0/              ← Partition directory
    00000000000000000000.log     ← Segment data
    00000000000000000000.index   ← Offset index (offset → file position)
    00000000000000000000.timeindex  ← Timestamp index
    00000000001000000000.log     ← Next segment (after roll)
```

### Zero-Copy Transfer

Normal path: `disk → kernel buffer → user space → socket buffer → network`

Zero-copy (`sendfile` syscall): `disk → kernel buffer → socket buffer → network`

Kafka uses `FileChannel.transferTo()` for zero-copy — eliminates CPU copies, reduces latency for consumers.

### Page Cache

Kafka relies heavily on the OS page cache:
- Writes go to page cache first (fast), flushed to disk asynchronously
- Reads served from page cache (if hot data) — no disk I/O
- Allocate as much RAM as possible to page cache (don't give it all to JVM heap!)

```properties
# JVM heap recommendation: 4-6GB max
# Rest of RAM: OS page cache
log.flush.interval.messages=Long.MAX_VALUE  # Let OS handle flushing
```

### Message Batching & Compression

```
Producer batching:
  [msg1][msg2][msg3] → compressed batch → single network request

Benefits:
  - Higher throughput (fewer network round trips)
  - Better compression ratio (compress batch, not individual msgs)
  - Broker decompresses only when needed (consumers get compressed batches)
```

Compression comparison:

| Codec | CPU | Ratio | Best For |
|-------|-----|-------|----------|
| none | lowest | 1x | Low-latency, simple |
| gzip | high | best | Cold storage, archival |
| snappy | medium | good | General purpose |
| lz4 | low | good | High-throughput |
| zstd | medium | best | Production (Kafka 2.1+) |

---

## 8. Kafka Streams

### What It Is

Kafka Streams is a **client library** (not a cluster) for stream processing. No separate infrastructure needed — runs inside your application.

```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-streams</artifactId>
    <version>3.6.0</version>
</dependency>
```

### Core DSL

```java
StreamsBuilder builder = new StreamsBuilder();

// Source stream
KStream<String, String> orders = builder.stream("orders");

// Stateless operations
KStream<String, String> filtered = orders
    .filter((key, value) -> value.contains("COMPLETED"))
    .mapValues(value -> value.toUpperCase())
    .selectKey((key, value) -> extractRegion(value));

// Aggregation (stateful — requires state store)
KTable<String, Long> orderCountByRegion = orders
    .groupByKey()
    .count(Materialized.as("order-counts"));

// Join stream with table
KStream<String, String> enriched = orders.join(
    userTable,
    (order, user) -> order + " by " + user
);

// Output
filtered.to("processed-orders");

// Build and start
KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();
```

### Windowing

```java
// Tumbling window: fixed, non-overlapping
TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5));

// Hopping window: fixed size, overlapping
TimeWindows.ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1))
    .advanceBy(Duration.ofMinutes(1));

// Session window: activity-based, variable size
SessionWindows.ofInactivityGapWithNoGrace(Duration.ofMinutes(10));

// Example: count orders per 5-min tumbling window
orders
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count()
    .toStream()
    .to("order-counts-windowed");
```

### KTable vs KStream

| | KStream | KTable |
|-|---------|--------|
| Semantics | Event stream (append-only) | Changelog / state (upsert) |
| Use case | Orders, logs, clicks | User profiles, balances |
| Backed by | Topic | Compacted topic + state store |
| Join | stream-stream (windowed) | stream-table (no window) |

### State Stores

```java
// Interactive queries — query state store from outside
KafkaStreams streams = ...;
ReadOnlyKeyValueStore<String, Long> store =
    streams.store(StoreQueryParameters.fromNameAndType(
        "order-counts",
        QueryableStoreTypes.keyValueStore()
    ));
Long count = store.get("US");
```

State stores are backed by RocksDB (default) or in-memory. Replicated via changelog topics for fault tolerance.

---

## 9. Kafka Connect

### What It Is

Kafka Connect is a framework for **streaming data between Kafka and external systems** (databases, S3, Elasticsearch, etc.) without writing custom producer/consumer code.

```
Source System → [Source Connector] → Kafka → [Sink Connector] → Target System
```

### Key Concepts

| Term | Meaning |
|------|---------|
| **Connector** | Plugin that knows how to talk to external system |
| **Task** | Unit of work (a connector can have multiple tasks) |
| **Worker** | JVM process running connectors/tasks |
| **Standalone mode** | Single worker (dev/testing) |
| **Distributed mode** | Multiple workers, fault-tolerant (production) |

### Common Connectors

- **Source:** Debezium (CDC from MySQL/Postgres), JDBC Source, S3 Source, HTTP Source
- **Sink:** JDBC Sink, Elasticsearch, S3, BigQuery, MongoDB

### Example: Debezium MySQL CDC

```json
{
  "name": "mysql-cdc-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "184054",
    "topic.prefix": "myapp",
    "database.include.list": "inventory",
    "schema.history.internal.kafka.topic": "schema-changes.inventory"
  }
}
```

This streams every INSERT/UPDATE/DELETE from MySQL into Kafka topics.

---

## 10. Schema Registry & Avro

### Why Schema Registry?

Without it: producers and consumers must agree on message format out-of-band. Schema changes break consumers silently.

With it: schemas are stored centrally; compatibility is enforced; only schema ID is sent with each message (not full schema).

```
Producer → [serialize with Avro + schema ID] → Kafka → [deserialize using schema ID] → Consumer
                                                    ↕
                                             Schema Registry
```

### Example

```java
// Avro schema (user.avsc)
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "age", "type": ["null", "int"], "default": null}
  ]
}
```

```properties
# Producer config
value.serializer=io.confluent.kafka.serializers.KafkaAvroSerializer
schema.registry.url=http://schema-registry:8081
```

### Compatibility Modes

| Mode | Rule | Use Case |
|------|------|----------|
| **BACKWARD** | New schema can read old data | Add optional fields |
| **FORWARD** | Old schema can read new data | Remove optional fields |
| **FULL** | Both directions | Conservative evolution |
| **NONE** | No compatibility check | Dev only |

---

## 11. Security

### Authentication

```properties
# SASL/SCRAM (username+password)
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="alice" password="secret";

# SASL/GSSAPI (Kerberos)
sasl.mechanism=GSSAPI
sasl.kerberos.service.name=kafka
```

### Encryption (TLS)

```properties
security.protocol=SSL
ssl.truststore.location=/var/ssl/kafka.client.truststore.jks
ssl.truststore.password=changeit
ssl.keystore.location=/var/ssl/kafka.client.keystore.jks
ssl.keystore.password=changeit
```

### Authorization (ACLs)

```bash
# Grant producer access
kafka-acls.sh --add --allow-principal User:producer-app \
  --operation Write --topic orders \
  --bootstrap-server localhost:9092

# Grant consumer access
kafka-acls.sh --add --allow-principal User:consumer-app \
  --operation Read --topic orders \
  --operation Read --group my-group \
  --bootstrap-server localhost:9092
```

---

## 12. Performance Tuning

### Producer Tuning

```properties
# Throughput optimization
batch.size=65536              # 64KB (increase from 16KB default)
linger.ms=20                  # Wait 20ms to fill batch
compression.type=lz4          # Fast compression
buffer.memory=67108864        # 64MB buffer

# Latency optimization
linger.ms=0                   # Send immediately
batch.size=1                  # No batching
acks=1                        # Don't wait for all ISR
```

### Consumer Tuning

```properties
fetch.min.bytes=1048576       # 1MB: wait for more data before returning
fetch.max.wait.ms=500         # Max wait for fetch.min.bytes
max.partition.fetch.bytes=1048576  # Max data per partition per fetch
max.poll.records=1000         # Increase if processing is fast
```

### Broker Tuning

```properties
# Network threads
num.network.threads=8
num.io.threads=16

# Log settings
log.segment.bytes=1073741824  # 1GB segments
log.retention.check.interval.ms=300000

# Replication
num.replica.fetchers=4        # Parallel replication fetchers
```

### Throughput Benchmarks

```bash
# Producer throughput test
kafka-producer-perf-test.sh --topic test \
  --num-records 1000000 --record-size 1000 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092

# Consumer throughput test
kafka-consumer-perf-test.sh \
  --bootstrap-server localhost:9092 \
  --topic test --messages 1000000
```

---

## 13. Operations & Monitoring

### Key Metrics to Monitor

**Broker metrics (via JMX):**

| Metric | What it means | Alert threshold |
|--------|--------------|-----------------|
| `UnderReplicatedPartitions` | Partitions with fewer replicas than configured | > 0 |
| `ActiveControllerCount` | Should always be 1 | != 1 |
| `OfflinePartitionsCount` | Partitions with no leader | > 0 |
| `BytesInPerSec` / `BytesOutPerSec` | Network throughput | Cluster-specific |
| `RequestHandlerAvgIdlePercent` | Handler thread utilization | < 30% |
| `NetworkProcessorAvgIdlePercent` | Network thread utilization | < 30% |

**Consumer metrics:**
- `records-lag-max`: Maximum lag across partitions (critical!)
- `commit-rate`: Offset commit frequency

**Producer metrics:**
- `record-error-rate`: Failed sends
- `record-retry-rate`: Retried messages
- `batch-size-avg`: Average batch size

### Useful CLI Commands

```bash
# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# View consumer group offsets
kafka-consumer-groups.sh --describe --group my-group \
  --bootstrap-server localhost:9092

# Reset consumer offset (replay messages)
kafka-consumer-groups.sh --reset-offsets \
  --group my-group --topic orders --to-earliest \
  --execute --bootstrap-server localhost:9092

# Dump messages from topic
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders --from-beginning \
  --max-messages 10

# Check topic config
kafka-configs.sh --describe --entity-type topics \
  --entity-name orders --bootstrap-server localhost:9092

# Reassign partitions (rebalance load)
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json --execute
```

### Tiered Storage (Kafka 3.6+)

Offload old log segments to object storage (S3, GCS, Azure Blob):
- Brokers store only recent "hot" data locally
- Older data fetched from remote storage on demand
- Drastically reduces broker disk requirements

```properties
# Enable tiered storage
remote.log.storage.system.enable=true
log.local.retention.bytes=1073741824   # 1GB local, rest in S3
```

---

## 14. KRaft Mode (Zookeeper-free)

### Why KRaft?

| Issue with Zookeeper | KRaft Solution |
|---------------------|----------------|
| External dependency | Self-contained |
| Metadata stored externally | Metadata in Kafka itself (special topic) |
| Slow leader election (seconds) | Fast election (milliseconds) |
| Limited partition scale (~200K) | Millions of partitions possible |
| Separate ops expertise needed | Single system to operate |

### Architecture

```
KRaft Cluster:
  Controller quorum (Raft consensus) — manages metadata
  Brokers — serve data to clients

Modes:
  - Dedicated controllers: some brokers have role=controller
  - Combined mode: same broker has role=broker,controller (dev/small clusters)
```

### KRaft Configuration

```properties
# Controller node
process.roles=controller
node.id=1
controller.quorum.voters=1@host1:9093,2@host2:9093,3@host3:9093
listeners=CONTROLLER://:9093

# Broker node
process.roles=broker
node.id=4
controller.quorum.voters=1@host1:9093,2@host2:9093,3@host3:9093
listeners=PLAINTEXT://:9092

# Combined mode (dev)
process.roles=broker,controller
```

```bash
# Format storage (required for KRaft)
kafka-storage.sh format \
  --config server.properties \
  --cluster-id $(kafka-storage.sh random-uuid)
```

**KRaft is production-ready from Kafka 3.3+. Zookeeper support is removed in Kafka 4.0.**

---

## 15. Common Patterns & Anti-Patterns

### Patterns

**Event Sourcing:**
```
All state changes stored as immutable events in Kafka
Current state = replay of all events
Great for audit trail, time-travel debugging
```

**CQRS with Kafka:**
```
Commands → Kafka topic → Command handler → Events → Kafka topic
                                                        ↓
                                               Projections/Read models
```

**Outbox Pattern (reliable event publishing):**
```
1. Write to DB and outbox table in same transaction
2. Separate process reads outbox table → publishes to Kafka
3. No dual-write problem
```

**Saga Pattern (distributed transactions):**
```
Order Service → publishes OrderCreated
Payment Service → consumes, publishes PaymentProcessed or PaymentFailed
Inventory Service → consumes, reserves or releases stock
Compensating transactions handle failures
```

### Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Too many small topics | Overhead, partition explosion | Group related events |
| Using Kafka as a database | Not designed for random access | Use KTable / dedicated DB |
| Ignoring consumer lag | Backlog builds silently | Monitor lag, alert on threshold |
| Synchronous request-reply over Kafka | High latency, complex correlation | Use HTTP/gRPC for sync calls |
| Not handling rebalances | Data loss or duplicates during rebalance | Use `ConsumerRebalanceListener` |
| Large messages (> 1MB) | Memory pressure, slow rebalance | Use S3 + message pointer, or chunk |
| Single partition topics | No parallelism | Start with at least 6 partitions |

### Handling Large Messages

```java
// Option 1: Claim-check pattern
// Store payload in S3, send reference in Kafka
String s3Key = uploadToS3(largePayload);
producer.send(new ProducerRecord<>("events", key, s3Key));

// Option 2: Chunking
// Split large message into chunks with sequence numbers
```

---

## 16. Interview Scenarios

### "Design a real-time order processing system"

```
Mobile App → API Gateway → Order Service
                                ↓
                          orders topic (6 partitions, keyed by order_id)
                                ↓
              ┌─────────────────┼─────────────────┐
        Payment Service   Inventory Service   Notification Service
              ↓                 ↓                   ↓
        payments topic   inventory topic      notifications topic
```

**Key decisions:**
- Partition by `order_id` (ensures order events are ordered per order)
- `acks=all`, `min.insync.replicas=2` (durability)
- Idempotent consumers in each downstream service

### "How to guarantee message ordering?"

- **Within a partition:** always ordered
- **Across partitions:** no ordering guarantee
- **Solution:** Use the same key for events that must be ordered (same key → same partition)
- **Caution:** Retries with `max.in.flight.requests.per.connection > 1` can reorder — use `enable.idempotence=true`

### "What happens if a consumer is slow?"

1. Consumer lag builds up
2. If `max.poll.interval.ms` exceeded, consumer is kicked out → rebalance
3. Other consumers pick up partitions

**Solutions:**
- Increase `max.poll.interval.ms`
- Reduce `max.poll.records`
- Scale out (add more consumers)
- Scale up (optimize processing)
- Use async processing with manual offset commit

### "How to replay messages?"

```bash
# Reset to beginning
kafka-consumer-groups.sh --reset-offsets \
  --group my-group --topic orders \
  --to-earliest --execute \
  --bootstrap-server localhost:9092

# Reset to specific time
kafka-consumer-groups.sh --reset-offsets \
  --group my-group --topic orders \
  --to-datetime 2024-01-15T10:00:00.000 \
  --execute --bootstrap-server localhost:9092
```

**Prerequisite:** Retention period must cover the target time.

### "How to do zero-downtime schema evolution?"

1. Use Schema Registry with **BACKWARD** compatibility
2. New schema must be able to read old messages
3. **Safe changes:** Add optional field with default, rename via alias
4. **Breaking changes:** Change field type, remove required field
5. Deploy consumers first (can read old + new schema), then deploy producers

### "How would you debug a sudden spike in consumer lag?"

1. Check `records-lag-max` metric — which partitions?
2. Check consumer logs for errors or slow processing
3. Check broker metrics — disk I/O, network saturation?
4. Check if a rebalance is happening (causes pause)
5. Look for GC pauses on consumer JVM
6. Check if upstream produced a burst (normal lag increase)

---

## Quick Reference Card

```
Producer acks:    0=fire-forget, 1=leader, all=all-ISR
Delivery:         at-most-once < at-least-once < exactly-once
Ordering:         guaranteed within partition, not across
ISR:              in-sync replicas (eligible for leader election)
HWM:              highest offset all ISR have → consumer read limit
Rebalance:        triggered by join/leave/timeout/poll-timeout
Compaction:       keep latest value per key (changelog semantics)
KRaft:            Zookeeper replacement (production-ready 3.3+)
Zero-copy:        sendfile() → skip user-space copy → fast reads
Page cache:       OS RAM used for hot reads — keep JVM heap small!
```
