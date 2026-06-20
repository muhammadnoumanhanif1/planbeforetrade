'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-client'
import styles from '../../page.module.css'

interface PaymentMethod {
  id: 'easypaisa' | 'jazzcash'
  name: string
  color: string
  instructions: string[]
}

const DEFAULT_PAKISTAN_PAYMENT_NUMBER =
  process.env.NEXT_PUBLIC_PAKISTAN_PAYMENT_NUMBER || '03447944094'
const PAKISTAN_PAYMENT_ACCOUNT_TITLE =
  process.env.NEXT_PUBLIC_PAKISTAN_ACCOUNT_TITLE || 'M Hanif Nasir'

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    color: '#4CAF50',
    instructions: [
      'Open Easypaisa app',
      'Go to "Send Money"',
      'Enter account number shown below',
      'Enter amount: PKR 350',
      'Add reference: Your email address',
      'Complete the payment',
    ],
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    color: '#E53935',
    instructions: [
      'Open JazzCash app',
      'Go to "Send Money"',
      'Enter account number shown below',
      'Enter amount: PKR 350',
      'Add reference: Your email address',
      'Complete the payment',
    ],
  },
]


export default function PakistanPaymentPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [selectedMethod, setSelectedMethod] = useState<'easypaisa' | 'jazzcash' | null>(null)
  const [transactionId, setTransactionId] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [refreshCountdown, setRefreshCountdown] = useState(3)

  const redirectToSignup = useCallback(() => {
    const nextPath = `${window.location.pathname}${window.location.search}`
    router.push(`/signup?next=${encodeURIComponent(nextPath)}`)
  }, [router])

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
  }, [redirectToSignup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMethod || !transactionId || !senderNumber) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/billing/pakistan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedMethod,
          transactionId,
          phoneNumber: senderNumber,
          amount: 350,
          plan: 'weekly',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          redirectToSignup()
          return
        }
        throw new Error(data.error || 'Failed to submit payment')
      }

      setPaymentId(data.paymentId)
      setSuccess(true)
      setRefreshCountdown(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Auto-reload after 3 seconds to refresh profile tier
  useEffect(() => {
    if (!success) return

    if (refreshCountdown > 0) {
      const timer = setTimeout(() => {
        setRefreshCountdown(refreshCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }

    // Move to a stable route instead of forcing a full-page reload
    if (paymentId) {
      router.push(`/payment-status?id=${paymentId}`)
    } else {
      router.push('/dashboard')
    }
  }, [success, refreshCountdown, paymentId, router])

  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ textAlign: 'center' }}>
          <p>Checking account access...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '2em', fontWeight: 'bold' }}>Payment Submitted!</h2>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Your payment is being verified. This usually takes 1-24 hours.
          </p>
          <p style={{ color: '#888', marginTop: '0.5rem' }}>
            You will receive an email once your Premium subscription is activated.
          </p>
          <p style={{ color: '#666', marginTop: '2rem', fontSize: '0.9rem' }}>
            Redirecting to status page in {refreshCountdown} seconds...
          </p>
          <button
            onClick={() => paymentId ? router.push(`/payment-status?id=${paymentId}`) : router.push('/dashboard')}
            className={styles.submitButton}
            style={{ marginTop: '2rem' }}
          >
            {paymentId ? 'Check Payment Status' : 'Return to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.formBox} style={{ maxWidth: '500px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          🇵🇰 Pakistan Payment
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '2rem' }}>
          Premium Weekly - PKR 350/week
        </p>

        {/* Payment Method Selection */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedMethod(method.id)}
              style={{
                flex: 1,
                padding: '1rem',
                border: selectedMethod === method.id ? `2px solid ${method.color}` : '1px solid #333',
                borderRadius: '8px',
                background: selectedMethod === method.id ? `${method.color}15` : 'transparent',
                cursor: 'pointer',
                color: selectedMethod === method.id ? method.color : '#fff',
                fontWeight: selectedMethod === method.id ? 600 : 400,
              }}
            >
              {method.name}
            </button>
          ))}
        </div>

        {selectedMethod && (
          <>
            {/* Account Number */}
            <div
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Send PKR 350 to this {selectedMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} account:
              </p>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  color: PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.color,
                  fontWeight: 600,
                }}
              >
                {selectedMethod === 'easypaisa'
                  ? (process.env.NEXT_PUBLIC_EASYPAISA_ACCOUNT || DEFAULT_PAKISTAN_PAYMENT_NUMBER)
                  : (process.env.NEXT_PUBLIC_JAZZCASH_ACCOUNT || DEFAULT_PAKISTAN_PAYMENT_NUMBER)
                }
              </p>
              <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Account Title: {PAKISTAN_PAYMENT_ACCOUNT_TITLE}
              </p>
              <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                ⚠️ Add your email address as reference/note
              </p>
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                Instructions:
              </h3>
              <ol style={{ paddingLeft: '1.5rem', color: '#ccc' }}>
                {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.instructions.map((step, i) => (
                  <li key={i} style={{ marginBottom: '0.3rem' }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="transactionId">Transaction ID / TID</label>
                <input
                  type="text"
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g., 1234567890"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="senderNumber">Your Phone Number</label>
                <input
                  type="tel"
                  id="senderNumber"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g., 03001234567"
                  className={styles.input}
                  required
                />
              </div>

              {error && (
                <div className={styles.error} style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Payment for Verification'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '1rem' }}>
              After verification (1-24 hours), your Premium will be activated for 7 days.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push('/pricing')}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#888',
            cursor: 'pointer',
            marginTop: '1.5rem',
          }}
        >
          ← Back to Pricing
        </button>
      </div>
    </div>
  )
}
