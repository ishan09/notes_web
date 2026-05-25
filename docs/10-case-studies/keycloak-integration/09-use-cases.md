# Use Cases

## Use Case 1: Multi-Tenant SaaS Application

**Scenario**: A SaaS platform serves multiple companies. Each company (tenant) has its own users and permissions. Company A users must never see Company B data.

**Approach 1 — One Realm per Tenant** (strong isolation):
```
realm: tenant-a    → users: alice, bob    → clients: tenant-a-app
realm: tenant-b    → users: charlie       → clients: tenant-b-app
```
- Full isolation: users, roles, clients, SSO sessions are separate
- Drawback: Keycloak performance degrades beyond ~100 realms; harder to manage centrally

**Approach 2 — Single Realm, Tenant via Custom Claim** (recommended for most SaaS):
```
realm: saas-platform
users: alice (tenantId=tenant-a), bob (tenantId=tenant-a), charlie (tenantId=tenant-b)
```

```java
// Protocol Mapper adds tenantId to JWT from user attribute
// JWT contains: "tenantId": "tenant-a"

// In your service — enforce tenant isolation
@GetMapping("/orders")
@PreAuthorize("isAuthenticated()")
public List<Order> getOrders(@AuthenticationPrincipal Jwt jwt) {
    String tenantId = jwt.getClaimAsString("tenantId");
    // All DB queries are scoped to tenantId
    return orderRepository.findByTenantId(tenantId);
}
```

**Approach 3 — Keycloak Organizations (v25+)**:
Keycloak's new Organizations feature provides first-class multi-tenancy within a single realm — each organization has its own members, domains, and identity providers.

---

## Use Case 2: Microservices with Service-to-Service Auth

**Scenario**: Order Service calls Inventory Service and Payment Service. Each call must be authenticated.

```
Order Service                 Keycloak                  Inventory Service
     |                            |                            |
     |-- POST /token -----------> |                            |
     |   client_credentials       |                            |
     |<-- access_token ---------- |                            |
     |                            |                            |
     |-- GET /stock?item=X ---------------------------------> |
     |   Authorization: Bearer <token>                        |
     |                            |    (validates JWT locally) |
     |<-- 200 OK -------------------------------------------- |
```

```java
// Order Service — get token for calling Inventory Service
@Service
public class InventoryClient {

    @Value("${keycloak.server-url}/realms/my-realm/protocol/openid-connect/token")
    private String tokenUrl;

    private final TokenCacheService tokenCache; // caches token, refreshes before expiry
    private final RestTemplate restTemplate;

    public StockInfo getStock(String itemId) {
        String token = tokenCache.getToken("inventory-service-client");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(
            "http://inventory-service/api/stock/" + itemId,
            HttpMethod.GET, new HttpEntity<>(headers), StockInfo.class
        ).getBody();
    }
}

// Inventory Service — validate incoming token (resource server)
// Just configure as oauth2 resource server — Spring validates automatically
// Add role check: @PreAuthorize("hasRole('inventory:read')")
```

---

## Use Case 3: B2B SSO (Enterprise Client with Azure AD / Okta)

**Scenario**: An enterprise customer wants to use their own Azure AD accounts to log in to your SaaS platform.

```
Your App → Keycloak → Azure AD (SAML or OIDC)
                    ← Azure authenticates employee
         ← Keycloak maps Azure claims → issues JWT
← Your app receives Keycloak JWT (standard format regardless of upstream IdP)
```

**Setup:**
1. Keycloak Admin → Realm → Identity Providers → OpenID Connect v1.0
2. Configure: Azure's `issuer`, `authorization_url`, `token_url`, `clientId`, `clientSecret`
3. Add attribute mappers: map Azure `email` → Keycloak `email`, `department` → Keycloak user attribute
4. Create a group for this enterprise client → auto-assign on first login

**Result**: Your app code doesn't change at all. You receive the same Keycloak JWT format regardless of whether the user authenticated via password, Google, or Azure AD.

