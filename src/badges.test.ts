import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { badges, deriveBadges } from './badges';
import { dateRange, defaults, key, type Habit, type Snapshot } from './domain';
import { db, parseBackup, repository } from './repository';

const habit = (id = 'h', from = '2026-01-01'): Habit => ({ id, name: id, icon: 'sun', color: '#FF8A3D', schedule: { kind: 'daily' }, createdAt: from, archivedAt: null, order: 0, revisions: [] });
const fixture = (from: string, to: string, count = 1): Snapshot => {
  const habits = Array.from({ length: count }, (_, i) => habit(String(i), from));
  return { habits, completions: dateRange(from, to).flatMap(date => habits.map(h => ({ id: key(h.id, date), habitId: h.id, date, value: 1, completedAt: `${date}T12:00:00Z` }))), skips: [], settings: { ...defaults } };
};
const ids = (data: Snapshot, through: string) => deriveBadges(data, through).map(b => b.id);
beforeEach(async () => { await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore({ habits: [], completions: [], skips: [], settings: defaults }); });

it('does not award completion or perfect-day badges for partial numeric progress or empty/rest days', () => {
  const data = fixture('2026-01-01', '2026-01-01'); data.habits[0].measurement = { kind: 'numeric', target: 10, unit: 'pages' };
  expect(ids(data, '2026-01-01')).not.toContain('first');
  data.completions = []; data.skips = [{ id: key('0', '2026-01-01'), habitId: '0', date: '2026-01-01' }];
  expect(ids(data, '2026-01-01')).not.toContain('hello');
});
it('awards thresholds on the day earned and does not infer future or unavailable badges', () => {
  const data = fixture('2026-01-01', '2026-04-10', 5), earned = deriveBadges(data, '2026-04-10');
  expect(earned.find(b => b.id === 'sprint')?.date).toBe('2026-01-07');
  expect(earned.find(b => b.id === 'v1')?.date).toBe('2026-04-10');
  expect(earned.find(b => b.id === 'polyglot')?.date).toBe('2026-01-14');
  expect(earned.find(b => b.id === '500')?.date).toBe('2026-04-10');
  expect(ids(data, '2026-01-06')).not.toContain('sprint');
  for (const b of badges.filter(b => b.unavailable)) expect(earned.map(e => e.id)).not.toContain(b.id);
});
it('requires complete calendar periods and dates Monday Specialist on the final Monday', () => {
  const data = fixture('2026-02-01', '2026-02-28');
  expect(deriveBadges(data, '2026-02-28').find(b => b.id === 'monday')?.date).toBe('2026-02-23');
  expect(ids(data, '2026-02-27')).not.toContain('zero');
  expect(ids(data, '2026-02-28')).toContain('zero');
  expect(ids(fixture('2026-02-02', '2026-02-28'), '2026-02-28')).not.toContain('zero');
});
it('rewards a comeback only after an actual gap and rebuild', () => {
  const data = fixture('2026-01-01', '2026-01-03');
  data.completions.push(...fixture('2026-01-11', '2026-01-13').completions);
  const earned = deriveBadges(data, '2026-01-13');
  expect(earned.find(b => b.id === 'rebase')?.date).toBe('2026-01-11');
  expect(earned.find(b => b.id === 'reflog')?.date).toBe('2026-01-13');
  expect(ids(fixture('2026-01-01', '2026-01-13'), '2026-01-13')).not.toContain('reflog');
});
it('supports numeric overachievement, special dates and leap day', () => {
  const data = fixture('2028-02-20', '2028-02-29'); data.settings.specialDates = ['2028-02-29'];
  data.habits[0].measurement = { kind: 'numeric', target: 10, unit: 'pages' }; data.completions.forEach(c => c.value = 15);
  expect(ids(data, '2028-02-29')).toEqual(expect.arrayContaining(['overclock', 'special', 'leap']));
  const multiple = fixture('2026-01-01', '2026-01-05', 2);
  multiple.habits.forEach(h => h.measurement = { kind: 'numeric', target: 10, unit: 'pages' }); multiple.completions.forEach(c => c.value = 15);
  expect(ids(multiple, '2026-01-05')).toContain('overclock');
});
it('does not award time badges for backfills or queued widget timestamps', () => {
  const data = fixture('2026-01-01', '2026-01-01'); data.habits[0].group = 'Morning';
  data.completions[0].completedAt = new Date(2026, 0, 1, 1).toISOString();
  expect(ids(data, '2026-01-01')).toEqual(expect.arrayContaining(['midnight', 'morning']));
  data.completions[0].source = 'widget'; expect(ids(data, '2026-01-01')).not.toContain('morning'); expect(ids(data, '2026-01-01')).not.toContain('midnight');
  delete data.completions[0].source; data.completions[0].completedAt = new Date(2026, 0, 2, 1).toISOString();
  expect(ids(data, '2026-01-02')).not.toContain('midnight');
  data.settings.rolloverHour = 4;
  expect(ids(data, '2026-01-02')).toContain('midnight');
});
it('preserves original timestamps from new widget check-ins', async () => {
  const data = fixture('2026-01-01', '2026-01-01'); await repository.restore({ ...data, completions: [] });
  const completedAt = new Date(2026, 0, 1, 1).toISOString();
  await repository.applyWidgetActions([{ id: 'timestamp-check', habitId: '0', date: '2026-01-01', value: 1, completedAt }]);
  const saved = await repository.read(); expect(saved.completions[0].completedAt).toBe(completedAt);
  expect(ids(saved, '2026-01-01')).toContain('midnight');
});
it('awards each badge once under concurrent reconciliation and preserves it after undo and restore', async () => {
  await repository.restore(fixture('2026-01-01', '2026-01-01'));
  const results = await Promise.all([repository.awardEarned('2026-01-01'), repository.awardEarned('2026-01-01')]);
  expect(results.flat().filter(b => b.id === 'first')).toHaveLength(1);
  await repository.setValue('0', '2026-01-01', 0);
  expect((await repository.read()).badges?.some(b => b.id === 'first')).toBe(true);
  const backup = parseBackup(JSON.stringify({ version: 3, data: await repository.read() }));
  await repository.restore({ ...backup, badges: [], completions: [] });
  await repository.setDay('0', '2026-01-01', 'done');
  expect(await repository.awardEarned('2026-01-01')).toEqual([]);
  expect((await repository.read()).badges?.find(b => b.id === 'first')?.date).toBe('2026-01-01');
});
it('counts real completed-to-incomplete undo transitions, including group undo, without counting partial edits', async () => {
  const data = fixture('2026-01-01', '2026-01-01', 10); await repository.restore({ ...data, completions: [] });
  const previous = await repository.completeGroup(data.habits.map(h => h.id), '2026-01-01');
  await repository.restoreCheckIns(previous.ids, previous.rows);
  expect(await db.badgeEvents.count()).toBe(10);
  const events = await db.badgeEvents.toArray();
  expect(ids(await repository.read(), events[0].date)).toContain('undo');
  await repository.setValue('0', '2026-01-01', 0); expect(await db.badgeEvents.count()).toBe(10);
});
