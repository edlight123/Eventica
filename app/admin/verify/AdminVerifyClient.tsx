'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import VerificationRequestReview from './VerificationRequestReview'
import VerifyOrganizerForm from './VerifyOrganizerForm'

type AdminVerifyClientProps = {
  requestsWithUsers: any[]
  organizers: any[]
}

type SortField = 'date' | 'name' | 'email' | 'country'
type SortDirection = 'asc' | 'desc'

export default function AdminVerifyClient({ requestsWithUsers, organizers }: AdminVerifyClientProps) {
  const { t } = useTranslation('admin')
  const router = useRouter()
  const searchParams = useSearchParams()

  const requestedStatusRaw = (searchParams.get('status') || 'pending').toLowerCase()
  const supported = new Set(['pending', 'changes_requested', 'rejected', 'approved', 'all'])
  const requestedStatus = supported.has(requestedStatusRaw) ? requestedStatusRaw : 'pending'

  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const filteredRequests = useMemo(() => {
    const isPendingLike = (status: string) => {
      const s = (status || '').toLowerCase()
      // Explicitly exclude non-pending statuses
      if (s === 'changes_requested' || s === 'rejected' || s === 'approved') return false
      return s === 'pending' || s === 'pending_review' || s === 'in_review' || s === 'in_progress'
    }

    // Status filter
    let filtered = requestsWithUsers
    if (requestedStatus === 'pending') {
      filtered = filtered.filter((r: any) => isPendingLike(r.status))
    } else if (requestedStatus !== 'all') {
      filtered = filtered.filter((r: any) => String(r.status || '').toLowerCase() === requestedStatus)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((r: any) => {
        const name = (r.user?.full_name || '').toLowerCase()
        const email = (r.user?.email || '').toLowerCase()
        const country = (r.steps?.organizerInfo?.fields?.country || '').toLowerCase()
        return name.includes(query) || email.includes(query) || country.includes(query)
      })
    }

    // Sort
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      let aVal, bVal
      
      switch (sortField) {
        case 'name':
          aVal = (a.user?.full_name || '').toLowerCase()
          bVal = (b.user?.full_name || '').toLowerCase()
          break
        case 'email':
          aVal = (a.user?.email || '').toLowerCase()
          bVal = (b.user?.email || '').toLowerCase()
          break
        case 'country':
          aVal = (a.steps?.organizerInfo?.fields?.country || '').toLowerCase()
          bVal = (b.steps?.organizerInfo?.fields?.country || '').toLowerCase()
          break
        case 'date':
        default:
          aVal = new Date(a.submittedAt || a.submitted_at || a.createdAt || a.created_at || 0).getTime()
          bVal = new Date(b.submittedAt || b.submitted_at || b.createdAt || b.created_at || 0).getTime()
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [requestedStatus, requestsWithUsers, searchQuery, sortField, sortDirection])

  const analytics = useMemo(() => {
    const pending = requestsWithUsers.filter((r: any) => {
      const s = (r.status || '').toLowerCase()
      return s === 'pending' || s === 'pending_review' || s === 'in_review' || s === 'in_progress'
    }).length
    const approved = requestsWithUsers.filter((r: any) => r.status === 'approved').length
    const rejected = requestsWithUsers.filter((r: any) => r.status === 'rejected').length
    const changesRequested = requestsWithUsers.filter((r: any) => r.status === 'changes_requested').length
    const total = requestsWithUsers.length
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

    return { pending, approved, rejected, changesRequested, total, approvalRate }
  }, [requestsWithUsers])

  const setStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'pending') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    const query = params.toString()
    router.push(query ? `/admin/verify?${query}` : '/admin/verify')
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Approve ${selectedIds.size} verification requests?`)) return

    setBulkActionLoading(true)
    try {
      const promises = Array.from(selectedIds).map(async (requestId) => {
        const response = await fetch('/api/admin/review-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, status: 'approved' }),
        })
        if (!response.ok) throw new Error(`Failed to approve ${requestId}`)
      })

      await Promise.all(promises)
      alert(`✅ ${selectedIds.size} verification requests approved!`)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Bulk approve error:', error)
      alert('Some requests failed to approve. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Country', 'Submitted Date', 'Request ID']
    const rows = filteredRequests.map((r: any) => [
      r.user?.full_name || '',
      r.user?.email || '',
      r.status || '',
      r.steps?.organizerInfo?.fields?.country || '',
      r.submittedAt || r.submitted_at || r.createdAt || r.created_at || '',
      r.id,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `verification-requests-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequests.map((r: any) => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const tabs: Array<{ key: string; label: string }> = [
    { key: 'pending', label: t('verify.pending_requests') },
    { key: 'changes_requested', label: t('verify.changes_requested') },
    { key: 'approved', label: t('verify.approved') },
    { key: 'all', label: t('verify.all') },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          {t('verify.back_to_dashboard')}
        </Link>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase font-medium">Pending</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{analytics.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase font-medium">Approved</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{analytics.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase font-medium">Changes Req.</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">{analytics.changesRequested}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase font-medium">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{analytics.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 col-span-2">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase font-medium">Approval Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-teal-600 mt-1">{analytics.approvalRate}%</p>
        </div>
      </div>

      {/* Verification Requests Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-6 sm:mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900 mb-1 sm:mb-2">
          {t('verify.title')}
        </h1>
        <p className="text-[13px] sm:text-base text-gray-600 mb-6 sm:mb-8">
          {t('verify.subtitle')}
        </p>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => {
            const active = requestedStatus === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                className={
                  active
                    ? 'px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-semibold bg-teal-600 text-white'
                    : 'px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search and Controls */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent text-[15px]"
              />
            </div>
            
            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredRequests.length === 0}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[13px] sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              📥 Export CSV
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[13px] text-gray-600 py-1">Sort by:</span>
            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-1 rounded-full text-[12px] sm:text-xs font-medium ${
                sortField === 'date' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1 rounded-full text-[12px] sm:text-xs font-medium ${
                sortField === 'name' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('email')}
              className={`px-3 py-1 rounded-full text-[12px] sm:text-xs font-medium ${
                sortField === 'email' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('country')}
              className={`px-3 py-1 rounded-full text-[12px] sm:text-xs font-medium ${
                sortField === 'country' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Country {sortField === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          {/* Bulk Actions */}
          {requestedStatus === 'pending' && filteredRequests.length > 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-600"
              />
              <span className="text-[13px] text-gray-600">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkActionLoading}
                  className="ml-auto px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkActionLoading ? 'Processing...' : `✅ Approve ${selectedIds.size}`}
                </button>
              )}
            </div>
          )}
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-[13px] sm:text-base text-gray-500 text-center py-6 sm:py-8">
            {searchQuery ? `No results found for "${searchQuery}"` : requestedStatus === 'pending' ? t('verify.no_pending') : t('verify.all_caught_up')}
          </p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredRequests.map((request: any) => (
              <div key={request.id} className="relative">
                {requestedStatus === 'pending' && (
                  <div className="absolute left-2 top-6 z-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(request.id)}
                      onChange={() => toggleSelect(request.id)}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-600 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <div className={requestedStatus === 'pending' ? 'ml-10' : ''}>
                  <VerificationRequestReview
                    key={request.id}
                    request={request}
                    user={request.user}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Verification Toggle */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
        <details>
          <summary className="cursor-pointer select-none">
            <h2 className="inline font-display text-xl sm:text-2xl text-gray-900">
              {t('verify.quick_toggle_title')}
            </h2>
            <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">
              {t('verify.quick_toggle_subtitle')}
            </p>
          </summary>

          <div className="mt-6 sm:mt-8">
            <VerifyOrganizerForm organizers={organizers} />
          </div>
        </details>
      </div>
    </div>
  )
}
