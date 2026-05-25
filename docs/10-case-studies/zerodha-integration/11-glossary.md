# Glossary — Zerodha & Indian Stock Markets

General financial/payment terms (settlement, idempotency, HMAC, etc.) are covered in the
payment gateway glossaries. This file focuses on stock market, trading, and Zerodha-specific terms.

---

## Zerodha-Specific Concepts

**Kite Connect** [Zerodha]
Zerodha's REST + WebSocket API platform for algorithmic trading and fintech integrations.
Subscription-based (~₹2,000/month per app). Provides order management, market data, portfolio data.

**KiteTicker** [Zerodha]
Zerodha's WebSocket API for real-time market data streaming. Supports up to 3 simultaneous
connections per user, 3,000 instruments per connection. Three data modes: `ltp`, `quote`, `full`.

**Kite Publisher** [Zerodha]
An embed product allowing third-party websites to display Zerodha's charts and order forms in an
iframe. Users place orders on Zerodha's platform embedded in your site. No full Kite Connect needed.

**access_token** [Zerodha]
Per-user session token valid for one trading day (expires at midnight IST). Used in the
`Authorization: token api_key:access_token` header for all API calls. There is no refresh token —
users must re-authenticate daily.

**request_token** [Zerodha]
A one-time short-lived token received in the redirect URL after the user logs in via Zerodha's
login page. Must be exchanged for an access_token using a server-side checksum call. Single use only.

**Checksum (Kite)** [Zerodha]
SHA-256 hash of `api_key + request_token + api_secret`. Used to verify the token exchange request.
This is the only cryptographic verification step in Kite Connect — postbacks have no signature.

**Postback URL** [Zerodha]
Zerodha's term for webhook. An HTTP POST sent to your configured URL on every order status change.
Unlike Stripe/Razorpay webhooks, postbacks have no HMAC signature. Verify by re-fetching from API.

