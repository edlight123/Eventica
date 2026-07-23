import { db, storage } from '../../config/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Crypto from 'expo-crypto';

/**
 * SHA-256 hex of the trimmed raw access code (trim only; case-sensitive).
 * The plaintext code is NEVER stored — only this hash is written to the
 * private/access doc. Returns null for a blank/whitespace-only code so callers
 * can skip the write entirely.
 */
async function hashAccessCode(rawCode: string): Promise<string | null> {
  const trimmed = (rawCode || '').trim();
  if (!trimmed) return null;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, trimmed);
}

/**
 * Write the hashed access code to `events/{eventId}/private/access`.
 * Client SDK setDoc — firestore.rules (owned by the web agent) must allow the
 * organizer to write this path. Never call this with a plaintext code on the
 * public event doc.
 */
async function writeAccessHash(eventId: string, codeHash: string): Promise<void> {
  await setDoc(doc(db, 'events', eventId, 'private', 'access'), {
    code_hash: codeHash,
    updated_at: serverTimestamp(),
  });
}

export interface CreateEventData {
  title: string;
  description: string;
  category: string;
  banner_image_url: string;
  venue_name: string;
  country?: string;
  /** Haiti département (optional; city stays the discovery-facing value). */
  department?: string;
  city: string;
  commune: string;
  address: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  timezone: string;
  currency: string;
  ticket_tiers: Array<{
    name: string;
    price: string;
    quantity: string;
    /** Optional per-tier blurb shown on the event detail page. */
    description?: string;
    /** When true the tier has no real cap (quantity carries a large sentinel). */
    unlimited?: boolean;
    /** Optional sale-window start — ISO 8601 datetime; empty/undefined = no lower bound. */
    sale_start?: string;
    /** Optional sale-window end — ISO 8601 datetime; empty/undefined = no upper bound. */
    sale_end?: string;
  }>;
  /** Free RSVP event — no paid tiers; a single free tier caps attendance. */
  is_rsvp?: boolean;
  /** When false the event is hidden from Discover/Explore (share-by-link only). */
  show_on_explore?: boolean;
  /**
   * Organizer poster-theme override. A valid PosterThemeKey pins the poster
   * gradient for this event; '' (default) = Auto (deterministic pick from the
   * seed/category). Persisted so it wins wherever the poster is rendered.
   */
  theme_key?: string;
  /** Optional promo video link. */
  video_url?: string;
  /** Whether attendees can see the guest list. */
  show_guestlist?: boolean;
  /**
   * Recurring-event cadence (create-only). When set to a real cadence and
   * `recurrence_count > 1`, createEvent generates that many independent event
   * docs one cadence apart, all sharing a `series_id`. Defaults to 'none'.
   */
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  /** TOTAL occurrences incl. the first. Only meaningful when recurring. Capped at 52. */
  recurrence_count?: number;
  /** When true the event is gated behind an access code (public flag on the doc). */
  is_password_protected?: boolean;
  /**
   * Transient plaintext access code. NEVER written to the public event doc — it
   * is hashed (SHA-256) into the private/access subdoc only. Blank keeps any
   * existing code on update.
   */
  access_code?: string;
}

/** Hard cap on how many occurrences a single recurring series may generate. */
const MAX_RECURRENCE_COUNT = 52;

/**
 * Shift a base datetime by `i` steps of the given cadence, preserving the
 * time-of-day. Monthly steps clamp the day-of-month to the target month's
 * length (e.g. Jan 31 + 1 month → Feb 28/29) so no occurrence rolls into the
 * following month.
 */
function shiftDateByRecurrence(
  base: Date,
  cadence: 'daily' | 'weekly' | 'monthly',
  i: number
): Date {
  const d = new Date(base.getTime());
  if (cadence === 'daily') {
    d.setDate(d.getDate() + i);
  } else if (cadence === 'weekly') {
    d.setDate(d.getDate() + i * 7);
  } else {
    // monthly — clamp day to the target month's length.
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + i);
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDayOfMonth));
  }
  return d;
}

