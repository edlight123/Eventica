/**
 * The People hub's tab strip — declared once so its two screens cannot drift.
 *
 * People owns the two directories of humans on the platform: every account, and
 * the subset that sells tickets. The rail can only point at one of them, so the
 * strip is what makes the other reachable.
 *
 * Order matters: `/admin/people` is the hub index and must come first.
 */
export const PEOPLE_TABS = [
  { href: '/admin/people', label: 'Users' },
  { href: '/admin/people/organizers', label: 'Organizers' },
]
