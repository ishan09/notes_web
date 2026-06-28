# Pydantic Models

> **Before you start**: Understand [Dataclasses](../02-intermediate/02-dataclasses.md) and [Type Hints](../03-advanced/01-type-hints.md). Pydantic is built on the same ideas but adds runtime validation, coercion, and serialization.

## What Is Pydantic?

**Simple explanation**: Pydantic lets you define data shapes as Python classes using type hints, and it **validates and coerces data at runtime** — not just as a type checker hint. When data doesn't match, you get structured error messages with field names and reasons.

**Analogy**: Dataclasses are labeled boxes (tell you what should go in). Pydantic models are labeled boxes with a customs inspector — they check contents and reject or convert anything that doesn't match.

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str

user = User(name="Alice", age="30", email="alice@example.com")
# ✅ age="30" is coerced to int(30) — Pydantic is lenient by default
print(user.age)    # 30 (int)
print(user.model_dump())  # {"name": "Alice", "age": 30, "email": "..."}

User(name="Alice", age="not_a_number", email="x")
# ❌ ValidationError: age value is not a valid integer
```

## Why This Matters for AI/ML

1. **Strict API contracts**: ML model inputs have exact shapes — Pydantic enforces them at the HTTP boundary
2. **Config validation**: Model hyperparameters, training configs — catch mistakes before the training run starts
3. **Data pipelines**: Validate dataset rows, feature vectors, labels before feeding to the model
4. **LLM output parsing**: Parse and validate structured LLM responses (JSON mode) into typed objects
5. **Settings management**: `pydantic-settings` reads environment variables and `.env` files with type coercion

## BaseModel Basics

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Item(BaseModel):
    id: int
    name: str
    description: Optional[str] = None   # Optional with None default
    price: float
    tax: float = 0.0                    # Optional with non-None default
    tags: list[str] = []                # Mutable default (Pydantic handles safely)
    created_at: datetime = None         # Will default to None
```

**Creating instances**:
```python
# From keyword arguments
item = Item(id=1, name="Widget", price=9.99)

# From dict (Pydantic v2)
data = {"id": 1, "name": "Widget", "price": 9.99}
item = Item.model_validate(data)  # was Item(**data) or Item.parse_obj(data) in v1

# From JSON string
item = Item.model_validate_json('{"id": 1, "name": "Widget", "price": 9.99}')
```

**Accessing and serializing**:
```python
item = Item(id=1, name="Widget", price=9.99, tags=["sale", "new"])

# Access fields
print(item.name)     # Widget
print(item.price)    # 9.99

# Serialize to dict
d = item.model_dump()  # {"id": 1, "name": "Widget", "price": 9.99, "tags": [...]}

# Serialize to JSON string
j = item.model_dump_json()  # '{"id":1,"name":"Widget","price":9.99,"tags":[...]}'

# Partial export
d = item.model_dump(include={"id", "name"})
d = item.model_dump(exclude={"tags"})
d = item.model_dump(exclude_unset=True)   # Skip fields not explicitly set
d = item.model_dump(exclude_none=True)    # Skip None values
```

## Field — Validation and Metadata

`Field()` adds constraints, defaults, and documentation to individual fields:

```python
from pydantic import BaseModel, Field
from typing import Optional

class Product(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Product name")
    price: float = Field(..., gt=0, description="Price in USD")
    discount: float = Field(default=0.0, ge=0.0, le=1.0, description="Discount 0–1")
    sku: str = Field(..., pattern=r"^[A-Z]{3}-\d{4}$", example="ABC-1234")
    tags: list[str] = Field(default_factory=list)

    model_config = {"json_schema_extra": {"example": {"name": "Widget", "price": 9.99}}}
```

**Common `Field` constraints**:

| Constraint | Types | Meaning |
|---|---|---|
| `min_length` / `max_length` | str, list | Length bounds |
| `pattern` | str | Regex must match |
| `gt` / `ge` | numeric | greater than / greater than or equal |
| `lt` / `le` | numeric | less than / less than or equal |
| `multiple_of` | numeric | Must be multiple of value |
| `min_length` / `max_length` | list, set | Collection size |
| `default` | any | Default value |
| `default_factory` | any | Callable returning default |
| `alias` | any | JSON key name differs from Python name |
| `description` | any | Appears in OpenAPI schema |
| `example` | any | Example value in docs |
| `deprecated` | bool | Mark field as deprecated |

