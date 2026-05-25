# Glossary — Stripe & Payment Systems

Terms are grouped by domain. Stripe-specific terms are marked **[Stripe]**. General payment industry terms apply across gateways.

---

## Core Payment Concepts

**Acquiring Bank (Acquirer)**
The bank that processes card payments on behalf of a merchant. When a customer pays you, the acquirer receives the funds from the card network and deposits them into your merchant account. Example: Stripe acts as the acquirer for most of its merchants.

**Issuing Bank (Issuer)**
The bank that issued the customer's card (e.g., Chase issued your Visa). The issuer authorizes or declines transactions. Most declines originate from the issuer.

**Card Network**
The network connecting issuers and acquirers. Visa, Mastercard, Amex, Discover, RuPay. They set interchange fees and chargeback rules. They do not hold funds.

**Merchant Account**
A type of bank account that allows a business to accept card payments. Stripe abstracts this — when you sign up for Stripe, they create a merchant account on your behalf.

**Payment Gateway**
Software that transmits payment data between the merchant, the acquirer, and the card network. Stripe, Razorpay, Braintree, Adyen are gateways. They handle encryption, routing, and API access.

**Payment Processor**
Often used interchangeably with gateway, but technically the processor handles the actual movement of funds. Stripe is both a gateway and processor.

**PSP (Payment Service Provider)**
A company that provides payment processing services. Stripe and Razorpay are PSPs. They bundle gateway, processor, and merchant account into one product.

---

## Authorization, Capture, Settlement

**Authorization**
The first step of a card transaction. Your bank contacts the issuer, which checks if the card is valid and funds are available, then places a hold on the amount. No money moves yet. Authorization can expire (usually 7 days for regular merchants, up to 31 days for hotels/car rentals).

**Capture**
The second step — actually collecting the authorized amount. With auto-capture, this happens immediately. With manual capture, you trigger it explicitly. Money begins moving after capture.

**Void**
Cancelling an authorized but uncaptured transaction. The hold is released immediately with no funds moving. Only possible before capture.

**Settlement**
The process by which captured funds are transferred from the acquirer to your bank account. Typically T+1 to T+3 business days depending on the gateway and payment method.

**Authorization Rate**
The percentage of authorization attempts that succeed. A 95% authorization rate means 5 in 100 card attempts are declined. Improving this is a key business metric.

**Decline Code**
A code returned by the issuing bank when a transaction is declined. Common codes: `insufficient_funds`, `card_declined`, `do_not_honor`, `expired_card`, `lost_card`, `stolen_card`. Some are permanent (lost card), some are transient (insufficient funds — retry might work later).

**Soft Decline**
A decline that may succeed on retry (e.g., `insufficient_funds`, `do_not_honor`). The card itself is fine.

**Hard Decline**
A permanent decline where retrying will not help (e.g., `lost_card`, `stolen_card`, `invalid_card_number`). Do not retry.

---

## Stripe-Specific Objects

**PaymentIntent** [Stripe]
The central object for collecting a one-time payment. Represents the full lifecycle of a payment attempt, from creation to success or failure. Contains the `client_secret` used by Stripe.js to confirm payment on the frontend. States: `requires_payment_method → requires_confirmation → requires_action → processing → succeeded / canceled`.

**SetupIntent** [Stripe]
Like a PaymentIntent but for saving a payment method without charging it. Used for free trials, future off-session charges, and invoice billing flows. Fires `setup_intent.succeeded` on completion.

**PaymentMethod** [Stripe]
A card, bank account, or other payment instrument attached to a customer. Not a charge — just the saved payment details. Referenced by ID (e.g., `pm_ABC123`) when creating PaymentIntents.

**Checkout Session** [Stripe]
A hosted payment page managed by Stripe. Your backend creates a session and redirects the customer to Stripe's URL. Stripe handles all UI, 3DS, Apple Pay, Google Pay. Fires `checkout.session.completed` on success.

