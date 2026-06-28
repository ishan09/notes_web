# Utility Types & Type Manipulation

TypeScript ships with a set of built-in generic utility types that cover the most common type transformations.

## Object Utility Types

```ts
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties required (reverses optional)
type RequiredUser = Required<User>;

// Make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick a subset of properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Remove specific properties
type PublicUser = Omit<User, 'role'>;

// Record<Keys, Value> — object type with specific keys and uniform value type
type RoleMap = Record<'admin' | 'user' | 'guest', string[]>;
```

## Union / Function Utility Types

```ts
// Extract members from a union assignable to U
type StringOrNumber = string | number | boolean;
type OnlyStrNum = Extract<StringOrNumber, string | number>;  // string | number

// Remove members from a union assignable to U
type NotBoolean = Exclude<StringOrNumber, boolean>;  // string | number

// Non-nullable — removes null and undefined
type Name = string | null | undefined;
type DefiniteName = NonNullable<Name>;  // string

// Return type of a function
type Result = ReturnType<typeof fetchUser>;  // Promise<User>

// Parameter types as a tuple
type Params = Parameters<typeof fetchUser>;  // [id: number]

// Awaited — unwrap Promise type (TS 4.5+)
type UserData = Awaited<ReturnType<typeof fetchUser>>;  // User
```

## Template Literal Types

```ts
type EventName = 'click' | 'focus' | 'blur';
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

type CSSProperty = 'margin' | 'padding';
type CSSDir = 'Top' | 'Right' | 'Bottom' | 'Left';
type CSSExpanded = `${CSSProperty}${CSSDir}`;
// "marginTop" | "marginRight" | ... | "paddingLeft"
```

## Building Custom Utility Types

```ts
// Deep partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Make only specific keys optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Require exactly one of a set of keys
type RequireOne<T, K extends keyof T = keyof T> =
  K extends any ? Required<Pick<T, K>> & Partial<Omit<T, K>> : never;
```

## Interview Questions

**Q: What is the difference between `Pick` and `Omit`?**
Both create a subset of an object type. `Pick<T, K>` keeps only the keys listed in `K`. `Omit<T, K>` keeps all keys except those in `K`. Use `Pick` when you know what you want; use `Omit` when it's easier to describe what to remove.

**Q: How does `Extract<T, U>` differ from `Exclude<T, U>`?**
`Exclude<T, U>` removes from `T` the union members assignable to `U`. `Extract<T, U>` keeps only the members assignable to `U`. They are inverses: `Exclude<A | B | C, B | C>` = `A`, `Extract<A | B | C, B | C>` = `B | C`.

**Q: What is `Awaited<T>` and when do you need it?**
`Awaited<T>` recursively unwraps `Promise` types, returning the resolved value's type. It's useful when you have `ReturnType<typeof asyncFn>` which gives `Promise<User>` and you need `User`. Before TS 4.5, you'd write `ReturnType<typeof fn> extends Promise<infer R> ? R : never` manually.
