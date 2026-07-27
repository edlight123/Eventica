// Shared shape for legal/help content stored in Firestore at
// `content_pages/{slug}`. This is the SINGLE SOURCE both web and mobile render,
// so the block model must stay identical across the web app, the seed script,
// and this file.

export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; title?: string; items?: string[]; text?: string };

// One language's rendering of a page.
export interface LocalizedContent {
  title: string;
  updated: string;
  blocks: ContentBlock[];
  // Support only: the localized role labels used to prefix category headings
  // ("<attendee> — <category>"), so the Attendee/Organizer filter works in any
  // language.
  roleLabels?: { attendee: string; organizer: string };
  // Legal pages: true when this language is a machine-translated draft pending
  // review (surfaced with a small note in the UI).
  draft?: boolean;
}

// The Firestore doc: a per-language map. `en` is always present and is the
// fallback when the user's language is missing.
export interface ContentPageDoc {
  slug: string;
  translations: Record<string, LocalizedContent>;
}

// Legacy single-language shape (pre-i18n) — the doc itself was the content.
// Kept so the reader can transparently handle docs seeded before translations.
export interface ContentPage extends LocalizedContent {
  slug: string;
}

export type ContentPageSlug = 'terms' | 'privacy' | 'refunds' | 'support';

/**
 * Resolve the content for a language from a Firestore doc that may be in either
 * the new (`translations`) or the legacy (flat) shape. Falls back to English,
 * then to whatever language is available.
 */
export function resolveLocalizedContent(
  data: any,
  language: string,
): LocalizedContent | null {
  if (!data) return null;
  if (data.translations && typeof data.translations === 'object') {
    const tr = data.translations as Record<string, LocalizedContent>;
    return tr[language] || tr.en || tr[Object.keys(tr)[0]] || null;
  }
  // Legacy flat doc.
  if (Array.isArray(data.blocks)) {
    return { title: data.title, updated: data.updated, blocks: data.blocks };
  }
  return null;
}
