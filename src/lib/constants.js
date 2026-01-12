// Limits
export const MAX_HABITS = 10;
export const MAX_STREAK_LOOKBACK_DAYS = 365 * 10;
export const FIRESTORE_BATCH_SIZE = 500;

// Timing
export const EVENING_WARNING_HOUR = 21; // 9pm - when to show time remaining warning
export const DEBOUNCE_DELAY_MS = 1000; // 1 second debounce for habit updates
export const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check for SW updates every hour

// Config
export const WEEK_STARTS_ON = 1; // 0 = Sunday, 1 = Monday
export const STREAK_MILESTONES = [7, 30, 50, 100, 150, 200, 365]; // Days to celebrate
