# Plug Pipeline: Plugs, Pipelines, Conn

Phoenix uses Plug for request handling. A Plug pipeline is how you compose cross-cutting request/response behavior.

## Core Concepts

- **`Plug.Conn`** represents the request/response state — it is an immutable struct passed through each plug.
- **Plugs** transform the `conn` (assigns, headers, session, auth) and can halt the pipeline.
- **Pipelines** group plugs and can be applied to route scopes.
- **Halting** stops further plugs and routing when you’ve decided the response.

## Two Types of Plugs

**Function plug** — a plain function with `(conn, opts)` signature:
```elixir
def require_auth(conn, _opts) do
  if conn.assigns[:current_user] do
    conn
  else
    conn |> send_resp(401, “Unauthorized”) |> halt()
  end
end
```

**Module plug** — a module implementing `init/1` and `call/2`:
```elixir
defmodule MyApp.Plugs.RequireAuth do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    if conn.assigns[:current_user] do
      conn
    else
      conn |> send_resp(401, “Unauthorized”) |> halt()
    end
  end
end
```

`init/1` runs at **compile time** for module plugs — use it for expensive configuration. `call/2` runs on every request.

## How Plug.Builder Compiles Pipelines

When you write `plug MyPlug` in a router pipeline, `Plug.Builder` generates a function chain at compile time — not a runtime loop. Each plug call is inlined as a direct function call. This is why Plug pipelines are fast: there’s no dynamic dispatch per request.

```elixir
# This pipeline:
pipeline :api do
  plug :accepts, [“json”]
  plug MyApp.Auth
  plug MyApp.RateLimiter
end

# Compiles to roughly:
def call(conn, opts) do
  conn
  |> accepts([“json”])
  |> MyApp.Auth.call(MyApp.Auth.init([]))
  |> MyApp.RateLimiter.call(MyApp.RateLimiter.init([]))
end
```

## Is Plug Synchronous or Async?

Plug is **synchronous within a single request process**. Each plug calls the next one in sequence. However, because every request runs in its own BEAM process, thousands of requests execute concurrently — each in its own sequential pipeline.

## Practical Notes

- Do authentication/authorization as plugs applied via pipelines to keep it consistent.
- Add request IDs and logging context early to improve observability.
- Avoid doing business logic in plugs; keep them as adapters and cross-cutting concerns.
- Always return `conn` from a plug — forgetting this causes cryptic errors.
- Always `halt/1` after sending a response to stop downstream plugs from running.

## Common Questions (With Answers)

1. **What is Plug?**
   Plug is a specification for composable request/response middleware in Elixir. It defines the `Plug.Conn` struct and the `init/1` + `call/2` interface. Both Phoenix controllers and the router are Plug applications.

2. **What is `conn`?**
   It’s the `Plug.Conn` struct that carries request data in and accumulates the response as it flows through plugs and handlers. It is immutable — each plug receives a conn and returns a new (modified) conn.

3. **Is `conn` mutable or immutable?**
   Immutable. You never modify `conn` in place. Every plug receives a conn value and returns a new conn with changes applied. This makes pipelines predictable and debuggable.

4. **Difference between function plug and module plug?**
   A function plug is a two-arity function — simple and inline. A module plug implements `init/1` + `call/2`, allowing compile-time configuration via `init/1`. Use module plugs when you need pre-computed opts.

5. **How does plug chaining work?**
   `Plug.Builder` generates a function chain at compile time. Each `plug` call in a pipeline is compiled into a direct function call. At runtime, the conn flows through each step in order.

6. **Can plugs run conditionally?**
   Yes. You can add conditional logic inside a plug’s `call/2`, or use `Plug.Router` to match specific paths. You can also structure pipelines so only certain route scopes use certain plugs.

7. **What does it mean to “halt” the connection?**
   It sets `conn.halted = true` and stops the pipeline. Use it when you’ve sent a response (e.g., 401 unauthorized) and want to prevent downstream plugs from running.

8. **Why use pipelines instead of adding plugs everywhere?**
   Pipelines make behavior consistent and reduce security gaps from missing plugs on a route.

9. **What happens if a plug halts?**
   The remaining plugs in the pipeline are skipped. Phoenix checks `conn.halted` after each plug and stops processing if true.

## Advanced Questions (With Answers)

1. **How does Plug.Builder compile pipelines?**
   It generates a single function body at compile time, inlining each plug as a direct function call. This avoids runtime dispatch overhead. The compiled pipeline is a single Elixir function.

2. **What happens under the hood when you `plug` something?**
   `Plug.Builder` calls `init/1` at compile time to produce static opts, then generates code that calls `call(conn, opts)` at runtime. For function plugs, it directly calls the function.

3. **Why can plug order be security-critical?**
   If you run plugs in the wrong order, you might authorize before loading a user, or skip important protections for some routes. For example: run `authenticate` before `authorize`, and both before any business logic.

4. **How do you keep plug pipelines testable?**
   Keep plugs small, pure where possible, and test them as functions over `conn` with minimal side effects. Use `Plug.Test` helpers to build test conns.

5. **What’s a performance pitfall in plugs?**
   Doing expensive work per request (DB queries, external calls) in a plug that runs on many routes. Cache carefully or move work to handlers.

6. **How do plugs relate to telemetry?**
   Plugs are a good place to add consistent instrumentation and attach request context for downstream telemetry events.

7. **What happens if you forget to return conn?**
   The pipeline gets a `nil` or wrong value in place of `conn`, which causes an immediate crash. Elixir will raise a `Plug.Conn.AlreadySentError` or a similar runtime error depending on where it propagates.
