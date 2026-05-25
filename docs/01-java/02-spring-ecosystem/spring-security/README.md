# Spring Security

## What is Spring Security?

Spring Security is a powerful framework for **authentication** (who are you?) and **authorization** (what can you do?) in Java applications.

**Key idea**: Security should be declarative, not scattered throughout your code.

**Simple analogy**: Nightclub security
- **Authentication**: Checking ID at the door (are you who you say you are?)
- **Authorization**: VIP section access (are you allowed in this area?)
- **Spring Security**: The entire security system (bouncers, access rules, guest lists)

## Learning Path (Study in this order)

```
01. Authentication Basics    ← Login, passwords, user details
    ↓
02. Authorization            ← Roles, permissions, access control
    ↓
03. JWT Authentication       ← Stateless auth for REST APIs
    ↓
04. OAuth2 & Social Login   ← Google/GitHub login, resource servers
    ↓
05. Best Practices          ← Security hardening, common vulnerabilities
```

## Files in this Module

1. **[01-authentication.md](./01-authentication.md)** - Basic auth, form login, user management
2. **[02-authorization.md](./02-authorization.md)** - Role-based and method-level security
3. **[03-jwt.md](./03-jwt.md)** - JWT tokens for stateless REST APIs
4. **[04-oauth2.md](./04-oauth2.md)** - OAuth2, social login, resource servers
5. **[05-best-practices.md](./05-best-practices.md)** - CSRF, XSS, CORS, security headers

## Core Concepts (Quick Overview)

### Authentication vs Authorization

| Aspect | Authentication | Authorization |
|--------|---------------|---------------|
| Question | Who are you? | What can you do? |
| Process | Verify identity | Check permissions |
| Example | Login with username/password | Access admin panel |
| Happens | Once (at login) | Every request |
| Spring Security | AuthenticationManager | AccessDecisionManager |

### Security Filter Chain

Every request goes through a chain of security filters:

```
HTTP Request
    ↓
SecurityContextPersistenceFilter  (load security context)
    ↓
UsernamePasswordAuthenticationFilter  (process login)
    ↓
ExceptionTranslationFilter  (handle security exceptions)
    ↓
FilterSecurityInterceptor  (check authorization)
    ↓
Your Controller
```

### Principal, Credentials, Authorities

```java
// Authentication object contains:
- Principal: Who you are (username, user object)
- Credentials: How you proved it (password)
- Authorities: What you can do (roles, permissions)

// Example:
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();  // Principal
Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();  // ROLE_USER, ROLE_ADMIN
```

## InvoiceManager Security Evolution

### Week 3: Unsecured (Current State)

```java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    @GetMapping
    public List<Invoice> getAll() {
        return service.findAll();  // ❌ Anyone can access!
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);  // ❌ Anyone can delete!
    }
}
```

### Week 3-4: Secured with Spring Security

```java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @GetMapping
    @PreAuthorize("hasRole('USER')")  // ✅ Must be logged in
    public List<Invoice> getAll() {
        // Get current user's invoices only
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        return service.findByUsername(username);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")  // ✅ Admin only
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
```

**Configuration**:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable());  // For REST APIs

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

## Quick Reference

### Common Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@EnableWebSecurity` | Enable Spring Security | On configuration class |
| `@PreAuthorize` | Method-level security | `@PreAuthorize("hasRole('ADMIN')")` |
| `@Secured` | Role check (simpler) | `@Secured("ROLE_ADMIN")` |
| `@RolesAllowed` | JSR-250 standard | `@RolesAllowed("ADMIN")` |
| `@PostAuthorize` | Check after method execution | `@PostAuthorize("returnObject.owner == principal.username")` |
| `@WithMockUser` | Mock user in tests | `@WithMockUser(roles = "ADMIN")` |

### Authority/Role Naming

```java
// Spring Security convention:
- Roles: "ROLE_USER", "ROLE_ADMIN", "ROLE_MANAGER"
- Permissions: "READ_PRIVILEGES", "WRITE_PRIVILEGES"

// In configuration:
hasRole("ADMIN")       // Checks for "ROLE_ADMIN"
hasAuthority("ROLE_ADMIN")  // Checks exact string

// hasRole() automatically prefixes "ROLE_"
// hasAuthority() uses exact match
```

### Password Encoders

| Encoder | Strength | Use Case |
|---------|----------|----------|
| BCryptPasswordEncoder | ✅ Strong (default) | Production - most common |
| SCryptPasswordEncoder | ✅✅ Very strong | High-security requirements |
| Argon2PasswordEncoder | ✅✅✅ Strongest | Maximum security |
| Pbkdf2PasswordEncoder | ✅ Strong | Legacy systems |
| NoOpPasswordEncoder | ❌ NEVER USE | Testing only (deprecated) |

```java
// Production
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);  // strength 10
}

// Maximum security
@Bean
public PasswordEncoder passwordEncoder() {
    return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
}
```

