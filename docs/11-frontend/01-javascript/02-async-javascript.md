# Asynchronous JavaScript

## Callbacks

The original async pattern — pass a function to be called when the operation completes. Leads to "callback hell" (deeply nested, hard to reason about).

```js
fs.readFile('a.txt', (err, data) => {
  if (err) return handleError(err);
  fs.readFile('b.txt', (err2, data2) => {
    // deeply nested...
  });
});
```

## Promises

A Promise represents a value that will be available in the future. It is in one of three states: `pending`, `fulfilled`, or `rejected`. Once settled it never changes state.

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve(42), 1000);
});

p.then(value => console.log(value))   // 42
 .catch(err => console.error(err))
 .finally(() => console.log('done'));
```

### Promise Combinators

```js
// All must succeed — rejects on first failure
Promise.all([fetch('/a'), fetch('/b')]).then(([a, b]) => ...);

// Resolves/rejects with the first settled promise
Promise.race([timeoutPromise(5000), fetchData()]);

// Waits for all — never rejects; gives { status, value/reason } per item
Promise.allSettled([p1, p2, p3]).then(results => results.forEach(...));

// Resolves with the first fulfilled value; rejects only if ALL fail
Promise.any([p1, p2, p3]);
```

## async / await

Syntactic sugar over Promises — makes async code read like synchronous code.

```js
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('Fetch failed:', err);
    throw err;
  }
}

// Parallel execution — don't await sequentially if independent
async function loadDashboard() {
  const [user, posts] = await Promise.all([fetchUser(1), fetchPosts()]);
  return { user, posts };
}
```

### Common async/await Mistakes

```js
// BAD — sequential, each awaits before starting the next
for (const id of ids) {
  const item = await fetch(`/api/${id}`);  // slow
}

// GOOD — parallel
const items = await Promise.all(ids.map(id => fetch(`/api/${id}`)));
```

## The Event Loop

JavaScript is single-threaded. The event loop coordinates:

1. **Call stack** — currently executing synchronous code
2. **Web APIs / Node APIs** — handles async ops (setTimeout, fetch, I/O)
3. **Microtask queue** — Promise callbacks, `queueMicrotask`
4. **Macrotask queue** (task queue) — setTimeout, setInterval, I/O callbacks

**Priority**: call stack → microtasks (drain completely) → one macrotask → microtasks → ...

```js
console.log('1');                            // sync
setTimeout(() => console.log('2'), 0);       // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');                            // sync

// Output: 1, 4, 3, 2
```

## Interview Questions

**Q: What is the difference between `Promise.all` and `Promise.allSettled`?**
`Promise.all` rejects immediately if any promise rejects (fail-fast). `Promise.allSettled` always waits for every promise and returns an array of outcome objects, making it suitable when you need all results regardless of individual failures.

**Q: Why does `await` in a `for` loop run sequentially?**
Each `await` pauses the `async` function until the promise settles before moving to the next iteration. Use `Promise.all` with `.map()` to run iterations in parallel.

**Q: What is the microtask queue?**
A higher-priority queue processed after every task (and after each macrotask) before the engine picks up the next macrotask. Promise `.then`/`.catch`/`.finally` callbacks are microtasks. This is why `Promise.resolve().then(...)` always runs before `setTimeout(..., 0)`.
