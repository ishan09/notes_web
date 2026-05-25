# Context Management & Reliability (Domain 5 — 15%)

> **Before you start**: Do you know what happens when a conversation exceeds Claude's context window? And more importantly, do you know how to prevent it from being a problem?

---

## The Context Window Constraint

Claude's context window is finite. Everything that matters must fit: system prompt + conversation history + tool results + the current request + the response to generate.

**Current Claude limits** (approximate):
- claude-opus-4-6: 200,000 tokens (~150,000 words)
- This sounds large — but long agentic sessions, RAG documents, and tool outputs fill it fast

**When context is exceeded**: Claude either errors out, or (worse) silently loses earlier context — leading to forgotten instructions, repeated work, or contradictory responses.

---

## Context Bloat Prevention

### The Four Sources of Context Bloat

1. **Conversation history accumulation** — every turn adds tokens
2. **Verbose tool responses** — tools returning full objects when summaries suffice
3. **Redundant system prompt content** — repeating things Claude already knows
4. **Inefficient document inclusion** — pasting full documents when chunks suffice

### Strategy 1: Conversation Compression

```python
def manage_context(messages, system_prompt, max_tokens=150000):
    current_tokens = count_tokens(system_prompt) + count_tokens(messages)

    if current_tokens > max_tokens * 0.8:  # 80% threshold triggers compression
        # Keep first message (task) + last 5 messages (recent context)
        important = messages[:1] + messages[-5:]

        # Summarize the middle
        middle = messages[1:-5]
        summary = claude.create(f"Summarize these conversation turns in 200 words: {middle}")

        messages = [
            messages[0],
            {"role": "assistant", "content": f"[Summary of previous work]: {summary}"},
            *messages[-5:]
        ]

    return messages
```

### Strategy 2: Trim Tool Responses

❌ Tool returns everything:
```json
{"customer": {"id": "CUST-1234", "name": "Alice", "email": "alice@co.com",
  "address": {...}, "preferences": {...}, "full_order_history": [500 items], ...}}
```

✅ Tool returns what's needed:
```json
{"id": "CUST-1234", "name": "Alice", "email": "alice@co.com", "plan": "enterprise",
  "recent_orders": [3 items], "open_issues": 1}
```

**Rule**: Tool responses should be the minimum information needed for the next decision, not the full record.

### Strategy 3: Preserve Critical Information Explicitly

When conversations will be long, repeat critical constraints periodically:

```python
# In agent loop — remind Claude of key constraints every 10 iterations
if iteration % 10 == 0:
    messages.append({
        "role": "user",
        "content": "Reminder: You are working on task X. Current goal: Y. Constraints: Z."
    })
```

---

## Prompt Caching

**Prompt caching** stores portions of the prompt at Anthropic's infrastructure, avoiding reprocessing the same tokens on every call.

### What to cache:
- Large, stable system prompts (company policies, codebases)
- Long reference documents that don't change per request
- Few-shot examples that are reused across many calls

### What NOT to cache:
- Dynamic user-specific content
- Per-request context that changes every time

### Implementation:
```python
response = claude.messages.create(
    model="claude-opus-4-6",
    system=[
        {
            "type": "text",
            "text": large_stable_document,  # 50,000 tokens of reference docs
            "cache_control": {"type": "ephemeral"}  # Cache this block
        },
        {
            "type": "text",
            "text": f"Now answer: {user_question}"  # Dynamic — not cached
        }
    ]
)
```

**Cost savings**: Cached tokens cost ~10% of regular input token price.
**Cache duration**: Ephemeral cache lasts ~5 minutes of inactivity.

---

## RAG Architecture for Knowledge-Heavy Apps

### What is RAG?

**Retrieval Augmented Generation** — instead of including an entire knowledge base in the context, retrieve only the relevant pieces for each query.

```
User Query
    ↓
[Embed query] → Query vector
    ↓
[Search vector DB] → Top K relevant chunks
    ↓
[Inject chunks into context] → Claude generates answer grounded in retrieved docs
```

