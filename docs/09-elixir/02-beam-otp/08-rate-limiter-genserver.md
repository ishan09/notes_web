# Designing a Rate Limiter with GenServer (Demo to Production Grade)

Rate limiting is a systems feature, not a “one function” feature. The hard parts are concurrency, fairness, correctness under load, and operational behavior during partial failures.

## Interview Framing (What To Clarify First)

Before you propose an algorithm, ask questions that change the design:

- **What are we limiting?** Inbound API calls, login attempts, outbound calls, expensive endpoints, background jobs?
- **Key and fairness**: per tenant, per API key, per user, per IP, per endpoint?
- **Semantics**: strict deny vs degrade vs queue; is burst allowed?
- **Scope**: per-node ok, or must be global across nodes/regions?
- **Threat model**: abuse resistance (credential stuffing) vs operational resilience (dependency protection)?
- **Client UX**: do we need `Retry-After`, `RateLimit-*` style headers, and clear error bodies?

Good answers sound like: “The algorithm is the easy part; the keying, semantics, and failure modes decide the design.”

## Why Rate Limiting Is Required

Rate limiting protects:

- **Your service**: prevents overload, tail-latency collapse, and cascading failures.
- **Downstream dependencies**: DB, caches, third-party APIs (often the real bottleneck).
- **Fairness**: one noisy tenant/user/IP should not starve others.
- **Cost and abuse**: reduces brute force attempts, scraping, and accidental hot loops.

Common use cases:

- API quotas: `N requests / minute` per user or API key.
- Login / OTP / password reset: strict per-identity limits to prevent abuse.
- Expensive endpoints: protect CPU-heavy or fan-out paths.
- Outbound calls: throttle to respect third-party rate limits.

## What “Good” Looks Like (Senior Checklist)

Before you pick code, decide these requirements explicitly:

- **Scope**: per user, per API key, per IP, per endpoint, per tenant, per organization.
- **Semantics**: strict (hard deny) vs soft (degrade/queue), and whether burst is allowed.
- **Correctness**: per-node acceptable, or must be global across nodes/regions.
- **Latency budget**: limiter check must be fast, predictable, and never become the bottleneck.
- **Cardinality bound**: what happens when keys explode (botnet IPs, unique tokens)?
- **Failure mode**: fail-open or fail-closed if the limiter backend is down?
- **Observability**: allow/deny rate, top denied keys, p99 limiter latency, backlog indicators.

## Step 0: Pick the Algorithm (Before Code)

You implement different algorithms depending on requirements:

- **Fixed window**: simplest (`N per 60s`). Can burst at window boundaries.
- **Sliding window**: more accurate, more state/compute.
- **Token bucket / leaky bucket**: smoother traffic shaping; common for “steady rate with bursts”.

In this note we start with fixed window for clarity, then show what must change to become production grade.

## Quick Algorithm Tradeoffs (What Interviewers Expect)

Fixed window:

- Pro: simplest, cheap state.
- Con: boundary burst (clients can do `N` at `t=59s` and `N` at `t=60s`).

Sliding window:

- Pro: more accurate “N per last 60 seconds”.
- Con: more compute/state (buckets, logs, or approximations).

Token bucket:

- Pro: smooth rate, allows controlled burst, good for outbound throttling.
- Con: needs careful time math and atomic updates.

## Step 1: Demo-Grade Fixed Window (Single Global Counter)

This is intentionally naive: it limits *the entire system* rather than per key.

