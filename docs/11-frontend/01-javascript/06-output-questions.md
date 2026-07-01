# Output Questions — Hoisting, Scope, Closures & More

A collection of "what does this print?" questions that appear frequently in senior JavaScript interviews. Every question shows the code, the exact output, and the reason behind it.

---

## Part 1: Hoisting

### Q1 — Basic `var` hoisting

```js
console.log(x);
var x = 5;
console.log(x);
```

<details>
<summary>Output</summary>

```
undefined
5
```

**Why:** `var x` is hoisted and initialised to `undefined` before any code runs. By the time the second `console.log` executes, the assignment `x = 5` has happened.

</details>

---

### Q2 — `var` inside a block is NOT block-scoped

```js
if (true) {
  var a = 10;
}
console.log(a);
```

<details>
<summary>Output</summary>

```
10
```

**Why:** `var` is function-scoped (or global-scoped if there is no enclosing function). The `if` block does not create a new scope for `var`. `a` is hoisted to the enclosing scope, making it accessible outside the block.

</details>

---

### Q3 — Function declaration is fully hoisted

```js
greet();

function greet() {
  console.log('Hello');
}
```

<details>
<summary>Output</summary>

```
Hello
```

**Why:** Function **declarations** are fully hoisted — both the name and the body move to the top of the scope. The call works even before the declaration appears in source order.

</details>

---

### Q4 — Function expression assigned to `var` is NOT fully hoisted

```js
console.log(typeof sayHi);
sayHi();

var sayHi = function() {
  console.log('Hi');
};
```

<details>
<summary>Output</summary>

```
"undefined"
TypeError: sayHi is not a function
```

**Why:** Only the `var sayHi` declaration is hoisted (initialised to `undefined`). The function assignment happens at runtime when that line is reached. Calling `undefined()` throws a `TypeError`.

</details>

---

### Q5 — Function declaration wins over `var` with the same name

```js
console.log(typeof foo);
console.log(foo());

var foo = 'string';

function foo() {
  return 'function';
}

console.log(typeof foo);
```

<details>
<summary>Output</summary>

```
"function"
"function"
"string"
```

**Why:** During hoisting, function declarations take priority over `var` declarations with the same name. So `foo` starts as the function. After `var foo = 'string'` executes (the assignment, not the declaration), `foo` becomes the string `'string'`.

</details>

---

### Q6 — Two function declarations with the same name

```js
function foo() { return 1; }
function foo() { return 2; }

console.log(foo());
```

<details>
<summary>Output</summary>

```
2
```

**Why:** Both declarations are hoisted, but the second one overwrites the first (last declaration wins). At runtime, `foo` is the second function.

</details>

---

### Q7 — `var` in a nested function does NOT leak out

```js
var x = 'global';

function outer() {
  var x = 'local';
  console.log(x);
}

outer();
console.log(x);
```

<details>
<summary>Output</summary>

```
"local"
"global"
```

**Why:** `var` is function-scoped. The `x` inside `outer` is a completely separate binding from the global `x`. Each scope has its own hoisted `x`.

</details>

---

### Q8 — Hoisting inside a nested function

```js
var x = 1;

function outer() {
  console.log(x);
  var x = 2;
  console.log(x);
}

outer();
console.log(x);
```

<details>
<summary>Output</summary>

```
undefined
2
1
```

**Why:** Inside `outer`, `var x = 2` is hoisted to the top of `outer`'s scope, making `x` local to `outer`. The first `console.log(x)` reads the local `x` before its assignment — so `undefined`. Then the assignment runs, and the second log prints `2`. The global `x` is never touched, so it remains `1`.

</details>

---

### Q9 — Hoisting order with mixed declarations

```js
console.log(a);
console.log(b());

var a = 1;

function b() {
  return 2;
}
```

<details>
<summary>Output</summary>

```
undefined
2
```

**Why:** Hoisting order: (1) function declarations are hoisted and fully initialised, (2) `var` declarations are hoisted and set to `undefined`. So before any code runs, `b` is the function and `a` is `undefined`.