### When to use RAG:
- Knowledge base > 10,000 words (won't fit in context)
- Knowledge updates frequently (don't want to retrain)
- Need citations/traceability
- Compliance requires knowing which documents were used

### When NOT to use RAG:
- Knowledge base is small and stable (just include it)
- Query doesn't require factual lookup (creative tasks, code generation)
- Latency is critical (retrieval adds 100-500ms)
- When accuracy of retrieval itself is uncertain (garbage in, garbage out)

### RAG Architecture Diagram:
```
[Documents]
     ↓
[Chunker] → chunks
     ↓
[Embedder] → vectors
     ↓
[Vector DB] (Pinecone, Weaviate, pgvector)
     
User Query → [Embedder] → query vector → [Search] → Top K chunks
                                                           ↓
                                                    [Inject into prompt]
                                                           ↓
                                                    Claude → Answer
```

---

## Retrieval Quality

The quality of RAG answers depends entirely on retrieval quality. Claude can't answer well with wrong documents.

### Chunking strategies:
| Strategy | Size | Best for |
|---|---|---|
| Fixed size | 512 tokens | Uniform docs |
| Sentence | Varies | Prose documents |
| Paragraph | Varies | Documents with clear structure |
| Semantic | Varies | Maximum relevance |

**Key principle**: Chunks should be self-contained — a chunk that requires context from the previous chunk is a bad chunk.

### Hybrid search (BM25 + semantic):
```python
# Semantic search alone misses exact matches
# BM25 alone misses semantic similarity
# Hybrid captures both

def hybrid_search(query, k=5):
    semantic_results = vector_db.search(embed(query), k=k*2)
    keyword_results = bm25_index.search(query, k=k*2)

    # Reciprocal Rank Fusion to merge
    combined = reciprocal_rank_fusion(semantic_results, keyword_results)
    return combined[:k]
```

**When to use hybrid**: Always. Pure semantic misses exact product names, codes, IDs. Pure BM25 misses paraphrase queries.

### Contextual embeddings:
Instead of embedding raw chunks, prepend document context:
```python
chunk_text = f"""
Document: {document.title}
Section: {chunk.section}
Content: {chunk.text}
"""
# Embed this enriched chunk (49% improvement in retrieval accuracy)
```

---

## Error Handling & Graceful Degradation

### Retry with exponential backoff:
```python
import time

def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # 1s, 2s, 4s
            time.sleep(wait_time)
        except APIError as e:
            if e.status_code >= 500:  # Retryable
                time.sleep(2 ** attempt)
            else:  # Not retryable (400s)
                raise
```

### Graceful degradation pattern:
```python
def get_answer(query):
    try:
        # Primary: full RAG with context
        docs = retrieve_documents(query)
        return claude.answer_with_docs(query, docs)
    except RetrievalError:
        # Fallback 1: answer without retrieval (may hallucinate)
        return claude.answer(query + " (Note: reference docs unavailable)")
    except APIError:
        # Fallback 2: cached response for common queries
        if query in response_cache:
            return response_cache[query] + " (cached response)"
        raise  # Can't degrade further
```

---

## Escalation Patterns

**When should a system stop and involve a human?**

Define escalation conditions explicitly:
```python
def needs_escalation(response, context):
    return any([
        context.iteration_count >= MAX_ITERATIONS,
        response.confidence < CONFIDENCE_THRESHOLD,
        context.failed_tool_calls >= MAX_TOOL_FAILURES,
        is_sensitive_action(response.next_action),
        context.context_usage > 0.9,  # Context nearly full
    ])

def escalate(context, reason):
    return {
        "escalated": True,
        "reason": reason,
        "work_completed": context.completed_steps,
        "last_state": context.current_state,
        "resume_instructions": context.resumption_point,
        "recommended_next_step": context.last_plan_step
    }
```

**Key**: Never just say "I failed." Return everything the human needs to resume.

---

## 🧠 Decision Framework

### Context strategy selection:

| Situation | Strategy |
|---|---|
| Knowledge base < 10K tokens, stable | Include directly in context |
| Knowledge base > 10K tokens | RAG |
| Knowledge updates frequently | RAG |
| Very long agent sessions | Conversation compression |
| Repeated large system prompts | Prompt caching |
| Latency critical | Avoid RAG (or pre-warm cache) |
| Compliance / citation required | RAG with source tracking |

### RAG vs No RAG decision:

| Factor | Use RAG | Don't Use RAG |
|---|---|---|
| Knowledge base size | Large (>10K tokens) | Small (fits in context) |
| Knowledge update frequency | Frequent | Rare/never |
| Latency tolerance | High | Low |
| Factual grounding needed | Yes | No (creative tasks) |
| Citation required | Yes | No |

### Caching vs Retrieval:

| Factor | Caching | RAG Retrieval |
|---|---|---|
| Content changes | Rare | Frequent |
| Content size | Large, stable | Dynamic |
| Latency | Lower | Higher (retrieval step) |
| Cost | Lower on cache hit | Higher (embedding + search) |

---

## 🔍 Failure Modes & Debugging

| Failure | Root Cause | Fix |
|---|---|---|
| Context truncation | History grew too long | Add compression at 80% threshold |
| Claude forgets instructions | Old context displaced | Periodically re-inject key constraints |
| RAG returns wrong docs | Poor chunking or embedding | Improve chunking; use hybrid search |
| RAG hallucination | Retrieved docs don't cover query | Add "only use provided documents" + cite source |
| Cache miss on every call | Dynamic content cached | Move dynamic content outside cache block |
| Retry storm | All retries fire simultaneously | Add jitter to backoff: `wait + random(0, 1)` |
| Tool responses fill context | Tools return full objects | Trim tool responses to needed fields only |
| Escalation rate too high | Thresholds too sensitive | Tune thresholds; expand agent capabilities |

---

## ⚖️ Trade-offs

| Choice | Latency | Cost | Accuracy | Complexity |
|---|---|---|---|---|
| Include docs directly | Low | Higher (tokens) | Highest | Low |
| RAG | Medium (retrieval) | Lower | Good (depends on retrieval) | High |
| Prompt caching | Low | Much lower | Same | Medium |
| Conversation compression | Low | Lower | Slightly lower (info loss) | Medium |
| Hybrid search | Higher | Higher | Best retrieval | High |
| Semantic-only search | Medium | Medium | Good | Medium |

---

## 📊 Evaluation & Metrics

| Metric | What it tells you | Target |
|---|---|---|
| Context utilization % | Are you staying well below the limit? | <80% |
| RAG retrieval precision | Are retrieved docs relevant? | >85% |
| RAG answer faithfulness | Is answer grounded in retrieved docs? | >90% |
| Cache hit rate | How often is caching saving cost? | >60% for stable systems |
| Escalation rate | How often does context fill force escalation? | <5% |
| Retry success rate | Do retries actually work? | >70% |

---

## 🔗 Cross-domain Connections

- **→ Agentic Architecture**: Long agent sessions are the primary source of context bloat
- **→ Prompt Engineering**: Token-efficient prompts directly reduce context pressure; caching is a prompt technique
- **→ Tool Design**: Tool response verbosity is a major context consumer — design tools to return minimal data
- **→ Claude Code**: Long Claude Code sessions on large codebases hit context limits — use worktrees + focused prompts

---

## Quick Check

1. At what context utilization % should you start compression? (80%)
2. When should you NOT use RAG? (Small/stable knowledge base, latency-critical, creative tasks)
3. What does hybrid search combine? (Semantic embedding search + BM25 keyword search)
4. What's the cost of cached tokens vs regular? (~10% of regular price)
5. What must an escalation response always include? (Work completed, last state, resumption instructions)

---

## Interview / Exam Questions

**Q: A RAG system returns factually wrong answers 20% of the time. What's the most likely cause and fix?**
A: Poor retrieval quality — wrong chunks are being retrieved. Fix: implement hybrid search (BM25 + semantic), improve chunking strategy, add contextual embeddings (prepend document title/section to chunks). Secondarily, add "only answer from the provided documents" instruction and require citations.

**Q: A long-running customer support agent session is losing the customer's initial complaint after 30 turns. What's happening and how do you fix it?**
A: Context truncation — conversation history has grown so large that early messages are being cut. Fix: implement conversation compression at 80% context threshold. Preserve the first message (original complaint), summarize middle turns, keep last 5 turns.

**Q: Your RAG system costs too much. What are the first two optimizations to try?**
A: 1) Implement prompt caching for the stable system prompt and any fixed reference documents. 2) Switch to Message Batches API for non-real-time queries (50% cost reduction). Then evaluate if retrieval depth (top K) can be reduced without hurting accuracy.

