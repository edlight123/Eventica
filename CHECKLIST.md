# ✅ Installation & Setup Checklist

Use this checklist to ensure Eventica is properly set up and ready to run.

## 📋 Pre-Installation

- [ ] Node.js 18 or higher installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (optional, `git --version`)
- [ ] Code editor installed (VS Code recommended)
- [ ] Modern web browser (Chrome, Firefox, Edge, Safari)

---

## 🗄️ Supabase Setup

### Create Project
- [ ] Signed up at [supabase.com](https://supabase.com)
- [ ] Created new project named "eventhaiti"
- [ ] Saved database password securely
- [ ] Selected region (US East recommended)
- [ ] Waited for project to finish provisioning (~2 minutes)

### Configure Database
- [ ] Opened SQL Editor in Supabase dashboard
- [ ] Created new query
- [ ] Copied ALL content from `/supabase/schema.sql`
- [ ] Pasted into SQL Editor
- [ ] Executed query (Run button or Ctrl+Enter)
- [ ] Verified "Success. No rows returned" message
- [ ] Checked that tables were created (Table Editor)

### Get Credentials
- [ ] Went to Settings → API in Supabase
- [ ] Copied Project URL
- [ ] Copied anon/public key
- [ ] Kept credentials accessible for next step

---

## 💻 Local Project Setup

### Clone/Download Project
- [ ] Downloaded project or cloned repository
- [ ] Opened terminal/command prompt
- [ ] Navigated to Eventica folder (`cd Eventica`)

### Install Dependencies
- [ ] Ran `npm install`
- [ ] Waited for installation to complete (~2 minutes)
- [ ] Checked for any error messages
- [ ] Verified `node_modules` folder was created

### Environment Configuration
- [ ] Created `.env.local` file in project root
- [ ] Added this content:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url_here
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
  ```
- [ ] Replaced `your_url_here` with actual Supabase URL
- [ ] Replaced `your_key_here` with actual anon key
- [ ] Saved the file
- [ ] Verified file is named exactly `.env.local` (not `.env.local.txt`)

---

## 🚀 First Run

### Start Development Server
- [ ] Ran `npm run dev` in terminal
- [ ] Waited for "Local: http://localhost:3000" message
- [ ] Checked for any error messages
- [ ] Opened browser to http://localhost:3000

### Verify Homepage
- [ ] Homepage loaded successfully
- [ ] Saw Eventica logo/branding
- [ ] Saw "Sign in" and "Sign up" buttons
- [ ] Saw "Discover Events in Haiti" or similar text
- [ ] No console errors in browser DevTools

---

## 🧪 Test Basic Functionality

### Test Signup (Attendee)
- [ ] Clicked "Sign up" button
- [ ] Filled in all fields:
  - [ ] Full Name
  - [ ] Email
  - [ ] Password (at least 6 characters)
  - [ ] Selected "I attend events"
- [ ] Clicked "Sign up"
- [ ] Redirected to homepage
- [ ] Saw user name in navbar
- [ ] Saw "My Tickets" link
- [ ] Signed out

### Test Signup (Organizer)
- [ ] Clicked "Sign up" again
- [ ] Used DIFFERENT email
- [ ] Selected "I organize events"
- [ ] Clicked "Sign up"
- [ ] Redirected to organizer dashboard
- [ ] Saw dashboard statistics (all zeros initially)
- [ ] Saw "Create Event", "My Events", "Scan Tickets" cards

### Test Event Creation
- [ ] Still logged in as organizer
- [ ] Clicked "Create Event"
- [ ] Filled in ALL required fields:
  - [ ] Title: "Test Concert"
  - [ ] Category: Selected one
  - [ ] Description: Added text
  - [ ] Venue Name: Added venue
  - [ ] City: Selected one
  - [ ] Commune: Added commune
  - [ ] Address: Added address
  - [ ] Start Date/Time: Selected future date
  - [ ] End Date/Time: Selected same day, later time
  - [ ] Ticket Price: Added price (e.g., 500)
  - [ ] Total Tickets: Added number (e.g., 100)
- [ ] Checked "Publish event"
- [ ] Clicked "Create Event"
- [ ] Redirected to event detail page
- [ ] Saw event information displayed
- [ ] Saw attendees section (empty)

### Test Ticket Purchase
- [ ] Signed out
- [ ] Signed in as attendee (first account)
- [ ] Went to homepage
- [ ] Saw the event created earlier
- [ ] Clicked on event
- [ ] Saw event details
- [ ] Clicked "Buy Ticket"
- [ ] Saw confirmation modal
- [ ] Clicked "Confirm"
- [ ] Redirected to ticket page
- [ ] Saw QR code displayed
- [ ] Saw event details

### Test Ticket Viewing
- [ ] Clicked "My Tickets" in navbar
- [ ] Saw purchased ticket in list
- [ ] Clicked on ticket
- [ ] Saw QR code and ticket details

### Test Ticket Scanning
- [ ] Copied QR code data (format: `ticket:xxx|event:yyy`)
- [ ] Signed out
- [ ] Signed in as organizer
- [ ] Went to Dashboard → "Scan Tickets"
- [ ] Pasted QR code data
- [ ] Clicked "Validate Ticket"
- [ ] Saw "✅ Valid ticket!" message
- [ ] Saw attendee name displayed

### Test Used Ticket
- [ ] Tried to validate same ticket again
- [ ] Saw "⚠️ Ticket already used" message

---

## 🔍 Verify Database

### Check Supabase Tables
- [ ] Went to Supabase Table Editor
- [ ] Checked `users` table:
  - [ ] Has 2 rows (attendee and organizer)
- [ ] Checked `events` table:
  - [ ] Has 1 row (test event)
  - [ ] `is_published` is `true`
  - [ ] `tickets_sold` is `1`
- [ ] Checked `tickets` table:
  - [ ] Has 1 row
  - [ ] `status` is `used`
- [ ] Checked `ticket_scans` table:
  - [ ] Has 1 row
  - [ ] `result` is `valid`

---

## 🎨 Visual Verification

### Design Check
- [ ] Colors match brand (teal and orange)
- [ ] All text is readable
- [ ] Buttons are clickable
- [ ] Forms are properly styled
- [ ] Mobile view works (test by resizing browser)
- [ ] No layout issues

### Responsive Check
- [ ] Tested on mobile size (< 640px)
- [ ] Tested on tablet size (640-1024px)
- [ ] Tested on desktop size (> 1024px)
- [ ] All features work on all sizes

---

## 📱 Browser Testing

### Test in Multiple Browsers
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Mac/iOS)
- [ ] Mobile browser

---

## 🐛 Troubleshooting

If any checks failed, refer to:
- [ ] [QUICKSTART.md](./QUICKSTART.md) - Setup guide
- [ ] [README.md](./README.md) - General documentation
- [ ] [/supabase/README.md](./supabase/README.md) - Database help
- [ ] Browser console for error messages
- [ ] Supabase logs for database errors

---

## ✅ All Checks Passed?

Congratulations! Eventica is fully installed and working! 🎉

### Next Steps:
1. **Explore all features** as both attendee and organizer
2. **Read the documentation** to understand the codebase
3. **Customize branding** in `/config/brand.ts`
4. **Deploy to production** following [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📊 Installation Summary

- Total setup time: ~10-15 minutes
- Dependencies installed: ✅
- Database configured: ✅
- Application running: ✅
- Features tested: ✅
- Ready for development: ✅
- Ready for deployment: ✅

---

**You're ready to build amazing events in Haiti!** 🇭🇹🎉