</details>

---

### Q10 — `var` in a `for` loop leaks into the enclosing scope

```js
for (var i = 0; i < 3; i++) {}
console.log(i);
```

<details>
<summary>Output</summary>

```
3
```

**Why:** `var i` is hoisted to the enclosing function (or global) scope — the `for` block does not contain it. After the loop completes, `i` is `3` and is still accessible.

</details>

---

### Q11 — Function declaration inside a block (non-strict)

```js
console.log(typeof foo);

if (true) {
  function foo() { return 42; }
}

console.log(typeof foo);
```

<details>
<summary>Output</summary>

```
"undefined"   (in strict mode: ReferenceError)
"function"
```

**Why (non-strict):** In non-strict mode, block-scoped function declarations have historically been treated as `var`-scoped by many engines. The exact behaviour is implementation-defined and differs across environments. In strict mode, block-scoped function declarations behave like `let` — the name is not visible outside the block. Avoid relying on this behaviour; always use `let` or `const` with a function expression when you need block-scoped functions.

</details>

---

## Part 2: TDZ (Temporal Dead Zone)

### Q12 — `let` before its declaration

```js
console.log(x);
let x = 5;
```

<details>
<summary>Output</summary>

```
ReferenceError: Cannot access 'x' before initialization
```

**Why:** `let x` is hoisted (the binding is created) but not initialised. Any read or write before the declaration line throws a `ReferenceError`. This is the TDZ.

</details>

---

### Q13 — `typeof` on a TDZ variable is NOT safe

```js
console.log(typeof undeclaredVar);   // line A
console.log(typeof x);               // line B
let x = 5;
```

<details>
<summary>Output</summary>

```
"undefined"
ReferenceError: Cannot access 'x' before initialization
```

**Why:** `typeof` on a truly undeclared variable returns `"undefined"` safely (line A). But `x` is declared with `let` — it exists in the scope in a TDZ state. `typeof` on a TDZ variable still throws, unlike `typeof` on a completely undeclared name.

</details>

---

### Q14 — TDZ in a nested block shadows the outer `let`

```js
let x = 'outer';

{
  console.log(x);
  let x = 'inner';
}
```

<details>
<summary>Output</summary>

```
ReferenceError: Cannot access 'x' before initialization
```

**Why:** The inner `let x` is hoisted to the top of the block, immediately entering TDZ and **shadowing** the outer `x`. Before `let x = 'inner'` is reached, `x` is in TDZ — the outer binding is inaccessible. Many developers expect `'outer'` here, making this a very common interview trap.

</details>

---

### Q15 — `const` must be initialised immediately

```js
const y;
y = 10;
console.log(y);
```

<details>
<summary>Output</summary>

```
SyntaxError: Missing initializer in const declaration
```

**Why:** `const` requires an initialiser at the point of declaration. This is caught at parse time — the code never runs.

</details>

---

### Q16 — TDZ with default function parameters

```js
function fn(a = b, b = 1) {
  return a + b;
}
console.log(fn());
```

<details>
<summary>Output</summary>

```
ReferenceError: Cannot access 'b' before initialization
```

**Why:** Parameters are evaluated left to right. When `a`'s default (`b`) is evaluated, `b` has been hoisted into the parameter scope but is still in its TDZ (its own default hasn't run yet). Reversing the order — `fn(b = 1, a = b)` — would work.

</details>

---

## Part 3: Scope & Closures

### Q17 — Classic `var` + `setTimeout` loop

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

<details>
<summary>Output</summary>

```
3
3
3
```

**Why:** All three arrow functions close over the **same** `var i` binding. By the time the event loop runs the callbacks (after the synchronous loop finishes), `i` is `3`.

</details>

---

### Q18 — `let` fixes the loop closure

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

<details>
<summary>Output</summary>

```
0
1
2
```

**Why:** `let` creates a **new binding per iteration**. Each callback closes over its own `i`, which is frozen at the value it had during that iteration.

