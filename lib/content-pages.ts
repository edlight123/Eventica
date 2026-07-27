/**
 * Content Pages — shared shape + server-side loader.
 *
 * Legal / help pages (terms, privacy, refunds, support) live in Firestore at
 * `content_pages/{slug}` so that both the web app and the mobile app can render
 * from a single source of truth. This module defines the block shape and a
 * server-side loader that reads a page with the Firebase Admin SDK.
 *
 * The document is PER-LANGUAGE:
 *   content_pages/{slug} = { slug, translations: { en, fr, ht } }
 *   LocalizedContent      = { title, updated, blocks, roleLabels?, draft? }
 *
 * A legacy flat shape (`{ title, updated, blocks }` at the top level, no
 * `translations`) is still supported for backward compatibility.
 */

import { adminDb } from '@/lib/firebase/admin'

export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; title?: string; items?: string[]; text?: string }

/** Locales the app ships translations for. */
export type Locale = 'en' | 'fr' | 'ht'

const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'fr', 'ht']

/** The localized body of a content page (one language). */
export interface LocalizedContent {
  title: string
  /** Human-readable "last updated" label, e.g. "November 23, 2025". */
  updated: string
  blocks: ContentBlock[]
  /** Optional per-role display labels (used by the mobile app). */
  roleLabels?: Record<string, string>
  /** When true, this translation is a work-in-progress; English is the reference. */
  draft?: boolean
}

/**
 * The resolved page a caller renders: the slug plus the chosen locale's content.
 * Shape stays compatible with the previous `ContentPage` so the render layer
 * (`ContentPageView`) keeps reading `title` / `updated` / `blocks` unchanged.
 */
export interface ContentPage extends LocalizedContent {
  slug: string
}

/** Coerce/validate an arbitrary value into a supported locale, defaulting to 'en'. */
export function resolveLocale(value: unknown): Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : 'en'
}

/** Coerce an unknown value into a trimmed string (empty string when absent). */
function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

/** Coerce an unknown value into an array of non-empty strings. */
function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(asString).filter((s) => s.length > 0)
}

/**
 * Validate/normalize a single raw block into a known ContentBlock, or null if
 * it can't be understood. Keeps rendering safe even if a doc has a stray field.
 */
function normalizeBlock(raw: unknown): ContentBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>

  switch (b.type) {
    case 'heading': {
      const level = b.level === 3 ? 3 : 2
      return { type: 'heading', level, text: asString(b.text) }
    }
    case 'paragraph':
      return { type: 'paragraph', text: asString(b.text) }
    case 'list': {
      const items = asStringList(b.items)
      if (items.length === 0) return null
      return { type: 'list', ordered: b.ordered === true, items }
    }
    case 'callout': {
      const title = asString(b.title)
      const text = asString(b.text)
      const items = asStringList(b.items)
      return {
        type: 'callout',
        ...(title ? { title } : {}),
        ...(items.length ? { items } : {}),
        ...(text ? { text } : {}),
      }
    }
    default:
      return null
  }
}

/** Optional map of string->string labels (e.g. `roleLabels`), or undefined. */
function asStringMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const s = asString(v)
    if (s) out[k] = s
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Normalize a raw localized-content object into a safe LocalizedContent. */
function normalizeLocalized(raw: unknown): LocalizedContent {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawBlocks = Array.isArray(data.blocks) ? data.blocks : []
  const blocks = rawBlocks
    .map(normalizeBlock)
    .filter((b: ContentBlock | null): b is ContentBlock => b !== null)

  const roleLabels = asStringMap(data.roleLabels)

  return {
    title: asString(data.title),
    updated: asString(data.updated),
    blocks,
    ...(roleLabels ? { roleLabels } : {}),
    ...(data.draft === true ? { draft: true } : {}),
  }
}

/**
 * Pick the best localized content out of a per-language `translations` map:
 * the requested locale, else English, else the first available translation.
 * Returns null when there is no usable translation at all.
 */
function pickTranslation(
  translations: Record<string, unknown>,
  locale: Locale,
): LocalizedContent | null {
  const chosen =
    translations[locale] ??
    translations.en ??
    Object.values(translations).find((t) => t && typeof t === 'object')

  if (!chosen || typeof chosen !== 'object') return null
  return normalizeLocalized(chosen)
}

/**
 * Read a content page from Firestore by slug (the document id) and return the
 * content for `locale`, falling back to English and then to any available
 * translation. Backward-compatible with the legacy flat document shape.
 *
 * Returns null when the page is missing, has no usable translation, or
 * Firestore is unavailable so callers can render a graceful fallback instead
 * of crashing.
 */
export async function getContentPage(
  slug: string,
  locale: Locale = 'en',
): Promise<ContentPage | null> {
  try {
    // adminDb is `{}` when Firebase Admin isn't initialized (e.g. build phase).
    if (!adminDb || typeof adminDb.collection !== 'function') return null

    const snap = await adminDb.collection('content_pages').doc(slug).get()
    if (!snap.exists) return null

    const data = snap.data() || {}
    const resolvedSlug = asString(data.slug) || slug

    // New per-language shape: { slug, translations: { en, fr, ht } }.
    if (data.translations && typeof data.translations === 'object') {
      const content = pickTranslation(data.translations as Record<string, unknown>, locale)
      if (!content) return null
      return { slug: resolvedSlug, ...content }
    }

    // Legacy flat shape: treat the document itself as the content.
    return { slug: resolvedSlug, ...normalizeLocalized(data) }
  } catch (error) {
    console.error(`Error loading content_pages/${slug}:`, error)
    return null
  }
}
