# Object-Oriented Programming Basics

> **Before you start**: Do you understand functions and modules? If not, review [Modules](../01-fundamentals/05-modules.md)

## What is OOP in Python?

Object-Oriented Programming in Python is about **organizing code into classes and objects**. Think of classes as blueprints and objects as instances created from those blueprints. Python's OOP is simpler and more flexible than Java's - no access modifiers required, duck typing instead of interfaces, and everything is an object.

**Real-world analogy**: A class is like a cookie cutter (blueprint), objects are the cookies you make from it. Each cookie (object) has the same shape (attributes) but can have different flavors (values).

## Why This Matters for AI/ML

**You'll need OOP for**:
- Using ML frameworks (PyTorch's `nn.Module`, sklearn's estimators are classes)
- Building custom models and layers
- Creating data loaders and transformers
- Organizing complex ML pipelines

**AI/ML Context**: Most ML libraries use OOP heavily. PyTorch models inherit from `nn.Module`, sklearn models follow a consistent class interface (`fit()`, `predict()`). Understanding Python's OOP is essential for using these frameworks and building custom solutions.

## Classes and Objects

### Defining Classes

```python
# Basic class definition
class Dog:
    pass  # Empty class

# Create an object (instance)
my_dog = Dog()
```

**Key differences from Java**:
- No `public class` - just `class`
- No file naming requirement (multiple classes per file is fine)
- No explicit access modifiers (public/private/protected)
- Use `pass` for empty class body

### Creating Objects (Instances)

```python
class Dog:
    pass

# Create instances
dog1 = Dog()  # No 'new' keyword!
dog2 = Dog()

print(type(dog1))  # <class '__main__.Dog'>
print(dog1 == dog2)  # False (different objects)
```

### The `__init__` Method

The `__init__` method is Python's constructor (like Java constructors).

```python
class Dog:
    def __init__(self, name, age):
        """Initialize a Dog instance."""
        self.name = name  # Instance variable
        self.age = age

# Create instance with arguments
my_dog = Dog("Buddy", 3)
print(my_dog.name)  # "Buddy"
print(my_dog.age)   # 3
```

**Key points**:
- `self` is like `this` in Java (but explicit in Python)
- `__init__` is called automatically when creating an instance
- Always use `self` as the first parameter

**Python vs Java**:

```java
// Java
public class Dog {
    private String name;
    private int age;

    public Dog(String name, int age) {
        this.name = name;
        this.age = age;
    }
}
```

```python
# Python - simpler!
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age
```

### Instance vs Class Variables

**Instance variables** - unique to each object:

```python
class Dog:
    def __init__(self, name):
        self.name = name  # Instance variable

dog1 = Dog("Buddy")
dog2 = Dog("Max")
print(dog1.name)  # "Buddy"
print(dog2.name)  # "Max"
```

**Class variables** - shared across all instances:

```python
class Dog:
    species = "Canis familiaris"  # Class variable

    def __init__(self, name):
        self.name = name  # Instance variable

dog1 = Dog("Buddy")
dog2 = Dog("Max")

print(dog1.species)  # "Canis familiaris"
print(dog2.species)  # "Canis familiaris"
print(Dog.species)   # "Canis familiaris"

# Changing class variable affects all instances
Dog.species = "Dog"
print(dog1.species)  # "Dog"
print(dog2.species)  # "Dog"
```

## Methods

### Instance Methods

Methods that operate on instance data - most common type.

```python
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def bark(self):
        """Instance method."""
        return f"{self.name} says Woof!"

    def get_age_in_human_years(self):
        """Calculate dog years to human years."""
        return self.age * 7

dog = Dog("Buddy", 3)
print(dog.bark())                      # "Buddy says Woof!"
print(dog.get_age_in_human_years())    # 21
```

### Class Methods

Methods that operate on class data - use `@classmethod` decorator.

```python
class Dog:
    count = 0  # Class variable

    def __init__(self, name):
        self.name = name
        Dog.count += 1

    @classmethod
    def get_count(cls):
        """Class method - receives class as first argument."""
        return cls.count

    @classmethod
    def create_puppy(cls, name):
        """Factory method - alternative constructor."""
        return cls(name)

dog1 = Dog("Buddy")
dog2 = Dog("Max")

print(Dog.get_count())  # 2

# Use class method as factory
puppy = Dog.create_puppy("Tiny")
print(puppy.name)  # "Tiny"
print(Dog.get_count())  # 3
```

**When to use**: Factory methods, counting instances, working with class state.

### Static Methods

Methods that don't access instance or class data - use `@staticmethod` decorator.

```python
class Dog:
    def __init__(self, name):
        self.name = name

    @staticmethod
    def is_valid_name(name):
        """Static method - no self or cls parameter."""
        return isinstance(name, str) and len(name) > 0

# Call without instance
print(Dog.is_valid_name("Buddy"))  # True
print(Dog.is_valid_name(""))       # False

# Can also call on instance
dog = Dog("Max")
print(dog.is_valid_name("Rex"))    # True
```

**When to use**: Utility functions that don't need instance/class data but are related to the class.

## The Four Pillars (Python Style)

### Encapsulation

Bundling data and methods together. Python has no true private variables, but uses conventions.

```python
class BankAccount:
    def __init__(self, balance):
        self._balance = balance  # "Protected" (convention)
        self.__pin = 1234        # "Private" (name mangling)

    def deposit(self, amount):
        if amount > 0:
            self._balance += amount

    def get_balance(self):
        return self._balance

    def __validate_pin(self, pin):
        """Private method."""
        return pin == self.__pin

account = BankAccount(1000)
print(account.get_balance())  # 1000
print(account._balance)       # 1000 (accessible but discouraged)
# print(account.__pin)        # AttributeError (name mangled)
print(account._BankAccount__pin)  # 1234 (can still access!)
```

**Conventions**:
- `_single_underscore`: "Protected" (convention only, not enforced)
- `__double_underscore`: "Private" (name mangling to `_ClassName__attribute`)
- No underscore: Public

### Inheritance

Derive new classes from existing ones.

```python
# Base class
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "Some sound"

# Derived class
class Dog(Animal):
    def speak(self):
        """Override parent method."""
        return f"{self.name} says Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"

# Use them
dog = Dog("Buddy")
cat = Cat("Whiskers")

print(dog.speak())  # "Buddy says Woof!"
print(cat.speak())  # "Whiskers says Meow!"
```

**Call parent methods** with `super()`:

```python
class Animal:
    def __init__(self, name, species):
        self.name = name
        self.species = species

    def info(self):
        return f"{self.name} is a {self.species}"

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name, "Dog")  # Call parent __init__
        self.breed = breed

    def info(self):
        """Extend parent method."""
        base_info = super().info()
        return f"{base_info}, breed: {self.breed}"

dog = Dog("Buddy", "Golden Retriever")
print(dog.info())
# "Buddy is a Dog, breed: Golden Retriever"
```

**Multiple inheritance** (use carefully!):

```python
class Flyer:
    def fly(self):
        return "Flying!"

class Swimmer:
    def swim(self):
        return "Swimming!"

class Duck(Flyer, Swimmer):
    def quack(self):
        return "Quack!"

duck = Duck()
print(duck.fly())    # "Flying!"
print(duck.swim())   # "Swimming!"
print(duck.quack())  # "Quack!"
```

### Polymorphism

Different classes can be used through a common interface.

```python
class Dog:
    def speak(self):
        return "Woof!"

class Cat:
    def speak(self):
        return "Meow!"

class Bird:
    def speak(self):
        return "Chirp!"

# Polymorphism - same interface, different behavior
def make_sound(animal):
    print(animal.speak())

animals = [Dog(), Cat(), Bird()]
for animal in animals:
    make_sound(animal)
# Woof!
# Meow!
# Chirp!
```