</details>

---

### Q19 — IIFE captures the value at call time

```js
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 0);
  })(i);
}
```

<details>
<summary>Output</summary>

```
0
1
2
```

**Why:** The IIFE is called immediately on each iteration with the current value of `i` passed as `j`. Each invocation gets its own `j` parameter, so the closure captures distinct values.

</details>

---

### Q20 — Closure over a variable that keeps changing

```js
function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

console.log(add5(3));
console.log(add10(3));
console.log(add5(add10(1)));
```

<details>
<summary>Output</summary>

```
8
13
16
```

**Why:** Each call to `makeAdder` creates a **new closure** with its own `x`. `add5` captures `x = 5`, `add10` captures `x = 10`. They are independent. `add5(add10(1))` → `add5(11)` → `16`.

</details>

---

### Q21 — Variable shared across multiple closures

```js
function counter() {
  let count = 0;
  return {
    inc() { count++; },
    dec() { count--; },
    val() { return count; },
  };
}

const c1 = counter();
const c2 = counter();

c1.inc();
c1.inc();
c2.inc();

console.log(c1.val());
console.log(c2.val());
```

<details>
<summary>Output</summary>

```
2
1
```

**Why:** Each call to `counter()` creates a **new closure scope** with its own `count`. `c1` and `c2` are independent — incrementing `c1` does not affect `c2`'s count.

</details>

---

### Q22 — Scope chain lookup

```js
var x = 'global';

function outer() {
  var x = 'outer';

  function inner() {
    console.log(x);
  }

  inner();
}

outer();
```

<details>
<summary>Output</summary>

```
"outer"
```

**Why:** `inner` does not have its own `x`, so it walks up the scope chain and finds `x = 'outer'` in `outer`'s scope before reaching the global `x = 'global'`.

</details>

---

### Q23 — Function scope vs block scope

```js
function test() {
  if (true) {
    var a = 1;
    let b = 2;
  }
  console.log(a);
  console.log(b);
}

test();
```

<details>
<summary>Output</summary>

```
1
ReferenceError: b is not defined
```

**Why:** `var a` is function-scoped — visible anywhere inside `test`. `let b` is block-scoped to the `if` block — it does not exist outside of it.

</details>

---

## Part 4: `this` Binding

### Q24 — Method called as a plain function loses `this`

```js
const obj = {
  name: 'Alice',
  greet() {
    console.log(this.name);
  },
};

obj.greet();

const fn = obj.greet;
fn();
```

<details>
<summary>Output</summary>

```
"Alice"
undefined   (or TypeError in strict mode)
```

**Why:** `obj.greet()` — implicit binding: `this` is `obj`. After `const fn = obj.greet`, the function is detached from the object. `fn()` — default binding: `this` is `undefined` in strict mode (or the global object in non-strict, where `global.name` is likely `undefined` or `""`).

</details>

---

### Q25 — Arrow function captures `this` lexically

```js
const obj = {
  name: 'Alice',
  greet: () => {
    console.log(this.name);
  },
};

obj.greet();
```

<details>
<summary>Output</summary>

```
undefined
```

**Why:** Arrow functions do **not** have their own `this`. They inherit `this` from the enclosing **lexical** scope at the time they were defined. Here, the arrow is defined at the top level (inside an object literal, which is not a function scope), so `this` is the global object (or `undefined` in strict mode). `global.name` is typically `undefined`.

</details>

---

### Q26 — Arrow inside a regular method preserves `this`

```js
const obj = {
  name: 'Alice',
  greet() {
    const inner = () => {
      console.log(this.name);
    };
    inner();
  },
};

obj.greet();
```

<details>
<summary>Output</summary>

```
"Alice"
```

**Why:** `greet` is a regular method, so when called as `obj.greet()`, `this` is `obj`. The inner arrow function captures that `this` lexically — it has no `this` of its own, so it uses `obj`.

</details>

---

