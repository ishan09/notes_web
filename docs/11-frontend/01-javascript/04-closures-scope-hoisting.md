# Closures, Scope & Hoisting

## Scope

JavaScript has three kinds of scope:

- **Global scope** — accessible everywhere
- **Function scope** — `var` declarations are scoped to the enclosing function
- **Block scope** — `let` and `const` are scoped to the enclosing `{}`

```js
function outer() {
  var x = 1;       // function-scoped
  let y = 2;       // block-scoped

  if (true) {
    var x = 10;    // same x — function scope
    let y = 20;    // different y — block scope
    console.log(x, y);  // 10 20
  }

  console.log(x, y);    // 10 2
}
```

## Hoisting

Variable and function declarations are moved to the top of their scope during compilation. Only the declaration is hoisted, not the initialisation.

```js
// What you write:
console.log(a);   // undefined
var a = 5;

// What the engine sees:
var a;            // hoisted
console.log(a);   // undefined
a = 5;
```

Function declarations are fully hoisted (both declaration and body):

```js
greet();          // "hello" — works before the declaration

function greet() {
  console.log('hello');
}

// Function expressions are NOT fully hoisted:
sayHi();          // TypeError: sayHi is not a function
var sayHi = function() { console.log('hi'); };
```

## Temporal Dead Zone (TDZ)

### What it is

When JavaScript compiles a scope, it registers **all** variable declarations — including `let` and `const` — before executing any code. This is the hoisting step. However, unlike `var` (which is immediately initialised to `undefined`), `let` and `const` bindings are left **uninitialised**.

The **Temporal Dead Zone** is the stretch of time (and code) between the start of the enclosing block and the line where the variable is actually declared. During the TDZ, the variable exists in scope but cannot be read or written — any access throws a `ReferenceError`.

```
{                        ← TDZ for x starts here
  console.log(x);       ← ReferenceError — x is in TDZ
  console.log(x);       ← still in TDZ
  let x = 5;            ← TDZ ends, x is now initialised to 5
  console.log(x);       ← 5 ✅
}
```

### Why `var` behaves differently

```js
console.log(a);   // undefined  — var hoisted AND initialised to undefined
var a = 10;
console.log(a);   // 10

console.log(b);   // ReferenceError — let is hoisted but NOT initialised (TDZ)
let b = 10;
```

The key distinction:

| | `var` | `let` / `const` |
|---|---|---|
| Hoisted? | Yes | Yes |
| Initialised on hoist? | Yes — as `undefined` | No — stays uninitialised |
| Accessible before declaration? | Yes (as `undefined`) | No — `ReferenceError` |

### TDZ and `typeof`

Normally `typeof` is safe even for undeclared variables (returns `"undefined"`). Inside a TDZ it throws instead:

```js
typeof undeclaredVar;   // "undefined" — safe
typeof x;               // ReferenceError — x is in TDZ
let x = 5;
```

This is one of the few cases where `typeof` can throw.

### TDZ in block scopes

Every new `{}` block creates a fresh TDZ for its `let`/`const` declarations:

```js
let x = 'outer';

{
  // x is in TDZ here — the inner let x shadows the outer one
  // but hasn't been initialised yet
  console.log(x);   // ReferenceError!
  let x = 'inner';
  console.log(x);   // 'inner'
}

console.log(x);     // 'outer'
```

This surprises developers who expect `console.log(x)` to read the outer `x` before the inner one is declared.

### TDZ with `const`

`const` has the same TDZ behaviour as `let`, with the additional rule that it must be initialised at the point of declaration (it can never be left uninitialised):

```js
const y;           // SyntaxError — const must be initialised
const z = 10;      // OK

z = 20;            // TypeError — const cannot be reassigned
```

### TDZ with default parameter values

Default parameter values are evaluated in their own scope and are subject to TDZ:

```js
// OK — b's default uses a, which is already initialised
function greet(a = 'hello', b = a.toUpperCase()) {
  return `${a} ${b}`;
}

// ReferenceError — b is in TDZ when a's default tries to use it
function broken(a = b, b = 'world') {
  return `${a} ${b}`;
}
broken();   // ReferenceError
```

### TDZ with `class`

`class` declarations behave like `let` — they are in the TDZ before their declaration:

```js
const obj = new MyClass();   // ReferenceError — MyClass is in TDZ
class MyClass {}

// Compare: function declarations are fully hoisted
const obj2 = new MyFn();     // Works fine
function MyFn() {}
```

### Why TDZ exists (design rationale)

`var`'s "initialised to `undefined` before use" behaviour is a common source of bugs — reading a variable before its logical initialisation silently returns `undefined` instead of signalling an error.

TDZ makes `let`/`const` safe: if you read a variable before you set it, you get an immediate, loud error rather than a silent `undefined`. It enforces the intent of "declare before use" at runtime.

```js
// TDZ catches a real bug that var would silently hide
function calculate() {
  // Oops — forgot to declare result at the top
  if (condition) result = 42;   // ReferenceError with let, silent undefined with var
  let result;
  return result;
}
```

## Closures

A closure is a function that retains access to variables from its outer (enclosing) scope even after that scope has returned.

```js
function makeCounter(start = 0) {
  let count = start;
  return {
    increment() { count++; },
    decrement() { count--; },
    value()     { return count; },
  };
}

const counter = makeCounter(10);
counter.increment();
counter.value();  // 11
// `count` is private — not accessible directly
```

### Classic Loop Closure Bug

```js
// Bug — all callbacks share the same `i` (var is function-scoped)
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);  // prints 3, 3, 3
}

// Fix 1 — use let (block-scoped, new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);  // prints 0, 1, 2
}

// Fix 2 — IIFE to capture current value
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}
```

### Practical Closures: Memoization

```js
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize((n) => { /* ... */ return n * n; });
```

## Interview Questions

**Q: What is a closure and when would you use one?**
A closure is a function bundled with its lexical environment — it "closes over" the variables in scope where it was defined. Use cases: data privacy (module pattern), partial application/currying, event handlers that remember state, factory functions.

**Q: Explain the output of this code:**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
```
Prints `3` three times. By the time the callbacks run, the loop has completed and `i` is `3`. All three callbacks share the same `var i` binding. Fix with `let` or an IIFE.

**Q: What is the difference between scope and closure?**
Scope is a compile-time concept — the set of variables accessible at a given point in the code. A closure is a runtime concept — a function that carries a reference to the variables in its outer scope, keeping them alive even after the outer function returns.

**Q: Both `var` and `let` are hoisted — so what is different about TDZ?**
Hoisting just means the engine registers the binding before running code. `var` is registered AND immediately initialised to `undefined`, so it's readable before its declaration (as `undefined`). `let`/`const` are registered but left uninitialised — they sit in the Temporal Dead Zone until the declaration line is executed. Any read or write during that window throws a `ReferenceError` rather than silently returning `undefined`.

**Q: Can `typeof` safely check a `let` variable before it's declared?**
No. `typeof` normally returns `"undefined"` for undeclared variables, but when the variable is in the TDZ, `typeof x` throws a `ReferenceError` — the same error you'd get from reading it directly. This is one of the very few ways `typeof` can throw.

**Q: Why does this code throw, even though `x = 'outer'` exists?**
```js
let x = 'outer';
{
  console.log(x);  // ReferenceError
  let x = 'inner';
}
```
The inner `let x` is hoisted to the top of its block and immediately enters the TDZ — shadowing the outer `x` even before its declaration line. So inside the block, `x` is in the TDZ from the opening `{` until `let x = 'inner'` is reached. The outer binding is completely hidden.
