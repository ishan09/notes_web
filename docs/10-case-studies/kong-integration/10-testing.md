# Kong Testing

## Testing Strategy

| Layer | What to test | Tool |
|---|---|---|
| Plugin unit | Lua plugin logic | Busted (Lua test framework) |
| Config validation | kong.yaml syntax and semantics | deck validate, Inso CLI |
| Integration (mock) | Routes, auth, rate limits | TestContainers + REST Assured |
| Integration (real Kong) | Full plugin chain | Testcontainers + Kong |
| Contract | OpenAPI spec vs actual behavior | Inso CLI, Prism |
| Load | Throughput, P99 latency, plugin overhead | k6, Gatling |

---

## 1. Config Validation with deck

Before deploying to any environment, validate your config file:

```bash
# Validate kong.yaml syntax and semantics
deck gateway validate --state kong.yaml

# Dry-run diff against a running Kong instance
deck gateway diff --state kong.yaml --kong-addr http://kong-test:8001

# Sample output:
# creating service orders-service
# creating route orders-route
# updating plugin rate-limiting (global)
# Summary: 2 create, 1 update, 0 delete
```

Integrate into CI/CD as a required check before merge:
```yaml
# .github/workflows/validate.yml
- name: Validate Kong config
  run: |
    deck gateway validate --state kong/kong.yaml
    echo "Config is valid"
```

---

## 2. Integration Testing with Testcontainers

Test your full Kong configuration against a real Kong instance in Docker:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.7</version>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class KongIntegrationTest {

    @Container
    static GenericContainer<?> kong = new GenericContainer<>("kong:3.6")
        .withEnv("KONG_DATABASE", "off")
        .withEnv("KONG_DECLARATIVE_CONFIG", "/etc/kong/kong.yaml")
        .withEnv("KONG_PROXY_ACCESS_LOG", "/dev/stdout")
        .withEnv("KONG_ADMIN_ACCESS_LOG", "/dev/stdout")
        .withEnv("KONG_PROXY_ERROR_LOG", "/dev/stderr")
        .withEnv("KONG_ADMIN_ERROR_LOG", "/dev/stderr")
        .withEnv("KONG_ADMIN_LISTEN", "0.0.0.0:8001")
        .withClasspathResourceMapping("test-kong.yaml", "/etc/kong/kong.yaml",
            BindMode.READ_ONLY)
        .withExposedPorts(8000, 8001)
        .waitingFor(Wait.forHttp("/status").forPort(8001).withStartupTimeout(Duration.ofSeconds(60)));

    @Container
    static GenericContainer<?> mockBackend = new GenericContainer<>("mockserver/mockserver:5.15.0")
        .withExposedPorts(1080)
        .waitingFor(Wait.forHttp("/mockserver/status").withStartupTimeout(Duration.ofSeconds(30)));

    private static String kongProxyUrl;
    private static String kongAdminUrl;

    @BeforeAll
    static void setup() {
        kongProxyUrl = "http://" + kong.getHost() + ":" + kong.getMappedPort(8000);
        kongAdminUrl = "http://" + kong.getHost() + ":" + kong.getMappedPort(8001);
        
        // Configure the mock backend URL in Kong dynamically
        // (Or use a test-specific kong.yaml that points to the mock backend)
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        RestAssured.given()
            .baseUri(kongProxyUrl)
            .when()
            .get("/api/orders")
            .then()
            .statusCode(401)
            .body("message", equalTo("Unauthorized"));
    }

    @Test
    void validApiKeyIsAccepted() {
        RestAssured.given()
            .baseUri(kongProxyUrl)
            .header("apikey", "sk-test-valid-key-xyz")
            .when()
            .get("/api/orders")
            .then()
            .statusCode(200);
    }

    @Test
    void rateLimitHeadersArePresent() {
        Response response = RestAssured.given()
            .baseUri(kongProxyUrl)
            .header("apikey", "sk-test-valid-key-xyz")
            .get("/api/orders");

        assertThat(response.getHeader("X-RateLimit-Limit-Minute")).isEqualTo("100");
        assertThat(response.getHeader("X-RateLimit-Remaining-Minute")).isNotNull();
    }

    @Test
    void rateLimitIsEnforced() throws Exception {
        // Make 101 requests — the 101st should get 429
        for (int i = 0; i < 100; i++) {
            RestAssured.given()
                .baseUri(kongProxyUrl)
                .header("apikey", "sk-test-valid-key-xyz")
                .get("/api/orders");
        }

        RestAssured.given()
            .baseUri(kongProxyUrl)
            .header("apikey", "sk-test-valid-key-xyz")
            .when()
            .get("/api/orders")
            .then()
            .statusCode(429)
            .body("message", containsString("API rate limit exceeded"));
    }
}
```

---

## 3. Test kong.yaml for Integration Tests

```yaml
# src/test/resources/test-kong.yaml
_format_version: "3.0"

