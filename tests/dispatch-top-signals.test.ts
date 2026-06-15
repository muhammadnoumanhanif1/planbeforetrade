import { describe, expect, it, vi } from "vitest";
import { dispatchTopOpportunitiesToTelegram } from "@/lib/dispatchTopSignals";

type MockSignal = {
  symbol: string;
  confidence: number;
};

describe("dispatchTopOpportunitiesToTelegram", () => {
  it("dispatches only eligible signals and waits for completion", async () => {
    let resolveDispatch: (() => void) | null = null;
    const dispatchSignal = vi.fn(
      (signal: MockSignal) =>
        new Promise<boolean>((resolve) => {
          if (signal.symbol === "BTCUSDT") {
            resolveDispatch = () => resolve(true);
            return;
          }
          resolve(true);
        })
    );

    let completed = false;
    const execution = dispatchTopOpportunitiesToTelegram(
      [
        { symbol: "BTCUSDT", confidence: 90 },
        { symbol: "ETHUSDT", confidence: 50 },
      ],
      dispatchSignal
    ).then(() => {
      completed = true;
    });

    await Promise.resolve();
    expect(dispatchSignal).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);

    resolveDispatch?.();
    await execution;
    expect(completed).toBe(true);
  });

  it("logs errors for failed signals while continuing to dispatch remaining signals", async () => {
    const dispatchSignal = vi.fn(async (signal: MockSignal) => {
      if (signal.symbol === "ETHUSDT") throw new Error("send failed");
      return true;
    });
    const logError = vi.fn();

    await dispatchTopOpportunitiesToTelegram(
      [
        { symbol: "BTCUSDT", confidence: 92 },
        { symbol: "ETHUSDT", confidence: 81 },
        { symbol: "XRPUSDT", confidence: 40 },
      ],
      dispatchSignal,
      logError
    );

    expect(dispatchSignal).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][0]).toContain("ETHUSDT");
  });
});
