# Production Pitfalls

Real-world bugs and edge cases from Zerodha Kite Connect integrations.

---

## 1. Token Expires at Midnight, Not After 24 Hours

**The bug**: Assuming the access_token lasts 24 hours from when it was generated.

**Reality**: It expires at 23:59:59 IST **on the same day** it was generated.
A token generated at 11:55 PM lasts only 4 minutes. A token generated at 6:00 AM is valid until midnight.

**Fix**:
```javascript
// Calculate expiry correctly
function getTokenExpiry() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);

  // If already past midnight IST, calculate for next midnight
  // Always use IST for this calculation
  const istMidnight = new Date(
    new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) +
    'T23:59:59.999+05:30'
  );
  return istMidnight;
}
```

---

## 2. Instruments List is Stale by Day End

**The bug**: Caching the instruments list indefinitely. F&O contracts expire weekly/monthly.
After expiry, the instrument token becomes invalid.

**Fix**: Download instruments list once at app startup every day (or at 8:00 AM before market open).
Never cache across days without refreshing.

```javascript
// Schedule daily refresh
const cron = require('node-cron');
cron.schedule('0 8 * * 1-5', async () => {  // 8 AM Mon-Fri
  await refreshInstrumentCache();
});
```

---

## 3. MIS Auto-Square-Off at 3:15 PM

**The bug**: Expecting MIS positions to stay open until 3:30 PM.

**Reality**: Zerodha auto-squares off MIS positions at approximately **3:15 PM** for equity
(25 minutes before for F&O). This is done at market price — no control over the fill price.
If the market is illiquid, you get a bad fill.

**Fix**: Square off MIS positions manually before 3:00 PM if you want controlled exit.

```javascript
// Auto square-off job at 2:50 PM
cron.schedule('50 14 * * 1-5', async () => {  // 2:50 PM IST
  const positions = await kite.getPositions();
  const misPositions = positions.net.filter(p => p.product === 'MIS' && p.quantity !== 0);

  for (const pos of misPositions) {
    await kite.placeOrder('regular', {
      exchange: pos.exchange,
      tradingsymbol: pos.tradingsymbol,
      transaction_type: pos.quantity > 0 ? 'SELL' : 'BUY',
      quantity: Math.abs(pos.quantity),
      product: 'MIS',
      order_type: 'MARKET',
      validity: 'DAY',
    });
  }
});
```

---

## 4. Polling `/quote` Instead of Using KiteTicker

**The bug**: Making REST calls to `/quote` every second for live price updates.

**Reality**: The quote endpoint is rate-limited to 1 req/second. Polling causes:
- Rate limit errors (HTTP 429)
- ~200ms polling lag vs ~50ms WebSocket push
- High server load

**Fix**: Use KiteTicker WebSocket for any live price display or algo signal.

---

## 5. F&O Tradingsymbol Format is Complex

**The bug**: Constructing F&O tradingsymbols manually (e.g., `"NIFTY23NOV18000CE"`).

**Reality**: The format changes — expiry date format, underlying symbol, and lot sizes
change quarterly. SEBI mandates new symbol formats periodically.

**Fix**: Always look up the tradingsymbol from the instruments list. Never construct it manually.

```javascript
// WRONG
const symbol = `NIFTY${year}${month}${strike}CE`;

// RIGHT
const instrument = nfoInstruments.find(i =>
  i.name === 'NIFTY' &&
  i.strike === 18000 &&
  i.instrument_type === 'CE' &&
  i.expiry === '2023-11-30'
);
const symbol = instrument.tradingsymbol;
```

---

## 6. Postbacks Are Not Signed — Never Trust Without Verification

**The bug**: Processing postback data directly without re-verifying from the API.

**Reality**: Anyone who knows your postback URL can send fake order updates.
There is no HMAC signature on Zerodha postbacks.

**Fix**: Always re-fetch from the Kite API before taking action:

```javascript
async function handlePostback(postback) {
  const orderHistory = await kite.getOrderHistory(postback.order_id);
  const latestState = orderHistory[orderHistory.length - 1];

  if (latestState.status === 'COMPLETE') {
    await fulfillOrder(latestState);
  }
}
```

---

## 7. Historical Data — Date Range Limits

**The bug**: Requesting minute-level candles for 6 months at once.

**Reality**: Historical API has per-interval limits:
- `minute`: max 60 days per call
- `day`: max 2000 days per call

Exceeding returns an error, not a truncated response.

**Fix**: Paginate — see the pagination helper in `04-market-data.md`.

---

## 8. Lot Size Changes Break Existing Orders

**The bug**: Hardcoding lot sizes. SEBI periodically revises F&O lot sizes (usually quarterly).

**Reality**: After a lot size change, old orders placed in old lot sizes are rejected.
GTT orders created with old lot sizes also get rejected when triggered.

**Fix**: Always read `lot_size` from the instruments list. Update GTT orders after lot size changes.

---

## 9. Tick Size Violations Cause Silent-Looking Errors

**The bug**: Sending `price: 2451.37` for an instrument with tick_size 0.05.

**Reality**: Zerodha returns `"Invalid price"` rejection. The error message doesn't always
explain tick size — developers spend hours debugging.

**Fix**: Round all prices to the nearest tick before sending:

```javascript
function roundToTick(price, tickSize) {
  const pricePaise = Math.round(price * 100);
  const tickPaise = Math.round(tickSize * 100);
  return (Math.round(pricePaise / tickPaise) * tickPaise) / 100;
}
```

---

## 10. GTT Orders Get Disabled After Corporate Actions

**The bug**: Assuming GTT orders survive stock splits, bonuses, dividends.

**Reality**: GTT orders are automatically **disabled** when a corporate action (split, bonus issue,
rights issue) modifies the share price or quantity. You receive no notification.

**Fix**:
- Periodically check GTT order status via `getGTTs()`
- Subscribe to corporate action announcements (NSE/BSE websites or data vendors)
- After a corporate action, recalculate trigger prices and recreate GTT orders

---

## 11. WebSocket Ticks During Pre-Open Don't Reflect True Market Price

**The bug**: Using 9:00–9:15 AM pre-open prices for algo signals.

**Reality**: During the pre-open session (9:00–9:15 AM), the order book is being built.
Prices can be artificial or misleading. The opening price is determined at 9:15 AM.

**Fix**: Start algo signals only after 9:15 AM when the regular session opens.

---

## 12. Multiple WebSocket Connections with Same Token

**The bug**: Creating multiple KiteTicker instances for the same user at the same time.

**Reality**: Zerodha limits to 3 WebSocket connections per user. Exceeding disconnects the oldest.
In distributed systems (multiple servers), this causes flapping connections.

**Fix**: Use a single WebSocket process per user (pub/sub internally if needed).

---

## 13. account_id in Postback Doesn't Match Your User ID

**The bug**: Using `placed_by` from postback as your internal user ID.

**Reality**: `placed_by` is the Zerodha user ID (`"AB1234"`), not your app's internal user ID.
You must maintain the mapping: `zerodha_user_id → your_user_id`.

```sql
CREATE TABLE user_kite_sessions (
  zerodha_user_id VARCHAR(10) UNIQUE,
  app_user_id     UUID NOT NULL,  -- Your internal user ID
  access_token    TEXT,
  ...
);
```

---

## 14. Unhandled T+1 Settlement State

**The bug**: Allowing users to sell shares they bought today.

**Reality**: Shares bought today are in `t1_quantity` — they haven't settled yet.
Zerodha will reject the sell order with `HoldingException`.

**Fix**:
```javascript
function canSell(holding) {
  // Only settled (realised) quantity minus already-used quantity can be sold
  return holding.realised_quantity - holding.used_quantity;
}
```
