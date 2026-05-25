# Backend Integration

## Architecture Principles

1. **Your backend is the authority** — the frontend should only display state, not decide it
2. **Stripe is the source of truth for payment state** — sync from Stripe, don't trust frontend claims
3. **Use idempotency keys** — every create/modify call should be idempotent
4. **Verify amounts server-side** — never trust the amount sent from the frontend

---

## Idempotency Keys

When you call Stripe's API, network failures can cause you to not receive the response —
but Stripe may have already processed the request. Without idempotency keys, retrying
would create duplicate charges.

```javascript
// Every write operation should have an idempotency key
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: 2999,
    currency: 'usd',
    customer: stripeCustomerId,
  },
  {
    idempotencyKey: `pi-create-${orderId}`,  // Deterministic key tied to your intent
  }
);
```

If Stripe receives the same idempotency key within 24 hours, it returns the original response
instead of creating a duplicate.

### Good Idempotency Key Patterns

```javascript
// One-time payment for an order
idempotencyKey: `payment-${orderId}-${userId}`

// Subscription creation for a user
idempotencyKey: `subscription-create-${userId}-${priceId}`

// Refund for a specific charge
idempotencyKey: `refund-${chargeId}-full`

// Avoid random keys (defeats the purpose)
// BAD: idempotencyKey: `${uuid()}` — new key every time = no protection
```

---

## Amount Verification (Critical Security Issue)

**Never trust the amount from the frontend.** A malicious user can modify the request:

```javascript
// WRONG — trusting frontend amount
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;  // User could send { amount: 1 }
  const intent = await stripe.paymentIntents.create({ amount, currency: 'usd' });
  res.json({ clientSecret: intent.client_secret });
});

// CORRECT — calculate amount server-side from trusted data
app.post('/create-payment-intent', async (req, res) => {
  const { cartId } = req.body;
  
  // Load cart from DB (trusted source)
  const cart = await db.carts.findOne({ 
    where: { id: cartId, user_id: req.user.id }  // Verify ownership
  });
  
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  
  // Calculate amount from DB — never from frontend
  const amount = await calculateCartTotal(cart.id);  // Your business logic
  
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: { cart_id: cart.id, user_id: req.user.id },
  });
  
  res.json({ clientSecret: intent.client_secret });
});
```

---

## Customer Lifecycle Management

### Creating a Customer (Once Per User)

```javascript
async function getOrCreateStripeCustomer(userId) {
  const user = await db.users.findById(userId);
  
  // Already has a Stripe customer
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.full_name,
      metadata: {
        user_id: String(userId),    // Always store your internal ID
        environment: process.env.NODE_ENV,
      },
    },
    {
      idempotencyKey: `customer-create-${userId}`,
    }
  );
  
  // Persist immediately — if this DB write fails, you'd create duplicates next time
  await db.users.update(
    { stripe_customer_id: customer.id },
    { where: { id: userId } }
  );
  
  return customer.id;
}
```

### Syncing Customer Email Changes

When a user changes their email:

```javascript
async function onUserEmailChange(userId, newEmail) {
  const user = await db.users.findById(userId);
  
  // Update your DB
  await db.users.update({ email: newEmail }, { where: { id: userId } });
  
  // Sync to Stripe so invoices use the new email
  if (user.stripe_customer_id) {
    await stripe.customers.update(user.stripe_customer_id, {
      email: newEmail,
    });
  }
}
```

---

## Refunds

```javascript
async function refundPayment(paymentIntentId, amountCents = null, reason = null) {
  const refundParams = {
    payment_intent: paymentIntentId,
  };
  
  // Optional: partial refund
  if (amountCents) {
    refundParams.amount = amountCents;
  }
  
  // Optional: reason (improves Stripe analytics)
  // 'duplicate', 'fraudulent', 'requested_by_customer'
  if (reason) {
    refundParams.reason = reason;
  }
  
  const refund = await stripe.refunds.create(refundParams, {
    idempotencyKey: `refund-${paymentIntentId}-${amountCents || 'full'}`,
  });
  
  // Update your database
  await db.orders.update(
    { refund_status: 'refunded', refund_id: refund.id },
    { where: { stripe_payment_intent_id: paymentIntentId } }
  );
  
  return refund;
}
```

**Refund timing**: Refunds typically take 5-10 business days to appear on the customer's statement.
You can show the refund as "pending" in your UI based on the Stripe refund object status.

**Webhook**: Stripe fires `charge.refunded` when a refund is created. Handle this to update your
records if refunds can be initiated from the Stripe Dashboard too.

---

## Disputes (Chargebacks)

A dispute (chargeback) is when a customer asks their bank to reverse a charge.
Stripe automatically notifies you and gives you a window to submit evidence.

```javascript
case 'charge.dispute.created':
  const dispute = event.data.object;
  
  // Alert your team immediately
  await alertTeam({
    type: 'dispute',
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,      // 'fraudulent', 'subscription_canceled', 'unrecognized', etc.
    evidence_due_by: dispute.evidence_details.due_by,
  });
  
  // Pull order details to prepare evidence
  const order = await db.orders.findOne({
    where: { stripe_charge_id: dispute.charge }
  });
  
  // Start preparing evidence package
  await prepareDisputeEvidence(dispute.id, order);
  break;
```

### Submitting Dispute Evidence

