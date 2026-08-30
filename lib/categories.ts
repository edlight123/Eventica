// The cultural taxonomy — Tikèm's own map of how Haiti goes out.
//
// Stored event categories stay canonical English (lib/filters/config.ts
// CATEGORIES) so Firestore data, mobile, and the filter engine are untouched.
// These eight Kreyòl "worlds" are a DISPLAY grouping over them: each tile
// links into the existing filter engine with a multi-category URL
// (?category=Theater&category=Festival), which parseFiltersFromURL already
// understands. Spec: docs/superpowers/specs/2026-08-30-cultural-taxonomy-and-picks.md

export interface CulturalCategory {
  /** Stable slug. */
  key: string
  /** Kreyòl display label — set lowercase, the editorial voice. */
  label: string
  /** Quiet descriptor line under the label. */
  sublabel: string
  /** Canonical stored categories this world covers. */
  categories: string[]
  /** Tile gradient stops — each world carries its own hue (the color is
      plural, like the artwork; never the brand teal, which stays semantic). */
  from: string
  to: string
}

export const CULTURAL_CATEGORIES: CulturalCategory[] = [
  {
    key: 'mizik',
    label: 'mizik',
    sublabel: 'konpa · rabòday · DJs · live',
    categories: ['Concert'],
    from: '#7c3aed',
    to: '#2e1065',
  },
  {
    key: 'lavi-lannwit',
    label: 'lavi lannwit',
    sublabel: 'parties · clubs · lounges',
    categories: ['Party'],
    from: '#e11d48',
    to: '#4c0519',
  },
  {
    key: 'kilti',
    label: 'kilti',
    sublabel: 'art · theater · festivals · heritage',
    categories: ['Theater', 'Festival'],
    from: '#d97706',
    to: '#451a03',
  },
  {
    key: 'espo',
    label: 'espò',
    sublabel: 'football · basketball · tournaments',
    categories: ['Sports'],
    from: '#059669',
    to: '#022c22',
  },
  {
    key: 'gastronomi',
    label: 'gastronomi',
    sublabel: 'food festivals · tastings · brunch',
    categories: ['Food & Drink'],
    from: '#ea580c',
    to: '#431407',
  },
  {
    key: 'biznis',
    label: 'biznis',
    sublabel: 'conferences · networking · workshops',
    categories: ['Conference', 'Workshop'],
    from: '#4f46e5',
    to: '#1e1b4b',
  },
  {
    key: 'fanmi',
    label: 'fanmi',
    sublabel: 'family · kids · community',
    categories: ['Family'],
    from: '#db2777',
    to: '#500724',
  },
  {
    key: 'eksperyans',
    label: 'eksperyans',
    sublabel: 'beach · outdoor · getaways',
    categories: ['Other'],
    from: '#0284c7',
    to: '#082f49',
  },
]

/** Filter URL for a cultural world — multiple ?category= params, one per
    canonical category it covers. */
export function culturalCategoryHref(cat: CulturalCategory, basePath = '/'): string {
  const qs = cat.categories.map((c) => `category=${encodeURIComponent(c)}`).join('&')
  return `${basePath}?${qs}`
}

/** The cultural world a canonical (or raw) category belongs to. */
export function culturalCategoryFor(canonical: string): CulturalCategory {
  return (
    CULTURAL_CATEGORIES.find((c) => c.categories.includes(canonical)) ||
    CULTURAL_CATEGORIES[CULTURAL_CATEGORIES.length - 1]
  )
}
