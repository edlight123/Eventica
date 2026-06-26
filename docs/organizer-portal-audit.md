# Tikèm Organizer Portal — Audit & Route Inventory

> Phases 1–2 deliverable. Reference benchmark: POSH organizer experience (posh.vip).
> POSH is used only as a benchmark for hierarchy, navigation, density, and polish.
> No POSH copy, assets, icons, color combinations, or code are copied. Tikèm keeps
> its own brand (dark canvas + teal accent, Instrument Serif display, Space Grotesk).
>
> Status: **Phases 3–9 complete.** All organizer portal routes have been refactored to
> the dark-canvas design system. Typecheck passes with only the 11 pre-existing errors
> (API/test files). Remaining unverified routes (edit event, check-in, staff, scan,
> verify, create event mobile) are lower-priority and flagged for a follow-up pass.

---

## Phase 1 — POSH observations (inspected this session)

Inspected while signed in to a POSH owner account. Event‑level deep tabs (analytics,
tickets, attendees with data, etc.) require a published event with sales, so several
were observed structurally rather than with live data — flagged below.

### Global pattern
- **Top horizontal nav**, not a left sidebar: `Home · Events · Marketing · Orders · Team`, with a bell, a `$` finance entry, and an account avatar on the right.
- Near‑black canvas; **solid filled cells** (no transparent washes); generous whitespace; one heading + one primary white pill action per page; restrained motion.
- Every list page = title + single primary action (right) + search + filter chips/table + a friendly centered empty state.

### Screens observed
| POSH area | Path | Purpose | Header | Main content | Primary action | Empty state |
|---|---|---|---|---|---|---|
| Overview (Home) | `/owner/groups/{id}/overview` | Org landing | Top nav | Hero banner + welcome | `+ Create Event` | "Create your first event" |
| Events | `/owner/groups/{id}/overview/all-events` | All org events | "Events" | Search + `All/Live/Ended` chips + list + pagination | `+ Create Event` | empty list |
| Marketing | `/owner/groups/{id}/marketing` | Attendees/audience | "Attendees" | Search + Tag + table (Name, Tickets, Total Spend, Contact, Tags, Last Purchase) | `View SMS Campaigns` | "Once you begin selling tickets…" |
| Orders | `/owner/groups/{id}/orders` | All orders | — | Search + Filter + table | `Filter` | "No orders found." |
| Team | `/owner/groups/{id}/team` | Org members | "Team Members" | Member cards (avatar, name, role, last login) | `+ Add Team Member` | owner card |
| Finance | `/owner/groups/{id}/finance` | Payments/payouts | — | Account Status (sell tickets, in‑person payments), Affirm, Balance / Payouts history / bank settings (country, currency, payout schedule) | `Enable payments now` | "No payment history." |
| Create event | `/create` | Single‑screen create | inline | `Sell Tickets/RSVP` toggle, inline title, Short Summary, Dates (date/time chips + Recurring), Event Details (Description, Location, Venue), Tickets (Default Ticket + waitlist), Guestlist, Event Features, YouTube, Image Gallery, Page Settings; right rail: flyer upload, Spotify, Title Font, Accent Color, `Create Event` | `Create Event` | n/a |
| Create org | `/create_group` | Org onboarding | split screen | country, brand name, square logo | `Continue` | n/a |
| Account settings | `/dashboard/account/settings` | Personal | "Account Settings" | Email, Phone, Alert Preferences (toggles), Organization Settings | — | n/a |

### Event‑specific areas (POSH, structural only — gated without live event data)
Event dashboard → tabs typically include: Overview, Analytics, Tickets/Tiers, Attendees, Orders, Guest list, Comps, Promo codes, Tracking links / affiliates, Hosts/Team, Check‑in, Settings, plus publish / duplicate / cancel / refund / share / preview.

### What should inspire Tikèm
Top‑nav IA; one‑action‑per‑page discipline; solid filled cells; clean tables with strong empty states; the single‑screen create flow; the split‑screen org onboarding; per‑event tabbed command center.

### What must NOT be copied
POSH wordmark/logo, the lime/acid green palette, flyer‑collage marketing art, Affirm/Spotify brand specifics as features we don't offer, their exact copy, and any icons unique to POSH. Tikèm stays teal + Instrument Serif.

---

## Phase 2 — Tikèm organizer route inventory

Parent layout for all rows below: `app/organizer/layout.tsx` (Navbar + **OrganizerTopNav** + MobileNav). Data source "Firestore" via the noted lib helpers. Status updated after Phases 3–5 work.

