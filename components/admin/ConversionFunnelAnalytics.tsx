'use client'

import { useEffect, useState } from 'react'
import { Eye, Heart, ShoppingCart, TrendingUp, ArrowRight } from 'lucide-react'

interface ConversionData {
  views: number
  favorites: number
  purchases: number
  favoriteRate: number
  purchaseRate: number
  overallConversion: number
}

export function ConversionFunnelAnalytics() {
  const [data, setData] = useState<ConversionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics-data?type=conversion&days=30')
      .then(r => r.json())
      .then(result => {
        const conversionData = result.data || result
        setData(conversionData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load conversion data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load conversion data
      </div>
    )
  }

  const stages = [
    {
      label: 'Event Views',
      value: data.views,
      icon: Eye,
      color: 'brand',
      bgColor: 'bg-brand-50',
      borderColor: 'border-brand-200',
      textColor: 'text-brand-700',
      iconBg: 'bg-brand-700'
    },
    {
      label: 'Favorites',
      value: data.favorites,
      icon: Heart,
      color: 'brand',
      bgColor: 'bg-brand-50',
      borderColor: 'border-brand-200',
      textColor: 'text-brand-700',
      iconBg: 'bg-brand-600',
      conversionRate: data.favoriteRate
    },
    {
      label: 'Purchases',
      value: data.purchases,
      icon: ShoppingCart,
      color: 'brand',
      bgColor: 'bg-brand-50',
      borderColor: 'border-brand-200',
      textColor: 'text-brand-700',
      iconBg: 'bg-brand-500',
      conversionRate: data.purchaseRate
    }
  ]

  return (
    <div className="space-y-6">
      {/* Overall Conversion Rate */}
      <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-6 border border-brand-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-brand-700 mb-1">Overall Conversion Rate</div>
            <div className="text-4xl font-bold text-brand-700">{data.overallConversion.toFixed(2)}%</div>
            <div className="text-sm text-brand-600 mt-2">Views to Purchases (Last 30 Days)</div>
          </div>
          <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const StageIcon = stage.icon
            const isLast = index === stages.length - 1
            const widthPercentage = data.views > 0 ? (stage.value / data.views) * 100 : 0

            return (
              <div key={stage.label}>
                <div className={`${stage.bgColor} ${stage.borderColor} border rounded-xl p-6 transition-all hover:shadow-md`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${stage.iconBg} rounded-lg flex items-center justify-center`}>
                        <StageIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">{stage.label}</div>
                        {stage.conversionRate !== undefined && (
                          <div className={`text-sm ${stage.textColor} font-semibold`}>
                            {stage.conversionRate.toFixed(2)}% conversion
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-3xl font-bold ${stage.textColor}`}>
                      {stage.value.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${stage.iconBg} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {widthPercentage.toFixed(1)}% of initial views
                    </div>
                  </div>
                </div>

                {/* Arrow between stages */}
                {!isLast && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900">Conversion Insights</div>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>• {data.favoriteRate.toFixed(1)}% of viewers favorite events</li>
                <li>• {data.purchaseRate.toFixed(1)}% of favorited events lead to purchases</li>
                <li>• Overall {data.overallConversion.toFixed(2)}% of viewers complete a purchase</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Note about estimated views */}
      <div className="text-xs text-gray-500 text-center">
        * Event views are estimated (10x favorites). Implement view tracking for accurate metrics.
      </div>
    </div>
  )
}
