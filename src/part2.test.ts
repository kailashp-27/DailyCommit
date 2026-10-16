import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { addDays, parseISO } from 'date-fns';
import { dayString, daySummary, defaults, key, measurementOn, streaks, today, type Habit, type Snapshot } from './domain';
import { db, parseBackup, repository } from './repository';
import { reminderPlan } from './reminderPlan';
import { createWidgetSnapshot } from './widget';

const current = today(), shift = (n: number) => dayString(addDays(parseISO(current), n));
const steps = [{ id: 'a', text: 'Prepare' }, { id: 'b', text: 'Review' }];
const habit = (id = 'h'): Habit => ({ id, name: id, icon: 'book', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, createdAt: shift(-10), archivedAt: null, order: 0, revisions: [] });
const fixture = (habits: Habit[] = [habit()]): Snapshot => ({ habits, completions: [], skips: [], settings: { ...defaults } });
beforeEach(async () => { await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore(fixture()); });

it('adds a checklist from today, preserving older binary check-ins and completed-today intent', async () => {
  await repository.setDay('h', shift(-1), 'done'); await repository.setDay('h', current, 'done');
  const original = habit();
  await repository.saveHabit({ ...original, measurement: { kind: 'checklist', items: steps }, revisions: [{ from: original.createdAt, schedule: original.schedule, measurement: { kind: 'binary' } }, { from: current, schedule: original.schedule, measurement: { kind: 'checklist', items: steps } }] });
  const data = await repository.read();
  expect(measurementOn(data.habits[0], shift(-1)).kind).toBe('binary');
  expect(data.completions.find(c => c.date === shift(-1))?.value).toBe(1);
  expect(data.completions.find(c => c.date === current)?.checked).toEqual(['a', 'b']);
  await repository.setChecklist('h', current, 'b', false);
  expect(daySummary(current, await repository.read()).ratio).toBe(.5);
});
it('preserves step identity through edits and group completion Undo; does not count steps as separate check-ins', async () => {
  const h = { ...habit(), measurement: { kind: 'checklist' as const, items: steps } };
  await repository.saveHabit(h); await repository.setChecklist('h', current, 'a', true);
  const previous = await repository.completeGroup(['h'], current);
  expect(daySummary(current, await repository.read()).done).toBe(1);
  await repository.restoreCheckIns(previous.ids, previous.rows);
  expect((await repository.read()).completions[0].checked).toEqual(['a']);
  await repository.saveHabit({ ...h, measurement: { kind: 'checklist', items: [{ id: 'a', text: 'Prepare carefully' }, { id: 'c', text: 'Finish' }] } });
  const data = await repository.read(); expect(data.completions).toHaveLength(1); expect(data.completions[0].value).toBe(1);
  expect(data.completions[0].checked).toEqual(['a']);
  await expect(repository.setValue('h', current, 2)).rejects.toThrow('checklist');
});
it('pauses selected habits fairly without changing their stored history', async () => {
  await repository.restore(fixture([habit('a'), habit('b')])); await repository.setDay('a', shift(-1), 'done');
  const history = (await repository.read()).completions;
  await repository.addVacation({ id: 'v', from: current, to: shift(2), habitIds: ['a'] });
  const data = await repository.read(); expect(daySummary(current, data).total).toBe(1); expect(daySummary(current, data).eligible[0].id).toBe('b');
  expect(data.completions).toEqual(history); expect(daySummary(shift(3), data).total).toBe(2);
  await expect(repository.addVacation({ id: 'old', from: shift(-1), to: current, habitIds: null })).rejects.toThrow('today or later');
});
it('ending an active vacation preserves past pauses, resumes today and keeps the streak', async () => {
  const data = fixture(); data.settings.vacations = [{ id: 'v', from: shift(-2), to: shift(3), habitIds: null }];
  data.completions = [{ id: key('h', shift(-3)), habitId: 'h', date: shift(-3), value: 1, completedAt: new Date().toISOString() }];
  // Begin this fixture on the successful day so earlier misses do not obscure the streak.
  data.habits[0].createdAt = shift(-3); await repository.restore(data);
  expect(streaks(await repository.read(), current).current).toBe(1);
  await repository.endVacation('v');
  const saved = await repository.read(); expect(saved.settings.vacations?.[0].to).toBe(shift(-1));
  expect(daySummary(shift(-1), saved).vacationDay).toBe(true); expect(daySummary(current, saved).total).toBe(1);
  expect(streaks(saved, current).current).toBe(1);
});
it('keeps completed check-ins when a break starts and does not increment the vacation streak', async () => {
  const data = fixture(); data.habits[0].createdAt = shift(-1); await repository.restore(data);
  await repository.setDay('h', shift(-1), 'done'); await repository.setDay('h', current, 'done');
  await repository.addVacation({ id: 'v', from: current, to: shift(2), habitIds: null });
  const saved = await repository.read(); expect(saved.completions).toHaveLength(2); expect(daySummary(current, saved).done).toBe(1);
  expect(streaks(saved, current).current).toBe(1);
});
it('round-trips reminder, checklist and vacation facts and rejects mismatched step IDs', async () => {
  await repository.saveHabit({ ...habit(), measurement: { kind: 'checklist', items: steps }, reminder: { enabled: true, time: '08:30' } });
  await repository.setChecklist('h', current, 'a', true);
  await repository.addVacation({ id: 'v', from: shift(1), to: shift(2), habitIds: ['h'] });
  const data = await repository.read(), backup = parseBackup(JSON.stringify({ version: 4, data }));
  expect(backup.habits).toEqual(data.habits); expect(backup.completions).toEqual(data.completions); expect(backup.settings.vacations).toEqual(data.settings.vacations);
  expect(() => parseBackup(JSON.stringify({ version: 4, data: { ...data, completions: [{ ...data.completions[0], checked: ['missing'] }] } }))).toThrow('checklist');
  expect(() => parseBackup(JSON.stringify({ version: 4, data: { ...data, settings: { ...data.settings, vacations: [{ id: 'bad', from: current, to: current, habitIds: ['missing'] }] } } }))).toThrow('vacations');
});
it('publishes checklist targets and suppresses paused widget tasks; native whole-habit check-in fills steps', async () => {
  await repository.saveHabit({ ...habit(), measurement: { kind: 'checklist', items: steps } });
  expect(createWidgetSnapshot(await repository.read()).quickDays[0].tasks[0].target).toBe(2);
  await repository.applyWidgetActions([{ id: 'checklist-widget', habitId: 'h', date: current, value: 2 }]);
  expect((await repository.read()).completions[0].checked).toEqual(['a', 'b']);
  await repository.addVacation({ id: 'v', from: shift(1), to: shift(2), habitIds: null });
  expect(createWidgetSnapshot(await repository.read()).quickDays[1].tasks).toEqual([]);
});
it('plans reminders only when due, merges same-time global/individual reminders and omits completed habits', () => {
  const now = new Date(2026, 9, 16, 8), h = { ...habit(), createdAt: '2026-01-01', reminder: { enabled: true, time: '09:00' } };
  const data = fixture([h]); data.settings.reminder = { enabled: true, time: '09:00' };
  const plan = reminderPlan(data, now, 0); expect(plan).toHaveLength(1); expect(plan[0].habitIds).toEqual(['h']);
  data.completions = [{ id: key('h', '2026-10-16'), habitId: 'h', date: '2026-10-16', value: 1, completedAt: now.toISOString() }];
  expect(reminderPlan(data, now, 0)).toEqual([]);
});
it('respects weekday schedules, vacation days and weekly quotas in reminder planning', () => {
  const now = new Date(2026, 9, 16, 8), daily = { ...habit('daily'), createdAt: '2026-01-01', reminder: { enabled: true, time: '09:00' } };
  const data = fixture([daily, { ...daily, id: 'monday', schedule: { kind: 'weekdays', days: [1] } }, { ...daily, id: 'weekly', schedule: { kind: 'weekly', target: 1 } }]);
  data.settings.vacations = [{ id: 'v', from: '2026-10-16', to: '2026-10-18', habitIds: ['daily'] }];
  data.completions = [{ id: key('weekly', '2026-10-15'), habitId: 'weekly', date: '2026-10-15', value: 1, completedAt: now.toISOString() }];
  expect(reminderPlan(data, now, 0)).toEqual([]);
  const monday = reminderPlan(data, new Date(2026, 9, 19, 8), 0); expect(monday[0].habitIds).toEqual(['daily', 'monday', 'weekly']);
});
it('maps early-morning reminders to the correct logical day after rollover', () => {
  const data = fixture([{ ...habit(), createdAt: '2026-01-01', reminder: { enabled: true, time: '03:00' } }]); data.settings.rolloverHour = 4;
  const plan = reminderPlan(data, new Date(2026, 9, 17, 1), 0);
  expect(plan[0].key).toBe('2026-10-16@03:00'); expect(plan[0].at.getDate()).toBe(17); expect(plan[0].at.getHours()).toBe(3);
});
