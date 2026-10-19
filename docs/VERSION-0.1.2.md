# 0.1.2 — published October 19, 2026

Source commit `bfd961984ca78b378208dff2630098da219e6f4c` was pushed to main and passed GitHub Actions run [39247440581](https://github.com/kailashp-27/DailyCommit/actions/runs/39247440581). The updated PWA and testing APK are published on the existing Netlify domain.

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

GitHub Actions compiled the full APK and passed Android unit tests and lint with SDK 36/JDK 21. The live PWA update was applied and the deployed search/filter and collapse controls were confirmed with no warning/error logs. The public APK download matches the CI artifact (4,462,895 bytes; SHA-256 `e2ff244b7d537fe95a1eb320bbb900dd5f3bffd9ed63c10e30a98e8a571e4db4`). Phone checks remain for notification actions, cold start, resize/orientation, multiple widget instances and launcher behavior. Build checks and browser previews do not establish Android launcher rendering or notification delivery.
