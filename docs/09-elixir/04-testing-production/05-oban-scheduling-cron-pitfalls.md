# Oban: Scheduling, Cron, Code, Pitfalls, Real Scenarios

Oban is a Postgres-backed job processing library for Elixir. It is commonly used for background work, retries, and scheduled jobs in Phoenix applications.

## Core Concepts

- **Jobs** are persisted in Postgres, enabling durability and retries.
- **Queues** control concurrency and isolate job types.
- **Retries** and backoff handle transient failures.
- **Idempotency** and **uniqueness** protect against duplicate processing.
- **Cron** schedules recurring jobs (with Oban Cron).

## Sample Code (Minimal but Realistic)

```elixir
defmodule MyApp.Workers.SendEmail do
  use Oban.Worker, queue: :emails, max_attempts: 10

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    # Call context functions; keep workers thin.
    case MyApp.Accounts.send_welcome_email(user_id) do
      :ok -> :ok
      {:error, :retryable} -> {:error, :retryable}
      {:error, reason} -> {:discard, reason}
    end
  end
end
```

## Cron Scheduling (Conceptual Example)

Use cron for periodic work like cleanup, sync, or notifications. Keep jobs idempotent because cron jobs can overlap or re-run.

```elixir
# config/runtime.exs (conceptual)
config :my_app, Oban,
  repo: MyApp.Repo,
  queues: [default: 10, emails: 20],
  plugins: [
    {Oban.Plugins.Cron,
     crontab: [
       {"0 * * * *", MyApp.Workers.SyncHourly},
       {"0 2 * * *", MyApp.Workers.CleanupNightly}
     ]}
  ]
```

## Common Pitfalls

- **Non-idempotent jobs** that create duplicates under retries or crashes
- **Long transactions** inside jobs that hold DB locks
- **Overloading the DB** by setting queue concurrency too high
- **Hidden coupling**: jobs calling Repo directly and bypassing context invariants
- **Cron overlap**: a job scheduled frequently that sometimes runs longer than its period

## Real-World Scenarios

- Sending emails or push notifications with retry and rate limiting
- Syncing data from external APIs with backoff and circuit breaking
- Processing media (thumbnails) with bounded concurrency
- Periodic cleanup of expired records
- Fan-out work for analytics pipelines (careful with DB pressure)

## Common Questions (With Answers)

1. **Why use Oban instead of spawning Tasks?**
   Oban is durable and retryable. Tasks are in-memory and can be lost on crashes, deploys, or node restarts.

2. **What is the main operational dependency of Oban?**
   Postgres. DB health, indexing, and connection pooling directly affect job throughput and latency.

3. **Why is idempotency critical for Oban jobs?**
   Retries and at-least-once execution mean jobs may run more than once. Idempotency prevents duplicates and invariant violations.

4. **How do queues help?**
   They isolate workloads and let you set concurrency per job type so one noisy workload doesn’t starve others.

5. **What’s a safe pattern for jobs calling domain logic?**
   Jobs should call context APIs and rely on context validations, transactions, and invariants rather than re-implementing business rules.

## Advanced Questions (With Answers)

1. **What’s the most common root cause of Oban-related outages?**
   Postgres overload: too much concurrency, inefficient queries/indexes, long-running transactions, or insufficient connection pool sizing.

2. **How do you design jobs to be safe under retries?**
   Make them idempotent, use uniqueness constraints where appropriate, record progress checkpoints for long jobs, and separate “side effects” from “state changes.”

3. **How do you prevent cron jobs from overlapping?**
   Ensure the job is quick, use uniqueness/locking patterns, or schedule less frequently. Treat overlaps as normal and design idempotently.

4. **How do you handle external API rate limits in jobs?**
   Implement bounded concurrency, backoff, and rate limiting. Avoid hammering external services during retries.

5. **When do you need stronger guarantees than Oban provides?**
   If you require exactly-once semantics across systems. Usually you instead combine at-least-once jobs with idempotent handlers and durable state transitions.

---

## Oban Deep Dive: Retries, Idempotency, Failure

### What happens if an Oban job crashes?

1. The Oban worker process exits with an error.
2. Oban catches the exit and marks the job as `retryable` in Postgres (with incremented attempt count).
3. After a backoff period (exponential by default), the job is picked up again.
4. After `max_attempts`, the job is marked `discarded` — it stops retrying but stays in the DB for inspection.

Return values control fate:
```elixir
def perform(%Oban.Job{}) do
  :ok                          # success — mark completed
  {:ok, result}                # success with result
  {:error, reason}             # retryable error
  {:discard, reason}           # permanent failure — no more retries
  {:snooze, seconds}           # defer for N seconds
end
```

### How do you design jobs to be safe under retries?

Idempotency patterns:

1. **Check before acting**:
   ```elixir
   def perform(%{args: %{"user_id" => user_id}}) do
     unless already_sent?(user_id) do
       send_email(user_id)
       mark_sent(user_id)
     end
     :ok
   end
   ```

2. **Use `unique` constraints**:
   ```elixir
   use Oban.Worker, unique: [keys: [:user_id, :event], period: 300]
   ```
   Prevents duplicate jobs for the same key within a time window.

3. **Upsert instead of insert**: DB operations that are safe to re-run.

4. **Separate state change from side effect**: write to DB first (idempotent), then trigger side effect (email, webhook). On retry, the DB write is a no-op.

### How do you ensure idempotency?

- Side-effecting operations (emails, webhooks, payments) must be protected by a "done" flag in the DB.
- Use DB unique constraints to prevent duplicate records even if the job runs twice.
- External API calls: use idempotency keys when the API supports them (Stripe, etc.).
- Checkpoint progress for multi-step jobs: save which step completed so retry resumes from the checkpoint.

### How do you prevent cron jobs from overlapping?

```elixir
# Use unique to ensure only one instance runs at a time
defmodule MyApp.Workers.HourlySync do
  use Oban.Worker,
    queue: :cron,
    unique: [period: 3600, states: [:available, :executing]]
end
```

With `unique` on `[:executing]` state, a second instance won't be inserted while one is running. Design the job to be fast enough to complete before the next schedule fires, or reduce the schedule frequency.

### How do you handle external API rate limits in jobs?

```elixir
def perform(%Oban.Job{args: args, attempt: attempt}) do
  case ExternalAPI.call(args) do
    {:ok, result} ->
      :ok
    {:error, :rate_limited} ->
      # Snooze based on attempt number (exponential backoff)
      {:snooze, :math.pow(2, attempt) |> round()}
    {:error, reason} ->
      {:error, reason}
  end
end
```

Also: use a dedicated queue with lower `concurrency` for external API workers to cap parallel requests:
```elixir
queues: [external_api: 5]  # max 5 concurrent calls to external API
```

### What's the most common Oban-related outage?

**Postgres overload**:
- Too many concurrent jobs = too many DB connections.
- Jobs with long DB transactions hold connection locks.
- `queue_time` climbs on the primary Ecto pool.
- Other app queries start timing out.

**Fix immediately**: reduce queue `concurrency` to drop DB pressure.
**Fix long-term**: optimize job DB queries, add indexes, separate Oban Repo from app Repo (so job pressure doesn't affect web requests).

```elixir
# Give Oban its own connection pool
config :my_app, Oban,
  repo: MyApp.ObanRepo  # separate pool from MyApp.Repo
```
