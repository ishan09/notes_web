# OAuth2 and Social Login

## Before You Start

Can you answer these?
- What is OAuth2 and why was it created?
- What's the difference between authentication and authorization (in OAuth2 context)?
- What is OpenID Connect?

## What is OAuth2?

**OAuth2** is an authorization framework that allows applications to obtain limited access to user accounts on another service (Google, GitHub, Facebook) without exposing passwords.

**Real-world analogy**: Hotel key card for valet
- You give valet a special key card (OAuth token)
- Card only works for parking garage (limited scope)
- Card doesn't open your room (no full access)
- You can revoke the card anytime (token revocation)
- Valet never sees your master key (no password sharing)

**Problem OAuth2 solves**:
```
OLD WAY (❌):
User gives app their Google password
App logs into Google as the user
App has full access to Google account
User can't revoke access without changing password

OAUTH2 WAY (✅):
User authorizes app via Google
Google gives app a token
Token has limited permissions (scope)
User can revoke token anytime
App never sees password
```

## OAuth2 Roles

| Role | Description | Example |
|------|-------------|---------|
| **Resource Owner** | User who owns the data | You (with Google account) |
| **Resource Server** | Server hosting protected resources | Google Drive API |
| **Client** | Application requesting access | InvoiceManager app |
| **Authorization Server** | Server issuing tokens | Google OAuth server |

## OAuth2 Grant Types (Flows)

### 1. Authorization Code Flow (Most Secure)

**Use case**: Web applications with server-side backend

**Flow**:
```
1. User clicks "Login with Google"
   ↓
2. Redirect to Google authorization page
   GET https://accounts.google.com/o/oauth2/auth?
       client_id=YOUR_CLIENT_ID&
       redirect_uri=http://localhost:8080/login/oauth2/code/google&
       response_type=code&
       scope=openid email profile
   ↓
3. User logs in and grants permission
   ↓
4. Google redirects back with authorization code
   GET http://localhost:8080/login/oauth2/code/google?code=AUTH_CODE
   ↓
5. Your server exchanges code for access token
   POST https://oauth2.googleapis.com/token
   Body: code=AUTH_CODE&client_id=...&client_secret=...
   ↓
6. Google returns access token
   {
     "access_token": "ya29.a0AfH6...",
     "token_type": "Bearer",
     "expires_in": 3600
   }
   ↓
7. Use access token to access Google APIs
   GET https://www.googleapis.com/oauth2/v1/userinfo
   Header: Authorization: Bearer ya29.a0AfH6...
```

**Security**: Client secret never exposed to browser

### 2. Implicit Flow (Legacy, deprecated)

**Use case**: Single-page apps (SPAs) - **No longer recommended**

**Flow**:
```
1. User clicks "Login with Google"
   ↓
2. Redirect to Google
   ↓
3. Google redirects with access token in URL fragment
   http://localhost:3000/#access_token=ya29.a0AfH6...
```

**Problem**: Token exposed in browser history, URL
**Replacement**: Use Authorization Code Flow with PKCE

### 3. Client Credentials Flow

**Use case**: Machine-to-machine (no user involved)

**Flow**:
```
1. Service sends client ID + client secret
   ↓
2. Authorization server returns access token
   ↓
3. Service uses token to access API
```

**Example**: Microservice accessing another microservice

### 4. Resource Owner Password Credentials (Legacy)

**Use case**: Trusted first-party apps only

**Flow**:
```
1. User enters username + password in your app
   ↓
2. App sends credentials to authorization server
   ↓
3. Server returns access token
```

**Problem**: App handles user's password (defeats OAuth2 purpose)
**When to use**: Only for legacy apps you fully control

### 5. Authorization Code with PKCE (Recommended for SPAs)

**PKCE** = Proof Key for Code Exchange

**Use case**: Single-page apps, mobile apps (no client secret)

