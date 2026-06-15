'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from '../../page.module.css'

interface PakistanPayment {
  id: string
  user_id: string
  user_email: string
  provider: 'easypaisa' | 'jazzcash'
  transaction_id: string
  sender_number: string
  amount: number
  plan: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason?: string
  created_at: string
  verified_at?: string
}

interface BankTransfer {
  id: string
  user_id: string
  sender_email: string
  method: 'wire' | 'ach' | 'swift'
  amount: number
  plan: 'monthly' | 'yearly'
  proof_image_url: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason?: string
  sender_name: string
  created_at: string
  verified_at?: string
}

type Payment = PakistanPayment | BankTransfer

export default function AdminPaymentsPage() {
  const [adminSecret, setAdminSecret] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [paymentType, setPaymentType] = useState<'pakistan' | 'bank-transfer'>('pakistan')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!adminSecret) return

    setLoading(true)
    setError('')
    setImagePreview(null)

    try {
      const endpoint = paymentType === 'pakistan'
        ? `/api/billing/pakistan/verify?status=${filter}`
        : `/api/billing/bank-transfer/verify?status=${filter}`

      const response = await fetch(endpoint, {
        headers: {
          'x-admin-secret': adminSecret,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false)
          throw new Error('Invalid admin secret')
        }
        throw new Error(data.error || 'Failed to fetch payments')
      }

      setPayments(data.payments || [])
      setIsAuthenticated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [adminSecret, filter, paymentType])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments()
    }
  }, [isAuthenticated, filter, paymentType, fetchPayments])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPayments()
  }

  const handleVerify = async (paymentId: string, action: 'approve' | 'reject') => {
    const rejectionReason = action === 'reject' 
      ? prompt('Enter rejection reason (optional):')
      : undefined

    setProcessing(paymentId)

    try {
      const endpoint = paymentType === 'pakistan'
        ? '/api/billing/pakistan/verify'
        : '/api/billing/bank-transfer/verify'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          paymentId,
          action,
          rejectionReason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment')
      }

      // Remove from list
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
      alert(action === 'approve' ? 'Payment approved!' : 'Payment rejected')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error processing payment')
    } finally {
      setProcessing(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox} style={{ maxWidth: '400px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            🔐 Admin Login
          </h1>

          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="adminSecret">Admin Secret</label>
              <input
                type="password"
                id="adminSecret"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret"
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
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: paymentType === 'pakistan' ? '#4CAF50' : '#38bdf8' }}>
            {paymentType === 'pakistan' ? '🇵🇰 Pakistan Payments' : '🌍 Bank Transfers'}
          </h1>
          <button
            onClick={() => {
              setIsAuthenticated(false)
              setAdminSecret('')
              setPayments([])
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        {/* Payment Type Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => { setPaymentType('pakistan'); setFilter('pending'); }}
            style={{
              padding: '0.75rem 1rem',
              background: paymentType === 'pakistan' ? '#333' : 'transparent',
              border: 'none',
              borderBottom: paymentType === 'pakistan' ? '2px solid #4CAF50' : 'none',
              color: paymentType === 'pakistan' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            🇵🇰 Pakistan (Weekly)
          </button>
          <button
            onClick={() => { setPaymentType('bank-transfer'); setFilter('pending'); }}
            style={{
              padding: '0.75rem 1rem',
              background: paymentType === 'bank-transfer' ? '#333' : 'transparent',
              border: 'none',
              borderBottom: paymentType === 'bank-transfer' ? '2px solid #38bdf8' : 'none',
              color: paymentType === 'bank-transfer' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            🌍 Bank Transfers
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['pending', 'verified', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '0.5rem 1rem',
                background: filter === status ? '#333' : 'transparent',
                border: '1px solid #333',
                borderRadius: '4px',
                color: filter === status ? '#fff' : '#888',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {status}
            </button>
          ))}
          <button
            onClick={fetchPayments}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className={styles.error} style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
        ) : payments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>
            No {filter} {paymentType === 'pakistan' ? 'Pakistan payments' : 'bank transfers'} found
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {payments.map((payment) => {
              const isPakistan = paymentType === 'pakistan'
              const bankTransfer = !isPakistan ? (payment as BankTransfer) : null
              const pakistani = isPakistan ? (payment as PakistanPayment) : null

              return (
                <div
                  key={payment.id}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      {isPakistan && pakistani && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: pakistani.provider === 'easypaisa' ? '#4CAF5030' : '#E5393530',
                                color: pakistani.provider === 'easypaisa' ? '#4CAF50' : '#E53935',
                                textTransform: 'capitalize',
                              }}
                            >
                              {pakistani.provider}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>
                              PKR {pakistani.amount}
                            </span>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                              {new Date(pakistani.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gap: '0.5rem', color: '#ccc' }}>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Email:</span>
                              {pakistani.user_email}
                            </div>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Transaction ID:</span>
                              <code style={{ background: '#333', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                {pakistani.transaction_id}
                              </code>
                            </div>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Sender:</span>
                              {pakistani.sender_number}
                            </div>
                          </div>

                          {pakistani.rejection_reason && (
                            <div style={{ marginTop: '0.75rem', color: '#E53935', fontSize: '0.9rem' }}>
                              Reason: {pakistani.rejection_reason}
                            </div>
                          )}
                        </>
                      )}

                      {!isPakistan && bankTransfer && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: '#38bdf830',
                                color: '#38bdf8',
                                textTransform: 'capitalize',
                              }}
                            >
                              {bankTransfer.method?.toUpperCase?.() || 'UNKNOWN'}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>
                              USD ${bankTransfer.amount.toFixed(2)}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>
                              {bankTransfer.plan === 'monthly' ? '/month' : '/year'}
                            </span>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                              {new Date(bankTransfer.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gap: '0.5rem', color: '#ccc' }}>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Name:</span>
                              {bankTransfer.sender_name}
                            </div>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Email:</span>
                              {bankTransfer.sender_email}
                            </div>
                            <div>
                              <span style={{ color: '#888', marginRight: '0.5rem' }}>Method:</span>
                              {bankTransfer?.method === 'wire' && 'International Wire Transfer'}
                              {bankTransfer?.method === 'ach' && 'ACH Transfer (US)'}
                              {bankTransfer?.method === 'swift' && 'SWIFT Transfer'}
                              {!['wire', 'ach', 'swift'].includes(bankTransfer?.method as any) && 'Unknown Method'}
                            </div>
                          </div>

                          {bankTransfer.rejection_reason && (
                            <div style={{ marginTop: '0.75rem', color: '#E53935', fontSize: '0.9rem' }}>
                              Reason: {bankTransfer.rejection_reason}
                            </div>
                          )}

                          {bankTransfer.proof_image_url && (
                            <button
                              onClick={() => setImagePreview(imagePreview === bankTransfer.proof_image_url ? null : bankTransfer.proof_image_url)}
                              style={{
                                marginTop: '0.75rem',
                                padding: '0.5rem 1rem',
                                background: '#333',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                color: '#88f',
                                cursor: 'pointer',
                              }}
                            >
                              {imagePreview === bankTransfer.proof_image_url ? '🔽 Hide Proof' : '🖼️ View Proof'}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {filter === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleVerify(payment.id, 'approve')}
                          disabled={processing === payment.id}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#4CAF50',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: processing === payment.id ? 'not-allowed' : 'pointer',
                            opacity: processing === payment.id ? 0.5 : 1,
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleVerify(payment.id, 'reject')}
                          disabled={processing === payment.id}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#E53935',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: processing === payment.id ? 'not-allowed' : 'pointer',
                            opacity: processing === payment.id ? 0.5 : 1,
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {!isPakistan && bankTransfer && imagePreview === bankTransfer.proof_image_url && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>💾 Payment Proof</p>
                      {bankTransfer.proof_image_url.endsWith('.pdf') ? (
                        <a
                          href={bankTransfer.proof_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'underline' }}
                        >
                          📄 Open PDF
                        </a>
                      ) : (
                        <img
                          src={bankTransfer.proof_image_url}
                          alt="Payment proof"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '4px',
                            border: '1px solid #333',
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>📋 Verification Steps</h3>
          <ol style={{ paddingLeft: '1.5rem', color: '#888' }}>
            {paymentType === 'pakistan' ? (
              <>
                <li>Open Easypaisa/JazzCash app or web portal</li>
                <li>Check transaction history for the Transaction ID</li>
                <li>Verify amount matches PKR 350</li>
                <li>Verify sender number matches</li>
                <li>Click Approve to activate Premium for 7 days</li>
              </>
            ) : (
              <>
                <li>Review the uploaded payment proof (screenshot/PDF)</li>
                <li>Verify transfer amount matches the subscription price (USD $4.99/month or $49.99/year)</li>
                <li>Check that transfer method matches (Wire/ACH/SWIFT)</li>
                <li>Verify sender name is legitimate</li>
                <li>Click Approve to activate Premium subscription</li>
              </>
            )}
          </ol>
        </div>
      </div>
    </div>
  )
}
