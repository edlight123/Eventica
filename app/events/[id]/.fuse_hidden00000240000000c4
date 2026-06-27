'use client'

import PullToRefresh from '@/components/PullToRefresh'
import { revalidateEvent } from './actions'

interface EventPageContentProps {
  eventId: string
  children: React.ReactNode
}

export default function EventPageContent({ eventId, children }: EventPageContentProps) {
  return (
    <PullToRefresh onRefresh={() => revalidateEvent(eventId)}>
      {children}
    </PullToRefresh>
  )
}
