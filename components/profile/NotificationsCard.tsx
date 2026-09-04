'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserProfile } from '@/lib/firestore/user-profile'
import { ProfileSection, Panel, PanelRows, SwitchRow } from './ui'

interface NotificationsCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

/**
 * Three switches.
 *
 * Before: a bordered card, an empty 40px box around a `text-brand-600` bell, and
 * three copies of the same toggle markup whose knob was `bg-white/[0.03]` —
 * invisible on both a teal and a grey track, so the control's state was carried
 * by the track alone. The closing note was `bg-white/[0.03] border
 * border-white/10`: a hairline around a footnote.
 *
 * Now: one filled panel, hairline-divided rows (the one place a line is the
 * meaning), the shared Switch with a white knob, and the note as plain muted
 * type under the panel — a footnote does not need a box.
 */
export function NotificationsCard({ profile, onUpdate }: NotificationsCardProps) {
  const { t } = useTranslation('profile')
  const [notify, setNotify] = useState(profile.notify || {
    reminders: true,
    updates: true,
    promos: false
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (key: 'reminders' | 'updates' | 'promos') => {
    const newNotify = { ...notify, [key]: !notify[key] }
    setNotify(newNotify)
    setIsUpdating(true)
    try {
      await onUpdate({ notify: newNotify })
    } catch (error) {
      console.error('Failed to update notifications:', error)
      // Revert on error
      setNotify(notify)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <ProfileSection title={t('notifications.title')} description={t('notifications.subtitle')}>
      <Panel>
        <PanelRows>
          <SwitchRow
            title={t('notifications.event_reminders')}
            description={t('notifications.event_reminders_desc')}
            checked={notify.reminders}
            onChange={() => handleToggle('reminders')}
            disabled={isUpdating}
          />
          <SwitchRow
            title={t('notifications.event_updates')}
            description={t('notifications.event_updates_desc')}
            checked={notify.updates}
            onChange={() => handleToggle('updates')}
            disabled={isUpdating}
          />
          <SwitchRow
            title={t('notifications.promos')}
            description={t('notifications.promos_desc')}
            checked={notify.promos}
            onChange={() => handleToggle('promos')}
            disabled={isUpdating}
          />
        </PanelRows>
      </Panel>

      <p className="mt-3 !text-[12px] !leading-relaxed text-white/35">{t('notifications.note')}</p>
    </ProfileSection>
  )
}
