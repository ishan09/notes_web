# Python for AI, ML & Agentic Systems

> **Learning Philosophy**: This curriculum applies proven learning science principles (active recall, spaced repetition, hands-on practice) to teach Python specifically for AI/ML and building agentic systems.

## Overview

This is a structured Python learning path designed for experienced software engineers who are new to Python but want to quickly become proficient in building AI/ML applications and intelligent agents.

### Who This Is For

- Experienced software engineers (like yourself!) new to Python
- Goal: Build AI/ML applications and agentic systems
- Learning style: Practical, concept-driven (minimal theory, maximum code)
- Preference: Clean examples, hands-on exercises, real-world context

### What Makes This Different

Unlike traditional Python tutorials, this curriculum:

- ✅ **AI/ML Focused**: Every concept ties to AI, ML, or agent development
- ✅ **Active Learning**: Questions, exercises, and immediate practice built-in
- ✅ **Beginner-to-Expert Path**: Start from basics, progress to 12-year expert level
- ✅ **Minimal Theory**: Just enough to be productive, not academic
- ✅ **Expert Deep Dives**: Advanced questions for mastery (see [EXPERT_LEVEL_QUESTIONS.md](./EXPERT_LEVEL_QUESTIONS.md))

---

## Learning Path

### Phase 0: Setup & Environment (Start Here!)

**Goal**: Get Python installed and understand project management basics

**Topics**:

- [Installation & Setup](./00-setup/01-installation-setup.md) - Get Python running
- [Virtual Environments](./00-setup/02-virtual-environments.md) - Isolate projects
- [Package Management (pip & Poetry)](./00-setup/03-pip-poetry.md) - Install libraries

**Time**: ~1-2 hours | **Prerequisites**: None

---

### Phase 1: Python Fundamentals

**Goal**: Master core Python syntax and data structures

**Topics**:

1. [Syntax Basics](./01-fundamentals/01-syntax-basics.md) - Indentation, variables, comments
2. [Data Types](./01-fundamentals/02-data-types.md) - Lists, dicts, sets, tuples
3. [Control Flow](./01-fundamentals/03-control-flow.md) - if/else, loops, comprehensions
4. [Functions](./01-fundamentals/04-functions.md) - Parameters, *args, **kwargs, scope
5. [Modules](./01-fundamentals/05-modules.md) - Imports, packages, organizing code

**Time**: ~4-6 hours | **Prerequisites**: Phase 0 completed

**Confirm before moving on**: Can you write functions, use data structures, and understand imports?

---

### Phase 2: Intermediate Python

**Goal**: Object-oriented programming, error handling, and efficient data processing

**Topics**:

1. [OOP Basics](./02-intermediate/01-oop-basics.md) - Classes, inheritance, polymorphism
2. [Dataclasses](./02-intermediate/02-dataclasses.md) - Modern data structures
3. [Iterators & Generators](./02-intermediate/03-iterators-generators.md) - Memory-efficient iteration
4. [Error Handling](./02-intermediate/04-error-handling.md) - try/except, custom exceptions
5. [File I/O & Serialization](./02-intermediate/05-file-io.md) - JSON, CSV, pickle, pathlib

**Time**: ~6-8 hours | **Prerequisites**: Phase 1 completed

**Confirm before moving on**: Can you create classes, handle errors, and work with files?

---

### Phase 3: Advanced Python

**Goal**: Type hints, async programming, decorators, and context managers

**Topics**:

1. [Type Hints & Static Typing](./03-advanced/01-type-hints.md) - Annotations, mypy, type checking
2. [Async Programming](./03-advanced/02-async-programming.md) - asyncio, event loops, concurrent tasks
3. [Context Managers](./03-advanced/03-context-managers.md) - with statements, resource management
4. [Decorators](./03-advanced/04-decorators.md) - Function wrappers, metaprogramming basics

**Time**: ~6-8 hours | **Prerequisites**: Phase 2 completed

**Confirm before moving on**: Can you write async code, use decorators, and add type hints?

---

### Phase 4: Testing & Code Quality

**Goal**: Write testable, maintainable code with proper structure

**Topics**:

1. [Testing with pytest](./04-testing-quality/01-pytest.md) - Unit tests, fixtures, assertions
2. [Mocking & Test Doubles](./04-testing-quality/02-mocking.md) - Mock external dependencies
3. [Project Structure](./04-testing-quality/03-project-structure.md) - Organize Python projects

