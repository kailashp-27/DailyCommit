import { addDays, parseISO } from 'date-fns';
import { dateRange, dayString, daySummary, today, type Snapshot } from './domain';

export type PlannedReminder = { key: string; at: Date; title: string; body: string; habitIds: string[] };
export function reminderPlan(data: Snapshot, after = new Date(), days = 30): PlannedReminder[] {
  const from = today(data.settings.rolloverHour, after), to = dayString(addDays(parseISO(from), days));
  const planned: PlannedReminder[] = [];
  for (const date of dateRange(from, to)) {
    const summary = daySummary(date, data);
    const due = summary.eligible.filter(h => !summary.skipped.has(h.id) && !summary.completed.has(h.id));
    if (!due.length) continue;
    const slots = new Map<string, { names: string[]; ids: string[]; global: boolean }>();
    const add = (time: string, names: string[], ids: string[], global: boolean) => {
      const slot = slots.get(time) ?? { names: [], ids: [], global: false };
      slot.names = [...new Set([...slot.names, ...names])]; slot.ids = [...new Set([...slot.ids, ...ids])]; slot.global ||= global; slots.set(time, slot);
    };
    for (const h of due) if (h.reminder?.enabled) add(h.reminder.time, [h.name], [h.id], false);
    if (data.settings.reminder?.enabled) add(data.settings.reminder.time, due.map(h => h.name), due.map(h => h.id), true);
    for (const [time, slot] of slots) {
      const [hour, minute] = time.split(':').map(Number);
      let at = parseISO(date); if (hour < data.settings.rolloverHour) at = addDays(at, 1);
      at.setHours(hour, minute, 0, 0);
      if (at <= after) continue;
      const body = slot.names.join(' · ');
      planned.push({ key: `${date}@${time}`, at, habitIds: slot.ids, title: slot.global || slot.names.length > 1 ? 'DailyCommit' : slot.names[0], body: slot.global ? `Time for your habits: ${body}`.slice(0, 220) : body === slot.names[0] && slot.names.length === 1 ? 'Time for your check-in.' : body.slice(0, 220) });
    }
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime());
}
