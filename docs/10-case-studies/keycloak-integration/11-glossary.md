# Glossary

## Keycloak Terms

| Term | Definition |
|---|---|
| **Realm** | Isolated namespace in Keycloak — contains its own users, clients, roles, and sessions |
| **Client** | An application registered in Keycloak that delegates authentication |
| **Client Secret** | Password for a confidential client — used to authenticate the client itself to Keycloak |
| **Realm Role** | A role that applies globally within a realm |
| **Client Role** | A role scoped to a specific client |
| **Composite Role** | A role that contains other roles — assigning it grants all contained roles |
| **Group** | A collection of users that can inherit roles |
| **Protocol Mapper** | A Keycloak component that adds custom claims to tokens |
| **Identity Provider (IdP)** | An external auth source Keycloak brokers to (Google, Azure AD, SAML) |
| **Identity Brokering** | Using an external IdP for authentication while Keycloak remains the token issuer |
| **User Federation** | Connecting Keycloak to an external user store (LDAP, Active Directory) |
| **SPI (Service Provider Interface)** | Extension point for customizing Keycloak behaviour (custom authenticators, providers) |
| **JWKS** | JSON Web Key Set — Keycloak's public keys endpoint, used to verify JWT signatures |
| **Session** | Server-side record of a user's authenticated state in Keycloak |
| **Offline Token** | A special refresh token that remains valid even after Keycloak restarts (for long-running jobs) |
| **Admin Client** | Java SDK (`keycloak-admin-client`) for managing Keycloak programmatically |
| **Organizations** | Keycloak v25+ feature for first-class multi-tenancy within a realm |

---

## OAuth 2.0 Terms

| Term | Definition |
|---|---|
| **Authorization Code** | Short-lived one-time code exchanged for tokens — never store this |
| **Access Token** | Short-lived JWT credential sent to APIs — proves identity |
| **Refresh Token** | Longer-lived credential used to get new access tokens — store securely |
| **ID Token** | JWT containing user profile info — for the client app, not for APIs |
| **Client Credentials** | Grant type for M2M auth — no user, service authenticates directly |
| **PKCE** | Proof Key for Code Exchange — prevents code interception for public clients |
| **Scope** | What permissions the token grants (`openid`, `profile`, `email`, `roles`) |
| **State** | CSRF protection parameter — random value sent in auth request, verified on callback |
| **Nonce** | Replay attack protection — random value embedded in ID token, verified by client |
| **Redirect URI** | Where Keycloak sends the auth code after login — must exactly match registered value |
| **Introspection** | Calling Keycloak to verify if a token is still active (handles revocation) |
| **Token Exchange** | Converting one token for another (user token → service-specific token) |

---

## OpenID Connect Terms

| Term | Definition |
|---|---|
| **OIDC** | OpenID Connect — identity layer on top of OAuth 2.0; adds ID Token and UserInfo endpoint |
| **`sub`** | Subject — user's unique ID in Keycloak (UUID) |
| **`iss`** | Issuer — the Keycloak realm URL that issued the token |
| **`aud`** | Audience — which services should accept this token |
| **`exp`** | Expiry — Unix timestamp when the token expires |
| **`iat`** | Issued At — Unix timestamp when the token was issued |
| **`jti`** | JWT ID — unique identifier for the token (used for revocation tracking) |
| **`azp`** | Authorized Party — the client that requested the token |
| **UserInfo Endpoint** | `/protocol/openid-connect/userinfo` — returns user claims using the access token |
| **Discovery Endpoint** | `/.well-known/openid-configuration` — returns all Keycloak OIDC metadata |

---

## Spring Security Terms

| Term | Definition |
|---|---|
| **Resource Server** | A service that validates JWT tokens and serves protected resources |
| **OAuth2 Client** | A service that initiates the login flow (frontend/BFF) |
| **`JwtAuthenticationConverter`** | Converts a JWT into a Spring `Authentication` object with `GrantedAuthority` list |
| **`JwtDecoder`** | Spring component that validates JWT signature, expiry, and claims |
| **`SecurityContext`** | Thread-local store for the current user's authentication |
| **`@PreAuthorize`** | Method-level security annotation — evaluated before the method runs |
| **`@PostAuthorize`** | Method-level security annotation — evaluated after method runs (can check return value) |
| **`hasRole('x')`** | Checks for `ROLE_x` in authorities |
| **`hasAuthority('x')`** | Checks for exact string `x` in authorities (no prefix added) |
| **`STATELESS`** | Session creation policy — no HTTP session created; each request must carry a token |
| **`SecurityMockMvcRequestPostProcessors.jwt()`** | Test utility to mock a JWT-authenticated request in MockMvc |

---

## Common Keycloak Endpoints

| Endpoint | Purpose |
|---|---|
| `/realms/{realm}/.well-known/openid-configuration` | OIDC Discovery — all metadata |
| `/realms/{realm}/protocol/openid-connect/auth` | Start Authorization Code flow |
| `/realms/{realm}/protocol/openid-connect/token` | Exchange code for tokens; Client Credentials |
| `/realms/{realm}/protocol/openid-connect/certs` | JWKS — public keys for JWT verification |
| `/realms/{realm}/protocol/openid-connect/userinfo` | Get user profile from access token |
| `/realms/{realm}/protocol/openid-connect/logout` | SSO logout |
| `/realms/{realm}/protocol/openid-connect/token/introspect` | Token introspection |
| `/admin/realms/{realm}/users` | Admin API — manage users |
| `/admin/realms/{realm}/roles` | Admin API — manage roles |
| `/metrics` | Prometheus metrics (if enabled) |