**Customer** [Stripe]
A Stripe object representing a person or org. Used to save payment methods, track invoices, and manage subscriptions. Always store `stripe_customer_id` in your own database.

**Product** [Stripe]
What you're selling (e.g., "Pro Plan", "Enterprise Seat"). A Product is a container — it has no price itself. One Product can have multiple Prices.

**Price** [Stripe]
Defines the cost and billing interval for a Product. Can be one-time or recurring. `price_ABC123` is what you attach to a Subscription. Previously called "Plan" — you'll see both in older docs.

**Subscription** [Stripe]
A recurring billing agreement between a Customer and a Price. Stripe auto-creates Invoices and PaymentIntents on each billing cycle. States: `trialing, active, past_due, unpaid, canceled, incomplete, paused`.

**Invoice** [Stripe]
An itemized bill generated automatically for subscriptions, or manually for one-off charges. Contains line items, tax, discount. Can be paid immediately or sent to customer.

**SubscriptionItem** [Stripe]
An individual line within a Subscription (e.g., base plan + metered add-on). A subscription can have multiple items.

**Refund** [Stripe]
A reversal of a captured charge. Can be full or partial. Processed within 5–10 business days to the customer's original payment method.

**Dispute (Chargeback)** [Stripe]
When a customer contacts their bank to reverse a charge. Stripe debits your account for the disputed amount plus a dispute fee ($15). You submit evidence to fight it. Stripe communicates with the issuer.

**Radar** [Stripe]
Stripe's built-in fraud detection system. Uses ML to score transactions. You can write custom Radar rules (e.g., block cards from certain countries, block if multiple declines in 1 hour).

**Connect** [Stripe]
Stripe's platform product for marketplaces and SaaS platforms. Allows splitting payments between your platform and connected accounts (vendors, sellers). Three account types: Standard, Express, Custom.

**Transfer** [Stripe]
Moving funds from your Stripe balance to a connected account's Stripe balance (used with Stripe Connect).

**Payout** [Stripe]
Sending your Stripe balance to your external bank account. Stripe automatically creates payouts on your payout schedule (e.g., daily, weekly).

**Balance Transaction** [Stripe]
A record of every movement of funds in your Stripe account (charge, refund, payout, fee, etc.). Used for reconciliation.

---

## Security & Compliance

**PCI DSS (Payment Card Industry Data Security Standard)**
A security standard required for all entities that store, process, or transmit cardholder data. Compliance levels (1–4) are based on transaction volume. Using Stripe.js / Checkout puts you on the simplest path (SAQ A) because card data never touches your servers.

**SAQ A (Self-Assessment Questionnaire A)**
The simplest PCI compliance form. Available to merchants who fully outsource card handling to a PCI-compliant gateway (like Stripe). Requires HTTPS, no cardholder data stored, basic server security.

**SAQ D**
The most comprehensive PCI form — required if you handle raw card data on your servers (S2S integration). Requires quarterly penetration testing, network segmentation, etc. Avoid if possible.

**Tokenization**
Replacing sensitive card data (card number, CVV) with a non-sensitive token (e.g., `pm_ABC123`). The token is useless to attackers. Stripe.js tokenizes card data in the browser before it ever reaches your server.

**3DS / 3D Secure**
An authentication protocol (Verified by Visa, Mastercard SecureCode) that adds an extra step where the customer authenticates with their bank (via OTP or app approval) before the charge completes. Shifts fraud liability from merchant to issuer. Required for EU payments under PSD2/SCA.

**SCA (Strong Customer Authentication)**
European regulation (PSD2) requiring two-factor authentication for online card payments. Stripe handles SCA automatically with PaymentIntents — it redirects the customer through 3DS when required.

**CVV / CVC**
The 3 or 4 digit security code on a card. Never store it — you cannot store CVV under PCI rules. Used only at time of transaction.

