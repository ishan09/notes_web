# Generics

Generics let you write reusable, type-safe code that works with many types rather than a single one.

## Generic Functions

```ts
function identity<T>(value: T): T {
  return value;
}

identity<string>('hello');   // explicit
identity(42);                // inferred: identity<number>
```

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((item, i) => [item, b[i]]);
}
```

## Generic Interfaces & Classes

```ts
interface Repository<T> {
  findById(id: number): Promise<T>;
  save(entity: T): Promise<T>;
  delete(id: number): Promise<void>;
}

class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  isEmpty(): boolean { return this.items.length === 0; }
}

const stack = new Stack<number>();
```

## Constraints

Use `extends` to restrict what types `T` can be.

```ts
// T must have a `length` property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest('hello', 'hi');          // string
longest([1, 2, 3], [1]);         // number[]
// longest(1, 2);               // Error — number has no length

// Constrain to object keys
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const name = getProperty({ name: 'Alice', age: 30 }, 'name');  // string
```

## Default Type Parameters

```ts
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message: string;
}

const res: ApiResponse = { data: {}, status: 200, message: 'ok' };      // T = unknown
const res2: ApiResponse<User> = { data: user, status: 200, message: '' };
```

## Conditional Types

```ts
type IsArray<T> = T extends any[] ? true : false;

type A = IsArray<string[]>;   // true
type B = IsArray<string>;     // false

// Infer — extract a type from within another type
type UnpackArray<T> = T extends (infer U)[] ? U : T;

type C = UnpackArray<string[]>;   // string
type D = UnpackArray<number>;     // number
```

## Mapped Types

```ts
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Remapping keys (TS 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

## Interview Questions

**Q: What is `keyof` and how is it used with generics?**
`keyof T` produces a union of all public property names of type `T`. Combined with generics it creates type-safe property access: `function get<T, K extends keyof T>(obj: T, key: K): T[K]` ensures `key` is always a valid key of `obj`.

**Q: What is the difference between `T extends object` and `T extends {}`?**
`T extends {}` matches any non-null, non-undefined value (including primitives). `T extends object` matches only actual objects (excludes primitives like `string`, `number`). Use `T extends Record<string, unknown>` to mean "a plain object with unknown values."

**Q: What are conditional types used for?**
They allow type-level branching: `T extends SomeType ? TypeA : TypeB`. Common uses: extracting inner types (`Awaited<T>`, `ReturnType<T>`), filtering union members, and creating type utilities that behave differently based on the input type.