---

## Use Case 4: Mobile App with PKCE

**Scenario**: Android/iOS app needs to authenticate users without storing a client secret.

```
Mobile App                  Keycloak
    |                           |
    | Generate code_verifier     |
    | Compute code_challenge     |
    |                           |
    |-- Open browser/webview --> Keycloak login page
    |                       <-- redirect with auth code
    |-- POST /token -----------> |
    |   code + code_verifier     |
    |<-- access_token + refresh  |
    |                           |
    |   Store tokens securely    |
    |   (Keystore / Keychain)    |
```

```yaml
# Keycloak client config for mobile:
# Client Authentication: OFF (public client)
# Standard Flow: ON
# Valid Redirect URIs: myapp://callback  (custom scheme)
# PKCE: S256 (enforced)
```

```java
// Android — using AppAuth library (handles PKCE automatically)
AuthorizationRequest request = new AuthorizationRequest.Builder(
    serviceConfig,
    "my-mobile-client",
    ResponseTypeValues.CODE,
    Uri.parse("myapp://callback")
).setScopes("openid", "profile", "email")
 .build(); // AppAuth generates code_verifier/challenge automatically
```

---

## Use Case 5: Admin Portal with Role-Based Access

**Scenario**: Internal admin portal with strict role separation — super-admin, support, billing-admin, viewer.

```java
// Role hierarchy:
// super-admin → all permissions
// support     → view users, reset passwords (not billing)
// billing-admin → billing operations
// viewer      → read-only everywhere

@RestController
@RequestMapping("/admin")
public class AdminController {

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('super-admin', 'support', 'viewer')")
    public List<UserDto> listUsers() { ... }

    @PostMapping("/users/{id}/reset-password")
    @PreAuthorize("hasAnyRole('super-admin', 'support')")
    public void resetPassword(@PathVariable String id) { ... }

    @GetMapping("/billing")
    @PreAuthorize("hasAnyRole('super-admin', 'billing-admin')")
    public BillingReport getBilling() { ... }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('super-admin')")
    public void deleteUser(@PathVariable String id) { ... }
}
```

**Audit logging**: Log every admin action with the user's `sub` (UUID from JWT) for accountability.

---

## Use Case 6: API Gateway Authentication

**Scenario**: All API traffic flows through an API Gateway (Spring Cloud Gateway, Kong, AWS API Gateway). Authenticate at the gateway, pass user identity downstream.

```
Client → API Gateway → (validates JWT) → Microservice
                     ↓
              Extracts claims
              Adds headers:
              X-User-Id: <sub>
              X-User-Email: <email>
              X-User-Roles: admin,user
```

```java
// Spring Cloud Gateway — validate JWT and pass claims downstream
@Component
public class AuthGatewayFilter implements GlobalFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Spring Security OAuth2 Resource Server handles JWT validation
        // After validation, add user info as headers for downstream services
        return exchange.getPrincipal()
            .cast(JwtAuthenticationToken.class)
            .flatMap(auth -> {
                Jwt jwt = auth.getToken();
                ServerHttpRequest request = exchange.getRequest().mutate()
                    .header("X-User-Id",    jwt.getSubject())
                    .header("X-User-Email", jwt.getClaimAsString("email"))
                    .header("X-Tenant-Id",  jwt.getClaimAsString("tenantId"))
                    .build();
                return chain.filter(exchange.mutate().request(request).build());
            });
    }
}
```

Downstream microservices trust the gateway headers — no JWT validation needed at each service.

---

## Quick Check
1. For a SaaS with 500 tenants, why is one-realm-per-tenant a bad idea?
2. In the API Gateway pattern, why don't downstream microservices need to validate JWT themselves?
3. For mobile apps, why can't you use a `client_secret` and what do you use instead?
4. In B2B SSO, what changes in your application code when a new enterprise client is onboarded?
5. In a microservices setup, should each service call Keycloak's `/token` endpoint on every request? Why not?
