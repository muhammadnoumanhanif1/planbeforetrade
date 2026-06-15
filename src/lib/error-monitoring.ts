type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}) {
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  // Replace with Sentry/Datadog later.
  console.error("[monitoring]", {
    ...normalizedError,
    context,
    timestamp: new Date().toISOString(),
  });
}
