#include <pebble.h>
#include "habit_model.h"
#include "comm.h"
#include "ui_habit_list.h"

static void init(void) {
  habit_model_init();
  comm_init();
  ui_habit_list_init();
  ui_habit_list_push();

  // Notify phone companion app that watchapp is ready to receive habits
  comm_send_app_ready();
}

static void deinit(void) {
  ui_habit_list_deinit();
  comm_deinit();
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
