# Kong Core Entities

## The Five Core Entities

```
Service    → where to proxy the request (upstream URL)
Route      → which requests match this Service (path, method, host)
Plugin     → what to do with the request/response (auth, rate limit)
Consumer   → who is making the request (an identity)
Upstream   → load balancer (distributes across Targets)
Target     → a single backend instance (IP:port)
```

---

## Service

A **Service** represents an upstream API you are proxying. It holds the connection information to your backend.

```bash
# Create a Service via Admin API
curl -X POST http://localhost:8001/services \
  --data name=orders-service \
  --data url=http://orders-api:8080

# Or split into components:
curl -X POST http://localhost:8001/services \
  --data name=orders-service \
  --data host=orders-api \
  --data port=8080 \
  --data path=/
```

```yaml
# Declarative config (kong.yaml)
services:
  - name: orders-service
    url: http://orders-api:8080
    connect_timeout: 60000   # ms
    write_timeout: 60000
    read_timeout: 60000
    retries: 5
```

**Key fields:**
- `url` — shorthand for host + port + path + protocol
- `retries` — how many times Kong retries a failed upstream call
- `connect_timeout`, `write_timeout`, `read_timeout` — milliseconds

---

## Route

A **Route** defines the rules that map an incoming request to a Service. One Service can have multiple Routes.

```bash
# Create a Route on the orders-service
curl -X POST http://localhost:8001/services/orders-service/routes \
  --data "paths[]=/api/orders" \
  --data "methods[]=GET" \
  --data "methods[]=POST" \
  --data name=orders-route
```

```yaml
# Declarative config
services:
  - name: orders-service
    url: http://orders-api:8080
    routes:
      - name: orders-route
        paths:
          - /api/orders
        methods:
          - GET
          - POST
        strip_path: true        # removes matched prefix before forwarding
        preserve_host: false    # use Service host, not original Host header
```

**Matching rules** (all specified fields must match):
| Field | Example | Matches |
|---|---|---|
| `paths` | `/api/orders` | Any path starting with `/api/orders` |
| `methods` | `["GET", "POST"]` | GET or POST only |
| `hosts` | `["api.example.com"]` | Host header equals `api.example.com` |
| `headers` | `{"X-Version": ["v2"]}` | Request has `X-Version: v2` header |

**`strip_path`**: If `true`, Kong removes the matched path prefix before forwarding.
```
Client: GET /api/orders/123
Route path: /api/orders
strip_path=true  → backend receives: GET /123
strip_path=false → backend receives: GET /api/orders/123
```

**Route priority**: Kong matches routes in this order:
1. Longer paths first
2. More specific methods over catch-all
3. Explicit hosts over wildcard hosts

---

## Plugin

A **Plugin** adds behaviour to requests and responses. Plugins can be scoped at different levels:

```
Global level   → applies to ALL requests through Kong
Service level  → applies to all routes of a specific Service
Route level    → applies to requests matching a specific Route
Consumer level → applies to requests from a specific Consumer
```

```bash
# Add rate limiting globally
curl -X POST http://localhost:8001/plugins \
  --data name=rate-limiting \
  --data config.minute=100 \
  --data config.policy=local

# Add rate limiting to a specific Service
curl -X POST http://localhost:8001/services/orders-service/plugins \
  --data name=rate-limiting \
  --data config.minute=50

# Add authentication to a Route
curl -X POST http://localhost:8001/routes/orders-route/plugins \
  --data name=jwt
```

```yaml
# Declarative — plugin on a route
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
              policy: redis     # shared across Kong nodes
              redis_host: redis
              redis_port: 6379
          - name: jwt
```

**Plugin execution order**: Kong executes plugins in a deterministic order based on plugin priority (a fixed integer). `pre-function` (10000) runs before `jwt` (1005) runs before `rate-limiting` (901). You can't change this order within the same phase.

---

## Consumer

A **Consumer** represents a client identity — an API consumer (an app, a service, or a user). Consumers hold credentials (API keys, JWT secrets, OAuth2 tokens).

