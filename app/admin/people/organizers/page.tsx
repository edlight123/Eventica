import { getAdminUsers, getUserCounts } from '@/lib/data/users'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'
import AdminOrganizersClient from './AdminOrganizersClient'
import { PEOPLE_TABS } from '../tabs'
import { cursorFromLastDoc, mapUser } from '../user-rows'

export const revalidate = 60

export const metadata = {
  title: 'Organizers | People | Admin | Tikèm',
  description: 'The accounts that sell tickets',
}

/**
 * Organizers: the People hub's second list.
 *
 * This used to be a client-side tab on the users page, which meant every visit
 * to People paid for both queries and shipped both lists, one of them hidden.
 * It is its own route now, so it fetches only what it shows and the URL says
 * where you are.
 */
export default async function AdminOrganizersPage() {
  const [counts, organizersResult] = await Promise.all([
    getUserCounts(),
    getAdminUsers({ role: 'organizer' }, 200),
  ])

  const organizerCursor = cursorFromLastDoc(organizersResult)
  const organizerUsers = organizersResult.data.map(mapUser)

  return (
    <ConsolePage title="People">
      <ConsoleTabs tabs={PEOPLE_TABS} />
      <ConsoleCaption>
        The accounts that sell tickets. Verification is what unlocks payouts, so it is the column
        that matters here.
      </ConsoleCaption>

      <AdminOrganizersClient
        counts={counts}
        initialUsers={organizerUsers}
        initialHasMore={organizersResult.hasMore && Boolean(organizerCursor)}
        initialCursor={organizerCursor}
      />
    </ConsolePage>
  )
}
