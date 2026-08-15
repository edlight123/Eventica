import { describe, it, expect } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { QueueTable } from '../components/admin/QueueTable'

type Row = { id: string; name: string; createdAt: string }
const rows: Row[] = [{ id: 'a', name: 'Ayiti Events', createdAt: new Date().toISOString() }]
const columns = [{ key: 'name', header: 'Name', render: (r: Row) => r.name }]

/**
 * QueueTable delegates to the shared DataTable, which renders each column twice:
 * once in the desktop <table> and once in its mobile card fallback. So every
 * assertion here uses the *AllBy* queries — finding two matches is the
 * responsive behaviour working, not a duplicate-render bug.
 */
describe('QueueTable', () => {
  it('renders the empty message instead of an empty table', () => {
    render(<QueueTable rows={[]} columns={columns} getKey={(r) => r.id} emptyMessage="Nothing waiting" />)
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument()
  })

  it('shows the Waiting column only when getAgeAt is supplied', async () => {
    const { rerender } = render(
      <QueueTable rows={rows} columns={columns} getKey={(r) => r.id} emptyMessage="none" />
    )
    expect(screen.queryAllByText('Waiting')).toHaveLength(0)

    rerender(
      <QueueTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        getAgeAt={(r) => r.createdAt}
        emptyMessage="none"
      />
    )
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0)

    // The age is computed on mount, not at render, to avoid a server/client
    // hydration mismatch — so it appears on the next tick rather than immediately.
    await waitFor(() => expect(screen.getAllByText('0m').length).toBeGreaterThan(0))
  })

  it('renders the action button only when both label and handler are given', () => {
    render(
      <QueueTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        actionLabel="Review"
        onAction={() => {}}
        emptyMessage="none"
      />
    )
    expect(screen.getAllByRole('button', { name: 'Review' }).length).toBeGreaterThan(0)
  })

  it('omits the action button when only a label is given', () => {
    render(
      <QueueTable rows={rows} columns={columns} getKey={(r) => r.id} actionLabel="Review" emptyMessage="none" />
    )
    expect(screen.queryAllByRole('button', { name: 'Review' })).toHaveLength(0)
  })
})
