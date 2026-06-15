function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isTemporaryPublicAccessEnabled(): boolean {
  const explicitAccessFlag =
    process.env.TEMPORARY_PUBLIC_ACCESS ??
    process.env.NEXT_PUBLIC_TEMPORARY_PUBLIC_ACCESS;

  if (explicitAccessFlag === undefined) {
    return true;
  }

  return isTruthyFlag(explicitAccessFlag);
}

export function isTemporarySaasBypassEnabled(): boolean {
  const explicitBypassFlag =
    process.env.TEMPORARY_SAAS_BYPASS ??
    process.env.NEXT_PUBLIC_TEMPORARY_SAAS_BYPASS;

  return isTruthyFlag(explicitBypassFlag);
}

export function hasPremiumAccess(subscription: unknown): boolean {
  return isTemporarySaasBypassEnabled() || !!subscription;
}
