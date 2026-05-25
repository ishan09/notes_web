# Production Pitfalls — Real-World Bugs and Edge Cases

## 1. The Double-Charge Bug

**Scenario**: Customer clicks "Pay" twice. Two PaymentIntents are created. Both succeed.

**Why it happens**: Button not disabled during processing, or the frontend doesn't wait.

**Fix**:
```javascript
// Frontend: disable button immediately on click
let isProcessing = false;

submitButton.addEventListener('click', async () => {
  if (isProcessing) return;  // Guard against double-click
  isProcessing = true;
  submitButton.disabled = true;

  try {
    await stripe.confirmPayment({ elements, confirmParams });
  } finally {
    isProcessing = false;
    submitButton.disabled = false;
  }
});

// Backend: use idempotency keys tied to the cart/order
const paymentIntent = await stripe.paymentIntents.create(params, {
  idempotencyKey: `checkout-${cartId}`,  // Same cart = same idempotency key
});
```

---

## 2. Fulfilling Orders from the Success URL (Beginner Mistake)

**Scenario**: Order fulfilled when customer lands on `/success` page. Customers navigate
directly to the success URL and get orders fulfilled without paying.

**Fix**: Never fulfill from the success URL. Always fulfill from the webhook.

```javascript
// WRONG
app.get('/success', async (req, res) => {
  const { payment_intent } = req.query;
  await fulfillOrder(payment_intent);  // DANGEROUS
  res.render('success');
});

// CORRECT — webhook does the fulfillment
app.get('/success', async (req, res) => {
  const { payment_intent } = req.query;
  // Just show status, don't fulfill
  const intent = await stripe.paymentIntents.retrieve(payment_intent);
  res.render('success', { status: intent.status });
});

// Actual fulfillment in webhook
case 'payment_intent.succeeded':
  await fulfillOrder(event.data.object.id);
  break;
```

---

## 3. Race Condition: Webhook Arrives Before Your DB Is Ready

**Scenario**: 
1. User pays → PaymentIntent succeeds
2. Your backend creates an `order` record (takes 200ms)
3. Stripe fires webhook almost immediately
4. Webhook handler looks up the order — it doesn't exist yet
5. Webhook fails, Stripe retries 5 min later — by then the order exists

**This is generally fine** if you handle it correctly — the retry will work.
But there's a worse version:

**Worse scenario**:
1. User pays
2. Webhook fires
3. Your handler creates the order AND processes it (email sent, inventory decremented)
4. Second retry of webhook does it again (duplicate email, double inventory decrement)

**Fix**: Use processed event deduplication. If the event is already in your
`processed_webhook_events` table, skip it.

---

## 4. Webhooks Failing Silently

**Scenario**: Your webhook endpoint is down (deploy, server crash, timeout). Stripe retries
but eventually gives up after 72 hours. Events are lost.

**Fix**:
- Monitor webhook delivery failures in Stripe Dashboard
- Set up alerts (PagerDuty, Slack) for webhook delivery failures
- Process webhooks through a queue with its own retry logic (not just relying on Stripe's retries)
- Consider Stripe's "Destination Charges" model with automatic reconciliation

```javascript
// Health check endpoint for webhook processor
app.get('/health/webhooks', async (req, res) => {
  // Check if there are unprocessed events from Stripe
  const failedEvents = await stripe.events.list({
    type: 'payment_intent.succeeded',
    created: { gte: Math.floor(Date.now() / 1000) - 3600 }, // Last hour
  });
  
  // Compare with your processed events
  // Alert if gap is large
  res.json({ status: 'ok' });
});
```

---

## 5. Floating Point and Currency Mistakes

**Scenario**: Charge $9.99. Developer writes `amount: 9.99 * 100`.
Due to floating point: `9.99 * 100 = 998.9999999...`. Math.round → 999 (correct here).
But in more complex calculations:

```javascript
// Problematic
const subtotal = 0.1 + 0.2; // 0.30000000000000004
const total = subtotal * 100; // 30.000000000000004
Math.round(total); // 30 (lucky this time)

// But:
const price = 4.455;
const tax = price * 0.1; // 0.44550000000000001
const total = (price + tax) * 100; // 490.05000000000001 → rounds to 490, should be 490
// Off by 1 cent edge cases accumulate

// BEST PRACTICE: Store and operate on cents (integers) throughout
const priceCents = 445;
const taxCents = Math.round(priceCents * 0.1); // 45 (always integer)
const totalCents = priceCents + taxCents; // 490
// Pass totalCents directly to Stripe

// Or use a library
const Dinero = require('dinero.js');
const price = Dinero({ amount: 445, currency: 'USD' });
const tax = price.multiply(0.1);
const total = price.add(tax); // 490 cents
```

---

## 6. Webhook Secret Mismatch

**Scenario**: You have multiple webhook endpoints (one for live, one for test). You accidentally
use the test webhook secret in production or vice versa. Every webhook fails verification.

**Fix**:
- Keep webhook secrets in environment-specific secret stores
- Log a clear error when verification fails (don't just silently return 400)
- Test webhook verification locally with Stripe CLI

---

## 7. The Incomplete Subscription (Not Collecting Payment)

**Scenario**: You create a subscription but don't use `payment_behavior: 'default_incomplete'`.
The subscription is created in `active` state even though no payment was collected.

**Fix**: Always use `payment_behavior: 'default_incomplete'` for subscriptions requiring
immediate payment, and use the returned `client_secret` to confirm payment.

```javascript
// WRONG — subscription goes active without payment
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  // Missing payment_behavior
});

// CORRECT
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
});

// Get client_secret and send to frontend for payment confirmation
const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
```

---

## 8. Not Handling 3DS for Subscription Renewals

**Scenario**: Subscription works fine initially. On renewal (off-session), bank requires 3DS.
Your code crashes or silently fails. Customer's subscription lapses but they still have access.

**Fix**: Handle `invoice.payment_action_required` webhook:

```javascript
case 'invoice.payment_action_required':
  const invoice = event.data.object;
  // Customer needs to come back and authenticate
  await sendReauthEmail({
    to: invoice.customer_email,
    paymentIntentId: invoice.payment_intent,
    link: `https://yourapp.com/billing/reauth?pi=${invoice.payment_intent}`,
  });
  break;
