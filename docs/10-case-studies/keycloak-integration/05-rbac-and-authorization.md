# RBAC and Authorization

## Role-Based Access Control (RBAC) in Keycloak

RBAC answers: **"What is this user allowed to do?"**

```
User → has Roles → Roles → define access to Resources
```

Keycloak supports three layers of authorization:

| Layer | Mechanism | Granularity |
|---|---|---|
| Realm Roles | Global roles in the realm | Coarse (admin, user) |
| Client Roles | Roles scoped to a client | Medium (billing:read) |
| Fine-Grained Authorization | Keycloak Authorization Services | Fine (resource-level) |

---

## Realm Roles vs Client Roles — When to Use Each

```
Realm Roles:
  ✅ "admin" — can manage the entire system
  ✅ "support" — can view all user accounts
  ✅ "premium-user" — has premium features globally

Client Roles:
  ✅ "orders-service:orders:read"     — scoped to orders service
  ✅ "billing-service:billing:write"  — scoped to billing service
  ✅ "inventory-service:stock:manage" — scoped to inventory service
```

> Prefer **client roles** in microservices — each service owns its permission vocabulary. A compromised token for one client doesn't automatically grant permissions on another.

---

## Groups — Assigning Roles at Scale

Instead of assigning roles to each user individually, assign roles to groups and add users to groups.

```
Group: "engineering-team"
  → Realm Role: "user"
  → Client Role: "orders-service:orders:read"
  → Client Role: "inventory-service:stock:read"

User: ishan@example.com
  → Member of: "engineering-team"
  → Inherits all group roles automatically
```

**Hierarchical groups** — subgroups inherit parent group roles:
```
"company"
  └── "engineering"
        └── "backend-team"   ← inherits engineering + company roles
```

---

## Fine-Grained Authorization (Keycloak Authorization Services)

For resource-level permissions (e.g., "user can only edit their own profile"):

**Concepts:**
- **Resource**: what you're protecting (`/orders/{id}`, `document:123`)
- **Scope**: what action (`read`, `write`, `delete`)
- **Policy**: who can do it (role-based, user-based, time-based, JavaScript)
- **Permission**: resource + scope + policy combined

```
Permission: "order:read"
  Resource:  /orders/{id}
  Scope:     read
  Policy:    "User is the owner OR has role 'admin'"
```

> In most Java backend interviews, RBAC via realm/client roles is sufficient. Authorization Services is more relevant for complex enterprise scenarios.

---

## Composite Roles

A composite role is a role that contains other roles — when assigned, the user gets all contained roles.

```
Composite Role: "super-admin"
  Contains: "admin", "billing:write", "support", "reports:read"
```

Useful for bundles of permissions but makes debugging harder — avoid deep nesting.

---

## Implementing RBAC in Spring Boot (Complete Example)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()

                // Role-based at URL level
                .requestMatchers("/api/admin/**").hasRole("admin")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("admin")

                // Everything else needs authentication
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}

// Controller-level RBAC
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping
    @PreAuthorize("hasAnyRole('user', 'admin')")
    public List<Order> list() { ... }

    @PostMapping
    @PreAuthorize("hasRole('user')")
    public Order create(@RequestBody OrderRequest req) { ... }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public void delete(@PathVariable Long id) { ... }

    // Check ownership — user can only see their own order
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('admin') or @orderService.isOwner(#id, authentication.name)")
    public Order getById(@PathVariable Long id) { ... }
}

// Service used in SpEL expression above
@Service("orderService")
public class OrderService {
    public boolean isOwner(Long orderId, String userId) {
        return orderRepository.findById(orderId)
            .map(order -> order.getUserId().equals(userId))
            .orElse(false);
    }
}
```

---

## Tenant-Scoped RBAC (Multi-Tenant)

For multi-tenant systems, add `tenantId` as a custom claim and enforce it:

```java
// Custom security expression
@Service("tenantSecurity")
public class TenantSecurityService {

    public boolean isSameTenant(String resourceTenantId, Jwt jwt) {
        String userTenantId = jwt.getClaimAsString("tenantId");
        return resourceTenantId.equals(userTenantId);
    }
}

// Usage in controller
@GetMapping("/tenants/{tenantId}/data")
@PreAuthorize("hasRole('admin') or @tenantSecurity.isSameTenant(#tenantId, #jwt)")
public List<Data> getTenantData(@PathVariable String tenantId,
                                @AuthenticationPrincipal Jwt jwt) { ... }
```

---

## Quick Check
1. What is the difference between a realm role and a client role? Give an example of each.
2. Why are groups useful for role management at scale?
3. What is a composite role and what is the risk of deep role nesting?
4. How would you restrict a user to only access their own resources (not other users' data)?
5. In microservices, which service should own the authorization decision — API Gateway or individual service?
