# Security

## The Two Signature Verifications — Never Skip Either

Razorpay has two distinct verification mechanisms. Both are mandatory.

### 1. Payment Callback Verification (Frontend → Backend)
After the checkout handler fires, verify the payment is legitimate before fulfilling.

```javascript
// Signed: order_id + "|" + payment_id
// Key: YOUR KEY SECRET
const isValid = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${order_id}|${payment_id}`)
  .digest('hex') === signature;
```

### 2. Webhook Signature Verification (Razorpay → Backend)
Verify every incoming webhook request before processing.

```javascript
// Signed: raw request body
// Key: YOUR WEBHOOK SECRET (different from Key Secret)
const isValid = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex') === req.headers['x-razorpay-signature'];
```

**These use different secrets**: Key Secret ≠ Webhook Secret.
Set a separate random string as webhook secret in the Razorpay Dashboard.

---

## Key Management

```bash
# Environment variables — never hardcode
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXX         # Safe on frontend (Key ID only)
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX  # Backend only, CRITICAL
RAZORPAY_WEBHOOK_SECRET=random_strong_secret  # Webhook endpoint only
```

### Rotation Policy
- Rotate Key Secret every 90 days or immediately on suspected compromise
- To rotate: Dashboard → Settings → API Keys → Regenerate
- Old key continues working for a short grace period after rotation
- Update all services before old key expires

### Key Storage Best Practices

| Environment | Storage |
|-------------|---------|
| Local dev | `.env` file (in `.gitignore`) |
| CI/CD | GitHub Secrets / GitLab CI Variables |
| Production | AWS Secrets Manager / HashiCorp Vault / GCP Secret Manager |
| Container | Injected as environment variables at runtime |

```bash
# .gitignore — always include
.env
.env.local
.env.production
```

---

## PCI DSS Compliance

Razorpay is PCI DSS Level 1 certified. If you use Razorpay Checkout (Standard or Custom with Razorpay.js), you are on the **SAQ A** (simplest) compliance path because:
- Raw card data never enters your systems
- Razorpay.js tokenizes card details on the client
- Your servers only see payment IDs and order IDs

**SAQ A requirements** (your responsibility):
- HTTPS on all pages that link to payment pages
- No cardholder data stored in your database
- Secure configuration for your servers
- Annual self-assessment questionnaire

If you use S2S (raw card data flows through your server), you need full PCI DSS Level 1 audit. Avoid this.

---

## HTTPS Everywhere

- All payment pages must be served over HTTPS
- Webhook endpoint must be HTTPS (Razorpay won't deliver to HTTP in production)
- Use HSTS headers on your payment-related routes:

```javascript
// Express
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

## Razorpay Shield (Fraud Detection)

Razorpay Shield is built-in fraud detection. It uses:
- Machine learning on transaction patterns
- Device fingerprinting
- Velocity checks
- Blocklist of known fraudulent cards/UPI IDs

You don't implement this — it's automatic. But you can:
- Configure rules in Dashboard → Fraud & Risk → Shield
- Block specific BINs (card prefixes)
- Add custom rules (e.g., block international cards for your use case)
- Review flagged transactions before capture (manual review mode)

---

## Preventing Double-Payment Attacks

Scenario: A malicious user submits the frontend callback twice or replays a valid signature.

```javascript
// Use database unique constraint on payment_id
// Schema: payments table with UNIQUE INDEX on razorpay_payment_id

await db.payments.create({
  razorpay_payment_id,           // Unique constraint — duplicate throws error
  razorpay_order_id,
  amount,
  status: 'captured',
}).catch(async (err) => {
  if (err.code === 'UNIQUE_VIOLATION') {
    // Already processed — idempotent success
    return;
  }
  throw err;
});
```

---

## Preventing Order Amount Tampering

The frontend sends `amount` to the checkout. A malicious user could modify it in browser dev tools.

**Razorpay's defense**: The Order object is created by your backend with the correct amount.
If the frontend tries to send a different amount in the checkout options, Razorpay rejects it
(checkout amount must match order amount).

**Your defense**: Always look up the amount from your database using the `razorpay_order_id`,
never trust the `amount` sent by the frontend in your verify endpoint.

```javascript
// WRONG — trusting frontend amount
app.post('/api/verify', (req, res) => {
  const { amount, payment_id, order_id, signature } = req.body;
  // amount could be tampered
});

// CORRECT — fetch from your DB
app.post('/api/verify', async (req, res) => {
  const { payment_id, order_id, signature } = req.body;
  const order = await db.orders.findOne({ where: { razorpay_order_id: order_id } });
  // order.amount is from YOUR database — trustworthy
});
```

---

## Webhook Endpoint Security

```javascript
app.post('/webhooks/razorpay',
  // 1. Rate limit to prevent abuse
  rateLimit({ windowMs: 60 * 1000, max: 100 }),

  // 2. Raw body required before any middleware parses it
  express.raw({ type: 'application/json', limit: '1mb' }),

  async (req, res) => {
    // 3. Verify signature immediately
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing signature' });

    const body = req.body.toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    // 4. Use constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))) {
      console.warn('Invalid webhook signature from IP:', req.ip);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 5. Parse only after verification
    const event = JSON.parse(body);

    // 6. Don't log sensitive data
    console.log('Webhook received:', event.event, event.payload?.payment?.entity?.id);
    // Not: console.log(event) — would log card/UPI details

    // ...handle event
  }
);
```

---

## Sensitive Data Handling

**Never log or store**:
- Full card numbers (PAN)
- CVV
- UPI PIN
- Full bank account numbers
- Customer's complete payment method details

**Safe to log**:
- Payment ID (`pay_ABC123`)
- Order ID (`order_ABC123`)
- Amount
- Payment method type (card/upi/netbanking) — not specific details
- Last 4 digits of card (only if fetched from Razorpay, never from user input)

---

## Security Checklist

- [ ] Key Secret only in environment variables, never in code
- [ ] Separate Webhook Secret configured in Dashboard
- [ ] Both payment signature AND webhook signature verified
- [ ] Using `crypto.timingSafeEqual` for signature comparison
- [ ] HTTPS on all pages and webhook endpoint
- [ ] Not logging sensitive payment data
- [ ] Amount looked up from database, not trusted from frontend
- [ ] Unique index on `razorpay_payment_id` to prevent duplicate processing
- [ ] Rate limiting on webhook endpoint
- [ ] Key Secret rotation plan in place
- [ ] PCI SAQ A compliance documented