**Flow**:
```
1. Generate random code_verifier
   ↓
2. Generate code_challenge = SHA256(code_verifier)
   ↓
3. Request authorization with code_challenge
   ↓
4. Exchange code + code_verifier for token
```

**Security**: Even if code is intercepted, attacker can't exchange it without code_verifier

## OAuth2 vs OpenID Connect

| Aspect | OAuth2 | OpenID Connect (OIDC) |
|--------|--------|----------------------|
| Purpose | **Authorization** (access delegation) | **Authentication** (who you are) |
| Primary use | Access APIs | Login/SSO |
| Returns | Access token | ID token + access token |
| User info | Not standardized | Standardized (UserInfo endpoint) |
| Example | "Allow app to read your Google Drive" | "Login with Google" |

**OpenID Connect** = OAuth2 + standardized authentication layer

**ID Token** (JWT):
```json
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",
  "email": "john@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "iat": 1679990000,
  "exp": 1680000000
}
```

## Scopes

**Scopes** define what permissions the token has.

**Common scopes**:
```
openid          - Basic OIDC (required for authentication)
profile         - User's profile (name, picture)
email           - User's email address
address         - User's address
phone           - User's phone number

drive.readonly  - Read Google Drive files
gmail.send      - Send emails via Gmail
calendar.events - Manage calendar events
```

**Requesting scopes**:
```
scope=openid profile email
```

**In access token response**:
```json
{
  "access_token": "...",
  "scope": "openid profile email"
}
```

## Spring Security OAuth2 Login

### Step 1: Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

### Step 2: Register OAuth2 Application

**Google**: https://console.cloud.google.com/
1. Create project
2. Enable Google+ API
3. Create OAuth2 credentials
4. Add authorized redirect URI: `http://localhost:8080/login/oauth2/code/google`
5. Get Client ID and Client Secret

**GitHub**: https://github.com/settings/developers
1. Register new OAuth application
2. Authorization callback URL: `http://localhost:8080/login/oauth2/code/github`
3. Get Client ID and Client Secret

### Step 3: Configuration

```yaml
# application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - openid
              - profile
              - email

          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope:
              - read:user
              - user:email
```

**Environment variables**:
```bash
export GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-client-secret
export GITHUB_CLIENT_ID=your-github-client-id
export GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Step 4: Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard", true)
                .failureUrl("/login?error=true")
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
            );

        return http.build();
    }
}
```

### Step 5: Login Page

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
</head>
<body>
    <h1>Login</h1>

    <a href="/oauth2/authorization/google">
        <button>Login with Google</button>
    </a>

    <a href="/oauth2/authorization/github">
        <button>Login with GitHub</button>
    </a>
</body>
</html>
```

**Spring Boot auto-configuration creates**:
- `/oauth2/authorization/{registrationId}` - Initiates OAuth2 flow
- `/login/oauth2/code/{registrationId}` - Callback endpoint

### Step 6: Access User Information

```java
@RestController
public class UserController {

    @GetMapping("/user")
    public Map<String, Object> user(@AuthenticationPrincipal OAuth2User principal) {
        return principal.getAttributes();
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal OAuth2User principal) {
        String name = principal.getAttribute("name");
        String email = principal.getAttribute("email");
        return "Welcome, " + name + " (" + email + ")";
    }
}
```

**OAuth2User attributes (Google)**:
```json
{
  "sub": "110169484474386276334",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "email": "john@example.com",
  "email_verified": true,
  "locale": "en"
}
```

## Custom User Service

### Map OAuth2 User to Database

```java
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");

        // Find or create user in database
        User user = userRepository.findByEmail(email)
            .orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setName(name);
                newUser.setProvider(registrationId);  // "google" or "github"
                newUser.setProviderId(oauth2User.getAttribute("sub"));
                newUser.setEnabled(true);

                // Assign default role
                Role userRole = roleRepository.findByName("ROLE_USER")
                    .orElseThrow();
                newUser.getRoles().add(userRole);

                return userRepository.save(newUser);
            });

        // Create custom principal
        return new CustomOAuth2User(oauth2User, user);
    }
}
```

### Custom OAuth2User Implementation

```java
public class CustomOAuth2User implements OAuth2User {