**Duck typing** (Python's approach):

```python
# No inheritance needed!
class Dog:
    def speak(self):
        return "Woof!"

class Robot:
    def speak(self):
        return "Beep boop!"

# Both work with make_sound - they have speak()
make_sound(Dog())    # "Woof!"
make_sound(Robot())  # "Beep boop!"

# "If it walks like a duck and quacks like a duck, it's a duck"
```

### Abstraction

Hide complex implementation details, show only necessary interface.

```python
from abc import ABC, abstractmethod

class Model(ABC):
    """Abstract base class for ML models."""

    @abstractmethod
    def train(self, data):
        """Must be implemented by subclasses."""
        pass

    @abstractmethod
    def predict(self, data):
        """Must be implemented by subclasses."""
        pass

class LinearModel(Model):
    def train(self, data):
        print("Training linear model...")
        # Training logic

    def predict(self, data):
        print("Making predictions...")
        return [0, 1, 0]  # Dummy predictions

# Cannot instantiate abstract class
# model = Model()  # TypeError

# Can instantiate concrete class
model = LinearModel()
model.train([1, 2, 3])
predictions = model.predict([4, 5, 6])
```

## Special Methods (Dunder Methods)

Python's "magic methods" - customize object behavior.

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        """String representation for users."""
        return f"Vector({self.x}, {self.y})"

    def __repr__(self):
        """String representation for developers."""
        return f"Vector(x={self.x}, y={self.y})"

    def __add__(self, other):
        """Enable + operator."""
        return Vector(self.x + other.x, self.y + other.y)

    def __eq__(self, other):
        """Enable == operator."""
        return self.x == other.x and self.y == other.y

    def __len__(self):
        """Enable len() function."""
        return 2

v1 = Vector(1, 2)
v2 = Vector(3, 4)

print(v1)           # "Vector(1, 2)" (calls __str__)
print(repr(v1))     # "Vector(x=1, y=2)" (calls __repr__)

v3 = v1 + v2        # Calls __add__
print(v3)           # "Vector(4, 6)"

print(v1 == v2)     # False (calls __eq__)
print(len(v1))      # 2 (calls __len__)
```

**Common special methods**:

**Object Initialization & Representation**:
- `__init__(self, ...)`: Constructor - initialize object
- `__new__(cls, ...)`: Create new instance (before __init__)
- `__del__(self)`: Destructor - cleanup when object is deleted
- `__str__(self)`: User-friendly string representation (used by str() and print())
- `__repr__(self)`: Developer-friendly representation (used by repr() and interactive shell)
- `__format__(self, format_spec)`: Custom string formatting (used by format() and f-strings)
- `__bytes__(self)`: Byte-string representation
- `__hash__(self)`: Hash value (needed for sets and dict keys)

**Comparison Operators**:
- `__eq__(self, other)`: Equality (==)
- `__ne__(self, other)`: Inequality (!=)
- `__lt__(self, other)`: Less than (<)
- `__le__(self, other)`: Less than or equal (<=)
- `__gt__(self, other)`: Greater than (>)
- `__ge__(self, other)`: Greater than or equal (>=)

**Arithmetic Operators**:
- `__add__(self, other)`: Addition (+)
- `__sub__(self, other)`: Subtraction (-)
- `__mul__(self, other)`: Multiplication (*)
- `__truediv__(self, other)`: True division (/)
- `__floordiv__(self, other)`: Floor division (//)
- `__mod__(self, other)`: Modulo (%)
- `__pow__(self, other)`: Power (**)
- `__matmul__(self, other)`: Matrix multiplication (@)

**Reverse Arithmetic** (called when left operand doesn't support operation):
- `__radd__(self, other)`: Right-side addition
- `__rsub__(self, other)`: Right-side subtraction
- `__rmul__(self, other)`: Right-side multiplication
- `__rtruediv__(self, other)`: Right-side division

**In-place Operators** (+=, -=, etc.):
- `__iadd__(self, other)`: In-place addition (+=)
- `__isub__(self, other)`: In-place subtraction (-=)
- `__imul__(self, other)`: In-place multiplication (*=)
- `__itruediv__(self, other)`: In-place division (/=)

**Unary Operators**:
- `__neg__(self)`: Negation (-)
- `__pos__(self)`: Unary plus (+)
- `__abs__(self)`: Absolute value (abs())
- `__invert__(self)`: Bitwise NOT (~)

**Type Conversion**:
- `__int__(self)`: Convert to int
- `__float__(self)`: Convert to float
- `__bool__(self)`: Convert to bool (used in if statements)
- `__complex__(self)`: Convert to complex
- `__round__(self, n)`: Round to n digits

**Container/Sequence Protocol**:
- `__len__(self)`: Length (len())
- `__getitem__(self, key)`: Get item by index/key (obj[key])
- `__setitem__(self, key, value)`: Set item (obj[key] = value)
- `__delitem__(self, key)`: Delete item (del obj[key])
- `__contains__(self, item)`: Membership test (item in obj)
- `__iter__(self)`: Return iterator (for loops)
- `__next__(self)`: Get next item (iteration protocol)
- `__reversed__(self)`: Reverse iteration

**Callable Objects**:
- `__call__(self, ...)`: Make object callable like a function

**Context Managers**:
- `__enter__(self)`: Enter context (with statement)
- `__exit__(self, exc_type, exc_val, exc_tb)`: Exit context (cleanup)

**Attribute Access**:
- `__getattr__(self, name)`: Called when attribute not found
- `__setattr__(self, name, value)`: Called on attribute assignment
- `__delattr__(self, name)`: Called on attribute deletion
- `__getattribute__(self, name)`: Called for all attribute access
- `__dir__(self)`: Return list of attributes (dir())

**Descriptor Protocol**:
- `__get__(self, obj, type)`: Get attribute value
- `__set__(self, obj, value)`: Set attribute value
- `__delete__(self, obj)`: Delete attribute
- `__set_name__(self, owner, name)`: Called when descriptor is assigned to class

**Pickling/Serialization**:
- `__reduce__(self)`: Return state for pickling
- `__reduce_ex__(self, protocol)`: Extended pickling
- `__getstate__(self)`: Return state dict for pickling
- `__setstate__(self, state)`: Restore state from pickle

**Class and Instance Checks**:
- `__instancecheck__(self, instance)`: Customize isinstance()
- `__subclasscheck__(self, subclass)`: Customize issubclass()

**Async/Await**:
- `__await__(self)`: Make object awaitable
- `__aiter__(self)`: Async iterator
- `__anext__(self)`: Async next
- `__aenter__(self)`: Async context manager enter
- `__aexit__(self, exc_type, exc_val, exc_tb)`: Async context manager exit

**Special Attributes**:
- `__dict__`: Instance attributes dictionary
- `__class__`: Class of instance
- `__doc__`: Docstring
- `__name__`: Name (for functions/classes)
- `__module__`: Module where defined
- `__annotations__`: Type annotations

## Try It

**Exercise 1**: Basic class

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, I'm {self.name} and I'm {self.age} years old"

    def birthday(self):
        self.age += 1
        return f"Happy birthday! Now {self.age}"

person = Person("Alice", 30)
print(person.greet())
print(person.birthday())
print(person.greet())
```

**Exercise 2**: Inheritance

```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def get_info(self):
        return f"{self.name}: ${self.salary}"

class Manager(Employee):
    def __init__(self, name, salary, department):
        super().__init__(name, salary)
        self.department = department

    def get_info(self):
        base = super().get_info()
        return f"{base}, Department: {self.department}"

manager = Manager("Bob", 80000, "Engineering")
print(manager.get_info())
```

**Exercise 3**: Special methods

```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    def __str__(self):
        return f"{self.celsius}°C"

    def __add__(self, other):
        return Temperature(self.celsius + other.celsius)

    def to_fahrenheit(self):
        return (self.celsius * 9/5) + 32

temp1 = Temperature(20)
temp2 = Temperature(15)
print(temp1)  # "20°C"

temp3 = temp1 + temp2
print(temp3)  # "35°C"
print(f"{temp3.to_fahrenheit()}°F")  # "95.0°F"
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between a class and an object?
2. **Why** do we need the `self` parameter in methods?
3. **When** should you use class methods vs static methods?
4. **How** does Python's OOP differ from Java's?
5. **Compare**: `__init__` in Python vs constructors in Java

<details>
<summary>Click to reveal answers</summary>

1. **A class is a blueprint/template** that defines structure and behavior. **An object (instance) is a concrete realization** of that class with actual data. Example: `Dog` is a class (blueprint). `my_dog = Dog("Buddy", 3)` creates an object (specific dog with name "Buddy" and age 3). One class can create many objects.

2. **`self` refers to the instance** being operated on - it gives access to instance variables and methods. It's like `this` in Java but explicit in Python. When you call `dog.bark()`, Python automatically passes the `dog` instance as `self` to the method: `bark(dog)`. Without `self`, methods wouldn't know which object's data to use.

3. **Use `@classmethod` when you need access to the class itself** - factory methods, alternative constructors, or working with class variables. **Use `@staticmethod` for utility functions** that don't need instance or class data but are logically related to the class. Class method example: `Dog.from_string("Buddy-3")`. Static method example: `Dog.is_valid_name("Buddy")`.

4. **Python OOP is simpler and more flexible**: No mandatory access modifiers (everything is essentially public), duck typing instead of interfaces, multiple inheritance supported, no method overloading (use default parameters instead), `__init__` instead of constructors, everything is an object (including primitives), no final keyword.

5. **Both initialize objects but syntax differs**. Python `__init__(self, ...)` is a regular method called after object creation. Java constructor has same name as class, no return type. Python's approach: `__init__` is just a method Python calls automatically. Java's approach: special syntax with `new ClassName()`. Both achieve same goal but Python's is more explicit about the process.

</details>

## Practice Exercises

**Level 1 - Understand**:

Create simple classes in a file:

```python
# Create basic class
class Book:
    def __init__(self, title, author):
        self.title = title
        self.author = author

    def info(self):
        return f"{self.title} by {self.author}"

book = Book("1984", "George Orwell")
print(book.info())

# Try class variables
class Counter:
    count = 0

    def __init__(self):
        Counter.count += 1

c1 = Counter()
c2 = Counter()
c3 = Counter()
print(Counter.count)  # 3
```

**Level 2 - Apply**:

Create an ML-related class hierarchy:

```python
# ml_models.py

class Model:
    """Base model class."""

    def __init__(self, name):
        self.name = name
        self.trained = False

    def train(self, X, y):
        print(f"Training {self.name}...")
        self.trained = True
        return self

    def predict(self, X):
        if not self.trained:
            raise ValueError("Model not trained yet!")
        print(f"Predicting with {self.name}...")
        return [0] * len(X)

    def __str__(self):
        status = "trained" if self.trained else "untrained"
        return f"{self.name} ({status})"

class LinearRegression(Model):
    def __init__(self):
        super().__init__("Linear Regression")
        self.coefficients = None

    def train(self, X, y):
        super().train(X, y)
        # Dummy training
        self.coefficients = [0.5] * len(X[0])
        return self

class DecisionTree(Model):
    def __init__(self, max_depth=5):
        super().__init__("Decision Tree")
        self.max_depth = max_depth
        self.tree = None

    def train(self, X, y):
        super().train(X, y)
        # Dummy training
        self.tree = {"root": "dummy"}
        return self

# Test the models
X_train = [[1, 2], [3, 4], [5, 6]]
y_train = [0, 1, 0]
X_test = [[2, 3], [4, 5]]

lr = LinearRegression()
print(lr)  # "Linear Regression (untrained)"

lr.train(X_train, y_train)
print(lr)  # "Linear Regression (trained)"

predictions = lr.predict(X_test)
print(f"Predictions: {predictions}")

dt = DecisionTree(max_depth=10)
dt.train(X_train, y_train).predict(X_test)  # Method chaining
```

**Level 3 - Create**:

Build a complete data preprocessing pipeline with classes:

<details>
<summary>Solution</summary>

```python
# data_pipeline.py

from abc import ABC, abstractmethod

class Transformer(ABC):
    """Abstract base class for data transformers."""

    @abstractmethod
    def fit(self, data):
        """Learn parameters from data."""
        pass

    @abstractmethod
    def transform(self, data):
        """Transform data using learned parameters."""
        pass

    def fit_transform(self, data):
        """Fit and transform in one step."""
        self.fit(data)
        return self.transform(data)

class Normalizer(Transformer):
    """Min-max normalization."""

    def __init__(self):
        self.min_val = None
        self.max_val = None

    def fit(self, data):
        """Learn min and max from data."""
        self.min_val = min(data)
        self.max_val = max(data)
        return self

    def transform(self, data):
        """Normalize to [0, 1] range."""
        if self.min_val is None:
            raise ValueError("Transformer not fitted!")

        range_val = self.max_val - self.min_val
        if range_val == 0:
            return [0.5] * len(data)

        return [(x - self.min_val) / range_val for x in data]

    def __repr__(self):
        if self.min_val is not None:
            return f"Normalizer(min={self.min_val}, max={self.max_val})"
        return "Normalizer(not fitted)"

class StandardScaler(Transformer):
    """Z-score normalization."""

    def __init__(self):
        self.mean = None
        self.std = None

    def fit(self, data):
        """Learn mean and std from data."""
        self.mean = sum(data) / len(data)
        variance = sum((x - self.mean) ** 2 for x in data) / len(data)
        self.std = variance ** 0.5
        return self

    def transform(self, data):
        """Standardize data."""
        if self.mean is None:
            raise ValueError("Transformer not fitted!")

        if self.std == 0:
            return [0] * len(data)

        return [(x - self.mean) / self.std for x in data]

    def __repr__(self):
        if self.mean is not None:
            return f"StandardScaler(mean={self.mean:.2f}, std={self.std:.2f})"
        return "StandardScaler(not fitted)"

class Pipeline:
    """Chain multiple transformers."""

    def __init__(self, steps):
        """
        Args:
            steps: List of (name, transformer) tuples
        """
        self.steps = steps

    def fit(self, data):
        """Fit all transformers sequentially."""
        current_data = data
        for name, transformer in self.steps:
            print(f"Fitting {name}...")
            transformer.fit(current_data)
            current_data = transformer.transform(current_data)
        return self

    def transform(self, data):
        """Transform data through all steps."""
        current_data = data
        for name, transformer in self.steps:
            current_data = transformer.transform(current_data)
        return current_data

    def fit_transform(self, data):
        """Fit and transform."""
        self.fit(data)
        return self.transform(data)

    def __repr__(self):
        steps_str = " -> ".join(name for name, _ in self.steps)
        return f"Pipeline({steps_str})"

# Demo
if __name__ == "__main__":
    print("=" * 50)
    print("Data Preprocessing Pipeline Demo")
    print("=" * 50)

    # Sample data with outliers
    raw_data = [10, 12, 15, 100, 18, 22, 25]

    print(f"\n1. Original data: {raw_data}")

    # Single transformer
    print("\n2. Using Normalizer:")
    normalizer = Normalizer()
    normalized = normalizer.fit_transform(raw_data)
    print(f"   {normalizer}")
    print(f"   Normalized: {[f'{x:.3f}' for x in normalized]}")

    # Another transformer
    print("\n3. Using StandardScaler:")
    scaler = StandardScaler()
    scaled = scaler.fit_transform(raw_data)
    print(f"   {scaler}")
    print(f"   Scaled: {[f'{x:.3f}' for x in scaled]}")

    # Pipeline
    print("\n4. Using Pipeline:")
    pipeline = Pipeline([
        ("normalizer", Normalizer()),
        ("scaler", StandardScaler())
    ])
    print(f"   {pipeline}")

    result = pipeline.fit_transform(raw_data)
    print(f"   Result: {[f'{x:.3f}' for x in result]}")

    # Transform new data
    print("\n5. Transform new data:")
    new_data = [20, 30, 40]
    transformed = pipeline.transform(new_data)
    print(f"   New data: {new_data}")
    print(f"   Transformed: {[f'{x:.3f}' for x in transformed]}")

    print("=" * 50)
```

Run it: `python3 data_pipeline.py`

</details>

## Common Mistakes

❌ **Mistake 1**: Forgetting `self` in method definitions

```python
# Wrong
class Dog:
    def __init__(name):  # Missing self!
        self.name = name

# TypeError when creating instance
```

✅ **Instead**: Always include `self` as first parameter

```python
# Correct
class Dog:
    def __init__(self, name):
        self.name = name
```

---

❌ **Mistake 2**: Modifying class variables with instance

```python
# Wrong - creates instance variable instead
class Counter:
    count = 0

    def increment(self):
        self.count += 1  # Creates instance variable!

c1 = Counter()
c1.increment()
print(Counter.count)  # Still 0!
```

✅ **Instead**: Use class name to modify class variables

```python
# Correct
class Counter:
    count = 0

    def increment(self):
        Counter.count += 1  # Or self.__class__.count += 1

c1 = Counter()
c1.increment()
print(Counter.count)  # 1
```

---

❌ **Mistake 3**: Not calling parent `__init__`

```python
# Wrong - parent __init__ not called
class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    def __init__(self, name, breed):
        self.breed = breed  # Forgot super().__init__

dog = Dog("Buddy", "Golden")
print(dog.name)  # AttributeError!
```

✅ **Instead**: Call `super().__init__()`

```python
# Correct
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)
        self.breed = breed
```

---

❌ **Mistake 4**: Mutable default arguments in `__init__`

```python
# Wrong - list shared across instances
class Team:
    def __init__(self, name, members=[]):
        self.name = name
        self.members = members

team1 = Team("A")
team1.members.append("Alice")

team2 = Team("B")
print(team2.members)  # ["Alice"] - WRONG!
```

✅ **Instead**: Use `None` and create new list

```python
# Correct
class Team:
    def __init__(self, name, members=None):
        self.name = name
        self.members = members if members is not None else []
```

---

❌ **Mistake 5**: Comparing objects without `__eq__`

```python
# Wrong - compares object identity, not values
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p1 = Point(1, 2)
p2 = Point(1, 2)
print(p1 == p2)  # False (different objects)
```

✅ **Instead**: Implement `__eq__`

```python
# Correct
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

p1 = Point(1, 2)
p2 = Point(1, 2)
print(p1 == p2)  # True
```

## How This Connects

**Builds on**:
- [Functions](../01-fundamentals/04-functions.md) - Methods are functions in classes
- [Modules](../01-fundamentals/05-modules.md) - Classes organized in modules

**Related concepts**:
- [Dataclasses](./02-dataclasses.md) - Simplified way to create data classes
- [Type Hints](../03-advanced/01-type-hints.md) - Add type annotations to classes
- [Decorators](../03-advanced/04-decorators.md) - `@classmethod`, `@staticmethod`, custom decorators

**Why this matters for AI**:
- **PyTorch**: Models inherit from `nn.Module`, custom layers are classes
- **sklearn**: All models follow class interface (`fit()`, `predict()`, `transform()`)
- **Custom components**: Data loaders, loss functions, optimizers are classes
- **Pipelines**: Chain preprocessing and model steps with class-based transformers
- **Organization**: Large ML projects use OOP to structure code

**Next steps**:
- [Dataclasses](./02-dataclasses.md) - Modern, cleaner way to create data-focused classes

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:
1. What is the Method Resolution Order (MRO) and how does C3 linearization work in Python's multiple inheritance?

<details>
<summary>Answer: MRO determines method lookup order using C3 linearization algorithm; ensures consistent, predictable resolution in diamond inheritance</summary>

**Explanation**:
The Method Resolution Order (MRO) determines which method gets called when multiple classes define the same method in an inheritance hierarchy. Python uses the **C3 linearization algorithm** (also called C3 superclass linearization) to compute MRO, ensuring a consistent and predictable order that respects: (1) child classes before parents, (2) parent order as specified in class definition, and (3) monotonicity (a class always appears before its parents).

C3 linearization solves the "diamond problem" where a class inherits from multiple parents that share a common ancestor. The algorithm ensures each class appears exactly once in the MRO and maintains a valid topological ordering. You can view a class's MRO using `ClassName.__mro__` or `ClassName.mro()`.

The C3 algorithm works by: (1) merging linearizations of parents left-to-right, (2) selecting the first head that doesn't appear in any other tail, (3) removing selected class from all lists, (4) repeating until complete. If no valid ordering exists, Python raises TypeError during class definition.

**Example**:
```python
# Simple inheritance - MRO is straightforward
class A:
    def method(self):
        return "A"

class B(A):
    def method(self):
        return "B"

class C(B):
    def method(self):
        return "C"

# MRO: C -> B -> A -> object
print(C.__mro__)
# (<class '__main__.C'>, <class '__main__.B'>, <class '__main__.A'>, <class 'object'>)
print(C.mro())  # Same, as a list

obj = C()
print(obj.method())  # "C" - finds method in C first

# Diamond inheritance - classic problem
class A:
    def method(self):
        return "A"

class B(A):
    def method(self):
        return "B from A"

class C(A):
    def method(self):
        return "C from A"

class D(B, C):
    # Which method is called? B's or C's?
    pass

# MRO: D -> B -> C -> A -> object
# Left-to-right: B before C (as specified in D(B, C))
print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)

obj = D()
print(obj.method())  # "B from A" - B comes before C in MRO

# Visualizing the diamond:
#     A
#    / \
#   B   C
#    \ /
#     D

# Explicit super() calls follow MRO
class A:
    def method(self):
        print("A.method")
        return "A"

class B(A):
    def method(self):
        print("B.method")
        return super().method()  # Calls next in MRO

class C(A):
    def method(self):
        print("C.method")
        return super().method()  # Calls next in MRO

class D(B, C):
    def method(self):
        print("D.method")
        return super().method()  # Calls next in MRO

obj = D()
result = obj.method()
# Output:
# D.method
# B.method
# C.method  <- C is called! Not A directly from B
# A.method

# MRO ensures C is called before A, even though B->A is direct inheritance
print(D.__mro__)
# (D, B, C, A, object)

# Complex multiple inheritance
class A:
    pass

class B(A):
    pass

class C(A):
    pass

class D(B, C):
    pass

class E(C):
    pass

class F(D, E):
    pass

# MRO: F -> D -> B -> E -> C -> A -> object
print(F.__mro__)
# Respects: F first, D before E (left-to-right), B before C (from D),
# E before C (E is child of C), C before A (child before parent)

# Invalid MRO - C3 linearization fails
try:
    class X:
        pass

    class Y(X):
        pass

    class Z(X, Y):  # Can't have X before Y (Y inherits from X)
        pass