**AVS (Address Verification System)**
Checks if the billing address provided matches the address on file with the issuer. US/Canada only. Fraud signal — mismatch increases risk score.

**HMAC-SHA256**
A cryptographic signature algorithm used to verify webhooks. The payload is signed with your webhook secret, producing a digest that you recompute and compare to ensure the webhook came from Stripe.

**Idempotency Key**
A unique key sent with an API request. If the same key is used again within 24 hours (e.g., after a network timeout), Stripe returns the original response instead of creating a duplicate. Prevents double-charges on retries.

**Timing-Safe Comparison**
Comparing two strings using a constant-time algorithm (e.g., `crypto.timingSafeEqual` in Node.js) that takes the same time regardless of how many characters match. Prevents timing attacks where an attacker deduces a secret by measuring response time.

---

## Fraud & Risk

**Chargeback**
Synonym for dispute. Customer calls bank, bank reverses the charge, merchant loses the funds plus a fee. High chargeback rate (>1%) can get your Stripe account terminated.

**Chargeback Rate**
Percentage of transactions that result in chargebacks. Industry threshold is ~1%. Above this, card networks flag you as high-risk.

**Friendly Fraud**
A chargeback filed by a customer who actually received the goods/service. They claim non-delivery or unauthorized use to get a free refund. Common in digital goods.

**Card Testing**
Fraudsters use stolen card numbers to make small test purchases to see which are still valid, then use the valid ones for large fraudulent purchases. Signs: many small transactions from same IP, many declines, then a large success.

**BIN (Bank Identification Number)**
The first 6–8 digits of a card number. Identifies the issuing bank and card type. Radar rules can block specific BINs.

**Velocity Check**
Fraud rule that triggers when the same card/email/IP makes too many transactions in a short window (e.g., 5 purchases within 10 minutes from the same IP).

---

## Payments Terminology

**Recurring Payment**
A payment charged automatically on a schedule (weekly, monthly, annually). Requires customer's prior authorization. Regulated differently in different countries (RBI in India, PSD2 in EU, Nacha in US).

**Off-Session Payment**
A payment charged when the customer is not actively present on your site (e.g., subscription renewal). May require 3DS — if so, you must notify the customer to re-authenticate.

**Dunning**
The process of communicating with customers whose payments have failed. Includes automated retry schedules, email sequences, and in-app prompts to update payment method.

**Proration**
Adjusting a subscription charge proportionally when a customer changes plans mid-cycle. Example: upgrading from $10/month to $20/month on day 15 of 30 results in a $5 credit + $10 debit = $5 net charge.

**Metered Billing**
Charging based on usage rather than a flat fee. The customer's usage is reported periodically; at billing cycle end, Stripe sums usage and charges accordingly.

**Webhook**
An HTTP POST request sent by a payment gateway to your server when an event occurs (payment succeeded, subscription cancelled, etc.). Your server must respond with 2xx within a timeout window.

**At-Least-Once Delivery**
Webhook delivery guarantee: the gateway will retry until you acknowledge. Does not guarantee exactly-once — your handlers must be idempotent.

**Idempotency**
A property of an operation: running it multiple times has the same effect as running it once. Payment handlers must be idempotent because webhooks can be delivered multiple times.

**Interchange Fee**
A fee charged by the issuing bank to the acquiring bank per transaction. Typically 1.5–2.5% for credit cards. This is a large part of what makes up the processing fee you pay to Stripe.

**MDR (Merchant Discount Rate)**
The total fee percentage charged by the payment gateway/acquirer to the merchant. Stripe's MDR is typically 2.9% + 30¢ for US cards. Razorpay's is ~2% for domestic India.

**Nodal Account**
A pool account held by the payment gateway at a regulated bank. Customer payments flow into this account first, then are settled to merchants. Required by RBI regulation in India.

**T+N Settlement**
Settlement timing: T = transaction day, N = number of business days after. T+2 means funds reach your bank 2 business days after the transaction.

