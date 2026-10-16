import { addDays, getDay } from 'date-fns';
import { dayString, defaults, key, today, type Snapshot } from './domain';
export function demoSnapshot(): Snapshot {
  const current = today(), year = Number(current.slice(0, 4));
  const names = [['Read 10 pages', 'book'], ['Move your body', 'move'], ['Drink water', 'sun'], ['Build something', 'code']];
  const habits = names.map(([name, icon], order) => ({ id: `demo-${order}`, name, group: ['Study', 'Fitness', 'Morning', 'Study'][order], icon, color: '#FF8A3D', schedule: { kind: 'daily' as const }, measurement: order === 2 ? { kind: 'numeric' as const, target: 8, unit: 'glasses' } : { kind: 'binary' as const }, createdAt: `${year}-01-01`, archivedAt: null, order, revisions: [] }));
  const completions: Snapshot['completions'] = [];
  for (let i = 0; ; i++) {
    const date = addDays(new Date(year, 0, 1), i), day = dayString(date);
    if (day > current) break;
    const count = day === current ? 2 : (i * 17 + getDay(date) * 3) % 5;
    for (let h = 0; h < count; h++) completions.push({ id: key(habits[h].id, day), habitId: habits[h].id, date: day, value: h === 2 ? i % 3 === 0 ? 4 : 8 : 1, completedAt: date.toISOString() });
    if (day === current) completions.push({ id: key(habits[2].id, day), habitId: habits[2].id, date: day, value: 3, completedAt: date.toISOString() });
  }
  return { habits, completions, skips: [], notes: [{ date: current, text: 'Walk after lunch.', mood: 'good', updatedAt: new Date().toISOString() }], settings: defaults };
}