except TypeError as e:
    print(f"TypeError: {e}")
    # TypeError: Cannot create a consistent method resolution order (MRO)

# Practical example: Mixin pattern
class JSONSerializableMixin:
    def to_json(self):
        import json
        return json.dumps(self.__dict__)

class LoggableMixin:
    def log(self, message):
        print(f"[{self.__class__.__name__}] {message}")

class Model:
    def __init__(self, name):
        self.name = name

    def train(self):
        return f"Training {self.name}"

class MyModel(JSONSerializableMixin, LoggableMixin, Model):
    def __init__(self, name, version):
        super().__init__(name)
        self.version = version

# MRO: MyModel -> JSONSerializableMixin -> LoggableMixin -> Model -> object
print(MyModel.__mro__)

model = MyModel("BERT", "1.0")
model.log("Starting training")  # From LoggableMixin
print(model.train())            # From Model
print(model.to_json())          # From JSONSerializableMixin
# {"name": "BERT", "version": "1.0"}

# Cooperative multiple inheritance (all classes use super())
class Base:
    def __init__(self):
        print("Base.__init__")
        super().__init__()  # Important! Calls next in MRO

class A(Base):
    def __init__(self):
        print("A.__init__")
        super().__init__()  # Continues MRO chain

class B(Base):
    def __init__(self):
        print("B.__init__")
        super().__init__()  # Continues MRO chain

class C(A, B):
    def __init__(self):
        print("C.__init__")
        super().__init__()  # Starts MRO chain

# MRO: C -> A -> B -> Base -> object
obj = C()
# Output:
# C.__init__
# A.__init__
# B.__init__  <- B is called! Cooperative inheritance works
# Base.__init__

# Without super() - breaks cooperative inheritance
class BadA(Base):
    def __init__(self):
        print("BadA.__init__")
        Base.__init__(self)  # Directly calls Base, skips rest of MRO

class BadB(Base):
    def __init__(self):
        print("BadB.__init__")
        Base.__init__(self)

class BadC(BadA, BadB):
    def __init__(self):
        print("BadC.__init__")
        BadA.__init__(self)

obj = BadC()
# Output:
# BadC.__init__
# BadA.__init__
# Base.__init__
# (BadB is NEVER called - broken!)

# Checking if class is in MRO
print(issubclass(D, A))  # True
print(issubclass(D, C))  # True
print(A in D.__mro__)    # True

# MRO affects isinstance checks
obj = D()
print(isinstance(obj, D))  # True
print(isinstance(obj, B))  # True
print(isinstance(obj, C))  # True
print(isinstance(obj, A))  # True
```

**In Practice**:
In ML frameworks: (1) **PyTorch modules** - multiple inheritance for mixins (quantization, pruning) follows MRO for hook execution, (2) **Custom layers** - when combining functionality (BatchNorm + Dropout + CustomActivation), MRO determines initialization order, (3) **Model architectures** - diamond inheritance in vision transformers (ConvStem + TransformerEncoder both from BaseModule), (4) **Debug with `.__mro__`** - when method isn't called as expected, check MRO to understand resolution order. Always use `super()` for cooperative inheritance, especially in libraries where users will subclass your classes.

**Key Takeaway**: MRO uses C3 linearization to determine method lookup order in multiple inheritance; guarantees consistent resolution, child-before-parent ordering, and solves diamond problem; use `super()` for cooperative inheritance.

</details>

2. How does Python implement "private" variables with name mangling (`__attribute`)?

<details>
<summary>Answer: Double underscore prefix triggers name mangling to _ClassName__attribute; prevents accidental override in subclasses, not true privacy</summary>

**Explanation**:
Python doesn't have true private variables like Java. When you prefix an attribute with double underscores (`__attribute`), Python performs **name mangling** - automatically renaming it to `_ClassName__attribute` where `ClassName` is the current class name. This prevents accidental name collisions in subclasses and provides a weak form of privacy.

Name mangling happens at **class definition time** (compile time), not runtime. It only applies to names starting with `__` (but not ending with `__`, which are reserved for special methods). The mangled name can still be accessed as `obj._ClassName__attribute`, so it's privacy by convention, not enforcement.

This design serves two purposes: (1) **prevent accidental override** - subclasses can't accidentally override parent's `__attribute`, (2) **signal intent** - "this is internal implementation detail, don't use externally". It's not meant for security (anyone can access mangled names) but for code organization.

**Example**:
```python
# Basic name mangling
class MyClass:
    def __init__(self):
        self.public = "I'm public"
        self._protected = "I'm protected (convention)"
        self.__private = "I'm 'private' (name mangled)"

    def __private_method(self):
        return "Private method"

    def public_method(self):
        # Can access __private within class
        return self.__private

obj = MyClass()

# Public - accessible
print(obj.public)  # "I'm public"

# Protected - accessible but convention says "don't use"
print(obj._protected)  # Works, but discouraged

# Private - AttributeError
try:
    print(obj.__private)
except AttributeError as e:
    print(f"AttributeError: {e}")
    # AttributeError: 'MyClass' object has no attribute '__private'

# But can access via mangled name!
print(obj._MyClass__private)  # "I'm 'private'" - privacy is weak!

# Check actual attributes
print(dir(obj))
# [..., '_MyClass__private', '_MyClass__private_method', '_protected', 'public', ...]

# View instance dictionary
print(obj.__dict__)
# {'public': "I'm public", '_protected': "I'm protected", '_MyClass__private': "I'm 'private'"}

# Name mangling prevents subclass override
class Parent:
    def __init__(self):
        self.__private = "Parent's private"

    def get_private(self):
        return self.__private  # Refers to Parent.__private

    def __private_method(self):
        return "Parent's private method"

class Child(Parent):
    def __init__(self):
        super().__init__()
        self.__private = "Child's private"  # Different attribute!

    def get_child_private(self):
        return self.__private  # Refers to Child.__private

    def __private_method(self):
        return "Child's private method"

obj = Child()

# Parent and child have separate __private attributes
print(obj.get_private())        # "Parent's private"
print(obj.get_child_private())  # "Child's private"

# Both attributes exist with mangled names
print(obj._Parent__private)  # "Parent's private"
print(obj._Child__private)   # "Child's private"
print(obj.__dict__)
# {'_Parent__private': "Parent's private", '_Child__private': "Child's private"}

# Without mangling, child would override parent
class BadParent:
    def __init__(self):
        self._private = "Parent's private"

    def get_private(self):
        return self._private

class BadChild(BadParent):
    def __init__(self):
        super().__init__()
        self._private = "Child's private"  # Overrides parent!

obj = BadChild()
print(obj.get_private())  # "Child's private" - parent's value lost!

# Mangling only happens with class-level names
class Example:
    __class_var = "Class variable"  # Mangled

    def __init__(self):
        self.__instance_var = "Instance variable"  # Mangled

        # Local variable - NOT mangled
        __local_var = "Local variable"
        print(__local_var)  # Works fine, no mangling for locals

# Special methods are NOT mangled (start and end with __)
class SpecialMethods:
    def __init__(self):  # NOT mangled
        pass

    def __str__(self):   # NOT mangled
        return "string"

    def __private(self):  # MANGLED (doesn't end with __)
        pass

# Mangling in different scopes
class Outer:
    __private = "Outer private"

    class Inner:
        __private = "Inner private"  # Different mangled name

        def get_outer_private(self):
            # Can't access Outer.__private directly
            # Need to use _Outer__private
            return Outer._Outer__private

        def get_inner_private(self):
            return self.__private  # Refers to Inner.__private

inner = Outer.Inner()
print(inner.get_inner_private())  # "Inner private"
print(inner.get_outer_private())  # "Outer private"
print(inner._Outer_Inner__private)  # "Inner private" - mangled with Inner

# Practical example: Protected state in ML model
class Model:
    def __init__(self, learning_rate):
        self.lr = learning_rate          # Public
        self._training = False           # Protected (convention)
        self.__weights = []              # Private (mangled)

    def train(self):
        self._training = True
        self.__initialize_weights()

    def __initialize_weights(self):
        """Private initialization - implementation detail"""
        import random
        self.__weights = [random.random() for _ in range(10)]

    def get_weights(self):
        """Public interface to access weights"""
        return self.__weights.copy()  # Return copy, not reference

class CustomModel(Model):
    def __init__(self, learning_rate):
        super().__init__(learning_rate)
        # Can't accidentally override parent's __weights
        self.__weights = []  # This is CustomModel.__weights, separate!

    def custom_train(self):
        # Can't accidentally call parent's __initialize_weights
        self.__initialize_weights()  # Calls CustomModel's version

    def __initialize_weights(self):
        """Different initialization"""
        self.__weights = [0.5] * 10

model = CustomModel(0.01)
model.train()
print(len(model.get_weights()))  # 10 (from Model)
print(len(model._CustomModel__weights))  # 0 (CustomModel's own)

# Real-world: Protecting internal state
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance
        self.__transactions = []

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount
            self.__transactions.append(f"Deposit: {amount}")

    def withdraw(self, amount):
        if 0 < amount <= self.__balance:
            self.__balance -= amount
            self.__transactions.append(f"Withdraw: {amount}")
            return True
        return False

    def get_balance(self):
        return self.__balance

    # Note: Can still access via _BankAccount__balance, but signals intent

account = BankAccount(1000)
account.deposit(500)
print(account.get_balance())  # 1500

# Can't directly modify (AttributeError)
# account.__balance = 999999  # Creates NEW attribute, doesn't modify mangled one
account.__balance = 999999
print(account.get_balance())  # Still 1500 (didn't modify the real __balance)
print(account.__dict__)
# {..., '_BankAccount__balance': 1500, '__balance': 999999}

# Actually modifying internal state (possible but discouraged)
account._BankAccount__balance = 999999
print(account.get_balance())  # 999999 - changed!

# Single underscore: convention only (not mangled)
class PublicAPI:
    def public_method(self):
        """Use this"""
        return self._internal_helper()

    def _internal_helper(self):
        """Don't use externally (but not enforced)"""
        return "internal"

obj = PublicAPI()
print(obj._internal_helper())  # Works, but you shouldn't!
```

**In Practice**:
In ML code: (1) **Protect model internals** - `self.__weights`, `self.__gradients` to prevent accidental modification, (2) **Implementation details** - `__compute_loss()`, `__update_optimizer()` for internal methods, (3) **Convention over enforcement** - use single underscore `_method` for "protected" (more Pythonic), double underscore only when inheritance collision is real concern, (4) **Don't use for security** - anyone can access `_ClassName__attr`, use it for organization not protection. Most Python code uses single underscore; double underscore is rare in practice.

**Key Takeaway**: Double underscore prefix triggers name mangling to `_ClassName__attribute`, preventing accidental override in subclasses; not true privacy (still accessible), mainly for avoiding name collisions in inheritance hierarchies.

</details>

3. What's the difference between `__str__` and `__repr__`? When does each get called?

<details>
<summary>Answer: __str__ for user-friendly display (str(), print()), __repr__ for unambiguous developer representation (repr(), interactive shell); __repr__ is fallback if __str__ missing</summary>

**Explanation**:
`__str__` provides a **user-friendly, readable** string representation (for end users), while `__repr__` provides an **unambiguous, developer-friendly** representation (for debugging). The goal: `__repr__` should be unambiguous and ideally eval-able (recreate object), while `__str__` should be readable and concise.

`__str__` is called by `str(obj)`, `print(obj)`, and f-strings/format. `__repr__` is called by `repr(obj)`, interactive shell, containers (lists/dicts display items using repr), and as **fallback** when `__str__` is not defined. If you only define one, define `__repr__` - it serves both purposes.

The convention: `__repr__` should look like `ClassName(arg1=val1, arg2=val2)` (valid Python expression when possible), while `__str__` can be any human-readable format. Built-in types follow this: `str(datetime.now())` gives `'2026-01-26 10:30:00'` while `repr(datetime.now())` gives `'datetime.datetime(2026, 1, 26, 10, 30, 0)'`.

**Example**:
```python
# Basic difference
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        """User-friendly: just show coordinates"""
        return f"({self.x}, {self.y})"

    def __repr__(self):
        """Developer-friendly: show how to recreate"""
        return f"Point(x={self.x}, y={self.y})"

p = Point(3, 4)

# str() and print() use __str__
print(str(p))    # "(3, 4)"
print(p)         # "(3, 4)"

# repr() uses __repr__
print(repr(p))   # "Point(x=3, y=4)"

# Containers use __repr__ for elements
points = [Point(1, 2), Point(3, 4)]
print(points)  # [Point(x=1, y=2), Point(x=3, y=4)]

# Fallback behavior - only __repr__ defined
class OnlyRepr:
    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return f"OnlyRepr({self.value})"

obj = OnlyRepr(42)
print(str(obj))   # "OnlyRepr(42)" - falls back to __repr__
print(repr(obj))  # "OnlyRepr(42)"

# ML example: Model representation
class LinearModel:
    def __init__(self, input_size, output_size, learning_rate=0.01):
        self.input_size = input_size
        self.output_size = output_size
        self.lr = learning_rate
        self.trained = False

    def __str__(self):
        """User-friendly: model summary"""
        status = "trained" if self.trained else "untrained"
        return f"LinearModel({self.input_size}→{self.output_size}, {status})"

    def __repr__(self):
        """Developer-friendly: full recreation"""
        return (f"LinearModel(input_size={self.input_size}, "
                f"output_size={self.output_size}, learning_rate={self.lr})")

model = LinearModel(128, 10, learning_rate=0.001)
print(f"Training {model}")  # "Training LinearModel(128→10, untrained)"
print(repr(model))  # Full details with all parameters
```

**In Practice**:
In ML code: (1) **Model summaries** - `__str__` for "BERT-base (110M params, trained)", `__repr__` for full config, (2) **Logging** - use repr in debug logs for complete info, str in user-facing output, (3) **Containers** - when storing models in lists/dicts, __repr__ shows in print, (4) **Debugging** - good __repr__ makes interactive debugging easier. Rule of thumb: always implement `__repr__`, implement `__str__` only if you want different user-facing format.

**Key Takeaway**: `__str__` is for user-friendly display (print, str()), `__repr__` is for unambiguous developer representation (repr(), interactive shell, fallback for str); always implement `__repr__`, add `__str__` only if different format needed.

</details>

4. How do descriptors work in Python? What are `__get__`, `__set__`, `__delete__`?

<details>
<summary>Answer: Descriptors are objects defining __get__, __set__, or __delete__; control attribute access; power properties, methods, classmethod, staticmethod</summary>

**Explanation**:
A descriptor is any object that defines one or more of `__get__(self, instance, owner)`, `__set__(self, instance, value)`, or `__delete__(self, instance)`. When accessed as a class attribute, descriptors intercept attribute lookup, assignment, and deletion. They're the mechanism behind `@property`, methods, `@classmethod`, `@staticmethod`, and more.

**Data descriptors** define `__set__` or `__delete__` (and optionally `__get__`). **Non-data descriptors** define only `__get__`. This matters for lookup priority: (1) data descriptors in class dict, (2) instance dict, (3) non-data descriptors in class dict, (4) parent class dict. Data descriptors override instance attributes, non-data descriptors don't.

Descriptors are instantiated at class definition time and shared across all instances. The `instance` parameter in `__get__` tells you which instance is accessing the descriptor (`None` if accessed on class). The `owner` parameter is the class that owns the descriptor.

**Example**:
```python
# Basic descriptor
class Descriptor:
    def __get__(self, instance, owner):
        print(f"__get__ called: instance={instance}, owner={owner}")
        if instance is None:
            return self  # Accessed on class
        return instance.__dict__.get('_value', None)

    def __set__(self, instance, value):
        print(f"__set__ called: instance={instance}, value={value}")
        instance.__dict__['_value'] = value

    def __delete__(self, instance):
        print(f"__delete__ called: instance={instance}")
        del instance.__dict__['_value']

