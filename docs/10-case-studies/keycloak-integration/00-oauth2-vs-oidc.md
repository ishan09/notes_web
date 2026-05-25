# OAuth 2.0 vs OpenID Connect (OIDC)

> This is the single most confused topic in auth. Most developers use both without realising they are different things built on top of each other. Get this right before diving into Keycloak.

---

## The One-Line Difference

| | OAuth 2.0 | OpenID Connect (OIDC) |
|---|---|---|
| **Answers** | "Is this app allowed to access my data?" | "Who is this user?" |
| **Purpose** | Authorization (delegation of access) | Authentication (identity verification) |
| **Issues** | Access Token | Access Token + **ID Token** |
| **About** | Permissions / scopes | User identity |

**OIDC is OAuth 2.0 + an identity layer on top.**
You cannot have OIDC without OAuth 2.0. You can have OAuth 2.0 without OIDC.

---

## OAuth 2.0 — What It Actually Is

OAuth 2.0 was designed to solve one problem:

> "I want to let a third-party app access my Google Drive files **without giving it my Google password**."

```
You (Resource Owner)
  → authorize → Third-Party App (Client)
                  → gets Access Token from → Google (Authorization Server)
                  → uses token to access → Google Drive (Resource Server)
```

**OAuth 2.0 does NOT define:**
- How to log in a user
- What the user's name or email is
- Whether the user is authenticated at all

The Access Token is just a key to a resource. It tells you "this app has permission to read Drive files" — not "this is Alice from engineering".

---

## The Problem OAuth 2.0 Alone Creates

Because OAuth 2.0 only handles authorization, developers started abusing the Access Token for authentication — calling `/userinfo` endpoints and treating the token as proof of identity. This was fragile and inconsistent across providers.

```
# Apps started doing this (unofficial, not part of OAuth 2.0 spec):
GET /api/me
Authorization: Bearer <access_token>
→ Returns user info

# But every provider had a different endpoint, different field names, different token formats.
# No standard. No interoperability.
```

---

## OpenID Connect — The Solution

OIDC (2014) standardised identity on top of OAuth 2.0 by adding:

1. **ID Token** — a signed JWT that carries user identity claims
2. **UserInfo Endpoint** — standard endpoint to get user claims
3. **Discovery Endpoint** — standard URL for provider metadata
4. **Standard Claims** — `sub`, `name`, `email`, `picture`, etc.
5. **`openid` scope** — signals "I want identity, not just access"

```
OAuth 2.0 alone:
  → Access Token (opaque blob — just a key)

OAuth 2.0 + OIDC:
  → Access Token (key to resources)
  → ID Token (JWT — who the user is)
  → UserInfo Endpoint (additional user profile)
```

---

## Side-by-Side Comparison

| Aspect | OAuth 2.0 | OpenID Connect |
|---|---|---|
| Purpose | Delegated authorization | User authentication + authorization |
| Spec type | Authorization framework | Identity layer (profile on top of OAuth 2.0) |
| Core token | Access Token | Access Token + ID Token |
| Token format | Not specified (opaque or JWT) | ID Token is always JWT |
| User identity | Not defined | `sub`, `name`, `email` in ID Token |
| Scopes | Any custom scope | Includes standard `openid`, `profile`, `email` |
| Discovery | Not defined | `/.well-known/openid-configuration` |
| UserInfo | Not defined | Standard `/userinfo` endpoint |
| Login flow | Not defined | Authorization Code Flow defined |
| Used for | API access, third-party delegation | Login/SSO, federated identity |
| Issued by | Authorization Server | Identity Provider (IdP) |

---

## The Scope Signals the Difference

```
# OAuth 2.0 only — request API access, no identity
GET /auth?scope=drive.readonly&response_type=code...
→ Returns: Access Token only
→ You can read Drive, but you don't know who the user is

# OIDC — request identity too
GET /auth?scope=openid+profile+email&response_type=code...
→ Returns: Access Token + ID Token
→ ID Token tells you: sub, name, email, picture
→ Access Token is still used for API calls
```

