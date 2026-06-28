# Deployment & Production

> **Before you start**: Review [Testing FastAPI](./08-testing-fastapi.md) — you should have passing tests before deploying. Also review [Authentication & Security](./06-authentication-security.md) for secret management.

## ASGI Server Setup

FastAPI is an ASGI app — it needs an ASGI server to run. Two options:

### Uvicorn — Development and Simple Production

```bash
# Development (single process, auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production (single process, no reload)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

### Gunicorn + Uvicorn Workers — Multi-Process Production

```bash
pip install "uvicorn[standard]" gunicorn

# Production: 4 workers, each running Uvicorn
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --graceful-timeout 30 \
  --keep-alive 5
```

**How many workers?** Start with `2 * CPU_COUNT + 1`:
```bash
gunicorn main:app -w $(( 2 * $(nproc) + 1 )) -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Environment Configuration

Never hardcode secrets. Use environment variables loaded by `pydantic-settings`:

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn
from typing import Optional


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    workers: int = 1

    # Security
    secret_key: str                           # Required — must be set
    allowed_origins: list[str] = ["*"]        # Tighten in production

    # Database
    database_url: PostgresDsn

    # Optional
    redis_url: Optional[str] = None
    sentry_dsn: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
```

**.env** (never commit to git):
```bash
SECRET_KEY=your-256-bit-random-secret-here
DATABASE_URL=postgresql+asyncpg://myuser:mypassword@localhost:5432/mydb
DEBUG=false
ALLOWED_ORIGINS=["https://myapp.com"]
```

**.env.example** (commit this):
```bash
SECRET_KEY=replace-with-secure-random-secret
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
DEBUG=false
```

## Docker Setup

### Dockerfile

```dockerfile
# Multi-stage build for smaller images
FROM python:3.12-slim AS base

WORKDIR /app

# Install dependencies layer (cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY main.py .

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --group appgroup
USER appgroup

# Don't run as root
EXPOSE 8000

# Production command (no --reload)
CMD ["gunicorn", "main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

### docker-compose.yml — Local Development Stack

```yaml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgresql+asyncpg://myuser:mypassword@db:5432/mydb
      - DEBUG=false
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Build and run
docker-compose up --build

# Production: detached
docker-compose up -d
```

## Health Checks

Every production service must expose health endpoints:

```python
from fastapi import FastAPI, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_async_db
from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str   # "ok" | "degraded" | "down"
    version: str
    checks: dict[str, str]


@app.get("/health/live", status_code=200)
def liveness():
    """Kubernetes liveness probe — is the process alive?"""
    return {"status": "ok"}


@app.get("/health/ready", response_model=HealthStatus)
async def readiness(response: Response):
    """Kubernetes readiness probe — can we serve traffic?"""
    checks = {}
    overall = "ok"

    # Database check
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        overall = "degraded"

    # Redis check (if used)
    # try:
    #     await redis_client.ping()
    #     checks["redis"] = "ok"
    # except Exception as e:
    #     checks["redis"] = f"error: {e}"
    #     overall = "degraded"

    if overall != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthStatus(
        status=overall,
        version="1.2.3",
        checks=checks,
    )
```

**Docker health check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1
```

## Logging

Structured JSON logging for production (readable by log aggregators like Datadog, Splunk):

```python
# app/core/logging.py
import logging
import json
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO"):
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=getattr(logging, log_level), handlers=[handler])


# In main.py
import logging
from app.core.logging import setup_logging

setup_logging(log_level=settings.log_level)
logger = logging.getLogger(__name__)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }
    )
    return response
```

## Sentry Error Tracking

```bash
pip install sentry-sdk[fastapi]
```

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    integrations=[
        FastApiIntegration(transaction_style="endpoint"),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,   # 10% of requests traced
    environment="production",
    release="myapp@1.2.3",
)
```

## Database Migrations in Production

```bash
# Run migrations before starting the app
alembic upgrade head && gunicorn main:app ...

# Or in entrypoint.sh:
#!/bin/bash
set -e
echo "Running migrations..."
alembic upgrade head
echo "Starting server..."
exec gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Dockerfile with entrypoint**:
```dockerfile
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
```

## Graceful Shutdown

FastAPI/Starlette handles SIGTERM gracefully with the lifespan pattern:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init resources
    app.state.db_pool = await create_db_pool()
    app.state.cache = await create_redis_pool()
    logger.info("Application started")

    yield  # ← Handle requests

    # Shutdown: close resources (triggered by SIGTERM)
    await app.state.db_pool.close()
    await app.state.cache.close()
    logger.info("Application shut down cleanly")
```

Uvicorn handles SIGTERM by stopping new connections and letting in-flight requests complete before exit (`--graceful-timeout`).

## Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi-app
  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      containers:
        - name: api
          image: myregistry/fastapi-app:v1.2.3
          ports:
            - containerPort: 8000
          env:
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: secret-key
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Production Checklist

