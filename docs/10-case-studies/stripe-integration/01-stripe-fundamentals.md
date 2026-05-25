# Stripe Fundamentals

## What is Stripe?

Stripe is a payment processing platform that provides:
- APIs to accept payments online
- Tools for managing subscriptions, invoices, customers
- Fraud detection (Stripe Radar)
- Financial infrastructure (payouts, refunds, disputes)

It sits between your application and the card networks (Visa, Mastercard) and banks.

---

## The Money Flow

```
Your Customer
    → Stripe (processes card, holds funds)
    → Your Stripe Account (funds settle here)
    → Your Bank Account (via payouts, usually T+2)
```

---

## API Keys — The Foundation

Stripe gives you two sets of keys:

| Key | Prefix | Used Where | Risk if Leaked |
|-----|--------|------------|----------------|
| Publishable Key | `pk_live_...` / `pk_test_...` | Frontend (browser/mobile) | Low — can only tokenize cards |
| Secret Key | `sk_live_...` / `sk_test_...` | Backend (server only) | CRITICAL — full account access |

**NEVER put the secret key in frontend code, git commits, or environment logs.**

### Restricted Keys (Production Best Practice)
Instead of using your master secret key everywhere, create **Restricted API Keys**:
- Go to Stripe Dashboard → Developers → API Keys → Create restricted key
- Grant only the permissions that service needs (e.g., read-only for analytics, write for payments)
- If a microservice is compromised, blast radius is limited

```
# .env
STRIPE_SECRET_KEY=sk_live_...        # Full access — guard this
STRIPE_PUBLISHABLE_KEY=pk_live_...   # Frontend safe
STRIPE_WEBHOOK_SECRET=whsec_...      # For verifying webhook signatures
```

---

## Core Stripe Objects

Understanding these objects is fundamental to everything else.

### Customer
Represents a person or organization paying you.

```json
{
  "id": "cus_ABC123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "metadata": {
    "user_id": "your_internal_user_id_42"
  }
}
```

**Key point**: Always store `stripe_customer_id` in your own database linked to your user record.
This lets you retrieve their payment methods, invoices, and subscriptions later.

```sql
-- Your database
users table:
  id, email, name, stripe_customer_id, created_at
```

**Pitfall**: Don't create multiple Stripe customers for the same user. Check if `stripe_customer_id`
exists before calling `stripe.customers.create()`.

### PaymentMethod
A card, bank account, or other payment instrument. NOT the charge — just the saved payment details.

```json
{
  "id": "pm_ABC123",
  "type": "card",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2027
  }
}
```

### PaymentIntent
Represents a single attempt to collect payment. This is the central object for one-time payments.

States:
```
requires_payment_method → requires_confirmation → requires_action → processing → succeeded
                                                                              ↘ canceled
```

### SetupIntent
Like a PaymentIntent but for saving a card WITHOUT charging it. Used for:
- Free trials (save card, charge later)
- Invoice billing (save card, charge on invoice generation)

### Subscription
A recurring billing agreement. Stripe automatically creates invoices and charges the customer.

### Invoice
A bill sent to a customer. Can be paid immediately or sent via email.

### Price
Defines how much to charge and how often (one-time or recurring).
- Previously called "Plan" — you'll see both in docs

### Product
What you're selling (e.g., "Pro Plan", "Enterprise Seat").
A Product can have multiple Prices (e.g., monthly vs annual).

---

## Test vs Live Mode

- **Test mode**: Use `pk_test_` and `sk_test_` keys. No real money moves.
- **Live mode**: Use `pk_live_` and `sk_live_` keys. Real money.

Your Stripe dashboard has a toggle between the two. Test and live data are completely isolated.

**Common mistake**: Accidentally using test keys in production or vice versa. Your CI/CD should
enforce the right key per environment.

---

## Stripe API Versioning

Stripe APIs are versioned (e.g., `2023-10-16`). When you make API calls:
- Without specifying a version: uses your account's default version
- With a version header: uses that specific version

**Production practice**: Pin your API version explicitly in every request or in your SDK config.

```javascript
// Node.js
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});
```

When Stripe releases breaking changes, your pinned version protects you. Upgrade versions deliberately,
not automatically.

---

## Rate Limits

Stripe rate-limits API calls:
- Live mode: 100 read requests/second, 100 write requests/second per key
- Test mode: 25 requests/second

If you exceed limits, you get HTTP 429. Implement exponential backoff:

```javascript
async function stripeCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.type === 'StripeRateLimitError' && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
        continue;
      }
      throw err;
    }
  }
}
```

---

## Stripe Dashboard

Your operations team will use this daily:
- View payments, refunds, disputes
- Search customers by email or ID
- Manually retry failed charges
- Issue refunds
- View webhook delivery logs (crucial for debugging)
- Download payout reconciliation reports

**Interview tip**: Mention that operational visibility through the dashboard is a real business
benefit — not just a dev tool.

---

## Floating Point Numbers in Financial Systems

This is one of the most important and commonly misunderstood topics in payment engineering.
It comes up in interviews and causes real production bugs.

### Why Floating Point Fails for Money

Computers represent floating point numbers in binary (IEEE 754). Most decimal fractions
cannot be represented exactly in binary — they become infinite repeating fractions.

```javascript
// The classic demo
0.1 + 0.2
// → 0.30000000000000004  (NOT 0.3)

// This breaks financial logic
const price = 1.10;
const tax = 0.03;
const total = price + tax;
// → 1.1300000000000001  (not 1.13)

// Comparisons break silently
0.1 + 0.2 === 0.3  // → false
```

Why? `0.1` in binary is `0.0001100110011...` (repeating forever). The CPU stores an approximation.
When you add two approximations, the error compounds.

**At scale this is catastrophic**: 0.000...1 cent error × 10 million transactions = real money lost,
regulatory violations, and reconciliation failures.

### The Golden Rule: Always Work in the Smallest Integer Unit

Stripe enforces this: all amounts are in the smallest currency unit.
- USD: cents (`$12.50` → `1250`)
- INR: paise (`₹500` → `50000`)
- JPY: yen (`¥500` → `500`, JPY has no subunit)
- GBP: pence (`£9.99` → `999`)

Integers cannot have floating point representation errors. `1250 + 750 = 2000` is always exact.

```javascript
// WRONG — floating point math on money
const price = 12.50;
const tax = price * 0.18;          // 2.25 — looks fine but is fragile
const total = price + tax;         // 14.75 — might not be exact

// CORRECT — work in cents throughout
const priceInCents = 1250;
const taxInCents = Math.round(priceInCents * 0.18);  // 225
const totalInCents = priceInCents + taxInCents;       // 1475 — exact integer arithmetic
```

Convert to display format only at the presentation layer (UI or reports), never for calculation.

---

### Handling Floating Point by Language

#### Java

Java has two purpose-built solutions.

**Option 1: `BigDecimal` — the standard for financial calculations**

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

// WRONG — double loses precision
double price = 1.10;
double tax = 0.03;
System.out.println(price + tax);  // 1.1300000000000001

// CORRECT — BigDecimal preserves exact decimal representation
BigDecimal price = new BigDecimal("1.10");   // Use String constructor, NOT double
BigDecimal tax   = new BigDecimal("0.03");
BigDecimal total = price.add(tax);
System.out.println(total);  // 1.13 — exact

// Division requires explicit scale + rounding mode
BigDecimal taxRate = new BigDecimal("0.18");
BigDecimal taxAmount = price.multiply(taxRate)
                            .setScale(2, RoundingMode.HALF_UP);
// → 0.20 (rounded correctly)
```

**Critical**: Never construct `BigDecimal` from a `double`:
```java
new BigDecimal(0.1)    // → 0.1000000000000000055511151231257827021181583404541015625
new BigDecimal("0.1")  // → 0.1  (exact)
```

**Rounding modes that matter for financial systems:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| `HALF_UP` | 2.5 → 3, -2.5 → -3 | Most tax calculations, display |
| `HALF_EVEN` | 2.5 → 2, 3.5 → 4 (rounds to even) | Statistical/accounting — minimizes cumulative error |
| `CEILING` | Always rounds toward positive infinity | Merchant fee calculations |
| `FLOOR` | Always rounds toward negative infinity | Customer refund calculations |
| `DOWN` | Truncates toward zero | Conservative interest calculations |

```java
// Tax rounding example
BigDecimal price = new BigDecimal("9.99");
BigDecimal gst   = new BigDecimal("0.18");

BigDecimal taxAmount = price.multiply(gst).setScale(2, RoundingMode.HALF_UP);
// 9.99 × 0.18 = 1.7982 → rounds to 1.80

