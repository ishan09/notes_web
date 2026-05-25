# Webhooks — The Most Critical Part of Stripe Integration

Webhooks are HTTP POST requests that Stripe sends to your server when events happen
(payment succeeded, subscription cancelled, card declined, etc.).

**If you get webhooks wrong, your system will have bugs that are very hard to debug.**
Many production incidents come from incorrect webhook handling.

---

## Why Webhooks Are Essential

The payment flow is asynchronous. When you call `stripe.paymentIntents.create()`, the payment
isn't necessarily done — it might require 3DS authentication, bank processing time, or fraud review.

Webhooks are how Stripe tells you "this thing actually happened."

Without webhooks:
- You might fulfill an order that was never paid
- You might not revoke access after a subscription cancels
- You might miss failed payments for subscriptions

---

## Setting Up Webhooks

### Step 1: Create the endpoint in Stripe Dashboard

Dashboard → Developers → Webhooks → Add endpoint

```
Endpoint URL: https://yourapp.com/webhooks/stripe
Events to listen to: (select the ones you need)
```

### Step 2: Get the Webhook Secret

After creating the endpoint, Stripe shows you a `Signing Secret` (starts with `whsec_`).
Store this as an environment variable: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 3: Implement the endpoint

```javascript
// Express.js example
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// CRITICAL: Use raw body for webhook verification
// Do NOT use express.json() middleware before this route
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // Raw body required
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      // Verify the webhook came from Stripe (not someone spoofing it)
      event = stripe.webhooks.constructEvent(
        req.body,                              // Raw body (Buffer)
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      await handleStripeEvent(event);
    } catch (err) {
      // Log the error but still return 200 — see "Idempotency" section
      console.error('Error handling webhook event:', err);
      // Return 500 only if you want Stripe to retry
      return res.status(500).send('Handler failed');
    }

    // Acknowledge receipt to Stripe
    res.json({ received: true });
  }
);
```

---

## Signature Verification — Why It Matters

Without verification, anyone can POST to your webhook endpoint and fake events.
Imagine someone POSTing `{ type: 'payment_intent.succeeded', ... }` with a fake order ID.
Your server would fulfill an order that was never paid.

Stripe signs each webhook with your webhook secret using HMAC-SHA256.
`stripe.webhooks.constructEvent()` verifies this signature and throws if invalid.

**Always verify. Never skip this.**

### Common Mistake: Body Parsing

```javascript
// WRONG — express.json() parses and re-serializes the body
// The signature check will fail because the raw bytes changed
app.use(express.json());
app.post('/webhooks/stripe', (req, res) => {
  stripe.webhooks.constructEvent(req.body, sig, secret); // FAILS
});

// CORRECT — use express.raw() specifically for the webhook route
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handler);
```

In Next.js, disable body parsing for the webhook route:

```javascript
// pages/api/webhooks/stripe.js or app/api/webhooks/stripe/route.js

// pages router
export const config = {
  api: { bodyParser: false },
};

// app router
export async function POST(request) {
  const body = await request.text(); // Raw body as string
  const sig = request.headers.get('stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response('Webhook error', { status: 400 });
  }
  // ...
}
```

---

## Key Events to Handle

### Payment Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `payment_intent.succeeded` | Payment collected | Fulfill order, send receipt |
| `payment_intent.payment_failed` | Payment failed | Notify customer, log |
| `payment_intent.canceled` | Intent canceled | Release reserved inventory |
| `charge.dispute.created` | Customer filed dispute | Gather evidence, respond |

### Subscription Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `customer.subscription.created` | New subscription | Provision access |
| `customer.subscription.updated` | Plan change | Update entitlements |
| `customer.subscription.deleted` | Cancelled | Revoke access |
| `invoice.paid` | Invoice paid | Extend subscription period |
| `invoice.payment_failed` | Renewal failed | Send dunning email, retry |
| `invoice.payment_action_required` | 3DS needed | Email customer to authenticate |

### Customer Events

| Event | When it fires | What to do |
|-------|--------------|------------|
| `customer.updated` | Customer details changed | Sync to your DB |
| `payment_method.attached` | Card saved | Update stored payment method info |
| `payment_method.detached` | Card removed | Remove from your DB |

---

## Idempotency — Handling Duplicate Webhook Delivery

**Stripe guarantees at-least-once delivery.** It does NOT guarantee exactly-once.

If your server returns non-2xx, Stripe retries the webhook with exponential backoff
for up to 72 hours. This means your handler can receive the same event multiple times.

**If your handler is not idempotent, you will have bugs like:**
- Sending a customer 3 "welcome" emails
- Crediting an account twice
- Creating duplicate database records

### Making Handlers Idempotent

**Option 1: Track processed events**

```javascript
async function handleStripeEvent(event) {
  // Check if we've already processed this event
  const existing = await db.processedWebhooks.findOne({ 
    where: { stripe_event_id: event.id } 
  });
  
  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  // Process the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    // ...
  }

  // Mark as processed
  await db.processedWebhooks.create({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date(),
  });
}
```

**Option 2: Upsert patterns** (where possible)

```javascript
// Instead of INSERT, use upsert
// If subscription already exists with this ID, update it
await db.subscriptions.upsert({
  stripe_subscription_id: subscription.id,
  status: subscription.status,
  // ...
});
```

**Option 3: Check state before acting**

```javascript
case 'payment_intent.succeeded':
  const order = await db.orders.findOne({ 
    where: { stripe_payment_intent_id: event.data.object.id }
  });
  
  if (order.status === 'fulfilled') {
    return; // Already done
  }
  
  await fulfillOrder(order.id);
  break;
```

---

## Webhook Retry Schedule

When your endpoint returns non-2xx:

```
Attempt 1: Immediately
Attempt 2: 5 minutes later
Attempt 3: 30 minutes later
Attempt 4: 2 hours later
Attempt 5: 5 hours later
Attempt 6: 10 hours later
Attempt 7: 24 hours later
...up to 72 hours (about 15 attempts)
```

**Implication**: A 72-hour outage of your webhook endpoint = lost events.
Monitor webhook delivery failures in Stripe Dashboard → Developers → Webhooks → Failed.

---

## Responding to Webhooks Quickly

Stripe times out webhook delivery after **30 seconds**. If your handler takes longer,
Stripe considers it failed and retries.

**Pattern: Acknowledge immediately, process asynchronously**

```javascript
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = /* ... verify signature ... */;

  // Acknowledge immediately
  res.json({ received: true });

  // Process asynchronously (don't await before responding)
  processEventAsync(event).catch(err => {
    console.error('Async event processing failed:', err);
    // Alert via monitoring (Sentry, etc.)
  });
});

async function processEventAsync(event) {
  // Push to a job queue (Redis, SQS, etc.) for reliable processing
  await jobQueue.add('stripe-webhook', { event });
}
```

**Even better**: Push events to a queue (BullMQ, SQS, RabbitMQ) and process in workers.
This gives you retries, dead letter queues, and horizontal scaling.

---

## Testing Webhooks Locally

Stripe CLI is the standard tool:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

The CLI also prints the webhook signing secret for local testing.

---

## Webhook Security Checklist

- [ ] Verify signature on every request
- [ ] Use raw body (not parsed JSON) for verification
- [ ] Return 200 quickly, process async
- [ ] Make all handlers idempotent
- [ ] Store processed event IDs
- [ ] Monitor failed webhook deliveries
- [ ] Have alerts for webhook processing failures
- [ ] Test with Stripe CLI locally
- [ ] Never log full webhook payloads (they contain sensitive data)
