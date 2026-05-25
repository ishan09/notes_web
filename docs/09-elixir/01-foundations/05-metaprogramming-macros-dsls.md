# Metaprogramming: Macros and DSLs

Elixir supports metaprogramming via macros. Macros run at compile time and transform quoted Elixir AST into other AST.

## Core Concepts

- **Macros are compile-time**: they execute during compilation, not at runtime.
- **Quoted AST**: `quote` turns code into data (AST), `unquote` injects values into AST.
- **Hygiene**: Elixir tries to avoid variable capture; you can opt into advanced behavior intentionally.
- **`__using__/1`**: a common way to provide “DSL-like” functionality to modules via `use`.
- **DSLs**: macros can make declarative APIs, but overuse harms debuggability.

## Minimal Macro Example

```elixir
defmodule MyDSL do
  defmacro hello(name_ast) do
    quote do
      "hello, " <> to_string(unquote(name_ast))
    end
  end
end

defmodule Demo do
  import MyDSL
  def run, do: hello("world")
end
```

## Practical Guidance

- Use macros only when functions cannot express the intent (for example, to transform code, inject definitions, or build compile-time checks).
- Keep macro outputs simple and predictable.
- Provide good error messages using `raise` with clear context when macro inputs are invalid.
- Favor a small macro surface area with normal functions under the hood.

## Common Pitfalls

- Hard-to-debug call sites due to transformed code
- Compile-time side effects (reading env, IO) that make builds non-reproducible
- Unintended variable capture or confusing scoping
- DSLs that hide control flow and make refactors risky

## Common Questions (With Answers)

1. **What is a macro in Elixir?**
   A compile-time function that receives AST (not values) and returns AST that the compiler then compiles.

2. **When should you prefer a function over a macro?**
   Almost always. Use a macro only when you need to generate code or work with AST.

3. **What is `quote` and `unquote`?**
   `quote` captures code as AST; `unquote` injects a value or AST into a quoted expression.

4. **What does `use SomeModule` do?**
   It calls `SomeModule.__using__/1` (a macro) which can inject functions, imports, aliases, and module attributes into the caller.

5. **What’s a good example of a justified macro?**
   Building a small declarative DSL (routes, schema declarations, validations) where the macro expands into predictable function definitions.

## Advanced Questions (With Answers)

1. **Why can macros make builds brittle?**
   Because they run at compile time. If they read the environment, current time, filesystem, or network, compilation becomes non-deterministic.

2. **What does “hygiene” mean and when do you break it?**
   Hygiene prevents accidental variable capture between macro and caller scopes. You break it only when you intentionally want caller bindings, and you document it clearly.

3. **How do you debug macro expansions?**
   Inspect the expanded AST using `Macro.expand/2` and `Macro.to_string/1`, or use tooling that shows macro expansion. Keep macro expansions small so they’re inspectable.

4. **Why do DSL-heavy codebases become hard to maintain?**
   They hide control flow and make it unclear what code actually runs. This increases onboarding cost and makes refactors and static analysis harder.

5. **What are the performance implications of macros?**
   Runtime performance usually improves if macros eliminate runtime branching, but compile times can increase and error messages can degrade if macros are complex.
