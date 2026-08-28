# Tikèm web design system — "the poster lights the room"

**Date:** 2026-08-28
**Status:** Draft — awaiting owner review
**Scope:** the public website (homepage, discover, event pages, footer). The organizer
console, admin (Control Room), and checkout keep their existing systems.
**Source of truth:** this is a desktop-scale port of `mobile/theme/tokens.ts` (the POSH
direction), not a new invention. Where this doc and the mobile tokens disagree, the
mobile tokens win and this doc gets fixed.

## 0. The one-line thesis

Tikèm is the dark room; the organizers' posters are the light. Every design decision
either keeps the room dark and disciplined, or lets a poster shine.

What this is NOT: an Eventbrite-style admin tool (light, gray, 16:9 banners), and not
the generic "black site with one neon accent" — Tikèm's color is plural and alive
because it comes from the artwork, never from decoration.

## 1. Color

Depth is a brightness step, never a border (POSH §1).

| Token | Value | Use |
|---|---|---|
| `bg` | `#0A0A0A` | the canvas — every public page paints this |
| `surface` | `#161616` | cards, sheets (lowest step) |
| `surface-raised` | `#1F1F1F` | hover/pressed, stat blocks |
| `border` | `#262626` | rare hairline dividers only — not box outlines |
| `accent` (teal) | `#14B8A6` | SEMANTIC only: price, live, verified, active, focus |
| `accent-bright` | `#2DD4BF` | hover state of semantic teal |
| `accent-muted` | `rgba(20,184,166,.14)` | chip fills behind semantic teal text |
| `text` | `#FFFFFF` / `#A3A3A3` / `#6B6B6B` | primary / secondary / tertiary |
| status | amber `#FCD34D` · red `#F87171` · emerald `#34D399` · gold `#E6C067` | locked meanings (pending / error·sold-out / success / verified-alt) — one color never means two things |

**The rule that keeps this premium:** teal never appears as a decorative fill, a big
header block, or a gradient. If a teal element were gray, would the screen lose
*meaning*? If not, it shouldn't be teal.

**Where the color actually comes from — the signature (§6):** event artwork. Cards and
heroes extract the poster's dominant color and radiate it as a soft glow into the black
canvas. A page full of different events is colorful; a page with no events is calm.
Tailwind already carries the `brand` scale; map these tokens onto it rather than adding
a parallel palette.

## 2. Typography — three voices (all already loaded in `app/layout.tsx`)

| Voice | Face | Job | Rules |
|---|---|---|---|
| **Poster** | Space Grotesk 700 | hero headline, big numbers, event titles ≥ card size | tracking `-0.02em`, tight leading (1.02 in hero), uppercase in the hero ONLY |
| **Editorial** | Instrument Serif italic 400 | section eyebrows and rails ("this weekend", "pou ou"), pull-quotes | always lowercase, `~22px` at rail level — this is the existing `SectionHeader` convention, now enforced everywhere public |
| **UI** | Inter | body, metadata, buttons, forms | sentence case; buttons 600 |
| Identifiers | JetBrains Mono 500 | ticket codes, order refs, promoter codes ONLY | never dates, venues, or prices (2026-08-09 decision) |

Scale (desktop → mobile via `clamp`):
- Hero display: `clamp(44px, 9vw, 104px)`, two stacked lines
- Page title: 40/32 · Rail eyebrow (serif): 22 · Card title: 17/600 · Body: 15 · Meta: 13 · Caption: 12

The hero pairs the poster voice with one serif line — that contrast (heavy grotesk vs
lowercase serif) IS the brand's typographic identity: street energy + editorial soul.

## 3. Shape, spacing, elevation

- Radii from the mobile scale: artwork `4px` ("not fully sharp"), chips `10`, inputs/cards `12–16`, buttons `14`. **No stadium pills on wide elements** (the de-pill decision); `999` only for true circles (avatars, dots).
- Spacing on an 8px grid; sections breathe: `96–128px` between homepage sections on desktop, `56` on mobile. Premium is measured in whitespace, not effects.
- Elevation = brightness + glow, never drop-shadow-gray. Card hover: `translateY(-4px)`, image `scale(1.03)`, poster-glow intensifies. 180ms ease-out. `prefers-reduced-motion` kills all of it.
- Primary CTA: the **white pill button** (white fill, black text) — mobile's `WhitePillCTA`, radius 14. Teal is never the buy button; white reads premium against the dark room and never fights a poster.
- **Quiet buttons (posh calibration, 2026-08-28).** Buttons whisper: `font-medium`
  (500) on the white pill, `font-normal` on ghosts and chips — never 600+; 13–14px
  type; compact padding (`px-4–6 py-2–2.5`, taps keep 44px min-height); ONE white
  pill per screen, everything else bare text or a `white/12` hairline; hover changes
  color, not position (no translate/shadow theatrics). What makes posh's buttons
  premium is restraint, not chrome.

