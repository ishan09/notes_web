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

`let` and `const` are hoisted but not initialised. Accessing them before their declaration throws a `ReferenceError`.

```js
console.log(x);   // ReferenceError — TDZ
let x = 5;
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