BigDecimal total = price.add(taxAmount);
// 9.99 + 1.80 = 11.79
```

**Option 2: Work in `long` (cents/paise)**

For systems that already follow the "integer smallest unit" rule:

```java
// Store and calculate in paise/cents as long
long priceInPaise = 99900L;   // ₹999.00
long taxRate18pct = 18;       // 18%

// Integer arithmetic — no floating point involved
long taxInPaise = priceInPaise * taxRate18pct / 100;  // 17982 paise
// Careful: integer division truncates. Use BigDecimal for the tax step if precision matters:

BigDecimal taxExact = new BigDecimal(priceInPaise)
    .multiply(new BigDecimal("0.18"))
    .setScale(0, RoundingMode.HALF_UP);
long taxInPaise = taxExact.longValue();  // 17982

long totalInPaise = priceInPaise + taxInPaise;  // 117882 paise = ₹1178.82
```

**Spring Boot / JPA**: Map monetary columns as `BigDecimal` in entities:

```java
@Entity
public class Order {
    @Column(precision = 19, scale = 4)  // 19 total digits, 4 decimal places
    private BigDecimal amount;

    // Or if storing in cents as long:
    @Column
    private Long amountInCents;
}
```

---

#### Node.js / JavaScript

JavaScript has only one numeric type: IEEE 754 double. There's no built-in `BigDecimal`.

**Option 1: Work exclusively in integer cents (recommended)**

```javascript
// Keep all money as integers in cents throughout the system
// Only convert at display time

const priceInCents = 1099;  // $10.99
const taxRate = 0.08;       // 8%

// Round at each step — don't let fractions accumulate
const taxInCents = Math.round(priceInCents * taxRate);  // 88 cents
const totalInCents = priceInCents + taxInCents;         // 1187 cents = $11.87

// Display only
const display = (cents) => `$${(cents / 100).toFixed(2)}`;
console.log(display(totalInCents));  // "$11.87"
```

**Option 2: `decimal.js` or `big.js` library**

```bash
npm install decimal.js
```

```javascript
const Decimal = require('decimal.js');

// Arbitrary precision decimal arithmetic
const price = new Decimal('10.99');
const taxRate = new Decimal('0.08');

const tax = price.mul(taxRate).toDecimalPlaces(2);  // Decimal('0.88')
const total = price.plus(tax);                       // Decimal('11.87')

console.log(total.toString());  // "11.87"
console.log(total.toFixed(2)); // "11.87"

// Comparisons work correctly
new Decimal('0.1').plus('0.2').equals('0.3')  // true
```

**Option 3: `dinero.js` — money-specific library**

```bash
npm install dinero.js @dinero.js/currencies
```

```javascript
import { dinero, add, multiply, toDecimal } from 'dinero.js';
import { USD } from '@dinero.js/currencies';

const price = dinero({ amount: 1099, currency: USD });  // $10.99
const tax   = dinero({ amount: 88,   currency: USD });  // $0.88
const total = add(price, tax);

console.log(toDecimal(total));  // "11.87"

// Dinero enforces:
// - Currency matching (can't add USD to EUR)
// - Immutability
// - Integer-based storage internally
```

**What to avoid in Node.js:**

```javascript
// WRONG
const total = 10.99 + 0.88;  // 11.870000000000001

// WRONG — parseFloat is lossy
const price = parseFloat('10.99');
const tax = parseFloat('0.08');
const result = price * tax;  // 0.8792000000000001

// WRONG — toFixed returns a string and rounds in unpredictable ways
(1.005).toFixed(2)  // "1.00" (not "1.01" — due to representation error)
```

---

#### Elixir

Elixir runs on the Erlang VM (BEAM) which has built-in arbitrary precision integers and a `Decimal` library.

**Option 1: Integer arithmetic (recommended — same as other languages)**

```elixir
# Work in cents/paise throughout
price_in_cents = 1099      # $10.99
tax_rate = 8               # 8% — keep as integer percentage

# Integer arithmetic — exact
tax_in_cents = div(price_in_cents * tax_rate, 100)  # 87 cents (integer division truncates)

# For better rounding, use round:
tax_in_cents = round(price_in_cents * tax_rate / 100)  # 88 cents

total_in_cents = price_in_cents + tax_in_cents  # 1187
```

**Option 2: `Decimal` library (the idiomatic Elixir approach)**

```bash
# mix.exs
{:decimal, "~> 2.0"}
```

```elixir
# Exact decimal arithmetic — no floating point errors
price    = Decimal.new("10.99")
tax_rate = Decimal.new("0.08")

