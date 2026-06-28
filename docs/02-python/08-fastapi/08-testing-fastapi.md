# Testing FastAPI

> **Before you start**: Review [pytest](../04-testing-quality/01-pytest.md) for fixtures and parametrization basics. FastAPI's `TestClient` and `AsyncClient` extend those patterns.

## Why Testing FastAPI Is Easy

FastAPI was designed with testability in mind:
- **`TestClient`** wraps your app in a synchronous HTTP test client — no server needed
- **`AsyncClient`** (httpx-based) for async route testing
- **`dependency_overrides`** lets you replace any dependency (DB, auth, ML model) with a mock
- The app object is just a Python object — import it, override deps, test

## TestClient — Synchronous Testing

```bash
pip install httpx pytest
```

```python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float


items: list[dict] = []


@app.get("/items")
def list_items():
    return items


@app.post("/items", status_code=201)
def create_item(item: Item):
    data = {"id": len(items) + 1, **item.model_dump()}
    items.append(data)
    return data
```

```python
# tests/test_items.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_items_empty():
    response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == []


def test_create_item():
    response = client.post("/items", json={"name": "Widget", "price": 9.99})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget"
    assert data["price"] == 9.99
    assert "id" in data


def test_create_item_invalid():
    # Missing required field
    response = client.post("/items", json={"name": "Widget"})
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(e["loc"][-1] == "price" for e in errors)


def test_list_items_after_create():
    # Reset state first (see fixtures section)
    client.post("/items", json={"name": "Gadget", "price": 19.99})
    response = client.get("/items")
    assert response.status_code == 200
    names = [i["name"] for i in response.json()]
    assert "Gadget" in names
```

**Run tests**:
```bash
pytest tests/ -v
pytest tests/test_items.py::test_create_item -v   # Single test
pytest tests/ -v --tb=short                       # Short tracebacks
```

## Fixtures — Isolation Between Tests

Tests sharing mutable state (like `items = []`) can interfere. Use pytest fixtures:

```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from main import app, items  # Import the shared state


@pytest.fixture(autouse=True)
def clean_items():
    """Clear items list before each test."""
    items.clear()
    yield
    items.clear()  # Clean up after too


@pytest.fixture
def client():
    return TestClient(app)
```

**Database fixture** (use in-memory SQLite in tests):

```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test.db"  # or "sqlite://" for in-memory

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Fresh DB for each test."""
    Base.metadata.create_all(test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

## Dependency Overrides — Mocking Auth and Services

The killer feature for testability — swap any dependency without changing source code:

```python
# app/main.py
from fastapi import FastAPI, Depends
from app.dependencies import get_current_user, get_db
from app.models import User

app = FastAPI()


@app.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return user
```

```python
# tests/test_auth.py
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user
from app.models import User
import pytest


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def authenticated_client():
    """Client with auth bypassed."""
    fake_user = User(id=1, username="testuser", email="test@example.com")

    app.dependency_overrides[get_current_user] = lambda: fake_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_me_unauthenticated(client):
    response = client.get("/me")
    assert response.status_code == 401


def test_me_authenticated(authenticated_client):
    response = authenticated_client.get("/me")
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
```

## Async Testing

For `async def` routes you can still use `TestClient` (it handles the event loop internally). For tests that themselves need to be async:

```bash
pip install pytest-asyncio httpx
```

```python
# conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
```

```python
# tests/test_async.py
import pytest


