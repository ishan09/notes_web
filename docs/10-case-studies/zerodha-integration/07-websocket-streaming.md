# WebSocket Streaming — KiteTicker

## Overview

KiteTicker is Zerodha's WebSocket API for real-time market data streaming.
It pushes price updates to your client as they happen — no polling required.

Use cases:
- Live price dashboards
- Algorithmic trading signals (price-triggered order placement)
- Options chain live updates
- Portfolio live P&L calculation

---

## Connection Limits

| Limit | Value |
|-------|-------|
| Max simultaneous WebSocket connections per user | 3 |
| Max instruments per connection | 3,000 |
| Total instruments across all connections | 9,000 |

---

## Subscription Modes

Each subscribed instrument can be in one of three modes:

| Mode | Data Received | Use Case |
|------|--------------|----------|
| `ltp` | Last traded price only | Large number of instruments, just need price |
| `quote` | LTP + OHLC + volume + buy/sell quantity | Standard dashboard |
| `full` | All quote data + 5-level market depth | Order book, algo trading |

You can mix modes across different instruments on the same connection.

---

## Basic Usage (Node.js SDK)

```javascript
const { KiteTicker } = require('kiteconnect');

const ticker = new KiteTicker({
  api_key: process.env.KITE_API_KEY,
  access_token: accessToken,
});

// Event: connected
ticker.on('connect', () => {
  console.log('KiteTicker connected');

  // Subscribe to instruments (use instrument_token, not tradingsymbol)
  const tokens = [738561, 408065, 779521]; // RELIANCE, HDFC, INFY
  ticker.subscribe(tokens);

  // Set mode for subscribed instruments
  ticker.setMode(ticker.modeFull, tokens);  // or modeLTP, modeQuote
});

// Event: tick received
ticker.on('ticks', (ticks) => {
  ticks.forEach(tick => {
    console.log(`${tick.instrument_token}: ₹${tick.last_price}`);
  });
});

// Event: disconnected
ticker.on('disconnect', (error) => {
  console.log('Disconnected', error);
});

// Event: error
ticker.on('error', (error) => {
  console.error('Ticker error', error);
});

// Event: closed
ticker.on('close', () => {
  console.log('Connection closed');
});

// Event: order update (pushed over same WebSocket)
ticker.on('order_update', (order) => {
  console.log('Order update received:', order.order_id, order.status);
});

// Connect
ticker.connect();
```

---

## Tick Data Structure

### LTP mode tick
```javascript
{
  instrument_token: 738561,
  last_price: 2450.50,
  tradable: true,
  mode: 'ltp',
}
```

### Quote mode tick
```javascript
{
  instrument_token: 738561,
  last_price: 2450.50,
  last_quantity: 5,
  average_price: 2448.30,
  volume: 1234567,
  buy_quantity: 45000,
  sell_quantity: 38000,
  ohlc: {
    open: 2440.00,
    high: 2468.00,
    low: 2432.00,
    close: 2435.50     // Previous day's close
  },
  change: 0.616,       // Percentage change from close
  tradable: true,
  mode: 'quote',
}
```

### Full mode tick (adds market depth)
```javascript
{
  // ... all quote fields +
  depth: {
    buy: [
      { price: 2450.00, quantity: 100, orders: 3 },
      { price: 2449.50, quantity: 250, orders: 8 },
      { price: 2449.00, quantity: 175, orders: 5 },
      { price: 2448.50, quantity: 300, orders: 12 },
      { price: 2448.00, quantity: 420, orders: 15 },
    ],
    sell: [
      { price: 2451.00, quantity: 75, orders: 2 },
      { price: 2451.50, quantity: 180, orders: 6 },
      { price: 2452.00, quantity: 250, orders: 9 },
      { price: 2452.50, quantity: 300, orders: 11 },
      { price: 2453.00, quantity: 400, orders: 14 },
    ]
  },
  oi: 0,             // Open interest (non-zero for F&O)
  oi_day_high: 0,
  oi_day_low: 0,
  last_trade_time: '2023-11-10T10:30:00+0530',
  exchange_timestamp: '2023-11-10T10:30:00+0530',
  mode: 'full',
}
```

