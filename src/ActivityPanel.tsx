import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { ArrowLeft, ArrowRight, Download, Share2 } from 'lucide-react';
import { dateRange, dayString, daySummary, getPalette, today, type Snapshot } from './domain';
import Heatmap from './Heatmap';
import WeeklyProgress from './WeeklyProgress';
import Modal from './Modal';
import { downloadBlob, heatmapImage } from './share';
export default function ActivityPanel({ data, selected, onSelect, expanded = false, onError }: { data: Snapshot; selected?: string; onSelect: (date: string) => void; expanded?: boolean; onError: (error: string) => void }) {
  const current = today(data.settings.rolloverHour);
  const [scope, setScope] = useState<'six' | 'year' | 'month'>('six'), [anchor, setAnchor] = useState(current), [habitId, setHabitId] = useState('all');
  useEffect(() => { if (selected) setAnchor(selected); }, [selected]);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null), [exporting, setExporting] = useState(false);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);
  const habit = data.habits.find(h => h.id === habitId);
  const filtered = useMemo(() => habit ? { ...data, habits: [habit], completions: data.completions.filter(c => c.habitId === habit.id), skips: data.skips.filter(s => s.habitId === habit.id) } : data, [data, habit]);
  const start = startOfMonth(parseISO(anchor));
  const from = scope === 'year' ? `${start.getFullYear()}-01-01` : dayString(scope === 'six' ? subMonths(start, 5) : start);
  const to = scope === 'year' ? `${start.getFullYear()}-12-31` : dayString(endOfMonth(start));
  const title = scope === 'year' ? String(start.getFullYear()) : scope === 'month' ? format(start, 'MMMM yyyy') : `${format(parseISO(from), parseISO(from).getFullYear() === start.getFullYear() ? 'MMM' : 'MMM yyyy')} – ${format(start, 'MMM yyyy')}`;
  const colors = getPalette(data.settings), days = dateRange(from, to), commits = filtered.completions.filter(c => c.date >= from && c.date <= to).length;
  const step = scope === 'six' ? 6 : scope === 'year' ? 12 : 1, next = dayString(addMonths(start, step));
  const exportImage = async () => { setExporting(true); try { const blob = await heatmapImage(filtered, from, to, habit?.name ?? 'DailyCommit'); setImage({ blob, url: URL.createObjectURL(blob) }); } catch (e) { onError(e instanceof Error ? e.message : 'Could not export image.'); } finally { setExporting(false); } };
  const share = async () => {
    if (!image) return; const file = new File([image.blob], 'dailycommit.png', { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'DailyCommit' }); else downloadBlob(image.blob, 'dailycommit.png'); } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) onError('Could not share image. Try Download.'); }
  };
  const calendarStart = startOfWeek(start, { weekStartsOn: data.settings.weekStart });
  return <section className="card year-card">
    {expanded && <select className="habit-filter" aria-label="Activity for habit" value={habit?.id ?? 'all'} onChange={e => setHabitId(e.target.value)}><option value="all">All habits</option>{data.habits.map(h => <option key={h.id} value={h.id}>{h.name}{h.archivedAt ? ' · archived' : ''}</option>)}</select>}
    {expanded && <WeeklyProgress data={filtered} current={current} selected={selected} onSelect={onSelect}/>}
    <div className="card-heading contribution-heading"><h2>Contributions</h2><button className="icon-button" aria-label="Export heatmap image" disabled={exporting} onClick={() => void exportImage()}><Share2 size={18}/></button></div>
    <div className="segmented" aria-label="Graph view">{([['six', '6 months'], ['year', 'Year'], ['month', 'Month']] as const).map(([value, label]) => <button key={value} aria-pressed={scope === value} className={scope === value ? 'active' : ''} onClick={() => { setScope(value); setAnchor(current); }}>{label}</button>)}</div>
    <div className="period-controls"><button className="icon-button" aria-label="Previous period" onClick={() => setAnchor(dayString(subMonths(start, step)))}><ArrowLeft size={16}/></button><span>{title}</span><button className="icon-button" aria-label="Next period" disabled={next > current} onClick={() => setAnchor(next)}><ArrowRight size={16}/></button></div>
    {scope === 'month' ? <div className="month-grid" role="group" aria-label={title}>{Array.from({ length: 7 }, (_, i) => <span key={i}>{format(addDays(calendarStart, i), 'EEEEE')}</span>)}{Array.from({ length: Math.ceil((parseISO(to).getDate() + (start.getDay() - data.settings.weekStart + 7) % 7) / 7) * 7 }, (_, i) => {
      const date = dayString(addDays(calendarStart, i)); if (date < from || date > to) return <span key={date}/>;
      const s = daySummary(date, filtered), level = s.ratio === null ? -1 : Math.ceil(s.ratio * 4);
      return <button key={date} disabled={date > current} className={selected === date ? 'day-selected' : ''} style={{ '--day-color': level < 0 ? 'var(--surface)' : colors[level] } as CSSProperties} aria-label={`${format(parseISO(date), 'MMMM d')}: ${s.done}/${s.total}${s.ratio === null ? ' rest day' : `, ${Math.round(s.ratio * 100)}%`}`} aria-pressed={selected === date} onClick={() => onSelect(date)}><span>{parseISO(date).getDate()}</span></button>;
    })}</div> : <Heatmap data={filtered} from={from} to={to} selected={selected} onSelect={onSelect}/>}
    <div className="heatmap-footer"><span><strong>{commits}</strong> check-ins · <strong>{days.filter(d => filtered.completions.some(c => c.date === d)).length}</strong> days</span><div className="legend">Less{colors.map(color => <i key={color} style={{ background: color }}/>)}More<span className="rest-key"/>Rest</div></div>
    {image && <Modal title="Share activity" onClose={() => setImage(null)}><img className="share-preview" src={image.url} alt="Exported habit activity graph"/><p className="field-hint">Your graph and badges earned this month. Notes stay private.</p><div className="modal-actions"><button className="secondary" onClick={() => downloadBlob(image.blob, 'dailycommit.png')}><Download size={16}/>Download</button><button className="primary" onClick={() => void share()}><Share2 size={16}/>Share</button></div></Modal>}
  </section>;
}
