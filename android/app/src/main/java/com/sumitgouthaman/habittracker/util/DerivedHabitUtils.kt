package com.sumitgouthaman.habittracker.util

import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.data.model.LogEntry
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val ISO_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

/**
 * Returns the effective logs for a habit, computing virtual logs for derived habits.
 *
 * For regular habits, returns habit.logs unchanged.
 *
 * For same-type derived habits (e.g. daily→daily): remaps each source log entry with
 * completion based on the derived habit's targetCount rather than the source's.
 *
 * For cross-type derived habits (e.g. daily→weekly, daily→monthly, weekly→monthly):
 * for each derived period, counts how many source-period completions fall within it.
 */
fun getEffectiveLogs(habit: Habit, allHabits: List<Habit>): Map<String, LogEntry> {
    if (habit.derivedFrom == null) return habit.logs

    val sourceHabit = allHabits.find { it.id == habit.derivedFrom } ?: return emptyMap()
    val sourceLogs = sourceHabit.logs

    if (habit.type == sourceHabit.type) {
        return sourceLogs.mapValues { (_, log) ->
            log.copy(completed = log.value >= habit.targetCount)
        }
    }

    // Cross-type: enumerate derived periods covered by source data
    val derivedPeriodKeys = mutableSetOf<String>()
    for (sourceKey in sourceLogs.keys) {
        val date = parsePeriodKey(sourceKey, sourceHabit.type)
        derivedPeriodKeys.add(getPeriodKey(date, habit.type))
    }

    val result = mutableMapOf<String, LogEntry>()
    for (derivedKey in derivedPeriodKeys) {
        val sourceKeys = getDerivedPeriodSourceKeys(derivedKey, habit.type, sourceHabit.type)
        if (sourceKeys.none { sourceLogs.containsKey(it) }) continue
        val count = sourceKeys.count { sourceLogs[it]?.completed == true }
        result[derivedKey] = LogEntry(value = count, completed = count >= habit.targetCount)
    }
    return result
}

private fun parsePeriodKey(key: String, type: String): LocalDate =
    if (type == "monthly") LocalDate.parse("$key-01") else LocalDate.parse(key)

private fun getDerivedPeriodSourceKeys(
    derivedPeriodKey: String,
    derivedType: String,
    sourceType: String,
): List<String> {
    if (derivedType == "weekly" && sourceType == "daily") {
        val weekStart = LocalDate.parse(derivedPeriodKey)
        return (0..6).map { weekStart.plusDays(it.toLong()).format(ISO_DATE) }
    }
    if (derivedType == "monthly" && sourceType == "daily") {
        val monthStart = LocalDate.parse("$derivedPeriodKey-01")
        return (0 until monthStart.lengthOfMonth()).map { monthStart.plusDays(it.toLong()).format(ISO_DATE) }
    }
    if (derivedType == "monthly" && sourceType == "weekly") {
        val monthStart = LocalDate.parse("$derivedPeriodKey-01")
        val monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth())
        // Walk from the Monday on-or-before monthStart
        var current = monthStart.minusDays((monthStart.dayOfWeek.value - 1).toLong())
        val weeks = mutableListOf<String>()
        while (!current.isAfter(monthEnd)) {
            if (!current.isBefore(monthStart)) weeks.add(current.format(ISO_DATE))
            current = current.plusDays(7)
        }
        return weeks
    }
    return emptyList()
}

/**
 * Sorts habits so derived habits appear immediately below their source habit.
 * Non-derived habits are sorted alphabetically; each is followed by its derived
 * children (also alphabetically). Derived habits whose source is absent fall at the end.
 */
fun sortHabitsWithDerivedBelow(habits: List<Habit>): List<Habit> {
    val roots = habits.filter { it.derivedFrom == null }.sortedBy { it.title }
    val derived = habits.filter { it.derivedFrom != null }

    val result = mutableListOf<Habit>()
    for (root in roots) {
        result.add(root)
        derived.filter { it.derivedFrom == root.id }.sortedBy { it.title }.forEach { result.add(it) }
    }

    val placed = result.map { it.id }.toSet()
    derived.filter { it.id !in placed }.sortedBy { it.title }.forEach { result.add(it) }

    return result
}
