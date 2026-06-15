/**
 * Email Service
 * Handles sending transactional emails for payment verifications
 * Supports Resend API with console fallback for development
 */

// Types
export interface PaymentVerificationEmailParams {
  userEmail: string
  userName: string
  expiryDate: string
  paymentMethod: 'easypaisa' | 'jazzcash' | 'bank_transfer'
  amount?: number
}

/**
 * Send payment verification email to user
 * Uses Resend API if configured, otherwise logs to console
 *
 * @param params Email parameters
 * @returns true if email sent/queued successfully, false if error
 */
export async function sendPaymentVerificationEmail(
  params: PaymentVerificationEmailParams
): Promise<boolean> {
  const { userEmail, userName, expiryDate, paymentMethod, amount = 350 } = params

  // Check if email service is enabled
  if (!isEmailServiceEnabled()) {
    console.log('[EMAIL-SERVICE] Email service disabled - logging to console')
    console.log(
      `[EMAIL] Payment verification email for: ${userEmail}\n` +
        `Subject: ✅ Your Plan Before Trade Payment Verified!\n` +
        `Name: ${userName}\n` +
        `Method: ${paymentMethod}\n` +
        `Amount: PKR ${amount}\n` +
        `Premium until: ${expiryDate}`
    )
    return true
  }

  // Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend({
      userEmail,
      userName,
      expiryDate,
      paymentMethod,
      amount,
    })
  }

  // Fallback to console logging
  console.log('[EMAIL-SERVICE] No email provider configured - logging to console')
  console.log(
    `[EMAIL] Payment verification email would be sent to: ${userEmail}`
  )
  return true
}

/**
 * Send email via Resend API
 * @internal
 */
async function sendViaResend(
  params: PaymentVerificationEmailParams
): Promise<boolean> {
  try {
    // Dynamic import to avoid requiring Resend if not using it
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { userEmail, userName, expiryDate, paymentMethod, amount } = params
    const displayName = userName || 'User'

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@planbeforetrade.com',
      to: userEmail,
      subject: '✅ Your Plan Before Trade Payment Verified!',
      html: generateEmailHTML({
        displayName,
        expiryDate,
        paymentMethod,
        amount: amount ?? 350,
      }),
    })

    if (response.error) {
      console.error('[EMAIL-SERVICE] Resend error:', response.error)
      return false
    }

    console.log('[EMAIL-SERVICE] Payment verification email sent via Resend', {
      to: userEmail,
      id: response.data?.id,
    })
    return true
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send via Resend:', error)
    // Fallback: log to console
    console.log(
      `[EMAIL] Payment verification email would be sent to: ${params.userEmail}`
    )
    return false
  }
}

/**
 * Generate HTML email content
 * @internal
 */
function generateEmailHTML(params: {
  displayName: string
  expiryDate: string
  paymentMethod: string
  amount: number
}): string {
  const { displayName, expiryDate, paymentMethod, amount } = params
  const methodEmoji =
    params.paymentMethod === 'easypaisa'
      ? '🟢'
      : params.paymentMethod === 'jazzcash'
        ? '🔴'
        : '🌍'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .body { background: #fff; padding: 20px; border-left: 1px solid #eee; border-right: 1px solid #eee; }
          .footer { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .amount { font-size: 24px; font-weight: bold; color: #007bff; }
          .expiry { background: #e8f4f8; padding: 12px; border-radius: 6px; margin: 20px 0; }
          .features { margin: 20px 0; }
          .features li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: #333;">✅ Payment Verified!</h2>
          </div>
          <div class="body">
            <p>Hi <strong>${displayName}</strong>,</p>
            
            <p>Your ${methodEmoji} <strong>${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</strong> payment has been verified successfully!</p>
            
            <div class="amount">
              PKR ${amount}
            </div>
            
            <div class="expiry">
              <strong>Your Premium subscription is active until:</strong><br>
              <strong style="font-size: 18px; color: #007bff;">${expiryDate}</strong>
            </div>
            
            <p>You can now enjoy:</p>
            <ul class="features">
              <li>📊 Unlimited crypto analyses (use all tools without daily limits)</li>
              <li>🔔 Price alerts (get notified of significant price movements)</li>
              <li>📝 Watchlists & saved analyses (save your favorite coins and analysis results)</li>
              <li>📈 Advanced insights (exclusive premium signals and indicators)</li>
            </ul>
            
            <p style="margin-top: 20px;">
              <a href="https://planbeforetrade.com/dashboard" class="button">Go to Dashboard →</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0;">Plan Before Trade © 2025. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Check if email service is enabled
 * @internal
 */
function isEmailServiceEnabled(): boolean {
  const enabled = process.env.EMAIL_SERVICE_ENABLED === 'true'
  return enabled
}

/**
 * Get email service status for debugging
 */
export function getEmailServiceStatus(): {
  enabled: boolean
  provider: string
} {
  return {
    enabled: isEmailServiceEnabled(),
    provider: process.env.RESEND_API_KEY ? 'resend' : 'console',
  }
}
