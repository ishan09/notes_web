# Kong Plugins — Rate Limiting, Transformation, Logging

## Plugin Lifecycle Phases

Every Kong plugin can implement these phases (Lua functions):

```lua
-- Plugin phases in order of execution:
function MyPlugin:init_worker()  end  -- runs once at worker startup
function MyPlugin:rewrite()      end  -- URL rewriting before routing
function MyPlugin:access()       end  -- pre-proxy: auth, rate limit, transforms
function MyPlugin:header_filter() end -- modify response headers
function MyPlugin:body_filter()  end  -- modify response body (streaming)
function MyPlugin:log()          end  -- async logging after response sent
```

`access` is where most policy enforcement happens (auth, rate limiting).
`log` is async — it does not block the response, so use it for side effects.

---

## Rate Limiting Plugin

Limits how many requests a Consumer or IP can make in a window.

```yaml
# Apply to a Route
plugins:
  - name: rate-limiting
    config:
      second: 10        # max 10 req/second
      minute: 100       # max 100 req/minute
      hour: 10000       # max 10000 req/hour
      policy: redis     # shared across Kong nodes
      redis_host: redis-master
      redis_port: 6379
      redis_timeout: 2000
      hide_client_headers: false   # exposes X-RateLimit-* headers to client
      fault_tolerant: true         # if Redis is down, allow requests through
```

**Policies:**
| Policy | Description | Use case |
|---|---|---|
| `local` | In-memory per Kong node | Dev, single-node — fast but inaccurate under cluster |
| `cluster` | Shared via Kong DB | DB-backed deployments |
| `redis` | Shared via Redis | Recommended for production clusters |

**Consumer-level override:**
```yaml
consumers:
  - username: premium-app
    plugins:
      - name: rate-limiting
        config:
          minute: 10000    # premium consumer gets higher limits
```

**Response headers exposed to client:**
```
X-RateLimit-Limit-Minute: 100
X-RateLimit-Remaining-Minute: 87
RateLimit-Reset: 1716000360
```

**429 Too Many Requests** is returned when limit exceeded.

---

## Request Transformer Plugin

Adds, removes, or replaces headers and query parameters on the request before it reaches the upstream.

```yaml
plugins:
  - name: request-transformer
    config:
      add:
        headers:
          - X-Service-Name:orders-api
          - X-Request-ID:$(uuid)      # dynamic — from Kong vars
        querystring:
          - version:v2
      remove:
        headers:
          - Authorization    # strip auth header before forwarding
          - Cookie
      replace:
        headers:
          - Host:internal-orders.svc.cluster.local
      rename:
        headers:
          - X-Old-Name:X-New-Name
```

**Common use cases:**
- Add internal headers (`X-Tenant-Id`, `X-User-Id`) extracted from JWT
- Strip sensitive headers before forwarding to backend
- Add API version header downstream
- Replace `Host` header for virtual hosting

---

## Response Transformer Plugin

Modifies response headers and body before returning to the client.

```yaml
plugins:
  - name: response-transformer
    config:
      add:
        headers:
          - X-Kong-Upstream:orders-api
          - Cache-Control:no-store
      remove:
        headers:
          - Server           # don't expose server software
          - X-Powered-By
      replace:
        headers:
          - Content-Type:application/json; charset=utf-8
```

---

## Proxy Cache Plugin

Caches upstream responses in memory (or via Redis), reducing backend load for identical requests.

```yaml
plugins:
  - name: proxy-cache
    config:
      response_code: [200, 301, 404]   # which responses to cache
      request_method: [GET, HEAD]       # only cache safe methods
      content_type: [application/json]  # only cache this content type
      cache_ttl: 300                    # seconds
      strategy: memory                  # or redis
      cache_control: false              # respect upstream Cache-Control?
```

**Response headers added:**
```
X-Cache-Status: Hit    # or Miss, Bypass, Refresh
X-Cache-Key: <hash>
Age: 42                # seconds since cached
```

**Cache key**: MD5 hash of method + URL + headers (configurable which headers to include).

---

