type DispatchableSignal = {
  symbol: string;
  confidence: number;
};

export async function dispatchTopOpportunitiesToTelegram<T extends DispatchableSignal>(
  opportunities: T[],
  dispatchSignal: (signal: T) => Promise<boolean>,
  logError: (message: string, error: unknown) => void = (message, error) => console.error(message, error)
): Promise<void> {
  const dispatchCandidates = opportunities.filter((item) => item.confidence >= 65);
  if (!dispatchCandidates.length) return;

  const dispatchResults = await Promise.allSettled(
    dispatchCandidates.map((item) => dispatchSignal(item))
  );

  dispatchResults.forEach((result, index) => {
    if (result.status === "rejected") {
      const item = dispatchCandidates[index];
      logError(`[Telegram Dispatch Error] Failed to send ${item.symbol}:`, result.reason);
    }
  });
}
