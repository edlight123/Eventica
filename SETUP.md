# Eventica - Feature Setup Guide

This guide will help you set up and configure all the features of Eventica.

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd Eventica
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your credentials in `.env.local`

3. **Database Setup**
   Run the migrations in Supabase SQL Editor in order:
   - `supabase/migrations/001_add_favorites_table.sql`
   - `supabase/migrations/002_add_organizer_settings_table.sql`
   - `supabase/migrations/003_add_promo_codes_table.sql`
   - `supabase/storage-setup.sql`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 📧 Email Notifications Setup (Resend)

### 1. Create Resend Account
- Go to [resend.com](https://resend.com)
- Sign up for free account (100 emails/day free tier)

### 2. Get API Key
- Navigate to API Keys section
- Create new API key
- Copy the key (starts with `re_`)

### 3. Configure Environment
```env
RESEND_API_KEY=re_your_api_key_here
```

### 4. Verify Domain (Production)
- Add your domain in Resend dashboard
- Add DNS records (SPF, DKIM, DMARC)
- Wait for verification

### Features
- ✅ Ticket confirmation emails with QR codes
- ✅ Event creation notifications
- ✅ Professional HTML templates with branding
- ✅ Automatic fallback to console.log if not configured

---

## 💳 Stripe Payment Integration

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com)
- Sign up and complete account setup

### 2. Get API Keys
- Navigate to Developers → API Keys
- Copy **Publishable key** (starts with `pk_test_`)
- Copy **Secret key** (starts with `sk_test_`)

### 3. Configure Environment
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

### 4. Setup Webhook
- Go to Developers → Webhooks
- Add endpoint: `https://your-domain.com/api/webhooks/stripe`
- Select event: `checkout.session.completed`
- Copy webhook signing secret (starts with `whsec_`)
- Add to environment:
  ```env
  STRIPE_WEBHOOK_SECRET=whsec_your_secret
  ```

### Testing
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and CVC

### Features
- ✅ Secure checkout hosted by Stripe
- ✅ Automatic ticket creation after payment
- ✅ Email confirmation with QR code
- ✅ Payment tracking and reconciliation

---

## 📱 WhatsApp Notifications (Twilio)

### 1. Create Twilio Account
- Go to [twilio.com](https://twilio.com)
- Sign up (free trial with $15 credit)

### 2. Setup WhatsApp Sandbox (Testing)
- Go to Messaging → Try it out → Send a WhatsApp message
- Follow instructions to join sandbox
- Note the sandbox number (e.g., `whatsapp:+14155238886`)

### 3. Get Credentials
- From Console dashboard:
  - Account SID (starts with `AC`)
  - Auth Token

### 4. Configure Environment
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 5. Production Setup
- Request WhatsApp Business API access
- Get approved phone number
- Update `TWILIO_WHATSAPP_NUMBER` with your number

### Features
- ✅ Ticket confirmation via WhatsApp
- ✅ Event reminders
- ✅ Event updates
- ✅ Automatic fallback if not configured

---

## 🖼️ Image Upload (Supabase Storage)

### 1. Create Storage Bucket
Run the SQL in Supabase SQL Editor:
```sql
-- From supabase/storage-setup.sql
```

### 2. Configure CORS (if needed)
- Go to Storage settings in Supabase
- Add allowed origins (your domain)

### 3. Test Upload
- Create or edit an event
- Click "Click to upload event banner"
- Upload image (max 5MB)
- Image will be stored in `event-images` bucket

### Features
- ✅ Drag & drop upload
- ✅ Image preview
- ✅ Public URLs for event banners
- ✅ 5MB size limit
- ✅ PNG, JPG support

---

## 💰 MonCash Integration (Haiti Local Payment)

### 1. Create MonCash Account
- Go to [moncashbutton.digicelgroup.com](https://moncashbutton.digicelgroup.com)
- Register as merchant
- Complete KYC verification

### 2. Get API Credentials
- Login to merchant portal
- Navigate to API Settings
- Copy Client ID and Secret Key

### 3. Configure Environment
```env
MONCASH_CLIENT_ID=your_client_id
MONCASH_SECRET_KEY=your_secret_key
MONCASH_MODE=sandbox  # or 'production'
```

### 4. Implementation (Coming Soon)
MonCash integration files will be created at:
- `/app/api/moncash/initiate/route.ts` - Start payment
- `/app/api/moncash/callback/route.ts` - Handle response
- Update `BuyTicketButton.tsx` to show MonCash option

---

## 🎫 QR Code Generation

Already configured and working! Uses:
- `qrcode` library for server-side generation
- `qrcode.react` for client-side display
- Automatic generation on ticket purchase
- Embedded in email confirmations

---

## 📊 Database Tables

### Required Migrations

1. **favorites** - User favorite events
   ```sql
   -- Run: supabase/migrations/001_add_favorites_table.sql
   ```

2. **organizer_settings** - Payment configurations
   ```sql
   -- Run: supabase/migrations/002_add_organizer_settings_table.sql
   ```

3. **promo_codes** - Discount codes
   ```sql
   -- Run: supabase/migrations/003_add_promo_codes_table.sql
   ```

---

## 🔐 Security Checklist

- [ ] Add all API keys to `.env.local` (never commit!)
- [ ] Configure Stripe webhook with proper secret
- [ ] Enable RLS policies in Supabase
- [ ] Verify email domain in Resend (production)
- [ ] Test payment flow in sandbox mode first
- [ ] Set strong passwords for all service accounts
- [ ] Use environment-specific keys (test vs production)

---

## 🧪 Testing

### Email
```bash
# Trigger a ticket purchase
# Check terminal logs for email content
# Verify email received in inbox
```

### Stripe
```bash
# Use test mode keys
# Test card: 4242 4242 4242 4242
# Check Stripe dashboard for payment
# Verify webhook delivery
```

### WhatsApp
```bash
# Join Twilio sandbox
# Make test purchase
# Receive WhatsApp confirmation
```

### Image Upload
```bash
# Go to /organizer/events/new
# Upload test image
# Verify in Supabase Storage bucket
# Check public URL works
```

---

## 🚨 Troubleshooting

### Stripe webhook not working
- Verify webhook secret is correct
- Check endpoint URL is publicly accessible
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Email not sending
- Verify Resend API key is set
- Check email in spam folder
- Review logs for error messages
- Verify domain DNS records (production)

### WhatsApp not working
- Confirm you joined Twilio sandbox
- Verify phone number format: `+50938765432`
- Check Twilio logs for delivery status

### Image upload fails
- Run storage-setup.sql migration
- Check file size (max 5MB)
- Verify Supabase project has storage enabled
- Check browser console for errors

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Resend API Docs](https://resend.com/docs)
- [Twilio WhatsApp Guide](https://www.twilio.com/docs/whatsapp)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [MonCash API Docs](https://sandbox.moncashbutton.digicelgroup.com/Api/)

---

## 🎉 You're Ready!

All 5 priority features are now implemented:
1. ✅ Real payment integration (Stripe)
2. ✅ Email notifications (Resend)
3. ✅ QR code generation
4. ✅ Image upload (Supabase Storage)
5. ✅ WhatsApp notifications (Twilio)

Next steps:
- Configure your API keys
- Run database migrations
- Test each feature
- Deploy to production!