**Gross Settlement**
Settlement before deducting fees. You receive the full transaction amount, and fees are charged separately.

**Net Settlement**
Settlement after deducting fees. You receive `transaction amount - gateway fee`. Most gateways (Stripe, Razorpay) use net settlement.

**Reconciliation**
The process of matching your internal records against the gateway's settlement reports to ensure every transaction is accounted for. Critical for accounting and detecting integration bugs.

**Retry Logic / Exponential Backoff**
When an API call fails due to rate limiting or transient errors, wait before retrying. Exponential backoff doubles the wait time each attempt (1s, 2s, 4s, 8s) to avoid overwhelming the server.

---

## Payment Methods (India-Specific)

**UPI (Unified Payments Interface)**
India's real-time payment system built by NPCI. Transfers money directly between bank accounts using a VPA (Virtual Payment Address like `user@okaxis`). Instant, 24/7, zero cost to consumer. Dominant payment method in India.

**VPA (Virtual Payment Address)**
A UPI address tied to a bank account (e.g., `name@bankname`). Used instead of sharing account number and IFSC. Examples: `user@okaxis`, `user@oksbi`.

**NPCI (National Payments Corporation of India)**
The organization that runs UPI, RuPay, IMPS, NACH, and other Indian payment systems. Analogous to Visa/Mastercard but government-backed.

**NACH (National Automated Clearing House)**
An Indian mandate system for recurring debit from bank accounts. Used for loan EMIs, insurance premiums, subscriptions. Physical or e-NACH (digital).

**eMandate**
A digital version of NACH — customer authorizes recurring debit through their bank's app or netbanking. Required for UPI AutoPay and bank-account recurring payments in India.

**UPI AutoPay**
Recurring payments via UPI using an eMandate. RBI mandates pre-debit notifications. For amounts > ₹15,000, customer must approve each debit in their UPI app.

**RuPay**
India's domestic card network (by NPCI). Alternative to Visa/Mastercard. Accepted domestically; international acceptance limited. Lower interchange fee.

**IMPS (Immediate Payment Service)**
24/7 real-time bank-to-bank transfer in India. Unlike UPI (which uses VPA), IMPS uses account number + IFSC. Used for high-value transfers.

**NEFT / RTGS**
Batch-based bank transfers in India. NEFT is for any amount; RTGS is for ≥₹2 lakh. Not real-time like UPI/IMPS.

**Paise**
The smallest unit of Indian Rupee. ₹1 = 100 paise. Razorpay amounts are always in paise (same as Stripe using cents).

**AD Code (Authorized Dealer Code)**
A code issued by your bank for FEMA compliance. Required to accept international payments in foreign currency via Razorpay.

**FEMA (Foreign Exchange Management Act)**
Indian law governing foreign exchange transactions. Merchants accepting USD/EUR via Razorpay must be FEMA compliant.

---

## Amounts & Precision

**Smallest Currency Unit**
Every gateway API uses the smallest indivisible unit of a currency to avoid floating point errors. USD → cents, INR → paise, JPY → yen (no subunit), GBP → pence.

**Zero-Decimal Currency**
Currencies with no subunit (JPY, KRW, HUF). Amount `1000` means 1000 yen, not 10 yen. Stripe has a list of zero-decimal currencies that must be sent as the face value.

**IEEE 754**
The standard for floating point number representation in computers. Most decimals (0.1, 0.2) cannot be exactly represented in binary, causing precision errors. This is why financial systems never use `float` or `double` for money.

**BigDecimal**
Java's arbitrary-precision decimal type. The correct way to do financial math in Java. Always construct from a String, never from a double.

**Banker's Rounding (HALF_EVEN)**
A rounding strategy that rounds 0.5 to the nearest even number (2.5 → 2, 3.5 → 4). Minimizes cumulative rounding error across many transactions. Used in accounting and financial reporting.
