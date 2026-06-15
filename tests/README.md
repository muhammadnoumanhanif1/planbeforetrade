# Test Suite Documentation

This directory contains all automated tests for the planbeforetrade project.

## Overview

- **Framework**: Vitest
- **Testing Library**: @testing-library/react
- **Environment**: jsdom (headless browser simulation)
- **Coverage Target**: 30% minimum, 100% for critical paths (payments, auth)

## Test Directory Structure

```
tests/
├── setup.ts                 # Global test setup, mocks, and configuration
├── utils/
│   ├── render.tsx          # Custom render function with providers
│   ├── mocks.ts            # Supabase and API mocks
│   ├── fixtures.ts         # Test data fixtures
├── components/             # Component tests
│   ├── __tests__/
│   │   └── Component.test.tsx
├── pages/                  # Page/route tests
│   ├── __tests__/
│   │   └── page.test.tsx
├── api/                    # API route tests
│   ├── __tests__/
│   │   └── route.test.ts
└── lib/                    # Utility function tests
    ├── __tests__/
        └── utility.test.ts
```

## Writing Tests

### Basic Test File Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@/tests/utils/render';
import { testFixtures } from '@/tests/utils/fixtures';
import { mockSupabaseClient } from '@/tests/utils/mocks';

describe('Component/API/Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something expected', () => {
    // Arrange
    const expectedValue = 'test';

    // Act
    const result = someFunction();

    // Assert
    expect(result).toBe(expectedValue);
  });

  it('should handle error cases', async () => {
    // Setup
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: null,
      error: new Error('Not authenticated'),
    });

    // Execute and verify
    await expect(protectedFunction()).rejects.toThrow('Not authenticated');
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/render';
import { UserProfile } from '@/components/UserProfile';
import { testFixtures } from '@/tests/utils/fixtures';

