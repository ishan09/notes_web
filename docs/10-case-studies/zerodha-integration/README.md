# Zerodha Integration — Interview Prep & Production Guide

This folder covers Zerodha's Kite Connect API integration from fundamentals to production-grade systems.
Designed for interviews at mid-to-senior level at fintech companies, brokerages, and wealth-tech startups.
Zerodha is India's largest stockbroker by active clients — commonly asked about in Indian fintech interviews.

## Index

| File | Topics |
|------|--------|
| [01-zerodha-fundamentals.md](./01-zerodha-fundamentals.md) | Kite Connect, API keys, rate limits, trading terminology |
| [02-authentication-flow.md](./02-authentication-flow.md) | Login flow, request tokens, access tokens, session management |
| [03-order-management.md](./03-order-management.md) | Place/modify/cancel orders, order types, GTT, basket orders |
| [04-market-data.md](./04-market-data.md) | Quotes, OHLC, historical data, WebSocket ticker (KiteTicker) |
| [05-portfolio-holdings.md](./05-portfolio-holdings.md) | Holdings, positions, margins, funds, P&L calculation |
| [06-webhooks-postbacks.md](./06-webhooks-postbacks.md) | Order postbacks, handling state transitions, idempotency |
| [07-websocket-streaming.md](./07-websocket-streaming.md) | KiteTicker, subscribe/unsubscribe, reconnection, modes |
| [08-security.md](./08-security.md) | Checksum verification, token storage, API key protection |
| [09-production-pitfalls.md](./09-production-pitfalls.md) | Rate limits, session expiry, market hours, exchange errors |
| [10-testing.md](./10-testing.md) | Sandbox, test credentials, mock strategies, E2E checklist |
| [11-glossary.md](./11-glossary.md) | Zerodha objects, Indian stock market terms, exchange codes |

## Quick Mental Model

```
User wants to trade
    → Your app redirects user to Zerodha login (Kite Connect OAuth-style)
    → User logs in on Zerodha's page — gets request_token in redirect
    → Your backend exchanges request_token + checksum → access_token
    → Your app uses access_token for all subsequent API calls
    → Place order → Zerodha returns order_id
    → Listen to postback URL for order status updates (filled, rejected, cancelled)
    → Stream live prices via KiteTicker WebSocket (subscribe to instrument tokens)
```

The key insight: **you never handle the user's Zerodha credentials**.
Zerodha's login flow handles authentication. You only get a session token.

## Zerodha Product Ecosystem

| Product | Purpose |
|---------|---------|
| **Kite** | Retail trading platform (web + mobile) |
| **Kite Connect** | API for algorithmic trading and fintech apps |
| **Kite Publisher** | Embed Kite charts/order forms in 3rd-party apps |
| **Coin** | Direct mutual fund platform |
| **Varsity** | Free financial education (not an API) |
| **Console** | Reporting and analytics for traders |
| **Sensibull** | Options trading platform (Zerodha subsidiary) |
| **Smallcase** | Thematic stock basket investing (Zerodha-backed) |
| **Streak** | No-code algo trading builder (Zerodha-backed) |
