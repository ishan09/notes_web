# Testing

## Testing Strategy

| Layer | What to test | Tool |
|---|---|---|
| Unit | Role extraction logic, custom converters | JUnit, Mockito |
| Integration (mocked JWT) | Controller authorization rules | Spring MockMvc + JWT |
| Integration (real Keycloak) | Full auth flow, token exchange | Testcontainers + Keycloak |
| E2E | Complete login flow | Playwright / Selenium |

---

## 1. Unit Testing — Custom Role Converter

```java
@ExtendWith(MockitoExtension.class)
class KeycloakJwtRoleConverterTest {

    private KeycloakJwtRoleConverter converter = new KeycloakJwtRoleConverter("my-api");

    @Test
    void extractsRealmRoles() {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("realm_access", Map.of("roles", List.of("admin", "user")))
            .claim("resource_access", Map.of())
            .build();

        Collection<GrantedAuthority> authorities = converter.convert(jwt);

        assertThat(authorities).containsExactlyInAnyOrder(
            new SimpleGrantedAuthority("ROLE_admin"),
            new SimpleGrantedAuthority("ROLE_user")
        );
    }

    @Test
    void extractsClientRoles() {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("realm_access", Map.of("roles", List.of()))
            .claim("resource_access", Map.of(
                "my-api", Map.of("roles", List.of("orders:read", "orders:write"))
            ))
            .build();

        Collection<GrantedAuthority> authorities = converter.convert(jwt);

        assertThat(authorities).contains(
            new SimpleGrantedAuthority("ROLE_orders:read"),
            new SimpleGrantedAuthority("ROLE_orders:write")
        );
    }
}
```

---

## 2. Integration Testing — Controller with Mocked JWT

Test authorization rules without a running Keycloak. Spring Security's `@WithMockUser` doesn't work for JWT — use `jwt()` SecurityMockMvcRequestPostProcessors.

```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminCanDeleteOrder() throws Exception {
        mockMvc.perform(delete("/api/orders/1")
            .with(jwt().jwt(jwt -> jwt
                .subject("user-uuid-123")
                .claim("realm_access", Map.of("roles", List.of("admin")))
            )))
            .andExpect(status().isOk());
    }

    @Test
    void nonAdminCannotDeleteOrder() throws Exception {
        mockMvc.perform(delete("/api/orders/1")
            .with(jwt().jwt(jwt -> jwt
                .subject("user-uuid-456")
                .claim("realm_access", Map.of("roles", List.of("user")))
            )))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void userCanReadTheirOwnOrder() throws Exception {
        mockMvc.perform(get("/api/orders/1")
            .with(jwt().jwt(jwt -> jwt
                .subject("owner-user-id")
                .claim("realm_access", Map.of("roles", List.of("user")))
            )))
            .andExpect(status().isOk());
    }
}
```

**Setup `spring-security-test` dependency:**
```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 3. Integration Testing with Testcontainers (Real Keycloak)

Test the full auth flow against a real (temporary) Keycloak instance:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>keycloak</artifactId>
    <version>3.3.0</version>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class KeycloakIntegrationTest {

    @Container
    static KeycloakContainer keycloak = new KeycloakContainer("quay.io/keycloak/keycloak:24.0")
        .withRealmImportFile("test-realm.json");  // export from your dev Keycloak

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
            () -> keycloak.getAuthServerUrl() + "/realms/test-realm");
    }

    @Test
    void canAuthenticateAndCallProtectedEndpoint() {
        // Get a real token from the containerized Keycloak
        String token = getTokenFromKeycloak(
            keycloak.getAuthServerUrl(),
            "test-realm",
            "test-client",
            "test-user",
            "test-password"
        );

        given()
            .header("Authorization", "Bearer " + token)
            .when()
            .get("/api/orders")
            .then()
            .statusCode(200);
    }

    private String getTokenFromKeycloak(String serverUrl, String realm,
                                        String clientId, String username, String password) {
        return RestAssured.given()
            .contentType("application/x-www-form-urlencoded")
            .formParam("grant_type", "password")
            .formParam("client_id", clientId)
            .formParam("username", username)
            .formParam("password", password)
            .post(serverUrl + "/realms/" + realm + "/protocol/openid-connect/token")
            .jsonPath()
            .getString("access_token");
    }
}
```

**test-realm.json** — export from Keycloak Admin: Realm Settings → Action → Partial Export (include clients, roles, users for test).

---

## 4. Testing Token Refresh and Expiry

```java
@Test
void expiredTokenIsRejected() throws Exception {
    // Build a JWT that expired 10 minutes ago
    Instant past = Instant.now().minusSeconds(600);

    mockMvc.perform(get("/api/orders")
        .with(jwt().jwt(jwt -> jwt
            .expiresAt(past)
            .issuedAt(past.minusSeconds(300))
            .claim("realm_access", Map.of("roles", List.of("user")))
        )))
        .andExpect(status().isUnauthorized());
}
```

---

## 5. Testing Client Credentials Flow

```java
@SpringBootTest
class ServiceToServiceAuthTest {

    @Autowired
    private InventoryClient inventoryClient; // uses client credentials internally

    @MockBean
    private TokenCacheService tokenCache;

    @Test
    void serviceCallsInventoryWithToken() {
        when(tokenCache.getToken(anyString())).thenReturn("mock-service-token");

        // Mock the downstream HTTP call
        // Verify the Authorization header was set correctly
        // ...
    }
}
```

---

## Quick Reference — What to Test

| Scenario | Expected |
|---|---|
| No Authorization header | 401 Unauthorized |
| Expired token | 401 Unauthorized |
| Valid token, wrong role | 403 Forbidden |
| Valid token, correct role | 200 OK |
| Valid token, accessing other user's resource | 403 Forbidden |
| Admin accessing any resource | 200 OK |
| Token from wrong issuer | 401 Unauthorized |
| Token with wrong audience | 401 Unauthorized |

---

## Quick Check
1. Why doesn't `@WithMockUser` work for JWT-secured endpoints and what do you use instead?
2. What is the benefit of using Testcontainers for Keycloak tests vs. mocking the JWT?
3. How do you simulate an expired token in `MockMvc` tests?
4. What should be in your `test-realm.json` export for integration tests?
5. How do you test that a user can only access their own resources (not other users')?
