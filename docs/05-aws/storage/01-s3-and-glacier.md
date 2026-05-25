# AWS S3 & Glacier — Storage Classes, Costing, and When to Use What

## What is S3?

Amazon S3 (Simple Storage Service) is object storage — store any file (image, video, backup, log, JSON) as an **object** in a **bucket**. Objects are identified by a key (path-like string), not a file system hierarchy.

```
Bucket: my-app-uploads
  └── users/alice/profile.jpg        ← key = "users/alice/profile.jpg"
  └── orders/2024/01/export.csv
  └── backups/2024-01-15/db.tar.gz
```

**Key properties:**
- Unlimited storage, pay per GB stored + requests
- 11 nines durability (99.999999999%) — data replicated across ≥3 AZs
- Objects up to 5TB (multipart upload above 100MB)
- Not a file system — no append, no partial writes, no folder renames

---

## S3 Storage Classes — The Core of Cost Optimization

S3 has 7 storage classes. Same data, very different prices. Choosing the right class is the #1 cost lever.

```
Frequency of access ──────────────────────────────────────────►
Hot                                                           Cold
│                                                               │
S3 Standard → S3 Intelligent-Tiering → S3 Standard-IA → S3 One Zone-IA → S3 Glacier Instant → S3 Glacier Flexible → S3 Glacier Deep Archive
│                                                               │
Expensive to store, cheap to retrieve       Cheap to store, expensive to retrieve
```

---

## Storage Class Comparison

| Storage Class | Use Case | Min Storage | Retrieval | Storage Cost (approx) | Retrieval Cost |
|---|---|---|---|---|---|
| **S3 Standard** | Active data, frequent access | None | Immediate | ~$0.023/GB/mo | Free |
| **S3 Intelligent-Tiering** | Unknown/changing access patterns | None | Immediate | ~$0.023/GB/mo + $0.0025/1k objects monitoring fee | Free (frequent tier) |
| **S3 Standard-IA** | Infrequent access, kept long-term | 30 days | Immediate | ~$0.0125/GB/mo | ~$0.01/GB |
| **S3 One Zone-IA** | Infrequent, reproducible data | 30 days | Immediate | ~$0.01/GB/mo | ~$0.01/GB |
| **S3 Glacier Instant Retrieval** | Archives accessed ~quarterly | 90 days | Milliseconds | ~$0.004/GB/mo | ~$0.03/GB |
| **S3 Glacier Flexible Retrieval** | Archives accessed ~yearly | 90 days | Minutes–hours | ~$0.0036/GB/mo | ~$0.01/GB (bulk) |
| **S3 Glacier Deep Archive** | Long-term compliance (7–10 yrs) | 180 days | 12–48 hours | ~$0.00099/GB/mo | ~$0.02/GB |

> Prices are approximate US-East-1 rates — always check AWS pricing page for current figures.

---

## S3 Glacier Deep Dive

Glacier is not a separate service anymore — it's S3 storage classes for archival. Three tiers:

### Glacier Instant Retrieval
- Millisecond access (same as Standard) but ~80% cheaper storage
- Minimum 90-day storage commitment
- **Use**: Medical images, news media, user-generated content accessed quarterly

### Glacier Flexible Retrieval (formerly just "Glacier")
Three retrieval options:

| Retrieval tier | Speed | Cost |
|---|---|---|
| Expedited | 1–5 minutes | ~$0.03/GB + $0.01/request |
| Standard | 3–5 hours | ~$0.01/GB + $0.05/1k requests |
| Bulk | 5–12 hours | ~$0.0025/GB (cheapest) |

- **Use**: Backups, disaster recovery archives accessed once a year or less

### Glacier Deep Archive
- Cheapest storage in all of AWS (~$1/TB/month)
- 12–48 hour retrieval — truly "cold" storage
- Minimum 180-day storage commitment
- **Use**: Regulatory compliance (financial records 7 years, medical 10 years), tape replacement

