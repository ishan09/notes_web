# Stripe Integration — Interview Prep & Production Guide

This folder covers Stripe integration from zero to production-grade systems.
Designed for interviews at mid-to-senior level, covering both frontend and backend concerns.

## Index

| File | Topics |
|------|--------|
| [01-stripe-fundamentals.md](./01-stripe-fundamentals.md) | Core concepts, API keys, objects, flow |
| [02-payment-flows.md](./02-payment-flows.md) | PaymentIntent, Checkout, Elements, SetupIntent |
| [03-webhooks.md](./03-webhooks.md) | Webhook events, signature verification, idempotency |
| [04-subscriptions.md](./04-subscriptions.md) | Recurring billing, trials, upgrades, downgrades, cancellations |
| [05-frontend-integration.md](./05-frontend-integration.md) | Stripe.js, Elements, Payment Element, 3DS |
| [06-backend-integration.md](./06-backend-integration.md) | Server-side flows, idempotency keys, error handling |
| [07-security.md](./07-security.md) | PCI compliance, key management, fraud prevention |
| [08-production-pitfalls.md](./08-production-pitfalls.md) | Real-world bugs, race conditions, edge cases |
| [09-use-cases.md](./09-use-cases.md) | Marketplaces, SaaS, e-commerce, metered billing |
| [10-testing.md](./10-testing.md) | Test cards, webhook testing, stripe-mock, CI/CD |
| [11-glossary.md](./11-glossary.md) | Stripe objects, payment industry terms, India-specific, amounts & precision |

## Quick Mental Model

```
Customer visits checkout
    → Frontend loads Stripe.js (never handle raw card data yourself)
    → Backend creates PaymentIntent (server-to-server API call)
    → Frontend confirms payment (Stripe.js handles card data → Stripe servers)
    → Stripe processes payment
    → Stripe sends webhook to your backend (payment_intent.succeeded)
    → Your backend fulfills the order
```

The key insight: **raw card data never touches your servers**. Stripe handles PCI compliance.
