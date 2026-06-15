import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatSignalMessage } from "@/lib/formatSignal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_FREE_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID;

  // === VALIDATION ===
  if (!token) {
    return NextResponse.json(
      { success: false, error: "TELEGRAM_BOT_TOKEN is not set in .env.local" },
      { status: 400 }
    );
  }

  // Detect bot username used as chat_id (wrong usage)
  if (chatId && chatId.startsWith("@") && chatId.endsWith("bot")) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid chat_id: "${chatId}" is a bot username. You cannot send messages to a bot username.`,
        instructions: [
          "1. Open Telegram and search for @userinfobot",
          "2. Send /start to @userinfobot",
          "3. @userinfobot will reply with YOUR numeric chat ID (e.g. 123456789)",
          "4. Update .env.local: TELEGRAM_CHAT_ID=123456789",
          "5. If you want a channel: forward any message from your channel to @userinfobot to get the channel ID",
        ],
        envUpdate: {
          TELEGRAM_CHAT_ID:
            "REPLACE_WITH_YOUR_PERSONAL_CHAT_ID_FROM_USERINFOBOT",
        },
      },
      { status: 400 }
    );
  }

  if (!chatId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "TELEGRAM_FREE_CHAT_ID or TELEGRAM_CHAT_ID is not set in .env.local",
        instructions: [
          "1. Search for @userinfobot on Telegram",
          "2. Send /start",
          "3. Copy the numeric ID it gives you",
          "4. Add to .env.local: TELEGRAM_CHAT_ID=YOUR_NUMERIC_ID",
        ],
      },
      { status: 400 }
    );
  }

  // === STEP 1: Direct ping test ===
  let pingResult: any;
  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const pingResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ *PBT Bot Connected!*\n\nHello from Plan Before Trade! Your bot setup is working correctly.",
        parse_mode: "Markdown",
      }),
    });

    const text = await pingResponse.text();
    try {
      pingResult = JSON.parse(text);
    } catch {
      pingResult = { parseError: true, rawText: text, status: pingResponse.status };
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Network error: ${err.message}`,
      suggestion: "Try running 'npm run dev' locally and visit http://localhost:3000/api/telegram/test",
    });
  }

  if (!pingResult || pingResult.parseError) {
    return NextResponse.json({
      success: false,
      error: `Invalid response from Telegram (status ${pingResult?.status || "unknown"})`,
      raw: pingResult?.rawText?.substring(0, 200),
      suggestion: "This may be a CORS or proxy issue on Vercel.",
    });
  }

  if (!pingResult.ok) {
    return NextResponse.json({
      success: false,
      error: `Telegram API error: ${pingResult.description || pingResult.error_code || "unknown"}`,
      errorCode: pingResult.error_code,
      raw: pingResult,
    });
  }

  // === STEP 2: Send a sample signal message ===
  const sampleSignal = {
    symbol: "BTCUSDT",
    exchange: "binance",
    action: "BUY",
    trend: "UPTREND",
    ai_score: 78,
    confidence: 78,
    confidence_label: "HIGH",
    entry_zone: [95000, 97000],
    stop_loss: 93000,
    tp1: 100000,
    tp2: 105000,
    tp3: 110000,
    setup: "TRIGGERED",
    status: "TRIGGERED",
    entry_price: 96000,
    current_price: 96500,
    indicators: { ema20: 96000, ema50: 94000, rsi: 58 },
  };

  const formattedMessage = formatSignalMessage(sampleSignal);
  let signalResult: any;

  try {
    const signalResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📈 TradingView",
                  url: "https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT",
                },
                {
                  text: "🚀 View in PBT",
                  url: "https://planbeforetrade.tech/market-structure-signals?symbol=BTCUSDT",
                },
              ],
            ],
          },
        }),
      }
    );
    signalResult = await signalResponse.json();
  } catch (err: any) {
    signalResult = { error: err.message };
  }

  return NextResponse.json({
    success: !!pingResult?.ok,
    message: pingResult?.ok
      ? "Telegram bot is fully working!"
      : "Telegram API responded but returned an error",
    ping: pingResult,
    sampleSignal: signalResult,
    debug: {
      tokenPrefix: token ? token.substring(0, 10) + "..." : "NOT SET",
      chatIdUsed: chatId,
      botUsername: "@mhanifnasirbot",
      apiUrl: telegramUrl,
    },
  });
}