## Validators

**`@field_validator`** — validate or transform a single field:

```python
from pydantic import BaseModel, field_validator
import re


class User(BaseModel):
    email: str
    password: str
    age: int

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower()   # Normalize — validators can transform

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase letter")
        return v

    @field_validator("age")
    @classmethod
    def age_must_be_adult(cls, v: int) -> int:
        if v < 18:
            raise ValueError("Must be at least 18 years old")
        return v
```

**`@model_validator`** — validate across multiple fields:

```python
from pydantic import BaseModel, model_validator


class DateRange(BaseModel):
    start_date: str
    end_date: str
    max_days: int = 30

    @model_validator(mode="after")
    def end_must_be_after_start(self) -> "DateRange":
        from datetime import date
        start = date.fromisoformat(self.start_date)
        end = date.fromisoformat(self.end_date)
        if end <= start:
            raise ValueError("end_date must be after start_date")
        if (end - start).days > self.max_days:
            raise ValueError(f"Range cannot exceed {self.max_days} days")
        return self
```

## Nested Models

Pydantic models can nest inside each other:

```python
from pydantic import BaseModel
from typing import Optional


class Address(BaseModel):
    street: str
    city: str
    country: str = "US"
    zip_code: Optional[str] = None


class Order(BaseModel):
    id: int
    items: list[str]
    shipping_address: Address   # Nested model
    billing_address: Optional[Address] = None  # Optional nested


# Deep JSON is fully validated
order = Order(
    id=1,
    items=["widget", "gadget"],
    shipping_address={"street": "123 Main St", "city": "Springfield"},
)
print(order.shipping_address.city)  # Springfield
print(order.model_dump())
# {"id": 1, "items": [...], "shipping_address": {"street": ..., "city": ..., "country": "US", "zip_code": None}, ...}
```

## Inheritance Patterns in FastAPI

A common pattern is using model inheritance to separate create/read/update schemas:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ItemBase(BaseModel):
    """Shared fields between create and read"""
    name: str
    description: Optional[str] = None
    price: float


class ItemCreate(ItemBase):
    """Fields required for creating an item (no id, no timestamps)"""
    pass


