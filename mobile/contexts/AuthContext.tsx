import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isDemoMode } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'attendee' | 'organizer' | 'admin';
  phone_number?: string;
  default_city?: string;
  default_country?: string; // Country code: HT, US, CA, FR, DO
  default_subarea?: string; // State/region within country
  is_verified?: boolean;
  photo_url?: string;
}

type UserProfilePatch = Partial<Pick<UserProfile, 'full_name' | 'phone_number' | 'default_city' | 'default_country' | 'default_subarea' | 'photo_url'>>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (patch: UserProfilePatch) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async (uid?: string) => {
    const userId = uid || user?.uid;
    if (!userId) return;

    // Demo mode: keep the mock profile in sync.
    if (isDemoMode) {
      setUserProfile((prev) => (prev ? { ...prev } : prev));
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserProfile({ id: userId, ...(userDoc.data() as Omit<UserProfile, 'id'>) });
      }
    } catch (error) {
      console.error('[Auth] Error refreshing user profile:', error);
    }
  };

  const updateUserProfile = async (patch: UserProfilePatch) => {
    if (!user?.uid) throw new Error('Not signed in');

    const trimmed: any = {
      ...patch,
      updated_at: new Date().toISOString(),
    };

    if (typeof trimmed.full_name === 'string') trimmed.full_name = trimmed.full_name.trim();
    if (typeof trimmed.default_city === 'string') trimmed.default_city = trimmed.default_city.trim();
    if (typeof trimmed.phone_number === 'string') {
      const p = trimmed.phone_number.trim();
      trimmed.phone_number = p.length ? p : null;
    }

    if (isDemoMode) {
      setUserProfile((prev) => (prev ? ({ ...prev, ...(trimmed as any) } as any) : prev));
      return;
    }

    await setDoc(doc(db, 'users', user.uid), trimmed, { merge: true });
    await refreshUserProfile(user.uid);
  };

  // Configure Google Sign-In with proper redirect URI
  // Use reverse client ID format that Google accepts
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Expo handles the redirect automatically in production builds
  });

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignInSuccess(id_token);
    }
  }, [response]);

  useEffect(() => {
    // Demo mode: Auto-login without Firebase
    if (isDemoMode) {
      console.log('[Auth] Demo mode enabled - skipping Firebase');
      // Create a mock user
      const demoUser = {
        uid: 'demo-user-123',
        email: 'demo@joineventica.com',
        displayName: 'Demo User',
      } as User;
      
      setUser(demoUser);
      setUserProfile({
        id: 'demo-user-123',
        email: 'demo@joineventica.com',
        full_name: 'Demo User',
        role: 'attendee',
      });
      setLoading(false);
      return;
    }

    // Production mode: Use Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await refreshUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleGoogleSignInSuccess = async (idToken: string) => {
    try {
      // Create Firebase credential with Google ID token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user document exists, if not create it
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          full_name: user.displayName || '',
          role: 'attendee',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      full_name: fullName,
      role: 'attendee',
      created_at: new Date().toISOString(),
      is_verified: false,
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await AsyncStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signInWithGoogle, signUp, signOut, refreshUserProfile: async () => refreshUserProfile(), updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
