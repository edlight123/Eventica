import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { QueueTable } from '../components/admin/QueueTable'

type Row = { id: string; name: string; createdAt: string }
const rows: Row[] = [{ id: 'a', name: 'Ayiti Events', createdAt: new Date().toISOString() }]
const columns = [{ key: 'name', header: 'Name', render: (r: Row) => r.name }]

describe('QueueTable', () => {
  it('renders the empty message instead of an empty table', () => {
    render(<QueueTable rows={[]} columns={columns} getKey={(r) => r.id} emptyMessage="Nothing waiting" />)
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument()
  })

  it('shows the Waiting column only when getAgeAt is supplied', () => {
    const { rerender } = render(
      <QueueTable rows={rows} columns={columns} getKey={(r) => r.id} emptyMessage="none" />
    )
    expect(screen.queryByText('Waiting')).toBeNull()

    rerender(
      <QueueTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        getAgeAt={(r) => r.createdAt}
        emptyMessage="none"
      />
    )
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.getByText('0m')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })
})