class MyClass:
    attr = Descriptor()  # Descriptor instance at class level

obj = MyClass()

# __set__ is called
obj.attr = 42
# __set__ called: instance=<__main__.MyClass object at 0x...>, value=42

# __get__ is called
print(obj.attr)
# __get__ called: instance=<__main__.MyClass object at 0x...>, owner=<class '__main__.MyClass'>
# 42

# __delete__ is called
del obj.attr
# __delete__ called: instance=<__main__.MyClass object at 0x...>

# Accessed on class (instance=None)
print(MyClass.attr)
# __get__ called: instance=None, owner=<class '__main__.MyClass'>
# <__main__.Descriptor object at 0x...>

# Validation descriptor
class PositiveNumber:
    def __init__(self, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be positive, got {value}")
        instance.__dict__[self.name] = value

class Model:
    learning_rate = PositiveNumber('learning_rate')
    batch_size = PositiveNumber('batch_size')

    def __init__(self, lr, bs):
        self.learning_rate = lr
        self.batch_size = bs

model = Model(0.01, 32)
print(model.learning_rate)  # 0.01

try:
    model.learning_rate = -0.1
except ValueError as e:
    print(e)  # "learning_rate must be positive, got -0.1"

# Type checking descriptor
class TypedAttribute:
    def __init__(self, name, expected_type):
        self.name = name
        self.expected_type = expected_type

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"{self.name} must be {self.expected_type.__name__}, "
                f"got {type(value).__name__}"
            )
        instance.__dict__[self.name] = value

class Person:
    name = TypedAttribute('name', str)
    age = TypedAttribute('age', int)

    def __init__(self, name, age):
        self.name = name
        self.age = age

person = Person("Alice", 30)
try:
    person.age = "thirty"
except TypeError as e:
    print(e)  # "age must be int, got str"

# Data vs non-data descriptors - lookup order
class DataDescriptor:
    def __get__(self, instance, owner):
        return "from data descriptor"

    def __set__(self, instance, value):
        print(f"Data descriptor: setting to {value}")

class NonDataDescriptor:
    def __get__(self, instance, owner):
        return "from non-data descriptor"

class Test:
    data = DataDescriptor()
    non_data = NonDataDescriptor()

obj = Test()

# Data descriptor overrides instance dict
obj.__dict__['data'] = "instance value"
print(obj.data)  # "from data descriptor" - descriptor wins

# Non-data descriptor does NOT override instance dict
obj.__dict__['non_data'] = "instance value"
print(obj.non_data)  # "instance value" - instance dict wins

# Property is a data descriptor
class Temperature:
    def __init__(self, celsius):
        self._celsius = celsius

    @property
    def celsius(self):
        """Property getter"""
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        """Property setter"""
        if value < -273.15:
            raise ValueError("Below absolute zero!")
        self._celsius = value

# Behind the scenes, @property creates a descriptor
# property() is a built-in descriptor class

temp = Temp(25)
print(temp.celsius)  # Calls getter
temp.celsius = 30    # Calls setter

# Methods are non-data descriptors
def example_function(self):
    return f"Called on {self}"

class MyClass:
    method = example_function  # Function stored as class attribute

obj = MyClass()

# When accessed on instance, function.__get__ returns bound method
print(type(MyClass.method))  # <class 'function'>
print(type(obj.method))      # <class 'method'> - bound!

# Function's __get__ binds 'self'
bound = example_function.__get__(obj, MyClass)
print(bound())  # "Called on <__main__.MyClass object at 0x...>"

# classmethod and staticmethod are descriptors
class Example:
    @classmethod
    def class_method(cls):
        return f"Class: {cls}"

    @staticmethod
    def static_method():
        return "Static"

# classmethod descriptor binds 'cls'
print(Example.class_method())      # "Class: <class '__main__.Example'>"
print(Example().class_method())    # Same

# staticmethod descriptor returns function unchanged
print(Example.static_method())     # "Static"
print(Example().static_method())   # Same

# Lazy property using descriptor
class LazyProperty:
    def __init__(self, func):
        self.func = func

    def __get__(self, instance, owner):
        if instance is None:
            return self
        # Compute value once, cache in instance dict
        value = self.func(instance)
        # Replace descriptor with actual value in instance
        setattr(instance, self.func.__name__, value)
        return value

class DataLoader:
    @LazyProperty
    def expensive_data(self):
        print("Loading expensive data...")
        import time
        time.sleep(2)  # Simulate expensive operation
        return [1, 2, 3, 4, 5]

loader = DataLoader()
print("Before access")
print(loader.expensive_data)  # Loads and caches
# "Loading expensive data..."
# [1, 2, 3, 4, 5]

print(loader.expensive_data)  # Returns cached value instantly
# [1, 2, 3, 4, 5] - no loading message

# Real-world: Observable attributes (notify on change)
class Observable:
    def __init__(self, name):
        self.name = name
        self.observers = []

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        old_value = instance.__dict__.get(self.name)
        instance.__dict__[self.name] = value
        # Notify observers of change
        for callback in self.observers:
            callback(instance, self.name, old_value, value)

    def add_observer(self, callback):
        self.observers.append(callback)

class Model:
    loss = Observable('loss')

def on_loss_change(instance, attr, old, new):
    print(f"Loss changed: {old} -> {new}")

Model.loss.add_observer(on_loss_change)

model = Model()
model.loss = 1.5  # "Loss changed: None -> 1.5"
model.loss = 1.2  # "Loss changed: 1.5 -> 1.2"
```

**In Practice**:
In ML frameworks: (1) **PyTorch tensors** - use descriptors for `.grad`, `.data` attributes, (2) **Parameter validation** - ensure learning_rate > 0, batch_size is int, (3) **Lazy loading** - defer expensive computations (dataset loading) until first access, (4) **Type enforcement** - runtime type checking for model configs, (5) **Observable properties** - trigger callbacks on weight updates, loss changes. Understanding descriptors explains how `@property`, methods, and decorators work under the hood.

**Key Takeaway**: Descriptors define `__get__`, `__set__`, `__delete__` to control attribute access; data descriptors (have `__set__`) override instance dict, non-data descriptors don't; they power properties, methods, classmethod, staticmethod.

</details>

5. What is the difference between `__new__` and `__init__`? When would you override `__new__`?

<details>
<summary>Answer: __new__ creates instance (returns object), __init__ initializes it; override __new__ for singletons, immutable types, metaclass-like behavior</summary>

**Explanation**:
`__new__` is a static method that **creates and returns** a new instance of the class (called before `__init__`), while `__init__` **initializes** an already-created instance (called after `__new__`). The process: (1) `__new__` allocates memory and returns object, (2) if `__new__` returns instance of the class, `__init__` is automatically called on it, (3) if `__new__` returns different type, `__init__` is NOT called.

You rarely need to override `__new__`. Use cases: (1) **Singletons** - control instance creation to return same instance, (2) **Subclassing immutable types** (int, str, tuple) - must modify during `__new__` since `__init__` can't change immutable object, (3) **Factory pattern** - return different types based on arguments, (4) **Instance caching/pooling** - reuse existing instances.

`__new__` receives `cls` (the class), not `self` (instance doesn't exist yet). It must call `super().__new__(cls)` to actually create the instance, then can modify before returning. If you override `__new__`, you're responsible for returning an object; if you forget to return, `None` is returned and `__init__` won't be called.

**Example**:
```python
# Basic difference
class Example:
    def __new__(cls, *args, **kwargs):
        print(f"__new__ called with cls={cls}")
        instance = super().__new__(cls)
        print(f"__new__ returning {instance}")
        return instance

    def __init__(self, value):
        print(f"__init__ called with self={self}, value={value}")
        self.value = value

# Creation process
obj = Example(42)
# Output:
# __new__ called with cls=<class '__main__.Example'>
# __new__ returning <__main__.Example object at 0x...>
# __init__ called with self=<__main__.Example object at 0x...>, value=42

# Singleton pattern - always return same instance
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            print("Creating singleton instance")
            cls._instance = super().__new__(cls)
        else:
            print("Returning existing singleton")
        return cls._instance

    def __init__(self):
        print("__init__ called")

# First call - creates instance
s1 = Singleton()
# Creating singleton instance
# __init__ called

# Second call - returns same instance
s2 = Singleton()
# Returning existing singleton
# __init__ called  # Note: __init__ still called!

print(s1 is s2)  # True - same object

# Better singleton - avoid re-initialization
class BetterSingleton:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not BetterSingleton._initialized:
            print("Initializing singleton")
            self.data = []
            BetterSingleton._initialized = True

s1 = BetterSingleton()  # "Initializing singleton"
s2 = BetterSingleton()  # No output - not re-initialized

# Subclassing immutable types - must use __new__
class PositiveInt(int):
    def __new__(cls, value):
        if value < 0:
            raise ValueError("Must be positive")
        # int is immutable - can't change in __init__
        return super().__new__(cls, abs(value))

    def __init__(self, value):
        # Too late to modify value here - object already created
        print(f"Initialized PositiveInt with {value}")

num = PositiveInt(-5)  # Value changed to 5 in __new__
print(num)  # 5

# __new__ returning different type
class FlexibleFactory:
    def __new__(cls, value):
        if isinstance(value, int):
            return int(value)  # Return int, not FlexibleFactory
        elif isinstance(value, str):
            return str(value)  # Return str
        else:
            return super().__new__(cls)  # Return FlexibleFactory instance

    def __init__(self, value):
        # Only called if __new__ returned FlexibleFactory instance
        print(f"FlexibleFactory.__init__ called with {value}")
        self.value = value

f1 = FlexibleFactory(42)        # Returns int - __init__ NOT called
print(type(f1))  # <class 'int'>

f2 = FlexibleFactory("hello")   # Returns str - __init__ NOT called
print(type(f2))  # <class 'str'>

f3 = FlexibleFactory([1, 2])    # Returns FlexibleFactory - __init__ IS called
print(type(f3))  # <class '__main__.FlexibleFactory'>

# Instance pooling/caching
class CachedModel:
    _cache = {}

    def __new__(cls, model_name):
        if model_name not in cls._cache:
            print(f"Loading model: {model_name}")
            instance = super().__new__(cls)
            cls._cache[model_name] = instance
        else:
            print(f"Returning cached model: {model_name}")
        return cls._cache[model_name]

    def __init__(self, model_name):
        # Be careful - __init__ called every time!
        if not hasattr(self, 'name'):
            self.name = model_name
            self.weights = [0.1] * 100  # Expensive initialization

m1 = CachedModel("bert")     # "Loading model: bert"
m2 = CachedModel("bert")     # "Returning cached model: bert"
print(m1 is m2)  # True

# Forgetting to return from __new__
class Broken:
    def __new__(cls):
        instance = super().__new__(cls)
        # Forgot to return!

    def __init__(self):
        print("This won't be called!")
        self.value = 42

obj = Broken()
print(obj)  # None - __new__ returned None implicitly

# Passing arguments through __new__ to __init__
class Example:
    def __new__(cls, *args, **kwargs):
        print(f"__new__: args={args}, kwargs={kwargs}")
        return super().__new__(cls)

    def __init__(self, x, y):
        print(f"__init__: x={x}, y={y}")
        self.x = x
        self.y = y

obj = Example(1, 2)
# __new__: args=(1, 2), kwargs={}
# __init__: x=1, y=2

# Real-world: Flyweight pattern for memory efficiency
class Color:
    _instances = {}

    def __new__(cls, r, g, b):
        # Cache colors to save memory
        key = (r, g, b)
        if key not in cls._instances:
            instance = super().__new__(cls)
            instance.r = r
            instance.g = g
            instance.b = b
            cls._instances[key] = instance
        return cls._instances[key]

    def __repr__(self):
        return f"Color({self.r}, {self.g}, {self.b})"

# Same color reuses instance
c1 = Color(255, 0, 0)
c2 = Color(255, 0, 0)
print(c1 is c2)  # True - same object
print(f"Cached {len(Color._instances)} colors")  # 1

# ML example: Model registry
class RegisteredModel:
    _registry = {}

    def __new__(cls, name):
        if name in cls._registry:
            raise ValueError(f"Model {name} already registered")

        instance = super().__new__(cls)
        cls._registry[name] = instance
        return instance

    def __init__(self, name):
        self.name = name

    @classmethod
    def get(cls, name):
        return cls._registry.get(name)

model1 = RegisteredModel("resnet50")
model2 = RegisteredModel.get("resnet50")
print(model1 is model2)  # True

# Subclassing tuple with custom __new__
class Point(tuple):
    def __new__(cls, x, y):
        # tuple is immutable - must set values in __new__
        return super().__new__(cls, (x, y))

    def __init__(self, x, y):
        # Can add mutable attributes in __init__
        self.label = None

    @property
    def x(self):
        return self[0]

    @property
    def y(self):
        return self[1]

p = Point(3, 4)
print(p)  # (3, 4)
print(p.x, p.y)  # 3 4
p.label = "origin"  # Can still add mutable attributes
# p[0] = 5  # TypeError - tuple is immutable
```

**In Practice**:
In ML frameworks: (1) **Singleton configs** - global settings, logger, device manager, (2) **Model caching** - reuse loaded models by name to save memory, (3) **Tensor pooling** - cache common tensor shapes to avoid allocation overhead, (4) **Custom dtypes** - subclass numpy/torch types with validation in `__new__`, (5) **Model registries** - prevent duplicate registrations, track all models. Use `__new__` sparingly - most cases are better served by factory functions, metaclasses, or design patterns.

**Key Takeaway**: `__new__` creates instance (returns object), `__init__` initializes it; override `__new__` for singletons, immutable type subclasses, instance caching, or factory patterns; rarely needed in normal code.

</details>

6. How does `super()` work in multiple inheritance? What's the difference between `super()` and calling parent directly?

<details>
<summary>Answer: super() follows MRO for cooperative inheritance; direct parent call breaks chain; super() enables mixins and ensures all parents initialized</summary>

**Explanation**:
`super()` doesn't call the "parent class" - it calls the **next class in the MRO** (Method Resolution Order). In single inheritance this happens to be the parent, but in multiple inheritance it can be a sibling or other ancestor. This enables **cooperative multiple inheritance** where all classes in the hierarchy get their methods called.

Calling parent directly (`ParentClass.method(self)`) breaks the MRO chain - you're explicitly choosing which class to call, bypassing Python's resolution order. This causes problems in diamond inheritance: parent classes might be called multiple times or not at all. Always use `super()` in classes designed for inheritance.

`super()` in Python 3 is `super()` (no arguments needed), Python 2 required `super(ClassName, self)`. The no-argument form automatically infers the class and instance from the calling context. `super()` returns a proxy object that delegates method calls to the next class in MRO.

**Example**:
```python
# Single inheritance - super() calls parent
class Parent:
    def method(self):
        print("Parent.method")

