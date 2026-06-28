# Advanced Types & Type Guards

## Union & Intersection Types

```ts
// Union — value is one of the types
type StringOrNumber = string | number;

// Intersection — value has all properties of both types
type AdminUser = User & { adminLevel: number };
```

## Discriminated Unions

A pattern for safe, exhaustive branching. Every member shares a literal type on a common property (the "discriminant").

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':   return Math.PI * s.radius ** 2;
    case 'rect':     return s.width * s.height;
    case 'triangle': return 0.5 * s.base * s.height;
    default:
      const _exhaustive: never = s;  // compile error if a case is missed
      throw new Error(`Unhandled shape: ${_exhaustive}`);
  }
}
```

## Type Guards

Narrow a broad type to a specific one at runtime.

### `typeof` and `instanceof`

```ts
function format(value: string | number): string {
  if (typeof value === 'string') return value.toUpperCase();
  return value.toFixed(2);
}

function processError(e: unknown) {
  if (e instanceof Error) console.error(e.message);
  else console.error(String(e));
}
```

### Custom Type Guard (`is`)

```ts
interface Cat { meow(): void; }
interface Dog { bark(): void; }

function isCat(pet: Cat | Dog): pet is Cat {
  return (pet as Cat).meow !== undefined;
}

function handlePet(pet: Cat | Dog) {
  if (isCat(pet)) {
    pet.meow();   // narrowed to Cat
  } else {
    pet.bark();   // narrowed to Dog
  }
}
```

### `in` Operator Guard

```ts
function printId(id: { id: number } | { uid: string }) {
  if ('id' in id) {
    console.log(id.id);    // narrowed
  } else {
    console.log(id.uid);
  }
}
```

## Assertion Functions

```ts
function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') throw new TypeError('Expected string');
}

let val: unknown = getValue();
assertIsString(val);
val.toUpperCase();   // val is now string
```

## Literal Types & `as const`

```ts
const config = {
  endpoint: '/api',
  timeout: 5000,
  methods: ['GET', 'POST'] as const,
} as const;
// Type is deeply readonly with literal types, not just string/number

type Method = typeof config.methods[number];  // 'GET' | 'POST'
```

## Satisfies Operator (TS 4.9+)

```ts
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>;
// Type is preserved as-is, but checked against the constraint
palette.red.map(x => x);   // still number[], not string | number[]
```

## Interview Questions

**Q: What is a discriminated union and why is it useful?**
A discriminated union is a union type where each member has a common literal-typed field. This lets TypeScript narrow to a specific member inside a type guard. It replaces fragile runtime `if/else instanceof` chains with exhaustive, compiler-verified `switch` statements.

**Q: What does the `never` type signal in a switch default branch?**
Assigning the switch variable to `never` makes the compiler error if any union member wasn't handled. If you add a new variant to the union without updating the switch, the default branch becomes reachable, making `s` assignable to the new variant but not to `never` — a compile-time exhaustiveness check.

**Q: What is the difference between a type assertion (`as`) and a type guard?**
A type assertion (`value as string`) is a compile-time instruction that tells TypeScript "trust me, this is the type" — it does no runtime check and can mask bugs. A type guard is a runtime check that narrows the type, keeping both the runtime behaviour and the static type in sync.