### Q27 — `setTimeout` with a regular function loses `this`

```js
const obj = {
  count: 0,
  start() {
    setTimeout(function() {
      console.log(this.count);
    }, 0);
  },
};

obj.start();
```

<details>
<summary>Output</summary>

```
undefined
```

**Why:** The callback passed to `setTimeout` is called as a plain function by the runtime — not as a method. `this` is the global object (or `undefined` in strict mode). Fix: use an arrow function, or `setTimeout(function() {...}.bind(this), 0)`.

</details>

---

### Q28 — `bind` creates a permanently bound function

```js
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}

const alice = { name: 'Alice' };
const bob   = { name: 'Bob' };

const greetAlice = greet.bind(alice);

console.log(greetAlice('Hello'));
console.log(greetAlice.call(bob, 'Hi'));
```

<details>
<summary>Output</summary>

```
"Hello, Alice"
"Hi, Alice"
```

**Why:** `bind` returns a new function with `this` **permanently** fixed to `alice`. Calling `.call(bob, ...)` on a bound function does NOT override `this` — the bound `this` wins. Only `new` can override `bind`'s `this`.

</details>

---

## Part 5: Event Loop & Async Order

### Q29 — Synchronous vs microtask vs macrotask

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

console.log('4');
```

<details>
<summary>Output</summary>

```
1
4
3
2
```

**Why:**
- `1` and `4` are synchronous — run first.
- Promise `.then` is a **microtask** — runs after all synchronous code, before the next macrotask.
- `setTimeout` is a **macrotask** — runs after microtasks are drained.

</details>

---

### Q30 — Chained promises are each a microtask

```js
console.log('start');

Promise.resolve()
  .then(() => {
    console.log('p1');
    return 'p1 value';
  })
  .then(() => console.log('p2'));

Promise.resolve()
  .then(() => console.log('p3'));

console.log('end');
```

<details>
<summary>Output</summary>

```
start
end
p1
p3
p2
```

**Why:**
- `start` and `end` are synchronous.
- After sync code, the microtask queue contains: `p1 handler`, `p3 handler`.
- `p1` runs → schedules `p2` handler → queue is now `[p3 handler, p2 handler]`.
- `p3` runs → queue is `[p2 handler]`.
- `p2` runs.

</details>

---

### Q31 — `async/await` desugared

```js
async function foo() {
  console.log('foo start');
  await Promise.resolve();
  console.log('foo after await');
}

console.log('before foo');
foo();
console.log('after foo call');
```

<details>
<summary>Output</summary>

```
before foo
foo start
after foo call
foo after await
```

**Why:** `foo()` runs synchronously up to the first `await`. At that point, it suspends and returns a pending Promise. Control returns to the caller (`after foo call` prints). The continuation (`foo after await`) is queued as a microtask and runs once the current synchronous code finishes.

</details>

---

### Q32 — Mixed setTimeout delays

```js
setTimeout(() => console.log('A'), 0);
setTimeout(() => console.log('B'), 100);
setTimeout(() => console.log('C'), 0);

Promise.resolve().then(() => console.log('D'));
```

<details>
<summary>Output</summary>

```
D
A
C
B
```

**Why:** Microtask `D` runs first. Then macrotasks fire in order of their delay: `A` (0ms) and `C` (0ms) are queued together and run in registration order, then `B` (100ms) fires after the 100ms delay.

</details>

---

### Q33 — `await` on a non-Promise

```js
async function fn() {
  const x = await 42;
  console.log(x);
}

console.log('before');
fn();
console.log('after');
```

<details>
<summary>Output</summary>

```
before
after
42
```

**Why:** `await 42` wraps the value in `Promise.resolve(42)`. Even though the value is immediately available, the continuation is still scheduled as a microtask. So `'after'` (synchronous) prints before `42`.

</details>

---

## Part 6: Prototype Chain

### Q34 — Property on instance shadows prototype

```js
function Animal(name) { this.name = name; }
Animal.prototype.name = 'generic';
Animal.prototype.type = 'animal';

