package app.dailycommit.mobile;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.util.SizeF;
import java.util.ArrayList;
import android.view.View;
import android.net.Uri;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class DailyCommitWidgetProvider extends AppWidgetProvider {
    public static final String PREFS = "dailycommit_widget";
    private static final String ROLLOVER = "app.dailycommit.mobile.WIDGET_ROLLOVER";
    private static final String COMPLETE = "app.dailycommit.mobile.WIDGET_COMPLETE";
    private static final String PAGE = "app.dailycommit.mobile.WIDGET_PAGE";

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (COMPLETE.equals(action)) {
            try { WidgetActions.complete(context, intent.getStringExtra("date"), intent.getStringExtra("habitId")); } catch (Exception ignored) {}
            refreshAll(context); return;
        }
        if (PAGE.equals(action)) {
            int id = intent.getIntExtra("widgetId", -1);
            android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, 0);
            prefs.edit().putInt("offset:" + id, prefs.getInt("offset:" + id, 0) + 1).apply();
            refreshAll(context); return;
        }
        if (ROLLOVER.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action) || Intent.ACTION_DATE_CHANGED.equals(action)) refreshAll(context);
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
        schedule(context);
    }
    @Override public void onEnabled(Context context) { schedule(context); }
    @Override public void onDisabled(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.cancel(rolloverIntent(context));
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) { update(context, manager, id); }
    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, DailyCommitWidgetProvider.class))) update(context, manager, id);
        schedule(context);
    }
    private static PendingIntent rolloverIntent(Context context) {
        return PendingIntent.getBroadcast(context, 41002, new Intent(context, DailyCommitWidgetProvider.class).setAction(ROLLOVER), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void schedule(Context context) {
        if (AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, DailyCommitWidgetProvider.class)).length == 0) return;
        int hour = 0;
        try { hour = new JSONObject(context.getSharedPreferences(PREFS, 0).getString("snapshot", "{}")).optInt("rolloverHour", 0); } catch (Exception ignored) {}
        Calendar next = Calendar.getInstance(); next.set(Calendar.HOUR_OF_DAY, hour); next.set(Calendar.MINUTE, 0); next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DATE, 1);
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), rolloverIntent(context));
    }
    private static void addRows(Map<String, JSONObject> rows, JSONArray values) throws Exception {
        if (values == null) return;
        for (int i = 0; i < values.length(); i++) { JSONObject row = values.getJSONObject(i); rows.put(row.getString("date"), row); }
    }
    private static synchronized void update(Context context, AppWidgetManager manager, int id) {
        Bundle options = manager.getAppWidgetOptions(id);
        int screenPixels = context.getResources().getDisplayMetrics().widthPixels * context.getResources().getDisplayMetrics().heightPixels;
        if (Build.VERSION.SDK_INT >= 31) {
            ArrayList<SizeF> sizes = options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if (sizes != null && !sizes.isEmpty() && sizes.size() <= 16) {
                Map<SizeF, RemoteViews> layouts = new HashMap<>();
                for (SizeF size : sizes) layouts.put(size, buildViews(context, id, Math.round(size.getWidth()), Math.round(size.getHeight()), Math.max(32768, screenPixels / sizes.size())));
                manager.updateAppWidget(id, new RemoteViews(layouts)); return;
            }
        }
        boolean landscape = context.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        int width = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 280);
        manager.updateAppWidget(id, buildViews(context, id, width, height, Math.max(32768, screenPixels)));
    }
    private static RemoteViews buildViews(Context context, int id, int width, int height, int pixelBudget) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.dailycommit_widget);
        Intent launch = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        views.setTextViewText(R.id.widget_count, "Open to begin"); views.setTextViewText(R.id.widget_hint, "Tap to check in");
        views.removeAllViews(R.id.widget_quick_list); views.setViewVisibility(R.id.widget_more, View.GONE);
        try {
            JSONObject data = new JSONObject(context.getSharedPreferences(PREFS, 0).getString("snapshot", "{}"));
            boolean light = "light".equals(data.optString("mode", "dark"));
            views.setInt(R.id.widget_root, "setBackgroundResource", light ? R.drawable.widget_background_light : R.drawable.widget_background);
            views.setTextColor(R.id.widget_title, Color.parseColor(light ? "#1A1814" : "#E8EAF0"));
            views.setTextColor(R.id.widget_count, Color.parseColor(data.optString("accent", light ? "#C2410C" : "#FF8A3D")));
            views.setTextColor(R.id.widget_hint, Color.parseColor(light ? "#5B564E" : "#A3AAB9"));
            Calendar local = Calendar.getInstance(); if (local.get(Calendar.HOUR_OF_DAY) < data.optInt("rolloverHour", 0)) local.add(Calendar.DATE, -1);
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.US); String current = formatter.format(local.getTime());
            Map<String, JSONObject> rows = new HashMap<>();
            addRows(rows, data.optJSONArray("days")); addRows(rows, data.optJSONArray("history")); addRows(rows, data.optJSONArray("upcoming"));
            if (data.has("today")) { JSONObject row = rows.get(data.getString("today")); if (row == null) row = new JSONObject(); row.put("done", data.optInt("done", 0)); row.put("total", data.optInt("total", 0)); rows.put(data.getString("today"), row); }
            JSONArray pending = WidgetActions.pending(context);
            WidgetActions.overlay(data, rows, pending);
            JSONObject day = rows.get(current);
            if (day != null && day.has("total")) {
                views.setTextViewText(R.id.widget_count, day.optInt("done", 0) + "/" + day.optInt("total", 0));
                views.setTextViewText(R.id.widget_hint, new SimpleDateFormat("d MMM", Locale.getDefault()).format(local.getTime()) + " · Tap to check in");
            } else if (data.has("today")) { views.setTextViewText(R.id.widget_count, "Open to refresh"); views.setTextViewText(R.id.widget_hint, "Refresh DailyCommit for this date"); }
            JSONArray tasks = WidgetActions.tasks(data, current, pending), unfinished = new JSONArray(), habits = data.optJSONArray("quickHabits");
            for (int i = 0; i < tasks.length(); i++) { JSONObject task = tasks.getJSONObject(i); if (task.optDouble("value", 0) < task.getDouble("target")) unfinished.put(task); }
            int visible = height >= 440 ? 3 : height >= 340 ? 2 : height >= 260 ? 1 : 0;
            int pageCount = Math.max(1, (unfinished.length() + Math.max(1, visible) - 1) / Math.max(1, visible));
            int page = context.getSharedPreferences(PREFS, 0).getInt("offset:" + id, 0) % pageCount;
            for (int i = page * visible; i < Math.min(unfinished.length(), (page + 1) * visible); i++) {
                JSONObject task = unfinished.getJSONObject(i); String habitId = task.getString("habitId"), name = "Habit";
                if (habits != null) for (int j = 0; j < habits.length(); j++) if (habitId.equals(habits.getJSONObject(j).optString("id"))) { name = habits.getJSONObject(j).optString("name", "Habit"); break; }
                RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_quick_row);
                row.setTextViewText(R.id.widget_quick_button, "✓  " + name);
                row.setTextColor(R.id.widget_quick_button, Color.parseColor(data.optString("accent", light ? "#C2410C" : "#FF8A3D")));
                row.setContentDescription(R.id.widget_quick_button, "Complete " + name + " for " + current);
                Intent complete = new Intent(context, DailyCommitWidgetProvider.class).setAction(COMPLETE).setData(Uri.parse("dailycommit://complete/" + Uri.encode(habitId) + "/" + current)).putExtra("date", current).putExtra("habitId", habitId);
                row.setOnClickPendingIntent(R.id.widget_quick_button, PendingIntent.getBroadcast(context, 0, complete, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
                views.addView(R.id.widget_quick_list, row);
            }
            if (pageCount > 1 && visible > 0) {
                views.setViewVisibility(R.id.widget_more, View.VISIBLE); views.setTextViewText(R.id.widget_more, "More habits · " + (page + 1) + "/" + pageCount);
                views.setTextColor(R.id.widget_more, Color.parseColor(light ? "#5B564E" : "#A3AAB9"));
                Intent pageIntent = new Intent(context, DailyCommitWidgetProvider.class).setAction(PAGE).setData(Uri.parse("dailycommit://page/" + id)).putExtra("widgetId", id);
                views.setOnClickPendingIntent(R.id.widget_more, PendingIntent.getBroadcast(context, id, pageIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            if (WidgetActions.hasDay(data, current)) views.setTextViewText(R.id.widget_hint, unfinished.length() > 0 ? "Tap ✓ to complete · Tap graph to open" : tasks.length() > 0 ? "All scheduled habits done · Tap graph to open" : "No habits scheduled · Tap graph to open");
            else views.setTextViewText(R.id.widget_hint, "Open DailyCommit to refresh quick check-ins");
            if (visible == 0 && unfinished.length() > 0) views.setTextViewText(R.id.widget_hint, "Resize taller for quick check-ins · Tap graph to open");
            int months = data.optInt("months", 6);
            int count = months == 3 ? 91 : months == 12 ? 364 : 182;
            JSONArray days = new JSONArray(); local.add(Calendar.DATE, -(count - 1));
            for (int i = 0; i < count; i++) { String date = formatter.format(local.getTime()); JSONObject row = rows.get(date); days.put(row != null ? row : new JSONObject().put("level", -1)); local.add(Calendar.DATE, 1); }
            JSONArray colors = data.optJSONArray("colors"); if (colors == null) colors = new JSONArray("[\"#1A1E28\",\"#4A2A17\",\"#8F4A1F\",\"#E27A2B\",\"#FFB65C\"]");
            int shownRows = Math.min(visible, unfinished.length());
            int graphHeight = Math.max(36, height - 88 - shownRows * 44 - (pageCount > 1 && visible > 0 ? 44 : 0));
            views.setImageViewBitmap(R.id.widget_heatmap, drawHeatmap(days, colors, light ? "#E7E2DA" : "#252B38", light ? "#CEC8BF" : "#363F50", count, Math.max(36, width - 32) * 2, graphHeight * 2, pixelBudget));
            views.setContentDescription(R.id.widget_heatmap, count / 7 + " weeks of habit activity in wrapped chronological strips. Open DailyCommit for details.");
        } catch (Exception ignored) { views.setTextViewText(R.id.widget_hint, "Open DailyCommit to refresh"); }
        return views;
    }
    private static Bitmap drawHeatmap(JSONArray days, JSONArray colors, String restColor, String gridColor, int count, int width, int height, int pixelBudget) throws Exception {
        width = Math.min(width, 1600); height = Math.min(height, 2000);
        if ((long) width * height > pixelBudget) {
            double scale = Math.sqrt((double) pixelBudget / ((long) width * height));
            width = Math.max(1, (int) (width * scale)); height = Math.max(1, (int) (height * scale));
        }
        WidgetGridGeometry grid = new WidgetGridGeometry(count / 7, width, height);
        float cell = grid.cell, radius = Math.max(1, cell * .18f);
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap); Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        for (int i = 0; i < count; i++) {
            int level = days.getJSONObject(i).optInt("level", -1);
            paint.setColor(level < 0 ? Color.parseColor(restColor) : Color.parseColor(colors.getString(Math.min(level, 4))));
            float x = grid.x(i), y = grid.y(i);
            canvas.drawRoundRect(x, y, x + cell, y + cell, radius, radius, paint);
            if (level <= 0) {
                paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.2f); paint.setColor(Color.parseColor(gridColor));
                canvas.drawRoundRect(x + .6f, y + .6f, x + cell - .6f, y + cell - .6f, radius, radius, paint);
                paint.setStyle(Paint.Style.FILL);
            }
        }
        return bitmap;
    }
}
