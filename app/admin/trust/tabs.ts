/**
 * The Trust & Safety hub's tab strip — one array, three screens.
 *
 * The rail bundles `verifications` and `bankVerifications` into a single
 * Verifications group but can only link to ONE href, so bank verifications had
 * no route into it from the rail at all: the group promised two queues and
 * delivered one page. This hub is the group's front door and this array is its
 * map; every page under /admin/trust renders the same strip from here so the
 * three screens cannot drift apart.
 *
 * Order is the order of the work: the two review queues an admin actually
 * clears, then the monitoring screen they check on.
 */
export const TRUST_TABS: { href: string; label: string }[] = [
  { href: '/admin/trust', label: 'Identity' },
  { href: '/admin/trust/bank', label: 'Bank' },
  { href: '/admin/trust/security', label: 'Security' },
]
