import { db, storage } from '../../config/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  }>;
  /** Free RSVP event — no paid tiers; a single free tier caps attendance. */
  is_rsvp?: boolean;
}

export interface SaveEventOptions {
  /** When false, the event is saved as an unpublished draft. Defaults to true
   *  (immediate publish) so existing callers keep their behavior. */
  publish?: boolean;
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

    // Prepare Firestore document
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
      is_published: publish,
      status: publish ? 'published' : 'draft',
      // Moderation defaults — every event must carry these or it goes invisible
      // to the admin events tabs (see event-moderation-data-model). Drafts too.
      rejected: false,
      reports_count: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    // Add to Firestore
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
        description: tier.name,
        sort_order: index,
        is_active: true,
        sales_start: null,
        sales_end: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      return addDoc(collection(db, 'ticket_tiers'), tierDoc);
    });

    await Promise.all(tierPromises);
    
    console.log('Event created successfully:', docRef.id);
    return docRef.id;
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
      })),
      ticket_price: lowestPrice,
      total_capacity: totalCapacity,
      total_tickets: totalCapacity,
      capacity: totalCapacity,
      is_rsvp: eventData.is_rsvp || false,
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
        description: tier.name,
        sort_order: index,
        is_active: true,
        sales_start: null,
        sales_end: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      return addDoc(collection(db, 'ticket_tiers'), tierDoc);
    });

    await Promise.all(tierPromises);
    
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
