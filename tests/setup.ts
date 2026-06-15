import { afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Global test setup file
 * Runs once before all tests
 */

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

/**
 * Mock Window.matchMedia
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock IntersectionObserver
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

/**
 * Mock ResizeObserver
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

/**
 * Clean up after each test
 */
afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Suppress console errors in tests (optional)
 * Uncomment if you want to suppress console errors
 */
// const originalError = console.error;
// beforeEach(() => {
//   console.error = vi.fn();
// });
//
// afterEach(() => {
//   console.error = originalError;
// });
