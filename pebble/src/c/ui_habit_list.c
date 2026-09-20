#include "ui_habit_list.h"
#include "habit_model.h"
#include "ui_habit_detail.h"
#include "comm.h"
#include <stdio.h>
#include <string.h>

#define NUM_SECTIONS 4
#define SECTION_DAILY   0
#define SECTION_WEEKLY  1
#define SECTION_MONTHLY 2
#define SECTION_NAV     3

static Window *s_main_window = NULL;
static Layer *s_date_header_layer = NULL;
static MenuLayer *s_menu_layer = NULL;

static void date_header_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);

  // Background
  graphics_context_set_fill_color(ctx, GColorOxfordBlue);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  graphics_context_set_text_color(ctx, GColorWhite);
  GRect text_rect = GRect(0, (bounds.size.h - 18) / 2, bounds.size.w, 18);

  if (habit_model_get_count() == 0) {
    graphics_draw_text(ctx, "Habit Tracker",
                       fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                       text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
    return;
  }

  // Date label
  char date_buf[DATE_STR_LEN];
  habit_model_get_date_string(habit_model_get_day_offset(), date_buf, sizeof(date_buf));

  char full_label[48];
  snprintf(full_label, sizeof(full_label), "<  %s  >", date_buf);

  graphics_draw_text(ctx, full_label,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

static uint16_t menu_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
  if (habit_model_get_count() == 0) {
    return 1;
  }
  return NUM_SECTIONS;
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  if (habit_model_get_count() == 0) {
    return 1;
  }
  switch (section_index) {
    case SECTION_DAILY:
      return habit_model_get_count_by_type(HABIT_TYPE_DAILY);
    case SECTION_WEEKLY:
      return habit_model_get_count_by_type(HABIT_TYPE_WEEKLY);
    case SECTION_MONTHLY:
      return habit_model_get_count_by_type(HABIT_TYPE_MONTHLY);
    case SECTION_NAV:
      return 2; // "Previous Day", "Next Day"
    default:
      return 0;
  }
}

static int16_t menu_get_header_height_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  if (habit_model_get_count() == 0) {
    return 0;
  }
  // Hide header if section has no items
  if (section_index < SECTION_NAV && habit_model_get_count_by_type((HabitType)section_index) == 0) {
    return 0;
  }
#if defined(PBL_PLATFORM_EMERY)
  return 22;
#else
  return 18;
#endif
}

static void menu_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *data) {
  if (habit_model_get_count() == 0) return;

  GRect bounds = layer_get_bounds(cell_layer);

  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  const char *title = "";
  switch (section_index) {
    case SECTION_DAILY:   title = "Daily Goals"; break;
    case SECTION_WEEKLY:  title = "Weekly Goals"; break;
    case SECTION_MONTHLY: title = "Monthly Goals"; break;
    case SECTION_NAV:     title = "Date Navigation"; break;
    default: break;
  }

  graphics_context_set_text_color(ctx, GColorPictonBlue);
  GRect text_rect = GRect(8, 2, bounds.size.w - 16, bounds.size.h - 2);
  graphics_draw_text(ctx, title,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
}

static int16_t menu_get_cell_height_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  if (habit_model_get_count() == 0) {
#if defined(PBL_PLATFORM_EMERY)
    return 190;
#else
    return 140;
#endif
  }

  if (cell_index->section == SECTION_NAV) {
#if defined(PBL_PLATFORM_EMERY)
    return 36;
#else
    return 30;
#endif
  }

#if defined(PBL_PLATFORM_EMERY)
  return 54;
#else
  return 46;
#endif
}

