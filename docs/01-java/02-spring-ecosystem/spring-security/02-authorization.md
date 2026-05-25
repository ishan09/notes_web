# Spring Security Authorization

## Before You Start

Can you answer these?
- What's the difference between authentication and authorization?
- What is a role vs a permission?
- What does @PreAuthorize do?

If not, review 01-authentication.md first.

## What is Authorization?

**Simple explanation**: Authorization is determining what you're allowed to do after you've proven who you are.

**Real-world analogy**: Hotel access card
- **Authentication**: Card proves you're a guest (you checked in)
- **Authorization**: Card only opens YOUR room, not others
  - Guest card: Opens room 305
  - Staff card: Opens all rooms
  - Manager card: Opens all rooms + office

**In Spring Security**:
```
User is authenticated (logged in)
    ↓
User tries to access resource
    ↓
Spring Security checks authorities/roles
    ↓
Access granted or denied
```

## Authorization vs Authentication

| Aspect | Authentication | Authorization |
|--------|---------------|---------------|
| Question | Who are you? | What can you do? |
| When | At login | Every request/method call |
| Result | User identity established | Access granted/denied |
| Example | Login with password | Admin can delete, user cannot |
| Spring | AuthenticationManager | AccessDecisionManager |
| Annotation | N/A | @PreAuthorize, @Secured |

## Authorities vs Roles

### Authorities (Fine-grained permissions)

```java
// Authorities are specific permissions
"READ_PRIVILEGES"
"WRITE_PRIVILEGES"
"DELETE_PRIVILEGES"
"APPROVE_INVOICE"
"EXPORT_DATA"
```

### Roles (Groups of authorities)

```java
// Roles are groups of related authorities
"ROLE_USER"    → READ_PRIVILEGES
"ROLE_MANAGER" → READ_PRIVILEGES, WRITE_PRIVILEGES, APPROVE_INVOICE
"ROLE_ADMIN"   → All privileges
```

**Spring Security convention**: Roles must start with `ROLE_`

```java
// Database storage
roles table: "ROLE_USER", "ROLE_ADMIN"

// In code - two ways to check:
hasRole("USER")           // Auto-adds "ROLE_" prefix
hasAuthority("ROLE_USER") // Exact match
```

**Stop and think**: Why use roles instead of individual permissions everywhere?

<details>
<summary>Answer</summary>

Roles simplify management. Instead of assigning 10 permissions to each user, assign one role (e.g., MANAGER) that contains those 10 permissions. When you need to add a permission to all managers, update the role definition once, not on every user.
</details>

## URL-Based Authorization

### Basic Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/", "/login", "/register").permitAll()
                .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()

                // Role-based access
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "ADMIN")

                // Authority-based access
                .requestMatchers(HttpMethod.DELETE, "/api/invoices/**")
                    .hasAuthority("DELETE_PRIVILEGES")

                // Authenticated users
                .requestMatchers("/api/invoices/**").authenticated()

                // Deny everything else
                .anyRequest().denyAll()
            )
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
```

### HTTP Method-Specific Authorization

```java
http.authorizeHttpRequests(auth -> auth
    // Anyone can read
    .requestMatchers(HttpMethod.GET, "/api/invoices/**").permitAll()

    // Authenticated users can create
    .requestMatchers(HttpMethod.POST, "/api/invoices").authenticated()

    // Only managers can update
    .requestMatchers(HttpMethod.PUT, "/api/invoices/**").hasRole("MANAGER")

    // Only admins can delete
    .requestMatchers(HttpMethod.DELETE, "/api/invoices/**").hasRole("ADMIN")
);
```

### Pattern Matching

```java
http.authorizeHttpRequests(auth -> auth
    // Exact match
    .requestMatchers("/api/users").hasRole("ADMIN")

    // Wildcard (single level)
    .requestMatchers("/api/users/*").hasRole("ADMIN")
    // Matches: /api/users/123
    // NOT: /api/users/123/invoices

    // Double wildcard (multiple levels)
    .requestMatchers("/api/users/**").hasRole("ADMIN")
    // Matches: /api/users/123
    // Matches: /api/users/123/invoices
    // Matches: /api/users/123/invoices/456

    // Ant patterns
    .requestMatchers("/api/invoices/*/approve").hasRole("MANAGER")
    // Matches: /api/invoices/123/approve

    // Regular expressions
    .requestMatchers(RegexRequestMatcher.regexMatcher("/api/invoices/\\d+")).authenticated()
);
```

## Method-Level Security

### Enable Method Security

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // New in Spring Security 6
public class SecurityConfig {
    // ...
}

// For older versions:
@EnableGlobalMethodSecurity(
    prePostEnabled = true,   // @PreAuthorize, @PostAuthorize
    securedEnabled = true,   // @Secured
    jsr250Enabled = true     // @RolesAllowed
)
```