---

## Reconnection Strategy

KiteTicker disconnects when:
- Network interruption
- Zerodha infrastructure restart
- Connection idle (no ticks for extended time)
- Token expiry (midnight)

The official SDK has auto-reconnect built in:

```javascript
const ticker = new KiteTicker({
  api_key: process.env.KITE_API_KEY,
  access_token: accessToken,
  reconnect: true,          // Enable auto-reconnect (default: true)
  max_retry: 10,            // Max reconnection attempts
  max_delay: 60,            // Max delay between retries (seconds)
});

// After reconnect, re-subscribe — subscriptions are lost on disconnect
ticker.on('reconnect', (reconnectCount, reconnectInterval) => {
  console.log(`Reconnecting (${reconnectCount}), interval: ${reconnectInterval}s`);
});

ticker.on('noreconnect', () => {
  console.error('Max reconnect attempts reached — manual intervention needed');
  // Alert your ops team
  notifyOps('KiteTicker failed to reconnect after max retries');
});

ticker.on('connect', () => {
  // Always re-subscribe after connect/reconnect
  const tokens = getSubscribedTokens();  // From your state store
  if (tokens.length > 0) {
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens);
  }
});
```

---

## Dynamic Subscribe / Unsubscribe

```javascript
// Add new instruments without reconnecting
ticker.subscribe([256265]);           // Add NIFTY 50 index
ticker.setMode(ticker.modeLTP, [256265]);

// Remove instruments from subscription
ticker.unsubscribe([738561]);         // Remove RELIANCE

// Change mode for existing subscription
ticker.setMode(ticker.modeQuote, [408065]);  // Downgrade HDFC from full to quote
```

---

## Order Updates Over WebSocket

Order status updates are also delivered over the same WebSocket connection (not postback).
This is the lowest-latency way to get order updates for algo trading.

```javascript
ticker.on('order_update', (order) => {
  // Same structure as postback payload
  if (order.status === 'COMPLETE') {
    placeNextLeg(order);
  } else if (order.status === 'REJECTED') {
    handleRejection(order);
  }
});
```

**Use WebSocket order updates for latency-sensitive algo systems. Use postbacks as backup/reconciliation.**

---

## Handling Non-Trading Hours

During non-trading hours (before 9:00 AM, after 3:30 PM, weekends), the WebSocket connection
still works but tick data is sparse or absent. Handle gracefully:

```javascript
function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay();

  // Skip weekends
  if (day === 0 || day === 6) return false;

  // 9:15 AM to 3:30 PM IST
  const startMinutes = 9 * 60 + 15;
  const endMinutes = 15 * 60 + 30;
  const currentMinutes = hours * 60 + minutes;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

ticker.on('ticks', (ticks) => {
  if (!isMarketOpen()) return;  // Ignore ticks outside market hours
  processTicks(ticks);
});
```

---

## Performance Tips

1. **Use LTP mode** for instruments you only need price alerts on — reduces bandwidth.
2. **Batch subscribe calls**: Subscribe to all tokens at once, not one by one.
3. **Don't process ticks synchronously on the handler** — offload to a queue/worker.
4. **Throttle UI updates**: Human eyes can't read faster than 200ms. Batch tick updates.

```javascript
// Throttle updates to dashboard
const pendingTicks = new Map();
let flushTimer = null;

ticker.on('ticks', (ticks) => {
  ticks.forEach(tick => pendingTicks.set(tick.instrument_token, tick));

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      updateDashboard([...pendingTicks.values()]);
      pendingTicks.clear();
      flushTimer = null;
    }, 200);  // Flush every 200ms
  }
});
```