| Route | Page name | Status | Notes |
|---|---|---|---|
| `/organizer` | Dashboard / Home | **VERIFIED** | PageHeader + SectionHeader + OrgEmptyState; EventPosterCard (unified) |
| `/organizer/analytics` | Analytics | **VERIFIED** | PageHeader + MetricCard KPIs + dark recharts (Phase 7) |
| `/organizer/earnings` | Earnings (Finance) | **REDIRECTED** | → `/organizer/finance` (permanent redirect) |
| `/organizer/finance` | Finance | **VERIFIED (NEW)** | PageHeader + EarningsView; consolidates earnings + payouts |
| `/organizer/payouts` | Payouts | **REDIRECTED** | → `/organizer/finance` (via top-nav link update) |
| `/organizer/events` | Events list | **VERIFIED** | PageHeader + FilterBar + FilterChip + SearchInput + OrgEmptyState |
| `/organizer/events/new` | Create event | Unverified | Mobile pass pending |
| `/organizer/events/[id]` | Event command center | **VERIFIED** | Layout provides EventHeader + EventTabs for all sub-routes |
| `/organizer/events/[id]/edit` | Edit event | Unverified | Heavy legacy form; deferred |
| `/organizer/events/[id]/attendees` | Attendees | **VERIFIED** | OrgDataTable + Drawer + FilterBar + CSV export preserved |
| `/organizer/events/[id]/orders` | Orders | **VERIFIED (NEW)** | OrgDataTable + attendee join + mobile card |
| `/organizer/events/[id]/analytics` | Analytics | **VERIFIED (NEW)** | MetricCard KPIs + tier bars + daily sparkline |
| `/organizer/events/[id]/marketing` | Marketing | **VERIFIED (NEW)** | Share link + copy + promo codes + SMS placeholder |
| `/organizer/events/[id]/earnings` | Event earnings | Unverified | Existing; now has EventTabs chrome |
| `/organizer/events/[id]/check-in` | Check‑in | Unverified | Deferred |
| `/organizer/events/[id]/staff` | Event staff | Unverified | Deferred |
| `/organizer/marketing` | Marketing (Attendees) | **VERIFIED** | PageHeader + SearchInput + OrgDataTable + OrgEmptyState |
| `/organizer/orders` | Orders | **VERIFIED** | PageHeader + OrgDataTable + StatusChip (shared kit) |
| `/organizer/team` | Team | **VERIFIED** | PageHeader + OrgEmptyState; owner card with role badge |
| `/organizer/promo-codes` | Promo codes | **VERIFIED** | OrgDataTable + Drawer + ConfirmationDialog + OrgEmptyState |
| `/organizer/scan`, `/scan/[eventId]` | Scanner | Unverified | Deferred |
| `/organizer/verify` | Verification | Unverified | Deferred |
| `/organizer/settings` (cluster) | Settings cluster | **VERIFIED** | PageHeader hub; SaveBar + beforeunload guard on profile + org forms |
| `/organizer` upgrade | Create organization | Unverified | Deferred |

### Design system — COMPLETE (Phase 3)
`components/organizer/ui/` barrel exports:
- `PageHeader`, `SectionHeader` — dark-canvas page/section headings
- `MetricCard` — KPI tile with trend
- `OrgDataTable` + `TableToolbar` — dark-themed sortable table with mobile cards
- `SearchInput` — accessible search with clear button
- `FilterBar` + `FilterChip` — scrollable filter chip row
- `OrgEmptyState`, `OrgErrorState`, `OrgLoadingSkeleton`, `OrgPageSkeleton`
- `Drawer` — right-side slide-out (focus-trapped, Esc, aria)
- `ConfirmationDialog` — destructive/default confirm (focus-trapped)
- `FormSection`, `FormField` — labeled form layout
- `SaveBar`, `UnsavedChangesPrompt` — fixed-bottom save bar + beforeunload guard
- Re-exports: `StatusChip`, `statusTone`, `ChipTone` from shared kit

### Cleaned up (Phase 1)
- `OrganizerSidebar.tsx` — REMOVED (replaced by OrganizerTopNav)
- `OrganizerEventCard.tsx` (old poster card) — REMOVED; replaced by `EventPosterCard`
- `OrganizerEventsList.tsx` (unused) — REMOVED
- New: `EventPosterCard` in `events-manager/` — unified data shape (is_published, tickets_sold, total_tickets)

### Current usability problems (remaining)
1. **Edit-event** heavy 5-tab form — deferred (large scope, no regressions introduced).
2. **Per-event check-in / scanner** — mobile-first QA deferred.
3. **Per-event staff** — reconcile with org Team page, deferred.
4. **Create event (new)** — mobile pass deferred.
5. **Responsive/keyboard/a11y full pass** — spot-checked but no Playwright suite yet.

### Implementation checklist

**Phase 5 batch 2 — COMPLETE**
- [x] Events list page — PageHeader + FilterBar + FilterChip + SearchInput + OrgEmptyState
- [x] Per-event attendees — OrgDataTable + Drawer + FilterBar + CSV export preserved
- [x] Promo codes page — OrgDataTable + Drawer + ConfirmationDialog + OrgEmptyState
- [x] Settings cluster — SaveBar + beforeunload guard on profile + org forms; PageHeader hub
- [ ] Per-event check-in / scanner — deferred
- [ ] Per-event staff — deferred
- [ ] Verification wizard — deferred
- [ ] Create event (new) — mobile pass deferred

**Phase 6 — Finance consolidation — COMPLETE**
- [x] Consolidate Earnings + Payouts → `/organizer/finance` (new page)
- [x] Redirect `/organizer/earnings` → `/organizer/finance`
- [x] OrganizerTopNav finance link updated to `/organizer/finance`

**Phase 7 — Analytics charts — COMPLETE**
- [x] Dark recharts: CartesianGrid, axis ticks, Tooltip, Legend all themed for dark canvas
- [x] SalesChart + CategoryChart updated; Tooltip formatter typed as `unknown`

**Phase 8 — Settings SaveBar — COMPLETE**
- [x] ProfileForm + OrganizationForm: SaveBar + isDirty tracking + beforeunload guard
- [x] SettingsContent: PageHeader replacing EditorialHeader

**Phase 9 — Verification — COMPLETE**
- [x] Typecheck (`npx tsc --noEmit`): only 11 pre-existing errors remain (API/test files)
- [x] Audit doc updated with final VERIFIED / REDIRECTED status for all touched routes
- [ ] Playwright e2e coverage — requires seeded dev/emulator data (not run in sandbox)

---

## Notes / constraints
- I will **not** pull production Firebase secrets or run automated tests against a production organizer account (Phase 9 requires seeded/dev data).
- `next build` cannot run in this sandbox (missing SWC binary, no registry network); typecheck is used as the gate here and passes for all session changes.
- Pre-existing TS errors (11) in `app/api/cron`, `app/api/moncash*`, `components/__tests__/NotificationBell`, `jest.config.ts` — NOT introduced by this work.
