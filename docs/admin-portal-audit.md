# Event Haiti (Tikèm) — Admin Portal Audit & Refactor Tracker

> Phase 1 deliverable: discovery, inventory, and per-route tracking for the admin
> portal refactor. This document is the source of truth for the multi-phase admin
> overhaul and is updated as each section is refactored and verified.

**Status legend**
- `Not started` — no work yet
- `In progress` — actively being changed
- `Refactored` — code refactored to the unified admin system; not yet browser-verified on the live deploy
- `Functionally verified` — refactored **and** tested in the browser (loads, data, actions, states)
- `Needs backend work` — UI ready but depends on a missing/changed API or data
- `Blocked` — cannot proceed (dependency, access, or decision needed)

> Verification note: the dev sandbox can run `tsc` but **cannot run a production
> build or the live app**, and the browser can only see the **deployed** site
> (not un-deployed local changes). So "Functionally verified" requires a deploy
> first. Pages marked `Refactored` are code-complete + typecheck-clean but await a
> deploy to verify.

---

## 1. Stack, auth & conventions

| Area | Finding |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind CSS; dark-first design (near-black `#0a0a0a` canvas, teal `brand-*` accent, Instrument Serif display + Space Grotesk) |
| Data | Firestore (admin SDK `@/lib/firebase/admin`, client `@/lib/firebase/client`); some Supabase-compat wrapper (`@/lib/firebase-db`) |
| Realtime | `AdminRealtimeProvider` (`useAdminMetrics`, `useAdminActivities`) wraps the admin layout |
| Admin shell | `app/admin/layout.tsx` → `AdminTopNav` (horizontal sticky bar) + `AdminCommandBar` (global search) + `AdminRealtimeProvider`. Global site `Navbar` is intentionally NOT rendered in admin. |
| Auth (server) | `requireAdmin()` in `lib/auth.ts`: allows `role === 'admin' \|\| 'super_admin'`, plus a bootstrap allow-list via `ADMIN_EMAILS` env. Server-side enforced. |
| Auth (UI) | `isAdmin(email)` (`lib/admin.ts`) for nav visibility only |
| Access denied | `AdminAccessDenied` component rendered by layout for non-admins |

**Auth assessment:** Page-level + API-level checks both call `requireAdmin()`. This is sound (UI visibility is not the only gate). The `ADMIN_EMAILS` bootstrap path should be reviewed before launch (ensure the env list is locked down in production).

---

## 2. Unified admin design system (Phase 2 — status)

A consistent dark, flat admin system has been established this cycle. Primitives / patterns now in use:

| Primitive | Location | Status |
|---|---|---|
| Top nav (horizontal, sticky, active-route aware) | `components/admin/AdminTopNav.tsx` | Done |
| Global command/search bar | `components/admin/AdminCommandBar.tsx` | Done (dark) |
| Breadcrumbs | `components/admin/AdminBreadcrumbs.tsx` | In use |
| KPI strip (divided cells, bare icons, tabular nums) | inline pattern, also `RealTimeMetrics`, `KpiCard` | Standardized |
| Editorial page header | `components/ui/EditorialHeader.tsx` (white title both tones) | Done |
| Data table | `components/ui/DataTable.tsx` + kit | Dark; reused |
| Kit (StatTile/EmptyState/StatusChip/Badge) | `components/ui/kit.tsx` | Dark |
| Activity feed / work queues | `AdminActivityFeed`, `WorkQueueCard`, `RecentActivityTimeline` | Flattened |
| Form baseline (no white inputs, dark autofill) | `app/globals.css` (`color-scheme: dark`, transparent inputs) | Done |

**Design language:** near-black canvas, hairline `border-white/10` outlines (no gray fills, no gradients, no shadows), bare teal icons (no chip boxes), status as colored text, compact list-dense tables, readable `text-white` / `text-white/50-70`.

**Dead/duplicate components to remove (Phase 8 cleanup):**
- `components/admin/AdminSidebar.tsx` — superseded by `AdminTopNav`, not imported by the layout.
- `components/admin/AdminKpiGrid.tsx` — superseded by the inline divided-strip pattern / `RealTimeMetrics`; verify usages before deleting.

---

## 3. Route inventory

### Primary admin pages