## 4. The event card (the most important component)

Portrait **4:5 artwork** — Haitian event flyers are Instagram-native portrait art, and
4:5 is how they were designed to be seen. (Deliberate break from the critique's 16:9:
wide crops decapitate flyers; portrait grids read like a wall of posters — which is the
point.)

```
┌──────────────┐
│              │  ← poster 4:5, radius 4, dominant-color glow
│   [poster]   │     date chip top-left: "SAM 22 OUT" on #0A0A0Acc
│              │
└──────────────┘
  Lakou Arts              ← 17/600 grotesk, 1 line, ellipsis
  Musée du Panthéon · PAP ← 13 secondary
  From 500 HTG            ← 13/600 teal (price is semantic)
  ● 87 going              ← 12 tertiary + tiny avatar stack when friends exist
```

Nothing else. No category badge on the card face (the rail already says the category),
no borders, no gradient overlays on the artwork itself.

## 5. Homepage anatomy (the first build)

```
┌────────────────────────────────────────────────┐
│ navbar (flush, one band)                       │
│                                                │
│   [ambient poster collage, dark scrim]        │
│   WHERE HAITI                                  │
│   GOES OUT.                ← grotesk, 2 lines  │
│   concerts, parties, festivals — in Haiti      │
│   and the diaspora         ← serif lowercase   │
│   [ search events, artists, venues        🔍 ] │
│   PAP · Cap-Haïtien · Miami · New York ·       │
│   Montréal · Paris         ← city chips        │
├────────────────────────────────────────────────┤
│ tonight                    ← serif eyebrow     │
│ [card][card][card][card] → horizontal rail     │
│                                                │
│ this weekend                                   │
│ [card][card][card][card] →                     │
│                                                │
│ in the diaspora                                │
│ [card][card][card][card] →                     │
│                                                │
│ all events                                     │
│ [ poster grid, 4 cols → 2 cols mobile ]        │
├────────────────────────────────────────────────┤
│ footer: tikèm — where Haiti goes out.          │
│ PAP · Miami · New York · Montréal · Paris      │
│ discover / organizers / company columns        │
└────────────────────────────────────────────────┘
```

- The hero collage is built from real event artwork already on the platform (top
  upcoming events), heavily scrimmed (`#0A0A0A` 75–85%) so the type owns the frame;
  a slow 30s drift, disabled under reduced motion.
- City chips write the diaspora into the visual identity; they are real filters, not
  decoration.
- Rails use the serif-lowercase eyebrow + a thin "view all →" in teal (semantic: it
  navigates).

## 6. Signature: the poster-glow

Every piece of event artwork radiates its own dominant color ~24–40px into the canvas
(a `box-shadow`/blurred pseudo-element tinted by the extracted color, ~18% opacity,
rising to ~30% on hover). The homepage at night looks like a street of lit venue
doorways. This is the thing a screenshot gets recognized by, it costs nothing when
there are no events, and it makes the organizers' own work the brand.

Implementation: extract the dominant color server-side once per event (store
`poster_accent` on the event doc at upload; fallback: teal-neutral glow `#14B8A61f`).

Secondary motif, used sparingly: the **`è` accent tick** — a short 24° slanted stroke
borrowed from the wordmark — as the link-hover underline, the section "view all"
arrowhead, and the loading indicator. Never bigger than 12px; it's a wink, not a logo.

## 7. Voice

- Sentence case everywhere except the hero. Plain verbs: "Get tickets", "Follow",
  "Share". Prices always with currency: "From 500 HTG".
- Kreyòl appears deliberately, not decoratively: eyebrows may carry it where every
  reader gets it ("pou ou" for the personalized rail); confirmations may answer in the
  buyer's language (i18n already does this). English remains the default register.
- Empty states invite: "Nothing tonight in Cap-Haïtien yet — check this weekend."

## 8. Quality floor (non-negotiables)

Responsive to 360px; keyboard focus visible (2px teal ring); `prefers-reduced-motion`
respected; body never scrolls horizontally; poster `<Image>`s sized+lazy; contrast ≥
4.5:1 for text on canvas (secondary #A3A3A3 passes).

## 9. Rollout

1. **Homepage** (hero, rails, cards, footer) — the proving ground.
2. Discover + category pages (same cards/rails).
3. Public event page polish (ambient poster-glow header, white CTA).
4. Organizer landing page (screenshots in device frames replacing feature prose).

Each step ships behind its own review; no other surface changes until the previous one
is approved.
