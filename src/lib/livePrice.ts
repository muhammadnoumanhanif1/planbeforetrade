// src/lib/livePrice.ts

import { LRUCache } from 'lru-cache';

const priceCache = new LRUCache<string, number>({
  max: 100,
  ttl: 1000 * 15, // 15 seconds
});

// This is a mock function. In a real application, you would use a WebSocket
// or a fast price API (e.g., from Binance or a data provider).
async function fetchLivePriceFromAPI(symbol: string): Promise<number> {
  console.log(`[API] Fetching live price for ${symbol}`);
  // Simulate API call latency
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  // Simulate price fluctuation around a base
  const basePrice = 65000;
  const price = basePrice + (Math.random() - 0.5) * 1000;
  return parseFloat(price.toFixed(2));
}

export async function getLivePrice(symbol: string): Promise<number> {
  const cachedPrice = priceCache.get(symbol);
  if (cachedPrice) {
    return cachedPrice;
  }

  const livePrice = await fetchLivePriceFromAPI(symbol);
  priceCache.set(symbol, livePrice);
  return livePrice;
}
