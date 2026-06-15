'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from '../page.module.css'

interface PaymentRecord {
  id: string
  status: 'pending' | 'verified' | 'rejected'
  provider: 'easypaisa' | 'jazzcash'
  transaction_id: string
  amount: number
  created_at: string
  verified_at?: string
  rejection_reason?: string
}

function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get('id')
  
  const [payment, setPayment] = useState<PaymentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const redirectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!paymentId) {
      setError('Missing payment ID')
      setLoading(false)
      return
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/billing/pakistan/status?id=${paymentId}`)
        if (!res.ok) {
          if (res.status === 401) {
            setError('Please log in to view payment status')
          } else if (res.status === 404) {
            setError('Payment not found')
          } else {
            const data = await res.json()
            setError(data.error || 'Failed to fetch payment status')
          }
          setLoading(false)
          return
        }
        
        const data = await res.json()
        setPayment(data)
        setError('')

        // Redirect once when status becomes verified
        if (data.status === 'verified' && redirectTimeoutRef.current === null) {
          redirectTimeoutRef.current = window.setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      } catch (err) {
        console.error('Error fetching payment status:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Refresh every 5 seconds only while payment is still pending
    let mounted = true
    const interval = setInterval(() => {
      if (payment?.status && payment.status !== 'pending') {
        return
      }

      fetchStatus().catch(err => {
        if (mounted) {
          console.error('Error in refresh interval:', err)
        }
      })
      if (mounted) {
        setRefreshCount(count => count + 1)
      }
    }, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [payment?.status, paymentId, router])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading payment status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: '#ff6b6b' }}>Error</h2>
          <p className={styles.error}>{error}</p>
          <button
            onClick={() => router.push('/pricing/pakistan')}
            className={styles.submitButton}
            style={{ marginTop: '2rem' }}
          >
            Back to Payment
          </button>
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❓</div>
          <p>Payment not found</p>
          <button
            onClick={() => router.push('/pricing/pakistan')}
            className={styles.submitButton}
            style={{ marginTop: '2rem' }}
          >
            Back to Payment
          </button>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    switch (payment.status) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Payment Pending',
          messageColor: '#ffa500',
          message: 'Your payment is being verified. This usually takes 1-24 hours.',
          details: 'We are reviewing your payment details to ensure everything is correct.',
        }
      case 'verified':
        return {
          icon: '✅',
          title: 'Payment Verified!',
          messageColor: '#4caf50',
          message: 'Your payment has been successfully verified.',
          details: 'Redirecting to dashboard...',
        }
      case 'rejected':
        return {
          icon: '❌',
          title: 'Payment Rejected',
          messageColor: '#ff6b6b',
          message: 'Your payment could not be verified.',
          details: payment.rejection_reason || 'Please contact support for more information.',
        }
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          messageColor: '#666',
          message: 'Payment status is unknown.',
          details: 'Please try again later.',
        }
    }
  }

  const info = getStatusInfo()

  return (
    <div className={styles.container}>
      <div className={styles.formBox} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{info.icon}</div>
        <h1 style={{ color: info.messageColor }}>{info.title}</h1>
        <p style={{ color: '#888', marginTop: '1rem', fontSize: '1.1rem' }}>
          {info.message}
        </p>
        <p style={{ color: '#666', marginTop: '1rem', fontSize: '0.95rem' }}>
          {info.details}
        </p>

        {/* Payment Details */}
        <div
          style={{
            marginTop: '2rem',
            textAlign: 'left',
            background: '#1a1a1a',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #333',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#ccc' }}>
            Payment Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <dt
                style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                }}
              >
                Provider
              </dt>
              <dd
                style={{
                  color: '#fff',
                  margin: '0.25rem 0 1rem 0',
                  fontWeight: 500,
                }}
              >
                {payment.provider === 'easypaisa' ? '🟢 Easypaisa' : '🔴 JazzCash'}
              </dd>
            </div>
            <div>
              <dt
                style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                }}
              >
                Amount
              </dt>
              <dd
                style={{
                  color: '#fff',
                  margin: '0.25rem 0 1rem 0',
                  fontWeight: 500,
                }}
              >
                PKR {payment.amount}
              </dd>
            </div>
            <div>
              <dt
                style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                }}
              >
                Transaction ID
              </dt>
              <dd
                style={{
                  color: '#fff',
                  margin: '0.25rem 0 1rem 0',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                }}
              >
                {payment.transaction_id}
              </dd>
            </div>
            <div>
              <dt
                style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                }}
              >
                Submitted
              </dt>
              <dd
                style={{
                  color: '#fff',
                  margin: '0.25rem 0 1rem 0',
                  fontWeight: 500,
                }}
              >
                {new Date(payment.created_at).toLocaleString()}
              </dd>
            </div>
            {payment.verified_at && (
              <div>
                <dt
                  style={{
                    color: '#666',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Verified At
                </dt>
                <dd
                  style={{
                    color: '#fff',
                    margin: '0.25rem 0 1rem 0',
                    fontWeight: 500,
                  }}
                >
                  {new Date(payment.verified_at).toLocaleString()}
                </dd>
              </div>
            )}
            {payment.rejection_reason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <dt
                  style={{
                    color: '#ff6b6b',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Rejection Reason
                </dt>
                <dd
                  style={{
                    color: '#ff9999',
                    margin: '0.25rem 0 0 0',
                    fontWeight: 500,
                  }}
                >
                  {payment.rejection_reason}
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh status */}
        {payment.status === 'pending' && (
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            Auto-refreshing (checked {refreshCount} times)...
          </p>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          {payment.status === 'verified' ? (
            <button
              onClick={() => router.push('/dashboard')}
              className={styles.submitButton}
              style={{ flex: 1 }}
            >
              Go to Dashboard
            </button>
          ) : payment.status === 'rejected' ? (
            <>
              <button
                onClick={() => router.push('/pricing/pakistan')}
                className={styles.submitButton}
                style={{ flex: 1 }}
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/support')}
                className={styles.submitButton}
                style={{ flex: 1, background: '#333' }}
              >
                Contact Support
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/dashboard')}
              className={styles.submitButton}
              style={{ flex: 1 }}
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.formBox} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading payment status...</p>
          </div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  )
}
