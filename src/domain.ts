import { themeFor, type AppTheme } from './themes';
import type { BadgeUnlock, BadgeEvent } from './badges';
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';

export type Day = string;
export type Schedule = { kind: 'daily' } | { kind: 'weekdays'; days: number[] } | { kind: 'weekly'; target: number };
export type ChecklistStep = { id: string; text: string };
export type Measurement = { kind: 'binary' } | { kind: 'numeric'; target: number; unit: string } | { kind: 'checklist'; items: ChecklistStep[] };
export type HabitReminder = { enabled: boolean; time: string };
export type Vacation = { id: string; from: Day; to: Day; habitIds: string[] | null };
export type Habit = { id: string; name: string; group?: string; icon: string; color: string; schedule: Schedule; measurement?: Measurement; reminder?: HabitReminder; createdAt: Day; archivedAt: Day | null; order: number; revisions: { from: Day; schedule: Schedule; measurement?: Measurement }[] };
export type Completion = { id: string; habitId: string; date: Day; value: number; checked?: string[]; completedAt: string; source?: 'widget' };
export type Skip = { id: string; habitId: string; date: Day };
export type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';
export type DayNote = { date: Day; text: string; mood: Mood | null; updatedAt: string };
export type Settings = { id: 'preferences'; collapsedTodayGroups?: string[]; collapsedHabitGroups?: string[]; vacations?: Vacation[]; specialDates?: string[]; badgeGlow?: boolean; groups?: string[]; rolloverHour: number; theme: AppTheme | 'mint' | 'mono'; mode?: 'dark' | 'light'; weekStart: 0 | 1; streakGrace?: 0 | 1; widgetMonths?: 3 | 6 | 12; reminder?: HabitReminder };
export type Snapshot = { habits: Habit[]; completions: Completion[]; skips: Skip[]; settings: Settings; notes?: DayNote[]; badges?: BadgeUnlock[]; badgeEvents?: BadgeEvent[] };
export const defaultGroups = ['Morning', 'Fitness', 'Study', 'Evening'];
export const groupsFor = (data: Snapshot) => [...new Set([...(data.settings.groups ?? defaultGroups), ...data.habits.flatMap(h => h.group ? [h.group] : [])])];
export const defaults: Settings = { id: 'preferences', groups: defaultGroups, rolloverHour: 0, theme: 'ember', mode: 'dark', weekStart: 1 };
export const key = (habitId: string, date: Day) => `${habitId}:${date}`;
export const dayString = (date: Date) => format(date, 'yyyy-MM-dd');
export function today(rolloverHour = 0, now = new Date()): Day {
  return dayString(now.getHours() < rolloverHour ? subDays(now, 1) : now);
}
export function dateRange(from: Day, to: Day): Day[] {
  const days: Day[] = [];
  for (let date = parseISO(from); dayString(date) <= to; date = addDays(date, 1)) days.push(dayString(date));
  return days;
}
export function scheduleOn(habit: Habit, date: Day): Schedule {
  for (let i = habit.revisions.length - 1; i >= 0; i--) if (habit.revisions[i].from <= date) return habit.revisions[i].schedule;
  return habit.schedule;
}
export function measurementOn(habit: Habit, date: Day): Measurement {
  for (let i = habit.revisions.length - 1; i >= 0; i--) if (habit.revisions[i].from <= date) return habit.revisions[i].measurement ?? habit.measurement ?? { kind: 'binary' };
  return habit.measurement ?? { kind: 'binary' };
}
type FactIndex = { completions: Completion[]; skips: Skip[]; count: number; skipCount: number; byDate: Map<Day, Completion[]>; byHabit: Map<string, Map<Day, Completion>>; skipsByDate: Map<Day, Skip[]> };
const factIndexes = new WeakMap<Snapshot, FactIndex>();
function facts(data: Snapshot): FactIndex {
  const existing = factIndexes.get(data);
  if (existing?.completions === data.completions && existing?.skips === data.skips && existing.count === data.completions.length && existing.skipCount === data.skips.length) return existing;
  const index: FactIndex = { completions: data.completions, skips: data.skips, count: data.completions.length, skipCount: data.skips.length, byDate: new Map(), byHabit: new Map(), skipsByDate: new Map() };
  for (const row of data.completions) {
    const dateRows = index.byDate.get(row.date) ?? []; dateRows.push(row); index.byDate.set(row.date, dateRows);
    const habitRows = index.byHabit.get(row.habitId) ?? new Map<Day, Completion>(); habitRows.set(row.date, row); index.byHabit.set(row.habitId, habitRows);
  }
  for (const row of data.skips) { const rows = index.skipsByDate.get(row.date) ?? []; rows.push(row); index.skipsByDate.set(row.date, rows); }
  factIndexes.set(data, index); return index;
}
export function progressFor(habit: Habit, date: Day, value: number): number {
  const measure = measurementOn(habit, date);
  return Math.min(1, Math.max(0, value) / targetFor(measure));
}
export const targetFor = (measure: Measurement) => measure.kind === 'numeric' ? measure.target : measure.kind === 'checklist' ? measure.items.length : 1;
export const isOnVacation = (habitId: string, date: Day, settings: Settings) => (settings.vacations ?? []).some(v => date >= v.from && date <= v.to && (v.habitIds === null || v.habitIds.includes(habitId)));
export function isScheduled(habit: Habit, date: Day, data: Snapshot): boolean {
  if (date < habit.createdAt || (habit.archivedAt && date >= habit.archivedAt)) return false;
  if (isOnVacation(habit.id, date, data.settings) && !facts(data).byHabit.get(habit.id)?.has(date)) return false;
  const schedule = scheduleOn(habit, date);
  if (schedule.kind === 'daily') return true;
  if (schedule.kind === 'weekdays') return schedule.days.includes(parseISO(date).getDay());
  const rows = facts(data).byHabit.get(habit.id);
  if (rows?.has(date)) return true;
  const start = dayString(startOfWeek(parseISO(date), { weekStartsOn: data.settings.weekStart }));
  const done = dateRange(start, dayString(subDays(parseISO(date), 1))).filter(day => {
    const row = rows?.get(day); return row !== undefined && progressFor(habit, day, row.value) >= 1;
  }).length;
  return done < schedule.target;
}
export function daySummary(date: Day, data: Snapshot) {
  const eligible = data.habits.filter(h => isScheduled(h, date, data)).sort((a, b) => a.order - b.order);
  const index = facts(data);
  const skipped = new Set((index.skipsByDate.get(date) ?? []).map(s => s.habitId));
  const values = new Map((index.byDate.get(date) ?? []).map(c => [c.habitId, c.value]));
  const completed = new Set(eligible.filter(h => progressFor(h, date, values.get(h.id) ?? 0) >= 1).map(h => h.id));
  const existing = data.habits.filter(h => h.createdAt <= date && (!h.archivedAt || date < h.archivedAt));
  const paused = new Set(existing.filter(h => isOnVacation(h.id, date, data.settings)).map(h => h.id));
  for (const id of paused) if (!completed.has(id)) skipped.add(id);
  const vacationDay = existing.length > 0 && existing.every(h => paused.has(h.id));
  const scheduled = eligible.filter(h => !skipped.has(h.id));
  const done = scheduled.filter(h => completed.has(h.id)).length;
  const progress = scheduled.reduce((sum, h) => sum + progressFor(h, date, values.get(h.id) ?? 0), 0);
  return { eligible, skipped, paused, vacationDay, completed, values, done, total: scheduled.length, ratio: scheduled.length ? progress / scheduled.length : null };
}
export function intensity(ratio: number | null) { return ratio === null ? -1 : ratio === 0 ? 0 : Math.ceil(ratio * 4); }
export function weeklyReview(data: Snapshot, from: Day, through: Day) {
  const dates = dateRange(from, through), days = dates.map(date => ({ date, ...daySummary(date, data) }));
  const previous = dates.map(date => daySummary(dayString(subDays(parseISO(date), 7)), data));
  const rate = (summaries: { done: number; total: number }[]) => {
    const total = summaries.reduce((n, day) => n + day.total, 0);
    return total ? summaries.reduce((n, day) => n + day.done, 0) / total * 100 : null;
  };
  const percent = rate(days), previousPercent = rate(previous);
  const strongest = days.filter(day => day.total > 0).sort((a, b) => b.done / b.total - a.done / a.total)[0];
  const missed = data.habits.map(habit => {
    const due = days.filter(day => day.eligible.some(h => h.id === habit.id) && !day.skipped.has(habit.id));
    const count = due.filter(day => !day.completed.has(habit.id)).length;
    return { habit, count, due: due.length, rate: due.length ? count / due.length : 0 };
  }).filter(habit => habit.count > 0).sort((a, b) => b.rate - a.rate || b.count - a.count || a.habit.order - b.habit.order)[0];
  return { percent, previousPercent, delta: percent !== null && previousPercent !== null ? percent - previousPercent : null, strongest, missed };
}
export const emberPalette = {
  dark: ['#1A1E28', '#4A2A17', '#8F4A1F', '#E27A2B', '#FFB65C'],
  light: ['#EFE9E1', '#FBD9B8', '#F5A663', '#E8721C', '#B8470A'],
};
export const getPalette = (settings: Settings) => [...themeFor(settings.theme)[settings.mode ?? 'dark']];
export function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime()) && dayString(parseISO(value)) === value;
}

// A streak counts fully completed scheduled days. Rest days pause it. Optional
// grace preserves it across one missed day in any seven calendar days.
export function streaks(data: Snapshot, through = today(data.settings.rolloverHour)) {
  const first = data.habits.reduce((min, h) => h.createdAt < min ? h.createdAt : min, through);
  let current = 0, best = 0, lastMiss: Day | null = null, graceUsed = false;
  for (const date of dateRange(first, through)) {
    const summary = daySummary(date, data);
    if (summary.vacationDay) continue;
    if (!summary.total) continue;
    if (summary.done === summary.total) { current++; best = Math.max(best, current); continue; }
    if (date === through) continue; // Today can still be completed.
    if (data.settings.streakGrace === 1 && current > 0 && (!lastMiss || date >= dayString(addDays(parseISO(lastMiss), 7)))) {
      lastMiss = date; graceUsed = true;
    } else { current = 0; lastMiss = date; graceUsed = false; }
  }
  return { current, best, graceUsed, milestones: [7, 30, 100, 365].filter(n => best >= n), next: [7, 30, 100, 365].find(n => current < n) ?? null };
}
