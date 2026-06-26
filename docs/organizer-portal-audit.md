# Tikèm Organizer Portal — Audit & Route Inventory

> Phases 1–2 deliverable. Reference benchmark: POSH organizer experience (posh.vip).
> POSH is used only as a benchmark for hierarchy, navigation, density, and polish.
> No POSH copy, assets, icons, color combinations, or code are copied. Tikèm keeps
> its own brand (dark canvas + teal accent, Instrument Serif display, Space Grotesk).
>
> Status: **Phases 3–4 complete. Phase 5 batch 1 complete. Remaining: Phase 5 batch 2
> (events list, analytics charts, promo codes, scan, verify, settings), Phase 6 (finance),
> Phase 7 (recharts dark theme), Phase 7–9 (verification, responsive QA, Playwright).**

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
| `/organizer/analytics` | Analytics | Unverified | Chart colors still light-on-dark (Phase 7) |
| `/organizer/earnings` | Earnings (Finance) | Unverified | Phase 6: consolidate with Payouts |
| `/organizer/payouts` | Payouts | Unverified | Phase 6: merge into Finance |
| `/organizer/events` | Events list | Unverified | Phase 5 batch 2 |
| `/organizer/events/new` | Create event | Unverified | Mobile pass pending |
| `/organizer/events/[id]` | Event command center | **VERIFIED** | Layout provides EventHeader + EventTabs for all sub-routes |
| `/organizer/events/[id]/edit` | Edit event | Unverified | Heavy legacy form; Phase 5 batch 2 |
| `/organizer/events/[id]/attendees` | Attendees | Unverified | Existing; now has EventTabs chrome via layout |
| `/organizer/events/[id]/orders` | Orders | **VERIFIED (NEW)** | OrgDataTable + attendee join + mobile card |
| `/organizer/events/[id]/analytics` | Analytics | **VERIFIED (NEW)** | MetricCard KPIs + tier bars + daily sparkline |
| `/organizer/events/[id]/marketing` | Marketing | **VERIFIED (NEW)** | Share link + copy + promo codes + SMS placeholder |
| `/organizer/events/[id]/earnings` | Event earnings | Unverified | Existing; now has EventTabs chrome |
| `/organizer/events/[id]/check-in` | Check‑in | Unverified | Phase 5 batch 2 |
| `/organizer/events/[id]/staff` | Event staff | Unverified | Phase 5 batch 2 |
| `/organizer/marketing` | Marketing (Attendees) | **VERIFIED** | PageHeader + SearchInput + OrgDataTable + OrgEmptyState |
| `/organizer/orders` | Orders | **VERIFIED** | PageHeader + OrgDataTable + StatusChip (shared kit) |
| `/organizer/team` | Team | **VERIFIED** | PageHeader + OrgEmptyState; owner card with role badge |
| `/organizer/promo-codes` | Promo codes | Unverified | Phase 5 batch 2 |
| `/organizer/scan`, `/scan/[eventId]` | Scanner | Unverified | Phase 5 batch 2 |
| `/organizer/verify` | Verification | Unverified | Phase 5 batch 2 |
| `/organizer/settings` (cluster) | Settings cluster | Unverified | Phase 5 batch 2; SaveBar + unsaved-changes guard |
| `/organizer` upgrade | Create organization | Unverified | Phase 5 batch 2 |

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
1. **Finance split** across Earnings / Payouts / Settings→Payouts — Phase 6.
2. **Edit‑event** heavy 5-tab form — Phase 5 batch 2.
3. **Analytics charts** light-on-dark recharts — Phase 7.
4. **Responsive/keyboard/a11y** unverified across the area — Phase 8.
5. **Settings IA** consolidation; SaveBar + unsaved-changes guard — Phase 5 batch 2.

### Implementation checklist (remaining)

**Phase 5 batch 2**
- [ ] Events list page — refactor to use design system
- [ ] Per-event attendees — add OrgDataTable + CSV export
- [ ] Per-event check-in / scanner — mobile-first QA
- [ ] Per-event staff — reconcile with org Team
- [ ] Promo codes page — EmptyState + create modal
- [ ] Verification wizard — stepper polish
- [ ] Settings cluster — SaveBar + unsaved-changes guard + danger zone
- [ ] Create event (new) — mobile pass

**Phase 6 — Finance consolidation**
- [ ] Consolidate Earnings + Payouts → one `/organizer/finance` route
- [ ] Redirect old /earnings and /payouts
- [ ] Payout history table with OrgDataTable

**Phase 7 — Analytics charts**
- [ ] Theme recharts for dark canvas + zero-data states

**Phase 8 — Responsive & a11y QA**
- [ ] 375/390/768/1280/1440 QA — no horizontal overflow
- [ ] Focus states, dialog focus-trap + Esc, icon-button labels, contrast
- [ ] Reduced-motion check

### Verification checklist (Phase 9)
- [ ] Route manifest + Playwright coverage (auth as organizer, every route)
- [ ] Build + lint + typecheck clean
- [ ] Final repo route re-scan; every route: VERIFIED / VERIFIED UNCHANGED / BLOCKED / REMOVED / REDIRECTED

---

## Notes / constraints
- I will **not** pull production Firebase secrets or run automated tests against a production organizer account (Phase 9 requires seeded/dev data).
- `next build` cannot run in this sandbox (missing SWC binary, no registry network); typecheck is used as the gate here and passes for all session changes.
- Pre-existing TS errors (11) in `app/api/cron`, `app/api/moncash*`, `components/__tests__/NotificationBell`, `jest.config.ts` — NOT introduced by this work.
