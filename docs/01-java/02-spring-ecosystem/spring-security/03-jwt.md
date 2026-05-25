# JWT Authentication & REST API Security

## Before You Start

Can you answer these?
- What is a JSON Web Token (JWT)?
- What's the difference between stateful and stateless authentication?
- What is CSRF and why does it matter?
- What is CORS and when do you need it?

## What is JWT?

**JSON Web Token (JWT)** is a compact, self-contained token format for securely transmitting information between parties.

**Simple analogy**: Concert wristband
- **Session-based**: You get a ticket stub (session ID), venue keeps full details in their system
- **JWT**: You get a wristband with all your info encoded (VIP status, age, section) - venue just verifies the wristband

**JWT Structure**:
```
header.payload.signature
```

Example:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqb2huIiwicm9sZSI6IlVTRVIiLCJleHAiOjE2ODAwMDAwMDB9.4Adcj_PFHXMs5J8TmhJk8lWZ5Z3YwXyL7Z3YwXyL7Zk
```

### JWT Parts

**1. Header** (Algorithm + Token Type)
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**2. Payload** (Claims - user data)
```json
{
  "sub": "john",           // Subject (username)
  "role": "USER",          // Custom claim
  "iat": 1679990000,       // Issued at
  "exp": 1680000000        // Expiration
}
```

**3. Signature** (Verification)
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

**Stop and think**: Why can't you just change the payload and forge a token?

<details>
<summary>Answer</summary>

The signature is created using the header + payload + secret key. If you change the payload, the signature won't match anymore. The server verifies the signature using the secret key - if it doesn't match, the token is rejected. You can't recreate a valid signature without knowing the secret key.
</details>

## Session-Based vs Token-Based Authentication

### Session-Based (Traditional)

```
1. User logs in
   ↓
2. Server creates session in memory/database
   ↓
3. Server sends session ID as cookie
   ↓
4. Browser includes cookie automatically in every request
   ↓
5. Server looks up session by ID to get user info
```

**Storage**: Server-side (memory, database, Redis)

**Pros**:
- ✅ Can revoke sessions immediately (logout everywhere)
- ✅ Less data sent with each request (just session ID)
- ✅ CSRF protection built-in with proper configuration

**Cons**:
- ❌ Server must store session state (not stateless)
- ❌ Difficult to scale horizontally (session sharing)
- ❌ Doesn't work well across different domains
- ❌ Not ideal for mobile apps

### Token-Based (JWT)

```
1. User logs in
   ↓
2. Server creates JWT with user info + signature
   ↓
3. Server sends JWT to client
   ↓
4. Client stores JWT (localStorage/cookie)
   ↓
5. Client includes JWT in Authorization header
   ↓
6. Server verifies signature (no database lookup)
```

**Storage**: Client-side (localStorage, sessionStorage, cookie)

**Pros**:
- ✅ Stateless (server doesn't store anything)
- ✅ Easy to scale horizontally
- ✅ Works across domains (CORS)
- ✅ Perfect for mobile apps and SPAs
- ✅ Can contain user info (no database lookup)

**Cons**:
- ❌ Can't revoke tokens immediately (valid until expiry)
- ❌ Larger payload (sent with every request)
- ❌ Need to handle token refresh
- ❌ Vulnerable to XSS if stored in localStorage

### When to Use Which?

| Use Case | Recommendation |
|----------|---------------|
| Traditional server-rendered web app | Session-based |
| REST API for SPA (React, Angular, Vue) | JWT |
| Mobile app | JWT |
| Microservices | JWT |
| Need immediate logout everywhere | Session-based or JWT with blacklist |
| Very high security requirements | Session-based or short-lived JWT |

## CSRF (Cross-Site Request Forgery)

### What is CSRF?

**Attack scenario**:
```
1. You're logged into bank.com (session cookie stored)
2. You visit evil.com
3. evil.com has hidden form:
   <form action="https://bank.com/transfer" method="POST">
     <input name="to" value="attacker" />
     <input name="amount" value="1000" />
   </form>
   <script>document.forms[0].submit()</script>
