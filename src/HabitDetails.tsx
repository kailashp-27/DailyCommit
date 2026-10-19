import { format, parseISO } from 'date-fns';
import { Pencil } from 'lucide-react';
import { useMemo } from 'react';
import Modal from './Modal';
import { habitDetails } from './habitInsights';
import { getPalette, intensity, type Habit, type Snapshot } from './domain';
import { HabitIcon } from './HabitEditor';

export default function HabitDetails({ habit, data, current, onClose, onEdit, onDay }: { habit: Habit; data: Snapshot; current: string; onClose: () => void; onEdit: () => void; onDay: (day: string) => void }) {
  const stats = useMemo(() => habitDetails(habit, data, current), [habit, data, current]), palette = getPalette(data.settings);
  return <Modal title={habit.name} onClose={onClose}><div className="habit-detail-intro"><span className="habit-icon"><HabitIcon name={habit.icon}/></span><p>{habit.group || 'Ungrouped'}{habit.archivedAt ? ' · Archived' : ''}</p></div>
    <dl className="habit-detail-stats"><div><dt>{habit.archivedAt ? 'Latest streak' : 'Current streak'}</dt><dd>{stats.current}<small> days</small></dd></div><div><dt>Best streak</dt><dd>{stats.best}<small> days</small></dd></div><div><dt>Last 30 days</dt><dd>{stats.percent === null ? '—' : `${stats.percent}%`}</dd></div><div><dt>Completed days</dt><dd>{stats.total}</dd></div></dl>
    <h3>Last 30 days</h3><div className="habit-detail-grid" aria-label="Last 30 days of habit progress">{stats.days.map(day => <button key={day.date} aria-label={`${format(parseISO(day.date), 'd MMM')}: ${day.paused.size ? 'vacation' : day.skipped.size ? 'rest day' : !day.total ? 'not scheduled' : day.done ? 'completed' : 'incomplete'}`} title={`${format(parseISO(day.date), 'd MMM')}: ${day.total ? Math.round((day.ratio ?? 0) * 100) + '%' : 'not scheduled'}`} onClick={() => onDay(day.date)} style={{ background: day.total ? palette[intensity(day.ratio)] : 'var(--border)', color: day.total && intensity(day.ratio) >= 3 && data.settings.mode !== 'light' ? 'var(--bg)' : 'var(--text)', textShadow: 'none' }}>{format(parseISO(day.date), 'd')}</button>)}</div>
    <p className="field-hint">{stats.done} of {stats.due} scheduled days completed. Rest and vacation days are excluded. Tap a day to review.</p>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Close</button>{!habit.archivedAt && <button className="primary" onClick={onEdit}><Pencil size={15}/>Edit habit</button>}</div>
  </Modal>;
}
