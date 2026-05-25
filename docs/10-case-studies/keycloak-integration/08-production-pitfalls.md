# Production Pitfalls

## Pitfall 1: Using the `master` Realm for Your Application

**What happens**: Developers create users and clients in the `master` realm for convenience.

**Risk**: The `master` realm is Keycloak's admin realm. A misconfigured client or leaked credential in `master` can give full control over the entire Keycloak instance.

**Fix**: Always create a dedicated realm for each application or tenant. `master` is for Keycloak admin operations only.

---

## Pitfall 2: Not Validating JWT Audience (`aud`)

**What happens**: Your API accepts any valid Keycloak JWT, regardless of which client it was issued for.

**Risk**: Token substitution — a token issued for `app-a` can be replayed against `app-b`. An attacker who steals an access token from one service can use it against another.

```java
// WRONG — no audience validation
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ...  # only validates signature — not audience

// CORRECT — add audience validation
@Bean
JwtDecoder jwtDecoder(...) {
    // see 07-security.md for full implementation
    // validates that aud contains "my-api"
}
```

---

## Pitfall 3: Roles Not Appearing in JWT (Wrong Scope or Mapper Config)

**What happens**: `realm_access.roles` is present in the JWT but `resource_access.<clientId>.roles` is missing, or vice versa. Authorization checks fail even though roles are assigned in Keycloak.

**Root causes:**
- "Full Scope Allowed" disabled — client scopes are limited
- Protocol Mapper not configured for the client scope
- Requesting wrong scope in the token request

**Debug steps:**
1. Keycloak Admin → Clients → your client → Client Scopes → Evaluate
2. Enter a username → Generate Token → inspect the token's `realm_access` and `resource_access`
3. If roles are missing, check: Clients → Scope → Full Scope Allowed (enable) or add role mappers

---

## Pitfall 4: Token Expiry Not Handled Gracefully

**What happens**: Access token expires mid-session. API returns 401. Frontend shows an error instead of transparently refreshing.

**Fix in frontend**: Use an HTTP interceptor to detect 401 and call the refresh token endpoint before retrying:

```javascript
// Axios interceptor (conceptual)
axios.interceptors.response.use(null, async (error) => {
    if (error.response.status === 401 && !error.config._retry) {
        error.config._retry = true;
        const newToken = await keycloak.updateToken(30); // refresh if expires in <30s
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
    }
    return Promise.reject(error);
});
```

**Fix in backend service-to-service calls**: Cache the token and proactively refresh before expiry:

```java
@Service
public class TokenCacheService {
    private String cachedToken;
    private Instant expiresAt;

    public String getToken() {
        // Refresh if expires in < 30 seconds
        if (cachedToken == null || Instant.now().isAfter(expiresAt.minusSeconds(30))) {
            fetchNewToken();
        }
        return cachedToken;
    }
}
```

---

## Pitfall 5: Session Flooding (Too Many Sessions in Memory)

**What happens**: Keycloak stores sessions in memory (Infinispan). With many users or short token lifespans causing frequent logins, memory exhausts and Keycloak becomes slow or crashes.

**Fix:**
```
# Tune session limits in Realm Settings → Sessions
SSO Session Idle: 30 min      (kick idle sessions faster)
SSO Session Max: 8 hours      (don't allow eternal sessions)
Client Session Idle: 5 min    (for APIs with short-lived tokens)
```

For high scale: configure Keycloak with an external database (PostgreSQL) and Infinispan cluster for distributed session storage.

---

## Pitfall 6: Keycloak as a Single Point of Failure

**What happens**: Single Keycloak instance goes down → all authentication fails → all services reject all requests.

**Fix:**
- Run Keycloak in **cluster mode** (multiple nodes behind a load balancer)
- Use external session store (Infinispan cluster or remote cache)
- Configure your services to **cache JWKS** keys locally — APIs can still validate JWT signatures even if Keycloak is briefly unavailable

```java
// Spring caches the JWKS automatically
// Tune the cache TTL if needed:
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ...
# Spring Boot caches JWKS for ~5 min by default
```

---

## Pitfall 7: Redirect URI Misconfiguration

**What happens**: Setting `redirect_uri` to `*` or adding production URIs to a development client.

**Risks:**
- `*` wildcard allows open redirect — attacker crafts a redirect to their server, steals the auth code
- Wrong redirect URI causes login failures in specific environments

**Fix:**
- Set exact redirect URIs per environment
- Never use `*` in production clients
- Use separate clients for dev/staging/prod

```
dev client:    redirect_uri = http://localhost:3000/callback
staging client: redirect_uri = https://staging.myapp.com/callback
prod client:   redirect_uri = https://myapp.com/callback
```

---

## Pitfall 8: Forgetting Logout on the Keycloak Side

**What happens**: App clears its local session (cookie/localStorage) but doesn't call Keycloak logout endpoint. Keycloak SSO session remains active.

**Risk**: User thinks they've logged out. Another person on the same machine opens the browser, navigates to the app — Keycloak auto-logs them in as the previous user.

**Fix**: Always call the Keycloak logout endpoint on user logout:
```java
// Spring Security — configure logout to hit Keycloak
http.logout(logout -> logout
    .logoutSuccessHandler(oidcLogoutSuccessHandler())
);

@Bean
OidcClientInitiatedLogoutSuccessHandler oidcLogoutSuccessHandler() {
    OidcClientInitiatedLogoutSuccessHandler handler =
        new OidcClientInitiatedLogoutSuccessHandler(clientRegistrationRepository);
    handler.setPostLogoutRedirectUri("{baseUrl}/logged-out");
    return handler;
}
```

---

## Pitfall 9: Using Long-Lived Access Tokens

**What happens**: Access token lifespan set to 24 hours (or more) for "convenience".

**Risk**: A stolen access token is valid for 24 hours. No way to revoke it short of rotating the signing keys (which invalidates ALL tokens).

**Fix**: Keep access tokens short (5–15 min). Use refresh tokens for session continuity. Reserve longer lifespans only for offline access use cases.

---

## Pitfall 10: Not Monitoring Token Errors

**What happens**: 401 errors spike in production. No alerting. Users report login issues hours later.

**Fix:**
- Expose Keycloak metrics (Prometheus endpoint: `/metrics`)
- Alert on: login failure rate spike, token validation error rate, session count growth
- Log every 401 at the API gateway level with correlation IDs

```yaml
# Keycloak — enable metrics
KC_METRICS_ENABLED: true
# Scrape at: https://keycloak.example.com/metrics
```

---

## Quick Check
1. Why is a long access token lifespan a security risk even if the token is signed?
2. What is a session flood and how do you prevent it at scale?
3. Why does "local logout" (clearing cookies) not fully log out a user from Keycloak SSO?
4. A user complains their roles aren't working even though they're assigned in Keycloak Admin. What are the first three things you check?
5. If Keycloak goes down, can your APIs still validate JWTs? Why or why not?
