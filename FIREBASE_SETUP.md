# Firebase Setup Instructions

## Firestore Security Rules

To enable the trip sharing functionality, you need to deploy the Firestore security rules to your Firebase project.

### Option 1: Deploy using Firebase CLI (Recommended)

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Accept the default `firestore.rules` file location

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Manual deployment via Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste it into the rules editor
6. Click **Publish**

## Required Collections

The sharing functionality uses the following Firestore collections:

- **trips** - Main trip documents
- **stops** - Stop documents associated with trips
- **transportSegments** - Transport information between stops
- **shareTokens** - Share tokens for trip sharing
- **users** - User profile information

These collections will be created automatically as users interact with the app.

## Security Notes

- Share tokens are readable by anyone (required for the sharing feature to work)
- Users can only create share tokens for trips they own
- Users can only access trips they created or have been shared with
- Collaborative trips allow all members with appropriate permissions to edit

## Testing

After deploying the rules, test the sharing functionality:

1. Create a trip in the app
2. Click the share button
3. Generate a share link
4. Verify that the link is created without errors
5. Test sharing with another account

## Troubleshooting

If you encounter permission errors:

1. Check the Firebase Console logs: **Firestore Database** → **Usage** → **Errors**
2. Verify that the rules have been deployed correctly
3. Ensure your app has the correct Firebase configuration in `.env`
4. Check that the user is authenticated before attempting to create a share link
