# Frontend Integration

## Loading Razorpay.js

Always load from Razorpay's CDN. Never self-host.

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

In React/Next.js, dynamically load to avoid SSR issues:

```javascript
// utils/loadRazorpay.js
export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
```

```javascript
// In your component
const handlePayment = async () => {
  const loaded = await loadRazorpay();
  if (!loaded) {
    alert('Razorpay SDK failed to load. Check your internet connection.');
    return;
  }
  // proceed with payment
};
```

---

## Checkout Options — Full Reference

```javascript
const options = {
  // Required
  key: 'rzp_live_XXXXXXXXX',
  amount: 50000,                  // In paise — must match order amount
  currency: 'INR',
  order_id: 'order_ABC123',       // From backend

  // Branding
  name: 'Your Company Name',      // Appears in checkout header
  description: 'Order #42',       // Subtitle
  image: 'https://cdn.company.com/logo.png',  // 256x256 PNG recommended

  // Pre-fill customer info (reduces friction)
  prefill: {
    name: 'Customer Name',
    email: 'customer@example.com',
    contact: '9999999999',        // With country code if international
    vpa: 'customer@okaxis',       // Pre-fill UPI VPA
  },

  // Restrict payment methods
  method: {
    netbanking: true,
    card: true,
    upi: true,
    wallet: true,
    emi: false,
    paylater: false,
  },

  // UPI-specific
  config: {
    display: {
      blocks: {
        utib: {                    // Highlight a specific bank
          name: 'Pay via Axis Bank',
          instruments: [
            { method: 'upi', flows: ['collect', 'intent', 'qr'] }
          ]
        }
      },
      sequence: ['block.utib'],
      preferences: { show_default_blocks: true }
    }
  },

  // Notes — passed to order, useful for internal tracking
  notes: {
    internal_order_id: 'your_db_id_42',
  },

  // Theming
  theme: {
    color: '#3399cc',             // Primary color for buttons/highlights
    backdrop_color: '#000000',    // Modal backdrop color
    hide_topbar: false,           // Show/hide the razorpay header bar
  },

  // Modal behavior
  modal: {
    backdropclose: false,         // Prevent closing on backdrop click
    escape: true,                 // Allow closing with Esc key
    handleback: true,             // Handle browser back button
    confirm_close: true,          // Show confirmation before closing
    ondismiss: function() {
      console.log('Modal closed by user');
      // Reset UI, show "try again" button
    },
    animation: true,
  },

  // Callbacks
  handler: function(response) {
    // Called on successful payment
    // ALWAYS verify on backend before fulfilling
    sendToBackend({
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    });
  },

  // Redirect mode (for mobile browsers that can't show modal)
  redirect: false,                // Set true for mobile native apps
  callback_url: 'https://yourapp.com/payment/callback',  // Used if redirect: true
};

const rzp = new Razorpay(options);

// Error handling before opening
rzp.on('payment.failed', function(response) {
  const error = response.error;
  console.error({
    code: error.code,
    description: error.description,
    source: error.source,        // 'customer' or 'business' or 'bank'
    step: error.step,            // Where failure occurred
    reason: error.reason,        // Machine-readable reason
    order_id: error.metadata.order_id,
    payment_id: error.metadata.payment_id,
  });
  // Show user-friendly error message
  showError(getReadableError(error.description));
});

rzp.open();
```

---

## React Hook for Razorpay

```javascript
// hooks/useRazorpay.js
import { useState, useCallback } from 'react';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initiatePayment = useCallback(async ({ amount, description, onSuccess }) => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      // Create order from backend
      const { data: order } = await axios.post('/api/create-order', { amount });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        order_id: order.id,
        name: 'Your Company',
        description,
        handler: async (response) => {
          try {
            // Verify on backend
            await axios.post('/api/verify-payment', response);
            onSuccess(response);
          } catch (err) {
            setError('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(response.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { initiatePayment, loading, error };
}
```

---

## Handling Payment Failures

Payment failure codes and user-friendly messages:

```javascript
const ERROR_MESSAGES = {
  'BAD_REQUEST_ERROR': 'There was an issue with your payment. Please try again.',
  'GATEWAY_ERROR': 'Payment gateway error. Please try a different payment method.',
  'SERVER_ERROR': 'Razorpay servers are experiencing issues. Please try again later.',
};

const REASON_MESSAGES = {
  'insufficient_funds': 'Your account has insufficient funds.',
  'card_declined': 'Your card was declined. Please try a different card.',
  'invalid_cvv': 'Invalid CVV. Please check your card details.',
  'international_card': 'International cards are not accepted. Please use an Indian card.',
  'payment_timeout': 'Payment timed out. Please try again.',
};

function getReadableError(description) {
  return REASON_MESSAGES[description] || ERROR_MESSAGES['BAD_REQUEST_ERROR'];
}
```

---

## Mobile Considerations

On mobile browsers, the Razorpay modal may not work well (especially on iOS WebView):

```javascript
// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const options = {
  // ...
  redirect: isMobile,              // Use redirect mode on mobile
  callback_url: 'https://yourapp.com/payment/callback',
};
```

In redirect mode, customer is taken to Razorpay's hosted page, then redirected back to `callback_url`.
Your `callback_url` receives `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` as query params.

---

## UPI Intent Deeplinks (Mobile Apps)

For React Native / Flutter apps, use UPI intent to open the UPI app directly:

```javascript
// The checkout.js handles this automatically on mobile
// For manual intent handling:
const upiLink = `upi://pay?pa=merchant@upi&pn=Merchant&am=500&tn=Order42&cu=INR`;
Linking.openURL(upiLink); // React Native
```

---

## Security Do's and Don'ts

| Do | Don't |
|----|-------|
| Use `NEXT_PUBLIC_RAZORPAY_KEY_ID` in frontend (Key ID only) | Put Key Secret in frontend code |
| Verify signature on backend before fulfilling | Trust the frontend handler alone |
| Show loading state while waiting for modal | Let user double-click pay button |
| Handle `ondismiss` gracefully | Leave UI in broken state if user exits |
| Use HTTPS always | Use HTTP for webhook endpoints |
