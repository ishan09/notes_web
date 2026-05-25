# Database Fundamentals — Interview Deep Dive

> **Before You Start**: You should understand basic SQL syntax (SELECT, INSERT, UPDATE, DELETE) and know what tables, columns, and rows are. This file goes beyond basics into *why* things work the way they do — the depth interviewers expect.

---

## Table of Contents

1. [Why Do We Need RDBMS?](#why-do-we-need-rdbms)
2. [OLTP vs OLAP](#oltp-vs-olap)
3. [ACID Properties — Deep Dive](#acid-properties--deep-dive)
4. [ETL, Data Lake, Data Warehouse](#etl-data-lake-data-warehouse)
5. [Database Connection Pooling](#database-connection-pooling)
6. [Indexes — Types, Big-O, When to Use](#indexes--types-big-o-when-to-use)
7. [SQL Execution Order](#sql-execution-order)
8. [Window Functions](#window-functions)
9. [Date, Time, and DateTime Functions](#date-time-and-datetime-functions)
10. [Advanced SQL — HAVING, UNION, JSON Aggregation](#advanced-sql--having-union-json-aggregation)
11. [Foreign Keys & Cascading — Deep Dive](#foreign-keys--cascading--deep-dive)
12. [Normalization & Denormalization](#normalization--denormalization)
13. [Write-Ahead Log (WAL) — Deep Dive](#write-ahead-log-wal--deep-dive)
14. [PostgreSQL Schemas](#postgresql-schemas)
15. [Self-Check Questions](#self-check-questions)

---

## Why Do We Need RDBMS?

### The Problem Before Relational Databases

```
Before RDBMS, data was stored in:
- Flat files        → No relationships, massive duplication
- Hierarchical DBs  → Rigid parent-child, can't model many-to-many
- Network DBs       → Complex pointer chains, vendor lock-in

All suffered from:
❌ Data redundancy (same info stored 10 times)
❌ Update anomalies (change in one place, stale in another)
❌ No data integrity guarantees
❌ No standard query language
```

### What RDBMS Gives You

| Capability | What It Means | Why It Matters |
|------------|--------------|----------------|
| **Structured Schema** | Tables with defined columns and types | Catches bad data at write time, not at read time |
| **Normalization** | Eliminate duplication through relationships | Update once, reflected everywhere |
| **Referential Integrity** | Foreign keys enforce valid relationships | Can't have an order pointing to a non-existent customer |
| **ACID Transactions** | Atomic, consistent, isolated, durable operations | Your bank transfer won't lose money mid-crash |
| **SQL** | Declarative, standardized query language | Portable skills, optimizer does the hard work |
| **Concurrency Control** | Multiple users safely reading/writing | 1000 users don't corrupt each other's data |

### When RDBMS Is the Wrong Choice

```
❌ Massive write throughput (>100K writes/sec) → Consider Cassandra, DynamoDB
❌ Highly variable schema (every doc different) → Consider MongoDB
❌ Simple key-value lookups at extreme speed   → Consider Redis
❌ Graph traversals (social networks)          → Consider Neo4j
❌ Time-series data (metrics, IoT sensors)     → Consider InfluxDB, TimescaleDB
```

**Interview Tip**: Never say "always use RDBMS." Show you understand trade-offs. The answer is always "it depends on the access patterns."

---

## OLTP vs OLAP

Two fundamentally different workload patterns that require different database designs.

### Side-by-Side Comparison

```
┌────────────────────────────────────────────────────────────────────────┐
│                    OLTP vs OLAP                                        │
├──────────────────────┬─────────────────────────────────────────────────┤
│       OLTP           │              OLAP                               │
│  Online Transaction  │     Online Analytical                           │
│     Processing       │        Processing                               │
├──────────────────────┼─────────────────────────────────────────────────┤
│ "What happened       │  "What trends can we                            │
│  just now?"          │   see over time?"                               │
├──────────────────────┼─────────────────────────────────────────────────┤
│ INSERT, UPDATE,      │  SELECT with GROUP BY,                          │
│ DELETE single rows   │  aggregations over millions                     │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Millisecond latency  │  Seconds to minutes acceptable                  │
│ for each operation   │  (scanning terabytes)                           │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Highly normalized    │  Denormalized (star/snowflake                   │
│ (3NF)                │  schema)                                        │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Row-oriented storage │  Column-oriented storage                        │
│ (PostgreSQL, MySQL)  │  (Redshift, BigQuery, ClickHouse)               │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### Detailed Comparison

| Aspect | OLTP | OLAP |
|--------|------|------|
| **Purpose** | Day-to-day operations | Business intelligence, reporting |
| **Users** | Thousands of concurrent users (customers, operators) | Dozens of analysts, data scientists |
| **Queries** | Simple, touch few rows (find order #123) | Complex, scan millions of rows (revenue by region by quarter) |
| **Data Volume** | GBs to low TBs | TBs to PBs |
| **Schema** | Normalized (3NF) to reduce redundancy | Denormalized (star schema) for fast reads |
| **Storage** | Row-oriented (efficient for reading full rows) | Column-oriented (efficient for aggregating one column) |
| **Freshness** | Real-time (current state) | Periodic (batch-loaded, minutes to hours old) |
| **Indexes** | Many indexes on various columns | Few indexes, relies on column-store compression |
| **Concurrency** | High (thousands of transactions/sec) | Low (few heavy queries at a time) |
| **Examples** | PostgreSQL, MySQL, Oracle, SQL Server | Redshift, BigQuery, Snowflake, ClickHouse |

### Why Column-Oriented Storage for OLAP?

```
Row-oriented (OLTP):                    Column-oriented (OLAP):
┌────┬──────┬─────┬──────────┐          ┌────┬────┬────┬────┐
│ id │ name │ age │ salary   │          │ id │ id │ id │ id │  ← id column
├────┼──────┼─────┼──────────┤          │ 1  │ 2  │ 3  │ 4  │
│ 1  │ Ali  │ 30  │ 50000    │          └────┴────┴────┴────┘
│ 2  │ Bob  │ 25  │ 60000    │          ┌────────────────────┐
│ 3  │ Cat  │ 35  │ 70000    │          │ name column        │
│ 4  │ Dan  │ 28  │ 55000    │          │ Ali, Bob, Cat, Dan │
└────┴──────┴─────┴──────────┘          └────────────────────┘
                                        ┌────────────────────┐
Query: SELECT AVG(salary)               │ salary column      │
       FROM employees;                  │ 50K, 60K, 70K, 55K │
                                        └────────────────────┘
Row store: Must read ALL columns         Column store: Only reads salary
for every row → wasted I/O              column → much less I/O

Row store is great for:                  Column store is great for:
  SELECT * FROM emp WHERE id = 3           SELECT AVG(salary) FROM emp
  (reads one full row quickly)             (reads one column across all rows)
```

---

## ACID Properties — Deep Dive

> **Also covered in**: [Storage Fundamentals](../../03-architecture/system-design/01-storage-fundamentals.md) → ACID vs BASE section

Beyond knowing the acronym, interviewers want to know *what breaks when each property is violated*.

### Atomicity — All or Nothing

**What it means**: A transaction either fully completes or fully rolls back. No partial state.

**What breaks without it**:
```
Transfer $500 from Account A → Account B:

Step 1: Debit  Account A by $500  ✅ Success
Step 2: Credit Account B by $500  ❌ System crashes here

Without atomicity: $500 vanished! A was debited, B was never credited.
With atomicity:    Both steps roll back. A still has its $500.
```

**How databases implement it**: Write-Ahead Log (WAL). Every change is logged *before* being applied. On crash, replay or undo from the log.

### Consistency — Valid State to Valid State

**What it means**: A transaction moves the database from one valid state to another. All constraints (unique, foreign key, check) are enforced.

**What breaks without it**:
```
Constraint: account_balance >= 0

Transaction: Withdraw $1000 from account with $500

Without consistency: Balance becomes -$500 (invalid state)
With consistency:    Transaction rejected, balance stays $500
```

### Isolation — Transactions Don't Interfere

**What it means**: Concurrent transactions behave as if they ran one at a time.

**What breaks without it** (isolation anomalies):

| Anomaly | Description | Example |
|---------|-------------|---------|
| **Dirty Read** | Read uncommitted data from another transaction | Tx1 writes $0, Tx2 reads $0, Tx1 rolls back to $500 — Tx2 used wrong value |
| **Non-Repeatable Read** | Same query returns different values within one transaction | Tx1 reads balance=$500, Tx2 commits update to $300, Tx1 reads again: $300 |
| **Phantom Read** | New rows appear in a repeated range query | Tx1 counts 10 orders, Tx2 inserts 1, Tx1 counts again: 11 |
| **Lost Update** | Two transactions overwrite each other | Both read balance=$500, both add $100, result=$600 instead of $700 |

**Isolation Levels** (from weakest to strongest):

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|:----------:|:-------------------:|:------------:|:-----------:|
| **READ UNCOMMITTED** | Possible | Possible | Possible | Fastest |
| **READ COMMITTED** | Prevented | Possible | Possible | Good (PostgreSQL default) |
| **REPEATABLE READ** | Prevented | Prevented | Possible | Moderate (MySQL InnoDB default) |
| **SERIALIZABLE** | Prevented | Prevented | Prevented | Slowest |

**Interview Tip**: Know your database's default isolation level. PostgreSQL = READ COMMITTED. MySQL InnoDB = REPEATABLE READ. This matters for debugging production anomalies.

### Durability — Committed = Permanent

**What it means**: Once a transaction is committed, it survives crashes, power loss, and hardware failure.

**How databases implement it**:
- **WAL (Write-Ahead Log)**: Changes written to disk log before confirmation
- **fsync**: Forces OS to flush write buffers to physical disk
- **Replication**: Copies data to other nodes for redundancy

---

## ETL, Data Lake, Data Warehouse

### The Data Pipeline Landscape

```
                    ┌──────────────┐
    Operational     │  OLTP DBs    │ ──┐
    Systems         │  (MySQL,     │   │
                    │   Postgres)  │   │
                    └──────────────┘   │
                    ┌──────────────┐   │    ┌─────────┐    ┌──────────────────┐
    Applications    │  App Logs,   │ ──┼──→ │   ETL   │ ──→│  Data Warehouse  │
                    │  Click Data  │   │    │ Process │    │  (Redshift,      │
                    └──────────────┘   │    └─────────┘    │   BigQuery,      │
                    ┌──────────────┐   │                   │   Snowflake)     │
    External        │  APIs,       │ ──┘                   └──────────────────┘
    Sources         │  CSV files   │              ↓
                    └──────────────┘         Raw dump
                                                ↓
                                        ┌──────────────┐
                                        │  Data Lake   │
                                        │  (S3, HDFS,  │
                                        │   GCS)       │
                                        └──────────────┘
```

### ETL — Extract, Transform, Load

| Phase | What Happens | Example |
|-------|-------------|---------|
| **Extract** | Pull data from source systems | Read orders from MySQL, logs from S3, events from Kafka |
| **Transform** | Clean, validate, aggregate, join, reshape | Remove duplicates, convert currencies, compute daily totals |
| **Load** | Write into target system | Insert into Redshift data warehouse |

**ELT vs ETL** (modern distinction):

| Aspect | ETL | ELT |
|--------|-----|-----|
| **Transform where?** | In a staging area before loading | Inside the data warehouse after loading |
| **When?** | Traditional approach | Modern approach (cheap compute in cloud) |
| **Tools** | Informatica, Talend, SSIS | dbt, Snowflake SQL, BigQuery SQL |
| **Advantage** | Less storage needed | Simpler pipeline, replayable transforms |

### Data Warehouse

A **centralized repository** of structured, cleaned, historical data optimized for analytical queries.

**Key characteristics**:
- **Subject-oriented**: Organized by business domains (sales, customers, products)
- **Integrated**: Data from many sources merged into consistent format
- **Time-variant**: Stores historical data (not just current state)
- **Non-volatile**: Data is loaded periodically, rarely updated in place

**Schema design** (star schema):
```
                    ┌───────────────┐
                    │  dim_product  │
                    │───────────────│
                    │ product_id PK │
                    │ name          │
                    │ category      │
                    │ brand         │
                    └───────┬───────┘
                            │
┌───────────────┐   ┌───────┴───────┐   ┌───────────────┐
│  dim_customer │   │  fact_sales   │   │  dim_date     │
│───────────────│   │───────────────│   │───────────────│
│ customer_id PK│──→│ customer_id FK│   │ date_id PK    │
│ name          │   │ product_id FK │←──│ date          │
│ region        │   │ date_id    FK │   │ month         │
│ segment       │   │ quantity      │   │ quarter       │
└───────────────┘   │ revenue       │   │ year          │
                    │ discount      │   └───────────────┘
                    └───────────────┘
```

### Data Lake

A **storage repository** that holds raw data in its native format (structured, semi-structured, unstructured) until needed.

| Aspect | Data Warehouse | Data Lake |
|--------|---------------|-----------|
| **Data** | Structured, cleaned | Raw — structured, semi-structured, unstructured |
| **Schema** | Schema-on-write (define before loading) | Schema-on-read (define when querying) |
| **Users** | Business analysts, BI tools | Data scientists, ML engineers |
| **Processing** | SQL queries | Spark, Python, ML pipelines |
| **Cost** | Higher (compute-optimized storage) | Lower (object storage: S3, GCS) |
| **Quality** | High (curated, validated) | Variable (raw dumps, may be messy) |
| **Use Case** | "What was Q4 revenue by region?" | "Train an ML model on all user behavior data" |

**Data Lakehouse** (modern hybrid): Combines lake's cheap storage with warehouse's query performance. Examples: Databricks Delta Lake, Apache Iceberg.

---

## Database Connection Pooling

### Why You Need Connection Pools

Creating a database connection is **expensive**:

```
What happens when you open a new DB connection:
1. TCP handshake (SYN → SYN-ACK → ACK)           ~1-3ms
2. SSL/TLS handshake (if encrypted)                ~5-10ms
3. Database authentication                          ~2-5ms
4. Server allocates memory for the session          ~1-2ms
5. Initialize session parameters                    ~1ms
                                            ────────────────
                                            Total: ~10-20ms per connection

If every HTTP request opens a new connection:
  1000 req/sec × 15ms = 15 seconds of just connection overhead/sec
  → System spends more time connecting than querying!
```

**Connection pool solution**: Pre-create a fixed set of connections at startup. Threads borrow a connection, use it, return it. No per-request creation cost.

```
Without pool:                          With pool:
Request → Create Conn → Query → Close  Request → Borrow Conn → Query → Return
Request → Create Conn → Query → Close  Request → Borrow Conn → Query → Return
Request → Create Conn → Query → Close  Request → Borrow Conn → Query → Return
(expensive every time)                 (reuses existing connections)
```

### Connection Limits by Database

Every database has a maximum number of simultaneous connections it can handle:

| Database | Default Max Connections | Recommended Production | Why the Limit? |
|----------|:----------------------:|:---------------------:|----------------|
| **PostgreSQL** | 100 | 100-300 | Each connection = 1 OS process (~5-10 MB RAM) |
| **MySQL** | 151 | 150-500 | Each connection = 1 OS thread (~256 KB - 10 MB) |
| **Oracle** | Configurable (sessions param) | 300-1000 | Licensed per session in some editions |
| **SQL Server** | 32,767 | 200-500 | Memory-bound, each session = ~2 MB |
| **MongoDB** | 65,536 | 100-200 per app | Each connection = 1 thread in thread pool |
| **Redis** | 10,000 | 1000-5000 | Single-threaded; connections are cheap but commands serialize |
| **Cassandra** | Configurable | 1-2 per core per node | Multiplexes requests over few connections |

### The Microservices Multiplication Problem

```
Monolith world:
  1 app × 20 connections = 20 connections to DB     ✅ Fine

Microservices world:
  10 services × 20 connections × 3 instances each = 600 connections  ❌ Exceeds PostgreSQL default!
```

### How to Mitigate Connection Exhaustion

**1. Right-size your pools** (don't just increase max_connections):

```
Formula (from HikariCP wiki):
  pool_size = (core_count × 2) + effective_spindle_count

Example:
  4 CPU cores, SSD → (4 × 2) + 1 = 9 connections
  Most apps: start with 10-20 per service instance
```

> **For Spring/HikariCP configuration details**, see: [Spring Data Best Practices](../../01-java/02-spring-ecosystem/spring-data/05-best-practices.md) → Connection Pooling section

**2. Use a connection pooler/proxy** (essential for microservices + PostgreSQL):

| Tool | Database | What It Does |
|------|----------|-------------|
| **PgBouncer** | PostgreSQL | Sits between app and DB. 600 app connections multiplexed into 50 real DB connections |
| **ProxySQL** | MySQL | Connection multiplexing, query routing, read/write splitting |
| **Amazon RDS Proxy** | Any RDS | Managed connection pooling as a service |

```
Without PgBouncer:                     With PgBouncer:
Service A (20 conn) ──→               Service A (20 conn) ──┐
Service B (20 conn) ──→  PostgreSQL   Service B (20 conn) ──┼→ PgBouncer → PostgreSQL
Service C (20 conn) ──→  (60 conn!)   Service C (20 conn) ──┘   (15 real conn)
```

**3. NoSQL differences**:

| Database | Connection Model | Pooling Strategy |
|----------|-----------------|------------------|
| **MongoDB** | Thread-per-connection (like RDBMS) | Use driver's built-in pool (default: 100 per host) |
| **Redis** | Single-threaded, cheap connections | Pool with Lettuce/Jedis (10-50 connections), pipelining matters more |
| **Cassandra** | Multiplexed connections | 1-2 connections per node is enough; driver handles multiplexing |
| **DynamoDB** | HTTP-based (no persistent connections) | No connection pool needed; tune HTTP client thread pool instead |

**4. Monitor and alert**:
```yaml
# Key metrics to watch
hikaricp.connections.active   # Should be < 80% of pool size
hikaricp.connections.pending  # Should be 0 (threads waiting = bottleneck)
hikaricp.connections.timeout  # Should be 0 (means pool is too small)
```

---

## Indexes — Types, Big-O, When to Use

### What Is an Index?

An index is a separate data structure that maps column values to row locations, enabling the database to find rows without scanning the entire table.

**Analogy**: A book's index. Instead of reading every page to find "PostgreSQL," you look up "P" in the index → page 142. The database does the same thing.

### Index Types and Their Big-O

| Index Type | Data Structure | Lookup | Range Scan | Insert/Update | Space |
|------------|---------------|:------:|:----------:|:-------------:|:-----:|
| **B-Tree** (default) | Balanced tree | O(log n) | O(log n + k) | O(log n) | Moderate |
| **Hash** | Hash table | O(1) | ❌ Not supported | O(1) | Low |
| **GIN** (Generalized Inverted) | Inverted index | O(log n) | O(log n + k) | O(log n) — slower | High |
| **GiST** (Generalized Search Tree) | R-tree/custom | O(log n) | O(log n + k) | O(log n) | Moderate |
| **BRIN** (Block Range) | Min/max per block | O(1) per block | O(blocks) | O(1) | Very low |
| **Bitmap** | Bit arrays | O(1) | O(n/word_size) | Expensive | Low |

*(n = total rows, k = matching rows in range)*

### When to Use Each Index Type

**B-Tree (the workhorse — use by default)**:
```sql
-- Equality lookups
CREATE INDEX idx_email ON users(email);
SELECT * FROM users WHERE email = 'alice@example.com';  -- O(log n)

-- Range queries
CREATE INDEX idx_created ON orders(created_at);
SELECT * FROM orders WHERE created_at > '2025-01-01';   -- O(log n + k)

-- Sorting (avoids filesort)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10; -- Uses index

-- Prefix LIKE
SELECT * FROM users WHERE name LIKE 'Ali%';             -- Uses B-tree
SELECT * FROM users WHERE name LIKE '%ice';             -- ❌ Cannot use B-tree
```

**Hash Index** (rare, PostgreSQL-specific):
```sql
-- Only for exact equality, never for ranges
CREATE INDEX idx_session ON sessions USING hash(session_id);
-- Slightly faster than B-tree for pure equality, but:
-- ❌ No range queries, ❌ No ORDER BY, ❌ Not WAL-logged (pre-PG 10)
-- In practice: just use B-tree
```

**GIN (Full-text search, arrays, JSONB)**:
```sql
-- Full-text search
CREATE INDEX idx_search ON articles USING gin(to_tsvector('english', body));
SELECT * FROM articles WHERE to_tsvector('english', body) @@ to_tsquery('database');

-- JSONB containment
CREATE INDEX idx_tags ON products USING gin(tags);
SELECT * FROM products WHERE tags @> '["electronics"]';

-- Array contains
CREATE INDEX idx_skills ON employees USING gin(skills);
SELECT * FROM employees WHERE skills @> ARRAY['Java', 'Spring'];
```

**GiST (Geospatial, ranges, nearest-neighbor)**:
```sql
-- PostGIS geospatial
CREATE INDEX idx_location ON stores USING gist(location);
SELECT * FROM stores WHERE ST_DWithin(location, ST_MakePoint(77.5, 12.9), 5000);

-- Range types
CREATE INDEX idx_booking ON rooms USING gist(booked_during);
SELECT * FROM rooms WHERE booked_during && '[2025-03-01, 2025-03-05]';
```

**BRIN (Huge tables with naturally ordered data)**:
```sql
-- Time-series data where rows are inserted in order
CREATE INDEX idx_ts ON sensor_data USING brin(timestamp);
-- Tiny index (1000x smaller than B-tree) for terabyte tables
-- Works because data is physically ordered by timestamp
```

### Composite Indexes (Multi-Column)

**Column order matters** — leftmost prefix rule:

```sql
CREATE INDEX idx_composite ON orders(customer_id, created_at, status);

-- ✅ Uses index (leftmost prefix)
SELECT * FROM orders WHERE customer_id = 42;
SELECT * FROM orders WHERE customer_id = 42 AND created_at > '2025-01-01';
SELECT * FROM orders WHERE customer_id = 42 AND created_at > '2025-01-01' AND status = 'PAID';

-- ❌ Cannot use this index (skips customer_id)
SELECT * FROM orders WHERE created_at > '2025-01-01';
SELECT * FROM orders WHERE status = 'PAID';
```

**Rule of thumb for column order**: Equality columns first, then range columns, then sort columns.

### When NOT to Index

```
❌ Small tables (< 1000 rows) → Full scan is faster than index lookup
❌ Columns with low cardinality (e.g., boolean, gender) → B-tree wastes space
❌ Write-heavy tables with rare reads → Index maintenance cost > benefit
❌ Columns never used in WHERE, JOIN, or ORDER BY
❌ Too many indexes on one table → Slows every INSERT/UPDATE/DELETE
```

### The Cost of Indexes

```
Every INSERT: Must update ALL indexes on that table
Every UPDATE (on indexed column): Delete old entry + insert new entry in index
Every DELETE: Must remove from ALL indexes

Rule of thumb:
  0-3 indexes per table  → Fine for most OLTP workloads
  4-6 indexes per table  → Acceptable, monitor write performance
  7+ indexes per table   → Likely hurting writes, audit and remove unused ones
```

### Checking Index Usage

```sql
-- PostgreSQL: Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- MySQL: Check query plan
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
-- Look for: type = ref (index used) vs type = ALL (full table scan)
```

---

## SQL Execution Order

SQL is **declarative** — you say *what* you want, not *how*. But the database executes clauses in a specific order, which is different from how you write them.

### Written Order vs Execution Order

```
Written order (how you type it):     Execution order (how DB processes it):
─────────────────────────────────    ────────────────────────────────────────
1. SELECT                            1. FROM / JOIN     ← Which tables?
2. FROM                              2. WHERE           ← Filter rows
3. WHERE                             3. GROUP BY        ← Group rows
4. GROUP BY                          4. HAVING          ← Filter groups
5. HAVING                            5. SELECT          ← Compute columns
6. ORDER BY                          6. DISTINCT        ← Remove duplicates
7. LIMIT                             7. ORDER BY        ← Sort results
                                     8. LIMIT / OFFSET  ← Paginate
```

### Why This Order Matters

**You can't use a column alias in WHERE** (because SELECT hasn't run yet):

```sql
-- ❌ WRONG: "total" doesn't exist at WHERE stage
SELECT price * quantity AS total
FROM order_items
WHERE total > 100;

-- ✅ FIX 1: Repeat the expression
SELECT price * quantity AS total
FROM order_items
WHERE price * quantity > 100;

-- ✅ FIX 2: Use HAVING (runs after SELECT in some DBs) or subquery
SELECT * FROM (
    SELECT price * quantity AS total FROM order_items
) sub
WHERE total > 100;
```

**You CAN use a column alias in ORDER BY** (because ORDER BY runs after SELECT):

```sql
-- ✅ This works
SELECT price * quantity AS total
FROM order_items
ORDER BY total DESC;
```

**You CAN use a column alias in HAVING** (in MySQL, not standard SQL):

```sql
-- ✅ MySQL allows this (non-standard)
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department
HAVING cnt > 5;

-- ✅ Standard SQL (works everywhere)
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;
```

### Complete Execution Walkthrough

```sql
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
JOIN departments ON employees.dept_id = departments.id
WHERE hire_date > '2020-01-01'
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC
LIMIT 10;
```

```
Step 1 — FROM / JOIN:
  Cross-join employees × departments, then apply ON condition
  → Result: All employee-department matched rows

Step 2 — WHERE:
  Filter: keep only rows where hire_date > '2020-01-01'
  → Result: Subset of rows (recent hires only)

Step 3 — GROUP BY:
  Group remaining rows by department
  → Result: One group per department

Step 4 — HAVING:
  Filter groups: keep only departments with COUNT(*) > 5
  → Result: Fewer groups

Step 5 — SELECT:
  Compute: department name, COUNT(*), AVG(salary) for each group
  → Result: Three columns per group

Step 6 — ORDER BY:
  Sort by avg_salary descending
  → Result: Sorted rows

Step 7 — LIMIT:
  Keep only top 10 rows
  → Result: Final output (10 rows max)
```

---

## Window Functions

Window functions perform calculations **across a set of rows related to the current row** without collapsing them into groups (unlike GROUP BY).

### Syntax

```sql
function_name(args) OVER (
    [PARTITION BY column(s)]     -- Divide rows into groups
    [ORDER BY column(s)]         -- Order within each group
    [ROWS/RANGE frame_spec]      -- Limit which rows to include
)
```

### Core Window Functions

**Ranking functions**:

```sql
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank
FROM employees;
```

```
Result:
name    | department | salary | row_num | rank | dense_rank
--------|------------|--------|---------|------|----------
Alice   | Engg       | 90000  |    1    |  1   |    1
Bob     | Engg       | 90000  |    2    |  1   |    1      ← Tie
Carol   | Engg       | 80000  |    3    |  3   |    2      ← RANK skips, DENSE doesn't
Dave    | Sales      | 70000  |    1    |  1   |    1
Eve     | Sales      | 60000  |    2    |  2   |    2
```

| Function | On Ties | Gaps? | Use Case |
|----------|---------|-------|----------|
| `ROW_NUMBER()` | Arbitrary (no ties) | No | Pagination, deduplication |
| `RANK()` | Same rank | Yes (skips next) | "Top N" with ties acknowledged |
| `DENSE_RANK()` | Same rank | No (continuous) | "Top N distinct levels" |

**Aggregate window functions**:

```sql
SELECT
    name,
    department,
    salary,
    SUM(salary)   OVER (PARTITION BY department) AS dept_total,
    AVG(salary)   OVER (PARTITION BY department) AS dept_avg,
    COUNT(*)      OVER (PARTITION BY department) AS dept_count,
    salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_avg
FROM employees;
```

**Offset functions**:

```sql
SELECT
    name,
    salary,
    LAG(salary, 1)  OVER (ORDER BY hire_date) AS prev_salary,   -- Previous row's value
    LEAD(salary, 1) OVER (ORDER BY hire_date) AS next_salary,   -- Next row's value
    FIRST_VALUE(salary) OVER (ORDER BY hire_date) AS first_hired_salary,
    LAST_VALUE(salary)  OVER (ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_hired_salary
FROM employees;
```

**Running totals and moving averages**:

```sql
-- Running total of revenue by date
SELECT
    order_date,
    revenue,
    SUM(revenue) OVER (ORDER BY order_date) AS running_total,
    AVG(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM daily_sales;
```

### Common Interview Window Function Problems

**1. Find the Nth highest salary per department**:
```sql
WITH ranked AS (
    SELECT *, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rk
    FROM employees
)
SELECT * FROM ranked WHERE rk = 3;  -- 3rd highest
```

**2. Remove duplicates (keep latest)**:
```sql
WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
    FROM users
)
DELETE FROM users WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

**3. Year-over-year comparison**:
```sql
SELECT
    year,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY year) AS prev_year_revenue,
    ROUND((revenue - LAG(revenue, 1) OVER (ORDER BY year)) * 100.0
          / LAG(revenue, 1) OVER (ORDER BY year), 2) AS yoy_growth_pct
FROM yearly_sales;
```

---

## Date, Time, and DateTime Functions

Different databases have slightly different syntax. Here are the most common patterns across PostgreSQL, MySQL, and standard SQL.

### Data Types

| Type | What It Stores | Example | Use When |
|------|---------------|---------|----------|
| `DATE` | Year, month, day only | `2025-03-15` | Birthdays, deadlines |
| `TIME` | Hours, minutes, seconds | `14:30:00` | Business hours, schedules |
| `TIMESTAMP` | Date + time | `2025-03-15 14:30:00` | Event logs, created_at |
| `TIMESTAMP WITH TIME ZONE` | Date + time + timezone | `2025-03-15 14:30:00+05:30` | Global apps with users in different zones |
| `INTERVAL` | Duration | `2 hours 30 minutes` | Time arithmetic |

### Essential Functions

**Current date/time**:
```sql
-- Current values
SELECT CURRENT_DATE;                    -- 2025-03-15
SELECT CURRENT_TIME;                    -- 14:30:00
SELECT CURRENT_TIMESTAMP;              -- 2025-03-15 14:30:00
SELECT NOW();                          -- 2025-03-15 14:30:00 (PostgreSQL, MySQL)
```

**Extracting parts**:
```sql
-- PostgreSQL
SELECT EXTRACT(YEAR FROM created_at)  AS year,
       EXTRACT(MONTH FROM created_at) AS month,
       EXTRACT(DOW FROM created_at)   AS day_of_week  -- 0=Sun, 6=Sat
FROM orders;

-- MySQL
SELECT YEAR(created_at), MONTH(created_at), DAYOFWEEK(created_at)
FROM orders;
```

**Date arithmetic**:
```sql
-- PostgreSQL
SELECT created_at + INTERVAL '7 days' AS one_week_later,
       created_at - INTERVAL '1 month' AS one_month_ago,
       AGE(NOW(), created_at) AS time_since_creation
FROM orders;

-- MySQL
SELECT DATE_ADD(created_at, INTERVAL 7 DAY) AS one_week_later,
       DATE_SUB(created_at, INTERVAL 1 MONTH) AS one_month_ago,
       TIMESTAMPDIFF(DAY, created_at, NOW()) AS days_since
FROM orders;
```

**Formatting**:
```sql
-- PostgreSQL
SELECT TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') FROM orders;
SELECT TO_CHAR(created_at, 'Mon DD, YYYY')           FROM orders;  -- 'Mar 15, 2025'

-- MySQL
SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') FROM orders;
SELECT DATE_FORMAT(created_at, '%b %d, %Y')          FROM orders;
```

**Truncation (for grouping by period)**:
```sql
-- PostgreSQL: DATE_TRUNC
SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- MySQL: equivalent
SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS month, COUNT(*)
FROM orders
GROUP BY month
ORDER BY month;
```

### Common Interview Date Problems

**1. Orders in the last 30 days**:
```sql
SELECT * FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

**2. Monthly revenue report**:
```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS revenue,
    COUNT(*) AS order_count
FROM orders
WHERE order_date >= '2024-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
```

**3. Find gaps in dates (days with no orders)**:
```sql
WITH date_series AS (
    SELECT generate_series('2025-01-01'::date, '2025-01-31'::date, '1 day') AS d
)
SELECT d AS missing_date
FROM date_series
LEFT JOIN orders ON DATE(orders.created_at) = d
WHERE orders.id IS NULL;
```

---

## Advanced SQL — HAVING, UNION, JSON Aggregation

### HAVING — The Complete Mental Model

The confusion with HAVING comes from not understanding **when it runs** and **what it has access to**.

```
Execution order reminder:
  1. FROM / JOIN    ← all columns from all tables available
  2. WHERE          ← filter individual ROWS (before grouping)
  3. GROUP BY       ← collapse rows into groups
  4. HAVING         ← filter GROUPS (after grouping)
  5. SELECT         ← compute output columns
  6. ORDER BY
  7. LIMIT
```

**The rule**: HAVING can only reference columns that **survive GROUP BY**. After GROUP BY, individual row values are gone — only the grouping columns and aggregate functions remain.

### What You CAN and CANNOT Put in HAVING

```sql
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_sal
FROM employees
WHERE hire_date > '2020-01-01'     -- ✅ WHERE filters rows BEFORE grouping
GROUP BY department
HAVING COUNT(*) > 5;               -- ✅ Aggregate function on the group
```

| Expression in HAVING | Allowed? | Why |
|---------------------|:--------:|-----|
| `HAVING COUNT(*) > 5` | ✅ Yes | Aggregate function — operates on the group |
| `HAVING AVG(salary) > 50000` | ✅ Yes | Aggregate function |
| `HAVING SUM(amount) > MAX(amount) * 2` | ✅ Yes | Multiple aggregates combined |
| `HAVING department = 'Engineering'` | ✅ Yes | `department` is in GROUP BY — it survived grouping |
| `HAVING name = 'Alice'` | ❌ No | `name` is NOT in GROUP BY — individual row values are gone |
| `HAVING salary > 50000` | ❌ No | `salary` is not grouped — which salary? There are many per group |
| `HAVING emp_count > 5` (alias) | ⚠️ MySQL only | MySQL extension allows aliases in HAVING; standard SQL does not |

**The simple test**: After GROUP BY runs, imagine each group is a single row. Can you point to a single value? If yes → allowed. If the column has many values within the group → you must wrap it in an aggregate (COUNT, SUM, AVG, MIN, MAX).

### HAVING vs WHERE — When to Use Each

```sql
-- "Show departments where the AVERAGE salary > 70K"
-- You CANNOT use WHERE (salary changes per row, you need the average AFTER grouping)

-- ❌ WRONG:
SELECT department, AVG(salary)
FROM employees
WHERE AVG(salary) > 70000     -- ERROR! Can't use aggregate in WHERE
GROUP BY department;

-- ✅ CORRECT:
SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000;   -- HAVING runs after GROUP BY
```

```sql
-- "Show departments with avg salary > 70K, but only consider employees hired after 2020"
-- Use WHERE for row-level filter, HAVING for group-level filter

SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS emp_count
FROM employees
WHERE hire_date > '2020-01-01'     -- Row-level: filter before grouping
GROUP BY department
HAVING AVG(salary) > 70000         -- Group-level: filter after grouping
   AND COUNT(*) >= 3;              -- Group-level: must have 3+ employees
```

### Tricky HAVING Scenarios

```sql
-- Multiple columns in GROUP BY: all of them are available in HAVING
SELECT department, city, COUNT(*) AS cnt
FROM employees
GROUP BY department, city
HAVING department = 'Engineering'    -- ✅ department is in GROUP BY
   AND city != 'Remote'              -- ✅ city is in GROUP BY
   AND COUNT(*) > 2;                 -- ✅ aggregate

-- HAVING with subquery
SELECT department, AVG(salary) AS avg_sal
FROM employees
GROUP BY department
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);  -- Above company average

-- HAVING without GROUP BY (entire table is one group)
SELECT COUNT(*), AVG(salary)
FROM employees
HAVING COUNT(*) > 100;  -- Only returns result if table has 100+ rows
```

---

### UNION and UNION ALL

UNION combines the result sets of two or more SELECT statements.

```
Query 1 result:        Query 2 result:        UNION result:
┌──────┬──────┐        ┌──────┬──────┐        ┌──────┬──────┐
│ id   │ name │        │ id   │ name │        │ id   │ name │
├──────┼──────┤        ├──────┼──────┤        ├──────┼──────┤
│ 1    │ Alice│        │ 2    │ Bob  │        │ 1    │ Alice│
│ 2    │ Bob  │        │ 3    │ Carol│        │ 2    │ Bob  │  ← deduplicated
│ 3    │ Carol│        │ 3    │ Carol│        │ 3    │ Carol│
└──────┴──────┘        └──────┴──────┘        └──────┴──────┘
                                               (5 rows → 3 rows)

UNION ALL keeps ALL rows including duplicates:
                                               ┌──────┬──────┐
                                               │ 1    │ Alice│
                                               │ 2    │ Bob  │
                                               │ 3    │ Carol│
                                               │ 2    │ Bob  │  ← duplicate kept
                                               │ 3    │ Carol│  ← duplicate kept
                                               └──────┴──────┘
                                               (5 rows → 5 rows)
```

**Key Rules**:
```
1. Both queries must have the SAME NUMBER OF COLUMNS
2. Corresponding columns must have COMPATIBLE TYPES
3. Column names come from the FIRST query
4. UNION removes duplicates (requires sorting → slower)
5. UNION ALL keeps duplicates (no sorting → faster)
```

**When to Use Each**:

| Use | When |
|-----|------|
| `UNION` | You need deduplicated results (rare in practice) |
| `UNION ALL` | **Almost always** — faster, and usually duplicates either don't exist or are wanted |

```sql
-- UNION ALL: Combine active and archived orders (no overlap possible)
SELECT id, customer_id, total, 'active' AS source
FROM orders
WHERE status = 'ACTIVE'

UNION ALL

SELECT id, customer_id, total, 'archive' AS source
FROM archived_orders;

-- UNION ALL: Get all events from multiple tables (event sourcing pattern)
SELECT event_id, event_type, created_at FROM order_events
UNION ALL
SELECT event_id, event_type, created_at FROM payment_events
UNION ALL
SELECT event_id, event_type, created_at FROM shipping_events
ORDER BY created_at DESC
LIMIT 100;
```

**UNION with ORDER BY and LIMIT**:
```sql
-- ORDER BY and LIMIT apply to the FINAL combined result
(SELECT name, salary FROM employees WHERE department = 'Engineering')
UNION ALL
(SELECT name, salary FROM employees WHERE department = 'Sales')
ORDER BY salary DESC    -- Sorts the combined result
LIMIT 10;               -- Top 10 across both departments
```

**Common Mistake — UNION when OR would work**:
```sql
-- ❌ Overcomplicated:
SELECT * FROM employees WHERE department = 'Engineering'
UNION
SELECT * FROM employees WHERE department = 'Sales';

-- ✅ Simpler:
SELECT * FROM employees WHERE department IN ('Engineering', 'Sales');

-- UNION is for combining DIFFERENT tables or incompatible queries,
-- not for OR conditions on the same table.
```

---

### JSON Aggregation — json_agg, jsonb_agg, json_build_object

PostgreSQL can build JSON directly in SQL queries. This is powerful for APIs that return JSON — you can shape the response in the database layer.

#### json_agg / jsonb_agg — Aggregate Rows into a JSON Array

```sql
-- Problem: Get each department with an array of its employees
-- Without JSON: Requires application-level grouping after multiple rows
-- With json_agg: Database returns the nested structure directly

SELECT
    d.name AS department,
    json_agg(
        json_build_object(
            'name', e.name,
            'salary', e.salary
        )
    ) AS employees
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.name;
```

```
Result:
department   | employees
─────────────┼──────────────────────────────────────────────────────
Engineering  | [{"name": "Alice", "salary": 90000}, {"name": "Bob", "salary": 85000}]
Sales        | [{"name": "Carol", "salary": 70000}]
```

#### json_agg vs jsonb_agg

| Function | Returns | Preserves Key Order | Duplicate Keys | Use When |
|----------|---------|:-------------------:|:--------------:|----------|
| `json_agg()` | `json` | Yes | Kept | You need exact JSON text preservation |
| `jsonb_agg()` | `jsonb` | No (sorted) | Deduplicated | **Almost always** — more efficient, supports indexing |

**Rule of thumb**: Use `jsonb_agg` unless you have a specific reason to preserve key order.

#### json_build_object — Build JSON Objects

```sql
-- Build a custom JSON object per row
SELECT json_build_object(
    'id', e.id,
    'fullName', e.name,
    'department', d.name,
    'salary', e.salary
) AS employee_json
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- Result per row:
-- {"id": 1, "fullName": "Alice", "department": "Engineering", "salary": 90000}
```

#### Combining json_agg with json_build_object — Nested JSON

```sql
-- API response: Get orders with nested line items (no application-level processing)
SELECT
    json_build_object(
        'order_id', o.id,
        'customer', o.customer_name,
        'total', o.total,
        'items', (
            SELECT json_agg(
                json_build_object(
                    'product', oi.product_name,
                    'quantity', oi.quantity,
                    'price', oi.unit_price
                )
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
        )
    ) AS order_json
FROM orders o
WHERE o.id = 42;
```

```json
{
  "order_id": 42,
  "customer": "Alice",
  "total": 149.97,
  "items": [
    { "product": "Laptop Stand", "quantity": 1, "price": 49.99 },
    { "product": "USB Cable",    "quantity": 2, "price": 9.99 },
    { "product": "Mouse Pad",    "quantity": 1, "price": 19.99 }
  ]
}
```

#### Filtering NULLs from json_agg

```sql
-- Problem: LEFT JOIN produces NULL rows that end up in the JSON array
SELECT
    d.name,
    json_agg(e.name) AS employees    -- [null] if department has no employees
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.name;

-- Fix: Use FILTER to exclude NULLs
SELECT
    d.name,
    json_agg(e.name) FILTER (WHERE e.name IS NOT NULL) AS employees
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.name;
-- Empty departments → employees = NULL (not [null])

-- Alternative: COALESCE to return empty array
SELECT
    d.name,
    COALESCE(
        json_agg(e.name) FILTER (WHERE e.name IS NOT NULL),
        '[]'::json
    ) AS employees
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.name;
-- Empty departments → employees = []
```

#### jsonb_agg with ORDER BY Inside

```sql
-- Control ordering within the aggregated array
SELECT
    department,
    jsonb_agg(
        jsonb_build_object('name', name, 'salary', salary)
        ORDER BY salary DESC    -- ← Highest salary first in the array
    ) AS employees
FROM employees
GROUP BY department;
```

#### Practical Patterns

**Pattern 1: API list endpoint with nested data**:
```sql
-- GET /api/departments (returns departments with employee count and top earner)
SELECT jsonb_agg(
    jsonb_build_object(
        'id', sub.id,
        'name', sub.name,
        'employee_count', sub.cnt,
        'top_earner', sub.top_earner
    ) ORDER BY sub.name
) AS departments
FROM (
    SELECT
        d.id,
        d.name,
        COUNT(e.id) AS cnt,
        MAX(e.name) FILTER (WHERE e.salary = (
            SELECT MAX(salary) FROM employees WHERE dept_id = d.id
        )) AS top_earner
    FROM departments d
    LEFT JOIN employees e ON e.dept_id = d.id
    GROUP BY d.id, d.name
) sub;
```

**Pattern 2: Pivot table using json_agg + CASE**:
```sql
-- Monthly revenue by category (pivot-like)
SELECT
    DATE_TRUNC('month', o.order_date) AS month,
    SUM(CASE WHEN p.category = 'Electronics' THEN oi.total ELSE 0 END) AS electronics,
    SUM(CASE WHEN p.category = 'Clothing' THEN oi.total ELSE 0 END) AS clothing,
    SUM(CASE WHEN p.category = 'Books' THEN oi.total ELSE 0 END) AS books
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY DATE_TRUNC('month', o.order_date)
ORDER BY month;
```

**Pattern 3: Hierarchical data with recursive CTE + json_agg**:
```sql
-- Build a category tree as nested JSON
WITH RECURSIVE category_tree AS (
    -- Base: root categories (no parent)
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive: children
    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
    ct.name,
    ct.depth,
    jsonb_agg(child.name) FILTER (WHERE child.name IS NOT NULL) AS children
FROM category_tree ct
LEFT JOIN category_tree child ON child.parent_id = ct.id
GROUP BY ct.id, ct.name, ct.depth
ORDER BY ct.depth, ct.name;
```

---

## Foreign Keys & Cascading — Deep Dive

### What Foreign Keys Enforce

A foreign key (FK) creates a **parent-child relationship** between two tables. The child table's column must reference an existing value in the parent table.

```sql
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),  -- FK
    total       DECIMAL(10,2)
);

-- This FAILS if customer 999 doesn't exist:
INSERT INTO orders (customer_id, total) VALUES (999, 49.99);
-- ERROR: insert or update on table "orders" violates foreign key constraint
```

### Cascading Actions — ON DELETE / ON UPDATE

When the **parent** row is deleted or updated, what happens to **child** rows?

| Action | ON DELETE Behavior | ON UPDATE Behavior | Use Case |
|--------|-------------------|-------------------|----------|
| **RESTRICT** (default) | Block delete if children exist | Block update if children reference it | Safest — prevents accidental data loss |
| **CASCADE** | Delete all children automatically | Update all children's FK values | Parent owns children completely |
| **SET NULL** | Set FK column to NULL in children | Set FK column to NULL | Child can exist independently |
| **SET DEFAULT** | Set FK to its DEFAULT value | Set FK to its DEFAULT value | Rare — requires meaningful default |
| **NO ACTION** | Same as RESTRICT (checked at end of statement) | Same as RESTRICT | Standard SQL equivalent of RESTRICT |

```sql
-- CASCADE: Deleting a customer deletes ALL their orders
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    total       DECIMAL(10,2)
);

-- SET NULL: Deleting a department sets employees' dept_id to NULL
CREATE TABLE employees (
    id      SERIAL PRIMARY KEY,
    dept_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    name    TEXT NOT NULL
);

-- RESTRICT (default): Can't delete a customer who has orders
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT
);
```

### The Danger of CASCADE — Real-World Horror Stories

```
Scenario: E-commerce database with ON DELETE CASCADE everywhere

  customers ←── orders ←── order_items ←── reviews
                  ↑
              payments

Admin accidentally runs:
  DELETE FROM customers WHERE region = 'test';

What happens:
  ❌ All orders for those customers → DELETED
  ❌ All order_items for those orders → DELETED
  ❌ All reviews for those items → DELETED
  ❌ All payments for those orders → DELETED

  One DELETE cascaded through 4 tables.
  Thousands of records gone in milliseconds.
  No warning. No confirmation.
```

**This is why CASCADE is dangerous in production.**

### When to Use CASCADE vs RESTRICT — Industry Standards

| Scenario | Recommended Action | Why |
|----------|-------------------|-----|
| **User → Session tokens** | CASCADE | Tokens are useless without the user |
| **Order → Order line items** | CASCADE | Line items have no meaning without the order |
| **Blog post → Comments** | CASCADE | Comments belong to the post |
| **Customer → Orders** | RESTRICT | Orders are financial records; don't delete silently |
| **Department → Employees** | SET NULL | Employees exist independently; reassign later |
| **Category → Products** | RESTRICT or SET NULL | Products may need recategorization, not deletion |
| **User → Audit logs** | RESTRICT | Audit trails must never be deleted |
| **Parent company → Subsidiaries** | RESTRICT | Legal/financial records must be preserved |

### Industry Best Practices

```
1. DEFAULT TO RESTRICT
   Most production databases use RESTRICT as the safe default.
   CASCADE should require explicit justification.

2. USE CASCADE ONLY FOR "COMPOSITION" RELATIONSHIPS
   If the child has NO meaning without the parent → CASCADE is appropriate.
   Order → OrderLineItems ✅ (line items are part of the order)
   Customer → Orders ❌ (orders have financial/legal significance)

3. NEVER CASCADE ON FINANCIAL OR AUDIT DATA
   Payments, invoices, audit logs, compliance records
   → ALWAYS use RESTRICT. These are legal documents.

4. SOFT DELETE INSTEAD OF CASCADE
   Many production systems avoid physical deletion entirely:

   ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP;

   -- "Delete" = mark as deleted
   UPDATE customers SET deleted_at = NOW() WHERE id = 42;

   -- Queries filter: WHERE deleted_at IS NULL
   This avoids cascade issues entirely.

5. APPLICATION-LEVEL CASCADING
   Instead of database CASCADE, handle deletion logic in code:

   @Transactional
   public void deleteCustomer(Long customerId) {
       // Archive orders first
       orderService.archiveByCustomer(customerId);
       // Then delete customer
       customerRepository.deleteById(customerId);
   }

   Pros: Full control, can add logging, can archive instead of delete
   Cons: Must ensure all related data is handled (easy to miss)
```

### Common Issues with Foreign Keys

**1. Performance impact on bulk operations**:
```
Every INSERT into a child table requires checking that the parent row exists.
Every DELETE from a parent table requires checking for children.

For bulk imports (ETL, data migration):
  - Temporarily disable FK constraints
  - Load data
  - Re-enable and validate

  -- PostgreSQL
  ALTER TABLE orders DISABLE TRIGGER ALL;
  COPY orders FROM '/tmp/orders.csv' CSV;
  ALTER TABLE orders ENABLE TRIGGER ALL;

⚠️ Only do this for controlled bulk loads, not in normal operation.
```

**2. Circular references**:
```sql
-- ❌ Problem: Two tables reference each other
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES employees(id)  -- Self-reference: OK
);

-- ❌ Harder: Cross-table circular reference
-- Table A references Table B, Table B references Table A
-- Solution: Make one of the FKs nullable, insert in two steps
-- Or use deferred constraints (PostgreSQL):
SET CONSTRAINTS ALL DEFERRED;
```

**3. Orphaned records without FK enforcement**:
```
If you skip FK constraints "for performance":
  - Data becomes inconsistent over time
  - Orders reference non-existent customers
  - JOINs silently return fewer results
  - Debugging becomes a nightmare

Rule: Keep FK constraints in OLTP systems. Only skip in analytics/OLAP where data is loaded in controlled ETL pipelines.
```

---

## Normalization & Denormalization

### Why Normalize? The Problem of Redundancy

```
UNNORMALIZED TABLE — Student Enrollment:
┌─────────┬───────────┬──────────┬────────────┬─────────────────┐
│ student │ student   │ course   │ course     │ instructor      │
│ _id     │ _name     │ _id      │ _name      │                 │
├─────────┼───────────┼──────────┼────────────┼─────────────────┤
│ 1       │ Alice     │ CS101    │ Databases  │ Prof. Smith     │
│ 1       │ Alice     │ CS201    │ Algorithms │ Prof. Jones     │
│ 2       │ Bob       │ CS101    │ Databases  │ Prof. Smith     │
│ 2       │ Bob       │ CS301    │ Networks   │ Prof. Lee       │
│ 3       │ Carol     │ CS101    │ Databases  │ Prof. Smith     │
└─────────┴───────────┴──────────┴────────────┴─────────────────┘

Problems:
❌ Update anomaly: Rename "Databases" → must update EVERY row with CS101
❌ Insert anomaly: Can't add a new course without a student enrolled
❌ Delete anomaly: If Carol drops all courses, we lose the course info too
❌ Storage waste: "Alice", "Databases", "Prof. Smith" stored multiple times
```

### Normal Forms — From 1NF to BCNF

#### First Normal Form (1NF) — Atomic Values

**Rule**: Every cell contains a single value. No repeating groups or arrays.

```
❌ Violates 1NF:
┌─────────┬─────────────────────┐
│ student │ courses             │
├─────────┼─────────────────────┤
│ Alice   │ CS101, CS201        │  ← Multiple values in one cell
│ Bob     │ CS101, CS301        │
└─────────┴─────────────────────┘

✅ 1NF (one fact per cell):
┌─────────┬────────┐
│ student │ course │
├─────────┼────────┤
│ Alice   │ CS101  │
│ Alice   │ CS201  │
│ Bob     │ CS101  │
│ Bob     │ CS301  │
└─────────┴────────┘
```

#### Second Normal Form (2NF) — No Partial Dependencies

**Rule**: 1NF + every non-key column depends on the **entire** primary key (not just part of it).

*Only applies to composite primary keys.*

```
❌ Violates 2NF (composite key: student_id + course_id):
┌────────────┬───────────┬─────────────┬──────────────┐
│ student_id │ course_id │ student_name│ course_name  │
├────────────┼───────────┼─────────────┼──────────────┤
│ 1          │ CS101     │ Alice       │ Databases    │
│ 1          │ CS201     │ Alice       │ Algorithms   │
└────────────┴───────────┴─────────────┴──────────────┘

  student_name depends only on student_id (partial dependency)
  course_name depends only on course_id (partial dependency)

✅ 2NF — Split into 3 tables:
  students(student_id PK, student_name)
  courses(course_id PK, course_name)
  enrollments(student_id FK, course_id FK)  ← composite PK
```

#### Third Normal Form (3NF) — No Transitive Dependencies

**Rule**: 2NF + no non-key column depends on another non-key column.

```
❌ Violates 3NF:
┌────────────┬──────────────┬─────────────────┐
│ course_id  │ course_name  │ instructor      │
│ (PK)       │              │                 │
├────────────┼──────────────┼─────────────────┤
│ CS101      │ Databases    │ Prof. Smith     │

  instructor depends on course_name, not directly on course_id.
  (Transitive: course_id → course_name → instructor)

✅ 3NF — Split:
  courses(course_id PK, course_name, instructor_id FK)
  instructors(instructor_id PK, instructor_name)
```

**The 3NF Shorthand (Bill Kent's definition)**:

> *Every non-key column must depend on "the key, the whole key, and nothing but the key."*

- **The key** → 1NF (has a primary key)
- **The whole key** → 2NF (no partial dependencies)
- **Nothing but the key** → 3NF (no transitive dependencies)

#### Boyce-Codd Normal Form (BCNF) — Stricter 3NF

**Rule**: 3NF + every determinant is a candidate key.

```
❌ 3NF but violates BCNF (rare case):
  Table: student_advisor(student_id, subject, advisor)

  Functional dependencies:
    student_id + subject → advisor
    advisor → subject (each advisor teaches exactly one subject)

  advisor determines subject, but advisor is not a candidate key.

✅ BCNF — Split:
  advisor_subjects(advisor PK, subject)
  student_advisors(student_id, advisor FK)
```

**In practice**: 3NF is sufficient for almost all OLTP systems. BCNF is needed only when you have overlapping candidate keys.

### The Normalization Summary

| Form | Rule | Eliminates |
|------|------|-----------|
| **1NF** | Atomic values, no repeating groups | Multi-valued cells |
| **2NF** | No partial dependency on composite key | Redundancy from composite keys |
| **3NF** | No transitive dependency | Redundancy from indirect dependencies |
| **BCNF** | Every determinant is a candidate key | Remaining anomalies from overlapping keys |

### Denormalization — When and Why

**Denormalization** = intentionally adding redundancy back to reduce JOINs and improve read performance.

| Aspect | Normalization | Denormalization |
|--------|--------------|-----------------|
| **Goal** | Data integrity, minimal redundancy | Read performance, simpler queries |
| **Writes** | Faster (update one place) | Slower (update multiple places) |
| **Reads** | Slower (many JOINs) | Faster (fewer JOINs) |
| **Storage** | Less | More |
| **Best for** | OLTP (many writes, few complex reads) | OLAP/reporting (few writes, many complex reads) |
| **Consistency** | Guaranteed by schema | Application must maintain |

### If Normalization Leads to Complex Queries, Why Still Use It?

This is a common interview question. The answer:

```
1. CORRECTNESS > PERFORMANCE
   Normalization prevents data anomalies.
   A wrong fast answer is worse than a correct slow one.

2. THE DATABASE OPTIMIZER IS SMARTER THAN YOU THINK
   JOINs on indexed foreign keys are fast (O(log n) per join).
   Modern databases handle 5-6 table JOINs efficiently.
   Most "slow JOIN" complaints come from missing indexes, not normalization.

3. DENORMALIZE SELECTIVELY, NOT GLOBALLY
   Keep OLTP tables normalized (source of truth).
   Create denormalized materialized views for reporting.

   CREATE MATERIALIZED VIEW order_summary AS
   SELECT o.id, c.name, SUM(oi.price * oi.quantity) AS total
   FROM orders o
   JOIN customers c ON o.customer_id = c.id
   JOIN order_items oi ON oi.order_id = o.id
   GROUP BY o.id, c.name;

   REFRESH MATERIALIZED VIEW order_summary;  -- Periodic refresh

4. CQRS PATTERN: BEST OF BOTH WORLDS
   Write side: Normalized database (PostgreSQL)
   Read side:  Denormalized read model (Elasticsearch, Redis, materialized view)
   See: [Advanced Data Patterns](../../03-architecture/microservices/06-advanced-data-patterns.md)
```

### Industry Standards for Normalization

```
OLTP Systems (production databases):
  → Normalize to 3NF as a baseline
  → Only denormalize specific tables with measured performance issues
  → Document every denormalization decision and its trade-off

OLAP Systems (data warehouses):
  → Star schema (fact table + dimension tables) = intentionally denormalized
  → Optimized for aggregation queries, not transactional integrity

Microservices:
  → Each service owns its data in normalized form
  → Cross-service "views" may be denormalized (event-sourced projections)
  → See: [Microservices Database Patterns](../../03-architecture/microservices/07-migration-and-database.md)

Rule of Thumb:
  "Normalize until it hurts, denormalize until it works."
  Start normalized. Measure. Denormalize only what profiling proves is slow.
```

---

## Write-Ahead Log (WAL) — Deep Dive

> **Also mentioned in**: [ACID Properties](#acid-properties--deep-dive) — Atomicity and Durability sections

### What Is WAL?

The Write-Ahead Log is the foundation of how relational databases guarantee **durability** and **crash recovery**. The core rule:

> **Before any change is applied to the actual data files, it must first be written to a sequential log on disk.**

```
Without WAL:
  Client: UPDATE balance = 500 WHERE id = 1
  DB: Modifies the data page in memory
  DB: (crash before flushing to disk)
  Result: Change lost forever ❌

With WAL:
  Client: UPDATE balance = 500 WHERE id = 1
  DB: Write change to WAL on disk (sequential, fast)  ✅ Durable
  DB: Return "COMMIT" to client
  DB: Eventually flush dirty data pages to disk (checkpoint)
  DB: (crash before checkpoint? No problem — replay WAL on restart)
  Result: No data loss ✅
```

### How WAL Works — Step by Step

```
┌──────────────────────────────────────────────────────────────┐
│                    WAL Architecture                            │
│                                                               │
│  Client                                                       │
│    │                                                          │
│    ▼                                                          │
│  ┌──────────────────────────────────┐                         │
│  │         Shared Buffer Pool       │  ← In-memory cache      │
│  │  ┌──────┐ ┌──────┐ ┌──────┐     │     of data pages       │
│  │  │Page 1│ │Page 2│ │Page 3│     │                         │
│  │  │dirty │ │clean │ │dirty │     │                         │
│  │  └──────┘ └──────┘ └──────┘     │                         │
│  └──────────────┬───────────────────┘                         │
│                 │                                              │
│       ┌─────────┼─────────┐                                   │
│       ▼                   ▼                                   │
│  ┌──────────┐     ┌──────────────┐                            │
│  │ WAL File │     │  Data Files  │                            │
│  │ (append  │     │  (random     │                            │
│  │  only,   │     │   I/O,       │                            │
│  │  fast)   │     │   slow)      │                            │
│  └──────────┘     └──────────────┘                            │
│       ↑                   ↑                                   │
│  Written FIRST       Written LATER                            │
│  (on every commit)   (at checkpoint)                          │
└──────────────────────────────────────────────────────────────┘
```

**The steps**:

1. **Transaction modifies data** → Changes happen in shared buffer pool (memory)
2. **WAL record created** → A log entry describing the change is written to the WAL buffer
3. **WAL flushed to disk** → On COMMIT, WAL buffer is fsynced to WAL files on disk
4. **Client gets COMMIT confirmation** → Data is now durable (even if crash happens)
5. **Checkpoint** → Periodically, dirty pages are written from buffer pool to data files
6. **WAL recycled** → Old WAL segments (before last checkpoint) can be reused

### Why Sequential Writes Are Fast

```
WAL writes (sequential):          Data file writes (random):
[record1][record2][record3]→      Page 42 ← write here
                                  Page 7  ← then here
Disk head moves in ONE direction  Page 193 ← then here
~100-200 MB/sec on HDD           Disk head jumps around
~500+ MB/sec on SSD               ~1-5 MB/sec on HDD (random I/O)

WAL converts random writes into sequential writes.
This is why databases can commit fast despite writing to disk.
```

### WAL in PostgreSQL — pg_wal

PostgreSQL stores WAL files in the `pg_wal/` directory (formerly `pg_xlog/` before PG 10).

```
$PGDATA/pg_wal/
├── 000000010000000000000001   (16 MB each by default)
├── 000000010000000000000002
├── 000000010000000000000003
└── ...
```

**Key configuration parameters**:

| Parameter | Default | What It Controls |
|-----------|---------|-----------------|
| `wal_level` | `replica` | How much detail is logged (`minimal`, `replica`, `logical`) |
| `max_wal_size` | `1 GB` | Triggers checkpoint when WAL grows beyond this |
| `min_wal_size` | `80 MB` | Minimum WAL files retained |
| `checkpoint_timeout` | `5 min` | Maximum time between checkpoints |
| `wal_compression` | `off` | Compress WAL records to reduce I/O |
| `synchronous_commit` | `on` | Whether COMMIT waits for WAL fsync (off = faster but small data loss window) |

### When Can a User Leverage WAL?

WAL isn't just an internal mechanism. Users can leverage it for:

**1. Point-in-Time Recovery (PITR)**:
```
Scenario: Production database corrupted at 3:15 PM.

With WAL archiving:
  1. Restore last full backup (from 2:00 AM)
  2. Replay WAL files up to 3:14 PM
  3. Database restored to 1 minute before corruption

  -- PostgreSQL recovery.conf (or postgresql.conf in PG 12+)
  restore_command = 'cp /archive/%f %p'
  recovery_target_time = '2025-03-15 15:14:00'

Without WAL archiving:
  Restore last backup (2:00 AM) → Lose 13+ hours of data
```

**2. Streaming Replication**:
```
Primary sends WAL records to standby in real-time.
Standby replays them → stays in sync.

  Primary ──WAL stream──→ Standby (read replica)
                          ──→ Standby 2 (DR copy)

  -- On primary (postgresql.conf)
  wal_level = replica
  max_wal_senders = 3

  -- On standby
  primary_conninfo = 'host=primary port=5432 user=replicator'
```

**3. Logical Replication (CDC — Change Data Capture)**:
```
WAL with wal_level = logical contains enough detail to replicate
individual table changes to other systems.

Use cases:
  - Replicate specific tables to another PostgreSQL instance
  - Feed changes to Kafka (using Debezium connector)
  - Migrate data between PostgreSQL versions with zero downtime

  -- Create a publication (source)
  CREATE PUBLICATION my_pub FOR TABLE orders, customers;

  -- Create a subscription (target)
  CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=source port=5432 dbname=mydb'
  PUBLICATION my_pub;
```

**4. Debugging and Auditing with pg_waldump**:
```bash
# View WAL contents (for debugging)
pg_waldump 000000010000000000000001

# Shows each WAL record: transaction ID, table, operation, data
```

### WAL in Other Databases

| Database | WAL Equivalent | Notes |
|----------|---------------|-------|
| **PostgreSQL** | WAL (pg_wal/) | Segment-based, configurable level |
| **MySQL (InnoDB)** | Redo Log + Binary Log | Redo log = crash recovery; binlog = replication |
| **SQL Server** | Transaction Log (.ldf) | Must manage log file growth manually |
| **Oracle** | Redo Logs + Archive Logs | Online redo logs cycle; archive logs for recovery |
| **MongoDB** | Journal (WiredTiger) | Similar concept — journal before data files |
| **SQLite** | WAL mode (optional) | `-journal_mode=wal` enables WAL for concurrency |

### WAL Trade-offs

```
Advantages:
  ✅ Crash recovery without data loss
  ✅ Enables replication (streaming + logical)
  ✅ Enables point-in-time recovery
  ✅ Faster commits (sequential write vs random write)

Costs:
  ❌ Write amplification (every change written twice: WAL + data files)
  ❌ Disk space for WAL segments (can grow large under heavy write load)
  ❌ Checkpoint I/O spikes (when dirty pages are flushed)
  ❌ Complexity in managing WAL archiving and retention
```

---

## PostgreSQL Schemas

### What Is a Schema in PostgreSQL?

A schema is a **namespace within a database**. It's a logical container that groups tables, views, functions, and other objects.

```
PostgreSQL hierarchy:
  Cluster (server instance)
    └── Database (e.g., "myapp")
          └── Schema (e.g., "public", "billing", "analytics")
                └── Tables, Views, Functions, Types, Sequences
```

**Analogy**: A database is like a building, schemas are like floors. Each floor has its own rooms (tables), but they're all in the same building (database).

### The `public` Schema

Every PostgreSQL database comes with a `public` schema by default.

```sql
-- These two are equivalent:
SELECT * FROM users;
SELECT * FROM public.users;

-- The search_path determines which schema is used when you omit it
SHOW search_path;  -- "$user", public
```

When you create a table without specifying a schema, it goes into `public`:
```sql
CREATE TABLE orders (...);          -- Goes into public.orders
CREATE TABLE billing.invoices (...); -- Goes into billing.invoices
```

### Why Create Additional Schemas?

**1. Multi-Tenancy (SaaS applications)**:
```sql
-- Each tenant gets their own schema with identical tables
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

CREATE TABLE tenant_acme.users (...);
CREATE TABLE tenant_globex.users (...);

-- Application sets search_path per request:
SET search_path TO tenant_acme, public;
-- Now: SELECT * FROM users → reads tenant_acme.users
```

```
Advantages:
  ✅ Tenant data completely isolated (no WHERE tenant_id = ?)
  ✅ Easy per-tenant backup/restore (pg_dump --schema=tenant_acme)
  ✅ Can drop entire tenant: DROP SCHEMA tenant_acme CASCADE;

Limitations:
  ❌ Doesn't scale beyond ~1000 tenants (too many schemas = catalog bloat)
  ❌ Schema migrations must run per tenant
  ❌ Connection pooling is harder (search_path per session)
```

**2. Domain Separation (Bounded Contexts)**:
```sql
-- Organize by business domain
CREATE SCHEMA billing;
CREATE SCHEMA inventory;
CREATE SCHEMA auth;
CREATE SCHEMA analytics;

CREATE TABLE billing.invoices (...);
CREATE TABLE billing.payments (...);
CREATE TABLE inventory.products (...);
CREATE TABLE auth.users (...);
CREATE TABLE analytics.daily_stats (...);
```

```
This maps to DDD bounded contexts within a monolithic database.
Each domain owns its schema. Cross-schema JOINs are still possible
but discouraged (signals a boundary violation).
```

**3. Access Control**:
```sql
-- Grant read-only access to analytics team
GRANT USAGE ON SCHEMA analytics TO analytics_role;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analytics_role;

-- Revoke access to billing data
REVOKE ALL ON SCHEMA billing FROM analytics_role;

-- Result: Analytics team can query analytics.daily_stats
--         but cannot see billing.invoices
```

**4. Organizing Extensions and Utilities**:
```sql
-- Keep extensions out of public
CREATE SCHEMA extensions;
CREATE EXTENSION pg_trgm SCHEMA extensions;
CREATE EXTENSION postgis SCHEMA extensions;

-- Keep utility functions separate
CREATE SCHEMA utils;
CREATE FUNCTION utils.generate_slug(text) RETURNS text ...;
```

### When NOT to Create Schemas

```
❌ Small applications (< 20 tables)
   → public schema is fine. Adding schemas adds complexity.

❌ Each microservice has its own database
   → One schema per database is sufficient.

❌ For "organizing" in a trivial app
   → Don't add schemas just for organizational beauty.
     Tables with clear naming (billing_invoices) work fine.

❌ If your ORM doesn't handle schemas well
   → Some ORMs (older Hibernate versions) struggle with
     multi-schema configurations. Test thoroughly.
```

### Best Practices

```
1. USE "public" FOR SHARED/COMMON OBJECTS
   Shared lookup tables, utility functions, extensions.
   Keep domain-specific tables in domain schemas.

2. SET search_path EXPLICITLY
   Don't rely on defaults. In application configuration:

   -- For Spring Boot (application.yml):
   spring:
     datasource:
       url: jdbc:postgresql://host/mydb?currentSchema=billing

   -- Or per connection:
   SET search_path TO billing, public;

3. NAME SCHEMAS AFTER BUSINESS DOMAINS, NOT TEAMS
   ✅ billing, inventory, auth, analytics
   ❌ team_a, backend, johns_stuff

4. USE SCHEMA-LEVEL GRANTS FOR ACCESS CONTROL
   More maintainable than per-table grants.
   GRANT USAGE ON SCHEMA billing TO app_role;
   GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA billing TO app_role;

5. HANDLE MIGRATIONS PER SCHEMA
   With Flyway or Liquibase, use separate migration folders:
   db/migrations/billing/V1__create_invoices.sql
   db/migrations/inventory/V1__create_products.sql

6. MONITOR SCHEMA BLOAT
   Too many schemas = large system catalog = slower pg_dump, slower planning.
   If using schema-per-tenant, consider sharding beyond ~500 tenants.

7. ALWAYS QUALIFY TABLE NAMES IN COMPLEX QUERIES
   SELECT b.amount, i.name
   FROM billing.invoices b
   JOIN inventory.products i ON b.product_id = i.id;
```

### PostgreSQL Schema vs MySQL Database

A common point of confusion:

| Concept | PostgreSQL | MySQL |
|---------|-----------|-------|
| **Top level** | Cluster | Server |
| **Container for tables** | Database → Schema → Table | Database → Table |
| **Cross-container queries** | Cross-schema JOINs (easy) | Cross-database JOINs (possible but awkward) |
| **Isolation** | Schemas share connections, users, extensions | Each database is more isolated |
| **Equivalent to PG schema** | N/A (MySQL databases are closer to PG schemas) | N/A |

```
PostgreSQL: server → database → schema → table
MySQL:      server → database → table

What PG calls a "schema", MySQL approximates with "database".
This is why MySQL users are confused by PG schemas —
MySQL doesn't have an equivalent concept.
```

---

## Self-Check Questions

Before moving on, can you answer these?

1. When would you choose OLAP over OLTP? Give a real example.
2. What isolation anomaly does READ COMMITTED still allow?
3. What's the difference between a Data Lake and a Data Warehouse?
4. Why can't 10 microservices each open 20 connections to PostgreSQL?
5. What's the Big-O of a B-Tree index lookup vs a full table scan?
6. Why does column order matter in a composite index?
7. What's the SQL execution order, and why can't you use aliases in WHERE?
8. What's the difference between RANK() and DENSE_RANK()?
9. How do you compute a 7-day moving average using window functions?
10. Why should you store timestamps WITH timezone in global applications?
11. When should you use ON DELETE CASCADE vs RESTRICT? Give an example of each.
12. What is 3NF? State the rule in one sentence.
13. If normalization causes complex JOINs, why still use it?
14. What does WAL guarantee, and why is it faster than writing directly to data files?
15. Name 3 things a user can do with PostgreSQL WAL beyond crash recovery.
16. When would you create custom schemas in PostgreSQL instead of using `public`?
17. Can you put `salary > 50000` in HAVING when GROUP BY is on `department`? Why or why not?
18. When should you use UNION ALL instead of UNION?
19. How do you use `json_agg` with `json_build_object` to return nested JSON from a SQL query?
20. What happens with `json_agg` when a LEFT JOIN produces NULL rows? How do you fix it?

<details>
<summary>Answers</summary>

1. OLAP for "What was Q4 revenue by region?" (analytical aggregation over millions of rows). OLTP for "Place this order" (single-row transactional write).
2. Non-repeatable reads and phantom reads. Another transaction can commit changes between your two reads within the same transaction.
3. Data Lake = raw data in any format, schema-on-read, for data scientists. Data Warehouse = structured, cleaned, schema-on-write, for business analysts.
4. 10 services × 20 connections × 3 instances = 600 connections. PostgreSQL default max is 100, and each connection uses ~5-10 MB RAM. Use PgBouncer to multiplex.
5. B-Tree lookup = O(log n). Full table scan = O(n). For 1M rows: ~20 comparisons vs 1M comparisons.
6. Leftmost prefix rule. Index on (A, B, C) can satisfy queries on A, (A,B), or (A,B,C) but NOT queries on B alone or C alone.
7. FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Aliases are created in SELECT, which runs after WHERE, so WHERE can't reference them.
8. Both give same rank to ties. RANK skips next number (1,1,3), DENSE_RANK doesn't (1,1,2).
9. `AVG(value) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`
10. Without timezone, "2025-03-15 14:00" is ambiguous — is that IST, UTC, or EST? Timezone-aware timestamps prevent bugs when users or servers are in different zones.
11. CASCADE for composition relationships (Order → OrderLineItems — items have no meaning without the order). RESTRICT for financial/legal records (Customer → Orders — orders are financial records that must not silently disappear).
12. Every non-key column must depend on "the key, the whole key, and nothing but the key" — no partial dependencies (2NF) and no transitive dependencies (3NF).
13. Because correctness > performance: normalization prevents update/insert/delete anomalies. JOINs on indexed FKs are O(log n) — most "slow JOIN" issues are from missing indexes. Denormalize selectively with materialized views or CQRS.
14. WAL guarantees durability: changes are logged before being applied. It's faster because WAL writes are sequential (append-only) while data file writes are random I/O. Sequential writes are 10-100x faster on spinning disks.
15. Point-in-Time Recovery (PITR), streaming replication to read replicas, and logical replication/CDC (feeding changes to Kafka via Debezium).
16. Multi-tenancy (schema per tenant), domain separation (bounded contexts like billing/inventory/auth), and access control (grant analytics team read-only on specific schemas).
17. No. After GROUP BY on `department`, individual row values like `salary` are gone — there are many salaries per department group. You must wrap it in an aggregate: `HAVING AVG(salary) > 50000` or `HAVING MAX(salary) > 50000`. Only GROUP BY columns and aggregate expressions are allowed in HAVING.
18. Almost always use UNION ALL. UNION removes duplicates which requires sorting (slower). Use UNION ALL when duplicates either can't exist (combining different tables) or are acceptable. Only use UNION when you explicitly need deduplication.
19. `SELECT d.name, json_agg(json_build_object('name', e.name, 'salary', e.salary)) AS employees FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.name;` — `json_build_object` creates a JSON object per row, `json_agg` collects them into an array per group.
20. NULL rows from LEFT JOIN appear as `[null]` in the aggregated array. Fix: use `json_agg(e.name) FILTER (WHERE e.name IS NOT NULL)` to exclude NULLs. Optionally wrap in `COALESCE(..., '[]'::json)` to return an empty array instead of NULL for groups with no matches.

</details>

---

## Navigation

**Prerequisites:**
- [Storage Fundamentals](../../03-architecture/system-design/01-storage-fundamentals.md) — SQL vs NoSQL, ACID vs BASE overview
- [Spring Data Best Practices](../../01-java/02-spring-ecosystem/spring-data/05-best-practices.md) — JPA locking, HikariCP configuration

**Related:**
- [System Design — Performance & Latency](../../03-architecture/system-design/05-performance-latency.md) — Caching, query optimization
- [Kafka Interview Questions](../../03-architecture/messaging/kafka-interview-questions.md) — Messaging patterns
- [Messaging Comparison (SQS vs Kafka vs RabbitMQ)](../messaging/01-messaging-comparison.md) — When to use which queue

**Module Index:** [Learning Roadmap](../../README.md)
