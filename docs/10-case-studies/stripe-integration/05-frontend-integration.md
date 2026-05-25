# Frontend Integration

## How Stripe.js Works (The Security Model)

Your payment form looks like it's on your website, but the actual card input fields are
**iframes served from Stripe's domain**. This is fundamental to Stripe's security:

```
Your page (yourapp.com)
├── Your HTML/CSS/JS
└── Payment Element (iframe from js.stripe.com)
    ├── Card number field (hosted by Stripe, not accessible to your JS)
    ├── Expiry field (hosted by Stripe)
    └── CVV field (hosted by Stripe)
```

When the customer types card details, those keystrokes go to Stripe's servers — NOT yours.
This is why raw card data never touches your server, achieving PCI SAQ A compliance.

---

## Loading Stripe.js

### Always load from Stripe's CDN

```html
<!-- In <head> — load early so it's ready when user reaches checkout -->
<script src="https://js.stripe.com/v3/"></script>
```

Or with npm:

```bash
npm install @stripe/stripe-js
```

```javascript
// Lazy loading — loads the script when called
import { loadStripe } from '@stripe/stripe-js';

// Singleton pattern — only one Stripe instance per page
let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};
```

**Why singleton**: Multiple `loadStripe()` calls create multiple iframe connections.
This wastes resources and can cause issues.

**Why load early**: Stripe.js performs fraud detection signals (device fingerprinting) from the
moment it loads. Loading it only when the user clicks "Pay" reduces its effectiveness.

---

## React Integration

### Using @stripe/react-stripe-js

```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

```jsx
// CheckoutWrapper.jsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutWrapper({ clientSecret }) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',              // 'stripe', 'night', 'flat', 'none'
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
}
```

```jsx
// CheckoutForm.jsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet — don't submit
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-complete`,
        // Optional: pre-fill billing details
        payment_method_data: {
          billing_details: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
      },
    });

    // If error, display it. If success, Stripe redirects to return_url.
    if (error) {
      // error.type can be:
      // 'card_error'      — card declined, insufficient funds, etc.
      // 'validation_error' — invalid card number format
      // 'api_error'       — Stripe API issue (retry)
      setErrorMessage(error.message);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && <div className="error">{errorMessage}</div>}
      <button disabled={isLoading || !stripe || !elements}>
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}
```

---

## 3D Secure (3DS) — Strong Customer Authentication

3DS is an extra authentication step (like a one-time code) required for some payments,
especially in Europe (PSD2/SCA regulations).

### What it looks like to the user:
1. Customer fills card details and clicks Pay
2. A popup appears from their bank: "Enter the OTP sent to your phone"
3. Customer enters OTP
4. Payment proceeds

### How Stripe handles 3DS

When you call `stripe.confirmPayment()`, Stripe automatically handles 3DS if required:
- Shows a modal/redirect for bank authentication
- Waits for customer to complete it
- Returns success/failure

You don't need to write special 3DS code with the Payment Element — it's automatic.

### When 3DS is required
- Customer's bank mandates it
- Stripe Radar flags the payment as risky
- European regulations (SCA) require it for specific transaction types

### Off-session 3DS failures

When charging a saved card without the customer present (subscriptions, delayed charges):

```javascript
// Your PaymentIntent will fail with error code 'authentication_required'
try {
  await stripe.paymentIntents.create({
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
  });
} catch (err) {
  if (err.code === 'authentication_required') {
    // Customer needs to come back and authenticate
    // Create a new PaymentIntent for them to confirm on-session
    const paymentIntent = err.raw.payment_intent;
    
    // Send email to customer with link to:
    // yourapp.com/reauth?payment_intent=pi_ABC123
    
    // On that page, use stripe.confirmCardPayment() with the PaymentIntent
    // to let the customer complete 3DS
  }
}
```

---

## Apple Pay and Google Pay

The Payment Element automatically shows Apple Pay / Google Pay buttons when:
- The customer is on a supported device/browser (Safari on iPhone/Mac for Apple Pay)
- Your domain is verified with Apple

### Verifying your domain for Apple Pay

```javascript
// Stripe Dashboard → Settings → Payment methods → Apple Pay → Add new domain
// Download the verification file and serve it at:
// https://yourapp.com/.well-known/apple-developer-merchantid-domain-association
```

```javascript
// Express — serve the Apple Pay verification file
app.get(
  '/.well-known/apple-developer-merchantid-domain-association',
  (req, res) => {
    res.sendFile(path.join(__dirname, 'apple-developer-merchantid-domain-association'));
  }
);
```

No other code needed — the Payment Element handles everything.

---

## Payment Request Button (Separate Component)

If you want a standalone Apple Pay / Google Pay button without the full card form:

```jsx
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';

function PaymentRequestButton({ amount }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Your Order',
        amount: amount,           // In cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if the browser supports Apple Pay / Google Pay
    pr.canMakePayment().then(result => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      // Create PaymentIntent on your backend
      const { clientSecret } = await fetch('/create-payment-intent').then(r => r.json());

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (error) {
        ev.complete('fail');
      } else {
        ev.complete('success');
        // Handle success
      }
    });
  }, [stripe, amount]);

  if (!paymentRequest) return null; // Browser doesn't support wallet payments

  return <PaymentRequestButtonElement options={{ paymentRequest }} />;
}
```

---

## Error Handling UX

Good error UX makes a big difference in conversion rates.

```javascript
const errorMessages = {
  card_declined: 'Your card was declined. Please try a different card.',
  insufficient_funds: 'Your card has insufficient funds.',
  expired_card: 'Your card is expired. Please update your payment method.',
  incorrect_cvc: 'The security code is incorrect. Please check and try again.',
  processing_error: 'An error occurred while processing your card. Please try again.',
  card_not_supported: 'Your card is not supported. Please try Visa or Mastercard.',
};

function getErrorMessage(stripeError) {
  return errorMessages[stripeError.code] || stripeError.message;
}
```

**Interview point**: Never show raw Stripe error messages directly. They can be confusing or
reveal internal details. Map them to user-friendly language.

---

## Loading States and Preventing Double-Submission

```jsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (isSubmitting) return;        // Prevent double-click
  setIsSubmitting(true);

  try {
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url } });
    if (error) {
      setErrorMessage(error.message);
    }
  } finally {
    setIsSubmitting(false);         // Always reset, even on error
  }
};

return (
  <button 
    type="submit"
    disabled={isSubmitting || !stripe}
    aria-busy={isSubmitting}
  >
    {isSubmitting ? <Spinner /> : 'Pay Now'}
  </button>
);
```

---

## Frontend Checklist

- [ ] Load Stripe.js from official CDN only
- [ ] Use singleton pattern for Stripe instance
- [ ] Load Stripe.js early (fraud signals)
- [ ] Disable submit button while processing (prevent double-submit)
- [ ] Show meaningful error messages (not raw Stripe errors)
- [ ] Handle the return_url page (show status to user)
- [ ] Test Apple Pay domain verification in production
- [ ] Test with various test cards (declined, 3DS required, etc.)
- [ ] Confirm payment Element looks right on mobile
- [ ] Never log or send card details anywhere
