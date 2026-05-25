# Collections and Functional Style

Elixir's standard library encourages working with collections through high-level functions instead of manual iteration.

## Core Concepts

- **Enum** for eager enumeration
- **Stream** for lazy composition
- **Enum.map/2**, `Enum.filter/2`, `Enum.reduce/3` for common transformations
- **Comprehensions** for readable collection building
- **Immutability** for predictable code and safer concurrency

## Enum — Eager, Immediate Results

`Enum` works on anything that implements the `Enumerable` protocol: lists, maps, ranges, streams.

```elixir
numbers = [1, 2, 3, 4, 5, 6]

# map — transform each element
Enum.map(numbers, fn n -> n * 2 end)
# [2, 4, 6, 8, 10, 12]

# filter — keep matching elements
Enum.filter(numbers, fn n -> rem(n, 2) == 0 end)
# [2, 4, 6]

# reduce — fold into a single value
Enum.reduce(numbers, 0, fn n, acc -> acc + n end)
# 21

# Short-circuit: any? / all?
Enum.any?(numbers, fn n -> n > 5 end)  # true
Enum.all?(numbers, fn n -> n > 0 end)  # true

# group_by — group into a map keyed by result
Enum.group_by(numbers, fn n -> rem(n, 2) == 0 end)
# %{true => [2, 4, 6], false => [1, 3, 5]}

# flat_map — map then flatten one level
Enum.flat_map([[1, 2], [3, 4]], fn list -> list end)
# [1, 2, 3, 4]

# zip — pair elements from two lists
Enum.zip([1, 2, 3], [:a, :b, :c])
# [{1, :a}, {2, :b}, {3, :c}]

# take / drop
Enum.take(numbers, 3)   # [1, 2, 3]
Enum.drop(numbers, 3)   # [4, 5, 6]

# chunk_every — batch into sublists
Enum.chunk_every(numbers, 2)
# [[1, 2], [3, 4], [5, 6]]
```

### Capture syntax shorthand

```elixir
# These are equivalent:
Enum.map(numbers, fn n -> n * 2 end)
Enum.map(numbers, &(&1 * 2))

# Named function reference (arity must match — map passes 1 arg)
Enum.map(["hello", "world"], &String.upcase/1)
# ["HELLO", "WORLD"]
```

## Stream — Lazy, Composable, Memory-Efficient

`Stream` builds a computation description — nothing runs until you consume it (with `Enum.*`, `Stream.run/1`, etc.).

```elixir
# Without Stream — builds TWO intermediate lists
[1..1_000_000]
|> Enum.filter(&(rem(&1, 2) == 0))  # builds list of 500k elements
|> Enum.map(&(&1 * 3))              # builds another list of 500k elements
|> Enum.take(5)
# [6, 12, 18, 24, 30]

# With Stream — processes one element at a time, stops at 5
1..1_000_000
|> Stream.filter(&(rem(&1, 2) == 0))  # lazy — nothing runs yet
|> Stream.map(&(&1 * 3))             # lazy — still nothing runs
|> Enum.take(5)                      # triggers evaluation, stops after 5 elements
# [6, 12, 18, 24, 30]
```

### Stream for infinite sequences

```elixir
# Infinite stream of sequential IDs
Stream.iterate(1, &(&1 + 1))
|> Stream.take(5)
|> Enum.to_list()
# [1, 2, 3, 4, 5]

# Infinite stream from a function
Stream.repeatedly(fn -> :rand.uniform(100) end)
|> Stream.take(3)
|> Enum.to_list()
# [42, 17, 88]  (random)
```

### Stream for file reading (classic use case)

```elixir
# Read a 2GB file line by line — never loads the whole file into memory
File.stream!("huge_file.log")
|> Stream.filter(&String.contains?(&1, "ERROR"))
|> Stream.map(&String.trim/1)
|> Enum.to_list()
```

## Comprehensions

`for` builds a new collection from generators and filters.

