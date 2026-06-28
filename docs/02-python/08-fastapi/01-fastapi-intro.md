# FastAPI Introduction

> **Before you start**: Do you understand [Type Hints](../03-advanced/01-type-hints.md) and [async/await](../03-advanced/02-async-programming.md)? FastAPI is built entirely around those two features.

## What Is FastAPI?

**Simple explanation**: FastAPI is a Python web framework for building HTTP APIs. You write plain Python functions with type hints, and FastAPI handles routing, validation, serialization, error responses, and interactive documentation — all automatically.

**Analogy**: If Flask is a bicycle (you build everything yourself) and Django is a car (lots included, opinionated), FastAPI is an electric car — as fast as anything, type-safe by default, and the documentation writes itself.

**Minimal working example**:
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def say_hello(name: str) -> dict:
    return {"message": f"Hello, {name}!"}
```

Visit `http://localhost:8000/hello?name=World` → `{"message": "Hello, World!"}`  
Visit `http://localhost:8000/docs` → Interactive Swagger UI, generated automatically.

## Why This Matters for AI/ML

1. **Serving ML models**: FastAPI is the de-facto standard for wrapping a PyTorch/sklearn model in a REST API — see [Model Deployment](../06-deep-learning/06-model-deployment.md)
2. **Async by default**: LLM API calls (`openai`, `anthropic`) are async I/O — FastAPI handles many concurrent requests without blocking
3. **Pydantic everywhere**: Request/response validation is free; no boilerplate serialization
4. **Auto docs**: Stakeholders and front-end teams get a live API explorer without any extra effort
5. **Agent backends**: Agentic systems built with LangChain or custom orchestrators often expose tool endpoints via FastAPI

## Installation

```bash
# Minimal
pip install fastapi

# With ASGI server for running locally
pip install "fastapi[standard]"  # includes uvicorn + extras

# Or separately
pip install fastapi uvicorn[standard]

# For production extras (pydantic v2, email validation)
pip install fastapi uvicorn[standard] pydantic[email]
```

**Verify**:
```bash
python -c "import fastapi; print(fastapi.__version__)"
# 0.115.x
```

## Your First FastAPI App

```python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="My First API", version="1.0.0")


class Item(BaseModel):
    name: str
    price: float
    in_stock: bool = True


# GET endpoint — query parameter
@app.get("/items")
def list_items(skip: int = 0, limit: int = 10) -> list[Item]:
    return []  # placeholder


# GET endpoint — path parameter
@app.get("/items/{item_id}")
def get_item(item_id: int) -> Item:
    return Item(name="Widget", price=9.99)


# POST endpoint — request body
@app.post("/items", status_code=201)
def create_item(item: Item) -> Item:
    return item  # echo back for now
```

**Run it**:
```bash
uvicorn main:app --reload
# INFO: Uvicorn running on http://127.0.0.1:8000
# --reload restarts on code changes (dev only)
```

**Explore**:
- `http://127.0.0.1:8000/docs` — Swagger UI
- `http://127.0.0.1:8000/redoc` — ReDoc
- `http://127.0.0.1:8000/openapi.json` — raw OpenAPI schema

## FastAPI vs Flask vs Django REST

| Feature | FastAPI | Flask | Django REST |
|---|---|---|---|
| Speed (async) | Fastest | Slow (WSGI) | Medium (can use ASGI) |
| Type hints | Core feature | Optional | Optional |
| Validation | Pydantic built-in | Manual or marshmallow | Serializers |
| Auto docs | Yes, OpenAPI | No | drf-yasg plugin |
| Async support | Native | Flask 2.x (limited) | Native (Django 4+) |
| Learning curve | Low-Medium | Low | High |
| Admin panel | No | No | Yes |
| ORM | Bring your own | Bring your own | Built-in (Django ORM) |
| Best for | APIs, ML serving, microservices | Simple apps | Full-stack web apps |

**When to choose FastAPI**:
- Building a pure API (no server-rendered HTML)
- ML model serving
- Microservices
- High-concurrency endpoints (LLM streaming, file uploads)
- Anywhere you want type safety and auto docs

## How FastAPI Works Internally

