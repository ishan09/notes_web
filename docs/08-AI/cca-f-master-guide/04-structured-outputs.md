# 04 — Structured Outputs

> **Domain mapping:** Domain 4 — *Prompt Engineering & Structured Output* — **20%**. The blueprint explicitly
> names **JSON schema enforcement**, **data extraction patterns**, and **validation retry loops**.
> Expect at least one question that hinges on *structured output vs tool call*.

---

## 4.1 Fundamentals

### 4.1.1 The problem structured output solves

An LLM emits text. Your system needs a typed object. Everything between those two facts is a source of
production incidents:

```
"Sure! Here's the extracted data:\n\n```json\n{\"total\": 1240.50}\n```\n\nLet me know if you need anything else!"
```

Naive parsing must strip prose, strip fences, handle trailing commas, handle a missing field, handle a number
returned as a string, handle a hallucinated extra field, and handle a truncated response. Every one of those is
a distinct failure mode that will occur at scale.

**Structured output moves the guarantee from your parser into the decoder.** The model is constrained at
generation time so it *cannot* emit tokens that violate the schema.

### 4.1.2 Three levels of "structured"

| Level | Mechanism | Guarantee | Failure mode |
|---|---|---|---|
| **1. Prompted JSON** | "Respond with JSON matching…" | None | Prose wrapper, fences, drift, invalid JSON |
| **2. Validated JSON** | Prompted + JSON Schema validation + retry | Eventually valid, or you fail loudly | Wasted calls; latency spikes; retry loops |
| **3. Constrained decoding** | `output_config.format` / `strict: true` | **Structurally guaranteed** | Semantic errors only (valid shape, wrong values); truncation; refusal |

**Always aim for level 3 where supported, and keep level-2 validation anyway.** Level 3 guarantees *shape*, not
*truth*. A schema cannot tell you the extracted invoice total is wrong.

### 4.1.3 **[Claude-specific]** The two features

Structured outputs are not a separate API. They are two parameters on the Messages API:

```python
# (a) JSON outputs — constrain the RESPONSE
response = client.messages.create(
    model="claude-opus-5",
    max_tokens=4096,
    output_config={"format": {"type": "json_schema", "schema": INVOICE_SCHEMA}},
    messages=[{"role": "user", "content": "Extract the invoice fields from <doc>…</doc>"}],
)

# (b) Strict tool use — constrain TOOL ARGUMENTS
tools = [{
    "name": "create_ticket",
    "description": "Create a support ticket. Call after the user confirms the summary.",
    "strict": True,                      # ← top-level on the tool, NOT on tool_choice
    "input_schema": {
        "type": "object",
        "properties": {
            "title":    {"type": "string", "description": "≤80 chars, imperative mood"},
            "severity": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]},
            "component":{"type": "string", "enum": ["billing", "auth", "search", "other"]},
        },
        "required": ["title", "severity", "component"],
        "additionalProperties": False,   # ← required for strict
    },
}]
```

**Two facts that are exam-grade traps:**

1. `strict: true` goes on the **tool definition**, alongside `name`/`description`/`input_schema` — **not** on
   `tool_choice`.
2. The **recommended** client-side path is `client.messages.parse()`, which validates the response against your
   schema automatically. The older top-level `output_format` parameter is **deprecated**; the canonical
   API-level parameter is **`output_config.format`**.

```python
from pydantic import BaseModel

class Invoice(BaseModel):
    invoice_number: str
    total_cents: int
    currency: str
    line_items: list[str]

