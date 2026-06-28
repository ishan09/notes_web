# Database Integration

> **Before you start**: Review [Dependency Injection](./04-dependency-injection.md) (the `get_db` pattern) and [Pydantic Models](./03-pydantic-models.md) (`from_attributes=True` for ORM objects). This note covers SQLAlchemy, SQLModel, and async database access.

## Database Stack Overview

```
FastAPI route
    │
    ▼
get_db dependency (Depends)
    │
    ▼
SQLAlchemy Session / AsyncSession
    │
    ▼
Database (PostgreSQL, SQLite, MySQL, etc.)
```

**Two main approaches**:

| Approach | Library | Style | Best for |
|---|---|---|---|
| Sync ORM | SQLAlchemy (sync) | `db.query(Model)` | Simple apps, `def` routes |
| Async ORM | SQLAlchemy (async) | `await session.execute()` | High-concurrency `async def` routes |
| SQL Model | SQLModel | Pydantic + SQLAlchemy unified | FastAPI-first projects |

## Installation

```bash
# SQLAlchemy + async support + PostgreSQL driver
pip install sqlalchemy asyncpg

# Or for SQLite async
pip install sqlalchemy aiosqlite

# SQLModel (wraps SQLAlchemy + Pydantic)
pip install sqlmodel

# Alembic for migrations
pip install alembic
```

## SQLAlchemy — Synchronous Setup

```python
# app/db/base.py
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "postgresql://user:password@localhost/mydb"
# For SQLite: "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    pool_size=10,        # Number of connections in pool
    max_overflow=20,     # Extra connections when pool is full
    echo=False,          # Log SQL (True for debugging)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
```

```python
# app/models/item.py
from sqlalchemy import String, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.db.base import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

```python
# app/db/dependency.py
from sqlalchemy.orm import Session
from app.db.base import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## SQLAlchemy — Async Setup

```python
# app/db/async_base.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:password@localhost/mydb"
# SQLite: "sqlite+aiosqlite:///./app.db"

async_engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit (important for async)
)


async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
        # Session auto-closes when async context exits
```

```python
# Usage in routes
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@app.get("/items")
async def list_items(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Item).where(Item.is_active == True))
    return result.scalars().all()


@app.get("/items/{item_id}")
async def get_item(item_id: int, db: AsyncSession = Depends(get_async_db)):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.post("/items", status_code=201)
async def create_item(
    data: ItemCreate,
    db: AsyncSession = Depends(get_async_db),
):
    item = Item(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)  # Load DB-generated fields (id, created_at)
    return item
```

## CRUD Layer Pattern

Abstract DB operations into a dedicated module — keeps routes thin:

```python
# app/crud/items.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate
from typing import Optional


async def get_item(db: AsyncSession, item_id: int) -> Optional[Item]:
    return await db.get(Item, item_id)


async def list_items(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
) -> list[Item]:
    stmt = select(Item)
    if active_only:
        stmt = stmt.where(Item.is_active == True)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_item(db: AsyncSession, item: ItemCreate) -> Item:
    db_item = Item(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


async def update_item(
    db: AsyncSession,
    item_id: int,
    patch: ItemUpdate,
) -> Optional[Item]:
    db_item = await db.get(Item, item_id)
    if not db_item:
        return None
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(db_item, field, value)
    await db.commit()
    await db.refresh(db_item)
    return db_item


async def delete_item(db: AsyncSession, item_id: int) -> bool:
    db_item = await db.get(Item, item_id)
    if not db_item:
        return False
    await db.delete(db_item)
    await db.commit()
    return True
```

```python
# app/routers/items.py — thin routes
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.async_base import get_async_db
from app.crud import items as crud
from app.schemas.item import ItemCreate, ItemUpdate, ItemPublic

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=list[ItemPublic])
async def list_items(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_async_db),
):
    return await crud.list_items(db, skip, limit)


@router.post("/", response_model=ItemPublic, status_code=201)
async def create_item(item: ItemCreate, db: AsyncSession = Depends(get_async_db)):
    return await crud.create_item(db, item)


@router.patch("/{item_id}", response_model=ItemPublic)
async def patch_item(item_id: int, patch: ItemUpdate, db: AsyncSession = Depends(get_async_db)):
    item = await crud.update_item(db, item_id, patch)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: int, db: AsyncSession = Depends(get_async_db)):
    if not await crud.delete_item(db, item_id):
        raise HTTPException(status_code=404, detail="Item not found")
```

