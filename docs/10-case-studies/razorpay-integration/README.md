# Razorpay Integration — Interview Prep & Production Guide

This folder covers Razorpay integration from zero to production-grade systems.
Designed for interviews at mid-to-senior level, covering both frontend and backend concerns.
Razorpay is India's leading payment gateway — commonly asked about in Indian startup/product interviews.

## Index

| File | Topics |
|------|--------|
| [01-razorpay-fundamentals.md](./01-razorpay-fundamentals.md) | Core concepts, API keys, objects, flow |
| [02-payment-flows.md](./02-payment-flows.md) | Orders, Checkout, Standard/Custom integration |
| [03-webhooks.md](./03-webhooks.md) | Webhook events, signature verification, idempotency |
| [04-subscriptions.md](./04-subscriptions.md) | Recurring billing, plans, addons, pause/cancel |
| [05-frontend-integration.md](./05-frontend-integration.md) | Razorpay.js, Checkout options, callbacks |
| [06-backend-integration.md](./06-backend-integration.md) | Server-side order creation, payment capture, error handling |
| [07-security.md](./07-security.md) | Signature verification, key management, PCI compliance |
| [08-production-pitfalls.md](./08-production-pitfalls.md) | Real-world bugs, race conditions, edge cases |
| [09-use-cases.md](./09-use-cases.md) | E-commerce, SaaS, marketplaces, UPI/EMI flows |
| [10-testing.md](./10-testing.md) | Test mode, test cards/UPI, webhook simulation |
| [11-glossary.md](./11-glossary.md) | Razorpay objects, India payment terms, compliance, UPI ecosystem |

## Quick Mental Model

```
Customer visits checkout
    → Backend creates Razorpay Order (server-to-server API call)
    → Frontend loads Razorpay Checkout.js (opens payment modal)
    → Customer pays (Razorpay handles card/UPI/netbanking data)
    → Razorpay returns payment_id, order_id, signature to your frontend
    → Frontend sends these 3 values to your backend
    → Backend verifies signature (HMAC-SHA256) — CRITICAL STEP
    → On success: capture payment (if manual capture) + fulfill order
    → Razorpay also sends webhook (payment.captured / order.paid)
```

The key insight: **raw card/bank data never touches your servers**.
Razorpay handles PCI compliance. Your job is to create orders, verify signatures, and handle webhooks.
