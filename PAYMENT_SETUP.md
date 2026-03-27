# Payment Integration Setup Guide

This guide will help you set up Stripe, MonCash (NatCash), and CashApp for accepting payments on Eventica.

## 1. Stripe Setup (International Credit/Debit Cards)

### Get Your API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Sign up or log in to your account
3. In the dashboard, click **Developers** → **API Keys**
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_...` for test mode)
   - **Secret key** (starts with `sk_test_...` for test mode)

### Set Up Webhook

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - Development: `http://localhost:3000/api/webhooks/stripe`
   - Production: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Add to Environment Variables

Add to `.env.local`:
```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Test Cards

For testing in development:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155
- Use any future expiry date and any 3-digit CVC

---

## 2. MonCash/NatCash Setup (Haiti Mobile Money)

MonCash and NatCash are the same service (Digicel's mobile payment platform in Haiti).

### Get API Credentials

1. Go to [MonCash Business Portal](https://moncashbutton.digicelgroup.com)
2. Sign up for a business account
3. Complete business verification
4. Go to **API** section
5. Get your credentials:
   - **Client ID**
   - **Secret Key**

### Sandbox Testing

For development/testing:
1. Use [MonCash Sandbox](https://sandbox.moncashbutton.digicelgroup.com)
2. Create a sandbox account
3. Get sandbox credentials

### Add to Environment Variables

Add to `.env.local`:
```bash
# MonCash/NatCash Keys
MONCASH_CLIENT_ID=your_moncash_client_id
MONCASH_SECRET_KEY=your_moncash_secret_key
MONCASH_MODE=sandbox  # Change to 'production' when ready

# MonCash Button (Middleware) Keys
# Used for hosted "MonCash Button" checkout flow.
MONCASH_BUTTON_BUSINESS_KEY=your_business_key
# Notes:
# - Avoid whitespace/newlines in the BusinessKey value.
# - Some portals display an encoded/wrapped value that base64-decodes into multiple tokens separated by whitespace.
#   In that case, you must use the correct single token Digicel expects (not the outer wrapper).
# - The app will try common routing-safe variants (trimmed, concatenated, unpadded, base64url) but correct portal value is best.
# MONCASH_BUTTON_SECRET_API_KEY can be either:
# - a PEM public key (recommended), OR
# - a base64 DER/SPKI public key string from the Digicel portal (the code will wrap it as PEM).
MONCASH_BUTTON_SECRET_API_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'

# Digicel Portal URLs (MonCash Button)
# IMPORTANT: Use the same domain as your Website URL so the return flow receives the httpOnly cookie.
# Return URL (browser redirect): https://<your-domain>/api/moncash-button/return
# Alert URL  (server notification): https://<your-domain>/api/moncash-button/alert

