import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Consolidated into the unified Verifications hub (Identity / Bank tabs).
export default function BankVerificationsPage() {
  redirect('/admin/verify?tab=bank')
}
