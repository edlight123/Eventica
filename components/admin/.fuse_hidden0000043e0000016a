'use client'

import { useEffect, useState } from 'react'
import { Eye, Heart, ShoppingCart, TrendingUp } from 'lucide-react'

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
      <div className="text-center py-12 text-white/50">
        Failed to load conversion data
      </div>
    )
  }

  const stages = [
    { label: 'Event views', value: data.views, icon: Eye },
    { label: 'Favorites', value: data.favorites, icon: Heart, conversionRate: data.favoriteRate },
    { label: 'Purchases', value: data.purchases, icon: ShoppingCart, conversionRate: data.purchaseRate },
  ]

  return (
    <div className="space-y-4">
      {/* Overall conversion — flat highlight */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-white/40">Overall conversion</div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums text-white">{data.overallConversion.toFixed(2)}%</div>
          <div className="mt-0.5 text-xs text-white/40">Views → purchases · last 30 days</div>
        </div>
        <TrendingUp className="h-8 w-8 text-brand-300" />
      </div>

      {/* Funnel */}
      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-white">Conversion funnel</h3>
        <div className="space-y-3">
          {stages.map((stage) => {
            const StageIcon = stage.icon
            const widthPercentage = data.views > 0 ? (stage.value / data.views) * 100 : 0
            return (
              <div key={stage.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-white/80">
                    <StageIcon className="h-4 w-4 text-brand-300" /> {stage.label}
                    {stage.conversionRate !== undefined && (
                      <span className="text-xs text-white/40">· {stage.conversionRate.toFixed(1)}%</span>
                    )}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-white">{stage.value.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${widthPercentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Insights */}
        <div className="mt-4 rounded-lg border border-white/10 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <TrendingUp className="h-3.5 w-3.5 text-brand-300" /> Insights
          </div>
          <ul className="space-y-0.5 text-xs text-white/50">
            <li>{data.favoriteRate.toFixed(1)}% of viewers favorite events</li>
            <li>{data.purchaseRate.toFixed(1)}% of favorited events lead to purchases</li>
            <li>Overall {data.overallConversion.toFixed(2)}% of viewers complete a purchase</li>
          </ul>
        </div>
      </div>

      <p className="text-center text-[11px] text-white/35">
        Event views are estimated (10× favorites) until view tracking is implemented.
      </p>
    </div>
  )
}