const cat = new Animal('Whiskers');

console.log(cat.name);
console.log(cat.type);
console.log(Animal.prototype.name);
```

<details>
<summary>Output</summary>

```
"Whiskers"
"animal"
"generic"
```

**Why:** `cat.name` is an **own property** (set by the constructor), which shadows the prototype's `name`. `cat.type` is not own, so the engine finds it on `Animal.prototype`. The prototype's `name` is unchanged.

</details>

---

### Q35 — `instanceof` after replacing prototype

```js
function Foo() {}
const obj = new Foo();

console.log(obj instanceof Foo);

Foo.prototype = {};

console.log(obj instanceof Foo);
```

<details>
<summary>Output</summary>

```
true
false
```

**Why:** `instanceof` checks whether the right-hand side's `.prototype` is anywhere in the left-hand side's prototype chain. After `Foo.prototype = {}`, `Foo.prototype` is a new empty object. `obj`'s chain still points to the **original** `Foo.prototype` — no longer the same object. So `instanceof` returns `false`.

</details>

---

### Q36 — `hasOwnProperty` vs `in`

```js
function Person(name) { this.name = name; }
Person.prototype.species = 'human';

const p = new Person('Alice');

console.log('name' in p);
console.log('species' in p);
console.log(p.hasOwnProperty('name'));
console.log(p.hasOwnProperty('species'));
```

<details>
<summary>Output</summary>

```
true
true
true
false
```

**Why:** `in` searches the entire prototype chain. `hasOwnProperty` returns `true` only for properties that exist directly on the object, not inherited ones. `species` is on `Person.prototype`, not on `p` itself.

</details>

---

## Part 7: Type Coercion & Operators

### Q37 — `+` operator with mixed types

```js
console.log(1 + '2');
console.log('3' - 1);
console.log(true + true);
console.log([] + []);
console.log([] + {});
console.log({} + []);
```

<details>
<summary>Output</summary>

```
"12"
2
2
""
"[object Object]"
"[object Object]"   (in an expression context; `0` if `{}` is parsed as a block)
```

**Why:**
- `1 + '2'`: numeric `1` is coerced to string → concatenation → `"12"`.
- `'3' - 1`: `-` has no string meaning; `'3'` coerces to `3` → `2`.
- `true + true`: both coerce to `1` → `2`.
- `[] + []`: both arrays coerce to `""` → `"" + "" = ""`.
- `[] + {}`: `[]` → `""`, `{}` → `"[object Object]"` → `"[object Object]"`.
- `{} + []`: in expression context, `{}` is an object literal, coerces to `"[object Object]"`. (At statement level in a REPL, `{}` can be parsed as an empty block, making this `+[]` = `0`.)

</details>

---

### Q38 — Loose equality (`==`) coercion traps

```js
console.log(0 == false);
console.log(0 == '');
console.log('' == false);
console.log(null == undefined);
console.log(null == false);
console.log(NaN == NaN);
```

<details>
<summary>Output</summary>

```
true
true
true
true
false
false
```

**Why:**
- `0 == false`: `false` coerces to `0` → `0 == 0` → `true`.
- `0 == ''`: `''` coerces to `0` → `0 == 0` → `true`.
- `'' == false`: `false` coerces to `0`, `''` coerces to `0` → `true`.
- `null == undefined`: a special case in the spec — they are only `==` to each other (and not to any other value).
- `null == false`: `null` only equals `undefined` loosely; `false` coerces to `0`, but `null` does NOT coerce to a number for `==` → `false`.
- `NaN == NaN`: `NaN` is the only value not equal to itself. Use `Number.isNaN(x)` to check.

</details>

---

### Q39 — Short-circuit evaluation return values

```js
console.log(1 && 2);
console.log(0 && 2);
console.log(1 || 2);
console.log(0 || 2);
console.log(null ?? 'default');
console.log(0 ?? 'default');
console.log('' ?? 'default');
```

<details>
<summary>Output</summary>

```
2
0
1
2
"default"
0
""
```

**Why:**
- `&&` returns the **first falsy** value, or the last value if all are truthy.
- `||` returns the **first truthy** value, or the last value if all are falsy.
- `??` (nullish coalescing) returns the right-hand side only if the left is `null` or `undefined`. `0` and `""` are falsy but **not nullish**, so `??` returns them as-is.

</details>

---

### Q40 — `typeof` on various values

```js
console.log(typeof undefined);
console.log(typeof null);
console.log(typeof 42);
console.log(typeof 'hello');
console.log(typeof true);
console.log(typeof Symbol());
console.log(typeof 42n);
console.log(typeof {});
console.log(typeof []);
console.log(typeof function(){});
console.log(typeof undeclaredVariable);
```

<details>
<summary>Output</summary>

```
"undefined"
"object"       ← historical bug
"number"
"string"
"boolean"
"symbol"
"bigint"
"object"
"object"       ← arrays are objects
"function"     ← special case
"undefined"    ← safe (no ReferenceError for undeclared vars)
```

**Why:** `typeof null === "object"` is a well-known bug preserved for backwards compatibility. Arrays report as `"object"` — use `Array.isArray()` to detect them. Functions get their own special `"function"` return value even though they are objects.

</details>

---

## Part 8: Tricky Combinations

### Q41 — Hoisting + closure together

```js
var fns = [];

