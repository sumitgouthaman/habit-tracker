# Firebase Setup & Management

This folder contains the configuration and documentation for the Habit Tracker's backend infrastructure on Firebase.

## Prerequisites

1.  **Node.js** installed.
2.  **Firebase CLI** installed globally:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Login** to Firebase:
    ```bash
    firebase login
    ```

## Project Configuration

The following files control the Firebase setup:
-   `firebase.json`: Configuration for Hosting, Firestore, etc.
-   `firestore.rules`: Security rules for the database.
-   `firestore.indexes.json`: Definition of composite indexes.
-   `.firebaserc`: Project aliases (maps `default` to `habittracker-b6ec8`).

## Common Commands

Run these commands from the `firebase/` directory (cd into it first).

### 1. Deploying Rules
To update your security rules without re-deploying the whole site:
```bash
firebase deploy --only firestore:rules
```

### 2. Deploying the Web App
To build and deploy the React application:
```bash
# Go back to root
cd ..
npm run build

# Go to firebase folder
cd firebase
firebase deploy --only hosting
```
*Note: The `firebase.json` is configured to look for the `../dist` folder.*

### 3. Local Development (Emulators)
To run a local instance of Firestore and Hosting for testing:
```bash
firebase emulators:start
```

## Manual Setup (Console)

If you prefer using the Firebase Console:

### Authentication
1.  Go to **Authentication** > **Sign-in method**.
2.  Enable **Google** provider.

### Firestore Database
1.  Create a database in **Production mode**.
2.  Location: `us-central1` (or your preference).

### Security Rules
The `firestore.rules` file in this directory contains the source of truth.
It ensures users can ONLY access their own data path: `/users/{userId}/...`.

### Email Allowlist
You can restrict access to specific email addresses by modifying the `allowedEmails` list in `firestore.rules` (inside the `isAllowedUser` function).
-   **Empty List (`[]`)**: Access is allowed for ALL authenticated users (checking their own data).
-   **Populated List**: Only users with emails in the list can access their data.

### Indexes
The app uses composite indexes to query `habit_logs` efficiently (e.g., sorting by date for a specific habit).
These are defined in `firestore.indexes.json`.

To deploy indexes:
```bash
firebase deploy --only firestore:indexes
```
