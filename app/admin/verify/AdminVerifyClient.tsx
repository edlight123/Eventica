'use client'

import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import VerificationRequestReview from './VerificationRequestReview'
import VerifyOrganizerForm from './VerifyOrganizerForm'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { useToast } from '@/components/ui/Toast'
import { Search, Download, Check, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'

type AdminVerifyClientProps = {
  requestsWithUsers: any[]
  organizers: any[]
}

type SortField = 'date' | 'name' | 'email' | 'country'
type SortDirection = 'asc' | 'desc'

export default function AdminVerifyClient({ requestsWithUsers, organizers }: AdminVerifyClientProps) {
  const { t } = useTranslation('admin')
  const confirmDialog = useConfirm()
  const { showToast } = useToast()
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
    const ok = await confirmDialog({
      title: `Approve ${selectedIds.size} verification requests?`,
      description: 'Each selected organizer will be marked approved and notified.',
      confirmLabel: 'Approve',
      variant: 'default',
    })
    if (!ok) return

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
      showToast({
        type: 'success',
        title: 'Requests approved',
        message: `${selectedIds.size} verification requests approved!`,
      })
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Bulk approve error:', error)
      showToast({
        type: 'error',
        title: 'Action failed',
        message: 'Some requests failed to approve. Please try again.',
      })
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

  const sortFields: Array<{ key: SortField; label: string }> = [
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'country', label: 'Country' },
  ]

  const kpis: Array<{ label: string; value: string | number; tone: string }> = [
    { label: 'Pending', value: analytics.pending, tone: 'text-amber-300' },
    { label: 'Changes req.', value: analytics.changesRequested, tone: 'text-amber-300' },
    { label: 'Approved', value: analytics.approved, tone: 'text-emerald-300' },
    { label: 'Rejected', value: analytics.rejected, tone: 'text-red-300' },
    { label: 'Approval rate', value: `${analytics.approvalRate}%`, tone: 'text-brand-300' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <EditorialHeader
        title={t('verify.title')}
        subtitle={t('verify.subtitle')}
        className="mb-5"
      />

      {/* KPI strip — hairline grid via 1px gap over a faint backdrop */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] p-4">
            <p className="text-[11px] uppercase tracking-wide text-white/50">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar: status filter + search + sort + export */}
      <div className="mb-5 space-y-3">
        {/* Status filter pills */}
        <div
          className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 p-1"
          role="tablist"
          aria-label="Filter by status"
        >
          {tabs.map((tabItem) => {
            const active = requestedStatus === tabItem.key
            return (
              <button
                key={tabItem.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(tabItem.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {tabItem.label}
              </button>
            )
          })}
        </div>

        {/* Search + sort + export */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, email, or country…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-transparent py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="appearance-none rounded-lg border border-white/10 bg-transparent py-2 pl-3 pr-8 text-sm text-white/80 focus:border-white/25 focus:outline-none"
                aria-label="Sort by"
              >
                {sortFields.map((f) => (
                  <option key={f.key} value={f.key} className="bg-[#0a0a0a] text-white">
                    Sort: {f.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            </div>

            <button
              type="button"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04]"
              aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {requestedStatus === 'pending' && filteredRequests.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
            <input
              id="select-all-verify"
              type="checkbox"
              checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 accent-brand-500"
            />
            <label htmlFor="select-all-verify" className="text-[13px] text-white/60 cursor-pointer">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkActionLoading}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                {bulkActionLoading ? 'Approving…' : `Approve ${selectedIds.size}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Requests list */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-12 text-center">
          <p className="text-sm text-white/50">
            {searchQuery
              ? `No results found for "${searchQuery}"`
              : requestedStatus === 'pending'
              ? t('verify.no_pending')
              : t('verify.all_caught_up')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request: any) => (
            <div key={request.id} className="flex items-start gap-3">
              {requestedStatus === 'pending' && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(request.id)}
                  onChange={() => toggleSelect(request.id)}
                  className="mt-5 h-5 w-5 shrink-0 accent-brand-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select request"
                />
              )}
              <div className="min-w-0 flex-1">
                <VerificationRequestReview request={request} user={request.user} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual verification (verify any organizer by search) */}
      <details className="group mt-6 rounded-xl border border-white/10">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-base font-semibold text-white">{t('verify.quick_toggle_title')}</h2>
            <p className="mt-0.5 text-[13px] text-white/55">{t('verify.quick_toggle_subtitle')}</p>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-white/10 p-4 sm:p-5">
          <VerifyOrganizerForm organizers={organizers} />
        </div>
      </details>
    </div>
  )
}
