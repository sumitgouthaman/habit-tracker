package com.sumitgouthaman.habittracker.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val ISO_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
private val YEAR_MONTH: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM")

/**
 * Computes the period key for a given date and habit type.
 * Mirrors the JS getPeriodKey() in src/lib/db.js exactly.
 * WEEK_STARTS_ON = 1 (Monday).
 */
fun getPeriodKey(date: LocalDate = LocalDate.now(), type: String): String = when (type) {
    "weekly" -> {
        // dayOfWeek: MONDAY=1 … SUNDAY=7; subtract days since Monday to get week start
        val monday = date.minusDays((date.dayOfWeek.value - 1).toLong())
        monday.format(ISO_DATE)
    }
    "monthly" -> date.format(YEAR_MONTH)
    else -> date.format(ISO_DATE) // "daily" and any unrecognised type
}
