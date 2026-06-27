'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, TrendingUp, UserPlus, Briefcase } from 'lucide-react'

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

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {[7, 14, 30, 60, 90].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedDays(period)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedDays === period
                ? 'bg-brand-600 text-white'
                : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
            }`}
          >
            {period} days
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-brand-500/15 to-brand-600/10 rounded-xl p-4 border border-brand-500/30">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-brand-300">Total Users</div>
              <div className="text-xl font-bold text-brand-300">{data.totalUsers.toLocaleString()}</div>
            </div>
          </div>
          <div className="text-xs text-brand-300">Last {selectedDays} days</div>
        </div>

        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-white/60">Attendees</div>
              <div className="text-xl font-bold text-white">{data.attendeeCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="text-xs text-white/50">
            {((data.attendeeCount / data.totalUsers) * 100).toFixed(1)}% of total
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-white/60">Organizers</div>
              <div className="text-xl font-bold text-white">{data.organizerCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="text-xs text-white/50">
            {((data.organizerCount / data.totalUsers) * 100).toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-[#141414] rounded-xl shadow-sm border border-white/10 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Daily Signups</h3>
        {data.dailySignups.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.dailySignups}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#0F766E" 
                strokeWidth={2}
                name="Total"
              />
              <Line 
                type="monotone" 
                dataKey="attendees" 
                stroke="#14B8A6" 
                strokeWidth={2}
                name="Attendees"
              />
              <Line 
                type="monotone" 
                dataKey="organizers" 
                stroke="#5EEAD4" 
                strokeWidth={2}
                name="Organizers"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-white/50">No signup data available for this period</div>
        )}
      </div>
    </div>
  )
}
