'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Clock,
  Compass,
  Megaphone,
  MessageCircle,
  Repeat,
  ShieldCheck,
  Ticket,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { markAsRead, markAllAsRead } from '@/lib/notifications'
import { ConfirmProvider, useConfirm } from '@/components/ui/ConfirmProvider'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { dateLocaleFor, intlLocaleFor } from '@/lib/dateLocale'
import type { Notification } from '@/types/notifications'

interface NotificationsClientProps {
  userId: string
  initialNotifications: Notification[]
  initialUnreadCount: number
}

/* ------------------------------------------------------------------ *
 * Type → icon + accent
 *
 * The feed used to lead with emoji, which reads as unfinished next to the
 * rest of the app (lucide + Instrument Serif + Space Grotesk). Each type now
 * gets a lucide glyph in a hairline, faintly tinted square, and a semantic
 * accent so the eye can triage a long list at a glance. The accent lives in
 * the glyph and its hairline only — never a filled pill.
 * ------------------------------------------------------------------ */

type ToneKey = 'teal' | 'amber' | 'rose' | 'sky' | 'violet' | 'emerald' | 'neutral'

const TONES: Record<ToneKey, { fg: string; ring: string; tint: string }> = {
  teal: { fg: 'text-brand-300', ring: 'border-brand-400/25', tint: 'bg-brand-400/[0.07]' },
  amber: { fg: 'text-amber-200', ring: 'border-amber-300/25', tint: 'bg-amber-300/[0.07]' },
  rose: { fg: 'text-rose-200', ring: 'border-rose-300/25', tint: 'bg-rose-300/[0.07]' },
  sky: { fg: 'text-sky-200', ring: 'border-sky-300/25', tint: 'bg-sky-300/[0.07]' },
  violet: { fg: 'text-violet-200', ring: 'border-violet-300/25', tint: 'bg-violet-300/[0.07]' },
  emerald: { fg: 'text-emerald-200', ring: 'border-emerald-300/25', tint: 'bg-emerald-300/[0.07]' },
  neutral: { fg: 'text-white/65', ring: 'border-white/12', tint: 'bg-white/[0.04]' },
}

function markFor(type: string): { Icon: LucideIcon; tone: ToneKey } {
  switch (type) {
    case 'ticket_purchased':
      return { Icon: Ticket, tone: 'teal' }
    case 'ticket_transfer':
      return { Icon: Repeat, tone: 'teal' }
    case 'event_updated':
      return { Icon: Megaphone, tone: 'sky' }
    case 'event_reminder_24h':
    case 'event_reminder_3h':
    case 'event_reminder_30min':
      return { Icon: Clock, tone: 'amber' }
    case 'event_cancelled':
      return { Icon: XCircle, tone: 'rose' }
    case 'payment_dispute':
      return { Icon: AlertTriangle, tone: 'rose' }
    case 'staff_invite':
      return { Icon: Users, tone: 'violet' }
    case 'connection_request':
    case 'connection_accepted':
      return { Icon: UserPlus, tone: 'violet' }
    case 'organizer_message':
    case 'organizer_reply':
      return { Icon: MessageCircle, tone: 'neutral' }
    case 'verification':
    case 'verification_submitted':
    case 'verification_approved':
    case 'verification_rejected':
    case 'verification_info_needed':
      return { Icon: ShieldCheck, tone: 'emerald' }
    default:
      return { Icon: Bell, tone: 'neutral' }
  }
}

/* ------------------------------------------------------------------ *
 * Time buckets
 * ------------------------------------------------------------------ */

type BucketKey = 'today' | 'yesterday' | 'this_week' | 'earlier'

const BUCKET_ORDER: BucketKey[] = ['today', 'yesterday', 'this_week', 'earlier']

function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function bucketFor(when: number, now: number): BucketKey {
  const today = startOfLocalDay(now)
  if (when >= today) return 'today'
  if (when >= today - 86_400_000) return 'yesterday'
  if (when >= today - 7 * 86_400_000) return 'this_week'
  return 'earlier'
}

/** Shared quiet-button calibration: hairline ghost, teal never fills. */
const GHOST_BUTTON =
  'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13px] font-medium ' +
  'transition-colors duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45'

