# Elixir on the BEAM

This directory contains a structured Elixir learning path for engineers who want to understand the language, the BEAM runtime, and how Elixir is used to build resilient systems with OTP and Phoenix.

## Interview Preparation

| Level | Focus | File |
|-------|-------|------|
| Level 1 | Phoenix, Plug, LiveView fundamentals — surface-level fluency | [level-1.md](level-1.md) |
| Level 2 | OTP internals, GenServer design, Ecto deep, production reasoning | [level-2.md](level-2.md) |
| Level 3 | System design, failure scenarios, distributed systems, staff-level trade-offs | [level-3.md](level-3.md) |

---

## Directory Structure

```text
09-elixir/
├── 01-foundations/         # Core language syntax and functional programming basics
├── 02-beam-otp/            # Processes, message passing, supervisors, OTP design
├── 03-phoenix-ecto/        # Phoenix web development and persistence with Ecto
└── 04-testing-production/  # Testing, deployment, observability, and production concerns
```

## Phase 1: Elixir Foundations

**Location**: `01-foundations/`

Build a strong base in the language and functional programming model:

- **Elixir Basics**: syntax, immutability, pattern matching
- **Syntax and Data Structures**: atoms, lists, tuples, maps, structs, keyword lists
- **Pattern Matching**: assignment, function heads, case/cond, guards
- **Functions and Modules**: arity, pipes, recursion, named functions
- **Functional Style**: immutability, higher-order functions, Enum and Stream
- **Metaprogramming**: macros, DSL building patterns, and pitfalls

**Navigate to**: [01-foundations/README.md](01-foundations/README.md)

## Phase 2: BEAM and OTP

**Location**: `02-beam-otp/`

Learn how Elixir turns concurrency into a practical default:

- **OTP**: processes, behaviours, supervision
- **BEAM Runtime**: processes, schedulers, per-process GC and memory behavior
- **Concurrency**: Tasks, messaging patterns, backpressure, and performance pitfalls
- **GenServer**: stateful servers, calls/casts, timeouts, and failure modes
- **Supervisor**: restart strategies, child specs, DynamicSupervisor patterns
- **Distributed Nodes**: how/why, communication/management, pitfalls

**Navigate to**: [02-beam-otp/README.md](02-beam-otp/README.md)

## Phase 3: Phoenix and Ecto

**Location**: `03-phoenix-ecto/`

Use Elixir for web applications and database-backed systems:

- **Phoenix Basics**: endpoint, router, controllers
- **Plug Pipeline**: plugs, pipelines, `conn` and request lifecycle
- **MVC**: controllers, views, templates (and modern component-based rendering)
- **Contexts**: domain boundaries and a stable public API
- **Mix Tasks**: generators, custom tasks, releases
- **PubSub**: topics, broadcasts, real-time update patterns
- **Ecto**: schemas, changesets, queries, transactions
- **Application Design**: contexts, boundary design, separation of concerns
- **Real-time Features**: PubSub, LiveView updates, background work patterns

**Navigate to**: [03-phoenix-ecto/README.md](03-phoenix-ecto/README.md)

## Phase 4: Testing and Production

**Location**: `04-testing-production/`

Move from learning to operating Elixir in production:

- **Testing with ExUnit**: unit tests, integration tests, async tests, mocks
- **Property Testing**: stronger guarantees for functional code
- **Deployment**: releases, environment configuration, runtime behavior
- **Observability**: logging, telemetry, metrics, error handling
- **Oban**: scheduling, cron, retries, idempotency, and production pitfalls

**Navigate to**: [04-testing-production/README.md](04-testing-production/README.md)

## Learning Approach

1. **Start with the language**: Elixir syntax and pattern matching are the foundation for everything else.
2. **Treat concurrency as a feature, not an add-on**: processes and supervision are central to the design.
3. **Move into Phoenix once the runtime model is clear**: Phoenix makes more sense after OTP basics.
4. **Practice by building small, fault-tolerant services**: Elixir is best learned by shipping code, not only reading about it.

## Why Elixir

- Great fit for highly concurrent and fault-tolerant systems
- Expressive functional syntax with a strong developer experience
- OTP gives a disciplined model for stateful, resilient services
- Phoenix is productive for modern web applications and real-time features

## Related Content

- See [03-architecture/microservices/README.md](../03-architecture/microservices/README.md) for distributed systems patterns with Elixir parallels.
- See [02-python/README.md](../02-python/README.md) for another language track in the same repository.

## Back to Main Navigation

Return to the [Main README](../README.md) for the full learning roadmap.
