# Subscriptions — Recurring Billing with Razorpay

Razorpay Subscriptions handles recurring billing: charge customers automatically on a schedule.
Supports cards, UPI AutoPay, and eNACH (bank account debit mandates).

---

## Core Objects

### Plan
Defines the billing amount, interval, and frequency.

```javascript
const plan = await razorpay.plans.create({
  period: 'monthly',       // daily, weekly, monthly, yearly
  interval: 1,             // every 1 month
  item: {
    name: 'Pro Plan',
    amount: 99900,         // ₹999 in paise
    currency: 'INR',
    description: 'Monthly Pro subscription',
  },
  notes: {
    internal_plan_id: 'pro_monthly_v2',
  }
});
```

### Subscription
An active recurring billing agreement linked to a Plan and a Customer.

States:
```
created → authenticated → active → pending (renewal attempt)
                                 ↘ halted (multiple failures)
                                 ↘ cancelled
                                 ↘ paused
                                 ↘ completed (all charges done)
```

### Addon
A one-time or recurring extra charge on top of a subscription (e.g., usage overage).

---

## Creating a Subscription

### Step 1: Backend creates Subscription

```javascript
const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_ABC123',
  total_count: 12,            // 12 billing cycles (12 months), or 0 for infinite
  quantity: 1,
  customer_notify: 1,         // 1 = Razorpay sends email/SMS notifications
  start_at: Math.floor(Date.now() / 1000) + 3600, // Start 1 hour from now
  addons: [],
  notes: {
    internal_user_id: 'user_42',
  }
});

// Store subscription.id in your DB
await db.users.update({ id: 42 }, { razorpay_subscription_id: subscription.id });

res.json({
  subscription_id: subscription.id,
  key_id: process.env.RAZORPAY_KEY_ID,
});
```

### Step 2: Frontend opens checkout for authentication

The customer must authenticate the subscription mandate (required by RBI for recurring payments).

```javascript
const options = {
  key: 'rzp_live_XXXXXXXXX',
  subscription_id: 'sub_ABC123',   // Instead of order_id
  name: 'Your Company',
  description: 'Pro Plan — Monthly',
  handler: function(response) {
    // response.razorpay_subscription_id
    // response.razorpay_payment_id
    // response.razorpay_signature
    verifySubscriptionPayment(response);
  },
  prefill: {
    name: 'Customer Name',
    email: 'customer@example.com',
    contact: '9999999999',
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### Step 3: Backend verifies subscription payment

```javascript
const crypto = require('crypto');

const generated_signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
  .digest('hex');

if (generated_signature !== razorpay_signature) {
  return res.status(400).json({ error: 'Invalid signature' });
}

// Activate subscription in your DB
await db.subscriptions.update(
  { razorpay_subscription_id },
  { status: 'active', activated_at: new Date() }
);
```

**Note the signature format for subscriptions**: `payment_id|subscription_id`
Unlike one-time payments where it's `order_id|payment_id`.

---

## Subscription Lifecycle Events (via Webhooks)

| Webhook Event | When | Your Action |
|--------------|------|-------------|
| `subscription.activated` | Mandate authenticated, first charge collected | Provision access, send welcome |
| `subscription.charged` | Renewal payment collected | Extend access period, send receipt |
| `subscription.pending` | Renewal payment failed (first attempt) | Nothing yet — Razorpay will retry |
| `subscription.halted` | All retry attempts failed | Downgrade/suspend access, notify customer |
| `subscription.cancelled` | Cancelled (by you, customer, or due to failures) | Schedule access revocation at period end |
| `subscription.paused` | Subscription paused | Freeze or keep access per your policy |
| `subscription.resumed` | Subscription resumed after pause | Restore access |
| `subscription.completed` | All billing cycles done | Offer renewal, downgrade gracefully |

```javascript
case 'subscription.halted':
  const sub = event.payload.subscription.entity;
  await db.subscriptions.update(
    { razorpay_subscription_id: sub.id },
    { status: 'halted' }
  );
  // Send "payment failed" dunning email
  await emailService.sendDunningEmail(sub.notes.internal_user_id);
  break;
