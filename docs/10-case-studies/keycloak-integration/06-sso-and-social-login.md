# SSO and Social Login

## How SSO Works with Keycloak

SSO (Single Sign-On) means a user logs in once and accesses multiple apps without re-entering credentials.

```
User logs in to App A
  → Keycloak creates an SSO session (stored server-side)
  → Keycloak issues tokens to App A

User navigates to App B
  → App B redirects to Keycloak
  → Keycloak detects active SSO session → no login prompt
  → Keycloak issues tokens to App B immediately
```

**What makes SSO work:**
- Keycloak stores the session server-side (in memory/DB/Infinispan cache)
- The browser holds a Keycloak session cookie (`KEYCLOAK_SESSION`)
- Apps in the same realm share the same Keycloak session

---

## Configuring SSO Across Multiple Spring Boot Apps

**App A (frontend/BFF):**
```yaml
# application.yml — App A
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-id: app-a
            client-secret: ${APP_A_SECRET}
            scope: openid,profile,email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/keycloak"
        provider:
          keycloak:
            issuer-uri: https://keycloak.example.com/realms/my-realm
```

**App B (separate service, same realm):**
```yaml
# application.yml — App B
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-id: app-b     ← different client ID, same realm
            ...
        provider:
          keycloak:
            issuer-uri: https://keycloak.example.com/realms/my-realm  ← same realm
```

Both apps share the Keycloak realm → same SSO session → user logs in once.

---

## Social Login (Identity Brokering)

Keycloak can delegate authentication to external Identity Providers (IdPs):

```
User clicks "Login with Google"
  → Keycloak redirects to Google OAuth
  → User authenticates with Google
  → Google sends authorization code to Keycloak
  → Keycloak exchanges code with Google for tokens
  → Keycloak creates/links a local user in its own DB
  → Keycloak issues its own tokens to your app
```

**Your app only ever talks to Keycloak** — Google/GitHub are invisible to your app.

**Setup in Keycloak Admin Console:**
1. Realm → Identity Providers → Add Provider → Google
2. Enter Google's `Client ID` and `Client Secret` (from Google Cloud Console)
3. Set the redirect URI in Google: `https://keycloak.example.com/realms/my-realm/broker/google/endpoint`

**Supported out of the box:** Google, GitHub, Facebook, Twitter, LinkedIn, Microsoft, Apple, GitLab, Bitbucket, SAML providers, LDAP, Active Directory.

---

## Account Linking

When a user logs in with Google for the first time, Keycloak can:

1. **Auto-link** — if email matches an existing Keycloak user, link the accounts
2. **Create new user** — create a new Keycloak user from the social profile
3. **Ask user to link** — prompt user to confirm the link (most secure)

```
# Keycloak Admin → Identity Providers → Google → First Login Flow
Options:
  - "Create User If Unique" → create if email not taken, otherwise prompt
  - "Detect Existing Broker User" → link if email matches, prompt otherwise
```

---

## Corporate SSO with SAML / External OIDC Provider

Keycloak can broker to corporate IdPs (Active Directory, Okta, Azure AD):

```
User → Your App → Keycloak → Azure AD (SAML or OIDC)
                           ← Azure issues SAML assertion
             ← Keycloak maps attributes → issues JWT
← Your app receives Keycloak JWT
```

**SAML setup:**
- Keycloak: Realm → Identity Providers → SAML v2.0
- Configure EntityID, SSO URL, certificate from corporate IdP
- Map SAML attributes (like `email`, `department`) to Keycloak user attributes

---

## Token Propagation in Microservices

When App A calls Service B on behalf of a user, you need to propagate the user's identity.

**Option 1: Pass the original access token**
```java
// App A calls Service B with the same token
@Service
public class ServiceBClient {

    private final RestTemplate restTemplate;

    public Data callServiceB(String accessToken, String resourceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);  // forward the original token
        return restTemplate.exchange(
            "http://service-b/api/resource/" + resourceId,
            HttpMethod.GET,
            new HttpEntity<>(headers),
            Data.class
        ).getBody();
    }
}
```

**Option 2: Token Exchange (Keycloak feature)**
Exchange the user's token for a service-specific token with different audience/scopes:
```
POST /realms/my-realm/protocol/openid-connect/token
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<original_access_token>
requested_token_type=urn:ietf:params:oauth:token-type:access_token
audience=service-b
```

---

## Quick Check
1. What is an SSO session and where does Keycloak store it?
2. When a user logs in with Google via Keycloak, does your app receive a Google token or a Keycloak token?
3. What is the difference between Identity Brokering and Federation (LDAP)?
4. If you have two Spring Boot apps in the same Keycloak realm, what makes SSO work between them?
5. What is token propagation and when would you use Token Exchange instead?
