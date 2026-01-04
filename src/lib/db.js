import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment
} from "firebase/firestore";
import { db } from "./firebase";
import { format, startOfWeek, startOfMonth } from "date-fns";

const USERS_COLLECTION = "users";
const HABITS_COLLECTION = "habits";
const LOGS_COLLECTION = "habit_logs";

// --- Helpers ---

// Deterministic ID generator
export const getPeriodKey = (date, type) => {
    if (type === 'weekly') {
        return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday
    }
    if (type === 'monthly') {
        return format(startOfMonth(date), 'yyyy-MM');
    }
    return format(date, 'yyyy-MM-dd'); // Daily
};

export const getLogId = (habitId, periodKey) => `${habitId}_${periodKey}`;

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
        stats: {
            currentStreak: 0,
            totalCompletions: 0
        }
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

export async function updateHabit(userId, habitId, updates) {
    const habitRef = doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habitId);
    await updateDoc(habitRef, updates);
}

export async function deleteHabit(userId, habitId) {
    // logical delete (archive)
    await updateHabit(userId, habitId, { archived: true });
}

// --- Log Operations ---

export async function getLog(userId, habitId, date, type = 'daily') {
    // date should be the reference date (e.g. today)
    // we calculate the period key based on type
    const periodKey = typeof date === 'string' && date.includes('_') ? date : getPeriodKey(new Date(date), type);

    const logId = getLogId(habitId, periodKey);
    const logRef = doc(db, USERS_COLLECTION, userId, LOGS_COLLECTION, logId);
    const logSnap = await getDoc(logRef);

    if (logSnap.exists()) {
        return logSnap.data();
    }
    return null;
}

export async function updateLog(userId, habitId, date, value, targetCount, type = 'daily') {
    // Date can be a Date object or the period string if already calculated
    const periodKey = date instanceof Date ? getPeriodKey(date, type) : date;
    const logId = getLogId(habitId, periodKey);

    const logRef = doc(db, USERS_COLLECTION, userId, LOGS_COLLECTION, logId);

    const isCompleted = value >= targetCount;

    // Check if it exists to know if we are creating or updating
    // For simplicity with Firestore, setDoc with merge: true works well
    // But we need to handle stats updates carefully. 
    // For now, let's just save the log. We can compute stats via Cloud Functions or client-side logic later.
    // Client-side stats update logic would go here if we want immediate feedback.

    // Check previous state
    const logSnap = await getDoc(logRef);
    const wasCompleted = logSnap.exists() ? logSnap.data().completed : false;

    await setDoc(logRef, {
        id: logId,
        habitId,
        // userId: userId, // REMOVED
        date: periodKey,
        value,
        completed: isCompleted,
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Update habit stats if completion status changed
    if (wasCompleted !== isCompleted && type === 'daily') {
        const habitRef = doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habitId);
        const habitSnap = await getDoc(habitRef);

        if (habitSnap.exists()) {
            const habitData = habitSnap.data();
            let currentStreak = habitData.stats?.currentStreak || 0;
            let lastCompletedDate = habitData.stats?.lastCompletedDate || null;

            const today = getPeriodKey(new Date(), 'daily');
            const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

            // We only care about streaks if we are editing TODAY or RECENTLY
            // If editing past data, streak calculation is hard (O(N)).
            // Simple logic:

            if (isCompleted) {
                // If we just completed it
                if (periodKey === today) {
                    if (lastCompletedDate === yesterday) {
                        currentStreak += 1;
                    } else if (lastCompletedDate === today) {
                        // Already counted, do nothing
                    } else {
                        // Gap or first time
                        currentStreak = 1;
                    }
                    lastCompletedDate = today;
                }
            } else {
                // Uncompleted
                if (periodKey === today) {
                    // If we uncheck today, we assume streak goes down by 1.
                    // This is imperfect but O(1).
                    currentStreak = Math.max(0, currentStreak - 1);
                    // We don't revert lastCompletedDate because we don't know the previous one easily.
                    // Actually detecting the previous date would require a query.
                    // For MVP, let's leave lastCompletedDate as is, or maybe strict users won't like it.
                    // If we uncheck today, strictly speaking, lastCompletedDate should be yesterday (if yesterday was done).
                    // But we can leave it. Next time they check today, it will check against "today" (lastCompletedDate) and see "Already counted". 
                    // Wait, if lastCompletedDate is TODAY, and we uncheck:
                    // Next time we check: lastCompletedDate is TODAY. logic says "Do nothing".
                    // So we MUST revert lastCompletedDate if we uncheck Today.
                    // Easiest fix: Set lastCompletedDate to "yesterday" (even if yesterday wasn't done, it forces a re-eval next time).
                    lastCompletedDate = yesterday;
                }
            }

            await updateDoc(habitRef, {
                "stats.totalCompletions": increment(isCompleted ? 1 : -1),
                "stats.currentStreak": currentStreak,
                "stats.lastCompletedDate": lastCompletedDate
            });
        }
    } else if (wasCompleted !== isCompleted) {
        // Non-daily habits (weekly/monthly) - just update total count for now
        const habitRef = doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habitId);
        await updateDoc(habitRef, {
            "stats.totalCompletions": increment(isCompleted ? 1 : -1)
        });
    }
}

export async function deleteUserData(userId) {
    // 1. Delete all habits
    const habits = await getUserHabits(userId);
    for (const habit of habits) {
        await deleteDoc(doc(db, USERS_COLLECTION, userId, HABITS_COLLECTION, habit.id));
    }

    // 2. Delete all logs (This is expensive if many, but fine for MVP)
    // We need a query for all logs by userId
    const q = query(collection(db, USERS_COLLECTION, userId, LOGS_COLLECTION));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
    }
}

// --- Bulk Fetching for Views ---

// Fetch logs for a specific period key for each habit
// Since each habit might have a DIFFERENT period key (daily vs weekly), 
// we likely need to fetch them individually or use `getAllLogs` strategy if we can.
// For now, let's keep it simple: The Dashboard knows the "Date" (e.g. Today).
// We should calculate the correct periodKey for EACH habit based on its type.

export async function getSomedayLogs(userId, habits, referenceDate) {
    if (!habits.length) return [];

    // This is tricky because "in" query expects same field. 
    // But our 'date' field will vary (YYYY-MM-DD vs YYYY-W01).
    // So we might need to parallel fetch by ID.

    // Efficient way: Calculate all expected IDs
    const refs = habits.map(h => {
        const pKey = getPeriodKey(referenceDate, h.type);
        const logId = getLogId(h.id, pKey);
        // CHANGED: Subcollection
        return doc(db, USERS_COLLECTION, userId, LOGS_COLLECTION, logId);
    });

    const snaps = await Promise.all(refs.map(r => getDoc(r)));
    return snaps.map(s => s.exists() ? s.data() : null).filter(Boolean);
}

// --- History Fetching for Stats ---
// --- History Fetching for Stats ---
export async function getHabitHistory(userId, habitId, startDate, endDate) {
    // Efficient Query using Composite Index (defined in firestore.indexes.json)
    const q = query(
        collection(db, USERS_COLLECTION, userId, LOGS_COLLECTION),
        where("habitId", "==", habitId),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
    );

    const snapshot = await getDocs(q);
    // Data is already filtered by server, just sort specifically if needed (index sorts by date implicitly)
    return snapshot.docs.map(doc => doc.data());
}
