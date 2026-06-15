import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatSignalMessage } from "@/lib/formatSignal";

export const dynamic = "force-dynamic";

type SendSignalBody = {
  signal: {
    symbol: string;
    action: string;
    trend: string;
    entry_zone: [number, number] | null;
    stop_loss: number | null;
    tp1: number | null;
    tp2: number | null;
    tp3: number | null;
    ai_score: number;
    confidence: number;
    status: string;
    entry_confirmed?: boolean;
  };
  setup: string;
  exchange?: string;
};

async function getAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
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
    if (!user || user.app_metadata?.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendSignalBody;
  try {
    body = (await request.json()) as SendSignalBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.signal?.symbol) {
    return NextResponse.json({ error: "Missing signal data" }, { status: 400 });
  }

  const message = formatSignalMessage(body);

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📈 TradingView",
          url: `https://www.tradingview.com/chart/?symbol=BINANCE:${body.signal.symbol}`,
        },
        {
          text: "🚀 View in PBT",
          url: `https://planbeforetrade.tech/market-structure-signals?symbol=${body.signal.symbol}`,
        },
      ],
    ],
  };

  const chatId =
    process.env.TELEGRAM_PREMIUM_CHAT_ID ||
    process.env.TELEGRAM_FREE_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID;

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

  return NextResponse.json({ success: true, symbol: body.signal.symbol });
}
