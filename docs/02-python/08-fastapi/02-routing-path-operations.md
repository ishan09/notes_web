# Routing & Path Operations

> **Before you start**: Review [FastAPI Introduction](./01-fastapi-intro.md). This note covers the mechanics of routing in depth.

## What Are Path Operations?

In FastAPI, a **path operation** is a combination of:
- A **path** (URL pattern): `/items`, `/users/{user_id}`
- An **HTTP operation** (method): `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- A **handler function**: the Python function that runs when the route is matched

```python
@app.get("/items/{item_id}")   # path operation decorator
async def read_item(item_id: int):   # path operation function
    return {"item_id": item_id}
```

FastAPI supports all HTTP methods: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `trace`.

## Path Parameters

Path parameters are variable parts of the URL, declared with curly braces.

```python
@app.get("/users/{user_id}")
def get_user(user_id: int):
    # FastAPI parses and validates: /users/42 → user_id=42 (int)
    # /users/abc → 422 Unprocessable Entity (not an int)
    return {"user_id": user_id}


@app.get("/files/{file_path:path}")
def get_file(file_path: str):
    # :path allows slashes — /files/data/reports/q4.csv
    return {"path": file_path}
```

**Order matters** — FastAPI matches routes in the order they are declared:

```python
@app.get("/users/me")       # Must come FIRST
def get_current_user():
    return {"user": "current"}


@app.get("/users/{user_id}")  # Would swallow "me" if declared first
def get_user(user_id: str):
    return {"user_id": user_id}
```

**Enum path parameters** — restrict values:

```python
from enum import Enum

class ModelName(str, Enum):
    resnet = "resnet"
    vgg = "vgg"
    bert = "bert"


@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    if model_name == ModelName.bert:
        return {"model": model_name, "type": "NLP"}
    return {"model": model_name}
```

## Query Parameters

Any function parameter **not declared in the path** is treated as a query parameter.

```python
@app.get("/items")
def list_items(
    skip: int = 0,           # ?skip=0
    limit: int = 10,         # ?limit=10
    search: str | None = None,  # ?search=widget (optional)
    active: bool = True,     # ?active=false (parses "false", "0", "no")
):
    return {"skip": skip, "limit": limit, "search": search}
```

**URL**: `/items?skip=20&limit=5&search=widget&active=true`

**`Query()` for validation and metadata**:

```python
from fastapi import Query

@app.get("/items")
def list_items(
    q: str | None = Query(
        default=None,
        min_length=3,
        max_length=50,
        pattern=r"^\w+$",
        title="Search query",
        description="Filter items by name prefix",
        alias="search",   # URL param is ?search=... not ?q=...
    ),
    limit: int = Query(default=10, ge=1, le=100),  # 1 ≤ limit ≤ 100
):
    return {"q": q, "limit": limit}
```

**Multiple values for the same key**:

```python
from typing import Annotated

@app.get("/filter")
def filter_items(tags: Annotated[list[str], Query()] = []):
    # ?tags=python&tags=fastapi → tags=["python", "fastapi"]
    return {"tags": tags}
```

## Request Bodies

When a parameter is typed as a Pydantic `BaseModel`, FastAPI reads it from the JSON body.

```python
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    price: float
    tags: list[str] = []


@app.post("/items")
def create_item(item: Item):
    # FastAPI parses JSON body, validates, and gives you a typed object
    return item
```

**Multiple body parameters**:

```python
class User(BaseModel):
    username: str

class Item(BaseModel):
    name: str
    price: float


@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item, user: User):
    # FastAPI expects body: {"item": {...}, "user": {...}}
    return {"item_id": item_id, "item": item, "user": user}
```

**Mixing body with path/query**:

```python
@app.post("/items/{item_id}")
def create_item_for_user(
    item_id: int,          # path param
    q: str | None = None,  # query param
    item: Item = None,     # body
):
    result = {"item_id": item_id}
    if q:
        result["q"] = q
    if item:
        result["item"] = item
    return result
```

## Response Models & Status Codes

**`response_model`** — define what the response schema looks like (different from internal model):

```python
class ItemCreate(BaseModel):
    name: str
    price: float
    internal_cost: float  # Don't expose this!


class ItemPublic(BaseModel):
    id: int
    name: str
    price: float


@app.post("/items", response_model=ItemPublic, status_code=201)
def create_item(item: ItemCreate) -> ItemPublic:
    # Even if we return the full ItemCreate, FastAPI filters to ItemPublic fields
    db_item = save_to_db(item)
    return db_item
```

**Response model options**:

```python
@app.get(
    "/items/{id}",
    response_model=ItemPublic,
    response_model_exclude_unset=True,   # Omit fields not set (useful for PATCH)
    response_model_exclude={"secret"},   # Always exclude these fields
    response_model_include={"id", "name"},  # Only include these
)
def get_item(id: int):
    ...
```

**`status_code` for all methods**:

```python
from fastapi import status

