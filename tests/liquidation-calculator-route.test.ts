import { describe, expect, it, vi, beforeEach } from "vitest";

const createServerClientMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("liquidation calculator route", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
    redirectMock.mockClear();
  });

  it("allows unauthenticated visitors to render the calculator", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const { default: LiquidationCalculatorPage } = await import("../src/app/liquidation-calculator/page");

    await expect(LiquidationCalculatorPage()).resolves.toBeTruthy();
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("allows authenticated visitors to render the calculator", async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      },
    });

    const { default: LiquidationCalculatorPage } = await import("../src/app/liquidation-calculator/page");

    await expect(LiquidationCalculatorPage()).resolves.toBeTruthy();
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
