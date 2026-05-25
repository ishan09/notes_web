# Webhooks & Order Postbacks

## Overview

Zerodha sends order status updates to your server via **postbacks** (Zerodha's term for webhooks).
Every time an order status changes — placed, filled, rejected, cancelled — a POST request is sent
to your configured **postback URL**.

This is the only reliable way to track order status in real-time for algo systems.
**Do not poll `/orders` repeatedly** — use postbacks for order state changes.

---

## Configuring the Postback URL

Set in the Kite Connect app settings dashboard:
`https://developers.kite.trade/apps/YOUR_APP_ID/settings`

The postback URL must be:
- Publicly accessible (not `localhost`)
- Return HTTP 200 within the timeout
- Accept POST requests with `application/json` body

For local development, use ngrok:
```bash
ngrok http 3000
# Use the https URL from ngrok output as your postback URL
```

---

## Postback Payload

```json
{
  "order_id": "221012000012345",
  "exchange_order_id": "1100000000123456",
  "placed_by": "AB1234",
  "status": "COMPLETE",
  "status_message": null,
  "status_message_raw": null,
  "order_timestamp": "2022-10-12 10:31:24",
  "exchange_update_timestamp": "2022-10-12 10:31:24",
  "exchange_timestamp": "2022-10-12 10:31:24",
  "rejection_reason": null,
  "variety": "regular",
  "exchange": "NSE",
  "tradingsymbol": "RELIANCE",
  "instrument_token": 738561,
  "order_type": "LIMIT",
  "transaction_type": "BUY",
  "validity": "DAY",
  "product": "CNC",
  "quantity": 10,
  "disclosed_quantity": 0,
  "price": 2450.50,
  "trigger_price": 0,
  "average_price": 2448.70,    // Actual fill price (weighted average)
  "filled_quantity": 10,
  "pending_quantity": 0,
  "cancelled_quantity": 0,
  "market_protection": 0,
  "meta": {},
  "tag": "my_algo_v1",
  "guid": "XXXXX"
}
```

---

## Handling Postbacks

```javascript
// Express.js postback handler
app.post('/kite/postback', express.json(), async (req, res) => {
  // Respond immediately — don't do heavy work before 200
  res.sendStatus(200);

  // Process asynchronously
  setImmediate(() => handleOrderUpdate(req.body));
});

async function handleOrderUpdate(postback) {
  const { order_id, status, filled_quantity, average_price, tag } = postback;

  // Idempotency check — same postback can arrive multiple times
  const existing = await db.orders.findOne({ where: { order_id } });
  if (existing && existing.status === status && existing.filled_quantity === filled_quantity) {
    return; // Already processed this exact state
  }

  // Update order record
  await db.orders.upsert({
    order_id,
    status,
    filled_quantity,
    average_price,
    updated_at: new Date(),
  });

  // Trigger business logic based on status
  switch (status) {
    case 'COMPLETE':
      await onOrderComplete(postback);
      break;
    case 'REJECTED':
      await onOrderRejected(postback);
      break;
    case 'CANCELLED':
      await onOrderCancelled(postback);
      break;
    default:
      // OPEN, PENDING, TRIGGER PENDING — just log
      break;
  }
}
```

---

## Postback Reliability & Idempotency

Unlike Stripe/Razorpay webhooks, **Zerodha postbacks have no signature header** for verification.
Verification approach:

1. **IP allowlist**: Zerodha sends postbacks from a fixed set of IPs. Restrict your endpoint to those IPs.
2. **Re-fetch from API**: For critical actions, always re-fetch the order from `/orders/{order_id}` to confirm state before acting.
3. **Idempotency key**: Use `order_id + status + filled_quantity` as your idempotency key.

```javascript
async function onOrderComplete(postback) {
  const { order_id } = postback;

  // Re-verify with Zerodha API before fulfilling
  const [verifiedOrder] = (await kite.getOrderHistory(order_id)).slice(-1);
  if (verifiedOrder.status !== 'COMPLETE') {
    console.warn(`Postback said COMPLETE but API says ${verifiedOrder.status}. Ignoring.`);
    return;
  }

  // Now safe to act
  await fulfillTrade(verifiedOrder);
}
```

---

## Partial Fills

An order can be partially filled — `filled_quantity < quantity`. You will receive multiple postbacks:

```
Postback 1: { status: "OPEN", filled_quantity: 0 }
Postback 2: { status: "OPEN", filled_quantity: 4 }   ← partial fill
Postback 3: { status: "COMPLETE", filled_quantity: 10 } ← fully filled
```

Your handler must account for partial fills if your strategy depends on exact quantity.

---

## Key Postback Status Transitions

| From | To | Trigger |
|------|----|---------|
| — | `OPEN` | Order accepted by exchange |
| `OPEN` | `COMPLETE` | All quantity filled |
| `OPEN` | `CANCELLED` | User cancelled, or MIS auto-square-off |
| `OPEN` | `REJECTED` | Exchange rejected (price limit, circuit filter, margin) |
| `TRIGGER PENDING` | `OPEN` | SL trigger price hit |
| `TRIGGER PENDING` | `CANCELLED` | Cancelled before trigger |

---

## Missing Postbacks

Postbacks can be delayed or missed (network issues, Zerodha infrastructure). 
Always reconcile by polling orders at end of day:

```javascript
// Reconciliation job — run at 4:00 PM on trading days
async function reconcileOrders() {
  const kiteOrders = await kite.getOrders();  // All orders for today
  const dbOrders = await db.orders.findAll({ where: { date: today() } });

  for (const kiteOrder of kiteOrders) {
    const dbOrder = dbOrders.find(o => o.order_id === kiteOrder.order_id);

    if (!dbOrder || dbOrder.status !== kiteOrder.status) {
      // Handle state discrepancy
      await handleOrderUpdate({
        ...kiteOrder,
        source: 'reconciliation'
      });
    }
  }
}
```
