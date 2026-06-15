import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { hasPremiumAccess } from "@/lib/auth-access";

const VALID_EXCHANGES = new Set(["bitget", "binance", "mexc"]);

async function getAuthenticatedPremiumUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Not authenticated", status: 401 as const };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!hasPremiumAccess(subscription)) return { error: "Premium subscription required", status: 403 as const };
  return { supabase, userId: user.id };
}

export async function GET() {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("saved_analyses")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch saved analyses" }, { status: 500 });
  return NextResponse.json({ analyses: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as {
    exchange?: string;
    symbol?: string;
    timeframe?: string;
    analysisData?: unknown;
    notes?: string;
  };

  const exchange = body.exchange?.toLowerCase() ?? "";
  const symbol = body.symbol?.toUpperCase() ?? "";
  const timeframe = body.timeframe?.trim() ?? "";
  const notes = body.notes?.trim() ?? null;
  const analysisData = body.analysisData;

  if (!VALID_EXCHANGES.has(exchange)) {
    return NextResponse.json({ error: "Invalid exchange" }, { status: 400 });
  }
  if (!symbol || !timeframe || !analysisData || typeof analysisData !== "object") {
    return NextResponse.json({ error: "Missing or invalid analysis payload" }, { status: 400 });
  }
  if (notes && notes.length > 500) {
    return NextResponse.json({ error: "Notes must be 500 characters or less" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("saved_analyses")
    .insert({
      user_id: auth.userId,
      exchange,
      symbol,
      timeframe,
      analysis_data: analysisData as Record<string, unknown>,
      notes,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  return NextResponse.json({ analysis: data });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as { id?: string; notes?: string };
  const id = body.id?.trim();
  const notes = body.notes?.trim();

  if (!id) return NextResponse.json({ error: "Saved analysis id is required" }, { status: 400 });
  if (notes !== undefined && notes.length > 500) {
    return NextResponse.json({ error: "Notes must be 500 characters or less" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("saved_analyses")
    .update({ notes: notes ?? null })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update saved analysis" }, { status: 500 });
  return NextResponse.json({ analysis: data });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Saved analysis id is required" }, { status: 400 });

  const { error } = await auth.supabase.from("saved_analyses").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: "Failed to delete saved analysis" }, { status: 500 });
  return NextResponse.json({ success: true });
}
