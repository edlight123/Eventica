import { AlertCircle, Image as ImageIcon, Ticket, TrendingDown } from 'lucide-react'

interface EventData {
  banner_image_url?: string
  ticket_tiers?: any[]
  is_published: boolean
  tickets_sold?: number
}

interface NeedsAttentionBadge {
  type: 'missing_cover' | 'missing_tickets' | 'no_sales'
  label: string
  icon: React.ReactNode
  color: string
}

export function getNeedsAttentionBadges(event: EventData): NeedsAttentionBadge[] {
  const badges: NeedsAttentionBadge[] = []

  // Missing cover image
  if (!event.banner_image_url) {
    badges.push({
      type: 'missing_cover',
      label: 'Add cover image',
      icon: <ImageIcon className="w-3 h-3" />,
      color: 'yellow'
    })
  }

  // Missing ticket tiers
  if (!event.ticket_tiers || event.ticket_tiers.length === 0) {
    badges.push({
      type: 'missing_tickets',
      label: 'Add ticket tier',
      icon: <Ticket className="w-3 h-3" />,
      color: 'orange'
    })
  }

  // No sales for published event
  if (event.is_published && (event.tickets_sold || 0) === 0) {
    badges.push({
      type: 'no_sales',
      label: 'No sales yet',
      icon: <TrendingDown className="w-3 h-3" />,
      color: 'red'
    })
  }

  return badges
}

interface NeedsAttentionBadgesProps {
  badges: NeedsAttentionBadge[]
  maxDisplay?: number
}

export default function NeedsAttentionBadges({
  badges,
  maxDisplay = 3
}: NeedsAttentionBadgesProps) {
  if (badges.length === 0) return null

  const displayedBadges = badges.slice(0, maxDisplay)
  const remainingCount = badges.length - maxDisplay

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'orange':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayedBadges.map((badge) => (
        <span
          key={badge.type}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeColor(
            badge.color
          )}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-800 border-gray-300">
          <AlertCircle className="w-3 h-3" />
          <span>+{remainingCount} more</span>
        </span>
      )}
    </div>
  )
}
