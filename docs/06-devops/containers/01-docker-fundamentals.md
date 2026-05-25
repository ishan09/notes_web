# Docker & Containers — Docker vs Podman, Best Practices & Overhead

> **Before You Start**: You should understand basic Linux concepts (processes, filesystems, networking). This guide covers containerization from an interview and production perspective — focusing on trade-offs, not just how-tos.

---

## Table of Contents

1. [What Are Containers?](#what-are-containers)
2. [Docker Architecture](#docker-architecture)
3. [Docker vs Podman](#docker-vs-podman)
4. [Resource Overhead — CPU & Memory on EC2](#resource-overhead--cpu--memory-on-ec2)
5. [Docker Compose — Multi-Container Apps](#docker-compose--multi-container-apps)
6. [Best Practices](#best-practices)
7. [When NOT to Use Containers](#when-not-to-use-containers)
8. [Self-Check Questions](#self-check-questions)

---

## What Are Containers?

A container is a **lightweight, isolated process** that bundles an application with its dependencies. Unlike VMs, containers share the host OS kernel.

```
Virtual Machines:                    Containers:
┌─────────┐ ┌─────────┐             ┌─────────┐ ┌─────────┐
│  App A  │ │  App B  │             │  App A  │ │  App B  │
├─────────┤ ├─────────┤             ├─────────┤ ├─────────┤
│  Bins   │ │  Bins   │             │  Bins   │ │  Bins   │
├─────────┤ ├─────────┤             └────┬────┘ └────┬────┘
│ Guest OS│ │ Guest OS│                  │           │
│ (2 GB)  │ │ (2 GB) │             ┌────┴───────────┴────┐
├─────────┤ ├─────────┤             │   Container Engine  │
│     Hypervisor      │             │   (Docker/Podman)   │
├─────────────────────┤             ├─────────────────────┤
│      Host OS        │             │      Host OS        │
├─────────────────────┤             ├─────────────────────┤
│     Hardware        │             │     Hardware        │
└─────────────────────┘             └─────────────────────┘

VM: Full OS copy per app (~2 GB each)   Container: Shared kernel (~50 MB each)
Boot time: Minutes                       Boot time: Seconds
Isolation: Strong (hypervisor)           Isolation: Process-level (namespaces)
```

### How Containers Work (Linux Primitives)

| Linux Feature | What It Does | Container Equivalent |
|---------------|-------------|---------------------|
| **Namespaces** | Isolate what a process can SEE (PID, network, mount, user) | Each container gets its own process tree, network stack, filesystem |
| **Cgroups** | Limit what a process can USE (CPU, memory, I/O) | Container resource limits (`--memory=512m --cpus=2`) |
| **Union Filesystem** | Layer filesystems on top of each other | Image layers (shared base, app-specific on top) |

---

## Docker Architecture

```
┌─────────────────────────────────────────────────────┐
│ Docker Client (CLI)                                   │
│  docker build, docker run, docker push                │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (Unix socket)
                       ▼
┌─────────────────────────────────────────────────────┐
│ Docker Daemon (dockerd)                    ← ROOT   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ containerd                                    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐           │   │
│  │  │ runc   │ │ runc   │ │ runc   │           │   │
│  │  │(cont A)│ │(cont B)│ │(cont C)│           │   │
│  │  └────────┘ └────────┘ └────────┘           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Key point: Docker daemon runs as ROOT.
This is Docker's biggest security concern.
```

---

## Docker vs Podman

### Architecture Comparison

```
Docker:                                Podman:
┌──────────┐                          ┌──────────┐
│  CLI     │                          │  CLI     │
└────┬─────┘                          └────┬─────┘
     │                                     │
     ▼                                     ▼
┌──────────┐                          (No daemon!)
│  dockerd │ ← Daemon (root)         Each container is a
│  (root)  │                          direct child process
└────┬─────┘                          of the CLI command
     │
     ▼
┌──────────┐                          ┌──────────┐
│containerd│                          │  conmon   │ (lightweight monitor)
└────┬─────┘                          └────┬─────┘
     │                                     │
     ▼                                     ▼
┌──────────┐                          ┌──────────┐
│  runc    │                          │  runc    │ (same OCI runtime)
└──────────┘                          └──────────┘
```

### Feature Comparison

| Feature | Docker | Podman |
|---------|:------:|:------:|
| **Daemon** | Yes (dockerd, always running as root) | No (daemonless, fork-exec model) |
| **Root required** | Yes (by default) | No (rootless by default) |
| **CLI compatibility** | `docker ...` | `podman ...` (same commands, drop-in replacement) |
| **Docker Compose** | Native support | `podman-compose` or `podman compose` (v4+) |
| **Pods** | Not native | Native (groups containers like K8s pods) |
| **Systemd integration** | Separate service | `podman generate systemd` (native) |
| **OCI compliant** | Yes | Yes (same images work in both) |
| **Build images** | `docker build` (BuildKit) | `podman build` (uses Buildah) |
| **Swarm mode** | Yes (Docker Swarm) | No (use Kubernetes instead) |
| **Maturity** | Mature, massive ecosystem | Mature (RHEL default since 8) |

### When to Favor Docker

```
✅ Your team already knows Docker (most common, huge ecosystem)
✅ You need Docker Compose for local development (better tooling)
✅ You need Docker Swarm (Podman doesn't support it)
✅ Third-party tools expect Docker socket (/var/run/docker.sock)
✅ You're on macOS or Windows (Docker Desktop is polished)
✅ CI/CD pipelines are built around Docker
```

### When to Favor Podman

```
✅ Security is paramount (rootless by default, no daemon)
✅ Running on RHEL/CentOS/Fedora (Podman is the default)
✅ Kubernetes workflow (Podman pods map to K8s pods)
✅ Systemd integration (generate systemd units from containers)
✅ Multi-container pods without orchestrator overhead
✅ Compliance requires non-root container execution
✅ You want to avoid the Docker daemon as a single point of failure
```

### The Rootless Advantage

```
Docker (default):
  dockerd runs as ROOT → if container escapes, attacker has root on host

Podman (default):
  Containers run as your USER → if container escapes, attacker has
  your user privileges only (much less damage)

This is why security-conscious organizations prefer Podman.
```

---

## Resource Overhead — CPU & Memory on EC2

### Container Overhead Is Minimal But Not Zero

```
Container overhead breakdown:
  - Container runtime (containerd): ~30-50 MB RAM, ~0.5% CPU idle
  - Per-container overhead: ~5-10 MB RAM (namespace + cgroup tracking)
  - Networking overlay: ~1-3% CPU for NAT/iptables rules
  - Storage driver (overlay2): Negligible for most workloads

Total overhead for 10 containers on an EC2 instance:
  Runtime:     ~50 MB
  Containers:  ~100 MB (10 × 10 MB)
  Networking:  ~2% CPU
  ────────────────────
  Total:       ~150 MB RAM, ~2-3% CPU

Compare to VMs:
  10 VMs × 2 GB guest OS = 20 GB RAM overhead
  Containers are ~100x more efficient than VMs for overhead.
```

### What Kind of Overhead?

| Type | Source | Impact | Mitigation |
|------|--------|--------|-----------|
| **Memory** | Container runtime + per-container metadata | ~10 MB per container | Negligible for most apps |
| **CPU** | Namespace context switching, cgroup accounting | ~1-3% | Minimal impact |
| **Network** | iptables/nftables rules, NAT, bridge networking | ~2-5% for heavy network I/O | Use `--network=host` for latency-critical apps (sacrifices isolation) |
| **Storage I/O** | overlay2 filesystem layers | ~5-10% for write-heavy workloads | Use volumes for write-heavy paths |
| **Startup** | Image pull + layer extraction | Seconds to minutes (first pull) | Pre-pull images, use smaller base images |

### EC2 Instance Sizing for Containers

```
Rule of thumb:
  Available for containers = Total RAM - OS overhead - runtime overhead

  t3.medium (4 GB RAM):
    OS:        ~500 MB
    Docker:    ~100 MB
    Available: ~3.4 GB for containers
    Practical: 3-5 small containers (512 MB each)

  m5.xlarge (16 GB RAM):
    OS:        ~500 MB
    Docker:    ~150 MB
    Available: ~15.3 GB for containers
    Practical: 10-15 containers (1 GB each)

  For Kubernetes (EKS): Reserve ~1 GB for kubelet + kube-proxy per node.
```

### Does Docker Add Significant Overhead?

```
Short answer: NO, for most workloads.

Container vs bare-metal performance:
  CPU-bound tasks:     ~0-1% overhead (near-native)
  Memory-bound tasks:  ~0-1% overhead (shared kernel)
  Network I/O:         ~2-5% overhead (NAT/bridge)
  Disk I/O:            ~5-10% overhead (overlay2 for writes)

The overhead comes from:
  - NOT from running "inside a container" (it's just a process)
  - FROM the networking layer (NAT, iptables, DNS resolution)
  - FROM the storage layer (overlay2 copy-on-write for writes)

For 95% of web applications, container overhead is negligible.
```

---

## Docker Compose — Multi-Container Apps

Docker Compose defines and runs multi-container applications.

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### When to Use Compose vs Kubernetes

| Scenario | Docker Compose | Kubernetes |
|----------|:-------------:|:----------:|
| Local development | ✅ Perfect | Overkill |
| Single-server deployment | ✅ Works well | Overkill |
| Multi-server, auto-scaling | ❌ Can't | ✅ Built for this |
| Production with HA | ❌ No self-healing | ✅ Self-healing, rolling updates |
| Microservices (5+ services) | Manageable | ✅ Better tooling |
| CI/CD testing | ✅ Fast, simple | Slow to set up |

---

## Best Practices

### Dockerfile Best Practices

```dockerfile
# 1. USE MULTI-STAGE BUILDS (smaller final image)
# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve        # Cache dependencies
COPY src ./src
RUN mvn package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# 2. RUN AS NON-ROOT USER
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 3. USE SPECIFIC IMAGE TAGS (not :latest)
# ✅ eclipse-temurin:21-jre-alpine
# ❌ eclipse-temurin:latest

# 4. EXPOSE ONLY NECESSARY PORTS
EXPOSE 8080

# 5. USE HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Image Optimization

```
Image size comparison for a Spring Boot app:
  eclipse-temurin:21          ~460 MB (full JDK)
  eclipse-temurin:21-jre      ~270 MB (JRE only)
  eclipse-temurin:21-jre-alpine ~180 MB (Alpine-based JRE)
  Custom jlink runtime        ~100 MB (only needed JDK modules)

Smaller images = faster pulls, faster deploys, smaller attack surface.
```

### Security Best Practices

```
1. RUN AS NON-ROOT
   USER 1000 (or create a dedicated user)
   Never run as root inside containers.

2. USE MINIMAL BASE IMAGES
   Alpine or distroless — fewer packages = fewer vulnerabilities.

3. SCAN IMAGES FOR VULNERABILITIES
   docker scout cve myimage:latest
   Or: Trivy, Snyk, Grype

4. DON'T STORE SECRETS IN IMAGES
   ❌ ENV API_KEY=secret123
   ✅ Use Docker secrets, AWS Secrets Manager, or environment variables at runtime

5. USE .dockerignore
   Exclude: .git, node_modules, target/, .env, *.md

6. PIN DEPENDENCY VERSIONS
   ✅ FROM eclipse-temurin:21.0.2_13-jre-alpine
   ❌ FROM eclipse-temurin:latest
```

### Operational Best Practices

```
7. SET RESOURCE LIMITS
   docker run --memory=512m --cpus=1.0 myapp
   Without limits, one container can starve others.

8. USE VOLUMES FOR PERSISTENT DATA
   ❌ Writing database data inside the container layer
   ✅ docker run -v pgdata:/var/lib/postgresql/data postgres

9. USE HEALTHCHECKS
   Docker (and orchestrators) use healthchecks to restart unhealthy containers.

10. LOG TO STDOUT/STDERR
    Don't write logs to files inside containers.
    Docker captures stdout/stderr → send to CloudWatch, ELK, etc.

11. ONE PROCESS PER CONTAINER
    ❌ App server + database + Redis in one container
    ✅ Separate containers for each service

12. USE docker compose FOR LOCAL DEV, K8s FOR PRODUCTION
    Compose is simple. K8s is for scale.
```

---

## When NOT to Use Containers

```
❌ GUI Applications
   Containers are designed for headless server processes.
   GUI apps need X11 forwarding (complex, fragile).

❌ Kernel Module Dependencies
   Containers share the host kernel.
   If your app needs specific kernel modules/versions → use VMs.

❌ Very High Performance I/O
   Storage overlay adds ~5-10% write overhead.
   For databases with extreme I/O (TBs of writes), bare-metal or VMs may be better.
   (Though most production databases run fine in containers with host volumes.)

❌ Windows-Specific Applications on Linux
   Windows containers exist but are less mature.
   Mixed OS container orchestration is complex.

❌ Single Tiny Script on a Server
   If you're running one cron job on a server, a container adds unnecessary complexity.
   Just use the system Python/Java.

❌ When Your Team Doesn't Understand Containers
   Container complexity (networking, volumes, security) causes more incidents
   than it prevents when the team lacks expertise.
   Build knowledge first, then adopt.
```

---

## Self-Check Questions

1. How do containers differ from VMs in terms of isolation and overhead?
2. Why does Podman not need a daemon, and why is that a security advantage?
3. What is the typical CPU and memory overhead of running Docker on EC2?
4. When would you choose Podman over Docker?
5. What is multi-stage build and why is it important?
6. Name 3 situations where containers are NOT the right choice.

<details>
<summary>Answers</summary>

1. VMs run a full guest OS (strong isolation via hypervisor, ~2 GB overhead per VM). Containers share the host kernel (process-level isolation via namespaces/cgroups, ~10 MB overhead per container). Containers start in seconds; VMs take minutes.
2. Docker requires a long-running root daemon (dockerd). If it's exploited, attacker gets root on the host. Podman uses a fork-exec model — each container is a direct child process of the CLI, running as the invoking user. No persistent root process = smaller attack surface.
3. Container runtime: ~50 MB RAM, ~0.5% CPU idle. Per container: ~10 MB RAM overhead. Networking overlay: ~2-3% CPU. Total for 10 containers: ~150 MB RAM, ~3% CPU — negligible for most workloads.
4. Security-critical environments (rootless by default), RHEL/CentOS systems (default tool), systemd integration, Kubernetes workflows (native pod concept), compliance requiring non-root execution.
5. Multi-stage build uses multiple FROM instructions. The build stage compiles code (with JDK, Maven, etc.), and the runtime stage copies only the artifact (JAR) into a minimal base image. This reduces image size from ~460 MB to ~180 MB and removes build tools from the final image.
6. GUI applications (need X11), kernel module dependencies (containers share host kernel), extremely high I/O workloads (overlay2 overhead), when the team lacks container expertise, single-process cron jobs on a dedicated server.

</details>

---

## Navigation

**Related:**
- [Kubernetes Fundamentals](../orchestration/01-kubernetes-fundamentals.md) — When to scale beyond Docker
- [AWS VPC & Networking](../../05-aws/networking/01-vpc-networking.md) — Network architecture for containers
- [Microservices — Observability & Ops](../../03-architecture/microservices/08-observability-and-ops.md) — Container monitoring

**Module Index:** [Learning Roadmap](../../README.md)
