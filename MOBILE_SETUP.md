# Eventica Mobile App - Quick Start Guide

## ✅ What's Been Set Up

Your React Native mobile app is ready! Here's what's included:

### 🎯 Core Features
- ✅ Firebase Authentication (Login/Signup)
- ✅ Bottom Tab Navigation
- ✅ Home Screen with event listing
- ✅ Profile Screen
- ✅ Placeholder screens for Discover and Tickets
- ✅ TypeScript support
- ✅ Shared Firebase backend with web app

### 📁 Project Structure
```
mobile/
├── config/
│   ├── firebase.ts      # Firebase configuration
│   └── brand.ts         # App colors and branding
├── contexts/
│   └── AuthContext.tsx  # Authentication state management
├── navigation/
│   └── AppNavigator.tsx # Navigation setup
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   ├── HomeScreen.tsx
│   ├── DiscoverScreen.tsx
│   ├── TicketsScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── EventDetailScreen.tsx
│   └── TicketDetailScreen.tsx
└── App.tsx              # Root component
```

## 🚀 How to Run

### Option 1: Test on Your Phone (Easiest)
1. Install **Expo Go** app from App Store (iOS) or Play Store (Android)
2. Navigate to mobile directory:
   ```bash
   cd /workspaces/Eventica/mobile
   ```
3. Create `.env` file with your Firebase config:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your Firebase credentials (same as web app)
5. Start the development server:
   ```bash
   npm start
   ```
6. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Option 2: Run in Simulator/Emulator
```bash
# For iOS (Mac only)
npm run ios

# For Android
npm run android

# For Web browser
npm run web
```

## 🔧 Configuration Needed

1. **Firebase Setup** (`.env` file):
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. **Update App Icons** (optional):
   - Replace images in `mobile/assets/`
   - Update `app.json` with your app details

## 📱 Current Functionality

### ✅ Working Now
1. **Authentication**
   - Email/password login
   - User registration
   - Persistent sessions
   - Sign out

2. **Home Screen**
   - Displays upcoming events from Firestore
   - Pull-to-refresh
   - Tap events to view details (placeholder)

3. **Profile Screen**
   - Shows user info
   - Sign out button

4. **Navigation**
   - Bottom tabs for main screens
   - Stack navigation for detail screens

### 🚧 Next Steps to Implement
1. **Event Detail Screen**
   - Full event information
   - Ticket purchase
   - Add to calendar
   
2. **Tickets Screen**
   - Display user's tickets
   - QR code generation
   - Ticket transfer

3. **Discover Screen**
   - Search events
   - Filters (category, date, location)
   - Map view

4. **Additional Features**
   - Push notifications
   - Organizer dashboard
   - Payment integration
   - Image uploads
   - Social sharing

## 🛠️ Development Tips

### Adding New Screens
1. Create screen in `mobile/screens/`
2. Add to navigation in `navigation/AppNavigator.tsx`
3. Update TypeScript types

### Styling
- Uses React Native StyleSheet
- Colors defined in `config/brand.ts`
- Consistent with web app design

### Data Fetching
- Uses Firebase Firestore directly
- Example in `HomeScreen.tsx`
- Same database as web app

### Testing
```bash
# Run TypeScript checks
npm run tsc

# Format code (if using Prettier)
npm run format
```

## 🎨 Customization

### Brand Colors
Edit `mobile/config/brand.ts`:
```typescript
export const COLORS = {
  primary: '#0F766E',    // Teal
  secondary: '#F97316',  // Orange
  // ... more colors
};
```

### App Name & Icons
Edit `mobile/app.json`:
```json
{
  "expo": {
    "name": "Eventica",
    "slug": "eventhaiti-mobile",
    ...
  }
}
```

## 📦 Building for Production

### Using EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Standalone Builds
```bash
# iOS (requires Mac + Xcode)
npm run build:ios

# Android
npm run build:android
```

## 🔗 Resources

- **Expo Docs**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **Firebase**: https://firebase.google.com/docs
- **React Native**: https://reactnative.dev

## 🐛 Troubleshooting

### Metro bundler issues
```bash
npm start -- --clear
```

### Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### Firebase connection issues
- Verify `.env` file exists and has correct values
- Check Firebase project settings
- Ensure web app's Firebase config is correct

## 🤝 Contributing

The mobile app shares the same backend as the web app. Changes to Firestore schema or Firebase configuration will affect both platforms.

---

**Status**: ✅ Core app structure complete and ready for development
**Deployed**: Commit `39009e6`
