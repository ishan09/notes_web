---
format: mdx
---

# 08 — Scaling Challenges & Solutions

Each challenge below is framed the way a real design review (or interview) runs it:
**Problem → Naive solution → Why it breaks → Production solution → Trade-off.**
These are the problems that actually keep this kind of system's engineers up at
night.

---

## Challenge 1 — Fan-out to huge channels

**Problem.** A message to `#general` in a 100,000-person workspace must reach every
connected member. One write, up to 100k deliveries.

```mermaid
flowchart TB
    naive["NAIVE: channel server pushes<br/>to all 100k connections itself"]
    naive --> break["💥 Single server is the bottleneck;<br/>100k socket writes per message;<br/>one mega-channel starves everything else"]

    classDef bad fill:#E74C3C,stroke:#922B21,color:#fff;
    class naive,break bad;
```

**Production solution: hierarchical / tree fan-out across the gateway fleet.**

```mermaid
flowchart TB
    cs["⚙️ Channel server (1 publish)"] --> ps["📡 Pub/Sub: 1 message to channel topic"]
    ps --> gw1["🔌 Gateway A<br/>(fans to its local members)"]
    ps --> gw2["🔌 Gateway B"]
    ps --> gw3["🔌 Gateway C ...(N)"]
    gw1 --> m1["sockets a,b,c"]
    gw2 --> m2["sockets d,e"]
    gw3 --> m3["sockets f..z"]

    classDef co fill:#1ABC9C,stroke:#117864,color:#fff;
    classDef bu fill:#F39C12,stroke:#9C640C,color:#fff;
    classDef gw fill:#7D3C98,stroke:#4A235A,color:#fff;
    classDef u fill:#4A90D9,stroke:#1B4F72,color:#fff;
    class cs co;
    class ps bu;
    class gw1,gw2,gw3 gw;
    class m1,m2,m3 u;
```

The channel server publishes **once**; the pub/sub layer delivers to the **set of
gateways that hold members** (the subscription registry from
[03](./03-realtime-messaging-architecture.md)); each gateway does its **local**
fan-out in parallel. Work is spread across the whole fleet, not one node.

| Trade-off | Note |
|-----------|------|
| More moving parts (registry, pub/sub) | Worth it; the alternative doesn't scale at all |
| Registry must stay accurate | Stale entries waste a push; missing entries drop delivery → backed up by pull/backfill |

---

## Challenge 2 — The fat boot payload

**Problem.** `rtm.start` returned *everything* about a workspace on connect. For a
huge workspace that payload became enormous and slow — every reconnect re-sent
megabytes.

**Naive fix:** paginate the payload. Helps a little; still front-loads too much.

