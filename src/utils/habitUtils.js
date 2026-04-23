import { format, subDays, startOfWeek, endOfMonth, addDays, startOfMonth, subMonths, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { getPeriodKey } from '../lib/storage';
import { MAX_STREAK_LOOKBACK_DAYS, WEEK_STARTS_ON } from '../lib/constants';

/**
 * Calculates the current streak for a daily habit.
 * Iterates backwards from today (or yesterday) checking for completion.
 * @param {Object} habit - The habit object with logs
 * @param {boolean} assumeTodayComplete - If true, assume today is completed (for optimistic UI)
 */
export function calculateStreak(habit, assumeTodayComplete = false) {
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
    let loopLimit = MAX_STREAK_LOOKBACK_DAYS;

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

    return calculateDailyStreakSimple(logs, assumeTodayComplete);
}

function calculateDailyStreakSimple(logs, assumeTodayComplete = false) {
    let streak = 0;
    let pointer = new Date(); // Start Today

    // 1. Check Today
    const todayKey = getPeriodKey(pointer, 'daily');
    const todayIsComplete = assumeTodayComplete || logs[todayKey]?.completed;

    if (todayIsComplete) {
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
 * Calculates the best (longest ever) streak for a daily habit.
 */
export function calculateBestStreak(habit) {
    if (habit.type !== 'daily') return 0;
    const logs = habit.logs || {};
    const keys = Object.keys(logs)
        .filter(k => logs[k]?.completed)
        .sort(); // ISO date strings sort lexicographically
    if (!keys.length) return 0;

    let best = 1, current = 1;
    for (let i = 1; i < keys.length; i++) {
        const prev = parseISO(keys[i - 1]);
        const curr = parseISO(keys[i]);
        const diff = differenceInDays(curr, prev);
        if (diff === 1) {
            current++;
            if (current > best) best = current;
        } else {
            current = 1;
        }
    }
    return best;
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

/**
 * Returns all source-type period keys that fall within a given derived period.
 * Used for cross-type derived habit aggregation.
 */
function getDerivedPeriodSourceKeys(derivedPeriodKey, derivedType, sourceType) {
    if (derivedType === 'weekly' && sourceType === 'daily') {
        const weekStart = parseISO(derivedPeriodKey);
        return Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
    }
    if (derivedType === 'monthly' && sourceType === 'daily') {
        const monthStart = parseISO(derivedPeriodKey + '-01');
        const monthEnd = endOfMonth(monthStart);
        const days = [];
        let current = monthStart;
        while (current <= monthEnd) {
            days.push(format(current, 'yyyy-MM-dd'));
            current = addDays(current, 1);
        }
        return days;
    }
    if (derivedType === 'monthly' && sourceType === 'weekly') {
        // All Monday-keys whose Monday falls within the given month
        const monthStart = parseISO(derivedPeriodKey + '-01');
        const monthEnd = endOfMonth(monthStart);
        const weeks = [];
        let current = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
        while (current <= monthEnd) {
            if (current >= monthStart) {
                weeks.push(format(current, 'yyyy-MM-dd'));
            }
            current = addDays(current, 7);
        }
        return weeks;
    }
    return [];
}

/**
 * Returns the effective logs for a habit, computing virtual logs for derived habits.
 * For regular habits, returns habit.logs as-is.
 * For same-type derived habits, remaps completion based on the derived target.
 * For cross-type derived habits, aggregates source completions within each derived period.
 *
 * @param {Object} habit - The habit (possibly derived)
 * @param {Array} allHabits - Full habit list (needed to find the source habit)
 */
export function getEffectiveLogs(habit, allHabits) {
    if (!habit.derivedFrom) return habit.logs || {};

    const sourceHabit = allHabits?.find(h => h.id === habit.derivedFrom);
    if (!sourceHabit) return {};

    const sourceLogs = sourceHabit.logs || {};

    if (habit.type === sourceHabit.type) {
        // Same-type: identical periods, just different completion threshold
        const result = {};
        for (const [key, log] of Object.entries(sourceLogs)) {
            result[key] = { ...log, completed: log.value >= habit.targetCount };
        }
        return result;
    }

    // Cross-type: count how many source completions fall within each derived period
    const sourceKeys = Object.keys(sourceLogs);
    if (sourceKeys.length === 0) return {};

    // Determine which derived-period keys we need to compute
    const derivedPeriodKeySet = new Set();
    for (const sourceKey of sourceKeys) {
        // Parse source key to a date (daily: 'yyyy-MM-dd', weekly: 'yyyy-MM-dd', monthly: 'yyyy-MM')
        const date = sourceKey.length === 7
            ? parseISO(sourceKey + '-01')
            : parseISO(sourceKey);
        derivedPeriodKeySet.add(getPeriodKey(date, habit.type));
    }

    const result = {};
    for (const derivedKey of derivedPeriodKeySet) {
        const sourceKeysList = getDerivedPeriodSourceKeys(derivedKey, habit.type, sourceHabit.type);
        const hasAnyLog = sourceKeysList.some(k => sourceLogs[k] !== undefined);
        if (!hasAnyLog) continue;
        const count = sourceKeysList.filter(k => sourceLogs[k]?.completed).length;
        result[derivedKey] = { value: count, completed: count >= habit.targetCount, updatedAt: null };
    }
    return result;
}

/**
 * Sorts habits so derived habits appear immediately below their source habit.
 * Non-derived habits are sorted alphabetically. Each source habit is followed
 * by its derived children (also alphabetically). Derived habits whose source
 * is not in the list fall at the end.
 *
 * @param {Array} habits - Habits of a single type group
 */
export function sortHabitsWithDerivedBelow(habits) {
    const roots = habits.filter(h => !h.derivedFrom).sort((a, b) => a.title.localeCompare(b.title));
    const derived = habits.filter(h => h.derivedFrom);

    const result = [];
    for (const root of roots) {
        result.push(root);
        const children = derived
            .filter(d => d.derivedFrom === root.id)
            .sort((a, b) => a.title.localeCompare(b.title));
        result.push(...children);
    }

    // Derived habits whose source is not in this group (e.g. archived) go at the end
    const placed = new Set(result.map(h => h.id));
    derived
        .filter(d => !placed.has(d.id))
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(d => result.push(d));

    return result;
}
