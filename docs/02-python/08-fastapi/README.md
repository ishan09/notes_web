# FastAPI — Modern Python Web APIs

> **Prerequisites**: You should be comfortable with [Type Hints](../03-advanced/01-type-hints.md), [Async Programming](../03-advanced/02-async-programming.md), [OOP Basics](../02-intermediate/01-oop-basics.md), and [Dataclasses](../02-intermediate/02-dataclasses.md). FastAPI is the intersection of all of them.

## What Is FastAPI?

FastAPI is a modern, high-performance Python web framework for building HTTP APIs. It is built on top of **Starlette** (ASGI web toolkit) and **Pydantic** (data validation), and generates **OpenAPI/Swagger documentation automatically** from your type hints.

**Key strengths**:
- Extremely fast — on par with Node.js and Go for async I/O
- Type hints drive validation, serialization, and docs with zero extra work
- Native async/await support
- Auto-generated interactive docs at `/docs` (Swagger) and `/redoc` (ReDoc)
- Production-grade security utilities built in

---

## Learning Path

### Phase 1 — Core Mechanics

1. [FastAPI Introduction](./01-fastapi-intro.md) — Installation, first app, how it compares to Flask/Django
2. [Routing & Path Operations](./02-routing-path-operations.md) — HTTP methods, path/query params, response types, status codes
3. [Pydantic Models](./03-pydantic-models.md) — Request bodies, response schemas, validation, nested models

**Time**: ~3–4 hours | **Goal**: Can you build a CRUD API with validated request/response bodies?

---

### Phase 2 — Advanced Patterns

4. [Dependency Injection](./04-dependency-injection.md) — `Depends()`, reusable auth/db logic, scoped resources
5. [Async & Background Tasks](./05-async-background-tasks.md) — Async routes, `BackgroundTasks`, lifespan events
6. [Authentication & Security](./06-authentication-security.md) — OAuth2, JWT, API keys, middleware, CORS

**Time**: ~4–6 hours | **Goal**: Can you build an authenticated async API with background jobs?

---

### Phase 3 — Production

7. [Database Integration](./07-database-integration.md) — SQLAlchemy, SQLModel, async sessions, migrations
8. [Testing FastAPI](./08-testing-fastapi.md) — `TestClient`, `AsyncClient`, fixtures, mocking dependencies
9. [Deployment & Production](./09-deployment-production.md) — Uvicorn, Gunicorn, Docker, health checks, env config

**Time**: ~4–5 hours | **Goal**: Can you ship a tested, Dockerized FastAPI service?

---

## How FastAPI Connects to What You Already Know

| What you know | How FastAPI uses it |
|---|---|
| [Type Hints](../03-advanced/01-type-hints.md) | Every parameter and return type drives validation and docs automatically |
| [Dataclasses](../02-intermediate/02-dataclasses.md) | Pydantic `BaseModel` replaces `@dataclass` with runtime validation |
| [Async Programming](../03-advanced/02-async-programming.md) | `async def` route handlers run on asyncio event loop — zero extra config |
| [Decorators](../03-advanced/04-decorators.md) | `@app.get("/path")` is a decorator that registers a route handler |
| [OOP Basics](../02-intermediate/01-oop-basics.md) | Pydantic models are classes; routers are objects; dependencies are callables |
| [Error Handling](../02-intermediate/04-error-handling.md) | `HTTPException` replaces generic exceptions; exception handlers customize responses |
| [pytest](../04-testing-quality/01-pytest.md) | `TestClient` and `AsyncClient` wrap your app in a HTTPX test session |

---

## Quick Mental Model

```
HTTP Request
    │
    ▼
FastAPI Router (matches path + method)
    │
    ▼
Dependency Injection (auth, db session, rate limit...)
    │
    ▼
Route Handler (async def) — Pydantic validates request body
    │
    ▼
Business Logic / DB
    │
    ▼
Pydantic serializes response — FastAPI returns JSON
    │
    ▼
HTTP Response
```

---

## Expert Questions

See [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md) for advanced FastAPI questions covering Starlette internals, Pydantic v2 migration, async DB patterns, and production architecture.