4. Browser automatically includes bank.com cookies!
5. Money transferred without your knowledge
```

**Key point**: Browser automatically includes cookies with cross-origin requests!

### CSRF Protection with Sessions

**How it works**:
```
1. Server generates random CSRF token
2. Server includes token in form (hidden field) or page
3. Client submits form with CSRF token
4. Server verifies token matches session
5. If match, process request; if not, reject
```

**Spring Security configuration**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
        )
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        );

    return http.build();
}
```

**In HTML form**:
```html
<form method="POST" action="/transfer">
    <!-- CSRF token automatically added by Spring Security -->
    <input type="hidden" name="_csrf" value="${_csrf.token}" />
    <input name="amount" />
    <button>Transfer</button>
</form>
```

**In JavaScript (SPA)**:
```javascript
// Get CSRF token from cookie
const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

// Include in request header
fetch('/api/invoices', {
    method: 'POST',
    headers: {
        'X-XSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});
```

### CSRF Protection with JWT

**Do you need CSRF protection with JWT?**

**Answer**: It depends on where you store the JWT.

**JWT in localStorage** (common for SPAs):
```javascript
// Store JWT
localStorage.setItem('token', jwt);

// Send in Authorization header
fetch('/api/invoices', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
});
```

**CSRF protection**: ✅ NOT NEEDED
- Reason: localStorage is not automatically included in requests
- Attacker's site can't access your localStorage
- But: ❌ Vulnerable to XSS (JavaScript can steal token)

**JWT in httpOnly cookie**:
```java
// Server sets cookie
ResponseCookie cookie = ResponseCookie.from("jwt", token)
    .httpOnly(true)      // JavaScript can't access
    .secure(true)        // HTTPS only
    .sameSite("Strict")  // CSRF protection
    .path("/")
    .maxAge(3600)
    .build();

response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

**CSRF protection**: ❌ NEEDED (cookie is automatically included)
- But: SameSite=Strict provides strong CSRF protection
- Also: ✅ Protected from XSS (httpOnly)

**Recommendation for REST APIs with JWT**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())  // Disable CSRF for JWT in Authorization header
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

    return http.build();
}
```

**Why disable CSRF for JWT REST APIs?**
1. JWT typically sent in Authorization header (not automatic)
2. No cookies = no automatic inclusion = no CSRF risk
3. Stateless = no session to hijack

## CORS (Cross-Origin Resource Sharing)

### What is CORS?

**Same-Origin Policy**: Browser blocks JavaScript from making requests to different origins.

**Origin** = Protocol + Domain + Port

Examples:
```
https://example.com:443
https://example.com:8080      ❌ Different port
https://api.example.com       ❌ Different subdomain
http://example.com            ❌ Different protocol
```

### Why CORS?

**Scenario**:
- Frontend: http://localhost:3000 (React app)
- Backend: http://localhost:8080 (Spring Boot API)

**Without CORS**:
```javascript
fetch('http://localhost:8080/api/invoices')
// ❌ CORS error: No 'Access-Control-Allow-Origin' header
```

**With CORS**:
```javascript
fetch('http://localhost:8080/api/invoices')
// ✅ Works if backend allows localhost:3000
```

### CORS Preflight Request

For non-simple requests (POST, PUT, DELETE, custom headers), browser sends OPTIONS request first:

```
Browser:
OPTIONS /api/invoices HTTP/1.1
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization, Content-Type

Server:
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 3600

Browser: ✅ Preflight passed, send actual request
```

### CORS Configuration in Spring

**Global CORS configuration**:
```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow specific origins (NEVER use "*" with credentials)
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:4200",
            "https://myapp.com"
        ));

        // Or allow origin patterns
        configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:*"));

        // Allow methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // Allow headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With"
        ));

        // Expose headers to JavaScript
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        // Allow credentials (cookies)
        configuration.setAllowCredentials(true);

        // Cache preflight response for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);

        return source;
    }
}
```

**In Security Config**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        );

    return http.build();
}
```

**Controller-level CORS**:
```java
@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class InvoiceController {
    // ...
}
```

**Method-level CORS**:
```java
@GetMapping
@CrossOrigin(origins = "http://localhost:3000")
public List<Invoice> getAll() {
    return service.findAll();
}
```

### CORS Common Mistakes

**Mistake 1: Using wildcard with credentials**
```java
// ❌ DOESN'T WORK
configuration.setAllowedOrigins(Arrays.asList("*"));
configuration.setAllowCredentials(true);
// Browser rejects: can't use "*" with credentials

