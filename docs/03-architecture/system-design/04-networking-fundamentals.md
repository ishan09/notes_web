# Networking Fundamentals for System Design

> **Why It Matters**: Every system design interview involves data flowing across networks. Understanding how requests travel from users to servers—and back—is essential for designing efficient, scalable systems.

## Table of Contents
1. [Request Flow: From Browser to Server](#request-flow-from-browser-to-server)
2. [DNS Deep Dive](#dns-deep-dive)
3. [Load Balancers](#load-balancers)
4. [CDN (Content Delivery Networks)](#cdn-content-delivery-networks)
5. [Protocols Comparison](#protocols-comparison)
6. [Network Security Basics](#network-security-basics)
7. [Common Interview Questions](#common-interview-questions)

---

## Request Flow: From Browser to Server

### The Complete Journey

```
User types: https://api.example.com/users/123

Step 1: DNS Resolution
┌─────────┐    "api.example.com"    ┌─────────┐
│ Browser │ ──────────────────────► │   DNS   │
│         │ ◄────────────────────── │ Resolver│
└─────────┘    "93.184.216.34"      └─────────┘

Step 2: TCP Connection
┌─────────┐         SYN            ┌─────────┐
│ Browser │ ──────────────────────►│  Server │
│         │ ◄──────────────────────│   LB    │
│         │         SYN-ACK        │         │
│         │ ──────────────────────►│         │
└─────────┘         ACK            └─────────┘

Step 3: TLS Handshake (for HTTPS)
┌─────────┐    ClientHello         ┌─────────┐
│ Browser │ ──────────────────────►│  Server │
│         │ ◄──────────────────────│         │
│         │    ServerHello+Cert    │         │
│         │ ──────────────────────►│         │
│         │    Key Exchange        │         │
│         │ ◄──────────────────────│         │
└─────────┘    Finished            └─────────┘

Step 4: HTTP Request
┌─────────┐                        ┌─────────┐
│ Browser │  GET /users/123        │  Server │
│         │  Host: api.example.com │         │
│         │  Authorization: Bearer │         │
│         │ ──────────────────────►│         │
└─────────┘                        └─────────┘

Step 5: Processing & Response
┌─────────┐                        ┌─────────┐
│ Browser │  HTTP/1.1 200 OK       │  Server │
│         │  Content-Type: json    │         │
│         │  {"id":123,"name":...} │         │
│         │ ◄──────────────────────│         │
└─────────┘                        └─────────┘
```

### Latency Breakdown

```
Typical request (US to US):

DNS lookup:          1-50 ms   (cached: 0 ms)
TCP handshake:       10-30 ms  (1 RTT)
TLS handshake:       20-60 ms  (2 RTT, or 1 with TLS 1.3)
Server processing:   10-100 ms (varies)
Response transfer:   10-50 ms  (depends on size)
────────────────────────────────────────────
Total:               50-300 ms

Cross-continent (US to Europe):
Add ~80-150 ms for each network round trip
```

### Optimizations

| Optimization | What It Does | Latency Saved |
|-------------|--------------|---------------|
| DNS caching | Skip DNS lookup | 1-50 ms |
| Connection reuse | Skip TCP handshake | 10-30 ms |
| TLS session resumption | Faster TLS | 10-30 ms |
| HTTP/2 multiplexing | Parallel requests | Varies |
| Edge/CDN | Closer server | 50-200 ms |
| Compression | Smaller payloads | 10-100 ms |

---

## DNS Deep Dive

### How DNS Works

```
Query: www.example.com

┌─────────┐  1. Query    ┌───────────────┐
│ Browser │ ───────────► │ Local Resolver│
└─────────┘              │ (ISP or local)│
                         └───────┬───────┘
                                 │
         2. Query Root Server    │
         ◄───────────────────────┤
         "Ask .com servers"      │
                                 │
         3. Query .com TLD       │
         ◄───────────────────────┤
         "Ask ns1.example.com"   │
                                 │
         4. Query authoritative  │
         ◄───────────────────────┘
         "93.184.216.34"

Result cached at each level with TTL
```

### DNS Record Types

| Type | Purpose | Example |
|------|---------|---------|
| **A** | IPv4 address | `example.com → 93.184.216.34` |
| **AAAA** | IPv6 address | `example.com → 2606:2800:220:1::` |
| **CNAME** | Alias to another domain | `www.example.com → example.com` |
| **MX** | Mail server | `example.com → mail.example.com` |
| **NS** | Name server | `example.com → ns1.example.com` |
| **TXT** | Text data | Used for verification, SPF |

### DNS for Load Balancing

**Round-Robin DNS**:
```
Query: api.example.com
Response (rotating):
  93.184.216.34
  93.184.216.35
  93.184.216.36

Each query returns different order
```

**Geo-DNS**:
```
Query from US:    api.example.com → US server IP
Query from Europe: api.example.com → EU server IP
Query from Asia:   api.example.com → Asia server IP
```

**Weighted DNS**:
```
api.example.com
  70% → Server A (primary)
  30% → Server B (canary)
```

### DNS TTL Strategy

```
High TTL (24 hours):
  ✅ Fewer DNS queries
  ✅ Faster for users
  ❌ Slow failover
  Use for: Stable, rarely-changing records

Low TTL (60 seconds):
  ✅ Fast failover
  ✅ Quick changes
  ❌ More DNS queries
  ❌ Slightly slower
  Use for: Load balancing, DR scenarios

Strategy for migration:
  1. Lower TTL to 60s (wait 24h for propagation)
  2. Make the change
  3. Verify everything works
  4. Raise TTL back up
```

---

## Load Balancers

### Layer 4 vs Layer 7

```
┌─────────────────────────────────────────────────────────────┐
│                     OSI Model                               │
├────────────────────┬────────────────────────────────────────┤
│ Layer 7 (Application) │ HTTP, HTTPS, WebSocket            │
│                       │ Can inspect: URL, headers, cookies │
│                       │ Smart routing based on content     │
├────────────────────┼────────────────────────────────────────┤
│ Layer 4 (Transport)│ TCP, UDP                              │
│                    │ Can inspect: IP, port                 │
│                    │ Fast, simple routing                  │
└────────────────────┴────────────────────────────────────────┘
```

**L4 Load Balancer**:
```
Client → [L4 LB] → Server

LB sees: Source IP, Dest IP, Ports
LB decides: Based on IP hash or round-robin
Speed: Very fast (kernel-level)
Use case: High-throughput, simple routing
```

**L7 Load Balancer**:
```
Client → [L7 LB] → Server

LB sees: Full HTTP request (URL, headers, body)
LB can: Route /api to API servers, /static to CDN
Speed: Slower (must parse HTTP)
Use case: Content-based routing, SSL termination
```

### Load Balancing Algorithms

#### Round Robin
```
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A (cycle)
```
Best for: Equal capacity servers, stateless apps

#### Weighted Round Robin
```
Server A (weight: 3): Gets 3x traffic
Server B (weight: 1): Gets 1x traffic

Sequence: A, A, A, B, A, A, A, B, ...
```
Best for: Servers with different capacities

#### Least Connections
```
Server A: 10 connections → Next request here
Server B: 50 connections
Server C: 30 connections
```
Best for: Variable request duration

#### IP Hash
```
hash(client_ip) % num_servers = server_index

Same client always hits same server
```
Best for: Session affinity without cookies

#### Least Response Time
```
Server A: avg 50ms  → Next request here
Server B: avg 100ms
Server C: avg 75ms
```
Best for: Latency-sensitive applications

### Health Checks

```
LB → Server: GET /health
Server → LB: 200 OK {"status": "healthy"}

Check parameters:
- Interval: 5 seconds
- Timeout: 2 seconds
- Unhealthy threshold: 3 failures
- Healthy threshold: 2 successes

┌─────────┐     ┌─────────┐     ┌─────────┐
│Server A │     │Server B │     │Server C │
│  (OK)   │     │ (FAIL)  │     │  (OK)   │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
              (removed from pool)
```

### SSL/TLS Termination

```
Option 1: SSL at Load Balancer
┌────────┐  HTTPS  ┌────────┐  HTTP  ┌────────┐
│ Client │ ──────► │   LB   │ ─────► │ Server │
└────────┘         └────────┘        └────────┘
                   (decrypts)

Pros: Offloads crypto from servers
Cons: Traffic between LB and server is unencrypted

Option 2: SSL Passthrough
┌────────┐  HTTPS  ┌────────┐ HTTPS ┌────────┐
│ Client │ ──────► │   LB   │ ────► │ Server │
└────────┘         └────────┘       └────────┘
                   (passes through)

Pros: End-to-end encryption
Cons: Can't do L7 routing, servers handle crypto

Option 3: SSL Re-encryption
┌────────┐  HTTPS  ┌────────┐ HTTPS ┌────────┐
│ Client │ ──────► │   LB   │ ────► │ Server │
└────────┘         └────────┘       └────────┘
                   (decrypts,       (separate
                    re-encrypts)     cert)

Pros: L7 routing + encrypted internal traffic
Cons: Two crypto operations, more complex
```

---

## CDN (Content Delivery Networks)

### How CDNs Work

```
Without CDN:
┌────────┐                              ┌────────┐
│ User   │ ─────────── 200ms ──────────►│ Origin │
│ (Tokyo)│                              │ (US)   │
└────────┘                              └────────┘

With CDN:
┌────────┐         ┌────────────┐       ┌────────┐
│ User   │ ─20ms─► │ CDN Edge   │       │ Origin │
│ (Tokyo)│         │ (Tokyo)    │       │ (US)   │
└────────┘         └─────┬──────┘       └────────┘
                         │                   │
                    Cache hit:           Cache miss:
                    Return cached        Fetch from origin,
                                        cache for next time
```

### CDN Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Global CDN Network                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────┐     ┌─────┐     ┌──────┐     ┌─────┐     ┌─────┐  │
│   │Edge │     │Edge │     │Edge  │     │Edge │     │Edge │  │
│   │Tokyo│     │Seoul│     │Sydney│     │LA   │     │NYC  │  │
│   └──┬──┘     └──┬──┘     └──┬───┘     └──┬──┘     └──┬──┘  │ 
│      │           │           │            │           │     │
│      └───────────┴─────┬─────┴────────────┴───────────┘     │
│                        │                                    │
│                   ┌────┴────┐                               │
│                   │ Origin  │                               │
│                   │ Shield  │ (Optional middle tier)        │
│                   └────┬────┘                               │
│                        │                                    │
│                   ┌────┴────┐                               │
│                   │ Origin  │                               │
│                   │ Server  │                               │
│                   └─────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

### What to Put on CDN

| Content Type | CDN Suitable? | TTL |
|-------------|---------------|-----|
| Static files (JS, CSS, images) | Yes | Long (1 day - 1 year) |
| API responses (cacheable) | Maybe | Short (1 min - 1 hour) |
| User-specific data | No | - |
| Real-time data | No | - |
| Video streams | Yes (special) | Varies |

### Cache Control Headers

```
HTTP Response Headers:

Cache-Control: max-age=31536000, public
  → Cache for 1 year, any cache can store

Cache-Control: private, max-age=60
  → Only browser cache, 1 minute

Cache-Control: no-store
  → Don't cache at all

Cache-Control: no-cache
  → Cache but revalidate every time

ETag: "abc123"
  → Fingerprint for conditional requests

Vary: Accept-Encoding
  → Different cache for different encodings
```

### CDN Cache Invalidation

```
Methods:

1. TTL-based (automatic expiry)
   Set Cache-Control: max-age=3600
   After 1 hour, fetch fresh copy

2. Purge (immediate)
   POST /purge?path=/images/logo.png
   Removes specific file from all edges

3. Versioning (cache busting)
   /app.js?v=1.2.3
   /app.1234abcd.js
   New version = new URL = cache miss
```

### Push vs Pull CDN

```
Pull CDN (lazy loading):
1. User requests file
2. Edge doesn't have it
3. Edge fetches from origin
4. Edge caches and returns
5. Next user gets cached copy

Pros: Only caches what's needed
Cons: First user gets slow response

─────────────────────────────

Push CDN (eager loading):
1. You upload files to CDN
2. CDN distributes to edges
3. Files ready before first request

Pros: No cold start
Cons: Must manage uploads, storage costs
```

---

## Protocols Comparison

### HTTP/1.1 vs HTTP/2 vs HTTP/3

```
HTTP/1.1:
┌─────────┐     ┌─────────┐
│ Client  │────►│ Server  │  One request at a time per connection
│         │◄────│         │  (or multiple connections)
└─────────┘     └─────────┘

HTTP/2:
┌─────────┐     ┌─────────┐
│ Client  │═══► │ Server  │  Multiple streams over one connection
│         │◄═══ │         │  (multiplexing)
└─────────┘     └─────────┘

HTTP/3:
┌─────────┐     ┌─────────┐
│ Client  │~~~► │ Server  │  QUIC (UDP-based)
│         │◄~~~ │         │  Better performance on lossy networks
└─────────┘     └─────────┘
```

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Connections | Multiple | One (multiplexed) | One (QUIC) |
| Head-of-line blocking | Yes | Partially solved | Solved |
| Header compression | No | HPACK | QPACK |
| Server push | No | Yes | Yes |
| Transport | TCP | TCP | QUIC (UDP) |

### REST vs GraphQL vs gRPC

```
REST:
GET /users/123
GET /users/123/posts
GET /users/123/posts/456/comments

Multiple round trips, fixed responses

─────────────────────────────────────

GraphQL:
POST /graphql
{
  user(id: 123) {
    name
    posts {
      title
      comments { text }
    }
  }
}

One request, flexible response

─────────────────────────────────────

gRPC:
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}

Binary protocol, strongly typed, fast
```

| Aspect | REST | GraphQL | gRPC |
|--------|------|---------|------|
| Format | JSON | JSON | Protobuf (binary) |
| Typing | Loose | Schema | Strict (.proto) |
| Overfetching | Common | Solved | N/A |
| Caching | Easy (HTTP) | Complex | Complex |
| Browser support | Native | Native | Limited |
| Best for | Public APIs | Flexible queries | Internal services |

### WebSocket vs Server-Sent Events vs Long Polling

```
Long Polling:
Client: GET /updates (hangs until data)
Server: (waits)... Here's data!
Client: GET /updates (repeat)

─────────────────────────────────────

Server-Sent Events (SSE):
Client: GET /events (keeps connection open)
Server: data: {"event": "update1"}
Server: data: {"event": "update2"}
(one-way stream from server)

─────────────────────────────────────

WebSocket:
Client: Upgrade to WebSocket
Server: OK, upgraded
Client ◄──────────────────► Server
(bidirectional, persistent)
```

| Feature | Long Polling | SSE | WebSocket |
|---------|--------------|-----|-----------|
| Direction | Request-response | Server → Client | Bidirectional |
| Connection | New per poll | Persistent | Persistent |
| Browser support | Universal | Good (no IE) | Universal |
| Complexity | Low | Low | Medium |
| Use case | Compatibility | Live feeds | Chat, gaming |

---

## Network Security Basics

### TLS/SSL

```
TLS Handshake (simplified):

1. ClientHello: "I support TLS 1.3, these ciphers"
2. ServerHello: "Let's use TLS 1.3, this cipher"
3. Certificate: "Here's my cert, signed by CA"
4. Key Exchange: Diffie-Hellman key agreement
5. Finished: "Ready to encrypt!"

After handshake: All data encrypted with session key
```

### Certificate Chain

```
┌─────────────────────┐
│    Root CA          │  (Trusted, in browser/OS)
│  (DigiCert, etc)    │
└──────────┬──────────┘
           │ signs
           ▼
┌─────────────────────┐
│ Intermediate CA     │
└──────────┬──────────┘
           │ signs
           ▼
┌─────────────────────┐
│ Your Certificate    │  (api.example.com)
└─────────────────────┘
```

### HTTPS Best Practices

```
✅ Use TLS 1.3 (or 1.2 minimum)
✅ HSTS header (force HTTPS)
✅ Certificate transparency
✅ OCSP stapling
✅ Strong cipher suites

❌ Don't use TLS 1.0/1.1
❌ Don't use self-signed certs in production
❌ Don't ignore certificate warnings
```

### DDoS Protection

```
Types of DDoS:

Volume-based (flood with traffic):
- UDP flood, ICMP flood
- Mitigation: Rate limiting, traffic scrubbing

Protocol (exploit protocol weaknesses):
- SYN flood, Ping of Death
- Mitigation: SYN cookies, connection limits

Application (target app layer):
- HTTP flood, Slowloris
- Mitigation: WAF, rate limiting, CAPTCHAs

Defense layers:
┌─────────────────────────────────────────┐
│ CDN/Edge (absorb volume attacks)        │
├─────────────────────────────────────────┤
│ DDoS Protection Service (scrubbing)     │
├─────────────────────────────────────────┤
│ WAF (application layer filtering)       │
├─────────────────────────────────────────┤
│ Rate Limiting (per IP, per user)        │
├─────────────────────────────────────────┤
│ Your Application                        │
└─────────────────────────────────────────┘
```

---

## Common Interview Questions

### Q1: Walk me through what happens when you type a URL in a browser.

**Answer Structure**:
```
1. URL Parsing
   - Protocol (https), domain (example.com), path (/page)

2. DNS Resolution
   - Browser cache → OS cache → Resolver → Root → TLD → Authoritative
   - Returns IP address

3. TCP Connection
   - Three-way handshake (SYN, SYN-ACK, ACK)
   - Connection established

4. TLS Handshake (for HTTPS)
   - Exchange supported ciphers
   - Server sends certificate
   - Key exchange
   - Encrypted channel established

5. HTTP Request
   - Browser sends GET request with headers

6. Server Processing
   - Load balancer routes to server
   - Application processes request
   - Database queries if needed

7. HTTP Response
   - Server sends response with status, headers, body

8. Rendering
   - Browser parses HTML
   - Fetches CSS, JS, images
   - Renders page
```

### Q2: How would you design a CDN?

**Answer**:
```
Components:

1. Edge Servers (globally distributed)
   - Deploy in major cities/regions
   - Cache content close to users
   - Serve static files

2. Origin Shield
   - Middle tier cache
   - Reduces load on origin
   - Handles cache misses

3. DNS-based Routing
   - GeoDNS to route users to nearest edge
   - Health-based failover

4. Cache Management
   - TTL-based expiration
   - Purge API for invalidation
   - Version-based URLs

5. Origin Integration
   - Pull: Fetch on demand
   - Push: Upload proactively

Key decisions:
- What to cache: Static assets, maybe API responses
- Cache duration: Balance freshness vs efficiency
- Invalidation: How to update content quickly
- Security: SSL certificates at edge, origin protection
```

### Q3: Explain the difference between L4 and L7 load balancing.

**Answer**:
```
Layer 4 (Transport):
- Operates on TCP/UDP
- Sees: Source IP, dest IP, ports
- Decision based on: IP hash, round robin
- Performance: Very fast (kernel-level)
- Use case: Simple distribution, high throughput

Layer 7 (Application):
- Operates on HTTP/HTTPS
- Sees: Full request (URL, headers, cookies)
- Decision based on: URL path, header values
- Performance: Slower (must parse HTTP)
- Use case: Content routing, A/B testing, SSL termination

Example L7 routing:
  /api/*      → API servers
  /static/*   → CDN
  /admin/*    → Admin servers
  Cookie: beta=true → Beta servers

Hybrid approach:
  L4 LB distributes to L7 LB clusters
  L7 LB handles intelligent routing
```

### Q4: How does a load balancer handle sticky sessions?

**Answer**:
```
Problem: Stateful apps need same user → same server

Solutions:

1. Cookie-based (L7)
   LB sets: Set-Cookie: server_id=server_a
   Next request: Cookie: server_id=server_a
   LB routes to server_a

2. IP Hash (L4)
   hash(client_ip) % servers = server_index
   Same IP always hits same server
   Issue: NAT, proxies (many users = same IP)

3. Session replication
   All servers share session state
   No affinity needed
   Complexity: Keep servers in sync

4. External session store
   Sessions in Redis/Memcached
   Any server can handle any request
   Best for scalability

Recommendation:
Avoid sticky sessions if possible.
Use external session store for true horizontal scaling.
```

### Q5: What's the difference between push and pull CDN?

**Answer**:
```
Pull CDN:
- Content fetched on first request
- Origin contacted on cache miss
- Automatic cache population

Workflow:
1. User requests file
2. CDN edge: "Don't have it"
3. CDN fetches from origin
4. CDN caches and serves
5. Subsequent requests: served from cache

Pros: Simple, only caches what's needed
Cons: First user gets slow response (cold start)

─────────────────────────────────────────

Push CDN:
- You upload content to CDN
- Content pre-distributed to edges
- Available before first request

Workflow:
1. You upload file to CDN
2. CDN distributes to all edges
3. User requests file
4. Edge serves immediately

Pros: No cold start, predictable performance
Cons: Storage costs, must manage uploads

─────────────────────────────────────────

When to use:
Pull: General web content, dynamic content
Push: Large files (video), known popular content, critical assets
```
