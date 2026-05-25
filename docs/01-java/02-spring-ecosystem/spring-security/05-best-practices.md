# Spring Security Best Practices

## Before You Start

This file covers production-ready security. You should have completed files 01-04.

## OWASP Top 10 (2021) and Spring Security

### 1. Broken Access Control

**Problem**: Users can access resources they shouldn't.

**Examples**:
```java
// ❌ No authorization check
@GetMapping("/api/invoices/{id}")
public Invoice getInvoice(@PathVariable Long id) {
    return invoiceService.findById(id);
    // Any authenticated user can view ANY invoice!
}

// ❌ Client-side only checks
// JavaScript hides delete button for non-admins
// But API endpoint has no protection!
@DeleteMapping("/api/invoices/{id}")
public void delete(@PathVariable Long id) {
    invoiceService.delete(id);
}
```

**Spring Security Protection**:
```java
// ✅ URL-based authorization
http.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
    .anyRequest().authenticated()
);

// ✅ Method-level authorization
@PreAuthorize("@invoiceSecurityService.canAccess(#id, authentication)")
public Invoice getInvoice(Long id) {
    return invoiceService.findById(id);
}

// ✅ Ownership check
@PreAuthorize("hasRole('ADMIN') or @invoiceService.isOwner(#id, authentication.name)")
public void delete(Long id) {
    invoiceService.delete(id);
}
```

**Best practices**:
- Default deny (whitelist approach)
- Check authorization on every request
- Server-side validation (never trust client)
- Use method-level security as second layer
- Log access denied attempts

### 2. Cryptographic Failures

**Problem**: Sensitive data exposed due to weak crypto.

**Examples**:
```java
// ❌ Plain text passwords
user.setPassword(request.getPassword());

// ❌ Weak hashing
String hash = MD5.hash(password);  // MD5 is broken

// ❌ Custom crypto
String encrypted = myCustomEncrypt(data);  // Don't roll your own
```

**Spring Security Protection**:
```java
// ✅ Strong password hashing
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // Or Argon2
}

user.setPassword(passwordEncoder.encode(request.getPassword()));

// ✅ Encrypt sensitive data at rest
@Configuration
public class EncryptionConfig {

    @Bean
    public TextEncryptor textEncryptor() {
        return Encryptors.text(
            env.getProperty("ENCRYPTION_PASSWORD"),
            env.getProperty("ENCRYPTION_SALT")
        );
    }
}

// Use for sensitive fields
String encrypted = textEncryptor.encrypt(user.getSsn());
user.setEncryptedSsn(encrypted);
```

**Best practices**:
- Use BCrypt, SCrypt, or Argon2 for passwords
- HTTPS in production (TLS 1.2+)
- Encrypt sensitive data at rest
- Secure key management (AWS KMS, HashiCorp Vault)
- Never commit secrets to version control

### 3. Injection (SQL, NoSQL, Command)

**Problem**: Untrusted data sent to interpreter.

**SQL Injection**:
```java
// ❌ String concatenation
@Query(value = "SELECT * FROM users WHERE username = '" + username + "'",
       nativeQuery = true)
User findByUsername(String username);
// Input: admin' OR '1'='1
// Query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
// Result: Returns all users!

// ❌ Dynamic query building
String query = "SELECT * FROM invoices WHERE status = '" + status + "'";
entityManager.createNativeQuery(query);
```

**Spring Security Protection**:
```java
// ✅ Parameterized queries (JPA)
@Query("SELECT u FROM User u WHERE u.username = :username")
User findByUsername(@Param("username") String username);

// ✅ Native query with parameters
@Query(value = "SELECT * FROM users WHERE username = ?1", nativeQuery = true)
User findByUsername(String username);

// ✅ Criteria API
CriteriaBuilder cb = entityManager.getCriteriaBuilder();
CriteriaQuery<User> query = cb.createQuery(User.class);
Root<User> root = query.from(User.class);
query.where(cb.equal(root.get("username"), username));
```

