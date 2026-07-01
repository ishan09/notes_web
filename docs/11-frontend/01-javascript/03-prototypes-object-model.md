# Prototypes & the Object Model

## The Two Prototype Properties — `prototype` vs `[[Prototype]]`

This is the single most common source of confusion, so it's worth being precise upfront:

| Property | Lives on | What it is |
|---|---|---|
| `F.prototype` | **Function objects** | The object that becomes `[[Prototype]]` of instances created with `new F()` |
| `[[Prototype]]` | **Every object** | The internal link used for property lookup; readable via `Object.getPrototypeOf(obj)` |
| `obj.__proto__` | Every object | Legacy accessor for `[[Prototype]]` — avoid in production; use `Object.getPrototypeOf` |

```js
function Dog(name) { this.name = name; }

const rex = new Dog('Rex');

// F.prototype — the object used as the prototype for new instances
Dog.prototype                          // { constructor: Dog }

// [[Prototype]] of the instance — same object as Dog.prototype
Object.getPrototypeOf(rex)             // Dog.prototype
Object.getPrototypeOf(rex) === Dog.prototype  // true

// __proto__ — legacy, same thing
rex.__proto__ === Dog.prototype        // true
```

---

## The Prototype Chain in Detail

Every object's `[[Prototype]]` eventually traces back to `Object.prototype`, then `null`.

### Full chain for a constructor-based object

```
rex  (instance)
 └─ [[Prototype]] → Dog.prototype
                      └─ [[Prototype]] → Object.prototype
                                           └─ [[Prototype]] → null
```

```js
function Dog(name) { this.name = name; }
Dog.prototype.bark = function() { return 'woof'; };

const rex = new Dog('Rex');

// Property lookup walks the chain
rex.name;           // 'Rex'       — own property on rex
rex.bark();         // 'woof'      — found on Dog.prototype
rex.toString();     // '[object Object]' — found on Object.prototype
rex.missing;        // undefined   — reached null, not found

// Verify each link
Object.getPrototypeOf(rex) === Dog.prototype;           // true
Object.getPrototypeOf(Dog.prototype) === Object.prototype; // true
Object.getPrototypeOf(Object.prototype);                // null
```

### Function objects have their own chain

Functions are objects too. They have their own `[[Prototype]]` pointing to `Function.prototype`:

```js
function greet() {}

Object.getPrototypeOf(greet) === Function.prototype;  // true
Object.getPrototypeOf(Function.prototype) === Object.prototype; // true

// This is why functions have .call, .apply, .bind — they're on Function.prototype
greet.call;   // ƒ call() { [native code] }
```

---

## Property Lookup: Own vs Inherited

The engine checks **own properties first**, then walks the prototype chain:

```js
function Animal(name) { this.name = name; }
Animal.prototype.type = 'animal';

const cat = new Animal('Whiskers');
cat.type = 'cat';   // own property added — shadows the prototype property

cat.type;                                // 'cat'   — own property wins
Object.getPrototypeOf(cat).type;         // 'animal' — prototype still unchanged
```

### Checking own vs inherited

```js
// hasOwnProperty — only own (not inherited)
cat.hasOwnProperty('name');   // true
cat.hasOwnProperty('type');   // true  (cat has its own 'type')

// in operator — checks entire chain including inherited
'name' in cat;                // true
'toString' in cat;            // true  — inherited from Object.prototype

// for...in iterates ALL enumerable properties (own + inherited)
for (const key in cat) {
  if (cat.hasOwnProperty(key)) {
    console.log('own:', key);       // name, type
  } else {
    console.log('inherited:', key); // anything enumerable on the prototype
  }
}

// Object.keys — only own enumerable
Object.keys(cat);  // ['name', 'type']
```

---

## `instanceof` and How It Works

`instanceof` walks the left-hand object's prototype chain looking for the right-hand function's `prototype` property.

