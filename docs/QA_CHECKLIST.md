# Tikèm — Pre-Launch QA Checklist

Run this on a real device or the simulator against the current build. **Reload the app first** (Metro reload / reinstall) so you're on the latest bundle.

Legend: **[CRITICAL]** = writes money/tickets/data, must pass before launch · **[UX]** = should work, not a hard blocker.

Preconditions:
- Signed in as an organizer whose account owns at least one test event (ideally one paid + one free/RSVP).
- Backend = `eventhaiti.vercel.app` (per `mobile/.env`). `firestore.rules` deployed.

---

## 1. Auth & session
- [ ] **[CRITICAL]** Cold-start the app → you stay signed in (no logout on relaunch).
- [ ] Sign out → login screen shows centered `tikèm` wordmark, email/password, Google, and (on a real device build) Sign in with Apple.
- [ ] Sign back in with email/password → lands on the app.

## 2. Create event (flyer-first canvas)
- [ ] **[CRITICAL]** Create → "Sell tickets" → fill title, upload a flyer, set Start date → **End date auto-fills to the same day**; set Start time → End time = +1hr.
- [ ] Location (Haiti): **Département → City → Commune** cascade works; typing in commune filters suggestions. Switch country to US/France → falls back to flat city list.
- [ ] Add a ticket tier; toggle **Free** (price → 0, hidden) and **Unlimited** (qty hidden, shows "Unlimited"); add a description.
- [ ] Advanced settings: **Repeats** (Daily/Weekly/Monthly + count OR until-date), **Show on Explore**, **promo video**, **Show guest list**, **Password-protect** (code ≥6 chars required), **Poster theme** swatches, per-tier **sale window** + **validity window**.
- [ ] **[CRITICAL]** Save → publish. Event appears in your events list and (if Show-on-Explore on) in Discover.
- [ ] **Recurring:** publish a Monthly series starting Jan 31 → verify the Feb occurrence lands on 28/29 (not Mar), and N events are created sharing a series.
- [ ] **Edit** an event → "Apply changes to all events in this series" updates siblings' non-date fields only.

## 3. Purchase & payment  **[CRITICAL]**
- [ ] Open a published paid event as an attendee → tiers show correct prices (HTG shows "HTG", not "$").
- [ ] **Sale window:** a tier with a future sale-start shows "On sale {date}" and is not buyable; past sale-end shows "Sales ended".
- [ ] **Password event:** attendee sees the 🔒 code gate; wrong code rejected; correct code unlocks and lets purchase proceed.
- [ ] Buy a ticket with **MonCash** end-to-end → payment completes, ticket appears in Tickets.
- [ ] **Free/RSVP** event → claim a free ticket → appears in Tickets.
- [ ] Visibility: turn **Show on Explore** OFF on an event → it disappears from Discover/Home but is still reachable by direct link.

## 4. Check-in (day-of)  **[CRITICAL]**
- [ ] **Scan tab** → pick event → scan a valid ticket QR → check-in succeeds; scan again → "already checked in".
- [ ] **Validity window:** scan a ticket outside its tier's valid window → **hard block** shown with a reason, Confirm disabled, but "Override — check in anyway" still works.
- [ ] **Manual check-in:** Event → Attendees → search a name/email → tap **Check in** → row flips to checked-in (works even without scanning a QR).

## 5. Payouts  **[CRITICAL — money]**
- [ ] Earnings screen: if identity not verified → shows verify CTA. If verified but **no payout method** → shows **"Set up payouts"** CTA (not a raw error).
- [ ] Payout Settings → **Add Mobile Money (MonCash)** → enter name + phone → **Save succeeds** (this used to be a dead "Coming Soon" stub).
- [ ] Payout Settings → **Add Bank** → **Bank Name is a dropdown** of Haiti banks (+ "Other" → free text) → save; verification flow opens.
- [ ] **Payout history** tab lists past payouts (or empty state) with amount/method/status/date.
- [ ] Attempt a MonCash withdrawal → **no scary red error box**; if prefunding not live you get a clean message (expected — prefunding pending creds).

## 6. Team & staff  **[CRITICAL — access control]**
- [ ] Dashboard → **Team** (top-level) → lists your events → tap one → its team screen.
- [ ] Invite staff by email and by link → invite appears under Pending.
- [ ] Member row: **Can view attendee list** toggle → flips and persists (reopen screen to confirm); owner row has no toggle.
- [ ] Remove a member / revoke an invite → updates.

## 7. Comps (free tickets)  **[CRITICAL — issues tickets]**
- [ ] Event → **Free Tickets** → recipient name + tier + quantity + note → **Issue** → success; issued comps appear in the list.
- [ ] If you enter a recipient email → they receive a **ticket email with a QR** (check the inbox).
- [ ] Scan a comp's QR at check-in → admits like a normal ticket.

## 8. Other organizer screens  **[UX]**
- [ ] **Analytics:** neutral stat cards (no big green card), the sales chart highlights the peak / shows "No sales yet in this range" when empty, Best Day / Published insight row.
- [ ] **Refunds:** request list shows correct amounts (HTG) + status chips; approve/deny works.
- [ ] **Promo codes:** create / activate / deactivate.
- [ ] **Send Event Update:** message all attendees.
- [ ] **Dashboard Quick Actions:** 2×3 grid — Analytics, Refunds, Payouts, Team, Scan, Create — each navigates correctly.
- [ ] **Profile → Legal:** Terms / Privacy / Refund Policy / Support links all open (live web pages).

## 9. Localization  **[UX]**
- [ ] Switch language to Français and Kreyòl → key organizer screens (create, payouts, team, analytics) render translated; dates format per language.

---

## Known limitations (NOT bugs — do not file)
- **Instant payouts (prefunding)** don't transact until MonCash credentials go live; standard payout path works meanwhile.
- **Domain** `tikem.co` not yet pointed — links use `eventhaiti.vercel.app` until the env var is switched.
- **Comps / permission / withdrawal writes** were code-reviewed + typecheck-clean but this QA pass is their first runtime exercise — watch these closely.

## If something fails
Capture the exact error text (red box message or Metro terminal line) and the screen/step. That pinpoints the fix fast.