**Command Injection**:
```java
// ❌ Executing system commands with user input
Runtime.getRuntime().exec("ls " + userInput);

// ✅ Avoid system commands, or use whitelist
Set<String> allowedCommands = Set.of("status", "version");
if (!allowedCommands.contains(command)) {
    throw new IllegalArgumentException("Invalid command");
}
```

**Best practices**:
- Always use parameterized queries
- Use ORM (JPA) instead of raw SQL
- Validate and sanitize ALL user input
- Use whitelist approach for allowed values
- Never execute system commands with user input

### 4. Insecure Design

**Problem**: Missing or ineffective security controls.

**Examples**:
```java
// ❌ No rate limiting on login
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    // Attacker can brute force passwords
}

// ❌ No account lockout
// Unlimited login attempts allowed

// ❌ Weak password policy
@Size(min = 4)  // Too short!
private String password;
```

**Spring Security Protection**:
```java
// ✅ Rate limiting with Bucket4j
@Service
public class RateLimitService {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean allowRequest(String key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
            return Bucket.builder().addLimit(limit).build();
        });

        return bucket.tryConsume(1);
    }
}

@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    String clientIp = httpRequest.getRemoteAddr();

    if (!rateLimitService.allowRequest(clientIp)) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body("Too many login attempts");
    }

    // Process login
}

// ✅ Account lockout after failed attempts
@Service
public class LoginAttemptService {

    private final Map<String, Integer> attempts = new ConcurrentHashMap<>();

    public void loginSucceeded(String username) {
        attempts.remove(username);
    }

    public void loginFailed(String username) {
        attempts.merge(username, 1, Integer::sum);

        if (attempts.get(username) >= 5) {
            // Lock account
            userService.lockAccount(username, Duration.ofMinutes(30));
        }
    }

    public boolean isBlocked(String username) {
        return attempts.getOrDefault(username, 0) >= 5;
    }
}

// ✅ Strong password policy
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$",
         message = "Password must be 12+ chars with uppercase, lowercase, digit, and special char")
private String password;
```

**Best practices**:
- Implement rate limiting (login, API calls)
- Account lockout after failed attempts
- Strong password policy (length, complexity)
- Multi-factor authentication (MFA)
- Session timeout
- Security by default (fail closed, not open)

### 5. Security Misconfiguration

**Problem**: Insecure default settings, incomplete setup.

**Examples**:
```java
// ❌ Debug mode in production
logging.level.root=DEBUG
spring.jpa.show-sql=true

// ❌ Detailed error messages
@ExceptionHandler(Exception.class)
public String handleError(Exception e) {
    return e.getMessage() + "\n" + e.getStackTrace();
    // Exposes internal structure!
}

// ❌ Default credentials
spring.security.user.name=admin
spring.security.user.password=admin

// ❌ Unnecessary endpoints exposed
management.endpoints.web.exposure.include=*
```

**Spring Security Protection**:
```yaml
# ✅ Production configuration
spring:
  profiles:
    active: prod

  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate

logging:
  level:
    root: WARN
    com.example: INFO

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics  # Only necessary endpoints

server:
  error:
    include-stacktrace: never
    include-message: never
```

```java
// ✅ Generic error messages
@ExceptionHandler(Exception.class)
public ProblemDetail handleError(Exception e) {
    log.error("Error occurred", e);  // Log details server-side

    return ProblemDetail.forStatusAndDetail(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "An error occurred"  // Generic message to client
    );
}
```

**Best practices**:
- Disable debug mode in production
- Generic error messages to users
- Remove default credentials
- Disable unnecessary features
- Regular security audits
- Keep dependencies updated

### 6. Vulnerable and Outdated Components

**Problem**: Using components with known vulnerabilities.

**Detection**:
```bash
# Check for vulnerabilities
mvn dependency-check:check

# Or use OWASP Dependency-Check
mvn org.owasp:dependency-check-maven:check
```

**Spring Boot helps**:
```xml
<!-- ✅ Spring Boot manages versions -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<!-- Automatically gets compatible, patched versions -->
```

**Best practices**:
- Use Spring Boot dependency management
- Regular dependency updates
- Automated vulnerability scanning (CI/CD)
- Subscribe to security advisories
- Remove unused dependencies

### 7. Identification and Authentication Failures

