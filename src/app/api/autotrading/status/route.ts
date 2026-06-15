import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getActiveCount, getDailyLossCount, formatRiskReport, MAX_ACTIVE_TRADES, DAILY_LOSS_LIMIT_R } from "@/lib/riskManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tradingMode = process.env.TRADING_MODE || "test";
  const isLive = tradingMode === "live";

  return NextResponse.json({
    tradingMode,
    isLive,
    activeCount: getActiveCount(),
    maxActiveTrades: MAX_ACTIVE_TRADES,
    dailyLossCount: getDailyLossCount(),
    dailyLossLimit: DAILY_LOSS_LIMIT_R,
    riskReport: formatRiskReport(),
    binanceConfigured: !!(process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY),
    telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  });
}
