# Navigation TODO - Remaining Files

This file contains a list of all files that still need Style B navigation sections added. Use the template below for each file.

---

## ✅ Completed Modules (16 files)

### Spring Core (5 files) - DONE ✓
- [x] 01-ioc-and-di.md
- [x] 02-bean-lifecycle-scopes.md
- [x] 03-configuration.md
- [x] 04-aop.md
- [x] 05-best-practices.md

### Spring Boot (6 files) - DONE ✓
- [x] 01-auto-configuration.md
- [x] 02-starters.md
- [x] 03-rest-api.md
- [x] 04-actuator-monitoring.md
- [x] 05-best-practices.md
- [x] 06-troubleshooting-qa.md

### Spring Security (5 files) - DONE ✓
- [x] 01-authentication.md
- [x] 02-authorization.md
- [x] 03-jwt.md
- [x] 04-oauth2.md
- [x] 05-best-practices.md

---

## 📝 Pending Modules (39+ files)

### 1. Microservices (9 files) - HIGH PRIORITY

**Location:** `/03-architecture/microservices/`

- [ ] 01-overview.md
- [ ] 02-discovery-and-gateway.md
- [ ] 03-resilience.md
- [ ] 04-communication.md
- [ ] 05-distributed-transactions.md
- [ ] 06-advanced-data-patterns.md
- [ ] 07-migration-and-database.md
- [ ] 08-observability-and-ops.md
- [ ] 09-testing-and-security.md

**Navigation Hints for Microservices:**
- Prerequisites: Spring Boot, REST APIs, basic architecture understanding
- Common next topics: Other microservices patterns, Spring Cloud, Kubernetes
- Related: System design, cloud-native patterns, observability

---

### 2. Maven/Build Tools (5 files) - MEDIUM PRIORITY

**Location:** `/06-leadership/build-tools/`

- [ ] 01-maven-core.md
- [ ] 02-maven-dependencies.md
- [ ] 03-maven-plugins-profiles.md
- [ ] 04-maven-multi-module.md
- [ ] 05-gradle-basics.md

**Navigation Hints for Build Tools:**
- Prerequisites: Basic Java project structure
- Next topics: Progress through Maven concepts sequentially
- Related: Spring Boot starters, dependency management, DevOps

---

### 3. JVM Internals (4 files) - MEDIUM PRIORITY

**Location:** `/01-core-java/jvm-internals/`

- [ ] 01-memory-model.md
- [ ] 02-garbage-collection.md
- [ ] 03-jvm-architecture.md
- [ ] 04-performance-tuning.md

**Navigation Hints for JVM:**
- Prerequisites: Core Java, OOP fundamentals
- Next topics: Progress sequentially (memory → GC → architecture → tuning)
- Related: Concurrency, performance optimization, troubleshooting

---

### 4. OOP Fundamentals (5 files) - MEDIUM PRIORITY

**Location:** `/01-core-java/oop/`

- [ ] OOP_Interview_Questions.md
- [ ] OOP_Interview_Questions_Part2.md
- [ ] OOP_Class_Object_Fundamentals.md
- [ ] OOP_Advanced_Concepts.md
- [ ] OOP_SOLID_Principles.md

**Navigation Hints for OOP:**
- Prerequisites: None (foundational)
- Next topics: Design patterns, Java features, Spring (which relies on OOP)
- Related: SOLID principles, clean code, design patterns

---

### 5. DSA Patterns (16 files) - LOWER PRIORITY

**Location:** `/07-dsa/`

- [ ] 01-sliding-window.md
- [ ] 02-two-pointers.md
- [ ] 03-fast-slow-pointers.md
- [ ] 04-merge-intervals.md
- [ ] 05-cyclic-sort.md
- [ ] 06-linkedlist-reversal.md
- [ ] 07-tree-bfs.md
- [ ] 08-tree-dfs.md
- [ ] 09-two-heaps.md
- [ ] 10-subsets.md
- [ ] 11-modified-binary-search.md
- [ ] 12-bitwise-xor.md
- [ ] 13-top-k-elements.md
- [ ] 14-k-way-merge.md
- [ ] 15-knapsack-dp.md
- [ ] 16-topological-sort.md

