import { NextRequest, NextResponse } from 'next/server';
import { recordTrade } from '@/lib/ai-learning/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.symbol || !body.trend || !body.strategy_type || body.result === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const trade = {
      symbol: body.symbol,
      trend: body.trend,
      strategy_type: body.strategy_type,
      entry_zone: body.entry_zone || null,
      stop_loss: body.stop_loss || null,
      take_profit: body.take_profit || null,
      result: body.result,
      result_r: body.result_r || 0,
      ai_score: body.ai_score || 50,
      indicators: body.indicators || {
        rsi: 50,
        ema_alignment: false,
        volume: 0,
      },
    };

    const success = await recordTrade(trade);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to record trade' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}
