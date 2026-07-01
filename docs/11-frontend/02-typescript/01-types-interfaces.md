# Types, Interfaces & Type Aliases

## Primitive Types

```ts
let name: string = 'Alice';
let age: number = 30;
let active: boolean = true;
let data: unknown = fetchSomething();   // safe unknown — must narrow before use
let anything: any = 'oops';             // opt-out of type checking — avoid
let noop: void = undefined;             // function return type for side-effects only
let impossible: never;                  // value that never exists (e.g. exhaustive switch)
```

## Arrays & Tuples

```ts
const nums: number[] = [1, 2, 3];
const strs: Array<string> = ['a', 'b'];

// Tuple — fixed length, known types at each position
const point: [number, number] = [10, 20];
const entry: [string, number] = ['age', 30];

// Labeled tuple (TS 4.0+)
type Range = [start: number, end: number];
```

## Interfaces

```ts
interface User {
  readonly id: number;      // cannot be reassigned after creation
  name: string;
  email?: string;           // optional property
}

// Interfaces can be extended
interface AdminUser extends User {
  role: 'admin' | 'superadmin';
  permissions: string[];
}

// Declaration merging — interfaces of the same name merge
interface Window {
  myCustomProp: string;     // extends the global Window interface
}
```

## Type Aliases

```ts
type ID = string | number;
type Nullable<T> = T | null;
type Handler = (event: Event) => void;

// Object type alias
type Point = { x: number; y: number };

// Intersection types — combine multiple types
type AdminUser = User & { role: string };
```

## `interface` vs `type` — When to Use Which

| Feature | `interface` | `type` |
|---|---|---|
| Declaration merging | Yes | No |
| `extends` keyword | Yes | No (use `&`) |
| Union types | No | Yes |
| Computed / mapped types | No | Yes |
| Primitive aliases | No | Yes |

**Rule of thumb**: Use `interface` for object shapes and public APIs (supports declaration merging). Use `type` for unions, intersections, and computed types.

## Enums

```ts
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

function move(dir: Direction) { ... }
move(Direction.Up);

// Const enums — inlined at compile time, zero runtime cost
const enum Status { Active, Inactive }
```

## Interview Questions

**Q: What is the difference between `unknown` and `any`?**
Both can hold any value, but `unknown` forces you to narrow the type before using it (type-safe). `any` bypasses all type checking — it's an escape hatch that defeats TypeScript's purpose. Prefer `unknown` when the type is genuinely not known upfront.

**Q: Can a `type` alias extend an `interface`?**
Yes, using intersections: `type AdminUser = User & { role: string }`. Likewise, an `interface` can extend a type alias: `interface AdminUser extends UserType { role: string }`.

**Q: What is declaration merging?**
When TypeScript sees two `interface` declarations with the same name, it merges their members into a single type. This is how you extend built-in types like `Window` or third-party interfaces. `type` aliases do not support merging — a duplicate name is an error.