@app.post("/items", status_code=status.HTTP_201_CREATED)
def create(): ...

@app.delete("/items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(): ...

@app.get("/items/{id}", status_code=status.HTTP_200_OK)  # default
def get(): ...
```

**Returning different status codes dynamically**:

```python
from fastapi import Response

@app.get("/items/{id}")
def get_item(id: int, response: Response):
    item = db.get(id)
    if not item:
        response.status_code = status.HTTP_404_NOT_FOUND
        return None
    return item
```

## HTTPException — Raising Errors

```python
from fastapi import HTTPException

@app.get("/items/{item_id}")
def get_item(item_id: int):
    if item_id not in db:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
            headers={"X-Error": "There goes my error"},  # optional
        )
    return db[item_id]
```

**Custom exception handler**:

```python
from fastapi import Request
from fastapi.responses import JSONResponse


class ItemNotFoundError(Exception):
    def __init__(self, item_id: int):
        self.item_id = item_id


@app.exception_handler(ItemNotFoundError)
async def item_not_found_handler(request: Request, exc: ItemNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "item_id": exc.item_id},
    )


@app.get("/items/{item_id}")
def get_item(item_id: int):
    if item_id not in db:
        raise ItemNotFoundError(item_id=item_id)
    return db[item_id]
```

## Headers & Cookies

**Reading headers**:

```python
from fastapi import Header

@app.get("/items")
def get_items(
    user_agent: str | None = Header(default=None),  # HTTP_USER_AGENT → user_agent
    x_token: str | None = Header(default=None),     # X-Token header
):
    return {"user_agent": user_agent}
```

**Reading cookies**:

```python
from fastapi import Cookie

@app.get("/me")
def get_current_user(session_id: str | None = Cookie(default=None)):
    return {"session_id": session_id}
```

**Setting headers/cookies in response**:

```python
from fastapi import Response

@app.post("/login")
def login(response: Response):
    response.set_cookie(key="session_id", value="abc123", httponly=True)
    response.headers["X-Auth-Token"] = "secure_token"
    return {"status": "logged in"}
```

## APIRouter — Organizing Routes

```python
# app/routers/items.py
from fastapi import APIRouter, Depends, HTTPException
from app.models import ItemCreate, ItemPublic
from app.dependencies import get_db

router = APIRouter(
    prefix="/items",
    tags=["items"],
    responses={404: {"description": "Not found"}},  # Default responses for all routes
)


@router.get("/", response_model=list[ItemPublic])
def list_items(db=Depends(get_db)):
    return db.query(Item).all()


