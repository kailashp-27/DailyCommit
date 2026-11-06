import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { createWidgetSnapshot, isAndroid } from './widget';
import { widgetGrid } from './widgetGeometry';
import type { Settings, Snapshot } from './domain';

export default function WidgetPage({
  data,
  busy,
  onSave,
  onPin,
}: {
  data: Snapshot;
  busy: boolean;
  onSave: (settings: Settings) => Promise<boolean>;
  onPin: () => void;
}) {
  const [shape, setShape] = useState('square');
  const widgetType = data.settings.widgetType ?? 'hybrid';
  const snapshot = createWidgetSnapshot(data);
  const isHeatmapOnly = widgetType === 'heatmap';
  const quickTasks = isHeatmapOnly
    ? []
    : snapshot.quickDays[0].tasks.filter(task => task.value < task.target).slice(0, shape === 'wide' ? 0 : 2);

  const weeks = 13; // 3-month widget
  const days = snapshot.history.slice(-weeks * 7);
  const height = shape === 'tall' ? 360 : shape === 'wide' ? 95 : 200;
  const grid = widgetGrid(weeks, 280, height);

  return (
    <section className="card settings-card">
      <h2>Home-screen widget</h2>

      <label>Widget option</label>
      <div className="segmented" aria-label="Widget option">
        <button
          className={widgetType === 'heatmap' ? 'active' : ''}
          aria-pressed={widgetType === 'heatmap'}
          disabled={busy}
          onClick={() => void onSave({ ...data.settings, widgetMonths: 3, widgetType: 'heatmap' })}
        >
          Daily Commit Heatmap
        </button>
        <button
          className={widgetType === 'hybrid' ? 'active' : ''}
          aria-pressed={widgetType === 'hybrid'}
          disabled={busy}
          onClick={() => void onSave({ ...data.settings, widgetMonths: 3, widgetType: 'hybrid' })}
        >
          Daily Commit Hybrid
        </button>
      </div>

      <label htmlFor="widget-shape">Preview shape</label>
      <select id="widget-shape" value={shape} onChange={e => setShape(e.target.value)}>
        <option value="square">Square</option>
        <option value="tall">Tall</option>
        <option value="wide">Wide</option>
      </select>

      <div className="widget-preview">
        <div>
          <strong>DailyCommit</strong>
          <span>{snapshot.done}/{snapshot.total}</span>
        </div>
        <svg
          className="widget-wrapped-grid"
          viewBox={`0 0 280 ${height}`}
          role="img"
          aria-label={`3-month widget preview, ${days.length} days in chronological strips`}
        >
          {days.map((day, index) => (
            <rect
              key={day.date}
              x={grid.x(index)}
              y={grid.y(index)}
              width={grid.cell}
              height={grid.cell}
              rx={grid.cell * 0.18}
              fill={day.level < 0 ? 'var(--border)' : snapshot.colors[day.level]}
              stroke={day.level <= 0 ? 'var(--text-muted)' : 'none'}
              strokeWidth=".35"
            >
              <title>
                {day.date}: {day.total ? `${day.done}/${day.total} completed` : 'no habits scheduled'}
              </title>
            </rect>
          ))}
        </svg>
        {!isHeatmapOnly && quickTasks.length > 0 && (
          <div className="widget-preview-checkins">
            {quickTasks.map(task => (
              <span key={task.habitId}>
                <Check size={14} />
                {snapshot.quickHabits.find(h => h.id === task.habitId)?.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="subtle">
        {isHeatmapOnly
          ? 'Daily Commit Heatmap: Shows your 3-month GitHub-style contribution graph on your home screen.'
          : 'Daily Commit Hybrid: Shows your 3-month contribution graph plus one-tap habit check-in buttons.'}
      </p>

      <button className="primary" onClick={onPin}>
        <Plus size={18} />
        {isAndroid() ? 'Add to home screen' : 'Set up widget'}
      </button>
      <p className="subtle">Requires the Android app. A PWA install adds an app icon only.</p>

      <details className="widget-help">
        <summary>How to add it</summary>
        <p>Install the Android app, then long-press your home screen → Widgets → DailyCommit.</p>
        <p>
          Tap a habit’s ✓ button to complete it without opening the app. Numeric habits reach their target; checklist
          habits complete all steps. More habits cycles through the list. Compact widgets prioritize the graph; resize
          taller for check-in rows.
        </p>
        <p>
          Widget check-ins are saved on this phone and merged when the app opens. Open the app at least monthly to
          refresh quick check-ins. Browser and Android data are separate; use a backup to transfer habits.
        </p>
      </details>
    </section>
  );
}