## CORS Plugin

Handles preflight OPTIONS requests and adds CORS headers.

```yaml
plugins:
  - name: cors
    config:
      origins:
        - https://app.example.com
        - https://admin.example.com
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - X-Request-ID
      exposed_headers:
        - X-RateLimit-Remaining-Minute
      credentials: true      # allow cookies / Authorization header
      max_age: 3600          # preflight cache duration (seconds)
      preflight_continue: false  # return 200 for OPTIONS, don't proxy
```

**Never use `origins: ["*"]` with `credentials: true`** — browsers block this combination.

---

## Logging Plugins

### HTTP Log
Sends request/response logs as JSON to an HTTP endpoint (Splunk, Datadog, custom collector):

```yaml
plugins:
  - name: http-log
    config:
      http_endpoint: https://logs.example.com/kong
      method: POST
      timeout: 10000
      keepalive: 60000
      flush_timeout: 2
      retry_count: 10
      queue:
        max_batch_size: 200
        max_coalescing_delay: 1
```

### File Log
Writes logs to a local file (useful for ELK stack or Fluentd sidecar):

```yaml
plugins:
  - name: file-log
    config:
      path: /tmp/kong-access.log
      reopen: false    # reopen on each log entry (for log rotation)
```

### TCP Log / UDP Log
For streaming to Logstash, Splunk HEC, etc.

### Log format (common fields):
```json
{
  "request": {
    "method": "GET",
    "url": "http://orders-api/api/orders/123",
    "size": 0,
    "headers": {},
    "querystring": {}
  },
  "response": {
    "status": 200,
    "size": 1024,
    "headers": {},
    "latencies": {
      "proxy": 12,     // ms — time upstream took
      "kong": 3,       // ms — Kong processing overhead
      "request": 15    // ms — total
    }
  },
  "consumer": {
    "id": "uuid",
    "username": "mobile-app"
  },
  "service": { "name": "orders-service" },
  "route": { "name": "orders-route" }
}
```

---

## IP Restriction Plugin

Allow or deny requests from specific IP addresses or CIDR ranges:

```yaml
plugins:
  - name: ip-restriction
    config:
      allow:
        - 10.0.0.0/8       # internal network
        - 203.0.113.42     # specific IP
      deny:
        - 0.0.0.0/0        # deny all (use allow instead)
      status: 403           # HTTP status when denied
      message: "Access denied"
```

---

## Pre-function / Post-function Plugins (Serverless)

Run arbitrary Lua code in any phase — useful for custom logic without writing a full plugin:

```yaml
plugins:
  - name: pre-function
    config:
      access:
        - |
          local tenant_id = kong.request.get_header("X-Tenant-Id")
          if not tenant_id then
            return kong.response.exit(400, { message = "X-Tenant-Id header required" })
          end
          kong.service.request.set_header("X-Validated-Tenant", tenant_id)
```

**Use pre-function for**:
- Custom request validation
- Header enrichment from request context
- Feature flags based on headers

---

## Plugin Ordering (Priority)

Higher priority = runs first. You cannot change priority within the same phase, but Kong 3.x introduced `ordering` for explicit ordering:

```yaml
plugins:
  - name: pre-function
    ordering:
      before:
        access:
          - rate-limiting   # run pre-function BEFORE rate-limiting in access phase
```

Common plugin priorities (built-in):
```
pre-function:    10000
jwt:             1005
key-auth:        1003
oauth2:          1004
rate-limiting:   901
request-transformer: 801
cors:            2000
response-transformer: 800
http-log:        12
file-log:        9
```

---

## Quick Check
1. What is the difference between the `access` and `log` plugin phases?
2. Why is `policy: redis` recommended over `policy: local` for rate limiting in a cluster?
3. What does `fault_tolerant: true` do in the rate-limiting plugin?
4. Why should you never use `origins: ["*"]` with `credentials: true` in CORS?
5. What does `strip_path` have to do with Request Transformer, and when would you combine them?
6. What is the `pre-function` plugin used for, and how does it differ from writing a full custom plugin?
