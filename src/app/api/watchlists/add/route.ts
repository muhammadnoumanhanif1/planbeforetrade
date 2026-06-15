import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { hasPremiumAccess } from "@/lib/auth-access";

const VALID_EXCHANGES = new Set(["bitget", "binance", "mexc"]);
const DEFAULT_WATCHLIST_NAME = "My Coins";

type WatchlistCoinWithAnalysis = {
  exchange: string;
  symbol: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: number;
  recommendation?: "LONG" | "SHORT";
  timeframe?: string;
  createdAt?: string;
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

export async function POST(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await request.json()) as WatchlistCoinWithAnalysis;
    const exchange = typeof body.exchange === "string" ? body.exchange.toLowerCase() : "";
    const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";

    if (!VALID_EXCHANGES.has(exchange) || !symbol) {
      return NextResponse.json(
        { error: "Invalid exchange or symbol" },
        { status: 400 }
      );
    }

    // Get or create default watchlist
    const { data: existingWatchlist } = await auth.supabase
      .from("watchlists")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("name", DEFAULT_WATCHLIST_NAME)
      .maybeSingle();

    let watchlistId: string;
    let currentCoins: WatchlistCoinWithAnalysis[] = [];

    if (existingWatchlist) {
      watchlistId = existingWatchlist.id;
      currentCoins = Array.isArray(existingWatchlist.coins) ? existingWatchlist.coins : [];
    } else {
      // Create new default watchlist
      const { data: newWatchlist, error: createError } = await auth.supabase
        .from("watchlists")
        .insert({
          user_id: auth.userId,
          name: DEFAULT_WATCHLIST_NAME,
          coins: [],
        })
        .select("*")
        .single();

      if (createError || !newWatchlist) {
        return NextResponse.json(
          { error: "Failed to create watchlist" },
          { status: 500 }
        );
      }
      watchlistId = newWatchlist.id;
    }

    // Check if coin already exists (by exchange + symbol)
    const coinExists = currentCoins.some(
      (coin) => coin.exchange === exchange && coin.symbol === symbol
    );

    if (coinExists) {
      return NextResponse.json(
        { error: "Coin already in watchlist", watchlistId },
        { status: 200 }
      );
    }

    // Prepare new coin with analysis data
    const newCoin: WatchlistCoinWithAnalysis = {
      exchange,
      symbol,
      entryPrice: body.entryPrice,
      targetPrice: body.targetPrice,
      stopLoss: body.stopLoss,
      tp1: body.tp1,
      tp2: body.tp2,
      tp3: body.tp3,
      confidence: body.confidence,
      recommendation: body.recommendation,
      timeframe: body.timeframe,
      createdAt: new Date().toISOString(),
    };

    // Add new coin
    const updatedCoins = [...currentCoins, newCoin];

    const { data: updatedWatchlist, error: updateError } = await auth.supabase
      .from("watchlists")
      .update({
        coins: updatedCoins,
        updated_at: new Date().toISOString(),
      })
      .eq("id", watchlistId)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (updateError || !updatedWatchlist) {
      return NextResponse.json(
        { error: "Failed to add coin to watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      watchlist: updatedWatchlist,
      message: `${symbol} added to ${DEFAULT_WATCHLIST_NAME}`,
    });
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
