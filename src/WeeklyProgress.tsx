import { useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { dayString, daySummary, type Snapshot } from './domain';

export default function WeeklyProgress({ data, current, selected, onSelect }: { data: Snapshot; current: string; selected?: string; onSelect: (date: string) => void }) {
  const [anchor, setAnchor] = useState(current), [metric, setMetric] = useState<'count' | 'rate'>('count');
  const start = startOfWeek(parseISO(anchor), { weekStartsOn: data.settings.weekStart });
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = dayString(addDays(start, i)), summary = daySummary(date, data);
    return { date, ...summary, future: date > current };
  });
  const elapsed = days.filter(day => !day.future), done = elapsed.reduce((sum, day) => sum + day.done, 0), total = elapsed.reduce((sum, day) => sum + day.total, 0);
  const maximum = metric === 'rate' ? 100 : Math.max(1, ...elapsed.map(day => day.total));
  const ticks = [...new Set([0, Math.ceil(maximum / 2), maximum])];
  const points = days.map((day, i) => ({ ...day, x: 34 + i * 44, y: 130 - (metric === 'count' ? day.done : day.total ? day.done / day.total * 100 : 0) / maximum * 102 }));
  const segments: string[] = [];
  let segment = '';
  for (const point of points) {
    if (point.future || !point.total) { if (segment) segments.push(segment); segment = ''; continue; }
    segment += `${segment ? ' L' : 'M'}${point.x},${point.y}`;
  }
  if (segment) segments.push(segment);
  const next = dayString(addDays(start, 7));
  return <div className="weekly-progress">
    <div className="card-heading"><h2>Weekly progress</h2><span className="weekly-summary">{done}/{total} done{total > 0 && ` · ${Math.round(done / total * 100)}%`}</span></div>
    <div className="segmented" aria-label="Weekly progress metric"><button className={metric === 'count' ? 'active' : ''} aria-pressed={metric === 'count'} onClick={() => setMetric('count')}>Completed habits</button><button className={metric === 'rate' ? 'active' : ''} aria-pressed={metric === 'rate'} onClick={() => setMetric('rate')}>Completion %</button></div>
    <div className="period-controls"><button className="icon-button" aria-label="Previous week" onClick={() => setAnchor(dayString(addDays(start, -7)))}><ArrowLeft size={16}/></button><span>{format(start, 'd MMM')} – {format(addDays(start, 6), 'd MMM yyyy')}</span><button className="icon-button" aria-label="Next week" disabled={next > current} onClick={() => setAnchor(next)}><ArrowRight size={16}/></button></div>
    <svg className="weekly-chart" viewBox="0 0 322 146" role="img" aria-label={`Weekly ${metric === 'count' ? 'completed habits' : 'completion percentage'} line graph`}>
      <desc>{days.map(day => `${format(parseISO(day.date), 'EEEE')}: ${day.future ? 'upcoming' : day.total ? `${day.done} of ${day.total} habits completed` : 'rest day'}`).join('. ')}</desc>
      {ticks.map(tick => { const y = 130 - tick / maximum * 102; return <g key={tick}><line x1="34" x2="298" y1={y} y2={y}/><text x="25" y={y + 4} textAnchor="end">{tick}{metric === 'rate' ? '%' : ''}</text></g>; })}
      {segments.map((path, i) => <path className="weekly-line" key={i} d={path}/>)}
      {points.filter(point => !point.future && point.total > 0).map(point => <circle key={point.date} cx={point.x} cy={point.y} r={selected === point.date ? 5 : 3.5}/>)}
    </svg>
    <div className="weekly-days">{days.map(day => <button key={day.date} disabled={day.future} aria-pressed={selected === day.date} aria-label={`${format(parseISO(day.date), 'EEEE, d MMM')}: ${day.future ? 'upcoming' : day.total ? `${day.done} of ${day.total} completed` : 'rest day'}`} onClick={() => onSelect(day.date)}><span>{format(parseISO(day.date), 'EEE')}</span><strong>{day.future ? '—' : !day.total ? 'Rest' : metric === 'count' ? day.done : `${Math.round(day.done / day.total * 100)}%`}</strong></button>)}</div>
    <p className="weekly-hint">{total ? 'Tap a day to review. Future days stay blank.' : 'No habits scheduled for this week.'}</p>

  </div>;
}