```elixir
# Basic comprehension
result = for n <- 1..5, do: n * 2
# [2, 4, 6, 8, 10]

# With filter
evens = for n <- 1..10, rem(n, 2) == 0, do: n
# [2, 4, 6, 8, 10]

# Multiple generators (Cartesian product)
pairs = for x <- 1..3, y <- [:a, :b], do: {x, y}
# [{1, :a}, {1, :b}, {2, :a}, {2, :b}, {3, :a}, {3, :b}]

# Map comprehension — into: %{}
squares = for n <- 1..5, into: %{}, do: {n, n * n}
# %{1 => 1, 2 => 4, 3 => 9, 4 => 16, 5 => 25}

# String/binary comprehension
for <<byte <- "hello">>, do: byte
# [104, 101, 108, 108, 111]
```

## Reduce — The Swiss Army Knife

`reduce` can implement any other Enum function. Use it when you need custom accumulation.

```elixir
# Sum (same as Enum.sum)
Enum.reduce([1, 2, 3], 0, fn n, acc -> acc + n end)  # 6

# Build a frequency map
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
Enum.reduce(words, %{}, fn word, acc ->
  Map.update(acc, word, 1, &(&1 + 1))
end)
# %{"apple" => 3, "banana" => 2, "cherry" => 1}

# Partition into two lists (same as Enum.split_with)
{evens, odds} = Enum.reduce(1..6, {[], []}, fn n, {e, o} ->
  if rem(n, 2) == 0, do: {[n | e], o}, else: {e, [n | o]}
end)
# evens: [6, 4, 2] (reversed — prepend is cheap, reverse at end if order matters)
```

## Working with Maps

```elixir
users = %{"alice" => 25, "bob" => 30, "carol" => 22}

# Map over a map — returns a list of {key, value} results
Enum.map(users, fn {name, age} -> "#{name} is #{age}" end)
# ["alice is 25", "bob is 30", "carol is 22"]

# Filter a map — keeps key-value pairs
Enum.filter(users, fn {_name, age} -> age >= 25 end)
# [{"alice", 25}, {"bob", 30}]  ← returns list of tuples, not a map!

# To keep result as a map:
users
|> Enum.filter(fn {_name, age} -> age >= 25 end)
|> Map.new()
# %{"alice" => 25, "bob" => 30}
```

## Practical Notes

- Use `Enum` when you want the result immediately.
- Use `Stream` when composing multiple steps over large or infinite data.
- Favor transformation pipelines over mutation-heavy loops.

## Common Questions (With Answers)

1. **What is the difference between `Enum` and `Stream`?**
   `Enum` is eager and produces results immediately. `Stream` is lazy and composes steps that run when the stream is consumed.

2. **Why does immutability make concurrent code easier?**
   There is no shared mutable state to coordinate with locks; processes communicate by message passing and data cannot be mutated unexpectedly.

3. **When would you use `reduce` instead of `map`?**
   When you need to accumulate into a single result (sum, grouping, building a map), or when you need custom accumulator logic.

4. **When are comprehensions preferable?**
   When you want a compact expression to build a collection from one or more inputs with filters and transformations.

5. **Why is `Stream` useful for large data?**
   It avoids building intermediate lists, reducing memory usage and GC pressure.

## Advanced Questions (With Answers)

1. **What is a hidden cost of chaining many `Enum` calls?**
   Each call can allocate intermediate lists. For large collections, prefer `Stream` or a single `reduce` when appropriate.

2. **How do you choose between `Enum.reduce` and recursion?**
   Prefer `Enum.reduce` for clarity and consistency. Use recursion for highly specialized loops or when controlling pattern matching at each step is valuable.

3. **When is `Stream` a bad idea?**
   When the overhead or delayed execution complicates debugging, or when you actually need all results immediately anyway.

4. **How does garbage collection behavior influence collection processing?**
   Many short-lived intermediate lists increase allocation and per-process GC work, which can show up as latency under load.

5. **What is a practical technique to reduce intermediate allocations?**
   Fuse transformations using `Stream`, or combine steps in a single `reduce` that builds the target structure directly.
