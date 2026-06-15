import { describe, it, expect, beforeEach } from 'vitest'

import { isValidAdminSecret } from '@/lib/admin-secret'

describe('admin secret validation', () => {
  beforeEach(() => {
    delete process.env.ADMIN_SECRET
    delete process.env.ADMIN_SECRET_KEY
  })

  it('accepts ADMIN_SECRET when it matches', () => {
    process.env.ADMIN_SECRET = 'my-secret'
    expect(isValidAdminSecret('my-secret')).toBe(true)
  })

  it('accepts ADMIN_SECRET_KEY as a fallback', () => {
    process.env.ADMIN_SECRET_KEY = 'my-secret-key'
    expect(isValidAdminSecret('my-secret-key')).toBe(true)
  })

  it('normalizes surrounding quotes and whitespace', () => {
    process.env.ADMIN_SECRET = ' "quoted-secret" '
    expect(isValidAdminSecret('quoted-secret')).toBe(true)
  })

  it('rejects when secret is missing', () => {
    expect(isValidAdminSecret('anything')).toBe(false)
  })

  it('rejects when provided secret does not match', () => {
    process.env.ADMIN_SECRET = 'correct-secret'
    expect(isValidAdminSecret('wrong-secret')).toBe(false)
  })

  it('rejects null input', () => {
    process.env.ADMIN_SECRET = 'my-secret'
    expect(isValidAdminSecret(null)).toBe(false)
  })
})
