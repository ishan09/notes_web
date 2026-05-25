# AWS IAM — Users, Roles, Policies & Best Practices

> **Before You Start**: You should understand basic AWS concepts (what are AWS services, what is the AWS console). This guide covers how AWS controls **who can do what** — critical knowledge for interviews and production security.

---

## Table of Contents

1. [What Is IAM?](#what-is-iam)
2. [Core Concepts](#core-concepts)
3. [Policy Types](#policy-types)
4. [Policy Evaluation Logic](#policy-evaluation-logic)
5. [Roles — The Right Way to Grant Access](#roles--the-right-way-to-grant-access)
6. [Best Practices](#best-practices)
7. [Anti-Patterns](#anti-patterns)
8. [Real-World Scenarios](#real-world-scenarios)
9. [Self-Check Questions](#self-check-questions)

---

## What Is IAM?

**Identity and Access Management (IAM)** is AWS's service for controlling **authentication** (who are you?) and **authorization** (what can you do?).

```
Every AWS API call goes through IAM:

  Developer → AWS CLI → "s3:PutObject on my-bucket"
                            │
                            ▼
                    ┌───────────────┐
                    │    IAM        │
                    │               │
                    │ 1. Who is     │
                    │    calling?   │ ← Authentication
                    │               │
                    │ 2. Are they   │
                    │    allowed?   │ ← Authorization
                    │               │
                    │ 3. Allow or   │
                    │    Deny       │
                    └───────────────┘
```

---

## Core Concepts

### IAM Entities

| Entity | What It Is | Use Case |
|--------|-----------|----------|
| **Root Account** | The account created with your AWS sign-up email. Has UNRESTRICTED access. | Initial setup only. Lock it away. |
| **IAM User** | A person or application with long-term credentials (password, access keys). | Human users who need console/CLI access |
| **IAM Group** | A collection of IAM users. Policies attached to the group apply to all members. | Organizing users: "developers", "ops", "read-only" |
| **IAM Role** | A temporary identity that can be **assumed** by users, services, or accounts. | EC2 instances, Lambda, cross-account access |
| **IAM Policy** | A JSON document that defines permissions (allow/deny actions on resources). | Attached to users, groups, or roles |

### How They Relate

```
                        ┌─────────────┐
                        │  IAM Policy │ (defines permissions)
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
        │ IAM User  │   │ IAM Group │   │ IAM Role  │
        │ (alice)   │   │ (devs)    │   │ (ec2-role)│
        └───────────┘   └─────┬─────┘   └───────────┘
                              │
                        ┌─────┴─────┐
                        │  alice    │  ← User is member of group
                        │  bob      │     gets group's policies
                        │  carol    │
                        └───────────┘
```

---

## Policy Types

### Policy Structure

Every IAM policy is a JSON document:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Read",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| **Effect** | `Allow` or `Deny` |
| **Action** | Which API actions (e.g., `s3:GetObject`, `ec2:StartInstances`) |
| **Resource** | Which AWS resources (by ARN) |
| **Condition** | Optional: when does this apply (IP, time, MFA, tags) |

### Types of Policies

| Type | Attached To | Managed By | Use Case |
|------|------------|-----------|----------|
| **AWS Managed** | Users, Groups, Roles | AWS | Pre-built common policies (`AmazonS3ReadOnlyAccess`) |
| **Customer Managed** | Users, Groups, Roles | You | Custom policies for your organization |
| **Inline** | Single User, Group, or Role | You | One-off, tightly coupled to a specific entity |
| **Resource-based** | AWS Resources (S3 bucket, SQS queue) | You | Cross-account access, public access |
| **Permission Boundary** | Users, Roles | You | Maximum permissions an entity can ever have |
| **SCP (Service Control Policy)** | AWS Organization OUs/Accounts | Org admin | Guardrails across all accounts in an org |
| **Session Policy** | STS session | Caller | Further restricts assumed role permissions |

### Identity-Based vs Resource-Based Policies

```
Identity-based (attached to WHO):
  "Alice is ALLOWED to read from my-bucket"
  → Attached to Alice's user/group/role

Resource-based (attached to WHAT):
  "my-bucket ALLOWS account 123456 to read"
  → Attached to the S3 bucket itself

Key difference for cross-account access:
  Identity-based: Requires permission on BOTH sides (role in account A + trust in account B)
  Resource-based: Can grant access directly (S3 bucket policy allows external account)
```

### Permission Boundaries — The Ceiling

```
Permission Boundary = Maximum possible permissions
Identity Policy = Requested permissions
Effective Permissions = Intersection (AND)

Example:
  Boundary: Allow s3:*, ec2:*
  Policy:   Allow s3:GetObject, lambda:InvokeFunction

  Effective: Only s3:GetObject
  (lambda:InvokeFunction denied because boundary doesn't include lambda)

Use case: Allow developers to create their own IAM roles
          but limit what those roles can do (prevent privilege escalation).
```

---

## Policy Evaluation Logic

AWS evaluates permissions in this order:

```
1. Explicit DENY in any policy?          → DENY (game over)
2. SCP allows it? (if in AWS Org)        → If not, DENY
3. Resource-based policy allows it?       → ALLOW (for resource-based)
4. Permission boundary allows it?         → If not, DENY
5. Session policy allows it?              → If not, DENY
6. Identity-based policy allows it?       → If yes, ALLOW
7. None of the above?                     → DENY (implicit deny)
```

**The golden rule**: **Deny always wins.** If ANY policy says Deny, the action is denied regardless of any Allow.

```
Example:
  Group policy:     Allow s3:*
  Inline policy:    Deny s3:DeleteObject

  Can user delete?  NO — explicit Deny overrides Allow.

  This is how you create "allow everything EXCEPT delete" policies.
```

---

## Roles — The Right Way to Grant Access

### Why Roles Over Users for Applications

```
❌ Bad: EC2 instance uses IAM User access keys
  - Keys are long-lived (never expire unless rotated)
  - Keys stored on disk or in environment variables
  - If instance is compromised, keys must be manually revoked
  - Keys can be accidentally committed to Git

✅ Good: EC2 instance uses IAM Role
  - Temporary credentials (auto-rotated every ~6 hours)
  - No keys on disk (SDK automatically gets credentials from instance metadata)
  - If instance is compromised, destroy instance — credentials expire automatically
  - Nothing to commit to Git
```

### How Role Assumption Works

```
Step 1: Create a role with a trust policy (WHO can assume it)
Step 2: Attach permission policies (WHAT the role can do)
Step 3: Entity assumes the role → gets temporary credentials

  EC2 Instance ──assume role──→ IAM Role ──→ Temporary Credentials
                                              (access key + secret + token)
                                              (expires in 1-12 hours)
```

### Common Role Patterns

**EC2 Instance Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

**Lambda Execution Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

**Cross-Account Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }
  }]
}
```

---

## Best Practices

### The Principle of Least Privilege

```
1. START WITH ZERO PERMISSIONS
   New users/roles have no permissions by default.
   Add only what's needed.

2. USE SPECIFIC ACTIONS, NOT WILDCARDS
   ❌ "Action": "s3:*"
   ✅ "Action": ["s3:GetObject", "s3:PutObject"]

3. USE SPECIFIC RESOURCES, NOT "*"
   ❌ "Resource": "*"
   ✅ "Resource": "arn:aws:s3:::my-app-bucket/*"

4. USE CONDITIONS TO NARROW ACCESS
   Add IP restrictions, MFA requirements, time-based conditions.

5. REVIEW AND REVOKE REGULARLY
   Use IAM Access Analyzer to find unused permissions.
   Use credential reports to find unused users/keys.
```

### Operational Best Practices

```
6. NEVER USE ROOT ACCOUNT FOR DAILY WORK
   Enable MFA on root. Lock away credentials.
   Create IAM users for daily operations.

7. USE GROUPS TO ASSIGN PERMISSIONS
   ❌ Attach policies directly to users
   ✅ Create groups (developers, ops, readonly), add users to groups

   Why: When someone changes role, just move them to a different group.

8. REQUIRE MFA FOR SENSITIVE OPERATIONS
   {
     "Condition": {
       "Bool": { "aws:MultiFactorAuthPresent": "true" }
     }
   }

9. USE ROLES FOR APPLICATIONS, NOT ACCESS KEYS
   EC2 → Instance Role
   Lambda → Execution Role
   ECS → Task Role
   Never hardcode access keys in application code.

10. ROTATE ACCESS KEYS REGULARLY
    If you must use access keys (CI/CD, external tools):
    - Create new key → Update application → Delete old key
    - Maximum key age: 90 days (enforce via IAM policy)

11. USE SEPARATE AWS ACCOUNTS PER ENVIRONMENT
    Production, staging, dev in separate accounts.
    Use AWS Organizations for central management.
    Use SCPs to enforce guardrails across accounts.

12. ENABLE CLOUDTRAIL
    Logs every API call (who did what, when, from where).
    Essential for security auditing and incident response.
```

---

## Anti-Patterns

### 1. Using Root Account for Operations

```
❌ Problem: Running deployments, managing resources with root credentials
Why it's dangerous: Root cannot be restricted. If compromised, attacker has
   full control of the entire AWS account. Cannot be limited by SCPs.

✅ Fix: Create IAM users/roles for all operations.
   Enable MFA on root. Store root credentials in a vault.
   Only use root for: initial setup, account-level settings, recovery.
```

### 2. Overly Permissive Policies (Admin to Everyone)

```
❌ Problem: Giving AdministratorAccess to all developers

{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}

Why it's dangerous: One compromised developer credential = full account access.
   Accidental deletion of production resources.
   No audit trail differentiation ("everyone can do everything").

✅ Fix: Role-based policies. Developers get specific permissions:
   - Dev account: broader permissions
   - Prod account: read-only + deploy pipeline role
```

### 3. Hardcoded Access Keys

```
❌ Problem: Access keys in application code, config files, or environment variables

// ❌ Never do this
AWSCredentials credentials = new BasicAWSCredentials(
    "AKIAIOSFODNN7EXAMPLE",
    "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
);

Why it's dangerous: Keys end up in Git repositories, Docker images, logs.
   Bots constantly scan GitHub for leaked AWS keys.

✅ Fix: Use IAM roles (instance role, task role, execution role).
   The AWS SDK automatically picks up role credentials.
   No keys in code, ever.

// ✅ SDK auto-discovers credentials from instance role
S3Client s3 = S3Client.builder().region(Region.US_EAST_1).build();
```

### 4. Long-Lived Access Keys Without Rotation

```
❌ Problem: Access keys created years ago, never rotated

Why it's dangerous: More time for keys to be leaked/compromised.
   No visibility into where keys are used after years.

✅ Fix: Enforce 90-day maximum key age.
   Use IAM credential report to find old keys.
   Automate rotation with AWS Secrets Manager.
```

### 5. Inline Policies Instead of Managed

```
❌ Problem: One-off inline policies on individual users

Why it's dangerous: Hard to audit, hard to update, no reuse.
   "Who has access to S3?" requires checking every user individually.

✅ Fix: Use customer-managed policies attached to groups or roles.
   Easy to audit: "Which entities have this policy attached?"
   Easy to update: change policy, all attached entities updated.
```

### 6. No Permission Boundaries for Delegated Administration

```
❌ Problem: Allowing developers to create IAM roles without boundaries

Developer creates:
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
→ Now developer has admin access via the role they created!

✅ Fix: Set a permission boundary when allowing role creation:
{
  "Effect": "Allow",
  "Action": "iam:CreateRole",
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "iam:PermissionsBoundary": "arn:aws:iam::123456:policy/dev-boundary"
    }
  }
}
```

---

## Real-World Scenarios

### Scenario 1: Microservices on ECS

```
Each service gets its own Task Role with only the permissions it needs:

Order Service Role:
  - s3:PutObject on order-documents-bucket
  - sqs:SendMessage on payment-queue
  - dynamodb:PutItem on orders-table

Payment Service Role:
  - sqs:ReceiveMessage on payment-queue
  - secretsmanager:GetSecretValue on stripe-api-key

Notification Service Role:
  - ses:SendEmail
  - sqs:ReceiveMessage on notification-queue

No service can access another service's resources.
```

### Scenario 2: CI/CD Pipeline

```
GitHub Actions → Assumes deploy-role via OIDC (no long-lived keys!)

Deploy Role:
  - ecs:UpdateService (deploy new container image)
  - ecr:GetDownloadUrlForLayer (pull images)
  - s3:PutObject on deployment-artifacts

  Condition: Only from specific GitHub repo

{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:myorg/myapp:ref:refs/heads/main"
    }
  }
}
```

### Scenario 3: Multi-Account Organization

```
AWS Organization
├── Root Account (billing, SCPs only)
├── Prod Account
│   └── SCP: Deny ec2:TerminateInstances without MFA
│   └── SCP: Deny region != us-east-1, eu-west-1
├── Staging Account
│   └── SCP: Deny creating expensive instance types
├── Dev Account
│   └── Broader permissions (developers can experiment)
└── Security Account
    └── CloudTrail, GuardDuty, Config aggregated here
    └── Cross-account role to audit other accounts
```

---

## Self-Check Questions

1. What's the difference between an IAM User and an IAM Role?
2. Why should applications use IAM Roles instead of access keys?
3. What happens when both an Allow and a Deny policy apply to the same action?
4. What is a permission boundary, and when would you use one?
5. How does cross-account access work with IAM Roles?
6. Name 3 IAM anti-patterns and their fixes.

<details>
<summary>Answers</summary>

1. A User has long-term credentials (password/access keys) and represents a person or application. A Role has temporary credentials, no permanent identity, and is assumed by users, services, or accounts for a session.
2. Roles provide temporary, auto-rotating credentials. No keys stored on disk or in code. If a system is compromised, credentials expire automatically. No risk of accidental key exposure in Git.
3. Explicit Deny always wins, regardless of any Allow policies. This is the "deny overrides" rule in IAM policy evaluation.
4. A permission boundary sets the maximum permissions an entity can ever have. Used when delegating IAM administration — allows developers to create roles but limits what those roles can do (prevents privilege escalation).
5. Account A creates a role with a trust policy allowing Account B's entities. Account B's user/role assumes Account A's role via STS AssumeRole, receiving temporary credentials. Both accounts must explicitly allow the access.
6. (a) Root account for daily work → use IAM users/roles. (b) Hardcoded access keys → use IAM roles. (c) Overly permissive policies → use least privilege with specific actions and resources.

</details>

---

## Navigation

**Related:**
- [AWS VPC & Networking](../networking/01-vpc-networking.md) — VPC, subnets, security groups
- [Microservices — Security & Testing](../../03-architecture/microservices/09-testing-and-security.md) — Service security patterns
- [Spring Security — OAuth2](../../01-java/02-spring-ecosystem/spring-security/04-oauth2.md) — Application-level auth

**Module Index:** [Learning Roadmap](../../README.md)
