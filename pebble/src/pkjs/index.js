// PebbleKit JS companion for Habit Tracker (Pebble Time 2)

var CONFIG_KEY = 'habit_tracker_config';
var FIREBASE_API_KEY = 'AIzaSyA2H2APerJH9BQnDIhv0JGaYTNoNWRn-1E';
var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/habittracker-b6ec8/databases/(default)/documents/users/';
var HOSTED_CONFIG_URL = 'https://habit-tracker.sumitgouthaman.com/pebble_config.html';

function getConfig() {
  try {
    var raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveConfig(cfg) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

// Automatically refresh Firebase ID token using refresh_token
function getValidToken(callback) {
  var cfg = getConfig();
  if (!cfg.userId) {
    callback(null, null);
    return;
  }

  var now = Date.now();
  if (cfg.idToken && cfg.tokenExpiry && now < cfg.tokenExpiry) {
    callback(cfg.userId, cfg.idToken);
    return;
  }

  if (!cfg.refreshToken) {
    callback(cfg.userId, cfg.idToken || null);
    return;
  }

  // Refresh token via Google's SecureToken API
  var url = 'https://securetoken.googleapis.com/v1/token?key=' + FIREBASE_API_KEY;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var res = JSON.parse(xhr.responseText);
        cfg.idToken = res.id_token;
        if (res.refresh_token) {
          cfg.refreshToken = res.refresh_token;
        }
        // Set expiry buffer to 50 minutes (tokens are valid for 60 minutes)
        cfg.tokenExpiry = Date.now() + (50 * 60 * 1000);
        saveConfig(cfg);
        console.log('Firebase ID token refreshed successfully');
        callback(cfg.userId, cfg.idToken);
        return;
      } catch (e) {
        console.error('Failed to parse token response:', e);
      }
    }
    callback(cfg.userId, cfg.idToken || null);
  };

  xhr.onerror = function () {
    console.error('Network error during token refresh');
    callback(cfg.userId, cfg.idToken || null);
  };

  xhr.send('grant_type=refresh_token&refresh_token=' + encodeURIComponent(cfg.refreshToken));
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function getPeriodKey(date, type) {
  var d = date || new Date();
  var yyyy = d.getFullYear();
  var mm = pad2(d.getMonth() + 1);
  var dd = pad2(d.getDate());

  if (type === 1 || type === 'weekly') {
    // Monday of this week
    var day = d.getDay(); // 0 is Sunday
    var diff = (day + 6) % 7;
    var monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    var myyyy = monday.getFullYear();
    var mmm = pad2(monday.getMonth() + 1);
    var mdd = pad2(monday.getDate());
    return myyyy + '-' + mmm + '-' + mdd;
  }

  if (type === 2 || type === 'monthly') {
    return yyyy + '-' + mm;
  }

  return yyyy + '-' + mm + '-' + dd;
}

// Send habit items to watch sequentially to prevent buffer overflow
function sendHabitsToWatch(habits, index) {
  if (!habits || habits.length === 0) {
    Pebble.sendAppMessage({ HabitCount: 0 });
    return;
  }

  if (index >= habits.length) {
    return;
  }

  var item = habits[index];
  var dict = {
    HabitCount: habits.length,
    HabitIndex: index,
    HabitId: item.id,
    HabitTitle: item.title,
    HabitType: item.type,
    HabitTarget: item.target,
    HabitValue: item.value,
    HabitCompleted: item.completed ? 1 : 0,
    HabitDerived: item.derived ? 1 : 0,
    HabitIncrements: item.increments || '1'
  };

  Pebble.sendAppMessage(dict, function () {
    sendHabitsToWatch(habits, index + 1);
  }, function (e) {
    console.error('Failed to send habit ' + index + ' to watch:', JSON.stringify(e));
    setTimeout(function () {
      Pebble.sendAppMessage(dict, function () {
        sendHabitsToWatch(habits, index + 1);
      });
    }, 500);
  });
}

