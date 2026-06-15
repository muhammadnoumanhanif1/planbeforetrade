import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { hasPremiumAccess } from "@/lib/auth-access";

const VALID_EXCHANGES = new Set(["bitget", "binance", "mexc"]);

type WatchlistCoin = {
  exchange: string;
  symbol: string;
};

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

function normalizeCoins(input: unknown): WatchlistCoin[] | null {
  if (!Array.isArray(input)) return null;

  const normalized = input
    .map((coin) => {
      if (!coin || typeof coin !== "object") return null;
      const maybeCoin = coin as { exchange?: unknown; symbol?: unknown };
      const exchange = typeof maybeCoin.exchange === "string" ? maybeCoin.exchange.toLowerCase() : "";
      const symbol = typeof maybeCoin.symbol === "string" ? maybeCoin.symbol.toUpperCase() : "";
      if (!VALID_EXCHANGES.has(exchange) || !symbol) return null;
      return { exchange, symbol };
    })
    .filter((coin): coin is WatchlistCoin => coin !== null);

  return normalized;
}

export async function GET() {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("watchlists")
    .select("*")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch watchlists" }, { status: 500 });
  return NextResponse.json({ watchlists: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as { name?: string; coins?: unknown };
  const name = body.name?.trim();
  const coins = normalizeCoins(body.coins ?? []);

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name is required (max 60 characters)" }, { status: 400 });
  }
  if (!coins) return NextResponse.json({ error: "Invalid coins format" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("watchlists")
    .insert({
      user_id: auth.userId,
      name,
      coins,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create watchlist" }, { status: 500 });
  return NextResponse.json({ watchlist: data });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as { id?: string; name?: string; coins?: unknown };
  const id = body.id?.trim();
  const updates: { name?: string; coins?: WatchlistCoin[]; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (!id) return NextResponse.json({ error: "Watchlist id is required" }, { status: 400 });
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed || trimmed.length > 60) {
      return NextResponse.json({ error: "Name must be between 1 and 60 characters" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (body.coins !== undefined) {
    const coins = normalizeCoins(body.coins);
    if (!coins) return NextResponse.json({ error: "Invalid coins format" }, { status: 400 });
    updates.coins = coins;
  }

  const { data, error } = await auth.supabase
    .from("watchlists")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update watchlist" }, { status: 500 });
  return NextResponse.json({ watchlist: data });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Watchlist id is required" }, { status: 400 });

  const { error } = await auth.supabase.from("watchlists").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: "Failed to delete watchlist" }, { status: 500 });
  return NextResponse.json({ success: true });
}
