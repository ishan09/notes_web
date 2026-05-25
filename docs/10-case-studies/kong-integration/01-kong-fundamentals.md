# Kong Gateway — Fundamentals

## What is Kong?

Kong is an open-source API gateway built on top of **Nginx** and **OpenResty** (Nginx + LuaJIT). It sits in front of your backend services and adds cross-cutting concerns — authentication, rate limiting, logging, transformations — without modifying your service code.

```
Without Kong:
  Client → Service A   (handles auth itself)
  Client → Service B   (handles rate limiting itself)
  Client → Service C   (handles logging itself)

With Kong:
  Client → Kong → Service A  \
  Client → Kong → Service B   → Kong handles auth, rate limiting, logging for all
  Client → Kong → Service C  /
```

**Kong is policy at the edge.** Move cross-cutting concerns out of your services and into the gateway layer.

---

## How Kong Works Internally

Kong is Nginx extended with Lua scripting via OpenResty. Every request goes through a plugin chain:

```
Request arrives at Nginx
    ↓
Kong's Lua plugin chain (executed in order):
    1. rewrite       — URL rewriting, header injection
    2. access        — authentication, rate limiting, IP restriction
    3. header_filter — modify response headers
    4. body_filter   — modify response body
    5. log           — async logging (does not block response)
    ↓
Upstream service called via Nginx proxy_pass
    ↓
Response returned through same plugin chain (phases 3–5)
```

Each plugin runs Lua code in one or more of these phases. Built-in plugins are Lua; custom plugins can also be written in Go (using the go-plugin-server).

---

## DB-backed vs DB-less Mode

| Aspect | DB-backed (PostgreSQL) | DB-less (declarative) |
|---|---|---|
| Config storage | PostgreSQL database | In-memory from YAML/JSON file |
| Admin API | Read + Write | Read-only |
| Dynamic updates | Yes — POST to Admin API | Requires config reload |
| Clustering | Multiple Kong nodes share one DB | Each node loads config independently |
| Config drift risk | Low (single source of truth) | High (diverge if nodes load different files) |
| Good for | Production, dynamic environments | Kubernetes, GitOps, CI/CD pipelines |
| Startup | Needs DB connection | Reads file from disk |

```yaml
# DB-less — set in kong.conf or environment variable
KONG_DATABASE=off
KONG_DECLARATIVE_CONFIG=/etc/kong/kong.yaml
```

---

## Deployment Modes

### Standalone (single node)
All traffic proxied through one Kong instance. Simple but single point of failure.

### Clustered (multiple nodes + shared DB)
Multiple Kong nodes share one PostgreSQL database. Nodes sync configuration from DB. Good for horizontal scaling.

```
Load Balancer
    ├── Kong Node 1 ──┐
    ├── Kong Node 2 ──┤─── PostgreSQL (shared config)
    └── Kong Node 3 ──┘
```

### Hybrid Mode (Control Plane + Data Plane)
Introduced in Kong 2.0 — separates configuration from traffic proxying:

```
Control Plane (CP)
    ├── Admin API — receives config changes
    ├── Stores config in DB
    └── Pushes config to Data Planes via mTLS WebSocket

Data Plane (DP)
    ├── Receives config from CP
    ├── Caches config in-memory (no DB needed)
    └── Proxies all client traffic
```

**Advantage**: Data Planes are purely traffic-proxying — no DB dependency. If CP goes down, DPs keep serving from cached config.

### Kubernetes — Kong Ingress Controller (KIC)
Kong runs as a Kubernetes Ingress Controller. Config is managed via Kubernetes Custom Resources (CRDs) instead of Admin API calls.

```
kubectl apply -f ingress.yaml
    ↓
KIC watches K8s API server
    ↓
Converts Ingress/KongPlugin CRDs → Kong config
    ↓
Kong serves traffic
```

---

## Ports