function formatDate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function getMondayDate(d) {
  var day = d.getDay(); // 0 is Sunday
  var diff = (day + 6) % 7; // Monday is 0, Sunday is 6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

function computeDerivedLog(habit, sourceHabit, evalDate) {
  if (!sourceHabit || !sourceHabit.parsedLogs) {
    return { value: 0, completed: false };
  }

  // Same-type derived: identical periods, just compare against derived targetCount
  if (habit.rawType === sourceHabit.rawType) {
    var periodKey = getPeriodKey(evalDate, habit.typeNum);
    var log = sourceHabit.parsedLogs[periodKey];
    var val = log ? (log.value || 0) : 0;
    return { value: val, completed: val >= habit.targetCount };
  }

  // Weekly derived from Daily: count how many days this week the daily habit was completed
  if (habit.rawType === 'weekly' && sourceHabit.rawType === 'daily') {
    var monday = getMondayDate(evalDate);
    var count = 0;
    for (var i = 0; i < 7; i++) {
      var curDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      var dayKey = formatDate(curDay);
      var log = sourceHabit.parsedLogs[dayKey];
      if (log && log.completed) {
        count++;
      }
    }
    return { value: count, completed: count >= habit.targetCount };
  }

  // Monthly derived from Daily: count how many days this month the daily habit was completed
  if (habit.rawType === 'monthly' && sourceHabit.rawType === 'daily') {
    var year = evalDate.getFullYear();
    var month = evalDate.getMonth();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var count = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var curDay = new Date(year, month, d);
      var dayKey = formatDate(curDay);
      var log = sourceHabit.parsedLogs[dayKey];
      if (log && log.completed) {
        count++;
      }
    }
    return { value: count, completed: count >= habit.targetCount };
  }

  // Monthly derived from Weekly: count how many weeks this month the weekly habit was completed
  if (habit.rawType === 'monthly' && sourceHabit.rawType === 'weekly') {
    var year = evalDate.getFullYear();
    var month = evalDate.getMonth();
    var monthStart = new Date(year, month, 1);
    var monthEnd = new Date(year, month + 1, 0);
    var cur = getMondayDate(monthStart);
    var count = 0;
    while (cur <= monthEnd) {
      if (cur >= monthStart) {
        var weekKey = formatDate(cur);
        var log = sourceHabit.parsedLogs[weekKey];
        if (log && log.completed) {
          count++;
        }
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    }
    return { value: count, completed: count >= habit.targetCount };
  }

  return { value: 0, completed: false };
}

function fetchHabitsFromFirestore(userId, idToken, targetDate) {
  var url = FIRESTORE_BASE + encodeURIComponent(userId) + '/habits?pageSize=100';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  if (idToken) {
    xhr.setRequestHeader('Authorization', 'Bearer ' + idToken);
  }

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var data = JSON.parse(xhr.responseText);
        var docs = data.documents || [];
        var rawHabitList = [];
        var rawHabitsMap = {};

        var evalDate = targetDate || new Date();

        for (var i = 0; i < docs.length; i++) {
          var fields = docs[i].fields || {};
          var isArchived = fields.archived && fields.archived.booleanValue;
          if (isArchived) continue;

          var docName = docs[i].name || '';
          var habitId = docName.split('/').pop();
          var title = fields.title ? fields.title.stringValue : 'Habit';
          var rawType = fields.type ? fields.type.stringValue : 'daily';
          var typeNum = (rawType === 'weekly') ? 1 : ((rawType === 'monthly') ? 2 : 0);
          var targetCount = fields.targetCount ? parseInt(fields.targetCount.integerValue || fields.targetCount.doubleValue || 1, 10) : 1;
          var derivedFromId = (fields.derivedFrom && fields.derivedFrom.stringValue) ? fields.derivedFrom.stringValue : null;

          var increments = '1';
          if (fields.increments && fields.increments.arrayValue && fields.increments.arrayValue.values) {
            var incArr = fields.increments.arrayValue.values.map(function (v) {
              return v.integerValue || v.stringValue || '1';
            });
            increments = incArr.join(',');
          }

          var parsedLogs = {};
          if (fields.logs && fields.logs.mapValue && fields.logs.mapValue.fields) {
            var logMap = fields.logs.mapValue.fields;
            for (var k in logMap) {
              if (logMap.hasOwnProperty(k) && logMap[k].mapValue && logMap[k].mapValue.fields) {
                var lf = logMap[k].mapValue.fields;
                parsedLogs[k] = {
                  value: parseInt((lf.value && (lf.value.integerValue || lf.value.doubleValue)) || 0, 10),
                  completed: (lf.completed && lf.completed.booleanValue) ? true : false
                };
              }
            }
          }

          var habitObj = {
            id: habitId,
            title: title,
            rawType: rawType,
            typeNum: typeNum,
            targetCount: targetCount,
            derivedFrom: derivedFromId,
            increments: increments,
            parsedLogs: parsedLogs
          };

          rawHabitList.push(habitObj);
          rawHabitsMap[habitId] = habitObj;
        }

        var habitsToSend = [];
        for (var j = 0; j < rawHabitList.length; j++) {
          var h = rawHabitList[j];
          var curVal = 0;
          var isComp = false;

          if (h.derivedFrom) {
            var sourceHabit = rawHabitsMap[h.derivedFrom];
            var derivedResult = computeDerivedLog(h, sourceHabit, evalDate);
            curVal = derivedResult.value;
            isComp = derivedResult.completed;
          } else {
            var periodKey = getPeriodKey(evalDate, h.typeNum);
            var log = h.parsedLogs[periodKey];
            if (log) {
              curVal = log.value;
              isComp = log.completed;
            }
          }

          habitsToSend.push({
            id: h.id,
            title: h.title,
            type: h.typeNum,
            target: h.targetCount,
            value: curVal,
            completed: isComp ? 1 : 0,
            derived: h.derivedFrom ? 1 : 0,
            increments: h.increments
          });
        }

        if (habitsToSend.length > 0) {
          sendHabitsToWatch(habitsToSend, 0);
        } else {
          // Genuinely 0 active habits after filtering
          Pebble.sendAppMessage({ HabitCount: 0 });
        }
        return;
      } catch (err) {
        console.error('Error parsing Firestore response:', err);
      }
    }
    // HTTP error or parse failure — preserve cached watch data
    Pebble.sendAppMessage({ SyncStatus: -1 });
  };

  xhr.onerror = function () {
    console.error('Firestore network error');
    Pebble.sendAppMessage({ SyncStatus: -1 });
  };

  xhr.send();
}