// ✅ FIX
configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
configuration.setAllowCredentials(true);
```

**Mistake 2: Forgetting Authorization header**
```java
// ❌ Browser blocks Authorization header
configuration.setAllowedHeaders(Arrays.asList("Content-Type"));

// ✅ FIX
configuration.setAllowedHeaders(Arrays.asList(
    "Authorization",  // Add this!
    "Content-Type"
));
```

**Mistake 3: Not exposing response headers**
```java
// ❌ JavaScript can't read custom headers in response
response.setHeader("X-Total-Count", "100");

// ✅ FIX
configuration.setExposedHeaders(Arrays.asList("X-Total-Count"));
```

## JWT Implementation in Spring Boot

### Step 1: Add Dependencies

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

### Step 2: JWT Configuration Properties

```yaml
# application.yml
jwt:
  secret: your-256-bit-secret-key-here-make-it-very-long-and-random
  expiration: 3600000  # 1 hour in milliseconds
  refresh-expiration: 86400000  # 24 hours
```

```java
@ConfigurationProperties(prefix = "jwt")
@Component
public class JwtProperties {
    private String secret;
    private Long expiration;
    private Long refreshExpiration;

    // Getters and setters
}
```

### Step 3: JWT Utility Class

```java
@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long jwtExpiration;
    private final long refreshExpiration;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.secretKey = Keys.hmacShaKeyFor(
            jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8)
        );
        this.jwtExpiration = jwtProperties.getExpiration();
        this.refreshExpiration = jwtProperties.getRefreshExpiration();
    }

    // Generate access token
    public String generateAccessToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));

        return Jwts.builder()
            .subject(userDetails.getUsername())
            .claims(claims)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
            .signWith(secretKey)
            .compact();
    }

    // Generate refresh token
    public String generateRefreshToken(String username) {
        return Jwts.builder()
            .subject(username)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + refreshExpiration))
            .signWith(secretKey)
            .compact();
    }

    // Extract username from token
    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    // Extract roles from token
    @SuppressWarnings("unchecked")
    public List<String> getRolesFromToken(String token) {
        return (List<String>) getClaims(token).get("roles");
    }

    // Validate token
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Check if token is expired
    public boolean isTokenExpired(String token) {
        return getClaims(token).getExpiration().before(new Date());
    }

    // Parse and verify token
    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
```

### Step 4: JWT Authentication Filter

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                  UserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain)
            throws ServletException, IOException {

        // Extract JWT from Authorization header
        String token = extractTokenFromRequest(request);

        if (token != null && jwtTokenProvider.validateToken(token)) {
            // Get username from token
            String username = jwtTokenProvider.getUsernameFromToken(token);

            // Load user details
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            // Create authentication
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
                );

            authentication.setDetails(
                new WebAuthenticationDetailsSource().buildDetails(request)
            );

            // Set authentication in SecurityContext
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }
}
```

### Step 5: Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationEntryPoint authEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // Disable CSRF for JWT
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // No sessions
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPoint)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

### Step 6: Authentication Controller

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(
            authentication.getName()
        );

        return ResponseEntity.ok(new JwtResponse(
            accessToken,
            refreshToken,
            "Bearer",
            jwtTokenProvider.getExpirationFromToken(accessToken)
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(@RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        // Validate refresh token
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        // Get username from refresh token
        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);

        // Load user and generate new access token
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userDetails, null, userDetails.getAuthorities()
        );

        String newAccessToken = jwtTokenProvider.generateAccessToken(authentication);

        return ResponseEntity.ok(new JwtResponse(
            newAccessToken,
            refreshToken,  // Same refresh token
            "Bearer",
            jwtTokenProvider.getExpirationFromToken(newAccessToken)
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout() {
        // With JWT, logout is client-side (delete token)
        // For server-side logout, implement token blacklist
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok("Logged out successfully");
    }
}
```

### Step 7: DTOs

```java
public class LoginRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    // Getters and setters
}

public class JwtResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;

    // Constructor, getters, setters
}

public class RefreshTokenRequest {
    @NotBlank
    private String refreshToken;

    // Getter and setter
}
```

## Using JWT in Client

### React Example

```javascript
// Login
const login = async (username, password) => {
    const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
};

