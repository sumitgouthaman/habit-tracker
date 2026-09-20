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

static bool s_is_loading = false;
static AppTimer *s_loading_timer = NULL;
static AppTimer *s_safety_timer = NULL;
static int s_loading_frame = 0;

static void loading_timer_callback(void *data) {
  if (!s_is_loading) {
    s_loading_timer = NULL;
    return;
  }
  s_loading_frame++;
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
  }
  s_loading_timer = app_timer_register(180, loading_timer_callback, NULL);
}

static void safety_timeout_callback(void *data) {
  s_safety_timer = NULL;
  if (s_is_loading) {
    s_is_loading = false;
    if (s_loading_timer) {
      app_timer_cancel(s_loading_timer);
      s_loading_timer = NULL;
    }
    if (s_menu_layer) {
      menu_layer_reload_data(s_menu_layer);
    }
    if (s_date_header_layer) {
      layer_mark_dirty(s_date_header_layer);
    }
  }
}

static void date_header_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);

  // Background
  graphics_context_set_fill_color(ctx, GColorOxfordBlue);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  graphics_context_set_text_color(ctx, GColorWhite);
  GRect text_rect = GRect(0, (bounds.size.h - 18) / 2, bounds.size.w, 18);

  if (habit_model_get_count() == 0 && !s_is_loading) {
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

typedef struct {
  HabitType type;
  bool is_nav;
  int count;
} SectionInfo;

static int get_sections(SectionInfo *sections) {
  if (s_is_loading) {
    if (sections) {
      sections[0].is_nav = false;
      sections[0].count = 1;
    }
    return 1;
  }

  if (habit_model_get_count() == 0) {
    if (sections) {
      sections[0].is_nav = false;
      sections[0].count = 1;
    }
    return 1;
  }

  int num = 0;
  int daily = habit_model_get_count_by_type(HABIT_TYPE_DAILY);
  if (daily > 0) {
    if (sections) {
      sections[num].type = HABIT_TYPE_DAILY;
      sections[num].is_nav = false;
      sections[num].count = daily;
    }
    num++;
  }

  int weekly = habit_model_get_count_by_type(HABIT_TYPE_WEEKLY);
  if (weekly > 0) {
    if (sections) {
      sections[num].type = HABIT_TYPE_WEEKLY;
      sections[num].is_nav = false;
      sections[num].count = weekly;
    }
    num++;
  }

  int monthly = habit_model_get_count_by_type(HABIT_TYPE_MONTHLY);
  if (monthly > 0) {
    if (sections) {
      sections[num].type = HABIT_TYPE_MONTHLY;
      sections[num].is_nav = false;
      sections[num].count = monthly;
    }
    num++;
  }

  // Nav section
  if (sections) {
    sections[num].is_nav = true;
    sections[num].count = 2;
  }
  num++;

  return num;
}

static uint16_t menu_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
  return get_sections(NULL);
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  SectionInfo sections[4];
  int total = get_sections(sections);
  if (section_index < total) {
    return sections[section_index].count;
  }
  return 0;
}

static int16_t menu_get_header_height_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  if (s_is_loading || habit_model_get_count() == 0) {
    return 0;
  }
#if defined(PBL_PLATFORM_EMERY)
  return 22;
#else
  return 18;
#endif
}

