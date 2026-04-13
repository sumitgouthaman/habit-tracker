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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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

private val CompletedGreen = Color(0xFF22C55E)
private val InProgressAmber = Color(0xFFFBBF24)

@Composable
fun HabitListScreen(viewModel: HabitViewModel) {
    val habits by viewModel.habits.collectAsState()

    AppScaffold {
        val listState = rememberTransformingLazyColumnState()
        val transformationSpec = rememberTransformationSpec()

        ScreenScaffold(scrollState = listState) { contentPadding ->
            TransformingLazyColumn(
                contentPadding = contentPadding,
                state = listState,
            ) {
                item {
                    ListHeader(
                        modifier = Modifier
                            .fillMaxWidth()
                            .transformedHeight(this, transformationSpec),
                        transformation = SurfaceTransformation(transformationSpec),
                    ) {
                        Text("Today")
                    }
                }

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

                    else -> items(habits!!) { habit ->
                        if (habit.targetCount == 1) {
                            BinaryHabitCard(
                                habit = habit,
                                onToggle = { viewModel.onHabitToggle(habit) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .transformedHeight(this, transformationSpec),
                                transformation = SurfaceTransformation(transformationSpec),
                            )
                        } else {
                            CountHabitCard(
                                habit = habit,
                                onIncrement = { amount -> viewModel.onHabitIncrement(habit, amount) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .transformedHeight(this, transformationSpec),
                                transformation = SurfaceTransformation(transformationSpec),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Binary habit card ────────────────────────────────────────────────────────

@Composable
private fun BinaryHabitCard(
    habit: Habit,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
    transformation: SurfaceTransformation? = null,
) {
    val key = getPeriodKey(type = habit.type)
    val currentValue = habit.logs[key]?.value ?: 0
    val isCompleted = habit.logs[key]?.completed == true
    val typeLabel = habit.type.replaceFirstChar { it.uppercase() }

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
                    text = "$typeLabel · $currentValue / ${habit.targetCount}",
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
    onIncrement: (Int) -> Unit,
    modifier: Modifier = Modifier,
    transformation: SurfaceTransformation? = null,
) {
    val key = getPeriodKey(type = habit.type)
    val currentValue = habit.logs[key]?.value ?: 0
    val isCompleted = habit.logs[key]?.completed == true
    val typeLabel = habit.type.replaceFirstChar { it.uppercase() }
    val multiplier = if (habit.targetCount > 0) currentValue / habit.targetCount else 0

    // Use the habit's configured increments, or fall back to [1]
    val incrementValues: List<Int> = habit.increments
        .map { it.toInt() }
        .ifEmpty { listOf(1) }
        .take(4) // cap at 4 to avoid overflow on small screens

    Card(
        onClick = { onIncrement(incrementValues.first()) },
        modifier = modifier,
        transformation = transformation,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        // Title
        Text(
            text = habit.title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))

        // Subtitle + optional multiplier badge
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "$typeLabel · $currentValue / ${habit.targetCount}",
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

        // Increment buttons
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
