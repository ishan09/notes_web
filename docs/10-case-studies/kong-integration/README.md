# Kong API Gateway — Interview Prep & Production Guide

This folder covers Kong Gateway from fundamentals to production-grade deployments.
Designed for interviews at mid-to-senior level, covering routing, plugins, authentication, traffic management, and declarative configuration.

## Index

| File | Topics |
|------|--------|
| [01-kong-fundamentals.md](./01-kong-fundamentals.md) | What Kong is, how it works, DB vs DB-less, deployment modes |
| [02-core-entities.md](./02-core-entities.md) | Service, Route, Plugin, Consumer, Upstream, Target |
| [03-plugins.md](./03-plugins.md) | Rate limiting, request transformation, logging, CORS, response caching |
| [04-authentication.md](./04-authentication.md) | JWT plugin, key-auth, OAuth2, OIDC with Keycloak |
| [05-traffic-management.md](./05-traffic-management.md) | Load balancing, health checks, circuit breaker, canary deployments |
| [06-declarative-config.md](./06-declarative-config.md) | DB-less mode, deck CLI, Kong Ingress Controller |
| [07-security.md](./07-security.md) | mTLS, IP restriction, bot detection, Admin API security, CORS |
| [08-production-pitfalls.md](./08-production-pitfalls.md) | Config drift, timer exhaustion, memory leaks, high P99 latency |
| [09-use-cases.md](./09-use-cases.md) | Microservices gateway, canary, B2B API monetization, Kubernetes |
| [10-testing.md](./10-testing.md) | Unit testing plugins (Busted), integration with Inso CLI, Testcontainers |
| [11-glossary.md](./11-glossary.md) | Kong terms, plugin lifecycle, Admin API endpoints |

## Quick Mental Model

```
Client (browser / mobile / service)
    │
    ▼
Kong Gateway (Nginx/OpenResty — the proxy layer)
    │
    ├── Route matching   → which Service handles this request?
    ├── Plugin execution → rate limit, auth, transform (pre-proxy)
    │
    ▼
Upstream (your backend — load-balanced across Targets)
    │
    ├── Plugin execution → response transform, logging (post-proxy)
    │
    ▼
Client response
```

Kong sits between every client and every backend.
It enforces policy (auth, rate limits, transforms) without touching your service code.

## Core Entities Hierarchy

```
Service   → points to upstream URL (http://orders-service:8080)
    └── Route → rules to match requests (path=/orders, method=GET)
        └── Plugin → behaviour on matched requests (rate-limit, jwt, log)

Consumer  → represents a client identity (an app or a user)
    └── Plugin credentials (JWT key, API key, OAuth2 app)

Upstream  → load balancer definition (name: orders-lb)
    └── Target → backend instance (10.0.0.1:8080, weight=100)
```
