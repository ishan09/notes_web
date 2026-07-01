# XSS, CSRF & Clickjacking

## Cross-Site Scripting (XSS)

An attacker injects malicious script into a page that other users load. The script runs in the victim's browser with the site's origin — it can steal cookies, tokens, or session data.

### Types

| Type | How it works |
|---|---|
| **Reflected** | Malicious input echoed immediately in the response (URL param → page content) |
| **Stored / Persistent** | Payload stored in the DB (comment, username) and served to all viewers |
| **DOM-based** | JavaScript reads from an attacker-controlled source (`location.hash`) and writes to the DOM without going through the server |

### Vulnerable vs Safe Patterns

```js
// VULNERABLE — directly inserts untrusted HTML
element.innerHTML = userComment;
document.write(userInput);

// SAFE — use textContent for plain text
element.textContent = userComment;

// SAFE — sanitise with DOMPurify if HTML is required
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userComment);
```

### Prevention

1. **Escape output** — HTML-encode all user-controlled values before rendering
2. **Use textContent / innerText** instead of innerHTML where HTML is not needed
3. **Sanitise HTML** with a trusted library (DOMPurify) when HTML output is required
4. **CSP** blocks execution of injected scripts — see [`01-cors-csp.md`](./01-cors-csp.md)
5. **HttpOnly cookies** — tokens in HttpOnly cookies can't be stolen by JS
6. **Avoid `eval`, `new Function`, `setTimeout(string)`**

## Cross-Site Request Forgery (CSRF)

A malicious site tricks the user's browser into sending a state-changing request to a site where the user is already authenticated. The browser automatically includes cookies, so the server can't tell the request wasn't intended.

```html
<!-- Attacker's page — sends a forged request to your bank -->
<img src="https://bank.com/transfer?to=attacker&amount=1000" />
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="1000" />
  <button>Click to win!</button>
</form>
```

### Prevention

1. **SameSite cookies** — the most effective modern defence

   ```
   Set-Cookie: session=abc; SameSite=Strict; Secure; HttpOnly
   # Strict — never sent cross-site
   # Lax    — sent on top-level navigations (GET), not on sub-resource requests
   ```

2. **CSRF token** — server generates a random per-session token; the form must include it; server validates it

   ```html
   <form method="POST">
     <input type="hidden" name="_csrf" value="{{ csrfToken }}" />
   </form>
   ```

3. **Custom request header** — APIs that require `Content-Type: application/json` or a custom header (e.g. `X-Requested-With`) are safe because browsers don't set these in cross-origin simple requests without preflight

4. **Check `Origin` / `Referer` header** on the server

### CSRF vs XSS

| | XSS | CSRF |
|---|---|---|
| Goal | Steal data / run JS as victim | Trick browser into unwanted action |
| Attack vector | Injected script | Cross-site request |
| SOP helps? | No — attacker's script is on the victim's origin | Yes — SOP prevents reading the response, but not sending the request |

## Clickjacking

An attacker embeds your page in a hidden `<iframe>` and overlays it with deceptive content. The user clicks on the invisible layer and interacts with your page unknowingly.

```html
<!-- Attacker's page -->
<iframe src="https://bank.com/transfer-funds" style="opacity:0; position:absolute;"></iframe>
<button style="position:absolute;">Win a Prize!</button>
```

### Prevention

```
# Prevent any embedding
X-Frame-Options: DENY

# Allow embedding by same origin only
X-Frame-Options: SAMEORIGIN

# Modern replacement via CSP
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self' https://trusted.com;
```

`frame-ancestors` in CSP is more flexible and supersedes `X-Frame-Options`.
