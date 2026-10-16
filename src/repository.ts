import { themeFor, unlockedTheme } from './themes';
import { addDays, parseISO } from 'date-fns';
import { badgeIds, deriveBadges, type BadgeUnlock, type BadgeEvent } from './badges';
import Dexie, { type Table } from 'dexie';
import { defaults, dayString, daySummary, groupsFor, key, measurementOn, progressFor, targetFor, today, validDay, type Completion, type DayNote, type Habit, type Measurement, type Schedule, type Settings, type Skip, type Snapshot, type Vacation } from './domain';

export type WidgetAction = { id: string; habitId: string; date: string; value: number; completedAt?: string };
export type GroupAction = { kind: 'create'; name: string } | { kind: 'rename'; name: string; next: string } | { kind: 'move'; name: string; direction: -1 | 1 } | { kind: 'remove'; name: string; destination: string };
export type GroupUndo = { groups: string[]; members: { id: string; group?: string }[] };

class Database extends Dexie {
  habits!: Table<Habit, string>;
  completions!: Table<Completion, string>;
  skips!: Table<Skip, string>;
  settings!: Table<Settings, string>;
  notes!: Table<DayNote, string>;
  badges!: Table<BadgeUnlock, string>;
  badgeEvents!: Table<BadgeEvent, string>;
  widgetActions!: Table<{ id: string; date: string }, string>;
  constructor() {
    super('dailycommit');
    this.version(1).stores({ habits: 'id,order,createdAt,archivedAt', completions: 'id,habitId,date,[habitId+date]', skips: 'id,habitId,date', settings: 'id' });
    this.version(2).stores({ habits: 'id,order,createdAt,archivedAt', completions: 'id,habitId,date,[habitId+date]', skips: 'id,habitId,date', settings: 'id', notes: 'date' });
    this.version(3).stores({ widgetActions: 'id,date' });
    this.version(4).stores({ badges: 'id,date', badgeEvents: 'id,date' });
  }
}
export const db = new Database();
export const repository = {
  async read(): Promise<Snapshot> {
    return db.transaction('r', [db.habits, db.completions, db.skips, db.settings, db.notes, db.badges, db.badgeEvents], async () => {
      const [habits, completions, skips, settings, notes, badges, badgeEvents] = await Promise.all([db.habits.toArray(), db.completions.toArray(), db.skips.toArray(), db.settings.get('preferences'), db.notes.toArray(), db.badges.toArray(), db.badgeEvents.toArray()]);
      return { habits, completions, skips, notes, badges, badgeEvents, settings: settings ? { ...settings, theme: unlockedTheme(settings.theme, badges), mode: settings.mode ?? 'dark' } : defaults };
    });
  },
  async award(id: string, date: string): Promise<BadgeUnlock[]> {
    if (!badgeIds.has(id) || !validDay(date)) return [];
    return db.transaction('rw', db.badges, async () => {
      if (await db.badges.get(id)) return [];
      const badge = { id, date }; await db.badges.add(badge); return [badge];
    });
  },
  async awardEarned(through: string): Promise<BadgeUnlock[]> {
    return db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.notes, db.badges, db.badgeEvents], async () => {
      const data = await repository.read(), existing = new Set(data.badges?.map(b => b.id));
      const fresh = deriveBadges(data, through).filter(b => !existing.has(b.id));
      if (fresh.length) await db.badges.bulkAdd(fresh);
      return fresh;
    });
  },
  async saveHabit(habit: Habit) {
    await db.transaction('rw', db.habits, db.completions, db.settings, async () => {
      const original = await db.habits.get(habit.id);
      if (habit.measurement && !validMeasurement(habit.measurement)) throw new Error('Add between 1 and 30 named checklist steps, or a valid target.');
      if (habit.reminder && !validReminder(habit.reminder)) throw new Error('Choose a valid reminder time.');
      if (habit.group) {
        const settings = await db.settings.get('preferences') ?? defaults;
        const groups = groupsFor({ habits: [], completions: [], skips: [], settings });
        const canonical = groups.find(group => group.toLowerCase() === habit.group!.toLowerCase());
        habit = { ...habit, group: canonical ?? habit.group };
        if (!canonical) await db.settings.put({ ...settings, groups: [...groups, habit.group!] });
      }
      await db.habits.put(habit);
      // Number → check-in edits keep recorded check-ins valid in the new shape.
      const rows = await db.completions.where('habitId').equals(habit.id).toArray();
      for (const row of rows) {
        const measure = measurementOn(habit, row.date), old = original ? measurementOn(original, row.date) : measure;
        if (measure.kind === 'checklist') {
          const oldIds = old.kind === 'checklist' ? row.checked ?? old.items.slice(0, row.value).map(step => step.id) : [];
          const checked = old.kind === 'checklist' ? measure.items.filter(step => oldIds.includes(step.id)).map(step => step.id) : original && progressFor(original, row.date, row.value) >= 1 ? measure.items.map(step => step.id) : [];
          if (checked.length) await db.completions.put({ ...row, checked, value: checked.length }); else await db.completions.delete(row.id);
        } else if (old.kind === 'checklist') {
          if (original && progressFor(original, row.date, row.value) >= 1) await db.completions.put({ ...row, checked: undefined, value: targetFor(measure) }); else await db.completions.delete(row.id);
        } else if (row.value !== 1 && measure.kind === 'binary') await db.completions.put({ ...row, value: 1 });
      }
    });
  },
  async reorder(habits: Habit[]) { await db.habits.bulkPut(habits.map((h, order) => ({ ...h, order }))); },
  async manageGroup(action: GroupAction): Promise<GroupUndo> {
    return db.transaction('rw', db.habits, db.settings, async () => {
      const settings = await db.settings.get('preferences') ?? defaults, habits = await db.habits.toArray();
      const groups = groupsFor({ habits, completions: [], skips: [], settings });
      const undo: GroupUndo = { groups: [...groups], members: [] };
      const name = action.name.trim(), index = groups.indexOf(name);
      if (!name || name.length > 40) throw new Error('Use a group name between 1 and 40 characters.');
      if (action.kind !== 'create' && index < 0) throw new Error('This group no longer exists.');
      if (action.kind === 'create' || action.kind === 'rename') {
        const next = action.kind === 'create' ? name : action.next.trim();
        if (!next || next.length > 40) throw new Error('Use a group name between 1 and 40 characters.');
        if (groups.some((g, i) => g.toLowerCase() === next.toLowerCase() && (action.kind === 'create' || i !== index))) throw new Error('This group already exists.');
        if (action.kind === 'create') groups.push(next);
        else {
          groups[index] = next;
          const members = habits.filter(h => h.group === name);
          undo.members = members.map(h => ({ id: h.id, group: h.group }));
          await db.habits.bulkPut(members.map(h => ({ ...h, group: next })));
        }
      } else if (action.kind === 'move') {
        const next = index + action.direction;
        if (next >= 0 && next < groups.length) [groups[index], groups[next]] = [groups[next], groups[index]];
      } else {
        if (action.destination === name || (action.destination && !groups.includes(action.destination))) throw new Error('Choose another group or Ungrouped.');
        const members = habits.filter(h => h.group === name);
        undo.members = members.map(h => ({ id: h.id, group: h.group }));
        await db.habits.bulkPut(members.map(h => ({ ...h, group: action.destination || undefined })));
        groups.splice(index, 1);
      }
      await db.settings.put({ ...settings, groups });
      return undo;
    });
  },
  async undoGroup(change: GroupUndo) {
    await db.transaction('rw', db.habits, db.settings, async () => {
      const settings = await db.settings.get('preferences') ?? defaults;
      await db.settings.put({ ...settings, groups: change.groups });
      for (const member of change.members) await db.habits.update(member.id, { group: member.group });
    });
  },
  async completeGroup(habitIds: string[], date: string) {
    return db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.notes, db.badges, db.badgeEvents], async () => {
      const data = await repository.read(), summary = daySummary(date, data);
      if (!validDay(date)) throw new Error('Invalid date.');
      const changed = summary.eligible.filter(h => habitIds.includes(h.id) && !summary.skipped.has(h.id) && !summary.completed.has(h.id));
      const ids = changed.map(h => key(h.id, date)), rows = data.completions.filter(c => ids.includes(c.id));
      for (const habit of changed) {
        const measure = measurementOn(habit, date);
        await db.completions.put({ id: key(habit.id, date), habitId: habit.id, date, value: targetFor(measure), ...(measure.kind === 'checklist' ? { checked: measure.items.map(step => step.id) } : {}), completedAt: new Date().toISOString() });
      }
      return { ids, rows };
    });
  },
  async restoreCheckIns(ids: string[], rows: Completion[]) {
    await db.transaction('rw', [db.completions, db.habits, db.settings, db.badgeEvents], async () => {
      for (const id of ids) { const old = await db.completions.get(id); if (old) await recordUndo(old, rows.find(r => r.id === id)?.value ?? 0); }
      await db.completions.bulkDelete(ids); await db.completions.bulkPut(rows);
    });
  },
  async applyWidgetActions(actions: WidgetAction[]) {
    await db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.notes, db.widgetActions, db.badges, db.badgeEvents], async () => {
      for (const action of actions) {
        if (!action.id || !validDay(action.date) || !Number.isFinite(action.value) || action.value <= 0 || action.value > 1_000_000 || await db.widgetActions.get(action.id)) continue;
        const data = await repository.read(), summary = daySummary(action.date, data);
        const habit = summary.eligible.find(h => h.id === action.habitId);
        if (habit && !summary.skipped.has(habit.id)) {
          const measure = measurementOn(habit, action.date), value = Math.max(summary.values.get(habit.id) ?? 0, measure.kind === 'numeric' ? action.value : targetFor(measure));
          const knownTime = typeof action.completedAt === 'string' && Number.isFinite(Date.parse(action.completedAt)) && Date.parse(action.completedAt) <= Date.now();
          await db.completions.put({ id: key(habit.id, action.date), habitId: habit.id, date: action.date, value, ...(measure.kind === 'checklist' ? { checked: measure.items.map(step => step.id) } : {}), ...(knownTime ? {} : { source: 'widget' as const }), completedAt: knownTime ? action.completedAt! : new Date().toISOString() });
        }
        await db.widgetActions.put({ id: action.id, date: action.date });
      }
    });
  },
  async setDay(habitId: string, date: string, state: 'done' | 'skip' | 'open') {
    await db.transaction('rw', db.habits, db.completions, db.skips, db.settings, db.badgeEvents, async () => {
      const habit = await db.habits.get(habitId);
      if (!habit || !validDay(date)) throw new Error('Habit or date is invalid.');
      const old = await db.completions.get(key(habitId, date));
      if (old && state !== 'done') await recordUndo(old, 0);
      await db.completions.delete(key(habitId, date));
      await db.skips.delete(key(habitId, date));
      const measure = measurementOn(habit, date);
      if (state === 'done') await db.completions.put({ id: key(habitId, date), habitId, date, value: targetFor(measure), ...(measure.kind === 'checklist' ? { checked: measure.items.map(step => step.id) } : {}), completedAt: new Date().toISOString() });
      if (state === 'skip') await db.skips.put({ id: key(habitId, date), habitId, date });
    });
  },
  async setValue(habitId: string, date: string, value: number) {
    await db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.badgeEvents], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit || !validDay(date) || !Number.isFinite(value) || value < 0 || value > 1_000_000) throw new Error('Enter a value between 0 and 1,000,000.');
      const measure = measurementOn(habit, date);
      if (measure.kind === 'checklist') throw new Error('Use the checklist steps to update this habit.');
      if (measure.kind === 'binary' && value !== 0 && value !== 1) throw new Error('This habit uses a check-in.');
      await db.skips.delete(key(habitId, date));
      const old = await db.completions.get(key(habitId, date));
      if (old) await recordUndo(old, value);
      if (!value) await db.completions.delete(key(habitId, date));
      else await db.completions.put({ id: key(habitId, date), habitId, date, value, completedAt: new Date().toISOString() });
    });
  },
  async setChecklist(habitId: string, date: string, stepId: string, checked: boolean) {
    await db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.badgeEvents], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit || !validDay(date)) throw new Error('Habit or date is invalid.');
      const measure = measurementOn(habit, date);
      if (measure.kind !== 'checklist' || !measure.items.some(step => step.id === stepId)) throw new Error('This checklist step no longer exists.');
      const id = key(habitId, date), old = await db.completions.get(id), ids = new Set(old?.checked ?? []);
      if (checked) ids.add(stepId); else ids.delete(stepId);
      const selected = measure.items.filter(step => ids.has(step.id)).map(step => step.id);
      if (old) await recordUndo(old, selected.length);
      await db.skips.delete(id);
      if (selected.length) await db.completions.put({ id, habitId, date, value: selected.length, checked: selected, completedAt: new Date().toISOString() }); else await db.completions.delete(id);
    });
  },
  async addVacation(vacation: Vacation) {
    await db.transaction('rw', db.settings, db.habits, async () => {
      const settings = await db.settings.get('preferences') ?? defaults;
      if (!vacation.id || !validDay(vacation.from) || !validDay(vacation.to) || vacation.from > vacation.to || vacation.from < today(settings.rolloverHour)) throw new Error('Choose a vacation starting today or later.');
      if (vacation.habitIds !== null && (!vacation.habitIds.length || new Set(vacation.habitIds).size !== vacation.habitIds.length || (await db.habits.bulkGet(vacation.habitIds)).some(h => !h))) throw new Error('Choose the habits to pause.');
      const vacations = settings.vacations ?? [];
      if (vacations.some(v => v.id === vacation.id)) throw new Error('This vacation already exists.');
      await db.settings.put({ ...settings, vacations: [...vacations, vacation] });
    });
  },
  async endVacation(id: string) {
    await db.transaction('rw', db.settings, async () => {
      const settings = await db.settings.get('preferences') ?? defaults, current = today(settings.rolloverHour);
      const through = dayString(addDays(parseISO(current), -1));
      await db.settings.put({ ...settings, vacations: (settings.vacations ?? []).flatMap(v => v.id !== id || v.to < current ? [v] : v.from >= current ? [] : [{ ...v, to: through }]) });
    });
  },
  async saveNote(note: DayNote) {
    if (!validDay(note.date) || note.text.length > 2000) throw new Error('Note is invalid.');
    if (!note.text.trim() && !note.mood) await db.notes.delete(note.date);
    else await db.notes.put(note);
  },
  async saveSettings(settings: Settings) {
    await db.transaction('rw', [db.settings, db.badges], async () => {
      const theme = unlockedTheme(settings.theme, await db.badges.toArray());
      if (theme !== themeFor(settings.theme).id) throw new Error('Earn the color badge to unlock this theme.');
      await db.settings.put({ ...settings, theme });
    });
  },
  async restore(data: Snapshot) {
    await db.transaction('rw', [db.habits, db.completions, db.skips, db.settings, db.notes, db.badges, db.badgeEvents], async () => {
      await Promise.all([db.habits.clear(), db.completions.clear(), db.skips.clear(), db.settings.clear(), db.notes.clear()]);
      await db.habits.bulkPut(data.habits); await db.completions.bulkPut(data.completions);
      await db.skips.bulkPut(data.skips); await db.settings.put(data.settings); await db.notes.bulkPut(data.notes ?? []);
      // Awards are permanent, including when an older backup is restored.
      for (const badge of data.badges ?? []) if (!await db.badges.get(badge.id)) await db.badges.add(badge);
      await db.badgeEvents.bulkPut(data.badgeEvents ?? []);
    });
  },
};
async function recordUndo(row: Completion, newValue: number) {
  const habit = await db.habits.get(row.habitId);
  if (!habit || progressFor(habit, row.date, row.value) < 1 || progressFor(habit, row.date, newValue) >= 1) return;
  const settings = await db.settings.get('preferences') ?? defaults;
  await db.badgeEvents.add({ id: crypto.randomUUID(), date: today(settings.rolloverHour), kind: 'undo' });
}
export function validSchedule(value: unknown): value is Schedule {
  if (!value || typeof value !== 'object') return false;
  const s = value as Schedule;
  return s.kind === 'daily' || (s.kind === 'weekdays' && Array.isArray(s.days) && s.days.length > 0 && new Set(s.days).size === s.days.length && s.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) || (s.kind === 'weekly' && Number.isInteger(s.target) && s.target >= 1 && s.target <= 7);
}
export const validReminder = (value: unknown): value is { enabled: boolean; time: string } => !!value && typeof value === 'object' && typeof (value as { enabled: unknown }).enabled === 'boolean' && typeof (value as { time: unknown }).time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test((value as { time: string }).time);
function validMeasurement(value: unknown): value is Measurement {
  if (!value || typeof value !== 'object') return false;
  const m = value as Measurement;
  return m.kind === 'binary' || (m.kind === 'checklist' && Array.isArray(m.items) && m.items.length > 0 && m.items.length <= 30 && m.items.every(step => step && typeof step.id === 'string' && !!step.id && step.id.length <= 128 && typeof step.text === 'string' && !!step.text.trim() && step.text.length <= 80) && new Set(m.items.map(step => step.id)).size === m.items.length) || (m.kind === 'numeric' && Number.isFinite(m.target) && m.target > 0 && m.target <= 1_000_000 && typeof m.unit === 'string' && m.unit.trim().length > 0 && m.unit.length <= 24);
}
export function parseBackup(raw: string): Snapshot {
  if (raw.length > 10_000_000) throw new Error('Backup is too large (maximum 10 MB).');
  const backup = JSON.parse(raw);
  if (!backup || ![1, 2, 3, 4].includes(backup.version) || !backup.data) throw new Error('This is not a supported DailyCommit backup.');
  const data = backup.data as Snapshot;
  if (!Array.isArray(data.habits) || !Array.isArray(data.completions) || !Array.isArray(data.skips) || !data.settings) throw new Error('Backup is missing required collections.');
  const settings = data.settings;
  if (settings.id !== 'preferences' || !Number.isInteger(settings.rolloverHour) || settings.rolloverHour < 0 || settings.rolloverHour > 23 || !['mint', 'ember', 'mono', 'cyan', 'lime'].includes(settings.theme) || ![0, 1].includes(settings.weekStart)) throw new Error('Invalid backup settings.');
  if (settings.mode !== undefined && !['dark', 'light'].includes(settings.mode)) throw new Error('Invalid appearance mode.');
  if (settings.groups !== undefined && (!Array.isArray(settings.groups) || settings.groups.some(g => typeof g !== 'string' || !g.trim() || g.length > 40) || new Set(settings.groups.map(g => g.toLowerCase())).size !== settings.groups.length)) throw new Error('Invalid groups.');
  if (settings.streakGrace !== undefined && ![0, 1].includes(settings.streakGrace)) throw new Error('Invalid streak setting.');
  if (settings.widgetMonths !== undefined && ![3, 6, 12].includes(settings.widgetMonths)) throw new Error('Invalid widget size.');
  if (settings.reminder !== undefined && (!settings.reminder || typeof settings.reminder.enabled !== 'boolean' || typeof settings.reminder.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.reminder.time))) throw new Error('Invalid reminder setting.');
  if (settings.specialDates !== undefined && (!Array.isArray(settings.specialDates) || settings.specialDates.length > 366 || settings.specialDates.some(d => !validDay(d)))) throw new Error('Invalid special dates.');
  if (settings.badgeGlow !== undefined && typeof settings.badgeGlow !== 'boolean') throw new Error('Invalid badge glow setting.');
  if (data.badges !== undefined && (!Array.isArray(data.badges) || data.badges.some(b => !b || !badgeIds.has(b.id) || !validDay(b.date)) || new Set(data.badges.map(b => b.id)).size !== data.badges.length)) throw new Error('Invalid badges.');
  if (data.badgeEvents !== undefined && (!Array.isArray(data.badgeEvents) || data.badgeEvents.some(e => !e || typeof e.id !== 'string' || !e.id || e.kind !== 'undo' || !validDay(e.date)) || new Set(data.badgeEvents.map(e => e.id)).size !== data.badgeEvents.length)) throw new Error('Invalid badge events.');
  const ids = new Set<string>();
  const habitById = new Map<string, Habit>();
  for (const h of data.habits) {
    if (!h || typeof h.id !== 'string' || !h.id || ids.has(h.id) || typeof h.name !== 'string' || !h.name.trim() || h.name.length > 80 || typeof h.icon !== 'string' || typeof h.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(h.color) || !validSchedule(h.schedule) || !validDay(h.createdAt) || (h.archivedAt !== null && (!validDay(h.archivedAt) || h.archivedAt < h.createdAt)) || !Number.isInteger(h.order) || h.order < 0 || !Array.isArray(h.revisions) || h.revisions.some((r, i) => !r || !validDay(r.from) || r.from < h.createdAt || !validSchedule(r.schedule) || (i > 0 && r.from <= h.revisions[i - 1].from))) throw new Error('Invalid habit in backup.');
    ids.add(h.id);
    if (h.group !== undefined && (typeof h.group !== 'string' || !h.group.trim() || h.group.length > 40)) throw new Error('Invalid habit group.');
    if (h.reminder !== undefined && !validReminder(h.reminder)) throw new Error('Invalid habit reminder.');
    habitById.set(h.id, h);
    if (h.measurement !== undefined && !validMeasurement(h.measurement)) throw new Error('Invalid habit target.');
    if (h.revisions.some(r => r.measurement !== undefined && !validMeasurement(r.measurement))) throw new Error('Invalid historical target.');
  }
  if (settings.vacations !== undefined && (!Array.isArray(settings.vacations) || settings.vacations.some(v => !v || typeof v.id !== 'string' || !v.id || !validDay(v.from) || !validDay(v.to) || v.from > v.to || (v.habitIds !== null && (!Array.isArray(v.habitIds) || !v.habitIds.length || v.habitIds.some(id => !ids.has(id)) || new Set(v.habitIds).size !== v.habitIds.length))) || new Set(settings.vacations.map(v => v.id)).size !== settings.vacations.length)) throw new Error('Invalid vacations.');
  const rowIds = new Set<string>();
  for (const c of data.completions) {
    if (!c || !ids.has(c.habitId) || !validDay(c.date) || c.id !== key(c.habitId, c.date) || !Number.isFinite(c.value) || c.value <= 0 || c.value > 1_000_000 || typeof c.completedAt !== 'string' || Number.isNaN(Date.parse(c.completedAt)) || rowIds.has(c.id)) throw new Error('Invalid or duplicate completion in backup.');
    const habit = habitById.get(c.habitId)!;
    if (c.date < habit.createdAt || (measurementOn(habit, c.date).kind === 'binary' && c.value !== 1)) throw new Error('Completion is outside the habit history.');
    const measure = measurementOn(habit, c.date);
    if (measure.kind === 'checklist' && (!Array.isArray(c.checked) || c.checked.length !== c.value || new Set(c.checked).size !== c.checked.length || c.checked.some(id => !measure.items.some(step => step.id === id)))) throw new Error('Invalid checklist progress.');
    if (c.checked !== undefined && measure.kind !== 'checklist') throw new Error('Unexpected checklist progress.');
    rowIds.add(c.id);
  }
  const skipIds = new Set<string>();
  for (const s of data.skips) {
    if (!s || !ids.has(s.habitId) || !validDay(s.date) || s.id !== key(s.habitId, s.date) || skipIds.has(s.id) || rowIds.has(s.id)) throw new Error('Invalid or conflicting skip in backup.');
    skipIds.add(s.id);
    const habit = habitById.get(s.habitId)!;
    if (s.date < habit.createdAt) throw new Error('Skip is outside the habit history.');
  }
  if (data.notes !== undefined && !Array.isArray(data.notes)) throw new Error('Invalid notes collection.');
  const noteDays = new Set<string>();
  for (const n of data.notes ?? []) {
    if (!n || !validDay(n.date) || typeof n.text !== 'string' || n.text.length > 2000 || (n.mood !== null && !['great', 'good', 'okay', 'low', 'rough'].includes(n.mood)) || typeof n.updatedAt !== 'string' || Number.isNaN(Date.parse(n.updatedAt)) || noteDays.has(n.date)) throw new Error('Invalid or duplicate day note.');
    noteDays.add(n.date);
  }
  return { badges: data.badges ?? [], badgeEvents: data.badgeEvents ?? [], habits: data.habits, completions: data.completions, skips: data.skips, notes: data.notes ?? [], settings: { ...settings, theme: themeFor(settings.theme).id, mode: settings.mode ?? 'dark' } };
}
