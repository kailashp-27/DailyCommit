import { useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { dayString, weeklyReview, type Snapshot } from './domain';

export default function WeeklyReview({ data, current }: { data: Snapshot; current: string }) {
  const [anchor, setAnchor] = useState(current);
  const start = startOfWeek(parseISO(anchor), { weekStartsOn: data.settings.weekStart });
  const end = dayString(addDays(start, 6)), through = end < current ? end : current;
  const review = weeklyReview(data, dayString(start), through), next = dayString(addDays(start, 7));
  return <section className="weekly-review" aria-label="Weekly review details">
    <div className="period-controls"><button className="icon-button" aria-label="Previous review week" onClick={() => setAnchor(dayString(addDays(start, -7)))}><ArrowLeft size={16}/></button><span>{format(start, 'd MMM')} – {format(parseISO(end), 'd MMM yyyy')}</span><button className="icon-button" aria-label="Next review week" disabled={next > current} onClick={() => setAnchor(next)}><ArrowRight size={16}/></button></div>
    <dl>
      <div><dt>Completion</dt><dd>{review.percent === null ? 'No scheduled habits' : `${Math.round(review.percent)}%`}</dd></div>
      <div><dt>Vs last week</dt><dd>{review.delta === null ? 'Not enough history' : `${review.delta > 0 ? '+' : ''}${Math.round(review.delta)} percentage points`}</dd></div>
      <div><dt>Strongest day</dt><dd>{review.strongest ? `${format(parseISO(review.strongest.date), 'EEE')} · ${Math.round(review.strongest.done / review.strongest.total * 100)}%` : '—'}</dd></div>
      <div><dt>Most missed</dt><dd>{review.missed ? `${review.missed.habit.name} · ${review.missed.count}/${review.missed.due} missed` : review.percent !== null ? 'None' : '—'}</dd></div>
    </dl><p>Compared with the same weekdays last week. Scheduled habits only; rest days excluded.{end > current ? ' Today is still in progress.' : ''}</p>
  </section>;
}
