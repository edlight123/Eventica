'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function PromoterShareActions({
  shareUrl,
  eventTitle,
}: {
  shareUrl: string
  eventTitle: string
}) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Selection fallback isn't worth the ceremony — the URL is visible above.
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${eventTitle} — ${shareUrl}`)}`

  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-white/90 px-4 py-3 text-sm font-medium text-black transition-colors min-h-[44px]"
      >
        {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy my link</>}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors min-h-[44px]"
      >
        Share on WhatsApp
      </a>
    </div>
  )
}