@router.get("/{item_id}", response_model=ItemPublic)
def get_item(item_id: int, db=Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

```python
# app/main.py
from fastapi import FastAPI
from app.routers import items, users, auth

app = FastAPI()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router)
app.include_router(items.router)
```

## Path Operation Metadata (for Docs)

```python
@app.post(
    "/items",
    summary="Create an item",
    description="Creates a new item in the catalog. Requires authentication.",
    response_description="The created item with assigned ID",
    tags=["items"],
    deprecated=False,
    operation_id="create_item_v2",  # Overrides auto-generated ID
)
def create_item(item: Item):
    """
    Docstring also appears in docs — supports **markdown**.

    - **name**: must be non-empty
    - **price**: must be greater than zero
    """
    ...
```

## Try It

```python
from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

app = FastAPI()


class Category(str, Enum):
    electronics = "electronics"
    clothing = "clothing"
    food = "food"


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    category: Category
    description: Optional[str] = None


class ProductResponse(ProductCreate):
    id: int


catalog: dict[int, dict] = {}
_id = 1


@app.get("/products", response_model=list[ProductResponse], tags=["products"])
def list_products(
    category: Optional[Category] = None,
    min_price: float = Query(default=0, ge=0),
    max_price: float = Query(default=9999, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
):
    items = list(catalog.values())
    if category:
        items = [i for i in items if i["category"] == category]
    items = [i for i in items if min_price <= i["price"] <= max_price]
    return items[:limit]


@app.get("/products/{product_id}", response_model=ProductResponse, tags=["products"])
def get_product(product_id: int = Path(..., ge=1)):
    if product_id not in catalog:
        raise HTTPException(status_code=404, detail="Product not found")
    return catalog[product_id]


@app.post("/products", response_model=ProductResponse, status_code=201, tags=["products"])
def create_product(product: ProductCreate):
    global _id
    item = {"id": _id, **product.model_dump()}
    catalog[_id] = item
    _id += 1
    return item
```

```bash
uvicorn main:app --reload
# Open /docs and explore the generated Swagger UI
```

## Self-Check Questions

> Answer from memory before checking

1. **How** does FastAPI decide if a function parameter is a path param, query param, or body?
2. **Why** would you use `response_model` separately from the return type annotation?
3. **When** should `HTTPException` be raised vs a custom exception handler?
4. **What** does `response_model_exclude_unset=True` do and when is it useful?
5. **Compare**: `APIRouter` with a prefix vs including routes directly on `app`

<details>
<summary><strong>Answers</strong></summary>

1. **Parameter classification**:
   - In path template (`/items/{item_id}`) → path param
   - `BaseModel` subclass → request body
   - Everything else → query param
   - Explicit markers (`Query()`, `Body()`, `Header()`, `Cookie()`) override this

2. **Why separate `response_model`**:
   - Internal model may have sensitive fields (password_hash) you don't want to expose
   - Return type annotation is for Python tooling; `response_model` controls what FastAPI serializes
   - `response_model=None` disables response serialization (useful when returning a `StreamingResponse`)

3. **`HTTPException` vs custom handler**:
   - `HTTPException` for standard HTTP errors (404, 403, 400) inline in route functions
   - Custom exception handlers for domain-specific errors (raise `InsufficientFundsError` → handler returns structured 402)
   - Custom handlers centralize error format across all routes

4. **`response_model_exclude_unset=True`**:
   - Only includes fields explicitly set on the model — fields using defaults are excluded
   - Useful in `PATCH` endpoints where you return the partial update without all fields

5. **`APIRouter` vs direct routes**:
   - `APIRouter` lets you organize routes in separate files (modular code structure)
   - Apply shared `prefix`, `tags`, `dependencies`, and `responses` to all routes in one place
   - Direct routes on `app` work fine for tiny apps but become messy at scale

</details>

## Practice Exercises

**Level 1 — Understand**: Trace the request `GET /items?skip=5&limit=20&sort=price` through the code below and describe what happens at each step.

```python
from fastapi import FastAPI, Query

app = FastAPI()

@app.get("/items")
def list_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=50),
    sort: str | None = None,
):
    items = fetch_items_from_db(skip, limit, sort)
    return items
```

**Level 2 — Apply**: Extend the products catalog API with:
- `PATCH /products/{id}` — partial update (only update provided fields)
- `GET /products/search` — full-text search across name and description (query param)

**Level 3 — Create**: Build a URL shortener API with:
- `POST /links` — accepts `{"url": "https://..."}`, returns a short code
- `GET /{code}` — returns 302 redirect to original URL, or 404
- `GET /links/stats/{code}` — returns `{"code": "...", "hits": 42, "original_url": "..."}`

## Common Mistakes

### ❌ Mistake 1: Path parameter order (fixed routes after wildcards)

```python
@app.get("/users/{user_id}")  # ❌ This swallows /users/me
def get_user(user_id: str): ...

@app.get("/users/me")
def get_me(): ...
```

✅ **Fix**: Declare fixed routes before wildcard routes
```python
@app.get("/users/me")   # ✅ Checked first
def get_me(): ...

@app.get("/users/{user_id}")
def get_user(user_id: str): ...
```

---

### ❌ Mistake 2: Using `list` as a default in `Query()`

```python
# ❌ Mutable default — shared across calls
@app.get("/items")
def list(tags: list[str] = []):
    ...
```

✅ **Fix**: Use `Query()` with no default or `default_factory`
```python
from typing import Annotated

@app.get("/items")
def list(tags: Annotated[list[str], Query()] = []):
    # FastAPI handles this safely — [] is fine with Query()
    ...
```

---

### ❌ Mistake 3: Raising `HTTPException` in Pydantic validators

```python
from pydantic import validator
from fastapi import HTTPException

class Item(BaseModel):
    price: float

    @validator("price")
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise HTTPException(status_code=400, detail="Bad price")  # ❌
        return v
```

✅ **Fix**: Raise `ValueError` in validators (FastAPI converts to 422)
```python
    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("price must be positive")  # ✅
        return v
```

## How This Connects

**Builds on**:
- [FastAPI Introduction](./01-fastapi-intro.md) — application structure basics
- [Type Hints](../03-advanced/01-type-hints.md) — how parameter types drive behavior
- [Error Handling](../02-intermediate/04-error-handling.md) — exceptions in Python

**Related concepts**:
- [Pydantic Models](./03-pydantic-models.md) — deep dive into request/response validation
- [Dependency Injection](./04-dependency-injection.md) — `Depends()` in route signatures
- [Authentication & Security](./06-authentication-security.md) — protecting routes

**Next steps**:
- [Pydantic Models](./03-pydantic-models.md) — master Pydantic for robust validation

## Summary

**In 3 sentences**:
- FastAPI path operations combine an HTTP method decorator (`@app.get`, `@app.post`, etc.) with a Python function whose parameters are automatically classified as path params, query params, headers, cookies, or request body based on their types and names
- `response_model` decouples the internal return type from what the API exposes, enabling field filtering, type coercion, and doc generation from a single annotation
- `HTTPException` and custom exception handlers standardize error responses across the API, while `APIRouter` enables organizing large APIs into modular, prefix-grouped route groups
