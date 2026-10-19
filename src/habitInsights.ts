import { subDays, parseISO } from 'date-fns';
import { dateRange, dayString, daySummary, progressFor, streaks, type Habit, type Snapshot } from './domain';

export function habitDetails(habit: Habit, data: Snapshot, through: string) {
  const only = { ...data, habits: [habit] };
  const days = dateRange(dayString(subDays(parseISO(through), 29)), through).map(date => ({ date, ...daySummary(date, only) }));
  const due = days.reduce((sum, day) => sum + day.total, 0), done = days.reduce((sum, day) => sum + day.done, 0);
  const last = habit.archivedAt && habit.archivedAt <= through ? dayString(subDays(parseISO(habit.archivedAt), 1)) : through;
  const runs = streaks(only, last);
  const completed = data.completions.filter(c => c.habitId === habit.id && c.date >= habit.createdAt && c.date <= through && (!habit.archivedAt || c.date < habit.archivedAt) && progressFor(habit, c.date, c.value) >= 1);
  return { days, due, done, percent: due ? Math.round(done / due * 100) : null, total: new Set(completed.map(c => c.date)).size, ...runs };
}
