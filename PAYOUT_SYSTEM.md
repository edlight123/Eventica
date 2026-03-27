# Payout System Documentation

## Overview

The payout system allows event organizers to configure how they receive payments from ticket sales. It includes verification workflows, balance tracking, payout history, and comprehensive fee transparency.

## Prefunding (Instant MonCash Payouts)

Eventica supports (optional) **instant mobile money payouts** using Digicel MonCash **prefunded** REST API.

How it works:
- The platform maintains a prefunded MonCash balance (funded in the Digicel business portal).
- When enabled, the platform can send payouts via `POST /Api/v1/Transfert` (Digicel spelling).
- Organizers still configure their payout method and phone number under `payoutConfig`.

Operational requirements:
- Digicel must enable prefunded/payout access for your business account.
- You must keep sufficient balance in the prefunded account.

Admin endpoints (protected):
- `GET /api/admin/moncash-prefunded/balance`
- `POST /api/admin/moncash-prefunded/transfer`
- `POST /api/admin/moncash-prefunded/status`

Feature flag/status:
- `config/payouts.prefunding.enabled` and `.available` are exposed to organizers via `GET /api/organizer/payout-prefunding-status`.

## Pages

### `/organizer/settings/payouts`

Main payout settings page accessible to organizers. Features:
- Payout status overview
- Balance summary (available, pending, next payout)
- Payout method configuration
- Verification checklist
- Transaction history
- Fee structure transparency

## Data Model

### Firestore Collections

#### `organizers/{organizerId}/payoutProfiles/{profileId}`

Payout settings are now stored as **profiles**, so a single organizer can support multiple payout rails:

- `payoutProfiles/haiti` (internal verification + bank/mobile money)
- `payoutProfiles/stripe_connect` (Stripe Connect account for US/CA)

These docs use the same shape as `PayoutConfig` (see `lib/firestore/payout.ts`), with the relevant fields populated per profile.

**Notes:**
- Haiti profile status is derived from `verificationDocuments/*` + `verification_requests/*`.
- Stripe Connect profile readiness is derived from the Stripe account status (charges/payouts enabled).

#### Legacy (backward compatibility)

#### `organizers/{organizerId}/payoutConfig/main`

This is the legacy singleton payout config. It may exist for older organizers, but new logic should prefer `payoutProfiles/*`.

#### `organizers/{organizerId}/payoutConfig/main`

```typescript
{
  status: 'not_setup' | 'pending_verification' | 'active' | 'on_hold',
  method?: 'bank_transfer' | 'mobile_money',
  bankDetails?: {
    accountName: string,
    accountNumber: string,  // masked: ****1234
    bankName: string,
    routingNumber?: string
  },
  mobileMoneyDetails?: {
    provider: 'moncash' | 'natcash',
    phoneNumber: string,    // masked: ****5678
    accountName: string
  },
  verificationStatus?: {
    identity: 'pending' | 'verified' | 'failed',
    bank: 'pending' | 'verified' | 'failed',
    phone: 'pending' | 'verified' | 'failed'
  },
  createdAt: string (ISO),
  updatedAt: string (ISO)
}
```

#### `organizers/{organizerId}/payouts/{payoutId}`

```typescript
{
  id: string,
  organizerId: string,
  amount: number,              // in cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
  method: 'bank_transfer' | 'mobile_money',
  failureReason?: string,
  scheduledDate: string (ISO),
  processedDate?: string (ISO),
  completedAt?: string (ISO),
  createdAt: string (ISO),
  updatedAt: string (ISO)
}
```

## Components

### Server Components

#### `app/organizer/settings/payouts/page.tsx`
- Main page component
- Fetches payout config, balance, and history
- Handles authentication
- Orchestrates layout

### Client Components

#### `components/payout/PayoutStatusHero.tsx`
**Purpose:** Display account status with context-aware CTAs

**Props:**
- `status`: PayoutStatus
- `reason?`: string (for on_hold status)

