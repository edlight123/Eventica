import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Payouts | Eventica',
  description: 'Manage your organizer payouts and earnings',
}

// Redirect to the new payouts page in settings
export default function PayoutsPage() {
  redirect('/organizer/settings/payouts')
}
