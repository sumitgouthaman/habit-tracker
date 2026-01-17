import { format, startOfWeek, startOfMonth } from "date-fns";
import { WEEK_STARTS_ON } from "./constants";

const STORAGE_KEY = "habitTracker_habits";
const GUEST_MODE_KEY = "habitTracker_guestMode";

// --- Helpers ---

// Generate a unique ID (similar to Firestore auto-generated IDs)
const generateId = () => {
    return 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Period key generator (same as db.js for consistency)
export const getPeriodKey = (date, type) => {
    if (type === 'weekly') {
        return format(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }), 'yyyy-MM-dd');
    }
    if (type === 'monthly') {
        return format(startOfMonth(date), 'yyyy-MM');
    }
    return format(date, 'yyyy-MM-dd'); // Daily
};

// --- Storage Helpers ---

const getStoredHabits = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error reading from localStorage:", e);
        return [];
    }
};

const setStoredHabits = (habits) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        // Dispatch a custom event for same-tab updates
        window.dispatchEvent(new CustomEvent('localHabitsChanged', { detail: habits }));
    } catch (e) {
        console.error("Error writing to localStorage:", e);
    }
};

// --- Guest Mode ---

// Check if guest mode should be active (either explicitly set OR has local data)
export const isGuestMode = () => {
    // If explicitly set as guest, return true
    if (localStorage.getItem(GUEST_MODE_KEY) === 'true') {
        return true;
    }
    // Also auto-enable if there's local habit data (for returning users)
    const habits = getStoredHabits();
    return habits.length > 0;
};

export const setGuestMode = (value) => {
    if (value) {
        localStorage.setItem(GUEST_MODE_KEY, 'true');
    } else {
        localStorage.removeItem(GUEST_MODE_KEY);
    }
};

// --- Habit Operations ---

export async function createHabit(habitData) {
    const habits = getStoredHabits();
    const newId = generateId();

    const newHabit = {
        ...habitData,
        id: newId,
        createdAt: new Date().toISOString(),
        archived: false,
        logs: {}
    };

    habits.push(newHabit);
    setStoredHabits(habits);

    return newId;
}

export async function getUserHabits() {
    const habits = getStoredHabits();
    return habits.filter(h => !h.archived);
}

export async function getAllHabits() {
    return getStoredHabits();
}

export function subscribeToHabits(callback) {
    // Initial call with current data
    const initialHabits = getStoredHabits().filter(h => !h.archived);
    // Use setTimeout to make this async-like
    setTimeout(() => callback(initialHabits), 0);

    // Listen for changes from same tab
    const handleLocalChange = (e) => {
        const habits = e.detail.filter(h => !h.archived);
        callback(habits);
    };

    // Listen for changes from other tabs
    const handleStorageChange = (e) => {
        if (e.key === STORAGE_KEY) {
            try {
                const habits = e.newValue ? JSON.parse(e.newValue) : [];
                callback(habits.filter(h => !h.archived));
            } catch (err) {
                console.error("Error parsing storage event:", err);
            }
        }
    };

    window.addEventListener('localHabitsChanged', handleLocalChange);
    window.addEventListener('storage', handleStorageChange);

    // Return unsubscribe function
    return () => {
        window.removeEventListener('localHabitsChanged', handleLocalChange);
        window.removeEventListener('storage', handleStorageChange);
    };
}

export async function updateHabit(habitId, updates) {
    const habits = getStoredHabits();
    const index = habits.findIndex(h => h.id === habitId);

    if (index !== -1) {
        habits[index] = { ...habits[index], ...updates };
        setStoredHabits(habits);
    }
}

export async function deleteHabit(habitId) {
    // Logical delete (archive)
    await updateHabit(habitId, { archived: true });
}

// --- Log Operations ---

export async function updateLog(habitId, date, value, targetCount, type = 'daily') {
    const periodKey = date instanceof Date ? getPeriodKey(date, type) : date;
    const isCompleted = value >= targetCount;

    const habits = getStoredHabits();
    const index = habits.findIndex(h => h.id === habitId);

    if (index !== -1) {
        const habit = habits[index];
        habit.logs = habit.logs || {};
        habit.logs[periodKey] = {
            value: value,
            completed: isCompleted,
            updatedAt: new Date().toISOString()
        };
        habits[index] = habit;
        setStoredHabits(habits);
    }
}

// --- Data Management ---

export async function exportUserData() {
    const habits = await getUserHabits();
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        habits: habits
    };
}

export async function importUserData(data) {
    if (!data || !data.habits || !Array.isArray(data.habits)) {
        throw new Error("Invalid import file format. Missing 'habits' array.");
    }

    // Replace all habits with imported data
    setStoredHabits(data.habits);
}

export async function deleteUserData() {
    setStoredHabits([]);
}

// --- Sync Helpers ---

export function hasLocalData() {
    const habits = getStoredHabits();
    return habits.length > 0;
}

export function getLocalHabitsForSync() {
    return getStoredHabits();
}

export function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('localHabitsChanged', { detail: [] }));
}
