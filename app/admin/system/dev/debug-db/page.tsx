import DevToolShell from '../DevToolShell'
import DebugDBClient from './DebugDBClient'

export const metadata = {
  title: 'Database Debug | Dev tools | Admin | Tikèm',
}

export default function DebugDBPage() {
  return (
    <DevToolShell title="Database Debug" href="/admin/system/dev/debug-db">
      <DebugDBClient />
    </DevToolShell>
  )
}
