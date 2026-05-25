# Market Data

## Overview

Kite Connect provides two ways to get market data:

| Method | Use Case | Latency | Cost |
|--------|----------|---------|------|
| REST `/quote` | Snapshot of 1–500 instruments | ~200ms round-trip | 1 req/sec limit |
| KiteTicker WebSocket | Real-time streaming of prices | ~50–200ms push | 3 connections, 3000 instruments |
| Historical API | OHLC candles (1min to daily) | N/A | Separate billing |

**Rule of thumb**: Use REST for initial page load / order confirmation. Use WebSocket for live dashboards and algo signals.

---

## REST Quote API

### Full Quote (LTP + OHLC + depth)

```javascript
// GET /quote?i=NSE:RELIANCE&i=NSE:INFY
const quotes = await kite.getQuote(['NSE:RELIANCE', 'NSE:INFY']);

/*
{
  "NSE:RELIANCE": {
    "instrument_token": 738561,
    "timestamp": "2023-11-10 10:30:00",
    "last_price": 2450.50,
    "last_quantity": 5,
    "last_trade_time": "2023-11-10 10:29:58",
    "average_price": 2448.30,
    "volume": 1234567,
    "buy_quantity": 45000,
    "sell_quantity": 38000,
    "ohlc": {
      "open": 2440.00,
      "high": 2468.00,
      "low": 2432.00,
      "close": 2435.50   // Previous day's close
    },
    "net_change": 15.00,
    "oi": 0,             // Open interest (non-zero for F&O)
    "oi_day_high": 0,
    "oi_day_low": 0,
    "depth": {
      "buy": [
        { "quantity": 100, "price": 2450.00, "orders": 3 },
        { "quantity": 250, "price": 2449.50, "orders": 8 },
        // ... 5 levels
      ],
      "sell": [
        { "quantity": 75, "price": 2451.00, "orders": 2 },
        // ... 5 levels
      ]
    }
  }
}
*/
```

### LTP Only (Lightweight)

```javascript
// Returns only last_price — much smaller payload
const ltp = await kite.getLTP(['NSE:RELIANCE', 'BSE:RELIANCE']);
// { "NSE:RELIANCE": { "instrument_token": 738561, "last_price": 2450.50 } }
```

### OHLC Only

```javascript
const ohlc = await kite.getOHLC(['NSE:RELIANCE']);
// { "NSE:RELIANCE": { "instrument_token": 738561, "last_price": 2450.50, "ohlc": { ... } } }
```

**Max instruments per REST quote call**: 500.
**Rate limit**: 1 request/second — do NOT poll for live prices with REST.

---

## Historical Data (Candles)

```javascript
// GET /instruments/historical/{instrument_token}/{interval}
const candles = await kite.getHistoricalData(
  738561,           // instrument_token for NSE:RELIANCE
  '2023-01-01',    // from date
  '2023-11-10',    // to date
  'day',           // interval
  false,           // continuous (for expired F&O contracts)
  false            // oi (include open interest column)
);

/*
[
  {
    "date": "2023-01-02T00:00:00+0530",
    "open": 2562.00,
    "high": 2590.00,
    "low": 2545.00,
    "close": 2580.00,
    "volume": 4234567,
    "oi": 0
  },
  ...
]
*/
```

### Available Intervals

| Interval | Description | Max Date Range per Call |
|----------|-------------|------------------------|
| `minute` | 1-minute candles | 60 days |
| `3minute` | 3-minute candles | 100 days |
| `5minute` | 5-minute candles | 100 days |
| `10minute` | 10-minute candles | 100 days |
| `15minute` | 15-minute candles | 200 days |
| `30minute` | 30-minute candles | 200 days |
| `60minute` | 1-hour candles | 400 days |
| `day` | Daily OHLC | 2000 days (~5.5 years) |

For longer date ranges, paginate:

```javascript
async function getFullHistory(token, fromDate, toDate, interval) {
  const MAX_DAYS = { minute: 60, day: 2000 };
  const chunkSize = MAX_DAYS[interval] || 100;
  const results = [];

  let current = new Date(fromDate);
  const end = new Date(toDate);

  while (current < end) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + chunkSize);
    const effectiveEnd = chunkEnd < end ? chunkEnd : end;

    const candles = await kite.getHistoricalData(
      token,
      current.toISOString().split('T')[0],
      effectiveEnd.toISOString().split('T')[0],
      interval
    );
    results.push(...candles);

    current = new Date(effectiveEnd);
    current.setDate(current.getDate() + 1);
    await new Promise(r => setTimeout(r, 400));  // Respect 3 req/sec limit
  }

  return results;
}
```

### Historical Data for Expired F&O

F&O instruments expire. To get historical data for an expired contract, use `continuous: true`
and pass the instrument token of the active contract — Zerodha chains the data automatically.

---

## Instruments List

The full list of all tradable instruments (200,000+ for NFO including all strikes/expiries).
Download once at day start and cache locally.

```javascript
// Download and parse
const allInstruments = await kite.getInstruments();        // All exchanges
const nfoInstruments = await kite.getInstruments('NFO');   // NFO only

/*
Each instrument:
{
  instrument_token: 738561,
  exchange_token: 2886,
  tradingsymbol: "RELIANCE",
  name: "RELIANCE INDUSTRIES",
  last_price: 0,              // Always 0 in instruments list
  expiry: "",                 // Non-empty for F&O
  strike: 0,                  // Non-empty for options
  tick_size: 0.05,            // Minimum price movement
  lot_size: 1,                // 1 for equity, varies for F&O
  instrument_type: "EQ",      // EQ, FUT, CE, PE
  segment: "NSE",
  exchange: "NSE"
}
*/
```

### Finding an Option Contract

```javascript
// Find NIFTY 18000 CE expiring nearest to a target date
function findOption(instruments, underlying, strike, optionType, targetExpiry) {
  return instruments
    .filter(i =>
      i.name === underlying &&
      i.strike === strike &&
      i.instrument_type === optionType &&
      i.expiry >= targetExpiry
    )
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0];
}

const option = findOption(nfoInstruments, 'NIFTY', 18000, 'CE', '2023-11-01');
console.log(option.tradingsymbol);  // NIFTY23NOV18000CE
console.log(option.instrument_token);
```

---

## Tick Size

Every instrument has a minimum price movement (`tick_size`). Orders must be placed at valid price ticks.

| Segment | Typical Tick Size |
|---------|------------------|
| NSE/BSE equity (price ≥ ₹10) | ₹0.05 |
| NSE/BSE equity (price < ₹10) | ₹0.01 |
| NIFTY options | ₹0.05 |
| BANKNIFTY options | ₹0.10 |
| Futures | ₹0.05 |
| MCX (Gold) | ₹1.00 |

```javascript
function roundToTick(price, tickSize) {
  return Math.round(price / tickSize) * tickSize;
}

// Price: 2451.37, tick: 0.05 → 2451.35
const validPrice = roundToTick(2451.37, 0.05);
```

Never use floating point division for tick rounding — use integer arithmetic:

```javascript
function roundToTickSafe(price, tickSize) {
  const pricePaise = Math.round(price * 100);
  const tickPaise = Math.round(tickSize * 100);
  return (Math.round(pricePaise / tickPaise) * tickPaise) / 100;
}
```