export interface SaveEventOptions {
  /** When false, the event is saved as an unpublished draft. Defaults to true
   *  (immediate publish) so existing callers keep their behavior. */
  publish?: boolean;
}

/**
 * Explore/Discover visibility gate.
 *
 * Returns true when an event should appear in the public Discover list.
 * An event is hidden ONLY when `show_on_explore` is explicitly `false`.
 * A missing/undefined field is treated as VISIBLE so the many existing events
 * created before this field shipped are unaffected. Apply this in-memory AFTER
 * the Firestore query — never as a `where('show_on_explore','==',true)` clause,
 * which would silently drop every doc that lacks the field.
 */
export function isVisibleOnExplore(event: { show_on_explore?: boolean } | null | undefined): boolean {
  return (event as any)?.show_on_explore !== false;
}

/**
 * Filter a fetched event list down to what's allowed on Explore/Discover.
 * Excludes only events with `show_on_explore === false` (missing = visible).
 *
 * NOTE: the public Discover/Home queries currently live in the screens
 * (mobile/screens/DiscoverScreen.tsx and mobile/screens/HomeScreen.tsx), which
 * are outside this module's ownership. Those screens should import and apply
 * this helper to the mapped results, e.g. `filterExploreEvents(eventsData)`,
 * right after `getDocs(...).docs.map(...)`. TODO(discovery): wire this into
 * DiscoverScreen/HomeScreen so the toggle takes effect end-to-end.
 */
export function filterExploreEvents<T extends { show_on_explore?: boolean }>(events: T[]): T[] {
  return events.filter(isVisibleOnExplore);
}

/**
 * Create a new event in Firestore
 */