```
@app.get("/items/{item_id}")
def get_item(item_id: int, q: str = None) -> Item:
    ...
```

FastAPI inspects this function at startup using Python's `inspect` module and type hints:

1. **Path parameter detection**: `{item_id}` in path → `item_id: int` in signature → parse and coerce from URL
2. **Query parameter detection**: `q: str = None` (not in path) → read from `?q=...`
3. **Request body detection**: parameter with `BaseModel` type → parse JSON body
4. **Response serialization**: return type `Item` → serialize via Pydantic
5. **OpenAPI generation**: all of the above becomes a JSON schema → Swagger UI renders it

## Application Structure

**Small app** (single file):
```
project/
├── main.py
├── requirements.txt
└── .env
```

**Medium app** (multiple routers):
```
project/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI() instance + include_router
│   ├── routers/
│   │   ├── items.py      # APIRouter for /items
│   │   └── users.py      # APIRouter for /users
│   ├── models/
│   │   └── schemas.py    # Pydantic models
│   ├── db/
│   │   └── session.py    # SQLAlchemy engine/session
│   └── core/
│       └── config.py     # Settings (pydantic-settings)
├── tests/
│   └── test_items.py
└── pyproject.toml
```

**`APIRouter` example**:
```python
# app/routers/items.py
from fastapi import APIRouter

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
def list_items():
    return []

@router.get("/{item_id}")
def get_item(item_id: int):
    return {"id": item_id}
```

```python
# app/main.py
from fastapi import FastAPI
from app.routers import items, users

app = FastAPI()
app.include_router(items.router)
app.include_router(users.router)
```

## OpenAPI / Swagger

