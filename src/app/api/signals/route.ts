import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const EXCHANGES = ["bitget", "binance", "mexc"] as const;
type Exchange = (typeof EXCHANGES)[number];

const TIMEFRAMES = [
  "1min",
  "3min",
  "5min",
  "15min",
  "30min",
  "1h",
  "4h",
  "6h",
  "12h",
  "1day",
  "1week",
] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type AnalysisResponse = {
  exchange: Exchange;
  symbol: string;
  timeframe: Timeframe;
  recommendation: "LONG" | "SHORT";
  confidence: number;
  lastPrice: number;
  stopLosses: number[];
  takeProfits: number[];
  updatedAt: string;
};

type SignalQuery = {
  exchange: Exchange;
  symbol: string;
  timeframe: Timeframe;
  confidenceThreshold: number;
};

type SignalOutput = {
  exchange: Exchange;
  symbol: string;
  timeframe: Timeframe;
  action: "LONG" | "SHORT" | "WAIT";
  side: "LONG" | "SHORT";
  shouldTrade: boolean;
  confidence: number;
  confidenceThreshold: number;
  lastPrice: number;
  stopLoss: number | null;
  takeProfits: number[];
  generatedAt: string;
  sourceUpdatedAt: string;
  notes: string[];
  binanceOrderTemplate: {
    venue: "binance-futures";
    symbol: string;
    entry: {
      side: "BUY" | "SELL";
      type: "MARKET";
      positionSide: "LONG" | "SHORT";
      reduceOnly: false;
    };
    exits: {
      stopLoss: {
        type: "STOP_MARKET";
        stopPrice: number | null;
        closePosition: true;
      };
      takeProfits: Array<{
        type: "TAKE_PROFIT_MARKET";
        stopPrice: number;
        closePosition: true;
      }>;
    };
    guards: {
      shouldTrade: boolean;
      minConfidence: number;
      confidence: number;
    };
  };
};