| Route | Purpose | Key components | Status | Notes / problems | Priority |
|---|---|---|---|---|---|
| `/admin` | Operations dashboard: live KPIs, activity feed, work queues, quick actions | `AdminDashboardClient`, `RealTimeMetrics`, `AdminActivityFeed`, `WorkQueueCard`, `AdminDashboardQuickActions` | **Functionally verified** | Browser-checked live: flat KPI strip, horizontal nav, readable. | P0 |
| `/admin/analytics` | Platform analytics: Overview/Revenue/Users/Events/Conversion/Organizers | `AdminAnalyticsTabs` (+ live hero scorecard), `AdminRevenueAnalytics`, `UserGrowthAnalytics`, `EventPerformanceAnalytics`, `ConversionFunnelAnalytics`, `OrganizerRankingsAnalytics` | **Refactored** | Full redesign: live scorecard, segmented tabs, framed sections; all 6 chart components reworked (dark recharts, flat outlines). Awaiting deploy verify. | P1 |
| `/admin/events` | Event moderation console (list, filters, approve/moderate) | `AdminEventsModerationConsole`, `EventActionsClient` | **Refactored** | Removed redundant back-link; header tone fixed. Verify table filters/row actions in browser. | P0 |
| `/admin/organizers` | Organizer directory + verification status | `AdminOrganizersClient`, `DataTable` | **Refactored** | Divided stat strip, removed back-link, dark table. Verify pagination/load-more. | P0 |
| `/admin/organizers/[id]` | Organizer detail: account, payouts/bank, verification, documents, ban/disable | `OrganizerDetailsClient` | **Refactored** | Flattened sections, stat strip, text badges; action handlers untouched (ban/disable/posting). | P0 |
| `/admin/users` | User directory + search | `AdminUsersClient` | **Refactored** | Single header, divided stat strip, polished search (inline icon, no white box). | P0 |
| `/admin/users/[id]` | User detail + promote-to-organizer | `AdminUserDetailsClient` | **Refactored** | Flattened cards, stat strips; promote form/handler untouched. | P1 |
| `/admin/verify` | Organizer identity verification review queue | `AdminVerifyClient`, `VerificationRequestReview`, `VerifyOrganizerForm` | **Refactored** | Removed redundant breadcrumb/back-link; header tightened. `VerificationRequestReview` (647 lines) not yet individually polished. | P0 |
| `/admin/bank-verifications` | Bank account verification review | `BankVerificationsClient`, `BankVerificationReviewCard` | **Refactored** | Header tone fixed, filter tabs/empty state flattened. | P1 |
| `/admin/disbursements` | **Consolidated payout operations hub** (disbursements + withdrawals + pending payouts) | `AdminDisbursementDashboard`, `WithdrawalsView`, `PayoutOperationsClient`, `AdminPayoutQueue` | **Refactored (partial)** | `AdminPayoutQueue` flattened (logic untouched). `AdminDisbursementDashboard`, `WithdrawalsView`, `PayoutOperationsClient` still need a polish pass. **Payment-critical — presentational only.** | P0 |
| `/admin/orders` | Orders/tickets browser with summary, filters, detail drawer | `AdminOrdersClient`, `DataTable` | **Refactored + bug-fixed** | Divided stat strip, flat table. Fixed crash (`formatCurrency` undefined-currency) + hardened `/api/admin/orders` 500 (count()/index fallbacks). Verify in browser after deploy. | P0 |
| `/admin/security` | Security dashboard (suspicious activity, severity) | `SecurityDashboardClient` | **Refactored** | Divided KPI strip, flat cards, severity as colored text. | P2 |
| `/admin/settings` | Platform settings (currency/region policy) | `PlatformSettingsForm` | **Refactored** | Single-column form, sectioned, design-system inputs; removed gradient sidebar. | P1 |

### Redirect / consolidated routes (keep as redirects)

| Route | Behavior | Status |
|---|---|---|
| `/admin/payouts` | `redirect('/admin/disbursements')` | OK (consolidated) |
| `/admin/withdrawals` | `redirect('/admin/disbursements#withdrawals')` | OK (consolidated) |
| `/admin/verifications` | redirects to `/admin/verify` (preserving query) | OK (consolidated) |

### Dev-only tools (should be gated/hidden in production)

| Route | Purpose | Status / recommendation |
|---|---|---|
| `/admin/dev` | Dev tools landing | **Needs gating** — hide behind a dev/env flag; not for production admins |
| `/admin/dev/debug-db` | Firestore inspector | Dev-only |
| `/admin/dev/create-test-data` | Seed test users/events | Dev-only |
| `/admin/dev/seed-events` | Seed events | Dev-only |

---

## 4. API inventory (admin)

**Core (keep):** `orders`, `organizers`, `organizer-actions`, `payouts/{approve,decline,mark-paid}`, `withdrawals`, `withdrawals/[id]`, `bank-verifications`, `approve-bank-verification`, `review-verification`, `verify-organizer`, `verification-status`, `verification-image`, `analytics`, `analytics-data`, `revenue-analytics`, `platform-counts`, `search`, `search/rebuild`, `settings`, `suspicious-activities`, `events/action`, `events/bulk-action`, `events/list`, `events/[eventId]/export`, `realtime`, `ws`, `upload-receipt`, `moncash-prefunded/*`, `payout-prefunding`.

