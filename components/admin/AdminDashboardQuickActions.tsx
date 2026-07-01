'use client'

import Link from 'next/link'
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Settings
} from 'lucide-react'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  urgent?: boolean
  badge?: number
}

interface AdminDashboardQuickActionsProps {
  pendingVerifications?: number
  pendingBankVerifications?: number
  pendingPayouts?: number
  urgentTasks?: number
}

export function AdminDashboardQuickActions({
  pendingVerifications = 0,
  pendingBankVerifications = 0,
  pendingPayouts = 0,
  urgentTasks = 0
}: AdminDashboardQuickActionsProps) {
  // Icon chips use one cohesive brand palette (soft teal). Red is reserved for the
  // one genuinely "danger" surface (Security) and a neutral tint for Settings.
  const quickActions: QuickAction[] = [
    {
      title: 'Review Verifications',
      description: 'Process organizer identity verifications',
      href: '/admin/verify',
      icon: CheckCircle,
      color: 'text-brand-300',
      badge: pendingVerifications,
      urgent: pendingVerifications > 0
    },
    {
      title: 'Bank Verifications',
      description: 'Review bank account verifications',
      href: '/admin/bank-verifications',
      icon: CreditCard,
      color: 'text-brand-300',
      badge: pendingBankVerifications,
      urgent: pendingBankVerifications > 5
    },
    {
      title: 'Payout Operations',
      description: 'Manage event settlements and withdrawals',
      href: '/admin/disbursements',
      icon: DollarSign,
      color: 'text-brand-300'
    },
    {
      title: 'Revenue Analytics',
      description: 'View platform performance metrics',
      href: '/admin/analytics',
      icon: TrendingUp,
      color: 'text-brand-300'
    },
    {
      title: 'User Management',
      description: 'Manage platform users and organizers',
      href: '/admin/users',
      icon: Users,
      color: 'text-brand-300'
    },
    {
      title: 'Event Moderation',
      description: 'Review and moderate events',
      href: '/admin/events',
      icon: Calendar,
      color: 'text-brand-300'
    },
    {
      title: 'Security Dashboard',
      description: 'Monitor platform security and threats',
      href: '/admin/security',
      icon: AlertTriangle,
      color: 'text-red-300'
    },
    {
      title: 'Platform Settings',
      description: 'Configure system settings',
      href: '/admin/settings',
      icon: Settings,
      color: 'text-white/60'
    }
  ]

  // Sort actions to put urgent ones first
  const sortedActions = [...quickActions].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    if (a.badge && b.badge) return b.badge - a.badge
    if (a.badge && !b.badge) return -1
    if (!a.badge && b.badge) return 1
    return 0
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
        {urgentTasks > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-red-300 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-mono tabular-nums">{urgentTasks}</span> urgent
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {sortedActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              title={action.description}
              className="group relative rounded-xl  p-3 flex flex-col gap-2 hover:bg-white/[0.04] hover:border-white/20 transition-all"
            >
              {action.badge !== undefined && action.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono tabular-nums">
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}

              <Icon className={`w-5 h-5 ${action.color} group-hover:scale-105 transition-transform`} />

              <span className="text-xs font-medium text-white leading-tight group-hover:text-brand-300 transition-colors">
                {action.title}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}