const parseBearerToken = (authorization: string | null): string | null => {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const toSafeNumber = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const safeReadJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const toQuery = (
  exchangeRaw: string | null,
  symbolRaw: string | null,
  timeframeRaw: string | null,
  confidenceRaw: string | null
): SignalQuery | { error: string; status: number } => {
  const rawExchange = (exchangeRaw ?? "binance").trim().toLowerCase();
  const exchange: Exchange = EXCHANGES.includes(rawExchange as Exchange)
    ? (rawExchange as Exchange)
    : "binance";

  const symbol = (symbolRaw ?? "").trim().toUpperCase();
  if (!symbol) {
    return { error: "symbol is required", status: 400 };
  }

  const rawTimeframe = (timeframeRaw ?? "1h").trim();
  const timeframe: Timeframe = TIMEFRAMES.includes(rawTimeframe as Timeframe)
    ? (rawTimeframe as Timeframe)
    : "1h";

  const confidenceThreshold = toSafeNumber(confidenceRaw, 60, 1, 95);

  return {
    exchange,
    symbol,
    timeframe,
    confidenceThreshold,
  };
};

const buildBinanceTemplate = (
  symbol: string,
  side: "LONG" | "SHORT",
  confidence: number,
  confidenceThreshold: number,
  shouldTrade: boolean,
  stopLoss: number | null,
  takeProfits: number[]
) => {
  const entrySide: "BUY" | "SELL" = side === "LONG" ? "BUY" : "SELL";

  return {
    venue: "binance-futures" as const,
    symbol,
    entry: {
      side: entrySide,
      type: "MARKET" as const,
      positionSide: side,
      reduceOnly: false as const,
    },
    exits: {
      stopLoss: {
        type: "STOP_MARKET" as const,
        stopPrice: stopLoss,
        closePosition: true as const,
      },
      takeProfits: takeProfits.map((tp) => ({
        type: "TAKE_PROFIT_MARKET" as const,
        stopPrice: tp,
        closePosition: true as const,
      })),
    },
    guards: {
      shouldTrade,
      minConfidence: confidenceThreshold,
      confidence,
    },
  };
};

async function generateSignal(request: Request, query: SignalQuery): Promise<SignalOutput | { error: string; status: number; analysisStatus?: number }> {
  const analysisUrl = new URL("/api/analysis", request.url);
  analysisUrl.searchParams.set("exchange", query.exchange);
  analysisUrl.searchParams.set("symbol", query.symbol);
  analysisUrl.searchParams.set("timeframe", query.timeframe);

  const cookieHeader = request.headers.get("cookie") || "";
  const analysisResponse = await fetch(analysisUrl.toString(), {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const analysisPayload = await safeReadJson<Partial<AnalysisResponse> & { error?: string }>(analysisResponse);
  if (!analysisResponse.ok) {
    return {
      error: analysisPayload?.error || "Unable to generate signal.",
      analysisStatus: analysisResponse.status,
      status: analysisResponse.status,
    };
  }

  if (!analysisPayload) {
    return {
      error: "Analysis service returned an invalid response.",
      analysisStatus: analysisResponse.status,
      status: 502,
    };
  }

  const analysis = analysisPayload as AnalysisResponse;
  const side: "LONG" | "SHORT" = analysis.recommendation;
  const confidence = Number(analysis.confidence || 0);
  const shouldTrade = confidence >= query.confidenceThreshold;
  const stopLoss = analysis.stopLosses?.[0] ?? null;
  const takeProfits = analysis.takeProfits ?? [];

  return {
    exchange: analysis.exchange,
    symbol: analysis.symbol,
    timeframe: analysis.timeframe,
    action: shouldTrade ? side : "WAIT",
    side,
    shouldTrade,
    confidence,
    confidenceThreshold: query.confidenceThreshold,
    lastPrice: analysis.lastPrice,
    stopLoss,
    takeProfits,
    generatedAt: new Date().toISOString(),
    sourceUpdatedAt: analysis.updatedAt,
    notes: shouldTrade
      ? [
          `Signal passed confidence threshold (${query.confidenceThreshold}).`,
          "Not financial advice. Validate risk limits in your bot before placing orders.",
        ]
      : [
          `Confidence below threshold (${query.confidenceThreshold}).`,
          "Bot should wait for a stronger setup.",
        ],
    binanceOrderTemplate: buildBinanceTemplate(
      analysis.symbol,
      side,
      confidence,
      query.confidenceThreshold,
      shouldTrade,
      stopLoss,
      takeProfits
    ),
  };
}

async function isAuthenticatedRequest(request: Request): Promise<boolean> {
  const requiredBotKey = process.env.BOT_SIGNALS_API_KEY?.trim();
  const providedBotKey =
    request.headers.get("x-bot-key")?.trim() ||
    parseBearerToken(request.headers.get("authorization"));

  if (requiredBotKey && providedBotKey === requiredBotKey) {
    return true;
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie set failures in route handlers.
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return !!user;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticatedRequest(request))) {
      return NextResponse.json(
        { error: "Unauthorized. Provide session auth or x-bot-key." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = toQuery(
      searchParams.get("exchange"),
      searchParams.get("symbol"),
      searchParams.get("timeframe"),
      searchParams.get("confidenceThreshold")
    );
    if ("error" in query) {
      return NextResponse.json({ error: query.error }, { status: query.status });
    }

    const signal = await generateSignal(request, query);
    if ("error" in signal) {
      return NextResponse.json(
        {
          error: signal.error,
          analysisStatus: signal.analysisStatus,
        },
        { status: signal.status }
      );
    }

    return NextResponse.json(signal);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate signal due to a server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticatedRequest(request))) {
      return NextResponse.json(
        { error: "Unauthorized. Provide session auth or x-bot-key." },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const query = toQuery(
      typeof body.exchange === "string" ? body.exchange : null,
      typeof body.symbol === "string" ? body.symbol : null,
      typeof body.timeframe === "string" ? body.timeframe : null,
      typeof body.confidenceThreshold === "number" || typeof body.confidenceThreshold === "string"
        ? String(body.confidenceThreshold)
        : null
    );
    if ("error" in query) {
      return NextResponse.json({ error: query.error }, { status: query.status });
    }

    const signal = await generateSignal(request, query);
    if ("error" in signal) {
      return NextResponse.json(
        {
          error: signal.error,
          analysisStatus: signal.analysisStatus,
        },
        { status: signal.status }
      );
    }

    const webhookUrlFromBody = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
    const webhookUrl = webhookUrlFromBody || process.env.SIGNALS_WEBHOOK_URL?.trim() || "";
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "No webhook URL provided. Set SIGNALS_WEBHOOK_URL or pass webhookUrl in body.",
        },
        { status: 400 }
      );
    }

    const webhookSecretFromBody = typeof body.webhookSecret === "string" ? body.webhookSecret.trim() : "";
    const webhookSecret = webhookSecretFromBody || process.env.SIGNALS_WEBHOOK_SECRET?.trim() || "";

    const payload = {
      event: "signal.generated",
      signal,
      sentAt: new Date().toISOString(),
    };

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
        },
        body: JSON.stringify(payload),
      });

      const webhookText = await webhookResponse.text();

      return NextResponse.json({
        delivered: webhookResponse.ok,
        webhookStatus: webhookResponse.status,
        webhookUrl,
        preview: webhookText.slice(0, 500),
        payload,
      });
    } catch {
      return NextResponse.json(
        {
          error: "Failed to deliver signal webhook.",
          webhookUrl,
          payload,
        },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to process signal request due to a server error." },
      { status: 500 }
    );
  }
}