```elixir
defmodule MyApp.RateLimiter.Demo do
  use GenServer

  # Allow `limit` events per `window_ms`.
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def allow?() do
    GenServer.call(__MODULE__, :allow?)
  end

  @impl GenServer
  def init(opts) do
    window_ms = Keyword.fetch!(opts, :window_ms)
    limit = Keyword.fetch!(opts, :limit)
    state = %{window_ms: window_ms, limit: limit, count: 0, window_start: now_ms()}
    {:ok, state}
  end

  @impl GenServer
  def handle_call(:allow?, _from, state) do
    {state, allowed?} = check_and_update(state)
    {:reply, allowed?, state}
  end

  defp check_and_update(state) do
    now = now_ms()

    state =
      if now - state.window_start >= state.window_ms do
        %{state | window_start: now, count: 0}
      else
        state
      end

    if state.count < state.limit do
      {%{state | count: state.count + 1}, true}
    else
      {state, false}
    end
  end

  defp now_ms, do: System.monotonic_time(:millisecond)
end
```

### Why This Is Not Production-Grade

- **Single bottleneck**: every request serializes through one GenServer.
- **Not fair**: global, not per user/IP/tenant.
- **No telemetry**: you can’t see when/why it denies.
- **No backpressure strategy**: callers can keep hammering.

## Step 2: Per-Key Fixed Window (Still a Single GenServer)

Now you do what rate limiting usually means: per key (user, API key, IP).

Design change needed:

- Demo state is a single counter. Production needs **a map keyed by identity**, with eviction.

Sketch:

- State: `%{key => %{window_start, count}}`
- Input: `allow?(key)`
- Add: TTL eviction so the map doesn’t grow forever.

Why this change is necessary:

- Without per-key state, you can’t enforce fairness.
- Without eviction, you leak memory under cardinality growth (botnets, unique IPs, unique tokens).

### A Simple Per-Key Implementation (Still Demo-ish)

This works for low throughput and modest key counts. It will fall over under heavy load or high cardinality without the next steps.

```elixir
defmodule MyApp.RateLimiter.PerKey do
  use GenServer

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  def allow?(key), do: GenServer.call(__MODULE__, {:allow?, key})

  @impl GenServer
  def init(opts) do
    {:ok,
     %{
       window_ms: Keyword.fetch!(opts, :window_ms),
       limit: Keyword.fetch!(opts, :limit),
       ttl_ms: Keyword.get(opts, :ttl_ms, 5 * Keyword.fetch!(opts, :window_ms)),
       buckets: %{}
     }}
  end

  @impl GenServer
  def handle_call({:allow?, key}, _from, state) do
    now = now_ms()
    {bucket, buckets} = Map.pop(state.buckets, key, %{window_start: now, count: 0, last_seen: now})
    bucket = rollover(bucket, now, state.window_ms)

    {allowed?, bucket} =
      if bucket.count < state.limit do
        {true, %{bucket | count: bucket.count + 1, last_seen: now}}
      else
        {false, %{bucket | last_seen: now}}
      end

    buckets = Map.put(buckets, key, bucket)
    buckets = evict_old(buckets, now, state.ttl_ms)

    {:reply, allowed?, %{state | buckets: buckets}}
  end

  defp rollover(bucket, now, window_ms) do
    if now - bucket.window_start >= window_ms do
      %{bucket | window_start: now, count: 0}
    else
      bucket
    end
  end

  defp evict_old(buckets, now, ttl_ms) do
    # This is O(n). In production you avoid full scans on hot paths.
    buckets
    |> Enum.reject(fn {_k, v} -> now - v.last_seen > ttl_ms end)
    |> Map.new()
  end

  defp now_ms, do: System.monotonic_time(:millisecond)
end
```

Why you will change this in production:

- eviction is O(n) and runs in the hot path
- state is a growing map on the GenServer heap (GC cost)
- one process still serializes everything

## Step 3: Avoid the “One GenServer” Bottleneck (Sharding)

Design change needed:

- A single GenServer will become a throughput ceiling and a tail-latency amplifier.

Approach:

- Create `N` limiter shards: `RateLimiter.Shard0..ShardN`.
- Route `key` to a shard via consistent hashing, for example `:erlang.phash2(key, shard_count)`.

Why this is necessary:

- It spreads load across schedulers and reduces mailbox pressure.
- It reduces contention from synchronized `call`s.

