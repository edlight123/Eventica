import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'
import AdminUsersClient from './AdminUsersClient'
import { PEOPLE_TABS } from './tabs'
import { cursorFromLastDoc, mapUser } from './user-rows'

export const revalidate = 60

export const metadata = {
  title: 'People | Admin | Tikèm',
  description: 'Every account on the platform',
}

/**
 * The People hub index: every account. Organizers are the same collection
 * filtered, and live one tab across at `/admin/people/organizers`.
 *
 * The index is all users rather than organizers because it is the superset —
 * landing on the narrower list and having to work out where everyone else went
 * is the confusion the hub exists to remove.
 */
export default async function AdminPeoplePage() {
  const [counts, allUsersResult] = await Promise.all([getUserCounts(), getAdminUsers({}, 200)])

  const allUsersCursor = cursorFromLastDoc(allUsersResult)
  const allUsers = allUsersResult.data.map(mapUser)

  return (
    <ConsolePage title="People">
      <ConsoleTabs tabs={PEOPLE_TABS} />
      <ConsoleCaption>Everyone with an account on the platform, newest first.</ConsoleCaption>

      <AdminUsersClient
        counts={counts}
        initialUsers={allUsers}
        initialHasMore={allUsersResult.hasMore && Boolean(allUsersCursor)}
        initialCursor={allUsersCursor}
      />
    </ConsolePage>
  )
}
