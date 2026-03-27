# Firebase Setup for Mobile App

## Current Status
✅ App loads successfully on iOS!  
⚠️ Running in DEMO MODE (not connected to real Firebase)

## To Enable Real Firebase & Google Sign-In

### Step 1: Get Firebase Config

1. Go to https://console.firebase.google.com/
2. Select your project (create one if needed)
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" section
5. Add an iOS app if you don't have one:
   - Click "Add app" → iOS
   - Bundle ID: `com.eventhaiti.mobile` (or your custom ID)
   - Register app

6. You'll see your Firebase configuration like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...your-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:ios:abc123"
};
```

### Step 2: Update Mobile App Configuration

1. Open `/workspaces/Eventica/mobile/.env`

2. Replace the placeholder values with your real Firebase config:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...your-actual-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123

# IMPORTANT: Set this to false to enable real Firebase
EXPO_PUBLIC_FIREBASE_DEMO_MODE=false
```

3. Save the file

### Step 3: Enable Authentication Methods

In Firebase Console:
1. Go to Authentication → Sign-in method
2. Enable **Email/Password**
3. Enable **Google** (optional, for Google Sign-In)

### Step 4: Restart the App

```bash
cd /workspaces/Eventica/mobile
npx expo start --tunnel --clear
```

Scan the new QR code - the app will now use real Firebase!

## What Works After Setup

✅ **Email/Password Sign-In** - Create account and login  
✅ **Email/Password Sign-Up** - Register new users  
✅ **Google Sign-In Button** - Shows but requires additional OAuth setup  
✅ **User profiles** - Stored in Firestore `users` collection  
✅ **Session persistence** - Login state saved with AsyncStorage  

## Google Sign-In (Advanced)

Note: The "Continue with Google" button is visible but requires additional setup:

1. Install Google Sign-In package:
```bash
npx expo install @react-native-google-signin/google-signin
```

2. Configure OAuth in Firebase Console
3. Add native Google Sign-In implementation
4. Update `AuthContext.signInWithGoogle()` method

For now, users can use **Email/Password** login which works out of the box!

## Troubleshooting

**"Demo mode enabled" message?**
- Check `.env` file has `EXPO_PUBLIC_DEMO_MODE=false`
- Restart the Expo server

**"Permission denied" errors?**
- Check Firestore security rules allow authenticated users
- See `firestore.rules` in root directory

**App crashes after login?**
- Make sure Firestore has proper indexes
- Check `firestore.indexes.json`

## Next Steps

1. Get Firebase credentials from Firebase Console
2. Update `.env` file
3. Set `EXPO_PUBLIC_DEMO_MODE=false`
4. Restart server
5. Test login/signup!