**States:**
- `not_setup`: Orange theme, "Start Setup" CTA
- `pending_verification`: Blue theme, "View Status" CTA  
- `active`: Green theme, "Manage Settings" CTA
- `on_hold`: Red theme, "Contact Support" CTA

#### `components/payout/BalanceRow.tsx`
**Purpose:** Display financial summary

**Props:**
- `availableBalance`: number (cents)
- `pendingBalance`: number (cents)
- `nextPayoutDate`: string | null

**Features:**
- Color-coded cards (green/yellow/blue)
- Currency formatting
- Date formatting

#### `components/payout/PayoutMethodCard.tsx`
**Purpose:** Display and manage payout method

**Props:**
- `config`: PayoutConfig | null
- `onUpdate`: () => void

**Features:**
- Shows saved method details (masked)
- Edit button opens stepper
- Empty state with setup CTA

#### `components/payout/PayoutSetupStepper.tsx`
**Purpose:** Multi-step modal for method configuration

**Props:**
- `currentConfig`: PayoutConfig | null
- `onClose`: () => void
- `onComplete`: () => void

**Steps:**
1. **Method Selection**: Bank transfer or mobile money
2. **Details Entry**: Form with validation
3. **Review**: Confirm before save

**Features:**
- Inline validation (phone format, required fields)
- Progress indicator
- Data masking preview
- Error handling

#### `components/payout/FeesAndRulesCard.tsx`
**Purpose:** Display fee structure and payout rules

**Content:**
- Platform fee: 5%
- Processing fee: 2.9% + $0.30
- Payout schedule: Weekly on Fridays
- Minimum payout: $50
- Processing times
- Example calculation

#### `components/payout/VerificationChecklist.tsx`
**Purpose:** Show verification status

**Props:**
- `config`: PayoutConfig | null

**Items:**
- Identity verification
- Bank account verification (if bank_transfer)
- Phone verification (if mobile_money)

**Features:**
- Status icons (pending/verified/failed)
- Progress tracking
- CTAs for pending items

#### `components/payout/PayoutHistory.tsx`
**Purpose:** Display transaction history

**Props:**
- `payouts`: Payout[]
- `loading?`: boolean

**Features:**
- Desktop table view
- Mobile card view
- Status badges
- Retry button for failed payouts
- Empty state
- Skeleton loader

## Library Functions

### `lib/firestore/payout.ts`

This module still defines the shared `PayoutConfig` shape, payout status computation, and legacy helpers.

#### `determinePayoutStatus(config: PayoutConfig | null)`
Computes `'not_setup' | 'pending_verification' | 'active' | 'on_hold'`.

#### `updatePayoutConfig(organizerId: string, updates: Partial<PayoutConfig>)`
Update payout configuration with automatic data masking.

**Security:**
- Masks account numbers: keeps last 4 digits
- Masks phone numbers: keeps last 4 digits
- Updates timestamp automatically

**Returns:** `Promise<void>`

#### `getPayoutHistory(organizerId: string, limit?: number)`
Fetch payout transaction history.

**Returns:** `Promise<Payout[]>`

**Default limit:** 10

#### `getOrganizerBalance(organizerId: string)`
Calculate available and pending balances.

**Returns:** 
```typescript
Promise<{
  available: number,    // cents
  pending: number,      // cents
  nextPayoutDate: string | null
}>
```

**Logic:**
- Sums ticket sales minus platform fees
- Subtracts completed payouts
- Calculates next Friday for payout date

### `lib/firestore/payout-profiles.ts`

#### `getPayoutProfile(organizerId: string, profileId: 'haiti' | 'stripe_connect')`
Fetch a payout profile, with legacy fallback to `payoutConfig/main` when the profile doc does not exist.

#### `getRequiredPayoutProfileIdForEventCountry(country)`
Maps event country to the required payout profile:
- `US`/`CA` → `stripe_connect`
- everything else → `haiti`

