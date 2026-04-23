package com.sumitgouthaman.habittracker.data.model

import com.google.firebase.Timestamp

data class LogEntry(
    val value: Int = 0,
    val completed: Boolean = false,
    val updatedAt: Timestamp? = null
)

data class Habit(
    val id: String = "",
    val title: String = "",
    val type: String = "daily",
    val targetCount: Int = 1,
    val archived: Boolean = false,
    val logs: Map<String, LogEntry> = emptyMap(),
    // Firestore serialises array numbers as Long; convert to Int in the UI layer.
    val increments: List<Long> = emptyList(),
    val derivedFrom: String? = null,
)
