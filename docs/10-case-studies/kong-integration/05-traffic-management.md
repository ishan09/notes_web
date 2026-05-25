# Kong Traffic Management — Load Balancing, Health Checks, Canary

## Load Balancing Algorithms

Kong's Upstream entity implements load balancing across Targets.

### Round Robin (default)
Requests distributed evenly in sequence across all healthy Targets. Respects `weight`.

```yaml
upstreams:
  - name: orders-lb
    algorithm: round-robin
    targets:
      - target: 10.0.0.1:8080
        weight: 100
      - target: 10.0.0.2:8080
        weight: 100
      - target: 10.0.0.3:8080
        weight: 50     # gets half as many requests
```

### Least Connections
Routes each new request to the Target with the fewest active connections. Better for variable-length requests (some requests take 10ms, others 5s).

```yaml
upstreams:
  - name: orders-lb
    algorithm: least-connections
```

**When to use**: Long-lived connections (streaming, file uploads) where round-robin leads to hotspots.

### Consistent Hashing
Same client always goes to the same Target (by IP, header, or consumer). Useful for sticky sessions without cookies.

```yaml
upstreams:
  - name: orders-lb
    algorithm: consistent-hashing
    hash_on: ip            # or: header, cookie, consumer, path
    hash_on_header: X-User-Id   # if hash_on=header
    hash_fallback: ip      # fallback if header is missing
```

**When to use**: Caching (same upstream sees same requests → higher cache hit rate), session affinity.

---

## Health Checks

Kong continuously monitors Target health and automatically removes unhealthy ones from rotation.

### Active Health Checks
Kong proactively sends HTTP requests to a health endpoint on each Target:

```yaml
upstreams:
  - name: orders-lb
    algorithm: round-robin
    healthchecks:
      active:
        type: http          # or https, tcp, grpc
        http_path: /health
        https_verify_certificate: true
        timeout: 5
        concurrency: 10     # parallel health check requests
        healthy:
          interval: 5             # check every 5s
          successes: 2            # need 2 successes to mark healthy
          http_statuses: [200, 302]
        unhealthy:
          interval: 5
          http_failures: 3        # 3 failures → mark unhealthy
          tcp_failures: 3
          timeouts: 3
          http_statuses: [500, 502, 503, 504]
```

### Passive Health Checks (Circuit Breaker)
Kong monitors actual proxied traffic — if a Target returns too many errors, Kong marks it unhealthy:

```yaml
healthchecks:
  passive:
    type: http
    healthy:
      successes: 5            # 5 consecutive successes re-enables target
      http_statuses: [200, 201, 202]
    unhealthy:
      http_failures: 5        # 5 consecutive failures → disable target
      tcp_failures: 5
      timeouts: 5
      http_statuses: [429, 500, 503]
```

**Active vs Passive:**
| | Active | Passive |
|---|---|---|
| How it works | Kong sends probe requests | Kong watches real traffic |
| Detects failure | Before real traffic hits | After real traffic fails |
| Overhead | Small — probe requests | None |
| Can recover? | Yes — probes continue | No — needs active to re-enable |
| Use together? | Yes — recommended | Yes |

**Best practice**: Enable both. Passive catches failures fast (from real traffic). Active re-enables targets after recovery.

---

## Canary Deployments

Shift a percentage of traffic to a new version while keeping most on the stable version.

### Method 1: Weight-based (Upstream Targets)

```yaml
upstreams:
  - name: orders-lb
    targets:
      - target: orders-v1:8080
        weight: 90    # 90% of traffic → stable
      - target: orders-v2:8080
        weight: 10    # 10% of traffic → canary
```

Gradually increase v2 weight as confidence grows:
```
Deploy:    v1=100, v2=0
Canary 1:  v1=90,  v2=10   (monitor errors, latency)
Canary 2:  v1=70,  v2=30
Canary 3:  v1=50,  v2=50
Full:      v1=0,   v2=100  (rename v2→v1)
```

