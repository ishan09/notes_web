---
sidebar_position: 7
---

# Frontend Interview Questions

A comprehensive set of questions across JavaScript, TypeScript, design patterns, browser security, testing, and web performance. Each answer includes a full explanation and a reference to the relevant notes.

---

## JavaScript

### JS-1. What are the 8 data types in JavaScript, and what does `typeof null` return?

**Answer:**

JavaScript has 8 primitive/compound types: `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `symbol`, and `object`. Functions are a special subtype of `object`.

`typeof null` returns `"object"` — a long-standing bug from the very first JavaScript implementation. The original representation of values in memory used a tag, and the null pointer shared the `000` object tag. The bug was never fixed because it would have broken the web.

```js
typeof null          // "object"  ← historical bug
typeof undefined     // "undefined"
typeof function(){}  // "function"
typeof []            // "object"

// Correct null check
value === null       // ✅
typeof value === 'null'  // ❌ — this is always false
```

📖 See: [Core Language & ES6+ → Data Types](./01-javascript/01-core-language.md#data-types)

---

### JS-2. Explain `var` vs `let` vs `const`. What is the Temporal Dead Zone?

**Answer:**

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Hoisted | Yes (as `undefined`) | Yes (TDZ — not initialized) | Yes (TDZ) |
| Re-declarable | Yes | No | No |
| Re-assignable | Yes | Yes | No |

`var` declarations are hoisted and immediately initialized to `undefined`, so reading them before their declaration doesn't throw — it returns `undefined`. `let` and `const` are hoisted but enter the **Temporal Dead Zone (TDZ)**: accessing them before the declaration throws a `ReferenceError`.

```js
console.log(a);   // undefined — var is hoisted+initialized
var a = 5;

console.log(b);   // ReferenceError — b exists but is in TDZ
let b = 10;
```

📖 See: [Core Language & ES6+ → var vs let vs const](./01-javascript/01-core-language.md#var-vs-let-vs-const) | [Closures, Scope & Hoisting → TDZ](./01-javascript/04-closures-scope-hoisting.md#temporal-dead-zone-tdz)

---

### JS-3. What is a closure? Explain the classic loop bug and fix it.

**Answer:**

A closure is a function that retains access to variables from its enclosing (outer) scope even after that scope has returned. In JavaScript, every function forms a closure over the variables in scope at the time it was **defined** (not called).

**Classic loop bug** — all callbacks share the same `var i` binding:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3  — loop already finished before callbacks run
```

**Fix 1 — `let`** creates a new binding per iteration:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2
```

**Fix 2 — IIFE** captures the current value:

```js
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}
```

Real-world use: data privacy (module pattern), memoization, partial application, event handlers that remember state.

📖 See: [Closures, Scope & Hoisting](./01-javascript/04-closures-scope-hoisting.md)

---

### JS-4. Explain prototypal inheritance. How does `class` fit in?

**Answer:**

Every JavaScript object has an internal `[[Prototype]]` link to another object (or `null`). When you access a property that doesn't exist on the object, the engine walks this **prototype chain** until it finds the property or reaches `null`.

```js
const animal = { breathes: true };
const dog = Object.create(animal);
dog.bark = () => 'woof';

dog.breathes;  // true — found on prototype (animal)
dog.bark();    // 'woof' — found on dog itself
```

**`class` is syntax sugar** over prototype-based inheritance — it doesn't introduce a new inheritance model:

```js
class Dog extends Animal {
  constructor(name) { super(name); }
  bark() { return 'woof'; }
}
// Equivalent to: Dog.prototype.__proto__ === Animal.prototype
```

Unlike classical inheritance (Java/C++), JavaScript doesn't copy the parent — it **links** to it. Changing `Animal.prototype.breathe` affects all instances retroactively.

📖 See: [Prototypes & the Object Model](./01-javascript/03-prototypes-object-model.md)

---

### JS-5. Explain the JavaScript event loop. What is the difference between a microtask and a macrotask?

**Answer:**

JavaScript is single-threaded. The event loop lets it handle async operations without blocking:

```
Call stack (sync) → Microtask queue → (one) Macrotask → Microtask queue → ...
```

- **Microtasks**: Promise callbacks (`.then`, `.catch`, `.finally`), `queueMicrotask`. Drained **completely** after each task before the browser picks the next macrotask.
- **Macrotasks**: `setTimeout`, `setInterval`, I/O callbacks. Only **one** is processed per loop tick.

```js
console.log('A');                              // 1 — sync
setTimeout(() => console.log('B'), 0);         // macrotask
Promise.resolve().then(() => console.log('C')); // microtask
console.log('D');                              // 2 — sync