class ItemUpdate(BaseModel):
    """All optional — for PATCH operations"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None


class ItemInDB(ItemBase):
    """Fields stored in the database"""
    id: int
    created_at: datetime
    updated_at: datetime
    internal_cost: float  # Never expose this

    model_config = {"from_attributes": True}  # For SQLAlchemy ORM compatibility


class ItemPublic(ItemBase):
    """Fields returned to the API client"""
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
```

**Usage in routes**:
```python
@app.post("/items", response_model=ItemPublic, status_code=201)
def create_item(item: ItemCreate, db=Depends(get_db)):
    db_item = crud.create_item(db, item)
    return db_item  # SQLAlchemy ORM object → ItemPublic (from_attributes=True)


@app.patch("/items/{id}", response_model=ItemPublic)
def patch_item(id: int, patch: ItemUpdate, db=Depends(get_db)):
    db_item = crud.update_item(db, id, patch)
    return db_item
```

## Pydantic vs Dataclasses

| Feature | `@dataclass` | Pydantic `BaseModel` |
|---|---|---|
| Runtime validation | ❌ No | ✅ Yes |
| Type coercion | ❌ No | ✅ Yes (lenient mode) |
| JSON serialization | Manual | `.model_dump()` / `.model_dump_json()` |
| Nested model validation | ❌ No | ✅ Yes |
| Field constraints | ❌ No | ✅ Yes (`Field(gt=0)`) |
| Default factory | `field(default_factory=list)` | `Field(default_factory=list)` |
| Custom validators | Manual `__post_init__` | `@field_validator` |
| Performance | Faster (no validation) | Slightly slower (validation) |
| FastAPI integration | Partial (with limitations) | First-class |

**Rule of thumb**: Use `@dataclass` for internal data structures where you trust the source. Use Pydantic `BaseModel` for any data crossing a boundary (HTTP, file, external API, env vars).

## Pydantic Settings (Environment Config)

`pydantic-settings` is a first-class extension for app configuration:

```bash
pip install pydantic-settings
```

```python
# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "My API"
    debug: bool = False
    api_key: str                      # Required — no default
    database_url: PostgresDsn
    redis_url: Optional[RedisDsn] = None
    max_connections: int = 10
    allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",             # Load from .env file
        env_file_encoding="utf-8",
        case_sensitive=False,        # API_KEY == api_key
        extra="ignore",              # Ignore unknown env vars
    )


settings = Settings()  # Read from env + .env file at instantiation
```

**.env file**:
```
DEBUG=true
API_KEY=secret123
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/mydb
```

**Using in FastAPI**:
```python
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()

@app.get("/info")
def app_info(settings: Settings = Depends(get_settings)):
    return {"app_name": settings.app_name, "debug": settings.debug}
```

## Handling Validation Errors

When Pydantic validation fails, FastAPI automatically returns a 422 response:

```json
{
    "detail": [
        {
            "type": "greater_than",
            "loc": ["body", "price"],
            "msg": "Input should be greater than 0",
            "input": -5.0,
            "ctx": {"gt": 0}
        },
        {
            "type": "string_too_short",
            "loc": ["body", "name"],
            "msg": "String should have at least 1 character",
            "input": ""
        }
    ]
}
```

**Catching validation errors in code**:
```python
from pydantic import ValidationError

try:
    item = Item(name="", price=-5)
except ValidationError as e:
    print(e.error_count())   # 2
    for error in e.errors():
        print(error["loc"], error["msg"])
    # ('name',) String should have at least 1 character
    # ('price',) Input should be greater than 0
```

**Customizing the 422 response**:
```python
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_failed",
            "fields": [
                {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
                for e in exc.errors()
            ],
        },
    )
```

## Try It

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import date

app = FastAPI()


class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1)
    isbn: str = Field(..., pattern=r"^978-\d{10}$")
    price: float = Field(..., gt=0)
    published_year: int = Field(..., ge=1800, le=2030)
    genres: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("title")
    @classmethod
    def title_should_be_title_case(cls, v: str) -> str:
        return v.title()

    @field_validator("genres")
    @classmethod
    def genres_must_be_lowercase(cls, v: list[str]) -> list[str]:
        return [g.lower() for g in v]


class BookResponse(BookCreate):
    id: int


catalog: dict[int, dict] = {}
_id = 1


@app.post("/books", response_model=BookResponse, status_code=201)
def add_book(book: BookCreate):
    global _id
    item = {"id": _id, **book.model_dump()}
    catalog[_id] = item
    _id += 1
    return item


@app.get("/books/{book_id}", response_model=BookResponse)
def get_book(book_id: int):
    if book_id not in catalog:
        raise HTTPException(status_code=404, detail="Book not found")
    return catalog[book_id]
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between Pydantic `BaseModel` and Python `@dataclass`?
2. **When** does Pydantic raise a `ValidationError` vs silently coerce?
3. **Why** use separate `Create`, `Update`, and `Public` schemas instead of one model?
4. **How** does `model_config = {"from_attributes": True}` enable ORM compatibility?
5. **Compare**: `@field_validator` vs `@model_validator`

<details>
<summary><strong>Answers</strong></summary>

1. **Difference**:
   - `@dataclass` is Python stdlib — stores fields, generates `__init__`/`__repr__`, no validation
   - Pydantic `BaseModel` validates types at instantiation, coerces compatible types, supports nested validation, serialization, field constraints, and validators

2. **Coercion vs error**:
   - Pydantic v2 in "lax" mode (default) coerces: `str→int` ("42"→42), `int→float`, `str→bool` ("true"→True)
   - Pydantic raises `ValidationError` when coercion is impossible: `"hello"→int`, list→str
   - In "strict" mode (`model_config = {"strict": True}`), no coercion — exact type required

3. **Separate schemas**:
   - `Create` — only user-provided fields (no id, no server timestamps)
   - `Update` — all fields optional (PATCH semantics — only update what's provided)
   - `InDB` — adds database fields (id, timestamps) + internal fields never returned
   - `Public` — only fields safe to expose (excludes password_hash, internal_cost, etc.)

4. **`from_attributes=True`**:
   - Allows Pydantic to read fields from object attributes (like SQLAlchemy ORM objects) instead of only dicts
   - `User.model_validate(orm_user)` reads `orm_user.name` instead of expecting `{"name": ...}`
   - Required when returning SQLAlchemy models directly from route functions

5. **`@field_validator` vs `@model_validator`**:
   - `@field_validator("field_name")` — validates/transforms one field in isolation
   - `@model_validator(mode="after")` — runs after all fields are validated, has access to all fields on `self` — use for cross-field validation

</details>

## Practice Exercises

**Level 1 — Understand**: What happens when you call `User(name="Bob", age="25", email="not-an-email")` given the `User` model defined earlier with email validation?

**Level 2 — Apply**: Define a `PredictionRequest` model for an ML inference API:
- `text`: required string, 1–1000 chars
- `model_id`: optional string, default `"default"`, must match `^[a-z0-9-]+$`
- `max_tokens`: optional int, 1–4096, default 256
- `temperature`: optional float, 0.0–2.0, default 0.7
- Add a validator that rejects empty strings (just whitespace)

**Level 3 — Create**: Design a complete schema hierarchy for a blog post API with `PostCreate`, `PostUpdate`, `PostInDB`, and `PostPublic`. The `PostInDB` has a `content_html` field (rendered HTML from markdown, set server-side) that should never appear in `PostPublic` or `PostCreate`.

## Common Mistakes

### ❌ Mistake 1: Mutating model instances directly

```python
item = Item(name="Widget", price=9.99)
item.price = -5  # ❌ Allowed by default, but skips validation
```

✅ **Fix**: Use `model_validate` with `update` or make the model immutable
```python
# Immutable model
class Item(BaseModel):
    model_config = {"frozen": True}
    name: str
    price: float

# Or validate updates
updated = item.model_copy(update={"price": -5})  # Still skips validators!
# Use a new instance for validated updates:
updated = Item(**{**item.model_dump(), "price": -5})  # Runs validators
```

---

### ❌ Mistake 2: Using `.dict()` (Pydantic v1 API)

```python
# ❌ Pydantic v2 — .dict() is deprecated
item.dict()
item.json()
Item.parse_obj(data)
```

✅ **Fix**: Pydantic v2 API
```python
item.model_dump()
item.model_dump_json()
Item.model_validate(data)
```

---

### ❌ Mistake 3: Forgetting `@classmethod` on `@field_validator`

```python
class User(BaseModel):
    age: int

    @field_validator("age")    # ❌ Missing @classmethod
    def validate_age(cls, v):  # Will raise TypeError at runtime
        return v
```

✅ **Fix**: Always pair `@field_validator` with `@classmethod`
```python
    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if v < 0:
            raise ValueError("age must be non-negative")
        return v
```

## How This Connects

**Builds on**:
- [Dataclasses](../02-intermediate/02-dataclasses.md) — Pydantic is a powerful extension of the same concept
- [Type Hints](../03-advanced/01-type-hints.md) — Pydantic's validation is driven entirely by annotations
- [OOP Basics](../02-intermediate/01-oop-basics.md) — BaseModel inheritance patterns

**Related concepts**:
- [Routing & Path Operations](./02-routing-path-operations.md) — `response_model` uses Pydantic
- [Dependency Injection](./04-dependency-injection.md) — settings via `pydantic-settings`
- [Database Integration](./07-database-integration.md) — ORM ↔ Pydantic conversion

**Next steps**:
- [Dependency Injection](./04-dependency-injection.md) — share DB sessions, settings, auth logic

## Summary

**In 3 sentences**:
- Pydantic `BaseModel` extends type hints with runtime validation, type coercion, and serialization, making it the ideal tool for request/response schemas in FastAPI — you define the shape once and get validation, documentation, and serialization for free
- Use `Field()` for per-field constraints and metadata, `@field_validator` for single-field logic, and `@model_validator` for cross-field validation — all errors surface as structured 422 responses automatically
- Separate your schemas by purpose: `Create` for input, `Update` for partial updates, `InDB` for storage, and `Public` for what clients see — this keeps sensitive fields from leaking and makes your API contract explicit