| Port | Purpose |
|---|---|
| `8000` | HTTP proxy — client traffic |
| `8443` | HTTPS proxy — client traffic (TLS) |
| `8001` | Admin API — HTTP (never expose to public) |
| `8444` | Admin API — HTTPS |
| `8002` | Kong Manager (GUI) — Enterprise only |

**Critical**: Port 8001 (Admin API) must never be publicly accessible. It has full read/write control over Kong's configuration.

---

## Kong vs Alternatives

| Feature | Kong | AWS API Gateway | Nginx | Traefik |
|---|---|---|---|---|
| Plugin system | Rich (Lua/Go) | Limited (Lambda authorizers) | Manual config | Middleware |
| DB-less mode | Yes | N/A (managed) | N/A | Yes |
| Open source | Yes (OSS core) | No (managed) | Yes | Yes |
| Kubernetes-native | KIC | No | Ingress controller | Yes |
| gRPC support | Yes | Limited | With modules | Yes |
| WebSocket | Yes | Yes | Yes | Yes |
| Rate limiting | Built-in plugin | Built-in | Manual | Plugin |
| Auth plugins | JWT, OAuth2, OIDC, key-auth | IAM, Cognito, Lambda | Manual | Middleware |
| Admin API | REST | Console/CLI | Edit files | REST |

Kong shines when you need rich plugin extensibility and want to avoid vendor lock-in (unlike AWS API Gateway).

---

## Kong OSS vs Enterprise

| Feature | OSS | Enterprise |
|---|---|---|
| Core proxy | ✅ | ✅ |
| All plugins | ✅ | ✅ |
| Kong Manager UI | ❌ | ✅ |
| RBAC on Admin API | ❌ | ✅ |
| Secrets management (Vault) | ❌ | ✅ |
| OPA integration | ❌ | ✅ |
| Dedicated support | ❌ | ✅ |

For most interview prep, Kong OSS is what you need.

---

## Kong vs Keycloak — Not the Same Thing

A common interview confusion: these are **complementary tools**, not alternatives.

| | Kong | Keycloak |
|---|---|---|
| **Category** | API Gateway / Proxy | Identity Provider (IdP) / IAM |
| **Core job** | Route requests, enforce policy | Authenticate users, issue tokens |
| **Owns** | Routes, rate limits, transforms | Users, passwords, sessions, roles |
| **Issues** | Nothing — validates tokens | JWT tokens (Access, ID, Refresh) |
| **Sits** | In front of your services (proxy) | Auth server (login flow) |
| **Answers** | "Should this request go through?" | "Who is this user?" |

**When to use what:**

| Need | Use |
|---|---|
| User login page, SSO, social login | Keycloak |
| Password reset, OTP, MFA | Keycloak |
| User roles and fine-grained permissions | Keycloak |
| LDAP / Active Directory integration | Keycloak |
| Rate limiting, load balancing | Kong |
| Route `/api/orders` → orders-service | Kong |
| Canary deployment | Kong |
| API key management for partners | Kong |
| Request/response transformation | Kong |
| Centralize logging across all services | Kong |

**They work together in production:**

```
User
  │
  ▼
Kong (API Gateway)
  ├── Rate limiting: 100 req/min
  ├── JWT validation: fetches public keys from Keycloak JWKS
  ├── Injects X-User-Id header from JWT sub claim
  └── Routes to backend service

Keycloak (Identity Provider) — called only during login:
  ├── Hosts login page / SSO
  ├── Issues JWT (Access Token, ID Token, Refresh Token)
  └── /certs endpoint → Kong fetches public keys from here
```

**Rule**: Keycloak = "prove who you are". Kong = "you're allowed in, here's where your request goes and under what rules."

---

## Quick Check
1. What is Kong built on top of, and what language are plugins written in?
2. What is the difference between DB-backed and DB-less mode? When would you choose each?
3. What is Hybrid Mode and why would you use it instead of the clustered DB-backed approach?
4. Why should port 8001 never be exposed to the public internet?
5. How does Kong Ingress Controller fit into a Kubernetes deployment?
6. Can Keycloak replace Kong? What does each tool own?
