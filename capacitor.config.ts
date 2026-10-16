import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = { appId: 'app.dailycommit.mobile', appName: 'DailyCommit', webDir: 'dist', plugins: { SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DARK' } } };
export default config;
