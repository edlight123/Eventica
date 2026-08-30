# Cultural taxonomy + Tikèm Picks

**Date:** 2026-08-30
**Status:** Approved direction (owner: "yeah go ahead"), built same day
**Context:** From the posh positioning review — the two ideas adopted from it:
a Haitian cultural taxonomy instead of a generic ticketing one, and a
human-curated Picks rail. (Rejected from the same doc: homepage teardown,
emoji headers, icon-heavy cards, custom cursors, invented testimonials.)

## 1. Cultural taxonomy — display layer over stored categories

Stored event categories stay canonical English (`Concert`, `Party`, …) so
Firestore data, mobile, and the filter engine are untouched. A new module
`lib/categories.ts` groups them into eight Kreyòl cultural worlds:

| key | label | covers |
|---|---|---|
| mizik | mizik — konpa · rabòday · DJs · live | Concert |
| lavi-lannwit | lavi lannwit — parties · clubs · lounges | Party |
| kilti | kilti — art · theater · festivals · heritage | Theater, Festival |
| espo | espò — football · basketball · tournaments | Sports |
| gastronomi | gastronomi — food festivals · tastings · brunch | Food & Drink |
| biznis | biznis — conferences · networking · workshops | Conference, Workshop |
| fanmi | fanmi — family · kids · community | Family |
| eksperyans | eksperyans — beach · outdoor · getaways | Other |

Two NEW canonical categories are added for coverage: **Food & Drink** and
**Family** (plus synonyms in `normalizeEventCategory`). They appear
automatically in the web event composer (it reads `CATEGORIES`); the mobile
composer won't offer them until its own list is updated (follow-up), but it
displays and filters them fine via the synonym map.

A cultural tile links to the existing filter engine with a multi-category
URL (`/?category=Theater&category=Festival`) — `parseFiltersFromURL` already
reads `getAll('category')`, so zero filter-engine changes.

Surfaces:
- `components/CategoryGrid.tsx` (used on /categories and home) → renders the
  8 cultural tiles (gradient poster-theme tiles, de-iconed: Kreyòl label in
  grotesk + descriptor sub-line). 
- Homepage gets a "dekouvri monn ou" section rendering the grid.
- `CategoryChips` (discover filter dropdown) keeps canonical values —
  functional filter, not brand surface — but gains icons for the two new
  canonicals.

## 2. Tikèm Picks — wire the existing curation to the surface

Finding: admin curation ALREADY exists — `AdminEventDetailSheet` has a
Feature/Unfeature star, `/api/admin/events/action` writes `featured: true`
(audit-logged). Nothing public reads it (`apply.ts` sorts on `is_featured`,
a different field only test data sets). Picks = reading the dead flag:

- `app/page.tsx`: `picksEvents` = upcoming events (all countries — curation
  is scarce, don't country-erase it) where `featured === true` (tolerating
  legacy `is_featured`), cap 8.
- `HomePageContent`: Picks rail renders FIRST (curation leads the page),
  serif header "tikèm picks" + "our favorite events this week", shown only
  when ≥ 2 picks exist; exempt from cross-rail dedupe (a pick may repeat in
  tonight/trending — deliberate).
- `getFeaturedEvents` (hero rotation): curated events lead, ticket sales
  fill the rest.
- `apply.ts` default sort: treat `featured || is_featured` as featured.

Curation workflow (unchanged, now with effect): Admin → Events → open an
event → ★ Feature.

## Follow-ups (not in this pass)
- Mobile composer offers Food & Drink / Family; mobile home mirrors the
  cultural rails.
- Who's-going avatar stacks (needs a visibility/privacy spec).
- Organizer-story section once two real testimonials exist.