@pytest.mark.asyncio
async def test_list_items(async_client):
    response = await async_client.get("/items")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_and_fetch(async_client):
    # Create
    response = await async_client.post("/items", json={"name": "Widget", "price": 9.99})
    assert response.status_code == 201
    item_id = response.json()["id"]

    # Fetch
    response = await async_client.get(f"/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Widget"
```

**pytest.ini** or `pyproject.toml` for asyncio mode:

```ini
# pytest.ini
[pytest]
asyncio_mode = auto  # All async tests are automatically treated as asyncio
```

## Testing Authenticated Routes

```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token
from app.dependencies import get_current_user
from app.models import User


@pytest.fixture
def admin_user():
    return User(id=1, username="admin", email="admin@test.com", is_admin=True)


@pytest.fixture
def regular_user():
    return User(id=2, username="user", email="user@test.com", is_admin=False)


@pytest.fixture
def admin_client(admin_user):
    app.dependency_overrides[get_current_user] = lambda: admin_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def user_client(regular_user):
    app.dependency_overrides[get_current_user] = lambda: regular_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

```python
# tests/test_permissions.py
def test_admin_can_delete(admin_client):
    response = admin_client.delete("/items/1")
    assert response.status_code in (204, 404)  # 404 if item doesn't exist


def test_user_cannot_delete(user_client):
    response = user_client.delete("/items/1")
    assert response.status_code == 403
```

## Testing File Uploads

```python
# Route
from fastapi import File, UploadFile

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    return {"filename": file.filename, "size": len(content)}
```

```python
# Test
def test_file_upload(client):
    file_content = b"Hello, world!"
    response = client.post(
        "/upload",
        files={"file": ("test.txt", file_content, "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "test.txt"
    assert response.json()["size"] == len(file_content)
```

## Parametrized Tests

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.mark.parametrize("payload,expected_status,expected_field", [
    ({"name": "Widget", "price": 9.99}, 201, None),
    ({"name": "", "price": 9.99}, 422, "name"),
    ({"name": "Widget", "price": -1}, 422, "price"),
    ({"name": "Widget"}, 422, "price"),       # Missing required
    ({}, 422, None),                            # Empty body
])
def test_create_item_validation(payload, expected_status, expected_field):
    response = client.post("/items", json=payload)
    assert response.status_code == expected_status
    if expected_field:
        errors = response.json()["detail"]
        assert any(e["loc"][-1] == expected_field for e in errors)
```

## Testing Background Tasks

```python
# Route with background task
from fastapi import BackgroundTasks

sent_emails: list[str] = []

def send_email(to: str):
    sent_emails.append(to)

@app.post("/users")
def create_user(email: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_email, email)
    return {"email": email}
```

```python
# Test — TestClient runs background tasks synchronously
def test_background_task(client):
    sent_emails.clear()

    response = client.post("/users", json={"email": "test@example.com"})
    assert response.status_code == 200

    # Background task already ran (TestClient is sync)
    assert "test@example.com" in sent_emails
```

## Testing Streaming Responses

```python
def test_stream_response(client):
    with client.stream("GET", "/stream") as response:
        assert response.status_code == 200
        chunks = list(response.iter_lines())
        assert len(chunks) > 0
```

## Full Test Structure Example

```
project/
├── app/
│   ├── main.py
│   ├── routers/items.py
│   ├── crud/items.py
│   ├── models/item.py
│   └── dependencies.py
└── tests/
    ├── conftest.py          # Fixtures: db, client, auth overrides
    ├── test_items.py        # CRUD route tests
    ├── test_auth.py         # Auth flow tests
    └── test_validation.py   # Input validation tests
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is `dependency_overrides` and why is it the preferred way to mock in FastAPI tests?
2. **Why** does `TestClient` run background tasks synchronously (unlike production)?
3. **When** should you use `AsyncClient` instead of `TestClient`?
4. **How** do you test a route that requires a database without hitting a real DB?
5. **Compare**: `scope="function"` vs `scope="session"` for DB fixtures

<details>
<summary><strong>Answers</strong></summary>

1. **`dependency_overrides`**:
   - `app.dependency_overrides[real_dep] = mock_dep` globally replaces the dependency for the duration of the test
   - No monkey-patching needed — you're using FastAPI's own DI system
   - Can swap auth, DB session, ML model, external API client — anything declared with `Depends()`
   - Always clear overrides after each test to avoid contaminating other tests

2. **Background tasks in TestClient**:
   - `TestClient` is backed by `starlette.testclient.TestClient` which runs everything synchronously in the same thread
   - Background tasks run inline before `TestClient` returns the response — this is intentional for testability
   - In production (`uvicorn`), they run async after the response is sent

3. **`AsyncClient` vs `TestClient`**:
   - `TestClient` wraps the ASGI app synchronously — works for most cases
   - `AsyncClient` needed when test itself must be `async` (e.g., testing async DB operations directly alongside route tests)
   - Also useful when testing WebSocket connections or streaming responses in async fashion

4. **Testing with DB**:
   - Create an in-memory SQLite engine (or file-based SQLite for isolation)
   - Override `get_db` dependency to return a session connected to that engine
   - Reset schema between tests with `create_all`/`drop_all`
   - In-memory SQLite is fast and requires no external service

5. **`scope="function"` vs `scope="session"`**:
   - `scope="function"`: fresh DB for each test — full isolation, slower (recreates tables each time)
   - `scope="session"`: one DB for all tests in the session — faster but tests can interfere
   - For unit tests: `function` scope; for integration tests: `session` scope with careful cleanup

</details>

## Common Mistakes

### ❌ Mistake 1: Forgetting to clear `dependency_overrides`

```python
# ❌ Override leaks into subsequent tests
def test_admin_route(client):
    app.dependency_overrides[get_current_user] = lambda: admin_user
    response = client.get("/admin")
    # No cleanup! Next test also gets admin_user
```

✅ **Fix**: Use a fixture that cleans up, or use `addCleanup`
```python
@pytest.fixture
def admin_client():
    app.dependency_overrides[get_current_user] = lambda: admin_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()  # Always runs
```

---

### ❌ Mistake 2: Testing the wrong thing — asserting implementation, not behavior

```python
# ❌ Tests internal state, not the HTTP contract
def test_create_item():
    client.post("/items", json={"name": "Widget", "price": 9.99})
    assert len(items) == 1   # Testing implementation detail
```

✅ **Fix**: Test what the API returns
```python
def test_create_item():
    response = client.post("/items", json={"name": "Widget", "price": 9.99})
    assert response.status_code == 201
    assert response.json()["name"] == "Widget"  # Test the HTTP contract
```

---

### ❌ Mistake 3: Not testing error responses

```python
# ❌ Only happy path tested
def test_get_item():
    response = client.get("/items/1")
    assert response.status_code == 200
```

✅ **Fix**: Test 404 and 422 cases too
```python
def test_get_item_not_found():
    response = client.get("/items/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_get_item_invalid_id():
    response = client.get("/items/not_an_int")
    assert response.status_code == 422
```

## How This Connects

**Builds on**:
- [pytest](../04-testing-quality/01-pytest.md) — fixtures, parametrization, conftest
- [Dependency Injection](./04-dependency-injection.md) — `dependency_overrides`
- [Pydantic Models](./03-pydantic-models.md) — validating test request/response bodies

**Related concepts**:
- [Database Integration](./07-database-integration.md) — DB fixtures, in-memory SQLite
- [Authentication & Security](./06-authentication-security.md) — overriding auth in tests
- [Deployment & Production](./09-deployment-production.md) — CI/CD runs tests before deploy

**Next steps**:
- [Deployment & Production](./09-deployment-production.md) — deploy your tested app

## Summary

**In 3 sentences**:
- FastAPI's `TestClient` provides a synchronous HTTP interface to your app — no server needed, background tasks run inline, and the full request/response cycle executes, including middleware and dependency resolution
- `dependency_overrides` is the correct way to mock in FastAPI tests — replace the real DB, auth, or external service with a fake without touching source code, and always clear overrides in fixture teardown
- Test the HTTP contract (status codes, response JSON) not internal state, cover both success and error paths, and use parametrize for systematic validation testing across many input combinations
