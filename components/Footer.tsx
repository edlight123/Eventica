'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { TikemWordmark } from '@/components/ui/TikemLogo'

interface FooterLink {
  href: string
  label: string
}

/**
 * Site footer for public routes. Dark, POSH-styled: near-black canvas, hairline
 * top border, muted text, teal reserved for a sparing hover accent. Rendered
 * once from the root layout; it hides itself on the admin surface (which has its
 * own chrome) so it never double-renders there.
 */
export default function Footer() {
  const pathname = usePathname()
  const { t } = useTranslation('common')

  // Admin has its own shell (AdminSidebar) — keep the public footer out of it.
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const year = new Date().getFullYear()

  const discoverLinks: FooterLink[] = [
    { href: '/discover', label: t('nav.home', { defaultValue: 'Events' }) },
    { href: '/resources', label: t('nav.resources', { defaultValue: 'Guides' }) },
    { href: '/platform', label: t('nav.platform', { defaultValue: 'Platform' }) },
  ]

  const companyLinks: FooterLink[] = [
    { href: '/support', label: t('footer.support', { defaultValue: 'Support' }) },
    { href: '/legal/privacy', label: t('footer.privacy', { defaultValue: 'Privacy' }) },
    { href: '/legal/terms', label: t('footer.terms', { defaultValue: 'Terms' }) },
    { href: '/legal/refunds', label: t('footer.refunds', { defaultValue: 'Refunds' }) },
  ]

  const linkClass =
    'text-sm text-white/60 transition-colors duration-200 hover:text-brand-300'

  return (
    <footer
      aria-label={t('footer.landmark', { defaultValue: 'Site footer' })}
      className="border-t border-white/10 bg-[#0a0a0a]"
    >
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-12 sm:px-6 md:pb-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand + tagline + the diaspora, written into the identity */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center">
              <TikemWordmark className="text-[28px] text-white" />
            </Link>
            <p className="mt-3 font-display lowercase italic text-[17px] text-white/60">
              {t('footer.tagline_short', { defaultValue: 'where Haiti goes out.' })}
            </p>
            <p className="mt-4 max-w-sm text-[11px] font-medium uppercase tracking-[0.16em] leading-relaxed text-white/35">
              Port-au-Prince · Cap-Haïtien · Miami · New York · Montréal · Paris
            </p>
          </div>

          {/* Discover column */}
          <nav aria-label={t('footer.discover', { defaultValue: 'Discover' })}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {t('footer.discover', { defaultValue: 'Discover' })}
            </h2>
            <ul className="mt-4 space-y-3">
              {discoverLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company / legal column */}
          <nav aria-label={t('footer.company', { defaultValue: 'Company' })}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {t('footer.company', { defaultValue: 'Company' })}
            </h2>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom row */}
        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs text-white/40">
            {t('footer.copyright', { year, defaultValue: '© {{year}} Tikèm' })}
          </p>
        </div>
      </div>
    </footer>
  )
}
