# Testing

## Test vs Live Mode

Switch between test and live using API key prefix:
- Test: `rzp_test_XXXXXXXXX` — no real money moves
- Live: `rzp_live_XXXXXXXXX` — real transactions

In test mode, payments go through Razorpay's sandbox. Dashboard shows test transactions separately.

---

## Test Cards

Use these in test mode. Real card numbers are rejected in test mode.

### Successful Payments

| Card Number | Network | Notes |
|-------------|---------|-------|
| `4111 1111 1111 1111` | Visa | Standard success |
| `5267 3181 8797 5449` | Mastercard | Standard success |
| `6073 8497 3438 4543` | Maestro | Success |
| `3566 0020 2036 0505` | JCB | Success |

For all test cards:
- Expiry: Any future date (e.g., `12/28`)
- CVV: Any 3 digits (e.g., `123`)
- Name: Any name

### Cards That Trigger Specific Failures

| Card Number | Failure Type |
|-------------|-------------|
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0127` | Invalid CVV |

### Cards That Trigger 3DS (OTP)

| Card Number | 3DS Behavior |
|-------------|-------------|
| `4012 8888 8888 1881` | 3DS required — use OTP `1234` |

---

## Test UPI IDs

| UPI VPA | Behavior |
|---------|----------|
| `success@razorpay` | Payment succeeds |
| `failure@razorpay` | Payment fails |
| `pending@razorpay` | Payment stays pending (useful for async testing) |

---

## Test Netbanking

Select any bank in test mode. Use these credentials:
- User ID: Any string
- Password: Any string
- OTP: `1234` (if asked)

All banks will succeed in test mode.

---

## Test Wallets

All wallet payments succeed in test mode. Select any wallet and complete the mock flow.

---

## Test Subscriptions

In test mode, subscription billing cycles are compressed:
- Monthly plan charges every few minutes (not every month)
- This lets you test the full subscription lifecycle quickly

Set `RAZORPAY_API_TEST=true` in your environment to enable compressed billing.

---

## Testing Webhooks Locally

Razorpay doesn't have a CLI. Use ngrok or similar:

```bash
# Option 1: ngrok
ngrok http 3000
# Copy the https URL, set as webhook URL in Dashboard

# Option 2: Razorpay CLI (community tool)
# Not an official tool — use ngrok instead
```

### Sending Test Webhooks from Dashboard

1. Dashboard → Settings → Webhooks
2. Click your webhook endpoint
3. "Send Test Webhook" → Select event type → Send

This sends a sample payload to your endpoint. Use for initial setup verification.

### Simulating Events via API (Test Mode)

In test mode, you can trigger payment failures and retries:

```javascript
// Create a test payment that fails
const order = await razorpay.orders.create({ amount: 50000, currency: 'INR', receipt: 'test_001' });

// Open checkout with a failure test card — Razorpay will fire payment.failed webhook
```

---

## Unit Testing Signature Verification

Test your signature logic without hitting Razorpay API:

```javascript
// In your test file
const crypto = require('crypto');

describe('verifyPaymentSignature', () => {
  const SECRET = 'test_secret_key';
  const ORDER_ID = 'order_test123';
  const PAYMENT_ID = 'pay_test456';

  function generateSignature(orderId, paymentId) {
    return crypto
      .createHmac('sha256', SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  it('should return true for valid signature', () => {
    const signature = generateSignature(ORDER_ID, PAYMENT_ID);
    expect(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, signature, SECRET)).toBe(true);
  });

  it('should return false for tampered payment_id', () => {
    const signature = generateSignature(ORDER_ID, PAYMENT_ID);
    expect(verifyPaymentSignature(ORDER_ID, 'pay_tampered', signature, SECRET)).toBe(false);
  });

  it('should return false for tampered order_id', () => {
    const signature = generateSignature(ORDER_ID, PAYMENT_ID);
    expect(verifyPaymentSignature('order_tampered', PAYMENT_ID, signature, SECRET)).toBe(false);
  });
});
```

---

## Integration Testing: Mock Razorpay API

For CI/CD where you don't want to call Razorpay's actual API:

```javascript
// Jest mock
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test_mock',
        amount: 50000,
        currency: 'INR',
        status: 'created',
      }),
    },
    payments: {
      fetch: jest.fn().mockResolvedValue({
        id: 'pay_test_mock',
        status: 'captured',
        amount: 50000,
      }),
      refund: jest.fn().mockResolvedValue({
        id: 'refund_test_mock',
        amount: 50000,
      }),
    },
  }));
});
```

---

## Testing Webhooks in Unit Tests

```javascript
describe('Webhook Handler', () => {
  const SECRET = 'test_webhook_secret';

  function generateWebhookSignature(body) {
    return crypto
      .createHmac('sha256', SECRET)
      .update(body)
      .digest('hex');
  }

  it('should process order.paid event', async () => {
    const payload = JSON.stringify({
      event: 'order.paid',
      payload: {
        order: { entity: { id: 'order_123', amount: 50000, status: 'paid' } },
        payment: { entity: { id: 'pay_456', status: 'captured' } },
      },
    });

    const signature = generateWebhookSignature(payload);

    const response = await request(app)
      .post('/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(Buffer.from(payload));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    // Assert your business logic was called
    expect(fulfillOrder).toHaveBeenCalledWith('order_123');
  });

  it('should reject invalid signature', async () => {
    const response = await request(app)
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', 'invalid_signature')
      .send('{}');

    expect(response.status).toBe(400);
  });
});
```

---

## End-to-End Testing with Real Test Credentials

For final validation before going live:

1. Set `RAZORPAY_KEY_ID=rzp_test_XXXXX` in staging
2. Complete a real payment flow using test cards
3. Verify in Razorpay Dashboard that test payment appears
4. Verify webhook received and processed in your app logs
5. Verify order fulfilled in your database

### E2E Test Checklist

- [ ] Successful card payment → order fulfilled
- [ ] UPI payment → webhook received → order fulfilled
- [ ] Payment failure → user sees error, no order created
- [ ] Subscription creation → mandate authenticated
- [ ] Subscription renewal (wait for compressed cycle in test mode)
- [ ] Partial refund → refund amount deducted from order
- [ ] Duplicate webhook → idempotent (no duplicate fulfillment)
- [ ] Webhook with invalid signature → 400 returned

---

## Performance Testing

For high-traffic scenarios:

- Razorpay test mode: 25 req/sec limit
- Live mode: 100 req/sec
- Order creation is the bottleneck — optimize with connection pooling

```javascript
// Pre-create orders in bulk for flash sales (not recommended — orders expire)
// Better: Use a queue for order creation under load

// Rate limit your order creation endpoint to match Razorpay limits
const rateLimit = require('express-rate-limit');
app.use('/api/create-order', rateLimit({ windowMs: 1000, max: 20 }));  // 20/sec buffer
```

---

## Common Test Failures and Fixes

| Test Failure | Likely Cause | Fix |
|-------------|-------------|-----|
| Signature verification fails in tests | Using parsed body instead of raw | Use `express.raw()`, pass Buffer |
| Order creation returns 401 | Wrong API key or key from wrong mode | Check `rzp_test_` vs `rzp_live_` |
| Webhook test returns 400 | Webhook secret mismatch | Verify env var matches Dashboard |
| UPI payment stays pending | Using `pending@razorpay` VPA | Use `success@razorpay` for happy path |
| Amount mismatch error | Paise vs rupees confusion | Multiply by 100 consistently |