**Problem**: Weak authentication allows attackers to impersonate users.

**Examples**:
```java
// ❌ Weak password requirements
@Size(min = 4)
private String password;

// ❌ No MFA
// ❌ Predictable session IDs
// ❌ URL contains session ID
```

**Spring Security Protection**:
```java
// ✅ Strong password requirements (shown above)

// ✅ Secure session management
server:
  servlet:
    session:
      cookie:
        http-only: true
        secure: true
        same-site: strict
      timeout: 30m

// ✅ Session fixation protection (enabled by default)
http.sessionManagement(session -> session
    .sessionFixation().migrateSession()  // Generate new session ID after login
);

// ✅ Concurrent session control
http.sessionManagement(session -> session
    .maximumSessions(1)
    .maxSessionsPreventsLogin(true)
);
```

**Best practices**:
- Strong password policy
- Multi-factor authentication
- Session timeout
- Secure session cookies
- Session fixation protection
- Monitor for credential stuffing attacks

### 8. Software and Data Integrity Failures

**Problem**: Unverified code/data from untrusted sources.

**Examples**:
```java
// ❌ Deserializing untrusted data
ObjectInputStream ois = new ObjectInputStream(userInput);
Object obj = ois.readObject();  // Remote code execution risk!

// ❌ Using unsigned JARs
// ❌ No CI/CD pipeline validation
```

**Spring Security Protection**:
```java
// ✅ Use JSON instead of Java serialization
@RestController
public class InvoiceController {
    @PostMapping
    public Invoice create(@RequestBody Invoice invoice) {
        // Spring uses Jackson (JSON) - safer than Java serialization
    }
}

// ✅ Verify dependencies
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-checksums</id>
            <goals>
                <goal>enforce</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

**Best practices**:
- Use JSON/XML instead of Java serialization
- Verify dependency checksums
- Sign and verify JAR files
- Use trusted registries only
- Implement CI/CD with security checks

### 9. Security Logging and Monitoring Failures

**Problem**: Insufficient logging allows breaches to go undetected.

**Examples**:
```java
// ❌ No logging
public void delete(Long id) {
    invoiceService.delete(id);
}

// ❌ Logging sensitive data
log.info("User logged in: {} with password {}", username, password);

// ❌ No monitoring
```

**Spring Security Protection**:
```java
// ✅ Security event logging
@Component
public class SecurityEventListener {

    @EventListener
    public void onAuthenticationSuccess(AuthenticationSuccessEvent event) {
        String username = event.getAuthentication().getName();
        log.info("Successful login: user={}", username);
    }

    @EventListener
    public void onAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        Exception exception = event.getException();
        log.warn("Failed login: user={}, reason={}", username, exception.getMessage());
    }

    @EventListener
    public void onAuthorizationFailure(AuthorizationDeniedEvent event) {
        Authentication auth = event.getAuthentication().get();
        log.warn("Access denied: user={}, resource={}",
            auth.getName(),
            event.getAuthorizationDecision());
    }
}

// ✅ Audit logging
@Aspect
@Component
public class AuditAspect {

    @AfterReturning("@annotation(Audited)")
    public void logAuditEvent(JoinPoint joinPoint) {
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        String method = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        log.info("AUDIT: user={}, action={}, args={}",
            username, method, Arrays.toString(args));
    }
}

// Usage
@Audited
@PreAuthorize("hasRole('ADMIN')")
public void deleteInvoice(Long id) {
    // Automatically logged
}
```

**Best practices**:
- Log all authentication events (success/failure)
- Log authorization failures
- Log administrative actions
- Don't log sensitive data (passwords, tokens, PII)
- Centralized logging (ELK, Splunk)
- Real-time alerting on suspicious activity
- Regular log review

### 10. Server-Side Request Forgery (SSRF)

**Problem**: Application makes requests to attacker-controlled URLs.

**Examples**:
```java
// ❌ Fetching user-provided URL
@GetMapping("/fetch")
public String fetchUrl(@RequestParam String url) {
    RestTemplate restTemplate = new RestTemplate();
    return restTemplate.getForObject(url, String.class);
    // Attacker can access internal services:
    // http://localhost:8080/admin
    // http://169.254.169.254/latest/meta-data/  (AWS metadata)
}
```

**Spring Security Protection**:
```java
// ✅ Whitelist allowed domains
@Service
public class UrlFetchService {

