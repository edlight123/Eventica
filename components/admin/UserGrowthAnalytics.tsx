'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, UserPlus, Briefcase } from 'lucide-react'

interface UserGrowthData {
  dailySignups: Array<{
    date: string
    attendees: number
    organizers: number
    total: number
  }>
  totalUsers: number
  organizerCount: number
  attendeeCount: number
}

interface Props {
  days?: number
}

export function UserGrowthAnalytics({ days = 30 }: Props) {
  const [data, setData] = useState<UserGrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(days)

  useEffect(() => {
    fetchData(selectedDays)
  }, [selectedDays])

  const fetchData = async (period: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics-data?type=user-growth&days=${period}`)
      const result = await res.json()
      // Access data from wrapped response
      const userData = result.data || result
      setData({
        dailySignups: Array.isArray(userData.dailySignups) ? userData.dailySignups : [],
        totalUsers: userData.totalUsers || 0,
        organizerCount: userData.organizerCount || 0,
        attendeeCount: userData.attendeeCount || 0
      })
    } catch (err) {
      console.error('Failed to load user growth data:', err)
    } finally {
      setLoading(false)
    }
  }

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
        Failed to load user growth data
      </div>
    )
  }

  const pct = (n: number) => (data.totalUsers > 0 ? ((n / data.totalUsers) * 100).toFixed(0) : '0')

  return (
    <div className="space-y-4">
      {/* Period Selector — segmented */}
      <div className="inline-flex gap-1 rounded-full border border-white/10 p-1">
        {[7, 14, 30, 60, 90].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedDays(period)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedDays === period ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {period}d
          </button>
        ))}
      </div>

      {/* Summary — divided strip */}
      <div className="grid grid-cols-3 divide-x divide-white/10 rounded-lg border border-white/10">
        {[
          { label: 'Total users', value: data.totalUsers, icon: Users, sub: `last ${selectedDays}d` },
          { label: 'Attendees', value: data.attendeeCount, icon: UserPlus, sub: `${pct(data.attendeeCount)}% of total` },
          { label: 'Organizers', value: data.organizerCount, icon: Briefcase, sub: `${pct(data.organizerCount)}% of total` },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
                <Icon className="h-3.5 w-3.5 text-white/30" /> <span className="truncate">{s.label}</span>
              </div>
              <div className="text-xl font-bold tabular-nums text-white">{s.value.toLocaleString()}</div>
              <div className="mt-0.5 text-[11px] text-white/40">{s.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Growth Chart */}
      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-white">Daily signups</h3>
        {data.dailySignups.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.dailySignups} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#ffffff66' }}
                tickLine={false}
                axisLine={{ stroke: '#ffffff1a' }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#ffffff66' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#ffffffaa' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#ffffff99' }} iconType="plainline" />
              <Line type="monotone" dataKey="total" stroke="#14B8A6" strokeWidth={2.5} dot={false} name="Total" />
              <Line type="monotone" dataKey="attendees" stroke="#5EEAD4" strokeWidth={2} dot={false} name="Attendees" />
              <Line type="monotone" dataKey="organizers" stroke="#0F766E" strokeWidth={2} dot={false} name="Organizers" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-sm text-white/40">No signup data for this period</div>
        )}
      </div>
    </div>
  )
}
