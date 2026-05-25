# Zerodha — Fundamentals

## What is Zerodha?

Zerodha is India's largest discount broker by active client count (~7 million+ active clients as of 2024).
Unlike full-service brokers (HDFC Securities, ICICI Direct), Zerodha charges zero brokerage on equity delivery
and flat ₹20 or 0.03% (whichever is lower) on intraday and F&O trades.

**Kite Connect** is Zerodha's REST + WebSocket API for:
- Building algorithmic trading systems
- Portfolio management apps
- Robo-advisors
- Research and analytics platforms
- Wealth management tools that need live market data

---

## API Products

### Kite Connect (Primary API)
The core trading API. Provides:
- Authentication (OAuth 2.0-style flow)
- Order placement / modification / cancellation
- Portfolio: holdings, positions, margins
- Market data: quotes, OHLC, historical candles
- Instruments: full exchange instrument list (CSV download)
- GTT (Good Till Triggered) orders
- Mutual funds (via Coin API)

**Pricing**: ~₹2,000/month per app. Free for Zerodha users trading with their own account (partner access).

### Kite Publisher
Embed Zerodha order forms and charts inside your website/app. The user places orders on Zerodha's
platform but the experience is embedded. No need for full Kite Connect API access.

### Historical Data API
Separate from Kite Connect — provides OHLC candle data. Costs extra beyond the base Kite Connect subscription.
Available candle intervals: minute, 3minute, 5minute, 10minute, 15minute, 30minute, 60minute, day.

---

## Key Concepts

### Instruments
Every tradable security has an **instrument token** (a unique integer) and a **tradingsymbol**.

```
RELIANCE (NSE):   instrument_token = 738561, tradingsymbol = "RELIANCE", exchange = "NSE"
NIFTY 50 (NSE):   instrument_token = 256265, tradingsymbol = "NIFTY 50", exchange = "NSE"
RELIANCE (BSE):   instrument_token = 500325, tradingsymbol = "RELIANCE", exchange = "BSE"
```

Same company can have different tokens on NSE vs BSE.
Same company's F&O instruments have separate tokens (one per strike/expiry).

**Full instruments list**: downloaded once daily as a CSV/JSON.

```
GET https://api.kite.trade/instruments           # All exchanges
GET https://api.kite.trade/instruments/NSE       # NSE only
GET https://api.kite.trade/instruments/NFO       # NSE Futures & Options
```

Download and cache this daily. It has ~200,000+ rows for all F&O instruments.

### Exchanges

| Code | Full Name | What Trades Here |
|------|-----------|-----------------|
| `NSE` | National Stock Exchange | Equity (stocks) |
| `BSE` | Bombay Stock Exchange | Equity (stocks) |
| `NFO` | NSE Futures & Options | Derivatives (NIFTY, stock F&O) |
| `BFO` | BSE Futures & Options | BSE derivatives |
| `CDS` | Currency Derivatives Segment | USD/INR, EUR/INR futures |
| `MCX` | Multi Commodity Exchange | Gold, silver, crude oil, etc. |
| `MF`  | Mutual Funds (Coin) | Direct mutual funds |

### Transaction Types
`BUY` or `SELL`. Capital letters. Always.

### Products (Position Types)

| Code | Full Name | Description |
|------|-----------|-------------|
| `CNC` | Cash and Carry | Equity delivery — held in demat overnight |
| `MIS` | Margin Intraday Square-off | Intraday — auto-squared off at 3:15 PM |
| `NRML` | Normal | F&O / commodity — overnight positions |
| `CO`  | Cover Order | Intraday + mandatory stop-loss |
| `BO`  | Bracket Order | Intraday + target + stop-loss (deprecated on Zerodha) |

### Order Types

| Code | Description |
|------|-------------|
| `MARKET` | Execute at best available price immediately |
| `LIMIT` | Execute only at specified price or better |
| `SL` | Stop-Loss Market — triggers at trigger_price, executes at market |
| `SL-M` | Stop-Loss Limit — triggers at trigger_price, executes at limit price |

### Validity

| Code | Description |
|------|-------------|
| `DAY` | Valid for the current trading day only (cancelled at EOD) |
| `IOC` | Immediate or Cancel — execute immediately, cancel unfilled portion |
| `TTL` | Time To Live — valid for a specified number of minutes (F&O only) |

---

## API Keys

Every Kite Connect app has:

| Credential | Description |
|------------|-------------|
| **api_key** | Public identifier for your app. Included in all API calls. |
| **api_secret** | Private key. Never expose in frontend. Used to generate the checksum for token exchange. |
| **access_token** | Per-user session token. Valid for one trading day (expires at midnight). |
| **request_token** | Short-lived one-time token from Zerodha's login redirect. Exchanged for access_token. |

**Critical**: `api_secret` is app-level (one secret per app).
`access_token` is user-level (one per user per day).

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Order placement | 10 requests/second |
| Quote fetch (`/quote`) | 1 request/second |
| Historical data | 3 requests/second |
| All other endpoints | 10 requests/second |
| WebSocket connections | 3 simultaneous connections per user |
| WebSocket subscriptions | 3,000 instruments per connection |

Rate limit headers are returned in API responses. Exceeding limits returns HTTP 429.

**Key pitfall**: The quote endpoint is limited to 1 req/s. For high-frequency price tracking, use KiteTicker WebSocket instead of polling the REST API.

---

## Response Format

All REST API responses follow this envelope:

```json
{
  "status": "success",
  "data": { ... }
}
```

On error:
```json
{
  "status": "error",
  "message": "Invalid api_key or access_token",
  "error_type": "TokenException",
  "data": null
}
```

### Error Types

| error_type | Cause |
|------------|-------|
| `TokenException` | Invalid or expired access_token / api_key |
| `UserException` | Account suspended, TOTP not set up |
| `OrderException` | Order rejected by exchange or risk system |
| `InputException` | Bad request parameters |
| `MarginException` | Insufficient margin for the order |
| `HoldingException` | Insufficient shares in demat for sell |
| `NetworkException` | Zerodha-side infrastructure issue |
| `GeneralException` | Catch-all for unexpected errors |

---

## Trading Hours

| Segment | Pre-Open | Regular Session | Post-Close |
|---------|----------|----------------|------------|
| NSE/BSE Equity | 9:00–9:15 AM | 9:15 AM–3:30 PM | 3:40–4:00 PM |
| NSE/BSE F&O | — | 9:15 AM–3:30 PM | — |
| MCX Commodities | — | 9:00 AM–11:30 PM | — |
| Currency (CDS) | — | 9:00 AM–5:00 PM | — |

MIS positions auto-square off: ~3:15 PM for equity, ~25 min before close for F&O.

---

## Brokerage Structure

Understanding brokerage matters when building calculators or showing users expected costs:

| Trade Type | Brokerage | STT | Exchange Charges | GST |
|------------|-----------|-----|-----------------|-----|
| Equity Delivery | **₹0** | 0.1% on buy+sell | 0.00325% | 18% on brokerage |
| Equity Intraday | ₹20 or 0.03% | 0.025% on sell | 0.00325% | 18% on brokerage |
| F&O Futures | ₹20 or 0.03% | 0.0125% on sell | 0.002% | 18% on brokerage |
| F&O Options | ₹20 per order | 0.0625% on sell (premium) | 0.053% | 18% on brokerage |

STT = Securities Transaction Tax (paid to government, not Zerodha).
Zerodha's brokerage calculator: `https://zerodha.com/brokerage-calculator`
