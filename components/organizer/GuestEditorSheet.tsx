'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, Loader2, User, X } from 'lucide-react'
import { firebaseDb } from '@/lib/firebase-db/client'
import type { GuestRole, LineupEntry } from '@/lib/lineup'

/**
 * The lineup entry editor.
 *
 * A name and a role alone make a list; a face, a link and a set time make a
 * bill. This is the sheet where one act is filled in — modelled on the layout
 * organizers already know from Posh: a circular photo well on the left with the
 * name and link stacked beside it, then the bio, then the set window, then
 * Cancel / Save pinned to the bottom edge.
 *
 * It edits a COPY held by the parent, so Cancel genuinely discards.
 */

export default function GuestEditorSheet({
  draft,
  roles,
  isNew,
  /** Upload route for signed-out visitors; undefined uses the client SDK. */
  endpoint,
  onPatch,
  onSave,
  onCancel,
}: {
  draft: LineupEntry
  roles: readonly GuestRole[]
  isNew: boolean
  endpoint?: string
  onPatch: (patch: Partial<LineupEntry>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('common')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Open focused on the first field, and let Escape dismiss — the sheet covers
  // the form, so a keyboard user must be able to get back out of it.
  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The sheet is fixed-position over a scrolling page; without locking the body
  // the page behind scrolls under it on wheel/touch.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError(t('composer.guest.photoType', { defaultValue: 'Please choose an image file.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('composer.guest.photoSize', { defaultValue: 'Image must be under 5MB.' }))
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      if (endpoint) {
        // Signed-out: the API route writes it with the admin SDK, under the
        // same guest-uploads/ TTL as the poster.
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(endpoint, { method: 'POST', body: form })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body?.url) throw new Error(body?.error || 'Upload failed')
        onPatch({ photoUrl: body.url })
      } else {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `event-images/${crypto.randomUUID()}.${ext}`
        const { error, data } = await firebaseDb.storage
          .from('event-images')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (error) throw error
        let url = data?.publicUrl
        if (!url) {
          url = (await firebaseDb.storage.from('event-images').getPublicUrl(path)).data.publicUrl
        }
        // Never report success without a URL, or the sheet shows a photo the
        // saved entry does not actually have.
        if (!url) throw new Error('Upload did not return a public URL')
        onPatch({ photoUrl: url })
      }
    } catch (err: any) {
      setUploadError(
        err?.message || t('composer.guest.photoFailed', { defaultValue: 'Upload failed. Please try again.' })
      )
    } finally {
      setUploading(false)
    }
  }

  const field =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none'
  const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/45'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('common.close', { defaultValue: 'Close' })}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          isNew
            ? t('composer.guest.addTitle', { defaultValue: 'Add to lineup' })
            : t('composer.guest.editTitle', { defaultValue: 'Edit lineup entry' })
        }
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0f0e] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-white">
            {isNew
              ? t('composer.guest.addTitle', { defaultValue: 'Add to lineup' })
              : t('composer.guest.editTitle', { defaultValue: 'Edit lineup entry' })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Photo well + the two identity fields beside it */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/[0.05] transition-colors hover:border-white/30 disabled:opacity-60"
              aria-label={t('composer.guest.photo', { defaultValue: 'Add a photo' })}
            >
              {draft.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <User className="h-7 w-7 text-white/35" />
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                    {draft.photoUrl
                      ? t('composer.guest.change', { defaultValue: 'Change' })
                      : t('composer.guest.add', { defaultValue: 'Add' })}
                  </span>
                )}
              </span>
              {uploading && !draft.photoUrl && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </span>
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-2.5">
              <input
                ref={nameRef}
                value={draft.name}
                onChange={(e) => onPatch({ name: e.target.value })}
                placeholder={t('composer.guestNamePlaceholder', { defaultValue: 'Artist or guest name' })}
                aria-label={t('composer.guest.name', { defaultValue: 'Name' })}
                className={field}
              />
              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                <Link2 className="h-[18px] w-[18px] shrink-0 text-white/40" aria-hidden />
                <input
                  value={draft.link}
                  onChange={(e) => onPatch({ link: e.target.value })}
                  inputMode="url"
                  placeholder={t('composer.guest.linkPlaceholder', {
                    defaultValue: 'Instagram, Spotify, website…',
                  })}
                  aria-label={t('composer.guest.link', { defaultValue: 'Link' })}
                  className="w-full bg-transparent py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

          {uploadError && (
            <p className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">{uploadError}</p>
          )}

          <div>
            <span className={label}>{t('composer.guest.role', { defaultValue: 'Role' })}</span>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const on = draft.role === role
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onPatch({ role })}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                      on
                        ? 'border-white bg-white text-gray-900'
                        : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {t(`composer.roles.${role}`, { defaultValue: role })}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="guest-desc">
              {t('composer.guest.description', { defaultValue: 'Description' })}
            </label>
            <textarea
              id="guest-desc"
              value={draft.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder={t('composer.guest.descriptionPlaceholder', {
                defaultValue: 'A line about them: who they are, what they play.',
              })}
              className={`${field} resize-none`}
            />
          </div>

          {/* Set window. Wall-clock times on the event's own evening, so a
              lineup can read like a running order. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="guest-start">
                {t('composer.guest.startTime', { defaultValue: 'Start time' })}
              </label>
              <input
                id="guest-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => onPatch({ startTime: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="guest-end">
                {t('composer.guest.endTime', { defaultValue: 'End time' })}
              </label>
              <input
                id="guest-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => onPatch({ endTime: e.target.value })}
                className={field}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-white/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.name.trim() || uploading}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.save', { defaultValue: 'Save' })}
          </button>
        </div>
      </div>
    </div>
  )
}
