package com.sumitgouthaman.habittracker.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.data.repository.HabitRepository
import com.sumitgouthaman.habittracker.util.getEffectiveLogs
import com.sumitgouthaman.habittracker.util.getPeriodKey
import java.time.LocalDate
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HabitViewModel(private val repo: HabitRepository = HabitRepository()) : ViewModel() {

    /**
     * null  = still loading (Firestore hasn't emitted yet)
     * empty = loaded but no habits
     * list  = habits ready to display (derived habits have virtual logs pre-computed)
     */
    val habits: StateFlow<List<Habit>?> = repo.observeHabits()
        .map { habitList ->
            habitList.map { habit ->
                if (habit.derivedFrom != null) {
                    habit.copy(logs = getEffectiveLogs(habit, habitList))
                } else {
                    habit
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialValue = null)

    /** Binary habit: toggle done ↔ undone for the given [date]. Derived habits are read-only. */
    fun onHabitToggle(habit: Habit, date: LocalDate = LocalDate.now()) {
        if (habit.derivedFrom != null) return
        viewModelScope.launch {
            val key = getPeriodKey(date = date, type = habit.type)
            val isCompleted = habit.logs[key]?.completed == true
            val newValue = if (isCompleted) 0 else 1
            repo.updateLog(habit.id, newValue, habit.targetCount, habit.type, date)
        }
    }

    /**
     * Count habit: add [amount] to the current value for the given [date].
     * Derived habits are read-only.
     */
    fun onHabitIncrement(habit: Habit, amount: Int, date: LocalDate = LocalDate.now()) {
        if (habit.derivedFrom != null) return
        viewModelScope.launch {
            val key = getPeriodKey(date = date, type = habit.type)
            val current = habit.logs[key]?.value ?: 0
            repo.updateLog(habit.id, current + amount, habit.targetCount, habit.type, date)
        }
    }
}