FastAPI generates a full [OpenAPI 3.1](https://swagger.io/specification/) schema from your code. You get this for free:

```python
app = FastAPI(
    title="Prediction API",
    description="Serves ML model predictions",
    version="2.1.0",
    contact={"name": "ML Team", "email": "ml@example.com"},
)
```

**Customizing docs**:
```python
from fastapi import FastAPI

app = FastAPI(
    docs_url="/api/docs",   # Change Swagger URL
    redoc_url="/api/redoc", # Change ReDoc URL
    openapi_url="/api/openapi.json",
)

# Disable docs in production
app = FastAPI(docs_url=None, redoc_url=None)
```

## Try It

```python
# Run this app and explore /docs
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Try It")


class Prediction(BaseModel):
    label: str
    confidence: float
    model_version: str = "v1"


@app.get("/predict")
async def predict(text: str, threshold: Optional[float] = 0.5) -> Prediction:
    """Classify input text."""
    # Fake ML prediction
    return Prediction(
        label="positive" if len(text) > 10 else "negative",
        confidence=0.87,
    )
```

```bash
uvicorn main:app --reload
# Then open http://localhost:8000/docs
# Try /predict?text=This+is+a+great+product
```

## Self-Check Questions

> Answer from memory before checking

1. **What** two libraries does FastAPI build on top of?
2. **How** does FastAPI know whether a function parameter is a path param vs query param vs request body?
3. **Why** is `--reload` only suitable for development, not production?
4. **When** would you use `APIRouter` instead of putting routes directly on `app`?
5. **Compare**: FastAPI's validation approach vs Flask's

<details>
<summary><strong>Answers</strong></summary>

1. **What two libraries does FastAPI build on?**
   - **Starlette**: ASGI web framework — handles HTTP requests, routing, middleware, WebSockets
   - **Pydantic**: Data validation — validates/serializes all inputs and outputs

2. **How does FastAPI differentiate path vs query vs body params?**
   - **Path param**: name matches `{name}` in the route decorator path
   - **Query param**: simple type (str, int, float, bool) not in path
   - **Request body**: parameter typed as a Pydantic `BaseModel` subclass
   - **Special**: `Body()`, `Query()`, `Path()` markers can override defaults

3. **Why is `--reload` development-only?**
   - `--reload` runs a file watcher and restarts the process on any file change
   - In production, unexpected restarts drop in-flight requests
   - Production uses multiple worker processes managed by Gunicorn or a process supervisor

4. **When to use `APIRouter`?**
   - When you have multiple logical groups of endpoints (users, items, auth)
   - Each router goes in its own module; `main.py` just assembles them
   - Routers support `prefix`, `tags`, `dependencies`, and `responses` that apply to all routes

5. **FastAPI validation vs Flask validation**:

   | Aspect | FastAPI | Flask |
   |---|---|---|
   | Validation | Automatic via Pydantic and type hints | Manual (`request.get_json()`, hand-validate) |
   | Error response | Automatic 422 with field-level details | You write the error response |
   | Schema | Auto-generated OpenAPI | You write it separately (or use plugin) |
   | Learning curve | Higher upfront (learn Pydantic) | Lower (just dicts) |

</details>

## Practice Exercises

**Level 1 — Understand**: Read the app below and explain what each endpoint does, what parameters it accepts, and what it returns.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

catalog: dict[int, dict] = {}
next_id = 1


class Product(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    category: str
    description: Optional[str] = None


class ProductResponse(Product):
    id: int


@app.get("/products", response_model=list[ProductResponse])
def list_products(category: Optional[str] = None):
    products = list(catalog.values())
    if category:
        products = [p for p in products if p["category"] == category]
    return products


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(product: Product):
    global next_id
    item = {"id": next_id, **product.model_dump()}
    catalog[next_id] = item
    next_id += 1
    return item


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int):
    if product_id not in catalog:
        raise HTTPException(status_code=404, detail="Product not found")
    del catalog[product_id]
```

<details>
<summary><strong>Explanation</strong></summary>

- `GET /products` — returns all products; optional `?category=electronics` query param filters by category
- `POST /products` — body must be valid `Product` JSON; stores in memory; returns 201 with ID assigned
- `DELETE /products/{product_id}` — path param `product_id` identifies item; 404 if not found; 204 (no content) on success
- `Field(..., min_length=1)` — `...` means required, validators enforce constraints
- `response_model=list[ProductResponse]` — FastAPI uses this to filter and serialize the response
- `model_dump()` — Pydantic v2 method (was `.dict()` in v1) to convert model to dict

</details>

---

**Level 2 — Apply**: Add a `PUT /products/{product_id}` endpoint that replaces an existing product, and a `GET /products/{product_id}` endpoint that returns a single product.

<details>
<summary><strong>Solution</strong></summary>

```python
@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int):
    if product_id not in catalog:
        raise HTTPException(status_code=404, detail="Product not found")
    return catalog[product_id]


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: Product):
    if product_id not in catalog:
        raise HTTPException(status_code=404, detail="Product not found")
    item = {"id": product_id, **product.model_dump()}
    catalog[product_id] = item
    return item
```

</details>

---

**Level 3 — Create**: Build a FastAPI app for a simple task manager with `Task` (id, title, done, priority: 1-5), supporting full CRUD. Add a `GET /tasks/stats` endpoint that returns total count, done count, and count per priority.

## Common Mistakes

### ❌ Mistake 1: Forgetting `async` on I/O-bound handlers

```python
# ❌ Blocks the event loop during DB or HTTP call
@app.get("/data")
def get_data():
    result = requests.get("https://api.example.com/data")  # Blocking!
    return result.json()
```

✅ **Fix**: Use `async def` + `httpx.AsyncClient` for I/O operations
```python
import httpx

@app.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:
        result = await client.get("https://api.example.com/data")
    return result.json()
```

---

### ❌ Mistake 2: Running `uvicorn` with `--reload` in production

```bash
# ❌ Production Dockerfile
CMD ["uvicorn", "main:app", "--reload"]
```

✅ **Fix**: Use Gunicorn with Uvicorn workers for production
```bash
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker"]
```

---

### ❌ Mistake 3: Returning raw dicts instead of Pydantic models

```python
# ❌ No validation, no docs, no type safety
@app.post("/users")
def create_user(data: dict):
    return {"user": data}
```

✅ **Fix**: Use Pydantic models for both input and output
```python
class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

@app.post("/users", response_model=UserResponse)
def create_user(data: UserCreate):
    return UserResponse(id=1, **data.model_dump())
```

---

### ❌ Mistake 4: Not setting `response_model` — leaking internal fields

```python
class User(BaseModel):
    id: int
    name: str
    password_hash: str  # Sensitive!

