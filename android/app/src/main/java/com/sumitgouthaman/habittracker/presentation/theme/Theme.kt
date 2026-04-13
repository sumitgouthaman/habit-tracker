package com.sumitgouthaman.habittracker.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme

// PWA colour palette
// --color-bg:       #0f172a  (slate-900)
// --color-text:     #f8fafc
// --color-text-dim: #94a3b8  (slate-400)
// --color-primary:  hsl(250, 100%, 70%)  ≈  #8066FF  (indigo-violet)

private val Background       = Color(0xFF0F172A)
private val SurfaceContainer = Color(0xFF1E293B)
private val Primary          = Color(0xFF8066FF)   // hsl(250,100%,70%)
private val PrimaryDim       = Color(0xFF6B52E8)
private val OnPrimary        = Color(0xFF0F172A)   // dark on bright primary
private val OnBackground     = Color(0xFFF8FAFC)
private val OnSurfaceVariant = Color(0xFF94A3B8)   // dim/secondary text

private val HabitTrackerColorScheme = ColorScheme(
    primary              = Primary,
    primaryDim           = PrimaryDim,
    primaryContainer     = Color(0xFF2D2466),
    onPrimary            = OnPrimary,
    onPrimaryContainer   = Color(0xFFD4CAFF),
    secondary            = Color(0xFF80CFFF),       // hsl(190,100%,~65%) cyan
    secondaryDim         = Color(0xFF5BB8F5),
    secondaryContainer   = Color(0xFF0F3A52),
    onSecondary          = Color(0xFF0F172A),
    onSecondaryContainer = Color(0xFFBEE8FF),
    tertiary             = Color(0xFF66FF99),        // hsl(150,100%,50%) green
    tertiaryDim          = Color(0xFF4CD97A),
    tertiaryContainer    = Color(0xFF0D3323),
    onTertiary           = Color(0xFF0F172A),
    onTertiaryContainer  = Color(0xFFBEFFD6),
    surfaceContainerLow  = Color(0xFF0A1020),
    surfaceContainer     = SurfaceContainer,
    surfaceContainerHigh = Color(0xFF263451),
    onSurface            = OnBackground,
    onSurfaceVariant     = OnSurfaceVariant,
    outline              = Color(0xFF475569),
    outlineVariant       = Color(0xFF334155),
    background           = Background,
    onBackground         = OnBackground,
    error                = Color(0xFFFF6B8A),
    errorDim             = Color(0xFFCC3355),
    errorContainer       = Color(0xFF4A1020),
    onError              = Color(0xFF0F172A),
    onErrorContainer     = Color(0xFFFFB3C1),
)

@Composable
fun HabitTrackerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HabitTrackerColorScheme,
        content = content
    )
}
