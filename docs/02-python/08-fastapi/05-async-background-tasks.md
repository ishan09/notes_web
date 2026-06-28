# Async & Background Tasks

> **Before you start**: Review [Async Programming](../03-advanced/02-async-programming.md) and [Dependency Injection](./04-dependency-injection.md). This note explains how FastAPI's async model works and how to defer work out of the request-response cycle.

## FastAPI's Async Model

FastAPI runs on **Uvicorn** (an ASGI server) which runs on **asyncio**. This means:

- All requests run in a single asyncio event loop (by default)
- `async def` route handlers are coroutines — they yield control while waiting for I/O
- **Many requests can be "in flight" concurrently** even though Python has the GIL
- Blocking I/O (synchronous DB calls, `requests.get()`) blocks the event loop and kills throughput

```
Time →
Request 1: [parse]...[await DB]...[serialize]
Request 2:         [parse]...[await DB]...[serialize]
Request 3:                [parse]...[await DB]...[serialize]

All three are handled by ONE thread, ONE event loop.
While req 1 awaits DB, req 2 and 3 make progress.
```

## `async def` vs `def` in FastAPI

FastAPI supports both:

```python
# async def — runs directly on the event loop
# Use when: making async DB calls, async HTTP calls, await-ing anything
@app.get("/items/async")
async def list_items_async():
    result = await db.execute(select(Item))  # non-blocking
    return result.scalars().all()


# def — FastAPI runs this in a thread pool executor automatically
# Use when: using synchronous libraries (psycopg2, boto3, PIL)
@app.get("/items/sync")
def list_items_sync():
    return db_sync.query(Item).all()  # blocking, but in thread so OK
```

**Rule of thumb**:
- Use `async def` when your route uses async libraries (`httpx`, `asyncpg`, `motor`, `aiofiles`)
- Use `def` (not `async def`) when using synchronous libraries — FastAPI handles threadpool offloading
- Never put blocking calls inside `async def` — it blocks the entire event loop

## Async HTTP Calls with httpx

```python
import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/weather")
async def get_weather(city: str) -> dict:
    # httpx.AsyncClient is the async equivalent of requests.Session
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.weather.example.com/current",
            params={"city": city},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


# Multiple concurrent calls — much faster than sequential
@app.get("/multi-weather")
async def get_multi_weather(cities: list[str]) -> dict:
    import asyncio

    async with httpx.AsyncClient() as client:
        tasks = [
            client.get("https://api.weather.example.com/current", params={"city": c})
            for c in cities
        ]
        responses = await asyncio.gather(*tasks)
        return {
            city: resp.json()
            for city, resp in zip(cities, responses)
        }
```

## LLM Streaming with FastAPI

A key use case: streaming LLM responses to the client in real time.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from anthropic import AsyncAnthropic
import json

app = FastAPI()
client = AsyncAnthropic()


@app.post("/chat")
async def chat_stream(message: str):
    async def generate():
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": message}],
        ) as stream:
            async for text in stream.text_stream:
                # Server-Sent Events format
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
```

## Background Tasks

`BackgroundTasks` runs a function **after the response is sent** — useful for:
- Sending emails
- Writing audit logs
- Triggering async jobs
- Cache invalidation

```python
from fastapi import FastAPI, BackgroundTasks
import time

app = FastAPI()


def send_welcome_email(email: str, username: str):
    """Runs after response is sent — doesn't delay the user."""
    time.sleep(2)  # Simulate slow email API
    print(f"Email sent to {email} for {username}")


def write_audit_log(action: str, user_id: int):
    print(f"AUDIT: user {user_id} performed {action}")


@app.post("/users", status_code=201)
def create_user(
    username: str,
    email: str,
    background_tasks: BackgroundTasks,
):
    user = {"id": 1, "username": username, "email": email}  # Save to DB

    background_tasks.add_task(send_welcome_email, email=email, username=username)
    background_tasks.add_task(write_audit_log, action="user_created", user_id=user["id"])

    return user  # Response sent immediately — emails happen in background
