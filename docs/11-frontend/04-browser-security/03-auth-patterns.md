# Authentication Patterns in the Browser

## Cookie-based Sessions

The server creates a session and sends a `Set-Cookie` with a session ID. The browser automatically includes the cookie on every subsequent request to the same origin.

```
POST /login → 200 OK
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax; Path=/
```

**Advantages**: HttpOnly cookies are inaccessible to JavaScript (XSS-safe). Session can be invalidated server-side instantly.

**Disadvantages**: Stateful (server must store sessions), requires CSRF protection, harder for APIs consumed by multiple clients.

## Token-based Auth (JWT)

The server issues a signed JWT on login. The client stores it and sends it with every request via the `Authorization` header.

```
POST /login → 200 OK
{ "token": "eyJhbGciOiJIUzI1NiJ9..." }

GET /api/me
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Where to Store JWTs

| Storage | XSS safe? | CSRF safe? | Notes |
|---|---|---|---|
| `localStorage` | ❌ No | ✅ Yes | JS can read it — stolen by XSS |
| `sessionStorage` | ❌ No | ✅ Yes | Cleared on tab close, still JS-readable |
| HttpOnly cookie | ✅ Yes | ❌ Needs SameSite | Best of both when combined with SameSite |
| Memory (JS variable) | ✅ Yes | ✅ Yes | Lost on page refresh |

**Best practice**: Store access token in memory; use a HttpOnly `SameSite=Strict` refresh token cookie to get new access tokens silently.

### JWT Structure

```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← base64(header)
.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIn0  ← base64(payload)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c      ← HMAC signature
```

JWTs are **signed, not encrypted**. The payload is base64-encoded and readable by anyone. Never put sensitive data in the payload unless you also encrypt (JWE).

## OAuth 2.0 + PKCE (for SPAs)

Single-Page Apps cannot keep secrets (no server-side code), so they use the **Authorization Code flow with PKCE** (Proof Key for Code Exchange) instead of the implicit flow.

```
1. App generates: code_verifier (random), code_challenge = SHA256(code_verifier)
2. Redirect to auth server with code_challenge
3. User authenticates; auth server returns code
4. App exchanges code + code_verifier for tokens
   (Auth server verifies SHA256(code_verifier) === code_challenge)
```

PKCE prevents authorization code interception attacks — an attacker who intercepts the code can't exchange it without the verifier.

## Refresh Token Rotation

Short-lived access tokens (5–15 min) with long-lived refresh tokens. On every refresh:

```
POST /auth/refresh
Cookie: refresh_token=xyz  (HttpOnly)

→ New access token (in response body)
→ New refresh token (rotated — old one invalidated)
   Set-Cookie: refresh_token=new_xyz; HttpOnly; Secure; SameSite=Strict
```

Rotation means a stolen refresh token can be detected: if the old token is used after rotation, the server knows the token was compromised and can invalidate the entire session family.

## Content Security for Auth Pages

```
# Login and sensitive pages should always use
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Cache-Control: no-store  # don't cache pages with sensitive data
```
