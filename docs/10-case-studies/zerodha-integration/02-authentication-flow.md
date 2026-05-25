# Authentication Flow

## Overview

Kite Connect uses an OAuth 2.0-style flow. You never receive or store the user's Zerodha password.
The flow produces an `access_token` valid for one trading day (expires at midnight IST).

```
Your App                    Zerodha
   |                           |
   |-- Redirect user to ------>|
   |   kite.zerodha.com/       |
   |   connect/login?          |
   |   api_key=YOUR_KEY        |
   |                           |
   |                    User logs in
   |                    (Zerodha handles password + TOTP)
   |                           |
   |<-- Redirect to your ------|
   |    redirect_url?          |
   |    request_token=XYZ      |
   |                           |
   |-- POST /session/token --->|
   |   api_key + request_token |
   |   + checksum (SHA-256)    |
   |                           |
   |<-- access_token ----------|
   |                           |
   |-- All subsequent calls -->|
   |   Authorization: token    |
   |   api_key:access_token    |
```

---

## Step 1: Redirect to Zerodha Login

```
https://kite.zerodha.com/connect/login?v=3&api_key=YOUR_API_KEY
```

The user logs in with their Zerodha credentials (password + TOTP). You never see these.

After successful login, Zerodha redirects to your configured `redirect_url`:

```
https://yourapp.com/callback?request_token=RANDOM_40_CHAR_TOKEN&action=login&status=success
```

The `request_token` is:
- One-time use only
- Expires in a few minutes if not exchanged
- Must be exchanged on your **backend** (not frontend — it requires your api_secret)

---

## Step 2: Exchange request_token for access_token

### Checksum Calculation

```
checksum = SHA-256(api_key + request_token + api_secret)
```

The checksum is a SHA-256 hash (hex string) of the three values concatenated.

```javascript
// Node.js
const crypto = require('crypto');

function generateChecksum(apiKey, requestToken, apiSecret) {
  return crypto
    .createHash('sha256')
    .update(apiKey + requestToken + apiSecret)
    .digest('hex');
}
```

```java
// Java
import java.security.MessageDigest;

public static String generateChecksum(String apiKey, String requestToken, String apiSecret) throws Exception {
    String data = apiKey + requestToken + apiSecret;
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    byte[] hash = md.digest(data.getBytes("UTF-8"));
    StringBuilder hex = new StringBuilder();
    for (byte b : hash) {
        hex.append(String.format("%02x", b));
    }
    return hex.toString();
}
```

```elixir
# Elixir
def generate_checksum(api_key, request_token, api_secret) do
  data = api_key <> request_token <> api_secret
  :crypto.hash(:sha256, data)
  |> Base.encode16(case: :lower)
end
```

### Token Exchange API Call

```javascript
// POST /session/token
const response = await fetch('https://api.kite.trade/session/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    api_key: process.env.KITE_API_KEY,
    request_token: requestToken,
    checksum: generateChecksum(process.env.KITE_API_KEY, requestToken, process.env.KITE_API_SECRET),
  }),
});

const { data } = await response.json();
// data.access_token — store per user
// data.public_token — used for Kite Publisher (embed charts)
// data.user_id     — Zerodha user ID (e.g., "AB1234")
// data.user_name   — Display name
// data.email       — User's email
// data.broker      — "ZERODHA"
// data.exchanges   — ["NSE", "BSE", "NFO", ...]
// data.products    — ["CNC", "MIS", "NRML", ...]
// data.order_types — ["MARKET", "LIMIT", "SL", "SL-M"]
```

---

## Step 3: Using the access_token

All subsequent API calls require both `api_key` and `access_token` in the `Authorization` header:

```
Authorization: token api_key:access_token
```

```javascript
// Node.js using Kite Connect SDK
const KiteConnect = require('kiteconnect').KiteConnect;

const kite = new KiteConnect({ api_key: process.env.KITE_API_KEY });
kite.setAccessToken(accessToken);  // Set per user

// Now make calls
const profile = await kite.getProfile();
const holdings = await kite.getHoldings();
```

```java
// Java using official SDK
import com.zerodhatech.kiteconnect.KiteConnect;

KiteConnect kiteConnect = new KiteConnect(apiKey);
kiteConnect.setAccessToken(accessToken);
kiteConnect.setPublicToken(publicToken);

// Get profile
User user = kiteConnect.getProfile();
```

---

## Session Expiry & Management

### When does the access_token expire?
- At midnight IST every day (regardless of when it was generated)
- When the user explicitly logs out of Zerodha
- When Zerodha detects suspicious activity

### What happens on expiry?
API calls return `TokenException`:
```json
{
  "status": "error",
  "message": "Incorrect `api_key` or `access_token`.",
  "error_type": "TokenException"
}
```

### Handling expiry in production

```javascript
// Middleware that catches TokenException and re-authenticates
async function kiteApiCall(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.error_type === 'TokenException') {
      // access_token expired — cannot auto-refresh without user
      // Redirect user through login flow again
      throw new SessionExpiredError('Zerodha session expired. Please log in again.');
    }
    throw err;
  }
}

// Usage
const holdings = await kiteApiCall(() => kite.getHoldings());
```

**Critical**: Unlike OAuth 2.0 with refresh tokens, Kite Connect has **no refresh token**.
When the access_token expires, the user must log in again through Zerodha's login page.
Design your UX accordingly — alert users before market open that re-login is needed.

### Multi-User Apps

Each user has their own access_token. Store in your DB per user:

```sql
CREATE TABLE user_sessions (
  user_id        VARCHAR(10) PRIMARY KEY,   -- Zerodha user ID (e.g., "AB1234")
  access_token   TEXT NOT NULL,
  public_token   TEXT,
  created_at     TIMESTAMP NOT NULL,
  expires_at     TIMESTAMP NOT NULL         -- Always next midnight IST
);
```

---

## Invalidating a Session

```javascript
// DELETE /session/token
// Invalidates the current access_token immediately
const response = await fetch('https://api.kite.trade/session/token', {
  method: 'DELETE',
  headers: {
    'Authorization': `token ${apiKey}:${accessToken}`,
    'X-Kite-Version': '3',
  },
});
```

Use this on user logout from your app. Without explicit deletion, the token lives until midnight.

---

## Security Checklist

- [ ] `api_secret` is server-side only — never in frontend code or mobile app binary
- [ ] `request_token` is exchanged on the backend — frontend only receives it from the redirect URL and passes it to your backend
- [ ] Checksum is generated server-side — prevents `api_secret` exposure
- [ ] `access_token` stored encrypted at rest in your DB
- [ ] Token transmitted only over HTTPS
- [ ] Invalidate token on user logout
- [ ] Alert users when token is about to expire (day boundary) so they can re-login before market open