**Time**: ~4-5 hours | **Prerequisites**: Phase 3 completed

**Confirm before moving on**: Can you write tests, mock dependencies, and structure projects?

---

### Phase 5: Data Science Foundations

**Goal**: Master NumPy and Pandas for data manipulation

**Topics**:

1. [NumPy Fundamentals](./05-data-science/01-numpy-basics.md) - Arrays, vectorization, broadcasting
2. [Pandas Fundamentals](./05-data-science/02-pandas-fundamentals.md) - DataFrames, data wrangling
3. [Data Visualization](./05-data-science/03-visualization.md) - matplotlib, seaborn basics

**Time**: ~6-8 hours | **Prerequisites**: Phase 1 completed (can skip Phases 2-4 if eager for ML)

**Confirm before moving on**: Can you manipulate data with pandas and numpy?

---

### Phase 6: Machine Learning Basics

**Goal**: Understand ML fundamentals with scikit-learn

**Topics**:

1. [Scikit-Learn Introduction](./06-ml-basics/01-scikit-learn-intro.md) - ML workflow, APIs
2. [Model Training & Evaluation](./06-ml-basics/02-model-training.md) - Train/test split, metrics

**Time**: ~4-6 hours | **Prerequisites**: Phase 5 completed

**Confirm before moving on**: Can you train and evaluate ML models?

---

### Phase 7: AI & Agentic Systems

**Goal**: Build AI agents and integrate LLMs

**Topics**:

1. [OpenAI SDK & LLM Integration](./07-ai-agents/01-openai-sdk.md) - API calls, streaming, errors
2. [LangChain Patterns](./07-ai-agents/02-langchain-patterns.md) - Chains, prompts, memory
3. [Agent Design Principles](./07-ai-agents/03-agent-design.md) - ReAct, planning, orchestration
4. [Tools, Memory & Orchestration](./07-ai-agents/04-tools-memory-orchestration.md) - Advanced patterns

**Time**: ~8-10 hours | **Prerequisites**: Phases 1-4 completed (Phase 5-6 recommended)

**Confirm before moving on**: Can you build agents that use tools and call LLMs?

---

### Phase 8: FastAPI — Production APIs

**Goal**: Build, test, and deploy production-grade REST APIs with FastAPI

> **Why FastAPI?**: FastAPI is the standard Python framework for serving ML models, building microservices, and exposing agentic backends. It sits at the intersection of everything covered in Phases 1–7 — type hints, async programming, Pydantic, decorators, testing, and more.

**Topics**:

1. [FastAPI Introduction](./08-fastapi/01-fastapi-intro.md) - Installation, first app, vs Flask/Django
2. [Routing & Path Operations](./08-fastapi/02-routing-path-operations.md) - HTTP methods, params, status codes
3. [Pydantic Models](./08-fastapi/03-pydantic-models.md) - Request/response validation, Field constraints
4. [Dependency Injection](./08-fastapi/04-dependency-injection.md) - `Depends()`, auth, DB sessions, testing
5. [Async & Background Tasks](./08-fastapi/05-async-background-tasks.md) - Async routes, streaming, lifespan events
6. [Authentication & Security](./08-fastapi/06-authentication-security.md) - JWT, OAuth2, CORS, middleware
7. [Database Integration](./08-fastapi/07-database-integration.md) - SQLAlchemy async, SQLModel, CRUD
8. [Testing FastAPI](./08-fastapi/08-testing-fastapi.md) - TestClient, dependency overrides, fixtures
9. [Deployment & Production](./08-fastapi/09-deployment-production.md) - Docker, Gunicorn, health checks

**Time**: ~10-15 hours | **Prerequisites**: Phases 1-4 completed; Phase 3 (type hints + async) is essential

**Confirm before moving on**: Can you build, test, and Dockerize a FastAPI service with auth and a database?

**FastAPI connects directly to existing notes**:
- [Type Hints](./03-advanced/01-type-hints.md) → parameter types drive routing, validation, and docs
- [Async Programming](./03-advanced/02-async-programming.md) → `async def` routes and event loop
- [Dataclasses](./02-intermediate/02-dataclasses.md) → Pydantic `BaseModel` extends the same concept
- [Decorators](./03-advanced/04-decorators.md) → `@app.get("/path")` is a route-registration decorator
- [Error Handling](./02-intermediate/04-error-handling.md) → `HTTPException`, custom exception handlers
- [pytest](./04-testing-quality/01-pytest.md) → `TestClient` + fixtures + `dependency_overrides`

