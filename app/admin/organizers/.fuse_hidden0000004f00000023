import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import AdminOrganizersClient from './AdminOrganizersClient'

type Cursor = { id: string; createdAtMillis: number }

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export const revalidate = 60

export default async function AdminOrganizersPage() {
  const [usersResult, counts] = await Promise.all([
    getAdminUsers({ role: 'organizer' }, 200),
    getUserCounts(),
  ])

  const allUsers = usersResult.data

  let initialCursor: string | null = null
  if (usersResult.hasMore && usersResult.lastDoc) {
    const lastData: any = (usersResult.lastDoc as any).data?.() || {}
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
      initialCursor = encodeCursor({ id: usersResult.lastDoc.id, createdAtMillis })
    }
  }

  const serializedUsers = allUsers.map((u: any) => ({
    id: u.id || '',
    email: u.email || '',
    full_name: u.full_name || '',
    phone_number: u.phone_number || '',
    role: u.role || 'attendee',
    is_verified: Boolean(u.is_verified),
    verification_status: u.verification_status || 'none',
    is_organizer: Boolean(u.is_organizer),
    created_at:
      typeof u.created_at === 'string' ? u.created_at : u.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at:
      typeof u.updated_at === 'string' ? u.updated_at : u.updated_at?.toISOString?.() || new Date().toISOString(),
  }))

  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Organizers', href: '/admin/organizers' }
        ]} 
      />
      <AdminOrganizersClient
        counts={counts}
        initialUsers={serializedUsers}
        initialHasMore={usersResult.hasMore && Boolean(initialCursor)}
        initialCursor={initialCursor}
      />
    </div>
  )
}