**Dev/migration/debug (gate or remove before launch):** `debug-*`, `debug/*`, `events/{seed-20,seed-test-events,backfill-*,migrate-canada-currency,restore-from-legacy,verify-canada-currency}`, `fix-ticket-tiers`, `fix-tickets-sold`, `migrate-verification-status`, `seed-events`, `seed-events/verify`, `suspicious-activities/backfill`.

**Recommendation:** consolidate debug/seed/migrate endpoints under a single env-gated namespace and ensure they require `super_admin` (not just `admin`).

---

## 5. Cross-cutting findings (fixed this cycle)

- **White inputs everywhere** → root cause: no global form baseline; inputs fell back to browser white. Fixed in `globals.css` (`color-scheme: dark`, transparent form controls, dark autofill).
- **White icon chips / faint badges** → ~240 `bg-*-50` / `text-*-700` light leftovers removed platform-wide.
- **Unreadable dark text** → 79 `text-*-900/800` instances across 44 files mapped to readable `-300`.
- **Orders page crash + 500** → `formatCurrency` made crash-proof; orders API hardened against `count()`/composite-index failures.

## 6. Open items / recommendations (next phases)

1. ~~**Disbursements hub**~~ — **Done.** `AdminDisbursementDashboard`, `WithdrawalsView`, `PayoutOperationsClient` refactored to the system (presentational only, payout logic untouched).
2. **Verify queue** — `VerificationRequestReview` reviewed: already on the dark/flat system; migrated its `alert()`s to toasts and it uses the shared confirm dialog. Considered done for this pass. [done]
3. ~~**Dev tools gating**~~ — **Done.** Added `requireDevTools()` + `requireSuperAdmin()` in `lib/auth.ts`. Production = super_admin only; non-prod (or `ENABLE_DEV_TOOLS=true`) = any admin. Gated `app/admin/dev/*` via `app/admin/dev/layout.tsx`, and added the gate to **21 debug/seed/migrate/fix API route files (27 handlers)** (replacing their plain `requireAdmin`). OPTIONS/CORS preflights intentionally left open.
4. **Dead code** — confirmed unused: `components/admin/AdminClientLayout.tsx`, `components/admin/AdminSidebar.tsx`, `components/admin/AdminKpiGrid.tsx`. (Sandbox can't delete; remove with `git rm`.) [P2]
5. **Tables** — `DataTable` (`components/ui/DataTable.tsx`) already provides sort, client/server pagination, selection, and a toolbar slot, and is used by Orders, Organizers, Marketing. Remaining: URL-persisted filters + a shared CSV-export affordance (Orders/Verify already export ad-hoc). [P1, partially done]
6. ~~**Confirmations**~~ — **Done (core).** Added a shared promise-based confirm system: `components/ui/ConfirmProvider.tsx` (`useConfirm()`), mounted in `app/admin/layout.tsx`. Converted destructive `window.confirm` gates to it in: organizer ban/disable, event bulk-delete, bank-verification approve, verification bulk-approve + single approve, security index-rebuild, and withdrawal approve/reject (payment). **Feedback `alert(...)` fully migrated to Toasts** across all admin flows (16 components, ~20 alerts) — verify, security, withdrawals, events console + detail sheet, bank verification, disbursements, verify-organizer form, and the review screen. Zero raw `alert()` remain in admin.
7. **Responsiveness/accessibility** — code-based audit completed (browser screenshots render at a fixed ~1555px so true-mobile visual verification wasn't possible; audited the responsive class system + a11y attributes instead). Findings — **no viewport-breaking issues**:
   - Top nav: horizontal `overflow-x-auto` scroll on mobile; `aria-label="Admin"`; all icon links have `aria-label` (Dev tools/Security/Settings/Account) + `focus-visible` rings.
   - Tables (payouts/disbursements/withdrawals): wrapped in `overflow-x-auto`; WithdrawalsView has an `md:hidden` mobile-card fallback.
   - Event detail sheet: `w-full sm:w-[600px] lg:w-[700px]` (full-width on mobile).
   - KPI strips: dashboard uses `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`; orders uses `grid-cols-2 sm:grid-cols-4`. No non-responsive 4/5/6-col grids.
   - Confirm dialog: focus-trapped, Esc-closable, `role="alertdialog"`.
   - Minor (optional): the 3-up `grid-cols-3 divide-x` stat strips (users/organizers/security/etc.) are tight but functional at 390px; left as-is to avoid unverified layout regressions.
   - **Contrast measured & fixed:** computed WCAG ratios of the muted-text tokens on `#0a0a0a` — `text-white/40` (3.77:1) and `text-white/45` (4.48:1) **failed AA** (4.5:1) for normal text. Bumped both to `text-white/50` (5.37:1, passes AA) across admin + the shared `components/ui` kit + the globals placeholder color (181 instances). All muted text now ≥ 5.37:1.
   - **Interactive DOM audit (live, via Chrome) — dashboard, orders, analytics:**
     - Accessible names: **0** nameless interactive controls (39 on the dashboard), **0** unlabeled inputs, **0** images missing `alt`. Landmarks present (`main`, `nav`, single `h1` per page).
     - **Heading order fixed:** dashboard was `h1, h3, h3, h3, h3, h2` (skipped h2). Promoted the dashboard section headings to `h2` (`AdminActivityFeed`, `WorkQueueCard`, daily-stats note) → now `h1, h2, …`. Orders (`h1,h2`) and analytics (`h1,h2,h3,h4…`, no skips) verified clean.
     - **Analytics tabs ARIA completed:** tabs had `role="tab"` in a `role="tablist"` but the panels weren't wired. Added `role="tabpanel"` + `id`/`aria-labelledby` to all 6 panels and `id`/`aria-controls` on the tabs (full WAI-ARIA tabs pattern).
   Remaining for a full WCAG pass: hands-on screen-reader (VoiceOver/NVDA) walkthrough on real AT — can't be automated from here. [largely done]
8. **Tests** — in progress (Jest 30 confirmed working after `npm install` fixed a stale jest-25 node_modules). Added & passing (30 tests green) + a new security suite:
   - `__tests__/currency.test.ts` — `formatCurrency` regression (Orders crash: invalid/lowercase/missing currency, non-finite amounts).
   - `__tests__/unit/components/confirm-provider.test.tsx` — confirm dialog resolves true/false + window.confirm fallback.
   - `__tests__/unit/lib/auth-rules.test.ts` — **permission enforcement**: extracted pure decision helpers `lib/auth-rules.ts` (`evaluateAdminAccess`/`evaluateSuperAdminAccess`/`evaluateDevToolsAccess`) that `requireAdmin`/`requireSuperAdmin`/`requireDevTools` now delegate to (behavior preserved). Covers: deny unauthenticated, role + allow-list, super-admin-only, and dev-tools prod/non-prod gating.
   - `__tests__/unit/lib/event-moderation.test.ts` — **event-moderation workflow**: extracted pure tab logic `lib/admin/event-moderation.ts` (`eventMatchesTab`/`filterEventsByTab`/`getEventTabCounts`) that the moderation console now uses; covers pending/published/reported/unpublished filtering + tab counts + empty list.
   - Payout-action logic is already covered by the pre-existing `__tests__/unit/lib/payout-validation.test.ts`.
   Test suite total after this work: 200+ passing (Jest 30); Playwright e2e excluded from Jest via `testPathIgnorePatterns`. [done for this scope]

## 6b. Information-architecture review (people / verification clusters)

**Organizers list (`/admin/organizers`) — refactored this pass.** Removed: the "Total Users" stat (belongs on Users, not here) and the dead "Role" column (every row is `organizer`), plus the confusing dual row-links. Added: organizer-relevant stats (Organizers / Verified / Not verified), a **search** box (name/email), and a **verification filter** (All / Verified / Pending / Not verified). Each row now links once to the organizer admin (`/admin/organizers/[id]`) with a "Manage" affordance.

**Overlaps & recommendations (need product decision — they change nav/URLs):**

1. **`/admin/users` ⊃ `/admin/organizers` (strong overlap).** Both list people and (before this pass) showed identical stat cards. Recommendation: **merge the two list pages into one "People" page** with a role filter (All / Organizers / Verified / Admins) + search, eliminating the duplicate. Keep BOTH detail pages — they're genuinely different: `/admin/users/[id]` = general account (+ promote to organizer); `/admin/organizers/[id]` = organizer **operations** (payouts, bank, verification, ban/disable). Lower-effort alternative (done now): keep `/admin/organizers` as a filtered, organizer-specific view with its own search/filter.

2. **`/admin/verify` (identity) + `/admin/bank-verifications` (bank) — combine.** Both are review queues. Recommendation: one **"Verifications" hub** with `Identity` / `Bank` tabs, and drop the separate "Bank" top-nav item (fold it into Verifications). Reduces top-nav from 9 to 8 and groups related review work.

3. **Payments cluster — already consolidated (good).** `/admin/payouts` → `/admin/disbursements`; `/admin/withdrawals` → `/admin/disbursements#withdrawals`. Keep as redirects.

4. **Dev tools — already gated** (super_admin in prod) and kept out of the primary nav. Keep.

**Split candidates:** none pressing. `/admin/disbursements` is dense (dashboard + withdrawals + pending payouts in one) but is intentionally the consolidated hub; revisit only if it grows.

## 7. Verification commands

```
npx tsc --noEmit        # type check (used throughout; currently 0 errors)
npm run build           # production build (run in user env; sandbox cannot)
npm run lint            # eslint (user env)
npm test                # unit/integration (user env)
```