The `openid` scope is the trigger. Without it, you get OAuth 2.0. With it, you get OIDC.

---

## The Three Tokens in OIDC

```
Token Exchange Response:
{
  "access_token": "eyJhbGci...",   ← OAuth 2.0 — send to your APIs
  "id_token":     "eyJhbGci...",   ← OIDC — read user identity in your app
  "refresh_token": "eyJhbGci...",  ← OAuth 2.0 — get new access tokens
  "token_type":   "Bearer",
  "expires_in":   300
}
```

### Access Token — "What can this app do?"
```json
{
  "sub": "user-uuid",
  "scope": "openid profile email orders:read",
  "aud": ["my-api"],
  "exp": 1716000300,
  "realm_access": { "roles": ["user"] }
}
```
→ Send to your **APIs** in the `Authorization: Bearer` header.
→ Your APIs validate signature, expiry, audience.
→ **Do not** send to the browser client for displaying user info.

### ID Token — "Who is this user?"
```json
{
  "sub": "user-uuid",
  "name": "Ishan Sharma",
  "email": "ishan@example.com",
  "email_verified": true,
  "picture": "https://...",
  "iss": "https://keycloak.example.com/realms/my-realm",
  "aud": "my-frontend-client",   ← audience is the CLIENT, not the API
  "nonce": "random-nonce",       ← replay protection
  "at_hash": "hash-of-access-token"  ← binds ID token to access token
}
```
→ Used by your **app** to know who just logged in.
→ **Never** send to your API servers as authentication.
→ Validate `nonce`, `iss`, `aud`, `exp` when you receive it.

### Refresh Token — "Keep me logged in"
→ Used to get new Access Tokens when they expire.
→ Sent only to the token endpoint — **never** to your APIs.
→ Store securely (HttpOnly cookie or secure mobile keychain).

---

## Token Validation Rules

### Access Token validation (your API):
```
1. Fetch public key from JWKS endpoint (cache it)
2. Verify RS256 signature
3. Check exp — not expired
4. Check iss — matches your Keycloak realm
5. Check aud — contains your service name  ← often skipped, don't skip it
6. Extract roles from realm_access / resource_access
```

### ID Token validation (your app/BFF):
```
1. Verify RS256 signature
2. Check exp
3. Check iss
4. Check aud — must equal your client_id (not the API)
5. Check nonce — matches what you sent in the auth request
6. Check at_hash — matches hash of the access token
```

---

## OIDC Flows

OIDC defines flows built on OAuth 2.0 grant types:

### Authorization Code Flow (most common, most secure)
```
App → Keycloak: GET /auth?response_type=code&scope=openid...
User logs in
Keycloak → App: redirect with code
App → Keycloak: POST /token (code + client_secret)
Keycloak → App: { access_token, id_token, refresh_token }
```
Use for: web apps with a backend, mobile apps (with PKCE).

### Implicit Flow (deprecated — do not use)
```
Keycloak returns tokens directly in URL fragment
→ Tokens exposed in browser history, referrer headers, logs
→ Replaced by Authorization Code + PKCE for SPAs
```

### Hybrid Flow (rarely needed)
```
response_type=code id_token
→ Gets code AND id_token in one redirect
→ Used in specific SSO scenarios, not typical for REST APIs
```

---

## OIDC Discovery Endpoint

Every OIDC provider exposes a standard metadata document:

```
GET https://keycloak.example.com/realms/my-realm/.well-known/openid-configuration

{
  "issuer": "https://keycloak.example.com/realms/my-realm",
  "authorization_endpoint": "https://.../auth",
  "token_endpoint": "https://.../token",
  "userinfo_endpoint": "https://.../userinfo",
  "jwks_uri": "https://.../certs",
  "end_session_endpoint": "https://.../logout",
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token"],
  "scopes_supported": ["openid", "profile", "email", "roles"],
  "response_types_supported": ["code", "token", "id_token"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

Spring Boot reads this automatically via `issuer-uri`:
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://keycloak.example.com/realms/my-realm
          # Spring fetches /.well-known/openid-configuration at startup
          # Discovers jwks_uri automatically from it
```

