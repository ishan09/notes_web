# Kubernetes — When to Use, Core Concepts & Running on AWS

> **Before You Start**: You should understand [Docker Fundamentals](../containers/01-docker-fundamentals.md) — images, containers, Dockerfiles. This guide covers *when and why* to use Kubernetes, not just how.

---

## Table of Contents

1. [When to Use Kubernetes vs Docker vs Docker Compose](#when-to-use-kubernetes-vs-docker-vs-docker-compose)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Running Kubernetes on Multiple EC2 Instances](#running-kubernetes-on-multiple-ec2-instances)
5. [Key Workload Patterns](#key-workload-patterns)
6. [When NOT to Use Kubernetes](#when-not-to-use-kubernetes)
7. [Self-Check Questions](#self-check-questions)

---

## When to Use Kubernetes vs Docker vs Docker Compose

### The Decision Matrix

| Criteria | Docker (single host) | Docker Compose | Kubernetes |
|----------|:-------------------:|:--------------:|:----------:|
| **Number of containers** | 1-5 | 3-15 | 10-1000+ |
| **Number of servers** | 1 | 1 | 3-1000+ |
| **Auto-scaling** | No | No | Yes (HPA, VPA, Cluster Autoscaler) |
| **Self-healing** | No (restart policy only) | `restart: always` | Yes (kills and replaces unhealthy pods) |
| **Rolling updates** | Manual | Manual | Built-in (zero-downtime deploys) |
| **Service discovery** | Manual (network links) | DNS by service name | Built-in DNS + Service objects |
| **Load balancing** | Manual (nginx) | Manual | Built-in (Service, Ingress) |
| **Secret management** | Environment variables | `.env` files | Kubernetes Secrets (encrypted at rest) |
| **Multi-node scheduling** | No | No | Yes (scheduler places pods across nodes) |
| **Learning curve** | Low | Low | High |
| **Operational cost** | Minimal | Minimal | Significant (unless managed like EKS) |

### When to Use Each

**Docker (single container or few on one host)**:
```
✅ Running a single app on a server
✅ CI/CD build steps (build image, push to registry)
✅ Quick testing and prototyping
✅ Simple deployment: just docker run on a server
```

**Docker Compose (multi-container on one host)**:
```
✅ Local development (app + db + cache + queue)
✅ Small deployments that fit on one server
✅ Integration testing (spin up full stack)
✅ Demo environments
✅ Simple production with < 10 containers on one server
```

**Kubernetes (multi-container across multiple hosts)**:
```
✅ Need auto-scaling (traffic varies, scale pods/nodes automatically)
✅ Need high availability (survive node failures, AZ failures)
✅ Running 10+ microservices in production
✅ Need zero-downtime deployments (rolling updates, canary)
✅ Need resource isolation and fair scheduling across teams
✅ Need service mesh, observability, advanced networking
✅ Already have a platform/DevOps team to manage it
```

### The Kubernetes Threshold

```
Ask yourself these questions:

1. Do you run on MORE THAN ONE server?
   No  → Docker Compose is enough
   Yes → Consider Kubernetes

2. Do you need AUTO-SCALING?
   No  → Docker Compose might work
   Yes → Kubernetes (or ECS for simpler needs)

3. Do you need ZERO-DOWNTIME DEPLOYS?
   No  → Docker Compose with restart
   Yes → Kubernetes rolling updates

4. Do you need SELF-HEALING (auto-restart on crash)?
   Basic restart → Docker Compose restart: always
   Replace on different node → Kubernetes

5. Do you have the TEAM to operate it?
   No  → Use managed service (EKS, GKE) or simpler alternatives (ECS, App Runner)
   Yes → Kubernetes gives maximum flexibility
```

---

## Core Concepts

### Pod — The Smallest Unit

A Pod is one or more containers that run together and share network/storage.

```
Pod
┌─────────────────────────────┐
│  ┌───────────┐ ┌──────────┐ │
│  │ App       │ │ Sidecar  │ │  ← Two containers in one pod
│  │ Container │ │ (logging)│ │     Share: IP, volumes
│  └───────────┘ └──────────┘ │
│                              │
│  localhost:8080  localhost:9090  ← Containers talk via localhost
│  IP: 10.1.0.5                   ← Pod gets ONE IP
└─────────────────────────────┘

Most pods have exactly ONE container.
Multi-container pods are for sidecar patterns (logging, proxy, init).
```

### Deployment — Manages Replicas

A Deployment ensures the desired number of pod replicas are running.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3                    # Run 3 identical pods
  selector:
    matchLabels:
      app: order-service
  strategy:
    type: RollingUpdate          # Zero-downtime updates
    rollingUpdate:
      maxUnavailable: 1          # At most 1 pod down during update
      maxSurge: 1                # At most 1 extra pod during update
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:v2.1.0
        ports:
        - containerPort: 8080
        resources:
          requests:              # Minimum guaranteed resources
            memory: "256Mi"
            cpu: "250m"
          limits:                # Maximum allowed resources
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:           # Kill and restart if unhealthy
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:          # Don't send traffic until ready
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service — Stable Network Endpoint

Pods are ephemeral (they come and go). A Service provides a stable IP and DNS name.

```
Service: order-service (ClusterIP: 10.96.0.15)
         DNS: order-service.default.svc.cluster.local
              │
              ├──→ Pod A (10.1.0.5:8080)
              ├──→ Pod B (10.1.0.6:8080)
              └──→ Pod C (10.1.0.7:8080)

Other services call: http://order-service:8080/api/orders
The Service load-balances across healthy pods.
```

**Service Types**:

| Type | Accessible From | Use Case |
|------|----------------|----------|
| **ClusterIP** (default) | Inside cluster only | Service-to-service communication |
| **NodePort** | External via `<NodeIP>:30000-32767` | Dev/testing, direct access |
| **LoadBalancer** | External via cloud LB (ALB/NLB) | Production internet-facing services |
| **ExternalName** | DNS alias | Point to external services (e.g., RDS) |

### Ingress — HTTP Routing

```
Internet → [ Ingress Controller (nginx/ALB) ]
              │
              ├── /api/orders  →  order-service:8080
              ├── /api/users   →  user-service:8080
              └── /api/payments → payment-service:8080

Ingress = Kubernetes-native reverse proxy / API gateway.
```

### ConfigMap & Secret

```yaml
# ConfigMap — non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  SPRING_PROFILES_ACTIVE: "production"
  LOG_LEVEL: "INFO"
  REDIS_HOST: "redis-service"

---
# Secret — sensitive data (base64 encoded, encrypted at rest)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=   # base64 of "password123"
  DB_USERNAME: YWRtaW4=             # base64 of "admin"
```

### Namespace — Logical Isolation

```
Cluster
├── namespace: default        (your apps)
├── namespace: kube-system    (K8s system components)
├── namespace: monitoring     (Prometheus, Grafana)
├── namespace: staging        (staging environment)
└── namespace: production     (production environment)

Namespaces provide:
  - Resource quotas per team/environment
  - Network policies (isolate traffic between namespaces)
  - RBAC (role-based access control per namespace)
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE (Master)                      │
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ API Server │  │  Scheduler   │  │ Controller Manager   │  │
│  │            │  │ (decides     │  │ (ensures desired     │  │
│  │ (kubectl   │  │  which node  │  │  state matches       │  │
│  │  talks to  │  │  runs which  │  │  actual state)       │  │
│  │  this)     │  │  pod)        │  │                      │  │
│  └────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ etcd (distributed key-value store — the cluster "brain")│  │
│  │ Stores ALL cluster state: deployments, services, config │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│    WORKER NODE 1     │  │    WORKER NODE 2     │
│                      │  │                      │
│  ┌──────────────┐    │  │  ┌──────────────┐    │
│  │   kubelet    │    │  │  │   kubelet    │    │
│  │ (manages     │    │  │  │ (manages     │    │
│  │  pods on     │    │  │  │  pods on     │    │
│  │  this node)  │    │  │  │  this node)  │    │
│  └──────────────┘    │  │  └──────────────┘    │
│                      │  │                      │
│  ┌──────────────┐    │  │  ┌──────────────┐    │
│  │  kube-proxy  │    │  │  │  kube-proxy  │    │
│  │ (networking  │    │  │  │ (networking  │    │
│  │  rules)      │    │  │  │  rules)      │    │
│  └──────────────┘    │  │  └──────────────┘    │
│                      │  │                      │
│  ┌─────┐ ┌─────┐    │  │  ┌─────┐ ┌─────┐    │
│  │Pod A│ │Pod B│    │  │  │Pod C│ │Pod D│    │
│  └─────┘ └─────┘    │  │  └─────┘ └─────┘    │
└──────────────────────┘  └──────────────────────┘
```

---

## Running Kubernetes on Multiple EC2 Instances

### Option 1: Amazon EKS (Recommended for Production)

**EKS = Elastic Kubernetes Service** — AWS manages the control plane.

```
You manage:                    AWS manages:
  - Worker nodes (EC2)           - API Server
  - Application deployment       - etcd
  - Service meshes, monitoring   - Scheduler
  - Node groups / Fargate        - Controller Manager
                                 - High availability
                                 - Patches and upgrades

Cost: $0.10/hr per cluster (~$73/month) + EC2 instance costs
```

**Setup**:
```bash
# Create EKS cluster with eksctl
eksctl create cluster \
  --name my-cluster \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# This creates:
# - EKS control plane (managed by AWS)
# - 3 EC2 instances as worker nodes
# - VPC, subnets, security groups
# - Auto Scaling Group (scales 2-10 nodes)
```

**EKS with Fargate (serverless nodes)**:
```
No EC2 instances to manage at all.
AWS runs each pod on its own isolated micro-VM.

Pros: Zero node management, pay-per-pod, strong isolation
Cons: No DaemonSets, no GPU, slower pod start (~30s), higher per-pod cost
```

### Option 2: kOps (Self-Managed on EC2)

```
kOps creates and manages Kubernetes clusters on EC2.
You manage EVERYTHING (control plane + workers).

When to use:
  - Need full control over K8s version and configuration
  - Cost-sensitive (no EKS $73/month control plane fee)
  - Multi-cloud strategy (kOps supports AWS + GCE)

When NOT to use:
  - No dedicated platform team
  - Want AWS to handle control plane HA and upgrades
```

```bash
# Create cluster with kOps
kops create cluster \
  --name=k8s.example.com \
  --state=s3://my-kops-state \
  --zones=us-east-1a,us-east-1b,us-east-1c \
  --node-count=3 \
  --node-size=m5.large \
  --master-count=3 \
  --master-size=m5.large

kops update cluster --yes
```

### Option 3: kubeadm (DIY on EC2)

```
The manual way. You provision EC2 instances and bootstrap K8s yourself.

When to use:
  - Learning and understanding K8s internals
  - Highly customized configurations
  - Air-gapped environments

When NOT to use:
  - Production (unless you have strong K8s ops expertise)
  - When EKS or kOps can do the job
```

### Comparison

| Aspect | EKS | kOps | kubeadm |
|--------|:---:|:----:|:-------:|
| **Control plane management** | AWS | You | You |
| **Worker node management** | You (or Fargate) | You | You |
| **Setup complexity** | Low | Medium | High |
| **Upgrade complexity** | Low | Medium | High |
| **Cost** | $73/month + EC2 | EC2 only | EC2 only |
| **AWS integration** | Native (IAM, ALB, EBS) | Good | Manual |
| **Production readiness** | Excellent | Good | Depends on your team |
| **Best for** | Most production use cases | Cost-conscious teams | Learning K8s |

---

## Key Workload Patterns

### Auto-Scaling

```yaml
# Horizontal Pod Autoscaler — scale pods based on metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70    # Scale when CPU > 70%
```

```
Three levels of scaling:
  1. HPA: Scale pods (add more replicas)
  2. VPA: Scale pod resources (give more CPU/memory to each pod)
  3. Cluster Autoscaler: Scale nodes (add more EC2 instances when pods can't be scheduled)
```

### Rolling Updates (Zero-Downtime Deploys)

```
Version v1 running:  [Pod-v1] [Pod-v1] [Pod-v1]

Deploy v2:
  Step 1: Start Pod-v2   [Pod-v1] [Pod-v1] [Pod-v1] [Pod-v2]
  Step 2: Stop Pod-v1    [Pod-v1] [Pod-v1] [Pod-v2]
  Step 3: Start Pod-v2   [Pod-v1] [Pod-v1] [Pod-v2] [Pod-v2]
  Step 4: Stop Pod-v1    [Pod-v1] [Pod-v2] [Pod-v2]
  Step 5: Start Pod-v2   [Pod-v1] [Pod-v2] [Pod-v2] [Pod-v2]
  Step 6: Stop Pod-v1    [Pod-v2] [Pod-v2] [Pod-v2]

At no point are zero pods running → zero downtime.
Rollback: kubectl rollout undo deployment/order-service
```

### Self-Healing

```
Kubernetes continuously monitors:

1. Liveness Probe fails → kubelet kills the container, restarts it
2. Node goes down → Controller reschedules pods on healthy nodes
3. Pod OOM killed → Restart with potentially more memory (VPA)

This is the #1 reason to use K8s:
  You deploy, Kubernetes keeps it running.
  At 3 AM when a node dies, K8s moves your workload automatically.
```

---

## When NOT to Use Kubernetes

```
❌ YOU HAVE < 5 SERVICES
   Kubernetes overhead (learning, tooling, monitoring) isn't justified.
   Use Docker Compose or ECS.

❌ YOUR TEAM HAS NO K8s EXPERIENCE
   Kubernetes has a steep learning curve.
   Misconfigured K8s = security holes, outages, wasted resources.
   Train first, adopt second. Or use managed K8s (EKS) with minimal customization.

❌ SIMPLE BATCH JOBS OR CRON
   AWS Lambda + EventBridge is simpler for scheduled tasks.
   K8s CronJobs work but are overkill if that's your only workload.

❌ SINGLE-SERVER APPLICATIONS
   If your app fits on one server, K8s adds complexity with no benefit.
   Docker Compose does everything you need.

❌ SERVERLESS IS A BETTER FIT
   If your workload is bursty, event-driven, and stateless:
   Lambda + API Gateway is simpler and auto-scales to zero.

❌ YOU CAN'T AFFORD THE OPERATIONAL COST
   EKS: $73/month + node costs + team training time
   For small startups, ECS or App Runner may be more cost-effective.

Rule of Thumb:
  "Kubernetes is the answer only if you have Kubernetes-sized problems."
```

---

## Self-Check Questions

1. When would you choose Kubernetes over Docker Compose?
2. What is the difference between a Pod and a Deployment?
3. How does Kubernetes achieve zero-downtime deployments?
4. What are the 3 levels of auto-scaling in Kubernetes?
5. What is the difference between EKS, kOps, and kubeadm?
6. Name 3 situations where Kubernetes is NOT the right choice.

<details>
<summary>Answers</summary>

1. When you need multi-node scheduling, auto-scaling, self-healing, or running 10+ services in production. Docker Compose is for single-host development or simple deployments.
2. A Pod is the smallest deployable unit (one or more containers sharing network/storage). A Deployment manages multiple pod replicas, handles rolling updates, and ensures desired replica count is maintained.
3. Rolling updates: K8s gradually replaces old pods with new ones. It starts a new pod, waits for readiness probe to pass, then kills an old pod. At no point are zero pods running.
4. HPA (Horizontal Pod Autoscaler) — adds more pod replicas. VPA (Vertical Pod Autoscaler) — increases resources per pod. Cluster Autoscaler — adds more EC2 worker nodes when pods can't be scheduled.
5. EKS: AWS manages control plane, you manage workers. kOps: You manage everything but it automates cluster lifecycle. kubeadm: Manual setup, maximum control, best for learning.
6. Fewer than 5 services (overkill), team has no K8s experience (steep learning curve), serverless workloads (Lambda is simpler), single-server applications (Docker Compose is enough), tight budget (EKS + ops cost is significant).

</details>

---

## Navigation

**Related:**
- [Docker Fundamentals](../containers/01-docker-fundamentals.md) — Container basics, Docker vs Podman
- [AWS VPC & Networking](../../05-aws/networking/01-vpc-networking.md) — Network architecture for K8s on AWS
- [Microservices — Observability & Ops](../../03-architecture/microservices/08-observability-and-ops.md) — Monitoring K8s workloads
- [System Design — Scalability Patterns](../../03-architecture/system-design/02-scalability-patterns.md) — Scaling strategies

**Module Index:** [Learning Roadmap](../../README.md)
