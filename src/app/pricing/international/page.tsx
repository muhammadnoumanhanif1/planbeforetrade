'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { createBrowserClient } from '@/lib/supabase-client'

function InternationalPaymentContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || 'monthly'
  const [checkingAuth, setCheckingAuth] = useState(true)
  
  const [method, setMethod] = useState<'wire' | 'ach' | 'swift'>('wire')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const redirectToSignup = () => {
    const nextPath = `${window.location.pathname}${window.location.search}`
    window.location.href = `/signup?next=${encodeURIComponent(nextPath)}`
  }

  useEffect(() => {
    const ensureAuthenticated = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          redirectToSignup()
          return
        }
      } finally {
        setCheckingAuth(false)
      }
    }

    ensureAuthenticated().catch(() => {
      redirectToSignup()
    })
  }, [])

  const planDetails = {
    monthly: { price: 4.99, duration: 'month' },
    yearly: { price: 49.99, duration: 'year' }
  }

  const currentPlan = planDetails[plan as keyof typeof planDetails] || planDetails.monthly

  const bankDetails = {
    accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Plan Before Trade',
    accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || 'XXXXXXXXXXXX',
    routingNumber: process.env.NEXT_PUBLIC_BANK_ROUTING_NUMBER || 'XXXXXX',
    bankName: process.env.NEXT_PUBLIC_BANK_NAME || 'Your Bank',
    swiftCode: process.env.NEXT_PUBLIC_WIRE_SWIFT_CODE || 'SWIFTXXX'
  }

  const transferMethods = ['wire', 'ach', 'swift'] as const

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!validTypes.includes(file.type)) {
        setError('Please upload an image (PNG/JPG) or PDF')
        return
      }

      if (file.size > maxSize) {
        setError('File size must be less than 5MB')
        return
      }

      setProofFile(file)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate form
      if (!senderName.trim()) throw new Error('Sender name is required')
      if (!senderEmail.trim()) throw new Error('Sender email is required')
      if (!proofFile) throw new Error('Payment proof is required')
      if (!method) throw new Error('Transfer method is required')

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('provider', 'bank_transfer')
      formData.append('method', method)
      formData.append('amount', currentPlan.price.toString())
      formData.append('sender_name', senderName)
      formData.append('sender_email', senderEmail)
      formData.append('proof_image', proofFile)
      formData.append('plan', plan)

      const response = await fetch('/api/billing/bank-transfer/submit', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          redirectToSignup()
          return
        }
        throw new Error(data.error || 'Failed to submit transfer')
      }

      setSuccess(true)
      setSenderName('')
      setSenderEmail('')
      setProofFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8' }}>Checking account access...</p>
          </div>
        </main>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
            <h1 style={{ color: '#22c55e', marginBottom: '16px' }}>Transfer Submitted!</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '16px' }}>
              Your bank transfer proof has been submitted for verification. Our team will review it within 24-48 hours and you&apos;ll receive an email confirmation once approved.
            </p>
            <p style={{ color: '#64748b', marginBottom: '32px' }}>
              Transfer ID: <strong style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{success === true ? 'pending' : success}</strong>
            </p>
            <Link href="/dashboard" className={styles.navLink} style={{ display: 'inline-block', padding: '12px 32px' }}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header} style={{ marginBottom: '48px' }}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>International Bank Transfer</h1>
              <p className={styles.subtitle}>
