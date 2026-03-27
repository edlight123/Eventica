# Google Sign-In Setup Guide

## ✅ Code is Ready!

I've implemented native Google Sign-In just like standard apps use. Now you need to get your Google OAuth credentials from Firebase Console.

## 🔧 Setup Steps (5 minutes)

### Step 1: Get Google Web Client ID

1. Go to **Firebase Console**: https://console.firebase.google.com/project/eventica/authentication/providers

2. Click on **Google** under Sign-in providers

3. Make sure Google Sign-In is **Enabled**

4. You'll see a section called **Web SDK configuration**

5. Copy the **Web client ID** (looks like: `71580084056-abc123xyz.apps.googleusercontent.com`)

### Step 2: Update Mobile App Configuration

1. Open `/workspaces/Eventica/mobile/.env`

2. Find this line:
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=71580084056-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

3. Replace `71580084056-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com` with your actual **Web client ID** from Step 1

4. Save the file

### Step 3: Download Firebase Config Files

#### For iOS:

1. In Firebase Console, go to: **Project Settings** (⚙️ icon) → **General**

2. Scroll to **Your apps** section

3. Find your iOS app (`com.eventhaiti.mobile`)

4. Click **Download GoogleService-Info.plist**

5. Save it to `/workspaces/Eventica/mobile/GoogleService-Info.plist`

#### For Android (optional, for future builds):

1. Same location in Firebase Console

2. Find or add Android app

3. Download **google-services.json**

4. Save to `/workspaces/Eventica/mobile/google-services.json`

### Step 4: Restart the App

```bash
cd /workspaces/Eventica/mobile
pkill -f expo
npx expo start --tunnel --clear
```

Scan the QR code again!

## ✨ How It Works Now

### Before (Web Browser Method):
- ❌ Tapped "Continue with Google" → Opened browser
- ❌ Had to sign in on web and switch back
- ❌ Clunky experience

### After (Native Google Sign-In):
- ✅ Tap "Continue with Google"
- ✅ Native Google account picker appears
- ✅ Select your Google account
- ✅ Instantly signed in!
- ✅ Same experience as Instagram, Twitter, etc.

## 🧪 Testing

1. **Reload the app** (shake device → Reload)

2. Tap **"Continue with Google"**

3. **Native Google picker** should appear with your accounts

4. Select an account

5. **You're signed in!** 🎉

## 🐛 Troubleshooting

### "Error: Developer Error"
- Make sure you entered the correct Web Client ID in `.env`
- Check that Google Sign-In is enabled in Firebase Console
- Restart the Expo server

### "Error: Sign in cancelled"
- This is normal if you tapped outside the Google picker
- Try again

### "Error: hasPlayServices"
- This happens in Expo Go sometimes
- The app will work fine in a real build (EAS Build)
- For now, use email/password sign-in

### Still using web browser?
- Make sure `.env` has the correct `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Kill the Expo server and restart it
- Clear Metro cache: `npx expo start --clear`

## 📱 What You Need to Provide

I need from you:

1. **Google Web Client ID** from Firebase Console
   - Go to: https://console.firebase.google.com/project/eventica/authentication/providers
   - Click Google provider
   - Copy the Web client ID (under Web SDK configuration)
   - Tell me what it is, and I'll update the `.env` file

2. **GoogleService-Info.plist** (for iOS)
   - Download from Firebase Console → Project Settings → iOS app
   - Upload it to the chat or tell me the contents

Once you provide these, Google Sign-In will work perfectly! 🎉

## 🎯 Summary

**What's Done:**
- ✅ Installed `@react-native-google-signin/google-signin`
- ✅ Updated `AuthContext` with native Google Sign-In
- ✅ Configured `app.json` for Google Services
- ✅ Changed button text to "Continue with Google"
- ✅ Implemented same flow as Instagram, Twitter, etc.

**What You Need to Do:**
1. Get Web Client ID from Firebase Console
2. Update `.env` file with the Web Client ID
3. Download GoogleService-Info.plist
4. Put it in mobile/ folder
5. Restart Expo server
6. Test!

Let me know when you have the Web Client ID and I'll finish the setup! 🚀
