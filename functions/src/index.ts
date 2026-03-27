import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import crypto from 'crypto'

initializeApp()

const db = getFirestore()

const cors = [
  'https://joineventica.com',
  'http://localhost:3000',
]

type InviteMethod = 'email' | 'phone' | 'link'

type EventInvitePermissions = {
  checkin: true
  viewAttendees: boolean
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function randomToken(bytes: number = 32): string {
  // URL-safe base64 (no padding)
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function assertEventOwner(params: { eventId: string; uid: string }): Promise<void> {
  const { eventId, uid } = params

  const eventRef = db.collection('events').doc(eventId)
  const memberRef = eventRef.collection('members').doc(uid)

  const [eventSnap, memberSnap] = await Promise.all([eventRef.get(), memberRef.get()])

  if (!eventSnap.exists) {
    throw new HttpsError('not-found', 'Event not found')
  }

  const event = eventSnap.data() as any
  const organizerId = String(event?.organizer_id || event?.organizerId || '')

  const memberRole = memberSnap.exists ? String((memberSnap.data() as any)?.role || '') : ''

  if (organizerId !== uid && memberRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the event owner can perform this action')
  }
}

export const createEventInvite = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication required')

  const eventId = String((request.data as any)?.eventId || '')
  const method = String((request.data as any)?.method || '') as InviteMethod
  const targetEmail = (request.data as any)?.targetEmail ? String((request.data as any).targetEmail).toLowerCase() : undefined
  const targetPhone = (request.data as any)?.targetPhone ? String((request.data as any).targetPhone) : undefined
  const permissions = (request.data as any)?.permissions as Partial<EventInvitePermissions> | undefined

  if (!eventId) throw new HttpsError('invalid-argument', 'eventId is required')
  if (method !== 'email' && method !== 'phone' && method !== 'link') {
    throw new HttpsError('invalid-argument', 'Invalid method')
  }

  if (method === 'email' && !targetEmail) {
    throw new HttpsError('invalid-argument', 'targetEmail is required for email invites')
  }
  if (method === 'phone' && !targetPhone) {
    throw new HttpsError('invalid-argument', 'targetPhone is required for phone invites')
  }

  const normalizedPermissions: EventInvitePermissions = {
    checkin: true,
    viewAttendees: Boolean(permissions?.viewAttendees),
  }

  await assertEventOwner({ eventId, uid })

  const token = randomToken(32)
  const tokenHash = sha256Hex(token)

  const now = FieldValue.serverTimestamp()
  const expiresAt = Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000)

  const inviteRef = db.collection('events').doc(eventId).collection('invites').doc()

  await inviteRef.set({
    tokenHash,
    method,
    targetEmail: method === 'email' ? targetEmail : null,
    targetPhone: method === 'phone' ? targetPhone : null,
    role: 'staff',
    permissions: normalizedPermissions,
    expiresAt,
    revokedAt: null,
    usedAt: null,
    usedBy: null,
    createdAt: now,
    createdBy: uid,
  })

  const inviteUrl = `https://joineventica.com/invite?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`

  return {
    inviteId: inviteRef.id,
    inviteUrl,
    expiresAt: expiresAt.toDate().toISOString(),
  }
})