```

**Important limitations of `BackgroundTasks`**:
- Runs in the same process as the web server
- If the server restarts mid-task, the task is lost
- Not suitable for long-running or distributed tasks
- Use Celery, Redis Queue, or Cloud Tasks for durable background work

## Lifespan Events — Startup & Shutdown

FastAPI's lifespan context manager lets you run setup/teardown code around the entire app:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncpg
import httpx
import torch


# --- Shared state across requests ---
app_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────────────────────
    print("Starting up...")

    # Database connection pool
    app_state["db_pool"] = await asyncpg.create_pool(
        dsn="postgresql://user:pass@localhost/mydb",
        min_size=5,
        max_size=20,
    )

    # Shared HTTP client (reuse connections)
    app_state["http_client"] = httpx.AsyncClient(timeout=30.0)

    # Load ML model once at startup
    app_state["model"] = torch.load("model.pt", map_location="cpu")
    app_state["model"].eval()

    print("Startup complete.")

    yield  # ← Application runs here

    # ── SHUTDOWN ─────────────────────────────────────────
    print("Shutting down...")
    await app_state["db_pool"].close()
    await app_state["http_client"].aclose()
    print("Shutdown complete.")


app = FastAPI(lifespan=lifespan)


@app.get("/predict")
async def predict(text: str):
    model = app_state["model"]
    # Use the pre-loaded model
    return {"prediction": "positive"}


@app.get("/external")
async def call_external():
    client = app_state["http_client"]
    resp = await client.get("https://api.example.com/data")
    return resp.json()
```

## Async Generators for Streaming Responses

```python
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()


async def generate_csv_rows(rows: list[dict]):
    """Yield CSV rows one at a time — no need to build entire file in memory."""
    yield "id,name,price\n"
    for row in rows:
        await asyncio.sleep(0)  # Yield control briefly between rows
        yield f"{row['id']},{row['name']},{row['price']}\n"


@app.get("/export/products.csv")
async def export_products():
    rows = await fetch_all_products_from_db()  # Could be 100k rows
    return StreamingResponse(
        generate_csv_rows(rows),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"},
    )
```

## Concurrency Patterns — Gather & TaskGroup

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()


@app.get("/dashboard")
async def dashboard(user_id: int):
    """Fetch all dashboard data concurrently."""

    # asyncio.gather — run all coroutines concurrently
    user, orders, recommendations = await asyncio.gather(
        fetch_user(user_id),
        fetch_orders(user_id),
        fetch_recommendations(user_id),
    )

    return {"user": user, "orders": orders, "recommendations": recommendations}


@app.get("/dashboard/v2")
async def dashboard_v2(user_id: int):
    """Python 3.11+ TaskGroup — better error handling."""

    async with asyncio.TaskGroup() as tg:
        user_task = tg.create_task(fetch_user(user_id))
        orders_task = tg.create_task(fetch_orders(user_id))
        recs_task = tg.create_task(fetch_recommendations(user_id))

    # If ANY task raises, all others are cancelled
    return {
        "user": user_task.result(),
        "orders": orders_task.result(),
        "recommendations": recs_task.result(),
    }