    private static final Set<String> ALLOWED_DOMAINS = Set.of(
        "api.example.com",
        "data.example.com"
    );

    public String fetchUrl(String url) {
        try {
            URL urlObj = new URL(url);
            String host = urlObj.getHost();

            if (!ALLOWED_DOMAINS.contains(host)) {
                throw new IllegalArgumentException("Domain not allowed");
            }

            // Additional checks
            InetAddress address = InetAddress.getByName(host);
            if (address.isLoopbackAddress() || address.isLinkLocalAddress()) {
                throw new IllegalArgumentException("Cannot access internal addresses");
            }

            RestTemplate restTemplate = new RestTemplate();
            return restTemplate.getForObject(url, String.class);

        } catch (Exception e) {
            throw new RuntimeException("Invalid URL", e);
        }
    }
}
```

**Best practices**:
- Whitelist allowed domains
- Block private IP ranges
- Validate and sanitize URLs
- Use network segmentation
- Disable unnecessary URL schemes (file://, gopher://)

## Additional Security Best Practices

### XSS (Cross-Site Scripting) Protection

**Problem**: Malicious scripts injected into web pages.

**Types**:
1. Reflected XSS: Script in URL, reflected in response
2. Stored XSS: Script stored in database, displayed to users
3. DOM-based XSS: Script manipulates DOM client-side

**Spring Security Protection**:
```java
// ✅ Content Security Policy
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'; script-src 'self' https://trusted.com")
    )
);

// ✅ X-XSS-Protection header (legacy, CSP preferred)
http.headers(headers -> headers
    .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
);

// ✅ Escape output in templates (Thymeleaf does automatically)
<p th:text="${userInput}"></p>  <!-- Automatically escaped -->

// ✅ For REST APIs returning JSON
// Jackson escapes HTML by default
@RestController
public class InvoiceController {
    @GetMapping("/{id}")
    public Invoice getInvoice(@PathVariable Long id) {
        return invoiceService.findById(id);
        // If invoice.description contains <script>, it's escaped in JSON
    }
}
```

**Best practices**:
- Content Security Policy (CSP)
- Escape output (context-aware)
- Validate and sanitize input
- Use httpOnly cookies
- X-Content-Type-Options: nosniff

### Clickjacking Protection

**Problem**: Malicious site embeds your site in iframe, tricks users into clicking.

**Spring Security Protection**:
```java
// ✅ X-Frame-Options (default: DENY)
http.headers(headers -> headers
    .frameOptions(frame -> frame
        .sameOrigin()  // Allow framing from same origin only
        // .deny()  // Block all framing
    )
);
```

### Security Headers

**Complete configuration**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            // Prevent MIME sniffing
            .contentTypeOptions(Customizer.withDefaults())

            // Clickjacking protection
            .frameOptions(frame -> frame.deny())

            // XSS protection (legacy)
            .xssProtection(xss -> xss.headerValue(
                XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))

            // Force HTTPS
            .httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .maxAgeInSeconds(31536000))  // 1 year

            // Content Security Policy
            .contentSecurityPolicy(csp -> csp
                .policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline' https://trusted.com; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: https:; " +
                    "font-src 'self'; " +
                    "connect-src 'self'; " +
                    "frame-ancestors 'none'"
                ))

            // Referrer Policy
            .referrerPolicy(referrer -> referrer
                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))

            // Permissions Policy
            .permissionsPolicy(permissions -> permissions
                .policy("geolocation=(), camera=(), microphone=()"))
        );

    return http.build();
}
```

**Response headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

### Password Security

