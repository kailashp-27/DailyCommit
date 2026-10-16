import { themeFor } from './themes';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { addDays, subDays, parseISO, startOfWeek } from 'date-fns';
import { dateRange, dayString, daySummary, intensity, getPalette, measurementOn, targetFor, progressFor, scheduleOn, today, type Snapshot } from './domain';
import { repository, type WidgetAction } from './repository';
type QuickTask = { habitId: string; target: number; value: number; weekStart?: string; remaining?: number };
export type WidgetSnapshot = { version: 1; updatedAt: string; today: string; rolloverHour: number; done: number; total: number; theme: string; accent: string; mode: 'dark' | 'light'; colors: string[]; days: { date: string; level: number }[]; history: { date: string; level: number; done: number; total: number }[]; upcoming: { date: string; level: number; done: number; total: number }[]; months: 3 | 6 | 12; quickHabits: { id: string; name: string }[]; quickDays: { date: string; tasks: QuickTask[] }[] };
const bridge = registerPlugin<{ publish(options: { snapshot: string }): Promise<void>; pin(): Promise<{ supported: boolean }>; pending(): Promise<{ actions: WidgetAction[] }>; acknowledge(options: { ids: string; snapshot: string }): Promise<void> }>('DailyCommitWidget');
export function createWidgetSnapshot(data: Snapshot): WidgetSnapshot {
  const current = today(data.settings.rolloverHour);
  const summary = daySummary(current, data);
  const history = dateRange(dayString(subDays(parseISO(current), 363)), current).map(date => { const day = daySummary(date, data); return { date, level: intensity(day.ratio), done: day.done, total: day.total }; });
  // Derived future schedules let native widgets advance local dates without a
  // second editable database or launching the WebView. Rebuilt after every edit.
  const upcoming = dateRange(dayString(addDays(parseISO(current), 1)), dayString(addDays(parseISO(current), 366))).map(date => { const day = daySummary(date, data); return { date, level: intensity(day.ratio), done: day.done, total: day.total }; });
  const quickDays = dateRange(current, dayString(addDays(parseISO(current), 31))).map(date => {
    const day = daySummary(date, data);
    const tasks = day.eligible.filter(h => !day.skipped.has(h.id)).map(h => {
      const measure = measurementOn(h, date), schedule = scheduleOn(h, date);
      const task: QuickTask = { habitId: h.id, target: targetFor(measure), value: day.values.get(h.id) ?? 0 };
      if (schedule.kind === 'weekly') {
        task.weekStart = dayString(startOfWeek(parseISO(date), { weekStartsOn: data.settings.weekStart }));
        task.remaining = schedule.target - data.completions.filter(c => c.habitId === h.id && c.date >= task.weekStart! && c.date < date && progressFor(h, c.date, c.value) >= 1).length;
      }
      return task;
    });
    return { date, tasks };
  });
  return { version: 1, updatedAt: new Date().toISOString(), today: current, rolloverHour: data.settings.rolloverHour, done: summary.done, total: summary.total, theme: data.settings.theme, accent: themeFor(data.settings.theme).accent[data.settings.mode ?? 'dark'], mode: data.settings.mode ?? 'dark', colors: getPalette(data.settings), days: history.slice(-182), history, upcoming, months: data.settings.widgetMonths ?? 6, quickHabits: data.habits.map(h => ({ id: h.id, name: h.name })), quickDays };
}
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export async function publishWidget(data: Snapshot) { if (isAndroid()) await bridge.publish({ snapshot: JSON.stringify(createWidgetSnapshot(data)) }); }
export async function pinWidget() { return isAndroid() ? bridge.pin() : { supported: false }; }
let syncing: Promise<Snapshot> | null = null;
export async function readDeviceData(): Promise<Snapshot> {
  if (!isAndroid()) return repository.read();
  if (syncing) return syncing;
  syncing = (async () => {
    const { actions } = await bridge.pending();
    if (actions.length) await repository.applyWidgetActions(actions);
    const data = await repository.read();
    if (actions.length) await bridge.acknowledge({ ids: JSON.stringify(actions.map(action => action.id)), snapshot: JSON.stringify(createWidgetSnapshot(data)) });
    return data;
  })();
  try { return await syncing; } finally { syncing = null; }
}
