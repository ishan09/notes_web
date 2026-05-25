# Ecto and Persistence

Ecto is Elixir's database toolkit. It focuses on explicit schemas, composable queries, and data validation with changesets.

## Core Concepts

- **Schemas** define database-backed structures
- **Changesets** validate and transform incoming data
- **Queries** are composable and expressive
- **Migrations** manage schema changes over time
- **Associations** model relationships between records
- **Transactions** group multiple operations atomically

## Design Notes

- Keep validation in changesets.
- Use queries as data structures, not ad hoc SQL strings.
- Be explicit about associations and preload behavior.
- Prefer `Repo.transaction/1` for atomic workflows, and use `Ecto.Multi` for multi-step transactions with clear sequencing.

## Schema — Defining Data Shape

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name, :string
    field :email, :string
    field :age, :integer
    field :role, Ecto.Enum, values: [:user, :admin], default: :user
    field :active, :boolean, default: true
    field :password, :string, virtual: true   # not stored in DB
    field :hashed_password, :string

    has_many :posts, MyApp.Blog.Post
    belongs_to :company, MyApp.Company

    timestamps()  # adds inserted_at, updated_at
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email, :age, :role])    # whitelist accepted fields
    |> validate_required([:name, :email])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_format(:email, ~r/@/)
    |> validate_inclusion(:role, [:user, :admin])
    |> validate_number(:age, greater_than: 0, less_than: 150)
    |> unique_constraint(:email)                     # maps to DB unique index
    |> foreign_key_constraint(:company_id)
  end
end
```

## Migrations

```elixir
defmodule MyApp.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users) do
      add :name,            :string, null: false
      add :email,           :string, null: false
      add :hashed_password, :string
      add :role,            :string, default: "user"
      add :active,          :boolean, default: true, null: false
      add :company_id,      references(:companies, on_delete: :nilify_all)
      timestamps()
    end

    create unique_index(:users, [:email])
    create index(:users, [:company_id])
  end
end
```

## Repo — All Database Operations Go Through Here

```elixir
alias MyApp.Repo
alias MyApp.Accounts.User

# Insert
{:ok, user} = Repo.insert(User.changeset(%User{}, %{name: "Alice", email: "a@x.com"}))
# or: Repo.insert!(changeset)  — raises on error

# Update
{:ok, updated} = Repo.update(User.changeset(user, %{name: "Alice B."}))

# Delete
{:ok, deleted} = Repo.delete(user)

# Get by primary key — returns nil if not found
user = Repo.get(User, 42)

# Get by primary key — raises if not found
user = Repo.get!(User, 42)

# Get by field(s)
user = Repo.get_by(User, email: "alice@example.com")

# Fetch all
users = Repo.all(User)
```

## Queries — Composable Data Structures

```elixir
import Ecto.Query

# Basic query
from(u in User, where: u.active == true)
|> Repo.all()

# Pipe-style composition (more flexible for building queries dynamically)
User
|> where([u], u.active == true)
|> where([u], u.role == :admin)
|> order_by([u], asc: u.name)
|> limit(10)
|> Repo.all()

# Select specific fields (returns maps)
User
|> select([u], %{id: u.id, email: u.email})
|> Repo.all()

# Count
Repo.aggregate(User, :count)
Repo.aggregate(from(u in User, where: u.active == true), :count)

# Preload associations
users = Repo.all(User) |> Repo.preload(:posts)
# Or in the query (single DB call with JOIN)
User |> preload(:posts) |> Repo.all()

# Dynamic where clauses
def list_users(opts \\ []) do
  Enum.reduce(opts, User, fn
    {:role, role}, q -> where(q, [u], u.role == ^role)
    {:active, active}, q -> where(q, [u], u.active == ^active)
    {:search, term}, q -> where(q, [u], ilike(u.name, ^"%#{term}%"))
    _, q -> q
  end)
  |> Repo.all()
end

