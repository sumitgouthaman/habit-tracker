import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { format, startOfWeek, startOfMonth } from "date-fns";

const USERS_COLLECTION = "users";
const HABITS_COLLECTION = "habits";

// --- Helpers ---

// Deterministic ID generator (Kept for compatibility, mostly used for keys now)
export const getPeriodKey = (date, type) => {
    if (type === 'weekly') {
        return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday
    }
    if (type === 'monthly') {
        return format(startOfMonth(date), 'yyyy-MM');
    }
    return format(date, 'yyyy-MM-dd'); // Daily
};

// --- Habit Operations ---

export async function createHabit(userId, habitData) {
    // habitData should have: title, type ('daily', 'weekly', 'monthly'), targetCount
    const newHabitRef = doc(collection(db, USERS_COLLECTION, userId, HABITS_COLLECTION));

    await setDoc(newHabitRef, {
        ...habitData,
        id: newHabitRef.id,
        // userId: userId, // REMOVED: userId is inferred from auth/path
        createdAt: serverTimestamp(),
        archived: false,
        logs: {} // Initialize empty logs map
    });

    return newHabitRef.id;
}

export async function getUserHabits(userId) {
    const q = query(
        collection(db, USERS_COLLECTION, userId, HABITS_COLLECTION),
        where("archived", "==", false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
}

export function subscribeToHabits(userId, callback) {
    const q = query(
        collection(db, USERS_COLLECTION, userId, HABITS_COLLECTION),
        where("archived", "==", false)
    );

    return onSnapshot(q, (snapshot) => {
        const habits = snapshot.docs.map(doc => doc.data());
        callback(habits);
    });
}

export async function updateHabit(userId, habitId, updates) {
    const habitRef = doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habitId);
    await updateDoc(habitRef, updates);
}

export async function deleteHabit(userId, habitId) {
    // logical delete (archive)
    await updateHabit(userId, habitId, { archived: true });
}

// --- Log Operations (Consolidated) ---

export async function updateLog(userId, habitId, date, value, targetCount, type = 'daily') {
    // Date can be a Date object or the period string if already calculated
    const periodKey = date instanceof Date ? getPeriodKey(date, type) : date;

    const habitRef = doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habitId);
    const isCompleted = value >= targetCount;

    // We simply update the specific key in the 'logs' map
    // Firestore allows dot notation for map updates: "logs.2023-10-27"
    await updateDoc(habitRef, {
        [`logs.${periodKey}`]: {
            value: value,
            completed: isCompleted,
            updatedAt: serverTimestamp() // We can still track when this specific log was touched
        }
    });

    // Note: We NO LONGER calculate streaks/totals here. 
    // The client calculates them on-the-fly from the 'logs' map.
}

export async function deleteUserData(userId) {
    // 1. Delete all habits
    const habits = await getUserHabits(userId);
    for (const habit of habits) {
        // This deletes the doc, including the embedded logs
        await deleteDoc(doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habit.id));
    }
}
