/**
 * Editorial poster gradients — React Native port
 * -----------------------------------------------------------------------------
 * Mirrors the web's `lib/posterGradient.ts` so events look identical across
 * web, PWA and native. A stable seed (event id / title) maps to a curated
 * teal-family gradient so the same event always looks the same, while a
 * category hint keeps the palette on-theme.
 *
 * Returns colour tuples ready for `expo-linear-gradient` instead of CSS
 * strings. Never "rainbow" — one cohesive deep-teal / emerald / charcoal-teal
 * family that matches the brand.
 */

export interface PosterTheme {
  /** Gradient stops for expo-linear-gradient (top → bottom-ish) */
  colors: readonly [string, string, string]
  /** A soft accent used for glows / chips on the poster */
  accent: string
  /** Light text always reads well on these posters */
  light: boolean
}

// Each theme: [top, mid, deep] — the mid stop adds depth vs. the web 2-stop.
const THEMES = {
  teal: { colors: ['#0f766e', '#0c4a47', '#06292c'], accent: '#2dd4bf', light: true },
  mint: { colors: ['#1ec0a4', '#13746a', '#0f4f4b'], accent: '#5eead4', light: true },
  night: { colors: ['#13322f', '#0d2422', '#0a1a18'], accent: '#5eead4', light: true },
  violet: { colors: ['#134e4a', '#0d3835', '#072420'], accent: '#2dd4bf', light: true },
  sun: { colors: ['#0d9488', '#0b6760', '#0a3d39'], accent: '#99f6e4', light: true },
  ember: { colors: ['#115e59', '#0a3f3b', '#04201d'], accent: '#2dd4bf', light: true },
  gold: { colors: ['#0f766e', '#13615a', '#134e4a'], accent: '#5eead4', light: true },
  rose: { colors: ['#0c5e57', '#0a4842', '#06302c'], accent: '#2dd4bf', light: true },
  ocean: { colors: ['#0f5b63', '#0b3f47', '#07232a'], accent: '#5eead4', light: true },
  forest: { colors: ['#114b3f', '#0b372e', '#06231c'], accent: '#34d399', light: true },
} as const

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
  tech: ['violet', 'ocean', 'night'],
  'health & wellness': ['mint', 'forest', 'teal'],
  health: ['mint', 'forest', 'teal'],
  community: ['sun', 'mint', 'gold'],
  religious: ['gold', 'ocean', 'violet'],
  other: ['teal', 'night', 'ocean'],
}

const ALL_KEYS = Object.keys(THEMES) as PosterThemeKey[]

/** Deterministic, stable string hash (FNV-1a style) — identical to web. */
function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
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

/**
 * Resolve a poster theme for an event from a stable seed and an optional
 * category hint.
 */
export function getPosterTheme(seed: string | undefined | null, category?: string | null): PosterTheme {
  return THEMES[getPosterThemeKey(seed, category)]
}

/** Just the gradient colour tuple — convenient for inline LinearGradient. */
export function getPosterGradient(
  seed: string | undefined | null,
  category?: string | null,
): readonly [string, string, string] {
  return getPosterTheme(seed, category).colors
}

/* ----------------------------------------------------------------------------
 * Organizer poster-theme override
 * An organizer can optionally pin a specific poster theme on their event. When
 * a valid `theme_key` is present on the event doc it WINS over the auto choice
 * everywhere the poster/gradient is rendered. A missing/empty/invalid key falls
 * back to the deterministic auto pick (`getPosterTheme`) — identical to before.
 * -------------------------------------------------------------------------- */

/** Selectable theme keys for the organizer picker (every curated theme). */
export const POSTER_THEME_KEYS: PosterThemeKey[] = ALL_KEYS

/** Narrow an arbitrary string to a valid, non-empty PosterThemeKey. */
export function isPosterThemeKey(value: unknown): value is PosterThemeKey {
  return typeof value === 'string' && value.length > 0 && value in THEMES
}

/**
 * Resolve a poster theme for an event, honouring an organizer override.
 * When `event.theme_key` is a valid key, returns that theme; otherwise falls
 * back to the deterministic auto pick from the seed + category.
 *
 * `event` is intentionally typed `unknown` so any concrete event shape
 * (Event, OrganizerEvent, a `{ theme_key }` literal, …) can be passed without a
 * declared `theme_key`; the override is read defensively and a missing/invalid
 * value resolves to the auto pick.
 */
export function resolvePosterTheme(
  event: unknown,
  seedFallback?: string | null,
  category?: string | null,
): PosterTheme {
  const key = (event as { theme_key?: unknown } | null | undefined)?.theme_key
  if (isPosterThemeKey(key)) return THEMES[key]
  return getPosterTheme(seedFallback, category)
}

/** Gradient colour tuple for an event, honouring an organizer override. */
export function resolvePosterColors(
  event: unknown,
  seedFallback?: string | null,
  category?: string | null,
): readonly [string, string, string] {
  return resolvePosterTheme(event, seedFallback, category).colors
}

/* ----------------------------------------------------------------------------
 * Social proof avatars
 * Deterministic teal colour stack used for "X going" avatar clusters so the
 * little crowd stays on-brand (never rainbow).
 * -------------------------------------------------------------------------- */

const AVATAR_COLORS = [
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
export function getAvatarColors(seed: string | undefined | null, max = 4): string[] {
  const h = hash((seed && String(seed)) || 'tikem')
  const out: string[] = []
  for (let i = 0; i < max; i++) {
    out.push(AVATAR_COLORS[(h + i * 3) % AVATAR_COLORS.length])
  }
  return out
}