    private final OAuth2User oauth2User;
    private final User user;

    public CustomOAuth2User(OAuth2User oauth2User, User user) {
        this.oauth2User = oauth2User;
        this.user = user;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return oauth2User.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority(role.getName()))
            .collect(Collectors.toSet());
    }

    @Override
    public String getName() {
        return user.getEmail();
    }

    public User getUser() {
        return user;
    }
}
```

### Configure Custom User Service

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .oauth2Login(oauth2 -> oauth2
            .userInfoEndpoint(userInfo -> userInfo
                .userService(customOAuth2UserService)
            )
            .defaultSuccessUrl("/dashboard", true)
        );

    return http.build();
}
```

## OAuth2 Resource Server

**Use case**: Your API is the protected resource, clients use tokens from authorization server

### Step 1: Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

### Step 2: Configuration

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.google.com
          # Or use jwk-set-uri directly
          jwk-set-uri: https://www.googleapis.com/oauth2/v3/certs
```

### Step 3: Security Config

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .anyRequest().authenticated()
        )
        .oauth2ResourceServer(oauth2 -> oauth2
            .jwt(jwt -> jwt
                .jwtAuthenticationConverter(jwtAuthenticationConverter())
            )
        );

    return http.build();
}

@Bean
public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter =
        new JwtGrantedAuthoritiesConverter();
    grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
    grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

    JwtAuthenticationConverter jwtAuthenticationConverter =
        new JwtAuthenticationConverter();
    jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
        grantedAuthoritiesConverter
    );

    return jwtAuthenticationConverter;
}
```

### Step 4: Access Protected Endpoint

```bash
# Get access token from Google
# (use OAuth2 flow or service account)

# Call your API
curl -H "Authorization: Bearer ya29.a0AfH6..." \
  http://localhost:8080/api/invoices
```

### Step 5: Extract User Info

```java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @GetMapping("/my")
    public List<Invoice> getMyInvoices(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return invoiceService.findByEmail(email);
    }

    @GetMapping("/user-info")
    public Map<String, Object> getUserInfo(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "email", jwt.getClaimAsString("email"),
            "name", jwt.getClaimAsString("name"),
            "sub", jwt.getSubject()
        );
    }
}
```

## Build-Along Project: InvoiceManager Social Login

### User Entity with OAuth2

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    private String name;

    @Column(name = "password")
    private String password;  // Null for OAuth2 users

    @Enumerated(EnumType.STRING)
    private AuthProvider provider;  // LOCAL, GOOGLE, GITHUB

    private String providerId;  // OAuth2 user ID from provider

    @ManyToMany(fetch = FetchType.EAGER)
    private Set<Role> roles = new HashSet<>();

    // Getters and setters
}

public enum AuthProvider {
    LOCAL,
    GOOGLE,
    GITHUB,
    FACEBOOK
}
```

### Complete OAuth2 Configuration

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - openid
              - profile
              - email
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"

          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope:
              - read:user
              - user:email
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
```

### OAuth2 Success Handler

```java
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    public OAuth2LoginSuccessHandler(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                       HttpServletResponse response,
                                       Authentication authentication)
            throws IOException, ServletException {

        CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();

        // Generate JWT for the OAuth2 user
        String token = jwtTokenProvider.generateTokenForOAuth2User(oauth2User);

        // Redirect to frontend with token
        String targetUrl = "http://localhost:3000/oauth2/redirect?token=" + token;

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
```

### Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomOAuth2UserService oauth2UserService;
    private final OAuth2LoginSuccessHandler oauth2SuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/oauth2/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oauth2UserService)
                )
                .successHandler(oauth2SuccessHandler)
            );

        return http.build();
    }
}
```

### Frontend Integration (React)

```javascript
// Login buttons
<button onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}>
    Login with Google
