import { normalizeConfigValue } from '@/lib/normalize-config-value'

export function getValidAdsenseClientId(value: string | null | undefined): string | undefined {
  const normalized = normalizeConfigValue(value)
  if (!normalized) return undefined
  return /^ca-pub-\d{16}$/.test(normalized) ? normalized : undefined
}