### @PreAuthorize - Before Method Execution

```java
@Service
public class InvoiceService {

    // Only users with ADMIN role
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAllInvoices() {
        repository.deleteAll();
    }

    // Only authenticated users
    @PreAuthorize("isAuthenticated()")
    public List<Invoice> findAll() {
        return repository.findAll();
    }

    // Multiple roles (OR condition)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public void approveInvoice(Long id) {
        Invoice invoice = repository.findById(id).orElseThrow();
        invoice.setStatus(InvoiceStatus.APPROVED);
        repository.save(invoice);
    }

    // Authority check
    @PreAuthorize("hasAuthority('DELETE_PRIVILEGES')")
    public void deleteInvoice(Long id) {
        repository.deleteById(id);
    }

    // Complex expression
    @PreAuthorize("hasRole('USER') and #username == authentication.name")
    public List<Invoice> findByUsername(String username) {
        return repository.findByUsername(username);
    }
}
```

### @PostAuthorize - After Method Execution

```java
@Service
public class InvoiceService {

    // Check result after method executes
    @PostAuthorize("returnObject.username == authentication.name")
    public Invoice findById(Long id) {
        return repository.findById(id).orElseThrow();
    }
    // If invoice doesn't belong to user, throws AccessDeniedException

    // Useful for filtering results based on ownership
    @PostAuthorize("returnObject.owner == principal.username or hasRole('ADMIN')")
    public Invoice getInvoice(Long id) {
        return repository.findById(id).orElseThrow();
    }
}
```

### @PreFilter and @PostFilter

```java
@Service
public class InvoiceService {

    // Filter collection BEFORE method execution
    @PreFilter("filterObject.status != 'DELETED'")
    public void processBatch(List<Invoice> invoices) {
        // Only non-deleted invoices are processed
    }

    // Filter collection AFTER method execution
    @PostFilter("filterObject.username == authentication.name or hasRole('ADMIN')")
    public List<Invoice> findAll() {
        return repository.findAll();
    }
    // Returns only invoices belonging to current user (or all if admin)
}
```

**Warning**: @PostFilter loads ALL records from database, then filters in memory. Not efficient for large datasets!

### @Secured - Simple Role Check

```java
@Service
public class InvoiceService {

    @Secured("ROLE_ADMIN")
    public void deleteAll() {
        repository.deleteAll();
    }

    @Secured({"ROLE_MANAGER", "ROLE_ADMIN"})
    public void approveInvoice(Long id) {
        // ...
    }
}
```

**Difference from @PreAuthorize**:
- @Secured: Simple, only supports roles
- @PreAuthorize: SpEL expressions, complex conditions

### @RolesAllowed - JSR-250 Standard

```java
@Service
public class InvoiceService {

    @RolesAllowed("ADMIN")
    public void deleteAll() {
        repository.deleteAll();
    }

    @RolesAllowed({"MANAGER", "ADMIN"})
    public void approveInvoice(Long id) {
        // ...
    }
}
```

**Note**: @RolesAllowed doesn't require "ROLE_" prefix

## SpEL Expressions in Security

### Built-in Security Expressions

