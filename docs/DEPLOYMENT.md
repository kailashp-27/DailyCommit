# DailyCommit deployment

Published October 16, 2026.

- PWA: https://dailycommit-kailashp27.netlify.app/
- Testing APK: https://dailycommit-kailashp27.netlify.app/downloads/DailyCommit-0.1.0-debug.apk
- Netlify project: https://app.netlify.com/projects/dailycommit-kailashp27/overview
- Netlify project ID: 9aab91ae-45ca-477a-9adc-d61665504642
- GitHub: https://github.com/kailashp-27/DailyCommit
- Verified code build: https://github.com/kailashp-27/DailyCommit/actions/runs/38907872075
- APK source commit: 778d80a41c83fe08c70a7b423531858c67ed48d2
- APK SHA-256: 629a57e8fb726eeed12f8a7a3726c8d324f4e16e6ae2a8059dfb9282a2f556c1

## Hosting and updates

The verified production build was uploaded directly through Netlify Drop under the owner's existing account. The GitHub connection currently exposes StrideLog only; DailyCommit was not granted additional repository permissions. Consequently, a GitHub push does not automatically update this Netlify site.

For a future manual deployment, run `npm run build`, place the current testing APK at `dist/downloads/DailyCommit-0.1.0-debug.apk` if retaining that download link, then upload a ZIP containing the contents of dist (index.html at the ZIP root) to this existing project's overview. Do not create a new Netlify project or change the published domain for routine updates: browser data is scoped to its origin. Public `_headers` and `_redirects` files are copied by Vite; netlify.toml also prepares the same configuration for a future repository-linked build. Keep signing keys and generated release packages outside Git.

The current local packages are in the ignored releases/ folder. The APK is a debug build intended for owner-performed final testing, not a signed production release. No paid plan, custom domain purchase, Play Store publication or repository access expansion was performed. The owner approved disabling the overlapping Powered by Netlify badge.

## Verification and moving data

The live PWA rendered at a 390×844 viewport without horizontal overflow or an overlapping hosting badge. No browser warning/error logs were recorded in that check. The HTTPS manifest responds with application/manifest+json, the service worker responds with no-cache, and the APK download responds with the Android package MIME type. Downloaded APK bytes match the verified artifact's SHA-256 above.

Hosting does not upload local habit data. The production domain starts with a new browser database. Export a backup from the previous local app and import it into the production app to move habits. The Android app also has separate device-local storage; use backup export/import to transfer records between web and APK. See ANDROID.md for manual widget/reminder and offline checks.
