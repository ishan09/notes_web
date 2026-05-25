# Backend Integration

## SDK Setup

### Node.js

```bash
npm install razorpay
```

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

### Java (Spring Boot)

```xml
<!-- pom.xml -->
<dependency>
  <groupId>com.razorpay</groupId>
  <artifactId>razorpay-java</artifactId>
  <version>1.4.3</version>
</dependency>
```

```java
@Configuration
public class RazorpayConfig {
    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
        return new RazorpayClient(keyId, keySecret);
    }
}
```

### Python

```bash
pip install razorpay
```

```python
import razorpay
client = razorpay.Client(auth=(
    os.environ['RAZORPAY_KEY_ID'],
    os.environ['RAZORPAY_KEY_SECRET']
))
```

---

## Order Creation

Order creation is the first backend call in every payment flow.

```javascript
// Node.js
async function createOrder(amountInRupees, internalOrderId) {
  const order = await razorpay.orders.create({
    amount: amountInRupees * 100,    // Convert to paise
    currency: 'INR',
    receipt: `rcpt_${internalOrderId}`,  // Your internal reference (max 40 chars)
    notes: {
      internal_order_id: String(internalOrderId),
    },
    payment_capture: 1,              // 1 = auto-capture, 0 = manual capture
  });

  return order;
}
```

```java
// Java
public Order createOrder(long amountInRupees, String internalOrderId) throws RazorpayException {
    JSONObject orderRequest = new JSONObject();
    orderRequest.put("amount", amountInRupees * 100);  // Convert to paise
    orderRequest.put("currency", "INR");
    orderRequest.put("receipt", "rcpt_" + internalOrderId);
    orderRequest.put("payment_capture", 1);

    JSONObject notes = new JSONObject();
    notes.put("internal_order_id", internalOrderId);
    orderRequest.put("notes", notes);

    return razorpayClient.Orders.create(orderRequest);
}
```

---

## Payment Signature Verification

This is the most critical backend step. Always do this before fulfilling orders.

```javascript
// Node.js
const crypto = require('crypto');

function verifyPaymentSignature(orderId, paymentId, signature) {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
```

Use `crypto.timingSafeEqual` to prevent timing attacks (comparing signatures character by character
leaks information about how many characters match).

```java
// Java
public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
    try {
        String payload = orderId + "|" + paymentId;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
            System.getenv("RAZORPAY_KEY_SECRET").getBytes(StandardCharsets.UTF_8),
            "HmacSHA256"
        );
        mac.init(secretKey);
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String generatedSignature = bytesToHex(hash);
        return MessageDigest.isEqual(
            generatedSignature.getBytes(),
            signature.getBytes()
        );
    } catch (Exception e) {
        return false;
    }
}
```

Alternatively, use Razorpay's built-in utility (Java SDK):

```java
boolean isValid = Utils.verifyPaymentSignature(attributes, keySecret);
```

---

## API Endpoint: Create Order

```javascript
// Express.js
app.post('/api/payments/create-order', async (req, res) => {
  const { amount, description } = req.body;

  // Input validation
  if (!amount || amount < 100) {  // Min ₹1 (100 paise)
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Create internal order record first
  const internalOrder = await db.orders.create({
    user_id: req.user.id,
    amount,
    status: 'pending',
    description,
  });

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount,  // Already in paise from frontend
    currency: 'INR',
    receipt: `rcpt_${internalOrder.id}`,
    notes: { internal_order_id: String(internalOrder.id) },
  });

  // Link Razorpay order to your internal order
  await db.orders.update(internalOrder.id, {
    razorpay_order_id: razorpayOrder.id,
  });

  res.json({
    order_id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});
```

---

## API Endpoint: Verify Payment

