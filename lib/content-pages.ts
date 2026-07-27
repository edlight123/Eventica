/**
 * Content Pages — shared shape + server-side loader.
 *
 * Legal / help pages (terms, privacy, refunds, support) live in Firestore at
 * `content_pages/{slug}` so that both the web app and the mobile app can render
 * from a single source of truth. This module defines the block shape and a
 * server-side loader that reads a page with the Firebase Admin SDK.
 */

import { adminDb } from '@/lib/firebase/admin'

export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; title?: string; items?: string[]; text?: string }

export interface ContentPage {
  slug: string
  title: string
  /** Human-readable "last updated" label, e.g. "November 23, 2025". */
  updated: string
  blocks: ContentBlock[]
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

/**
 * Read a content page from Firestore by slug (the document id).
 * Returns null when the page is missing or Firestore is unavailable so callers
 * can render a graceful fallback instead of crashing.
 */
export async function getContentPage(slug: string): Promise<ContentPage | null> {
  try {
    // adminDb is `{}` when Firebase Admin isn't initialized (e.g. build phase).
    if (!adminDb || typeof adminDb.collection !== 'function') return null

    const snap = await adminDb.collection('content_pages').doc(slug).get()
    if (!snap.exists) return null

    const data = snap.data() || {}
    const rawBlocks = Array.isArray(data.blocks) ? data.blocks : []
    const blocks = rawBlocks
      .map(normalizeBlock)
      .filter((b: ContentBlock | null): b is ContentBlock => b !== null)

    return {
      slug: asString(data.slug) || slug,
      title: asString(data.title),
      updated: asString(data.updated),
      blocks,
    }
  } catch (error) {
    console.error(`Error loading content_pages/${slug}:`, error)
    return null
  }
}
