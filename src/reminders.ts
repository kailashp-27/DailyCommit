import { themeFor } from './themes';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Snapshot } from './domain';
import { reminderPlan } from './reminderPlan';

const firstId = 44000, limit = Capacitor.getPlatform() === 'ios' ? 60 : 400, legacyId = 41001;
export const nativeReminders = () => Capacitor.isNativePlatform();
export async function allowReminders() {
  if (nativeReminders()) return (await LocalNotifications.requestPermissions()).display === 'granted';
  if (!('Notification' in window) || !window.isSecureContext) return false;
  return (await Notification.requestPermission()) === 'granted';
}
let queue: Promise<void> = Promise.resolve(), signature: string | undefined;
export function syncReminders(data: Snapshot, now = new Date()): Promise<void> {
  if (!nativeReminders()) return Promise.resolve();
  const plan = reminderPlan(data, now).slice(0, limit);
  const nextSignature = JSON.stringify([plan, data.settings.theme, data.settings.mode]);
  const work = async () => {
    if (signature === nextSignature) return;
    const pending = await LocalNotifications.getPending();
    const owned = pending.notifications.filter(n => n.id === legacyId || n.id >= firstId && n.id < firstId + limit).map(n => ({ id: n.id }));
    if (owned.length) await LocalNotifications.cancel({ notifications: owned });
    if (plan.length) {
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') throw new Error('Allow notifications in your phone settings to use reminders.');
      await LocalNotifications.createChannel({ id: 'dailycommit-reminders', name: 'Habit reminders', description: 'Scheduled habit check-ins', importance: 3, visibility: 0 });
      await LocalNotifications.schedule({ notifications: plan.map((item, index) => ({ id: firstId + index, title: item.title, body: item.body, channelId: 'dailycommit-reminders', smallIcon: 'ic_notification', iconColor: themeFor(data.settings.theme).accent[data.settings.mode ?? 'dark'], schedule: { at: item.at, allowWhileIdle: true }, isExactNotification: false, extra: { habitIds: item.habitIds, reminderKey: item.key } })) });
    }
    signature = nextSignature;
  };
  const result = queue.then(work); queue = result.catch(() => {}); return result;
}

// Browser reminders work only while the app is open. Each time slot is delivered once.
export function checkWebReminders(data: Snapshot, now = new Date()) {
  if (nativeReminders() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const due = reminderPlan(data, new Date(now.getTime() - 5 * 60_000), 1).filter(item => item.at <= now);
  for (const item of due) {
    const marker = `dailycommit-reminder:${item.key}`;
    try { if (localStorage.getItem(marker)) continue; localStorage.setItem(marker, 'sent'); } catch { continue; }
    const options = { body: item.body, icon: '/icon-192.png', tag: marker };
    const deliver = async () => {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (registration) await registration.showNotification(item.title, options); else new Notification(item.title, options);
    };
    void deliver().catch(() => { try { localStorage.removeItem(marker); } catch { /* Storage can be unavailable. */ } });
  }
}
