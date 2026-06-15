// src/lib/cache.ts

import { LRUCache } from 'lru-cache';

const options = {
  max: 500, // maximum number of items in the cache
  ttl: 1000 * 60 * 5, // 5 minutes
};

const cache = new LRUCache<string, any>(options);

export async function getFromCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cachedValue = cache.get(key) as T | undefined;
  if (cachedValue) {
    console.log(`[Cache] HIT: ${key}`);
    return cachedValue;
  }

  console.log(`[Cache] MISS: ${key}`);
  const freshValue = await fetcher();
  cache.set(key, freshValue as any);
  return freshValue;
}

export function clearCache() {
  cache.clear();
}
