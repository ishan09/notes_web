# Authentication & Security

> **Before you start**: Review [Dependency Injection](./04-dependency-injection.md) — auth flows in FastAPI are implemented as dependencies. Also helpful: [Async & Background Tasks](./05-async-background-tasks.md) for async token verification.

## Authentication vs Authorization

- **Authentication** (AuthN): *Who are you?* — verify the user's identity (login, token validation)
- **Authorization** (AuthZ): *What can you do?* — verify the user has permission for the action (RBAC, scopes)

FastAPI has built-in utilities for common auth schemes but is intentionally unopinionated — you choose the strategy.

## API Key Authentication

The simplest scheme — pass a secret key in a header or query param:

```python
from fastapi import FastAPI, Security, HTTPException, status
from fastapi.security import APIKeyHeader, APIKeyQuery, APIKeyCookie

app = FastAPI()

API_KEY = "super-secret-key"

# Header: X-API-Key: <key>
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Query: ?api_key=<key>
api_key_query = APIKeyQuery(name="api_key", auto_error=False)


async def verify_api_key(
    header_key: str | None = Security(api_key_header),
    query_key: str | None = Security(api_key_query),
):
    """Accept key from header or query param."""
    key = header_key or query_key
    if key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API key",
        )
    return key


@app.get("/protected", dependencies=[Security(verify_api_key)])
def protected_route():
    return {"message": "You have access"}
```

## OAuth2 with Password Flow + JWT

The most common pattern for user-facing APIs:

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

```python
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────
SECRET_KEY = "your-256-bit-secret"  # In production: os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ── Password hashing ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Users (replace with DB) ───────────────────────────────
fake_db = {
    "alice": {"username": "alice", "hashed_password": hash_password("secret"), "disabled": False},
}


class User(BaseModel):
    username: str
    disabled: bool = False


class Token(BaseModel):
    access_token: str
    token_type: str


# ── Auth dependency ───────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_user(username: str) -> User | None:
    if username in fake_db:
        return User(**fake_db[username])
    return None


def authenticate_user(username: str, password: str) -> User | None:
    user = get_user(username)
    if not user or not verify_password(password, fake_db[username]["hashed_password"]):
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user


def get_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# ── App ───────────────────────────────────────────────────
app = FastAPI()


@app.post("/auth/token", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token, token_type="bearer")


@app.get("/users/me", response_model=User)
def read_me(current_user: User = Depends(get_active_user)):
    return current_user
```

**Testing the flow**:
```bash
# 1. Get token
curl -X POST http://localhost:8000/auth/token \
     -d "username=alice&password=secret"
# {"access_token": "eyJ...", "token_type": "bearer"}

# 2. Use token
curl -H "Authorization: Bearer eyJ..." \
     http://localhost:8000/users/me
# {"username": "alice", "disabled": false}
```

## OAuth2 Scopes (Fine-Grained Authorization)

Scopes let you declare what permissions each token carries:

```python
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi import Security

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    scopes={
        "items:read": "Read items",
        "items:write": "Create and update items",
        "admin": "Full admin access",
    },
)


def get_current_user(
    security_scopes: SecurityScopes,  # Injected by FastAPI with required scopes
    token: str = Depends(oauth2_scheme),
) -> User:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    token_scopes = payload.get("scopes", [])

    # Check every required scope is in the token
    for scope in security_scopes.scopes:
        if scope not in token_scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {scope}",
            )
    return get_user(payload["sub"])


# Route requires "items:read" scope
@app.get("/items", dependencies=[Security(get_current_user, scopes=["items:read"])])
def list_items():
    return []


# Route requires "items:write" scope
@app.post("/items", dependencies=[Security(get_current_user, scopes=["items:write"])])
def create_item(item: dict):
    return item
```

## Middleware

Middleware wraps every request/response — use for cross-cutting concerns:

**CORS** (required for browser clients from different origins):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Custom middleware** (request logging, timing, request ID):

```python
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        start = time.time()

        # Add request ID to headers for tracing
        request.state.request_id = request_id

        response = await call_next(request)

        duration_ms = (time.time() - start) * 1000
        print(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({duration_ms:.0f}ms)"
        )

        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestLoggingMiddleware)
```

**Rate limiting** (using `slowapi`):

```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/limited")
@limiter.limit("5/minute")
async def limited_route(request: Request):  # Request must be first param for limiter
    return {"message": "OK"}
```

## Trusted Host & HTTPS

```python
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# Only allow requests to these hostnames
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["myapp.com", "*.myapp.com", "localhost"],
)

# In production: redirect HTTP to HTTPS
# app.add_middleware(HTTPSRedirectMiddleware)
```

## Secure Headers

```python
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response


app.add_middleware(SecurityHeadersMiddleware)
```

## Password Reset Flow Example

