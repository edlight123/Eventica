# Payment & Payout System - Complete Flow Diagram

## 🎫 Customer Purchase Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER PURCHASE FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Browse & Select Tickets
┌──────────────┐
│ Event Page   │  User views event details
│              │  Sees ticket tiers (VIP, General, etc.)
│ [Buy Button] │  Selects quantity for each tier
└──────┬───────┘
       │
       ├─ POST /api/orders/create
       │  { eventId, items: [{ ticketTypeId, quantity }] }
       │
       ↓
┌──────────────┐
│ Order        │  OrderStatus: 'pending'
│ Created      │  Items: [{ ticketType, quantity, price }]
│              │  Total calculated (subtotal + fees)
└──────┬───────┘
       │
       ↓

Step 2: Checkout Page
┌──────────────────────────────────────┐
│ /checkout/[orderId]                  │
│                                      │
│ ┌──────────────────────────────┐   │
│ │ Order Summary                 │   │
│ │ 2x VIP Tickets    $100.00    │   │
│ │ 1x General        $50.00     │   │
│ │ ───────────────────────────  │   │
│ │ Total             $150.00    │   │
│ └──────────────────────────────┘   │
│                                      │
│ ┌──────────────────────────────┐   │
│ │ Stripe Payment Element        │   │
│ │ [Card Number Field]           │   │
│ │ [Expiry] [CVC] [ZIP]         │   │
│ │                               │   │
│ │ [Pay $150.00 Button]          │   │
│ └──────────────────────────────┘   │
└──────────────┬───────────────────────┘
               │
               ├─ stripe.confirmPayment()
               │  Uses clientSecret from PaymentIntent
               │
               ↓

Step 3: Payment Processing
┌──────────────┐
│ Stripe       │  Payment Intent: 'processing'
│ Processing   │  ↓
│              │  Payment Intent: 'succeeded'
└──────┬───────┘
       │
       ├─ Webhook: payment_intent.succeeded
       │  POST /api/webhooks/stripe
       │
       ↓
```

## 🔄 Backend Processing (Webhook)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK PROCESSING FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Stripe Webhook Handler
┌─────────────────────────────────────────┐
│ POST /api/webhooks/stripe               │
│                                         │
│ 1. Verify signature                     │
│ 2. Parse payment_intent.succeeded       │
│ 3. Extract metadata                     │
└────────────┬────────────────────────────┘
             │
             ├─ metadata: { eventId, userId, quantity, tierIds }
             │
             ↓
             
Step 1: Update Order Status
┌─────────────────────────────────────────┐
│ orders.update({ status: 'paid' })       │
└────────────┬────────────────────────────┘
             │
             ↓
             
Step 2: Create Tickets (Loop for each quantity)
┌─────────────────────────────────────────┐
│ for (i = 0; i < quantity; i++) {        │
│   ticket = {                            │
│     id: uuid()                          │
│     event_id: eventId                   │
│     attendee_id: userId                 │
│     price_paid: pricePerTicket          │
│     payment_id: paymentIntentId         │
│     payment_method: 'stripe'            │
│     status: 'valid'                     │
│     qr_code_data: generateQR()          │
│     purchased_at: now()                 │
│   }                                     │
│   tickets.create(ticket)                │
│ }                                       │
└────────────┬────────────────────────────┘
             │
             ↓
             
Step 3: Update Event Ticket Count
┌─────────────────────────────────────────┐
│ events.update({                         │
│   tickets_sold: tickets_sold + quantity │
│ })                                      │
│                                         │
│ ticket_tiers.update({                   │
│   sold_quantity: sold + quantity        │
│ })                                      │
└────────────┬────────────────────────────┘
             │
             ↓

Step 4: Update Event Earnings (NEW!)
┌──────────────────────────────────────────────────────────┐
│ import { addTicketToEarnings } from '@/lib/earnings'     │
│                                                          │
│ await addTicketToEarnings(                              │
│   eventId,                                              │
│   totalAmount,    // e.g., 15000 cents ($150)          │
│   quantity        // e.g., 3 tickets                    │
│ )                                                       │
│                                                          │
│ Internally:                                             │
│ ┌────────────────────────────────────────────────┐     │
│ │ grossSales      += 15000                       │     │
│ │ platformFee     += 1500  (10%)                 │     │
│ │ processingFee   += 465   (2.9% + $0.30)       │     │
│ │ netAmount       += 13035                       │     │
│ │ availableToWith += 13035                       │     │
│ │ ticketsSold     += 3                           │     │
│ └────────────────────────────────────────────────┘     │
│                                                          │
│ Creates or updates: event_earnings document             │
└────────────┬─────────────────────────────────────────────┘
             │
             ↓
             
Step 5: Send Notifications
┌─────────────────────────────────────────┐
│ sendEmail(ticketConfirmation)           │
│ sendWhatsApp(ticketDetails)             │
│ notifyOrganizer(newSale)                │
└─────────────────────────────────────────┘

✅ Purchase Complete!
```

