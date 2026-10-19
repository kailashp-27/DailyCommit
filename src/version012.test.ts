import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { dateRange, defaults, key, type Habit, type Snapshot } from './domain';
import { deriveBadges } from './badges';
import { habitDetails } from './habitInsights';
import { filterHabits } from './habitFilters';
import { reminderHabits, snoozeAt } from './reminderActions';
import { widgetGrid } from './widgetGeometry';
import { db, parseBackup, repository } from './repository';
const habit = (id = 'h'): Habit => ({ id, name: 'Read ' + id, group: 'Study', icon: 'book', color: '#FF8A3D', schedule: { kind: 'daily' }, createdAt: '2026-10-01', archivedAt: null, order: 0, revisions: [] });
const data = (count = 1): Snapshot => { const habits = Array.from({ length: count }, (_, i) => habit(String(i))); return { habits, completions: [], skips: [], settings: { ...defaults } }; };
const complete = (d: Snapshot, date: string) => d.completions.push(...d.habits.map(h => ({ id: key(h.id, date), habitId: h.id, date, value: 1, completedAt: date + 'T12:00:00Z' })));
beforeEach(async () => { await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore(data()); });
it('Hello World starts on day two, while Clean Working Tree requires five scheduled completions and a perfect day', () => {
  const d = data(4); complete(d, '2026-10-01');
  expect(deriveBadges(d, '2026-10-01').map(b => b.id)).not.toContain('hello');
  expect(deriveBadges(d, '2026-10-01').map(b => b.id)).not.toContain('clean');
  complete(d, '2026-10-02'); expect(deriveBadges(d, '2026-10-02').find(b => b.id === 'hello')?.date).toBe('2026-10-02');
  const five = data(5); complete(five, '2026-10-01'); expect(deriveBadges(five, '2026-10-01').find(b => b.id === 'clean')?.date).toBe('2026-10-01');
  const six = data(6); complete(six, '2026-10-01'); six.completions.pop(); expect(deriveBadges(six, '2026-10-01').map(b => b.id)).not.toContain('clean');
  five.skips.push({ id: key('0', '2026-10-01'), habitId: '0', date: '2026-10-01' }); expect(deriveBadges(five, '2026-10-01').map(b => b.id)).not.toContain('clean');
});
it('keeps badges awarded under the former rules and persists independent collapse choices in backups', async () => {
  await repository.award('hello', '2026-10-01'); await repository.award('clean', '2026-10-01');
  await repository.toggleGroup('Study', 'today'); await repository.toggleGroup('', 'habits');
  const saved = await repository.read(); expect(saved.settings.collapsedTodayGroups).toEqual(['Study']); expect(saved.settings.collapsedHabitGroups).toEqual(['']);
  const restored = parseBackup(JSON.stringify({ version: 4, data: saved })); await repository.restore(restored); await repository.awardEarned('2026-10-02');
  expect((await repository.read()).badges?.map(b => b.id)).toEqual(expect.arrayContaining(['hello', 'clean']));
  await repository.toggleGroup('Study', 'today'); expect((await repository.read()).settings.collapsedTodayGroups).toEqual([]);
  expect(() => parseBackup(JSON.stringify({ version: 4, data: { ...saved, settings: { ...saved.settings, collapsedTodayGroups: [2] } } }))).toThrow('collapsed');
});
it('habit details use date-effective targets and exclude rest/vacation days from completion rate', () => {
  const d = data(); d.habits[0].measurement = { kind: 'numeric', target: 10, unit: 'pages' };
  d.habits[0].revisions = [{ from: '2026-10-01', schedule: { kind: 'daily' }, measurement: { kind: 'numeric', target: 5, unit: 'pages' } }, { from: '2026-10-03', schedule: { kind: 'daily' }, measurement: { kind: 'numeric', target: 10, unit: 'pages' } }];
  d.completions = ['2026-10-01', '2026-10-02', '2026-10-03'].map(date => ({ id: key('0', date), habitId: '0', date, value: 5, completedAt: date + 'T12:00:00Z' }));
  d.skips = [{ id: key('0', '2026-10-04'), habitId: '0', date: '2026-10-04' }]; d.settings.vacations = [{ id: 'v', from: '2026-10-05', to: '2026-10-05', habitIds: null }];
  const stats = habitDetails(d.habits[0], d, '2026-10-05'); expect(stats.days).toHaveLength(30); expect(stats.total).toBe(2); expect(stats.due).toBe(3); expect(stats.percent).toBe(67); expect(stats.best).toBe(2);
});
it('search combines group and status, including archived habits and literal special group names', () => {
  const habits = [habit('a'), { ...habit('b'), name: 'Walk', group: '*', archivedAt: '2026-10-03' }];
  expect(filterHabits(habits, ' read ', 'active', null).map(h => h.id)).toEqual(['a']);
  expect(filterHabits(habits, '', 'all', '*').map(h => h.id)).toEqual(['b']); expect(filterHabits(habits, 'walk', 'active', null)).toEqual([]);
  expect(filterHabits(habits, 'study', 'all', null).map(h => h.id)).toEqual(['a']);
});
it('reminder actions reject old days, repeats, paused and completed habits, and snoozes across rollover', () => {
  const d = data(2), now = new Date(2026, 9, 2, 9); d.habits.forEach(h => h.reminder = { enabled: true, time: '09:00' });
  expect(reminderHabits(d, '2026-10-02', ['0', '0', 'missing'], now)).toEqual(['0']);
  expect(reminderHabits(d, '2026-10-01', ['0'], now)).toEqual([]);
  d.completions.push({ id: key('0', '2026-10-02'), habitId: '0', date: '2026-10-02', value: 1, completedAt: now.toISOString() });
  d.settings.vacations = [{ id: 'v', from: '2026-10-02', to: '2026-10-02', habitIds: ['1'] }]; expect(reminderHabits(d, '2026-10-02', ['0', '1'], now)).toEqual([]);
  expect(snoozeAt(d, '2026-10-02', now)?.getMinutes()).toBe(15); expect(snoozeAt(d, '2026-10-02', new Date(2026, 9, 2, 23, 55))).toBeNull();
  d.settings.rolloverHour = 4; expect(snoozeAt(d, '2026-10-02', new Date(2026, 9, 3, 3, 55))).toBeNull();
});
it('all selected widget days stay in bounds at compact, square, portrait and landscape sizes', () => {
  for (const weeks of [13, 26, 52]) for (const [width, height] of [[118, 100], [280, 200], [280, 500], [700, 100]]) {
    const g = widgetGrid(weeks, width, height), cells = new Set<string>();
    for (let day = 0; day < weeks * 7; day++) { const x = g.x(day), y = g.y(day); expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0); expect(x + g.cell).toBeLessThanOrEqual(width + .001); expect(y + g.cell).toBeLessThanOrEqual(height + .001); cells.add(`${x},${y}`); }
    expect(cells.size).toBe(weeks * 7);
  }
  expect(widgetGrid(52, 280, 200).blocks).toBeGreaterThan(1); expect(widgetGrid(52, 700, 100).blocks).toBe(1);
});
