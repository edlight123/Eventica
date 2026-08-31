'use client'

// The sign-off. posh closes with "See you soon." — Tikèm closes in Kreyòl,
// in the editorial voice, with the two funnels the page hasn't served yet:
// the app, and the organizer door.

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const APP_STORE_URL = 'https://apps.apple.com/app/id6794334427'

export default function HomeOutro() {
  const { t } = useTranslation('common')
  return (
    <section className="bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32 lg:px-8">
        <h2 className="font-display lowercase italic !text-[clamp(44px,8vw,104px)] !leading-[1.02] text-white">
          {t('home.outro', { defaultValue: 'nou wè aswè a.' })}
        </h2>
        <p className="mt-3 text-[14px] text-white/50">
          {t('home.outro_sub', { defaultValue: 'see you tonight — tikèm' })}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
          >
            {t('home.get_app', { defaultValue: 'Get the app' })}
          </a>
          <Link
            href="/organizer"
            className="inline-flex items-center rounded-xl border border-white/12 px-6 py-3 text-sm font-normal text-white/80 transition-colors duration-200 hover:border-white/25 hover:text-white"
          >
            {t('home.create_event', { defaultValue: 'Create an event' })}
          </Link>
        </div>
      </div>
    </section>
  )
}