```
✅ Security
   - [ ] SECRET_KEY from env var (never hardcoded)
   - [ ] Database URL from env var
   - [ ] HTTPS enforced (via load balancer or HTTPS redirect middleware)
   - [ ] CORS restricted to known origins
   - [ ] Rate limiting on auth and public endpoints
   - [ ] Docs endpoint disabled in production (docs_url=None)
   - [ ] Security headers middleware installed

✅ Performance
   - [ ] Multiple Uvicorn workers via Gunicorn
   - [ ] Connection pooling configured (pool_size, max_overflow)
   - [ ] Shared HTTP client (httpx.AsyncClient in lifespan)
   - [ ] Response caching for expensive endpoints
   - [ ] async routes for all I/O-bound operations

✅ Reliability
   - [ ] Health check endpoints (/health/live, /health/ready)
   - [ ] Graceful shutdown via lifespan
   - [ ] Database migrations run before server start
   - [ ] Retry logic for external API calls
   - [ ] Circuit breaker for downstream services

✅ Observability
   - [ ] Structured JSON logging
   - [ ] Request ID in every log line
   - [ ] Sentry (or equivalent) error tracking
   - [ ] Metrics endpoint (Prometheus) for /metrics
   - [ ] Tracing (OpenTelemetry) for distributed systems

✅ Docker / CI
   - [ ] Non-root user in Dockerfile
   - [ ] Multi-stage build for smaller images
   - [ ] .dockerignore excludes .env, __pycache__, tests/
   - [ ] Docker health check configured
   - [ ] Tests pass in CI before image is built
   - [ ] Image tags are immutable (commit SHA, not :latest)
```

## Disabling Docs in Production

```python
from app.core.config import settings

app = FastAPI(
    title="My API",
    # Disable Swagger and ReDoc in production
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between Uvicorn alone vs Gunicorn + Uvicorn workers?
2. **Why** should the Dockerfile user not be `root`?
3. **When** should `/health/live` return 200 vs `/health/ready` return 503?
4. **How** do you ensure database migrations run before the API starts serving traffic?
5. **Compare**: environment variables vs `.env` file for secrets in production

<details>
<summary><strong>Answers</strong></summary>

1. **Uvicorn alone vs Gunicorn + Uvicorn workers**:
   - Uvicorn alone: single process → one event loop → limited to one CPU core for Python code
   - Gunicorn + Uvicorn workers: N processes, each with their own event loop → uses N CPU cores
   - Gunicorn acts as a process manager — restarts crashed workers, handles signals, manages process pool
   - In production, always use Gunicorn (or a container orchestrator) to manage multiple Uvicorn processes

2. **Non-root user in Docker**:
   - If the container is compromised, root access means the attacker can mount host filesystems, escape the container
   - Non-root limits the blast radius — attacker can only access the app's files and processes
   - Required by many security scanners and Kubernetes security policies (PodSecurityPolicy, OPA)

3. **Liveness vs Readiness**:
   - `/health/live` — "Is the process alive?" Returns 200 as long as the process can respond at all. Failing this causes the container to be restarted.
   - `/health/ready` — "Can I serve traffic?" Returns 503 if DB is down, cache is unreachable, etc. Failing this removes the pod from the load balancer until it recovers. Never restarts the container.

4. **Migrations before traffic**:
   - Use an `entrypoint.sh` script: `alembic upgrade head && exec gunicorn ...`
   - Or Kubernetes init containers that run migrations before the app container starts
   - Never rely on app startup to run migrations — multiple replicas could run them concurrently, causing conflicts

5. **Env vars vs `.env` file in production**:
   - `.env` file: convenient for local dev, but should never exist in production containers (risk of being copied into image)
   - Env vars: injected by the container runtime (Kubernetes Secrets, Docker secrets, Cloud provider secret manager)
   - In K8s: use `secretKeyRef` to mount secrets as environment variables — never put `.env` files in Docker images

</details>

## Common Mistakes

### ❌ Mistake 1: Enabling docs in production

```python
app = FastAPI()  # ❌ /docs and /openapi.json are public
```

✅ **Fix**: Disable in production
```python
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
```

---

### ❌ Mistake 2: Using `--reload` in the Dockerfile

```dockerfile
CMD ["uvicorn", "main:app", "--reload"]  # ❌ Development flag
```

✅ **Fix**: Production command without `--reload`
```dockerfile
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

---

### ❌ Mistake 3: Hardcoding secrets

```python
# ❌ In source code — visible in git history
SECRET_KEY = "my-secret-key"
DATABASE_URL = "postgresql://admin:password@prod-db:5432/mydb"
```

✅ **Fix**: Always from environment
```python
import os
SECRET_KEY = os.environ["SECRET_KEY"]  # Fails fast if missing
DATABASE_URL = os.environ["DATABASE_URL"]
```

## How This Connects

**Builds on**:
- [Testing FastAPI](./08-testing-fastapi.md) — tests must pass before deploying
- [Async & Background Tasks](./05-async-background-tasks.md) — lifespan for startup/shutdown
- [Authentication & Security](./06-authentication-security.md) — secrets, HTTPS, headers
- [Database Integration](./07-database-integration.md) — connection pools, migrations

**Related concepts**:
- [Virtual Environments](../00-setup/02-virtual-environments.md) — dependencies in Docker
- [MLOps Basics](../06-deep-learning/07-mlops-basics.md) — CI/CD for ML services
- [Model Deployment](../06-deep-learning/06-model-deployment.md) — serving ML models via FastAPI

**Expert resources**:
- [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md) — FastAPI production architecture questions

## Summary

**In 3 sentences**:
- Production FastAPI runs on Gunicorn managing multiple Uvicorn worker processes, configured entirely via environment variables (never hardcoded secrets), with health endpoints, structured logging, and graceful shutdown via the lifespan context manager
- Docker best practices: multi-stage builds, non-root user, no `--reload`, run migrations in entrypoint before starting the server, and disable the OpenAPI docs UI
- Observability (structured logging, Sentry, Prometheus metrics, request ID tracing) and a Kubernetes readiness probe that checks real dependencies (DB, cache) are what separate a demo from a production-grade service
