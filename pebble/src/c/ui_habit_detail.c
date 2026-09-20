#include "ui_habit_detail.h"
#include "comm.h"
#include <stdio.h>
#include <string.h>

static Window *s_window = NULL;
static Layer *s_header_layer = NULL;
static MenuLayer *s_menu_layer = NULL;
static Habit *s_habit = NULL;
static char s_habit_id[HABIT_ID_MAX_LEN] = "";

typedef struct {
  char label[16];
  int delta;
  bool is_reset;
} ActionItem;

static ActionItem s_actions[8];
static int s_action_count = 0;

static void setup_actions(void) {
  s_action_count = 0;
  if (!s_habit) return;

  // Add custom increments from habit
  for (int i = 0; i < s_habit->increment_count && s_action_count < 6; i++) {
    int inc = s_habit->increments[i];
    if (inc > 0) {
      snprintf(s_actions[s_action_count].label, sizeof(s_actions[s_action_count].label), "+%d", inc);
      s_actions[s_action_count].delta = inc;
      s_actions[s_action_count].is_reset = false;
      s_action_count++;
    }
  }

  // Fallback if no increments
  if (s_action_count == 0) {
    snprintf(s_actions[0].label, sizeof(s_actions[0].label), "+1");
    s_actions[0].delta = 1;
    s_actions[0].is_reset = false;
    s_action_count = 1;
  }

  // Decrement action (-1)
  snprintf(s_actions[s_action_count].label, sizeof(s_actions[s_action_count].label), "-1 (Undo)");
  s_actions[s_action_count].delta = -1;
  s_actions[s_action_count].is_reset = false;
  s_action_count++;

  // Reset action
  snprintf(s_actions[s_action_count].label, sizeof(s_actions[s_action_count].label), "Reset to 0");
  s_actions[s_action_count].delta = 0;
  s_actions[s_action_count].is_reset = true;
  s_action_count++;
}

static void header_update_proc(Layer *layer, GContext *ctx) {
  if (!s_habit) return;
  GRect bounds = layer_get_bounds(layer);

  // Background
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  // Title
  graphics_context_set_text_color(ctx, GColorWhite);
  GRect title_rect = GRect(8, 4, bounds.size.w - 16, 22);
  graphics_draw_text(ctx, s_habit->title,
                     fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     title_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  // Value / Target counter
  char count_buf[32];
  snprintf(count_buf, sizeof(count_buf), "%d / %d", s_habit->current_value, s_habit->target_count);
  GRect count_rect = GRect(8, 26, bounds.size.w - 16, 26);
  GColor text_color = s_habit->is_completed ?
    PBL_IF_COLOR_ELSE(GColorKellyGreen, GColorWhite) : GColorWhite;
  graphics_context_set_text_color(ctx, text_color);
  graphics_draw_text(ctx, count_buf,
                     fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
                     count_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  // Progress Bar
  int bar_y = bounds.size.h - 8;
  int bar_h = 4;
  int bar_x = 12;
  int bar_w = bounds.size.w - 24;

  // Track background
  graphics_context_set_fill_color(ctx, PBL_IF_COLOR_ELSE(GColorDarkGray, GColorWhite));
  graphics_fill_rect(ctx, GRect(bar_x, bar_y, bar_w, bar_h), 2, GCornersAll);

  // Fill
  if (s_habit->target_count > 0 && s_habit->current_value > 0) {
    int fill_w = (s_habit->current_value * bar_w) / s_habit->target_count;
    if (fill_w > bar_w) fill_w = bar_w;
    GColor fill_color = s_habit->is_completed ?
      PBL_IF_COLOR_ELSE(GColorKellyGreen, GColorWhite) :
      PBL_IF_COLOR_ELSE(GColorChromeYellow, GColorWhite);
    graphics_context_set_fill_color(ctx, fill_color);
    graphics_fill_rect(ctx, GRect(bar_x, bar_y, fill_w, bar_h), 2, GCornersAll);
  }
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  return s_action_count;
}

static int16_t menu_get_cell_height_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
#if defined(PBL_PLATFORM_EMERY)
  return 38;
#else
  return 30;
#endif
}

static void menu_draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  int row = cell_index->row;
  if (row < 0 || row >= s_action_count) return;

  GRect bounds = layer_get_bounds(cell_layer);
  bool is_highlighted = menu_cell_layer_is_highlighted(cell_layer);

  GColor bg_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorCobaltBlue, GColorWhite) : GColorBlack;
  graphics_context_set_fill_color(ctx, bg_color);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  GColor text_color;
  if (is_highlighted) {
    text_color = PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack);
  } else {
    text_color = s_actions[row].is_reset ?
      PBL_IF_COLOR_ELSE(GColorRed, GColorWhite) : GColorWhite;
  }
  graphics_context_set_text_color(ctx, text_color);

  GRect text_rect = GRect(12, (bounds.size.h - 22) / 2, bounds.size.w - 24, 22);
  graphics_draw_text(ctx, s_actions[row].label,
                     fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  int row = cell_index->row;
  if (row < 0 || row >= s_action_count || !s_habit) return;

  if (s_actions[row].is_reset) {
    habit_model_reset_habit(s_habit);
  } else {
    habit_model_increment_habit(s_habit, s_actions[row].delta);
  }

  vibes_short_pulse();

  // Send update to phone
  char period_key[PERIOD_KEY_LEN];
  habit_model_get_period_key(s_habit->type, habit_model_get_day_offset(), period_key, sizeof(period_key));
  comm_send_update(s_habit, period_key);

  // Redraw header & menu
  layer_mark_dirty(s_header_layer);
  menu_layer_reload_data(s_menu_layer);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

#if defined(PBL_PLATFORM_EMERY)
  int header_height = 68;
#else
  int header_height = 58;
#endif

  // Header Layer
  s_header_layer = layer_create(GRect(0, 0, bounds.size.w, header_height));
  layer_set_update_proc(s_header_layer, header_update_proc);
  layer_add_child(window_layer, s_header_layer);

  // Menu Layer
  GRect menu_bounds = GRect(0, header_height, bounds.size.w, bounds.size.h - header_height);
  s_menu_layer = menu_layer_create(menu_bounds);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks) {
    .get_num_rows = menu_get_num_rows_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_callback,
  });
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void window_unload(Window *window) {
  menu_layer_destroy(s_menu_layer);
  s_menu_layer = NULL;
  layer_destroy(s_header_layer);
  s_header_layer = NULL;
  // Note: Do NOT destroy s_window here — Pebble OS still holds the pointer
  // after window_unload returns. The window is reused on next push.
  s_habit = NULL;
  s_habit_id[0] = '\0';
}

void ui_habit_detail_push(Habit *habit) {
  s_habit = habit;
  strncpy(s_habit_id, habit->id, sizeof(s_habit_id) - 1);
  s_habit_id[sizeof(s_habit_id) - 1] = '\0';
  setup_actions();

  if (!s_window) {
    s_window = window_create();
    window_set_background_color(s_window, GColorBlack);
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = window_load,
      .unload = window_unload,
    });
  }
  window_stack_push(s_window, true);
}

void ui_habit_detail_on_model_changed(void) {
  if (!s_window || s_habit_id[0] == '\0') return;

  // Re-lookup habit by stored ID to avoid dangling pointer
  s_habit = habit_model_get_by_id(s_habit_id);
  if (s_habit && s_header_layer) {
    layer_mark_dirty(s_header_layer);
  }
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
  }
}
