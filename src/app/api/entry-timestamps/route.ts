import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { error: "Not authenticated", status: 401 as const };
  return { supabase, userId: user.id };
}

/**
 * GET /api/entry-timestamps
 * Returns all entry timestamps for the current user as a JSON object:
 * { timestamps: { [symbol]: hit_at_iso_string } }
 */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("entry_timestamps")
    .select("symbol, hit_at")
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch entry timestamps" }, { status: 500 });
  }

  const timestamps: Record<string, string> = {};
  for (const row of data ?? []) {
    timestamps[row.symbol] = row.hit_at;
  }

  return NextResponse.json({ timestamps });
}

/**
 * PUT /api/entry-timestamps
 * Upserts an entry timestamp for a symbol.
 * Body: { symbol: string; hit_at: string }
 */
export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { symbol?: unknown; hit_at?: unknown };
  try {
    body = (await request.json()) as { symbol?: unknown; hit_at?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const hit_at = typeof body.hit_at === "string" ? body.hit_at.trim() : "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  if (!hit_at) {
    return NextResponse.json({ error: "hit_at is required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("entry_timestamps").upsert(
    { user_id: auth.userId, symbol, hit_at },
    { onConflict: "user_id,symbol" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save entry timestamp" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/entry-timestamps?symbol=BTCUSDT
 * Removes the entry timestamp for a specific symbol.
 */
export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase() ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol query parameter is required" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("entry_timestamps")
    .delete()
    .eq("user_id", auth.userId)
    .eq("symbol", symbol);

  if (error) {
    return NextResponse.json({ error: "Failed to delete entry timestamp" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