```javascript
await stripe.disputes.update(disputeId, {
  evidence: {
    customer_name: 'Jane Doe',
    customer_email_address: 'jane@example.com',
    product_description: 'Pro Plan subscription — 1 month',
    receipt: receiptFileId,           // Upload file to Stripe first
    shipping_documentation: null,     // N/A for digital products
    service_date: '2024-01-15',
    // For subscriptions, customer_signature proves they agreed to terms
    uncategorized_text: 'Customer created account on Jan 15, logged in 47 times in January...',
  },
  submit: true,
});
```

---

## Database Schema Design

```sql
-- Users table
CREATE TABLE users (
  id                  UUID PRIMARY KEY,
  email               VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id  VARCHAR(255) UNIQUE,  -- 'cus_ABC123'
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table  
CREATE TABLE subscriptions (
  id                          UUID PRIMARY KEY,
  user_id                     UUID REFERENCES users(id),
  stripe_subscription_id      VARCHAR(255) UNIQUE NOT NULL,  -- 'sub_ABC123'
  stripe_price_id             VARCHAR(255) NOT NULL,
  status                      VARCHAR(50) NOT NULL,  -- 'active', 'past_due', 'canceled', etc.
  current_period_start        TIMESTAMP,
  current_period_end          TIMESTAMP,
  cancel_at_period_end        BOOLEAN DEFAULT FALSE,
  trial_end                   TIMESTAMP,
  created_at                  TIMESTAMP DEFAULT NOW(),
  updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id                          UUID PRIMARY KEY,
  user_id                     UUID REFERENCES users(id),
  stripe_payment_intent_id    VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id            VARCHAR(255),
  amount_cents                INTEGER NOT NULL,
  currency                    VARCHAR(3) NOT NULL,
  status                      VARCHAR(50) NOT NULL,  -- 'succeeded', 'failed', 'refunded'
  description                 TEXT,
  metadata                    JSONB,
  created_at                  TIMESTAMP DEFAULT NOW()
);

-- Processed webhook events (for idempotency)
CREATE TABLE processed_webhook_events (
  stripe_event_id   VARCHAR(255) PRIMARY KEY,  -- 'evt_ABC123'
  event_type        VARCHAR(100) NOT NULL,
  processed_at      TIMESTAMP DEFAULT NOW()
);
-- Add TTL or periodically clean up old events (keep 30 days)
```

---

## Error Handling

Stripe SDK throws typed errors. Handle them specifically:

```javascript
async function handleStripeError(err) {
  switch (err.type) {
    case 'StripeCardError':
      // Card was declined — customer-facing error
      // err.code: 'card_declined', 'insufficient_funds', 'expired_card', etc.
      return { userMessage: getCardErrorMessage(err.code), retryable: false };

    case 'StripeRateLimitError':
      // Too many requests — implement exponential backoff
      return { userMessage: 'Service busy, please try again', retryable: true };

    case 'StripeInvalidRequestError':
      // Invalid parameters — your bug, not user error
      console.error('Stripe invalid request:', err.message, err.param);
      Sentry.captureException(err);
      return { userMessage: 'Something went wrong', retryable: false };

    case 'StripeAPIError':
      // Stripe internal error — retry is usually safe
      return { userMessage: 'Payment service temporarily unavailable', retryable: true };

    case 'StripeConnectionError':
      // Network issue between your server and Stripe — retry
      return { userMessage: 'Connection error, please try again', retryable: true };

    case 'StripeAuthenticationError':
      // Invalid API key — your configuration bug
      console.error('CRITICAL: Invalid Stripe API key');
      Sentry.captureException(err);
      return { userMessage: 'Service configuration error', retryable: false };

    default:
      Sentry.captureException(err);
      return { userMessage: 'An unexpected error occurred', retryable: false };
  }
}
```

---

## Logging and Observability

```javascript
// What to log (not card data)
const stripeLogger = {
  paymentAttempted: (userId, amount, currency) => {
    logger.info('payment_attempted', { userId, amount, currency });
  },
  paymentSucceeded: (userId, paymentIntentId, amount) => {
    logger.info('payment_succeeded', { userId, paymentIntentId, amount });
    metrics.increment('payments.succeeded', { currency: 'usd' });
    metrics.histogram('payment.amount_cents', amount);
  },
  paymentFailed: (userId, paymentIntentId, errorCode) => {
    logger.warn('payment_failed', { userId, paymentIntentId, errorCode });
    metrics.increment('payments.failed', { error_code: errorCode });
  },
  webhookReceived: (eventType, eventId) => {
    logger.info('webhook_received', { eventType, eventId });
  },
  webhookProcessed: (eventType, eventId, duration) => {
    logger.info('webhook_processed', { eventType, eventId, duration });
    metrics.histogram('webhook.processing_duration_ms', duration, { event_type: eventType });
  },
};

// What NOT to log
// - Card numbers, even partial
// - CVV codes
// - Full webhook payloads (may contain customer PII)
// - Secret keys
```

---

## API Versioning in Practice

```javascript
// Pin version in your Stripe SDK initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',    // Pinned version
  maxNetworkRetries: 2,         // Built-in retry for network errors
  timeout: 30000,               // 30 second timeout
  appInfo: {                    // Helps Stripe support identify your app
    name: 'YourApp',
    version: '1.0.0',
    url: 'https://yourapp.com',
  },
});
```

### Upgrading Stripe API versions

1. Read the changelog for the new version
2. Test in test mode with the new version header
3. Update your Stripe webhook endpoint to receive events in the new version format
4. Deploy backend changes
5. Update the `apiVersion` in your SDK config
