import { reminderHabits, snoozeAt } from './reminderActions';
import { repository } from './repository';
import { readDeviceData } from './widget';
import type { ActionPerformed } from '@capacitor/local-notifications';
import { themeFor } from './themes';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { today, type Snapshot } from './domain';
import { reminderPlan } from './reminderPlan';

const firstSnooze = 45000, lastSnooze = 45999;
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
  const day = today(data.settings.rolloverHour, now);
  const nextSignature = JSON.stringify([plan, data.settings.theme, data.settings.mode, day,
    data.completions.filter(c => c.date === day), data.skips.filter(s => s.date === day),
    data.settings.vacations, data.settings.reminder, data.habits.map(h => [h.id, h.archivedAt, h.reminder]),
  ]);
  const work = async () => {
    if (signature === nextSignature) return;
    await LocalNotifications.registerActionTypes({ types: [
      { id: 'dailycommit-habit', actions: [{ id: 'done', title: 'Mark done', foreground: true }, { id: 'snooze', title: 'Snooze 15 min', foreground: true }] },
      { id: 'dailycommit-group', actions: [{ id: 'done', title: 'Mark all done', foreground: true }, { id: 'snooze', title: 'Snooze 15 min', foreground: true }] },
    ] });
    const pending = await LocalNotifications.getPending();
    const owned = pending.notifications.filter(n => n.id === legacyId || n.id >= firstId && n.id < firstId + limit || n.id >= firstSnooze && n.id <= lastSnooze && !reminderHabits(data, n.extra?.date, n.extra?.habitIds, now, true).length).map(n => ({ id: n.id }));
    if (owned.length) await LocalNotifications.cancel({ notifications: owned });
    if (plan.length) {
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') throw new Error('Allow notifications in your phone settings to use reminders.');
      await LocalNotifications.createChannel({ id: 'dailycommit-reminders', name: 'Habit reminders', description: 'Scheduled habit check-ins', importance: 3, visibility: 0 });
      await LocalNotifications.schedule({ notifications: plan.map((item, index) => ({ id: firstId + index, actionTypeId: item.habitIds.length > 1 ? 'dailycommit-group' : 'dailycommit-habit', title: item.title, body: item.body, channelId: 'dailycommit-reminders', smallIcon: 'ic_notification', iconColor: themeFor(data.settings.theme).accent[data.settings.mode ?? 'dark'], schedule: { at: item.at, allowWhileIdle: true }, isExactNotification: false, extra: { date: item.key.slice(0, 10), habitIds: item.habitIds, reminderKey: item.key } })) });
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


export function watchReminderActions(onMessage: (message: string) => void, onChanged: () => Promise<void>): () => void {
  if (!nativeReminders()) return () => {};
  let stopped = false, remove: (() => Promise<void>) | undefined;
  void LocalNotifications.addListener('localNotificationActionPerformed', action => {
    if (action.actionId !== 'done' && action.actionId !== 'snooze') return;
    const result = queue.then(async () => {
      const message = await performReminderAction(action);
      signature = undefined;
      await onChanged(); if (!stopped) onMessage(message);
    });
    queue = result.catch(error => { if (!stopped) onMessage(error instanceof Error ? error.message : 'Could not apply reminder action.'); });
  }).then(handle => { if (stopped) void handle.remove(); else remove = () => handle.remove(); }).catch(() => onMessage('Could not enable notification actions. Reopen the app to retry.'));
  return () => { stopped = true; if (remove) void remove(); };
}
async function performReminderAction({ actionId, notification }: ActionPerformed): Promise<string> {
  const data = await readDeviceData(), now = new Date(), extra = notification.extra ?? {};
  const date = extra.date ?? String(extra.reminderKey ?? '').slice(0, 10);
  const ids = reminderHabits(data, date, extra.habitIds, now, actionId === 'snooze');
  if (!ids.length) return 'Nothing due for this reminder.';
  if (actionId === 'done') {
    await repository.completeGroup(ids, date);
    return ids.length === 1 ? 'Habit completed from reminder.' : 'Reminder habits completed.';
  }
  const at = snoozeAt(data, date, now);
  if (!at) return 'Snooze would cross your day boundary. Choose a new reminder instead.';
  const pending = await LocalNotifications.getPending();
  const existing = pending.notifications.find(n => n.id >= firstSnooze && n.id <= lastSnooze && n.extra?.reminderKey === extra.reminderKey);
  const occupied = new Set(pending.notifications.map(n => n.id));
  const id = existing?.id ?? Array.from({ length: lastSnooze - firstSnooze + 1 }, (_, i) => i + firstSnooze).find(value => !occupied.has(value));
  if (id === undefined) throw new Error('Too many snoozed reminders. Clear one before trying again.');
  await LocalNotifications.schedule({ notifications: [{ id, title: notification.title || 'DailyCommit', body: notification.body || 'Time for your habits.', actionTypeId: ids.length > 1 ? 'dailycommit-group' : 'dailycommit-habit', channelId: 'dailycommit-reminders', smallIcon: 'ic_notification', iconColor: themeFor(data.settings.theme).accent[data.settings.mode ?? 'dark'], schedule: { at, allowWhileIdle: true }, extra: { ...extra, date, habitIds: ids, snoozed: true } }] });
  return 'Reminder snoozed for 15 minutes.';
}
