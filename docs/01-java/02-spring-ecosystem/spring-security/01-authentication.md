# Spring Security Authentication

## Before You Start

Can you answer these?
- What is authentication vs authorization?
- What is a password hash and why use it?
- What is HTTP Basic Authentication?

## What is Authentication?

**Simple explanation**: Authentication is proving who you are.

**Real-world analogy**: Airport security
- You show your passport (credentials)
- Security verifies it's really you (authentication)
- You get through security (access granted)

**In Spring Security**:
```
User provides credentials (username + password)
    ↓
Spring Security verifies credentials
    ↓
Creates Authentication object
    ↓
Stores in SecurityContext
    ↓
User is now "logged in"
```

## Authentication Architecture

### Key Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **Authentication** | Represents authentication request/result | Contains principal, credentials, authorities |
| **AuthenticationManager** | Coordinates authentication | Delegates to providers |
| **AuthenticationProvider** | Performs actual authentication | DaoAuthenticationProvider (database) |
| **UserDetailsService** | Loads user from storage | JPA, JDBC, in-memory |
| **PasswordEncoder** | Encodes/matches passwords | BCryptPasswordEncoder |
| **SecurityContext** | Holds authentication for current thread | Thread-local storage |

### Authentication Flow

```
1. User submits credentials (username, password)
   ↓
2. UsernamePasswordAuthenticationFilter intercepts
   ↓
3. Creates Authentication object (unauthenticated)
   ↓
4. AuthenticationManager.authenticate() called
   ↓
5. DaoAuthenticationProvider:
   - Loads user via UserDetailsService
   - Checks password with PasswordEncoder
   ↓
6. If valid: Returns Authentication (authenticated)
   ↓
7. SecurityContext stores Authentication
   ↓
8. User is authenticated for this session
```

**Stop and think**: Why store authentication in SecurityContext instead of a regular variable?

<details>
<summary>Answer</summary>

SecurityContext uses ThreadLocal, so each thread (each HTTP request) has its own isolated authentication. This prevents one user's authentication from affecting another user's request in a multi-threaded web server.
</details>

## Adding Spring Security

### Step 1: Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

**What happens immediately**:
- ALL endpoints are secured
- Default user: `user`
- Random password printed in console:
  ```
  Using generated security password: 8e557245-73e2-4286-969a-ff57fe326336
  ```
- Login form auto-generated at `/login`

### Step 2: Test Default Security

```bash
# Try to access endpoint - DENIED
curl http://localhost:8080/api/invoices
# Response: 401 Unauthorized

# Login with default credentials
curl -u user:8e557245-73e2-4286-969a-ff57fe326336 http://localhost:8080/api/invoices
# Response: 200 OK
```

## Basic Security Configuration

### In-Memory Users (Development Only)

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails user = User.builder()
            .username("john")
            .password(passwordEncoder().encode("password123"))
            .roles("USER")
            .build();

        UserDetails admin = User.builder()
            .username("admin")
            .password(passwordEncoder().encode("admin123"))
            .roles("ADMIN")
            .build();

        return new InMemoryUserDetailsManager(user, admin);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**Try it**:
```bash
# Login as user
curl -u john:password123 http://localhost:8080/api/invoices

# Login as admin
curl -u admin:admin123 http://localhost:8080/api/invoices
```

## Password Encoding

### Why Encode Passwords?

**DON'T store plain text**:
```java
// ❌ NEVER DO THIS
User user = new User();
user.setPassword("password123");  // Stored as-is in database
```

**If database is compromised**:
- Attacker gets all passwords
- Can use them on other sites (password reuse)
- Complete security breach

