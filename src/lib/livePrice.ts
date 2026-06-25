// src/lib/livePrice.ts

import { LRUCache } from 'lru-cache';
import { EXCHANGES, ExchangeId } from './exchanges';

const priceCache = new LRUCache<string, number>({
  max: 100,
  ttl: 1000 * 15, // 15 seconds
});

async function fetchLivePriceFromAPI(symbol: string, exchangeId: ExchangeId): Promise<number> {
  const exchange = EXCHANGES[exchangeId] || EXCHANGES.binance;
  const normalizedSymbol = exchange.normalizeSymbol(symbol);
  
  try {
    if (exchangeId === 'binance') {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}`);
      if (!res.ok) throw new Error("Binance API error");
      const data = await res.json();
      return parseFloat(data.price);
    } 
    else if (exchangeId === 'mexc') {
      const res = await fetch(`https://api.mexc.com/api/v3/ticker/price?symbol=${normalizedSymbol}`);
      if (!res.ok) throw new Error("MEXC API error");
      const data = await res.json();
      return parseFloat(data.price);
    }
    else if (exchangeId === 'bitget') {
      // Bitget spot symbols usually end with _SPBL
      const formattedSymbol = normalizedSymbol.endsWith('_SPBL') ? normalizedSymbol : `${normalizedSymbol}_SPBL`;
      const res = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${formattedSymbol}`);
      if (!res.ok) throw new Error("Bitget API error");
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        return parseFloat(data.data[0].lastPr);
      }
      throw new Error("Invalid Bitget response");
    }
  } catch (error) {
    console.error(`Failed to fetch live price for ${symbol} on ${exchangeId}:`, error);
    throw error;
  }
  
  return 0;
}

export async function getLivePrice(symbol: string, exchange: ExchangeId = 'binance'): Promise<number> {
  const cacheKey = `${exchange}:${symbol}`;
  const cachedPrice = priceCache.get(cacheKey);
  if (cachedPrice) {
    return cachedPrice;
  }

  const livePrice = await fetchLivePriceFromAPI(symbol, exchange);
  if (livePrice > 0) {
    priceCache.set(cacheKey, livePrice);
  }
  return livePrice;
}