---

## Standard OIDC Scopes and Claims

| Scope | Claims it adds to ID Token |
|---|---|
| `openid` | `sub` (required — minimum OIDC scope) |
| `profile` | `name`, `given_name`, `family_name`, `preferred_username`, `picture`, `updated_at` |
| `email` | `email`, `email_verified` |
| `address` | `address` (structured object) |
| `phone` | `phone_number`, `phone_number_verified` |
| `offline_access` | Enables refresh token (for offline/long-running access) |

In Keycloak you also get:
| `roles` | `realm_access.roles`, `resource_access.<client>.roles` |

---

## Real-World Mental Model

```
Your App (Client)
    │
    │ 1. "I want to log in user + read their orders"
    │    scope=openid profile email orders:read
    ▼
Keycloak (Authorization Server + Identity Provider)
    │
    │ 2. User authenticates, consents
    │
    │ 3. Issues:
    │    Access Token  → "Can read orders for 5 min"
    │    ID Token      → "This is Alice, alice@example.com"
    │    Refresh Token → "Can get new tokens for 30 min"
    ▼
Your App
    │
    ├── Reads ID Token → shows "Hello, Alice" in navbar
    │
    ├── Sends Access Token to API → GET /orders
    │
    └── When Access Token expires → uses Refresh Token → new Access Token

Your API (Resource Server)
    │
    └── Validates Access Token signature + claims → serves orders
```

---

## Common Interview Questions

**Q: What is the difference between OAuth 2.0 and OIDC?**
A: OAuth 2.0 is an authorization framework — it lets apps access resources on behalf of users without seeing their password. It says nothing about who the user is. OIDC is an identity layer on top of OAuth 2.0 — it adds the ID Token (a JWT with user claims like name, email, sub) and standardizes the login flow. You need OIDC when you want to know *who* the user is, not just *what* they're allowed to do.

**Q: Which token do you send to your API and which do you keep in your app?**
A: Access Token → sent to APIs in `Authorization: Bearer` header. ID Token → consumed by your app to know who the user is — never sent to APIs. Refresh Token → sent only to the token endpoint to get new access tokens — never to your APIs.

**Q: What does the `openid` scope do?**
A: It signals to the Authorization Server that you want OIDC — i.e., you want identity information, not just API access. Without `openid`, you get an Access Token only. With `openid`, you also get an ID Token containing user identity claims.

**Q: Can you use an ID Token to call an API?**
A: No. ID Tokens have `aud` set to the client ID (the app that requested the login). APIs should reject tokens where `aud` doesn't match their service name. The Access Token is what APIs should accept — it has the right audience and the roles/scopes for authorization.

**Q: How does an API validate a JWT without calling Keycloak on every request?**
A: It fetches Keycloak's public keys from the JWKS endpoint (`/certs`) and caches them. JWT signatures are verified locally using these public keys — no network call needed for each request. Keys are only re-fetched when a token with an unknown `kid` is encountered (key rotation).

**Q: What is the `sub` claim and why is it important?**
A: `sub` (subject) is the user's permanent unique identifier — a UUID assigned by Keycloak that never changes even if the user changes their email or username. Always store and reference users by `sub` in your database, not by email or username.

---

## Quick Check
1. OAuth 2.0 answers "what can this app do" — what question does OIDC answer?
2. What scope triggers OIDC and causes an ID Token to be issued?
3. Name three claims found in an ID Token that are NOT typically in an OAuth 2.0 Access Token.
4. Why should you never send an ID Token to your API server for authentication?
5. What is the OIDC Discovery endpoint and what does Spring Boot use it for?
6. If a user changes their email, which claim should you use to look them up in your database — `email` or `sub`? Why?
