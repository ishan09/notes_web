# Kong Production Pitfalls

## Pitfall 1: Exposing Admin API to the Internet

**What happens**: Admin API (port 8001) has full read/write access to all Kong config. If exposed, anyone can add consumers, bypass auth plugins, route traffic to arbitrary destinations, or steal API credentials.

**How it happens**: Default Docker `ports:` config or `admin_listen = 0.0.0.0:8001` in kong.conf.

```bash
# Wrong (exposed to internet):
docker run -p 8001:8001 kong   # Admin API reachable from anywhere

# Right — bind to loopback only:
docker run --env KONG_ADMIN_LISTEN="127.0.0.1:8001" kong
# Or in docker-compose:
# ports: ["127.0.0.1:8001:8001"]  — bind to host loopback
```

**Fix**: Bind Admin API to `127.0.0.1` or a private network interface. Use a VPN or SSH tunnel for remote access. In Kubernetes, use a ClusterIP service (not NodePort) and access via `kubectl port-forward`.

---

## Pitfall 2: DB-less Config Drift Between Nodes

**What happens**: In DB-less mode, each Kong node loads config from its own file at startup. If you update the file on some nodes but not others (or at different times), nodes serve different config — some routes exist, some don't.

**How it happens**: Manual file distribution without atomic rollout. Node restarts at different times loading old files.

```
Node 1: kong.yaml (v3) — orders route exists, auth required
Node 2: kong.yaml (v2) — orders route exists, auth NOT required  ← drift!
Node 3: kong.yaml (v1) — orders route missing → 404
```

**Fix**: Use a single source of truth with atomic deployment:
- Push config via `POST /config` Admin API endpoint to each node (even in DB-less mode)
- Use `deck gateway sync` which atomically replaces config
- In Kubernetes: use a ConfigMap with `kubectl rollout` to ensure all pods reload simultaneously

```bash
# Atomic config push to all nodes via Admin API (works even in DB-less)
for node in kong-1 kong-2 kong-3; do
  curl -X POST http://$node:8001/config \
    -F config=@kong.yaml
done
```

---

## Pitfall 3: Timer Exhaustion

**What happens**: Kong runs Lua timers for periodic tasks (health checks, rate limit window resets, cache cleanups). If you create too many timers (e.g., large number of Upstreams with active health checks), Kong hits `nginx.timer_pending_count` limit → health checks stop → targets are never marked unhealthy → traffic goes to dead backends.

**Symptoms**: `[warn] 1024 pending timers, 1000 active timers` in Kong logs. Health checks silently stop working.

**How it happens**: Hundreds of Upstreams each with active health checks configured at short intervals (e.g., every 5 seconds).

**Fix**:
```nginx
# kong.conf — increase timer limits
nginx_worker_processes = auto
# Add to nginx directives:
nginx_http_lua_max_pending_timers = 4096
nginx_http_lua_max_running_timers = 4096
```

Also:
- Increase health check interval for non-critical Upstreams (30s instead of 5s)
- Use passive health checks primarily, active only for recovery detection
- Reduce number of Upstreams by consolidating (one Upstream per service, not per route)

---

## Pitfall 4: High P99 Latency from JWKS Cache Miss

**What happens**: Kong's OIDC/JWT plugins cache Keycloak's public keys (JWKS). When keys rotate or the cache TTL expires, Kong fetches from Keycloak's JWKS endpoint on the next request. Under high concurrency, hundreds of requests simultaneously trigger a JWKS fetch → Keycloak gets spiked → P99 latency spikes.

**How it happens**: Short JWKS cache TTL (default can be as short as 60 seconds). Keys rotating frequently. High traffic.

```yaml
# openid-connect plugin — tune the cache
plugins:
  - name: openid-connect
    config:
      cache_ttl: 3600             # cache JWKS for 1 hour
      cache_introspection: true   # also cache introspection results
      cache_tokens: true
      issuers_allowed: [https://keycloak.example.com/realms/my-realm]
```

**Fix**:
- Set `cache_ttl` to at least 3600 seconds (1 hour)
- JWKS signing keys should rotate infrequently (days to weeks, not minutes)
- Use local JWT validation (not introspection) — introspection calls Keycloak on every request

---

## Pitfall 5: Rate Limiting with `policy: local` in a Cluster

**What happens**: With `policy: local`, each Kong node tracks its own in-memory counters. A client making 90 requests/minute gets different counters on each node — if requests distribute across 3 nodes, they can make 270 requests/minute (90 per node) before hitting the limit.

**How it happens**: Using `policy: local` for simplicity without considering cluster effects.

**Fix**: Always use `policy: redis` in multi-node deployments:
```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis
      redis_host: redis-cluster
      redis_port: 6379
      fault_tolerant: true    # if Redis is down, allow requests through (don't break prod)
```

**`fault_tolerant: true`**: Critical for availability — if Redis goes down, rate limiting fails open (allows all requests) rather than failing closed (blocking all requests). Adjust based on your risk tolerance.