```

```javascript
// Reauth page — customer confirms the payment intent with 3DS
const stripe = await loadStripe(publishableKey);
const clientSecret = new URLSearchParams(window.location.search).get('client_secret');

const { error } = await stripe.confirmCardPayment(clientSecret);
if (error) {
  showError(error.message);
} else {
  showSuccess('Payment confirmed! Thank you.');
}
```

---

## 9. Stale Subscription Status in Your Database

**Scenario**: Subscription is cancelled in Stripe (via Dashboard or Customer Portal) but your
DB still shows `active`. User retains access they shouldn't have.

**Why it happens**: Relying on your own DB without listening to all relevant webhooks.

**Fix**: Subscribe to all subscription change events and always sync:

```javascript
const SUBSCRIPTION_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
];

// In your webhook handler
case 'customer.subscription.updated':
case 'customer.subscription.deleted':
case 'customer.subscription.created':
  const sub = event.data.object;
  await db.subscriptions.upsert({
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000),
    cancel_at_period_end: sub.cancel_at_period_end,
  });
  break;
```

---

## 10. Not Reconciling Stripe with Your Database

**Scenario**: Over time, due to bugs/outages, your DB drifts from Stripe's state.
Some customers have access they shouldn't, others are locked out despite paying.

**Fix**: Build a daily reconciliation job:

```javascript
async function reconcileSubscriptions() {
  // Fetch all active subscriptions from Stripe
  const stripeSubscriptions = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
    // Paginate through all
  });

  for (const stripeSub of stripeSubscriptions.data) {
    const localSub = await db.subscriptions.findOne({
      where: { stripe_subscription_id: stripeSub.id }
    });

    if (!localSub) {
      // Stripe has a subscription we don't know about — sync it
      await syncSubscription(stripeSub);
      logger.warn('reconciliation_found_missing_subscription', { id: stripeSub.id });
    } else if (localSub.status !== stripeSub.status) {
      // Status mismatch — Stripe wins
      await db.subscriptions.update(
        { status: stripeSub.status },
        { where: { stripe_subscription_id: stripeSub.id } }
      );
      logger.warn('reconciliation_fixed_status_mismatch', {
        id: stripeSub.id,
        local: localSub.status,
        stripe: stripeSub.status,
      });
    }
  }
}
```

---

## 11. Test Cards Not Working in Production

**Scenario**: Everything works in test mode with test card `4242 4242 4242 4242`.
In production, real cards fail mysteriously.

**Common causes**:
- Wrong API keys (using test keys in production)
- 3DS required in production but not tested with 3DS test cards
- Currency mismatch (customer's card only accepts certain currencies)
- Amount too low or too high for some payment methods

**Test 3DS in test mode with these cards**:
```
4000 0027 6000 3184 — Always requires 3DS
4000 0082 6000 3178 — 3DS required, authentication fails
```

---

## 12. Metadata Limits

Stripe metadata has limits:
- Max 50 keys per object
- Key: max 40 characters
- Value: max 500 characters

```javascript
// This will fail silently or throw
metadata: {
  description: 'a'.repeat(501),  // Too long
}

// Validate metadata before sending
function validateMetadata(metadata) {
  const errors = [];
  if (Object.keys(metadata).length > 50) errors.push('Too many metadata keys');
  for (const [key, value] of Object.entries(metadata)) {
    if (key.length > 40) errors.push(`Key too long: ${key}`);
    if (String(value).length > 500) errors.push(`Value too long for key: ${key}`);
  }
  return errors;
}
```

---

## 13. Timezone Issues with Subscription Billing Dates

Stripe billing dates are Unix timestamps (UTC). Your server might be in a different timezone.

```javascript
// WRONG — local time
const trialEnd = new Date('2024-02-01 00:00:00');  // Local time!
stripe.subscriptions.create({ trial_end: Math.floor(trialEnd.getTime() / 1000) });

// CORRECT — explicit UTC
const trialEnd = new Date('2024-02-01T00:00:00Z');  // UTC
stripe.subscriptions.create({ trial_end: Math.floor(trialEnd.getTime() / 1000) });
// Or use a library: dayjs.utc('2024-02-01').unix()
```

---

## Quick Reference: Common Error Codes

| Error Code | Cause | Solution |
|------------|-------|----------|
| `card_declined` | Bank declined | Tell customer to try different card |
| `insufficient_funds` | Not enough money | Customer needs to add funds |
| `expired_card` | Card expired | Customer needs to update card |
| `incorrect_cvc` | Wrong CVV | Customer re-enters CVV |
| `authentication_required` | 3DS needed | Redirect to authenticate |
| `card_velocity_exceeded` | Too many charges | Wait, or contact customer |
| `do_not_honor` | Generic decline | Try different card |
| `invalid_number` | Bad card number | Validation error (check your frontend) |
| `amount_too_small` | Below minimum | Check Stripe's minimum amounts per currency |
| `amount_too_large` | Above maximum | Contact Stripe support for higher limits |
