# Phoenix Configuration and Project Structure

## Project Structure

```
my_app/
├── config/
│   ├── config.exs        ← compile-time defaults, shared across envs
│   ├── dev.exs           ← dev-specific (local DB, debug logging)
│   ├── test.exs          ← test-specific (test DB, minimal logging)
│   └── runtime.exs       ← runtime config evaluated when app starts
│
├── lib/
│   ├── my_app/           ← business logic (contexts, schemas, workers)
│   │   ├── accounts.ex               ← context module (public API)
│   │   ├── accounts/
│   │   │   ├── user.ex               ← schema
│   │   │   └── user_token.ex
│   │   └── repo.ex
│   │
│   └── my_app_web/       ← web layer (controllers, views, router, endpoint)
│       ├── endpoint.ex
│       ├── router.ex
│       ├── controllers/
│       ├── live/
│       └── components/
│
├── priv/
│   ├── repo/migrations/  ← Ecto migrations
│   └── static/           ← static assets
│
└── test/
    ├── my_app/           ← context/domain tests
    └── my_app_web/       ← controller/live/integration tests
```

## Key Architectural Principle

The `lib/my_app/` and `lib/my_app_web/` split enforces separation:

- `my_app/` has no knowledge of HTTP, controllers, or web concepts.
- `my_app_web/` calls into `my_app/` contexts — never touches schemas or Repo directly.
- This means business logic is reusable from Oban jobs, mix tasks, or CLI tools without touching the web layer.

## Configuration System

### `config/config.exs`

Evaluated **at compile time**. All values are hardcoded into the release at build time. Use for:
- Application module registration
- OTP app dependencies
- Static defaults that don't vary between environments

```elixir
config :my_app, MyApp.Repo,
  pool_size: 10
```

### `config/dev.exs` / `config/test.exs`

Environment-specific config, also **compile-time**. Overrides `config.exs` for that environment. Loaded only when `MIX_ENV=dev` or `MIX_ENV=test`.

### `config/runtime.exs`

Evaluated **at runtime** — when the application starts, not when it compiles. This is the right place for secrets and environment-specific values loaded from environment variables:

```elixir
config :my_app, MyApp.Repo,
  url: System.fetch_env!("DATABASE_URL")
```

**Critical distinction**: `config.exs` is baked into the compiled release. `runtime.exs` reads from the environment when the container/VM starts. Always use `runtime.exs` for secrets and values that vary per deployment (database URLs, API keys, ports).

## Common Questions (With Answers)

1. **Difference between `config.exs` and `runtime.exs`?**
   `config.exs` (and `dev.exs`, `test.exs`) are evaluated at compile time and baked into the built artifact. `runtime.exs` is evaluated when the app starts, after compilation. Use `runtime.exs` for anything that needs to change per environment or per deployment — secrets, URLs, ports.

2. **How does Phoenix handle environment configs?**
   Via Mix's `MIX_ENV` variable. `config/dev.exs` is loaded in dev, `config/test.exs` in test. `config/runtime.exs` is loaded in all environments at startup. You never load all three at once.

3. **Explain Phoenix folder structure.**
   `lib/app/` holds business logic (contexts, schemas, workers). `lib/app_web/` holds the web layer (router, controllers, views, LiveViews). `config/` holds environment configs. `priv/repo/migrations/` holds DB migrations. `test/` mirrors `lib/`.

4. **Where does business logic live?**
   In context modules under `lib/my_app/`. Contexts are the public API for a domain area. Everything under `lib/my_app_web/` (controllers, LiveViews) calls into contexts — never into schemas or Repo directly.

## Advanced Questions (With Answers)

1. **When is config compiled vs evaluated?**
   `config.exs` is evaluated when you run `mix compile` or `mix release`. `runtime.exs` is evaluated by `Config.Reader` at application startup (`bin/my_app start`). This means `runtime.exs` can safely read `System.get_env/1` and get the actual deployment environment variables.

2. **What's a common mistake with `config.exs` and secrets?**
   Putting `System.get_env("DATABASE_URL")` in `config.exs` — it reads the variable at build time, not at runtime. If the variable isn't set on the build machine, it gets baked in as `nil`. Always put `System.get_env` calls in `runtime.exs`.

3. **How would you restructure for a large system?**
   Split contexts into dedicated umbrella apps or separate bounded-context directories. Keep inter-context calls through explicit context APIs. Consider an umbrella project (`mix new --umbrella`) where each subdomain is its own OTP application with its own supervision tree and dependencies.

4. **How do you manage configuration in a Docker/Kubernetes deployment?**
   Use `runtime.exs` to read all secrets and URLs from environment variables. The compiled release image is generic — environment-specific config comes in at pod startup via env vars or mounted secret files. Never bake secrets into the image via `config.exs`.
