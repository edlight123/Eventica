'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency, type Currency } from '@/lib/currency'
import { StatTile } from '@/components/ui/kit'
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  CreditCard,
  Smartphone,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  Package,
  User,
  Mail,
  Ticket,
  QrCode,
} from 'lucide-react'

interface Order {
  id: string
  event_id?: string
  eventId?: string
  event_name?: string
  attendee_email?: string
  attendeeEmail?: string
  email?: string
  attendee_name?: string
  attendeeName?: string
  status?: string
  price_paid?: number
  pricePaid?: number
  currency?: string
  payment_method?: string
  paymentMethod?: string
  ticket_type?: string
  ticketType?: string
  purchased_at?: string
  purchasedAt?: string
  checked_in?: boolean
  checkedIn?: boolean
  qr_code?: string
  qrCode?: string
}

interface OrdersSummary {
  totalOrders: number
  todayOrders: number
  byStatus: {
    confirmed: number
    pending: number
    cancelled: number
    refunded: number
  }
  last30Days: {
    orders: number
    revenueUSD: number
    revenueHTG: number
    avgOrderValueUSD: number
  }
  byPaymentMethod: {
    stripe: number
    moncash: number
    natcash: number
  }
}

interface Pagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

interface Filters {
  status: string
  paymentMethod: string
  currency: string
  dateRange: string
  startDate: string
  endDate: string
  sortBy: string
  search: string
}

