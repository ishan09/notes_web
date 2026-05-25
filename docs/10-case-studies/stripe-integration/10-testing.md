# Testing Stripe Integrations

## Test vs Live Mode

Everything in Stripe has a test mode. Test mode:
- Accepts test card numbers (not real cards)
- No real money moves
- Completely isolated from live data
- Uses `pk_test_` and `sk_test_` keys

---

## Test Cards

### Basic Test Cards

| Card Number | Result |
|------------|--------|
| `4242 4242 4242 4242` | Visa — always succeeds |
| `5555 5555 5555 4444` | Mastercard — always succeeds |
| `3782 822463 10005` | Amex — always succeeds |
| `4000 0566 5566 5556` | Visa debit — always succeeds |

Use any future expiry date and any 3-digit CVV.

### Decline Test Cards

| Card Number | Decline Reason |
|------------|----------------|
| `4000 0000 0000 0002` | `card_declined` (generic) |
| `4000 0000 0000 9995` | `insufficient_funds` |
| `4000 0000 0000 0069` | `expired_card` |
| `4000 0000 0000 0127` | `incorrect_cvc` |
| `4000 0000 0000 0119` | `processing_error` |

### 3D Secure Test Cards

| Card Number | 3DS Behavior |
|------------|--------------|
| `4000 0027 6000 3184` | Always requires 3DS authentication |
| `4000 0025 0000 3155` | Supports 3DS (may or may not require it) |
| `4000 0082 6000 3178` | 3DS required, authentication fails |

### International Test Cards

| Card Number | Country |
|------------|---------|
| `4000 0003 6000 0006` | Australia |
| `4000 0007 6000 0002` | France |
| `4000 0082 6000 0000` | GB/UK |
| `4000 0001 2000 0003` | Japan |

---

## Testing Webhooks Locally

### Stripe CLI (Standard Approach)

```bash
# Install
brew install stripe/stripe-cli/stripe

# Authenticate
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Output shows:
# > Ready! Your webhook signing secret is whsec_test_ABC123 (^C to quit)
# Use this secret (not your Dashboard secret) for local testing
```

```bash
# Trigger specific events for testing
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger checkout.session.completed
```

### Custom Event Data

```bash
# Override specific fields in triggered events
stripe trigger payment_intent.succeeded \
  --override payment_intent:amount=5000 \
  --override payment_intent:currency=eur
```

---

## Unit Testing Stripe Code

### Mocking the Stripe SDK

```javascript
// jest
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      update: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      update: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// In your test
const stripe = require('stripe')();

describe('createPaymentIntent', () => {
  it('creates a payment intent with correct amount', async () => {
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
      status: 'requires_payment_method',
    });
    
    const result = await createPaymentIntentForCart(mockCart);
    
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2999,   // $29.99 in cents
        currency: 'usd',
      }),
      expect.any(Object)
    );
    expect(result.clientSecret).toBe('pi_test_123_secret_abc');
  });
});
```

### Testing Webhook Handlers

```javascript
describe('webhook handler', () => {
  it('fulfills order on payment_intent.succeeded', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: {
            order_id: 'order_456',
            user_id: '789',
          },
          amount: 2999,
          status: 'succeeded',
        },
      },
    };

    // Mock signature verification to return the event
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    // Mock DB operations
    db.orders.update = jest.fn().mockResolvedValue([1]);
    emailService.sendOrderConfirmation = jest.fn().mockResolvedValue(true);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'test_sig')
      .send(JSON.stringify(mockEvent));

    expect(response.status).toBe(200);
    expect(db.orders.update).toHaveBeenCalledWith(
      { status: 'fulfilled' },
      { where: { stripe_payment_intent_id: 'pi_test_123' } }
    );
    expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith('789', 'order_456');
  });

  it('skips duplicate events (idempotency)', async () => {
    // Pre-populate processed events table
    db.processedWebhookEvents.findOne = jest.fn().mockResolvedValue({
      stripe_event_id: 'evt_test_123',
    });

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'test_sig')
      .send(JSON.stringify(mockEvent));

    expect(response.status).toBe(200);
    // Should not fulfill order again
    expect(db.orders.update).not.toHaveBeenCalled();
  });
});
```

