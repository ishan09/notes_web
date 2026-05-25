# Elixir Basics: What It Is, What It Solves, Syntax, Immutability, Pattern Matching

This note is a quick on-ramp for Elixir as a language and a mental model. Everything else (OTP, Phoenix, Ecto) builds on these basics.

## What Is Elixir?

Elixir is a functional, dynamically typed language that runs on the **BEAM** (the Erlang VM). It builds on Erlang’s concurrency and fault-tolerance model (OTP), and adds modern language ergonomics, tooling (`mix`), and a strong web ecosystem (Phoenix).

## What Problems Does It Solve Well?

- **Highly concurrent systems**: many independent activities (websocket connections, pipelines, chat, collaboration, telemetry).
- **Fault-tolerant services**: isolating failures and recovering quickly via supervision trees.
- **Soft real-time workloads**: predictable latency under load (when designed well) via preemptive scheduling and isolation.
- **Distributed patterns**: messaging, PubSub, clustering (with real tradeoffs and pitfalls).

## Core Ideas

- **Immutability**: data is never mutated in-place; transformations return new values.
- **Pattern matching**: matching is used for assignment, branching, and selecting function clauses.
- **Data-first pipelines**: the `|>` operator makes transformations readable.
- **Explicit success and failure**: common conventions use tagged tuples like `{:ok, value}` and `{:error, reason}`.

## Immutability vs Rebinding: Is `x = 10; x = 20` Mutation?

No. Values are immutable. `x = 10` binds `x` to the value `10`. `x = 20` **rebinds** `x` to a new value in the current scope. The old value `10` was never modified.

If you want to prevent rebinding and require matching an existing binding, use the **pin operator**:

```elixir
x = 10
^x = 10  # matches
# ^x = 20  # would raise MatchError
```

## A Minimal Example

```elixir
defmodule Users do
  def deactivate(%{active: true} = user), do: {:ok, %{user | active: false}}
  def deactivate(%{active: false}), do: {:error, :already_inactive}
end
```

## Common Questions (With Answers)

1. **What does immutability buy you in practice?**
   It makes code easier to reason about, enables safe concurrency by default (no shared mutable state), and reduces classes of bugs related to unexpected mutation.

2. **Is `=` assignment or comparison in Elixir?**
   `=` performs pattern matching. It succeeds if the left side can be matched to the right side, otherwise it raises a `MatchError`.

3. **Why do Elixir functions often return `{:ok, value}` / `{:error, reason}`?**
   It standardizes control flow and makes error handling explicit, especially when composing multiple steps with `with`.

4. **What is the point of multiple function clauses?**
   They make valid input shapes explicit and keep branching localized at the function boundary (cleaner than deep nested `if`/`case`).

5. **What is a “pipe” good for?**
   It expresses a sequence of transformations in a data-first style, improving readability and reducing temporary variables.

## Advanced Questions (With Answers)

1. **When does pattern matching become a maintainability risk?**
   When clauses become too clever or too many shapes are accepted implicitly. Prefer fewer public shapes and normalize inputs early.

2. **How do you decide between raising and returning `{:error, reason}`?**
   Raise for programmer errors and invariants that should never happen; return error tuples for expected runtime failures (validation, external calls).

3. **Why is `with` preferred for chaining “may fail” steps?**
   It reads linearly, short-circuits on the first non-matching step, and keeps error propagation explicit without deep nesting.

4. **What’s a common footgun with atoms?**
   Atoms are not garbage collected. Converting untrusted user input into atoms (`String.to_atom/1`) can exhaust the atom table and crash the VM.

5. **How does immutability interact with performance?**
   Elixir/BEAM uses structural sharing for many operations, but you still need to avoid unnecessary copying of large binaries and avoid building huge intermediate lists.
