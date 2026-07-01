# The Event Loop & Browser APIs

## How the Event Loop Works

JavaScript runs on a single thread. Long-running work would freeze the UI. The event loop lets the engine stay responsive by deferring work:

```
┌─────────────┐
│  Call Stack │  ← synchronous execution
└──────┬──────┘
       │ empty?
       ▼
┌─────────────────┐
│ Microtask Queue │  ← Promises, queueMicrotask  (drain ALL before next step)
└────────┬────────┘
         │ empty?
         ▼
┌──────────────────┐
│ Macrotask Queue  │  ← setTimeout, setInterval, I/O  (one per loop tick)
└──────────────────┘
```

```js
console.log('A');

setTimeout(() => console.log('B'), 0);       // macrotask

Promise.resolve()
  .then(() => console.log('C'))              // microtask
  .then(() => console.log('D'));             // microtask (queued after C runs)

console.log('E');

// Output: A E C D B
```

## setTimeout & setInterval

```js
// Execute once after a delay (ms)
const id = setTimeout(callback, delay, ...args);
clearTimeout(id);

// Execute repeatedly
const intervalId = setInterval(callback, interval);
clearInterval(intervalId);

// setTimeout(fn, 0) doesn't mean "immediately" — it means
// "as soon as the call stack and microtask queue are clear"
```

## requestAnimationFrame

Schedules a callback before the next browser repaint (~16ms at 60fps). Better than `setInterval` for animations because it:
- Synchronises with display refresh rate
- Pauses when the tab is hidden (saves battery)
- Provides a high-resolution timestamp

```js
function animate(timestamp) {
  // update state based on timestamp
  draw();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

## Web Storage APIs

```js
// sessionStorage — cleared when tab closes
sessionStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(sessionStorage.getItem('key'));

// localStorage — persists across sessions (same origin)
localStorage.setItem('prefs', JSON.stringify(prefs));
localStorage.removeItem('prefs');
localStorage.clear();
```

Both are synchronous and store only strings. For large structured data use IndexedDB.

## Fetch API

```js
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Abort a fetch
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort();  // cancels the request
```

Note: `fetch` only rejects on network failure. HTTP 4xx/5xx responses still resolve — check `response.ok`.

## MutationObserver & IntersectionObserver

```js
// Watch for DOM changes
const observer = new MutationObserver(mutations => {
  mutations.forEach(m => console.log(m.type, m.target));
});
observer.observe(targetNode, { childList: true, subtree: true });

// Detect when elements enter/leave the viewport — lazy loading, infinite scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) loadImage(entry.target);
  });
}, { threshold: 0.1 });

document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
```

## Interview Questions

**Q: What is the difference between `setTimeout(fn, 0)` and `Promise.resolve().then(fn)`?**
Both schedule `fn` to run after the current synchronous code, but Promise callbacks go into the microtask queue while setTimeout goes into the macrotask queue. Microtasks are fully drained before the next macrotask runs, so the Promise callback always executes first.

**Q: Why should you use `requestAnimationFrame` instead of `setInterval` for animations?**
`rAF` synchronises with the browser's repaint cycle, ensuring smooth 60fps animations without over-rendering. `setInterval` may fire at the wrong time relative to paints (causing jank) and continues running even in background tabs, wasting CPU.

**Q: What is the difference between `localStorage` and `sessionStorage`?**
Both store key-value strings per origin. `localStorage` persists indefinitely across browser sessions; `sessionStorage` is cleared when the tab or window is closed. Neither is shared between tabs (`sessionStorage`) or origins (`localStorage`).
