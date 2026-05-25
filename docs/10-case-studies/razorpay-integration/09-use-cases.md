# Use Cases — Common Razorpay Integration Patterns

---

## 1. E-Commerce: One-Time Product Purchase

The simplest and most common use case.

```
Customer adds items → Proceeds to checkout → Backend creates Order
→ Frontend opens Razorpay Checkout → Customer pays
→ Backend verifies signature → Fulfills order → Sends confirmation email
→ Razorpay fires order.paid webhook (backup fulfillment trigger)
```

### Key considerations:
- Inventory reservation: Reserve stock when order is created, release if payment fails/expires
- Order expiry: Razorpay Orders expire after 24 hours by default (configurable)
- Multiple payment attempts: One Order can have multiple payment attempts (retries after failure)

```javascript
// Reserve inventory when order is created
const order = await razorpay.orders.create({ amount, currency: 'INR', receipt });
await db.inventory.decrementReserved(items);  // Reserve stock

// Release reservation if order expires
// Listen for order expiry or implement a cleanup job
```

---

## 2. SaaS: Subscription Billing

**Flow**: Plan selection → Subscription creation → Mandate authentication → Recurring billing

```javascript
// Show pricing tiers
const plans = {
  starter: { plan_id: 'plan_STARTER', amount: 49900, label: '₹499/month' },
  pro:     { plan_id: 'plan_PRO',     amount: 99900, label: '₹999/month' },
  enterprise: { plan_id: 'plan_ENT', amount: 299900, label: '₹2999/month' },
};

// User selects plan → Create subscription → Authenticate → Provision
```

### Entitlement system:
```javascript
// Check if user has active subscription
async function hasActiveSubscription(userId) {
  const user = await db.users.findOne({ id: userId });
  if (!user.razorpay_subscription_id) return false;

  const sub = await razorpay.subscriptions.fetch(user.razorpay_subscription_id);
  return sub.status === 'active';
}

// Or cache in your DB and update via webhooks (preferred for performance)
async function hasActiveSubscription(userId) {
  const user = await db.users.findOne({ id: userId });
  return user.subscription_status === 'active' && user.subscription_expires_at > new Date();
}
```

### Grace period on renewal failure:
```javascript
case 'subscription.halted':
  // Don't immediately revoke access — give 7-day grace period
  await db.users.update(
    { razorpay_subscription_id: sub.id },
    {
      subscription_status: 'grace_period',
      grace_period_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  );
  await emailService.sendPaymentFailedEmail(userId);
  break;
```

---

## 3. Marketplace: Split Payments (Razorpay Route)

Razorpay Route allows splitting payments between your platform and multiple vendors.

```javascript
// Collect payment for marketplace order
const payment = await razorpay.payments.fetch(payment_id);

// Transfer portion to vendor
const transfer = await razorpay.payments.transfer(payment_id, {
  transfers: [
    {
      account: 'acc_VENDOR_ACCOUNT_ID',    // Vendor's linked Razorpay account
      amount: 40000,                         // ₹400 to vendor (from ₹500 total)
      currency: 'INR',
      notes: {
        order_id: 'order_42',
        vendor_id: 'vendor_99',
      },
      linked_account_notes: ['order_id'],
      on_hold: 0,                            // 0 = transfer immediately
    }
  ]
});

// Platform keeps ₹100 as commission
```

### Onboarding vendors:
```javascript
// Create a linked account for each vendor
const account = await razorpay.accounts.create({
  email: 'vendor@example.com',
  profile: {
    category: 'ecommerce',
    subcategory: 'fashion_and_lifestyle',
    addresses: { registered: { ... } }
  },
  legal_business_name: 'Vendor Shop',
  business_type: 'individual',
  contact_name: 'Vendor Name',
  contact_info: { phone: { ... } },
});
```

**Use case**: Food delivery (split between restaurant and delivery), e-commerce (split between seller and platform).

---

## 4. On-Demand Services: Captured Later

For services like taxis, food delivery where final amount is known only after service:

```javascript
// Step 1: At booking — authorize ₹500 (estimate)
const order = await razorpay.orders.create({
  amount: 50000,
  currency: 'INR',
  payment_capture: 0,  // Manual capture
  receipt: 'trip_42',
});

// ... customer takes the trip ...

// Step 2: At completion — capture actual amount
const finalAmount = 38500;  // ₹385 actual fare
await razorpay.payments.capture(payment_id, finalAmount, 'INR');
// Excess ₹115 is automatically released
```

**Constraint**: Can only capture equal to or less than authorized amount. Capture must happen within 5 days.

---

## 5. Event Ticketing: Bulk Order + Partial Refunds

```javascript
// Purchase 3 tickets
const order = await razorpay.orders.create({
  amount: 150000,  // 3 × ₹500 = ₹1500
  currency: 'INR',
  receipt: 'event_booking_42',
});

// Later: customer cancels 1 ticket
const refund = await razorpay.payments.refund(payment_id, {
  amount: 50000,   // Refund ₹500 for 1 ticket
  notes: { reason: 'Ticket cancellation', ticket_id: 'ticket_123' },
  speed: 'optimum',
});
```

---

## 6. Education: EMI and BNPL

Razorpay supports EMI (card and cardless) and Buy Now Pay Later for high-ticket items.

```javascript
// In checkout options, configure EMI
const options = {
  // ...
  method: {
    emi: true,          // Enable EMI
    paylater: true,     // Enable BNPL (LazyPay, Simpl, etc.)
  },
  config: {
    display: {
      preferences: { show_default_blocks: true }
    }
  }
};
```

EMI providers available: HDFC, ICICI, Bajaj Finance, ZestMoney, etc.
Each has a processing fee (usually paid by the customer or the merchant can absorb it).

**Use case**: EdTech (course purchases), healthcare (medical bills), electronics.

---

## 7. Donations / Variable Amount

Let users enter their own amount:

```javascript
// Frontend: Get amount from user input
const donationAmount = parseInt(document.getElementById('donation-input').value) * 100;

// Validate on backend
if (donationAmount < 100 || donationAmount > 10000000) {  // ₹1 to ₹1,00,000
  return res.status(400).json({ error: 'Invalid donation amount' });
}

const order = await razorpay.orders.create({
  amount: donationAmount,
  currency: 'INR',
  receipt: `donation_${userId}`,
});
```

---

## 8. International Payments

Razorpay supports international cards but requires AD Code setup.
Better to use separate gateway (Stripe) for non-INR currencies.

```javascript
// Accept USD (requires AD Code + currency conversion enabled)
const order = await razorpay.orders.create({
  amount: 2999,      // $29.99 in cents
  currency: 'USD',   // Also supports EUR, GBP, SGD, AED, etc.
  receipt: 'intl_order_42',
});
```

Settlement is in INR at the prevailing exchange rate (Razorpay converts).
International payment fee is higher (~3-4% vs ~2% for domestic).

---

## 9. QR Code Payments (Physical/Online)

Generate a QR code for UPI payments (useful for offline stores and invoices):

```javascript
const qr = await razorpay.qrCode.create({
  type: 'upi_qr',
  name: 'Store Name',
  usage: 'single_use',   // 'single_use' or 'multiple_use'
  fixed_amount: true,
  payment_amount: 50000, // ₹500
  description: 'Payment for Order #42',
  customer_id: 'cust_ABC123',
  close_by: Math.floor(Date.now() / 1000) + 900,  // Expires in 15 minutes
  notes: { internal_order_id: '42' },
});

// qr.image_url — display this as QR image
// Listen for payment.captured webhook with the qr.id
```

---

## 10. Recurring Donations / Tip Jar (UPI AutoPay)

```javascript
// Set up recurring donation subscription
const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_MONTHLY_DONATION',   // ₹100/month plan
  total_count: 0,                      // 0 = infinite
  quantity: 1,
  start_at: Math.floor(Date.now() / 1000) + 60,
});
```

Common for NGOs, newsletters, content creators.