### Sharding Sketch

Keep the public API stable and route keys internally:

```elixir
defmodule MyApp.RateLimiter do
  @shards 16

  def allow?(key) do
    shard = :erlang.phash2(key, @shards)
    GenServer.call(via_name(shard), {:allow?, key})
  end

  defp via_name(shard), do: {:via, Registry, {MyApp.RateLimiter.Registry, shard}}
end
```

Why a Registry:

- stable naming per shard
- avoids global module name collisions
- easier to supervise and inspect

## Step 4: Reduce State Copying and GC Pressure (ETS)

Design change needed:

- GenServer state is copied on each message handling step. Large maps increase per-process GC and latency spikes.

Approach:

- Store counters in ETS (per shard) and keep GenServer state small (table name + config).
- ETS gives fast access, but you must decide:
  - Consistency tradeoffs (atomic update primitives)
  - Ownership (which process owns the table)
  - Expiry strategy (cleanup interval, TTL encoding)

Why this is necessary:

- ETS moves the “big state” out of the GenServer heap, reducing GC latency.
- It helps high-cardinality keys and high throughput patterns.

### ETS Counter Pattern (Atomic Updates)

At high throughput, you want:

- O(1) update
- atomic increment
- bounded cleanup

One common pattern is storing `{key, window_start_ms, count}` and using `:ets.update_counter/4` for atomic increments.

Conceptual outline (not a full library):

```elixir
# Table entries:
# {key, window_start_ms, count}
#
# You must reset counts when a window rolls, which requires checking time.
# Some implementations encode the window into the key: {key, window_id}
```

Why designs change here:

- fixed window can be encoded as `window_id = div(now_ms, window_ms)` so rollover is implicit
- you can avoid per-entry time comparisons on every call

Window-id approach sketch:

```elixir
window_id = div(now_ms(), window_ms)
ets_key = {key, window_id}
new_count = :ets.update_counter(table, ets_key, {2, 1}, {ets_key, 0})
allowed? = new_count <= limit
```

Cleanup strategy:

- periodically delete entries from older window_ids
- keep a bounded number of windows (for example current and previous)
- do cleanup on a timer, not on every request

## Step 5: Multi-Node Production Reality (Distributed Pitfalls)

Design change needed:

- If you run multiple nodes, a local in-memory limiter becomes **per-node**, which may violate your global limit.

Options:

1. **Accept per-node limits** and set per-node quotas (common, pragmatic).
2. Use a **shared external store** (Redis, Postgres) for global limits.
3. Use a **service-level token bucket** in a dedicated gateway (Envoy/Nginx/API gateway).

Why this is necessary:

- Cross-node coordination is hard under partitions. Don’t accidentally build a “global singleton” without partition-aware design.

### Fail-Open vs Fail-Closed (Be Explicit)

- **Fail-open**: if backend is down, allow traffic. Preserves availability but risks overload.
- **Fail-closed**: if backend is down, deny traffic. Protects dependencies but can cause self-inflicted outage.

Most production systems do:

- fail-open for “non-critical” limits (nice-to-have fairness)
- fail-closed for “abuse/security” limits (login, OTP)

## Operational Details (What Seniors Get Asked)

- **Time source**: use monotonic time for intervals. Wall clock changes (NTP, leap seconds) can break window logic.
- **Denied behavior**: return `429`, or enqueue, or degrade. Pick one explicitly.
- **Burst vs smoothness**: fixed windows allow boundary bursts; token bucket smooths.
- **Cardinality controls**: limit by API key for authenticated clients; be cautious with IP-based keys behind NAT.
- **Observability**: measure allow/deny rates, p99 latency on limiter calls, top keys denied, and mailbox/queue length for limiter processes.

## Returning the Right Information (Remaining, Reset, Retry-After)

In production, `true/false` is rarely enough. Callers and clients usually need:

- `limit`: configured limit
- `remaining`: how many requests are left in the window/bucket
- `reset_ms`: when the window resets (or when tokens refill)
- `retry_after_ms`: what to tell clients (maps to HTTP `Retry-After`)

Why this is necessary:

- Clients can back off instead of hammering.
- Your gateway can enforce consistent semantics across endpoints.
- You can debug and support customers with a clear “why you were throttled” story.

For fixed window with `window_id = div(now_ms, window_ms)`:

- `reset_at_ms = (window_id + 1) * window_ms`
- `retry_after_ms = max(reset_at_ms - now_ms, 0)`

For token bucket:

- `retry_after_ms` is “time until 1 token is available”, derived from refill rate and current token deficit.

## Layered Rate Limiting (Global, Tenant, User, Endpoint)

Staff-level reality: you rarely have one limiter.

Typical layers:

- **Global safety valve**: protect the entire service under unexpected surges.
- **Per-tenant budget**: enforce fairness across customers.
- **Per-user/API key**: prevent one identity from saturating the tenant budget.
- **Expensive endpoint**: protect CPU-heavy or fan-out routes.

Why layered limits are necessary:

- Endpoint-only keys are easy to bypass (abuser fans out across endpoints).
- Per-user only can still overload shared dependencies (DB, caches) at tenant scale.
- Per-tenant only can starve individual users within the tenant.

Design consequence:

- Your limiter API often needs to check multiple keys and return the “most restrictive” denial with a single retry-after.

## Key Design Pitfalls (Security and Fairness)

- **IP limits**:
  - NAT can create false positives (many users share one IP).
  - `X-Forwarded-For` is not trustworthy unless you control the proxy boundary.
  - Prefer authenticated keys when possible; treat IP as a coarse safety valve.

- **Key cardinality**:
  - Never key on raw user input that can explode uniqueness (random strings, request IDs).
  - Normalize keys and cap key length.

- **Multi-dimensional keys**:
  - Use structured keys like `tenant:123|user:456|endpoint:login` rather than ad hoc concatenation.

## ETS Tuning Details (Not Optional at Scale)

If you go ETS, you should know these knobs:

- table type: `:set` is common for counters
- concurrency flags: `read_concurrency: true`, `write_concurrency: true` (use with measurement)
- ownership: what happens to your counters when the owning process crashes and restarts?

Cleanup patterns:

- timer-based cleanup, not per-request cleanup
- delete by window_id (for example via `:ets.select_delete/2` on old window ids)
- keep only a bounded number of windows (current + previous)

Why it matters:

- wrong ETS settings show up as lock contention and p99 spikes
- cleanup mistakes show up as slow memory growth and “mystery leaks”

## Global Limits (Atomicity and Latency Tradeoffs)

If you need a true global limit across nodes, you need an external coordinator/store, and you must do the increment+check atomically.

Tradeoffs:

- higher latency per check (network round trip)
- limiter dependency availability becomes part of your availability story
- you must choose fail-open vs fail-closed explicitly

## Integration in a Phoenix App (Practical)

Common integration points:

- **Plug** at router pipeline for per-route/per-scope limits.
- **Context boundary** for outbound calls (protect third-party).
- **Oban worker** boundaries to avoid job storms.

Minimal “shape” (conceptual):

```elixir
if MyApp.RateLimiter.allow?("user:#{user_id}") do
  # proceed
else
  # return 429 with Retry-After suggestion if you have it
end
```

Why you sometimes move from per-endpoint to per-tenant:

- endpoint-based keys are easy to bypass (abuser can hit multiple endpoints)
- tenant-based budgets reflect real capacity allocation

## Observability and Alerts (What You Monitor in Production)

Metrics to instrument (minimum viable):

