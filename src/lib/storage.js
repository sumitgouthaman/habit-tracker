import * as firebaseDb from "./db";
import * as localDb from "./localDb";

/**
 * Creates a unified storage interface that routes to either Firebase or local storage
 * based on whether there's a logged-in user.
 * 
 * @param {string|null} userId - Firebase user ID, or null for guest/local mode
 * @returns {Object} Storage interface with all database operations
 */
export function createStorageInterface(userId) {
    if (userId) {
        // Logged-in user: use Firebase
        return {
            createHabit: (data) => firebaseDb.createHabit(userId, data),
            getUserHabits: () => firebaseDb.getUserHabits(userId),
            subscribeToHabits: (callback) => firebaseDb.subscribeToHabits(userId, callback),
            updateHabit: (id, updates) => firebaseDb.updateHabit(userId, id, updates),
            deleteHabit: (id) => firebaseDb.deleteHabit(userId, id),
            updateLog: (id, date, val, target, type) => firebaseDb.updateLog(userId, id, date, val, target, type),
            exportUserData: () => firebaseDb.exportUserData(userId),
            importUserData: (data) => firebaseDb.importUserData(userId, data),
            deleteUserData: () => firebaseDb.deleteUserData(userId),
            isLocal: false
        };
    } else {
        // Guest mode: use local storage
        return {
            createHabit: (data) => localDb.createHabit(data),
            getUserHabits: () => localDb.getUserHabits(),
            subscribeToHabits: (callback) => localDb.subscribeToHabits(callback),
            updateHabit: (id, updates) => localDb.updateHabit(id, updates),
            deleteHabit: (id) => localDb.deleteHabit(id),
            updateLog: (id, date, val, target, type) => localDb.updateLog(id, date, val, target, type),
            exportUserData: () => localDb.exportUserData(),
            importUserData: (data) => localDb.importUserData(data),
            deleteUserData: () => localDb.deleteUserData(),
            isLocal: true
        };
    }
}

// Re-export getPeriodKey for convenience (same implementation in both modules)
export { getPeriodKey } from "./db";

// Export sync helpers from localDb
export { hasLocalData, getLocalHabitsForSync, clearLocalData } from "./localDb";

// Export Firebase functions for sync operations
export const syncLocalToFirebase = async (userId, localHabits) => {
    // Import each local habit to Firebase
    for (const habit of localHabits) {
        // Generate a new ID for Firebase (local IDs won't work)
        const habitData = {
            title: habit.title,
            type: habit.type,
            targetCount: habit.targetCount,
            logs: habit.logs || {},
            archived: habit.archived || false,
            // Preserve original creation time if available
            createdAt: habit.createdAt
        };

        // If habit has frequency or increments, include them
        if (habit.frequency) habitData.frequency = habit.frequency;
        if (habit.increments) habitData.increments = habit.increments;

        await firebaseDb.createHabit(userId, habitData);
    }
};
