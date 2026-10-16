import { themes } from './themes';
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { dateRange, dayString, daySummary, intensity, measurementOn, progressFor, today, type Snapshot } from './domain';

export type BadgeUnlock = { id: string; date: string };
export type BadgeEvent = { id: string; date: string; kind: 'undo' };
export type Rarity = 1 | 2 | 3 | 4;
export type Badge = { id: string; name: string; rule: string; rarity: Rarity; category: string; icon: string; secret?: boolean; unavailable?: string };
export const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'];
const badge = (id: string, name: string, rule: string, rarity: Rarity, category: string, icon: string, extra: Partial<Badge> = {}): Badge => ({ id, name, rule, rarity, category, icon, ...extra });
export const badges: Badge[] = [
  ...themes.filter(t => t.days > 0).map(t => badge(t.badge, t.id === 'cyan' ? 'Cyan Branch' : 'Neon Release', `Complete a habit on ${t.days} different days. Unlocks the ${t.name} app color.`, t.id === 'cyan' ? 2 : 3, 'Colors', 'flower')),
  badge('first', 'First Commit', 'Complete your first habit.', 1, 'Starter', 'commit'),
  badge('hello', 'Hello World', 'Finish every scheduled habit in a day.', 1, 'Starter', 'sun'),
  badge('backup', 'Pushed to Remote', 'Export your first backup.', 1, 'Starter', 'upload'),
  badge('setup', 'Initial Setup', 'Create 3 habits.', 1, 'Starter', 'grid'),
  badge('sprint', 'Sprint', 'Reach a 7-day streak.', 1, 'Streaks', 'bolt'),
  badge('release', 'Release Candidate', 'Reach a 30-day streak.', 2, 'Streaks', 'flag'),
  badge('v1', 'v1.0', 'Reach a 100-day streak.', 3, 'Streaks', 'rocket'),
  badge('lts', 'LTS', 'Reach a 365-day streak.', 4, 'Streaks', 'crown'),
  badge('clean', 'Clean Working Tree', 'Finish a perfect day. Your total keeps growing; this badge is awarded once.', 1, 'Perfect days', 'tree'),
  badge('column', 'Full Column', 'Finish 7 perfect days, Monday through Sunday.', 2, 'Perfect days', 'column'),
  badge('wave', 'Heat Wave', 'Reach the top heat level for 14 consecutive days.', 3, 'Perfect days', 'wave'),
  badge('zero', 'Zero Conflicts', 'Complete every scheduled habit for a whole calendar month.', 4, 'Perfect days', 'shield'),
  badge('hotfix', 'Hotfix', 'Complete a habit the day after an incomplete scheduled day.', 1, 'Comebacks', 'wrench'),
  badge('rebase', 'Rebase', 'After 7 or more days without a check-in, return and finish a perfect day.', 2, 'Comebacks', 'branch'),
  badge('reflog', 'Reflog', 'After a streak breaks, rebuild it to your previous best.', 3, 'Comebacks', 'loop'),
  badge('midnight', 'Midnight Merge', 'Complete a habit between midnight and 4 a.m.', 1, 'Time', 'moon'),
  badge('morning', 'Pre-market Deploy', 'Finish every scheduled Morning habit before 8 a.m.', 2, 'Time', 'sunrise'),
  badge('friday', 'Friday Deploy', 'Finish a perfect Friday.', 2, 'Time', 'rocket'),
  badge('weekend', 'Weekend Warrior', 'Finish a perfect Saturday and Sunday in the same weekend.', 2, 'Time', 'swords'),
  badge('newyear', 'New Year Branch', 'Complete a habit on January 1.', 2, 'Time', 'branch'),
  badge('special', 'Special Release', 'Finish a perfect day on a date marked special in Settings.', 3, 'Time', 'gift'),
  badge('leap', 'Leap Commit', 'Complete a habit on February 29.', 4, 'Time', 'frog'),
  badge('stairs', 'Staircase', 'For 5 consecutive days, complete exactly one more habit each day.', 2, 'Heatmap', 'stairs'),
  badge('monday', 'Monday Specialist', 'Finish every Monday of a calendar month perfectly.', 2, 'Heatmap', 'column'),
  badge('ember', 'Ember Mode', 'Reach the top heat level on 100 days. Unlocks the heatmap glow.', 4, 'Heatmap', 'flame'),
  badge('graph', 'Full Graph', 'Check in on 300 different days in one calendar year.', 4, 'Heatmap', 'grid'),
  badge('specialist', 'Specialist', 'Complete the same habit on 100 days.', 2, 'Habits', 'target'),
  badge('overclock', 'Overclocked', 'Reach at least 150% of a numeric target on 10 check-ins.', 2, 'Habits', 'bolt'),
  badge('timeboxed', 'Timeboxed', 'Finish 20 timer sessions.', 2, 'Habits', 'clock', { unavailable: 'Timer habits are not planned for this version.' }),
  badge('dependency', 'Dependency Free', 'Reach 30 clean days on a negative habit.', 3, 'Habits', 'shield', { unavailable: 'Negative habits are not planned for this version.' }),
  badge('stack', 'Stack Overflow', 'Complete a 3-habit stack 10 times in a row.', 3, 'Habits', 'stack', { unavailable: 'Habit stacks are not planned for this version.' }),
  badge('polyglot', 'Polyglot', 'Have 5 habits each reach a 14-day streak at the same time.', 3, 'Habits', 'flower'),
  badge('100', '100 Commits', 'Complete 100 habit check-ins.', 1, 'Volume', 'commit'),
  badge('500', '500 Commits', 'Complete 500 habit check-ins.', 2, 'Volume', 'commit'),
  badge('1000', '1K Commits', 'Complete 1,000 habit check-ins.', 3, 'Volume', 'commit'),
  badge('5000', 'Monorepo', 'Complete 5,000 habit check-ins.', 4, 'Volume', 'grid'),
  badge('egg', 'Easter Egg', 'Tap the DailyCommit logo 7 times.', 1, 'Secrets', 'egg', { secret: true }),
  badge('undo', 'Ctrl+Z', 'Undo 10 completed check-ins in one day.', 1, 'Secrets', 'loop', { secret: true }),
  badge('pi', 'Pi Day', 'Finish a perfect day on March 14.', 2, 'Secrets', 'pi', { secret: true }),
  badge('fib', 'Fibonacci', 'Reach a 55-day streak.', 3, 'Secrets', 'spiral', { secret: true }),
];
const discoverable = new Set(['first', 'hello', 'backup', 'setup', 'sprint', 'release', 'v1', 'lts', '100', 'cyan-unlock', 'lime-unlock']);
for (const b of badges) if (!discoverable.has(b.id)) b.secret = true;
export function completedActiveDays(data: Snapshot, through: string): string[] {
  const habits = new Map(data.habits.map(h => [h.id, h]));
  return [...new Set(data.completions.filter(c => { const h = habits.get(c.habitId); return h && c.date <= through && c.date >= h.createdAt && (!h.archivedAt || c.date < h.archivedAt) && progressFor(h, c.date, c.value) >= 1; }).map(c => c.date))].sort();
}
export const badgeIds = new Set([...badges.map(b => b.id), ...[8, 13, 21, 34].map(n => `fib-${n}`)]);

