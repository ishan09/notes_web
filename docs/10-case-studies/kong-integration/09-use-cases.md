# Kong Use Cases

## Use Case 1: Microservices API Gateway

**Scenario**: A platform with 10+ microservices (orders, inventory, payments, users, notifications). Every service needs auth, rate limiting, and logging. Without a gateway, each service implements this independently.

```
Client → Kong → Orders Service
              → Inventory Service
              → Payment Service
              → Notification Service

Kong enforces: JWT auth, rate limits, logging, CORS — for all services
```

```yaml
# kong.yaml — centralized policy
_format_version: "3.0"

# Global plugins — apply to every request
plugins:
  - name: cors
    config:
      origins: [https://app.example.com]
      credentials: true
  - name: http-log
    config:
      http_endpoint: https://logs.example.com/kong

services:
  - name: orders-service
    url: http://orders-lb
    routes:
      - name: orders-route
        paths: [/api/orders]
        plugins:
          - name: jwt
          - name: rate-limiting
            config: { minute: 200, policy: redis, redis_host: redis }

  - name: inventory-service
    url: http://inventory-lb
    routes:
      - name: inventory-route
        paths: [/api/inventory]
        plugins:
          - name: key-auth
            config: { hide_credentials: true }
          - name: rate-limiting
            config: { minute: 100, policy: redis, redis_host: redis }

  - name: payments-service
    url: http://payments-lb
    routes:
      - name: payments-route
        paths: [/api/payments]
        methods: [POST]
        plugins:
          - name: openid-connect
            config:
              issuer: https://keycloak.example.com/realms/my-realm/.well-known/openid-configuration
          - name: ip-restriction
            config:
              allow: [10.0.0.0/8]     # only internal network can call payments
          - name: rate-limiting
            config: { minute: 20, policy: redis, redis_host: redis }
```

---

## Use Case 2: Canary Deployment for Zero-Downtime Releases

**Scenario**: Releasing orders-service v2. Want to test with 5% of real traffic before full rollout.

```yaml
upstreams:
  - name: orders-lb
    algorithm: round-robin
    targets:
      - target: orders-v1:8080
        weight: 95    # 95% to stable
      - target: orders-v2:8080
        weight: 5     # 5% to canary

services:
  - name: orders-service
    host: orders-lb    # Kong routes through the Upstream
```

**Gradual rollout script:**
```bash
#!/bin/bash
# canary-rollout.sh — gradually shift traffic to v2
WEIGHTS=(5 10 25 50 75 90 100)

for W in "${WEIGHTS[@]}"; do
  echo "Shifting $W% to v2..."
  
  # Update weights
  curl -X PATCH http://localhost:8001/upstreams/orders-lb/targets/orders-v2:8080 \
    --data weight=$W
  curl -X PATCH http://localhost:8001/upstreams/orders-lb/targets/orders-v1:8080 \
    --data weight=$((100-W))
  
  # Wait and check error rates from your monitoring
  echo "Waiting 5 minutes... check Grafana dashboard"
  sleep 300
  
  # Rollback if error rate > 1%:
  # curl -X PATCH .../targets/orders-v2:8080 --data weight=0
done

echo "Full rollout complete"
```

**Per-employee header-based canary (internal testing):**
```yaml
# Route testers to v2 via header
routes:
  - name: orders-canary-internal
    paths: [/api/orders]
    headers:
      X-Canary: ["true"]
    service: orders-v2-service    # separate service pointing to v2

  - name: orders-stable
    paths: [/api/orders]
    service: orders-service       # stable
```

---

## Use Case 3: B2B API Monetization

**Scenario**: Exposing APIs to external partners. Different partners have different rate limits (free tier, basic, premium). Need API key management, usage tracking, and billing data.

```yaml
consumers:
  - username: free-partner-acme
    custom_id: partner-001
    keyauth_credentials:
      - key: sk-acme-free-xyz123
    plugins:
      - name: rate-limiting
        config:
          month: 10000     # 10k requests/month
          minute: 10
      - name: response-transformer
        config:
          add:
            headers:
              - X-RateLimit-Tier:free

  - username: premium-partner-globex
    custom_id: partner-002
    keyauth_credentials:
      - key: sk-globex-premium-abc789
    plugins:
      - name: rate-limiting
        config:
          month: 1000000    # 1M requests/month
          minute: 1000
      - name: response-transformer
        config:
          add:
            headers:
              - X-RateLimit-Tier:premium

# API service with key-auth
services:
  - name: partner-api
    url: http://api-backend:8080
    routes:
      - name: partner-api-route
        paths: [/v1]
        plugins:
          - name: key-auth
            config:
              hide_credentials: true
          - name: http-log
            config:
              http_endpoint: https://billing.example.com/usage
              # Logs include consumer.custom_id for billing attribution
```

