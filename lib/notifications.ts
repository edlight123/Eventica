import type { Notification, NotificationPreferences } from '@/types/notifications'
import type { NotificationType } from '@/types/database'

/**
 * DELIBERATE LAZY FIREBASE — DO NOT MAKE THESE IMPORTS STATIC AGAIN.
 *
 * NotificationsClient imports this module, and a static `firebase/firestore`
 * import here put the whole SDK on the FIRST LOAD of every page (measured:
 * 444KB of Firebase across three chunks — 223 + 136 + 85KB — out of ~988KB of
 * shared JS). A route only sheds that weight when its LAST static importer
 * stops pulling the SDK, so the imports live inside the functions that use
 * them. `./firebase/client` counts too: it runs initializeApp/getFirestore at
 * module scope, so importing `db` statically re-anchors the SDK by itself.
 *
 * The module-scope caches mean a page that calls several of these helpers pays
 * for the dynamic import exactly once. Every exported signature is unchanged —
 * all of these were already async, so consumers needed no edits.
 */
let _fs: typeof import('firebase/firestore') | null = null
async function fs() { return (_fs ??= await import('firebase/firestore')) }

let _fb: typeof import('./firebase/client') | null = null
async function fb() { return (_fb ??= await import('./firebase/client')) }

/**
 * Create a new in-app notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  eventId?: string,
  ticketId?: string
): Promise<string> {
  const [{ collection, addDoc, Timestamp }, { db }] = await Promise.all([fs(), fb()])
  const notificationsRef = collection(db, 'users', userId, 'notifications')

  const notification = {
    type,
    title,
    message,
    eventId: eventId || null,
    ticketId: ticketId || null,
    isRead: false,
    createdAt: Timestamp.now(),
    readAt: null
  }
  
  const docRef = await addDoc(notificationsRef, notification)
  return docRef.id
}

/**
 * Mark a notification as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const [{ doc, updateDoc, Timestamp }, { db }] = await Promise.all([fs(), fb()])
  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId)
  await updateDoc(notificationRef, {
    isRead: true,
    readAt: Timestamp.now()
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const [{ collection, query, where, getDocs, writeBatch, Timestamp }, { db }] =
    await Promise.all([fs(), fb()])
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const q = query(notificationsRef, where('isRead', '==', false))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      isRead: true,
      readAt: Timestamp.now()
    })
  })
  
  await batch.commit()
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const [{ collection, query, where, getDocs }, { db }] = await Promise.all([fs(), fb()])
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(notificationsRef, where('isRead', '==', false))
    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied') {
      console.warn('Firestore permission denied for notifications. Please deploy firestore.rules.')
      return 0
    }
    console.error('Error getting unread count:', error)
    return 0
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  try {
    const [{ collection, query, orderBy, limit, getDocs }, { db }] = await Promise.all([fs(), fb()])
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      userId,
      type: doc.data().type,
      title: doc.data().title,
      message: doc.data().message,
      actionUrl: doc.data().actionUrl || undefined,
      eventId: doc.data().eventId || undefined,
      ticketId: doc.data().ticketId || undefined,
      metadata: doc.data().metadata || undefined,
      isRead: doc.data().isRead,
      createdAt: doc.data().createdAt.toDate().toISOString(),
      readAt: doc.data().readAt?.toDate()?.toISOString() || undefined
    }))
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied') {
      console.warn('Firestore permission denied for notifications. Please deploy firestore.rules.')
      return []
    }
    console.error('Error getting user notifications:', error)
    return []
  }
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const [{ doc, getDoc }, { db }] = await Promise.all([fs(), fb()])
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)

  if (!userDoc.exists()) {
    return {
      notifyTicketPurchase: true,
      notifyEventUpdates: true,
      notifyReminders: true
    }
  }
  
  const data = userDoc.data()
  return {
    notifyTicketPurchase: data.notify_ticket_purchase ?? true,
    notifyEventUpdates: data.notify_event_updates ?? true,
    notifyReminders: data.notify_reminders ?? true
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const [{ doc, updateDoc }, { db }] = await Promise.all([fs(), fb()])
  const userRef = doc(db, 'users', userId)

  const updates: any = {}
  if (preferences.notifyTicketPurchase !== undefined) {
    updates.notify_ticket_purchase = preferences.notifyTicketPurchase
  }
  if (preferences.notifyEventUpdates !== undefined) {
    updates.notify_event_updates = preferences.notifyEventUpdates
  }
  if (preferences.notifyReminders !== undefined) {
    updates.notify_reminders = preferences.notifyReminders
  }
  
  await updateDoc(userRef, updates)
}

/**
 * Delete old read notifications (cleanup helper)
 */
export async function deleteOldReadNotifications(
  userId: string,
  olderThanDays: number = 30
): Promise<number> {
  const [{ collection, query, where, getDocs, writeBatch, Timestamp }, { db }] =
    await Promise.all([fs(), fb()])
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const q = query(
    notificationsRef,
    where('isRead', '==', true),
    where('readAt', '<', Timestamp.fromDate(cutoffDate))
  )
  
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return 0
  
  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })
  
  await batch.commit()
  return snapshot.size
}