parsed = client.messages.parse(
    model="claude-opus-5", max_tokens=4096,
    output_config={"format": Invoice},
    messages=[...],
)
invoice: Invoice = parsed.parsed          # already validated
```

**Model support (August 2026 — verify):** Fable 5, Opus 5, Opus 4.8, Sonnet 5, Haiku 4.5; legacy Opus 4.5 / 4.1
also support it.

---

## 4.2 Schema design

### 4.2.1 **[Claude-specific]** JSON Schema subset — what is and is not supported

**Supported**

- Types: `object`, `array`, `string`, `integer`, `number`, `boolean`, `null`
- `enum`, `const`, `anyOf`, `allOf`, `$ref` / `$defs`
- String formats: `date-time`, `time`, `date`, `duration`, `email`, `hostname`, `uri`, `ipv4`, `ipv6`, `uuid`
- `additionalProperties: false` — **required on every object**

**Not supported**

- **Recursive schemas** (a tree of arbitrary depth)
- **Numeric constraints**: `minimum`, `maximum`, `multipleOf`
- **String constraints**: `minLength`, `maxLength`, `pattern`
- **Complex array constraints**
- `additionalProperties` set to anything other than `false`

The Python and TypeScript SDKs quietly help: they **strip unsupported constraints** from the schema sent to the
API and **validate them client-side** instead. This is convenient and dangerous — it means `maximum: 100` in
your Pydantic model is a *client-side* check, so the model can still generate 500 and you will get a validation
error rather than a constrained generation. **Design your prompt to state numeric bounds explicitly**, because
the schema will not enforce them.

**Working around no-recursion:** flatten to a bounded depth, or return a flat node list with parent IDs and
rebuild the tree in code:

```json
{"nodes": [
  {"id": "n1", "parent_id": null, "label": "root"},
  {"id": "n2", "parent_id": "n1", "label": "child"}
]}
```

**Working around no-`pattern`:** use an `enum` when the value space is closed, a `format` when one exists
(`uuid`, `date`, `email`), and a deterministic post-validator otherwise.

### 4.2.2 Design principles

| Principle | Why | Example |
|---|---|---|
| **Enums over free strings** | Removes an entire hallucination class; makes evaluation exact | `"severity": {"enum": ["P1","P2","P3","P4"]}` |
| **Explicit nulls over omission** | `required` + nullable is unambiguous; optional fields hide "the model forgot" | `{"type": ["string","null"]}` and put it in `required` |
| **Flat over deep** | Deep nesting increases error rate and token cost | 2 levels is usually plenty |
| **Integers for money** | Floats introduce representation error | `total_cents: integer` |
| **Model uncertainty explicitly** | Lets you route low-confidence output to review | `confidence: number`, `needs_review: boolean` |
| **Carry provenance** | Makes the output auditable and testable | `source_span: {page, start, end}` |
| **Describe every property** | Descriptions are prompt surface the model actually reads | `"description": "ISO-4217 code, uppercase"` |

**The "explicit null" point is worth dwelling on.** With optional fields you cannot distinguish "the document
has no PO number" from "the model failed to extract it". With `required` + nullable you can — and you can then
measure the two separately in evaluation.

### 4.2.3 A production-grade extraction schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["invoice_number", "issue_date", "total_cents", "currency",
               "line_items", "extraction_confidence", "unresolved_fields"],
  "properties": {
    "invoice_number": {"type": ["string", "null"],
      "description": "Exactly as printed. null if not present."},
    "issue_date": {"type": ["string", "null"], "format": "date",
      "description": "ISO 8601 date. null if absent or illegible."},
    "total_cents": {"type": ["integer", "null"],
      "description": "Grand total in minor units. 1240.50 USD -> 124050. Never negative."},
    "currency": {"type": ["string", "null"],
      "enum": ["USD", "EUR", "GBP", "JPY", null],
      "description": "ISO-4217. null if not determinable."},
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["description", "quantity", "unit_price_cents"],
        "properties": {
          "description": {"type": "string"},
          "quantity": {"type": "integer"},
          "unit_price_cents": {"type": "integer"}
        }
      }
    },
    "extraction_confidence": {"type": "number",
      "description": "0.0-1.0. Below 0.7 means a human should verify."},
    "unresolved_fields": {"type": "array", "items": {"type": "string"},
      "description": "Names of fields that could not be determined from the document."}
  }
}
```

`unresolved_fields` and `extraction_confidence` are what make this **operable**: they turn a black-box
extraction into something you can route, alert on, and measure. Note the "never negative" and "0.0–1.0"
constraints live in *descriptions* because numeric constraints are not enforced by the schema — you must also
check them in code.

### 4.2.4 Backward compatibility

Schemas are contracts with downstream consumers. Same rules as any API:

| Change | Compatible? | Notes |
|---|---|---|
| Add an optional field | ✅ | Safe |
| Add a **required** field | ❌ | Breaks old consumers; needs a version bump |
| Add an enum value | ⚠️ | Breaks consumers that exhaustively switch |
| Remove or rename a field | ❌ | Breaking |
| Narrow a type (`string` → `enum`) | ❌ | Breaking |
| Widen a type (`string` → `string\|null`) | ⚠️ | Breaks consumers that assumed non-null |

