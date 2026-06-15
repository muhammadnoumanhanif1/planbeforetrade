/**
 * Test data fixtures for consistent test data across all test files
 */

export const testFixtures = {
  // User fixtures
  users: {
    freeUser: {
      id: 'test-free-user-id',
      email: 'free@example.com',
      created_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        name: 'Free User',
      },
    },
    premiumUser: {
      id: 'test-premium-user-id',
      email: 'premium@example.com',
      created_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        name: 'Premium User',
      },
    },
    adminUser: {
      id: 'test-admin-user-id',
      email: 'admin@example.com',
      created_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        name: 'Admin User',
        role: 'admin',
      },
    },
  },

  // Profile fixtures
  profiles: {
    freeProfile: {
      user_id: 'test-free-user-id',
      tier: 'free',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    premiumProfile: {
      user_id: 'test-premium-user-id',
      tier: 'premium',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },

  // Payment fixtures
  payments: {
    pakistanPayment: {
      id: 'payment-pk-001',
      user_id: 'test-free-user-id',
      amount: 999, // PKR
      provider: 'easypaisa',
      reference: 'EZ123456789',
      status: 'pending',
      created_at: '2024-04-01T00:00:00Z',
    },
    bankTransferPayment: {
      id: 'payment-bank-001',
      user_id: 'test-free-user-id',
      amount: 50, // USD
      reference: 'WIRE123456',
      status: 'pending',
      proof_url: 'https://example.com/proof.pdf',
      created_at: '2024-04-01T00:00:00Z',
    },
  },

  // Subscription fixtures
  subscriptions: {
    activeSubscription: {
      id: 'sub-001',
      user_id: 'test-premium-user-id',
      status: 'active',
      period_start: '2024-03-01T00:00:00Z',
      period_end: '2024-04-01T00:00:00Z',
      created_at: '2024-03-01T00:00:00Z',
    },
    expiredSubscription: {
      id: 'sub-002',
      user_id: 'test-free-user-id',
      status: 'expired',
      period_start: '2024-02-01T00:00:00Z',
      period_end: '2024-03-01T00:00:00Z',
      created_at: '2024-02-01T00:00:00Z',
    },
  },

  // Watchlist fixtures
  watchlists: {
    btcWatchlist: {
      id: 'list-001',
      user_id: 'test-free-user-id',
      name: 'Bitcoin Watch',
      coins: ['bitcoin'],
      created_at: '2024-01-01T00:00:00Z',
    },
    ethWatchlist: {
      id: 'list-002',
      user_id: 'test-premium-user-id',
      name: 'Ethereum Watch',
      coins: ['ethereum', 'ethereum-classic'],
      created_at: '2024-01-01T00:00:00Z',
    },
  },

  // Alert fixtures
  alerts: {
    priceAlert: {
      id: 'alert-001',
      user_id: 'test-free-user-id',
      coin_id: 'bitcoin',
      type: 'price',
      condition: 'above',
      value: 50000,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
  },

  // Analysis fixtures
  analyses: {
    btcAnalysis: {
      id: 'analysis-001',
      user_id: 'test-premium-user-id',
      coin_id: 'bitcoin',
      type: 'technical',
      timeframe: '1d',
      data: {
        rsi: 65,
        macd: 'bullish',
        trend: 'up',
      },
      created_at: '2024-04-01T00:00:00Z',
    },
  },
};

/**
 * Helper to get a user fixture with merged overrides
 */
export const getUser = (overrides = {}) => ({
  ...testFixtures.users.freeUser,
  ...overrides,
});

/**
 * Helper to get a profile fixture with merged overrides
 */
export const getProfile = (overrides = {}) => ({
  ...testFixtures.profiles.freeProfile,
  ...overrides,
});

/**
 * Helper to get a payment fixture with merged overrides
 */
export const getPayment = (overrides = {}) => ({
  ...testFixtures.payments.pakistanPayment,
  ...overrides,
});

/**
 * Helper to get a subscription fixture with merged overrides
 */
export const getSubscription = (overrides = {}) => ({
  ...testFixtures.subscriptions.activeSubscription,
  ...overrides,
});
