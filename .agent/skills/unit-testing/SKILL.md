---
name: unit-testing
description: Unit and integration testing conventions for BillBridge. Use when writing tests for React components, hooks, utilities, API routes, or Supabase queries. Covers Vitest, React Testing Library, and test design patterns.
---

# Unit Testing Skill

> **Official Reference**: https://vitest.dev/guide/

Guidelines for writing effective unit and integration tests in BillBridge using Vitest and React Testing Library.

## Test Framework Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Test runner, assertions, mocking, coverage |
| **React Testing Library (RTL)** | Component testing — render, query, interact |
| **@testing-library/user-event** | Simulating realistic user interactions |
| **MSW (Mock Service Worker)** | Mocking API/Supabase requests at the network level |

## File Conventions

- Test files: `ComponentName.test.tsx` or `utilityName.test.ts`
- Co-locate with source: `src/features/claims/ClaimCard.tsx` → `src/features/claims/ClaimCard.test.tsx`
- Test utilities/helpers: `src/test/` directory (setup, custom renders, factories)
- Config: `vitest.config.ts` at project root

## Test Structure

### Anatomy of a Good Test
```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimCard } from './ClaimCard';

describe('ClaimCard', () => {
  // ✅ Descriptive test name: "it [does what] [when condition]"
  it('displays the claim amount formatted as currency', () => {
    render(<ClaimCard claim={mockClaim({ totalAmount: 1500.50 })} />);
    
    expect(screen.getByText('$1,500.50')).toBeInTheDocument();
  });

  it('calls onSelect with the claim ID when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    
    render(<ClaimCard claim={mockClaim({ id: 'abc-123' })} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /view details/i }));
    
    expect(onSelect).toHaveBeenCalledWith('abc-123');
  });

  it('shows a pending badge when claim status is pending', () => {
    render(<ClaimCard claim={mockClaim({ status: 'pending' })} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
```

### Arrange-Act-Assert (AAA)
Every test should follow this pattern:
1. **Arrange** — set up data, render components, configure mocks
2. **Act** — perform the action (click, type, submit)
3. **Assert** — verify the expected outcome

## React Testing Library — Query Priority

Use queries that reflect how users interact with the UI:

| Priority | Query | Use When |
|---|---|---|
| 1st | `getByRole` | Always try first — accessible roles (button, heading, textbox) |
| 2nd | `getByLabelText` | Form elements with labels |
| 3rd | `getByPlaceholderText` | Input placeholders (when no label) |
| 4th | `getByText` | Non-interactive text content |
| 5th | `getByDisplayValue` | Current input values |
| Last resort | `getByTestId` | Only when no semantic query works — add `data-testid` |

```ts
// ✅ Preferred — tests accessibility too
screen.getByRole('button', { name: /submit claim/i });
screen.getByLabelText(/patient name/i);

// ❌ Avoid — brittle, doesn't test accessibility
screen.getByTestId('submit-button');
document.querySelector('.btn-primary');
```

## Testing Patterns

### Custom Render with Providers
```ts
// src/test/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = createTestQueryClient();
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

### Test Data Factories
```ts
// src/test/factories.ts
import type { Claim } from '@/types';

let counter = 0;

export function mockClaim(overrides: Partial<Claim> = {}): Claim {
  counter++;
  return {
    id: `claim-${counter}`,
    status: 'pending',
    totalAmount: 500.00,
    patientId: `patient-${counter}`,
    dateOfService: '2026-01-15',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
```

### Mocking API Calls with MSW
```ts
// src/test/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/rest/v1/claims*', () => {
    return HttpResponse.json([mockClaim(), mockClaim({ status: 'approved' })]);
  }),
  http.post('*/rest/v1/claims', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockClaim(body), { status: 201 });
  }),
];
```

### Testing Hooks
```ts
import { renderHook, waitFor } from '@testing-library/react';
import { useClaimStatus } from './useClaimStatus';

it('returns the current claim status', async () => {
  const { result } = renderHook(() => useClaimStatus('claim-1'), {
    wrapper: TestProviders,
  });

  await waitFor(() => {
    expect(result.current.status).toBe('approved');
  });
});
```

### Testing Async Operations
```ts
it('shows a success message after form submission', async () => {
  const user = userEvent.setup();
  render(<ClaimForm />);

  await user.type(screen.getByLabelText(/amount/i), '1500');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Wait for async result
  expect(await screen.findByText(/claim submitted/i)).toBeInTheDocument();
});
```

## What to Test

| Test | Not Test |
|---|---|
| Component renders correct content given props | Implementation details (state variables, private methods) |
| User interactions trigger correct behavior | CSS class names or inline styles |
| Error states display appropriate messages | Third-party library internals |
| Form validation shows/hides error messages | Exact DOM structure |
| Conditional rendering (loading, empty, error) | TypeScript types (they're checked at compile time) |
| Custom hook return values and state changes | Trivial getters/setters |

## Coverage

```bash
# Run tests with coverage
npx vitest run --coverage

# Watch mode during development
npx vitest
```

### Coverage Targets
| Metric | Target |
|---|---|
| Statements | ≥80% |
| Branches | ≥75% |
| Functions | ≥80% |
| Lines | ≥80% |

- Don't chase 100% — focus on critical paths and business logic
- Exclude test utilities, type files, and config from coverage

## Key Rules

1. **Test behavior, not implementation** — what the user sees, not how the code works internally
2. **Use accessible queries** — `getByRole` and `getByLabelText` first, `getByTestId` last
3. **One assertion concept per test** — multiple `expect` calls are fine if they verify the same behavior
4. **No `test.skip` in main branch** — fix or delete skipped tests
5. **Deterministic tests** — no reliance on time, network, or random values without mocking
6. **Fast tests** — unit tests should run in <5 seconds total
