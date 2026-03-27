# Firestore Index Setup for Revenue Analytics

## Required Index

The admin revenue analytics feature requires a Firestore composite index on the `tickets` collection.

### Create Index via Firebase Console

1. **Visit the Firebase Console:**
   - Go to https://console.firebase.google.com/project/eventica/firestore/indexes

2. **Click "Create Index"**

3. **Configure the index:**
   - **Collection ID:** `tickets`
   - **Fields:**
     1. Field: `status` | Order: Ascending
     2. Field: `created_at` | Order: Ascending
   - **Query scope:** Collection

4. **Click "Create"**

The index will take a few minutes to build.

### Alternative: Use the Auto-Generated Link

When you see the error in the logs, Firebase provides a direct link to create the index. Copy the URL that looks like:

```
https://console.firebase.google.com/v1/r/project/eventica/firestore/indexes?create_composite=...
```

Click this link and it will pre-configure the index for you.

### Verify Index is Ready

Once created, the index status will show as "Building" then "Enabled" in the Firebase Console under Firestore > Indexes.

The revenue analytics will work once the index status is "Enabled".

## Index Definition (for reference)

```json
{
  "collectionGroup": "tickets",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "created_at",
      "order": "ASCENDING"
    }
  ]
}
```

This index is defined in `firestore.indexes.json` and will be deployed automatically with `firebase deploy --only firestore:indexes` when Firebase CLI is authenticated.
