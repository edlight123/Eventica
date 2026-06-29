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

1. **Disbursements hub** — polish `AdminDisbursementDashboard`, `WithdrawalsView`, `PayoutOperationsClient` to the system (payment-critical: presentational only). [P0]
2. **Verify queue** — bespoke pass on `VerificationRequestReview` (647 lines). [P1]
3. **Dev tools gating** — hide `/admin/dev/*` and debug/seed/migrate APIs behind an env/`super_admin` gate. [P1]
4. **Dead code** — remove `AdminSidebar.tsx` (+ `AdminKpiGrid` if unused). [P2]
5. **Tables** — converge all admin tables on one `DataTable` with shared filters/sort/pagination + URL-persisted filters + CSV export where relevant. [P1]
6. **Confirmations** — ensure all destructive actions (ban, refund, decline payout, delete) use a shared `ConfirmationDialog` (no `window.confirm/alert`). [P1]
7. **Responsiveness/accessibility** — audit at 1440/1280/1024/768/390; focus traps in drawers/modals, keyboard nav, contrast. [P1]
8. **Tests** — add coverage for route protection, event moderation, organizer status, order/refund, payout actions, form validation, destructive confirmations. [P1]

## 7. Verification commands

```
npx tsc --noEmit        # type check (used throughout; currently 0 errors)
npm run build           # production build (run in user env; sandbox cannot)
npm run lint            # eslint (user env)
npm test                # unit/integration (user env)
```
