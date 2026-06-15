import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendPaymentVerificationEmail } from '@/lib/email-service'
import { isValidAdminSecret } from '@/lib/admin-secret'

// Admin endpoint to verify bank transfers
export async function POST(request: NextRequest) {
  try {
    // Verify admin secret
    const adminSecret = request.headers.get('x-admin-secret')
    
    if (!isValidAdminSecret(adminSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentId, action, rejectionReason } = body

    if (!paymentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentId and action' },
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
    // TODO: replace `any` bridge once generated Supabase types include bank_transfers.
    const adminDb = supabase as any

    // Get the bank transfer record
    const { data: transferRow, error: transferError } = await adminDb
      .from('bank_transfers')
      .select('*')
      .eq('id', paymentId)
      .single()

    const transfer = transferRow as any

    if (transferError || !transfer) {
      console.error('[verify-bank-transfer] Transfer not found or error:', transferError)
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    if (transfer.status !== 'pending') {
      console.warn('[verify-bank-transfer] Transfer already processed, status:', transfer.status)
      return NextResponse.json(
        { error: `Transfer already ${transfer.status}` },
        { status: 400 }
      )
    }

    // Get user profile for email
    const { data: profile } = await adminDb
      .from('profiles')
      .select('full_name')
      .eq('id', transfer.user_id)
      .maybeSingle()

    if (action === 'reject') {
      // Reject the transfer
      const { error: rejectError } = await adminDb
        .from('bank_transfers')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Transfer could not be verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      if (rejectError) {
        console.error('Error rejecting transfer:', rejectError)
        return NextResponse.json(
          { error: 'Failed to reject transfer' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Transfer rejected',
      })
    }

    // Approve the transfer
    const now = new Date()
    
    // Calculate period end based on plan
    const periodEnd = new Date(now)
    if (transfer.plan === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1) // monthly
    }

    // Start transaction: update transfer + create/update subscription + update profile
    
    // 1. Update transfer status
    const { error: updateError } = await adminDb
      .from('bank_transfers')
      .update({
        status: 'verified',
        verified_at: now.toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[verify-bank-transfer] Error updating transfer status:', updateError)
      throw new Error(`Failed to update transfer status: ${updateError.message}`)
    }
    console.log('[verify-bank-transfer] Transfer status updated to verified:', paymentId)

    // 2. Check if user has existing subscription (for bank transfers)
    const { data: existingSub, error: subCheckError } = await adminDb
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('user_id', transfer.user_id)
      .eq('provider', 'bank_transfer')
      .eq('status', 'active')
      .maybeSingle()

    if (subCheckError) {
      console.error('Error checking subscription:', subCheckError)
    }

    if (existingSub) {
      // Extend existing subscription
      const currentEnd = new Date(existingSub.current_period_end)
      const newEnd = currentEnd > now ? currentEnd : now
      
      if (transfer.plan === 'yearly') {
        newEnd.setFullYear(newEnd.getFullYear() + 1)
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1)
      }

      const { error: extendError } = await adminDb
        .from('subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id)

      if (extendError) {
        console.error('[verify-bank-transfer] Error extending subscription:', extendError)
        // Rollback transfer status
        await adminDb
          .from('bank_transfers')
          .update({ status: 'pending' })
          .eq('id', paymentId)
        throw new Error(`Failed to extend subscription: ${extendError.message}`)
      }
      console.log('[verify-bank-transfer] Extended subscription for user:', transfer.user_id)
    } else {
      // Create new subscription
      const { error: createSubError } = await adminDb
        .from('subscriptions')
        .insert({
          user_id: transfer.user_id,
          provider: 'bank_transfer',
          provider_subscription_id: `bt_${transfer.id}`,
          plan: transfer.plan,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })

      if (createSubError) {
        console.error('[verify-bank-transfer] Error creating subscription:', createSubError)
        // Rollback transfer status
        await adminDb
          .from('bank_transfers')
          .update({ status: 'pending' })
          .eq('id', paymentId)
        throw new Error(`Failed to create subscription: ${createSubError.message}`)
      }
      console.log('[verify-bank-transfer] Created new subscription for user:', transfer.user_id)
    }

    // 3. Update user profile to premium
    const { error: profileError } = await adminDb
      .from('profiles')
      .update({
        tier: 'premium',
        updated_at: now.toISOString(),
      })
      .eq('id', transfer.user_id)

    if (profileError) {
      console.error('[verify-bank-transfer] CRITICAL: Failed to update profile tier:', profileError)
      // CRITICAL: Profile tier update is essential
      // Roll back transfer status to pending
      await adminDb
        .from('bank_transfers')
        .update({ status: 'pending' })
        .eq('id', paymentId)
      throw new Error(`Failed to upgrade user to Premium tier: ${profileError.message}`)
    }

    console.log('[verify-bank-transfer] SUCCESS: User upgraded to Premium')
    console.log('[verify-bank-transfer] userId:', transfer.user_id, 'transferId:', paymentId)

    // 4. Send verification email (async, don't block verification)
    const expiryDate = periodEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    sendPaymentVerificationEmail({
      userEmail: transfer.sender_email,
      userName: profile?.full_name || 'User',
      expiryDate,
      paymentMethod: 'bank_transfer',
      amount: transfer.amount,
    }).catch((err) => {
      console.error('[verify-bank-transfer] Email send failed (non-critical):', err)
      // Email failure doesn't block verification
    })

    return NextResponse.json({
      success: true,
      message: 'Bank transfer verified and subscription activated',
      userId: transfer.user_id,
      subscription: {
        userId: transfer.user_id,
        plan: transfer.plan,
        expiresAt: periodEnd.toISOString(),
      },
    })

  } catch (error) {
    console.error('Bank transfer verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to list bank transfers (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    // Verify admin secret
    const adminSecret = request.headers.get('x-admin-secret')
    
    if (!isValidAdminSecret(adminSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    // TODO: replace `any` bridge once generated Supabase types include bank_transfers.
    const adminDb = supabase as any
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Validate status parameter
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      )
    }

    const { data: transfers, error } = await adminDb
      .from('bank_transfers')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching bank transfers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transfers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ payments: transfers || [] })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
