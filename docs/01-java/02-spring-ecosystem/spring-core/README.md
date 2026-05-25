# Spring Core - Complete Guide

> **Before you start**: Do you understand what dependency injection means conceptually? Think: What if a class receives its dependencies instead of creating them?

## Module Overview

Spring Core is the foundation of the entire Spring ecosystem. Master these concepts and everything else (Spring Boot, Spring Security, Spring Data) becomes much easier.

**What you'll build**: By the end of this module, you'll have refactored your InvoiceManager console app to use Spring's IoC container with proper dependency injection.

---

## Learning Path

### 📚 Study in This Order

**Week 2, Day 1: Foundation**
0. [**What is a Spring Bean?**](./00-what-is-a-bean.md) ⭐ START HERE FIRST
   - Understanding what a bean really is
   - From regular Java objects to Spring beans
   - Why Spring manages objects for you
   - **Critical foundation**: Read this before anything else!

**Week 2, Day 1-2: Fundamentals**
1. [**IoC and Dependency Injection**](./01-ioc-and-di.md)
   - What is Inversion of Control?
   - Three types of Dependency Injection
   - Why DI matters for testing and maintenance
   - **InvoiceManager**: Refactor services to use DI

**Week 2, Day 2-3: Bean Management**
2. [**Bean Lifecycle and Scopes**](./02-bean-lifecycle-scopes.md)
   - Bean creation and destruction
   - Singleton vs Prototype vs Request/Session
   - Initialization and destruction callbacks
   - **InvoiceManager**: Add lifecycle management, use appropriate scopes

**Week 2, Day 3-4: Configuration**
3. [**Spring Configuration**](./03-configuration.md)
   - Component scanning and stereotypes
   - Java-based configuration
   - Mixing configuration approaches
   - **InvoiceManager**: Set up proper configuration structure

**Week 2, Day 4-5: Advanced**
4. [**Aspect-Oriented Programming (AOP)**](./04-aop.md)
   - Cross-cutting concerns
   - Aspect, Advice, Pointcut, Join Point
   - Common use cases (logging, transactions)
   - **InvoiceManager**: Add logging and transaction aspects

**Week 2, Day 5: Mastery**
5. [**Common Pitfalls and Best Practices**](./05-best-practices.md)
   - Circular dependencies
   - Field injection vs constructor injection
   - Common mistakes and how to fix them
   - **InvoiceManager**: Review and refactor

---

## Quick Reference

### Most Important Annotations

| Annotation | Purpose | When to Use |
|------------|---------|-------------|
| `@Component` | Generic Spring bean | Any class Spring should manage |
| `@Service` | Business logic layer | Service classes |
| `@Repository` | Data access layer | DAO/Repository classes |
| `@Controller` | Web layer | MVC controllers (covered in Spring MVC) |
| `@Autowired` | Inject dependency | Constructor/setter injection |
| `@Configuration` | Configuration class | Define beans programmatically |
| `@Bean` | Define a bean | Method that creates a bean |
| `@Scope` | Bean lifecycle | Prototype, singleton, etc. |
| `@Qualifier` | Specify which bean | Multiple implementations |
| `@Primary` | Default bean | Preferred implementation |

### Bean Scopes Quick Reference

| Scope | Instances | When to Use |
|-------|-----------|-------------|
| `singleton` (default) | One per container | Stateless services, utilities |
| `prototype` | New each time | Stateful objects |
| `request` | One per HTTP request | Web request data |
| `session` | One per HTTP session | User session data |

### Dependency Injection Comparison

| Type | Pros | Cons | Recommendation |
|------|------|------|----------------|
| **Constructor** | Immutable, testable, clear dependencies | Verbose for many deps | ✅ **Use this** |
| **Setter** | Optional dependencies | Mutable, can be incomplete | Use sparingly |
| **Field** | Concise | Hard to test, hidden deps | ❌ Avoid |

---

## Build-Along Project: InvoiceManager Week 2

### Starting Point (Week 1)

You have a console application with:
```
InvoiceManager (console)
├── model/
│   ├── Customer.java
│   ├── Invoice.java
│   ├── Product.java
│   └── InvoiceLineItem.java
├── service/
│   ├── InvoiceService.java (creates dependencies with 'new')
│   └── CustomerService.java
└── Main.java
```

### Ending Point (Week 2)

