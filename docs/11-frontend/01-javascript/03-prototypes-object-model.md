# Prototypes & the Object Model

## Prototype Chain

Every object has an internal `[[Prototype]]` link (accessible via `Object.getPrototypeOf(obj)` or `obj.__proto__`). Property lookups walk this chain until `null` is reached.

```js
const animal = { breathes: true };
const dog = Object.create(animal);
dog.bark = function() { return 'woof'; };

dog.breathes;  // true  — found on prototype
dog.bark();    // 'woof' — found on dog itself
```

## Constructor Functions & `new`

When `new` is used, the engine:
1. Creates a new empty object
2. Sets its `[[Prototype]]` to `Constructor.prototype`
3. Calls the constructor with `this` = the new object
4. Returns the new object (unless the constructor explicitly returns another object)

```js
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

const alice = new Person('Alice');
alice.greet();  // "Hi, I'm Alice"
Object.getPrototypeOf(alice) === Person.prototype;  // true
```

## ES6 Classes

Classes are syntactic sugar over prototype-based inheritance.

```js
class Animal {
  #sound;  // private field

  constructor(name, sound) {
    this.name = name;
    this.#sound = sound;
  }

  speak() {
    return `${this.name} says ${this.#sound}`;
  }

  static create(name, sound) {
    return new Animal(name, sound);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name, 'woof');
  }

  fetch(item) {
    return `${this.name} fetches the ${item}`;
  }
}
```

## `this` Binding

`this` is determined at **call time**, not definition time (except for arrow functions).

| Call style | `this` value |
|---|---|
| Method call `obj.method()` | `obj` |
| Plain function call `fn()` | `undefined` (strict) / global object |
| `new Constructor()` | newly created object |
| `fn.call(ctx, args)` | `ctx` |
| Arrow function | Lexically inherited from surrounding scope |

```js
const timer = {
  count: 0,
  start() {
    // Arrow function — this is lexically bound to timer
    setInterval(() => {
      this.count++;    // works correctly
    }, 1000);
  }
};
```

## Object.create, Object.assign, Spread

```js
// Object.create — set explicit prototype
const proto = { greet() { return 'hello'; } };
const obj = Object.create(proto);

// Object.assign — shallow merge, mutates target
Object.assign(target, source1, source2);

// Spread — shallow copy / merge
const copy = { ...original, overrideKey: 'value' };
```

## Interview Questions

**Q: What is the difference between prototypal and classical inheritance?**
Classical inheritance (Java, C++) creates new classes by copying the parent class definition. Prototypal inheritance (JavaScript) creates objects that link directly to other objects via the prototype chain. ES6 `class` syntax looks classical but still uses prototypal inheritance under the hood.

**Q: What does `Object.create(null)` give you?**
An object with no prototype at all — no `toString`, `hasOwnProperty`, or any inherited methods. Useful as a pure hash map with no key collisions from inherited properties.

**Q: How does `bind` differ from `call` and `apply`?**
`call` and `apply` invoke the function immediately with a specific `this`. `bind` returns a new function permanently bound to a `this` value (and optionally pre-filled arguments) without calling it.
