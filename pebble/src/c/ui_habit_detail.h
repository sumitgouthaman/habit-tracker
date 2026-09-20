#pragma once
#include <pebble.h>
#include "habit_model.h"

void ui_habit_detail_push(Habit *habit);
void ui_habit_detail_on_model_changed(void);
