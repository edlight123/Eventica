/**
 * Organizer route manifest — single source of truth for route-coverage tests.
 *
 * `dynamic` routes need a real/seeded event id supplied at runtime via the
 * E2E_EVENT_ID env var (point it at a seeded draft event owned by the test
 * organizer in the Firebase Emulator — never production).
 */

export type Viewport = 'mobile' | 'tablet' | 'desktop'

export interface OrganizerRoute {
  /** Path template; `:eventId` is replaced from E2E_EVENT_ID at runtime. */
  path: string
  name: string
  /** Accessible heading or landmark text expected on the page. */
  heading?: string
  dynamic?: boolean
  viewports?: Viewport[]
}

export const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
}

const ALL: Viewport[] = ['mobile', 'tablet', 'desktop']

export const organizerRoutes: OrganizerRoute[] = [
  // Organization-level
  { path: '/organizer', name: 'Dashboard', heading: 'Dashboard', viewports: ALL },
  { path: '/organizer/events', name: 'Events', heading: 'Events', viewports: ALL },
  { path: '/organizer/events/new', name: 'Create event', viewports: ALL },
  { path: '/organizer/marketing', name: 'Marketing / Attendees', heading: 'Attendees', viewports: ALL },
  { path: '/organizer/orders', name: 'Orders', heading: 'Orders', viewports: ALL },
  { path: '/organizer/team', name: 'Team', heading: 'Team Members', viewports: ALL },
  { path: '/organizer/earnings', name: 'Earnings', viewports: ALL },
  { path: '/organizer/payouts', name: 'Payouts', viewports: ALL },
  { path: '/organizer/promo-codes', name: 'Promo codes', viewports: ALL },
  { path: '/organizer/analytics', name: 'Analytics', viewports: ALL },
  { path: '/organizer/scan', name: 'Scan', viewports: ['mobile', 'desktop'] },
  { path: '/organizer/verify', name: 'Verification', viewports: ALL },

  // Settings cluster
  { path: '/organizer/settings', name: 'Settings', viewports: ALL },
  { path: '/organizer/settings/profile', name: 'Settings · Profile', viewports: ALL },
  { path: '/organizer/settings/organization', name: 'Settings · Organization', viewports: ALL },
  { path: '/organizer/settings/notifications', name: 'Settings · Notifications', viewports: ALL },
  { path: '/organizer/settings/security', name: 'Settings · Security', viewports: ALL },
  { path: '/organizer/settings/team', name: 'Settings · Team', viewports: ALL },
  { path: '/organizer/settings/defaults', name: 'Settings · Defaults', viewports: ALL },
  { path: '/organizer/settings/payouts', name: 'Settings · Payouts', viewports: ALL },
  { path: '/organizer/settings/payouts/fees', name: 'Settings · Payout fees', viewports: ALL },
  { path: '/organizer/settings/payouts/history', name: 'Settings · Payout history', viewports: ALL },
  { path: '/organizer/settings/danger-zone', name: 'Settings · Danger zone', viewports: ALL },

  // Event-level (dynamic)
  { path: '/organizer/events/:eventId', name: 'Event command center', dynamic: true, viewports: ALL },
  { path: '/organizer/events/:eventId/edit', name: 'Edit event', dynamic: true, viewports: ALL },
  { path: '/organizer/events/:eventId/attendees', name: 'Event attendees', dynamic: true, viewports: ALL },
  { path: '/organizer/events/:eventId/earnings', name: 'Event earnings', dynamic: true, viewports: ALL },
  { path: '/organizer/events/:eventId/check-in', name: 'Event check-in', dynamic: true, viewports: ['mobile', 'desktop'] },
  { path: '/organizer/events/:eventId/staff', name: 'Event staff', dynamic: true, viewports: ALL },
]

/** Resolve `:eventId` using E2E_EVENT_ID; static routes pass through unchanged. */
export function resolvePath(path: string, eventId = process.env.E2E_EVENT_ID || ''): string {
  return path.replace(':eventId', eventId)
}
