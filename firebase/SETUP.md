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

### Android (Wear OS) App
1.  Go to **Project settings** > **General**.
2.  Click **Add app** and select **Android**.
3.  Enter the package name (e.g., `com.sumitgouthaman.habittracker`).
4.  Add your **debug SHA-1 key** to the Android app configuration (this is required for Google Sign-In).
    *   **Finding the Debug SHA-1 via Gradle**:
        Open a terminal in the `android` directory and run:
        ```bash
        ./gradlew signingReport
        ```
        Look for the `SHA1` under the `Variant: debug` output.
    *   **Finding the Debug SHA-1 via keytool (Mac/Linux)**:
        ```bash
        keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
        ```
    > [!WARNING]
    > **Development Only:** The debug SHA-1 key should only be used for local development. Before publishing to the Google Play Store, you must generate a proper release signing key, sign your app with it, and add the **production** SHA-1 fingerprint to the Firebase Android app configuration.

5.  Download the `google-services.json` file.
6.  Place the `google-services.json` file into the `android/app/` directory of this repository.

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
