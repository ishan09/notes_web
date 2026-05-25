# Webhooks — The Most Critical Part of Razorpay Integration

Webhooks are HTTP POST requests that Razorpay sends to your server when events happen
(payment captured, order paid, subscription charged, refund processed, etc.).

**If you get webhooks wrong, your system will have silent bugs.**
Especially critical for UPI — UPI payments are asynchronous and can complete minutes after checkout.

---

## Why Webhooks Are Essential

The payment flow is asynchronous. After the frontend handler fires, the payment might still be:
- Pending UPI customer approval
- Under fraud review
- Waiting for bank confirmation

Webhooks are how Razorpay tells you "this thing actually happened on our end."

Without webhooks:
- UPI orders may never get fulfilled (customer paid but you didn't know)
- Subscription renewals won't update your database
- Refund status will be stale

---

## Setting Up Webhooks

### Step 1: Configure in Razorpay Dashboard

Dashboard → Settings → Webhooks → Add New Webhook

```
Webhook URL: https://yourapp.com/webhooks/razorpay
Secret: (set a random strong string)
Active Events: (check the ones you need)
```

### Step 2: Store the Webhook Secret

```bash
RAZORPAY_WEBHOOK_SECRET=your_random_strong_secret
```

### Step 3: Implement the Endpoint

```javascript
// Express.js
const express = require('express');
const crypto = require('crypto');

app.post(
  '/webhooks/razorpay',
  express.raw({ type: 'application/json' }), // Raw body required for signature verification
  async (req, res) => {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const body = req.body.toString('utf8');

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body);

    try {
      await handleRazorpayEvent(event);
    } catch (err) {
      console.error('Webhook handler error:', err);
      return res.status(500).send('Handler failed');
    }

    res.json({ status: 'ok' });
  }
);
```

---

## Signature Verification — Why It Matters

Without verification, anyone can POST to your webhook endpoint with fake events.
Imagine someone sending `{ event: 'payment.captured', ... }` with a fake payment ID.
Your server would fulfill an order that was never paid.

Razorpay signs each webhook with your webhook secret using HMAC-SHA256.

**Always verify. Never skip this.**

### Comparison with payment signature verification

| Verification Type | What is signed | When done |
|-------------------|---------------|-----------|
| Payment callback | `order_id|payment_id` | After checkout, using Key Secret |
| Webhook | Raw request body | On every webhook receipt, using Webhook Secret |

These use different secrets — don't mix them up.

### Common Mistake: Parsed Body

```javascript
// WRONG — express.json() parses body, changing raw bytes
app.use(express.json());
app.post('/webhooks/razorpay', (req, res) => {
  const body = JSON.stringify(req.body); // Bytes changed — signature will fail
});

// CORRECT — use raw body for this route
app.post(
  '/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handler
);
```

---

## Key Events to Handle

### Payment Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `payment.captured` | Payment successfully captured | Fulfill order, send receipt |
| `payment.failed` | Payment failed | Notify customer, log failure |
| `payment.authorized` | Authorized but not captured | Capture if manual mode |

### Order Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `order.paid` | Order fully paid | Reliable signal — fulfill order |

**Prefer `order.paid` over `payment.captured`** for order fulfillment.
An order can have multiple payment attempts; `order.paid` fires once when the order amount is fully collected.

### Subscription Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `subscription.activated` | Subscription goes active | Provision access |
| `subscription.charged` | Renewal payment collected | Extend subscription period |
| `subscription.cancelled` | Subscription cancelled | Schedule access revocation |
| `subscription.halted` | Multiple renewal failures | Notify customer, downgrade |
| `subscription.paused` | Subscription paused | Freeze access (or keep, per policy) |

### Refund Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `refund.created` | Refund initiated | Update order status |
| `refund.processed` | Refund credited to customer | Send refund confirmation |
| `refund.failed` | Refund failed | Alert team, manual intervention |

### Dispute Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `payment.dispute.created` | Customer filed dispute | Gather evidence |
| `payment.dispute.won` | Dispute resolved in your favor | Log, no action needed |
| `payment.dispute.lost` | Dispute resolved against you | Debit noted, review policy |

---

## Idempotency — Handling Duplicate Webhook Delivery

**Razorpay guarantees at-least-once delivery.** Not exactly-once.

If your server returns non-2xx, Razorpay retries. Your handler can receive the same event multiple times.

**If your handler is not idempotent, you will:**
- Send duplicate "payment confirmed" emails
- Credit accounts multiple times
- Create duplicate fulfillment records

### Making Handlers Idempotent

**Option 1: Track processed event IDs**

```javascript
async function handleRazorpayEvent(event) {
  const eventId = event.payload?.payment?.entity?.id || event.account_id + event.created_at;

  const alreadyProcessed = await db.processedWebhooks.exists({
    razorpay_event_id: event.event + '_' + eventId,
  });

  if (alreadyProcessed) {
    console.log('Duplicate event, skipping:', event.event, eventId);
    return;
  }

  switch (event.event) {
    case 'order.paid':
      await handleOrderPaid(event.payload.order.entity);
      break;
    case 'payment.captured':
      await handlePaymentCaptured(event.payload.payment.entity);
      break;
    case 'subscription.charged':
      await handleSubscriptionCharged(event.payload.subscription.entity);
      break;
  }

  await db.processedWebhooks.create({
    razorpay_event_id: event.event + '_' + eventId,
    event_type: event.event,
    processed_at: new Date(),
  });
}
```

**Option 2: Upsert patterns**

```javascript
// Use upsert — safe to run multiple times
await db.orders.upsert({
  razorpay_order_id: order.id,
  status: 'paid',
  paid_at: new Date(),
});
```

---

## Webhook Retry Schedule

Razorpay retries failed webhooks with exponential backoff:
- Attempt 1: Immediately
- Retries: 8 times over ~24 hours
- If all fail: webhook marked as failed in dashboard

Monitor failed webhooks at: Dashboard → Settings → Webhooks → your endpoint → Failed Events

---

## Respond Quickly

Razorpay times out webhook delivery at **5 seconds** (much shorter than Stripe's 30s).

**Pattern: Acknowledge immediately, process async**

```javascript
app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify signature first (fast operation)
  if (!isValidSignature(req)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body.toString());

  // Acknowledge immediately — critical for 5-second timeout
  res.json({ status: 'ok' });

  // Process asynchronously
  processEventAsync(event).catch(err => {
    console.error('Async webhook processing failed:', err);
    // Alert via Sentry, PagerDuty, etc.
  });
});
```

For high-volume systems, push to a job queue (BullMQ, SQS, RabbitMQ):

```javascript
async function processEventAsync(event) {
  await jobQueue.add('razorpay-webhook', { event }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
```

---

## Testing Webhooks Locally

Razorpay doesn't have a CLI like Stripe, but you can use ngrok:

```bash
# Expose local server
ngrok http 3000

# Use the ngrok URL in Razorpay Dashboard webhook config
# https://abc123.ngrok.io/webhooks/razorpay
```

Or use Razorpay's test webhook trigger in the dashboard:
Dashboard → Settings → Webhooks → your endpoint → Send Test Webhook

---

## Webhook Security Checklist

- [ ] Verify `x-razorpay-signature` header on every request
- [ ] Use raw body (not parsed JSON) for verification
- [ ] Return 200 within 5 seconds — process async
- [ ] Make all handlers idempotent (track processed event IDs)
- [ ] Handle `order.paid` as primary signal, `payment.captured` as secondary
- [ ] Monitor failed webhook deliveries in dashboard
- [ ] Have alerts for webhook processing failures
- [ ] Never log full webhook payloads (contain payment details)
- [ ] Separate webhook secret from Key Secret
