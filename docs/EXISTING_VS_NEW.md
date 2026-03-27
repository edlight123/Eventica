# Payment System - What's Already Built vs What's New

This document shows what you can reuse from your existing Eventica codebase versus what needs to be added.

## ✅ Already Implemented (Reuse As-Is)

### 1. Payment Processing Infrastructure
- ✅ **Stripe Integration** (`app/api/create-payment-intent/route.ts`)
  - Creates payment intents
  - Handles currency conversion (HTG → USD)
  - Supports ticket tiers
  - Promo code support

- ✅ **Webhook Handler** (`app/api/webhooks/stripe/route.ts`)
  - Verifies Stripe signatures
  - Creates tickets automatically
  - Generates QR codes
  - Sends email confirmations
  - Updates ticket counts

- ✅ **Ticket Generation** (Automated)
  - QR code generation
  - Email delivery
  - WhatsApp notifications
  - Ticket transfer system

### 2. Payout Infrastructure
- ✅ **Payout Configuration** (`lib/firestore/payout.ts`)
  - Bank details storage (masked)
  - MonCash/Natcash configuration
  - Mobile money support
  - Verification status tracking

- ✅ **Payout Requests** (`app/api/organizer/request-payout/route.ts`)
  - Balance checking
  - Idempotency guards
  - Ticket ID tracking
  - Scheduled payouts (Fridays 5 PM)

- ✅ **Admin Workflow** (Multiple APIs)
  - Approve payouts
  - Decline payouts
  - Mark as paid
  - Upload receipts

- ✅ **Payout Dashboard** (`app/organizer/payouts/PayoutDashboard.tsx`)
  - Balance display
  - Request withdrawal button
  - Payout history table
  - Status badges

### 3. Database Collections (Firestore)
- ✅ **`tickets`** - All purchases tracked
  - `price_paid`, `payment_id`, `payment_method`
  - `status`, `purchased_at`, `currency`
  
- ✅ **`events`** - Event management
  - `organizer_id`, `title`, `start_datetime`
  - `currency`, `status`
  
- ✅ **`ticket_tiers`** - Tiered pricing
  - `name`, `price`, `total_quantity`, `sold_quantity`
  
- ✅ **`users`** - User accounts
  - `role`, `email`, `is_verified`
  
- ✅ **`organizers/{id}/payoutProfiles/{haiti|stripe_connect}`** - Payout profiles (primary)
- ✅ **`organizers/{id}/payoutConfig/main`** - Legacy payout settings (backward compatibility)
- ✅ **`organizers/{id}/payouts/`** - Payout history

### 4. Security & Validation
- ✅ **Fraud Prevention** (`lib/security.ts`)
  - IP blacklisting
  - Rate limiting
  - Bot detection
  - Purchase attempt logging
  
- ✅ **Verification System**
  - KYC document uploads
  - Government ID verification
  - Phone number verification

## 🆕 What Needs to Be Added

### 1. Core Data Structures

#### NEW: `orders` Collection
**Purpose:** Track checkout sessions before payment

```typescript
{
  id: string
  userId: string | null
  eventId: string
  items: OrderItem[]              // Multiple ticket types
  subtotal: number
  total: number
  status: 'pending' | 'paid'
  stripePaymentIntentId: string
  createdAt: string
}
```

**Why:** Currently, payment intents are created directly from ticket selection. An order provides:
- Shopping cart functionality
- Support for multiple ticket types in one purchase
- Order history for customers
- Better tracking for refunds

#### NEW: `event_earnings` Collection
**Purpose:** Aggregate revenue per event for organizers

```typescript
{
  id: string
  eventId: string
  organizerId: string
  grossSales: number              // Total revenue
  platformFee: number             // 10% commission
  processingFees: number          // Stripe fees
  netAmount: number               // What organizer gets
  availableToWithdraw: number     // Not yet withdrawn
  withdrawnAmount: number         // Already paid out
  settlementStatus: 'pending' | 'ready' | 'locked'
  settlementReadyDate: string     // 7 days after event
  currency: 'HTG' | 'USD'
}
```

**Why:** Currently, organizers can request payouts, but there's no:
- Per-event earnings breakdown
- Fee transparency (platform vs processing)
- Settlement hold logic (7-day refund window)
- Available vs withdrawn tracking