# RSA padding mode
# Digicel MonCash Button docs/examples use RSA "NoPadding".
# Use `none` unless Digicel explicitly tells you otherwise.
# NOTE: Digicel sandbox keys may be very small; OAEP can fail with "data too large for key size".
MONCASH_BUTTON_RSA_PADDING=none
```

### Prefunded (Payout) Setup (Optional)

MonCash also supports a **prefunded** balance that can be used to **pay out** customers/organizers via API (Digicel docs call this `Prefunded/Payout`).

Important notes:
- This is **not automatic** just because you can accept MonCash payments.
- Digicel must enable the prefunded feature on your business account and you must **fund** the prefunded balance in the portal.
- Eventica uses the same `MONCASH_CLIENT_ID` / `MONCASH_SECRET_KEY` OAuth token to call the prefunded endpoints.

Admin-only API endpoints (server-to-server):
- `GET /api/admin/moncash-prefunded/balance`
- `POST /api/admin/moncash-prefunded/transfer` body: `{ amount, receiver, desc, reference }`
- `POST /api/admin/moncash-prefunded/status` body: `{ reference }`

These endpoints require:
- An authenticated admin session
- `ADMIN_EMAILS` configured

Example transfer body:
```json
{
   "amount": 100.0,
   "receiver": "50937007294",
   "desc": "Organizer payout",
   "reference": "payout_organizer123_2025-12-22"
}
```

### Test Accounts

Sandbox test accounts:
- Phone: Use any Haiti phone number format (+509XXXXXXXX)
- Amount: Any amount in HTG (Haitian Gourdes)

---

## 3. CashApp Setup (US Only)

**Note**: CashApp does not have a public business API yet. For now, we'll implement a manual verification flow.

### Current Implementation

1. Customers select "CashApp" as payment method
2. They enter their CashApp username (e.g., $username)
3. They send payment to your CashApp business account
4. They upload a screenshot of the payment
5. Admin reviews and approves the ticket

### Setup Required

Add to `.env.local`:
```bash
# CashApp Business Account
CASHAPP_BUSINESS_TAG=$YourBusinessCashTag
CASHAPP_DISPLAY_NAME=Your Business Name
```

### Alternative: Use Stripe for CashApp

Stripe now supports CashApp Pay! To enable:

1. In Stripe Dashboard, go to **Settings** → **Payment Methods**
2. Enable **Cash App Pay**
3. It will automatically appear as an option in Stripe Checkout

---

## 4. Complete Environment Variables

Create or update `/workspaces/Eventica/.env.local` with all keys:

```bash
# Firebase (Already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_existing_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Payment (International Cards)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# MonCash/NatCash (Haiti Mobile Money)
MONCASH_CLIENT_ID=your_client_id
MONCASH_SECRET_KEY=your_secret_key
MONCASH_MODE=sandbox

# CashApp (Manual Verification)
CASHAPP_BUSINESS_TAG=$YourCashTag
CASHAPP_DISPLAY_NAME=Eventica

# Email (Optional)
RESEND_API_KEY=re_...

# Admin
ADMIN_EMAILS=info@edlight.org,admin@joineventica.com
```

---

## 5. Testing the Integration

### Test Stripe Payment

1. Start dev server: `npm run dev`
2. Create a test event
3. Try to purchase a ticket
4. Use test card: 4242 4242 4242 4242
5. Complete checkout
6. Check terminal for webhook logs
7. Verify ticket created in Firebase

### Test MonCash (Sandbox)

1. Make sure `MONCASH_MODE=sandbox` in `.env.local`
2. Create event and purchase ticket
3. Select "Mobile Money" payment method
4. Use sandbox phone number
5. Complete payment flow
6. Check webhook logs

### Test CashApp

1. Create event and purchase ticket
2. Select "CashApp" payment method
3. Upload payment screenshot
4. Admin reviews at `/admin/pending-payments`
5. Approve or reject the payment

---

## 6. Going to Production

### Stripe

1. Complete account verification
2. Switch to live keys (pk_live_... and sk_live_...)
3. Update webhook endpoint to production URL
4. Update environment variables in Vercel

### MonCash

1. Complete business verification
2. Switch `MONCASH_MODE=production`
3. Use production credentials
4. Test with real Haiti phone numbers

### Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all production keys
5. Redeploy

---

## 7. Supported Payment Methods by Region

### Haiti
- ✅ Stripe (International cards)
- ✅ MonCash/NatCash (Mobile money)
- ✅ CashApp (with manual verification)

### International
- ✅ Stripe (All major cards)
- ✅ CashApp Pay (via Stripe, US only)
- ⏳ PayPal (coming soon)
- ⏳ Apple Pay (via Stripe)
- ⏳ Google Pay (via Stripe)

---

## Troubleshooting

### Stripe webhook not receiving events
- Check webhook URL is correct
- Verify STRIPE_WEBHOOK_SECRET matches
- Check Stripe Dashboard → Webhooks → Recent Events
- Make sure your local server is running and accessible

### MonCash authentication fails
- Verify CLIENT_ID and SECRET_KEY are correct
- Check if you're using sandbox vs production mode correctly
- Ensure credentials match the environment

### CashApp payments not showing
- Check file upload is working
- Verify admin has access to review page
- Check Firebase Storage rules allow uploads

---

## Support

For issues:
- Stripe: https://support.stripe.com
- MonCash: https://moncashbutton.digicelgroup.com/support
- Eventica: info@edlight.org
