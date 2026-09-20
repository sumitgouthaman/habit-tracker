#include "comm.h"
#include <string.h>

#define INBOX_SIZE  1024
#define OUTBOX_SIZE 512

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  // Handle sync status (error) messages — preserve cached data on failure
  Tuple *sync_status_tuple = dict_find(iterator, MESSAGE_KEY_SyncStatus);
  if (sync_status_tuple) {
    int status = sync_status_tuple->value->int32;
    if (status < 0) {
      APP_LOG(APP_LOG_LEVEL_WARNING, "Sync failed (status %d), keeping cached habits", status);
    }
    return;
  }

  Tuple *count_tuple = dict_find(iterator, MESSAGE_KEY_HabitCount);
  Tuple *index_tuple = dict_find(iterator, MESSAGE_KEY_HabitIndex);
  Tuple *id_tuple = dict_find(iterator, MESSAGE_KEY_HabitId);

  // If phone signals 0 habits (empty or logged out)
  if (count_tuple && count_tuple->value->int32 == 0 && !id_tuple) {
    habit_model_clear();
    habit_model_save();
    return;
  }

  if (id_tuple && index_tuple) {
    int index = index_tuple->value->int32;
    int total_count = count_tuple ? count_tuple->value->int32 : 1;

    // If starting a fresh sync list from phone, clear old habits on first index silently
    if (index == 0 && total_count > 0) {
      habit_model_clear_silent();
    }

    Habit h;
    memset(&h, 0, sizeof(Habit));

    if (id_tuple->type == TUPLE_CSTRING) {
      strncpy(h.id, id_tuple->value->cstring, sizeof(h.id) - 1);
      h.id[sizeof(h.id) - 1] = '\0';
    }

    Tuple *title_tuple = dict_find(iterator, MESSAGE_KEY_HabitTitle);
    if (title_tuple && title_tuple->type == TUPLE_CSTRING) {
      strncpy(h.title, title_tuple->value->cstring, sizeof(h.title) - 1);
      h.title[sizeof(h.title) - 1] = '\0';
    }

    Tuple *type_tuple = dict_find(iterator, MESSAGE_KEY_HabitType);
    if (type_tuple) {
      h.type = (HabitType)type_tuple->value->int32;
    }

    Tuple *target_tuple = dict_find(iterator, MESSAGE_KEY_HabitTarget);
    if (target_tuple) {
      h.target_count = target_tuple->value->int32;
    }

    Tuple *val_tuple = dict_find(iterator, MESSAGE_KEY_HabitValue);
    if (val_tuple) {
      h.current_value = val_tuple->value->int32;
    }

    Tuple *completed_tuple = dict_find(iterator, MESSAGE_KEY_HabitCompleted);
    if (completed_tuple) {
      h.is_completed = (completed_tuple->value->int32 != 0);
    }

    Tuple *derived_tuple = dict_find(iterator, MESSAGE_KEY_HabitDerived);
    if (derived_tuple) {
      h.is_derived = (derived_tuple->value->int32 != 0);
    }

    Tuple *increments_tuple = dict_find(iterator, MESSAGE_KEY_HabitIncrements);
    if (increments_tuple && increments_tuple->type == TUPLE_CSTRING &&
        strlen(increments_tuple->value->cstring) > 0) {
      char inc_buf[32];
      strncpy(inc_buf, increments_tuple->value->cstring, sizeof(inc_buf) - 1);
      inc_buf[sizeof(inc_buf) - 1] = '\0';
      int inc_idx = 0;
      char *p = inc_buf;
      while (*p && inc_idx < MAX_INCREMENTS) {
        while (*p == ' ' || *p == ',') p++;
        if (*p == '\0') break;
        int val = 0;
        while (*p >= '0' && *p <= '9') {
          val = val * 10 + (*p - '0');
          p++;
        }
        if (val > 0) {
          h.increments[inc_idx++] = val;
        }
        while (*p && *p != ',') p++;
      }
      h.increment_count = inc_idx;
    }

    if (h.increment_count == 0) {
      h.increments[0] = 1;
      h.increment_count = 1;
    }

    habit_model_add_or_update_silent(&h);

    if (index == total_count - 1) {
      habit_model_save();
      habit_model_notify();
    }
  }
}


static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "AppMessage inbox dropped: %d", (int)reason);
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "AppMessage outbox failed: %d", (int)reason);
}

void comm_init(void) {
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_open(INBOX_SIZE, OUTBOX_SIZE);
}

void comm_deinit(void) {
  app_message_deregister_callbacks();
}

void comm_send_app_ready(void) {
  DictionaryIterator *out_iter;
  AppMessageResult result = app_message_outbox_begin(&out_iter);
  if (result == APP_MSG_OK && out_iter) {
    dict_write_uint8(out_iter, MESSAGE_KEY_AppReady, 1);
    app_message_outbox_send();
  }
}

void comm_request_sync(int day_offset) {
  DictionaryIterator *out_iter;
  AppMessageResult result = app_message_outbox_begin(&out_iter);
  if (result == APP_MSG_OK && out_iter) {
    dict_write_int32(out_iter, MESSAGE_KEY_DayOffset, day_offset);
    app_message_outbox_send();
  }
}

void comm_send_update(const Habit* habit, const char* period_key) {
  if (!habit || !period_key) return;

  DictionaryIterator *out_iter;
  AppMessageResult result = app_message_outbox_begin(&out_iter);
  if (result == APP_MSG_OK && out_iter) {
    dict_write_cstring(out_iter, MESSAGE_KEY_UpdateHabitId, habit->id);
    dict_write_int32(out_iter, MESSAGE_KEY_UpdateValue, habit->current_value);
    dict_write_int32(out_iter, MESSAGE_KEY_UpdateTarget, habit->target_count);
    dict_write_int32(out_iter, MESSAGE_KEY_UpdateType, (int)habit->type);
    dict_write_cstring(out_iter, MESSAGE_KEY_UpdatePeriodKey, period_key);
    app_message_outbox_send();
  }
}
