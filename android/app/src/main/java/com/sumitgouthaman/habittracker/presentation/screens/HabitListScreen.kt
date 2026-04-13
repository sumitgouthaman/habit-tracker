package com.sumitgouthaman.habittracker.presentation.screens

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
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
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
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.lazy.rememberTransformationSpec
import androidx.wear.compose.material3.lazy.transformedHeight
import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.presentation.viewmodel.HabitViewModel
import com.sumitgouthaman.habittracker.util.getPeriodKey
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val CompletedGreen = Color(0xFF22C55E)
private val InProgressAmber = Color(0xFFFBBF24)
private val MonthDayFormatter = DateTimeFormatter.ofPattern("MMM d")

@Composable
fun HabitListScreen(viewModel: HabitViewModel) {
    val habits by viewModel.habits.collectAsState()
    var currentDate by remember { mutableStateOf(LocalDate.now()) }

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
                        val daily = habits!!.filter { it.type == "daily" }.sortedBy { it.title }
                        val weekly = habits!!.filter { it.type == "weekly" }.sortedBy { it.title }
                        val monthly = habits!!.filter { it.type == "monthly" }.sortedBy { it.title }

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
            }
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
    if (habit.targetCount == 1) {
        BinaryHabitCard(habit, date, onToggle, modifier, transformation)
    } else {
        CountHabitCard(habit, date, onIncrement, modifier, transformation)
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
) {
    val key = getPeriodKey(date = date, type = habit.type)
    val currentValue = habit.logs[key]?.value ?: 0
    val isCompleted = habit.logs[key]?.completed == true

    Card(
        onClick = onToggle,
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
                Text(
                    text = "$currentValue / ${habit.targetCount}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
        onClick = { onIncrement(incrementValues.first()) },
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

        Spacer(Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            incrementValues.forEach { amount ->
                IncrementButton(amount = amount, onClick = { onIncrement(amount) })
            }
        }

        ProgressLine(currentValue = currentValue, targetCount = habit.targetCount, isCompleted = isCompleted)
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
