import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in to submit payment' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, transactionId, phoneNumber, amount, plan } = body

    // Validate required fields
    if (!provider || !transactionId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate provider
    if (!['easypaisa', 'jazzcash'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid payment provider' },
        { status: 400 }
      )
    }

    // Validate plan (optional parameter for reference)
    if (plan && plan !== 'weekly') {
      return NextResponse.json(
        { error: 'Invalid plan. Only weekly is available for Pakistan payments.' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount !== 350) {
      return NextResponse.json(
        { error: 'Invalid amount. Weekly plan is PKR 350.' },
        { status: 400 }
      )
    }

    // Check if user already has a pending payment
    const db = supabase as any

    const { data: existingPending, error: pendingError } = await db
      .from('pakistan_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingError) {
      console.error('Error checking pending payments:', pendingError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending payment. Please wait for verification.' },
        { status: 400 }
      )
    }

    // Check if transaction ID was already used
    const { data: existingTxn, error: txnError } = await db
      .from('pakistan_payments')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (txnError) {
      console.error('Error checking transaction:', txnError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingTxn) {
      return NextResponse.json(
        { error: 'This transaction ID has already been submitted' },
        { status: 400 }
      )
    }

    // Get user email
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.email) {
      console.error('Error getting profile:', profileError)
      return NextResponse.json(
        { error: 'Could not retrieve user profile' },
        { status: 500 }
      )
    }

    // Create pending payment record
    const { data: payment, error: insertError } = await db
      .from('pakistan_payments')
      .insert({
        user_id: user.id,
        provider,
        transaction_id: transactionId,
        sender_number: phoneNumber,
        user_email: profile.email,
        plan: plan || 'weekly',
        amount,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating payment:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment submitted for verification',
      paymentId: payment.id,
    })

  } catch (error) {
    console.error('Pakistan payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
