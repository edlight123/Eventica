'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useToast } from '@/components/ui/Toast'
import { useOrganizerClientGuard } from '@/lib/hooks/useOrganizerClientGuard'

type InviteMethod = 'link' | 'email' | 'phone'

type EventInvite = {
  id: string
  method: InviteMethod
  targetEmail: string | null
  targetPhone: string | null
  expiresAt: any
  revokedAt: any
  usedAt: any
  usedBy: string | null
  createdAt: any
}

type EventMember = {
  id: string
  role: string
  permissions: { checkin?: boolean; viewAttendees?: boolean }
  createdAt: any
}

type MemberProfile = {
  email: string | null
  full_name: string | null
}

export default function EventStaffManager({ eventId }: { eventId: string }) {
  const { showToast } = useToast()
  const { firebaseUser, loading: authLoading } = useOrganizerClientGuard({
    loginRedirectPath: `/auth/login?redirect=/organizer/events/${eventId}/staff`,
    upgradeRedirectPath: `/organizer?redirect=/organizer/events/${eventId}/staff`,
  })

  const authReady = !authLoading
  const authUid = firebaseUser?.uid || null

  const [invites, setInvites] = useState<EventInvite[]>([])
  const [members, setMembers] = useState<EventMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Record<string, MemberProfile>>({})
  const [listenerError, setListenerError] = useState<string | null>(null)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [method, setMethod] = useState<InviteMethod>('link')
  const [targetEmail, setTargetEmail] = useState('')
  const [targetPhone, setTargetPhone] = useState('')
  const [viewAttendees, setViewAttendees] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (method === 'email') return Boolean(targetEmail.trim())
    if (method === 'phone') return Boolean(targetPhone.trim())
    return true
  }, [method, targetEmail, targetPhone])

  useEffect(() => {
    if (!authReady) return
    if (!authUid) {
      // Not signed in yet (or session-only auth); avoid starting listeners that will permission-deny.
      setInvites([])
      setMembers([])
      setMemberProfiles({})
      setListenerError(null)
      return
    }

    setListenerError(null)

    const invitesRef = collection(db, 'events', eventId, 'invites')
    const membersRef = collection(db, 'events', eventId, 'members')

    const unsubInvites = onSnapshot(
      query(invitesRef, orderBy('createdAt', 'desc')),
      (snap) => {
        const next: EventInvite[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        setInvites(next)
      },
      (error) => {
        // Prevent unhandled snapshot errors from crashing the page.
        console.error('Invites listener error:', error)
        setListenerError('Unable to load invites. You may not have permission for this event.')
      }
    )

    const unsubMembers = onSnapshot(
      query(membersRef, orderBy('createdAt', 'desc')),
      (snap) => {
        const next: EventMember[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        setMembers(next)
      },
      (error) => {
        console.error('Members listener error:', error)
        setListenerError('Unable to load staff members. You may not have permission for this event.')
      }
    )

    return () => {
      unsubInvites()
      unsubMembers()
    }
  }, [authReady, authUid, eventId])

  useEffect(() => {
    if (!authReady || !authUid) return
    if (members.length === 0) {
      setMemberProfiles({})
      return
    }

    const missingUids = Array.from(
      new Set(
        members
          .map((m) => m.id)
          .filter((uid) => uid && !memberProfiles[uid])
      )
    )

    if (missingUids.length === 0) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/staff/members/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, uids: missingUids }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          console.error('Failed to resolve profiles:', json?.error || res.statusText)
          return
        }

        const profiles = (json as any)?.profiles as Record<string, MemberProfile> | undefined
        if (!profiles || cancelled) return

        setMemberProfiles((prev) => ({ ...prev, ...profiles }))
      } catch (e) {
        console.error('Failed to resolve member profiles:', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady, authUid, eventId, members, memberProfiles])

  const handleCreateInvite = useCallback(async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/staff/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        eventId,
        method,
        ...(method === 'email' ? { targetEmail: targetEmail.trim() } : {}),
        ...(method === 'phone' ? { targetPhone: targetPhone.trim() } : {}),
        permissions: { viewAttendees },
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = String(json?.error || 'Failed to create invite')
        showToast({ title: 'Error', message, type: 'error' })
        return
      }

      const inviteUrl = (json as any)?.inviteUrl as string | undefined
      if (inviteUrl) {
        try {
          await navigator.clipboard.writeText(inviteUrl)
          showToast({ title: 'Invite link copied', message: 'Share it with your staff member.', type: 'success' })
        } catch {
          showToast({ title: 'Invite created', message: inviteUrl, type: 'success' })
        }
      } else {
        showToast({ title: 'Invite created', message: 'Share the invite link with your staff member.', type: 'success' })
      }

      setShowInviteModal(false)
      setTargetEmail('')
      setTargetPhone('')
      setViewAttendees(false)
      setMethod('link')
    } catch (err: any) {
      showToast({ title: 'Error', message: err?.message || 'Failed to create invite', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, eventId, method, showToast, targetEmail, targetPhone, viewAttendees])

  const handleRevokeInvite = useCallback(
    async (inviteId: string) => {
      if (!confirm('Revoke this invite?')) return
      try {
        const res = await fetch('/api/staff/invites/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, inviteId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          showToast({ title: 'Error', message: String(json?.error || 'Failed to revoke invite'), type: 'error' })
          return
        }
        showToast({ title: 'Invite revoked', message: 'The link can no longer be used.', type: 'success' })
      } catch (err: any) {
        showToast({ title: 'Error', message: err?.message || 'Failed to revoke invite', type: 'error' })
      }
    },
    [eventId, showToast]
  )

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!confirm('Remove this staff member?')) return
      try {
        const res = await fetch('/api/staff/members/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, memberId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          showToast({ title: 'Error', message: String(json?.error || 'Failed to remove member'), type: 'error' })
          return
        }
        showToast({ title: 'Member removed', message: 'Staff access removed.', type: 'success' })
      } catch (err: any) {
        showToast({ title: 'Error', message: err?.message || 'Failed to remove member', type: 'error' })
      }
    },
    [eventId, showToast]
  )

  return (
    <div className="space-y-6">
      {listenerError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {listenerError}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Invite Staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Staff Members</h3>
          <p className="text-sm text-gray-600">Event-scoped access for check-in</p>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-600">No staff members yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((m) => {
                  const profile = memberProfiles[m.id]
                  const displayName = profile?.full_name || profile?.email || m.id
                  const showEmail = profile?.full_name && profile?.email

                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{displayName}</div>
                        <div className="text-sm text-gray-500">{m.role || 'staff'}</div>
                        {showEmail && (
                          <div className="text-xs text-gray-500 mt-0.5">{profile.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Check-in: {m.permissions?.checkin ? 'Yes' : 'No'}
                        <br />
                        View attendees: {m.permissions?.viewAttendees ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleRemoveMember(m.id)} className="text-red-600 hover:text-red-800">
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Invites</h3>
          <p className="text-sm text-gray-600">Invite links are one-time use. Create a new one if lost.</p>
        </div>
        {invites.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-600">No invites yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invites.map((inv) => {
                  const status = inv.revokedAt
                    ? 'Revoked'
                    : inv.usedAt
                      ? 'Claimed'
                      : 'Pending'

                  const target = inv.method === 'email' ? inv.targetEmail : inv.method === 'phone' ? inv.targetPhone : 'Link'

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{inv.method}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{target || ''}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{status}</td>
                      <td className="px-6 py-4 text-right">
                        {!inv.revokedAt && !inv.usedAt ? (
                          <button onClick={() => handleRevokeInvite(inv.id)} className="text-red-600 hover:text-red-800">
                            Revoke
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-display text-xl text-gray-900 mb-4">Invite Staff</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as InviteMethod)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="link">Link</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              {method === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="staff@example.com"
                  />
                </div>
              )}

              {method === 'phone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+509..."
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={viewAttendees} onChange={(e) => setViewAttendees(e.target.checked)} />
                Allow viewing attendee details
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setTargetEmail('')
                    setTargetPhone('')
                    setViewAttendees(false)
                    setMethod('link')
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleCreateInvite}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating…' : 'Create Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