#### NEW: `organizers/{id}/payouts/{id}/event_links` Subcollection
**Purpose:** Link payouts to specific events

```typescript
{
  id: string
  payoutId: string
  eventId: string
  amount: number
  ticketIds: string[]
}
```

**Why:** Prevents double-withdrawals and provides audit trail

### 2. Libraries & Utilities

#### NEW: `lib/fees.ts`
**Purpose:** Centralized fee calculations

**Functions:**
- `calculatePlatformFee(grossAmount)` - 10% fee
- `calculateStripeFee(grossAmount)` - 2.9% + $0.30
- `calculateFees(grossAmount)` - Complete breakdown
- `formatCurrency(cents, currency)` - Display formatting
- `calculateSettlementDate(eventDate)` - 7 days after event
- `meetsMinimumPayout(amount)` - $50 minimum check

**Why:** Currently, fees are scattered or not calculated. This centralizes:
- Consistent fee calculations across the platform
- Easy fee adjustment (change in one place)
- Clear documentation of fee structure

#### NEW: `lib/earnings.ts`
**Purpose:** Manage event earnings

**Functions:**
- `addTicketToEarnings(eventId, amount, quantity)` - Auto-update on purchase
- `withdrawFromEarnings(eventId, amount, payoutId)` - Process withdrawal
- `refundTicketFromEarnings(eventId, amount)` - Handle refunds
- `updateSettlementStatus(eventId)` - Check if 7 days passed
- `getOrganizerEarningsSummary(organizerId)` - Dashboard data
- `getWithdrawableEvents(organizerId)` - Events with available funds
- `getTotalAvailableBalance(organizerId)` - Total across all events

**Why:** Currently, there's no automatic earnings tracking. This provides:
- Real-time balance updates
- Automatic fee deductions
- Settlement date enforcement
- Multi-event withdrawal support

### 3. API Routes

#### NEW: Order Management
```
POST /api/orders/create                    - Create order from cart
POST /api/orders/create-payment-intent     - Link order to Stripe
GET  /api/orders/[orderId]                 - Fetch order details
```

#### NEW: Earnings
```
GET  /api/organizer/earnings                      - List all earnings
GET  /api/organizer/events/[id]/earnings          - Single event earnings
POST /api/organizer/events/[id]/withdraw-moncash  - MonCash withdrawal
POST /api/organizer/events/[id]/withdraw-bank     - Bank withdrawal
```

#### NEW: Stripe Connect (US/CA)
```
POST /api/organizer/stripe-connect/create         - Create Connect account
GET  /api/organizer/stripe-connect/status         - Check account status
POST /api/organizer/stripe-connect/onboarding     - Get onboarding link
```

#### NEW: Automation
```
GET /api/cron/update-settlements  - Daily job to mark earnings as ready
```

### 4. UI Pages & Components

#### NEW: Customer Checkout
```
/checkout/[orderId]                 - Checkout page with Stripe Elements
/checkout/success                   - Success page
components/TicketSelector.tsx       - Enhanced with multiple tiers
```

#### NEW: Organizer Earnings
```
/organizer/earnings                               - Earnings dashboard (NEW)
/organizer/events/[id]/earnings                   - Per-event earnings (NEW)
components/earnings/EarningsSummary.tsx           - Summary cards
components/earnings/EventEarningsTable.tsx        - Events table
components/earnings/WithdrawModal.tsx             - Withdrawal dialog
```

#### ENHANCE: Payout Settings
```
/organizer/settings/payouts                       - Already exists
components/payout/AccountLocationSelector.tsx     - NEW: Choose HT/US/CA
components/payout/HaitiPayoutForm.tsx            - NEW: MonCash/Bank
components/payout/StripeConnectCard.tsx          - NEW: US/CA Connect
components/payout/KYCChecklist.tsx               - ENHANCE: Multi-region
```

### 5. Type Definitions

#### NEW: `types/orders.ts`
```typescript
Order, OrderItem, OrderStatus, CreateOrderRequest
```

#### NEW: `types/earnings.ts`
```typescript
EventEarnings, SettlementStatus, PayoutEventLink, 
EarningsSummary, FeeCalculation, FEE_CONFIG
```

## 🔄 Integration Points

### 1. Enhance Existing Webhook
**File:** `app/api/webhooks/stripe/route.ts`

**Current:** Creates tickets, sends emails
**Add:** Call `addTicketToEarnings()` after ticket creation