describe('UserProfile Component', () => {
  it('should display user name and tier', () => {
    const user = testFixtures.users.premiumUser;
    
    render(<UserProfile user={user} />);

    expect(screen.getByText('Premium User')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show upgrade button for free users', () => {
    const user = testFixtures.users.freeUser;
    
    render(<UserProfile user={user} />);

    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
});
```

### API Route Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '@/app/api/billing/pakistan/submit/route';
import { testFixtures } from '@/tests/utils/fixtures';

describe('POST /api/billing/pakistan/submit', () => {
  it('should accept valid payment submission', async () => {
    const request = new Request('http://localhost:3000/api/billing/pakistan/submit', {
      method: 'POST',
      body: JSON.stringify({
        amount: 999,
        provider: 'easypaisa',
        reference: 'EZ123456789',
      }),
    });

    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
  });

  it('should reject missing required fields', async () => {
    const request = new Request('http://localhost:3000/api/billing/pakistan/submit', {
      method: 'POST',
      body: JSON.stringify({ amount: 999 }), // missing provider, reference
    });

    const response = await handler(request);

    expect(response.status).toBe(400);
    expect(response.statusText).toBe('Bad Request');
  });
});
```

## Using Test Fixtures

Test fixtures provide consistent test data:

```typescript
import { testFixtures, getUser, getProfile } from '@/tests/utils/fixtures';

// Use predefined fixtures
const user = testFixtures.users.premiumUser;
const payment = testFixtures.payments.pakistanPayment;

// Or use helpers with overrides
const customUser = getUser({ email: 'custom@example.com' });
const customPayment = getPayment({ amount: 5000, status: 'verified' });
```

## Using Mocks

### Mock API Responses

```typescript
import { mockApiResponses } from '@/tests/utils/mocks';

global.fetch = vi.fn()
  .mockResolvedValueOnce(mockApiResponses.success({ id: '123' }))
  .mockResolvedValueOnce(mockApiResponses.error('Invalid input', 400));
```

### Mock Supabase Client

```typescript
import { mockSupabaseClient } from '@/tests/utils/mocks';

mockSupabaseClient.from('profiles').select.mockReturnValueOnce({
  data: [testFixtures.profiles.freeProfile],
  error: null,
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# View interactive test UI
npm run test:ui

# Run specific test file
npm test -- tests/api/auth.test.ts

# Run tests matching a pattern
npm test -- --grep "payment"
```

## Coverage Reports

Coverage reports are generated in `coverage/` directory:

```bash
npm run test:coverage
```

Generated reports:
- **HTML**: `coverage/index.html` - Open in browser for detailed view
- **LCOV**: `coverage/lcov.info` - For CI/CD integration
- **JSON**: `coverage/coverage-final.json` - Machine-readable format

### Coverage Goals by component

| Component | Coverage Target | Notes |
| --------- | --------------- | ----- |
| Payment APIs | 100% | Critical path |
| Auth APIs | 100% | Critical path |
| Billing logic | 100% | Critical path |
| UI Components | 80% | User-facing |
| Utilities | 80% | Helpers |
| Overall | 30% | Minimum acceptable |

## Best Practices

### 1. Use Descriptive Test Names

❌ Bad:
```typescript
it('works', () => {});
```

✅ Good:
```typescript
it('should verify payment status when admin submits approval', () => {});
```

### 2. Follow AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate subscription period correctly', () => {
  // Arrange
  const startDate = new Date('2024-04-01');
  
  // Act
  const endDate = calculatePeriodEnd(startDate, 'monthly');
  
  // Assert
  expect(endDate).toEqual(new Date('2024-05-01'));
});
```

### 3. Test Behavior, Not Implementation

❌ Bad:
```typescript
it('should call calculateTier on mount', () => {
  vi.spyOn(module, 'calculateTier');
  // ...
});
```

✅ Good:
```typescript
it('should display premium badge for premium users', () => {
  render(<Profile user={premiumUser} />);
  expect(screen.getByText('Premium')).toBeInTheDocument();
});
```

### 4. Use Meaningful Assertions

```typescript
// ❌ Not helpful
expect(result).toBe(true);

// ✅ Clear intent
expect(isUserAuthenticated).toBe(true);
expect(screen.getByText('Welcome, Admin')).toBeInTheDocument();
```

### 5. Keep Tests Independent

Each test should be able to run in any order without depending on other tests.

```typescript
describe('Payment Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
  });

  it('test 1', () => {});
  it('test 2', () => {}); // Should work regardless of execution order
});
```

## Common Patterns

### Testing Async API Calls

```typescript
it('should fetch user profile', async () => {
  mockSupabaseClient.from('profiles')
    .select.mockReturnValueOnce({
      data: [testFixtures.profiles.premiumProfile],
      error: null,
    });

  const profile = await getUserProfile('user-id');
  
  expect(profile.tier).toBe('premium');
});
```

### Testing Error Handling

```typescript
it('should handle network errors gracefully', async () => {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
  
  const result = await submitPayment(validData);
  
  expect(result.error).toBeTruthy();
  expect(result.error.message).toContain('Network');
});
```

### Testing User Interactions

```typescript
import { userEvent } from '@testing-library/user-event';

it('should submit form on button click', async () => {
  const user = userEvent.setup();
  render(<PaymentForm onSubmit={mockSubmit} />);
  
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(mockSubmit).toHaveBeenCalled();
});
```

### Testing Context/Providers

```typescript
const TestWrapper = ({ children }) => (
  <AuthProvider>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </AuthProvider>
);

render(<MyComponent />, { wrapper: TestWrapper });
```

## Debugging Tests

### Print Debug Info

```typescript
import { screen, debug } from '@testing-library/react';

debug(); // Print entire DOM
debug(screen.getByRole('button')); // Print specific element
```

### Run Single Test

```bash
npm test -- --grep "should verify payment"
```

### Run Tests with Detailed Output

```bash
npm test -- --reporter=verbose
```

### Interactive UI Debug

```bash
npm run test:ui
```

Opens interactive test dashboard at `http://localhost:51204/__vitest__/`

## Continuous Integration

Tests can be run in CI/CD pipelines. Example GitHub Actions:

```yaml
- name: Run tests
  run: npm test -- --run --coverage
```

## Need Help?

- **Vitest Docs**: https://vitest.dev/
- **Testing Library Docs**: https://testing-library.com/react
- **vitest UI**: Open `npm run test:ui`

## Next Steps

1. Phase 3.2: Write payment flow tests (12 hours)
2. Phase 3.3: Write auth & profile tests (8 hours)
3. Phase 3.4: Fix dev issues and console warnings
4. Phase 3.5: Performance benchmarking
5. Phase 3.6: Bug fixes from QA
