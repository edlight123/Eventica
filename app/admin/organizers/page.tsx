import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Consolidated into the unified People hub (All users / Organizers tabs).
export default function AdminOrganizersPage() {
  redirect('/admin/users?tab=organizers')
}
