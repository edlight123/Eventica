/**
 * Badge theme configuration matching the web design system.
 * De-rainbowed: VIP / Trending / New all live in the brand teal family so a
 * grid of badges feels premium and cohesive (never rainbow). Semantic red /
 * amber are kept only where they carry meaning (sold out / last chance).
 */

export const BADGE_COLORS = {
  vip: {
    gradient: ['#115E59', '#042F2C'] as const, // deep premium teal
    text: '#FFFFFF',
    shadow: 'rgba(17, 94, 89, 0.35)',
  },
  trending: {
    gradient: ['#14B8A6', '#0D9488'] as const, // bright teal
    text: '#FFFFFF',
    shadow: 'rgba(13, 148, 136, 0.32)',
  },
  new: {
    gradient: ['#2DD4BF', '#14B8A6'] as const, // mint → teal
    text: '#053B36',
    shadow: 'rgba(45, 212, 191, 0.32)',
  },
  free: {
    background: '#F0FDFA',
    text: '#0F766E',
    border: '#99F6E4',
  },
  soldOut: {
    background: '#FEF2F2',
    text: '#DC2626',
    border: '#FECACA',
  },
  lastChance: {
    background: '#FFFBEB',
    text: '#D97706',
    border: '#FDE68A',
  },
};

export type BadgeStatus = 'VIP' | 'Trending' | 'New' | 'Free' | 'Last Chance' | 'Sold Out';
