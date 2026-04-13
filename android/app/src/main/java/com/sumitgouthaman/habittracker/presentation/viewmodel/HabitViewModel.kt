package com.sumitgouthaman.habittracker.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.data.repository.HabitRepository
import com.sumitgouthaman.habittracker.util.getPeriodKey
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HabitViewModel(private val repo: HabitRepository = HabitRepository()) : ViewModel() {

    /**
     * null  = still loading (Firestore hasn't emitted yet)
     * empty = loaded but no habits
     * list  = habits ready to display
     */
    val habits: StateFlow<List<Habit>?> = repo.observeHabits()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialValue = null)

    /** Binary habit: toggle done ↔ undone. */
    fun onHabitToggle(habit: Habit) = viewModelScope.launch {
        val key = getPeriodKey(type = habit.type)
        val isCompleted = habit.logs[key]?.completed == true
        val newValue = if (isCompleted) 0 else 1
        repo.updateLog(habit.id, newValue, habit.targetCount, habit.type)
    }

    /**
     * Count habit: add [amount] to the current value.
     * No upper cap — going over the target shows a multiplier badge (e.g. 3x),
     * matching the PWA behaviour.
     */
    fun onHabitIncrement(habit: Habit, amount: Int) = viewModelScope.launch {
        val key = getPeriodKey(type = habit.type)
        val current = habit.logs[key]?.value ?: 0
        repo.updateLog(habit.id, current + amount, habit.targetCount, habit.type)
    }
}
