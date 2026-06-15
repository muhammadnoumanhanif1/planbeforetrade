import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/billing/pakistan/status
 * Get payment status for user - allows checking verification progress
 * Query: ?id={paymentId}
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in to check payment status' },
        { status: 401 }
      )
    }

    // Get payment ID from query
    const paymentId = request.nextUrl.searchParams.get('id')
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId query parameter' },
        { status: 400 }
      )
    }

    // Get payment record - user can only see their own
    const { data: payment, error: paymentError } = await supabase
      .from('pakistan_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single()

    if (paymentError || !payment) {
      console.error('[payment-status] Payment not found:', paymentError)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payment)

  } catch (error) {
    console.error('[payment-status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
