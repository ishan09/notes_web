# Phoenix Web Fundamentals

Phoenix is Elixir’s web framework. It emphasizes explicit routing, composable request handling, and a clean application structure built on BEAM’s process model.

## Core Concepts

- **Router** maps requests to controllers or LiveViews
- **Endpoint** is the boundary for HTTP/WebSocket entry, configuration, and plug setup
- **Controller** handles HTTP requests and responses
- **Plugs** are reusable request/response middleware
- **Templates** render HTML or JSON output
- **Channels** support real-time messaging

## Stack Layers: Phoenix vs Plug vs Cowboy

```
Browser
  │
  ▼
Cowboy (HTTP server — accepts TCP connections, parses HTTP)
  │
  ▼
Plug (request/response interface — conn struct, pipeline model)
  │
  ▼
Phoenix (router, controllers, LiveView, contexts, templates)
```

- **Cowboy** is the underlying HTTP server. It handles raw TCP connections, HTTP parsing, and WebSocket upgrades. Phoenix doesn’t invent a new server — it runs on top of Cowboy (or Bandit).
- **Plug** defines the `Plug.Conn` interface and the `plug` pipeline model. Phoenix is a Plug application at its core.
- **Phoenix** adds routing, controllers, LiveView, PubSub, generators, and conventions on top of Plug.
- You can use Plug without Phoenix for lightweight HTTP applications.

## Request Lifecycle

```
Request
  │
  ├─ Endpoint         ← common plugs: SSL, static files, session, telemetry
  │
  ├─ Router           ← pipeline selection, route matching
  │
  ├─ Pipeline         ← auth, content-type, CSRF, etc.
  │
  ├─ Controller       ← calls context, builds response
  │
  ├─ Context          ← business logic, calls Repo
  │
  └─ Response         ← conn rendered and sent back via Cowboy
```

Each request is handled by a new BEAM process. If the process crashes, it dies in isolation — no other request is affected. The response is assembled by passing and transforming the immutable `conn` struct through each step.

## Design Notes

- Keep controllers thin — they are adapters, not business logic containers.
- Move business rules into contexts so they are testable and reusable.
- Use plugs for cross-cutting concerns like authentication and headers.
- `conn` is immutable: every plug must return a (potentially modified) conn.

## Common Questions (With Answers)

1. **What is Phoenix and why would you choose it?**
   Phoenix is a web framework for Elixir that runs on the BEAM VM. Choose it when you need high concurrency, fault isolation, real-time features, or want to leverage OTP’s process model for scalability without complex infrastructure.

2. **What is the role of the endpoint in Phoenix?**
   It configures how requests enter the app (HTTP, sockets), sets up common plugs (SSL, static files, session, telemetry), and defines core runtime integration points.

3. **What is the role of the router?**
   It maps paths and verbs to controllers/LiveViews and composes pipelines to apply plugs consistently.

4. **What is the role of a plug?**
   A composable request/response middleware component that transforms the `conn`.

5. **Why should controllers stay thin?**
   Controllers are adapters. Business logic belongs in contexts so it is testable and reusable across HTTP, jobs, and other entry points.

6. **When would you use channels instead of standard HTTP?**
   For real-time bidirectional messaging, presence, and pub/sub-style client updates that don’t fit request/response.

7. **What is the role of Cowboy?**
   Cowboy is the HTTP server that Phoenix (via Plug) sits on top of. It handles raw TCP connections, HTTP/1.1 and HTTP/2 parsing, and WebSocket protocol upgrades. Phoenix doesn’t own this layer.

8. **Can you use Plug without Phoenix?**
   Yes. Plug is a standalone library. You can build a lightweight HTTP app directly with Plug and Cowboy without the full Phoenix router/controller/view system.

## Advanced Questions (With Answers)

1. **How does Phoenix leverage BEAM for scalability?**
   Each request runs in its own lightweight BEAM process. The scheduler distributes processes across CPU cores. Processes are isolated — a crash in one doesn’t affect others. This gives Phoenix high concurrency without threads and without explicit locking.

2. **Why is Phoenix better for real-time systems?**
   WebSockets, LiveView, and channels are first-class citizens. Each client connection is a BEAM process. PubSub distributes messages across connected processes efficiently. The scheduler handles thousands of concurrent connections without the thread overhead of typical web frameworks.

3. **What are the trade-offs of Phoenix vs Rails?**
   Phoenix: stronger concurrency model, better for real-time, excellent fault tolerance, but smaller ecosystem and a steeper learning curve for the BEAM model. Rails: larger ecosystem, easier to hire for, more mature tooling for CRUD apps, but threads-based concurrency and less natural for real-time.

4. **How does Cowboy handle connections?**
   Cowboy spawns a process per connection. It parses HTTP, triggers Plug handlers, and manages WebSocket upgrades. The connection process lives until the request/connection lifecycle ends.

5. **Where does WebSocket upgrade happen?**
   In Cowboy at the HTTP layer. Phoenix Channels and LiveView use Cowboy’s WebSocket support via Plug adapters. The upgrade from HTTP to WebSocket happens before Phoenix routing takes over for the upgraded connection.

6. **What’s a common Phoenix scaling pitfall?**
   Putting heavy work directly in controller actions, causing request timeouts and tying up web processes. Offload to jobs and keep request paths fast.

7. **How do pipelines help security?**
   They enforce consistent authentication/authorization plugs across route groups, reducing “forgot to secure this route” mistakes.

8. **What’s a pragmatic way to handle request-level tracing?**
   Add a plug early in the endpoint/pipeline that attaches request IDs and emits telemetry events for timing and errors.