class Child(Parent):
    def method(self):
        print("Child.method")
        super().method()  # Calls Parent.method

obj = Child()
obj.method()
# Child.method
# Parent.method

# Direct call - same result in single inheritance
class ChildDirect(Parent):
    def method(self):
        print("ChildDirect.method")
        Parent.method(self)  # Direct call to Parent

obj = ChildDirect()
obj.method()
# ChildDirect.method
# Parent.method

# Multiple inheritance - super() follows MRO
class A:
    def method(self):
        print("A.method")

class B(A):
    def method(self):
        print("B.method")
        super().method()  # Calls next in MRO

class C(A):
    def method(self):
        print("C.method")
        super().method()  # Calls next in MRO

class D(B, C):
    def method(self):
        print("D.method")
        super().method()  # Calls next in MRO

# MRO: D -> B -> C -> A
print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)

obj = D()
obj.method()
# D.method
# B.method
# C.method  # C is called! Not A directly from B
# A.method

# Direct call breaks the chain
class BrokenB(A):
    def method(self):
        print("BrokenB.method")
        A.method(self)  # Direct call to A

class BrokenC(A):
    def method(self):
        print("BrokenC.method")
        A.method(self)  # Direct call to A

class BrokenD(BrokenB, BrokenC):
    def method(self):
        print("BrokenD.method")
        BrokenB.method(self)  # Direct call

obj = BrokenD()
obj.method()
# BrokenD.method
# BrokenB.method
# A.method
# (BrokenC.method never called - broken!)

# __init__ with super() - cooperative inheritance
class Base:
    def __init__(self):
        print("Base.__init__")
        super().__init__()  # Important! Continues MRO chain

class Mixin1(Base):
    def __init__(self, **kwargs):
        print("Mixin1.__init__")
        super().__init__(**kwargs)  # Pass along kwargs

class Mixin2(Base):
    def __init__(self, **kwargs):
        print("Mixin2.__init__")
        super().__init__(**kwargs)

class Child(Mixin1, Mixin2):
    def __init__(self, **kwargs):
        print("Child.__init__")
        super().__init__(**kwargs)

# MRO: Child -> Mixin1 -> Mixin2 -> Base -> object
obj = Child()
# Child.__init__
# Mixin1.__init__
# Mixin2.__init__
# Base.__init__

# All classes initialized! Cooperative inheritance works.

# Without super() in Base - chain breaks
class BadBase:
    def __init__(self):
        print("BadBase.__init__")
        # No super().__init__() - stops here

class BadMixin(BadBase):
    def __init__(self):
        print("BadMixin.__init__")
        super().__init__()

class BadChild(BadMixin):
    def __init__(self):
        print("BadChild.__init__")
        super().__init__()

obj = BadChild()
# BadChild.__init__
# BadMixin.__init__
# BadBase.__init__
# (Works but only by luck - if object.__init__ needed args, would break)

# Passing arguments through super()
class Animal:
    def __init__(self, name):
        print(f"Animal.__init__: {name}")
        self.name = name
        super().__init__()

class Flyer:
    def __init__(self, wingspan):
        print(f"Flyer.__init__: {wingspan}")
        self.wingspan = wingspan
        super().__init__()

class Bird(Animal, Flyer):
    def __init__(self, name, wingspan, species):
        print(f"Bird.__init__")
        self.species = species
        # How to pass name to Animal and wingspan to Flyer?
        # Use **kwargs pattern
        super().__init__(name, wingspan)

# Problem: Animal expects 'name', Flyer expects 'wingspan'
# Solution: Use **kwargs everywhere

class FlexAnimal:
    def __init__(self, name, **kwargs):
        print(f"FlexAnimal: {name}")
        self.name = name
        super().__init__(**kwargs)

class FlexFlyer:
    def __init__(self, wingspan, **kwargs):
        print(f"FlexFlyer: {wingspan}")
        self.wingspan = wingspan
        super().__init__(**kwargs)

class FlexBird(FlexAnimal, FlexFlyer):
    def __init__(self, name, wingspan, species, **kwargs):
        print(f"FlexBird: {species}")
        self.species = species
        super().__init__(name=name, wingspan=wingspan, **kwargs)

bird = FlexBird(name="Eagle", wingspan=2.3, species="Aquila")
# FlexBird: Aquila
# FlexAnimal: Eagle
# FlexFlyer: 2.3

# super() with different methods
class A:
    def __init__(self):
        self.a = 1
        super().__init__()

    def compute(self):
        return 10

class B(A):
    def __init__(self):
        super().__init__()
        self.b = 2

    def compute(self):
        # Call parent's compute and add to it
        parent_result = super().compute()
        return parent_result + 20

obj = B()
print(obj.compute())  # 30

# Real-world: ML mixins
class LoggingMixin:
    def __init__(self, **kwargs):
        print("LoggingMixin.__init__")
        super().__init__(**kwargs)

    def log(self, msg):
        print(f"[{self.__class__.__name__}] {msg}")

class SerializableMixin:
    def __init__(self, **kwargs):
        print("SerializableMixin.__init__")
        super().__init__(**kwargs)

    def to_dict(self):
        return self.__dict__.copy()

class BaseModel:
    def __init__(self, name, **kwargs):
        print(f"BaseModel.__init__: {name}")
        self.name = name
        super().__init__(**kwargs)

class MyModel(LoggingMixin, SerializableMixin, BaseModel):
    def __init__(self, name, version, **kwargs):
        print(f"MyModel.__init__")
        self.version = version
        super().__init__(name=name, **kwargs)

model = MyModel(name="BERT", version="1.0")
# MyModel.__init__
# LoggingMixin.__init__
# SerializableMixin.__init__
# BaseModel.__init__: BERT

model.log("Training started")  # From LoggingMixin
print(model.to_dict())          # From SerializableMixin

# super() with explicit class (Python 2 style, works in Python 3)
class Example:
    def method(self):
        print("Example.method")

class Child(Example):
    def method(self):
        print("Child.method")
        super(Child, self).method()  # Explicit form
        super().method()              # Implicit form (same result)

# super() on class itself (unbound)
class A:
    def method(self):
        return "A"

class B(A):
    def method(self):
        return "B"

# Get super of B
super_b = super(B, B())
print(super_b.method())  # "A" - calls next in MRO

# Diamond problem resolution with super()
class Base:
    def __init__(self):
        print(f"Base.__init__ (id: {id(self)})")
        self.init_count = getattr(self, 'init_count', 0) + 1

class Left(Base):
    def __init__(self):
        print("Left.__init__")
        super().__init__()  # Important: uses super()

class Right(Base):
    def __init__(self):
        print("Right.__init__")
        super().__init__()  # Important: uses super()

class Child(Left, Right):
    def __init__(self):
        print("Child.__init__")
        super().__init__()

obj = Child()
# Child.__init__
# Left.__init__
# Right.__init__
# Base.__init__ (id: ...)  # Base called ONCE

print(obj.init_count)  # 1 - Base initialized once

# Without super() - Base called twice
class BadLeft(Base):
    def __init__(self):
        print("BadLeft.__init__")
        Base.__init__(self)  # Direct call

class BadRight(Base):
    def __init__(self):
        print("BadRight.__init__")
        Base.__init__(self)  # Direct call

class BadChild(BadLeft, BadRight):
    def __init__(self):
        print("BadChild.__init__")
        BadLeft.__init__(self)
        BadRight.__init__(self)

obj = BadChild()
# BadChild.__init__
# BadLeft.__init__
# Base.__init__ (id: ...)  # Called first time
# BadRight.__init__
# Base.__init__ (id: ...)  # Called AGAIN - wrong!

print(obj.init_count)  # 2 - Base initialized twice!
```

**In Practice**:
In ML frameworks: (1) **PyTorch nn.Module** - always use `super().__init__()` in custom layers to initialize parent properly, (2) **Mixin patterns** - add logging, timing, checkpointing to models via mixins with `super()`, (3) **Complex hierarchies** - vision transformers with multiple parent classes need cooperative inheritance, (4) **Custom datasets** - extend PyTorch Dataset with mixins for caching, augmentation. Rule: **always use `super()`** in classes meant for inheritance, especially in libraries where users will subclass.

**Key Takeaway**: `super()` follows MRO for cooperative inheritance, calling next class in resolution order; direct parent calls break chain in multiple inheritance; always use `super()` for classes designed to be inherited.

</details>

**Production Scenarios**:
1. How do you design extensible ML model classes that others can inherit from?

<details>
<summary>Answer: Use abstract base classes, define hooks, provide sensible defaults, document extension points, use composition over inheritance where possible</summary>

**Explanation**:
Extensible ML model classes need clear contracts (what subclasses must implement), documented extension points (what can be overridden), sensible defaults (works out-of-box), and composition support (mix features via mixins). Use ABC (Abstract Base Class) to enforce interface, template method pattern for customization points, and avoid deep inheritance hierarchies.

Key principles: (1) **Minimal required interface** - subclasses implement only what's unique, (2) **Hooks for customization** - `_before_train()`, `_after_predict()` hooks, (3) **Configurable via kwargs** - accept `**kwargs` for forward compatibility, (4) **Document everything** - which methods to override, which to call with `super()`, (5) **Provide examples** - show common extension patterns in docstrings.

**Example**:
```python
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import json

class BaseModel(ABC):
    """
    Abstract base for all models.

    To create a custom model:
    1. Inherit from BaseModel
    2. Implement: fit(), predict()
    3. Optionally override: _validate_input(), _before_fit(), _after_fit()

    Example:
        class MyModel(BaseModel):
            def fit(self, X, y):
                self._before_fit(X, y)
                # Your training logic
                self._after_fit()
                return self

            def predict(self, X):
                self._validate_input(X)
                # Your prediction logic
                return predictions
    """

    def __init__(self, name: Optional[str] = None, **kwargs):
        """
        Args:
            name: Model name for logging
            **kwargs: Future extensibility
        """
        self.name = name or self.__class__.__name__
        self.is_fitted = False
        self.metadata = {}

        # Allow subclasses to add attributes without breaking compatibility
        for key, value in kwargs.items():
            if not hasattr(self, key):
                setattr(self, key, value)

    @abstractmethod
    def fit(self, X, y):
        """Train model. Must be implemented by subclass."""
        pass

    @abstractmethod
    def predict(self, X):
        """Make predictions. Must be implemented by subclass."""
        pass

    # Extension points (hooks)
    def _before_fit(self, X, y):
        """Hook called before training. Override for custom pre-processing."""
        self._validate_input(X)
        self.metadata['training_samples'] = len(X)

    def _after_fit(self):
        """Hook called after training. Override for custom post-processing."""
        self.is_fitted = True

    def _validate_input(self, X):
        """Hook for input validation. Override for custom checks."""
        if not hasattr(X, '__len__'):
            raise ValueError("X must be array-like")

    # Utility methods (inherited by all models)
    def save(self, path: str):
        """Save model. Can be overridden for custom serialization."""
        import pickle
        with open(path, 'wb') as f:
            pickle.dump(self, f)

    @classmethod
    def load(cls, path: str):
        """Load model. Can be overridden for custom deserialization."""
        import pickle
        with open(path, 'rb') as f:
            return pickle.load(f)

    def __repr__(self):
        status = "fitted" if self.is_fitted else "unfitted"
        return f"{self.name}({status})"