## Security

### Firestore Rules (Required)

```javascript
// organizers/{organizerId}/payoutConfig/{configId}
match /organizers/{organizerId}/payoutConfig/{configId} {
  allow read: if request.auth != null && 
    (request.auth.uid == organizerId || 
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
  
  allow write: if request.auth != null && request.auth.uid == organizerId;
}

// organizers/{organizerId}/payouts/{payoutId}
match /organizers/{organizerId}/payouts/{payoutId} {
  allow read: if request.auth != null && 
    (request.auth.uid == organizerId || 
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
  
  // Only system/admin can write payouts
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Data Masking

Sensitive data is automatically masked after saving:
- **Account numbers**: `1234567890` → `****7890`
- **Phone numbers**: `+5091234567` → `****4567`

Masking happens in `updatePayoutConfig()` before writing to Firestore.

## User Flows

### First-Time Setup

1. Navigate to `/organizer/settings/payouts`
2. See "not_setup" status hero with orange theme
3. Click "Start Setup" or "Add Payout Method"
4. Choose method: Bank Transfer or Mobile Money
5. Fill in details with inline validation
6. Review masked preview
7. Save → Updates to "pending_verification" status
8. Complete verification steps
9. Status changes to "active"

### Editing Method

1. Click "Edit" on PayoutMethodCard
2. Stepper opens with current values
3. Modify details (account number field is empty for security)
4. Save updates
5. May trigger re-verification

### Viewing History

1. Scroll to PayoutHistory component
2. See table (desktop) or cards (mobile)
3. Filter by status
4. Retry failed payouts
5. Export history

## Testing Checklist

- [ ] Payout config CRUD operations
- [ ] Data masking (account numbers, phone numbers)
- [ ] Timestamp conversion (all ISO strings)
- [ ] Balance calculation accuracy
- [ ] Payout history pagination
- [ ] Verification status updates
- [ ] Mobile responsiveness
- [ ] Form validation (phone format, required fields)
- [ ] Error handling (network failures, invalid data)
- [ ] Empty states (no method, no history)
- [ ] Loading states (skeleton loaders)
- [ ] Authentication enforcement
- [ ] Firestore security rules

## Future Enhancements

1. **Automated Payouts**: Schedule automatic weekly payouts
2. **Multi-Currency**: Support HTG (Haitian Gourde)
3. **Tax Documents**: Generate 1099 forms
4. **Real Verification**: Integrate with bank/phone verification APIs
5. **Payout Filtering**: Filter history by date, status, amount
6. **Export Options**: CSV, PDF downloads
7. **Email Notifications**: Payout confirmations, failures
8. **Instant Payouts**: Premium feature for faster processing
9. **Split Payouts**: Multiple recipients per event
10. **Dispute Resolution**: Handle failed/disputed payouts

## Dependencies

- `firebase-admin`: Firestore operations
- `firebase/auth`: Client authentication
- `lucide-react`: Icons
- `date-fns`: Date formatting
- Tailwind CSS: Styling

## File Structure

```
app/
└── organizer/
    └── settings/
        └── payouts/
            └── page.tsx (Server Component)

components/
└── payout/
    ├── PayoutStatusHero.tsx (Client)
    ├── BalanceRow.tsx (Client)
    ├── PayoutMethodCard.tsx (Client)
    ├── PayoutSetupStepper.tsx (Client)
    ├── FeesAndRulesCard.tsx (Client)
    ├── VerificationChecklist.tsx (Client)
    └── PayoutHistory.tsx (Client)

lib/
└── firestore/
    └── payout.ts (Server-side functions)
```

## Notes

- All timestamps are stored as ISO strings for Next.js serialization
- All monetary amounts stored in cents for precision
- Mobile-first design with responsive layouts
- Premium feel with rounded-2xl cards and gradient backgrounds
- Comprehensive error handling with user-friendly messages
- Security-first approach with data masking and strict Firestore rules
