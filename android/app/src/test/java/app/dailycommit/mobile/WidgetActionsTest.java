package app.dailycommit.mobile;

import static org.junit.Assert.*;
import org.junit.Test;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

public class WidgetActionsTest {
    private JSONObject task(String id, double value, double target) throws Exception {
        return new JSONObject().put("habitId", id).put("value", value).put("target", target);
    }
    private JSONObject day(String date, JSONObject... tasks) throws Exception {
        JSONArray values = new JSONArray();
        for (JSONObject task : tasks) values.put(task);
        return new JSONObject().put("date", date).put("tasks", values);
    }
    private JSONObject data(JSONObject... days) throws Exception {
        JSONArray values = new JSONArray();
        for (JSONObject day : days) values.put(day);
        return new JSONObject().put("quickDays", values);
    }
    private JSONObject action(String habit, String date, double value) throws Exception {
        return new JSONObject().put("habitId", habit).put("date", date).put("value", value);
    }
    @Test public void queuedCheckInCompletesOnlyMatchingHabitAndDayWithoutEditingSnapshot() throws Exception {
        JSONObject source = data(day("2026-10-12", task("read", 2, 10), task("walk", 0, 1)));
        JSONArray queue = new JSONArray().put(action("read", "2026-10-12", 10)).put(action("walk", "2026-10-13", 1));
        JSONArray tasks = WidgetActions.tasks(source, "2026-10-12", queue);
        assertEquals(10, tasks.getJSONObject(0).getDouble("value"), 0);
        assertEquals(0, tasks.getJSONObject(1).getDouble("value"), 0);
        assertEquals(2, WidgetActions.tasks(source, "2026-10-12", new JSONArray()).getJSONObject(0).getDouble("value"), 0);
    }
    @Test public void earlierQueuedWeeklyCompletionSuppressesLaterDaysAfterQuota() throws Exception {
        JSONObject source = data(day("2026-10-12", task("exercise", 0, 1)), day("2026-10-13", task("exercise", 0, 1).put("weekStart", "2026-10-12").put("remaining", 1)));
        JSONArray queue = new JSONArray().put(action("exercise", "2026-10-12", 1));
        assertEquals(0, WidgetActions.tasks(source, "2026-10-13", queue).length());
        queue.put(action("exercise", "2026-10-13", 1));
        assertEquals(1, WidgetActions.tasks(source, "2026-10-13", queue).length());
    }
    @Test public void reconciledWeeklyFactsAreNotCountedAgainFromPendingQueue() throws Exception {
        JSONObject source = data(day("2026-10-12", task("exercise", 1, 1)), day("2026-10-13", task("exercise", 0, 1).put("weekStart", "2026-10-12").put("remaining", 1)));
        assertEquals(1, WidgetActions.tasks(source, "2026-10-13", new JSONArray().put(action("exercise", "2026-10-12", 1))).length());
    }
    @Test public void overlayPreservesPartialProgressAndRestDays() throws Exception {
        JSONObject source = data(day("2026-10-12", task("read", 5, 10), task("walk", 0, 1)), day("2026-10-13"));
        Map<String, JSONObject> rows = new HashMap<>();
        WidgetActions.overlay(source, rows, new JSONArray().put(action("walk", "2026-10-12", 1)));
        assertEquals(1, rows.get("2026-10-12").getInt("done"));
        assertEquals(2, rows.get("2026-10-12").getInt("total"));
        assertEquals(3, rows.get("2026-10-12").getInt("level"));
        assertEquals(-1, rows.get("2026-10-13").getInt("level"));
        assertFalse(WidgetActions.hasDay(source, "2026-10-14"));
    }
}