Pay securely via wire transfer, ACH, or SWIFT
              </p>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Plan Summary */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Plan Selected</p>
                <p style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '600' }}>
                  Premium {plan === 'monthly' ? 'Monthly' : 'Yearly'}
                </p>
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Amount Due</p>
                <p style={{ color: '#22c55e', fontSize: '28px', fontWeight: '700' }}>
                  ${currentPlan.price.toFixed(2)}
                </p>
                <p style={{ color: '#64748b', fontSize: '12px' }}>{currentPlan.duration === 'month' ? '/month' : '/year'}</p>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '20px', fontSize: '18px' }}>Bank Account Details</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Account Holder</p>
                <p style={{ color: '#e2e8f0', fontWeight: '500', fontFamily: 'monospace' }}>{bankDetails.accountHolder}</p>
              </div>

              <div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Account Number</p>
                <p style={{ color: '#e2e8f0', fontWeight: '500', fontFamily: 'monospace' }}>{bankDetails.accountNumber}</p>
              </div>

              <div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Routing Number (ACH)</p>
                <p style={{ color: '#e2e8f0', fontWeight: '500', fontFamily: 'monospace' }}>{bankDetails.routingNumber}</p>
              </div>

              <div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Bank Name</p>
                <p style={{ color: '#e2e8f0', fontWeight: '500', fontFamily: 'monospace' }}>{bankDetails.bankName}</p>
              </div>

              <div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>SWIFT Code (International Wire)</p>
                <p style={{ color: '#e2e8f0', fontWeight: '500', fontFamily: 'monospace' }}>{bankDetails.swiftCode}</p>
              </div>
            </div>
          </div>

          {/* Transfer Method Selection */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '20px', fontSize: '18px' }}>Transfer Method</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transferMethods.map((m) => (
                <label key={m} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: method === m ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  border: '1px solid ' + (method === m ? '#38bdf8' : '#334155'),
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={method === m}
                    onChange={(e) => setMethod(e.target.value as 'wire' | 'ach' | 'swift')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: '#e2e8f0', fontWeight: '500' }}>
                    {m === 'wire' && 'International Wire Transfer'}
                    {m === 'ach' && 'ACH Transfer (US Only)'}
                    {m === 'swift' && 'SWIFT Transfer'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Upload Proof Form */}
          <form onSubmit={handleSubmit} style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '20px', fontSize: '18px' }}>Upload Payment Proof</h2>

            {error && (
              <div className={styles.error} style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* Sender Info */}
            <div style={{ marginBottom: '20px' }}>
              <label className={styles.label} style={{ color: '#e2e8f0' }}>
                Your Name *
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="John Doe"
                className={styles.input}
                required
                style={{ marginBottom: '12px' }}
              />

              <label className={styles.label} style={{ color: '#e2e8f0' }}>
                Your Email *
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@example.com"
                className={styles.input}
                required
              />
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label className={styles.label} style={{ color: '#e2e8f0' }}>
                Payment Proof *
              </label>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                Upload a screenshot of your transfer confirmation (PNG, JPG, or PDF - max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className={styles.input}
                required
              />
              {proofFile && (
                <p style={{ color: '#22c55e', marginTop: '8px', fontSize: '14px' }}>
                  ✓ {proofFile.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
              style={{ width: '100%', cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Submitting...' : 'Submit Transfer Proof'}
            </button>
          </form>

          {/* FAQ Section */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: '24px', textAlign: 'center', fontSize: '20px' }}>
              Frequently Asked Questions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  How long does verification take?
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  We verify transfers within 24-48 hours. You&apos;ll receive an email confirmation once approved.
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  What should I include in my transfer?
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Include a reference or memo with your email address so we can match your transfer to your account.
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  Can I get a refund?
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Refunds are issued within 5-7 business days. Please contact support with your transfer ID.
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  What currencies do you support?
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Currently, we accept transfers in USD only. Convert your local currency using your bank&apos;s rates.
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
                  Do you accept international transfers?
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Yes! Use SWIFT for international transfers. Your bank may charge a fee - the amount we display is what you need to send after fees.
                </p>
              </div>
            </div>
          </section>

          {/* Back Link */}
          <div style={{ textAlign: 'center' }}>
            <Link href="/pricing" className={styles.navLink}>
              ← Back to Pricing
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function InternationalPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <main className={styles.main}>
            <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8' }}>Loading payment options...</p>
            </div>
          </main>
        </div>
      }
    >
      <InternationalPaymentContent />
    </Suspense>
  )
}
