# AWS Networking — VPC, Subnets, NAT & Best Practices

> **Before You Start**: You should understand basic networking concepts (IP addresses, CIDR notation, TCP/UDP). This guide focuses on how AWS implements networking and the decisions you'll face in interviews and production.

---

## Table of Contents

1. [VPC — Your Private Cloud Network](#vpc--your-private-cloud-network)
2. [Subnets — Public vs Private](#subnets--public-vs-private)
3. [Internet Gateway & NAT](#internet-gateway--nat)
4. [Route Tables](#route-tables)
5. [Security Groups vs NACLs](#security-groups-vs-nacls)
6. [Standard Production Architecture](#standard-production-architecture)
7. [How Use Case Changes the Structure](#how-use-case-changes-the-structure)
8. [Best Practices](#best-practices)
9. [Self-Check Questions](#self-check-questions)

---

## VPC — Your Private Cloud Network

### What Is a VPC?

A **Virtual Private Cloud (VPC)** is an isolated virtual network within AWS that you define. It's your own private section of the AWS cloud where you launch resources.

```
AWS Cloud
┌──────────────────────────────────────────────────────┐
│                                                       │
│  VPC (10.0.0.0/16) — Your isolated network            │
│  ┌─────────────────────────────────────────────┐      │
│  │                                              │      │
│  │  Your EC2 instances, RDS databases,          │      │
│  │  Lambda functions, Load Balancers...         │      │
│  │  all live inside this VPC                    │      │
│  │                                              │      │
│  └─────────────────────────────────────────────┘      │
│                                                       │
│  Other customers' VPCs (completely isolated)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ VPC A    │ │ VPC B    │ │ VPC C    │              │
│  └──────────┘ └──────────┘ └──────────┘              │
└──────────────────────────────────────────────────────┘
```

### CIDR Blocks — Defining Your IP Range

```
VPC CIDR: 10.0.0.0/16
                   ↑
                   /16 = first 16 bits are fixed → 65,536 IPs available

Common VPC CIDR choices:
  10.0.0.0/16    → 65,536 IPs (most common for production)
  172.16.0.0/16  → 65,536 IPs (alternative private range)
  192.168.0.0/16 → 65,536 IPs (can conflict with home/office networks)

Rule: AWS allows /16 (largest) to /28 (smallest = 16 IPs).
      Start with /16 — you can't expand later, but you can add secondary CIDRs.
```

**Why CIDR matters**: If you have multiple VPCs that need to peer (connect), their CIDR blocks **cannot overlap**.

```
✅ VPC-A: 10.0.0.0/16 ←→ VPC-B: 10.1.0.0/16  (no overlap, can peer)
❌ VPC-A: 10.0.0.0/16 ←→ VPC-B: 10.0.0.0/16  (overlap, CANNOT peer)
```

---

## Subnets — Public vs Private

A subnet is a **range of IP addresses within your VPC**. You create subnets in specific **Availability Zones (AZs)**.

### Public Subnet

A subnet whose route table has a route to an **Internet Gateway**.

```
Resources in a public subnet:
  ✅ Can reach the internet directly
  ✅ Can be reached FROM the internet (if security group allows)

Typical use: Load balancers, bastion hosts, NAT Gateways
```

### Private Subnet

A subnet with **NO route to an Internet Gateway**.

```
Resources in a private subnet:
  ✅ Can reach the internet via NAT Gateway (outbound only)
  ❌ Cannot be reached FROM the internet directly
  ✅ Can communicate with other resources in the VPC

Typical use: Application servers, databases, internal services
```

### Subnet Design Across Availability Zones

```
VPC: 10.0.0.0/16
├── AZ: us-east-1a
│   ├── Public Subnet:  10.0.1.0/24  (256 IPs) — Load Balancers
│   └── Private Subnet: 10.0.10.0/24 (256 IPs) — App Servers, DB
│
├── AZ: us-east-1b
│   ├── Public Subnet:  10.0.2.0/24  (256 IPs) — Load Balancers
│   └── Private Subnet: 10.0.20.0/24 (256 IPs) — App Servers, DB
│
└── AZ: us-east-1c
    ├── Public Subnet:  10.0.3.0/24  (256 IPs) — Load Balancers
    └── Private Subnet: 10.0.30.0/24 (256 IPs) — App Servers, DB

Why 3 AZs?
  → High availability. If one AZ goes down, others keep running.
  → AWS ALB requires at least 2 AZs.
  → RDS Multi-AZ deploys standby in a different AZ.
```

**Note**: AWS reserves 5 IPs per subnet (first 4 + last 1), so a /24 gives 251 usable IPs, not 256.

---

## Internet Gateway & NAT

### Internet Gateway (IGW)

An Internet Gateway allows resources in **public subnets** to communicate with the internet.

```
Internet ←→ Internet Gateway ←→ Public Subnet (EC2, ALB)

Properties:
  - One IGW per VPC
  - Horizontally scaled, redundant (AWS managed)
  - No bandwidth bottleneck
  - Free (no hourly charge)
```

### NAT Gateway

A NAT Gateway allows resources in **private subnets** to reach the internet (outbound only) without being directly accessible from the internet.

```
Private Subnet EC2 → NAT Gateway (in public subnet) → Internet Gateway → Internet
                         ↑
                    Has a public IP (Elastic IP)
                    Translates private IP → public IP for outbound traffic

Use cases:
  - App servers downloading packages (apt-get, yum, pip)
  - Calling external APIs (payment gateways, third-party services)
  - Pulling Docker images from registries
```

### NAT Gateway vs NAT Instance

| Feature | NAT Gateway (Recommended) | NAT Instance (Legacy) |
|---------|:------------------------:|:--------------------:|
| **Managed by** | AWS (fully managed) | You (EC2 instance) |
| **Availability** | Redundant within AZ | Single point of failure |
| **Bandwidth** | Up to 100 Gbps | Limited by instance type |
| **Cost** | ~$0.045/hr + data processing | EC2 instance cost |
| **Maintenance** | None | OS patching, monitoring |
| **Security Groups** | Cannot associate | Can associate |
| **Port forwarding** | Not supported | Supported |

**When to use NAT Instance**: Only for cost-sensitive dev/test environments or when you need port forwarding / custom iptables rules. Production = always NAT Gateway.

### Cost Optimization Tip

```
NAT Gateway costs:
  $0.045/hr × 730 hrs/month = ~$32.85/month (just to exist)
  + $0.045/GB data processed

For dev/test:
  - Use a single NAT Gateway shared across AZs
  - Or use VPC endpoints (free for S3, DynamoDB) to avoid NAT for AWS services
  - Or use a small NAT Instance (t3.micro ~$7/month)

For production:
  - One NAT Gateway per AZ for high availability
  - Use VPC endpoints for S3, DynamoDB, ECR, CloudWatch to reduce NAT traffic
```

---

## Route Tables

Route tables control **where network traffic is directed** within your VPC.

### Public Subnet Route Table

```
Destination        Target            Notes
──────────────     ──────────        ──────
10.0.0.0/16       local             Traffic within VPC stays in VPC
0.0.0.0/0         igw-xxxxxxxx      Everything else → Internet Gateway
```

### Private Subnet Route Table

```
Destination        Target            Notes
──────────────     ──────────        ──────
10.0.0.0/16       local             Traffic within VPC stays in VPC
0.0.0.0/0         nat-xxxxxxxx      Everything else → NAT Gateway (outbound only)
```

### VPC Peering Route Table Addition

```
Destination        Target            Notes
──────────────     ──────────        ──────
10.0.0.0/16       local             This VPC
10.1.0.0/16       pcx-xxxxxxxx      Peered VPC (direct connection)
0.0.0.0/0         nat-xxxxxxxx      Internet via NAT
```

---

## Security Groups vs NACLs

Two layers of network security. Understanding the difference is a common interview question.

### Comparison

| Feature | Security Group | NACL (Network ACL) |
|---------|:-------------:|:------------------:|
| **Level** | Instance (ENI) | Subnet |
| **State** | **Stateful** (return traffic auto-allowed) | **Stateless** (must explicitly allow return traffic) |
| **Rules** | Allow only (implicit deny) | Allow AND deny rules |
| **Evaluation** | All rules evaluated together | Rules evaluated in order (lowest number first) |
| **Default** | Deny all inbound, allow all outbound | Allow all inbound and outbound |
| **Applied to** | Specific instances | All instances in the subnet |

### Stateful vs Stateless — The Key Difference

```
Security Group (Stateful):
  Inbound Rule: Allow TCP 443 from 0.0.0.0/0
  → Response traffic on ephemeral port is AUTOMATICALLY allowed
  → You don't need an outbound rule for the response

NACL (Stateless):
  Inbound Rule: Allow TCP 443 from 0.0.0.0/0
  → Response traffic on ephemeral port is NOT automatically allowed
  → You MUST add outbound rule: Allow TCP 1024-65535 to 0.0.0.0/0
  → Otherwise, the response gets blocked!
```

### Typical Security Group Setup

```
ALB Security Group:
  Inbound:  TCP 443 from 0.0.0.0/0  (HTTPS from internet)
  Outbound: TCP 8080 to app-sg       (forward to app servers)

App Server Security Group:
  Inbound:  TCP 8080 from alb-sg     (only from ALB, not internet)
  Outbound: TCP 5432 to db-sg        (connect to database)
            TCP 443 to 0.0.0.0/0     (call external APIs)

Database Security Group:
  Inbound:  TCP 5432 from app-sg     (only from app servers)
  Outbound: None needed              (DB doesn't initiate connections)
```

---

## Standard Production Architecture

The following is the **industry-standard 3-tier VPC architecture** used by most companies:

```
                         Internet
                            │
                    ┌───────┴───────┐
                    │ Internet      │
                    │ Gateway       │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌────┴─────┐ ┌─────┴─────┐
        │ Public    │ │ Public   │ │ Public    │
        │ Subnet    │ │ Subnet   │ │ Subnet    │
        │ AZ-1a     │ │ AZ-1b   │ │ AZ-1c     │
        │           │ │          │ │           │
        │ ┌───────┐ │ │┌───────┐│ │ ┌───────┐ │
        │ │  ALB  │ │ ││  ALB  ││ │ │  ALB  │ │
        │ └───────┘ │ │└───────┘│ │ └───────┘ │
        │ ┌───────┐ │ │┌───────┐│ │ ┌───────┐ │
        │ │  NAT  │ │ ││  NAT  ││ │ │  NAT  │ │
        │ └───────┘ │ │└───────┘│ │ └───────┘ │
        └─────┬─────┘ └────┬────┘ └─────┬─────┘
              │             │             │
        ┌─────┴─────┐ ┌────┴─────┐ ┌─────┴─────┐
        │ Private   │ │ Private  │ │ Private   │
        │ Subnet    │ │ Subnet   │ │ Subnet    │
        │ (App)     │ │ (App)    │ │ (App)     │
        │           │ │          │ │           │
        │ ┌───────┐ │ │┌───────┐│ │ ┌───────┐ │
        │ │  EC2  │ │ ││  EC2  ││ │ │  EC2  │ │
        │ │  ECS  │ │ ││  ECS  ││ │ │  ECS  │ │
        │ └───────┘ │ │└───────┘│ │ └───────┘ │
        └─────┬─────┘ └────┬────┘ └─────┬─────┘
              │             │             │
        ┌─────┴─────┐ ┌────┴─────┐ ┌─────┴─────┐
        │ Private   │ │ Private  │ │ Private   │
        │ Subnet    │ │ Subnet   │ │ Subnet    │
        │ (Data)    │ │ (Data)   │ │ (Data)    │
        │           │ │          │ │           │
        │ ┌───────┐ │ │┌───────┐│ │ ┌───────┐ │
        │ │  RDS  │ │ ││  RDS  ││ │ │  RDS  │ │
        │ │ElastiC│ │ ││ElastiC││ │ │ElastiC│ │
        │ └───────┘ │ │└───────┘│ │ └───────┘ │
        └───────────┘ └─────────┘ └───────────┘

Three tiers:
  1. Public Subnet:  ALB, NAT Gateway, Bastion Host
  2. Private Subnet (App): EC2/ECS/EKS application servers
  3. Private Subnet (Data): RDS, ElastiCache, OpenSearch

Each tier across 3 AZs for high availability.
```

### Why This Architecture Is Standard

```
✅ Defense in depth: Database never exposed to internet
✅ High availability: Multi-AZ deployment survives AZ failures
✅ Scalability: ALB distributes traffic across app servers
✅ Security: Each tier has its own security group rules
✅ Cost-optimized: Only public resources need public IPs
```

---

## How Use Case Changes the Structure

### Simple Web App (Startup / MVP)

```
Simplified architecture — minimize cost:
  - 2 AZs (not 3)
  - Single NAT Gateway (shared across AZs)
  - RDS in private subnet (no Multi-AZ for dev)

Cost: ~$100-200/month
```

### Microservices Platform

```
Extended architecture:
  - Separate VPC per environment (dev, staging, prod)
  - VPC Peering or Transit Gateway between environments
  - Service mesh (App Mesh or Istio) for inter-service communication
  - Private hosted zone (Route53) for internal DNS
  - VPC Endpoints for S3, ECR, CloudWatch, SQS (avoid NAT costs)
  - Possibly separate data subnet for each service's database

Additional components:
  - Transit Gateway: Connect multiple VPCs (replaces mesh of peering connections)
  - PrivateLink: Expose services to other VPCs without peering
```

### Hybrid Cloud (On-Premise + AWS)

```
Additional components:
  - AWS Direct Connect or VPN Gateway: Secure link to on-premise
  - Transit Gateway: Hub for connecting VPCs and on-premise
  - Dedicated private subnets for hybrid workloads
  - Careful CIDR planning to avoid overlap with on-premise IP ranges
```

### Highly Regulated (Healthcare, Finance)

```
Stricter architecture:
  - Dedicated tenancy VPC (no shared hardware)
  - Network Firewall (layer 7 inspection)
  - Flow Logs to S3/CloudWatch for all traffic
  - Private subnets only (no public subnets at all)
  - Access via AWS PrivateLink or VPN only
  - NACLs + Security Groups (defense in depth)
  - AWS Config rules to detect misconfigurations
```

---

## Best Practices

### Network Design

```
1. PLAN CIDR BLOCKS CAREFULLY
   Use non-overlapping ranges across all VPCs.
   Document all CIDR allocations in a central registry.
   10.0.0.0/16 for prod, 10.1.0.0/16 for staging, 10.2.0.0/16 for dev.

2. USE AT LEAST 2 AZs (3 FOR PRODUCTION)
   AWS ALB requires 2+ AZs. Production should use 3 for true HA.

3. SEPARATE PUBLIC AND PRIVATE SUBNETS
   Never put databases or app servers in public subnets.
   Only ALBs, NAT Gateways, and bastion hosts go in public subnets.

4. ONE NAT GATEWAY PER AZ IN PRODUCTION
   If AZ-a goes down, AZ-b's NAT Gateway keeps its private subnet connected.

5. USE VPC ENDPOINTS TO REDUCE NAT TRAFFIC
   S3 Gateway endpoint (free), DynamoDB Gateway endpoint (free),
   ECR, CloudWatch, SQS Interface endpoints (small hourly cost, but saves NAT data charges).
```

### Security

```
6. DEFAULT DENY — ONLY OPEN WHAT'S NEEDED
   Security groups start with deny-all inbound.
   Only open specific ports from specific sources.

7. REFERENCE SECURITY GROUPS, NOT IP RANGES
   ✅ Allow port 5432 from app-server-sg
   ❌ Allow port 5432 from 10.0.10.0/24
   SG references survive IP changes and are self-documenting.

8. ENABLE VPC FLOW LOGS
   Log all traffic for security auditing and troubleshooting.
   Send to CloudWatch Logs or S3.

9. USE SEPARATE VPCS PER ENVIRONMENT
   prod, staging, dev in separate VPCs.
   Prevents accidental cross-environment access.

10. NO SSH DIRECTLY TO INSTANCES
    Use AWS Systems Manager Session Manager instead of bastion hosts.
    No open port 22, no SSH keys to manage.
```

### Cost

```
11. USE VPC ENDPOINTS FOR AWS SERVICES
    Saves NAT Gateway data processing charges.
    S3 and DynamoDB endpoints are free.

12. SHARE NAT GATEWAY IN NON-PROD
    Dev/staging can use one NAT Gateway across AZs.

13. MONITOR DATA TRANSFER COSTS
    Cross-AZ data transfer: $0.01/GB
    NAT Gateway processing: $0.045/GB
    These add up at scale.
```

---

## Self-Check Questions

1. What is the difference between a public and private subnet?
2. Why would you use a NAT Gateway instead of putting EC2 instances in a public subnet?
3. What's the difference between a Security Group and a NACL?
4. Why must VPC CIDR blocks not overlap when using VPC Peering?
5. In the standard 3-tier architecture, what goes in each tier?
6. How does a stateful (SG) vs stateless (NACL) firewall affect your rule configuration?

<details>
<summary>Answers</summary>

1. A public subnet has a route to an Internet Gateway (resources can be reached from the internet). A private subnet does not — resources can only reach the internet outbound via NAT Gateway.
2. NAT Gateway allows outbound internet access (downloading packages, calling APIs) while keeping instances unreachable from the internet. Putting EC2 in public subnets exposes them to attack.
3. Security Groups are stateful (return traffic auto-allowed) and operate at the instance level. NACLs are stateless (must explicitly allow return traffic) and operate at the subnet level. Use both for defense in depth.
4. VPC Peering creates a direct network route between VPCs. If CIDR blocks overlap, the routing table can't distinguish which VPC a destination IP belongs to.
5. Public: ALB, NAT Gateway, bastion host. Private (App): EC2/ECS application servers. Private (Data): RDS, ElastiCache, OpenSearch.
6. With stateful SGs, you only write an inbound allow rule — return traffic is auto-allowed. With stateless NACLs, you must write both inbound allow (port 443) AND outbound allow (ephemeral ports 1024-65535) rules.

</details>

---

## Navigation

**Related:**
- [AWS IAM & Policies](../iam/01-iam-policies.md) — Identity, access control, best practices
- [System Design — Scalability Patterns](../../03-architecture/system-design/02-scalability-patterns.md) — Load balancing, CDN
- [System Design — Networking Fundamentals](../../03-architecture/system-design/04-networking-fundamentals.md) — DNS, CDN, protocols
- [Microservices — Observability & Ops](../../03-architecture/microservices/08-observability-and-ops.md) — Monitoring, logging

**Module Index:** [Learning Roadmap](../../README.md)
