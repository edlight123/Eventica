# Testing the Eventica Mobile App

## 🚀 Quick Start Testing

### Option 1: Test on Your Phone (Recommended - Easiest)

#### Step 1: Install Expo Go App
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: Download from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

#### Step 2: Start the Development Server
```bash
cd /workspaces/Eventica/mobile
npm start
```

#### Step 3: Scan QR Code
- **iOS**: Open Camera app → Point at QR code → Tap notification
- **Android**: Open Expo Go app → Tap "Scan QR Code" → Scan the QR code from terminal

#### Step 4: Wait for App to Load
- First load takes 30-60 seconds
- Hot reload is enabled - changes reflect immediately
- Shake device to open developer menu

---

### Option 2: Test in iOS Simulator (Mac Only)

#### Prerequisites
```bash
# Install Xcode from Mac App Store (required)
xcode-select --install

# Install iOS Simulator
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

#### Run iOS Simulator
```bash
cd /workspaces/Eventica/mobile
npm run ios
```

This will:
- Start Metro bundler
- Launch iOS Simulator
- Install and run the app

**Keyboard Shortcuts**:
- `Cmd + D` - Open developer menu
- `Cmd + R` - Reload app
- `Cmd + M` - Toggle performance monitor

---

### Option 3: Test in Android Emulator

#### Prerequisites
```bash
# Install Android Studio
# Download from: https://developer.android.com/studio

# Create Android Virtual Device (AVD)
# 1. Open Android Studio
# 2. Tools → AVD Manager
# 3. Create Virtual Device → Pixel 5 → Download system image
# 4. Finish setup
```

#### Run Android Emulator
```bash
cd /workspaces/Eventica/mobile
npm run android
```

**Or start emulator separately**:
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_33 &

# Then run app
npm run android
```

---

### Option 4: Test in Web Browser (Limited)

```bash
cd /workspaces/Eventica/mobile
npm run web
```

Opens in browser at `http://localhost:19006`

**Note**: Some features won't work (camera, notifications, native modules)

---

## 🧪 Complete Testing Checklist

### Authentication Testing

- [ ] **Signup Flow**
  - [ ] Create new account with email/password
  - [ ] Verify validation (empty fields, invalid email)
  - [ ] Check success message
  - [ ] Redirect to Home screen

- [ ] **Login Flow**
  - [ ] Login with valid credentials
  - [ ] Test wrong password (should show error)
  - [ ] Test non-existent email (should show error)
  - [ ] Session persists after app reload

