import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import PeopleHub from './PeopleHub'

type Cursor = { id: string; createdAtMillis: number }

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export const revalidate = 60

function cursorFromLastDoc(result: { hasMore: boolean; lastDoc: any }): string | null {
  if (!result.hasMore || !result.lastDoc) return null
  const lastData: any = result.lastDoc.data?.() || {}
  const createdAt: any = lastData?.created_at
  const createdAtMillis =
    typeof createdAt?.toMillis === 'function'
      ? createdAt.toMillis()
      : typeof createdAt?.toDate === 'function'
        ? createdAt.toDate().getTime()
        : typeof createdAt === 'string'
          ? Date.parse(createdAt)
          : Number.NaN
  if (!Number.isFinite(createdAtMillis)) return null
  return encodeCursor({ id: result.lastDoc.id, createdAtMillis })
}

function mapUser(u: any) {
  return {
    id: u.id || '',
    email: u.email || '',
    full_name: u.full_name || u.name || '',
    role: u.role || 'attendee',
    is_verified: Boolean(u.is_verified),
    verification_status: u.verification_status || 'none',
    is_organizer: Boolean(u.is_organizer),
    created_at:
      typeof u.created_at === 'string' ? u.created_at : u.created_at?.toISOString?.() || new Date().toISOString(),
  }
}

export default async function AdminPeoplePage() {
  const [counts, allUsersResult, organizersResult] = await Promise.all([
    getUserCounts(),
    getAdminUsers({}, 200),
    getAdminUsers({ role: 'organizer' }, 200),
  ])

  const allUsersCursor = cursorFromLastDoc(allUsersResult)
  const organizerCursor = cursorFromLastDoc(organizersResult)

  const allUsers = allUsersResult.data.map(mapUser)
  const organizerUsers = organizersResult.data.map(mapUser)

  return (
    <div className="space-y-2">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <AdminBreadcrumbs items={[{ label: 'People', href: '/admin/users' }]} />
      </div>
      <PeopleHub
        counts={counts}
        allUsers={allUsers}
        allUsersHasMore={allUsersResult.hasMore && Boolean(allUsersCursor)}
        allUsersCursor={allUsersCursor}
        organizerUsers={organizerUsers}
        organizerHasMore={organizersResult.hasMore && Boolean(organizerCursor)}
        organizerCursor={organizerCursor}
      />
    </div>
  )
}