// Five by five pixel drawings share the exact contribution palette.
export const pixels: Record<string, string> = {
  commit: '0000001110111110111000000', sun: '1010101110111110111010101', upload: '0010001110101010010011111', grid: '1101111011000001101111011',
  bolt: '0011001100111110011001100', flag: '1111110111111101000010000', rocket: '0010001110011101111101010', crown: '1010111111111110111001110',
  tree: '0010001110111110010000100', column: '0111001110011100111001110', wave: '0101010101010101010101010', shield: '1111110101101010111000100',
  wrench: '1000110001011100010000100', branch: '1000110001010100010000100', loop: '0111110001101011000011110', moon: '0011001100111000110000110',
  sunrise: '0010010101011101111100000', swords: '1000111011011101101110001', gift: '0101011111001001111110101', frog: '0101011111011101111110001',
  stairs: '0000100011001110111111111', flame: '0010000110011101111101110', target: '0111010001101011000101110', clock: '0111010101101111000101110',
  stack: '1111100000111110000011111', flower: '0010001110111110111000100', egg: '0010001110111111010101110', pi: '1111101010010100101001011', spiral: '1111110001101111010110111',
};

export function deriveBadges(data: Snapshot, through: string): BadgeUnlock[] {
  const result = new Map<string, string>();
  const award = (id: string, date: string) => { if (!result.has(id)) result.set(id, date); };
  const active = completedActiveDays(data, through);
  for (const theme of themes) if (theme.days > 0 && active.length >= theme.days) award(theme.badge, active[theme.days - 1]);
  const first = data.habits.reduce((min, h) => h.createdAt < min ? h.createdAt : min, through);
  const days = dateRange(first, through);
  const summaries = new Map(days.map(date => [date, daySummary(date, data)]));
  const perfect = (date: string) => { const s = summaries.get(date); return !!s && s.total > 0 && s.done === s.total && s.skipped.size === 0 && s.paused.size === 0; };
  const habits = new Map(data.habits.map(h => [h.id, h]));
  const rows = data.completions.filter(c => c.date <= through && habits.has(c.habitId));
  const activeDates = new Set(rows.filter(c => c.value > 0).map(c => c.date));
  const done = rows.filter(c => progressFor(habits.get(c.habitId)!, c.date, c.value) >= 1).sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map<string, typeof done>();
  const habitCounts = new Map<string, number>();
  let overclockCount = 0;
  done.forEach((row, i) => {
    byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
    award('first', row.date);
    for (const n of [100, 500, 1000, 5000]) if (i + 1 >= n) award(String(n), row.date);
    const count = (habitCounts.get(row.habitId) ?? 0) + 1; habitCounts.set(row.habitId, count);
    if (count >= 100) award('specialist', row.date);
    const m = measurementOn(habits.get(row.habitId)!, row.date);
    if (m.kind === 'numeric' && row.value >= m.target * 1.5) overclockCount++;
    if (overclockCount >= 10) award('overclock', row.date);
    if (row.date.endsWith('-01-01')) award('newyear', row.date);
    if (row.date.endsWith('-02-29')) award('leap', row.date);
    // Backfilled dates and queued widget writes cannot prove the original local time.
    const at = new Date(row.completedAt);
    if (row.source !== 'widget' && today(data.settings.rolloverHour, at) === row.date && at.getHours() < 4) award('midnight', row.date);
  });
  const created = data.habits.map(h => h.createdAt).filter(d => d <= through).sort();
  if (created.length >= 3) award('setup', created[2]);
  let run = 0, best = 0, previousBest = 0, lastMiss: string | null = null, lastActive: string | null = null, hotRun = 0, hotCount = 0, stairs = 0;
  const habitRuns = new Map<string, number>(), activeByYear = new Map<string, number>();
  for (let i = 0; i < days.length; i++) {
    const date = days[i], s = summaries.get(date)!, d = parseISO(date), full = perfect(date);
    const activity = activeDates.has(date);
    if (activity) { const year = date.slice(0, 4), count = (activeByYear.get(year) ?? 0) + 1; activeByYear.set(year, count); if (count >= 300) award('graph', date); }
    if (byDate.has(date) && i > 0) { const prev = summaries.get(days[i - 1])!; if (prev.total > prev.done) award('hotfix', date); }
    if (full) {
      award('hello', date); award('clean', date);
      if (lastActive && differenceInCalendarDays(d, parseISO(lastActive)) >= 8) award('rebase', date);
      if (d.getDay() === 5) award('friday', date);
      if (d.getDay() === 0 && perfect(days[i - 1])) award('weekend', date);
      if (date.endsWith('-03-14')) award('pi', date);
      if (data.settings.specialDates?.includes(date)) award('special', date);
      if (d.getDay() === 0 && dateRange(dayString(startOfWeek(d, { weekStartsOn: 1 })), date).every(perfect)) award('column', date);
    }
    if (activity) lastActive = date;
    if (s.total > 0 && !s.vacationDay) {
      if (s.done === s.total) {
        run++; best = Math.max(best, run);
        for (const [n, id] of [[7, 'sprint'], [30, 'release'], [100, 'v1'], [365, 'lts'], [55, 'fib']] as const) if (run >= n) award(id, date);
        for (const n of [8, 13, 21, 34]) if (run >= n) award(`fib-${n}`, date);
        if (previousBest > 0 && run >= previousBest) award('reflog', date);
      } else if (date < through) {
        if (!(data.settings.streakGrace === 1 && run > 0 && (!lastMiss || differenceInCalendarDays(d, parseISO(lastMiss)) >= 7))) { previousBest = best; run = 0; }
        lastMiss = date;
      }
    }
    if (!s.vacationDay && intensity(s.ratio) === 4) { hotRun++; hotCount++; } else hotRun = 0;
    if (hotRun >= 14) award('wave', date);
    if (hotCount >= 100) award('ember', date);
    stairs = i > 0 && s.done === summaries.get(days[i - 1])!.done + 1 ? stairs + 1 : 1;
    if (stairs >= 5) award('stairs', date);
    for (const h of s.eligible) { if (s.skipped.has(h.id) || s.paused.has(h.id)) continue; if (s.completed.has(h.id)) habitRuns.set(h.id, (habitRuns.get(h.id) ?? 0) + 1); else if (date < through) habitRuns.set(h.id, 0); }
    if (data.habits.filter(h => !h.archivedAt || h.archivedAt > date).filter(h => (habitRuns.get(h.id) ?? 0) >= 14).length >= 5) award('polyglot', date);
    const morning = s.eligible.filter(h => h.group?.toLowerCase() === 'morning');
    if (morning.length && morning.every(h => !s.paused.has(h.id) && (byDate.get(date) ?? []).some(c => c.habitId === h.id && c.source !== 'widget' && today(data.settings.rolloverHour, new Date(c.completedAt)) === date && new Date(c.completedAt).getHours() < 8))) award('morning', date);
    const monthStart = dayString(startOfMonth(d)), monthEnd = dayString(endOfMonth(d));
    if (date === monthEnd && first <= monthStart && dateRange(monthStart, monthEnd).every(day => { const t = summaries.get(day); return !!t && (t.eligible.length === 0 || perfect(day)); }) && dateRange(monthStart, monthEnd).some(perfect)) award('zero', date);
    if (d.getDay() === 1 && first <= monthStart) { const mondays = dateRange(monthStart, monthEnd).filter(day => parseISO(day).getDay() === 1); if (mondays.at(-1) === date && mondays.every(perfect)) award('monday', date); }
  }
  const undos = new Map<string, number>();
  for (const event of data.badgeEvents ?? []) { if (event.date > through) continue; const count = (undos.get(event.date) ?? 0) + 1; undos.set(event.date, count); if (count >= 10) award('undo', event.date); }
  return [...result].map(([id, date]) => ({ id, date }));
}

export const earnedThisMonth = (data: Snapshot, current: string) => (data.badges ?? []).filter(b => b.date.slice(0, 7) === current.slice(0, 7) && badges.some(def => def.id === b.id));
export const badgeDateLabel = (date: string) => format(parseISO(date), 'd MMM yyyy');
