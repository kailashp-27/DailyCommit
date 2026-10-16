package app.dailycommit.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

// Native widget actions remain durable until IndexedDB has applied and acknowledged
// their unique IDs. Rendering overlays this queue without opening the WebView.
public final class WidgetActions {
    private static SharedPreferences prefs(Context context) { return context.getSharedPreferences(DailyCommitWidgetProvider.PREFS, 0); }
    public static String current(JSONObject data) {
        Calendar day = Calendar.getInstance();
        if (day.get(Calendar.HOUR_OF_DAY) < data.optInt("rolloverHour", 0)) day.add(Calendar.DATE, -1);
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(day.getTime());
    }
    public static synchronized JSONArray pending(Context context) throws Exception { return new JSONArray(prefs(context).getString("pending", "[]")); }
    private static JSONObject originalTask(JSONObject data, String date, String habitId) {
        JSONArray days = data.optJSONArray("quickDays");
        if (days == null) return null;
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day == null || !date.equals(day.optString("date"))) continue;
            JSONArray tasks = day.optJSONArray("tasks");
            if (tasks == null) return null;
            for (int j = 0; j < tasks.length(); j++) { JSONObject task = tasks.optJSONObject(j); if (task != null && habitId.equals(task.optString("habitId"))) return task; }
        }
        return null;
    }
    public static JSONArray tasks(JSONObject data, String date, JSONArray pending) throws Exception {
        JSONArray result = new JSONArray(), days = data.optJSONArray("quickDays");
        if (days == null) return result;
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.getJSONObject(i);
            if (!date.equals(day.optString("date"))) continue;
            JSONArray tasks = day.getJSONArray("tasks");
            for (int j = 0; j < tasks.length(); j++) {
                JSONObject task = new JSONObject(tasks.getJSONObject(j).toString());
                String habit = task.getString("habitId"), weekStart = task.optString("weekStart", "");
                double value = task.optDouble("value", 0); boolean queuedToday = false; int earlier = 0;
                for (int k = 0; k < pending.length(); k++) {
                    JSONObject action = pending.getJSONObject(k);
                    if (!habit.equals(action.optString("habitId"))) continue;
                    String actionDate = action.optString("date");
                    if (date.equals(actionDate)) { value = Math.max(value, action.optDouble("value", 0)); queuedToday = true; }
                    else if (!weekStart.isEmpty() && actionDate.compareTo(weekStart) >= 0 && actionDate.compareTo(date) < 0) {
                        JSONObject original = originalTask(data, actionDate, habit);
                        if (original != null && original.optDouble("value", 0) < original.optDouble("target", 1)) earlier++;
                    }
                }
                if (!queuedToday && value == 0 && !weekStart.isEmpty() && earlier >= task.optInt("remaining", 7)) continue;
                task.put("value", value); result.put(task);
            }
            break;
        }
        return result;
    }
    public static boolean hasDay(JSONObject data, String date) {
        JSONArray days = data.optJSONArray("quickDays");
        if (days != null) for (int i = 0; i < days.length(); i++) if (date.equals(days.optJSONObject(i).optString("date"))) return true;
        return false;
    }
    public static void overlay(JSONObject data, Map<String, JSONObject> rows, JSONArray pending) throws Exception {
        JSONArray days = data.optJSONArray("quickDays");
        if (days == null) return;
        for (int i = 0; i < days.length(); i++) {
            String date = days.getJSONObject(i).getString("date");
            JSONArray tasks = tasks(data, date, pending); int done = 0; double progress = 0;
            for (int j = 0; j < tasks.length(); j++) {
                JSONObject task = tasks.getJSONObject(j); double ratio = Math.min(1, task.optDouble("value", 0) / task.getDouble("target"));
                progress += ratio; if (ratio >= 1) done++;
            }
            rows.put(date, new JSONObject().put("date", date).put("done", done).put("total", tasks.length()).put("level", tasks.length() == 0 ? -1 : (int) Math.ceil(progress / tasks.length() * 4)));
        }
    }
    public static synchronized boolean complete(Context context, String date, String habitId) throws Exception {
        JSONObject data = new JSONObject(prefs(context).getString("snapshot", "{}"));
        if (!current(data).equals(date)) return false; // Old launcher clicks cannot complete a different day.
        JSONArray pending = pending(context), tasks = tasks(data, date, pending);
        if (pending.length() >= 2000) return false;
        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.getJSONObject(i);
            if (!habitId.equals(task.optString("habitId")) || task.optDouble("value", 0) >= task.getDouble("target")) continue;
            pending.put(new JSONObject().put("id", UUID.randomUUID().toString()).put("habitId", habitId).put("date", date).put("value", task.getDouble("target")).put("completedAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new java.util.Date())));
            return prefs(context).edit().putString("pending", pending.toString()).commit();
        }
        return false;
    }
    public static synchronized void publish(Context context, String snapshot) { prefs(context).edit().putString("snapshot", snapshot).apply(); }
    public static synchronized void acknowledge(Context context, JSONArray ids, String snapshot) throws Exception {
        JSONArray pending = pending(context), remaining = new JSONArray();
        for (int i = 0; i < pending.length(); i++) {
            JSONObject action = pending.getJSONObject(i); boolean applied = false;
            for (int j = 0; j < ids.length(); j++) if (action.getString("id").equals(ids.getString(j))) { applied = true; break; }
            if (!applied) remaining.put(action);
        }
        if (!prefs(context).edit().putString("snapshot", snapshot).putString("pending", remaining.toString()).commit()) throw new IllegalStateException("Could not persist acknowledgement");
    }
}