## Common Security Configurations

### 1. Basic Authentication (Simple REST API)

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .anyRequest().authenticated()
        )
        .httpBasic(Customizer.withDefaults())
        .csrf(csrf -> csrf.disable());

    return http.build();
}
```

### 2. Form Login (Traditional Web App)

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/login", "/css/**").permitAll()
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login")
            .defaultSuccessUrl("/dashboard")
            .permitAll()
        )
        .logout(logout -> logout
            .logoutUrl("/logout")
            .logoutSuccessUrl("/login?logout")
        );

    return http.build();
}
```

### 3. JWT Authentication (Modern REST API)

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        )
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        )
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .csrf(csrf -> csrf.disable());

    return http.build();
}
```

## InvoiceManager Security Requirements

By the end of Spring Security module, InvoiceManager will have:

### Authentication
- ✅ User registration with encrypted passwords
- ✅ Login endpoint (username/password → JWT token)
- ✅ Logout functionality
- ✅ Password change

### Authorization
- ✅ USER role: View own invoices, create invoices
- ✅ MANAGER role: View team invoices, approve invoices
- ✅ ADMIN role: All operations, user management
- ✅ Method-level security on service layer

### API Security
- ✅ JWT-based stateless authentication
- ✅ Role-based access control
- ✅ CSRF protection (when needed)
- ✅ CORS configuration
- ✅ Security headers

### Features
```bash
# Public endpoints (no auth)
POST /api/auth/register
POST /api/auth/login

# User endpoints (USER role)
GET /api/invoices/my
POST /api/invoices

# Manager endpoints (MANAGER role)
GET /api/invoices/team
PUT /api/invoices/{id}/approve

# Admin endpoints (ADMIN role)
GET /api/invoices/all
DELETE /api/invoices/{id}
GET /api/users
```

## Prerequisites

Before studying Spring Security, you should know:
- ✅ Spring Boot basics (auto-configuration, REST APIs)
- ✅ HTTP basics (headers, status codes, cookies)
- ✅ Basic security concepts (hashing, encryption)
- ✅ JSON Web Tokens (JWT) - basic understanding

## Common Questions

**Q: When should I use JWT vs sessions?**
A: JWT for stateless REST APIs (mobile apps, SPAs), sessions for traditional web apps

**Q: Do I need to disable CSRF for REST APIs?**
A: Yes, if using JWT. No, if using session-based auth.

**Q: What's the difference between hasRole() and hasAuthority()?**
A: hasRole() auto-prefixes "ROLE_", hasAuthority() is exact match

**Q: Should I store JWT in localStorage or cookie?**
A: Cookie with httpOnly flag is more secure (prevents XSS)

**Q: How do I test secured endpoints?**
A: Use @WithMockUser or @WithUserDetails in tests

## Study Tips

### 1. Understand the Filter Chain
Don't just copy configurations. Understand what each filter does and in what order.

### 2. Start Simple
Begin with basic authentication, then add authorization, then JWT. Don't jump to OAuth2 immediately.

### 3. Practice with InvoiceManager
Secure one endpoint at a time. See how authentication flows through filters.

### 4. Test Security
Write tests for both authorized and unauthorized access. Security bugs are critical!

### 5. Learn Common Vulnerabilities
Understand CSRF, XSS, SQL injection, and how Spring Security protects against them.

## Quick Start Commands

```bash
# Add Spring Security dependency
# (automatically secures all endpoints with default user)

# Default credentials
Username: user
Password: <printed in console on startup>

# Disable default security (for testing)
@SpringBootApplication
@EnableAutoConfiguration(exclude = {SecurityAutoConfiguration.class})
public class Application { }
```

## Security Testing

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldDenyUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/invoices"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldAllowAuthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/invoices"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldDenyAdminEndpoint() throws Exception {
        mockMvc.perform(delete("/api/invoices/1"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldAllowAdminEndpoint() throws Exception {
        mockMvc.perform(delete("/api/invoices/1"))
            .andExpect(status().isNoContent());
    }
}
```

## How This Connects

**Builds on**:
- Spring Boot: Auto-configuration, starters
- Spring Core: Filters, AOP
- REST APIs: Securing HTTP endpoints

**Leads to**:
- Microservices Security: OAuth2, API gateways
- Cloud Security: AWS Cognito, Azure AD
- Advanced Topics: Rate limiting, audit logging

**Interview prep**: Be ready to explain:
- Authentication vs Authorization
- How Spring Security filter chain works
- JWT vs session-based authentication
- Common security vulnerabilities and mitigations
- Role-based vs permission-based access control

---

**Time estimate**: 1 week (assumes Spring Boot knowledge)
**Hands-on project**: Secure InvoiceManager API
**Key skill**: Building secure REST APIs with authentication and authorization

**Next**: [01-authentication.md](./01-authentication.md) - Understanding authentication in Spring Security
