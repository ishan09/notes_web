# Property Testing and Confidence

Property-based testing checks general rules instead of only a few hard-coded examples.

## Core Concepts

- Define properties that should hold for many inputs
- Generate randomized data
- Catch edge cases that example-based tests might miss
- Use it for pure functions, transformations, and invariants

## Why It Matters

- Useful for functional code with clear invariants
- Finds hidden bugs in edge cases
- Strengthens confidence in data processing logic

## StreamData — The Standard Library

`StreamData` is Elixir's go-to property testing library (used with ExUnit).

```elixir
# mix.exs
{:stream_data, "~> 0.5", only: :test}
```

```elixir
defmodule MyApp.MathTest do
  use ExUnit.Case
  use ExUnitProperties   # enables property/3 macro from StreamData

  # Property: sorting is idempotent — sort(sort(list)) == sort(list)
  property "sorting a list twice gives the same result as sorting once" do
    check all list <- list_of(integer()) do
      once = Enum.sort(list)
      twice = Enum.sort(once)
      assert once == twice
    end
  end

  # Property: reversing twice returns original list
  property "reversing a list twice gives the original list" do
    check all list <- list_of(integer()) do
      assert Enum.reverse(Enum.reverse(list)) == list
    end
  end

  # Property: Enum.count always >= 0
  property "list length is never negative" do
    check all list <- list_of(term()) do
      assert length(list) >= 0
    end
  end
end
```

## Generators

Generators define what kind of data to produce:

```elixir
# Basic generators
integer()               # any integer
positive_integer()      # 1, 2, 3...
float()
boolean()
string(:alphanumeric)   # "abc123"
binary()                # raw bytes
atom(:alphanumeric)

# Composite generators
list_of(integer())              # [1, -3, 42, ...]
list_of(integer(), min_length: 1, max_length: 10)
map_of(string(:alphanumeric), integer())
tuple({integer(), string(:alphanumeric)})
one_of([integer(), string(:alphanumeric)])  # picks from a set of generators

# Constrained integers
integer(1..100)   # integers in the range 1..100
```

## Domain-Specific Generators

Build generators that model your domain:

```elixir
defp user_gen do
  gen all name <- string(:alphanumeric, min_length: 1),
          age <- integer(18..120),
          email <- string(:alphanumeric, min_length: 3) do
    %{name: name, age: age, email: "#{email}@example.com"}
  end
end

property "valid users always pass validation" do
  check all user <- user_gen() do
    assert {:ok, _} = MyApp.Accounts.validate_user(user)
  end
end
```

## Classic Property Patterns

### Round-trip (encode → decode → same value)

```elixir
property "JSON encode then decode returns the original map" do
  check all map <- map_of(string(:alphanumeric), integer()) do
    assert map == map |> Jason.encode!() |> Jason.decode!()
  end
end
```

### Idempotency (applying twice = applying once)

```elixir
property "normalizing user input is idempotent" do
  check all input <- string(:printable) do
    once = MyApp.normalize(input)
    twice = MyApp.normalize(once)
    assert once == twice
  end
end
```

### Commutativity (order doesn't matter)

```elixir
property "merging two maps is commutative for non-overlapping keys" do
  check all {a, b} <- {map_of(atom(:alphanumeric), integer()),
                        map_of(atom(:alphanumeric), integer())},
            map_size(Map.take(a, Map.keys(b))) == 0 do  # no overlapping keys
    assert Map.merge(a, b) == Map.merge(b, a)
  end
end
```

### Consistency invariant

```elixir
property "pagination returns correct slice of sorted list" do
  check all items <- list_of(integer(), min_length: 0),
            page <- integer(1..10),
            page_size <- integer(1..20) do
    result = MyApp.paginate(items, page: page, per_page: page_size)
    assert length(result) <= page_size
    assert result == Enum.sort(items) |> Enum.slice((page - 1) * page_size, page_size)
  end
end
```

## Shrinking in Practice

When a property test fails, StreamData automatically shrinks the failing case to the **smallest
input that still fails**:

```
Generated input: [5, 3, 19, -7, 42, 0, 1]  ← fails
Shrinking...
Shrunk to: [-7]  ← smallest input that still fails
```

This makes the actual bug obvious. Without shrinking, you'd get a random large input
that's hard to reason about.

## When to Use Property Tests vs Example Tests

| Situation | Use |
|-----------|-----|
| Known regression cases | Example test |
| Specific edge case you discovered | Example test |
| Function with clear invariants | Property test |
| Parser / serializer round-trips | Property test |
| Mathematical functions | Property test |
| Stateful system with complex interactions | Example tests (property testing stateful systems is advanced) |

## Common Questions (With Answers)

1. **What is a property test trying to prove?**
   That a general rule (an invariant) holds for many generated inputs, not just a few hand-picked examples.

2. **Why is randomized input useful?**
   It explores edge cases and unusual combinations you didn’t think to write by hand.

3. **Which kinds of functions are good candidates for property testing?**
   Pure functions, transformations, parsers, and logic with clear invariants like “round-trip encode/decode”.

4. **Does property testing replace unit tests?**
   No. It complements unit tests by covering broad input spaces; unit tests are still useful for specific scenarios and regressions.

5. **What’s a key risk with property tests?**
   Hard-to-debug failures if generators aren’t constrained well or if the property is poorly specified.

## Advanced Questions (With Answers)

1. **What is shrinking and why is it important?**
   When a test fails, shrinking finds the smallest input that still fails, making debugging much faster.

2. **How do you avoid flaky property tests?**
   Control randomness seeds when needed, ensure deterministic code under test, and avoid relying on external time or network.

3. **When should you avoid property testing?**
   When the system under test is stateful with complex side effects and you can’t express invariants cleanly. Use model-based testing only if you can afford complexity.

4. **How do you pick good generators?**
   Model realistic ranges and constraints, focus on boundary values, and ensure generated data respects domain rules.

5. **What’s a strong property for data transformations?**
   Round-trip invariants, idempotency, commutativity/associativity where applicable, and “no data loss” conditions.
