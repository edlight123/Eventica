---
name: tikèm — Editorial Dark
colors:
  # Canvas (dark-first)
  bg: '#0A0A0A'                 # app background / canvas
  surface: '#161616'            # cards, raised content
  surface-raised: '#1F1F1F'     # pressed/elevated surfaces, sheets
  surface-muted: '#101012'      # nested inputs / subtle wells
  border: '#262626'             # hairline structure
  border-subtle: '#1C1C1F'      # faint inner dividers
  # Text
  on-surface: '#FFFFFF'         # primary text
  on-surface-variant: '#A3A3A3' # secondary / metadata
  on-surface-faint: '#6B6B6B'   # tertiary / disabled
  # Accent — teal, used sparingly (price, primary CTA, active state, links)
  primary: '#14B8A6'            # teal-500, the single brand accent
  primary-bright: '#2DD4BF'     # teal-400, hover / active highlight
  primary-muted: 'rgba(20,184,166,0.14)'  # chip fills / selected wells
  on-primary: '#04211E'         # dark text/icon on a solid teal surface
  # Functional (high-saturation, sparing)
  success: '#34D399'
  warning: '#FCD34D'
  error: '#F87171'
typography:
  # Display — editorial serif, italic. Wordmark, hero headlines, event titles.
  display-lg:
    fontFamily: Instrument Serif
    fontStyle: italic
    fontSize: clamp(40px, 6vw, 68px)
    lineHeight: 0.95
    letterSpacing: -0.01em
  title-serif:
    fontFamily: Instrument Serif
    fontStyle: italic
    fontSize: 24px
    lineHeight: 1.05
  # UI — geometric grotesk. Buttons, nav, dense interface text.
  title-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  # Technical layer — monospace. Metadata, dates, prices-as-data, IDs, eyebrows.
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
    textTransform: uppercase
  meta-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  none: 0px        # photography / event imagery — always sharp, full-bleed
  sm: 8px          # chips, small controls
  md: 12px         # buttons, inputs, compact cards
  lg: 16px         # content cards, sheets
  xl: 20px         # large surfaces, modals
  full: 9999px     # pills, avatars, search utilities
spacing:
  unit: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 40]
  screen-margin-mobile: 16px
  gutter: 24px
  section-gap: 32px
  container-max: 1152px   # max-w-6xl
---

## Brand & Style

tikèm is an **editorial-dark** events platform for Haiti — premium, nightlife-forward,
image-first. The aesthetic borrows the **extreme minimalism and high-contrast
authority** of fashion/editorial design, but renders it on a **dark canvas** so that
event flyers and artist photography glow rather than compete with a bright page.

The interface recedes. Three things carry the brand: a **near-black canvas**, a
**single teal accent** used with discipline, and a deliberate **three-voice type
system** (serif for soul, grotesk for utility, monospace for data). Surfaces are
flat — depth comes from tonal layering and 1px hairlines, never drop shadows.

This is the inverse of a generic light SaaS theme by design: for a Saturday-night
audience, the dark canvas is what reads as exclusive and lets the imagery be the hero.

## Colors

A restrained, near-monochrome palette over a deep-black canvas, with teal as the
**only** brand color. Color is a tool of emphasis, not decoration.

- **Canvas `#0A0A0A`** — the app background. Everything sits on black.
- **Surfaces `#161616` / `#1F1F1F`** — tonal "surface-on-surface" layering for cards,
  sheets and raised states. No gradients, no fills brighter than the canvas family.
- **Hairlines `#262626`** — 1px borders define structure where a tonal step isn't enough.
- **Text** — `#FFFFFF` primary, `#A3A3A3` secondary/metadata, `#6B6B6B` tertiary/disabled.
- **Teal `#14B8A6`** (bright `#2DD4BF`) — reserved for the things that matter:
  **price, the primary CTA, active/selected state, and links.** If teal is on screen
  three times, two of them are probably wrong. Let black, white and photography do the work.
- **Functional** — success/warning/error are high-saturation and used only for status,
  never as surfaces.

## Typography — the three voices

The type system is what makes tikèm feel "editorial-tech." Each voice has one job.

- **Serif — Instrument Serif (italic).** The brand's soul. Used for the wordmark,
  hero headlines, and **event titles**. It gives a magazine, hand-set character that a
  grotesk can't. Always lowercase/sentence-case, never all-caps.
- **Grotesk — Space Grotesk.** The workhorse. Buttons, navigation, tabs, dense UI,
  body copy in the interface. Neutral, geometric, legible.
- **Monospace — JetBrains Mono.** The **technical layer**. This is the signature move:
  dates, times, locations, **prices-as-data**, ticket IDs, counts, and **all-caps
  section eyebrows** are set in mono. It introduces a subtle "utility/terminal" texture
  that reads as precise and premium. Keep it small, tracked-out, and usually uppercase.

Rule of thumb per surface: **serif names it, grotesk operates it, mono measures it.**

## Layout & Spacing

- **Base-4 rhythm.** All spacing is a multiple of 4 (4/8/12/16/20/24/32/40).
- **Tight inside, generous between.** Group related elements with small internal spacing
  (12–16) and separate major sections with expansive whitespace (`section-gap` 32+).
- **Desktop:** centered `max-w-6xl` (1152px), 24px gutters.
- **Mobile:** 16px side margins, fluid; lists pad their bottom by `+ safe-area inset`
  so the last row clears the tab bar / home indicator.

## Elevation & Depth

No drop shadows on content. Depth is tonal:

- **Surface-on-surface** — step up from `#0A0A0A` → `#161616` → `#1F1F1F`.
- **Hairlines** — 1px `#262626` borders define cards, rows and inputs.
- **Shadows** are allowed in exactly two places: elements floating over media/photography,
  and an optional soft teal glow on the single primary CTA. Never on flat cards.

## Shapes

- **Imagery is always sharp — 0px radius, full-bleed.** Event posters, flyers and hero
  photography are the heroes of the system; never round them. Aspect ratios are **4:5**
  (posters) or **1:1**.
- **UI is softly rounded.** Cards/sheets `16px`, buttons/inputs `12px`, chips `8px`,
  pills/search/avatars `full`. This softens the high-contrast palette without losing structure.

## Components

- **Buttons** — Primary: solid teal `#14B8A6`, dark `on-primary` label, 12px radius,
  ~48px tall, optional soft teal glow. Secondary: 1px hairline border, transparent fill,
  white label. On web, hover may "flash" (invert to solid). Disabled: reduced opacity.
- **Inputs** — transparent/`surface-muted` fill, 1px hairline, white text,
  `#6B6B6B` placeholder, teal caret/selection. Labels above the field in **mono, all-caps**.
- **Cards** — flat dark surface (`#161616`) with a 1px hairline or a tonal step; no shadow;
  16px radius; sharp full-bleed image at the top.
- **Chips / Badges** — small high-contrast pills (full radius). Status (Sold Out, Limited,
  VIP, NEW) in mono, all-caps; selected state uses teal or teal-muted.
- **Lists** — clean rows divided by 1px hairlines. Primary text in serif/grotesk;
  right-hand metadata (price, time, count) in **mono**.
- **Event thumbnails** — the hero element. 4:5 or 1:1, sharp corners, full-bleed,
  high quality. Title in italic serif beneath; meta line in mono.
- **Eyebrows / section labels** — JetBrains Mono, uppercase, tracked `+0.08em`,
  `#A3A3A3` or teal for active.