// Make authenticated request
const getInvoices = async () => {
    const token = localStorage.getItem('accessToken');

    const response = await fetch('http://localhost:8080/api/invoices', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    return await response.json();
};

// Refresh token
const refreshToken = async () => {
    const refresh = localStorage.getItem('refreshToken');

    const response = await fetch('http://localhost:8080/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh })
    });

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
};

// Logout
const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};
```

### Axios Interceptor (Auto-refresh)

```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api'
});

// Request interceptor - add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const response = await axios.post('/auth/refresh', {
                    refreshToken
                });

                const { accessToken } = response.data;
                localStorage.setItem('accessToken', accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
```

## Token Blacklist (Logout)

**Problem**: JWT is valid until expiry, can't be revoked.

**Solution 1**: Short-lived tokens (5-15 minutes)

**Solution 2**: Token blacklist

```java
@Service
public class TokenBlacklistService {

    private final RedisTemplate<String, String> redisTemplate;

    // Add token to blacklist
    public void blacklistToken(String token, long expirySeconds) {
        redisTemplate.opsForValue().set(
            "blacklist:" + token,
            "true",
            expirySeconds,
            TimeUnit.SECONDS
        );
    }

    // Check if token is blacklisted
    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(
            redisTemplate.hasKey("blacklist:" + token)
        );
    }
}
```

**In filter**:
```java
if (token != null && jwtTokenProvider.validateToken(token)) {
    if (tokenBlacklistService.isBlacklisted(token)) {
        throw new InvalidTokenException("Token has been revoked");
    }
    // Continue authentication...
}
```

## Security Best Practices

### 1. Secret Key Management

```java
// ❌ NEVER hardcode secret
private static final String SECRET = "my-secret-key";

// ✅ Use environment variable
@Value("${JWT_SECRET}")
private String secret;

// ✅ Or generate random key
SecretKey key = Jwts.SIG.HS256.key().build();
String encoded = Encoders.BASE64.encode(key.getEncoded());
// Store in environment variable
```

### 2. Token Expiration

```yaml
jwt:
  expiration: 900000       # 15 minutes (access token)
  refresh-expiration: 604800000  # 7 days (refresh token)
```

### 3. Secure Token Storage

**Options**:

| Storage | XSS Risk | CSRF Risk | Recommendation |
|---------|----------|-----------|----------------|
| localStorage | ❌ High | ✅ None | Avoid for sensitive apps |
| sessionStorage | ❌ High | ✅ None | Slightly better than localStorage |
| Cookie (httpOnly) | ✅ None | ❌ Medium | Use with SameSite=Strict |
| Memory only | ✅ None | ✅ None | Lost on refresh |

**Recommended**: httpOnly cookie with SameSite

```java
ResponseCookie cookie = ResponseCookie.from("jwt", token)
    .httpOnly(true)       // Can't access via JavaScript
    .secure(true)         // HTTPS only
    .sameSite("Strict")   // CSRF protection
    .path("/")
    .maxAge(3600)
    .build();
```

### 4. Token Claims Validation

```java
public boolean validateToken(String token) {
    try {
        Claims claims = getClaims(token);

        // Validate expiration
        if (claims.getExpiration().before(new Date())) {
            return false;
        }

        // Validate issuer
        if (!"invoice-manager".equals(claims.getIssuer())) {
            return false;
        }

        // Validate audience
        if (!"web-app".equals(claims.getAudience())) {
            return false;
        }

        return true;
    } catch (JwtException e) {
        return false;
    }
}
```

## Build-Along Project: InvoiceManager JWT Auth

### Complete Flow

**1. User Registration**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "Password123!",
    "email": "john@example.com"
  }'
```

**2. Login (Get Tokens)**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "Password123!"
  }'

# Response:
# {
#   "accessToken": "eyJhbGci...",
#   "refreshToken": "eyJhbGci...",
#   "tokenType": "Bearer",
#   "expiresIn": 3600000
# }
```

**3. Access Protected Endpoint**
```bash
curl -H "Authorization: Bearer eyJhbGci..." \
  http://localhost:8080/api/invoices

# Response: List of invoices
```

**4. Refresh Token**
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGci..."
  }'

# Response: New access token
```

