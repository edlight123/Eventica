'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import {
  FLYER_LIBRARY,
  flyerLibraryFullUrl,
  flyerLibraryThumbUrl,
  type FlyerLibraryItem,
} from '@/lib/flyerLibrary'

/**
 * Pick a flyer instead of uploading one.
 *
 * Selecting a tile hands the parent a finished image URL — there is no upload
 * step, because these already live on a CDN the app allows. That is the whole
 * point: an organizer with no poster gets one in a single click, and a signed
 * out visitor on /create gets one without an account.
 */
export default function FlyerLibraryPicker({
  current,
  onPick,
  onClose,
}: {
  current?: string | null
  onPick: (url: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation('common')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const labelFor = (item: FlyerLibraryItem) =>
    t(`composer.flyerLib.${item.id}`, { defaultValue: item.label })

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close', { defaultValue: 'Close' })}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('composer.flyerLibrary', { defaultValue: 'Flyer library' })}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0f0e] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {t('composer.flyerLibrary', { defaultValue: 'Flyer library' })}
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              {t('composer.flyerLibraryHint', {
                defaultValue: 'Free artwork you can use as-is. Swap it for your own flyer any time.',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {FLYER_LIBRARY.map((item) => {
            const full = flyerLibraryFullUrl(item)
            const selected = current === full
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(full)}
                aria-pressed={selected}
                className={`group relative overflow-hidden rounded-xl border text-left transition-colors ${
                  selected ? 'border-white' : 'border-white/10 hover:border-white/35'
                }`}
              >
                {/* Plain img, not next/image: fifteen tiles through the
                    optimizer is fifteen server fetches for images the CDN
                    already serves at exactly this size. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flyerLibraryThumbUrl(item)}
                  alt={labelFor(item)}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white">
                  {labelFor(item)}
                </span>
                {selected && (
                  <span className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                    <Check className="h-3.5 w-3.5 text-gray-900" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