## 💰 Organizer Earnings View

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORGANIZER EARNINGS DASHBOARD                      │
└─────────────────────────────────────────────────────────────────────┘

GET /organizer/earnings
↓
Calls: getOrganizerEarningsSummary(organizerId)
↓

┌───────────────────────────────────────────────────────────────────┐
│  Earnings Dashboard                                               │
│                                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Total       │ │ Net Amount  │ │ Available   │ │ Withdrawn │ │
│  │ Earnings    │ │             │ │             │ │           │ │
│  │             │ │             │ │             │ │           │ │
│  │ $10,000.00  │ │ $8,680.00   │ │ $5,000.00   │ │$3,680.00  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                   │
│  Events                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Event Name      Date       Tickets  Gross    Net   Avail  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Summer Fest    Jun 15      150    $7,500  $6,510  $6,510 │  │
│  │ ● ready                                                    │  │
│  │                                                            │  │
│  │ Spring Concert Apr 20       50    $2,500  $2,170  $0     │  │
│  │ ● locked (withdrawn)                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘

Query:
┌────────────────────────────────────────────────────────────┐
│ event_earnings                                             │
│   .where('organizerId', '==', currentUserId)              │
│   .orderBy('createdAt', 'desc')                           │
│                                                            │
│ For each earning:                                          │
│   - Fetch event details (title, date)                     │
│   - Calculate totals                                       │
│   - Show settlement status                                 │
└────────────────────────────────────────────────────────────┘
```

## 💸 Withdrawal Flow (Haiti)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WITHDRAWAL FLOW (HAITI)                         │
└─────────────────────────────────────────────────────────────────────┘

Step 1: View Event Earnings
┌────────────────────────────────────────────────────────┐
│ /organizer/events/[eventId]/earnings                   │
│                                                        │
│ Event: Summer Festival                                 │
│ Date: June 15, 2024                                   │
│                                                        │
│ ┌──────────────────────────────────────────────┐     │
│ │ Tickets Sold: 150                             │     │
│ │ Gross Sales:  $7,500.00                      │     │
│ │ Platform Fee: -$750.00 (10%)                 │     │
│ │ Stripe Fee:   -$240.00 (2.9% + $0.30)       │     │
│ │ Net Amount:   $6,510.00                      │     │
│ └──────────────────────────────────────────────┘     │
│                                                        │
│ ┌──────────────────────────────────────────────┐     │
│ │ 💰 Available to Withdraw                      │     │
│ │                                               │     │
│ │        $6,510.00 HTG                         │     │
│ │                                               │     │
│ │ Status: ● ready                              │     │
│ │ (Funds available 7 days after event)         │     │
│ └──────────────────────────────────────────────┘     │
│                                                        │
│ [Withdraw via MonCash] [Withdraw to Bank]            │
└────────────────────┬───────────────────────────────────┘
                     │
                     ├─ User clicks "Withdraw via MonCash"
                     │
                     ↓

Step 2: Withdrawal Modal
┌────────────────────────────────────────────────────────┐
│ 💸 Withdraw to MonCash                                 │
│                                                        │
│ MonCash Phone: +509 **** 5678                        │
│ Full Name: Jean Baptiste                             │
│                                                        │
│ Amount: HTG 6,510.00                                 │
│                                                        │
│ Fee: HTG 195.30 (3%)                                 │
│ You'll receive: HTG 6,314.70                         │
│                                                        │
│ [Cancel] [Confirm Withdrawal]                         │
└────────────────────┬───────────────────────────────────┘
                     │
                     ├─ POST /api/organizer/withdraw-moncash
                     │  { eventId, amount: 651000 }
                     │
                     ↓

Step 3: Backend Processing
┌──────────────────────────────────────────────────────────────┐
│ 1. Validate:                                                 │
│    ✓ Settlement status = 'ready'                            │
│    ✓ Available balance >= amount                            │
│    ✓ Payout config active                                   │
│    ✓ No pending payout exists                               │
│                                                              │
│ 2. Call withdrawFromEarnings():                             │
│    event_earnings.update({                                  │
│      availableToWithdraw: 6510 - 6510 = 0                 │
│      withdrawnAmount: 0 + 6510 = 6510                      │
│      settlementStatus: 'locked'                             │
│    })                                                       │
│                                                              │
│ 3. Create payout request:                                   │
│    organizers/{id}/payouts.create({                        │
│      amount: 651000                                         │
│      status: 'pending'                                      │
│      method: 'mobile_money'                                 │
│      scheduledDate: nextFriday()                            │
│      ticketIds: [...all ticket IDs]                        │
│    })                                                       │
│                                                              │
│ 4. Create event link:                                       │
│    payouts/{id}/event_links.create({                       │
│      eventId, amount, ticketIds                            │
│    })                                                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓

Step 4: Admin Approval Workflow
┌────────────────────────────────────────────────────────┐
│ Admin Dashboard: /admin/payouts                        │
│                                                        │
│ Pending Payout:                                        │
│ Organizer: Jean Baptiste                              │
│ Amount: HTG 6,510.00                                  │
│ Method: MonCash (+509 **** 5678)                     │
│ Event: Summer Festival                                │
│                                                        │
│ [Approve] [Decline]                                   │
└────────────────────┬───────────────────────────────────┘
                     │
                     ├─ Admin clicks "Approve"
                     │  POST /api/admin/payouts/approve
                     │
                     ↓
┌────────────────────────────────────────────────────────┐
│ payout.update({                                        │
│   status: 'processing',                               │
│   approvedBy: adminUserId,                            │
│   approvedAt: now()                                   │
│ })                                                     │
│                                                        │
│ TODO: Call MonCash API                                │
│ - Transfer HTG 6,510 to +509 **** 5678               │
│ - Get transaction reference                           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ↓

Step 5: Complete & Receipt
┌────────────────────────────────────────────────────────┐
│ Admin uploads receipt                                  │
│ POST /api/admin/upload-receipt                        │
│                                                        │
│ payout.update({                                        │
│   status: 'completed',                                │
│   completedAt: now(),                                 │
│   paymentReferenceId: 'MCH123456',                   │
│   receiptUrl: 'storage/receipts/...'                 │
│ })                                                     │
│                                                        │
│ Send notification to organizer                         │
└────────────────────────────────────────────────────────┘

✅ Withdrawal Complete!
```

