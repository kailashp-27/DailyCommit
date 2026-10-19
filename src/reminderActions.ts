import { daySummary, today, validDay, type Snapshot } from './domain';
export function reminderHabits(data: Snapshot, date: unknown, ids: unknown, now = new Date(), requireReminder = false): string[] {
  if (!validDay(date) || date !== today(data.settings.rolloverHour, now) || !Array.isArray(ids)) return [];
  const summary = daySummary(date, data), wanted = new Set(ids.filter((id): id is string => typeof id === 'string'));
  return summary.eligible.filter(h => wanted.has(h.id) && !summary.skipped.has(h.id) && !summary.completed.has(h.id) && (!requireReminder || data.settings.reminder?.enabled || h.reminder?.enabled)).map(h => h.id);
}
export function snoozeAt(data: Snapshot, date: string, now = new Date()): Date | null {
  const at = new Date(now.getTime() + 15 * 60_000);
  return today(data.settings.rolloverHour, at) === date ? at : null;
}