**instrument_token** [Zerodha]
A unique integer identifying a tradable instrument. Used for WebSocket subscriptions and historical
data requests. Stable for equity (doesn't change), but new tokens are assigned for each F&O
contract expiry. Same company has different tokens on NSE vs BSE.

**tradingsymbol** [Zerodha]
The text identifier for an instrument. For equity: `"RELIANCE"`. For F&O: `"NIFTY23NOV18000CE"`.
Never construct F&O tradingsymbols manually — always look up from instruments list.

**GTT (Good Till Triggered)** [Zerodha]
A persistent order that activates when the market price hits a specified trigger. Unlike regular
orders (valid for one day), GTTs persist until triggered, cancelled, or expired (1 year). Two types:
single (one trigger) and two-leg/OCO (two triggers, one cancels the other when fired).

**OCO (One Cancels Other)** [Zerodha]
A two-leg GTT where two triggers are set (e.g., target price and stop-loss). When one leg triggers
and places an order, the other leg is automatically cancelled.

**Coin** [Zerodha]
Zerodha's direct mutual fund platform. Zero commission. Integrated with Kite Connect API for
programmatic mutual fund investments.

**Console** [Zerodha]
Zerodha's reporting and analytics portal for traders. Shows P&L, tax reports, tradebook, ledger.
Not an API product — web UI only.

**Sensibull** [Zerodha]
Zerodha-acquired options trading and analysis platform. Provides options chain, strategy builder,
and virtual trading. Has its own API separate from Kite Connect.

**Streak** [Zerodha]
No-code algo trading platform integrated with Kite. Allows building strategies without code.
Uses Kite Connect behind the scenes.

**RazorpayX vs Zerodha**
Note for interviews: Zerodha (brokerage + trading API) is often compared to Razorpay (payment gateway)
but they serve entirely different use cases. Zerodha's API is for securities trading.
Razorpay's API is for accepting payments from customers.

---

## Order & Trading Terms

**CNC (Cash and Carry)** [Zerodha]
Product type for equity delivery trades. Shares are credited to/debited from your demat account.
Held overnight (or long-term). Zero brokerage on Zerodha.

**MIS (Margin Intraday Square-off)** [Zerodha]
Product type for intraday equity trades. Position must be squared off within the same trading day.
Zerodha auto-squares off any remaining MIS positions at ~3:15 PM.

**NRML (Normal)** [Zerodha]
Product type for F&O and commodity overnight positions. Can be held until contract expiry.

**CO (Cover Order)** [Zerodha]
An intraday order with a mandatory stop-loss. Provides higher leverage in exchange for mandatory risk control.

**Square Off**
Closing an open position by taking the opposite trade. BUY position is squared off by SELL.
SELL (short) position is squared off by BUY. Zerodha auto-squares MIS positions at EOD.

**Open Interest (OI)**
The total number of outstanding F&O contracts (not yet settled). High OI = active interest in
that strike/expiry. Used to gauge market sentiment. Available in `full` KiteTicker mode.

**Lot Size**
The minimum number of units in an F&O contract. NIFTY options lot size = 50.
Quantity in F&O orders must be a multiple of lot size. SEBI revises lot sizes quarterly.

**Tick Size**
The minimum price movement for an instrument. Equity: ₹0.05. NIFTY options: ₹0.05.
Orders must be priced at valid tick increments — invalid prices are rejected.

**Circuit Filter / Circuit Breaker**
Price band within which a stock can trade on a given day. Upper circuit = max price. Lower circuit = min price.
Orders outside the band are rejected. Individual stock circuits: 2%, 5%, 10%, 20% bands set by exchanges.
Index circuits: 10%, 15%, 20% — halt entire trading if hit.

**Pre-Open Session**
9:00 AM – 9:15 AM. Order matching for price discovery. Orders can be placed but are not executed
until 9:15 AM when the regular session opens. Call auction mechanism determines the opening price.

**T+1 Settlement**
As of January 2023, India switched to T+1 equity settlement (from T+2). Shares and funds settle
the next trading day. Shares bought today are in `t1_quantity` and cannot be sold until settlement.

**BTST (Buy Today Sell Tomorrow)**
Selling shares bought yesterday before they settle. Possible because you have delivery contract,
but carries risk if shares don't come to your demat on time.

**Delivery vs Intraday**
Delivery = CNC = hold shares in demat. Intraday = MIS = must close same day.
Zero brokerage for delivery on Zerodha; ₹20/order for intraday.

---

## Indian Stock Market Structure

**NSE (National Stock Exchange)**
India's primary stock exchange by volume. Index: NIFTY 50. Largest F&O market in the world by number of contracts.

**BSE (Bombay Stock Exchange)**
Asia's oldest stock exchange. Index: SENSEX (30 companies). Most stocks are listed on both NSE and BSE.

**NFO (NSE Futures & Options)**
Exchange segment for NSE derivatives (NIFTY, BANKNIFTY, and stock F&O).

**MCX (Multi Commodity Exchange)**
India's primary commodity derivatives exchange. Trades gold, silver, crude oil, natural gas, base metals.

**NIFTY 50**
NSE's benchmark index of the 50 largest and most liquid Indian companies. Widely used F&O underlying.
NIFTY options are the world's most-traded options by contract volume.

**BANKNIFTY**
NSE index of the 12 most liquid banking stocks. Popular F&O instrument — weekly and monthly expiries.
High volatility compared to NIFTY.

**SENSEX**
BSE's benchmark index of 30 large-cap stocks. BSE's equivalent of NIFTY 50.

**SEBI (Securities and Exchange Board of India)**
India's capital markets regulator. Equivalent of SEC (US) or FCA (UK). Sets rules for exchanges,
brokers, mutual funds, and algo trading platforms.

**ISIN (International Securities Identification Number)**
A 12-character alphanumeric code uniquely identifying a security globally. INE002A01018 = Reliance.
Useful for cross-exchange reconciliation (same ISIN on NSE and BSE).

**Demat Account**
Electronic account holding securities (shares, bonds, ETFs). All delivery purchases are credited here.
Run by depositories: NSDL and CDSL. Linked to your Zerodha account.

**NSDL / CDSL**
National Securities Depository Limited and Central Depository Services Limited. The two depositories
in India where demat accounts are held. Zerodha clients are CDSL-linked primarily.

**Depository Participant (DP)**
Brokers (like Zerodha) act as DPs — intermediaries between you and the depository (NSDL/CDSL).

**CDSL TPIN / e-DIS**
When selling delivery shares online, CDSL requires you to authorize the transfer from your demat.
Done via TPIN (a 6-digit PIN) or e-DIS (CDSL's authorization portal). This is why selling holdings
requires an extra authorization step that selling intraday positions doesn't.

**MDR / STT / CTT**
Charges on trades:
- **STT (Securities Transaction Tax)**: Government tax on buy/sell. 0.1% delivery, 0.025% intraday sell, etc.
- **CTT (Commodity Transaction Tax)**: Like STT but for MCX commodity trades.
- **MDR** is not applicable in stock trading context (used in payment gateway context for card fees).

**Margin / SPAN Margin**
For F&O trades, you don't pay the full contract value — only a margin (typically 10–20%).
SPAN (Standard Portfolio Analysis of Risk) is the exchange-mandated minimum margin.
Exposure margin is an additional buffer Zerodha requires on top of SPAN.

**Mark to Market (MTM)**
Daily settlement of F&O P&L. If your futures position has a loss at end of day, the loss is
debited from your account overnight. If gain, it's credited. Prevents accumulated losses.

**Option Greeks**
Delta, Gamma, Theta, Vega, Rho. Mathematical measures of how an option's price changes relative
to various factors. Not returned by Kite Connect API — must be calculated or fetched from Sensibull/other.

**IV (Implied Volatility)**
The market's expectation of future volatility, derived from option prices. High IV = expensive options.
Not directly in Kite API — calculated from option prices using Black-Scholes model.

**PCR (Put-Call Ratio)**
Ratio of put OI to call OI. Market sentiment indicator. PCR > 1 = more puts = bearish sentiment.
Not in Kite API — calculated from OI data.

**FII / DII**
Foreign Institutional Investors and Domestic Institutional Investors. Their net buy/sell activity
is published by NSE/BSE daily and is a key market sentiment indicator.

**Expiry**
F&O contracts expire on specific dates. NSE weekly options expire every Thursday.
Monthly contracts expire on the last Thursday of the month.
After expiry, all unexercised options become worthless; futures are settled at the final settlement price.
