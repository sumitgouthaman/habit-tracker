#pragma once
#include <pebble.h>

#define MAX_HABITS 24
#define HABIT_TITLE_MAX_LEN 48
#define HABIT_ID_MAX_LEN 36
#define MAX_INCREMENTS 4
#define PERIOD_KEY_LEN 16
#define DATE_STR_LEN 24

typedef enum {
  HABIT_TYPE_DAILY = 0,
  HABIT_TYPE_WEEKLY = 1,
  HABIT_TYPE_MONTHLY = 2,
  HABIT_TYPE_COUNT = 3
} HabitType;

typedef struct {
  char id[HABIT_ID_MAX_LEN];
  char title[HABIT_TITLE_MAX_LEN];
  HabitType type;
  int target_count;
  int current_value;
  bool is_completed;
  bool is_derived;
  int increments[MAX_INCREMENTS];
  int increment_count;
} Habit;

// Callbacks for when habit data changes
typedef void (*HabitModelChangeCallback)(void);

void habit_model_init(void);
void habit_model_set_change_callback(HabitModelChangeCallback callback);

int habit_model_get_count(void);
Habit* habit_model_get(int index);
Habit* habit_model_get_by_id(const char* id);

int habit_model_get_count_by_type(HabitType type);
Habit* habit_model_get_by_type_index(HabitType type, int type_index);

void habit_model_add_or_update(const Habit* habit);
void habit_model_add_or_update_silent(const Habit* habit);
void habit_model_clear(void);
void habit_model_clear_silent(void);
void habit_model_notify(void);

// User actions
void habit_model_toggle_habit(Habit* habit);
void habit_model_increment_habit(Habit* habit, int amount);
void habit_model_reset_habit(Habit* habit);

// Persistence
void habit_model_save(void);
void habit_model_load(void);

// Date navigation
int habit_model_get_day_offset(void);
void habit_model_set_day_offset(int offset);
void habit_model_get_date_string(int day_offset, char* buffer, size_t buffer_size);
void habit_model_get_period_key(HabitType type, int day_offset, char* buffer, size_t buffer_size);
