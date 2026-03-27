# Firebase Migration Guide

## Overview

Eventica now uses **Firebase** (Firestore + Firebase Auth) instead of Supabase. This guide explains the database structure and how to set up your Firebase project.

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `eventhaiti` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** authentication
4. Click "Save"

### 3. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll add security rules later)
4. Select a location closest to your users (e.g., `us-east1` for Haiti)
5. Click "Enable"

### 4. Get Configuration Keys

#### Client-side Configuration

1. Go to **Project Settings** (gear icon)
2. Under "Your apps", click the web icon `</>`
3. Register your app with a nickname (e.g., "Eventica Web")
4. Copy the configuration object values:
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

#### Server-side Configuration (Admin SDK)

1. Go to **Project Settings** → **Service Accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the **entire JSON content** as a single-line string
5. Set as `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

**Example:**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"eventhaiti-12345",...}'
```

### 5. Add Environment Variables

Create a `.env.local` file:

```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=eventhaiti-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=eventhaiti-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=eventhaiti-12345.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (copy entire JSON as single line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Other services (optional)
NEXT_PUBLIC_DEMO_MODE=false
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

### 6. Deploy to Vercel

Add all environment variables in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable from `.env.local`
3. Make sure to set them for **Production** environment
4. Redeploy your application

---

## Firestore Database Structure

Firestore is a **NoSQL** database. Unlike Supabase (PostgreSQL), there are no tables or joins. Instead, we use **collections** and **documents**.

### Collections

#### `users`
Stores user profiles and authentication data.

**Document ID:** Firebase Auth UID

**Fields:**
```typescript
{
  id: string                    // Same as document ID
  email: string
  full_name: string
  phone_number: string | null
  role: 'attendee' | 'organizer'
  created_at: string            // ISO 8601 timestamp
  updated_at: string
}
```

**Indexes:** None required

---

#### `events`
Stores all events created by organizers.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  organizer_id: string          // References users collection
  title: string
  description: string
  category: string
  venue_name: string
  city: string
  commune: string
  address: string
  start_datetime: string        // ISO 8601
  end_datetime: string
  max_capacity: number | null
  ticket_price: number
  banner_image_url: string | null
  status: 'draft' | 'published' | 'cancelled'
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `organizer_id` (ascending) + `created_at` (descending)
- `status` (ascending) + `start_datetime` (ascending)
- `category` (ascending) + `status` (ascending)

---

#### `tickets`
Stores purchased tickets.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  event_id: string              // References events collection
  attendee_id: string           // References users collection
  status: 'active' | 'used' | 'cancelled'
  qr_code_data: string          // Unique QR code value
  purchased_at: string
  checked_in: boolean
  checked_in_at: string | null
  price_paid: number
  payment_method: 'stripe' | 'moncash'
  payment_id: string
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `attendee_id` (ascending) + `created_at` (descending)
- `event_id` (ascending) + `status` (ascending)
- `qr_code_data` (ascending) - for check-in lookups

---

#### `ticket_transfers`
Stores ticket transfer requests between users.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  ticket_id: string             // References tickets collection
  from_user_id: string          // References users collection
  to_email: string
  to_user_id: string | null     // Set when recipient accepts
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  message: string | null
  transfer_token: string        // Unique token for email link
  requested_at: string
  responded_at: string | null
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `ticket_id` (ascending)
- `from_user_id` (ascending) + `status` (ascending)
- `to_email` (ascending) + `status` (ascending)
- `transfer_token` (ascending)

---

#### `refunds`
Stores refund requests from attendees.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  ticket_id: string
  attendee_id: string
  event_id: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  processed_at: string | null
  requested_at: string
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `attendee_id` (ascending) + `created_at` (descending)
- `event_id` (ascending) + `status` (ascending)

---

#### `promo_codes`
Stores promotional discount codes.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  organizer_id: string
  event_id: string | null       // null = applies to all events
  code: string                  // e.g., "SUMMER2025"
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number | null
  uses_count: number
  valid_from: string
  valid_until: string
  active: boolean
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `code` (ascending) + `active` (ascending)
- `event_id` (ascending)

---

#### `reviews`
Stores event reviews from attendees.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  event_id: string
  attendee_id: string
  rating: number                // 1-5
  comment: string
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `event_id` (ascending) + `created_at` (descending)
- `attendee_id` (ascending)

---

#### `favorites`
Stores users' favorited events.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  user_id: string
  event_id: string
  created_at: string
}
```

