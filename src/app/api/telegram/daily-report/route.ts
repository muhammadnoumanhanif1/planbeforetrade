import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
       return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: signals, error } = await supabase
      .from('signals')
      .select('result, result_r')
      .gte('closed_at', today.toISOString());

    if (error) {
      console.error('Error fetching daily signals for report:', error.message);
      return NextResponse.json({ error: 'Failed to fetch DB' }, { status: 500 });
    }

    const totalTrades = signals?.length || 0;
    const wins = signals?.filter(s => s.result === 'WIN').length || 0;
    const losses = signals?.filter(s => s.result === 'LOSS').length || 0;
    const totalProfit = signals?.reduce((sum, s) => sum + (Number(s.result_r) || 0), 0) || 0;

    const reportMessage = `
📊 *Daily Performance Report*

Trades Closed: ${totalTrades}
Wins: 🏆 ${wins}
Losses: ❌ ${losses}
Total Profit: 📈 ${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(2)}R

_Keep trading smart!_
    `.trim();

    const sent = await sendTelegramMessage(reportMessage, {
      chatId: process.env.TELEGRAM_PREMIUM_CHAT_ID || process.env.TELEGRAM_FREE_CHAT_ID,
      parseMode: 'Markdown'
    });

    if (sent) {
       return NextResponse.json({ success: true, message: 'Daily report sent.' });
    } else {
       return NextResponse.json({ error: 'Failed to send report via Telegram API.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Daily report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
