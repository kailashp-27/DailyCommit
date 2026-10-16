import { useMemo } from 'react';
import { addDays, format, parseISO, startOfWeek, differenceInCalendarDays } from 'date-fns';
import { dayString, daySummary, intensity, getPalette, today, type Snapshot } from './domain';

export default function Heatmap({ data, from, to, selected, onSelect }: { data: Snapshot; from: string; to: string; selected?: string; onSelect?: (date: string) => void }) {
  const current = today(data.settings.rolloverHour);
  const grid = useMemo(() => {
    const start = startOfWeek(parseISO(from), { weekStartsOn: data.settings.weekStart }), end = parseISO(to);
    const cells: { date: string; column: number; row: number; level: number; label: string }[] = [], months: { label: string; column: number }[] = [];
    for (let i = 0; addDays(start, i) <= end; i++) {
      const d = addDays(start, i), date = dayString(d); if (date < from) continue;
      const s = daySummary(date, data);
      if (d.getDate() === 1 || date === from) months.push({ label: format(d, 'MMM'), column: Math.floor(i / 7) });
      cells.push({ date, column: Math.floor(i / 7), row: i % 7, level: date > current ? -2 : intensity(s.ratio), label: `${format(d, 'MMMM d, yyyy')}: ${date > current ? 'future day' : s.total ? `${s.done} of ${s.total} habits, ${Math.round((s.ratio ?? 0) * 100)}% progress` : 'rest day'}` });
    }
    return { cells, months, columns: Math.floor(differenceInCalendarDays(end, start) / 7) + 1 };
  }, [data, from, to, current]);
  const colors = getPalette(data.settings);
  const tabDay = grid.cells.find(c => c.date === selected && c.date <= current)?.date ?? grid.cells.find(c => c.date === current)?.date ?? grid.cells.find(c => c.date <= current)?.date;
  return <div className={`heatmap-scroll ${data.settings.badgeGlow && data.badges?.some(b => b.id === 'ember') ? 'ember-glow' : ''}`}><svg className={`heatmap ${grid.columns > 32 ? 'full-year' : 'six-month'}`} viewBox={`0 0 ${grid.columns * 17 + 30} 160`} role="group" aria-label="Habit contribution graph">
    {grid.months.map((m, i) => <text key={i} x={30 + m.column * 17} y={14}>{m.label}</text>)}
    {[1, 3, 5].map(row => <text key={row} x="0" y={37 + row * 17}>{format(addDays(startOfWeek(parseISO(from), { weekStartsOn: data.settings.weekStart }), row), 'EEE')}</text>)}
    {grid.cells.map(c => <g key={c.date} data-day={c.date} role={onSelect ? 'button' : 'img'} tabIndex={onSelect && c.date <= current ? c.date === tabDay ? 0 : -1 : undefined} aria-disabled={c.date > current || undefined} aria-label={c.label} onClick={() => { if (c.date <= current) onSelect?.(c.date); }} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (c.date <= current) onSelect?.(c.date); return; }
      const offset = ({ ArrowRight: 7, ArrowLeft: -7, ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[e.key];
      if (offset !== undefined) { e.preventDefault(); const next = dayString(addDays(parseISO(c.date), offset)); if (next >= from && next <= to && next <= current) e.currentTarget.parentElement?.querySelector<SVGGElement>(`[data-day="${next}"]`)?.focus(); }
    }} className={onSelect ? 'heatmap-cell' : ''}>
      <title>{c.label}</title><rect x={30 + c.column * 17} y={25 + c.row * 17} width="13" height="13" rx="3" fill={c.level < 0 ? 'var(--surface)' : colors[c.level]} stroke={selected === c.date ? 'var(--text)' : c.level < 0 ? 'var(--border)' : 'transparent'} strokeWidth={selected === c.date ? 2 : 1}/>
    </g>)}
  </svg></div>;
}