**Q: How do you ensure a Claude agent doesn't retry a failed API call indefinitely?**
A: Set a max_retries limit (typically 3), use exponential backoff with jitter between retries, distinguish retryable errors (5xx, rate limits) from non-retryable ones (4xx validation), and surface structured error information after max retries so the orchestrator or human can decide next steps.

---

## ⚡ Cheat Sheet

```
CONTEXT MANAGEMENT:
  - Compress at 80% of limit
  - Keep: first message + last 5 turns + summary
  - Cache: stable system prompts (saves ~90% on cached tokens)
  - Trim tool responses to minimum needed

RAG DECISION:
  Use when: large/dynamic knowledge, citations needed
  Skip when: small/stable knowledge, latency critical, creative tasks

HYBRID SEARCH = Semantic (embedding) + BM25 (keyword)
  Always better than either alone

CONTEXTUAL EMBEDDING:
  Prepend "Document: X, Section: Y" to each chunk
  49% improvement in retrieval accuracy

RETRY PATTERN:
  Max 3 retries, exponential backoff (1s, 2s, 4s), add jitter
  Distinguish retryable (5xx) vs non-retryable (4xx)

ESCALATION RESPONSE must include:
  - Work completed so far
  - Current state
  - Resumption instructions
  - Recommended next step

KEY METRICS:
  - Context utilization < 80%
  - RAG precision > 85%
  - Cache hit rate > 60%
  - Escalation rate < 5%
```

---

## Related Topics
- **Previous**: `04-tool-design-and-mcp.md`
- **Next**: `06-practice-scenarios.md`
- **Related**: `01-agentic-architecture.md` (escalation patterns), `03-prompt-engineering.md` (caching, token efficiency)
- **Decision guide**: `07-decision-frameworks.md`
