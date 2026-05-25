# Kong Security — mTLS, Admin API, CORS, IP Restriction

## Admin API Security — The #1 Priority

Kong's Admin API (port 8001) has **full read/write access** to all configuration. Exposing it is critical.

### Never expose Admin API to the internet

```nginx
# kong.conf — bind Admin API to localhost only
admin_listen = 127.0.0.1:8001, 127.0.0.1:8444 ssl
# NOT: admin_listen = 0.0.0.0:8001  ← dangerous

# Or disable Admin API entirely on data plane nodes (hybrid mode)
admin_listen = off
```

### Admin API authentication (Kong Enterprise)
Kong OSS has no built-in Admin API authentication — secure it at the network level:

```nginx
# Nginx reverse proxy in front of Admin API — add basic auth
location /api-admin/ {
    proxy_pass http://127.0.0.1:8001/;
    auth_basic "Kong Admin";
    auth_basic_user_file /etc/nginx/.htpasswd;
    allow 10.0.0.0/8;     # only internal network
    deny all;
}
```

For production: use Kong Enterprise RBAC, or run Admin API only within a VPN/private subnet accessible only to your CI/CD system.

---

## mTLS Between Kong and Upstream

Mutual TLS ensures both Kong and the upstream service verify each other's certificates — prevents man-in-the-middle and enforces strong service identity.

```yaml
# 1. Store the client certificate Kong presents to upstream
certificates:
  - id: kong-client-cert
    cert: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      ...
      -----END PRIVATE KEY-----

# 2. Configure the Service to use the certificate
services:
  - name: orders-service
    url: https://orders-api:8443      # must use HTTPS
    tls_verify: true                  # verify upstream cert
    tls_verify_depth: 3
    client_certificate:
      id: kong-client-cert            # kong presents this to upstream
    ca_certificates:
      - id: internal-ca-cert          # trust chain for upstream's cert
```

```yaml
# Store CA certificate
ca_certificates:
  - id: internal-ca-cert
    cert: |
      -----BEGIN CERTIFICATE-----
      (internal CA that signed orders-api's cert)
      -----END CERTIFICATE-----
```

**Why mTLS upstream matters**: Even if an attacker bypasses Kong and directly hits your internal service IP, they won't have Kong's client certificate. The service rejects the connection.

---

## mTLS From Client to Kong

Require clients to present certificates when connecting to Kong (not just Bearer tokens):

```yaml
# Enable mutual TLS on a Route
plugins:
  - name: mtls-auth
    config:
      ca_certificates:
        - id: client-ca-cert       # CA that signed client certs
      skip_consumer_lookup: false  # identify Consumer from cert's CN/SAN
      authenticated_group_by: CN  # map cert CN to Kong Consumer
```

**Use case**: Machine-to-machine (M2M) where services authenticate with TLS certificates instead of API keys. Each service gets its own certificate — revoking access means revoking the certificate.

---

## CORS Configuration

CORS misconfiguration is one of the most common API security bugs.

```yaml
plugins:
  - name: cors
    config:
      origins:
        - https://app.example.com          # explicit origins only
        - https://admin.example.com
        # NEVER: - "*" with credentials: true
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - X-Requested-With
        - X-CSRF-Token
      exposed_headers:
        - X-RateLimit-Remaining-Minute
        - X-Request-ID
      credentials: true      # allow cookies and Authorization header
      max_age: 7200          # preflight cache: 2 hours
      preflight_continue: false   # Kong handles OPTIONS, doesn't proxy to backend
```

**Security rules:**
- `origins: ["*"]` + `credentials: true` = **BLOCKED by browsers** (and a bad idea anyway)
- Wildcards in origins like `https://*.example.com` — Kong supports this, but validate carefully
- `preflight_continue: false` means Kong answers OPTIONS itself — backend never gets OPTIONS requests

---

## IP Restriction Plugin

```yaml
plugins:
  - name: ip-restriction
    config:
      allow:
        - 10.0.0.0/8       # internal network
        - 172.16.0.0/12    # Docker/private
        - 203.0.113.42     # specific trusted IP
      deny: []             # use allow-list, not deny-list when possible
      status: 403
      message: "Access restricted"
```

**Important**: If Kong is behind a load balancer or proxy, `X-Forwarded-For` header carries the real client IP. Configure Kong to trust it:
```nginx
# kong.conf
trusted_ips = 10.0.0.0/8,172.16.0.0/12   # IPs allowed to set X-Forwarded-For
real_ip_header = X-Forwarded-For
real_ip_recursive = on
```