# Joins
from u in User,
  join: c in assoc(u, :company),
  where: c.name == "Acme",
  select: u
|> Repo.all()
```

## Changeset — Validation Pipeline

```elixir
# Changesets are data — you can inspect them
changeset = User.changeset(%User{}, %{name: "", email: "bad"})

changeset.valid?     # false
changeset.errors
# [name: {"can't be blank", [validation: :required]},
#  email: {"has invalid format", [validation: :format]}]

# Traverse errors into a flat map (used in controllers/views)
Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
  Enum.reduce(opts, msg, fn {k, v}, acc -> String.replace(acc, "%{#{k}}", to_string(v)) end)
end)
# %{name: ["can't be blank"], email: ["has invalid format"]}
```

## Example: Transaction with Ecto.Multi

```elixir
multi =
  Ecto.Multi.new()
  |> Ecto.Multi.insert(:user, User.changeset(%User{}, params))
  |> Ecto.Multi.insert(:audit, fn %{user: user} ->
    Audit.changeset(%Audit{}, %{action: "user_created", user_id: user.id})
  end)

Repo.transaction(multi)
```

## Common Questions (With Answers)

1. **What is Ecto?**
   Ecto is Elixir’s database toolkit. Unlike ActiveRecord, it is not an ORM — it separates schema (data shape), changesets (validation), queries (data fetching), and Repo (DB execution) into explicit, composable pieces.

2. **Difference between schema and migration?**
   A **schema** defines the shape of data in Elixir — struct fields, types, associations. A **migration** is a versioned DB change file that alters the actual database structure. They are independent: the schema reflects what your Elixir code works with; migrations manage what the DB contains.

3. **How does Repo work?**
   `Repo` is the module that wraps the DB connection pool. All database operations (`insert`, `get`, `all`, `update`, `delete`) go through `Repo`. It wraps Ecto’s adapters (Postgrex for Postgres, etc.) and handles connection checkout from the pool.

4. **Why are changesets important?**
   They centralize validation, casting, and constraints so data entering your system is consistently checked.

5. **How does Ecto encourage composable queries?**
   Queries are data structures that can be built in steps and combined, making them reusable and testable.

6. **When should you preload associations?**
   When you know you’ll need associated data and want to avoid N+1 queries. Preload intentionally to control performance.

7. **Why use `Repo.transaction/1`?**
   It ensures multiple DB operations succeed or fail together, protecting invariants.

8. **What is `Ecto.Multi` good for?**
   It defines multiple operations with dependencies and runs them atomically with clear, inspectable results.

## Advanced Questions (With Answers)

1. **How does connection pooling work?**
   Ecto uses `DBConnection` with a pool (default: `DBConnection.ConnectionPool`). On app start, Repo opens N connections (configured via `pool_size`). Each `Repo` call checks out a connection from the pool, executes the query, and returns it. This avoids the overhead of opening a new DB connection per request.

2. **What happens when the pool is exhausted?**
   New calls queue up waiting for a connection. If no connection becomes available within the `queue_timeout` (default 5 seconds), the call raises `DBConnection.ConnectionError`. This surfaces as a 500 in a web request if not handled. Under sustained load, pool exhaustion is usually a sign of slow queries or a pool_size that’s too small for the concurrency.

3. **What’s a common mistake with transactions in web requests?**
   Doing long-running external calls inside the transaction, holding DB locks and increasing contention. Keep transactions short.

4. **How do you handle “uniqueness” correctly?**
   Use a DB unique index and handle constraint errors in the changeset. Don’t rely only on application-level checks.

5. **What’s the N+1 problem and how does Ecto help?**
   Fetching associations per row causes many queries. Use `preload` and well-structured queries to fetch related data efficiently.

6. **What’s a pitfall with `Repo.preload` everywhere?**
   You can accidentally load huge graphs. Prefer explicit preloads per use case and measure query impact.

7. **How do you model multi-step invariants safely?**
   Use constraints and transactions (`Ecto.Multi`) so the DB enforces invariants even under concurrency.

---

## Ecto Pooling & DB Pressure

### How does Ecto connection pooling work?

Ecto uses `DBConnection` with a pool. On application start, `Repo` opens `pool_size` connections to the DB. Each call to `Repo.all`, `Repo.insert`, etc. checks out a connection, executes the query, and returns the connection to the pool.

```
Request 1 ──► checkout connection ──► query ──► return connection
Request 2 ──► checkout connection ──► query ──► return connection
Request 3 ──► (pool empty) ──► queue ──► wait for available connection
```

Configuration:
```elixir
config :my_app, MyApp.Repo,
  pool_size: 10,           # number of open DB connections
  queue_target: 50,        # target queue time in ms
  queue_interval: 1000     # interval to check queue time
