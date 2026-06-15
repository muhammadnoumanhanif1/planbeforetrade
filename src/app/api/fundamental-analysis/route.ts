import { NextResponse } from "next/server";
import { getFundamentalAnalysis } from "@/lib/fundamental-analysis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();

    if (!symbol || !symbol.includes("USDT")) {
      return NextResponse.json(
        { error: "Invalid symbol format. Use format like BTCUSDT" },
        { status: 400 }
      );
    }

    const fundamentalData = await getFundamentalAnalysis(symbol);

    return NextResponse.json(fundamentalData, { status: 200 });
  } catch (error) {
    console.error("[fundamental-analysis-api] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch fundamental analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
