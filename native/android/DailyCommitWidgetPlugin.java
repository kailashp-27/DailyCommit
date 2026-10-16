package app.dailycommit.mobile;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "DailyCommitWidget")
public class DailyCommitWidgetPlugin extends Plugin {
    @PluginMethod
    public void publish(PluginCall call) {
        String snapshot = call.getString("snapshot");
        try {
            if (snapshot == null || snapshot.length() > 4000000) throw new IllegalArgumentException("Missing or oversized widget snapshot");
            JSONObject data = new JSONObject(snapshot);
            if (data.getInt("version") != 1 || data.getJSONArray("days").length() > 366) throw new IllegalArgumentException("Unsupported widget snapshot");
            if ((data.has("history") && data.getJSONArray("history").length() > 366) || (data.has("upcoming") && data.getJSONArray("upcoming").length() > 366)) throw new IllegalArgumentException("Oversized widget history");
            WidgetActions.publish(getContext(), snapshot);
            boolean light = "light".equals(data.optString("mode", "dark"));
            if (getActivity() != null) getActivity().runOnUiThread(() -> {
                Window window = getActivity().getWindow();
                int color = Color.parseColor(light ? "#FBF9F6" : "#0B0D12");
                window.setStatusBarColor(color); window.setNavigationBarColor(color);
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsetsController controller = window.getInsetsController();
                    if (controller != null) { int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS; controller.setSystemBarsAppearance(light ? mask : 0, mask); }
                } else { window.getDecorView().setSystemUiVisibility(light ? View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0) : 0); }
            });
            DailyCommitWidgetProvider.refreshAll(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not publish widget snapshot", e);
        }
    }

    @PluginMethod
    public void pending(PluginCall call) {
        try { JSObject result = new JSObject(); result.put("actions", WidgetActions.pending(getContext())); call.resolve(result); }
        catch (Exception e) { call.reject("Could not read widget check-ins", e); }
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        try {
            String snapshot = call.getString("snapshot"), ids = call.getString("ids");
            if (snapshot == null || snapshot.length() > 4000000 || ids == null) throw new IllegalArgumentException("Missing acknowledgement");
            JSONObject data = new JSONObject(snapshot);
            if (data.getInt("version") != 1) throw new IllegalArgumentException("Unsupported snapshot");
            WidgetActions.acknowledge(getContext(), new JSONArray(ids), snapshot);
            DailyCommitWidgetProvider.refreshAll(getContext()); call.resolve();
        } catch (Exception e) { call.reject("Could not acknowledge widget check-ins", e); }
    }

    @PluginMethod
    public void pin(PluginCall call) {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        boolean supported = Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported();
        if (supported) manager.requestPinAppWidget(new ComponentName(getContext(), DailyCommitWidgetProvider.class), null, null);
        JSObject result = new JSObject();
        result.put("supported", supported);
        call.resolve(result);
    }
}
