# Badge rules

Activity contains Weekly progress, Contributions, Badges, and finally Weekly review. Today uses a task count and compact previous/day-picker/next controls; the progress bar and always-visible date input have been removed.

The catalog contains the original 40 badges plus two color rewards. Activity shows six earned badges initially, with an explicit expansion for the full earned collection. Up next previews at most six discoverable milestones. Most advanced and unusual badges remain secret until earned. Frames use heat levels 1–4 from the selected dark/light color palette. Each icon is a five-by-five pixel drawing. Unlocks show a brief star burst with more stars for higher rarities, respect reduced motion, and display the original earning date. Secret badges are absent from the catalog until earned. The three unsupported features (timer, negative habits, and stacks) are hidden from the shelf; those habit types were excluded from the current plan on October 16.

## Persistence and counting

- Database schema 4 adds a unique-ID badge table storing only ID and earning date, plus raw undo events for Ctrl+Z. Conditions and current counts are derived from habits/check-ins/schedules, not stored progress counters.
- Atomic reconciliation returns only newly inserted awards. Multiple tabs cannot award the same badge twice. Undo, archive, edit, and restoring an older backup never remove existing unlocks.
- Backup v3 includes badge dates, undo events, special dates and the glow preference. Imports remain compatible with v1/v2. Importing an already earned badge does not repeat its animation.
- One completed habit on one date is one volume check-in; numeric increments and repeated completion clicks do not multiply it. Partial numeric progress does not count as a completed check-in.
- Clean Working Tree is awarded once. Its detail view shows the derived perfect-day total, which can change when history is edited.
- Pushed to Remote refers to downloading a local backup; no data is uploaded. The first exported backup includes that award.

## Calendar and timing

- A perfect day has at least one scheduled habit, every one completed, and no skipped habits. Skipped/rest days can pause normal streaks, but do not create perfect days.
- Streak awards follow the existing app streak rules, including the selected grace setting. Heat Wave uses 14 consecutive calendar days at heat level 4; Ember Mode counts 100 level-4 days in total. Level 4 means the heatmap's top intensity, including partial progress above 75%.
- Full Column always uses Monday–Sunday. Zero Conflicts needs a full completed calendar month, with no incomplete scheduled days; days with no scheduled habits are neutral. A month cannot be earned before its last day. Monday Specialist is earned on the final Monday when all Mondays are perfect.
- Rebase needs a previous check-in and at least seven whole days without any check-in before the perfect return day. Reflog requires a broken streak followed by a rebuild to the previous best.
- Overclocked needs ten numeric habit/date check-ins at 150% of target; multiple numeric habits can contribute on the same day. Polyglot counts five simultaneous habit streaks across their scheduled days; unscheduled and skipped days pause them.
- Special Release uses the explicit dates added in Settings. January 1, March 14 and February 29 use the recorded habit date.
- Midnight Merge and Pre-market Deploy use the original completion timestamp and local app-day rollover, never a backfilled date's assumed time. New widget queue entries carry the native timestamp; older queued entries without timestamps cannot prove a time-based award. Device verification remains pending.
- Fibonacci's 8/13/21/34-day messages have their own one-time markers; the visible badge is earned at 55. Logo taps are counted within the current app session.

## Cosmetics and sharing

Ember Mode unlocks an optional animated heatmap glow in Settings. The latest color request adds Cyan Branch (50 distinct days with at least one completed habit) and Neon Release (100 such days). These unlock Cyan and Neon Green in Settings, in either light or dark mode. Days need not be consecutive; multiple completions on the same day count once, and partial targets do not count. Color awards are permanent after undo or restoring an older backup. Locked colors cannot be selected through settings. Legacy Mint/Mono preferences fall back to Ember. Charts, badge frames, share images and widget snapshots use the selected palette. Android source consumes the snapshot accent; device validation remains deferred. PNG exports stamp all badges whose earning date is in the current month. Notes are excluded. Badge details can select and highlight their earning date in the contribution graph, including dates outside the current graph period.