- `rate_limiter.allow.count` and `rate_limiter.deny.count` tagged by limiter type (user/tenant/ip/outbound) and endpoint group
- `rate_limiter.check.duration_ms` p50/p95/p99 (and timeouts if you enforce them)
- `rate_limiter.unique_keys.per_window` (early warning for cardinality explosions)
- For GenServer/shards: message queue length, reductions, heap size, GC count/time (top-N offenders)
- Downstream correlation: DB pool saturation, external API latency/error rate

Alerting patterns:

- Sudden spikes in denies for “normal endpoints” can indicate mis-keying or a client rollout issue.
- Rising p99 limiter latency usually means limiter is becoming the bottleneck (single shard hot key, ETS contention, external store slowness).
- Rising unique key count is often an abuse signal or a proxy misconfiguration.

## Production Safety Knobs (Escape Hatches)

Staff-level expectation: you build knobs to recover fast during incidents.

- Feature flag to disable non-critical limits (fail-open mode) while you stabilize dependencies.
- Per-tenant overrides for known large customers during onboarding or migrations.
- Admin bypass for internal tools (with auditing).
- Separate queues/budgets for critical endpoints (login) vs best-effort endpoints (search suggestions).

## Hammer (Library): What It Is and How To Use It

Hammer is a popular Elixir rate limiting library. The key value it provides is a battle-tested implementation and backend options (commonly ETS and/or external stores depending on configuration).

Typical usage pattern:

- Choose a key: `"api:#{api_key}"`, `"ip:#{ip}"`, `"user:#{user_id}"`
- Call a function to check a rate: `limit` within `window_ms`
- Branch on allow vs deny

Example (conceptual, keep your wrapper API stable and version-agnostic):

```elixir
defmodule MyApp.RateLimiter do
  # The exact return shape depends on Hammer version/backend,
  # so wrap it and keep callers insulated from library details.
  def allow?(key, window_ms, limit) do
    case Hammer.check_rate(key, window_ms, limit) do
      {:allow, _count} -> true
      {:deny, _count} -> false
    end
  end
end
```

Why wrap Hammer instead of calling it everywhere:

- Lets you change algorithms/backends without touching call sites.
- Lets you standardize metrics, logging, and HTTP response mapping.
- Lets you add “escape hatches” (disable limiter, per-tenant overrides, admin bypass).

### Using Hammer from a Phoenix Plug (Conceptual)

Keep the web boundary thin and centralize policy:

```elixir
defmodule MyAppWeb.Plugs.RateLimit do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, opts) do
    window_ms = Keyword.fetch!(opts, :window_ms)
    limit = Keyword.fetch!(opts, :limit)

    # In real systems, prefer API keys/tenant IDs over IP-only.
    key = "ip:" <> (conn.remote_ip |> :inet.ntoa() |> to_string())

    if MyApp.RateLimiter.allow?(key, window_ms, limit) do
      conn
    else
      conn
      |> put_status(429)
      |> halt()
    end
  end
end
```

Why this separation is necessary:

- Plug: HTTP mapping and response semantics.
- Limiter module: mechanics + metrics + policy knobs.
- Swapping implementations (Hammer vs ETS vs GenServer) does not change routing code.

Pitfalls to watch with any library:

- **Per-node vs global semantics** (depends on backend).
- **Key cardinality** and memory growth.
- **Clock semantics** and window accuracy.
- **Hot keys** that concentrate load and become bottlenecks.

### Hammer in Production: What You Still Own

Even if Hammer solves the mechanics, you still need:

- key design (fairness and cardinality)
- semantics (per-node vs global, fail-open/closed)
- observability (metrics, logs, alerting)
- safe defaults and escape hatches (disable limiter, per-tenant overrides)

## Common Questions (With Answers)

1. **Why use a GenServer for a rate limiter at all?**
   You get a single owner of state with serialized updates, predictable behavior under concurrency, and straightforward supervision. It’s the simplest correct starting point on BEAM.