function updateFirestoreLog(habitId, value, targetCount, type, periodKey) {
  getValidToken(function (userId, idToken) {
    if (!userId || !idToken) {
      console.log('Cannot update Firestore: User not authenticated.');
      return;
    }

    var isCompleted = (value >= targetCount);
    var url = FIRESTORE_BASE + encodeURIComponent(userId) + '/habits/' + encodeURIComponent(habitId) +
      '?updateMask.fieldPaths=' + encodeURIComponent('logs.`' + periodKey + '`');

    var payload = {
      fields: {
        logs: {
          mapValue: {
            fields: {}
          }
        }
      }
    };

    payload.fields.logs.mapValue.fields[periodKey] = {
      mapValue: {
        fields: {
          value: { integerValue: String(value) },
          completed: { booleanValue: isCompleted },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      }
    };

    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + idToken);

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('Successfully updated habit ' + habitId + ' on Firestore');
      } else {
        console.error('Failed to update habit on Firestore: ' + xhr.status + ' ' + xhr.responseText);
      }
    };

    xhr.onerror = function () {
      console.error('Network error while updating habit on Firestore');
    };

    xhr.send(JSON.stringify(payload));
  });
}

function syncHabits(dayOffset) {
  var offset = (typeof dayOffset === 'number') ? dayOffset : 0;
  var targetDate = new Date();
  if (offset !== 0) {
    targetDate.setDate(targetDate.getDate() + offset);
  }
  console.log('Syncing habits for dayOffset=' + offset + ' (' + targetDate.toISOString().slice(0, 10) + ')');

  getValidToken(function (userId, idToken) {
    if (userId && idToken) {
      fetchHabitsFromFirestore(userId, idToken, targetDate);
    } else {
      console.log('User not authenticated. Displaying sign-in screen on watch.');
      Pebble.sendAppMessage({ HabitCount: 0 });
    }
  });
}

// ─── Pebble Lifecycle Events ──────────────────────────────────────────────────

Pebble.addEventListener('ready', function () {
  console.log('PebbleKit JS ready for Habit Tracker');
});

Pebble.addEventListener('appmessage', function (e) {
  var dict = e.payload || {};

  if (dict.AppReady !== undefined || dict.DayOffset !== undefined) {
    var offset = (dict.DayOffset !== undefined) ? dict.DayOffset : 0;
    syncHabits(offset);
  }

  if (dict.UpdateHabitId) {
    updateFirestoreLog(
      dict.UpdateHabitId,
      dict.UpdateValue || 0,
      dict.UpdateTarget || 1,
      dict.UpdateType || 0,
      dict.UpdatePeriodKey || getPeriodKey(new Date(), dict.UpdateType || 0)
    );
  }
});

Pebble.addEventListener('showConfiguration', function () {
  var cfg = getConfig();
  var url = HOSTED_CONFIG_URL + '?userId=' + encodeURIComponent(cfg.userId || '');
  console.log('Opening Pebble settings URL:', url);
  Pebble.openURL(url);
});

Pebble.addEventListener('webviewclosed', function (e) {
  if (e && e.response) {
    try {
      var config = JSON.parse(decodeURIComponent(e.response));
      if (config.userId && config.refreshToken) {
        config.idToken = null;
        config.tokenExpiry = 0; // Force immediate token refresh via Google SecureToken API
        saveConfig(config);
        console.log('Received auth credentials for user:', config.userId);
        syncHabits();
      } else if (config.userId === '') {
        // User explicitly disconnected
        saveConfig({});
        console.log('User disconnected from Habit Tracker');
        Pebble.sendAppMessage({ HabitCount: 0 });
      }
    } catch (err) {
      console.error('Error parsing webview response:', err);
    }
  }
});