**DO hash passwords**:
```java
// ✅ ALWAYS DO THIS
User user = new User();
user.setPassword(passwordEncoder.encode("password123"));
// Stored: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**If database is compromised**:
- Attacker gets hashes, not passwords
- Can't reverse the hash
- Each password has unique hash (salt)

### BCrypt Password Encoder

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);  // strength: 10 (default)
}

// Usage
String rawPassword = "password123";
String encoded = passwordEncoder.encode(rawPassword);
// Result: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// Verify password
boolean matches = passwordEncoder.matches("password123", encoded);  // true
boolean matches = passwordEncoder.matches("wrongpass", encoded);    // false
```

**BCrypt features**:
- Includes random salt (same password → different hashes)
- Configurable strength (higher = slower but more secure)
- Industry standard for password hashing

**Example - same password, different hashes**:
```java
String password = "password123";
String hash1 = encoder.encode(password);
String hash2 = encoder.encode(password);
// hash1 != hash2 (different salts)
// But both match the original password
```

### Choosing Password Encoder

```java
// Good - Default choice
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

// Better - Higher security
@Bean
public PasswordEncoder passwordEncoder() {
    return new SCryptPasswordEncoder();
}

// Best - Maximum security (slower)
@Bean
public PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
}

// ❌ NEVER in production
@Bean
public PasswordEncoder passwordEncoder() {
    return NoOpPasswordEncoder.getInstance();  // DEPRECATED
}
```

## Database Authentication

### Step 1: User Entity

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;  // Encoded password

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private boolean accountNonExpired = true;

    @Column(nullable = false)
    private boolean accountNonLocked = true;

    @Column(nullable = false)
    private boolean credentialsNonExpired = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    // Getters and setters
}
```

### Step 2: Role Entity

```java
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;  // ROLE_USER, ROLE_ADMIN

    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();

    // Getters and setters
}
```

### Step 3: UserRepository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```

### Step 4: Custom UserDetailsService

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password(user.getPassword())  // Already encoded
            .authorities(getAuthorities(user))
            .accountExpired(!user.isAccountNonExpired())
            .accountLocked(!user.isAccountNonLocked())
            .credentialsExpired(!user.isCredentialsNonExpired())
            .disabled(!user.isEnabled())
            .build();
    }

    private Collection<? extends GrantedAuthority> getAuthorities(User user) {
        return user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority(role.getName()))
            .collect(Collectors.toSet());
    }
}
```

### Step 5: Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    public SecurityConfig(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());

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
}
```

## User Registration

### Registration Request DTO

```java
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Email is required")
    @Email
    private String email;

    // Getters and setters
}
```

### Registration Service

```java
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                      RoleRepository roleRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequest request) {
        // Validate username doesn't exist
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UsernameAlreadyExistsException(request.getUsername());
        }

        // Validate email doesn't exist
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setEnabled(true);

        // Assign default role
        Role userRole = roleRepository.findByName("ROLE_USER")
            .orElseThrow(() -> new RuntimeException("Role not found"));
        user.getRoles().add(userRole);

        return userRepository.save(user);
    }
}
```

### Registration Controller

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new UserResponse(user.getId(), user.getUsername(), user.getEmail()));
    }
}
```

**Test registration**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123",
    "email": "john@example.com"
  }'

# Response: 201 Created
# {
#   "id": 1,
#   "username": "john",
#   "email": "john@example.com"
# }
```

## Session-Based Authentication

### How Sessions Work

```
1. User logs in with credentials
   ↓
2. Server validates credentials
   ↓
3. Server creates session
   ↓
4. Server stores session ID in cookie
   ↓
5. Browser sends cookie with every request
   ↓
6. Server looks up session by ID
   ↓
7. User is authenticated
```

**Session storage**:
- In-memory (default, lost on restart)
- Database (persistent across restarts)
- Redis (distributed sessions)