| Expression | Description | Example |
|------------|-------------|---------|
| `hasRole('ADMIN')` | User has role | `@PreAuthorize("hasRole('ADMIN')")` |
| `hasAnyRole('USER','ADMIN')` | User has any of the roles | `@PreAuthorize("hasAnyRole('USER','ADMIN')")` |
| `hasAuthority('READ')` | User has authority | `@PreAuthorize("hasAuthority('READ_PRIVILEGES')")` |
| `hasAnyAuthority('READ','WRITE')` | User has any authority | `@PreAuthorize("hasAnyAuthority('READ','WRITE')")` |
| `isAuthenticated()` | User is logged in | `@PreAuthorize("isAuthenticated()")` |
| `isAnonymous()` | User is not logged in | `@PreAuthorize("isAnonymous()")` |
| `principal` | Current user object | `@PreAuthorize("principal.username == 'admin')")` |
| `authentication` | Authentication object | `@PreAuthorize("#user == authentication.name")` |

### Method Parameter Access

```java
@PreAuthorize("#username == authentication.name")
public Invoice findByUsername(String username) {
    // Only if username matches current user
}

@PreAuthorize("#invoice.username == authentication.name or hasRole('ADMIN')")
public void updateInvoice(Invoice invoice) {
    // Only if invoice belongs to user OR user is admin
}
```

### Return Value Access

```java
@PostAuthorize("returnObject.username == authentication.name")
public Invoice findById(Long id) {
    // Check after fetching
}

@PostAuthorize("returnObject.owner == principal.username or hasRole('ADMIN')")
public Document getDocument(Long id) {
    // Owner or admin can access
}
```

### Complex Expressions

```java
// AND condition
@PreAuthorize("hasRole('MANAGER') and #invoice.status == 'PENDING'")
public void approve(Invoice invoice) { }

// OR condition
@PreAuthorize("hasRole('ADMIN') or (#invoice.createdBy == authentication.name)")
public void edit(Invoice invoice) { }

// Custom SpEL
@PreAuthorize("@invoiceSecurityService.canAccess(#id, authentication)")
public Invoice findById(Long id) { }
```

## Custom Security Service

```java
@Service
public class InvoiceSecurityService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceSecurityService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    public boolean canAccess(Long invoiceId, Authentication authentication) {
        // Admin can access everything
        if (authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }

        // Check ownership
        Invoice invoice = invoiceRepository.findById(invoiceId).orElse(null);
        if (invoice == null) {
            return false;
        }

        return invoice.getUsername().equals(authentication.getName());
    }

    public boolean canModify(Long invoiceId, Authentication authentication) {
        if (!canAccess(invoiceId, authentication)) {
            return false;
        }

        // Can't modify approved invoices (unless admin)
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();
        if (invoice.getStatus() == InvoiceStatus.APPROVED) {
            return authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
        }

        return true;
    }
}
```

**Usage**:
```java
@PreAuthorize("@invoiceSecurityService.canAccess(#id, authentication)")
public Invoice findById(Long id) {
    return repository.findById(id).orElseThrow();
}

@PreAuthorize("@invoiceSecurityService.canModify(#id, authentication)")
public Invoice update(Long id, InvoiceRequest request) {
    Invoice invoice = repository.findById(id).orElseThrow();
    // Update logic
    return repository.save(invoice);
}
```

## Hierarchical Roles

```java
@Configuration
public class SecurityConfig {

    @Bean
    public RoleHierarchy roleHierarchy() {
        RoleHierarchyImpl hierarchy = new RoleHierarchyImpl();
        hierarchy.setHierarchy("""
            ROLE_ADMIN > ROLE_MANAGER
            ROLE_MANAGER > ROLE_USER
            """);
        return hierarchy;
    }

    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler(
            RoleHierarchy roleHierarchy) {
        DefaultMethodSecurityExpressionHandler handler =
            new DefaultMethodSecurityExpressionHandler();
        handler.setRoleHierarchy(roleHierarchy);
        return handler;
    }
}
```