// Output: A D C B
// D finishes sync → microtask C runs → macrotask B runs
```

This is why `Promise.resolve().then(fn)` always runs before `setTimeout(fn, 0)`, even though both have a 0ms delay.

📖 See: [The Event Loop & Browser APIs](./01-javascript/05-event-loop-browser-apis.md)

---

### JS-6. What is the difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`?

**Answer:**

| Method | Resolves when | Rejects when |
|---|---|---|
| `Promise.all` | All resolve | First rejection (fail-fast) |
| `Promise.allSettled` | All settle (never rejects) | Never |
| `Promise.race` | First settles (resolve or reject) | First rejects |
| `Promise.any` | First resolves | All reject (`AggregateError`) |

```js
// all — parallel fetch, stop on any error
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts()]);

// allSettled — run all, inspect outcomes individually
const results = await Promise.allSettled([p1, p2, p3]);
results.forEach(r => {
  if (r.status === 'fulfilled') use(r.value);
  else logError(r.reason);
});

// race — timeout pattern
const data = await Promise.race([
  fetchData(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
]);

// any — use the first successful mirror
const fastest = await Promise.any([mirror1, mirror2, mirror3]);
```

📖 See: [Asynchronous JavaScript → Promise Combinators](./01-javascript/02-async-javascript.md#promise-combinators)

---

### JS-7. Why does awaiting inside a `for` loop run sequentially? How do you run in parallel?

**Answer:**

`await` pauses the `async` function until the promise settles. When placed inside a `for` loop, each iteration waits for the previous one to complete before starting — they run **sequentially**.

```js
// Sequential — each fetch waits for the previous
for (const id of ids) {
  const item = await fetch(`/api/${id}`);  // ← blocks loop
}
// Total time ≈ sum of all fetch durations
```

To run in parallel, start all promises first, then await them together:

```js
// Parallel — all fetches start simultaneously
const items = await Promise.all(
  ids.map(id => fetch(`/api/${id}`))
);
// Total time ≈ duration of the slowest single fetch
```

If you need parallel execution but want to process as each finishes:

```js
const promises = ids.map(id => fetch(`/api/${id}`));
for (const p of promises) {
  const item = await p;  // waits in order, but all requests are in flight
}
```

📖 See: [Asynchronous JavaScript → Common async/await Mistakes](./01-javascript/02-async-javascript.md#common-asyncawait-mistakes)

---

### JS-8. How does `this` work? What are the four binding rules?

**Answer:**

`this` is determined at **call time** (not definition time). Arrow functions are the only exception — they close over `this` lexically.

**Four binding rules (highest to lowest priority):**

1. **`new` binding** — `this` is the newly created object
2. **Explicit binding** — `fn.call(obj)`, `fn.apply(obj)`, `fn.bind(obj)` — `this` is `obj`
3. **Implicit binding** — `obj.method()` — `this` is `obj`
4. **Default binding** — `fn()` alone — `this` is `undefined` in strict mode, or the global object

```js
function greet() { return `Hello, ${this.name}`; }

const alice = { name: 'Alice', greet };
alice.greet();              // "Hello, Alice"  — implicit binding

greet.call({ name: 'Bob' }); // "Hello, Bob"  — explicit binding

const bound = greet.bind({ name: 'Carol' });
bound();                    // "Hello, Carol" — explicit binding via bind

// Arrow functions — lexical this
const obj = {
  name: 'Dave',
  greet() {
    const arrow = () => `Hello, ${this.name}`;
    return arrow();         // "Hello, Dave" — this from greet's scope
  },
};
```

📖 See: [Prototypes & the Object Model → `this` Binding](./01-javascript/03-prototypes-object-model.md#this-binding)

---

## TypeScript

### TS-1. What is the difference between `interface` and `type`? When do you use each?

**Answer:**

Both define shapes, but they differ in capabilities:

| Feature | `interface` | `type` |
|---|---|---|
| Declaration merging | ✅ Yes | ❌ No |
| `extends` keyword | ✅ Yes | Use `&` instead |
| Union types | ❌ No | ✅ Yes |
| Primitive aliases | ❌ No | ✅ Yes |
| Computed/mapped types | ❌ No | ✅ Yes |

```ts
// interface — good for object shapes, supports merging
interface User { id: number; name: string; }
interface User { email: string; }  // merged — User now has id, name, email

// type — required for unions, intersections, primitives
type ID = string | number;
type AdminUser = User & { role: 'admin' };
type EventHandler = (e: Event) => void;
```

**Rule of thumb**: Use `interface` for public object shapes (library APIs, component props) — it supports declaration merging which is useful for augmenting third-party types. Use `type` for unions, function signatures, and anything that can't be expressed as an interface.

📖 See: [Types, Interfaces & Type Aliases](./02-typescript/01-types-interfaces.md#interface-vs-type--when-to-use-which)

---

### TS-2. What is `unknown` vs `any`? Why prefer `unknown`?

**Answer:**

Both accept any value, but `unknown` requires you to narrow the type before using it:

```ts
function processAny(val: any) {
  val.toUpperCase();   // no error — TypeScript trusts you (dangerous)
  val.foo.bar.baz;     // no error — can crash at runtime
}

function processUnknown(val: unknown) {
  val.toUpperCase();   // ❌ Error — can't call method on unknown

  if (typeof val === 'string') {
    val.toUpperCase(); // ✅ — narrowed to string
  }
}
```

`any` disables type checking entirely. `unknown` keeps checking — you must verify the type before operating on the value. Use `unknown` for:
- API responses where the shape isn't guaranteed
- `catch (e)` — TypeScript 4.0+ binds `e` as `unknown` in strict mode
- Generic "could be anything" parameters

📖 See: [Types, Interfaces & Type Aliases → Primitive Types](./02-typescript/01-types-interfaces.md#primitive-types)

---

### TS-3. What are generics? Explain `keyof` and constraints.

**Answer:**

Generics let you write type-safe code that works across many types without duplicating it. The type parameter is resolved when the function/class is used.

```ts
// Without generics — loses type information
function first(arr: any[]): any { return arr[0]; }

// With generics — preserves type
function first<T>(arr: T[]): T | undefined { return arr[0]; }

const n = first([1, 2, 3]);   // n: number
const s = first(['a', 'b']);  // s: string
```

**`keyof`** — produces a union of an object's keys:

```ts
type UserKeys = keyof { name: string; age: number };  // "name" | "age"
```

**Constraints** — restrict what `T` can be:

```ts
// T must have a length property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

// Type-safe property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

getProperty({ name: 'Alice', age: 30 }, 'name');   // string ✅
getProperty({ name: 'Alice', age: 30 }, 'email');  // ❌ Compile error
```

📖 See: [Generics](./02-typescript/02-generics.md)

---

### TS-4. Explain the most useful built-in utility types.

**Answer:**

```ts
interface User { id: number; name: string; email: string; role: 'admin' | 'user'; }

Partial<User>         // all props optional
Required<User>        // all props required (reverses optional markers)
Readonly<User>        // all props readonly

Pick<User, 'id' | 'name'>       // { id: number; name: string }
Omit<User, 'role'>              // User without role
Record<'a' | 'b', number>       // { a: number; b: number }

Extract<string | number | boolean, string | number>  // string | number
Exclude<string | number | boolean, boolean>          // string | number

NonNullable<string | null | undefined>   // string
ReturnType<typeof fetchUser>             // Promise<User>
Awaited<Promise<User>>                   // User  (TS 4.5+)
Parameters<typeof fn>                    // [id: number, opts?: Options]
```

Combining them for common patterns:

```ts
// Partial update payload — id required, everything else optional
type UpdatePayload = Required<Pick<User, 'id'>> & Partial<Omit<User, 'id'>>;

// Deep partial (custom)
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
```

📖 See: [Utility Types & Type Manipulation](./02-typescript/03-utility-types.md)

---

### TS-5. What are discriminated unions and how do they enable exhaustive checking?

**Answer:**

A **discriminated union** is a union where each member has a **common literal-typed field** (the discriminant). TypeScript uses it to narrow to the exact member inside a `switch` or `if`.

```ts
type Shape =
  | { kind: 'circle';   radius: number }
  | { kind: 'rect';     width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':   return Math.PI * s.radius ** 2;
    case 'rect':     return s.width * s.height;
    case 'triangle': return 0.5 * s.base * s.height;
    default:
      // If you add a new Shape variant without handling it here,
      // TypeScript will error because s is no longer `never`
      const _exhaustive: never = s;
      throw new Error(`Unhandled: ${_exhaustive}`);
  }
}
```

The `never` trick in the `default` branch enforces **exhaustiveness at compile time** — adding a new variant to `Shape` without updating `area` is a type error.

📖 See: [Advanced Types & Type Guards → Discriminated Unions](./02-typescript/04-advanced-types.md#discriminated-unions)

---

### TS-6. What is the difference between a type assertion and a type guard? Why prefer type guards?

**Answer:**

**Type assertion (`as`)** — a compile-time-only instruction that tells TypeScript "trust me, I know the type." It does **no runtime check** and can mask real bugs:

```ts
const input = document.getElementById('email') as HTMLInputElement;
input.value;  // TypeScript is satisfied — but crashes if element doesn't exist
```

**Type guard** — a runtime check that TypeScript recognises to narrow the type:

```ts
// Built-in guards
typeof val === 'string'     // narrows to string
val instanceof Error        // narrows to Error

// Custom guard with `is` predicate
function isUser(val: unknown): val is User {
  return typeof val === 'object' && val !== null && 'id' in val;
}

if (isUser(data)) {
  data.id;   // ✅ TypeScript knows it's User
}
```

Prefer type guards because they keep the static type aligned with the runtime value. Assertions are appropriate only when you have information TypeScript can't infer (e.g., a DOM element you know exists).

📖 See: [Advanced Types & Type Guards](./02-typescript/04-advanced-types.md#type-guards)

---

## Frontend Design Patterns

### DP-1. What is the Container / Presentational pattern? What problem does it solve?

**Answer:**

The pattern separates:
- **Presentational component** — pure function of props. Renders UI, fires callback props. No data fetching, no side effects. Easy to test, reuse, and design in isolation (Storybook).
- **Container component** — owns data fetching and state. Passes data and handlers down as props. Has no direct rendering responsibility.

```tsx
// Presentational — knows nothing about fetch or state
function UserCard({ name, email, loading }: UserCardProps) {
  if (loading) return <Skeleton />;
  return <div><h2>{name}</h2><p>{email}</p></div>;
}

// Container — owns the data
function UserCardContainer({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery(['user', userId], () => fetchUser(userId));
  return <UserCard name={data?.name} email={data?.email} loading={isLoading} />;
}
```

**Problem solved**: co-locating data fetching with rendering creates components that are hard to test, reuse, and preview in isolation. Splitting them means you can render `UserCard` in Storybook with mock props, and test the container logic separately.

📖 See: [Component Patterns → Container / Presentational](./03-design-patterns/01-component-patterns.md#container--presentational-smart--dumb)

---

### DP-2. When would you use a Higher-Order Component vs a custom hook vs a render prop?

**Answer:**

| Technique | Best for | Limitation |
|---|---|---|
| **Custom hook** | Sharing stateful logic; composable; no extra DOM node | Can't inject JSX wrapper around the consumer |
| **HOC** | Wrapping a component with JSX, injecting a prop imperatively, class components | Adds wrapper nodes, harder to debug, prop name collisions |
| **Render prop** | Giving consumers full control over rendering; pure logic share without hooks | Verbose, "callback hell" with deep nesting |

**Custom hook is the modern default:**

```tsx
// Preferred — composable, no extra nodes
function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}
```

Use an **HOC** when you genuinely need to wrap the component in JSX (e.g., `withAuth` that renders `<Navigate>` for unauthenticated users) or when dealing with class components.

📖 See: [Component Patterns](./03-design-patterns/01-component-patterns.md)

---

### DP-3. When should you use Context API vs Redux vs React Query for state?

**Answer:**

Different kinds of state need different tools:

| State type | Examples | Best tool |
|---|---|---|
| Local UI state | Modal open, input value | `useState` |
| Shared slow-changing global | Current user, theme, locale | Context API |
| Complex client state | Shopping cart, form wizard | Redux / Zustand |
| Server / async data | User list, posts, orders | React Query / SWR |

**Context API** is a dependency injection mechanism, not a state manager. Every context value change re-renders **all consumers** — use it for infrequently changing global data (theme, locale). Splitting contexts by update frequency avoids re-render cascades.

**Redux** (via RTK) is for complex state with many transitions, middleware (thunks, sagas), or when fine-grained subscription matters. Supports time-travel debugging.

**React Query / SWR** manages server state: caching, background refetching, stale-while-revalidate, deduplication of requests, optimistic updates. Eliminates the need for `useEffect`+`useState` data-fetching boilerplate.

📖 See: [State Management Patterns](./03-design-patterns/02-state-management.md)

---

### DP-4. Explain Flux / Redux unidirectional data flow and why it was created.

**Answer:**

Facebook created Flux to solve **cascading updates** in large MVC apps: a user action could update a Model, which triggered a View update, which triggered another Model update — making the data flow impossible to trace.

Flux enforces **strict unidirectional flow**:

```
User interaction
    ↓
Action  { type: 'ADD_TODO', payload: { text: 'Buy milk' } }
    ↓
Dispatcher  (broadcasts action to all stores)
    ↓
Store  (updates state via pure reducer)
    ↓
View  (re-renders from new state)
    ↓
(next user interaction…)
```

**Three core principles (Redux formalization):**
1. **Single source of truth** — one store holds all app state
2. **State is read-only** — the only way to change state is to dispatch an action
3. **Changes are made with pure functions** — `(state, action) => newState`

This makes every state change **explicit, traceable, and reversible** — enabling time-travel debugging and predictable behaviour in large apps.

📖 See: [Architectural Patterns → Flux Architecture](./03-design-patterns/03-architectural-patterns.md#flux-architecture) | [State Management → Redux Toolkit](./03-design-patterns/02-state-management.md#redux-toolkit-rtk--modern-redux)

---

### DP-5. What are the common frontend performance patterns? Explain virtualisation and code splitting.

**Answer:**

**Code splitting** — instead of shipping all JavaScript in one bundle, split it at route/component boundaries and load chunks on demand. The initial load only downloads what's needed for the current page.

```tsx
// React.lazy + Suspense — loads the component's chunk only when rendered
const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

**Virtualisation (windowing)** — for lists with thousands of items, only render the rows visible in the viewport. As the user scrolls, DOM nodes are recycled. A list of 10,000 items renders only ~20 DOM nodes at a time.

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={10000} itemSize={50} width="100%">
  {({ index, style }) => <div style={style}>Row {index}</div>}
</FixedSizeList>
```

Other key patterns: memoization (`React.memo`, `useMemo`, `useCallback`), debounce/throttle for high-frequency events, `requestAnimationFrame` for animations, Web Workers for CPU-heavy tasks.

📖 See: [Performance Patterns](./03-design-patterns/04-performance-patterns.md) | [Rendering Performance](./06-web-performance/03-rendering-performance.md)

---

## Browser Security

### SEC-1. What is the Same-Origin Policy and how does CORS relax it?

**Answer:**

The **Same-Origin Policy (SOP)** is a browser security rule that prevents a page from reading responses from a **different origin** (different scheme, host, or port). Without it, a malicious page could silently read your banking data via `fetch`.

```
https://evil.com → fetch('https://bank.com/balance')
Without SOP: reads your balance  ← DANGEROUS
With SOP: browser blocks reading the response ✅
```

**CORS** lets the **server** explicitly permit cross-origin reads. The browser sends an `Origin` header; the server decides whether to allow it.

**Preflight** (for non-simple requests like `PUT`, `DELETE`, or requests with custom headers): the browser first sends an `OPTIONS` request. Only if the server allows it does the real request proceed.

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Authorization
```

Key point: CORS is enforced by the **browser**, not the server. A server without CORS headers can still be called by curl, Postman, or server-to-server requests — SOP only applies to browser-based cross-origin reads.

📖 See: [Same-Origin Policy, CORS & CSP](./04-browser-security/01-cors-csp.md)

---

### SEC-2. What is XSS and how do you prevent it?

**Answer:**

**Cross-Site Scripting (XSS)** is when an attacker injects malicious JavaScript into a page that other users load. The script runs with the page's origin and can steal cookies, tokens, or perform actions on the user's behalf.

**Types:**
- **Stored**: payload is saved to the database (e.g. in a comment) and served to every visitor
- **Reflected**: payload is echoed immediately in the response (e.g. a search term in the URL)
- **DOM-based**: JavaScript reads from an attacker-controlled source (`location.hash`) and writes to the DOM

**Prevention:**

```js
// VULNERABLE
element.innerHTML = userInput;   // ← injected scripts execute

// SAFE — use textContent for plain text
element.textContent = userInput;

// SAFE — sanitise when HTML output is needed
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

Additional defences:
- **CSP** with nonces to block execution of injected scripts
- **HttpOnly cookies** so tokens can't be read by JS even if XSS occurs
- Avoid `eval`, `new Function`, `setTimeout(string)`

📖 See: [XSS, CSRF & Clickjacking → XSS](./04-browser-security/02-xss-csrf-clickjacking.md#cross-site-scripting-xss)

---

### SEC-3. What is CSRF and how do `SameSite` cookies prevent it?

**Answer:**

**Cross-Site Request Forgery (CSRF)** tricks the user's browser into sending a state-changing request to a site where they are authenticated. The browser automatically includes cookies, so the server can't distinguish the forged request from a legitimate one.

```html
<!-- On evil.com — auto-submits a transfer when the page loads -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
</form>
<script>document.forms[0].submit();</script>
```

**`SameSite` cookie attribute** is the most effective modern defence:

```
Set-Cookie: session=abc; SameSite=Strict; Secure; HttpOnly
```

- `SameSite=Strict` — cookie is never sent on any cross-site request (even top-level navigation). Secure but breaks flows like clicking an email link to a logged-in page.
- `SameSite=Lax` — cookie is sent on safe top-level navigation (GET) but not on `<img>`, `<form POST>`, or iframe requests. Good balance.
- `SameSite=None; Secure` — always sent cross-origin (requires HTTPS). Use only for explicit cross-site scenarios like OAuth.

📖 See: [XSS, CSRF & Clickjacking → CSRF](./04-browser-security/02-xss-csrf-clickjacking.md#cross-site-request-forgery-csrf)

---

### SEC-4. Where should you store JWTs in the browser and why?

**Answer:**

| Storage | XSS safe? | CSRF safe? | Notes |
|---|---|---|---|
| `localStorage` | ❌ | ✅ | JS can read it — XSS steals the token |
| `sessionStorage` | ❌ | ✅ | Cleared on tab close, still JS-readable |
| HttpOnly cookie | ✅ | ❌ needs SameSite | JS can't read it, but auto-sent cross-site |
| Memory (JS variable) | ✅ | ✅ | Lost on refresh — use with refresh token |

**Best practice**: Store the **access token in memory** (a module-level variable or React context) and use a **HttpOnly, SameSite=Strict, Secure** cookie for the **refresh token**. On page load, silently exchange the refresh token for a new access token.

This way: the refresh token can't be stolen by XSS (HttpOnly) and CSRF can't forge requests because `SameSite=Strict` blocks cross-site submissions.

📖 See: [Authentication Patterns in the Browser → Token-based Auth](./04-browser-security/03-auth-patterns.md#token-based-auth-jwt)

---

## Testing

### TEST-1. What is the testing pyramid? How do you balance unit, integration, and E2E tests?

**Answer:**

```
         /\
        /E2E\         Few — slow, full-stack, highest confidence
       /------\
      / Integ  \      Moderate — component + API interaction
     /----------\
    /    Unit    \    Many — fast, isolated, pure logic
```

- **Unit tests** — test a single function or class in isolation. Fast (< 1ms each), deterministic. Use for pure logic: utils, reducers, formatters. Tools: Jest, Vitest.
- **Component / integration tests** — render a component with real child components and a mocked API layer (MSW). Test user interactions. Tools: React Testing Library + MSW.
- **E2E tests** — run the real app in a real browser. Catch things no unit test can: routing, server integration, visual layout. Slow (seconds each). Use only for critical paths. Tools: Playwright, Cypress.

The pyramid shape reflects ROI: unit tests are cheap to write and maintain, E2E tests are expensive and flaky. Don't invert the pyramid (lots of E2E, few units) — it leads to slow, brittle CI.

📖 See: [E2E Testing → Testing Pyramid](./05-testing/03-e2e-testing.md#testing-pyramid-guidance) | [Unit Testing](./05-testing/01-unit-testing.md) | [Component Testing](./05-testing/02-component-testing.md)

---

### TEST-2. Why should you query by role in React Testing Library instead of by CSS class?

**Answer:**

RTL's guiding principle: **test your software the way users use it**. Users don't see CSS class names or internal IDs — they see a "Submit button" or an "Email field." Querying by role reflects how assistive technology (screen readers) perceives the UI.

```tsx
// ❌ Fragile — breaks when you rename .btn-primary or change the div to a button
container.querySelector('.btn-primary')
screen.getByTestId('submit-btn')

// ✅ Resilient — survives HTML restructuring; also validates accessibility
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
```

Additional benefits: queries by role fail if the element is not accessible (e.g. a `<div>` with an `onClick` but no `role`), encouraging accessible markup. They also survive styling changes and HTML refactors.

📖 See: [Component Testing with React Testing Library → Query Priority](./05-testing/02-component-testing.md#query-priority-high--low)

---

### TEST-3. What is Mock Service Worker (MSW) and why is it better than mocking `fetch`?

**Answer:**

MSW intercepts HTTP requests at the **network level** using a Service Worker (in browser) or Node `http` interceptors (in tests) — the application code makes real `fetch` calls and they are intercepted before hitting the network.

**Why this is better than mocking fetch directly:**

```js
// Manual fetch mock — testing implementation detail
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockUser),
});
// If you switch from fetch to axios, your mock breaks
// If fetch is called twice, you have to track it manually
```

```js
// MSW — intercepts at network level, framework-agnostic
const server = setupServer(
  rest.get('/api/users/1', (req, res, ctx) => res(ctx.json(mockUser)))
);

// Your component calls fetch normally — MSW intercepts it
// Works with fetch, axios, ky, or any HTTP client
// Test different scenarios by swapping handlers per test
server.use(rest.get('/api/users/1', (_, res, ctx) => res(ctx.status(404))));
```

📖 See: [Component Testing → Testing Async / Data Fetching](./05-testing/02-component-testing.md#testing-async--data-fetching)

---

## Web Performance

### PERF-1. What are Core Web Vitals? How do you improve each?

**Answer:**

Google's three metrics that measure real-user experience:

**LCP (Largest Contentful Paint)** — loading performance. When does the largest visible element render?
- Target: ≤ 2.5s
- Improve: fast TTFB (CDN, server-side rendering), preload the LCP image (`<link rel="preload">`), optimise image format (WebP/AVIF), avoid render-blocking scripts

**INP (Interaction to Next Paint)** — interactivity. How quickly does the page respond to user input?
- Target: ≤ 200ms
- Improve: break up long tasks (> 50ms), use `scheduler.yield()`, move heavy work to Web Workers, avoid synchronous layout reads in event handlers

**CLS (Cumulative Layout Shift)** — visual stability. How much does content shift unexpectedly?
- Target: ≤ 0.1
- Improve: always set `width` + `height` on images, reserve space for ads/embeds, use `font-display: swap` + size-adjust for web fonts, avoid late-injected DOM content

📖 See: [Core Web Vitals & Performance Metrics](./06-web-performance/01-core-web-vitals.md)

---

### PERF-2. What is the difference between debounce and throttle? Give examples.

**Answer:**

Both limit how often a function runs in response to high-frequency events.

**Debounce** — delays execution until the event **stops firing** for a given time. Resets the timer on every call. Use when you want to react only after the user has finished an action.

```js
// Search input — only search after user stops typing for 300ms
const debouncedSearch = debounce(searchAPI, 300);
inputEl.addEventListener('input', e => debouncedSearch(e.target.value));
// If user types fast, only the last value triggers the API call
```

**Throttle** — fires at most **once per time window**, regardless of how many calls arrive. Use when you want steady execution during continuous activity.

```js
// Scroll handler — runs at most once every 100ms during scroll
const throttledScroll = throttle(updateScrollPosition, 100);
window.addEventListener('scroll', throttledScroll);
```

| | Debounce | Throttle |
|---|---|---|
| Fires when | After quiet period | At steady rate |
| Best for | Search, resize handler, form validation | Scroll, pointer move, game loop |
| During continuous events | Last call wins | Regular intervals |

📖 See: [Performance Patterns → Debounce & Throttle](./03-design-patterns/04-performance-patterns.md#debounce--throttle) | [Rendering Performance](./06-web-performance/03-rendering-performance.md)

---

### PERF-3. How does HTTP caching work, and what is the immutable hashing pattern?

**Answer:**

The browser checks `Cache-Control` headers to decide whether to use a cached response or revalidate with the server.

```
Cache-Control: public, max-age=31536000, immutable
  → Cache for 1 year; never revalidate (for content-hashed assets)

Cache-Control: no-cache
  → Always revalidate (using ETag / Last-Modified), but can serve from cache if unchanged

Cache-Control: no-store
  → Never cache (sensitive pages: banking, health data)
```

**Immutable hashing pattern** — bundlers (Vite, webpack, Next.js) hash the file content into the filename:

```
/static/js/main.a3f9c2d1.js  → Cache-Control: max-age=31536000, immutable
/index.html                  → Cache-Control: no-cache
```

The HTML is always revalidated (fast — just an ETag check). When you deploy, only changed assets get new hashes, so users re-download only what changed. Unchanged assets are served instantly from cache.

📖 See: [Network & Asset Optimisation → HTTP Caching](./06-web-performance/02-network-asset-optimisation.md#http-caching)

---

### PERF-4. What causes layout thrashing and how do you fix it?

**Answer:**

**Layout thrashing** happens when JavaScript alternately reads and writes layout properties, forcing the browser to recalculate layout multiple times in a single frame. Each read after a write flushes the pending layout.

```js
// THRASHING — read then write per element forces N reflows
elements.forEach(el => {
  const h = el.offsetHeight;              // read — flush pending layout
  el.style.height = (h + 10) + 'px';     // write — invalidate layout
  // Next iteration reads again — another layout recalculation!
});

// FIX — batch all reads first, then all writes
const heights = elements.map(el => el.offsetHeight);  // 1 layout pass
elements.forEach((el, i) => {
  el.style.height = (heights[i] + 10) + 'px';         // 1 write pass
});
```

Properties that trigger layout on read: `offsetWidth/Height`, `clientWidth/Height`, `scrollTop`, `getBoundingClientRect()`.

For animations, prefer CSS `transform` and `opacity` (compositor-only, no layout/paint) over animating `top`, `left`, `width`, `height`.

📖 See: [Rendering Performance → The Browser Rendering Pipeline](./06-web-performance/03-rendering-performance.md#the-browser-rendering-pipeline)

---

## Mixed / Scenario Questions

### MIX-1. A page loads slowly. Walk me through how you would diagnose and fix it.

**Answer:**

**Step 1 — Measure first** (don't guess)

Open Chrome DevTools → **Lighthouse** for an overall score and specific recommendations. Then **Performance tab** → record the page load to get a flame chart and identify long tasks.

Check **PageSpeed Insights** for field data (CrUX) to see real-user metrics (LCP, INP, CLS).

**Step 2 — Categorise the problem**

| Symptom | Likely cause | Fix |
|---|---|---|
| High TTFB | Slow server / no CDN | CDN, server-side caching, DB query optimization |
| High LCP | Large image, render-blocking JS | Preload LCP image, defer non-critical scripts, optimise image format |
| High TBT/INP | Long JS tasks | Code split, defer, Web Workers, yield to main thread |
| High CLS | Images without dimensions, late fonts | width/height on images, font-display: swap, size-adjust |
| Large bundle | Unused JS shipped | Tree-shaking, code splitting, dynamic imports |

**Step 3 — Fix and re-measure**

```
Network panel → filter by size → find large resources
Coverage tab → identify unused JS/CSS
Performance Insights → "Opportunities" section
```

📖 See: [Core Web Vitals](./06-web-performance/01-core-web-vitals.md) | [Network & Asset Optimisation](./06-web-performance/02-network-asset-optimisation.md) | [Rendering Performance](./06-web-performance/03-rendering-performance.md)

---

### MIX-2. How would you implement a type-safe API client in TypeScript?

**Answer:**

```ts
// types.ts
interface User { id: number; name: string; email: string; }
interface Post { id: number; title: string; body: string; userId: number; }

// api-client.ts
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Typed API methods
export const api = {
  users: {
    getById: (id: number) =>
      apiFetch<User>(`/api/users/${id}`),
    update: (id: number, data: Partial<Omit<User, 'id'>>) =>
      apiFetch<User>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  posts: {
    list: () => apiFetch<Post[]>('/api/posts'),
    create: (data: Omit<Post, 'id'>) =>
      apiFetch<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  },
};

// Usage — fully typed
const user = await api.users.getById(1);   // user: User
user.email;    // ✅ string
user.foo;      // ❌ compile error
```

For more advanced cases: use **Zod** to validate and parse the response at runtime (the generic `T` assertion only tells TypeScript the type, but doesn't validate the actual API response).

📖 See: [Generics](./02-typescript/02-generics.md) | [Utility Types](./02-typescript/03-utility-types.md) | [Asynchronous JavaScript](./01-javascript/02-async-javascript.md)

---

### MIX-3. How do you prevent XSS while still allowing some HTML in user content?

**Answer:**

The challenge: users want to format their text (bold, links, lists) but allowing raw HTML opens XSS vulnerabilities.

**Strategy 1 — Sanitise with DOMPurify** (whitelist approach):

```js
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  // Force safe rel on links
  FORCE_BODY: true,
});

element.innerHTML = clean;
```

Always configure `ALLOWED_TAGS` — the default allows too much.

**Strategy 2 — Use a safe markup language (Markdown)**:

Accept Markdown input and render it with a safe renderer (marked + DOMPurify, or react-markdown with allowedElements):

```tsx
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {userMarkdownContent}
</ReactMarkdown>
```

**Strategy 3 — CSP as a defence-in-depth layer** (not a replacement for sanitisation):

Even if a payload slips through, a strict CSP with nonces blocks inline script execution.

📖 See: [XSS Prevention](./04-browser-security/02-xss-csrf-clickjacking.md#prevention) | [CSP](./04-browser-security/01-cors-csp.md#content-security-policy-csp)
