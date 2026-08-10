import { isBudgetFriendlyTicketPrice } from './pricing';


/**
 * The curated Home rails, as data.
 *
 * These rules lived inline in HomeScreen and were applied with a `.slice(N)` to
 * make a rail. Tapping "view all" then went to Discover, which re-derived a
 * DIFFERENT list — so the page you landed on did not contain the events you had
 * just been looking at. Defining each feed once here means the rail and its
 * dedicated page are the same rule, and "view all" is literally the rule
 * without the slice.
 */
export type HomeFeed =
  | 'forYou'
  | 'trending'
  | 'nearYou'
  | 'thisWeek'
  | 'free'
  | 'new'
  | 'all';

/** Lowercase, trim and strip accents so "Pétion-Ville" matches "petion-ville". */
function normalizeCity(s: any): string {
  return (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * How long an event is assumed to run when it carries no end time. Matches the
 * fallback AddToCalendarButton already uses, so a pass, a calendar entry and
 * the feeds all agree on when something is over.
 */
export const ASSUMED_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Has this event finished?
 *
 * Deliberately NOT `start < now`: an event in progress is still worth showing —
 * you can still walk in. It ends at `end_datetime`, or at start + the assumed
 * duration when the organizer left the end time blank.
 *
 * The old Home rule kept an end-less event visible for a WEEK after it started,
 * which is why a konpa night that began at 10pm was still sitting in the feed
 * as "upcoming" the same evening.
 */
export function isEventOver(event: any, now: Date = new Date()): boolean {
  const endMs = toMillis(event?.end_datetime);
  if (endMs) return endMs < now.getTime();
  const startMs = toMillis(event?.start_datetime);
  if (!startMs) return false; // undated events are never "over"
  return startMs + ASSUMED_EVENT_DURATION_MS < now.getTime();
}

/** Firestore Timestamp | ISO string | Date → epoch ms, 0 when unusable. */
export function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v?.seconds) return v.seconds * 1000;
  const d = new Date(v).getTime();
  return Number.isFinite(d) ? d : 0;
}

/**
 * Loose city match: an event in "Pétion-Ville" should surface for a device
 * reporting "Pétion-Ville, Ouest, Haiti", and vice versa.
 */
export function cityMatches(eventCity: any, target: string): boolean {
  const e = normalizeCity(eventCity);
  const full = normalizeCity(target);
  if (!e || !full) return false;
  const short = normalizeCity(target.split(',')[0]);
  return e === full || e === short || e.includes(short) || short.includes(e);
}

export interface HomeFeedOptions {
  /** Required by 'nearYou'; that feed is empty without it. */
  city?: string;
  /** Rail length. Omit for a full "view all" page. */
  limit?: number;
}

/**
 * Apply one feed's rule to an already published+upcoming event list.
 * Callers pass the same source list Home builds (`finalEvents`).
 */
export function applyHomeFeed(
  events: any[],
  feed: HomeFeed,
  { city, limit }: HomeFeedOptions = {}
): any[] {
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  let rows: any[];
  switch (feed) {
    case 'trending':
      rows = events.filter((e) => (e.tickets_sold || 0) > 10);
      break;
    case 'thisWeek':
      rows = events.filter((e) => e.start_datetime && e.start_datetime <= oneWeekFromNow);
      break;
    case 'forYou':
      rows = [...events].sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0));
      break;
    case 'nearYou':
      rows = city ? events.filter((e) => cityMatches(e.city, city)) : [];
      break;
    case 'free':
      rows = events.filter((e) => isBudgetFriendlyTicketPrice(e?.ticket_price, e?.currency));
      break;
    case 'new':
      rows = [...events].sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at));
      break;
    case 'all':
    default:
      rows = events;
      break;
  }
  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}
