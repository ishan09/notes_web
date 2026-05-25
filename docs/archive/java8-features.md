# Java 8 Features

## Core Concepts

### 1. Lambda Expressions
Functional programming approach to write concise code.

```java
// Before Java 8
Comparator<String> comp = new Comparator<String>() {
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
};

// Java 8
Comparator<String> comp = (a, b) -> a.compareTo(b);
// Or even shorter
Comparator<String> comp = String::compareTo;
```

**Syntax:** `(parameters) -> expression` or `(parameters) -> { statements; }`

### 2. Functional Interfaces
Interfaces with exactly one abstract method.

```java
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);
}

// Usage
Calculator add = (a, b) -> a + b;
Calculator multiply = (a, b) -> a * b;
```

**Built-in Functional Interfaces:**
- `Predicate<T>` - takes T, returns boolean
- `Function<T,R>` - takes T, returns R
- `Consumer<T>` - takes T, returns void
- `Supplier<T>` - takes nothing, returns T

### 3. Streams API
Process collections in a functional way.

```java
List<String> names = Arrays.asList("John", "Jane", "Jack", "Jill");

// Filter and collect
List<String> jNames = names.stream()
    .filter(name -> name.startsWith("J"))
    .collect(Collectors.toList());

// Map and reduce
int totalLength = names.stream()
    .mapToInt(String::length)
    .sum();

// Complex operations
Map<Integer, List<String>> groupedByLength = names.stream()
    .collect(Collectors.groupingBy(String::length));
```

**Key Stream Operations:**
- **Intermediate:** filter, map, sorted, distinct, limit, skip
- **Terminal:** forEach, collect, reduce, findFirst, anyMatch

### 4. Method References
Shorthand for lambda expressions calling existing methods.

```java
// Static method reference
Function<String, Integer> parseInt = Integer::parseInt;

// Instance method reference
String str = "hello";
Supplier<String> toUpper = str::toUpperCase;

// Constructor reference
Supplier<List<String>> listSupplier = ArrayList::new;
```

### 5. Optional
Avoid NullPointerException by wrapping potentially null values.

```java
Optional<String> optional = Optional.ofNullable(getString());

// Check and use
if (optional.isPresent()) {
    System.out.println(optional.get());
}

// Functional approach
optional.ifPresent(System.out::println);

// Default values
String result = optional.orElse("default");
String result2 = optional.orElseGet(() -> "computed default");

// Chaining
optional
    .filter(s -> s.length() > 5)
    .map(String::toUpperCase)
    .ifPresent(System.out::println);
```

### 6. Date and Time API
New immutable date/time classes.

```java
// Current date/time
LocalDate today = LocalDate.now();
LocalTime now = LocalTime.now();
LocalDateTime dateTime = LocalDateTime.now();

// Creating specific dates
LocalDate specificDate = LocalDate.of(2023, Month.DECEMBER, 25);
LocalTime specificTime = LocalTime.of(14, 30, 0);

// Formatting
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
String formattedDate = today.format(formatter);

// Calculations
LocalDate tomorrow = today.plusDays(1);
LocalDate lastWeek = today.minusWeeks(1);

// Working with zones
ZonedDateTime zonedDateTime = ZonedDateTime.now(ZoneId.of("America/New_York"));
```

## Common Interview Questions

### 1. Explain the difference between map() and flatMap()
```java
// map() - one-to-one transformation
List<String> words = Arrays.asList("hello", "world");
List<Integer> lengths = words.stream()
    .map(String::length)
    .collect(toList()); // [5, 5]

// flatMap() - one-to-many transformation
List<String> sentences = Arrays.asList("hello world", "java stream");
List<String> allWords = sentences.stream()
    .flatMap(sentence -> Arrays.stream(sentence.split(" ")))
    .collect(toList()); // [hello, world, java, stream]
```

### 2. How do you handle exceptions in streams?
```java
// Wrap in try-catch within lambda
list.stream()
    .map(item -> {
        try {
            return riskyOperation(item);
        } catch (Exception e) {
            return "default";
        }
    })
    .collect(toList());

// Create utility method
public static <T, R> Function<T, R> wrap(CheckedFunction<T, R> function) {
    return t -> {
        try {
            return function.apply(t);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    };
}
```

### 3. What's the difference between intermediate and terminal operations?
- **Intermediate:** Return Stream, lazy evaluation, can be chained
- **Terminal:** Return non-Stream result, trigger processing

### 4. Parallel Streams - when to use?
```java
// CPU-intensive tasks with large datasets
list.parallelStream()
    .filter(expensiveOperation)
    .collect(toList());

// Avoid for:
// - Small datasets (< 10,000 elements)
// - I/O operations
// - Operations that require order
```

## Practical Exercises

### Exercise 1: Employee Processing
```java
class Employee {
    String name;
    String department;
    double salary;

    // constructor, getters
}

List<Employee> employees = getEmployees();

// Find highest paid employee in each department
Map<String, Optional<Employee>> highestPaidByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,
        Collectors.maxBy(Comparator.comparing(Employee::getSalary))
    ));

// Average salary by department
Map<String, Double> avgSalaryByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,
        Collectors.averagingDouble(Employee::getSalary)
    ));
```

### Exercise 2: String Processing
```java
// Count word frequencies
String text = "hello world hello java world";
Map<String, Long> wordCount = Arrays.stream(text.split(" "))
    .collect(Collectors.groupingBy(
        Function.identity(),
        Collectors.counting()
    ));
```

## Best Practices

1. **Use appropriate collectors** - `toList()`, `toSet()`, `groupingBy()`, etc.
2. **Prefer method references** when lambda just calls a method
3. **Use parallel streams judiciously** - only for CPU-intensive tasks
4. **Handle Optional properly** - avoid `get()` without checking
5. **Keep lambdas simple** - extract complex logic to methods

## Anti-patterns to Avoid

1. **Don't use streams for simple iterations**
2. **Avoid side effects in stream operations**
3. **Don't use parallel streams for I/O operations**
4. **Don't create unnecessary streams** - use appropriate data structures

## Performance Tips

1. **Order operations efficiently** - filter before map
2. **Use primitive streams** - `IntStream`, `LongStream` for numbers
3. **Consider lazy evaluation** - intermediate operations are lazy
4. **Use `findFirst()` or `findAny()`** instead of filtering and collecting when you need just one element