static void draw_signin_row(GContext *ctx, const Layer *cell_layer) {
  GRect bounds = layer_get_bounds(cell_layer);

  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  // App Title
  graphics_context_set_text_color(ctx, GColorPictonBlue);
  GRect title_rect = GRect(8, 8, bounds.size.w - 16, 24);
  graphics_draw_text(ctx, "Habit Tracker",
                     fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
                     title_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  // Setup header
  graphics_context_set_text_color(ctx, GColorWhite);
  GRect signin_rect = GRect(8, 36, bounds.size.w - 16, 20);
  graphics_draw_text(ctx, "Pebble Setup",
                     fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     signin_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  // Instructions
  graphics_context_set_text_color(ctx, GColorLightGray);
  GRect body_rect = GRect(10, 58, bounds.size.w - 20, 95);
  graphics_draw_text(ctx, "1. In Web App: Settings > Copy Pebble Token\n2. In Phone Pebble App: Settings > Paste Token",
                     fonts_get_system_font(FONT_KEY_GOTHIC_14),
                     body_rect, GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);

  // Refresh hint
  graphics_context_set_text_color(ctx, GColorCobaltBlue);
  GRect hint_rect = GRect(8, bounds.size.h - 24, bounds.size.w - 16, 20);
  graphics_draw_text(ctx, "Press SELECT to sync",
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     hint_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

static void draw_habit_row(GContext *ctx, const Layer *cell_layer, Habit *habit) {
  GRect bounds = layer_get_bounds(cell_layer);
  bool is_highlighted = menu_cell_layer_is_highlighted(cell_layer);

  // Background
  GColor bg_color = is_highlighted ? GColorCobaltBlue : GColorBlack;
  graphics_context_set_fill_color(ctx, bg_color);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  // Title
  graphics_context_set_text_color(ctx, GColorWhite);
  GRect title_rect = GRect(8, 2, bounds.size.w - 44, 22);
  graphics_draw_text(ctx, habit->title,
                     fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     title_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  // Progress text: e.g. "3 / 8"
  char progress_buf[24];
  snprintf(progress_buf, sizeof(progress_buf), "%d / %d", habit->current_value, habit->target_count);

  GColor sub_color = is_highlighted ? GColorWhite : GColorLightGray;
  graphics_context_set_text_color(ctx, sub_color);
  GRect prog_rect = GRect(8, 24, 60, 18);
  graphics_draw_text(ctx, progress_buf,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14),
                     prog_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  // Badges (auto or multiplier)
  int badge_x = 68;
  if (habit->is_derived) {
    // [auto] badge
    graphics_context_set_fill_color(ctx, GColorVividCerulean);
    graphics_fill_rect(ctx, GRect(badge_x, 26, 32, 13), 2, GCornersAll);
    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, "auto",
                       fonts_get_system_font(FONT_KEY_GOTHIC_14),
                       GRect(badge_x, 23, 32, 14), GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
    badge_x += 36;
  } else if (habit->target_count > 0 && habit->current_value >= habit->target_count * 2) {
    // Multiplier badge (e.g. 2x, 3x)
    int mult = habit->current_value / habit->target_count;
    char mult_buf[16];
    snprintf(mult_buf, sizeof(mult_buf), "%dx", mult);
    graphics_context_set_fill_color(ctx, GColorChromeYellow);
    graphics_fill_rect(ctx, GRect(badge_x, 26, 24, 13), 2, GCornersAll);
    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, mult_buf,
                       fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                       GRect(badge_x, 23, 24, 14), GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
    badge_x += 28;
  }

  // Checkmark circle indicator on right
  int check_radius = 10;
  GPoint check_center = GPoint(bounds.size.w - 20, bounds.size.h / 2 - 3);

  if (habit->is_completed) {
    graphics_context_set_fill_color(ctx, GColorKellyGreen);
    graphics_fill_circle(ctx, check_center, check_radius);

    // Draw checkmark symbol
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_draw_line(ctx, GPoint(check_center.x - 4, check_center.y), GPoint(check_center.x - 1, check_center.y + 4));
    graphics_draw_line(ctx, GPoint(check_center.x - 1, check_center.y + 4), GPoint(check_center.x + 5, check_center.y - 3));
    // Line thickness
    graphics_draw_line(ctx, GPoint(check_center.x - 4, check_center.y + 1), GPoint(check_center.x - 1, check_center.y + 5));
    graphics_draw_line(ctx, GPoint(check_center.x - 1, check_center.y + 5), GPoint(check_center.x + 5, check_center.y - 2));
  } else {
    GColor circle_color = is_highlighted ? GColorWhite : GColorLightGray;
    graphics_context_set_stroke_color(ctx, circle_color);
    graphics_draw_circle(ctx, check_center, check_radius);
    graphics_draw_circle(ctx, check_center, check_radius - 1);
  }

  // Progress Bar Line at bottom of cell
  int bar_y = bounds.size.h - 5;
  int bar_h = 3;
  int bar_x = 8;
  int bar_w = bounds.size.w - 16;

  graphics_context_set_fill_color(ctx, GColorDarkGray);
  graphics_fill_rect(ctx, GRect(bar_x, bar_y, bar_w, bar_h), 1, GCornersAll);

  if (habit->target_count > 0 && habit->current_value > 0) {
    int fill_w = (habit->current_value * bar_w) / habit->target_count;
    if (fill_w > bar_w) fill_w = bar_w;
    GColor fill_color = habit->is_completed ? GColorKellyGreen : GColorChromeYellow;
    graphics_context_set_fill_color(ctx, fill_color);
    graphics_fill_rect(ctx, GRect(bar_x, bar_y, fill_w, bar_h), 1, GCornersAll);
  }
}

static void draw_nav_row(GContext *ctx, const Layer *cell_layer, int row) {
  GRect bounds = layer_get_bounds(cell_layer);
  bool is_highlighted = menu_cell_layer_is_highlighted(cell_layer);

  GColor bg_color = is_highlighted ? GColorCobaltBlue : GColorBlack;
  graphics_context_set_fill_color(ctx, bg_color);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  const char *nav_text = (row == 0) ? "<  Previous Day" : "Next Day  >";
  graphics_context_set_text_color(ctx, GColorWhite);
  GRect text_rect = GRect(8, (bounds.size.h - 18) / 2, bounds.size.w - 16, 18);
  graphics_draw_text(ctx, nav_text,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

static void menu_draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  if (habit_model_get_count() == 0) {
    draw_signin_row(ctx, cell_layer);
    return;
  }

  if (cell_index->section == SECTION_NAV) {
    draw_nav_row(ctx, cell_layer, cell_index->row);
    return;
  }

  Habit *habit = habit_model_get_by_type_index((HabitType)cell_index->section, cell_index->row);
  if (habit) {
    draw_habit_row(ctx, cell_layer, habit);
  }
}

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  if (habit_model_get_count() == 0) {
    vibes_short_pulse();
    comm_send_app_ready();
    return;
  }

  if (cell_index->section == SECTION_NAV) {
    int current_offset = habit_model_get_day_offset();
    if (cell_index->row == 0) {
      habit_model_set_day_offset(current_offset - 1);
    } else {
      habit_model_set_day_offset(current_offset + 1);
    }
    vibes_short_pulse();
    layer_mark_dirty(s_date_header_layer);
    menu_layer_reload_data(s_menu_layer);
    return;
  }

  Habit *habit = habit_model_get_by_type_index((HabitType)cell_index->section, cell_index->row);
  if (!habit) return;

  if (habit->is_derived) {
    // Derived habits are read-only
    vibes_double_pulse();
    return;
  }

  if (habit->target_count == 1) {
    // Binary habit: toggle immediately!
    habit_model_toggle_habit(habit);
    vibes_short_pulse();

    // Send update to phone
    char period_key[PERIOD_KEY_LEN];
    habit_model_get_period_key(habit->type, habit_model_get_day_offset(), period_key, sizeof(period_key));
    comm_send_update(habit, period_key);

    menu_layer_reload_data(s_menu_layer);
  } else {
    // Count habit: open detail & increment view
    ui_habit_detail_push(habit);
  }
}

static void on_model_changed(void) {
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
  }
  if (s_date_header_layer) {
    layer_mark_dirty(s_date_header_layer);
  }
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

#if defined(PBL_PLATFORM_EMERY)
  int header_h = 24;
#else
  int header_h = 20;
#endif

  // Date Header Layer
  s_date_header_layer = layer_create(GRect(0, 0, bounds.size.w, header_h));
  layer_set_update_proc(s_date_header_layer, date_header_update_proc);
  layer_add_child(window_layer, s_date_header_layer);

  // Menu Layer
  GRect menu_bounds = GRect(0, header_h, bounds.size.w, bounds.size.h - header_h);
  s_menu_layer = menu_layer_create(menu_bounds);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks) {
    .get_num_sections = menu_get_num_sections_callback,
    .get_num_rows = menu_get_num_rows_callback,
    .get_header_height = menu_get_header_height_callback,
    .draw_header = menu_draw_header_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_callback,
  });
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));

  habit_model_set_change_callback(on_model_changed);
}

static void window_unload(Window *window) {
  habit_model_set_change_callback(NULL);
  menu_layer_destroy(s_menu_layer);
  s_menu_layer = NULL;
  layer_destroy(s_date_header_layer);
  s_date_header_layer = NULL;
}

void ui_habit_list_init(void) {
  s_main_window = window_create();
  window_set_background_color(s_main_window, GColorBlack);
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
}

void ui_habit_list_deinit(void) {
  window_destroy(s_main_window);
  s_main_window = NULL;
}

void ui_habit_list_push(void) {
  window_stack_push(s_main_window, true);
}

void ui_habit_list_reload(void) {
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
  }
}
