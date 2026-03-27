# Firebase Storage Setup Instructions

## Issue
Permission errors blocking file uploads from the web application to Firebase Storage.

## Quick Fix - Update Storage Security Rules

### Step 1: Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **eventica**
3. Navigate to: **Storage** → **Rules**

### Step 2: Copy and Apply These Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Event banner images - allow authenticated users to upload
    match /event-images/{imageId} {
      allow read: if true; // Public read for event banners
      allow write: if request.auth != null; // Only authenticated users can upload
      allow delete: if request.auth != null; // Only authenticated users can delete
    }
    
    // Verification images - only accessible by user who uploaded
    match /verification/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // User profile images
    match /profile-images/{userId}/{allPaths=**} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Event photos/gallery
    match /event-photos/{eventId}/{allPaths=**} {
      allow read: if true; // Public read
      allow write: if request.auth != null; // Authenticated users can upload
      allow delete: if request.auth != null; // Authenticated users can delete
    }
    
    // Default: deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish
Click **Publish** to save the rules.

### Step 4: Test
Try uploading an event image again. It should work now!

---

## Alternative: Deploy Rules via CLI

If you have Firebase CLI installed:

```bash
firebase deploy --only storage
```

This will deploy the `storage.rules` file in the project root.

---

## Troubleshooting

If still having issues:

1. **Check Firebase Storage is enabled**:
   - Go to Firebase Console → Storage
   - Ensure Storage is activated for your project

2. **Verify bucket name**:
   - Should be: `eventica.firebasestorage.app`

3. **Check browser console** for any new errors

4. **Clear browser cache** and try again
