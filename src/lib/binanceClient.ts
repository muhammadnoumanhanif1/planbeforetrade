import crypto from "crypto";

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = "https://api.binance.com";

function getSignature(queryString: string): string {
  return crypto
    .createHmac("sha256", API_SECRET || "")
    .update(queryString)
    .digest("hex");
}

async function signedRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY || !API_SECRET) {
    throw new Error("BINANCE_API_KEY or BINANCE_SECRET_KEY not set");
  }

  const signedParams: Record<string, string> = {
    ...params,
    timestamp: Date.now().toString(),
    recvWindow: "5000",
  };

  const query = new URLSearchParams(signedParams).toString();
  const sig = getSignature(query);
  const url = `${BASE_URL}${endpoint}?${query}&signature=${sig}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "X-MBX-APIKEY": API_KEY, "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (data.code) {
    throw new Error(`Binance API error: ${data.msg}`);
  }
  return data;
}

async function publicRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}?${query}`;
  return fetch(url).then((r) => r.json());
}

interface Balance {
  asset: string;
  free: number;
  locked: number;
}

export async function getAccountBalance(): Promise<Balance[]> {
  const data = await signedRequest<{ balances: { asset: string; free: string; locked: string }[] }>(
    "/api/v3/account",
    {}
  );
  return data.balances.map((b) => ({
    asset: b.asset,
    free: parseFloat(b.free),
    locked: parseFloat(b.locked),
  }));
}

export async function getUSDTBalance(): Promise<number> {
  const balances = await getAccountBalance();
  const usdt = balances.find((b) => b.asset === "USDT");
  return usdt?.free || 0;
}

export async function getSymbolPrice(symbol: string): Promise<number> {
  const data = await publicRequest<{ price: string }[]>("/api/v3/ticker/price", {
    symbol: symbol.toUpperCase(),
  });
  return parseFloat(data[0]?.price || "0");
}

export interface ExchangeLimits {
  minQty: number;
  maxQty: number;
  stepSize: number;
  minNotional: number;
  tickSize: number;
}

export async function getExchangeInfo(symbol: string): Promise<ExchangeLimits> {
  const data = await publicRequest<{ symbols: { filters: { filterType: string; minQty?: string; maxQty?: string; stepSize?: string; minNotional?: string; tickSize?: string }[] }[] }>(
    "/api/v3/exchangeInfo",
    { symbol: symbol.toUpperCase() }
  );

  const s = data.symbols?.[0];
  if (!s) throw new Error(`Symbol ${symbol} not found`);

  const f = s.filters;
  return {
    minQty: parseFloat(f.find((x: any) => x.filterType === "LOT_SIZE")?.minQty || "0"),
    maxQty: parseFloat(f.find((x: any) => x.filterType === "LOT_SIZE")?.maxQty || "0"),
    stepSize: parseFloat(f.find((x: any) => x.filterType === "LOT_SIZE")?.stepSize || "0.000001"),
    minNotional: parseFloat(f.find((x: any) => x.filterType === "MIN_NOTIONAL")?.minNotional || "0"),
    tickSize: parseFloat(f.find((x: any) => x.filterType === "PRICE_FILTER")?.tickSize || "0.00001"),
  };
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type TimeInForce = "GTC" | "IOC" | "FOK";

export interface OrderParams {
  symbol: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  type?: OrderType;
  timeInForce?: TimeInForce;
}

export interface PlacedOrder {
  orderId: number;
  symbol: string;
  side: OrderSide;
  status: string;
  executedQty: string;
  price: string;
  type: OrderType;
}

export async function placeOrder(params: OrderParams): Promise<PlacedOrder> {
  const { symbol, side, quantity, price, type = "LIMIT", timeInForce = "GTC" } = params;

  if (!API_KEY || !API_SECRET) {
    throw new Error("BINANCE_API_KEY or BINANCE_SECRET_KEY not set");
  }

  const body: Record<string, string> = {
    symbol: symbol.toUpperCase(),
    side,
    quantity: quantity.toString(),
    type,
    timestamp: Date.now().toString(),
    recvWindow: "5000",
  };

  if (type === "LIMIT" && price) {
    body.price = price.toString();
    body.timeInForce = timeInForce;
  }

  const query = new URLSearchParams(body).toString();
  const sig = getSignature(query);
  const url = `${BASE_URL}/api/v3/order?${query}&signature=${sig}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "X-MBX-APIKEY": API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
  });

  const data = await res.json();
  if (data.code) {
    throw new Error(`Binance error: ${data.msg}`);
  }

  return {
    orderId: data.orderId,
    symbol: data.symbol,
    side: data.side,
    status: data.status,
    executedQty: data.executedQty,
    price: data.price,
    type: data.type,
  };
}

export async function cancelOrder(symbol: string, orderId: number): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error("BINANCE_API_KEY or BINANCE_SECRET_KEY not set");
  }

  const body: Record<string, string> = {
    symbol: symbol.toUpperCase(),
    orderId: orderId.toString(),
    timestamp: Date.now().toString(),
    recvWindow: "5000",
  };

  const query = new URLSearchParams(body).toString();
  const sig = getSignature(query);
  const url = `${BASE_URL}/api/v3/order?${query}&signature=${sig}`;

  await fetch(url, {
    method: "DELETE",
    headers: { "X-MBX-APIKEY": API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export async function getOpenOrders(symbol?: string): Promise<PlacedOrder[]> {
  const params = symbol ? { symbol: symbol.toUpperCase() } : { symbol: "" };
  return signedRequest<PlacedOrder[]>("/api/v3/openOrders", params);
}

export async function getAllOrders(symbol: string): Promise<PlacedOrder[]> {
  return signedRequest<PlacedOrder[]>("/api/v3/allOrders", {
    symbol: symbol.toUpperCase(),
    limit: "100",
  });
}