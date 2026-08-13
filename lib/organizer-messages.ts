/**
 * Attendee ↔ organizer message threads (SERVER-SIDE ONLY).
 *
 * DATA MODEL
 * ----------
 * A thread IS the attendee's opening message: the `organizer_messages/{id}`
 * document written by /api/events/contact-organizer. Organizer replies live in
 * a `organizer_messages/{id}/replies/{replyId}` SUBCOLLECTION.
 *
 * Why a subcollection rather than a flat `organizer_message_replies` collection
 * carrying a `thread_id`:
 *
 *  1. The thread root already exists and already has an id in the wild — the
 *     notification created on first contact deep-links with `messageId`. A flat
 *     collection would need a second id space (or a synthetic thread doc) for
 *     no gain.
 *  2. Authorization can't drift. Who may read or reply is decided by exactly
 *     one document (the parent's `organizer_id` / `sender_id`). With a flat
 *     collection every reply repeats that claim in its own `thread_id`, and a
 *     forged value is a real attack surface.
 *  3. Firestore rules stay untouched. The existing `organizer_messages/{id}`
 *     match scopes reads to the two participants; the subcollection is NOT
 *     covered by that match, so it falls through to the catch-all
 *     `match /{document=**} { allow read, write: if false }`. Replies are
 *     therefore server-only by default — no new rule, no client write path.
 *  4. Lifecycle is free: deleting a thread recursively takes its replies with
 *     it, so there is no orphan sweep to write later.
 *
 * The cost of a subcollection is that you cannot read every reply of every
 * thread in one query. That is fine here: a thread is bounded to
 * MAX_REPLIES_PER_THREAD and an organizer inbox page is bounded to
 * MAX_THREADS_PER_PAGE, so a page load is a bounded fan-out of small reads.
 * Hot list fields (`reply_count`, `last_reply_preview`, `last_reply_at`) are
 * denormalized onto the root so a preview never needs the subcollection.
 */
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'

export const COLLECTION = 'organizer_messages'
export const REPLIES_SUBCOLLECTION = 'replies'

/**
 * Replies are longer than the attendee's 1000-char opener — an organizer
 * answering "is this real?" may need to explain the venue, the refund policy
 * and the door time — but still capped so one reply can't become a payload.
 */
export const MAX_REPLY_LENGTH = 2000
/** A trust conversation, not a chat room. Keeps thread reads bounded. */
export const MAX_REPLIES_PER_THREAD = 30
/** Ceiling on one inbox page, so a busy event can't fan out unbounded reads. */
export const MAX_THREADS_PER_PAGE = 100
export const DEFAULT_THREADS_PER_PAGE = 30
/** Characters of the latest reply kept on the root doc for list previews. */
const PREVIEW_LENGTH = 160

export type ThreadStatus = 'open' | 'replied'

export interface OrganizerMessageReply {
  id: string
  body: string
  author_role: 'organizer'
  author_name: string
  created_at: string | null
}

export interface OrganizerMessageThread {
  id: string
  event_id: string
  event_title: string
  sender_name: string
  topic: string
  /** The attendee's opening message. */
  message: string
  status: ThreadStatus
  created_at: string | null
  last_activity_at: string | null
  reply_count: number
  /** True until the organizer opens (or replies to) the thread. */
  unread: boolean
  replies: OrganizerMessageReply[]
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  const maybe = value as { toDate?: () => Date }
  if (typeof maybe.toDate === 'function') return maybe.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return null
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat
}

/**
 * An organizer has never seen a thread until they open or answer it. Attendees
 * cannot append to an existing thread (the contact form always opens a new
 * one), so "unread" is simply "never acknowledged" — no per-message cursor to
 * maintain, and legacy documents written before this feature existed correctly
 * read as unread rather than silently disappearing from the badge.
 */
function isUnread(data: Record<string, any>): boolean {
  return !data.organizer_read_at
}

function mapReply(doc: QueryDocumentSnapshot): OrganizerMessageReply {
  const d = doc.data()
  return {
    id: doc.id,
    body: String(d.body || ''),
    author_role: 'organizer',
    author_name: String(d.author_name || 'The organizer'),
    created_at: toIso(d.created_at),
  }
}

async function loadReplies(threadId: string): Promise<OrganizerMessageReply[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .doc(threadId)
    .collection(REPLIES_SUBCOLLECTION)
    .orderBy('created_at', 'asc')
    .limit(MAX_REPLIES_PER_THREAD)
    .get()
  return snap.docs.map((d: QueryDocumentSnapshot) => mapReply(d))
}

