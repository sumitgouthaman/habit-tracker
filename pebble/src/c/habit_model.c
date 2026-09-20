#include "habit_model.h"
#include <string.h>

#define PERSIST_KEY_VERSION 99
#define PERSIST_KEY_COUNT   100
#define PERSIST_KEY_OFFSET  102
#define PERSIST_KEY_HABIT_BASE 1000
#define CURRENT_STORAGE_VERSION 20260921

static Habit s_habits[MAX_HABITS];
static int s_habit_count = 0;
static int s_day_offset = 0;
static HabitModelChangeCallback s_change_callback = NULL;

static void notify_change(void) {
  if (s_change_callback) {
    s_change_callback();
  }
}

void habit_model_notify(void) {
  notify_change();
}

void habit_model_init(void) {
  habit_model_load();
}

void habit_model_set_change_callback(HabitModelChangeCallback callback) {
  s_change_callback = callback;
}

int habit_model_get_count(void) {
  return s_habit_count;
}

Habit* habit_model_get(int index) {
  if (index >= 0 && index < s_habit_count) {
    return &s_habits[index];
  }
  return NULL;
}

Habit* habit_model_get_by_id(const char* id) {
  if (!id) return NULL;
  for (int i = 0; i < s_habit_count; i++) {
    if (strcmp(s_habits[i].id, id) == 0) {
      return &s_habits[i];
    }
  }
  return NULL;
}

int habit_model_get_count_by_type(HabitType type) {
  int count = 0;
  for (int i = 0; i < s_habit_count; i++) {
    if (s_habits[i].type == type) {
      count++;
    }
  }
  return count;
}

Habit* habit_model_get_by_type_index(HabitType type, int type_index) {
  int current = 0;
  for (int i = 0; i < s_habit_count; i++) {
    if (s_habits[i].type == type) {
      if (current == type_index) {
        return &s_habits[i];
      }
      current++;
    }
  }
  return NULL;
}

void habit_model_add_or_update_silent(const Habit* habit) {
  if (!habit) return;

  for (int i = 0; i < s_habit_count; i++) {
    if (strcmp(s_habits[i].id, habit->id) == 0) {
      s_habits[i] = *habit;
      return;
    }
  }

  if (s_habit_count < MAX_HABITS) {
    s_habits[s_habit_count++] = *habit;
  }
}

void habit_model_add_or_update(const Habit* habit) {
  habit_model_add_or_update_silent(habit);
  notify_change();
}

void habit_model_clear_silent(void) {
  s_habit_count = 0;
}

void habit_model_clear(void) {
  s_habit_count = 0;
  notify_change();
}

void habit_model_toggle_habit(Habit* habit) {
  if (!habit || habit->is_derived) return;

  if (habit->is_completed) {
    habit->current_value = 0;
    habit->is_completed = false;
  } else {
    habit->current_value = habit->target_count;
    habit->is_completed = true;
  }
  habit_model_save();
  notify_change();
}

void habit_model_increment_habit(Habit* habit, int amount) {
  if (!habit || habit->is_derived) return;

  habit->current_value += amount;
  if (habit->current_value < 0) {
    habit->current_value = 0;
  }
  habit->is_completed = (habit->current_value >= habit->target_count);
  habit_model_save();
  notify_change();
}

void habit_model_reset_habit(Habit* habit) {
  if (!habit || habit->is_derived) return;

  habit->current_value = 0;
  habit->is_completed = false;
  habit_model_save();
  notify_change();
}

void habit_model_save(void) {
  // Read previous count to clean up orphaned keys
  int prev_count = 0;
  if (persist_exists(PERSIST_KEY_COUNT)) {
    prev_count = persist_read_int(PERSIST_KEY_COUNT);
  }

  persist_write_int(PERSIST_KEY_VERSION, CURRENT_STORAGE_VERSION);
  persist_write_int(PERSIST_KEY_COUNT, s_habit_count);
  for (int i = 0; i < s_habit_count; i++) {
    persist_write_data(PERSIST_KEY_HABIT_BASE + i, &s_habits[i], sizeof(Habit));
  }

  // Delete orphaned keys from prior saves with more habits
  for (int i = s_habit_count; i < prev_count && i < MAX_HABITS; i++) {
    persist_delete(PERSIST_KEY_HABIT_BASE + i);
  }
}

void habit_model_load(void) {
  if (persist_exists(PERSIST_KEY_VERSION) &&
      persist_read_int(PERSIST_KEY_VERSION) == CURRENT_STORAGE_VERSION &&
      persist_exists(PERSIST_KEY_COUNT)) {
    int count = persist_read_int(PERSIST_KEY_COUNT);
    if (count > 0 && count <= MAX_HABITS) {
      s_habit_count = 0;
      for (int i = 0; i < count; i++) {
        if (persist_exists(PERSIST_KEY_HABIT_BASE + i)) {
          int read = persist_read_data(PERSIST_KEY_HABIT_BASE + i, &s_habits[i], sizeof(Habit));
          if (read == sizeof(Habit)) {
            s_habit_count++;
          }
        }
      }
      return;
    }
  }
  s_habit_count = 0;
}


int habit_model_get_day_offset(void) {
  return s_day_offset;
}

void habit_model_set_day_offset(int offset) {
  s_day_offset = offset;
  notify_change();
}

void habit_model_get_date_string(int day_offset, char* buffer, size_t buffer_size) {
  memset(buffer, 0, buffer_size);
  if (day_offset == 0) {
    strncpy(buffer, "Today", buffer_size - 1);
    return;
  } else if (day_offset == -1) {
    strncpy(buffer, "Yesterday", buffer_size - 1);
    return;
  } else if (day_offset == 1) {
    strncpy(buffer, "Tomorrow", buffer_size - 1);
    return;
  }

  time_t now = time(NULL) + (day_offset * 86400);
  struct tm* tm = localtime(&now);
  if (tm) {
    strftime(buffer, buffer_size, "%a, %b %d", tm);
  } else {
    snprintf(buffer, buffer_size, "Day %d", day_offset);
  }
}

void habit_model_get_period_key(HabitType type, int day_offset, char* buffer, size_t buffer_size) {
  time_t target = time(NULL) + (day_offset * 86400);
  struct tm* tm = localtime(&target);
  if (!tm) {
    snprintf(buffer, buffer_size, "unknown");
    return;
  }

  switch (type) {
    case HABIT_TYPE_WEEKLY: {
      // Find Monday of this week (tm_wday: 0=Sun, 1=Mon, ..., 6=Sat)
      int days_to_monday = (tm->tm_wday + 6) % 7;
      time_t monday = target - (days_to_monday * 86400);
      struct tm* monday_tm = localtime(&monday);
      if (monday_tm) {
        strftime(buffer, buffer_size, "%Y-%m-%d", monday_tm);
      } else {
        snprintf(buffer, buffer_size, "unknown");
      }
      break;
    }
    case HABIT_TYPE_MONTHLY:
      strftime(buffer, buffer_size, "%Y-%m", tm);
      break;
    case HABIT_TYPE_DAILY:
    default:
      strftime(buffer, buffer_size, "%Y-%m-%d", tm);
      break;
  }
}