## SQLModel — Pydantic + SQLAlchemy Unified

SQLModel eliminates the duplication between Pydantic schemas and SQLAlchemy models:

```python
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional
from datetime import datetime


# One class serves as both ORM model AND Pydantic schema
class ItemBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    price: float
    is_active: bool = True


class Item(ItemBase, table=True):
    """DB table model (table=True makes it an ORM model)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ItemCreate(ItemBase):
    """For POST /items body (no id, no created_at)."""
    pass


class ItemPublic(ItemBase):
    """For GET /items response (includes id)."""
    id: int
    created_at: datetime


# Create tables
engine = create_engine("sqlite:///./app.db")
SQLModel.metadata.create_all(engine)


# Dependency
def get_db():
    with Session(engine) as session:
        yield session


# Routes — same item class used throughout
@app.post("/items", response_model=ItemPublic)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item.model_validate(item)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
```

## Relationships (ORM)

```python
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    items: Mapped[list["Item"]] = relationship("Item", back_populates="owner")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User"] = relationship("User", back_populates="items")
```

**Async relationship loading** — relationships are lazy by default; use `selectinload` or `joinedload`:

```python
from sqlalchemy.orm import selectinload

@app.get("/users/{user_id}/items")
async def get_user_items(user_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(User)
        .options(selectinload(User.items))  # Eager load items
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)
    return user.items
```

## Alembic Migrations

```bash
# Initialize Alembic
alembic init alembic

# Edit alembic/env.py to import your models and Base
# from app.db.base import Base
# target_metadata = Base.metadata

# Generate a migration
alembic revision --autogenerate -m "add items table"

# Run migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

## Transactions

```python
from sqlalchemy.exc import IntegrityError


@app.post("/transfer")
async def transfer_funds(
    from_id: int,
    to_id: int,
    amount: float,
    db: AsyncSession = Depends(get_async_db),
):
    try:
        # Both ops in the same transaction
        source = await db.get(Account, from_id)
        dest = await db.get(Account, to_id)

        if source.balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient funds")

        source.balance -= amount
        dest.balance += amount

        await db.commit()  # Both changes committed together
        return {"status": "transferred"}

    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Transfer failed")
```

## Try It — Complete Mini-App

```python
# Complete async FastAPI + SQLAlchemy app
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import select, String
from pydantic import BaseModel
from typing import Optional


# ── DB Setup ──────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class TodoDB(Base):
    __tablename__ = "todos"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    done: Mapped[bool] = mapped_column(default=False)


engine = create_async_engine("sqlite+aiosqlite:///./todos.db")
Session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with Session() as session:
        yield session


# ── Pydantic Schemas ──────────────────────────────────────
class TodoCreate(BaseModel):
    title: str
    done: bool = False


class TodoPublic(TodoCreate):
    id: int
    model_config = {"from_attributes": True}


