# Dependency Injection

> **Before you start**: Review [Routing & Path Operations](./02-routing-path-operations.md) and [OOP Basics](../02-intermediate/01-oop-basics.md). DI in FastAPI is a first-class pattern that replaces global state and middleware boilerplate.

## What Is Dependency Injection?

**Simple explanation**: Dependency Injection (DI) means that instead of a function creating or fetching its own resources (database connections, auth tokens, config), it declares what it needs and something else provides them. FastAPI's `Depends()` is the mechanism.

**Analogy**: A restaurant chef doesn't go shopping before each dish. The kitchen manager (FastAPI) handles procurement and hands the chef (route function) prepped ingredients (dependencies) when needed.

```python
from fastapi import FastAPI, Depends

app = FastAPI()

# A dependency — just a function
def get_current_version() -> str:
    return "v2.1.0"

# Route declares it needs the dependency
@app.get("/info")
def get_info(version: str = Depends(get_current_version)):
    return {"version": version}
```

FastAPI calls `get_current_version()` before calling `get_info`, injects the result, and uses the same DI mechanism for path params, query params, headers, bodies, etc.

## Why This Matters for AI/ML

1. **DB session management**: Open a session, inject it into any route, close it after the response — no manual lifecycle management
2. **Auth reuse**: Write `get_current_user()` once, `Depends()` it in every protected route
3. **Model loading**: Load an ML model once at startup, inject it into prediction routes — avoids re-loading per request
4. **Config injection**: `pydantic-settings` Settings object injected into routes — testable and clean
5. **Rate limiting / logging**: Cross-cutting concerns as dependencies, not middleware

## Basic `Depends()`

Any callable (function, class, async function) can be a dependency:

```python
from fastapi import Depends, FastAPI, HTTPException
from typing import Optional

app = FastAPI()

# Simple function dependency
def common_parameters(
    skip: int = 0,
    limit: int = 10,
    q: Optional[str] = None,
):
    return {"skip": skip, "limit": limit, "q": q}


@app.get("/items")
def list_items(params: dict = Depends(common_parameters)):
    return {"params": params}


@app.get("/users")
def list_users(params: dict = Depends(common_parameters)):
    return {"params": params}
```

Both `/items` and `/users` now share `skip`, `limit`, `q` query params without repeating them.

