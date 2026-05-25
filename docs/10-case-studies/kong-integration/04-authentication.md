# Kong Authentication — JWT, Key-Auth, OAuth2, OIDC

## Authentication Plugin Overview

Kong supports multiple authentication mechanisms. They all work the same way:
1. Plugin reads credentials from the request (header, query param, body)
2. Plugin validates the credentials
3. If valid → Kong identifies the Consumer, attaches identity to the request context, proxies request
4. If invalid → Kong returns 401 Unauthorized — **upstream never receives the request**

| Plugin | Credential type | When to use |
|---|---|---|
| `jwt` | JWT signed with Consumer's secret | Stateless auth for known consumers |
| `key-auth` | Opaque API key | Simple API key for programmatic clients |
| `oauth2` | OAuth2 token + authorization server | User-facing OAuth2 flows |
| `openid-connect` | OIDC token (Keycloak, Auth0, etc.) | Delegate auth to external IdP |
| `basic-auth` | Username:password (Base64) | Internal tools, legacy systems |
| `hmac-auth` | HMAC signature | High-security API access |
| `ldap-auth` | LDAP credentials | Enterprise with Active Directory |

---

## JWT Plugin

The `jwt` plugin validates JWT tokens signed with a secret stored in Kong (per Consumer). It does **not** replace an external OIDC provider — it's Kong's own JWT management.

### Setup Flow:

```
1. Create a Consumer
2. Add a JWT credential (secret or RSA key pair) to the Consumer
3. Enable the jwt plugin on a Route or Service
4. Client sends: Authorization: Bearer <jwt-signed-with-consumer-secret>
5. Kong validates signature → identifies Consumer → proxies request
```

```bash
# 1. Create Consumer
curl -X POST http://localhost:8001/consumers \
  --data username=mobile-app

# 2. Add JWT credential (HS256 — symmetric)
curl -X POST http://localhost:8001/consumers/mobile-app/jwt \
  --data algorithm=HS256 \
  --data secret=my-jwt-signing-secret

# Response includes: { "key": "issuer-uuid", "secret": "my-jwt-signing-secret" }
# The "key" value becomes the JWT "iss" (issuer) claim

# 3. Enable JWT plugin on Route
curl -X POST http://localhost:8001/routes/orders-route/plugins \
  --data name=jwt
```

**Token structure the client must produce:**
```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "iss": "issuer-uuid",   ← must match the "key" from step 2
    "exp": 1716000300
  }
}
```

```yaml
# Declarative config
plugins:
  - name: jwt
    config:
      key_claim_name: iss          # which claim holds the Consumer key
      claims_to_verify: [exp, nbf] # which claims to validate
      maximum_expiration: 3600     # max allowed exp value (seconds from now)
      cookie_names: []             # also look for JWT in cookies
      header_names: [authorization] # header to look in
      uri_param_names: [jwt]        # also accept JWT as query param
```

### RS256 (asymmetric — more secure):
```bash
# Generate key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Add RS256 credential to Consumer
curl -X POST http://localhost:8001/consumers/mobile-app/jwt \
  --data algorithm=RS256 \
  --data rsa_public_key="$(cat public.pem)"

# Client signs JWT with private.pem, Kong verifies with public.pem
```

**Kong's JWT plugin is NOT for Keycloak/Auth0 tokens.** Use `openid-connect` plugin for that.

---

## Key-Auth Plugin

Simplest authentication — client sends an opaque API key in a header or query parameter.

```bash
# Enable plugin on service
curl -X POST http://localhost:8001/services/orders-service/plugins \
  --data name=key-auth \
  --data config.key_names[]=apikey \
  --data config.key_in_header=true \
  --data config.key_in_query=true

# Create Consumer and give them an API key
curl -X POST http://localhost:8001/consumers \
  --data username=partner-app

curl -X POST http://localhost:8001/consumers/partner-app/key-auth \
  --data key=sk-prod-abc123xyz
```

**Client sends:**
```
GET /api/orders
apikey: sk-prod-abc123xyz
# or: GET /api/orders?apikey=sk-prod-abc123xyz
```

```yaml
# Declarative
plugins:
  - name: key-auth
    config:
      key_names: [apikey, x-api-key]   # Kong looks for these header/param names
      key_in_header: true
      key_in_query: true
      key_in_body: false
      hide_credentials: true           # removes key from request before forwarding
```

**`hide_credentials: true`** is critical — without it, the raw API key is forwarded to your backend.

---

## OAuth2 Plugin

Kong as an OAuth2 Authorization Server — issues and validates OAuth2 tokens directly (without an external IdP).

```yaml
plugins:
  - name: oauth2
    config:
      scopes: [read, write, admin]
      mandatory_scope: true
      token_expiration: 7200
      enable_authorization_code: true
      enable_client_credentials: true
      enable_implicit_grant: false      # deprecated, disable
      enable_password_grant: false      # deprecated, disable
      accept_http_if_already_terminated: true
```

**Note**: Kong's built-in OAuth2 plugin is rarely used in modern architectures. Most teams use an external IdP (Keycloak, Auth0, Okta) and validate tokens via `openid-connect` plugin. The built-in plugin requires Kong to act as the authorization server, which adds complexity.

---

## OIDC Plugin — Keycloak Integration

