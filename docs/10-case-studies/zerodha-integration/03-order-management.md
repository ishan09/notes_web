# Order Management

## Order Lifecycle

```
OPEN → PENDING → TRIGGER PENDING → COMPLETE
                                 → REJECTED
                                 → CANCELLED
```

| Status | Meaning |
|--------|---------|
| `OPEN` | Order sent to exchange, not yet matched |
| `PENDING` | Intermediate state during processing |
| `TRIGGER PENDING` | SL/SL-M order waiting for trigger price to be hit |
| `COMPLETE` | Fully executed (all quantity filled) |
| `REJECTED` | Rejected by exchange or Zerodha's risk system |
| `CANCELLED` | Cancelled by user or auto-cancelled (GTD expiry, MIS square-off) |

Partial fills result in multiple `trade` entries under the order. The order stays `OPEN` until fully filled or cancelled.

---

## Place Order

```javascript
// POST /orders/{variety}
// variety: regular | co | amo | iceberg | auction

const orderId = await kite.placeOrder('regular', {
  exchange: 'NSE',
  tradingsymbol: 'RELIANCE',
  transaction_type: 'BUY',
  quantity: 10,
  product: 'CNC',          // Delivery
  order_type: 'LIMIT',
  price: 2450.50,
  validity: 'DAY',
  // Optional fields:
  disclosed_quantity: 0,   // Quantity shown in order book (iceberg)
  trigger_price: 0,        // For SL/SL-M orders
  tag: 'my_algo_v1',       // Custom tag for your analytics (max 20 chars)
});
// Returns: { order_id: "221012000012345" }
```

### Order Examples

```javascript
// MARKET order — equity intraday
await kite.placeOrder('regular', {
  exchange: 'NSE',
  tradingsymbol: 'INFY',
  transaction_type: 'BUY',
  quantity: 5,
  product: 'MIS',
  order_type: 'MARKET',
  validity: 'DAY',
});

// LIMIT order — F&O
await kite.placeOrder('regular', {
  exchange: 'NFO',
  tradingsymbol: 'NIFTY23NOV18000CE',   // NIFTY Call option, 18000 strike, Nov expiry
  transaction_type: 'BUY',
  quantity: 50,                          // F&O lot size must be respected
  product: 'NRML',
  order_type: 'LIMIT',
  price: 120.50,
  validity: 'DAY',
});

// Stop-Loss order
await kite.placeOrder('regular', {
  exchange: 'NSE',
  tradingsymbol: 'TCS',
  transaction_type: 'SELL',
  quantity: 10,
  product: 'CNC',
  order_type: 'SL',
  price: 3400.00,          // Execute at this price or better after trigger
  trigger_price: 3420.00,  // Activate when price hits this
  validity: 'DAY',
});

// After Market Order (AMO) — placed outside trading hours
await kite.placeOrder('amo', {   // variety = 'amo'
  exchange: 'NSE',
  tradingsymbol: 'HDFC',
  transaction_type: 'BUY',
  quantity: 2,
  product: 'CNC',
  order_type: 'LIMIT',
  price: 1680.00,
  validity: 'DAY',
});
```

---

## Modify Order

Only `OPEN` or `TRIGGER PENDING` orders can be modified.
You cannot modify a `COMPLETE` or `REJECTED` order.

```javascript
// PUT /orders/{variety}/{order_id}
await kite.modifyOrder('regular', orderId, {
  price: 2455.00,          // New limit price
  quantity: 15,            // Change quantity (cannot exceed original if partially filled)
  order_type: 'LIMIT',
  validity: 'DAY',
  trigger_price: 0,
  disclosed_quantity: 0,
});
```

**What can be modified**: price, quantity, order_type, validity, trigger_price, disclosed_quantity.
**What cannot be modified**: exchange, tradingsymbol, transaction_type, product.

---

## Cancel Order

```javascript
// DELETE /orders/{variety}/{order_id}
await kite.cancelOrder('regular', orderId);
// Returns: { order_id: "221012000012345" }
```

Only `OPEN` or `TRIGGER PENDING` orders can be cancelled.

---

## Fetch Orders

```javascript
// All orders for the day
const orders = await kite.getOrders();

// Single order history (shows all state transitions)
const orderHistory = await kite.getOrderHistory(orderId);

// Trades for a specific order (individual fills)
const trades = await kite.getOrderTrades(orderId);

// All trades for the day across all orders
const allTrades = await kite.getTrades();
```

### Order Object Structure