---

## Expert-Level Mastery

### Deep Dive Questions

After completing each topic, challenge yourself with expert-level questions:

**[→ View All Expert Questions](./EXPERT_LEVEL_QUESTIONS.md)**

10 thematic categories covering:

- Memory Management & Performance
- Type System & Metaprogramming
- Async Programming & Concurrency
- Decorators & Functional Programming
- Testing & Debugging
- Packaging & Project Structure
- Data Science Libraries
- LLM Integration & Agent Patterns
- Security & Best Practices
- Performance Optimization

Each category includes:

- **Core Python Internals**: Deep technical understanding
- **AI/ML Context**: Application to ML systems
- **Production Scenarios**: Real-world debugging

---

## Learning Tips

### How to Use This Curriculum

1. **Start Sequential**: Follow Phase 0 → Phase 7 in order
2. **Confirm Understanding**: Answer self-check questions before moving on
3. **Do Exercises**: Complete all 3 difficulty levels (Understand → Apply → Create)
4. **Try Everything**: Type out code examples, don't just read
5. **Ask for Confirmation**: Let me know when you're ready for the next topic

### Time to Completion

- **Fast Track** (basics only): ~20-25 hours (Phases 0-4)
- **AI/ML Ready**: ~40-50 hours (Phases 0-7)
- **Full Stack ML API**: ~55-65 hours (Phases 0-8, including FastAPI)
- **Expert Mastery**: +20-30 hours (Deep Dive Questions)

### Each Topic Includes

1. ✅ **Simple Explanation** - Plain language, no jargon first
2. ✅ **Why for AI/ML** - Context and motivation
3. ✅ **Clean Code Examples** - Minimal, working code
4. ✅ **Try It Prompts** - Immediate practice
5. ✅ **5 Self-Check Questions** - Validate understanding
6. ✅ **3-Level Exercises** - Progressive difficulty
7. ✅ **Common Mistakes** - Learn from others' errors
8. ✅ **How This Connects** - Link concepts together
9. ✅ **Deep Dive Questions** - Expert-level exploration
10. ✅ **Summary** - Quick recap

---

## Project Ideas (Coming Soon)

Apply your Python skills by building:

- **Text Classifier**: Sentiment analysis with scikit-learn
- **Data Pipeline**: ETL with pandas and generators
- **Simple Agent**: Q&A bot with OpenAI SDK
- **Multi-Agent System**: Collaborative agents with memory
- **ML Inference API**: FastAPI service serving a PyTorch model with auth, DB logging, and Docker — see [Phase 8](./08-fastapi/)

---

## Quick Reference

### Essential Python Commands

```bash
# Virtual Environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Package Management
pip install package_name
pip install -r requirements.txt
pip freeze > requirements.txt

# Running Python
python script.py
python -m module_name
python -i script.py  # Interactive mode after running
```

### Common Imports for AI/ML

```python
# Data Science
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Machine Learning
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# AI/LLMs
import openai
from langchain import LLMChain
import asyncio
```

---

## Related Content

This Python curriculum is part of a larger learning roadmap:

- **[Java Learning Path](../01-java/)** - Core Java, Spring ecosystem
- **[Architecture](../03-architecture/)** - Microservices, system design
- **[Main README](../README.md)** - Complete learning roadmap

---

## Philosophy Alignment

This curriculum uses the same proven learning mechanics as the Java project:

- ✅ Active recall questions
- ✅ Spaced repetition (review prompts)
- ✅ Progressive difficulty exercises
- ✅ Real-world context first
- ✅ Common mistakes highlighted
- ✅ Simple explanations (Feynman technique)

But adapted for Python with:

- 🔄 AI/ML focus (not enterprise Java)
- 🔄 Faster to code (less theory)
- 🔄 Self-paced (no timeline)
- 🔄 Beginner-friendly start
- 🔄 Expert questions for mastery

---

## Getting Started

Ready to begin? Start here:

**→ [Phase 0: Installation & Setup](./00-setup/01-installation-setup.md)**

After setup, I'll teach you Python one topic at a time, with confirmation before moving forward.

---

## Feedback & Questions

As we go through the material:

- Ask questions anytime
- Request more examples if concepts aren't clear
- Let me know if pace is too fast/slow
- Signal when you're ready for the next topic

Let's build your Python skills for AI/ML! 🚀
