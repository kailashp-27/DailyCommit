# Architecture decisions

## 001 — PWA plus native Android companion

The PWA remains local-first and deployable to Netlify. Capacitor packages the same built UI into Android. A native `AppWidgetProvider` renders a bitmap heatmap in `RemoteViews`; a local Capacitor plugin publishes the snapshot and requests launcher pinning.

References: [Android widgets](https://developer.android.com/develop/ui/views/appwidgets), [Capacitor local native code](https://capacitorjs.com/docs/android/custom-code).

The widget supports direct check-ins through immutable broadcast PendingIntents and a durable native action queue. IndexedDB consumes unique action IDs on startup/resume, then atomically acknowledges them with a fresh snapshot. Duplicate delivery is idempotent. No browser API can write this native widget snapshot from a standalone PWA. The Android companion must be installed.

## 002 — Raw facts plus effective schedule history

Habits, completions, skips, day notes and settings are authoritative in IndexedDB. Date strings are local `YYYY-MM-DD`, never UTC truncations. Schedule and measurement revisions preserve dates before an edit. Name/icon edits apply to historical views. Numeric habits store raw values; contribution intensity uses the mean of capped progress fractions across scheduled, unskipped habits. The daily count still reports fully completed habits. Changing a numeric habit to a binary check-in normalizes recorded values only on dates governed by the new binary revision.

Only the native widget stores derived state because Android must draw while the WebView is stopped. It carries a version, local today, rollover hour, colors, 364 history days, and 366 projected schedule days with counts and intensity. The legacy 182-day field remains for compatibility. Projections reflect all known facts and date-effective schedules at publication time; they are regenerated after edits/imports and on resume. An inexact rollover alarm, periodic updates, reboot and time/date broadcasts advance the native window and select the current day's counts. It never executes JavaScript or edits IndexedDB while closed. Outside the projection horizon it displays Open to refresh. Android power management can delay rendering.

The selected widget range is 3, 6 or 12 months (13/26/52 weeks). Narrow instances fall back to 3 months; a year needs at least 320dp. Each instance uses its own launcher size options. Widget check-in buttons complete the daily target while closed; the graph opens the app. A 32-day quick-check-in forecast is refreshed on each publication. Outside it, open the app to refresh.

## 003 — Weekly schedule policy

N-per-week means any day is eligible until N fully completed targets have occurred earlier in the current local week; a date with recorded progress remains scheduled. Partial numeric progress does not satisfy the weekly quota. Changing weekStart recalculates weekly eligibility. Backdated completions can affect later eligibility in that week.

## 004 — Data ownership and durability

IndexedDB schema 4 retains notes and the consumed native action ledger, and adds permanent badge unlocks and raw undo events. Habit group names and custom group preferences are included in v2 backups. Backups export version 4 and accept versions 1, 2, 3 and 4; earned badges are merged during restore, never cleared. Missing legacy measurements behave as binary habits; missing notes become an empty collection. Backups are validated before replacement, and replacement writes run in one transaction. Imports are confirmed through a focus-trapped dialog. Persistence requests are optional; export remains necessary. Dexie live queries propagate changes across tabs. Native and browser databases do not automatically sync. Archiving retains raw facts even on excluded dates; resuming creates a new habit so the archive gap stays a rest period.

## 006 — Reminders, streaks and sharing

Native reminders use Capacitor Local Notifications and deliberately inexact daily alarms. Permission is requested only when the user enables reminders; the OS can delay delivery. Web notifications are limited to an open app and a five-minute delivery window, with a daily local marker. No push backend is implied. Reminder preferences are backed up; permission grants remain device-specific. References: [Local notifications](https://capacitorjs.com/docs/apis/local-notifications), [Android alarms](https://developer.android.com/develop/background-work/services/alarms/schedule).

Streaks count fully completed scheduled days; rest/skip days pause rather than increment. Today is not a failure while it is still in progress. Optional grace allows one missed day in a rolling seven-day period. Grace days preserve a streak but do not increment it. Milestones are based on the longest completed-day run: 7, 30, 100 and 365. Weekly reviews compare fully completed/scheduled habit percentages across matching weekdays, exclude rest days, and show the strongest day and the habit with the highest missed percentage. Notes and moods are not analyzed.

Image export is generated locally from the selected graph and habit filter using Canvas. Sharing requires the user's system share sheet, with PNG download as a fallback. Notes and mood are excluded. The UI uses device fonts so core views do not need a font CDN.

## 005 — Foundation versus release

Build and domain/storage tests establish a base. They do not prove Android launcher compatibility, phone durability or PWA installability on real devices. The task backlog tracks those gates separately.


Badge conditions are derived in badges.ts. The awards table stores only a unique badge ID and its original earning date. Transactional insertion prevents duplicate unlocks across tabs. Raw undo events support Ctrl+Z; backup export and logo taps explicitly award their event badges. New native check-in queue entries include the actual timestamp, avoiding false time-based awards on delayed reconciliation. See BADGES.md for the complete counting and calendar semantics.


Part 2 adds checklist measurements with stable step IDs to date-effective measurement revisions, optional `checked` IDs on completion rows, per-habit reminder preferences and vacation intervals in settings. The existing schema-4 stores accept these extra fields. Checklist values are the selected-step count, so ratios and one-check-in-per-habit/day semantics remain consistent. Vacation scheduling excludes paused incomplete habits; existing completion facts remain stored and visible. Full-vacation days pause streaks. Ending a vacation preserves its past portion.

reminderPlan.ts produces a pure schedule-aware notification plan. Equal-time habit/global alerts merge. Native reminders use a serialized bounded rolling schedule and cancel only DailyCommit-owned IDs; the old repeating global ID is cancelled during migration. Browser reminders use per-slot delivery markers and require the app to be open. New data, local date changes and the minute clock refresh pending plans. No remote push service or background web execution is claimed.