- [ ] **Sign Out**
  - [ ] Sign out from Profile tab
  - [ ] Verify redirect to Login screen
  - [ ] Session cleared (can't access app without re-login)

---

### Home Screen Testing

- [ ] **Event Display**
  - [ ] Upcoming events load correctly
  - [ ] Event cards show: title, date, location, price
  - [ ] Images load (or show placeholder)
  - [ ] Scroll through event list

- [ ] **Pull to Refresh**
  - [ ] Pull down to refresh
  - [ ] Loading spinner appears
  - [ ] Events update

- [ ] **Navigation**
  - [ ] Tap event → Opens EventDetail screen
  - [ ] Back button returns to Home

---

### Discover Screen Testing

- [ ] **Search Functionality**
  - [ ] Type in search box
  - [ ] Results filter in real-time
  - [ ] Search by: event title, venue, city
  - [ ] Clear search shows all events

- [ ] **Category Filters**
  - [ ] Tap "All" - shows all events
  - [ ] Tap "Music" - shows only music events
  - [ ] Tap "Sports" - shows only sports events
  - [ ] Try each category (Business, Arts, Food, etc.)

- [ ] **Results Counter**
  - [ ] Shows correct count ("X events found")
  - [ ] Updates when filtering

- [ ] **Empty States**
  - [ ] Search for nonsense → "No events found"
  - [ ] Helpful message displayed

---

### Favorites Screen Testing ⭐

- [ ] **Without Login**
  - [ ] Shows "Login Required" message

- [ ] **After Login**
  - [ ] Empty state when no favorites
  - [ ] "Explore Events" button works

- [ ] **Adding Favorites**
  - [ ] Go to EventDetail
  - [ ] Tap heart icon (🤍 → ❤️)
  - [ ] Alert confirms save
  - [ ] Navigate to Favorites tab
  - [ ] Event appears in list

- [ ] **Removing Favorites**
  - [ ] Tap "Remove" button
  - [ ] Confirmation alert appears
  - [ ] Event removed from list
  - [ ] Counter updates

- [ ] **Pull to Refresh**
  - [ ] Refreshes favorite events
  - [ ] Syncs with server

---

### Event Detail Screen Testing

- [ ] **Display Information**
  - [ ] Event title shows
  - [ ] Cover image displays (or placeholder)
  - [ ] Date/time formatted correctly
  - [ ] Venue and address shown
  - [ ] Description readable
  - [ ] Category badge visible
  - [ ] Price displayed correctly

- [ ] **Favorite Button**
  - [ ] Heart icon visible (top right)
  - [ ] Toggle works (🤍 ↔ ❤️)
  - [ ] Alert confirmation shows
  - [ ] State persists on reload

- [ ] **Purchase Ticket**
  - [ ] Without login → "Login Required" alert
  - [ ] After login → Confirmation dialog
  - [ ] Shows event name and price
  - [ ] "Cancel" dismisses dialog
  - [ ] "Confirm" processes purchase
  - [ ] Success alert appears
  - [ ] Redirects to Tickets tab

---

### Tickets Screen Testing

- [ ] **Without Login**
  - [ ] Shows "Login Required" message

- [ ] **Without Tickets**
  - [ ] Empty state with ticket emoji 🎫
  - [ ] "No Tickets Yet" message

- [ ] **With Tickets**
  - [ ] All purchased tickets display
  - [ ] Shows: event name, date, venue, price
  - [ ] Status badge (CONFIRMED/USED)
  - [ ] Ticket counter correct

- [ ] **Tap Ticket**
  - [ ] Opens TicketDetail screen
  - [ ] Back button works

- [ ] **Pull to Refresh**
  - [ ] Refreshes ticket list

---

### Ticket Detail Screen Testing

- [ ] **QR Code**
  - [ ] QR code generates and displays
  - [ ] Clear and scannable
  - [ ] White background, colored QR
  - [ ] Instruction text below

- [ ] **Ticket Information**
  - [ ] Event title shown
  - [ ] Date and time correct
  - [ ] Venue information
  - [ ] Ticket type (General Admission)
  - [ ] Quantity shown
  - [ ] Price displayed

- [ ] **Status Badge**
  - [ ] "CONFIRMED" shows green
  - [ ] Status visible at top

- [ ] **Attendee Info**
  - [ ] User name
  - [ ] User email

- [ ] **Purchase Details**
  - [ ] Ticket ID
  - [ ] Purchase date

---

### Profile Screen Testing

- [ ] **User Information**
  - [ ] Full name displays
  - [ ] Email displays
  - [ ] User role shows (Attendee/Organizer)

- [ ] **Sign Out Button**
  - [ ] Button visible
  - [ ] Tap → Returns to Login
  - [ ] AsyncStorage cleared
  - [ ] Can't access app without re-login

---

### Navigation Testing

- [ ] **Bottom Tabs**
  - [ ] All 5 tabs visible: Home, Discover, Favorites, Tickets, Profile
  - [ ] Icons change when active (filled vs outline)
  - [ ] Text color changes (teal vs gray)
  - [ ] Tap each tab switches screen
  - [ ] Active tab highlighted

- [ ] **Stack Navigation**
  - [ ] Event detail opens in stack
  - [ ] Back button in header
  - [ ] Ticket detail opens in stack
  - [ ] Proper screen titles

---

## 🐛 Common Issues & Solutions

### Issue: Metro Bundler Won't Start
```bash
# Clear cache and restart
cd mobile
rm -rf node_modules
npm install
npm start -- --clear
```

### Issue: "Unable to resolve module"
```bash
# Reset watchman
watchman watch-del-all
npm start -- --reset-cache
```

### Issue: Expo Go Can't Connect
1. Ensure phone and computer on same WiFi
2. Check firewall isn't blocking port 19000
3. Try tunnel mode: `npm start -- --tunnel`

### Issue: Firebase Not Working
1. Check `.env` file exists in `/mobile` directory
2. Verify Firebase credentials are correct
3. Check Firebase console for project status

### Issue: "Network request failed"
1. Check internet connection
2. Verify Firebase configuration
3. Check Firestore rules allow read/write

### Issue: QR Code Not Generating
```bash
# Install missing dependency
cd mobile
npm install react-native-svg
```

---

## 📱 Test Scenarios

### New User Journey
1. Launch app → See Login screen
2. Tap "Sign Up"
3. Create account
4. Redirected to Home
5. Browse events
6. Tap event → View details
7. Tap heart → Save to favorites
8. Go to Favorites tab → See saved event
9. Go back to event → Purchase ticket
10. Go to Tickets tab → See purchased ticket
11. Tap ticket → View QR code
12. Go to Profile → Sign out

### Existing User Journey
1. Launch app → See Login screen
2. Login with credentials
3. Auto-navigate to Home
4. Search for event in Discover
5. Filter by category
6. Open event
7. Purchase ticket
8. View ticket with QR code

### Offline Testing
1. Turn off WiFi/Data
2. Launch app
3. Should show cached data or loading states
4. Reconnect → Data syncs

---

## 🔍 What to Look For

### Performance
- [ ] App loads in < 3 seconds
- [ ] Scrolling is smooth
- [ ] Images load progressively
- [ ] No lag when typing in search
- [ ] Transitions are smooth

### Visual Quality
- [ ] Text is readable (no pixelation)
- [ ] Images not stretched/distorted
- [ ] Consistent spacing and padding
- [ ] Colors match brand (teal primary)
- [ ] Icons aligned properly

### Error Handling
- [ ] Network errors show friendly messages
- [ ] Invalid inputs show validation
- [ ] Loading states visible
- [ ] Empty states informative

### Data Integrity
- [ ] Events display correct information
- [ ] Dates formatted properly (MMM dd, yyyy)
- [ ] Prices show currency (HTG)
- [ ] Tickets match purchases
- [ ] Favorites sync across screens

---

## 🧪 Advanced Testing

### Test with Multiple Accounts
```bash
# Create 2-3 test accounts
user1@test.com / password123
user2@test.com / password123
```

1. Purchase tickets with user1
2. Sign out
3. Login as user2
4. Verify user2 can't see user1's tickets
5. Verify favorites are user-specific

### Test Edge Cases
- [ ] Very long event titles
- [ ] Events with no image
- [ ] Free events (price = 0)
- [ ] Past events (shouldn't appear)
- [ ] Events far in future
- [ ] Search with special characters
- [ ] Rapid tab switching

---

## 📊 Firebase Console Verification

While testing, check Firebase Console:

1. **Authentication**: https://console.firebase.google.com/
   - Go to Authentication → Users
   - Verify new signups appear
   - Check last sign-in times

2. **Firestore Database**:
   - Go to Firestore Database
   - Check `tickets` collection for new purchases
   - Check `event_favorites` for favorites
   - Verify data structure is correct

3. **Storage** (if using images):
   - Check uploaded images appear

---

## ✅ Final Checklist

Before deploying to production:

- [ ] All core features work
- [ ] No console errors
- [ ] Firebase configured correctly
- [ ] Images load properly
- [ ] Navigation flows smoothly
- [ ] Error messages user-friendly
- [ ] App doesn't crash
- [ ] Data persists correctly
- [ ] Sign out works
- [ ] App icon displays
- [ ] Splash screen shows
- [ ] Performance acceptable
- [ ] Works on both iOS and Android

---

## 🚀 Ready to Test?

**Quick start**:
```bash
cd /workspaces/Eventica/mobile
npm start
```

Then scan QR code with Expo Go app on your phone!

**Test credentials** (if using demo data):
- Email: `info@edlight.org`
- Password: (your Firebase password)

Or create a new account to test signup flow.

---

## 📸 What You Should See

**Home Screen**: List of upcoming events with images, titles, dates
**Discover Screen**: Search bar + category chips + filtered events
**Favorites Screen**: Saved events with heart icons
**Tickets Screen**: Your purchased tickets with status badges
**Ticket Detail**: Large QR code with event details
**Profile Screen**: Your name, email, sign out button

All screens should have smooth transitions and consistent branding (teal accent color).

---

**Need help?** Check the [MOBILE_SETUP.md](./MOBILE_SETUP.md) for detailed setup instructions.
