# Unit Testing with Jest & Vitest

## Philosophy: What to Unit Test

Unit tests verify a single function or module in isolation — no DOM, no network, no database. They are fast and deterministic.

Test the **contract**: given these inputs, produce this output / this side effect. Don't test implementation details (private method names, internal state).

## Jest Basics

```js
// math.js
export function add(a, b) { return a + b; }
export function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

```js
// math.test.js
import { add, divide } from './math';

describe('add', () => {
  it('returns the sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});

describe('divide', () => {
  it('divides correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('throws on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
```

## Matchers Cheatsheet

```js
// Equality
expect(val).toBe(5);            // Object.is (strict)
expect(val).toEqual({ a: 1 }); // deep equality

// Truthiness
expect(val).toBeTruthy();
expect(val).toBeFalsy();
expect(val).toBeNull();
expect(val).toBeUndefined();

// Numbers
expect(val).toBeGreaterThan(3);
expect(val).toBeCloseTo(0.3, 5); // floating point

// Strings / Arrays
expect(str).toMatch(/regex/);
expect(arr).toContain('item');
expect(arr).toHaveLength(3);

// Objects
expect(obj).toMatchObject({ name: 'Alice' });  // partial match
expect(obj).toHaveProperty('address.city', 'NY');

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrowError(TypeError);
```

## Mocking

```js
// Mock a module
jest.mock('./api', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
}));

// Spy on an existing method
const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... run code ...
expect(spy).toHaveBeenCalledWith('some error');
spy.mockRestore();

// Mock return values
const mockFn = jest.fn()
  .mockReturnValueOnce('first call')
  .mockReturnValue('subsequent calls');
```

## Testing Async Code

```js
// async/await
it('fetches user data', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Alice');
});

// Rejected promises
it('throws on 404', async () => {
  await expect(fetchUser(999)).rejects.toThrow('Not found');
});
```

## Vitest (Vite-native alternative)

Drop-in Jest compatible but runs natively in Vite's pipeline — faster, ESM-native, no transpilation config needed.

```js
import { describe, it, expect, vi } from 'vitest';

describe('myFn', () => {
  it('works', () => {
    const mock = vi.fn().mockReturnValue(42);
    expect(mock()).toBe(42);
    expect(mock).toHaveBeenCalledOnce();
  });
});
```

Key differences from Jest:

| | Jest | Vitest |
|---|---|---|
| Config | `jest.config.js` | `vite.config.ts` (unified) |
| Mocking | `jest.fn()` | `vi.fn()` |
| Timers | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| Speed | Medium | Fast (Vite's esbuild) |
| ESM | Requires transform | Native |
