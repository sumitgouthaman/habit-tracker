import { format, subDays, startOfWeek, subWeeks, startOfMonth, subMonths, isSameDay } from 'date-fns';
import { getPeriodKey } from '../lib/db';

/**
 * Calculates the current streak for a daily habit.
 * Iterates backwards from today (or yesterday) checking for completion.
 */
export function calculateStreak(habit) {
    if (habit.type !== 'daily') return 0; // Streaks mostly make sense for daily habits

    const logs = habit.logs || {};
    let streak = 0;
    const today = new Date();
    const todayKey = getPeriodKey(today, 'daily');
    const yesterdayKey = getPeriodKey(subDays(today, 1), 'daily');

    // Check if today is completed
    const todayLog = logs[todayKey];
    if (todayLog && todayLog.completed) {
        streak++;
    } else {
        // If today is not done, check if yesterday was done to keep the streak alive
        const yesterdayLog = logs[yesterdayKey];
        if (!yesterdayLog || !yesterdayLog.completed) {
            return 0;
        }
    }

    // Now iterate backwards from yesterday (or day before yesterday)
    // If today is done, we start checking yesterday.
    // If today is NOT done, we already checked yesterday above. if yesterday was done, we start from day before yesterday.

    let currentCheckDate = subDays(today, 1);

    // If today is NOT done, we effectively already counted "streak of 0" unless yesterday was done.
    // Wait, the logic above: 
    // If today done: streak=1. Next check: yesterday.
    // If today NOT done: 
    //    If yesterday done: streak=0 (so far), but the streak exists up to yesterday? 
    //    Actually, "Current Streak" usually includes today if done, or is the streak ending yesterday.
    //    Common logic: If I did it yesterday but not today, streak is X. If I do it today, streak becomes X+1.

    // Let's refine:
    // We look for the longest chain ending at Yesterday OR Today.

    let pointer = new Date();
    // If today is NOT done, start checking from Yesterday.
    if (!logs[todayKey] || !logs[todayKey].completed) {
        pointer = subDays(pointer, 1);
    }

    // Safety break
    let loopLimit = 365 * 10;

    while (loopLimit > 0) {
        const key = getPeriodKey(pointer, 'daily');
        const log = logs[key];

        if (log && log.completed) {
            // Only increment if we haven't already counted this day (e.g. today was handled separately? No, let's unify)
            // Simpler loop:
            break; // Restarting logic below
        }
        break;
    }

    return calculateDailyStreakSimple(logs);
}

function calculateDailyStreakSimple(logs) {
    let streak = 0;
    let pointer = new Date(); // Start Today

    // 1. Check Today
    const todayKey = getPeriodKey(pointer, 'daily');
    if (logs[todayKey]?.completed) {
        streak++;
        pointer = subDays(pointer, 1);
    } else {
        // If not today, check yesterday. If yesterday is missing, streak is 0.
        pointer = subDays(pointer, 1);
        const yesterdayKey = getPeriodKey(pointer, 'daily');
        if (!logs[yesterdayKey]?.completed) {
            return 0;
        }
    }

    // 2. Walk backwards
    while (true) {
        const key = getPeriodKey(pointer, 'daily');
        if (logs[key]?.completed) {
            streak++;
            pointer = subDays(pointer, 1);
        } else {
            break;
        }
    }
    return streak;
}

/**
 * Calculates total completions from the logs map.
 */
export function calculateTotal(habit) {
    const logs = habit.logs || {};
    return Object.values(logs).filter(l => l.completed).length;
}

/**
 * Gets the log value for a specific date.
 */
export function getLogValue(habit, date) {
    const key = getPeriodKey(date, habit.type);
    const log = habit.logs?.[key];
    return log ? log.value : 0;
}

/**
 * Checks if a habit is completed for a specific date.
 */
export function isHabitCompleted(habit, date) {
    const key = getPeriodKey(date, habit.type);
    return habit.logs?.[key]?.completed || false;
}