**Dependencies can themselves have dependencies** (dependency chains):

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Header(...), db = Depends(get_db)):
    user = db.query(User).filter(User.token == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/profile")
def get_profile(current_user = Depends(get_current_user)):
    return current_user
```

FastAPI resolves the chain: `get_db` → `get_current_user` → route handler.

## Generator Dependencies (yield)

Using `yield` instead of `return` lets you run cleanup code after the response:

```python
from sqlalchemy.orm import Session
from app.db import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db        # ← gives the db to the route
    finally:
        db.close()      # ← always runs after the response is sent


@app.get("/items")
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
    # db.close() runs automatically after this returns
```

**Async generator dependencies**:
```python
from sqlalchemy.ext.asyncio import AsyncSession

async def get_async_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
        # Session auto-closes when async context exits


@app.get("/items")
async def list_items(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

## Authentication Dependencies — The Standard Pattern

This is the most common real-world use of DI in FastAPI:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True


def decode_access_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenData(username=username)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    token_data = decode_access_token(token)
    user = get_user_from_db(token_data.username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Usage in routes
@app.get("/me")
def get_me(user: User = Depends(get_active_user)):
    return user


@app.get("/admin")
def admin_only(user: User = Depends(get_active_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return {"message": "Welcome, admin"}
```

## Class-Based Dependencies

Classes can be dependencies — useful when the dependency needs configuration:

```python
class Paginator:
    def __init__(self, default_limit: int = 10, max_limit: int = 100):
        self.default_limit = default_limit
        self.max_limit = max_limit

    def __call__(self, skip: int = 0, limit: int = None) -> dict:
        limit = limit or self.default_limit
        limit = min(limit, self.max_limit)
        return {"skip": skip, "limit": limit}


small_paginator = Paginator(default_limit=5, max_limit=20)
large_paginator = Paginator(default_limit=50, max_limit=500)


@app.get("/items")
def list_items(pagination: dict = Depends(small_paginator)):
    return pagination

@app.get("/exports")
def export_items(pagination: dict = Depends(large_paginator)):
    return pagination
```

## Router-Level & App-Level Dependencies

Apply dependencies to every route in a router or the entire app:

```python
from fastapi import APIRouter, Depends

# Applies to all routes in this router
router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(verify_api_key)],
)


@router.get("/stats")
def stats():
    return {"total": 42}  # verify_api_key already checked


# Applies to EVERY route in the entire app
app = FastAPI(dependencies=[Depends(log_request)])
```

**On individual routes**:
```python
@app.delete("/items/{id}", dependencies=[Depends(verify_admin)])
def delete_item(id: int):
    # verify_admin runs, but its return value isn't injected
    ...
```

## Caching Dependencies

By default, FastAPI calls each dependency **once per request** and caches the result within that request scope — so if two routes both `Depends(get_db)`, they get the same db session for the request:

```python
async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user(db = Depends(get_db)):
    return db.query(User).first()


def get_org(db = Depends(get_db)):
    return db.query(Org).first()


# get_db() is only called ONCE for this request
@app.get("/dashboard")
def dashboard(user = Depends(get_user), org = Depends(get_org)):
    return {"user": user, "org": org}
```

**Disable caching** with `use_cache=False`:
```python
@app.get("/items")
def list_items(
    db1 = Depends(get_db, use_cache=False),  # New session
    db2 = Depends(get_db, use_cache=False),  # Another new session (rarely needed)
):
    ...
```

## ML Model Loading as a Dependency

A production pattern for ML inference APIs:

```python
import torch
from functools import lru_cache
from fastapi import FastAPI, Depends
from pydantic import BaseModel
import numpy as np

app = FastAPI()


class PredictionModel:
    def __init__(self, model_path: str):
        self.model = torch.load(model_path, map_location="cpu")
        self.model.eval()

    def predict(self, features: list[float]) -> float:
        with torch.no_grad():
            x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
            return self.model(x).item()


@lru_cache(maxsize=None)
def load_model(model_path: str = "model.pt") -> PredictionModel:
    """Load model once at first call, cache forever."""
    return PredictionModel(model_path)


def get_model() -> PredictionModel:
    return load_model()


class PredictionRequest(BaseModel):
    features: list[float]


@app.post("/predict")
def predict(request: PredictionRequest, model: PredictionModel = Depends(get_model)):
    score = model.predict(request.features)
    return {"score": score, "label": "positive" if score > 0.5 else "negative"}
```

## Testing With Dependency Overrides

DI makes testing simple — swap real dependencies with mocks:

```python
from fastapi.testclient import TestClient

app = FastAPI()

def get_db():
    return RealDB()


@app.get("/items")
def list_items(db = Depends(get_db)):
    return db.all()


# --- In tests ---
from unittest.mock import MagicMock

client = TestClient(app)

def test_list_items():
    mock_db = MagicMock()
    mock_db.all.return_value = [{"id": 1, "name": "Widget"}]

    # Override the dependency for this test
    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Widget"}]

    # Clean up
    app.dependency_overrides.clear()
```

## Try It

```python
from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import secrets

app = FastAPI()

# Simulated database
users_db: dict[str, dict] = {
    "alice_token": {"id": 1, "username": "alice", "role": "user"},
    "admin_token": {"id": 2, "username": "admin", "role": "admin"},
}

items_db: list[dict] = [
    {"id": 1, "name": "Widget", "price": 9.99},
    {"id": 2, "name": "Gadget", "price": 29.99},
]


# --- Dependencies ---
def get_current_user(x_token: str = Header(...)):
    user = users_db.get(x_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


def pagination(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": max(1, min(limit, 100))}


# --- Routes ---
@app.get("/items")
def list_items(
    page: dict = Depends(pagination),
    user = Depends(get_current_user),
):
    return items_db[page["skip"]:page["skip"] + page["limit"]]


@app.post("/items", dependencies=[Depends(require_admin)])
def create_item(item: dict):
    items_db.append({"id": len(items_db) + 1, **item})
    return item
```

```bash
# Test with curl
curl -H "X-Token: alice_token" http://localhost:8000/items
curl -H "X-Token: admin_token" -X POST -H "Content-Type: application/json" \
     -d '{"name":"Sprocket","price":4.99}' http://localhost:8000/items
curl -H "X-Token: alice_token" -X POST \
     -d '{"name":"test","price":1}' http://localhost:8000/items  # 403
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between `return` and `yield` in a dependency?
2. **Why** are dependencies called only once per request by default?
3. **How** do you apply a dependency to every route in a router without listing it on each endpoint?
4. **When** would you use a class-based dependency over a function-based one?
5. **Compare**: FastAPI DI vs global singletons for things like database sessions

<details>
<summary><strong>Answers</strong></summary>

1. **`return` vs `yield` in dependencies**:
   - `return`: dependency runs, returns value, done — no cleanup possible
   - `yield`: dependency yields value to route, route runs, then code *after* `yield` runs (cleanup) — like a context manager
   - Use `yield` when you need to close resources (DB sessions, file handles, HTTP clients)

2. **Once per request caching**:
   - FastAPI builds a dependency cache keyed by the dependency function for each request
   - If two routes both `Depends(get_db)`, the second call sees the cached result from the first
   - This ensures one DB session per request — all queries in one request share a transaction context

3. **Router-level dependencies**:
   ```python
   router = APIRouter(dependencies=[Depends(verify_token)])
   ```
   Or at app level:
   ```python
   app = FastAPI(dependencies=[Depends(rate_limit)])
   ```

4. **Class vs function dependency**:
   - Use class when the dependency needs **configuration** (max_limit, timeout)
   - Instantiate with different configs: `Depends(Paginator(max=20))` vs `Depends(Paginator(max=500))`
   - Function is simpler when no config needed

5. **DI vs global singletons**:
   - Global singletons can't be swapped in tests without monkey-patching
   - DI with `app.dependency_overrides` cleanly replaces the dep in tests
   - Globals hold state between requests (session leakage); `yield` deps guarantee cleanup per request
   - DI is visible in function signatures — intent is clear; globals are implicit

</details>

## Common Mistakes

### ❌ Mistake 1: Not closing DB sessions (missing `yield`)

```python
# ❌ Session never closed — connection pool exhausted under load
def get_db():
    db = SessionLocal()
    return db  # No cleanup!
```

✅ **Fix**: Always use `yield` with cleanup
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### ❌ Mistake 2: Creating the dependency instance inside `Depends()`

```python
# ❌ New Paginator created on every request — loses the configured values
@app.get("/items")
def list_items(p = Depends(Paginator(max_limit=20))):
    ...
```

Actually, this is fine — FastAPI handles this correctly. The instance is created once and reused. But to be explicit and testable, create it at module level:
```python
small_page = Paginator(max_limit=20)

@app.get("/items")
def list_items(p = Depends(small_page)):
    ...
```

---

### ❌ Mistake 3: Mutable default in shared dependency

```python
# ❌ This list is shared across ALL requests
results = []

def collect_ids(id: int):
    results.append(id)   # Bug: shared mutable state
    return results
```

✅ **Fix**: Create fresh data per request
```python
def collect_ids(id: int) -> list[int]:
    return [id]  # Fresh list per call
```

## How This Connects

**Builds on**:
- [OOP Basics](../02-intermediate/01-oop-basics.md) — class-based dependencies
- [Context Managers](../03-advanced/03-context-managers.md) — `yield` dependencies work like context managers
- [Async Programming](../03-advanced/02-async-programming.md) — async dependencies with `async def`/`yield`

**Related concepts**:
- [Authentication & Security](./06-authentication-security.md) — auth flows as dependencies
- [Database Integration](./07-database-integration.md) — `get_db()` dependency pattern
- [Testing FastAPI](./08-testing-fastapi.md) — `dependency_overrides` in tests

**Next steps**:
- [Async & Background Tasks](./05-async-background-tasks.md) — async routes and deferred work

## Summary

**In 3 sentences**:
- FastAPI's `Depends()` system is a first-class DI framework that automatically resolves dependency chains, caches results per request, and supports cleanup via `yield` — replacing global state, repeated boilerplate, and brittle middleware
- Authentication, database sessions, settings, pagination, and rate limiting are all natural dependencies — write each once, compose them freely, and test by overriding with `app.dependency_overrides`
- Generator dependencies (`yield`) are the idiomatic way to manage resources that need setup and teardown, providing the same guarantees as a context manager but wired automatically into the request lifecycle
