'use client'

import { useEffect, useState } from 'react'
import { Link2, Copy, Check, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { FormField, OrgEmptyState } from '@/components/organizer/ui'

interface TrackingLink {
  id: string
  label: string
  source: string
  medium: string
  campaign: string
  url: string
  copiedAt: number | null
}

interface TrackingLinksClientProps {
  eventId: string
  eventTitle: string
}

let nextId = 1

function buildUrl(base: string, source: string, medium: string, campaign: string): string {
  const params = new URLSearchParams()
  if (source) params.set('utm_source', source)
  if (medium) params.set('utm_medium', medium)
  if (campaign) params.set('utm_campaign', campaign)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export default function TrackingLinksClient({ eventId, eventTitle }: TrackingLinksClientProps) {
  const [origin, setOrigin] = useState('')
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('link')
  const [campaign, setCampaign] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const baseUrl = origin ? `${origin}/events/${eventId}` : `/events/${eventId}`
  const previewUrl = buildUrl(baseUrl, source, medium, campaign)

  const reset = () => {
    setLabel('')
    setSource('')
    setMedium('link')
    setCampaign('')
    setShowForm(false)
  }

  const handleCreate = () => {
    if (!label.trim() || !source.trim()) return
    const url = buildUrl(baseUrl, source, medium, campaign)
    setLinks((prev) => [
      ...prev,
      {
        id: String(nextId++),
        label: label.trim(),
        source: source.trim(),
        medium: medium.trim(),
        campaign: campaign.trim(),
        url,
        copiedAt: null,
      },
    ])
    reset()
  }

  const copyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url)
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, copiedAt: Date.now() } : l))
    )
    setTimeout(() => {
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, copiedAt: null } : l))
      )
    }, 2000)
  }

  const deleteLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tracking links</h1>
          <p className="mt-0.5 text-sm text-white/70">
            Generate UTM-tagged links to track traffic from different sources.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus className="h-4 w-4" />
            New link
          </button>
        )}
      </div>

      {/* Builder form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-4 font-semibold text-white">Build tracking link</h2>
          <div className="space-y-4">
            <FormField label="Label" htmlFor="tl-label" required>
              <input
                id="tl-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Instagram story"
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Source" htmlFor="tl-source" required>
                <input
                  id="tl-source"
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="instagram"
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </FormField>
              <FormField label="Medium" htmlFor="tl-medium">
                <input
                  id="tl-medium"
                  type="text"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder="story"
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </FormField>
              <FormField label="Campaign" htmlFor="tl-campaign">
                <input
                  id="tl-campaign"
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="launch"
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </FormField>
            </div>
          </div>

          {/* Live preview */}
          <div className="mt-4 rounded-xl border border-white/10 px-4 py-3">
            <p className="label-mono uppercase mb-1 text-white/40">Preview</p>
            <p className="break-all font-mono text-xs text-white/70">{previewUrl}</p>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!label.trim() || !source.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="h-4 w-4" />
              Create link
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 && !showForm ? (
        <OrgEmptyState
          icon={Link2}
          title="No tracking links"
          description="Create UTM links to measure which channels drive the most ticket sales."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="h-4 w-4" />
              New tracking link
            </button>
          }
        />
      ) : links.length > 0 ? (
        <>
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white">Links are not saved</span>, copy them now.
            They&apos;ll disappear when you leave or refresh this page.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 divide-y divide-white/5">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{link.label}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-white/70">{link.url}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(
                    [
                      ['source', link.source],
                      ['medium', link.medium],
                      link.campaign ? ['campaign', link.campaign] : null,
                    ] as (string[] | null)[]
                  )
                    .filter((x): x is string[] => x !== null)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-white/70"
                      >
                        {k}={v}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(link.id, link.url)}
                  aria-label={`Copy tracking link: ${link.label}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {link.copiedAt ? (
                    <><Check className="h-3.5 w-3.5 text-emerald-400" />Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" />Copy</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => deleteLink(link.id)}
                  aria-label={`Delete tracking link: ${link.label}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : null}
    </div>
  )
}
