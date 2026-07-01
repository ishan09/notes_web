# End-to-End Testing with Playwright

## Why E2E Testing

Unit and component tests run in isolation against mocks. E2E tests run the real app in a real browser against a real (or test) backend. They catch integration failures that unit tests miss.

Use E2E tests to cover:
- Critical user journeys (login, checkout, signup)
- Cross-browser rendering issues
- Multi-step flows that span many components

## Playwright Basics

```ts
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('alice@example.com');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome, Alice' })).toBeVisible();
});
```

## Locator Strategy

Prefer locators that survive UI refactors:

```ts
// Best — role + accessible name (matches what screen readers see)
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Email' })

// Good — label text
page.getByLabel('Password')

// Good — placeholder
page.getByPlaceholder('Search...')

// Acceptable — text content
page.getByText('Continue')

// Last resort — test ID
page.getByTestId('submit-btn')  // data-testid="submit-btn"

// Avoid — CSS selectors and XPath (break on style changes)
page.locator('.btn-primary')   // fragile
```

## Waiting & Assertions

Playwright auto-waits for elements to be actionable before interacting — no manual `sleep`.

```ts
// These all auto-wait
await page.getByRole('button').click();          // waits until clickable
await expect(page.getByText('Success')).toBeVisible();  // waits until visible

// Explicit waits when needed
await page.waitForURL('/dashboard');
await page.waitForResponse('**/api/orders');
await page.waitForLoadState('networkidle');
```

## Page Object Model (POM)

Encapsulate page interactions in classes to keep tests readable and DRY.

```ts
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
  }

  async getErrorMessage() {
    return this.page.getByRole('alert').textContent();
  }
}

// tests/login.spec.ts
test('invalid credentials show error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('bad@email.com', 'wrongpass');
  expect(await loginPage.getErrorMessage()).toContain('Invalid credentials');
});
```

## Cross-Browser & Parallel Runs

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox',  use: devices['Desktop Firefox'] },
    { name: 'webkit',   use: devices['Desktop Safari'] },
    { name: 'mobile',   use: devices['iPhone 14'] },
  ],
  workers: 4,        // parallel
  retries: 2,        // flake tolerance in CI
});
```

## API Mocking in Playwright

```ts
test('shows error when API fails', async ({ page }) => {
  await page.route('**/api/users', route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  );
  await page.goto('/users');
  await expect(page.getByRole('alert')).toBeVisible();
});
```

## Testing Pyramid Guidance

```
        /\         E2E (few, slow, high confidence)
       /  \
      /----\       Integration / Component (moderate)
     /      \
    /--------\     Unit (many, fast, isolated)
```

- **Many unit tests** — fast feedback, test logic in isolation
- **Moderate component tests** — test UI components with RTL
- **Few E2E tests** — cover only critical happy paths and key error states