```
Real cost comparison — storing 100TB for 1 year:
  S3 Standard:           100,000 GB × $0.023 × 12 = $27,600/yr
  S3 Standard-IA:        100,000 GB × $0.0125 × 12 = $15,000/yr
  Glacier Flexible:      100,000 GB × $0.0036 × 12 = $4,320/yr
  Glacier Deep Archive:  100,000 GB × $0.00099 × 12 = $1,188/yr
```

---

## S3 Intelligent-Tiering — Auto Cost Optimization

Automatically moves objects between tiers based on access patterns. No retrieval fees within the service — only a small monitoring fee per object.

```
Intelligent-Tiering internal tiers:
  Frequent Access tier      ← objects accessed recently
  Infrequent Access tier    ← not accessed for 30 days   (40% cheaper)
  Archive Instant tier      ← not accessed for 90 days   (68% cheaper)
  Archive Access tier       ← not accessed for 90-180d   (95% cheaper, opt-in)
  Deep Archive Access tier  ← not accessed for 180+ days (95%+ cheaper, opt-in)
```

**When to use**: You have data with unpredictable access — some objects get accessed daily, others sit untouched for months. Let AWS figure out the right tier.

**When NOT to use**: Objects < 128KB (not eligible — always billed at Frequent Access rate). Objects you know will always be hot (just use Standard).

---

## S3 Lifecycle Policies — Automate Tier Transitions

Instead of manually moving data, define rules to transition objects automatically:

```json
{
  "Rules": [
    {
      "ID": "archive-old-logs",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555    // delete after 7 years
      }
    }
  ]
}
```

```yaml
# AWS CDK / Terraform equivalent
lifecycle_rules:
  - id: archive-logs
    enabled: true
    prefix: logs/
    transitions:
      - days: 30
        storage_class: STANDARD_IA
      - days: 90
        storage_class: GLACIER_IR
      - days: 365
        storage_class: DEEP_ARCHIVE
    expiration:
      days: 2555
```

**Common lifecycle pattern for application logs:**
```
Day 0–29:   S3 Standard       ← recent logs, queried frequently
Day 30–89:  S3 Standard-IA    ← occasionally needed for debugging
Day 90–364: Glacier Instant   ← rare access, compliance hold
Day 365+:   Glacier Deep Archive ← pure compliance archival
Expire:     Day 2555 (7 years) ← legal retention period ends
```

---

## Cost Components — What You Actually Pay For

S3 billing has 4 parts:

### 1. Storage (per GB/month)
Straightforward — how much data you store × storage class rate.

### 2. Requests (per 1,000 requests)
| Request type | Standard | Glacier |
|---|---|---|
| PUT, COPY, POST, LIST | $0.005/1k | $0.03/1k |
| GET, SELECT | $0.0004/1k | varies |
| Lifecycle transitions | $0.01/1k | — |

**Pitfall**: Glacier retrieval requests can cost more than the storage itself for large restores. A 1TB restore from Glacier Flexible (expedited) costs ~$30 in retrieval fees alone.

### 3. Data Transfer
- **Ingress** (upload to S3): Free
- **Egress to internet**: ~$0.09/GB (first 10TB/month)
- **Egress to EC2 in same region**: Free
- **Cross-region replication**: ~$0.02/GB

### 4. Management Features (optional)
- S3 Intelligent-Tiering monitoring: $0.0025/1k objects/month
- S3 Inventory: $0.0025/million objects listed
- S3 Analytics: $0.10/million objects/month

---

## Decision Tree — Which Storage Class?

```
Is the data accessed frequently (daily/weekly)?
  YES → S3 Standard
  NO  → Is access pattern predictable?
          NO  → S3 Intelligent-Tiering
          YES → How often accessed?
                  Monthly → S3 Standard-IA
                  Quarterly → S3 Glacier Instant Retrieval
                  Yearly → S3 Glacier Flexible Retrieval
                  Never (compliance only) → S3 Glacier Deep Archive

Is the data reproducible if lost? (can be regenerated)
  YES → S3 One Zone-IA (saves 20% vs Standard-IA, single AZ)
  NO  → Standard-IA or above (multi-AZ)
```

