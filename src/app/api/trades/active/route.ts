import { NextResponse } from "next/server";
import { formatRiskReport, getActiveCount, getActiveTrades } from "@/lib/riskManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const now = Date.now();
  const activeTrades = getActiveTrades().map((trade) => ({
    ...trade,
    openDurationMinutes: Math.max(0, Math.round((now - trade.openTime) / 60000)),
  }));

  return NextResponse.json({
    count: getActiveCount(),
    riskReport: formatRiskReport(),
    activeTrades,
  });
}
