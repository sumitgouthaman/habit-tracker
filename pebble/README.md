# Habit Tracker for Pebble Time 2

A companion watch app for the **Habit Tracker** project, designed and optimized for the 2026 **Pebble Time 2** (`emery` platform, 200×228 64-color e-paper display). Also compatible with Basalt, Chalk, Diorite, and Aplite.

## Features

- **Pebble Time 2 Optimized**: High-contrast dark theme utilizing the 200×228 display with custom-rendered habit cards, crisp typography, and fluid progress bars.
- **Sectioned Organization**:
  - **Daily Goals** (e.g., Drink Water, Read 20 mins, Workout)
  - **Weekly Goals** (e.g., Meal Prep, Weekly Review)
  - **Monthly Goals** (e.g., Monthly Budget, Goal Review)
- **Flexible Tracking**:
  - **Binary Habits**: Press **SELECT** to instantly toggle completion (with haptic feedback).
  - **Count Habits**: Press **SELECT** to open the Increment & Detail view with custom increments (`+1`, `+2`, `+4`, `-1 (Undo)`, and `Reset`).
  - **Derived Habits**: Auto-calculated habits marked with an `[auto]` badge (read-only).
- **Date Navigation**: Navigate backwards to "Yesterday" or earlier days directly from your wrist.
- **Offline Persistent Storage**: Habits and progress are cached locally on watch flash (`persist_write_data`), making the app immediately responsive even without a phone connection.
- **PebbleKit JS & Firebase Sync**:
  - Automatically syncs with your Firebase Firestore database using the Firestore REST API.
  - Setup Screen: If not connected, the watch shows clear instructions to copy the token from the web app and paste it in phone settings.
  - Companion Configuration Page: Tap the gear icon in the Pebble phone app to paste your Pebble Sync Token.

## Directory Structure

```
pebble/
├── package.json          # Pebble app manifest (UUID, platforms, message keys)
├── wscript               # Waf build configuration
├── src/
│   ├── c/
│   │   ├── pebble.c            # App entry point & lifecycle
│   │   ├── habit_model.h/.c    # Habit data models, period keys & flash persistence
│   │   ├── ui_habit_list.h/.c  # Main sectioned MenuLayer with custom cell rendering
│   │   ├── ui_habit_detail.h/.c# Habit detail & increment action view
│   │   └── comm.h/.c           # Pebble AppMessage communication
│   └── pkjs/
│       ├── index.js            # PebbleKit JS companion (Firestore REST sync)
│       └── config.html         # Settings page for Pebble Sync Token
└── README.md
```

## Building and Deploying

For prerequisites, setting up the Pebble toolchain, building the app, and deploying to an emulator or physical watch, follow the official Rebble developer documentation:
👉 [**Rebble SDK Documentation**](https://developer.repebble.com/sdk/)

Common tasks such as building the bundle, launching emulators, and sideloading over CloudPebble, local Wi-Fi, or ADB are detailed there.

## Authentication & Sync Setup

1. Open the Habit Tracker web app in your browser and go to **Settings** > **Pebble Watch Companion**.
2. Click **Copy Pebble Sync Token**.
3. In the Pebble mobile app on your phone, tap the **gear icon (Settings)** next to the **Habits** app.
4. Paste your token into the box and tap **Save & Connect Watch**.
5. The watch app will automatically receive your active habits from Firestore!
