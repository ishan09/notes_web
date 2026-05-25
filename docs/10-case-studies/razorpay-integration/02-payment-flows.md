# Payment Flows

## The Three Integration Options

| Integration | When to Use | Effort |
|-------------|-------------|--------|
| Standard Checkout (Hosted) | Fastest, Razorpay handles UI | Low |
| Custom Checkout (Razorpay.js) | Custom UI, you control design | Medium |
| S2S (Server-to-Server) | Full control, PCI DSS required | High — avoid unless needed |

Most production apps use **Standard Checkout** or **Custom Checkout**.
S2S requires PCI DSS compliance — almost never worth it.

---

## Flow 1: Standard Checkout (Recommended for Most Cases)

Razorpay opens a hosted modal with their UI. Handles everything: card form, UPI, wallets.

### Step 1: Backend creates Order

```javascript
// POST /api/create-order
const order = await razorpay.orders.create({
  amount: 50000,        // ₹500 in paise
  currency: 'INR',
  receipt: `receipt_${Date.now()}`,
  notes: {
    internal_order_id: 'your_db_id_42',
    customer_email: 'user@example.com',
  }
});

// Store order.id in your DB against your order record
await db.orders.update({ id: 42 }, { razorpay_order_id: order.id });

res.json({
  order_id: order.id,
  key_id: process.env.RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
});
```

### Step 2: Frontend opens Checkout

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```javascript
const options = {
  key: 'rzp_live_XXXXXXXXX',        // Key ID (not secret)
  amount: 50000,                     // Must match order amount
  currency: 'INR',
  name: 'Your Company',
  description: 'Order #42',
  image: 'https://yourcompany.com/logo.png',
  order_id: 'order_ABC123',          // From backend

  handler: function(response) {
    // Called when payment succeeds — send these 3 values to backend
    verifyPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    });
  },

  prefill: {
    name: 'Customer Name',
    email: 'customer@example.com',
    contact: '9999999999',
  },

  theme: { color: '#3399cc' },

  modal: {
    ondismiss: function() {
      // User closed the modal without paying
      console.log('Payment dismissed');
    }
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### Step 3: Backend verifies payment

```javascript
// POST /api/verify-payment
const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

const crypto = require('crypto');
const generated_signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

if (generated_signature !== razorpay_signature) {
  return res.status(400).json({ error: 'Invalid payment signature' });
}

// Signature valid — payment is authentic
// Now capture if using manual capture mode, or fulfill if auto-capture
await fulfillOrder(razorpay_order_id);
res.json({ success: true });
```

**This 3-step flow (create order → open checkout → verify signature) is the core of every Razorpay integration.**

---

## Flow 2: Custom Checkout (Razorpay.js)

When you need full UI control (your own card form, custom UPI flow, etc.)

```javascript
// Initialize
const razorpay = new Razorpay({
  key: 'rzp_live_XXXXXXXXX',
  image: 'https://yourcompany.com/logo.png',
});

// Create a payment
const data = {
  amount: 50000,
  currency: 'INR',
  order_id: 'order_ABC123',
  email: 'customer@example.com',
  contact: '9999999999',
  method: 'card',
  'card[number]': '4111111111111111',
  'card[expiry]': '12/25',
  'card[cvv]': '123',
  'card[name]': 'Customer Name',
};

razorpay.createPayment(data);

razorpay.on('payment.success', function(resp) {
  // Send resp to backend for verification (same as Standard flow)
  verifyPayment(resp);
});

razorpay.on('payment.error', function(err, response) {
  console.error('Payment error:', err.description);
});
```

---

## Auto-Capture vs Manual Capture

**Auto-capture** (default): Payment is captured automatically when authorized.
Simpler, recommended for most use cases.

**Manual capture**: Payment is authorized but NOT captured until you explicitly call capture.
Useful when you need to confirm stock/inventory before charging.

```javascript
// Manual capture (within 5 days of authorization)
await razorpay.payments.capture(payment_id, amount, 'INR');
```

**Pitfall**: If you use manual capture and forget to capture within 5 days, the payment auto-refunds.

---

## UPI-Specific Flow

UPI is the dominant payment method in India. Special considerations:

### UPI Collect (Push)
Customer enters UPI VPA (e.g., `user@okaxis`). A collect request is sent to their UPI app.
Customer approves in their app. Asynchronous — don't wait inline.

```javascript
// Checkout handles UPI collect automatically
// But for backend status check:
const payment = await razorpay.payments.fetch(payment_id);
if (payment.status === 'captured') {
  // UPI payment confirmed
}
```

### UPI Intent (QR)
Generates a QR code or deeplink that opens the UPI app directly.
Used in mobile apps and physical POS.

### UPI AutoPay
For recurring payments — similar to card mandates but via UPI.
Customer sets up an eMandate on their bank app.

---

## Payment Links (No-Code)

For businesses that don't want a tech team to integrate:

```javascript
// Create a payment link programmatically
const link = await razorpay.paymentLink.create({
  amount: 50000,
  currency: 'INR',
  description: 'Invoice #42',
  customer: {
    name: 'Customer Name',
    email: 'customer@example.com',
    contact: '9999999999',
  },
  notify: {
    sms: true,
    email: true,
  },
  reminder_enable: true,
  expire_by: Math.floor(Date.now() / 1000) + 86400, // 24 hours
});

// Share link.short_url with customer
```

**Use case**: Support teams generating links for customers without going through checkout.

---

## International Payments

Razorpay supports international cards but requires:
1. Your business entity to be registered in India
2. AD Code (Authorized Dealer Code) from your bank
3. FEMA compliance for accepting foreign currency

For purely global payments, Stripe is easier. Razorpay is primarily India-focused.

---

## Common Mistakes in Payment Flows

1. **Not creating an Order before opening checkout** — skipping Order creation means no payment-order linking, signature verification will fail.
2. **Trusting the frontend callback alone** — always verify signature on the backend. Frontend can be tampered with.
3. **Paise confusion** — ₹100 = 10000 paise. Sending `amount: 100` charges ₹1, not ₹100.
4. **Not storing razorpay_order_id** — you need it to verify the signature.
5. **Not handling ondismiss** — user closed the modal; show them a "try again" option.
