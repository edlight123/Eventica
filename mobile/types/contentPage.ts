// Shared shape for legal/help content stored in Firestore at
// `content_pages/{slug}`. This is the SINGLE SOURCE both web and mobile render,
// so the block model must stay identical across the web app, the seed script,
// and this file.

export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; title?: string; items?: string[]; text?: string };

export interface ContentPage {
  slug: string; // also the Firestore doc id, e.g. 'terms'
  title: string; // e.g. 'Terms of Service'
  updated: string; // e.g. 'November 23, 2025'
  blocks: ContentBlock[];
}

export type ContentPageSlug = 'terms' | 'privacy' | 'refunds' | 'support';
