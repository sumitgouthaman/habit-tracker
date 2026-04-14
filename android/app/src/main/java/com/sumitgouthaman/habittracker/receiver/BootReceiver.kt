package com.sumitgouthaman.habittracker.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.sumitgouthaman.habittracker.data.repository.SettingsRepository
import com.sumitgouthaman.habittracker.util.ReminderManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val pendingResult = goAsync()
            val settingsRepo = SettingsRepository(context)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val isEnabled = settingsRepo.isReminderEnabled.first()
                    if (isEnabled) {
                        val hour = settingsRepo.reminderHour.first()
                        val minute = settingsRepo.reminderMinute.first()
                        ReminderManager.scheduleDailyReminder(context, hour, minute)
                    }
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
