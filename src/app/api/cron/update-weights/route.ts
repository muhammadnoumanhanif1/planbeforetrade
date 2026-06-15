import { createAdminClient } from "@/lib/supabase-server";
import { recalculateAiWeights, AiTradeRecord } from "@/lib/ai-learning/engine";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: tradeRows, error: tradeError } = await admin
      .from("ai_trade_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3000);

    if (tradeError) {
      throw new Error(tradeError.message);
    }

    const newWeights = recalculateAiWeights(tradeRows as AiTradeRecord[]);

    const { data: latestWeights, error: latestWeightsError } = await admin
      .from("ai_weights")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (latestWeightsError && latestWeightsError.code !== "PGRST116") {
      throw new Error(latestWeightsError.message);
    }

    const newVersion = (latestWeights?.version || 0) + 1;

    const { error: insertError } = await admin.from("ai_weights").insert([
      {
        version: newVersion,
        ...newWeights,
      },
    ]);

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ message: "Weights updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update weights", details: error.message },
      { status: 500 }
    );
  }
}
