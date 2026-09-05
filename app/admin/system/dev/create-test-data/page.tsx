import DevToolShell from '../DevToolShell'
import CreateTestDataClient from './CreateTestDataClient'

export const metadata = {
  title: 'Test Data | Dev tools | Admin | Tikèm',
}

export default function CreateTestDataPage() {
  return (
    <DevToolShell title="Test Data" href="/admin/system/dev/create-test-data">
      <CreateTestDataClient />
    </DevToolShell>
  )
}
