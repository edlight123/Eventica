'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TicketActionsProps {
  ticketId: string
  ticketStatus: string
  checkedIn: boolean
  eventTitle: string
}

export default function TicketActions({ ticketId, ticketStatus, checkedIn, eventTitle }: TicketActionsProps) {
  const { t } = useTranslation('tickets')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Transfer form state
  const [transferEmail, setTransferEmail] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [transferLink, setTransferLink] = useState('')
  const [showTransferLink, setShowTransferLink] = useState(false)

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/tickets/transfer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          toEmail: transferEmail,
          message: transferMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed')
      }

      // Generate transfer link if token is returned
      if (data.transfer?.transferToken) {
        const link = `${window.location.origin}/tickets/transfer/${data.transfer.transferToken}`
        setTransferLink(link)
        setShowTransferLink(true)
      }

      setMessage({ type: 'success', text: t('detail.transfer_success') })
      setTransferEmail('')
      setTransferMessage('')
      
      // Don't auto-close modal if we're showing the transfer link
      if (!data.transfer?.transferToken) {
        setTimeout(() => {
          setShowTransferModal(false)
          window.location.reload()
        }, 2000)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('detail.transfer_error') })
    } finally {
      setLoading(false)
    }
  }

  const canTransfer = (ticketStatus === 'active' || ticketStatus === 'valid') && !checkedIn

  return (
    <div className="space-y-3">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'border border-green-200 text-emerald-300'
            : 'border border-red-200 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Transfer Button */}
      {canTransfer && (
        <button
          onClick={() => setShowTransferModal(true)}
          className="w-full px-4 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          {t('detail.transfer_ticket')}
        </button>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a0a0a] rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">{t('detail.transfer_title')}</h2>
            
            {!showTransferLink ? (
              <>
                <p className="text-white/60 mb-6">
                  Send this ticket to someone else. They&apos;ll receive an email with a link to accept the transfer.
                  <span className="block mt-2 text-sm text-amber-300 font-medium">
                    ⏰ Transfer links expire in 24 hours
                  </span>
                </p>

                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t('detail.transfer_to_email')}
                    </label>
                    <input
                      type="email"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="w-full px-4 py-2  rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t('detail.transfer_message')}
                    </label>
                    <textarea
                      value={transferMessage}
                      onChange={(e) => setTransferMessage(e.target.value)}
                      placeholder={t('detail.transfer_message_placeholder')}
                      className="w-full px-4 py-2  rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg ${
                      message.type === 'success'
                        ? 'border border-green-200 text-emerald-300'
                        : 'border border-red-200 text-red-300'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransferModal(false)
                        setShowTransferLink(false)
                        setTransferLink('')
                      }}
                      className="flex-1 px-4 py-2  rounded-lg text-white/70 font-medium hover:bg-white/[0.04]"
                      disabled={loading}
                    >
                      {t('detail.transfer_cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
                      disabled={loading || !transferEmail}
                    >
                      {loading ? 'Sending...' : t('detail.transfer_send')}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="text-white/60 mb-4">
                  {t('detail.transfer_share')}
                </p>

                <div className="space-y-3 mb-6">
                  {/* Copy Link */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transferLink}
                      readOnly
                      className="flex-1 px-3 py-2  rounded-lg bg-[#0a0a0a] text-sm"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(transferLink)
                        setMessage({ type: 'success', text: t('detail.transfer_link_copied') })
                        setTimeout(() => setMessage(null), 2000)
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      📋 {t('detail.transfer_copy_link')}
                    </button>
                  </div>

                  {/* Share via WhatsApp */}
                  <button
                    onClick={() => {
                      const text = `I'm transferring my ticket for ${eventTitle} to you! Click here to accept:`
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + transferLink)}`
                      window.open(whatsappUrl, '_blank')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Share via WhatsApp
                  </button>

                  {/* Share via SMS */}
                  <button
                    onClick={() => {
                      const text = `I'm transferring my ticket for ${eventTitle}. Accept it here: ${transferLink}`
                      window.location.href = `sms:?&body=${encodeURIComponent(text)}`
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition"
                  >
                    💬 Share via Text Message
                  </button>
                </div>

                <div className="border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-300">
                    <strong>⏰ Reminder:</strong> This transfer link expires in 24 hours. The recipient must accept before then.
                  </p>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    message.type === 'success'
                      ? 'border border-green-200 text-emerald-300'
                      : 'border border-red-200 text-red-300'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    setShowTransferLink(false)
                    setTransferLink('')
                    window.location.reload()
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}


    </div>
  )
}