</button>

<button onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/github'}>
    Login with GitHub
</button>

// OAuth2 redirect handler
const OAuth2RedirectHandler = () => {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('accessToken', token);
            window.location.href = '/dashboard';
        } else {
            window.location.href = '/login?error=true';
        }
    }, []);

    return <div>Loading...</div>;
};
```

## Advanced Topics

### 1. Token Introspection

Verify token validity with authorization server:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .oauth2ResourceServer(oauth2 -> oauth2
            .opaqueToken(token -> token
                .introspectionUri("https://oauth2.example.com/introspect")
                .introspectionClientCredentials("client-id", "client-secret")
            )
        );

    return http.build();
}
```

### 2. Token Relay

Pass OAuth2 token to downstream services:

```java
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(OAuth2AuthorizedClientManager authorizedClientManager) {
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 =
            new ServletOAuth2AuthorizedClientExchangeFilterFunction(
                authorizedClientManager
            );

        return WebClient.builder()
            .apply(oauth2.oauth2Configuration())
            .build();
    }
}

// Use in service
@Service
public class InvoiceService {

    private final WebClient webClient;

    public Mono<String> callDownstreamService() {
        return webClient.get()
            .uri("http://downstream-service/api/data")
            .attributes(ServletOAuth2AuthorizedClientExchangeFilterFunction
                .clientRegistrationId("google"))
            .retrieve()
            .bodyToMono(String.class);
    }
}
```

### 3. Multiple OAuth2 Providers

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            # ...
          github:
            # ...
          facebook:
            client-id: ${FACEBOOK_CLIENT_ID}
            client-secret: ${FACEBOOK_CLIENT_SECRET}
            scope:
              - email
              - public_profile

          okta:
            client-id: ${OKTA_CLIENT_ID}
            client-secret: ${OKTA_CLIENT_SECRET}
            scope:
              - openid
              - profile
              - email
        provider:
          okta:
            issuer-uri: https://dev-12345.okta.com/oauth2/default
```

## Common Mistakes

### Mistake 1: Not handling email verification

```java
// ❌ Trust email without verification
String email = oauth2User.getAttribute("email");
user.setEmail(email);
user.setEmailVerified(true);  // Assume verified

// ✅ Check email_verified claim
Boolean emailVerified = oauth2User.getAttribute("email_verified");
if (Boolean.TRUE.equals(emailVerified)) {
    user.setEmail(email);
    user.setEmailVerified(true);
} else {
    // Require email verification
}
```

### Mistake 2: Hardcoding redirect URI

```yaml
# ❌ Hardcoded
redirect-uri: http://localhost:8080/login/oauth2/code/google

# ✅ Use placeholder
redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
```

### Mistake 3: Not validating state parameter

Spring Security handles this automatically, but if implementing manually:

```java
// ✅ Spring Security validates state (CSRF protection)
// Manual implementation must validate state matches
```

### Mistake 4: Storing access token without encryption

```java
// ❌ Store in plain text
user.setAccessToken(oauth2User.getAccessToken());

// ✅ Don't store, or encrypt if necessary
// Better: Use refresh token to get new access token when needed
```

### Mistake 5: Not handling account linking

```java
// ❌ Create duplicate accounts
User googleUser = createUser(email, "GOOGLE");
User githubUser = createUser(email, "GITHUB");  // Same email!

// ✅ Link to existing account
User user = userRepository.findByEmail(email)
    .orElseGet(() -> createNewUser(email));

// Add provider link
user.addProvider("GITHUB", githubProviderId);
```

## Security Considerations

### 1. Client Secret Protection

```yaml
# ❌ In version control
client-secret: your-client-secret

