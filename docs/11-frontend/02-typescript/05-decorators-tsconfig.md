# Decorators & tsconfig

## tsconfig.json — Key Options

```json
{
  "compilerOptions": {
    // Type checking strictness
    "strict": true,               // enables all strict* flags below
    "noImplicitAny": true,        // error on implicit `any`
    "strictNullChecks": true,     // null/undefined not assignable to other types
    "strictFunctionTypes": true,  // strict function parameter checking
    "noUncheckedIndexedAccess": true, // arr[i] is T | undefined

    // Module system
    "module": "ESNext",
    "moduleResolution": "bundler", // or "node16" / "nodenext"
    "esModuleInterop": true,

    // Output
    "target": "ES2022",
    "outDir": "./dist",
    "declaration": true,          // emit .d.ts files
    "sourceMap": true,

    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Recommended Strict Mode

Always use `"strict": true` in new projects. It's a shorthand for:

| Flag | Catches |
|---|---|
| `noImplicitAny` | Untyped function parameters |
| `strictNullChecks` | Missing null checks |
| `strictBindCallApply` | Wrong args to `.bind/.call/.apply` |
| `strictPropertyInitialization` | Class fields not set in constructor |
| `useUnknownInCatchVariables` | `catch (e)` binds `e` as `unknown` not `any` |

## Decorators (Stage 3 / TS 5+)

Decorators are functions that annotate or modify classes, methods, properties, or parameters at definition time.

```ts
// Class decorator
function singleton<T extends { new(...args: any[]): {} }>(Base: T) {
  let instance: InstanceType<T>;
  return class extends Base {
    constructor(...args: any[]) {
      if (instance) return instance;
      super(...args);
      instance = this as any;
    }
  };
}

@singleton
class Database {
  connect() { /* ... */ }
}
```

```ts
// Method decorator — log execution time
function measure(_target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: any[]) {
    const start = performance.now();
    const result = original.apply(this, args);
    console.log(`${key} took ${performance.now() - start}ms`);
    return result;
  };
  return descriptor;
}

class Service {
  @measure
  processData(data: unknown[]) { /* heavy work */ }
}
```

```ts
// Parameter decorator (commonly used with DI frameworks)
function inject(token: symbol) {
  return (_target: any, _key: string | symbol, index: number) => {
    Reflect.defineMetadata('inject', token, _target, String(index));
  };
}
```

### Decorator Order of Execution

1. Parameter decorators (innermost first, bottom to top)
2. Method / accessor / property decorators (bottom to top per class)
3. Class decorator

## Type-only Imports

```ts
// Only emits a type reference, erased at runtime
import type { User } from './types';

// Inline type qualifier (TS 3.8+)
import { type User, createUser } from './user';
```

Use `import type` to avoid circular runtime dependencies and ensure cleaner bundles.

## Interview Questions

**Q: What does `"strict": true` enable in tsconfig?**
It enables a collection of strict type-checking flags including `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and others. It's the recommended baseline for any new project because it catches the most common type errors at compile time.

**Q: What is the difference between `"module": "CommonJS"` and `"module": "ESNext"`?**
CommonJS (`require`/`module.exports`) is the Node.js native format. ESNext emits ES module syntax (`import`/`export`) for modern bundlers and browsers. When targeting a modern bundler (Vite, webpack 5, esbuild), prefer `ESNext` with `"moduleResolution": "bundler"`.

**Q: When should you use `import type`?**
Use `import type` when importing only types — interfaces, type aliases, enums used as types. It's completely erased at compile time, avoiding circular imports that only exist at the type level and producing smaller output. It also signals intent: "this import has no runtime effect."