```javascript
app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Step 1: Verify signature
  const isValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    // Log this — could be an attack attempt
    console.error('Invalid payment signature:', { razorpay_order_id, razorpay_payment_id });
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  // Step 2: Find internal order
  const internalOrder = await db.orders.findOne({
    where: { razorpay_order_id }
  });

  if (!internalOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Step 3: Idempotency check
  if (internalOrder.status === 'paid') {
    return res.json({ success: true, already_processed: true });
  }

  // Step 4: Optionally fetch payment from Razorpay to double-check
  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return res.status(400).json({ error: 'Payment not captured' });
  }

  // Step 5: Fulfill order
  await db.orders.update(internalOrder.id, {
    status: 'paid',
    razorpay_payment_id,
    paid_at: new Date(),
  });

  await fulfillOrder(internalOrder.id);

  res.json({ success: true });
});
```

---

## Fetching Payment Details

```javascript
// After payment, fetch full payment object
const payment = await razorpay.payments.fetch(payment_id);

console.log({
  id: payment.id,
  amount: payment.amount,
  status: payment.status,       // 'captured', 'failed', 'authorized'
  method: payment.method,       // 'card', 'upi', 'netbanking', 'wallet'
  card_id: payment.card_id,     // If paid by card
  bank: payment.bank,           // Bank code for netbanking
  wallet: payment.wallet,       // Wallet name
  vpa: payment.vpa,             // UPI VPA if UPI payment
  email: payment.email,
  contact: payment.contact,
  fee: payment.fee,             // Razorpay fee charged (in paise)
  tax: payment.tax,             // GST on fee (in paise)
});
```

---

## Refunds

```javascript
// Full refund
const refund = await razorpay.payments.refund(payment_id, {
  speed: 'normal',  // 'normal' (5-7 days) or 'optimum' (instant if supported)
  notes: {
    reason: 'Customer requested cancellation',
    internal_refund_id: 'refund_42',
  }
});

// Partial refund
const partialRefund = await razorpay.payments.refund(payment_id, {
  amount: 25000,    // ₹250 refund on a ₹500 payment
  speed: 'normal',
});

// Track refund status
const refundStatus = await razorpay.refunds.fetch(refund.id);
```

Refund timeline:
- Normal: 5–7 business days to customer
- Optimum: Instant for UPI/wallets, 5-7 days for cards/netbanking

---

## Error Handling

```javascript
async function createOrderSafe(amount, orderId) {
  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${orderId}`,
    });
    return { success: true, order };
  } catch (err) {
    if (err.error) {
      // Razorpay API error
      const { code, description, field, source, step, reason } = err.error;
      console.error('Razorpay error:', { code, description, field });

      if (code === 'BAD_REQUEST_ERROR') {
        return { success: false, error: 'Invalid request parameters', details: description };
      }
      if (code === 'GATEWAY_ERROR') {
        return { success: false, error: 'Payment gateway unavailable, please retry' };
      }
    }
    // Network error or unexpected
    throw err;
  }
}
```

Common error codes:
- `BAD_REQUEST_ERROR`: Invalid parameters (wrong amount, missing fields)
- `GATEWAY_ERROR`: Razorpay's upstream gateway issue
- `SERVER_ERROR`: Razorpay internal error
- `AUTHENTICATION_ERROR`: Invalid API credentials

---

## Idempotency Keys

Razorpay supports idempotency keys for safe retries:

```javascript
// Node.js — pass as header
const order = await razorpay.orders.create(
  { amount: 50000, currency: 'INR', receipt: 'rcpt_42' },
  { 'X-Razorpay-Idempotency-Key': `order_create_${internalOrderId}` }
);
```

If the same key is used within 24 hours, Razorpay returns the original response instead of creating a duplicate.
Critical for networks with retry logic.

---

## Settlement & Reconciliation

```javascript
// Fetch settlements
const settlements = await razorpay.settlements.all({
  from: Math.floor(new Date('2024-01-01').getTime() / 1000),
  to: Math.floor(new Date('2024-01-31').getTime() / 1000),
  count: 100,
});

// Each settlement contains:
// - settlement.id: the settlement ID
// - settlement.amount: total settled amount
// - settlement.fees: Razorpay fees deducted
// - settlement.tax: GST on fees
// - settlement.settled_at: timestamp

// Fetch items in a settlement (individual payments)
const items = await razorpay.settlements.fetch_recon({
  from: timestamp,
  to: timestamp,
  count: 100,
});
```

**Important for accounting**: `settlement.amount = gross_payments - fees - tax - refunds`