**Navigation Hints for DSA:**
- Prerequisites: Basic Java, data structures knowledge
- Next topics: Other patterns in sequence (they build on each other minimally)
- Related: Interview prep, algorithm complexity, problem-solving patterns
- **Note:** These are less interconnected than other modules, so navigation can be simpler

---

## 📋 Navigation Template (Style B)

Add this section at the **END** of each file, replacing any existing "How This Connects", "Next", or similar sections:

```markdown
---

## Navigation

**Prerequisites:**
- [Topic Name](./relative/path.md) - Brief description of why it's a prerequisite
- [Another Topic](./path.md) - Another prerequisite explanation

**Next Topics:**
- [Logical Next Step](./next-file.md) - What this leads to in learning path
- [Alternative Path](./alternative.md) - Another logical progression

**Related:**
- [Related Topic 1](./related.md) - How this relates
- [Related Topic 2](./path.md) - Cross-cutting concept
- [Related Topic 3](./path.md) - Advanced/specialized topic

**Interview Focus:** *(Optional - use for technical topics)*
- Key interview point 1
- Key interview point 2
- Key interview point 3
- When to use X vs Y
- Common pitfalls and how to avoid them

**Module Index:** [Module Guide](./README.md) | **Main Index:** [Learning Roadmap](../../../README.md)
```

---

## 🎯 Guidelines for Adding Navigation

### Prerequisites
- List 2-4 topics that should be understood BEFORE this topic
- Include both technical prerequisites and conceptual ones
- Use relative paths to link to actual files

### Next Topics
- List 1-3 logical next steps in the learning journey
- Can be sequential (next in series) or conceptual (builds on this)
- Think: "After mastering this, what should I learn?"

### Related
- List 2-4 topics that complement or extend this topic
- Cross-module connections are valuable
- Advanced topics that build on this concept

### Interview Focus (Optional)
- Add for technical implementation files
- Skip for purely conceptual or overview files
- List 3-7 key points interviewers commonly ask about
- Include comparison questions ("X vs Y")
- Common mistakes and pitfalls

### Module Index
- Always link to the module's README.md
- Always link back to main README.md
- Use correct relative paths (count the ../ levels)

---

## 🔧 How to Update Files

### Step 1: Read the file
```bash
# Check the end of the file to see existing structure
tail -30 /path/to/file.md
```

### Step 2: Identify what to replace
Look for sections like:
- "How This Connects"
- "Next Steps"
- "Further Reading"
- "Next:"
- Any existing navigation

### Step 3: Edit the file
Use the Edit tool to replace old navigation with the new Style B template.

### Step 4: Customize the content
- Fill in appropriate prerequisites based on file content
- Choose logical next topics
- Add relevant related topics
- Include interview focus if applicable
- Fix relative path depths (../ for each level up)

---

## 📊 Priority Order for Implementation

1. **HIGHEST PRIORITY:** Microservices (9 files)
   - Most frequently accessed for interview prep
   - Builds on Spring Boot/Security knowledge
   - Complex interconnections benefit most from navigation

2. **HIGH PRIORITY:** Maven/Build Tools (5 files)
   - Referenced from many Spring examples
   - Important for practical development

3. **MEDIUM PRIORITY:** JVM Internals (4 files)
   - Foundational knowledge
   - Referenced in performance discussions

4. **MEDIUM PRIORITY:** OOP Fundamentals (5 files)
   - Entry point for beginners
   - Referenced throughout Spring modules

5. **LOWER PRIORITY:** DSA Patterns (16 files)
   - Less interconnected with other modules
   - Standalone learning paths
   - Can use simpler navigation

---

## ✅ Completion Checklist

After adding navigation to each module:

- [ ] All files in module have navigation sections
- [ ] Links are tested and working
- [ ] Prerequisites make logical sense
- [ ] Next topics create clear learning paths
- [ ] Related topics add value
- [ ] Relative paths are correct (../../ levels)
- [ ] Module README is linked
- [ ] Main README is linked

---

## 📝 Notes

- **Java 8-21 Features:** Needs consolidation before adding navigation (see separate TODO)
- **Empty Modules:** Skip until content is added:
  - Spring Data
  - System Design
  - Cloud & DevOps
  - Database Design
  - Messaging Systems
  - API Design
  - Application Security
  - Code Quality
  - Testing Strategies
  - Team Management
  - Technical Leadership

---

**Last Updated:** 2026-01-07
**Status:** 16/55 files completed (29%)
