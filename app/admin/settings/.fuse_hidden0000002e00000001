'use client'

import { useState, useEffect } from 'react'
import { PlatformSettings } from '@/types/platform-settings'
import { AlertTriangle, Info, TrendingUp, Clock, DollarSign, X } from 'lucide-react'

export function PlatformSettingsForm() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Form state
  const [haitiPlatformFee, setHaitiPlatformFee] = useState('')
  const [haitiSettlementDays, setHaitiSettlementDays] = useState('')
  const [usCanadaPlatformFee, setUsCanadaPlatformFee] = useState('')
  const [usCanadaSettlementDays, setUsCanadaSettlementDays] = useState('')
  const [minimumPayout, setMinimumPayout] = useState('')

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (data.success && data.settings) {
        setSettings(data.settings)
        
        // Populate form fields
        setHaitiPlatformFee((data.settings.haiti.platformFeePercentage * 100).toFixed(2))
        setHaitiSettlementDays(String(data.settings.haiti.settlementHoldDays))
        setUsCanadaPlatformFee((data.settings.usCanada.platformFeePercentage * 100).toFixed(2))
        setUsCanadaSettlementDays(String(data.settings.usCanada.settlementHoldDays))
        setMinimumPayout((data.settings.minimumPayoutAmount / 100).toFixed(2))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate first
    const haitiPlatformFeeNum = parseFloat(haitiPlatformFee)
    const haitiSettlementDaysNum = parseInt(haitiSettlementDays)
    const usCanadaPlatformFeeNum = parseFloat(usCanadaPlatformFee)
    const usCanadaSettlementDaysNum = parseInt(usCanadaSettlementDays)
    const minimumPayoutNum = parseFloat(minimumPayout)

    if (isNaN(haitiPlatformFeeNum) || haitiPlatformFeeNum < 0 || haitiPlatformFeeNum > 100) {
      setMessage({ type: 'error', text: 'Haiti platform fee must be between 0 and 100%' })
      return
    }

    if (isNaN(haitiSettlementDaysNum) || haitiSettlementDaysNum < 0) {
      setMessage({ type: 'error', text: 'Haiti settlement days must be >= 0' })
      return
    }

    if (isNaN(usCanadaPlatformFeeNum) || usCanadaPlatformFeeNum < 0 || usCanadaPlatformFeeNum > 100) {
      setMessage({ type: 'error', text: 'US/Canada platform fee must be between 0 and 100%' })
      return
    }

    if (isNaN(usCanadaSettlementDaysNum) || usCanadaSettlementDaysNum < 0) {
      setMessage({ type: 'error', text: 'US/Canada settlement days must be >= 0' })
      return
    }

    if (isNaN(minimumPayoutNum) || minimumPayoutNum < 0) {
      setMessage({ type: 'error', text: 'Minimum payout amount must be >= 0' })
      return
    }

    // Show confirmation modal
    setShowConfirmModal(true)
  }

  const confirmSave = async () => {
    setSaving(true)
    setMessage(null)
    setShowConfirmModal(false)

    try {
      const haitiPlatformFeeNum = parseFloat(haitiPlatformFee)
      const haitiSettlementDaysNum = parseInt(haitiSettlementDays)
      const usCanadaPlatformFeeNum = parseFloat(usCanadaPlatformFee)
      const usCanadaSettlementDaysNum = parseInt(usCanadaSettlementDays)
      const minimumPayoutNum = parseFloat(minimumPayout)

      // Send update request
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          haiti: {
            platformFeePercentage: haitiPlatformFeeNum / 100,
            settlementHoldDays: haitiSettlementDaysNum,
          },
          usCanada: {
            platformFeePercentage: usCanadaPlatformFeeNum / 100,
            settlementHoldDays: usCanadaSettlementDaysNum,
          },
          minimumPayoutAmount: Math.round(minimumPayoutNum * 100),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setMessage({ type: 'success', text: 'Settings updated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage({ type: 'error', text: 'Failed to update settings' })
    } finally {
      setSaving(false)
    }
  }

  // Calculate preview for $100 ticket
  const calculatePreview = (region: 'haiti' | 'usCanada') => {
    const ticketPrice = 10000 // $100 in cents
    const feePercent = region === 'haiti' ? parseFloat(haitiPlatformFee) : parseFloat(usCanadaPlatformFee)
    
    if (isNaN(feePercent)) return null
    
    const platformFee = Math.round(ticketPrice * (feePercent / 100))
    const processingFee = Math.round(ticketPrice * 0.029) + 30 // Stripe fees
    const netAmount = ticketPrice - platformFee - processingFee
    
    return {
      gross: (ticketPrice / 100).toFixed(2),
      platformFee: (platformFee / 100).toFixed(2),
      processingFee: (processingFee / 100).toFixed(2),
      net: (netAmount / 100).toFixed(2),
      netPercent: ((netAmount / ticketPrice) * 100).toFixed(1)
    }
  }

  const haitiPreview = calculatePreview('haiti')
  const usCanadaPreview = calculatePreview('usCanada')

  const hasChanges = settings && (
    (parseFloat(haitiPlatformFee) !== settings.haiti.platformFeePercentage * 100) ||
    (parseInt(haitiSettlementDays) !== settings.haiti.settlementHoldDays) ||
    (parseFloat(usCanadaPlatformFee) !== settings.usCanada.platformFeePercentage * 100) ||
    (parseInt(usCanadaSettlementDays) !== settings.usCanada.settlementHoldDays) ||
    (parseFloat(minimumPayout) !== settings.minimumPayoutAmount / 100)
  )

  if (loading) {
    return (
      <div className="bg-[#141414] shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#242424] rounded w-1/4"></div>
          <div className="h-4 bg-[#242424] rounded w-1/2"></div>
          <div className="h-4 bg-[#242424] rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Confirm Settings Update
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  These changes will affect all future transactions. Are you sure you want to update the platform settings?
                </p>
                
                {/* Show changes */}
                <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4 text-xs space-y-2">
                  {settings && parseFloat(haitiPlatformFee) !== settings.haiti.platformFeePercentage * 100 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Haiti Fee:</span>
                      <span className="font-semibold">
                        {(settings.haiti.platformFeePercentage * 100).toFixed(2)}% → {parseFloat(haitiPlatformFee).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {settings && parseInt(haitiSettlementDays) !== settings.haiti.settlementHoldDays && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Haiti Settlement:</span>
                      <span className="font-semibold">
                        {settings.haiti.settlementHoldDays} days → {parseInt(haitiSettlementDays)} days
                      </span>
                    </div>
                  )}
                  {settings && parseFloat(usCanadaPlatformFee) !== settings.usCanada.platformFeePercentage * 100 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">US/Canada Fee:</span>
                      <span className="font-semibold">
                        {(settings.usCanada.platformFeePercentage * 100).toFixed(2)}% → {parseFloat(usCanadaPlatformFee).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {settings && parseInt(usCanadaSettlementDays) !== settings.usCanada.settlementHoldDays && (
                    <div className="flex justify-between">
                      <span className="text-white/60">US/Canada Settlement:</span>
                      <span className="font-semibold">
                        {settings.usCanada.settlementHoldDays} days → {parseInt(usCanadaSettlementDays)} days
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 px-4 py-2 border border-white/15 text-white/70 rounded-lg hover:bg-[#0a0a0a] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Banner */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-white/50 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white">
                <p className="font-medium mb-1">Important Information</p>
                <p className="text-white/70">
                  These settings apply to all future transactions. Changes take effect immediately and will be applied to new ticket sales and earnings calculations.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message Banner */}
            {message && (
              <div
                className={`rounded-lg p-4 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Haiti Settings Card */}
            <div className="bg-[#141414] shadow rounded-lg border border-white/10">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="text-3xl">🇭🇹</div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Haiti Events</h2>
                    <p className="text-sm text-white/60">
                      Settings for events in Haiti
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="haitiPlatformFee" className="block text-sm font-medium text-white/70 mb-2">
                      Platform Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="haitiPlatformFee"
                        value={haitiPlatformFee}
                        onChange={(e) => setHaitiPlatformFee(e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                        className="block w-full px-3 py-2 border border-white/15 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-white/50 sm:text-sm">%</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      Commission taken from each sale
                    </p>
                  </div>

                  <div>
                    <label htmlFor="haitiSettlementDays" className="block text-sm font-medium text-white/70 mb-2">
                      Settlement Hold Days
                    </label>
                    <input
                      type="number"
                      id="haitiSettlementDays"
                      value={haitiSettlementDays}
                      onChange={(e) => setHaitiSettlementDays(e.target.value)}
                      min="0"
                      className="block w-full px-3 py-2 border border-white/15 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      required
                    />
                    <p className="mt-1 text-xs text-white/50">
                      Days before funds can be withdrawn
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* US/Canada Settings Card */}
            <div className="bg-[#141414] shadow rounded-lg border border-white/10">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="text-3xl">🇺🇸🇨🇦</div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">US & Canada Events</h2>
                    <p className="text-sm text-white/60">
                      Settings for events in United States or Canada
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="usCanadaPlatformFee" className="block text-sm font-medium text-white/70 mb-2">
                      Platform Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="usCanadaPlatformFee"
                        value={usCanadaPlatformFee}
                        onChange={(e) => setUsCanadaPlatformFee(e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                        className="block w-full px-3 py-2 border border-white/15 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-white/50 sm:text-sm">%</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      Commission taken from each sale
                    </p>
                  </div>

                  <div>
                    <label htmlFor="usCanadaSettlementDays" className="block text-sm font-medium text-white/70 mb-2">
                      Settlement Hold Days
                    </label>
                    <input
                      type="number"
                      id="usCanadaSettlementDays"
                      value={usCanadaSettlementDays}
                      onChange={(e) => setUsCanadaSettlementDays(e.target.value)}
                      min="0"
                      className="block w-full px-3 py-2 border border-white/15 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      required
                    />
                    <p className="mt-1 text-xs text-white/50">
                      Days before funds can be withdrawn
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Settings Card */}
            <div className="bg-[#141414] shadow rounded-lg border border-white/10">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="text-3xl">🌍</div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Global Settings</h2>
                    <p className="text-sm text-white/60">
                      Settings that apply to all events
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minimumPayout" className="block text-sm font-medium text-white/70 mb-2">
                      Minimum Payout Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-white/50 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        id="minimumPayout"
                        value={minimumPayout}
                        onChange={(e) => setMinimumPayout(e.target.value)}
                        step="0.01"
                        min="0"
                        className="block w-full pl-7 px-3 py-2 border border-white/15 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      Minimum required for withdrawal (USD)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-white/50">
                {hasChanges ? (
                  <span className="text-amber-300 font-medium">● Unsaved changes</span>
                ) : (
                  <span className="text-white/40">No changes</span>
                )}
              </p>
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Panel - Right Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-brand-500/15 to-brand-600/10 border border-brand-500/30 rounded-lg p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand-300" />
              <h3 className="text-lg font-semibold text-white">Live Preview</h3>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Example: $100 ticket sale breakdown
            </p>

            {/* Haiti Preview */}
            <div className="bg-[#141414] rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🇭🇹</span>
                <p className="font-semibold text-white">Haiti Event</p>
              </div>
              {haitiPreview ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Ticket Price</span>
                    <span className="font-semibold">${haitiPreview.gross}</span>
                  </div>
                  <div className="flex justify-between text-red-300">
                    <span>Platform Fee</span>
                    <span>-${haitiPreview.platformFee}</span>
                  </div>
                  <div className="flex justify-between text-red-300">
                    <span>Processing Fee</span>
                    <span>-${haitiPreview.processingFee}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-emerald-300">
                    <span>Organizer Earns</span>
                    <span>${haitiPreview.net} ({haitiPreview.netPercent}%)</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/40">Enter fee to preview</p>
              )}
            </div>

            {/* US/Canada Preview */}
            <div className="bg-[#141414] rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🇺🇸🇨🇦</span>
                <p className="font-semibold text-white">US/Canada Event</p>
              </div>
              {usCanadaPreview ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Ticket Price</span>
                    <span className="font-semibold">${usCanadaPreview.gross}</span>
                  </div>
                  <div className="flex justify-between text-red-300">
                    <span>Platform Fee</span>
                    <span>-${usCanadaPreview.platformFee}</span>
                  </div>
                  <div className="flex justify-between text-red-300">
                    <span>Processing Fee</span>
                    <span>-${usCanadaPreview.processingFee}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-emerald-300">
                    <span>Organizer Earns</span>
                    <span>${usCanadaPreview.net} ({usCanadaPreview.netPercent}%)</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/40">Enter fee to preview</p>
              )}
            </div>
          </div>

          {/* Current Settings Summary */}
          {settings && (
            <div className="bg-[#141414] border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-white/60" />
                <h3 className="text-lg font-semibold text-white">Current Settings</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-white/50 text-xs mb-1">🇭🇹 Haiti</p>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Fee</span>
                    <span className="font-semibold">{(settings.haiti.platformFeePercentage * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Settlement</span>
                    <span className="font-semibold">{settings.haiti.settlementHoldDays} days</span>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-white/50 text-xs mb-1">🇺🇸🇨🇦 US/Canada</p>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Fee</span>
                    <span className="font-semibold">{(settings.usCanada.platformFeePercentage * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Settlement</span>
                    <span className="font-semibold">{settings.usCanada.settlementHoldDays} days</span>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-white/50 text-xs mb-1">🌍 Global</p>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Min Payout</span>
                    <span className="font-semibold">${(settings.minimumPayoutAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
                {settings.updatedBy && (
                  <div className="border-t border-white/10 pt-3 text-xs text-white/50">
                    Last updated by: {settings.updatedBy}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