## 🌎 US/CA Flow (Stripe Connect)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  STRIPE CONNECT FLOW (US/CA)                         │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Account Location Selection
┌────────────────────────────────────────────────────────┐
│ /organizer/settings/payouts                            │
│                                                        │
│ Account Location: [United States ▼]                   │
│                                                        │
│ → Automatically shows Stripe Connect option           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ↓

Step 2: Stripe Connect Onboarding
┌────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐     │
│ │ 🔵 Stripe Payouts                             │     │
│ │                                               │     │
│ │ Status: Not Connected                         │     │
│ │                                               │     │
│ │ Connect your bank account via Stripe to      │     │
│ │ receive automatic payouts.                    │     │
│ │                                               │     │
│ │ [Connect with Stripe]                         │     │
│ └──────────────────────────────────────────────┘     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ├─ POST /api/organizer/stripe-connect/create
                     │  Creates Stripe Connect account
                     │  Returns onboardingUrl
                     │
                     ↓
┌────────────────────────────────────────────────────────┐
│ Redirect to Stripe Onboarding                          │
│                                                        │
│ User completes:                                        │
│ - Business information                                │
│ - Tax ID (SSN/EIN)                                    │
│ - Bank account details                                │
│ - Identity verification                               │
│                                                        │
│ → Redirects back to app                               │
└────────────────────┬───────────────────────────────────┘
                     │
                     ↓

Step 3: Connected State
┌────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐     │
│ │ 🔵 Stripe Payouts                             │     │
│ │                                               │     │
│ │ Status: ✓ Connected & Verified               │     │
│ │                                               │     │
│ │ Bank: Chase ****1234                         │     │
│ │ Payout Schedule: Daily                        │     │
│ │                                               │     │
│ │ [Manage in Stripe Dashboard]                  │     │
│ └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘

Step 4: Automatic Payouts
┌────────────────────────────────────────────────────────┐
│ Event earnings tracked same way                        │
│                                                        │
│ Instead of withdrawal button:                          │
│ ┌──────────────────────────────────────────────┐     │
│ │ ℹ️  Automatic Payout                          │     │
│ │                                               │     │
│ │ Your earnings will be automatically           │     │
│ │ transferred to your bank account via Stripe   │     │
│ │ according to your payout schedule.            │     │
│ │                                               │     │
│ │ Next payout: $6,510.00 on Jun 22            │     │
│ └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘

