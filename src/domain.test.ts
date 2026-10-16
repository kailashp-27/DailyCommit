import { describe, expect, it } from 'vitest';
import { dateRange, daySummary, defaults, intensity, isScheduled, today, type Habit, type Snapshot } from './domain';
const habit = (changes: Partial<Habit> = {}): Habit => ({ id:'h1', name:'Read', icon:'book', color:'#b1ef79', schedule:{kind:'daily'}, createdAt:'2026-01-01', archivedAt:null, order:0, revisions:[], ...changes });
const snapshot = (habits: Habit[] = [habit()]): Snapshot => ({habits,completions:[],skips:[],settings:defaults});
describe('local days', () => {
  it('applies rollover across the year boundary without UTC conversion', () => { expect(today(4,new Date(2026,0,1,1,30))).toBe('2025-12-31'); expect(today(4,new Date(2026,0,1,4))).toBe('2026-01-01'); });
  it('includes leap days', () => { expect(dateRange('2024-02-28','2024-03-01')).toEqual(['2024-02-28','2024-02-29','2024-03-01']); });
  it('steps through DST boundaries as calendar dates', () => { expect(dateRange('2026-03-07','2026-03-10')).toHaveLength(4); });
});
describe('schedule and ratio', () => {
  it('respects creation and archive boundaries', () => { const h=habit({createdAt:'2026-10-02',archivedAt:'2026-10-04'}),d=snapshot([h]); expect(isScheduled(h,'2026-10-01',d)).toBe(false); expect(isScheduled(h,'2026-10-02',d)).toBe(true); expect(isScheduled(h,'2026-10-04',d)).toBe(false); });
  it('matches weekdays', () => { const h=habit({schedule:{kind:'weekdays',days:[1,3,5]}}),d=snapshot([h]); expect(isScheduled(h,'2026-10-05',d)).toBe(true); expect(isScheduled(h,'2026-10-06',d)).toBe(false); });
  it('offers weekly habits until their quota, and resets next week', () => { const h=habit({schedule:{kind:'weekly',target:2}}),d=snapshot([h]); d.completions=['2026-10-05','2026-10-07'].map(date=>({id:`h1:${date}`,habitId:'h1',date,value:1,completedAt:new Date().toISOString()})); expect(isScheduled(h,'2026-10-06',d)).toBe(true); expect(isScheduled(h,'2026-10-07',d)).toBe(true); expect(isScheduled(h,'2026-10-08',d)).toBe(false); expect(isScheduled(h,'2026-10-12',d)).toBe(true); });
  it('preserves historical schedules after an edit', () => { const h=habit({schedule:{kind:'weekdays',days:[1]},revisions:[{from:'2026-01-01',schedule:{kind:'daily'}},{from:'2026-10-10',schedule:{kind:'weekdays',days:[1]}}]}),d=snapshot([h]); expect(isScheduled(h,'2026-10-09',d)).toBe(true); expect(isScheduled(h,'2026-10-10',d)).toBe(false); });
  it('removes skips from the denominator and ignores unrelated completions', () => { const d=snapshot([habit(),habit({id:'h2'}),habit({id:'future',createdAt:'2026-11-01'})]); d.completions=[{id:'h1:2026-10-10',habitId:'h1',date:'2026-10-10',value:1,completedAt:new Date().toISOString()}]; d.skips=[{id:'h2:2026-10-10',habitId:'h2',date:'2026-10-10'}]; expect(daySummary('2026-10-10',d)).toMatchObject({done:1,total:1,ratio:1}); });
  it('distinguishes a missed day from rest', () => { expect(daySummary('2026-10-10',snapshot()).ratio).toBe(0); expect(daySummary('2026-10-10',snapshot([])).ratio).toBe(null); expect(intensity(null)).toBe(-1); expect(intensity(0)).toBe(0); expect(intensity(.25)).toBe(1); expect(intensity(1)).toBe(4); });
});
