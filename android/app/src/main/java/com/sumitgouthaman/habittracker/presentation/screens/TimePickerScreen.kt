package com.sumitgouthaman.habittracker.presentation.screens

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.TimePicker
import java.time.LocalTime

@Composable
fun TimePickerScreen(
    initialHour: Int,
    initialMinute: Int,
    onTimeConfirmed: (hour: Int, minute: Int) -> Unit,
    onCancel: () -> Unit
) {
    // Pressing the hardware back button dismisses the picker instead of exiting the app.
    BackHandler { onCancel() }

    // Native Wear Compose M3 AppScaffold fills the screen with
    // MaterialTheme.colorScheme.background, so the dark HabitTrackerTheme applies
    // correctly — no M2 bridge needed.
    AppScaffold {
        TimePicker(
            initialTime = LocalTime.of(initialHour, initialMinute),
            onTimePicked = { time ->
                onTimeConfirmed(time.hour, time.minute)
            },
        )
    }
}
