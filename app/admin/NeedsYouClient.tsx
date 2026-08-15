'use client'

import { useRouter } from 'next/navigation'
import { QueueTable } from '@/components/admin/QueueTable'
import type { NeedsYouItem } from '@/lib/admin/needs-you'

/**
 * The landing list. A client component only because QueueTable's row action is a
 * function — the rows themselves are rendered from server-fetched data.
 */
export function NeedsYouClient({ items }: { items: NeedsYouItem[] }) {
  const router = useRouter()

  return (
    <QueueTable
      rows={items}
      columns={[
        {
          key: 'subject',
          header: 'Subject',
          render: (item: NeedsYouItem) => <span className="font-medium">{item.subject}</span>,
        },
        {
          key: 'decision',
          header: 'Decision',
          className: 'text-white/70',
          render: (item: NeedsYouItem) => item.decision,
        },
      ]}
      getKey={(item) => `${item.queue}:${item.id}`}
      getAgeAt={(item) => item.createdAt}
      actionLabel="Open"
      onAction={(item) => router.push(item.href)}
      emptyMessage="Nothing waiting. Every queue is clear."
    />
  )
}
