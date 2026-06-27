'use client'

import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

type PayoutStatus = 'not_setup' | 'pending_verification' | 'active' | 'on_hold'

interface PayoutStatusHeroProps {
  status: PayoutStatus
  reason?: string
  onContinueSetup?: () => void
}

export function PayoutStatusHero({ status, reason, onContinueSetup }: PayoutStatusHeroProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'not_setup':
        return {
          icon: <AlertCircle className="w-8 h-8" />,
          iconBg: '',
          iconColor: 'text-brand-300',
          bgGradient: 'from-brand-500/15 to-brand-600/10',
          borderColor: 'border-brand-500/30',
          title: 'Set up payouts to receive earnings',
          description: reason || 'Complete your payout setup to start receiving payments from ticket sales. This takes just a few minutes.',
          ctaText: 'Start Setup',
          ctaColor: 'bg-brand-700 hover:bg-brand-800',
          showCta: true
        }
      case 'pending_verification':
        return {
          icon: <Clock className="w-8 h-8" />,
          iconBg: '',
          iconColor: 'text-amber-300',
          bgGradient: 'from-amber-500/15 to-amber-600/10',
          borderColor: 'border-amber-500/30',
          title: 'Verification in progress',
          description: reason || 'We\'re verifying your payout information. This usually takes 1-2 business days. We\'ll notify you once approved.',
          ctaText: 'View Status',
          ctaColor: 'bg-amber-600 hover:bg-amber-700',
          showCta: false
        }
      case 'active':
        return {
          icon: <CheckCircle className="w-8 h-8" />,
          iconBg: '',
          iconColor: 'text-emerald-300',
          bgGradient: 'from-emerald-500/15 to-emerald-600/10',
          borderColor: 'border-emerald-500/30',
          title: 'Payouts are active',
          description: reason || 'Your payout method is verified and ready. You\'ll receive payments according to the schedule below.',
          ctaText: 'Manage Settings',
          ctaColor: 'bg-green-600 hover:bg-green-700',
          showCta: false
        }
      case 'on_hold':
        return {
          icon: <XCircle className="w-8 h-8" />,
          iconBg: '',
          iconColor: 'text-red-300',
          bgGradient: 'from-red-500/15 to-red-600/10',
          borderColor: 'border-red-500/30',
          title: 'Payouts on hold',
          description: reason || 'Your payouts have been temporarily paused. Please contact support to resolve this issue.',
          ctaText: 'Contact Support',
          ctaColor: 'bg-red-600 hover:bg-red-700',
          showCta: true
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl border ${config.borderColor} p-6 md:p-8 shadow-soft`}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className={`${config.iconBg} ${config.iconColor} rounded-2xl p-4 flex-shrink-0`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white mb-2">{config.title}</h2>
          <p className="text-white/70 leading-relaxed">{config.description}</p>
        </div>

        {config.showCta && (
          <button
            onClick={onContinueSetup}
            className={`${config.ctaColor} text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap flex-shrink-0`}
          >
            {config.ctaText}
          </button>
        )}
      </div>
    </div>
  )
}