2. **Why does the demo version fail under load?**
   It creates a single hot mailbox. `GenServer.call` becomes your p99. Under load, latency grows, callers time out, and retries amplify the surge (classic positive feedback loop).

3. **Why do you need per-key limits?**
   Fairness and containment. Per-key limits ensure one identity can’t starve the system. Global-only limits are a blunt instrument and often punish healthy traffic.

4. **What’s the biggest “gotcha” in distributed deployments?**
   Semantics drift. A local limiter is per-node, so “100 req/s” becomes “100 req/s per node” unless you coordinate globally. Many incidents are caused by assuming global limits while actually running per-node.

5. **Why do people use token bucket instead of fixed window?**
   It shapes traffic: steady refill with a bounded burst. Fixed windows are easy but allow boundary bursts that can overload dependencies.

6. **What’s the right response when you deny?**
   Typically HTTP `429` plus `Retry-After` (or reset info). Without explicit guidance, clients retry blindly and increase load.

7. **What’s the most important part of key design?**
   Pick keys that represent the fairness boundary you actually care about (tenant/API key), and avoid keys that explode cardinality or are spoofable (raw IP/header).

## Advanced Questions (With Answers)

1. **What’s the first symptom of a GenServer-based limiter bottleneck?**
   Increased p99 latency on `GenServer.call`, rising message queue length, and growing denial/timeout rates under load.

2. **How do you keep limiter latency low at high throughput?**
   Shard by key, avoid large in-process state, consider ETS, and keep the hot path O(1) with bounded allocations.

3. **How do you prevent memory blow-ups from unbounded keys?**
   Enforce TTL eviction, bound key cardinality (prefer auth keys over IP), and monitor “unique keys per window” metrics.

4. **What’s a safe “production stance” on global limits in a partitioned network?**
   Prefer per-node limits or external coordination. If you must do global, design for at-least-once and idempotency, and assume partitions.

5. **Why is “rate limiter required” a resilience question, not only security?**
   Most outages are overload + cascading failures. Rate limiting is a controlled degradation tool that keeps the system in a recoverable state.

6. **What’s a good progression from demo to production in one sentence?**
   Per-key fairness, then sharding to remove bottlenecks, then ETS/external store for state scale, then explicit multi-node semantics and operational controls.

7. **What’s the most common staff-level mistake in “rate limiting by IP”?**
   Treating IP as identity. NAT/proxies make it unreliable, and trusting forwarding headers without a trusted proxy boundary enables spoofing.

8. **Why is returning `Retry-After` not “nice to have”?**
   Without it, clients retry blindly, increasing load exactly when you’re trying to shed it. Good rate-limit UX is part of resilience.

9. **What’s the first thing you instrument?**
   Allow/deny counts by limiter type, p95/p99 limiter latency, and top keys denied; then correlate with downstream saturation (DB, external APIs).

10. **How do you avoid the limiter becoming a single point of failure?**
   Keep the check fast, shard it, set strict timeouts, define fail-open/closed behavior, and ensure limiter dependencies have their own budgets and circuit breaking.

11. **How do you handle “hot keys” (one tenant dominates traffic)?**
   Don’t let one key map to one shard forever. Either increase shard count (with careful rollout), add a second dimension (endpoint group), or implement per-tenant internal sharding (tenant splits into multiple buckets) while still enforcing the same total budget.

12. **How do you pick shard count?**
   Base it on expected throughput and CPU cores, but also on operational simplicity. Too few shards means contention; too many increases supervision overhead and memory. Measure p99 limiter latency and queue lengths as you tune.

13. **What’s the subtle bug with fixed windows and “reset time”?**
   If you use wall clock time, NTP adjustments can create negative durations or elongated windows. Use monotonic time for interval math and compute reset semantics carefully.

14. **Why do you want “escape hatches” in rate limiting?**
   Because rate limiting is often triggered during incidents. You need knobs to restore partial service quickly without a deploy (disable non-critical limits, per-tenant overrides, temporary relaxations).
