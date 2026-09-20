#pragma once
#include <pebble.h>
#include "habit_model.h"

void comm_init(void);
void comm_deinit(void);
void comm_send_app_ready(void);
void comm_send_update(const Habit* habit, const char* period_key);