**Result**:
- `ROLE_ADMIN` inherits all permissions from `ROLE_MANAGER` and `ROLE_USER`
- `ROLE_MANAGER` inherits all permissions from `ROLE_USER`

```java
@PreAuthorize("hasRole('USER')")
public void someMethod() {
    // ADMIN and MANAGER can also access (they inherit USER role)
}
```

## Permission-Based Authorization

### Domain Model with Permissions

```java
@Entity
public class User {
    // ... other fields

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
}

@Entity
public class Role {
    @Id
    private Long id;

    private String name;  // ROLE_ADMIN, ROLE_MANAGER

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
}

@Entity
public class Permission {
    @Id
    private Long id;

    private String name;  // READ_PRIVILEGES, WRITE_PRIVILEGES, DELETE_PRIVILEGES
}
```

### Loading Permissions

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();

        Set<GrantedAuthority> authorities = new HashSet<>();

        // Add roles
        user.getRoles().forEach(role -> {
            authorities.add(new SimpleGrantedAuthority(role.getName()));

            // Add permissions from each role
            role.getPermissions().forEach(permission ->
                authorities.add(new SimpleGrantedAuthority(permission.getName()))
            );
        });

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password(user.getPassword())
            .authorities(authorities)
            .build();
    }
}
```

### Using Permissions

```java
@PreAuthorize("hasAuthority('READ_PRIVILEGES')")
public List<Invoice> findAll() { }

@PreAuthorize("hasAuthority('WRITE_PRIVILEGES')")
public Invoice create(Invoice invoice) { }

@PreAuthorize("hasAuthority('DELETE_PRIVILEGES')")
public void delete(Long id) { }
```

## Build-Along Project: InvoiceManager Authorization

### Role Hierarchy for InvoiceManager

```
ROLE_ADMIN
  ├─ All system privileges
  ├─ User management
  └─ Access all data

ROLE_MANAGER
  ├─ Approve invoices
  ├─ View team invoices
  └─ Export reports

ROLE_USER
  ├─ Create invoices
  ├─ View own invoices
  └─ Edit own pending invoices
```

### Database Setup

```sql
-- Insert roles
INSERT INTO roles (name) VALUES
  ('ROLE_USER'),
  ('ROLE_MANAGER'),
  ('ROLE_ADMIN');

-- Insert permissions
INSERT INTO permissions (name) VALUES
  ('READ_OWN_INVOICES'),
  ('CREATE_INVOICE'),
  ('EDIT_OWN_INVOICE'),
  ('READ_TEAM_INVOICES'),
  ('APPROVE_INVOICE'),
  ('READ_ALL_INVOICES'),
  ('DELETE_INVOICE');

-- Assign permissions to roles
-- USER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ROLE_USER'
  AND p.name IN ('READ_OWN_INVOICES', 'CREATE_INVOICE', 'EDIT_OWN_INVOICE');

