# DailyCommit status and remaining tasks

The reference plan informs the product; the user's instructions prioritize the Android widget, start with Ember and unlock additional colors, and leave manual phone/widget checks to the owner. Automated source checks are now authorized. The original action-plan file has not been changed. These work packages are a backlog, not separate chats or scheduled jobs.

## Implemented

| Feature | Current implementation |
| --- | --- |
| Foundation | React/Vite/TypeScript, compact mobile shell, bottom navigation, dark/light Ember |
| Habits | Create/edit, daily/weekday/weekly schedules, up/down ordering, archive confirmation and undo, resume with preserved history |
| Numeric habits | Daily target and unit, quick increment/decrement, custom values, partial graph shading, date-effective target revisions |
| Check-in | Completion, undo, explicit skip/rest menu, historical date editing |
| Activity | Six-month default, year graph, 44px month selection, keyboard graph navigation, per-habit filters including archived habits |
| Notes | A note and mood per day, optional, editable on past dates |
| Sharing | Local PNG generation, image preview, system file sharing with download fallback; notes excluded |
| Streaks | Full-day streaks, rest-day pauses, optional one missed day in rolling seven, 7/30/100/365 milestones |
| Reminders | Native daily local notifications, permission flow and time selection; clearly labelled open-app-only web notifications |
| Data | IndexedDB schema 4, live cross-tab reads, atomic restore, size/format validation, v1/v2/v3/v4 backup import and v4 export |
| PWA | Manifest, icons, local font stack, offline cache, install UI, update prompt and offline indicator |
| Android widget | Provider, bridge, launcher pinning, 3/6/12-month adaptive ranges, schedule-aware future snapshots, rollover alarm and reboot/date/timezone handling |
| Release preparation | Netlify config, README/screenshots, web and Android build workflows, bug/feature issue templates |

## Remaining — Android build and device validation

- [ ] **AND-01** — Set up Android SDK and JDK 21, compile and install the debug APK. The current machine has JDK 17 and no Android SDK. Native source is implemented and synchronized; native compilation is not yet established.
- [ ] **AND-02** — Check launcher pinning, counts, numeric progress, resize, multiple instances, theme changes, reboot, process death, timezone changes and configured rollover on the actual phone.
- [ ] **AND-03** — Validate projection-based background updates under battery saver and long periods without opening the app. Alarms are inexact; delivery can be delayed. Outside the one-year projection horizon the widget asks to reopen the app.
- [ ] **AND-04** — Check reminder permission, daily delivery, reboot recovery, time changes and disabling reminders on the phone.

## Remaining — App/release testing, deferred by request

- [ ] **WEB-01** — Keyboard/screen-reader, contrast and touch review across all screens, editor/restore focus traps, month grid and share sheet.
- [ ] **DATA-01** — Add and run coverage for numeric histories, v1 migration/v2 round trips, notes, streak/grace rules, DST/timezones, weekly quota edits, rollover changes, multiple tabs, interrupted imports and storage-full failures.
- [ ] **PWA-01** — HTTPS deployment, Android/iOS installation, airplane-mode CRUD and backups, then a service-worker update without data loss.
- [ ] **QA-01** — Lighthouse performance/accessibility, 14 days of daily use, three onboarding testers and fixes for the findings.

## Remaining — Publication

- [ ] **SHIP-01** — Publish/link GitHub and Netlify, choose final HTTPS URL, run the prepared build workflows and configure preview deployments.
- [ ] **SHIP-02** — Record a short demo and tag v1 after validation. Debug APKs produced by CI are development artifacts; a production Android release needs signing.

## Optional / parked

Cloud sync/accounts, shared habits, public profiles, XP and photo proof remain optional. Timers, negative habits and habit stacks are excluded from the current plan by the October 16 request. The latest request adds Cyan at 50 active days and Neon Green at 100, with permanent badge rewards and Settings selection. Weekly percentage reviews are implemented; broader analytics remain optional.

All planned v1.5 app features now have implementations. Compilation checks do not replace feature or device tests. The project is published to github.com/kailashp-27/DailyCommit. Netlify deployment remains deferred.

## October 13 layout update

- Weekly review is now a collapsible section on Today, below the daily habits and note. It has independent previous/next week controls.
- Activity contains the weekly graph and contribution history; its milestone panel is removed for now. Expanded badges/milestones are parked for a later release.
- Existing groups accept multiple habits through their own Add habit button, which preselects the group. Existing habits can be reassigned through the editor's Group field.

