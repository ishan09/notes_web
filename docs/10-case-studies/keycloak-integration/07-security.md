# Security

## Token Security

### Never expose tokens in URLs
```
# WRONG — token visible in browser history, server logs, referrer headers
GET /api/data?token=eyJhbGci...

# CORRECT — token in Authorization header
GET /api/data
Authorization: Bearer eyJhbGci...
```

### Validate the `audience` claim
By default, Keycloak access tokens have a broad audience. Configure Spring to reject tokens not meant for your service:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://keycloak.example.com/realms/my-realm
```

```java
// Add audience validation
@Bean
JwtDecoder jwtDecoder(OAuth2ResourceServerProperties properties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder
        .withJwkSetUri(properties.getJwt().getJwkSetUri())
        .build();

    OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(
        "https://keycloak.example.com/realms/my-realm"
    );
    OAuth2TokenValidator<Jwt> withAudience = new JwtClaimValidator<List<String>>(
        "aud", aud -> aud != null && aud.contains("my-api")
    );
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience));
    return decoder;
}
```

> Without audience validation, a valid token for `app-a` could be replayed against `app-b` — a token substitution attack.

---

## PKCE is Mandatory for Public Clients

SPAs and mobile apps must use PKCE. Without it, a stolen authorization code can be exchanged for tokens by an attacker.

```java
// Spring Security handles PKCE automatically when:
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-authentication-method: none   # public client
            authorization-grant-type: authorization_code
            # Spring auto-generates code_verifier and code_challenge
```

In Keycloak Admin: Client → Advanced → Proof Key for Code Exchange Code Challenge Method → `S256`.

---

## HTTPS Everywhere

Keycloak in production **must** run behind HTTPS:
- JWTs transmitted over HTTP are trivially intercepted
- Keycloak's own token endpoint will reject plain HTTP redirects in production mode

```yaml
# Keycloak production config
KC_HOSTNAME: keycloak.example.com
KC_HTTPS_CERTIFICATE_FILE: /opt/keycloak/certs/tls.crt
KC_HTTPS_CERTIFICATE_KEY_FILE: /opt/keycloak/certs/tls.key
KC_HTTP_ENABLED: false   # disable plain HTTP in production
```

---

## Client Secret Rotation

Client secrets must be rotated periodically or after a suspected leak:

1. Keycloak Admin → Clients → `my-app` → Credentials → Regenerate Secret
2. Update the secret in your app's environment variables / secrets manager
3. Deploy the new config — there's a brief window where old and new secrets coexist (zero-downtime rotation)

**Best practice**: Store secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) — never hardcode in `application.yml`.

```yaml
# WRONG
keycloak:
  client-secret: my-super-secret-value

# CORRECT — reference environment variable
keycloak:
  client-secret: ${KEYCLOAK_CLIENT_SECRET}
```

---

## Brute Force Protection

Enable in Keycloak Admin → Realm Settings → Security Defenses → Brute Force Detection:

| Setting | Recommended value |
|---|---|
| Max Login Failures | 5 |
| Wait After Failures | 60 seconds |
| Max Wait | 900 seconds |
| Failure Reset Time | 12 hours |

After exceeding failures: account is temporarily locked. Admin can unlock via Admin Console or Admin API.

---

## CORS Configuration

For SPAs calling your API directly:

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        ...
    return http.build();
}

@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://myapp.example.com"));  // no wildcard in production
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

Also configure CORS in Keycloak Admin → Clients → `my-app` → Web Origins: `https://myapp.example.com`.

---

## Refresh Token Security

```
# Keycloak Admin → Realm Settings → Sessions

Refresh Token Max Reuse: 0       ← token is single-use (rotate on every use)
SSO Session Idle: 30 minutes     ← logout if idle this long
SSO Session Max: 8 hours         ← absolute session limit
```

**Refresh token rotation** (default `0` means rotate): each use of a refresh token issues a new refresh token and invalidates the old one. If an attacker uses a stolen refresh token, the original holder's next use will fail — alerting you to the theft.

---

## Security Headers

Add security headers to your Spring Boot responses:

```java
http.headers(headers -> headers
    .frameOptions(frame -> frame.deny())
    .contentSecurityPolicy(csp ->
        csp.policyDirectives("default-src 'self'; frame-ancestors 'none'"))
    .httpStrictTransportSecurity(hsts ->
        hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
);
```

---

## Common Security Misconfigurations

| Misconfiguration | Risk | Fix |
|---|---|---|
| `master` realm used for apps | Admin credentials breach = full access | Create a dedicated realm |
| Client secret in git | Credential leak | Use env vars / secrets manager |
| No audience validation | Token substitution attack | Validate `aud` claim |
| `redirect_uri` set to `*` | Open redirect | Set exact redirect URIs |
| HTTP in production | Token interception | Enforce HTTPS |
| Long-lived access tokens | Stolen token stays valid longer | Keep access tokens ≤ 15 min |
| Direct Grant enabled | Password exposed to app | Disable; use Authorization Code |

---

## Quick Check
1. What is a token substitution attack and how does `aud` claim validation prevent it?
2. Why is `redirect_uri: *` a security risk in OAuth2?
3. What does refresh token rotation protect against?
4. Why should access tokens be short-lived (5–15 min) rather than long-lived (24 hours)?
5. What is the risk of enabling the "Direct Access Grants" (Resource Owner Password) flow?
