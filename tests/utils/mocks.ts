import { vi } from 'vitest';

/**
 * Mock Supabase client for testing
 */
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    single: vi.fn(),
    data: null,
    error: null,
  })),
  storage: {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
};

/**
 * Mock functions for common API responses
 */
export const mockApiResponses = {
  success: (data: unknown) => new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  
  error: (message: string, status = 400) => new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  ),
  
  unauthorized: () => new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  ),
  
  notFound: () => new Response(
    JSON.stringify({ error: 'Not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  ),
};

/**
 * Mock fetch and related global APIs for testing
 */
export const setupFetchMocks = () => {
  global.fetch = vi.fn();
  return global.fetch;
};

export const resetFetchMocks = () => {
  vi.resetAllMocks();
};
