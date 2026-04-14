package com.sumitgouthaman.habittracker.presentation

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material3.CircularProgressIndicator
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.sumitgouthaman.habittracker.data.repository.SettingsRepository
import com.sumitgouthaman.habittracker.presentation.screens.HabitListScreen
import com.sumitgouthaman.habittracker.presentation.screens.SignInScreen
import com.sumitgouthaman.habittracker.presentation.screens.TimePickerScreen
import com.sumitgouthaman.habittracker.presentation.theme.HabitTrackerTheme
import com.sumitgouthaman.habittracker.presentation.viewmodel.HabitViewModel
import com.sumitgouthaman.habittracker.util.ReminderManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

private const val TAG = "MainActivity"

// The web client ID from google-services.json (client_type: 3).
// Used by Firebase Auth to exchange a Google ID token for a Firebase credential.
private const val WEB_CLIENT_ID =
    "280063930300-ufvo19qe5nrs0ns82ic88s7qs1nrd285.apps.googleusercontent.com"

private sealed class AuthState {
    object Loading : AuthState()
    object SignedIn : AuthState()
    object NeedsSignIn : AuthState()
}

class MainActivity : ComponentActivity() {

    private lateinit var credentialManager: CredentialManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        credentialManager = CredentialManager.create(this)

        setContent {
            HabitTrackerTheme {
                AuthenticatedApp()
            }
        }
    }

    @Composable
    private fun AuthenticatedApp() {
        var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }

        LaunchedEffect(Unit) {
            authState = if (Firebase.auth.currentUser != null) {
                AuthState.SignedIn
            } else {
                // Try silent sign-in with a previously-authorised account first.
                trySignIn(filterByAuthorizedAccounts = true) ?: AuthState.NeedsSignIn
            }
        }

        when (authState) {
            AuthState.Loading -> LoadingScreen()
            AuthState.SignedIn -> {
                val vm: HabitViewModel = viewModel()
                val settingsRepo = remember { SettingsRepository(this@MainActivity) }
                var showTimePicker by remember { mutableStateOf(false) }

                if (showTimePicker) {
                    val currentHour by settingsRepo.reminderHour.collectAsState(initial = 9)
                    val currentMinute by settingsRepo.reminderMinute.collectAsState(initial = 0)

                    TimePickerScreen(
                        initialHour = currentHour,
                        initialMinute = currentMinute,
                        onTimeConfirmed = { hr, min ->
                            lifecycleScope.launch {
                                settingsRepo.setReminderTime(hr, min)
                                val isEnabled = settingsRepo.isReminderEnabled.first()
                                if (isEnabled) {
                                    ReminderManager.scheduleDailyReminder(this@MainActivity, hr, min)
                                }
                            }
                            showTimePicker = false
                        },
                        onCancel = { showTimePicker = false }
                    )
                } else {
                    HabitListScreen(
                        viewModel = vm,
                        settingsRepo = settingsRepo,
                        onOpenTimePicker = { showTimePicker = true }
                    )
                }
            }
            AuthState.NeedsSignIn -> SignInScreen(onSignIn = {
                lifecycleScope.launch {
                    val result = trySignIn(filterByAuthorizedAccounts = false)
                    if (result != null) authState = result
                }
            })
        }
    }

    /**
     * Attempts to sign in via Credential Manager.
     * [filterByAuthorizedAccounts] = true  → silent (no UI, only pre-authorised accounts)
     * [filterByAuthorizedAccounts] = false → interactive (system account picker shown)
     * Returns [AuthState.SignedIn] on success, null if no credential was found or the
     * user cancelled, so the caller can decide what to do next.
     */
    private suspend fun trySignIn(filterByAuthorizedAccounts: Boolean): AuthState? {
        val option = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .setServerClientId(WEB_CLIENT_ID)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()
        return try {
            val result = credentialManager.getCredential(this@MainActivity, request)
            val googleCred = GoogleIdTokenCredential.createFrom(result.credential.data)
            val firebaseCred = GoogleAuthProvider.getCredential(googleCred.idToken, null)
            Firebase.auth.signInWithCredential(firebaseCred).await()
            AuthState.SignedIn
        } catch (e: NoCredentialException) {
            null
        } catch (e: GetCredentialException) {
            Log.w(TAG, "Sign-in failed (filterByAuthorized=$filterByAuthorizedAccounts)", e)
            null
        } catch (e: Exception) {
            Log.w(TAG, "Sign-in failed", e)
            null
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