```json
{
  "order_id": "221012000012345",
  "parent_order_id": null,
  "exchange_order_id": "1100000000123456",
  "status": "COMPLETE",
  "status_message": null,
  "status_message_raw": null,
  "order_timestamp": "2022-10-12 10:31:24",
  "exchange_timestamp": "2022-10-12 10:31:24",
  "exchange": "NSE",
  "tradingsymbol": "RELIANCE",
  "instrument_token": 738561,
  "transaction_type": "BUY",
  "order_type": "LIMIT",
  "product": "CNC",
  "validity": "DAY",
  "price": 2450.50,
  "quantity": 10,
  "trigger_price": 0,
  "average_price": 2448.70,    // Actual fill price (weighted average)
  "pending_quantity": 0,        // Unfilled quantity
  "filled_quantity": 10,
  "disclosed_quantity": 0,
  "market_protection": 0,
  "tag": "my_algo_v1",
  "meta": {}
}
```

---

## GTT (Good Till Triggered) Orders

GTT orders stay active until a price trigger is hit — they persist beyond a single trading day.
Useful for setting price alerts that auto-place orders.

Two types:
- **Single GTT**: Triggers when price crosses one level
- **OCO GTT (One Cancels Other)**: Two triggers — if one fires, the other is cancelled (used for target + stop-loss)

```javascript
// Place a GTT — buy RELIANCE if price drops to 2300
await kite.placeGTT({
  trigger_type: 'single',        // or 'two-leg' for OCO
  tradingsymbol: 'RELIANCE',
  exchange: 'NSE',
  trigger_values: [2300.00],     // Array: one value for single, two for OCO
  last_price: 2450.00,           // Current market price (validation check)
  orders: [
    {
      transaction_type: 'BUY',
      quantity: 10,
      product: 'CNC',
      order_type: 'LIMIT',
      price: 2295.00,            // Limit price for the triggered order
    }
  ],
});

// OCO GTT — sell with target + stop-loss
await kite.placeGTT({
  trigger_type: 'two-leg',
  tradingsymbol: 'RELIANCE',
  exchange: 'NSE',
  trigger_values: [2600.00, 2200.00],   // [target, stop-loss]
  last_price: 2450.00,
  orders: [
    {
      transaction_type: 'SELL',
      quantity: 10,
      product: 'CNC',
      order_type: 'LIMIT',
      price: 2595.00,
    },
    {
      transaction_type: 'SELL',
      quantity: 10,
      product: 'CNC',
      order_type: 'LIMIT',
      price: 2195.00,
    },
  ],
});
```

### GTT States

| State | Meaning |
|-------|---------|
| `active` | Watching for trigger |
| `triggered` | Trigger hit, order placed |
| `disabled` | Invalidated (e.g., corporate action like split, dividend) |
| `expired` | GTT validity period elapsed (1 year by default) |
| `cancelled` | User cancelled |
| `rejected` | Order was rejected after triggering |

```javascript
// Fetch all GTT orders
const gttList = await kite.getGTTs();

// Modify GTT
await kite.modifyGTT(gttId, { /* same fields as placeGTT */ });

// Delete GTT
await kite.deleteGTT(gttId);
```

---

## Basket Orders

Placing multiple orders atomically. Used for strategies (straddles, spreads) where you need all legs.
Zerodha doesn't have a native basket API — execute legs sequentially with error handling:

```javascript
async function placeBasketOrder(legs) {
  const results = [];
  for (const leg of legs) {
    try {
      const orderId = await kite.placeOrder('regular', leg);
      results.push({ success: true, order_id: orderId, leg });
    } catch (err) {
      // One leg failed — log and decide whether to roll back others
      results.push({ success: false, error: err.message, leg });
      // Optionally cancel already-placed legs
    }
  }
  return results;
}
```

Zerodha's own Kite app handles this with their basket order UI, but the API is leg-by-leg.

---

## F&O Lot Sizes

F&O orders must be placed in multiples of the lot size. Lot sizes change quarterly.

```javascript
// Get lot size for an instrument
const instruments = await kite.getInstruments('NFO');
const nifty = instruments.find(i => i.tradingsymbol === 'NIFTY23NOV18000CE');
console.log(nifty.lot_size);  // e.g., 50

// Validate before placing order
if (quantity % nifty.lot_size !== 0) {
  throw new Error(`Quantity must be a multiple of lot size (${nifty.lot_size})`);
}
```

Common lot sizes (may change):
- NIFTY options: 50
- BANKNIFTY options: 15
- FINNIFTY options: 40
- Single stock F&O: varies by stock (25–4000)

---

## Common Order Rejection Reasons

| Rejection Message | Cause & Fix |
|------------------|-------------|
| `"Insufficient funds"` | Not enough margin. Check `getMargins()` before placing. |
| `"Not enough qty in holdings"` | Selling more than you hold in demat. |
| `"RMS:Rule: Check circuit filter"` | Price outside upper/lower circuit for the day. |
| `"Quantity is not a multiple of lot size"` | F&O order quantity not a multiple of lot size. |
| `"Invalid price"` | Price tick not respected (e.g., NIFTY options tick = 0.05). |
| `"Order not found"` | Attempting to modify/cancel a non-existent or completed order. |
| `"Exchange is closed"` | Placing a regular order outside market hours — use AMO instead. |
