import { useState, useEffect, type CSSProperties } from 'react';
import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { ArrowLeft, ArrowRight, Download, Share2 } from 'lucide-react';
import { dateRange, dayString, daySummary, getPalette, today, type Snapshot } from './domain';
import Heatmap from './Heatmap';
import Modal from './Modal';
import { downloadBlob, exportOrShareFile, heatmapImage } from './share';

export default function ActivityPanel({ data, selected, onSelect, onError }: { data: Snapshot; selected?: string; onSelect: (date: string) => void; onError: (error: string) => void }) {
  const current = today(data.settings.rolloverHour);
  const [scope, setScope] = useState<'month' | 'six' | 'year'>('month'), [anchor, setAnchor] = useState(current);
  useEffect(() => { if (selected) setAnchor(selected); }, [selected]);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null), [exporting, setExporting] = useState(false);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);
  const start = startOfMonth(parseISO(anchor));
  const from = scope === 'year' ? `${start.getFullYear()}-01-01` : dayString(scope === 'six' ? subMonths(start, 5) : start);
  const to = scope === 'year' ? `${start.getFullYear()}-12-31` : dayString(endOfMonth(start));
  const title = scope === 'year' ? String(start.getFullYear()) : scope === 'month' ? format(start, 'MMMM yyyy') : `${format(parseISO(from), parseISO(from).getFullYear() === start.getFullYear() ? 'MMM' : 'MMM yyyy')} – ${format(start, 'MMM yyyy')}`;
  const colors = getPalette(data.settings), days = dateRange(from, to), commits = data.completions.filter(c => c.date >= from && c.date <= to).length;
  const step = scope === 'six' ? 6 : scope === 'year' ? 12 : 1, next = dayString(addMonths(start, step));
  const exportImage = async () => { setExporting(true); try { const blob = await heatmapImage(data, from, to, 'DailyCommit'); setImage({ blob, url: URL.createObjectURL(blob) }); } catch (e) { onError(e instanceof Error ? e.message : 'Could not export image.'); } finally { setExporting(false); } };
  const share = async () => {
    if (!image) return;
    try {
      await exportOrShareFile(image.blob, 'dailycommit.png', 'DailyCommit Activity');
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) onError('Could not share image. Try Download.');
    }
  };
  const calendarStart = startOfWeek(start, { weekStartsOn: data.settings.weekStart });
  return <section className="contribution-panel">
    <div className="contribution-controls-bar">
      <div className="segmented" aria-label="Graph view">
        {([['month', 'Month'], ['six', '6 months'], ['year', 'Year']] as const).map(([value, label]) => (
          <button key={value} aria-pressed={scope === value} className={scope === value ? 'active' : ''} onClick={() => { setScope(value); setAnchor(current); }}>
            {label}
          </button>
        ))}
      </div>
      <button className="icon-button" aria-label="Export heatmap image" disabled={exporting} onClick={() => void exportImage()}>
        <Share2 size={18}/>
      </button>
    </div>
    <div className="period-controls"><button className="icon-button" aria-label="Previous period" onClick={() => setAnchor(dayString(subMonths(start, step)))}><ArrowLeft size={16}/></button><span>{title}</span><button className="icon-button" aria-label="Next period" disabled={next > current} onClick={() => setAnchor(next)}><ArrowRight size={16}/></button></div>
    {scope === 'month' ? <div className="month-grid" role="group" aria-label={title}>{Array.from({ length: 7 }, (_, i) => <span key={i}>{format(addDays(calendarStart, i), 'EEEEE')}</span>)}{Array.from({ length: Math.ceil((parseISO(to).getDate() + (start.getDay() - data.settings.weekStart + 7) % 7) / 7) * 7 }, (_, i) => {
      const date = dayString(addDays(calendarStart, i)); if (date < from || date > to) return <span key={date}/>;
      const s = daySummary(date, data), level = s.ratio === null ? -1 : Math.ceil(s.ratio * 4);
      return <button key={date} disabled={date > current} className={selected === date ? 'day-selected' : ''} style={{ '--day-color': level < 0 ? 'var(--surface)' : colors[level] } as CSSProperties} aria-label={`${format(parseISO(date), 'MMMM d')}: ${s.done}/${s.total}${s.ratio === null ? ' rest day' : `, ${Math.round(s.ratio * 100)}%`}`} aria-pressed={selected === date} onClick={() => onSelect(date)}><span>{parseISO(date).getDate()}</span></button>;
    })}</div> : <Heatmap data={data} from={from} to={to} selected={selected} onSelect={onSelect}/>}
    <div className="heatmap-footer"><span><strong>{commits}</strong> check-ins · <strong>{days.filter(d => data.completions.some(c => c.date === d)).length}</strong> days</span><div className="legend">Less{colors.map(color => <i key={color} style={{ background: color }}/>)}More<span className="rest-key"/>Rest</div></div>
    {image && <Modal title="Share activity" onClose={() => setImage(null)}><img className="share-preview" src={image.url} alt="Exported habit activity graph"/><p className="field-hint">Your graph and badges earned this month. Notes stay private.</p><div className="modal-actions"><button className="secondary" onClick={() => downloadBlob(image.blob, 'dailycommit.png')}><Download size={16}/>Download</button><button className="primary" onClick={() => void share()}><Share2 size={16}/>Share</button></div></Modal>}
  </section>;
}
