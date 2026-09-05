import { redirect } from 'next/navigation'

/**
 * Redirect-only shim — the one exception to the clean-URL restructure.
 *
 * The chargeback screen now lives at /admin/money/disputes, and every other old
 * money URL was deleted outright. This path cannot be: `lib/disputes.ts` sends a
 * transactional email containing `${appUrl}/admin/disputes` whenever a dispute
 * is opened, and those messages are already sitting in people's inboxes. The
 * link has to keep working for as long as those emails exist. Delete this only
 * once no live inbox can still contain one.
 *
 * Query strings are carried over so any filter or deep link in an old email
 * survives the hop.
 */
export const metadata = {
  title: 'Chargebacks | Admin | Tikèm',
  description: 'Redirecting to the Money hub chargebacks log',
}

export default async function AdminDisputesRedirectPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else if (typeof value === 'string') {
      query.set(key, value)
    }
  }

  const suffix = query.toString()
  redirect(suffix ? `/admin/money/disputes?${suffix}` : '/admin/money/disputes')
}
