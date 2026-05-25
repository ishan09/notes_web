# Keycloak Fundamentals

## What is Keycloak?

Keycloak is an open-source **Identity and Access Management (IAM)** solution that provides:
- Single Sign-On (SSO) across multiple applications
- User federation (connect to LDAP, Active Directory)
- Social login (Google, GitHub, Facebook)
- Fine-grained authorization (RBAC, ABAC)
- Standard protocol support: OAuth 2.0, OpenID Connect (OIDC), SAML 2.0

It sits between your users and your applications — acting as a centralized **identity broker**.

```
User
  → Keycloak (handles login, issues tokens)
  → Your App (trusts Keycloak's tokens, never sees passwords)
  → Your APIs (validates JWT, enforces roles)
```

---

## Core Concepts

### Realm
A **realm** is an isolated namespace — like a tenant. It contains its own users, roles, clients, and configuration.

| Realm | Use case |
|---|---|
| `master` | Keycloak admin only — **never use for your apps** |
| `my-app-realm` | Your application's users and clients |
| `tenant-a-realm` | One tenant in a multi-tenant setup |

> Rule: Create one realm per application or tenant. The `master` realm is for Keycloak administration only.

---

### Client
A **client** is any application that delegates authentication to Keycloak.

| Client type | Used for | Example |
|---|---|---|
| `public` | Frontend apps (SPA, mobile) — no secret | React app |
| `confidential` | Backend apps with a secret | Spring Boot API |
| `bearer-only` | APIs that only validate tokens, never initiate login | Microservice |

---

### Users
Users are stored in Keycloak's own database (or federated from LDAP/AD).

Each user has:
- Credentials (password, OTP)
- Attributes (custom fields like `department`, `tenantId`)
- Role mappings (which roles they have)
- Group memberships

---

### Roles
Two types of roles in Keycloak:

**Realm Roles** — global to the entire realm:
```
realm: my-app-realm
roles: admin, editor, viewer
```

**Client Roles** — scoped to a specific client:
```
client: billing-service
roles: billing:read, billing:write
```

> Best practice: Use **realm roles** for cross-cutting concerns (admin, user). Use **client roles** for service-specific permissions (orders:manage).

---

### Groups
Groups are collections of users that inherit roles. Useful for:
- Department-level access (`engineering-group` → `developer` role)
- Tenant-level access (`tenant-a-group` → `tenant-a:read`)

---

## The Identity Flow at a Glance

```
1. User hits your app → not logged in
2. App redirects → Keycloak /auth endpoint
3. Keycloak shows login page
4. User authenticates (password, OTP, social)
5. Keycloak issues Authorization Code → redirects back to app
6. App's backend exchanges code → gets Access Token (JWT) + ID Token + Refresh Token
7. App uses Access Token in API calls (Authorization: Bearer <token>)
8. API validates token signature against Keycloak's JWKS endpoint
9. API reads roles from JWT → grants or denies
```

---

## Keycloak vs Alternatives

| Tool | Type | Best for |
|---|---|---|
| Keycloak | Self-hosted IAM | Enterprise, full control, no vendor lock-in |
| Auth0 | SaaS IAM | Fast setup, managed, higher cost at scale |
| Firebase Auth | SaaS (Google) | Mobile-first, simpler, less enterprise-grade |
| Okta | Enterprise SaaS | Large enterprise, compliance-heavy |
| AWS Cognito | SaaS (AWS) | AWS-native apps |

> Keycloak wins when: you need self-hosting (data sovereignty), LDAP/AD federation, or want to avoid per-user SaaS pricing at scale.

---

## Keycloak vs Kong — Not the Same Thing

A common interview confusion: these are **complementary tools**, not alternatives.

| | Keycloak | Kong |
|---|---|---|
| **Category** | Identity Provider (IdP) / IAM | API Gateway / Proxy |
| **Core job** | Authenticate users, issue tokens | Route requests, enforce policy |
| **Owns** | Users, passwords, sessions, roles | Routes, rate limits, transforms |
| **Issues** | JWT tokens (Access, ID, Refresh) | Nothing — validates tokens |
| **Sits** | Auth server (login flow) | In front of your services (proxy) |
| **Answers** | "Who is this user?" | "Should this request go through?" |

**They are used together**, not as alternatives:

```
User
  │
  ▼
Kong (API Gateway)
  ├── Rate limiting ✓
  ├── JWT validation → fetches public keys from Keycloak's JWKS ✓
  └── Route to backend service

         ↕ (login flow only)

Keycloak (Identity Provider)
  ├── Login page, SSO, social login
  ├── Issues JWT tokens
  └── JWKS endpoint — Kong fetches public keys from here
```

**Rule**: Keycloak = "prove who you are". Kong = "you're allowed in, here's where your request goes and under what rules."

---

## Quick Check
1. What is a realm and why should you never use the `master` realm for your app?
2. What is the difference between a `public` and `confidential` client?
3. When would you use a client role instead of a realm role?
4. What does Keycloak issue after a user successfully authenticates?
5. Can Kong replace Keycloak? What does each tool own?
