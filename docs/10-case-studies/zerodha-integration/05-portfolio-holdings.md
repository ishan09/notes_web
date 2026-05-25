# Portfolio, Holdings & Margins

## Holdings vs Positions

| Concept | What It Is | When It Applies |
|---------|-----------|-----------------|
| **Holdings** | Shares held in demat (long-term) | Equity delivery (CNC) bought previously |
| **Positions** | Open intraday or F&O positions | MIS, NRML — reset to zero by EOD (for MIS) or on expiry |

---

## Holdings

Holdings are equity shares sitting in the user's demat account.
They persist across days until explicitly sold.

```javascript
const holdings = await kite.getHoldings();

/*
[
  {
    "tradingsymbol": "RELIANCE",
    "exchange": "NSE",
    "instrument_token": 738561,
    "isin": "INE002A01018",        // SEBI ISIN — unique per company
    "product": "CNC",
    "price": 2200.00,              // Average buy price
    "quantity": 10,                // Total shares held
    "used_quantity": 0,            // Pledged/locked quantity
    "t1_quantity": 0,              // Shares bought today — not yet settled (T+1)
    "realised_quantity": 10,       // Settled shares
    "authorised_quantity": 0,
    "authorised_date": null,
    "opening_quantity": 10,
    "short_quantity": 0,
    "collateral_quantity": 0,
    "collateral_type": null,
    "discrepancy": false,
    "average_price": 2200.00,      // Weighted average cost
    "last_price": 2450.50,         // Current market price
    "close_price": 2435.50,        // Previous day's close
    "pnl": 2505.00,                // Unrealised P&L (10 × (2450.50 - 2200.00))
    "day_change": 15.00,           // LTP - close_price
    "day_change_percentage": 0.616
  }
]
*/
```

### T+1 Settlement Note
Shares bought today (`t1_quantity`) cannot be sold until settlement (T+1 day).
If you try to sell T+1 shares, you get a `HoldingException`.
Always check `realised_quantity` (not `quantity`) for sellable shares.

```javascript
function getSellableQuantity(holding) {
  return holding.realised_quantity - holding.used_quantity;
}
```

---

## Positions

Positions cover intraday (MIS) and overnight F&O/commodity (NRML) trades.

```javascript
const positions = await kite.getPositions();

/*
{
  "net": [...],    // Net positions (buys - sells for the day per instrument)
  "day": [...]     // Day positions (all buy/sell legs separately)
}
*/

// Net positions array:
[
  {
    "tradingsymbol": "NIFTY23NOV18000CE",
    "exchange": "NFO",
    "instrument_token": 11806722,
    "product": "NRML",
    "quantity": 50,              // Net quantity (positive = long, negative = short)
    "overnight_quantity": 0,     // Quantity carried from previous day
    "multiplier": 1,
    "average_price": 120.50,
    "close_price": 0,
    "last_price": 145.00,
    "value": 6025.00,            // Cost (quantity × average_price)
    "pnl": 1225.00,              // Unrealised P&L
    "m2m": 1225.00,              // Mark-to-market P&L
    "unrealised": 1225.00,
    "realised": 0,               // Realised P&L from completed buy-sell pairs
    "buy_quantity": 50,
    "buy_price": 120.50,
    "buy_value": 6025.00,
    "sell_quantity": 0,
    "sell_price": 0,
    "sell_value": 0,
    "day_buy_quantity": 50,
    "day_buy_price": 120.50,
    "day_buy_value": 6025.00,
    "day_sell_quantity": 0,
    "day_sell_price": 0,
    "day_sell_value": 0
  }
]
```

### Converting Position to Delivery (CNC)

MIS positions auto-square-off at 3:15 PM. To convert an intraday position to delivery:

```javascript
await kite.convertPosition({
  exchange: 'NSE',
  tradingsymbol: 'RELIANCE',
  transaction_type: 'BUY',   // Original transaction type
  position_type: 'day',      // day or overnight
  quantity: 5,
  old_product: 'MIS',
  new_product: 'CNC',
});
```

Conversion requires sufficient margin/funds for CNC delivery. Conversion is only possible during market hours.

