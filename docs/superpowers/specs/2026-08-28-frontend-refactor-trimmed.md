# Frontend refactor — the agreed, trimmed plan

**Date:** 2026-08-28
**Supersedes:** the external "Architecture Refactoring Blueprint" (Gemini draft). This is
the corrected sequencing; execute from HERE, not from the original.

## What survives from the original

1. **Card consolidation — during the discover design pass, not before.**
   `components/ui/PosterCard.tsx` is the one poster primitive; `DiscoverEventCard` is
   its domain wrapper (this pairing already exists). The work is DELETION:
   - Replace remaining `components/EventCard.tsx` usages (its serif titles are a
     design-system violation, not a variant to preserve) and `EventCardHorizontal`.
   - Extract `SectionHeader` / `EventRail` / `CategoryRail` from `HomePageContent` into
     `components/ui/` when discover starts consuming them — refactor WITH a consumer.
   - Migrate the global mono `.eyebrow` class to the serif editorial voice in the same
     pass (site-wide class; do it once, not piecemeal).
2. **Move the rail dedupe/bucketing from `HomePageContent` into `app/page.tsx`** (server)
   while touching those files anyway.
3. **Server/Client boundary audit** of the new, smaller pieces as they're extracted.

## What is deferred, and its gate

**Dismantling `EventDetailsClient` / `BuyTicketButton` is its own later project.**
These are the revenue path; their "mess" is scar tissue from real incidents (IG-WebView
popup handling, promo-refusal recovery, guest resume, PaymentIntent re-mint guard,
promoter ref capture). Gate: characterization tests FIRST for guest checkout, promo
fallback, password gate, ref attribution, and the MonCash WebView round trip — then
extract `<TicketWidget />` etc. No tests, no dismantling.

## What is dropped

- **Cross-platform "unified card":** `mobile/` is React Native; it cannot share DOM
  components with Next. Web and mobile share tokens and conventions only.
- **`variant: 'editorial' | 'technical'` on PosterCard:** card titles are grotesk,
  full stop (design system, 2026-08-28). A serif-title variant institutionalizes the
  inconsistency the refactor exists to remove.

## Sequencing

1. Ship the current pipeline (promoters, wallets, homepage) and verify in prod.
2. Discover design pass = card consolidation + layout extraction (items 1–3 above).
3. Event-page surgery, behind its test gate, as a standalone project.
