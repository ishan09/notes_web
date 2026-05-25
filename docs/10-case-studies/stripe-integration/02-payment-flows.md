# Payment Flows

## Overview of Approaches

| Method | Best For | Complexity |
|--------|----------|------------|
| Stripe Checkout (hosted) | Fast integration, no frontend work | Low |
| Payment Element | Custom UI on your page | Medium |
| Card Element (legacy) | Older integrations | Medium |
| PaymentIntents API (raw) | Full control | High |

---

## Flow 1: Stripe Checkout (Hosted Page)

Stripe hosts the entire checkout page. You redirect your customer to `stripe.com`.

### When to use
- You want to ship fast
- You're okay with the customer leaving your site momentarily
- You want Stripe to handle 3DS, Apple Pay, Google Pay automatically

### Flow

```
1. Customer clicks "Buy"
2. Your backend creates a Checkout Session
3. Backend returns the session URL
4. Frontend redirects customer to stripe.com/pay/...
5. Customer enters card details (on Stripe's page)
6. Payment succeeds/fails
7. Stripe redirects customer back to your success_url or cancel_url
8. Stripe fires a checkout.session.completed webhook
9. Your backend webhook handler fulfills the order
```

### Backend Code (Node.js)

```javascript
// POST /create-checkout-session
app.post('/create-checkout-session', async (req, res) => {
  const { userId, priceId } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',                          // or 'subscription'
    line_items: [
      {
        price: priceId,                       // Price ID from Stripe Dashboard
        quantity: 1,
      },
    ],
    success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://yourapp.com/cancel',
    customer_email: req.user.email,           // Pre-fill email
    metadata: {
      user_id: userId,                        // Your own ID — for the webhook handler
    },
    // For returning customers who already have a Stripe customer:
    // customer: req.user.stripe_customer_id,
  });

  res.json({ url: session.url });
});
```

### Frontend Code

```javascript
// On button click
const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: currentUser.id, priceId: 'price_ABC123' }),
});
const { url } = await response.json();
window.location.href = url; // Redirect to Stripe's hosted page
```

### Critical: Use Webhooks, Not success_url for Fulfillment

**Beginner mistake**: Fulfilling the order when the customer lands on your success_url.

**Why this is wrong**: The customer can simply navigate directly to your success URL without paying.
Or the browser crashes after payment but before redirect. Or the webhook and the redirect race each other.

**Correct approach**: Fulfill ONLY in the `checkout.session.completed` webhook. The success_url just
shows a "thank you" page — your backend should verify payment via the webhook before granting access.

---

## Flow 2: Payment Element (Custom UI)

You build the checkout form on your own page. Stripe.js handles card data in iframes.

### When to use
- You want your own branded checkout UI
- You don't want to redirect away from your site
- You need more control over the UX flow

### Complete Flow

```
1. Customer fills cart
2. Frontend requests a PaymentIntent from your backend
3. Backend creates PaymentIntent, returns client_secret
4. Frontend uses Stripe.js + client_secret to render the Payment Element
5. Customer fills in card details (in Stripe's secure iframe — never your server)
6. Frontend calls stripe.confirmPayment() 
7. Stripe processes payment
8. On success, Stripe redirects to your return_url
9. Stripe fires payment_intent.succeeded webhook
10. Your backend fulfills the order
```

### Backend: Create PaymentIntent

