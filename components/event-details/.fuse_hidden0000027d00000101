'use client'

import { Share2, Check } from 'lucide-react'
import { useState } from 'react'

interface ShareButtonProps {
  eventTitle: string
  eventUrl: string
}

export function ShareButton({ eventTitle, eventUrl }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out this event: ${eventTitle}`,
          url: eventUrl,
        })
        return
      } catch (error) {
        // User cancelled or error occurred, fall through to copy
        console.log('Share cancelled or failed')
      }
    }

    // Fallback: copy to clipboard
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
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-5 h-5 text-success-600" />
          <span className="text-success-600">Link Copied!</span>
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
