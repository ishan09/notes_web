# Rendering Performance

## The Browser Rendering Pipeline

```
JavaScript → Style → Layout → Paint → Composite
```

Each stage has a cost. Some CSS changes skip expensive stages:

| Change | Triggers |
|---|---|
| `width`, `height`, `margin`, `padding` | Layout + Paint + Composite (most expensive) |
| `background-color`, `color`, `border` | Paint + Composite |
| `transform`, `opacity` | Composite only (cheapest — GPU accelerated) |

**Avoid triggering layout in a loop** (causes "layout thrashing"):

```js
// BAD — read → write → read → write (forces multiple reflows)
elements.forEach(el => {
  const height = el.offsetHeight;  // read — forces layout
  el.style.height = height + 10 + 'px';  // write — invalidates layout
});

// GOOD — batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight);  // batch reads
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';           // batch writes
});
```

## will-change & GPU Layers

```css
/* Promote element to its own compositor layer — reduces paint on animation */
.animated-element {
  will-change: transform;
}

/* Prefer transform/opacity for animations — stays on GPU */
.slide-in {
  animation: slideIn 0.3s ease-out;
}
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}

/* Avoid animating layout-triggering properties */
.dont-animate-these {
  /* animation: width, height, top, left */  /* causes layout every frame */
}
```

Use `will-change` sparingly — each layer consumes GPU memory. Remove it after the animation ends.

## requestAnimationFrame for JS Animations

```js
function animate() {
  const now = performance.now();

  // update positions based on elapsed time
  elements.forEach(el => {
    const x = Math.sin(now / 1000) * 100;
    el.style.transform = `translateX(${x}px)`;
  });

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

Never use `setInterval` for animations — it may fire mid-frame, causing jank. `rAF` fires exactly once per frame, synchronized with the display refresh.

## Long Tasks & the Main Thread

Any task that runs for more than **50ms** is a "long task". It blocks the main thread and makes the page feel unresponsive (high INP).

### Yielding to the Main Thread

```js
// Break long processing into chunks, yielding between each
async function processChunked(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    // Yield every 50 items — let browser handle input/paint
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// scheduler.yield() (Chrome 115+ — more precise)
async function processChunkedModern(items) {
  for (const item of items) {
    processItem(item);
    if ('scheduler' in globalThis) {
      await scheduler.yield();
    }
  }
}
```

### Web Workers for CPU-Heavy Work

```js
// worker.js
self.onmessage = ({ data }) => {
  const result = heavyComputation(data);
  self.postMessage(result);
};

// main.js — runs in a separate thread, never blocks UI
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.postMessage(largeDataset);
worker.onmessage = ({ data }) => updateUI(data);
```

Use Web Workers for: image processing, data parsing, encryption, sorting large arrays.

## React-specific Rendering

```tsx
// useDeferredValue — defer non-urgent UI updates (React 18)
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query — urgent input stays responsive
  const results = useMemo(() => filterItems(deferredQuery), [deferredQuery]);
  return <List items={results} />;
}

// startTransition — mark an update as non-urgent
function handleTabChange(tab: string) {
  startTransition(() => {
    setSelectedTab(tab);   // can be interrupted by higher-priority updates
  });
}

// useTransition — with pending state
const [isPending, startTransition] = useTransition();
```

## Profiling Tools

| Tool | What it shows |
|---|---|
| Chrome DevTools Performance tab | Flame chart, long tasks, layout events, paint |
| Chrome DevTools Layers panel | GPU compositor layers |
| React DevTools Profiler | Component render time, why-did-it-render |
| `performance.mark()` / `measure()` | Custom timing in your code |

```js
// Custom marks for profiling
performance.mark('data-processing-start');
processData(largeArray);
performance.mark('data-processing-end');
performance.measure('data-processing', 'data-processing-start', 'data-processing-end');

const [measure] = performance.getEntriesByName('data-processing');
console.log(`Took ${measure.duration}ms`);
```