```js
cat instanceof Animal;    // true  — Animal.prototype is in cat's chain
cat instanceof Object;    // true  — Object.prototype is in cat's chain
cat instanceof Array;     // false — Array.prototype is not in cat's chain
```

```js
// What instanceof actually does (simplified):
function myInstanceof(obj, Fn) {
  let proto = Object.getPrototypeOf(obj);
  while (proto !== null) {
    if (proto === Fn.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

**Gotcha**: `instanceof` checks the prototype chain, not the constructor name. If you swap out `F.prototype`, existing instances will no longer be `instanceof F`:

```js
function Foo() {}
const obj = new Foo();
obj instanceof Foo;   // true

Foo.prototype = {};   // replace the prototype object
obj instanceof Foo;   // false — the chain no longer leads to the new Foo.prototype
```

---

## The `constructor` Property

Every function's `prototype` object starts with a `constructor` property pointing back to the function itself:

```js
function Person(name) { this.name = name; }

Person.prototype.constructor === Person;   // true

const alice = new Person('Alice');
alice.constructor === Person;              // true (inherited from Person.prototype)
```

**Pitfall**: if you replace the entire `prototype` object, `constructor` is lost:

```js
function Dog(name) { this.name = name; }

Dog.prototype = {
  bark() { return 'woof'; },
  // constructor is now Object, not Dog!
};

const rex = new Dog('Rex');
rex.constructor === Dog;    // false — broken
rex.constructor === Object; // true  — wrong

// Fix — restore constructor explicitly
Dog.prototype = {
  constructor: Dog,
  bark() { return 'woof'; },
};
```

---

## Constructor Functions & `new` — Step by Step

When you call `new F()`, the engine does exactly four things:

```js
// new F(args) is equivalent to:
function simulateNew(F, ...args) {
  // 1. Create a new empty object
  const obj = {};

  // 2. Set its [[Prototype]] to F.prototype
  Object.setPrototypeOf(obj, F.prototype);

  // 3. Call F with `this` = the new object
  const result = F.apply(obj, args);

  // 4. Return the new object — unless F returned a different object
  return result instanceof Object ? result : obj;
}
```

```js
function Person(name) {
  this.name = name;
  // returning a primitive here is ignored — `new` returns `this`
}

function Factory(name) {
  this.name = name;
  return { custom: true };  // returning an object overrides `new`'s default
}

const p = new Person('Alice');   // { name: 'Alice' }
const f = new Factory('Bob');    // { custom: true }  — the returned object wins
```

---

## ES6 Classes — Sugar Over Prototypes

`class` syntax creates the same prototype structure as constructor functions. There is no new runtime mechanism.

```js
class Animal {
  #sound;  // private field (not on prototype — stored per-instance)

  constructor(name, sound) {
    this.name = name;
    this.#sound = sound;
  }

  speak() {          // placed on Animal.prototype
    return `${this.name} says ${this.#sound}`;
  }

  static create(name, sound) {   // placed directly on Animal (not prototype)
    return new Animal(name, sound);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name, 'woof');   // must call super() before accessing `this`
  }

  fetch(item) {            // placed on Dog.prototype
    return `${this.name} fetches the ${item}`;
  }
}
```

### What `extends` actually sets up

```
Dog instance
  └─ [[Prototype]] → Dog.prototype
                       └─ [[Prototype]] → Animal.prototype
                                            └─ [[Prototype]] → Object.prototype
                                                                 └─ null

Dog (the class/function itself)
  └─ [[Prototype]] → Animal (for static method inheritance)
```

```js
const rex = new Dog('Rex');

rex.fetch('ball');       // Dog.prototype.fetch
rex.speak();             // Animal.prototype.speak
rex.toString();          // Object.prototype.toString

rex instanceof Dog;      // true
rex instanceof Animal;   // true
rex instanceof Object;   // true
```

---

## Manipulating the Prototype Chain

```js
// Object.create(proto) — create object with explicit prototype
const vehicleProto = {
  describe() { return `${this.make} ${this.model}`; },
};
const car = Object.create(vehicleProto);
car.make = 'Toyota';
car.model = 'Camry';
car.describe();  // 'Toyota Camry'