**Indexes:**
- `user_id` (ascending) + `created_at` (descending)
- `event_id` (ascending)

---

#### `waitlist`
Stores waitlist entries for sold-out events.

**Document ID:** Auto-generated

**Fields:**
```typescript
{
  id: string
  event_id: string
  email: string
  phone_number: string | null
  notified: boolean
  created_at: string
  updated_at: string
}
```

**Indexes:**
- `event_id` (ascending) + `notified` (ascending)

---

## Security Rules

Add these Firestore Security Rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isOrganizer() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'organizer';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if true; // Public
      allow create: if isOrganizer();
      allow update: if isOrganizer() && 
                      resource.data.organizer_id == request.auth.uid;
      allow delete: if isOrganizer() && 
                      resource.data.organizer_id == request.auth.uid;
    }
    
    // Tickets collection
    match /tickets/{ticketId} {
      allow read: if isSignedIn() && 
                    (resource.data.attendee_id == request.auth.uid ||
                     get(/databases/$(database)/documents/events/$(resource.data.event_id)).data.organizer_id == request.auth.uid);
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
                      (resource.data.attendee_id == request.auth.uid ||
                       get(/databases/$(database)/documents/events/$(resource.data.event_id)).data.organizer_id == request.auth.uid);
      allow delete: if false; // No deletions allowed
    }
    
    // Ticket transfers
    match /ticket_transfers/{transferId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isSignedIn() && 
                      resource.data.from_user_id == request.auth.uid;
    }
    
    // Refunds
    match /refunds/{refundId} {
      allow read: if isSignedIn() && 
                    (resource.data.attendee_id == request.auth.uid || isOrganizer());
      allow create: if isSignedIn();
      allow update: if isOrganizer();
      allow delete: if false;
    }
    
    // Promo codes
    match /promo_codes/{promoId} {
      allow read: if true;
      allow write: if isOrganizer();
    }
    
    // Reviews
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update: if isOwner(resource.data.attendee_id);
      allow delete: if isOwner(resource.data.attendee_id);
    }
    
    // Favorites
    match /favorites/{favoriteId} {
      allow read: if isOwner(resource.data.user_id);
      allow create: if isSignedIn();
      allow delete: if isOwner(resource.data.user_id);
    }
    
    // Waitlist
    match /waitlist/{waitlistId} {
      allow read: if isSignedIn();
      allow create: if true;
      allow update: if isOrganizer();
      allow delete: if isOrganizer();
    }
  }
}
```

---

## Data Migration from Supabase

If you have existing data in Supabase, you'll need to export and import it:

### 1. Export from Supabase

```bash
# Export each table as JSON
supabase db dump --data-only > supabase_data.sql
```

### 2. Convert SQL to Firestore Format

Create a migration script to convert SQL dumps to Firestore documents.

### 3. Import to Firestore

Use the Firebase Admin SDK to batch import documents:

```typescript
import { adminDb } from '@/lib/firebase/admin'

async function importData(collection: string, documents: any[]) {
  const batch = adminDb.batch()
  
  documents.forEach(doc => {
    const docRef = adminDb.collection(collection).doc(doc.id)
    batch.set(docRef, doc)
  })
  
  await batch.commit()
}
```

---

## Testing

After setup, test:

1. **Sign up** - Create a new user
2. **Create event** - As organizer
3. **Buy ticket** - As attendee
4. **Check-in** - Using QR scanner
5. **Transfer ticket** - Between users
6. **Request refund** - As attendee

---

## Differences from Supabase

| Feature | Supabase | Firebase |
|---------|----------|----------|
| **Database** | PostgreSQL (SQL) | Firestore (NoSQL) |
| **Queries** | SQL-like with joins | Document-based, no joins |
| **Real-time** | Postgres changes | Firestore snapshots |
| **Auth** | Supabase Auth | Firebase Auth |
| **Storage** | Supabase Storage | Firebase Storage |
| **Security** | Row Level Security (RLS) | Firestore Rules |

---

## Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
