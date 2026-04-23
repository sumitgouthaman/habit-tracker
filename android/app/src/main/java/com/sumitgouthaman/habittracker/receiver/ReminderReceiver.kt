package com.sumitgouthaman.habittracker.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.sumitgouthaman.habittracker.data.repository.HabitRepository
import com.sumitgouthaman.habittracker.presentation.MainActivity
import com.sumitgouthaman.habittracker.util.getEffectiveLogs
import com.sumitgouthaman.habittracker.util.getPeriodKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate

private const val TAG = "ReminderReceiver"

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val repository = HabitRepository()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val habits = repository.getHabitsOnce()
                val today = LocalDate.now()

                val incompleteCount = habits.count { habit ->
                    if (habit.type != "daily" || habit.targetCount <= 0) return@count false
                    val key = getPeriodKey(date = today, type = "daily")
                    val effectiveLogs = if (habit.derivedFrom != null) {
                        getEffectiveLogs(habit, habits)
                    } else {
                        habit.logs
                    }
                    val log = effectiveLogs[key]
                    log == null || !log.completed
                }

                Log.d(TAG, "Checked ${habits.size} habits – $incompleteCount daily incomplete")

                if (incompleteCount > 0) {
                    showNotification(context, incompleteCount)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to check habits", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun showNotification(context: Context, incompleteCount: Int) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    context, android.Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
        }

        val channelId = "habit_reminder_channel"
        val notificationManager = NotificationManagerCompat.from(context)

        val channel = NotificationChannel(
            channelId,
            "Daily Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Reminders to complete your daily habits"
        }
        notificationManager.createNotificationChannel(channel)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val message = if (incompleteCount == 1) {
            "You have 1 incomplete daily habit. Keep it up!"
        } else {
            "You have $incompleteCount incomplete daily habits. Keep it up!"
        }

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Habit Tracker")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        notificationManager.notify(1001, builder.build())
    }
}
