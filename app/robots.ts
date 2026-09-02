import type { MetadataRoute } from 'next'
import { CANONICAL_SITE_URL as siteUrl } from '@/lib/site-url'


/**
 * Crawl rules. Everything a visitor can reach without an account is open;
 * every authenticated surface, checkout step and API route is closed — those
 * pages are per-user or transactional, so indexing them wastes crawl budget
 * and can surface someone's order flow in search results.
 *
 * Guide documents under /guides/* are intentionally crawlable: they are
 * marketing collateral we WANT discovered.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/organizer',
          '/staff',
          '/scan',
          '/settings',
          '/dashboard',
          '/profile',
          '/tickets',
          '/purchase',
          '/promoter',
          '/connections',
          '/notifications',
          '/favorites',
          '/auth',
          '/invite',
          '/test-notifications',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
