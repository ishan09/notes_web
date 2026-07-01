# Core Language & ES6+

## Data Types

JavaScript has 8 data types: `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `symbol`, and `object`. Everything else (arrays, functions, dates) is an object.

```js
typeof null        // "object"  — historical bug, never fixed
typeof undefined   // "undefined"
typeof function(){} // "function"  — special case of object
typeof []          // "object"
```

## `var` vs `let` vs `const`

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Hoisted | Yes (initialized to `undefined`) | Yes (TDZ) | Yes (TDZ) |
| Re-declarable | Yes | No | No |
| Re-assignable | Yes | Yes | No |

```js
console.log(x); // undefined — var is hoisted
var x = 5;

console.log(y); // ReferenceError — TDZ
let y = 5;
```

## Destructuring & Spread

```js
// Array destructuring
const [a, b, ...rest] = [1, 2, 3, 4];

// Object destructuring with rename and default
const { name: firstName = 'Anonymous', age } = user;

// Spread — shallow copy
const merged = { ...defaults, ...overrides };
const copy = [...arr, newItem];
```

## Optional Chaining & Nullish Coalescing

```js
const city = user?.address?.city;          // undefined if any link is null/undefined
const label = value ?? 'default';          // 'default' only if value is null/undefined
const count = obj?.items?.length ?? 0;
```

`??` differs from `||`: `0`, `''`, and `false` are falsy but not nullish, so `0 ?? 'x'` returns `0` while `0 || 'x'` returns `'x'`.

## Template Literals & Tagged Templates

```js
const msg = `Hello, ${user.name}! You have ${unread} messages.`;

// Tagged template — function receives string parts and interpolated values
function highlight(strings, ...values) {
  return strings.reduce((acc, str, i) =>
    acc + str + (values[i] !== undefined ? `<b>${values[i]}</b>` : ''), '');
}
const result = highlight`Hello ${name}, you have ${count} items`;
```

## Short-circuit Evaluation

```js
// && returns first falsy or last value
a && b   // b if a is truthy, else a

// || returns first truthy or last value
a || b   // a if a is truthy, else b

// Common patterns
doSomething && doSomething();
const val = cache || computeExpensiveValue();
```

## Symbol

Symbols are unique, immutable primitives useful as object keys that won't clash.

```js
const id = Symbol('id');
const obj = { [id]: 123 };
obj[id];          // 123
obj['id'];        // undefined — not the same key
Symbol('id') === Symbol('id');  // false — always unique
```

## Interview Questions

**Q: What is the difference between `==` and `===`?**
`===` (strict equality) compares type and value. `==` (loose equality) coerces types before comparing. Prefer `===` to avoid unexpected coercions like `0 == ''` being `true`.

**Q: What does `typeof null` return and why?**
It returns `"object"` due to a bug in the original JavaScript implementation that was never fixed for backwards compatibility. Use `value === null` to check for null.

**Q: What are the falsy values in JavaScript?**
`false`, `0`, `-0`, `0n` (BigInt zero), `""` (empty string), `null`, `undefined`, and `NaN`.