# Concrete implementation
class LinearRegression(BaseModel):
    """Linear regression with customizable loss function."""

    def __init__(self, learning_rate: float = 0.01, epochs: int = 100, **kwargs):
        super().__init__(**kwargs)
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.weights = None
        self.loss_history = []

    def fit(self, X, y):
        """Train linear regression."""
        self._before_fit(X, y)

        # Training logic
        import numpy as np
        X = np.array(X)
        y = np.array(y)

        self.weights = np.zeros(X.shape[1])
        for epoch in range(self.epochs):
            predictions = X @ self.weights
            error = predictions - y
            gradient = X.T @ error / len(X)

            self.weights -= self.learning_rate * gradient

            loss = self._compute_loss(error)
            self.loss_history.append(loss)

        self._after_fit()
        return self

    def predict(self, X):
        """Make predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model not fitted yet!")

        self._validate_input(X)

        import numpy as np
        X = np.array(X)
        return X @ self.weights

    # Extension point for custom loss
    def _compute_loss(self, error):
        """Override for custom loss function."""
        return (error ** 2).mean()


# Extended model with custom hooks
class RobustLinearRegression(LinearRegression):
    """Linear regression with outlier detection."""

    def __init__(self, outlier_threshold: float = 3.0, **kwargs):
        super().__init__(**kwargs)
        self.outlier_threshold = outlier_threshold
        self.outlier_indices = []

    def _before_fit(self, X, y):
        """Custom pre-processing: detect outliers."""
        super()._before_fit(X, y)  # Call parent hook

        # Detect outliers
        import numpy as np
        y = np.array(y)
        mean, std = y.mean(), y.std()
        z_scores = np.abs((y - mean) / std)
        self.outlier_indices = np.where(z_scores > self.outlier_threshold)[0]

        if len(self.outlier_indices) > 0:
            print(f"Detected {len(self.outlier_indices)} outliers")

    def _compute_loss(self, error):
        """Custom loss: ignore outliers."""
        import numpy as np
        mask = np.ones(len(error), dtype=bool)
        mask[self.outlier_indices] = False
        return (error[mask] ** 2).mean()


# Mixin pattern for reusable features
class LoggingMixin:
    """Add logging to any model."""

    def _before_fit(self, X, y):
        super()._before_fit(X, y)
        print(f"[{self.name}] Starting training with {len(X)} samples")

    def _after_fit(self):
        super()._after_fit()
        print(f"[{self.name}] Training completed")


class LoggedLinearRegression(LoggingMixin, LinearRegression):
    """Linear regression with automatic logging."""
    pass


# Test extensibility
model = LoggedLinearRegression(name="MyLR", learning_rate=0.05)
X = [[1, 2], [2, 3], [3, 4], [4, 5]]
y = [3, 5, 7, 9]

model.fit(X, y)
# [MyLR] Starting training with 4 samples
# [MyLR] Training completed

predictions = model.predict([[5, 6]])
print(predictions)  # ~11


# Provide configuration schema
class ConfigurableModel(BaseModel):
    """Model with structured configuration."""

    DEFAULT_CONFIG = {
        'learning_rate': 0.01,
        'batch_size': 32,
        'epochs': 100,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None, **kwargs):
        super().__init__(**kwargs)

        # Merge provided config with defaults
        self.config = {**self.DEFAULT_CONFIG}
        if config:
            self.config.update(config)

        # Allow override via kwargs
        for key in self.DEFAULT_CONFIG:
            if key in kwargs:
                self.config[key] = kwargs[key]

    def get_config(self) -> Dict[str, Any]:
        """Return current configuration."""
        return self.config.copy()

    @classmethod
    def from_config(cls, config: Dict[str, Any]):
        """Create model from config dict."""
        return cls(config=config)


# Document extension patterns clearly
class WellDocumentedModel(BaseModel):
    """
    Model with clear extension documentation.

    Extension Points:
        _preprocess_features(X): Override for custom feature engineering
        _postprocess_predictions(y): Override for prediction post-processing
        _compute_metrics(y_true, y_pred): Override for custom metrics

    Example Extensions:
        # Add feature scaling:
        class ScaledModel(WellDocumentedModel):
            def _preprocess_features(self, X):
                X = super()._preprocess_features(X)
                return (X - X.mean()) / X.std()

        # Add custom metrics:
        class MetricModel(WellDocumentedModel):
            def _compute_metrics(self, y_true, y_pred):
                metrics = super()._compute_metrics(y_true, y_pred)
                metrics['custom_score'] = my_score(y_true, y_pred)
                return metrics
    """

    def _preprocess_features(self, X):
        """Override for custom feature engineering."""
        return X

    def _postprocess_predictions(self, y):
        """Override for prediction post-processing."""
        return y

    def _compute_metrics(self, y_true, y_pred):
        """Override for custom metrics."""
        return {'accuracy': (y_true == y_pred).mean()}
```

**In Practice**:
Real-world extensible designs: (1) **PyTorch nn.Module** - minimal interface (`forward()`), hooks (`register_forward_hook`), composition (Sequential, ModuleList), (2) **sklearn BaseEstimator** - standard interface (`fit`, `predict`), mixin classes (ClassifierMixin, RegressorMixin), grid search integration, (3) **Hugging Face PreTrainedModel** - config-driven, hooks for custom behavior, clear documentation. Design checklist: ABC for contracts, hooks for customization, kwargs for extensibility, mixins for features, comprehensive docs with examples, avoid deep inheritance (prefer composition).

**Key Takeaway**: Design extensible ML classes with abstract base classes defining minimal interface, hooks for customization points, sensible defaults, configuration via kwargs, clear documentation of extension patterns, and composition over deep inheritance.

</details>

2. What are the trade-offs of using classes vs functions for ML pipelines?

<details>
<summary>Answer: Classes for stateful pipelines (fit/transform), composability, sklearn integration; functions for stateless transforms, simpler logic, functional composition</summary>

**Explanation**:
**Classes** excel when: (1) pipeline has **state** (learned parameters from training data), (2) need **sklearn compatibility** (fit/transform interface), (3) building **composable pipelines** (chain transformers), (4) **configuration** is complex (many hyperparameters). **Functions** excel when: (1) transformation is **stateless** (no learning), (2) logic is **simple** (one-off processing), (3) want **functional composition** (map/filter/reduce style), (4) **performance critical** (less overhead).

Trade-offs: Classes add overhead (object creation, method dispatch) but provide structure, state management, and ecosystem integration. Functions are lightweight and composable but don't integrate with sklearn pipelines and can't maintain learned state. In practice: use classes for transformers that learn from data (scalers, encoders), functions for pure transformations (data cleaning, feature engineering).

**Example**:
```python
# Classes - stateful transformers
from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np

class MinMaxScaler(BaseEstimator, TransformerMixin):
    """Class-based scaler - learns min/max from training data."""

    def __init__(self, feature_range=(0, 1)):
        self.feature_range = feature_range
        self.min_ = None
        self.max_ = None

    def fit(self, X, y=None):
        """Learn min/max from data - STATE is stored."""
        X = np.array(X)
        self.min_ = X.min(axis=0)
        self.max_ = X.max(axis=0)
        return self

    def transform(self, X):
        """Transform using learned state."""
        if self.min_ is None:
            raise ValueError("Scaler not fitted!")

        X = np.array(X)
        X_scaled = (X - self.min_) / (self.max_ - self.min_)
        return X_scaled

    def fit_transform(self, X, y=None):
        """Convenience method."""
        return self.fit(X, y).transform(X)

# Use class-based approach
scaler = MinMaxScaler()
X_train = [[1, 100], [2, 200], [3, 300]]
X_test = [[1.5, 150]]

# Fit on training data
scaler.fit(X_train)
print(f"Learned min: {scaler.min_}, max: {scaler.max_}")

# Transform using learned parameters
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Benefits: State persists, can reuse on new data
print(X_test_scaled)


# Functions - stateless transformers
def remove_outliers(X, threshold=3.0):
    """Function-based filter - no state, pure transformation."""
    X = np.array(X)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    z_scores = np.abs((X - mean) / std)
    mask = (z_scores < threshold).all(axis=1)
    return X[mask]

def log_transform(X):
    """Pure function - deterministic, no state."""
    return np.log1p(np.array(X))

def add_polynomial_features(X, degree=2):
    """Stateless feature engineering."""
    X = np.array(X)
    features = [X]
    for d in range(2, degree + 1):
        features.append(X ** d)
    return np.hstack(features)

# Use function-based approach
X = [[1, 2], [100, 200], [3, 4]]  # Middle value is outlier
X_clean = remove_outliers(X, threshold=2.0)
X_log = log_transform(X_clean)
X_poly = add_polynomial_features(X_log, degree=2)

# Benefits: Simple, composable, no overhead
print(X_poly.shape)


# Comparison: Class vs Function for same task
# Function version - stateless, needs parameters each time
def normalize_func(X, min_val, max_val):
    """Need to pass min/max every time."""
    return (X - min_val) / (max_val - min_val)

# Must store and pass parameters manually
min_val = X_train.min(axis=0)
max_val = X_train.max(axis=0)

X_train_norm = normalize_func(X_train, min_val, max_val)
X_test_norm = normalize_func(X_test, min_val, max_val)  # Easy to forget or misuse

# Class version - stateful, parameters encapsulated
scaler = MinMaxScaler()
scaler.fit(X_train)  # Learn once
X_train_norm = scaler.transform(X_train)
X_test_norm = scaler.transform(X_test)  # Automatic consistency


# sklearn Pipeline integration - classes only
from sklearn.pipeline import Pipeline

# Classes work seamlessly
pipeline_class = Pipeline([
    ('scaler', MinMaxScaler()),
    ('poly', PolynomialFeatures(degree=2)),  # sklearn class
])

pipeline_class.fit(X_train)
X_transformed = pipeline_class.transform(X_test)

# Functions don't integrate directly - need wrapper
from sklearn.preprocessing import FunctionTransformer

pipeline_func = Pipeline([
    ('outliers', FunctionTransformer(remove_outliers)),
    ('log', FunctionTransformer(log_transform)),
])

# Works but less elegant


# Performance comparison
import time

# Class overhead
class HeavyTransformer:
    def __init__(self):
        self.state = {}

    def fit(self, X):
        return self

    def transform(self, X):
        return X * 2

# Function - minimal overhead
def heavy_func(X):
    return X * 2

X_large = np.random.rand(10000, 100)

# Class timing
transformer = HeavyTransformer()
start = time.time()
for _ in range(1000):
    transformer.transform(X_large)
class_time = time.time() - start

# Function timing
start = time.time()
for _ in range(1000):
    heavy_func(X_large)
func_time = time.time() - start

print(f"Class: {class_time:.3f}s, Function: {func_time:.3f}s")
# Function typically 10-20% faster due to less overhead


# Hybrid approach - use both strategically
class AdvancedPipeline:
    """Class for stateful parts, delegates to functions for stateless."""

    def __init__(self):
        self.scaler = MinMaxScaler()  # Class for state
        self.is_fitted = False

    def fit(self, X):
        """Fit stateful components only."""
        self.scaler.fit(X)
        self.is_fitted = True
        return self

    def transform(self, X):
        """Combine stateful and stateless."""
        if not self.is_fitted:
            raise ValueError("Not fitted!")

        # Stateless functions
        X = remove_outliers(X)
        X = log_transform(X)

        # Stateful transformation
        X = self.scaler.transform(X)

        # More stateless functions
        X = add_polynomial_features(X)

        return X


# When to use what
# Use CLASSES for:
# 1. Learned transformations (scalers, encoders)
class StandardScaler:
    def __init__(self):
        self.mean_ = None
        self.std_ = None

    def fit(self, X):
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        return self

    def transform(self, X):
        return (X - self.mean_) / self.std_


# 2. Complex state management
class TextVectorizer:
    def __init__(self, max_features=1000):
        self.max_features = max_features
        self.vocabulary_ = {}
        self.idf_ = None

    def fit(self, texts):
        # Learn vocabulary and IDF weights
        self._build_vocabulary(texts)
        self._compute_idf(texts)
        return self


# 3. sklearn Pipeline compatibility
class CustomFeatureExtractor(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # Extract features
        return features


# Use FUNCTIONS for:
# 1. Pure transformations
def drop_missing(df):
    return df.dropna()

def cap_outliers(X, lower=0.01, upper=0.99):
    q_low, q_high = np.quantile(X, [lower, upper])
    return np.clip(X, q_low, q_high)


# 2. Functional composition
from functools import reduce

transformations = [
    lambda X: X ** 2,
    lambda X: X - X.mean(),
    lambda X: X / X.std(),
]

X = np.random.rand(100, 10)
X_transformed = reduce(lambda data, func: func(data), transformations, X)


# 3. One-off processing
def preprocess_for_experiment(df):
    """Quick preprocessing for exploratory analysis."""
    df = df.drop(columns=['id', 'timestamp'])
    df = df.fillna(0)
    df['feature'] = np.log(df['value'] + 1)
    return df


# Best practice: Combine both
class DataPipeline:
    """
    Use classes for interface and state, functions for logic.
    """

    def __init__(self):
        self.scalers = {}  # State stored here

    def fit(self, X):
        # Stateful parts as class attributes
        for i in range(X.shape[1]):
            self.scalers[i] = self._fit_scaler(X[:, i])
        return self

    def transform(self, X):
        # Stateful transformation
        X_scaled = self._apply_scalers(X)

        # Stateless transformations as functions
        X_clean = self._remove_outliers(X_scaled)
        X_features = self._engineer_features(X_clean)

        return X_features

    def _fit_scaler(self, x):
        """Internal stateful logic."""
        return {'min': x.min(), 'max': x.max()}

    def _apply_scalers(self, X):
        """Apply learned scalers."""
        X_scaled = X.copy()
        for i, scaler in self.scalers.items():
            X_scaled[:, i] = (X[:, i] - scaler['min']) / (scaler['max'] - scaler['min'])
        return X_scaled

    # Stateless helpers as methods (could be functions)
    def _remove_outliers(self, X):
        return remove_outliers(X)

    def _engineer_features(self, X):
        return add_polynomial_features(X)
```

**In Practice**:
Real-world patterns: (1) **Production pipelines** - use classes (sklearn Pipeline) for reproducibility and state management, (2) **Exploratory analysis** - use functions for quick iterations and notebooks, (3) **Feature engineering** - classes for learned features (target encoding), functions for derived features (ratios, logs), (4) **Model training** - classes for model state, functions for loss computation and metrics. Modern trend: functional programming gaining popularity (JAX, functorch) but classes still dominant for sklearn-compatible pipelines.

**Key Takeaway**: Use classes for stateful transformations (learn from data), sklearn pipeline integration, complex configurations; use functions for stateless operations, simple logic, functional composition; hybrid approach combines both strengths.

</details>

3. How do you implement the sklearn transformer interface (`fit`, `transform`, `fit_transform`)?

<details>
<summary>Answer: Inherit from BaseEstimator and TransformerMixin; implement fit() and transform(); get fit_transform(), get_params(), set_params() for free</summary>

**Explanation**:
The sklearn transformer interface requires: (1) `fit(X, y=None)` that learns from data and returns `self`, (2) `transform(X)` that transforms data using learned parameters, (3) optionally `fit_transform(X, y=None)` for efficiency. Inherit from `BaseEstimator` (provides `get_params`, `set_params` for grid search) and `TransformerMixin` (provides default `fit_transform` implementation).

Key conventions: (1) **Store learned parameters** with trailing underscore (`mean_`, `vocabulary_`), (2) **Return self from fit** for method chaining, (3) **Don't modify X in-place** - return transformed copy, (4) **Accept y parameter** even if unused (for pipeline compatibility), (5) **Validate input** in fit and transform, (6) **Initialize all attributes in __init__** for cloning to work.

**Example**:
```python
from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np

# Complete sklearn-compatible transformer
class CustomScaler(BaseEstimator, TransformerMixin):
    """
    Custom scaler following sklearn conventions.

    Parameters
    ----------
    method : str, default='standard'
        Scaling method: 'standard', 'minmax', or 'robust'

    Attributes
    ----------
    scale_ : ndarray of shape (n_features,)
        Learned scale values (trailing underscore indicates learned)
    center_ : ndarray of shape (n_features,)
        Learned center values
    """

    def __init__(self, method='standard'):
        # Initialize all parameters - no computation here
        self.method = method

    def fit(self, X, y=None):
        """
        Learn scaling parameters from X.

        Parameters
        ----------
        X : array-like of shape (n_samples, n_features)
            Training data
        y : array-like, default=None
            Ignored, present for sklearn compatibility

        Returns
        -------
        self : CustomScaler
            Fitted transformer
        """
        # Validate input
        X = self._validate_data(X, reset=True)

        # Learn parameters (stored with trailing underscore)
        if self.method == 'standard':
            self.center_ = X.mean(axis=0)
            self.scale_ = X.std(axis=0)
        elif self.method == 'minmax':
            self.center_ = X.min(axis=0)
            self.scale_ = X.max(axis=0) - X.min(axis=0)
        elif self.method == 'robust':
            self.center_ = np.median(X, axis=0)
            q75, q25 = np.percentile(X, [75, 25], axis=0)
            self.scale_ = q75 - q25
        else:
            raise ValueError(f"Unknown method: {self.method}")

        # Avoid division by zero
        self.scale_[self.scale_ == 0] = 1.0

        # Always return self for method chaining
        return self

    def transform(self, X):
        """
        Transform X using learned parameters.

        Parameters
        ----------
        X : array-like of shape (n_samples, n_features)
            Data to transform

        Returns
        -------
        X_transformed : ndarray of shape (n_samples, n_features)
            Transformed data
        """
        # Check is fitted (has learned parameters)
        from sklearn.utils.validation import check_is_fitted
        check_is_fitted(self, ['center_', 'scale_'])

        # Validate input
        X = self._validate_data(X, reset=False)

        # Transform (don't modify X in-place)
        X_transformed = (X - self.center_) / self.scale_

        return X_transformed

    # fit_transform() inherited from TransformerMixin
    # get_params() and set_params() inherited from BaseEstimator

    def _validate_data(self, X, reset=False):
        """Validate input data."""
        X = np.asarray(X)

        if reset:
            self.n_features_in_ = X.shape[1]
        else:
            if X.shape[1] != self.n_features_in_:
                raise ValueError(
                    f"X has {X.shape[1]} features, "
                    f"but fitted with {self.n_features_in_} features"
                )

        return X


# Usage
X_train = [[1, 100], [2, 200], [3, 300], [4, 400]]
X_test = [[2.5, 250]]

# Fit and transform
scaler = CustomScaler(method='standard')
scaler.fit(X_train)
X_train_scaled = scaler.transform(X_train)

# Or use fit_transform (inherited from TransformerMixin)
X_train_scaled = scaler.fit_transform(X_train)

# Transform test data
X_test_scaled = scaler.transform(X_test)

# Grid search compatibility (from BaseEstimator)
print(scaler.get_params())  # {'method': 'standard'}
scaler.set_params(method='minmax')


# Pipeline integration
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression

pipeline = Pipeline([
    ('scaler', CustomScaler(method='robust')),
    ('model', LinearRegression())
])

pipeline.fit(X_train, [5, 7, 9, 11])
predictions = pipeline.predict(X_test)


# Advanced: Stateless transformer (no fit needed)
class StatelessTransformer(BaseEstimator, TransformerMixin):
    """Transformer that doesn't learn - pure function."""

    def __init__(self, power=2):
        self.power = power

    def fit(self, X, y=None):
        # No learning needed, but must return self
        return self

    def transform(self, X):
        # Stateless transformation
        X = np.asarray(X)
        return X ** self.power