```

### What is `queue_time`?

`queue_time` is the time a caller spends waiting for a connection to become available from the pool. Phoenix/Ecto telemetry emits `[:my_app, :repo, :query]` events that include `queue_time` alongside `query_time`. Rising `queue_time` is the first signal of pool pressure.

### What happens when the pool is exhausted?

1. New `Repo` calls queue up waiting for a connection.
2. After `queue_target` ms, DBConnection adapts (logs warnings).
3. After `queue_timeout` ms (default 5000ms), the call raises `DBConnection.ConnectionError`.
4. In a web request, this surfaces as a 500 error.
5. Under sustained load: all requests timeout, the queue grows, the system enters a degraded loop.

**Immediate mitigation**: reduce query volume, cancel in-flight slow queries, temporarily reject non-critical traffic.

**Long-term fix**: tune `pool_size` to match DB capacity, optimize slow queries, add read replicas, reduce query frequency with caching.

### How does DBConnection manage checkout?

DBConnection maintains a pool of connection processes. On checkout:
1. If a connection is available, it's handed to the caller immediately.
2. If not, the caller's process waits in a queue (a `receive` with timeout).
3. When a connection is returned (after query completion or on error), it's given to the next waiter.
4. If the connection itself crashes (DB disconnect), DBConnection replaces it with a new one automatically.

### How do you tune pool size?

`pool_size` should match your DB's `max_connections` divided by number of app nodes:

```
DB max_connections = 100
App nodes = 5
Per-node pool_size = 100 / 5 = 20
```

Don't set `pool_size` higher than the DB can handle — excess connections queue at the DB level, adding latency. Monitor `queue_time` to detect pressure before it causes errors.

### How to detect DB bottlenecks in production?

```elixir
# Telemetry handler for Ecto query events
defmodule MyApp.DBMonitor do
  def handle_event([:my_app, :repo, :query], measurements, _meta, _config) do
    queue_ms = System.convert_time_unit(measurements.queue_time, :native, :millisecond)
    query_ms = System.convert_time_unit(measurements.query_time, :native, :millisecond)
    # Emit to metrics system
    :telemetry.execute([:db, :query], %{queue_ms: queue_ms, query_ms: query_ms})
  end
end
```

Key signals:
- **High `queue_time`**: pool exhaustion — too many concurrent queries or pool_size too small.
- **High `query_time`**: slow queries — check indexes, N+1 patterns, large result sets.
- **Rising error rates**: `DBConnection.ConnectionError` — immediate pool problem.
- **Phoenix LiveDashboard**: shows Ecto query metrics and connection pool stats in real time.

### How do Ecto and read replicas work?

Ecto supports multiple Repos. Create a separate `Repo` configured to point to a read replica:

```elixir
defmodule MyApp.ReadonlyRepo do
  use Ecto.Repo,
    otp_app: :my_app,
    adapter: Ecto.Adapters.Postgres,
    read_only: true
end
```

Use `ReadonlyRepo` for queries that can tolerate replication lag (read-heavy lists, reporting). Use the primary `Repo` for writes and reads that need consistency. This reduces primary DB load and scales read throughput.
