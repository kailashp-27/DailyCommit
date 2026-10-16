import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Installs our versioned widget sources into the generated Capacitor Android project.
const root = resolve(import.meta.dirname, '..');
const base = join(root, 'android', 'app', 'src', 'main');
const manifestPath = join(base, 'AndroidManifest.xml');
let manifest;
try { manifest = await readFile(manifestPath, 'utf8'); } catch { throw new Error('Run npx cap add android first.'); }
const java = join(base, 'java', 'app', 'dailycommit', 'mobile');
for (const folder of await readdir(join(base, 'res'))) {
  if (folder.startsWith('mipmap-') && folder !== 'mipmap-anydpi-v26') {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) await copyFile(join(root, 'public', 'icon-512.png'), join(base, 'res', folder, name));
  }
}
await mkdir(java, { recursive: true });
for (const name of ['DailyCommitWidgetPlugin.java', 'DailyCommitWidgetProvider.java', 'WidgetActions.java']) await copyFile(join(root, 'native', 'android', name), join(java, name));
for (const [folder, name] of [['layout', 'dailycommit_widget.xml'], ['layout', 'widget_quick_row.xml'], ['drawable', 'widget_background.xml'], ['drawable', 'widget_background_light.xml'], ['drawable', 'dailycommit_foreground.xml'], ['drawable', 'dailycommit_monochrome.xml'], ['drawable', 'ic_notification.xml'], ['drawable', 'dailycommit_splash.xml'], ['values', 'styles.xml'], ['xml', 'dailycommit_widget_info.xml']]) {
  await mkdir(join(base, 'res', folder), { recursive: true });
  await copyFile(join(root, 'native', 'android', name), join(base, 'res', folder, name));
}
for (const [folder, template] of [['mipmap-anydpi-v26', 'ic_launcher.xml'], ['mipmap-anydpi-v33', 'ic_launcher_themed.xml']]) {
  await mkdir(join(base, 'res', folder), { recursive: true });
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) await copyFile(join(root, 'native', 'android', template), join(base, 'res', folder, name));
}
await writeFile(join(base, 'res', 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#0B0D12</color></resources>\n');
await writeFile(join(java, 'MainActivity.java'), `package app.dailycommit.mobile;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DailyCommitWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
manifest = manifest.replace(/\s*<receiver android:name="\.DailyCommitWidgetProvider"[\s\S]*?<\/receiver>/, '');
manifest = manifest.replace('</application>', `    <receiver android:name=".DailyCommitWidgetProvider" android:exported="false" android:label="DailyCommit">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.DATE_CHANGED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/dailycommit_widget_info" />
        </receiver>
    </application>`);
if (!manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED')) manifest = manifest.replace('<application', '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>\n    <application');
// Reminders deliberately use inexact alarms and do not require special access.
if (!manifest.includes('tools:node="remove"')) {
  manifest = manifest.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
  manifest = manifest.replace('<application', '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"/>\n    <application');
}
await writeFile(manifestPath, manifest);
const stringsPath = join(base, 'res', 'values', 'strings.xml');
let strings = await readFile(stringsPath, 'utf8');
if (!strings.includes('name="widget_description"')) { strings = strings.replace('</resources>', '    <string name="widget_description">Your habit contribution graph and daily progress</string>\n</resources>'); await writeFile(stringsPath, strings); }
console.log('DailyCommit widget installed into the Android project.');
