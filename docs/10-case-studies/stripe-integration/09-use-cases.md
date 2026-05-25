# Use Cases — Stripe in Different Business Models

## 1. SaaS — Subscription Business

### Architecture

```
User signs up
    → Free trial (SetupIntent to collect card)
    → Trial ends → subscription activates → charged monthly
    → User upgrades/downgrades plan (proration)
    → User cancels (cancel_at_period_end)
    → Dunning if payment fails
```

### Key Features Used
- Subscriptions with trial periods
- Customer Portal (self-service billing management)
- Proration for plan changes
- Metered billing (if usage-based)
- Dunning emails via invoice.payment_failed webhook

### Database Design

```
users: stripe_customer_id
plans: stripe_price_id, features_json
subscriptions: user_id, stripe_subscription_id, status, current_period_end
```

### Access Control Pattern

```javascript
// Middleware to check subscription status
async function requireActiveSubscription(req, res, next) {
  const user = await db.users.findById(req.user.id, {
    include: ['subscription']
  });
  
  const hasAccess = ['active', 'trialing'].includes(user.subscription?.status);
  
  if (!hasAccess) {
    return res.status(402).json({
      error: 'subscription_required',
      message: 'Please subscribe to access this feature',
      upgrade_url: 'https://yourapp.com/pricing',
    });
  }
  
  next();
}
```

---

## 2. E-Commerce — One-Time Payments

### Architecture

```
Customer adds items to cart
    → Checkout page with order summary
    → Backend creates PaymentIntent with cart total
    → Customer pays via Payment Element
    → payment_intent.succeeded webhook → fulfill order (update inventory, send email, ship)
```

### Key Features Used
- PaymentIntents
- Stripe Checkout (for simpler flows)
- Stripe Tax (automatic tax calculation by location)
- Refunds (customer returns)
- Dispute handling

### Inventory Management with Payments

```javascript
// POST /create-payment-intent
app.post('/create-payment-intent', async (req, res) => {
  const { cartId } = req.body;
  
  const cart = await db.carts.findById(cartId, { include: ['items'] });
  
  // Reserve inventory while payment is pending
  await db.inventoryReservations.create({
    cart_id: cartId,
    items: cart.items,
    expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 min to complete payment
  });
  
  const amount = await calculateCartTotal(cart);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: { cart_id: cartId },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
});

// Webhook: payment_intent.succeeded
case 'payment_intent.succeeded':
  const cartId = event.data.object.metadata.cart_id;
  const cart = await db.carts.findById(cartId);
  
  // Confirm inventory reservation → deduct from stock
  await db.inventoryReservations.confirm(cartId);
  
  // Create order
  await db.orders.create({ cart_id: cartId, status: 'fulfilled' });
  
  // Send confirmation email
  await sendOrderConfirmation(cart.user_id, cartId);
  break;

// Webhook: payment_intent.canceled (or on timeout)
// Release inventory reservation
await db.inventoryReservations.release(cartId);
```

### Stripe Tax (Automatic Sales Tax)

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: subtotal,
  currency: 'usd',
  automatic_tax: { enabled: true },  // Stripe calculates tax based on customer location
  customer: stripeCustomerId,
});
```

---

## 3. Marketplace — Platform Payments (Connect)

A marketplace where sellers sell through your platform (like Etsy, Airbnb, Upwork).
Stripe Connect handles the multi-party payments.

### Two Models

**Direct Charges**: Charge is on the seller's Stripe account. You take a platform fee.
**Destination Charges**: Charge is on YOUR account. You split funds to sellers.

### Setting Up Connect

```javascript
// 1. Sellers onboard to Stripe (create connected accounts)
const account = await stripe.accounts.create({
  type: 'express',              // Simpler onboarding (Stripe hosts the form)
  // OR 'standard' (full Stripe account) or 'custom' (you build everything)
  country: 'US',
  email: seller@example.com,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Store: sellers table: stripe_account_id = account.id

// 2. Generate onboarding link for seller
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://yourapp.com/onboarding/refresh',
  return_url: 'https://yourapp.com/onboarding/complete',
  type: 'account_onboarding',
});

// Redirect seller to accountLink.url to complete KYC/banking setup
```

### Taking Platform Fees (Destination Charges)

```javascript
// Buyer pays $100, seller gets $90, you keep $10 platform fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,               // $100.00
  currency: 'usd',
  application_fee_amount: 1000, // $10.00 goes to your platform
  transfer_data: {
    destination: sellerStripeAccountId,  // Rest ($90) goes to seller
  },
});
```

### Payouts to Sellers

By default, Stripe automatically pays out sellers on a rolling basis.
You can also control timing:

```javascript
// Manual payout when order is fulfilled/confirmed
await stripe.transfers.create({
  amount: 9000,          // $90 to seller
  currency: 'usd',
  destination: sellerStripeAccountId,
  transfer_group: orderId,  // Group transfers with charges for reconciliation
});
```

### Connect Webhooks

Connected accounts have their own webhooks. To receive events for all connected accounts:

```javascript
// Listen to events from connected accounts
const event = stripe.webhooks.constructEvent(
  rawBody,
  req.headers['stripe-signature'],
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET  // Separate secret for Connect webhook
);

