# Pattern Matching and Control Flow

Pattern matching is one of Elixir's most important features. It is used for assignment, branching, and function selection.

## Core Concepts

- **Assignment by matching**: `=` tries to make both sides fit.
- **Function head matching**: Different clauses can match different input shapes.
- **Case expressions**: Clean branching on values and patterns.
- **Guards**: Extra conditions on top of a pattern.
- **Pin operator**: `^` forces a variable to match an existing value.

## Example

```elixir
defmodule Status do
  def describe({:ok, value}), do: "Success: #{value}"
  def describe({:error, reason}), do: "Failure: #{reason}"
end
```

## Pattern Matching vs Assignment (With Your Examples)

Elixir uses `=` for **pattern matching**. It destructures data and binds variables if they are unbound.

```elixir
{a, b} = {1, 2}
# a = 1, b = 2
```

If the same variable appears twice in the pattern, it must match the same value both times:

```elixir
{a, a} = {1, 1}   # ok, a = 1
# {a, a} = {1, 2} # raises MatchError
```

Rebinding is allowed, so if you want to match an existing binding you use the **pin operator**:

```elixir
a = 1
{^a, b} = {1, 2}  # ok
# {^a, b} = {2, 2} # MatchError
```

## Why It Matters

- Reduces nested `if` and `else` blocks
- Makes valid input shapes explicit
- Encourages safer handling of success and failure cases
- Fits naturally with Elixir's tuple-based result conventions

## Common Control Flow Tools

- `case` for branching on multiple outcomes
- `cond` for boolean conditions
- `with` for chaining operations that may fail

## Common Questions (With Answers)

1. **How does pattern matching differ from assignment in imperative languages?**
   It matches shapes and can destructure data. It can fail and raise, rather than always assigning.

2. **When is `with` better than nested `case` statements?**
   When you have a sequence of steps that return tagged tuples and you want linear flow with early exit on failure.

3. **Why is the pin operator useful?**
   It forces a variable to match an existing value, preventing accidental rebinding.

4. **What are guards and why are they important?**
   Guards add constraints to patterns (type checks and safe predicates), allowing more precise clause selection without complex nested conditions.

5. **What is selective receive and when is it risky?**
   `receive` can match only certain messages and leave others in the mailbox. Overuse can cause mailbox growth and subtle ordering issues.

## Advanced Questions (With Answers)

1. **How does function clause ordering affect correctness?**
   Clauses are tried top to bottom. A broad clause placed early can shadow more specific clauses, causing incorrect behavior.

2. **Why is `MatchError` sometimes preferable to returning `{:error, reason}`?**
   For programmer errors or invariants that should not be violated; it fails fast and surfaces the bug early.

3. **How do you handle mixed return types in `with`?**
   Normalize returns to a consistent tagged tuple interface, or add an `else` clause to map failures into a single shape.

4. **What is a good strategy for pattern matching on external input?**
   Validate and normalize at the boundary (controller/adapter) and pass a stable, internal data shape downstream.

5. **What is a common guard mistake?**
   Assuming guards can call any function. Guards are restricted to a subset of safe operations; keep complex validation in normal code.
