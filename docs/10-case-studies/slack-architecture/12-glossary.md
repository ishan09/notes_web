---
format: mdx
---

# 12 — Glossary

Every term, acronym, and Slack/Discord-specific concept used in this folder, in one
place. Grouped by area.

---

## Messaging & real-time

| Term | Meaning |
|------|---------|
| **WebSocket** | A persistent, bidirectional TCP connection between client and server. The backbone of real-time delivery; replaces polling. |
| **Gateway** | The edge tier whose only job is holding millions of WebSocket connections and shuttling frames. Deliberately separate from business logic. |
| **Channel server** | Service that owns routing/persistence/fan-out for messages in a channel. |
| **Fan-out** | Delivering one message to many recipients. *Fan-out-on-write* = push to all members on send; *fan-out-on-read* = recipients pull history. |
| **Pub/Sub** | Publish/subscribe messaging: a publisher emits to a topic, many subscribers receive. Used for live delivery and decoupling. |
| **Subscription registry** | The map of `channel → set of gateway nodes holding its members`, so fan-out targets only the right nodes. |
| **Flannel** | Slack's (historical name for an) edge query-engine/cache co-located with the WebSocket edge; caches workspace metadata near the connection. |
| **`seq` (sequence number)** | Per-channel monotonically increasing message number. Provides ordering and gap detection without a global clock. |
| **`client_msg_id`** | Client-generated UUID for a message, used for idempotent persistence and optimistic-UI reconciliation. |
| **Snapshot + delta** | Send a full state snapshot on connect, then stream incremental changes. Used in client boot. |
| **Optimistic UI** | Render an action (e.g., a sent message) immediately, before server confirmation, then reconcile. |
| **Boot payload / `rtm.start`** | The initial state bundle a client receives on connect so it renders without many round-trips. Evolved to *lazy loading* for huge workspaces. |
| **Heartbeat / keepalive** | Periodic ping/pong to detect dead connections and keep them alive through proxies. |
| **Backfill** | Fetching messages a client missed (after a gap or reconnect) via the history API. |

## Delivery guarantees

| Term | Meaning |
|------|---------|
| **At-least-once** | A message may be delivered more than once; never zero times. Requires dedupe. |
| **Exactly-once (effective)** | At-least-once wire delivery + idempotent client rendering ⇒ the user perceives each message once. |
| **Read-your-writes** | A client always sees its own writes immediately (the sender sees their own message). |
| **Idempotent** | An operation that can be applied multiple times with the same result (e.g., insert keyed by `client_msg_id`). |
| **Gap detection** | Noticing a missing `seq` (have 41 and 43, missing 42) and repairing via backfill. |

## Data & storage

| Term | Meaning |
|------|---------|
| **Sharding** | Splitting data across many database instances by a shard key (here: workspace). |
| **Shard key** | The field that decides which shard a row lives on (and the authz/tenancy boundary). |
| **Vitess** | Open-source system that shards MySQL transparently: query routing (VTGate), online resharding, connection pooling. Slack is a major user. |
| **VTGate** | Vitess's query router that sits between the app and MySQL shards. |
| **Online resharding** | Splitting/merging shards without downtime — critical for hot shards. |
| **Wide-column store** | NoSQL model (Cassandra/ScyllaDB) storing rows in partitions, clustered by a key; write-optimized. |
| **Cassandra** | JVM-based distributed wide-column DB. Discord's original message store. |
| **ScyllaDB** | C++ reimplementation of Cassandra (shard-per-core, no GC). Discord migrated to it for trillions of messages. |
| **Partition** | In wide-column stores, the unit of data colocation, chosen by the partition key. |
| **Hot partition / hot shard** | A partition/shard receiving disproportionate load — a major scaling failure mode. |
| **Time-bucketing** | Adding a time window to the partition key to bound partition growth. |
| **Request coalescing** | Collapsing many concurrent identical reads into one DB read whose result is fanned out to all waiters. |
| **Tiered storage** | Hot/recent data on fast/expensive storage, cold/old data on cheap/slow storage. |
| **Crypto-shredding** | Deleting an encryption key to render encrypted data (incl. backups) unrecoverable — a way to honor erasure requests. |

## Caching & queues

| Term | Meaning |
|------|---------|
| **Redis / Memcached** | In-memory data stores for sub-millisecond caching, presence, counters, rate limits. |
| **Write-through cache** | Cache updated synchronously when the underlying data is written. |
| **TTL** | Time-to-live: how long a cached entry is valid before expiry. |
| **Kafka** | Distributed, durable, partitioned, replayable log/event bus. The async spine connecting services. |
| **Job queue** | Async work queue for deferred tasks (push, unfurls, webhooks, exports). |
| **Backpressure** | Signaling upstream to slow down when a system is overloaded. |

## Presence, typing, unreads

