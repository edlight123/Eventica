'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2, Copy, Check } from 'lucide-react'

interface ShareButtonProps {
  eventId: string
  eventTitle: string
  eventDate?: string
  eventVenue?: string
}

export default function ShareButton({ eventId, eventTitle, eventDate, eventVenue }: ShareButtonProps) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : ''
  
  const getShareText = () => {
    let text = `🎉 ${eventTitle}\n\n`
    if (eventDate) text += `📅 ${eventDate}\n`
    if (eventVenue) text += `📍 ${eventVenue}\n\n`
    text += `Get your tickets now! 🎫`
    return text
  }

  const handleShare = async () => {
    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: getShareText(),
          url: eventUrl,
        })
        return
      } catch (error) {
        // User cancelled or error - fall through to copy
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error)
        }
      }
    }
    
    // Fallback to copy
    try {
      await navigator.clipboard.writeText(eventUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-soft border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-gray-900">{t('events.share_event')}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">{t('events.spread_word')}</p>
      
      <button
        onClick={handleShare}
        className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-5 h-5" />
            <span>{t('events.link_copied')}</span>
          </>
        ) : (
          <>
            <Share2 className="w-5 h-5" />
            <span>{t('events.share_event')}</span>
          </>
        )}
      </button>
    </div>
  )
}
