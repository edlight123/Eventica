'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  Music,
  Trophy,
  Palette,
  Briefcase,
  PartyPopper,
  Sparkles,
  Drama,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/filters/config'
import { getPosterTheme } from '@/lib/posterGradient'

const ICONS: Record<string, LucideIcon> = {
  Concert: Music,
  Party: PartyPopper,
  Festival: Sparkles,
  Conference: Briefcase,
  Workshop: Palette,
  Sports: Trophy,
  Theater: Drama,
  Other: Ticket,
}

/**
 * Editorial category browser.
 * Each category renders as a deterministic gradient tile (matching the poster
 * cards) with a frosted icon chip and a grotesk label — cohesive, image-free
 * and fast.
 */
export default function CategoryGrid() {
  const { t } = useTranslation('common')

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {CATEGORIES.map((name) => {
        const Icon = ICONS[name] || Sparkles
        const theme = getPosterTheme(name, name)
        const label = t(`categories.${name}`, { defaultValue: name })

        return (
          <Link
            key={name}
            href={`/?category=${encodeURIComponent(name)}`}
            className="group focus-ring rounded-2xl"
            aria-label={label}
          >
            <div
              className="poster-vignette relative flex h-24 items-end overflow-hidden rounded-2xl p-3 text-white shadow-poster-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-card-hover sm:h-28"
              style={{ backgroundImage: theme.bg }}
            >
              <span
                className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              >
                <Icon className="h-[17px] w-[17px] text-white" />
              </span>
              <span className="relative z-10 font-grotesk text-[13.5px] font-semibold leading-tight tracking-tight drop-shadow sm:text-sm">
                {label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
