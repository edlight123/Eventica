'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/organizer/ui'

/**
 * PageHeader for a SERVER page whose heading needs translating.
 *
 * Organizer pages are mostly server components — they read auth cookies and
 * query Firestore with the Admin SDK — so they cannot call useTranslation, which
 * left their headings as the last English text on otherwise translated screens.
 *
 * The page passes KEYS rather than text: a server component can hand a client
 * component data, but not a translation it has no way to perform. Doing it this
 * way keeps the page a server component (no data crossing the boundary, no
 * refactor of its queries) and confines the client bundle to the heading.
 */
export function TranslatedPageHeader({
  eyebrowKey,
  titleKey,
  subtitleKey,
  actions,
}: {
  /** Keys under `page_headers` in organizer.json. */
  eyebrowKey?: string
  titleKey: string
  subtitleKey?: string
  /** JSX may cross the server/client boundary as a prop, so action buttons
   *  defined on the server page still render here. */
  actions?: React.ReactNode
}) {
  const { t } = useTranslation('organizer')

  return (
    <PageHeader
      eyebrow={eyebrowKey ? t(`page_headers.${eyebrowKey}`) : undefined}
      title={t(`page_headers.${titleKey}`)}
      subtitle={subtitleKey ? t(`page_headers.${subtitleKey}`) : undefined}
      actions={actions}
    />
  )
}
