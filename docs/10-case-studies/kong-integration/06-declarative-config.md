# Kong Declarative Configuration — DB-less, deck, KIC

## Why Declarative Config?

In DB-backed Kong, you configure by calling the Admin API imperatively:
```bash
curl -X POST .../services ...
curl -X POST .../routes ...
curl -X POST .../plugins ...
```

Problems:
- No version control — changes are not tracked
- Drift — dev/staging/prod can diverge silently
- No CI/CD pipeline integration
- No rollback

Declarative config solves this:
```yaml
# kong.yaml — checked into git, applied atomically
_format_version: "3.0"
services:
  - name: orders-service
    url: http://orders-api:8080
    routes:
      - name: orders-route
        paths: [/api/orders]
        plugins:
          - name: rate-limiting
            config:
              minute: 100
```

---

## DB-less Mode

Kong runs entirely without a database. Configuration is loaded from a YAML/JSON file at startup. Admin API is read-only.

```bash
# kong.conf (or environment variables)
KONG_DATABASE=off
KONG_DECLARATIVE_CONFIG=/etc/kong/kong.yaml
```

**Reloading config without restart:**
```bash
# Send reload signal — Kong re-reads the config file
kill -HUP $(cat /var/run/kong.pid)

# Or via Admin API:
curl -X POST http://localhost:8001/config \
  -F config=@kong.yaml
```

**Critical DB-less limitation**: Admin API is **read-only**. You cannot POST to `/services` or `/plugins` to add config at runtime. All changes go through the config file → reload.

---

## Full kong.yaml Structure

```yaml
_format_version: "3.0"
_transform: true       # enable automatic YAML transformations

# ── Services ───────────────────────────────────────────────
services:
  - name: orders-service
    url: http://orders-lb         # points to Upstream name
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
    retries: 3
    tags: [backend, orders, v2]

    routes:
      - name: orders-route
        paths:
          - /api/orders
        methods: [GET, POST, PUT, DELETE]
        strip_path: false
        preserve_host: false
        protocols: [http, https]
        plugins:
          - name: jwt
          - name: rate-limiting
            config:
              minute: 100
              policy: redis
              redis_host: redis
              redis_port: 6379

  - name: inventory-service
    url: http://inventory-lb
    routes:
      - name: inventory-route
        paths: [/api/inventory]
        plugins:
          - name: key-auth
            config:
              hide_credentials: true

# ── Global Plugins ─────────────────────────────────────────
plugins:
  - name: cors
    config:
      origins: [https://app.example.com]
      methods: [GET, POST, PUT, DELETE, OPTIONS]
      headers: [Authorization, Content-Type]
      credentials: true
      max_age: 3600

  - name: http-log
    config:
      http_endpoint: https://logs.example.com/kong
      method: POST
      timeout: 10000

# ── Consumers ──────────────────────────────────────────────
consumers:
  - username: mobile-app
    custom_id: app-001
    tags: [mobile, production]
    keyauth_credentials:
      - key: sk-mobile-abc123
    jwt_secrets:
      - algorithm: HS256
        secret: mobile-jwt-secret-xyz

  - username: partner-api
    keyauth_credentials:
      - key: sk-partner-xyz789
    plugins:
      - name: rate-limiting
        config:
          minute: 6000    # partner gets higher limit

# ── Upstreams ──────────────────────────────────────────────
upstreams:
  - name: orders-lb
    algorithm: round-robin
    healthchecks:
      active:
        http_path: /health
        healthy:
          interval: 10
          successes: 2
        unhealthy:
          interval: 5
          http_failures: 3
      passive:
        unhealthy:
          http_failures: 5
    targets:
      - target: orders-api-1:8080
        weight: 100
      - target: orders-api-2:8080
        weight: 100

  - name: inventory-lb
    algorithm: least-connections
    targets:
      - target: inventory-api:8080
        weight: 100
```

---

## deck CLI — The Recommended Tool

**deck** (Declarative Configuration for Kong) is the official CLI for managing Kong configuration:

```bash
# Install
brew install kong/kong/deck

# Export current Kong config to a file
deck gateway dump --output-file kong.yaml --workspace default

# Validate a config file (dry-run — no changes applied)
deck gateway validate --state kong.yaml

# Diff — show what would change
deck gateway diff --state kong.yaml

# Apply config (deploy to Kong)
deck gateway sync --state kong.yaml
```

**deck sync is idempotent** — run it multiple times safely. It only makes the minimum changes needed to match the desired state.

```
$ deck gateway diff --state kong.yaml

creating service orders-service
creating route orders-route
creating plugin rate-limiting for route orders-route
updating plugin cors (global)
```

### Multi-environment with deck:

```bash
# Use environment variables for environment-specific values
# kong.yaml references them with ${{ env "VAR_NAME" }}

KONG_ADMIN_URL=http://kong-prod:8001 \
REDIS_HOST=redis-prod.internal \
deck gateway sync \
  --state kong.yaml \
  --env-var REDIS_HOST
```

### CI/CD Pipeline with deck:

```yaml
# .github/workflows/kong-deploy.yml
name: Deploy Kong Config

on:
  push:
    branches: [main]
    paths: ['kong/**']

jobs:
  deploy:
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Kong config
        run: deck gateway validate --state kong/kong.yaml
        
      - name: Diff (dry-run)
        run: deck gateway diff --state kong/kong.yaml
        env:
          DECK_KONG_ADDR: http://kong-staging:8001
          
      - name: Sync to staging
        run: deck gateway sync --state kong/kong.yaml
        env:
          DECK_KONG_ADDR: http://kong-staging:8001
          
      - name: Sync to production
        if: github.ref == 'refs/heads/main'
        run: deck gateway sync --state kong/kong.yaml
        env:
          DECK_KONG_ADDR: http://kong-prod:8001
```

---

## Kong Ingress Controller (KIC)

In Kubernetes, KIC watches Kubernetes objects and automatically translates them into Kong configuration.

### Native Ingress:
```yaml
# Standard Kubernetes Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-ingress
  annotations:
    konghq.com/strip-path: "true"
    konghq.com/plugins: rate-limiting-plugin, jwt-plugin
spec:
  ingressClassName: kong
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/orders
            pathType: Prefix
            backend:
              service:
                name: orders-service
                port:
                  number: 8080
```

### KongPlugin CRD (custom resource):
```yaml
# Define a plugin as a Kubernetes resource
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting-plugin
plugin: rate-limiting
config:
  minute: 100
  policy: redis
  redis_host: redis-master
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-plugin
plugin: jwt
```

### KongConsumer CRD:
```yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: mobile-app
  annotations:
    kubernetes.io/ingress.class: kong
username: mobile-app
credentials:
  - mobile-app-jwt-secret    # references a Kubernetes Secret
---
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt-secret
  labels:
    konghq.com/credential: jwt
stringData:
  kongCredType: jwt
  algorithm: HS256
  secret: "jwt-signing-secret-here"
```

### HTTPRoute (Gateway API — newer standard):
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: orders-route
  annotations:
    konghq.com/plugins: rate-limiting-plugin
spec:
  parentRefs:
    - name: kong-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/orders
      backendRefs:
        - name: orders-service
          port: 8080
```

---

## Secrets Management in Declarative Config

Never store secrets in kong.yaml directly. Use Vault references:

```yaml
# Reference secrets from Vault (Kong Enterprise)
plugins:
  - name: openid-connect
    config:
      client_secret: "{vault://hcv/kong/oidc-client-secret}"

# Or reference Kubernetes secrets (KIC)
# Secrets are passed as Kubernetes Secret objects, not inline in CRDs
```

For OSS: Use environment variables referenced in kong.yaml:
```yaml
plugins:
  - name: http-log
    config:
      http_endpoint: "http://logs.example.com/kong"
      # Sensitive values: set as env vars, reference in plugin
```

---

## Quick Check
1. What is the key limitation of DB-less mode that makes it unsuitable for dynamic environments?
2. What does `deck gateway diff` do and why is it critical in a CI/CD pipeline?
3. How does KIC differ from DB-less mode in how configuration is managed?
4. Why is `deck gateway sync` safe to run multiple times?
5. How would you handle environment-specific values (like Redis host) in a shared kong.yaml used across staging and production?