---

## S3 vs Other Storage Types

| | S3 | EBS | EFS | Glacier |
|---|---|---|---|---|
| Type | Object storage | Block storage | File storage (NFS) | Archival object storage |
| Access | HTTP API | Attached to EC2 | Mounted as NFS | HTTP API (slow retrieval) |
| Use case | Files, backups, static assets | EC2 OS disk, databases | Shared file system across EC2 | Long-term compliance archives |
| Latency | ms | μs | ms | minutes–hours |
| Cost | Low | Medium | Medium-high | Very low |
| Durability | 11 nines | 5 nines | 11 nines | 11 nines |
| Scalability | Unlimited | Up to 64TB per volume | Unlimited | Unlimited |

---

## Real-World Cost Saving Patterns

### Pattern 1: Log Archival (most common)
```
Application logs → S3 Standard (30d) → Standard-IA (60d) → Glacier Deep Archive (7yr) → Delete
Savings: ~95% vs keeping everything in Standard
```

### Pattern 2: User-Generated Content
```
New uploads → S3 Standard
After 90 days of no access → Glacier Instant (auto via Intelligent-Tiering)
Savings: ~80% on cold content, immediate retrieval when user comes back
```

### Pattern 3: Database Backups
```
Daily backups → S3 Standard (7d, for fast restore)
Weekly backups → Standard-IA (30d)
Monthly backups → Glacier Flexible (1yr)
Yearly backups → Glacier Deep Archive (7yr) → Delete
Savings: ~90% vs keeping all backups in Standard
```

### Pattern 4: ML Training Data
```
Active training datasets → S3 Standard (fast reads from SageMaker)
Completed experiment data → Standard-IA
Raw data lake → Glacier Instant (quick restore for re-training)
```

---

## Interview Questions

**Q: What is the difference between S3 Standard-IA and Glacier?**
A: Standard-IA gives immediate (millisecond) retrieval but is cheaper to store than Standard — good for data you access occasionally. Glacier (Flexible) is even cheaper to store but retrieval takes minutes to hours — for data you rarely or never need to access quickly, like compliance archives.

**Q: When would you use S3 Intelligent-Tiering?**
A: When access patterns are unpredictable. Intelligent-Tiering automatically moves objects between hot and cold tiers based on access. The trade-off is a per-object monitoring fee (~$0.0025/1k objects/month) — not worth it for tiny objects (< 128KB) or objects you know are always hot.

**Q: A customer says their S3 bill is unexpectedly high after moving data to Glacier. Why?**
A: Several causes — (1) retrieval fees: Glacier charges per-GB for retrievals, which can exceed months of storage savings if you retrieve large amounts; (2) minimum storage duration: Glacier Flexible charges for 90 days minimum even if you delete earlier; (3) request costs: PUT to Glacier costs 6× more than Standard per request; (4) data transfer egress fees when downloading restored data.

**Q: What is the minimum storage duration in Glacier Deep Archive and why does it matter?**
A: 180 days. If you store 1TB in Deep Archive and delete it after 30 days, AWS still charges you for 180 days. Factor this into cost projections — Deep Archive is only cost-effective for data you'll keep for at least 6 months.

---

## Quick Check
1. You store application logs. They're queried daily for the first week, occasionally for a month, then never again. Design a lifecycle policy.
2. What is the difference between Glacier Instant Retrieval and Glacier Flexible Retrieval?
3. Why is Glacier Deep Archive's ~$1/TB/month price misleading when estimating total cost?
4. You have 500TB of user profile images. About 20% are accessed regularly, 80% haven't been touched in 6 months. Which storage class would you recommend and why?
5. What does S3 charge for that's easy to forget beyond just storage cost?
