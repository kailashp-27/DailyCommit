# Android companion and home-screen widget

The native Android app is required for a real launcher widget. Installing the PWA alone adds an icon, not a contribution widget. Both use the same React application; their storage is separate. Export a JSON backup from one and import into the other to transfer habits.

## Setup

Install Android Studio with its Android SDK and JDK 21 (Capacitor 8). From the project root:

```sh
npm install
npm run android:sync
npm run android:open
```

The Android project is included after initial generation. If recreating it from scratch:

```sh
npm run build
npx cap add android
node scripts/setup-widget.mjs
npx cap sync android
```

In Android Studio, wait for Gradle sync, then run on a USB-debugging phone or an emulator. Build a debug APK through Build > Generate App Bundles or APKs. A production release needs a signing key; keep it outside Git.

## Add the widget

1. Open the installed Android app and add your first habit.
2. Open Settings → Home-screen widget, choose 3, 6 or 12 months, and tap Add to home screen; confirm in the launcher.
3. Or long-press an empty home-screen space, choose Widgets, then DailyCommit.
4. Complete a habit in the app or directly in the widget; counts and contribution colors update.

The widget uses a derived history and a year of future schedule projections. Rollover alarms, periodic updates, reboot and clock/timezone broadcasts move its date window and counts while the web app is closed. It refreshes its snapshot after check-ins, settings changes, imports and app resume. Beyond the forecast horizon, it asks you to reopen the app. Native code never reads or edits IndexedDB while closed. Alarm delivery is inexact and can be delayed by Android power management.

Small widgets show 3 months; medium widgets show 6. The 12-month option requires an instance at least 320dp wide and falls back to 6 otherwise. Tap a habit’s ✓ row to complete its target directly from the home screen. More habits cycles through additional rows. The graph opens the app. Actions persist in native SharedPreferences, immediately overlay the graph/counts, and merge into IndexedDB on startup/resume with an idempotent acknowledgement. Weekly quotas account for pending completions. Quick check-in forecasts cover 32 days; open the app at least monthly to refresh them.

## Reminders

Enable Daily reminder in Settings and grant notification permission. The official Capacitor Local Notifications plugin schedules a rolling set of date-specific global and individual habit reminders. The plan respects weekdays, weekly quotas, completed/rest days and vacations. It merges notifications at the same time, schedules at most 400 upcoming slots on Android (60 on iOS) across the next 31 logical days, and refreshes them when the app opens or data changes. Open the app regularly to extend the schedule. Delivery is based on the last saved plan while the app is closed; queued widget actions reconcile on app resume. Exact-alarm access is deliberately removed from the merged manifest. Battery policies can delay delivery. The web app labels its reminders as open-app only.

## Source map

- `native/android/`: maintained provider, Capacitor plugin and widget XML templates.
- `scripts/setup-widget.mjs`: installs those sources and registers the plugin/provider in the generated project; currently owns MainActivity.
- `android/`: generated Gradle project plus installed native widget source.
- `src/widget.ts`: versioned snapshot contract, native detection, publication and pin request.

If editing MainActivity or the native theme later, update the setup script/templates too; they own this foundation's registration class, styles and launcher icons. `cap sync` preserves native sources. It refreshes the packaged web build.

## Verification pending

Compilation requires the local SDK/JDK setup. Real-device tests must cover resize, multiple instances, launcher restart, reboot, stale date, rollover, themes, restored backups and offline check-in. The PWA tests do not establish native Android behavior.


## Manual phone checklist

Download and unzip the `android-debug-apk` artifact from a successful GitHub Actions Build run. Install the APK and open DailyCommit before adding the widget. Keep a backup before replacing an existing installation; signing keys can differ across debug builds, so uninstalling an incompatible build would remove its app data.

- Add a habit; complete and undo a check-in in the app, then confirm the widget count and heatmap agree.
- Add the widget through Settings and through your launcher. Resize it; try multiple widgets and the 3/6/12-month settings.
- Complete binary, numeric and checklist habits from the widget while the app is closed. Reopen the app and confirm the check-ins appear once, with correct values and checklist steps.
- Verify weekly quotas, vacations, light/dark mode and any unlocked app colors.
- Cross midnight or your chosen day-start time, restart the launcher, and reboot the phone. Check the date and widget updates after each.
- Enable reminders with permission, close the app, and check individual/global times, completed-habit suppression, and vacation suppression. Check normal and battery-saver behavior; delivery can be delayed.
- Export a backup, then import it into a separate installation/browser and confirm habits, notes, checklist steps, awards and appearance are retained.
- Launch in airplane mode and check app navigation, daily notes and check-ins.

Report the phone model, Android version, launcher and steps for anything that fails. These are owner-performed device checks; a successful GitHub build does not establish launcher or notification delivery behavior.
