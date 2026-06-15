import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type SignalUpdateEvent = "ENTRY_HIT" | "SL_HIT" | "TP_HIT";

type SignalUpdateBody = {
  event: SignalUpdateEvent;
  record: {
    id: string;
    symbol: string;
    exchange: string;
    signal_number: string;
    trend: string;
    entry_zone: [number, number] | null;
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    risk_reward_ratio: number;
    result: "WIN" | "LOSS" | null;
    result_R: number | null;
    created_at: string;
    closed_at: string | null;
  };
};

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatUpdateMessage(event: SignalUpdateEvent, record: SignalUpdateBody["record"]): string {
  const trendEmoji =
    record.trend === "UPTREND" ? "📈" : record.trend === "DOWNTREND" ? "📉" : "➖";
  const entryZoneStr = record.entry_zone
    ? `${formatPrice(record.entry_zone[0])} – ${formatPrice(record.entry_zone[1])}`
    : "N/A";

  if (event === "ENTRY_HIT") {
    return `
🎯 *ENTRY PRICE HIT*

*${record.symbol}* (${record.signal_number}) ${trendEmoji} ${record.trend}
Exchange: ${record.exchange.toUpperCase()}

💰 Entry Zone: ${entryZoneStr}
📌 Entry Price: ${formatPrice(record.entry_price)}
🛑 Stop Loss: ${formatPrice(record.stop_loss)}
🎯 Take Profit: ${formatPrice(record.take_profit)}
R:R — 1:${record.risk_reward_ratio}

⏱ Signal Time: ${new Date(record.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
    `.trim();
  }

  if (event === "TP_HIT") {
    return `
✅ *TAKE PROFIT HIT — WIN*

*${record.symbol}* (${record.signal_number}) ${trendEmoji}
Exchange: ${record.exchange.toUpperCase()}

📌 Entry Price: ${formatPrice(record.entry_price)}
🎯 Take Profit: ${formatPrice(record.take_profit)}
📈 Result: +${record.result_R ?? record.risk_reward_ratio}R

⏱ Closed: ${record.closed_at ? new Date(record.closed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"}
    `.trim();
  }

  // SL_HIT
  return `
🛑 *STOP LOSS HIT — LOSS*

*${record.symbol}* (${record.signal_number}) ${trendEmoji}
Exchange: ${record.exchange.toUpperCase()}

📌 Entry Price: ${formatPrice(record.entry_price)}
🛑 Stop Loss: ${formatPrice(record.stop_loss)}
📉 Result: ${record.result_R ?? -1}R

⏱ Closed: ${record.closed_at ? new Date(record.closed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"}
  `.trim();
}

async function isAuthenticated(request: Request): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;
  try {
    const cookieStore = await cookies();
    type CookieSetItem = {
      name: string;
      value: string;
      options?: Parameters<typeof cookieStore.set>[2];
    };
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieSetItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SignalUpdateBody;
  try {
    body = (await request.json()) as SignalUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validEvents: SignalUpdateEvent[] = ["ENTRY_HIT", "SL_HIT", "TP_HIT"];
  if (!validEvents.includes(body.event) || !body.record?.symbol) {
    return NextResponse.json({ error: "Invalid event or missing record" }, { status: 400 });
  }

  const message = formatUpdateMessage(body.event, body.record);

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📈 View Chart",
          url: `https://www.tradingview.com/chart/?symbol=BINANCE:${body.record.symbol}`,
        },
        {
          text: "🚀 View Signal",
          url: `https://planbeforetrade.tech/market-structure-signals?symbol=${body.record.symbol}`,
        },
      ],
    ],
  };

  // Try premium channel first, fall back to free/default
  const premiumChatId = process.env.TELEGRAM_PREMIUM_CHAT_ID;
  const freeChatId = process.env.TELEGRAM_FREE_CHAT_ID;
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;

  const chatId = premiumChatId || freeChatId || defaultChatId;

  if (!chatId) {
    return NextResponse.json({ error: "No Telegram chat ID configured" }, { status: 500 });
  }

  const sent = await sendTelegramMessage(message, {
    chatId,
    parseMode: "Markdown",
    replyMarkup,
  });

  if (!sent) {
    return NextResponse.json({ error: "Failed to send Telegram message" }, { status: 500 });
  }

  return NextResponse.json({ success: true, event: body.event, symbol: body.record.symbol });
}