```

## Timeouts and Cancellation

```python
import asyncio
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/slow-operation")
async def slow_operation():
    try:
        result = await asyncio.wait_for(
            do_expensive_computation(),
            timeout=5.0,  # Give up after 5 seconds
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Operation timed out")


async def do_expensive_computation():
    await asyncio.sleep(10)  # Simulates slow work
    return {"result": "done"}
```

## WebSocket Support

FastAPI supports WebSockets for real-time bidirectional communication (e.g., chat, live metrics):

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active_connections.remove(ws)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(ws: WebSocket, client_id: str):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            await manager.broadcast(f"Client {client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(ws)
        await manager.broadcast(f"Client {client_id} disconnected")
```

## Try It

```python
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import asyncio
import httpx
import time

results: list[str] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient()
    print("HTTP client ready")
    yield
    await app.state.http_client.aclose()
    print("HTTP client closed")


app = FastAPI(lifespan=lifespan)


def log_request(path: str, duration_ms: float):
    results.append(f"{path} took {duration_ms:.0f}ms")
    print(f"Logged: {path} {duration_ms:.0f}ms")


@app.get("/fast")
async def fast_endpoint(background_tasks: BackgroundTasks):
    start = time.time()
    await asyncio.sleep(0.1)  # Simulate fast async work
    background_tasks.add_task(log_request, "/fast", (time.time() - start) * 1000)
    return {"message": "fast response"}


@app.get("/stream")
async def stream_numbers():
    async def generate():
        for i in range(10):
            await asyncio.sleep(0.2)
            yield f"data: {i}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/logs")
def get_logs():
    return {"logs": results}
```

## Self-Check Questions

> Answer from memory before checking

1. **What** happens if you put a blocking `time.sleep(5)` inside an `async def` route?
2. **Why** does FastAPI run `def` (non-async) routes in a thread pool?
3. **When** should you use `BackgroundTasks` vs a proper task queue like Celery?
4. **How** does `asyncio.gather()` differ from calling coroutines sequentially?
5. **Compare**: Lifespan startup vs module-level initialization

<details>
<summary><strong>Answers</strong></summary>

1. **Blocking in `async def`**:
   - `time.sleep(5)` blocks the entire event loop thread
   - No other requests can be processed for 5 seconds
   - Under 100 concurrent requests, throughput drops to 20 req/s maximum
   - Fix: use `await asyncio.sleep(5)` or offload to `run_in_executor`

2. **Why `def` routes get a thread pool**:
   - FastAPI uses `asyncio.get_event_loop().run_in_executor(None, handler)` for sync routes
   - The blocking function runs in a thread, which doesn't block the event loop
   - Other async routes continue to be served while the thread does its work
   - This is why you should not use `async def` for blocking synchronous code

3. **`BackgroundTasks` vs Celery**:
   - `BackgroundTasks`: in-process, ephemeral, simple — use for fire-and-forget tasks that can be lost if server restarts (email notifications, optional audit logs)
   - Celery / Redis Queue: separate process, durable, retryable — use for tasks that must complete, have failures to handle, or run on a schedule (payment processing, report generation)

4. **`gather()` vs sequential**:
   - Sequential: `await a()` then `await b()` → total time = a_time + b_time
   - `await gather(a(), b())` → total time = max(a_time, b_time)
   - gather runs all coroutines concurrently on the same event loop

5. **Lifespan vs module-level init**:
   - Module-level: runs at import time — hard to test, can't use `await`, affects test imports
   - Lifespan: runs when app actually starts, supports async, can be mocked in tests with `TestClient`

</details>

## Common Mistakes

### ❌ Mistake 1: Blocking the event loop in async code

```python
# ❌ Blocks event loop for all other requests
@app.get("/slow")
async def slow():
    import requests
    resp = requests.get("https://api.example.com/data")  # Blocking!
    return resp.json()
```

✅ **Fix**: Use async HTTP client
```python
@app.get("/slow")
async def slow():
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.example.com/data")
    return resp.json()
```

---

### ❌ Mistake 2: Creating a new HTTP client per request

```python
# ❌ New TCP connection per request — slow and resource-intensive
@app.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:   # New connection every time
        return await client.get("https://api.example.com/data")
```

✅ **Fix**: Create the client once at startup, reuse it
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.client = httpx.AsyncClient()
    yield
    await app.state.client.aclose()


@app.get("/data")
async def get_data(request: Request):
    client = request.app.state.client   # Shared client, reused connections
    return await client.get("https://api.example.com/data")
```

---

### ❌ Mistake 3: Using `async def` for CPU-bound work

```python
# ❌ async def doesn't help with CPU work — still blocks the event loop
@app.post("/compute")
async def heavy_compute(data: list[float]):
    result = run_numpy_computation(data)  # CPU-bound, blocks event loop
    return result
```

✅ **Fix**: Offload CPU work to a thread or process pool
```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

executor = ProcessPoolExecutor()

@app.post("/compute")
async def heavy_compute(data: list[float]):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, run_numpy_computation, data)
    return result
```

## How This Connects

**Builds on**:
- [Async Programming](../03-advanced/02-async-programming.md) — asyncio, coroutines, tasks
- [Context Managers](../03-advanced/03-context-managers.md) — lifespan is an `@asynccontextmanager`
- [Dependency Injection](./04-dependency-injection.md) — async dependencies with `yield`

**Related concepts**:
- [Authentication & Security](./06-authentication-security.md) — async token validation
- [Database Integration](./07-database-integration.md) — async SQLAlchemy sessions
- [AI Agents](../07-ai-agents/) — streaming LLM responses via FastAPI

**Next steps**:
- [Authentication & Security](./06-authentication-security.md) — protect your async routes

## Summary

**In 3 sentences**:
- FastAPI runs on an asyncio event loop — `async def` routes yield control during I/O (non-blocking), while `def` routes automatically run in a thread pool, but neither should perform blocking I/O inside `async def`
- `BackgroundTasks` defers work until after the response is sent, ideal for notifications and audit logging, while the lifespan context manager handles startup/shutdown of shared resources like DB pools and HTTP clients
- For streaming responses and LLM output, `StreamingResponse` with async generators enables true real-time data delivery without buffering the entire response in memory
