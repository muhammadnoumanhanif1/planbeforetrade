// app/api/test-telegram/route.ts

import { sendTelegramMessage } from '@/lib/telegram'

export async function GET() {
  try {
    await sendTelegramMessage('🚀 Bot connected successfully!')

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({ error: 'Failed to send message' }),
      { status: 500 }
    )
  }
}