'use client'

import { useTranslation } from 'react-i18next'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, Tag, Megaphone, Share2 } from 'lucide-react'
import { OrgEmptyState, StatusChip } from '@/components/organizer/ui'
import { useToast } from '@/components/ui/Toast'

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
  const { t } = useTranslation('organizer')

  const { showToast } = useToast()
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const eventUrl = origin ? `${origin}/events/${eventId}` : `/events/${eventId}`

  const copyLink = async () => {
    const url = `${window.location.origin}/events/${eventId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({ type: 'error', title: 'Couldn’t copy link', message: 'Copy it manually from the field.' })
    }
  }

  const socialLinks = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${eventTitle}, ${eventUrl}`)}`,
    },
    {
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(eventTitle)}&url=${encodeURIComponent(eventUrl)}`,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Share link */}
      <div className="rounded-2xl border border-white/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-brand-400" />
          <h2 className="font-semibold text-white">{t('event_marketing.share_your_event')}</h2>
        </div>

        {/* URL row */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70">
            <ExternalLink className="h-4 w-4 shrink-0 text-white/40" />
            <span className="truncate">{eventUrl || `/events/${eventId}`}</span>
          </div>
          <button
            type="button"
            onClick={copyLink}
            aria-label={t('event_marketing.copy_event_link')}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {copied ? <><Check className="h-4 w-4" />{t('event_marketing.copied')}</> : <><Copy className="h-4 w-4" />Copy link</>}
          </button>
          <Link
            href={`/events/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={t('event_marketing.open_in_new_tab')}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Social share */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="label-mono uppercase text-white/70">{t('event_marketing.share_on')}</span>
          {socialLinks.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Promo codes */}
      <div className="rounded-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">{t('event_marketing.promo_codes')}</h2>
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
              title={t('event_marketing.no_promo_codes')}
              description={t('event_marketing.create_discount_codes')}
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
              <div key={code.id} className="flex items-center gap-4 px-5 py-4">
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

      {/* Promoters */}
      <div className="rounded-2xl border border-white/10 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-white">{t('event_marketing.promoters')}</h2>
            <p className="mt-1 text-sm text-white/50">
              Give each street-team member their own sales link and see exactly who
              drives which tickets, commission tallied automatically.
            </p>
          </div>
          <Link
            href={`/organizer/events/${eventId}/promoters`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Manage promoters
          </Link>
        </div>
      </div>

      {/* SMS campaigns — coming soon */}
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03]/50 p-8">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Megaphone className="h-6 w-6 text-brand-400" />
          </div>
          <h3 className="font-semibold text-white">{t('event_marketing.sms_campaigns')}</h3>
          <p className="mt-2 text-sm text-white/50">
            Send targeted SMS blasts to your ticket buyers directly from Tikèm.
            This feature is in development and will be available soon.
          </p>
          <span className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold text-brand-400">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  )
}
