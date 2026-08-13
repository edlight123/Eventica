interface RefundResult {
  success: boolean
  error?: string
  refundId?: string
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null
  }
  const stripe = require('stripe')
  return stripe(process.env.STRIPE_SECRET_KEY)
}

export async function processStripeRefund(
  paymentIntentId: string,
  amount?: number,
  options?: { reverseTransfer?: boolean; refundApplicationFee?: boolean }
): Promise<RefundResult> {
  try {
    const stripe = getStripe()

    if (!stripe) {
      return { success: false, error: 'Stripe not configured' }
    }

    const refundParams: any = {
      payment_intent: paymentIntentId,
    }

    // If amount is specified, do partial refund
    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    // Ticket sales in US/CA/FR are DESTINATION CHARGES: the money already sat in
    // the organizer's connected account. Without these two flags a refund is paid
    // out of the PLATFORM balance while the organizer keeps the sale — Tikèm
    // absorbing a refund it never received. reverse_transfer pulls the funds back
    // from the connected account; refund_application_fee returns our cut too, so
    // we don't profit from a cancelled event.
    if (options?.reverseTransfer) {
      refundParams.reverse_transfer = true
    }
    if (options?.refundApplicationFee) {
      refundParams.refund_application_fee = true
    }

    const refund = await stripe.refunds.create(refundParams)

    return {
      success: true,
      refundId: refund.id
    }
  } catch (error: any) {
    console.error('Stripe refund error:', error)
    return {
      success: false,
      error: error.message || 'Failed to process Stripe refund'
    }
  }
}

export async function processMonCashRefund(
  transactionId: string,
  amount: number
): Promise<RefundResult> {
  // MonCash API doesn't have automatic refunds
  // Refunds are typically processed manually by the merchant
  // Return success and let organizer handle manually
  
  return {
    success: true,
    error: 'MonCash refunds require manual processing. Please process this refund through your MonCash dashboard.'
  }
}
