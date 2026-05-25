# Security — PCI Compliance, Key Management, Fraud

## PCI DSS — What It Is and Why It Matters

PCI DSS (Payment Card Industry Data Security Standard) is a set of requirements for any
business that processes card payments. Non-compliance can result in fines and losing the
ability to accept card payments.

### Compliance Levels with Stripe

| SAQ Type | When Applicable | Effort |
|----------|----------------|--------|
| SAQ A | Using Stripe.js/Elements or Checkout (card data never on your server) | **Easiest** — ~20 questions |
| SAQ A-EP | Using Stripe.js but your JavaScript on the payment page can affect it | Medium |
| SAQ D | Processing/storing card data yourself | **Hardest** — hundreds of controls |

**With Stripe.js properly implemented**: You qualify for SAQ A.
This means:
- You never see raw card numbers
- You don't store card data
- Stripe handles the heavy PCI burden

**Maintain SAQ A compliance by**:
- Never accepting card data through your own server endpoints
- Never logging card numbers, even partial ones
- Using Stripe.js for all card data collection
- Not accessing the payment iframe's contents via JavaScript

---

## API Key Security

### Rotation

Regularly rotate your secret keys:

```bash
# 1. Generate a new key in Stripe Dashboard
# 2. Update environment variables in all services
# 3. Verify new key works in staging
# 4. Deploy to production
# 5. Delete the old key in Stripe Dashboard
```

### Environment-based Key Management

```
dev/local:     pk_test_ / sk_test_   → stored in .env.local (never committed)
staging:       pk_test_ / sk_test_   → stored in secrets manager
production:    pk_live_ / sk_live_   → stored in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
```

```javascript
// Verify you're using the right key type
if (process.env.NODE_ENV === 'production') {
  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw new Error('Production must use live Stripe keys!');
  }
}
if (process.env.NODE_ENV !== 'production') {
  if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw new Error('Non-production environment must not use live Stripe keys!');
  }
}
```

### Never in Source Code

```javascript
// WRONG — never hardcode
const stripe = new Stripe('sk_live_ABC123XYZ...');

// CORRECT — always from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

Add to `.gitignore`:
```
.env
.env.local
.env.production
*.pem
```

Add pre-commit hook to scan for accidentally committed secrets:
```bash
# Using git-secrets or trufflehog
git secrets --scan
```

---

## Stripe Radar — Fraud Detection

Stripe Radar is built-in fraud detection using ML trained on billions of transactions.
It runs on every payment and assigns a fraud risk score.

### How it works

1. Stripe.js collects browser signals (device fingerprint, IP, behavior)
2. These signals are attached to the payment
3. Radar evaluates against its fraud model
4. Payment is allowed, blocked, or challenged with 3DS

### Radar Rules

You can write custom rules in the Stripe Dashboard:

```
# Block payments from a specific country
Block if :ip_country: = 'XX'

# Challenge (require 3DS) for large amounts from new customers
Request 3DS if :amount_in_usd: > 500 and :customer_was_charged_before: = false

# Block if email domain is in your known-bad list
Block if :email_domain: in ('tempmail.com', 'throwaway.io')

# Block disposable email addresses
Block if :is_disposable_email: = true

# Allow trusted customers
Allow if :metadata:trusted_customer: = 'true'
```

### Radar for Fraud Teams

For high-volume businesses, Radar for Fraud Teams adds:
- Custom ML models trained on your data
- Advanced rule conditions
- Review queue for manual review of borderline transactions

---

## Protecting Your Webhook Endpoint

### Signature Verification (Review from webhooks.md)

```javascript
const event = stripe.webhooks.constructEvent(
  rawBody,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Additional Protection

```javascript
// 1. Rate limit the webhook endpoint
const rateLimit = require('express-rate-limit');
app.use('/webhooks/stripe', rateLimit({ 
  windowMs: 60 * 1000, 
  max: 100        // Stripe sends at most a few per second normally
}));

// 2. IP allowlist (Stripe publishes their IP ranges)
// Note: Stripe's IPs change — use signature verification instead, not IP allowlist
// But you can use IP allowlist as an additional layer

// 3. Log all webhook receipts for audit
app.post('/webhooks/stripe', (req, res, next) => {
  logger.info('webhook_received', {
    stripe_event_id: req.headers['stripe-event-id'],
    signature_present: !!req.headers['stripe-signature'],
  });
  next();
});
```

---

## Customer Data Protection

### Minimize Data Storage

Don't store what you don't need:

```javascript
// Store in your DB:
// - stripe_customer_id (to reference Stripe)
// - last4 of card (for display)
// - card brand (for display icon)
// - expiry month/year (to warn about expiring cards)
// - stripe_payment_method_id (to charge later)

// DO NOT store:
// - Full card number (never, ever)
// - CVV (even Stripe doesn't store this)
// - Magnetic stripe data

// Get display data from PaymentMethod object
const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
await db.paymentMethods.create({
  user_id: userId,
  stripe_payment_method_id: pm.id,
  card_brand: pm.card.brand,           // 'visa', 'mastercard', etc.
  card_last4: pm.card.last4,
  exp_month: pm.card.exp_month,
  exp_year: pm.card.exp_year,
});
```

### GDPR / Data Deletion

When a user requests data deletion:

```javascript
async function deleteUserData(userId) {
  const user = await db.users.findById(userId);
  
  if (user.stripe_customer_id) {
    // Option 1: Delete customer in Stripe (deletes all their payment methods)
    await stripe.customers.del(user.stripe_customer_id);
    
    // Option 2: Anonymize (if you need to keep billing history for accounting)
    await stripe.customers.update(user.stripe_customer_id, {
      email: `deleted-${userId}@deleted.invalid`,
      name: 'Deleted User',
      metadata: { deleted: 'true', deleted_at: new Date().toISOString() },
    });
  }
  
  // Anonymize your DB records
  await db.users.update(
    { email: null, name: 'Deleted', stripe_customer_id: null },
    { where: { id: userId } }
  );
}
```

---

## HTTPS Everywhere

Stripe.js requires HTTPS in production. Your payment pages must be served over HTTPS.
- Never load Stripe.js over HTTP
- Never redirect from HTTPS payment page to HTTP
- Get a valid TLS certificate (Let's Encrypt is free)

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

---

## Content Security Policy (CSP)

If your app uses CSP headers, whitelist Stripe domains:

```javascript
// Helmet.js CSP configuration
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "https://js.stripe.com",      // Stripe.js
    ],
    frameSrc: [
      "https://js.stripe.com",      // Payment Element iframes
      "https://hooks.stripe.com",
    ],
    connectSrc: [
      "'self'",
      "https://api.stripe.com",     // API calls from Stripe.js
    ],
    imgSrc: [
      "'self'",
      "https://*.stripe.com",       // Card brand logos
    ],
  },
}));
```

Failing to whitelist these will break Stripe.js silently.

---

## Security Checklist

- [ ] Secret key stored in secrets manager, not env files in repo
- [ ] Different keys per environment (test vs live)
- [ ] Webhook signature verified on every request
- [ ] Raw body used for webhook verification
- [ ] Amount calculated server-side, never trusted from frontend
- [ ] No card data ever logged or stored (only last4, brand, expiry)
- [ ] HTTPS enforced in production
- [ ] CSP headers configured for Stripe domains
- [ ] GDPR deletion flow tested
- [ ] Stripe Radar rules configured for known fraud patterns
- [ ] API key rotation procedure documented
- [ ] Secret scanning in CI/CD (detect leaked keys before they reach repo)