Note: Stripe handles:
- Settlement timing
- Bank transfers
- Tax reporting (1099-K)
- Dispute reserves
- KYC/verification
```

## ⏰ Settlement Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT STATUS LIFECYCLE                       │
└─────────────────────────────────────────────────────────────────────┘

🎫 Ticket Purchased
     │
     ├─ event_earnings.create()
     │  settlementStatus: 'pending'
     │  settlementReadyDate: event.end_datetime + 7 days
     │
     ↓

⏳ PENDING
   "Funds held for refund window"
   
   Day 0: Event starts
   Day 1-6: Event ongoing or recently ended
   
   Earnings visible but not withdrawable
   
     │
     ├─ Daily cron job checks:
     │  if (now > settlementReadyDate) {
     │    settlementStatus = 'ready'
     │  }
     │
     ↓

✅ READY
   "Available for withdrawal"
   
   Day 7+: After event + refund window
   
   Organizer can:
   - View earnings
   - Request withdrawal
   - See available balance
   
     │
     ├─ Organizer clicks "Withdraw"
     │  withdrawFromEarnings()
     │
     ↓

🔒 LOCKED
   "Withdrawal in progress or completed"
   
   When:
   - Payout requested (pending approval)
   - Payout approved (processing)
   - Fully withdrawn (completed)
   
   availableToWithdraw = 0
   withdrawnAmount = full net amount
```

## 📊 Fee Calculation Example

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FEE CALCULATION                               │
└─────────────────────────────────────────────────────────────────────┘

Example: $50 ticket, 3 tickets sold

Input:
  Ticket Price: $50.00 per ticket
  Quantity: 3 tickets
  
Calculations:

  Gross Sales:
    3 × $50.00 = $150.00  (15,000 cents)

  Platform Fee (10%):
    $150.00 × 0.10 = $15.00  (1,500 cents)
    Minimum: $0.50
    Actual: $15.00 ✓

  Stripe Processing Fee (2.9% + $0.30):
    $150.00 × 0.029 = $4.35
    Fixed: $0.30
    Total: $4.35 + $0.30 = $4.65  (465 cents)

  Net to Organizer:
    $150.00 - $15.00 - $4.65 = $130.35  (13,035 cents)

Database:
  event_earnings {
    grossSales: 15000
    platformFee: 1500
    processingFees: 465
    netAmount: 13035
    availableToWithdraw: 13035
    withdrawnAmount: 0
  }

Display to Organizer:
  ┌─────────────────────────────┐
  │ Gross Sales    $150.00      │
  │ Platform Fee    -$15.00     │
  │ Processing Fee   -$4.65     │
  │ ─────────────────────────── │
  │ Net Amount     $130.35      │
  └─────────────────────────────┘
  
Percentage to Organizer: 86.9%
```

## 🔄 Complete System Overview

```
                         Eventica Payment System
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                                │
┌───▼────┐                                                    ┌──────▼───┐
│Customer│                                                    │Organizer │
│  Flow  │                                                    │   Flow   │
└───┬────┘                                                    └──────┬───┘
    │                                                                │
    ├─ 1. Browse Events                                            ├─ A. View Earnings
    ├─ 2. Select Tickets                                           ├─ B. Setup Payout
    ├─ 3. Checkout                                                 ├─ C. Complete KYC
    ├─ 4. Pay with Stripe                                          ├─ D. Request Withdrawal
    │                                                                │
    ↓                                                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Firebase)                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Orders Collection          Tickets Collection      Event Earnings    │
│  ┌──────────────┐          ┌──────────────┐        ┌──────────────┐  │
│  │ status       │          │ price_paid   │        │ grossSales   │  │
│  │ items[]      │──────────│ payment_id   │────────│ platformFee  │  │
│  │ total        │          │ event_id     │        │ processing   │  │
│  │ paymentIntent│          │ status       │        │ netAmount    │  │
│  └──────────────┘          └──────────────┘        └──────────────┘  │
│                                                                        │
│                         Stripe Webhook                                 │
│                      ┌──────────────────┐                             │
│                      │ payment_intent   │                             │
│                      │   .succeeded     │                             │
│                      └────────┬─────────┘                             │
│                               │                                        │
│                               ├─ Create Tickets                        │
│                               ├─ Update Earnings                       │
│                               ├─ Send Emails                           │
│                               └─ Notify Organizer                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
    │                                                                │
    ↓                                                                ↓
┌────────────────────┐                                    ┌──────────────────┐
│ Tickets Delivered  │                                    │ Payout Processing│
│ - Email with QR    │                                    │ - Admin Approval │
│ - WhatsApp         │                                    │ - MonCash/Bank   │
│ - App Dashboard    │                                    │ - Receipt Upload │
└────────────────────┘                                    └──────────────────┘
```

---

**Visual Summary:** 
- Customer purchases trigger automatic earnings tracking
- Earnings broken down by event with transparent fees
- Settlement hold enforced (7 days)
- Withdrawal requests go through admin approval
- US/CA uses Stripe Connect for automatic payouts
- Haiti uses MonCash/Bank with manual processing