---

## Integration Testing with stripe-mock

`stripe-mock` is an official Stripe tool that runs a local HTTP mock of the Stripe API.
It supports the full API surface area.

```bash
# Install via Docker
docker run --rm -p 12111:12111 stripe/stripe-mock:latest

# In your tests, point to the mock server
const stripe = new Stripe('sk_test_anything', {
  host: 'localhost',
  port: 12111,
  protocol: 'http',
});
```

This is useful for integration tests that don't hit the real Stripe API but test the
full request/response cycle.

---

## End-to-End Testing in Test Mode

For true E2E tests, use the real Stripe test API:

```javascript
// Cypress example
describe('checkout flow', () => {
  it('completes a purchase', () => {
    cy.visit('/cart');
    cy.get('[data-testid=checkout-button]').click();
    
    // Fill in Stripe Payment Element
    // Stripe Elements is in an iframe — use Stripe's test helpers
    cy.getWithinIframe('[placeholder="Card number"]').type('4242424242424242');
    cy.getWithinIframe('[placeholder="MM / YY"]').type('12/28');
    cy.getWithinIframe('[placeholder="CVC"]').type('123');
    
    cy.get('[data-testid=pay-button]').click();
    
    // Should redirect to success page
    cy.url().should('include', '/payment-complete');
    cy.contains('Payment succeeded');
  });
});
```

**Tip**: E2E tests with real Stripe test API create real test objects. Clean them up to avoid
cluttering your test account:

```javascript
// After each test run, clean up test objects
afterAll(async () => {
  await stripe.paymentIntents.cancel(createdPaymentIntentId);
});
```

---

## Testing Subscription Scenarios

Subscriptions are time-based, but you don't want to wait a month between billing cycles in tests.
Use Stripe's test clock feature:

```javascript
// Create a test clock
const testClock = await stripe.testHelpers.testClocks.create({
  frozen_time: Math.floor(Date.now() / 1000), // Current time
});

// Create customer/subscription attached to test clock
const customer = await stripe.customers.create({
  email: 'test@example.com',
  test_clock: testClock.id,
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: priceId }],
  trial_period_days: 7,
});

// Advance time to simulate trial ending
await stripe.testHelpers.testClocks.advance(testClock.id, {
  frozen_time: Math.floor(Date.now() / 1000) + (8 * 24 * 60 * 60), // 8 days forward
});

// Now fetch the subscription — it should be active (trial ended)
const updatedSub = await stripe.subscriptions.retrieve(subscription.id);
console.log(updatedSub.status); // 'active'
```

This lets you test the full subscription lifecycle (trial → active → renewal → cancellation)
without waiting for real time to pass.

---

## Testing Checklist

### Before Going to Production

- [ ] Test successful payment with `4242 4242 4242 4242`
- [ ] Test declined card with `4000 0000 0000 0002`
- [ ] Test insufficient funds with `4000 0000 0000 9995`
- [ ] Test 3DS required card `4000 0027 6000 3184` — does your flow handle it?
- [ ] Test 3DS failed card `4000 0082 6000 3178` — does user get clear error?
- [ ] Test webhook idempotency (replay same event twice — should not double-process)
- [ ] Test subscription cancellation webhook (does access get revoked?)
- [ ] Test invoice.payment_failed webhook (does dunning email send?)
- [ ] Test `cancel_at_period_end` flow
- [ ] Test plan upgrade with proration
- [ ] Test refund flow (admin triggers refund → does it reflect correctly?)
- [ ] Test Customer Portal (can users self-serve cancel/update card?)
- [ ] Test Apple Pay/Google Pay on a real device (if applicable)
- [ ] Verify webhook signature validation rejects tampered payloads
- [ ] Confirm no card data appears in server logs

### Monitoring in Production

- [ ] Set up alerts for webhook delivery failures (Stripe Dashboard)
- [ ] Track payment success rate (target >97%)
- [ ] Alert on spike in `card_declined` errors (could indicate fraud or UX issue)
- [ ] Monitor dispute rate (keep below 0.75% to stay in good standing)
- [ ] Daily reconciliation job comparing DB state with Stripe state
