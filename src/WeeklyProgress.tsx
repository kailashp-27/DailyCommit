import { useState } from 'react';
import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { dayString, daySummary, type Snapshot } from './domain';

export default function WeeklyProgress({ data, current, selected, onSelect }: { data: Snapshot; current: string; selected?: string; onSelect?: (date: string) => void }) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(current);

  // Week calculation
  const weekStart = startOfWeek(parseISO(anchor), { weekStartsOn: data.settings.weekStart });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = dayString(addDays(weekStart, i));
    const summary = daySummary(date, data);
    return { date, ...summary, future: date > current };
  });
  const weekElapsed = weekDays.filter(day => !day.future);
  const weekDone = weekElapsed.reduce((sum, day) => sum + day.done, 0);
  const weekTotal = weekElapsed.reduce((sum, day) => sum + day.total, 0);
  const nextWeek = dayString(addDays(weekStart, 7));

  // Month calculation
  const monthStart = startOfMonth(parseISO(anchor));
  const monthEnd = endOfMonth(monthStart);
  const totalDaysInMonth = monthEnd.getDate();
  const monthDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const date = dayString(addDays(monthStart, i));
    const summary = daySummary(date, data);
    return { date, ...summary, future: date > current };
  });
  const monthElapsed = monthDays.filter(day => !day.future);
  const monthDone = monthElapsed.reduce((sum, day) => sum + day.done, 0);
  const monthTotal = monthElapsed.reduce((sum, day) => sum + day.total, 0);
  const nextMonth = dayString(addMonths(monthStart, 1));

  // Find all Sundays in the month for graph X-axis labels
  const sundays = monthDays
    .map((day, index) => ({ ...day, index, dayNum: parseISO(day.date).getDate() }))
    .filter(day => parseISO(day.date).getDay() === 0);

  const isWeek = timeframe === 'week';
  const days = isWeek ? weekDays : monthDays;
  const done = isWeek ? weekDone : monthDone;
  const total = isWeek ? weekTotal : monthTotal;

  const maximum = 100;
  const ticks = [0, 50, 100];

  const points = days.map((day, i) => {
    const x = isWeek ? 34 + i * 44 : 24 + (i / Math.max(1, days.length - 1)) * 274;
    const y = 130 - (day.total ? (day.done / day.total) * 100 : 0) / maximum * 102;
    return { ...day, x, y };
  });

  const segments: string[] = [];
  let segment = '';
  for (const point of points) {
    if (point.future) {
      if (segment) segments.push(segment);
      segment = '';
      continue;
    }
    segment += `${segment ? ' L' : 'M'}${point.x},${point.y}`;
  }
  if (segment) segments.push(segment);

  return (
    <div className="weekly-progress">
      <div className="card-heading">
        <h2>{isWeek ? 'Weekly progress' : 'Monthly progress'}</h2>
        <span className="weekly-summary">
          {done}/{total} done{total > 0 && ` · ${Math.round((done / total) * 100)}%`}
        </span>
      </div>

      <div className="segmented" aria-label="Progress view mode" style={{ marginBottom: '8px' }}>
        <button
          className={timeframe === 'week' ? 'active' : ''}
          aria-pressed={timeframe === 'week'}
          onClick={() => setTimeframe('week')}
        >
          Weekly view
        </button>
        <button
          className={timeframe === 'month' ? 'active' : ''}
          aria-pressed={timeframe === 'month'}
          onClick={() => setTimeframe('month')}
        >
          Monthly view
        </button>
      </div>

      <div className="period-controls">
        <button
          className="icon-button"
          aria-label={isWeek ? 'Previous week' : 'Previous month'}
          onClick={() => setAnchor(isWeek ? dayString(addDays(weekStart, -7)) : dayString(subMonths(monthStart, 1)))}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          {isWeek
            ? `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM yyyy')}`
            : format(monthStart, 'MMMM yyyy')}
        </span>
        <button
          className="icon-button"
          aria-label={isWeek ? 'Next week' : 'Next month'}
          disabled={(isWeek ? nextWeek : nextMonth) > current}
          onClick={() => setAnchor(isWeek ? nextWeek : nextMonth)}
        >
          <ArrowRight size={16} />
        </button>
      </div>

      <svg
        className="weekly-chart"
        viewBox={`0 0 322 ${isWeek ? 146 : 154}`}
        role="img"
        aria-label={`${isWeek ? 'Weekly' : 'Monthly'} completion percentage line graph`}
      >
        <desc>
          {days
            .map(
              day =>
                `${format(parseISO(day.date), isWeek ? 'EEEE' : 'MMM d')}: ${
                  day.future ? 'upcoming' : day.total ? `${Math.round((day.done / day.total) * 100)}% completed` : 'rest day'
                }`
            )
            .join('. ')}
        </desc>
        {ticks.map(tick => {
          const y = 130 - (tick / maximum) * 102;
          return (
            <g key={tick}>
              <line x1="24" x2="298" y1={y} y2={y} />
              <text x="20" y={y + 4} textAnchor="end">
                {tick}%
              </text>
            </g>
          );
        })}
        {/* Sunday markers on X-axis in monthly progress */}
        {!isWeek &&
          sundays.map(s => {
            const x = 24 + (s.index / Math.max(1, monthDays.length - 1)) * 274;
            return (
              <g key={s.date}>
                <line x1={x} x2={x} y1="128" y2="133" stroke="var(--border)" strokeWidth="1" />
                <text x={x} y="146" textAnchor="middle" fill="var(--text-2)" fontSize="9">
                  Sun {s.dayNum}
                </text>
              </g>
            );
          })}
        {segments.map((path, i) => (
          <path className="weekly-line" key={i} d={path} />
        ))}
        {points
          .filter(point => !point.future && (point.total > 0 || isWeek))
          .map(point => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r={isWeek ? (selected === point.date ? 5 : 3.5) : 2}
            />
          ))}
      </svg>

      {isWeek && (
        <div className="weekly-days">
          {days.map(day => (
            <button
              key={day.date}
              disabled={day.future}
              aria-pressed={selected === day.date}
              aria-label={`${format(parseISO(day.date), 'EEEE, d MMM')}: ${
                day.future ? 'upcoming' : day.total ? `${day.done} of ${day.total} completed` : 'rest day'
              }`}
              onClick={() => onSelect?.(day.date)}
            >
              <span>{format(parseISO(day.date), 'EEE')}</span>
              <strong>
                {day.future
                  ? '—'
                  : !day.total
                  ? 'Rest'
                  : `${Math.round((day.done / day.total) * 100)}%`}
              </strong>
            </button>
          ))}
        </div>
      )}

      <p className="weekly-hint">
        {isWeek
          ? total
            ? 'Weekly trend. Tap any day in Contributions below to inspect.'
            : 'No habits scheduled for this week.'
          : 'Monthly trend. Tap any day in Contributions below to inspect.'}
      </p>
    </div>
  );
}
