import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import PeopleHub from './PeopleHub'

type Cursor = { id: string; createdAtMillis: number }

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export const revalidate = 60

export default async function AdminPeoplePage() {
  const [counts, organizersResult] = await Promise.all([
    getUserCounts(),
    getAdminUsers({ role: 'organizer' }, 200),
  ])

  let organizerCursor: string | null = null
  if (organizersResult.hasMore && organizersResult.lastDoc) {
    const lastData: any = (organizersResult.lastDoc as any).data?.() || {}
    const createdAt: any = lastData?.created_at
    const createdAtMillis =
      typeof createdAt?.toMillis === 'function'
        ? createdAt.toMillis()
        : typeof createdAt?.toDate === 'function'
          ? createdAt.toDate().getTime()
          : typeof createdAt === 'string'
            ? Date.parse(createdAt)
            : Number.NaN
    if (Number.isFinite(createdAtMillis)) {
      organizerCursor = encodeCursor({ id: organizersResult.lastDoc.id, createdAtMillis })
    }
  }

  const organizerUsers = organizersResult.data.map((u: any) => ({
    id: u.id || '',
    email: u.email || '',
    full_name: u.full_name || '',
    role: u.role || 'attendee',
    is_verified: Boolean(u.is_verified),
    verification_status: u.verification_status || 'none',
    is_organizer: Boolean(u.is_organizer),
    created_at:
      typeof u.created_at === 'string' ? u.created_at : u.created_at?.toISOString?.() || new Date().toISOString(),
  }))

  return (
    <div className="space-y-2">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <AdminBreadcrumbs items={[{ label: 'People', href: '/admin/users' }]} />
      </div>
      <PeopleHub
        counts={counts}
        organizerUsers={organizerUsers}
        organizerHasMore={organizersResult.hasMore && Boolean(organizerCursor)}
        organizerCursor={organizerCursor}
      />
    </div>
  )
}
