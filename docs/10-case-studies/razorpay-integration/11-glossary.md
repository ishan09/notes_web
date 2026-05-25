# Glossary — Razorpay & Payment Systems

General payment terms shared with Stripe are listed here for completeness with Razorpay-specific
context where the behaviour differs. Terms that are Razorpay-specific or India-specific are marked **[Razorpay]** / **[India]**.

For deep coverage of general payment terms (IEEE 754, PCI DSS, chargeback, settlement, idempotency, etc.)
see the Stripe glossary at `../stripe-integration/11-glossary.md` — they apply equally here.

---

## Razorpay-Specific Objects

**Order** [Razorpay]
The primary object you create before presenting checkout. Represents your intent to collect a specific amount. An Order can have multiple payment attempts (retries after failure). Always create an Order on your backend first — skipping this step breaks signature verification. States: `created → attempted → paid`.

**Payment** [Razorpay]
Created by Razorpay when a customer completes a payment attempt (successful or not). Linked to an Order. States: `created → authorized → captured / failed / refunded`.

**Refund** [Razorpay]
Partial or full reversal of a captured payment. `speed: 'normal'` (5–7 days) or `speed: 'optimum'` (instant for UPI/wallets, 5–7 days for cards). Refund goes back to the original payment method.

**Settlement** [Razorpay]
Daily batch of captured payments transferred to your bank account after deducting Razorpay fees and GST. Timelines: cards T+2, UPI T+1, netbanking T+2, wallets T+1.

**Customer** [Razorpay]
Optional object for storing customer details. Required for subscriptions. Identified by email/phone.

**Plan** [Razorpay]
Defines billing amount and interval for subscriptions. Equivalent to Stripe's Price. `period`: daily/weekly/monthly/yearly; `interval`: how many periods between charges.

**Subscription** [Razorpay]
A recurring billing agreement linked to a Plan and a Customer. Requires mandate authentication by the customer. States: `created → authenticated → active → pending → halted / cancelled / paused / completed`.

**Addon** [Razorpay]
A one-time or extra charge on top of a subscription (e.g., usage overage). Charged in the next billing cycle automatically.

**Payment Link** [Razorpay]
A hosted payment page URL generated via API or Dashboard. Sent to customers via SMS/email. No frontend integration needed. Useful for support teams and invoicing.

**QR Code** [Razorpay]
A Razorpay-generated UPI QR code for collecting payments. Can be single-use or multi-use, fixed or open amount. Used in physical stores, invoices, and digital interfaces.

**Virtual Account** [Razorpay]
A unique bank account/UPI ID generated per customer or per transaction. When the customer transfers money to it, Razorpay maps the payment to the correct order. Used for B2B payments and high-value transfers.

**Route / Transfer** [Razorpay]
Razorpay Route splits payments between the platform and vendors (linked accounts). Equivalent to Stripe Connect. The platform collects the full payment and transfers portions to vendor accounts.

**Linked Account** [Razorpay]
A vendor/partner account connected to your Razorpay platform account via Route. Receives transfers after each transaction. Vendors must complete KYC to receive transfers.

**X Settlement (RazorpayX)** [Razorpay]
Razorpay's business banking product. Includes current accounts, bulk payouts, payroll, and vendor payments. Separate from the payment gateway but uses the same API credentials.

---

## Razorpay-Specific API Concepts

**Key ID** [Razorpay]
The public identifier for your Razorpay account (`rzp_live_...` or `rzp_test_...`). Used in both frontend and backend API calls. Safe to expose in frontend code — it only identifies your account, not authorizes actions.

**Key Secret** [Razorpay]
The private key used to sign requests and verify payment signatures. Backend-only. Never expose in frontend code. Used with HMAC-SHA256 for payment callback verification.

**Webhook Secret** [Razorpay]
A separate secret (different from Key Secret) set in Razorpay Dashboard → Settings → Webhooks. Used to verify the `x-razorpay-signature` header on incoming webhooks. Set your own random string.

**x-razorpay-signature** [Razorpay]
The HTTP header sent with every Razorpay webhook. Contains HMAC-SHA256 of the raw request body signed with your Webhook Secret. Must be verified before processing any webhook.

