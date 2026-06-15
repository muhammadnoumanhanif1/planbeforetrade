// src/app/api/ai-insights/route.ts
import { createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = createAdminClient();

    const [
      { data: weights, error: weightsError },
      { data: performance, error: performanceError },
    ] = await Promise.all([
      admin.from("ai_weights").select("*").order("version", { ascending: false }),
      admin.from("historical_performance").select("*"),
    ]);

    if (weightsError) {
      console.error('[ai-insights] weights error:', weightsError);
      return NextResponse.json(
        { error: `Failed to fetch weights: ${weightsError.message}` },
        { status: 500 }
      );
    }

    if (performanceError) {
      console.error('[ai-insights] performance error:', performanceError);
      return NextResponse.json(
        { error: `Failed to fetch performance: ${performanceError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      weights: weights || [],
      performance: performance || [],
    });
  } catch (error) {
    console.error('[ai-insights] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Unexpected error: ${message}` },
      { status: 500 }
    );
  }
}