@app.get("/users/{id}")
def get_user(id: int) -> User:
    return User(id=1, name="Alice", password_hash="$2b$...")
    # ❌ password_hash is exposed!
```

✅ **Fix**: Use a separate response model that excludes sensitive fields
```python
class UserPublic(BaseModel):
    id: int
    name: str

@app.get("/users/{id}", response_model=UserPublic)
def get_user(id: int) -> User:
    return User(id=1, name="Alice", password_hash="$2b$...")
    # FastAPI filters to only id and name
```

## How This Connects

**Builds on**:
- [Type Hints](../03-advanced/01-type-hints.md) — function signatures are the API contract
- [Async Programming](../03-advanced/02-async-programming.md) — `async def` route handlers
- [Decorators](../03-advanced/04-decorators.md) — `@app.get()` is a decorator

**Related concepts**:
- [Pydantic Models](./03-pydantic-models.md) — request/response validation
- [Routing & Path Operations](./02-routing-path-operations.md) — full routing details
- [Model Deployment](../06-deep-learning/06-model-deployment.md) — FastAPI in production ML

**Next steps**:
- [Routing & Path Operations](./02-routing-path-operations.md) — master path params, query params, response types

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:

1. **How does FastAPI use Python's `inspect` module and `__annotations__` to build the OpenAPI schema at startup?**

   <details>
   <summary>Answer</summary>

   FastAPI uses `inspect.signature()` on each route function to extract parameters. For each parameter it checks:
   - Is the name in the path template? → `Path` parameter
   - Is the type a `BaseModel` subclass? → Request body
   - Does it have a `Body()`, `Query()`, `Header()` default? → That type
   - Otherwise → query parameter (simple types) or header (special names like `user_agent`)

   Pydantic then builds a JSON Schema from each model's `__annotations__` (which is the `__fields__` dict in Pydantic v1, `model_fields` in v2). FastAPI collects all these schemas and assembles the `/openapi.json` endpoint, which Swagger UI reads.

   The schema is built **once at startup** — there is no per-request schema work. This is why FastAPI startup can be slightly slow but requests are fast.

   </details>

2. **What is Starlette and how does FastAPI relate to it?**

   <details>
   <summary>Answer</summary>

   Starlette is an async ASGI framework that provides: routing, middleware, WebSocket support, background tasks, request/response objects, test client, and static file serving. FastAPI is literally a subclass of `Starlette`:

   ```python
   class FastAPI(Starlette):
       ...
   ```

   FastAPI adds: automatic parameter extraction from type hints, Pydantic validation, OpenAPI schema generation, and dependency injection. Everything Starlette can do, FastAPI can also do — you can mix raw Starlette routes with FastAPI routes.

   </details>

**Production Scenarios**:

1. **How do you migrate a FastAPI app from Pydantic v1 to Pydantic v2?**

   <details>
   <summary>Answer</summary>

   Key changes in Pydantic v2:
   - `.dict()` → `.model_dump()`
   - `.json()` → `.model_dump_json()`
   - `.parse_obj()` → `Model.model_validate()`
   - `@validator` → `@field_validator` (different signature)
   - `orm_mode = True` → `model_config = ConfigDict(from_attributes=True)`
   - `__fields__` → `model_fields`

   Migration path:
   1. Install `pydantic==2.x`
   2. Run `pydantic v1 compat` mode with `from pydantic.v1 import BaseModel` (interim)
   3. Gradually update validators and config
   4. FastAPI 0.100+ fully supports Pydantic v2

   </details>

## Summary

**In 3 sentences**:
- FastAPI is a Python API framework built on Starlette (ASGI) and Pydantic (validation) that turns type-annotated functions into validated, documented HTTP endpoints with near-zero boilerplate
- You write plain Python functions with type hints — FastAPI handles routing, request parsing, validation, serialization, error responses, and OpenAPI documentation generation automatically
- It is the standard choice for serving ML models and building microservices in Python because of its async-first design, Pydantic integration, and exceptional developer experience

**Key takeaway**: FastAPI's core insight is that type hints are a complete API contract — your function signature already contains everything needed for routing, validation, serialization, and documentation.
