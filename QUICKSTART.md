# 🚀 Quick Start Guide - Eventica

Get Eventica running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)

## Step 1: Clone & Install (2 min)

```bash
# Clone the repository
cd Eventica

# Install dependencies
npm install
```

## Step 2: Set Up Supabase (2 min)

### A. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Name: `eventhaiti`
   - Database Password: (generate and save it)
   - Region: US East (closest to Haiti)
4. Click "Create new project" and wait ~2 minutes

### B. Run Database Schema

1. In Supabase dashboard, click "SQL Editor" in sidebar
2. Click "New Query"
3. Open `/supabase/schema.sql` in your code editor
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click "Run" or press Ctrl+Enter
7. You should see "Success. No rows returned"

### C. Get API Keys

1. In Supabase dashboard, go to Settings → API
2. Copy your **Project URL**
3. Copy your **anon/public key**

## Step 3: Configure Environment (1 min)

Create a file called `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Step 2C.

## Step 4: Run the App! (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## 🎉 You're Done!

### Test the App

#### Create an Attendee Account
1. Click "Sign up" in the top right
2. Fill in your details
3. Select "I attend events"
4. Click "Sign up"

#### Create an Organizer Account
1. Sign out (if logged in)
2. Click "Sign up"
3. Fill in different email
4. Select "I organize events"
5. Click "Sign up"

#### As Organizer: Create an Event
1. You'll be on the organizer dashboard
2. Click "Create Event"
3. Fill in all the fields:
   - Title: "Summer Music Festival"
   - Category: Concert
   - Description: "A great music festival!"
   - Venue: "National Stadium"
   - City: Port-au-Prince
   - Commune: "Pétion-Ville"
   - Address: "123 Main St"
   - Start Date/Time: Pick a future date
   - End Date/Time: Same day, few hours later
   - Ticket Price: 500
   - Total Tickets: 100
   - ✅ Check "Publish event"
4. Click "Create Event"

#### As Attendee: Buy a Ticket
1. Sign out
2. Sign in with your attendee account
3. You should see the event on homepage
4. Click the event
5. Click "Buy Ticket"
6. Click "Confirm"
7. You'll be redirected to your ticket with QR code!

#### As Organizer: Scan a Ticket
1. Sign in as organizer
2. Go to Dashboard → "Scan Tickets"
3. Get the QR code data from your ticket (format: `ticket:xxx|event:yyy`)
4. Paste it in the scanner
5. Click "Validate Ticket"
6. You should see "✅ Valid ticket!"

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check that `.env.local` exists and has correct values
- Restart the dev server: Stop with Ctrl+C, then `npm run dev` again

### "Build errors"
- Make sure you ran `npm install`
- Check that you're using Node.js 18 or higher: `node --version`

### "Database errors"
- Make sure you ran ALL the SQL from `/supabase/schema.sql`
- Check Supabase logs in the dashboard

### "Auth not working"
- In Supabase dashboard, go to Authentication → URL Configuration
- Make sure `http://localhost:3000` is in the "Site URL" field

## 📚 Next Steps

- Read `/README.md` for full documentation
- Read `/DEPLOYMENT.md` to deploy to production
- Read `/PROJECT_SUMMARY.md` for feature overview

## 💡 Tips

- The app uses simulated payments (every purchase succeeds)
- You can create multiple accounts to test different roles
- Check the Supabase dashboard to see data being created
- Use Chrome DevTools to inspect and debug

## 🆘 Still Stuck?

Check these files:
- `/supabase/README.md` - Detailed Supabase setup
- `/DEPLOYMENT.md` - Deployment troubleshooting
- `/PROJECT_SUMMARY.md` - Feature documentation

---

**Happy coding!** 🇭🇹
