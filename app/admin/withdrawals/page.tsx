import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Withdrawal Management | Admin | Tikèm',
  description: 'Redirecting to consolidated payout operations - withdrawal history',
}


export default function AdminWithdrawalsPage() {
  redirect('/admin/disbursements#withdrawals')
}