**Payment Callback Signature** [Razorpay]
After checkout completes, Razorpay sends `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to your frontend handler. The signature is HMAC-SHA256 of `order_id|payment_id` signed with your Key Secret. Verify on backend before fulfilling.

**Subscription Callback Signature** [Razorpay]
Same as payment callback but the signed string is `payment_id|subscription_id` — note the **reversed order** compared to one-time payments (`order_id|payment_id`). A common source of bugs.

**Receipt** [Razorpay]
An optional field in Order creation. Your internal reference (max 40 characters). Appears in the Razorpay dashboard. Exceeding 40 chars causes a `BAD_REQUEST_ERROR`.

**Notes** [Razorpay]
Key-value metadata attached to Orders, Payments, Customers, Subscriptions. Max 15 key-value pairs. Used to store your internal IDs for reconciliation. Visible in Dashboard and returned in webhooks.

**payment_capture** [Razorpay]
Order creation flag. `1` = auto-capture (default, recommended), `0` = manual capture. With manual capture, you must call `payments.capture()` within 5 days or the payment auto-refunds.

---

## Razorpay Payment Methods

**UPI (Unified Payments Interface)** [India]
Real-time bank-to-bank transfer via NPCI. The dominant payment method in India. Uses VPA (e.g., `user@okaxis`). Razorpay supports UPI Collect, UPI Intent (QR/deeplink), and UPI AutoPay (recurring).

**UPI Collect** [India]
Customer enters their UPI VPA; a collect request is sent to their UPI app. Customer approves in their app. Asynchronous — the customer may approve minutes after checkout closes. Always use webhooks for UPI fulfillment.

**UPI Intent** [India]
Opens the customer's UPI app directly via a deeplink or QR scan. Faster than Collect. Used in mobile apps and physical stores. The payment is completed in the UPI app and callback fires to your server.

**UPI AutoPay** [India]
Recurring UPI payments via eMandate. Customer authorizes a mandate once in their UPI app; Razorpay auto-debits on schedule. RBI requires pre-debit notification. Amounts > ₹15,000 require per-debit approval.

**VPA (Virtual Payment Address)** [India]
A UPI address (e.g., `name@bankname`). Identifies a bank account without revealing account number. Used to send UPI Collect requests.

**Netbanking** [India]
Direct payment from the customer's bank account via the bank's internet banking portal. Razorpay supports 50+ Indian banks. Authenticated by the bank's own login + OTP.

**Wallet** [India]
Prepaid digital wallets. Razorpay supports Paytm, PhonePe, Amazon Pay, Mobikwik, Freecharge. Customer must have balance in the wallet. Settlement T+1.

**EMI** [India]
Equal Monthly Instalments. Two types:
- **Card EMI**: Card issuer converts a charge into EMIs. Processing fee may apply.
- **Cardless EMI**: Third-party lender (Bajaj Finance, ZestMoney) extends credit. No card required.

**BNPL (Buy Now Pay Later)** [India]
Short-term credit at checkout. Providers: LazyPay, Simpl, ePayLater. Customer pays later (usually 15–30 days). Razorpay settles to you immediately; BNPL provider collects from customer.

**RuPay** [India]
India's domestic card network by NPCI. Lower MDR than Visa/Mastercard (~0% for UPI RuPay, ~1% for cards). Accepted domestically; limited international acceptance.

**NACH (National Automated Clearing House)** [India]
Mandate-based recurring debit from a customer's bank account. Used for loan EMIs, insurance premiums, SIP investments. Physical mandate (wet signature) or e-NACH (digital via netbanking/Aadhaar OTP).

**eMandate** [India]
Digital version of NACH. Customer authorizes the mandate online. Required for both UPI AutoPay and bank-account recurring payments. Governed by NPCI and RBI.

**NEFT** [India]
National Electronic Funds Transfer. Batch-based bank transfer. Settles in 30-minute batches. Available 24/7 (since December 2019). Used for manual transfers, not for gateway payments.

**RTGS** [India]
Real-Time Gross Settlement. Instant individual settlement. Minimum ₹2 lakh. Used for high-value B2B transactions.

**IMPS** [India]
Immediate Payment Service. Real-time 24/7 bank transfer using account number + IFSC or MMID. Predecessor to UPI for instant transfers.

---

## Compliance & Regulation (India)

**RBI (Reserve Bank of India)** [India]
India's central bank and primary financial regulator. Issues guidelines on recurring payments, data localization, KYC requirements, and payment gateway operations. Razorpay is regulated by RBI.

**PPI (Prepaid Payment Instrument)** [India]
A regulated category covering wallets (Paytm, PhonePe wallet, etc.) and prepaid cards. Issued under RBI's PPI framework. Requires KYC above certain balance/transaction limits.

**KYC (Know Your Customer)** [India]
Identity verification required by RBI for payment accounts. Merchants must complete KYC to activate Razorpay live mode and to receive payouts. Customers need KYC for full wallet usage above ₹10,000.

**PCI DSS**
Same as in Stripe context. Razorpay Checkout.js puts you on SAQ A compliance path — raw card data never reaches your servers.

**FEMA (Foreign Exchange Management Act)** [India]
Indian law governing foreign exchange. Merchants accepting international payments via Razorpay must have an AD Code from their bank and comply with FEMA rules for repatriation.

**AD Code (Authorized Dealer Code)** [India]
A code issued by your bank certifying that you are authorized to receive foreign currency. Required to accept non-INR payments via Razorpay.

**Nodal Account** [India]
A pooled escrow account held by Razorpay at an RBI-regulated bank. All customer payments flow into this first before being settled to merchants. Mandated by RBI for all payment aggregators.

**PA (Payment Aggregator)** [India]
An entity that facilitates payment processing for multiple merchants. Razorpay is a Payment Aggregator, regulated by RBI. PAs must be RBI-licensed (different from Payment Gateways that only provide tech).

**PG (Payment Gateway)** [India]
In Indian regulatory context, a Payment Gateway is a tech provider that routes transactions but doesn't hold funds. Razorpay functions as both PA and PG. The distinction matters for licensing.

---

## Fraud & Risk (Razorpay)

**Razorpay Shield** [Razorpay]
Razorpay's built-in fraud detection. Uses ML, device fingerprinting, velocity checks, and blocklists. Configured via Dashboard → Fraud & Risk → Shield. Automatic for all merchants.

**Block Rule** [Razorpay]
Custom fraud rule in Shield. Examples: block international cards, block specific BINs, block above a certain amount. Created in Dashboard or via API.

**Manual Review** [Razorpay]
Payments can be set to pause for manual review before capture. Used for high-value or suspicious transactions. Requires manual capture mode (`payment_capture: 0`).

---

## Settlement & Reconciliation

**MDR (Merchant Discount Rate)** [India]
The fee Razorpay charges per transaction. Varies by payment method:
- Cards: ~2%
- Netbanking: ₹15 flat or ~1.5–2%
- UPI: 0% for consumers; 0–1% for merchants (RBI mandate for small merchants)
- Wallets: 1.99%
- International cards: 3%

**GST on MDR** [India]
18% GST is charged on Razorpay's MDR. Included in the fee deducted at settlement. Merchants registered for GST can claim input tax credit.

**Settlement Cycle** [Razorpay]
Razorpay settles T+1 for UPI/wallets and T+2 for cards/netbanking by default. Instant settlements available for a fee (for eligible merchants).

**Instant Settlement** [Razorpay]
Razorpay feature allowing merchants to pull funds before the standard settlement cycle, for a small fee (typically 0.25–0.5% of settlement amount). Useful for cash flow.

**Recon (Reconciliation Report)** [Razorpay]
Downloadable CSV/Excel from Dashboard with all transactions, fees, and settlement amounts. Used by finance teams to match against your internal records and bank statement.

---

## Amounts & Precision

**Paise** [India]
Smallest unit of Indian Rupee. ₹1 = 100 paise. All Razorpay amounts are in paise. ₹500 = `50000` in API calls. The #1 bug in first-time integrations.

**Smallest Currency Unit**
Same principle as Stripe. Send amounts as integers in the smallest unit to avoid floating point errors. See `../stripe-integration/11-glossary.md` for full explanation of IEEE 754 and BigDecimal.
