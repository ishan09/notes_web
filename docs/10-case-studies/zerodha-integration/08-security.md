# Security

## Authentication Security

### The Checksum is Your Only Verification

Unlike Stripe/Razorpay (which use HMAC-SHA256 with a secret for webhook verification),
Zerodha's postbacks have **no cryptographic signature**. The checksum only appears in the
token exchange step (request_token → access_token).

This means your postback endpoint security relies on:
1. Restricting access to Zerodha's IP ranges
2. Re-fetching order state from the Kite API to verify before acting
3. Treating the postback as a notification hint — not a trusted instruction

```javascript
// IP allowlist for Zerodha postbacks (check Zerodha docs for current IPs)
const ZERODHA_IPS = ['103.248.232.0/24'];  // Example — verify current IPs

app.post('/kite/postback', (req, res, next) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  if (!isInRange(clientIp, ZERODHA_IPS)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, handlePostback);
```

---

## Key Management

### api_key vs api_secret vs access_token

| Credential | Sensitivity | Where It Lives | Rotation |
|------------|-------------|----------------|---------|
| `api_key` | Low (public identifier) | Backend env var (can be in some frontend contexts) | Rarely |
| `api_secret` | **Critical** — treat like a private key | Backend env var only, never in frontend | If compromised |
| `access_token` | High — per-user session | Backend DB, encrypted at rest | Daily (midnight expiry) |

### Environment Variable Management

```bash
# .env (never commit)
KITE_API_KEY=your_api_key_here
KITE_API_SECRET=your_api_secret_here

# Access in Node.js
const apiKey = process.env.KITE_API_KEY;
const apiSecret = process.env.KITE_API_SECRET;
```

```java
// Java — application.properties (gitignored) or environment variable
String apiKey = System.getenv("KITE_API_KEY");
String apiSecret = System.getenv("KITE_API_SECRET");
```

Never hardcode credentials. Never log them. Use a secrets manager (AWS Secrets Manager,
HashiCorp Vault, GCP Secret Manager) in production.

---

## Access Token Storage

access_tokens expire at midnight but are highly sensitive during their lifetime.
A leaked access_token allows full trading access for the rest of the day.

```sql
-- Store encrypted, not plaintext
CREATE TABLE user_kite_sessions (
  user_id         VARCHAR(10) PRIMARY KEY,
  access_token    TEXT NOT NULL,        -- Encrypt at rest (AES-256 or vault)
  public_token    TEXT,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP NOT NULL
);
```

```javascript
// Encrypt before storing
const crypto = require('crypto');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(encryptedText) {
  const [iv, tag, encrypted] = encryptedText.split(':').map(s => Buffer.from(s, 'hex'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
```

---

## Preventing Order Tampering

When users initiate orders from your UI, validate all parameters server-side:

```javascript
async function validateOrderRequest(userRequest, userId) {
  // 1. Check product type is allowed for user's account tier
  const allowedProducts = ['CNC', 'MIS'];  // e.g., no NRML for non-F&O enabled accounts
  if (!allowedProducts.includes(userRequest.product)) {
    throw new Error('Product type not allowed');
  }

  // 2. Check quantity limits (your own business rules)
  const MAX_SINGLE_ORDER_VALUE = 500000;  // ₹5 lakh
  const orderValue = userRequest.quantity * userRequest.price;
  if (orderValue > MAX_SINGLE_ORDER_VALUE) {
    throw new Error('Order value exceeds limit');
  }

  // 3. Verify instrument is valid and tradable
  const instrument = instrumentCache.get(
    `${userRequest.exchange}:${userRequest.tradingsymbol}`
  );
  if (!instrument) {
    throw new Error('Invalid instrument');
  }

  // 4. Validate price tick
  const tickSize = instrument.tick_size;
  const pricePaise = Math.round(userRequest.price * 100);
  const tickPaise = Math.round(tickSize * 100);
  if (pricePaise % tickPaise !== 0) {
    throw new Error(`Price must be a multiple of tick size (${tickSize})`);
  }

  // 5. For F&O: validate lot size
  if (['NFO', 'BFO', 'MCX'].includes(userRequest.exchange)) {
    if (userRequest.quantity % instrument.lot_size !== 0) {
      throw new Error(`Quantity must be multiple of lot size (${instrument.lot_size})`);
    }
  }
}
```

---

## Rate Limit Protection

Zerodha imposes rate limits. Exceeding them causes HTTP 429 and can flag your app.
Implement a rate limiter in your own backend:

```javascript
const Bottleneck = require('bottleneck');

// Limit order placement to 10/second
const orderLimiter = new Bottleneck({ minTime: 100, maxConcurrent: 1 });
// Limit quotes to 1/second
const quoteLimiter = new Bottleneck({ minTime: 1000, maxConcurrent: 1 });

const placeOrderSafe = orderLimiter.wrap((variety, params) => kite.placeOrder(variety, params));
const getQuoteSafe = quoteLimiter.wrap((instruments) => kite.getQuote(instruments));
```

---

## Session Expiry — UX & Security Balance

Token expires at midnight IST. For trading apps:

1. **Pre-market alert**: At 8:00 AM, check if token is valid. Prompt re-login.
2. **Session check on every page load**: If token expired, redirect to Zerodha login.
3. **Never store tokens in localStorage/cookies on frontend**: Keep on backend, use your own session.

```javascript
async function ensureValidKiteSession(userId) {
  const session = await db.userSessions.findOne({ where: { user_id: userId } });

  if (!session || new Date(session.expires_at) <= new Date()) {
    throw new KiteSessionExpiredError('Please log in to Zerodha again to continue trading.');
  }

  return decrypt(session.access_token);
}
```

---

## Audit Logging

Log every order action for compliance and debugging:

```javascript
async function logOrderAction(userId, action, params, result, error = null) {
  await db.auditLogs.create({
    user_id: userId,
    action,               // 'placeOrder', 'cancelOrder', 'modifyOrder'
    request_params: JSON.stringify(params),
    result: JSON.stringify(result),
    error: error?.message,
    ip_address: req.ip,
    timestamp: new Date(),
  });
}
```

SEBI requires brokers to maintain audit logs of all trading activity for 5 years.
If you are building a SEBI-registered platform (PMS, RIA, algo trading platform),
ensure your logging meets these requirements.
