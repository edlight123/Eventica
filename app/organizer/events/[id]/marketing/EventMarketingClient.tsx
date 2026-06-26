'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, Tag, Megaphone } from 'lucide-react'
import { OrgEmptyState, StatusChip } from '@/components/organizer/ui'

interface PromoCode {
  id: string
  code: string
  discount_type: string
  discount_value: number
  uses: number
  max_uses: number | null
  is_active: boolean
}

interface EventMarketingClientProps {
  eventId: string
  eventTitle: string
  promoCodes: PromoCode[]
}

function discountLabel(type: string, value: number) {
  if (type === 'percentage') return `${value}% off`
  return `${value} off`
}

export default function EventMarketingClient({
  eventId,
  eventTitle,
  promoCodes,
}: EventMarketingClientProps) {
  const eventUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/events/${eventId}`
      : `/events/${eventId}`

  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/events/${eventId}`
        : `/events/${eventId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Share link */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <h2 className="mb-4 font-semibold text-white">Share your event</h2>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <ExternalLink className="h-4 w-4 shrink-0 text-white/40" />
            <span className="truncate">/events/{eventId}</span>
          </div>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy event link"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
          <Link
            href={`/events/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Open event page"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Promo codes */}
      <div className="rounded-2xl border border-white/10 bg-[#141414]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">Promo codes</h2>
          <Link
            href={`/organizer/promo-codes?eventId=${eventId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Tag className="h-3.5 w-3.5" />
            Create code
          </Link>
        </div>

        {promoCodes.length === 0 ? (
          <div className="p-8">
            <OrgEmptyState
              icon={Tag}
              title="No promo codes"
              description="Create discount codes to drive ticket sales for this event."
              action={
                <Link
                  href={`/organizer/promo-codes?eventId=${eventId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Tag className="h-4 w-4" />
                  Create promo code
                </Link>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {promoCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white">{code.code}</span>
                    <StatusChip tone={code.is_active ? 'success' : 'neutral'}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </StatusChip>
                  </div>
                  <p className="mt-0.5 text-sm text-white/50">
                    {discountLabel(code.discount_type, code.discount_value)}
                    {' · '}
                    {code.uses} use{code.uses !== 1 ? 's' : ''}
                    {code.max_uses != null ? ` / ${code.max_uses}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder: future SMS / email campaigns */}
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10">
          <Megaphone className="h-6 w-6 text-brand-400" />
        </div>
        <h3 className="font-semibold text-white">SMS & email campaigns</h3>
        <p className="mt-1 text-sm text-white/50">Coming soon — blast your audience directly from Tikèm.</p>
      </div>
    </div>
  )
}