```python
import secrets
from datetime import datetime, timedelta

reset_tokens: dict[str, dict] = {}  # token → {user_id, expires_at}


@app.post("/auth/forgot-password")
async def forgot_password(email: str, background_tasks: BackgroundTasks):
    user = get_user_by_email(email)
    if user:  # Don't reveal whether email exists
        token = secrets.token_urlsafe(32)
        reset_tokens[token] = {
            "user_id": user.id,
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }
        background_tasks.add_task(send_reset_email, email, token)
    return {"message": "If that email exists, a reset link was sent"}


@app.post("/auth/reset-password")
async def reset_password(token: str, new_password: str):
    reset = reset_tokens.get(token)
    if not reset or reset["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    update_user_password(reset["user_id"], hash_password(new_password))
    del reset_tokens[token]  # Single-use token
    return {"message": "Password updated"}
```

## Production Security Checklist

```
✅ Secret management
   - Never hardcode secrets — use environment variables or a vault
   - Rotate JWT secret keys periodically
   - Use SECRET_KEY from os.environ, not hardcoded strings

✅ Token best practices
   - Short JWT expiry (15–60 minutes) + refresh tokens
   - Include `exp`, `iat`, `sub` claims in every token
   - Verify `exp` on every decode
   - Use `python-jose[cryptography]` not `PyJWT` for RS256 support

✅ Password handling
   - Always hash with bcrypt (cost factor ≥ 12) or Argon2
   - Never log or store plaintext passwords
   - Implement account lockout after N failed attempts

✅ Input validation
   - Use Pydantic models — don't trust raw dicts
   - Validate Content-Type header for POST/PUT
   - Set maximum body size (Starlette default: 1MB, adjust for file uploads)

✅ Headers
   - Enable CORS only for known origins
   - Set security headers (CSP, HSTS, X-Frame-Options)
   - Use HTTPS in production

✅ Rate limiting
   - Apply to auth endpoints especially (/login, /register, /forgot-password)
   - Use slowapi or a reverse proxy (nginx, Cloudflare)
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between `Depends()` and `Security()` in route declarations?
2. **Why** should JWT tokens have a short expiry time?
3. **When** should you use refresh tokens vs just extending the JWT expiry?
4. **How** does middleware differ from a dependency that all routes share?
5. **Compare**: API key auth vs OAuth2 — when to use each

<details>
<summary><strong>Answers</strong></summary>

1. **`Depends()` vs `Security()`**:
   - Both inject dependencies, but `Security()` is specifically for security schemes
   - `Security(get_current_user, scopes=["items:read"])` integrates with FastAPI's OpenAPI security schemes — the scopes appear in the Swagger UI "Authorize" dialog
   - `Depends(get_current_user)` works but doesn't document scopes in the OpenAPI schema

2. **Short JWT expiry**:
   - JWTs cannot be revoked (stateless) — a stolen token is valid until it expires
   - Short expiry (15–30 min) limits the window of abuse if a token is leaked
   - Pair with refresh tokens that can be revoked in a DB

3. **Refresh tokens vs long expiry**:
   - Long expiry means a stolen token stays valid for days/weeks
   - Refresh tokens are stored in a DB — can be revoked immediately on logout or breach detection
   - Access token (short) + refresh token (long, revocable) is the secure pattern

4. **Middleware vs shared dependency**:
   - Middleware wraps the entire request/response cycle — runs even for 404s and 405s
   - Dependencies run only for matched routes — after routing
   - Middleware can't easily raise `HTTPException` (use `JSONResponse` instead)
   - Dependencies integrate cleanly with FastAPI's error handling

5. **API key vs OAuth2**:
   - API key: simple, machine-to-machine, no user identity — use for server-to-server APIs, webhooks, CLI tools
   - OAuth2 + JWT: user identity, scopes, expiry, token refresh — use for user-facing APIs where different users have different permissions

</details>

## How This Connects

**Builds on**:
- [Dependency Injection](./04-dependency-injection.md) — auth as injectable dependencies
- [Pydantic Models](./03-pydantic-models.md) — `Token`, `User` schemas
- [Async & Background Tasks](./05-async-background-tasks.md) — async token verification

**Related concepts**:
- [Database Integration](./07-database-integration.md) — user persistence
- [Testing FastAPI](./08-testing-fastapi.md) — override auth dependencies in tests
- [Deployment & Production](./09-deployment-production.md) — secrets management, HTTPS

**Next steps**:
- [Database Integration](./07-database-integration.md) — persist users and tokens

## Summary

**In 3 sentences**:
- FastAPI provides security utilities (`APIKeyHeader`, `OAuth2PasswordBearer`, scopes) that integrate with OpenAPI documentation and work as standard dependencies, making auth logic reusable and testable
- JWT-based auth follows a clear pattern: hash passwords with bcrypt, issue signed tokens with short expiry, validate on every protected request via a `get_current_user` dependency that raises 401/403 as needed
- Production security requires CORS, rate limiting, security headers, secret management from env vars, short token lifetimes, and never logging or storing plaintext credentials
