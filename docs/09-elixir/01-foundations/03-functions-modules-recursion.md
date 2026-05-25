# Functions, Modules, and Recursion

Elixir code is organized into modules, and most logic is written as pure functions.

## Core Concepts

- **Modules** group related functions.
- **Named functions** have an arity, such as `sum/2`.
- **Private functions** help hide implementation details.
- **Recursion** replaces many looping patterns.
- **Pipes** improve readability for data transformation chains.
- **Anonymous functions** are values (often closures) used as callbacks.

## Example

```elixir
defmodule MathOps do
  def sum([]), do: 0
  def sum([head | tail]), do: head + sum(tail)
end
```

## Anonymous vs Named Functions (Usage, Performance, Closures)

- **Named functions** (`Mod.fun/arity`) are your primary API surface.
- **Anonymous functions** (`fn -> ... end`, `&capture/arity`) are used for callbacks, composition, and higher-order functions.

Closures capture surrounding variables:

```elixir
n = 10
add_n = fn x -> x + n end
add_n.(5) # 15
```

Performance guidance (practical):

- The dominant factors are algorithmic complexity, allocations, and concurrency architecture.
- Closures can retain captured data; avoid capturing large structures in long-lived processes.

## Recursion: Why “No Loops”? How Is It Efficient?

Elixir favors recursion and library iterators (`Enum`, `Stream`) over imperative loop constructs.

- **Tail recursion** (with accumulators) avoids stack growth.
- Many common iterations are better expressed with `Enum` for clarity and are implemented efficiently.

Tail-recursive pattern:

```elixir
def sum(list), do: do_sum(list, 0)
defp do_sum([], acc), do: acc
defp do_sum([h | t], acc), do: do_sum(t, acc + h)
```

## Design Notes

- Keep functions small and focused.
- Prefer pure functions unless you need state or I/O.
- Use recursion with accumulators for performance on large lists.
- Use pipelines to express step-by-step transformations.

## Common Questions (With Answers)

1. **What does the `/2` in `sum/2` mean?**
   It is the function arity: the number of arguments the function takes.

2. **Why is recursion common in Elixir?**
   Because data is immutable and Elixir avoids imperative loops; recursion and higher-order functions express iteration naturally.

3. **When should you avoid deeply recursive code?**
   When it risks stack growth or hurts readability. Prefer library functions (`Enum`, `Stream`) or tail-recursive loops with accumulators.

4. **What is tail recursion and why does it matter?**
   Tail recursion lets the runtime optimize recursion by reusing stack frames. It matters for large loops to avoid stack overflow.

5. **How do you design a public module API in Elixir?**
   Expose a small set of stable functions, keep helpers private, and accept/return consistent data shapes.

6. **When should you use anonymous functions?**
   When passing behavior as data (callbacks for `Enum`, `Task`, `Stream`, etc.), or when you need a small local transformation without promoting it to a module API.

7. **Are anonymous functions “slower” than named functions?**
   Not meaningfully for most application code. Focus on algorithmic and architectural bottlenecks. The bigger risk is memory retention from captured environments.

## Advanced Questions (With Answers)

1. **What’s a common mistake with pipelines?**
   Over-pipelining can hide important branching or error handling. Use `with`/`case` when control flow matters more than linear transformation.

2. **Why do function heads improve maintainability?**
   They encode valid shapes at the boundary, reduce branching in the body, and produce clearer failure modes.

3. **How do you handle optional options in APIs?**
   Use keyword list options with defaults; validate options early and document them.

4. **When does recursion become slower than `Enum`?**
   Often for complex transformations, `Enum` is implemented efficiently in Erlang/Elixir internals and can be clearer. Measure performance rather than guessing.

5. **How do you avoid “stringly typed” interfaces?**
   Prefer atoms and structs for internal APIs. Avoid converting external strings to atoms; map them to known atoms safely.

6. **Do closures have a memory cost?**
   Yes. A closure captures an environment. Capturing large data can retain it longer than expected and increase GC pressure, especially in long-lived processes.

7. **When is custom recursion a performance win over `Enum`?**
   Occasionally in hot paths where you can fuse multiple passes and avoid intermediate allocations. Profile first; `Enum` is often “fast enough” and clearer.
