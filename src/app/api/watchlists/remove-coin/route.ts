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

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedPremiumUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const watchlistId = searchParams.get("watchlistId");
    const exchange = searchParams.get("exchange");
    const symbol = searchParams.get("symbol");

    if (!watchlistId || !exchange || !symbol) {
      return NextResponse.json(
        { error: "watchlistId, exchange, and symbol are required" },
        { status: 400 }
      );
    }

    const normalizedExchange = exchange.toLowerCase();
    const normalizedSymbol = symbol.toUpperCase();

    if (!VALID_EXCHANGES.has(normalizedExchange)) {
      return NextResponse.json(
        { error: "Invalid exchange" },
        { status: 400 }
      );
    }

    // Get the watchlist
    const { data: watchlist, error: fetchError } = await auth.supabase
      .from("watchlists")
      .select("*")
      .eq("id", watchlistId)
      .eq("user_id", auth.userId)
      .single();

    if (fetchError || !watchlist) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      );
    }

    // Filter out the coin to delete
    const updatedCoins = Array.isArray(watchlist.coins)
      ? watchlist.coins.filter(
          (coin: { exchange?: string; symbol?: string }) =>
            !(coin.exchange?.toLowerCase() === normalizedExchange && coin.symbol?.toUpperCase() === normalizedSymbol)
        )
      : [];

    // Update the watchlist
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
        { error: "Failed to remove coin from watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      watchlist: updatedWatchlist,
      message: `${normalizedSymbol} removed from watchlist`,
    });
  } catch (error) {
    console.error("Watchlist coin delete error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