export async function createEvent(
  organizerId: string,
  eventData: CreateEventData,
  options: SaveEventOptions = {}
): Promise<string> {
  const publish = options.publish !== false;
  try {
    // Upload image to Firebase Storage if it's a local URI
    let coverImageUrl = eventData.banner_image_url;
    if (eventData.banner_image_url && eventData.banner_image_url.startsWith('file://')) {
      coverImageUrl = await uploadEventImage(organizerId, eventData.banner_image_url);
    }

    // Parse the base dates/times. Recurring occurrences are shifted from these.
    const baseStartDatetime = parseDateTimeString(
      eventData.start_date,
      eventData.start_time
    );
    const baseEndDatetime = parseDateTimeString(
      eventData.end_date,
      eventData.end_time
    );

    // Calculate total capacity from ticket tiers
    const totalCapacity = eventData.ticket_tiers.reduce(
      (sum, tier) => sum + parseInt(tier.quantity || '0'),
      0
    );

    // Get the lowest ticket price for compatibility
    const lowestPrice = Math.min(
      ...eventData.ticket_tiers.map(tier => parseFloat(tier.price) || 0)
    );

    // ── Recurrence plan ──────────────────────────────────────────────────
    // A real cadence + count > 1 generates that many occurrences one cadence
    // apart. Anything else falls back to a single event (unchanged behavior).
    const cadence = eventData.recurrence && eventData.recurrence !== 'none'
      ? eventData.recurrence
      : null;
    const requestedCount = Math.round(eventData.recurrence_count || 1);
    const occurrenceCount = cadence
      ? Math.max(1, Math.min(MAX_RECURRENCE_COUNT, requestedCount))
      : 1;
    const isRecurring = !!cadence && occurrenceCount > 1;
    // One shared id ties every occurrence together as a series.
    const seriesId = isRecurring
      ? `series_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      : null;

    // Build one event doc + its ticket_tiers docs for a given occurrence.
    const createOccurrence = async (startDatetime: Date, endDatetime: Date): Promise<string> => {
      const eventDoc = {
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        // Both field names for compatibility
        banner_image_url: coverImageUrl,
        cover_image_url: coverImageUrl,
        image_url: coverImageUrl,
        venue_name: eventData.venue_name,
        country: eventData.country || 'HT',
        department: eventData.department || '',
        city: eventData.city,
        commune: eventData.commune || '',
        address: eventData.address,
        location: `${eventData.venue_name}, ${eventData.city}`,
        start_datetime: Timestamp.fromDate(startDatetime),
        end_datetime: Timestamp.fromDate(endDatetime),
        timezone: eventData.timezone,
        currency: eventData.currency,
        ticket_tiers: eventData.ticket_tiers.map(tier => ({
          name: tier.name,
          price: parseFloat(tier.price) || 0,
          quantity: parseInt(tier.quantity) || 0,
          available: parseInt(tier.quantity) || 0,
          description: tier.description || '',
          unlimited: tier.unlimited || false,
          // Mirror the per-tier sale window into the event-doc array so mobile
          // readers that use this embedded copy see the same bounds as the
          // ticket_tiers collection docs. ISO strings stored as-is (or null).
          sales_start: tier.sale_start ? tier.sale_start : null,
          sales_end: tier.sale_end ? tier.sale_end : null,
        })),
        // Multiple field names for compatibility with web and mobile
        ticket_price: lowestPrice,
        total_capacity: totalCapacity,
        total_tickets: totalCapacity,
        capacity: totalCapacity,
        tickets_sold: 0,
        tickets_available: totalCapacity,
        organizer_id: organizerId,
        is_rsvp: eventData.is_rsvp || false,
        // Advanced settings — default visible/on when the caller omits them.
        show_on_explore: eventData.show_on_explore !== false,
        video_url: eventData.video_url || '',
        show_guestlist: eventData.show_guestlist !== false,
        // Organizer poster-theme override ('' = Auto). Resolvers fall back to the
        // deterministic pick when this is empty/invalid.
        theme_key: eventData.theme_key || '',
        // Password gate — public flag only. The secret lives hashed in the
        // private/access subdoc (written below), never on this doc.
        is_password_protected: !!eventData.is_password_protected,
        is_published: publish,
        status: publish ? 'published' : 'draft',
        // Moderation defaults — every event must carry these or it goes invisible
        // to the admin events tabs (see event-moderation-data-model). Drafts too.
        rejected: false,
        reports_count: 0,
        // Recurrence metadata — only stamped on generated series occurrences so
        // the single-event path keeps its existing doc shape untouched.
        ...(isRecurring ? { recurrence: cadence, series_id: seriesId } : {}),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Add the event doc to Firestore
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      // Create separate ticket_tiers documents for each tier
      const tierPromises = eventData.ticket_tiers.map(async (tier, index) => {
        const tierDoc = {
          event_id: docRef.id,
          name: tier.name,
          price: parseFloat(tier.price) || 0,
          quantity: parseInt(tier.quantity) || 0,
          total_quantity: parseInt(tier.quantity) || 0,
          available: parseInt(tier.quantity) || 0,
          sold_quantity: 0,
          description: tier.description || tier.name,
          unlimited: tier.unlimited || false,
          sort_order: index,
          is_active: true,
          // Per-tier sale window (ISO 8601 strings, or null for no bound). Matches
          // the web's `new Date().toISOString()` format so web purchase routes and
          // the web selector enforce/display identical bounds.
          sales_start: tier.sale_start ? tier.sale_start : null,
          sales_end: tier.sale_end ? tier.sale_end : null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };

        return addDoc(collection(db, 'ticket_tiers'), tierDoc);
      });

      await Promise.all(tierPromises);

      // Password gate — if protected AND a non-empty code was provided, hash it
      // and write the private/access doc for THIS occurrence. Recurring series
      // get one hash doc per occurrence. Plaintext is never persisted.
      if (eventData.is_password_protected) {
        const codeHash = await hashAccessCode(eventData.access_code || '');
        if (codeHash) {
          await writeAccessHash(docRef.id, codeHash);
        }
      }

      return docRef.id;
    };

    // Non-recurring (or count <= 1): exactly one event, same as before.
    if (!isRecurring) {
      const id = await createOccurrence(baseStartDatetime, baseEndDatetime);
      console.log('Event created successfully:', id);
      return id;
    }

    // Recurring: create each occurrence in order, shifting start/end together.
    // Occurrence 0 is the base; occurrence i is offset by i steps of the cadence.
    let firstId = '';
    for (let i = 0; i < occurrenceCount; i++) {
      const startDatetime = shiftDateByRecurrence(baseStartDatetime, cadence!, i);
      const endDatetime = shiftDateByRecurrence(baseEndDatetime, cadence!, i);
      const id = await createOccurrence(startDatetime, endDatetime);
      if (i === 0) firstId = id;
    }

    console.log(`Recurring series ${seriesId} created: ${occurrenceCount} events`);
    // Keep the existing return contract: the FIRST occurrence's id.
    return firstId;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event. Please try again.');
  }
}

/**
 * Update an existing event in Firestore
 */
export async function updateEvent(
  eventId: string,
  organizerId: string,
  eventData: CreateEventData,
  options: SaveEventOptions = {}
): Promise<void> {
  try {
    // Upload image to Firebase Storage if it's a new local URI
    let coverImageUrl = eventData.banner_image_url;
    if (eventData.banner_image_url && eventData.banner_image_url.startsWith('file://')) {
      coverImageUrl = await uploadEventImage(organizerId, eventData.banner_image_url);
    }

    // Parse dates and times into proper datetime
    const startDatetime = parseDateTimeString(
      eventData.start_date,
      eventData.start_time
    );
    const endDatetime = parseDateTimeString(
      eventData.end_date,
      eventData.end_time
    );

    // Calculate total capacity from ticket tiers
    const totalCapacity = eventData.ticket_tiers.reduce(
      (sum, tier) => sum + parseInt(tier.quantity || '0'),
      0
    );

    // Get the lowest ticket price for compatibility
    const lowestPrice = Math.min(
      ...eventData.ticket_tiers.map(tier => parseFloat(tier.price) || 0)
    );

    // Prepare update data
    const updateData = {
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      banner_image_url: coverImageUrl,
      cover_image_url: coverImageUrl,
      image_url: coverImageUrl,
      venue_name: eventData.venue_name,
      country: eventData.country || 'HT',
      department: eventData.department || '',
      city: eventData.city,
      commune: eventData.commune || '',
      address: eventData.address,
      location: `${eventData.venue_name}, ${eventData.city}`,
      start_datetime: Timestamp.fromDate(startDatetime),
      end_datetime: Timestamp.fromDate(endDatetime),
      timezone: eventData.timezone,
      currency: eventData.currency,
      ticket_tiers: eventData.ticket_tiers.map(tier => ({
        name: tier.name,
        price: parseFloat(tier.price) || 0,
        quantity: parseInt(tier.quantity) || 0,
        available: parseInt(tier.quantity) || 0,
        description: tier.description || '',
        unlimited: tier.unlimited || false,
        // Mirror the per-tier sale window into the event-doc array (see createEvent).
        sales_start: tier.sale_start ? tier.sale_start : null,
        sales_end: tier.sale_end ? tier.sale_end : null,
      })),
      ticket_price: lowestPrice,
      total_capacity: totalCapacity,
      total_tickets: totalCapacity,
      capacity: totalCapacity,
      is_rsvp: eventData.is_rsvp || false,
      // Advanced settings — default visible/on when the caller omits them.
      show_on_explore: eventData.show_on_explore !== false,
      video_url: eventData.video_url || '',
      show_guestlist: eventData.show_guestlist !== false,
      // Organizer poster-theme override ('' = Auto); see createEvent.
      theme_key: eventData.theme_key || '',
      // Password gate flag. When toggled OFF this becomes false and the old
      // private/access hash is simply left in place (harmless — the gate is off).
      is_password_protected: !!eventData.is_password_protected,
      updated_at: serverTimestamp(),
      // Only flip publication state when the caller explicitly asks (e.g. the
      // publish-vs-draft confirmation sheet); otherwise leave it untouched.
      ...(options.publish !== undefined
        ? { is_published: options.publish, status: options.publish ? 'published' : 'draft' }
        : {}),
    };

    // Update the event document
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, updateData);

    // Delete existing ticket_tiers documents
    const tiersQuery = query(
      collection(db, 'ticket_tiers'),
      where('event_id', '==', eventId)
    );
    const existingTiers = await getDocs(tiersQuery);
    const deletePromises = existingTiers.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Create new ticket_tiers documents
    const tierPromises = eventData.ticket_tiers.map(async (tier, index) => {
      const tierDoc = {
        event_id: eventId,
        name: tier.name,
        price: parseFloat(tier.price) || 0,
        quantity: parseInt(tier.quantity) || 0,
        total_quantity: parseInt(tier.quantity) || 0,
        available: parseInt(tier.quantity) || 0,
        sold_quantity: 0,
        description: tier.description || tier.name,
        unlimited: tier.unlimited || false,
        sort_order: index,
        is_active: true,
        // Per-tier sale window (ISO 8601 strings, or null for no bound); see createEvent.
        sales_start: tier.sale_start ? tier.sale_start : null,
        sales_end: tier.sale_end ? tier.sale_end : null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      return addDoc(collection(db, 'ticket_tiers'), tierDoc);
    });

    await Promise.all(tierPromises);

    // Password gate — only touch the private/access hash when the event is
    // protected AND a new non-empty code was typed. A blank code in protected
    // mode intentionally preserves the existing hash (organizer left it alone).
    // When toggled off we leave the stale hash untouched (flag is false above).
    if (eventData.is_password_protected) {
      const codeHash = await hashAccessCode(eventData.access_code || '');
      if (codeHash) {
        await writeAccessHash(eventId, codeHash);
      }
    }

    console.log('Event updated successfully:', eventId);
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event. Please try again.');
  }
}

/**
 * Upload event banner image to Firebase Storage
 */
async function uploadEventImage(
  organizerId: string,
  localUri: string
): Promise<string> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    const filename = `${organizerId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `event-images/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading event image:', error);
    throw new Error('Failed to upload event image');
  }
}

/**
 * Parse date and time strings into a Date object
 */
function parseDateTimeString(dateStr: string, timeStr: string): Date {
  // dateStr format: YYYY-MM-DD
  // timeStr format: HH:MM AM/PM
  
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    throw new Error('Invalid time format');
  }

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(`${dateStr}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  
  return date;
}

/**
 * Toggle event publication status (pause/resume ticket sales)
 */
export async function toggleEventPublication(
  eventId: string,
  isPublished: boolean
): Promise<void> {
  try {
    console.log(`Toggling event ${eventId} publication to:`, isPublished);
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      is_published: isPublished,
      status: isPublished ? 'published' : 'draft',
      updated_at: serverTimestamp(),
    });
    console.log(`Event ${isPublished ? 'published' : 'unpublished'} successfully. Status set to: ${isPublished ? 'published' : 'draft'}`);
  } catch (error) {
    console.error('Error toggling event publication:', error);
    throw new Error('Failed to update event status');
  }
}

/**
 * Cancel an event
 */
export async function cancelEvent(eventId: string): Promise<void> {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      status: 'cancelled',
      is_published: false,
      updated_at: serverTimestamp(),
    });
    console.log('Event cancelled successfully');
  } catch (error) {
    console.error('Error cancelling event:', error);
    throw new Error('Failed to cancel event');
  }
}

/**
 * Delete an event and all related data
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    // Delete ticket_tiers
    const tiersQuery = query(
      collection(db, 'ticket_tiers'),
      where('event_id', '==', eventId)
    );
    const tiersSnapshot = await getDocs(tiersQuery);
    const deleteTierPromises = tiersSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteTierPromises);

    // Delete the event document
    await deleteDoc(doc(db, 'events', eventId));
    
    console.log('Event deleted successfully');
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}
