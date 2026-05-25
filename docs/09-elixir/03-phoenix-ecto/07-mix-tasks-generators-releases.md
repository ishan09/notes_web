# Mix Tasks: Generators and Releases

Mix is Elixir’s build tool. Phoenix uses Mix tasks for generators and operational workflows.

## Core Concepts

- **Generators** create consistent project structure (schemas, contexts, migrations).
- **Custom mix tasks** let you build project-specific CLI tools.
- **Releases** package applications for production deployment.

## Practical Notes

- Prefer generators early to align structure (especially contexts and migrations).
- Keep custom mix tasks thin adapters calling context functions.
- Understand the difference between compile-time config and runtime config in releases.

## Common Mix Commands

```bash
# Project
mix new my_app                   # new Elixir project
mix phx.new my_app               # new Phoenix project
mix deps.get                     # install dependencies
mix compile                      # compile project

# Phoenix generators
mix phx.gen.context Accounts User users name:string email:string:unique
# → generates: context module (Accounts), schema (User), migration, tests

mix phx.gen.schema Billing.Invoice invoices amount:integer status:string
# → generates: schema module + migration (no context)

mix phx.gen.html Accounts User users name:string email:string
# → generates: context, schema, controller, views, templates, tests

mix phx.gen.json Accounts User users name:string email:string
# → generates: context, schema, controller, JSON views, tests

mix phx.gen.live Accounts User users name:string email:string
# → generates: context, schema, LiveView modules, tests

# Database
mix ecto.create                  # create DB
mix ecto.migrate                 # run pending migrations
mix ecto.rollback                # rollback last migration
mix ecto.reset                   # drop + create + migrate
mix ecto.gen.migration add_status_to_users  # empty migration file

# Releases
mix release                      # build production release
mix release --overwrite          # rebuild existing release
```

## Writing a Custom Mix Task

```elixir
# lib/mix/tasks/backfill_user_slugs.ex
defmodule Mix.Tasks.BackfillUserSlugs do
  use Mix.Task

  @shortdoc "Backfills slug field for all users missing one"
  @moduledoc """
  Backfills slug field for all existing users that have a nil slug.

  ## Usage

      mix backfill_user_slugs
      mix backfill_user_slugs --batch-size 100

  """

  def run(args) do
    # Parse CLI args
    {opts, _} = OptionParser.parse!(args, strict: [batch_size: :integer])
    batch_size = Keyword.get(opts, :batch_size, 500)

    # Start the app so Repo and contexts are available
    Mix.Task.run("app.start")

    Mix.shell().info("Starting slug backfill with batch_size=#{batch_size}...")

    MyApp.Accounts.backfill_slugs(batch_size: batch_size)
    |> case do
      {:ok, count} -> Mix.shell().info("Done. Updated #{count} users.")
      {:error, reason} -> Mix.raise("Backfill failed: #{inspect(reason)}")
    end
  end
end
```

**Run it**:
```bash
mix backfill_user_slugs
mix backfill_user_slugs --batch-size 200
```

**Key patterns**:
- Call `Mix.Task.run("app.start")` to boot the app (gives you Repo, contexts, etc.)
- Call context functions — not `Repo` directly — so validations and invariants apply
- Use `Mix.shell().info/1` for output (works in both interactive and CI)
- Use `Mix.raise/1` for hard failures with a meaningful exit code

## Releases — Packaging for Production

A release is a self-contained artifact: your app + BEAM runtime, without needing Elixir/Mix installed on the server.

```elixir
# mix.exs
def project do
  [
    releases: [
      my_app: [
        include_executables_for: [:unix],
        applications: [runtime_tools: :permanent],
      ]
    ]
  ]
end
```

```bash
MIX_ENV=prod mix release
# Creates: _build/prod/rel/my_app/
#   bin/my_app          ← start/stop commands
#   lib/                ← compiled .beam files
#   releases/           ← version info
```

**Start/stop the release**:
```bash
_build/prod/rel/my_app/bin/my_app start        # foreground
_build/prod/rel/my_app/bin/my_app daemon       # background (detached)
_build/prod/rel/my_app/bin/my_app stop
_build/prod/rel/my_app/bin/my_app remote       # connects an IEx shell to running node
```

## Config: Compile-Time vs Runtime — The Critical Distinction

```elixir
# config/config.exs — compile time (baked into the release artifact)
# SAFE FOR: feature flags, static settings, log levels
config :my_app, MyApp.Mailer, adapter: Swoosh.Adapters.Sendgrid

# config/runtime.exs — evaluated at startup (reads env vars each time the app starts)
# USE FOR: secrets, database URLs, port numbers, any value that changes per environment
import Config

config :my_app, MyApp.Repo,
  url: System.fetch_env!("DATABASE_URL"),    # raises if missing
  pool_size: String.to_integer(System.get_env("POOL_SIZE", "10"))

config :my_app, MyAppWeb.Endpoint,
  secret_key_base: System.fetch_env!("SECRET_KEY_BASE"),
  port: String.to_integer(System.get_env("PORT", "4000"))
```

**The footgun**: if you put `System.get_env/1` in `config/config.exs` (not `runtime.exs`),
the env var is read at **compile time** and baked in. The running container can’t override it.
Always use `config/runtime.exs` for anything environment-specific.

## Running Migrations in Production

```bash
# Run as a one-off command (common in Kubernetes init containers)
_build/prod/rel/my_app/bin/my_app eval "MyApp.Release.migrate()"
```

```elixir
# lib/my_app/release.ex — helper module for release commands
defmodule MyApp.Release do
  @app :my_app

  def migrate do
    load_app()
    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos, do: Application.fetch_env!(@app, :ecto_repos)
  defp load_app, do: Application.load(@app)
end
```

## Common Questions (With Answers)

1. **What is Mix?**
   The build tool for Elixir projects: compilation, dependencies, tasks, and releases.

2. **Why use Phoenix generators?**
   They help establish consistent structure and reduce “hand-rolled” variations across the codebase.

3. **When should you write a custom mix task?**
   When you need a repeatable internal CLI workflow (maintenance, backfills, data migrations, admin operations).

4. **What is a release?**
   A packaged, self-contained artifact that includes your application and runtime dependencies for deployment.

5. **What’s a common release pitfall?**
   Assuming dev-time config behavior in production. Runtime environment variables and correct configuration loading are essential.

## Advanced Questions (With Answers)

1. **Why should mix tasks avoid direct Repo access?**
   It’s often better to call context APIs so you reuse validations, transactions, and invariants consistently.

2. **What’s a danger of running “data backfills” via mix tasks?**
   They can overload the DB or external systems. Use batching, rate limiting, and idempotency, and measure throughput.

3. **How do releases change operational debugging?**
   You operate via release commands and logs rather than a dev shell. Ensure observability and safe runtime config.

4. **Why is compile-time config dangerous for secrets?**
   It can bake secrets into artifacts. Prefer runtime config for secrets.

5. **What’s a good pattern for long-running mix tasks?**
   Implement batching, checkpoints, and resume capability. Emit progress and metrics so you can safely stop and restart.
