# Performance Patterns

## Code Splitting & Lazy Loading

Don't ship all JavaScript upfront. Split at route or component boundaries and load on demand.

```tsx
// Route-level code splitting (React + React Router)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings  = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

```tsx
// Component-level — load a heavy modal only when opened
const HeavyModal = lazy(() => import('./HeavyModal'));

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Suspense fallback={<Spinner />}>
          <HeavyModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

## Virtualisation (Windowing)

Render only the visible portion of a long list. For 10,000 rows, only ~20 DOM nodes exist at a time.

```tsx
import { FixedSizeList } from 'react-window';

function Row({ index, style }: ListChildComponentProps) {
  return <div style={style}>Row {index}</div>;
}

function VirtualList({ items }: { items: string[] }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={50}
    >
      {Row}
    </FixedSizeList>
  );
}
```

Libraries: `react-window` (lightweight), `react-virtual` (hooks-based), `@tanstack/virtual`.

## Memoization

Avoid re-computing expensive results or re-rendering unchanged components.

```tsx
// useMemo — memoize a computed value
const filteredItems = useMemo(
  () => items.filter(i => i.category === selectedCategory),
  [items, selectedCategory]   // recompute only when these change
);

// useCallback — stable function reference (prevents child re-renders)
const handleDelete = useCallback(
  (id: number) => dispatch(deleteItem(id)),
  [dispatch]
);

// React.memo — skip re-render if props didn't change (shallow comparison)
const ItemRow = React.memo(function ItemRow({ item, onDelete }: ItemRowProps) {
  return <div>{item.name} <button onClick={() => onDelete(item.id)}>Delete</button></div>;
});
```

**Don't over-memoize**: every memo has a comparison cost. Only add it when profiling shows a real problem.

## Debounce & Throttle

Control how often an expensive operation runs in response to high-frequency events.

```ts
// Debounce — wait until input stops, then fire once
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const debouncedSearch = useDebounce(searchInput, 300);

// Throttle — fire at most once per interval (scroll, resize)
function throttle<T extends (...args: any[]) => any>(fn: T, interval: number): T {
  let last = 0;
  return ((...args) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      return fn(...args);
    }
  }) as T;
}
```

## Image Optimisation Patterns

```html
<!-- Native lazy loading -->
<img src="hero.jpg" loading="lazy" decoding="async" alt="Hero" />

<!-- Responsive images — browser picks the best size -->
<img
  srcset="img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  src="img-800.jpg"
  alt="Product"
/>
```

```tsx
// Next.js — automatic optimisation
import Image from 'next/image';
<Image src="/hero.png" width={1200} height={600} priority alt="Hero" />
```

## Stale-While-Revalidate (SWR) Cache Pattern

Serve the cached value immediately, then fetch fresh data in the background and update.

```
Request → Cache hit? → Serve stale → Revalidate in background → Update UI

No cache → Fetch → Store → Serve
```

React Query and SWR implement this automatically with `staleTime` and `gcTime` options.

## Interview Questions

**Q: What is the difference between debounce and throttle?**
Debounce delays execution until after a quiet period — it resets the timer on every call. Throttle fires at most once per time window regardless of how many calls arrive. Use debounce for search-as-you-type (fire only after typing stops); use throttle for scroll or resize handlers (fire at a steady rate).

**Q: When should you use `React.memo`, `useMemo`, and `useCallback`?**
`React.memo` wraps a component to skip re-render when props haven't changed (shallow). `useMemo` caches a computed value between renders. `useCallback` caches a function reference between renders (prevents unnecessary `React.memo` busts from new function instances). All three trade memory for CPU — add them after profiling shows a problem, not preemptively.

**Q: How does virtualisation improve performance for long lists?**
Without virtualisation, all list items are in the DOM simultaneously — 10,000 `<div>` nodes means 10,000 layout, paint, and memory allocations even if only 20 are visible. Virtualisation keeps only the visible window in the DOM, recycles DOM nodes as the user scrolls, and reduces memory and paint time by orders of magnitude.