---

## Pitfall 6: `GET /config` Polling in DB-less

**What happens**: Some teams poll `GET /config` to verify all nodes have the latest config. This endpoint returns the entire Kong config as JSON — can be hundreds of MB for large deployments. In a cluster, this causes memory spikes and GC pressure on each Kong node.

**Fix**:
- Don't poll `GET /config` from application code
- Use `GET /status` for health checks (tiny response)
- For config verification, use `deck gateway diff` from your CI/CD pipeline, not a running application

---

## Pitfall 7: Wildcard Redirect URIs in OAuth2/OIDC

**What happens**: Configuring Kong or Keycloak with wildcard redirect URIs like `https://*.example.com/callback` allows attackers to steal authorization codes by redirecting to attacker-controlled subdomains.

**How it happens**: Developers add wildcards to avoid updating config for every new frontend environment.

```yaml
# Wrong:
redirect_uris:
  - https://*.example.com/callback    # ← dangerous

# Right: explicit origins only
redirect_uris:
  - https://app.example.com/callback
  - https://staging.example.com/callback
```

**Fix**: Use explicit redirect URIs. For multiple environments, use environment-specific Kong configs (deck per environment).

---

## Pitfall 8: Missing `aud` Claim Validation

**What happens**: Kong's JWT plugin (and OIDC plugin without explicit config) may not validate the `aud` (audience) claim. This means a token issued for Service A is accepted by Service B — token portability attack.

**How it happens**: Default JWT validation only checks `iss` and `exp`.

```yaml
plugins:
  - name: openid-connect
    config:
      # Explicitly verify audience
      audience_required: [orders-service]    # token must have aud=orders-service
      verify_parameters: true
```

**With custom jwt plugin config:**
```yaml
plugins:
  - name: pre-function
    config:
      access:
        - |
          local token = kong.request.get_header("Authorization")
          -- Custom aud validation logic
          local claims = decode_jwt(token)
          if claims.aud ~= "orders-service" then
            return kong.response.exit(401, { message = "Invalid audience" })
          end
```

---

## Pitfall 9: Not Accounting for Kong Overhead in Latency Budgets

**What happens**: Teams size their SLAs based on backend latency, then add Kong and discover P99 latency increased by 5–20ms. At high RPS with many plugins, Kong overhead accumulates.

**Typical Kong overhead per request (single plugin):**
```
Plugin-free proxy:  ~1ms
+ 1 plugin (jwt):   ~2ms
+ rate-limiting:    ~3ms (local) / ~8ms (Redis RTT included)
+ OIDC (cache hit): ~2ms
+ 3 plugins total:  ~10-15ms overhead typical
```

**Fix**:
- Measure Kong overhead in isolation with load testing before setting SLAs
- Profile plugins: pre-function Lua can add significant overhead if complex
- Use `policy: local` for rate limiting if Redis latency is too high and accuracy trade-off is acceptable for that specific use case
- Disable plugins on routes that don't need them (don't apply global plugins to everything)

---

## Pitfall 10: No Health Check → Traffic to Dead Backends

**What happens**: A backend service crashes or becomes unresponsive. Without health checks, Kong continues routing traffic to it. Clients receive 502 Bad Gateway or timeouts. Kong's `retries` config helps partially but compounds latency.

**Fix**:
```yaml
upstreams:
  - name: orders-lb
    healthchecks:
      passive:
        unhealthy:
          http_failures: 3          # circuit-break after 3 consecutive failures
          timeouts: 3
          http_statuses: [500, 502, 503, 504]
      active:
        http_path: /actuator/health  # Spring Boot health endpoint
        healthy:
          interval: 10
          successes: 2              # re-enable after 2 successful probes
        unhealthy:
          interval: 5
          http_failures: 3
```

**Separate readiness from liveness in health endpoints**: Kong health checks should call a `/health/ready` endpoint that checks downstream dependencies (DB, cache) — not just "process is running."

---

## Pitfall Summary

| Pitfall | Severity | Fix |
|---|---|---|
| Admin API exposed | Critical | Bind to 127.0.0.1 or VPN-only |
| DB-less config drift | High | Atomic config push via deck |
| Timer exhaustion | Medium | Increase timer limits, reduce check frequency |
| JWKS cache miss spike | Medium | Increase cache_ttl |
| Local rate limit in cluster | Medium | Switch to Redis policy |
| GET /config polling | Low | Use GET /status instead |
| Wildcard redirect URIs | High | Use explicit URIs |
| Missing `aud` validation | High | Configure audience_required |
| Kong overhead not budgeted | Medium | Load test Kong separately |
| No health checks | High | Enable passive + active health checks |

---

## Quick Check
1. Why does `policy: local` in rate-limiting fail in a multi-node Kong cluster?
2. What is timer exhaustion and what causes it in large Kong deployments?
3. Why is polling `GET /config` a performance problem?
4. How does missing `aud` claim validation enable a token portability attack?
5. Why is `fault_tolerant: true` important for rate limiting in production?
