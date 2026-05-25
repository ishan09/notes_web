# Phoenix + Plug + LiveView — Level 1 Interview Checklist

This file is a topic index for Level 1 interview preparation. Each topic links to the detailed file where questions and answers live.

---

## Topic Map

| # | Topic | File |
|---|-------|------|
| 1 | Phoenix Overview (what it is, BEAM advantages, vs Rails) | [01-phoenix-web-fundamentals.md](03-phoenix-ecto/01-phoenix-web-fundamentals.md) |
| 2 | Request Lifecycle (Endpoint → Router → Pipeline → Controller → Context → Repo) | [01-phoenix-web-fundamentals.md](03-phoenix-ecto/01-phoenix-web-fundamentals.md) |
| 3 | Plug System (function vs module plug, pipeline, `conn`) | [05-plug-pipeline.md](03-phoenix-ecto/05-plug-pipeline.md) |
| 4 | Controllers & Views (`render` vs `json`, view module resolution) | [06-mvc-controllers-views-templates.md](03-phoenix-ecto/06-mvc-controllers-views-templates.md) |
| 5 | Contexts (domain boundaries, business logic encapsulation) | [04-contexts-application-boundaries.md](03-phoenix-ecto/04-contexts-application-boundaries.md) |
| 6 | Ecto Basics (Repo, Schema, Queries, connection pool) | [03-ecto-persistence.md](03-phoenix-ecto/03-ecto-persistence.md) |
| 7 | Concurrency Model (process-per-request, isolation, fault tolerance) | [01-phoenix-web-fundamentals.md](03-phoenix-ecto/01-phoenix-web-fundamentals.md) |
| 8 | LiveView Basics (server-rendered UI, WebSocket, stateful processes) | [02-liveview-real-time-ui.md](03-phoenix-ecto/02-liveview-real-time-ui.md) |
| 9 | Routing & Pipelines (scopes, pipeline order, middleware) | [05-plug-pipeline.md](03-phoenix-ecto/05-plug-pipeline.md) |
| 10 | Error Handling (fallback controller, 404/500, process crashes) | [10-phoenix-error-handling-performance.md](03-phoenix-ecto/10-phoenix-error-handling-performance.md) |
| 11 | Phoenix vs Plug vs Cowboy (stack layers, WebSocket upgrade) | [01-phoenix-web-fundamentals.md](03-phoenix-ecto/01-phoenix-web-fundamentals.md) |
| 12 | Configuration & Environment (`config.exs` vs `runtime.exs`) | [09-phoenix-config-structure.md](03-phoenix-ecto/09-phoenix-config-structure.md) |
| 13 | Phoenix Project Structure (`lib/`, `web/`, contexts layout) | [09-phoenix-config-structure.md](03-phoenix-ecto/09-phoenix-config-structure.md) |
| 14 | Performance Awareness (lightweight processes, non-blocking IO, bottlenecks) | [10-phoenix-error-handling-performance.md](03-phoenix-ecto/10-phoenix-error-handling-performance.md) |

---

## Rapid-Fire Answers

| Question | Answer |
|----------|--------|
| Is `conn` mutable? | No — immutable struct; each plug returns a new conn |
| Can two plugs run in parallel? | No — plug pipelines are sequential per request; requests run in parallel across processes |
| What happens if you forget to return conn? | Runtime error — pipeline gets wrong value, likely a `Plug.Conn` error |
| Does Phoenix share memory between requests? | No — each request is an isolated BEAM process |
| What is the cost of spawning a process? | ~1-3 microseconds and ~2KB RAM |
| How many processes can BEAM handle? | Millions — default limit is 262,143; configurable |
| Is LiveView stateless or stateful? | Stateful — each client connection is a persistent server-side process |
| Where is session stored? | In a signed/encrypted cookie by default (client-side), or server-side with a session store adapter |
| What happens on WebSocket disconnect? | The LiveView process receives a `:terminate` callback and exits. State is lost; client reconnects and triggers `mount/2` again |

---

## How to Use This

- **Level 1** → answer confidently in 2–3 minutes per topic
- **Add 1 internal detail per answer** → makes you look senior
- **Don't go too deep unless asked** — save internals for "push to internals" follow-ups