**Complete implementation**:
```java
@Service
public class PasswordService {

    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;

    // Validate password strength
    public void validatePassword(String password) {
        if (password.length() < 12) {
            throw new WeakPasswordException("Password must be at least 12 characters");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new WeakPasswordException("Password must contain uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new WeakPasswordException("Password must contain lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            throw new WeakPasswordException("Password must contain digit");
        }

        if (!password.matches(".*[@$!%*?&].*")) {
            throw new WeakPasswordException("Password must contain special character");
        }

        // Check against common passwords
        if (isCommonPassword(password)) {
            throw new WeakPasswordException("Password is too common");
        }
    }

    // Check for breached passwords (Have I Been Pwned API)
    public boolean isBreachedPassword(String password) {
        String sha1 = DigestUtils.sha1Hex(password).toUpperCase();
        String prefix = sha1.substring(0, 5);
        String suffix = sha1.substring(5);

        try {
            String response = restTemplate.getForObject(
                "https://api.pwnedpasswords.com/range/" + prefix,
                String.class
            );

            return response != null && response.contains(suffix);
        } catch (Exception e) {
            log.error("Failed to check breached password", e);
            return false;  // Fail open
        }
    }

    // Password history (prevent reuse)
    public void checkPasswordHistory(User user, String newPassword) {
        List<String> passwordHistory = user.getPasswordHistory();

        for (String oldPassword : passwordHistory) {
            if (passwordEncoder.matches(newPassword, oldPassword)) {
                throw new PasswordReuseException("Cannot reuse recent passwords");
            }
        }
    }

    // Store password securely
    public void changePassword(User user, String newPassword) {
        validatePassword(newPassword);

        if (isBreachedPassword(newPassword)) {
            throw new BreachedPasswordException("Password found in data breach");
        }

        checkPasswordHistory(user, newPassword);

        String encoded = passwordEncoder.encode(newPassword);
        user.setPassword(encoded);

        // Add to history
        user.getPasswordHistory().add(0, encoded);
        if (user.getPasswordHistory().size() > 5) {
            user.getPasswordHistory().remove(5);  // Keep last 5
        }

        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
    }
}
```

### Session Security

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .sessionManagement(session -> session
            // Create session only if required
            .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)

            // Session fixation protection
            .sessionFixation().migrateSession()

            // Concurrent session control
            .maximumSessions(1)
            .maxSessionsPreventsLogin(true)  // Or false to kick out old session
            .expiredUrl("/login?expired=true")
        );

    return http.build();
}
```

```yaml
server:
  servlet:
    session:
      timeout: 30m
      cookie:
        name: JSESSIONID
        http-only: true
        secure: true
        same-site: strict
        path: /
