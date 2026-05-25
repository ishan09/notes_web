# Java 9-11 Features (The Modern Foundation)

> **Before you start**: Are you comfortable with Java 8 Streams and Lambdas? → [Review Java 8](./java8.md)

## What happened in Java 9-11?

This era moved Java from "big releases every 3 years" to a **6-month release cycle**. It introduced the Module System and significantly improved developer productivity with features like `var`.

Think of it as the period where Java became "leaner" and more reactive to modern development needs.

## Core Concepts

### 1. Java 9: Module System (Project Jigsaw)
Large applications can be broken into "modules" with explicit dependencies.

**Analogy**: Instead of a giant toolbox where every tool can touch every other tool, modules are like organized compartments that only allow certain tools to interact.

**Why This Matters**: Better encapsulation and reduced runtime footprint (you only ship the parts of the JDK you need).

### 2. Java 10: Local Variable Type Inference (`var`)
Letting the compiler infer the type of a local variable.

```java
// Before
List<String> list = new ArrayList<String>();

// After
var list = new ArrayList<String>(); // Compiler knows it's a List<String>
```

**Trade-offs**:
| Pros | Cons |
|------|------|
| Reduces boilerplate | Can make code less readable if variable names are poor |
| Easier to change types | Cannot be used for class members/parameters |

### 3. Java 11: HTTP Client (Standard)
A new, modern, non-blocking HTTP client replacing the elderly `HttpURLConnection`.

**Try it yourself**: Look into how to send an asynchronous GET request using the Java 11 `HttpClient`.

## Quick Check

> Try to answer these from memory before clicking the links

1. Does `var` make Java dynamically typed? → [Review var](#2-java-10-local-variable-type-inference-var)
2. What is the `module-info.java` file used for? → [Review Module System](#1-java-9-module-system-project-jigsaw)
3. Which version became the first "6-month release" LTS? (Hint: Java 11).

## Practice Problems

**Technical**:
1. Port a small project to use Java 9 modules.
2. Refactor a complex nested generic type declaration using `var`.

---

**Next**: [Java 12-17 Features](./java12-17.md)
