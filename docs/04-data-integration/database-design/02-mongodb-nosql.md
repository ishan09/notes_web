# MongoDB & NoSQL — Deep Dive

> **Before You Start**: You should understand [Database Fundamentals](./01-database-fundamentals.md) — RDBMS, ACID, indexes. This guide covers what makes MongoDB different, how to query it, and when to choose it over a relational database.

---

## Table of Contents

1. [What Makes MongoDB Different from RDBMS?](#what-makes-mongodb-different-from-rdbms)
2. [The Document Model](#the-document-model)
3. [CRUD Operations — How to Query MongoDB](#crud-operations--how-to-query-mongodb)
4. [Aggregation Pipeline — Complex Queries & Joins](#aggregation-pipeline--complex-queries--joins)
5. [Indexes in MongoDB](#indexes-in-mongodb)
6. [When to Use MongoDB vs RDBMS](#when-to-use-mongodb-vs-rdbms)
7. [Anti-Patterns](#anti-patterns)
8. [Self-Check Questions](#self-check-questions)

---

## What Makes MongoDB Different from RDBMS?

### Fundamental Differences

| Concept | RDBMS (PostgreSQL) | MongoDB |
|---------|-------------------|---------|
| **Data unit** | Row (fixed columns) | Document (flexible JSON-like) |
| **Schema** | Fixed — defined before data entry (`CREATE TABLE`) | Flexible — each document can have different fields |
| **Relationships** | JOINs across normalized tables | Embedded documents or `$lookup` (limited) |
| **Query language** | SQL (standardized) | MQL — MongoDB Query Language (JSON-based) |
| **Transactions** | Full ACID (multi-table) | ACID per document; multi-document since v4.0 |
| **Scaling** | Vertical (bigger server) + read replicas | Horizontal (sharding built-in) |
| **Storage** | Row-oriented (or columnar for OLAP) | BSON (Binary JSON) documents |
| **Schema changes** | `ALTER TABLE` (migration required) | Just write documents with new fields |

### The Core Mental Model

```
RDBMS:
  You design the schema FIRST, then write data that fits the schema.
  Schema-on-WRITE: Database rejects data that doesn't fit.

MongoDB:
  You write data FIRST, then query it however you need.
  Schema-on-READ: Application interprets whatever is stored.

  (In practice, you use schema validation to enforce structure,
   but the flexibility is there when you need it.)
```

---

## The Document Model

### Documents vs Rows

```
RDBMS (three normalized tables):

  users:
  ┌────┬──────┬────────────────┐
  │ id │ name │ email          │
  ├────┼──────┼────────────────┤
  │ 1  │ Alice│ alice@mail.com │
  └────┴──────┴────────────────┘

  addresses:                          orders:
  ┌────┬─────────┬────────┐          ┌────┬─────────┬───────┐
  │ id │ user_id │ city   │          │ id │ user_id │ total │
  ├────┼─────────┼────────┤          ├────┼─────────┼───────┤
  │ 1  │ 1       │ Mumbai │          │ 1  │ 1       │ 49.99 │
  │ 2  │ 1       │ Delhi  │          │ 2  │ 1       │ 99.99 │
  └────┴─────────┴────────┘          └────┴─────────┴───────┘

  To get a user with addresses and orders: 2 JOINs needed.

MongoDB (single document):

  {
    "_id": ObjectId("..."),
    "name": "Alice",
    "email": "alice@mail.com",
    "addresses": [
      { "city": "Mumbai", "type": "home" },
      { "city": "Delhi", "type": "office" }
    ],
    "orders": [
      { "orderId": "ORD-001", "total": 49.99 },
      { "orderId": "ORD-002", "total": 99.99 }
    ]
  }

  To get a user with addresses and orders: Single read, no JOINs.
```

### When to Embed vs Reference

| Strategy | When to Use | Example |
|----------|------------|---------|
| **Embed** (nest inside document) | Data is always accessed together, 1:few relationship, data doesn't change independently | User → addresses, Order → line items |
| **Reference** (store ID, look up separately) | Data is shared across documents, 1:many with many being large, data changes independently | Product referenced by many orders, User referenced by many comments |

```
EMBED (denormalized):
{
  "order_id": "ORD-001",
  "customer": { "name": "Alice", "email": "alice@mail.com" },  // Embedded
  "items": [
    { "product": "Laptop", "price": 999 },
    { "product": "Mouse",  "price": 25  }
  ]
}
✅ Single read to get full order
❌ If Alice changes email, must update ALL her orders

REFERENCE (normalized):
{
  "order_id": "ORD-001",
  "customer_id": ObjectId("..."),    // Reference
  "items": [
    { "product_id": ObjectId("..."), "quantity": 1 },
    { "product_id": ObjectId("..."), "quantity": 2 }
  ]
}
✅ Customer email updated in one place
❌ Need additional queries to resolve references ($lookup)
```

---

## CRUD Operations — How to Query MongoDB

### SQL to MongoDB Translation

| SQL | MongoDB |
|-----|---------|
| `SELECT * FROM users` | `db.users.find()` |
| `SELECT name, email FROM users` | `db.users.find({}, { name: 1, email: 1 })` |
| `SELECT * FROM users WHERE age > 25` | `db.users.find({ age: { $gt: 25 } })` |
| `SELECT * FROM users WHERE name = 'Alice'` | `db.users.find({ name: "Alice" })` |
| `INSERT INTO users (name, age) VALUES ('Bob', 30)` | `db.users.insertOne({ name: "Bob", age: 30 })` |
| `UPDATE users SET age = 31 WHERE name = 'Bob'` | `db.users.updateOne({ name: "Bob" }, { $set: { age: 31 } })` |
| `DELETE FROM users WHERE age < 18` | `db.users.deleteMany({ age: { $lt: 18 } })` |
| `SELECT COUNT(*) FROM users` | `db.users.countDocuments()` |
| `SELECT DISTINCT city FROM users` | `db.users.distinct("city")` |
| `SELECT * FROM users ORDER BY age DESC LIMIT 10` | `db.users.find().sort({ age: -1 }).limit(10)` |

### Query Operators

```javascript
// Comparison
db.users.find({ age: { $gt: 25 } })        // >
db.users.find({ age: { $gte: 25 } })       // >=
db.users.find({ age: { $lt: 30 } })        // <
db.users.find({ age: { $lte: 30 } })       // <=
db.users.find({ age: { $ne: 25 } })        // !=
db.users.find({ age: { $in: [25, 30] } })  // IN

// Logical
db.users.find({ $and: [{ age: { $gt: 25 } }, { city: "Mumbai" }] })
db.users.find({ $or: [{ city: "Mumbai" }, { city: "Delhi" }] })
db.users.find({ age: { $not: { $gt: 30 } } })

// Element
db.users.find({ phone: { $exists: true } })     // Field exists
db.users.find({ age: { $type: "number" } })      // Field type check

// Array
db.users.find({ tags: "java" })                   // Array contains "java"
db.users.find({ tags: { $all: ["java", "spring"] } })  // Contains both
db.users.find({ tags: { $size: 3 } })             // Array has exactly 3 elements

// Text search
db.articles.find({ $text: { $search: "mongodb tutorial" } })

// Nested documents
db.users.find({ "address.city": "Mumbai" })        // Dot notation
```

### Update Operations

```javascript
// $set — update specific fields
db.users.updateOne(
  { name: "Alice" },
  { $set: { age: 31, "address.city": "Pune" } }
)

// $inc — increment a value
db.products.updateOne(
  { sku: "LAPTOP-001" },
  { $inc: { stock: -1 } }       // Decrease stock by 1
)

// $push — add to array
db.users.updateOne(
  { name: "Alice" },
  { $push: { tags: "mongodb" } }
)

// $pull — remove from array
db.users.updateOne(
  { name: "Alice" },
  { $pull: { tags: "outdated-skill" } }
)

// Upsert — insert if not exists, update if exists
db.users.updateOne(
  { email: "bob@mail.com" },
  { $set: { name: "Bob", age: 30 } },
  { upsert: true }
)
```

---

## Aggregation Pipeline — Complex Queries & Joins

The aggregation pipeline is MongoDB's answer to SQL's GROUP BY, JOIN, subqueries, and window functions.

```
Documents → [Stage 1] → [Stage 2] → [Stage 3] → Results

Each stage transforms the documents and passes them to the next stage.
```

### Common Pipeline Stages

| Stage | SQL Equivalent | What It Does |
|-------|---------------|-------------|
| `$match` | `WHERE` | Filter documents |
| `$group` | `GROUP BY` | Group and aggregate |
| `$sort` | `ORDER BY` | Sort results |
| `$limit` | `LIMIT` | Limit results |
| `$skip` | `OFFSET` | Skip documents |
| `$project` | `SELECT` | Include/exclude/reshape fields |
| `$lookup` | `JOIN` | Join with another collection |
| `$unwind` | (flatten array) | Deconstruct arrays into separate documents |
| `$addFields` | `SELECT ... AS` | Add computed fields |
| `$count` | `COUNT(*)` | Count documents |
| `$bucket` | (histogram) | Group into ranges |

### Example: Revenue Report (GROUP BY equivalent)

```javascript
// SQL: SELECT department, COUNT(*), AVG(salary) FROM employees
//      WHERE hire_date > '2020-01-01'
//      GROUP BY department HAVING COUNT(*) > 5
//      ORDER BY AVG(salary) DESC

db.employees.aggregate([
  { $match: { hire_date: { $gt: ISODate("2020-01-01") } } },

  { $group: {
      _id: "$department",
      count: { $sum: 1 },
      avg_salary: { $avg: "$salary" }
  }},

  { $match: { count: { $gt: 5 } } },           // HAVING

  { $sort: { avg_salary: -1 } },

  { $project: {
      department: "$_id",
      count: 1,
      avg_salary: { $round: ["$avg_salary", 2] },
      _id: 0
  }}
])
```

### Example: $lookup — The MongoDB JOIN

```javascript
// SQL: SELECT o.*, c.name FROM orders o
//      JOIN customers c ON o.customer_id = c._id

db.orders.aggregate([
  { $lookup: {
      from: "customers",        // Collection to join
      localField: "customer_id", // Field in orders
      foreignField: "_id",       // Field in customers
      as: "customer"             // Output array field
  }},

  { $unwind: "$customer" },     // Flatten the array to a single object

  { $project: {
      order_id: 1,
      total: 1,
      "customer.name": 1,
      "customer.email": 1
  }}
])
```

### $lookup Limitations

```
Compared to SQL JOINs, $lookup is:
  ❌ Slower (not optimized like RDBMS join algorithms)
  ❌ Cannot use indexes on the "from" collection efficiently (before v5.0)
  ❌ Returns an array (must $unwind for 1:1 relationships)
  ❌ No support for sharded "from" collections (before v5.1)
  ❌ Complex multi-collection joins require nested pipelines

If you find yourself doing many $lookups:
  → Your data model may be wrong for MongoDB
  → Consider embedding related data instead
  → Or consider whether RDBMS is a better fit
```

### Example: Running Total (Window Function equivalent)

```javascript
// MongoDB 5.0+ supports $setWindowFields
db.daily_sales.aggregate([
  { $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        running_total: {
          $sum: "$revenue",
          window: { documents: ["unbounded", "current"] }
        },
        moving_avg_7d: {
          $avg: "$revenue",
          window: { documents: [-6, "current"] }
        }
      }
  }}
])
```

---

## Indexes in MongoDB

### Index Types

| Index Type | MongoDB | Similar to (PostgreSQL) | Use Case |
|------------|---------|------------------------|----------|
| **Single Field** | `{ email: 1 }` | B-Tree on single column | Equality/range on one field |
| **Compound** | `{ customer_id: 1, date: -1 }` | Composite B-Tree | Multi-field queries |
| **Multikey** | Auto on array fields | GIN | Queries on array elements |
| **Text** | `{ body: "text" }` | Full-text (tsvector) | Text search |
| **Geospatial** | `{ location: "2dsphere" }` | PostGIS GiST | Location queries |
| **Hashed** | `{ user_id: "hashed" }` | Hash index | Shard key distribution |
| **TTL** | `{ createdAt: 1 }, { expireAfterSeconds: 86400 }` | N/A | Auto-delete old documents |
| **Unique** | `{ email: 1 }, { unique: true }` | UNIQUE constraint | Enforce uniqueness |

### Creating Indexes

```javascript
// Single field index
db.users.createIndex({ email: 1 })                  // Ascending
db.users.createIndex({ created_at: -1 })             // Descending

// Compound index (order matters — leftmost prefix rule, same as RDBMS)
db.orders.createIndex({ customer_id: 1, order_date: -1 })

// ✅ Uses index: db.orders.find({ customer_id: "C001" })
// ✅ Uses index: db.orders.find({ customer_id: "C001", order_date: { $gt: ... } })
// ❌ Cannot use: db.orders.find({ order_date: { $gt: ... } })  (skips customer_id)

// Unique index
db.users.createIndex({ email: 1 }, { unique: true })

// TTL index (auto-delete after 24 hours)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })

// Text index for search
db.articles.createIndex({ title: "text", body: "text" })
db.articles.find({ $text: { $search: "mongodb performance" } })

// Partial index (index only matching documents)
db.orders.createIndex(
  { status: 1 },
  { partialFilterExpression: { status: "PENDING" } }
)
// Only indexes PENDING orders → smaller index, faster writes
```

### Checking Index Usage

```javascript
// Explain query plan (like EXPLAIN in SQL)
db.users.find({ email: "alice@mail.com" }).explain("executionStats")

// Key fields to check:
//   winningPlan.stage: "IXSCAN" (index used) vs "COLLSCAN" (full scan)
//   executionStats.totalDocsExamined: Should be close to nReturned
//   executionStats.executionTimeMillis: Actual time

// List all indexes on a collection
db.users.getIndexes()

// Drop unused index
db.users.dropIndex("email_1")
```

---

## When to Use MongoDB vs RDBMS

### Choose MongoDB When

```
✅ FLEXIBLE/EVOLVING SCHEMA
   Content management, user profiles, product catalogs
   where each document may have different fields.

✅ HIERARCHICAL DATA (Embedded Documents)
   Blog posts with comments, orders with line items
   where data is naturally nested.

✅ HIGH WRITE THROUGHPUT
   IoT sensor data, event logging, real-time analytics
   where writes vastly outnumber reads.

✅ HORIZONTAL SCALING IS CRITICAL
   Sharding is built-in. Auto-distribute data across servers.
   Easier to shard than PostgreSQL.

✅ RAPID PROTOTYPING
   Schema changes without migrations.
   Just start writing documents with new fields.

✅ GEOSPATIAL QUERIES
   MongoDB has excellent geospatial indexing and querying.
   "Find restaurants within 5km" is a first-class operation.

✅ TIME-SERIES DATA (MongoDB 5.0+)
   Native time-series collections optimized for sensor/metrics data.
```

### Choose RDBMS When

```
✅ COMPLEX RELATIONSHIPS AND JOINS
   If your queries regularly join 3+ tables, RDBMS is better.
   MongoDB's $lookup is limited compared to SQL JOINs.

✅ STRICT CONSISTENCY AND ACID
   Financial transactions, inventory management, booking systems
   where inconsistency means real business loss.
   (MongoDB has multi-doc transactions since v4.0, but they're
    slower and more limited than RDBMS.)

✅ COMPLEX AGGREGATION AND REPORTING
   SQL is more expressive for complex GROUP BY, window functions,
   CTEs, and recursive queries.

✅ STRONG REFERENTIAL INTEGRITY
   Foreign keys prevent orphaned records at the database level.
   MongoDB has no foreign key enforcement.

✅ REGULATORY COMPLIANCE
   Financial, healthcare, government systems often mandate RDBMS
   for audit trails and strict data integrity.

✅ MATURE TOOLING AND EXPERTISE
   SQL has been around for 40+ years. ORMs, migration tools,
   monitoring tools are more mature for RDBMS.
```

### Decision Matrix

```
Question                                        → MongoDB    → RDBMS
─────────────────────────────────────────────     ────────     ─────
Schema changes frequently?                        ✅ Yes       Needs migrations
Many JOINs across entities?                       Weak         ✅ Strong
Needs sharding for massive scale?                 ✅ Built-in  Complex
Strict transactions across tables?                Limited      ✅ Full ACID
Hierarchical/nested data?                         ✅ Natural   Requires JOINs
Need referential integrity (FK)?                  Not enforced ✅ Enforced
Team knows SQL?                                   Different    ✅ Standard
Complex reporting/analytics?                      Possible     ✅ Better
Write-heavy workload?                             ✅ Optimized OK with tuning
Geospatial queries?                               ✅ Excellent Good (PostGIS)
```

---

## Anti-Patterns

### 1. Using MongoDB Like a Relational Database

```
❌ Problem: Normalizing everything into separate collections and using $lookup everywhere

db.orders.aggregate([
  { $lookup: { from: "customers", ... } },
  { $lookup: { from: "products", ... } },
  { $lookup: { from: "shipping", ... } },
  { $lookup: { from: "payments", ... } }
])

Why it fails: $lookup is slow, can't be indexed like SQL JOINs.
You're paying MongoDB's costs without getting its benefits.

✅ Fix: Embed related data. If you need many JOINs, use RDBMS.
```

### 2. Unbounded Array Growth

```
❌ Problem: Pushing to arrays without limit

{
  "user_id": "alice",
  "activity_log": [
    { "action": "login", "time": "..." },
    // ... 100,000+ entries
  ]
}

Why it fails: MongoDB document max size = 16 MB.
Large arrays cause: slow queries, high memory usage, hitting size limit.

✅ Fix: Use a separate collection for high-cardinality data.
   Store recent activity (last 50) embedded, historical in separate collection.
```

### 3. No Schema Validation

```
❌ Problem: "Schema-less" treated as "no rules at all"

// Document 1: { name: "Alice", age: 30 }
// Document 2: { fullName: "Bob", years_old: "twenty-five" }
// Document 3: { n: "Carol" }

Why it fails: Application code breaks on unexpected field names/types.
   Impossible to query consistently.

✅ Fix: Use MongoDB Schema Validation:
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      required: ["name", "email", "age"],
      properties: {
        name:  { bsonType: "string" },
        email: { bsonType: "string" },
        age:   { bsonType: "int", minimum: 0 }
      }
    }
  }
})
```

### 4. Ignoring Indexes

```
❌ Problem: Running queries without indexes on large collections

db.orders.find({ customer_id: "C001", status: "PENDING" })
// On 10 million documents: full collection scan = ~30 seconds

Why it fails: Same as RDBMS — without indexes, every query is O(n).

✅ Fix: Create indexes for your query patterns:
db.orders.createIndex({ customer_id: 1, status: 1 })
// Same query: ~5 milliseconds
```

### 5. Using MongoDB for Transactions-Heavy Workloads

```
❌ Problem: Building a banking system on MongoDB

Why it fails:
  - Multi-document transactions (since v4.0) are slower than RDBMS
  - No foreign keys → no referential integrity at DB level
  - Transaction timeout default: 60 seconds
  - Performance degrades under high transaction contention

✅ Fix: Use RDBMS for transaction-heavy workloads.
   Use MongoDB for the parts that benefit from its strengths (catalog, events).
```

---

## Self-Check Questions

1. What is the fundamental data model difference between MongoDB and RDBMS?
2. When would you embed data vs reference it in MongoDB?
3. How does `$lookup` compare to SQL JOIN? What are its limitations?
4. How do you create a compound index in MongoDB, and does column order matter?
5. When is MongoDB a better choice than PostgreSQL? Give 3 specific scenarios.
6. What is the maximum document size in MongoDB, and how does it affect schema design?

<details>
<summary>Answers</summary>

1. RDBMS stores data in fixed-schema rows across normalized tables. MongoDB stores data as flexible JSON-like documents that can contain nested objects and arrays. RDBMS is schema-on-write; MongoDB is schema-on-read.
2. Embed when: data is always accessed together, 1:few relationship, data doesn't change independently (Order → LineItems). Reference when: data is shared (Product referenced by many Orders), high cardinality, data changes independently.
3. `$lookup` performs a left outer join between two collections. Limitations: slower than SQL JOINs (no join optimization), doesn't work well with sharded "from" collections (pre-5.1), returns an array (needs $unwind), complex multi-table joins are verbose. If you need many JOINs, RDBMS is likely a better fit.
4. `db.collection.createIndex({ field1: 1, field2: -1 })`. Yes, order matters — the leftmost prefix rule applies (same as RDBMS composite indexes). Index on (A, B) can serve queries on A or (A, B), but NOT B alone.
5. (a) Flexible/evolving schema: content management where each document has different fields. (b) High write throughput with horizontal scaling: IoT sensor data across sharded clusters. (c) Hierarchical data: user profiles with nested addresses, preferences, and activity logs accessed together.
6. Maximum 16 MB per document. This means unbounded arrays (like activity logs) that grow indefinitely will eventually hit this limit. Design strategy: keep high-cardinality data in separate collections; embed only bounded, frequently-accessed data.

</details>

---

## Navigation

**Prerequisites:**
- [Database Fundamentals](./01-database-fundamentals.md) — RDBMS, ACID, indexes, SQL

**Related:**
- [Storage Fundamentals](../../03-architecture/system-design/01-storage-fundamentals.md) — SQL vs NoSQL overview
- [Messaging Comparison](../messaging/01-messaging-comparison.md) — SQS vs Kafka vs RabbitMQ
- [Microservices — Database Patterns](../../03-architecture/microservices/07-migration-and-database.md) — Database per service

**Module Index:** [Learning Roadmap](../../README.md)
