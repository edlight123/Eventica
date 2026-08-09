/**
 * POST /api/events/contact-organizer
 *
 * Lets an attendee send the organizer of an event a short message about the
 * event, their ticket, or something else. The message lands in Firestore as
 * `organizer_messages` and pings the organizer through the existing
 * notification pipeline.
 *
 * Deliberately NOT an email relay: the attendee's address is never handed to
 * the organizer's mail client, and the organizer's address is never exposed to
 * the attendee. Both sides stay inside the app until the organizer chooses to
 * reply.
 */
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications/helpers'
import { FieldValue } from 'firebase-admin/firestore'

/** The three things an attendee can be writing about. Anything else is rejected. */
const TOPICS = ['event', 'ticket', 'other'] as const
type Topic = (typeof TOPICS)[number]

const MAX_MESSAGE_LENGTH = 1000
/** Messages one user may send about ONE event per hour. */
const MAX_PER_EVENT_PER_HOUR = 3

const TOPIC_LABEL: Record<Topic, string> = {
  event: 'the event',
  ticket: 'their ticket',
  other: 'something else',
}

function fail(error: string, code: string, status = 400) {
  return NextResponse.json({ error, code }, { status })
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail('You must be signed in to contact an organizer.', 'unauthorized', 401)
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return fail('Malformed request body.', 'bad_request')
    }

    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
    const topic = String(body?.topic || '') as Topic
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!eventId) return fail('Event is required.', 'missing_event_id')
    if (!TOPICS.includes(topic)) return fail('Pick what your message is about.', 'invalid_topic')
    if (!message) return fail('Write a message before sending.', 'missing_message')
    if (message.length > MAX_MESSAGE_LENGTH) {
      return fail(`Keep it under ${MAX_MESSAGE_LENGTH} characters.`, 'message_too_long')
    }

    const eventSnap = await adminDb.collection('events').doc(eventId).get()
    if (!eventSnap.exists) return fail('Event not found.', 'event_not_found', 404)

    const event = eventSnap.data() || {}
    const organizerId = String(event.organizer_id || '')
    if (!organizerId) {
      return fail('This event has no organizer to contact.', 'no_organizer', 409)
    }
    // Writing to yourself is a no-op that would just spam your own inbox.
    if (organizerId === user.id) {
      return fail('You are the organizer of this event.', 'self_contact', 409)
    }

    // Throttle per user PER EVENT rather than globally: someone with tickets to
    // five events has a legitimate reason to message five organizers in a row,
    // but no reason to send the same organizer four messages in an hour.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recent = await adminDb
      .collection('organizer_messages')
      .where('sender_id', '==', user.id)
      .where('event_id', '==', eventId)
      .where('created_at', '>=', oneHourAgo)
      .limit(MAX_PER_EVENT_PER_HOUR)
      .get()

    if (recent.size >= MAX_PER_EVENT_PER_HOUR) {
      return fail(
        'You have sent this organizer several messages already. Give them a little time to reply.',
        'rate_limited',
        429
      )
    }

    const doc = await adminDb.collection('organizer_messages').add({
      event_id: eventId,
      event_title: String(event.title || 'Event'),
      organizer_id: organizerId,
      sender_id: user.id,
      // Snapshotted so the organizer still sees who wrote if the profile changes.
      sender_name: String((user as any).full_name || '').trim() || 'An attendee',
      sender_email: String(user.email || ''),
      topic,
      message,
      status: 'open',
      created_at: FieldValue.serverTimestamp(),
    })

    // A failed notification must not lose the message — it is already stored,
    // and the organizer can still find it in their inbox.
    try {
      await createNotification(
        organizerId,
        'organizer_message',
        `New message about ${event.title || 'your event'}`,
        `${String((user as any).full_name || 'An attendee')} wrote to you about ${TOPIC_LABEL[topic]}.`,
        `/organizer/events/${eventId}/messages`,
        { eventId, messageId: doc.id, topic }
      )
    } catch (error) {
      console.error('contact-organizer: notification failed', error)
    }

    return NextResponse.json({ ok: true, id: doc.id })
  } catch (error) {
    console.error('contact-organizer failed', error)
    return fail('Could not send your message. Try again.', 'internal_error', 500)
  }
}