// Object.create(null) — no prototype at all (pure dictionary)
const dict = Object.create(null);
dict.key = 'value';
'toString' in dict;         // false — no inherited properties
dict.hasOwnProperty;        // undefined — doesn't even have this!

// Object.setPrototypeOf — change prototype after creation (avoid — slow)
const obj = {};
Object.setPrototypeOf(obj, vehicleProto);

// Object.getPrototypeOf — read the prototype
Object.getPrototypeOf(car) === vehicleProto;   // true
```

---

## Property Descriptors

Every property has a **descriptor** controlling its behaviour. Understanding this explains many "surprising" behaviours.

```js
const obj = { name: 'Alice' };

Object.getOwnPropertyDescriptor(obj, 'name');
// { value: 'Alice', writable: true, enumerable: true, configurable: true }
```

### Descriptor flags

| Flag | Default | Meaning |
|---|---|---|
| `value` | `undefined` | The property's value |
| `writable` | `true` | Can it be reassigned? |
| `enumerable` | `true` | Does it appear in `for...in` / `Object.keys`? |
| `configurable` | `true` | Can the descriptor be changed / property deleted? |

```js
const person = {};

Object.defineProperty(person, 'id', {
  value: 42,
  writable: false,     // cannot reassign
  enumerable: false,   // hidden from for...in / Object.keys
  configurable: false, // cannot delete or redefine
});

person.id = 99;           // silently fails (throws in strict mode)
Object.keys(person);      // [] — id is non-enumerable
delete person.id;         // false — non-configurable

// Methods on Object.prototype are non-enumerable — that's why
// for...in doesn't list 'toString', 'hasOwnProperty', etc.
Object.getOwnPropertyDescriptor(Object.prototype, 'toString');
// { writable: true, enumerable: false, configurable: true, value: ƒ }
```

### Accessor descriptors (getters / setters)

```js
const temperature = {
  _celsius: 0,
  get fahrenheit() {
    return this._celsius * 9/5 + 32;
  },
  set fahrenheit(f) {
    this._celsius = (f - 32) * 5/9;
  },
};

temperature.fahrenheit = 212;
temperature._celsius;      // 100
temperature.fahrenheit;    // 212
```

---

## Prototype Augmentation & Pitfalls

Adding methods to built-in prototypes ("monkey patching") is generally discouraged:

```js
// Avoid in production — can conflict with future JS spec additions
Array.prototype.last = function() { return this[this.length - 1]; };
[1, 2, 3].last();   // 3

// Safe pattern — check before adding
if (!Array.prototype.last) {
  Array.prototype.last = function() { return this[this.length - 1]; };
}
```

It's fine for polyfills that match a spec'd API exactly. For custom utilities, use standalone functions or subclasses instead.

---

## Performance Considerations

- Every property access that isn't on the object itself walks the chain. Long chains mean more lookups.
- V8 and other engines optimise short, predictable chains with **hidden classes** (shapes). Avoid adding properties in different orders to different instances of the same constructor.
- `Object.setPrototypeOf` after creation kills V8's shape optimisation — create objects with the right prototype from the start.
- `Object.create(null)` dictionary objects are slightly slower than regular objects for property access but avoid all prototype-collision bugs.

---

## `this` Binding

`this` is determined at **call time**, not definition time (arrow functions are the exception — they close over `this` lexically).

| Call style | `this` value |
|---|---|
| Method call `obj.method()` | `obj` |
| Plain function call `fn()` | `undefined` (strict) / global object |
| `new Constructor()` | newly created object |
| `fn.call(ctx, args)` | `ctx` |
| `fn.apply(ctx, [args])` | `ctx` |
| `fn.bind(ctx)` | `ctx` (returns a new bound function) |
| Arrow function | Lexically inherited — whatever `this` was where the arrow was defined |

```js
const timer = {
  count: 0,
  start() {
    setInterval(() => {
      this.count++;   // arrow — `this` is `timer`, not the global object
    }, 1000);
  },
};

