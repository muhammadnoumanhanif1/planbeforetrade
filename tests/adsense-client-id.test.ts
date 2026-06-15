import { describe, expect, it } from 'vitest'

import { getValidAdsenseClientId } from '@/lib/adsense'

describe('getValidAdsenseClientId', () => {
  it('returns normalized valid AdSense client ID', () => {
    expect(getValidAdsenseClientId(' "ca-pub-1234567890123456" ')).toBe('ca-pub-1234567890123456')
  })

  it('rejects invalid AdSense client IDs', () => {
    expect(getValidAdsenseClientId('ca-pub-invalid')).toBeUndefined()
    expect(getValidAdsenseClientId('ca-pub-12345')).toBeUndefined()
    expect(getValidAdsenseClientId('')).toBeUndefined()
    expect(getValidAdsenseClientId(undefined)).toBeUndefined()
  })
})