tax   = Decimal.mult(price, tax_rate) |> Decimal.round(2)
# #Decimal<0.88>

total = Decimal.add(price, tax)
# #Decimal<11.87>

# Comparisons
Decimal.equal?(Decimal.add(Decimal.new("0.1"), Decimal.new("0.2")), Decimal.new("0.3"))
# true

# Convert to string for display
Decimal.to_string(total)  # "11.87"

# Rounding modes
Decimal.round(Decimal.new("2.345"), 2, :half_up)    # #Decimal<2.35>
Decimal.round(Decimal.new("2.345"), 2, :half_even)  # #Decimal<2.34> (banker's rounding)
Decimal.round(Decimal.new("2.345"), 2, :ceiling)    # #Decimal<2.35>
Decimal.round(Decimal.new("2.345"), 2, :floor)      # #Decimal<2.34>
```

**Ecto integration (database)**:

```elixir
# schema.ex
schema "orders" do
  field :amount, :decimal         # Maps to NUMERIC/DECIMAL in PostgreSQL
  field :amount_in_cents, :integer  # Alternative: store as integer
end

# Migration
def change do
  create table(:orders) do
    add :amount, :decimal, precision: 19, scale: 4
    # Or:
    add :amount_in_cents, :bigint
  end
end
```

**Elixir's float is also IEEE 754 — same problem:**

```elixir
# Elixir floats have the same issue
0.1 + 0.2
# → 0.30000000000000004

# Never use floats for money in Elixir
price = 10.99   # BAD
price = Decimal.new("10.99")  # GOOD
```

---

### Database Storage

The choice of column type matters as much as the application code.

| Column Type | Precision | Use For |
|-------------|-----------|---------|
| `NUMERIC(19, 4)` / `DECIMAL(19, 4)` | Exact | Monetary amounts (preferred) |
| `BIGINT` | Exact, no decimals | Cents/paise (if integer-only approach) |
| `FLOAT` / `DOUBLE` | Approximate | Never for money |
| `VARCHAR` | N/A | Only for archiving display strings |

```sql
-- PostgreSQL
CREATE TABLE payments (
    id          BIGSERIAL PRIMARY KEY,
    amount      NUMERIC(19, 4) NOT NULL,    -- Exact decimal
    -- OR:
    amount_cents BIGINT NOT NULL,           -- Integer cents approach
    currency    CHAR(3) NOT NULL,           -- 'USD', 'INR', etc.
);
```

**PostgreSQL's `NUMERIC`** stores exact decimal values — no approximation.
**MySQL's `DECIMAL`** is equivalent.
Never use `FLOAT` or `DOUBLE` columns for money in any database.

---

### Rounding Strategy Consistency

The biggest source of reconciliation bugs is inconsistent rounding across services.

**Problem**: Service A rounds tax with `HALF_UP`, Service B rounds with `FLOOR`.
For the same transaction, they compute different totals. Reports don't reconcile.

**Solution**: Define a single rounding rule for the entire system and enforce it:

```java
// Java — define once, use everywhere
public final class MoneyUtils {
    public static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;
    public static final int SCALE = 2;

    public static BigDecimal round(BigDecimal amount) {
        return amount.setScale(SCALE, ROUNDING_MODE);
    }
}
```

```javascript
// Node.js — single utility
const roundMoney = (cents) => Math.round(cents);  // Already integer — no rounding needed
const toDisplay = (cents) => (cents / 100).toFixed(2);
```

```elixir
# Elixir — single utility module
defmodule MyApp.Money do
  @rounding_mode :half_up
  @scale 2

  def round(%Decimal{} = amount) do
    Decimal.round(amount, @scale, @rounding_mode)
  end
end
```

---

### Summary: Decision Table

| Situation | Java | Node.js | Elixir |
|-----------|------|---------|--------|
| Best approach | `BigDecimal` + cents `long` | Integer cents + `decimal.js` | `Decimal` library + integer cents |
| Avoid | `double`, `float` | Native `number` for calculations | Native `float` |
| DB column | `NUMERIC(19,4)` or `BIGINT` | `NUMERIC(19,4)` or `BIGINT` | `NUMERIC(19,4)` or `BIGINT` |
| Display conversion | `BigDecimal.toPlainString()` | `.toFixed(2)` | `Decimal.to_string/1` |
| Rounding rule | `RoundingMode.HALF_UP` (consistent) | `Math.round()` on integer cents | `Decimal.round/3` with `:half_up` |