Without `trusted_ips`, Kong sees the load balancer IP, not the client IP — IP restriction is useless.

---

## Bot Detection Plugin

Blocks requests from known bots based on User-Agent header patterns:

```yaml
plugins:
  - name: bot-detection
    config:
      allow: []                # regex patterns that override deny
      deny:
        - "(googlebot|bingbot|yandexbot)"  # allow search bots through
        - "(sqlmap|nikto|nmap|masscan)"    # block scanners
```

Default behavior blocks common web scrapers and vulnerability scanners. Customize based on your needs.

---

## Request Validation Plugin

Validates requests against an OpenAPI schema before they reach your backend:

```yaml
plugins:
  - name: request-validator
    config:
      parameter_schema:
        - name: order_id
          in: path
          required: true
          schema:
            type: string
            pattern: "^[a-f0-9-]{36}$"  # UUID format
      body_schema: |
        {
          "type": "object",
          "required": ["item_id", "quantity"],
          "properties": {
            "item_id": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1, "maximum": 100 }
          }
        }
      verbose_response: true    # include validation error details in response
```

**Returns 400 Bad Request** with error details if validation fails — backend never receives malformed requests.

---

## Security Headers (via Response Transformer)

Add standard security headers to all responses:

```yaml
plugins:
  - name: response-transformer
    config:
      add:
        headers:
          - Strict-Transport-Security:max-age=31536000; includeSubDomains; preload
          - X-Frame-Options:DENY
          - X-Content-Type-Options:nosniff
          - X-XSS-Protection:1; mode=block
          - Referrer-Policy:strict-origin-when-cross-origin
          - Content-Security-Policy:default-src 'self'; script-src 'self' 'unsafe-inline'
      remove:
        headers:
          - Server            # don't expose Nginx/Kong version
          - X-Powered-By
```

---

## TLS Configuration

```nginx
# kong.conf — TLS settings for proxy listener
proxy_listen = 0.0.0.0:8000, 0.0.0.0:8443 ssl http2
ssl_cert = /etc/kong/certs/server.crt
ssl_cert_key = /etc/kong/certs/server.key
ssl_protocols = TLSv1.2 TLSv1.3       # disable TLS 1.0 and 1.1
ssl_ciphers = ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...
ssl_prefer_server_ciphers = on
ssl_session_timeout = 1d
ssl_session_cache = shared:SSL:10m
```

**Redirect HTTP to HTTPS via pre-function:**
```yaml
plugins:
  - name: pre-function
    config:
      access:
        - |
          local scheme = kong.request.get_forwarded_scheme()
          if scheme == "http" then
            local host = kong.request.get_host()
            local path = kong.request.get_path_with_query()
            return kong.response.exit(301, nil, {
              Location = "https://" .. host .. path
            })
          end
```

---

## Secrets in Kong (Vault Integration — Enterprise)

```yaml
# Reference a secret from HashiCorp Vault
plugins:
  - name: openid-connect
    config:
      client_secret: "{vault://hcv/secret/kong#oidc_client_secret}"
      
# Or AWS Secrets Manager
      client_secret: "{vault://aws/secretsmanager/kong-secrets#oidc_client_secret}"
```

For OSS: Pass secrets as environment variables, never hardcode in kong.yaml:
```bash
export KONG_OIDC_SECRET=your-secret-here

# Reference in config:
client_secret: "env://KONG_OIDC_SECRET"
```

---

## Security Checklist

| Item | Risk if skipped |
|---|---|
| Admin API not exposed publicly | Full config read/write to attackers |
| `hide_credentials: true` on key-auth | API keys forwarded to backend, leaked in logs |
| `aud` claim validated on JWT | Tokens from other services accepted |
| `strip_path: false` only when needed | Path leaking info to backend |
| `origins: ["*"]` only for truly public APIs | CSRF risk for credentialed endpoints |
| mTLS to upstream | Backend bypassed directly |
| Security response headers | Clickjacking, MIME sniffing, XSS |
| `trusted_ips` configured | IP restriction bypassed via X-Forwarded-For |
| TLS 1.0/1.1 disabled | Weak cipher attacks |
| Rate limiting with Redis policy | IP-based abuse under cluster |

---

## Quick Check
1. Why is `admin_listen = 0.0.0.0:8001` a critical security mistake?
2. What is the difference between mTLS from client→Kong and from Kong→upstream? When would you use each?
3. What does `trusted_ips` in kong.conf do, and why does IP restriction break without it?
4. Why is `origins: ["*"]` with `credentials: true` problematic?
5. What is the purpose of `hide_credentials: true` in key-auth, and where does the credential go if you set it to false?
