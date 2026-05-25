# Java 8 Features

> **Before you start**: Can you explain how Java handled anonymous inner classes before Java 8? → [Review OOP Fundamentals](../../01-core-java/oop/OOP_Class_Object_Fundamentals.md)

## What is Java 8?

Java 8 was the most significant update to the Java language in its history. It introduced **Functional Programming** capabilities to a traditionally Object-Oriented language.

Think of it like adding a "fast-track" to your code. Instead of telling Java *exactly how* to do something (step-by-step loops), you tell it *what* you want to achieve (functional declarations), making the code cleaner and more readable.

## Core Concepts

### 1. Lambda Expressions
Functional approach to write concise code by treating functionality as a method argument.

**Example**:
```java
// Before Java 8: Verbose anonymous class
Comparator<String> comp = new Comparator<String>() {
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
};

// Java 8: Concise Lambda
Comparator<String> lamb = (a, b) -> a.compareTo(b);
```

**Try it yourself**: Rewrite a `Runnable` implementation using a Lambda.

### 2. Streams API
A way to process collections of objects in a declarative manner.

**Analogy**: A stream is like a conveyor belt in a factory. Items (data) pass through various stations (filter, map) where they are processed, and finally gathered at the end (collect).

**Try it yourself**: Filter a list of integers to find only the even numbers and square them.

### 3. Optional
A container object which may or may not contain a non-null value.

**Why This Matters**: It's the standard way to say "this method might return nothing" without triggering a `NullPointerException`.

**Trade-offs**:
| Pros | Cons |
|------|------|
| Explicitly handles nulls | Can be overused for simple fields |
| Cleaner API design | Slight performance overhead |

## Quick Check

> Try to answer these from memory before clicking the links

1. What is the main purpose of a functional interface? → [Review Functional Interfaces](#functional-interfaces)
2. Difference between `map()` and `flatMap()`? → [Review Streams](#3-streams-api)
3. When should you use `orElse()` vs `orElseGet()` in Optional? → [Review Optional](#5-optional-handling)

## Practice Problems

**Intermediate**:
1. Use Streams to group a list of Employees by Department.
2. Find the second highest number in a list using Streams.

## Interview Questions

### Technical Questions
1. Is Java 8 still Object-Oriented? Why?
2. Can a Functional Interface have more than one method? (Hint: See default methods)

---

**Next**: [Java 9-11 Features](./java9-11.md)
