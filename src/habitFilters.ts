import type { Habit } from './domain';
export type HabitStatus = 'active' | 'archived' | 'all';
export function filterHabits(habits: Habit[], query: string, status: HabitStatus, group: string | null) {
  const search = query.trim().toLocaleLowerCase();
  return habits.filter(h => (status === 'all' || (status === 'archived' ? !!h.archivedAt : !h.archivedAt)) && (group === null || (h.group ?? '') === group) && (!search || h.name.toLocaleLowerCase().includes(search) || (h.group ?? '').toLocaleLowerCase().includes(search))).sort((a, b) => a.order - b.order);
}