for (var i = 0; i < 3; i++) {
  fns.push(function() { return i; });
}

console.log(fns[0]());
console.log(fns[1]());
console.log(fns[2]());
```

<details>
<summary>Output</summary>

```
3
3
3
```

**Why:** All three functions close over the **same** `var i`. By the time any function is called (after the loop), `i` is `3`. This is identical to the `setTimeout` loop problem — the closure captures the variable, not the value.

</details>

---

### Q42 — Fix with `let`

```js
var fns = [];

for (let i = 0; i < 3; i++) {
  fns.push(function() { return i; });
}

console.log(fns[0]());
console.log(fns[1]());
console.log(fns[2]());
```

<details>
<summary>Output</summary>

```
0
1
2
```

**Why:** `let` creates a fresh binding for each loop iteration. Each function captures its own distinct `i`.

</details>

---

### Q43 — Immediately Invoked Function Expression (IIFE)

```js
var result = (function() {
  var x = 10;
  return x * 2;
})();

console.log(result);
console.log(typeof x);
```

<details>
<summary>Output</summary>

```
20
"undefined"
```

**Why:** The IIFE runs immediately and returns `20`. The `var x` inside is scoped to the IIFE's function body — not visible outside. `typeof x` at global scope returns `"undefined"` (no `ReferenceError` because `typeof` is safe for undeclared vars).

</details>

---

### Q44 — `arguments` object vs rest params

```js
function old() {
  console.log(arguments[0]);
  console.log(Array.isArray(arguments));
}

function modern(...args) {
  console.log(args[0]);
  console.log(Array.isArray(args));
}

old(1, 2, 3);
modern(1, 2, 3);
```

<details>
<summary>Output</summary>

```
1
false
1
true
```

**Why:** `arguments` is an **array-like object** (has `length` and numeric indices) but is NOT a real array — `Array.isArray` returns `false`. Rest parameters (`...args`) create a genuine `Array` — `Array.isArray` returns `true`.

</details>

---

### Q45 — `delete` on a variable vs a property

```js
var x = 1;
const obj = { a: 2 };

console.log(delete x);
console.log(delete obj.a);
console.log(x);
console.log(obj.a);
```

<details>
<summary>Output</summary>

```
false
true
1
undefined
```

**Why:** `delete` removes object **properties**, not variable bindings. `var x` is a property of the global object but with `configurable: false` — `delete` returns `false` and leaves `x` intact. `obj.a` is a configurable property — `delete` returns `true` and removes it. Accessing `obj.a` after deletion returns `undefined`.

</details>
