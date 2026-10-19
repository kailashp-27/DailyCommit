import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActionPerformed, ScheduleOptions, CancelOptions } from '@capacitor/local-notifications';
import { defaults, type Snapshot } from './domain';
import { db, repository } from './repository';
const native = vi.hoisted(() => ({
  pending: [] as { id: number; extra?: Record<string, unknown> }[],
  listener: undefined as undefined | ((action: ActionPerformed) => void),
  schedule: vi.fn(async (_options: ScheduleOptions) => ({ notifications: [] })),
  cancel: vi.fn(async (_options: CancelOptions) => {}),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
vi.mock('./widget', async () => { const { repository } = await import('./repository'); return { readDeviceData: () => repository.read() }; });
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  getPending: async () => ({ notifications: native.pending }), cancel: native.cancel, schedule: native.schedule,
  registerActionTypes: vi.fn(async () => {}), checkPermissions: async () => ({ display: 'granted' }), createChannel: async () => {},
  addListener: async (_name: string, listener: (action: ActionPerformed) => void) => { native.listener = listener; return { remove: async () => { native.listener = undefined; } }; },
} }));
import { syncReminders, watchReminderActions } from './reminders';
const fixture = (): Snapshot => ({ habits: [{ id: 'h', name: 'Read', icon: 'book', color: '#FF8A3D', createdAt: '2026-10-01', archivedAt: null, order: 0, revisions: [], schedule: { kind: 'daily' }, reminder: { enabled: true, time: '09:00' } }], completions: [], skips: [], settings: { ...defaults } });
const action = (actionId: string, date = '2026-10-02'): ActionPerformed => ({ actionId, notification: { id: 44000, title: 'Read', body: 'Check in', extra: { date, habitIds: ['h'], reminderKey: date + '@09:00' } } });
beforeEach(async () => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 2, 10)); native.pending = []; native.schedule.mockClear(); native.cancel.mockClear(); native.listener = undefined; await db.badges.clear(); await db.badgeEvents.clear(); await repository.restore(fixture()); });
afterEach(() => vi.useRealTimers());
it('cleans a completed snooze even when all ordinary reminder times for today have passed', async () => {
  const d = fixture(); native.pending = [{ id: 45000, extra: { date: '2026-10-02', habitIds: ['h'] } }];
  await syncReminders(d); native.cancel.mockClear();
  d.completions = [{ id: 'h:2026-10-02', habitId: 'h', date: '2026-10-02', value: 1, completedAt: new Date().toISOString() }];
  await syncReminders(d); expect(native.cancel.mock.calls.flatMap(([arg]) => arg.notifications.map(n => n.id))).toContain(45000);
});
it('schedules a snooze exactly fifteen minutes ahead with the original logical day and actions', async () => {
  const changed = vi.fn(async () => {}), message = vi.fn(), stop = watchReminderActions(message, changed);
  await vi.waitFor(() => expect(native.listener).toBeDefined()); native.listener!(action('snooze'));
  await vi.waitFor(() => expect(changed).toHaveBeenCalled());
  const n = native.schedule.mock.calls.at(-1)![0].notifications[0]; expect(n.id).toBeGreaterThanOrEqual(45000); expect(n.extra.date).toBe('2026-10-02'); expect(n.actionTypeId).toBe('dailycommit-habit'); expect(Math.abs(n.schedule!.at!.getTime() - new Date(2026, 9, 2, 10, 15).getTime())).toBeLessThan(1000); expect(message).toHaveBeenCalledWith('Reminder snoozed for 15 minutes.'); stop();
});
it('completes checklist targets once through the repository and never clears an existing check-in', async () => {
  const d = fixture(); d.habits[0].measurement = { kind: 'checklist', items: [{ id: 'a', text: 'Open book' }, { id: 'b', text: 'Read' }] }; await repository.restore(d);
  const changed = vi.fn(async () => {}), stop = watchReminderActions(vi.fn(), changed); await vi.waitFor(() => expect(native.listener).toBeDefined()); native.listener!(action('done'));
  await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1)); const first = (await repository.read()).completions[0]; expect(first.checked).toEqual(['a', 'b']);
  native.listener!(action('done')); await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(2)); expect((await repository.read()).completions).toEqual([first]); stop();
});
it('does not apply stale notification actions to another day', async () => {
  const message = vi.fn(), changed = vi.fn(async () => {}), stop = watchReminderActions(message, changed); await vi.waitFor(() => expect(native.listener).toBeDefined()); native.listener!(action('done', '2026-10-01'));
  await vi.waitFor(() => expect(changed).toHaveBeenCalled()); expect((await repository.read()).completions).toEqual([]); expect(message).toHaveBeenCalledWith('Nothing due for this reminder.'); stop();
});
