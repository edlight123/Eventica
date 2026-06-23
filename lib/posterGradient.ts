/**
 * Editorial poster gradients
 * -----------------------------------------------------------------------------
 * Gives every event a beautiful, deterministic "poster" look even when it has
 * no banner image — the signature of the public experience. A stable seed
 * (event id / title) maps to a curated gradient so the same event always looks
 * the same, while a category hint keeps the palette on-theme.
 *
 * Pure TypeScript (no React) so it can be used in both server and client
 * components and inline `style` props.
 */

export interface PosterTheme {
  /** CSS gradient for the poster background */
  bg: string
  /** A soft accent used for glows / chips on the poster */
  accent: string
  /** Whether light text reads well on this poster (always true here) */
  light: boolean
}

const THEMES: Record<string, PosterTheme> = {
  // One cohesive, on-brand family: deep teal / emerald / charcoal-teal posters.
  // Subtle variation keeps a grid of image-less events feeling premium and
  // editorial (never "rainbow"), always within the teal brand.
  teal: { bg: 'linear-gradient(155deg,#0f766e 0%,#06292c 100%)', accent: '#2dd4bf', light: true },
  mint: { bg: 'linear-gradient(155deg,#0f4f4b 0%,#1ec0a4 130%)', accent: '#5eead4', light: true },
  night: { bg: 'linear-gradient(155deg,#13322f 0%,#0a1a18 100%)', accent: '#5eead4', light: true },
  violet: { bg: 'linear-gradient(155deg,#134e4a 0%,#072420 100%)', accent: '#2dd4bf', light: true },
  sun: { bg: 'linear-gradient(155deg,#0d9488 0%,#0a3d39 100%)', accent: '#99f6e4', light: true },
  ember: { bg: 'linear-gradient(155deg,#115e59 0%,#04201d 100%)', accent: '#2dd4bf', light: true },
  gold: { bg: 'linear-gradient(155deg,#0f766e 0%,#134e4a 130%)', accent: '#5eead4', light: true },
  rose: { bg: 'linear-gradient(155deg,#0c5e57 0%,#06302c 100%)', accent: '#2dd4bf', light: true },
  ocean: { bg: 'linear-gradient(155deg,#0f5b63 0%,#07232a 100%)', accent: '#5eead4', light: true },
  forest: { bg: 'linear-gradient(155deg,#114b3f 0%,#06231c 100%)', accent: '#34d399', light: true },
}

export type PosterThemeKey = keyof typeof THEMES

/**
 * Candidate palettes per category. The seed hash chooses among the candidates,
 * so events in the same category still feel varied but cohesive.
 */
const CATEGORY_THEMES: Record<string, PosterThemeKey[]> = {
  music: ['teal', 'mint', 'violet'],
  konpa: ['teal', 'mint', 'gold'],
  party: ['night', 'violet', 'rose'],
  nightlife: ['night', 'violet', 'rose'],
  'arts & culture': ['gold', 'rose', 'violet'],
  arts: ['gold', 'rose', 'violet'],
  'food & drink': ['sun', 'ember', 'gold'],
  food: ['sun', 'ember', 'gold'],
  sports: ['ocean', 'forest', 'teal'],
  business: ['ocean', 'night', 'teal'],
  education: ['ocean', 'teal', 'forest'],
  technology: ['violet', 'ocean', 'night'],
  'health & wellness': ['mint', 'forest', 'teal'],
  community: ['sun', 'mint', 'gold'],
  religious: ['gold', 'ocean', 'violet'],
  other: ['teal', 'night', 'ocean'],
}

const ALL_KEYS = Object.keys(THEMES) as PosterThemeKey[]

/** Deterministic, stable string hash (FNV-1a style) */
function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Resolve a poster theme for an event from a stable seed and an optional
 * category hint.
 */
export function getPosterTheme(seed: string | undefined | null, category?: string | null): PosterTheme {
  const key = getPosterThemeKey(seed, category)
  return THEMES[key]
}

export function getPosterThemeKey(seed: string | undefined | null, category?: string | null): PosterThemeKey {
  const safeSeed = (seed && String(seed)) || 'tikem'
  const cat = (category || '').toLowerCase().trim()
  const candidates = CATEGORY_THEMES[cat]
  const h = hash(safeSeed)
  if (candidates && candidates.length > 0) {
    return candidates[h % candidates.length]
  }
  return ALL_KEYS[h % ALL_KEYS.length]
}

/** Just the CSS gradient string — convenient for inline styles. */
export function getPosterGradient(seed: string | undefined | null, category?: string | null): string {
  return getPosterTheme(seed, category).bg
}

/* ----------------------------------------------------------------------------
 * Social proof avatars
 * Deterministic colour stack used for "X going" avatar clusters.
 * -------------------------------------------------------------------------- */

const AVATAR_COLORS = [
  // Cohesive teal stack so "going" avatar clusters stay on-brand (no rainbow).
  '#0f766e',
  '#14b8a6',
  '#0d9488',
  '#5eead4',
  '#115e59',
  '#2dd4bf',
  '#0c5e57',
  '#99f6e4',
]

/**
 * Return up to `max` avatar colours seeded by `seed` so the same event always
 * renders the same little crowd.
 */
export function getAvatarColors(seed: string | undefined | null, count = 3, max = 4): string[] {
  const n = Math.max(0, Math.min(count, max))
  if (n === 0) return []
  const start = hash((seed && String(seed)) || 'crowd')
  return Array.from({ length: n }, (_, i) => AVATAR_COLORS[(start + i * 3) % AVATAR_COLORS.length])
}