function mapThread(
  id: string,
  data: Record<string, any>,
  replies: OrganizerMessageReply[]
): OrganizerMessageThread {
  const createdAt = toIso(data.created_at)
  return {
    id,
    event_id: String(data.event_id || ''),
    event_title: String(data.event_title || 'Event'),
    sender_name: String(data.sender_name || 'An attendee'),
    topic: String(data.topic || 'other'),
    message: String(data.message || ''),
    status: data.status === 'replied' ? 'replied' : 'open',
    created_at: createdAt,
    last_activity_at: toIso(data.last_activity_at) ?? toIso(data.last_reply_at) ?? createdAt,
    reply_count: typeof data.reply_count === 'number' ? data.reply_count : replies.length,
    unread: isUnread(data),
    replies,
  }
}

/**
 * Every thread addressed to `organizerId`, newest first, optionally narrowed to
 * one event.
 *
 * Ordered on `created_at` because that is the one timestamp every document is
 * guaranteed to carry — ordering on `last_activity_at` would silently drop the
 * threads written before this feature shipped, since Firestore excludes
 * documents missing the sort field. The page is then re-sorted in memory by
 * last activity so an old thread with a fresh reply floats to the top of what
 * was fetched.
 */
export async function listThreadsForOrganizer(options: {
  organizerId: string
  eventId?: string
  limit?: number
}): Promise<OrganizerMessageThread[]> {
  const limit = Math.min(
    Math.max(1, options.limit || DEFAULT_THREADS_PER_PAGE),
    MAX_THREADS_PER_PAGE
  )

  let query = adminDb
    .collection(COLLECTION)
    .where('organizer_id', '==', options.organizerId)
  if (options.eventId) {
    query = query.where('event_id', '==', options.eventId)
  }

  const snap = await query.orderBy('created_at', 'desc').limit(limit).get()

  const threads = await Promise.all(
    snap.docs.map(async (doc: QueryDocumentSnapshot) => {
      const data = doc.data()
      const replies =
        (typeof data.reply_count === 'number' ? data.reply_count : 0) > 0
          ? await loadReplies(doc.id)
          : []
      return mapThread(doc.id, data, replies)
    })
  )

  return threads.sort((a, b) => {
    const at = a.last_activity_at ? Date.parse(a.last_activity_at) : 0
    const bt = b.last_activity_at ? Date.parse(b.last_activity_at) : 0
    return bt - at
  })
}

export interface ThreadRecord {
  id: string
  data: Record<string, any>
}

/**
 * Load a thread only if `organizerId` owns it.
 *
 * Returns null both when the thread is missing and when it belongs to somebody
 * else — callers surface a single "not found" for both so the endpoint can't be
 * used to probe which message ids exist.
 */
export async function getThreadForOrganizer(
  threadId: string,
  organizerId: string
): Promise<ThreadRecord | null> {
  const snap = await adminDb.collection(COLLECTION).doc(threadId).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  if (String(data.organizer_id || '') !== organizerId) return null
  return { id: snap.id, data }
}

/** Acknowledge a thread. Idempotent: the first acknowledgement is the one kept. */
export async function markThreadRead(threadId: string, alreadyRead: boolean): Promise<void> {
  if (alreadyRead) return
  await adminDb.collection(COLLECTION).doc(threadId).update({
    organizer_read_at: FieldValue.serverTimestamp(),
  })
}

/**
 * Append an organizer reply and roll the thread's denormalized summary forward.
 * Replying implies reading, so it also clears the unread flag.
 */
export async function appendOrganizerReply(params: {
  threadId: string
  organizerId: string
  authorName: string
  body: string
  alreadyRead: boolean
}): Promise<OrganizerMessageReply> {
  const threadRef = adminDb.collection(COLLECTION).doc(params.threadId)
  const replyRef = threadRef.collection(REPLIES_SUBCOLLECTION).doc()

  const batch = adminDb.batch()
  batch.set(replyRef, {
    body: params.body,
    author_id: params.organizerId,
    author_role: 'organizer',
    author_name: params.authorName,
    created_at: FieldValue.serverTimestamp(),
  })
  batch.update(threadRef, {
    status: 'replied',
    reply_count: FieldValue.increment(1),
    last_reply_preview: preview(params.body),
    last_reply_at: FieldValue.serverTimestamp(),
    last_activity_at: FieldValue.serverTimestamp(),
    ...(params.alreadyRead ? {} : { organizer_read_at: FieldValue.serverTimestamp() }),
  })
  await batch.commit()

  // The write above uses server timestamps, so the authoritative created_at is
  // only knowable after a read. Echo the client's own clock instead of paying
  // for that read — the list endpoint returns the real value next load.
  return {
    id: replyRef.id,
    body: params.body,
    author_role: 'organizer',
    author_name: params.authorName,
    created_at: new Date().toISOString(),
  }
}

export function countUnread(threads: OrganizerMessageThread[]): number {
  return threads.filter((t) => t.unread).length
}
