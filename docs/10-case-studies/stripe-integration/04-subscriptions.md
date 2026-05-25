# Subscriptions — Recurring Billing

## Core Concepts

A **Subscription** is Stripe's object that:
1. Attaches a customer to a Price (how much, how often)
2. Automatically creates Invoices on each billing cycle
3. Automatically attempts to charge the saved payment method
4. Fires webhooks at every significant state change

### Objects Involved

```
Product (what you sell)
  └── Price (how much, how often)
        └── Subscription (customer + price + billing cycle)
              └── Invoice (auto-generated each cycle)
                    └── PaymentIntent (auto-created to pay the invoice)
```

---

## Creating a Subscription

### Step 1: Create Product and Price in Dashboard (or API)

```javascript
// Usually done once, in setup scripts or Dashboard
const product = await stripe.products.create({
  name: 'Pro Plan',
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2999,           // $29.99/month
  currency: 'usd',
  recurring: {
    interval: 'month',         // 'day', 'week', 'month', 'year'
    interval_count: 1,         // Every 1 month
  },
});
// price.id = 'price_ABC123' — store this in your config
```

### Step 2: Create the Subscription

```javascript
// When customer starts a paid plan
async function createSubscription(userId, priceId, paymentMethodId) {
  const user = await db.users.findById(userId);

  // Ensure Stripe customer exists
  let stripeCustomerId = user.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: userId },
    });
    stripeCustomerId = customer.id;
    await db.users.update({ stripe_customer_id: stripeCustomerId }, { where: { id: userId } });
  }

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

  // Set as default payment method
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Create the subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',   // Don't charge until payment confirmed
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'], // Get clientSecret in one call
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  };
}
```

The `payment_behavior: 'default_incomplete'` is important — the subscription starts in `incomplete`
state, waiting for the customer to confirm payment via the returned `clientSecret`.

---

## Subscription States

```
incomplete         → waiting for first payment confirmation
incomplete_expired → first payment never confirmed (23-hour window)
active             → billing normally
past_due           → recent invoice payment failed, retrying
unpaid             → all retries exhausted, access should be revoked
canceled           → subscription ended
trialing           → in free trial period
paused             → billing paused (if you set pause_collection)
```

### What to do at each state

```javascript
function getUserAccessLevel(subscriptionStatus) {
  switch (subscriptionStatus) {
    case 'active':
    case 'trialing':
      return 'full_access';
    
    case 'past_due':
      // Grace period — usually keep access for a few days
      // Show banner: "Your payment failed, please update payment method"
      return 'grace_period_access';
    
    case 'unpaid':
    case 'canceled':
    case 'incomplete_expired':
      return 'no_access';
    
    case 'incomplete':
      // Waiting for first payment
      return 'pending';
    
    default:
      return 'no_access';
  }
}
```

---

## Free Trials

```javascript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: priceId }],
  trial_period_days: 14,                // 14-day free trial
  // OR use trial_end for a specific date:
  // trial_end: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
});
```

### Trial with Card Required (Most Common Pattern)

Collect card details upfront using SetupIntent, then create subscription with trial.
The card is NOT charged during trial but is saved for when trial ends.

```javascript
// 1. Create SetupIntent to collect card
const setupIntent = await stripe.setupIntents.create({
  customer: stripeCustomerId,
  usage: 'off_session',
});
// Send clientSecret to frontend for card collection

// 2. After card saved (setup_intent.succeeded webhook fires), create subscription with trial
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: priceId }],
  trial_period_days: 14,
  default_payment_method: setupIntent.payment_method, // Card saved from SetupIntent
});
```

### Trial End Events

```javascript
case 'customer.subscription.trial_will_end':
  // Fired 3 days before trial ends
  // Send reminder email: "Your trial ends in 3 days"
  const subscription = event.data.object;
  await sendTrialEndingEmail(subscription.customer, subscription.trial_end);
  break;

case 'customer.subscription.updated':
  const sub = event.data.object;
  const prevSub = event.data.previous_attributes;
  if (prevSub.status === 'trialing' && sub.status === 'active') {
    // Trial converted to paid!
    await handleTrialConversion(sub);
  }
  break;
```

---

## Upgrades and Downgrades (Plan Changes)

```javascript
async function changePlan(subscriptionId, newPriceId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,   // Existing subscription item
      price: newPriceId,                    // New price
    }],
    proration_behavior: 'create_prorations', // Stripe calculates the difference
    // Other options:
    // proration_behavior: 'none'           — no proration (charge full new price next cycle)
    // proration_behavior: 'always_invoice' — invoice immediately for the difference
  });

  return updatedSubscription;
}
```

