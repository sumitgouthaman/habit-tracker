package com.sumitgouthaman.habittracker.presentation.screens

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.wear.compose.foundation.lazy.TransformingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberTransformingLazyColumnState
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.Card
import androidx.wear.compose.material3.CardDefaults
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.SurfaceTransformation
import androidx.wear.compose.material3.SwitchButton
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.lazy.rememberTransformationSpec
import androidx.wear.compose.material3.lazy.transformedHeight
import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.data.repository.SettingsRepository
import com.sumitgouthaman.habittracker.presentation.viewmodel.HabitViewModel
import com.sumitgouthaman.habittracker.util.ReminderManager
import com.sumitgouthaman.habittracker.util.getPeriodKey
import com.sumitgouthaman.habittracker.util.sortHabitsWithDerivedBelow
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private val CompletedGreen = Color(0xFF22C55E)
private val InProgressAmber = Color(0xFFFBBF24)
private val MonthDayFormatter = DateTimeFormatter.ofPattern("MMM d")

@Composable
fun HabitListScreen(
    viewModel: HabitViewModel,
    settingsRepo: SettingsRepository? = null,
    onOpenTimePicker: () -> Unit = {}
) {
    val habits by viewModel.habits.collectAsState()
    var currentDate by remember { mutableStateOf(LocalDate.now()) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                currentDate = LocalDate.now()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    AppScaffold {
        val listState = rememberTransformingLazyColumnState()
        val transformationSpec = rememberTransformationSpec()

        ScreenScaffold(scrollState = listState) { contentPadding ->
            TransformingLazyColumn(
                contentPadding = contentPadding,
                state = listState,
            ) {
                when {
                    habits == null -> item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator()
                        }
                    }

                    habits!!.isEmpty() -> item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "No habits yet.\nAdd some in the app.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    else -> {
                        val daily = sortHabitsWithDerivedBelow(habits!!.filter { it.type == "daily" })
                        val weekly = sortHabitsWithDerivedBelow(habits!!.filter { it.type == "weekly" })
                        val monthly = sortHabitsWithDerivedBelow(habits!!.filter { it.type == "monthly" })

                        if (daily.isNotEmpty()) {
                            item {
                                ListHeader(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                ) { Text("Daily Goals") }
                            }
                            items(daily) { habit ->
                                HabitCard(
                                    habit = habit,
                                    date = currentDate,
                                    onToggle = { viewModel.onHabitToggle(habit, currentDate) },
                                    onIncrement = { amount -> viewModel.onHabitIncrement(habit, amount, currentDate) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                )
                            }
                        }

                        if (weekly.isNotEmpty()) {
                            item {
                                ListHeader(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                ) { Text("Weekly Goals") }
                            }
                            items(weekly) { habit ->
                                HabitCard(
                                    habit = habit,
                                    date = currentDate,
                                    onToggle = { viewModel.onHabitToggle(habit, currentDate) },
                                    onIncrement = { amount -> viewModel.onHabitIncrement(habit, amount, currentDate) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                )
                            }
                        }

                        if (monthly.isNotEmpty()) {
                            item {
                                ListHeader(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                ) { Text("Monthly Goals") }
                            }
                            items(monthly) { habit ->
                                HabitCard(
                                    habit = habit,
                                    date = currentDate,
                                    onToggle = { viewModel.onHabitToggle(habit, currentDate) },
                                    onIncrement = { amount -> viewModel.onHabitIncrement(habit, amount, currentDate) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .transformedHeight(this, transformationSpec),
                                    transformation = SurfaceTransformation(transformationSpec),
                                )
                            }
                        }
                    }
                }

                item {
                    DateNavRow(
                        currentDate = currentDate,
                        onPrev = { currentDate = currentDate.minusDays(1) },
                        onNext = { currentDate = currentDate.plusDays(1) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .transformedHeight(this, transformationSpec),
                    )
                }

                // ─── Settings section ─────────────────────────────────────
                if (settingsRepo != null) {
                    item {
                        ListHeader(
                            modifier = Modifier
                                .fillMaxWidth()
                                .transformedHeight(this, transformationSpec),
                            transformation = SurfaceTransformation(transformationSpec)
                        ) { Text("Settings") }
                    }

                    item {
                        ReminderToggleItem(
                            settingsRepo = settingsRepo,
                            modifier = Modifier
                                .fillMaxWidth()
                                .transformedHeight(this, transformationSpec),
                        )
                    }

                    item {
                        ReminderTimeItem(
                            settingsRepo = settingsRepo,
                            onOpenTimePicker = onOpenTimePicker,
                            modifier = Modifier
                                .fillMaxWidth()
                                .transformedHeight(this, transformationSpec),
                        )
                    }
                }
            }
        }
    }
}

// ─── Settings composables ─────────────────────────────────────────────────────

@Composable
private fun ReminderToggleItem(
    settingsRepo: SettingsRepository,
    modifier: Modifier = Modifier,
) {
    val isReminderEnabled by settingsRepo.isReminderEnabled.collectAsState(initial = false)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            scope.launch {
                settingsRepo.setReminderEnabled(true)
                val hr = settingsRepo.reminderHour.first()
                val min = settingsRepo.reminderMinute.first()
                ReminderManager.scheduleDailyReminder(context, hr, min)
            }
        }
    }

    SwitchButton(
        checked = isReminderEnabled,
        onCheckedChange = { checked ->
            if (checked) {
                enableReminder(context, scope, settingsRepo, permissionLauncher)
            } else {
                scope.launch {
                    settingsRepo.setReminderEnabled(false)
                    ReminderManager.cancelReminder(context)
                }
            }
        },
        label = { Text("Daily reminder") },
        modifier = modifier.padding(horizontal = 8.dp),
    )
}

