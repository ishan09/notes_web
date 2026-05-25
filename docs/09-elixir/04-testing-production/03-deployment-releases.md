# Deployment and Releases

Elixir releases package your application with the runtime artifacts needed to run it in production.

## Core Concepts

- **Release** bundles code and dependencies
- **Configuration** is separated across build and runtime concerns
- **Environment variables** often control runtime behavior
- **Hot upgrades** are possible in specific cases, but not always necessary

## Practical Notes

- Keep production config explicit.
- Avoid depending on local development assumptions.
- Test release startup and shutdown behavior before shipping.

## Common Questions (With Answers)

1. **What is included in a release?**
   Your compiled application code and dependencies packaged for production deployment, with scripts to start/stop and manage the running system.

2. **Why is runtime configuration important?**
   Production environments differ. Secrets, hostnames, and connection strings are typically only known at runtime and must not be baked into the build artifact.

3. **What production issues can appear only after packaging?**
   Missing OS dependencies, incorrect runtime env vars, wrong node naming/cookies for clustering, and boot-time configuration errors.

4. **Why do BEAM apps often use releases?**
   They provide predictable packaging and operational workflows (start/stop/remote console) without needing the build tool present.

5. **What’s a common deployment pitfall?**
   Not validating release boot under real environment constraints (permissions, file paths, DNS), leading to startup failures in production.

## Advanced Questions (With Answers)

1. **Why can clustering fail only in production releases?**
   Node names, cookies, DNS, and networking differ from dev. Release config and runtime name resolution can behave differently across environments.

2. **How do you handle migrations safely in deployments?**
   Run migrations as an explicit step with observability and rollback plans, avoid doing migrations automatically on every boot unless you have strong guarantees.

3. **What’s a safe approach to secrets in releases?**
   Load secrets at runtime from the environment or a secrets manager, and avoid compile-time config for secrets.

4. **How do you reduce blast radius during deploy?**
   Use rolling deploys, health checks, and canary approaches, and ensure the system behaves well under partial rollout and version skew.

5. **What operational feature should you ensure for releases?**
   Safe introspection: logs, metrics, and a way to execute limited administrative commands without SSHing into a build environment.

---

## Deployment & Scaling Deep Dive

### How do you deploy a Phoenix app?

**Standard production path** using Mix releases:

```bash
# 1. Build release (in CI or build container)
MIX_ENV=prod mix release

# 2. Package the _build/prod/rel/my_app directory
# 3. Copy to server / build Docker image

# 4. Run migrations before starting the app
bin/my_app eval "MyApp.Release.migrate()"

# 5. Start the app
bin/my_app start
# or as a daemon:
bin/my_app daemon
```

**Docker/Kubernetes path**:
```dockerfile
FROM elixir:1.16-alpine AS build
RUN mix release

FROM alpine:3.18
COPY --from=build /app/_build/prod/rel/my_app ./
CMD ["bin/my_app", "start"]
```

Secrets via env vars read in `runtime.exs`. No build tools needed in the production image.

### How do you handle migrations safely?

**Never run migrations automatically on boot** (it's a race condition in rolling deploys). Instead:

```elixir
# lib/my_app/release.ex
defmodule MyApp.Release do
  def migrate do
    {:ok, _, _} = Ecto.Migrator.with_repo(MyApp.Repo, &Ecto.Migrator.run(&1, :up, all: true))
  end
end
```

Run as a pre-deploy step or a Kubernetes init container:
```bash
bin/my_app eval "MyApp.Release.migrate()"
```

Migration safety checklist:
- **Backward compatible**: new column is nullable or has a default — old code still runs.
- **Separate data migrations** from schema migrations.
- **Test rollback**: ensure `down/0` works before shipping.

### How do you do zero-downtime deploys?

**Rolling deploys**: gradually replace old instances with new ones. Requires:
- Backward-compatible migrations (old code + new schema must co-exist during rollout).
- Health checks that gate traffic to new instances.
- Graceful shutdown: drain in-flight requests before terminating old instance.

**Graceful shutdown in Phoenix**:
```elixir
# config/prod.exs
config :my_app, MyAppWeb.Endpoint,
  shutdown_timeout: 30_000  # wait 30s for in-flight requests before hard exit
```

BEAM sends `SIGTERM` → `Application.stop/1` → supervisors stop children → Endpoint drains connections → process exits.

**Blue-green deploys**: run two identical environments, switch load balancer. More resource-intensive but simpler rollback. Preferred for large schema migrations.

### Rolling deploy vs blue-green: when to choose?

| | Rolling | Blue-Green |
|---|---|---|
| Resource cost | Lower (gradual replacement) | Higher (double infra briefly) |
| Rollback speed | Slower (re-roll forward) | Instant (switch LB back) |
| Migration risk | Must be backward compatible | Can run before switching traffic |
| Zero-downtime | Yes (with health checks) | Yes |

Use **rolling** for most deploys. Use **blue-green** for risky schema changes or when you need instant rollback capability.

### How do nodes join a cluster during deploy?

With `libcluster` using Kubernetes DNS strategy:
1. New pod starts, runs discovery (polls DNS for headless service).
2. `Node.connect(:"node@ip")` is called by libcluster.
3. The new node joins the mesh and starts receiving PubSub messages.
4. Old pod begins graceful shutdown after health check removed from LB.

During the transition, **both old and new nodes are in the cluster simultaneously**. Design for version skew: old and new code must handle the same message formats.

### What happens to live WebSocket connections during deploy?

WebSocket connections (LiveView, Channels) are process-backed and die with the node. Clients:
- Receive a WebSocket close event.
- `liveview.js` and channel client automatically attempt reconnect.
- On reconnect, `mount/2` or `join/3` is called on a new node.

For graceful WebSocket drain: delay the SIGTERM response, stop accepting new connections, let existing WebSockets finish naturally or timeout. In practice most teams just let clients reconnect — it's seamless for users if reconnect is fast.

### How does hot code reloading work?

BEAM supports loading new module versions while the system runs (hot upgrades via `appup`/`relup`). In practice:
- Hot upgrades are complex and rarely used in modern Phoenix deployments.
- Most teams do **rolling container replacements** instead — simpler, more reliable, no `appup` files.
- Hot upgrades are still valuable for **embedded systems** or environments where restart cost is very high.

Rule: unless you have a strong operational reason, prefer container rolling deploys over BEAM hot code reloading.
