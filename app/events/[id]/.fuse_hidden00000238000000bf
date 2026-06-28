'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

interface ShareButtonInlineProps {
  eventId: string
  eventTitle: string
  eventDate?: string
  eventVenue?: string
}

export default function ShareButtonInline({ eventId, eventTitle, eventDate, eventVenue }: ShareButtonInlineProps) {
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
    <button
      onClick={handleShare}
      className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 min-h-[44px]"
    >
      {copied ? (
        <>
          <Check className="w-5 h-5" />
          <span>Link Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-5 h-5" />
          <span>Share Event</span>
        </>
      )}
    </button>
  )
}
