---
name: e2e-testing
description: Browser end-to-end testing conventions for BillBridge. Use when writing or modifying Playwright tests, setting up test infrastructure, or designing test flows for critical user journeys.
---

# End-to-End Testing Skill

> **Official Reference**: https://playwright.dev/docs/intro

Guidelines for writing reliable, maintainable browser E2E tests in BillBridge using Playwright.

## Why Playwright

- Cross-browser: Chromium, Firefox, WebKit
- Auto-waiting: no explicit waits needed for most operations
- Built-in assertions with retry logic
- Trace viewer for debugging failures
- Parallel execution support

## Project Setup

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## File Structure

```
e2e/
  fixtures/          # Custom fixtures (authenticated pages, test data)
    auth.ts
  pages/             # Page Object Models
    LoginPage.ts
    ClaimListPage.ts
    ClaimDetailPage.ts
  flows/             # Test files organized by user journey
    auth.spec.ts
    claim-submission.spec.ts
    billing-review.spec.ts
  support/           # Helpers, seed data, utilities
    seed.ts
    helpers.ts
```

## Page Object Model (POM)

Encapsulate page structure and actions:

```ts
// e2e/pages/ClaimListPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class ClaimListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newClaimButton: Locator;
  readonly claimRows: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /claims/i });
    this.newClaimButton = page.getByRole('button', { name: /new claim/i });
    this.claimRows = page.getByRole('row').filter({ hasNot: page.locator('th') });
    this.searchInput = page.getByRole('searchbox', { name: /search/i });
  }

  async goto() {
    await this.page.goto('/claims');
    await expect(this.heading).toBeVisible();
  }

  async searchClaims(query: string) {
    await this.searchInput.fill(query);
    // Auto-waiting handles the results loading
  }

  async selectClaim(index: number) {
    await this.claimRows.nth(index).click();
  }

  async getClaimCount() {
    return await this.claimRows.count();
  }
}
```

## Writing Tests

### Critical User Journeys to Test
1. **Authentication**: sign up → verify → log in → log out
2. **Claim submission**: upload document → review extraction → edit → submit
3. **Claim review**: view list → filter/sort → view detail → approve/deny
4. **Billing reconciliation**: compare bill vs. EOB → flag discrepancies
5. **Notifications**: trigger event → receive notification → click through

### Test Example
```ts
// e2e/flows/claim-submission.spec.ts
import { test, expect } from '../fixtures/auth';
import { ClaimListPage } from '../pages/ClaimListPage';

test.describe('Claim Submission', () => {
  test('user can upload a bill and submit a claim', async ({ authenticatedPage }) => {
    const claimList = new ClaimListPage(authenticatedPage);
    await claimList.goto();

    // Click new claim
    await claimList.newClaimButton.click();
    
    // Upload document
    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/support/fixtures/sample-bill.pdf');

    // Wait for AI extraction to complete
    await expect(authenticatedPage.getByText(/extraction complete/i)).toBeVisible({
      timeout: 30_000,
    });

    // Verify extracted data appears
    await expect(authenticatedPage.getByLabel(/total amount/i)).toHaveValue(/\d+/);

    // Submit claim
    await authenticatedPage.getByRole('button', { name: /submit claim/i }).click();

    // Verify success
    await expect(authenticatedPage.getByText(/claim submitted successfully/i)).toBeVisible();
  });
});
```

## Authentication Fixture

```ts
// e2e/fixtures/auth.ts
import { test as base, type Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Log in via API (faster than UI login)
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: process.env.E2E_TEST_EMAIL,
        password: process.env.E2E_TEST_PASSWORD,
      },
    });
    
    // Set auth cookie/token
    const { access_token } = await response.json();
    await page.context().addCookies([{
      name: 'sb-access-token',
      value: access_token,
      domain: 'localhost',
      path: '/',
    }]);

    await use(page);
  },
});

export { expect } from '@playwright/test';
```

> **Note**: Use dedicated test accounts with known credentials stored in `.env.test` (gitignored). Never use production credentials.

## Best Practices

### Locators
```ts
// ✅ Preferred — role-based (accessible and stable)
page.getByRole('button', { name: /submit/i });
page.getByLabel(/email/i);
page.getByText(/claim submitted/i);

// ⚠️ Acceptable — test IDs for complex components
page.getByTestId('claim-timeline');

// ❌ Avoid — brittle CSS selectors
page.locator('.btn-primary');
page.locator('#submit-btn');
page.locator('div > form > button:nth-child(2)');
```

### Assertions
```ts
// ✅ Use web-first assertions (auto-retrying)
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page).toHaveURL('/claims/abc-123');

// ❌ Don't use generic assertions for DOM state
expect(await page.locator('.success').isVisible()).toBe(true); // No auto-retry
```

### Waiting
```ts
// ✅ Playwright auto-waits — just assert
await expect(page.getByText(/loading/i)).not.toBeVisible();
await expect(page.getByRole('table')).toBeVisible();

// ❌ Never use fixed waits
await page.waitForTimeout(3000); // Flaky and slow
```

### Test Isolation
- Each test should start from a known state
- Use API calls to seed/clean data — not UI interactions
- Tests should not depend on each other's execution order
- Use `test.beforeEach` for common setup, `test.afterEach` for cleanup

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/flows/claim-submission.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Run with UI mode (interactive debugging)
npx playwright test --ui

# View test report after run
npx playwright show-report

# Debug a specific test
npx playwright test --debug -g "user can upload"
```

## CI Integration

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npx playwright test
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

## Key Rules

1. **Test user journeys, not pages** — each test should cover a meaningful flow
2. **Use Page Object Model** — encapsulate locators and actions
3. **Role-based locators first** — test accessibility for free
4. **No fixed waits** — use Playwright's auto-waiting and assertions
5. **API for setup/teardown** — UI for the journey being tested, API for everything else
6. **Keep tests independent** — no shared state between tests
7. **Fail with useful output** — screenshots on failure, trace on retry
8. **Test credentials in env vars** — never hardcoded, never production accounts