---

## Margins

Margins show how much capital is available and how much is used.

```javascript
// Equity and commodity margins
const margins = await kite.getMargins();

/*
{
  "equity": {
    "enabled": true,
    "net": 50000.00,             // Total available margin
    "available": {
      "adhoc_margin": 0,
      "cash": 50000.00,          // Cash in account
      "opening_balance": 50000.00,
      "live_balance": 50000.00,
      "collateral": 0,           // Value of pledged stocks
      "intraday_payin": 0
    },
    "utilised": {
      "debits": 0,
      "exposure": 0,
      "m2m_realised": 0,
      "m2m_unrealised": 0,
      "option_premium": 0,
      "payout": 0,
      "span": 0,
      "holding_sales": 0,
      "turnover": 0,
      "liquid_collateral": 0,
      "stock_collateral": 0,
      "delivery": 0
    }
  },
  "commodity": { ... }  // Same structure for MCX
}
```

### Calculate Margin Required Before Placing Order

```javascript
// POST /margins/orders — basket margin calculation
const marginRequired = await kite.orderMargins([
  {
    exchange: 'NFO',
    tradingsymbol: 'NIFTY23NOV18000CE',
    transaction_type: 'BUY',
    variety: 'regular',
    product: 'NRML',
    order_type: 'LIMIT',
    quantity: 50,
    price: 120.50,
  }
]);

/*
[
  {
    "type": "NFO",
    "tradingsymbol": "NIFTY23NOV18000CE",
    "exchange": "NFO",
    "span": 0,
    "exposure": 0,
    "option_premium": 6025.00,  // For option buys, premium is the margin
    "additional": 0,
    "bo": 0,
    "cash": 0,
    "var": 0,
    "pnl": { "realised": 0, "unrealised": 0 },
    "leverage": 1,
    "total": 6025.00             // Total margin required
  }
]
*/
```

Pre-check margin before order placement in production algo systems:

```javascript
async function placeOrderWithMarginCheck(kite, orderParams) {
  const [marginRequired] = await kite.orderMargins([orderParams]);
  const { equity } = await kite.getMargins();

  if (equity.net < marginRequired.total) {
    throw new Error(
      `Insufficient margin. Required: ${marginRequired.total}, Available: ${equity.net}`
    );
  }

  return await kite.placeOrder('regular', orderParams);
}
```

---

## P&L Calculation

Zerodha's API gives you raw position data. Computing overall P&L:

```javascript
function calculatePortfolioSummary(holdings, positions) {
  // Holdings unrealised P&L
  const holdingsPnl = holdings.reduce((sum, h) => {
    return sum + (h.last_price - h.average_price) * h.quantity;
  }, 0);

  // Holdings day change
  const holdingsDayChange = holdings.reduce((sum, h) => {
    return sum + h.day_change * h.quantity;
  }, 0);

  // Positions unrealised P&L
  const positionsPnl = positions.net.reduce((sum, p) => {
    return sum + p.pnl;
  }, 0);

  // Positions realised P&L (closed positions today)
  const realisedPnl = positions.net.reduce((sum, p) => {
    return sum + p.realised;
  }, 0);

  return {
    holdingsPnl: holdingsPnl.toFixed(2),
    holdingsDayChange: holdingsDayChange.toFixed(2),
    positionsUnrealised: positionsPnl.toFixed(2),
    positionsRealised: realisedPnl.toFixed(2),
    totalUnrealised: (holdingsPnl + positionsPnl).toFixed(2),
  };
}
```

**Important**: Use `BigDecimal` (Java) or integer paise arithmetic (JavaScript) for any real financial P&L that feeds into billing or tax reporting. The above `toFixed(2)` pattern is display-only.

---

## Funds (Account Balance)

```javascript
// Same as getMargins but endpoint alias
const equity = (await kite.getMargins()).equity;
console.log(`Available funds: ₹${equity.net}`);
console.log(`Cash: ₹${equity.available.cash}`);
console.log(`Collateral (pledged stocks): ₹${equity.available.collateral}`);
```