### Form Login Configuration

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/login", "/register", "/css/**").permitAll()
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login")              // Custom login page
            .loginProcessingUrl("/perform-login")  // Form submission URL
            .defaultSuccessUrl("/dashboard", true)
            .failureUrl("/login?error=true")
            .permitAll()
        )
        .logout(logout -> logout
            .logoutUrl("/logout")
            .logoutSuccessUrl("/login?logout=true")
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID")
        )
        .sessionManagement(session -> session
            .maximumSessions(1)  // Only one session per user
            .maxSessionsPreventsLogin(true)  // New login kicks out old session
        );

    return http.build();
}
```

### Session Configuration

```yaml
server:
  servlet:
    session:
      timeout: 30m           # Session expires after 30 minutes of inactivity
      cookie:
        http-only: true      # Prevent JavaScript access (XSS protection)
        secure: true         # Only send over HTTPS (production)
        same-site: strict    # CSRF protection
```

### Session in Code

```java
@GetMapping("/current-user")
public String getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth.getName();  // Username of logged-in user
}

@GetMapping("/dashboard")
public String dashboard(Principal principal) {
    // Spring injects Principal
    return "Welcome, " + principal.getName();
}

@GetMapping("/profile")
public String profile(@AuthenticationPrincipal UserDetails userDetails) {
    // Spring injects UserDetails
    return "Email: " + userDetails.getUsername();
}
```

## HTTP Basic Authentication

### What is Basic Auth?

```
Authorization: Basic base64(username:password)
```

**Example**:
```bash
# Username: john, Password: password123
# base64("john:password123") = am9objpwYXNzd29yZDEyMw==

curl -H "Authorization: Basic am9objpwYXNzd29yZDEyMw==" http://localhost:8080/api/invoices

# Or use -u flag (easier)
curl -u john:password123 http://localhost:8080/api/invoices
```

### Basic Auth Configuration

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        )
        .httpBasic(basic -> basic
            .realmName("Invoice Manager")
            .authenticationEntryPoint(customAuthEntryPoint)
        )
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

    return http.build();
}
```

### Custom Authentication Entry Point

```java
@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                        HttpServletResponse response,
                        AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("""
            {
              "error": "Unauthorized",
              "message": "Invalid credentials",
              "timestamp": "%s"
            }
            """.formatted(Instant.now()));
    }
}
```

## Build-Along Project: InvoiceManager Authentication

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    account_non_expired BOOLEAN DEFAULT TRUE,
    account_non_locked BOOLEAN DEFAULT TRUE,
    credentials_non_expired BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- User-Role junction table
CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER'), ('ROLE_MANAGER'), ('ROLE_ADMIN');

-- Link invoices to users
ALTER TABLE invoices ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
```

### Complete Authentication Setup

**1. User and Role Entities** (shown above)

**2. Repositories**:
```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
}
```

**3. UserDetailsService Implementation** (shown above)

**4. Auth Service**:
```java
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public User register(RegisterRequest request) {
        // Implementation shown above
    }

    public Authentication login(LoginRequest request) {
        try {
            return authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );
        } catch (BadCredentialsException e) {
            throw new InvalidCredentialsException("Invalid username or password");
        }
    }
}
```

**5. Auth Controller**:
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(UserResponse.from(user));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authService.login(request);
        SecurityContextHolder.getContext().setAuthentication(auth);
        return ResponseEntity.ok(new LoginResponse("Login successful", auth.getName()));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok("Logout successful");
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new UserNotFoundException(userDetails.getUsername()));
        return ResponseEntity.ok(UserResponse.from(user));
    }
}
```

### Testing Authentication

```bash
# 1. Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123",
    "email": "john@example.com"
  }'

# 2. Login (Basic Auth)
curl -u john:password123 http://localhost:8080/api/auth/me

# 3. Access protected endpoint
curl -u john:password123 http://localhost:8080/api/invoices

# 4. Wrong password - should fail
curl -u john:wrongpassword http://localhost:8080/api/invoices
# Response: 401 Unauthorized
```

## Common Mistakes

### Mistake 1: Storing plain text passwords

```java
// ❌ NEVER
user.setPassword(request.getPassword());

// ✅ ALWAYS encode
user.setPassword(passwordEncoder.encode(request.getPassword()));
```

### Mistake 2: Not handling authentication exceptions

```java
// ❌ No error handling
authenticationManager.authenticate(token);

// ✅ Proper handling
try {
    authenticationManager.authenticate(token);
} catch (BadCredentialsException e) {
    throw new InvalidCredentialsException("Invalid credentials");
} catch (DisabledException e) {
    throw new AccountDisabledException("Account is disabled");
} catch (LockedException e) {
    throw new AccountLockedException("Account is locked");
}
```

### Mistake 3: Exposing password in API responses

```java
// ❌ DON'T return User entity directly
@GetMapping("/me")
public User getCurrentUser() {
    return userRepository.findByUsername(username);  // Includes password!
}

// ✅ Use DTO
@GetMapping("/me")
public UserResponse getCurrentUser() {
    User user = userRepository.findByUsername(username);
    return new UserResponse(user.getId(), user.getUsername(), user.getEmail());
}
```

### Mistake 4: Not configuring session timeout

```yaml
# ❌ Default (too long)

# ✅ Set appropriate timeout
server:
  servlet:
    session:
      timeout: 30m
```

### Mistake 5: Using weak passwords

```java
// ✅ Validate password strength
@NotBlank
@Size(min = 8, message = "Password must be at least 8 characters")
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
         message = "Password must contain uppercase, lowercase, and digit")
private String password;
```

## Self-Check Questions

1. What's the difference between authentication and authorization?
2. Why use BCrypt instead of plain text passwords?
3. What is SecurityContext and why is it thread-local?
4. What does UserDetailsService do?
5. What's the difference between session-based and token-based auth?
6. How does HTTP Basic Authentication work?

<details>
<summary>Answers</summary>

1. Authentication = who you are, Authorization = what you can do
2. BCrypt is one-way hash with salt, can't be reversed, protects if database breached
3. SecurityContext holds authentication for current thread, each HTTP request gets isolated context
4. UserDetailsService loads user data from database/storage for authentication
5. Session: Server stores state in session, client sends session ID cookie. Token: Client stores token, server is stateless
6. Sends `Authorization: Basic base64(username:password)` header with each request
</details>

## Practice Exercises

### Exercise 1: Complete Registration
Implement full user registration with:
- Username/email uniqueness validation
- Password strength validation
- Email verification (send email with token)

### Exercise 2: Password Change
Add endpoint for changing password:
- Verify old password
- Validate new password
- Encode new password

### Exercise 3: Account Lockout
Implement account lockout after 5 failed login attempts:
- Track failed attempts
- Lock account for 30 minutes
- Reset counter on successful login

### Exercise 4: Remember Me
Add "Remember Me" functionality:
- Long-lived cookie (30 days)
- Token-based persistence

---

## Navigation

**Prerequisites:**
- [Spring Boot REST API](../../spring-boot/03-rest-api.md) - Understanding REST endpoints
- [Spring Core Configuration](../../spring-core/03-configuration.md) - Bean configuration
- [Bean Lifecycle](../../spring-core/02-bean-lifecycle-scopes.md) - Filter chain and proxies

**Next Topics:**
- [Authorization & Access Control](./02-authorization.md) - Role-based and method-level security
- [JWT Implementation](./03-jwt.md) - Stateless token-based authentication

**Related:**
- [OAuth2 & OpenID Connect](./04-oauth2.md) - Third-party authentication (Google, GitHub)
- [Security Best Practices](./05-best-practices.md) - OWASP Top 10, secrets management
- [Spring Boot Security](../../spring-boot/05-best-practices.md) - Securing Spring Boot applications

**Interview Focus:**
- Authentication flow in Spring Security (filter chain)
- Why and how to hash passwords (BCrypt, Argon2)
- Session-based vs token-based authentication trade-offs
- UserDetailsService and PasswordEncoder roles
- Common vulnerabilities (brute force, credential stuffing, session fixation)

**Module Index:** [Spring Security Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