static void menu_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *data) {
  if (s_is_loading || habit_model_get_count() == 0) return;

  SectionInfo sections[4];
  int total = get_sections(sections);
  if (section_index >= total) return;

  GRect bounds = layer_get_bounds(cell_layer);

  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  const char *title = "";
  if (sections[section_index].is_nav) {
    title = "Date Navigation";
  } else {
    switch (sections[section_index].type) {
      case HABIT_TYPE_DAILY:   title = "Daily Goals"; break;
      case HABIT_TYPE_WEEKLY:  title = "Weekly Goals"; break;
      case HABIT_TYPE_MONTHLY: title = "Monthly Goals"; break;
      default: break;
    }
  }

  graphics_context_set_text_color(ctx, GColorPictonBlue);
  GRect text_rect = GRect(8, 2, bounds.size.w - 16, bounds.size.h - 2);
  graphics_draw_text(ctx, title,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
}

static int16_t menu_get_cell_height_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  if (s_is_loading || habit_model_get_count() == 0) {
#if defined(PBL_PLATFORM_EMERY)
    return 190;
#else
    return 140;
#endif
  }

  SectionInfo sections[4];
  int total = get_sections(sections);
  if (cell_index->section < total && sections[cell_index->section].is_nav) {
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

static void draw_loading_row(GContext *ctx, const Layer *cell_layer) {
  GRect bounds = layer_get_bounds(cell_layer);

  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  int dot_count = (s_loading_frame % 4);
  char text_buf[24];
  if (dot_count == 0) {
    snprintf(text_buf, sizeof(text_buf), "Loading");
  } else if (dot_count == 1) {
    snprintf(text_buf, sizeof(text_buf), "Loading.");
  } else if (dot_count == 2) {
    snprintf(text_buf, sizeof(text_buf), "Loading..");
  } else {
    snprintf(text_buf, sizeof(text_buf), "Loading...");
  }

  graphics_context_set_text_color(ctx, GColorPictonBlue);
  GRect text_rect = GRect(8, bounds.size.h / 2 - 28, bounds.size.w - 16, 24);
  graphics_draw_text(ctx, text_buf,
                     fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  graphics_context_set_text_color(ctx, GColorLightGray);
  GRect sub_rect = GRect(8, bounds.size.h / 2 + 2, bounds.size.w - 16, 18);
  graphics_draw_text(ctx, "Updating for selected date",
                     fonts_get_system_font(FONT_KEY_GOTHIC_14),
                     sub_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  int bar_w = bounds.size.w - 48;
  int bar_h = 4;
  int bar_x = 24;
  int bar_y = bounds.size.h / 2 + 28;

  graphics_context_set_fill_color(ctx, GColorDarkGray);
  graphics_fill_rect(ctx, GRect(bar_x, bar_y, bar_w, bar_h), 2, GCornersAll);

  int seg_w = bar_w / 3;
  int cycle = bar_w + seg_w;
  int pos = (s_loading_frame * 10) % cycle;
  int x1 = bar_x + pos - seg_w;
  int x2 = x1 + seg_w;
  if (x1 < bar_x) x1 = bar_x;
  if (x2 > bar_x + bar_w) x2 = bar_x + bar_w;
  if (x2 > x1) {
    graphics_context_set_fill_color(ctx, GColorPictonBlue);
    graphics_fill_rect(ctx, GRect(x1, bar_y, x2 - x1, bar_h), 2, GCornersAll);
  }
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
  GColor bg_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorCobaltBlue, GColorWhite) : GColorBlack;
  graphics_context_set_fill_color(ctx, bg_color);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  // Title
  GColor title_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack) : GColorWhite;
  graphics_context_set_text_color(ctx, title_color);
  GRect title_rect = GRect(8, 2, bounds.size.w - 44, 22);
  graphics_draw_text(ctx, habit->title,
                     fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     title_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  // Progress text: e.g. "3 / 8"
  char progress_buf[24];
  snprintf(progress_buf, sizeof(progress_buf), "%d / %d", habit->current_value, habit->target_count);

  GColor sub_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack) : GColorLightGray;
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
    graphics_context_set_fill_color(ctx, PBL_IF_COLOR_ELSE(GColorKellyGreen, GColorWhite));
    graphics_fill_circle(ctx, check_center, check_radius);

    // Draw checkmark symbol (black on monochrome for visibility)
    graphics_context_set_stroke_color(ctx, PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack));
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

  graphics_context_set_fill_color(ctx, PBL_IF_COLOR_ELSE(GColorDarkGray, GColorWhite));
  graphics_fill_rect(ctx, GRect(bar_x, bar_y, bar_w, bar_h), 1, GCornersAll);

  if (habit->target_count > 0 && habit->current_value > 0) {
    int fill_w = (habit->current_value * bar_w) / habit->target_count;
    if (fill_w > bar_w) fill_w = bar_w;
    GColor fill_color = habit->is_completed ?
      PBL_IF_COLOR_ELSE(GColorKellyGreen, GColorWhite) :
      PBL_IF_COLOR_ELSE(GColorChromeYellow, GColorWhite);
    graphics_context_set_fill_color(ctx, fill_color);
    graphics_fill_rect(ctx, GRect(bar_x, bar_y, fill_w, bar_h), 1, GCornersAll);
  }
}

static void draw_nav_row(GContext *ctx, const Layer *cell_layer, int row) {
  GRect bounds = layer_get_bounds(cell_layer);
  bool is_highlighted = menu_cell_layer_is_highlighted(cell_layer);

  GColor bg_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorCobaltBlue, GColorWhite) : GColorBlack;
  graphics_context_set_fill_color(ctx, bg_color);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  const char *nav_text = (row == 0) ? "<  Previous Day" : "Next Day  >";
  GColor nav_text_color = is_highlighted ?
    PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack) : GColorWhite;
  graphics_context_set_text_color(ctx, nav_text_color);
  GRect text_rect = GRect(8, (bounds.size.h - 18) / 2, bounds.size.w - 16, 18);
  graphics_draw_text(ctx, nav_text,
                     fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
                     text_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
}

