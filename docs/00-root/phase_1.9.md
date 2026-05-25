WMS Phase 1.9 — Pre-Phase 2 Hardening

Purpose: Introduce critical correctness primitives before Phase 2 (UI, RBAC, reports). These changes ensure data integrity in an event-sourced system and prevent irreversible inconsistencies.

Scope: Idempotency, concurrency control, minimal inventory, minimal location model.


---

1. Idempotency Layer

Goal

Prevent duplicate command execution due to retries, double-clicks, or network failures.

Changes

1.1 Command Structure Update

Add fields to all commands:

command_id :: UUID

idempotency_key :: String.t()


1.2 Persistence Strategy

Create table:

idempotency_keys
- id
- key (unique)
- command_name
- response_payload
- inserted_at

1.3 Flow

1. API receives request with Idempotency-Key header


2. Check DB:

If exists → return stored response

If not → process command



3. Store result



1.4 Context Layer

Add wrapper:

dispatch_with_idempotency(command, key)

1.5 Constraints

Unique index on key

TTL cleanup (optional via Oban)



---

2. Concurrency Control (Optimistic Locking)

Goal

Prevent conflicting updates from multiple users.

Changes

2.1 Use Expected Version

When dispatching:

dispatch(command, consistency: :strong)

2.2 Aggregate Version Check

Ensure commands include:

expected_version


Reject if mismatch:

{:error, :concurrency_conflict}

2.3 API Behavior

Return HTTP 409 on conflict

UI should prompt retry



---

3. Minimal Inventory Projection

Goal

Track actual stock created via receiving and putaway.

Schema

inventory_levels
- id
- sku_id
- location_id
- quantity
- inserted_at
- updated