export const redeemEventInvite = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication required')

  const eventId = String((request.data as any)?.eventId || '')
  const token = String((request.data as any)?.token || '')

  if (!eventId) throw new HttpsError('invalid-argument', 'eventId is required')
  if (!token) throw new HttpsError('invalid-argument', 'token is required')

  const tokenHash = sha256Hex(token)

  const eventRef = db.collection('events').doc(eventId)
  const invitesRef = eventRef.collection('invites')
  const memberRef = eventRef.collection('members').doc(uid)

  const authEmail = request.auth?.token?.email ? String(request.auth.token.email).toLowerCase() : null
  const authPhone = (request.auth?.token as any)?.phone_number ? String((request.auth!.token as any).phone_number) : null

  await db.runTransaction(async (tx) => {
    const inviteQuery = invitesRef.where('tokenHash', '==', tokenHash).limit(1)
    const inviteSnap = await tx.get(inviteQuery)

    if (inviteSnap.empty) {
      throw new HttpsError('not-found', 'Invite not found')
    }

    const inviteDoc = inviteSnap.docs[0]
    const invite = inviteDoc.data() as any

    const expiresAt = invite?.expiresAt as Timestamp | undefined
    if (!expiresAt || typeof (expiresAt as any)?.toDate !== 'function') {
      throw new HttpsError('failed-precondition', 'Invite is invalid')
    }

    if (expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('deadline-exceeded', 'Invite expired')
    }

    if (invite?.revokedAt) {
      throw new HttpsError('failed-precondition', 'Invite was revoked')
    }

    if (invite?.usedAt) {
      throw new HttpsError('already-exists', 'Invite already claimed')
    }

    const method = String(invite?.method || '') as InviteMethod

    if (method === 'email') {
      const targetEmail = invite?.targetEmail ? String(invite.targetEmail).toLowerCase() : null
      if (!authEmail || !targetEmail || authEmail !== targetEmail) {
        throw new HttpsError('permission-denied', 'This invite is restricted to a different email')
      }
    }

    if (method === 'phone') {
      const targetPhone = invite?.targetPhone ? String(invite.targetPhone) : null
      if (!authPhone || !targetPhone || authPhone !== targetPhone) {
        throw new HttpsError('permission-denied', 'This invite is restricted to a different phone number')
      }
    }

    const permissions = (invite?.permissions || {}) as EventInvitePermissions

    tx.set(
      memberRef,
      {
        uid,
        eventId,
        role: 'staff',
        permissions: {
          checkin: true,
          viewAttendees: Boolean(permissions?.viewAttendees),
        },
        createdAt: FieldValue.serverTimestamp(),
        createdBy: invite?.createdBy || null,
      },
      { merge: false }
    )

    tx.update(inviteDoc.ref, {
      usedAt: FieldValue.serverTimestamp(),
      usedBy: uid,
    })
  })

  return { success: true }
})

export const revokeEventInvite = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication required')

  const eventId = String((request.data as any)?.eventId || '')
  const inviteId = String((request.data as any)?.inviteId || '')

  if (!eventId) throw new HttpsError('invalid-argument', 'eventId is required')
  if (!inviteId) throw new HttpsError('invalid-argument', 'inviteId is required')

  await assertEventOwner({ eventId, uid })

  const inviteRef = db.collection('events').doc(eventId).collection('invites').doc(inviteId)

  await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef)
    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invite not found')
    }

    const invite = inviteSnap.data() as any
    if (invite?.usedAt) {
      throw new HttpsError('failed-precondition', 'Invite already claimed')
    }

    tx.update(inviteRef, {
      revokedAt: FieldValue.serverTimestamp(),
    })
  })

  return { success: true }
})

export const removeEventMember = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication required')

  const eventId = String((request.data as any)?.eventId || '')
  const memberId = String((request.data as any)?.memberId || '')

  if (!eventId) throw new HttpsError('invalid-argument', 'eventId is required')
  if (!memberId) throw new HttpsError('invalid-argument', 'memberId is required')

  await assertEventOwner({ eventId, uid })

  const memberRef = db.collection('events').doc(eventId).collection('members').doc(memberId)
  const eventRef = db.collection('events').doc(eventId)

  await db.runTransaction(async (tx) => {
    const [eventSnap, memberSnap] = await Promise.all([tx.get(eventRef), tx.get(memberRef)])
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found')
    if (!memberSnap.exists) throw new HttpsError('not-found', 'Member not found')

    if (String((eventSnap.data() as any)?.organizer_id || '') === memberId) {
      throw new HttpsError('failed-precondition', 'Cannot remove event organizer')
    }

    const role = String((memberSnap.data() as any)?.role || '')
    if (role === 'owner') {
      throw new HttpsError('failed-precondition', 'Cannot remove event owner')
    }

    tx.delete(memberRef)
  })

  return { success: true }
})