**5. Logout**
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer eyJhbGci..."
```

## Common Mistakes

### Mistake 1: Storing sensitive data in JWT

```java
// ❌ DON'T store passwords or sensitive data
Map<String, Object> claims = new HashMap<>();
claims.put("password", user.getPassword());  // NEVER!
claims.put("ssn", user.getSsn());            // NEVER!

// ✅ Store only necessary info
Map<String, Object> claims = new HashMap<>();
claims.put("roles", user.getRoles());
claims.put("email", user.getEmail());  // If needed
```

### Mistake 2: Not validating token expiration

```java
// ❌ Only check signature
public boolean validateToken(String token) {
    try {
        getClaims(token);
        return true;
    } catch (JwtException e) {
        return false;
    }
}

// ✅ Check expiration explicitly
public boolean validateToken(String token) {
    try {
        Claims claims = getClaims(token);
        return !claims.getExpiration().before(new Date());
    } catch (JwtException e) {
        return false;
    }
}
```

### Mistake 3: Using weak secret key

```java
// ❌ Too short
private String secret = "secret";

// ✅ At least 256 bits (32 bytes)
private String secret = "your-256-bit-secret-key-make-it-long-and-random-at-least-32-chars";
```

### Mistake 4: Not handling token refresh

```javascript
// ❌ User logged out when token expires
fetch('/api/invoices', {
    headers: { 'Authorization': 'Bearer ' + token }
});
// 401 - user confused why they're logged out

// ✅ Auto-refresh on 401
// Use axios interceptor (shown above)
```

## Self-Check Questions

1. What are the three parts of a JWT?
2. Why can't you revoke a JWT immediately?
3. When do you need CSRF protection with JWT?
4. What's the difference between access token and refresh token?
5. Where should you store JWT in a web app?
6. Why disable CSRF for JWT REST APIs?

<details>
<summary>Answers</summary>

1. Header (algorithm), Payload (claims), Signature (verification)
2. JWT is self-contained and stateless - server doesn't track tokens, so can't invalidate them
3. Only when JWT is stored in cookies (automatically sent). Not needed for Authorization header.
4. Access token: Short-lived (15 min), used for API requests. Refresh token: Long-lived (7 days), used to get new access token
5. httpOnly cookie (best for security) or sessionStorage (acceptable). Avoid localStorage for sensitive apps.
6. JWT in Authorization header is not automatically included in requests (unlike cookies), so no CSRF risk
</details>

## Practice Exercises

### Exercise 1: Implement Complete JWT Auth
- Registration with validation
- Login with access + refresh tokens
- Token refresh endpoint
- Logout with token blacklist

### Exercise 2: Token Rotation
- Generate new refresh token on each use
- Invalidate old refresh token
- Detect token reuse (possible attack)

### Exercise 3: Multi-Device Support
- Allow user to be logged in on multiple devices
- List active sessions
- Revoke specific device/session

### Exercise 4: Security Hardening
- Add rate limiting on login
- Implement account lockout after failed attempts
- Add device fingerprinting
- Monitor suspicious token usage

---

## Navigation

**Prerequisites:**
- [Spring Security Authentication](./01-authentication.md) - User authentication fundamentals
- [Authorization & Access Control](./02-authorization.md) - Role and permission validation
- [REST API Principles](../../spring-boot/03-rest-api.md) - Stateless API design

**Next Topics:**
- [OAuth2 & Social Login](./04-oauth2.md) - OAuth2 tokens and federated authentication
- [Security Best Practices](./05-best-practices.md) - OWASP vulnerabilities and hardening

**Related:**
- [CORS & API Security](../../spring-boot/05-best-practices.md) - Cross-origin and endpoint security
- [Microservices Authentication](../../../04-microservices/04-inter-service-communication.md) - JWT for service-to-service
- [API Gateway Security](../../../04-microservices/01-patterns.md) - Centralized token validation

**Interview Focus:**
- JWT structure (header, payload, signature) and token validation
- Session-based vs stateless token-based authentication trade-offs
- CSRF protection: when needed with JWT vs when not needed
- CORS configuration for APIs and preflight requests
- Token storage security (localStorage, sessionStorage, httpOnly cookies)
- Token refresh strategy and handling 401 responses
- Security vulnerabilities in JWT implementation

**Module Index:** [Spring Security Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
