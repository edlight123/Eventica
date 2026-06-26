'use client'

import { X, ExternalLink, CheckCircle, XCircle, Trash2, AlertTriangle, User, Ticket, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface Event {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  city: string
  venue_name?: string
  address?: string
  banner_image_url?: string
  category?: string
  is_published: boolean
  max_attendees: number
  organizer_id: string
  organizer_name: string
  organizer_email: string
  organizer_verified?: boolean
  tickets_sold?: number
  reports?: Array<{
    id: string
    reason: string
    reported_by: string
    created_at: string
  }>
  audit_logs?: Array<{
    id: string
    action: string
    admin_email: string
    timestamp: string
    details?: any
  }>
}

interface AdminEventDetailSheetProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onAction: (action: 'publish' | 'unpublish' | 'delete' | 'feature', reason?: string) => void
}

export function AdminEventDetailSheet({ event, isOpen, onClose, onAction }: AdminEventDetailSheetProps) {
  const { t } = useTranslation('common')
  const [reason, setReason] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState<'full' | 'summary' | null>(null)

  if (!isOpen || !event) return null

  const handleUnpublish = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for unpublishing')
      return
    }
    onAction('unpublish', reason)
    setReason('')
  }

  const handleDelete = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for deletion')
      return
    }
    onAction('delete', reason)
    setReason('')
    setShowDeleteConfirm(false)
  }

  const downloadCsv = async (mode: 'full' | 'summary') => {
    try {
      setIsExporting(mode)
      const res = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/export?mode=${mode}`, {
        method: 'GET',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Export failed (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `event_${event.id}_${mode}_financials_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.message || 'Failed to download CSV')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] lg:w-[700px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">{t('admin.event_details')}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Banner */}
          {event.banner_image_url ? (
            <div className="relative w-full h-48 bg-gray-100">
              <Image
                src={event.banner_image_url}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
              <span className="text-6xl">🎉</span>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Title & Status */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                <span className={`flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-full ${
                  event.is_published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {event.is_published ? t('admin.published') : t('admin.draft')}
                </span>
              </div>

              {event.category && (
                <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                  {event.category}
                </span>
              )}
            </div>

            {/* Event Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">{t('admin.date_time')}</div>
                  <div className="text-sm text-gray-900">
                    {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">{t('admin.location')}</div>
                  <div className="text-sm text-gray-900">{event.venue_name || 'TBD'}</div>
                  <div className="text-xs text-gray-600">{event.city}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Ticket className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">{t('admin.max_capacity')}</div>
                  <div className="text-sm text-gray-900">
                    {event.tickets_sold || 0} / {event.max_attendees} {t('admin.tickets_sold').toLowerCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Organizer Info */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Organizer</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{event.organizer_name}</span>
                    {event.organizer_verified && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{event.organizer_email}</div>
                </div>
                <a
                  href={`/admin/users?search=${event.organizer_email}`}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
                >
                  View
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Reports */}
            {event.reports && event.reports.length > 0 && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="text-sm font-medium text-red-900">
                    Reports ({event.reports.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {event.reports.map((report) => (
                    <div key={report.id} className="p-3 bg-white rounded-md">
                      <div className="text-sm text-gray-900 mb-1">{report.reason}</div>
                      <div className="text-xs text-gray-500">
                        By {report.reported_by} • {format(new Date(report.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log */}
            {event.audit_logs && event.audit_logs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Activity Timeline</h4>
                <div className="space-y-3">
                  {event.audit_logs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xs">📝</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">{log.action}</div>
                        <div className="text-xs text-gray-500">
                          By {log.admin_email} • {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          {/* Reason Input (for unpublish/delete) */}
          {!event.is_published || showDeleteConfirm ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {showDeleteConfirm ? t('admin.reason_for_deletion') : t('admin.reason_for_action')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin.reason_placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={2}
              />
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {event.is_published ? (
              <>
                <button
                  onClick={handleUnpublish}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {t('admin.unpublish')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : showDeleteConfirm ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  {t('admin.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  {t('admin.confirm_delete')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAction('publish')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('admin.approve_publish')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCsv('full')}
              disabled={isExporting !== null}
              className="flex-1 px-4 py-2.5 border border-brand-300 text-brand-700 rounded-lg hover:bg-brand-50 font-medium text-sm disabled:opacity-60"
            >
              {isExporting === 'full' ? 'Downloading…' : 'Download Financials CSV'}
            </button>
            <button
              onClick={() => downloadCsv('summary')}
              disabled={isExporting !== null}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-60"
            >
              {isExporting === 'summary' ? 'Downloading…' : 'Download Summary CSV'}
            </button>
          </div>

          <a
            href={`/events/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center px-4 py-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            {t('admin.view_public')} →
          </a>
        </div>
      </div>
    </>
  )
}