```

---

## Upgrading / Downgrading Plans

Use the subscription update API to change plans (proration is manual on Razorpay):

```javascript
// Upgrade to a different plan
await razorpay.subscriptions.update(subscription_id, {
  plan_id: 'plan_ENTERPRISE_ID',
  quantity: 1,
  remaining_count: 6,        // Adjust remaining billing cycles
  schedule_change_at: 'cycle_end',  // Change at end of current cycle
});
```

**Proration note**: Razorpay doesn't auto-prorate like Stripe.
For upgrades mid-cycle, manually calculate and charge the difference as an Addon or separate payment.

---

## Addons — One-Time Charges on Subscriptions

```javascript
// Charge overage fees or one-time items on top of subscription
await razorpay.subscriptions.createAddon(subscription_id, {
  item: {
    name: 'Extra Storage — 100GB',
    amount: 50000,    // ₹500
    currency: 'INR',
    description: 'Additional storage for March',
  },
  quantity: 1,
});
```

Addons are charged in the next billing cycle automatically.

---

## Pausing a Subscription

Useful for user requests ("skip next month") or failed payment grace periods:

```javascript
// Pause
await razorpay.subscriptions.pause(subscription_id, {
  pause_at: 'now',  // or 'cycle_end'
});

// Resume
await razorpay.subscriptions.resume(subscription_id, {
  resume_at: 'now',
});
```

---

## Cancelling a Subscription

```javascript
// Cancel at end of current billing cycle (recommended — customer retains access)
await razorpay.subscriptions.cancel(subscription_id, {
  cancel_at_cycle_end: 1,
});

// Cancel immediately
await razorpay.subscriptions.cancel(subscription_id, {
  cancel_at_cycle_end: 0,
});
```

**Always cancel at cycle end unless the user has committed fraud or violated terms.**
Cancelling immediately and cutting access is a poor UX that generates chargebacks.

---

## UPI AutoPay (Recurring via UPI)

RBI mandates that UPI recurring payments require customer authentication via e-mandate.
The customer registers a mandate once; Razorpay auto-deducts on schedule.

- Works with NPCI's recurring framework
- Customer receives a notification before each debit (as per RBI rules)
- For amounts > ₹15,000, customer must approve each debit in their UPI app

```javascript
// No code change needed — Razorpay handles mandate setup when
// customer selects UPI AutoPay during subscription checkout
```

---

## eNACH (Bank Account Mandates)

For bank-account based recurring payments (similar to ACH in the US):
- Customer fills NACH mandate form (physical or digital)
- Bank registers the mandate
- Auto-debit happens on schedule

Used mainly for loan EMIs and insurance premiums.

---

## Free Trials

```javascript
const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_ABC123',
  total_count: 12,
  // Start billing 14 days from now (14-day free trial)
  start_at: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
});
```

For free trials with card saved:
- Customer authenticates with ₹0 or ₹1 charge (that is refunded)
- Actual billing starts at `start_at`

**Pitfall**: If `start_at` is in the future and customer cancels before first charge,
you must handle the `subscription.cancelled` webhook and remove access gracefully.

---

## Production Checklist for Subscriptions

- [ ] Store `razorpay_subscription_id` in your DB against the user
- [ ] Handle all subscription webhook events
- [ ] Make renewal handlers idempotent (subscription.charged can fire multiple times)
- [ ] Send dunning emails on subscription.halted
- [ ] Implement grace period (e.g., 7 days after halted before revoking access)
- [ ] Cancel at cycle end, not immediately
- [ ] Track `charge_at` (next billing date) from subscription object for display to users
- [ ] Handle plan upgrades manually (calculate and charge proration)
