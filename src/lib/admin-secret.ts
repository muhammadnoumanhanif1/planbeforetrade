import { normalizeConfigValue } from '@/lib/normalize-config-value'

export function isValidAdminSecret(inputSecret: string | null): boolean {
  const provided = normalizeConfigValue(inputSecret)
  if (!provided) return false;

  const expected =
    normalizeConfigValue(process.env.ADMIN_SECRET) ??
    normalizeConfigValue(process.env.ADMIN_SECRET_KEY)

  if (!expected) return false;
  return provided === expected;
}