**Usage data sent to billing system (http-log format):**
```json
{
  "consumer": {
    "username": "premium-partner-globex",
    "custom_id": "partner-002"
  },
  "service": { "name": "partner-api" },
  "request": { "method": "GET", "uri": "/v1/data" },
  "response": { "status": 200 }
}
```

---

## Use Case 4: Kubernetes Microservices with Kong Ingress Controller

**Scenario**: All services in Kubernetes. Need path-based routing, rate limiting, and JWT authentication managed via GitOps (kubectl apply, not Admin API calls).

```yaml
# 1. Define the plugin (KongPlugin CRD)
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: default
plugin: jwt
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting-standard
plugin: rate-limiting
config:
  minute: 100
  policy: redis
  redis_host: redis-master.default.svc.cluster.local
---

# 2. Apply to an Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-ingress
  annotations:
    konghq.com/plugins: jwt-auth, rate-limiting-standard
    konghq.com/strip-path: "true"
    konghq.com/protocols: https
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
          - path: /api/inventory
            pathType: Prefix
            backend:
              service:
                name: inventory-service
                port:
                  number: 8080
```

```yaml
# 3. Consumer with credentials stored as Kubernetes Secret
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: mobile-app
  annotations:
    kubernetes.io/ingress.class: kong
username: mobile-app
credentials:
  - mobile-app-jwt
---
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt
  labels:
    konghq.com/credential: jwt
type: Opaque
stringData:
  kongCredType: jwt
  algorithm: HS256
  secret: "change-me-in-production"
```

---

## Use Case 5: Internal Service Mesh Gateway (North-South + East-West)

**Scenario**: Large platform with both external traffic (browser clients) and internal service-to-service calls. Use Kong for both north-south (external → internal) and east-west (service → service).

```
External Clients
        ↓
Kong (public listener, port 443)   ← north-south
        ↓
Service A ──→ Kong (internal listener, port 8000)  ← east-west
                    ↓
              Service B, Service C

# Different plugin sets:
External listener: JWT auth, CORS, rate limiting, IP restriction
Internal listener: mTLS auth only, no rate limiting, verbose logging
```

```yaml
# Separate listener configs in kong.conf
proxy_listen = 0.0.0.0:443 ssl http2,                # external
               10.0.0.1:8000 reuseport               # internal only

# Internal routes have a different Host header matcher
routes:
  - name: inventory-internal
    hosts: [inventory.internal.svc]    # only reachable on internal network
    paths: [/]
    plugins:
      - name: mtls-auth
        config:
          ca_certificates: [internal-ca-id]
```

---

## Use Case 6: API Versioning Strategy

**Scenario**: Running v1 and v2 of an API simultaneously. Route based on path, header, or consumer.

```yaml
# Path-based versioning
routes:
  - name: orders-v1-route
    paths: [/v1/orders]
    service: orders-v1-service

  - name: orders-v2-route
    paths: [/v2/orders]
    service: orders-v2-service

# Header-based versioning (clean URLs)
routes:
  - name: orders-v2-header
    paths: [/api/orders]
    headers:
      Accept-Version: ["v2", "2.0"]
    service: orders-v2-service

  - name: orders-v1-default
    paths: [/api/orders]
    service: orders-v1-service    # default to v1

# Consumer-based: opt specific consumers into v2
consumers:
  - username: beta-partner
    plugins:
      - name: pre-function
        config:
          access:
            - |
              kong.service.set_upstream("orders-v2-lb")
```

---

## Quick Check
1. In the canary deployment use case, what is the advantage of weight-based routing over header-based routing?
2. Why does the payments route in Use Case 1 have an IP restriction plugin in addition to OIDC?
3. In the B2B API monetization scenario, how does the billing system know which partner made a request?
4. What is the difference between KIC-managed config and directly calling the Admin API?
5. Why would you want separate Kong listener addresses for external and internal traffic?
