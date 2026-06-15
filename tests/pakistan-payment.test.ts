import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as pakistanSubmitPOST } from '@/app/api/billing/pakistan/submit/route'
import { GET as pakistanVerifyGET, POST as pakistanVerifyPOST } from '@/app/api/billing/pakistan/verify/route'
import { GET as bankVerifyGET, POST as bankVerifyPOST } from '@/app/api/billing/bank-transfer/verify/route'

const {
  createServerClientMock,
  createAdminClientMock,
  sendPaymentVerificationEmailMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  sendPaymentVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: createServerClientMock,
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/email-service', () => ({
  sendPaymentVerificationEmail: sendPaymentVerificationEmailMock,
}))

type Row = Record<string, unknown>

type QueryState = {
  filters: Record<string, unknown>
}

const createQuery = (
  table: string,
  handlers: {
    maybeSingle?: (state: QueryState) => { data: Row | null; error: Row | null }
    single?: (state: QueryState) => { data: Row | null; error: Row | null }
    limit?: (state: QueryState) => { data: Row[]; error: Row | null }
  }
) => {
  const state: QueryState = { filters: {} }

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn((key: string, value: unknown) => {
      state.filters[key] = value
      return builder
    }),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => {
      if (handlers.limit) return handlers.limit(state)
      return { data: [], error: null }
    }),
    maybeSingle: vi.fn(async () => {
      if (handlers.maybeSingle) return handlers.maybeSingle(state)
      return { data: null, error: null }
    }),
    single: vi.fn(async () => {
      if (handlers.single) return handlers.single(state)
      return { data: null, error: null }
    }),
  }

  return { table, builder }
}

const jsonRequest = (url: string, body: unknown, headers?: HeadersInit) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  })

const getRequest = (url: string, headers?: HeadersInit) =>
  new Request(url, {
    method: 'GET',
    headers: headers || {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_SECRET = 'admin-secret'
})

describe('Pakistan submit route', () => {
  it('returns 401 when user is not authenticated', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'auth' } }),
      },
    })

    const res = await pakistanSubmitPOST(jsonRequest('http://localhost/api/billing/pakistan/submit', {
      provider: 'easypaisa',
      transactionId: 'TXN-1',
      phoneNumber: '03001234567',
      amount: 350,
      plan: 'weekly',
    }) as never)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Please log in to submit payment' })
  })

  it('returns 400 for invalid provider', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
    })

    const res = await pakistanSubmitPOST(jsonRequest('http://localhost/api/billing/pakistan/submit', {
      provider: 'bitcoin',
      transactionId: 'TXN-1',
      phoneNumber: '03001234567',
      amount: 350,
      plan: 'weekly',
    }) as never)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid payment provider' })
  })

  it('returns 200 and payment id on success', async () => {
    const profileQuery = createQuery('profiles', {
      single: () => ({ data: { email: 'user@example.com' }, error: null }),
    })

    const pendingCheckQuery = createQuery('pakistan_payments', {
      maybeSingle: ({ filters }) => {
        if (filters.status === 'pending') return { data: null, error: null }
        if (filters.transaction_id) return { data: null, error: null }
        return { data: null, error: null }
      },
    })

    const insertQuery = createQuery('pakistan_payments', {
      single: () => ({ data: { id: 'p-123' }, error: null }),
    })

    let callCount = 0
    const from = vi.fn((table: string) => {
      if (table === 'profiles') return profileQuery.builder
      if (table === 'pakistan_payments') {
        callCount += 1
        return callCount <= 2 ? pendingCheckQuery.builder : insertQuery.builder
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
      from,
    })

    const res = await pakistanSubmitPOST(jsonRequest('http://localhost/api/billing/pakistan/submit', {
      provider: 'easypaisa',
      transactionId: 'TXN-1',
      phoneNumber: '03001234567',
      amount: 350,
      plan: 'weekly',
    }) as never)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true, paymentId: 'p-123' })
    expect(from).toHaveBeenCalledWith('pakistan_payments')
    expect(from).toHaveBeenCalledWith('profiles')
  })
})

describe('Pakistan verify admin route', () => {
  it('returns 401 without admin secret', async () => {
    const res = await pakistanVerifyPOST(jsonRequest('http://localhost/api/billing/pakistan/verify', {
      paymentId: 'p-1',
      action: 'approve',
    }) as never)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 for invalid action', async () => {
    const res = await pakistanVerifyPOST(
      jsonRequest('http://localhost/api/billing/pakistan/verify', {
        paymentId: 'p-1',
        action: 'noop',
      }, { 'x-admin-secret': 'admin-secret' }) as never
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid action. Must be "approve" or "reject"' })
  })

  it('GET returns 400 for invalid status filter', async () => {
    createAdminClientMock.mockReturnValue({ from: vi.fn() })

    const res = await pakistanVerifyGET(
      getRequest('http://localhost/api/billing/pakistan/verify?status=bad', { 'x-admin-secret': 'admin-secret' }) as never
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid status filter' })
  })
})

describe('Bank transfer verify admin route', () => {
  it('GET returns 401 when admin secret is missing', async () => {
    const res = await bankVerifyGET(getRequest('http://localhost/api/billing/bank-transfer/verify') as never)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('GET returns 400 for invalid status filter', async () => {
    createAdminClientMock.mockReturnValue({ from: vi.fn() })

    const res = await bankVerifyGET(
      getRequest('http://localhost/api/billing/bank-transfer/verify?status=bad', { 'x-admin-secret': 'admin-secret' }) as never
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid status filter' })
  })

  it('POST returns 400 when payload is missing required fields', async () => {
    const res = await bankVerifyPOST(
      jsonRequest('http://localhost/api/billing/bank-transfer/verify', { action: 'approve' }, { 'x-admin-secret': 'admin-secret' }) as never
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Missing required fields: paymentId and action' })
  })
})