**[Claude-specific] cost note:** a new schema incurs a **one-time compilation cost** on first use, then is
cached for 24 hours. If you generate schemas dynamically per request, you pay that latency every time — a real
and non-obvious performance bug. Keep schemas static and versioned.

---

## 4.3 Reliability and the validation retry loop **[Officially named in D4]**

### 4.3.1 What can still go wrong at level 3

Constrained decoding guarantees the shape. It does **not** guarantee:

| Failure | Cause | Detection |
|---|---|---|
| **Truncation** | `stop_reason == "max_tokens"` — output cut mid-object | Check `stop_reason` **before** parsing |
| **Refusal** | `stop_reason == "refusal"` — output may not match the schema at all | Check `stop_reason`; read `stop_details` |
| **Semantically wrong values** | Valid types, wrong content (total ≠ sum of line items) | Business-rule validation in code |
| **Empty / degenerate** | All nulls because the document was unreadable | Confidence + `unresolved_fields` checks |
| **Constraint violations the schema can't express** | `maximum`, `pattern`, cross-field rules | Client-side validation |

> **The rule:** *check `stop_reason` before you parse.* This is the same rule as §2.4.2, and it is the most
> common defect in structured-output code.

### 4.3.2 The validation retry loop, done correctly

```python
from jsonschema import validate, ValidationError

MAX_ATTEMPTS = 3

def extract(document: str) -> Invoice:
    messages = [{"role": "user", "content": build_prompt(document)}]

    for attempt in range(MAX_ATTEMPTS):
        r = client.messages.create(
            model=MODEL, max_tokens=8000,
            output_config={"format": {"type": "json_schema", "schema": INVOICE_SCHEMA}},
            messages=messages,
        )

        # 1. Structural gates BEFORE parsing
        if r.stop_reason == "max_tokens":
            raise TruncatedOutput("increase max_tokens / split the document")
        if r.stop_reason == "refusal":
            raise Refused(r.stop_details)

        raw = "".join(b.text for b in r.content if b.type == "text")

        # 2. Schema validation (belt and braces even with constrained decoding)
        try:
            obj = json.loads(raw)
            validate(obj, INVOICE_SCHEMA)
        except (json.JSONDecodeError, ValidationError) as e:
            messages += [
                {"role": "assistant", "content": r.content},
                {"role": "user", "content":
                    f"That output failed validation: {e}. "
                    f"Return only a corrected JSON object matching the schema."},
            ]
            continue

        # 3. Business rules the schema cannot express
        errors = business_rules(obj)     # totals reconcile, dates plausible, currency valid
        if errors:
            messages += [
                {"role": "assistant", "content": r.content},
                {"role": "user", "content":
                    "The output was well-formed but violated these rules: "
                    + "; ".join(errors) + ". Re-extract, correcting only these fields."},
            ]
            continue

        return Invoice(**obj)

    # 4. Terminal: fail LOUDLY, do not return a guess
    raise ExtractionFailed(document_id, attempts=MAX_ATTEMPTS)
```

**Seven design points in that loop, each of which is a plausible exam distinction:**

1. **Bounded attempts.** An unbounded repair loop is a cost and latency incident waiting to happen.
2. **Structural checks before parsing.** Truncation and refusal are not validation errors.
3. **Feed the *specific* error back.** "Invalid JSON" fixes far less than "`total_cents` must be an integer;
   you returned the string `'1,240.50'`".
4. **Keep the failed attempt in the history.** The model needs to see what it produced to correct it.
5. **Business rules are separate from schema rules.** The schema owns shape; code owns truth.
6. **Fail loudly at the end.** Never return a partially-repaired object as if it were valid.
7. **Instrument it.** Retry rate is a leading indicator of prompt/schema/document-quality drift.

### 4.3.3 Repair vs re-ask vs escalate

| Strategy | Cost | When |
|---|---|---|
| **Repair** (send the error, ask for a fix) | 1 extra call, cheap input | Small, local errors — a wrong type, a missing field |
| **Re-ask** (fresh call, no failed context) | 1 extra call | The failure looks like a bad sample; the context may be poisoning the retry |
| **Escalate model tier** | 1 call at higher cost | The failure is capability-related (complex document) |
| **Escalate to human** | High latency, high accuracy | Low confidence, high stakes, repeated failure |
| **Decompose** | N calls | The document is too large or has too many fields for one pass |

