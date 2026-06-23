/**
 * tikèm design tokens — the single source of truth for the app's visual system.
 *
 * Rules:
 * - The canvas and all cards are DARK. Teal is an *accent only* (CTAs, active
 *   states, price, links, small highlights) — never full-bleed header blocks.
 * - New / refactored components consume these tokens directly. The semantic
 *   palette in `config/brand.ts` (`useTheme().colors`) is derived from these
 *   same values so existing screens stay in sync automatically.
 */

export const colors = {
  // Canvas
  bg: '#0A0A0A', // near-black app background
  surface: '#161616', // cards
  surfaceRaised: '#1F1F1F', // pressed / elevated cards, sheets
  border: '#262626',

  // Teal accent scale (THE platform color)
  teal: '#14B8A6', // primary — CTAs, active states, price, links
  tealBright: '#2DD4BF', // hover / pressed / active highlight
  tealMuted: 'rgba(20,184,166,0.14)', // chip fills, subtle backgrounds
  onTeal: '#04211E', // dark text / icon placed ON a solid teal button

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#6B6B6B',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  display: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  // lowercase "for you" style section labels
  sectionEyebrow: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;

export const tokens = { colors, radius, spacing, type };
export default tokens;