const initialFilters: Filters = {
  status: 'all',
  paymentMethod: 'all',
  currency: 'all',
  dateRange: 'all',
  startDate: '',
  endDate: '',
  sortBy: 'newest',
  search: '',
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Confirmed' },
    valid: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Valid' },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    refunded: { color: 'bg-amber-100 text-amber-800', icon: RefreshCw, label: 'Refunded' },
  }

  const config = statusConfig[status?.toLowerCase()] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: status || 'Unknown' }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function PaymentMethodBadge({ method }: { method: string }) {
  const methodLower = (method || '').toLowerCase()
  if (methodLower === 'stripe') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        <CreditCard className="w-3 h-3" />
        Stripe
      </span>
    )
  }
  if (methodLower === 'moncash') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <Smartphone className="w-3 h-3" />
        MonCash
      </span>
    )
  }
  if (methodLower === 'natcash') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <Smartphone className="w-3 h-3" />
        NatCash
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {method || 'Unknown'}
    </span>
  )
}

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<OrdersSummary | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  })
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchOrders = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy: filters.sortBy,
      })

      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.paymentMethod !== 'all') params.set('paymentMethod', filters.paymentMethod)
      if (filters.currency !== 'all') params.set('currency', filters.currency)
      if (filters.search) params.set('search', filters.search)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()

      if (data.ok) {
        setOrders(data.orders)
        setPagination(data.pagination)
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.pageSize])

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'summary' }),
      })
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
      }
    } catch (e) {
      console.error('Failed to fetch summary:', e)
    }
  }, [])

  useEffect(() => {
    fetchOrders(1)
    fetchSummary()
  }, [fetchOrders, fetchSummary])

  useEffect(() => {
    fetchOrders(1)
  }, [fetchOrders])

  const handleSearch = () => {
    fetchOrders(1)
  }

  const handleDateRangeChange = (range: string) => {
    const now = new Date()
    let start = ''
    let end = now.toISOString().split('T')[0]

    if (range === 'today') {
      start = end
    } else if (range === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7))
      start = weekAgo.toISOString().split('T')[0]
    } else if (range === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
      start = monthAgo.toISOString().split('T')[0]
    } else if (range === 'quarter') {
      const quarterAgo = new Date(now.setMonth(now.getMonth() - 3))
      start = quarterAgo.toISOString().split('T')[0]
    } else {
      start = ''
      end = ''
    }

    setFilters(prev => ({
      ...prev,
      dateRange: range,
      startDate: start,
      endDate: end,
    }))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Fetch all orders matching current filters (up to 1000)
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000',
        sortBy: filters.sortBy,
      })

      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.paymentMethod !== 'all') params.set('paymentMethod', filters.paymentMethod)
      if (filters.currency !== 'all') params.set('currency', filters.currency)
      if (filters.search) params.set('search', filters.search)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()

      if (data.ok && data.orders.length > 0) {
        // Create CSV
        const headers = ['Order ID', 'Event', 'Attendee Email', 'Attendee Name', 'Status', 'Amount', 'Currency', 'Payment Method', 'Ticket Type', 'Checked In', 'Purchase Date']
        const rows = data.orders.map((o: Order) => [
          o.id,
          o.event_name || '',
          o.attendee_email || o.attendeeEmail || o.email || '',
          o.attendee_name || o.attendeeName || '',
          o.status || '',
          o.price_paid || o.pricePaid || 0,
          o.currency || 'USD',
          o.payment_method || o.paymentMethod || '',
          o.ticket_type || o.ticketType || '',
          (o.checked_in || o.checkedIn) ? 'Yes' : 'No',
          o.purchased_at || o.purchasedAt || '',
        ])

        const csvContent = [
          headers.join(','),
          ...rows.map((r: any[]) => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
        ].join('\n')

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  const activeFiltersCount = [
    filters.status !== 'all',
    filters.paymentMethod !== 'all',
    filters.currency !== 'all',
    filters.dateRange !== 'all',
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            icon={ShoppingCart}
            label="Total Orders"
            value={summary.totalOrders.toLocaleString()}
            sublabel={`Today: ${summary.todayOrders}`}
          />
          <StatTile
            icon={DollarSign}
            label="Revenue (30d)"
            value={formatCurrency(summary.last30Days.revenueUSD, 'USD')}
            sublabel={formatCurrency(summary.last30Days.revenueHTG, 'HTG')}
          />
          <StatTile
            icon={TrendingUp}
            label="Avg Order Value"
            value={formatCurrency(summary.last30Days.avgOrderValueUSD, 'USD')}
            sublabel={`${summary.last30Days.orders} orders (30d)`}
          />
          <StatTile
            icon={CheckCircle}
            label="Confirmed"
            value={summary.byStatus.confirmed.toLocaleString()}
            sublabel={`${summary.byStatus.pending} pending • ${summary.byStatus.refunded} refunded`}
          />
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or order ID..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: '7 Days' },
              { value: 'month', label: '30 Days' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleDateRangeChange(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.dateRange === option.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-teal-100 text-teal-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {/* Extended Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Methods</option>
                <option value="stripe">Stripe</option>
                <option value="moncash">MonCash</option>
                <option value="natcash">NatCash</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={filters.currency}
                onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Currencies</option>
                <option value="USD">USD</option>
                <option value="HTG">HTG</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>

            {/* Custom Date Range */}
            <div className="sm:col-span-2 lg:col-span-4 flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, dateRange: 'custom' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, dateRange: 'custom' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-gray-900">Orders</h2>
            <p className="text-xs text-gray-500">
              {pagination.totalCount.toLocaleString()} total orders
              {filters.search && ` • Filtered`}
            </p>
          </div>
          <button
            onClick={() => fetchOrders(pagination.page)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const email = order.attendee_email || order.attendeeEmail || order.email || ''
                    const name = order.attendee_name || order.attendeeName || ''
                    const price = order.price_paid || order.pricePaid || 0
                    const currency = order.currency || 'USD'
                    const paymentMethod = order.payment_method || order.paymentMethod || ''
                    const purchasedAt = order.purchased_at || order.purchasedAt || ''
                    const ticketType = order.ticket_type || order.ticketType || 'General'
                    const eventId = order.event_id || order.eventId || ''

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{order.id.slice(0, 8)}…</div>
                          <div className="text-xs text-gray-500">{ticketType}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-[200px] truncate">{order.event_name || 'Unknown'}</div>
                          {eventId && (
                            <Link href={`/admin/events?selected=${eventId}`} className="text-xs text-teal-600 hover:text-teal-700">
                              View Event
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(price, currency as Currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PaymentMethodBadge method={paymentMethod} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status || ''} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {purchasedAt ? new Date(purchasedAt).toLocaleDateString() : '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {purchasedAt ? new Date(purchasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-gray-500 hover:text-teal-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((order) => {
                const email = order.attendee_email || order.attendeeEmail || order.email || ''
                const name = order.attendee_name || order.attendeeName || ''
                const price = order.price_paid || order.pricePaid || 0
                const currency = order.currency || 'USD'
                const paymentMethod = order.payment_method || order.paymentMethod || ''
                const purchasedAt = order.purchased_at || order.purchasedAt || ''

                return (
                  <div key={order.id} className="p-4" onClick={() => setSelectedOrder(order)}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Order {order.id.slice(0, 8)}…</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{order.event_name}</div>
                      </div>
                      <StatusBadge status={order.status || ''} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">{name || email || 'Unknown'}</div>
                      <div className="font-medium text-gray-900">{formatCurrency(price, currency as Currency)}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <PaymentMethodBadge method={paymentMethod} />
                      <div className="text-xs text-gray-500">
                        {purchasedAt ? new Date(purchasedAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchOrders(pagination.page + 1)}
                disabled={!pagination.hasMore}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedOrder(null)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-xl z-50 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">Order Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Order Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Ticket className="w-4 h-4" />
                  <span>Order ID</span>
                </div>
                <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg break-all">
                  {selectedOrder.id}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <StatusBadge status={selectedOrder.status || ''} />
              </div>

              {/* Event */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Event</div>
                <div className="text-gray-900">{selectedOrder.event_name || 'Unknown Event'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Ticket Type: {selectedOrder.ticket_type || selectedOrder.ticketType || 'General'}
                </div>
                {(selectedOrder.event_id || selectedOrder.eventId) && (
                  <Link
                    href={`/events/${selectedOrder.event_id || selectedOrder.eventId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-teal-600 hover:text-teal-700"
                  >
                    View Event Page <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Attendee */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Attendee</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedOrder.attendee_name || selectedOrder.attendeeName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm break-all">
                      {selectedOrder.attendee_email || selectedOrder.attendeeEmail || selectedOrder.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Payment</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(
                        selectedOrder.price_paid || selectedOrder.pricePaid || 0,
                        (selectedOrder.currency || 'USD') as Currency
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Method</span>
                    <PaymentMethodBadge method={selectedOrder.payment_method || selectedOrder.paymentMethod || ''} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="text-sm text-gray-900">
                      {(selectedOrder.purchased_at || selectedOrder.purchasedAt)
                        ? new Date(selectedOrder.purchased_at || selectedOrder.purchasedAt || '').toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check-in Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Check-in Status</span>
                </div>
                {(selectedOrder.checked_in || selectedOrder.checkedIn) ? (
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Checked In
                  </span>
                ) : (
                  <span className="text-gray-500">Not checked in</span>
                )}
              </div>

              {/* QR Code */}
              {(selectedOrder.qr_code || selectedOrder.qrCode) && (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">QR Code</div>
                  <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                    <Image
                      src={selectedOrder.qr_code ?? selectedOrder.qrCode ?? ''}
                      alt="Ticket QR Code"
                      width={128}
                      height={128}
                      className="w-32 h-32"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