### Understanding Prorations

When a customer upgrades mid-cycle:
- They've already paid for the cheaper plan for the full month
- They now want the more expensive plan
- Stripe calculates the credit (unused cheaper plan days) and debit (new plan days remaining)
- The difference is either charged immediately (if upgrading) or credited on next invoice (if downgrading)

**Example**: Customer pays $10/month. On day 15 of 30, they upgrade to $20/month.
- Credit: $10 × 15/30 = $5 (unused days on old plan)
- Debit: $20 × 15/30 = $10 (new plan for remaining days)
- Net: $5 charged immediately

---

## Cancellations

### Cancel at Period End (Common, Preferred)

Customer keeps access until current billing period ends. No refund.

```javascript
async function cancelSubscription(subscriptionId) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  // subscription.cancel_at = Unix timestamp of next billing date
  // subscription.status is still 'active' until then
  // Fires 'customer.subscription.updated' webhook
  return subscription;
}
```

### Cancel Immediately

```javascript
const cancelledSub = await stripe.subscriptions.cancel(subscriptionId);
// Fires 'customer.subscription.deleted' webhook
// Issue refund if needed separately
```

### Handling Cancellation Webhook

```javascript
case 'customer.subscription.deleted':
  const sub = event.data.object;
  const user = await db.users.findOne({ 
    where: { stripe_customer_id: sub.customer } 
  });
  
  await db.users.update(
    { subscription_status: 'canceled', subscription_id: null },
    { where: { id: user.id } }
  );
  
  await revokeAccess(user.id);
  await sendCancellationEmail(user.email);
  break;
```

---

## Failed Payments and Dunning

Dunning = the process of communicating with customers about failed payments.

### Stripe's Smart Retries

Stripe automatically retries failed subscription invoices based on your Retry Schedule
(configurable in Dashboard → Billing → Settings → Smart Retries).

Default: retries at days 5, 7, 10, 15 after first failure.

### Webhook: invoice.payment_failed

```javascript
case 'invoice.payment_failed':
  const invoice = event.data.object;
  const subscription = invoice.subscription;
  
  // Check attempt count
  const attemptCount = invoice.attempt_count;
  
  if (attemptCount === 1) {
    // First failure — send gentle nudge
    await sendPaymentFailedEmail(invoice.customer_email, { attemptCount });
  } else if (attemptCount >= 3) {
    // Multiple failures — more urgent message
    await sendUrgentPaymentEmail(invoice.customer_email, {
      updatePaymentUrl: `https://yourapp.com/billing?update=true`,
    });
  }
  break;
```

### Customer Portal (Let Stripe Handle This)

Instead of building your own billing management UI, use Stripe's hosted Customer Portal:

```javascript
// Create a portal session
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: 'https://yourapp.com/account',
});

// Redirect customer
res.redirect(portalSession.url);
```

The Customer Portal lets customers:
- Update payment method
- View invoice history
- Download receipts
- Upgrade/downgrade plan
- Cancel subscription

This alone can save you weeks of development time.

---

## Metered Billing

Charge based on usage (e.g., API calls, messages sent, storage used).

### Setup

```javascript
const price = await stripe.prices.create({
  product: productId,
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered',      // Key difference
  },
  unit_amount: 1,               // $0.01 per unit
});
```

### Report Usage

```javascript
// Called from your application when customer uses the feature
async function reportUsage(subscriptionItemId, quantity) {
  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',  // or 'set' to set absolute value
  });
}

// Example: track API calls
app.use('/api', async (req, res, next) => {
  await reportUsage(req.user.stripe_subscription_item_id, 1);
  next();
});
```

At the end of the billing period, Stripe sums all usage records and charges accordingly.

---

## Multi-Plan Subscriptions (Hybrid Billing)

Charge a base fee plus metered add-ons:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [
    { price: 'price_base_plan_9_99' },     // $9.99/month flat
    { price: 'price_api_calls_metered' },  // $0.01 per API call
    { price: 'price_storage_metered' },    // $0.10 per GB
  ],
});
```

---

## Subscription Checklist for Interviews

- [ ] How do you handle a subscription going `past_due`? (grace period, dunning emails)
- [ ] What's the difference between canceling immediately vs at period end?
- [ ] How do you handle a failed 3DS authentication on a subscription renewal?
- [ ] How do prorations work when upgrading mid-cycle?
- [ ] How would you implement a "pause subscription" feature?
- [ ] How do you prevent users from accessing the service after cancellation?
- [ ] What events do you listen to for subscription state changes?