| Term | Meaning |
|------|---------|
| **Presence** | A user's online/away/offline status. High-volume, ephemeral; subscribe-to-visible-only at scale. |
| **Typing indicator** | "X is typing…" — most ephemeral data; throttled, never stored. |
| **Read state / `last_read_seq`** | Per-(user, channel) marker of the last read message; unread = `max_seq − last_read_seq`. |
| **Read States service** | Discord's service tracking read markers — the one rewritten Go→Rust for GC reasons. |
| **Coalesce / debounce** | Batching rapid updates into fewer events. |

## Client & mobile

| Term | Meaning |
|------|---------|
| **Local store** | Client-side database (IndexedDB/SQLite) caching channels/messages for instant, offline-capable UI. |
| **Sync engine** | Client component reconciling local state with the server via deltas. |
| **Offline queue** | Locally stored operations (e.g., sends) flushed on reconnect, made safe by `client_msg_id`. |
| **Exponential backoff** | Increasing wait between retries (1s, 2s, 4s…) to avoid hammering a recovering server. |
| **Jitter** | Randomization added to backoff so clients don't retry in lockstep (prevents synchronized herds). |
| **Electron** | Framework for desktop apps using web tech (Chromium + Node). RAM-heavy. |
| **APNs / FCM** | Apple Push Notification service / Firebase Cloud Messaging — OS push delivery for mobile. |
| **Virtualization (list)** | Rendering only visible rows of a long list for performance. |

## Scaling & reliability

| Term | Meaning |
|------|---------|
| **Thundering herd** | Many clients hitting a server simultaneously (e.g., mass reconnect), causing/cascading overload. |
| **Cascading failure** | One failure triggering others until the system collapses. |
| **Admission control** | Limiting accepted load (e.g., new connections) to stay below tipping point. |
| **Load shedding** | Dropping lower-value work under overload to protect critical paths. |
| **Graceful degradation** | Reducing functionality (typing → presence → search) rather than failing entirely. |
| **Cell-based architecture** | Splitting the whole stack into independent self-contained "cells" to limit blast radius and scale horizontally. |
| **Blast radius** | The scope of impact of a failure. |
| **SLI / SLO / SLA** | Indicator (measured) / Objective (internal target) / Agreement (external contractual promise). |
| **Error budget** | Allowed unreliability under an SLO; governs change velocity. |
| **RTO / RPO** | Recovery Time Objective (how fast you recover) / Recovery Point Objective (how much data loss is acceptable). |
| **p99 / p999** | 99th / 99.9th percentile latency — the tail users actually feel; hidden by averages. |
| **GC (garbage collection)** | Automatic memory reclamation (Go/Java); can cause periodic latency spikes at scale. |
| **BEAM** | The Erlang/Elixir virtual machine; excels at millions of cheap, isolated processes. |

## Security, privacy, compliance

| Term | Meaning |
|------|---------|
| **TLS / mTLS** | Transport Layer Security; mutual TLS authenticates both sides (used service-to-service). |
| **Encryption at rest / in transit** | Protecting stored data / data on the wire. |
| **KMS** | Key Management Service — centralized encryption-key storage, rotation, access control. |
| **EKM (Enterprise Key Management)** | Lets the *customer* hold/control encryption keys and revoke access to their data. Slack's enterprise feature. |
| **E2EE** | End-to-end encryption (only endpoints can read). Slack deliberately does *not* use it (would break search/compliance). |
| **Tenant isolation** | Guaranteeing one workspace can't access another's data. |
| **RBAC** | Role-Based Access Control (member/admin/owner/guest). |
| **SSO / SAML / OIDC** | Single Sign-On via federated identity protocols. |
| **SCIM** | Standard for auto-provisioning/deprovisioning users from a corporate directory. |
| **MFA** | Multi-Factor Authentication. |
| **GDPR** | EU data-protection law: consent, erasure, residency, DSARs. |
| **CCPA / CPRA** | California consumer-privacy laws. |
| **HIPAA** | US health-data law; requires a **BAA** and PHI protections. |
| **BAA** | Business Associate Agreement — contract required to handle HIPAA-covered data. |
| **SOC 2 Type II** | Audit proving security controls operate effectively over time. |
| **ISO 27001 / FedRAMP** | Security management certification / US-government cloud authorization. |
| **Data residency** | Legal requirement that data stays within a geographic region. |
| **Retention / legal hold** | Policy for how long data is kept / override that preserves data for litigation. |
| **eDiscovery / DLP** | Electronic discovery for legal / Data Loss Prevention. |
| **SSRF** | Server-Side Request Forgery — tricking the server into fetching internal resources (a link-unfurl risk). |
| **WAF** | Web Application Firewall. |
| **SCA / SBOM** | Software Composition Analysis / Software Bill of Materials — supply-chain security. |
| **Audit log** | Append-only, tamper-evident record of security-relevant events. |

---

That completes the Slack architecture case study. Back to the
[index](./README.md).