**Production solution (Slack's actual evolution): lazy loading + flannel edge
cache + client-side store.**

```mermaid
flowchart LR
    old["📦 Fat boot:<br/>all channels + all members + all unreads"] -->|"rearchitect"| new["🪶 Lean boot:<br/>minimal snapshot"]
    new --> lazy["Fetch channel members / history<br/>on demand (when opened)"]
    new --> edge["Flannel edge cache answers<br/>'who is @U123?' near the socket"]
    new --> localstore["Client local store keeps<br/>what it already knows"]

    classDef bad fill:#E74C3C,stroke:#922B21,color:#fff;
    classDef good fill:#27AE60,stroke:#196F3D,color:#fff;
    class old bad;
    class new,lazy,edge,localstore good;
```

| Trade-off | Note |
|-----------|------|
| More on-demand requests | But each is tiny & cacheable; total bytes & latency drop massively |
| Client complexity ↑ | Needs the local store + sync engine (see [07](./07-client-and-mobile.md)) |

---

## Challenge 3 — The thundering herd / reconnection storm

**Problem.** A gateway (or whole AZ) drops. All its connections reconnect *at the
same instant*, overwhelming the survivors → cascade.

```mermaid
flowchart TB
    fail["🔌 Gateway dies"] --> herd["🌊 All its clients reconnect NOW"]
    herd --> next["Next gateway saturates → it dies too"]
    next --> cascade["⛓️ Cascading failure"]

    classDef bad fill:#E74C3C,stroke:#922B21,color:#fff;
    class fail,herd,next,cascade bad;
```

**Production solution: layered defense.**

```mermaid
flowchart LR
    c["Client: exp backoff + jitter"] --> a["Admission control:<br/>server rate-limits new conns"]
    a --> b["Backpressure:<br/>'reconnect to URL X in N s'"]
    b --> g["Gradual capacity restore"]
    g --> warm["Pre-warmed standby capacity<br/>+ connection draining on deploy"]

    classDef good fill:#27AE60,stroke:#196F3D,color:#fff;
    class c,a,b,g,warm good;
```

| Layer | Role |
|-------|------|
| Client backoff + jitter | Spreads the herd over time (see [07](./07-client-and-mobile.md)) |
| Admission control | Server caps accept-rate so it never tips over |
| Backpressure / redirect | Actively steer clients to spare capacity |
| Connection draining | Deploys don't drop all sockets at once |

This exact failure mode is what bit Slack on **Jan 4, 2021** — detailed in
[09-real-world-incidents.md](./09-real-world-incidents.md).

---

## Challenge 4 — Hot shards / hot partitions

**Problem.** One enormous workspace (or one viral channel) concentrates load on a
single shard/partition.

```mermaid
flowchart TB
    hot["🔥 One workspace = 30% of all traffic,<br/>but lives on one shard"]
    hot --> fix["FIXES"]
    fix --> reshard["🔀 Vitess online resharding:<br/>split the hot shard, no downtime"]
    fix --> bucket["⏱️ Time-bucket partitions<br/>(wide-column / Discord)"]
    fix --> cache["🧊 Cache + read-coalescing<br/>(1 DB read serves many waiters)"]
    fix --> isolate["🧱 Move giant tenants to<br/>dedicated shards/cells"]

    classDef bad fill:#E74C3C,stroke:#922B21,color:#fff;
    classDef good fill:#27AE60,stroke:#196F3D,color:#fff;
    class hot bad;
    class fix,reshard,bucket,cache,isolate good;
```

The combination of **online resharding** (Vitess), **time-bucketing** (wide-column),
and **read-coalescing** (Discord's Rust services) is the standard toolkit. See
[04](./04-data-model-and-storage.md).

---

## Challenge 5 — Cost of millions of idle connections

**Problem.** 12M mostly-idle WebSocket connections still consume RAM, file
descriptors, and keepalive traffic — pure cost for zero activity.

**Production solution:**

| Lever | Effect |
|-------|--------|
| **Dedicated, memory-optimized gateway fleet** | Cheapest \$/connection; don't run logic CPUs idle just to hold sockets |
| **Efficient connection runtime (Elixir/BEAM, epoll-based)** | Hundreds of thousands of conns per node |
| **Tune heartbeat interval** | Less frequent keepalive = less traffic, but slower dead-conn detection — a real trade-off |
| **Presence subscription pruning** | Idle connections generate almost no event traffic (from [05](./05-presence-typing-and-unreads.md)) |

This is the clearest example of the **"minimize infra usage"** theme: the dominant
cost is *holding connections*, so the architecture is shaped to make idle
connections nearly free.

---

## Challenge 6 — Multi-tenant noisy neighbors → cell-based architecture

**Problem.** All tenants on shared infra means one tenant's incident (or one bad
deploy) can take down *everyone*. A single global failure domain is unacceptable
at this scale.

**Production solution: cells (a.k.a. shards/pods of the whole stack).**

```mermaid
flowchart TB
    subgraph cellA["🟦 Cell A (self-contained stack)"]
        gA["gateways"] --> sA["services"] --> dA[("data")]
    end
    subgraph cellB["🟩 Cell B"]
        gB["gateways"] --> sB["services"] --> dB[("data")]
    end
    subgraph cellC["🟧 Cell C"]
        gC["gateways"] --> sC["services"] --> dC[("data")]
    end
    router["🧭 Tenant → cell router"] --> cellA & cellB & cellC

    classDef r fill:#7D3C98,stroke:#4A235A,color:#fff;
    class router r;
```

| Benefit | Detail |
|---------|--------|
| **Blast-radius containment** | A failing cell affects only its tenants, not the whole platform |
| **Independent deploys/canaries** | Roll out to one cell first; bad change ≠ global outage |
| **Capacity & data-residency mapping** | Place a cell in the EU for EU-resident tenants (see [10](./10-security-privacy-and-compliance.md)) |
| **Horizontal growth** | Add capacity by adding cells, not by scaling one giant system |

Cell-based architecture is the **macro-scaling answer**: you stop scaling "the
system" and start scaling "the number of independent systems." It also directly
serves reliability and compliance ([10](./10-security-privacy-and-compliance.md),
[11](./11-reliability-and-cost.md)).

---

## Summary map

```mermaid
flowchart LR
    f["Fan-out"] --> ft["tree fan-out + subscription registry"]
    b["Fat boot"] --> bt["lazy load + edge cache"]
    h["Thundering herd"] --> ht["backoff/jitter + admission control"]
    hs["Hot shard"] --> hst["reshard + bucket + coalesce"]
    cc["Idle conn cost"] --> cct["dedicated efficient gateway fleet"]
    nn["Noisy neighbor"] --> nnt["cell-based architecture"]

    classDef p fill:#E74C3C,stroke:#922B21,color:#fff;
    classDef s fill:#27AE60,stroke:#196F3D,color:#fff;
    class f,b,h,hs,cc,nn p;
    class ft,bt,ht,hst,cct,nnt s;
```

Next: **real, publicly reported incidents and what they taught the industry** →
[09-real-world-incidents.md](./09-real-world-incidents.md).
