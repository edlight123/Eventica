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
  // Solid (non-gradient) badges. On the dark canvas these are low-opacity tints
  // of their semantic hue over black — never the light washes (#F0FDFA etc.)
  // that read wrong on #0A0A0A. Colors mirror the semantic scale in theme/tokens.ts.
  free: {
    background: 'rgba(20,184,166,0.16)', // teal-muted
    text: '#2DD4BF',
    border: 'rgba(20,184,166,0.32)',
  },
  soldOut: {
    background: 'rgba(248,113,113,0.16)', // red-muted
    text: '#F87171',
    border: 'rgba(248,113,113,0.32)',
  },
  lastChance: {
    background: 'rgba(252,211,77,0.16)', // amber-muted
    text: '#FCD34D',
    border: 'rgba(252,211,77,0.32)',
  },
};

export type BadgeStatus = 'VIP' | 'Trending' | 'New' | 'Free' | 'Last Chance' | 'Sold Out';