# Usage - fit does nothing but still required for pipeline
transformer = StatelessTransformer(power=3)
transformer.fit(X_train)  # No-op
X_cubed = transformer.transform(X_train)


# Complex example: Text vectorizer
class SimpleVectorizer(BaseEstimator, TransformerMixin):
    """Convert text to count vectors."""

    def __init__(self, max_features=100):
        self.max_features = max_features

    def fit(self, X, y=None):
        """Learn vocabulary from training text."""
        # X is list of strings
        from collections import Counter

        word_counts = Counter()
        for text in X:
            words = text.lower().split()
            word_counts.update(words)

        # Keep top max_features words
        most_common = word_counts.most_common(self.max_features)
        self.vocabulary_ = {word: idx for idx, (word, _) in enumerate(most_common)}

        return self

    def transform(self, X):
        """Convert text to count vectors."""
        check_is_fitted(self, 'vocabulary_')

        vectors = np.zeros((len(X), len(self.vocabulary_)))

        for i, text in enumerate(X):
            words = text.lower().split()
            for word in words:
                if word in self.vocabulary_:
                    idx = self.vocabulary_[word]
                    vectors[i, idx] += 1

        return vectors


# Usage
texts_train = ["hello world", "hello sklearn", "sklearn pipeline"]
texts_test = ["hello pipeline"]

vectorizer = SimpleVectorizer(max_features=10)
X_train_vec = vectorizer.fit_transform(texts_train)
X_test_vec = vectorizer.transform(texts_test)

print(f"Vocabulary: {vectorizer.vocabulary_}")
print(f"Train vectors shape: {X_train_vec.shape}")


# Inverse transform (optional)
class InvertibleScaler(BaseEstimator, TransformerMixin):
    """Scaler with inverse_transform."""

    def __init__(self):
        pass

    def fit(self, X, y=None):
        X = np.asarray(X)
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        return self

    def transform(self, X):
        check_is_fitted(self, ['mean_', 'std_'])
        X = np.asarray(X)
        return (X - self.mean_) / self.std_

    def inverse_transform(self, X):
        """Reverse the transformation."""
        check_is_fitted(self, ['mean_', 'std_'])
        X = np.asarray(X)
        return X * self.std_ + self.mean_


scaler = InvertibleScaler()
X_scaled = scaler.fit_transform(X_train)
X_original = scaler.inverse_transform(X_scaled)
np.testing.assert_array_almost_equal(X_original, X_train)


# Feature union - combine multiple transformers
from sklearn.pipeline import FeatureUnion

union = FeatureUnion([
    ('scaler', CustomScaler(method='standard')),
    ('poly', StatelessTransformer(power=2)),
])

X_combined = union.fit_transform(X_train)
print(f"Combined features shape: {X_combined.shape}")  # Double features


# Best practices
class WellImplementedTransformer(BaseEstimator, TransformerMixin):
    """Example of all best practices."""

    def __init__(self, param1=1.0, param2='default'):
        # 1. Initialize ALL parameters in __init__
        # 2. NO computation in __init__
        # 3. Store params as attributes with same name
        self.param1 = param1
        self.param2 = param2

    def fit(self, X, y=None):
        # 4. Validate input
        X = self._validate_input(X)

        # 5. Store learned params with trailing underscore
        self.learned_param_ = X.mean()

        # 6. Store metadata
        self.n_samples_seen_ = len(X)

        # 7. Return self
        return self

    def transform(self, X):
        # 8. Check is fitted
        check_is_fitted(self, 'learned_param_')

        # 9. Validate input
        X = self._validate_input(X)

        # 10. Don't modify X in-place
        X_transformed = X - self.learned_param_

        # 11. Return array, not DataFrame (unless explicitly documented)
        return X_transformed

    def _validate_input(self, X):
        """Private helper for validation."""
        return np.asarray(X)


# Testing transformer
from sklearn.utils.estimator_checks import check_estimator

# Verify follows sklearn conventions
try:
    check_estimator(CustomScaler())
    print("Transformer passes sklearn checks!")
except Exception as e:
    print(f"Failed: {e}")
```

**In Practice**:
Production transformers: (1) **Data cleaning** - imputers, outlier handlers inherit sklearn interface, (2) **Feature engineering** - target encoders, binners follow fit/transform pattern, (3) **Text processing** - custom vectorizers, tokenizers for domain-specific NLP, (4) **Image preprocessing** - normalizers, augmenters in sklearn-style pipelines. Always inherit from BaseEstimator and TransformerMixin for free functionality (grid search, cloning, pipeline integration). Use `sklearn.utils.estimator_checks.check_estimator()` to verify compliance.

**Key Takeaway**: Implement sklearn transformer interface by inheriting from BaseEstimator and TransformerMixin; implement fit() (learn and return self) and transform() (apply learned transform); store learned params with trailing underscore; get fit_transform(), get_params(), set_params() for free.

</details>

4. What's the best way to serialize and deserialize class instances for model saving?

<details>
<summary>Answer: Use pickle for Python-only, joblib for NumPy arrays, JSON for configs, custom save/load methods for complex models; avoid lambda/local classes</summary>

**Explanation**:
Best serialization depends on use case: (1) **pickle** - native Python, handles most objects, not secure or cross-language, (2) **joblib** - optimized for NumPy/scipy, compression, faster for large arrays, (3) **JSON/YAML** - human-readable configs, cross-language, no code execution, (4) **Custom methods** - save weights separately from architecture, version control, cross-framework compatibility.

Pitfalls: pickle can't serialize lambda functions, local classes, or open file handles; pickle is version-dependent (Python 2/3 incompatible); security risk (arbitrary code execution). Best practice: separate model **architecture** (JSON config) from **weights** (NumPy/HDF5) from **preprocessing** (joblib), with versioning and validation.

**Example**:
```python
import pickle
import joblib
import json
import numpy as np
from pathlib import Path

# Basic pickle serialization
class SimpleModel:
    def __init__(self, name, weights):
        self.name = name
        self.weights = np.array(weights)
        self.trained = False

    def save_pickle(self, path):
        """Save using pickle."""
        with open(path, 'wb') as f:
            pickle.dump(self, f)

    @classmethod
    def load_pickle(cls, path):
        """Load using pickle."""
        with open(path, 'rb') as f:
            return pickle.load(f)


model = SimpleModel("model1", [0.1, 0.2, 0.3])
model.save_pickle('model.pkl')
loaded = SimpleModel.load_pickle('model.pkl')
print(f"Loaded: {loaded.name}, {loaded.weights}")


# Joblib - better for NumPy arrays
model.weights = np.random.rand(10000, 1000)  # Large array

# Pickle - slow
import time
start = time.time()
with open('model_pickle.pkl', 'wb') as f:
    pickle.dump(model, f)
pickle_time = time.time() - start

# Joblib - fast with compression
start = time.time()
joblib.dump(model, 'model_joblib.pkl', compress=3)
joblib_time = time.time() - start

print(f"Pickle: {pickle_time:.3f}s, Joblib: {joblib_time:.3f}s")

# Load with joblib
loaded = joblib.load('model_joblib.pkl')


# JSON for configuration (not model weights)
class ConfigurableModel:
    def __init__(self, config):
        self.config = config
        self.weights = None

    def save(self, path):
        """Save config as JSON, weights separately."""
        path = Path(path)
        path.mkdir(exist_ok=True)

        # Save config as JSON
        with open(path / 'config.json', 'w') as f:
            json.dump(self.config, f, indent=2)

        # Save weights as NumPy
        if self.weights is not None:
            np.save(path / 'weights.npy', self.weights)

    @classmethod
    def load(cls, path):
        """Load config and weights."""
        path = Path(path)

        # Load config
        with open(path / 'config.json', 'r') as f:
            config = json.load(f)

        model = cls(config)

        # Load weights if exist
        weights_path = path / 'weights.npy'
        if weights_path.exists():
            model.weights = np.load(weights_path)

        return model


config = {'learning_rate': 0.01, 'hidden_size': 128}
model = ConfigurableModel(config)
model.weights = np.random.rand(100, 100)

model.save('model_dir')
loaded = ConfigurableModel.load('model_dir')
print(f"Config: {loaded.config}")


# Handling unpicklable objects
class ProblematicModel:
    def __init__(self, name):
        self.name = name
        self.process_func = lambda x: x * 2  # Lambda - can't pickle!
        self.file = open('temp.txt', 'w')    # File handle - can't pickle!

    def __getstate__(self):
        """Control what gets pickled."""
        state = self.__dict__.copy()
        # Remove unpicklable items
        del state['process_func']
        del state['file']
        return state

    def __setstate__(self, state):
        """Control how to restore."""
        self.__dict__.update(state)
        # Recreate unpicklable items
        self.process_func = lambda x: x * 2
        self.file = None  # Don't reopen file


model = ProblematicModel("test")
pickled = pickle.dumps(model)
loaded = pickle.loads(pickled)
print(f"Loaded: {loaded.name}, func={loaded.process_func(5)}")


# Versioning for backward compatibility
class VersionedModel:
    VERSION = "2.0"

    def __init__(self, name, weights):
        self.name = name
        self.weights = weights
        self.version = self.VERSION

    def save(self, path):
        """Save with version metadata."""
        data = {
            'version': self.version,
            'name': self.name,
            'weights': self.weights,
        }
        with open(path, 'wb') as f:
            pickle.dump(data, f)

    @classmethod
    def load(cls, path):
        """Load with version check and migration."""
        with open(path, 'rb') as f:
            data = pickle.load(f)

        version = data.get('version', '1.0')

        if version == '1.0':
            # Migrate from v1.0 to v2.0
            print("Migrating from v1.0...")
            data['weights'] = np.array(data.get('weights', []))

        model = cls(data['name'], data['weights'])
        return model


# Custom serialization for complex models
class ComplexModel:
    """Model with architecture + weights + preprocessing."""

    def __init__(self, input_size, hidden_size, output_size):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size

        self.W1 = np.random.rand(input_size, hidden_size)
        self.W2 = np.random.rand(hidden_size, output_size)
        self.preprocessor = None

    def save(self, path):
        """Save components separately."""
        path = Path(path)
        path.mkdir(exist_ok=True)

        # 1. Architecture as JSON (human-readable)
        architecture = {
            'input_size': self.input_size,
            'hidden_size': self.hidden_size,
            'output_size': self.output_size,
        }
        with open(path / 'architecture.json', 'w') as f:
            json.dump(architecture, f, indent=2)

        # 2. Weights as NumPy (efficient binary)
        np.savez(
            path / 'weights.npz',
            W1=self.W1,
            W2=self.W2,
        )

        # 3. Preprocessor as joblib (if exists)
        if self.preprocessor is not None:
            joblib.dump(self.preprocessor, path / 'preprocessor.pkl')

        # 4. Metadata
        metadata = {
            'saved_at': '2026-01-26',
            'version': '1.0',
        }
        with open(path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)

    @classmethod
    def load(cls, path):
        """Load components."""
        path = Path(path)

        # Load architecture
        with open(path / 'architecture.json', 'r') as f:
            arch = json.load(f)

        model = cls(
            input_size=arch['input_size'],
            hidden_size=arch['hidden_size'],
            output_size=arch['output_size'],
        )

        # Load weights
        weights = np.load(path / 'weights.npz')
        model.W1 = weights['W1']
        model.W2 = weights['W2']

        # Load preprocessor if exists
        preprocessor_path = path / 'preprocessor.pkl'
        if preprocessor_path.exists():
            model.preprocessor = joblib.load(preprocessor_path)

        return model


model = ComplexModel(10, 20, 5)
model.save('complex_model')

loaded = ComplexModel.load('complex_model')
print(f"Loaded: {loaded.input_size}→{loaded.hidden_size}→{loaded.output_size}")
print(f"Weights shape: W1={loaded.W1.shape}, W2={loaded.W2.shape}")


# Safe deserialization with validation
class SafeModel:
    def __init__(self, config):
        self.config = self._validate_config(config)

    def _validate_config(self, config):
        """Validate config against schema."""
        required = {'learning_rate', 'hidden_size'}
        if not required.issubset(config.keys()):
            raise ValueError(f"Missing required keys: {required - config.keys()}")

        if config['learning_rate'] <= 0:
            raise ValueError("learning_rate must be positive")

        return config

    def save(self, path):
        with open(path, 'w') as f:
            json.dump(self.config, f)

    @classmethod
    def load(cls, path):
        with open(path, 'r') as f:
            config = json.load(f)

        # Validation happens in __init__
        return cls(config)


# PyTorch/TensorFlow style save/load
class TorchStyleModel:
    """Mimic PyTorch's state_dict pattern."""

    def __init__(self, input_size, output_size):
        self.input_size = input_size
        self.output_size = output_size
        self.weights = np.random.rand(input_size, output_size)
        self.bias = np.zeros(output_size)

    def state_dict(self):
        """Return model state as dictionary."""
        return {
            'weights': self.weights,
            'bias': self.bias,
        }

    def load_state_dict(self, state):
        """Load model state from dictionary."""
        self.weights = state['weights']
        self.bias = state['bias']

    def save(self, path):
        """Save state dict."""
        state = self.state_dict()
        np.savez(path, **state)

    @classmethod
    def load(cls, path, input_size, output_size):
        """Load model with architecture specified."""
        model = cls(input_size, output_size)
        state = dict(np.load(path))
        model.load_state_dict(state)
        return model


model = TorchStyleModel(10, 5)
model.save('torch_style.npz')

loaded = TorchStyleModel.load('torch_style.npz', 10, 5)


# Cloud storage integration
class CloudModel:
    """Model with cloud save/load."""

    def __init__(self, name, weights):
        self.name = name
        self.weights = weights

    def save_local(self, path):
        """Save to local filesystem."""
        joblib.dump(self, path)

    def save_cloud(self, bucket_name, key):
        """Save to S3/GCS."""
        import tempfile

        # Save to temp file first
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            joblib.dump(self, tmp.name)

            # Upload to cloud (pseudo-code)
            # upload_to_s3(tmp.name, bucket_name, key)

        return f"s3://{bucket_name}/{key}"

    @classmethod
    def load_cloud(cls, bucket_name, key):
        """Load from S3/GCS."""
        import tempfile

        # Download from cloud (pseudo-code)
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            # download_from_s3(bucket_name, key, tmp.name)
            return joblib.load(tmp.name)


