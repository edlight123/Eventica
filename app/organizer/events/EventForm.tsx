'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import ImageUpload from '@/components/ImageUpload'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { Calendar, MapPin, DollarSign, Ticket, Tag, Image as ImageIcon, FileText, Clock, Check } from 'lucide-react'

interface EventFormProps {
  userId: string
  event?: any
}

const CATEGORIES = ['Concert', 'Party', 'Conference', 'Festival', 'Workshop', 'Sports', 'Theater', 'Other']
const CITIES = ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Les Cayes', 'Jacmel', 'Port-de-Paix', 'Jérémie', 'Saint-Marc']
const POPULAR_TAGS = ['music', 'food', 'outdoor', 'indoor', 'family-friendly', 'nightlife', 'cultural', 'educational', 'networking', 'charity', 'vip', 'free-drinks', 'live-band', 'dj', 'art', 'dance']

export default function EventForm({ userId, event }: EventFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(event?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [ticketTiers, setTicketTiers] = useState<Array<{
    name: string
    price: string
    quantity: string
    description: string
  }>>([])
  const [showTierForm, setShowTierForm] = useState(false)

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'Concert',
    venue_name: event?.venue_name || '',
    city: event?.city || 'Port-au-Prince',
    commune: event?.commune || '',
    address: event?.address || '',
    start_datetime: event?.start_datetime ? event.start_datetime.slice(0, 16) : '',
    end_datetime: event?.end_datetime ? event.end_datetime.slice(0, 16) : '',
    ticket_price: event?.ticket_price || '',
    total_tickets: event?.total_tickets || '',
    currency: event?.currency || 'USD',
    banner_image_url: event?.banner_image_url || '',
    is_published: event?.is_published || false,
  })

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Schedule', icon: Clock },
    { number: 4, title: 'Tickets', icon: Ticket },
    { number: 5, title: 'Details', icon: Tag },
  ]

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  function addTicketTier() {
    setTicketTiers([...ticketTiers, { name: '', price: '', quantity: '', description: '' }])
    setShowTierForm(true)
  }

  function updateTicketTier(index: number, field: string, value: string) {
    const updated = [...ticketTiers]
    updated[index] = { ...updated[index], [field]: value }
    setTicketTiers(updated)
  }

  function removeTicketTier(index: number) {
    setTicketTiers(ticketTiers.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('User ID:', userId)
      
      // In demo mode, just show success message
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800)) // Simulate API call
        showToast({
          type: 'success',
          title: event?.id ? 'Event updated!' : 'Event created!',
          message: formData.is_published ? 'Your event is now live' : 'Your event has been saved as draft',
          duration: 4000
        })
        router.push('/organizer/events')
        router.refresh()
        return
      }

      const eventData = {
        organizer_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue_name: formData.venue_name,
        city: formData.city,
        commune: formData.commune,
        address: formData.address,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        ticket_price: parseFloat(formData.ticket_price.toString()),
        total_tickets: parseInt(formData.total_tickets.toString()),
        tickets_sold: event?.tickets_sold || 0,
        currency: formData.currency,
        banner_image_url: formData.banner_image_url || null,
        is_published: formData.is_published,
        tags: tags,
      }

      if (event?.id) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .single()

        if (updateError) throw updateError
        
        showToast({
          type: 'success',
          title: 'Event updated successfully!',
          message: formData.is_published ? 'Your changes are now live' : 'Event updated as draft',
          duration: 4000
        })
        
        router.push(`/organizer/events`)
      } else {
        // Create new event
        console.log('Creating event with data:', eventData)
        const { data, error: insertError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single()

        console.log('Insert result:', { data, error: insertError })
        if (insertError) throw insertError
        
        if (!data) {
          throw new Error('Event created but no data returned')
        }

        // Create ticket tiers if any
        if (ticketTiers.length > 0) {
          const tiersData = ticketTiers
            .filter(tier => tier.name && tier.price && tier.quantity)
            .map(tier => ({
              id: `tier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              event_id: data.id,
              name: tier.name,
              price: parseFloat(tier.price),
              total_quantity: parseInt(tier.quantity),
              sold_quantity: 0,
              description: tier.description || null,
              is_active: true,
              sort_order: 0,
            }))

          if (tiersData.length > 0) {
            const { error: tiersError } = await supabase
              .from('ticket_tiers')
              .insert(tiersData)
            
            if (tiersError) console.error('Error creating ticket tiers:', tiersError)
          }
        }
        
        showToast({
          type: 'success',
          title: 'Event created successfully!',
          message: formData.is_published ? 'Your event is now live and visible to attendees' : 'Event saved as draft',
          duration: 4000
        })
        
        router.push(`/organizer/events`)
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save event')
      showToast({
        type: 'error',
        title: 'Failed to save event',
        message: err.message || 'Please check your inputs and try again',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="bg-[#141414] rounded-2xl shadow-soft border border-white/10 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.number
            const isCompleted = currentStep > step.number
            
            return (
              <div key={step.number} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'border-2 border-brand-500' 
                      : isCompleted
                      ? 'bg-success-50 border-2 border-success-500'
                      : 'bg-[#0a0a0a] border-2 border-white/10 hover:border-white/15'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-brand-600 text-white' 
                      : isCompleted
                      ? 'bg-success-600 text-white'
                      : 'bg-[#242424] text-white/60'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      isActive ? 'text-brand-300' : isCompleted ? 'text-success-700' : 'text-white/50'
                    }`}>
                      Step {step.number}
                    </p>
                    <p className={`font-bold ${
                      isActive ? 'text-brand-300' : isCompleted ? 'text-success-900' : 'text-white/70'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    isCompleted ? 'bg-success-500' : 'bg-[#242424]'
                  }`}></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#141414] rounded-2xl shadow-soft border border-white/10 p-8">
        {error && (
          <div className="mb-6 bg-error-50 border-2 border-error-500 text-error-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">Basic Information</h2>
                  <p className="text-white/60">Tell us about your event</p>
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-white/70 mb-2">
                  Event Title *
                </label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Summer Music Festival 2025"
                  className="text-lg"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-white/70 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-base"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-white/70 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none"
                  placeholder="Describe your event in detail... What makes it special? What should attendees expect?"
                />
                <p className="text-sm text-white/50 mt-2">{formData.description.length} characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-brand-300" />
                  Event Banner Image
                </label>
                <ImageUpload
                  currentImage={formData.banner_image_url}
                  onImageUploaded={(url) => setFormData(prev => ({ ...prev, banner_image_url: url }))}
                />
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">Location Details</h2>
                  <p className="text-white/60">Where will your event take place?</p>
                </div>
              </div>

              <div>
                <label htmlFor="venue_name" className="block text-sm font-semibold text-white/70 mb-2">
                  Venue Name *
                </label>
                <Input
                  type="text"
                  id="venue_name"
                  name="venue_name"
                  required
                  value={formData.venue_name}
                  onChange={handleChange}
                  placeholder="e.g., National Stadium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-white/70 mb-2">
                    City *
                  </label>
                  <select
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  >
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="commune" className="block text-sm font-semibold text-white/70 mb-2">
                    Commune *
                  </label>
                  <Input
                    type="text"
                    id="commune"
                    name="commune"
                    required
                    value={formData.commune}
                    onChange={handleChange}
                    placeholder="e.g., Pétion-Ville"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-white/70 mb-2">
                  Full Address *
                </label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., 123 Rue de la République"
                />
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">Event Schedule</h2>
                  <p className="text-white/60">When will your event happen?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_datetime" className="block text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-300" />
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="start_datetime"
                    name="start_datetime"
                    required
                    value={formData.start_datetime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="end_datetime" className="block text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-300" />
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="end_datetime"
                    name="end_datetime"
                    required
                    value={formData.end_datetime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {formData.start_datetime && formData.end_datetime && (
                <div className="border-2 border-brand-500/30 rounded-xl p-4">
                  <p className="text-sm font-semibold text-brand-300 mb-2">Event Duration</p>
                  <p className="text-brand-300">
                    {(() => {
                      const start = new Date(formData.start_datetime)
                      const end = new Date(formData.end_datetime)
                      const hours = Math.abs(end.getTime() - start.getTime()) / 36e5
                      return hours < 24 
                        ? `${hours.toFixed(1)} hours` 
                        : `${(hours / 24).toFixed(1)} days`
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Tickets */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-success-700" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">Ticket Information</h2>
                  <p className="text-white/60">Set your pricing and capacity</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="currency" className="block text-sm font-semibold text-white/70 mb-2">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    required
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="HTG">HTG (G)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ticket_price" className="block text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-brand-300" />
                    Base Ticket Price *
                  </label>
                  <Input
                    type="number"
                    id="ticket_price"
                    name="ticket_price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    placeholder="0 for free"
                  />
                  {formData.ticket_price === '0' || formData.ticket_price === '' ? (
                    <Badge variant="success" size="sm" className="mt-2">Free Event</Badge>
                  ) : (
                    <p className="text-xs text-white/50 mt-2">General admission price</p>
                  )}
                </div>

                <div>
                  <label htmlFor="total_tickets" className="block text-sm font-semibold text-white/70 mb-2">
                    Total Tickets *
                  </label>
                  <Input
                    type="number"
                    id="total_tickets"
                    name="total_tickets"
                    required
                    min="1"
                    value={formData.total_tickets}
                    onChange={handleChange}
                    placeholder="e.g., 100"
                  />
                  <p className="text-xs text-white/50 mt-2">General admission tickets available</p>
                </div>
              </div>

              {/* Ticket Tiers Section */}
              <div className="border-2 border-brand-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-brand-300 mb-1 flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      Premium Ticket Tiers (Optional)
                    </h3>
                    <p className="text-sm text-brand-300">
                      Offer VIP, Early Bird, or other special ticket types with different prices
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTicketTier}
                    className="px-4 py-2 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tier
                  </button>
                </div>

                {ticketTiers.length > 0 && (
                  <div className="space-y-4 mt-4">
                    {ticketTiers.map((tier, index) => (
                      <div key={index} className="bg-[#141414] rounded-lg p-4 border-2 border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white">Tier #{index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeTicketTier(index)}
                            className="text-red-300 hover:text-red-300 font-medium text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">
                              Tier Name *
                            </label>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => updateTicketTier(index, 'name', e.target.value)}
                              placeholder="e.g., VIP, Early Bird"
                              className="w-full px-3 py-2 border-2 border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">
                              Price ({formData.currency}) *
                            </label>
                            <input
                              type="number"
                              value={tier.price}
                              onChange={(e) => updateTicketTier(index, 'price', e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border-2 border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              value={tier.quantity}
                              onChange={(e) => updateTicketTier(index, 'quantity', e.target.value)}
                              placeholder="e.g., 50"
                              min="1"
                              className="w-full px-3 py-2 border-2 border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-white/70 mb-1">
                            Description (Optional)
                          </label>
                          <input
                            type="text"
                            value={tier.description}
                            onChange={(e) => updateTicketTier(index, 'description', e.target.value)}
                            placeholder="e.g., Includes backstage access and drinks"
                            className="w-full px-3 py-2 border-2 border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ticketTiers.length === 0 && (
                  <div className="text-center py-6 text-white/50">
                    <p className="text-sm">No tiers added yet. Click &quot;Add Tier&quot; to create special ticket types.</p>
                  </div>
                )}
              </div>

              <div className="bg-[#0a0a0a] border-2 border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">How Ticket Tiers Work</h3>
                    <p className="text-sm text-white/60">
                      The base ticket is your general admission. Add tiers for premium options like VIP (higher price, special perks) or Early Bird (lower price, limited quantity). Each tier is sold separately alongside general admission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Tags & Publish */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <Tag className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">Tags & Publishing</h2>
                  <p className="text-white/60">Help people discover your event</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-3">
                  Event Tags
                </label>
                <p className="text-sm text-white/60 mb-4">
                  Add tags to help people discover your event
                </p>
                
                {/* Popular Tags */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-white/70 mb-3 uppercase tracking-wide">Popular tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!tags.includes(tag)) {
                            setTags([...tags, tag])
                          }
                        }}
                        disabled={tags.includes(tag)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                          tags.includes(tag)
                            ? 'text-brand-300 border-brand-300 cursor-not-allowed'
                            : 'bg-[#141414] text-white/70 border-white/10 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-3 mb-4">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const trimmed = tagInput.trim().toLowerCase()
                        if (trimmed && !tags.includes(trimmed)) {
                          setTags([...tags, trimmed])
                          setTagInput('')
                        }
                      }
                    }}
                    placeholder="Add custom tag (press Enter)"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = tagInput.trim().toLowerCase()
                      if (trimmed && !tags.includes(trimmed)) {
                        setTags([...tags, trimmed])
                        setTagInput('')
                      }
                    }}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-all hover:shadow-medium"
                  >
                    Add
                  </button>
                </div>

                {/* Selected Tags */}
                {tags.length > 0 && (
                  <div className="bg-[#0a0a0a] border-2 border-white/10 rounded-xl p-4">
                    <p className="text-xs font-bold text-white/70 mb-3 uppercase tracking-wide">Selected tags ({tags.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <div
                          key={tag}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-xl shadow-soft"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter(t => t !== tag))}
                            className="hover:bg-brand-700 rounded-full p-1 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-2 border-brand-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="is_published"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                    className="mt-1 h-5 w-5 text-brand-300 focus:ring-brand-500 border-white/15 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="is_published" className="block font-bold text-white mb-1 cursor-pointer">
                      Publish event immediately
                    </label>
                    <p className="text-sm text-white/60">
                      Make your event visible to the public right away. You can unpublish it later if needed.
                    </p>
                  </div>
                  {formData.is_published && (
                    <Badge variant="success" size="lg">
                      <Check className="w-4 h-4 mr-1" />
                      Will Publish
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-10 pt-6 border-t-2 border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border-2 border-white/10 rounded-xl font-semibold text-white/70 hover:border-white/15 hover:bg-[#0a0a0a] transition-all"
              >
                ← Previous
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-white/60 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all hover:shadow-medium"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-medium"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  event?.id ? 'Update Event' : 'Create Event'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