```bash
# Create a Consumer
curl -X POST http://localhost:8001/consumers \
  --data username=mobile-app \
  --data custom_id=app-123

# Give the Consumer a JWT credential
curl -X POST http://localhost:8001/consumers/mobile-app/jwt \
  --data algorithm=RS256 \
  --data rsa_public_key="-----BEGIN PUBLIC KEY-----..."

# Give the Consumer an API key
curl -X POST http://localhost:8001/consumers/mobile-app/key-auth \
  --data key=my-secret-api-key
```

**Why Consumers matter:**
- Rate limits can be applied per-Consumer (not just per-IP)
- Plugins can be applied to a specific Consumer (e.g., bypass rate limiting for a premium consumer)
- Logs include Consumer identity — better audit trails

```yaml
consumers:
  - username: mobile-app
    keyauth_credentials:
      - key: my-secret-api-key
    jwt_secrets:
      - algorithm: HS256
        secret: my-jwt-secret
```

---

## Upstream and Target

An **Upstream** is a load balancer virtual host. A **Target** is a single backend instance registered under an Upstream.

```
Service.host = orders-lb        ← points to Upstream name
Upstream: orders-lb
    ├── Target: 10.0.0.1:8080  (weight=100)
    ├── Target: 10.0.0.2:8080  (weight=100)
    └── Target: 10.0.0.3:8080  (weight=50)   ← gets half the traffic
```

```bash
# Create Upstream
curl -X POST http://localhost:8001/upstreams \
  --data name=orders-lb \
  --data algorithm=round-robin

# Add Targets
curl -X POST http://localhost:8001/upstreams/orders-lb/targets \
  --data target=10.0.0.1:8080 \
  --data weight=100

curl -X POST http://localhost:8001/upstreams/orders-lb/targets \
  --data target=10.0.0.2:8080 \
  --data weight=100
```

```yaml
upstreams:
  - name: orders-lb
    algorithm: round-robin    # or least-connections, consistent-hashing
    healthchecks:
      active:
        http_path: /health
        healthy:
          interval: 5
          successes: 2
        unhealthy:
          interval: 5
          http_failures: 3
    targets:
      - target: 10.0.0.1:8080
        weight: 100
      - target: 10.0.0.2:8080
        weight: 100
```

**Disabling a target** (mark unhealthy without deleting):
```bash
curl -X POST http://localhost:8001/upstreams/orders-lb/targets/10.0.0.2:8080/unhealthy
```

**Target weight**: Determines traffic share. Weight 100 + weight 100 = 50/50 split. Weight 100 + weight 50 = 67/33 split. Weight 0 = no traffic (effectively disabled without removing).

---

## Entity Relationships

```
Upstream (orders-lb)
    └── Target (10.0.0.1:8080)
    └── Target (10.0.0.2:8080)

Service (orders-service)  → host: orders-lb (references Upstream)
    └── Plugin (rate-limiting) — service-scoped
    └── Route (orders-route)   → path=/api/orders
            └── Plugin (jwt)   — route-scoped

Consumer (mobile-app)
    └── JWT credential
    └── Plugin (rate-limiting, config.minute=1000) — consumer-scoped override
```

---

## Admin API — Key Endpoints

```
GET    /services                    — list all services
POST   /services                    — create service
GET    /services/{id}/routes        — list routes for service
POST   /services/{id}/plugins       — add plugin to service
GET    /routes                      — list all routes
POST   /consumers                   — create consumer
POST   /consumers/{id}/jwt          — add JWT credential to consumer
GET    /upstreams                   — list upstreams
POST   /upstreams/{id}/targets      — add target
GET    /plugins                     — list all plugins
DELETE /plugins/{id}                — remove plugin
POST   /cache                       — clear config cache (DB-less)
GET    /status                      — health check
```

---

## Quick Check
1. What is the difference between a Service and a Route?
2. What does `strip_path=true` do, and when would you set it to false?
3. At what levels can a Plugin be scoped? Which level takes precedence?
4. What is the difference between an Upstream and a Target?
5. Why would you set a Target's weight to 0 instead of deleting it?
6. What is a Consumer, and how does it differ from a Route or Service?