**Heuristic:** repair once, then re-ask once at a higher tier, then escalate to a human. Three model attempts is
almost always the right ceiling — beyond that, the failure is systematic and more calls will not fix it.

### 4.3.4 Fallback behaviour

Decide, per field, what "no answer" means:

- **Hard-required for downstream** → fail the record; route to a review queue.
- **Nice-to-have** → emit `null` and record it in `unresolved_fields`.
- **Derivable** → compute it deterministically (total from line items) rather than asking again.

A dead letter queue for failed extractions, with the original document and the failure reason, is the difference
between a pipeline you can operate and one you cannot.

---

## 4.4 Structured output vs tool calls **[High-probability exam topic]**

These look similar — both produce a JSON object conforming to a schema. They are architecturally different.

| | **Structured output** (`output_config.format`) | **Tool call** (`tools` + `strict`) |
|---|---|---|
| Constrains | The model's **final response** | The **arguments** to a function |
| Semantics | "Return data in this shape" | "I want to invoke this capability" |
| Who decides it happens | You, always | The model, per turn (unless forced) |
| Number per turn | One response | Zero, one, or many (parallel) |
| Continues the loop | No — terminal | Yes — you execute and return `tool_result` |
| Model's mental frame | "Format my answer" | "Take an action" |
| Natural fit | Extraction, classification, transformation | Retrieval, side effects, computation |

### 4.4.1 Decision rule

```
Is the JSON the ANSWER, or a REQUEST for you to do something?

  ANSWER  ───────────────▶ structured output
  REQUEST ───────────────▶ tool call

Does the model need to choose whether to produce it at all?

  Always produce it ─────▶ structured output
  Model decides ─────────▶ tool call

Do you need several in one turn?

  One ───────────────────▶ structured output
  Many (parallel) ───────▶ tool calls
```

### 4.4.2 The legacy anti-pattern

Before structured outputs existed, the standard trick was to define a fake tool (`record_answer`) with the
desired schema and force `tool_choice: {"type": "tool", "name": "record_answer"}` — a "tool" nobody executes,
used purely to get schema enforcement.

**That is now an anti-pattern.** Use `output_config.format`. If you see it in a codebase or an exam option, it
signals code written before structured outputs shipped. It still *works*, but it muddles the semantics
(the model thinks it is taking an action), it consumes a tool slot, and it interacts badly with real tool use.

### 4.4.3 Combining them

The common production shape is: **tools to gather, structured output to answer.**

```python
# Phase 1 — agentic gathering, tools, no output_config
while r.stop_reason == "tool_use":
    ...

# Phase 2 — one final call with the gathered context, structured
final = client.messages.create(
    model=MODEL, max_tokens=4096,
    output_config={"format": {"type": "json_schema", "schema": ANSWER_SCHEMA}},
    messages=messages + [{"role": "user", "content":
        "Using only the tool results above, produce the final answer object."}],
)
```

Why split it rather than putting `output_config` on the whole loop? Because a schema-constrained response is a
*terminal* answer — you want the model free to call tools during gathering, and constrained only once it is
answering. This two-phase shape also gives you a clean place to enforce grounding checks.

**Known incompatibilities to memorise:**

- `output_config.format` + **citations** → 400.
- `output_config.format` + message **prefilling** → not supported (prefill is removed on current models anyway).
- `strict: true` + **programmatic tool calling** → not compatible; also not compatible with
  `disable_parallel_tool_use` or forced `tool_choice`.
- Structured outputs **do** work with: Batches API, streaming, token counting, and extended thinking.

---

## 4.5 Production considerations

### 4.5.1 Schema versioning

```
schemas/
  invoice/
    v1.json          # deprecated 2026-03-01, still served
    v2.json          # current
    v3-draft.json
  CHANGELOG.md
```

- Emit the schema version **inside** the payload (`"schema_version": "2"`) so a stored record is
  self-describing.
- Keep N-1 supported through a deprecation window.
- Store the raw model output alongside the parsed object for a retention period — when you change the schema,
  that raw text is the only way to re-parse history.

### 4.5.2 Observability

Metrics that actually predict incidents:

| Metric | Alert when | Signals |
|---|---|---|
| Schema-violation rate | > baseline × 2 | Prompt regression, model change, input drift |
| Retry rate / retries per success | rising | Document quality change, schema too strict |
| Truncation rate (`max_tokens`) | > 0.1% | `max_tokens` too low, or outputs growing |
| Refusal rate | any sustained rise | Prompt or content-mix change |
| Null rate **per field** | field-level spike | Upstream format change (this is the early-warning signal) |
| Confidence distribution | mass shifting down | Input distribution shift |
| Human-override rate | rising | The model is wrong in ways validation cannot see |

Per-field null rate is the underrated one: when a vendor changes their invoice template, `po_number` goes 100%
null overnight while every other metric looks normal.

### 4.5.3 Error handling and compatibility

- **Never** silently coerce. `"1,240.50"` → `124050` in a `try/except` hides a systematic extraction bug.
- **Never** return partial data as complete. Use an explicit `partial: true` flag or fail.
- **Do** keep the failed raw output in the dead letter record — it is your debugging evidence.
- **Do** validate on the consumer side too. Producer-side validation can be bypassed by a bad deploy.

---

## Key takeaways

- Three levels: prompted → validated → constrained. Use constrained decoding (`output_config.format` /
  `strict: true`) **and** keep validation.
- `strict: true` lives on the **tool definition**, requires `additionalProperties: false` and `required`.
- `output_format` is deprecated; `output_config.format` is canonical; `messages.parse()` is the recommended
  client path.
- The supported JSON Schema subset excludes **recursion, numeric constraints, string constraints and
  `pattern`** — enforce those in code and state them in property descriptions.
- Check `stop_reason` **before** parsing. Truncation and refusal are not schema errors.
- Validation retry loops must be **bounded**, must feed back the **specific** error, and must **fail loudly**.
- Structured output = the answer. Tool call = a request to act. The forced-fake-tool trick is legacy.

## Things to memorise

- The unsupported JSON Schema keywords.
- `strict: true` position; `additionalProperties: false` requirement.
- Citations + `output_config.format` = 400.
- New schemas cost a one-time compile, cached 24h — do not generate schemas per request.
- Retry ladder: repair → re-ask (higher tier) → human. Cap at ~3 model attempts.

## Common mistakes

- Putting `strict` on `tool_choice`.
- Assuming `minimum`/`maximum`/`pattern` are enforced (they are stripped and checked client-side, or not at all).
- Parsing before checking `stop_reason`.
- Unbounded repair loops.
- Returning a repaired-but-wrong object instead of failing.
- Using a fake forced tool for schema enforcement in new code.
- Generating schemas dynamically per request (kills the 24h schema cache).

---

## Scenario questions

**Q1.** An extraction service uses `output_config.format` with a schema containing
`"total_cents": {"type": "integer", "minimum": 0}`. In production, negative totals appear. The schema is valid
JSON Schema. Explain.

<details><summary>Answer</summary>

`minimum` is **not in the supported subset**. Depending on the SDK, it is either stripped before the request and
validated client-side, or ignored — either way it is *not* enforced by constrained decoding, so the model can
generate a negative integer. If your code validates with the raw schema you would see a validation error; if it
trusts the API guarantee, the negative value flows straight through.

