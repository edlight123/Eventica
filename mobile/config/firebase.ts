// Firebase configuration for mobile app
import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the same Firebase config as the web app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123:demo',
};

console.log('[Firebase] Initializing with config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence so the session survives cold
// app restarts (in-memory persistence logged users out on every relaunch).
// `getReactNativePersistence` lives on firebase/auth's React Native build (what
// Metro bundles) but isn't on the web type surface, so access it dynamically;
// fall back to in-memory if it's ever unavailable, and to getAuth() on the
// "already-initialized" throw during Fast Refresh.
export const auth = (() => {
  try {
    const authModule = require('firebase/auth') as any;
    const persistence = typeof authModule.getReactNativePersistence === 'function'
      ? authModule.getReactNativePersistence(AsyncStorage)
      : inMemoryPersistence;
    return initializeAuth(app, { persistence });
  } catch {
    return getAuth(app);
  }
})();

// Initialize services
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

console.log('[Firebase] Demo mode:', isDemoMode);

export default app;
