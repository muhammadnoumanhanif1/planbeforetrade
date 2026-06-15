import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { hasPremiumAccess } from "@/lib/auth-access";

const VALID_EXCHANGES = new Set(["bitget", "binance", "mexc"]);
const VALID_CONDITIONS = new Set(["above", "below"]);

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

  // TODO: replace `any` bridge once `alerts` table exists in generated supabase types.
  const supabase = auth.supabase as any;

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // TODO: replace `any` bridge once `alerts` table exists in generated supabase types.
  const supabase = auth.supabase as any;

  const body = (await request.json()) as {
    exchange?: string;
    symbol?: string;
    condition?: string;
    targetPrice?: number;
  };

  const exchange = body.exchange?.toLowerCase() ?? "";
  const symbol = body.symbol?.toUpperCase() ?? "";
  const condition = body.condition?.toLowerCase() ?? "";
  const targetPrice = Number(body.targetPrice);

  if (!VALID_EXCHANGES.has(exchange)) return NextResponse.json({ error: "Invalid exchange" }, { status: 400 });
  if (!symbol) return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  if (!VALID_CONDITIONS.has(condition)) return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return NextResponse.json({ error: "Target price must be a positive number" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: auth.userId,
      exchange,
      symbol,
      condition: condition as "above" | "below",
      target_price: targetPrice,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  return NextResponse.json({ alert: data });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // TODO: replace `any` bridge once `alerts` table exists in generated supabase types.
  const supabase = auth.supabase as any;

  const body = (await request.json()) as { id?: string; isActive?: boolean };
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "Alert id is required" }, { status: 400 });
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be true or false" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .update({ is_active: body.isActive })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // TODO: replace `any` bridge once `alerts` table exists in generated supabase types.
  const supabase = auth.supabase as any;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Alert id is required" }, { status: 400 });

  const { error } = await supabase.from("alerts").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  return NextResponse.json({ success: true });
}