// Check if event is from a connected account
if (event.account) {
  // This event is from seller account: event.account = 'acct_ABC123'
}
```

---

## 4. Freemium with Paid Features (Feature Gating)

### Architecture

```
User signs up → Free plan (no payment info needed)
    → User tries premium feature → Upgrade modal
    → Collects card → Creates subscription → Feature unlocked
```

### Feature Gate Pattern

```javascript
const PLAN_FEATURES = {
  free: ['basic_reports', 'up_to_5_projects'],
  pro: ['advanced_reports', 'unlimited_projects', 'api_access'],
  enterprise: ['all_pro_features', 'sso', 'custom_integrations'],
};

function hasFeature(user, feature) {
  const plan = user.subscription?.status === 'active' 
    ? user.subscription.plan_name 
    : 'free';
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

// In API endpoint
app.get('/api/advanced-report', (req, res) => {
  if (!hasFeature(req.user, 'advanced_reports')) {
    return res.status(403).json({
      error: 'feature_not_available',
      upgrade_plan: 'pro',
      upgrade_url: 'https://yourapp.com/upgrade',
    });
  }
  // Generate report...
});
```

---

## 5. One-Time Purchase + Subscription (Hybrid)

Example: Software that charges $199 one-time setup + $29/month.

```javascript
// Use Checkout Session with multiple line items
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: 'price_setup_fee_199',    // One-time price
      quantity: 1,
    },
    {
      price: 'price_monthly_29',       // Recurring price
      quantity: 1,
    },
  ],
  success_url: '...',
  cancel_url: '...',
});
```

Or add a setup fee to a subscription:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: monthlyPriceId }],
  add_invoice_items: [
    {
      price: setupFeePriceId,     // Billed on first invoice only
      quantity: 1,
    },
  ],
});
```

---

## 6. Per-Seat Pricing (Team Plans)

Charge based on number of users (seats):

```javascript
// Update quantity when users are added/removed from a team
async function updateTeamSeats(subscriptionId, newSeatCount) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      quantity: newSeatCount,
    }],
    proration_behavior: 'create_prorations',
  });
}

// When a team member is added
await updateTeamSeats(team.stripe_subscription_id, team.member_count + 1);

// When a team member is removed
await updateTeamSeats(team.stripe_subscription_id, team.member_count - 1);
```

---

## 7. Invoicing for B2B

B2B customers often want to pay via bank transfer on NET30 terms:

```javascript
// Create invoice with NET30 payment terms
const invoice = await stripe.invoices.create({
  customer: stripeCustomerId,
  collection_method: 'send_invoice',    // Email invoice, not auto-charge
  days_until_due: 30,                   // NET30
  auto_advance: true,                   // Auto-finalize the draft
});

// Add line items
await stripe.invoiceItems.create({
  customer: stripeCustomerId,
  invoice: invoice.id,
  price: priceId,
  quantity: 5,
});

// Send invoice email to customer
await stripe.invoices.sendInvoice(invoice.id);
```

---

## 8. Donation / Pay-What-You-Want

```javascript
// Custom amount from the user
app.post('/donate', async (req, res) => {
  const { amount, currency = 'usd' } = req.body;
  
  // Enforce minimum donation
  const minimumCents = 100; // $1
  const amountCents = Math.round(amount * 100);
  
  if (amountCents < minimumCents) {
    return res.status(400).json({ error: 'Minimum donation is $1' });
  }
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata: { type: 'donation' },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

---

## Interview Question: "How Would You Build a SaaS Billing System?"

**Strong Answer Structure**:

1. **Products and Prices**: Create Product/Price objects in Stripe for each plan tier
2. **Customer creation**: On user signup, create a Stripe Customer, store `stripe_customer_id`
3. **Trial flow**: SetupIntent to collect card → Subscription with `trial_period_days`
4. **Subscription management**: Customer Portal for self-service
5. **Access control**: Middleware checks subscription status from DB (synced via webhooks)
6. **Webhook handling**: `subscription.updated/deleted`, `invoice.paid/payment_failed`
7. **Dunning**: Automated emails on `invoice.payment_failed`, smart retries
8. **Reconciliation**: Daily job to compare DB state with Stripe API
9. **Upgrades/downgrades**: `stripe.subscriptions.update` with proration
10. **Cancellation**: `cancel_at_period_end: true` → revoke access via `subscription.deleted` webhook