// Losing `this` — common mistake
const greet = timer.start;
greet();   // `this` is undefined (strict) or window — not timer
```

### `call`, `apply`, `bind`

```js
function introduce(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

const alice = { name: 'Alice' };

introduce.call(alice, 'Hello', '!');         // "Hello, I'm Alice!"
introduce.apply(alice, ['Hello', '!']);      // "Hello, I'm Alice!"

const aliceIntro = introduce.bind(alice, 'Hi');
aliceIntro('.');    // "Hi, I'm Alice."
aliceIntro('!');    // "Hi, I'm Alice!"  — greeting is pre-filled
```

---

## Interview Questions

**Q: What is the difference between `F.prototype` and `[[Prototype]]`?**
`F.prototype` is a regular property that exists only on **function objects**. It is the object that becomes the `[[Prototype]]` of any object created with `new F()`. `[[Prototype]]` is the internal link every object has that the engine walks during property lookup. For an instance `obj = new F()`, `Object.getPrototypeOf(obj) === F.prototype` is always true.

**Q: Draw the prototype chain for `new Dog()` where Dog extends Animal.**
```
rex (Dog instance)
  → Dog.prototype          (has: fetch, constructor: Dog)
    → Animal.prototype     (has: speak, constructor: Animal)
      → Object.prototype   (has: toString, hasOwnProperty, …)
        → null
```
Additionally, `Dog` (the class function itself) has `[[Prototype]] → Animal` for static method inheritance.

**Q: How does `instanceof` work under the hood?**
It walks the left-hand object's `[[Prototype]]` chain, at each step comparing the current prototype against the right-hand function's `.prototype` property. If it finds a match before reaching `null`, it returns `true`. This means `instanceof` is about prototype chain membership, not about which constructor created an object.

**Q: What is property shadowing?**
When an object has its own property with the same name as one on its prototype, the own property **shadows** (hides) the prototype one. Lookups return the own property; the prototype property is unchanged. You can still access the prototype property explicitly via `Object.getPrototypeOf(obj).propName`.

**Q: Why are methods added to `Constructor.prototype` rather than `this` inside the constructor?**
If methods were added to `this` inside the constructor, each instance would get its own copy of every method — wasting memory proportional to the number of instances. Methods on `prototype` are shared: there is exactly one copy in memory, linked to by all instances through the chain.

```js
// Wasteful — each instance has its own copy of greet
function Person(name) {
  this.name = name;
  this.greet = function() { return `Hi, I'm ${this.name}`; }; // ← new fn per instance
}

// Efficient — one greet function shared across all instances
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function() { return `Hi, I'm ${this.name}`; };
```

**Q: What does `Object.create(null)` give you and when would you use it?**
An object with no `[[Prototype]]` at all — no `toString`, no `hasOwnProperty`, no inherited anything. Use it as a pure key-value store (dictionary/hash map) when you need to store arbitrary user-supplied keys without risking collisions with inherited property names like `constructor`, `valueOf`, or `__proto__`.

**Q: What is the difference between `writable: false` and `const`?**
`const` prevents the **variable binding** from being reassigned — but the object it points to can still be mutated. `writable: false` on a property descriptor prevents the **property value** from being reassigned via assignment (`=`), regardless of whether the variable is `const` or `let`. For truly frozen objects, use `Object.freeze()`, which sets `writable: false` and `configurable: false` on all own properties recursively.

**Q: What happens to `constructor` when you replace `Fn.prototype` entirely?**
The `constructor` property is lost — the replacement plain object literal has `constructor: Object`. This means `instance.constructor === Fn` returns `false`, and code relying on `.constructor` to re-instantiate an object will break. Always restore `constructor` explicitly when replacing a prototype: `Fn.prototype = { constructor: Fn, ...methods }`.
