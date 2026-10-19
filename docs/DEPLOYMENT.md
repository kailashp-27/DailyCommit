# DailyCommit deployment

Updated October 19, 2026.

- PWA: https://dailycommit-kailashp27.netlify.app/
- Testing APK: https://dailycommit-kailashp27.netlify.app/downloads/DailyCommit-0.1.2-debug.apk
- Netlify project: https://app.netlify.com/projects/dailycommit-kailashp27/overview
- Netlify project ID: 9aab91ae-45ca-477a-9adc-d61665504642
- GitHub: https://github.com/kailashp-27/DailyCommit
- Verified code build: https://github.com/kailashp-27/DailyCommit/actions/runs/39247440581
- APK source commit: bfd961984ca78b378208dff2630098da219e6f4c
- APK SHA-256: e2ff244b7d537fe95a1eb320bbb900dd5f3bffd9ed63c10e30a98e8a571e4db4

## Hosting and updates

The verified production build was uploaded directly through Netlify Drop under the owner's existing account. The GitHub connection currently exposes StrideLog only; DailyCommit was not granted additional repository permissions. Consequently, a GitHub push does not automatically update this Netlify site.

For a future manual deployment, run `npm run build`, place the current testing APK at `dist/downloads/DailyCommit-0.1.2-debug.apk` if retaining that download link, then upload a ZIP containing the contents of dist (index.html at the ZIP root) to this existing project's overview. Do not create a new Netlify project or change the published domain for routine updates: browser data is scoped to its origin. Public `_headers` and `_redirects` files are copied by Vite; netlify.toml also prepares the same configuration for a future repository-linked build. Keep signing keys and generated release packages outside Git.

The current local packages are in the ignored releases/ folder. The APK is a debug build intended for owner-performed final testing, not a signed production release. No paid plan, custom domain purchase, Play Store publication or repository access expansion was performed. The owner approved disabling the overlapping Powered by Netlify badge.

## Verification and moving data

The live PWA rendered at a 390×844 viewport without horizontal overflow or an overlapping hosting badge. No browser warning/error logs were recorded in that check. The HTTPS manifest responds with application/manifest+json, the service worker responds with no-cache, and the APK download responds with the Android package MIME type. Downloaded APK bytes match the verified artifact's SHA-256 above.

Hosting does not upload local habit data. The production domain starts with a new browser database. Export a backup from the previous local app and import it into the production app to move habits. The Android app also has separate device-local storage; use backup export/import to transfer records between web and APK. See ANDROID.md for manual widget/reminder and offline checks.


## Version 0.1.1

Fixes the Android status-bar overlap, draws visible gray empty widget cells, and uses a padded adaptive heatmap icon with Android 13+ monochrome support. Updated PWA and APK were published to the same existing Netlify project. The original 0.1.0 APK link is retained for reference; the latest debug APK is also available at /downloads/DailyCommit-latest-debug.apk. The APK bytes from the public 0.1.1 URL match the successful CI artifact.

Existing PWA users may need to accept Update ready → Refresh. For the Android update, export a backup first. CI debug builds may be signed with different ephemeral development keys; Android can reject an in-place upgrade. Do not uninstall an existing copy without preserving its local data in an exported backup. App data, history and awards have no intentional migration/reset in this fix.

## Version 0.1.2

Published October 19 on the same domain, Netlify deploy `6ad606616e5d7924dcbccc63`. Adds habit details, notification Done/Snooze actions (which open the app), collapsible groups, habit search/filter, revised Hello World/Clean Working Tree rules and full-range responsive widget strips. All 53 web tests, the web/PWA build, Android debug APK compilation, Android unit tests and lint passed in the linked GitHub run. Public APK bytes match the CI artifact. `/downloads/DailyCommit-latest-debug.apk` now serves 0.1.2; original 0.1.0 and 0.1.1 URLs are retained. Phone resize/orientation and notification delivery remain owner-performed checks. The PWA showed Update ready, and Refresh loaded the new controls without warning/error logs. Screenshot: `preview-live-012.png`.
