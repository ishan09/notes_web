# Glossary

## Kong Core Entities

| Term | Definition |
|---|---|
| **Service** | A logical representation of an upstream API — stores the connection URL (host, port, path) and timeout/retry settings |
| **Route** | Rules that match incoming requests to a Service — based on path, method, host, or headers |
| **Plugin** | A module that adds behaviour to requests/responses — authentication, rate limiting, logging, transforms |
| **Consumer** | A client identity in Kong — represents an app or user; holds credentials (API keys, JWT secrets) |
| **Upstream** | A load balancer virtual host — distributes traffic across multiple Targets |
| **Target** | A single backend instance (IP:port) registered under an Upstream with an optional weight |
| **Credential** | A specific piece of auth data assigned to a Consumer — a JWT secret, API key, or OAuth2 app |
| **Tag** | A label attached to any Kong entity — used for filtering in Admin API and declarative config |
| **Workspace** | An isolation namespace for entities in Kong Enterprise — similar to Keycloak realms |

---

## Kong Architecture Terms

| Term | Definition |
|---|---|
| **OpenResty** | Nginx extended with LuaJIT — the runtime Kong is built on |
| **DB-backed mode** | Kong stores config in PostgreSQL; Admin API is read/write; nodes share config via DB |
| **DB-less mode** | Kong loads config from a YAML/JSON file at startup; Admin API is read-only |
| **Hybrid Mode** | Control Plane (CP) manages config + Admin API; Data Plane (DP) proxies traffic only |
| **Control Plane (CP)** | Kong nodes that manage configuration and push it to Data Planes |
| **Data Plane (DP)** | Kong nodes that proxy traffic; receive config from CP; no DB dependency |
| **Kong Ingress Controller (KIC)** | Kubernetes controller that watches CRDs and Ingress objects to configure Kong |
| **deck** | Official CLI for declarative Kong config management — validate, diff, sync |
| **Admin API** | REST API for managing Kong config — runs on port 8001; must not be publicly exposed |

---

## Plugin Terms

| Term | Definition |
|---|---|
| **Plugin scope** | Where a plugin applies — global, service, route, or consumer level |
| **Plugin phase** | Which part of request processing a plugin runs in — `access`, `header_filter`, `body_filter`, `log` |
| **Plugin priority** | Integer determining execution order — higher priority runs first in the same phase |
| **pre-function** | Built-in plugin for running custom Lua code without writing a full plugin |
| **post-function** | Built-in plugin for running custom Lua code in response phases |
| **fault_tolerant** | Rate limiting config — if Redis is unavailable, allow requests through (fail open) |
| **hide_credentials** | Remove the auth credential (API key, JWT) from the request before forwarding to backend |
| **strip_path** | Remove the matched path prefix from the request URL before forwarding to backend |

---

## Authentication Terms

| Term | Definition |
|---|---|
| **key-auth** | API key authentication — client sends an opaque key in header or query parameter |
| **jwt plugin** | Kong-native JWT validation — verifies tokens signed with a secret stored in Kong per-Consumer |
| **openid-connect plugin** | Validates tokens from an external OIDC provider (Keycloak, Auth0) via JWKS |
| **oauth2 plugin** | Kong as an OAuth2 authorization server — issues and validates OAuth2 tokens |
| **basic-auth** | Username/password authentication encoded in Base64 |
| **hmac-auth** | HMAC signature-based authentication — high security for API access |
| **mtls-auth** | Mutual TLS — client must present a valid certificate |
| **anonymous consumer** | Fallback Consumer used when no credentials are provided — enables partial auth |
| **JWKS** | JSON Web Key Set — Keycloak/OIDC provider's public keys endpoint used to verify JWT signatures |

---

## Traffic Management Terms

| Term | Definition |
|---|---|
| **round-robin** | Distribute requests evenly across Targets in sequence |
| **least-connections** | Route each request to the Target with the fewest active connections |
| **consistent-hashing** | Route same client (by IP, header, or cookie) to same Target — sticky sessions |
| **active health check** | Kong proactively sends probe requests to Target health endpoints |
| **passive health check** | Kong monitors real proxied traffic for consecutive failures — circuit breaker |
| **circuit breaker** | Pattern: mark a Target unhealthy after N consecutive failures; re-enable after recovery probes |
| **canary deployment** | Route a small percentage of traffic to a new version while keeping most on stable |
| **weight** | Traffic share for a Target — weight 100 + weight 50 = 67%/33% split |
| **connect_timeout** | Time Kong waits to establish a TCP connection to the upstream |
| **read_timeout** | Time Kong waits for the upstream to start sending a response |
| **retries** | How many times Kong retries a failed upstream call before returning an error |

---

## Declarative Config Terms

| Term | Definition |
|---|---|
| **kong.yaml** | Declarative configuration file for DB-less mode |
| **_format_version** | Required header in kong.yaml specifying config schema version (e.g., "3.0") |
| **deck gateway sync** | Apply a kong.yaml to a running Kong instance — idempotent, makes minimal changes |
| **deck gateway diff** | Show what would change if sync were run — dry-run |
| **deck gateway dump** | Export current Kong config to a file |
| **KongPlugin CRD** | Kubernetes Custom Resource for defining a Kong plugin |
| **KongConsumer CRD** | Kubernetes Custom Resource for defining a Kong Consumer |
| **KongIngress CRD** | Kubernetes Custom Resource for overriding Ingress routing behaviour in Kong |
| **HTTPRoute** | Gateway API (Kubernetes) resource for defining routing rules — more expressive than Ingress |

---

## Common Kong Admin API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/status` | GET | Kong health check — always returns 200 if healthy |
| `/services` | GET/POST | List or create Services |
| `/services/{id}/routes` | GET/POST | List or create Routes for a Service |
| `/services/{id}/plugins` | GET/POST | List or add Plugins scoped to a Service |
| `/routes` | GET/POST | List all Routes or create a Route |
| `/routes/{id}/plugins` | POST | Add Plugin scoped to a Route |
| `/plugins` | GET/POST | List or create global Plugins |
| `/consumers` | GET/POST | List or create Consumers |
| `/consumers/{id}/key-auth` | POST | Add API key credential to Consumer |
| `/consumers/{id}/jwt` | POST | Add JWT credential to Consumer |
| `/upstreams` | GET/POST | List or create Upstreams |
| `/upstreams/{id}/targets` | GET/POST | List or add Targets to an Upstream |
| `/upstreams/{id}/targets/{id}/healthy` | POST | Mark a Target as healthy |
| `/upstreams/{id}/targets/{id}/unhealthy` | POST | Mark a Target as unhealthy |
| `/config` | POST | Reload declarative config (DB-less mode) |
| `/cache` | DELETE | Clear Kong's config cache |
| `/metrics` | GET | Prometheus metrics (if plugin enabled) |

---

## Ports Reference

| Port | Purpose |
|---|---|
| `8000` | HTTP proxy — client traffic |
| `8443` | HTTPS proxy — client traffic (TLS) |
| `8001` | Admin API — HTTP (never expose publicly) |
| `8444` | Admin API — HTTPS |
| `8002` | Kong Manager UI — Enterprise only |
| `8003` | Dev Portal — Enterprise only |
| `8100` | Cluster communication — Data Plane to Control Plane |
