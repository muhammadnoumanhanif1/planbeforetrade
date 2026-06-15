import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendPaymentVerificationEmail } from '@/lib/email-service'
import { isValidAdminSecret } from '@/lib/admin-secret'

// 🔐 Helper: Validate admin
function validateAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  return isValidAdminSecret(secret)
}

// =======================
// ✅ POST: VERIFY PAYMENT
// =======================
export async function POST(request: NextRequest) {
  try {
    // 🔐 Auth check
    if (!validateAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentId, action, rejectionReason } = body

    if (!paymentId || !action) {
      return NextResponse.json(
        { error: 'Missing paymentId or action' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const db: any = supabase

    // 🔍 Fetch payment
    const { data: payment, error: paymentError } = await db
      .from('pakistan_payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('Payment fetch error:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: `Already ${payment.status}` },
        { status: 400 }
      )
    }

    // =======================
    // ❌ REJECT FLOW
    // =======================
    if (action === 'reject') {
      const { error } = await db
        .from('pakistan_payments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Rejected by admin',
          verified_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      if (error) {
        console.error('Reject error:', error)
        return NextResponse.json(
          { error: 'Reject failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // =======================
    // ✅ APPROVE FLOW
    // =======================
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 7)

    // 1️⃣ Update payment
    const { error: updateError } = await db
      .from('pakistan_payments')
      .update({
        status: 'verified',
        verified_at: now.toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(updateError.message)
    }

    // 2️⃣ Subscription check
    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', payment.user_id)
      .eq('status', 'active')
      .maybeSingle()

    if (sub) {
      const newEnd = new Date(sub.current_period_end)
      newEnd.setDate(newEnd.getDate() + 7)

      await db
        .from('subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
        })
        .eq('id', sub.id)
    } else {
      await db.from('subscriptions').insert({
        user_id: payment.user_id,
        provider: payment.provider,
        plan: 'weekly',
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
    }

    // 3️⃣ Update profile
    const { error: profileError } = await db
      .from('profiles')
      .update({ tier: 'premium' })
      .eq('id', payment.user_id)

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // 4️⃣ Send email (SAFE)
    if (payment.user_email) {
      sendPaymentVerificationEmail({
        userEmail: payment.user_email,
        userName: payment.user_name || 'User',
        expiryDate: periodEnd.toDateString(),
        paymentMethod: payment.provider,
        amount: payment.amount,
      }).catch((err) => {
        console.error('Email error:', err)
      })
    } else {
      console.warn('No email found for user')
    }

    return NextResponse.json({
      success: true,
      expiresAt: periodEnd,
    })

  } catch (err: any) {
    console.error('POST ERROR:', err)
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}

// =======================
// ✅ GET: FETCH PAYMENTS
// =======================
export async function GET(request: NextRequest) {
  try {
    // 🔐 Auth check
    if (!validateAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const db: any = supabase

    const { data, error } = await db
      .from('pakistan_payments')
      .select('*')
      .eq('status', status)

    if (error) {
      console.error('Fetch error:', error)
      return NextResponse.json(
        { error: 'Fetch failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ payments: data || [] })

  } catch (err: any) {
    console.error('GET ERROR:', err)
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}
