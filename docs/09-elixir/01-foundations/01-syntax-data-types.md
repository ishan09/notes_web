# Syntax and Data Types

Elixir runs on the BEAM VM and uses a small set of expressive data structures. The language is functional, immutable, and designed to make transformations easy to read.

## Core Concepts

- **Atoms**: Named constants such as `:ok`, `:error`, and `:user`.
- **Integers and floats**: Numeric values for math and counters.
- **Binaries and strings**: Strings are UTF-8 binaries, not arrays of characters.
- **Lists**: Linked lists, best for sequential traversal and prepending.
- **Tuples**: Fixed-size values, often used for return values like `{:ok, value}`.
- **Maps**: Key-value structures for dynamic data.
- **Structs**: Typed maps for domain entities.
- **Keyword lists**: Ordered lists of key-value tuples, useful for options.

## Practical Notes

- Prefer atoms for stable identifiers and return tags.
- Use lists when you need head/tail recursion or simple pipelines.
- Use maps for flexible data and structs for business entities.
- Treat data as immutable. Updates return new values rather than mutating in place.

## Lists vs Tuples (Internal Shape, Complexity, When To Use)

### Lists

- **Mental model**: linked list (`[head | tail]`), implemented as cons cells.
- **Strengths**: prepend is cheap; recursion and sequential traversal are natural.
- **Costs**: random access is slow; length is linear; appending (`list ++ [x]`) is linear.

Typical complexity:

- Prepend: O(1)
- Pattern match head/tail: O(1)
- Index (`Enum.at/2`): O(n)
- Append with `++`: O(n) to traverse left operand

### Tuples

- **Mental model**: fixed-size “record-like” container, stored as a contiguous fixed-size structure.
- **Strengths**: good for small fixed shapes (return values, internal fixed records).
- **Costs**: updating an element conceptually creates a new tuple (and cost grows with size).

Typical complexity (practical perspective):

- Access by index: effectively O(1)
- Updating an element: grows with tuple size; keep tuples small in hot paths

### When To Use Which

- Use **list** for sequences you traverse, transform, or pattern match incrementally.
- Use **tuple** for fixed-shape values (especially `{:ok, value}`, `{:error, reason}`).
- Avoid very large tuples as “struct replacements”; use structs/maps for domain data.

## Maps vs Keyword Lists (Differences, When To Use Keyword Lists)

### Keyword Lists

- **What they are**: lists of `{key, value}` tuples where keys are atoms.
- **Properties**: ordered; can contain duplicate keys; idiomatic for options.
- **Cost**: lookup is O(n), so they don’t scale for large key sets.

Use keyword lists for:

- Function options, especially when you want ordering or duplicates (rare but supported).
- DSL-ish APIs where `do:` blocks and options fit natural syntax.

Avoid keyword lists for:

- Large dictionaries, frequent lookups, or core domain entities.

### Maps

- **What they are**: key-value structure optimized for lookup and updates. Internally, BEAM uses different representations for small vs large maps (the details vary by runtime version, but the practical takeaway is stable: maps scale better than keyword lists for lookups).
- **Properties**: keys can be many types; no duplicate keys; generally better for data modeling.
- **Use**: domain data, payloads, and general-purpose dictionaries.

## Example

```elixir
user = %{name: "Asha", role: :admin, active: true}

updated_user = %{user | active: false}
```

## Common Questions (With Answers)

1. **When would you use a tuple instead of a map?**
   Use tuples for small fixed-shape data, especially return values like `{:ok, value}`. Use maps when you need named keys and flexible shape.

2. **Why are lists efficient for prepending but not random access?**
   Lists are linked lists. Prepending is O(1), but indexing requires traversal and is O(n).

3. **What is the difference between a map and a struct?**
   A struct is a map with a fixed set of keys and a module name (`__struct__`). It provides safer shape and clearer domain intent.

4. **What is the difference between a string and a charlist?**
   Strings are UTF-8 binaries. Charlists are lists of codepoints. Most modern Elixir code prefers strings unless interacting with older Erlang APIs.

5. **Why should you avoid creating atoms from user input?**
   Atoms are not garbage collected; creating unbounded atoms can exhaust the atom table and crash the VM.

## Equality: `==` vs `===`

- `==` is **value equality** with a special case: it treats integers and floats as comparable numeric values.
  - Example: `1 == 1.0` is `true`
- `===` is **strict equality** (also called “exact equality”): types must match.
  - Example: `1 === 1.0` is `false`

The corresponding negations are `!=` and `!==`.

Practical rules:

- `==` and `===` behave the same except for **numeric type strictness** (`integer` vs `float`).
- There is no “string to atom” or “string to number” coercion for equality:
  - `:1 == "1"` is `false`
  - `"1" == 1` is `false`

## Advanced Questions (With Answers)

1. **What is the cost model of copying large binaries?**
   BEAM optimizes binaries, but careless concatenation or slicing patterns can retain large underlying binaries or copy unexpectedly; measure and avoid building large intermediate binaries.

2. **When are keyword lists preferred over maps?**
   Keyword lists preserve order, allow duplicate keys, and are idiomatic for options. They are O(n) lookup, so don’t use them for large key sets.

3. **How does structural sharing help with immutability?**
   Updates can reuse most of the existing structure (especially for lists and maps) rather than copying everything, reducing allocation overhead.

4. **What is a common pitfall with updating nested maps?**
   Naive updates can get verbose; use `put_in/3`, `update_in/3`, and careful normalization, but avoid deeply nested data when a clearer domain model is possible.

5. **Why can large maps in GenServer state be problematic?**
   Each message handling step creates a new state value; very large state increases GC pressure and can cause latency spikes.