private fun enableReminder(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    settingsRepo: SettingsRepository,
    permissionLauncher: androidx.activity.result.ActivityResultLauncher<String>,
) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        if (ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            scope.launch {
                settingsRepo.setReminderEnabled(true)
                val hr = settingsRepo.reminderHour.first()
                val min = settingsRepo.reminderMinute.first()
                ReminderManager.scheduleDailyReminder(context, hr, min)
            }
        } else {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    } else {
        // Pre-Tiramisu: notification permission is granted at install time
        scope.launch {
            settingsRepo.setReminderEnabled(true)
            val hr = settingsRepo.reminderHour.first()
            val min = settingsRepo.reminderMinute.first()
            ReminderManager.scheduleDailyReminder(context, hr, min)
        }
    }
}

@Composable
private fun ReminderTimeItem(
    settingsRepo: SettingsRepository,
    onOpenTimePicker: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isReminderEnabled by settingsRepo.isReminderEnabled.collectAsState(initial = false)
    if (!isReminderEnabled) return

    val hour by settingsRepo.reminderHour.collectAsState(initial = 9)
    val minute by settingsRepo.reminderMinute.collectAsState(initial = 0)
    val amPm = if (hour < 12) "AM" else "PM"
    val displayHour = when {
        hour == 0 -> 12
        hour > 12 -> hour - 12
        else -> hour
    }
    val timeStr = String.format("%d:%02d %s", displayHour, minute, amPm)

    Card(
        onClick = onOpenTimePicker,
        modifier = modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "Reminder time",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = timeStr,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

// ─── Date navigation row ──────────────────────────────────────────────────────

@Composable
private fun DateNavRow(
    currentDate: LocalDate,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val today = LocalDate.now()
    val dateLabel = when (currentDate) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> currentDate.format(MonthDayFormatter)
    }
    val isToday = currentDate == today

    Row(
        modifier = modifier.padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        NavButton(icon = Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous day", onClick = onPrev)
        Text(
            text = dateLabel,
            style = MaterialTheme.typography.bodySmall,
            color = if (isToday) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        NavButton(icon = Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next day", onClick = onNext)
    }
}

@Composable
private fun NavButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(20.dp),
        )
    }
}

// ─── Unified habit card (binary or count) ─────────────────────────────────────

@Composable
private fun HabitCard(
    habit: Habit,
    date: LocalDate,
    onToggle: () -> Unit,
    onIncrement: (Int) -> Unit,
    modifier: Modifier = Modifier,
    transformation: SurfaceTransformation? = null,
) {
    val isDerived = habit.derivedFrom != null
    if (habit.targetCount == 1) {
        BinaryHabitCard(habit, date, onToggle, modifier, transformation, isDerived)
    } else {
        CountHabitCard(habit, date, onIncrement, modifier, transformation, isDerived)
    }
}

// ─── Binary habit card ────────────────────────────────────────────────────────

@Composable
private fun BinaryHabitCard(
    habit: Habit,
    date: LocalDate,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
    transformation: SurfaceTransformation? = null,
    isDerived: Boolean = false,
) {
    val key = getPeriodKey(date = date, type = habit.type)
    val currentValue = habit.logs[key]?.value ?: 0
    val isCompleted = habit.logs[key]?.completed == true

    Card(
        onClick = { if (!isDerived) onToggle() },
        modifier = modifier,
        transformation = transformation,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 10.dp)) {
                Text(
                    text = habit.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "$currentValue / ${habit.targetCount}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (isDerived) AutoBadge()
                }
            }
            CheckIndicator(isCompleted = isCompleted)
        }
        ProgressLine(currentValue = currentValue, targetCount = habit.targetCount, isCompleted = isCompleted)
    }
}

