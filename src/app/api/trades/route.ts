import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const tradeData = await request.json();

  // TODO: Add validation for tradeData

  const { data: trade, error } = await supabase
    .from("ai_trade_history")
    .insert([tradeData])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update historical_performance table
  const { symbol, trend, strategy_type, result, result_r } = tradeData;
  const setup_signature = `${symbol}-${trend}-${strategy_type}`;

  const { data: performanceData, error: performanceError } = await supabase
    .from("historical_performance")
    .select("*")
    .eq("setup_signature", setup_signature)
    .single();

  if (performanceError && performanceError.code !== "PGRST116") {
    // PGRST116: "The result contains 0 rows"
    return NextResponse.json({ error: performanceError.message }, { status: 500 });
  }

  if (performanceData) {
    // Update existing performance data
    const newTotalTrades = performanceData.total_trades + 1;
    const newWins = result === "WIN" ? performanceData.wins + 1 : performanceData.wins;
    const newLosses = result === "LOSS" ? performanceData.losses + 1 : performanceData.losses;
    const newWinRate = (newWins / newTotalTrades) * 100;
    const newAverageR =
      (performanceData.average_r * performanceData.total_trades + result_r) / newTotalTrades;

    const { error: updateError } = await supabase
      .from("historical_performance")
      .update({
        total_trades: newTotalTrades,
        wins: newWins,
        losses: newLosses,
        win_rate: newWinRate,
        average_r: newAverageR,
      })
      .eq("setup_signature", setup_signature);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    // Insert new performance data
    const newTotalTrades = 1;
    const newWins = result === "WIN" ? 1 : 0;
    const newLosses = result === "LOSS" ? 1 : 0;
    const newWinRate = (newWins / newTotalTrades) * 100;
    const newAverageR = result_r;

    const { error: insertError } = await supabase
      .from("historical_performance")
      .insert([
        {
          setup_signature,
          total_trades: newTotalTrades,
          wins: newWins,
          losses: newLosses,
          win_rate: newWinRate,
          average_r: newAverageR,
        },
      ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ trade });
}
