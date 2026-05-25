# Production Pitfalls — Real-World Bugs and Edge Cases

These are mistakes that appear in real integrations and cause production incidents.

---

## Pitfall 1: Paise Confusion (The #1 Bug)

**Symptom**: Customer is charged ₹1 instead of ₹100, or ₹500 instead of ₹5.

**Cause**: Razorpay amounts are in paise (smallest unit). ₹100 = 10000 paise.

```javascript
// WRONG
razorpay.orders.create({ amount: 500 });  // Charges ₹5, not ₹500

// CORRECT
razorpay.orders.create({ amount: 500 * 100 });  // Charges ₹500
```

**Fix**: Create a conversion utility and use it consistently.
```javascript
const toPaise = (rupees) => Math.round(rupees * 100);
const toRupees = (paise) => paise / 100;
```

**Test**: Always verify in test mode that the amount shown in Razorpay dashboard matches intent.

---

## Pitfall 2: Fulfilling on Frontend Callback Alone

**Symptom**: Orders fulfilled without actual payment, or missed UPI payments.

**Cause**: Developer trusts the `handler` function in Razorpay checkout and fulfills on callback
without backend signature verification.

```javascript
// WRONG — trusting frontend
handler: function(response) {
  axios.post('/api/fulfill-order', { order_id: response.razorpay_order_id });
  // Anyone can call this endpoint with a fake order_id
}

// CORRECT — send to verification endpoint first
handler: function(response) {
  axios.post('/api/verify-payment', {
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_order_id: response.razorpay_order_id,
    razorpay_signature: response.razorpay_signature,
  }).then(() => {
    // Backend verified, now fulfill
    window.location.href = '/order-success';
  });
}
```

---

## Pitfall 3: Missing UPI Webhook Handling

**Symptom**: Some UPI payments never get fulfilled. Customers complain they were charged but
didn't get the product.

**Cause**: UPI collect payments are asynchronous. The checkout handler fires on confirmation,
but if the customer approves the UPI collect request after the checkout modal closes,
the frontend handler never fires.

**Fix**: Rely on the `payment.captured` / `order.paid` webhook for all UPI fulfillment.
Never rely solely on the frontend handler for async payment methods.

```javascript
// Frontend handler — fire-and-forget (initiates verification)
handler: function(response) {
  verifyPayment(response);
  // But also wait for webhook as backup
}

// Webhook handler — reliable source of truth
case 'order.paid':
  await fulfillOrder(event.payload.order.entity.id);
  // This fires even if frontend handler didn't
  break;
```

---

## Pitfall 4: Not Creating an Order Before Checkout

**Symptom**: `razorpay_order_id` is undefined in the callback, or signature verification fails.

**Cause**: Developer opens checkout with just `amount`, without creating a Razorpay Order first.
Without `order_id`, there's no Order-Payment link and signature verification breaks.

```javascript
// WRONG
const options = {
  key: KEY_ID,
  amount: 50000,
  currency: 'INR',
  // No order_id — payment is unlinked
};

// CORRECT
// 1. Call backend to create order
const { order_id } = await axios.post('/api/create-order', { amount: 50000 });
// 2. Use order_id in checkout options
const options = {
  key: KEY_ID,
  amount: 50000,
  order_id: order_id,  // Required
};
```

---

## Pitfall 5: Non-Idempotent Webhook Handlers

**Symptom**: Customers receive duplicate emails, accounts credited twice, duplicate fulfillments.

**Cause**: Razorpay retries webhooks on non-2xx responses. If your handler is slow or errors
after partially completing, the retry duplicates the work.

**Fix**: See `03-webhooks.md` — track processed event IDs.

---

## Pitfall 6: Webhook Timeout (5-second limit)

**Symptom**: Razorpay shows webhook as "failed" even though your server handled it correctly.
Retries cause duplicates.

**Cause**: Razorpay times out webhook delivery at 5 seconds. If your handler does database
writes, email sends, external API calls, etc., it may exceed this.

```javascript
// WRONG — doing heavy work in webhook handler
app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  // ... verify signature ...
  const event = JSON.parse(req.body.toString());
  await fulfillOrder(event.payload.order.entity);   // DB write
  await sendConfirmationEmail(customerId);           // Email API call
  await updateInventory(items);                      // Another API call
  res.json({ status: 'ok' });                       // May be too late
});

// CORRECT — acknowledge first, process async
app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  // ... verify signature ...
  const event = JSON.parse(req.body.toString());

  res.json({ status: 'ok' });  // Respond immediately

  // Async processing after response
  setImmediate(() => processWebhookAsync(event).catch(console.error));
});
```