```typescript
// Add after tickets are created:
await addTicketToEarnings(
  session.metadata.eventId,
  session.amount_total,
  quantity
)
```

### 2. Enhance Existing Payout Request
**File:** `app/api/organizer/request-payout/route.ts`

**Current:** Requests payout with all available funds
**Add:** Use `getWithdrawableEvents()` and `withdrawFromEarnings()`

```typescript
// Replace balance check with:
const withdrawableEvents = await getWithdrawableEvents(organizerId)

// After creating payout, mark events:
for (const event of withdrawableEvents) {
  await withdrawFromEarnings(event.eventId, event.availableToWithdraw, payoutId)
}
```

### 3. Add to Organizer Dashboard
**File:** `app/organizer/page.tsx`

**Current:** Shows events, scans, analytics
**Add:** Link to new earnings dashboard

```tsx
<Link href="/organizer/earnings" className="...">
  <h3>Earnings & Payouts</h3>
  <p>View your earnings and request withdrawals</p>
</Link>
```

## 📊 Migration Strategy

### Phase 1: Core Earnings Tracking (Day 1)
1. ✅ Add `lib/fees.ts` and `lib/earnings.ts`
2. ✅ Enhance webhook to call `addTicketToEarnings()`
3. ✅ Create Firestore indexes for `event_earnings`
4. ✅ Test with new purchases

### Phase 2: Earnings UI (Day 2)
1. ✅ Create `/organizer/earnings` page
2. ✅ Show earnings table with fee breakdown
3. ✅ Add link from main dashboard

### Phase 3: Enhanced Withdrawals (Day 3)
1. ✅ Update payout request to use new earnings system
2. ✅ Create per-event earnings pages with withdrawal
3. ✅ Add Haiti-specific withdrawal options

### Phase 4: Orders & Checkout (Day 4-5)
1. ✅ Create `orders` collection
2. ✅ Build checkout page with Stripe Elements
3. ✅ Support multiple ticket types in one order

### Phase 5: Automation & Extras (Day 6-7)
1. ✅ Settlement status cron job
2. ✅ Stripe Connect for US/CA
3. ✅ Enhanced analytics

## 🎯 Backward Compatibility

**Good News:** All new features are additive. Existing functionality continues to work:

- ✅ Old tickets still work (no schema changes)
- ✅ Existing payouts still process normally
- ✅ Current organizers don't need to change anything
- ✅ New earnings tracking starts from implementation date

**For Historical Data:**

You can optionally backfill earnings for past tickets:

```typescript
// One-time migration script
async function backfillEarnings() {
  const tickets = await adminDb.collection('tickets')
    .where('status', '==', 'valid')
    .get()
  
  for (const ticket of tickets.docs) {
    const data = ticket.data()
    await addTicketToEarnings(
      data.event_id,
      data.price_paid,
      1
    )
  }
}
```

## 🚀 Deployment Checklist

### Before Code Changes
- [ ] Backup Firestore database
- [ ] Document current payout process
- [ ] Test in Firebase Emulator

### Code Deployment
- [ ] Add new libraries (`lib/fees.ts`, `lib/earnings.ts`)
- [ ] Add new types (`types/orders.ts`, `types/earnings.ts`)
- [ ] Enhance webhook handler
- [ ] Create earnings pages
- [ ] Add navigation links

### After Deployment
- [ ] Create Firestore indexes
- [ ] Test with real purchase
- [ ] Verify earnings calculations
- [ ] Test withdrawal flow
- [ ] Monitor for errors

### Optional (Later)
- [ ] Backfill historical earnings
- [ ] Set up cron job
- [ ] Add Stripe Connect
- [ ] Create admin earnings dashboard

## 📞 Support

For questions about existing vs new:

1. **Existing Payout System:** Check `lib/firestore/payout.ts`
2. **New Earnings System:** Check `lib/earnings.ts`
3. **Fee Calculations:** Check `lib/fees.ts`
4. **Complete Implementation:** Check `docs/PAYMENT_PAYOUT_IMPLEMENTATION_GUIDE.md`

---

**Summary:** Your existing system handles payments and payout requests well. The new system adds:
- Transparent earnings tracking per event
- Automatic fee calculations
- Settlement logic (7-day hold)
- Per-event withdrawal support
- Fee breakdown visibility
