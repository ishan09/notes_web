# Authentication Flows

## OAuth 2.0 Grant Types Supported by Keycloak

| Grant Type | Use case | Who initiates |
|---|---|---|
| Authorization Code + PKCE | Web apps, SPAs, mobile | User (browser) |
| Client Credentials | Machine-to-machine (M2M) | Service (no user) |
| Device Authorization | TV, CLI, IoT | User (limited-input device) |
| Resource Owner Password | Legacy — avoid | User (credentials directly) |

---

## 1. Authorization Code Flow (Most Common)

Used by: web apps, SPAs, mobile apps with a backend.

```
Browser                    Your App (Backend)         Keycloak
  |                              |                        |
  |--- GET /protected ---------> |                        |
  |<-- 302 Redirect to KC -----  |                        |
  |                              |                        |
  |--- GET /auth?client_id=... -----------------------> |
  |<-- Login Page ----------------------------------------|
  |--- POST credentials ---------------------------------> |
  |<-- 302 redirect_uri?code=AUTH_CODE -------------------|
  |                              |                        |
  |--- GET /callback?code=... -> |                        |
  |                    POST /token (code + client_secret) -> |
  |                    <-- { access_token, id_token, refresh_token } |
  |<-- Set session / cookie ---- |                        |
```

**Key parameters in the redirect:**
```
GET https://keycloak.example.com/realms/my-realm/protocol/openid-connect/auth
  ?client_id=my-app
  &redirect_uri=https://myapp.com/callback
  &response_type=code
  &scope=openid profile email
  &state=random-csrf-token        ← prevent CSRF
  &nonce=random-nonce             ← prevent replay
```

**Token exchange (backend):**
```java
// Spring handles this automatically via oauth2Login()
// Manual exchange:
POST https://keycloak.example.com/realms/my-realm/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE_FROM_KEYCLOAK
&redirect_uri=https://myapp.com/callback
&client_id=my-app
&client_secret=my-secret
```

---

## 2. Authorization Code + PKCE (for Public Clients)

SPAs and mobile apps can't safely store a `client_secret`. PKCE (Proof Key for Code Exchange) replaces it.

```
1. App generates: code_verifier (random string, 43-128 chars)
2. App computes: code_challenge = BASE64URL(SHA256(code_verifier))
3. Sends code_challenge in auth request (instead of client_secret)
4. Keycloak stores code_challenge
5. App sends code + code_verifier during token exchange
6. Keycloak verifies: SHA256(code_verifier) == stored code_challenge
```

```java
// Spring Security handles PKCE automatically for public clients
// Just set: client-authentication-method: none
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-authentication-method: none  # public client — no secret
            authorization-grant-type: authorization_code
```

> Without PKCE, a stolen authorization code can be exchanged for tokens by anyone.

---

## 3. Client Credentials Flow (Machine-to-Machine)

Used when **no user is involved** — service calling another service.

```
Service A                          Keycloak
    |                                  |
    |-- POST /token -----------------> |
    |   grant_type=client_credentials  |
    |   client_id=service-a            |
    |   client_secret=secret           |
    |<-- { access_token } -------------|
    |                                  |
    |-- GET /api/data (Bearer token) -> Service B
    |<-- 200 OK ----------------------- Service B
```

```java
// Java — get token programmatically
public String getServiceToken() {
    RestTemplate rest = new RestTemplate();
    MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
    params.add("grant_type", "client_credentials");
    params.add("client_id", "service-a");
    params.add("client_secret", clientSecret);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    ResponseEntity<Map> response = rest.postForEntity(
        keycloakTokenUrl, new HttpEntity<>(params, headers), Map.class
    );
    return (String) response.getBody().get("access_token");
}
```

> No refresh token in Client Credentials — tokens are short-lived; just request a new one when expired.

---

## 4. Token Refresh Flow

```
App                         Keycloak
 |-- POST /token -----------> |
 |   grant_type=refresh_token |
 |   refresh_token=...        |
 |   client_id=...            |
 |<-- { new access_token,     |
 |       new refresh_token }  |  ← Keycloak rotates refresh token by default
```

**Token lifespans (recommended production values):**

| Token | Default | Recommended |
|---|---|---|
| Access Token | 5 min | 5–15 min |
| Refresh Token | 30 min | 30–60 min |
| SSO Session Max | 10 hours | 8–24 hours |

---

## 5. Logout

Two types of logout:

**Local logout** — clear session in your app only (Keycloak session still active):
```java
request.logout(); // Spring Security — clears local session
```

**SSO logout** — log out of Keycloak (kills all app sessions sharing that SSO session):
```
GET https://keycloak.example.com/realms/my-realm/protocol/openid-connect/logout
  ?redirect_uri=https://myapp.com/loggedout
  &id_token_hint=<id_token>       ← Keycloak uses this to identify the session
```

> Always use SSO logout for security-sensitive apps. Local logout only looks like logout but the Keycloak session is still valid — another tab could re-authenticate without credentials.

---

## Quick Check
1. Why does PKCE exist and which client types need it?
2. In Client Credentials flow, why is there no refresh token?
3. What is the difference between local logout and SSO logout?
4. What is the `state` parameter in the Authorization Code flow and why is it required?
