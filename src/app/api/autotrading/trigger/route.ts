import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { scanMarketSignals } from "@/lib/signals/marketScanner";
import { calculateAdaptiveAiScore } from "@/lib/ai-learning/engine";
import { executeTrade } from "@/lib/tradeExecutor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const TIMEFRAME = "1h";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin users can trigger the bot
  if (user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const adminClient = await import("@/lib/supabase-server").then((m) => m.createAdminClient());

  const { data: signals, error } = await adminClient
    .from("market_structure_signals")
    .select("*")
    .in("symbol", SYMBOLS)
    .eq("timeframe", TIMEFRAME)
    .gte("confidence", 75)
    .in("setup", ["READY", "TRIGGERED"])
    .order("confidence", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    return NextResponse.json({ message: "No eligible signals", executed: 0, results: [] });
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

  const executed = results.filter((r) => r.success).length;

  return NextResponse.json({
    message: "Scan complete",
    signalsFound: signals.length,
    executed,
    results,
  });
}
