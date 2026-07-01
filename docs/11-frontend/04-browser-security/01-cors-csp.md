# Same-Origin Policy, CORS & CSP

## Same-Origin Policy (SOP)

A browser security rule: a page can only read responses from the **same origin** (scheme + host + port). It prevents a malicious page from silently reading your bank data via `fetch`.

```
https://example.com:443  ← origin

https://example.com/api     ✅ same origin
https://sub.example.com     ❌ different host
http://example.com          ❌ different scheme
https://example.com:8080    ❌ different port
```

SOP blocks **reads** cross-origin; it doesn't block cross-origin **writes** (form submissions, redirects) — that's CSRF's domain.

## CORS (Cross-Origin Resource Sharing)

A server-controlled relaxation of SOP via HTTP headers. The **server** declares which origins are allowed.

### Simple vs Preflighted Requests

**Simple request** (GET/POST with safe headers and content types) — browser sends it directly with an `Origin` header; server responds with `Access-Control-Allow-Origin`.

**Preflighted request** — for methods like PUT/DELETE, custom headers, or JSON body — browser sends an `OPTIONS` request first:

```
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Authorization

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Authorization
Access-Control-Max-Age: 86400
```

### Key CORS Headers

| Header | Direction | Purpose |
|---|---|---|
| `Access-Control-Allow-Origin` | Response | Which origins are allowed (`*` or specific) |
| `Access-Control-Allow-Methods` | Response | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Response | Allowed request headers |
| `Access-Control-Allow-Credentials` | Response | Allow cookies/auth headers |
| `Access-Control-Max-Age` | Response | How long to cache preflight (seconds) |

```js
// Fetch with credentials (cookies) — both sides must opt in
fetch('https://api.example.com/me', {
  credentials: 'include',
});
// Server must respond with:
// Access-Control-Allow-Origin: https://app.example.com  (not *)
// Access-Control-Allow-Credentials: true
```

## Content Security Policy (CSP)

An HTTP response header (or `<meta>` tag) that tells the browser which sources are trusted for scripts, styles, images, etc. The browser enforces it — inline scripts and untrusted CDNs are blocked.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com 'nonce-abc123';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  report-uri /csp-report;
```

### Key Directives

| Directive | Controls |
|---|---|
| `default-src` | Fallback for unspecified types |
| `script-src` | JavaScript sources |
| `style-src` | CSS sources |
| `img-src` | Image sources |
| `connect-src` | fetch, XHR, WebSocket |
| `frame-ancestors` | Who can embed this page (replaces X-Frame-Options) |
| `report-uri` / `report-to` | Where to send violation reports |

### Nonce-based CSP (preferred over `unsafe-inline`)

```html
<!-- Server generates a fresh nonce per request -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'nonce-abc123'">

<!-- Only scripts with the matching nonce are executed -->
<script nonce="abc123">
  // allowed
</script>
<script>
  // blocked
</script>
```

### Reporting-Only Mode

Test your CSP without breaking the site:

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

Violations are reported but not blocked.
