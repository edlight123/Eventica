'use client'

/**
 * How the guest list appears on the event page — the face pile, the count, or
 * nothing — chosen against a live preview of the exact row the public will see.
 *
 * The reason this is a preview and not three words: "show who's going" and
 * "show how many" sound nearly identical in a settings list, and an organizer
 * picking between them is really picking between two *pictures*. So each option
 * renders its own picture, and the choice is made by looking rather than by
 * parsing. Posh's page does the same thing, and it is the one control on that
 * page nobody has to think about.
 */

import { useTranslation } from 'react-i18next'
import { Eye, Hash, EyeOff } from 'lucide-react'
import { GUESTLIST_VISIBILITIES, type GuestlistVisibility } from '@/lib/guestlistVisibility'

/** Just enough of a guest to draw a circle. */
export interface FacePileFace {
  id: string
  name: string
  photoUrl?: string
}

const ICONS: Record<GuestlistVisibility, typeof Eye> = {
  faces: Eye,
  count: Hash,
  hidden: EyeOff,
}

/**
 * The overlapping circles. Rendered at two sizes: 32px in the option cards,
 * 40px in the headline preview, matching WhosGoing on the public page.
 */
export function FacePile({
  faces,
  size = 40,
  max = 4,
  dim = false,
}: {
  faces: FacePileFace[]
  size?: number
  max?: number
  /** Greyed out, for the "not showing" option. */
  dim?: boolean
}) {
  const shown = faces.slice(0, max)
  return (
    <span className={`flex shrink-0 ${dim ? 'opacity-30 grayscale' : ''}`} aria-hidden>
      {shown.map((f, i) => (
        <span
          key={f.id}
          className="grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white ring-2 ring-[#0f0f0f]"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.4,
            // Manual overlap rather than -space-x-*: the ring has to draw over
            // the neighbour to its left, so later circles must sit higher.
            marginLeft: i === 0 ? 0 : -size * 0.3,
            zIndex: i,
          }}
        >
          {f.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (f.name || 'G').charAt(0).toUpperCase()
          )}
        </span>
      ))}
    </span>
  )
}

export default function GuestlistVisibilityPicker({
  value,
  onChange,
  faces,
  /** Real attendee count when known (edit mode); a sample otherwise. */
  going,
}: {
  value: GuestlistVisibility
  onChange: (v: GuestlistVisibility) => void
  faces: FacePileFace[]
  going?: number
}) {
  const { t } = useTranslation('common')

  // With no guests added yet the preview would be an empty box, which teaches
  // nothing, so stand-ins keep the picture intact. They are named rather than
  // bare initials for a reason: with anonymous placeholders the faces preview
  // fell back to "24 going" — the exact sentence count-only prints — and the
  // two options looked identical apart from the circles. A name makes the
  // format itself visible: "Mika and 23 others going". These never leave this
  // control.
  const sample: FacePileFace[] =
    faces.length > 0
      ? faces
      : [
          { id: 's1', name: 'Mika' },
          { id: 's2', name: 'Jonas' },
          { id: 's3', name: 'Widlyn' },
          { id: 's4', name: 'Farah' },
        ]
  const count = going ?? Math.max(sample.length, 24)
  const lead = sample[0]?.name?.split(' ')[0]
  const others = Math.max(0, count - 1)

  /** The sentence the public page will print, per mode. */
  const sentence = (v: GuestlistVisibility) => {
    if (v === 'hidden') return t('composer.guestVis.previewHidden', { defaultValue: 'Nothing shown' })
    if (v === 'count')
      return t('composer.guestVis.previewCount', { count, defaultValue: '{{count}} going' })
    return lead
      ? t('composer.guestVis.previewFaces', {
          name: lead,
          count: others,
          defaultValue: '{{name}} and {{count}} others going',
        })
      : t('composer.guestVis.previewCount', { count, defaultValue: '{{count}} going' })
  }

  return (
    <div className="space-y-3">
      {/* The preview, at the size the event page draws it. */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.055] px-3 py-3">
        {value !== 'count' && <FacePile faces={sample} size={40} dim={value === 'hidden'} />}
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-white">{sentence(value)}</span>
          <span className="label-mono block text-[10px] uppercase text-white/40">
            {t('composer.guestVis.previewLabel', { defaultValue: 'On your event page' })}
          </span>
        </span>
      </div>

      <fieldset>
        <legend className="sr-only">
          {t('composer.guestVis.legend', { defaultValue: 'Who can see the guest list' })}
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {GUESTLIST_VISIBILITIES.map((v) => {
            const Icon = ICONS[v]
            const on = value === v
            return (
              <label
                key={v}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                  on
                    ? 'bg-white text-black'
                    : 'bg-white/[0.055] text-white/70 hover:bg-white/[0.09] hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="guestlist-visibility"
                  value={v}
                  checked={on}
                  onChange={() => onChange(v)}
                  className="sr-only"
                />
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${on ? 'text-black' : ''}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">
                    {t(`composer.guestVis.${v}`, {
                      defaultValue:
                        v === 'faces' ? 'Faces and names' : v === 'count' ? 'Count only' : 'Not showing',
                    })}
                  </span>
                  <span className={`block text-[11px] leading-snug ${on ? 'text-black/60' : 'text-white/45'}`}>
                    {t(`composer.guestVis.${v}Hint`, {
                      defaultValue:
                        v === 'faces'
                          ? 'Who is going, with photos'
                          : v === 'count'
                            ? 'How many, no names'
                            : 'Keep attendance private',
                    })}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
