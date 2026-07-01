# Component Testing with React Testing Library

## Guiding Principle

> "Test your software the way your users use it."  
> — Kent C. Dodds

React Testing Library (RTL) renders components into a real DOM (via jsdom) and encourages querying by **accessible roles and text** — not by CSS classes or component internals.

## Setup

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

```js
// setupTests.js (referenced in jest.config.js setupFilesAfterFramework)
import '@testing-library/jest-dom';
```

## Basic Render & Query

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

test('renders login form', () => {
  render(<LoginForm />);

  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
});
```

## Query Priority (high → low)

1. **`getByRole`** — most accessible, mirrors what screen readers see
2. **`getByLabelText`** — form fields associated with a label
3. **`getByPlaceholderText`** — fallback for inputs without labels
4. **`getByText`** — visible text content
5. **`getByDisplayValue`** — current value of form elements
6. **`getByAltText`** — image alt text
7. **`getByTitle`** — title attribute
8. **`getByTestId`** — last resort via `data-testid`

## Query Variants

| Prefix | Throws if missing | Returns |
|---|---|---|
| `getBy` | Yes | Element |
| `queryBy` | No (returns null) | Element \| null |
| `findBy` | Yes (async) | Promise\<Element\> |
| `getAllBy` | Yes (if none) | Element[] |

## User Interactions

```tsx
import userEvent from '@testing-library/user-event';

test('submits the form with valid credentials', async () => {
  const user = userEvent.setup();
  const handleSubmit = jest.fn();
  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await user.type(screen.getByLabelText(/password/i), 'secret123');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'alice@example.com',
    password: 'secret123',
  });
});
```

Always use `userEvent` over `fireEvent` — it simulates realistic user interactions (focus, keyboard events, pointer events).

## Testing Async / Data Fetching

```tsx
import { render, screen } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import UserProfile from './UserProfile';

const server = setupServer(
  rest.get('/api/users/1', (req, res, ctx) =>
    res(ctx.json({ id: 1, name: 'Alice', email: 'alice@example.com' }))
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('shows user profile after loading', async () => {
  render(<UserProfile userId={1} />);

  expect(screen.getByRole('status')).toBeInTheDocument(); // loading spinner

  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@example.com')).toBeInTheDocument();
});

test('shows error on network failure', async () => {
  server.use(
    rest.get('/api/users/1', (req, res, ctx) => res(ctx.status(500)))
  );
  render(<UserProfile userId={1} />);

  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

**Mock Service Worker (MSW)** intercepts fetch at the network level — no mocking of `fetch` itself, so tests are closer to reality.

## Wrapping with Providers

```tsx
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

test('renders dashboard', () => {
  renderWithProviders(<Dashboard />);
  // ...
});
```

## What NOT to Test

- Implementation details (state variable names, internal method calls)
- Snapshot tests of large component trees (brittle, low signal)
- CSS / visual output — use Storybook visual regression tools instead
- Third-party library internals