**Admin API — live weight change (no config reload needed):**
```bash
curl -X PATCH http://localhost:8001/upstreams/orders-lb/targets/orders-v2:8080 \
  --data weight=30
```

### Method 2: Header-based (pre-function plugin)

```yaml
# Route to canary for internal testers based on header
routes:
  - name: orders-canary
    paths: [/api/orders]
    headers:
      X-Canary: ["true"]     # route only if header present
    service: orders-v2-service

  - name: orders-stable
    paths: [/api/orders]     # catch-all for everyone else
    service: orders-v1-service
```

```yaml
# Or use pre-function to do percentage split programmatically
plugins:
  - name: pre-function
    config:
      access:
        - |
          local random = math.random(100)
          if random <= 10 then
            kong.service.set_target("orders-v2", 8080)
          end
```

---

## Circuit Breaker Pattern

Kong's passive health checks implement a circuit breaker. When a Target accumulates failures, Kong "opens the circuit" (removes the target from rotation).

```
Circuit CLOSED (normal):
    Request → orders-v1:8080 (healthy target)
    
After 5 consecutive 500s from orders-v1:
Circuit OPENS:
    Kong marks orders-v1:8080 unhealthy
    Traffic shifts to other healthy targets
    Active health check probes continue
    
After 2 consecutive health check successes:
Circuit CLOSES (recovery):
    orders-v1:8080 re-added to rotation
```

**Combined active + passive for circuit breaker:**
```yaml
upstreams:
  - name: orders-lb
    healthchecks:
      passive:
        unhealthy:
          http_failures: 5        # open circuit after 5 failures
          http_statuses: [500, 502, 503]
      active:
        http_path: /health
        healthy:
          interval: 10
          successes: 2            # close circuit after 2 successes
        unhealthy:
          interval: 5
          http_failures: 3
```

---

## Request Timeout and Retry

```yaml
services:
  - name: orders-service
    url: http://orders-lb
    connect_timeout: 5000    # TCP connection timeout (ms)
    read_timeout: 30000      # waiting for upstream to respond (ms)
    write_timeout: 30000     # sending request body to upstream (ms)
    retries: 3               # how many times to retry on failure
```

**Retries are safe only for idempotent operations** (GET, HEAD, PUT). Do not retry POST requests — they can cause duplicate operations. Kong retries on connection failures, not on 5xx errors by default.

---

## Traffic Splitting for Blue/Green Deployment

```yaml
# Blue/Green — instant switch via service URL change
services:
  - name: orders-service
    url: http://orders-blue:8080   # change to orders-green when ready

# Or use two services + manual route switch:
services:
  - name: orders-blue
    url: http://orders-blue:8080
  - name: orders-green
    url: http://orders-green:8080

routes:
  - name: orders-route
    paths: [/api/orders]
    service: orders-blue       # change to orders-green for cutover
```

---

## Upstream Host Override

When Kong forwards a request, the `Host` header defaults to the Service's host. Sometimes backends need the original client hostname:

```yaml
routes:
  - name: orders-route
    preserve_host: true    # forward original Host header from client
    # or
    preserve_host: false   # use Service host (default)
```

---

## Rate Limiting as Traffic Control

Rate limiting also acts as traffic shaping — protecting backends from sudden spikes:

```yaml
# Burst handling: allow 10/second but smooth it out
plugins:
  - name: rate-limiting
    config:
      second: 10
      minute: 300     # 5/second average — allows bursts up to 10/s
      policy: redis
      fault_tolerant: true
```

---

## Quick Check
1. What is the difference between active and passive health checks? Why use both?
2. When would you choose `least-connections` over `round-robin`?
3. What happens to traffic when a Target is marked unhealthy? How does it recover?
4. Describe two approaches to implementing canary deployment in Kong.
5. Why is `retries: 3` on a Service dangerous for POST requests?
6. What does `consistent-hashing` on `X-User-Id` header achieve, and when is this useful?
