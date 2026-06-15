import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'

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

    // Parse FormData
    const formData = await request.formData()
    const provider = formData.get('provider') as string
    const method = formData.get('method') as string
    const amount = parseFloat(formData.get('amount') as string)
    const senderName = formData.get('sender_name') as string
    const senderEmail = formData.get('sender_email') as string
    const plan = (formData.get('plan') as string) || 'monthly'
    const proofFile = formData.get('proof_image') as File

    // Validate required fields
    if (!provider || !method || !amount || !senderName || !senderEmail || !proofFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate provider
    if (provider !== 'bank_transfer') {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Validate method
    if (!['wire', 'ach', 'swift'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid transfer method' },
        { status: 400 }
      )
    }

    // Validate amount based on plan
    const validAmounts: Record<string, number> = {
      monthly: 4.99,
      yearly: 49.99
    }

    if (!validAmounts[plan] || amount !== validAmounts[plan]) {
      return NextResponse.json(
        { error: `Invalid amount. ${plan} plan is $${validAmounts[plan] || '0.00'}` },
        { status: 400 }
      )
    }

    // Validate file
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!validMimeTypes.includes(proofFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, or PDF' },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (proofFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Check if user already has a pending payment
    const { data: existingPending, error: pendingError } = await supabase
      .from('bank_transfers')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingError) {
      console.error('Error checking pending bank transfers:', pendingError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending bank transfer. Please wait for verification.' },
        { status: 400 }
      )
    }

    // Save file to public folder
    const fileName = `${Date.now()}-${user.id}-${proofFile.name}`
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'bank-transfers')
    
    try {
      await mkdir(uploadsDir, { recursive: true })
      const filePath = path.join(uploadsDir, fileName)
      const buffer = Buffer.from(await proofFile.arrayBuffer())
      await writeFile(filePath, buffer)
    } catch (err) {
      console.error('Error saving file:', err)
      return NextResponse.json(
        { error: 'Failed to save proof file' },
        { status: 500 }
      )
    }

    const proofImageUrl = `/uploads/bank-transfers/${fileName}`

    // Get user email from profile
    const profileClient = supabase as any

    const { data: profile, error: profileError } = await profileClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting profile:', profileError)
      return NextResponse.json(
        { error: 'Could not retrieve user profile' },
        { status: 500 }
      )
    }

    const userEmail = profile?.email || senderEmail

    // Create bank transfer record
    const transferClient = supabase as any

    const { data: transfer, error: insertError } = await transferClient
      .from('bank_transfers')
      .insert({
        user_id: user.id,
        provider: 'bank_transfer',
        method,
        amount,
        plan,
        proof_image_url: proofImageUrl,
        sender_name: senderName,
        sender_email: userEmail,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating bank transfer:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit transfer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bank transfer submitted for verification',
      transferId: transfer.id,
    })

  } catch (error) {
    console.error('Bank transfer submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
