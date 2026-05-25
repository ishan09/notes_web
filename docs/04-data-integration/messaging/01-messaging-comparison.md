# Messaging Systems Compared — SQS vs Kafka vs RabbitMQ

> **Before You Start**: You should understand basic pub-sub concepts (producer, consumer, topic/queue). This guide focuses on *when to use which* and *what goes wrong when you pick the wrong one*.

---

## Table of Contents

1. [Why Message Queues?](#why-message-queues)
2. [Architecture Fundamentals](#architecture-fundamentals)
3. [Head-to-Head Comparison](#head-to-head-comparison)
4. [When to Use Each](#when-to-use-each)
5. [Antipatterns](#antipatterns)
6. [Decision Framework](#decision-framework)
7. [Self-Check Questions](#self-check-questions)

---

## Why Message Queues?

### The Problem They Solve

```
Without message queue (synchronous):

  Order Service ──HTTP──→ Payment Service ──HTTP──→ Notification Service
                              ↓
                          If Payment is slow (3s), Order Service waits 3s
                          If Payment is down, Order Service fails
                          If 1000 orders/sec, Payment must handle 1000/sec or drop requests

With message queue (asynchronous):

  Order Service ──→ [ Queue ] ──→ Payment Service
                                  ──→ Notification Service

  ✅ Order Service responds immediately (decoupled)
  ✅ If Payment is slow, messages wait in queue (buffering)
  ✅ If Payment is down, messages are retained (durability)
  ✅ Payment processes at its own pace (backpressure handling)
```

### Core Benefits

| Benefit | How It Works |
|---------|-------------|
| **Decoupling** | Producer and consumer don't know about each other |
| **Buffering** | Queue absorbs traffic spikes |
| **Durability** | Messages survive consumer downtime |
| **Scalability** | Add consumers independently to increase throughput |
| **Ordering** | Guarantee processing order (within a partition/queue) |

---

## Architecture Fundamentals

### Kafka — Distributed Log

```
┌──────────────────────────────────────────────────────────┐
│                        KAFKA                              │
│                                                           │
│  Topic: "orders"                                          │
│  ┌─────────────────────────────────────────────┐          │
│  │ Partition 0: [msg1] [msg3] [msg5] [msg7] →  │          │
│  │ Partition 1: [msg2] [msg4] [msg6] [msg8] →  │          │
│  │ Partition 2: [msg9] [msg10] [msg11]      →  │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  Key insight: Messages are APPENDED to an immutable log.  │
│  Consumers track their own OFFSET (position in the log).  │
│  Messages are NOT deleted after consumption.               │
│  Multiple consumer groups can independently read the       │
│  same topic at different speeds.                           │
└──────────────────────────────────────────────────────────┘
```

**Model**: Distributed commit log with partitions
**Retention**: Time-based (default 7 days) or size-based — messages stay even after consumption
**Consumer model**: Pull-based. Consumers poll for messages and manage their own offset.

### RabbitMQ — Message Broker

```
┌──────────────────────────────────────────────────────────┐
│                      RABBITMQ                             │
│                                                           │
│  Producer → Exchange → Binding → Queue → Consumer         │
│                                                           │
│  Exchange types:                                          │
│  ┌──────────┐                                             │
│  │  Direct   │──→ Routes by exact routing key match       │
│  │  Fanout   │──→ Broadcasts to ALL bound queues          │
│  │  Topic    │──→ Routes by pattern (orders.*.created)    │
│  │  Headers  │──→ Routes by message header attributes     │
│  └──────────┘                                             │
│                                                           │
│  Key insight: Broker PUSHES messages to consumers.        │
│  Messages are DELETED after acknowledgment.                │
│  Sophisticated routing via exchanges and bindings.         │
└──────────────────────────────────────────────────────────┘
```

**Model**: Traditional message broker with smart routing
**Retention**: Messages deleted after consumer acknowledgment
**Consumer model**: Push-based. Broker delivers messages to consumers.

### SQS — Managed Queue Service

```
┌──────────────────────────────────────────────────────────┐
│                     AMAZON SQS                            │
│                                                           │
│  Standard Queue:                                          │
│  ┌─────────────────────────────────────────────┐          │
│  │ [msg] [msg] [msg] [msg] → At-least-once     │          │
│  │ Best-effort ordering (NOT strict FIFO)       │          │
│  │ Nearly unlimited throughput                  │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  FIFO Queue:                                              │
│  ┌─────────────────────────────────────────────┐          │
│  │ [msg1] → [msg2] → [msg3] → Exactly-once     │          │
│  │ Strict ordering within message group         │          │
│  │ Limited: 300 msg/sec (3000 with batching)    │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  Key insight: Fully managed (no servers to run).          │
│  Messages become INVISIBLE during processing              │
│  (visibility timeout), then deleted on acknowledgment.    │
└──────────────────────────────────────────────────────────┘
```

**Model**: Fully managed, serverless queue
**Retention**: Up to 14 days, deleted after consumption
**Consumer model**: Pull-based. Consumers poll with long-polling.

---

## Head-to-Head Comparison

### Feature Matrix

| Feature | Kafka | RabbitMQ | SQS |
|---------|:-----:|:--------:|:---:|
| **Throughput** | Millions msg/sec | ~50K msg/sec | ~unlimited (Standard) |
| **Latency** | ~5ms (batch optimized) | ~1ms (low latency) | ~20-50ms |
| **Ordering** | Per partition | Per queue | FIFO queue only (300/sec) |
| **Delivery** | At-least-once (exactly-once with EOS) | At-most-once / at-least-once | At-least-once (Standard), exactly-once (FIFO) |
| **Retention** | Days/weeks/forever | Until consumed | Up to 14 days |
| **Replay** | Yes (re-read from any offset) | No (message gone after ack) | No |
| **Routing** | Topic + partition key | Exchange + routing key (flexible) | Queue name only |
| **Consumer model** | Pull | Push | Pull (long-polling) |
| **Protocol** | Custom binary (TCP) | AMQP, MQTT, STOMP | HTTP/HTTPS (REST API) |
| **Ops effort** | High (brokers, ZK/KRaft, monitoring) | Medium (Erlang cluster, monitoring) | Zero (fully managed) |
| **Cost model** | Infrastructure (self-hosted) or per-partition (Confluent) | Infrastructure (self-hosted) or per-msg (CloudAMQP) | Per-request ($0.40/million) |
| **Dead Letter Queue** | Manual (DLQ topic) | Built-in | Built-in |
| **Max message size** | 1 MB default (configurable) | 128 MB default | 256 KB (extended: 2 GB via S3) |

### Semantics Deep Dive

**Message retention and replay**:

```
Kafka:
  Producer → [Topic Partition: msg1 msg2 msg3 msg4 msg5]
  Consumer A reads: offset 0 → 1 → 2 → 3 → 4 (current)
  Consumer B reads: offset 0 → 1 → 2 (behind, catches up)

  Need to reprocess everything? Reset Consumer A to offset 0.
  Messages are still there! ← This is Kafka's superpower.

RabbitMQ / SQS:
  Producer → [Queue: msg1 msg2 msg3]
  Consumer reads msg1 → ACK → msg1 deleted
  Consumer reads msg2 → ACK → msg2 deleted

  Need to reprocess? Too late. Messages are gone.
  Must republish from source. ← This is the trade-off.
```

**Consumer groups / competing consumers**:

```
Kafka:
  Topic (4 partitions) → Consumer Group (3 consumers)
  Partition 0 → Consumer A
  Partition 1 → Consumer B
  Partition 2 → Consumer C
  Partition 3 → Consumer A (gets 2 partitions)

  Each partition = exactly 1 consumer in the group.
  Adding a 5th consumer? It sits idle (only 4 partitions).

RabbitMQ:
  Queue → Multiple consumers
  msg1 → Consumer A
  msg2 → Consumer B
  msg3 → Consumer A (round-robin)

  Add consumers freely. Broker distributes.

SQS:
  Queue → Multiple consumers polling
  msg1 → Consumer A receives, becomes invisible for 30s
  msg2 → Consumer B receives

  If Consumer A crashes, msg1 reappears after visibility timeout.
```

---

## When to Use Each

### Use Kafka When

```
✅ High throughput (>100K messages/sec)
✅ Event sourcing / event log (need to replay history)
✅ Stream processing (Kafka Streams, Flink, Spark Streaming)
✅ Multiple independent consumers need the same data
✅ Strict ordering within a partition key
✅ Long retention (days/weeks/months)
✅ Log aggregation (collecting logs from many services)
✅ Change Data Capture (CDC) from databases

Real examples:
- Uber: Trip events, pricing signals, driver locations
- LinkedIn: Activity feed, metrics pipeline
- Netflix: Event sourcing for microservices
```

### Use RabbitMQ When

```
✅ Complex routing requirements (topic exchanges, header-based routing)
✅ Low latency needed (<5ms)
✅ Request-reply pattern (RPC over messaging)
✅ Priority queues (process urgent messages first)
✅ Legacy system integration (supports AMQP, MQTT, STOMP)
✅ Moderate throughput (<50K msg/sec)
✅ Work distribution to competing consumers
✅ Need message TTL, delayed messages, or dead-letter routing

Real examples:
- Background job processing (email sending, PDF generation)
- IoT message routing (MQTT support)
- Microservice task distribution
```

### Use SQS When

```
✅ Already on AWS and want zero operational overhead
✅ Simple queue semantics (no complex routing)
✅ Serverless architecture (Lambda + SQS = zero servers)
✅ Bursty, unpredictable workloads (auto-scales infinitely)
✅ Need built-in DLQ, visibility timeout, retry
✅ Don't need message replay
✅ Team has no Kafka/RabbitMQ ops expertise
✅ Cost matters at low volume (pay-per-request)

Real examples:
- Lambda-triggered processing pipelines
- Decoupling microservices in AWS
- Order processing queues
- Email/notification queues
```

---

## Antipatterns

### Kafka Antipatterns

**1. Using Kafka as a database**:
```
❌ Problem: "Let's store everything in Kafka forever and query it"
Why it fails: Kafka has no indexes, no ad-hoc queries, no secondary lookups.
✅ Fix: Use Kafka for transport, materialize into a real database for queries.
```

**2. Too many small topics**:
```
❌ Problem: 10,000 topics with 1 message/day each
Why it fails: Each partition = open file handles, memory overhead, leader election.
✅ Fix: Use fewer topics with a message-type field, or use headers for routing.
```

**3. Using Kafka for request-reply**:
```
❌ Problem: Service A sends request to Kafka, waits for response on reply topic
Why it fails: Added latency (~10-50ms), complex correlation ID management.
✅ Fix: Use HTTP/gRPC for synchronous request-reply. Kafka is for fire-and-forget.
```

**4. Ignoring consumer lag**:
```
❌ Problem: Consumer falls behind, eventually processing hours-old messages
Why it fails: Stale data, cascading delays, eventual data loss if retention expires.
✅ Fix: Monitor lag (Burrow, Kafka metrics), alert when lag > threshold, scale consumers.
```

**5. Single partition for ordering**:
```
❌ Problem: "We need global ordering, so use 1 partition"
Why it fails: 1 partition = 1 consumer max = no parallelism = throughput bottleneck.
✅ Fix: Partition by entity key (user_id, order_id). You rarely need global order.
```

### RabbitMQ Antipatterns

**1. Large message payloads**:
```
❌ Problem: Sending 50 MB files through RabbitMQ
Why it fails: Erlang VM memory pressure, slow message processing, broker instability.
✅ Fix: Store payload in S3/blob storage, send pointer (URL) in message.
```

**2. Unbounded queues without TTL**:
```
❌ Problem: Consumer goes down, queue grows to millions of messages
Why it fails: Broker runs out of memory/disk, starts rejecting new messages.
✅ Fix: Set queue max-length, message TTL, and dead-letter exchange policies.
```

**3. Not acknowledging messages properly**:
```
❌ Problem: Auto-ack enabled; message lost if consumer crashes during processing
Why it fails: Message is deleted on delivery, not on successful processing.
✅ Fix: Use manual acknowledgment. Ack only after processing completes.
```

**4. Using RabbitMQ for high-throughput event streaming**:
```
❌ Problem: Pushing 500K events/sec through RabbitMQ
Why it fails: RabbitMQ is designed for ~50K msg/sec. Starts dropping or slowing.
✅ Fix: Use Kafka for high-throughput event streaming.
```

### SQS Antipatterns

**1. Expecting strict ordering from Standard Queue**:
```
❌ Problem: "Messages will process in order" with Standard SQS
Why it fails: Standard SQS is best-effort ordering. Messages can arrive out of order.
✅ Fix: Use FIFO queue (but limited to 300 msg/sec), or handle ordering in application.
```

**2. Short visibility timeout with long processing**:
```
❌ Problem: Visibility timeout = 30s, processing takes 2 minutes
Why it fails: After 30s, SQS thinks consumer failed, delivers message to ANOTHER consumer.
   Result: same message processed twice (or more).
✅ Fix: Set visibility timeout > max processing time, or extend it dynamically.
```

**3. Not configuring DLQ**:
```
❌ Problem: Poison message keeps failing and re-entering the queue forever
Why it fails: Infinite retry loop, consumer stuck, other messages delayed.
✅ Fix: Configure Dead Letter Queue with maxReceiveCount (e.g., 3 attempts then DLQ).
```

**4. Polling without long-polling**:
```
❌ Problem: Polling every 100ms with 0-second wait time
Why it fails: Most polls return empty = wasted API calls = unnecessary cost.
✅ Fix: Use long-polling (WaitTimeSeconds = 20). SQS holds connection until message arrives.
```

---

## Decision Framework

```
START: What do you need?

├─ High throughput (>100K msg/sec)?
│  ├─ YES → Kafka
│  └─ NO → Continue
│
├─ Event replay / reprocessing needed?
│  ├─ YES → Kafka
│  └─ NO → Continue
│
├─ Complex routing (topic patterns, priority, headers)?
│  ├─ YES → RabbitMQ
│  └─ NO → Continue
│
├─ Low latency (<5ms) critical?
│  ├─ YES → RabbitMQ
│  └─ NO → Continue
│
├─ Already on AWS + want zero ops?
│  ├─ YES → SQS
│  └─ NO → Continue
│
├─ Serverless architecture (Lambda)?
│  ├─ YES → SQS
│  └─ NO → Continue
│
├─ Multiple independent consumers for same events?
│  ├─ YES → Kafka (or SNS+SQS fan-out)
│  └─ NO → Continue
│
└─ Default for moderate-complexity microservices:
   ├─ AWS ecosystem → SQS + SNS
   ├─ Self-hosted / multi-cloud → RabbitMQ
   └─ Data pipeline / analytics → Kafka
```

### Can You Combine Them?

Yes — this is common in production:

```
Example: E-commerce platform

[Order Service] ──Kafka──→ Event Log (replay, analytics, CDC)
                ──SQS────→ Email notification queue (Lambda consumer)
                ──RabbitMQ→ Priority routing for payment processing

Each tool used for its strength.
```

---

## Self-Check Questions

1. Why can Kafka replay messages but RabbitMQ and SQS cannot?
2. What's the max throughput of SQS FIFO vs Standard?
3. When would you pick RabbitMQ over Kafka?
4. What happens in SQS if visibility timeout is too short?
5. Why is using Kafka for request-reply an antipattern?
6. How does Kafka achieve ordering guarantees?

<details>
<summary>Answers</summary>

1. Kafka stores messages in an immutable log; consumers track offsets. Messages aren't deleted after consumption. RabbitMQ/SQS delete messages after acknowledgment.
2. Standard SQS: nearly unlimited. FIFO SQS: 300 msg/sec (3000 with batching). Huge difference.
3. When you need complex routing (exchanges), low latency (<5ms), priority queues, or request-reply patterns. Kafka is overkill for simple task distribution.
4. SQS assumes the consumer failed, makes the message visible again, and another consumer picks it up → duplicate processing.
5. Kafka adds 10-50ms latency per hop and requires correlation ID management. HTTP/gRPC is simpler and faster for synchronous patterns.
6. Messages with the same partition key go to the same partition. Within a partition, order is guaranteed. No global ordering across partitions.

</details>

---

## Navigation

**Related:**
- [Kafka Interview Questions (Deep Dive)](../../03-architecture/messaging/kafka-interview-questions.md) — ISR, EOS, KRaft, production monitoring
- [Microservices Communication](../../03-architecture/microservices/04-communication.md) — REST vs async patterns
- [Database Fundamentals](../database-design/01-database-fundamentals.md) — Connection pooling, ACID, indexes

**Module Index:** [Learning Roadmap](../../README.md)
