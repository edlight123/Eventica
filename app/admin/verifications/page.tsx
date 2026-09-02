import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Verifications | Admin | Tikèm',
  description: 'Redirecting to organizer verification management',
}


export default async function AdminVerificationsRedirect({
  searchParams,
}: {
  // Next 15: searchParams is a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  const resolved = searchParams ? await searchParams : undefined

  if (resolved) {
    for (const [key, value] of Object.entries(resolved)) {
      if (value == null) continue
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v)
      } else {
        params.set(key, value)
      }
    }
  }

  const qs = params.toString()
  redirect(qs ? `/admin/verify?${qs}` : '/admin/verify')
}
