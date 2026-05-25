# Storage Fundamentals
 
> **Foundation Principle**: Storage is the bedrock of every system. Understanding when to use which storage type and what trade-offs each brings is critical for system design.
 
## Table of Contents
1. [Storage Types Overview](#storage-types-overview)
2. [Relational Databases (SQL)](#relational-databases-sql)
3. [Document Databases (NoSQL)](#document-databases-nosql)
4. [Key-Value Stores](#key-value-stores)
5. [Column-Family Stores](#column-family-stores)
6. [Graph Databases](#graph-databases)
7. [Time-Series Databases](#time-series-databases)
8. [Search Engines](#search-engines)
9. [Data Modeling for Scale](#data-modeling-for-scale)
10. [ACID vs BASE](#acid-vs-base)
11. [Storage Selection Decision Tree](#storage-selection-decision-tree)
12. [Common Interview Questions](#common-interview-questions)
 
---
 
## Storage Types Overview
 
### The Big Picture
 
```
Storage Types by Use Case:
┌─────────────────────────────────────────────────────────────┐
│ Structured Data + Transactions → Relational (PostgreSQL)   │
│ Flexible Schema + Rich Queries → Document (MongoDB)        │
│ Simple Get/Put + High Speed → Key-Value (Redis, DynamoDB) │
│ Wide Columns + Big Data → Column-Family (Cassandra)       │
│ Relationships + Traversals → Graph (Neo4j)                 │
│ Metrics + Time-Based → Time-Series (InfluxDB)             │
│ Full-Text Search → Search Engine (Elasticsearch)          │
└─────────────────────────────────────────────────────────────┘
```
 
### Key Decision Factors
 
When choosing storage, consider:
1. **Data Structure** - How is your data organized?
2. **Query Patterns** - How will you access the data?
3. **Consistency Requirements** - How consistent must data be?
4. **Scale Requirements** - How much data? How many requests?
5. **Availability Requirements** - Can you tolerate downtime?
 
---
 
## Relational Databases (SQL)
 
### What They Are
Databases that store data in tables with predefined schemas and support SQL queries.
 
**Examples**: PostgreSQL, MySQL, Oracle, SQL Server, MariaDB
 
### When to Use
✅ **Use SQL when you need**:
- **ACID transactions** - Banking, e-commerce orders, inventory management
- **Complex joins** - Reporting across multiple related entities
- **Data integrity** - Foreign keys, constraints, referential integrity
- **Structured data** - Schema is well-defined and stable
- **Complex queries** - Aggregations, grouping, window functions
 
### Core Concepts
 
#### 1. ACID Properties
```
Atomicity   → All or nothing (transaction succeeds completely or fails)
Consistency → Database remains in valid state (constraints enforced)
Isolation   → Concurrent transactions don't interfere
Durability  → Committed data survives crashes
```
 
**Real-World Example**: Bank Transfer
```sql
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1; -- Debit
  UPDATE accounts SET balance = balance + 100 WHERE id = 2; -- Credit
COMMIT; -- Both happen or neither happens
```
 
#### 2. Normalization
Organizing data to reduce redundancy and improve integrity.
 
**Example - Denormalized (Bad)**:
```
Orders Table:
order_id | customer_name | customer_email | product_name | price
---------|---------------|----------------|--------------|-------
1        | John Doe      | john@email.com | Laptop       | 1000
2        | John Doe      | john@email.com | Mouse        | 20
```
Problem: If John changes his email, we must update multiple rows.
 
**Example - Normalized (Good)**:
```
Customers Table:            Orders Table:
customer_id | name     | email           order_id | customer_id | product_id
------------|----------|-------          ---------|-------------|------------
1           | John Doe | john@email.com  1        | 1           | 101
                                         2        | 1           | 102
 
Products Table:
product_id | name   | price
-----------|--------|-------
101        | Laptop | 1000
102        | Mouse  | 20
```
 
#### 3. Indexing
Data structures that improve query speed but slow down writes.
 
**Types**:
- **Primary Index**: On primary key (automatic)
- **Secondary Index**: On other frequently queried columns
- **Composite Index**: On multiple columns
- **Unique Index**: Ensures uniqueness
- **Full-Text Index**: For text search
 
**Example**:
```sql
-- Without index: Full table scan O(n)
SELECT * FROM users WHERE email = 'john@email.com';
 
-- With index on email: Tree lookup O(log n)
CREATE INDEX idx_users_email ON users(email);
```
 
#### 4. Joins
Combining data from multiple tables.
 
**Types**:
- **INNER JOIN**: Only matching rows
- **LEFT JOIN**: All from left table + matching from right
- **RIGHT JOIN**: All from right table + matching from left
- **FULL OUTER JOIN**: All rows from both tables
 
**Example**:
```sql
SELECT o.order_id, c.name, p.product_name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
INNER JOIN products p ON o.product_id = p.product_id;
```
 
### Scaling Strategies
 
#### 1. Read Replicas
- Master handles writes
- Replicas handle reads
- Good for read-heavy workloads (90% reads, 10% writes)
 
```
      ┌──────────┐
      │  Master  │ ← Writes
      └────┬─────┘
           │ Replication
     ┌─────┼─────┐
     │     │     │
  ┌──▼──┐ │  ┌──▼──┐
  │Rep 1│ │  │Rep 2│ ← Reads
  └─────┘ │  └─────┘
       ┌──▼──┐
       │Rep 3│ ← Reads
       └─────┘
```
 
#### 2. Vertical Scaling
Add more CPU, RAM, faster disks to single server.
- **Pros**: Simple, no code changes
- **Cons**: Expensive, hard limit, single point of failure
 
#### 3. Horizontal Scaling (Sharding)
Split data across multiple databases.
 
**Sharding Strategies**:
 
**a) Range-Based**: By ID ranges
```
Shard 1: user_id 1-1M
Shard 2: user_id 1M-2M
Shard 3: user_id 2M-3M
```
- Pros: Simple, range queries easy
- Cons: Uneven distribution (hotspots)
 
**b) Hash-Based**: By hash of key
```
shard_id = hash(user_id) % num_shards
```
- Pros: Even distribution
- Cons: Range queries difficult, resharding hard
 
**c) Geographic**: By region
```
Shard 1: US users
Shard 2: EU users
Shard 3: APAC users
```
- Pros: Reduced latency, regulatory compliance
- Cons: Uneven distribution
 
#### 4. Partitioning
Splitting a table within the same database.
- **Horizontal**: Split rows (like sharding)
- **Vertical**: Split columns (move rarely-used columns)
 
### Trade-Offs
 
| Aspect | Advantage | Disadvantage |
|--------|-----------|--------------|
| Schema | Strong data integrity | Rigid, hard to change |
| Queries | Complex joins, aggregations | Slower for very large datasets |
| Scaling | Vertical scaling easy | Horizontal scaling complex |
| Consistency | Strong ACID guarantees | Can hurt availability |
| Performance | Great for <10M rows | Slows with billions of rows |
 
### Real-World Use Cases
 
1. **Financial Systems** - Banking, payments (need ACID)
2. **E-commerce** - Orders, inventory, transactions
3. **CRM Systems** - Customer data with relationships
4. **ERP Systems** - Complex business logic and reporting
5. **Social Networks** - User profiles, relationships (small scale)
 
---
 
## Document Databases (NoSQL)
 
### What They Are
Databases that store data as JSON-like documents with flexible schemas.
 
**Examples**: MongoDB, CouchDB, Firestore, DocumentDB
 
### When to Use
✅ **Use Document DB when you need**:
- **Flexible schema** - Rapid development, evolving requirements
- **Nested data** - Documents with arrays and sub-objects
- **Horizontal scaling** - Need to scale out easily
- **Developer productivity** - Objects map directly to documents
 
### Core Concepts
 
#### 1. Document Structure
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@email.com",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  },
  "orders": [
    {"order_id": "A123", "total": 100},
    {"order_id": "B456", "total": 50}
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```
 
#### 2. Schema-less (Schema-on-Read)
Documents in the same collection can have different fields.
 
```json
// User 1
{"name": "Alice", "email": "alice@email.com"}
 
// User 2 (has extra field)
{"name": "Bob", "email": "bob@email.com", "phone": "123-456-7890"}
```
 
#### 3. Indexing
Similar to SQL but on document fields or nested fields.
 
```javascript
// MongoDB
db.users.createIndex({ "email": 1 }); // Single field
db.users.createIndex({ "name": 1, "age": -1 }); // Compound
db.users.createIndex({ "address.city": 1 }); // Nested field
db.users.createIndex({ "tags": 1 }); // Array field
```
 
#### 4. Denormalization
Embed related data instead of using foreign keys.
 
**SQL Approach (Normalized)**:
```
Users Table: { id, name, email }
Posts Table: { id, user_id, title, content }
```
 
**Document Approach (Denormalized)**:
```json
{
  "_id": "user123",
  "name": "Alice",
  "email": "alice@email.com",
  "posts": [
    {"title": "First Post", "content": "..."},
    {"title": "Second Post", "content": "..."}
  ]
}
```
 
**When to Embed vs Reference?**
- **Embed**: Data is read together, small dataset, one-to-few
- **Reference**: Data is large, updated independently, many-to-many
 
### Scaling Strategies
 
#### 1. Sharding
Built-in horizontal scaling.
 
```
MongoDB Sharding:
┌─────────────┐
│ Query Router│ (mongos)
└──────┬──────┘
       │
  ┌────┼────┐
  │    │    │
┌─▼─┐ ┌▼─┐ ┌▼─┐
│Sh1│ │Sh2│ │Sh3│
└───┘ └───┘ └───┘
```
 
**Shard Key Selection** (Critical):
- Good: High cardinality, evenly distributed
- Bad: Low cardinality, monotonically increasing
 
```javascript
// Bad: Timestamp (always inserts to same shard)
sh.shardCollection("db.events", { timestamp: 1 })
 
// Good: User ID (distributes evenly)
sh.shardCollection("db.events", { user_id: "hashed" })
```
 
#### 2. Replication
Automatic replica sets for high availability.
 
```
┌─────────┐
│ Primary │ ← Writes + Reads
└────┬────┘
     │ Replication
  ┌──┼──┐
  │     │
┌─▼─┐ ┌─▼─┐
│Sec│ │Sec│ ← Reads (optional)
└───┘ └───┘
```
 
### Trade-Offs
 
| Aspect | Advantage | Disadvantage |
|--------|-----------|--------------|
| Schema | Flexible, easy to change | No enforcement, data integrity issues |
| Queries | Fast for document reads | Weak join support |
| Scaling | Horizontal scaling easy | Complex transactions |
| Consistency | Eventually consistent | No ACID (usually) |
| Development | Fast prototyping | Can lead to messy data models |
 
### Real-World Use Cases
 
1. **Content Management** - Blogs, news sites (flexible content)
2. **User Profiles** - Social media profiles with varying fields
3. **Product Catalogs** - E-commerce products with different attributes
4. **Real-Time Analytics** - Event streams, logs
5. **Mobile Apps** - Offline-first applications
 
---
 
## Key-Value Stores
 
### What They Are
Simplest NoSQL databases: Store values by key, like a hash map.
 
**Examples**: Redis, DynamoDB, Memcached, Riak
 
### When to Use
✅ **Use Key-Value Store when you need**:
- **Simple access patterns** - Get by key, put by key
- **High performance** - Sub-millisecond latency
- **Caching** - Session storage, temporary data
- **Real-time features** - Leaderboards, counters, rate limiting
 
### Core Concepts
 
#### 1. Basic Operations
```
SET key value    → Store value
GET key          → Retrieve value
DEL key          → Delete value
EXISTS key       → Check if key exists
```
 
#### 2. Data Types (Redis)
```
String  → SET user:123:name "Alice"
List    → LPUSH timeline:user123 "post1" "post2"
Set     → SADD user:123:friends "user456" "user789"
Hash    → HSET user:123 name "Alice" age 30
Sorted Set → ZADD leaderboard 100 "user123"
```
 
#### 3. Expiration (TTL)
```
SET session:xyz "data" EX 3600  # Expires in 1 hour
```
 
#### 4. Atomic Operations
```
INCR page:views        # Atomic increment
DECR inventory:item123 # Atomic decrement
```
 
### Use Cases
 
#### 1. Caching
```
Application → Check Cache (Redis) → If miss, query DB → Store in cache
```
 
**Example**:
```python
cache_key = f"user:{user_id}"
user_data = redis.get(cache_key)
 
if not user_data:
    user_data = db.query("SELECT * FROM users WHERE id = ?", user_id)
    redis.setex(cache_key, 3600, json.dumps(user_data))  # Cache 1 hour
 
return user_data
```
 
#### 2. Session Storage
```python
session_id = "sess_abc123"
session_data = {"user_id": 123, "cart": ["item1", "item2"]}
redis.setex(session_id, 1800, json.dumps(session_data))  # 30 min
```
 
#### 3. Rate Limiting
```python
def is_rate_limited(user_id, limit=100, window=60):
    key = f"rate_limit:{user_id}"
    current = redis.incr(key)
 
    if current == 1:
        redis.expire(key, window)  # Set expiration on first request
 
    return current > limit
```
 
#### 4. Leaderboards
```python
# Add score
redis.zadd("game:leaderboard", {user_id: score})
 
# Get top 10
top_10 = redis.zrevrange("game:leaderboard", 0, 9, withscores=True)
 
# Get user rank
rank = redis.zrevrank("game:leaderboard", user_id)
```
 
### Trade-Offs
 
| Aspect | Advantage | Disadvantage |
|--------|-----------|--------------|
| Performance | Extremely fast (in-memory) | Limited by RAM |
| Simplicity | Easy to use | No complex queries |
| Scaling | Horizontal scaling | Limited analytics |
| Cost | Expensive for large data | Not for primary storage |
 
---

## Column-Family Stores

<!-- TAG: column-family, cassandra, hbase, wide-column, time-series-storage -->

> **What it is**: A distributed database that organises data into rows identified by a key, where each row can have a large, variable set of columns. The defining characteristic: designed for massive write throughput and horizontal scale from the ground up. Cassandra is the dominant open-source implementation; HBase runs on top of HDFS.

### Data Model

The mental model is **not** a spreadsheet. Think of it as a map of maps:

```
Table: user_activity

Partition Key   Clustering Key    Columns
─────────────   ──────────────    ───────────────────────────────────
user_id=1001    ts=2024-01-15     { action:"click", page:"/home" }
                ts=2024-01-14     { action:"purchase", item:"SKU-42" }
                ts=2024-01-13     { action:"login" }

user_id=2847    ts=2024-01-15     { action:"signup" }
                ts=2024-01-14     { action:"click", page:"/pricing" }
```

**Partition key** — determines which node stores the row. All rows with the same partition key live on the same node. Choose it so queries hit one partition, not many.

**Clustering key** — determines the sort order of rows *within* a partition. In the example above, timestamps are stored in order — a range query `WHERE user_id=1001 AND ts > '2024-01-14'` is a fast sequential scan within one partition.

**Design rule — query-first modelling**: In Cassandra you design the table around the query, not around normalisation. If you need to answer two different queries, you often create two tables (denormalised copies), each optimised for one access pattern.

```
Query: "Get all activity for user 1001 in the last 7 days"
  → Partition key: user_id
  → Clustering key: ts DESC
  → One partition scan — fast

Query: "Get all purchases of SKU-42 across all users"
  → Different access pattern → needs a separate table
     Partition key: item_id, Clustering key: ts
```

---

### Write Path — Why Cassandra Is Write-Optimised

Cassandra uses an **LSM tree** (Log-Structured Merge-tree) — writes never update in place:

```
Write arrives
    │
    ├─► WAL (commit log) — written first, durability guarantee
    │
    └─► Memtable (in-memory sorted structure) — fast write

When Memtable fills:
    └─► Flush to SSTable (immutable sorted file on disk)

Background compaction:
    Multiple SSTables → merged into one sorted SSTable
    (removes tombstones, deduplicates, sorts)
```

**Why this is fast**: Every write is a sequential append to the commit log + an in-memory update. No random disk seeks. Write throughput is bounded by memory + sequential I/O — both cheap.

**Read cost**: A read must check the Memtable + potentially multiple SSTables. Bloom filters and partition indexes minimise disk reads, but reads are slower relative to writes — the opposite of B-tree databases.

---

### When to Use

| Fits Cassandra | Does Not Fit |
|---|---|
| Write-heavy (IoT, activity logs, time-series) | Complex joins across entities |
| Known, stable query patterns | Ad-hoc queries / analytics |
| Massive scale (billions of rows) | Strong ACID transactions |
| High availability, no single point of failure | Small datasets (operational overhead not worth it) |
| Time-ordered data per entity | Frequently changing query patterns |

**Real examples**: Netflix (viewing history), Instagram (activity feed), Discord (message storage), Uber (location tracking).

---

## Graph Databases

<!-- TAG: graph-db, neo4j, relationships, traversal -->

> **What it is**: A database where relationships are first-class citizens — stored explicitly, not computed via joins. Data is modelled as nodes (entities) and edges (relationships), both of which can carry properties.

### Why SQL Fails at Relationship Traversal

```sql
-- "Find friends of friends of friends of user 1001" in SQL
SELECT DISTINCT u3.*
FROM users u1
JOIN friendships f1 ON u1.id = f1.user_id
JOIN users u2       ON f1.friend_id = u2.id
JOIN friendships f2 ON u2.id = f2.user_id
JOIN users u3       ON f2.friend_id = u3.id
WHERE u1.id = 1001;
-- 3 hops = 3 JOINs. 6 hops = 6 JOINs. Query changes with depth.
-- Performance degrades exponentially with relationship depth.
```

In a graph database, depth-N traversal is the same operation regardless of N:

```cypher
// Neo4j Cypher — "find friends up to 3 hops away"
MATCH (u:User {id: 1001})-[:FRIEND*1..3]-(other:User)
RETURN DISTINCT other
// Performance is driven by the number of relationships traversed,
// not the total number of rows in the table.
```

**Why**: Graph DBs store adjacency lists as direct pointers — traversing a relationship is a pointer follow, not a join computation across a full table.

---

### Graph Data Model

```
Node:  (User { id: 1001, name: "Alice", city: "NYC" })
Node:  (User { id: 2847, name: "Bob",   city: "SF"  })
Node:  (Product { id: "SKU-42", name: "Widget" })

Edge:  (Alice)-[:FRIEND   { since: "2020-01" }]->(Bob)
Edge:  (Alice)-[:PURCHASED { at: "2024-01-15" }]->(Widget)
Edge:  (Bob)  -[:REVIEWED  { rating: 5 }       ]->(Widget)
```

Both nodes and edges carry properties. Relationships have types and direction.

---

### Cypher Basics (Neo4j)

```cypher
-- Find: all products Alice's friends bought
MATCH (alice:User {name:"Alice"})-[:FRIEND]->(friend)-[:PURCHASED]->(p:Product)
RETURN p.name, count(*) AS bought_by_friends
ORDER BY bought_by_friends DESC;

-- Find: shortest path between two users
MATCH path = shortestPath(
  (a:User {id:1001})-[:FRIEND*]-(b:User {id:9999})
)
RETURN path;

-- Find: who might Alice know? (friend-of-friend, not already friends)
MATCH (alice:User {id:1001})-[:FRIEND]->(friend)-[:FRIEND]->(fof)
WHERE NOT (alice)-[:FRIEND]->(fof) AND fof <> alice
RETURN fof, count(friend) AS mutual_friends
ORDER BY mutual_friends DESC;
```

---

### When to Use

| Fits Graph DB | Does Not Fit |
|---|---|
| Social graphs (friends, followers, connections) | Simple entity storage with no complex relationships |
| Fraud detection (ring detection, unusual paths) | High write throughput on flat data |
| Recommendation engines (collaborative filtering) | Aggregations over large datasets (use columnar DB) |
| Knowledge graphs, ontologies | Reporting / BI workloads |
| Network/infrastructure topology | When relationships are shallow (1–2 hops — SQL handles it) |

**Real examples**: LinkedIn (degrees of connection), PayPal (fraud ring detection), Google (Knowledge Graph), Netflix (content recommendations).

---

## Time-Series Databases

<!-- TAG: time-series, influxdb, prometheus, tsdb, metrics-storage -->

> **What it is**: A database optimised for data where the primary dimension is time — every record has a timestamp, and queries almost always involve time ranges. The optimisations (compression, retention, downsampling) only make sense when you accept that old data is less valuable than new data.

### Data Model

Every data point is: **timestamp + tags (dimensions) + fields (values)**

```
Measurement: cpu_usage
┌─────────────────────────┬─────────────────────────┬──────────┐
│ timestamp               │ tags                    │ fields   │
├─────────────────────────┼─────────────────────────┼──────────┤
│ 2024-01-15T10:00:00Z    │ host=web-01, region=us  │ value=72 │
│ 2024-01-15T10:00:10Z    │ host=web-01, region=us  │ value=74 │
│ 2024-01-15T10:00:20Z    │ host=web-01, region=us  │ value=71 │
│ 2024-01-15T10:00:00Z    │ host=web-02, region=eu  │ value=45 │
└─────────────────────────┴─────────────────────────┴──────────┘

Tags → indexed dimensions (low cardinality: host, region, service)
Fields → the measurements (high cardinality: the actual values)
```

**Cardinality rule**: Tags are indexed and should be low-cardinality (dozens to thousands of unique values). Never put `user_id` or `request_id` in a tag — that's millions of series and will OOM the TSDB.

---

### Why TSDB Beats Relational for Time-Series

**Compression**: Consecutive timestamps and values are often similar. TSDBs use delta encoding and gorilla compression:
```
Raw timestamps (8 bytes each):
  1705312800, 1705312810, 1705312820, 1705312830 ...

Delta encoded (store differences):
  1705312800, +10, +10, +10 ... → most deltas are identical → compress to near-zero
```
Prometheus achieves ~1.3 bytes per sample vs 16+ bytes in a relational DB.

**Retention policies**: Automatically expire old data — no manual deletes, no vacuuming:
```
Raw data:       keep 15 days (full resolution, 10-second intervals)
Downsampled 1h: keep 90 days (hourly aggregates)
Downsampled 1d: keep 2 years (daily aggregates)
→ Storage stays bounded automatically
```

**Downsampling**: Aggregate fine-grained data into coarser buckets as it ages:
```
10-second samples → 1-minute averages → 1-hour averages
"What was CPU usage last year?" → query the hourly averages, not 3 billion raw points
```

---

### TSDB Comparison

| | Prometheus | InfluxDB | TimescaleDB |
|---|---|---|---|
| **Model** | Pull-based scraping | Push | PostgreSQL extension |
| **Query language** | PromQL | Flux / InfluxQL | SQL |
| **Retention** | Configurable | Retention policies | Manual or policies |
| **Clustering** | Via Thanos/Cortex | Built-in (paid) | PostgreSQL HA |
| **Best for** | Metrics + alerting (k8s native) | IoT, general time-series | Time-series + relational joins |
| **Cardinality limit** | Strict (~millions of series) | More flexible | PostgreSQL limits |

---

### When to Use

| Fits TSDB | Does Not Fit |
|---|---|
| Infrastructure metrics (CPU, memory, latency) | Entity data with complex relationships |
| IoT sensor readings | Data that needs strong consistency / transactions |
| Financial tick data | Infrequent writes with complex read patterns |
| Application performance monitoring | When you need to join time-series with business data (use TimescaleDB) |
| Anything where "latest value" and "range aggregate" are primary queries | |

---

## Search Engines

<!-- TAG: search, elasticsearch, inverted-index, full-text-search, relevance-ranking -->

> **What it is**: A system optimised for full-text search and relevance-ranked retrieval. Not a general-purpose database — it's a specialised index on top of your primary store. The canonical implementation is Elasticsearch (built on Apache Lucene).

### Why SQL LIKE Fails at Scale

```sql
-- SQL full-text search attempt:
SELECT * FROM products WHERE description LIKE '%wireless headphones%';
```

Problems:
1. **No index use**: `LIKE '%...'` with a leading wildcard forces a full table scan — O(n) always
2. **No relevance**: returns all matches, no ranking by how relevant a result is
3. **No stemming**: `LIKE '%run%'` won't match "running" or "runner"
4. **No typo tolerance**: `LIKE '%headphon%'` misses "headphones" with a different spelling

At 10M products, this query takes seconds. Elasticsearch returns ranked results in milliseconds.

---

### Inverted Index

The core data structure that makes search fast:

```
Documents:
  Doc 1: "wireless headphones noise cancelling"
  Doc 2: "bluetooth headphones for running"
  Doc 3: "wireless earbuds noise cancelling"

Inverted Index (term → document list):
  "wireless"     → [Doc 1, Doc 3]
  "headphones"   → [Doc 1, Doc 2]
  "noise"        → [Doc 1, Doc 3]
  "cancelling"   → [Doc 1, Doc 3]
  "bluetooth"    → [Doc 2]
  "running"      → [Doc 2]
  "earbuds"      → [Doc 3]

Query: "wireless headphones"
  → lookup "wireless"    → [1, 3]
  → lookup "headphones"  → [1, 2]
  → intersect            → [Doc 1]  ← O(1) lookup, fast intersection
```

Each term maps to a **posting list**: sorted list of document IDs (plus position and frequency metadata for scoring).

---

### Tokenization & Analyzers

Before indexing, text passes through an **analyzer pipeline**:

```
Input: "Running SHOES for Men's Feet"
         │
         ▼
1. Character filter:  "Running SHOES for Men's Feet"  (strip HTML, normalise)
         │
         ▼
2. Tokenizer:         ["Running", "SHOES", "for", "Men's", "Feet"]
         │
         ▼
3. Token filters:
   lowercase:         ["running", "shoes", "for", "men's", "feet"]
   stop words:        ["running", "shoes", "men's", "feet"]  (remove "for")
   stemmer:           ["run", "shoe", "men", "feet"]  → root forms

Indexed terms: "run", "shoe", "men", "feet"
```

Query "running shoes" → tokenized to ["run", "shoe"] → matches Doc above.

**Common analyzers**:
- `standard`: lowercase + stop words — good default for English
- `english`: standard + Porter stemmer
- `keyword`: no tokenization — index the whole string as-is (for exact match: product IDs, status codes)
- Custom: for product codes, phone numbers, multilingual content

---

### Relevance Scoring — BM25

Elasticsearch scores each matching document so the most relevant results appear first.

**TF-IDF intuition** (older algorithm, still useful to understand):
- **TF (Term Frequency)**: "shoes" appears 5 times in Doc A → more relevant than Doc B where it appears once
- **IDF (Inverse Document Frequency)**: "the" appears in every document → low value. "orthopaedic" appears in few documents → high value. Rare terms are more discriminating.
- Score = TF × IDF — high frequency of rare terms = high score

**BM25** (what Elasticsearch uses by default) — improves TF-IDF:
- Saturates TF: a term appearing 100 times isn't 100× more relevant than appearing once
- Normalises by document length: a short document with one match beats a long document with the same match (dense signal > diluted signal)

```
BM25 score components:
  Term frequency saturation: score plateaus after ~5 occurrences
  Document length normalisation: shorter doc + match = higher score
  IDF: rarer term = higher base score
```

---

### Elasticsearch Architecture

```
Cluster
├── Node 1 (Master + Data)
├── Node 2 (Data)
└── Node 3 (Data)

Index: products (5 primary shards, 1 replica each)
  Shard 0 (primary) → Node 1     Shard 0 (replica) → Node 2
  Shard 1 (primary) → Node 2     Shard 1 (replica) → Node 3
  Shard 2 (primary) → Node 3     Shard 2 (replica) → Node 1
  ...
```

- **Index**: logical namespace (like a DB table). Contains documents.
- **Shard**: a single Lucene instance. Primary shard handles writes; replicas serve reads and provide redundancy.
- **Routing**: `shard = hash(document_id) % num_primary_shards` — determines which shard stores a document

**Shard count is fixed at index creation** — choose carefully. Too few = can't scale horizontally. Too many = overhead per query (each query fans out to all shards).

---

### Near-Real-Time Indexing

Elasticsearch does not make documents searchable instantly:

```
Write arrives → in-memory buffer
                     │
             every 1 second (refresh)
                     │
              Lucene segment (searchable)
                     │
             periodically (flush/merge)
                     │
              persisted to disk
```

The 1-second refresh interval is why Elasticsearch is "near-real-time" — there's up to a 1-second window where a written document isn't yet searchable. For most search use cases, this is acceptable. For logging ingestion, it's fine. For financial ledgers, it's not — use a proper DB.

---

### When to Use

| Use Elasticsearch | Do Not Use Elasticsearch |
|---|---|
| Full-text search (products, articles, docs) | Primary data store (it's a search index, not a DB) |
| Autocomplete / typeahead | Transactional operations needing ACID |
| Faceted search (filter by category + price range) | Simple exact-match lookups (Redis/DB are faster) |
| Log analytics (ELK stack) | Source of truth (data can be lost on failure; re-index from primary DB) |
| Fuzzy / typo-tolerant search | |

**Typical architecture**: Primary DB (Postgres/MongoDB) → sync changes to Elasticsearch via CDC or application-level dual-write → users query Elasticsearch for search, primary DB for everything else.

---

## Data Modeling for Scale

<!-- TAG: data-modeling, denormalization, fan-out, wide-rows, embedding-vs-referencing, leaderboard, feed-modeling -->

> **The gap**: Knowing which DB type to pick is necessary but not sufficient. The schema decisions — how you structure data within that DB — determine whether your system handles 100K rps or falls over at 10K. This section covers the recurring patterns that come up in every system design interview.

### Denormalization

Normalisation reduces data duplication and ensures consistency. Denormalisation trades duplication for read performance.

```
Normalised (write-optimised):
  users:    { id, name, email }
  products: { id, name, price }
  orders:   { id, user_id, product_id, quantity, created_at }

  Read "order summary": JOIN orders + users + products → 3-table join

Denormalised (read-optimised):
  orders: {
    id, quantity, created_at,
    user_id, user_name, user_email,         ← duplicated from users
    product_id, product_name, product_price  ← duplicated from products
  }

  Read "order summary": single table read, no joins
```

**Cost**: If a user's name changes, every order row must be updated. If a product's price changes, historical orders must either reflect the old price (correct) or be updated (usually wrong).

**When to denormalise**:
- Read:write ratio is high (reads far outnumber writes)
- Joins are expensive (large tables, cross-shard joins in distributed DB)
- Query latency is a hard requirement and joins are the bottleneck
- The duplicated data rarely changes (product name, user display name)

---

### Embedding vs Referencing (Document DBs)

In MongoDB and similar document stores, you choose between embedding related data or storing references:

```json
// Embedding (denormalised — data lives inside the document)
{
  "order_id": 8472,
  "user": { "id": 1001, "name": "Alice" },
  "items": [
    { "product_id": "SKU-42", "name": "Widget", "price": 29.99, "qty": 2 },
    { "product_id": "SKU-99", "name": "Gadget", "price": 49.99, "qty": 1 }
  ]
}
// One document read = complete order. Fast.
// Problem: if Widget's price changes, must update every order containing it.

// Referencing (normalised — data lives in separate collections)
{
  "order_id": 8472,
  "user_id": 1001,
  "items": [
    { "product_id": "SKU-42", "qty": 2 },
    { "product_id": "SKU-99", "qty": 1 }
  ]
}
// Consistent — one place to update price.
// Problem: reading a full order requires fetching products separately (N+1 risk).
```

**Rule of thumb**:
- Embed when data is read together and rarely changes independently
- Reference when data is shared across many documents or changes frequently
- Embed arrays only when bounded in size — an unbounded embedded array is a document that grows forever

---

### Write-Time vs Read-Time Fan-Out

The classic example: Twitter's feed.

**Problem**: User A has 10 million followers. User A posts a tweet. How do followers see it?

**Option 1 — Write-time fan-out (push model)**:
```
User A posts tweet
    → for each of 10M followers:
        INSERT INTO inbox(user_id=follower, tweet_id=X)
    → 10M writes on post

Reading feed:
    SELECT * FROM inbox WHERE user_id=me ORDER BY ts DESC LIMIT 20
    → Single fast read from pre-populated inbox
```
- Fast reads (O(1) per user)
- Slow writes — 10M inserts per celebrity tweet
- Storage: 10M rows per tweet × millions of tweets = huge

**Option 2 — Read-time fan-out (pull model)**:
```
User A posts tweet → stored once in tweets table

Reading feed:
    SELECT t.* FROM tweets t
    JOIN follows f ON t.author_id = f.following_id
    WHERE f.follower_id = me
    ORDER BY t.created_at DESC LIMIT 20
    → Join across followed users' tweets at read time
```
- Fast writes (one insert)
- Slow reads — must query all followed users' tweets and merge

**Twitter's actual solution — hybrid**:
```
Regular users (< 1M followers): write-time fan-out
  → pre-populate followers' feed caches at write time

Celebrities (> 1M followers): read-time fan-out
  → don't fan out at write time (too expensive)
  → at read time, inject celebrity tweets into the feed

Result: fast reads for everyone, no 10M-insert spikes
```

---

### Modeling Common Patterns

**Leaderboard (sorted set)**

```
Redis Sorted Set — perfect fit:
  ZADD leaderboard 9850 "user:1001"   // score=9850, member=user:1001
  ZADD leaderboard 9720 "user:2847"
  ZADD leaderboard 9500 "user:5531"

  ZREVRANGE leaderboard 0 9 WITHSCORES  // top 10
  ZRANK leaderboard "user:1001"          // rank of specific user
  ZINCRBY leaderboard 50 "user:1001"     // add 50 points

All O(log N). Naturally sorted. No polling needed.
```

**Counter at high write rate**

A single `UPDATE counter SET value = value + 1` row becomes a hot key under millions of concurrent increments:

```
Sharded counter — split into N shards, aggregate at read time:

  Write: shard = random(0, N-1)
         UPDATE counter_shards SET value = value + 1
         WHERE counter_id='page_views' AND shard_id=shard

  Read:  SELECT SUM(value) FROM counter_shards
         WHERE counter_id='page_views'

N=100 shards → 100× write throughput, aggregation only at read time
```

**Inbox / Notification feed**

```
Schema:
  inbox(user_id, created_at, notification_id, type, read, payload)
  Partition key: user_id
  Clustering key: created_at DESC

  Read latest 20:
    SELECT * FROM inbox WHERE user_id=1001 LIMIT 20  → single partition scan

  Mark read:
    UPDATE inbox SET read=true WHERE user_id=1001 AND created_at=X

  Unread count (approximate):
    Maintain a separate counter (sharded counter or Redis INCR/DECR)
    Don't COUNT(*) on the inbox table — expensive on large inboxes
```

**Time-ordered event log**

```
Schema (Cassandra):
  events(entity_id, occurred_at, event_id, type, payload)
  Partition key: entity_id
  Clustering key: occurred_at DESC, event_id

  "Last 100 events for order 8472":
    SELECT * FROM events WHERE entity_id='order:8472' LIMIT 100
    → Sequential read within one partition

  Bucket by time if events are unbounded per entity:
    Partition key: (entity_id, bucket)  // bucket = YYYY-MM
    → Limits partition size, prevents hot partition growth
```

---
 
## ACID vs BASE
 
### ACID (SQL Default)
 
```
A - Atomicity     → All or nothing
C - Consistency   → Valid state always
I - Isolation     → Transactions don't interfere
D - Durability    → Data survives failures
```
 
**Example**: Bank transfer must be atomic
```
Transfer $100 from Alice to Bob:
- Debit Alice: $500 → $400 ✓
- Credit Bob: $200 → $300 ✓
Both happen or neither happens (Atomicity)
```
 
**Trade-off**: Strong consistency can hurt availability and performance.
 
### BASE (NoSQL Default)
 
```
BA - Basically Available → System always responds
S  - Soft state          → State may change over time
E  - Eventually consistent → Becomes consistent eventually
```
 
**Example**: Social media like count
```
User likes post → Count shows 99
Another user sees 100
Eventually, both see 100 (Eventual Consistency)
```
 
**Trade-off**: Temporary inconsistency for better availability and performance.
 
### When to Use Which?
 
**Use ACID when**:
- Financial transactions
- Inventory management
- Order processing
- Anything requiring immediate consistency
 
**Use BASE when**:
- Social media feeds
- Analytics dashboards
- Product recommendations
- Anything tolerating temporary inconsistency
 
---
 
## Storage Selection Decision Tree
 
```
START: What's your primary requirement?
 
├─ Need ACID transactions?
│  ├─ YES → Use SQL (PostgreSQL, MySQL)
│  └─ NO → Continue
│
├─ Need complex queries with JOINs?
│  ├─ YES → Use SQL
│  └─ NO → Continue
│
├─ Need graph relationships & traversals?
│  ├─ YES → Use Graph DB (Neo4j)
│  └─ NO → Continue
│
├─ Need full-text search?
│  ├─ YES → Use Search Engine (Elasticsearch)
│  └─ NO → Continue
│
├─ Need time-series data?
│  ├─ YES → Use Time-Series DB (InfluxDB)
│  └─ NO → Continue
│
├─ Access pattern is simple GET/PUT by key?
│  ├─ YES → Use Key-Value (Redis, DynamoDB)
│  └─ NO → Continue
│
├─ Need flexible schema with nested documents?
│  ├─ YES → Use Document DB (MongoDB)
│  └─ NO → Use Column-Family (Cassandra)
```
 
---
 
## Common Interview Questions
 
### Q1: When would you choose NoSQL over SQL?
 
**Answer**:
Choose NoSQL when:
1. **Flexible schema** needed for rapid development
2. **Horizontal scaling** is priority over ACID
3. **Simple access patterns** (GET by key, no complex joins)
4. **High throughput** > strong consistency
5. **Specific use case** matches NoSQL type (caching → Redis, documents → MongoDB)
 
Choose SQL when:
1. **ACID transactions** are critical
2. **Complex queries** with joins needed
3. **Data integrity** through foreign keys and constraints
4. **Structured data** with stable schema
5. **Reporting** and analytics queries
 
### Q2: How would you scale a SQL database?
 
**Answer**:
```
1. Optimization (First Priority):
   - Add indexes
   - Query optimization
   - Connection pooling
   - Caching layer (Redis)
 
2. Vertical Scaling (Simple):
   - More CPU, RAM, faster disks
   - Good up to ~16-32 cores
   - Cost increases exponentially
 
3. Read Replicas (Read-Heavy):
   - Master for writes
   - Replicas for reads
   - Works if 80-90% reads
 
4. Sharding (Write-Heavy):
   - Split data across DBs
   - Complex application logic
   - Last resort
```
 
### Q3: Explain different caching strategies.
 
**Answer**:
```
1. Cache-Aside (Lazy Loading):
   - App checks cache first
   - On miss: query DB, populate cache
   - Pros: Only caches what's needed
   - Cons: Cache miss penalty
 
2. Write-Through:
   - Write to cache and DB together
   - Pros: Cache always up-to-date
   - Cons: Slower writes
 
3. Write-Back (Write-Behind):
   - Write to cache, async write to DB
   - Pros: Fast writes
   - Cons: Risk of data loss
 
4. Refresh-Ahead:
   - Proactively refresh before expiry
   - Pros: No cache miss penalty
   - Cons: Can refresh unused data
```
 
### Q4: What's the difference between sharding and partitioning?
 
**Answer**:
- **Partitioning**: Splitting a table within the same database
  - Horizontal: Split rows
  - Vertical: Split columns
  - Example: Split orders table by year
 
- **Sharding**: Splitting data across multiple databases/servers
  - Example: Users 1-1M on DB1, 1M-2M on DB2
  - Enables horizontal scaling
  - More complex than partitioning
 
### Q5: How do you handle eventual consistency?
 
**Answer**:
```
Strategies:
1. Versioning:
   - Track version numbers
   - Resolve conflicts using latest version
 
2. Timestamps:
   - Last-write-wins
   - Simple but can lose data
 
3. CRDTs (Conflict-free Replicated Data Types):
   - Mathematically proven conflict resolution
   - Example: Counters, sets
 
4. Application-Level Resolution:
   - Present both versions to user
   - User chooses (like Google Docs conflicts)
 
Example:
- Shopping cart can be eventually consistent
- Order placement must be strongly consistent
```
 
---
 
## Key Takeaways
 
1. **No Silver Bullet**: Each storage type solves specific problems
2. **Start with SQL**: Unless you have specific reason for NoSQL
3. **Understand Trade-offs**: Performance vs Consistency vs Availability
4. **Scale Smartly**: Optimize first, then scale vertically, then horizontally
5. **Use Multiple Stores**: Different parts of system can use different databases (polyglot persistence)
 
---
 
## Next Steps
 
- **Deep Dive**: [Scalability Patterns](./02-scalability-patterns.md) - How to scale your storage
- **Performance**: [Performance Optimization](./04-performance-optimization.md) - Caching and query optimization
- **Practice**: [10 Core Design Problems](./13-core-design-problems.md) - Apply storage knowledge
 
---
 
**Remember**: In interviews, always start with SQL unless you can articulate specific reasons for NoSQL. Saying "NoSQL is more scalable" without explaining trade-offs is a red flag.

Expand lines below

03-architecture/system-design/02-scalability-patterns.md
+998
# Scalability Patterns
 
> **Foundation Principle**: Scalability is about handling growth - more users, more data, more requests. Understanding how to scale systems horizontally and vertically is essential for designing production-ready systems.
 
## Table of Contents
1. [What is Scalability?](#what-is-scalability)
2. [Vertical vs Horizontal Scaling](#vertical-vs-horizontal-scaling)
3. [Load Balancing](#load-balancing)
4. [Database Scaling](#database-scaling)
5. [Caching Strategies](#caching-strategies)
6. [Sharding](#sharding)
7. [Replication](#replication)
8. [Consistent Hashing](#consistent-hashing)
9. [Microservices for Scale](#microservices-for-scale)
10. [Content Delivery Networks (CDN)](#content-delivery-networks-cdn)
11. [Scalability Checklist](#scalability-checklist)
12. [Common Interview Questions](#common-interview-questions)
 
---
 
## What is Scalability?
 
### Definition
**Scalability** is the ability of a system to handle increased load by adding resources.
 
### Types of Scalability
 
#### 1. Vertical Scalability (Scale Up)
Adding more power to existing server (CPU, RAM, disk).
 
```
Before:  [4 CPU, 8GB RAM]  →  After: [16 CPU, 64GB RAM]
```
 
#### 2. Horizontal Scalability (Scale Out)
Adding more servers to distribute load.
 
```
Before:  [Server 1]  →  After: [Server 1, Server 2, Server 3]
```
 
### Key Metrics
 
**Load Metrics**:
- **Requests Per Second (RPS/QPS)**: How many requests per second?
- **Concurrent Users**: How many users simultaneously?
- **Data Volume**: How much data to store/process?
 
**Performance Metrics**:
- **Latency**: Response time (p50, p95, p99)
- **Throughput**: Requests handled per second
- **Availability**: Uptime percentage (99.9%, 99.99%)
 
**Example Calculation**:
```
Daily Active Users (DAU): 1 Million
Requests per user per day: 100
Total daily requests: 100M
 
Peak traffic (assume 10x average):
Average QPS = 100M / 86400 = ~1200 QPS
Peak QPS = 1200 * 10 = 12,000 QPS
```
 
---
 
## Vertical vs Horizontal Scaling
 
### Vertical Scaling (Scale Up)
 
#### Characteristics
```
┌──────────────────┐
│   Single Server  │
│   More Powerful  │
│  4→8→16→32 CPUs  │
│  8→16→32→64 GB   │
└──────────────────┘
```
 
#### Pros
- ✅ Simple - No code changes
- ✅ No network latency between components
- ✅ Easier to maintain consistency
- ✅ Simpler application architecture
 
#### Cons
- ❌ Expensive (exponential cost increase)
- ❌ Hard limit (can't add infinite resources)
- ❌ Single point of failure
- ❌ Downtime during upgrades
- ❌ Limited by hardware technology
 
#### When to Use
- Small to medium scale (< 100k users)
- Prototyping/MVP phase
- Monolithic applications
- When simplicity is priority
 
---
 
### Horizontal Scaling (Scale Out)
 
#### Characteristics
```
        ┌──────────────┐
        │Load Balancer │
        └──────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│Server1│  │Server2│  │Server3│
└───────┘  └───────┘  └───────┘
```
 
#### Pros
- ✅ No hard limit (add servers as needed)
- ✅ Better fault tolerance (no single point of failure)
- ✅ Cost-effective (use commodity hardware)
- ✅ Rolling upgrades (no downtime)
- ✅ Geographic distribution
 
#### Cons
- ❌ Complex architecture
- ❌ Network latency between servers
- ❌ Harder to maintain consistency
- ❌ Requires load balancing
- ❌ More operational overhead
 
#### When to Use
- Large scale (> 100k users)
- High availability requirements
- Stateless services (web servers, APIs)
- Distributed systems
 
---
 
### Comparison Table
 
| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| Cost | High (exponential) | Lower (linear) |
| Limit | Hardware limit | Near infinite |
| Complexity | Low | High |
| Fault Tolerance | Low (SPOF) | High (redundancy) |
| Consistency | Easy (single machine) | Hard (distributed) |
| Downtime | Required for upgrade | Rolling deployment |
| Best For | Databases, stateful | Web servers, APIs |
 
---
 
## Load Balancing
 
### What is Load Balancing?
Distributing incoming requests across multiple servers.
 
```
                  ┌──────────────┐
     Clients ───► │Load Balancer │
                  └──────┬───────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
          ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
          │Server1│  │Server2│  │Server3│
          └───────┘  └───────┘  └───────┘
```
 
### Load Balancing Algorithms
 
#### 1. Round Robin
Distribute requests sequentially to each server.
 
```
Request 1 → Server 1
Request 2 → Server 2
Request 3 → Server 3
Request 4 → Server 1 (cycle repeats)
```
 
**Pros**: Simple, evenly distributed
**Cons**: Doesn't consider server load
 
#### 2. Weighted Round Robin
Servers with higher weight get more requests.
 
```
Server 1 (weight=3): Gets 60% of requests
Server 2 (weight=2): Gets 40% of requests
```
 
**Use Case**: Servers with different capacities
 
#### 3. Least Connections
Send request to server with fewest active connections.
 
```
Server 1: 10 connections
Server 2: 5 connections  ← Choose this
Server 3: 8 connections
```
 
**Pros**: Better load distribution
**Cons**: More overhead to track connections
 
#### 4. IP Hash
Hash client IP to determine server.
 
```
hash(client_ip) % num_servers = server_index
```
 
**Pros**: Same client always goes to same server (session affinity)
**Cons**: Can cause uneven distribution
 
#### 5. Least Response Time
Send to server with lowest response time.
 
**Pros**: Best performance for clients
**Cons**: Complex to implement
 
### Load Balancer Types
 
#### Layer 4 (Transport Layer)
Routes based on IP and port (TCP/UDP).
- Fast (less processing)
- No content inspection
- Examples: HAProxy, AWS NLB
 
#### Layer 7 (Application Layer)
Routes based on HTTP headers, cookies, URL path.
- Slower (more processing)
- Content-based routing
- Examples: Nginx, AWS ALB
 
### Load Balancer Placement
 
#### 1. Between Client and Web Servers
```
Internet → LB → Web Servers
```
 
#### 2. Between Web Servers and App Servers
```
Web Servers → LB → App Servers
```
 
#### 3. Between App Servers and Databases
```
App Servers → LB → Database Replicas (read)
```
 
---
 
## Database Scaling
 
### Read Scaling
 
#### 1. Read Replicas
```
Application
   │
   ├─ Writes ────────► Master DB
   │
   └─ Reads ─────┬───► Replica 1
                 ├───► Replica 2
                 └───► Replica 3
```
 
**Benefits**:
- Distribute read load
- 90% of apps are read-heavy
 
**Challenges**:
- Replication lag (eventual consistency)
- Stale reads possible
 
**Implementation**:
```python
# Write to master
def create_user(data):
    master_db.insert(data)
 
# Read from replica
def get_user(user_id):
    return replica_db.query(user_id)
 
# Read-after-write: use master
def get_current_user(user_id):
    return master_db.query(user_id)  # Ensure consistency
```
 
#### 2. Caching
Add caching layer to reduce DB load.
```
App → Cache (Redis) → Database
```
See [Caching Strategies](#caching-strategies) section.
 
### Write Scaling
 
#### 1. Vertical Scaling
Upgrade master DB server (first option).
 
#### 2. Sharding
Split data across multiple master databases.
See [Sharding](#sharding) section.
 
#### 3. Multi-Master Replication
Multiple masters accept writes (complex conflict resolution).
 
---
 
## Caching Strategies
 
### Why Cache?
- **Reduce latency**: In-memory is 100x faster than disk
- **Reduce load**: Fewer database queries
- **Cost savings**: Less expensive than scaling database
 
### Where to Cache?
 
```
┌──────────────────────────────────────┐
│ Client Side (Browser Cache)          │ ← 0ms latency
├──────────────────────────────────────┤
│ CDN (Edge Cache)                     │ ← ~50ms
├──────────────────────────────────────┤
│ Application Cache (Redis/Memcached) │ ← ~1ms
├──────────────────────────────────────┤
│ Database Query Cache                 │ ← ~10ms
├──────────────────────────────────────┤
│ Database (Disk)                      │ ← ~100ms
└──────────────────────────────────────┘
```
 
### Caching Patterns
 
#### 1. Cache-Aside (Lazy Loading)
Application manages cache manually.
 
```python
def get_user(user_id):
    # 1. Try cache first
    user = cache.get(f"user:{user_id}")
 
    if user is None:
        # 2. Cache miss: query database
        user = db.query("SELECT * FROM users WHERE id = ?", user_id)
 
        # 3. Store in cache for future requests
        cache.set(f"user:{user_id}", user, ttl=3600)
 
    return user
```
 
**Flow**:
```
Read:  App → Cache → (miss) → DB → Cache → App
Write: App → DB → Invalidate Cache
```
 
**Pros**:
- Only caches what's needed
- Cache failure doesn't break system
 
**Cons**:
- Cache miss penalty (3x latency)
- Possible stale data
 
**Use Case**: Read-heavy applications
 
#### 2. Write-Through
Write to cache and database together.
 
```python
def update_user(user_id, data):
    # 1. Write to database
    db.update(user_id, data)
 
    # 2. Write to cache
    cache.set(f"user:{user_id}", data, ttl=3600)
```
 
**Flow**:
```
Read:  App → Cache → (miss) → DB → Cache → App
Write: App → Cache + DB (synchronous)
```
 
**Pros**:
- Cache always consistent with DB
- No stale data
 
**Cons**:
- Slower writes (wait for both)
- Caches data that may not be read
 
**Use Case**: When consistency is critical
 
#### 3. Write-Back (Write-Behind)
Write to cache first, async write to database.
 
```python
def update_user(user_id, data):
    # 1. Write to cache (fast)
    cache.set(f"user:{user_id}", data)
 
    # 2. Queue for async DB write
    queue.enqueue("db_write", user_id, data)
```
 
**Flow**:
```
Read:  App → Cache → App
Write: App → Cache → (async) → DB
```
 
**Pros**:
- Very fast writes
- Reduces database load
 
**Cons**:
- Risk of data loss (if cache fails before DB write)
- Complex to implement
 
**Use Case**: High write throughput needed (analytics, logging)
 
#### 4. Refresh-Ahead
Proactively refresh cache before expiration.
 
```python
def get_user(user_id):
    user = cache.get(f"user:{user_id}")
 
    # If TTL < threshold, refresh in background
    if cache.ttl(f"user:{user_id}") < 300:  # 5 minutes
        background_task.refresh_cache(user_id)
 
    return user
```
 
**Pros**:
- No cache miss penalty for popular items
 
**Cons**:
- Can refresh unused data
- Complex to implement
 
**Use Case**: Predictable access patterns (home page data)
 
### Cache Invalidation Strategies
 
#### 1. TTL (Time-To-Live)
Data expires after fixed duration.
 
```python
cache.set("user:123", data, ttl=3600)  # 1 hour
```
 
**Pros**: Simple, prevents stale data
**Cons**: May cache frequently changing data too long
 
#### 2. Event-Based Invalidation
Invalidate when data changes.
 
```python
def update_user(user_id, data):
    db.update(user_id, data)
    cache.delete(f"user:{user_id}")  # Invalidate cache
```
 
**Pros**: Always fresh data
**Cons**: Complexity increases
 
#### 3. Write-Through Invalidation
Update cache on write (no invalidation needed).
 
### Cache Eviction Policies
 
When cache is full, which item to remove?
 
- **LRU (Least Recently Used)**: Remove oldest accessed item (most common)
- **LFU (Least Frequently Used)**: Remove least accessed item
- **FIFO (First-In-First-Out)**: Remove oldest item
- **Random**: Remove random item
 
---
 
## Sharding
 
### What is Sharding?
Splitting data across multiple databases (horizontal partitioning).
 
```
            ┌─────────────┐
            │ Application │
            └──────┬──────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
   │Shard 1│   │Shard 2│   │Shard 3│
   │Users  │   │Users  │   │Users  │
   │1-1M   │   │1M-2M  │   │2M-3M  │
   └───────┘   └───────┘   └───────┘
```
 
### Sharding Strategies
 
#### 1. Range-Based Sharding
Split by ranges of shard key.
 
```
Shard 1: user_id 1 to 1,000,000
Shard 2: user_id 1,000,001 to 2,000,000
Shard 3: user_id 2,000,001 to 3,000,000
```
 
**Pros**:
- Simple to implement
- Range queries easy (SELECT * WHERE id BETWEEN 100 AND 200)
 
**Cons**:
- Uneven distribution (hotspots)
- New users always go to last shard
 
**Use Case**: Time-series data (shard by date)
 
#### 2. Hash-Based Sharding
Use hash function to determine shard.
 
```python
shard_id = hash(user_id) % num_shards
 
# Example:
hash(123) % 3 = 0 → Shard 0
hash(456) % 3 = 2 → Shard 2
hash(789) % 3 = 1 → Shard 1
```
 
**Pros**:
- Even distribution
- No hotspots
 
**Cons**:
- Range queries hard
- Resharding difficult (changing num_shards changes all mappings)
 
**Use Case**: Most common, user data
 
#### 3. Geographic Sharding
Shard by location.
 
```
Shard US: US users
Shard EU: EU users
Shard APAC: APAC users
```
 
**Pros**:
- Reduced latency (data close to users)
- Regulatory compliance (GDPR, data residency)
 
**Cons**:
- Uneven distribution
- Global features complex
 
**Use Case**: Multi-region applications
 
#### 4. Directory-Based Sharding
Lookup table maps entities to shards.
 
```
Shard Lookup Table:
user_id | shard_id
--------|----------
123     | 1
456     | 2
789     | 1
```
 
**Pros**:
- Flexible (can move users between shards)
- Even distribution control
 
**Cons**:
- Lookup table is bottleneck and SPOF
- Extra query per request
 
### Sharding Challenges
 
#### 1. Cross-Shard Queries
Queries spanning multiple shards are expensive.
 
**Problem**:
```sql
-- If users are sharded, this requires querying all shards
SELECT * FROM users WHERE email = 'john@email.com'
```
 
**Solutions**:
- Denormalize data
- Use global secondary index
- Accept performance hit
 
#### 2. Transactions Across Shards
Distributed transactions are complex and slow.
 
**Solution**:
- Design to avoid cross-shard transactions
- Use Saga pattern
- Use eventual consistency
 
#### 3. Resharding
Adding/removing shards requires data migration.
 
**Solution**:
- Use consistent hashing (see next section)
- Plan for resharding from start
- Use directory-based sharding
 
---
 
## Replication
 
### Master-Slave Replication
 
```
           ┌────────┐
           │ Master │ ← Writes
           └───┬────┘
               │ Replication
        ┌──────┼──────┐
        │      │      │
    ┌───▼──┐ ┌▼───┐ ┌▼───┐
    │Slave1│ │Slv2│ │Slv3│ ← Reads
    └──────┘ └────┘ └────┘
```
 
**Characteristics**:
- One master (writes)
- Multiple slaves (reads)
- Asynchronous replication
 
**Pros**:
- Read scaling
- High availability (promote slave if master fails)
 
**Cons**:
- Replication lag
- Write scaling limited
 
### Master-Master Replication
 
```
    ┌────────┐ ⟷ ┌────────┐
    │Master 1│   │Master 2│
    └────────┘   └────────┘
       ↕            ↕
    Reads/Writes Reads/Writes
```
 
**Characteristics**:
- Multiple masters accept writes
- Bidirectional replication
 
**Pros**:
- Write scaling
- High availability
 
**Cons**:
- Conflict resolution complexity
- Eventual consistency
 
---
 
## Consistent Hashing
 
### Problem with Simple Hashing
When servers are added/removed, most keys need remapping.
 
```
Simple Hash: server = hash(key) % num_servers
 
If num_servers changes from 3 to 4:
- hash(key) % 3 → might give server 2
- hash(key) % 4 → might give server 1
Result: Cache miss for most keys!
```
 
### Consistent Hashing Solution
Only K/n keys need remapping (K = keys, n = servers).
 
```
Hash Ring (0 to 2^32-1):
 
         0
         │
    S3 ──┼── S1
         │
         S2
 
Keys are mapped to ring:
key_x → hash(key_x) → Find nearest server clockwise
```
 
**Example**:
```
Servers on ring:
S1 at position 100
S2 at position 200
S3 at position 300
 
Keys:
key_a (hash=50)  → S1 (nearest clockwise)
key_b (hash=150) → S2
key_c (hash=250) → S3
key_d (hash=350) → S1 (wraps around)
 
Add S4 at position 175:
- key_b now goes to S4 (only 1 key remapped!)
- Others unchanged
```
 
### Virtual Nodes
To handle uneven distribution, each physical server gets multiple positions.
 
```
S1: positions [50, 150, 250]
S2: positions [75, 175, 275]
S3: positions [100, 200, 300]
```
 
**Used By**: Amazon DynamoDB, Cassandra, Redis Cluster
 
---
 
## Microservices for Scale
 
### Decomposition for Scalability
 
Instead of scaling entire monolith, scale only bottleneck services.
 
```
Monolith (all together):
┌──────────────────────┐
│ User Service         │
│ Product Service      │
│ Order Service        │ ← Bottleneck: needs more resources
│ Notification Service │
└──────────────────────┘
Scale everything together (expensive)
 
Microservices (separate):
┌────────┐ ┌──────────┐ ┌───────────────────┐ ┌────────────┐
│User Svc│ │Product   │ │Order Svc (x5)     │ │Notification│
│(x1)    │ │Svc (x2)  │ │Scale only this    │ │Svc (x1)    │
└────────┘ └──────────┘ └───────────────────┘ └────────────┘
```
 
See [Microservices Architecture](../microservices/README.md) for details.
 
---
 
## Content Delivery Networks (CDN)
 
### What is CDN?
Distributed network of servers that cache static content close to users.
 
```
     ┌──────┐
     │Origin│
     │Server│
     └───┬──┘
         │
    ┌────┼────┐
    │    │    │
┌───▼┐ ┌─▼──┐ ┌▼───┐
│Edge│ │Edge│ │Edge│
│ US │ │ EU │ │Asia│
└────┘ └────┘ └────┘
  ↑      ↑      ↑
Users  Users  Users
```
 
### How It Works
1. User requests `example.com/image.jpg`
2. CDN checks nearest edge server
3. If cached, return immediately (HIT)
4. If not cached, fetch from origin, cache, return (MISS)
5. Future requests get cached version
 
### Benefits
- **Reduced latency**: Content closer to users
- **Reduced bandwidth**: Origin serves fewer requests
- **DDoS protection**: Distributed traffic
- **High availability**: Multiple edge locations
 
### What to Cache
- ✅ Static assets (images, CSS, JS)
- ✅ Videos and media
- ✅ API responses (with short TTL)
- ❌ User-specific data
- ❌ Frequently changing data
 
**Examples**: Cloudflare, CloudFront (AWS), Akamai, Fastly
 
---
 
## Scalability Checklist
 
### Before Scaling
- [ ] Profile application to find bottlenecks
- [ ] Add logging and monitoring
- [ ] Optimize database queries
- [ ] Add indexes where needed
- [ ] Implement caching
- [ ] Use connection pooling
 
### Application Tier Scaling
- [ ] Make application stateless
- [ ] Externalize session storage (Redis)
- [ ] Add load balancer
- [ ] Implement health checks
- [ ] Use horizontal pod autoscaling
 
### Database Tier Scaling
- [ ] Add database connection pooling
- [ ] Implement query caching
- [ ] Add read replicas for reads
- [ ] Consider sharding for writes
- [ ] Use appropriate indexes
 
### Caching Strategy
- [ ] Identify cacheable data
- [ ] Choose caching pattern (cache-aside, write-through, etc.)
- [ ] Set appropriate TTLs
- [ ] Implement cache invalidation
- [ ] Monitor cache hit rates
 
### Static Content
- [ ] Use CDN for static assets
- [ ] Enable browser caching
- [ ] Compress images and assets
- [ ] Use lazy loading
 
---
 
## Common Interview Questions
 
### Q1: How would you scale from 1K to 1M users?
 
**Answer**:
```
Stage 1 (1K - 10K users):
- Single server (web + DB)
- Vertical scaling as needed
 
Stage 2 (10K - 100K users):
- Separate web and database servers
- Add load balancer
- Add caching layer (Redis)
- Use CDN for static content
 
Stage 3 (100K - 500K users):
- Multiple web servers (horizontal scaling)
- Database read replicas
- Optimize slow queries
- Add monitoring and alerting
 
Stage 4 (500K - 1M users):
- More web servers (auto-scaling)
- Database sharding if write-heavy
- Microservices for independent scaling
- Multiple data centers for redundancy
```
 
### Q2: When would you use caching vs read replicas?
 
**Answer**:
```
Use Caching when:
- Data doesn't change frequently
- Same data read repeatedly
- Need sub-millisecond latency
- Can tolerate eventual consistency
Example: User profiles, product info
 
Use Read Replicas when:
- Data changes frequently
- Need strong consistency
- Complex queries needed
- Cache hit rate would be low
Example: Real-time inventory, order status
```
 
### Q3: How do you handle hot keys in a distributed cache?
 
**Answer**:
```
Hot Key: A key accessed far more than others (celebrity user, trending post)
 
Problems:
- Single cache server overwhelmed
- Uneven load distribution
- Potential cache server failure
 
Solutions:
1. Client-side caching:
   - Cache hot keys in application memory
   - Reduces load on cache cluster
 
2. Replication:
   - Replicate hot keys across multiple cache servers
   - Load balance reads across replicas
 
3. Local cache:
   - Add L1 cache (in-memory) before L2 (Redis)
   - Hot keys served from L1
 
4. Request coalescing:
   - Batch multiple requests for same key
   - Single request to cache, fan out results
```
 
### Q4: Explain different types of database replication lag.
 
**Answer**:
```
1. Replication Lag:
   - Time for data to propagate from master to replica
   - Usually milliseconds to seconds
   - Can be minutes under heavy load
 
2. Read-After-Write Consistency:
   Problem: User writes data, reads from replica, data not there yet
   Solution: Read from master after write, replica for other reads
 
3. Monotonic Reads:
   Problem: User reads v2, refreshes, sees v1 (read different replicas)
   Solution: Sticky sessions (same user → same replica)
 
4. Consistent Prefix Reads:
   Problem: See effects before causes (out-of-order replication)
   Solution: Use timestamps or vector clocks
```
 
### Q5: How would you design URL shortener sharding strategy?
 
**Answer**:
```
Requirements:
- Billions of URLs
- Read-heavy (100:1 read/write)
 
Sharding Strategy:
1. Shard Key: Hash of short URL
   shard_id = hash(short_url) % num_shards
 
Why:
- Even distribution (hash function)
- Reads go to single shard (no scatter-gather)
- Short URL known for reads (primary access pattern)
 
Implementation:
- 64 shards initially (power of 2 for easy doubling)
- Consistent hashing for easy resharding
- Each shard: 1 master + 2 replicas
 
Alternative: Range-based by creation time
- Pro: Easy to archive old data
- Con: Write hotspot on latest shard
```
 
---
 
## Key Takeaways
 
1. **Start Simple**: Don't over-engineer. Scale when needed, not preemptively.
2. **Measure First**: Profile to find actual bottlenecks before scaling.
3. **Vertical Before Horizontal**: Easier to scale up before scaling out.
4. **Cache Aggressively**: Most systems are read-heavy, caching helps significantly.
5. **Stateless Applications**: Makes horizontal scaling much easier.
6. **Database is Bottleneck**: Usually the hardest part to scale, plan early.
 
---
 
## Next Steps
 
- **Performance**: [Performance Optimization](./04-performance-optimization.md) - Deep dive into caching
- **Reliability**: [Reliability & Fault Tolerance](./05-reliability-fault-tolerance.md) - Handle failures
- **Practice**: [10 Core Design Problems](./13-core-design-problems.md) - Apply scaling knowledge
 
---
 
**Remember**: Premature optimization is the root of all evil. Scale based on metrics, not assumptions.