```javascript
// POST /create-payment-intent
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', userId } = req.body;

  // amount is in smallest currency unit (cents for USD)
  // $29.99 = 2999
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),       // Always round — floating point issues
    currency,
    automatic_payment_methods: { enabled: true }, // Stripe picks best method for customer
    metadata: {
      user_id: userId,
      order_id: generateOrderId(),          // Your internal order reference
    },
    // Optionally attach to a customer for saving payment method:
    // customer: stripeCustomerId,
    // setup_future_usage: 'off_session',   // Allow charging later without customer present
  });

  // Send ONLY the client_secret to frontend — never send the full PaymentIntent object
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

### Frontend: Render Payment Element

```html
<div id="payment-element"></div>
<button id="submit">Pay Now</button>
<div id="error-message"></div>
```

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_live_YOUR_KEY'); // Publishable key — safe for frontend

// 1. Fetch clientSecret from your backend
const { clientSecret } = await fetch('/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 29.99, userId: currentUser.id }),
}).then(r => r.json());

// 2. Create Elements instance
const elements = stripe.elements({ clientSecret });

// 3. Mount the Payment Element (renders card form inside secure iframe)
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// 4. Handle form submission
document.getElementById('submit').addEventListener('click', async () => {
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: 'https://yourapp.com/payment-complete',
    },
  });

  if (error) {
    // Show error to customer (e.g., insufficient funds, card declined)
    document.getElementById('error-message').textContent = error.message;
  }
  // If no error, Stripe redirects to return_url
});
```

### Handling the Return URL

```javascript
// On your /payment-complete page
const stripe = await loadStripe('pk_live_...');
const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');

const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

switch (paymentIntent.status) {
  case 'succeeded':
    showMessage('Payment succeeded!');
    break;
  case 'processing':
    showMessage('Your payment is processing. We will update you when payment is received.');
    break;
  case 'requires_payment_method':
    showMessage('Your payment was not successful, please try again.');
    break;
}
```

**Note**: Even here, don't fulfill the order! Wait for the webhook. This UI is just user feedback.

---

## Flow 3: SetupIntent — Save Card Without Charging

Used when you want to save a customer's card for future use without charging now.
Common use cases: free trials, invoice billing, "save card for later" feature.

### Backend

```javascript
app.post('/create-setup-intent', async (req, res) => {
  // Ensure the customer exists in Stripe
  let stripeCustomerId = req.user.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      metadata: { user_id: req.user.id },
    });
    stripeCustomerId = customer.id;
    // Save to your DB: UPDATE users SET stripe_customer_id = ? WHERE id = ?
    await db.users.update({ stripe_customer_id: stripeCustomerId }, { where: { id: req.user.id } });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
  });

  res.json({ clientSecret: setupIntent.client_secret });
});
```

### Frontend

Same as Payment Element, but use `stripe.confirmSetup()` instead of `stripe.confirmPayment()`.

### After Setup Completes

Stripe fires `setup_intent.succeeded` webhook. The PaymentMethod is now attached to the customer
and can be used for future off-session payments.

---

## Off-Session Payments (Charging a Saved Card)

When the customer is NOT present (e.g., subscription renewal, delayed charge):

```javascript
async function chargeCustomerOffSession(stripeCustomerId, paymentMethodId, amount) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,                // Confirm immediately
      off_session: true,            // Customer is not present
    });

    return { success: true, paymentIntent };
  } catch (err) {
    if (err.code === 'authentication_required') {
      // Card requires 3D Secure — you need to notify the customer to re-authenticate
      // Send them an email with a link to complete payment
      await sendPaymentAuthEmail(stripeCustomerId, err.raw.payment_intent.id);
    } else if (err.code === 'card_declined') {
      // Card declined — notify customer to update payment method
      await notifyCardDeclined(stripeCustomerId);
    }
    return { success: false, error: err.code };
  }
}
```

---

## Currency Handling — Critical Pitfalls

### Zero-Decimal vs Regular Currencies

Stripe amounts are in the **smallest currency unit**:
- USD, EUR, GBP: amount is in cents → $29.99 = `2999`
- JPY, KRW: no cents → ¥1000 = `1000`

**Common bug**: Charging 100x the intended amount because you passed dollars instead of cents.

```javascript
// WRONG — charges $29990 instead of $29.99
amount: 29.99

// CORRECT
amount: Math.round(29.99 * 100) // = 2999

// EVEN BETTER — store amounts as integers in cents in your DB
// Never store money as floats
amount: 2999 // cents, already an integer
```

### Floating Point Issues

```javascript
// This can produce 2998 due to floating point precision
amount: Math.round(0.10 + 0.20 + 29.69) * 100

// Use a library like dinero.js or always work in integer cents
```
