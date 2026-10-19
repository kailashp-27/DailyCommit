# 0.1.2 — local development, October 18, 2026

This version has not been pushed, deployed or packaged into a new APK. The published PWA and 0.1.1 APK are unchanged.

## Changes

- Habit details show current/latest and best streaks, completed days, the last 30 days and a completion percentage. Select a date to review its activity, or edit an active habit.
- Android reminder notifications offer Mark done (or Mark all done for merged reminders) and Snooze 15 min. These actions open the app to apply the change. Snoozes respect the logical day boundary and are removed when their habits are completed, paused or no longer have reminders enabled.
- Today and Habits groups collapse independently; choices survive reload and backups. Complete group remains available while collapsed.
- Habits can be searched by habit/group name and filtered by group or Active/Archived/All. Archived habits can be resumed.
- Hello World requires a perfect day after the first habit's creation date. Clean Working Tree requires a perfect day with at least five completed scheduled habits. Existing earned badges remain permanent; neither badge is repeatedly awarded.
- Widget grids retain the entire selected 13/26/52 weeks, including empty cells, and wrap into chronological strips sized for the available area. Android 12+ receives layouts for the launcher's advertised sizes; earlier Android versions use orientation-aware dimensions. Short widgets prioritize the graph; taller widgets gain quick check-in rows. Settings previews square, tall and wide layouts using the same geometry.

## Verification

- All 53 app tests passed in the final full run. Coverage includes badge thresholds, permanent awards, details/history, filters, collapse persistence, snooze expiry/cancellation and stale notification actions.
- Three Java/JUnit geometry tests passed against the maintained native geometry class, including all 364 cells, bounds, no overlaps, chronology and square/tall/wide sizes.
- TypeScript/Vite/PWA production build and Android asset/source synchronization passed.
- Mobile browser checks at 390px and 320px covered search, archived filtering, details/edit, independent persisted collapse choices, all three widget preview shapes and horizontal overflow. An isolated local origin contained an explicitly imported fixture; these checks did not change user history.
- Screenshots: `preview-012-habit-details.png`, `preview-012-habit-search.png`, `preview-012-widget-square.png`.

## Remaining validation

The full 0.1.2 APK and Android lint have not been run. This machine lacks the configured Android SDK/JDK 21; the pure Java geometry checks used JDK 17. No remote build was triggered because this session is local-only. A packaged APK still needs phone checks for notification actions, cold start, resize/orientation, multiple widget instances and launcher behavior. Browser previews and geometry tests do not establish Android rendering or notification delivery.
