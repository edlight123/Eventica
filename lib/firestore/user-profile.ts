import { db } from '@/lib/firebase/client'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import {
  type SocialLinks,
  type PrivacySettings,
  DEFAULT_PRIVACY,
  sanitizeSocialLinks,
  sanitizePrivacy,
} from '@/types/social'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  phone?: string
  bio?: string
  socialLinks?: SocialLinks
  privacy?: PrivacySettings
  defaultCountry?: string
  defaultCity?: string
  subareaType?: 'COMMUNE' | 'NEIGHBORHOOD'
  defaultSubarea?: string
  favoriteCategories?: string[]
  language?: 'en' | 'fr' | 'ht'
  notify?: {
    reminders: boolean
    updates: boolean
    promos: boolean
  }
  role?: string
  isVerified?: boolean
  verificationStatus?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Get user profile from Firestore (client-side)
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    
    if (!userDoc.exists()) {
      return null
    }

    const data = userDoc.data()
    return {
      uid: userDoc.id,
      displayName: data.full_name || data.display_name || data.displayName || '',
      email: data.email || '',
      photoURL: data.photo_url || data.photoURL || '',
      phone: data.phone_number || data.phone || '',
      bio: data.bio || '',
      socialLinks: data.social_links || {},
      privacy: { ...DEFAULT_PRIVACY, ...(data.privacy || {}) },
      defaultCountry: data.default_country || data.defaultCountry || 'HT',
      defaultCity: data.default_city || data.defaultCity || '',
      subareaType: data.subarea_type || data.subareaType || 'COMMUNE',
      defaultSubarea: data.default_subarea || data.defaultSubarea || '',
      favoriteCategories: data.favorite_categories || data.favoriteCategories || [],
      language: data.language || 'en',
      notify: {
        reminders: data.notify?.reminders ?? true,
        updates: data.notify?.updates ?? true,
        promos: data.notify?.promos ?? false
      },
      role: data.role || 'attendee',
      isVerified: data.is_verified || false,
      verificationStatus: data.verification_status || 'none',
      createdAt: (data.created_at?.toDate?.() || data.createdAt?.toDate?.() || new Date()).toISOString(),
      updatedAt: (data.updated_at?.toDate?.() || data.updatedAt?.toDate?.() || new Date()).toISOString()
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Create user profile in Firestore (client-side)
 */
export async function createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid)
    
    await setDoc(userRef, {
      display_name: profile.displayName || '',
      email: profile.email || '',
      photo_url: profile.photoURL || '',
      phone: profile.phone || '',
      default_country: profile.defaultCountry || 'HT',
      default_city: profile.defaultCity || '',
      subarea_type: profile.subareaType || 'COMMUNE',
      default_subarea: profile.defaultSubarea || '',
      favorite_categories: profile.favoriteCategories || [],
      language: profile.language || 'en',
      notify: {
        reminders: profile.notify?.reminders ?? true,
        updates: profile.notify?.updates ?? true,
        promos: profile.notify?.promos ?? false
      },
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

/**
 * Update user profile in Firestore (client-side)
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid)
    
    const updateData: any = {
      updated_at: serverTimestamp()
    }

    // Use full_name to match server-side convention
    if (updates.displayName !== undefined) {
      updateData.full_name = updates.displayName
      updateData.display_name = updates.displayName // Keep both for compatibility
    }
    if (updates.phone !== undefined) {
      updateData.phone_number = updates.phone
      updateData.phone = updates.phone // Keep both for compatibility
    }
    if (updates.photoURL !== undefined) updateData.photo_url = updates.photoURL
    if (updates.bio !== undefined) updateData.bio = String(updates.bio).slice(0, 280)
    if (updates.socialLinks !== undefined) updateData.social_links = sanitizeSocialLinks(updates.socialLinks)
    if (updates.privacy !== undefined) updateData.privacy = sanitizePrivacy(updates.privacy)
    if (updates.defaultCountry !== undefined) updateData.default_country = updates.defaultCountry
    if (updates.defaultCity !== undefined) updateData.default_city = updates.defaultCity
    if (updates.subareaType !== undefined) updateData.subarea_type = updates.subareaType
    if (updates.defaultSubarea !== undefined) updateData.default_subarea = updates.defaultSubarea
    if (updates.favoriteCategories !== undefined) updateData.favorite_categories = updates.favoriteCategories
    if (updates.language !== undefined) updateData.language = updates.language
    if (updates.notify !== undefined) updateData.notify = updates.notify

    await updateDoc(userRef, updateData)
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}