---

## Pitfall 7: Manual Capture Forgetting to Capture

**Symptom**: Payments authorized but never captured. Customers see a hold on their account.
After 5 days, payments auto-refund. Revenue lost.

**Cause**: Using `payment_capture: 0` (manual) in order creation but forgetting to call `capture`.

```javascript
// If using manual capture, ALWAYS capture within 5 days
const payment = await razorpay.payments.fetch(payment_id);
if (payment.status === 'authorized') {
  await razorpay.payments.capture(payment_id, payment.amount, 'INR');
}
```

**Recommendation**: Use `payment_capture: 1` (auto) unless you specifically need manual capture
for inventory reservation workflows.

---

## Pitfall 8: Receipt Length Exceeded

**Symptom**: Order creation fails with `BAD_REQUEST_ERROR: receipt too long`.

**Cause**: `receipt` field in order creation has a 40-character limit.

```javascript
// WRONG
razorpay.orders.create({ receipt: `receipt_${uuid()}` });  // UUID is 36 chars + prefix = 44 chars

// CORRECT
razorpay.orders.create({ receipt: `rcpt_${orderId}` });    // Keep it short
// Or use a hash:
const receipt = `r_${Date.now().toString(36)}`;  // Short timestamp-based ID
```

---

## Pitfall 9: Trusting Payment Status from Frontend

**Symptom**: Fraudulent users claim successful payment by manipulating the response.

**Cause**: Developer checks payment status from the data passed to the frontend handler
without fetching from Razorpay's API on the backend.

**Fix**: After signature verification, optionally fetch the payment object directly:

```javascript
// After signature verification
const payment = await razorpay.payments.fetch(razorpay_payment_id);

if (payment.status !== 'captured') {
  return res.status(400).json({ error: 'Payment not yet captured' });
}

// Now it's safe to fulfill
```

---

## Pitfall 10: Mixing Test and Live Keys

**Symptom**: Payments fail in production with authentication errors. Or worse: test mode payments
accepted in production without real money moving.

**Fix**: Enforce via environment:
```javascript
// startup check
if (process.env.NODE_ENV === 'production' && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
  throw new Error('FATAL: Production environment must use live Razorpay keys');
}
```

---

## Pitfall 11: Subscription Signature Format Confusion

**Symptom**: Subscription payment verification fails with invalid signature.

**Cause**: Subscription signature uses a different format from one-time payment signature.

```javascript
// One-time payment:  order_id|payment_id
// Subscription:      payment_id|subscription_id  (ORDER IS DIFFERENT!)

// Wrong for subscriptions:
crypto.createHmac('sha256', secret).update(`${order_id}|${payment_id}`).digest('hex');

// Correct for subscriptions:
crypto.createHmac('sha256', secret).update(`${payment_id}|${subscription_id}`).digest('hex');
```

---

## Pitfall 12: Not Handling ondismiss

**Symptom**: After user closes the payment modal without paying, the UI is stuck in a loading
state. Users can't retry. Support tickets spike.

```javascript
// Handle ondismiss to reset UI
modal: {
  ondismiss: function() {
    setLoading(false);
    setError('Payment was cancelled. Please try again.');
  }
}
```

---

## Incident Response: "Customer paid but order not fulfilled"

Investigation steps:
1. Check Razorpay Dashboard → Payments → search by payment ID
2. Check if `payment.captured` webhook was received (Dashboard → Webhooks → Logs)
3. Check your application logs for webhook processing
4. If webhook was delivered but not processed: check your handler logs
5. If webhook was never delivered: manually trigger from Dashboard → Webhooks → Resend

**Manual fulfillment**: Always have an internal admin tool to manually mark orders as paid
and trigger fulfillment for these cases.

---

## Quick Checklist Before Going Live

- [ ] Using `rzp_live_` keys (not test keys)
- [ ] Order created before checkout opens
- [ ] Signature verified on backend (not just frontend)
- [ ] Amount stored server-side (not trusted from frontend)
- [ ] Webhook endpoint live and verified
- [ ] Both `payment.captured` and `order.paid` handlers implemented
- [ ] Webhook handlers are idempotent
- [ ] Responding to webhooks within 5 seconds
- [ ] Manual capture timeout monitored (if using manual capture)
- [ ] Paise conversion validated with test payments
- [ ] `ondismiss` handled in frontend
- [ ] Test mode payments tested thoroughly before switching to live
