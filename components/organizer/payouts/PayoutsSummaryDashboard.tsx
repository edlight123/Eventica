'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Building2, 
  Smartphone,
  CreditCard,
  Settings,
  ExternalLink,
  Wallet,
  TrendingUp,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { StatusChip } from '@/components/ui/kit'

interface PayoutMethod {
  type: 'bank_transfer' | 'mobile_money' | 'stripe'
  status: 'active' | 'pending' | 'needs_attention'
  details: {
    name: string
    maskedNumber?: string
    provider?: string
    bankName?: string
  }
  verificationStatus?: {
    identity?: 'pending' | 'verified' | 'failed'
    bank?: 'pending' | 'verified' | 'failed'
    phone?: 'pending' | 'verified' | 'failed'
  }
}

interface PayoutsSummaryDashboardProps {
  organizerId: string
  haitiMethod?: PayoutMethod | null
  stripeMethod?: PayoutMethod | null
  upcomingPayout?: {
    amount: number
    currency: string
    date: string
    eventCount: number
  } | null
  totalEarnings?: number
  currency?: string
  onEdit: (profile: 'haiti' | 'stripe_connect') => void
  onSetupNew: () => void
}

export default function PayoutsSummaryDashboard({
  organizerId,
  haitiMethod,
  stripeMethod,
  upcomingPayout,
  totalEarnings = 0,
  currency = 'HTG',
  onEdit,
  onSetupNew,
}: PayoutsSummaryDashboardProps) {
  const hasAnyMethod = Boolean(haitiMethod || stripeMethod)

  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'verified':
        return <StatusChip tone="success" icon={CheckCircle}>Active</StatusChip>
      case 'pending':
        return <StatusChip tone="warning" icon={Clock}>Pending</StatusChip>
      case 'needs_attention':
      case 'failed':
        return <StatusChip tone="danger" icon={AlertCircle}>Needs Attention</StatusChip>
      default:
        return null
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'bank_transfer':
        return <Building2 className="w-5 h-5" />
      case 'mobile_money':
        return <Smartphone className="w-5 h-5" />
      case 'stripe':
        return <CreditCard className="w-5 h-5" />
      default:
        return <Wallet className="w-5 h-5" />
    }
  }

  const renderPayoutMethod = (method: PayoutMethod, profile: 'haiti' | 'stripe_connect') => {
    const iconBgColor = 'bg-brand-100 text-brand-700'

    return (
      <div 
        key={profile}
        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center`}>
              {getMethodIcon(method.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{method.details.name}</h3>
              <p className="text-sm text-gray-500">
                {method.type === 'stripe' && 'Stripe Connect'}
                {method.type === 'bank_transfer' && method.details.bankName}
                {method.type === 'mobile_money' && method.details.provider}
              </p>
            </div>
          </div>
          {getStatusBadge(method.status)}
        </div>

        {method.details.maskedNumber && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 font-mono text-sm text-gray-600">
            {method.type === 'mobile_money' ? 'Phone: ' : 'Account: '}
            ****{method.details.maskedNumber}
          </div>
        )}

        {/* Verification Status */}
        {method.verificationStatus && (
          <div className="space-y-2 mb-4">
            {method.verificationStatus.identity && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Identity</span>
                <span className={`font-medium ${
                  method.verificationStatus.identity === 'verified' ? 'text-green-600' : 
                  method.verificationStatus.identity === 'failed' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {method.verificationStatus.identity === 'verified' ? '✓ Verified' : 
                   method.verificationStatus.identity === 'failed' ? '✗ Failed' : '○ Pending'}
                </span>
              </div>
            )}
            {method.verificationStatus.bank && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Bank Account</span>
                <span className={`font-medium ${
                  method.verificationStatus.bank === 'verified' ? 'text-green-600' : 
                  method.verificationStatus.bank === 'failed' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {method.verificationStatus.bank === 'verified' ? '✓ Verified' : 
                   method.verificationStatus.bank === 'failed' ? '✗ Failed' : '○ Pending'}
                </span>
              </div>
            )}
            {method.verificationStatus.phone && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Phone</span>
                <span className={`font-medium ${
                  method.verificationStatus.phone === 'verified' ? 'text-green-600' : 
                  method.verificationStatus.phone === 'failed' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {method.verificationStatus.phone === 'verified' ? '✓ Verified' : 
                   method.verificationStatus.phone === 'failed' ? '✗ Failed' : '○ Pending'}
                </span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onEdit(profile)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Payout */}
        <div className="bg-brand-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 text-brand-100 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            Next Payout
          </div>
          {upcomingPayout ? (
            <>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(upcomingPayout.amount, upcomingPayout.currency)}
              </div>
              <div className="text-sm text-brand-100">
                {upcomingPayout.eventCount} event{upcomingPayout.eventCount !== 1 ? 's' : ''} • 
                Expected {new Date(upcomingPayout.date).toLocaleDateString()}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold mb-1">No pending payouts</div>
              <div className="text-sm text-brand-100">
                Payouts appear here after your events
              </div>
            </>
          )}
        </div>

        {/* Total Earnings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Total Earnings
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatCurrency(totalEarnings, currency)}
          </div>
          <Link 
            href="/organizer/earnings"
            className="text-sm text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            View earnings details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Payout Methods */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payout Methods</h2>
          {hasAnyMethod && (
            <button
              onClick={onSetupNew}
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              + Add another method
            </button>
          )}
        </div>

        {hasAnyMethod ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {haitiMethod && renderPayoutMethod(haitiMethod, 'haiti')}
            {stripeMethod && renderPayoutMethod(stripeMethod, 'stripe_connect')}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No payout methods set up</h3>
            <p className="text-gray-600 mb-4 max-w-sm mx-auto">
              Set up a payout method to receive earnings from your ticket sales.
            </p>
            <button
              onClick={onSetupNew}
              className="px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
            >
              Set Up Payouts
            </button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link 
            href="/organizer/earnings"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-brand-700" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Earnings & Reports</div>
              <div className="text-sm text-gray-500">View detailed breakdowns</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link 
            href="/organizer/settings"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Account Settings</div>
              <div className="text-sm text-gray-500">Manage your profile</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}