# Best practices summary
class BestPracticeModel:
    """Example of best serialization practices."""

    VERSION = "1.0"

    def __init__(self, config):
        self.config = config
        self.weights = None

    def save(self, path):
        """
        Save model with best practices:
        1. Version for compatibility
        2. Separate config from weights
        3. Human-readable architecture
        4. Binary weights
        5. Metadata for tracking
        """
        path = Path(path)
        path.mkdir(exist_ok=True)

        # Save everything
        self._save_config(path / 'config.json')
        self._save_weights(path / 'weights.npz')
        self._save_metadata(path / 'metadata.json')

    def _save_config(self, path):
        data = {'version': self.VERSION, **self.config}
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

    def _save_weights(self, path):
        if self.weights is not None:
            np.savez_compressed(path, weights=self.weights)

    def _save_metadata(self, path):
        import datetime
        metadata = {
            'saved_at': datetime.datetime.now().isoformat(),
            'python_version': '3.11',
            'numpy_version': np.__version__,
        }
        with open(path, 'w') as f:
            json.dump(metadata, f, indent=2)

    @classmethod
    def load(cls, path):
        """Load with validation."""
        path = Path(path)

        # Load and validate config
        with open(path / 'config.json', 'r') as f:
            data = json.load(f)

        version = data.pop('version')
        if version != cls.VERSION:
            print(f"Warning: Loading v{version} model with v{cls.VERSION} code")

        model = cls(data)

        # Load weights
        weights_path = path / 'weights.npz'
        if weights_path.exists():
            weights_data = np.load(weights_path)
            model.weights = weights_data['weights']

        return model
```

**In Practice**:
Production serialization: (1) **PyTorch** - `torch.save(model.state_dict())` for weights, JSON for architecture, (2) **TensorFlow** - SavedModel format (architecture + weights + signatures), (3) **sklearn** - joblib for pipelines, separate scalers from models, (4) **ONNX** - cross-framework format for deployment, (5) **MLflow** - versioned model registry with metadata. Always: version models, separate config from weights, validate on load, test serialization round-trip in CI/CD.

**Key Takeaway**: Use pickle for simple Python-only serialization, joblib for NumPy-heavy models, JSON for configs; separate architecture (JSON) from weights (NumPy/HDF5) from preprocessing (joblib); version everything; avoid lambdas and local classes; validate on load.

</details>

5. How do you handle state management in long-running ML classes (memory leaks, cleanup)?

<details>
<summary>Answer: Use context managers for cleanup, implement __del__ carefully, clear caches explicitly, use weak references, monitor memory with profiling</summary>

**Explanation**:
Long-running ML classes accumulate state: cached data, GPU memory, file handles, thread pools. Memory leaks occur when references prevent garbage collection or external resources aren't freed. Solutions: (1) **Context managers** (`__enter__`/`__exit__`) for automatic cleanup, (2) **Explicit cleanup** methods (`.close()`, `.clear_cache()`), (3) **Weak references** for caches that can be garbage collected, (4) **`__del__` carefully** (avoid circular references, external resources), (5) **LRU caches** with size limits.

Common pitfalls: circular references (parent/child), closures capturing large objects, DataFrame copies, GPU memory not freed, file handles left open. Best practices: profile memory with `memory_profiler`, use `weakref` for optional caches, del large objects explicitly, clear GPU caches periodically, implement context managers for resource-heavy operations.

**Example**:
```python
import numpy as np
import weakref
from contextlib import contextmanager
from functools import lru_cache
import gc

# Context manager for automatic cleanup
class ModelTrainer:
    """Trainer with automatic resource cleanup."""

    def __init__(self, model):
        self.model = model
        self.data_cache = {}
        self.file_handles = []

    def __enter__(self):
        """Setup resources."""
        print("Setting up trainer...")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Cleanup resources automatically."""
        print("Cleaning up trainer...")
        self.close()
        return False  # Don't suppress exceptions

    def train(self, X, y):
        """Training logic."""
        self.data_cache['X'] = X
        self.data_cache['y'] = y
        print(f"Training with {len(X)} samples")

    def close(self):
        """Explicit cleanup method."""
        # Clear cached data
        self.data_cache.clear()

        # Close file handles
        for fh in self.file_handles:
            if not fh.closed:
                fh.close()
        self.file_handles.clear()

        print("Resources freed")


# Usage with context manager
with ModelTrainer(model=None) as trainer:
    trainer.train([[1, 2], [3, 4]], [0, 1])
    # Automatic cleanup on exit
# "Cleaning up trainer..."


# Manual cleanup (if not using context manager)
trainer = ModelTrainer(model=None)
try:
    trainer.train([[1, 2]], [0])
finally:
    trainer.close()  # Ensure cleanup even if exception


# Weak references for optional caches
class CachedModel:
    """Model with cache that can be garbage collected."""

    def __init__(self):
        # WeakValueDictionary - values can be GC'd
        self._cache = weakref.WeakValueDictionary()
        self._strong_cache = {}  # For comparison

    def predict(self, X, use_weak=True):
        """Predict with caching."""
        key = str(X)  # Simplified key

        cache = self._cache if use_weak else self._strong_cache

        if key in cache:
            print("Cache hit!")
            return cache[key]

        # Expensive computation
        result = np.array(X) * 2
        cache[key] = result

        return result

    def clear_cache(self):
        """Explicitly clear caches."""
        self._cache.clear()
        self._strong_cache.clear()


model = CachedModel()

# With weak references - can be GC'd
X = np.array([[1, 2, 3]])
result = model.predict(X, use_weak=True)

# Force garbage collection
del result
gc.collect()

# Cache may be cleared (weak ref)
result2 = model.predict(X, use_weak=True)  # May not be cache hit


# LRU cache with size limit (prevents unbounded growth)
from functools import lru_cache

class BoundedCacheModel:
    """Model with bounded cache."""

    def __init__(self):
        self.weights = np.random.rand(1000, 1000)

    @lru_cache(maxsize=100)  # Keep only 100 most recent results
    def predict_cached(self, x):
        """Cached prediction with size limit."""
        return float(np.sum(self.weights * x))

    def clear_cache(self):
        """Clear LRU cache."""
        self.predict_cached.cache_clear()


model = BoundedCacheModel()

# Cache automatically evicts old entries
for i in range(200):
    model.predict_cached(i)

print(model.predict_cached.cache_info())
# CacheInfo(hits=0, misses=200, maxsize=100, currsize=100)


# Careful __del__ implementation
class ResourceManager:
    """Proper __del__ for cleanup."""

    def __init__(self, filename):
        self.filename = filename
        self.file = open(filename, 'w')
        self.large_array = np.zeros((1000, 1000))

    def __del__(self):
        """Cleanup when object is garbage collected."""
        try:
            # Safe cleanup
            if hasattr(self, 'file') and not self.file.closed:
                self.file.close()
                print(f"Closed {self.filename}")

            # Clear large data
            if hasattr(self, 'large_array'):
                del self.large_array

        except Exception as e:
            # Never raise exceptions in __del__
            print(f"Cleanup error: {e}")


# Usage
rm = ResourceManager('temp.txt')
del rm  # Triggers __del__
# "Closed temp.txt"


# Circular reference problem
class Parent:
    def __init__(self):
        self.child = Child(self)  # Child holds reference to parent
        self.data = np.zeros((10000, 10000))  # Large data

class Child:
    def __init__(self, parent):
        self.parent = parent  # Circular reference!

# Problem: circular ref prevents GC
parent = Parent()
del parent  # Parent not freed! (circular ref)

# Solution: Use weak references
class FixedParent:
    def __init__(self):
        self.child = FixedChild(self)
        self.data = np.zeros((10000, 10000))

class FixedChild:
    def __init__(self, parent):
        self._parent = weakref.ref(parent)  # Weak reference

    def get_parent(self):
        return self._parent()  # May return None if parent GC'd


# Explicit memory management
class DataLoader:
    """Loader with explicit memory management."""

    def __init__(self):
        self.batches = []
        self.current_batch = None

    def load_batch(self, size=1000):
        """Load batch into memory."""
        self.current_batch = np.random.rand(size, 1000)
        self.batches.append(self.current_batch)

    def clear_old_batches(self, keep_last=3):
        """Explicitly free old batches."""
        if len(self.batches) > keep_last:
            # Delete old batches
            for batch in self.batches[:-keep_last]:
                del batch

            self.batches = self.batches[-keep_last:]
            gc.collect()  # Force garbage collection

            print(f"Kept last {keep_last} batches")


loader = DataLoader()

for i in range(10):
    loader.load_batch()
    if i % 3 == 0:
        loader.clear_old_batches(keep_last=2)


# GPU memory management (PyTorch style)
class GPUModel:
    """Model with GPU memory management."""

    def __init__(self):
        # Simulating GPU tensors
        self.gpu_weights = np.random.rand(10000, 10000)
        self.gpu_cache = {}

    def forward(self, x):
        """Forward pass, caching activations."""
        # Simulating activation caching
        activation = self.gpu_weights @ x
        self.gpu_cache['activation'] = activation
        return activation

    def clear_cache(self):
        """Clear GPU cache."""
        self.gpu_cache.clear()
        # In PyTorch: torch.cuda.empty_cache()
        gc.collect()

    def to_cpu(self):
        """Move weights to CPU to free GPU memory."""
        # In PyTorch: self.model.cpu()
        pass

    def __del__(self):
        """Ensure GPU memory is freed."""
        self.clear_cache()


# Monitor memory usage
import tracemalloc

class MemoryMonitoredModel:
    """Model with memory monitoring."""

    def __init__(self):
        self.weights = None

    def train(self, X, y, monitor=True):
        """Training with memory monitoring."""
        if monitor:
            tracemalloc.start()

        # Training logic
        self.weights = np.random.rand(10000, 10000)

        # Large intermediate computations
        temp1 = np.random.rand(10000, 10000)
        temp2 = temp1 @ temp1

        # Don't forget to delete temps!
        del temp1, temp2
        gc.collect()

        if monitor:
            current, peak = tracemalloc.get_traced_memory()
            print(f"Current: {current / 1e6:.1f}MB, Peak: {peak / 1e6:.1f}MB")
            tracemalloc.stop()


# Lazy loading pattern
class LazyModel:
    """Model that loads data on-demand."""

    def __init__(self, data_path):
        self.data_path = data_path
        self._data = None  # Not loaded yet

    @property
    def data(self):
        """Load data on first access."""
        if self._data is None:
            print("Loading data...")
            self._data = np.load(self.data_path)
        return self._data

    def unload_data(self):
        """Explicitly unload data to free memory."""
        if self._data is not None:
            print("Unloading data...")
            del self._data
            self._data = None
            gc.collect()


# Periodic cleanup for long-running services
class OnlineModel:
    """Model for online serving with periodic cleanup."""

    def __init__(self):
        self.prediction_cache = {}
        self.request_count = 0

    def predict(self, X):
        """Predict with periodic cleanup."""
        self.request_count += 1

        # Periodic cleanup every 1000 requests
        if self.request_count % 1000 == 0:
            self._periodic_cleanup()

        # Prediction logic
        result = np.sum(X)

        # Cache result
        self.prediction_cache[str(X)] = result

        return result

    def _periodic_cleanup(self):
        """Cleanup performed periodically."""
        print(f"Periodic cleanup at request {self.request_count}")

        # Clear old cache entries
        if len(self.prediction_cache) > 10000:
            # Keep only recent half
            items = list(self.prediction_cache.items())
            self.prediction_cache = dict(items[-5000:])

        # Force garbage collection
        gc.collect()


# Best practices summary
class WellManagedModel:
    """Example of good state management."""

    def __init__(self):
        self.weights = None
        self.cache = weakref.WeakValueDictionary()
        self.temp_files = []

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup."""
        self.close()
        return False

    def train(self, X, y):
        """Training with explicit cleanup."""
        # Large intermediate computation
        gradients = self._compute_gradients(X, y)

        # Update weights
        self.weights = gradients

        # Explicitly delete large temporary objects
        del gradients
        gc.collect()

    def _compute_gradients(self, X, y):
        """Computation method."""
        return np.random.rand(1000, 1000)

    def clear_cache(self):
        """Explicit cache clearing."""
        self.cache.clear()

    def close(self):
        """Explicit cleanup."""
        # Clear caches
        self.clear_cache()

        # Close files
        for f in self.temp_files:
            if not f.closed:
                f.close()

        # Delete large objects
        if self.weights is not None:
            del self.weights

        gc.collect()

    def __del__(self):
        """Safety cleanup (but prefer explicit close())."""
        try:
            self.close()
        except:
            pass  # Never raise in __del__


# Usage
with WellManagedModel() as model:
    model.train([[1, 2]], [0])
# Automatic cleanup


# Memory profiling decorator
from functools import wraps

def profile_memory(func):
    """Decorator to profile memory usage."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        tracemalloc.start()

        result = func(*args, **kwargs)

        current, peak = tracemalloc.get_traced_memory()
        print(f"{func.__name__}: Current={current/1e6:.1f}MB, Peak={peak/1e6:.1f}MB")
        tracemalloc.stop()

        return result
    return wrapper


class ProfiledModel:
    @profile_memory
    def train(self, X, y):
        """Training with automatic memory profiling."""
        weights = np.random.rand(10000, 10000)
        return weights


model = ProfiledModel()
model.train([[1]], [0])
# "train: Current=762.9MB, Peak=762.9MB"
```

**In Practice**:
Production state management: (1) **Training pipelines** - clear GPU caches between batches, delete intermediates explicitly, use gradient checkpointing, (2) **Serving** - implement request-level context managers, periodic cache clearing, connection pooling with limits, (3) **Data loading** - use generators instead of lists, memory-mapped arrays, lazy loading with explicit unloading, (4) **Monitoring** - track memory growth with Prometheus, alert on leaks, profile periodically. Tools: `memory_profiler`, `objgraph` (find circular refs), `tracemalloc` (track allocations), GPU profilers (nvidia-smi, torch.cuda.memory_summary()).

**Key Takeaway**: Handle long-running ML class state with context managers for cleanup, explicit clear_cache() methods, weak references for optional caches, careful __del__ avoiding circular refs, and periodic memory profiling; always test for memory leaks in long-running scenarios.

</details>

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#type-system) for comprehensive list

## Summary

**In 3 sentences**:
- Python classes use `class ClassName:` with `__init__(self, ...)` for initialization, where `self` is like Java's `this` but explicit
- Python's OOP is simpler than Java's - no access modifiers required, duck typing instead of interfaces, and flexible multiple inheritance
- ML frameworks use OOP heavily: PyTorch models are classes (inherit `nn.Module`), sklearn models follow a consistent class interface, making OOP essential for ML work

**Key takeaway**: Python's OOP is more flexible and "pythonic" than Java's - focus on duck typing ("if it has a `predict()` method, it's a model") rather than rigid type hierarchies. Master classes and you can build custom models, transformers, and ML pipelines!
