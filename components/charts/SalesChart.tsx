'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesChartProps {
  data: Array<{
    date: string
    sales: number
    revenue: number
  }>
  currency?: string
}

export default function SalesChart({ data, currency = 'HTG' }: SalesChartProps) {
  const formatRevenue = (value: unknown) => {
    const amount = Number(value || 0)
    if (!Number.isFinite(amount)) return ''
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: String(currency || 'HTG'),
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${String(currency || 'HTG')} ${amount.toFixed(2)}`
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#0F766E" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date" 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => {
            const n = Number(value || 0)
            if (!Number.isFinite(n)) return ''
            // Avoid showing long decimals for the mixed-axis chart.
            if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}k`
            return String(Math.round(n))
          }}
        />
        <Tooltip 
          formatter={(value: any, name: any) => {
            if (name === 'revenue') return [formatRevenue(value), 'Revenue']
            return [Number(value || 0), 'Tickets']
          }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="sales" 
          stroke="#0F766E" 
          fillOpacity={1} 
          fill="url(#colorSales)"
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#14B8A6" 
          fillOpacity={1} 
          fill="url(#colorRevenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