static void menu_draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  if (s_is_loading) {
    draw_loading_row(ctx, cell_layer);
    return;
  }

  if (habit_model_get_count() == 0) {
    draw_signin_row(ctx, cell_layer);
    return;
  }

  SectionInfo sections[4];
  int total = get_sections(sections);
  if (cell_index->section >= total) return;

  if (sections[cell_index->section].is_nav) {
    draw_nav_row(ctx, cell_layer, cell_index->row);
    return;
  }

  Habit *habit = habit_model_get_by_type_index(sections[cell_index->section].type, cell_index->row);
  if (habit) {
    draw_habit_row(ctx, cell_layer, habit);
  }
}

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  if (s_is_loading) {
    return;
  }

  if (habit_model_get_count() == 0) {
    vibes_short_pulse();
    comm_send_app_ready();
    return;
  }

  SectionInfo sections[4];
  int total = get_sections(sections);
  if (cell_index->section >= total) return;

  if (sections[cell_index->section].is_nav) {
    int current_offset = habit_model_get_day_offset();
    int new_offset = (cell_index->row == 0) ? (current_offset - 1) : (current_offset + 1);
    habit_model_set_day_offset(new_offset);
    comm_request_sync(new_offset);

    s_is_loading = true;
    s_loading_frame = 0;
    if (s_loading_timer) {
      app_timer_cancel(s_loading_timer);
      s_loading_timer = NULL;
    }
    s_loading_timer = app_timer_register(180, loading_timer_callback, NULL);

    if (s_safety_timer) {
      app_timer_cancel(s_safety_timer);
      s_safety_timer = NULL;
    }
    s_safety_timer = app_timer_register(8000, safety_timeout_callback, NULL);

    vibes_short_pulse();
    layer_mark_dirty(s_date_header_layer);
    menu_layer_set_selected_index(s_menu_layer, MenuIndex(0, 0), MenuRowAlignTop, false);
    menu_layer_reload_data(s_menu_layer);
    return;
  }

  Habit *habit = habit_model_get_by_type_index(sections[cell_index->section].type, cell_index->row);
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
  bool was_loading = s_is_loading;
  if (s_is_loading) {
    s_is_loading = false;
    if (s_loading_timer) {
      app_timer_cancel(s_loading_timer);
      s_loading_timer = NULL;
    }
    if (s_safety_timer) {
      app_timer_cancel(s_safety_timer);
      s_safety_timer = NULL;
    }
  }
  if (s_menu_layer) {
    if (was_loading) {
      menu_layer_set_selected_index(s_menu_layer, MenuIndex(0, 0), MenuRowAlignTop, false);
    }
    menu_layer_reload_data(s_menu_layer);
  }
  if (s_date_header_layer) {
    layer_mark_dirty(s_date_header_layer);
  }
  // Notify detail view so it can refresh its stale habit pointer
  ui_habit_detail_on_model_changed();
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
  if (s_loading_timer) {
    app_timer_cancel(s_loading_timer);
    s_loading_timer = NULL;
  }
  if (s_safety_timer) {
    app_timer_cancel(s_safety_timer);
    s_safety_timer = NULL;
  }
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
