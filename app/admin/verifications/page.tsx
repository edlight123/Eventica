import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Verifications | Admin | Eventica',
  description: 'Redirecting to organizer verification management',
}


export default function AdminVerificationsRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const params = new URLSearchParams()

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
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
