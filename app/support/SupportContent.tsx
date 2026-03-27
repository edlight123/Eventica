'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Search, Mail, MessageCircle, ChevronDown, ChevronUp, ExternalLink, Ticket, CalendarDays, FileText } from 'lucide-react'
import { attendeeFAQCategoryMeta, organizerFAQCategoryMeta, type UserRole, type FAQCategory, type FAQItem } from './faqData'

export default function SupportContent() {
  const { t } = useTranslation('support')
  const [role, setRole] = useState<UserRole>('attendee')
  const [searchQuery, setSearchQuery] = useState('')
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set())

  const categoryMeta = role === 'attendee' ? attendeeFAQCategoryMeta : organizerFAQCategoryMeta

  const currentFAQs: FAQCategory[] = useMemo(() => {
    return categoryMeta
      .map(({ id, icon }) => {
        const faqsRaw = t(`faq.${role}.categories.${id}.faqs`, { returnObjects: true })
        const faqs: FAQItem[] = Array.isArray(faqsRaw)
          ? (faqsRaw as FAQItem[]).filter((item) => Boolean(item?.question) && Boolean(item?.answer))
          : []

        return {
          id,
          icon,
          title: t(`faq.${role}.categories.${id}.title`),
          description: t(`faq.${role}.categories.${id}.description`),
          faqs
        }
      })
      .filter((category) => category.faqs.length > 0)
  }, [categoryMeta, role, t])

  // Filter FAQs based on search query
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return currentFAQs

    const query = searchQuery.toLowerCase()
    return currentFAQs
      .map((category) => ({
        ...category,
        faqs: category.faqs.filter(
          (faq) => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)
        )
      }))
      .filter((category) => category.faqs.length > 0)
  }, [currentFAQs, searchQuery])

  const toggleFAQ = (categoryId: string, faqIndex: number) => {
    const key = `${categoryId}-${faqIndex}`
    const newOpen = new Set(openFAQs)
    if (newOpen.has(key)) {
      newOpen.delete(key)
    } else {
      newOpen.add(key)
    }
    setOpenFAQs(newOpen)
  }

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
              <MessageCircle className="w-4 h-4 text-white/90" />
              <span>{t('hero.title')}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
              {t('hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-purple-100 mb-8">
              {t('hero.subtitle')}
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-0 shadow-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role Toggle */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setRole('attendee')
                setSearchQuery('')
                setOpenFAQs(new Set())
              }}
              className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
                role === 'attendee'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {t('role_toggle.attendee')}
              </span>
            </button>
            <button
              onClick={() => {
                setRole('organizer')
                setSearchQuery('')
                setOpenFAQs(new Set())
              }}
              className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
                role === 'organizer'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {t('role_toggle.organizer')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Help Topics Grid */}
        {!searchQuery && (
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('categories.title', 'Top Help Topics')}
            </h2>
            <p className="text-gray-600 mb-8">
              {t('categories.subtitle', 'Browse by category or search for specific questions')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentFAQs.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-3">
                    <category.icon className="w-5 h-5 text-purple-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Sections */}
        <div className="space-y-12">
          {searchQuery && filteredFAQs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white border border-gray-200 shadow-soft flex items-center justify-center">
                <Search className="w-7 h-7 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('search.no_results')}
              </h3>
              <p className="text-gray-600">
                {t('search.no_results_desc')}
              </p>
            </div>
          )}

          {filteredFAQs.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {category.title}
                  </h2>
                  <p className="text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                {category.faqs.map((faq, index) => {
                  const key = `${category.id}-${index}`
                  const isOpen = openFAQs.has(key)

                  return (
                    <div key={index}>
                      <button
                        onClick={() => toggleFAQ(category.id, index)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help Section */}
        <div className="mt-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              {t('need_help.title')}
            </h2>
            <p className="text-gray-700">
              {t('need_help.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Email Support */}
            <a
              href="mailto:support@joineventica.com"
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <Mail className="w-6 h-6 text-purple-600" />
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('contact_cards.email_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('contact_cards.email_desc')}
              </p>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/50938675309"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('contact_cards.whatsapp_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('contact_cards.whatsapp_desc')}
              </p>
            </a>

            {/* Submit a Request */}
            <Link
              href="/support/request"
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('contact_cards.request_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('contact_cards.request_desc')}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
