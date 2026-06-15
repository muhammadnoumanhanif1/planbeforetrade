import {
  placeOrder,
  getSymbolPrice,
  type OrderParams,
} from "./binanceClient";
import {
  calculatePositionSize,
  addActiveTrade,
  removeActiveTrade,
  canOpenNewTrade,
  formatRiskReport,
} from "./riskManager";
import { sendTelegramMessage } from "./telegram";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

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

const TRADING_MODE = process.env.TRADING_MODE || "test";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const isLive = () => TRADING_MODE === "live";

async function notify(msg: string) {
  if (TELEGRAM_CHAT_ID && isLive()) {
    try {
      await sendTelegramMessage(msg, { chatId: TELEGRAM_CHAT_ID });
    } catch (e) {
      console.error("[Telegram] Notify failed:", e);
    }
  }
}

async function tryMarkTraded(id?: string) {
  if (!id) return;
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from("signals").update({ trade_executed: true }).eq("id", id);
  } catch (e) {
    console.error("[DB] Mark traded failed:", e);
  }
}

async function checkAlreadyTraded(id?: string): Promise<boolean> {
  if (!id) return false;
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("signals")
      .select("trade_executed")
      .eq("id", id)
      .maybeSingle();
    return data?.trade_executed === true;
  } catch {
    return false;
  }
}

export interface TradeSignal {
  symbol: string;
  action: "BUY" | "SELL";
  trend: "UPTREND" | "DOWNTREND";
  ai_score: number;
  confidence: number;
  entry_price: number | null;
  entry_zone: [number, number] | null;
  stop_loss: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  status: string;
  setup: string;
  entry_confirmed?: boolean;
  entry_quality_score?: { score: number };
  id?: string;
}

export async function executeTrade(signal: TradeSignal): Promise<{ success: boolean; message: string }> {
  const {
    symbol,
    action,
    ai_score,
    entry_quality_score,
    status,
    entry_confirmed,
    entry_price,
    stop_loss,
    tp1,
    tp2,
    tp3,
    id,
  } = signal;

  const isConfirmed = status === "READY" || status === "TRIGGERED" || entry_confirmed === true;

  // Strict filters
  if (ai_score < 75) return { success: false, message: `AI score ${ai_score} < 75` };
  if (!isConfirmed) return { success: false, message: `Not confirmed (${status})` };
  if (!entry_price || !stop_loss) return { success: false, message: "Missing entry/SL" };
  if (entry_quality_score && entry_quality_score.score < 70) {
    return { success: false, message: `Quality ${entry_quality_score.score} < 70` };
  }
  if (!canOpenNewTrade()) {
    return { success: false, message: `Risk limit: ${formatRiskReport()}` };
  }
  if (await checkAlreadyTraded(id)) {
    return { success: false, message: "Already traded" };
  }

  const modeLabel = isLive() ? "LIVE" : "TEST";
  console.log(`[TradeExecutor] ${modeLabel}: ${action} ${symbol} @ ${entry_price}`);

  try {
    if (!isLive()) {
      const simulatedQty = Number(process.env.TEST_TRADE_QUANTITY || "0.01");
      const testMsg = `🧪 TEST: ${action} ${simulatedQty} ${symbol} @ ${entry_price}\nSL: ${stop_loss}`;
      console.log(testMsg);
      await notify(testMsg);
      await tryMarkTraded(id);
      return { success: true, message: "TEST mode - logged only" };
    }

    const size = await calculatePositionSize({
      symbol,
      entryPrice: entry_price,
      stopLoss: stop_loss,
    });

    // LIVE execution
    const side = action === "BUY" ? "BUY" : "SELL";

    // Place entry limit order
    const entryOrder = await placeOrder({
      symbol,
      side,
      quantity: size.quantity,
      price: entry_price,
      type: "LIMIT",
      timeInForce: "GTC",
    });

    addActiveTrade({
      symbol,
      side,
      entryPrice: entry_price,
      quantity: size.quantity,
      openTime: Date.now(),
    });

    // Place TP orders (partial)
    if (tp1) {
      await placeOrder({
        symbol,
        side: side === "BUY" ? "SELL" : "BUY",
        quantity: size.quantity * 0.33,
        price: tp1,
        type: "LIMIT",
        timeInForce: "GTC",
      });
    }
    if (tp2) {
      await placeOrder({
        symbol,
        side: side === "BUY" ? "SELL" : "BUY",
        quantity: size.quantity * 0.33,
        price: tp2,
        type: "LIMIT",
        timeInForce: "GTC",
      });
    }
    if (tp3) {
      await placeOrder({
        symbol,
        side: side === "BUY" ? "SELL" : "BUY",
        quantity: size.quantity * 0.34,
        price: tp3,
        type: "LIMIT",
        timeInForce: "GTC",
      });
    }

    // Place SL order
    await placeOrder({
      symbol,
      side: side === "BUY" ? "SELL" : "BUY",
      quantity: size.quantity,
      price: stop_loss,
      type: "LIMIT",
      timeInForce: "GTC",
    });

    const successMsg = `🚀 ${symbol} EXECUTED\nEntry: ${entry_price}\nSL: ${stop_loss}\nQty: ${size.quantity}`;
    await notify(successMsg);
    await tryMarkTraded(id);

    return { success: true, message: `Order ${entryOrder.orderId}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[TradeExecutor] Error: ${msg}`);
    await notify(`❌ TRADE FAILED: ${symbol}\n${msg}`);
    return { success: false, message: msg };
  }
}