# ── App ───────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/todos", response_model=list[TodoPublic])
async def list_todos(done: Optional[bool] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(TodoDB)
    if done is not None:
        stmt = stmt.where(TodoDB.done == done)
    result = await db.execute(stmt)
    return result.scalars().all()


@app.post("/todos", response_model=TodoPublic, status_code=201)
async def create_todo(todo: TodoCreate, db: AsyncSession = Depends(get_db)):
    item = TodoDB(**todo.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@app.patch("/todos/{todo_id}", response_model=TodoPublic)
async def toggle_todo(todo_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(TodoDB, todo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.done = not item.done
    await db.commit()
    await db.refresh(item)
    return item
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is `expire_on_commit=False` and why is it needed in async SQLAlchemy?
2. **Why** use `await db.refresh(item)` after `await db.commit()`?
3. **When** should you use SQLModel vs separate SQLAlchemy models + Pydantic schemas?
4. **How** does `selectinload` differ from default lazy loading in async contexts?
5. **Compare**: SQLite for development vs PostgreSQL for production

<details>
<summary><strong>Answers</strong></summary>

1. **`expire_on_commit=False`**:
   - By default SQLAlchemy marks objects as "expired" after commit — accessing attributes triggers a new DB query
   - In async contexts, that implicit lazy re-fetch requires the session to still be open and is easily missed
   - `expire_on_commit=False` means committed objects retain their values — you can return them without another query

2. **`await db.refresh(item)` after commit**:
   - Commit writes to DB; DB may set server-default fields (`id`, `created_at`, auto-increment)
   - `refresh` re-reads the row from DB to load those generated fields into the Python object
   - Without it, `item.id` would be `None` on the returned object

3. **SQLModel vs SQLAlchemy + Pydantic**:
   - SQLModel: fewer classes, less duplication, ideal for small-to-medium FastAPI projects
   - Separate models: more control, clearer separation of concerns, better for large teams where DB model and API schema evolve independently
   - SQLModel breaks down in complex scenarios (multiple inheritance, advanced ORM features)

4. **`selectinload` vs lazy loading**:
   - Lazy loading: accessing `user.items` triggers a new implicit SQL query — not allowed in async without an open session
   - `selectinload`: issues a second explicit `SELECT ... WHERE user_id IN (...)` eagerly — loaded before the session closes
   - In async SQLAlchemy, you MUST use eager loading (`selectinload`, `joinedload`) for relationships

5. **SQLite vs PostgreSQL**:
   - SQLite: zero-config, file-based, great for dev/test, no concurrent writes (file lock), no advanced types
   - PostgreSQL: full concurrent write support, JSONB, arrays, full-text search, connection pooling via pgBouncer
   - Use `sqlite+aiosqlite:///./dev.db` in dev, `postgresql+asyncpg://` in production

</details>

## Common Mistakes

### ❌ Mistake 1: Async lazy loading relationship access

```python
# ❌ Accessing relationship in async context without eager loading
@app.get("/users/{id}/items")
async def get_user_items(id: int, db: AsyncSession = Depends(get_async_db)):
    user = await db.get(User, id)
    return user.items  # ❌ MissingGreenlet or lazy loading error!
```

✅ **Fix**: Use eager loading
```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(User).options(selectinload(User.items)).where(User.id == id)
)
user = result.scalar_one_or_none()
return user.items  # ✅ Already loaded
```

---

### ❌ Mistake 2: Using `Base.metadata.create_all()` instead of Alembic in production

```python
# ❌ Overwrites or misses schema changes
@asynccontextmanager
async def lifespan(app):
    await engine.run_sync(Base.metadata.create_all)  # OK for dev, not prod
    yield
```

✅ **Fix**: Use Alembic migrations for production — `create_all` doesn't handle schema evolution (column changes, renames, indexes)

---

### ❌ Mistake 3: Re-creating the engine on every request

```python
# ❌ New connection pool created per request
@app.get("/items")
async def list_items():
    engine = create_async_engine(DATABASE_URL)  # Very wrong!
    async with AsyncSession(engine) as db:
        ...
```

✅ **Fix**: Create engine once at module level or in lifespan
```python
engine = create_async_engine(DATABASE_URL, pool_size=10)
AsyncSessionLocal = async_sessionmaker(engine)
```

## How This Connects

**Builds on**:
- [Dependency Injection](./04-dependency-injection.md) — `get_db` is a `yield` dependency
- [Pydantic Models](./03-pydantic-models.md) — `from_attributes=True`, schema separation
- [Async Programming](../03-advanced/02-async-programming.md) — async engine and sessions
- [OOP Basics](../02-intermediate/01-oop-basics.md) — ORM models are classes

**Related concepts**:
- [Authentication & Security](./06-authentication-security.md) — user model in DB
- [Testing FastAPI](./08-testing-fastapi.md) — in-memory DB for tests
- [Deployment & Production](./09-deployment-production.md) — DATABASE_URL from env vars

**Next steps**:
- [Testing FastAPI](./08-testing-fastapi.md) — test your DB-backed routes

## Summary

**In 3 sentences**:
- SQLAlchemy (async or sync) connects FastAPI to any SQL database through the `get_db` generator dependency pattern — the `yield` ensures sessions are always closed, even on exceptions
- The CRUD layer pattern separates DB operations from route handlers, keeping routes thin and DB logic testable — Pydantic schemas bridge the gap between ORM objects and API responses via `from_attributes=True`
- Use Alembic for database migrations in production, eager loading (`selectinload`) for async relationship access, and always create the engine once at startup via the lifespan context manager