The `openid-connect` plugin (OSS and Enterprise) connects Kong to an external OIDC provider like Keycloak, Auth0, or Okta. Kong validates tokens using the provider's JWKS endpoint.

```yaml
plugins:
  - name: openid-connect
    config:
      issuer: https://keycloak.example.com/realms/my-realm/.well-known/openid-configuration
      client_id: kong-gateway
      client_secret: your-client-secret
      
      # What to do with the token
      auth_methods:
        - bearer                  # accept Bearer tokens from clients
        - session                 # session cookie for browser-based flows
      
      # Token validation
      verify_signature: true
      verify_expiry: true
      verify_nonce: true
      
      # What to pass downstream
      upstream_access_token_header: Authorization   # forwards original token
      upstream_user_info_header: X-User-Info        # user info as header
      
      # Map OIDC claims to Kong Consumer
      consumer_claim: sub         # use 'sub' claim to identify Consumer
      consumer_by: [username]     # match Consumer by username field
      
      # Scopes required
      scopes: [openid, profile, email]
      scopes_required: [openid]
```

**Flow when `bearer` method is used:**

```
Client → Kong: GET /api/orders
         Authorization: Bearer <keycloak-jwt>
         
Kong → Keycloak JWKS endpoint: verify signature (cached)
       Extract claims: sub, email, roles
       
Kong: Map sub → Consumer (or create anonymous consumer)
      Forward request with X-User-Id, X-User-Email headers

Kong → Backend: GET /api/orders
                X-User-Id: user-uuid-123
                X-User-Email: alice@example.com
                Authorization: Bearer <original-token>
```

**Flow for browser-based login (authorization_code method):**
```
Browser → Kong: GET /api/dashboard (no token)
Kong → Browser: redirect to Keycloak login page
Browser → Keycloak: user logs in
Keycloak → Kong: callback with auth code
Kong → Keycloak: exchange code for tokens
Kong → Browser: set session cookie + redirect to /api/dashboard
Browser → Kong: GET /api/dashboard (with session cookie)
Kong validates session → forwards to backend
```

---

## Combining Auth with Rate Limiting

```yaml
# Different rate limits for different consumer tiers
consumers:
  - username: free-tier
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          
  - username: pro-tier
    plugins:
      - name: rate-limiting
        config:
          minute: 6000
          
  - username: internal-service
    plugins:
      - name: rate-limiting
        config:
          minute: 100000
```

```yaml
# Route-level auth + rate limiting
routes:
  - name: public-orders-route
    paths: [/api/orders]
    plugins:
      - name: key-auth
        config:
          hide_credentials: true
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
          redis_host: redis
```

---

## Extracting Claims and Forwarding to Backend

After authentication, enrich the request with user identity before forwarding:

```yaml
# With openid-connect plugin — forward claims as headers
plugins:
  - name: openid-connect
    config:
      issuer: https://keycloak.example.com/realms/my-realm/.well-known/openid-configuration
      upstream_headers_claims:
        - claim: sub
          header: X-User-Id
        - claim: email
          header: X-User-Email
        - claim: realm_access.roles
          header: X-User-Roles

# With request-transformer — forward Consumer identity after jwt/key-auth
  - name: request-transformer
    config:
      add:
        headers:
          - X-Consumer-Username:$(consumer.username)
          - X-Consumer-Id:$(consumer.id)
```

**Backend services trust `X-User-*` headers** — they don't validate JWT themselves. This is the API Gateway pattern: authenticate once at the edge, propagate identity downstream.

---

## Anonymous Access (Partial Authentication)

Allow unauthenticated requests through but identify authenticated ones:

```yaml
plugins:
  - name: key-auth
    config:
      anonymous: anonymous-consumer   # fallback consumer for unauth requests
      
# Create the anonymous consumer
consumers:
  - username: anonymous-consumer
    plugins:
      - name: rate-limiting
        config:
          minute: 10    # very restrictive for anonymous
```

---

## Interview Questions

**Q: What is the difference between Kong's JWT plugin and the openid-connect plugin?**
A: The `jwt` plugin validates tokens signed with a secret stored in Kong itself — Kong is the issuer. The `openid-connect` plugin validates tokens issued by an external IdP (Keycloak, Auth0) by fetching the IdP's JWKS endpoint and verifying the signature. For Keycloak integration, always use `openid-connect`, not `jwt`.

**Q: Why should you set `hide_credentials: true` in the key-auth plugin?**
A: Without it, the raw API key is forwarded to your backend service in the request. Your backend has no business seeing the API key — Kong authenticated it already. Forwarding it exposes the credential to your backend logs, error messages, and any downstream services.

**Q: How does Kong identify which Consumer an incoming JWT belongs to?**
A: In the `jwt` plugin, the `iss` claim in the JWT must match the `key` field of a Consumer's JWT credential — Kong looks up the Consumer by that key. In the `openid-connect` plugin, you configure `consumer_claim: sub` — Kong maps the `sub` claim to a Consumer's username (or creates an anonymous consumer if not found).

---

## Quick Check
1. When would you use the `jwt` plugin vs the `openid-connect` plugin?
2. What happens when a request has no credentials and there is no `anonymous` consumer configured?
3. Why is forwarding claims as headers (X-User-Id, etc.) preferable to each service validating the JWT?
4. What is the risk of enabling `key_in_query=true` for key-auth?
5. In the OIDC `bearer` flow, does Kong call Keycloak on every request to validate the token?
