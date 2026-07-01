# Core Web Vitals & Performance Metrics

## Core Web Vitals (Google's ranking signals)

### LCP — Largest Contentful Paint

Measures **loading performance**: when does the largest visible content element (image, heading, video poster) render?

| Score | Threshold |
|---|---|
| Good | ≤ 2.5s |
| Needs improvement | 2.5s – 4.0s |
| Poor | > 4.0s |

Common LCP elements: hero image, `<h1>`, large `<p>`. Common causes of slow LCP: slow server, render-blocking resources, unoptimised images.

### FID → INP — Interaction to Next Paint (since March 2024)

Measures **interactivity**: how long until the browser responds to a user interaction (click, tap, key press)?

| Score | Threshold |
|---|---|
| Good | ≤ 200ms |
| Needs improvement | 200ms – 500ms |
| Poor | > 500ms |

Long tasks on the main thread (JavaScript execution) block the browser from responding.

### CLS — Cumulative Layout Shift

Measures **visual stability**: how much does content unexpectedly shift during the page lifetime?

| Score | Threshold |
|---|---|
| Good | ≤ 0.1 |
| Needs improvement | 0.1 – 0.25 |
| Poor | > 0.25 |

Common causes: images without `width`/`height`, late-injected ads, web fonts causing FOUT (Flash of Unstyled Text).

```html
<!-- Reserve space for images — prevents layout shift -->
<img src="hero.jpg" width="1200" height="600" alt="Hero" />

<!-- Or with CSS -->
<div style="aspect-ratio: 16/9;">
  <img src="hero.jpg" style="width:100%; height:100%;" alt="" />
</div>
```

## Other Important Metrics

| Metric | Measures | Good threshold |
|---|---|---|
| **TTFB** (Time to First Byte) | Server response speed | < 800ms |
| **FCP** (First Contentful Paint) | When first content appears | < 1.8s |
| **TTI** (Time to Interactive) | When page is fully interactive | < 3.8s |
| **TBT** (Total Blocking Time) | Main thread blocked time (FCP→TTI) | < 200ms |

## Measuring Performance

### In the browser

```js
// Navigation Timing API
const nav = performance.getEntriesByType('navigation')[0];
console.log('TTFB:', nav.responseStart - nav.fetchStart);
console.log('DOM ready:', nav.domContentLoadedEventEnd - nav.fetchStart);
console.log('Load:', nav.loadEventEnd - nav.fetchStart);

// PerformanceObserver — observe CWV in real time
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    console.log(entry.entryType, entry);
  });
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
```

### web-vitals library

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, rating }) {
  console.log(`${name}: ${value} (${rating})`);
  // send to your analytics endpoint
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

## Tools

| Tool | Use for |
|---|---|
| Chrome DevTools → Lighthouse | Audit a single page, get scores and recommendations |
| Chrome DevTools → Performance tab | Flame chart, identify long tasks and layout shifts |
| PageSpeed Insights | Real user data (CrUX) + lab data for a URL |
| WebPageTest | Waterfall analysis, multi-location, filmstrip |
| `web-vitals` library | Collect CWV from real users in production |