-- MANAGER permissions (includes USER permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ROLE_MANAGER'
  AND p.name IN ('READ_OWN_INVOICES', 'CREATE_INVOICE', 'EDIT_OWN_INVOICE',
                 'READ_TEAM_INVOICES', 'APPROVE_INVOICE');

-- ADMIN permissions (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ROLE_ADMIN';
```

### Secured Invoice Service

```java
@Service
@Transactional(readOnly = true)
public class InvoiceService {

    private final InvoiceRepository repository;

    // Users see only their invoices
    @PreAuthorize("hasAuthority('READ_OWN_INVOICES')")
    public List<Invoice> findMyInvoices() {
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        return repository.findByUsername(username);
    }

    // Managers see team invoices
    @PreAuthorize("hasAuthority('READ_TEAM_INVOICES')")
    public List<Invoice> findTeamInvoices() {
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        // Assume team relationship exists
        return repository.findByTeamManager(username);
    }

    // Admins see all
    @PreAuthorize("hasAuthority('READ_ALL_INVOICES')")
    public List<Invoice> findAll() {
        return repository.findAll();
    }

    // Anyone can create
    @PreAuthorize("hasAuthority('CREATE_INVOICE')")
    @Transactional
    public Invoice create(InvoiceRequest request) {
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();

        Invoice invoice = new Invoice();
        invoice.setUsername(username);
        // ... set other fields
        return repository.save(invoice);
    }

    // Only owner or admin can edit
    @PreAuthorize("@invoiceSecurityService.canModify(#id, authentication)")
    @Transactional
    public Invoice update(Long id, InvoiceRequest request) {
        Invoice invoice = repository.findById(id).orElseThrow();
        // ... update fields
        return repository.save(invoice);
    }

    // Managers can approve
    @PreAuthorize("hasAuthority('APPROVE_INVOICE')")
    @Transactional
    public Invoice approve(Long id) {
        Invoice invoice = repository.findById(id).orElseThrow();
        invoice.setStatus(InvoiceStatus.APPROVED);
        return repository.save(invoice);
    }

    // Only admins can delete
    @PreAuthorize("hasAuthority('DELETE_INVOICE')")
    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
```

### Secured Controller

```java
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService service;

    @GetMapping("/my")
    public List<Invoice> getMyInvoices() {
        return service.findMyInvoices();
    }

    @GetMapping("/team")
    public List<Invoice> getTeamInvoices() {
        return service.findTeamInvoices();
    }

    @GetMapping("/all")
    public List<Invoice> getAllInvoices() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<Invoice> create(@Valid @RequestBody InvoiceRequest request) {
        Invoice invoice = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
    }

    @PutMapping("/{id}")
    public Invoice update(@PathVariable Long id,
                         @Valid @RequestBody InvoiceRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/approve")
    public Invoice approve(@PathVariable Long id) {
        return service.approve(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
```

### Testing Authorization

```java
@SpringBootTest
@AutoConfigureMockMvc
class InvoiceSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "john", roles = "USER")
    void userCanViewOwnInvoices() throws Exception {
        mockMvc.perform(get("/api/invoices/my"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "john", roles = "USER")
    void userCannotViewAllInvoices() throws Exception {
        mockMvc.perform(get("/api/invoices/all"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "manager", roles = "MANAGER")
    void managerCanViewTeamInvoices() throws Exception {
        mockMvc.perform(get("/api/invoices/team"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "manager", roles = "MANAGER")
    void managerCanApproveInvoices() throws Exception {
        mockMvc.perform(post("/api/invoices/1/approve"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user", roles = "USER")
    void userCannotApproveInvoices() throws Exception {
        mockMvc.perform(post("/api/invoices/1/approve"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCanDeleteInvoices() throws Exception {
        mockMvc.perform(delete("/api/invoices/1"))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user", roles = "USER")
    void userCannotDeleteInvoices() throws Exception {
        mockMvc.perform(delete("/api/invoices/1"))
            .andExpect(status().isForbidden());
    }
}
```

## Exception Handling

### Access Denied Handler

```java
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request,
                      HttpServletResponse response,
                      AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("""
            {
              "error": "Forbidden",
              "message": "You don't have permission to access this resource",
              "timestamp": "%s"
            }
            """.formatted(Instant.now()));
    }
}
```

### Configure Exception Handlers

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        )
        .exceptionHandling(ex -> ex
            .accessDeniedHandler(customAccessDeniedHandler)
            .authenticationEntryPoint(customAuthEntryPoint)
        );

    return http.build();
}
```

## Common Mistakes

### Mistake 1: Forgetting @EnableMethodSecurity

```java
// ❌ Method security won't work
@Configuration
@EnableWebSecurity
public class SecurityConfig { }

// ✅ Enable method security
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig { }
```

### Mistake 2: Using @PostFilter on large datasets

```java
// ❌ Loads 10,000 records, filters in memory
@PostFilter("filterObject.username == authentication.name")
public List<Invoice> findAll() {
    return repository.findAll();  // 10,000 records
}

// ✅ Filter in database query
public List<Invoice> findMyInvoices() {
    String username = getCurrentUsername();
    return repository.findByUsername(username);  // Only user's records
}
```

### Mistake 3: Not handling AccessDeniedException

```java
// ❌ User sees generic error
@ExceptionHandler(AccessDeniedException.class)
public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
}

// ✅ Clear error message
@ExceptionHandler(AccessDeniedException.class)
public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.FORBIDDEN,
        "You don't have permission to perform this action"
    );
    problem.setTitle("Access Denied");
    return problem;
}
```

### Mistake 4: Incorrect role naming

```java
// ❌ Missing ROLE_ prefix in database
roles table: "ADMIN", "USER"

@PreAuthorize("hasRole('ADMIN')")  // Won't work!

// ✅ Use ROLE_ prefix
roles table: "ROLE_ADMIN", "ROLE_USER"

@PreAuthorize("hasRole('ADMIN')")  // Works (adds ROLE_ automatically)
```

### Mistake 5: Securing service but not controller

```java
// ❌ Service is secured but controller is not
@RestController
public class InvoiceController {
    @GetMapping("/api/admin/data")  // No security here!
    public Data getData() {
        return service.getSecuredData();  // Secured in service
    }
}

// ✅ Secure at controller level (first line of defense)
@RestController
public class InvoiceController {
    @GetMapping("/api/admin/data")
    @PreAuthorize("hasRole('ADMIN')")
    public Data getData() {
        return service.getSecuredData();
    }
}
```

## Self-Check Questions

1. What's the difference between hasRole() and hasAuthority()?
2. When should you use @PreAuthorize vs @PostAuthorize?
3. Why is @PostFilter inefficient for large datasets?
4. How do you access method parameters in @PreAuthorize?
5. What's the benefit of hierarchical roles?
6. When should you use permissions instead of roles?

<details>
<summary>Answers</summary>

1. hasRole() auto-adds "ROLE_" prefix, hasAuthority() is exact match
2. @PreAuthorize: Check before execution (prevent unauthorized access). @PostAuthorize: Check after execution (verify result matches conditions)
3. It loads ALL records from database, then filters in memory (not database)
4. Use # prefix: `@PreAuthorize("#username == authentication.name")`
5. Higher roles automatically inherit permissions from lower roles (ADMIN gets MANAGER and USER permissions)
6. When you need fine-grained control beyond simple role groupings, or when permissions change frequently
</details>

## Practice Exercises

### Exercise 1: Implement Team-Based Access
- Users belong to teams
- Users can only see invoices from their team
- Team managers can approve team invoices

### Exercise 2: Custom Security Evaluator
Create `@CanEditInvoice` annotation that checks:
- User owns the invoice OR
- User is manager of invoice creator OR
- User is admin

### Exercise 3: Audit Logging
Log all authorization denials:
- Who tried to access what
- When
- What role they had

### Exercise 4: Dynamic Permissions
Load permissions from database at runtime:
- Add/remove permissions without code changes
- Cache permissions for performance

---

## Navigation

**Prerequisites:**
- [Spring Security Authentication](./01-authentication.md) - User login and password hashing
- [Spring AOP Basics](../../spring-core/04-aop-proxies.md) - Method security uses AOP
- [SpEL (Spring Expression Language)](../../spring-core/03-configuration.md) - Security expressions

**Next Topics:**
- [JWT Implementation](./03-jwt.md) - Stateless token-based authorization
- [OAuth2 & Social Login](./04-oauth2.md) - Third-party authorization and scopes

**Related:**
- [Spring Security Best Practices](./05-best-practices.md) - Security hardening and OWASP Top 10
- [Spring Boot Security](../../spring-boot/05-best-practices.md) - Production security setup
- [Microservices Security](../../../04-microservices/04-inter-service-communication.md) - Distributed authorization

**Interview Focus:**
- Role-based access control (RBAC) vs permission-based access control (PBAC)
- @PreAuthorize vs @PostAuthorize vs @Secured annotations
- SpEL expressions in security annotations with method parameters
- Hierarchical roles and permission inheritance
- URL-based vs method-level security layering

**Module Index:** [Spring Security Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
