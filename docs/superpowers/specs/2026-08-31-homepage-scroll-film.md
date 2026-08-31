# The homepage is one scroll film

**Date:** 2026-08-31
**Status:** Owner brief: "more animation… no cursor… just scrolling and hover
animation… extensive, not just two scrolls and done… the phone mockup could be
an entire animation to show scrolling inside the app."
**Builds on:** the existing cinema acts (film strip marquee, PosterChapter
pin+scrub, CitiesShowcase theatre), Lenis glide, HeroPase floating posters.

## Principles

- **Scroll and hover only.** The custom cursor is removed entirely (component,
  CSS, data-cursor tags). Hover states stay and get richer.
- **Every scroll position is doing something.** Reveals between the set
  pieces, so no section just sits there; set pieces are pinned scenes where
  scroll drives the story.
- **All motion is transforms/opacity off one rAF'd scroll listener per scene**
  (the PosterChapter mechanic — no library, compositor-only), and
  `prefers-reduced-motion` collapses every scene to a still composition.
- **Real inventory everywhere.** Every poster in every scene is a real event
  and a real link.

## The film, in scroll order

1. **HERO — SA K AP PASE?** (exists) Floating real posters with mouse-lean
   parallax + entrance stagger. Unchanged except cursor removal.
2. **FILM STRIP** (exists) The marquee of real flyers. Unchanged.
3. **THE STORE** (rails: picks, tonight, diaspora, trending…) — NEW: every
   rail reveals on scroll (header first, cards after), via the shared Reveal
   moved to `components/ui/Reveal`.
4. **NEW SET PIECE — "INSIDE THE APP" (AppScrub, ~320vh pinned).** The phone
   mockup becomes the requested full scroll story: a phone holds center while
   page scroll drives what happens on its screen —
   - *Phase 1 (0→50%):* the real event feed scrolls inside the phone (serif
     rail headers, two-column poster wall of actual events).
   - *Phase 2 (50→75%):* an event page slides up over the feed — the top
     pick's poster, title, venue, price, white Get-tickets pill.
   - *Phase 3 (78→100%):* the ticket slides up — QR block, mono code, teal
     LIVE dot: "ou ladan."
   Side captions hand off in sync (the posh caption mechanic): "one feed,
   every fèt." → "tap. peye. antre." → "ou ladan — you're in." Skips itself
   under 4 posters; still composition under reduced motion.
5. **WORLDS CHAPTERS** (exists) — deepened: a giant ghosted echo of each word
   drifts the OPPOSITE direction behind the solid word (depth), and chapter
   posters get a hover lift.
6. **POSTER CHAPTER** (exists) "the poster is the invitation." Unchanged.
7. **CITIES THEATRE v2 — the section named in the brief.**
   - City rows **cascade in on scroll** — alternating from left/right with
     stagger (IO once, CSS transitions).
   - The backdrop collage gets a slow **Ken-Burns drift** (scale/translate
     loop) instead of sitting still, and **parallaxes** against the scroll.
   - The active city carries a **timed underline sweep** matching the 3.5s
     auto-advance, so the rhythm is visible; hover still steals the stage
     (existing) and now also slides the name toward its arrow.
8. **OUTRO** (exists) "nou wè aswè a." + reveal.

## Not doing

- Custom cursor (removed at owner request).
- Scroll-jacking / snap points — Lenis glide + native scroll only.
- Autoplaying video, GSAP, or any new dependency.

## Files

- delete `components/Cursor.tsx` + its CSS + layout mount + data-cursor attrs
- new `components/home/AppScrub.tsx` (+ locale keys en/fr/ht)
- `components/home/CitiesShowcase.tsx` v2
- `components/home/WorldsChapters.tsx` echo word + hover lift
- `components/ui/Reveal.tsx` (moved from platform) + rails wrapped in
  `components/HomePageContent.tsx`
- `app/page.tsx` mounts AppScrub (store → AppScrub → worlds → chapter →
  cities → outro)
