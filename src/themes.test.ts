import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { completedActiveDays, deriveBadges } from './badges';
import { defaults, dateRange, getPalette, key, type Snapshot } from './domain';
import { db, parseBackup, repository } from './repository';
import { themeFor } from './themes';
import { createWidgetSnapshot } from './widget';
const fixture = (): Snapshot => ({ habits: [{ id: 'h', name: 'Read', icon: 'sun', color: '#FF8A3D', schedule: { kind: 'daily' }, createdAt: '2026-01-01', archivedAt: null, order: 0, revisions: [] }], completions: dateRange('2026-01-01', '2026-04-10').map(date => ({ id: key('h', date), habitId: 'h', date, value: 1, completedAt: `${date}T12:00:00Z` })), skips: [], settings: { ...defaults } });
beforeEach(async () => { await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore({ ...fixture(), completions: [] }); });
it('unlocks at precisely 50 and 100 distinct completed days with their original dates', () => {
  const data = fixture(), reward = (through: string, id: string) => deriveBadges(data, through).find(b => b.id === id);
  expect(reward('2026-02-18', 'cyan-unlock')).toBeUndefined();
  expect(reward('2026-02-19', 'cyan-unlock')?.date).toBe('2026-02-19');
  expect(reward('2026-04-09', 'lime-unlock')).toBeUndefined();
  expect(reward('2026-04-10', 'lime-unlock')?.date).toBe('2026-04-10');
});
it('does not count multiple habits on a date, partial targets, future dates or missing habits', () => {
  const data = fixture(); data.habits.push({ ...data.habits[0], id: 'other' });
  data.completions.push(...data.completions.map(c => ({ ...c, id: key('other', c.date), habitId: 'other' })));
  expect(completedActiveDays(data, '2026-02-18')).toHaveLength(49);
  data.habits.forEach(h => h.measurement = { kind: 'numeric', target: 10, unit: 'pages' });
  expect(completedActiveDays(data, '2026-04-10')).toHaveLength(0);
  data.completions.push({ id: 'missing:2026-02-19', habitId: 'missing', date: '2026-02-19', value: 100, completedAt: '2026-02-19T12:00:00Z' });
  expect(completedActiveDays(data, '2026-04-10')).toHaveLength(0);
});
it('allows gaps and keeps colors after undo, restoring older backups, and repeated reconciliation', async () => {
  const data = fixture(); data.completions = data.completions.filter((_, i) => i % 2 === 0);
  await repository.restore(data); await repository.awardEarned('2026-04-10');
  await repository.saveSettings({ ...defaults, theme: 'cyan', mode: 'light' });
  const saved = await repository.read(); expect(saved.settings.theme).toBe('cyan');
  const imported = parseBackup(JSON.stringify({ version: 4, data: saved })); expect(imported.settings.theme).toBe('cyan');
  await repository.restore({ ...imported, completions: [], badges: [] });
  expect((await repository.read()).settings.theme).toBe('cyan');
  expect(await repository.awardEarned('2026-04-10')).toEqual([]);
});
it('guards locked themes and supplies matching chart and widget palettes for both modes', async () => {
  await expect(repository.saveSettings({ ...defaults, theme: 'lime' })).rejects.toThrow('Earn');
  await repository.restore({ ...fixture(), settings: { ...defaults, theme: 'lime' } });
  expect((await repository.read()).settings.theme).toBe('ember');
  await repository.awardEarned('2026-04-10');
  for (const theme of ['cyan', 'lime'] as const) for (const mode of ['dark', 'light'] as const) {
    await repository.saveSettings({ ...defaults, theme, mode }); const saved = await repository.read();
    expect(getPalette(saved.settings)).toEqual(themeFor(theme)[mode]);
    const widget = createWidgetSnapshot(saved);
    expect(widget.theme).toBe(theme); expect(widget.colors).toEqual(getPalette(saved.settings)); expect(widget.accent).toBe(themeFor(theme).accent[mode]);
  }
});
