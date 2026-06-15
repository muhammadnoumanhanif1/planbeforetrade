import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({
  cookiesFn: vi.fn(),
  readFileFn: vi.fn(),
  writeFileFn: vi.fn(),
  mkdirFn: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocked.cookiesFn,
}))

vi.mock('server-only', () => ({}))

vi.mock('fs/promises', () => ({
  default: {
    readFile: mocked.readFileFn,
    writeFile: mocked.writeFileFn,
    mkdir: mocked.mkdirFn,
  },
  readFile: mocked.readFileFn,
  writeFile: mocked.writeFileFn,
  mkdir: mocked.mkdirFn,
}))

import { POST as loginPOST } from '@/app/api/auth/login/route'
import { POST as logoutPOST } from '@/app/api/auth/logout/route'
import { GET as profileGET, POST as profilePOST } from '@/app/api/profile/route'

const jsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()

  delete process.env.AUTH_USERNAME
  delete process.env.AUTH_PASSWORD
  delete process.env.AUTH_SESSION_SECRET

  mocked.cookiesFn.mockResolvedValue({
    get: vi.fn(() => undefined),
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })

  mocked.readFileFn.mockRejectedValue(new Error('missing'))
  mocked.writeFileFn.mockResolvedValue(undefined)
  mocked.mkdirFn.mockResolvedValue(undefined)
})

describe('auth login/logout routes', () => {
  it('login allows success when auth is not configured (dev mode)', async () => {
    const res = await loginPOST(jsonRequest('http://localhost/api/auth/login', {
      username: 'any',
      password: 'any',
    }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true })
  })

  it('login returns 400 when username or password is missing', async () => {
    process.env.AUTH_USERNAME = 'admin'
    process.env.AUTH_PASSWORD = 'secret'
    process.env.AUTH_SESSION_SECRET = 'session-secret'

    const res = await loginPOST(jsonRequest('http://localhost/api/auth/login', {
      username: 'admin',
    }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Username and password are required' })
  })

  it('login returns 401 for invalid credentials when configured', async () => {
    process.env.AUTH_USERNAME = 'admin'
    process.env.AUTH_PASSWORD = 'secret'
    process.env.AUTH_SESSION_SECRET = 'session-secret'

    const res = await loginPOST(jsonRequest('http://localhost/api/auth/login', {
      username: 'admin',
      password: 'wrong',
    }))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid credentials' })
  })

  it('login sets auth cookie on valid credentials', async () => {
    process.env.AUTH_USERNAME = 'admin'
    process.env.AUTH_PASSWORD = 'secret'
    process.env.AUTH_SESSION_SECRET = 'session-secret'

    const res = await loginPOST(jsonRequest('http://localhost/api/auth/login', {
      username: 'admin',
      password: 'secret',
    }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true })
    expect(res.headers.get('set-cookie')).toContain('pbt_session=')
  })

  it('logout clears auth cookie', async () => {
    const res = await logoutPOST()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true })
    expect(res.headers.get('set-cookie')).toContain('pbt_session=')
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

describe('profile route', () => {
  it('GET returns 401 when session cookie is missing', async () => {
    mocked.cookiesFn.mockResolvedValue({
      get: vi.fn(() => undefined),
    })

    const res = await profileGET()

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('GET returns empty default profile when no file exists', async () => {
    mocked.cookiesFn.mockResolvedValue({
      get: vi.fn(() => ({ value: 'session' })),
    })
    mocked.readFileFn.mockRejectedValueOnce(new Error('file missing'))

    const res = await profileGET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      firstName: '',
      lastName: '',
      username: '',
    })
  })

  it('POST returns 401 when session cookie is missing', async () => {
    mocked.cookiesFn.mockResolvedValue({
      get: vi.fn(() => undefined),
    })

    const res = await profilePOST(jsonRequest('http://localhost/api/profile', {
      firstName: 'A',
      lastName: 'B',
      username: 'ab',
    }))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('POST saves trimmed profile fields for authenticated session', async () => {
    mocked.cookiesFn.mockResolvedValue({
      get: vi.fn(() => ({ value: 'session' })),
    })

    const res = await profilePOST(jsonRequest('http://localhost/api/profile', {
      firstName: '  John  ',
      lastName: '  Doe ',
      username: ' jdoe ',
    }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true })
    expect(mocked.writeFileFn).toHaveBeenCalledOnce()

    const writtenPayload = mocked.writeFileFn.mock.calls[0][1] as string
    expect(writtenPayload).toContain('"firstName": "John"')
    expect(writtenPayload).toContain('"lastName": "Doe"')
    expect(writtenPayload).toContain('"username": "jdoe"')
  })
})
