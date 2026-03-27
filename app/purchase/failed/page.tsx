import Link from 'next/link'
import PurchasePopupBridge from '@/components/PurchasePopupBridge'

export default function PurchaseFailedPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const reason = searchParams.reason || 'unknown'
  
  const messages: Record<string, { title: string; description: string }> = {
    missing_transaction: {
      title: 'Transaction Not Found',
      description: 'We couldn\'t find your payment transaction. Please try purchasing again.',
    },
    transaction_not_found: {
      title: 'Transaction Not Found',
      description: 'This transaction ID was not found in our system.',
    },
    payment_failed: {
      title: 'Payment Failed',
      description: 'Your payment was not successful. Please check your payment method and try again.',
    },
    ticket_creation_failed: {
      title: 'Ticket Creation Failed',
      description: 'Payment was successful but we couldn\'t create your ticket. Please contact support.',
    },
    processing_error: {
      title: 'Processing Error',
      description: 'An error occurred while processing your payment. Please try again.',
    },
    unknown: {
      title: 'Purchase Failed',
      description: 'Something went wrong with your purchase. Please try again.',
    },
  }

  const message = messages[reason] || messages.unknown

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <PurchasePopupBridge status="failed" reason={reason} />
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 text-center">
          {/* Error Icon */}
          <div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 md:w-8 md:h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            {message.title}
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">
            {message.description}
          </p>

          <div className="space-y-2.5">
            <Link
              href="/"
              className="block w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 md:py-3.5 px-6 rounded-lg transition-colors text-base"
            >
              Browse Events
            </Link>
            
            <Link
              href="/tickets"
              className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 md:py-3.5 px-6 rounded-lg transition-colors text-base"
            >
              View My Tickets
            </Link>
          </div>

          {reason === 'ticket_creation_failed' && (
            <div className="mt-5 p-3.5 md:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-[13px] md:text-sm text-yellow-800">
                <strong>Important:</strong> Your payment was processed. Please contact support at{' '}
                <a href="mailto:support@joineventica.com" className="underline font-semibold">
                  support@joineventica.com
                </a>{' '}
                to resolve this issue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
