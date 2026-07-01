# Network & Asset Optimisation

## HTTP Caching

Caching is the single highest-leverage performance improvement for repeat visitors.

```
Cache-Control: public, max-age=31536000, immutable
   └─ immutable files (hashed): cache for 1 year, never revalidate

Cache-Control: no-cache
   └─ must revalidate with server each time (uses ETag/Last-Modified)

Cache-Control: no-store
   └─ never cache (sensitive data: bank pages, health records)
```

**Immutable hashing pattern** (Vite, webpack, Next.js do this automatically):

```
/static/js/main.a3f9c2d1.js   ← hash in filename
                                  → Cache-Control: max-age=31536000, immutable
/index.html                   → Cache-Control: no-cache (or short TTL)
```

The HTML file always revalidates; hashed assets cache forever. When you deploy, only the changed asset gets a new hash, so users re-download only what changed.

## Resource Hints

```html
<!-- dns-prefetch — resolve DNS early for a cross-origin domain -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />

<!-- preconnect — DNS + TCP handshake + TLS negotiation early -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- preload — fetch a high-priority resource needed for current page -->
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/hero.jpg" as="image" />

<!-- prefetch — fetch a low-priority resource for the next page -->
<link rel="prefetch" href="/about.js" />

<!-- modulepreload — preload + parse an ES module -->
<link rel="modulepreload" href="/src/app.js" />
```

Use `preload` sparingly — every preload competes with other resources. Only preload what is needed within the first 3 seconds.

## Image Optimisation

```html
<!-- Modern formats — WebP or AVIF with fallback -->
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero" width="1200" height="600" loading="lazy" decoding="async" />
</picture>

<!-- Responsive sizing — browser picks the right resolution -->
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Photo"
/>
```

- **AVIF**: 50% smaller than JPEG, excellent quality, limited browser support
- **WebP**: 30% smaller than JPEG, wide support
- **JPEG XL**: future format, not yet widely supported
- Always specify `width` + `height` to prevent CLS

## Font Optimisation

```html
<!-- 1. Preconnect to font origin -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- 2. Preload the most critical font weight -->
<link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

```css
/* 3. font-display: swap — show fallback immediately, swap when ready */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-display: swap;
}

/* 4. Size-adjust to reduce CLS when font swaps */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust: 96.7%;    /* tweak until fallback matches Inter's metrics */
  ascent-override: 90%;
}
```

Use `font-display: optional` for decorative fonts where showing a fallback is acceptable.

## Bundle Optimisation

```js
// vite.config.ts — code splitting and tree-shaking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});
```

**Tree-shaking**: unused exports are removed at build time. Requires ES modules (not CommonJS) and no side-effect imports.

```js
// Good — tree-shakeable named import
import { debounce } from 'lodash-es';

// Bad — imports entire lodash, can't tree-shake CJS
import _ from 'lodash';
```

## HTTP/2 & HTTP/3

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Multiplexing | No (6 parallel connections) | Yes (one TCP connection) | Yes (QUIC — UDP-based) |
| Header compression | No | HPACK | QPACK |
| Server push | No | Yes (deprecated) | No |
| HOL blocking | TCP level | TCP level | Eliminated |

HTTP/2 makes the old "bundle everything into one file to save connections" advice obsolete — many small files over HTTP/2 can be faster than one large bundle.