services:
  - name: orders-service
    # Point to the Testcontainers mock backend
    url: http://host.testcontainers.internal:1080
    routes:
      - name: orders-route
        paths: [/api/orders]
        plugins:
          - name: key-auth
            config:
              hide_credentials: true
          - name: rate-limiting
            config:
              minute: 100
              policy: local    # local for tests (no Redis)

consumers:
  - username: test-consumer
    keyauth_credentials:
      - key: sk-test-valid-key-xyz

upstreams:
  - name: orders-lb
    targets:
      - target: host.testcontainers.internal:1080
        weight: 100
```

---

## 4. Testing JWT Authentication

```java
@Test
void validJwtIsAccepted() throws Exception {
    // Build a JWT using the Consumer's secret
    String jwtSecret = "test-jwt-secret";
    String consumerId = "issuer-key-from-kong"; // the "key" returned when creating credential
    
    String token = Jwts.builder()
        .setIssuer(consumerId)         // iss must match Consumer's credential key
        .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
        .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
        .compact();

    RestAssured.given()
        .baseUri(kongProxyUrl)
        .header("Authorization", "Bearer " + token)
        .when()
        .get("/api/orders")
        .then()
        .statusCode(200);
}

@Test
void expiredJwtIsRejected() throws Exception {
    String token = Jwts.builder()
        .setIssuer("issuer-key-from-kong")
        .setExpiration(Date.from(Instant.now().minusSeconds(60)))  // expired 1 minute ago
        .signWith(Keys.hmacShaKeyFor("test-jwt-secret".getBytes()))
        .compact();

    RestAssured.given()
        .baseUri(kongProxyUrl)
        .header("Authorization", "Bearer " + token)
        .when()
        .get("/api/orders")
        .then()
        .statusCode(401);
}
```

---

## 5. Testing with Inso CLI (OpenAPI Contract Testing)

Inso CLI validates your API against an OpenAPI specification and can generate test suites:

```bash
# Install Inso CLI
npm install -g insomnia-inso

# Run tests from an Insomnia collection
inso run test "My Kong API Tests" \
  --env production \
  --bail                  # stop on first failure

# Validate OpenAPI spec against running Kong
inso lint spec openapi.yaml
```

---

## 6. Load Testing with k6

Test Kong's throughput and measure plugin overhead:

```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '60s',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },   // ramp up
        { duration: '30s', target: 500 },   // hold
        { duration: '10s', target: 0 },     // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<200'],    // P99 < 200ms
    http_req_failed: ['rate<0.01'],      // < 1% errors
  },
};

export default function() {
  const response = http.get('http://kong:8000/api/orders', {
    headers: { apikey: 'sk-test-valid-key-xyz' },
  });
  
  check(response, {
    'status is 200': r => r.status === 200,
    'latency < 100ms': r => r.timings.duration < 100,
    'has RateLimit header': r => r.headers['X-RateLimit-Remaining-Minute'] !== undefined,
  });
}
```

```bash
k6 run k6-load-test.js --out json=results.json
```

---

## 7. Testing Plugin Ordering

```java
@Test
void rateLimitAppliesBeforeBackendIsHit() {
    // Exhaust rate limit
    for (int i = 0; i < 100; i++) {
        RestAssured.given()
            .baseUri(kongProxyUrl)
            .header("apikey", "sk-test-valid-key-xyz")
            .get("/api/orders");
    }
    
    // This request should be blocked by Kong, NOT reach backend
    // Verify mock backend received exactly 100 requests, not 101
    int backendCallCount = getBackendCallCount();
    assertThat(backendCallCount).isEqualTo(100);
    
    // Kong returned 429 without hitting backend
    RestAssured.given()
        .baseUri(kongProxyUrl)
        .header("apikey", "sk-test-valid-key-xyz")
        .get("/api/orders")
        .then()
        .statusCode(429);
}
```

---

## What to Test — Quick Reference

| Scenario | Expected status | Plugin responsible |
|---|---|---|
| No credentials | 401 | key-auth / jwt |
| Invalid API key | 401 | key-auth |
| Expired JWT | 401 | jwt |
| JWT wrong issuer | 401 | jwt |
| Valid credentials, rate limited | 429 | rate-limiting |
| Blocked IP | 403 | ip-restriction |
| Invalid request body | 400 | request-validator |
| OPTIONS preflight | 200 | cors |
| Valid request | 200 | — |
| Backend down | 502/503 | upstream health |

---

## Quick Check
1. Why use `policy: local` in test kong.yaml instead of `policy: redis`?
2. How does Testcontainers know the mock backend's address (hint: `host.testcontainers.internal`)?
3. When testing JWT, why must the `iss` claim match the Kong Consumer's credential "key" field?
4. What does `deck gateway diff` add to a CI/CD pipeline that `deck gateway validate` doesn't cover?
5. Why should you test that a rate-limited request does NOT reach the backend (not just that Kong returns 429)?
