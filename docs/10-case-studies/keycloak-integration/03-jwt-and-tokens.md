# JWT and Tokens

## Three Tokens Keycloak Issues

| Token | Format | Purpose | Sent to |
|---|---|---|---|
| **Access Token** | JWT | Prove identity to APIs | Your backend APIs |
| **ID Token** | JWT | User profile info for the client app | Your frontend/app only |
| **Refresh Token** | Opaque or JWT | Get new access tokens | Keycloak token endpoint |

> Rule: **Access Token → APIs. ID Token → your app UI. Refresh Token → never expose to APIs.**

---

## Anatomy of a Keycloak Access Token (JWT)

```json
// Header
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "abc123"       ← Key ID — matches a key in Keycloak's JWKS endpoint
}

// Payload
{
  "exp": 1716000300,          ← Expiry (Unix timestamp)
  "iat": 1716000000,          ← Issued at
  "jti": "unique-token-id",   ← JWT ID (for revocation tracking)
  "iss": "https://keycloak.example.com/realms/my-realm",  ← Issuer
  "aud": ["my-api", "account"],  ← Audience — which services should accept this
  "sub": "user-uuid-here",    ← Subject — user's unique ID in Keycloak
  "typ": "Bearer",
  "azp": "my-frontend-client",  ← Authorized party (the client that requested the token)
  "session_state": "session-uuid",
  "scope": "openid profile email",
  "sid": "session-id",

  // Standard claims
  "name": "Ishan Sharma",
  "given_name": "Ishan",
  "family_name": "Sharma",
  "preferred_username": "ishan",
  "email": "ishan@example.com",
  "email_verified": true,

  // Realm roles
  "realm_access": {
    "roles": ["admin", "user", "offline_access"]
  },

  // Client roles
  "resource_access": {
    "billing-service": {
      "roles": ["billing:read", "billing:write"]
    },
    "account": {
      "roles": ["manage-account"]
    }
  }
}
```

---

## JWT Validation — What Your API Must Check

```java
// Spring Security does all of this automatically when configured as resource server
// But know what it checks:

// 1. Signature — verified against Keycloak's public key from JWKS
// 2. exp — token is not expired
// 3. iss — issuer matches your Keycloak realm URL
// 4. aud — audience includes your service (optional but recommended)
// 5. nbf — not before (if present)
```

**JWKS endpoint** (public keys for signature verification):
```
GET https://keycloak.example.com/realms/my-realm/protocol/openid-connect/certs
```

Spring Boot fetches and caches this automatically. Keys are rotated by Keycloak periodically — Spring fetches new keys when it encounters an unknown `kid`.

---

## Token Introspection vs Local JWT Validation

| | Local JWT Validation | Token Introspection |
|---|---|---|
| How | Verify signature + claims locally | Call Keycloak's `/introspect` endpoint |
| Speed | Fast — no network call | Slow — network round trip |
| Revocation | Cannot detect revoked tokens | Can detect revoked tokens |
| Use when | Most API calls | High-security ops (banking, admin actions) |

```java
// Token introspection — when you must verify a token is still active
POST https://keycloak.example.com/realms/my-realm/protocol/openid-connect/token/introspect
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token=<access_token>

// Response:
{
  "active": true,       ← false if expired, revoked, or invalid
  "sub": "user-uuid",
  "exp": 1716000300,
  ...
}
```

> Use introspection sparingly — it adds latency and can overload Keycloak. Reserve it for logout confirmation, admin operations, or when you can't afford to serve a revoked token.

---

## Extracting Roles in Java

```java
// From Spring Security Authentication object
@GetMapping("/dashboard")
public String dashboard(Authentication authentication) {
    // Get all granted authorities (includes realm + client roles)
    authentication.getAuthorities().forEach(a -> System.out.println(a.getAuthority()));
    return "dashboard";
}

// Check a specific role
@PreAuthorize("hasRole('admin')")          // realm role
@PreAuthorize("hasRole('billing:read')")   // client role (after custom converter)
public String adminOnly() { ... }

// Manually from JWT
@GetMapping("/info")
public Map<String, Object> info(@AuthenticationPrincipal Jwt jwt) {
    String userId = jwt.getSubject();
    String email  = jwt.getClaimAsString("email");

    // Realm roles
    Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
    List<String> realmRoles = (List<String>) realmAccess.get("roles");

    // Client roles
    Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
    Map<String, Object> billingAccess  = (Map<String, Object>) resourceAccess.get("billing-service");
    List<String> billingRoles = (List<String>) billingAccess.get("roles");

    return Map.of("userId", userId, "realmRoles", realmRoles, "billingRoles", billingRoles);
}
```

---

## Adding Custom Claims (Protocol Mappers)

You can add custom attributes to the JWT via Keycloak Protocol Mappers:

**In Keycloak Admin Console:**
- Client → Client Scopes → (select scope) → Mappers → Add Mapper
- Type: `User Attribute` — maps a user attribute to a JWT claim

```json
// Result in JWT after adding a "tenantId" mapper:
{
  "sub": "user-uuid",
  "tenantId": "tenant-abc-123",   ← custom claim from user attribute
  "department": "engineering"
}
```

```java
// Read in Spring Boot:
String tenantId = jwt.getClaimAsString("tenantId");
```

---

## Quick Check
1. What is the difference between an Access Token and an ID Token? Which one do you send to your API?
2. What does the `aud` (audience) claim do and why should you validate it?
3. When would you use token introspection instead of local JWT validation?
4. How do you add a custom field (e.g., `tenantId`) to the JWT?
5. What is the `kid` field in the JWT header and how does Keycloak use it?