# ✅ Environment variable
client-secret: ${GOOGLE_CLIENT_SECRET}
```

### 2. Redirect URI Validation

Authorization servers validate redirect URIs. Register exact URLs:
- http://localhost:8080/login/oauth2/code/google ✅
- http://localhost:8080/* ❌ (wildcard not allowed)

### 3. State Parameter (CSRF)

Spring Security automatically includes state parameter to prevent CSRF during OAuth2 flow.

### 4. PKCE for Public Clients

```yaml
# For SPAs/mobile apps
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            authorization-grant-type: authorization_code
            # PKCE enabled by default for public clients
```

## Testing OAuth2

```java
@SpringBootTest
@AutoConfigureMockMvc
class OAuth2LoginTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "john@example.com")
    void testProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/invoices"))
            .andExpect(status().isOk());
    }

    @Test
    void testOAuth2LoginRedirect() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/google"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrlPattern("https://accounts.google.com/**"));
    }

    @Test
    @WithOAuth2Login(attributes = {
        @Attribute(key = "email", value = "john@example.com"),
        @Attribute(key = "name", value = "John Doe")
    })
    void testWithOAuth2User() throws Exception {
        mockMvc.perform(get("/user"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("john@example.com"));
    }
}
```

## Self-Check Questions

1. What's the difference between OAuth2 and OpenID Connect?
2. Why is Authorization Code Flow more secure than Implicit Flow?
3. What is PKCE and when should you use it?
4. What's the difference between access token and ID token?
5. Why should you not store client secret in code?
6. What is the purpose of the state parameter?

<details>
<summary>Answers</summary>

1. OAuth2 = authorization (API access), OIDC = authentication (login) + OAuth2
2. Authorization Code Flow: client secret on server (never exposed). Implicit: token in URL (exposed to browser)
3. PKCE = Proof Key for Code Exchange. Use for SPAs/mobile apps that can't keep client secret
4. Access token: API access. ID token: User identity (JWT with user claims)
5. If exposed, attackers can impersonate your app and access user data
6. CSRF protection - ensures authorization response matches the request that initiated it
</details>

## Practice Exercises

### Exercise 1: Multi-Provider Login
- Support Google, GitHub, Facebook
- Link multiple providers to same account
- Allow unlinking providers

### Exercise 2: Custom Authorization Server
- Implement your own OAuth2 authorization server
- Issue tokens for InvoiceManager API
- Support client credentials flow

### Exercise 3: Token Management
- Store refresh tokens securely
- Implement token refresh before expiry
- Revoke tokens on logout

### Exercise 4: Fine-Grained Scopes
- Define custom scopes (read:invoices, write:invoices)
- Validate scopes in resource server
- Request minimal scopes from providers

---

## Navigation

**Prerequisites:**
- [Spring Security Authentication](./01-authentication.md) - Authentication fundamentals
- [JWT Implementation](./03-jwt.md) - Token-based authentication and validation
- [Authorization & Access Control](./02-authorization.md) - Role and scope-based authorization

**Next Topics:**
- [Security Best Practices](./05-best-practices.md) - OWASP Top 10 and security hardening
- [Microservices Authentication](../../../04-microservices/04-inter-service-communication.md) - OAuth2 for service-to-service

**Related:**
- [REST API Security](../../spring-boot/05-best-practices.md) - Securing API endpoints
- [CORS Configuration](../../spring-boot/03-rest-api.md) - Cross-origin requests for OAuth2 flows
- [Single Sign-On (SSO)](./README.md) - Enterprise authentication patterns

**Interview Focus:**
- OAuth2 grant types (Authorization Code, PKCE, Client Credentials) and when to use each
- OAuth2 vs OpenID Connect (OIDC) - authorization vs authentication
- Authorization Code Flow security compared to Implicit Flow
- PKCE (Proof Key for Code Exchange) and why it's essential for SPAs and mobile apps
- Scopes and permission model in OAuth2
- State parameter and CSRF protection in OAuth2 flow
- Custom OAuth2 user service and account linking
- Common security mistakes (client secret exposure, insecure redirect URIs)

**Module Index:** [Spring Security Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
