# Keycloak Integration — Interview Prep & Production Guide

This folder covers Keycloak integration from zero to production-grade systems.
Designed for interviews at mid-to-senior level, covering SSO, RBAC, JWT, and enterprise identity patterns.

## Index

| File | Topics |
|------|--------|
| [00-oauth2-vs-oidc.md](./00-oauth2-vs-oidc.md) | OAuth 2.0 vs OIDC — what each solves, token types, flows, discovery, interview Q&A |
| [01-keycloak-fundamentals.md](./01-keycloak-fundamentals.md) | Core concepts, realms, clients, users, roles |
| [02-authentication-flows.md](./02-authentication-flows.md) | Authorization Code, Client Credentials, PKCE, Device Flow |
| [03-jwt-and-tokens.md](./03-jwt-and-tokens.md) | Access token, ID token, refresh token, introspection |
| [04-spring-boot-integration.md](./04-spring-boot-integration.md) | Resource server setup, Spring Security config, role extraction |
| [05-rbac-and-authorization.md](./05-rbac-and-authorization.md) | Realm roles, client roles, groups, fine-grained permissions |
| [06-sso-and-social-login.md](./06-sso-and-social-login.md) | SSO across apps, Google/GitHub OAuth, Identity Brokering |
| [07-security.md](./07-security.md) | Token security, HTTPS, PKCE, secret rotation, CORS |
| [08-production-pitfalls.md](./08-production-pitfalls.md) | Real-world bugs, token leaks, misconfiguration, performance |
| [09-use-cases.md](./09-use-cases.md) | Multi-tenant SaaS, microservices, B2B SSO, machine-to-machine |
| [10-testing.md](./10-testing.md) | Unit tests, integration tests, Testcontainers, test realm setup |
| [11-glossary.md](./11-glossary.md) | Keycloak terms, OAuth2/OIDC concepts, Spring Security terms |

## Quick Mental Model

```
User visits your app
    → App redirects to Keycloak login page (Authorization Code flow)
    → User logs in at Keycloak (not your app — Keycloak owns credentials)
    → Keycloak issues Authorization Code → redirects back to your app
    → Your app exchanges code for Access Token + ID Token + Refresh Token
    → Your app sends Access Token (JWT) in Authorization header to your API
    → Your API validates JWT signature using Keycloak's public key (JWKS)
    → API extracts roles from JWT → grants or denies access
```

The key insight: **your app never sees the user's password**. Keycloak owns identity; your services own business logic.
