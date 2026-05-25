# Spring Boot Integration

## Dependencies (Spring Boot 3.x)

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
<!-- For frontend/BFF apps that also log in users: -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

> The old `keycloak-spring-boot-adapter` is **deprecated**. Use the standard Spring Security OAuth2 libraries.

---

## application.yml — Resource Server (API)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # Keycloak's public key endpoint — Spring fetches and caches keys automatically
          jwk-set-uri: http://localhost:8080/realms/my-realm/protocol/openid-connect/certs
          # Optional: validate the issuer claim
          issuer-uri: http://localhost:8080/realms/my-realm
```

That's all you need for basic JWT validation. Spring Security will:
1. Extract the `Authorization: Bearer <token>` header
2. Fetch public keys from the JWKS URI
3. Verify signature, expiry, and issuer
4. Populate the `SecurityContext` with the authenticated principal

---

## Security Config — Resource Server

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // enables @PreAuthorize
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // stateless API — no CSRF needed
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**", "/actuator/health").permitAll()
                .requestMatchers("/admin/**").hasRole("admin")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
        // By default Spring reads "scope" claim — tell it to read realm_access.roles
        converter.setAuthoritiesClaimName("realm_access.roles");  // won't work for nested — see custom converter below
        converter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(converter);
        return jwtConverter;
    }
}
```

---

## Custom Role Converter (Handles Nested Claims)

Keycloak nests roles under `realm_access.roles` and `resource_access.<client>.roles`. Spring's default converter doesn't handle nesting — you need a custom one.

```java
@Component
public class KeycloakJwtRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final String REALM_ACCESS = "realm_access";
    private static final String RESOURCE_ACCESS = "resource_access";
    private static final String ROLES = "roles";
    private static final String ROLE_PREFIX = "ROLE_";
    private final String clientId; // e.g., "my-api"

    public KeycloakJwtRoleConverter(@Value("${spring.security.oauth2.client.registration.keycloak.client-id}") String clientId) {
        this.clientId = clientId;
    }

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Extract realm roles
        Map<String, Object> realmAccess = jwt.getClaimAsMap(REALM_ACCESS);
        if (realmAccess != null && realmAccess.containsKey(ROLES)) {
            List<String> roles = (List<String>) realmAccess.get(ROLES);
            roles.stream()
                 .map(role -> new SimpleGrantedAuthority(ROLE_PREFIX + role))
                 .forEach(authorities::add);
        }

        // Extract client roles
        Map<String, Object> resourceAccess = jwt.getClaimAsMap(RESOURCE_ACCESS);
        if (resourceAccess != null && resourceAccess.containsKey(clientId)) {
            Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get(clientId);
            List<String> clientRoles = (List<String>) clientAccess.get(ROLES);
            if (clientRoles != null) {
                clientRoles.stream()
                           .map(role -> new SimpleGrantedAuthority(ROLE_PREFIX + role))
                           .forEach(authorities::add);
            }
        }

        return authorities;
    }
}
```

Wire it in:
```java
// In SecurityConfig:
@Autowired
private KeycloakJwtRoleConverter keycloakJwtRoleConverter;

// In jwtAuthConverter():
JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
jwtConverter.setJwtGrantedAuthoritiesConverter(keycloakJwtRoleConverter);
return jwtConverter;
```

---

## Method-Level Security

```java
@RestController
@RequestMapping("/api")
public class OrderController {

    @GetMapping("/orders")
    @PreAuthorize("hasRole('user')")               // any logged-in user with 'user' role
    public List<Order> getOrders() { ... }

    @DeleteMapping("/orders/{id}")
    @PreAuthorize("hasRole('admin')")              // admin only
    public void deleteOrder(@PathVariable Long id) { ... }

    @PostMapping("/orders/{id}/refund")
    @PreAuthorize("hasRole('billing:write')")      // client role
    public void refund(@PathVariable Long id) { ... }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasRole('user') and #userId == authentication.name")  // own resource
    public Order getOrder(@PathVariable Long id, @RequestParam String userId) { ... }
}
```

---

## Reading User Info in Controllers

```java
@GetMapping("/me")
public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
    return Map.of(
        "userId",   jwt.getSubject(),
        "email",    jwt.getClaimAsString("email"),
        "name",     jwt.getClaimAsString("name"),
        "tenantId", jwt.getClaimAsString("tenantId")  // custom claim
    );
}

// Or via Authentication:
@GetMapping("/me")
public String me(Authentication auth) {
    return auth.getName(); // returns the 'sub' claim (user UUID)
}
```

---

## Keycloak Admin Client (Manage Users Programmatically)

```xml
<dependency>
    <groupId>org.keycloak</groupId>
    <artifactId>keycloak-admin-client</artifactId>
    <version>24.0.0</version>
</dependency>
```

```java
@Service
public class KeycloakAdminService {

    private final Keycloak keycloak;

    public KeycloakAdminService(
        @Value("${keycloak.server-url}") String serverUrl,
        @Value("${keycloak.realm}") String realm,
        @Value("${keycloak.admin-client-id}") String clientId,
        @Value("${keycloak.admin-client-secret}") String clientSecret
    ) {
        this.keycloak = KeycloakBuilder.builder()
            .serverUrl(serverUrl)
            .realm(realm)
            .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
            .clientId(clientId)
            .clientSecret(clientSecret)
            .build();
    }

    public void createUser(String email, String firstName, String lastName, String password) {
        UserRepresentation user = new UserRepresentation();
        user.setEnabled(true);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmailVerified(true);

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        credential.setTemporary(false);
        user.setCredentials(List.of(credential));

        RealmResource realmResource = keycloak.realm("my-realm");
        Response response = realmResource.users().create(user);
        // response.getStatus() == 201 → success
    }

    public void assignRole(String userId, String roleName) {
        RealmResource realm = keycloak.realm("my-realm");
        RoleRepresentation role = realm.roles().get(roleName).toRepresentation();
        realm.users().get(userId).roles().realmLevel().add(List.of(role));
    }
}
```

---

## Quick Check
1. Why is the old `keycloak-spring-boot-adapter` deprecated and what replaced it?
2. What does `SessionCreationPolicy.STATELESS` do and why is it set for JWT-based APIs?
3. Why do you need a custom `JwtGrantedAuthoritiesConverter` for Keycloak?
4. What is the difference between `@PreAuthorize("hasRole('admin')")` and `@PreAuthorize("hasAuthority('ROLE_admin')")`?
5. When would you use the Keycloak Admin Client instead of just validating JWTs?
