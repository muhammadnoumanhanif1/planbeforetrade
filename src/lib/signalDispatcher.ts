import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";
import { sendTelegramMessage } from "./telegram";
import { formatSignalMessage } from "./formatSignal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
let supabaseClient:
  | ReturnType<typeof createClient<Database>>
  | null
  | undefined;

const getSupabaseClient = () => {
  if (supabaseClient !== undefined) return supabaseClient;
  if (!supabaseUrl || !supabaseKey) {
    supabaseClient = null;
    return supabaseClient;
  }
  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  return supabaseClient;
};

const rateLimits: Map<string, number> = new Map();
const RATE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes per symbol (in-memory backup)

function buildSetupKey(signal: any): string {
  const symbol = signal.symbol;
  const action = signal.action?.toUpperCase() || "BUY";
  const entryZone = signal.entry_zone
    ? `${signal.entry_zone[0]?.toFixed(0)}-${signal.entry_zone[1]?.toFixed(0)}`
    : "NO_ZONE";
  const trend = signal.trend?.toUpperCase() || "UPTREND";
  return `${symbol}_${action}_${trend}_${entryZone}`;
}

export async function handleNewSignal(signalItem: any): Promise<boolean> {
  const signal = signalItem.signal ? signalItem.signal : signalItem;
  const setup = signalItem.setup ?? signal.setup ?? signal.status ?? "WAITING";
  const symbol = signal.symbol;

  if (!symbol) {
    console.log("[Dispatcher] No symbol provided, skipping.");
    return false;
  }

  // Strict Filters
  const aiScore = signal.ai_score || signal.confidence || 0;
  const isHighScore = aiScore >= 65;
  const isConfirmed =
    setup === "READY" || setup === "TRIGGERED" || signal.entry_confirmed === true;
  const isHighQuality = signal.entry_quality_score
    ? signal.entry_quality_score.score >= 65
    : true;

  if (!isHighScore || !isConfirmed || !isHighQuality) {
    console.log(
      `[Dispatcher] ${symbol} filtered out (aiScore=${aiScore}, setup=${setup}).`
    );
    return false;
  }

  const setupKey = buildSetupKey(signal);

  // Check Supabase for recent dispatch (primary duplicate prevention)
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log("[Dispatcher] Supabase not configured; skipping DB duplicate check.");
    } else {
      const { data: existing } = await supabase
        .from("telegram_dispatch_log")
        .select("id, sent_at")
        .eq("symbol", symbol)
        .eq("setup_key", setupKey)
        .gte("sent_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // last 60 minutes
        .maybeSingle();

      if (existing) {
        console.log(
          `[Dispatcher] ${symbol} with setup ${setupKey} already sent within last 60min. Skipping.`
        );
        return false;
      }
    }
  } catch (err) {
    console.log("[Dispatcher] DB check skipped:", err);
  }

  // In-memory rate limit (backup)
  const now = Date.now();
  if (now - (rateLimits.get(symbol) ?? 0) < RATE_LIMIT_MS) {
    console.log(`[Dispatcher] Rate limit active for ${symbol}. Skipping.`);
    return false;
  }

  // Build inline buttons
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📈 View Chart",
          url: `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`,
        },
        {
          text: "🚀 View Signal",
          url: `https://planbeforetrade.tech/market-structure-signals?symbol=${symbol}`,
        },
      ],
    ],
  };

  // Format the message
  const formattedMessage = formatSignalMessage(signalItem);

  // Determine target channel
  const isPremiumOnly = aiScore >= 85;
  const freeChatId = process.env.TELEGRAM_FREE_CHAT_ID;
  const premiumChatId =
    process.env.TELEGRAM_PREMIUM_CHAT_ID || freeChatId;

  let sendSuccess = false;

  if (isPremiumOnly && premiumChatId) {
    sendSuccess = await sendTelegramMessage(formattedMessage, {
      chatId: premiumChatId,
      parseMode: "Markdown",
      replyMarkup,
    });
  }

  if (!isPremiumOnly && freeChatId) {
    sendSuccess = await sendTelegramMessage(formattedMessage, {
      chatId: freeChatId,
      parseMode: "Markdown",
      replyMarkup,
    });
  }

  // Fallback
  if (!sendSuccess) {
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;
    if (defaultChatId) {
      sendSuccess = await sendTelegramMessage(formattedMessage, {
        chatId: defaultChatId,
        parseMode: "Markdown",
        replyMarkup,
      });
    }
  }

  if (sendSuccess) {
    rateLimits.set(symbol, now);
    console.log(`[Dispatcher] Signal sent for ${symbol} (${setupKey})`);

    // Log to Supabase for persistent duplicate prevention
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log("[Dispatcher] Supabase not configured; skipping dispatch log.");
        return sendSuccess;
      }
      await supabase.from("telegram_dispatch_log").insert({
        symbol: symbol,
        setup_key: setupKey,
        sent_at: new Date().toISOString(),
      });
    } catch (err) {
      console.log("[Dispatcher] Failed to log dispatch:", err);
    }
  }

  return sendSuccess;
}