After Spring Core:
```
InvoiceManager (Spring-powered)
├── model/ (same domain models)
├── repository/
│   ├── InvoiceRepository.java (@Repository)
│   └── CustomerRepository.java (@Repository)
├── service/
│   ├── InvoiceService.java (@Service, uses DI)
│   └── CustomerService.java (@Service, uses DI)
├── config/
│   └── AppConfig.java (@Configuration)
├── aspect/
│   └── LoggingAspect.java (@Aspect)
└── InvoiceManagerApp.java (@SpringBootApplication)
```

**What you gain**:
- ✅ No more manual object creation
- ✅ Easy to test (inject mocks)
- ✅ Proper separation of concerns
- ✅ Professional project structure
- ✅ Ready for Spring Boot REST API (Week 3)

---

## Study Tips for Spring Core

### 1. Start Simple

Don't try to learn everything at once:
- **Day 1**: Just IoC and constructor injection
- **Day 2**: Bean scopes (singleton vs prototype)
- **Day 3**: Configuration options
- **Day 4**: Add AOP

### 2. Code Along

**Don't just read** - type the code yourself:
- Start with InvoiceManager Week 1 version
- Follow each file's InvoiceManager section
- Commit after each major change
- Run and test frequently

### 3. Use Active Recall

After reading each file:
- Close the file
- Explain the concept out loud
- Write code from memory
- Check against the file

### 4. Connect to What You Know

| You Already Know | Spring Core Equivalent |
|------------------|------------------------|
| Creating objects with `new` | Spring creates beans |
| Constructor parameters | Dependency injection |
| Interface polymorphism | Multiple bean implementations |
| Factory pattern | `@Bean` methods |
| Singleton pattern | Singleton scope |

---

## Common Questions

**Q: Do I need to learn XML configuration?**
A: Not really. Modern Spring uses annotations. XML is legacy but good to recognize.

**Q: What's the difference between @Component, @Service, @Repository?**
A: Functionally the same. Different names for semantics (readability) and potential framework-specific features.

**Q: Constructor injection vs field injection - does it really matter?**
A: YES! Constructor injection is strongly preferred. You'll see why in file 01.

**Q: When do I use @Autowired?**
A: With constructor injection, it's optional (Spring auto-detects). With setter/field injection, it's required.

**Q: Can I mix configuration approaches?**
A: Yes! Component scanning + Java config + XML all work together. But keep it simple.

---

## Prerequisites

Before starting Spring Core, you should be comfortable with:

- ✅ [Java OOP](../../01-core-java/oop/OOP_Class_Object_Fundamentals.md) - Interfaces, inheritance
- ✅ [Java Annotations](../../01-core-java/oop/OOP_Advanced_Concepts.md) - How annotations work
- ✅ [Collections](../../01-core-java/collections/) - List, Map, Set
- ✅ [Design Patterns](../../01-core-java/design-patterns/) - Factory, Singleton patterns helpful

**If shaky on any**: Review those topics first. Spring builds heavily on OOP concepts.

---

## Next Steps After Spring Core

Once you master Spring Core, you're ready for:

1. **[Spring Boot](../spring-boot/)** - Auto-configuration, starters, simplified development
2. **[Spring MVC](../spring-mvc/)** - Build REST APIs and web applications
3. **[Spring Data JPA](../spring-data/)** - Database access made easy
4. **[Spring Security](../spring-security/)** - Authentication and authorization

**Everything builds on Spring Core**, so take your time here. Master these concepts and the rest flows naturally.

---

## Interview Preparation

### Most Common Questions

1. "What is dependency injection and why use it?"
2. "Explain the difference between constructor and setter injection"
3. "What are bean scopes? When would you use prototype?"
4. "How does Spring know which bean to inject when there are multiple implementations?"
5. "What is the bean lifecycle?"
6. "Explain @Autowired, @Qualifier, and @Primary"
7. "What is AOP? Give an example use case"

**You'll be able to answer all of these** after completing this module.

### Demo-able Skills

After this module, you can demonstrate:
- ✅ Refactoring tight coupling to loose coupling with DI
- ✅ Writing testable code (injecting mocks)
- ✅ Configuring Spring applications
- ✅ Using AOP for cross-cutting concerns
- ✅ Explaining InvoiceManager's Spring architecture

---

## Estimated Time

- **Reading all 5 files**: 4-5 hours
- **Coding InvoiceManager**: 6-8 hours
- **Practice exercises**: 3-4 hours
- **Total**: 2-3 days of focused work

**Don't rush**. Understanding Spring Core deeply will save you time on everything else.

---

**Ready to start?** → [01. IoC and Dependency Injection](./01-ioc-and-di.md)
