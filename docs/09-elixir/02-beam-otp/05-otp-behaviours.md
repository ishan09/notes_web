# OTP Behaviours

OTP behaviours are standardized interfaces (callback contracts) for building reliable components. They encourage consistent lifecycles and predictable integration with supervision.

## What Is OTP (And Why It Exists)?

**OTP** stands for “Open Telecom Platform”, but in practice it means the set of Erlang libraries and design principles used to build:

- Highly concurrent systems
- Systems that keep running despite partial failures
- Systems where recovery is structured (supervision) rather than improvised

OTP exists because large distributed systems fail in routine ways: timeouts, dependency outages, memory pressure, partial network partitions, and unexpected exceptions. OTP’s model assumes failures will happen and makes failure handling a first-class design concern.

What OTP solves:

- **Lifecycle management**: start/stop ordering, graceful shutdown, restarts.
- **Fault containment**: crash isolation via processes.
- **Recovery**: supervisors restart children with explicit strategies.
- **Standard structure**: well-known callback contracts that teams can recognize quickly.

## Core Concepts

- **Behaviour**: a contract that a module implements via callbacks.
- **Common OTP behaviours**: `GenServer`, `Supervisor`, `Application`.
- **Benefits**: consistent structure, better tooling, easier supervision and composition.
- **Callback discipline**: callbacks must be fast and predictable; push long work out of the callback.

## Practical Notes

- Use behaviours to structure long-lived processes and service components.
- Keep “public API functions” thin wrappers around behaviour calls.
- Write callbacks with clear return shapes and handle unexpected messages via `handle_info/2`.

## Common Questions (With Answers)

1. **What is an OTP behaviour?**
   A module contract defined by callbacks. OTP modules call your callbacks, and you return a defined set of values to manage state and control flow.

2. **Why do behaviours matter in production systems?**
   They make lifecycle, error handling, and supervision predictable, which reduces the number of “custom frameworks” in code.

3. **What’s the difference between a behaviour and a protocol?**
   Behaviours are callback contracts typically used for process lifecycle. Protocols are polymorphism over data types, chosen at runtime.

4. **Why should callbacks be fast?**
   A behaviour process handles messages sequentially. Slow callbacks block mailboxes and cause cascading timeouts.

5. **Where should validation happen?**
   At boundaries: validate inputs in public API functions or changesets, and keep callback logic focused on state transitions.

## Advanced Questions (With Answers)

1. **How do behaviours support testability?**
   They encourage small, explicit public APIs and predictable side effects. You can test state transitions by driving the API and asserting messages/state.

2. **How do you evolve a behaviour-backed module without breaking callers?**
   Keep the public API stable and refactor internals. Avoid leaking callback details to callers.

3. **What’s a sign you are misusing GenServer as a behaviour?**
   The GenServer becomes a grab bag of unrelated responsibilities and random messages. Split into multiple processes or pure functions.

4. **How do you handle versioning of “behaviour-like” module APIs?**
   Prefer adding new functions and keeping old ones as wrappers; avoid breaking return shapes used by `with` chains.

5. **When is `Application` behaviour central to design?**
   When you need to define a supervision tree and boot order for a whole OTP application, especially in releases.

---

## Umbrella Applications

### What is an umbrella app?

An umbrella application is a Mix project that contains multiple OTP applications under one repository. Each sub-app has its own `mix.exs`, supervision tree, and dependencies, but they compile and deploy together.

```
my_umbrella/
├── mix.exs               ← umbrella root
└── apps/
    ├── my_app/           ← business logic OTP app (no web)
    │   ├── mix.exs
    │   └── lib/my_app/
    ├── my_app_web/       ← Phoenix web layer OTP app
    │   ├── mix.exs
    │   └── lib/my_app_web/
    └── my_app_worker/    ← background job OTP app
        ├── mix.exs
        └── lib/my_app_worker/
```

### Why use umbrella?

- **Enforced boundaries**: `my_app_web` can only depend on `my_app` — cyclic dependencies are a compile error.
- **Independent compilation**: only changed apps recompile.
- **Separate supervision trees**: each app starts/stops independently.
- **Testable in isolation**: test `my_app` domain logic without a web layer.

### When NOT to use umbrella?

- Small/medium apps: adds overhead without benefit.
- When apps are tightly coupled (defeats the purpose).
- When you actually need separate deployable services (use microservices instead).
- When team size doesn't justify the structure.

### How do apps communicate inside an umbrella?

Direct function calls — since all apps compile into the same BEAM node:
```elixir
# my_app_web calls into my_app context
MyApp.Accounts.get_user(id)
```

For looser coupling (async, decoupled): Phoenix.PubSub or message passing, but this is usually overkill within an umbrella.

### How does compilation work across apps?

Mix compiles apps in dependency order. If `my_app_web` depends on `my_app`, then `my_app` compiles first. A change in `my_app` triggers recompilation of `my_app_web`. Changes in `my_app_web` don't trigger recompilation of `my_app`.

### How do migrations work in umbrella apps?

Migrations belong to the app that owns the Repo. Typically one app (e.g., `my_app`) owns the `Repo` and all migrations. Other apps use that Repo via direct calls. Running migrations:

```bash
cd apps/my_app && mix ecto.migrate
# or from umbrella root:
mix ecto.migrate --app my_app
```

**Single Repo vs multiple Repos**: use one `Repo` unless sub-apps genuinely need separate databases (e.g., one for user data, one for analytics). Multiple Repos add complexity for cross-app transactions — you lose single-transaction atomicity across boundaries.

### When does umbrella become a problem?

- **Too many apps**: overhead of managing deps and compile order outweighs benefits.
- **Cross-app transactions**: `Ecto.Multi` spans one Repo — cross-Repo workflows need distributed transaction patterns.
- **When you actually want microservices**: umbrella is a monorepo, not a distributed system. If services need independent deployments, separate repos + APIs are the right answer.

---

## Architecture: Domain Splitting & Boundaries

### When would you use PubSub vs direct calls?

| | Direct function call | PubSub |
|---|---|---|
| Coupling | Tight — caller knows callee | Loose — publisher doesn't know subscribers |
| Synchronous? | Yes | No — fire and forget |
| Error handling | Caller handles errors | Subscriber handles independently |
| Use when | Core domain operations, transactions | Notifications, side effects, UI updates |

Use **direct calls** for: "this must happen as part of this operation" (e.g., writing to DB, enforcing invariants).

Use **PubSub** for: "notify interested parties after something happened" (e.g., broadcast UI update after an order is placed, trigger an email worker).

### How do you enforce boundaries in a large codebase?

1. **Context modules as public APIs**: only call into a domain through its context module. Never reach into internal schemas or query helpers.
2. **Umbrella apps**: compile-time enforcement — cross-app calls only possible if declared as a dependency.
3. **Code review conventions**: reject PRs that bypass context boundaries.
4. **Boundary library** (`mix boundary`): declarative boundary rules enforced at compile time — specify which modules may call which.
5. **No `conn` in contexts**: if you see Phoenix types inside a context, the boundary is leaking.

### How do you avoid cyclic dependencies?

- Design a dependency hierarchy: `web` → `domain` → `data` — not bidirectional.
- If two contexts need each other, extract a shared third module they both depend on.
- In umbrella: Mix will raise a compile error on circular app deps — let the compiler enforce it.
- Use events/PubSub to break synchronous cycles (A notifies B via PubSub instead of calling B directly).
