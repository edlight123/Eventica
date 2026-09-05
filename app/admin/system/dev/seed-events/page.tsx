import DevToolShell from '../DevToolShell'
import SeedEventsClient from './SeedEventsClient'

export const revalidate = 30

export const metadata = {
  title: 'Seed Events | Dev tools | Admin | Tikèm',
}

export default function SeedEventsPage() {
  return (
    <DevToolShell title="Seed Events" href="/admin/system/dev/seed-events">
      <SeedEventsClient />
    </DevToolShell>
  )
}
