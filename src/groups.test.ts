import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { defaults, groupsFor, key, type Habit, type Snapshot } from './domain';
import { db, parseBackup, repository } from './repository';
import { habitTemplates } from './habitTemplates';

const date = '2026-10-01';
const habit = (id: string, group: string, archivedAt: string | null = null): Habit => ({ id, name: id, group, icon: 'book', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, createdAt: date, archivedAt, order: 0, revisions: [] });
const fixture: Snapshot = { habits: [habit('read', 'Morning'), habit('old', 'Morning', '2026-10-10')], completions: [{ id: key('old', date), habitId: 'old', date, value: 1, completedAt: `${date}T12:00:00Z` }], skips: [], notes: [{ date, text: 'A note', mood: 'good', updatedAt: `${date}T12:00:00Z` }], settings: { ...defaults, groups: ['Morning', 'Fitness', 'Study', 'Evening'] } };
beforeEach(async () => { await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore(fixture); });

it('renames all group members including archived habits without touching history', async () => {
  const before = await repository.read();
  await repository.manageGroup({ kind: 'rename', name: 'Morning', next: 'Early day' });
  const after = await repository.read();
  expect(after.habits.map(h => h.group)).toEqual(['Early day', 'Early day']);
  expect(groupsFor(after)).toEqual(['Early day', 'Fitness', 'Study', 'Evening']);
  expect(after.completions).toEqual(before.completions); expect(after.notes).toEqual(before.notes);
  expect(after.habits.map(h => h.archivedAt)).toEqual(before.habits.map(h => h.archivedAt));
});
it('removes a default group, keeps habits ungrouped and does not resurrect it after backup restore', async () => {
  await repository.manageGroup({ kind: 'remove', name: 'Morning', destination: '' });
  const saved = await repository.read(); expect(saved.habits.every(h => !h.group)).toBe(true);
  expect(groupsFor(saved)).not.toContain('Morning'); expect(saved.completions).toEqual(fixture.completions);
  await repository.restore(parseBackup(JSON.stringify({ version: 3, data: saved })));
  expect(groupsFor(await repository.read())).not.toContain('Morning');
});
it('moves members on removal and Undo restores group membership/order while retaining newer preferences', async () => {
  const change = await repository.manageGroup({ kind: 'remove', name: 'Morning', destination: 'Fitness' });
  expect((await repository.read()).habits.every(h => h.group === 'Fitness')).toBe(true);
  await repository.saveSettings({ ...(await repository.read()).settings, mode: 'light' });
  await repository.undoGroup(change);
  const restored = await repository.read(); expect(restored.habits.every(h => h.group === 'Morning')).toBe(true);
  expect(restored.settings.groups).toEqual(fixture.settings.groups); expect(restored.settings.mode).toBe('light');
});
it('retains reordered groups and explicitly empty lists, with legacy default fallback', async () => {
  await repository.manageGroup({ kind: 'move', name: 'Study', direction: -1 });
  expect(groupsFor(await repository.read())).toEqual(['Morning', 'Study', 'Fitness', 'Evening']);
  expect(groupsFor({ ...fixture, habits: [], settings: { ...defaults, groups: [] } })).toEqual([]);
  expect(groupsFor({ ...fixture, habits: [], settings: { ...defaults, groups: undefined } })).toEqual(defaults.groups);
});
it('rejects duplicate names and invalid destinations atomically', async () => {
  await expect(repository.manageGroup({ kind: 'rename', name: 'Morning', next: 'study' })).rejects.toThrow('already exists');
  await expect(repository.manageGroup({ kind: 'create', name: 'MORNING' })).rejects.toThrow('already exists');
  await expect(repository.manageGroup({ kind: 'remove', name: 'Morning', destination: 'Missing' })).rejects.toThrow('Choose another');
  expect((await repository.read()).habits).toEqual(expect.arrayContaining(fixture.habits));
});
it('saves template defaults as ordinary editable habits and registers a deliberately recreated template group', async () => {
  await repository.manageGroup({ kind: 'remove', name: 'Morning', destination: '' });
  const template = habitTemplates.find(t => t.id === 'water')!;
  const { id: _id, detail: _detail, ...values } = template;
  await repository.saveHabit({ ...values, id: 'water-copy', name: 'Water at work', measurement: { kind: 'numeric', target: 6, unit: 'glasses' }, createdAt: date, archivedAt: null, order: 2, revisions: [] });
  const saved = await repository.read(); expect(saved.habits.find(h => h.id === 'water-copy')?.measurement).toEqual({ kind: 'numeric', target: 6, unit: 'glasses' });
  expect(groupsFor(saved)).toContain('Morning'); expect(habitTemplates.find(t => t.id === 'water')?.measurement).toEqual({ kind: 'numeric', target: 8, unit: 'glasses' });
});
