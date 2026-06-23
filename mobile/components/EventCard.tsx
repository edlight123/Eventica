/**
 * EventCard — the single, flyer-first event card reused across Home, Discover,
 * Favorites and organizer pages so they are visually identical.
 *
 * This is the canonical name for the shared card; it forwards to the
 * poster-led implementation in `PosterEventCard`.
 */
export { default } from './PosterEventCard';
export { default as EventCard } from './PosterEventCard';