Correct approach: (1) state the constraint in the property **description** so it becomes prompt surface
("Grand total in minor units; never negative — if the document shows a credit, set `is_credit_note: true` and
report the absolute value"); (2) enforce it in a **business-rule validator** in code; (3) if a negative total is
semantically meaningful, model it explicitly rather than forbidding it. General lesson: know which parts of your
schema are guarantees and which are documentation.
</details>

**Q2.** A team defines a tool `emit_classification` with a strict schema and forces
`tool_choice: {"type":"tool","name":"emit_classification"}`. Nothing executes the tool; the handler just reads
the arguments. Is this correct?

<details><summary>Answer</summary>

It *works* but it is the **legacy pattern**. Use `output_config.format`, which expresses exactly this intent —
"the response must have this shape" — without pretending an action is being taken.

Why it matters beyond style:
- Forced `tool_choice` is **incompatible with `strict: true`** in some combinations and with programmatic tool
  calling, so the pattern can block features you later want.
- If you later add real tools, the model now has a phantom action competing for selection.
- The response semantics are wrong: `stop_reason` is `tool_use`, so any generic loop treats a *final answer* as
  a request to act.

Keep the fake-tool pattern only when running against a model or platform where structured outputs are
unavailable.
</details>

**Q3.** A document pipeline retries on validation failure with no cap. One malformed 400-page scan causes a
$4,000 spike overnight. Beyond adding a cap, what else is wrong, and what is the right design?

<details><summary>Answer</summary>

The unbounded loop is the proximate cause; the deeper defects are:

1. **No cost budget per record.** Enforce a per-document token/dollar ceiling; abort when exceeded.
2. **No failure classification.** A 400-page scan is a *capability/size* failure, not a formatting failure —
   repairing the same prompt cannot succeed. Classify the error and pick a strategy: truncation → split;
   refusal → escalate; validation → repair once.
3. **No input pre-checks.** Page count, file size and OCR confidence should gate entry. A 400-page scan should
   have been chunked before the first call.
4. **No dead letter queue.** After N attempts the record should land in DLQ with the raw output, not loop.
5. **No alerting on retry rate.** A retry-rate alert would have paged in minutes, not the next morning.

Right design: pre-validate → chunk by page range → bounded 3-attempt ladder (repair → re-ask at higher tier →
DLQ) → per-record budget → DLQ + alert. Costs become bounded and predictable per document.
</details>

**Q4.** A field `customer_tier` is defined as `{"type": "string"}`. Downstream code switches on
`"free" | "pro" | "enterprise"`. Occasionally the model returns `"Pro"` or `"enterprise plan"`. Two proposals:
(a) lowercase and fuzzy-match downstream, (b) change the schema to an enum. Which, and why?

<details><summary>Answer</summary>

**(b), decisively.** An `enum` is enforced by constrained decoding — the model *cannot* emit `"Pro"`, so the
failure class is eliminated at the source rather than papered over. It also improves accuracy: the enum is
visible to the model and narrows the decision.

(a) is actively harmful: fuzzy matching will eventually map an out-of-vocabulary value onto the wrong tier
silently, converting a loud parse failure into a quiet billing error. It also hides the drift signal — if the
model starts producing `"trial"`, you want to know, not to have it coerced to `"free"`.

Add: an explicit `null` option (or a `"unknown"` member) plus `required`, so "cannot determine" is
representable; and a per-field null-rate metric so a new tier appearing in production is visible.
</details>

**Q5.** A support agent must (1) look up an order, (2) check inventory, (3) return a structured decision object.
Sketch the API shape.

<details><summary>Answer</summary>

Two phases.

**Phase 1 — gathering (tools, no `output_config`).** Declare `get_order` and `check_inventory` with strict
schemas and enums. Loop on `stop_reason == "tool_use"`, executing tools and returning all `tool_result` blocks
in one user message, failures included with `is_error: true`. Handle `max_tokens` and `pause_turn`. Bound the
loop with a max-iteration count.

**Phase 2 — answering (structured output, no tools).** One final call carrying the accumulated history plus
"Using only the tool results above, produce the decision object", with
`output_config={"format": {...DecisionSchema...}}`.

Why split: a schema-constrained response is terminal, so constraining phase 1 would prevent tool use; and the
split gives a natural place to (a) enforce grounding — reject a decision whose `order_id` never appeared in a
tool result — and (b) drop to a cheaper model for the formatting step. Include `evidence[]` referencing which
tool result supports each conclusion, plus `confidence`, and route low confidence to a human.
</details>

**Q6.** After a model upgrade, schema-violation rate stays at 0% but human-override rate doubles. What
happened, and what does it teach you about structured outputs?

<details><summary>Answer</summary>

Constrained decoding guarantees **shape, not truth**. The new model is producing perfectly valid objects with
worse content — different judgement boundaries, different extraction choices. Schema validation cannot detect
this, which is exactly why it is a poor proxy for quality.

What to do:
1. Treat the human-override rate as the real quality signal and alert on it.
2. Diff old vs new model outputs on a **golden set** with semantic assertions (field-level accuracy, F1 per
   field), not shape assertions — this is what the model-change eval gate exists for (§11.7, §18.3).
3. Investigate whether the prompt is over-prescriptive for the new model (a common migration issue) and re-tune
   `effort`.
4. Roll back by config while you fix it.

The lesson: **structured outputs eliminate a failure class; they do not measure quality.** Every structured
pipeline still needs semantic evaluation.
</details>
