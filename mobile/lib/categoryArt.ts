/**
 * Bundled artwork for the category system (posh-style "discover more" banners
 * and the category-page hero). One dark, moody photo per attendee-facing
 * category, compressed to ~50KB each so the whole set costs ~0.5MB in the
 * bundle. All photos are Unsplash (free license), fetched through our own
 * flyer API; photographer credits in the git history of assets/categories.
 *
 * Keys match the event docs' `category` field (see lib/categories.ts).
 */
export const CATEGORY_ART: Record<string, any> = {
  'Music': require('../assets/categories/music.jpg'),
  'Sports': require('../assets/categories/sports.jpg'),
  'Arts & Culture': require('../assets/categories/arts.jpg'),
  'Business': require('../assets/categories/business.jpg'),
  'Food & Drink': require('../assets/categories/food.jpg'),
  'Education': require('../assets/categories/education.jpg'),
  'Technology': require('../assets/categories/technology.jpg'),
  'Health & Wellness': require('../assets/categories/health.jpg'),
  'Party': require('../assets/categories/party.jpg'),
  'Religious': require('../assets/categories/religious.jpg'),
  'Other': require('../assets/categories/other.jpg'),
};

/** The categories shown in "discover more", in display order. */
export const DISCOVER_CATEGORIES = [
  'Party',
  'Music',
  'Food & Drink',
  'Arts & Culture',
  'Sports',
  'Health & Wellness',
  'Business',
  'Technology',
  'Education',
  'Religious',
] as const;

export function categoryArt(category: string | null | undefined): any {
  if (!category) return CATEGORY_ART['Other'];
  return CATEGORY_ART[category.trim()] || CATEGORY_ART['Other'];
}
