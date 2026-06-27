'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { X, CreditCard, Lock } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
interface CheckoutFormProps {
  eventId: string
  eventTitle: string
  quantity: number
  totalAmount: number
  currency: string
  onClose: () => void
  clientSecret: string
  t: any
}

function CheckoutForm({ eventId, eventTitle, quantity, totalAmount, currency, onClose, clientSecret, t }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { showToast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/purchase/success`,
        },
        redirect: 'if_required',
      })

      if (submitError) {
        setError(submitError.message || 'Payment failed')
        setProcessing(false)
      } else {
        // Payment succeeded - create tickets immediately
        try {
          // Get the payment intent ID from the elements
          const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)
          
          if (paymentIntent) {
            // Call our API to create tickets
            const response = await fetch('/api/tickets/create-from-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
            })

            if (!response.ok) {
              console.error('Failed to create tickets immediately, webhook will handle it')
            }
          }
        } catch (err) {
          console.error('Error creating tickets:', err)
          // Don't fail the whole flow - webhook will handle it
        }

        // Show success message
        showToast({
          type: 'success',
          title: 'Payment successful!',
          message: `Your ${quantity > 1 ? 'tickets have' : 'ticket has'} been confirmed`,
          duration: 5000
        })

        // Redirect to tickets page
        router.push(`/tickets?payment_success=true`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('events.order_summary')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{eventTitle}</span>
            <span className="font-medium text-gray-900">x{quantity}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">{t('events.total')}</span>
            <span className="text-lg font-bold text-teal-700">
              {totalAmount.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">{t('events.payment_details')}</h3>
        </div>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        <span>{t('events.secure_payment_stripe')}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {processing ? t('events.processing') : `${t('events.pay')} ${totalAmount.toLocaleString()} ${currency}`}
        </button>
      </div>
    </form>
  )
}

interface EmbeddedStripePaymentProps {
  eventId: string
  eventTitle: string
  userId: string
  quantity: number
  totalAmount: number
  currency: string
  tierId?: string
  promoCodeId?: string
  onClose: () => void
}

export default function EmbeddedStripePayment({
  eventId,
  eventTitle,
  userId,
  quantity,
  totalAmount,
  currency,
  tierId,
  promoCodeId,
  onClose
}: EmbeddedStripePaymentProps) {
  const { t, i18n } = useTranslation('common')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Map i18next language codes to Stripe locale codes
  const getStripeLocale = () => {
    const lang = i18n.language
    if (lang === 'fr') return 'fr'
    if (lang === 'ht') return 'fr' // Stripe doesn't support Haitian Creole, use French as fallback
    return 'en' // Default to English
  }

  useEffect(() => {
    // Create PaymentIntent on component mount
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            quantity,
            tierId,
            promoCodeId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize payment')
        }

        setClientSecret(data.clientSecret)
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment')
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [eventId, quantity, tierId, promoCodeId])

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0d9488',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t('events.complete_payment')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.close')}
              </button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: getStripeLocale() as any }}>
              <CheckoutForm
                eventId={eventId}
                eventTitle={eventTitle}
                quantity={quantity}
                totalAmount={totalAmount}
                currency={currency}
                onClose={onClose}
                clientSecret={clientSecret}
                t={t}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  )
}
