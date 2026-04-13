package com.sumitgouthaman.habittracker.data.repository

import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.sumitgouthaman.habittracker.data.model.Habit
import com.sumitgouthaman.habittracker.util.getPeriodKey
import java.time.LocalDate
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class HabitRepository {

    private val auth = Firebase.auth
    private val db = Firebase.firestore

    fun observeHabits(): Flow<List<Habit>> = callbackFlow {
        val uid = auth.currentUser?.uid ?: run {
            close()
            return@callbackFlow
        }
        val query = db.collection("users").document(uid)
            .collection("habits")
            .whereEqualTo("archived", false)

        val subscription = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val habits = snapshot?.documents?.mapNotNull { doc ->
                doc.toObject(Habit::class.java)?.copy(id = doc.id)
            } ?: emptyList()
            trySend(habits)
        }
        awaitClose { subscription.remove() }
    }

    suspend fun updateLog(habitId: String, newValue: Int, targetCount: Int, type: String, date: LocalDate = LocalDate.now()) {
        val uid = auth.currentUser?.uid ?: return
        val key = getPeriodKey(date = date, type = type)
        db.collection("users").document(uid)
            .collection("habits").document(habitId)
            .update(
                "logs.$key", mapOf(
                    "value" to newValue,
                    "completed" to (newValue >= targetCount),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
    }
}