export function NotificationsClient(props: NotificationsClientProps) {
  // The clear-all guard routes through the shared confirm primitive, so the
  // page needs the provider above the component that calls useConfirm().
  return (
    <ConfirmProvider>
      <NotificationsFeed {...props} />
    </ConfirmProvider>
  )
}

function NotificationsFeed({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationsClientProps) {
  const router = useRouter()
  const { t, i18n } = useTranslation('notifications')
  const confirmDialog = useConfirm()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // "Today" is a local-calendar idea, so it can only be decided in the
  // visitor's timezone. Grouping therefore waits for mount: the server render
  // (UTC) and the first client render agree on a flat list, then the buckets
  // settle in with the reader's own clock — no hydration drift.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
  }, [])

  const intlLocale = intlLocaleFor(i18n.language)
  const fnsLocale = dateLocaleFor(i18n.language)

  const groups = useMemo(() => {
    if (now === null) {
      return [{ key: null as BucketKey | null, items: notifications }]
    }
    const byBucket = new Map<BucketKey, Notification[]>()
    for (const n of notifications) {
      const ms = new Date(n.createdAt).getTime()
      const key = Number.isNaN(ms) ? 'earlier' : bucketFor(ms, now)
      const list = byBucket.get(key)
      if (list) list.push(n)
      else byBucket.set(key, [n])
    }
    return BUCKET_ORDER.filter((k) => byBucket.has(k)).map((k) => ({
      key: k as BucketKey | null,
      items: byBucket.get(k)!,
    }))
  }, [notifications, now])

  const groupLabel = (key: BucketKey): string => {
    switch (key) {
      case 'today':
        return t('groups.today', { defaultValue: 'Today' })
      case 'yesterday':
        return t('groups.yesterday', { defaultValue: 'Yesterday' })
      case 'this_week':
        return t('groups.this_week', { defaultValue: 'This week' })
      default:
        return t('groups.earlier', { defaultValue: 'Earlier' })
    }
  }

  /** "2m ago" / "4h ago" / "yesterday" / "Tuesday" / "12 Aug" — localized. */
  const relativeTime = (iso: string): string => {
    const ms = new Date(iso).getTime()
    if (Number.isNaN(ms)) return ''

    const absolute = (withYear: boolean) =>
      new Intl.DateTimeFormat(intlLocale, {
        month: 'short',
        day: 'numeric',
        ...(withYear ? { year: 'numeric' } : {}),
      }).format(ms)

    if (now === null) return absolute(false)

    const minutes = Math.floor((now - ms) / 60_000)
    if (minutes < 1) return t('time.just_now', { defaultValue: 'Just now' })
    if (minutes < 60) return t('time.minutes_ago', { defaultValue: '{{value}}m ago', value: minutes })

    const bucket = bucketFor(ms, now)
    if (bucket === 'today') {
      return t('time.hours_ago', { defaultValue: '{{value}}h ago', value: Math.floor(minutes / 60) })
    }
    if (bucket === 'yesterday') return t('time.yesterday', { defaultValue: 'yesterday' })
    if (bucket === 'this_week') {
      return new Intl.DateTimeFormat(intlLocale, { weekday: 'long' }).format(ms)
    }
    return absolute(new Date(ms).getFullYear() !== new Date(now).getFullYear())
  }

  /** Full date on hover — the precise answer behind the relative one. */
  const exactTime = (iso: string): string | undefined => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return undefined
    try {
      return format(d, 'PPPp', { locale: fnsLocale })
    } catch {
      return undefined
    }
  }

  const handleAcceptStaffInvite = async (notification: Notification) => {
    const metadata = (notification as any)?.metadata || {}
    const eventId = String(metadata?.eventId || notification.eventId || '')
    const token = String(metadata?.token || '')

    if (!eventId || !token) {
      alert(
        t('invite.missing_details', {
          defaultValue: 'Missing invite details. Please open the invite link.',
        })
      )
      return
    }

    try {
      const res = await fetch('/api/staff/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, token }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || t('invite.accept_failed', { defaultValue: 'Failed to accept invite' })
        alert(msg)
        return
      }

      if (!notification.isRead) {
        await handleMarkAsRead(notification.id)
      }

      // Send the user to the staff hub.
      router.push('/staff')
    } catch (error) {
      console.error('Error accepting staff invite:', error)
      alert(t('invite.accept_failed', { defaultValue: 'Failed to accept invite' }))
    }
  }

  const handleDeclineStaffInvite = async (notification: Notification) => {
    const metadata = (notification as any)?.metadata || {}
    const eventId = String(metadata?.eventId || notification.eventId || '')
    const token = String(metadata?.token || '')

    if (!eventId || !token) {
      alert(
        t('invite.missing_details', {
          defaultValue: 'Missing invite details. Please open the invite link.',
        })
      )
      return
    }

    try {
      const res = await fetch('/api/staff/invites/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, token }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || t('invite.decline_failed', { defaultValue: 'Failed to decline invite' })
        alert(msg)
        return
      }

      if (!notification.isRead) {
        await handleMarkAsRead(notification.id)
      }

      // Dismiss it from the list (it will still exist in Firestore as read).
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    } catch (error) {
      console.error('Error declining staff invite:', error)
      alert(t('invite.decline_failed', { defaultValue: 'Failed to decline invite' }))
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(userId, notificationId)

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsLoading(true)
    try {
      await markAllAsRead(userId)

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    const ok = await confirmDialog({
      title: t('clear_all', { defaultValue: 'Clear all' }),
      description: t('confirm_clear', {
        defaultValue: 'Are you sure you want to clear all notifications? This cannot be undone.',
      }),
      confirmLabel: t('clear_all', { defaultValue: 'Clear all' }),
      cancelLabel: t('cancel', { defaultValue: 'Cancel' }),
      variant: 'danger',
    })
    if (!ok) return

    setIsClearing(true)
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear notifications')
      }

      // Clear local state
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
      alert(t('clear_failed', { defaultValue: 'Failed to clear notifications. Please try again.' }))
    } finally {
      setIsClearing(false)
    }
  }

  const getNotificationLink = (notification: Notification): string => {
    if ((notification as any).actionUrl) {
      return (notification as any).actionUrl as string
    }
    if (notification.ticketId) {
      return `/tickets/${notification.ticketId}`
    }
    if (notification.eventId) {
      return `/events/${notification.eventId}`
    }
    return '#'
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }

    const link = getNotificationLink(notification)
    if (link !== '#') {
      router.push(link)
    }
  }

  const renderRow = (notification: Notification) => {
    const { Icon, tone } = markFor(notification.type)
    const accent = TONES[tone]
    const unread = !notification.isRead
    const link = getNotificationLink(notification)
    const body =
      notification.type === 'organizer_reply'
        ? (notification.metadata as any)?.replyBody || notification.message
        : notification.message

    return (
      <div
        key={notification.id}
        role="button"
        tabIndex={0}
        onClick={() => handleNotificationClick(notification)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleNotificationClick(notification)
          }
        }}
        className={[
          'group relative cursor-pointer border-b border-white/[0.07] outline-none',
          'transition-colors duration-500 motion-reduce:transition-none',
          'hover:bg-white/[0.03] focus-visible:bg-white/[0.04]',
          unread ? 'bg-white/[0.02]' : 'bg-transparent',
        ].join(' ')}
      >
        {/* Unread rail — always in the layout so a row settles into "read"
            by fading its accent out rather than reflowing. */}
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute left-0 top-0 h-full w-[2px]',
            'transition-colors duration-700 motion-reduce:transition-none',
            unread ? 'bg-brand-400/70' : 'bg-transparent',
          ].join(' ')}
        />

        <div className="flex items-start gap-3.5 px-4 py-4 sm:py-5">
          {/* Icon */}
          <div
            className={[
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
              accent.ring,
              accent.tint,
              'transition-opacity duration-500 motion-reduce:transition-none',
              unread ? 'opacity-100' : 'opacity-60',
            ].join(' ')}
          >
            <Icon className={`h-[17px] w-[17px] ${accent.fg}`} strokeWidth={1.6} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3
                className={[
                  'font-grotesk text-[15px] font-medium leading-snug tracking-[-0.01em]',
                  'transition-colors duration-500 motion-reduce:transition-none',
                  unread ? 'text-white' : 'text-white/65',
                ].join(' ')}
              >
                {notification.title}
              </h3>

              {unread && (
                // Dot + label, never a filled badge.
                <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  <span className="eyebrow text-brand-400/90">
                    {t('new_label', { defaultValue: 'New' })}
                  </span>
                </span>
              )}
            </div>

            {/* An organizer's reply is the answer to a question the
                attendee asked, so show it in full rather than the
                list-friendly excerpt stored in `message`. */}
            <p
              className={[
                'mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed',
                'transition-colors duration-500 motion-reduce:transition-none',
                unread ? 'text-white/60' : 'text-white/45',
              ].join(' ')}
            >
              {body}
            </p>

            {notification.type === 'staff_invite' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcceptStaffInvite(notification)
                  }}
                  className={`${GHOST_BUTTON} border-brand-400/30 text-brand-300 hover:border-brand-400/60 hover:bg-brand-400/[0.06]`}
                >
                  {t('invite.accept', { defaultValue: 'Accept invite' })}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeclineStaffInvite(notification)
                  }}
                  className={`${GHOST_BUTTON} border-white/12 text-white/60 hover:border-white/25 hover:text-white/85`}
                >
                  {t('invite.decline', { defaultValue: 'Decline' })}
                </button>
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-3">
              <span
                className="label-mono text-[11px] text-white/35"
                title={exactTime(notification.createdAt)}
                suppressHydrationWarning
              >
                {relativeTime(notification.createdAt)}
              </span>

              {link !== '#' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-white/35 transition-colors duration-200 motion-reduce:transition-none group-hover:text-brand-300">
                  {t('view_details', { defaultValue: 'View details' })}
                  <ArrowUpRight className="h-3 w-3" strokeWidth={1.8} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasUnread = unreadCount > 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <EditorialHeader
          tone="dark"
          eyebrow={t('eyebrow', { defaultValue: 'Your inbox' })}
          title={t('title', { defaultValue: 'Notifications' })}
          subtitle={
            hasUnread
              ? t('unread_count', {
                  count: unreadCount,
                  defaultValue: 'You have {{count}} unread notifications',
                })
              : t('all_caught_up', { defaultValue: "You're all caught up!" })
          }
          actions={
            notifications.length > 0 ? (
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                {hasUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={isLoading}
                    className={`${GHOST_BUTTON} border-white/12 text-white/75 hover:border-white/25 hover:text-white`}
                  >
                    {isLoading
                      ? t('working', { defaultValue: 'Working…' })
                      : t('mark_all_read', { defaultValue: 'Mark all read' })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className={`${GHOST_BUTTON} border-white/10 text-white/50 hover:border-rose-300/35 hover:text-rose-200`}
                >
                  {isClearing
                    ? t('working', { defaultValue: 'Working…' })
                    : t('clear_all', { defaultValue: 'Clear all' })}
                </button>
              </div>
            ) : undefined
          }
        />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.015] px-6 py-16 text-center sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Bell className="h-6 w-6 text-white/40" strokeWidth={1.4} />
            </div>
            <h3 className="mt-6 font-display text-[clamp(22px,3.2vw,30px)] leading-[1.06] text-white">
              {t('empty.title', { defaultValue: 'No notifications yet' })}
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-white/50">
              {t('empty.description', {
                defaultValue: "When you get notifications, they'll show up here.",
              })}
            </p>
            <Link
              href="/discover"
              className={`${GHOST_BUTTON} mt-7 border-white/15 px-5 py-2.5 text-white/85 hover:border-white/30 hover:bg-white/5`}
            >
              <Compass className="h-4 w-4" strokeWidth={1.7} />
              {t('empty.cta', { defaultValue: 'Find events' })}
            </Link>
          </div>
        ) : (
          <div className="mt-8 sm:mt-10">
            {groups.map((group, index) => (
              <section key={group.key ?? 'all'}>
                {group.key && (
                  <div
                    className={`flex items-center gap-3 pb-3 ${index === 0 ? 'pt-0' : 'pt-8'}`}
                  >
                    <p className="eyebrow text-white/35">{groupLabel(group.key)}</p>
                    <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
                  </div>
                )}
                <div className="border-t border-white/[0.07]">{group.items.map(renderRow)}</div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