@Composable
private fun CheckIndicator(isCompleted: Boolean) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(CircleShape)
            .background(if (isCompleted) CompletedGreen else Color.Transparent)
            .then(
                if (!isCompleted)
                    Modifier.border(2.dp, MaterialTheme.colorScheme.outline, CircleShape)
                else
                    Modifier
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (isCompleted) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Completed",
                tint = Color.Black,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

// ─── Count habit card ─────────────────────────────────────────────────────────

@Composable
private fun CountHabitCard(
    habit: Habit,
    date: LocalDate,
    onIncrement: (Int) -> Unit,
    modifier: Modifier = Modifier,
    transformation: SurfaceTransformation? = null,
    isDerived: Boolean = false,
) {
    val key = getPeriodKey(date = date, type = habit.type)
    val currentValue = habit.logs[key]?.value ?: 0
    val isCompleted = habit.logs[key]?.completed == true
    val multiplier = if (habit.targetCount > 0) currentValue / habit.targetCount else 0

    val incrementValues: List<Int> = habit.increments
        .map { it.toInt() }
        .ifEmpty { listOf(1) }
        .take(4)

    Card(
        onClick = { if (!isDerived) onIncrement(incrementValues.first()) },
        modifier = modifier,
        transformation = transformation,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Text(
            text = habit.title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "$currentValue / ${habit.targetCount}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (isDerived) {
                Spacer(Modifier.width(4.dp))
                AutoBadge()
            }
            if (multiplier >= 1) {
                Spacer(Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(InProgressAmber)
                        .padding(horizontal = 5.dp, vertical = 1.dp),
                ) {
                    Text(
                        text = "${multiplier}x",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black,
                    )
                }
            }
        }

        if (!isDerived) {
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                incrementValues.forEach { amount ->
                    IncrementButton(amount = amount, onClick = { onIncrement(amount) })
                }
            }
        }

        ProgressLine(currentValue = currentValue, targetCount = habit.targetCount, isCompleted = isCompleted)
    }
}

/** Small badge shown on derived (auto-calculated) habit cards. */
@Composable
private fun AutoBadge() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(3.dp))
            .background(Color(0x266366F1))
            .padding(horizontal = 4.dp, vertical = 1.dp),
    ) {
        Text(
            text = "auto",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = Color(0xFFA5B4FC),
        )
    }
}

@Composable
private fun IncrementButton(amount: Int, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "+$amount",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

// ─── Shared progress line ─────────────────────────────────────────────────────

@Composable
private fun ProgressLine(currentValue: Int, targetCount: Int, isCompleted: Boolean) {
    val hasProgress = currentValue > 0
    val progressColor = when {
        isCompleted -> CompletedGreen
        hasProgress -> InProgressAmber
        else        -> Color.Transparent
    }
    val fraction = if (targetCount > 0)
        (currentValue.toFloat() / targetCount).coerceIn(0f, 1f)
    else 0f

    Spacer(Modifier.height(8.dp))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(3.dp)
            .clip(RoundedCornerShape(1.5.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHigh),
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction)
                .background(progressColor),
        )
    }
}