```

## Production Security Checklist

### Configuration
- [ ] HTTPS enabled (TLS 1.2+)
- [ ] Security headers configured
- [ ] CSRF protection (if using sessions)
- [ ] CORS properly configured
- [ ] Debug mode disabled
- [ ] Generic error messages
- [ ] Secrets in environment variables

### Authentication
- [ ] Strong password policy (12+ chars, complexity)
- [ ] Password hashing (BCrypt/Argon2)
- [ ] Account lockout after failed attempts
- [ ] Rate limiting on login endpoint
- [ ] Session timeout configured
- [ ] Session fixation protection
- [ ] Multi-factor authentication (MFA)
- [ ] Password history (prevent reuse)

### Authorization
- [ ] Default deny policy
- [ ] Method-level security enabled
- [ ] Authorization on every endpoint
- [ ] Ownership checks for resources
- [ ] Role hierarchy configured
- [ ] Least privilege principle

### Input Validation
- [ ] All input validated and sanitized
- [ ] Parameterized queries (no SQL injection)
- [ ] File upload restrictions
- [ ] Request size limits
- [ ] Content-Type validation

### Logging & Monitoring
- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Administrative actions logged
- [ ] Sensitive data NOT logged
- [ ] Centralized logging
- [ ] Real-time alerting
- [ ] Log retention policy

### Dependencies
- [ ] All dependencies up to date
- [ ] Vulnerability scanning enabled
- [ ] No known vulnerabilities
- [ ] Unused dependencies removed

### Testing
- [ ] Security tests written
- [ ] Penetration testing performed
- [ ] Security code review completed
- [ ] Automated security scanning (CI/CD)

## Self-Check Questions

1. What are the OWASP Top 10 vulnerabilities?
2. How does Spring Security prevent SQL injection?
3. What headers prevent XSS attacks?
4. What's the difference between CSRF and XSS?
5. Why use BCrypt instead of MD5 for passwords?
6. What security headers should every app have?

<details>
<summary>Answers</summary>

1. Access Control, Crypto Failures, Injection, Insecure Design, Misconfiguration, Vulnerable Components, Auth Failures, Integrity Failures, Logging Failures, SSRF
2. JPA uses parameterized queries by default (PreparedStatements)
3. Content-Security-Policy, X-XSS-Protection, X-Content-Type-Options
4. CSRF: Tricks browser into sending unwanted request. XSS: Injects malicious script into page
5. BCrypt is slow (defeats brute force), has salt (prevents rainbow tables), one-way (can't reverse)
6. X-Content-Type-Options, X-Frame-Options, HSTS, CSP, X-XSS-Protection, Referrer-Policy
</details>

## Practice Exercises

### Exercise 1: Security Audit
- Run OWASP Dependency Check
- Fix all HIGH/CRITICAL vulnerabilities
- Configure all security headers
- Enable security logging

### Exercise 2: Penetration Testing
- Test for SQL injection
- Test for XSS
- Test for CSRF
- Test for broken access control
- Test for session hijacking

### Exercise 3: Security Hardening
- Implement rate limiting
- Add account lockout
- Enable MFA
- Implement audit logging
- Add security monitoring

### Exercise 4: Secure Password Management
- Password strength validation
- Check against breached passwords (HIBP API)
- Password history
- Force password change after N days

## How This Connects

**Builds on**:
- All previous Spring Security files
- OWASP guidelines
- Security best practices

**Leads to**:
- Production deployment
- Security certifications (SOC 2, ISO 27001)
- Compliance (GDPR, HIPAA, PCI-DSS)

**Interview prep**: Be ready to explain:
- OWASP Top 10 and mitigations
- Defense in depth strategy
- Secure SDLC practices
- Common web vulnerabilities
- Security headers and their purpose
- Password security best practices

---

## Navigation

**Prerequisites:**
- [Spring Security Authentication](./01-authentication.md) - User login and password hashing
- [Authorization & Access Control](./02-authorization.md) - Role-based and method-level security
- [JWT Implementation](./03-jwt.md) - Token-based authentication and CORS/CSRF concepts
- [OAuth2 & Social Login](./04-oauth2.md) - Third-party authentication and authorization

**Next Topics:**
- [API Security](../../spring-boot/05-best-practices.md) - Applying security headers and validation
- [Microservices Security](../../../04-microservices/04-inter-service-communication.md) - OAuth2 between services
- [Compliance & Auditing](../../../05-devops/01-monitoring-logging.md) - Security logging and regulatory requirements

**Related:**
- [OWASP Top 10](./README.md) - Industry security standards
- [Secure SDLC](../../../05-devops/03-ci-cd-pipeline.md) - Security in development pipeline
- [Penetration Testing](./README.md) - Security testing techniques

**Interview Focus:**
- OWASP Top 10 (2021): Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration
- Defense in depth strategy: multiple security layers
- SQL injection prevention (parameterized queries, ORM)
- XSS protection (Content Security Policy, output escaping)
- CSRF protection (state parameter, SameSite cookies)
- Password security (BCrypt/Argon2, strength validation, breach checking)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Logging and monitoring without exposing sensitive data
- Production security checklist and secure configuration
- Common mistakes and anti-patterns

**Module Index:** [Spring Security Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)

---

## Congratulations!

You've completed the Spring Security module and now understand:
- **Authentication**: Passwords, sessions, JWT, and OAuth2/OIDC flows
- **Authorization**: Role-based, permission-based, and method-level security
- **API Security**: CSRF, CORS, rate limiting, and input validation
- **Vulnerabilities**: OWASP Top 10, XSS, SQL injection, and mitigations
- **Production Hardening**: Security headers, logging, monitoring, and compliance

**Next Steps**:
- Apply comprehensive security to InvoiceManager
- Implement security testing and penetration testing
- Get security certified (OWASP Certified, CISSP)
- Study compliance requirements (GDPR, HIPAA, PCI-DSS)
