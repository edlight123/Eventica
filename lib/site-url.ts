/**
 * The canonical public origin, used for SEO artifacts (robots, sitemap) and
 * anywhere a stable absolute URL is required.
 *
 * Deliberately NOT read from NEXT_PUBLIC_APP_URL: that variable legitimately
 * differs per environment (a preview deploy, a stale local .env), and a
 * sitemap that lists URLs on a different host than it is served from is
 * invalid per the sitemap protocol — crawlers drop every entry. Hardcoding the
 * canonical host means a misconfigured env can never silently produce a
 * useless sitemap.
 */
export const CANONICAL_SITE_URL = 'https://www.tikem.co'
