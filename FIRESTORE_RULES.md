# Firestore Security Rules for Eventica

Update these rules in Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is the owner
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is organizer
    function isOrganizer() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'organizer';
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read user profiles (for event organizer info)
      allow read: if true;
      // Users can only write their own document
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update, delete: if isOwner(userId) || isAdmin();
    }
    
    // Events collection
    match /events/{eventId} {
      // Anyone can read published events
      allow read: if true;
      // Authenticated users can create events
      allow create: if isAuthenticated() && 
        request.resource.data.organizer_id == request.auth.uid;
      // Only event organizer or admin can update/delete
      allow update: if isAuthenticated() && 
        (resource.data.organizer_id == request.auth.uid || isAdmin());
      allow delete: if isAuthenticated() && 
        (resource.data.organizer_id == request.auth.uid || isAdmin());
    }
    
    // Tickets collection
    match /tickets/{ticketId} {
      // Users can read their own tickets, organizers can read tickets for their events
      allow read: if isAuthenticated() && 
        (request.auth.uid == resource.data.user_id ||
         get(/databases/$(database)/documents/events/$(resource.data.event_id)).data.organizer_id == request.auth.uid);
      // Users can create tickets when purchasing
      allow create: if isAuthenticated();
      // Users can update their own tickets (for transfers, etc)
      allow update: if isAuthenticated() && 
        (request.auth.uid == resource.data.user_id ||
         get(/databases/$(database)/documents/events/$(resource.data.event_id)).data.organizer_id == request.auth.uid);
      // Only ticket owner can delete
      allow delete: if isOwner(resource.data.user_id);
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      // Anyone can read reviews
      allow read: if true;
      // Authenticated users can create reviews
      allow create: if isAuthenticated() && 
        request.resource.data.user_id == request.auth.uid;
      // Only review author can update/delete their review
      allow update, delete: if isOwner(resource.data.user_id);
    }
    
    // Promo codes collection
    match /promo_codes/{codeId} {
      // Anyone can read promo codes (for validation)
      allow read: if true;
      // Only event organizers can create promo codes for their events
      allow create: if isAuthenticated() && 
        get(/databases/$(database)/documents/events/$(request.resource.data.event_id)).data.organizer_id == request.auth.uid;
      // Only event organizer can update/delete promo codes
      allow update, delete: if isAuthenticated() && 
        get(/databases/$(database)/documents/events/$(resource.data.event_id)).data.organizer_id == request.auth.uid;
    }
    
    // Favorites collection
    match /favorites/{favoriteId} {
      // Users can read their own favorites
      allow read: if isOwner(resource.data.user_id);
      // Users can create their own favorites
      allow create: if isAuthenticated() && 
        request.resource.data.user_id == request.auth.uid;
      // Users can delete their own favorites
      allow delete: if isOwner(resource.data.user_id);
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      // Users can read their own notifications
      allow read: if isOwner(resource.data.user_id);
      // System can create notifications
      allow create: if true;
      // Users can update their own notifications (mark as read)
      allow update: if isOwner(resource.data.user_id);
      // Users can delete their own notifications
      allow delete: if isOwner(resource.data.user_id);
    }
    
    // All other collections - deny by default for security
    // Add specific rules for each collection as needed
  }
}
```

## Important Notes:

1. **For development/testing**, if you need more permissive rules temporarily, you can use:
   ```javascript
   match /{document=**} {
     allow read, write: if request.auth != null;
   }
   ```
   ⚠️ **WARNING**: Don't use this in production!

2. **After updating rules**, changes take effect immediately.

3. **Test your rules** using the Firestore Rules Playground in the Firebase Console.

4. Make sure users have the correct `role` field in their user documents:
   - `attendee` - Regular users who buy tickets
   - `organizer` - Users who can create events
   - `admin` - Full access to all resources
