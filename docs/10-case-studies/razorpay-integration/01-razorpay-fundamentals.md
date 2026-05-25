# Razorpay Fundamentals

## What is Razorpay?

Razorpay is India's leading full-stack financial services platform providing:
- Payment gateway (cards, UPI, netbanking, wallets, EMI, BNPL)
- Subscription billing
- Payouts (bulk transfers to vendors/employees)
- Banking (RazorpayX — current accounts, payroll)
- Fraud detection (Razorpay Shield)

It sits between your application and the Indian banking network (NPCI for UPI, card networks, bank APIs).

---

## The Money Flow

```
Your Customer
    → Razorpay (processes payment, holds funds in nodal account)
    → Your Razorpay Account (funds settle here)
    → Your Bank Account (via settlements, T+2 or T+3 for most modes)
```

Settlement timeline varies by payment method:
- Cards: T+2 business days
- UPI: T+1 (usually same day for small merchants after account maturity)
- Netbanking: T+2
- Wallets: T+1

---

## API Keys — The Foundation

| Key | Used Where | Risk if Leaked |
|-----|------------|----------------|
| Key ID (`rzp_live_...` / `rzp_test_...`) | Frontend + Backend | Medium — can create orders |
| Key Secret | Backend only (server-side) | CRITICAL — full account access |

**NEVER put Key Secret in frontend code, git commits, or environment logs.**

```bash
# .env
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Difference from Stripe
Unlike Stripe's publishable/secret split, Razorpay's Key ID is used on both frontend and backend.
The Key Secret is backend-only. This means:
- Key ID in JS is fine — it only identifies your account
- Key Secret must never leave your server

---

## Core Razorpay Objects

### Order
Created by your backend before presenting checkout. Represents your intent to collect payment.

```json
{
  "id": "order_ABC123",
  "entity": "order",
  "amount": 50000,
  "amount_paid": 0,
  "amount_due": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "status": "created",
  "notes": {
    "internal_order_id": "your_db_order_id_42"
  }
}
```

**Key point**: Amount is always in the smallest currency unit (paise for INR).
₹500 = 50000 paise. This is the #1 bug in first-time integrations.

Always store `razorpay_order_id` in your DB linked to your order record.

### Payment
Created by Razorpay when a customer completes payment. Linked to an Order.

```json
{
  "id": "pay_ABC123",
  "entity": "payment",
  "amount": 50000,
  "currency": "INR",
  "status": "captured",
  "order_id": "order_ABC123",
  "method": "upi",
  "captured": true
}
```

Payment statuses:
```
created → authorized → captured
                    ↘ failed
                    ↘ refunded
```

**authorized** means the bank approved it but money isn't captured yet.
**captured** means money has been deducted and will settle to you.

### Refund
Partial or full reversal of a captured payment.

### Settlement
Daily batch of captured payments transferred to your bank account.

### Customer
Razorpay customer object (optional but useful for subscriptions and saved cards).

---

## Payment Methods Supported

This is why Razorpay dominates India — breadth of payment methods:

| Method | Notes |
|--------|-------|
| Cards | Visa, Mastercard, RuPay, Amex — domestic + international |
| UPI | GPay, PhonePe, Paytm, BHIM — most popular in India |
| Netbanking | 50+ banks |
| Wallets | Paytm, Amazon Pay, PhonePe, Mobikwik, Freecharge |
| EMI | Card EMI + Cardless EMI (Bajaj, ZestMoney, etc.) |
| BNPL | Buy Now Pay Later (LazyPay, Simpl, etc.) |
| Bank Transfer | NEFT/RTGS for large amounts |
| QR Code | Physical/digital QR for UPI |
| Payment Links | No-code payments via SMS/email |

---

## Test vs Live Mode

- **Test mode**: Key starts with `rzp_test_`. No real money moves.
- **Live mode**: Key starts with `rzp_live_`. Real money.

Test mode requires your account to be in test mode (dashboard toggle).
You need KYC completion to activate live mode.

**Common mistake**: Forgetting to switch keys when deploying to production.
Enforce via environment variables, never hardcode.

---

## API Versioning

Razorpay doesn't use versioned URL paths like Stripe (e.g., `/v1/charges`).
They maintain backward compatibility. But always pin your SDK version in `package.json` / `pom.xml`.

```javascript
// Node.js
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

```java
// Java
RazorpayClient client = new RazorpayClient(
    System.getenv("RAZORPAY_KEY_ID"),
    System.getenv("RAZORPAY_KEY_SECRET")
);
```

---

## Rate Limits

Razorpay limits vary by endpoint and account tier:
- Standard: ~100 requests/minute for order creation
- Higher limits available for enterprise accounts

Implement exponential backoff on 429 responses:

```javascript
async function razorpayCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
}
```

---

## Razorpay Dashboard

Operations team uses this daily:
- View payments, refunds, settlements
- Search by payment ID, order ID, customer phone/email
- Issue refunds manually
- View webhook delivery logs (crucial for debugging)
- Download settlement reports for accounting
- Configure webhook endpoints

**Interview tip**: Mention that settlement reconciliation reports are critical for finance teams —
not just a developer concern.
