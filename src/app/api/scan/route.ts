// src/app/api/scan/route.ts
import { NextResponse } from 'next/server';
import { scanMarket } from '@/features/smart-trading-engine/marketScanner';

export async function GET() {
  try {
    // For now, we'll just scan Binance. This could be a parameter in the future.
    const signals = await scanMarket('Binance');
    return NextResponse.json(signals);
  } catch (error) {
    console.error('Scan API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to scan market', details: errorMessage }, { status: 500 });
  }
}