## October 12 additions

- Implemented: Morning/Fitness/Study/Evening plus custom groups; assign habits in the editor; one-click group completion with Undo, preserving rest days.
- Implemented: weekly reviews using completion percentages over matched weekdays, strongest day and highest missed-rate habit.
- Implemented in Android source: paged quick-check-in rows, durable native queue, immediate count/graph overlays, idempotent IndexedDB merge.
- Device gate: compile APK with SDK/JDK 21, then verify closed-app check-ins, repeated clicks, multiple widget instances, rollover, weekly quotas, crash between write/ack, and reconciliation after reopening.


## October 14 badge implementation

- Implemented the complete 40-name catalog, sorted by rarity, with pixel icons and frames using the current Ember heat colors.
- All supported badge rules are active. Timeboxed, Dependency Free and Stack Overflow remain Coming later until their underlying features exist.
- Permanent one-time awards, date details and heatmap highlighting, rarity star bursts, hidden secrets, backup preservation, special dates, share stamps and an optional unlocked Ember glow are implemented.
- Today now emphasizes tasks with a simple completion count and compact day controls. Weekly review is back at the end of Activity, below the badge collection. This supersedes the earlier October 13 layout note.
- Native APK compilation and device checks, HTTPS publication and the broader release testing backlog remain outstanding.


## October 16 — Two-part implementation

### Part 1 — Groups and templates (implemented)

This chat: DailyCommit Part 1: groups and habit templates.

- Manage groups: create, rename, move up/down, and remove. Default groups can also be renamed or removed and do not reappear automatically.
- Removal moves all members (including archived habits) to another group or Ungrouped, preserving IDs, schedules, completions, skips and notes. Group changes support Undo.
- Ten templates for Morning, Fitness, Study and Evening. Choosing one fills the standard editor; the user reviews/edits and explicitly adds the habit. No habit is saved on selection.
- Group ordering and membership persist through existing v3 backups. Missing group lists in legacy data still use the defaults; an explicit empty list stays empty.

### Part 2 — Reminders, vacation and optional checklists (deferred)

Separate chat: DailyCommit Part 2: reminders, vacation and optional checklists.
Thread ID: 01a14399-3f73-7351-8491-1c31b1f2fcbc. Scope recorded only; no implementation started.

- Optional reminder time per habit, aware of its schedule and compatible with the global reminder.
- Vacation start/end dates, for selected habits or all habits, preserving history and fair heatmap/streak calculations.
- Checklist steps available only when editing an existing habit; no mandatory checklist prompt during creation.

Timers, negative habits and stacks are not part of these tasks. Deployment, APK compilation, widget/phone testing and broad release testing wait until the end, as requested. Shared MySQL/PostgreSQL/Ollama services remain running per the user's choice.


## October 16 — Part 2 implemented

- Individual habit reminders: optional time in the habit editor; due-day, weekly quota, completion, skip and vacation filtering; coexist with the global reminder. Same-time notifications are combined to avoid duplicate alerts.
- Native reminders are a rolling batch of up to 31 logical days (400 pending slots on Android / 60 on iOS), refreshed on app activity and data changes. Web reminders explicitly require the app to be open. Native delivery is still awaiting the deferred phone checks.
- Vacation mode in Settings: inclusive start/end dates, all habits or selected habits, automatic resumption, cancel upcoming breaks, and end an active break early. Ending truncates the interval and preserves earlier paused dates. Existing check-ins and notes are retained. Completed work stays visible; paused incomplete work is excluded from missed totals. Full vacations pause streaks.
- Checklists: add/edit/remove/reorder steps only in the existing-habit editor. No checklist option or question is added to new-habit creation. Each date stores step IDs and partial progress. Historical revisions preserve earlier steps; group/whole-habit completion and Undo work with checklists too.
- Backup v4 includes checklists, individual reminders and vacations; v1–v3 imports remain supported. Existing IndexedDB stores need no structural migration for these added fields.
- Widget display snapshots use checklist targets and vacation-aware schedules; whole-habit quick check-ins complete the current checklist. No APK build or widget/device test was performed.

This supersedes the earlier deferred Part 2 scope. Deployment, APK compilation, native phone/widget tests and broader release QA remain postponed until the end.
