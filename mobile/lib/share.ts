import { Share } from 'react-native';

/**
 * The single event-share helper used across Discover / Home / Favorites so the
 * share sheet always shows the SAME text: the event title + its tikem.co link
 * (no hardcoded English lead-in). Matches DiscoverScreen's original format.
 */
export async function shareEvent(event: any): Promise<void> {
  if (!event) return;
  try {
    await Share.share({
      title: event.title,
      message: `${event.title}\n\nhttps://tikem.co/events/${event.id}`,
    });
  } catch (e) {
    console.warn('[share] Share failed:', e);
  }
}
