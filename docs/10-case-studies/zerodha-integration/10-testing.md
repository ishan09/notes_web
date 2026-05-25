# Testing

## Test Environment

Zerodha provides a **sandbox/test environment** via `kite.trade` for API testing.
Key differences from Stripe/Razorpay: Zerodha's sandbox **does not place real orders**
but also **does not simulate real market responses** — responses are static/mocked.

For realistic testing, most algo traders use **paper trading** on a dedicated test account
with the live API but no real money (Zerodha doesn't have official paper trading support
in the API — third-party solutions like Streak are used for this).

---

## Test Credentials Setup

1. Create a Kite Connect app at `https://developers.kite.trade`
2. Enable "Enable test mode" in app settings
3. Use `api_key` and `api_secret` from the test app
4. Sandbox base URL: `https://api.kite.trade` (same — but with test key, orders don't go to exchange)

---

## Mocking the Kite Connect SDK

For unit tests, mock the SDK rather than making real API calls:

```javascript
// __mocks__/kiteconnect.js
const KiteConnect = jest.fn().mockImplementation(() => ({
  setAccessToken: jest.fn(),
  getProfile: jest.fn().mockResolvedValue({
    user_id: 'AB1234',
    user_name: 'Test User',
    email: 'test@example.com',
    broker: 'ZERODHA',
    exchanges: ['NSE', 'BSE', 'NFO'],
    products: ['CNC', 'MIS', 'NRML'],
    order_types: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
  }),
  placeOrder: jest.fn().mockResolvedValue({ order_id: '221012000099999' }),
  getOrders: jest.fn().mockResolvedValue([]),
  getHoldings: jest.fn().mockResolvedValue([]),
  getPositions: jest.fn().mockResolvedValue({ net: [], day: [] }),
  getMargins: jest.fn().mockResolvedValue({
    equity: { net: 100000, available: { cash: 100000 }, utilised: {} },
  }),
  getQuote: jest.fn().mockResolvedValue({}),
  getHistoricalData: jest.fn().mockResolvedValue([]),
  generateSession: jest.fn().mockResolvedValue({
    access_token: 'mock_access_token',
    public_token: 'mock_public_token',
    user_id: 'AB1234',
  }),
}));

module.exports = { KiteConnect };
```

---

## Unit Test Examples

### Test: Checksum Generation

```javascript
const crypto = require('crypto');

describe('generateChecksum', () => {
  test('produces correct SHA-256 hex', () => {
    const apiKey = 'test_api_key';
    const requestToken = 'test_request_token';
    const apiSecret = 'test_api_secret';

    const checksum = crypto
      .createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex');

    // Verify it's a 64-char hex string
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);

    // Verify deterministic
    const checksum2 = crypto
      .createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex');
    expect(checksum).toBe(checksum2);
  });
});
```

### Test: Order Validation

```javascript
describe('validateOrderRequest', () => {
  test('rejects invalid tick size', async () => {
    await expect(
      validateOrderRequest({
        exchange: 'NSE',
        tradingsymbol: 'RELIANCE',
        price: 2451.37,  // Invalid tick — not multiple of 0.05
        quantity: 10,
        product: 'CNC',
      })
    ).rejects.toThrow('Price must be a multiple of tick size');
  });

  test('rejects invalid F&O lot size', async () => {
    await expect(
      validateOrderRequest({
        exchange: 'NFO',
        tradingsymbol: 'NIFTY23NOV18000CE',
        price: 120.50,
        quantity: 25,  // Invalid — lot size is 50
        product: 'NRML',
      })
    ).rejects.toThrow('Quantity must be multiple of lot size');
  });

  test('rejects order exceeding value limit', async () => {
    await expect(
      validateOrderRequest({
        exchange: 'NSE',
        tradingsymbol: 'RELIANCE',
        price: 2450.00,
        quantity: 1000,  // ₹24.5 lakh — over ₹5 lakh limit
        product: 'CNC',
      })
    ).rejects.toThrow('Order value exceeds limit');
  });
});
```

### Test: Postback Handler Idempotency

```javascript
describe('handleOrderUpdate', () => {
  test('processes COMPLETE postback exactly once', async () => {
    const fulfillOrder = jest.fn();

    const postback = {
      order_id: '221012000012345',
      status: 'COMPLETE',
      filled_quantity: 10,
      average_price: 2448.70,
    };

    // First call
    await handleOrderUpdate(postback, { fulfillOrder });
    // Second call with same data
    await handleOrderUpdate(postback, { fulfillOrder });

    // Should only fulfill once
    expect(fulfillOrder).toHaveBeenCalledTimes(1);
  });
});
```

---

## Test Data

### Test Instrument Tokens (Stable)

| Symbol | Exchange | Token |
|--------|----------|-------|
| NIFTY 50 index | NSE | 256265 |
| BANKNIFTY index | NSE | 260105 |
| RELIANCE | NSE | 738561 |
| INFY | NSE | 408065 |
| TCS | NSE | 2953217 |
| HDFC | NSE | 340481 |

These tokens are stable (equity) — they don't change with expiries.

### Simulating Order Postbacks in Tests

```javascript
// POST fake postback to your test server
await request(app)
  .post('/kite/postback')
  .send({
    order_id: '221012000099999',
    status: 'COMPLETE',
    filled_quantity: 10,
    average_price: 2448.70,
    tradingsymbol: 'RELIANCE',
    exchange: 'NSE',
    transaction_type: 'BUY',
    product: 'CNC',
  })
  .expect(200);
```

---

## E2E Test Checklist (Pre-Production)

### Authentication
- [ ] Login redirect goes to correct Zerodha URL with `api_key`
- [ ] request_token is received in redirect URL
- [ ] Checksum is computed correctly (SHA-256)
- [ ] Token exchange succeeds and returns access_token
- [ ] access_token is stored encrypted
- [ ] Expired token correctly triggers re-login prompt
- [ ] Logout deletes access_token from Zerodha and your DB

### Order Management
- [ ] MARKET order placed successfully in test mode
- [ ] LIMIT order placed with correct price rounding to tick
- [ ] F&O order placed with correct lot size multiple
- [ ] Invalid tick price is rejected before sending to Kite
- [ ] Invalid lot size is rejected before sending to Kite
- [ ] Order modify works for OPEN orders
- [ ] Order cancel works for OPEN orders
- [ ] Modifying COMPLETE order returns meaningful error

### Postbacks
- [ ] Postback endpoint returns 200 immediately
- [ ] Order state updated correctly on COMPLETE postback
- [ ] Order state updated correctly on REJECTED postback
- [ ] Duplicate postbacks are idempotent (no double-processing)
- [ ] Partial fill postbacks tracked correctly

### Market Data
- [ ] REST quote returns expected fields
- [ ] KiteTicker connects and receives ticks
- [ ] KiteTicker reconnects after disconnection
- [ ] Tick processing stops outside market hours

### Portfolio
- [ ] Holdings load correctly
- [ ] T+1 quantity cannot be sold (canSell returns 0 for t1_quantity)
- [ ] Position P&L calculated correctly
- [ ] Margin check prevents orders without sufficient funds

### GTT
- [ ] Single GTT placed with correct trigger
- [ ] OCO GTT placed with two triggers
- [ ] GTT modify updates trigger values
- [ ] GTT delete removes the order

---

## Performance Testing

For algo systems: test your order-to-fill latency end-to-end.

```javascript
// Measure round-trip: placeOrder → postback received
const start = Date.now();
const orderId = await kite.placeOrder('regular', {
  exchange: 'NSE',
  tradingsymbol: 'NIFTY BEES',  // Liquid ETF — good for latency tests
  transaction_type: 'BUY',
  quantity: 1,
  product: 'MIS',
  order_type: 'MARKET',
  validity: 'IOC',
});

// Wait for postback (via your own webhook receiver)
const filled = await waitForOrderCompletion(orderId, 5000);
const latency = Date.now() - start;
console.log(`Order fill latency: ${latency}ms`);
```

Typical order-to-postback latency on Zerodha: 200–800ms.
For HFT (requires co-location at exchange) — not available through Kite Connect.
Kite Connect is not suitable for strategies requiring sub-millisecond execution.
