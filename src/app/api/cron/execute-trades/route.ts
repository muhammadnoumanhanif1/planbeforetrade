import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { scanMarketSignals } from "@/lib/signals/marketScanner";
import { calculateAdaptiveAiScore } from "@/lib/ai-learning/engine";
import { executeTrade } from "@/lib/tradeExecutor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const TIMEFRAME = "1h";

export async function GET() {
  console.log("[Cron] Execute-trades started");
  const isLiveMode = (process.env.TRADING_MODE || "test") === "live";

  const supabase = await createAdminClient();

  // Fetch recent signals from market_structure_signals view
  const { data: signals, error } = await supabase
    .from("market_structure_signals")
    .select("*")
    .in("symbol", SYMBOLS)
    .eq("timeframe", TIMEFRAME)
    .gte("confidence", 75)
    .in("setup", ["READY", "TRIGGERED"])
    .order("confidence", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[Cron] Fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    console.log("[Cron] No eligible signals");
    return NextResponse.json({ message: "No eligible signals", executed: 0 });
  }

  const results: { symbol: string; success: boolean; message: string }[] = [];

  for (const sig of signals) {
    const result = await executeTrade(sig);
    results.push({
      symbol: sig.symbol,
      success: result.success,
      message: result.message,
    });
  }

  const executed = isLiveMode ? results.filter((r) => r.success).length : 0;

  return NextResponse.json({
    message: "Scan complete",
    signalsFound: signals.length,
    executed,
    results,
  });
}